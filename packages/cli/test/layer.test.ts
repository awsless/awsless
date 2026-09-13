import { describe, expect, it } from 'vitest'
import { shortId } from '../src/util/id'
import { createTestApp, listResources } from './_kit'

const code = { file: { nocheck: './handler.ts' } }
const layers = { sharp: { file: { nocheck: './sharp.zip' }, packages: ['sharp'] } }

describe('layer', () => {
	it('publishes a layer version from the zip', () => {
		const { app, shared } = createTestApp({ app: { layers } })

		const layer = listResources(app, 'aws_lambda_layer_version')[0]!
		const zip = listResources(app, 'aws_s3_bucket_object').find(meta => meta.input.key === 'layer/sharp.zip')

		expect(layer.input.layerName).toBe(`test-app--layer--${shortId('sharp')}`)
		expect(layer.input.description).toBe('sharp')
		expect(zip).toBeDefined()
		expect(shared.entry('layer', 'packages', 'sharp')).toEqual(['sharp'])
	})

	it('attaches the layer to a stand-alone function', () => {
		const { app } = createTestApp({
			app: { layers },
			stacks: [{ name: 'stack-1', functions: { echo: { code, layers: ['sharp'] } } }],
		})

		const lambda = listResources(app, 'aws_lambda_function').find(
			meta => meta.input.functionName === 'test-app--stack-1--function--echo'
		)!

		expect(lambda.input.layers).toHaveLength(1)
	})

	it('rejects an unknown layer', () => {
		expect(() =>
			createTestApp({
				stacks: [{ name: 'stack-1', functions: { echo: { code, layers: ['missing'] } } }],
			})
		).toThrow('Layer "missing" is not defined')
	})
})
