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

import React, { useEffect, useState, useRef } from 'react';
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
  Select,
  InputNumber,
} from '@douyinfe/semi-ui';
const { Text } = Typography;
import { API, showError, showSuccess } from '../../helpers';
import { useTranslation } from 'react-i18next';
import { CheckCircle2, XCircle, RefreshCw, TestTube } from 'lucide-react';

const ObjectStorageSetting = () => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const formApiRef = useRef(null);

  const [inputs, setInputs] = useState({
    type: 'none',
    endpoint: '',
    access_key_id: '',
    access_key_secret: '',
    bucket_name: '',
    region: '',
    use_ssl: true,
    base_path: 'videos/',
    domain: '',
    presigned_url_enabled: false,
    presigned_url_expires: 3600,
    auto_upload: true,
    delete_after_upload: false,
    enabled: false,
  });

  const storageTypes = [
    { value: 'none', label: t('禁用') },
    { value: 'oss', label: t('阿里云 OSS') },
    { value: 'cos', label: t('腾讯云 COS') },
    { value: 's3', label: 'AWS S3' },
    { value: 'minio', label: 'MinIO' },
  ];

  const getStorageConfig = async () => {
    setLoading(true);
    try {
      const res = await API.get('/api/storage/config');
      if (res.data.success && res.data.data) {
        const data = res.data.data;
        setInputs({
          type: data.type || 'none',
          endpoint: data.endpoint || '',
          access_key_id: data.access_key_id || '',
          access_key_secret: '', // 不从服务端获取密钥
          bucket_name: data.bucket_name || '',
          region: data.region || '',
          use_ssl: data.use_ssl !== false,
          base_path: data.base_path || 'videos/',
          domain: data.domain || '',
          presigned_url_enabled: data.presigned_url_enabled || false,
          presigned_url_expires: data.presigned_url_expires || 3600,
          auto_upload: data.auto_upload !== false,
          delete_after_upload: data.delete_after_upload || false,
          enabled: data.enabled || false,
        });
        if (formApiRef.current) {
          formApiRef.current.setValues({
            type: data.type || 'none',
            endpoint: data.endpoint || '',
            access_key_id: data.access_key_id || '',
            access_key_secret: '',
            bucket_name: data.bucket_name || '',
            region: data.region || '',
            use_ssl: data.use_ssl !== false,
            base_path: data.base_path || 'videos/',
            domain: data.domain || '',
            presigned_url_enabled: data.presigned_url_enabled || false,
            presigned_url_expires: data.presigned_url_expires || 3600,
            auto_upload: data.auto_upload !== false,
            delete_after_upload: data.delete_after_upload || false,
          });
        }
        setIsLoaded(true);
      }
    } catch (error) {
      console.error('Failed to load storage config:', error);
      showError(t('加载配置失败'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getStorageConfig();
  }, []);

  const handleFormChange = (values) => {
    setInputs((prev) => ({ ...prev, ...values }));
  };

  const handleSave = async () => {
    const formValues = formApiRef.current?.getValues() || inputs;
    setSaving(true);
    try {
      const res = await API.put('/api/storage/config', {
        type: formValues.type,
        endpoint: formValues.endpoint,
        access_key_id: formValues.access_key_id,
        access_key_secret: formValues.access_key_secret,
        bucket_name: formValues.bucket_name,
        region: formValues.region,
        use_ssl: formValues.use_ssl,
        base_path: formValues.base_path,
        domain: formValues.domain,
        presigned_url_enabled: formValues.presigned_url_enabled,
        presigned_url_expires: formValues.presigned_url_expires,
        auto_upload: formValues.auto_upload,
        delete_after_upload: formValues.delete_after_upload,
      });
      if (res.data.success) {
        showSuccess(t('配置已保存'));
        getStorageConfig(); // 刷新配置
      } else {
        showError(res.data.message || t('保存失败'));
      }
    } catch (error) {
      console.error('Failed to save storage config:', error);
      showError(t('保存配置失败'));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    const formValues = formApiRef.current?.getValues() || inputs;
    if (formValues.type === 'none') {
      showError(t('请先选择存储类型'));
      return;
    }
    setTesting(true);
    try {
      const res = await API.post('/api/storage/test', {
        type: formValues.type,
        endpoint: formValues.endpoint,
        access_key_id: formValues.access_key_id,
        access_key_secret: formValues.access_key_secret,
        bucket_name: formValues.bucket_name,
        region: formValues.region,
        use_ssl: formValues.use_ssl,
        base_path: formValues.base_path,
        domain: formValues.domain,
      });
      if (res.data.success) {
        showSuccess(t('连接测试成功'));
      } else {
        showError(res.data.message || t('连接测试失败'));
      }
    } catch (error) {
      console.error('Failed to test storage connection:', error);
      showError(t('连接测试失败'));
    } finally {
      setTesting(false);
    }
  };

  const isStorageEnabled = inputs.type !== 'none';

  return (
    <div>
      {isLoaded ? (
        <Form
          initValues={inputs}
          onValueChange={handleFormChange}
          getFormApi={(api) => (formApiRef.current = api)}
        >
          {({ formState, values }) => (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '10px',
                marginTop: '10px',
              }}
            >
              {/* 当前状态 */}
              <Card>
                <Form.Section text={t('当前状态')}>
                  <Space>
                    <Text strong>{t('对象存储')}: </Text>
                    {inputs.enabled ? (
                      <Tag color="green" icon={<CheckCircle2 size={14} />}>
                        {t('已启用')} - {storageTypes.find((t) => t.value === inputs.type)?.label}
                      </Tag>
                    ) : (
                      <Tag color="grey" icon={<XCircle size={14} />}>
                        {t('未启用')}
                      </Tag>
                    )}
                  </Space>
                </Form.Section>
              </Card>

              {/* 基础配置 */}
              <Card>
                <Form.Section text={t('基础配置')}>
                  <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}>
                    <Col xs={24} sm={24} md={12} lg={8} xl={8}>
                      <Form.Select
                        field="type"
                        label={t('存储类型')}
                        placeholder={t('选择存储类型')}
                        optionList={storageTypes}
                        style={{ width: '100%' }}
                      />
                    </Col>
                    <Col xs={24} sm={24} md={12} lg={8} xl={8}>
                      <Form.Input
                        field="endpoint"
                        label={t('端点地址')}
                        placeholder={t('例如：oss-cn-hangzhou.aliyuncs.com')}
                        disabled={!isStorageEnabled}
                      />
                    </Col>
                    <Col xs={24} sm={24} md={12} lg={8} xl={8}>
                      <Form.Input
                        field="bucket_name"
                        label={t('存储桶名称')}
                        placeholder={t('例如：my-bucket')}
                        disabled={!isStorageEnabled}
                      />
                    </Col>
                  </Row>
                  <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }} style={{ marginTop: 16 }}>
                    <Col xs={24} sm={24} md={12} lg={8} xl={8}>
                      <Form.Input
                        field="access_key_id"
                        label={t('Access Key ID')}
                        placeholder={t('输入 Access Key ID')}
                        disabled={!isStorageEnabled}
                      />
                    </Col>
                    <Col xs={24} sm={24} md={12} lg={8} xl={8}>
                      <Form.Input
                        field="access_key_secret"
                        label={t('Access Key Secret')}
                        placeholder={t('输入 Access Key Secret（留空保持不变）')}
                        type="password"
                        disabled={!isStorageEnabled}
                      />
                    </Col>
                    <Col xs={24} sm={24} md={12} lg={8} xl={8}>
                      <Form.Input
                        field="region"
                        label={t('区域')}
                        placeholder={t('例如：cn-hangzhou, us-east-1')}
                        disabled={!isStorageEnabled}
                      />
                    </Col>
                  </Row>
                </Form.Section>
              </Card>

              {/* 高级配置 */}
              <Card>
                <Form.Section text={t('高级配置')}>
                  <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }}>
                    <Col xs={24} sm={24} md={12} lg={8} xl={8}>
                      <Form.Input
                        field="base_path"
                        label={t('基础路径')}
                        placeholder={t('例如：videos/')}
                        extraText={t('存储文件的基础路径前缀')}
                        disabled={!isStorageEnabled}
                      />
                    </Col>
                    <Col xs={24} sm={24} md={12} lg={8} xl={8}>
                      <Form.Input
                        field="domain"
                        label={t('自定义域名')}
                        placeholder={t('例如：https://cdn.example.com')}
                        extraText={t('可选，用于CDN加速')}
                        disabled={!isStorageEnabled}
                      />
                    </Col>
                    <Col xs={24} sm={24} md={12} lg={8} xl={8}>
                      <Form.InputNumber
                        field="presigned_url_expires"
                        label={t('签名URL有效期（秒）')}
                        placeholder="3600"
                        min={60}
                        max={604800}
                        disabled={!isStorageEnabled}
                      />
                    </Col>
                  </Row>
                  <Row gutter={{ xs: 8, sm: 16, md: 24, lg: 24, xl: 24, xxl: 24 }} style={{ marginTop: 16 }}>
                    <Col xs={24} sm={24} md={24} lg={24} xl={24}>
                      <Form.Checkbox field="use_ssl" noLabel disabled={!isStorageEnabled}>
                        {t('启用 HTTPS')}
                      </Form.Checkbox>
                      <Form.Checkbox field="auto_upload" noLabel disabled={!isStorageEnabled}>
                        {t('自动上传视频到对象存储')}
                      </Form.Checkbox>
                      <Form.Checkbox field="presigned_url_enabled" noLabel disabled={!isStorageEnabled}>
                        {t('启用签名URL（私有存储桶）')}
                      </Form.Checkbox>
                      <Form.Checkbox field="delete_after_upload" noLabel disabled={!isStorageEnabled}>
                        {t('上传后删除上游文件（不推荐）')}
                      </Form.Checkbox>
                    </Col>
                  </Row>
                </Form.Section>
              </Card>

              {/* 功能说明 */}
              <Card>
                <Form.Section text={t('功能说明')}>
                  <Banner
                    type="info"
                    description={
                      <Space vertical align="start">
                        <Text>
                          <Text strong>{t('自动上传')}：</Text>
                          {t('当视频任务完成时，系统会自动将视频上传到对象存储')}
                        </Text>
                        <Text>
                          <Text strong>{t('视频代理')}：</Text>
                          {t('视频代理接口会优先使用对象存储URL')}
                        </Text>
                        <Text>
                          <Text strong>{t('存储路径')}：</Text>
                          {t('视频文件的存储路径格式为：{BASE_PATH}{YYYY/MM/DD}/{task_id}.{ext}')}
                        </Text>
                      </Space>
                    }
                  />
                </Form.Section>
              </Card>

              {/* 操作按钮 */}
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <Button
                  icon={<RefreshCw size={14} />}
                  onClick={getStorageConfig}
                  loading={loading}
                >
                  {t('刷新')}
                </Button>
                <Button
                  icon={<TestTube size={14} />}
                  onClick={handleTest}
                  loading={testing}
                  disabled={!isStorageEnabled}
                >
                  {t('测试连接')}
                </Button>
                <Button
                  theme="solid"
                  type="primary"
                  onClick={handleSave}
                  loading={saving}
                >
                  {t('保存配置')}
                </Button>
              </div>
            </div>
          )}
        </Form>
      ) : (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            height: '200px',
          }}
        >
          <Spin size="large" />
        </div>
      )}
    </div>
  );
};

export default ObjectStorageSetting;
