module.exports = oObject => new Proxy(oObject, {
  get (target, key) {
    let v = target[ key ]
    if (v === undefined || v === null) {
      target[ key ] = 0
    }
    return target[ key ]
  },
  set (target, key, value) {
    if (typeof value !== 'number') {
      throw new TypeError(`the value of ${key} was ${typeof value}, expected number`)
    }
    target[ key ] = value
    return true
  },
  has (target, prop) {
    return prop in target
  },
  ownKeys (target) {
    return Reflect.ownKeys(target)
  },
  getOwnPropertyDescriptor (target, prop) {
    return Reflect.getOwnPropertyDescriptor(target, prop)
  }
})
