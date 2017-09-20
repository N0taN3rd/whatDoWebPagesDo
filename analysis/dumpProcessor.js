const isURL = require('validator/lib/isURL')
const {URL} = require('url')
const RequestProcessor = require('./requestProcessor')
const DomProcessor = require('./domProcessor')
const ParsedScriptProcessor = require('./parsedScriptProcessor')
const PageProcessor = require('./pageProcessor')
const SWProcessor = require('./swProcessor')
const EnvProcessor = require('./envProcessor')
const _ = require('lodash')

class DumpProcessor {
  constructor (apps) {
    this._apps = apps
  }

  static newOne (apps) {
    return new DumpProcessor(apps)
  }

  init () {
    if (!this.first) {
      this.first = true
      this.requestProcessor = RequestProcessor.newOne()
      this.domProcessor = DomProcessor.newOne()
      this.parsedScriptProcessor = ParsedScriptProcessor.newOne()
      this.pageProcessor = PageProcessor.newOne()
      this.serviceWorkerProcessor = SWProcessor.newOne()
      this.envProcessor = EnvProcessor.newOne(this._apps)
    } else {
      this.requestProcessor.init()
      this.domProcessor.init()
      this.parsedScriptProcessor.init()
      this.pageProcessor.init()
      this.serviceWorkerProcessor.init()
    }
  }

  process (dumpData, rank) {
    let url
    if (dumpData.windowLocation) {
      if (isURL(dumpData.windowLocation)) {
        url = new URL(dumpData.windowLocation)
      } else if (dumpData.url && isURL(dumpData.url)) {
        url = new URL(dumpData.url)
      } else {
        url = undefined
      }
    } else if (dumpData.url && isURL(dumpData.url)) {
      url = new URL(dumpData.url)
    } else {
      url = undefined
    }

    if (url === undefined) {
      console.log('booo')
      this.curURL = undefined
    } else {
      this.curURL = url.href
      console.log(url.href)
    }
    this.pageProcessor.process(dumpData)
    this.domProcessor.process(dumpData)
    this.requestProcessor.process(dumpData)
    this.parsedScriptProcessor.process(dumpData.parsedScripts, url)
    this.serviceWorkerProcessor.process(dumpData.serviceWorker)
    if (dumpData.pageAddedEnv) {
      this.envProcessor.process(dumpData.pageAddedEnv)
    }
    this._figureOutTimings()
    if (rank) {
      this.rank = rank
    }
    // console.log()
  }

  toJSON () {
    return {
      curURL: this.curURL,
      domInfo: this.domProcessor,
      domTimings: this.domTimings,
      envInfo: this.envProcessor,
      pageInfo: this.pageProcessor,
      scriptInfo: this.parsedScriptProcessor,
      rank: this.rank,
      reqTimings: this.reqTimings,
      requestInfo: this.requestProcessor,
      scriptTime: this.scriptTime,
      serviceWorkerInfo: this.serviceWorkerProcessor
    }
  }

  reportData () {
    return _.cloneDeep({
      curURL: this.curURL,
      domInfo: this.domProcessor.toJSON(),
      domTimings: this.domTimings,
      envInfo: this.envProcessor.toJSON(),
      pageInfo: this.pageProcessor.toJSON(),
      scriptInfo: this.parsedScriptProcessor.toJSON(),
      reqTimings: this.reqTimings,
      requestInfo: this.requestProcessor.toJSON(),
      scriptTime: this.scriptTime,
      serviceWorkerInfo: this.serviceWorkerProcessor.toJSON()
    })
  }

  _figureOutTimings () {
    this._figureOutRequestTimings()
    this._figureOutDomTimings()
    this._figureOutScriptTimings()
  }

