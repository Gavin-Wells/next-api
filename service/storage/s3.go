package storage

import (
	"context"
	"errors"
	"fmt"
	"io"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	awsconfig "github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/aws-sdk-go-v2/service/s3/types"
)

// S3Provider AWS S3实现
type S3Provider struct {
	client *s3.Client
	config *StorageConfig
}

// NewS3Provider 创建AWS S3提供者
func NewS3Provider(config *StorageConfig) (*S3Provider, error) {
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
	if config.Region == "" {
		config.Region = "us-east-1" // 默认区域
	}

	cfg, err := awsconfig.LoadDefaultConfig(context.Background(),
		awsconfig.WithRegion(config.Region),
		awsconfig.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(
			config.AccessKeyID,
			config.AccessKeySecret,
			"",
		)),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to load AWS config: %w", err)
	}

	clientOptions := []func(*s3.Options){
		func(o *s3.Options) {
			// 如果提供了自定义endpoint（非AWS标准），需要配置
			if config.Endpoint != "" && !strings.Contains(config.Endpoint, "amazonaws.com") {
				o.BaseEndpoint = aws.String(config.Endpoint)
				o.UsePathStyle = true // 使用路径风格URL
			}
		},
	}

	client := s3.NewFromConfig(cfg, clientOptions...)

	return &S3Provider{
		client: client,
		config: config,
	}, nil
}

func (p *S3Provider) Upload(ctx context.Context, key string, reader io.Reader, size int64, contentType string) (string, error) {
	basePath := p.config.BasePath
	if basePath != "" && !strings.HasSuffix(basePath, "/") {
		basePath += "/"
	}
	objectKey := basePath + key

	input := &s3.PutObjectInput{
		Bucket:      aws.String(p.config.BucketName),
		Key:         aws.String(objectKey),
		Body:        reader,
		ContentType: aws.String(contentType),
	}

	_, err := p.client.PutObject(ctx, input)
	if err != nil {
		return "", fmt.Errorf("failed to upload to S3: %w", err)
	}

	return p.buildURL(objectKey), nil
}

func (p *S3Provider) GetURL(ctx context.Context, key string, expiresIn int64) (string, error) {
	basePath := p.config.BasePath
	if basePath != "" && !strings.HasSuffix(basePath, "/") {
		basePath += "/"
	}
	objectKey := basePath + key

	if p.config.PresignedURLEnabled && expiresIn != -1 {
		if expiresIn <= 0 {
			expiresIn = p.config.PresignedURLExpires
		}

		presignClient := s3.NewPresignClient(p.client)
		request, err := presignClient.PresignGetObject(ctx, &s3.GetObjectInput{
			Bucket: aws.String(p.config.BucketName),
			Key:    aws.String(objectKey),
		}, func(opts *s3.PresignOptions) {
			opts.Expires = time.Duration(expiresIn) * time.Second
		})
		if err != nil {
			return "", fmt.Errorf("failed to generate presigned URL: %w", err)
		}
		return request.URL, nil
	}

	return p.buildURL(objectKey), nil
}

func (p *S3Provider) Delete(ctx context.Context, key string) error {
	basePath := p.config.BasePath
	if basePath != "" && !strings.HasSuffix(basePath, "/") {
		basePath += "/"
	}
	objectKey := basePath + key

	_, err := p.client.DeleteObject(ctx, &s3.DeleteObjectInput{
		Bucket: aws.String(p.config.BucketName),
		Key:    aws.String(objectKey),
	})
	return err
}

func (p *S3Provider) Exists(ctx context.Context, key string) (bool, error) {
	basePath := p.config.BasePath
	if basePath != "" && !strings.HasSuffix(basePath, "/") {
		basePath += "/"
	}
	objectKey := basePath + key

	_, err := p.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(p.config.BucketName),
		Key:    aws.String(objectKey),
	})
	if err != nil {
		// 检查是否是NoSuchKey错误
		var noSuchKey *types.NoSuchKey
		if errors.As(err, &noSuchKey) {
			return false, nil
		}
		// 检查是否是NotFound错误
		if strings.Contains(err.Error(), "NoSuchKey") || strings.Contains(err.Error(), "NotFound") {
			return false, nil
		}
		return false, err
	}
	return true, nil
}

func (p *S3Provider) GetSize(ctx context.Context, key string) (int64, error) {
	basePath := p.config.BasePath
	if basePath != "" && !strings.HasSuffix(basePath, "/") {
		basePath += "/"
	}
	objectKey := basePath + key

	resp, err := p.client.HeadObject(ctx, &s3.HeadObjectInput{
		Bucket: aws.String(p.config.BucketName),
		Key:    aws.String(objectKey),
	})
	if err != nil {
		return 0, fmt.Errorf("failed to get object meta: %w", err)
	}
	return *resp.ContentLength, nil
}

func (p *S3Provider) GetProviderName() string {
	return "aws-s3"
}

func (p *S3Provider) buildURL(objectKey string) string {
	if p.config.Domain != "" {
		domain := strings.TrimSuffix(p.config.Domain, "/")
		return fmt.Sprintf("%s/%s", domain, objectKey)
	}

	scheme := "https"
	if !p.config.UseSSL {
		scheme = "http"
	}

	// 处理AWS S3标准URL
	endpoint := strings.TrimPrefix(p.config.Endpoint, "https://")
	endpoint = strings.TrimPrefix(endpoint, "http://")

	if strings.Contains(endpoint, "amazonaws.com") {
		region := p.config.Region
		if region == "" {
			region = "us-east-1"
		}
		return fmt.Sprintf("%s://%s.s3.%s.amazonaws.com/%s", scheme, p.config.BucketName, region, objectKey)
	}

	// 自定义endpoint（如MinIO兼容S3）
	if endpoint != "" {
		return fmt.Sprintf("%s://%s/%s/%s", scheme, endpoint, p.config.BucketName, objectKey)
	}

	// 默认格式
	region := p.config.Region
	if region == "" {
		region = "us-east-1"
	}
	return fmt.Sprintf("%s://%s.s3.%s.amazonaws.com/%s", scheme, p.config.BucketName, region, objectKey)
}

