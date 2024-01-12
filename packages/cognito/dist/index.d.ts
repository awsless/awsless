declare class ResponseError extends Error {
    readonly code: string;
    constructor(message: string, code: string);
}

declare class Unauthorized extends Error {
    constructor(message?: string);
}

declare class NewPasswordRequired extends Error {
    readonly username: string;
    readonly session: string;
    readonly userAttributes: object;
    constructor(username: string, session: string, userAttributes: object, message?: string);
}

declare const srp: (group: string, smallAValue?: ArrayBuffer) => Promise<readonly [string, (user: string, pass: string, serverB: string, salt: string, secretBlock: string, time?: string) => Promise<string[]>]>;
declare const generateVerifier: (group: string, user: string, pass: string, random?: ArrayBuffer) => Promise<readonly [string, string]>;
declare const generateDeviceSecret: () => string;

declare class Token {
    private string;
    readonly payload: Record<string, string | number | undefined>;
    static fromString(token: string): Token;
    constructor(string: string, payload: Record<string, string | number | undefined>);
    get expiration(): number;
    get issuedAt(): number;
    toString(): string;
}

type StoreData = Record<string, string>;
interface Store {
    hydrate: (data: StoreData) => Store;
    get: <T>(key: string) => T | undefined;
    set: (key: string, value: unknown) => Store;
    remove: (key: string) => Store;
}

declare class Client {
    private props;
    readonly userPoolId: string;
    readonly region: string;
    constructor(props: {
        userPoolId: string;
        id: string;
        secret?: string;
        region?: string;
        store: Store;
        deviceStore?: Store;
    });
    get id(): string;
    get secret(): string | undefined;
    get store(): Store;
    get deviceStore(): Store | undefined;
    call(action: string, params?: object): Promise<any>;
}

declare class Session {
    private props;
    readonly clockDrift: number;
    constructor(props: {
        idToken: Token;
        accessToken: Token;
        clockDrift?: number;
    });
    get accessToken(): Token;
    get idToken(): Token;
    get user(): {
        id: string;
        name: string;
        email: string | undefined;
        deviceKey: string;
    };
    private calculateClockDrift;
    isValid(): boolean;
}

declare class CookieStore implements Store {
    private serverSideData;
    hydrate(serverSideData: StoreData): this;
    get<T>(key: string): T | undefined;
    set(key: string, value: unknown): this;
    remove(key: string): this;
}

declare class MemoryStore implements Store {
    private data;
    hydrate(data: StoreData): this;
    get<T>(key: string): T | undefined;
    set(key: string, value: unknown): this;
    remove(key: string): this;
}

declare class LocalStore implements Store {
    private serverSideData;
    hydrate(serverSideData: StoreData): this;
    get<T>(key: string): T | undefined;
    set(key: string, value: unknown): this;
    remove(key: string): this;
}

type ChangePasswordProps = {
    previousPassword: string;
    proposedPassword: string;
};
declare const changePassword: (client: Client, props: ChangePasswordProps) => Promise<any>;

type ResendConfirmationCodeProps = {
    username: string;
};
declare const resendConfirmationCode: (client: Client, props: ResendConfirmationCodeProps) => Promise<any>;

declare const getSession: (client: Client) => Promise<Session>;

type SignInProps = {
    username: string;
    password: string;
    attributes?: Record<string, string>;
};
declare const signIn: (client: Client, props: SignInProps) => Promise<Session>;

declare const signOut: (client: Client) => Promise<void>;

type SignUpProps = {
    username?: string;
    password?: string;
    attributes?: Record<string, string>;
};
declare const signUp: (client: Client, props: SignUpProps) => Promise<void>;

type NewPasswordProps = {
    password: string;
};
type NewPasswordSessionProps = {
    username: string;
    session: string;
};
declare const newPassword: (client: Client, error: NewPasswordSessionProps, props: NewPasswordProps) => Promise<void>;

type ConfirmSignUpProps = {
    username: string;
    code: string;
    forceAliasCreation?: boolean;
};
declare const confirmSignUp: (client: Client, props: ConfirmSignUpProps) => Promise<any>;

type ForgotPasswordProps = {
    username: string;
};
declare const forgotPassword: (client: Client, props: ForgotPasswordProps) => Promise<any>;

type ConfirmForgotPasswordProps = {
    username: string;
    password: string;
    code: string;
};
declare const confirmForgotPassword: (client: Client, props: ConfirmForgotPasswordProps) => Promise<any>;

type ListDevicesProps = {
    limit?: number;
    cursor?: string;
};
declare const listDevices: (client: Client, props: ListDevicesProps) => Promise<{
    cursor: string | undefined;
    items: {
        key: string;
    }[];
}>;

type ForgetDeviceProps = {
    deviceKey: string;
};
declare const forgetDevice: (client: Client, props: ForgetDeviceProps) => Promise<any>;

type ForgetOtherDevicesProps = {
    deviceKey: string;
};
declare const forgetOtherDevices: (client: Client, props: ForgetOtherDevicesProps) => Promise<any[]>;

export { Client, CookieStore, LocalStore, MemoryStore, NewPasswordRequired, ResponseError, Session, Store, Token, Unauthorized, changePassword, confirmForgotPassword, confirmSignUp, forgetDevice, forgetOtherDevices, forgotPassword, generateDeviceSecret, generateVerifier, getSession, listDevices, newPassword, resendConfirmationCode, signIn, signOut, signUp, srp };
