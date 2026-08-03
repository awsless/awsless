export declare const getJobName: <N extends string, S extends string = string>(resourceName: N, stackName?: S) => `${string}--${S}--job--${N}`;
export interface JobResources {
}
export declare const Job: JobResources;
