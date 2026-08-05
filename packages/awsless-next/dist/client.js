import {
  createProxy
} from "./chunk-XERFMF6Z.js";
import "./chunk-MLKGABMK.js";

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
export {
  Auth,
  getAuthProps
};
