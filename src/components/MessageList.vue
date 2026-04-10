<template>
  <div class="message-list-container" ref="containerRef">
    <!-- 使用虚拟列表渲染大量消息 -->
    <RecycleScroller
      v-if="messages.length > 20"
      class="virtual-scroller"
      :items="messagesWithIndex"
      :item-size="80"
      key-field="key"
      v-slot="{ item }"
    >
      <MessageItem
        :message="item.message"
        :is-streaming="item.message.isStreaming"
        @delete="$emit('deleteMessage', item.message.id)"
      />
    </RecycleScroller>
    
    <!-- 消息较少时直接使用普通渲染 -->
    <div v-else class="normal-list">
      <MessageItem
        v-for="message in messages"
        :key="message.id"
        :message="message"
        :is-streaming="message.isStreaming"
        @delete="$emit('deleteMessage', message.id)"
      />
    </div>
    
    <!-- 正在输入指示器 -->
    <div v-if="isGenerating" class="generating-indicator">
      <div class="typing-indicator">
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      </div>
      <span class="typing-text">正在思考...</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch, nextTick } from 'vue'
import { RecycleScroller } from 'vue-virtual-scroller'
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'
import MessageItem from './MessageItem.vue'

const props = defineProps({
  messages: {
    type: Array,
    default: () => []
  },
  isGenerating: {
    type: Boolean,
    default: false
  },
  autoScroll: {
    type: Boolean,
    default: true
  }
})

const emit = defineEmits(['deleteMessage', 'scrollToBottom'])

const containerRef = ref(null)

// 为消息添加索引用于虚拟列表
const messagesWithIndex = computed(() => {
  return props.messages.map((msg, index) => ({
    key: `${msg.id}-${index}`,
    message: msg,
    index
  }))
})

// 监听消息变化，自动滚动到底部
watch(
  () => props.messages.length,
  () => {
    if (props.autoScroll) {
      scrollToBottom()
    }
  },
  { flush: 'post' }
)

// 监听流式输出，保持滚动
watch(
  () => props.messages[props.messages.length - 1]?.content,
  () => {
    if (props.autoScroll && props.messages[props.messages.length - 1]?.isStreaming) {
      scrollToBottom()
    }
  }
)

// 滚动到底部
const scrollToBottom = () => {
  nextTick(() => {
    const container = containerRef.value
    if (container) {
      container.scrollTop = container.scrollHeight
      emit('scrollToBottom')
    }
  })
}

// 暴露方法
defineExpose({
  scrollToBottom
})
</script>

<style scoped>
.message-list-container {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
  background-color: #fafafa;
}

.virtual-scroller {
  height: 100%;
}

.normal-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.generating-indicator {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  padding: 14px 18px;
  background-color: #fff;
  border: 1px solid #e8e8e8;
  border-radius: 18px;
  width: fit-content;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.typing-indicator {
  display: flex;
  gap: 4px;
}

.typing-dot {
  width: 8px;
  height: 8px;
  background-color: #0284c7;
  border-radius: 50%;
  animation: typing 1.4s infinite ease-in-out;
}

.typing-dot:nth-child(2) {
  animation-delay: 0.2s;
}

.typing-dot:nth-child(3) {
  animation-delay: 0.4s;
}

.typing-text {
  color: #666;
  font-size: 14px;
  font-style: italic;
}

@keyframes typing {
  0%, 60%, 100% {
    transform: translateY(0);
    opacity: 0.5;
  }
  30% {
    transform: translateY(-10px);
    opacity: 1;
  }
}
</style>
