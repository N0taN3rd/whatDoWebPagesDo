const util = require('util')

const inspectConfig = { depth: null }

module.exports = inspectMe => {
  console.log(util.inspect(inspectMe, inspectConfig))
}
