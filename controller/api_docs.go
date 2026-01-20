package controller

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/relay/channel/task/ali"
	"github.com/QuantumNous/new-api/relay/channel/task/doubao"
	"github.com/QuantumNous/new-api/relay/channel/task/hailuo"
	"github.com/QuantumNous/new-api/relay/channel/task/kling"
	"github.com/QuantumNous/new-api/relay/channel/task/sora"
	"github.com/gin-gonic/gin"
)

// ModelInfo API文档中的模型信息
type ModelInfo struct {
	ID                   string      `json:"id"`
	Name                 string      `json:"name"`
	Vendor               string      `json:"vendor"`
	Type                 string      `json:"type,omitempty"`
	Description          string      `json:"description,omitempty"`
	DefaultDuration      int         `json:"default_duration,omitempty"`
	SupportedDurations   []int       `json:"supported_durations,omitempty"`
	DefaultResolution    string      `json:"default_resolution,omitempty"`
	SupportedResolutions []string    `json:"supported_resolutions,omitempty"`
	SupportedRatios      []string    `json:"supported_ratios,omitempty"`
	SupportedSizes       []string    `json:"supported_sizes,omitempty"`
	SupportsFirstFrame   bool        `json:"supports_first_frame,omitempty"`
	SupportsLastFrame    bool        `json:"supports_last_frame,omitempty"`
	SupportsAudio        bool        `json:"supports_audio,omitempty"`
	Parameters           []ParamInfo `json:"parameters,omitempty"`
}

// ParamInfo 参数信息
type ParamInfo struct {
	Name        string   `json:"name"`
	Type        string   `json:"type"`
	Required    bool     `json:"required"`
	Default     any      `json:"default,omitempty"`
	Options     []string `json:"options,omitempty"`
	Description string   `json:"description,omitempty"`
}

// EndpointInfo API端点信息
type EndpointInfo struct {
	Type        string           `json:"type"`
	Name        string           `json:"name"`
	Description string           `json:"description"`
	Endpoint    string           `json:"endpoint"`
	Method      string           `json:"method"`
	Models      []ModelInfo      `json:"models"`
	Request     *RequestExample  `json:"request,omitempty"`
	Response    *ResponseExample `json:"response,omitempty"`
}

// RequestExample 请求示例
type RequestExample struct {
	Example any `json:"example"`
}

// ResponseExample 响应示例
type ResponseExample struct {
	Example any `json:"example"`
}

// ApiDocsConfig API文档配置
type ApiDocsConfig struct {
	Endpoints []EndpointInfo `json:"endpoints"`
}

// channelName 到显示名的映射
var channelNameToVendor = map[string]string{
	"openai":        "OpenAI",
	"anthropic":     "Anthropic",
	"gemini":        "Google",
	"google":        "Google",
	"deepseek":      "DeepSeek",
	"moonshot":      "Moonshot",
	"doubao":        "豆包 (Doubao)",
	"doubao-video":  "豆包 (Doubao)",
	"minimax":       "MiniMax",
	"hailuo-video":  "MiniMax (Hailuo)",
	"kling":         "Kling (快手)",
	"vidu":          "Vidu",
	"sora":          "OpenAI (Sora)",
	"ali":           "阿里云 (通义万相)",
	"jimeng":        "即梦 (Jimeng)",
	"zhipu":         "智谱AI",
	"baidu":         "百度",
	"xunfei":        "讯飞",
	"tencent":       "腾讯",
	"lingyiwanwu":   "零一万物",
	"ai360":         "360智脑",
	"cohere":        "Cohere",
	"coze":          "Coze",
	"ollama":        "Ollama",
	"aws":           "AWS Bedrock",
	"vertex":        "Google (Vertex AI)",
	"cloudflare":    "Cloudflare",
	"groq":          "Groq",
	"mistral":       "Mistral",
	"azure":         "Azure OpenAI",
}

// GetApiDocsConfig 获取API文档配置
func GetApiDocsConfig(c *gin.Context) {
	enabledModels := model.GetEnabledModels()
	enabledModelSet := buildEnabledModelSet(enabledModels)
	config := ApiDocsConfig{
		Endpoints: []EndpointInfo{
			buildChatEndpoint(enabledModels),
			buildImageEndpoint(enabledModels),
			buildVideoEndpoint(enabledModelSet),
			buildAudioEndpoint(enabledModels),
			buildEmbeddingEndpoint(enabledModels),
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    config,
	})
}

// getVendorName 获取供应商显示名
func getVendorName(channelName string) string {
	channelName = strings.ToLower(channelName)
	if vendor, ok := channelNameToVendor[channelName]; ok {
		return vendor
	}
	// 首字母大写
	if len(channelName) > 0 {
		return strings.ToUpper(channelName[:1]) + channelName[1:]
	}
	return "Other"
}

