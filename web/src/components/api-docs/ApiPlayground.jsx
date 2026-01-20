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

import React, { useState, useCallback, useEffect } from 'react';
import { Typography, Tag, Banner, TabPane, Tabs, Button, Tooltip } from '@douyinfe/semi-ui';
import { 
  IconCode, 
  IconInfoCircle, 
  IconList, 
  IconSetting, 
  IconTerminal,
  IconCopy,
  IconTick,
} from '@douyinfe/semi-icons';
import { endpointMeta, endpointColorMap } from './constants';
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
  const [activeTab, setActiveTab] = useState('playground');
  const [copiedEndpoint, setCopiedEndpoint] = useState(false);

  // 自动选择第一个模型
  useEffect(() => {
    if (endpoint?.models?.length > 0 && !selectedModel) {
      setSelectedModel(endpoint.models[0]);
    }
  }, [endpoint, selectedModel]);

  // 当端点变化时重置选中的模型
  useEffect(() => {
    if (endpoint?.models?.length > 0) {
      setSelectedModel(endpoint.models[0]);
    } else {
      setSelectedModel(null);
    }
  }, [endpoint?.type]);

  const handleSelectModel = useCallback((model) => {
    setSelectedModel(model);
    // 选择模型后自动切换到 playground 标签
    setActiveTab('playground');
  }, []);

  const handleCopyEndpoint = useCallback(() => {
    navigator.clipboard.writeText(`${window.location.origin}${endpoint.endpoint}`);
    setCopiedEndpoint(true);
    setTimeout(() => setCopiedEndpoint(false), 2000);
  }, [endpoint.endpoint]);

  const meta = endpointMeta[endpoint.type] || { icon: IconCode, label: endpoint.name };
  const Icon = meta.icon;
  const color = endpointColorMap[endpoint.type] || 'blue';

  return (
    <div className='h-[calc(100vh-60px)] flex flex-col overflow-hidden'>
      {/* 端点头部信息 - 更紧凑的设计 */}
      <header 
        className='px-6 py-4 border-b flex-shrink-0'
        style={{ 
          background: `linear-gradient(135deg, var(--semi-color-${color}-light-default) 0%, var(--semi-color-bg-1) 100%)`,
          borderColor: 'var(--semi-color-border)' 
        }}
      >
        <div className='flex items-center justify-between gap-4 flex-wrap'>
          <div className='flex items-center gap-4'>
            <div 
              className='w-12 h-12 rounded-2xl flex items-center justify-center'
              style={{ 
                background: `linear-gradient(135deg, var(--semi-color-${color}) 0%, var(--semi-color-${color}-active) 100%)`,
                boxShadow: `0 4px 16px rgba(var(--semi-color-${color}-rgb), 0.25)`
              }}
            >
              <Icon size='large' style={{ color: '#fff' }} />
            </div>
            <div>
              <div className='flex items-center gap-2'>
                <Title heading={4} style={{ margin: 0 }}>{endpoint.name}</Title>
                <Tag color={color} size='small' type='light'>
                  {endpoint.models?.length || 0} 模型
                </Tag>
              </div>
              <Text type='tertiary' size='small' className='mt-0.5 block'>
                {endpoint.description}
              </Text>
            </div>
          </div>
          
          {/* Endpoint URL */}
          <div 
            className='flex items-center gap-2 px-4 py-2 rounded-xl cursor-pointer group'
            style={{ background: 'var(--semi-color-bg-0)' }}
            onClick={handleCopyEndpoint}
          >
            <MethodBadge method={endpoint.method} />
            <code className='text-sm font-mono'>{endpoint.endpoint}</code>
            <Tooltip content={copiedEndpoint ? '已复制!' : '点击复制'}>
              {copiedEndpoint ? (
                <IconTick size='small' className='text-[var(--semi-color-success)]' />
              ) : (
                <IconCopy 
                  size='small' 
                  className='text-[var(--semi-color-text-2)] opacity-0 group-hover:opacity-100 transition-opacity'
                />
              )}
            </Tooltip>
          </div>
        </div>
      </header>

      {/* 视频特殊提示 */}
      {endpoint.type === 'video' && (
        <Banner
          type='info'
          icon={<IconInfoCircle />}
          description={
            <span>
              视频生成是异步任务。提交后返回 <code className='px-1.5 py-0.5 rounded bg-[var(--semi-color-fill-1)]'>task_id</code>，通过 
              <code className='ml-1 px-1.5 py-0.5 rounded bg-[var(--semi-color-fill-1)]'>GET /v1/video/generations/{'{task_id}'}</code> 查询结果。
            </span>
          }
          className='rounded-none border-b mx-0'
          style={{ borderColor: 'var(--semi-color-border)' }}
        />
      )}

      {/* 主内容区 - 使用标签页 */}
      <div className='flex-1 flex flex-col overflow-hidden min-h-0'>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          type='card'
          className='h-full flex flex-col api-docs-tabs'
          tabBarStyle={{
            paddingLeft: 16,
            paddingRight: 16,
            background: 'var(--semi-color-bg-1)',
            borderBottom: '1px solid var(--semi-color-border)',
          }}
          contentStyle={{ 
            flex: 1, 
            overflow: 'hidden',
            padding: 0,
          }}
        >
          <TabPane
            tab={
              <span className='flex items-center gap-2'>
                <IconTerminal size='small' />
                <span>API 测试</span>
              </span>
            }
            itemKey='playground'
          >
            <div className='h-full flex overflow-hidden'>
              {/* 左侧：模型列表 - 可折叠 */}
              <aside 
                className='w-64 flex-shrink-0 border-r flex flex-col min-h-0'
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
              </aside>

              {/* 右侧：参数配置和测试 */}
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
          </TabPane>

          <TabPane
            tab={
              <span className='flex items-center gap-2'>
                <IconList size='small' />
                <span>模型列表</span>
                <Tag size='small' color={color} type='ghost'>{endpoint.models?.length || 0}</Tag>
              </span>
            }
            itemKey='models'
          >
            <div className='h-full overflow-auto p-6'>
              <ModelListView 
                models={endpoint.models} 
                selectedModel={selectedModel}
                onSelectModel={(model) => {
                  handleSelectModel(model);
                  setActiveTab('playground');
                }}
                color={color}
              />
            </div>
          </TabPane>
        </Tabs>
      </div>

      {/* 全局样式 */}
      <style>{`
        .api-docs-tabs .semi-tabs-content {
          height: 100%;
          display: flex;
          flex-direction: column;
        }
        .api-docs-tabs .semi-tabs-pane {
          height: 100%;
          overflow: hidden;
        }
      `}</style>
    </div>
  );
};

