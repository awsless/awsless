export declare const getTaskName: <N extends string, S extends string = "stack">(resourceName: N, stackName?: S) => `app--${S}--task--${N}`;
export interface TaskResources {
}
export declare const Task: TaskResources;
