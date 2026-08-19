import { auth } from './auth/index.js'
import { bind } from './bind.js'
import { bootstrap } from './bootstrap.js'
import { build } from './build.js'
import { config } from './config/index.js'
import { cron } from './cron/index.js'
import { del } from './delete.js'
import { deploy } from './deploy.js'
import { deployments } from './deployment.js'
import { dev } from './dev.js'
import { domain } from './domain/index.js'
import { icon } from './icon/index.js'
import { image } from './image/index.js'
import { logs } from './logs/index.js'
import { prune } from './prune.js'
import { resources } from './resources.js'
import { rollback } from './rollback.js'
import { run } from './run.js'
import { state } from './state/index.js'
import { test } from './test.js'
import { types } from './types.js'

export const commands = [
	bootstrap,
	types,
	build,
	deploy,
	deployments,
	rollback,
	prune,
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
	cron,
	image,
	icon,
]
