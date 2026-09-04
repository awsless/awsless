export interface AuthResources {
}
export declare const Auth: AuthResources;
export declare const getAuthProps: (name: string) => {
    readonly userPoolId: string | undefined;
    readonly clientId: string | undefined;
};
