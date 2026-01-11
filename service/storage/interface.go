package storage

import (
	"context"
	"io"
)

// StorageProvider 存储提供者接口
type StorageProvider interface {
	// Upload 上传文件到OSS
	// key: 存储路径（不包含BasePath前缀，会自动添加）
	// reader: 文件内容
	// size: 文件大小（-1表示未知）
	// contentType: 文件MIME类型
	// 返回: 文件的访问URL
	Upload(ctx context.Context, key string, reader io.Reader, size int64, contentType string) (string, error)

	// GetURL 获取文件的访问URL
	// key: 存储路径
	// expiresIn: 签名URL过期时间（秒），0表示使用默认配置，-1表示不使用签名URL
	// 返回: 文件的访问URL
	GetURL(ctx context.Context, key string, expiresIn int64) (string, error)

	// Delete 删除文件
	Delete(ctx context.Context, key string) error

	// Exists 检查文件是否存在
	Exists(ctx context.Context, key string) (bool, error)

	// GetSize 获取文件大小
	GetSize(ctx context.Context, key string) (int64, error)

	// GetProviderName 获取存储提供者名称
	GetProviderName() string
}

