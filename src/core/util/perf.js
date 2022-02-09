import { inBrowser } from './env'

export let mark
export let measure

if (process.env.NODE_ENV !== 'production') {
  const perf = inBrowser && window.performance
  /* istanbul ignore if */
  if (
    perf &&
    perf.mark && 
    perf.measure &&
    perf.clearMarks &&
    perf.clearMeasures
  ) {
    mark = tag => perf.mark(tag) // 浏览器的性能缓冲区中使用给定名称添加一个timestamp(时间戳) 。
    measure = (name, startTag, endTag) => { // 浏览器性能记录缓存中创建了一个被命名过的时间戳的记录来记录两个特殊标志位（通常称为开始标志和结束标志）。 被命名的时间戳称为一次测量（measure）。
      perf.measure(name, startTag, endTag)
      perf.clearMarks(startTag)
      perf.clearMarks(endTag)
      // perf.clearMeasures(name)
    }
  }
}
