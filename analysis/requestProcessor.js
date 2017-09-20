const setCookieParser = require('set-cookie-parser')
const _ = require('lodash')
const {URL} = require('url')

const KEYS = {
  totalCount: 'totalCount',
  breakDown: 'breakDown'
}

class RequestProcessor {
  static newOne () {
    const rp = new RequestProcessor()
    rp.init()
    return rp
  }

  init () {
    this.timings = []
    this.xRequestWith = {request: new Set(), response: new Set()}
    this.resFromSWCount = 0
    this.webSocketCount = 0
    this.initiatorCount = {}
    this.statusCount = {}
    this.mimeCount = {}
    this.protocolCount = {}
    this.documentReqCount = {[KEYS.totalCount]: 0}
    this.reqChainCount = {}
    this.methodCount = {}
    this.frameReqCount = {}
    this.reqTypeCount = {}
    this.resTypeCount = {}
    this.cookieCount = {}
    this.xHeadCount = {}
    this.requestOriginCount = {}
    this.requestToHostCount = {}
    if (this._urlParser) {
      this._urlParser.href = 'about:blank'
    } else {
      this._urlParser = new URL('about:blank')
    }
  }

  process ({requests}) {
    if (requests) {
      this.processRequests(requests)
    }
  }

  _processARequest (reqObj, aReqTime) {
    // console.log(reqObj)
    if (reqObj.type !== undefined) {
      if (this.reqTypeCount[reqObj.type] === undefined) {
        this.reqTypeCount[reqObj.type] = 0
      }
      this.reqTypeCount[reqObj.type] += 1
    }
    if (reqObj.request && reqObj.request.url !== undefined) {
      try {
        this._urlParser.href = reqObj.request.url
        // console.log(this._urlParser)
        let o = this._urlParser.origin
        if (this.requestOriginCount[o] === undefined) {
          this.requestOriginCount[o] = 0
        }
        this.requestOriginCount[o] += 1
        let h = this._urlParser.host
        if (this.requestToHostCount[h] === undefined) {
          this.requestToHostCount[h] = 0
        }
        this.requestToHostCount[h] += 1
      } catch (error) {

      }
    }
    if (this.initiatorCount[reqObj.initiator.type] === undefined) {
      this.initiatorCount[reqObj.initiator.type] = 0
    }
    this.initiatorCount[reqObj.initiator.type] += 1
    this.documentReqCount[KEYS.totalCount] += 1
    let du
    if (reqObj.documentURL !== ':') {
      try {
        this._urlParser.href = reqObj.documentURL
        du = this._urlParser.host
        if (du === '') {
          du = this._urlParser.hostname
        }
      } catch (error) {
        du = reqObj.documentURL
      }
      if (this.documentReqCount[du] === undefined) {
        this.documentReqCount[du] = 0
      }
      this.documentReqCount[du] += 1
    }
    if (this.frameReqCount[reqObj.frameId] === undefined) {
      this.frameReqCount[reqObj.frameId] = 0
    }
    this.frameReqCount[reqObj.frameId] += 1
    if (reqObj.request && reqObj.request.method) {
      if (this.methodCount[reqObj.request.method] === undefined) {
        this.methodCount[reqObj.request.method] = 0
      }
      if (reqObj.request.method === '') {
        // it had to get here somehow so just treat it like get
        reqObj.request.method = 'GET'
      }
      this.methodCount[reqObj.request.method] += 1
    } else {
      // it had to get here somehow so just treat it like get
      this.methodCount['GET'] += 1
    }
    aReqTime.reqResTime.push({
      type: 'req',
      mnow: reqObj.time.mnow
    })
  }

  _parseCookies (cookString, where) {
    let wasError = false
    let i
    let len
    let ar
    let cookie
    let id
    try {
      i = 0
      ar = setCookieParser(cookString)
      len = ar.length
      while (i < len) {
        cookie = ar[i]
        id = `${where}-${cookie.httpOnly ? 'httpOnly' : 'httpJs'}`
        if (this.cookieCount[id] === undefined) {
          this.cookieCount[id] = 0
        }
        this.cookieCount[id] += 1
        i++
      }
    } catch (error) {
      wasError = true
    }
    if (wasError) {
      try {
        i = 0
        ar = setCookieParser(cookString.split('\r\n'))
        len = ar.length
        while (i < len) {
          cookie = ar[i]
          id = `${where}-${cookie.httpOnly ? 'httpOnly' : 'httpJs'}`
          if (this.cookieCount[id] === undefined) {
            this.cookieCount[id] = 0
          }
          this.cookieCount[id] += 1
          i++
        }
      } catch (error) {

      }
    }
  }

