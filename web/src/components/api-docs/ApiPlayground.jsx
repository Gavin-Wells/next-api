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
import { Typography, Tag, Banner } from '@douyinfe/semi-ui';
import { IconCode, IconInfoCircle } from '@douyinfe/semi-icons';
import { endpointMeta } from './constants';
import ModelSelector from './ModelSelector';
import RequestBuilder from './RequestBuilder';
import MethodBadge from './MethodBadge';

const { Title, Text } = Typography;

const ApiPlayground = ({
  endpoint,
  userTokens = [],
  userId,
  selectedTokenKey,
  onSelectedTokenChange,
}) => {
  const [selectedModel, setSelectedModel] = useState(null);

  const handleSelectModel = useCallback((model) => {
    setSelectedModel(model);
  }, []);

  const meta = endpointMeta[endpoint.type] || { icon: IconCode, label: endpoint.name };
  const Icon = meta.icon;

  return (
    <div className='h-[calc(100vh-60px)] flex flex-col overflow-hidden'>
      {/* 端点头部信息 */}
      <div 
        className='p-5 border-b flex-shrink-0'
        style={{ 
          background: 'var(--semi-color-primary-light-default)',
          borderColor: 'var(--semi-color-border)' 
        }}
      >
        <div className='flex items-center gap-4 mb-3'>
          <div 
            className='w-10 h-10 rounded-xl flex items-center justify-center'
            style={{ background: 'var(--semi-color-primary)', color: '#fff' }}
          >
            <Icon />
          </div>
          <div>
            <Title heading={4} style={{ margin: 0 }}>{endpoint.name}</Title>
            <Text type='tertiary' size='small'>{endpoint.description}</Text>
          </div>
        </div>
        <div className='flex items-center gap-3'>
          <MethodBadge method={endpoint.method} />
          <code 
            className='px-3 py-1.5 rounded-lg text-sm'
            style={{ background: 'var(--semi-color-bg-0)' }}
          >
            {endpoint.endpoint}
          </code>
          <Tag color='blue' type='light' size='small'>
            {endpoint.models?.length || 0} 模型
          </Tag>
        </div>
      </div>

      {/* 视频特殊提示 */}
      {endpoint.type === 'video' && (
        <Banner
          type='info'
          icon={<IconInfoCircle />}
          description={
            <span>
              视频生成是异步任务。提交后返回 <code>task_id</code>，通过 
              <code className='ml-1'>GET /v1/video/generations/{'{task_id}'}</code> 查询结果。
            </span>
          }
          className='rounded-none border-b'
          style={{ borderColor: 'var(--semi-color-border)' }}
        />
      )}

      {/* 主内容区 - 左右分栏 */}
      <div className='flex-1 flex overflow-hidden min-h-0'>
        {/* 左侧：模型列表 */}
        <div 
          className='w-72 flex-shrink-0 border-r flex flex-col min-h-0'
          style={{ 
            borderColor: 'var(--semi-color-border)',
            background: 'var(--semi-color-bg-1)'
          }}
        >
          <ModelSelector
            models={endpoint.models}
            selectedModel={selectedModel}
            onSelectModel={handleSelectModel}
          />
        </div>

        {/* 右侧：参数配置和代码生成 */}
        <div 
          className='flex-1 overflow-hidden min-h-0'
          style={{ background: 'var(--semi-color-bg-0)' }}
        >
          <RequestBuilder
            endpoint={endpoint}
            model={selectedModel}
            userTokens={userTokens}
            userId={userId}
            selectedTokenKey={selectedTokenKey}
            onSelectedTokenChange={onSelectedTokenChange}
          />
        </div>
      </div>
    </div>
  );
};

export default ApiPlayground;

