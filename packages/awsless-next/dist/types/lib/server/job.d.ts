export declare const getJobName: <N extends string, S extends string = "stack">(resourceName: N, stackName?: S) => `app--${S}--job--${N}`;
export interface JobResources {
}
export declare const Job: JobResources;
