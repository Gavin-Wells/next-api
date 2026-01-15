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

import React, { useState, useEffect } from 'react';
import { Typography, Spin, Empty, Nav } from '@douyinfe/semi-ui';
import {
  IconCode,
  IconAlertTriangle,
  IconInfoCircle,
  IconHome,
} from '@douyinfe/semi-icons';
import { getSystemName } from '../../helpers';
import { API } from '../../helpers/api';
import { useContext } from 'react';
import { UserContext } from '../../context/User';
import {
  OverviewSection,
  ApiPlayground,
  ErrorsPage,
  NotesPage,
  endpointMeta,
} from '../../components/api-docs';

const { Text } = Typography;

const ApiDocs = () => {
  const systemName = getSystemName();
  const [userState] = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  
  // 用户 tokens 状态
  const [userTokens, setUserTokens] = useState([]);
  const [selectedTokenKey, setSelectedTokenKey] = useState('');

  useEffect(() => {
    fetchConfig();
    if (userState?.user?.id) {
      fetchUserTokens();
    }
  }, [userState?.user?.id]);

  const fetchConfig = async () => {
    try {
      const response = await API.get('/api/docs/config');
      if (response.data.success) {
        const rawConfig = response.data.data || {};
        const endpoints = (rawConfig.endpoints || [])
          .map((endpoint) => ({
            ...endpoint,
            models: (endpoint.models || []).filter(Boolean),
          }))
          .filter((endpoint) => endpoint.models && endpoint.models.length > 0);
        setConfig({ ...rawConfig, endpoints });
      }
    } catch (error) {
      console.error('Failed to fetch API docs config:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchUserTokens = async () => {
    try {
      const response = await API.get('/api/token/?p=0&size=100');
      if (response.data.success) {
        const tokens = response.data.data || [];
        setUserTokens(tokens.filter(t => t.status === 1)); // 只显示启用的 token
      }
    } catch (error) {
      console.error('Failed to fetch user tokens:', error);
    }
  };

  // 构建导航项
  const buildNavItems = () => {
    const items = [
      { itemKey: 'overview', text: '概览', icon: <IconHome /> },
    ];

    config?.endpoints?.forEach((endpoint) => {
      const meta = endpointMeta[endpoint.type] || { icon: IconCode };
      const Icon = meta.icon;
      items.push({
        itemKey: endpoint.type,
        text: endpoint.name,
        icon: <Icon />,
      });
    });

    items.push(
      { itemKey: 'errors', text: '错误处理', icon: <IconAlertTriangle /> },
      { itemKey: 'notes', text: '使用指南', icon: <IconInfoCircle /> }
    );

    return items;
  };

  // 渲染当前选中内容
  const renderContent = () => {
    if (activeSection === 'overview') {
      return (
        <OverviewSection 
          systemName={systemName} 
          config={config} 
          onEndpointClick={setActiveSection}
        />
      );
    }
    
    if (activeSection === 'errors') {
      return <ErrorsPage />;
    }
    
    if (activeSection === 'notes') {
      return <NotesPage />;
    }
    
    const endpoint = config?.endpoints?.find((e) => e.type === activeSection);
    if (endpoint) {
      return (
        <ApiPlayground
          endpoint={endpoint}
          userTokens={userTokens}
          userId={userState?.user?.id}
          selectedTokenKey={selectedTokenKey}
          onSelectedTokenChange={setSelectedTokenKey}
        />
      );
    }
    
    return (
      <OverviewSection 
        systemName={systemName} 
        config={config} 
        onEndpointClick={setActiveSection}
      />
    );
  };

  if (loading) {
    return (
      <div className='mt-[60px] min-h-[calc(100vh-60px)] flex items-center justify-center'>
        <Spin size='large' />
      </div>
    );
  }

  if (!config) {
    return (
      <div className='mt-[60px] min-h-[calc(100vh-60px)] flex items-center justify-center'>
        <Empty description='无法加载 API 文档配置' />
      </div>
    );
  }

  // 判断是否是 playground 页面（需要全高度）
  const isPlayground = activeSection !== 'overview' && activeSection !== 'errors' && activeSection !== 'notes';

  return (
    <div className='mt-[60px] flex min-h-[calc(100vh-60px)]'>
      {/* 左侧导航栏 */}
      <div 
        className='w-60 flex-shrink-0 border-r sticky top-[60px] h-[calc(100vh-60px)] overflow-y-auto'
        style={{ 
          borderColor: 'var(--semi-color-border)', 
          background: 'var(--semi-color-bg-1)',
        }}
      >
        <div 
          className='p-4 border-b sticky top-0 z-10'
          style={{ 
            background: 'var(--semi-color-bg-1)',
            borderColor: 'var(--semi-color-border)' 
          }}
        >
          <div className='flex items-center gap-3'>
            <div 
              className='w-8 h-8 rounded-lg flex items-center justify-center'
              style={{ background: 'var(--semi-color-primary)', color: '#fff' }}
            >
              <IconCode size='small' />
            </div>
            <Text strong className='text-base'>API 文档</Text>
          </div>
        </div>
        <Nav
          selectedKeys={[activeSection]}
          onSelect={({ itemKey }) => setActiveSection(itemKey)}
          items={buildNavItems()}
          style={{ padding: '8px' }}
        />
      </div>

      {/* 主内容区 */}
      <div 
        className={`flex-1 ${isPlayground ? '' : 'p-8 overflow-auto'}`}
        style={{ background: 'var(--semi-color-bg-0)' }}
      >
        {isPlayground ? (
          renderContent()
        ) : (
          <div className='max-w-5xl mx-auto'>
            {renderContent()}
          </div>
        )}
      </div>
    </div>
  );
};

export default ApiDocs;
