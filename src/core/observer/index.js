/* @flow */

import Dep from './dep'
import VNode from '../vdom/vnode'
import { arrayMethods } from './array'
import {
  def,
  warn,
  hasOwn,
  hasProto,
  isObject,
  isPlainObject,
  isPrimitive,
  isUndef,
  isValidArrayIndex,
  isServerRendering
} from '../util/index'

const arrayKeys = Object.getOwnPropertyNames(arrayMethods)
console.log(arrayKeys);

/**
 * In some cases we may want to disable observation inside a component's
 * update computation.
 * 在某些情况下，我们可能希望禁用组件内部的观察更新计算。
 */
export let shouldObserve: boolean = true

export function toggleObserving (value: boolean) {
  shouldObserve = value
}

/**
 * Observer 类和每个响应式对象关联。
 * observer 会转化对象的属性值的 getter/setters 方法收集依赖和派发更新。
 */
export class Observer {
  value: any;
  dep: Dep;
  vmCount: number; // number of vms that have this object as root $data

  constructor(value: any) {
    this.value = value
    this.dep = new Dep() // 存放 Observer 的 watcher 列表
    this.vmCount = 0
    def(value, '__ob__', this) // __ob__ 指向自身 observe 实例，存在 __ob__ 属性意味着已经被观察过
    // 如果是数组
    if (Array.isArray(value)) {
      // hasProto = '__proto__' in {} 判断对象是否存在 __proto__ 属性
      if (hasProto) {
        // 如果有 __proto__，就将 value.__proto__ 指向 arrayMethods
        protoAugment(value, arrayMethods)
        console.log(arrayMethods);
      } else {
        // 否则，就遍历 arrayMethods，将值复制到 value 上
        copyAugment(value, arrayMethods, arrayKeys)
        console.log(arrayMethods);
      }
      this.observeArray(value) // 数组项遍历，给数组的每一项创建一个 observe 实例
    } else {
      this.walk(value) // 遍历所有的属性，修改 getter/setters
    }
  }

  // 遍历所有的属性，修改 getter/setters，这个方法只有在 value 是object时调用
  walk (obj: Object) {
    const keys = Object.keys(obj)
    for (let i = 0; i < keys.length; i++) {
      defineReactive(obj, keys[i])
    }
  }

  // 数组项遍历，给数组的每一项创建一个 observe 实例
  observeArray (items: Array<any>) {
    for (let i = 0, l = items.length; i < l; i++) {
      observe(items[i])
    }
  }
}

// helpers

/**
 * 将 target.__proto__ 指向 src
 * 拦截原型链__proto__，来增强目标对象或数组
 * @param {*} target 
 * @param {Object} src 
 */
function protoAugment (target, src: Object) {
  /* eslint-disable no-proto */
  target.__proto__ = src
  /* eslint-enable no-proto */
}

/**
 * 遍历 key 属性值列表，将 src 中的 key 属性值逐一定义到 target 的属性中
 * 通过定义隐藏属性，来增强目标对象或数组
 * @param {Object} target 
 * @param {Object} src 
 * @param {Array<string>} keys 
 */
/* istanbul ignore next */
function copyAugment (target: Object, src: Object, keys: Array<string>) {
  for (let i = 0, l = keys.length; i < l; i++) {
    const key = keys[i]
    def(target, key, src[key]) // // 为 target 定义 key 和值
  }
}

/**
 * Attempt to create an observer instance for a value,
 * returns the new observer if successfully observed,
 * or the existing observer if the value already has one.
 */
export function observe (value: any, asRootData: ?boolean): Observer | void {
  if (!isObject(value) || value instanceof VNode) {
    return
  }
  let ob: Observer | void
  if (hasOwn(value, '__ob__') && value.__ob__ instanceof Observer) {
    ob = value.__ob__
  } else if (
    shouldObserve &&
    !isServerRendering() &&
    (Array.isArray(value) || isPlainObject(value)) &&
    Object.isExtensible(value) &&
    !value._isVue
  ) {
    ob = new Observer(value)
  }
  if (asRootData && ob) {
    ob.vmCount++
  }
  return ob
}

/**
 * Define a reactive property on an Object. 在一个对象上定义一个响应式属性。
 */
