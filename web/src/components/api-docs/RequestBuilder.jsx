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

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Typography,
  Tag,
  Form,
  Button,
  Select,
  Spin,
  Toast,
  Tabs,
  TabPane,
  Tooltip,
} from '@douyinfe/semi-ui';
import { 
  IconSend, 
  IconSetting, 
  IconCode, 
  IconPlay,
  IconCopy,
  IconTick,
  IconRefresh,
} from '@douyinfe/semi-icons';
import { getVendorColor } from './constants';
import CodeGenerator from './CodeGenerator';
import CodeBlock from './CodeBlock';
import ModelParams from './ModelParams';

const { Title, Text } = Typography;

// 获取视频参数的中文标签
const getVideoParamLabel = (paramName, required = false) => {
  const labels = {
    prompt: '视频描述',
    duration: '时长',
    resolution: '分辨率',
    aspect_ratio: '宽高比',
    first_frame: '首帧图片',
    last_frame: '尾帧图片',
    images: '参考图片',
    image: '首帧图片',
    subject_reference: '主体参考图',
    mode: '生成模式',
    motion: '动态程度',
    style: '视频风格',
    movement_amplitude: '运动幅度',
    seed: '随机种子',
    negative_prompt: '反向提示词',
    generate_audio: '生成音频',
    prompt_optimizer: '优化提示词',
    aigc_watermark: 'AIGC水印',
    watermark: '添加水印',
    private: '隐藏视频',
    hd: '高清模式',
    notifyHook: '回调地址',
    cfg_scale: '提示词相关度',
    fps: '帧率',
    fast_pretreatment: '快速预处理',
  };
  const label = labels[paramName] || paramName;
  return required ? `${label} *` : label;
};

