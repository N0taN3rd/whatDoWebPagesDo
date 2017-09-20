const microtime = require('microtime')

class DomWatcher {
  constructor (dom, domDebugger) {
    this._dom = dom
    this._domDebugger = domDebugger
    this._setChildNodes = []
    this._childNodesInserted = []
    this._shadowRootPushed = []
    this._shadowRootPopped = []
    this._attsModified = []
    this._attsRemoved = []
    this._onSetChildNodes = this._onSetChildNodes.bind(this)
    this._onChildNodeInserted = this._onChildNodeInserted.bind(this)
    this._onAttributeModified = this._onAttributeModified.bind(this)
    this._onAttributeRemoved = this._onAttributeRemoved.bind(this)
    this._onShadowRootPushed = this._onShadowRootPushed.bind(this)
    this._onShadowRootPopped = this._onShadowRootPopped.bind(this)
    this._dom.setChildNodes(this._onSetChildNodes)
    this._dom.childNodeInserted(this._onChildNodeInserted)
    this._dom.shadowRootPushed(this._onShadowRootPushed)
    this._dom.shadowRootPopped(this._onShadowRootPopped)
    this._dom.attributeModified(this._onAttributeModified)
    this._dom.attributeRemoved(this._onAttributeRemoved)
  }

  getFlatDom () {
    return this._dom.getFlattenedDocument({ depth: -1, pierce: true }).then(flatDom => {
      this._flatDom = flatDom
      return flatDom
    })
  }

  getDomSnapShot (domSnapshot) {
    return domSnapshot.getSnapshot({ computedStyleWhitelist: [] }).then(domSnapshot => {
      this._domSnapshot = domSnapshot
      return domSnapshot
    })
  }

  async extractEventListeners (runtime) {
    const flatDom = await this.getFlatDom()
    let len = flatDom.nodes.length
    let i = 0
    let elm
    let resolvedNode, maybeListeners
    let evLen
    let j = 0
    let releaseRemotes = []
    for (; i < len; ++i) {
      elm = flatDom.nodes[ i ]
      try {
        resolvedNode = await this._dom.resolveNode({ nodeId: elm.nodeId })
        maybeListeners = await this._domDebugger.getEventListeners({ objectId: resolvedNode.object.objectId })
      } catch (error) {
        continue
      }
      evLen = maybeListeners.listeners.length
      if (evLen > 0) {
        j = 0
        for (; j < evLen; ++j) {
          this._eventListeners.push(Object.assign({}, maybeListeners.listeners[ j ], elm))
        }
      }
      releaseRemotes.push(runtime.releaseObject({ objectId: resolvedNode.object.objectId }))
    }
    try {
      await Promise.all(releaseRemotes)
    } catch (error) {
      console.error('releasing remotes', error)
    }
  }

  start () {
    this._flatDom = null
    this._domSnapshot = null
    this._eventListeners = []
    this._setChildNodes = []
    this._childNodesInserted = []
    this._shadowRootPushed = []
    this._shadowRootPopped = []
    this._attsModified = []
    this._attsRemoved = []
  }

  toJSON () {
    return {
      flatDom: this._flatDom,
      domSnapshot: this._domSnapshot,
      eventListeners: this._eventListeners,
      setChildNodes: this._setChildNodes,
      childNodesInserted: this._childNodesInserted,
      shadowRootPushed: this._shadowRootPushed,
      shadowRootPopped: this._shadowRootPopped,
      attsModified: this._attsModified,
      attsRemoved: this._attsRemoved
    }
  }

  _onSetChildNodes (info) {
    info.time = { mnow: microtime.now() }
    this._setChildNodes.push(info)
  }

  _onChildNodeInserted (info) {
    info.time = { mnow: microtime.now() }
    this._childNodesInserted.push(info)
  }

  _onAttributeModified (info) {
    info.time = { mnow: microtime.now() }
    this._attsModified.push(info)
  }

  _onAttributeRemoved (info) {
    info.time = { mnow: microtime.now() }
    this._attsRemoved.push(info)
  }

  _onShadowRootPushed (info) {
    info.time = { mnow: microtime.now() }
    this._shadowRootPushed.push(info)
  }

  _onShadowRootPopped (info) {
    info.time = { mnow: microtime.now() }
    this._shadowRootPopped.push(info)
  }
}

module.exports = DomWatcher
