package storage

import (
	"context"
	"fmt"
	"io"
	"strings"

	"github.com/aliyun/aliyun-oss-go-sdk/oss"
)

// OSSProvider 阿里云OSS实现
type OSSProvider struct {
	client *oss.Client
	bucket *oss.Bucket
	config *StorageConfig
}

// NewOSSProvider 创建阿里云OSS提供者
func NewOSSProvider(config *StorageConfig) (*OSSProvider, error) {
	if config.Endpoint == "" {
		return nil, fmt.Errorf("OBJECT_STORAGE_ENDPOINT is required")
	}
	if config.AccessKeyID == "" {
		return nil, fmt.Errorf("OBJECT_STORAGE_ACCESS_KEY_ID is required")
	}
	if config.AccessKeySecret == "" {
		return nil, fmt.Errorf("OBJECT_STORAGE_ACCESS_KEY_SECRET is required")
	}
	if config.BucketName == "" {
		return nil, fmt.Errorf("OBJECT_STORAGE_BUCKET_NAME is required")
	}

	// 创建OSS客户端
	client, err := oss.New(config.Endpoint, config.AccessKeyID, config.AccessKeySecret)
	if err != nil {
		return nil, fmt.Errorf("failed to create OSS client: %w", err)
	}

	// 获取Bucket
	bucket, err := client.Bucket(config.BucketName)
	if err != nil {
		return nil, fmt.Errorf("failed to get bucket %s: %w", config.BucketName, err)
	}

	return &OSSProvider{
		client: client,
		bucket: bucket,
		config: config,
	}, nil
}

// Upload 上传文件到OSS
func (p *OSSProvider) Upload(ctx context.Context, key string, reader io.Reader, size int64, contentType string) (string, error) {
	// 确保BasePath以/结尾
	basePath := p.config.BasePath
	if basePath != "" && !strings.HasSuffix(basePath, "/") {
		basePath += "/"
	}
	objectKey := basePath + key

	// 准备上传选项
	options := []oss.Option{}
	if contentType != "" {
		options = append(options, oss.ContentType(contentType))
	}

	// 执行上传
	err := p.bucket.PutObject(objectKey, reader, options...)
	if err != nil {
		return "", fmt.Errorf("failed to upload to OSS: %w", err)
	}

	// 构建URL
	return p.buildURL(objectKey, -1), nil
}

// GetURL 获取文件的访问URL
func (p *OSSProvider) GetURL(ctx context.Context, key string, expiresIn int64) (string, error) {
	basePath := p.config.BasePath
	if basePath != "" && !strings.HasSuffix(basePath, "/") {
		basePath += "/"
	}
	objectKey := basePath + key

	// 如果需要签名URL
	if p.config.PresignedURLEnabled && expiresIn != -1 {
		if expiresIn <= 0 {
			expiresIn = p.config.PresignedURLExpires
		}
		signedURL, err := p.bucket.SignURL(objectKey, oss.HTTPGet, expiresIn)
		if err != nil {
			return "", fmt.Errorf("failed to generate signed URL: %w", err)
		}
		return signedURL, nil
	}

	// 返回普通URL
	return p.buildURL(objectKey, expiresIn), nil
}

// Delete 删除文件
func (p *OSSProvider) Delete(ctx context.Context, key string) error {
	basePath := p.config.BasePath
	if basePath != "" && !strings.HasSuffix(basePath, "/") {
		basePath += "/"
	}
	objectKey := basePath + key
	return p.bucket.DeleteObject(objectKey)
}

// Exists 检查文件是否存在
func (p *OSSProvider) Exists(ctx context.Context, key string) (bool, error) {
	basePath := p.config.BasePath
	if basePath != "" && !strings.HasSuffix(basePath, "/") {
		basePath += "/"
	}
	objectKey := basePath + key
	return p.bucket.IsObjectExist(objectKey)
}

// GetSize 获取文件大小
func (p *OSSProvider) GetSize(ctx context.Context, key string) (int64, error) {
	basePath := p.config.BasePath
	if basePath != "" && !strings.HasSuffix(basePath, "/") {
		basePath += "/"
	}
	objectKey := basePath + key

	props, err := p.bucket.GetObjectMeta(objectKey)
	if err != nil {
		return 0, fmt.Errorf("failed to get object meta: %w", err)
	}
	contentLengthStr := props.Get("Content-Length")
	if contentLengthStr == "" {
		return 0, fmt.Errorf("Content-Length header not found")
	}
	var contentLength int64
	fmt.Sscanf(contentLengthStr, "%d", &contentLength)
	return contentLength, nil
}

// GetProviderName 获取提供者名称
func (p *OSSProvider) GetProviderName() string {
	return "aliyun-oss"
}

// buildURL 构建文件访问URL
func (p *OSSProvider) buildURL(objectKey string, expiresIn int64) string {
	// 如果配置了自定义域名（CDN）
	if p.config.Domain != "" {
		domain := strings.TrimSuffix(p.config.Domain, "/")
		return fmt.Sprintf("%s/%s", domain, objectKey)
	}

	// 构建OSS标准URL
	scheme := "https"
	if !p.config.UseSSL {
		scheme = "http"
	}

	// 处理endpoint格式：oss-cn-hangzhou.aliyuncs.com
	endpoint := strings.TrimPrefix(p.config.Endpoint, "https://")
	endpoint = strings.TrimPrefix(endpoint, "http://")

	return fmt.Sprintf("%s://%s.%s/%s", scheme, p.config.BucketName, endpoint, objectKey)
}

