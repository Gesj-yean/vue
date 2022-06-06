/* @flow */

import type Watcher from './watcher'
import { remove } from '../util/index'
import config from '../config'

let uid = 0

/**
 * 一个 dep 对应一个 object.key，每次 key 更新时调用 dep.notify()，
 * dep 下的 subs 存放 Watcher 列表，可以调用 dep.notify() 触发 watcher.update() 使 Watcher 列表更新。
 */
export default class Dep {
  static target: ?Watcher; // Dep 类的静态属性，可以使用 Dep.target 访问，内容是 Watcher
  id: number;
  subs: Array<Watcher>; // Watcher 组成的订阅列表

  constructor() {
    this.id = uid++
    this.subs = [] // watcher 订阅者列表
  }

  // 向订阅者列表中添加一个订阅者 Watcher
  addSub (sub: Watcher) {
    this.subs.push(sub)
  }

  // 从订阅者列表中删掉一个 Watcher
  removeSub (sub: Watcher) {
    remove(this.subs, sub)
  }

  // watcher 中会调用该方法 
  depend () {
    if (Dep.target) {
      Dep.target.addDep(this) // watcher 中添加这个 dep
    }
  }

  // 通知订阅者列表触发更新
  notify () {
    // 用 slice() 方法拷贝一个 subs，不影响 this.subs
    const subs = this.subs.slice()
    if (process.env.NODE_ENV !== 'production' && !config.async) {
      // 如果不是运行异步，Watcher 列表不会在调度器中排序，我们需要去对他们进行排序以确保他们按顺序正确的调度
      subs.sort((a, b) => a.id - b.id)
    }
    // 依次触发 Watcher.update()
    for (let i = 0, l = subs.length; i < l; i++) {
      subs[i].update()
    }
  }
}

// The current target watcher being evaluated.
// This is globally unique because only one watcher
// can be evaluated at a time.
// 当前目标 watcher 被评估。这是全局唯一的，因为一次只能评估一个 watcher。
Dep.target = null
const targetStack = []

// 当前 watcher 入栈，将 Dep.target 指向当前的 watcher
export function pushTarget (target: ?Watcher) {
  targetStack.push(target)
  Dep.target = target
}

// 出栈，Dep.target 指向上一个 watcher，把 Dep.target 恢复成上一个状态
export function popTarget () {
  targetStack.pop()
  Dep.target = targetStack[targetStack.length - 1]
}
