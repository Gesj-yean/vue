/* @flow */

import { toNumber, toString, looseEqual, looseIndexOf } from 'shared/util'
import { createTextVNode, createEmptyVNode } from 'core/vdom/vnode'
import { renderList } from './render-list'
import { renderSlot } from './render-slot'
import { resolveFilter } from './resolve-filter'
import { checkKeyCodes } from './check-keycodes'
import { bindObjectProps } from './bind-object-props'
import { renderStatic, markOnce } from './render-static'
import { bindObjectListeners } from './bind-object-listeners'
import { resolveScopedSlots } from './resolve-scoped-slots'
import { bindDynamicKeys, prependModifier } from './bind-dynamic-keys'

export function installRenderHelpers (target: any) {
  target._o = markOnce // 使用唯一 key 将节点标记为静态
  target._n = toNumber // 字符串转成数字，失败的话返回原值
  target._s = toString // 将任何类型的值转成字符串
  target._l = renderList // 渲染 v-for 列表，返回一个 VNode 组成的数组
  target._t = renderSlot // 渲染 <slot>，返回一个 VNode 组成的数组
  target._q = looseEqual // 判断任意类型是否松散相等
  target._i = looseIndexOf // 获取数组中与参数相等的值的下标
  target._m = renderStatic // 优先获取缓存渲染树，其次返回一个新的渲染树
  target._f = resolveFilter // 处理过滤器，返回 this.$options['filters'][id]
  target._k = checkKeyCodes // 校验 eventKeyCode 方法
  target._b = bindObjectProps // 合并 v-bind="object" 到 VNode 的 data 中
  target._v = createTextVNode // 创建字符串节点
  target._e = createEmptyVNode // 创建空节点，可以传入 text
  target._u = resolveScopedSlots // 处理 scoped slots
  target._g = bindObjectListeners
  target._d = bindDynamicKeys // 绑定动态 key，<div :[key]="value">
  target._p = prependModifier //动态添加修饰器运行标记到事件名称上
}
