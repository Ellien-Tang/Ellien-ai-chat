<script setup>
import { ref, computed, onMounted, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import { useChatStore } from '../stores/chat'
import { sendChatMessage } from '../api/chat'

// 组件导入
import SessionSidebar from '../components/SessionSidebar.vue'
import MessageList from '../components/MessageList.vue'
import ChatBox from '../components/ChatBox.vue'

const chatStore = useChatStore()

// ==================== 状态管理 ====================
const inputMessage = ref('')
const isGenerating = ref(false)
const messageListRef = ref(null)
const chatBoxRef = ref(null)

// ==================== 计算属性 ====================
const currentSession = computed(() => chatStore.currentSession)
const currentMessages = computed(() => chatStore.currentMessages)

// ==================== 方法 ====================

// 发送消息
const sendMessage = async (content) => {
  if (!content.trim() || isGenerating.value) return
  
  // 如果是第一条消息，设置标题
  const session = chatStore.currentSession
  if (session && session.title === '新对话') {
    const title = content.trim().slice(0, 20) + (content.trim().length > 20 ? '...' : '')
    chatStore.setSessionTitle(session.id, title)
  }
  
  // 添加用户消息
  chatStore.addMessage({
    role: 'user',
    content: content.trim()
  })
  
  // 清空输入框
  inputMessage.value = ''
  chatBoxRef.value?.clear()
  
  // 开始生成回复
  await generateAIResponse()
}

// 生成 AI 回复
const generateAIResponse = async () => {
  isGenerating.value = true
  
  // 创建 AI 消息占位
  const aiMessage = chatStore.addMessage({
    role: 'assistant',
    content: '',
    isStreaming: true
  })
  
  // 保存消息ID用于后续操作
  const messageId = aiMessage.id
  let hasReceivedContent = false
  let timeoutId = null
  
  // 设置超时保护：如果15秒内没有收到任何数据，自动结束
  const startTimeout = () => {
    timeoutId = setTimeout(() => {
      if (!hasReceivedContent) {
        console.log('请求超时：15秒内未收到数据')
        // 标记为完成，触发清理逻辑
        handleComplete()
      }
    }, 15000)
  }
  
  // 清理超时
  const clearTimeoutGuard = () => {
    if (timeoutId) {
      clearTimeout(timeoutId)
      timeoutId = null
    }
  }
  
  // 统一的完成处理
  const handleComplete = () => {
    clearTimeoutGuard()
    
    // 避免重复处理
    if (!isGenerating.value) return
    
    console.log('Stream completed, hasReceivedContent:', hasReceivedContent)
    
    // 必须从store获取最新状态
    const currentMsg = chatStore.currentMessages.find(m => m.id === messageId)
    const finalContent = currentMsg?.content?.trim() || ''
    
    console.log('Final content:', finalContent)
    
    // 完成流式输出 - 一定要先停止流式状态
    chatStore.updateMessage(messageId, { isStreaming: false })
    isGenerating.value = false
    
    // 如果没有收到任何内容，删除空消息
    if (!hasReceivedContent && finalContent === '') {
      console.log('No content received, deleting empty message')
      chatStore.deleteMessage(messageId)
      ElMessage.warning('AI 未返回内容，可能是 API Key 失效，请检查后重试')
    }
  }
  
  try {
    // 获取上下文
    const context = chatStore.currentContext
    
    // 启动超时保护
    startTimeout()
    
    // 发送请求
    await sendChatMessage({
      messages: context,
      onMessage: ({ content }) => {
        // 收到数据，清除超时
        if (!hasReceivedContent && content) {
          clearTimeoutGuard()
          hasReceivedContent = true
        }
        
        // 更新消息内容 - 使用函数式更新确保获取最新值
        const currentMsg = chatStore.currentMessages.find(m => m.id === messageId)
        if (currentMsg) {
          chatStore.updateMessage(messageId, {
            content: currentMsg.content + content
          })
        }
        
        // 滚动到底部
        nextTick(() => {
          messageListRef.value?.scrollToBottom()
        })
      },
      onError: (error, isRetry) => {
        if (!isRetry) {
          console.error('Chat error:', error)
        }
      },
      onComplete: handleComplete
    })
    
  } catch (error) {
    console.error('生成回复失败:', error)
    clearTimeoutGuard()
    
    // 出错时停止流式状态
    chatStore.updateMessage(messageId, { isStreaming: false })
    isGenerating.value = false
    
    // 获取最新消息内容
    const currentMsg = chatStore.currentMessages.find(m => m.id === messageId)
    const finalContent = currentMsg?.content?.trim() || ''
    
    // 如果是空消息，直接删除
    if (finalContent === '') {
      chatStore.deleteMessage(messageId)
    }
    
    ElMessage.error(error.message || '获取回复失败')
  }
}

// 处理语音输入结果
const handleVoiceResult = (text) => {
  inputMessage.value = text
}

// 删除消息
const deleteMessage = (messageId) => {
  chatStore.deleteMessage(messageId)
  ElMessage.success('消息已删除')
}

// 滚动到底部
const scrollToBottom = () => {
  messageListRef.value?.scrollToBottom()
}

// ==================== 生命周期 ====================
onMounted(() => {
  // 加载会话数据
  chatStore.loadFromStorage()
  
  // 滚动到底部
  nextTick(() => {
    scrollToBottom()
  })
})
</script>

<template>
  <div class="ai-view">
    <!-- 侧边栏：会话列表 -->
    <SessionSidebar class="sidebar" />
    
    <!-- 主聊天区域 -->
    <div class="chat-container">
      <!-- 消息列表 -->
      <MessageList
        ref="messageListRef"
        :messages="currentMessages"
        :is-generating="isGenerating"
        @delete-message="deleteMessage"
      />
      
      <!-- 输入区域 -->
      <div class="input-area">
        <ChatBox
          ref="chatBoxRef"
          v-model="inputMessage"
          :loading="isGenerating"
          :disabled="isGenerating"
          placeholder="请输入消息...（Shift+Enter换行，Enter发送）"
          loading-text="生成中..."
          tips-text="Enter 发送 · Shift+Enter 换行 · 支持语音输入"
          @send="sendMessage"
          @voice-result="handleVoiceResult"
        >
          <!-- 自定义额外操作 -->
          <template #actions="{ loading, disabled }">
            <el-button
              type="primary"
              :disabled="disabled || !inputMessage.trim()"
              :loading="loading"
              class="send-btn"
              @click="sendMessage(inputMessage)"
            >
              {{ loading ? '生成中...' : '发送' }}
            </el-button>
          </template>
        </ChatBox>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ai-view {
  display: flex;
  height: 100vh;
  background-color: #fff;
}

.sidebar {
  flex-shrink: 0;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  height: 100%;
}

.input-area {
  padding: 16px 20px 20px;
  background-color: #fff;
  border-top: 1px solid #e8e8e8;
}

.send-btn {
  min-width: 100px;
}
</style>
