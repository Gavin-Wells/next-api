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
import { Typography, Tag, Button } from '@douyinfe/semi-ui';
import { IconVolume2, IconImage, IconPlay } from '@douyinfe/semi-icons';
import { getVendorColor } from './constants';
import ModelParams from './ModelParams';

const { Text } = Typography;

const ModelCard = ({ model, endpoint, onTestClick }) => {
  return (
    <div
      className='p-5 rounded-xl border-2 transition-all duration-300 hover:shadow-lg hover:-translate-y-0.5 group'
      style={{
        background: 'var(--semi-color-bg-0)',
        borderColor: 'var(--semi-color-border)',
      }}
    >
      <div className='flex items-start justify-between gap-4'>
        <div className='flex-1 min-w-0'>
          <div className='flex items-center gap-2 mb-3 flex-wrap'>
            <code 
              className='px-3 py-1.5 rounded-lg font-semibold text-sm'
              style={{ 
                background: `var(--semi-color-${getVendorColor(model.vendor)}-light-default)`,
                color: `var(--semi-color-${getVendorColor(model.vendor)})`
              }}
            >
              {model.id}
            </code>
            {model.type && <Tag size='small' type='light' color='cyan'>{model.type}</Tag>}
          </div>
          <div className='flex items-center gap-2 flex-wrap'>
            {model.supports_audio && (
              <Tag size='small' color='violet' type='ghost'>
                <IconVolume2 size='small' className='mr-1' />音频
              </Tag>
            )}
            {model.supports_first_frame && (
              <Tag size='small' color='green' type='ghost'>
                <IconImage size='small' className='mr-1' />首帧
              </Tag>
            )}
            {model.supports_last_frame && (
              <Tag size='small' color='orange' type='ghost'>
                <IconImage size='small' className='mr-1' />尾帧
              </Tag>
            )}
          </div>
        </div>
        <div className='flex flex-col items-end gap-2'>
          <Tag type='solid' color={getVendorColor(model.vendor)} size='small'>
            {model.vendor}
          </Tag>
          <Button 
            size='small' 
            type='primary'
            theme='light'
            icon={<IconPlay />}
            onClick={() => onTestClick(model, endpoint)}
            className='opacity-80 group-hover:opacity-100 transition-opacity'
          >
            测试
          </Button>
        </div>
      </div>
      {model.description && (
        <Text type='tertiary' className='block mt-3 text-sm'>{model.description}</Text>
      )}
      <ModelParams model={model} />
    </div>
  );
};

export default ModelCard;