  _figureOutRequestTimings () {
    this.reqTimings = {
      finished: {
        beforePL: 0,
        afterPL: 0,
        atPL: 0,
        beforeDCF: 0,
        afterDCF: 0,
        atDCF: 0
      }
    }
    let i = 0
    let j = 0
    let len = this.requestProcessor.timings.length
    let len2
    while (i < len) {
      let {reqResTime, loadingFinishInfo} = this.requestProcessor.timings[i]
      if (loadingFinishInfo) {
        if (this.pageProcessor.loaded) {
          if (loadingFinishInfo.mnow < this.pageProcessor.loaded.mnow) {
            this.reqTimings.finished.beforePL += 1
          } else if (loadingFinishInfo.mnow === this.pageProcessor.loaded.mnow) {
            this.reqTimings.finished.atPL += 1
          } else if (loadingFinishInfo.mnow > this.pageProcessor.loaded.mnow) {
            this.reqTimings.finished.afterPL += 1
          }
        }
        if (this.pageProcessor.domContentFired) {
          if (loadingFinishInfo.mnow < this.pageProcessor.domContentFired.mnow) {
            this.reqTimings.finished.beforeDCF += 1
          } else if (loadingFinishInfo.mnow === this.pageProcessor.domContentFired.mnow) {
            this.reqTimings.finished.atDCF += 1
          } else if (loadingFinishInfo.mnow > this.pageProcessor.domContentFired.mnow) {
            this.reqTimings.finished.afterDCF += 1
          }
        }
      }

      if (reqResTime) {
        len2 = reqResTime.length
        while (j < len2) {
          if (this.pageProcessor.loaded) {
            if (reqResTime[j].mnow < this.pageProcessor.loaded.mnow) {
              if (this.reqTimings[reqResTime[j].type] === undefined) {
                this.reqTimings[reqResTime[j].type] = {
                  beforePL: 0,
                  afterPL: 0,
                  atPL: 0,
                  beforeDCF: 0,
                  afterDCF: 0,
                  atDCF: 0
                }
              }
              this.reqTimings[reqResTime[j].type].beforePL += 1
            } else if (reqResTime[j].mnow === this.pageProcessor.loaded.mnow) {
              if (this.reqTimings[reqResTime[j].type] === undefined) {
                this.reqTimings[reqResTime[j].type] = {
                  beforePL: 0,
                  afterPL: 0,
                  atPL: 0,
                  beforeDCF: 0,
                  afterDCF: 0,
                  atDCF: 0
                }
              }
              this.reqTimings[reqResTime[j].type].atPL += 1
            } else if (reqResTime[j].mnow > this.pageProcessor.loaded.mnow) {
              if (this.reqTimings[reqResTime[j].type] === undefined) {
                this.reqTimings[reqResTime[j].type] = {
                  beforePL: 0,
                  afterPL: 0,
                  atPL: 0,
                  beforeDCF: 0,
                  afterDCF: 0,
                  atDCF: 0
                }
              }
              this.reqTimings[reqResTime[j].type].afterPL += 1
            }
          }

          if (this.pageProcessor.domContentFired) {
            if (reqResTime[j].mnow < this.pageProcessor.domContentFired.mnow) {
              if (this.reqTimings[reqResTime[j].type] === undefined) {
                this.reqTimings[reqResTime[j].type] = {
                  beforePL: 0,
                  afterPL: 0,
                  atPL: 0,
                  beforeDCF: 0,
                  afterDCF: 0,
                  atDCF: 0
                }
              }
              this.reqTimings[reqResTime[j].type].beforeDCF += 1
            } else if (reqResTime[j].mnow === this.pageProcessor.domContentFired.mnow) {
              if (this.reqTimings[reqResTime[j].type] === undefined) {
                this.reqTimings[reqResTime[j].type] = {
                  beforePL: 0,
                  afterPL: 0,
                  atPL: 0,
                  beforeDCF: 0,
                  afterDCF: 0,
                  atDCF: 0
                }
              }
              this.reqTimings[reqResTime[j].type].atDCF += 1
            } else if (reqResTime[j].mnow > this.pageProcessor.domContentFired.mnow) {
              if (this.reqTimings[reqResTime[j].type] === undefined) {
                this.reqTimings[reqResTime[j].type] = {
                  beforePL: 0,
                  afterPL: 0,
                  atPL: 0,
                  beforeDCF: 0,
                  afterDCF: 0,
                  atDCF: 0
                }
              }
              this.reqTimings[reqResTime[j].type].afterDCF += 1
            }
          }
          j++
        }
        j = 0
      }
      i++
    }
  }

