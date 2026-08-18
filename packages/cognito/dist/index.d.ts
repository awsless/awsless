//#region src/error/response-error.d.ts
declare class ResponseError extends Error {
  readonly code: string;
  constructor(message: string, code: string);
}
//#endregion
//#region src/error/unauthorized.d.ts
declare class Unauthorized extends Error {
  constructor(message?: string);
}
//#endregion
//#region src/error/new-password-required.d.ts
declare class NewPasswordRequired extends Error {
  readonly username: string;
  readonly session: string;
  readonly userAttributes: object;
  constructor(username: string, session: string, userAttributes: object, message?: string);
}
//#endregion
//#region src/srp.d.ts
declare const srp: (group: string, smallAValue?: ArrayBuffer) => Promise<readonly [string, (user: string, pass: string, serverB: string, salt: string, secretBlock: string, time?: string) => Promise<readonly [string, string]>]>;
declare const generateVerifier: (group: string, user: string, pass: string, random?: ArrayBuffer) => Promise<readonly [string, string]>;
declare const generateDeviceSecret: () => string;
//#endregion
//#region src/token.d.ts
declare class Token {
  private string;
  readonly payload: Record<string, string | number | undefined>;
  static fromString(token: string): Token;
  constructor(string: string, payload: Record<string, string | number | undefined>);
  get expiration(): number;
  get issuedAt(): number;
  toString(): string;
}
//#endregion
//#region src/store/store.d.ts
type StoreData = Record<string, string>;
interface Store {
  hydrate: (data: StoreData) => Store;
  get: <T>(key: string) => T | undefined;
  set: (key: string, value: unknown) => Store;
  remove: (key: string) => Store;
}
//#endregion
//#region src/client.d.ts
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
//#endregion
//#region src/session.d.ts
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
//#endregion
//#region src/store/cookie-store.d.ts
declare class CookieStore implements Store {
  private prefix;
  private serverSideData;
  constructor(prefix?: string);
  hydrate(serverSideData: StoreData): this;
  get<T>(key: string): T | undefined;
  set(key: string, value: unknown): this;
  remove(key: string): this;
}
//#endregion
//#region src/store/memory-store.d.ts
declare class MemoryStore implements Store {
  private data;
  hydrate(data: StoreData): this;
  get<T>(key: string): T | undefined;
  set(key: string, value: unknown): this;
  remove(key: string): this;
}
//#endregion
//#region src/store/local-store.d.ts
declare class LocalStore implements Store {
  private prefix;
  private serverSideData;
  constructor(prefix?: string);
  hydrate(serverSideData: StoreData): this;
  get<T>(key: string): T | undefined;
  set(key: string, value: unknown): this;
  remove(key: string): this;
}
//#endregion
//#region src/command/change-password.d.ts
type ChangePasswordProps = {
  previousPassword: string;
  proposedPassword: string;
};
declare const changePassword: (client: Client, props: ChangePasswordProps) => Promise<any>;
//#endregion
//#region src/command/resend-confirmation-code.d.ts
type ResendConfirmationCodeProps = {
  username: string;
};
declare const resendConfirmationCode: (client: Client, props: ResendConfirmationCodeProps) => Promise<any>;
//#endregion
//#region src/command/get-session.d.ts
declare const getSession: (client: Client) => Promise<Session>;
//#endregion
//#region src/command/sign-in.d.ts
type SignInProps = {
  username: string;
  password: string;
  attributes?: Record<string, string>;
};
declare const signIn: (client: Client, props: SignInProps) => Promise<Session>;
//#endregion
//#region src/command/sign-out.d.ts
declare const signOut: (client: Client) => Promise<void>;
//#endregion
//#region src/command/sign-up.d.ts
type SignUpProps = {
  username?: string;
  password?: string;
  attributes?: Record<string, string>;
};
declare const signUp: (client: Client, props: SignUpProps) => Promise<void>;
//#endregion
//#region src/command/new-password.d.ts
type NewPasswordProps = {
  password: string;
};
type NewPasswordSessionProps = {
  username: string;
  session: string;
};
declare const newPassword: (client: Client, error: NewPasswordSessionProps, props: NewPasswordProps) => Promise<void>;
//#endregion
//#region src/command/confirm-sign-up.d.ts
type ConfirmSignUpProps = {
  username: string;
  code: string;
  forceAliasCreation?: boolean;
};
declare const confirmSignUp: (client: Client, props: ConfirmSignUpProps) => Promise<any>;
//#endregion
//#region src/command/forgot-password.d.ts
type ForgotPasswordProps = {
  username: string;
};
declare const forgotPassword: (client: Client, props: ForgotPasswordProps) => Promise<any>;
//#endregion
//#region src/command/confirm-forgot-password.d.ts
type ConfirmForgotPasswordProps = {
  username: string;
  password: string;
  code: string;
};
declare const confirmForgotPassword: (client: Client, props: ConfirmForgotPasswordProps) => Promise<any>;
//#endregion
//#region src/command/list-devices.d.ts
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
//#endregion
//#region src/command/forget-device.d.ts
type ForgetDeviceProps = {
  deviceKey: string;
};
declare const forgetDevice: (client: Client, props: ForgetDeviceProps) => Promise<any>;
//#endregion
//#region src/command/forget-other-devices.d.ts
type ForgetOtherDevicesProps = {
  deviceKey: string;
};
declare const forgetOtherDevices: (client: Client, props: ForgetOtherDevicesProps) => Promise<any[]>;
//#endregion
export { Client, CookieStore, LocalStore, MemoryStore, NewPasswordRequired, ResponseError, Session, type Store, Token, Unauthorized, changePassword, confirmForgotPassword, confirmSignUp, forgetDevice, forgetOtherDevices, forgotPassword, generateDeviceSecret, generateVerifier, getSession, listDevices, newPassword, resendConfirmationCode, signIn, signOut, signUp, srp };