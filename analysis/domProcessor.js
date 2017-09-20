const mime = require('mime')

const Constants = {
  data: 'data-',
  dataReact: 'data-react',
  ng: 'ng-',
  link: 'link',
  rel: 'rel',
  import: 'import',
  preing: new Set(['prefetch', 'preload']),
  preload: 'preload',
  name: 'name',
  content: 'content',
  prefetch: 'prefetch',
  referrer: 'referrer',
  as: 'as',
  crossorigin: 'crossorigin',
  meta: 'meta',
  httpEquiv: 'http-equiv',
  href: 'href',
  refresh: 'refresh',
  referrerpolicy: 'referrerpolicy',
  csrfParam: 'csrf-param',
  csrfToken: 'csrf-token',
  csp: 'content-security-policy',
  noCheckShadow: new Set(['body', 'progress', 'summary', 'optgroup', 'details', 'input', 'option', 'select', 'img', 'video', 'textarea', 'object', 'embed', 'use', 'audio', 'button', 'marquee'])
}

class DomProcessor {
  static newOne () {
    const dp = new DomProcessor()
    dp.init()
    return dp
  }

  init () {
    this.whoIsClickableCount = {}
    this.listenerCount = {}
    this.listenersPerNode = {}
    this.snapShotNodeCount = {}
    this.attributeInfo = {
      react: false,
      angular: false,
      dataCount: {},
      linkFun: {},
      metaFun: {},
      removed: {count: {}, timings: []},
      modified: {count: {}, timings: []}
    }
    this.shadowRootInfo = {count: 0, pushed: 0, popped: 0, timings: []}
    this.childNodeInfo = {
      inserted: {timings: [], count: {}, insertedPerNode: {}},
      set: {timings: [], count: {}, setPerNode: {}}
    }
    this.flatNodeCount = {}
    this.customElements = {
      flat: {
        count: 0,
        byName: {}
      },
      snap: {
        count: 0,
        byName: {}
      }
    }
    if (this.attMap === undefined) {
      this.attMap = new Map()
    } else {
      this.attMap.clear()
    }
  }

  process ({dom}) {
    // console.log(dom)
    this._processEventListeners(dom.eventListeners)
    if (dom.flatDom) {
      this._processFlatDom(dom.flatDom)
    }
    if (dom.domSnapshot) {
      this._processDomSnapshot(dom.domSnapshot)
    }
    if (dom.attsModified && dom.attsModified.length > 0) {
      this._processAttsModified(dom.attsModified)
    }
    if (dom.attsRemoved && dom.attsRemoved.length > 0) {
      this._processAttsRemoved(dom.attsRemoved)
    }
    if (dom.childNodesInserted && dom.childNodesInserted.length > 0) {
      this._processChildNodesInserted(dom.childNodesInserted)
    }
    if (dom.setChildNodes && dom.setChildNodes.length > 0) {
      this._processSetChildNodes(dom.setChildNodes)
    }
    if (dom.shadowRootPushed && dom.shadowRootPushed.length > 0) {
      this._processShadowRootPushed(dom.shadowRootPushed)
    }
    if (dom.shadowRootPopped && dom.shadowRootPopped.length > 0) {
      this._processShadowRootPopped(dom.shadowRootPopped)
    }
  }

  toJSON () {
    this.attributeInfo.removed.timings = undefined
    this.attributeInfo.modified.timings = undefined
    this.shadowRootInfo.timings = undefined
    this.childNodeInfo.inserted.timings = undefined
    this.childNodeInfo.set.timings = undefined
    for (let [k, v] of Object.entries(this.flatNodeCount)) {
      if (this.snapShotNodeCount[k] !== undefined) {
        if (this.snapShotNodeCount[k] < v) {
          this.snapShotNodeCount[k] = v
        }
      } else {
        this.snapShotNodeCount[k] = v
      }
    }
    for (let [k, v] of Object.entries(this.customElements.flat.byName)) {
      if (this.customElements.snap.byName[k] !== undefined) {
        if (this.customElements.snap.byName[k] < v) {
          this.customElements.snap.byName[k] = v
        }
      } else {
        this.customElements.snap.byName[k] = v
      }
    }
    if (this.customElements.snap.count < this.customElements.flat.count) {
      this.customElements.snap.count = this.customElements.flat.count
    }
    return {
      listenerCount: this.listenerCount,
      listenersPerNode: this.listenersPerNode,
      whoIsClickableCount: this.whoIsClickableCount,
      attributeInfo: this.attributeInfo,
      shadowRootInfo: this.shadowRootInfo,
      childNodeInfo: this.childNodeInfo,
      nodeCount: this.snapShotNodeCount,
      customElements: this.customElements.snap
    }
  }

