'use strict';

module.exports = core;

const path = require('path');
const semver = require('semver'); // 对比版本号
const colors = require('colors/safe');
const userHome = require('user-home'); // 判断用户主目录
const pathExists = require('path-exists').sync; // 判断文件是否存在
const commander = require('commander'); // 命令行工具


const log = require('@cetc-cli/log');
const { getNpmSemverVersion } = require('@cetc-cli/get-npm-info');
// const init = require('@cetc-cli/init');
const exec = require('@cetc-cli/exec');

const pkg = require('../package.json')
const constant = require('./const');

// let args = null
const program = new commander.Command()

function core() {
  try {
    prepare()
    registerCommand()
  } catch (e) {
    // 自己处理异常信息显示
    log.error(e.message)
    if (process.env.LOG_LEVEL === 'verbose') {
      console.log(e);
    }
  }
}

// 命令注册
function registerCommand () {
  program // 初始化
    .name(Object.keys(pkg.bin)[0])
    .usage('<command> [options]')
    .version(pkg.version)
    .option('-d, --debug', '是否开启调试模式', false)
    .option('-tp, --targetPath <targetPath>', '是否指定本地调式路径', '');

  program // 注册命令
    .command('init [projectName]')
    .option('-f, --force', '是否覆盖原有项目')
    .action(exec)
    // .action((projectName, option) => {
    //   console.log(projectName, option)
    // })


  program.on('option:debug', function () { // 监听debug事件-开启
    const options = program.opts()
    if (options.debug) {
      process.env.LOG_LEVEL = 'verbose'
    } else {
      process.env.LOG_LEVEL = 'info'
    }
    // 重新修改log-level
    log.level = process.env.LOG_LEVEL
  });

  program.on('option:targetPath', function () { // 监听输入targetPath事件，储存环境变量
    const options = program.opts()
    if (options.targetPath) {
      process.env.CLI_TARGET_PATH = options.targetPath
    }
  });

  program.on('command:*', function (commands) { // 监听未命中的命令
    const availableCommands = program.commands.map(command => command.name())
    console.log(colors.red('未知的命令: ' + commands[0]))
    if (availableCommands.length > 0) {
      console.log(colors.green('可用命令: ' + availableCommands.join(', ')))
    }
  })

  program.parse(process.argv)

  if (program.args && program.args.length < 1) { // 用户未输入命令, 显示帮助文档
    program.outputHelp()
  }
} 

// 初始化
function prepare () {
  checkPkgVersion()
  // checkNodeVersion()
  checkRoot()
  checkUserHome()
  // checkInputArgs()
  checkEnv() // 需要--debug 查看环境变量
  checkGlobalUpdate()
}

// 检查版本
async function checkGlobalUpdate () {
  // 1. 获取当前版本号和模块名
  const currentVersion = pkg.version
  const npmName = pkg.name
  // 2. 调用npm API, 获取所有版本号
  // 3. 提取所有版本号, 比对那些版本号大于当前版本号
  // 4. 给出最新的版本号, 提示更新最新的版本
  const version = await getNpmSemverVersion(currentVersion, npmName)
  // 最新的版本号大于当前版本
  if (version && semver.gt(version, currentVersion)) {
    log.warn('更新提示', colors.yellow(`请更新 ${npmName}, 当前版本: v${currentVersion}, 最新版本: v${version};
      
    npm install ${npmName} -g
    npm install ${npmName}@${version} 
    npm install ${npmName}@latest
    `))
  }
}

// 检查环境变量
function checkEnv () {
  const dotEnv = require('dotenv'); // 查找环境变量的
  const dotEnvPath = path.resolve(userHome, '.env')
  if (pathExists(dotEnvPath)) { // 查找本地文件有没有.env文件
    config = dotEnv.config({
      path: dotEnvPath
    })
  } 
  
  createDefaultConfig() // 没有的话, 创建环境变量
  log.verbose('环境变量', process.env.CLI_HOME_PATH)
}
function createDefaultConfig () {
  const cliConfig = {
    home: userHome,
  }
  if (process.env.CLI_HOME) {
    cliConfig['cliHome'] = path.join(userHome, process.env.CLI_HOME)
  } else {
    cliConfig['cliHome'] = path.join(userHome, constant.DEFAULT_CLI_HOME)
  }
  process.env.CLI_HOME_PATH = cliConfig.cliHome
}

// // 检查入参
// function checkInputArgs () {
//   // 参数格式处理 --debug -> {debug: true}
//   const minimist = require('minimist');
//   args = minimist(process.argv.slice(2))
//   checkArgs()
// }
// // 环境变量赋值 - debug模式
// function checkArgs () {
//   if (args.debug) {
//     process.env.LOG_LEVEL = 'verbose'
//   } else {
//     process.env.LOG_LEVEL = 'info'
//   }
//   // 重新修改log-level
//   log.level = process.env.LOG_LEVEL
// }

function checkUserHome () {
  // 主目录或者文件不存在
  if (!userHome || !pathExists(userHome)) {
    throw new Error(colors.red('当前登录用户主目录不存在! '))
  }
}

function checkRoot () {
  // root权限降级
  const rootCheck = require('root-check');
  rootCheck()
}



function checkPkgVersion () {
  log.notice('version', pkg.version)
} 