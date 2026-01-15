package doubao

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relay/channel"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/service"

	"github.com/gin-gonic/gin"
	"github.com/pkg/errors"
)

// ============================
// Request / Response structures
// ============================

type ContentItem struct {
	Type     string    `json:"type"`                // "text" or "image_url"
	Text     string    `json:"text,omitempty"`      // for text type
	ImageURL *ImageURL `json:"image_url,omitempty"` // for image_url type
	Role     string    `json:"role,omitempty"`      // 图片角色: first_frame, last_frame, reference_image
}

type ImageURL struct {
	URL string `json:"url"`
}

type requestPayload struct {
	Model           string        `json:"model"`
	Content         []ContentItem `json:"content"`
	Duration        *int          `json:"duration,omitempty"`          // 视频时长（秒）
	Resolution      *string       `json:"resolution,omitempty"`        // 分辨率，如 "1080p"
	Ratio           *string       `json:"ratio,omitempty"`             // 宽高比，如 "16:9"
	Seed            *int          `json:"seed,omitempty"`              // 随机种子
	FirstFrameImage *string       `json:"first_frame_image,omitempty"` // 首帧图片 URL/Base64
	LastFrameImage  *string       `json:"last_frame_image,omitempty"`  // 尾帧图片 URL/Base64
	GenerateAudio   *bool         `json:"generate_audio,omitempty"`    // 是否生成音频
	CfgScale        *float64      `json:"cfg_scale,omitempty"`         // 提示词相关性 (1-10)
	Fps             *int          `json:"fps,omitempty"`               // 帧率
}

// responsePayload 创建任务响应
type responsePayload struct {
	ID    string         `json:"id"`    // task_id
	Error *responseError `json:"error"` // 错误信息
}

// responseError 错误响应结构
type responseError struct {
	Code    string `json:"code"`
	Message string `json:"message"`
	Param   string `json:"param,omitempty"`
	Type    string `json:"type,omitempty"`
}

// responseTask 查询任务响应
// 参考文档: https://www.volcengine.com/docs/82379/1521309?lang=zh
type responseTask struct {
	ID      string `json:"id"`
	Model   string `json:"model"`
	Status  string `json:"status"` // pending, queued, processing, succeeded, failed, cancelled
	Content struct {
		VideoURL string `json:"video_url"` // 视频URL
		AudioURL string `json:"audio_url"` // 音频URL（generate_audio=true时返回）
	} `json:"content"`
	Error *responseError `json:"error"` // 错误信息
	// 视频参数
	Seed            int    `json:"seed"`
	Resolution      string `json:"resolution"`
	Duration        int    `json:"duration"`
	Ratio           string `json:"ratio"`
	FramesPerSecond int    `json:"framespersecond"`
	// 用量统计
	Usage struct {
		CompletionTokens int `json:"completion_tokens"`
		TotalTokens      int `json:"total_tokens"`
	} `json:"usage"`
	// 时间戳
	CreatedAt int64 `json:"created_at"`
	UpdatedAt int64 `json:"updated_at"`
}

// ============================
// Adaptor implementation
// ============================

type TaskAdaptor struct {
	ChannelType int
	apiKey      string
	baseURL     string
}

func (a *TaskAdaptor) Init(info *relaycommon.RelayInfo) {
	a.ChannelType = info.ChannelType
	a.baseURL = info.ChannelBaseUrl
	a.apiKey = info.ApiKey
}

// ValidateRequestAndSetAction parses body, validates fields and sets default action.
func (a *TaskAdaptor) ValidateRequestAndSetAction(c *gin.Context, info *relaycommon.RelayInfo) (taskErr *dto.TaskError) {
	// Accept only POST /v1/video/generations as "generate" action.
	return relaycommon.ValidateBasicTaskRequest(c, info, constant.TaskActionGenerate)
}

// BuildRequestURL constructs the upstream URL.
func (a *TaskAdaptor) BuildRequestURL(info *relaycommon.RelayInfo) (string, error) {
	return fmt.Sprintf("%s/api/v3/contents/generations/tasks", a.baseURL), nil
}

// BuildRequestHeader sets required headers.
func (a *TaskAdaptor) BuildRequestHeader(c *gin.Context, req *http.Request, info *relaycommon.RelayInfo) error {
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("Authorization", "Bearer "+a.apiKey)
	return nil
}

