'use strict';


class Command {
  constructor (argv) {
    console.log('models / command', argv)
    this._argv = argv // command参数
    let runner = new Promise((resolve, reject) => {
      let chain = Promise.resolve()
      chain = chain.then(() => {})
    })
  }

  init () {
    throw new Error('init必须实现')
  }

  exec () {
    throw new Error('exec必须实现')
    
  }
}


module.exports = Command;
