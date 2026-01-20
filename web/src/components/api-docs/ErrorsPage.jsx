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

import React from 'react';
import { Typography, Tag } from '@douyinfe/semi-ui';
import { IconAlertTriangle, IconAlertCircle } from '@douyinfe/semi-icons';
import CodeBlock from './CodeBlock';

const { Title, Text, Paragraph } = Typography;

const httpStatusCodes = [
  { code: '200', desc: '请求成功', detail: '服务器成功处理了请求', color: 'green' },
  { code: '400', desc: '请求参数错误', detail: '请求体格式不正确或缺少必要参数', color: 'orange' },
  { code: '401', desc: '未授权', detail: 'API Key 无效或已过期', color: 'red' },
  { code: '403', desc: '无权限', detail: '配额不足或无访问权限', color: 'orange' },
  { code: '404', desc: '资源不存在', detail: '请求的模型或资源未找到', color: 'amber' },
  { code: '429', desc: '请求频率超限', detail: '短时间内请求次数过多，请稍后重试', color: 'violet' },
  { code: '500', desc: '服务器错误', detail: '服务器内部错误，请联系支持', color: 'red' },
  { code: '502', desc: '网关错误', detail: '上游服务暂时不可用', color: 'indigo' },
  { code: '503', desc: '服务不可用', detail: '服务暂时维护中', color: 'grey' },
];

const ErrorsPage = () => {
  return (
    <div className='space-y-8'>
      {/* Hero Section */}
      <div 
        className='p-8 rounded-3xl relative overflow-hidden'
        style={{ 
          background: 'linear-gradient(135deg, #ff6b6b 0%, #ee5a24 50%, #f39c12 100%)',
        }}
      >
        <div className='absolute inset-0 overflow-hidden pointer-events-none'>
          <div 
            className='absolute -right-20 -top-20 w-64 h-64 rounded-full'
            style={{ background: 'rgba(255,255,255,0.1)' }}
          />
          <div 
            className='absolute left-1/3 -bottom-20 w-48 h-48 rounded-full'
            style={{ background: 'rgba(255,255,255,0.05)' }}
          />
        </div>
        
        <div className='relative z-10 flex items-center gap-6'>
          <div 
            className='w-16 h-16 rounded-2xl flex items-center justify-center'
            style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}
          >
            <IconAlertTriangle size='extra-large' style={{ color: '#fff' }} />
          </div>
          <div>
            <Title heading={2} style={{ margin: 0, color: '#fff' }}>错误处理</Title>
            <Text style={{ color: 'rgba(255,255,255,0.9)' }}>
              了解 API 错误响应格式和常见错误码
            </Text>
          </div>
        </div>
      </div>

      {/* 错误响应格式 */}
      <div>
        <div className='flex items-center gap-3 mb-5'>
          <div 
            className='w-1.5 h-7 rounded-full'
            style={{ background: 'linear-gradient(180deg, var(--semi-color-danger) 0%, var(--semi-color-danger-active) 100%)' }}
          />
          <Title heading={3} style={{ margin: 0 }}>错误响应格式</Title>
        </div>
        
        <div 
          className='p-6 rounded-2xl border'
          style={{ borderColor: 'var(--semi-color-border)', background: 'var(--semi-color-bg-1)' }}
        >
          <Paragraph type='secondary' className='mb-4'>
            当请求失败时，API 将返回包含错误信息的 JSON 响应：
          </Paragraph>
          <CodeBlock id='error-format' language='json'>
{`{
  "error": {
    "message": "错误描述信息",
    "type": "invalid_request_error",
    "param": "model",
    "code": "model_not_found"
  }
}`}
          </CodeBlock>
          
          <div className='mt-6 grid grid-cols-1 md:grid-cols-2 gap-4'>
            <div className='p-4 rounded-xl' style={{ background: 'var(--semi-color-fill-0)' }}>
              <Text strong className='block mb-2'>message</Text>
              <Text type='tertiary' size='small'>人类可读的错误描述</Text>
            </div>
            <div className='p-4 rounded-xl' style={{ background: 'var(--semi-color-fill-0)' }}>
              <Text strong className='block mb-2'>type</Text>
              <Text type='tertiary' size='small'>错误类型，如 invalid_request_error</Text>
            </div>
            <div className='p-4 rounded-xl' style={{ background: 'var(--semi-color-fill-0)' }}>
              <Text strong className='block mb-2'>param</Text>
              <Text type='tertiary' size='small'>导致错误的参数名（如适用）</Text>
            </div>
            <div className='p-4 rounded-xl' style={{ background: 'var(--semi-color-fill-0)' }}>
              <Text strong className='block mb-2'>code</Text>
              <Text type='tertiary' size='small'>机器可读的错误代码</Text>
            </div>
          </div>
        </div>
      </div>

      {/* HTTP 状态码 */}
      <div>
        <div className='flex items-center gap-3 mb-5'>
          <div 
            className='w-1.5 h-7 rounded-full'
            style={{ background: 'linear-gradient(180deg, var(--semi-color-warning) 0%, var(--semi-color-warning-active) 100%)' }}
          />
          <Title heading={3} style={{ margin: 0 }}>HTTP 状态码</Title>
        </div>
        
        <div className='space-y-3'>
          {httpStatusCodes.map((err) => (
            <div 
              key={err.code} 
              className='p-4 rounded-xl border flex items-center gap-4 transition-all hover:shadow-md'
              style={{ 
                borderColor: 'var(--semi-color-border)', 
                background: 'var(--semi-color-bg-1)' 
              }}
            >
              <Tag 
                color={err.color} 
                size='large'
                style={{ 
                  minWidth: 56, 
                  justifyContent: 'center',
                  fontWeight: 600,
                  fontFamily: 'monospace'
                }}
              >
                {err.code}
              </Tag>
              <div className='flex-1'>
                <Text strong className='block'>{err.desc}</Text>
                <Text type='tertiary' size='small'>{err.detail}</Text>
              </div>
              {err.code.startsWith('4') && (
                <IconAlertCircle className='text-[var(--semi-color-warning)] flex-shrink-0' />
              )}
              {err.code.startsWith('5') && (
                <IconAlertTriangle className='text-[var(--semi-color-danger)] flex-shrink-0' />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 错误处理建议 */}
      <div>
        <div className='flex items-center gap-3 mb-5'>
          <div 
            className='w-1.5 h-7 rounded-full'
            style={{ background: 'linear-gradient(180deg, var(--semi-color-success) 0%, var(--semi-color-success-active) 100%)' }}
          />
          <Title heading={3} style={{ margin: 0 }}>错误处理建议</Title>
        </div>
        
        <div 
          className='p-6 rounded-2xl border'
          style={{ borderColor: 'var(--semi-color-border)', background: 'var(--semi-color-bg-1)' }}
        >
          <CodeBlock id='error-handling-example' language='javascript'>
{`try {
  const response = await fetch('/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer YOUR_API_KEY'
    },
    body: JSON.stringify({ model: 'gpt-4o', messages: [...] })
  });

  if (!response.ok) {
    const error = await response.json();
    
    switch (response.status) {
      case 401:
        // API Key 无效，提示用户检查
        console.error('API Key 无效');
        break;
      case 429:
        // 速率限制，使用指数退避重试
        await sleep(Math.pow(2, retryCount) * 1000);
        break;
      case 500:
        // 服务器错误，稍后重试
        break;
      default:
        console.error(error.error?.message);
    }
  }
} catch (error) {
  // 网络错误处理
  console.error('网络请求失败:', error);
}`}
          </CodeBlock>
        </div>
      </div>
    </div>
  );
};

export default ErrorsPage;
