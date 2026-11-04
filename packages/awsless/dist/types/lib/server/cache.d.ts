export declare const getCacheProps: (name: string, stack?: string) => {
    readonly host: string;
    readonly port: number;
};
export type CacheClientOptions = {
    keepConnection?: boolean;
};
export interface CacheResources {
}
export declare const Cache: CacheResources;
