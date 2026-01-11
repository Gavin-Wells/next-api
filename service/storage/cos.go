package storage

import (
	"context"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/tencentyun/cos-go-sdk-v5"
)

// COSProvider 腾讯云COS实现
type COSProvider struct {
	client *cos.Client
	config *StorageConfig
}

// NewCOSProvider 创建腾讯云COS提供者
func NewCOSProvider(config *StorageConfig) (*COSProvider, error) {
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

	// 构建COS URL
	scheme := "https"
	if !config.UseSSL {
		scheme = "http"
	}
	// 如果Region为空，尝试从Endpoint提取
	region := config.Region
	if region == "" && config.Endpoint != "" {
		// 从endpoint中提取region，例如：cos.ap-shanghai.myqcloud.com -> ap-shanghai
		parts := strings.Split(config.Endpoint, ".")
		for i, part := range parts {
			if part == "cos" && i+1 < len(parts) {
				region = parts[i+1]
				break
			}
		}
	}
	if region == "" {
		region = "ap-shanghai" // 默认区域
	}
	bucketURL := fmt.Sprintf("%s://%s.cos.%s.myqcloud.com", scheme, config.BucketName, region)

	client := cos.NewClient(&cos.BaseURL{BucketURL: bucketURL}, &cos.ClientOptions{
		SecretID:  config.AccessKeyID,
		SecretKey: config.AccessKeySecret,
	})

	return &COSProvider{
		client: client,
		config: config,
	}, nil
}

func (p *COSProvider) Upload(ctx context.Context, key string, reader io.Reader, size int64, contentType string) (string, error) {
	basePath := p.config.BasePath
	if basePath != "" && !strings.HasSuffix(basePath, "/") {
		basePath += "/"
	}
	objectKey := basePath + key

	opts := &cos.ObjectPutOptions{}
	if contentType != "" {
		opts.ObjectPutHeaderOptions = &cos.ObjectPutHeaderOptions{
			ContentType: contentType,
		}
	}

	_, err := p.client.Object.Put(ctx, objectKey, reader, opts)
	if err != nil {
		return "", fmt.Errorf("failed to upload to COS: %w", err)
	}

	return p.buildURL(objectKey), nil
}

func (p *COSProvider) GetURL(ctx context.Context, key string, expiresIn int64) (string, error) {
	basePath := p.config.BasePath
	if basePath != "" && !strings.HasSuffix(basePath, "/") {
		basePath += "/"
	}
	objectKey := basePath + key

	if p.config.PresignedURLEnabled && expiresIn != -1 {
		if expiresIn <= 0 {
			expiresIn = p.config.PresignedURLExpires
		}
		presignedURL, err := p.client.Object.GetPresignedURL(ctx, "GET", objectKey, p.config.AccessKeyID, p.config.AccessKeySecret, time.Duration(expiresIn)*time.Second, nil)
		if err != nil {
			return "", fmt.Errorf("failed to generate presigned URL: %w", err)
		}
		return presignedURL.String(), nil
	}

	return p.buildURL(objectKey), nil
}

func (p *COSProvider) Delete(ctx context.Context, key string) error {
	basePath := p.config.BasePath
	if basePath != "" && !strings.HasSuffix(basePath, "/") {
		basePath += "/"
	}
	objectKey := basePath + key
	_, err := p.client.Object.Delete(ctx, objectKey)
	return err
}

func (p *COSProvider) Exists(ctx context.Context, key string) (bool, error) {
	basePath := p.config.BasePath
	if basePath != "" && !strings.HasSuffix(basePath, "/") {
		basePath += "/"
	}
	objectKey := basePath + key
	return p.client.Object.IsExist(ctx, objectKey)
}

func (p *COSProvider) GetSize(ctx context.Context, key string) (int64, error) {
	basePath := p.config.BasePath
	if basePath != "" && !strings.HasSuffix(basePath, "/") {
		basePath += "/"
	}
	objectKey := basePath + key

	resp, err := p.client.Object.Head(ctx, objectKey, nil)
	if err != nil {
		return 0, fmt.Errorf("failed to get object meta: %w", err)
	}
	return resp.ContentLength, nil
}

func (p *COSProvider) GetProviderName() string {
	return "tencent-cos"
}

func (p *COSProvider) buildURL(objectKey string) string {
	if p.config.Domain != "" {
		domain := strings.TrimSuffix(p.config.Domain, "/")
		return fmt.Sprintf("%s/%s", domain, objectKey)
	}

	scheme := "https"
	if !p.config.UseSSL {
		scheme = "http"
	}

	region := p.config.Region
	if region == "" {
		region = "ap-shanghai" // 默认区域
	}

	return fmt.Sprintf("%s://%s.cos.%s.myqcloud.com/%s", scheme, p.config.BucketName, region, objectKey)
}

