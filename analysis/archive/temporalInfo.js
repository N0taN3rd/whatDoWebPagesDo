const {URL} = require('url')
const _ = require('lodash')
const isNumeric = require('validator/lib/isNumeric')
const moment = require('moment')
require('moment-precise-range-plugin')

const Constants = {
  AIT: 'wayback.archive-it.org',
  IA: 'web.archive.org',
  PT: 'arquivo.pt',
  VER: 'wayback.vefsafn.is',
  UK: 'www.webarchive.org.uk',
  UK_GOV: 'webarchive.nationalarchives.gov.uk',
  LOC: 'webarchive.loc.gov',
  onlyNums: /([0-9]+)/,
  dataProto: 'data:',
  diff: {
    same: 'same',
    years: 'years',
    months: 'months',
    days: 'days',
    hours: 'hours',
    minutes: 'minutes',
    seconds: 'seconds',
    plus: '+',
    minus: '-'
  }
}

const archiveAssets = [
  'b.archive-it.org',
  'sc.archive.org',
  'nationalarchives.gov.uk',
  'smartsource.nationalarchives.gov.uk',
  'www.nationalarchives.gov.uk',
  'pingfore.archive-it.org',
  'ssc.archive.org',
  'analytics.archive.org',
  'archive.org',
  'archiveteam.org',
  'partner.archive-it.org',
  'cmon.loc.gov'
]

class TemporalInfo {
  constructor () {
    this._archiveSymbols = {
      IA: Symbol('Internet_Archive'),
      AIT: Symbol('Archive_It'),
      PT: Symbol('Portuguese_Archive'),
      VER: Symbol('Iceland_Archive'),
      UK: Symbol('UK_Archive'),
      UK_GOV: Symbol('UK_GOV_Archive'),
      LOC: Symbol('Library_Congress')
    }
    this._liveWeb = Symbol('Live_Web')
    this._archiveAsset = Symbol('Archive_Asset')
    this._dtIndexs = {
      [this._archiveSymbols.IA]: 2,
      [this._archiveSymbols.AIT]: 2,
      [this._archiveSymbols.PT]: 2,
      [this._archiveSymbols.VER]: 2,
      [this._archiveSymbols.UK]: 3,
      [this._archiveSymbols.LOC]: 2,
      [this._archiveSymbols.UK_GOV]: 1
    }
    this._archiveDomains = new Set(archiveAssets)
    this.processPageRequest = this.processPageRequest.bind(this)
  }

  init (url) {
    if (this._parser === undefined) {
      this._parser = new URL('about:blank')
    } else {
      this._parser.href = 'about:blank'
    }
    this._root = url
    this._curArchive = this.hostToSymbol(this._root)
    this._rootDt = this.dtFromURIM(this._root, this._curArchive)
    this._requestCount = {
      assets: 0,
      liveWeb: 0,
      archived: 0,
      lwHosts: {}
    }
    this._responseCount = {
      assets: 0,
      liveWeb: 0,
      archived: 0,
      lwHosts: {}
    }
    // if (this._reqTemporalInfo === undefined) {
    //   this._reqTemporalInfo = new Map()
    // } else {
    //   this._reqTemporalInfo.clear()
    // }
    this._reqTemporalCount = {}
    this._resTemporalCount = {}
  }

