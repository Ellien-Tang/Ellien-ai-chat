const http = require('http');
const https = require('https');
const dotenv = require('dotenv');

// 加载环境变量
dotenv.config();

const API_KEY = process.env.XUNFEI_API_KEY;
const PORT = process.env.PORT || 3000;

// 创建与简化版服务器完全相同的HTTP服务器
const server = http.createServer((req, res) => {
  // 设置CORS头
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // 处理OPTIONS请求
  if (req.method === 'OPTIONS') {
    res.statusCode = 200;
    res.end();
    return;
  }
  
  // 只处理POST请求到/api/chat
  if (req.method === 'POST' && req.url === '/api/chat') {
    let body = '';
    
    // 接收请求体
    req.on('data', (chunk) => {
      body += chunk;
    });
    
    req.on('end', () => {
      try {
        const requestData = JSON.parse(body);
        const { messages } = requestData;
        
        console.log('=== 收到请求 ===');
        console.log('消息:', JSON.stringify(messages, null, 2));
        
        // 所有请求都使用流式处理
        handleStreamRequest(messages, res);
      } catch (error) {
        console.error('解析请求体错误:', error);
        res.statusCode = 400;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: '请求格式错误' }));
      }
    });
  } else if (req.method === 'GET' && req.url === '/health') {
    // 健康检查端点
    res.statusCode = 200;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ status: 'ok', message: 'AI Chat API is running' }));
  } else {
    res.statusCode = 404;
    res.end();
  }
});

// 处理流式请求
function handleStreamRequest(messages, res) {
  // 创建请求体
  const requestBody = {
    model: 'xopqwen35397b',
    messages: messages,
    max_tokens: 4000,
    temperature: 0.7,
    stream: true
  };
  
  // 创建请求选项
  const options = {
    hostname: 'maas-api.cn-huabei-1.xf-yun.com',
    port: 443,
    path: '/v2/chat/completions',
    method: 'POST',
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${API_KEY}`,
      'User-Agent': 'Node.js-Client',
      'Accept': '*/*'
    }
  };
  
  console.log('\n=== 发送到 MaaS ===');
  console.log('请求体:', JSON.stringify(requestBody, null, 2));
  
  // 创建请求
  const maasReq = https.request(options, (maasRes) => {
    console.log('\n=== MaaS API 响应 ===');
    console.log('状态码:', maasRes.statusCode);
    console.log('响应头:', JSON.stringify(maasRes.headers, null, 2));
    
    // 设置SSE响应头
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    
    // 用于记录收到的数据
    let dataReceived = false;
    let dataBuffer = '';
    
    // 监听数据事件来记录日志
    maasRes.on('data', (chunk) => {
      const chunkStr = chunk.toString();
      dataBuffer += chunkStr;
      
      if (!dataReceived) {
        dataReceived = true;
        console.log('收到首块数据:', chunkStr.substring(0, 200));
      }
    });
    
    // 将MaaS响应转发给客户端
    maasRes.pipe(res);
    
    // 响应结束时记录日志
    maasRes.on('end', () => {
      console.log('\n=== 响应结束 ===');
      console.log('是否收到数据:', dataReceived);
      if (dataReceived) {
        console.log('总数据长度:', dataBuffer.length);
        // 打印所有 data: 行
        const lines = dataBuffer.split('\n');
        const dataLines = lines.filter(line => line.trim().startsWith('data:'));
        console.log('SSE 数据行数:', dataLines.length);
        if (dataLines.length > 0 && dataLines.length <= 5) {
          console.log('数据内容:', dataLines.join('\n'));
        } else if (dataLines.length > 5) {
          console.log('前5行数据:', dataLines.slice(0, 5).join('\n'));
          console.log('... 还有', dataLines.length - 5, '行');
        }
      } else {
        console.log('警告: 没有收到任何数据！可能是 API Key 失效');
      }
    });
  });
  
  // 错误处理
  maasReq.on('error', (error) => {
    console.error('\n=== 请求错误 ===');
    console.error('错误:', error.message);
    
    res.write(`data: {"error": "流式请求失败：${error.message}"} \n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  });
  
  // 超时处理
  maasReq.on('timeout', () => {
    console.error('\n=== 请求超时 ===');
    maasReq.destroy();
    
    res.write(`data: {"error": "请求超时"} \n\n`);
    res.write('data: [DONE]\n\n');
    res.end();
  });
  
  // 发送请求体
  maasReq.write(JSON.stringify(requestBody));
  maasReq.end();
  
  console.log('\n=== 请求已发送 ===');
}

// 启动服务器
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`API Key: ${API_KEY ? API_KEY.substring(0, 10) + '...' : '未设置'}`);
});
