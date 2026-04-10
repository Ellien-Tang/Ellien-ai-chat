<template>
  <div class="session-sidebar">
    <div class="sidebar-header">
      <el-button type="primary" :icon="Plus" @click="createNewSession" class="new-chat-btn">
        新建对话
      </el-button>
    </div>
    
    <div class="sidebar-content">
      <el-scrollbar>
        <div class="session-list">
          <div
            v-for="session in sortedSessions"
            :key="session.id"
            :class="['session-item', { active: currentSessionId === session.id }]"
            @click="switchSession(session.id)"
          >
            <div class="session-info">
              <el-icon class="session-icon"><ChatRound /></el-icon>
              <div class="session-details">
                <div class="session-title">{{ session.title }}</div>
                <div class="session-time">{{ formatTime(session.updatedAt) }}</div>
              </div>
            </div>
            
            <el-dropdown 
              trigger="click" 
              @command="(cmd) => handleCommand(cmd, session.id)"
              @click.stop
            >
              <el-button link type="info" class="session-menu-btn">
                <el-icon><MoreFilled /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="rename">
                    <el-icon><EditPen /></el-icon> 重命名
                  </el-dropdown-item>
                  <el-dropdown-item command="clear">
                    <el-icon><RefreshLeft /></el-icon> 清空消息
                  </el-dropdown-item>
                  <el-dropdown-item command="delete" divided type="danger">
                    <el-icon><Delete /></el-icon> 删除
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>
        
        <!-- 空状态 -->
        <el-empty v-if="sortedSessions.length === 0" description="暂无对话" />
      </el-scrollbar>
    </div>
    
    <div class="sidebar-footer">
      <el-dropdown trigger="click" @command="handleFooterCommand">
        <el-button link type="info" class="footer-btn">
          <el-icon><Setting /></el-icon>
          <span>设置</span>
          <el-icon class="arrow-icon"><ArrowDown /></el-icon>
        </el-button>
        <template #dropdown>
          <el-dropdown-menu>
            <el-dropdown-item command="export">
              <el-icon><Download /></el-icon> 导出对话
            </el-dropdown-item>
            <el-dropdown-item command="import">
              <el-icon><Upload /></el-icon> 导入对话
            </el-dropdown-item>
            <el-dropdown-item command="clearAll" divided type="danger">
              <el-icon><DeleteFilled /></el-icon> 清空所有
            </el-dropdown-item>
          </el-dropdown-menu>
        </template>
      </el-dropdown>
    </div>
    
    <!-- 重命名对话框 -->
    <el-dialog
      v-model="renameDialogVisible"
      title="重命名对话"
      width="300px"
      :close-on-click-modal="false"
    >
      <el-input
        v-model="newTitle"
        placeholder="请输入对话名称"
        @keyup.enter="confirmRename"
        ref="renameInput"
      />
      <template #footer>
        <el-button @click="renameDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmRename">确定</el-button>
      </template>
    </el-dialog>
    
    <!-- 导入文件输入 -->
    <input
      ref="fileInput"
      type="file"
      accept=".json"
      style="display: none"
      @change="handleFileImport"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  Plus,
  ChatRound,
  MoreFilled,
  EditPen,
  Delete,
  RefreshLeft,
  Setting,
  ArrowDown,
  Download,
  Upload,
  DeleteFilled
} from '@element-plus/icons-vue'
import { useChatStore } from '../stores/chat'

const chatStore = useChatStore()

const sortedSessions = computed(() => chatStore.sortedSessions)
const currentSessionId = computed(() => chatStore.currentSessionId)

// 重命名相关
const renameDialogVisible = ref(false)
const newTitle = ref('')
const renameSessionId = ref(null)
const renameInput = ref(null)
const fileInput = ref(null)

// 创建新会话
const createNewSession = () => {
  chatStore.createSession()
  ElMessage.success('新建对话成功')
}

// 切换会话
const switchSession = (sessionId) => {
  chatStore.switchSession(sessionId)
}

