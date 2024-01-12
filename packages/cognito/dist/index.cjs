"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  Client: () => Client,
  CookieStore: () => CookieStore,
  LocalStore: () => LocalStore,
  MemoryStore: () => MemoryStore,
  NewPasswordRequired: () => NewPasswordRequired,
  ResponseError: () => ResponseError,
  Session: () => Session,
  Token: () => Token,
  Unauthorized: () => Unauthorized,
  changePassword: () => changePassword,
  confirmForgotPassword: () => confirmForgotPassword,
  confirmSignUp: () => confirmSignUp,
  forgetDevice: () => forgetDevice,
  forgetOtherDevices: () => forgetOtherDevices,
  forgotPassword: () => forgotPassword,
  generateDeviceSecret: () => generateDeviceSecret,
  generateVerifier: () => generateVerifier,
  getSession: () => getSession,
  listDevices: () => listDevices,
  newPassword: () => newPassword,
  resendConfirmationCode: () => resendConfirmationCode,
  signIn: () => signIn,
  signOut: () => signOut,
  signUp: () => signUp,
  srp: () => srp
});
module.exports = __toCommonJS(src_exports);

// src/error/response-error.ts
var ResponseError = class extends Error {
  constructor(message, code) {
    super(message);
    this.code = code;
  }
};

// src/error/unauthorized.ts
var Unauthorized = class extends Error {
  constructor(message = "Unauthorized") {
    super(message);
  }
};

// src/error/new-password-required.ts
var NewPasswordRequired = class extends Error {
  constructor(username, session, userAttributes, message = "New password required") {
    super(message);
    this.username = username;
    this.session = session;
    this.userAttributes = userAttributes;
  }
};

// src/helper/crypto.ts
var generateRandomBuffer = (numBytes) => {
  const u8 = new Uint8Array(numBytes);
  crypto.getRandomValues(u8);
  return u8.buffer;
};
var hkdf = async (algorithm, ikm, salt, info, keylen) => {
  const cryptoKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  const params = {
    name: "HKDF",
    hash: algorithm,
    salt,
    info
  };
  const bytes = await crypto.subtle.deriveBits(params, cryptoKey, keylen);
  return new Uint8Array(bytes);
};
var hash = (algorithm, message) => {
  return crypto.subtle.digest(algorithm, message);
};
var hmac = async (algorithm, message, key) => {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: { name: algorithm } },
    false,
    ["sign"]
  );
  return crypto.subtle.sign("HMAC", cryptoKey, message);
};

