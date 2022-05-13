#! /usr/bin/env node

// 判断本地包-逐级找node_modules
const importLocal = require('import-local')

if (importLocal(__filename)) {
  require('npmlog').info('cetc-cli', '正在使用 cetc-cli 本地版本')
} else {
  // 使用下载的cli，传参
  require('../lib')(process.argv.slice(2))
}