// BuildRequestBody converts request into Doubao specific format.
func (a *TaskAdaptor) BuildRequestBody(c *gin.Context, info *relaycommon.RelayInfo) (io.Reader, error) {
	v, exists := c.Get("task_request")
	if !exists {
		return nil, fmt.Errorf("request not found in context")
	}
	req := v.(relaycommon.TaskSubmitReq)

	body, err := a.convertToRequestPayload(&req)
	if err != nil {
		return nil, errors.Wrap(err, "convert request payload failed")
	}
	data, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}
	return bytes.NewReader(data), nil
}

// DoRequest delegates to common helper.
func (a *TaskAdaptor) DoRequest(c *gin.Context, info *relaycommon.RelayInfo, requestBody io.Reader) (*http.Response, error) {
	return channel.DoTaskApiRequest(a, c, info, requestBody)
}

// DoResponse handles upstream response, returns taskID etc.
func (a *TaskAdaptor) DoResponse(c *gin.Context, resp *http.Response, info *relaycommon.RelayInfo) (taskID string, taskData []byte, taskErr *dto.TaskError) {
	responseBody, err := io.ReadAll(resp.Body)
	if err != nil {
		taskErr = service.TaskErrorWrapper(err, "read_response_body_failed", http.StatusInternalServerError)
		return
	}
	_ = resp.Body.Close()

	// Parse Doubao response
	var dResp responsePayload
	if err := json.Unmarshal(responseBody, &dResp); err != nil {
		taskErr = service.TaskErrorWrapper(errors.Wrapf(err, "body: %s", responseBody), "unmarshal_response_body_failed", http.StatusInternalServerError)
		return
	}

	// 检查错误响应
	if dResp.Error != nil && dResp.Error.Message != "" {
		errMsg := dResp.Error.Message
		if dResp.Error.Code != "" {
			errMsg = fmt.Sprintf("[%s] %s", dResp.Error.Code, errMsg)
		}
		taskErr = service.TaskErrorWrapper(fmt.Errorf(errMsg), "doubao_api_error", resp.StatusCode)
		return
	}

	if dResp.ID == "" {
		taskErr = service.TaskErrorWrapper(fmt.Errorf("task_id is empty, response: %s", responseBody), "invalid_response", http.StatusInternalServerError)
		return
	}

	c.JSON(http.StatusOK, gin.H{"task_id": dResp.ID})
	return dResp.ID, responseBody, nil
}

// FetchTask fetch task status
func (a *TaskAdaptor) FetchTask(baseUrl, key string, body map[string]any, proxy string) (*http.Response, error) {
	taskID, ok := body["task_id"].(string)
	if !ok {
		return nil, fmt.Errorf("invalid task_id")
	}

	uri := fmt.Sprintf("%s/api/v3/contents/generations/tasks/%s", baseUrl, taskID)

	req, err := http.NewRequest(http.MethodGet, uri, nil)
	if err != nil {
		return nil, err
	}

	req.Header.Set("Accept", "application/json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Authorization", "Bearer "+key)

	client, err := service.GetHttpClientWithProxy(proxy)
	if err != nil {
		return nil, fmt.Errorf("new proxy http client failed: %w", err)
	}
	return client.Do(req)
}

func (a *TaskAdaptor) GetModelList() []string {
	return ModelList
}

func (a *TaskAdaptor) GetChannelName() string {
	return ChannelName
}

