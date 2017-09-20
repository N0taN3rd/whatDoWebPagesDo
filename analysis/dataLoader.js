const Path = require('path')
const fs = require('fs-extra')
const _ = require('lodash')
const humanize = require('humanize')

const cwd = process.cwd()
const theDumpP = Path.join(cwd, 'theDump')

function asArray (value) {
  return typeof value === 'string' ? [value] : value
}

function parsePatterns (patterns) {
  var key, parsed = {}

  // Convert string to object containing array containing string
  if (typeof patterns === 'string' || patterns instanceof Array) {
    patterns = {
      main: asArray(patterns)
    }
  }

  for (key in patterns) {
    parsed[key] = []

    asArray(patterns[key]).forEach(pattern => {
      var attrs = {}

      pattern.split('\\;').forEach((attr, i) => {
        if (i) {
          // Key value pairs
          attr = attr.split(':')

          if (attr.length > 1) {
            attrs[attr.shift()] = attr.join(':')
          }
        } else {
          attrs.string = attr

          try {
            attrs.regex = new RegExp(attr.replace('/', '\/'), 'ig') // Escape slashes in regular expression
          } catch (e) {
            attrs.regex = new RegExp()
          }
        }
      })

      parsed[key].push(attrs.regex)
    })
  }

  // Convert back to array if the original pattern list was an array (or string)
  if (parsed.hasOwnProperty('main')) {
    parsed = parsed.main
  }

  return parsed
}

class DataLoader {
  static fileSize (path) {
    return fs.stat(path).then(stated => humanize.filesize(stated.size))
  }

  static joinTheDump (fileOrPath) {
    return Path.join(theDumpP, fileOrPath)
  }

  static sortedRead () {
    const tenKList = require('../tenKUrls')
    return fs.readdir('theDump').then(list => _.sortBy(list.map(fname => {
      let bname = Path.basename(fname, '.json')
      let rankInfo = _.find(tenKList, ({url}) => url.includes(bname))
      return {
        fname,
        path: DataLoader.joinTheDump(fname),
        bname,
        rank: +rankInfo.rank,
        url: rankInfo.url
      }
    }), 'rank'))
  }

  static specificTenKInfo (whichOne) {
    const tenKList = require('../tenKUrls')
    let specificOne = _.find(tenKList, ({url}) => url === whichOne)
    let bname = Path.basename(specificOne.url).substr(4)
    return {
      bname,
      fname: `${bname}.json`,
      path: DataLoader.joinTheDump(`${bname}.json`),
      url: specificOne.url,
      rank: +specificOne.rank
    }
  }

  static listDir (dirName) {
    return fs.readdir(dirName).then(list => list.map(dirItem => ({
      path: Path.join(dirName, dirItem),
      bname: Path.basename(dirItem, '.json'),
      fname: dirItem
    })))
  }

  static getJsonData (jsonFile, dir) {
    if (dir) {
      return fs.readJSON(Path.join(dir, jsonFile))
    }
    return fs.readJSON(jsonFile)
  }

  static loadApps () {
    return fs.readJSON('apps.json').then(appData => {
      let apps = []
      for (let [k, v] of Object.entries(appData.apps)) {
        if (v.env) {
          // console.log(v.env)
          if (Array.isArray(v.env)) {
            v.env = v.env.map(env => {
              if (env.endsWith('$')) {
                env = env.slice(0, -1)
              }
              return env
            })
          } else {
            if (v.env.endsWith('$')) {
              v.env = v.env.slice(0, -1)
            }
          }
          apps.push({
            name: k,
            regex: parsePatterns(v.env),
            cat: _.maxBy(v.cats.map(cat => appData.categories[cat]), ({priority}) => +priority).name
          })
        }
      }
      return apps
    })
  }
}

module.exports = DataLoader
