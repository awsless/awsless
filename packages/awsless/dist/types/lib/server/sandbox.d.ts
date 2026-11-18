export type DevSandbox = {
    routes: string[];
    configs: string[];
    services: string[];
};
export declare const getDevSandbox: (routeKey?: string) => DevSandbox | undefined;
