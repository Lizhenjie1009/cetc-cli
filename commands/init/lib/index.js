'use strict'; // command命令action方法, 初始化

const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer'); // 命令行交互工具
const fse = require('fs-extra'); // fs拓展之后的插件， 含promise
const semver = require('semver'); // 对比版本号
const userHome = require('user-home'); // 获取用户主目录

const Command = require('@cetc-cli/command'); // command基类
const log = require('@cetc-cli/log');
const Package = require('@cetc-cli/package'); // 处理npm包类
const { spinnerStart, sleep } = require('@cetc-cli/utils'); // 工具库

const getProjectTemplate = require('./getProjectTemplate'); // 获取模板接口

const TYPE_PROJECT = 'project'
const TYPE_COMPONENT = 'component'

class InitCommand extends Command {
  init () { // 初始化-获取参数
    this.projectName = this._argv[0] || ''
    this.force = !!this._argv[1].force

    log.verbose('projectName', this.projectName)
    log.verbose('force', this.force)
  }

  async exec () { // init的业务逻辑
    try {
      // 1. 准备阶段
      let projectInfo = await this.prepare()
      if (projectInfo) {
        this.projectInfo = projectInfo
        log.verbose('projectInfo', projectInfo)
        // 2. 下载模板
        await this.downloadTemplate()
        // 3. 安装模板
      }
    } catch (e) {
      log.error(e.message)
    }
  }

  // 下载模板
  async downloadTemplate () {
    /**
     * 1. 通过项目模板api获取项目模板信息
     *  1.1 通过egg.js搭建一套后端系统
     *  1.2 通过npm储存项目模板
     *  1.3 将项目模板信息存储到mongodb数据库中
     *  1.4 通过egg.js获取mongodb中的数据并且通过api返回
     */
    // console.log(this.projectInfo, this.template)
    const { projectTemplate } = this.projectInfo
    const templateInfo = this.template.find(item => item.npmName === projectTemplate)
    // console.log(templateInfo, userHome)
    const targetPath = path.resolve(userHome, '.cetc-cli', 'template')
    const storePath = path.resolve(userHome, '.cetc-cli', 'template', 'node_modules')
    const { npmName: packageName, version: packageVersion } = templateInfo

    const templateNpm = new Package({
      targetPath,
      storePath,
      packageName,
      packageVersion
    })
    if (!await templateNpm.exists()) { // npm包是否存在
      const sps = spinnerStart('正在下载模板...')
      await sleep()
      try {
        await templateNpm.install()
        log.success('下载模板成功')
      } catch (e) {
        throw e
      } finally {
        sps.stop(true)
      }
    } else {
      const sps = spinnerStart('正在更新模板...')
      await sleep()
      try {
        await templateNpm.update()
        log.success('更新模板成功')
      } catch (e) {
        throw e
      } finally {
        sps.stop(true)
      }
    }
  }


  async prepare () {
    // 0. 判断项目模板是否存在
    let template = await getProjectTemplate()
    // console.log(template)
    if (!template || template.length < 1) {
      throw new Error('项目模板不存在！')
    }
    this.template = template

    const localPath = process.cwd() // path.resolve('.')

    // 1. 判断当前目录是否为空
    if (!this.ifDirIsEmpty(localPath)) { // 不为空
      let ifContinue = false

      if (!this.force) { // 强制
        // 询问是否继续创建
        const { ifContinuePromt } = await inquirer.prompt({
          type: 'confirm',
          name: 'ifContinuePromt',
          default: false,
          message: '当前文件夹不为空，是否继续创建项目？'
        })
        ifContinue = ifContinuePromt
        if (!ifContinue) return
      }
      // 2. 是否启动强制更新
      if (ifContinue || this.force) {
        // 二次确认
        const { confirmDelete } = await inquirer.prompt({
          type: 'confirm',
          name: 'confirmDelete',
          default: false,
          message: '是否确认清空当前目录下的文件？'
        })

        if (confirmDelete) {
          // 清空当前目录
          fse.emptyDirSync(localPath)
        }
      }
    }
    
    return this.getProjectInfo()
  }
  
  // 返回创建信息
  async getProjectInfo () {
    let projectInfo = {}
    let project = null // 项目信息

    // 3. 选择创建项目或者文件
    const { type } = await inquirer.prompt({
      type: 'list',
      name: 'type',
      default: TYPE_PROJECT,
      message: '请选择初始化类型：',
      choices: [{
        name: '项目',
        value: TYPE_PROJECT
      },
      {
        name: '组件',
        value: TYPE_COMPONENT
      }]
    })
    
    if (type === TYPE_PROJECT) { // 4. 获取项目的基本信息
      project = await inquirer.prompt([
        {
          type: 'input',
          name: 'projectName',
          message: '请输入项目的名称：',
          default: 'cetc-pro',
          validate: function (v) {
            /**
             * 1. 输入的首字符必须为英文字符
             * 2. 尾字符必须为英文或数字，不能为字符
             * 3. 字符仅允许'-_'
             * a-b a_b aaa bbb aa123
             */
            // return /^[a-zA-Z]+([-|_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)

            const done = this.async();
            // Do async stuff
            setTimeout(function() {
              if (!/^[a-zA-Z]+([-|_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)) {
                // Pass the return value in the done callback
                done('请输入合法的项目名称！');
                return;
              }
              // Pass the return value in the done callback
              done(null, true);
            }, 0);
          },
          filter: function (v) {
            return v
          }
        },
        {
          type: 'input',
          name: 'projectVersion',
          message: '请输入项目的版本号：',
          default: '1.0.0',
          validate: function (v) {
            // return !!semver.valid(v) // 转成boolean

            const done = this.async();
            setTimeout(function() {
              if (!(!!semver.valid(v))) {
                done('请输入合法的项目版本号！');
                return;
              }
              done(null, true);
            }, 0);
          },
          filter: function (v) {
            if (!!semver.valid(v)) {
              return semver.valid(v)
            } else {
              return v
            }
          }
        },
        {
          type: 'list',
          name: 'projectTemplate',
          message: '请输入项目模板：',
          choices: this.createTemplateChoice()
        }
      ])

    } else if (type === TYPE_COMPONENT) { // 5. 获取组件的基本信息

    }

    // return 项目的基本信息（object）
    projectInfo = {
      type,
      ...project
    }
    return projectInfo
  }

  createTemplateChoice () { // 选择创建项目模板
    return this.template.map(item => ({
      value: item.npmName,
      name: item.name
    }))
  }

  // 判断当前目录是否为空
  ifDirIsEmpty (localPath) { 
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