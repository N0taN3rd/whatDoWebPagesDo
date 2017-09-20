const microtime = require('microtime')

class PageWatcher {
  constructor (page) {
    this._page = page
    this._domContentEventFired = null
    this._loadEventFired = null
    this._resTree = null
    this._frames = []
    this._frameNav = []
    this._onDomContentEventFired = this._onDomContentEventFired.bind(this)
    this._onLoadEventFired = this._onLoadEventFired.bind(this)
    this._onFrameAttached = this._onFrameAttached.bind(this)
    this._onFrameNav = this._onFrameNav.bind(this)
    this._page.domContentEventFired(this._onDomContentEventFired)
    this._page.loadEventFired(this._onLoadEventFired)
    this._page.frameAttached(this._onFrameAttached)
    this._page.frameNavigated(this._onFrameNav)
  }

  start (curURL) {
    this._curURL = curURL
    this._domContentEventFired = null
    this._loadEventFired = null
    this._resTree = null
    this._frames = []
    this._frameNav = []
  }

  getResourceTree () {
    return this._page.getResourceTree().then((resTree) => {
      this._resTree = resTree
      return resTree
    })
  }

  toJSON () {
    return {
      _curURL: this._curURL,
      frames: this._frames,
      frameNav: this._frameNav,
      resTree: this._resTree,
      domContentEventFired: this._domContentEventFired,
      loadEventFired: this._loadEventFired
    }
  }

  _onFrameAttached (obj) {
    this._frames.push(Object.assign({ time: { mnow: microtime.now() } }, obj))
  }

  _onFrameNav (frame) {
    this._frameNav.push({
      frame,
      time: { mnow: microtime.now() }
    })
  }

  _onDomContentEventFired (timestamp) {
    if (this._domContentEventFired) {
      let odcef = this._domContentEventFired
      this._domContentEventFired = [ odcef, {
        timestamp,
        time: { mnow: microtime.now() }
      } ]
    } else {
      this._domContentEventFired = {
        timestamp,
        time: { mnow: microtime.now() }
      }
    }
  }

  _onLoadEventFired (timestamp) {
    if (this._loadEventFired) {
      let olef = this._loadEventFired
      this._loadEventFired = [ olef, {
        timestamp,
        time: { mnow: microtime.now() }
      } ]
    } else {
      this._loadEventFired = {
        timestamp,
        time: { mnow: microtime.now() }
      }
    }
  }
}

module.exports = PageWatcher
