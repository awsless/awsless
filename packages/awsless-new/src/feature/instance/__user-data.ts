import { Asset, Input, Node, Resource, unwrap } from '@awsless/formation'

export class UserData extends Resource {
	cloudProviderId = 'awsless-instance-user-data'

	private environments: { name: string; value: Input<string> }[] = []

	constructor(
		scope: Node,
		id: string,
		private props: {
			file?: Input<Asset>
			code: Input<{
				bucket: Input<string>
				key: Input<string>
			}>
		}
	) {
		super(scope, 'AWS::EC2::UserData', id, props)
	}

	get value() {
		return this.output(v => {
			const codeProps = unwrap(this.props.code)
			const code = [
				`mkdir /var/code`,
				`cd /var`,
				`sudo -u ubuntu aws s3 cp s3://${codeProps.bucket}/${codeProps.key} ./`,
				`sudo -u ubuntu unzip -o ${codeProps.key} -d ./code`,
				`cd /var/code`,
			].join('\n')

			const exports = this.environments.map(env => `export ${env.name}="${unwrap(env.value)}"`).join('\n')
			const template = `\n${exports}\n\n${code}\n\n${v.userData ?? ''}`

			return Buffer.from(template, 'utf8').toString('base64')
		})
	}

	addEnvironment(name: string, value: Input<string>) {
		this.environments.push({ name, value })
		this.registerDependency(value)
		return this
	}

	toState() {
		return {
			document: {},
			assets: {
				file: this.props.file,
			},
		}
	}
}
