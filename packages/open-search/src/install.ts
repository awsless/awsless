import { download } from './server/download'
import { downloadJdk } from './server/jdk'
import { VERSION_2_8_0 } from './server/version'

// Pre-warm the local engine cache at install time, so the first test
// run or `awsless dev` doesn't block on a big download. A failure never
// breaks the install - the runtime download stays as the fallback.
const main = async () => {
	// CI installs skip the pre-warm - jobs that actually run the engine
	// still download it lazily on first use.
	if (process.env.AWSLESS_SKIP_OPENSEARCH_DOWNLOAD || process.env.CI) {
		return
	}

	// The install hook runs with the package folder as the working
	// directory, while the engine cache belongs to the project that is
	// installing us.
	if (process.env.INIT_CWD) {
		process.chdir(process.env.INIT_CWD)
	}

	await download(VERSION_2_8_0.version)

	// The bundle only ships a linux or windows jdk, every other
	// platform runs the bundle on a downloaded jdk.
	if (process.platform !== 'linux' && process.platform !== 'win32') {
		await downloadJdk()
	}
}

main().catch(error => {
	console.warn(`Pre-downloading OpenSearch failed: ${error instanceof Error ? error.message : error}`)
	console.warn('The download will run on the first use instead.')
})
