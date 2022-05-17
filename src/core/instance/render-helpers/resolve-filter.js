/* @flow */

import { identity, resolveAsset } from 'core/util/index'

/**
 * Runtime helper for resolving filters
 */
// 处理过滤器，返回 this.$options['filters'][id]
export function resolveFilter (id: string): Function {
  return resolveAsset(this.$options, 'filters', id, true) || identity
}
