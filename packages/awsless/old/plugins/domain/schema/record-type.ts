import { RecordType } from "aws-cdk-lib/aws-route53";
import { z } from "zod";

const types = {
	'A': RecordType.A,
	'AAAA': RecordType.AAAA,
	'MX': RecordType.MX,
	'TXT': RecordType.TXT,
	'CNAME': RecordType.CNAME,
}

export const RecordTypeSchema = z
	.enum(Object.keys(types) as [ keyof typeof types ])
	.transform(value => types[value])
