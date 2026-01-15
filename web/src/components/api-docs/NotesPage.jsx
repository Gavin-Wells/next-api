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
} from '@douyinfe/semi-icons';

const { Title, Text, Paragraph } = Typography;

const notes = [
  { 
    title: 'API Key 安全', 
    content: '请妥善保管您的 API Key，不要在客户端代码中暴露。建议使用环境变量存储，并定期轮换。', 
    icon: IconKey, 
    color: 'green' 
  },
  { 
    title: '异步任务处理', 
    content: '视频生成等耗时操作采用异步方式。提交后获取 task_id，通过轮询或回调获取结果。', 
    icon: IconPlayCircle, 
    color: 'orange' 
  },
  { 
    title: '配额管理', 
    content: '合理规划 API 调用量，在控制台监控配额使用情况。超出配额后请求将被拒绝。', 
    icon: IconServer, 
    color: 'violet' 
  },
  { 
    title: '速率限制', 
    content: '系统对请求频率有限制。收到 429 错误时，请降低请求频率并使用指数退避重试。', 
    icon: IconAlertTriangle, 
    color: 'cyan' 
  },
];

const NotesPage = () => {
  return (
    <div className='space-y-6'>
      <div className='p-6 rounded-lg' style={{ background: 'var(--semi-color-success-light-default)' }}>
        <div className='flex items-center gap-4'>
          <IconInfoCircle size='extra-large' className='text-[var(--semi-color-success)]' />
          <div>
            <Title heading={2} style={{ margin: 0 }}>使用指南</Title>
            <Text type='secondary'>最佳实践和注意事项</Text>
          </div>
        </div>
      </div>

      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        {notes.map((note, idx) => {
          const NoteIcon = note.icon;
          return (
            <div
              key={idx}
              className='p-5 rounded-lg border'
              style={{ borderColor: 'var(--semi-color-border)', background: 'var(--semi-color-bg-1)' }}
            >
              <div className='flex items-center gap-2 mb-3'>
                <Tag color={note.color}><NoteIcon /></Tag>
                <Text strong>{note.title}</Text>
              </div>
              <Paragraph type='tertiary' style={{ margin: 0 }}>{note.content}</Paragraph>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default NotesPage;

