
import { Struct } from "./struct";

export const ttl = () => new Struct<string, Date, Date>(
	'N',
	(value) => String(Math.floor(value.getTime() / 1000)),
	(value) => new Date(Number(value) * 1000)
	// (value) => {
	// 	console.log('VALUE SET', Math.floor(value.getTime() / 1000));

	// 	return String(Math.floor(value.getTime() / 1000))
	// },
	// (value) => {
	// 	console.log('VALUE GET', value);

	// 	return new Date(Number(value) * 1000)
	// }
)