  _figureOutDomTimings () {
    let i = 0
    let len
    let aTime
    this.domTimings = {
      childNodes: {
        inserted: {
          beforePL: 0,
          afterPL: 0,
          atPL: 0,
          beforeDCF: 0,
          afterDCF: 0,
          atDCF: 0
        },
        set: {
          beforePL: 0,
          afterPL: 0,
          atPL: 0,
          beforeDCF: 0,
          afterDCF: 0,
          atDCF: 0
        }
      },
      attributes: {
        modified: {
          beforePL: 0,
          afterPL: 0,
          atPL: 0,
          beforeDCF: 0,
          afterDCF: 0,
          atDCF: 0
        },
        removed: {
          beforePL: 0,
          afterPL: 0,
          atPL: 0,
          beforeDCF: 0,
          afterDCF: 0,
          atDCF: 0
        }
      },
      shadowRoot: {
        pushed: {
          beforePL: 0,
          afterPL: 0,
          atPL: 0,
          beforeDCF: 0,
          afterDCF: 0,
          atDCF: 0
        },
        popped: {
          beforePL: 0,
          afterPL: 0,
          atPL: 0,
          beforeDCF: 0,
          afterDCF: 0,
          atDCF: 0
        }
      }
    }

    if (this.domProcessor.childNodeInfo.inserted.timings.length > 0) {
      len = this.domProcessor.childNodeInfo.inserted.timings.length
      while (i < len) {
        aTime = this.domProcessor.childNodeInfo.inserted.timings[i]
        if (this.pageProcessor.loaded) {
          if (aTime < this.pageProcessor.loaded.mnow) {
            this.domTimings.childNodes.inserted.beforePL += 1
          } else if (aTime === this.pageProcessor.loaded.mnow) {
            this.domTimings.childNodes.inserted.atPL += 1
          } else if (aTime > this.pageProcessor.loaded.mnow) {
            this.domTimings.childNodes.inserted.afterPL += 1
          }
        }
        if (this.pageProcessor.domContentFired) {
          if (aTime < this.pageProcessor.domContentFired.mnow) {
            this.domTimings.childNodes.inserted.beforeDCF += 1
          } else if (aTime === this.pageProcessor.domContentFired.mnow) {
            this.domTimings.childNodes.inserted.atDCF += 1
          } else if (aTime > this.pageProcessor.domContentFired.mnow) {
            this.domTimings.childNodes.inserted.afterDCF += 1
          }
        }
        i++
      }
    }

    if (this.domProcessor.childNodeInfo.set.timings.length > 0) {
      i = 0
      len = this.domProcessor.childNodeInfo.set.timings.length
      while (i < len) {
        aTime = this.domProcessor.childNodeInfo.set.timings[i]
        if (this.pageProcessor.loaded) {
          if (aTime < this.pageProcessor.loaded.mnow) {
            this.domTimings.childNodes.set.beforePL += 1
          } else if (aTime === this.pageProcessor.loaded.mnow) {
            this.domTimings.childNodes.set.atPL += 1
          } else if (aTime > this.pageProcessor.loaded.mnow) {
            this.domTimings.childNodes.set.afterPL += 1
          }
        }
        if (this.pageProcessor.domContentFired) {
          if (aTime < this.pageProcessor.domContentFired.mnow) {
            this.domTimings.childNodes.set.beforeDCF += 1
          } else if (aTime === this.pageProcessor.domContentFired.mnow) {
            this.domTimings.childNodes.set.atDCF += 1
          } else if (aTime > this.pageProcessor.domContentFired.mnow) {
            this.domTimings.childNodes.set.afterDCF += 1
          }
        }
        i++
      }
    }

    if (this.domProcessor.shadowRootInfo.timings.length > 0) {
      i = 0
      len = this.domProcessor.shadowRootInfo.timings.length
      while (i < len) {
        aTime = this.domProcessor.shadowRootInfo.timings[i]
        if (this.pageProcessor.loaded) {
          if (aTime.mnow < this.pageProcessor.loaded.mnow) {
            this.domTimings.shadowRoot[aTime.type].beforePL += 1
          } else if (aTime.mnow === this.pageProcessor.loaded.mnow) {
            this.domTimings.shadowRoot[aTime.type].atPL += 1
          } else if (aTime.mnow > this.pageProcessor.loaded.mnow) {
            this.domTimings.shadowRoot[aTime.type].afterPL += 1
          }
        }
        if (this.pageProcessor.domContentFired) {
          if (aTime.mnow < this.pageProcessor.domContentFired.mnow) {
            this.domTimings.shadowRoot[aTime.type].beforeDCF += 1
          } else if (aTime.mnow === this.pageProcessor.domContentFired.mnow) {
            this.domTimings.shadowRoot[aTime.type].atDCF += 1
          } else if (aTime.mnow > this.pageProcessor.domContentFired.mnow) {
            this.domTimings.shadowRoot[aTime.type].afterDCF += 1
          }
        }
        i++
      }
    }

    if (this.domProcessor.attributeInfo.modified.timings.length > 0) {
      i = 0
      len = this.domProcessor.attributeInfo.modified.timings.length
      while (i < len) {
        aTime = this.domProcessor.attributeInfo.modified.timings[i]
        if (this.pageProcessor.loaded) {
          if (aTime < this.pageProcessor.loaded.mnow) {
            this.domTimings.attributes.modified.beforePL += 1
          } else if (aTime === this.pageProcessor.loaded.mnow) {
            this.domTimings.attributes.modified.atPL += 1
          } else if (aTime > this.pageProcessor.loaded.mnow) {
            this.domTimings.attributes.modified.afterPL += 1
          }
        }
        if (this.pageProcessor.domContentFired) {
          if (aTime < this.pageProcessor.domContentFired.mnow) {
            this.domTimings.attributes.modified.beforeDCF += 1
          } else if (aTime === this.pageProcessor.domContentFired.mnow) {
            this.domTimings.attributes.modified.atDCF += 1
          } else if (aTime > this.pageProcessor.domContentFired.mnow) {
            this.domTimings.attributes.modified.afterDCF += 1
          }
        }
        i++
      }
    }

    if (this.domProcessor.attributeInfo.removed.timings.length > 0) {
      i = 0
      len = this.domProcessor.attributeInfo.removed.timings.length
      while (i < len) {
        aTime = this.domProcessor.attributeInfo.removed.timings[i]
        if (this.pageProcessor.loaded) {
          if (aTime < this.pageProcessor.loaded.mnow) {
            this.domTimings.attributes.removed.beforePL += 1
          } else if (aTime === this.pageProcessor.loaded.mnow) {
            this.domTimings.attributes.removed.atPL += 1
          } else if (aTime > this.pageProcessor.loaded.mnow) {
            this.domTimings.attributes.removed.afterPL += 1
          }
        }
        if (this.pageProcessor.domContentFired) {
          if (aTime < this.pageProcessor.domContentFired.mnow) {
            this.domTimings.attributes.removed.beforeDCF += 1
          } else if (aTime === this.pageProcessor.domContentFired.mnow) {
            this.domTimings.attributes.removed.atDCF += 1
          } else if (aTime > this.pageProcessor.domContentFired.mnow) {
            this.domTimings.attributes.removed.afterDCF += 1
          }
        }
        i++
      }
    }
  }