func (a *TaskAdaptor) convertToRequestPayload(req *relaycommon.TaskSubmitReq) (*requestPayload, error) {
	// 获取模型配置
	modelConfig := GetModelConfig(req.Model)

	r := requestPayload{
		Model:   req.Model,
		Content: []ContentItem{},
	}

	// Add text prompt
	if req.Prompt != "" {
		r.Content = append(r.Content, ContentItem{
			Type: "text",
			Text: req.Prompt,
		})
	}

	// 处理图片参数：首帧、尾帧、参考图
	firstFrameURL := req.GetFirstFrameImage()
	lastFrameURL := req.GetLastFrameImage()
	
	// 判断使用哪种图片模式
	hasFirstFrame := firstFrameURL != "" && modelConfig.SupportsFirstFrame
	hasLastFrame := lastFrameURL != "" && modelConfig.SupportsLastFrame
	hasReferenceImages := req.HasImage() && len(req.Images) > 0

	if hasFirstFrame || hasLastFrame {
		// 首帧/首尾帧模式：通过 content 数组传递图片，需要指定 role
		if hasFirstFrame {
			r.Content = append(r.Content, ContentItem{
				Type: "image_url",
				ImageURL: &ImageURL{
					URL: firstFrameURL,
				},
				Role: "first_frame", // 首帧图片角色
			})
		}
		if hasLastFrame {
			r.Content = append(r.Content, ContentItem{
				Type: "image_url",
				ImageURL: &ImageURL{
					URL: lastFrameURL,
				},
				Role: "last_frame", // 尾帧图片角色
			})
		}
	} else if hasReferenceImages {
		// 参考图模式：传递多张参考图片（1-4张），role 为 reference_image
		for _, imgURL := range req.Images {
			r.Content = append(r.Content, ContentItem{
				Type: "image_url",
				ImageURL: &ImageURL{
					URL: imgURL,
				},
				Role: "reference_image", // 参考图片角色
			})
		}
	}

	// 处理时长参数 - 使用统一方法
	duration := req.GetDuration(modelConfig.DefaultDuration)
	// 验证时长是否在支持列表中
	if !contains(modelConfig.SupportedDurations, duration) {
		duration = modelConfig.DefaultDuration
	}
	r.Duration = &duration

	// 处理分辨率参数 - 使用统一方法
	resolution := req.GetResolution(modelConfig.DefaultResolution)
	// 标准化分辨率格式
	parsedResolution := parseResolutionFromSize(resolution)
	if parsedResolution != "" && containsString(modelConfig.SupportedResolutions, parsedResolution) {
		resolution = parsedResolution
	} else {
		resolution = modelConfig.DefaultResolution
	}
	r.Resolution = &resolution

	// 处理宽高比参数 - 使用统一方法
	ratio := req.GetAspectRatio(modelConfig.DefaultRatio)
	if ratio == modelConfig.DefaultRatio && req.Size != "" {
		// 从 Size 解析宽高比（如 "1920x1080" -> "16:9"）
		parsedRatio := parseRatioFromSize(req.Size)
		if parsedRatio != "" && containsString(modelConfig.SupportedRatios, parsedRatio) {
			ratio = parsedRatio
		}
	}
	r.Ratio = &ratio

	// 处理统一参数：seed
	if req.Seed > 0 {
		seedInt := int(req.Seed)
		r.Seed = &seedInt
	}

	// 注意：首帧和尾帧图片已通过 content 数组传递
	// first_frame_image 和 last_frame_image 字段不再需要设置

	// 处理统一参数：是否生成音频
	if modelConfig.SupportsAudio && req.GenerateAudio != nil {
		r.GenerateAudio = req.GenerateAudio
	}

	// 处理统一参数：cfg_scale
	if modelConfig.SupportsCfgScale && req.CfgScale > 0 {
		// 限制范围 1-10
		if req.CfgScale >= 1 && req.CfgScale <= 10 {
			r.CfgScale = &req.CfgScale
		}
	}

	// 处理统一参数：帧率
	if modelConfig.SupportsFps && req.Fps > 0 {
		r.Fps = &req.Fps
	}

	// 从 metadata 中获取额外扩展参数（兼容旧方式）
	if req.Metadata != nil {
		// 处理随机种子（如果统一参数未设置）
		if r.Seed == nil {
			if seedVal, ok := req.Metadata["seed"]; ok {
				if seed, ok := seedVal.(float64); ok {
					seedInt := int(seed)
					r.Seed = &seedInt
				} else if seed, ok := seedVal.(int); ok {
					r.Seed = &seed
				}
			}
		}

		// 从 metadata 获取首帧图片（如果 content 中没有图片）
		hasImageInContent := false
		for _, item := range r.Content {
			if item.Type == "image_url" {
				hasImageInContent = true
				break
			}
		}
		if !hasImageInContent && modelConfig.SupportsFirstFrame {
			if firstFrame, ok := req.Metadata["first_frame_image"].(string); ok && firstFrame != "" {
				r.Content = append(r.Content, ContentItem{
					Type:     "image_url",
					ImageURL: &ImageURL{URL: firstFrame},
					Role:     "first_frame",
				})
			}
		}

		// 从 metadata 获取尾帧图片
		if modelConfig.SupportsLastFrame {
			if lastFrame, ok := req.Metadata["last_frame_image"].(string); ok && lastFrame != "" {
				r.Content = append(r.Content, ContentItem{
					Type:     "image_url",
					ImageURL: &ImageURL{URL: lastFrame},
					Role:     "last_frame",
				})
			}
		}

		// 处理是否生成音频（如果统一参数未设置）
		if r.GenerateAudio == nil && modelConfig.SupportsAudio {
			if genAudio, ok := req.Metadata["generate_audio"].(bool); ok {
				r.GenerateAudio = &genAudio
			}
		}

		// 处理 cfg_scale（如果统一参数未设置）
		if r.CfgScale == nil && modelConfig.SupportsCfgScale {
			if cfgScale, ok := req.Metadata["cfg_scale"].(float64); ok {
				if cfgScale >= 1 && cfgScale <= 10 {
					r.CfgScale = &cfgScale
				}
			}
		}

		// 处理帧率（如果统一参数未设置）
		if r.Fps == nil && modelConfig.SupportsFps {
			if fps, ok := req.Metadata["fps"].(float64); ok {
				fpsInt := int(fps)
				r.Fps = &fpsInt
			} else if fps, ok := req.Metadata["fps"].(int); ok {
				r.Fps = &fps
			}
		}

		// 处理宽高比（也可以通过 metadata 指定）
		if ratioMeta, ok := req.Metadata["ratio"].(string); ok && ratioMeta != "" {
			if containsString(modelConfig.SupportedRatios, ratioMeta) {
				r.Ratio = &ratioMeta
			}
		}
	}

	return &r, nil
}