  processPageRequest (id, req) {
    if (req && req.request && req.request.url) {
      req = req.request
      this._parser.href = req.url
      if (this._parser.protocol === Constants.dataProto) return
      let arSymbol = this.hostToSymbol(this._parser)
      if (arSymbol !== this._liveWeb && arSymbol !== this._archiveAsset) {
        let dt = this._dtFromMaybeURIM(this._parser, arSymbol)
        if (dt === undefined) {
          this._requestCount.assets += 1
        } else {
          this._requestCount.archived += 1
          if (this._rootDt.isSame(dt)) {
            // if (!this._reqTemporalInfo.has(id)) {
            //   this._reqTemporalInfo.set(id, {req: {dif: 'same'}})
            // }
            if (this._reqTemporalCount[Constants.diff.same] === undefined) {
              this._reqTemporalCount[Constants.diff.same] = 0
            }
            this._reqTemporalCount[Constants.diff.same] += 1
          } else {
            let diff = moment.preciseDiff(this._rootDt, dt, true)
            let pm = diff.firstDateWasLater ? Constants.diff.minus : Constants.diff.plus
            let tk
            if (diff.years !== 0) {
              // if (!this._reqTemporalInfo.has(id)) {
              //   this._reqTemporalInfo.set(id, {
              //     req: {dif: 'years', by: diff.years, pm}
              //   })
              // }
              tk = `${Constants.diff.years}${pm}`
            } else if (diff.months !== 0) {
              // if (!this._reqTemporalInfo.has(id)) {
              //   this._reqTemporalInfo.set(id, {
              //     req: {
              //       dif: 'months',
              //       by: diff.months,
              //       pm
              //     }
              //   })
              // }
              tk = `${Constants.diff.months}${pm}`
            } else if (diff.days !== 0) {
              // if (!this._reqTemporalInfo.has(id)) {
              //   this._reqTemporalInfo.set(id, {
              //     req: {
              //       dif: 'days',
              //       by: diff.days,
              //       pm
              //     }
              //   })
              // }
              tk = `${Constants.diff.days}${pm}`
            } else if (diff.hours !== 0) {
              // if (!this._reqTemporalInfo.has(id)) {
              //   this._reqTemporalInfo.set(id, {
              //     req: {
              //       dif: 'hours',
              //       by: diff.hours,
              //       pm
              //     }
              //   })
              // }
              tk = `${Constants.diff.hours}${pm}`
            } else if (diff.minutes !== 0) {
              // if (!this._reqTemporalInfo.has(id)) {
              //   this._reqTemporalInfo.set(id, {
              //     req: {
              //       dif: 'minutes',
              //       by: diff.minutes,
              //       pm
              //     }
              //   })
              // }
              tk = `${Constants.diff.minutes}${pm}`
            } else if (diff.seconds !== 0) {
              // if (!this._reqTemporalInfo.has(id)) {
              //   this._reqTemporalInfo.set(id, {
              //     req: {
              //       dif: 'seconds',
              //       by: diff.seconds,
              //       pm
              //     }
              //   })
              // }
              tk = `${Constants.diff.seconds}${pm}`
            }
            if (this._reqTemporalCount[tk] === undefined) {
              this._reqTemporalCount[tk] = 0
            }
            this._reqTemporalCount[tk] += 1
          }
        }
      } else {
        if (arSymbol === this._liveWeb) {
          this._requestCount.liveWeb += 1
          let h = _.takeRight(this._parser.host.split('.'), 2).join('.')
          if (this._requestCount.lwHosts[h] === undefined) {
            this._requestCount.lwHosts[h] = 0
          }
          this._requestCount.lwHosts[h] += 1
        } else {
          this._requestCount.assets += 1
        }
      }
    }
  }

