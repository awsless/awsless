import { CustomResource } from "../../formation/resource/cloud-formation/custom-resource"
import { Code } from "../../formation/resource/lambda/code"
import { Function } from "../../formation/resource/lambda/function"
import { Stack } from "../../formation/stack"
import { formatName } from "../../formation/util"
import { globalExportsHandlerCode } from "./handler"

export const extendWithGlobalExports = (appName: string, importable:Stack, exportable:Stack) => {
	let crossRegionExports: CustomResource

	importable.import = (name: string) => {
		name = formatName(name)

		if(!importable.exports.has(name)) {
			throw new TypeError(`Undefined global export value: ${name}`)
		}

		if(!crossRegionExports) {
			const lambda = new Function('global-exports', {
				name: `${appName}-global-exports`,
				code: Code.fromInline(globalExportsHandlerCode, 'index.handler'),
			})

			lambda.addPermissions({
				actions: [ 'cloudformation:ListExports' ],
				resources: [ '*' ],
			})

			crossRegionExports = new CustomResource('global-exports', {
				serviceToken: lambda.arn,
				properties: {
					region: importable.region
				}
			})

			exportable.add(crossRegionExports)
		}

		return crossRegionExports.getAtt(name)
	}

}
