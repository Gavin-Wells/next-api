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

import React, { useEffect, useState, useRef, useMemo } from 'react';
import {
  Button,
  Col,
  Form,
  Row,
  Spin,
  Switch,
  Table,
  Tag,
  Space,
  Typography,
  Modal,
  InputNumber,
  Input,
  Toast,
  Card,
  Descriptions,
  Popconfirm,
} from '@douyinfe/semi-ui';
import {
  IconPlus,
  IconDelete,
  IconEdit,
  IconHelpCircle,
  IconSave,
} from '@douyinfe/semi-icons';
import { API, showError, showSuccess, showWarning } from '../../../helpers';
import { useTranslation } from 'react-i18next';

// 预设的参数示例
const PRESET_EXAMPLES = [
  { model: 'doubao-*', param_key: 'resolution', param_value: '720p', ratio: 0.8, desc: '豆包视频720p' },
  { model: 'doubao-*', param_key: 'resolution', param_value: '1080p', ratio: 1.0, desc: '豆包视频1080p' },
  { model: 'doubao-*', param_key: 'duration', param_value: '5', ratio: 1.0, desc: '豆包视频5秒' },
  { model: 'doubao-*', param_key: 'duration', param_value: '10', ratio: 1.8, desc: '豆包视频10秒' },
  { model: '*-seedream-*', param_key: 'quality', param_value: 'hd', ratio: 1.5, desc: 'Seedream高清' },
  { model: '*-seedream-*', param_key: 'size', param_value: '4K', ratio: 1.5, desc: 'Seedream 4K' },
  { model: 'cogvideox-*', param_key: 'resolution', param_value: '1080p', ratio: 1.2, desc: 'CogVideoX 1080p' },
];

