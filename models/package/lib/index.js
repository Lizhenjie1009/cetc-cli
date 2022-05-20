'use strict';

// 1. CLI_TARGET_PATH -> modulePath
// 2. modulePath -> Package(npm模块)
// 3. Package.getRootFile(获取入口文件)
// 4. Package.update / Package.install

const path = require('path');
const pkgDir = require('pkg-dir').sync; // 向上查找node_modules
const npminstall = require('npminstall');
const pathExists = require('path-exists').sync; // 判断文件是否存在
const fse = require('fs-extra'); // fs拓展之后的插件， 含promise

const { isObject } = require('@cetc-cli/utils');
const formatPath = require('@cetc-cli/format-path');
const { getDefaultRegistry, getNpmLatestVersion } = require('@cetc-cli/get-npm-info');

class Package {
  constructor (options) {
    if (!options || !isObject(options)) {
      throw new Error('Package类的参数不能为空! ')
    }
    if (!isObject(options)) {
      throw new Error('Package类的options参数必须为对象! ')
    }
    // package的目标路径
    this.targetPath = options.targetPath || ''
    // package的存储路径--缓存路径
    this.storePath = options.storePath || ''
    // package的name
    this.packageName = options.packageName || ''
    // package的version
    this.packageVersion = options.packageVersion || ''
    // package的缓存目录前缀
    this.cacheFilePathPrefix = this.packageName.replace('/', '_')
  }

  async prepare () { // 将latest转成具体的version
    if (this.storePath && !pathExists(this.storePath)) { // 目录不存在， 创建缓存目录
      fse.mkdirpSync(this.storePath)
    }
    if (this.packageVersion === 'latest') {
      this.packageVersion = await getNpmLatestVersion(this.packageName)
    }
  }

  get cacheFilePath () { // 包名转换-缓存路径
    // _@cetc-cli_init@1.0.2@@cetc-cli/
    // @cetc-cli/init 1.0.2
    return path.resolve(this.storePath, `_${this.cacheFilePathPrefix}@${this.packageVersion}@${this.packageName}`)
  }

  getSpecificCacheFilePath (packageVersion) { // 获取指定包版本的路径
    return path.resolve(this.storePath, `_${this.cacheFilePathPrefix}@${packageVersion}@${this.packageName}`)
  }

  // 判断当前Package是否存在
  async exists () {
    if (this.storePath) { // 是不是走缓存的方式， 没有targetPath
      await this.prepare()
      // console.log(this.cacheFilePath)
      return pathExists(this.cacheFilePath)
    } else {
      return pathExists(this.targetPath)
    }
  }
  // 安装Package
  async install () {
    await this.prepare()
    npminstall({
      root: this.targetPath,
      storeDir: this.storePath,
      registry: getDefaultRegistry(),
      pkgs: [
        { 
          name: this.packageName, 
          version: this.packageVersion
        }
      ]
    })
  }
  // 更新Package
  async update () {
    await this.prepare()
    // 1.获取最新的npm版本号
    const latestPackageVersion = await getNpmLatestVersion(this.packageName)
    // console.log(latestPackageVersion);
    // 2.查询最新版本号的路径是否存在
    const latestFilePath = this.getSpecificCacheFilePath(latestPackageVersion)
    // 3.如果不存在，则直接安装最新版本
    if (!pathExists(latestFilePath)) {
      await npminstall({
        root: this.targetPath,
        storeDir: this.storePath,
        registry: getDefaultRegistry(),
        pkgs: [
          { 
            name: this.packageName, 
            version: latestPackageVersion
          }
        ]
      })
    }
    this.packageVersion = latestPackageVersion
    // console.log(latestFilePath)
    return latestFilePath
  }
  // 获取入口文件的路径
  getRootFilePath () {
    function _getRootFile (targetPath) {
      // 1. 获取package.json所在的目录 - pkg-dir
      const dir = pkgDir(targetPath)
      // console.log(dir);
      if (dir) {
        // 2. 读取package.json - require()
        const pkgFile = require(path.resolve(dir, 'package.json'));
        // 3. 寻找入口文件main/lib
        if (pkgFile && pkgFile.main) {
          // 4. 返回路径， 兼容(macOS / Windows)
          return formatPath(path.resolve(dir, pkgFile.main))
        }
      } else {
        return null
      }
    }
    if (this.storePath) {
      return _getRootFile(this.cacheFilePath)
    } else {
      return _getRootFile(this.targetPath)
    }
  }
}



module.exports = Package;