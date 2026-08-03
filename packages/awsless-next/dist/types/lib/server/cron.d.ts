export declare const getCronName: <N extends string, S extends string = "stack">(resourceName: N, stackName?: S) => `app--${S}--cron--${N}`;
export interface CronResources {
}
export declare const Cron: CronResources;