  _processChildNodesInserted (childNodes) {
    let i = 0
    let len = childNodes.length
    let aChildNode
    let insertedNum
    let nodeName
    while (i < len) {
      aChildNode = childNodes[i]
      if (typeof aChildNode.parentNodeId !== 'number') {
        aChildNode = aChildNode.parentNodeId
      }
      let {node} = aChildNode
      insertedNum = 1
      if (node.children) {
        insertedNum += node.children.length
      }
      nodeName = node.nodeName.toLowerCase()
      if (this.childNodeInfo.inserted.insertedPerNode[nodeName] === undefined) {
        this.childNodeInfo.inserted.insertedPerNode[nodeName] = 0
      }
      this.childNodeInfo.inserted.insertedPerNode[nodeName] += insertedNum
      if (aChildNode.time) {
        this.childNodeInfo.inserted.timings.push(aChildNode.time.mnow)
      }
      if (this.childNodeInfo.inserted.count[nodeName] === undefined) {
        this.childNodeInfo.inserted.count[nodeName] = 0
      }
      this.childNodeInfo.inserted.count[nodeName] += 1
      i++
    }
  }

  _processSetChildNodes (setChildNodes) {
    let i = 0
    let j
    let len = setChildNodes.length
    let len2
    let aChildNode
    let nodeName
    while (i < len) {
      aChildNode = setChildNodes[i]
      if (typeof aChildNode.parentId !== 'number') {
        aChildNode = aChildNode.parentId
      }
      if (aChildNode.nodes.length > 0) {
        if (this.childNodeInfo.set.setPerNode[aChildNode.parentId] === undefined) {
          this.childNodeInfo.set.setPerNode[aChildNode.parentId] = 0
        }
        this.childNodeInfo.set.setPerNode[aChildNode.parentId] += aChildNode.nodes.length
        j = 0
        len2 = aChildNode.nodes.length
        while (j < len2) {
          nodeName = aChildNode.nodes[j].nodeName.toLowerCase()
          if (this.childNodeInfo.set.count[nodeName] === undefined) {
            this.childNodeInfo.set.count[nodeName] = 0
          }
          this.childNodeInfo.set.count[nodeName] += 1
          j++
        }
        if (aChildNode.time) {
          this.childNodeInfo.set.timings.push(aChildNode.time.mnow)
        }
      }
      i++
    }
  }

  _processAttsModified (attsModified) {
    let i = 0
    let len = attsModified.length
    let anAtt
    while (i < len) {
      anAtt = attsModified[i]
      if (typeof anAtt.nodeId !== 'number') {
        anAtt = anAtt.nodeId
      }
      if (this.attributeInfo.modified.count[anAtt.name] === undefined) {
        this.attributeInfo.modified.count[anAtt.name] = 0
      }
      this.attributeInfo.modified.count[anAtt.name] += 1
      if (!this.attributeInfo.angular && anAtt.value.indexOf(Constants.ng) !== -1) {
        this.attributeInfo.angular = true
      }
      if (!this.attributeInfo.react && anAtt.value.indexOf(Constants.dataReact) !== -1) {
        this.attributeInfo.react = true
      }
      if (anAtt.time) {
        this.attributeInfo.modified.timings.push(anAtt.time.mnow)
      }
      i++
    }
  }

