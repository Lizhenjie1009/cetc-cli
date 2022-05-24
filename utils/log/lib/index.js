'use strict';
// 封装npmlog
const log = require('npmlog')

// log.level = 'verbose'
// 判断debug模式
log.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info' // 默认是info，verbose不显示。debug状态使用，动态设置显示级别，从环境变量取
// log前缀
log.heading = ' cetc-cli ' 
log.headingStyle = { fg: 'red', bg: 'white' }
// 添加自定义的命令
log.addLevel('success', 2000, { fg: 'green', bold: true })


module.exports = log;