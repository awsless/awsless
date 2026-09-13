import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { defineFeature } from '../../feature.js'
import { registerMediaServer } from '../image/index.js'
import { iconOnDev } from './dev.js'

export const iconFeature = defineFeature({
	name: 'icon',
	onDev: iconOnDev,
	onStack(ctx) {
		for (const [id, props] of Object.entries(ctx.stackConfig.icons ?? {})) {
			registerMediaServer(ctx, {
				kind: 'icon',
				id,
				router: props.router,
				path: props.path,
				cacheDuration: props.cacheDuration,
				origin: props.origin,
				handler: {
					file: join(dirname(fileURLToPath(import.meta.url)), '/handlers/icon.js'),
				},
				config: {
					preserveIds: props.preserveIds,
					symbols: props.symbols,
				},
				validateFile(file) {
					if (!file.endsWith('.svg')) {
						throw new Error(`Icon file "${file}" in "${props.origin.static}" is not an SVG file.`)
					}
				},
			})
		}
	},
})
