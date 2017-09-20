const leakedEvn = new Set(['USBOutTransferResult',
  'USBIsochronousOutTransferResult',
  'USBIsochronousOutTransferPacket',
  'USBIsochronousInTransferResult',
  'USBIsochronousInTransferPacket',
  'USBInTransferResult',
  'USBInterface',
  'USBEndpoint',
  'USBDevice',
  'USBConnectionEvent',
  'USBConfiguration',
  'USBAlternateInterface',
  'USB',
  'PaymentResponse',
  'PaymentRequestUpdateEvent',
  'PaymentRequest',
  'PaymentAddress',
  'VisualViewport',
  'DOMRectReadOnly',
  'DOMRect',
  'DOMQuad',
  'DOMPointReadOnly',
  'DOMPoint',
  'DOMMatrixReadOnly',
  'DOMMatrix',
  'NetworkInformation',
  'Clipboard',
  'visualViewport'])

class EnvProcessor {
  constructor (apps) {
    this.apps = apps
  }

  static newOne (apps) {
    return new EnvProcessor(apps)
  }

  process (addedEnv) {
    this.addenv = {
      count: 0,
      found: {}
    }
    let i = 0
    let len = addedEnv.length
    let ae
    while (i < len) {
      ae = addedEnv[i]
      if (!leakedEvn.has(ae)) {
        this._testEnvString(ae)
        this.addenv.count += 1
      }
      i++
    }
  }

  _testEnvString (env) {
    let i = 0
    let j
    let len2
    let len
    let found = false
    len = this.apps.length
    while (i < len) {
      j = 0
      len2 = this.apps[i].regex.length
      while (j < len2) {
        found = this.apps[i].regex[j].test(env)
        if (found) {
          if (this.addenv.found[this.apps[i].cat] === undefined) {
            this.addenv.found[this.apps[i].cat] = 0
          }
          this.addenv.found[this.apps[i].cat] += 1
          break
        }
        j++
      }
      if (found) {
        break
      }
      i++
    }
  }

  toJSON () {
    return {
      ...this.addenv
    }
  }
}

module.exports = EnvProcessor
