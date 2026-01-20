package volcengine

import (
	"bytes"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"

	channelconstant "github.com/QuantumNous/new-api/constant"
	"github.com/QuantumNous/new-api/dto"
	"github.com/QuantumNous/new-api/relay/channel"
	"github.com/QuantumNous/new-api/relay/channel/claude"
	"github.com/QuantumNous/new-api/relay/channel/openai"
	relaycommon "github.com/QuantumNous/new-api/relay/common"
	"github.com/QuantumNous/new-api/relay/constant"
	"github.com/QuantumNous/new-api/setting/model_setting"
	"github.com/QuantumNous/new-api/types"

	"github.com/gin-gonic/gin"
)

const (
	contextKeyTTSRequest     = "volcengine_tts_request"
	contextKeyResponseFormat = "response_format"
)

type Adaptor struct {
}

func (a *Adaptor) ConvertGeminiRequest(*gin.Context, *relaycommon.RelayInfo, *dto.GeminiChatRequest) (any, error) {
	//TODO implement me
	return nil, errors.New("not implemented")
}

func (a *Adaptor) ConvertClaudeRequest(c *gin.Context, info *relaycommon.RelayInfo, req *dto.ClaudeRequest) (any, error) {
	if _, ok := channelconstant.ChannelSpecialBases[info.ChannelBaseUrl]; ok {
		adaptor := claude.Adaptor{}
		return adaptor.ConvertClaudeRequest(c, info, req)
	}
	adaptor := openai.Adaptor{}
	return adaptor.ConvertClaudeRequest(c, info, req)
}

func (a *Adaptor) ConvertAudioRequest(c *gin.Context, info *relaycommon.RelayInfo, request dto.AudioRequest) (io.Reader, error) {
	if info.RelayMode != constant.RelayModeAudioSpeech {
		return nil, errors.New("unsupported audio relay mode")
	}

	appID, token, err := parseVolcengineAuth(info.ApiKey)
	if err != nil {
		return nil, err
	}

	voiceType := mapVoiceType(request.Voice)
	speedRatio := request.Speed
	encoding := mapEncoding(request.ResponseFormat)

	c.Set(contextKeyResponseFormat, encoding)

	volcRequest := VolcengineTTSRequest{
		App: VolcengineTTSApp{
			AppID:   appID,
			Token:   token,
			Cluster: "volcano_tts",
		},
		User: VolcengineTTSUser{
			UID: "openai_relay_user",
		},
		Audio: VolcengineTTSAudio{
			VoiceType:  voiceType,
			Encoding:   encoding,
			SpeedRatio: speedRatio,
			Rate:       24000,
		},
		Request: VolcengineTTSReqInfo{
			ReqID:     generateRequestID(),
			Text:      request.Input,
			Operation: "submit",
			Model:     info.OriginModelName,
		},
	}

	if len(request.Metadata) > 0 {
		if err = json.Unmarshal(request.Metadata, &volcRequest); err != nil {
			return nil, fmt.Errorf("error unmarshalling metadata to volcengine request: %w", err)
		}
	}

	c.Set(contextKeyTTSRequest, volcRequest)

	if volcRequest.Request.Operation == "submit" {
		info.IsStream = true
	}

	jsonData, err := json.Marshal(volcRequest)
	if err != nil {
		return nil, fmt.Errorf("error marshalling volcengine request: %w", err)
	}

	return bytes.NewReader(jsonData), nil
}

// SeedreamImageRequest 豆包 Seedream 图片生成请求结构
// 参考文档: https://www.volcengine.com/docs/82379/1541523?lang=zh
type SeedreamImageRequest struct {
	Model          string  `json:"model"`                      // 模型名称
	Prompt         string  `json:"prompt"`                      // 提示词（必需）
	N              *int    `json:"n,omitempty"`                 // 生成图片数量，默认1，范围1-4
	Size           *string `json:"size,omitempty"`              // 图片尺寸，如 "1024x1024", "1024x1792", "1792x1024"
	Quality        *string `json:"quality,omitempty"`             // 图片质量，如 "standard", "hd"
	ResponseFormat *string `json:"response_format,omitempty"`   // 响应格式，"url" 或 "b64_json"，默认 "url"
	Seed           *int    `json:"seed,omitempty"`              // 随机种子，范围 [0, 2147483647]
	Style          *string `json:"style,omitempty"`              // 图片风格
	User           *string `json:"user,omitempty"`               // 用户标识
}

