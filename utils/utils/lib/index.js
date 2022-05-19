'use strict';


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

module.exports = {
  isObject,
  spinnerStart,
  sleep
};