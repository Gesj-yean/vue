/* @flow */

import config from '../config'
import { initUse } from './use'
import { initMixin } from './mixin'
import { initExtend } from './extend'
import { initAssetRegisters } from './assets'
import { set, del } from '../observer/index'
import { ASSET_TYPES } from 'shared/constants' // ASSET_TYPES = ['component','directive','filter']
import builtInComponents from '../components/index' // 暴露 KeepAlive
// import { observe } from 'core/observer/index'

import {
  warn,
  extend,
  nextTick,
  mergeOptions,
  defineReactive
} from '../util/index'

export function initGlobalAPI (Vue: GlobalAPI) {
  const configDef = {}
  configDef.get = () => config
  if (process.env.NODE_ENV !== 'production') {
    configDef.set = () => {
      warn(
        'Do not replace the Vue.config object, set individual fields instead.'
      )
    }
  }
  // 添加 Vue 配置到 Vue.config 中
  Object.defineProperty(Vue, 'config', configDef)

  // 暴露一些工具方法，Note: 这些不是公共API，不要依赖他们，使用它们是有风险的。
  Vue.util = {
    warn,
    extend,
    mergeOptions,
    defineReactive
  }

  // 向响应式对象中添加一个 property，并确保这个新 property 同样是响应式的，且触发视图更新。
  Vue.set = set
  // 删除对象的property。
  Vue.delete = del
  // 在下次 DOM 更新循环结束之后执行延迟回调。
  Vue.nextTick = nextTick

  // 2.6 explicit observable API
  // 让一个对象可响应。Vue 内部会用它来处理 data 函数返回的对象。
  // Vue.observable = <T>(obj: T): T => {
  //   observe(obj)
  //   return obj
  // }

  // 创建 Vue.options
  Vue.options = Object.create(null)
  // 因为 ASSET_TYPES = ['component','directive','filter']
  // 所以创建 Vue.options.components Vue.options.directives Vue.options.filters
  ASSET_TYPES.forEach(type => {
    Vue.options[type + 's'] = Object.create(null)
  })

  // 将 Vue 挂载到 Vue.options._base 上
  Vue.options._base = Vue

  // 给 Vue.options.components 添加 KeepAlive
  extend(Vue.options.components, builtInComponents)

  // 初始化 Vue.use
  initUse(Vue)
  // 初始化 Vue.mixin
  initMixin(Vue)
  // 初始化 Vue.extend
  initExtend(Vue)
  initAssetRegisters(Vue)
}