func buildEnabledModelSet(models []string) map[string]struct{} {
	modelSet := make(map[string]struct{}, len(models))
	for _, m := range models {
		modelSet[m] = struct{}{}
	}
	return modelSet
}

// buildChatEndpoint 构建聊天端点配置
func buildChatEndpoint(enabledModels []string) EndpointInfo {
	models := []ModelInfo{}

	// 从已启用的模型中获取聊天模型
	for _, m := range enabledModels {
		// 过滤掉视频、图像等模型
		lowerModel := strings.ToLower(m)
		if isVideoModel(lowerModel) || isImageModel(lowerModel) || isEmbeddingModel(lowerModel) || isAudioModel(lowerModel) {
			continue
		}
		vendor := guessVendorFromModel(m)
		models = append(models, ModelInfo{
			ID:     m,
			Name:   m,
			Vendor: vendor,
		})
	}

	return EndpointInfo{
		Type:        "chat",
		Name:        "文本对话",
		Description: "与 AI 模型进行对话，支持多轮会话、流式输出",
		Endpoint:    "/v1/chat/completions",
		Method:      "POST",
		Models:      models,
		Request: &RequestExample{
			Example: map[string]any{
				"model": "gpt-4o",
				"messages": []map[string]string{
					{"role": "user", "content": "Hello!"},
				},
				"stream":      false,
				"temperature": 0.7,
			},
		},
		Response: &ResponseExample{
			Example: map[string]any{
				"id":      "chatcmpl-xxx",
				"object":  "chat.completion",
				"created": 1704067200,
				"model":   "gpt-4o",
				"choices": []map[string]any{
					{
						"index": 0,
						"message": map[string]string{
							"role":    "assistant",
							"content": "Hello! How can I help you today?",
						},
						"finish_reason": "stop",
					},
				},
				"usage": map[string]int{
					"prompt_tokens":     10,
					"completion_tokens": 20,
					"total_tokens":      30,
				},
			},
		},
	}
}

// buildImageEndpoint 构建图像生成端点配置
func buildImageEndpoint(enabledModels []string) EndpointInfo {
	models := []ModelInfo{}

	// 从已启用的模型中获取图像模型
	for _, m := range enabledModels {
		if isImageModel(strings.ToLower(m)) {
			vendor := guessVendorFromModel(m)
			modelInfo := ModelInfo{
				ID:     m,
				Name:   m,
				Vendor: vendor,
			}

			// 为不同厂商的模型添加特定的参数说明
			modelLower := strings.ToLower(m)
			if strings.Contains(modelLower, "seedream") {
				// 豆包 Seedream 模型参数
				modelInfo.Parameters = buildSeedreamImageParameters()
			} else if strings.Contains(modelLower, "dall-e") {
				// OpenAI DALL-E 模型参数
				modelInfo.Parameters = buildDALLEImageParameters()
			} else if strings.Contains(modelLower, "imagen") {
				// Google Imagen 模型参数
				modelInfo.Parameters = buildImagenImageParameters()
			} else {
				// 通用图像生成参数
				modelInfo.Parameters = buildGenericImageParameters()
			}

			models = append(models, modelInfo)
		}
	}

	return EndpointInfo{
		Type:        "image",
		Name:        "图像生成",
		Description: "根据文本描述生成图像",
		Endpoint:    "/v1/images/generations",
		Method:      "POST",
		Models:      models,
		Request: &RequestExample{
			Example: map[string]any{
				"model":  "dall-e-3",
				"prompt": "A cute cat playing with a ball",
				"n":      1,
				"size":   "1024x1024",
			},
		},
		Response: &ResponseExample{
			Example: map[string]any{
				"created": 1704067200,
				"data": []map[string]string{
					{"url": "https://example.com/image.png"},
				},
			},
		},
	}
}

// buildGenericImageParameters 构建通用图像生成参数
func buildGenericImageParameters() []ParamInfo {
	return []ParamInfo{
		{Name: "model", Type: "string", Required: true, Description: "模型名称"},
		{Name: "prompt", Type: "string", Required: true, Description: "图像描述提示词"},
		{Name: "n", Type: "integer", Required: false, Default: 1, Description: "生成图片数量，默认1"},
		{Name: "size", Type: "string", Required: false, Default: "1024x1024", Description: "图片尺寸，如 1024x1024"},
		{Name: "quality", Type: "string", Required: false, Default: "standard", Options: []string{"standard", "hd"}, Description: "图片质量"},
		{Name: "response_format", Type: "string", Required: false, Default: "url", Options: []string{"url", "b64_json"}, Description: "响应格式，url 返回图片URL，b64_json 返回Base64编码"},
		{Name: "user", Type: "string", Required: false, Description: "用户标识，用于追踪和调试"},
	}
}

