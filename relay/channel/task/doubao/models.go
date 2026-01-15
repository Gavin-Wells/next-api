package doubao

// ModelConfig 豆包视频模型配置
// 参考文档: https://www.volcengine.com/docs/82379/1520757?lang=zh
type ModelConfig struct {
	Name                 string
	DefaultDuration      int      // 默认时长（秒）
	DefaultResolution    string   // 默认分辨率
	DefaultRatio         string   // 默认宽高比
	SupportedDurations   []int    // 支持的时长列表
	SupportedResolutions []string // 支持的分辨率列表
	SupportedRatios      []string // 支持的宽高比列表
	// 模型能力标识
	SupportsFirstFrame   bool // 支持首帧图片
	SupportsLastFrame    bool // 支持尾帧图片 (首尾帧生成)
	SupportsAudio        bool // 支持生成音频
	SupportsCfgScale     bool // 支持 cfg_scale 参数
	SupportsFps          bool // 支持自定义帧率
	ModelType            string // 模型类型: text2video, image2video, startend2video
}

// GetModelConfig 获取模型配置
// 参考文档: https://www.volcengine.com/docs/82379/1520757?lang=zh
func GetModelConfig(model string) ModelConfig {
	configs := map[string]ModelConfig{
		// Seedance 1.0 Pro - 支持文生视频、图生视频-首帧、图生视频-首尾帧
		"doubao-seedance-1-0-pro-250528": {
			Name:                 "doubao-seedance-1-0-pro-250528",
			DefaultDuration:      5,
			DefaultResolution:    "1080p",
			DefaultRatio:         "16:9",
			SupportedDurations:   []int{5, 10},
			SupportedResolutions: []string{"480p", "720p", "1080p"},
			SupportedRatios:      []string{"16:9", "9:16", "1:1"},
			SupportsFirstFrame:   true,  // 支持首帧
			SupportsLastFrame:    true,  // 支持首尾帧
			SupportsAudio:        false, // 不支持音频
			SupportsCfgScale:     true,
			ModelType:            "text2video",
		},
		// Seedance 1.0 Lite T2V - 仅支持文生视频
		"doubao-seedance-1-0-lite-t2v": {
			Name:                 "doubao-seedance-1-0-lite-t2v",
			DefaultDuration:      5,
			DefaultResolution:    "720p",
			DefaultRatio:         "16:9",
			SupportedDurations:   []int{5, 10},
			SupportedResolutions: []string{"480p", "720p"},
			SupportedRatios:      []string{"16:9", "9:16", "1:1"},
			SupportsFirstFrame:   false, // 仅文生视频
			SupportsLastFrame:    false,
			SupportsAudio:        false,
			SupportsCfgScale:     true,
			ModelType:            "text2video",
		},
		// Seedance 1.0 Lite I2V - 支持参考图、首帧、首尾帧
		"doubao-seedance-1-0-lite-i2v": {
			Name:                 "doubao-seedance-1-0-lite-i2v",
			DefaultDuration:      5,
			DefaultResolution:    "720p",
			DefaultRatio:         "16:9",
			SupportedDurations:   []int{5, 10},
			SupportedResolutions: []string{"480p", "720p"},
			SupportedRatios:      []string{"16:9", "9:16", "1:1"},
			SupportsFirstFrame:   true, // 支持首帧
			SupportsLastFrame:    true, // 支持首尾帧
			SupportsAudio:        false,
			SupportsCfgScale:     true,
			ModelType:            "image2video",
		},
		// Seedance 1.5 Pro - 支持文生视频、图生视频-首帧、图生视频-首尾帧、有声视频
		"doubao-seedance-1-5-pro-251215": {
			Name:                 "doubao-seedance-1-5-pro-251215",
			DefaultDuration:      5,
			DefaultResolution:    "1080p",
			DefaultRatio:         "16:9",
			SupportedDurations:   []int{5, 10},
			SupportedResolutions: []string{"480p", "720p", "1080p"},
			SupportedRatios:      []string{"16:9", "9:16", "1:1", "4:3", "3:4"},
			SupportsFirstFrame:   true, // 支持首帧
			SupportsLastFrame:    true, // 支持首尾帧
			SupportsAudio:        true, // 支持有声视频
			SupportsCfgScale:     true,
			SupportsFps:          true,
			ModelType:            "text2video",
		},
		// Seedance 1.0 Pro Fast - 支持文生视频、图生视频-首帧
		"doubao-seedance-1-0-pro-fast-251015": {
			Name:                 "doubao-seedance-1-0-pro-fast-251015",
			DefaultDuration:      5,
			DefaultResolution:    "720p",
			DefaultRatio:         "16:9",
			SupportedDurations:   []int{5},
			SupportedResolutions: []string{"480p", "720p"},
			SupportedRatios:      []string{"16:9", "9:16", "1:1"},
			SupportsFirstFrame:   true,  // 支持首帧
			SupportsLastFrame:    false, // 不支持首尾帧
			SupportsAudio:        false,
			SupportsCfgScale:     false,
			ModelType:            "text2video",
		},
		// Seedance 1.5 Pro I2V - 图生视频专用
		"doubao-seedance-1-5-pro-i2v": {
			Name:                 "doubao-seedance-1-5-pro-i2v",
			DefaultDuration:      5,
			DefaultResolution:    "1080p",
			DefaultRatio:         "16:9",
			SupportedDurations:   []int{5, 10},
			SupportedResolutions: []string{"480p", "720p", "1080p"},
			SupportedRatios:      []string{"16:9", "9:16", "1:1", "4:3", "3:4"},
			SupportsFirstFrame:   true, // 支持首帧
			SupportsLastFrame:    true, // 支持首尾帧
			SupportsAudio:        true, // 支持有声视频
			SupportsCfgScale:     true,
			SupportsFps:          true,
			ModelType:            "image2video",
		},
		// Seedance 1.5 Pro S2E - 首尾帧生视频专用
		"doubao-seedance-1-5-pro-s2e": {
			Name:                 "doubao-seedance-1-5-pro-s2e",
			DefaultDuration:      5,
			DefaultResolution:    "1080p",
			DefaultRatio:         "16:9",
			SupportedDurations:   []int{5, 10},
			SupportedResolutions: []string{"480p", "720p", "1080p"},
			SupportedRatios:      []string{"16:9", "9:16", "1:1", "4:3", "3:4"},
			SupportsFirstFrame:   true, // 支持首帧
			SupportsLastFrame:    true, // 支持首尾帧
			SupportsAudio:        true, // 支持有声视频
			SupportsCfgScale:     true,
			SupportsFps:          true,
			ModelType:            "startend2video",
		},
	}

	if config, exists := configs[model]; exists {
		return config
	}

	// 默认配置
	return ModelConfig{
		Name:                 model,
		DefaultDuration:      5,
		DefaultResolution:    "720p",
		DefaultRatio:         "16:9",
		SupportedDurations:   []int{5, 10},
		SupportedResolutions: []string{"480p", "720p"},
		SupportedRatios:      []string{"16:9", "9:16", "1:1"},
		SupportsFirstFrame:   false,
		SupportsLastFrame:    false,
		SupportsAudio:        false,
		SupportsCfgScale:     true,
		ModelType:            "text2video",
	}
}

