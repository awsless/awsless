import { useEffect, useState } from "react"
import { AssetOptions, Assets } from "../../../util/assets.js"
import { Box, Spacer, Text, useStdout } from "ink"
import Spinner from "ink-spinner"
import { Stack } from "aws-cdk-lib"

export const BuildAssets = ({ assets }: { assets:Assets }) => {

	const [ tasks, setTasks ] = useState<[string, AssetOptions[]][]>([])
	const { stdout } = useStdout()

	useEffect(() => {
		setTasks(Object.entries(assets.list()))
	}, [assets])

	const space = (asset: AssetOptions) => {
		return stdout.rows - asset.resource.length - asset.resourceName.length - 4
	}

	return (
		<Box flexDirection='column' gap={1}>
			{tasks.map(([ stackName, assets ]) => (
				<Box key={stackName} flexDirection="column">
					<Box paddingLeft={2}>
						<Text color='whiteBright' bold>{stackName}</Text>
					</Box>
					{assets.map(asset => (
						<Box key={asset.id} gap={1}>
							<Text color="blue">
								<Spinner type="dots" />
							</Text>
							<Text color='yellow'>{process.stdout.rows.toString()}</Text>
							<Text color='blue'>{asset.resourceName}</Text>
							<Text color='gray' dimColor>{'─'.repeat(space(asset) + 20)}</Text>
						</Box>
					))}
				</Box>
			))}
		</Box>
	)
}