func (a *Adaptor) ConvertImageRequest(c *gin.Context, info *relaycommon.RelayInfo, request dto.ImageRequest) (any, error) {
	switch info.RelayMode {
	case constant.RelayModeImagesGenerations:
		// 检查是否是 Seedream 模型
		modelLower := strings.ToLower(request.Model)
		if strings.Contains(modelLower, "seedream") {
			return a.convertToSeedreamRequest(request)
		}
		return request, nil
	// 根据官方文档,并没有发现豆包生图支持表单请求:https://www.volcengine.com/docs/82379/1824121
	//case constant.RelayModeImagesEdits:
	//
	//	var requestBody bytes.Buffer
	//	writer := multipart.NewWriter(&requestBody)
	//
	//	writer.WriteField("model", request.Model)
	//
	//	formData := c.Request.PostForm
	//	for key, values := range formData {
	//		if key == "model" {
	//			continue
	//		}
	//		for _, value := range values {
	//			writer.WriteField(key, value)
	//		}
	//	}
	//
	//	if err := c.Request.ParseMultipartForm(32 << 20); err != nil {
	//		return nil, errors.New("failed to parse multipart form")
	//	}
	//
	//	if c.Request.MultipartForm != nil && c.Request.MultipartForm.File != nil {
	//		var imageFiles []*multipart.FileHeader
	//		var exists bool
	//
	//		if imageFiles, exists = c.Request.MultipartForm.File["image"]; !exists || len(imageFiles) == 0 {
	//			if imageFiles, exists = c.Request.MultipartForm.File["image[]"]; !exists || len(imageFiles) == 0 {
	//				foundArrayImages := false
	//				for fieldName, files := range c.Request.MultipartForm.File {
	//					if strings.HasPrefix(fieldName, "image[") && len(files) > 0 {
	//						foundArrayImages = true
	//						for _, file := range files {
	//							imageFiles = append(imageFiles, file)
	//						}
	//					}
	//				}
	//
	//				if !foundArrayImages && (len(imageFiles) == 0) {
	//					return nil, errors.New("image is required")
	//				}
	//			}
	//		}
	//
	//		for i, fileHeader := range imageFiles {
	//			file, err := fileHeader.Open()
	//			if err != nil {
	//				return nil, fmt.Errorf("failed to open image file %d: %w", i, err)
	//			}
	//			defer file.Close()
	//
	//			fieldName := "image"
	//			if len(imageFiles) > 1 {
	//				fieldName = "image[]"
	//			}
	//
	//			mimeType := detectImageMimeType(fileHeader.Filename)
	//
	//			h := make(textproto.MIMEHeader)
	//			h.Set("Content-Disposition", fmt.Sprintf(`form-data; name="%s"; filename="%s"`, fieldName, fileHeader.Filename))
	//			h.Set("Content-Type", mimeType)
	//
	//			part, err := writer.CreatePart(h)
	//			if err != nil {
	//				return nil, fmt.Errorf("create form part failed for image %d: %w", i, err)
	//			}
	//
	//			if _, err := io.Copy(part, file); err != nil {
	//				return nil, fmt.Errorf("copy file failed for image %d: %w", i, err)
	//			}
	//		}
	//
	//		if maskFiles, exists := c.Request.MultipartForm.File["mask"]; exists && len(maskFiles) > 0 {
	//			maskFile, err := maskFiles[0].Open()
	//			if err != nil {
	//				return nil, errors.New("failed to open mask file")
	//			}
	//			defer maskFile.Close()
	//
	//			mimeType := detectImageMimeType(maskFiles[0].Filename)
	//
	//			h := make(textproto.MIMEHeader)
	//			h.Set("Content-Disposition", fmt.Sprintf(`form-data; name="mask"; filename="%s"`, maskFiles[0].Filename))
	//			h.Set("Content-Type", mimeType)
	//
	//			maskPart, err := writer.CreatePart(h)
	//			if err != nil {
	//				return nil, errors.New("create form file failed for mask")
	//			}
	//
	//			if _, err := io.Copy(maskPart, maskFile); err != nil {
	//				return nil, errors.New("copy mask file failed")
	//			}
	//		}
	//	} else {
	//		return nil, errors.New("no multipart form data found")
	//	}
	//
	//	writer.Close()
	//	c.Request.Header.Set("Content-Type", writer.FormDataContentType())
	//	return bytes.NewReader(requestBody.Bytes()), nil

	default:
		return request, nil
	}
}

