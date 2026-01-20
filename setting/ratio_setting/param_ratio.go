package ratio_setting

import (
	"encoding/json"
	"fmt"
	"strconv"
	"strings"
	"sync"

	"github.com/QuantumNous/new-api/common"
)

// ParamRatioRule 参数倍率规则
// 支持模型匹配（通配符*）和精确参数值匹配
type ParamRatioRule struct {
	Model      string  `json:"model"`       // 模型名，支持 * 通配符，如 "doubao-*", "cogvideox-*"
	ParamKey   string  `json:"param_key"`   // 参数名，如 "resolution", "duration", "quality"
	ParamValue string  `json:"param_value"` // 参数值，如 "1080p", "720p", "10", "hd"
	Ratio      float64 `json:"ratio"`       // 倍率，如 1.5 表示1.5倍计费
}

// ParamRatioConfig 参数倍率配置
type ParamRatioConfig struct {
	Rules   []ParamRatioRule `json:"rules"`
	Enabled bool             `json:"enabled"`
}

var (
	paramRatioConfig      *ParamRatioConfig
	paramRatioConfigMutex = sync.RWMutex{}
)

// InitParamRatioSettings 初始化参数倍率配置
func InitParamRatioSettings() {
	paramRatioConfigMutex.Lock()
	defer paramRatioConfigMutex.Unlock()
	paramRatioConfig = &ParamRatioConfig{
		Rules:   []ParamRatioRule{},
		Enabled: true,
	}
}

// GetParamRatioConfig 获取参数倍率配置
func GetParamRatioConfig() *ParamRatioConfig {
	paramRatioConfigMutex.RLock()
	defer paramRatioConfigMutex.RUnlock()
	if paramRatioConfig == nil {
		return &ParamRatioConfig{
			Rules:   []ParamRatioRule{},
			Enabled: true,
		}
	}
	return paramRatioConfig
}

// ParamRatioConfig2JSONString 将配置转为JSON字符串
func ParamRatioConfig2JSONString() string {
	paramRatioConfigMutex.RLock()
	defer paramRatioConfigMutex.RUnlock()

	if paramRatioConfig == nil {
		return `{"rules":[],"enabled":true}`
	}
	jsonBytes, err := json.Marshal(paramRatioConfig)
	if err != nil {
		common.SysError("error marshalling param ratio config: " + err.Error())
		return `{"rules":[],"enabled":true}`
	}
	return string(jsonBytes)
}

// UpdateParamRatioConfigByJSONString 通过JSON字符串更新配置
func UpdateParamRatioConfigByJSONString(jsonStr string) error {
	paramRatioConfigMutex.Lock()
	defer paramRatioConfigMutex.Unlock()

	newConfig := &ParamRatioConfig{}
	err := json.Unmarshal([]byte(jsonStr), newConfig)
	if err != nil {
		return err
	}
	paramRatioConfig = newConfig
	InvalidateExposedDataCache()
	return nil
}

// matchModelPattern 检查模型名是否匹配模式
// 支持 * 通配符，如 "doubao-*" 匹配 "doubao-seedance-1-0"
func matchModelPattern(pattern, modelName string) bool {
	// 精确匹配
	if pattern == modelName {
		return true
	}
	// 通配符匹配
	if strings.HasSuffix(pattern, "*") {
		prefix := strings.TrimSuffix(pattern, "*")
		return strings.HasPrefix(modelName, prefix)
	}
	if strings.HasPrefix(pattern, "*") {
		suffix := strings.TrimPrefix(pattern, "*")
		return strings.HasSuffix(modelName, suffix)
	}
	if strings.Contains(pattern, "*") {
		parts := strings.Split(pattern, "*")
		if len(parts) == 2 {
			return strings.HasPrefix(modelName, parts[0]) && strings.HasSuffix(modelName, parts[1])
		}
	}
	return false
}

// CalculateParamRatio 计算给定模型和参数的总倍率
// params 是一个 map[string]interface{} 或 map[string]string，包含请求参数
// 返回最终的倍率乘数（多个匹配的规则会相乘）
func CalculateParamRatio(modelName string, params map[string]interface{}) float64 {
	paramRatioConfigMutex.RLock()
	defer paramRatioConfigMutex.RUnlock()

	if paramRatioConfig == nil || !paramRatioConfig.Enabled || len(paramRatioConfig.Rules) == 0 {
		return 1.0
	}

	totalRatio := 1.0
	matchedParams := make(map[string]bool) // 防止同一参数多次匹配

	for _, rule := range paramRatioConfig.Rules {
		// 检查模型是否匹配
		if !matchModelPattern(rule.Model, modelName) {
			continue
		}

		// 检查参数是否存在且值匹配
		paramValue, exists := params[rule.ParamKey]
		if !exists {
			continue
		}

		// 将参数值转换为字符串进行比较
		paramValueStr := convertToString(paramValue)
		if paramValueStr == rule.ParamValue {
			// 防止同一参数的多个规则重复应用，取最后匹配的
			key := rule.ParamKey + "=" + rule.ParamValue
			if !matchedParams[key] {
				matchedParams[key] = true
				totalRatio *= rule.Ratio
			}
		}
	}

	return totalRatio
}

