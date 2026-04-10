<script setup>
// App.vue 作为应用的根布局组件
// 主要布局已移至 AIView，这里保持简洁
</script>

<template>
  <div class="app-container">
    <router-view />
  </div>
</template>

<style>
/* 全局样式重置 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

html, body {
  height: 100%;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 
    'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#app {
  height: 100%;
}

.app-container {
  height: 100%;
}

/* Suspense 加载状态 */
.suspense-loading {
  height: 100vh;
  padding: 40px;
  background: #f5f7fa;
}

/* 滚动条样式优化 */
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 3px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* Markdown 代码块样式优化 */
.hljs {
  background: #f6f8fa !important;
  border-radius: 8px;
  padding: 16px;
  overflow-x: auto;
}

/* 虚拟滚动条样式 */
.vue-recycle-scroller {
  position: relative;
}

.vue-recycle-scroller__item-wrapper {
  flex: 1;
  box-sizing: border-box;
  overflow-x: hidden;
  overflow-y: auto;
}

.vue-recycle-scroller__item-view {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

/* 选中文字样式 */
::selection {
  background: rgba(64, 158, 255, 0.2);
}
</style>
