import { ref, watch } from 'vue'

/**
 * 防抖 Hook
 * @param {*} value 需要防抖的值
 * @param {number} delay 延迟时间（毫秒）
 * @returns {ref} 防抖后的值
 */
export function useDebounce(value, delay = 300) {
  const debouncedValue = ref(value.value)
  let timeout = null
  
  watch(value, (newVal) => {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      debouncedValue.value = newVal
    }, delay)
  }, { immediate: true })
  
  return debouncedValue
}

/**
 * 防抖函数包装器
 * @param {Function} fn 需要防抖的函数
 * @param {number} delay 延迟时间（毫秒）
 * @returns {Function} 防抖后的函数
 */
export function debounce(fn, delay = 300) {
  let timeout = null
  
  return function (...args) {
    clearTimeout(timeout)
    timeout = setTimeout(() => {
      fn.apply(this, args)
    }, delay)
  }
}

/**
 * 输入防抖 Hook（专门用于输入框）
 * @param {number} delay 延迟时间
 * @returns {object} { inputValue, debouncedValue, isTyping }
 */
export function useInputDebounce(delay = 500) {
  const inputValue = ref('')
  const debouncedValue = ref('')
  const isTyping = ref(false)
  let timeout = null
  let typingTimeout = null
  
  const updateValue = (val) => {
    inputValue.value = val
    isTyping.value = true
    
    // 清除之前的定时器
    clearTimeout(timeout)
    clearTimeout(typingTimeout)
    
    // 设置 typing 状态在 100ms 后重置
    typingTimeout = setTimeout(() => {
      isTyping.value = false
    }, 100)
    
    // 防抖更新值
    timeout = setTimeout(() => {
      debouncedValue.value = val
    }, delay)
  }
  
  const clear = () => {
    clearTimeout(timeout)
    clearTimeout(typingTimeout)
    inputValue.value = ''
    debouncedValue.value = ''
    isTyping.value = false
  }
  
  return {
    inputValue,
    debouncedValue,
    isTyping,
    updateValue,
    clear
  }
}

export default {
  useDebounce,
  debounce,
  useInputDebounce
}
