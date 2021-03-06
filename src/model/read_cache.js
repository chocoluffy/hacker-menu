import LRU from 'lru-cache'
import path from 'path'
import fs from 'fs-plus'
import _ from 'lodash'

export default class ReadCache {
  constructor (folder, cacheSize, logger) {
    this.path = path.join(folder, 'Storage', 'db.json')
    this.cache = LRU({
      max: cacheSize
    })
    this.logger = logger

    setInterval(function () {
      this.store()
    }.bind(this), 1000 * 60 * 60) // every hour
  }

  load () {
    var result = {}
    try {
      result = JSON.parse(fs.readFileSync(this.path, 'utf8'))
    } catch (e) {
      if (e.code !== 'ENOENT') {
        this.logger.error('read-cache.error', { message: e.message, stack: e.stack })
      }
    }

    if (result['read']) {
      _.each(result['read'].reverse(), function (val) {
        this.set(val)
      }, this)
    }
  }

  store () {
    this.logger.info('read-cache.store')

    var result = []
    this.cache.forEach(function (value, key) {
      result.push(key)
    })
    fs.writeFileSync(this.path, JSON.stringify({ read: result }), 'utf8')
  }

  set (val) {
    return this.cache.set(val, val)
  }

  contains (val) {
    return this.cache.has(val)
  }
}