// src/helper/encoding.ts
var toBigInt = (buffer) => {
  return BigInt(`0x${toHex(buffer)}`);
};
var toHex = (buffer) => {
  return Array.from(new Uint8Array(buffer)).map((b) => b.toString(16).padStart(2, "0")).join("");
};
var fromHex = (hex) => {
  const view = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    view[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return view.buffer;
};
function fromUtf8(str) {
  return new TextEncoder().encode(str).buffer;
}
var fromBase64 = (base64) => {
  if (typeof atob === "undefined") {
    return Uint8Array.from(Buffer.from(base64, "base64"));
  }
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
};
var toBase64 = (buffer) => {
  if (typeof btoa === "undefined") {
    return Buffer.from(buffer).toString("base64");
  }
  return btoa(String.fromCharCode(...new Uint8Array(buffer)));
};
var padHex = (bigInt) => {
  const hashStr = bigInt.toString(16);
  if (hashStr.length % 2 === 1) {
    return "0" + hashStr;
  }
  if ("89ABCDEFabcdef".indexOf(hashStr[0]) !== -1) {
    return "00" + hashStr;
  }
  return hashStr;
};

// src/helper/timestamp.ts
var WEEK_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
var MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var padTime = (time) => {
  return time < 10 ? "0" + time : time;
};
var createTimestamp = () => {
  const now = /* @__PURE__ */ new Date();
  const weekDay = WEEK_NAMES[now.getUTCDay()];
  const month = MONTH_NAMES[now.getUTCMonth()];
  const day = now.getUTCDate();
  const hours = padTime(now.getUTCHours());
  const minutes = padTime(now.getUTCMinutes());
  const seconds = padTime(now.getUTCSeconds());
  const year = now.getUTCFullYear();
  const dateNow = `${weekDay} ${month} ${day} ${hours}:${minutes}:${seconds} UTC ${year}`;
  return dateNow;
};

// src/helper/buffer.ts
var concat = (...args) => {
  let length = 0;
  for (var i in args) {
    length += args[i].byteLength;
  }
  const joined = new Uint8Array(length);
  let offset = 0;
  for (var i in args) {
    const buffer = args[i];
    joined.set(new Uint8Array(buffer), offset);
    offset += buffer.byteLength;
  }
  return joined.buffer;
};

// src/helper/bigint.ts
var zero = BigInt(0);
var one = BigInt(1);
var two = BigInt(2);
function eGcd(a, b) {
  if (a <= zero || b <= zero)
    throw new RangeError("a and b MUST be > 0");
  let x = zero;
  let y = one;
  let u = one;
  let v = zero;
  while (a !== zero) {
    const q = b / a;
    const r = b % a;
    const m = x - u * q;
    const n = y - v * q;
    b = a;
    a = r;
    x = u;
    y = v;
    u = m;
    v = n;
  }
  return {
    g: b,
    x,
    y
  };
}
function modInv(a, n) {
  const egcd = eGcd(toZn(a, n), n);
  if (egcd.g !== one) {
    throw new RangeError(`${a.toString()} does not have inverse modulo ${n.toString()}`);
  } else {
    return toZn(egcd.x, n);
  }
}
function abs(a) {
  return a >= 0 ? a : -a;
}
function toZn(a, n) {
  if (n <= zero) {
    throw new RangeError("n must be > 0");
  }
  const aZn = a % n;
  return aZn < zero ? aZn + n : aZn;
}
function modPow(b, e, n) {
  if (n <= zero) {
    throw new RangeError("n must be > 0");
  } else if (n === one) {
    return zero;
  }
  b = toZn(b, n);
  if (e < zero) {
    return modInv(modPow(b, abs(e), n), n);
  }
  let r = one;
  while (e > 0) {
    if (e % two === one) {
      r = r * b % n;
    }
    e = e / two;
    b = b ** two % n;
  }
  return r;
}

// src/srp.ts
var initN = "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD129024E088A67CC74020BBEA63B139B22514A08798E3404DDEF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7EDEE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3DC2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F83655D23DCA3AD961C62F356208552BB9ED529077096966D670C354E4ABC9804F1746C08CA18217C32905E462E36CE3BE39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9DE2BCBF6955817183995497CEA956AE515D2261898FA051015728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6BF12FFA06D98A0864D87602733EC86A64521F2B18177B200CBBE117577A615D6C770988C0BAD946E208E24FA074E5AB3143DB5BFCE0FD108E4B82D120A93AD2CAFFFFFFFFFFFFFFFF";
var ZERO = BigInt(0);
var N = BigInt("0x" + initN);
var g = BigInt(2);
var combine = async (left, right) => {
  return toBigInt(await hash("SHA-256", fromHex(left.toString(16) + right.toString(16))));
};
var createFullPassword = async (group, user, pass) => {
  return toHex(await hash("SHA-256", fromUtf8(`${group}${user}:${pass}`)));
};
var srp = async (group, smallAValue) => {
  const smallA = toBigInt(smallAValue || generateRandomBuffer(128));
  const largeA = modPow(g, smallA, N);
  if (largeA % N === ZERO) {
    throw new Error("Illegal paramater. A mod N cannot be 0.");
  }
  const A = largeA.toString(16);
  return [
    A,
    async (user, pass, serverB, salt, secretBlock, time) => {
      const B = BigInt("0x" + serverB);
      const S = BigInt("0x" + salt);
      if (B % N === ZERO) {
        throw new Error("B cannot be zero.");
      }
      const U = await combine(padHex(A), padHex(B));
      if (U === ZERO) {
        throw new Error("U cannot be zero.");
      }
      const fullPassword = await createFullPassword(group, user, pass);
      const k = await combine(padHex(N), padHex(g));
      const x = await combine(padHex(S), fullPassword);
      const xn = modPow(g, x, N);
      const int = B - k * xn;
      const s = modPow(int, smallA + U * x, N) % N;
      const kUser = await hkdf(
        "SHA-256",
        fromHex(padHex(s)),
        fromHex(padHex(U)),
        fromUtf8("Caldera Derived Key"),
        128
      );
      const timestamp = time || createTimestamp();
      const message = concat(fromUtf8(group), fromUtf8(user), fromBase64(secretBlock), fromUtf8(timestamp));
      const mac = await hmac("SHA-256", message, kUser);
      const signature = toBase64(mac);
      return [signature, timestamp];
    }
  ];
};
var generateVerifier = async (group, user, pass, random) => {
  const fullPassword = await createFullPassword(group, user, pass);
  const salt = padHex(toHex(random ?? generateRandomBuffer(16)));
  const saltedHash = await combine(salt, fullPassword);
  const verifier = padHex(modPow(g, saltedHash, N).toString(16));
  return [toBase64(fromHex(verifier)), toBase64(fromHex(salt))];
};
var generateDeviceSecret = () => {
  return toBase64(generateRandomBuffer(40));
};

// src/token.ts
var import_jwt_decode = __toESM(require("jwt-decode"), 1);
var Token = class _Token {
  constructor(string, payload) {
    this.string = string;
    this.payload = payload;
  }
  static fromString(token) {
    return new _Token(token, (0, import_jwt_decode.default)(token));
  }
  get expiration() {
    return this.payload.exp;
  }
  get issuedAt() {
    return this.payload.iat;
  }
  toString() {
    return this.string;
  }
};

// src/client.ts
var Client = class {
  constructor(props) {
    this.props = props;
    if (props.userPoolId.includes("_")) {
      const [r, p] = props.userPoolId.split("_");
      this.userPoolId = p;
      this.region = r;
    } else if (props.region) {
      this.userPoolId = props.userPoolId;
      this.region = props.region;
    } else {
      throw new TypeError("Region is required");
    }
  }
  userPoolId;
  region;
  get id() {
    return this.props.id;
  }
  get secret() {
    return this.props.secret;
  }
  get store() {
    return this.props.store;
  }
  get deviceStore() {
    return this.props.deviceStore;
  }
  async call(action, params) {
    const response = await fetch(`https://cognito-idp.${this.region}.amazonaws.com`, {
      body: JSON.stringify(params),
      method: "POST",
      cache: "no-cache",
      referrerPolicy: "no-referrer",
      headers: {
        "Cache-Control": "max-age=0",
        "Content-Type": "application/x-amz-json-1.1",
        "X-Amz-Target": `AWSCognitoIdentityProviderService.${action}`
      }
    });
    const result = await response.text();
    const data = result ? JSON.parse(result) : {};
    if (!response.ok) {
      const code = data._type || data.__type;
      const message = data.message || code || "Unknown Cognito Error";
      throw new ResponseError(message, code);
    }
    return data;
  }
};

// src/session.ts
var Session = class {
  constructor(props) {
    this.props = props;
    this.clockDrift = typeof props.clockDrift !== "undefined" ? props.clockDrift : this.calculateClockDrift();
  }
  clockDrift;
  get accessToken() {
    return this.props.accessToken;
  }
  get idToken() {
    return this.props.idToken;
  }
  get user() {
    const idToken = this.props.idToken.payload;
    const accessToken = this.props.accessToken.payload;
    return {
      id: idToken.sub,
      name: accessToken.username,
      email: idToken.email,
      deviceKey: accessToken.device_key
    };
  }
  calculateClockDrift() {
    const now = Math.floor(Date.now() / 1e3);
    const iat = Math.min(this.props.accessToken.issuedAt, this.props.idToken.issuedAt);
    return now - iat;
  }
  isValid() {
    const expireWindow = 60;
    const now = Math.floor(Date.now() / 1e3);
    const adjusted = now - this.clockDrift + expireWindow;
    return adjusted < this.props.accessToken.expiration && adjusted < this.props.idToken.expiration;
  }
};

// src/store/cookie-store.ts
var import_js_cookie = __toESM(require("js-cookie"), 1);
var browser = typeof window !== "undefined";
var CookieStore = class {
  serverSideData = {};
  hydrate(serverSideData) {
    this.serverSideData = serverSideData;
    return this;
  }
  get(key) {
    const value = browser ? import_js_cookie.default.get(key) : this.serverSideData[key];
    if (typeof value === "undefined") {
      return;
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      return value;
    }
  }
  set(key, value) {
    const json = JSON.stringify(value);
    if (browser) {
      import_js_cookie.default.set(key, json, {
        secure: location.hostname !== "localhost",
        expires: 3650,
        sameSite: "strict"
      });
    } else {
      this.serverSideData[key] = json;
    }
    return this;
  }
  remove(key) {
    if (browser) {
      import_js_cookie.default.remove(key);
    } else {
      delete this.serverSideData[key];
    }
    return this;
  }
};

// src/store/memory-store.ts
var MemoryStore = class {
  data = {};
  hydrate(data) {
    this.data = data;
    return this;
  }
  get(key) {
    return this.data[key];
  }
  set(key, value) {
    this.data[key] = value;
    return this;
  }
  remove(key) {
    delete this.data[key];
    return this;
  }
};

// src/store/local-store.ts
var supported = typeof window !== "undefined" && typeof localStorage !== "undefined";
var LocalStore = class {
  serverSideData = {};
  hydrate(serverSideData) {
    this.serverSideData = serverSideData;
    return this;
  }
  get(key) {
    const value = supported ? localStorage.getItem(key) : this.serverSideData[key];
    if (typeof value === "undefined" || value === null) {
      return;
    }
    try {
      return JSON.parse(value);
    } catch (error) {
      return value;
    }
  }
  set(key, value) {
    const json = JSON.stringify(value);
    if (supported) {
      try {
        localStorage.setItem(key, json);
      } catch (error) {
      }
    } else {
      this.serverSideData[key] = json;
    }
    return this;
  }
  remove(key) {
    if (supported) {
      localStorage.removeItem(key);
    } else {
      delete this.serverSideData[key];
    }
    return this;
  }
};

// src/command/get-session.ts
var getSession = async (client) => {
  const token = client.store.get("token");
  if (!token) {
    throw new Unauthorized("No user logged in");
  }
  const session = new Session({
    idToken: Token.fromString(token.id),
    accessToken: Token.fromString(token.access),
    clockDrift: token.drift
  });
  if (session.isValid()) {
    return session;
  }
  const device = client.store.get("device");
  if (!device) {
    throw new Unauthorized("No device");
  }
  let result;
  try {
    result = await client.call("InitiateAuth", {
      ClientId: client.id,
      AuthFlow: "REFRESH_TOKEN_AUTH",
      AuthParameters: {
        DEVICE_KEY: device.key,
        REFRESH_TOKEN: token.refresh
      }
    });
  } catch (error) {
    if (error instanceof ResponseError && error.code === "NotAuthorizedException") {
      client.store.remove("token");
      throw new Unauthorized("Invalid refresh token");
    }
    throw error;
  }
  const data = result.AuthenticationResult;
  const idToken = Token.fromString(data.IdToken);
  const accessToken = Token.fromString(data.AccessToken);
  const refreshToken = data.RefreshToken || token.refresh;
  const newSession = new Session({ idToken, accessToken });
  client.store.set("token", {
    id: idToken.toString(),
    access: accessToken.toString(),
    refresh: refreshToken,
    drift: newSession.clockDrift
  });
  return newSession;
};

// src/command/change-password.ts
var changePassword = async (client, props) => {
  const session = await getSession(client);
  return client.call("ChangePassword", {
    PreviousPassword: props.previousPassword,
    ProposedPassword: props.proposedPassword,
    AccessToken: session.accessToken.toString()
  });
};

// src/command/resend-confirmation-code.ts
var resendConfirmationCode = async (client, props) => {
  return client.call("ResendConfirmationCode", {
    ClientId: client.id,
    Username: props.username
  });
};

// src/helper/device.ts
var getUserDevice = (client, username) => {
  const deviceStore = client.deviceStore;
  const store = client.store;
  if (deviceStore) {
    const device = deviceStore.get(`device.${username}`);
    if (device) {
      store.set("device", device);
      return device;
    }
  }
  return store.get("device");
};
var setUserDevice = (client, username, device) => {
  const deviceStore = client.deviceStore;
  if (deviceStore) {
    deviceStore.set(`device.${username}`, device);
  }
  client.store.set("device", device);
};
var removeUserDevice = (client, username) => {
  const deviceStore = client.deviceStore;
  if (deviceStore) {
    deviceStore.remove(`device.${username}`);
  }
  return client.store.remove("device");
};

// src/helper/secret.ts
var generateSecretHash = async (client, value) => {
  const message = concat(fromUtf8(value), fromUtf8(client.id));
  const hash2 = await hmac("sha-256", message, fromUtf8(client.secret));
  return toBase64(hash2);
};

// src/command/sign-in.ts
var signIn = async (client, props) => {
  const device = getUserDevice(client, props.username);
  var result;
  try {
    result = await userAuth(client, {
      ...props,
      device
    });
  } catch (error) {
    if (error instanceof ResponseError && error.code === "ResourceNotFoundException" && error.message.toLowerCase().includes("device")) {
      removeUserDevice(client, props.username);
      result = await userAuth(client, props);
    } else {
      throw error;
    }
  }
  if (result.ChallengeName === "NEW_PASSWORD_REQUIRED") {
    const userAttributes = JSON.parse(result.ChallengeParameters.userAttributes);
    throw new NewPasswordRequired(props.username, result.Session, userAttributes);
  }
  const data = result.AuthenticationResult;
  const idToken = Token.fromString(data.IdToken);
  const accessToken = Token.fromString(data.AccessToken);
  const refreshToken = data.RefreshToken;
  const newDevice = data.NewDeviceMetadata;
  const session = new Session({ idToken, accessToken });
  if (newDevice) {
    await confirmDevice(client, {
      accessToken,
      userId: result.userId,
      key: newDevice.DeviceKey,
      group: newDevice.DeviceGroupKey
    });
  }
  client.store.set("token", {
    id: idToken.toString(),
    access: accessToken.toString(),
    refresh: refreshToken,
    drift: session.clockDrift
  });
  return session;
};
var userAuth = async (client, props) => {
  const result = await userSrpAuth(client, props);
  if (result.ChallengeName === "DEVICE_SRP_AUTH") {
    return {
      userId: result.userId,
      ...await deviceSrpAuth(client, {
        device: props.device,
        userId: result.userId,
        session: result.Session
      })
    };
  }
  return result;
};
var userSrpAuth = async (client, props) => {
  const [A, next] = await srp(client.userPoolId);
  const params = {
    USERNAME: props.username,
    SRP_A: A
  };
  if (client.secret) {
    params.SECRET_HASH = await generateSecretHash(client, props.username);
  }
  if (props.device) {
    params.DEVICE_KEY = props.device.key;
  }
  const result = await client.call("InitiateAuth", {
    ClientId: client.id,
    AuthFlow: "USER_SRP_AUTH",
    ClientMetadata: props.attributes,
    AuthParameters: params
  });
  const userId = result.ChallengeParameters.USER_ID_FOR_SRP;
  if (result.ChallengeName === "PASSWORD_VERIFIER") {
    const [signature, timestamp] = await next(
      userId,
      props.password,
      result.ChallengeParameters.SRP_B,
      result.ChallengeParameters.SALT,
      result.ChallengeParameters.SECRET_BLOCK
    );
    const responses = {
      USERNAME: userId,
      TIMESTAMP: timestamp,
      PASSWORD_CLAIM_SIGNATURE: signature,
      PASSWORD_CLAIM_SECRET_BLOCK: result.ChallengeParameters.SECRET_BLOCK
    };
    if (client.secret) {
      responses.SECRET_HASH = await generateSecretHash(client, props.username);
    }
    if (props.device) {
      responses.DEVICE_KEY = props.device.key;
    }
    try {
      const challengeResult = await client.call("RespondToAuthChallenge", {
        ChallengeName: "PASSWORD_VERIFIER",
        ChallengeResponses: responses,
        ClientId: client.id,
        ClientMetadata: props.attributes,
        Session: result.Session
      });
      return { ...challengeResult, userId };
    } catch (error) {
      if (error instanceof ResponseError && error.code === "NotAuthorizedException") {
        throw new Unauthorized();
      }
      throw error;
    }
  }
  return { ...result, userId };
};
var deviceSrpAuth = async (client, { device, userId, session }) => {
  const [A, next] = await srp(device.group);
  const result = await client.call("RespondToAuthChallenge", {
    Session: session,
    ClientId: client.id,
    ChallengeName: "DEVICE_SRP_AUTH",
    ChallengeResponses: {
      SRP_A: A,
      USERNAME: userId,
      DEVICE_KEY: device.key
    }
  });
  const [signature, timestamp] = await next(
    device.key,
    device.secret,
    result.ChallengeParameters.SRP_B,
    result.ChallengeParameters.SALT,
    result.ChallengeParameters.SECRET_BLOCK
  );
  return client.call("RespondToAuthChallenge", {
    Session: result.Session,
    ClientId: client.id,
    ChallengeName: "DEVICE_PASSWORD_VERIFIER",
    ChallengeResponses: {
      USERNAME: userId,
      DEVICE_KEY: device.key,
      TIMESTAMP: timestamp,
      PASSWORD_CLAIM_SIGNATURE: signature,
      PASSWORD_CLAIM_SECRET_BLOCK: result.ChallengeParameters.SECRET_BLOCK
    }
  });
};
var confirmDevice = async (client, { userId, accessToken, key, group }) => {
  const secret = generateDeviceSecret();
  const name = typeof navigator !== "undefined" ? navigator.userAgent : "nodejs";
  const [verifier, salt] = await generateVerifier(group, key, secret);
  await client.call("ConfirmDevice", {
    DeviceKey: key,
    DeviceName: name,
    AccessToken: accessToken.toString(),
    DeviceSecretVerifierConfig: {
      Salt: salt,
      PasswordVerifier: verifier
    }
  });
  const device = {
    key,
    group,
    secret
  };
  setUserDevice(client, userId, device);
};

// src/command/sign-out.ts
var removeLocalState = (client) => {
  const store = client.store;
  store.remove("token");
  store.remove("device");
};
var signOut = async (client) => {
  let session;
  try {
    session = await getSession(client);
  } catch (error) {
    if (error instanceof Unauthorized) {
      removeLocalState(client);
      return;
    }
    throw error;
  }
  try {
    await client.call("GlobalSignOut", {
      AccessToken: session.accessToken.toString()
    });
  } catch (error) {
    if (error instanceof ResponseError && error.code === "NotAuthorizedException") {
      removeLocalState(client);
      return;
    }
    throw error;
  }
  removeLocalState(client);
};

// src/command/sign-up.ts
var signUp = async (client, props) => {
  await client.call("SignUp", {
    ClientId: client.id,
    Username: props.username,
    Password: props.password,
    UserAttributes: Object.entries(props.attributes ?? {}).map(([key, value]) => {
      return { Name: key, Value: value };
    })
  });
};

// src/command/new-password.ts
var newPassword = async (client, error, props) => {
  const responses = {
    USERNAME: error.username,
    NEW_PASSWORD: props.password
  };
  if (client.secret) {
    responses.SECRET_HASH = await generateSecretHash(client, error.username);
  }
  await client.call("RespondToAuthChallenge", {
    Session: error.session,
    ClientId: client.id,
    ChallengeName: "NEW_PASSWORD_REQUIRED",
    ChallengeResponses: responses
  });
};

// src/command/confirm-sign-up.ts
var confirmSignUp = async (client, props) => {
  return client.call("ConfirmSignUp", {
    ClientId: client.id,
    Username: props.username,
    ConfirmationCode: props.code,
    ForceAliasCreation: props.forceAliasCreation
  });
};

// src/command/forgot-password.ts
var forgotPassword = async (client, props) => {
  return client.call("ForgotPassword", {
    ClientId: client.id,
    Username: props.username
  });
};

// src/command/confirm-forgot-password.ts
var confirmForgotPassword = async (client, props) => {
  return client.call("ConfirmForgotPassword", {
    ClientId: client.id,
    Username: props.username,
    Password: props.password,
    ConfirmationCode: props.code
  });
};

// src/command/list-devices.ts
var listDevices = async (client, props) => {
  const session = await getSession(client);
  const result = await client.call("ListDevices", {
    AccessToken: session.accessToken.toString(),
    Limit: props.limit ?? 10,
    PaginationToken: props.cursor
  });
  return {
    cursor: result.PaginationToken,
    items: (result.Devices ?? []).map((item) => ({
      key: item.DeviceKey
    }))
  };
};

// src/command/forget-device.ts
var forgetDevice = async (client, props) => {
  const session = await getSession(client);
  return client.call("ForgetDevice", {
    AccessToken: session.accessToken.toString(),
    DeviceKey: props.deviceKey
  });
};

// src/command/forget-other-devices.ts
var forgetOtherDevices = async (client, props) => {
  const devices = [];
  let cursor;
  while (true) {
    const result = await listDevices(client, {
      limit: 60,
      cursor
    });
    cursor = result.cursor;
    result.items.forEach((item) => {
      if (props.deviceKey !== item.key) {
        devices.push(item.key);
      }
    });
    if (!cursor) {
      break;
    }
  }
  return Promise.all(
    devices.map((deviceKey) => {
      return forgetDevice(client, {
        deviceKey
      });
    })
  );
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Client,
  CookieStore,
  LocalStore,
  MemoryStore,
  NewPasswordRequired,
  ResponseError,
  Session,
  Token,
  Unauthorized,
  changePassword,
  confirmForgotPassword,
  confirmSignUp,
  forgetDevice,
  forgetOtherDevices,
  forgotPassword,
  generateDeviceSecret,
  generateVerifier,
  getSession,
  listDevices,
  newPassword,
  resendConfirmationCode,
  signIn,
  signOut,
  signUp,
  srp
});
