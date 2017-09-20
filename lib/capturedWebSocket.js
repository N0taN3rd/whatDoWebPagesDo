const microtime = require('microtime')

class CapturedWebSocket {
  constructor (curURL) {
    this._curURL = curURL
    this.type = 'ws'
    this.created = null
    this.closed = null
  }

  wsCreated (info) {
    info.time = {
      mnow: microtime.now()
    }
    if (this.created) {
      if (Array.isArray(this.created)) {
        this.created.push(info)
      } else {
        this.created = [this.created, info]
      }
    } else {
      this.created = info
    }
  }

  wsClosed (info) {
    info.time = {
      mnow: microtime.now()
    }
    if (this.closed) {
      if (Array.isArray(this.closed)) {
        this.closed.push(info)
      } else {
        this.closed = [this.closed, info]
      }
    } else {
      this.closed = info
    }
  }

  toJSON () {
    return {
      _curURL: this._curURL,
      type: this.type,
      created: this.created,
      closed: this.closed
    }
  }
}

module.exports = CapturedWebSocket
