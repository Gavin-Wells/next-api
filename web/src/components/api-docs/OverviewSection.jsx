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

import React, { useState, useCallback } from 'react';
import { Typography, Tag, Tooltip, Button } from '@douyinfe/semi-ui';
import { 
  IconCode, 
  IconServer, 
  IconKey, 
  IconCopy, 
  IconTick,
  IconArrowRight,
  IconBolt,
} from '@douyinfe/semi-icons';
import { endpointMeta, endpointColorMap } from './constants';
import CodeBlock from './CodeBlock';
import MethodBadge from './MethodBadge';

const { Title, Text, Paragraph } = Typography;

// 复制按钮组件
const CopyButton = ({ text, size = 'small' }) => {
  const [copied, setCopied] = useState(false);
  
  const handleCopy = useCallback((e) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [text]);

  return (
    <Tooltip content={copied ? '已复制!' : '点击复制'}>
      <Button
        icon={copied ? <IconTick /> : <IconCopy />}
        size={size}
        type='tertiary'
        theme='borderless'
        onClick={handleCopy}
        style={{ color: copied ? 'var(--semi-color-success)' : undefined }}
      />
    </Tooltip>
  );
};

const OverviewSection = ({ systemName, config, onEndpointClick }) => {
  const baseUrl = window.location.origin;

  return (
    <div className='space-y-8'>
      {/* Hero Section - 更现代的渐变设计 */}
      <div 
        className='p-8 lg:p-10 rounded-3xl relative overflow-hidden'
        style={{ 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%)',
        }}
      >
        {/* 背景装饰 */}
        <div className='absolute inset-0 overflow-hidden pointer-events-none'>
          <div 
            className='absolute -right-20 -top-20 w-80 h-80 rounded-full'
            style={{ background: 'rgba(255,255,255,0.1)' }}
          />
          <div 
            className='absolute left-1/2 -bottom-32 w-96 h-96 rounded-full'
            style={{ background: 'rgba(255,255,255,0.05)' }}
          />
          <div 
            className='absolute right-1/3 top-1/2 w-40 h-40 rounded-full'
            style={{ background: 'rgba(255,255,255,0.08)' }}
          />
        </div>

        <div className='relative z-10'>
          <div className='flex items-center gap-3 mb-4'>
            <div 
              className='w-12 h-12 rounded-2xl flex items-center justify-center'
              style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}
            >
              <IconBolt size='large' style={{ color: '#fff' }} />
            </div>
            <Tag 
              size='large' 
              style={{ 
                background: 'rgba(255,255,255,0.2)', 
                color: '#fff', 
                border: 'none',
                backdropFilter: 'blur(10px)'
              }}
            >
              API 文档
            </Tag>
          </div>
          
          <Title heading={1} style={{ marginBottom: 16, color: '#fff', fontSize: 36 }}>
            {systemName}
          </Title>
          <Paragraph style={{ marginBottom: 24, color: 'rgba(255,255,255,0.9)', fontSize: 18, maxWidth: 600 }}>
            强大的 AI 模型 API 服务，支持聊天、图像生成、视频生成等多种功能。
            兼容 OpenAI API 格式，轻松集成到您的应用中。
          </Paragraph>
          
          <div className='flex items-center gap-3 flex-wrap'>
            <Tag 
              size='large' 
              style={{ 
                background: 'rgba(255,255,255,0.15)', 
                color: '#fff', 
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <IconServer className='mr-2' /> RESTful API
            </Tag>
            <Tag 
              size='large' 
              style={{ 
                background: 'rgba(255,255,255,0.15)', 
                color: '#fff', 
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <IconKey className='mr-2' /> Bearer Token
            </Tag>
            <Tag 
              size='large' 
              style={{ 
                background: 'rgba(255,255,255,0.15)', 
                color: '#fff', 
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(10px)'
              }}
            >
              <IconCode className='mr-2' /> OpenAI 兼容
            </Tag>
          </div>
        </div>
      </div>

      {/* 快速开始 */}
      <div>
        <div className='flex items-center gap-3 mb-6'>
          <div 
            className='w-1.5 h-7 rounded-full'
            style={{ background: 'linear-gradient(180deg, var(--semi-color-primary) 0%, var(--semi-color-primary-active) 100%)' }}
          />
          <Title heading={3} style={{ margin: 0 }}>快速开始</Title>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-5'>
          {/* Base URL 卡片 */}
          <div 
            className='p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg group'
            style={{ 
              borderColor: 'var(--semi-color-border)', 
              background: 'var(--semi-color-bg-1)' 
            }}
          >
            <div className='flex items-center justify-between mb-4'>
              <div className='flex items-center gap-3'>
                <div 
                  className='w-11 h-11 rounded-xl flex items-center justify-center'
                  style={{ background: 'var(--semi-color-primary-light-default)' }}
                >
                  <IconServer className='text-[var(--semi-color-primary)]' />
                </div>
                <div>
                  <Title heading={5} style={{ margin: 0 }}>API 基础地址</Title>
                  <Text type='tertiary' size='small'>Base URL</Text>
                </div>
              </div>
              <CopyButton text={baseUrl} />
            </div>
            <code 
              className='block px-4 py-3 rounded-xl text-sm font-mono break-all'
              style={{ 
                background: 'var(--semi-color-fill-0)',
                color: 'var(--semi-color-primary)'
              }}
            >
              {baseUrl}
            </code>
          </div>

          {/* 认证方式卡片 */}
          <div 
            className='p-6 rounded-2xl border transition-all duration-300 hover:shadow-lg group'
            style={{ 
              borderColor: 'var(--semi-color-border)', 
              background: 'var(--semi-color-bg-1)' 
            }}
          >
            <div className='flex items-center justify-between mb-4'>
              <div className='flex items-center gap-3'>
                <div 
                  className='w-11 h-11 rounded-xl flex items-center justify-center'
                  style={{ background: 'var(--semi-color-success-light-default)' }}
                >
                  <IconKey className='text-[var(--semi-color-success)]' />
                </div>
                <div>
                  <Title heading={5} style={{ margin: 0 }}>认证方式</Title>
                  <Text type='tertiary' size='small'>Authorization Header</Text>
                </div>
              </div>
              <CopyButton text='Authorization: Bearer YOUR_API_KEY' />
            </div>
            <code 
              className='block px-4 py-3 rounded-xl text-sm font-mono break-all'
              style={{ 
                background: 'var(--semi-color-fill-0)',
                color: 'var(--semi-color-success)'
              }}
            >
              Authorization: Bearer YOUR_API_KEY
            </code>
          </div>
        </div>
      </div>

      {/* 示例代码 */}
      <div>
        <div className='flex items-center gap-3 mb-6'>
          <div 
            className='w-1.5 h-7 rounded-full'
            style={{ background: 'linear-gradient(180deg, var(--semi-color-warning) 0%, var(--semi-color-warning-active) 100%)' }}
          />
          <Title heading={3} style={{ margin: 0 }}>示例代码</Title>
        </div>

        <div 
          className='p-6 rounded-2xl border'
          style={{ borderColor: 'var(--semi-color-border)', background: 'var(--semi-color-bg-1)' }}
        >
          <CodeBlock id='quick-start-example' language='bash'>
{`curl ${baseUrl}/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -d '{
    "model": "gpt-4o",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'`}
          </CodeBlock>
        </div>
      </div>

      {/* 可用端点 */}
      <div>
        <div className='flex items-center justify-between mb-6'>
          <div className='flex items-center gap-3'>
            <div 
              className='w-1.5 h-7 rounded-full'
              style={{ background: 'linear-gradient(180deg, var(--semi-color-tertiary) 0%, var(--semi-color-tertiary-active) 100%)' }}
            />
            <Title heading={3} style={{ margin: 0 }}>可用端点</Title>
            <Tag color='blue' size='small' type='light'>{config?.endpoints?.length || 0} 个</Tag>
          </div>
        </div>
        
        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'>
          {config?.endpoints?.map((endpoint) => {
            const meta = endpointMeta[endpoint.type] || { icon: IconCode, label: endpoint.name };
            const Icon = meta.icon;
            const color = endpointColorMap[endpoint.type] || 'grey';
            
            return (
              <div
                key={endpoint.type}
                className='group p-5 rounded-2xl border-2 cursor-pointer transition-all duration-300 hover:shadow-xl hover:-translate-y-1'
                style={{ 
                  borderColor: 'var(--semi-color-border)', 
                  background: 'var(--semi-color-bg-1)' 
                }}
                onClick={() => onEndpointClick(endpoint.type)}
              >
                <div className='flex items-start justify-between mb-4'>
                  <div 
                    className='w-14 h-14 rounded-2xl flex items-center justify-center transition-all duration-300 group-hover:scale-110'
                    style={{ 
                      background: `linear-gradient(135deg, var(--semi-color-${color}) 0%, var(--semi-color-${color}-active) 100%)`,
                      boxShadow: `0 4px 16px rgba(var(--semi-color-${color}-rgb), 0.25)`
                    }}
                  >
                    <Icon size='large' style={{ color: '#fff' }} />
                  </div>
                  <Tag color={color} type='light' size='small'>
                    {endpoint.models?.length || 0} 模型
                  </Tag>
                </div>
                
                <Text strong className='text-lg block mb-2'>{endpoint.name}</Text>
                <Text type='tertiary' size='small' className='block mb-4 line-clamp-2'>
                  {endpoint.description || '支持多种模型'}
                </Text>
                
                <div 
                  className='px-3 py-2 rounded-xl flex items-center justify-between group-hover:bg-[var(--semi-color-fill-1)] transition-colors'
                  style={{ background: 'var(--semi-color-fill-0)' }}
                >
                  <div className='flex items-center gap-2'>
                    <MethodBadge method={endpoint.method} />
                    <code className='text-xs'>{endpoint.endpoint}</code>
                  </div>
                  <IconArrowRight 
                    size='small' 
                    className='text-[var(--semi-color-text-2)] opacity-0 group-hover:opacity-100 transition-opacity'
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 统计信息 */}
      <div 
        className='p-6 rounded-2xl'
        style={{ 
          background: 'linear-gradient(135deg, var(--semi-color-fill-0) 0%, var(--semi-color-fill-1) 100%)'
        }}
      >
        <div className='grid grid-cols-2 md:grid-cols-4 gap-6 text-center'>
          <div>
            <Text strong className='text-3xl block mb-1' style={{ color: 'var(--semi-color-primary)' }}>
              {config?.endpoints?.length || 0}
            </Text>
            <Text type='tertiary' size='small'>API 端点</Text>
          </div>
          <div>
            <Text strong className='text-3xl block mb-1' style={{ color: 'var(--semi-color-success)' }}>
              {config?.endpoints?.reduce((acc, e) => acc + (e.models?.length || 0), 0) || 0}
            </Text>
            <Text type='tertiary' size='small'>可用模型</Text>
          </div>
          <div>
            <Text strong className='text-3xl block mb-1' style={{ color: 'var(--semi-color-warning)' }}>
              {[...new Set(config?.endpoints?.flatMap(e => e.models?.map(m => m.vendor) || []))].length || 0}
            </Text>
            <Text type='tertiary' size='small'>供应商</Text>
          </div>
          <div>
            <Text strong className='text-3xl block mb-1' style={{ color: 'var(--semi-color-tertiary)' }}>
              24/7
            </Text>
            <Text type='tertiary' size='small'>服务可用</Text>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewSection;
