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
import {
  IconInfoCircle,
  IconKey,
  IconPlayCircle,
  IconServer,
  IconAlertTriangle,
  IconTick,
  IconBolt,
  IconClock,
} from '@douyinfe/semi-icons';
import CodeBlock from './CodeBlock';

const { Title, Text, Paragraph } = Typography;

const notes = [
  { 
    title: 'API Key 安全', 
    content: '请妥善保管您的 API Key，不要在客户端代码中暴露。建议使用环境变量存储，并定期轮换密钥。',
    tips: [
      '使用服务端代理转发请求',
      '设置 IP 白名单限制访问',
      '定期检查和轮换 API Key',
    ],
    icon: IconKey, 
    color: 'green' 
  },
  { 
    title: '异步任务处理', 
    content: '视频生成等耗时操作采用异步方式。提交后获取 task_id，通过轮询或回调获取结果。',
    tips: [
      '保存 task_id 用于后续查询',
      '使用指数退避策略轮询状态',
      '考虑使用 Webhook 接收回调',
    ],
    icon: IconPlayCircle, 
    color: 'orange' 
  },
  { 
    title: '配额管理', 
    content: '合理规划 API 调用量，在控制台监控配额使用情况。超出配额后请求将被拒绝。',
    tips: [
      '设置配额告警阈值',
      '优化请求减少不必要调用',
      '考虑批量处理降低成本',
    ],
    icon: IconServer, 
    color: 'violet' 
  },
  { 
    title: '速率限制', 
    content: '系统对请求频率有限制。收到 429 错误时，请降低请求频率并使用指数退避重试。',
    tips: [
      '实现请求队列控制并发',
      '使用指数退避重试策略',
      '合理设置超时时间',
    ],
    icon: IconAlertTriangle, 
    color: 'cyan' 
  },
];

const bestPractices = [
  {
    title: '使用流式响应',
    desc: '对于聊天类 API，启用流式响应可以提升用户体验',
    icon: IconBolt,
  },
  {
    title: '设置合理超时',
    desc: '根据模型类型设置不同的超时时间',
    icon: IconClock,
  },
  {
    title: '错误重试',
    desc: '对于可重试的错误实现自动重试机制',
    icon: IconTick,
  },
];

