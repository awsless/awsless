import { bootstrap } from './bootstrap.js'
import { build } from './build.js'
import { config } from './config/index.js'
import { del } from './delete.js'
import { deploy } from './deploy.js'
import { diff } from './diff.js'
import { types } from './types.js'
import { test } from './test.js'
import { resource } from './resource/index.js'
import { dev } from './dev.js'
import { state } from './state/index.js'
import { auth } from './auth/index.js'
import { bind } from './bind.js'

export const commands = [
	bootstrap,
	types,
	build,
	deploy,
	diff,
	del,
	dev,

	bind,

	auth,
	state,
	resource,
	config,
	test,
]
