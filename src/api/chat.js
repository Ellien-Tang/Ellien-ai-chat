/**
 * LLM API 模块
 * 统一封装对话请求、SSE 流式响应处理与异常重试机制
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000'
const MAX_RETRIES = 3
const RETRY_DELAY = 1000

/**
 * 延迟函数
 * @param {number} ms 毫秒
 */
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * 创建 SSE 请求
 * @param {string} endpoint API 端点
 * @param {object} body 请求体
 * @param {object} options 配置选项
 */
async function createSSERequest(endpoint, body, options = {}) {
  const { 
    retries = MAX_RETRIES, 
    timeout = 60000,
    onMessage,
    onError,
    onComplete
  } = options
  
  let attempt = 0
  let abortController = null
  let completed = false
  
  // 确保 onComplete 只调用一次
  const callComplete = () => {
    if (!completed) {
      completed = true
      onComplete?.()
    }
  }
  
  while (attempt < retries) {
    try {
      abortController = new AbortController()
      
      // 设置超时
      const timeoutId = setTimeout(() => {
        abortController.abort()
      }, timeout)
      
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify(body),
        signal: abortController.signal
      })
      
      clearTimeout(timeoutId)
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`)
      }
      
      // 处理 SSE 流
      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''
      let isDone = false
      
      while (!isDone) {
        const { done, value } = await reader.read()
        
        if (done) {
          // 处理缓冲区中剩余的数据
          if (buffer.trim()) {
            const lines = buffer.split('\n')
            for (const line of lines) {
              processLine(line.trim())
            }
          }
          isDone = true
          callComplete()
          break
        }
        
        // 解码数据
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() // 保留不完整的行
        
        for (const line of lines) {
          processLine(line.trim())
        }
      }
      
      // 成功完成，退出重试循环
      return { success: true }
      
    } catch (error) {
      attempt++
      
      // 用户取消，不重试
      if (error.name === 'AbortError') {
        console.log('请求被取消')
        callComplete()
        throw new Error('请求已取消')
      }
      
      console.error(`API 请求失败 (尝试 ${attempt}/${retries}):`, error)
      
      if (attempt >= retries) {
        callComplete()
        const finalError = new Error(
          error.message || '网络请求失败，请稍后重试'
        )
        onError?.(finalError)
        throw finalError
      }
      
      // 等待后重试
      onError?.(new Error(`连接失败，${RETRY_DELAY / 1000}秒后重试...`), true)
      await delay(RETRY_DELAY * attempt) // 指数退避
    } finally {
      abortController = null
    }
  }
  
  // 处理单行 SSE 数据的函数
  function processLine(trimmedLine) {
    if (!trimmedLine || !trimmedLine.startsWith('data: ')) return
    
    const data = trimmedLine.slice(6).trim()
    
    // 流结束标记
    if (data === '[DONE]') {
      return
    }
    
    try {
      const json = JSON.parse(data)
      
      // 处理错误 - 错误可能是对象或字符串
      if (json.error) {
        const errorMsg = typeof json.error === 'string' 
          ? json.error 
          : (json.error.message || JSON.stringify(json.error))
        throw new Error(errorMsg)
      }
      
      // 提取内容
      if (json.choices && json.choices.length > 0) {
        const delta = json.choices[0].delta
        const content = delta?.content || ''
        const reasoningContent = delta?.reasoning_content || ''
        
        if (content || reasoningContent) {
          onMessage?.({ content, reasoningContent })
        }
      }
    } catch (parseError) {
      // 如果不是手动抛出的错误，只是忽略解析错误
      if (parseError.message && !parseError.message.includes('流式请求失败')) {
        console.debug('SSE 数据解析跳过:', trimmedLine.slice(0, 100))
      } else {
        throw parseError
      }
    }
  }
}

/**
 * 发送聊天消息（流式）
 * @param {object} params 参数
 * @param {array} params.messages 消息列表
 * @param {function} params.onMessage 收到消息回调
 * @param {function} params.onError 错误回调
 * @param {function} params.onComplete 完成回调
 * @param {object} params.options 额外配置
 */
export async function sendChatMessage({
  messages,
  onMessage,
  onError,
  onComplete,
  options = {}
}) {
  const body = {
    messages,
    stream: true,
    ...options
  }
  
  return createSSERequest('/api/chat', body, {
    onMessage,
    onError,
    onComplete
  })
}

/**
 * 发送聊天消息（非流式）
 * @param {array} messages 消息列表
 * @param {object} options 额外配置
 */
export async function sendChatMessageSync(messages, options = {}) {
  let fullContent = ''
  let error = null
  
  await sendChatMessage({
    messages,
    onMessage: ({ content }) => {
      fullContent += content
    },
    onError: (err) => {
      error = err
    },
    options
  })
  
  if (error) throw error
  return fullContent
}

/**
 * 健康检查
 */
export async function healthCheck() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: { 'Accept': 'application/json' }
    })
    
    if (!response.ok) return { ok: false, error: '服务不可用' }
    
    const data = await response.json()
    return { ok: true, data }
  } catch (error) {
    return { ok: false, error: error.message }
  }
}

/**
 * 创建可取消的请求
 * @param {object} params 参数
 */
export function createCancellableChatRequest(params) {
  const abortController = new AbortController()
  let isCancelled = false
  
  const promise = sendChatMessage({
    ...params,
    options: {
      ...params.options,
      signal: abortController.signal
    }
  })
  
  return {
    promise,
    cancel: () => {
      isCancelled = true
      abortController.abort()
    },
    get isCancelled() {
      return isCancelled
    }
  }
}

export default {
  sendChatMessage,
  sendChatMessageSync,
  healthCheck,
  createCancellableChatRequest
}
