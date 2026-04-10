<template>
  <div :class="['message-item', roleClass]">
    <div class="message-avatar">
      <el-avatar 
        :size="40" 
        :icon="message.role === 'assistant' ? ChatLineRound : UserFilled"
        :class="message.role"
      />
    </div>
    
    <div class="message-body">
      <div class="message-header">
        <span class="message-role">{{ roleText }}</span>
        <span class="message-time">{{ formattedTime }}</span>
        <el-dropdown v-if="!message.isStreaming" size="small" trigger="click">
          <el-button link type="info" class="message-action">
            <el-icon><MoreFilled /></el-icon>
          </el-button>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item @click="copyContent">
                <el-icon><DocumentCopy /></el-icon> 复制
              </el-dropdown-item>
              <el-dropdown-item @click="$emit('delete')" type="danger">
                <el-icon><Delete /></el-icon> 删除
              </el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
      </div>
      
      <div :class="['message-content', { streaming: message.isStreaming }]">
        <!-- AI 消息使用 Markdown 渲染 -->
        <MarkdownRenderer v-if="message.role === 'assistant'" :content="message.content" />
        
        <!-- 用户消息纯文本 -->
        <template v-else>
          {{ message.content }}
        </template>
        
        <!-- 流式输出光标 -->
        <span v-if="message.isStreaming" class="streaming-cursor"></span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  ChatLineRound, 
  UserFilled, 
  MoreFilled, 
  DocumentCopy, 
  Delete 
} from '@element-plus/icons-vue'
import MarkdownRenderer from './MarkdownRenderer.vue'

const props = defineProps({
  message: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['delete'])

// 角色样式类
const roleClass = computed(() => ({
  'ai-message': props.message.role === 'assistant',
  'user-message': props.message.role === 'user'
}))

// 角色显示文本
const roleText = computed(() => {
  return props.message.role === 'assistant' ? 'AI 助手' : '我'
})

// 格式化时间
const formattedTime = computed(() => {
  const date = new Date(props.message.timestamp)
  const now = new Date()
  const isToday = date.toDateString() === now.toDateString()
  
  if (isToday) {
    return date.toLocaleTimeString('zh-CN', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }
  
  return date.toLocaleString('zh-CN', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
})

// 复制内容
const copyContent = async () => {
  try {
    await navigator.clipboard.writeText(props.message.content)
    ElMessage.success('已复制到剪贴板')
  } catch (err) {
    ElMessage.error('复制失败')
  }
}
</script>

<style scoped>
.message-item {
  display: flex;
  gap: 12px;
  padding: 12px 0;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.ai-message {
  flex-direction: row;
}

.user-message {
  flex-direction: row-reverse;
}

.message-avatar .el-avatar {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.message-avatar .el-avatar.user {
  background: linear-gradient(135deg, #0284c7 0%, #0ea5e9 100%);
}

.message-body {
  max-width: 70%;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.user-message .message-body {
  align-items: flex-end;
}

.message-header {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 12px;
  color: #909399;
}

.user-message .message-header {
  flex-direction: row-reverse;
}

.message-role {
  font-weight: 500;
}

.message-time {
  opacity: 0.8;
}

.message-action {
  opacity: 0;
  transition: opacity 0.2s;
}

.message-item:hover .message-action {
  opacity: 1;
}

.message-content {
  padding: 14px 18px;
  border-radius: 18px;
  font-size: 15px;
  line-height: 1.6;
  word-wrap: break-word;
  position: relative;
}

.ai-message .message-content {
  background-color: #fff;
  border: 1px solid #e8e8e8;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
  border-top-left-radius: 4px;
}

.user-message .message-content {
  background-color: #0284c7;
  color: white;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
  border-top-right-radius: 4px;
}

.message-content.streaming {
  min-width: 200px;
}

/* 流式输出光标 */
.streaming-cursor {
  display: inline-block;
  width: 2px;
  height: 1.2em;
  background-color: #0284c7;
  margin-left: 4px;
  vertical-align: middle;
  animation: cursor-blink 1s infinite;
  border-radius: 1px;
}

.user-message .streaming-cursor {
  background-color: rgba(255, 255, 255, 0.8);
}

@keyframes cursor-blink {
  0%, 45% {
    opacity: 1;
  }
  50%, 95% {
    opacity: 0;
  }
  100% {
    opacity: 1;
  }
}
</style>
