package storage

import (
	"context"
	"fmt"
	"strconv"
	"sync"

	"github.com/QuantumNous/new-api/common"
)

// Option key constants for object storage
const (
	OptionKeyStorageType              = "ObjectStorageType"
	OptionKeyStorageEndpoint          = "ObjectStorageEndpoint"
	OptionKeyStorageAccessKeyID       = "ObjectStorageAccessKeyID"
	OptionKeyStorageAccessKeySecret   = "ObjectStorageAccessKeySecret"
	OptionKeyStorageBucketName        = "ObjectStorageBucketName"
	OptionKeyStorageRegion            = "ObjectStorageRegion"
	OptionKeyStorageUseSSL            = "ObjectStorageUseSSL"
	OptionKeyStorageBasePath          = "ObjectStorageBasePath"
	OptionKeyStorageDomain            = "ObjectStorageDomain"
	OptionKeyStoragePresignedEnabled  = "ObjectStoragePresignedURLEnabled"
	OptionKeyStoragePresignedExpires  = "ObjectStoragePresignedURLExpires"
	OptionKeyStorageAutoUpload        = "ObjectStorageAutoUpload"
	OptionKeyStorageDeleteAfterUpload = "ObjectStorageDeleteAfterUpload"
)

// StorageConfig 对象存储配置
type StorageConfig struct {
	// 存储类型：none(禁用), oss(阿里云), cos(腾讯云), s3(AWS S3), minio(MinIO)
	Type string

	// 通用配置
	Endpoint        string // 存储端点地址
	AccessKeyID     string // AccessKey ID
	AccessKeySecret string // AccessKey Secret
	BucketName      string // 存储桶名称
	Region          string // 区域
	UseSSL          bool   // 是否使用HTTPS

	// 路径配置
	BasePath string // 基础路径前缀（如：videos/）
	Domain   string // 自定义域名（CDN）

	// 签名URL配置
	PresignedURLEnabled bool  // 是否启用签名URL
	PresignedURLExpires int64 // 签名URL过期时间（秒）

	// 上传配置
	AutoUpload        bool // 是否自动上传视频到对象存储
	DeleteAfterUpload bool // 上传后是否删除上游文件（不推荐）
}

var (
	globalConfig   *StorageConfig
	globalProvider StorageProvider
	configMutex    sync.RWMutex
)

// InitStorage 初始化对象存储服务（从环境变量或数据库加载配置）
func InitStorage() error {
	configMutex.Lock()
	defer configMutex.Unlock()

	// 首先尝试从数据库加载配置
	config := loadConfigFromOptions()
	
	// 如果数据库没有配置，则从环境变量加载
	if config.Type == "" {
		config = loadConfigFromEnv()
	}

	globalConfig = config

	if config.Type == "none" || config.Type == "" {
		common.SysLog("Object storage is disabled")
		globalProvider = nil
		return nil
	}

	var err error
	globalProvider, err = NewStorageProvider(config)
	if err != nil {
		return fmt.Errorf("failed to initialize storage provider: %w", err)
	}

	common.SysLog(fmt.Sprintf("Object storage initialized: type=%s, bucket=%s, endpoint=%s", config.Type, config.BucketName, config.Endpoint))
	return nil
}

// loadConfigFromOptions 从数据库 OptionMap 加载配置
func loadConfigFromOptions() *StorageConfig {
	common.OptionMapRWMutex.RLock()
	defer common.OptionMapRWMutex.RUnlock()

	config := &StorageConfig{}

	if v, ok := common.OptionMap[OptionKeyStorageType]; ok {
		config.Type = v
	}
	if v, ok := common.OptionMap[OptionKeyStorageEndpoint]; ok {
		config.Endpoint = v
	}
	if v, ok := common.OptionMap[OptionKeyStorageAccessKeyID]; ok {
		config.AccessKeyID = v
	}
	if v, ok := common.OptionMap[OptionKeyStorageAccessKeySecret]; ok {
		config.AccessKeySecret = v
	}
	if v, ok := common.OptionMap[OptionKeyStorageBucketName]; ok {
		config.BucketName = v
	}
	if v, ok := common.OptionMap[OptionKeyStorageRegion]; ok {
		config.Region = v
	}
	if v, ok := common.OptionMap[OptionKeyStorageUseSSL]; ok {
		config.UseSSL = v == "true"
	} else {
		config.UseSSL = true // 默认启用SSL
	}
	if v, ok := common.OptionMap[OptionKeyStorageBasePath]; ok {
		config.BasePath = v
	} else {
		config.BasePath = "videos/"
	}
	if v, ok := common.OptionMap[OptionKeyStorageDomain]; ok {
		config.Domain = v
	}
	if v, ok := common.OptionMap[OptionKeyStoragePresignedEnabled]; ok {
		config.PresignedURLEnabled = v == "true"
	}
	if v, ok := common.OptionMap[OptionKeyStoragePresignedExpires]; ok {
		if expires, err := strconv.ParseInt(v, 10, 64); err == nil {
			config.PresignedURLExpires = expires
		} else {
			config.PresignedURLExpires = 3600
		}
	} else {
		config.PresignedURLExpires = 3600
	}
	if v, ok := common.OptionMap[OptionKeyStorageAutoUpload]; ok {
		config.AutoUpload = v == "true"
	} else {
		config.AutoUpload = true
	}
	if v, ok := common.OptionMap[OptionKeyStorageDeleteAfterUpload]; ok {
		config.DeleteAfterUpload = v == "true"
	}

	return config
}

