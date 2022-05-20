'use strict'; // command命令action方法, 初始化

const fs = require('fs');
const path = require('path');
const inquirer = require('inquirer'); // 命令行交互工具
const fse = require('fs-extra'); // fs拓展之后的插件， 含promise
const semver = require('semver'); // 对比版本号
const userHome = require('user-home'); // 获取用户主目录
const glob = require('glob'); // 筛选文件
const ejs = require('ejs'); // 模板渲染

const Command = require('@cetc-cli/command'); // command基类
const log = require('@cetc-cli/log');
const Package = require('@cetc-cli/package'); // 处理npm包类
const { spinnerStart, sleep, execAsync } = require('@cetc-cli/utils'); // 工具库

const getProjectTemplate = require('./getProjectTemplate'); // 获取模板接口

const TYPE_PROJECT = 'project'
const TYPE_COMPONENT = 'component'
const TEMPLATE_TYPE_NORMAL = 'normal'
const TEMPLATE_TYPE_CUSTOM = 'custom'
const WHITE_COMMAND = ['npm', 'cnpm']

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
        log.verbose('package', this.templateNpm)
        // 3. 安装模板
        await this.installTemplate()
      }
    } catch (e) {
      log.error(e.message)
      if (process.env.LOG_LEVEL === 'verbose') { // debug环境
        console.log(e)
      }
    }
  }

  async installTemplate () {
    if(this.templateInfo) {
      if (!this.templateInfo.type) {
        this.templateInfo.type = TEMPLATE_TYPE_NORMAL
      }

      if (this.templateInfo.type === TEMPLATE_TYPE_NORMAL) {
        // 标准安装
        await this.installNormalTemplate()
      } else if (this.templateInfo.type === TEMPLATE_TYPE_CUSTOM) {
        // 自定义安装
        await this.installCustomTemplate()
      } else {
        throw new Error('无法识别项目模板类型！')
      }
    } else {
      throw new Error('项目模板信息不存在！')
    }
  }

  // 执行命令
  async execCommand (commad, msg) {
    let res = null
    if (commad) { // 'npm install'
      const commadArray = commad.split(' ')
      const cmd = this.checkCommand(commadArray[0])
      if (!cmd) {
        throw new Error('命令不存在！', commad)
      }
      const args = commadArray.slice(1)
      res = await execAsync(cmd, args, {
        stdio: 'inherit',
        cwd: process.cwd()
      })
    }
    if (res !== 0) {
      throw new Error(msg)
    }

    return res
  }

  ejsRender (options) { // ejs渲染
    const dir = process.cwd()
    const projectInfo = this.projectInfo
    return new Promise((resolve, reject) => {
      glob('**', {
        cwd: process.cwd(),
        ignore: options.ignore || '',
        nodir: true
      }, (err, files) => {
        if (err) reject(err)

        Promise.all(files.map(file => {
          const filePath = path.join(dir, file)
          return new Promise((resolve1, reject1) => {
            // console.log(this.projectInfo)
            ejs.renderFile(filePath, projectInfo, {}, (err, result) => {
              // console.log(result)
              if (err) reject1(err)
              fse.writeFileSync(filePath, result)
              resolve1(result)
            })
          })
        }))
          .then(res => resolve(res))
          .catch(err => reject(err))
      })
    })
  }

  async installNormalTemplate () {
    // console.log('安装标准模板')
    // 拷贝缓存目录模板至当前目录
    let sps = spinnerStart('正在安装模板...')
    await sleep()
    try {
      // 缓存目录
      const templatePath = path.resolve(this.templateNpm.cacheFilePath, 'template')
      // 当前目录
      const targetPath = process.cwd()
      fse.ensureDirSync(templatePath) // 确保目录为真
      fse.ensureDirSync(targetPath) // 确保目录为真
      fse.copySync(templatePath, targetPath) 
    } catch (e) {
      throw e;
    } finally {
      sps.stop(true)
      log.success('安装模板成功')
    }

    const templateIgnore = this.templateInfo.ignore || []
    const ignore = ['**/node_modules/**', ...templateIgnore]
    await this.ejsRender({ ignore })

    const { installCommand, startCommand } = this.templateInfo
    // 依赖安装
    await this.execCommand(installCommand, '依赖安装失败！')
    // 启动命令执行
    await this.execCommand(startCommand, '启动执行命令失败！')
    // if (startCommand) { // 'npm install'
    //   const startCmd = startCommand.split(' ')
    //   const cmd = this.checkCommand(startCmd[0])
    //   const args = startCmd.slice(1)
    //   await execAsync(cmd, args, {
    //     stdio: 'inherit',
    //     cwd: process.cwd()
    //   })
    // }
  }

  checkCommand (cmd) { // 检查执行命令
    if (WHITE_COMMAND.includes(cmd)) {
      return cmd
    }
    return null
  }
  
  async installCustomTemplate () {
    console.log('安装自定义模板')

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
    this.templateInfo = templateInfo

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
      } catch (e) {
        throw e
      } finally {
        sps.stop(true)
        if (await templateNpm.exists()) {
          log.success('下载模板成功')
          this.templateNpm = templateNpm
        }
      }
    } else {
      const sps = spinnerStart('正在更新模板...')
      await sleep()
      try {
        await templateNpm.update()
      } catch (e) {
        throw e
      } finally {
        sps.stop(true)
        if (await templateNpm.exists()) {
          log.success('更新模板成功')
          this.templateNpm = templateNpm
        }
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
          const sps = spinnerStart('正在清空当前目录...')
          await sleep()
          fse.emptyDirSync(localPath)
          sps.stop(true)
        }
      }
    }
    
    return this.getProjectInfo()
  }
  
  // 返回创建信息
  async getProjectInfo () {
    function isValidName (v) { // 校验name合法
      return /^[a-zA-Z]+([-|_][a-zA-Z][a-zA-Z0-9]*|[a-zA-Z0-9])*$/.test(v)
    }

    let projectInfo = {}
    let isProjectNameValid = false

    if (isValidName(this.projectName)) {
      isProjectNameValid = true
      projectInfo.projectName = this.projectName
    }

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

    const title = type === TYPE_PROJECT ? '项目' : '组件'

    // 过滤组件或者项目
    this.template = this.template.filter(template => template.tag.includes(type))

    const projectNamePrompt = {
      type: 'input',
      name: 'projectName',
      message: `请输入${title}的名称：`,
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
          if (!isValidName(v)) {
            // Pass the return value in the done callback
            done(`请输入合法的项目名称！`);
            return;
          }
          // Pass the return value in the done callback
          done(null, true);
        }, 0);
      },
      filter: function (v) {
        return v
      }
    }
    const projectPrompt = []
    if (!isProjectNameValid) {
      projectPrompt.push(projectNamePrompt)
    }
    projectPrompt.push({
      type: 'input',
      name: 'projectVersion',
      message: `请输入${title}的版本号：`,
      default: '1.0.0',
      validate: function (v) {
        // return !!semver.valid(v) // 转成boolean
        const done = this.async();
        setTimeout(function() {
          if (!(!!semver.valid(v))) {
            done(`请输入合法的${title}版本号！`);
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
      message: `请输入${title}模板：`,
      choices: this.createTemplateChoice()
    })

    if (type === TYPE_PROJECT) { // 4. 获取项目的基本信息
      const project = await inquirer.prompt(projectPrompt)
      projectInfo = {
        ...projectInfo,
        type,
        ...project
      }
    } else if (type === TYPE_COMPONENT) { // 5. 获取组件的基本信息
      const descriptionPrompt = {
        type: 'input',
        name: 'componentDescription',
        message: '请输入组件描述信息：',
        default: '',
        validate: function (v) {
          // return !!semver.valid(v) // 转成boolean
          const done = this.async();
          setTimeout(function() {
            if (!v) {
              done('请输入组件描述信息！');
              return;
            }
            done(null, true);
          }, 0);
        }
      }

      projectPrompt.push(descriptionPrompt)

      const component = await inquirer.prompt(projectPrompt)
      projectInfo = {
        ...projectInfo,
        type,
        ...component
      }
    }

    if (projectInfo.projectName) {
      projectInfo.name = projectInfo.projectName
      // AbcDef --> abc-def
      projectInfo.className = require('kebab-case')(projectInfo.projectName).replace(/^-/, ''); // 处理驼峰转-
    }
    if (projectInfo.projectVersion) {
      projectInfo.version = projectInfo.projectVersion
    }
    if (projectInfo.componentDescription) {
      projectInfo.description = projectInfo.componentDescription
    }
    // return 项目的基本信息（object）
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