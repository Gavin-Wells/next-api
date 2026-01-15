package controller

import (
	"net/http"
	"strconv"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/model"
	"github.com/QuantumNous/new-api/service/storage"
	"github.com/gin-gonic/gin"
)

// StorageConfigRequest 对象存储配置请求
type StorageConfigRequest struct {
	Type                string `json:"type"`
	Endpoint            string `json:"endpoint"`
	AccessKeyID         string `json:"access_key_id"`
	AccessKeySecret     string `json:"access_key_secret"`
	BucketName          string `json:"bucket_name"`
	Region              string `json:"region"`
	UseSSL              bool   `json:"use_ssl"`
	BasePath            string `json:"base_path"`
	Domain              string `json:"domain"`
	PresignedURLEnabled bool   `json:"presigned_url_enabled"`
	PresignedURLExpires int64  `json:"presigned_url_expires"`
	AutoUpload          bool   `json:"auto_upload"`
	DeleteAfterUpload   bool   `json:"delete_after_upload"`
}

// GetStorageConfig 获取对象存储配置
func GetStorageConfig(c *gin.Context) {
	config := storage.GetStorageConfig()

	// 返回配置，但隐藏敏感信息
	response := gin.H{
		"type":                  "",
		"endpoint":              "",
		"access_key_id":         "",
		"bucket_name":           "",
		"region":                "",
		"use_ssl":               true,
		"base_path":             "videos/",
		"domain":                "",
		"presigned_url_enabled": false,
		"presigned_url_expires": 3600,
		"auto_upload":           true,
		"delete_after_upload":   false,
		"enabled":               false,
	}

	if config != nil {
		response["type"] = config.Type
		response["endpoint"] = config.Endpoint
		// AccessKeyID 只显示部分
		if len(config.AccessKeyID) > 4 {
			response["access_key_id"] = config.AccessKeyID[:4] + "****"
		}
		response["bucket_name"] = config.BucketName
		response["region"] = config.Region
		response["use_ssl"] = config.UseSSL
		response["base_path"] = config.BasePath
		response["domain"] = config.Domain
		response["presigned_url_enabled"] = config.PresignedURLEnabled
		response["presigned_url_expires"] = config.PresignedURLExpires
		response["auto_upload"] = config.AutoUpload
		response["delete_after_upload"] = config.DeleteAfterUpload
		response["enabled"] = storage.IsStorageEnabled()
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "",
		"data":    response,
	})
}

// UpdateStorageConfig 更新对象存储配置
func UpdateStorageConfig(c *gin.Context) {
	var req StorageConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的请求参数: " + err.Error(),
		})
		return
	}

	// 验证存储类型
	validTypes := map[string]bool{"none": true, "oss": true, "cos": true, "s3": true, "minio": true}
	if !validTypes[req.Type] {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的存储类型，支持: none, oss, cos, s3, minio",
		})
		return
	}

	// 如果启用了存储，验证必填字段
	if req.Type != "none" {
		if req.Endpoint == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "端点地址不能为空",
			})
			return
		}
		if req.AccessKeyID == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "AccessKey ID 不能为空",
			})
			return
		}
		if req.AccessKeySecret == "" {
			// 如果没有提供新的 AccessKeySecret，检查是否已有配置
			currentConfig := storage.GetStorageConfig()
			if currentConfig == nil || currentConfig.AccessKeySecret == "" {
				c.JSON(http.StatusBadRequest, gin.H{
					"success": false,
					"message": "AccessKey Secret 不能为空",
				})
				return
			}
			// 使用现有的 AccessKeySecret
			req.AccessKeySecret = currentConfig.AccessKeySecret
		}
		if req.BucketName == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "存储桶名称不能为空",
			})
			return
		}
	}

	// 设置默认值
	if req.BasePath == "" {
		req.BasePath = "videos/"
	}
	if req.PresignedURLExpires <= 0 {
		req.PresignedURLExpires = 3600
	}

	// 保存配置到数据库
	options := map[string]string{
		storage.OptionKeyStorageType:              req.Type,
		storage.OptionKeyStorageEndpoint:          req.Endpoint,
		storage.OptionKeyStorageAccessKeyID:       req.AccessKeyID,
		storage.OptionKeyStorageAccessKeySecret:   req.AccessKeySecret,
		storage.OptionKeyStorageBucketName:        req.BucketName,
		storage.OptionKeyStorageRegion:            req.Region,
		storage.OptionKeyStorageUseSSL:            strconv.FormatBool(req.UseSSL),
		storage.OptionKeyStorageBasePath:          req.BasePath,
		storage.OptionKeyStorageDomain:            req.Domain,
		storage.OptionKeyStoragePresignedEnabled:  strconv.FormatBool(req.PresignedURLEnabled),
		storage.OptionKeyStoragePresignedExpires:  strconv.FormatInt(req.PresignedURLExpires, 10),
		storage.OptionKeyStorageAutoUpload:        strconv.FormatBool(req.AutoUpload),
		storage.OptionKeyStorageDeleteAfterUpload: strconv.FormatBool(req.DeleteAfterUpload),
	}

	for key, value := range options {
		if err := model.UpdateOption(key, value); err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "保存配置失败: " + err.Error(),
			})
			return
		}
	}

	// 重新加载存储配置
	if err := storage.ReloadStorage(); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "配置已保存，但初始化存储失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "对象存储配置已更新",
	})
}

// TestStorageConnection 测试对象存储连接
func TestStorageConnection(c *gin.Context) {
	var req StorageConfigRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "无效的请求参数: " + err.Error(),
		})
		return
	}

	// 验证存储类型
	if req.Type == "" || req.Type == "none" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请选择存储类型",
		})
		return
	}

	// 如果没有提供 AccessKeySecret，使用现有配置
	if req.AccessKeySecret == "" {
		currentConfig := storage.GetStorageConfig()
		if currentConfig != nil && currentConfig.AccessKeySecret != "" {
			req.AccessKeySecret = currentConfig.AccessKeySecret
		}
	}

	// 构建测试配置
	testConfig := &storage.StorageConfig{
		Type:            req.Type,
		Endpoint:        req.Endpoint,
		AccessKeyID:     req.AccessKeyID,
		AccessKeySecret: req.AccessKeySecret,
		BucketName:      req.BucketName,
		Region:          req.Region,
		UseSSL:          req.UseSSL,
		BasePath:        req.BasePath,
		Domain:          req.Domain,
	}

	// 测试连接
	if err := storage.TestStorageConnection(testConfig); err != nil {
		c.JSON(http.StatusOK, gin.H{
			"success": false,
			"message": "连接测试失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "连接测试成功",
	})
}

// GetStorageStatus 获取对象存储状态（用于状态API）
func GetStorageStatus() map[string]interface{} {
	config := storage.GetStorageConfig()
	if config == nil {
		return map[string]interface{}{
			"enabled": false,
			"type":    "none",
		}
	}

	return map[string]interface{}{
		"enabled":  storage.IsStorageEnabled(),
		"type":     config.Type,
		"bucket":   config.BucketName,
		"endpoint": config.Endpoint,
	}
}

// init 注册敏感字段过滤
func init() {
	// 确保敏感字段不会通过 GetOptions 接口泄露
	common.OptionMapRWMutex.Lock()
	defer common.OptionMapRWMutex.Unlock()
	// AccessKeySecret 在 GetOptions 中会被过滤（以 Secret 结尾）
}









