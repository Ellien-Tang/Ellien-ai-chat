<template>
  <div class="voice-recorder">
    <el-button
      :type="isRecording ? 'danger' : 'default'"
      :class="['voice-btn', { recording: isRecording }]"
      @click="toggleRecording"
      :disabled="!isSupported || isProcessing"
      circle
    >
      <el-icon :size="20">
        <Microphone v-if="!isRecording" />
        <CircleClose v-else />
      </el-icon>
    </el-button>
    
    <!-- 录音状态提示 -->
    <div v-if="isRecording || isProcessing" class="voice-status">
      <span class="status-text">{{ statusText }}</span>
      <div v-if="isRecording" class="recording-wave">
        <span v-for="i in 5" :key="i" class="wave-bar"></span>
      </div>
      <el-icon v-if="isProcessing" class="processing-icon"><Loading /></el-icon>
    </div>
    
    <!-- 语音转写结果预览 -->
    <div v-if="transcript && !isProcessing" class="transcript-preview">
      <span class="preview-label">识别结果：</span>
      <span class="preview-text">{{ transcript }}</span>
    </div>
    
    <!-- 错误提示 -->
    <el-alert
      v-if="errorMessage"
      :title="errorMessage"
      type="error"
      :closable="true"
      @close="errorMessage = ''"
      show-icon
    />
  </div>
</template>

<script setup>
import { ref, computed, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Microphone, CircleClose, Loading } from '@element-plus/icons-vue'

const props = defineProps({
  // 语音识别语言
  lang: {
    type: String,
    default: 'zh-CN'
  },
  // 是否连续识别
  continuous: {
    type: Boolean,
    default: false
  },
  // 是否显示中间结果
  interimResults: {
    type: Boolean,
    default: true
  },
  // 最大录音时长（秒）
  maxDuration: {
    type: Number,
    default: 60
  }
})

const emit = defineEmits(['result', 'error', 'start', 'end'])

// 语音识别相关状态
const isRecording = ref(false)
const isProcessing = ref(false)
const transcript = ref('')
const errorMessage = ref('')
const recordingTimer = ref(null)
const recordingDuration = ref(0)

// 检查浏览器是否支持 Web Speech API
const isSupported = computed(() => {
  return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window
})

// 状态文本
const statusText = computed(() => {
  if (isProcessing.value) return '正在识别...'
  if (isRecording.value) return `录音中 ${recordingDuration.value}s`
  return ''
})

// 语音识别实例
let recognition = null

// 初始化语音识别
const initRecognition = () => {
  if (!isSupported.value) {
    errorMessage.value = '您的浏览器不支持语音识别功能'
    return null
  }
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
  recognition = new SpeechRecognition()
  
  recognition.lang = props.lang
  recognition.continuous = props.continuous
  recognition.interimResults = props.interimResults
  
  // 开始识别
  recognition.onstart = () => {
    isRecording.value = true
    recordingDuration.value = 0
    recordingTimer.value = setInterval(() => {
      recordingDuration.value++
      if (recordingDuration.value >= props.maxDuration) {
        stopRecording()
        ElMessage.warning('已达到最大录音时长')
      }
    }, 1000)
    emit('start')
  }
  
  // 识别结果
  recognition.onresult = (event) => {
    let finalTranscript = ''
    let interimTranscript = ''
    
    for (let i = event.resultIndex; i < event.results.length; i++) {
      const result = event.results[i]
      if (result.isFinal) {
        finalTranscript += result[0].transcript
      } else {
        interimTranscript += result[0].transcript
      }
    }
    
    // 优先使用最终结果，否则使用临时结果
    transcript.value = finalTranscript || interimTranscript
  }
  
  // 识别错误
  recognition.onerror = (event) => {
    console.error('语音识别错误:', event.error)
    let errorMsg = '语音识别失败'
    
    switch (event.error) {
      case 'no-speech':
        errorMsg = '未检测到语音，请重试'
        break
      case 'audio-capture':
        errorMsg = '无法访问麦克风'
        break
      case 'not-allowed':
        errorMsg = '麦克风权限被拒绝'
        break
      case 'network':
        errorMsg = '网络错误，请检查连接'
        break
      case 'aborted':
        errorMsg = '识别已取消'
        break
      default:
        errorMsg = `识别错误: ${event.error}`
    }
    
    errorMessage.value = errorMsg
    emit('error', event.error)
    resetState()
  }
  
  // 识别结束
  recognition.onend = () => {
    if (isRecording.value) {
      // 如果是手动停止且有识别结果
      if (transcript.value.trim()) {
        isProcessing.value = true
        // 模拟处理延迟，给用户反馈
        setTimeout(() => {
          emit('result', transcript.value.trim())
          isProcessing.value = false
          transcript.value = ''
        }, 300)
      }
    }
    resetState()
    emit('end')
  }
  
  return recognition
}