// parseResolutionFromSize 从 Size 字段解析分辨率
// 支持格式: "1080p", "1920x1080", "1080"
func parseResolutionFromSize(size string) string {
	size = strings.ToLower(strings.TrimSpace(size))
	
	// 如果已经是 "1080p" 格式
	if strings.HasSuffix(size, "p") {
		return size
	}
	
	// 如果是 "1920x1080" 格式，提取高度
	if strings.Contains(size, "x") {
		parts := strings.Split(size, "x")
		if len(parts) == 2 {
			height := strings.TrimSpace(parts[1])
			return height + "p"
		}
	}
	
	// 如果只是数字，添加 "p" 后缀
	if matched, _ := regexp.MatchString(`^\d+$`, size); matched {
		return size + "p"
	}
	
	return ""
}

// parseRatioFromSize 从 Size 字段解析宽高比
// 支持格式: "1920x1080" -> "16:9"
func parseRatioFromSize(size string) string {
	size = strings.TrimSpace(size)
	
	// 常见的宽高比映射
	ratioMap := map[string]string{
		"1920x1080": "16:9",
		"1280x720":  "16:9",
		"1080x1920": "9:16",
		"720x1280":  "9:16",
		"1024x1024": "1:1",
		"512x512":   "1:1",
	}
	
	if ratio, ok := ratioMap[size]; ok {
		return ratio
	}
	
	// 尝试计算宽高比
	if strings.Contains(size, "x") {
		parts := strings.Split(size, "x")
		if len(parts) == 2 {
			width := parseInt(parts[0])
			height := parseInt(parts[1])
			if width > 0 && height > 0 {
				gcd := calculateGCD(width, height)
				return fmt.Sprintf("%d:%d", width/gcd, height/gcd)
			}
		}
	}
	
	return ""
}

// 辅助函数
func contains(slice []int, item int) bool {
	for _, v := range slice {
		if v == item {
			return true
		}
	}
	return false
}

func containsString(slice []string, item string) bool {
	for _, v := range slice {
		if v == item {
			return true
		}
	}
	return false
}

func parseInt(s string) int {
	s = strings.TrimSpace(s)
	val, _ := strconv.Atoi(s)
	return val
}

func calculateGCD(a, b int) int {
	for b != 0 {
		a, b = b, a%b
	}
	return a
}

