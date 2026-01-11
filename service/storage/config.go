package storage

import (
	"fmt"
	"sync"

	"github.com/QuantumNous/new-api/common"
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

// InitStorage 初始化对象存储服务
func InitStorage() error {
	configMutex.Lock()
	defer configMutex.Unlock()

	storageType := common.GetEnvOrDefaultString("OBJECT_STORAGE_TYPE", "none")
	
	config := &StorageConfig{
		Type:                storageType,
		UseSSL:              common.GetEnvOrDefaultBool("OBJECT_STORAGE_USE_SSL", true),
		BasePath:            common.GetEnvOrDefaultString("OBJECT_STORAGE_BASE_PATH", "videos/"),
		Domain:              common.GetEnvOrDefaultString("OBJECT_STORAGE_DOMAIN", ""),
		PresignedURLEnabled: common.GetEnvOrDefaultBool("OBJECT_STORAGE_PRESIGNED_URL_ENABLED", false),
		PresignedURLExpires: int64(common.GetEnvOrDefault("OBJECT_STORAGE_PRESIGNED_URL_EXPIRES", 3600)),
		AutoUpload:          common.GetEnvOrDefaultBool("OBJECT_STORAGE_AUTO_UPLOAD", true),
		DeleteAfterUpload:   common.GetEnvOrDefaultBool("OBJECT_STORAGE_DELETE_AFTER_UPLOAD", false),
	}

	// 根据存储类型读取对应的配置
	switch storageType {
	case "oss":
		// 阿里云 OSS 配置
		config.Endpoint = common.GetEnvOrDefaultString("OBJECT_STORAGE_ENDPOINT", "")
		config.AccessKeyID = common.GetEnvOrDefaultString("OBJECT_STORAGE_ACCESS_KEY_ID", "")
		config.AccessKeySecret = common.GetEnvOrDefaultString("OBJECT_STORAGE_ACCESS_KEY_SECRET", "")
		config.BucketName = common.GetEnvOrDefaultString("OBJECT_STORAGE_BUCKET_NAME", "")
		config.Region = common.GetEnvOrDefaultString("OBJECT_STORAGE_REGION", "")
	case "cos":
		// 腾讯云 COS 配置
		config.Endpoint = common.GetEnvOrDefaultString("OBJECT_STORAGE_ENDPOINT", "")
		config.AccessKeyID = common.GetEnvOrDefaultString("OBJECT_STORAGE_ACCESS_KEY_ID", "")
		config.AccessKeySecret = common.GetEnvOrDefaultString("OBJECT_STORAGE_ACCESS_KEY_SECRET", "")
		config.BucketName = common.GetEnvOrDefaultString("OBJECT_STORAGE_BUCKET_NAME", "")
		config.Region = common.GetEnvOrDefaultString("OBJECT_STORAGE_REGION", "")
	case "s3":
		// AWS S3 配置
		config.Endpoint = common.GetEnvOrDefaultString("OBJECT_STORAGE_ENDPOINT", "")
		config.AccessKeyID = common.GetEnvOrDefaultString("OBJECT_STORAGE_ACCESS_KEY_ID", "")
		config.AccessKeySecret = common.GetEnvOrDefaultString("OBJECT_STORAGE_ACCESS_KEY_SECRET", "")
		config.BucketName = common.GetEnvOrDefaultString("OBJECT_STORAGE_BUCKET_NAME", "")
		config.Region = common.GetEnvOrDefaultString("OBJECT_STORAGE_REGION", "us-east-1")
	case "minio":
		// MinIO 配置
		config.Endpoint = common.GetEnvOrDefaultString("OBJECT_STORAGE_ENDPOINT", "")
		config.AccessKeyID = common.GetEnvOrDefaultString("OBJECT_STORAGE_ACCESS_KEY_ID", "")
		config.AccessKeySecret = common.GetEnvOrDefaultString("OBJECT_STORAGE_ACCESS_KEY_SECRET", "")
		config.BucketName = common.GetEnvOrDefaultString("OBJECT_STORAGE_BUCKET_NAME", "")
		config.Region = common.GetEnvOrDefaultString("OBJECT_STORAGE_REGION", "")
	}

	globalConfig = config

	if config.Type == "none" || config.Type == "" {
		common.SysLog("Object storage is disabled (OBJECT_STORAGE_TYPE=none)")
		return nil // 未启用对象存储
	}

	var err error
	globalProvider, err = NewStorageProvider(config)
	if err != nil {
		return fmt.Errorf("failed to initialize storage provider: %w", err)
	}

	common.SysLog(fmt.Sprintf("Object storage initialized: type=%s, bucket=%s, endpoint=%s", config.Type, config.BucketName, config.Endpoint))
	return nil
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