// 模型列表视图组件
const ModelListView = ({ models, selectedModel, onSelectModel, color }) => {
  if (!models?.length) {
    return (
      <div className='flex items-center justify-center h-full'>
        <Text type='tertiary'>暂无可用模型</Text>
      </div>
    );
  }

  // 按供应商分组
  const groupedModels = {};
  models.forEach((model) => {
    const vendor = model.vendor || 'Other';
    if (!groupedModels[vendor]) groupedModels[vendor] = [];
    groupedModels[vendor].push(model);
  });

  return (
    <div className='space-y-6'>
      {Object.entries(groupedModels).map(([vendor, vendorModels]) => (
        <div key={vendor}>
          <div className='flex items-center gap-2 mb-3'>
            <Text strong className='text-lg'>{vendor}</Text>
            <Tag size='small' type='light' color='grey'>{vendorModels.length}</Tag>
          </div>
          <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
            {vendorModels.map((model) => (
              <div
                key={model.id}
                className={`
                  p-4 rounded-xl border-2 cursor-pointer
                  transition-all duration-200 hover:shadow-md hover:-translate-y-0.5
                  ${selectedModel?.id === model.id 
                    ? 'border-[var(--semi-color-primary)] bg-[var(--semi-color-primary-light-default)]' 
                    : 'border-transparent bg-[var(--semi-color-fill-0)] hover:border-[var(--semi-color-border)]'
                  }
                `}
                onClick={() => onSelectModel(model)}
              >
                <code 
                  className='text-sm font-semibold block mb-2 truncate'
                  style={{ 
                    color: selectedModel?.id === model.id 
                      ? 'var(--semi-color-primary)' 
                      : 'var(--semi-color-text-0)'
                  }}
                >
                  {model.id}
                </code>
                <div className='flex items-center gap-1 flex-wrap'>
                  {model.type && (
                    <Tag size='small' type='light' color='cyan'>{model.type}</Tag>
                  )}
                  {model.supported_sizes?.length > 0 && (
                    <Tag size='small' type='ghost' color='violet'>
                      {model.supported_sizes.length} 尺寸
                    </Tag>
                  )}
                  {model.parameters?.length > 0 && (
                    <Tag size='small' type='ghost' color='green'>
                      {model.parameters.length} 参数
                    </Tag>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ApiPlayground;
