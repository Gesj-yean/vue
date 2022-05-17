/* @flow */

import {
  warn,
  nextTick,
  emptyObject,
  handleError,
  defineReactive
} from '../util/index'

import { createElement } from '../vdom/create-element'
import { installRenderHelpers } from './render-helpers/index'
import { resolveSlots } from './render-helpers/resolve-slots'
import { normalizeScopedSlots } from '../vdom/helpers/normalize-scoped-slots'
import VNode, { createEmptyVNode } from '../vdom/vnode'

import { isUpdatingChildComponent } from './lifecycle'

export function initRender (vm: Component) {
  vm._vnode = null // the root of the child tree
  vm._staticTrees = null // v-once cached trees
  const options = vm.$options
  const parentVnode = vm.$vnode = options._parentVnode // the placeholder node in parent tree
  const renderContext = parentVnode && parentVnode.context
  vm.$slots = resolveSlots(options._renderChildren, renderContext)
  vm.$scopedSlots = emptyObject
  // bind the createElement fn to this instance
  // 在这个实例上绑定 createElement 方法
  // so that we get proper render context inside it.
  // 以便我们在其中获得适当的渲染上下文。
  // args order: tag, data, children, normalizationType, alwaysNormalize
  // 参数顺序
  // internal version is used by render functions compiled from templates
  // 内部版本被使用到了从模版编译的渲染函数中
  vm._c = (a, b, c, d) => createElement(vm, a, b, c, d, false)
  // normalization is always applied for the public version, used in
  // user-written render functions.
  // 规范化总是应用于发布版本，用于用户编写的渲染函数。
  vm.$createElement = (a, b, c, d) => createElement(vm, a, b, c, d, true)

  // $attrs & $listeners are exposed for easier HOC creation.
  // they need to be reactive so that HOCs using them are always updated
  // 公开了 $attrs 和 $listeners 以便于创建 HOC。
  // 它们需要具有响应性，以便始终更新使用它们的 HOC
  const parentData = parentVnode && parentVnode.data

  /* istanbul ignore else */
  if (process.env.NODE_ENV !== 'production') {
    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, () => {
      !isUpdatingChildComponent && warn(`$attrs is readonly.`, vm)
    }, true)
    defineReactive(vm, '$listeners', options._parentListeners || emptyObject, () => {
      !isUpdatingChildComponent && warn(`$listeners is readonly.`, vm)
    }, true)
  } else {
    defineReactive(vm, '$attrs', parentData && parentData.attrs || emptyObject, null, true)
    defineReactive(vm, '$listeners', options._parentListeners || emptyObject, null, true)
  }
}

export let currentRenderingInstance: Component | null = null

// for testing only
export function setCurrentRenderingInstance (vm: Component) {
  currentRenderingInstance = vm
}

export function renderMixin (Vue: Class<Component>) {
  // install runtime convenience helpers
  installRenderHelpers(Vue.prototype)

  Vue.prototype.$nextTick = function (fn: Function) {
    return nextTick(fn, this)
  }

  Vue.prototype._render = function (): VNode {
    const vm: Component = this
    const { render, _parentVnode } = vm.$options

    // vm.$scopedSlots 用来访问作用域插槽。
    if (_parentVnode) {
      vm.$scopedSlots = normalizeScopedSlots(
        _parentVnode.data.scopedSlots, // slots
        vm.$slots, // normalSlots
        vm.$scopedSlots // prevSlots
      )
    }

    // set parent vnode. this allows render functions to have access
    // to the data on the placeholder node.
    // 设置父节点 vnode。这允许渲染函数访问占位节点上的数据
    vm.$vnode = _parentVnode
    // render self
    // 渲染自身
    let vnode
    try {
      // There's no need to maintain a stack because all render fns are called
      // separately from one another. Nested component's render fns are called
      // when parent component is patched.
      // 不需要去维持栈，因为所有 fns 都会被依次调用。当父组件分发时，调用嵌套组件的渲染函数
      currentRenderingInstance = vm
      vnode = render.call(vm._renderProxy, vm.$createElement)
    } catch (e) {
      handleError(e, vm, `render`)
      // renderError 函数只在开发环境下工作。当 render 函数遭遇错误时，提供另外一种渲染输出。
      // 其错误将会作为第二个参数传递到 renderError。这个功能配合 hot-reload 非常实用。
      /* istanbul ignore else */
      if (process.env.NODE_ENV !== 'production' && vm.$options.renderError) {
        try {
          vnode = vm.$options.renderError.call(vm._renderProxy, vm.$createElement, e)
        } catch (e) {
          handleError(e, vm, `renderError`)
          vnode = vm._vnode
        }
      } else {
        vnode = vm._vnode
      }
    } finally {
      currentRenderingInstance = null
    }
    // if the returned array contains only a single node, allow it
    if (Array.isArray(vnode) && vnode.length === 1) {
      vnode = vnode[0]
    }
    // return empty vnode in case the render function errored out
    // render 函数报错的情况下，返回空 vnode
    if (!(vnode instanceof VNode)) {
      if (process.env.NODE_ENV !== 'production' && Array.isArray(vnode)) {
        warn(
          'Multiple root nodes returned from render function. Render function ' +
          'should return a single root node.',
          vm
        )
      }
      vnode = createEmptyVNode()
    }
    // set parent
    vnode.parent = _parentVnode
    return vnode
  }
}
