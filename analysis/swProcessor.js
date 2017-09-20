class SWProcessor {
  static newOne () {
    const sw = new SWProcessor()
    sw.init()
    return sw
  }

  init () {
    this.serviceWorkersInUse = 0
  }

  process ({registrationUpdates, versionUpdates, errors}) {
    let i = 0
    let j = 0
    let len2
    let len
    let sw = new Set()
    if (registrationUpdates) {
      len = registrationUpdates.length
      while (i < len) {
        if (registrationUpdates[i].versions) {
          len2 = registrationUpdates[i].versions.length
          while (j < len2) {
            if (registrationUpdates[i].versions[j].scriptURL) sw.add(registrationUpdates[i].versions[j].scriptURL)
            j++
          }
          j = 0
        }
        i++
      }
      i = 0
    }
    if (versionUpdates) {
      len = versionUpdates.length
      while (i < len) {
        len2 = versionUpdates[i].versions.length
        while (j < len2) {
          if (versionUpdates[i].versions[j].scriptURL) sw.add(versionUpdates[i].versions[j].scriptURL)
          j++
        }
        j = 0
        i++
      }
      i = 0
    }
    if (errors) {
      len = errors.length
      while (i < len) {
        if (errors[i].versions) {
          len2 = errors[i].versions.length
          while (j < len2) {
            if (errors[i].versions[j].scriptURL) sw.add(versionUpdates[i].versions[j].scriptURL)
            j++
          }
          j = 0
        }
        i++
      }
    }
    this.serviceWorkersInUse = sw.length
  }

  toJSON () {
    return {
      serviceWorkersInUse: this.serviceWorkersInUse
    }
  }
}

module.exports = SWProcessor