func detectImageMimeType(filename string) string {
	ext := strings.ToLower(filepath.Ext(filename))
	switch ext {
	case ".jpg", ".jpeg":
		return "image/jpeg"
	case ".png":
		return "image/png"
	case ".webp":
		return "image/webp"
	default:
		if strings.HasPrefix(ext, ".jp") {
			return "image/jpeg"
		}
		return "image/png"
	}
}

func (a *Adaptor) Init(info *relaycommon.RelayInfo) {
}

func (a *Adaptor) GetRequestURL(info *relaycommon.RelayInfo) (string, error) {
	baseUrl := info.ChannelBaseUrl
	if baseUrl == "" {
		baseUrl = channelconstant.ChannelBaseURLs[channelconstant.ChannelTypeVolcEngine]
	}
	specialPlan, hasSpecialPlan := channelconstant.ChannelSpecialBases[baseUrl]

	switch info.RelayFormat {
	case types.RelayFormatClaude:
		if hasSpecialPlan && specialPlan.ClaudeBaseURL != "" {
			return fmt.Sprintf("%s/v1/messages", specialPlan.ClaudeBaseURL), nil
		}
		if strings.HasPrefix(info.UpstreamModelName, "bot") {
			return fmt.Sprintf("%s/api/v3/bots/chat/completions", baseUrl), nil
		}
		return fmt.Sprintf("%s/api/v3/chat/completions", baseUrl), nil
	default:
		switch info.RelayMode {
		case constant.RelayModeChatCompletions:
			if hasSpecialPlan && specialPlan.OpenAIBaseURL != "" {
				return fmt.Sprintf("%s/chat/completions", specialPlan.OpenAIBaseURL), nil
			}
			if strings.HasPrefix(info.UpstreamModelName, "bot") {
				return fmt.Sprintf("%s/api/v3/bots/chat/completions", baseUrl), nil
			}
			return fmt.Sprintf("%s/api/v3/chat/completions", baseUrl), nil
		case constant.RelayModeEmbeddings:
			return fmt.Sprintf("%s/api/v3/embeddings", baseUrl), nil
		//豆包的图生图也走generations接口: https://www.volcengine.com/docs/82379/1824121
		case constant.RelayModeImagesGenerations, constant.RelayModeImagesEdits:
			return fmt.Sprintf("%s/api/v3/images/generations", baseUrl), nil
		//case constant.RelayModeImagesEdits:
		//	return fmt.Sprintf("%s/api/v3/images/edits", baseUrl), nil
		case constant.RelayModeRerank:
			return fmt.Sprintf("%s/api/v3/rerank", baseUrl), nil
		case constant.RelayModeResponses:
			return fmt.Sprintf("%s/api/v3/responses", baseUrl), nil
		case constant.RelayModeAudioSpeech:
			if baseUrl == channelconstant.ChannelBaseURLs[channelconstant.ChannelTypeVolcEngine] {
				return "wss://openspeech.bytedance.com/api/v1/tts/ws_binary", nil
			}
			return fmt.Sprintf("%s/v1/audio/speech", baseUrl), nil
		default:
		}
	}
	return "", fmt.Errorf("unsupported relay mode: %d", info.RelayMode)
}

