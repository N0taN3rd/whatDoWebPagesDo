const EventEmitter = require('eventemitter3')
const filName = require('filenamify-url')
const Promise = require('bluebird')
const fs = require('fs-extra')
const _ = require('lodash')
const LiveWebCrawler = require('./lib/liveWebCrawler')

const crawler = LiveWebCrawler.withAutoClose()

const doCrawler = true

async function doIt () {
  if (doCrawler) {
    let curSeed
    const seedList = await fs.readJSON('todoTwitterSeedsList.json')
    // const seedList = [ { url: 'http://wsdl-docker.cs.odu.edu:8080/tests/polymer' } ]
    // for (let i = 0; ; ++i) {
    //   let cur = seedList.shift()
    //   if (cur.c === 1182) {
    //     break
    //   }
    // }
    await crawler.init()
    crawler.on('network-idle', async () => {
      console.log('idle network')
      await crawler.getExtraInfo()
      crawler.netStop()
      try {
        await fs.writeJSON(`twitterSeedDump2/${curSeed.c}-${filName(curSeed.url)}.json`, crawler)
      } catch (error) {
      }
      curSeed = seedList.shift()
      if (curSeed) {
        console.log(curSeed)
        crawler.goto(curSeed.url)
      } else {
        console.log('done')
        crawler.close()
      }
    })

    crawler.on('navigation-timedout', async () => {
      await crawler.stop()
      curSeed = seedList.shift()
      if (curSeed) {
        console.log(curSeed)
        crawler.goto(curSeed.url)
      } else {
        crawler.close()
      }
    })

    crawler.on('navigated', () => {
      console.log('navigated')
    })
    curSeed = seedList.shift()
    crawler.goto(curSeed.url)
    console.log(curSeed)
  } else {
    const protocol = await LiveWebCrawler.getProtocolDef()
    protocol.descriptor.domains = _.sortBy(protocol.descriptor.domains, 'domain')
    await fs.writeJSON('protocolDump.json', protocol, {spaces: 2})
    console.log('done')
    process.exit()
  }
}

doIt().catch((error) => {
  console.error(error)
  crawler.close()
})
