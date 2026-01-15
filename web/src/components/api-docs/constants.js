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

import {
  IconCode,
  IconImage,
  IconComment,
  IconPlayCircle,
  IconVolume2,
  IconHash,
} from '@douyinfe/semi-icons';

// 端点类型配置
export const endpointMeta = {
  chat: { icon: IconComment, label: '文本对话' },
  image: { icon: IconImage, label: '图像生成' },
  video: { icon: IconPlayCircle, label: '视频生成' },
  audio: { icon: IconVolume2, label: '语音服务' },
  embedding: { icon: IconHash, label: '文本嵌入' },
  rerank: { icon: IconCode, label: '重排序' },
};

// 供应商颜色
export const vendorColors = {
  OpenAI: 'green',
  Anthropic: 'orange',
  Google: 'blue',
  DeepSeek: 'cyan',
  Moonshot: 'amber',
  '豆包 (Doubao)': 'red',
  'MiniMax (Hailuo)': 'teal',
  'Kling (快手)': 'pink',
  Vidu: 'violet',
  '即梦 (Jimeng)': 'pink',
  '阿里云 (通义万相)': 'orange',
  'Google (Gemini Veo)': 'blue',
  'Google (Vertex AI)': 'green',
  智谱AI: 'blue',
  百度: 'red',
  腾讯: 'blue',
  零一万物: 'violet',
  Meta: 'blue',
  Mistral: 'orange',
  Midjourney: 'indigo',
  Other: 'grey',
};

// 端点类型颜色映射
export const endpointColorMap = {
  chat: 'blue',
  image: 'violet',
  video: 'orange',
  audio: 'cyan',
  embedding: 'green',
  rerank: 'amber',
};

// 获取供应商颜色
export const getVendorColor = (vendor) => vendorColors[vendor] || 'grey';

// HTTP 方法颜色映射
export const methodColorMap = {
  GET: 'green',
  POST: 'blue',
  PUT: 'orange',
  DELETE: 'red',
};

