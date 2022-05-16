/* @flow */
/* globals MutationObserver */

import { noop } from 'shared/util'
import { handleError } from './error'
import { isIE, isIOS, isNative } from './env'

export let isUsingMicroTask = false

const callbacks = []
let pending = false

function flushCallbacks () {
  pending = false
  const copies = callbacks.slice(0)
  callbacks.length = 0
  for (let i = 0; i < copies.length; i++) {
    copies[i]()
  }
}

// Here we have async deferring wrappers using microtasks.
// In 2.5 we used (macro) tasks (in combination with microtasks).
// However, it has subtle problems when state is changed right before repaint
// (e.g. #6813, out-in transitions).
// Also, using (macro) tasks in event handler would cause some weird behaviors
// that cannot be circumvented (e.g. #7109, #7153, #7546, #7834, #8109).
// So we now use microtasks everywhere, again.
// A major drawback of this tradeoff is that there are some scenarios
// where microtasks have too high a priority and fire in between supposedly
// sequential events (e.g. #4521, #6690, which have workarounds)
// or even between bubbling of the same event (#6566).
//这里我们有使用微任务的异步延迟包装器。
//在2.5中，我们使用(宏)任务(结合微任务)。
//但是，它有微妙的问题，当状态改变之前，重绘(例如#6813，出-入转换)。
//还有，在事件处理中使用(宏)任务会导致一些奇怪的行为(#7109， #7153， #7546， #7834， #8109)。
//所以我们现在到处使用微任务，再次。
//这种权衡的一个主要缺点是存在一些情况，微任务的优先级太高，在两者之间触发顺序事件(例如#4521，#6690，它们有工作区)甚至在同一个事件(#6566)的冒泡之间。
let timerFunc

// The nextTick behavior leverages the microtask queue, which can be accessed
// via either native Promise.then or MutationObserver.
// MutationObserver has wider support, however it is seriously bugged in
// UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
// completely stops working after triggering a few times... so, if native
// Promise is available, we will use it:
// nextTick行为利用微任务队列，它可以被访问
//通过原生Promise。然后或MutationObserver。
// MutationObserver有更广泛的支持，但是它被严重地嵌入
// UIWebView在iOS中的>= 9.3.3当触发触摸事件处理程序。它
//触发几次后完全停止工作…所以,如果本地
// Promise是可用的，我们将使用它:
/* istanbul ignore next, $flow-disable-line */
// 优先使用 Promise
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  const p = Promise.resolve()
  timerFunc = () => {
    p.then(flushCallbacks)
    // 在有问题的 UIWebViews 中，Promise.then 不会完全 break，但是它可能会陷入一种奇怪的状态，当回调被推入微任务队列，
    // 但队列没有被刷新，直到浏览器需要做一些其他的工作，例如处理一个计时器。因此,我们可以通过添加一个空定时器"强制"微任务队列刷新。
    if (isIOS) setTimeout(noop)
  }
  isUsingMicroTask = true
}
// 不是 IE 并且原生 MutationObserver 存在
else if (!isIE && typeof MutationObserver !== 'undefined' && (
  isNative(MutationObserver) ||
  // PhantomJS and iOS 7.x
  MutationObserver.toString() === '[object MutationObserverConstructor]'
)) {
  // 在 native Promise 不可用时使用 MutationObserver 代替，
  // e.g. PhantomJS, iOS7, Android 4.4 (#6466 MutationObserver is unreliable in IE11)
  let counter = 1
  const observer = new MutationObserver(flushCallbacks)
  const textNode = document.createTextNode(String(counter))
  observer.observe(textNode, {
    characterData: true
  })
  timerFunc = () => {
    counter = (counter + 1) % 2
    textNode.data = String(counter)
  }
  isUsingMicroTask = true
}
// 原生 setImmediate 存在，就用 setImmediate。技术上，它利用了(宏)任务队列，但它仍然是一个比 setTimeout 更好的选择。
else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  timerFunc = () => {
    setImmediate(flushCallbacks)
  }
}
// 最后使用 setTimeout 
else {
  timerFunc = () => {
    setTimeout(flushCallbacks, 0)
  }
}

export function nextTick (cb?: Function, ctx?: Object) {
  let _resolve
  callbacks.push(() => {
    if (cb) {
      try {
        cb.call(ctx)
      } catch (e) {
        handleError(e, ctx, 'nextTick')
      }
    } else if (_resolve) {
      _resolve(ctx)
    }
  })
  // 如果不是 pending 状态，执行
  if (!pending) {
    pending = true
    timerFunc()
  }
  // 这是当 nextTick 不传 cb 参数的时候，提供一个 Promise 化的调用，比如：nextTick().then(() => {})
  // 当 _resolve 函数执行，就会跳到 then 的逻辑中。
  // $flow-disable-line
  if (!cb && typeof Promise !== 'undefined') {
    return new Promise(resolve => {
      _resolve = resolve
    })
  }
}
