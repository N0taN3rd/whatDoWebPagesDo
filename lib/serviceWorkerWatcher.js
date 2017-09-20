const microtime = require('microtime')

class ServiceWorkerWatcher {
  constructor (sw) {
    this._sw = sw
    this._registrationUpdates = []
    this._versionUpdates = []
    this._errors = []
    this._onErrorReported = this._onErrorReported.bind(this)
    this._onRegUpdate = this._onRegUpdate.bind(this)
    this._onVersionUpdate = this._onVersionUpdate.bind(this)
    this._sw.workerRegistrationUpdated(this._onRegUpdate)
    this._sw.workerVersionUpdated(this._onVersionUpdate)
    this._sw.workerErrorReported(this._onErrorReported)
  }

  start (curUrl) {
    this._registrationUpdates = []
    this._versionUpdates = []
    this._errors = []
    this._curURL = curUrl
  }

  _onRegUpdate (info) {
    info.time = {
      mnow: microtime.now()
    }
    info._curURL = this._curURL
    this._registrationUpdates.push(info)
  }

  _onVersionUpdate (info) {
    info.time = {
      mnow: microtime.now()
    }
    info._curURL = this._curURL
    this._versionUpdates.push(info)
  }

  _onErrorReported (info) {
    info.time = {
      mnow: microtime.now
    }
    info._curURL = this._curURL
    this._errors.push(info)
  }

  toJSON () {
    return {
      registrationUpdates: this._versionUpdates,
      versionUpdates: this._versionUpdates,
      errors: this._errors
    }
  }
}

module.exports = ServiceWorkerWatcher
