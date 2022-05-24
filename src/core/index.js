import Vue from './instance/index'
import { initGlobalAPI } from './global-api/index'
import { isServerRendering } from 'core/util/env'
import { FunctionalRenderContext } from 'core/vdom/create-functional-component'

initGlobalAPI(Vue)

// Object.defineProperty get 当访问该属性时，会调用此函数。
// get 该函数的返回值会被用作属性的值。
Object.defineProperty(Vue.prototype, '$isServer', {
  get: isServerRendering // isServerRendering 方法返回是否为服务器环境
})

// 为Vue原型定义ssrContext属性
Object.defineProperty(Vue.prototype, '$ssrContext', {
  get () {
    /* istanbul ignore next */
    return this.$vnode && this.$vnode.ssrContext
  }
})

// 暴露 FunctionalRenderContext 给 ssr runtime helper 安装使用
Object.defineProperty(Vue, 'FunctionalRenderContext', {
  value: FunctionalRenderContext
})

// 控制台直接输出 Vue.version 可以看到当前 Vue 版本
Vue.version = '__VERSION__'

export default Vue