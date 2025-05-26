import { bootstrap } from './bootstrap.js'
import { build } from './build.js'
import { config } from './config/index.js'
import { del } from './delete.js'
import { deploy } from './deploy.js'
// import { diff } from './__diff.js'
import { auth } from './auth/index.js'
import { bind } from './bind.js'
import { dev } from './dev.js'
import { resources } from './resources.js'
import { run } from './run.js'
import { state } from './state/index.js'
import { test } from './test.js'
import { types } from './types.js'
import { domain } from './domain/index.js'
import { logs } from './logs.js'

export const commands = [
	bootstrap,
	types,
	build,
	deploy,
	// diff,
	del,
	dev,

	bind,
	run,
	logs,

	auth,
	domain,
	state,
	resources,
	config,
	test,
]
