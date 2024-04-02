// import { program } from '../src/cli/program.js'

import { program } from '../src/cli/program.js'

// // process.env.AWSLESS_CLI = '1'
// program.parse('awsless ')

// program.parse(['', 'awsless', 'build', '-h'])
const commands = process.argv.slice(2)

program.parse(['', 'awsless', ...commands, '--config-file', './example/app.json'])
