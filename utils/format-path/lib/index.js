'use strict'; // 文件路径兼容mac、win

const path = require('path');

module.exports = function formatPath(p) {
  if (p && typeof p === 'string') {
    const sep = path.sep;
    if (sep === '/') {
      return p
    } else {
      return p.replace(/\\/g, '/')
    }
  }
  return p
}
