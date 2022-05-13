'use strict'; // 执行命令方法, 初始化引包

const path = require('path');

const Package = require('@cetc-cli/package');
const log = require('@cetc-cli/log');


// 映射package包
const SETTINGS = {
  init: '@imooc-cli/init'
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

  if (!targetPath) { // 目标路径不存在 参数 -tp /xxx
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

  const rootFile = pkg.getRootFilePath()
  if (rootFile) {
    // 文件路径引入package包，执行package入口文件方法并传参command。在当前进程中调用
    require(rootFile).call(null, Array.from(arguments));
    // require(rootFile)(...arguments);

    // 在node子进程中调用
    
  }
}

module.exports = exec;