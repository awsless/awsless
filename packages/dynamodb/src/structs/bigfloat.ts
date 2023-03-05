
import { BigFloat, Numeric } from "@awsless/big-float";
import { Struct } from "./struct";

export const bigfloat = () => new Struct<string, Numeric, BigFloat>(
	'N',
	(value) => new BigFloat(value).toString(),
	(value) => new BigFloat(value)
)
