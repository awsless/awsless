export declare const getFunctionName: <N extends string, S extends string = "stack">(resourceName: N, stackName?: S) => `app--${S}--function--${N}`;
export interface FunctionResources {
}
export declare const Fn: FunctionResources;
