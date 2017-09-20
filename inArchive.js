const WDAPDCrawler = require('./lib/archiveCrawler')
const program = require('commander')
const fs = require('fs-extra')
const path = require('path')
const normalURL = require('normalize-url')
const Promise = require('bluebird')
const filName = require('filenamify-url')

function ensureURL (url) {
  url = normalURL(url, {
    normalizeProtocol: true,
    normalizeHttps: false,
    stripFragment: false,
    stripWWW: false,
    removeTrailingSlash: false,
    removeDirectoryIndex: false
  })
  return url
}

program
  .version('0.0.1')
  .option('-t, --tab', 'Crawl Using Another Tab')
  .option('-s, --seedlist <slp>', 'Seed List Path')
  .option('-d, --dump <where>', 'Data Dump Location')
  .parse(process.argv)

async function doIt () {
  // if (program.seedlist === undefined) {
  //   throw new Error('Seed List Is Undefined')
  // }
  // const isFileOrDir = await fs.stat(program.seedlist)
  // let seedList
  // if (isFileOrDir.isFile()) {
  //   if (!program.seedlist.endsWith('.json')) {
  //     throw new Error(`Seed List Must Be A JSON File: ${program.seedlist}`)
  //   }
  //   seedList = await fs.readJSON(program.seedlist)
  // } else {
  //   throw new Error(`Unknown Seed List ${program.seedlist}`)
  // }
  // if (seedList.length <= 0) {
  //   throw new Error(`No Seed List Provided`)
  // }
  let seedList = await fs.readJSON('/data/pyProjects/tenkTM/web.archive.org.json')
  let crawler
  if (program.tab !== undefined) {
    console.log('tabbedd')
    crawler = new WDAPDCrawler({newTab: true})
  } else {
    crawler = new WDAPDCrawler()
  }
  //
  seedList = seedList.filter(it => it.c >= 2953)
  let curSeed = seedList.shift()
  console.log(curSeed.c, seedList.length)
  curSeed.uri = ensureURL(curSeed.uri)
  await crawler.init()
  let threeXXX = 0
  let working = false
  crawler.on('network-idle', async () => {
    if (!working) {
      working = true
      console.log('idle network')
      await Promise.delay(10000)
      let wasError = false
      let where
      try {
        where = await crawler.whereAreWe()
        where = where.result.value
      } catch (error) {
        wasError = true
      }
      let gen = true
      if (!wasError) {
        if (where !== curSeed.uri) {
          working = false
          await crawler.stop()
          if (threeXXX < 1) {
            console.log('3xx', curSeed.uri)
            // console.log('3xx', where, curSeed)
            curSeed.uri = where
            crawler.goto(where)
            threeXXX += 1
          } else {
            threeXXX = 0
            curSeed.why = 'redirection'
            try {
              await fs.appendFile('baddUrls.log', `${JSON.stringify(curSeed)}\n`, 'utf8')
            } catch (error) {
              console.error(error)
            }
            curSeed = seedList.shift()
            console.log(curSeed.c, seedList.length)
            if (curSeed) {
              curSeed.uri = ensureURL(curSeed.uri)
              console.log(curSeed.uri)
              crawler.goto(curSeed.uri)
            } else {
              crawler.close()
            }
          }
          gen = false
        }
      }
      if (gen) {
        threeXXX = 0
        await crawler.getExtraInfo()
        try {
          await crawler.stop()
        } catch (error) {
          console.error(error)
        }
        try {
          await fs.writeJSON(`sldir3Dump/${curSeed.c}-${filName(curSeed.uri)}.json`, crawler)
        } catch (error) {
          console.error(error)
        }
        curSeed = seedList.shift()
        console.log(curSeed.c, seedList.length)
        if (curSeed) {
          working = false
          curSeed.uri = ensureURL(curSeed.uri)
          console.log(curSeed.uri)
          crawler.goto(curSeed.uri)
        } else {
          crawler.close()
        }
      }
    }
  })

  crawler.on('navigation-timedout', async () => {
    working = false
    console.log('nav timeout')
    try {
      await crawler.stop()
    } catch (error) {
      console.error(error)
    }
    curSeed.why = 'navigation'
    try {
      await fs.appendFile('baddUrls.log', `${JSON.stringify(curSeed)}\n`, 'utf8')
    } catch (error) {
      console.error(error)
    }
    curSeed = seedList.shift()
    console.log(curSeed.c, seedList.length)
    if (curSeed) {
      curSeed.uri = ensureURL(curSeed.uri)
      console.log(curSeed.uri)
      crawler.goto(curSeed.uri)
    } else {
      crawler.close()
    }
  })

  crawler.on('navigated', () => {
    console.log('navigated')
  })
  await Promise.delay(5000)
  console.log(curSeed.uri)
  crawler.goto(curSeed.uri)
  // const client = await Launcher.launch()
  // console.log(client)
  // console.log(await Launcher.newTab())
  // console.log(await Launcher.newTab())
  // console.log(await Launcher.newTab())
  // await fs.writeJSON('protocol.json', client.descriptor)
  // client.descriptor.domains.forEach(it => {
  //   console.log(it)
  // })
}

doIt().catch(error => {
  console.error(error)
})
