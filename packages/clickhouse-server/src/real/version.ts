// The pinned ClickHouse release, an LTS line like the one ClickHouse
// Cloud runs. The digests are the ones GitHub lists for the release
// assets, so a tampered or truncated download never runs.
export const VERSION = '26.8.33.10'

export type Asset = {
	url: string
	sha256: string
	// The tarballs hold the binary at this path, the macOS builds are the
	// bare binary.
	member?: string
}

const release = `https://github.com/ClickHouse/ClickHouse/releases/download/v${VERSION}-lts`

const ASSETS: Record<string, Asset> = {
	'darwin-arm64': {
		url: `${release}/clickhouse-macos-aarch64`,
		sha256: '9959b71b1d255e2135f1e80166d05a836aab4afae029cc654ff5fe267a9e6599',
	},
	'darwin-x64': {
		url: `${release}/clickhouse-macos`,
		sha256: 'feaf85b436f8e12d72878466405ba1194fb2451c0decf4551d08645a9594efb3',
	},
	'linux-arm64': {
		url: `${release}/clickhouse-common-static-${VERSION}-arm64.tgz`,
		sha256: '1f4a60b3e65e09c07cb18d11026717deb0bfc3096addac5042c3208531c289ae',
		member: `clickhouse-common-static-${VERSION}/usr/bin/clickhouse`,
	},
	'linux-x64': {
		url: `${release}/clickhouse-common-static-${VERSION}-amd64.tgz`,
		sha256: '4b11daf6b9abd18a7c14cfd839d837ced74c39c71be0f945338deabbe4ed4224',
		member: `clickhouse-common-static-${VERSION}/usr/bin/clickhouse`,
	},
}

export const getAsset = (platform: string = process.platform, arch: string = process.arch): Asset => {
	const asset = ASSETS[`${platform}-${arch}`]

	if (!asset) {
		throw new Error(`ClickHouse has no build for ${platform} ${arch}. Run it on macOS or Linux.`)
	}

	return asset
}