  _handleXReq (k, v, where) {
    if (this.xHeadCount[k] === undefined) {
      this.xHeadCount[k] = 0
    }
    this.xHeadCount[k] += 1
    if (k === 'x-request-with') {
      this.xRequestWith[where].add(v)
    }
  }

  _processRedirect (redirect, aReqTime) {
    if (redirect.url) {
      try {
        this._urlParser.href = redirect.url
        // console.log(this._urlParser)
        let o = this._urlParser.origin
        if (this.requestOriginCount[o] === undefined) {
          this.requestOriginCount[o] = 0
        }
        this.requestOriginCount[o] += 1
        let h = this._urlParser.host
        if (this.requestToHostCount[h] === undefined) {
          this.requestToHostCount[h] = 0
        }
        this.requestToHostCount[h] += 1
      } catch (error) {

      }
    }
    let kk
    let lowerProto
    if (redirect.protocol) {
      lowerProto = redirect.protocol.toLowerCase()
      if (this.protocolCount[lowerProto] === undefined) {
        this.protocolCount[lowerProto] = 0
      }
      this.protocolCount[lowerProto] += 1
    } else {
      if (redirect.headersText) {
        lowerProto = redirect.headersText.split(' ')[0].toLowerCase()
        if (this.protocolCount[lowerProto] === undefined) {
          this.protocolCount[lowerProto] = 0
        }
        this.protocolCount[lowerProto] += 1
      } else if (redirect.requestHeadersText) {
        lowerProto = redirect.requestHeadersText.split('\r\n')[0].split(' ')[2].toLowerCase()
        if (this.protocolCount[lowerProto] === undefined) {
          this.protocolCount[lowerProto] = 0
        }
        this.protocolCount[lowerProto] += 1
      } else {
        if (this.protocolCount['http/1.1'] === undefined) {
          this.protocolCount['http/1.1'] = 0
        }
        this.protocolCount['http/1.1'] += 1
      }
    }
    if (this.statusCount[redirect.status] === undefined) {
      this.statusCount[redirect.status] = 0
    }
    this.statusCount[redirect.status] += 1
    this._methodFromRequestHeaders(redirect.requestHeaders, redirect.requestHeadersText)
    if (redirect.headers) {
      for (let k in redirect.headers) {
        kk = k.toLowerCase()
        if (kk[0] === 'x') {
          this._handleXReq(kk, redirect.headers[k], 'response')
        } else if (kk === 'set-cookie') {
          this._parseCookies(redirect.headers[k], 'response')
        }
      }
    } else if (redirect.headersText) {
      let headArray = redirect.headersText.split('\r\n')
      let len = headArray.length - 2
      let i = 1
      let headSplit
      let k
      for (; i < len; ++i) {
        headSplit = headArray[i].split(': ')
        k = headSplit[0]
        kk = k.toLowerCase()
        if (kk[0] === 'x') {
          this._handleXReq(kk, headSplit[1], 'response')
        } else if (kk === 'set-cookie') {
          this._parseCookies(headSplit[1], 'response')
        }
      }
    }

    if (redirect.requestHeaders) {
      for (let k in redirect.requestHeaders) {
        kk = k.toLowerCase()
        if (kk[0] === 'x') {
          this._handleXReq(kk, redirect.requestHeaders[k], 'request')
        } else if (kk === 'set-cookie') {
          this._parseCookies(redirect.requestHeaders[k], 'request')
        }
      }
    } else if (redirect.requestHeadersText) {
      let headArray = redirect.requestHeadersText.split('\r\n')
      let len = headArray.length - 2
      let i = 1
      let headSplit
      let k
      for (; i < len; ++i) {
        headSplit = headArray[i].split(': ')
        k = headSplit[0]
        kk = k.toLowerCase()
        if (kk[0] === 'x') {
          this._handleXReq(kk, headSplit[1], 'request')
        } else if (kk === 'set-cookie') {
          this._parseCookies(headSplit[1], 'request')
        }
      }
    }

    if (redirect.fromServiceWorker) {
      this.resFromSWCount += 1
    }
  }

