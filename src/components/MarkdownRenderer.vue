<template>
  <div class="markdown-body" v-html="renderedContent"></div>
</template>

<script setup>
import { computed } from 'vue'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import 'highlight.js/styles/github.css'  // 使用亮色主题匹配你的UI

const props = defineProps({
  content: {
    type: String,
    default: ''
  }
})

const md = new MarkdownIt({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str, lang) => {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return `<pre class="hljs"><code>${
          hljs.highlight(str, { language: lang, ignoreIllegals: true }).value
        }</code></pre>`
      } catch (__) {}
    }
    return `<pre class="hljs"><code>${md.utils.escapeHtml(str)}</code></pre>`
  }
})

const renderedContent = computed(() => {
  return md.render(props.content || '')
})
</script>

<style scoped>
.markdown-body {
  line-height: 1.6;
  color: #333;
}

.markdown-body :deep(h1, h2, h3, h4) {
  margin-top: 16px;
  margin-bottom: 12px;
  font-weight: 600;
  color: #1a1a1a;
}

.markdown-body :deep(p) {
  margin: 8px 0;
}

.markdown-body :deep(code) {
  background: rgba(175, 184, 193, 0.2);
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Monaco', 'Menlo', 'Consolas', monospace;
  font-size: 0.9em;
  color: #24292f;
}

.markdown-body :deep(pre) {
  background: #f6f8fa;
  padding: 16px;
  border-radius: 8px;
  overflow-x: auto;
  margin: 12px 0;
  border: 1px solid #d0d7de;
}

.markdown-body :deep(pre code) {
  background: transparent;
  padding: 0;
  color: #24292f;
}

.markdown-body :deep(ul), .markdown-body :deep(ol) {
  padding-left: 24px;
  margin: 8px 0;
}

.markdown-body :deep(li) {
  margin: 4px 0;
}

.markdown-body :deep(blockquote) {
  border-left: 4px solid #0284c7;
  padding-left: 16px;
  margin: 12px 0;
  color: #57606a;
  background: #f6f8fa;
  padding: 8px 16px;
  border-radius: 0 8px 8px 0;
}

.markdown-body :deep(table) {
  border-collapse: collapse;
  margin: 12px 0;
  width: 100%;
  font-size: 14px;
}

.markdown-body :deep(th, td) {
  border: 1px solid #d0d7de;
  padding: 8px 12px;
  text-align: left;
}

.markdown-body :deep(th) {
  background: #f6f8fa;
  font-weight: 600;
}

.markdown-body :deep(tr:nth-child(2n)) {
  background: #f6f8fa;
}

.markdown-body :deep(a) {
  color: #0284c7;
  text-decoration: none;
}

.markdown-body :deep(a:hover) {
  text-decoration: underline;
}

.markdown-body :deep(hr) {
  border: none;
  border-top: 1px solid #d0d7de;
  margin: 16px 0;
}

.markdown-body :deep(img) {
  max-width: 100%;
  border-radius: 8px;
  margin: 8px 0;
}
</style>