  _processAttsRemoved (attsRemoved) {
    let i = 0
    let len = attsRemoved.length
    let anAtt
    while (i < len) {
      anAtt = attsRemoved[i]
      if (typeof anAtt.nodeId !== 'number') {
        anAtt = anAtt.nodeId
      }
      if (this.attributeInfo.removed.count[anAtt.name] === undefined) {
        this.attributeInfo.removed.count[anAtt.name] = 0
      }
      this.attributeInfo.removed.count[anAtt.name] += 1
      if (anAtt.time) {
        this.attributeInfo.removed.timings.push(anAtt.time.mnow)
      }
      i++
    }
  }

  _processShadowRootPushed (shadowRootPushed) {
    let i = 0
    let len = shadowRootPushed.length
    while (i < len) {
      if (shadowRootPushed[i].time) {
        this.shadowRootInfo.timings.push({type: 'pushed', mnow: shadowRootPushed[i].time.mnow})
      }
      this.shadowRootInfo.pushed += 1
      i++
    }
  }

  _processShadowRootPopped (shadowRootPopped) {
    let i = 0
    let len = shadowRootPopped.length
    while (i < len) {
      if (shadowRootPopped[i].time) {
        this.shadowRootInfo.timings.push({type: 'popped', mnow: shadowRootPopped[i].time.mnow})
      }
      this.shadowRootInfo.popped += 1
      i++
    }
  }

  _processEventListeners (eventListeners) {
    let i = 0
    let len = eventListeners.length
    let aListener
    let pnId
    while (i < len) {
      aListener = eventListeners[i]
      if (this.listenerCount[aListener.type] === undefined) {
        this.listenerCount[aListener.type] = 0
      }
      this.listenerCount[aListener.type] += 1
      pnId = `${aListener.backendNodeId}-${aListener.nodeName.toLowerCase()}`
      if (this.listenersPerNode[pnId] === undefined) {
        this.listenersPerNode[pnId] = {}
      }
      if (this.listenersPerNode[pnId][aListener.type] === undefined) {
        this.listenersPerNode[pnId][aListener.type] = 0
      }
      this.listenersPerNode[pnId][aListener.type] += 1
      i++
    }
  }

  _processFlatDom ({nodes}) {
    let i = 0
    let len = nodes.length
    let aNode
    let useName
    while (i < len) {
      aNode = nodes[i]
      if (aNode.localName !== '') {
        useName = aNode.localName
      } else if (aNode.nodeName !== '') {
        useName = aNode.nodeName.toLowerCase()
      } else {
        useName = ''
      }
      if (this.flatNodeCount[useName] === undefined) {
        this.flatNodeCount[useName] = 0
      }
      this.flatNodeCount[useName] += 1
      if (aNode.shadowRoots && aNode.shadowRoots.length > 0 && !Constants.noCheckShadow.has(useName)) {
        this.shadowRootInfo.count += aNode.shadowRoots.length
      }
      if (useName.indexOf('-') !== -1 || useName.indexOf('_') !== -1) {
        this.customElements.flat.count += 1
        if (this.customElements.flat.byName[useName] === undefined) {
          this.customElements.flat.byName[useName] = 0
        }
        this.customElements.flat.byName[useName] += 1
      }
      i++
    }
  }