// buildSeedreamImageParameters 构建豆包 Seedream 图像生成参数
// 参考文档: https://www.volcengine.com/docs/82379/1541523?lang=zh
func buildSeedreamImageParameters() []ParamInfo {
	return []ParamInfo{
		{Name: "model", Type: "string", Required: true, Description: "模型名称，如 doubao-seedream-4-5-251128"},
		{Name: "prompt", Type: "string", Required: true, Description: "图像描述提示词，支持中英文"},
		{Name: "n", Type: "integer", Required: false, Default: 1, Options: []string{"1", "2", "3", "4"}, Description: "生成图片数量，范围1-4，默认1"},
		{
			Name:        "size",
			Type:        "string",
			Required:    false,
			Default:     "2048x2048",
			Options:     []string{"2K", "4K", "2048x2048"},
			Description: "图片尺寸。方式1：指定分辨率 2K 或 4K（需在prompt中描述宽高比）。方式2：指定宽高像素值，需满足：总像素范围 [2560x1440=3686400, 4096x4096=16777216]，宽高比范围 [1/16, 16]。默认值：2048x2048",
		},
		{Name: "quality", Type: "string", Required: false, Default: "standard", Options: []string{"standard", "hd"}, Description: "图片质量，standard=标准，hd=高清"},
		{Name: "response_format", Type: "string", Required: false, Default: "url", Options: []string{"url", "b64_json"}, Description: "响应格式，url 返回图片URL，b64_json 返回Base64编码"},
		{Name: "seed", Type: "integer", Required: false, Description: "随机种子，范围 [0, 2147483647]，用于生成可复现的结果"},
		{Name: "style", Type: "string", Required: false, Description: "图片风格，通过 extra_fields 传递"},
		{Name: "user", Type: "string", Required: false, Description: "用户标识，用于追踪和调试"},
	}
}

// buildDALLEImageParameters 构建 OpenAI DALL-E 图像生成参数
func buildDALLEImageParameters() []ParamInfo {
	return []ParamInfo{
		{Name: "model", Type: "string", Required: true, Description: "模型名称，如 dall-e-3, dall-e-2"},
		{Name: "prompt", Type: "string", Required: true, Description: "图像描述提示词，最多4000字符"},
		{Name: "n", Type: "integer", Required: false, Default: 1, Description: "生成图片数量，dall-e-3 固定为1，dall-e-2 支持1-10"},
		{Name: "size", Type: "string", Required: false, Default: "1024x1024", Options: []string{"256x256", "512x512", "1024x1024", "1792x1024", "1024x1792"}, Description: "图片尺寸，dall-e-3 支持 1024x1024, 1792x1024, 1024x1792"},
		{Name: "quality", Type: "string", Required: false, Default: "standard", Options: []string{"standard", "hd"}, Description: "图片质量，仅 dall-e-3 支持，hd 质量更高但生成时间更长"},
		{Name: "style", Type: "string", Required: false, Default: "vivid", Options: []string{"vivid", "natural"}, Description: "图片风格，仅 dall-e-3 支持，vivid=生动，natural=自然"},
		{Name: "response_format", Type: "string", Required: false, Default: "url", Options: []string{"url", "b64_json"}, Description: "响应格式"},
		{Name: "user", Type: "string", Required: false, Description: "用户标识"},
	}
}

// buildImagenImageParameters 构建 Google Imagen 图像生成参数
func buildImagenImageParameters() []ParamInfo {
	return []ParamInfo{
		{Name: "model", Type: "string", Required: true, Description: "模型名称，如 imagen-3.0-generate-002"},
		{Name: "prompt", Type: "string", Required: true, Description: "图像描述提示词"},
		{Name: "n", Type: "integer", Required: false, Default: 1, Description: "生成图片数量"},
		{Name: "size", Type: "string", Required: false, Default: "1024x1024", Options: []string{"256x256", "512x512", "1024x1024", "1536x1024", "1024x1536", "1024x1792", "1792x1024"}, Description: "图片尺寸"},
		{Name: "quality", Type: "string", Required: false, Options: []string{"1K", "2K"}, Description: "图片质量，1K=标准，2K=高清"},
		{Name: "response_format", Type: "string", Required: false, Default: "url", Options: []string{"url", "b64_json"}, Description: "响应格式"},
		{Name: "user", Type: "string", Required: false, Description: "用户标识"},
	}
}

