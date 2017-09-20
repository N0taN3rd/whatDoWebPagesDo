const EventEmitter = require('eventemitter3')
const filName = require('filenamify-url')
const Promise = require('bluebird')
const fs = require('fs-extra')
const Launcher = require('./launcher')
const NavMan = require('./navigationMan')
const RequestHandler = require('./requestHandler')
const DomWatcher = require('./domWatcher')
const PageWatcher = require('./pageWatcher')
const DebuggerWatcher = require('./debugWatcher')
const ServiceWorkerWatcher = require('./serviceWorkerWatcher')
const { noNaughtyJs, noNaughtyJS2, winLocAddedEnv } = require('./pageEvals')

class LiveWebCrawler extends EventEmitter {
  constructor () {
    super()
    this._client = null
    this._reqHandler = null
    this._domWatcher = null
    this._navMan = new NavMan(this)
    this._navd = this._navd.bind(this)
    this._navTO = this._navTO.bind(this)
    this._netIdle = this._netIdle.bind(this)
    this.close = this.close.bind(this)
    // this._navMan.on('network-idle', this._netIdle)
    // this._navMan.on('navigation-timedout', this._navTO)
    // this._navMan.on('navigated', this._navd)
  }

  static getProtocolDef (options) {
    return Launcher.getProtocolDef(options)
  }

  static withAutoClose () {
    return new LiveWebCrawler()._enableAutoClose()
  }

  async stop () {
    this.netStop()
    await this._client.Page.stopLoading()
  }

  _enableAutoClose () {
    if (!this._autoClose) {
      process.on('exit', this.close)
    }
    this._autoClose = true
    return this
  }

  takeScreenShot (opts) {
    return this._client.Page.captureScreenshot(opts)
  }

  async init (lopts) {
    this._client = await Launcher.launch(lopts)
    await this._client.Animation.setPlaybackRate({ playbackRate: 1000 })
    await this._client.Runtime.enable()
    await this._client.Debugger.enable()
    await this._client.DOM.enable()
    // await this._client.CSS.enable()
    await this._client.Page.enable()
    await this._client.Network.enable()
    await this._client.ServiceWorker.enable()
    if (await this._client.Network.canClearBrowserCache()) {
      await this._client.Network.clearBrowserCache()
    }
    await this._client.Emulation.setDeviceMetricsOverride({
      width: 2000,
      height: 2000,
      screenWidth: 2000,
      screenHeight: 2000,
      deviceScaleFactor: 1.0,
      mobile: false,
      fitWindow: false
    })
    await this._client.Emulation.setVisibleSize({
      width: 2000,
      height: 2000
    })
    await this._client.Network.setCacheDisabled({ cacheDisabled: true })
    await this._client.Network.setBypassServiceWorker({ bypass: true })
    await this._client.Target.setDiscoverTargets({ discover: true })
    await this._client.Target.setAttachToFrames({ value: true })
    await this._client.Target.setAutoAttach({ autoAttach: true, waitForDebuggerOnStart: false })
    await this._client.Page.setAutoAttachToCreatedPages({ autoAttach: true })
    await this._client.Page.addScriptToEvaluateOnLoad(noNaughtyJS2)
    this._noNaughtyId = await this._client.Page.addScriptToEvaluateOnNewDocument(noNaughtyJs)
    this._reqHandler = new RequestHandler(this._client.Network, this._navMan)
    this._domWatcher = new DomWatcher(this._client.DOM, this._client.DOMDebugger)
    this._pageWatcher = new PageWatcher(this._client.Page)
    this._debugWatcher = new DebuggerWatcher(this._client.Debugger)
    this._sw = new ServiceWorkerWatcher(this._client.ServiceWorker)
    process.on('exit', () => {
      this.close()
    })
    await Promise.delay(5000)
  }

  async getExtraInfo () {
    try {
      await this._domWatcher.extractEventListeners(this._client.Runtime)
    } catch (error) {
      console.error('count listeners', error)
    }

    try {
      await this._domWatcher.getDomSnapShot(this._client.DOMSnapshot)
    } catch (error) {
      console.error('dom snapshot', error)
    }

    try {
      await this._pageWatcher.getResourceTree()
    } catch (error) {
      console.error('page getResourceTree', error)
    }
    let wasError = false
    let evaled
    try {
      evaled = await this._client.Runtime.evaluate(winLocAddedEnv)
    } catch (error) {
      wasError = true
    }
    if (!wasError) {
      if (evaled.result && evaled.result.value) {
        this._windowLocation = evaled.result.value.location
        this._pageAddedEnv = evaled.result.value.addedEnvKeys
      }
    }
    try {
      this.domCounters = await this._client.Memory.getDOMCounters()
    } catch (error) {
      this.domCounters = {}
    }
  }

  goto (url) {
    this.url = url
    this._windowLocation = null
    this._pageAddedEnv = null
    this._reqHandler.startCapturing(url)
    this._domWatcher.start(url)
    this._pageWatcher.start(url)
    this._debugWatcher.start(url)
    this._sw.start(url)
    this._client.Page.navigate({ url }, this._navMan._didNavigate)
    this._navMan.startedNav(url)
  }

  get reqHandler () {
    return this._reqHandler
  }

  netStart () {
    this._reqHandler.startCapturing()
  }

  netStop () {
    this._reqHandler.stopCapturing()
  }

  navManOn (event, handler) {
    this._navMan.on(event, handler)
  }

  close () {
    if (this._client) {
      this._client.close()
    }
  }

  toJSON () {
    return {
      url: this.url,
      windowLocation: this._windowLocation,
      pageAddedEnv: this._pageAddedEnv,
      requests: this._reqHandler,
      dom: this._domWatcher,
      page: this._pageWatcher,
      navigation: this._navMan,
      parsedScripts: this._debugWatcher,
      serviceWorker: this._sw,
      noNaughtyId: this._noNaughtyId,
      domCounters: this.domCounters
    }
  }

  _netIdle () {
    this.emit('network-idle')
  }

  _navTO () {
    this.emit('navigation-timedout')
  }

  _navd () {
    this.emit('navigated')
  }
}

module.exports = LiveWebCrawler