// 格式化时间
const formatTime = (isoString) => {
  const date = new Date(isoString)
  const now = new Date()
  const diff = now - date
  
  // 小于1小时
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000)
    return minutes < 1 ? '刚刚' : `${minutes}分钟前`
  }
  
  // 小于24小时
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000)
    return `${hours}小时前`
  }
  
  // 大于24小时
  return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
}

// 处理会话菜单命令
const handleCommand = (command, sessionId) => {
  switch (command) {
    case 'rename':
      renameSessionId.value = sessionId
      const session = chatStore.sessions.find(s => s.id === sessionId)
      newTitle.value = session?.title || ''
      renameDialogVisible.value = true
      break
    case 'clear':
      ElMessageBox.confirm('确定要清空该对话的所有消息吗？', '提示', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        chatStore.switchSession(sessionId)
        chatStore.clearCurrentSession()
        ElMessage.success('已清空消息')
      }).catch(() => {})
      break
    case 'delete':
      ElMessageBox.confirm('确定要删除该对话吗？此操作不可恢复', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        chatStore.deleteSession(sessionId)
        ElMessage.success('删除成功')
      }).catch(() => {})
      break
  }
}

// 确认重命名
const confirmRename = () => {
  if (!newTitle.value.trim()) {
    ElMessage.warning('请输入对话名称')
    return
  }
  
  const session = chatStore.sessions.find(s => s.id === renameSessionId.value)
  if (session) {
    session.title = newTitle.value.trim()
    chatStore.saveToStorage()
    ElMessage.success('重命名成功')
  }
  
  renameDialogVisible.value = false
}

// 处理底部菜单命令
const handleFooterCommand = (command) => {
  switch (command) {
    case 'export':
      exportSessions()
      break
    case 'import':
      fileInput.value?.click()
      break
    case 'clearAll':
      ElMessageBox.confirm('确定要清空所有对话吗？此操作不可恢复', '警告', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'danger'
      }).then(() => {
        chatStore.clearAllSessions()
        ElMessage.success('已清空所有对话')
      }).catch(() => {})
      break
  }
}

// 导出对话
const exportSessions = () => {
  const data = chatStore.exportData()
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `chat-backup-${new Date().toISOString().split('T')[0]}.json`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
  ElMessage.success('导出成功')
}

// 处理文件导入
const handleFileImport = (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const success = chatStore.importData(e.target.result)
      if (success) {
        ElMessage.success('导入成功')
      } else {
        ElMessage.error('导入失败，文件格式错误')
      }
    } catch (err) {
      ElMessage.error('导入失败：' + err.message)
    }
  }
  reader.readAsText(file)
  event.target.value = '' // 重置输入
}
</script>

<style scoped>
.session-sidebar {
  width: 260px;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #f5f7fa;
  border-right: 1px solid #e4e7ed;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
}

.new-chat-btn {
  width: 100%;
}

.sidebar-content {
  flex: 1;
  overflow: hidden;
}

.session-list {
  padding: 8px;
}

.session-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  margin-bottom: 4px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.session-item:hover {
  background-color: #e4e7ed;
}

.session-item.active {
  background-color: #ecf5ff;
  border-left: 3px solid #409eff;
}

.session-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex: 1;
  min-width: 0;
}

.session-icon {
  font-size: 20px;
  color: #909399;
  flex-shrink: 0;
}

.session-item.active .session-icon {
  color: #409eff;
}

.session-details {
  flex: 1;
  min-width: 0;
}

.session-title {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.session-time {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.session-menu-btn {
  opacity: 0;
  transition: opacity 0.2s;
}

.session-item:hover .session-menu-btn {
  opacity: 1;
}

.sidebar-footer {
  padding: 12px 16px;
  border-top: 1px solid #e4e7ed;
}

.footer-btn {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: 8px;
}

.footer-btn span {
  flex: 1;
  text-align: left;
}

.arrow-icon {
  font-size: 12px;
}
</style>
