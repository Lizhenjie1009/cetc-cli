'use strict';

const axios = require('axios');
const urlJoin = require('url-join'); // 拼接合法url
const semver = require('semver'); // 对比版本号

function getNpmInfo(npmName, registry) {
  if (!npmName) return null
  registry = registry || getDefaultRegistry()
  const npmInfoUrl = urlJoin(registry, npmName)
  return axios.get(npmInfoUrl).then(res => {
    if (res.status === 200) {
      return res.data
    }
    return null
  }).catch(err => {
    return Promise.reject(err)
  })
}

/**
 * @param {*} isOriginal 是不是原生的
 */
function getDefaultRegistry (isOriginal = false) {
  return isOriginal ? 'https://registry.npmjs.org' : 'https://registry.npm.taobao.org'
}

// 获取npm版本号
async function getNpmVersions (npmName, registry) {
  const data = await getNpmInfo(npmName, registry)
  if (data) {
    return Object.keys(data.versions)
  } else {
    return []
  }
} 

// 获取大于当前版本的版本号
function getNpmSemverVersions (baseVersion, versions) {
  // 大于baseVersion
  return versions
    .filter(version => semver.satisfies(version, `^${baseVersion}`))
    .sort((a,b) => semver.gt(b,a))
}

// 处理结果
async function getNpmSemverVersion (baseVersion, npmName, registry) {
  const versions = await getNpmVersions(npmName, registry)
  const newVersions = getNpmSemverVersions(baseVersion, versions)
  if (newVersions && newVersions.length > 0) {
    return newVersions[newVersions.length - 1]
  }
  return null;
}

async function getNpmLatestVersion (npmName, registry) { // 获取最新的版本号
  let versions = await getNpmVersions(npmName, registry)
  if (versions) {
    versions = versions.sort((a,b) => semver.gt(b,a))
    return versions[versions.length - 1]
  } else {
    return null
  }
}

module.exports = {
  getNpmInfo,
  getNpmVersions,
  getNpmSemverVersion,
  getDefaultRegistry,
  getNpmLatestVersion
};
