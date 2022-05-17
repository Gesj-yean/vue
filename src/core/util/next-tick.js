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
// 这里我们有使用微任务的异步延迟包装器。
// 在 2.5 中，我们使用（宏）任务（结合微任务）。
// 但是，当状态在重绘之前改变时，它有一些微妙的问题
//（例如#6813，出入过渡）。
// 此外，在事件处理程序中使用（宏）任务会导致一些奇怪的行为
// 这是无法规避的（例如#7109、#7153、#7546、#7834、#8109）。
// 所以我们现在再次在任何地方使用微任务。
// 这种权衡的一个主要缺点是存在一些场景
// 微任务的优先级太高，应该在两者之间触发
// 顺序事件（例如 #4521、#6690，它们有变通方法）
// 甚至在同一事件的冒泡之间 (#6566)。
let timerFunc

// The nextTick behavior leverages the microtask queue, which can be accessed
// via either native Promise.then or MutationObserver.
// MutationObserver has wider support, however it is seriously bugged in
// UIWebView in iOS >= 9.3.3 when triggered in touch event handlers. It
// completely stops working after triggering a few times... so, if native
// Promise is available, we will use it:
// nextTick 行为利用了可以访问的微任务队列
// 通过本机 Promise.then 或 MutationObserver。
// MutationObserver 有更广泛的支持，但是它存在严重错误
// 在触摸事件处理程序中触发时，iOS 中的 UIWebView >= 9.3.3。 它
// 触发几次后完全停止工作...所以，如果是原生的
// Promise 可用，我们将使用它：
/* istanbul ignore next, $flow-disable-line */
if (typeof Promise !== 'undefined' && isNative(Promise)) {
  const p = Promise.resolve()
  timerFunc = () => {
    p.then(flushCallbacks)
    // In problematic UIWebViews, Promise.then doesn't completely break, but
    // it can get stuck in a weird state where callbacks are pushed into the
    // microtask queue but the queue isn't being flushed, until the browser
    // needs to do some other work, e.g. handle a timer. Therefore we can
    // "force" the microtask queue to be flushed by adding an empty timer.
    // 在有问题的 UIWebViews 中，Promise.then 并没有完全中断，但是
    // 它可能会陷入一个奇怪的状态，回调被推入
    // 微任务队列，但队列没有被刷新，直到浏览器
    // 需要做一些其他的工作，例如 处理一个计时器。 因此我们可以
    // 通过添加一个空计时器“强制”刷新微任务队列。
    if (isIOS) setTimeout(noop)
  }
  isUsingMicroTask = true
} else if (!isIE && typeof MutationObserver !== 'undefined' && (
  isNative(MutationObserver) ||
  // PhantomJS and iOS 7.x
  MutationObserver.toString() === '[object MutationObserverConstructor]'
)) {
  // Use MutationObserver where native Promise is not available,
  // e.g. PhantomJS, iOS7, Android 4.4
  // (#6466 MutationObserver is unreliable in IE11)
  // 在原生 Promise 不可用的情况下使用 MutationObserver，
  // 例如 PhantomJS、iOS7、Android 4.4
  // (#6466 MutationObserver 在 IE11 中不可靠)
  // 如果检测到浏览器支持MO，则创建一个文本节点，监听这个文本节点的改动事件，以此来触发nextTickHandler（也就是DOM更新完毕回调）的执行
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
} else if (typeof setImmediate !== 'undefined' && isNative(setImmediate)) {
  // Fallback to setImmediate.
  // Technically it leverages the (macro) task queue,
  // but it is still a better choice than setTimeout.
  // 回退到 setImmediate。
   // 从技术上讲，它利用了（宏）任务队列，
   // 但它仍然是比 setTimeout 更好的选择。
  timerFunc = () => {
    setImmediate(flushCallbacks)
  }
} else {
  // Fallback to setTimeout.
  // 回退到 setTimeout
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
  if (!pending) {
    pending = true
    timerFunc()
  }
  // $flow-disable-line
  if (!cb && typeof Promise !== 'undefined') {
    return new Promise(resolve => {
      _resolve = resolve
    })
  }
}
