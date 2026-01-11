package storage

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"path/filepath"
	"strings"
	"time"

	"github.com/QuantumNous/new-api/common"
	"github.com/QuantumNous/new-api/logger"
	"github.com/QuantumNous/new-api/service"
)

// UploadVideoFromURL 从URL下载视频并上传到对象存储
func UploadVideoFromURL(ctx context.Context, videoURL string, taskID string) (string, error) {
	if !IsStorageEnabled() {
		return "", fmt.Errorf("object storage is not enabled")
	}

	provider := GetStorageProvider()
	if provider == nil {
		return "", fmt.Errorf("storage provider is not initialized")
	}

	// 1. 下载视频
	resp, err := service.DoDownloadRequest(videoURL, "upload_to_oss")
	if err != nil {
		return "", fmt.Errorf("failed to download video: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("failed to download video, status: %d", resp.StatusCode)
	}

	// 2. 生成存储key（路径格式：YYYY/MM/DD/taskID.ext）
	ext := filepath.Ext(videoURL)
	contentType := resp.Header.Get("Content-Type")
	
	if ext == "" {
		// 尝试从Content-Type推断
		if strings.Contains(contentType, "mp4") {
			ext = ".mp4"
		} else if strings.Contains(contentType, "webm") {
			ext = ".webm"
		} else {
			ext = ".mp4" // 默认扩展名
		}
	}
	// 清理扩展名，移除查询参数
	if idx := strings.Index(ext, "?"); idx != -1 {
		ext = ext[:idx]
	}

	storageKey := fmt.Sprintf("%s/%s%s",
		time.Now().Format("2006/01/02"),
		taskID,
		ext)

	// 3. 处理Content-Type
	if contentType == "" {
		contentType = "video/mp4"
	}
	// 清理Content-Type参数
	if idx := strings.Index(contentType, ";"); idx != -1 {
		contentType = contentType[:idx]
	}

	// 4. 上传到对象存储
	storageURL, err := provider.Upload(ctx, storageKey, resp.Body, resp.ContentLength, contentType)
	if err != nil {
		return "", fmt.Errorf("failed to upload to object storage: %w", err)
	}

	logger.LogInfo(ctx, fmt.Sprintf("Video uploaded to object storage: %s -> %s", videoURL, storageURL))

	return storageURL, nil
}

// GetVideoURLFromTask 从任务中获取视频URL（优先对象存储URL）
func GetVideoURLFromTask(ctx context.Context, taskID string, originalURL string, taskData map[string]interface{}) string {
	if !IsStorageEnabled() {
		return originalURL
	}

	// 从taskData中获取对象存储URL
	if taskData != nil {
		if storageURL, ok := taskData["storage_url"].(string); ok && storageURL != "" {
			logger.LogDebug(ctx, fmt.Sprintf("Using object storage URL for task %s: %s", taskID, storageURL))
			return storageURL
		}
	}

	// 回退到原始URL
	return originalURL
}

// GetVideoStorageKey 根据taskID和原始URL生成对象存储key
func GetVideoStorageKey(taskID string, originalURL string) string {
	ext := filepath.Ext(originalURL)
	if ext == "" {
		ext = ".mp4"
	}
	// 清理扩展名
	if idx := strings.Index(ext, "?"); idx != -1 {
		ext = ext[:idx]
	}
	return fmt.Sprintf("%s/%s%s",
		time.Now().Format("2006/01/02"),
		taskID,
		ext)
}

