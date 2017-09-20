const {URL} = require('url')
const isURL = require('validator/lib/isURL')
const _ = require('lodash')

class ParsedScriptProcessor {
  static newOne () {
    const psp = new ParsedScriptProcessor()
    psp.init()
    return psp
  }

  init () {
    this.scriptTime = {parsed: [], failed: []}
    this.parsedScriptInfo = {total: 0, sameDomain: 0, offDomain: 0, inlineOrEval: 0}
    this.failedScriptInfo = {total: 0, sameDomain: 0, offDomain: 0, inlineOrEval: 0}
    this.byHost = {}
    this.byFrame = {}
    if (!this._urlParser) {
      this._urlParser = new URL('about:blank')
    } else {
      this._urlParser.href = 'about:blank'
    }
  }

  process (ps, curUrl) {
    let {parsedScripts, failedParsedScripts} = ps
    let i = 0
    let len = parsedScripts.length
    let aScript
    let useHost
    this.parsedScriptInfo.total += parsedScripts.length
    this.failedScriptInfo.total += failedParsedScripts.length
    while (i < len) {
      aScript = parsedScripts[i]
      this.scriptTime.parsed.push(aScript.time)
      if (aScript.url && isURL(aScript.url)) {
        try {
          this._urlParser.href = aScript.url
        } catch (error) {
          this.parsedScriptInfo.inlineOrEval += 1
          if (this.byFrame[aScript.executionContextAuxData.frameId] === undefined) {
            this.byFrame[aScript.executionContextAuxData.frameId] = 0
          }
          this.byFrame[aScript.executionContextAuxData.frameId] += 1
        }
        if (this._urlParser.hostname === '') {
          useHost = this._urlParser.host
        } else {
          useHost = this._urlParser.hostname
        }
        if (useHost !== '' && this._urlParser.protocol !== 'extensions:') {
          if (!this.byHost[useHost]) {
            this.byHost[useHost] = {parsed: 0, failed: 0}
          }
          this.byHost[useHost].parsed += 1
          if (curUrl.hostname === useHost) {
            this.parsedScriptInfo.sameDomain += 1
          } else {
            this.parsedScriptInfo.offDomain += 1
          }
          if (this.byFrame[aScript.executionContextAuxData.frameId] === undefined) {
            this.byFrame[aScript.executionContextAuxData.frameId] = 0
          }
          this.byFrame[aScript.executionContextAuxData.frameId] += 1
        }
      } else {
        this.parsedScriptInfo.inlineOrEval += 1
        if (this.byFrame[aScript.executionContextAuxData.frameId] === undefined) {
          this.byFrame[aScript.executionContextAuxData.frameId] = 0
        }
        this.byFrame[aScript.executionContextAuxData.frameId] += 1
      }
      i++
    }
    i = 0
    len = failedParsedScripts.length
    while (i < len) {
      aScript = failedParsedScripts[i]
      this.scriptTime.failed.push(aScript.time)
      if (aScript.url) {
        this._urlParser.href = aScript.url
        if (this._urlParser.hostname === '') {
          useHost = this._urlParser.host
        } else {
          useHost = this._urlParser.hostname
        }
        if (useHost !== '' && this._urlParser.protocol !== 'extensions:') {
          if (!this.byHost[useHost]) {
            this.byHost[useHost] = {parsed: 0, failed: 0}
          }
          this.byHost[useHost].failed += 1
          if (this.byFrame[aScript.executionContextAuxData.frameId] === undefined) {
            this.byFrame[aScript.executionContextAuxData.frameId] = 0
          }
          this.byFrame[aScript.executionContextAuxData.frameId] += 1
          if (curUrl.hostname === useHost || curUrl.host === useHost) {
            this.failedScriptInfo.sameDomain += 1
          } else {
            this.failedScriptInfo.offDomain += 1
          }
        }
      } else {
        if (this.byFrame[aScript.executionContextAuxData.frameId] === undefined) {
          this.byFrame[aScript.executionContextAuxData.frameId] = 0
        }
        this.byFrame[aScript.executionContextAuxData.frameId] += 1
        this.failedScriptInfo.inlineOrEval += 1
      }
      i++
    }
  }

  report () {
    console.log(this)
  }

  toJSON () {
    return {
      parsedScriptInfo: this.parsedScriptInfo,
      failedScriptInfo: this.failedScriptInfo,
      byHost: this.byHost,
      byFrame: this.byFrame
    }
  }
}

module.exports = ParsedScriptProcessor