const NotesPage = () => {
  return (
    <div className='space-y-8'>
      {/* Hero Section */}
      <div 
        className='p-8 rounded-3xl relative overflow-hidden'
        style={{ 
          background: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)',
        }}
      >
        <div className='absolute inset-0 overflow-hidden pointer-events-none'>
          <div 
            className='absolute -right-16 -top-16 w-56 h-56 rounded-full'
            style={{ background: 'rgba(255,255,255,0.1)' }}
          />
          <div 
            className='absolute left-1/4 -bottom-24 w-64 h-64 rounded-full'
            style={{ background: 'rgba(255,255,255,0.05)' }}
          />
        </div>
        
        <div className='relative z-10 flex items-center gap-6'>
          <div 
            className='w-16 h-16 rounded-2xl flex items-center justify-center'
            style={{ background: 'rgba(255,255,255,0.2)', backdropFilter: 'blur(10px)' }}
          >
            <IconInfoCircle size='extra-large' style={{ color: '#fff' }} />
          </div>
          <div>
            <Title heading={2} style={{ margin: 0, color: '#fff' }}>使用指南</Title>
            <Text style={{ color: 'rgba(255,255,255,0.9)' }}>
              最佳实践和注意事项
            </Text>
          </div>
        </div>
      </div>

      {/* 最佳实践 */}
      <div>
        <div className='flex items-center gap-3 mb-5'>
          <div 
            className='w-1.5 h-7 rounded-full'
            style={{ background: 'linear-gradient(180deg, var(--semi-color-primary) 0%, var(--semi-color-primary-active) 100%)' }}
          />
          <Title heading={3} style={{ margin: 0 }}>最佳实践</Title>
        </div>
        
        <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
          {bestPractices.map((practice, idx) => {
            const PracticeIcon = practice.icon;
            return (
              <div
                key={idx}
                className='p-5 rounded-2xl border transition-all hover:shadow-lg hover:-translate-y-1'
                style={{ 
                  borderColor: 'var(--semi-color-border)', 
                  background: 'var(--semi-color-bg-1)' 
                }}
              >
                <div 
                  className='w-12 h-12 rounded-xl flex items-center justify-center mb-4'
                  style={{ background: 'var(--semi-color-primary-light-default)' }}
                >
                  <PracticeIcon className='text-[var(--semi-color-primary)]' />
                </div>
                <Text strong className='block mb-2'>{practice.title}</Text>
                <Text type='tertiary' size='small'>{practice.desc}</Text>
              </div>
            );
          })}
        </div>
      </div>

      {/* 注意事项 */}
      <div>
        <div className='flex items-center gap-3 mb-5'>
          <div 
            className='w-1.5 h-7 rounded-full'
            style={{ background: 'linear-gradient(180deg, var(--semi-color-warning) 0%, var(--semi-color-warning-active) 100%)' }}
          />
          <Title heading={3} style={{ margin: 0 }}>注意事项</Title>
        </div>

        <div className='grid grid-cols-1 lg:grid-cols-2 gap-5'>
          {notes.map((note, idx) => {
            const NoteIcon = note.icon;
            return (
              <div
                key={idx}
                className='p-6 rounded-2xl border'
                style={{ 
                  borderColor: 'var(--semi-color-border)', 
                  background: 'var(--semi-color-bg-1)' 
                }}
              >
                <div className='flex items-center gap-3 mb-4'>
                  <div 
                    className='w-11 h-11 rounded-xl flex items-center justify-center'
                    style={{ background: `var(--semi-color-${note.color}-light-default)` }}
                  >
                    <NoteIcon style={{ color: `var(--semi-color-${note.color})` }} />
                  </div>
                  <div>
                    <Text strong className='block'>{note.title}</Text>
                    <Tag size='small' color={note.color} type='light'>重要</Tag>
                  </div>
                </div>
                
                <Paragraph type='secondary' className='mb-4' style={{ margin: 0 }}>
                  {note.content}
                </Paragraph>
                
                <div 
                  className='p-4 rounded-xl'
                  style={{ background: 'var(--semi-color-fill-0)' }}
                >
                  <Text strong size='small' className='block mb-2'>建议：</Text>
                  <ul className='space-y-1.5 m-0 pl-4'>
                    {note.tips.map((tip, tipIdx) => (
                      <li key={tipIdx}>
                        <Text type='tertiary' size='small'>{tip}</Text>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 示例代码 */}
      <div>
        <div className='flex items-center gap-3 mb-5'>
          <div 
            className='w-1.5 h-7 rounded-full'
            style={{ background: 'linear-gradient(180deg, var(--semi-color-tertiary) 0%, var(--semi-color-tertiary-active) 100%)' }}
          />
          <Title heading={3} style={{ margin: 0 }}>指数退避重试示例</Title>
        </div>
        
        <div 
          className='p-6 rounded-2xl border'
          style={{ borderColor: 'var(--semi-color-border)', background: 'var(--semi-color-bg-1)' }}
        >
          <CodeBlock id='retry-example' language='javascript'>
{`async function callWithRetry(fn, maxRetries = 3) {
  let lastError;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      
      // 只对可重试的错误进行重试
      if (error.status === 429 || error.status >= 500) {
        // 指数退避：1s, 2s, 4s...
        const delay = Math.pow(2, i) * 1000;
        console.log(\`重试 \${i + 1}/\${maxRetries}，等待 \${delay}ms\`);
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw error;
      }
    }
  }
  
  throw lastError;
}

// 使用示例
const response = await callWithRetry(async () => {
  const res = await fetch('/v1/chat/completions', { ... });
  if (!res.ok) {
    const error = new Error(await res.text());
    error.status = res.status;
    throw error;
  }
  return res.json();
});`}
          </CodeBlock>
        </div>
      </div>
    </div>
  );
};

export default NotesPage;