// buildVideoEndpoint 构建视频生成端点配置
func buildVideoEndpoint(enabledModelSet map[string]struct{}) EndpointInfo {
	models := []ModelInfo{}

	// 海螺 (MiniMax Hailuo)
	// 参考文档: https://platform.minimaxi.com/docs/api-reference/video-generation-fl2v
	for _, m := range hailuo.ModelList {
		if _, ok := enabledModelSet[m]; !ok {
			continue
		}
		config := hailuo.GetModelConfig(m)
		modelType := "text-to-video"
		isI2V := strings.HasPrefix(m, "I2V")
		isS2V := strings.HasPrefix(m, "S2V")
		if isI2V || isS2V {
			modelType = "image-to-video"
		}

		// 动态构建参数列表
		params := []ParamInfo{
			{Name: "prompt", Type: "string", Required: false, Description: "视频描述，支持使用 [指令] 格式控制运镜，如 [推进]、[拉远]、[环绕]"},
			{Name: "duration", Type: "integer", Required: false, Default: hailuo.DefaultDuration, Options: intsToStrings(config.SupportedDurations), Description: "视频时长(秒)，1080P 仅支持 6 秒"},
			{Name: "resolution", Type: "string", Required: false, Default: config.DefaultResolution, Options: config.SupportedResolutions, Description: "分辨率"},
		}
		// 首帧图片 (I2V 和 MiniMax-Hailuo-02/2.3 支持)
		if isI2V || m == "MiniMax-Hailuo-02" || m == "MiniMax-Hailuo-2.3" {
			params = append(params, ParamInfo{Name: "first_frame", Type: "string", Required: false, Description: "首帧图片URL (图生视频模式)"})
		}
		// 尾帧图片 (MiniMax-Hailuo-02 支持首尾帧)
		if m == "MiniMax-Hailuo-02" {
			params = append(params, ParamInfo{Name: "last_frame", Type: "string", Required: false, Description: "尾帧图片URL (首尾帧模式需同时提供首帧)"})
		}
		// 主体参考 (S2V 模型支持)
		if isS2V {
			params = append(params, ParamInfo{Name: "subject_reference", Type: "array", Required: false, Description: "主体参考图片URL列表 (主体参考生成模式)"})
		}
		// 可选参数
		if config.HasPromptOptimizer {
			params = append(params, ParamInfo{Name: "prompt_optimizer", Type: "boolean", Required: false, Default: true, Description: "是否启用智能提示词优化"})
		}
		if config.HasFastPretreatment {
			params = append(params, ParamInfo{Name: "fast_pretreatment", Type: "boolean", Required: false, Default: false, Description: "是否启用快速预处理（可能影响质量）"})
		}
		params = append(params,
			ParamInfo{Name: "aigc_watermark", Type: "boolean", Required: false, Default: false, Description: "是否添加 AIGC 水印"},
		)

		models = append(models, ModelInfo{
			ID:                   m,
			Name:                 m,
			Vendor:               "MiniMax (Hailuo)",
			Type:                 modelType,
			DefaultDuration:      hailuo.DefaultDuration,
			SupportedDurations:   config.SupportedDurations,
			DefaultResolution:    config.DefaultResolution,
			SupportedResolutions: config.SupportedResolutions,
			SupportsFirstFrame:   isI2V || m == "MiniMax-Hailuo-02" || m == "MiniMax-Hailuo-2.3",
			SupportsLastFrame:    m == "MiniMax-Hailuo-02",
			Parameters:           params,
		})
	}

	// 豆包 (Doubao)
	for _, m := range doubao.ModelList {
		if _, ok := enabledModelSet[m]; !ok {
			continue
		}
		config := doubao.GetModelConfig(m)
		// 使用配置中的 ModelType，而不是根据名称判断
		modelType := "text-to-video"
		switch config.ModelType {
		case "image2video":
			modelType = "image-to-video"
		case "startend2video":
			modelType = "start-end-frame"
		case "text2video":
			// 如果支持首帧，标记为支持图生视频的文生视频
			if config.SupportsFirstFrame {
				modelType = "text-to-video (支持首帧)"
			}
		}
		// 动态构建参数列表
		params := []ParamInfo{
			{Name: "prompt", Type: "string", Required: false, Description: "视频描述（文生视频时必填），支持使用 [指令] 格式控制运镜"},
			{Name: "duration", Type: "integer", Required: false, Default: config.DefaultDuration, Options: intsToStrings(config.SupportedDurations), Description: "视频时长(秒)"},
			{Name: "resolution", Type: "string", Required: false, Default: config.DefaultResolution, Options: config.SupportedResolutions, Description: "分辨率"},
			{Name: "aspect_ratio", Type: "string", Required: false, Default: config.DefaultRatio, Options: config.SupportedRatios, Description: "宽高比"},
		}
		// 根据模型能力添加首帧参数
		if config.SupportsFirstFrame {
			params = append(params, ParamInfo{Name: "first_frame", Type: "string", Required: false, Description: "首帧图片URL (图生视频模式)"})
		}
		// 根据模型能力添加尾帧参数
		if config.SupportsLastFrame {
			params = append(params, ParamInfo{Name: "last_frame", Type: "string", Required: false, Description: "尾帧图片URL (首尾帧模式需同时提供首帧)"})
		}
		// 图生视频模型支持参考图
		if config.ModelType == "image2video" {
			params = append(params, ParamInfo{Name: "images", Type: "array", Required: false, Description: "参考图片URL列表（1-4张），图生视频模式使用"})
		}
		// 根据模型能力添加音频参数
		if config.SupportsAudio {
			params = append(params, ParamInfo{Name: "generate_audio", Type: "boolean", Required: false, Default: false, Description: "是否生成背景音乐和音效"})
		}
		// cfg_scale 和 fps 参数
		if config.SupportsCfgScale {
			params = append(params, ParamInfo{Name: "cfg_scale", Type: "number", Required: false, Default: 6.0, Description: "提示词相关度，范围 [1, 10]，值越大越遵循提示词"})
		}
		if config.SupportsFps {
			params = append(params, ParamInfo{Name: "fps", Type: "integer", Required: false, Default: 24, Options: []string{"16", "24"}, Description: "视频帧率"})
		}
		// 通用参数
		params = append(params, ParamInfo{Name: "seed", Type: "integer", Required: false, Description: "随机种子，用于复现生成结果"})

		models = append(models, ModelInfo{
			ID:                   m,
			Name:                 m,
			Vendor:               "豆包 (Doubao)",
			Type:                 modelType,
			DefaultDuration:      config.DefaultDuration,
			SupportedDurations:   config.SupportedDurations,
			DefaultResolution:    config.DefaultResolution,
			SupportedResolutions: config.SupportedResolutions,
			SupportedRatios:      config.SupportedRatios,
			SupportsFirstFrame:   config.SupportsFirstFrame,
			SupportsLastFrame:    config.SupportsLastFrame,
			SupportsAudio:        config.SupportsAudio,
			Parameters:           params,
		})
	}

	// 可灵 (Kling)
	klingAdaptor := &kling.TaskAdaptor{}
	for _, m := range klingAdaptor.GetModelList() {
		if _, ok := enabledModelSet[m]; !ok {
			continue
		}
		models = append(models, ModelInfo{
			ID:                 m,
			Name:               m,
			Vendor:             "Kling (快手)",
			Type:               "text-to-video (支持图生视频)",
			SupportedDurations: []int{5, 10},
			SupportedRatios:    []string{"1:1", "16:9", "9:16"},
			SupportsFirstFrame: true,
			Parameters: []ParamInfo{
				{Name: "prompt", Type: "string", Required: true, Description: "视频描述，详细的场景和动作描述效果更好"},
				{Name: "duration", Type: "integer", Required: false, Default: 5, Options: []string{"5", "10"}, Description: "视频时长(秒)"},
				{Name: "aspect_ratio", Type: "string", Required: false, Default: "16:9", Options: []string{"1:1", "16:9", "9:16"}, Description: "宽高比"},
				{Name: "mode", Type: "string", Required: false, Default: "std", Options: []string{"std", "pro"}, Description: "生成模式，std=标准模式（快速），pro=专业模式（高质量）"},
				{Name: "first_frame", Type: "string", Required: false, Description: "首帧图片URL (图生视频模式)"},
				{Name: "negative_prompt", Type: "string", Required: false, Description: "反向提示词，描述不希望出现的内容"},
				{Name: "cfg_scale", Type: "number", Required: false, Default: 0.5, Description: "提示词相关度，范围 [0, 1]"},
				{Name: "seed", Type: "integer", Required: false, Description: "随机种子，用于复现生成结果"},
			},
		})
	}

	// Vidu
	// 参考文档: https://docs.platform.vidu.com/7208249m0
	// 模型配置
	viduModelConfigs := map[string]struct {
		Durations   []int
		Resolutions []string
		Styles      []string
		SupportsRef bool // 支持参考图生视频
		SupportsT2V bool // 支持文生视频
	}{
		// Vidu Q1: text2video、img2video、reference2video、start-end2video, 5秒, 1080p
		"viduq1":       {Durations: []int{5}, Resolutions: []string{"1080p"}, Styles: []string{"general", "anime"}, SupportsRef: true, SupportsT2V: true},
		"Vidu Q1":      {Durations: []int{5}, Resolutions: []string{"1080p"}, Styles: []string{"general", "anime"}, SupportsRef: true, SupportsT2V: true},
		// Vidu Q1 Classic: 仅 start-end2video
		"viduq1-classic": {Durations: []int{5}, Resolutions: []string{"1080p"}, Styles: []string{"general"}, SupportsRef: false, SupportsT2V: false},
		// Vidu Q2: 全功能支持
		"viduq2":       {Durations: []int{4, 8}, Resolutions: []string{"720p", "1080p"}, Styles: []string{"general", "anime"}, SupportsRef: true, SupportsT2V: true},
		// Vidu 2.0: img2video、reference2video、start-end2video, 4-8秒, 720p/1080p
		"vidu2.0":      {Durations: []int{4, 8}, Resolutions: []string{"720p", "1080p"}, Styles: []string{"general"}, SupportsRef: true, SupportsT2V: false},
		"Vidu 2.0":     {Durations: []int{4, 8}, Resolutions: []string{"720p", "1080p"}, Styles: []string{"general"}, SupportsRef: true, SupportsT2V: false},
		// Vidu 1.5: 全功能, 4-8秒, 360p/720p/1080p, 支持动漫风格
		"vidu1.5":      {Durations: []int{4, 8}, Resolutions: []string{"360p", "720p", "1080p"}, Styles: []string{"general", "anime"}, SupportsRef: true, SupportsT2V: true},
		"Vidu 1.5":     {Durations: []int{4, 8}, Resolutions: []string{"360p", "720p", "1080p"}, Styles: []string{"general", "anime"}, SupportsRef: true, SupportsT2V: true},
	}

	for modelName, config := range viduModelConfigs {
		if _, ok := enabledModelSet[modelName]; !ok {
			continue
		}

		// 动态构建参数列表
		params := []ParamInfo{
			{Name: "prompt", Type: "string", Required: false, Description: "视频描述"},
			{Name: "duration", Type: "integer", Required: false, Default: config.Durations[0], Options: intsToStrings(config.Durations), Description: "视频时长(秒)"},
			{Name: "resolution", Type: "string", Required: false, Default: config.Resolutions[len(config.Resolutions)-1], Options: config.Resolutions, Description: "分辨率"},
			{Name: "first_frame", Type: "string", Required: false, Description: "首帧图片URL (图生视频)"},
			{Name: "last_frame", Type: "string", Required: false, Description: "尾帧图片URL (首尾帧生视频)"},
		}
		// 参考图生视频
		if config.SupportsRef {
			params = append(params, ParamInfo{Name: "images", Type: "array", Required: false, Description: "参考图片URL列表 (3张以上)"})
		}
		// 风格选项
		if len(config.Styles) > 1 {
			params = append(params, ParamInfo{Name: "style", Type: "string", Required: false, Default: "general", Options: config.Styles, Description: "视频风格 (general=通用, anime=动漫)"})
		}
		params = append(params,
			ParamInfo{Name: "movement_amplitude", Type: "string", Required: false, Default: "auto", Options: []string{"auto", "small", "medium", "large"}, Description: "运动幅度"},
			ParamInfo{Name: "seed", Type: "integer", Required: false, Description: "随机种子"},
			ParamInfo{Name: "generate_audio", Type: "boolean", Required: false, Default: false, Description: "是否生成背景音乐"},
		)

		// 确定模型类型描述
		modelType := "image-to-video (首尾帧)"
		if config.SupportsT2V && config.SupportsRef {
			modelType = "全功能 (文生/图生/首尾帧/参考图)"
		} else if config.SupportsT2V {
			modelType = "text-to-video (支持图生视频/首尾帧)"
		} else if config.SupportsRef {
			modelType = "image-to-video (支持首尾帧/参考图)"
		}

		models = append(models, ModelInfo{
			ID:                   modelName,
			Name:                 modelName,
			Vendor:               "Vidu",
			Type:                 modelType,
			SupportedDurations:   config.Durations,
			SupportedResolutions: config.Resolutions,
			SupportsFirstFrame:   true,
			SupportsLastFrame:    true,
			SupportsAudio:        true,
			Parameters:           params,
		})
	}

	// Sora (Sora2 API)
	for _, m := range sora.ModelList {
		if _, ok := enabledModelSet[m]; !ok {
			continue
		}
		// sora-2-pro 支持更多选项
		isPro := m == "sora-2-pro"
		durationOptions := []string{"10", "15"}
		if isPro {
			durationOptions = []string{"10", "15", "25"}
		}

		params := []ParamInfo{
			{Name: "prompt", Type: "string", Required: true, Description: "视频描述"},
			{Name: "duration", Type: "string", Required: false, Default: "10", Options: durationOptions, Description: "视频时长(秒)"},
			{Name: "aspect_ratio", Type: "string", Required: false, Default: "16:9", Options: []string{"16:9", "9:16"}, Description: "宽高比"},
			{Name: "images", Type: "array", Required: false, Description: "图生视频的图片URL列表"},
		}
		if isPro {
			params = append(params, ParamInfo{Name: "hd", Type: "boolean", Required: false, Default: false, Description: "是否高清 (会增加生成时间)"})
		}
		params = append(params,
			ParamInfo{Name: "watermark", Type: "boolean", Required: false, Default: false, Description: "是否添加水印"},
			ParamInfo{Name: "private", Type: "boolean", Required: false, Default: false, Description: "是否隐藏视频 (无法remix)"},
		)

		models = append(models, ModelInfo{
			ID:               m,
			Name:             m,
			Vendor:           "OpenAI",
			Type:             "text-to-video (支持图生视频)",
			SupportedRatios:  []string{"16:9", "9:16"},
			SupportsFirstFrame: true, // 支持图生视频
			Parameters:       params,
		})
	}

	// 阿里 (Ali)
	for _, m := range ali.ModelList {
		if _, ok := enabledModelSet[m]; !ok {
			continue
		}
		modelType := "image-to-video"
		if strings.Contains(m, "t2v") {
			modelType = "text-to-video"
		}
		models = append(models, ModelInfo{
			ID:                   m,
			Name:                 m,
			Vendor:               "阿里云 (通义万相)",
			Type:                 modelType,
			SupportedDurations:   []int{3, 4, 5, 6, 7, 8, 9, 10},
			SupportedResolutions: []string{"480P", "720P", "1080P"},
			SupportsFirstFrame:   true,
			SupportsLastFrame:    true,
			SupportsAudio:        strings.HasPrefix(m, "wan2.5"),
			Parameters: []ParamInfo{
				{Name: "prompt", Type: "string", Required: true, Description: "视频描述"},
				{Name: "duration", Type: "integer", Required: false, Default: 5, Description: "视频时长(秒)"},
				{Name: "resolution", Type: "string", Required: false, Default: "720P", Options: []string{"480P", "720P", "1080P"}, Description: "分辨率"},
				{Name: "first_frame", Type: "string", Required: false, Description: "首帧图片URL"},
				{Name: "last_frame", Type: "string", Required: false, Description: "尾帧图片URL"},
				{Name: "negative_prompt", Type: "string", Required: false, Description: "反向提示词"},
			},
		})
	}

	// MJ Video (Midjourney 视频生成)
	// 参考文档: https://gpt-best.apifox.cn/api-323778153
	mjVideoModels := []string{"mj-video", "mj_video"}
	for _, m := range mjVideoModels {
		if _, ok := enabledModelSet[m]; !ok {
			continue
		}
		models = append(models, ModelInfo{
			ID:               m,
			Name:             m,
			Vendor:           "Midjourney",
			Type:             "image-to-video",
			Description:      "一次生成 4 个视频",
			SupportsFirstFrame: true,
			Parameters: []ParamInfo{
				{Name: "prompt", Type: "string", Required: true, Description: "视频描述"},
				{Name: "motion", Type: "string", Required: true, Default: "low", Options: []string{"low", "high"}, Description: "动态程度 (low=低动态, high=高动态)"},
				{Name: "image", Type: "string", Required: false, Description: "首帧图片URL或Base64"},
				{Name: "notifyHook", Type: "string", Required: false, Description: "回调通知URL"},
			},
		})
	}

	return EndpointInfo{
		Type:        "video",
		Name:        "视频生成",
		Description: "根据文本或图片生成视频（异步任务）",
		Endpoint:    "/v1/video/generations",
		Method:      "POST",
		Models:      models,
		Request: &RequestExample{
			Example: map[string]any{
				"model":       "MiniMax-Hailuo-2.3",
				"prompt":      "一只猫在草地上奔跑",
				"duration":    5,
				"resolution":  "1080P",
				"first_frame": "https://example.com/image.jpg",
			},
		},
		Response: &ResponseExample{
			Example: map[string]any{
				"task_id": "cgt-20260111143028-kwrks",
			},
		},
	}
}

