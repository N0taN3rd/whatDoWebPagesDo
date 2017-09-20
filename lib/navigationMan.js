// const chalk = require('chalk')
const EventEmitter = require('eventemitter3')
const microtime = require('microtime')

class NavigationMan extends EventEmitter {
  constructor (parentEmitter) {
    super()
    this._timeout = 40000 // could be 30 seconds
    this._idleTime = 1000 // could be 1500 (1.5 seconds)
    this._idleInflight = 2 // could be 4
    this._finishedCount = 0
    this._requestIds = new Set()
    this._idleTimer = null
    this._navStarted = null
    this._navFinished = null
    this._doneTimers = false
    this._globalWaitTimer = null
    this._parentEmitter = parentEmitter
    this._networkIdled = this._networkIdled.bind(this)
    this._globalNetworkTimeout = this._globalNetworkTimeout.bind(this)
    this._didNavigate = this._didNavigate.bind(this)
    this._navTimedOut = this._navTimedOut.bind(this)
    this.reqFinished = this.reqFinished.bind(this)
    this.reqStarted = this.reqStarted.bind(this)
  }

  startedNav (curURL) {
    this._curURL = curURL
    this._finishedCount = 0
    this._navStarted = {mnow: microtime.now(), _curURL: this._curURL}
    this._navFinished = null
    this._doneTimers = false
    this._navTimeout = setTimeout(this._navTimedOut, 8000)
    this._globalWaitTimer = setTimeout(this._globalNetworkTimeout, this._timeout)
  }

  reqStarted (info) {
    if (!this._doneTimers) {
      // console.log(chalk.green(`req started ${this._requestIds.size}`))
      this._requestIds.add(info.requestId)
      if (this._requestIds.size > this._idleInflight) {
        // console.log(chalk.red(`clearing idle timer ${this._requestIds.size}`))
        clearTimeout(this._idleTimer)
        this._idleTimer = null
      }
    }
  }

  reqFinished (info) {
    if (!this._doneTimers) {
      this._requestIds.delete(info.requestId)
      if (this._requestIds.size <= this._idleInflight && !this._idleTimer) {
        // console.log(chalk.green(`setting idle timeout ${this._requestIds.size}`))
        this._idleTimer = setTimeout(this._networkIdled, this._idleTime)
      }
      this._finishedCount += 1
    }
  }

  toJSON () {
    return {
      navStarted: this._navStarted,
      navFinished: this._navFinished,
      requestsFinished: this._finishedCount
    }
  }

  _navTimedOut () {
    if (this._navTimeout) {
      clearTimeout(this._navTimeout)
      this._navTimeout = null
    }
    this._emitEvent('navigation-timedout')
  }

  _didNavigate () {
    this._navFinished = {mnow: microtime.now(), _curURL: this._curURL}
    if (this._navTimeout) {
      clearTimeout(this._navTimeout)
      this._navTimeout = null
    }
    this._emitEvent('navigated')
  }

  _globalNetworkTimeout () {
    if (!this._doneTimers) {
      this._doneTimers = true
    }
    if (this._globalWaitTimer) {
      clearTimeout(this._globalWaitTimer)
      this._globalWaitTimer = null
    }
    if (this._idleTimer) {
      clearTimeout(this._idleTimer)
      this._idleTimer = null
    }
    this._emitEvent('network-idle')
  }

  _networkIdled () {
    if (!this._doneTimers) {
      this._doneTimers = true
    }
    if (this._globalWaitTimer) {
      clearTimeout(this._globalWaitTimer)
      this._globalWaitTimer = null
    }
    if (this._idleTimer) {
      clearTimeout(this._idleTimer)
      this._idleTimer = null
    }
    this._emitEvent('network-idle')
  }

  _emitEvent (event) {
    if (this._parentEmitter) {
      this._parentEmitter.emit(event)
    } else {
      this.emit(event)
    }
  }
}

module.exports = NavigationMan