func (a *Adaptor) SetupRequestHeader(c *gin.Context, req *http.Header, info *relaycommon.RelayInfo) error {
	channel.SetupApiRequestHeader(info, c, req)

	if info.RelayMode == constant.RelayModeAudioSpeech {
		parts := strings.Split(info.ApiKey, "|")
		if len(parts) == 2 {
			req.Set("Authorization", "Bearer;"+parts[1])
		}
		req.Set("Content-Type", "application/json")
		return nil
	} else if info.RelayMode == constant.RelayModeImagesEdits {
		req.Set("Content-Type", gin.MIMEJSON)
	}

	req.Set("Authorization", "Bearer "+info.ApiKey)
	return nil
}

func (a *Adaptor) ConvertOpenAIRequest(c *gin.Context, info *relaycommon.RelayInfo, request *dto.GeneralOpenAIRequest) (any, error) {
	if request == nil {
		return nil, errors.New("request is nil")
	}

	if !model_setting.ShouldPreserveThinkingSuffix(info.OriginModelName) &&
		strings.HasSuffix(info.UpstreamModelName, "-thinking") &&
		strings.HasPrefix(info.UpstreamModelName, "deepseek") {
		info.UpstreamModelName = strings.TrimSuffix(info.UpstreamModelName, "-thinking")
		request.Model = info.UpstreamModelName
		request.THINKING = json.RawMessage(`{"type": "enabled"}`)
	}
	return request, nil
}

func (a *Adaptor) ConvertRerankRequest(c *gin.Context, relayMode int, request dto.RerankRequest) (any, error) {
	return nil, nil
}

func (a *Adaptor) ConvertEmbeddingRequest(c *gin.Context, info *relaycommon.RelayInfo, request dto.EmbeddingRequest) (any, error) {
	return request, nil
}

func (a *Adaptor) ConvertOpenAIResponsesRequest(c *gin.Context, info *relaycommon.RelayInfo, request dto.OpenAIResponsesRequest) (any, error) {
	return request, nil
}

func (a *Adaptor) DoRequest(c *gin.Context, info *relaycommon.RelayInfo, requestBody io.Reader) (any, error) {
	if info.RelayMode == constant.RelayModeAudioSpeech {
		baseUrl := info.ChannelBaseUrl
		if baseUrl == "" {
			baseUrl = channelconstant.ChannelBaseURLs[channelconstant.ChannelTypeVolcEngine]
		}

		if baseUrl == channelconstant.ChannelBaseURLs[channelconstant.ChannelTypeVolcEngine] {
			if info.IsStream {
				return nil, nil
			}
		}
	}
	return channel.DoApiRequest(a, c, info, requestBody)
}

func (a *Adaptor) DoResponse(c *gin.Context, resp *http.Response, info *relaycommon.RelayInfo) (usage any, err *types.NewAPIError) {
	if info.RelayFormat == types.RelayFormatClaude {
		if _, ok := channelconstant.ChannelSpecialBases[info.ChannelBaseUrl]; ok {
			if info.IsStream {
				return claude.ClaudeStreamHandler(c, resp, info, claude.RequestModeMessage)
			}
			return claude.ClaudeHandler(c, resp, info, claude.RequestModeMessage)
		}
	}

	if info.RelayMode == constant.RelayModeAudioSpeech {
		encoding := mapEncoding(c.GetString(contextKeyResponseFormat))
		if info.IsStream {
			volcRequestInterface, exists := c.Get(contextKeyTTSRequest)
			if !exists {
				return nil, types.NewErrorWithStatusCode(
					errors.New("volcengine TTS request not found in context"),
					types.ErrorCodeBadRequestBody,
					http.StatusInternalServerError,
				)
			}

			volcRequest, ok := volcRequestInterface.(VolcengineTTSRequest)
			if !ok {
				return nil, types.NewErrorWithStatusCode(
					errors.New("invalid volcengine TTS request type"),
					types.ErrorCodeBadRequestBody,
					http.StatusInternalServerError,
				)
			}

			// Get the WebSocket URL
			requestURL, urlErr := a.GetRequestURL(info)
			if urlErr != nil {
				return nil, types.NewErrorWithStatusCode(
					urlErr,
					types.ErrorCodeBadRequestBody,
					http.StatusInternalServerError,
				)
			}
			return handleTTSWebSocketResponse(c, requestURL, volcRequest, info, encoding)
		}
		return handleTTSResponse(c, resp, info, encoding)
	}

	adaptor := openai.Adaptor{}
	usage, err = adaptor.DoResponse(c, resp, info)
	return
}

