
import { BigFloat, Numeric } from "@awsless/big-float";
import { Struct } from "./struct";

export const bigfloat = () => new Struct<string, Numeric, BigFloat>(
	(value) => new BigFloat(value).toString(),
	(value) => new BigFloat(value),
	{ type: 'double' }
)
