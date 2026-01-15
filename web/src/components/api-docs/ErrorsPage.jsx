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
import { IconAlertTriangle } from '@douyinfe/semi-icons';
import CodeBlock from './CodeBlock';

const { Title, Text } = Typography;

const httpStatusCodes = [
  { code: '200', desc: '请求成功', color: 'green' },
  { code: '400', desc: '请求参数错误', color: 'orange' },
  { code: '401', desc: '未授权，API Key 无效', color: 'red' },
  { code: '403', desc: '配额不足或无权限', color: 'orange' },
  { code: '404', desc: '资源不存在', color: 'amber' },
  { code: '429', desc: '请求频率超限', color: 'violet' },
  { code: '500', desc: '服务器内部错误', color: 'indigo' },
];

const ErrorsPage = () => {
  return (
    <div className='space-y-6'>
      <div className='p-6 rounded-lg' style={{ background: 'var(--semi-color-danger-light-default)' }}>
        <div className='flex items-center gap-4'>
          <IconAlertTriangle size='extra-large' className='text-[var(--semi-color-danger)]' />
          <div>
            <Title heading={2} style={{ margin: 0 }}>错误处理</Title>
            <Text type='secondary'>了解 API 错误响应格式和常见错误码</Text>
          </div>
        </div>
      </div>

      <div className='p-5 rounded-lg border' style={{ borderColor: 'var(--semi-color-border)', background: 'var(--semi-color-bg-1)' }}>
        <Title heading={5} className='mb-3'>错误响应格式</Title>
        <CodeBlock id='error-format'>
          {{
            error: {
              message: '错误描述',
              type: 'invalid_request_error',
              param: 'model',
              code: 'model_not_found',
            },
          }}
        </CodeBlock>
      </div>

      <div className='p-5 rounded-lg border' style={{ borderColor: 'var(--semi-color-border)', background: 'var(--semi-color-bg-1)' }}>
        <Title heading={5} className='mb-3'>HTTP 状态码</Title>
        <div className='space-y-2'>
          {httpStatusCodes.map((err) => (
            <div key={err.code} className='p-3 rounded-lg flex items-center gap-4' style={{ background: 'var(--semi-color-fill-0)' }}>
              <Tag color={err.color}>{err.code}</Tag>
              <Text>{err.desc}</Text>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ErrorsPage;

