export declare const getInstanceQueueName: <N extends string, S extends string = "stack">(resourceName: N, stackName?: S) => `app--${S}--instance--${N}`;
export declare const getInstanceQueueUrl: (name: string, stack?: string) => string | undefined;
export interface InstanceResources {
}
export declare const Instance: InstanceResources;
