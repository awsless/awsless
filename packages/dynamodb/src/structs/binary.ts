
import { NativeAttributeBinary } from "@aws-sdk/util-dynamodb";
import { Struct } from "./struct";

export const binary = () => new Struct<NativeAttributeBinary, NativeAttributeBinary, Uint8Array>(
	'B',
	(value) => value,
	(value) => value as Uint8Array
)
