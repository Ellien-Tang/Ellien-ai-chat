// 导入路由模块
import { createRouter, createWebHistory } from 'vue-router'
import { ElLoading } from 'element-plus'

// 异步加载页面组件，实现懒加载 - 使用推荐的 () => import() 语法
const AIView = () => import('../views/AIView.vue')

// 定义路由配置
const routes = [
  {
    path: '/',
    redirect: '/ai'
  },
  {
    path: '/ai',
    name: 'ai',
    component: AIView,
    meta: {
      title: 'AI对话',
      keepAlive: true
    }
  }
]

// 创建路由实例
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    } else {
      return { top: 0 }
    }
  }
})

// 路由守卫
let loadingInstance = null

router.beforeEach((to, from) => {
  // 显示加载状态
  loadingInstance = ElLoading.service({
    lock: false,
    text: '加载中...',
    background: 'rgba(255, 255, 255, 0.7)'
  })
  
  // 设置页面标题
  if (to.meta.title) {
    document.title = `${to.meta.title} - Ellien AI Chat`
  }
})

router.afterEach(() => {
  // 关闭加载状态
  setTimeout(() => {
    loadingInstance?.close()
  }, 200)
})

router.onError((error) => {
  loadingInstance?.close()
  console.error('路由错误:', error)
})

export default router
