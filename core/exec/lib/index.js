'use strict'; // 执行命令方法, 初始化引包
/**
 * cetc-cli init test // 没指定目录，从npm下载指导package
 * cetc-cli init test -tp E:\Desktop\cli\cetc-cli\commands\init // 指定目录，走目录逻辑
 */

const path = require('path');
const cp = require('child_process');

const Package = require('@cetc-cli/package');
const log = require('@cetc-cli/log');
const { execOS } = require('@cetc-cli/utils');

// 映射package包
const SETTINGS = {
  init: '@cetc-cli/init' // --修改 '@cetc-cli/init'
}

// 缓存目录
const CACHE_DIR = 'dependencies/'

// 根据不同的command加载不同的包
async function exec() {
  let pkg = null
  // 缓存目录
  let storePath = ''
  // 本地的path 
  let targetPath = process.env.CLI_TARGET_PATH
  const homePath = process.env.CLI_HOME_PATH
  log.verbose('targetPath', targetPath)
  log.verbose('homePath', homePath)

  const commandObj = arguments[arguments.length - 1]
  const commandName = commandObj.name()
  const packageName = SETTINGS[commandName]
  const packageVersion = 'latest'

  if (!targetPath) { // 目标路径不存在 no参数 -tp /xxx
    // 生成缓存路径
    targetPath = path.resolve(homePath, CACHE_DIR)
    storePath = path.resolve(targetPath, 'node_modules')
    log.verbose('no-targetPath', targetPath)
    log.verbose('storePath', storePath)
    
    pkg = new Package({
      targetPath,
      storePath,
      packageName,
      packageVersion
    })
    if (await pkg.exists()) {
      // 更新package
      // console.log('gx pkg');
      await pkg.update()
    } else {
      // 安装package -- 异步执行的, await改同步
      await pkg.install()
    }
  } else {
    pkg = new Package({
      targetPath,
      packageName,
      packageVersion
    })
  }


  // 引入相关包
  const rootFile = pkg.getRootFilePath()
  if (rootFile) {
    try {
      // or1. 文件路径引入package包，执行package入口文件方法并传参command。在当前进程中调用
      // require(rootFile).call(null, Array.from(arguments));
      // require(rootFile)(...arguments);
      
      // or2. 在node子进程中调用
      const args = Array.from(arguments);
      const cmd = args[args.length - 1];
      const o = Object.create(null); // 没有原型的空对象
      Object.keys(cmd).forEach(key => { // command瘦身
        if (cmd.hasOwnProperty(key) && !key.startsWith('_') && key !== 'parent') { // 原型链不要
          o[key] = cmd[key]
        }
      })
      args[args.length - 1] = o; // 对象转换瘦身后的

      const code = `require('${rootFile}').call(null, ${JSON.stringify(args)})`;
      // 兼容系统
      // const child = spawn('node', ['-e', code], {
      const child = execOS('node', ['-e', code], {
        cwd: process.cwd(),
        stdio: 'inherit' // 子进程将所有stream返回给父
      })
      child.on('error', e => {
        log.error(e.message)
        process.exit(1) // 返回错误code
      })
      child.on('exit', e => {
        log.verbose('命令执行成功: ' + e)
        process.exit(e) // e => 1
      })
    } catch (e) {
      log.error(e.message)
    }
  }
}

// 兼容mas 、 win
function spawn (command, args, options) {
  const win32 = process.platform === 'win32'
  const cmd = win32 ? 'cmd' : command
  const cmdArgs = win32 ? ['/c'].concat(command, args) : args

  return cp.spawn(cmd, cmdArgs, options || {}) // spawn('cmd', ['/c' , '-e', code])
}

module.exports = exec;