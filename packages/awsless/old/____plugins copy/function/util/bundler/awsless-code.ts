import { Build } from '../build.js'
import { bundle } from "@awsless/code"
import { createHash } from "crypto"

export const awslessBuild:Build = async (file) => {
	const { code, map } = await bundle(file, {
		format: 'esm',
		sourceMap: true,
		minimize: true,
		onwarn: () => {},
		moduleSideEffects: (id) => file === id,
		external: (importee) => (
			importee.startsWith('aws-sdk') ||
			importee.startsWith('@aws-sdk')
		),
	})

	const hash = createHash('sha1').update(code).digest('hex')

	return {
		handler: 'index.default',
		hash,
		files: [
			{ name: 'index.js', code, map: map?.toString() }
		]
	}
}
