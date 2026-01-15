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

import React, { useState, useMemo, useCallback } from 'react';
import { Typography, Tabs, TabPane } from '@douyinfe/semi-ui';
import { IconCopy, IconTick } from '@douyinfe/semi-icons';

const { Text } = Typography;

// 生成 curl 代码
const generateCurl = (endpoint, requestBody, apiKey) => {
  const bodyJson = JSON.stringify(requestBody, null, 2);
  return `curl -X ${endpoint.method || 'POST'} '${endpoint.endpoint}' \\
  -H 'Content-Type: application/json' \\
  -H 'Authorization: Bearer ${apiKey || 'YOUR_API_KEY'}' \\
  -d '${bodyJson}'`;
};

// 生成 Python 代码
const generatePython = (endpoint, requestBody, apiKey) => {
  const bodyJson = JSON.stringify(requestBody, null, 4).replace(/"/g, '"');
  return `import requests

url = "${endpoint.endpoint}"
headers = {
    "Content-Type": "application/json",
    "Authorization": "Bearer ${apiKey || 'YOUR_API_KEY'}"
}

data = ${bodyJson}

response = requests.post(url, json=data, headers=headers)
print(response.json())`;
};

// 生成 JavaScript (fetch) 代码
const generateJavaScript = (endpoint, requestBody, apiKey) => {
  const bodyJson = JSON.stringify(requestBody, null, 2);
  return `const response = await fetch('${endpoint.endpoint}', {
  method: '${endpoint.method || 'POST'}',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${apiKey || 'YOUR_API_KEY'}'
  },
  body: JSON.stringify(${bodyJson})
});

const data = await response.json();
console.log(data);`;
};

// 生成 Node.js (axios) 代码
const generateNodeJs = (endpoint, requestBody, apiKey) => {
  const bodyJson = JSON.stringify(requestBody, null, 2);
  return `const axios = require('axios');

const response = await axios.post('${endpoint.endpoint}', ${bodyJson}, {
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer ${apiKey || 'YOUR_API_KEY'}'
  }
});

console.log(response.data);`;
};

// 生成 OpenAI SDK 代码
const generateOpenAI = (endpoint, requestBody, apiKey) => {
  if (endpoint.type === 'chat') {
    return `from openai import OpenAI

client = OpenAI(
    api_key="${apiKey || 'YOUR_API_KEY'}",
    base_url="${window.location.origin}/v1"
)

response = client.chat.completions.create(
    model="${requestBody.model}",
    messages=${JSON.stringify(requestBody.messages || [{ role: 'user', content: 'Hello!' }], null, 4)},
    temperature=${requestBody.temperature || 0.7},
    stream=${requestBody.stream || false}
)

print(response.choices[0].message.content)`;
  } else if (endpoint.type === 'image') {
    return `from openai import OpenAI

client = OpenAI(
    api_key="${apiKey || 'YOUR_API_KEY'}",
    base_url="${window.location.origin}/v1"
)

response = client.images.generate(
    model="${requestBody.model}",
    prompt="${requestBody.prompt || 'A cute cat'}",
    size="${requestBody.size || '1024x1024'}",
    n=${requestBody.n || 1}
)

print(response.data[0].url)`;
  } else if (endpoint.type === 'embedding') {
    return `from openai import OpenAI

client = OpenAI(
    api_key="${apiKey || 'YOUR_API_KEY'}",
    base_url="${window.location.origin}/v1"
)

response = client.embeddings.create(
    model="${requestBody.model}",
    input="${requestBody.input || 'Hello, world!'}"
)

print(response.data[0].embedding)`;
  }
  return generatePython(endpoint, requestBody, apiKey);
};

const CodeGenerator = ({ endpoint, requestBody, apiKey }) => {
  const [activeTab, setActiveTab] = useState('curl');
  const [copiedCode, setCopiedCode] = useState(null);

  const codeSnippets = useMemo(() => ({
    curl: generateCurl(endpoint, requestBody, apiKey),
    python: generatePython(endpoint, requestBody, apiKey),
    javascript: generateJavaScript(endpoint, requestBody, apiKey),
    nodejs: generateNodeJs(endpoint, requestBody, apiKey),
    openai: generateOpenAI(endpoint, requestBody, apiKey),
  }), [endpoint, requestBody, apiKey]);

  const copyToClipboard = useCallback(async (code, id) => {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(id);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, []);

  const renderCodeBlock = (code, id) => (
    <div className='relative group'>
      <pre 
        className='p-4 rounded-lg overflow-x-auto text-sm leading-relaxed m-0'
        style={{ 
          background: 'var(--semi-color-fill-0)',
          color: 'var(--semi-color-text-0)',
          maxHeight: '400px',
        }}
      >
        <code style={{ fontFamily: '"JetBrains Mono", Monaco, Consolas, "Courier New", monospace' }}>
          {code}
        </code>
      </pre>
      <button
        onClick={() => copyToClipboard(code, id)}
        className='absolute top-3 right-3 p-2 rounded-lg transition-all duration-200 hover:scale-110'
        style={{ background: 'var(--semi-color-fill-1)' }}
      >
        {copiedCode === id ? (
          <IconTick className='text-[var(--semi-color-success)]' />
        ) : (
          <IconCopy className='text-[var(--semi-color-text-2)]' />
        )}
      </button>
    </div>
  );

  return (
    <div className='rounded-xl border overflow-hidden' style={{ borderColor: 'var(--semi-color-border)' }}>
      <div 
        className='px-4 py-2 flex items-center justify-between border-b'
        style={{ background: 'var(--semi-color-fill-1)', borderColor: 'var(--semi-color-border)' }}
      >
        <Text strong size='small'>请求代码</Text>
      </div>
      <Tabs
        type='button'
        activeKey={activeTab}
        onChange={setActiveTab}
        style={{ padding: '12px 12px 0' }}
        tabBarExtraContent={
          <button
            onClick={() => copyToClipboard(codeSnippets[activeTab], 'current')}
            className='p-1.5 rounded-md transition-all duration-200 hover:scale-105 mr-2'
            style={{ background: 'var(--semi-color-fill-2)' }}
          >
            {copiedCode === 'current' ? (
              <IconTick size='small' className='text-[var(--semi-color-success)]' />
            ) : (
              <IconCopy size='small' className='text-[var(--semi-color-text-2)]' />
            )}
          </button>
        }
      >
        <TabPane tab='cURL' itemKey='curl'>
          {renderCodeBlock(codeSnippets.curl, 'curl')}
        </TabPane>
        <TabPane tab='Python' itemKey='python'>
          {renderCodeBlock(codeSnippets.python, 'python')}
        </TabPane>
        <TabPane tab='JavaScript' itemKey='javascript'>
          {renderCodeBlock(codeSnippets.javascript, 'javascript')}
        </TabPane>
        <TabPane tab='Node.js' itemKey='nodejs'>
          {renderCodeBlock(codeSnippets.nodejs, 'nodejs')}
        </TabPane>
        <TabPane tab='OpenAI SDK' itemKey='openai'>
          {renderCodeBlock(codeSnippets.openai, 'openai')}
        </TabPane>
      </Tabs>
    </div>
  );
};

export default CodeGenerator;