export function defineReactive (
  obj: Object,
  key: string,
  val: any,
  customSetter?: ?Function,
  shallow?: boolean
) {
  const dep = new Dep()

  const property = Object.getOwnPropertyDescriptor(obj, key)
  if (property && property.configurable === false) {
    return
  }

  // cater for pre-defined getter/setters
  const getter = property && property.get
  const setter = property && property.set
  if ((!getter || setter) && arguments.length === 2) {
    val = obj[key]
  }

  let childOb = !shallow && observe(val)
  Object.defineProperty(obj, key, {
    enumerable: true,
    configurable: true,
    get: function reactiveGetter () {
      const value = getter ? getter.call(obj) : val
      if (Dep.target) {
        dep.depend()
        if (childOb) {
          childOb.dep.depend()
          if (Array.isArray(value)) {
            dependArray(value)
          }
        }
      }
      return value
    },
    set: function reactiveSetter (newVal) {
      const value = getter ? getter.call(obj) : val
      /* eslint-disable no-self-compare */
      if (newVal === value || (newVal !== newVal && value !== value)) {
        return
      }
      /* eslint-enable no-self-compare */
      if (process.env.NODE_ENV !== 'production' && customSetter) {
        customSetter()
      }
      // #7981: for accessor properties without setter
      if (getter && !setter) return
      if (setter) {
        setter.call(obj, newVal)
      } else {
        val = newVal
      }
      childOb = !shallow && observe(newVal)
      dep.notify()
    }
  })
}

/**
 * 为对象或是数组设置属性，添加新的属性并触发响应式
 * @param {Object | Array} target 
 * @param {string | number} propertyName/index 
 * @param {any} val 
 * @returns val
 */
export function set (target: Array<any> | Object, key: any, val: any): any {
  // 开发环境下，如果 target 未定义或者 target 是原始值，则不支持定义属性，会抛出警告
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot set reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  // 如果是数组并且 key 是合法下标，如果 key 大于目标数组长度，那么数组长度扩展为 key，否则数组长度不变
  // 之后，splice 插入 val
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.length = Math.max(target.length, key)
    target.splice(key, 1, val)
    return val
  }
  // 如果 target 是数组，并且不是原型链上的 key，那么设置 target 的 key 属性值
  if (key in target && !(key in Object.prototype)) {
    target[key] = val
    return val
  }
  const ob = (target: any).__ob__

  // 如果对象就是 Vue，或者是根组件(根组件 的 ob.vmCount 不为 0)，那么抛出错误
  // 不能在 Vue 实例或者给根 $data 上添加属性，需要在 data 选项中声明
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid adding reactive properties to a Vue instance or its root $data ' +
      'at runtime - declare it upfront in the data option.'
    )
    return val
  }
  // 如果 target 上没有 observe 对象，那么就直接设置值
  if (!ob) {
    target[key] = val
    return val
  }
  // 如果 target 上有 observe 对象，说明是响应式，那么 defineReactive 在一个对象上定义一个响应式属性。
  // 通知他的订阅者，触发响应式
  defineReactive(ob.value, key, val)
  ob.dep.notify()
  return val
}

/**
 * Delete a property and trigger change if necessary.
 */
export function del (target: Array<any> | Object, key: any) {
  // 删除未定义的目标或者是基本数据类型，抛出错误：不能删除 undefind\null\原始值的属性
  // isUndef() 判断是否是 undefined 或 null，isPrimitive() 判断是否是 string number symbol boolean
  if (process.env.NODE_ENV !== 'production' &&
    (isUndef(target) || isPrimitive(target))
  ) {
    warn(`Cannot delete reactive property on undefined, null, or primitive value: ${(target: any)}`)
  }
  // 删除目标是数组并且是合法的 index，那么用 splice 操作删除
  if (Array.isArray(target) && isValidArrayIndex(key)) {
    target.splice(key, 1)
    return
  }
  // 删除目标是 Vue 实例或是根组件，抛出错误：避免删除 Vue 实例或根组件的 $data
  const ob = (target: any).__ob__
  if (target._isVue || (ob && ob.vmCount)) {
    process.env.NODE_ENV !== 'production' && warn(
      'Avoid deleting properties on a Vue instance or its root $data ' +
      '- just set it to null.'
    )
    return
  }
  // 删除的属性不属于目标，不会报错，直接返回
  if (!hasOwn(target, key)) {
    return
  }
  // 删除属性，如果目标数组/对象未被观察过就直接返回，否则触发响应式更新
  delete target[key]
  if (!ob) {
    return
  }
  ob.dep.notify()
}

/**
 * Collect dependencies on array elements when the array is touched, since
 * we cannot intercept array element access like property getters.
 */
function dependArray (value: Array<any>) {
  for (let e, i = 0, l = value.length; i < l; i++) {
    e = value[i]
    e && e.__ob__ && e.__ob__.dep.depend()
    if (Array.isArray(e)) {
      dependArray(e)
    }
  }
}
