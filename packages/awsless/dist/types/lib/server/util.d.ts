export declare const getApp: () => string;
export declare const getAppId: () => string;
export declare const getRegion: () => string;
export declare const getAccountId: () => string;
export declare const isTest: () => boolean;
export declare const IS_LOCAL: boolean;
export declare const getRoute: () => string | undefined;
export declare const getStack: () => string;
export declare const formatResourceName: (opt: {
    prefix?: string;
    stackName?: string;
    resourceType: string;
    resourceName: string;
    postfix?: string;
    separator?: string;
}) => string;
export declare const bindLocalResourceName: <T extends string>(resourceType: T) => <N extends string, S extends string = ReturnType<typeof getStack>>(resourceName: N, stackName?: S) => `${string}--${S}--${T}--${N}`;
export declare const bindGlobalResourceName: <T extends string>(resourceType: T) => <N extends string>(resourceName: N) => `${string}--${T}--${N}`;
