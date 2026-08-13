import { NativeAttributeBinary, NativeAttributeValue, NativeScalarAttributeValue } from "@aws-sdk/util-dynamodb"

export type AttributeValue = NativeAttributeBinary | NativeAttributeValue | NativeScalarAttributeValue