  _methodFromRequestHeaders (headers, headersText) {
    let method
    if (headers && headers[':method']) {
      method = headers[':method'].toUpperCase()
      if (method && method !== '') {
        if (this.methodCount[method] === undefined) {
          this.methodCount[method] = 0
        }
        this.methodCount[method] += 1
        return
      }
      method = undefined
    }

    if (headersText) {
      let httpString = headersText.substr(0, headersText.indexOf('\r\n'))
      if (httpString && httpString !== '') {
        method = httpString.split(' ')[0].toUpperCase()
        if (this.methodCount[method] === undefined) {
          this.methodCount[method] = 0
        }
        this.methodCount[method] += 1
        return
      }
    }
    method = 'GET'
    if (this.methodCount[method] === undefined) {
      this.methodCount[method] = 0
    }
    this.methodCount[method] += 1
  }

  _processRes (res, aReqTime) {
    // console.log(res)
    let kk
    let lowerProto
    if (this.resTypeCount[res.type] === undefined) {
      this.resTypeCount[res.type] = 0
    }
    this.resTypeCount[res.type] += 1
    if (res.response.protocol) {
      lowerProto = res.response.protocol.toLowerCase()
      if (this.protocolCount[lowerProto] === undefined) {
        this.protocolCount[lowerProto] = 0
      }
      this.protocolCount[lowerProto] += 1
    } else {
      if (res.response.headersText) {
        lowerProto = res.response.headersText.split(' ')[0].toLowerCase()
        if (this.protocolCount[lowerProto] === undefined) {
          this.protocolCount[lowerProto] = 0
        }
        this.protocolCount[lowerProto] += 1
      } else if (res.response.requestHeadersText) {
        lowerProto = res.response.requestHeadersText.split('\r\n')[0].split(' ')[2].toLowerCase()
        if (this.protocolCount[lowerProto] === undefined) {
          this.protocolCount[lowerProto] = 0
        }
        this.protocolCount[lowerProto] += 1
      } else {
        if (this.protocolCount['http/1.1'] === undefined) {
          this.protocolCount['http/1.1'] = 0
        }
        this.protocolCount['http/1.1'] += 1
      }
    }
    if (this.statusCount[res.response.status] === undefined) {
      this.statusCount[res.response.status] = 0
    }
    this.statusCount[res.response.status] += 1
    if (this.mimeCount[res.response.mimeType] === undefined) {
      this.mimeCount[res.response.mimeType] = 0
    }
    this.mimeCount[res.response.mimeType] += 1
    if (this.frameReqCount[res.frameId] === undefined) {
      this.frameReqCount[res.frameId] = 0
    }
    this.frameReqCount[res.frameId] += 1
    if (res.response.headers) {
      for (let k in res.response.headers) {
        kk = k.toLowerCase()
        if (kk[0] === 'x') {
          this._handleXReq(kk, res.response.headers[k], 'response')
        } else if (kk === 'set-cookie') {
          this._parseCookies(res.response.headers[k], 'response')
        }
      }
    } else if (res.response.headersText) {
      let headArray = res.response.headersText.split('\r\n')
      let len = headArray.length - 2
      let i = 1
      let headSplit
      let k
      while (i < len) {
        headSplit = headArray[i].split(': ')
        k = headSplit[0]
        kk = k.toLowerCase()
        if (kk[0] === 'x') {
          this._handleXReq(kk, headSplit[1], 'response')
        } else if (kk === 'set-cookie') {
          this._parseCookies(headSplit[1], 'response')
        }
        i++
      }
    }
    if (res.response.requestHeaders) {
      for (let k in res.response.requestHeaders) {
        kk = k.toLowerCase()
        if (kk[0] === 'x') {
          this._handleXReq(kk, res.response.requestHeaders[k], 'request')
        } else if (kk === 'set-cookie') {
          this._parseCookies(res.response.requestHeaders[k], 'request')
        }
      }
    } else if (res.response.requestHeadersText) {
      let headArray = res.response.requestHeaders.split('\r\n')
      let len = headArray.length - 2
      let i = 1
      let headSplit
      let k
      while (i < len) {
        headSplit = headArray[i].split(': ')
        k = headSplit[0]
        kk = k.toLowerCase()
        if (kk[0] === 'x') {
          this._handleXReq(kk, headSplit[1], 'request')
        } else if (kk === 'set-cookie') {
          this._parseCookies(headSplit[1], 'request')
        }
        i++
      }
    }
    if (res.response.fromServiceWorker) {
      this.resFromSWCount += 1
    }
    aReqTime.reqResTime.push({
      type: 'res',
      mnow: res.time.mnow
    })
  }

