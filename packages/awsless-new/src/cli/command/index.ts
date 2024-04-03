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

export const commands = [
	bootstrap,
	types,
	build,
	deploy,
	diff,
	del,
	dev,

	// bind,

	resource,
	config,
	test,
]
