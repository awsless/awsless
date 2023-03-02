
import { BigFloat, Numeric } from "@awsless/big-float";
import { Struct } from "./struct";

export const bigfloat = () => new Struct<'N', string, Numeric, BigFloat>(
	(value) => ({ N: new BigFloat(value).toString() }),
	(value) => new BigFloat(value.N)
)