// buildAudioEndpoint 构建音频端点配置
func buildAudioEndpoint(enabledModels []string) EndpointInfo {
	models := []ModelInfo{}

	// 从已启用的模型中获取音频模型
	for _, m := range enabledModels {
		if isAudioModel(strings.ToLower(m)) {
			models = append(models, ModelInfo{
				ID:     m,
				Name:   m,
				Vendor: guessVendorFromModel(m),
			})
		}
	}

	return EndpointInfo{
		Type:        "audio",
		Name:        "语音服务",
		Description: "文字转语音(TTS)和语音转文字(STT)",
		Endpoint:    "/v1/audio/speech",
		Method:      "POST",
		Models:      models,
		Request: &RequestExample{
			Example: map[string]any{
				"model": "tts-1",
				"input": "Hello, world!",
				"voice": "alloy",
			},
		},
		Response: &ResponseExample{
			Example: "audio/mpeg binary data",
		},
	}
}

// buildEmbeddingEndpoint 构建嵌入端点配置
func buildEmbeddingEndpoint(enabledModels []string) EndpointInfo {
	models := []ModelInfo{}

	// 从已启用的模型中获取嵌入模型
	for _, m := range enabledModels {
		if isEmbeddingModel(strings.ToLower(m)) {
			models = append(models, ModelInfo{
				ID:     m,
				Name:   m,
				Vendor: guessVendorFromModel(m),
			})
		}
	}

	return EndpointInfo{
		Type:        "embedding",
		Name:        "文本嵌入",
		Description: "将文本转换为向量表示",
		Endpoint:    "/v1/embeddings",
		Method:      "POST",
		Models:      models,
		Request: &RequestExample{
			Example: map[string]any{
				"model": "text-embedding-3-small",
				"input": "Hello, world!",
			},
		},
		Response: &ResponseExample{
			Example: map[string]any{
				"object": "list",
				"data": []map[string]any{
					{
						"object":    "embedding",
						"index":     0,
						"embedding": []float64{0.1, 0.2, 0.3},
					},
				},
				"model": "text-embedding-3-small",
				"usage": map[string]int{
					"prompt_tokens": 3,
					"total_tokens":  3,
				},
			},
		},
	}
}

