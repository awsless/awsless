import { AttributeType } from "aws-cdk-lib/aws-dynamodb";
import { z } from "zod";

const types = {
	string: AttributeType.STRING,
	number: AttributeType.NUMBER,
	binary: AttributeType.BINARY,
}

export const AttributeSchema = z
	.enum(Object.keys(types) as [ keyof typeof types ])
	.transform(value => types[value])