  processRequests ({requests, webSockets}) {
    let len = requests.length
    let i = 0
    let j = 0
    let len2
    if (len > 0) {
      let reqObj
      let resObj
      while (i < len) {
        let aReqTime = {reqResTime: []}
        if (requests[i].loadingFinishInfo) {
          aReqTime.loadingFinishInfo = {
            timestamp: requests[i].loadingFinishInfo.timestamp
          }
          if (requests[i].loadingFinishInfo.time) {
            aReqTime.loadingFinishInfo.mnow = requests[i].loadingFinishInfo.time.mnow
          }
        }
        if (requests[i].failedInfo) {
          aReqTime.loadingFinishInfo = {
            timestamp: requests[i].failedInfo.timestamp
          }
          if (requests[i].failedInfo.time) {
            aReqTime.loadingFinishInfo.mnow = requests[i].failedInfo.time.mnow
          }
        }
        reqObj = requests[i].req
        resObj = requests[i].res
        if (reqObj !== null && reqObj !== undefined) {
          if (Array.isArray(reqObj)) {
            len2 = reqObj.length
            j = 0
            while (j < len2) {
              if (this.reqChainCount[requests[i].requestId] === undefined) {
                this.reqChainCount[requests[i].requestId] = 0
              }
              this.reqChainCount[requests[i].requestId] += 1
              this._processARequest(reqObj[j], aReqTime)
              if (reqObj[j].redirectResponse) {
                if (this.reqChainCount[requests[i].requestId] === undefined) {
                  this.reqChainCount[requests[i].requestId] = 0
                }
                this.reqChainCount[requests[i].requestId] += 1
                this._processRedirect(reqObj[j].redirectResponse, aReqTime)
              }
              j++
            }
          } else {
            if (this.reqChainCount[requests[i].requestId] === undefined) {
              this.reqChainCount[requests[i].requestId] = 0
            }
            this.reqChainCount[requests[i].requestId] += 1
            this._processARequest(reqObj, aReqTime)
            if (reqObj.redirectResponse) {
              if (this.reqChainCount[requests[i].requestId] === undefined) {
                this.reqChainCount[requests[i].requestId] = 0
              }
              this.reqChainCount[requests[i].requestId] += 1
              this._processRedirect(reqObj.redirectResponse, aReqTime)
            }
          }
        }
        if (resObj !== null && resObj !== undefined) {
          if (Array.isArray(resObj)) {
            len2 = resObj.length
            j = 0
            while (j < len2) {
              if (this.reqChainCount[requests[i].requestId] === undefined) {
                this.reqChainCount[requests[i].requestId] = 0
              }
              this.reqChainCount[requests[i].requestId] += 1
              this._processRes(resObj[j], aReqTime)
              j++
            }
          } else {
            if (this.reqChainCount[requests[i].requestId] === undefined) {
              this.reqChainCount[requests[i].requestId] = 0
            }
            this.reqChainCount[requests[i].requestId] += 1
            this._processRes(resObj, aReqTime)
          }
        }
        this.timings.push(aReqTime)
        i++
      }
    }

    i = 0
    len = webSockets.length
    while (i < len) {
      if (webSockets[i].created && webSockets[i].created.initiator) {
        if (this.initiatorCount[webSockets[i].created.initiator.type] === undefined) {
          this.initiatorCount[webSockets[i].created.initiator.type] = 0
        }
        this.initiatorCount[webSockets[i].created.initiator.type] += 1
      }
      this.webSocketCount += 1
      i++
    }
  }

  report () {
    console.log(this.methodCount)
  }

  toJSON () {
    this.xRequestWith.request = Array.from(this.xRequestWith.request)
    this.xRequestWith.response = Array.from(this.xRequestWith.response)
    return {
      cookieCount: this.cookieCount,
      documentReqCount: this.documentReqCount,
      frameReqCount: this.frameReqCount,
      initiatorCount: this.initiatorCount,
      methodCount: this.methodCount,
      mimeCount: this.mimeCount,
      protocolCount: this.protocolCount,
      reqChainCount: this.reqChainCount,
      reqTypeCount: this.reqTypeCount,
      resTypeCount: this.resTypeCount,
      resFromSWCount: this.resFromSWCount,
      statusCount: this.statusCount,
      webSocketCount: this.webSocketCount,
      xHeadCount: this.xHeadCount,
      xRequestWith: this.xRequestWith,
      requestOriginCount: this.requestOriginCount,
      requestToHostCount: this.requestToHostCount
    }
  }

  reportObject () {
    return this.toJSON()
  }
}

module.exports = RequestProcessor
