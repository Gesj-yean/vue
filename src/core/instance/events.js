/* @flow */

import {
  tip,
  toArray,
  hyphenate,
  formatComponentName,
  invokeWithErrorHandling
} from '../util/index'
import { updateListeners } from '../vdom/helpers/index'

export function initEvents (vm: Component) {
  vm._events = Object.create(null)
  vm._hasHookEvent = false
  // init parent attached events
  const listeners = vm.$options._parentListeners
  if (listeners) {
    updateComponentListeners(vm, listeners)
  }
}

let target: any

function add (event, fn) {
  target.$on(event, fn)
}

function remove (event, fn) {
  target.$off(event, fn)
}

function createOnceHandler (event, fn) {
  const _target = target
  return function onceHandler () {
    const res = fn.apply(null, arguments)
    if (res !== null) {
      _target.$off(event, onceHandler)
    }
  }
}

export function updateComponentListeners (
  vm: Component,
  listeners: Object,
  oldListeners: ?Object
) {
  target = vm
  updateListeners(listeners, oldListeners || {}, add, remove, createOnceHandler, vm)
  target = undefined
}

export function eventsMixin (Vue: Class<Component>) {
  const hookRE = /^hook:/
  // 监听当前实例上的自定义事件。事件可以由 vm.$emit 触发。回调函数会接收所有传入事件触发函数的额外参数。
  // vm.$on 接受两个参数，event 以及它的回调函数 fn
  Vue.prototype.$on = function (event: string | Array<string>, fn: Function): Component {
    const vm: Component = this
    // 当 event 是数组时，遍历每一项执行 else 中的逻辑
    // 当 event 是 Key 时，则放入 _events[event] 中，等待 $emit 的触发
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$on(event[i], fn)
      }
    } else {
      (vm._events[event] || (vm._events[event] = [])).push(fn)
      // optimize hook:event cost by using a boolean flag marked at registration
      // instead of a hash lookup
      // 优化钩子:在注册时使用 _hasHookEvent 布尔标记而不是哈希查找来优化事件开销,
      // _hasHookEvent = true 是生命周期回调钩子 callHook 函数触发 $emit('hook:' + hook) 的必要条件
      if (hookRE.test(event)) {
        vm._hasHookEvent = true
      }
    }
    return vm
  }
  // 监听一个自定义事件，但是只触发一次。一旦触发之后，监听器就会被移除。
  // vm.$once 接受两个参数，event 以及它的回调函数 fn
  Vue.prototype.$once = function (event: string, fn: Function): Component {
    const vm: Component = this
    function on () {
      vm.$off(event, on) // 移除监听
      fn.apply(vm, arguments) // 将参数传给回调函数
    }
    on.fn = fn
    vm.$on(event, on) // 在 $on 的回调函数执行中移除监听，达到执行一次的效果
    return vm
  }

  // 移除自定义事件监听器。
  // 如果没有提供参数，则移除所有的事件监听器；
  // 如果只提供了事件，则移除该事件所有的监听器；
  // 如果同时提供了事件与回调，则只移除这个回调的监听器。
  Vue.prototype.$off = function (event?: string | Array<string>, fn?: Function): Component {
    const vm: Component = this
    // 如果没有提供参数，则移除所有的事件监听器；
    if (!arguments.length) {
      vm._events = Object.create(null)
      return vm
    }
    // events 是数组时，遍历每一项并执行后面的逻辑
    if (Array.isArray(event)) {
      for (let i = 0, l = event.length; i < l; i++) {
        vm.$off(event[i], fn)
      }
      return vm
    }

    const cbs = vm._events[event]
    // 该事件的回调列表为空，$off 不做任何处理
    if (!cbs) {
      return vm
    }
    // 如果没有传回调函数，只提供了事件，则移除该事件所有的监听器（回调函数）；
    if (!fn) {
      vm._events[event] = null
      return vm
    }
    // 如果传了回调函数，就在该事件的回调函数列表中用 splice 方法移除这个回调的监听器。
    let cb
    let i = cbs.length
    while (i--) {
      cb = cbs[i]
      if (cb === fn || cb.fn === fn) {
        cbs.splice(i, 1)
        break
      }
    }
    return vm
  }
  // 触发当前实例上的事件。附加参数都会传给监听器回调。
  Vue.prototype.$emit = function (event: string): Component {
    const vm: Component = this
    if (process.env.NODE_ENV !== 'production') {
      const lowerCaseEvent = event.toLowerCase()
      // 传入的 event 含有大写字母并且 vm._events 已经注册了小写 event 时，提示：
      // HTML 不区分大小写，你不能在 template 中使用 v-on 监听驼峰形式的事件 Key，你应该使用中划线替代驼峰
      if (lowerCaseEvent !== event && vm._events[lowerCaseEvent]) {
        tip(
          `Event "${lowerCaseEvent}" is emitted in component ` +
          `${formatComponentName(vm)} but the handler is registered for "${event}". ` +
          `Note that HTML attributes are case-insensitive and you cannot use ` +
          `v-on to listen to camelCase events when using in-DOM templates. ` +
          `You should probably use "${hyphenate(event)}" instead of "${event}".`
        )
      }
    }
    let cbs = vm._events[event]
    if (cbs) {
      cbs = cbs.length > 1 ? toArray(cbs) : cbs
      // 将类数组的对象转化为真数组，执行当前实例上事件的所有回调函数
      const args = toArray(arguments, 1)
      const info = `event handler for "${event}"`
      for (let i = 0, l = cbs.length; i < l; i++) {
        invokeWithErrorHandling(cbs[i], vm, args, vm, info)
      }
    }
    return vm
  }
}
