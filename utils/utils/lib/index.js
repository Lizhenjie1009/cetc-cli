'use strict';


function isObject (target) {
  return Object.prototype.toString.call(target) === '[object Object]'
}

module.exports = {
  isObject
};