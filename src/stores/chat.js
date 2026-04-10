import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

// localStorage 键名
const STORAGE_KEY = 'ellien_chat_sessions'
const CURRENT_SESSION_KEY = 'ellien_current_session_id'

// 生成唯一ID
const generateId = () => Date.now().toString(36) + Math.random().toString(36).substr(2)

// 系统提示词 - 定义AI助手的角色和职责边界
const SYSTEM_PROMPT = `你是一位专业的心理健康AI助手，你的职责是：

1. **提供情感支持**：倾听用户的困扰，给予理解和共情
2. **心理健康科普**：解释心理学概念、情绪管理技巧、压力应对方法等
3. **疏导建议**：提供放松技巧、正念练习、认知重构等自助方法
4. **危机识别**：当用户表达自伤、自杀或严重心理危机时，必须建议寻求专业帮助

**重要边界**：
- 你不是医生，不能诊断疾病或开药方
- 遇到严重心理问题，建议用户寻求专业心理咨询师或医生帮助
- 保持温暖、耐心、非评判的态度
- 回答简洁易懂，避免过于学术化的术语`

// 创建新会话
const createNewSession = () => ({
  id: generateId(),
  title: '新对话',
  messages: [
    {
      id: generateId(),
      role: 'assistant',
      content: '你好！我是你的AI心理助手，有什么可以帮助你的吗？',
      timestamp: new Date().toISOString(),
      isStreaming: false
    }
  ],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  context: [] // 用于LLM上下文管理
})

