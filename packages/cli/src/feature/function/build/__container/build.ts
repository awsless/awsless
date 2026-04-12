import { exec } from 'promisify-child-process'

type Options = {
	name: string
	cwd: string
	architecture: string
}

export const buildDockerImage = async (opts: Options) => {
	const platform = opts.architecture === 'arm64' ? 'linux/arm64' : 'linux/amd64'

	await exec(`docker image -f rm ${opts.name}:latest 2> /dev/null || true`)
	const buildResponse = await exec(`docker buildx build --platform ${platform} -t ${opts.name}:latest .`, {
		cwd: opts.cwd,
	})

	if (buildResponse.code !== 0) {
		throw new Error(`Docker build failed: ${buildResponse.stderr}`)
	}

	const response = await exec(`docker image inspect ${opts.name}:latest`)

	if (response.code !== 0) {
		throw new Error(`Docker image inspect failed: ${response.stderr}`)
	}

	const data = JSON.parse(response.stdout as string)
	const image = data[0]

	return {
		id: image.Id,
		size: image.Size,
	}
}
