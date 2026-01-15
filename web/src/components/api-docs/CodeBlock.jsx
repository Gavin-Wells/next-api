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

import React, { useState, useCallback } from 'react';
import { Typography } from '@douyinfe/semi-ui';
import { IconCopy, IconTick } from '@douyinfe/semi-icons';

const { Text } = Typography;

const CodeBlock = ({ children, id, title }) => {
  const [copiedCode, setCopiedCode] = useState(null);

  const codeText = typeof children === 'object' 
    ? JSON.stringify(children, null, 2) 
    : children;

  const copyToClipboard = useCallback(async (text, copyId) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedCode(copyId);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);
  
  return (
    <div className='relative group rounded-xl overflow-hidden border border-[var(--semi-color-border)] shadow-sm'>
      {title && (
        <div 
          className='px-4 py-2 flex items-center justify-between border-b'
          style={{ 
            background: 'var(--semi-color-fill-1)', 
            borderColor: 'var(--semi-color-border)' 
          }}
        >
          <Text size='small' type='tertiary'>{title}</Text>
          <button
            onClick={() => copyToClipboard(codeText, id)}
            className='p-1.5 rounded-md transition-all duration-200 hover:scale-105'
            style={{ background: 'var(--semi-color-fill-2)' }}
          >
            {copiedCode === id ? (
              <IconTick size='small' className='text-[var(--semi-color-success)]' />
            ) : (
              <IconCopy size='small' className='text-[var(--semi-color-text-2)]' />
            )}
          </button>
        </div>
      )}
      <pre 
        className='p-4 overflow-x-auto text-sm leading-relaxed m-0'
        style={{ 
          background: 'var(--semi-color-fill-0)',
          color: 'var(--semi-color-text-0)',
        }}
      >
        <code style={{ fontFamily: '"JetBrains Mono", Monaco, Consolas, "Courier New", monospace' }}>
          {codeText}
        </code>
      </pre>
      {!title && (
        <button
          onClick={() => copyToClipboard(codeText, id)}
          className='absolute top-3 right-3 p-2 rounded-lg transition-all duration-200 hover:scale-110 opacity-0 group-hover:opacity-100'
          style={{ background: 'var(--semi-color-fill-1)' }}
        >
          {copiedCode === id ? (
            <IconTick className='text-[var(--semi-color-success)]' />
          ) : (
            <IconCopy className='text-[var(--semi-color-text-2)]' />
          )}
        </button>
      )}
    </div>
  );
};

export default CodeBlock;