func (a *Adaptor) GetModelList() []string {
	return ModelList
}

func (a *Adaptor) GetChannelName() string {
	return ChannelName
}

// convertToSeedreamRequest 将 OpenAI 格式的图片生成请求转换为豆包 Seedream 格式
// 参考文档: https://www.volcengine.com/docs/82379/1541523?lang=zh
func (a *Adaptor) convertToSeedreamRequest(request dto.ImageRequest) (*SeedreamImageRequest, error) {
	seedreamReq := &SeedreamImageRequest{
		Model:  request.Model,
		Prompt: request.Prompt,
	}

	// 映射 n 参数（生成数量）
	if request.N > 0 {
		n := int(request.N)
		// 限制范围 1-4
		if n >= 1 && n <= 4 {
			seedreamReq.N = &n
		} else if n > 4 {
			n = 4
			seedreamReq.N = &n
		}
	}

	// 映射 size 参数
	if request.Size != "" {
		size := a.convertSizeToSeedreamFormat(request.Size)
		if size != "" {
			seedreamReq.Size = &size
		}
	}

	// 映射 quality 参数
	if request.Quality != "" {
		quality := a.convertQualityToSeedreamFormat(request.Quality)
		if quality != "" {
			seedreamReq.Quality = &quality
		}
	}

	// 映射 response_format 参数
	if request.ResponseFormat != "" {
		format := request.ResponseFormat
		// 确保格式为 "url" 或 "b64_json"
		if format == "url" || format == "b64_json" {
			seedreamReq.ResponseFormat = &format
		} else {
			// 默认使用 "url"
			defaultFormat := "url"
			seedreamReq.ResponseFormat = &defaultFormat
		}
	} else {
		// 默认使用 "url"
		defaultFormat := "url"
		seedreamReq.ResponseFormat = &defaultFormat
	}

	// 从 ExtraFields 中提取 seed 和其他参数
	if len(request.ExtraFields) > 0 {
		var extraFields map[string]interface{}
		if err := json.Unmarshal(request.ExtraFields, &extraFields); err == nil {
			// 提取 seed
			if seedVal, ok := extraFields["seed"]; ok {
				if seedFloat, ok := seedVal.(float64); ok {
					seed := int(seedFloat)
					if seed >= 0 && seed <= 2147483647 {
						seedreamReq.Seed = &seed
					}
				} else if seedInt, ok := seedVal.(int); ok {
					if seedInt >= 0 && seedInt <= 2147483647 {
						seedreamReq.Seed = &seedInt
					}
				}
			}

			// 提取 style
			if styleVal, ok := extraFields["style"]; ok {
				if style, ok := styleVal.(string); ok && style != "" {
					seedreamReq.Style = &style
				}
			}

			// 提取 user
			if userVal, ok := extraFields["user"]; ok {
				if user, ok := userVal.(string); ok && user != "" {
					seedreamReq.User = &user
				}
			}

			// 如果 ExtraFields 中有 size，优先使用
			if sizeVal, ok := extraFields["size"]; ok {
				if size, ok := sizeVal.(string); ok && size != "" {
					convertedSize := a.convertSizeToSeedreamFormat(size)
					if convertedSize != "" {
						seedreamReq.Size = &convertedSize
					}
				}
			}

			// 如果 ExtraFields 中有 quality，优先使用
			if qualityVal, ok := extraFields["quality"]; ok {
				if quality, ok := qualityVal.(string); ok && quality != "" {
					convertedQuality := a.convertQualityToSeedreamFormat(quality)
					if convertedQuality != "" {
						seedreamReq.Quality = &convertedQuality
					}
				}
			}
		}
	}

	// 从 Style 字段提取（如果存在）
	if len(request.Style) > 0 {
		var style string
		if err := json.Unmarshal(request.Style, &style); err == nil && style != "" {
			seedreamReq.Style = &style
		}
	}

	// 从 User 字段提取（如果存在）
	if len(request.User) > 0 {
		var user string
		if err := json.Unmarshal(request.User, &user); err == nil && user != "" {
			seedreamReq.User = &user
		}
	}

	return seedreamReq, nil
}