  _figureOutScriptTimings () {
    this.scriptTime = {
      parsed: {
        beforePL: 0,
        afterPL: 0,
        atPL: 0,
        beforeDCF: 0,
        afterDCF: 0,
        atDCF: 0
      },
      failed: {
        beforePL: 0,
        afterPL: 0,
        atPL: 0,
        beforeDCF: 0,
        afterDCF: 0,
        atDCF: 0
      }
    }
    let i
    let len
    let aTime
    if (this.parsedScriptProcessor.scriptTime.parsed.length > 0) {
      i = 0
      len = this.parsedScriptProcessor.scriptTime.parsed.length
      while (i < len) {
        aTime = this.parsedScriptProcessor.scriptTime.parsed[i].mnow
        if (this.pageProcessor.loaded) {
          if (aTime < this.pageProcessor.loaded.mnow) {
            this.scriptTime.parsed.beforePL += 1
          } else if (aTime === this.pageProcessor.loaded.mnow) {
            this.scriptTime.parsed.atPL += 1
          } else if (aTime > this.pageProcessor.loaded.mnow) {
            this.scriptTime.parsed.afterPL += 1
          }
        }
        if (this.pageProcessor.domContentFired) {
          if (aTime < this.pageProcessor.domContentFired.mnow) {
            this.scriptTime.parsed.beforeDCF += 1
          } else if (aTime === this.pageProcessor.domContentFired.mnow) {
            this.scriptTime.parsed.atDCF += 1
          } else if (aTime > this.pageProcessor.domContentFired.mnow) {
            this.scriptTime.parsed.afterDCF += 1
          }
        }
        i++
      }
    }

    if (this.parsedScriptProcessor.scriptTime.failed.length > 0) {
      i = 0
      len = this.parsedScriptProcessor.scriptTime.failed.length
      while (i < len) {
        aTime = this.parsedScriptProcessor.scriptTime.failed[i].mnow
        if (this.pageProcessor.loaded) {
          if (aTime < this.pageProcessor.loaded.mnow) {
            this.scriptTime.failed.beforePL += 1
          } else if (aTime === this.pageProcessor.loaded.mnow) {
            this.scriptTime.failed.atPL += 1
          } else if (aTime > this.pageProcessor.loaded.mnow) {
            this.scriptTime.failed.afterPL += 1
          }
        }
        if (this.pageProcessor.domContentFired) {
          if (aTime < this.pageProcessor.domContentFired.mnow) {
            this.scriptTime.failed.beforeDCF += 1
          } else if (aTime === this.pageProcessor.domContentFired.mnow) {
            this.scriptTime.failed.atDCF += 1
          } else if (aTime > this.pageProcessor.domContentFired.mnow) {
            this.scriptTime.failed.afterDCF += 1
          }
        }
        i++
      }
    }
  }
}

module.exports = DumpProcessor
