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
import { IconCode, IconServer, IconKey } from '@douyinfe/semi-icons';
import { endpointMeta, endpointColorMap } from './constants';
import CodeBlock from './CodeBlock';
import MethodBadge from './MethodBadge';

const { Title, Text, Paragraph } = Typography;

const OverviewSection = ({ systemName, config, onEndpointClick }) => {
  return (
    <div className='space-y-8'>
      {/* Hero Section */}
      <div 
        className='p-8 rounded-2xl relative overflow-hidden'
        style={{ 
          background: 'linear-gradient(135deg, var(--semi-color-primary) 0%, var(--semi-color-primary-active) 100%)',
        }}
      >
        <div className='relative z-10'>
          <Title heading={1} style={{ marginBottom: 12, color: '#fff' }}>
            🚀 {systemName}
          </Title>
          <Paragraph style={{ marginBottom: 20, color: 'rgba(255,255,255,0.9)', fontSize: 16 }}>
            强大的 AI 模型 API 服务，支持聊天、图像生成、视频生成等多种功能。<br/>
            兼容 OpenAI API 格式，轻松集成到您的应用中。
          </Paragraph>
          <div className='flex items-center gap-3 flex-wrap'>
            <Tag size='large' style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}>
              <IconServer className='mr-1' /> RESTful API
            </Tag>
            <Tag size='large' style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}>
              <IconKey className='mr-1' /> Bearer Token 认证
            </Tag>
            <Tag size='large' style={{ background: 'rgba(255,255,255,0.2)', color: '#fff', border: 'none' }}>
              <IconCode className='mr-1' /> OpenAI 兼容
            </Tag>
          </div>
        </div>
        {/* 装饰元素 */}
        <div 
          className='absolute -right-20 -top-20 w-64 h-64 rounded-full opacity-20'
          style={{ background: 'white' }}
        />
        <div 
          className='absolute -right-10 -bottom-10 w-40 h-40 rounded-full opacity-10'
          style={{ background: 'white' }}
        />
      </div>

      {/* 快速开始 */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-6'>
        <div 
          className='p-6 rounded-xl border-2 transition-all hover:shadow-lg'
          style={{ borderColor: 'var(--semi-color-primary-light-default)', background: 'var(--semi-color-bg-1)' }}
        >
          <div className='flex items-center gap-3 mb-4'>
            <div 
              className='w-10 h-10 rounded-lg flex items-center justify-center'
              style={{ background: 'var(--semi-color-primary-light-default)' }}
            >
              <IconServer className='text-[var(--semi-color-primary)]' />
            </div>
            <Title heading={5} style={{ margin: 0 }}>Base URL</Title>
          </div>
          <CodeBlock id='base-url' title='API 基础地址'>{window.location.origin}</CodeBlock>
        </div>
        <div 
          className='p-6 rounded-xl border-2 transition-all hover:shadow-lg'
          style={{ borderColor: 'var(--semi-color-success-light-default)', background: 'var(--semi-color-bg-1)' }}
        >
          <div className='flex items-center gap-3 mb-4'>
            <div 
              className='w-10 h-10 rounded-lg flex items-center justify-center'
              style={{ background: 'var(--semi-color-success-light-default)' }}
            >
              <IconKey className='text-[var(--semi-color-success)]' />
            </div>
            <Title heading={5} style={{ margin: 0 }}>认证方式</Title>
          </div>
          <CodeBlock id='auth' title='请求头'>{`Authorization: Bearer YOUR_API_KEY`}</CodeBlock>
        </div>
      </div>

      {/* 可用端点 */}
      <div>
        <div className='flex items-center gap-3 mb-6'>
          <div 
            className='w-1 h-6 rounded-full'
            style={{ background: 'var(--semi-color-primary)' }}
          />
          <Title heading={3} style={{ margin: 0 }}>可用端点</Title>
          <Tag color='blue' size='small'>{config?.endpoints?.length || 0} 个</Tag>
        </div>
        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5'>
          {config?.endpoints?.map((endpoint) => {
            const meta = endpointMeta[endpoint.type] || { icon: IconCode, label: endpoint.name };
            const Icon = meta.icon;
            const color = endpointColorMap[endpoint.type] || 'grey';
            return (
              <div
                key={endpoint.type}
                className='p-5 rounded-xl border-2 cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1'
                style={{ 
                  borderColor: `var(--semi-color-${color}-light-default)`, 
                  background: 'var(--semi-color-bg-1)' 
                }}
                onClick={() => onEndpointClick(endpoint.type)}
              >
                <div className='flex items-start justify-between mb-4'>
                  <div 
                    className='w-12 h-12 rounded-xl flex items-center justify-center'
                    style={{ background: `var(--semi-color-${color}-light-default)` }}
                  >
                    <Icon size='large' style={{ color: `var(--semi-color-${color})` }} />
                  </div>
                  <Tag color={color} type='light' size='small'>
                    {endpoint.models?.length || 0} 模型
                  </Tag>
                </div>
                <Text strong className='text-lg block mb-1'>{endpoint.name}</Text>
                <Text type='tertiary' size='small' className='block mb-3'>
                  {endpoint.description || '支持多种模型'}
                </Text>
                <div 
                  className='px-3 py-1.5 rounded-lg inline-flex items-center gap-2'
                  style={{ background: 'var(--semi-color-fill-0)' }}
                >
                  <MethodBadge method={endpoint.method} />
                  <code className='text-xs'>{endpoint.endpoint}</code>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OverviewSection;

