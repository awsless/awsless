import { mkdirSync, writeFileSync } from 'fs'
import { tmpdir } from 'os'
import { join } from 'path'
import { describe, expect, it } from 'vitest'
import { getFeatureFolder } from '../src/feature/asset/index'
import { createTestApp } from './_kit'

const code = { file: { nocheck: './origin.ts' } }

describe('image', () => {
	it('serves images from the bundle behind the router path', () => {
		const { shared } = createTestApp({
			app: { router: { main: {} } },
			stacks: [
				{
					name: 'stack-1',
					images: {
						photos: { router: 'main', path: '/images', presets: {}, extensions: { webp: {} }, origin: { function: { code } } },
					},
				},
			],
		})

		expect(shared.entry('image', 'distribution-id', 'photos')).toBeDefined()
		expect(shared.entry('image', 'cache', 'photos').prefix).toBe(
			`${getFeatureFolder('image', 'stack-1', 'photos')}cache/`
		)
	})

	it('requires an arm64 bundle for the sharp layer', () => {
		expect(() =>
			createTestApp({
				app: { router: { main: {} }, function: { architecture: 'x86_64' } },
				stacks: [
					{
						name: 'stack-1',
						images: {
							photos: { router: 'main', path: '/images', presets: {}, extensions: { webp: {} }, origin: { function: { code } } },
						},
					},
				],
			})
		).toThrow('requires an arm64 function bundle')
	})
})

describe('icon', () => {
	it('serves icons from the bundle behind the router path', () => {
		const { shared } = createTestApp({
			app: { router: { main: {} } },
			stacks: [
				{ name: 'stack-1', icons: { icons: { router: 'main', path: '/icons', origin: { function: { code } } } } },
			],
		})

		expect(shared.entry('icon', 'distribution-id', 'icons')).toBeDefined()
		expect(shared.entry('icon', 'cache', 'icons').prefix).toBe(`${getFeatureFolder('icon', 'stack-1', 'icons')}cache/`)
	})

	it('rejects static origin files that are no svg', () => {
		const dir = join(tmpdir(), `awsless-icons-${Date.now()}`)

		mkdirSync(dir, { recursive: true })
		writeFileSync(join(dir, 'logo.png'), '')

		const result = createTestApp({
			app: { router: { main: {} } },
			stacks: [
				{ name: 'stack-1', icons: { icons: { router: 'main', path: '/icons', origin: { static: { nocheck: dir } } } } },
			],
		})

		expect(() => result.ready()).toThrow('is not an SVG file')
	})
})
