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
import { Card, Avatar, Typography, Tag, Space, Descriptions } from '@douyinfe/semi-ui';
import { IconInfoCircle, IconPriceTag } from '@douyinfe/semi-icons';
import { stringToColor } from '../../../../../helpers';

const { Text } = Typography;

const ModelBasicInfo = ({ modelData, vendorsMap = {}, t }) => {
  // 获取模型描述（使用后端真实数据）
  const getModelDescription = () => {
    if (!modelData) return t('暂无模型描述');

    // 优先使用后端提供的描述
    if (modelData.description) {
      return modelData.description;
    }

    // 如果没有描述但有供应商描述，显示供应商信息
    if (modelData.vendor_description) {
      return t('供应商信息：') + modelData.vendor_description;
    }

    return t('暂无模型描述');
  };

  // 获取模型标签
  const getModelTags = () => {
    const tags = [];

    if (modelData?.tags) {
      const customTags = modelData.tags.split(',').filter((tag) => tag.trim());
      customTags.forEach((tag) => {
        const tagText = tag.trim();
        tags.push({ text: tagText, color: stringToColor(tagText) });
      });
    }

    return tags;
  };

  // 获取计费类型显示
  const getBillingType = () => {
    if (modelData?.quota_type === 0) {
      return { text: t('按量计费'), color: 'violet' };
    } else if (modelData?.quota_type === 1) {
      return { text: t('按次计费'), color: 'teal' };
    }
    return { text: '-', color: 'grey' };
  };

  // 获取价格信息
  const getPriceInfo = () => {
    if (!modelData) return null;

    const billingType = getBillingType();

    if (modelData.quota_type === 0) {
      // 按量计费
      const inputPrice = (modelData.model_ratio * 2).toFixed(4);
      const outputPrice = (modelData.model_ratio * (modelData.completion_ratio || 1) * 2).toFixed(4);
      return {
        billingType,
        inputPrice: `$${inputPrice}`,
        outputPrice: `$${outputPrice}`,
        isPerToken: true,
      };
    } else if (modelData.quota_type === 1) {
      // 按次计费
      const price = parseFloat(modelData.model_price || 0).toFixed(4);
      return {
        billingType,
        price: `$${price}`,
        isPerToken: false,
      };
    }

    return null;
  };

  const priceInfo = getPriceInfo();

  return (
    <Card className='!rounded-2xl shadow-sm border-0 mb-6'>
      <div className='flex items-center mb-4'>
        <Avatar size='small' color='blue' className='mr-2 shadow-md'>
          <IconInfoCircle size={16} />
        </Avatar>
        <div>
          <Text className='text-lg font-medium'>{t('基本信息')}</Text>
          <div className='text-xs text-gray-600'>
            {t('模型的详细描述和基本特性')}
          </div>
        </div>
      </div>

      {/* 价格信息卡片 */}
      {priceInfo && (
        <div className='bg-gradient-to-r from-orange-50 to-amber-50 rounded-xl p-4 mb-4 border border-orange-100'>
          <div className='flex items-center gap-2 mb-3'>
            <IconPriceTag className='text-orange-500' />
            <Text strong className='text-orange-700'>{t('价格信息')}</Text>
            <Tag color={priceInfo.billingType.color} size='small' shape='circle'>
              {priceInfo.billingType.text}
            </Tag>
          </div>
          
          {priceInfo.isPerToken ? (
            <div className='grid grid-cols-2 gap-4'>
              <div className='bg-white/70 rounded-lg p-3 text-center'>
                <div className='text-xs text-gray-500 mb-1'>{t('输入价格')}</div>
                <div className='text-xl font-bold text-orange-600'>{priceInfo.inputPrice}</div>
                <div className='text-xs text-gray-400'>/ 1M tokens</div>
              </div>
              <div className='bg-white/70 rounded-lg p-3 text-center'>
                <div className='text-xs text-gray-500 mb-1'>{t('输出价格')}</div>
                <div className='text-xl font-bold text-orange-600'>{priceInfo.outputPrice}</div>
                <div className='text-xs text-gray-400'>/ 1M tokens</div>
              </div>
            </div>
          ) : (
            <div className='bg-white/70 rounded-lg p-3 text-center'>
              <div className='text-xs text-gray-500 mb-1'>{t('单次价格')}</div>
              <div className='text-2xl font-bold text-orange-600'>{priceInfo.price}</div>
              <div className='text-xs text-gray-400'>/ {t('次')}</div>
            </div>
          )}
          
          {/* 倍率信息 */}
          <div className='mt-3 pt-3 border-t border-orange-100 flex flex-wrap gap-2 text-xs text-gray-500'>
            <span>{t('模型倍率')}: <Text strong>{modelData.model_ratio || '-'}</Text></span>
            {modelData.quota_type === 0 && (
              <span>{t('补全倍率')}: <Text strong>{modelData.completion_ratio || 1}</Text></span>
            )}
          </div>
        </div>
      )}

      <div className='text-gray-600'>
        <p className='mb-4'>{getModelDescription()}</p>
        {getModelTags().length > 0 && (
          <Space wrap>
            {getModelTags().map((tag, index) => (
              <Tag key={index} color={tag.color} shape='circle' size='small'>
                {tag.text}
              </Tag>
            ))}
          </Space>
        )}
      </div>
    </Card>
  );
};

export default ModelBasicInfo;