  _processDomSnapshot ({domNodes}) {
    let i = 0
    let len = domNodes.length
    let aNode
    let nname
    let j
    let len2
    let att
    let atKey
    let relKey
    let hrefVal
    let asVal
    while (i < len) {
      aNode = domNodes[i]
      // console.log(aNode)
      nname = aNode.nodeName.toLowerCase()
      if (this.snapShotNodeCount[nname] === undefined) {
        this.snapShotNodeCount[nname] = 0
      }
      this.snapShotNodeCount[nname] += 1
      if (nname.indexOf('-') !== -1 || nname.indexOf('_') !== -1) {
        this.customElements.snap.count += 1
        if (this.customElements.snap.byName[nname] === undefined) {
          this.customElements.snap.byName[nname] = 0
        }
        this.customElements.snap.byName[nname] += 1
      }
      if (aNode.attributes) {
        len2 = aNode.attributes.length
        j = 0
        this.attMap.clear()
        while (j < len2) {
          att = aNode.attributes[j]
          // console.log(att)
          if (att.name.indexOf(Constants.data) !== -1) {
            if (this.attributeInfo.dataCount[att.name] === undefined) {
              this.attributeInfo.dataCount[att.name] = 0
            }
            this.attributeInfo.dataCount[att.name] += 1
            if (!this.attributeInfo.react) {
              if (att.name.indexOf(Constants.dataReact) !== -1) this.attributeInfo.react = true
            }
          } else if (!this.attributeInfo.angular) {
            if (att.name.indexOf(Constants.ng) !== -1) this.attributeInfo.angular = true
          }
          att.name = (att.name || '').toLowerCase()
          att.value = (att.value || '').toLowerCase()
          if (nname === Constants.link || nname === Constants.meta) {
            this.attMap.set(att.name, att.value)
          }
          j++
        }
        if (len2 > 0) {
          if (nname === Constants.link) {
            if (this.attMap.has(Constants.rel)) {
              relKey = this.attMap.get(Constants.rel)
              if (Constants.preing.has(relKey)) {
                if (!this.attMap.has(Constants.as)) {
                  hrefVal = this.attMap.get(Constants.href)
                  atKey = `${relKey}-${mime.extension(mime.lookup(hrefVal))}`
                  if (this.attributeInfo.linkFun[atKey] === undefined) {
                    this.attributeInfo.linkFun[atKey] = 0
                  }
                  this.attributeInfo.linkFun[atKey] += 1
                } else {
                  asVal = this.attMap.get(Constants.as)
                  if (this.attMap.has(Constants.crossorigin) && this.attMap.get(Constants.crossorigin) !== '') {
                    atKey = `${relKey}-${asVal}-${Constants.crossorigin}`
                  } else if (this.attMap.get(Constants.referrerpolicy)) {
                    atKey = `${relKey}-${asVal}-originControlled`
                  } else {
                    atKey = `${relKey}-${asVal}`
                  }
                  if (this.attributeInfo.linkFun[atKey] === undefined) {
                    this.attributeInfo.linkFun[atKey] = 0
                  }
                  this.attributeInfo.linkFun[atKey] += 1
                }
              } else if (relKey === Constants.import) {
                atKey = Constants.import
                if (this.attributeInfo.linkFun[atKey] === undefined) {
                  this.attributeInfo.linkFun[atKey] = 0
                }
                this.attributeInfo.linkFun[atKey] += 1
              }
            }
          } else if (nname === Constants.meta) {
            if (this.attMap.has(Constants.httpEquiv)) {
              switch (this.attMap.get(Constants.httpEquiv)) {
                case Constants.csp: {
                  atKey = `${Constants.csp}-${this.attMap.get(Constants.content)}`
                  if (this.attributeInfo.metaFun[atKey] === undefined) {
                    this.attributeInfo.metaFun[atKey] = 0
                  }
                  this.attributeInfo.metaFun[atKey] += 1
                  break
                }
                case Constants.refresh: {
                  atKey = Constants.refresh
                  if (this.attributeInfo.metaFun[atKey] === undefined) {
                    this.attributeInfo.metaFun[atKey] = 0
                  }
                  this.attributeInfo.metaFun[atKey] += 1
                  break
                }
              }
            } else if (this.attMap.has(Constants.name)) {
              switch (this.attMap.get(Constants.name)) {
                case Constants.csrfParam: {
                  atKey = `${Constants.csrfParam}-${this.attMap.get(Constants.content)}`
                  if (this.attributeInfo.metaFun[atKey] === undefined) {
                    this.attributeInfo.metaFun[atKey] = 0
                  }
                  this.attributeInfo.metaFun[atKey] += 1
                  break
                }
                case Constants.csrfToken: {
                  if (this.attributeInfo.metaFun[Constants.csrfToken] === undefined) {
                    this.attributeInfo.metaFun[Constants.csrfToken] = 0
                  }
                  this.attributeInfo.metaFun[Constants.csrfToken] += 1
                  break
                }
              }
            }
          }
        }
      }
      if (aNode.isClickable) {
        if (this.whoIsClickableCount[nname] === undefined) {
          this.whoIsClickableCount[nname] = 0
        }
        this.whoIsClickableCount[nname] += 1
      }
      i++
    }
  }
}

module.exports = DomProcessor