export const useChatStore = defineStore('chat', () => {
  // ==================== State ====================
  const sessions = ref([])
  const currentSessionId = ref(null)
  const isLoading = ref(false)
  const error = ref(null)

  // ==================== Getters ====================
  
  // 当前会话
  const currentSession = computed(() => {
    return sessions.value.find(s => s.id === currentSessionId.value) || null
  })
  
  // 当前会话的消息列表
  const currentMessages = computed(() => {
    return currentSession.value?.messages || []
  })
  
  // 获取排序后的会话列表（最新的在前）
  const sortedSessions = computed(() => {
    return [...sessions.value].sort((a, b) => 
      new Date(b.updatedAt) - new Date(a.updatedAt)
    )
  })
  
  // 获取会话数量
  const sessionCount = computed(() => sessions.value.length)
  
  // 获取当前会话的上下文（用于LLM API）
  const currentContext = computed(() => {
    if (!currentSession.value) return []
    
    // 构建上下文：System提示词 + 最近20条消息
    const context = [{ role: 'system', content: SYSTEM_PROMPT }]
    
    // 取最近20条消息，过滤掉空内容和正在流式传输的消息
    const validMessages = currentSession.value.messages
      .filter(msg => !msg.isStreaming && msg.content.trim())
      .slice(-20)
      .map(msg => ({ role: msg.role, content: msg.content }))
    
    return context.concat(validMessages)
  })

  // ==================== Actions ====================
  
  // 从 localStorage 加载数据
  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      const storedCurrentId = localStorage.getItem(CURRENT_SESSION_KEY)
      
      if (stored) {
        const parsed = JSON.parse(stored)
        // 数据迁移：确保每条消息都有必要的字段
        sessions.value = parsed.map(session => ({
          ...createNewSession(),
          ...session,
          messages: session.messages.map(msg => ({
            id: msg.id || generateId(),
            role: msg.role,
            content: msg.content,
            timestamp: msg.timestamp || new Date().toISOString(),
            isStreaming: msg.isStreaming || false
          }))
        }))
      }
      
      if (storedCurrentId && sessions.value.find(s => s.id === storedCurrentId)) {
        currentSessionId.value = storedCurrentId
      } else if (sessions.value.length > 0) {
        currentSessionId.value = sessions.value[0].id
      } else {
        // 如果没有会话，创建一个新会话
        createSession()
      }
    } catch (err) {
      console.error('加载会话数据失败:', err)
      error.value = '加载历史会话失败'
      createSession()
    }
  }
  
  // 保存到 localStorage
  const saveToStorage = () => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(sessions.value))
      localStorage.setItem(CURRENT_SESSION_KEY, currentSessionId.value || '')
    } catch (err) {
      console.error('保存会话数据失败:', err)
      error.value = '保存会话数据失败'
    }
  }
  
  // 创建新会话
  const createSession = () => {
    const session = createNewSession()
    sessions.value.unshift(session)
    currentSessionId.value = session.id
    saveToStorage()
    return session
  }
  
  // 切换当前会话
  const switchSession = (sessionId) => {
    const session = sessions.value.find(s => s.id === sessionId)
    if (session) {
      currentSessionId.value = sessionId
      localStorage.setItem(CURRENT_SESSION_KEY, sessionId)
      return true
    }
    return false
  }
  
  // 删除会话
  const deleteSession = (sessionId) => {
    const index = sessions.value.findIndex(s => s.id === sessionId)
    if (index === -1) return false
    
    sessions.value.splice(index, 1)
    
    // 如果删除的是当前会话，切换到其他会话
    if (currentSessionId.value === sessionId) {
      if (sessions.value.length > 0) {
        currentSessionId.value = sessions.value[0].id
      } else {
        createSession()
      }
    }
    
    saveToStorage()
    return true
  }
  
  // 直接设置会话标题
  const setSessionTitle = (sessionId, title) => {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session) return false
    
    session.title = title.slice(0, 30) + (title.length > 30 ? '...' : '')
    session.updatedAt = new Date().toISOString()
    saveToStorage()
    return true
  }
  
  // 检查是否需要生成标题（第一轮对话完成且标题还是默认）
  const needGenerateTitle = (sessionId) => {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session || session.title !== '新对话') return false
    
    // 统计有效消息（非流式且有内容）
    const validMessages = session.messages.filter(m => !m.isStreaming && m.content.trim())
    const userMsgCount = validMessages.filter(m => m.role === 'user').length
    const assistantMsgCount = validMessages.filter(m => m.role === 'assistant').length
    
    // 至少1轮完整对话（1条用户消息 + 至少1条助手回复，不包括初始欢迎语）
    return userMsgCount >= 1 && assistantMsgCount >= 2
  }
  
  // 获取用于生成标题的上下文摘要
  const getTitleGenerationContext = (sessionId) => {
    const session = sessions.value.find(s => s.id === sessionId)
    if (!session) return ''
    
    // 取前4条消息（2轮对话）来生成标题
    const validMessages = session.messages
      .filter(m => !m.isStreaming && m.content.trim())
      .slice(0, 4)
    
    return validMessages.map(m => `${m.role === 'user' ? '用户' : '助手'}：${m.content.slice(0, 100)}`).join('\n')
  }
  
  // 添加消息到当前会话
  const addMessage = (message) => {
    if (!currentSession.value) return null
    
    const msg = {
      id: generateId(),
      timestamp: new Date().toISOString(),
      isStreaming: false,
      ...message
    }
    
    currentSession.value.messages.push(msg)
    currentSession.value.updatedAt = new Date().toISOString()
    
    saveToStorage()
    return msg
  }
  
  // 更新消息内容（用于流式输出）
  const updateMessage = (messageId, updates) => {
    if (!currentSession.value) return false
    
    const message = currentSession.value.messages.find(m => m.id === messageId)
    if (!message) return false
    
    Object.assign(message, updates)
    currentSession.value.updatedAt = new Date().toISOString()
    saveToStorage()
    return true
  }
  
  // 删除单条消息
  const deleteMessage = (messageId) => {
    if (!currentSession.value) return false
    
    const index = currentSession.value.messages.findIndex(m => m.id === messageId)
    if (index === -1) return false
    
    currentSession.value.messages.splice(index, 1)
    currentSession.value.updatedAt = new Date().toISOString()
    saveToStorage()
    return true
  }
  
  // 清空当前会话消息
  const clearCurrentSession = () => {
    if (!currentSession.value) return false
    
    currentSession.value.messages = [
      {
        id: generateId(),
        role: 'assistant',
        content: '你好！我是你的AI心理助手，有什么可以帮助你的吗？',
        timestamp: new Date().toISOString(),
        isStreaming: false
      }
    ]
    currentSession.value.title = '新对话'
    currentSession.value.updatedAt = new Date().toISOString()
    saveToStorage()
    return true
  }
  
  // 清空所有会话
  const clearAllSessions = () => {
    sessions.value = []
    createSession()
    saveToStorage()
  }
  
  // 导出会话数据
  const exportData = () => {
    return JSON.stringify(sessions.value, null, 2)
  }
  
  // 导入会话数据
  const importData = (jsonString) => {
    try {
      const data = JSON.parse(jsonString)
      if (Array.isArray(data)) {
        sessions.value = data
        if (data.length > 0) {
          currentSessionId.value = data[0].id
        } else {
          createSession()
        }
        saveToStorage()
        return true
      }
      return false
    } catch (err) {
      console.error('导入数据失败:', err)
      return false
    }
  }

  return {
    // State
    sessions,
    currentSessionId,
    isLoading,
    error,
    // Getters
    currentSession,
    currentMessages,
    sortedSessions,
    sessionCount,
    currentContext,
    // Actions
    loadFromStorage,
    saveToStorage,
    createSession,
    switchSession,
    deleteSession,
    setSessionTitle,
    needGenerateTitle,
    getTitleGenerationContext,
    addMessage,
    updateMessage,
    deleteMessage,
    clearCurrentSession,
    clearAllSessions,
    exportData,
    importData
  }
})