  processPageRedirect (id, redir) {
    // console.log(redir)
    this._parser.href = redir.url
    if (this._parser.protocol === Constants.dataProto) return
    let arSymbol = this.hostToSymbol(this._parser)
    if (arSymbol !== this._liveWeb && arSymbol !== this._archiveAsset) {
      let dt = this._dtFromMaybeURIM(this._parser, arSymbol)
      if (dt === undefined) {
        this._requestCount.assets += 1
      } else {
        this._requestCount.archived += 1
        if (this._rootDt.isSame(dt)) {
          // if (!this._reqTemporalInfo.has(id)) {
          //   this._reqTemporalInfo.set(id, {req: {dif: 'same'}})
          // }
          if (this._reqTemporalCount[Constants.diff.same] === undefined) {
            this._reqTemporalCount[Constants.diff.same] = 0
          }
          this._reqTemporalCount[Constants.diff.same] += 1
        } else {
          let diff = moment.preciseDiff(this._rootDt, dt, true)
          let pm = diff.firstDateWasLater ? Constants.diff.minus : Constants.diff.plus
          let tk
          if (diff.years !== 0) {
            // if (!this._reqTemporalInfo.has(id)) {
            //   this._reqTemporalInfo.set(id, {
            //     req: {dif: 'years', by: diff.years, pm}
            //   })
            // }
            tk = `${Constants.diff.years}${pm}`
          } else if (diff.months !== 0) {
            // if (!this._reqTemporalInfo.has(id)) {
            //   this._reqTemporalInfo.set(id, {
            //     req: {
            //       dif: 'months',
            //       by: diff.months,
            //       pm
            //     }
            //   })
            // }
            tk = `${Constants.diff.months}${pm}`
          } else if (diff.days !== 0) {
            // if (!this._reqTemporalInfo.has(id)) {
            //   this._reqTemporalInfo.set(id, {
            //     req: {
            //       dif: 'days',
            //       by: diff.days,
            //       pm
            //     }
            //   })
            // }
            tk = `${Constants.diff.days}${pm}`
          } else if (diff.hours !== 0) {
            // if (!this._reqTemporalInfo.has(id)) {
            //   this._reqTemporalInfo.set(id, {
            //     req: {
            //       dif: 'hours',
            //       by: diff.hours,
            //       pm
            //     }
            //   })
            // }
            tk = `${Constants.diff.hours}${pm}`
          } else if (diff.minutes !== 0) {
            // if (!this._reqTemporalInfo.has(id)) {
            //   this._reqTemporalInfo.set(id, {
            //     req: {
            //       dif: 'minutes',
            //       by: diff.minutes,
            //       pm
            //     }
            //   })
            // }
            tk = `${Constants.diff.minutes}${pm}`
          } else if (diff.seconds !== 0) {
            // if (!this._reqTemporalInfo.has(id)) {
            //   this._reqTemporalInfo.set(id, {
            //     req: {
            //       dif: 'seconds',
            //       by: diff.seconds,
            //       pm
            //     }
            //   })
            // }
            tk = `${Constants.diff.seconds}${pm}`
          }
          if (this._reqTemporalCount[tk] === undefined) {
            this._reqTemporalCount[tk] = 0
          }
          this._reqTemporalCount[tk] += 1
        }
      }
    } else {
      if (arSymbol === this._liveWeb) {
        this._requestCount.liveWeb += 1
        let h = _.takeRight(this._parser.host.split('.'), 2).join('.')
        if (this._requestCount.lwHosts[h] === undefined) {
          this._requestCount.lwHosts[h] = 0
        }
        this._requestCount.lwHosts[h] += 1
      } else {
        this._requestCount.assets += 1
      }
    }
  }

  processPageRes (id, res) {
    if (res.response && res.response.url) {
      this._parser.href = res.response.url
      if (this._parser.protocol === Constants.dataProto) return
      let arSymbol = this.hostToSymbol(this._parser)
      if (arSymbol !== this._liveWeb && arSymbol !== this._archiveAsset) {
        let dt = this._dtFromMaybeURIM(this._parser, arSymbol)
        if (dt === undefined) {
          this._responseCount.assets += 1
        } else {
          this._responseCount.archived += 1
          if (this._rootDt.isSame(dt)) {
            // if (this._reqTemporalInfo.has(id)) {
            //   this._reqTemporalInfo.get(id).res = {dif: 'same'}
            // }
            if (this._resTemporalCount[Constants.diff.same] === undefined) {
              this._resTemporalCount[Constants.diff.same] = 0
            }
            this._resTemporalCount[Constants.diff.same] += 1
          } else {
            let diff = moment.preciseDiff(this._rootDt, dt, true)
            let pm = diff.firstDateWasLater ? Constants.diff.minus : Constants.diff.plus
            let tk
            if (diff.years !== 0) {
              // if (this._reqTemporalInfo.has(id)) {
              //   this._reqTemporalInfo.get(id).res = {dif: 'years', by: diff.years, pm}
              // }
              tk = `${Constants.diff.years}${pm}`
            } else if (diff.months !== 0) {
              // if (this._reqTemporalInfo.has(id)) {
              //   this._reqTemporalInfo.get(id).res = {
              //     dif: 'months',
              //     by: diff.months,
              //     pm
              //   }
              // }
              tk = `${Constants.diff.months}${pm}`
            } else if (diff.days !== 0) {
              // if (this._reqTemporalInfo.has(id)) {
              //   this._reqTemporalInfo.get(id).res = {
              //     dif: 'days',
              //     by: diff.days,
              //     pm
              //   }
              //
              // }
              tk = `${Constants.diff.days}${pm}`
            } else if (diff.hours !== 0) {
              // if (this._reqTemporalInfo.has(id)) {
              //   this._reqTemporalInfo.get(id).res = {
              //     dif: 'hours',
              //     by: diff.hours,
              //     pm
              //   }
              //
              // }
              tk = `${Constants.diff.hours}${pm}`
            } else if (diff.minutes !== 0) {
              // if (this._reqTemporalInfo.has(id)) {
              //   this._reqTemporalInfo.get(id).res = {
              //     dif: 'minutes',
              //     by: diff.minutes,
              //     pm
              //   }
              //
              // }
              tk = `${Constants.diff.minutes}${pm}`
            } else if (diff.seconds !== 0) {
              // if (this._reqTemporalInfo.has(id)) {
              //   this._reqTemporalInfo.get(id).res = {
              //     dif: 'seconds',
              //     by: diff.seconds,
              //     pm
              //   }
              // }
              tk = `${Constants.diff.seconds}${pm}`
            }
            if (this._resTemporalCount[tk] === undefined) {
              this._resTemporalCount[tk] = 0
            }
            this._resTemporalCount[tk] += 1
          }
        }
      } else {
        if (arSymbol === this._liveWeb) {
          this._responseCount.liveWeb += 1
          let h = _.takeRight(this._parser.host.split('.'), 2).join('.')
          if (this._responseCount.lwHosts[h] === undefined) {
            this._responseCount.lwHosts[h] = 0
          }
          this._responseCount.lwHosts[h] += 1
        } else {
          this._responseCount.assets += 1
        }
      }
    }
  }

