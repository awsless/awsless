import { Worker } from "worker_threads"
import { Build } from './build.js'

const cjs = typeof(require) !== 'undefined'
const importESM = `
import { bundle } from "@awsless/code";
import { createHash } from "crypto";
import { parentPort, workerData } from "worker_threads";
`

const importCJS = `
const { bundle } = require("@awsless/code");
const { createHash } = require("crypto");
const { parentPort, workerData } = require("worker_threads");
`

const workerCode = `
${cjs ? importCJS : importESM}

const build = async (file) => {
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

    parentPort.postMessage(JSON.stringify({
		handler: 'index.default',
		hash,
		files: [
			{ name: 'index.js', code, map: map?.toString() }
		]
	}))
}

build(workerData)
`

export const defaultBuild:Build = async (file) => {
	return new Promise((resolve, reject) => {
		const worker = new Worker(workerCode, { workerData: file, eval: true });
		const cleanUp = () => {
			worker.removeAllListeners()
			worker.terminate()
		}
		worker.on('message', (data:Buffer) => {
			resolve(JSON.parse(data.toString('utf8')))
			cleanUp()
		})

		worker.on('error', (data) => {
			reject(data)
			cleanUp()
		})

		worker.on('exit', (code) => {
			if(code !== 0)  {
				reject(new Error(`Worker exited with code ${code}`))
				cleanUp()
			}
		})
	})
}
