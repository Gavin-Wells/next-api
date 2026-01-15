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
import { Typography, Tag, Table } from '@douyinfe/semi-ui';

const { Text } = Typography;

const ModelParams = ({ model }) => {
  const hasParams =
    model.supported_durations?.length > 0 ||
    model.supported_resolutions?.length > 0 ||
    model.supported_ratios?.length > 0 ||
    model.supported_sizes?.length > 0;

  if (!hasParams && !model.parameters?.length) return null;

  return (
    <div className='mt-4 p-4 rounded-lg' style={{ background: 'var(--semi-color-fill-0)' }}>
      <Text strong size='small' className='block mb-3'>参数配置</Text>
      <div className='flex flex-wrap gap-4'>
        {model.default_duration && (
          <div>
            <Text type='tertiary' size='small' className='block mb-1'>默认时长</Text>
            <Tag color='blue'>{model.default_duration}秒</Tag>
          </div>
        )}
        {model.supported_durations?.length > 0 && (
          <div>
            <Text type='tertiary' size='small' className='block mb-1'>支持时长</Text>
            <div className='flex gap-1 flex-wrap'>
              {model.supported_durations.map((d) => (
                <Tag key={d} type='light' color='blue'>{d}s</Tag>
              ))}
            </div>
          </div>
        )}
        {model.default_resolution && (
          <div>
            <Text type='tertiary' size='small' className='block mb-1'>默认分辨率</Text>
            <Tag color='green'>{model.default_resolution}</Tag>
          </div>
        )}
        {model.supported_resolutions?.length > 0 && (
          <div>
            <Text type='tertiary' size='small' className='block mb-1'>支持分辨率</Text>
            <div className='flex gap-1 flex-wrap'>
              {model.supported_resolutions.map((r) => (
                <Tag key={r} type='light' color='green'>{r}</Tag>
              ))}
            </div>
          </div>
        )}
        {model.supported_ratios?.length > 0 && (
          <div>
            <Text type='tertiary' size='small' className='block mb-1'>宽高比</Text>
            <div className='flex gap-1 flex-wrap'>
              {model.supported_ratios.map((r) => (
                <Tag key={r} type='light' color='orange'>{r}</Tag>
              ))}
            </div>
          </div>
        )}
        {model.supported_sizes?.length > 0 && (
          <div>
            <Text type='tertiary' size='small' className='block mb-1'>支持尺寸</Text>
            <div className='flex gap-1 flex-wrap'>
              {model.supported_sizes.map((s) => (
                <Tag key={s} type='light' color='violet'>{s}</Tag>
              ))}
            </div>
          </div>
        )}
      </div>
      {model.parameters?.length > 0 && (
        <div className='mt-4'>
          <Table
            size='small'
            dataSource={model.parameters}
            pagination={false}
            columns={[
              { 
                title: '参数', 
                dataIndex: 'name', 
                render: (v) => (
                  <code 
                    className='px-2 py-1 rounded text-sm' 
                    style={{ background: 'var(--semi-color-fill-1)' }}
                  >
                    {v}
                  </code>
                )
              },
              { title: '类型', dataIndex: 'type', width: 80 },
              {
                title: '必填',
                dataIndex: 'required',
                width: 60,
                render: (v) => v ? <Tag color='red' size='small'>是</Tag> : <Tag size='small'>否</Tag>,
              },
              {
                title: '默认值',
                dataIndex: 'default',
                width: 100,
                render: (v) => v !== undefined ? <code className='text-sm'>{String(v)}</code> : '-',
              },
              {
                title: '可选值',
                dataIndex: 'options',
                render: (v) => v?.length > 0 ? (
                  <div className='flex flex-wrap gap-1'>
                    {v.map((o) => <Tag key={o} size='small' type='light'>{o}</Tag>)}
                  </div>
                ) : '-',
              },
            ]}
          />
        </div>
      )}
    </div>
  );
};

export default ModelParams;