// 辅助函数

func isVideoModel(model string) bool {
	videoKeywords := []string{"video", "veo", "sora", "kling", "vidu", "hailuo", "wan2", "wanx", "seedance", "t2v", "i2v", "s2v"}
	for _, kw := range videoKeywords {
		if strings.Contains(model, kw) {
			return true
		}
	}
	return false
}

func isImageModel(model string) bool {
	imageKeywords := []string{"dall-e", "dalle", "midjourney", "mj_", "mj-", "mj", "imagine", "stable-diffusion", "sd-", "imagen", "jimeng", "cogview", "seedream", "banana"}
	for _, kw := range imageKeywords {
		if strings.Contains(model, kw) {
			return true
		}
	}
	return false
}

func isEmbeddingModel(model string) bool {
	return strings.Contains(model, "embedding") || strings.Contains(model, "embed")
}

func isAudioModel(model string) bool {
	audioKeywords := []string{"tts", "whisper", "speech", "audio"}
	for _, kw := range audioKeywords {
		if strings.Contains(model, kw) {
			return true
		}
	}
	return false
}

func guessVendorFromModel(model string) string {
	model = strings.ToLower(model)
	switch {
	case strings.HasPrefix(model, "gpt") || strings.HasPrefix(model, "o1") || strings.HasPrefix(model, "o3"):
		return "OpenAI"
	case strings.HasPrefix(model, "claude"):
		return "Anthropic"
	case strings.HasPrefix(model, "gemini"):
		return "Google"
	case strings.HasPrefix(model, "deepseek"):
		return "DeepSeek"
	case strings.HasPrefix(model, "moonshot"):
		return "Moonshot"
	case strings.HasPrefix(model, "qwen"):
		return "阿里云"
	case strings.HasPrefix(model, "glm"):
		return "智谱AI"
	case strings.HasPrefix(model, "doubao"):
		return "豆包 (Doubao)"
	case strings.HasPrefix(model, "yi-"):
		return "零一万物"
	case strings.HasPrefix(model, "ernie"):
		return "百度"
	case strings.HasPrefix(model, "hunyuan"):
		return "腾讯"
	case strings.HasPrefix(model, "llama"):
		return "Meta"
	case strings.HasPrefix(model, "mixtral") || strings.HasPrefix(model, "mistral"):
		return "Mistral"
	default:
		return "Other"
	}
}

// intsToStrings 将整数数组转换为字符串数组
func intsToStrings(ints []int) []string {
	result := make([]string, len(ints))
	for i, v := range ints {
		result[i] = fmt.Sprintf("%d", v)
	}
	return result
}
