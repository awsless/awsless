import { arch, platform } from 'os'
import { compare } from 'semver'

const baseUrl = 'https://registry.terraform.io/v1/providers'

type Meta = [
	{
		version: string
		protocols: string[]
		platforms: { os: string; arch: string }[]
	},
]

export class TerraformRegistryProvider {
	static async load(org: string, type: string) {
		const url = `${baseUrl}/${org}/${type}/versions`
		const response = await fetch(url)
		const meta = await response.json()

		return new TerraformRegistryProvider(org, type, meta.versions)
	}

	constructor(
		readonly org: string,
		readonly type: string,
		private meta: Meta
	) {}

	get versions() {
		return this.meta
			.map(
				meta =>
					new TerraformRegistryProviderVersion(
						this.org,
						this.type,
						meta.version,
						meta.protocols,
						meta.platforms
					)
			)
			.sort((a, b) => {
				return compare(a.version, b.version)
			})
	}

	get latestVersion() {
		return this.versions.at(-1)
	}
}

export class TerraformRegistryProviderVersion {
	constructor(
		readonly org: string,
		readonly type: string,
		readonly version: string,
		readonly protocols: string[],
		readonly platforms: { os: string; arch: string }[]
	) {}

	get supported() {
		const os = platform()
		const ar = arch()

		return !!this.platforms.find(platform => {
			return platform.os === os && platform.arch === ar
		})
	}

	async getDownloadUrl(): Promise<string> {
		if (!this.supported) {
			throw new Error('Version is unsupported for your platform.')
		}

		const url = [
			//
			baseUrl,
			this.org,
			this.type,
			this.version,
			'download',
			platform(),
			arch(),
		].join('/')

		const response = await fetch(url)
		const result = await response.json()

		return result.download_url
	}
}
