
import { request } from 'node:https'
import { toException } from './error.js'

export type ErrorMetaData = { [key:string]: unknown | { [key:string]: unknown } }

interface NotifyOptions {
	metaData?: ErrorMetaData
	unhandled?: boolean
	severity?: 'error'|'warn'|'info'
}

export class Bugsnag {
	private apiKey: string

	constructor(apiKey: string) {
		this.apiKey = apiKey
	}

	notify(error:Error, options:NotifyOptions = {}) {
		return new Promise((resolve, reject) => {
			const req = request({
				hostname: 'notify.bugsnag.com',
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					'Bugsnag-Api-Key': this.apiKey,
					'Bugsnag-Payload-Version': 5,
					'Bugsnag-Sent-At': (new Date()).toISOString()
				}
			}, (response) => {
				const buffers:Buffer[] = []
				response.on('data', (chunk:Buffer) => {
					buffers.push(chunk)
				})

				response.on('end', () => {
					const json = Buffer.concat(buffers).toString()
					resolve(json === 'OK')
				})
			})

			req.on('error', reject)
			req.end(this.requestBody(error, options))
		})
	}

	private requestBody(error:Error, { metaData = {}, unhandled = false } = {}) {
		return JSON.stringify({
			apiKey: this.apiKey,
			payloadVersion: '5',
			notifier: {
				name: '@awsless/bugsnag',
				version: '0.0.1',
				url: 'https://github.com/awsless/awsless/tree/master/packages/bugsnag',
			},
			events: [
				{
					exceptions: [ toException(error) ],
					unhandled,
					severity: 'error',
					context: process.env.AWS_LAMBDA_FUNCTION_NAME,
					app: {
						versionCode: process.env.AWS_LAMBDA_FUNCTION_VERSION,
					},
					metaData: {
						...metaData,
						lambda: {
							name: process.env.AWS_LAMBDA_FUNCTION_NAME,
							version: process.env.AWS_LAMBDA_FUNCTION_VERSION,
							region: process.env.AWS_REGION,
							runtime: process.env.AWS_EXECUTION_ENV,
							memorySize: process.env.AWS_LAMBDA_FUNCTION_MEMORY_SIZE,
						}
					}
				}
			]
		})
	}
}
