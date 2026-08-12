import { program } from '../../src/cli/program.js'

// program.parse(['', 'awsless', 'build', '-h'])
const commands = process.argv.slice(2)

program.parse(['', 'awsless', ...commands, '--config-file', './example/kennedy/app.jsonc'])
