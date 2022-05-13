'use strict'; // command命令action方法, 初始化

const Command = require('@cetc-cli/command');
const log = require('@cetc-cli/log');

class InitCommand extends Command {
  init () { // 初始化-获取参数
    this.projectName = this._argv[0] || ''
    this.force = !!this._argv[1]

    log.verbose('projectName', this.projectName)
    log.verbose('force', this.force)
  }

  exec () { // init的业务逻辑
    console.log('exec ')
  }
} 

// 接收执行的方法和command参数
function init (argv) {
  return new InitCommand(argv)
}

module.exports = init
module.exports.InitCommand = InitCommand;