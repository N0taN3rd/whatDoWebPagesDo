const CapturedRequest = require('./capturedRequest')
const CapturedWebSocket = require('./capturedWebSocket')

class RequestHandler {
  constructor (network, navMan) {
    /**
     * @desc Association Of RequestIds To CapturedRequests
     * @type {Map<string,CapturedRequest>}
     * @private
     */
    this._requests = new Map()
    /**
     * @type {Map<string,CapturedWebSocket>}
     * @private
     */
    this._ws = new Map()

    this._navMan = navMan
    this.requestWillBeSent = this.requestWillBeSent.bind(this)
    this.responseReceived = this.responseReceived.bind(this)
    this.loadingFinished = this.loadingFinished.bind(this)
    this.loadingFailed = this.loadingFailed.bind(this)
    this.webSocketCreated = this.webSocketCreated.bind(this)
    this.webSocketClosed = this.webSocketClosed.bind(this)
    network.requestWillBeSent(this.requestWillBeSent)
    network.responseReceived(this.responseReceived)
    network.loadingFinished(this.loadingFinished)
    network.loadingFailed(this.loadingFailed)
    network.webSocketCreated(this.webSocketCreated)
    network.webSocketClosed(this.webSocketClosed)
  }

  /**
   * @desc Sets an internal flag to begin capturing network requests. Clears Any Previously Captured Request Information
   */
  startCapturing (curURL) {
    this._requests.clear()
    this._ws.clear()
    this._capture = true
    this._curURL = curURL
  }

  /**
   * @desc Sets an internal flag to stop the capturing network requests
   */
  stopCapturing () {
    this._capture = false
  }

  /**
   * @desc Handles the Network.requestWillBeSent event
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Network/#event-requestWillBeSent
   * @param {Object} info
   */
  requestWillBeSent (info) {
    if (this._capture) {
      if (this._requests.has(info.requestId)) {
        this._requests.get(info.requestId).sent(info)
      } else {
        let cr = new CapturedRequest(this._curURL)
        cr.sent(info)
        this._requests.set(info.requestId, cr)
      }
      this._navMan.reqStarted(info)
    }
  }

  /**
   * @desc Handles the Network.responseReceived event
   * @see https://chromedevtools.github.io/devtools-protocol/tot/Network/#event-responseReceived
   * @param {Object} info
   */
  responseReceived (info) {
    if (this._capture) {
      if (this._requests.has(info.requestId)) {
        this._requests.get(info.requestId).recieved(info)
      } else {
        let cr = new CapturedRequest(this._curURL)
        cr.recieved(info)
        this._requests.set(info.requestId, cr)
      }
    }
  }

  loadingFinished (info) {
    if (this._capture) {
      if (this._requests.has(info.requestId)) {
        this._requests.get(info.requestId).loadingFinished(info)
      } else {
        let cr = new CapturedRequest(this._curURL)
        cr.loadingFinished(info)
        this._requests.set(info.requestId, cr)
      }
      this._navMan.reqFinished(info)
    }
  }

  loadingFailed (info) {
    if (this._capture) {
      if (this._requests.has(info.requestId)) {
        this._requests.get(info.requestId).loadingFailed(info)
      } else {
        let cr = new CapturedRequest(this._curURL)
        cr.loadingFailed(info)
        this._requests.set(info.requestId, cr)
      }
      this._navMan.reqFinished(info)
    }
  }

  webSocketCreated (info) {
    if (this._capture) {
      if (this._ws.has(info.requestId)) {
        this._ws.get(info.requestId).wsCreated(info)
      } else {
        let cws = new CapturedWebSocket(this._curURL)
        cws.wsCreated(info)
        this._ws.set(info.requestId, cws)
      }
      this._navMan.reqStarted(info)
    }
  }

  webSocketClosed (info) {
    if (this._capture) {
      if (this._ws.has(info.requestId)) {
        this._ws.get(info.requestId).wsClosed(info)
      } else {
        let cws = new CapturedWebSocket(this._curURL)
        cws.wsClosed(info)
        this._ws.set(info.requestId, cws)
      }
      this._navMan.reqFinished(info)
    }
  }

  toJSON () {
    return {
      requests: Array.from(this._requests.values()),
      webSockets: Array.from(this._ws.values())
    }
  }
}

module.exports = RequestHandler