func (a *TaskAdaptor) ParseTaskResult(respBody []byte) (*relaycommon.TaskInfo, error) {
	resTask := responseTask{}
	if err := json.Unmarshal(respBody, &resTask); err != nil {
		return nil, errors.Wrap(err, "unmarshal task result failed")
	}

	taskResult := relaycommon.TaskInfo{
		Code: 0,
	}

	// 检查是否有错误
	if resTask.Error != nil && resTask.Error.Message != "" {
		taskResult.Status = model.TaskStatusFailure
		taskResult.Progress = "100%"
		taskResult.Reason = resTask.Error.Message
		if resTask.Error.Code != "" {
			taskResult.Reason = fmt.Sprintf("[%s] %s", resTask.Error.Code, resTask.Error.Message)
		}
		return &taskResult, nil
	}

	// Map Doubao status to internal status
	// 参考文档: https://www.volcengine.com/docs/82379/1521309?lang=zh
	switch resTask.Status {
	case "pending", "queued":
		taskResult.Status = model.TaskStatusQueued
		taskResult.Progress = "10%"
	case "processing", "running":
		taskResult.Status = model.TaskStatusInProgress
		taskResult.Progress = "50%"
	case "succeeded", "completed", "success":
		taskResult.Status = model.TaskStatusSuccess
		taskResult.Progress = "100%"
		taskResult.Url = resTask.Content.VideoURL
		// 如果有音频URL也一并返回（通过 RemoteUrl 字段）
		if resTask.Content.AudioURL != "" {
			taskResult.RemoteUrl = resTask.Content.AudioURL
		}
		// 解析 usage 信息用于按倍率计费
		taskResult.CompletionTokens = resTask.Usage.CompletionTokens
		taskResult.TotalTokens = resTask.Usage.TotalTokens
	case "failed", "error":
		taskResult.Status = model.TaskStatusFailure
		taskResult.Progress = "100%"
		taskResult.Reason = "task failed"
	case "cancelled", "canceled":
		taskResult.Status = model.TaskStatusFailure
		taskResult.Progress = "100%"
		taskResult.Reason = "task cancelled"
	default:
		// Unknown status, treat as processing
		taskResult.Status = model.TaskStatusInProgress
		taskResult.Progress = "30%"
	}

	return &taskResult, nil
}

// ConvertToOpenAIVideo 将豆包任务转换为 OpenAI 视频格式
func (a *TaskAdaptor) ConvertToOpenAIVideo(originTask *model.Task) ([]byte, error) {
	var doubaoResp responseTask
	if err := json.Unmarshal(originTask.Data, &doubaoResp); err != nil {
		return nil, errors.Wrap(err, "unmarshal doubao task data failed")
	}

	openAIVideo := originTask.ToOpenAIVideo()

	// 处理错误信息
	if doubaoResp.Error != nil && doubaoResp.Error.Message != "" {
		openAIVideo.Error = &dto.OpenAIVideoError{
			Message: doubaoResp.Error.Message,
			Code:    doubaoResp.Error.Code,
		}
	}

	// 添加元数据
	if openAIVideo.Metadata == nil {
		openAIVideo.Metadata = make(map[string]any)
	}
	if doubaoResp.Resolution != "" {
		openAIVideo.Metadata["resolution"] = doubaoResp.Resolution
	}
	if doubaoResp.Duration > 0 {
		openAIVideo.Metadata["duration"] = doubaoResp.Duration
	}
	if doubaoResp.Ratio != "" {
		openAIVideo.Metadata["ratio"] = doubaoResp.Ratio
	}
	if doubaoResp.FramesPerSecond > 0 {
		openAIVideo.Metadata["fps"] = doubaoResp.FramesPerSecond
	}
	if doubaoResp.Seed > 0 {
		openAIVideo.Metadata["seed"] = doubaoResp.Seed
	}
	if doubaoResp.Content.AudioURL != "" {
		openAIVideo.Metadata["audio_url"] = doubaoResp.Content.AudioURL
	}

	jsonData, err := json.Marshal(openAIVideo)
	if err != nil {
		return nil, errors.Wrap(err, "marshal openai video failed")
	}

	return jsonData, nil
}
