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

import React, { useState, useEffect, useCallback } from 'react';
import { Typography, Spin, Empty, Tooltip, Tag } from '@douyinfe/semi-ui';
import {
  IconCode,
  IconAlertTriangle,
  IconInfoCircle,
  IconHome,
  IconChevronRight,
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
  endpointColorMap,
} from '../../components/api-docs';

const { Text } = Typography;

const ApiDocs = () => {
  const systemName = getSystemName();
  const [userState] = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [config, setConfig] = useState(null);
  const [activeSection, setActiveSection] = useState('overview');
  const [navCollapsed, setNavCollapsed] = useState(false);
  
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
        setUserTokens(tokens.filter(t => t.status === 1));
      }
    } catch (error) {
      console.error('Failed to fetch user tokens:', error);
    }
  };

  const handleSectionChange = useCallback((section) => {
    setActiveSection(section);
  }, []);

  // 导航项配置
  const navItems = [
    { key: 'overview', label: '概览', icon: IconHome, color: 'blue' },
    ...(config?.endpoints?.map((endpoint) => {
      const meta = endpointMeta[endpoint.type] || { icon: IconCode };
      return {
        key: endpoint.type,
        label: endpoint.name,
        icon: meta.icon,
        color: endpointColorMap[endpoint.type] || 'grey',
        count: endpoint.models?.length || 0,
      };
    }) || []),
    { key: 'errors', label: '错误处理', icon: IconAlertTriangle, color: 'red' },
    { key: 'notes', label: '使用指南', icon: IconInfoCircle, color: 'green' },
  ];

  // 渲染当前选中内容
  const renderContent = () => {
    if (activeSection === 'overview') {
      return (
        <OverviewSection 
          systemName={systemName} 
          config={config} 
          onEndpointClick={handleSectionChange}
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
        onEndpointClick={handleSectionChange}
      />
    );
  };

  if (loading) {
    return (
      <div className='mt-[60px] min-h-[calc(100vh-60px)] flex items-center justify-center'>
        <div className='text-center'>
          <Spin size='large' />
          <Text type='tertiary' className='block mt-4'>加载 API 文档...</Text>
        </div>
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

  const isPlayground = activeSection !== 'overview' && activeSection !== 'errors' && activeSection !== 'notes';

  return (
    <div className='mt-[60px] flex min-h-[calc(100vh-60px)]'>
      {/* 左侧导航栏 */}
      <nav 
        className={`
          flex-shrink-0 border-r sticky top-[60px] h-[calc(100vh-60px)] 
          transition-all duration-300 ease-in-out overflow-hidden
          ${navCollapsed ? 'w-16' : 'w-64'}
        `}
        style={{ 
          borderColor: 'var(--semi-color-border)', 
          background: 'var(--semi-color-bg-1)',
        }}
      >
        {/* Logo 区域 */}
        <div 
          className='h-16 border-b flex items-center justify-between px-4 cursor-pointer'
          style={{ borderColor: 'var(--semi-color-border)' }}
          onClick={() => setNavCollapsed(!navCollapsed)}
        >
          <div className='flex items-center gap-3 overflow-hidden'>
            <div 
              className='w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0'
              style={{ 
                background: 'linear-gradient(135deg, var(--semi-color-primary) 0%, var(--semi-color-primary-active) 100%)',
                boxShadow: '0 4px 12px rgba(var(--semi-color-primary-rgb), 0.3)'
              }}
            >
              <IconCode style={{ color: '#fff' }} />
            </div>
            {!navCollapsed && (
              <div className='overflow-hidden'>
                <Text strong className='text-base whitespace-nowrap'>API 文档</Text>
                <Text type='tertiary' size='small' className='block whitespace-nowrap'>
                  v1.0
                </Text>
              </div>
            )}
          </div>
          {!navCollapsed && (
            <IconChevronRight 
              className='text-[var(--semi-color-text-2)] transition-transform duration-300'
              style={{ transform: navCollapsed ? 'rotate(0deg)' : 'rotate(180deg)' }}
            />
          )}
        </div>

        {/* 导航列表 */}
        <div className='overflow-y-auto h-[calc(100%-4rem)] py-3'>
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = activeSection === item.key;
            const isEndpoint = !['overview', 'errors', 'notes'].includes(item.key);
            
            // 分隔线
            if (index > 0 && (item.key === 'errors' || (index === 1 && config?.endpoints?.length > 0))) {
              const showDivider = item.key === 'errors' || (index === 1 && !navCollapsed);
              if (item.key === 'errors') {
                return (
                  <React.Fragment key={item.key}>
                    <div 
                      className='mx-3 my-2 border-t'
                      style={{ borderColor: 'var(--semi-color-border)' }}
                    />
                    <NavItem 
                      item={item} 
                      isActive={isActive} 
                      navCollapsed={navCollapsed}
                      onClick={() => handleSectionChange(item.key)}
                    />
                  </React.Fragment>
                );
              }
            }
            
            return (
              <NavItem 
                key={item.key}
                item={item} 
                isActive={isActive} 
                navCollapsed={navCollapsed}
                onClick={() => handleSectionChange(item.key)}
              />
            );
          })}
        </div>
      </nav>

      {/* 主内容区 */}
      <main 
        className={`flex-1 ${isPlayground ? '' : 'overflow-auto'}`}
        style={{ background: 'var(--semi-color-bg-0)' }}
      >
        {isPlayground ? (
          renderContent()
        ) : (
          <div className='p-6 lg:p-8'>
            <div className='max-w-6xl mx-auto'>
              {renderContent()}
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

// 导航项组件
const NavItem = ({ item, isActive, navCollapsed, onClick }) => {
  const Icon = item.icon;
  
  const content = (
    <div
      className={`
        mx-2 mb-1 px-3 py-2.5 rounded-xl cursor-pointer
        transition-all duration-200 ease-out
        flex items-center gap-3
        ${isActive 
          ? 'shadow-sm' 
          : 'hover:bg-[var(--semi-color-fill-0)]'
        }
      `}
      style={{
        background: isActive 
          ? `var(--semi-color-${item.color}-light-default)` 
          : 'transparent',
      }}
      onClick={onClick}
    >
      <div 
        className={`
          w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0
          transition-all duration-200
        `}
        style={{
          background: isActive 
            ? `var(--semi-color-${item.color})` 
            : 'var(--semi-color-fill-1)',
          color: isActive ? '#fff' : `var(--semi-color-${item.color})`,
        }}
      >
        <Icon size='small' />
      </div>
      {!navCollapsed && (
        <div className='flex-1 min-w-0 flex items-center justify-between'>
          <Text 
            className='truncate'
            style={{ 
              color: isActive 
                ? `var(--semi-color-${item.color})` 
                : 'var(--semi-color-text-0)',
              fontWeight: isActive ? 600 : 400,
            }}
          >
            {item.label}
          </Text>
          {item.count !== undefined && (
            <Tag 
              size='small' 
              type={isActive ? 'solid' : 'light'}
              color={item.color}
              className='ml-2 flex-shrink-0'
            >
              {item.count}
            </Tag>
          )}
        </div>
      )}
    </div>
  );

  if (navCollapsed) {
    return (
      <Tooltip content={item.label} position='right'>
        {content}
      </Tooltip>
    );
  }

  return content;
};

export default ApiDocs;
