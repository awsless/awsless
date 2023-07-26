import { Table, getResourceName } from "../../src/node/resource";

// import { capitalCase } from "change-case"

export default () => {
	console.log(getResourceName('table', 'stats'))

	//@ts-ignore
	console.log(Table.stats)
}
