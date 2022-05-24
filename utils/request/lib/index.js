'use strict';
// 请求配置
const axios = require('axios');

const BASE_URL = process.env.BASE_URL ? process.env.BASE_URL : 'http://cetc-cli:7001'

const request = axios.create({
  baseURL: BASE_URL,
  timeout: 5000,
})

request.interceptors.response.use(
  response => {
    return response.data
  },
  error => {
    return Promise.reject(error)
  }
)

module.exports = request;