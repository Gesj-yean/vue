/* @flow */

import { _Set as Set, isObject } from '../util/index'
import type { SimpleSet } from '../util/index'
import VNode from '../vdom/vnode'

const seenObjects = new Set()

/**
 * Recursively traverse an object to evoke all converted
 * getters, so that every nested property inside the object
 * is collected as a "deep" dependency.
 */
/**
 * 递归遍历（Recursively traverse）对象以调用所有已转换的getter，
 * 以便对象内的每个嵌套属性都作为“深层”依赖项收集。
 *
 * @param {any} val
 */
export function traverse (val: any) {
  _traverse(val, seenObjects)
  seenObjects.clear() // 清空对象为 null
}

function _traverse (val: any, seen: SimpleSet) {
  let i, keys
  const isA = Array.isArray(val)
  // 如果 val 是已被冻结的对象、VNode 实例、既不是数组也不是对象，就不会被收集
  if ((!isA && !isObject(val)) || Object.isFrozen(val) || val instanceof VNode) {
    return
  }
  // 如果 val 已经被观察过
  if (val.__ob__) {
    const depId = val.__ob__.dep.id
    if (seen.has(depId)) {
      return
    }
    seen.add(depId)
  }
  // 如果是数组或是对象，遍历每个属性
  if (isA) {
    i = val.length
    while (i--) _traverse(val[i], seen)
  } else {
    keys = Object.keys(val)
    i = keys.length
    while (i--) _traverse(val[keys[i]], seen)
  }
}
