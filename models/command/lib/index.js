'use strict';

const semver = require('semver'); // 对比版本号
const colors = require('colors/safe');

const log = require('@cetc-cli/log');

const LOWEST_NODE_VERSION = '12.0.0'

class Command {
  constructor (argv) {
    // log.verbose('Command constructor', argv)
    if (!argv) {
      throw new Error('参数不能为空！')
    }
    if (!Array.isArray(argv)) {
      throw new Error('参数必须为数组！')
    }
    if (argv.length < 1) {
      throw new Error('参数列表为空！')
    }
    this._argv = argv // command参数
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve()
      chain = chain.then(() => this.checkNodeVersion())
      chain = chain.then(() => this.initArgs())
      chain = chain.then(() => this.init())
      chain = chain.then(() => this.exec())
      chain.catch(err => {
        log.error(err.message)
      })
    })
  }

  initArgs () { // 命令初始化
    this.cmd = this._argv[this._argv.length - 1]
    this._argv = this._argv.slice(0, this._argv.length - 1)
  }

  checkNodeVersion () {
    // 1.拿到当前版本号
    const currentVersion = process.version
    // 2.对比最低版本号
    const lowVersion = LOWEST_NODE_VERSION
    if (!semver.gte(currentVersion, lowVersion)) {
      throw new Error(colors.red(`cetc-cli 需要安装v${lowVersion}及以上版本的Node.js`))
    }
  } 

  // 继承者实现
  init () {
    throw new Error('init必须实现')
  }

  exec () {
    throw new Error('exec必须实现')
    
  }
}


module.exports = Command;
