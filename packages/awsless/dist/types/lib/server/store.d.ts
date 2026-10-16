import { getStack } from './util.js';
export declare const getStoreName: <N extends string, S extends string = ReturnType<typeof getStack>>(name: N, stack?: S) => string;
export interface StoreResources {
}
export declare const Store: StoreResources;
