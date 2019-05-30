import { install } from './codeview'

window.$docsify = window.$docsify || {}

window.$docsify.plugins = [install].concat(window.$docsify.plugins || [])
