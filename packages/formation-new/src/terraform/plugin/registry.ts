import { arch, platform } from 'node:os'
import { compare } from 'semver'

const baseUrl = 'https://registry.terraform.io/v1/providers'

type VersionsResponse = {
	versions: {
		version: Version
		protocols: string[]
		platforms: { os: string; arch: string }[]
	}[]
}

export type Version = `${number}.${number}.${number}` | 'latest'

export const getProviderVersions = async (org: string, type: string) => {
	const resp = await fetch(`${baseUrl}/${org}/${type}/versions`)
	const data: VersionsResponse = await resp.json()
	const versions = data.versions
	const os = platform()
	const ar = arch()
	const supported = versions.filter(v => {
		return !!v.platforms.find(p => p.os === os && p.arch === ar)
	})
	const sorted = supported.sort((a, b) => compare(a.version, b.version))
	const latest = sorted.at(-1)

	if (!latest) {
		throw new Error('Version is unsupported for your platform.')
	}

	return {
		versions,
		supported,
		latest: latest.version,
	}
}

export const getProviderDownloadUrl = async (org: string, type: string, version: Version) => {
	const os = platform()
	const ar = arch()
	const url = [baseUrl, org, type, version, 'download', os, ar].join('/')

	const response = await fetch(url)
	const result = await response.json()

	return {
		url: result.download_url,
		shasum: result.shasum,
		protocols: result.protocols,
	}
}
