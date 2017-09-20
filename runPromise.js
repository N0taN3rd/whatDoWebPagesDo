const cp = require('./analysis/colorPrinter')
function thenNoop () {}
function defaultCatcher (err) {
  cp.error('A Fatal Error Occurred', err)
  cp.bred('Please Inform The Maintainer Of This Project About It. Information In package.json')
}

function runPromise (runnable, thener = thenNoop, catcher = defaultCatcher) {
  if (typeof runnable.then === 'function') {
    return runnable.then(thener).catch(catcher)
  } else {
    return runnable().then(thener).catch(catcher)
  }
}

module.exports = runPromise
