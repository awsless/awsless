import { TableClass } from "aws-cdk-lib/aws-dynamodb";
import { z } from "zod";

const types = {
	'standard': TableClass.STANDARD,
	'standard-infrequent-access': TableClass.STANDARD_INFREQUENT_ACCESS
}

export const TableClassSchema = z.enum(Object.keys(types) as [ keyof typeof types ]).transform((value) => {
	return types[value]
})
