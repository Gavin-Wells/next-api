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
import { Typography, Tag, Tooltip } from '@douyinfe/semi-ui';
import { IconInfoCircle } from '@douyinfe/semi-icons';

const { Text } = Typography;

const ModelParams = ({ model }) => {
  const hasParams =
    model.supported_durations?.length > 0 ||
    model.supported_resolutions?.length > 0 ||
    model.supported_ratios?.length > 0 ||
    model.supported_sizes?.length > 0;

  if (!hasParams && !model.parameters?.length) return null;

  return (
    <div className='space-y-6'>
      {/* 支持的配置 */}
      {hasParams && (
        <div 
          className='p-5 rounded-xl'
          style={{ background: 'var(--semi-color-fill-0)' }}
        >
          <Text strong size='small' className='block mb-4'>支持的配置</Text>
          <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
            {model.default_duration && (
              <div className='p-3 rounded-lg' style={{ background: 'var(--semi-color-bg-1)' }}>
                <Text type='tertiary' size='small' className='block mb-2'>默认时长</Text>
                <Tag color='blue' size='large'>{model.default_duration}秒</Tag>
              </div>
            )}
            {model.supported_durations?.length > 0 && (
              <div className='p-3 rounded-lg' style={{ background: 'var(--semi-color-bg-1)' }}>
                <Text type='tertiary' size='small' className='block mb-2'>支持时长</Text>
                <div className='flex gap-1.5 flex-wrap'>
                  {model.supported_durations.map((d) => (
                    <Tag key={d} type='light' color='blue'>{d}s</Tag>
                  ))}
                </div>
              </div>
            )}
            {model.default_resolution && (
              <div className='p-3 rounded-lg' style={{ background: 'var(--semi-color-bg-1)' }}>
                <Text type='tertiary' size='small' className='block mb-2'>默认分辨率</Text>
                <Tag color='green' size='large'>{model.default_resolution}</Tag>
              </div>
            )}
            {model.supported_resolutions?.length > 0 && (
              <div className='p-3 rounded-lg' style={{ background: 'var(--semi-color-bg-1)' }}>
                <Text type='tertiary' size='small' className='block mb-2'>支持分辨率</Text>
                <div className='flex gap-1.5 flex-wrap'>
                  {model.supported_resolutions.map((r) => (
                    <Tag key={r} type='light' color='green'>{r}</Tag>
                  ))}
                </div>
              </div>
            )}
            {model.supported_ratios?.length > 0 && (
              <div className='p-3 rounded-lg' style={{ background: 'var(--semi-color-bg-1)' }}>
                <Text type='tertiary' size='small' className='block mb-2'>宽高比</Text>
                <div className='flex gap-1.5 flex-wrap'>
                  {model.supported_ratios.map((r) => (
                    <Tag key={r} type='light' color='orange'>{r}</Tag>
                  ))}
                </div>
              </div>
            )}
            {model.supported_sizes?.length > 0 && (
              <div className='p-3 rounded-lg' style={{ background: 'var(--semi-color-bg-1)' }}>
                <Text type='tertiary' size='small' className='block mb-2'>支持尺寸</Text>
                <div className='flex gap-1.5 flex-wrap'>
                  {model.supported_sizes.map((s) => (
                    <Tag key={s} type='light' color='violet'>{s}</Tag>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 参数说明 */}
      {model.parameters?.length > 0 && (
        <div>
          <Text strong size='small' className='block mb-4'>参数说明</Text>
          <div className='space-y-3'>
            {model.parameters.map((param) => (
              <div 
                key={param.name}
                className='p-4 rounded-xl border'
                style={{ 
                  borderColor: 'var(--semi-color-border)',
                  background: 'var(--semi-color-bg-1)'
                }}
              >
                <div className='flex items-start justify-between gap-3 mb-2'>
                  <div className='flex items-center gap-2'>
                    <code 
                      className='px-2.5 py-1 rounded-lg text-sm font-semibold' 
                      style={{ 
                        background: 'var(--semi-color-primary-light-default)',
                        color: 'var(--semi-color-primary)'
                      }}
                    >
                      {param.name}
                    </code>
                    <Tag size='small' type='ghost' color='grey'>{param.type}</Tag>
                    {param.required && (
                      <Tag size='small' color='red'>必填</Tag>
                    )}
                  </div>
                  {param.default !== undefined && (
                    <div className='flex items-center gap-1.5'>
                      <Text type='tertiary' size='small'>默认:</Text>
                      <code className='text-xs px-2 py-0.5 rounded' style={{ background: 'var(--semi-color-fill-1)' }}>
                        {String(param.default)}
                      </code>
                    </div>
                  )}
                </div>
                
                {param.description && (
                  <Text 
                    type='secondary' 
                    size='small' 
                    className='block mb-3'
                    style={{ lineHeight: 1.6 }}
                  >
                    {param.description}
                  </Text>
                )}
                
                {param.options?.length > 0 && (
                  <div className='pt-2 border-t' style={{ borderColor: 'var(--semi-color-border)' }}>
                    <Text type='tertiary' size='small' className='block mb-2'>可选值:</Text>
                    <div className='flex flex-wrap gap-1.5'>
                      {param.options.map((option) => (
                        <Tag 
                          key={option} 
                          size='small' 
                          type='light'
                          color='blue'
                        >
                          {option}
                        </Tag>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ModelParams;
