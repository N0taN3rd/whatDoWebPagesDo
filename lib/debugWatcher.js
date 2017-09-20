const microtime = require('microtime')

class DebugWatcher {
  constructor (Debugger) {
    this._debugger = Debugger
    this._parsedScripts = []
    this._failedParsedScripts = []
    this._onParsedScript = this._onParsedScript.bind(this)
    this._onFailedParsedScript = this._onFailedParsedScript.bind(this)
    this._debugger.scriptParsed(this._onParsedScript)
    this._debugger.scriptFailedToParse(this._onFailedParsedScript)
  }

  start (curURL) {
    this._curURL = curURL
    this._parsedScripts = []
    this._failedParsedScripts = []
  }

  toJSON () {
    return {
      parsedScripts: this._parsedScripts,
      failedParsedScripts: this._failedParsedScripts
    }
  }

  _onParsedScript (obj) {
    obj.time = { mnow: microtime.now()}
    obj._curURL = this._curURL
    this._parsedScripts.push(obj)
  }

  _onFailedParsedScript (obj) {
    obj.time = { mnow: microtime.now()}
    obj._curURL = this._curURL
    this._failedParsedScripts.push(obj)
  }
}

module.exports = DebugWatcher