export default function ParamRatioSettings(props) {
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState({ rules: [], enabled: true });
  const [modalVisible, setModalVisible] = useState(false);
  const [editingRule, setEditingRule] = useState(null);
  const [editingIndex, setEditingIndex] = useState(-1);
  const formRef = useRef();
  const { t } = useTranslation();

  // 从 props.options 加载配置
  useEffect(() => {
    if (props.options?.ParamRatioConfig) {
      try {
        const parsed = JSON.parse(props.options.ParamRatioConfig);
        setConfig(parsed);
      } catch (e) {
        console.error('解析参数倍率配置失败:', e);
      }
    }
  }, [props.options]);

  // 保存配置
  const saveConfig = async (newConfig) => {
    try {
      setLoading(true);
      const res = await API.put('/api/option/', {
        key: 'ParamRatioConfig',
        value: JSON.stringify(newConfig),
      });
      if (res.data.success) {
        showSuccess(t('保存成功'));
        setConfig(newConfig);
        props.refresh?.();
      } else {
        showError(res.data.message || t('保存失败'));
      }
    } catch (error) {
      showError(error.message || t('保存失败'));
    } finally {
      setLoading(false);
    }
  };

  // 切换启用状态
  const toggleEnabled = (checked) => {
    const newConfig = { ...config, enabled: checked };
    saveConfig(newConfig);
  };

  // 打开添加/编辑弹窗
  const openModal = (rule = null, index = -1) => {
    setEditingRule(rule);
    setEditingIndex(index);
    setModalVisible(true);
  };

  // 保存规则
  const handleSaveRule = () => {
    formRef.current.validate().then((values) => {
      const newRules = [...config.rules];
      const rule = {
        model: values.model,
        param_key: values.param_key,
        param_value: values.param_value,
        ratio: values.ratio,
      };
      
      if (editingIndex >= 0) {
        newRules[editingIndex] = rule;
      } else {
        newRules.push(rule);
      }
      
      const newConfig = { ...config, rules: newRules };
      saveConfig(newConfig);
      setModalVisible(false);
    }).catch(() => {
      showWarning(t('请填写完整信息'));
    });
  };

  // 删除规则
  const deleteRule = (index) => {
    const newRules = config.rules.filter((_, i) => i !== index);
    const newConfig = { ...config, rules: newRules };
    saveConfig(newConfig);
  };

  // 添加预设示例
  const addPreset = (preset) => {
    const newRules = [...config.rules, {
      model: preset.model,
      param_key: preset.param_key,
      param_value: preset.param_value,
      ratio: preset.ratio,
    }];
    const newConfig = { ...config, rules: newRules };
    saveConfig(newConfig);
  };

  // 表格列定义
  const columns = useMemo(() => [
    {
      title: t('模型匹配'),
      dataIndex: 'model',
      render: (text) => (
        <Tag color="blue" style={{ fontFamily: 'monospace' }}>
          {text}
        </Tag>
      ),
    },
    {
      title: t('参数名'),
      dataIndex: 'param_key',
      render: (text) => (
        <Tag color="green" style={{ fontFamily: 'monospace' }}>
          {text}
        </Tag>
      ),
    },
    {
      title: t('参数值'),
      dataIndex: 'param_value',
      render: (text) => (
        <Tag color="orange" style={{ fontFamily: 'monospace' }}>
          {text}
        </Tag>
      ),
    },
    {
      title: t('倍率'),
      dataIndex: 'ratio',
      render: (value) => (
        <Typography.Text
          style={{
            color: value > 1 ? '#e91e63' : value < 1 ? '#4caf50' : undefined,
            fontWeight: 600,
          }}
        >
          {value.toFixed(2)}x
        </Typography.Text>
      ),
    },
    {
      title: t('操作'),
      dataIndex: 'action',
      render: (_, record, index) => (
        <Space>
          <Button
            icon={<IconEdit />}
            type="tertiary"
            size="small"
            onClick={() => openModal(record, index)}
          />
          <Popconfirm
            title={t('确定删除此规则?')}
            onConfirm={() => deleteRule(index)}
          >
            <Button
              icon={<IconDelete />}
              type="danger"
              size="small"
            />
          </Popconfirm>
        </Space>
      ),
    },
  ], [config.rules, t]);

  return (
    <Spin spinning={loading}>
      <Card
        title={
          <Space>
            <Typography.Title heading={5} style={{ margin: 0 }}>
              {t('参数倍率配置')}
            </Typography.Title>
            <Tag color="blue">{t('视频/图像生成')}</Tag>
          </Space>
        }
        headerExtraContent={
          <Space>
            <Typography.Text type="tertiary">{t('启用')}</Typography.Text>
            <Switch
              checked={config.enabled}
              onChange={toggleEnabled}
            />
          </Space>
        }
        style={{ marginBottom: 16 }}
      >
        <Descriptions
          data={[
            {
              key: t('说明'),
              value: t('根据请求参数动态调整计费倍率。支持通配符匹配模型名，如 "doubao-*" 匹配所有豆包模型。'),
            },
            {
              key: t('用途'),
              value: t('可用于对不同分辨率、时长、质量等参数设置不同的计费策略。'),
            },
          ]}
        />
      </Card>

      {/* 预设示例 */}
      <Card title={t('快速添加预设')} style={{ marginBottom: 16 }}>
        <Space wrap>
          {PRESET_EXAMPLES.map((preset, index) => (
            <Button
              key={index}
              size="small"
              type="tertiary"
              onClick={() => addPreset(preset)}
            >
              {preset.desc} ({preset.ratio}x)
            </Button>
          ))}
        </Space>
      </Card>

      {/* 规则列表 */}
      <Card
        title={t('倍率规则')}
        headerExtraContent={
          <Button
            icon={<IconPlus />}
            onClick={() => openModal()}
            disabled={!config.enabled}
          >
            {t('添加规则')}
          </Button>
        }
      >
        <Table
          columns={columns}
          dataSource={config.rules}
          rowKey={(_, index) => index}
          pagination={false}
          empty={
            <Typography.Text type="tertiary">
              {t('暂无规则，请点击"添加规则"创建')}
            </Typography.Text>
          }
        />
      </Card>

      {/* 添加/编辑规则弹窗 */}
      <Modal
        title={editingIndex >= 0 ? t('编辑规则') : t('添加规则')}
        visible={modalVisible}
        onOk={handleSaveRule}
        onCancel={() => setModalVisible(false)}
        okText={t('保存')}
        cancelText={t('取消')}
      >
        <Form
          getFormApi={(api) => (formRef.current = api)}
          initValues={editingRule || {
            model: '',
            param_key: '',
            param_value: '',
            ratio: 1.0,
          }}
        >
          <Form.Input
            field="model"
            label={t('模型匹配')}
            placeholder={t('如 doubao-*, *-seedream-*')}
            rules={[{ required: true, message: t('请输入模型匹配规则') }]}
            extraText={t('支持 * 通配符')}
          />
          <Form.Select
            field="param_key"
            label={t('参数名')}
            placeholder={t('选择或输入参数名')}
            rules={[{ required: true, message: t('请选择参数名') }]}
            filter
            allowCreate
            optionList={[
              { value: 'resolution', label: t('分辨率 (resolution)') },
              { value: 'duration', label: t('时长 (duration)') },
              { value: 'quality', label: t('质量 (quality)') },
              { value: 'size', label: t('尺寸 (size)') },
              { value: 'fps', label: t('帧率 (fps)') },
              { value: 'n', label: t('数量 (n)') },
              { value: 'mode', label: t('模式 (mode)') },
              { value: 'aspect_ratio', label: t('宽高比 (aspect_ratio)') },
              { value: 'generate_audio', label: t('生成音频 (generate_audio)') },
              { value: 'has_image', label: t('图生视频 (has_image)') },
            ]}
          />
          <Form.Input
            field="param_value"
            label={t('参数值')}
            placeholder={t('如 1080p, 10, hd')}
            rules={[{ required: true, message: t('请输入参数值') }]}
          />
          <Form.InputNumber
            field="ratio"
            label={t('倍率')}
            min={0.01}
            max={100}
            step={0.1}
            rules={[{ required: true, message: t('请输入倍率') }]}
            extraText={t('1.0 表示原价，1.5 表示 1.5 倍，0.8 表示 8 折')}
          />
        </Form>
      </Modal>
    </Spin>
  );
}

