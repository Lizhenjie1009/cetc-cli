'use strict'; // 工具库


function isObject (target) {
  return Object.prototype.toString.call(target) === '[object Object]'
}

function spinnerStart (msg, spinnerString) { // loading加载
  const Spinner = require('cli-spinner').Spinner;
  const spinner = new Spinner(msg + ' %s');
  spinner.setSpinnerString(spinnerString ? spinnerString : '|/-\\');
  spinner.start();
  return spinner
}

function sleep (timeout = 1000) { // 模拟阻塞
  return new Promise(resolve => setTimeout(resolve, timeout))
}

// 执行命令 - 兼容mas 、 win
function execOS (command, args, options) {
  const win32 = process.platform === 'win32'
  const cmd = win32 ? 'cmd' : command
  const cmdArgs = win32 ? ['/c'].concat(command, args) : args

  return require('child_process').spawn(cmd, cmdArgs, options || {}) // spawn('cmd', ['/c' , '-e', code])
}

// 异步执行命令 - 兼容mas 、 win
function execAsync (command, args, options) {
  return new Promise((resolve, reject) => {
    const p = execOS(command, args, options)
    p.on('error', e => reject(e))
    p.on('exit', r => resolve(r))
  })
}

module.exports = {
  isObject,
  spinnerStart,
  sleep,
  execOS,
  execAsync
};