'use strict'; // command命令action方法, 初始化

const fs = require('fs');

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
    try {
      // 1. 准备阶段
      this.prepare()
      // 2. 下载模板
      // 3. 安装模板
    } catch (e) {
      log.error(e.message)
    }
  }

  prepare () {
    // 1. 判断当前目录是否为空
    if (!this.ifDirIsEmpty()) { // 不为空
      // 询问是否继续创建

    }
    // 2. 是否启动强制更新
    // 3. 选择创建项目或者文件
    // 4. 获取项目的基本信息
  }

  ifDirIsEmpty () {
    const localPath = process.cwd() // path.resolve('.')
    let fileList = fs.readdirSync(localPath)
    fileList = fileList.filter(file => { // 排除.get / node_modules 缓存文件
      return !file.startsWith('.') && !file.startsWith('node_modules')
    })
    return !fileList || fileList.length <= 0
  }
} 

// 接收执行的方法和command参数
function init (argv) {
  return new InitCommand(argv)
}

module.exports = init
module.exports.InitCommand = InitCommand;