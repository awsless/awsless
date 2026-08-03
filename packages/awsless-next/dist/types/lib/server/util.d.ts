export declare const APP: "app";
export declare const APP_ID: "app-id";
export declare const getStack: () => "stack";
export declare const IS_TEST: boolean;
export declare const IS_LOCAL: boolean;
export declare const REGION: string | undefined;
export declare const ACCOUNT_ID: string | undefined;
export declare const build: (opt: {
    prefix?: string;
    stackName?: string;
    resourceType: string;
    resourceName: string;
    postfix?: string;
    seperator?: string;
}) => string;
export declare const bindLocalResourceName: <T extends string>(resourceType: T) => <N extends string, S extends string = ReturnType<typeof getStack>>(resourceName: N, stackName?: S) => `${typeof APP}--${S}--${T}--${N}`;
export declare const bindGlobalResourceName: <T extends string>(resourceType: T) => <N extends string>(resourceName: N) => `${typeof APP}--${T}--${N}`;