// convertSizeToSeedreamFormat 将 OpenAI 格式的 size 转换为豆包 Seedream 格式
// 参考文档: https://www.volcengine.com/docs/82379/1541523?lang=zh
// 支持两种方式：
// 方式 1: 指定分辨率 "2K" 或 "4K"
// 方式 2: 指定宽高像素值，需满足：
//   - 总像素范围: [2560x1440=3686400, 4096x4096=16777216]
//   - 宽高比范围: [1/16, 16]
//   - 默认值: 2048x2048
func (a *Adaptor) convertSizeToSeedreamFormat(size string) string {
	size = strings.TrimSpace(size)
	if size == "" {
		// 返回默认值
		return "2048x2048"
	}
	
	// 转换为大写以便匹配
	sizeUpper := strings.ToUpper(size)
	
	// 方式 1: 检查是否是分辨率格式（2K 或 4K）
	if sizeUpper == "2K" || sizeUpper == "4K" {
		return sizeUpper
	}
	
	// 方式 2: 解析宽高像素值格式 "WIDTHxHEIGHT"
	if matched, _ := regexp.MatchString(`^\d+x\d+$`, size); matched {
		// 验证尺寸是否符合要求
		if a.isValidSeedreamSize(size) {
			return size
		}
		// 如果不符合要求，返回默认值
		return "2048x2048"
	}
	
	// 如果格式不匹配，返回默认值
	return "2048x2048"
}

// isValidSeedreamSize 验证尺寸是否符合豆包 Seedream 的要求
// 需要同时满足：
// 1. 总像素范围: [2560x1440=3686400, 4096x4096=16777216]
// 2. 宽高比范围: [1/16, 16]
func (a *Adaptor) isValidSeedreamSize(size string) bool {
	parts := strings.Split(size, "x")
	if len(parts) != 2 {
		return false
	}
	
	width, err1 := strconv.Atoi(parts[0])
	height, err2 := strconv.Atoi(parts[1])
	if err1 != nil || err2 != nil {
		return false
	}
	
	if width <= 0 || height <= 0 {
		return false
	}
	
	// 计算总像素
	totalPixels := width * height
	
	// 验证总像素范围: [3686400, 16777216]
	minPixels := 2560 * 1440 // 3686400
	maxPixels := 4096 * 4096 // 16777216
	
	if totalPixels < minPixels || totalPixels > maxPixels {
		return false
	}
	
	// 计算宽高比
	aspectRatio := float64(width) / float64(height)
	
	// 验证宽高比范围: [1/16, 16]
	minAspectRatio := 1.0 / 16.0 // 0.0625
	maxAspectRatio := 16.0
	
	if aspectRatio < minAspectRatio || aspectRatio > maxAspectRatio {
		return false
	}
	
	return true
}

// convertQualityToSeedreamFormat 将 OpenAI 格式的 quality 转换为豆包 Seedream 格式
// OpenAI 格式: "standard", "hd" (for dall-e-3)
// Seedream 格式: "standard", "hd"
func (a *Adaptor) convertQualityToSeedreamFormat(quality string) string {
	quality = strings.TrimSpace(strings.ToLower(quality))
	
	// 质量映射
	qualityMap := map[string]string{
		"standard": "standard",
		"hd":       "hd",
		"high":     "hd",      // 兼容 high
		"medium":   "standard", // 兼容 medium
		"low":      "standard", // 兼容 low
		"auto":     "standard", // 兼容 auto
	}
	
	if converted, ok := qualityMap[quality]; ok {
		return converted
	}
	
	// 默认返回空字符串，使用 API 默认值
	return ""
}
