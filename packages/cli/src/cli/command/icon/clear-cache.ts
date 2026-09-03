import { Command } from 'commander'
import { clearProxyCache } from '../util.js'

export const clearCache = (program: Command) => clearProxyCache(program, 'icon')
