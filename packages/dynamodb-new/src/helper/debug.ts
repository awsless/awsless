
export const debug = (options:{debug?:boolean} = {}, command:{input:unknown}) => {
	if(options.debug) {
		console.log('DynamoDB:', JSON.stringify(command.input, null, 2));
	}
}