// CalculateParamRatioFromMap 从 map[string]string 计算参数倍率
func CalculateParamRatioFromMap(modelName string, params map[string]string) float64 {
	interfaceParams := make(map[string]interface{})
	for k, v := range params {
		interfaceParams[k] = v
	}
	return CalculateParamRatio(modelName, interfaceParams)
}

// convertToString 将任意类型转换为字符串
func convertToString(value interface{}) string {
	switch v := value.(type) {
	case string:
		return v
	case int:
		return strconv.Itoa(v)
	case int64:
		return strconv.FormatInt(v, 10)
	case float64:
		// 如果是整数，去掉小数点
		if v == float64(int(v)) {
			return strconv.Itoa(int(v))
		}
		return fmt.Sprintf("%g", v)
	case bool:
		if v {
			return "true"
		}
		return "false"
	default:
		// 尝试 JSON 序列化
		jsonBytes, err := json.Marshal(v)
		if err != nil {
			return ""
		}
		return string(jsonBytes)
	}
}

// GetParamRatioRules 获取所有规则
func GetParamRatioRules() []ParamRatioRule {
	paramRatioConfigMutex.RLock()
	defer paramRatioConfigMutex.RUnlock()
	if paramRatioConfig == nil {
		return []ParamRatioRule{}
	}
	return paramRatioConfig.Rules
}

// IsParamRatioEnabled 检查参数倍率是否启用
func IsParamRatioEnabled() bool {
	paramRatioConfigMutex.RLock()
	defer paramRatioConfigMutex.RUnlock()
	if paramRatioConfig == nil {
		return false
	}
	return paramRatioConfig.Enabled
}

// SetParamRatioEnabled 设置参数倍率启用状态
func SetParamRatioEnabled(enabled bool) {
	paramRatioConfigMutex.Lock()
	defer paramRatioConfigMutex.Unlock()
	if paramRatioConfig == nil {
		paramRatioConfig = &ParamRatioConfig{
			Rules:   []ParamRatioRule{},
			Enabled: enabled,
		}
	} else {
		paramRatioConfig.Enabled = enabled
	}
}

// AddParamRatioRule 添加一条规则
func AddParamRatioRule(rule ParamRatioRule) {
	paramRatioConfigMutex.Lock()
	defer paramRatioConfigMutex.Unlock()
	if paramRatioConfig == nil {
		paramRatioConfig = &ParamRatioConfig{
			Rules:   []ParamRatioRule{},
			Enabled: true,
		}
	}
	paramRatioConfig.Rules = append(paramRatioConfig.Rules, rule)
}

// RemoveParamRatioRule 删除指定索引的规则
func RemoveParamRatioRule(index int) bool {
	paramRatioConfigMutex.Lock()
	defer paramRatioConfigMutex.Unlock()
	if paramRatioConfig == nil || index < 0 || index >= len(paramRatioConfig.Rules) {
		return false
	}
	paramRatioConfig.Rules = append(paramRatioConfig.Rules[:index], paramRatioConfig.Rules[index+1:]...)
	return true
}

// GetDefaultParamRatioConfig 获取默认的参数倍率配置（示例）
func GetDefaultParamRatioConfig() *ParamRatioConfig {
	return &ParamRatioConfig{
		Enabled: true,
		Rules: []ParamRatioRule{
			// 视频模型 - 分辨率
			{Model: "doubao-*", ParamKey: "resolution", ParamValue: "720p", Ratio: 0.8},
			{Model: "doubao-*", ParamKey: "resolution", ParamValue: "1080p", Ratio: 1.0},
			{Model: "cogvideox-*", ParamKey: "resolution", ParamValue: "720p", Ratio: 0.8},
			{Model: "cogvideox-*", ParamKey: "resolution", ParamValue: "1080p", Ratio: 1.2},
			// 视频模型 - 时长
			{Model: "doubao-*", ParamKey: "duration", ParamValue: "5", Ratio: 1.0},
			{Model: "doubao-*", ParamKey: "duration", ParamValue: "10", Ratio: 1.8},
			// 图片模型 - 质量
			{Model: "*-seedream-*", ParamKey: "quality", ParamValue: "standard", Ratio: 1.0},
			{Model: "*-seedream-*", ParamKey: "quality", ParamValue: "hd", Ratio: 1.5},
			// 图片模型 - 尺寸
			{Model: "*-seedream-*", ParamKey: "size", ParamValue: "4K", Ratio: 1.5},
			{Model: "*-seedream-*", ParamKey: "size", ParamValue: "2K", Ratio: 1.0},
		},
	}
}

