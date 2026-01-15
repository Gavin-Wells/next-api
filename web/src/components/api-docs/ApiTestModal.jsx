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

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Typography,
  Tag,
  Spin,
  Modal,
  Form,
  Button,
  Select,
  Toast,
  Tabs,
  TabPane,
} from '@douyinfe/semi-ui';
import { IconPlay, IconSend } from '@douyinfe/semi-icons';
import { getVendorColor } from './constants';
import MethodBadge from './MethodBadge';
import CodeBlock from './CodeBlock';

const { Title, Text } = Typography;

const ApiTestModal = ({
  visible,
  onClose,
  model,
  endpoint,
  userTokens = [],
  userId,
  selectedTokenKey: initialSelectedTokenKey = '',
  onSelectedTokenChange,
}) => {
  const [testLoading, setTestLoading] = useState(false);
  const [testResponse, setTestResponse] = useState(null);
  const [testFormValues, setTestFormValues] = useState({});
  const [selectedTokenKey, setSelectedTokenKey] = useState(initialSelectedTokenKey);
  const [taskStatus, setTaskStatus] = useState(null);
  const [isPolling, setIsPolling] = useState(false);
  const pollingIntervalRef = useRef(null);

  // 初始化表单默认值
  useEffect(() => {
    if (model && visible) {
      const defaultValues = { 
        model: model.id,
        selected_token: selectedTokenKey || '',
        api_key: selectedTokenKey || '',
      };
      model.parameters?.forEach(param => {
        if (param.default !== undefined) {
          defaultValues[param.name] = param.default;
        }
      });
      setTestFormValues(defaultValues);
      setTestResponse(null);
      setTaskStatus(null);
    }
  }, [model, visible, selectedTokenKey]);

  // 清理轮询
  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
        pollingIntervalRef.current = null;
      }
    };
  }, []);

  const handleClose = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setIsPolling(false);
    }
    setTaskStatus(null);
    onClose();
  }, [onClose]);

  // 查询视频任务状态
  const pollVideoTaskStatus = useCallback(async (taskId, apiKey) => {
    try {
      const statusUrl = `${endpoint.endpoint}/${taskId}`;
      const response = await fetch(statusUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      const data = await response.json();
      
      if (response.ok && data.data) {
        setTaskStatus(data.data);
        
        // 如果任务完成或失败，停止轮询
        if (data.data.status === 'SUCCESS' || data.data.status === 'FAILED' || data.data.status === 'ERROR') {
          if (pollingIntervalRef.current) {
            clearInterval(pollingIntervalRef.current);
            pollingIntervalRef.current = null;
            setIsPolling(false);
          }
        }
        return data.data;
      }
    } catch (error) {
      console.error('Failed to poll task status:', error);
    }
    return null;
  }, [endpoint]);

  // 执行API测试
  const executeTest = useCallback(async () => {
    setTestLoading(true);
    setTestResponse(null);
    setTaskStatus(null);
    
    // 清除之前的轮询
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
      setIsPolling(false);
    }
    
    try {
      // 优先使用选择的 token，否则使用手动输入的
      const apiKey = testFormValues.selected_token || testFormValues.api_key;
      if (!apiKey) {
        Toast.error('请选择 Token 或输入 API Key');
        setTestLoading(false);
        return;
      }

      // 构建请求体
      const requestBody = { model: model.id };
      
      // 根据端点类型添加参数
      if (endpoint.type === 'chat') {
        requestBody.messages = [{ role: 'user', content: testFormValues.prompt || 'Hello!' }];
        if (testFormValues.temperature) requestBody.temperature = testFormValues.temperature;
        if (testFormValues.stream !== undefined) requestBody.stream = testFormValues.stream;
      } else if (endpoint.type === 'video') {
        requestBody.prompt = testFormValues.prompt || '一只猫在草地上奔跑';
        if (testFormValues.duration) requestBody.duration = parseInt(testFormValues.duration);
        if (testFormValues.resolution) requestBody.resolution = testFormValues.resolution;
        if (testFormValues.aspect_ratio) requestBody.aspect_ratio = testFormValues.aspect_ratio;
        if (testFormValues.first_frame) requestBody.first_frame = testFormValues.first_frame;
        if (testFormValues.generate_audio !== undefined) requestBody.generate_audio = testFormValues.generate_audio;
        if (testFormValues.seed) requestBody.seed = parseInt(testFormValues.seed);
        if (testFormValues.prompt_optimizer !== undefined) requestBody.prompt_optimizer = testFormValues.prompt_optimizer;
      } else if (endpoint.type === 'image') {
        requestBody.prompt = testFormValues.prompt || 'A cute cat';
        if (testFormValues.size) requestBody.size = testFormValues.size;
        if (testFormValues.n) requestBody.n = parseInt(testFormValues.n);
      } else if (endpoint.type === 'embedding') {
        requestBody.input = testFormValues.input || 'Hello, world!';
      } else if (endpoint.type === 'audio') {
        requestBody.input = testFormValues.input || 'Hello, world!';
        if (testFormValues.voice) requestBody.voice = testFormValues.voice;
      }

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
        request: requestBody,
      });

      // 如果是视频任务且返回了 task_id，开始轮询
      if (endpoint.type === 'video' && response.ok && responseData.data?.task_id) {
        const taskId = responseData.data.task_id;
        Toast.info('视频任务已提交，开始轮询状态...');
        
        // 立即查询一次
        await pollVideoTaskStatus(taskId, apiKey);
        
        // 设置轮询，每 3 秒查询一次
        setIsPolling(true);
        pollingIntervalRef.current = setInterval(() => {
          pollVideoTaskStatus(taskId, apiKey);
        }, 3000);
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
  }, [model, endpoint, testFormValues, pollVideoTaskStatus]);

  // 渲染测试表单字段
  const renderTestFormFields = () => {
    if (!model || !endpoint) return null;

    const fields = [];
    
    // Token 选择或手动输入
    if (userTokens.length > 0) {
      fields.push(
        <div key='api_key_section' className='mb-4'>
          <Text strong className='block mb-2'>API Key</Text>
          <div className='space-y-3'>
            <Select
              value={selectedTokenKey}
              placeholder='选择一个已创建的 Token'
              style={{ width: '100%' }}
              optionList={[
                { label: '-- 手动输入 --', value: '' },
                ...userTokens.map(t => ({
                  label: `${t.name} (sk-${t.key?.slice(0, 8)}...)`,
                  value: `sk-${t.key}`,
                }))
              ]}
              onChange={(value) => {
                setSelectedTokenKey(value);
                onSelectedTokenChange?.(value);
                setTestFormValues(prev => ({ ...prev, selected_token: value, api_key: value || prev.api_key }));
              }}
            />
            {!selectedTokenKey && (
              <Form.Input
                field='api_key'
                label='或手动输入 API Key'
                placeholder='sk-xxx'
              />
            )}
          </div>
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
          extraText={userId ? '您还没有创建 Token，请先到令牌管理页面创建' : '请登录后可选择您的 Token'}
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
          autosize={{ minRows: 2, maxRows: 6 }}
        />,
        <Form.InputNumber
          key='temperature'
          field='temperature'
          label='温度'
          min={0}
          max={2}
          step={0.1}
          initValue={0.7}
        />,
        <Form.Switch
          key='stream'
          field='stream'
          label='流式输出'
        />
      );
    } else if (endpoint.type === 'video') {
      fields.push(
        <Form.TextArea
          key='prompt'
          field='prompt'
          label='视频描述'
          placeholder='一只猫在草地上奔跑'
          autosize={{ minRows: 2, maxRows: 6 }}
          rules={[{ required: true, message: '请输入视频描述' }]}
        />
      );

      // 根据模型参数动态添加字段
      model.parameters?.forEach(param => {
        if (param.name === 'prompt') return; // 已添加
        
        if (param.options?.length > 0) {
          fields.push(
            <Form.Select
              key={param.name}
              field={param.name}
              label={param.description || param.name}
              initValue={param.default}
              optionList={param.options.map(o => ({ label: o, value: o }))}
            />
          );
        } else if (param.type === 'boolean') {
          fields.push(
            <Form.Switch
              key={param.name}
              field={param.name}
              label={param.description || param.name}
              initValue={param.default}
            />
          );
        } else if (param.type === 'integer') {
          fields.push(
            <Form.InputNumber
              key={param.name}
              field={param.name}
              label={param.description || param.name}
              initValue={param.default}
            />
          );
        } else if (param.type === 'string') {
          fields.push(
            <Form.Input
              key={param.name}
              field={param.name}
              label={param.description || param.name}
              placeholder={param.description}
            />
          );
        }
      });
    } else if (endpoint.type === 'image') {
      fields.push(
        <Form.TextArea
          key='prompt'
          field='prompt'
          label='图像描述'
          placeholder='A cute cat'
          autosize={{ minRows: 2, maxRows: 6 }}
          rules={[{ required: true, message: '请输入图像描述' }]}
        />,
        <Form.Select
          key='size'
          field='size'
          label='尺寸'
          initValue='1024x1024'
          optionList={
            model.supported_sizes?.map(s => ({ label: s, value: s })) ||
            [{ label: '1024x1024', value: '1024x1024' }]
          }
        />,
        <Form.InputNumber
          key='n'
          field='n'
          label='生成数量'
          min={1}
          max={4}
          initValue={1}
        />
      );
    } else if (endpoint.type === 'embedding') {
      fields.push(
        <Form.TextArea
          key='input'
          field='input'
          label='输入文本'
          placeholder='Hello, world!'
          autosize={{ minRows: 2, maxRows: 6 }}
          rules={[{ required: true, message: '请输入文本' }]}
        />
      );
    } else if (endpoint.type === 'audio') {
      fields.push(
        <Form.TextArea
          key='input'
          field='input'
          label='输入文本'
          placeholder='Hello, world!'
          autosize={{ minRows: 2, maxRows: 6 }}
          rules={[{ required: true, message: '请输入文本' }]}
        />,
        <Form.Select
          key='voice'
          field='voice'
          label='声音'
          initValue='alloy'
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

  // 渲染视频任务状态
  const renderTaskStatus = () => {
    if (!taskStatus || endpoint?.type !== 'video') return null;

    return (
      <div className='mb-4 p-4 rounded-lg border' style={{ borderColor: 'var(--semi-color-border)', background: 'var(--semi-color-bg-1)' }}>
        <div className='flex items-center justify-between mb-3'>
          <Text strong>任务状态</Text>
          <Tag 
            color={
              taskStatus.status === 'SUCCESS' ? 'green' :
              taskStatus.status === 'FAILED' || taskStatus.status === 'ERROR' ? 'red' :
              taskStatus.status === 'PROCESSING' || taskStatus.status === 'PENDING' ? 'orange' : 'grey'
            }
          >
            {taskStatus.status === 'SUCCESS' ? '已完成' :
             taskStatus.status === 'FAILED' || taskStatus.status === 'ERROR' ? '失败' :
             taskStatus.status === 'PROCESSING' ? '处理中' :
             taskStatus.status === 'PENDING' ? '等待中' : taskStatus.status}
          </Tag>
        </div>
        {taskStatus.task_id && (
          <Text type='tertiary' size='small' className='block mb-2'>
            Task ID: <code>{taskStatus.task_id}</code>
          </Text>
        )}
        {taskStatus.progress && (
          <div className='mb-2'>
            <Text type='tertiary' size='small' className='block mb-1'>进度: {taskStatus.progress}</Text>
            <div 
              className='h-2 rounded-full overflow-hidden'
              style={{ background: 'var(--semi-color-fill-0)' }}
            >
              <div 
                className='h-full transition-all duration-300'
                style={{ 
                  width: taskStatus.progress || '0%',
                  background: 'var(--semi-color-primary)'
                }}
              />
            </div>
          </div>
        )}
        {taskStatus.video_url && taskStatus.status === 'SUCCESS' && (
          <div className='mt-4'>
            <Text strong className='block mb-2'>生成的视频</Text>
            <video
              controls
              className='w-full rounded-lg'
              style={{ maxHeight: '400px', background: '#000' }}
            >
              <source src={taskStatus.video_url} type='video/mp4' />
              您的浏览器不支持视频播放
            </video>
          </div>
        )}
        {taskStatus.audio_url && taskStatus.status === 'SUCCESS' && (
          <div className='mt-3'>
            <Text strong className='block mb-2'>生成的音频</Text>
            <audio controls className='w-full'>
              <source src={taskStatus.audio_url} type='audio/mpeg' />
              您的浏览器不支持音频播放
            </audio>
          </div>
        )}
        {taskStatus.message && (
          <Text type='tertiary' size='small' className='block mt-2'>{taskStatus.message}</Text>
        )}
      </div>
    );
  };

  if (!model || !endpoint) return null;

  return (
    <Modal
      title={null}
      visible={visible}
      onCancel={handleClose}
      footer={null}
      width={900}
      style={{ maxHeight: '90vh' }}
      bodyStyle={{ padding: 0, maxHeight: 'calc(90vh - 60px)', overflow: 'hidden' }}
    >
      {/* 头部 */}
      <div 
        className='p-5 border-b'
        style={{ 
          background: 'linear-gradient(135deg, var(--semi-color-primary-light-default) 0%, var(--semi-color-fill-0) 100%)',
          borderColor: 'var(--semi-color-border)'
        }}
      >
        <div className='flex items-center justify-between flex-wrap gap-3'>
          <div className='flex items-center gap-3'>
            <div 
              className='w-10 h-10 rounded-lg flex items-center justify-center'
              style={{ background: 'var(--semi-color-primary)', color: '#fff' }}
            >
              <IconPlay />
            </div>
            <div>
              <Title heading={5} style={{ margin: 0 }}>API 测试</Title>
              <Text type='tertiary' size='small'>{model?.id}</Text>
            </div>
          </div>
          <div className='flex items-center gap-2'>
            <MethodBadge method={endpoint?.method || 'POST'} />
            <Tag color={getVendorColor(model?.vendor)} size='large'>{model?.vendor}</Tag>
          </div>
        </div>
        <div 
          className='mt-3 px-3 py-2 rounded-lg inline-flex items-center gap-2'
          style={{ background: 'var(--semi-color-bg-0)' }}
        >
          <code className='text-sm font-mono'>{endpoint?.endpoint}</code>
        </div>
      </div>

      {/* 内容区 */}
      <div className='flex h-[500px]'>
        {/* 左侧：表单 */}
        <div 
          className='w-[380px] flex-shrink-0 p-5 border-r overflow-y-auto'
          style={{ borderColor: 'var(--semi-color-border)', background: 'var(--semi-color-bg-1)' }}
        >
          <Form
            initValues={testFormValues}
            onValueChange={(values) => setTestFormValues(values)}
            labelPosition='top'
          >
            {renderTestFormFields()}
            
            <Button
              type='primary'
              theme='solid'
              icon={<IconSend />}
              loading={testLoading}
              onClick={executeTest}
              block
              size='large'
              className='mt-6'
              style={{ borderRadius: 10 }}
            >
              发送请求
            </Button>
          </Form>
        </div>

        {/* 右侧：响应 */}
        <div className='flex-1 p-5 overflow-y-auto'>
          <div className='flex items-center gap-2 mb-4'>
            <Title heading={6} style={{ margin: 0 }}>响应结果</Title>
            {testResponse && (
              <div className='flex items-center gap-2'>
                <Tag 
                  color={testResponse.status >= 200 && testResponse.status < 300 ? 'green' : 'red'}
                  size='large'
                >
                  {testResponse.status} {testResponse.statusText}
                </Tag>
                {testResponse.time && (
                  <Tag type='light' color='blue'>{testResponse.time}ms</Tag>
                )}
              </div>
            )}
            {isPolling && (
              <Tag type='light' color='orange' size='small'>
                <Spin size='small' style={{ marginRight: 4 }} />
                轮询中...
              </Tag>
            )}
          </div>
          
          {/* 视频任务状态显示 */}
          {renderTaskStatus()}
          
          {testResponse ? (
            <Tabs type='card' style={{ marginTop: 8 }}>
              <TabPane tab='响应' itemKey='response'>
                <div className='mt-3'>
                  <CodeBlock id='test-response' title='Response Body'>
                    {testResponse.error || testResponse.data}
                  </CodeBlock>
                </div>
              </TabPane>
              <TabPane tab='请求体' itemKey='request'>
                <div className='mt-3'>
                  <CodeBlock id='test-request' title='Request Body'>
                    {testResponse.request}
                  </CodeBlock>
                </div>
              </TabPane>
            </Tabs>
          ) : (
            <div 
              className='h-full flex flex-col items-center justify-center rounded-xl'
              style={{ background: 'var(--semi-color-fill-0)' }}
            >
              <IconSend size='extra-large' className='text-[var(--semi-color-text-3)] mb-4' />
              <Text type='tertiary'>点击发送请求查看响应</Text>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default ApiTestModal;