const RequestBuilder = ({
  endpoint,
  model,
  userTokens = [],
  userId,
  selectedTokenKey,
  onSelectedTokenChange,
}) => {
  const [formValues, setFormValues] = useState({});
  const [testResponse, setTestResponse] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [taskStatus, setTaskStatus] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const [localSelectedToken, setLocalSelectedToken] = useState(selectedTokenKey || '');
  const [activeTab, setActiveTab] = useState('params');
  const pollingIntervalRef = useRef(null);

  // 初始化表单默认值
  useEffect(() => {
    if (model) {
      const defaultValues = { 
        model: model.id,
        api_key: localSelectedToken || '',
      };
      
      // 根据端点类型设置默认值
      if (endpoint.type === 'chat') {
        defaultValues.prompt = 'Hello!';
        defaultValues.temperature = 0.7;
        defaultValues.stream = false;
        defaultValues.max_tokens = 1024;
      } else if (endpoint.type === 'video') {
        defaultValues.prompt = '一只猫在草地上奔跑';
        defaultValues.duration = model.default_duration || 5;
        defaultValues.resolution = model.default_resolution || model.supported_resolutions?.[0];
        defaultValues.aspect_ratio = model.supported_ratios?.[0] || '16:9';
      } else if (endpoint.type === 'image') {
        defaultValues.prompt = 'A cute cat';
        defaultValues.size = model.supported_sizes?.[0] || '1024x1024';
        defaultValues.n = 1;
      } else if (endpoint.type === 'embedding') {
        defaultValues.input = 'Hello, world!';
      } else if (endpoint.type === 'audio') {
        defaultValues.input = 'Hello, world!';
        defaultValues.voice = 'alloy';
      }
      
      // 模型特定参数
      model.parameters?.forEach(param => {
        if (param.default !== undefined && defaultValues[param.name] === undefined) {
          defaultValues[param.name] = param.default;
        }
      });
      
      setFormValues(defaultValues);
      setTestResponse(null);
      setTaskStatus(null);
    }
  }, [model, endpoint, localSelectedToken]);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  // 构建请求体
  const requestBody = useMemo(() => {
    if (!model || !endpoint) return {};
    
    const body = { model: model.id };
    
    if (endpoint.type === 'chat') {
      body.messages = [{ role: 'user', content: formValues.prompt || 'Hello!' }];
      if (formValues.temperature !== undefined) body.temperature = formValues.temperature;
      if (formValues.stream !== undefined) body.stream = formValues.stream;
      if (formValues.max_tokens) body.max_tokens = formValues.max_tokens;
    } else if (endpoint.type === 'video') {
      // 通用参数
      if (formValues.prompt) body.prompt = formValues.prompt;
      if (formValues.duration) body.duration = parseInt(formValues.duration);
      if (formValues.resolution) body.resolution = formValues.resolution;
      if (formValues.aspect_ratio) body.aspect_ratio = formValues.aspect_ratio;
      
      // 图生视频参数
      if (formValues.first_frame) body.first_frame = formValues.first_frame;
      if (formValues.last_frame) body.last_frame = formValues.last_frame;
      if (formValues.image) body.image = formValues.image;
      if (formValues.images) {
        const imageUrls = formValues.images.split('\n').map(url => url.trim()).filter(url => url);
        if (imageUrls.length > 0) body.images = imageUrls;
      }
      if (formValues.subject_reference) {
        const refUrls = formValues.subject_reference.split('\n').map(url => url.trim()).filter(url => url);
        if (refUrls.length > 0) body.subject_reference = refUrls;
      }
      
      // 模型特定参数
      if (formValues.mode) body.mode = formValues.mode;
      if (formValues.motion) body.motion = formValues.motion;
      if (formValues.style) body.style = formValues.style;
      if (formValues.movement_amplitude) body.movement_amplitude = formValues.movement_amplitude;
      if (formValues.negative_prompt) body.negative_prompt = formValues.negative_prompt;
      if (formValues.notifyHook) body.notifyHook = formValues.notifyHook;
      
      // 布尔参数
      if (formValues.generate_audio !== undefined) body.generate_audio = formValues.generate_audio;
      if (formValues.prompt_optimizer !== undefined) body.prompt_optimizer = formValues.prompt_optimizer;
      if (formValues.aigc_watermark !== undefined) body.aigc_watermark = formValues.aigc_watermark;
      if (formValues.watermark !== undefined) body.watermark = formValues.watermark;
      if (formValues.private !== undefined) body.private = formValues.private;
      if (formValues.hd !== undefined) body.hd = formValues.hd;
      
      // 其他参数
      if (formValues.seed !== undefined && formValues.seed !== '') body.seed = parseInt(formValues.seed);
      if (formValues.cfg_scale !== undefined && formValues.cfg_scale !== '') body.cfg_scale = parseFloat(formValues.cfg_scale);
      if (formValues.fps !== undefined && formValues.fps !== '') body.fps = parseInt(formValues.fps);
      if (formValues.fast_pretreatment !== undefined) body.fast_pretreatment = formValues.fast_pretreatment;
    } else if (endpoint.type === 'image') {
      body.prompt = formValues.prompt || 'A cute cat';
      if (formValues.size) body.size = formValues.size;
      if (formValues.n) body.n = parseInt(formValues.n);
      if (formValues.quality) body.quality = formValues.quality;
      if (formValues.response_format) body.response_format = formValues.response_format;
      if (formValues.seed !== undefined && formValues.seed !== '') body.seed = parseInt(formValues.seed);
      if (formValues.style) body.style = formValues.style;
      if (formValues.user) body.user = formValues.user;
    } else if (endpoint.type === 'embedding') {
      body.input = formValues.input || 'Hello, world!';
    } else if (endpoint.type === 'audio') {
      body.input = formValues.input || 'Hello, world!';
      if (formValues.voice) body.voice = formValues.voice;
    }
    
    return body;
  }, [model, endpoint, formValues]);

  // 执行测试
  const executeTest = useCallback(async () => {
    const apiKey = localSelectedToken || formValues.api_key;
    if (!apiKey) {
      Toast.error('请选择 Token 或输入 API Key');
      return;
    }

    setTestLoading(true);
    setTestResponse(null);
    setTaskStatus(null);
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setIsPolling(false);
    }

    try {
      const startTime = Date.now();
      const response = await fetch(endpoint.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
        },
        body: JSON.stringify(requestBody),
      });
      const endTime = Date.now();

      let responseData;
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        responseData = await response.json();
      } else {
        responseData = await response.text();
      }

      setTestResponse({
        status: response.status,
        statusText: response.statusText,
        time: endTime - startTime,
        data: responseData,
      });

      if (endpoint.type === 'video' && response.ok) {
        const payload = responseData?.data || responseData;
        const taskId = payload?.task_id || payload?.id;
        if (payload) {
          setTaskStatus(payload);
        }
        if (taskId) {
          const statusUrl = `${endpoint.endpoint}/${taskId}`;
          const pollStatus = async () => {
            try {
              const statusResponse = await fetch(statusUrl, {
                method: 'GET',
                headers: {
                  'Authorization': `Bearer ${apiKey}`,
                },
              });
              const statusData = await statusResponse.json();
              const payload = statusData?.data || statusData;
              const statusValue = payload?.status || payload?.data?.status;
              if (statusResponse.ok && payload) {
                setTaskStatus(payload);
                if (
                  statusValue === 'SUCCESS' ||
                  statusValue === 'FAILED' ||
                  statusValue === 'ERROR' ||
                  statusValue === 'failure' ||
                  statusValue === 'failed'
                ) {
                  if (pollingIntervalRef.current) {
                    clearInterval(pollingIntervalRef.current);
                    pollingIntervalRef.current = null;
                    setIsPolling(false);
                  }
                }
              }
            } catch (error) {
              console.error('Failed to poll task status:', error);
            }
          };
          await pollStatus();
          setIsPolling(true);
          pollingIntervalRef.current = setInterval(pollStatus, 3000);
        }
      }
    } catch (error) {
      setTestResponse({
        status: 0,
        statusText: 'Error',
        error: error.message,
      });
    } finally {
      setTestLoading(false);
    }
  }, [endpoint, requestBody, localSelectedToken, formValues.api_key]);

  const renderTaskStatus = () => {
    if (!taskStatus || endpoint.type !== 'video') return null;

    const statusValue = taskStatus.status || taskStatus.data?.status;
    const isFailure =
      statusValue === 'FAILED' ||
      statusValue === 'ERROR' ||
      statusValue === 'failure' ||
      statusValue === 'failed';
    const videoUrl =
      taskStatus.video_url ||
      taskStatus.url ||
      taskStatus.data?.video_url ||
      taskStatus.data?.url ||
      taskStatus.data?.content?.video_url;
    const audioUrl = taskStatus.audio_url || taskStatus.data?.audio_url;
    const progress = (taskStatus.progress || taskStatus.data?.progress) ? String(taskStatus.progress || taskStatus.data?.progress) : '';
    const errorMessage = isFailure ? (taskStatus.fail_reason || taskStatus.data?.error?.message) : null;
    const taskId = taskStatus.task_id || taskStatus.id;
    const statusLabel =
      statusValue === 'SUCCESS' ? '已完成' :
      isFailure ? '失败' :
      statusValue === 'PROCESSING' ? '处理中' :
      statusValue === 'PENDING' || statusValue === 'queued' ? '等待中' : statusValue;
    const statusColor =
      statusValue === 'SUCCESS' ? 'green' :
      isFailure ? 'red' :
      statusValue === 'PROCESSING' || statusValue === 'PENDING' || statusValue === 'queued' ? 'orange' : 'grey';

    return (
      <div className='mb-4 rounded-xl border overflow-hidden' style={{ borderColor: 'var(--semi-color-border)', background: 'var(--semi-color-bg-1)' }}>
        <div
          className='px-4 py-3 flex items-center justify-between'
          style={{ background: 'var(--semi-color-fill-0)' }}
        >
          <div className='flex items-center gap-2'>
            <Text strong>任务状态</Text>
            {isPolling && (
              <span
                className='inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs'
                style={{ background: 'var(--semi-color-warning-light-default)', color: 'var(--semi-color-warning)' }}
              >
                <Spin size='small' />
                轮询中
              </span>
            )}
          </div>
          <Tag color={statusColor} type='light'>
            {statusLabel}
          </Tag>
        </div>
        <div className='p-4 space-y-3'>
          {taskId && (
            <Text type='tertiary' size='small' className='block'>
              Task ID: <code className='px-1.5 py-0.5 rounded bg-[var(--semi-color-fill-1)]'>{taskId}</code>
            </Text>
          )}
          {progress && (
            <div>
              <div className='flex items-center justify-between mb-1'>
                <Text type='tertiary' size='small'>进度</Text>
                <Text type='tertiary' size='small'>{progress}</Text>
              </div>
              <div className='h-2 rounded-full overflow-hidden' style={{ background: 'var(--semi-color-fill-0)' }}>
                <div
                  className='h-full transition-all duration-300'
                  style={{
                    width: typeof progress === 'string' && progress.includes('%') ? progress : `${progress}%`,
                    background: 'linear-gradient(90deg, var(--semi-color-primary) 0%, var(--semi-color-primary-light-active) 100%)',
                  }}
                />
              </div>
            </div>
          )}
          {videoUrl && statusValue === 'SUCCESS' && (
            <div>
              <Text strong className='block mb-2'>生成的视频</Text>
              <video
                controls
                className='w-full rounded-lg'
                style={{ maxHeight: '320px', background: '#000' }}
              >
                <source src={videoUrl} type='video/mp4' />
                您的浏览器不支持视频播放
              </video>
            </div>
          )}
          {audioUrl && statusValue === 'SUCCESS' && (
            <div>
              <Text strong className='block mb-2'>生成的音频</Text>
              <audio controls className='w-full'>
                <source src={audioUrl} type='audio/mpeg' />
                您的浏览器不支持音频播放
              </audio>
            </div>
          )}
          {errorMessage && (
            <Text type='danger' size='small' className='block'>{errorMessage}</Text>
          )}
        </div>
      </div>
    );
  };

  // 渲染参数表单
  const renderParamForm = () => {
    const fields = [];

    // API Key 选择 - 更紧凑的设计
    if (userTokens.length > 0) {
      fields.push(
        <div key='api_key_section' className='mb-4'>
          <div className='flex items-center gap-2 mb-2'>
            <Text strong size='small'>API Key</Text>
            {!localSelectedToken && <Tag size='small' color='orange'>未选择</Tag>}
          </div>
          <Select
            value={localSelectedToken}
            placeholder='选择一个 Token'
            style={{ width: '100%' }}
            optionList={[
              { label: '-- 手动输入 --', value: '' },
              ...userTokens.map(t => ({
                label: `${t.name} (sk-${t.key?.slice(0, 8)}...)`,
                value: `sk-${t.key}`,
              }))
            ]}
            onChange={(value) => {
              setLocalSelectedToken(value);
              onSelectedTokenChange?.(value);
              setFormValues(prev => ({ ...prev, api_key: value }));
            }}
          />
          {!localSelectedToken && (
            <Form.Input
              field='api_key'
              noLabel
              placeholder='sk-xxx'
              className='mt-2'
            />
          )}
        </div>
      );
    } else {
      fields.push(
        <Form.Input
          key='api_key'
          field='api_key'
          label='API Key'
          placeholder='sk-xxx'
          rules={[{ required: true, message: '请输入 API Key' }]}
          extraText={userId ? '请先到令牌管理页面创建 Token' : '请登录后选择 Token'}
        />
      );
    }

    // 根据端点类型显示不同字段
    if (endpoint.type === 'chat') {
      fields.push(
        <Form.TextArea
          key='prompt'
          field='prompt'
          label='消息内容'
          placeholder='Hello!'
          autosize={{ minRows: 3, maxRows: 6 }}
        />,
        <div key='chat-params' className='grid grid-cols-2 gap-3'>
          <Form.InputNumber
            field='temperature'
            label='Temperature'
            min={0}
            max={2}
            step={0.1}
          />
          <Form.InputNumber
            field='max_tokens'
            label='Max Tokens'
            min={1}
            max={128000}
          />
        </div>,
        <Form.Switch
          key='stream'
          field='stream'
          label='流式输出'
        />
      );
    } else if (endpoint.type === 'video') {
      // 根据模型参数动态生成视频表单字段
      if (model?.parameters?.length > 0) {
        // 遍历模型参数并生成对应表单
        model.parameters.forEach((param) => {
          const paramName = param.name;
          const label = getVideoParamLabel(paramName, param.required);
          
          // 跳过 model 参数（已在请求体中自动设置）
          if (paramName === 'model') return;

          // 根据参数类型生成对应的表单控件
          if (paramName === 'prompt') {
            fields.push(
              <Form.TextArea
                key={paramName}
                field={paramName}
                label={label}
                placeholder='一只猫在草地上奔跑'
                autosize={{ minRows: 3, maxRows: 6 }}
                extraText={param.description}
              />
            );
          } else if (paramName === 'duration') {
            const options = param.options?.length > 0 
              ? param.options.map(d => ({ label: `${d}秒`, value: parseInt(d) }))
              : model?.supported_durations?.map(d => ({ label: `${d}秒`, value: d })) || [];
            if (options.length > 0) {
              fields.push(
                <Form.Select
                  key={paramName}
                  field={paramName}
                  label={label}
                  optionList={options}
                  extraText={param.description}
                />
              );
            }
          } else if (paramName === 'resolution') {
            const options = param.options?.length > 0
              ? param.options.map(r => ({ label: r, value: r }))
              : model?.supported_resolutions?.map(r => ({ label: r, value: r })) || [];
            if (options.length > 0) {
              fields.push(
                <Form.Select
                  key={paramName}
                  field={paramName}
                  label={label}
                  optionList={options}
                  extraText={param.description}
                />
              );
            }
          } else if (paramName === 'aspect_ratio') {
            const options = param.options?.length > 0
              ? param.options.map(r => ({ label: r, value: r }))
              : model?.supported_ratios?.map(r => ({ label: r, value: r })) || [];
            if (options.length > 0) {
              fields.push(
                <Form.Select
                  key={paramName}
                  field={paramName}
                  label={label}
                  optionList={options}
                  extraText={param.description}
                />
              );
            }
          } else if (paramName === 'first_frame' || paramName === 'last_frame' || paramName === 'image') {
            fields.push(
              <Form.Input
                key={paramName}
                field={paramName}
                label={label}
                placeholder='https://example.com/image.jpg'
                extraText={param.description}
              />
            );
          } else if (paramName === 'images' || paramName === 'subject_reference') {
            fields.push(
              <Form.TextArea
                key={paramName}
                field={paramName}
                label={label}
                placeholder='每行一个图片URL'
                autosize={{ minRows: 2, maxRows: 4 }}
                extraText={param.description}
              />
            );
          } else if (paramName === 'mode') {
            const options = param.options?.length > 0
              ? param.options.map(m => ({ 
                  label: m === 'std' ? '标准模式' : m === 'pro' ? '专业模式' : m,
                  value: m 
                }))
              : [{ label: '标准模式', value: 'std' }, { label: '专业模式', value: 'pro' }];
            fields.push(
              <Form.Select
                key={paramName}
                field={paramName}
                label={label}
                optionList={options}
                extraText={param.description}
              />
            );
          } else if (paramName === 'motion') {
            const options = param.options?.length > 0
              ? param.options.map(m => ({ 
                  label: m === 'low' ? '低动态' : m === 'high' ? '高动态' : m,
                  value: m 
                }))
              : [{ label: '低动态', value: 'low' }, { label: '高动态', value: 'high' }];
            fields.push(
              <Form.Select
                key={paramName}
                field={paramName}
                label={label}
                optionList={options}
                extraText={param.description}
              />
            );
          } else if (paramName === 'style') {
            const options = param.options?.length > 0
              ? param.options.map(s => ({ 
                  label: s === 'general' ? '通用' : s === 'anime' ? '动漫' : s,
                  value: s 
                }))
              : [];
            if (options.length > 0) {
              fields.push(
                <Form.Select
                  key={paramName}
                  field={paramName}
                  label={label}
                  optionList={options}
                  extraText={param.description}
                />
              );
            }
          } else if (paramName === 'movement_amplitude') {
            const options = param.options?.length > 0
              ? param.options.map(m => ({ 
                  label: m === 'auto' ? '自动' : m === 'small' ? '小' : m === 'medium' ? '中' : m === 'large' ? '大' : m,
                  value: m 
                }))
              : [
                  { label: '自动', value: 'auto' },
                  { label: '小', value: 'small' },
                  { label: '中', value: 'medium' },
                  { label: '大', value: 'large' },
                ];
            fields.push(
              <Form.Select
                key={paramName}
                field={paramName}
                label={label}
                optionList={options}
                extraText={param.description}
              />
            );
          } else if (paramName === 'seed') {
            fields.push(
              <Form.InputNumber
                key={paramName}
                field={paramName}
                label={label}
                min={0}
                max={2147483647}
                extraText={param.description}
              />
            );
          } else if (paramName === 'cfg_scale') {
            fields.push(
              <Form.InputNumber
                key={paramName}
                field={paramName}
                label={label}
                min={1}
                max={10}
                step={0.1}
                extraText={param.description}
              />
            );
          } else if (paramName === 'fps') {
            const options = param.options?.length > 0
              ? param.options.map(f => ({ label: `${f} fps`, value: parseInt(f) }))
              : [{ label: '16 fps', value: 16 }, { label: '24 fps', value: 24 }];
            fields.push(
              <Form.Select
                key={paramName}
                field={paramName}
                label={label}
                optionList={options}
                extraText={param.description}
              />
            );
          } else if (paramName === 'negative_prompt' || paramName === 'notifyHook') {
            fields.push(
              <Form.Input
                key={paramName}
                field={paramName}
                label={label}
                placeholder={paramName === 'negative_prompt' ? '不想出现的内容' : 'https://your-webhook.com'}
                extraText={param.description}
              />
            );
          } else if (param.type === 'boolean') {
            // 所有布尔类型参数
            fields.push(
              <Form.Switch
                key={paramName}
                field={paramName}
                label={label}
                extraText={param.description}
              />
            );
          } else if (param.options?.length > 0) {
            // 有选项的参数使用下拉框
            fields.push(
              <Form.Select
                key={paramName}
                field={paramName}
                label={label}
                optionList={param.options.map(o => ({ label: o, value: o }))}
                extraText={param.description}
              />
            );
          } else if (param.type === 'integer') {
            // 整数类型
            fields.push(
              <Form.InputNumber
                key={paramName}
                field={paramName}
                label={label}
                extraText={param.description}
              />
            );
          } else if (param.type === 'string') {
            // 字符串类型
            fields.push(
              <Form.Input
                key={paramName}
                field={paramName}
                label={label}
                extraText={param.description}
              />
            );
          } else if (param.type === 'array') {
            // 数组类型（使用多行文本框，每行一个值）
            fields.push(
              <Form.TextArea
                key={paramName}
                field={paramName}
                label={label}
                placeholder='每行一个值'
                autosize={{ minRows: 2, maxRows: 4 }}
                extraText={param.description}
              />
            );
          }
        });
      } else {
        // 如果没有参数配置，使用默认字段
        fields.push(
          <Form.TextArea
            key='prompt'
            field='prompt'
            label='视频描述'
            placeholder='一只猫在草地上奔跑'
            autosize={{ minRows: 3, maxRows: 6 }}
          />
        );
        
        if (model?.supported_durations?.length > 0) {
          fields.push(
            <Form.Select
              key='duration'
              field='duration'
              label='时长'
              optionList={model.supported_durations.map(d => ({ label: `${d}秒`, value: d }))}
            />
          );
        }
        if (model?.supported_resolutions?.length > 0) {
          fields.push(
            <Form.Select
              key='resolution'
              field='resolution'
              label='分辨率'
              optionList={model.supported_resolutions.map(r => ({ label: r, value: r }))}
            />
          );
        }
        if (model?.supported_ratios?.length > 0) {
          fields.push(
            <Form.Select
              key='aspect_ratio'
              field='aspect_ratio'
              label='宽高比'
              optionList={model.supported_ratios.map(r => ({ label: r, value: r }))}
            />
          );
        }
        if (model?.supports_audio) {
          fields.push(
            <Form.Switch
              key='generate_audio'
              field='generate_audio'
              label='生成音频'
            />
          );
        }
      }
    } else if (endpoint.type === 'image') {
      fields.push(
        <Form.TextArea
          key='prompt'
          field='prompt'
          label='图像描述'
          placeholder='A cute cat'
          autosize={{ minRows: 3, maxRows: 6 }}
        />
      );

      // 根据模型参数动态生成表单字段
      if (model?.parameters?.length > 0) {
        model.parameters.forEach((param) => {
          const paramName = param.name;
          
          if (paramName === 'n') {
            const maxN = param.options?.length > 0 
              ? Math.max(...param.options.map(o => parseInt(o) || 1))
              : 4;
            fields.push(
              <Form.InputNumber
                key={paramName}
                field={paramName}
                label={`数量 (n)${param.required ? ' *' : ''}`}
                min={1}
                max={maxN}
                extraText={param.description}
              />
            );
          } else if (paramName === 'size') {
            const options = param.options?.length > 0 
              ? param.options.map(s => ({ label: s, value: s }))
              : model?.supported_sizes?.map(s => ({ label: s, value: s })) ||
                [{ label: '1024x1024', value: '1024x1024' }];
            fields.push(
              <Form.Select
                key={paramName}
                field={paramName}
                label={`尺寸${param.required ? ' *' : ''}`}
                optionList={options}
                extraText={param.description}
              />
            );
          } else if (paramName === 'quality') {
            const options = param.options?.length > 0
              ? param.options.map(q => ({ 
                  label: q === 'standard' ? '标准' : q === 'hd' ? '高清' : q,
                  value: q 
                }))
              : [{ label: '标准', value: 'standard' }, { label: '高清', value: 'hd' }];
            fields.push(
              <Form.Select
                key={paramName}
                field={paramName}
                label={`质量${param.required ? ' *' : ''}`}
                optionList={options}
                extraText={param.description}
              />
            );
          } else if (paramName === 'response_format') {
            const options = param.options?.length > 0
              ? param.options.map(f => ({ 
                  label: f === 'url' ? 'URL' : f === 'b64_json' ? 'Base64' : f,
                  value: f 
                }))
              : [{ label: 'URL', value: 'url' }, { label: 'Base64', value: 'b64_json' }];
            fields.push(
              <Form.Select
                key={paramName}
                field={paramName}
                label={`响应格式${param.required ? ' *' : ''}`}
                optionList={options}
                extraText={param.description}
              />
            );
          } else if (paramName === 'seed') {
            fields.push(
              <Form.InputNumber
                key={paramName}
                field={paramName}
                label={`随机种子${param.required ? ' *' : ''}`}
                min={0}
                max={2147483647}
                extraText={param.description}
              />
            );
          }
        });
      } else {
        fields.push(
          <div key='image-params' className='grid grid-cols-2 gap-3'>
            <Form.Select
              field='size'
              label='尺寸'
              optionList={
                model?.supported_sizes?.map(s => ({ label: s, value: s })) ||
                [{ label: '1024x1024', value: '1024x1024' }]
              }
            />
            <Form.InputNumber
              field='n'
              label='数量'
              min={1}
              max={4}
            />
          </div>
        );
      }
    } else if (endpoint.type === 'embedding') {
      fields.push(
        <Form.TextArea
          key='input'
          field='input'
          label='输入文本'
          placeholder='Hello, world!'
          autosize={{ minRows: 3, maxRows: 6 }}
        />
      );
    } else if (endpoint.type === 'audio') {
      fields.push(
        <Form.TextArea
          key='input'
          field='input'
          label='输入文本'
          placeholder='Hello, world!'
          autosize={{ minRows: 3, maxRows: 6 }}
        />,
        <Form.Select
          key='voice'
          field='voice'
          label='声音'
          optionList={[
            { label: 'Alloy', value: 'alloy' },
            { label: 'Echo', value: 'echo' },
            { label: 'Fable', value: 'fable' },
            { label: 'Onyx', value: 'onyx' },
            { label: 'Nova', value: 'nova' },
            { label: 'Shimmer', value: 'shimmer' },
          ]}
        />
      );
    }

    return fields;
  };

  if (!model) {
    return (
      <div 
        className='h-full flex flex-col items-center justify-center p-8'
        style={{ background: 'var(--semi-color-fill-0)' }}
      >
        <div 
          className='w-20 h-20 rounded-3xl flex items-center justify-center mb-6'
          style={{ background: 'var(--semi-color-fill-1)' }}
        >
          <IconSetting size='extra-large' className='text-[var(--semi-color-text-2)]' />
        </div>
        <Title heading={5} type='tertiary' style={{ marginBottom: 8 }}>选择一个模型</Title>
        <Text type='tertiary' className='text-center'>从左侧列表中选择模型<br/>开始测试 API</Text>
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col overflow-hidden'>
      {/* 模型信息头部 - 更简洁 */}
      <header 
        className='px-5 py-3 border-b flex-shrink-0 flex items-center justify-between'
        style={{ 
          background: 'var(--semi-color-bg-1)',
          borderColor: 'var(--semi-color-border)'
        }}
      >
        <div className='flex items-center gap-3'>
          <code 
            className='px-3 py-1.5 rounded-lg font-semibold text-sm'
            style={{ 
              background: `var(--semi-color-${getVendorColor(model.vendor)}-light-default)`,
              color: `var(--semi-color-${getVendorColor(model.vendor)})`
            }}
          >
            {model.id}
          </code>
          <Tag type='light' color={getVendorColor(model.vendor)} size='small'>
            {model.vendor}
          </Tag>
        </div>
        <Button
          type='primary'
          theme='solid'
          icon={<IconPlay />}
          loading={testLoading}
          onClick={executeTest}
        >
          发送请求
        </Button>
      </header>

      {/* 主内容区 - 双栏布局 */}
      <div className='flex-1 flex overflow-hidden min-h-0'>
        {/* 左侧：参数配置 */}
        <div 
          className='w-1/2 border-r overflow-y-auto p-5'
          style={{ borderColor: 'var(--semi-color-border)' }}
        >
          <Tabs
            activeKey={activeTab}
            onChange={setActiveTab}
            type='line'
            size='small'
            tabBarStyle={{ marginBottom: 16 }}
          >
            <TabPane
              tab={
                <span className='flex items-center gap-1.5'>
                  <IconSetting size='small' />
                  参数
                </span>
              }
              itemKey='params'
            >
              <Form
                initValues={formValues}
                onValueChange={(values) => setFormValues(prev => ({ ...prev, ...values }))}
                labelPosition='top'
              >
                {renderParamForm()}
              </Form>
            </TabPane>

            <TabPane
              tab={
                <span className='flex items-center gap-1.5'>
                  <IconCode size='small' />
                  代码
                </span>
              }
              itemKey='code'
            >
              <CodeGenerator 
                endpoint={endpoint} 
                requestBody={requestBody} 
                apiKey={localSelectedToken || formValues.api_key || 'YOUR_API_KEY'} 
              />
            </TabPane>

            {model?.parameters?.length > 0 && (
              <TabPane
                tab={
                  <span className='flex items-center gap-1.5'>
                    文档
                    <Tag size='small' type='ghost' color='blue'>{model.parameters.length}</Tag>
                  </span>
                }
                itemKey='docs'
              >
                <ModelParams model={model} />
              </TabPane>
            )}
          </Tabs>
        </div>

        {/* 右侧：响应结果 */}
        <div 
          className='w-1/2 overflow-y-auto p-5'
          style={{ background: 'var(--semi-color-fill-0)' }}
        >
          <div className='flex items-center justify-between mb-4'>
            <Text strong>响应结果</Text>
            {testResponse && (
              <div className='flex items-center gap-2'>
                <Tag 
                  color={testResponse.status >= 200 && testResponse.status < 300 ? 'green' : 'red'}
                  type='light'
                >
                  {testResponse.status} {testResponse.statusText}
                </Tag>
                {testResponse.time && (
                  <Tag type='ghost' color='blue'>{testResponse.time}ms</Tag>
                )}
              </div>
            )}
          </div>

          {renderTaskStatus()}

          {testResponse ? (
            <CodeBlock id='test-response'>
              {testResponse.error || testResponse.data}
            </CodeBlock>
          ) : (
            <div 
              className='h-64 flex flex-col items-center justify-center rounded-xl'
              style={{ 
                background: 'var(--semi-color-bg-1)',
                border: '2px dashed var(--semi-color-border)'
              }}
            >
              <div 
                className='w-14 h-14 rounded-2xl flex items-center justify-center mb-4'
                style={{ background: 'var(--semi-color-fill-1)' }}
              >
                <IconSend className='text-[var(--semi-color-text-2)]' />
              </div>
              <Text type='tertiary'>点击「发送请求」查看响应</Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestBuilder;
