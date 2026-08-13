export declare const getCronName: <N extends string, S extends string = string>(resourceName: N, stackName?: S) => `${string}--${S}--cron--${N}`;
export interface CronResources {
}
export declare const Cron: CronResources;
