import {
  createProxy
} from "./chunk-XERFMF6Z.js";

// src/lib/client/auth.ts
import { constantCase } from "change-case";

// src/lib/client/util.ts
var getBindEnv = (name) => {
  return import.meta.env[name];
};

// src/lib/client/auth.ts
var Auth = /* @__PURE__ */ createProxy((name) => {
  return getAuthProps(name);
});
var getAuthProps = (name) => {
  const id = constantCase(name);
  return {
    userPoolId: getBindEnv(`AUTH_${id}_USER_POOL_ID`),
    clientId: getBindEnv(`AUTH_${id}_CLIENT_ID`)
  };
};

// src/lib/client/http.ts
import { seconds, toMilliSeconds } from "@awsless/duration";
var HttpError = class extends Error {
  constructor(status, body, url) {
    super(`HTTP ${status} from ${url}: ${body.slice(0, 500)}`);
    this.status = status;
    this.body = body;
    this.url = url;
    this.name = "HttpError";
  }
  status;
  body;
  url;
};
var createHttpFetcher = (host, options = {}) => {
  const timeout = toMilliSeconds(options.timeout ?? seconds(30));
  return async ({ method, path, headers, body, query }) => {
    const url = new URL(path, host);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        url.searchParams.set(key, value);
      }
    }
    headers.set("content-type", "application/json");
    const payload = body === void 0 ? void 0 : JSON.stringify(body);
    if (method === "POST") {
      const bytes = new TextEncoder().encode(payload ?? "");
      const hash = await crypto.subtle.digest("SHA-256", bytes);
      headers.set(
        "x-amz-content-sha256",
        Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("")
      );
    }
    const response = await fetch(url, {
      method,
      headers,
      body: payload,
      signal: AbortSignal.timeout(timeout)
    });
    if (!response.ok) {
      throw new HttpError(response.status, await response.text().catch(() => ""), url.toString());
    }
    return await response.json();
  };
};
var createHttpClient = (fetcher) => {
  const fetch2 = (method, routeKey, props) => {
    const path = routeKey.replaceAll(/{([a-z0-9-]+)}/g, (key) => {
      return encodeURIComponent(props?.params?.[key.substring(1, key.length - 1)]?.toString() ?? "");
    });
    return fetcher({
      headers: new Headers(props?.headers),
      query: props?.query,
      body: props?.body,
      method,
      path
    });
  };
  return {
    fetch: fetch2,
    get(routeKey, props) {
      return fetch2("GET", routeKey, props);
    },
    post(routeKey, props) {
      return fetch2("POST", routeKey, props);
    }
  };
};
export {
  Auth,
  HttpError,
  createHttpClient,
  createHttpFetcher,
  getAuthProps
};
