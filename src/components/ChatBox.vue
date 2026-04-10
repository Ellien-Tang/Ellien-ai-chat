<template>
  <div class="chat-box">
    <div class="input-wrapper">
      <!-- 语音输入按钮 -->
      <slot name="prepend">
        <VoiceRecorder
          v-if="showVoice"
          @result="handleVoiceResult"
          @error="handleVoiceError"
        />
      </slot>
      
      <!-- 文本输入框 -->
      <el-input
        ref="inputRef"
        v-model="localValue"
        type="textarea"
        :rows="rows"
        :placeholder="placeholder"
        :disabled="disabled || loading"
        :maxlength="maxlength"
        :show-word-limit="showWordLimit"
        resize="none"
        @input="handleInput"
        @keydown="handleKeydown"
        @focus="$emit('focus', $event)"
        @blur="$emit('blur', $event)"
      />
      
      <!-- 操作按钮 -->
      <div class="actions">
        <slot name="actions" :loading="loading" :disabled="isDisabled">
          <el-button
            v-if="showSend"
            type="primary"
            :disabled="isDisabled"
            :loading="loading"
            :icon="loading ? Loading : Promotion"
            @click="handleSend"
          >
            {{ loading ? loadingText : sendText }}
          </el-button>
        </slot>
      </div>
    </div>
    
    <!-- 底部提示 -->
    <div v-if="showTips" class="input-tips">
      <slot name="tips">
        <span>{{ tipsText }}</span>
      </slot>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue'
import { Promotion, Loading } from '@element-plus/icons-vue'
import VoiceRecorder from './VoiceRecorder.vue'
import { debounce } from '../composables/useDebounce'

const props = defineProps({
  // 输入值
  modelValue: {
    type: String,
    default: ''
  },
  // 是否显示语音输入
  showVoice: {
    type: Boolean,
    default: true
  },
  // 是否显示发送按钮
  showSend: {
    type: Boolean,
    default: true
  },
  // 输入行数
  rows: {
    type: Number,
    default: 3
  },
  // 占位符文本
  placeholder: {
    type: String,
    default: '请输入消息...'
  },
  // 是否禁用
  disabled: {
    type: Boolean,
    default: false
  },
  // 加载状态
  loading: {
    type: Boolean,
    default: false
  },
  // 发送按钮文字
  sendText: {
    type: String,
    default: '发送'
  },
  // 加载状态文字
  loadingText: {
    type: String,
    default: '发送中...'
  },
  // 最大长度
  maxlength: {
    type: Number,
    default: undefined
  },
  // 是否显示字数统计
  showWordLimit: {
    type: Boolean,
    default: false
  },
  // 是否显示提示
  showTips: {
    type: Boolean,
    default: true
  },
  // 提示文字
  tipsText: {
    type: String,
    default: 'Enter 发送 · Shift+Enter 换行'
  },
  // 防抖延迟
  debounceDelay: {
    type: Number,
    default: 300
  },
  // 是否启用防抖
  enableDebounce: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits([
  'update:modelValue',
  'send',
  'input',
  'focus',
  'blur',
  'keydown',
  'voiceResult',
  'voiceError'
])

const inputRef = ref(null)
const localValue = ref(props.modelValue)

// 是否禁用发送
const isDisabled = computed(() => {
  return props.disabled || props.loading || !localValue.value.trim()
})

// 同步外部值
watch(() => props.modelValue, (val) => {
  localValue.value = val
})

// 同步内部值
watch(localValue, (val) => {
  emit('update:modelValue', val)
})

// 防抖输入处理
const debouncedInput = debounce((val) => {
  emit('input', val)
}, props.debounceDelay)

const handleInput = (val) => {
  if (props.enableDebounce) {
    debouncedInput(val)
  } else {
    emit('input', val)
  }
}

// 键盘事件处理
const handleKeydown = (e) => {
  // Enter 发送（不包含 Shift+Enter）
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault()
    handleSend()
  }
  
  emit('keydown', e)
}

// 发送消息
const handleSend = () => {
  if (isDisabled.value) return
  
  const content = localValue.value.trim()
  if (!content) return
  
  emit('send', content)
}

// 语音输入结果
const handleVoiceResult = (text) => {
  localValue.value = text
  emit('voiceResult', text)
  
  // 自动发送（可选）
  // setTimeout(() => handleSend(), 100)
}

// 语音输入错误
const handleVoiceError = (error) => {
  emit('voiceError', error)
}

// 聚焦输入框
const focus = () => {
  inputRef.value?.focus()
}

// 清空输入框
const clear = () => {
  localValue.value = ''
}

// 暴露方法
defineExpose({
  focus,
  clear,
  inputRef
})
</script>

<style scoped>
.chat-box {
  width: 100%;
}

.input-wrapper {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

:deep(.voice-recorder) {
  flex-shrink: 0;
}

:deep(.voice-recorder .el-button) {
  width: 40px;
  height: 40px;
}

.input-wrapper .el-textarea {
  flex: 1;
}

:deep(.input-wrapper .el-textarea__inner) {
  border-radius: 12px;
  border-color: #dcdfe6;
  resize: none;
  font-size: 15px;
  padding: 12px 16px;
  transition: all 0.2s;
}

:deep(.input-wrapper .el-textarea__inner:focus) {
  border-color: #409eff;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.1);
}

.actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.input-tips {
  margin-top: 8px;
  text-align: center;
  font-size: 12px;
  color: #909399;
}
</style>
