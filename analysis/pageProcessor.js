const {URL} = require('url')
const _ = require('lodash')
const inspect = require('./inspect')

class PageProcessor {
  static newOne () {
    const pp = new PageProcessor()
    pp.init()
    return pp
  }

  init () {
    this.urlParser = new URL('about:blank')
    this.childFrameInfo = {resourcesPerFrameDepth: {}, frameDepth: {}, originsPerDepth: {}}
    this.mainFrameResourceInfo = {}
  }

  process (data) {
    // console.log(data.page)
    if (data.page.resTree) {
      this._processResTree(data.page.resTree)
    }
    if (data.page.domContentEventFired) {
      this.domContentFired = data.page.domContentEventFired.time
    }
    if (data.page.loadEventFired) {
      this.loaded = data.page.loadEventFired.time
    }
  }

  report () {
    inspect(this.childFrameInfo)
  }

  toJSON () {
    return {
      mainFrameResourceInfo: this.mainFrameResourceInfo,
      childFrameInfo: this.childFrameInfo
    }
  }

  _attemptToSetUrlParser (maybeUrl) {
    let noError = true
    try {
      this.urlParser.href = maybeUrl
    } catch (error) {
      noError = false
    }
    return noError
  }

  _getFrameOriginString (frame) {
    // console.log(frame)
    let depthOrigin
    let didSet = true
    if (frame.securityOrigin !== undefined) {
      try {
        this.urlParser.href = frame.securityOrigin.trim()
      } catch (error) {
        didSet = false
      }
    } else {
      didSet = false
    }

    // console.log(frame)
    if (!didSet && frame.unreachableUrl !== undefined) {
      try {
        this.urlParser.href = frame.unreachableUrl.trim()
        didSet = true
      } catch (error) {
        didSet = false
      }
    }
    if (!didSet && frame.url !== undefined) {
      try {
        this.urlParser.href = frame.url.trim()
        didSet = true
      } catch (error) {
        didSet = false
      }
    }
    frame.name = frame.name.trim()
    if (didSet) {
      depthOrigin = _.takeRight(this.urlParser.host.split('.'), 2).join('.')
    } else {
      depthOrigin = frame.name
    }

    if (depthOrigin === '') {
      depthOrigin = frame.name !== '' ? frame.name : frame.url.trim()
    }
    return depthOrigin
  }

  _processResTree ({frameTree}) {
    let i
    let len
    let aRes
    if (frameTree.resources && frameTree.resources.length > 0) {
      i = 0
      len = frameTree.resources.length
      while (i < len) {
        aRes = frameTree.resources[i]
        if (this.mainFrameResourceInfo[aRes.mimeType] === undefined) {
          this.mainFrameResourceInfo[aRes.mimeType] = 0
        }
        this.mainFrameResourceInfo[aRes.mimeType] += 1
        i++
      }
      // inspect(this.mainFrameResourceInfo)
    }

    if (frameTree.childFrames) {
      let depthOrigin
      let frameQ = frameTree.childFrames.map(theFrame => ({depth: 1, theFrame}))
      while (frameQ.length > 0) {
        let it = frameQ.shift()
        // console.log(it)
        let {depth, theFrame: {frame, childFrames, resources}} = it
        if (this.childFrameInfo.frameDepth[depth] === undefined) {
          this.childFrameInfo.frameDepth[depth] = 0
        }
        this.childFrameInfo.frameDepth[depth] += 1
        if (this.childFrameInfo.originsPerDepth[depth] === undefined) {
          this.childFrameInfo.originsPerDepth[depth] = {}
        }
        depthOrigin = this._getFrameOriginString(frame)

        // console.log(frame.url, frame.unreachableUrl, frame.securityOrigin, frame.name)
        // console.log()

        if (this.childFrameInfo.originsPerDepth[depth][depthOrigin] === undefined) {
          this.childFrameInfo.originsPerDepth[depth][depthOrigin] = 0
        }
        this.childFrameInfo.originsPerDepth[depth][depthOrigin] += 1
        if (resources !== null && resources !== undefined && resources.length > 0) {
          i = 0
          len = resources.length
          while (i < len) {
            aRes = resources[i]
            if (this.childFrameInfo.resourcesPerFrameDepth[depth] === undefined) {
              this.childFrameInfo.resourcesPerFrameDepth[depth] = {}
            }
            if (this.childFrameInfo.resourcesPerFrameDepth[depth][frame.id] === undefined) {
              this.childFrameInfo.resourcesPerFrameDepth[depth][frame.id] = {}
            }
            if (this.childFrameInfo.resourcesPerFrameDepth[depth][frame.id][aRes.mimeType] === undefined) {
              this.childFrameInfo.resourcesPerFrameDepth[depth][frame.id][aRes.mimeType] = 0
            }
            this.childFrameInfo.resourcesPerFrameDepth[depth][frame.id][aRes.mimeType] += 1
            if (this.childFrameInfo.resourcesPerFrameDepth[depth]['mimeCount'] === undefined) {
              this.childFrameInfo.resourcesPerFrameDepth[depth]['mimeCount'] = {}
            }
            if (this.childFrameInfo.resourcesPerFrameDepth[depth]['mimeCount'][aRes.mimeType] === undefined) {
              this.childFrameInfo.resourcesPerFrameDepth[depth]['mimeCount'][aRes.mimeType] = 0
            }
            this.childFrameInfo.resourcesPerFrameDepth[depth]['mimeCount'][aRes.mimeType] += 1
            i++
          }
        }
        if (childFrames !== undefined && childFrames !== null) {
          frameQ = frameQ.concat(childFrames.map(theFrame => ({depth: depth + 1, theFrame})))
        }
      }
      // inspect(this.childFrameInfo)
    }
  }
}

module.exports = PageProcessor
