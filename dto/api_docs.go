package dto

// ApiDocsConfig API 文档配置
type ApiDocsConfig struct {
	Endpoints []EndpointConfig `json:"endpoints"`
}

// EndpointConfig 端点配置
type EndpointConfig struct {
	Type        string            `json:"type"`        // chat, image, video, audio, embedding, rerank
	Name        string            `json:"name"`        // 显示名称
	Description string            `json:"description"` // 描述
	Endpoint    string            `json:"endpoint"`    // API 端点
	Method      string            `json:"method"`      // HTTP 方法
	Models      []ModelDocConfig  `json:"models"`      // 支持的模型列表
	Request     RequestDocConfig  `json:"request"`     // 请求示例
	Response    ResponseDocConfig `json:"response"`    // 响应示例
}

// ModelDocConfig 模型文档配置
type ModelDocConfig struct {
	ID                   string           `json:"id"`                              // 模型 ID
	Name                 string           `json:"name"`                            // 显示名称
	Vendor               string           `json:"vendor"`                          // 供应商
	Type                 string           `json:"type"`                            // 模型类型: text2video, image2video, text2image 等
	Description          string           `json:"description,omitempty"`           // 描述
	DefaultDuration      int              `json:"default_duration,omitempty"`      // 默认时长（秒）
	DefaultResolution    string           `json:"default_resolution,omitempty"`    // 默认分辨率
	DefaultRatio         string           `json:"default_ratio,omitempty"`         // 默认宽高比
	SupportedDurations   []int            `json:"supported_durations,omitempty"`   // 支持的时长
	SupportedResolutions []string         `json:"supported_resolutions,omitempty"` // 支持的分辨率
	SupportedRatios      []string         `json:"supported_ratios,omitempty"`      // 支持的宽高比
	SupportedSizes       []string         `json:"supported_sizes,omitempty"`       // 支持的尺寸（图片）
	Parameters           []ParameterConfig `json:"parameters,omitempty"`            // 其他参数配置
}

// ParameterConfig 参数配置
type ParameterConfig struct {
	Name        string   `json:"name"`                  // 参数名
	Type        string   `json:"type"`                  // 参数类型: string, int, bool, array
	Required    bool     `json:"required"`              // 是否必填
	Default     any      `json:"default,omitempty"`     // 默认值
	Description string   `json:"description,omitempty"` // 描述
	Options     []string `json:"options,omitempty"`     // 可选值列表
}

// RequestDocConfig 请求文档配置
type RequestDocConfig struct {
	ContentType string `json:"content_type"` // application/json
	Example     any    `json:"example"`      // 请求示例
}

// ResponseDocConfig 响应文档配置
type ResponseDocConfig struct {
	ContentType string `json:"content_type"` // application/json
	Example     any    `json:"example"`      // 响应示例
}


