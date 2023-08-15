import { Runtime as CdkRuntime } from 'aws-cdk-lib/aws-lambda'
import { z } from 'zod';

const runtimes = {
	'container': CdkRuntime.FROM_IMAGE,
	'rust': CdkRuntime.PROVIDED_AL2,
	'nodejs16.x': CdkRuntime.NODEJS_16_X,
	'nodejs18.x': CdkRuntime.NODEJS_18_X,
	'python3.9': CdkRuntime.PYTHON_3_9,
	'python3.10': CdkRuntime.PYTHON_3_10,
	'go1.x': CdkRuntime.PROVIDED_AL2,
	'go': CdkRuntime.PROVIDED_AL2,
};

export type Runtime = keyof typeof runtimes;

export const toRuntime = (runtime: Runtime) => {
	return runtimes[runtime]
}

export const RuntimeSchema = z.enum(Object.keys(runtimes) as [Runtime]).transform<CdkRuntime>(toRuntime)
