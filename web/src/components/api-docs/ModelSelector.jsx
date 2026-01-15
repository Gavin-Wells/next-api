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

import React, { useState, useMemo } from 'react';
import { Typography, Tag, Input, Collapse, Empty } from '@douyinfe/semi-ui';
import { IconSearch, IconVolume2, IconImage } from '@douyinfe/semi-icons';
import { getVendorColor } from './constants';

const { Text } = Typography;

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

const ModelSelector = ({ models = [], selectedModel, onSelectModel }) => {
  const [searchQuery, setSearchQuery] = useState('');

  // 过滤模型
  const filteredModels = useMemo(() => {
    if (!searchQuery) return models;
    const query = searchQuery.toLowerCase();
    return models?.filter(
      (m) =>
        m.id.toLowerCase().includes(query) ||
        m.name?.toLowerCase().includes(query) ||
        m.vendor?.toLowerCase().includes(query)
    );
  }, [models, searchQuery]);

  const groupedModels = useMemo(() => groupModelsByVendor(filteredModels), [filteredModels]);
  const vendors = Object.keys(groupedModels);

  return (
    <div className='h-full flex flex-col min-h-0'>
      {/* 搜索框 */}
      <div 
        className='p-3 border-b sticky top-0 z-10' 
        style={{ borderColor: 'var(--semi-color-border)', background: 'var(--semi-color-bg-1)' }}
      >
        <Input
          prefix={<IconSearch />}
          placeholder='搜索模型...'
          value={searchQuery}
          onChange={setSearchQuery}
          showClear
          size='small'
        />
        <Text type='tertiary' size='small' className='mt-2 block'>
          共 {filteredModels?.length || 0} 个模型
        </Text>
      </div>

      {/* 模型列表 */}
      <div className='flex-1 overflow-y-auto min-h-0 p-2'>
        {vendors.length === 0 ? (
          <Empty description='没有找到匹配的模型' className='mt-8' />
        ) : (
          <Collapse 
            defaultActiveKey={vendors} 
            keepDOM
            style={{ border: 'none' }}
          >
            {vendors.map((vendor) => (
              <Collapse.Panel
                header={
                  <div className='flex items-center gap-2'>
                    <Tag color={getVendorColor(vendor)} size='small'>{vendor}</Tag>
                    <Text type='tertiary' size='small'>({groupedModels[vendor].length})</Text>
                  </div>
                }
                itemKey={vendor}
                key={vendor}
                style={{ borderBottom: '1px solid var(--semi-color-border)' }}
              >
                <div className='space-y-1 py-1'>
                  {groupedModels[vendor].map((model) => (
                    <div
                      key={model.id}
                      className={`px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-200 ${
                        selectedModel?.id === model.id 
                          ? 'ring-2 ring-[var(--semi-color-primary)]' 
                          : 'hover:bg-[var(--semi-color-fill-1)]'
                      }`}
                      style={{
                        background: selectedModel?.id === model.id 
                          ? 'var(--semi-color-primary-light-default)' 
                          : 'transparent',
                      }}
                      onClick={() => onSelectModel(model)}
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <code 
                          className='text-xs font-medium truncate flex-1'
                          style={{ 
                            color: selectedModel?.id === model.id 
                              ? 'var(--semi-color-primary)' 
                              : 'var(--semi-color-text-0)'
                          }}
                        >
                          {model.id}
                        </code>
                      </div>
                      {/* 特性标签 */}
                      <div className='flex items-center gap-1 mt-1.5 flex-wrap'>
                        {model.type && (
                          <Tag size='small' type='light' color='cyan' className='text-xs'>
                            {model.type}
                          </Tag>
                        )}
                        {model.supports_audio && (
                          <Tag size='small' color='violet' type='ghost' className='text-xs'>
                            <IconVolume2 size='extra-small' />
                          </Tag>
                        )}
                        {model.supports_first_frame && (
                          <Tag size='small' color='green' type='ghost' className='text-xs'>
                            <IconImage size='extra-small' />
                          </Tag>
                        )}
                      </div>
                    </div>
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

export default ModelSelector;

