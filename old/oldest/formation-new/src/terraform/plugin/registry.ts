import { arch, platform } from 'node:os'
import { compare } from 'semver'

const baseUrl = 'https://registry.terraform.io/v1/providers'

type VersionsResponse = {
	versions: {
		version: Version
		protocols: string[]
		platforms: { os: OS; arch: Architecture }[]
	}[]
}

export type Version = `${number}.${number}.${number}` | 'latest'

export const getProviderVersions = async (org: string, type: string) => {
	const resp = await fetch(`${baseUrl}/${org}/${type}/versions`)
	const data: VersionsResponse = await resp.json()
	const versions = data.versions
	const os = getOS()
	const ar = getArchitecture()
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
	const url = [
		//
		baseUrl,
		org,
		type,
		version,
		'download',
		getOS(),
		getArchitecture(),
	].join('/')

	const response = await fetch(url)
	const result = await response.json()

	return {
		url: result.download_url,
		shasum: result.shasum,
		protocols: result.protocols,
	}
}

type OS = 'linux' | 'windows' | 'darwin' | 'freebsd' | 'openbsd'

const getOS = (): OS => {
	const os = platform()
	switch (os) {
		case 'linux':
			return 'linux'
		case 'win32':
			return 'windows'
		case 'darwin':
			return 'darwin'
		case 'freebsd':
			return 'freebsd'
		case 'openbsd':
			return 'openbsd'
	}

	throw new Error(`Unsupported OS platform: ${os}`)
}

type Architecture = 'arm' | 'arm64' | 'amd64' | '386'

const getArchitecture = (): Architecture => {
	const ar = arch()
	switch (ar) {
		case 'arm':
			return 'arm'
		case 'arm64':
			return 'arm64'
		case 'x64':
			return 'amd64'
		case 'ia32':
			return '386'
	}

	throw new Error(`Unsupported architecture: ${ar}`)
}
