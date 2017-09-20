const microtime = require('microtime')

class CapturedRequest {
  constructor (curURL) {
    this._curURL = curURL
    this.type = 'req'
    this.req = null
    this.res = null
    this.startTime = null
    this.loadingFinishInfo = null
    this.failedInfo = null
    this.requestId = null
  }

  sent (info) {
    info.time = {
      mnow: microtime.now()
    }
    if (!this.startTime) {
      this.startTime = info.timeStamp
    }
    if (!this.requestId) {
      this.requestId = info.requestId
    }
    if (this.req) {
      if (Array.isArray(this.req)) {
        this.req.push(info)
      } else {
        let oldReq = this.req
        this.req = [ oldReq, info ]
      }
    } else {
      this.req = info
    }
  }

  recieved (info) {
    info.time = {
      mnow: microtime.now()
    }
    if (this.res) {
      if (Array.isArray(this.res)) {
        this.res.push(info)
      } else {
        let oldRes = this.res
        this.res = [ oldRes, info ]
      }
    } else {
      this.res = info
    }
  }

  loadingFinished (info) {
    info.time = {
      mnow: microtime.now()
    }
    if (this.loadingFinishInfo) {
      if (Array.isArray(this.loadingFinishInfo)) {
        this.loadingFinishInfo.push(info)
      } else {
        let oldRes = this.loadingFinishInfo
        this.loadingFinishInfo = [ oldRes, info ]
      }
    } else {
      this.loadingFinishInfo = info
    }
    if (!this.requestId) {
      this.requestId = info.requestId
    }
  }

  loadingFailed (info) {
    info.time = {

      mnow: microtime.now()
    }
    if (this.failedInfo) {
      if (Array.isArray(this.failedInfo)) {
        this.failedInfo.push(info)
      } else {
        let oldRes = this.failedInfo
        this.failedInfo = [ oldRes, info ]
      }
    } else {
      this.failedInfo = info
    }
    if (!this.requestId) {
      this.requestId = info.requestId
    }
  }

  toJSON () {
    return {
      _curURL: this._curURL,
      type: this.type,
      requestId: this.requestId,
      req: this.req,
      res: this.res,
      startTime: this.startTime,
      loadingFinishInfo: this.loadingFinishInfo,
      failedInfo: this.failedInfo
    }
  }
}

module.exports = CapturedRequest
