import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  build: {
    // 代码分割配置
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        // 手动分包策略
        manualChunks(id) {
          // 将 node_modules 中的依赖分包
          if (id.includes('node_modules')) {
            // Element Plus 单独打包
            if (id.includes('element-plus')) {
              return 'element-plus'
            }
            // 虚拟滚动器单独打包
            if (id.includes('vue-virtual-scroller')) {
              return 'virtual-scroller'
            }
            // Markdown 相关
            if (id.includes('markdown-it') || id.includes('highlight.js')) {
              return 'markdown'
            }
            // 其他依赖打包到 vendor
            return 'vendor'
          }
          
          // 按功能模块分包
          if (id.includes('/src/components/')) {
            return 'components'
          }
          if (id.includes('/src/views/')) {
            return 'views'
          }
        },
        // 入口文件配置
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name.split('.')
          const ext = info[info.length - 1]
          if (/\.(png|jpe?g|gif|svg|webp|ico)$/i.test(assetInfo.name)) {
            return 'assets/images/[name]-[hash][extname]'
          }
          if (/\.css$/i.test(assetInfo.name)) {
            return 'assets/css/[name]-[hash][extname]'
          }
          return 'assets/[name]-[hash][extname]'
        }
      }
    },
    // 压缩配置
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    }
  },
  // 开发服务器配置
  server: {
    port: 5173,
    host: true,
    proxy: {
      // 开发时代理 API 请求
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  // 优化依赖预构建
  optimizeDeps: {
    include: [
      'vue',
      'vue-router',
      'pinia',
      'element-plus',
      'vue-virtual-scroller',
      'markdown-it',
      'highlight.js'
    ]
  }
})
