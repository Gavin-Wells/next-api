package storage

import (
	"context"
	"crypto/tls"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/minio/minio-go/v7"
	"github.com/minio/minio-go/v7/pkg/credentials"
)

// MinIOProvider MinIO实现
type MinIOProvider struct {
	client *minio.Client
	config *StorageConfig
}

// NewMinIOProvider 创建MinIO提供者
func NewMinIOProvider(config *StorageConfig) (*MinIOProvider, error) {
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

	// 解析endpoint（可能包含端口）
	endpoint := strings.TrimPrefix(config.Endpoint, "https://")
	endpoint = strings.TrimPrefix(endpoint, "http://")

	options := &minio.Options{
		Creds:  credentials.NewStaticV4(config.AccessKeyID, config.AccessKeySecret, ""),
		Secure: config.UseSSL,
	}

	// 如果使用 HTTPS，配置允许跳过证书验证（用于自签名证书）
	if config.UseSSL {
		options.Transport = &http.Transport{
			TLSClientConfig: &tls.Config{
				InsecureSkipVerify: true, // 允许自签名证书
			},
		}
	}

	client, err := minio.New(endpoint, options)
	if err != nil {
		return nil, fmt.Errorf("failed to create MinIO client: %w", err)
	}

	return &MinIOProvider{
		client: client,
		config: config,
	}, nil
}

func (p *MinIOProvider) Upload(ctx context.Context, key string, reader io.Reader, size int64, contentType string) (string, error) {
	basePath := p.config.BasePath
	if basePath != "" && !strings.HasSuffix(basePath, "/") {
		basePath += "/"
	}
	objectKey := basePath + key

	options := minio.PutObjectOptions{}
	if contentType != "" {
		options.ContentType = contentType
	}

	_, err := p.client.PutObject(ctx, p.config.BucketName, objectKey, reader, size, options)
	if err != nil {
		return "", fmt.Errorf("failed to upload to MinIO: %w", err)
	}

	return p.buildURL(objectKey), nil
}

func (p *MinIOProvider) GetURL(ctx context.Context, key string, expiresIn int64) (string, error) {
	basePath := p.config.BasePath
	if basePath != "" && !strings.HasSuffix(basePath, "/") {
		basePath += "/"
	}
	objectKey := basePath + key

	if p.config.PresignedURLEnabled && expiresIn != -1 {
		if expiresIn <= 0 {
			expiresIn = p.config.PresignedURLExpires
		}
		presignedURL, err := p.client.PresignedGetObject(ctx, p.config.BucketName, objectKey, time.Duration(expiresIn)*time.Second, nil)
		if err != nil {
			return "", fmt.Errorf("failed to generate presigned URL: %w", err)
		}
		return presignedURL.String(), nil
	}

	return p.buildURL(objectKey), nil
}

func (p *MinIOProvider) Delete(ctx context.Context, key string) error {
	basePath := p.config.BasePath
	if basePath != "" && !strings.HasSuffix(basePath, "/") {
		basePath += "/"
	}
	objectKey := basePath + key
	return p.client.RemoveObject(ctx, p.config.BucketName, objectKey, minio.RemoveObjectOptions{})
}

func (p *MinIOProvider) Exists(ctx context.Context, key string) (bool, error) {
	basePath := p.config.BasePath
	if basePath != "" && !strings.HasSuffix(basePath, "/") {
		basePath += "/"
	}
	objectKey := basePath + key

	_, err := p.client.StatObject(ctx, p.config.BucketName, objectKey, minio.StatObjectOptions{})
	if err != nil {
		errResp := minio.ToErrorResponse(err)
		// 对象不存在不是错误
		if errResp.Code == "NoSuchKey" || strings.Contains(err.Error(), "does not exist") {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

// BucketExists 检查存储桶是否存在（用于连接测试）
func (p *MinIOProvider) BucketExists(ctx context.Context) (bool, error) {
	return p.client.BucketExists(ctx, p.config.BucketName)
}

func (p *MinIOProvider) GetSize(ctx context.Context, key string) (int64, error) {
	basePath := p.config.BasePath
	if basePath != "" && !strings.HasSuffix(basePath, "/") {
		basePath += "/"
	}
	objectKey := basePath + key

	stat, err := p.client.StatObject(ctx, p.config.BucketName, objectKey, minio.StatObjectOptions{})
	if err != nil {
		return 0, fmt.Errorf("failed to get object stat: %w", err)
	}
	return stat.Size, nil
}

func (p *MinIOProvider) GetProviderName() string {
	return "minio"
}

func (p *MinIOProvider) buildURL(objectKey string) string {
	if p.config.Domain != "" {
		domain := strings.TrimSuffix(p.config.Domain, "/")
		return fmt.Sprintf("%s/%s", domain, objectKey)
	}

	scheme := "https"
	if !p.config.UseSSL {
		scheme = "http"
	}

	endpoint := strings.TrimPrefix(p.config.Endpoint, "https://")
	endpoint = strings.TrimPrefix(endpoint, "http://")

	return fmt.Sprintf("%s://%s/%s/%s", scheme, endpoint, p.config.BucketName, objectKey)
}

