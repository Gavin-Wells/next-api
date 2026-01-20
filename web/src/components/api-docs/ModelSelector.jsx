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
import { Typography, Tag, Input, Empty, Tooltip } from '@douyinfe/semi-ui';
import { IconSearch, IconVolume2, IconImage, IconStar } from '@douyinfe/semi-icons';
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
  const [expandedVendors, setExpandedVendors] = useState(() => {
    // 默认展开所有供应商
    const vendors = {};
    models?.forEach((model) => {
      const vendor = model.vendor || 'Other';
      vendors[vendor] = true;
    });
    return vendors;
  });

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

  const toggleVendor = (vendor) => {
    setExpandedVendors(prev => ({
      ...prev,
      [vendor]: !prev[vendor]
    }));
  };

  return (
    <div className='h-full flex flex-col min-h-0'>
      {/* 搜索框 - 更现代的设计 */}
      <div 
        className='p-3 border-b' 
        style={{ borderColor: 'var(--semi-color-border)' }}
      >
        <Input
          prefix={<IconSearch className='text-[var(--semi-color-text-2)]' />}
          placeholder='搜索模型...'
          value={searchQuery}
          onChange={setSearchQuery}
          showClear
          style={{ 
            background: 'var(--semi-color-fill-0)',
            borderRadius: 10,
          }}
        />
        <div className='flex items-center justify-between mt-2'>
          <Text type='tertiary' size='small'>
            {filteredModels?.length || 0} 个模型
          </Text>
          {searchQuery && (
            <Text 
              type='tertiary' 
              size='small' 
              className='cursor-pointer hover:text-[var(--semi-color-primary)]'
              onClick={() => setSearchQuery('')}
            >
              清除筛选
            </Text>
          )}
        </div>
      </div>

      {/* 模型列表 */}
      <div className='flex-1 overflow-y-auto min-h-0'>
        {vendors.length === 0 ? (
          <div className='flex flex-col items-center justify-center h-full p-6'>
            <Empty 
              image={<IconSearch size='extra-large' className='text-[var(--semi-color-text-2)]' />}
              description={
                <Text type='tertiary' size='small'>
                  没有找到匹配的模型
                </Text>
              }
            />
          </div>
        ) : (
          <div className='py-2'>
            {vendors.map((vendor) => {
              const isExpanded = expandedVendors[vendor] !== false;
              const vendorModels = groupedModels[vendor];
              const hasSelectedModel = vendorModels.some(m => m.id === selectedModel?.id);
              
              return (
                <div key={vendor} className='mb-1'>
                  {/* 供应商标题 */}
                  <div
                    className='px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-[var(--semi-color-fill-0)] transition-colors'
                    onClick={() => toggleVendor(vendor)}
                  >
                    <div className='flex items-center gap-2'>
                      <div 
                        className='w-2 h-2 rounded-full'
                        style={{ background: `var(--semi-color-${getVendorColor(vendor)})` }}
                      />
                      <Text strong size='small'>{vendor}</Text>
                      <Tag size='small' type='ghost' color='grey'>
                        {vendorModels.length}
                      </Tag>
                    </div>
                    <svg 
                      className={`w-4 h-4 text-[var(--semi-color-text-2)] transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                      fill='none' 
                      viewBox='0 0 24 24' 
                      stroke='currentColor'
                    >
                      <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M9 5l7 7-7 7' />
                    </svg>
                  </div>
                  
                  {/* 模型列表 */}
                  {isExpanded && (
                    <div className='px-2 pb-1'>
                      {vendorModels.map((model, index) => {
                        const isSelected = selectedModel?.id === model.id;
                        const isFirst = index === 0;
                        
                        return (
                          <div
                            key={model.id}
                            className={`
                              px-3 py-2.5 mx-1 mb-1 rounded-xl cursor-pointer
                              transition-all duration-200 ease-out
                              ${isSelected 
                                ? 'shadow-sm' 
                                : 'hover:bg-[var(--semi-color-fill-0)]'
                              }
                            `}
                            style={{
                              background: isSelected 
                                ? `var(--semi-color-${getVendorColor(vendor)}-light-default)` 
                                : 'transparent',
                              borderLeft: isSelected 
                                ? `3px solid var(--semi-color-${getVendorColor(vendor)})` 
                                : '3px solid transparent',
                            }}
                            onClick={() => onSelectModel(model)}
                          >
                            <div className='flex items-center justify-between gap-2'>
                              <code 
                                className='text-xs font-semibold truncate flex-1'
                                style={{ 
                                  color: isSelected 
                                    ? `var(--semi-color-${getVendorColor(vendor)})` 
                                    : 'var(--semi-color-text-0)'
                                }}
                              >
                                {model.id}
                              </code>
                              {isFirst && !searchQuery && (
                                <Tooltip content='推荐模型'>
                                  <IconStar 
                                    size='extra-small' 
                                    className='text-[var(--semi-color-warning)] flex-shrink-0' 
                                  />
                                </Tooltip>
                              )}
                            </div>
                            
                            {/* 特性标签 */}
                            <div className='flex items-center gap-1 mt-1.5 flex-wrap'>
                              {model.type && (
                                <Tag 
                                  size='small' 
                                  type={isSelected ? 'solid' : 'light'} 
                                  color='cyan' 
                                  className='text-xs'
                                >
                                  {model.type}
                                </Tag>
                              )}
                              {model.supports_audio && (
                                <Tooltip content='支持音频'>
                                  <Tag 
                                    size='small' 
                                    color='violet' 
                                    type='ghost' 
                                    className='text-xs px-1'
                                  >
                                    <IconVolume2 size='extra-small' />
                                  </Tag>
                                </Tooltip>
                              )}
                              {model.supports_first_frame && (
                                <Tooltip content='支持首帧'>
                                  <Tag 
                                    size='small' 
                                    color='green' 
                                    type='ghost' 
                                    className='text-xs px-1'
                                  >
                                    <IconImage size='extra-small' />
                                  </Tag>
                                </Tooltip>
                              )}
                              {model.parameters?.length > 0 && (
                                <Tag 
                                  size='small' 
                                  type='ghost' 
                                  color='blue' 
                                  className='text-xs'
                                >
                                  {model.parameters.length} 参数
                                </Tag>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default ModelSelector;
