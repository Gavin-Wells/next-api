/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useEffect, useState } from 'react';
import {
  Card,
  Form,
  Row,
  Col,
  Typography,
  Banner,
  Tag,
  Space,
  Button,
  Spin,
  Divider,
} from '@douyinfe/semi-ui';
const { Text, Title } = Typography;
import { API, showError, showSuccess } from '../../helpers';
import { useTranslation } from 'react-i18next';
import { Copy, CheckCircle2, XCircle, RefreshCw } from 'lucide-react';

const ObjectStorageSetting = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [storageStatus, setStorageStatus] = useState(null);
  const [copiedField, setCopiedField] = useState('');

  const getStorageStatus = async () => {
    setLoading(true);
    try {
      // 尝试从后端获取对象存储状态（如果后端支持）
      // 这里假设后端可能有一个状态接口，如果没有则显示配置说明
      const res = await API.get('/api/status');
      if (res.data.success && res.data.data) {
        // 如果后端返回了对象存储状态信息
        setStorageStatus(res.data.data.object_storage || null);
      }
    } catch (error) {
      // 如果接口不存在或出错，忽略错误，只显示配置说明
      console.log('Storage status API not available');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getStorageStatus();
  }, []);

  const copyToClipboard = (text, fieldName) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopiedField(fieldName);
        showSuccess(t('已复制到剪贴板'));
        setTimeout(() => setCopiedField(''), 2000);
      },
      () => {
        showError(t('复制失败'));
      },
    );
  };

  const configExamples = {
    oss: {
      type: 'oss',
      name: '阿里云 OSS',
      config: `OBJECT_STORAGE_TYPE=oss
OBJECT_STORAGE_ENDPOINT=oss-cn-hangzhou.aliyuncs.com
OBJECT_STORAGE_ACCESS_KEY_ID=your_access_key_id
OBJECT_STORAGE_ACCESS_KEY_SECRET=your_access_key_secret
OBJECT_STORAGE_BUCKET_NAME=your-bucket-name
OBJECT_STORAGE_REGION=cn-hangzhou
OBJECT_STORAGE_USE_SSL=true
OBJECT_STORAGE_BASE_PATH=videos/
OBJECT_STORAGE_AUTO_UPLOAD=true`,
    },
    cos: {
      type: 'cos',
      name: '腾讯云 COS',
      config: `OBJECT_STORAGE_TYPE=cos
OBJECT_STORAGE_ENDPOINT=cos.ap-shanghai.myqcloud.com
OBJECT_STORAGE_ACCESS_KEY_ID=your_secret_id
OBJECT_STORAGE_ACCESS_KEY_SECRET=your_secret_key
OBJECT_STORAGE_BUCKET_NAME=your-bucket-name-1234567890
OBJECT_STORAGE_REGION=ap-shanghai
OBJECT_STORAGE_USE_SSL=true
OBJECT_STORAGE_BASE_PATH=videos/
OBJECT_STORAGE_AUTO_UPLOAD=true`,
    },
    s3: {
      type: 's3',
      name: 'AWS S3',
      config: `OBJECT_STORAGE_TYPE=s3
OBJECT_STORAGE_ENDPOINT=s3.amazonaws.com
OBJECT_STORAGE_ACCESS_KEY_ID=your_access_key_id
OBJECT_STORAGE_ACCESS_KEY_SECRET=your_secret_access_key
OBJECT_STORAGE_BUCKET_NAME=your-bucket-name
OBJECT_STORAGE_REGION=us-east-1
OBJECT_STORAGE_USE_SSL=true
OBJECT_STORAGE_BASE_PATH=videos/
OBJECT_STORAGE_AUTO_UPLOAD=true`,
    },
    minio: {
      type: 'minio',
      name: 'MinIO',
      config: `OBJECT_STORAGE_TYPE=minio
OBJECT_STORAGE_ENDPOINT=minio.example.com:9000
OBJECT_STORAGE_ACCESS_KEY_ID=your_minio_access_key
OBJECT_STORAGE_ACCESS_KEY_SECRET=your_minio_secret_key
OBJECT_STORAGE_BUCKET_NAME=your-bucket-name
OBJECT_STORAGE_REGION=
OBJECT_STORAGE_USE_SSL=false
OBJECT_STORAGE_BASE_PATH=videos/
OBJECT_STORAGE_AUTO_UPLOAD=true`,
    },
  };

  return (
    <Row>
      <Col span={24} style={{ marginTop: '10px' }}>
        <Spin spinning={loading}>
          {/* 状态信息 */}
          {storageStatus && (
            <Card style={{ marginBottom: '20px' }}>
              <Form.Section text={t('当前配置状态')}>
                <Space vertical align="start" spacing="loose">
                  <div>
                    <Text strong>{t('存储类型')}: </Text>
                    <Tag color={storageStatus.enabled ? 'green' : 'grey'}>
                      {storageStatus.type || t('未配置')}
                    </Tag>
                  </div>
                  {storageStatus.enabled && (
                    <>
                      <div>
                        <Text strong>{t('存储桶')}: </Text>
                        <Text>{storageStatus.bucket || '-'}</Text>
                      </div>
                      <div>
                        <Text strong>{t('端点')}: </Text>
                        <Text>{storageStatus.endpoint || '-'}</Text>
                      </div>
                      <div>
                        <Text strong>{t('状态')}: </Text>
                        {storageStatus.enabled ? (
                          <Tag color="green" icon={<CheckCircle2 size={14} />}>
                            {t('已启用')}
                          </Tag>
                        ) : (
                          <Tag color="red" icon={<XCircle size={14} />}>
                            {t('未启用')}
                          </Tag>
                        )}
                      </div>
                    </>
                  )}
                </Space>
              </Form.Section>
            </Card>
          )}

          {/* 配置说明 */}
          <Card>
            <Form.Section text={t('对象存储配置说明')}>
              <Banner
                type="info"
                description={t(
                  '对象存储配置通过环境变量设置。请在 .env 文件或系统环境变量中配置以下变量，然后重启服务使配置生效。',
                )}
                style={{ marginBottom: '20px' }}
              />

              <Space vertical align="start" spacing="loose" style={{ width: '100%' }}>
                <div style={{ width: '100%' }}>
                  <Title heading={5}>{t('基础配置')}</Title>
                  <div style={{ marginTop: '10px' }}>
                    <Text code>OBJECT_STORAGE_TYPE</Text>
                    <Text type="secondary" style={{ marginLeft: '10px' }}>
                      {t('存储类型：none(禁用), oss(阿里云), cos(腾讯云), s3(AWS S3), minio(MinIO)')}
                    </Text>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <Text code>OBJECT_STORAGE_ENDPOINT</Text>
                    <Text type="secondary" style={{ marginLeft: '10px' }}>
                      {t('存储端点地址')}
                    </Text>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <Text code>OBJECT_STORAGE_ACCESS_KEY_ID</Text>
                    <Text type="secondary" style={{ marginLeft: '10px' }}>
                      {t('AccessKey ID')}
                    </Text>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <Text code>OBJECT_STORAGE_ACCESS_KEY_SECRET</Text>
                    <Text type="secondary" style={{ marginLeft: '10px' }}>
                      {t('AccessKey Secret')}
                    </Text>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <Text code>OBJECT_STORAGE_BUCKET_NAME</Text>
                    <Text type="secondary" style={{ marginLeft: '10px' }}>
                      {t('存储桶名称')}
                    </Text>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <Text code>OBJECT_STORAGE_REGION</Text>
                    <Text type="secondary" style={{ marginLeft: '10px' }}>
                      {t('区域（Region）')}
                    </Text>
                  </div>
                </div>

                <Divider />

                <div style={{ width: '100%' }}>
                  <Title heading={5}>{t('高级配置')}</Title>
                  <div style={{ marginTop: '10px' }}>
                    <Text code>OBJECT_STORAGE_USE_SSL</Text>
                    <Text type="secondary" style={{ marginLeft: '10px' }}>
                      {t('是否使用HTTPS（默认: true）')}
                    </Text>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <Text code>OBJECT_STORAGE_BASE_PATH</Text>
                    <Text type="secondary" style={{ marginLeft: '10px' }}>
                      {t('基础路径前缀（默认: videos/）')}
                    </Text>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <Text code>OBJECT_STORAGE_DOMAIN</Text>
                    <Text type="secondary" style={{ marginLeft: '10px' }}>
                      {t('自定义域名（CDN，可选）')}
                    </Text>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <Text code>OBJECT_STORAGE_AUTO_UPLOAD</Text>
                    <Text type="secondary" style={{ marginLeft: '10px' }}>
                      {t('是否自动上传视频（默认: true）')}
                    </Text>
                  </div>
                  <div style={{ marginTop: '10px' }}>
                    <Text code>OBJECT_STORAGE_PRESIGNED_URL_ENABLED</Text>
                    <Text type="secondary" style={{ marginLeft: '10px' }}>
                      {t('是否启用签名URL（私有存储桶，默认: false）')}
                    </Text>
                  </div>
                </div>
              </Space>
            </Form.Section>
          </Card>

          {/* 配置示例 */}
          <Card style={{ marginTop: '20px' }}>
            <Form.Section text={t('配置示例')}>
              <Space vertical align="start" spacing="loose" style={{ width: '100%' }}>
                {Object.values(configExamples).map((example) => (
                  <div key={example.type} style={{ width: '100%' }}>
                    <div style={{ marginBottom: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Title heading={6}>{example.name}</Title>
                      <Button
                        icon={copiedField === example.type ? <CheckCircle2 size={14} /> : <Copy size={14} />}
                        onClick={() => copyToClipboard(example.config, example.type)}
                        size="small"
                      >
                        {copiedField === example.type ? t('已复制') : t('复制')}
                      </Button>
                    </div>
                    <div
                      style={{
                        backgroundColor: '#f5f5f5',
                        padding: '15px',
                        borderRadius: '4px',
                        fontFamily: 'monospace',
                        fontSize: '12px',
                        whiteSpace: 'pre-wrap',
                        wordBreak: 'break-all',
                        overflow: 'auto',
                        maxHeight: '300px',
                      }}
                    >
                      {example.config}
                    </div>
                  </div>
                ))}
              </Space>
            </Form.Section>
          </Card>

          {/* 功能说明 */}
          <Card style={{ marginTop: '20px' }}>
            <Form.Section text={t('功能说明')}>
              <Space vertical align="start" spacing="loose">
                <div>
                  <Text strong>{t('自动上传')}</Text>
                  <Text type="secondary" style={{ display: 'block', marginTop: '5px' }}>
                    {t('当视频任务完成时，系统会自动将视频从上游服务下载并上传到对象存储。上传后的URL会保存在任务的Data字段中。')}
                  </Text>
                </div>
                <div>
                  <Text strong>{t('视频代理')}</Text>
                  <Text type="secondary" style={{ display: 'block', marginTop: '5px' }}>
                    {t('视频代理接口会优先使用对象存储URL。如果配置了自定义域名（CDN），会直接重定向到对象存储URL。')}
                  </Text>
                </div>
                <div>
                  <Text strong>{t('存储路径')}</Text>
                  <Text type="secondary" style={{ display: 'block', marginTop: '5px' }}>
                    {t('视频文件的存储路径格式为：{BASE_PATH}{YYYY/MM/DD}/{task_id}.{ext}')}
                  </Text>
                </div>
              </Space>
            </Form.Section>
          </Card>

          {/* 刷新按钮 */}
          <div style={{ marginTop: '20px', textAlign: 'right' }}>
            <Button
              icon={<RefreshCw size={14} />}
              onClick={getStorageStatus}
              loading={loading}
            >
              {t('刷新状态')}
            </Button>
          </div>
        </Spin>
      </Col>
    </Row>
  );
};

export default ObjectStorageSetting;

