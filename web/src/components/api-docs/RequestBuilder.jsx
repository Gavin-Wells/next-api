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
  Switch,
  InputNumber,
  Divider,
  Collapse,
  Spin,
  Toast,
} from '@douyinfe/semi-ui';
import { IconSend, IconSetting } from '@douyinfe/semi-icons';
import { getVendorColor } from './constants';
import CodeGenerator from './CodeGenerator';
import CodeBlock from './CodeBlock';

const { Title, Text } = Typography;

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
      if (formValues.prompt) body.prompt = formValues.prompt;
      if (formValues.duration) body.duration = parseInt(formValues.duration);
      if (formValues.resolution) body.resolution = formValues.resolution;
      if (formValues.aspect_ratio) body.aspect_ratio = formValues.aspect_ratio;
      if (formValues.first_frame) body.first_frame = formValues.first_frame;
      if (formValues.last_frame) body.last_frame = formValues.last_frame;
      // 处理参考图片列表
      if (formValues.images) {
        const imageUrls = formValues.images.split('\n').map(url => url.trim()).filter(url => url);
        if (imageUrls.length > 0) body.images = imageUrls;
      }
      if (formValues.generate_audio !== undefined) body.generate_audio = formValues.generate_audio;
      if (formValues.seed) body.seed = parseInt(formValues.seed);
      if (formValues.prompt_optimizer !== undefined) body.prompt_optimizer = formValues.prompt_optimizer;
      // MJ Video 特定参数
      if (formValues.motion) body.motion = formValues.motion;
      if (formValues.image) body.image = formValues.image;
      if (formValues.notifyHook) body.notifyHook = formValues.notifyHook;
      // Vidu 特定参数
      if (formValues.movement_amplitude) body.movement_amplitude = formValues.movement_amplitude;
      if (formValues.style) body.style = formValues.style;
      // 通用额外参数
      if (formValues.watermark !== undefined) body.watermark = formValues.watermark;
      if (formValues.private !== undefined) body.private = formValues.private;
      if (formValues.hd !== undefined) body.hd = formValues.hd;
      if (formValues.aigc_watermark !== undefined) body.aigc_watermark = formValues.aigc_watermark;
    } else if (endpoint.type === 'image') {
      body.prompt = formValues.prompt || 'A cute cat';
      if (formValues.size) body.size = formValues.size;
      if (formValues.n) body.n = parseInt(formValues.n);
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
      <div className='mb-3 rounded-xl border overflow-hidden' style={{ borderColor: 'var(--semi-color-border)', background: 'var(--semi-color-bg-1)' }}>
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
              Task ID: <code>{taskId}</code>
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
                style={{ maxHeight: '360px', background: '#000' }}
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
          {taskStatus.message && !errorMessage && (
            <Text type='tertiary' size='small' className='block'>{taskStatus.message}</Text>
          )}
        </div>
      </div>
    );
  };

  // 渲染参数表单
  const renderParamForm = () => {
    const fields = [];

    // API Key 选择
    if (userTokens.length > 0) {
      fields.push(
        <div key='api_key_section' className='mb-4'>
          <Text strong size='small' className='block mb-2'>API Key</Text>
          <Select
            value={localSelectedToken}
            placeholder='选择一个 Token'
            style={{ width: '100%' }}
            size='small'
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
              size='small'
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
          size='small'
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
          autosize={{ minRows: 2, maxRows: 4 }}
          size='small'
        />,
        <div key='chat-params' className='grid grid-cols-2 gap-3'>
          <Form.InputNumber
            field='temperature'
            label='Temperature'
            min={0}
            max={2}
            step={0.1}
            size='small'
          />
          <Form.InputNumber
            field='max_tokens'
            label='Max Tokens'
            min={1}
            max={128000}
            size='small'
          />
        </div>,
        <Form.Switch
          key='stream'
          field='stream'
          label='流式输出'
          size='small'
        />
      );
    } else if (endpoint.type === 'video') {
      fields.push(
        <Form.TextArea
          key='prompt'
          field='prompt'
          label='视频描述'
          placeholder='一只猫在草地上奔跑'
          autosize={{ minRows: 2, maxRows: 4 }}
          size='small'
        />
      );
      
      // 添加模型特定的参数
      if (model?.supported_durations?.length > 0) {
        fields.push(
          <Form.Select
            key='duration'
            field='duration'
            label='时长'
            size='small'
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
            size='small'
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
            size='small'
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
            size='small'
          />
        );
      }
      // 根据模型参数动态添加首帧、尾帧、参考图字段
      const hasFirstFrame = model?.parameters?.some(p => p.name === 'first_frame');
      const hasLastFrame = model?.parameters?.some(p => p.name === 'last_frame');
      const hasImages = model?.parameters?.some(p => p.name === 'images');
      
      if (hasFirstFrame) {
        fields.push(
          <Form.Input
            key='first_frame'
            field='first_frame'
            label='首帧图片 URL'
            placeholder='https://example.com/first.jpg'
            size='small'
            extraText='图生视频时的首帧图片'
          />
        );
      }
      if (hasLastFrame) {
        fields.push(
          <Form.Input
            key='last_frame'
            field='last_frame'
            label='尾帧图片 URL'
            placeholder='https://example.com/last.jpg'
            size='small'
            extraText='首尾帧生成时的尾帧图片'
          />
        );
      }
      if (hasImages) {
        fields.push(
          <Form.TextArea
            key='images'
            field='images'
            label='参考图片 URL'
            placeholder='每行一个图片URL，最多4张&#10;https://example.com/ref1.jpg&#10;https://example.com/ref2.jpg'
            autosize={{ minRows: 2, maxRows: 4 }}
            size='small'
            extraText='参考图模式，可输入1-4张图片URL'
          />
        );
      }
      // MJ Video 特定参数
      const hasMotion = model?.parameters?.some(p => p.name === 'motion');
      const hasImage = model?.parameters?.some(p => p.name === 'image');
      // Vidu 特定参数
      const hasMovementAmplitude = model?.parameters?.some(p => p.name === 'movement_amplitude');
      
      if (hasMotion) {
        fields.push(
          <Form.Select
            key='motion'
            field='motion'
            label='动态程度'
            size='small'
            optionList={[
              { label: '低动态 (low)', value: 'low' },
              { label: '高动态 (high)', value: 'high' }
            ]}
            extraText='控制视频动态效果强度'
          />
        );
      }
      if (hasImage) {
        fields.push(
          <Form.Input
            key='image'
            field='image'
            label='首帧图片'
            placeholder='https://example.com/image.jpg 或 Base64'
            size='small'
            extraText='MJ Video 首帧图片 URL 或 Base64'
          />
        );
      }
      if (hasMovementAmplitude) {
        fields.push(
          <Form.Select
            key='movement_amplitude'
            field='movement_amplitude'
            label='运动幅度'
            size='small'
            optionList={[
              { label: '自动 (auto)', value: 'auto' },
              { label: '小 (small)', value: 'small' },
              { label: '中 (medium)', value: 'medium' },
              { label: '大 (large)', value: 'large' }
            ]}
            extraText='Vidu 视频运动幅度控制'
          />
        );
      }
      // Vidu 风格参数
      const hasStyle = model?.parameters?.some(p => p.name === 'style');
      if (hasStyle) {
        const styleParam = model.parameters.find(p => p.name === 'style');
        fields.push(
          <Form.Select
            key='style'
            field='style'
            label='视频风格'
            size='small'
            optionList={
              styleParam?.options?.map(s => ({
                label: s === 'general' ? '通用 (general)' : s === 'anime' ? '动漫 (anime)' : s,
                value: s
              })) || [
                { label: '通用 (general)', value: 'general' },
                { label: '动漫 (anime)', value: 'anime' }
              ]
            }
            extraText='Vidu 视频风格'
          />
        );
      }
    } else if (endpoint.type === 'image') {
      fields.push(
        <Form.TextArea
          key='prompt'
          field='prompt'
          label='图像描述'
          placeholder='A cute cat'
          autosize={{ minRows: 2, maxRows: 4 }}
          size='small'
        />,
        <div key='image-params' className='grid grid-cols-2 gap-3'>
          <Form.Select
            field='size'
            label='尺寸'
            size='small'
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
            size='small'
          />
        </div>
      );
    } else if (endpoint.type === 'embedding') {
      fields.push(
        <Form.TextArea
          key='input'
          field='input'
          label='输入文本'
          placeholder='Hello, world!'
          autosize={{ minRows: 2, maxRows: 4 }}
          size='small'
        />
      );
    } else if (endpoint.type === 'audio') {
      fields.push(
        <Form.TextArea
          key='input'
          field='input'
          label='输入文本'
          placeholder='Hello, world!'
          autosize={{ minRows: 2, maxRows: 4 }}
          size='small'
        />,
        <Form.Select
          key='voice'
          field='voice'
          label='声音'
          size='small'
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
        className='h-full flex flex-col items-center justify-center rounded-xl m-4'
        style={{ background: 'var(--semi-color-fill-0)', border: '1px dashed var(--semi-color-border)' }}
      >
        <IconSetting size='extra-large' className='text-[var(--semi-color-text-3)] mb-4' />
        <Text type='tertiary'>请从左侧选择一个模型</Text>
      </div>
    );
  }

  return (
    <div className='h-full flex flex-col overflow-hidden min-h-0'>
      {/* 模型信息头部 */}
      <div 
        className='p-4 border-b flex-shrink-0'
        style={{ 
          background: 'var(--semi-color-primary-light-default)',
          borderColor: 'var(--semi-color-border)'
        }}
      >
        <div className='flex items-center justify-between gap-3 flex-wrap'>
          <div>
            <code 
              className='px-3 py-1.5 rounded-lg font-semibold text-sm'
              style={{ 
                background: `var(--semi-color-${getVendorColor(model.vendor)}-light-default)`,
                color: `var(--semi-color-${getVendorColor(model.vendor)})`
              }}
            >
              {model.id}
            </code>
          </div>
          <div className='flex items-center gap-2'>
            <Tag type='solid' color={getVendorColor(model.vendor)} size='small'>
              {model.vendor}
            </Tag>
            <Tag color='blue' size='small'>{endpoint.method}</Tag>
          </div>
        </div>
        <Text type='tertiary' size='small' className='mt-2 block truncate'>
          {endpoint.endpoint}
        </Text>
      </div>

      {/* 主内容区 - 可滚动 */}
      <div className='flex-1 overflow-y-auto p-4 space-y-4 min-h-0'>
        {/* 参数配置 */}
        <Collapse defaultActiveKey={['params', 'code']} keepDOM>
          <Collapse.Panel
            header={
              <div className='flex items-center gap-2'>
                <IconSetting size='small' />
                <Text strong size='small'>参数配置</Text>
              </div>
            }
            itemKey='params'
          >
            <Form
              initValues={formValues}
              onValueChange={(values) => setFormValues(prev => ({ ...prev, ...values }))}
              labelPosition='top'
              className='pt-2'
            >
              {renderParamForm()}
            </Form>
          </Collapse.Panel>

          <Collapse.Panel
            header={<Text strong size='small'>请求代码</Text>}
            itemKey='code'
          >
            <div className='pt-2'>
              <CodeGenerator 
                endpoint={endpoint} 
                requestBody={requestBody} 
                apiKey={localSelectedToken || formValues.api_key || 'YOUR_API_KEY'} 
              />
            </div>
          </Collapse.Panel>
          {endpoint.request?.example && (
            <Collapse.Panel
              header={<Text strong size='small'>请求/响应示例</Text>}
              itemKey='examples'
            >
              <div className='grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2'>
                <div>
                  <Text type='tertiary' size='small' className='block mb-2'>请求示例</Text>
                  <CodeBlock id={`example-req-${endpoint.type}`}>{endpoint.request?.example}</CodeBlock>
                </div>
                <div>
                  <Text type='tertiary' size='small' className='block mb-2'>响应示例</Text>
                  <CodeBlock id={`example-res-${endpoint.type}`}>{endpoint.response?.example}</CodeBlock>
                </div>
              </div>
            </Collapse.Panel>
          )}
        </Collapse>

        <Divider />

        {/* 测试区域 */}
        <div>
          <div className='flex items-center justify-between mb-3'>
            <Title heading={6} style={{ margin: 0 }}>API 测试</Title>
            <Button
              type='primary'
              theme='solid'
              icon={<IconSend />}
              loading={testLoading}
              onClick={executeTest}
              size='small'
            >
              发送请求
            </Button>
          </div>

          {renderTaskStatus()}

          {testResponse ? (
            <div className='space-y-3'>
              <div className='flex items-center gap-2'>
                <Tag 
                  color={testResponse.status >= 200 && testResponse.status < 300 ? 'green' : 'red'}
                >
                  {testResponse.status} {testResponse.statusText}
                </Tag>
                {testResponse.time && (
                  <Tag type='light' color='blue'>{testResponse.time}ms</Tag>
                )}
              </div>
              <CodeBlock id='test-response' title='响应'>
                {testResponse.error || testResponse.data}
              </CodeBlock>
            </div>
          ) : (
            <div 
              className='p-8 flex flex-col items-center justify-center rounded-xl'
              style={{ background: 'var(--semi-color-fill-0)' }}
            >
              <IconSend size='large' className='text-[var(--semi-color-text-3)] mb-2' />
              <Text type='tertiary' size='small'>点击发送请求查看响应</Text>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RequestBuilder;

