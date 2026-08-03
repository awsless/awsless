export declare const getInstanceQueueName: <N extends string, S extends string = string>(resourceName: N, stackName?: S) => `${string}--${S}--instance--${N}`;
export declare const getInstanceQueueUrl: (name: string, stack?: string) => string | undefined;
export interface InstanceResources {
}
export declare const Instance: InstanceResources;
