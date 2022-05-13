'use strict'; // command命令action方法, 初始化

const Command = require('@cetc-cli/command');

class InitCommand extends Command {

}

// 接收执行的方法和command参数
function init (argv) {
  return new InitCommand(argv)
}

module.exports = init
module.exports.InitCommand = InitCommand;