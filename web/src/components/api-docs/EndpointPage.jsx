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

import React, { useMemo } from 'react';
import { Typography, Tag, Collapse, Empty, Input, Banner } from '@douyinfe/semi-ui';
import { IconCode, IconSearch, IconInfoCircle } from '@douyinfe/semi-icons';
import { endpointMeta, getVendorColor } from './constants';
import CodeBlock from './CodeBlock';
import MethodBadge from './MethodBadge';
import ModelCard from './ModelCard';

const { Title, Text } = Typography;

// 按供应商分组
const groupModelsByVendor = (models) => {
  const grouped = {};
  models?.forEach((model) => {
    const vendor = model.vendor || 'Other';
    if (!grouped[vendor]) grouped[vendor] = [];
    grouped[vendor].push(model);
  });
  return grouped;
};

const EndpointPage = ({ endpoint, searchQuery, onSearchChange, onTestClick }) => {
  // 过滤模型
  const filteredModels = useMemo(() => {
    if (!searchQuery) return endpoint.models;
    const query = searchQuery.toLowerCase();
    return endpoint.models?.filter(
      (m) =>
        m.id.toLowerCase().includes(query) ||
        m.name.toLowerCase().includes(query) ||
        m.vendor?.toLowerCase().includes(query)
    );
  }, [endpoint.models, searchQuery]);

  const groupedModels = useMemo(() => groupModelsByVendor(filteredModels), [filteredModels]);
  const vendors = Object.keys(groupedModels);
  
  const meta = endpointMeta[endpoint.type] || { icon: IconCode, label: endpoint.name };
  const Icon = meta.icon;

  return (
    <div className='space-y-6'>
      {/* 头部 */}
      <div className='p-6 rounded-lg' style={{ background: 'var(--semi-color-primary-light-default)' }}>
        <div className='flex items-center gap-4 mb-4'>
          <Icon size='extra-large' className='text-[var(--semi-color-primary)]' />
          <div>
            <Title heading={2} style={{ margin: 0 }}>{endpoint.name}</Title>
            <Text type='secondary'>{endpoint.description}</Text>
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <MethodBadge method={endpoint.method} />
          <code className='px-3 py-2 rounded-lg text-base' style={{ background: 'var(--semi-color-bg-0)' }}>
            {endpoint.endpoint}
          </code>
        </div>
      </div>

      {/* 请求/响应示例 */}
      <div className='grid grid-cols-1 lg:grid-cols-2 gap-4'>
        <div className='p-5 rounded-lg border' style={{ borderColor: 'var(--semi-color-border)', background: 'var(--semi-color-bg-1)' }}>
          <Title heading={5} className='mb-3'>请求示例</Title>
          <CodeBlock id={`req-${endpoint.type}`}>{endpoint.request?.example}</CodeBlock>
        </div>
        <div className='p-5 rounded-lg border' style={{ borderColor: 'var(--semi-color-border)', background: 'var(--semi-color-bg-1)' }}>
          <Title heading={5} className='mb-3'>响应示例</Title>
          <CodeBlock id={`res-${endpoint.type}`}>{endpoint.response?.example}</CodeBlock>
        </div>
      </div>

      {/* 视频特殊 */}
      {endpoint.type === 'video' && (
        <>
          <Banner
            type='info'
            icon={<IconInfoCircle />}
            title='异步任务'
            description='视频生成是异步任务。提交请求后会返回 task_id，需要通过查询接口获取结果。'
          />
          <div className='p-5 rounded-lg border' style={{ borderColor: 'var(--semi-color-border)', background: 'var(--semi-color-bg-1)' }}>
            <Title heading={5} className='mb-3'>查询任务状态</Title>
            <div className='flex items-center gap-3 mb-3'>
              <MethodBadge method='GET' />
              <code className='px-3 py-2 rounded-lg' style={{ background: 'var(--semi-color-fill-0)' }}>
                /v1/video/generations/{'{task_id}'}
              </code>
            </div>
            <CodeBlock id='video-status'>
              {{
                code: 'success',
                data: {
                  task_id: 'cgt-20260111143028-kwrks',
                  status: 'SUCCESS',
                  progress: '100%',
                  video_url: 'https://example.com/video.mp4',
                },
              }}
            </CodeBlock>
          </div>
        </>
      )}

      {/* 模型列表 */}
      <div className='p-5 rounded-lg border' style={{ borderColor: 'var(--semi-color-border)', background: 'var(--semi-color-bg-1)' }}>
        <div className='flex items-center justify-between mb-4 flex-wrap gap-4'>
          <Title heading={5} style={{ margin: 0 }}>支持的模型 ({filteredModels?.length || 0})</Title>
          <Input
            prefix={<IconSearch />}
            placeholder='搜索模型...'
            value={searchQuery}
            onChange={onSearchChange}
            showClear
            style={{ width: 240 }}
          />
        </div>

        {vendors.length === 0 ? (
          <Empty description='没有找到匹配的模型' />
        ) : (
          <Collapse defaultActiveKey={vendors} keepDOM>
            {vendors.map((vendor) => (
              <Collapse.Panel
                header={
                  <div className='flex items-center gap-2'>
                    <Tag color={getVendorColor(vendor)} size='small'>{vendor}</Tag>
                    <Text type='tertiary'>({groupedModels[vendor].length})</Text>
                  </div>
                }
                itemKey={vendor}
                key={vendor}
              >
                <div className='grid grid-cols-1 gap-3 pt-2'>
                  {groupedModels[vendor].map((model) => (
                    <ModelCard 
                      key={model.id} 
                      model={model} 
                      endpoint={endpoint} 
                      onTestClick={onTestClick}
                    />
                  ))}
                </div>
              </Collapse.Panel>
            ))}
          </Collapse>
        )}
      </div>
    </div>
  );
};

export default EndpointPage;

