const DataLoader = require('./analysis/dataLoader')
const DumpProcessor = require('./analysis/dumpProcessor')
const ArchivedDumpProcessor = require('./analysis/archive/dumpProcessor')
const runPromise = require('./runPromise')
const fs = require('fs-extra')
const _ = require('lodash')
const path = require('path')
const {URL} = require('url')
const isURL = require('validator/lib/isURL')

// analizedDump

async function doIt () {
  const apps = await DataLoader.loadApps()
  const dumpProcessor = DumpProcessor.newOne(apps)
  const dumps = await DataLoader.sortedRead()
  let i = 0
  let len = dumps.length
  let aDump
  while (i < len) {
    // console.log(dumps[i])
    aDump = await DataLoader.getJsonData(dumps[i].path)
    dumpProcessor.init()
    dumpProcessor.process(aDump, dumps[i].rank)
    await fs.writeJSON(`analizedDump/${dumps[i].fname}`, dumpProcessor, {spaces: 2})
    i++
  }
}

async function doIt2 () {
  const apps = await DataLoader.loadApps()
  const dumpProcessor = ArchivedDumpProcessor.newOne(apps)
  const dumps = await DataLoader.listDir('archiveDumps')
  let i = 0
  let len = dumps.length
  let aDump
  let wasError = false
  // console.log(dumps.filter(it => _.isNil(it.path)))
  while (i < len) {
    // console.log(dumps[i].fname)
    if (dumps[i] !== undefined) {
      wasError = false
      aDump = await DataLoader.getJsonData(dumps[i].path)
      dumpProcessor.init()
      try {
        dumpProcessor.process(aDump)
      } catch (error) {
        // console.error(error)
        wasError = true
      }
      if (!wasError) {
        await fs.writeJSON(`analizedArchiveDumps/${dumps[i].fname}`, dumpProcessor, {spaces: 2})
      }
    }
    i++
  }
}

async function doIt3 () {
  // const twitterSeedList = await DataLoader.getJsonData('twitterSeedList.json')
  // const twitterSeedListTodo = await DataLoader.getJsonData('todoTwitterSeedsList.json')
  // console.log(twitterSeedList.length)
  // console.log(twitterSeedListTodo.length)
  const apps = await DataLoader.loadApps()
  const dumpProcessor = DumpProcessor.newOne(apps)
  const twitterDump = await DataLoader.listDir('twitterSeedDump')
  let len = twitterDump.length
  let i = 0
  let aDump
  while (i < len) {
    aDump = await DataLoader.getJsonData(twitterDump[i].path)
    dumpProcessor.init()
    dumpProcessor.process(aDump)
    // console.log(dumpProcessor.domProcessor)
    await fs.writeJSON(`analizedTwitterDump/${twitterDump[i].fname}`, dumpProcessor, {spaces: 2})
    i++
  }
}

runPromise(doIt).then(() => runPromise(doIt2).then(() => runPromise(doIt3)).then(() => console.log('done')))
