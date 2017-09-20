const chalk = require('chalk')
const PrettyError = require('pretty-error')
const pe = new PrettyError()

class ColorPrinter {
  static yellow (...args) {
    console.log(chalk.yellow(...args))
  }

  static green (...args) {
    console.log(chalk.green(...args))
  }

  static red (...args) {
    console.log(chalk.red(...args))
  }

  static bred (...args) {
    console.log(ColorPrinter.red(...args))
  }

  static blue (...args) {
    console.log(chalk.blue(...args))
  }

  static cyan (...args) {
    console.log(chalk.cyan(...args))
  }

  static magenta (...args) {
    console.log(chalk.magenta(...args))
  }

  static error (m, error) {
    console.log(chalk.bold.red(m))
    console.log(pe.render(error))
  }

  static boldBlueGreen (bb, ...rest) {
    console.log(chalk.bold.blue(bb), chalk.green(...rest))
  }

  static crawlerOpt (f, ...r) {
    console.log(chalk.bold.blue(f), chalk.bold.yellow(...r))
  }

  static configError (m, config) {
    console.log(ColorPrinter.red(m))
    console.log(chalk.red(JSON.stringify(config, null, '\t')))
  }
}

module.exports = ColorPrinter
