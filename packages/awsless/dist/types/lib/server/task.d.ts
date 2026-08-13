export declare const getTaskName: <N extends string, S extends string = string>(resourceName: N, stackName?: S) => `${string}--${S}--task--${N}`;
export interface TaskResources {
}
export declare const Task: TaskResources;