// 切换录音状态
const toggleRecording = () => {
  if (isRecording.value) {
    stopRecording()
  } else {
    startRecording()
  }
}

// 开始录音
const startRecording = () => {
  errorMessage.value = ''
  transcript.value = ''
  
  if (!recognition) {
    recognition = initRecognition()
  }
  
  if (!recognition) return
  
  try {
    recognition.start()
  } catch (error) {
    console.error('启动识别失败:', error)
    errorMessage.value = '启动语音识别失败'
  }
}

// 停止录音
const stopRecording = () => {
  if (recognition && isRecording.value) {
    recognition.stop()
  }
}

// 重置状态
const resetState = () => {
  isRecording.value = false
  if (recordingTimer.value) {
    clearInterval(recordingTimer.value)
    recordingTimer.value = null
  }
}

// 组件卸载时清理
onUnmounted(() => {
  resetState()
  if (recognition) {
    recognition.abort()
    recognition = null
  }
})

// 暴露方法给父组件
defineExpose({
  startRecording,
  stopRecording,
  isSupported: isSupported.value
})
</script>

<style scoped>
.voice-recorder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.voice-btn {
  width: 48px;
  height: 48px;
  transition: all 0.3s ease;
}

.voice-btn:hover:not(:disabled) {
  transform: scale(1.05);
}

.voice-btn.recording {
  animation: pulse 1.5s infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(245, 108, 108, 0.7);
  }
  70% {
    box-shadow: 0 0 0 15px rgba(245, 108, 108, 0);
  }
  100% {
    box-shadow: 0 0 0 0 rgba(245, 108, 108, 0);
  }
}

.voice-status {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.status-text {
  font-size: 14px;
  color: #606266;
  font-weight: 500;
}

.recording-wave {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 24px;
}

.wave-bar {
  width: 4px;
  height: 100%;
  background: linear-gradient(to top, #409eff, #67c23a);
  border-radius: 2px;
  animation: wave 1s ease-in-out infinite;
}

.wave-bar:nth-child(1) { animation-delay: 0s; }
.wave-bar:nth-child(2) { animation-delay: 0.1s; }
.wave-bar:nth-child(3) { animation-delay: 0.2s; }
.wave-bar:nth-child(4) { animation-delay: 0.3s; }
.wave-bar:nth-child(5) { animation-delay: 0.4s; }

@keyframes wave {
  0%, 100% {
    height: 20%;
  }
  50% {
    height: 100%;
  }
}

.processing-icon {
  font-size: 24px;
  color: #409eff;
  animation: rotate 1s linear infinite;
}

@keyframes rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

.transcript-preview {
  max-width: 100%;
  padding: 8px 12px;
  background: #f5f7fa;
  border-radius: 8px;
  font-size: 13px;
}

.preview-label {
  color: #909399;
}

.preview-text {
  color: #303133;
  font-weight: 500;
}
</style>
