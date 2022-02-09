/* @flow */

import config from 'core/config'
import { warn, cached } from 'core/util/index' // warn可以发出[Vue warn]: 警告信息。cached是创建一个纯函数方法的缓存。
import { mark, measure } from 'core/util/perf' // 浏览器性能相关：创建时间戳和测量(measure)。

import Vue from './runtime/index'
import { query } from './util/index' // 查询元素，如果是dom元素直接返回。
import { compileToFunctions } from './compiler/index' // 编译模版 parse template -> ast -> optimize -> generate -> render
import { shouldDecodeNewlines, shouldDecodeNewlinesForHref } from './util/compat' // 检查当前环境是否需要对字符进行编码

const idToTemplate = cached(id => {
  const el = query(id) // 根据选择器查询元素
  return el && el.innerHTML
})

const mount = Vue.prototype.$mount
Vue.prototype.$mount = function ( // Vue.prototype.$mount 返回一个 Component。
  el?: string | Element,
  hydrating?: boolean
): Component {
  el = el && query(el)

  /* istanbul ignore if */
  // 判断挂在的元素是否为 html 或 body，发出警告。
  if (el === document.body || el === document.documentElement) {
    process.env.NODE_ENV !== 'production' && warn(
      `Do not mount Vue to <html> or <body> - mount to normal elements instead.`
    )
    return this
  }

  const options = this.$options
  // resolve template/el and convert to render function
  // 将 template/el 转化成 render 函数
  if (!options.render) {
    let template = options.template
    if (template) {
      if (typeof template === 'string') {
        if (template.charAt(0) === '#') {
          template = idToTemplate(template)
          /* istanbul ignore if */
          if (process.env.NODE_ENV !== 'production' && !template) {
            warn(
              `Template element not found or is empty: ${options.template}`,
              this
            )
          }
        }
      } else if (template.nodeType) {
        template = template.innerHTML
      } else {
        if (process.env.NODE_ENV !== 'production') {
          warn('invalid template option:' + template, this)
        }
        return this
      }
    } else if (el) {
      template = getOuterHTML(el)
    }
    // 获取完成 template 序列化后的 HTML 片段。
    if (template) {
      /* istanbul ignore if */
      // 打一个名为 compile 的时间戳。
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile')
      }

      // 解析 template 获得 render
      const { render, staticRenderFns } = compileToFunctions(template, {
        outputSourceRange: process.env.NODE_ENV !== 'production',
        shouldDecodeNewlines,
        shouldDecodeNewlinesForHref,
        delimiters: options.delimiters,
        comments: options.comments
      }, this)
      options.render = render
      options.staticRenderFns = staticRenderFns

      /* istanbul ignore if */
      // 获取整个编译过程的性能
      if (process.env.NODE_ENV !== 'production' && config.performance && mark) {
        mark('compile end')
        measure(`vue ${this._name} compile`, 'compile', 'compile end')
      }
    }
  }
  return mount.call(this, el, hydrating)
}

/**
 * Get outerHTML of elements, taking care
 * of SVG elements in IE as well.
 * 获取描述元素（包括其后代）的序列化HTML片段，例如'<div id="d"><p>Content</p><p>Further Elaborated</p></div>'。
 */
function getOuterHTML (el: Element): string {
  if (el.outerHTML) {
    return el.outerHTML
  } else {
    const container = document.createElement('div')
    container.appendChild(el.cloneNode(true))
    return container.innerHTML
  }
}

Vue.compile = compileToFunctions // 获得 {ast, render, staticRenderFns}

export default Vue