  hostToSymbol (url) {
    if (url === undefined) {
      return this._liveWeb
    }
    let host = url.host
    if (host === '' || !host) {
      host = url.hostname.toLowerCase().trim()
    } else {
      host = host.toLowerCase().trim()
    }
    switch (host) {
      case Constants.AIT:
        return this._archiveSymbols.AIT
      case Constants.IA:
        return this._archiveSymbols.IA
      case Constants.PT:
        return this._archiveSymbols.PT
      case Constants.VER:
        return this._archiveSymbols.VER
      case Constants.UK:
        return this._archiveSymbols.UK
      case Constants.LOC:
        return this._archiveSymbols.LOC
      case Constants.UK_GOV:
        return this._archiveSymbols.UK_GOV
      default:
        if (this._archiveDomains.has(host)) {
          return this._archiveAsset
        }
        return this._liveWeb
    }
  }

  currentArchive () {
    switch (this._curArchive) {
      case this._archiveSymbols.UK_GOV:
        return Constants.UK_GOV
      case this._archiveSymbols.IA:
        return Constants.IA
      case this._archiveSymbols.AIT:
        return Constants.AIT
      case this._archiveSymbols.LOC:
        return Constants.LOC
      case this._archiveSymbols.UK:
        return Constants.UK
      case this._archiveSymbols.VER:
        return Constants.VER
      case this._archiveSymbols.PT:
        return Constants.PT
    }
  }

  _dtFromMaybeURIM (urim, arSymbol) {
    if (this._liveWeb === arSymbol) {
      return undefined
    }
    let idx = this._dtIndexs[arSymbol]
    let split = urim.pathname.split('/')
    let dt = split[idx]
    if (dt === undefined) {
      return dt
    }
    if (!isNumeric(dt)) {
      dt = Constants.onlyNums.exec(dt)
      if (dt === null) {
        return undefined
      }
      dt = dt[0]
    }
    dt = moment(dt, 'YYYYMDHms')
    if (!dt.isValid()) {
      return undefined
    }
    return dt
  }

  dtFromURIM (urim, arSymbol) {
    if (this._liveWeb === arSymbol) {
      return undefined
    }

    let idx = this._dtIndexs[arSymbol]
    let split = urim.pathname.split('/')
    let dt = split[idx]
    if (dt === undefined) {
      throw new Error(`Could Not Get Root Temporal Info ${urim.href}`)
    }
    if (!isNumeric(dt)) {
      dt = Constants.onlyNums.exec(dt)[0]
    }
    dt = moment(dt, 'YYYYMDHms')
    if (!dt.isValid()) {
      throw new Error(`Could Not Get Root Temporal Info Invalid DT ${dt}`)
    }
    return dt
  }

  toJSON () {
    return {
      archive: this.currentArchive(),
      resCount: this._responseCount,
      resTemporalCount: this._resTemporalCount,
      requestCount: this._requestCount,
      reqTemporalCount: this._reqTemporalCount
    }
  }
}

module.exports = TemporalInfo