// loadConfigFromEnv 从环境变量加载配置（兼容旧版本）
func loadConfigFromEnv() *StorageConfig {
	storageType := common.GetEnvOrDefaultString("OBJECT_STORAGE_TYPE", "none")

	config := &StorageConfig{
		Type:                storageType,
		Endpoint:            common.GetEnvOrDefaultString("OBJECT_STORAGE_ENDPOINT", ""),
		AccessKeyID:         common.GetEnvOrDefaultString("OBJECT_STORAGE_ACCESS_KEY_ID", ""),
		AccessKeySecret:     common.GetEnvOrDefaultString("OBJECT_STORAGE_ACCESS_KEY_SECRET", ""),
		BucketName:          common.GetEnvOrDefaultString("OBJECT_STORAGE_BUCKET_NAME", ""),
		Region:              common.GetEnvOrDefaultString("OBJECT_STORAGE_REGION", ""),
		UseSSL:              common.GetEnvOrDefaultBool("OBJECT_STORAGE_USE_SSL", true),
		BasePath:            common.GetEnvOrDefaultString("OBJECT_STORAGE_BASE_PATH", "videos/"),
		Domain:              common.GetEnvOrDefaultString("OBJECT_STORAGE_DOMAIN", ""),
		PresignedURLEnabled: common.GetEnvOrDefaultBool("OBJECT_STORAGE_PRESIGNED_URL_ENABLED", false),
		PresignedURLExpires: int64(common.GetEnvOrDefault("OBJECT_STORAGE_PRESIGNED_URL_EXPIRES", 3600)),
		AutoUpload:          common.GetEnvOrDefaultBool("OBJECT_STORAGE_AUTO_UPLOAD", true),
		DeleteAfterUpload:   common.GetEnvOrDefaultBool("OBJECT_STORAGE_DELETE_AFTER_UPLOAD", false),
	}

	return config
}

// ReloadStorage 重新加载对象存储配置（当配置更新时调用）
func ReloadStorage() error {
	return InitStorage()
}

// TestStorageConnection 测试存储连接是否正常
func TestStorageConnection(config *StorageConfig) error {
	if config.Type == "none" || config.Type == "" {
		return fmt.Errorf("storage type is not configured")
	}

	provider, err := NewStorageProvider(config)
	if err != nil {
		return fmt.Errorf("failed to create storage provider: %w", err)
	}

	ctx := context.Background()

	// 对于 MinIO，使用 BucketExists 进行连接测试
	if config.Type == "minio" {
		if minioProvider, ok := provider.(*MinIOProvider); ok {
			exists, err := minioProvider.BucketExists(ctx)
			if err != nil {
				return fmt.Errorf("connection test failed: %w", err)
			}
			if !exists {
				return fmt.Errorf("bucket '%s' does not exist", config.BucketName)
			}
			return nil
		}
	}

	// 其他存储类型：尝试检查一个不存在的文件来验证连接
	_, err = provider.Exists(ctx, "__connection_test__")
	if err != nil {
		return fmt.Errorf("connection test failed: %w", err)
	}

	return nil
}

// GetStorageOptionKeys 获取所有对象存储相关的 option key
func GetStorageOptionKeys() []string {
	return []string{
		OptionKeyStorageType,
		OptionKeyStorageEndpoint,
		OptionKeyStorageAccessKeyID,
		OptionKeyStorageAccessKeySecret,
		OptionKeyStorageBucketName,
		OptionKeyStorageRegion,
		OptionKeyStorageUseSSL,
		OptionKeyStorageBasePath,
		OptionKeyStorageDomain,
		OptionKeyStoragePresignedEnabled,
		OptionKeyStoragePresignedExpires,
		OptionKeyStorageAutoUpload,
		OptionKeyStorageDeleteAfterUpload,
	}
}

// GetStorageProvider 获取存储提供者实例
func GetStorageProvider() StorageProvider {
	configMutex.RLock()
	defer configMutex.RUnlock()
	return globalProvider
}

// GetStorageConfig 获取存储配置
func GetStorageConfig() *StorageConfig {
	configMutex.RLock()
	defer configMutex.RUnlock()
	return globalConfig
}

// IsStorageEnabled 检查存储是否已启用
func IsStorageEnabled() bool {
	configMutex.RLock()
	defer configMutex.RUnlock()
	return globalConfig != nil && globalConfig.Type != "none" && globalProvider != nil
}

// NewStorageProvider 根据配置创建存储提供者
func NewStorageProvider(config *StorageConfig) (StorageProvider, error) {
	switch config.Type {
	case "oss":
		return NewOSSProvider(config)
	case "cos":
		return NewCOSProvider(config)
	case "s3":
		return NewS3Provider(config)
	case "minio":
		return NewMinIOProvider(config)
	default:
		return nil, fmt.Errorf("unsupported storage type: %s", config.Type)
	}
}

