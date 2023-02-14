"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
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
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// ../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/rng.js
var require_rng = __commonJS({
  "../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/rng.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = rng;
    var _crypto = _interopRequireDefault(require("crypto"));
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var rnds8Pool = new Uint8Array(256);
    var poolPtr = rnds8Pool.length;
    function rng() {
      if (poolPtr > rnds8Pool.length - 16) {
        _crypto.default.randomFillSync(rnds8Pool);
        poolPtr = 0;
      }
      return rnds8Pool.slice(poolPtr, poolPtr += 16);
    }
  }
});

// ../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/regex.js
var require_regex = __commonJS({
  "../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/regex.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _default = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/validate.js
var require_validate = __commonJS({
  "../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/validate.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _regex = _interopRequireDefault(require_regex());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function validate4(uuid4) {
      return typeof uuid4 === "string" && _regex.default.test(uuid4);
    }
    var _default = validate4;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/stringify.js
var require_stringify = __commonJS({
  "../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/stringify.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _validate = _interopRequireDefault(require_validate());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var byteToHex = [];
    for (let i13 = 0; i13 < 256; ++i13) {
      byteToHex.push((i13 + 256).toString(16).substr(1));
    }
    function stringify4(arr, offset = 0) {
      const uuid4 = (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
      if (!(0, _validate.default)(uuid4)) {
        throw TypeError("Stringified UUID is invalid");
      }
      return uuid4;
    }
    var _default = stringify4;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/v1.js
var require_v1 = __commonJS({
  "../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/v1.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _rng = _interopRequireDefault(require_rng());
    var _stringify = _interopRequireDefault(require_stringify());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var _nodeId;
    var _clockseq;
    var _lastMSecs = 0;
    var _lastNSecs = 0;
    function v14(options, buf, offset) {
      let i13 = buf && offset || 0;
      const b13 = buf || new Array(16);
      options = options || {};
      let node = options.node || _nodeId;
      let clockseq = options.clockseq !== void 0 ? options.clockseq : _clockseq;
      if (node == null || clockseq == null) {
        const seedBytes = options.random || (options.rng || _rng.default)();
        if (node == null) {
          node = _nodeId = [seedBytes[0] | 1, seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]];
        }
        if (clockseq == null) {
          clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 16383;
        }
      }
      let msecs = options.msecs !== void 0 ? options.msecs : Date.now();
      let nsecs = options.nsecs !== void 0 ? options.nsecs : _lastNSecs + 1;
      const dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 1e4;
      if (dt < 0 && options.clockseq === void 0) {
        clockseq = clockseq + 1 & 16383;
      }
      if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === void 0) {
        nsecs = 0;
      }
      if (nsecs >= 1e4) {
        throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");
      }
      _lastMSecs = msecs;
      _lastNSecs = nsecs;
      _clockseq = clockseq;
      msecs += 122192928e5;
      const tl = ((msecs & 268435455) * 1e4 + nsecs) % 4294967296;
      b13[i13++] = tl >>> 24 & 255;
      b13[i13++] = tl >>> 16 & 255;
      b13[i13++] = tl >>> 8 & 255;
      b13[i13++] = tl & 255;
      const tmh = msecs / 4294967296 * 1e4 & 268435455;
      b13[i13++] = tmh >>> 8 & 255;
      b13[i13++] = tmh & 255;
      b13[i13++] = tmh >>> 24 & 15 | 16;
      b13[i13++] = tmh >>> 16 & 255;
      b13[i13++] = clockseq >>> 8 | 128;
      b13[i13++] = clockseq & 255;
      for (let n13 = 0; n13 < 6; ++n13) {
        b13[i13 + n13] = node[n13];
      }
      return buf || (0, _stringify.default)(b13);
    }
    var _default = v14;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/parse.js
var require_parse = __commonJS({
  "../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/parse.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _validate = _interopRequireDefault(require_validate());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function parse5(uuid4) {
      if (!(0, _validate.default)(uuid4)) {
        throw TypeError("Invalid UUID");
      }
      let v8;
      const arr = new Uint8Array(16);
      arr[0] = (v8 = parseInt(uuid4.slice(0, 8), 16)) >>> 24;
      arr[1] = v8 >>> 16 & 255;
      arr[2] = v8 >>> 8 & 255;
      arr[3] = v8 & 255;
      arr[4] = (v8 = parseInt(uuid4.slice(9, 13), 16)) >>> 8;
      arr[5] = v8 & 255;
      arr[6] = (v8 = parseInt(uuid4.slice(14, 18), 16)) >>> 8;
      arr[7] = v8 & 255;
      arr[8] = (v8 = parseInt(uuid4.slice(19, 23), 16)) >>> 8;
      arr[9] = v8 & 255;
      arr[10] = (v8 = parseInt(uuid4.slice(24, 36), 16)) / 1099511627776 & 255;
      arr[11] = v8 / 4294967296 & 255;
      arr[12] = v8 >>> 24 & 255;
      arr[13] = v8 >>> 16 & 255;
      arr[14] = v8 >>> 8 & 255;
      arr[15] = v8 & 255;
      return arr;
    }
    var _default = parse5;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/v35.js
var require_v35 = __commonJS({
  "../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/v35.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = _default;
    exports.URL = exports.DNS = void 0;
    var _stringify = _interopRequireDefault(require_stringify());
    var _parse = _interopRequireDefault(require_parse());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function stringToBytes(str) {
      str = unescape(encodeURIComponent(str));
      const bytes = [];
      for (let i13 = 0; i13 < str.length; ++i13) {
        bytes.push(str.charCodeAt(i13));
      }
      return bytes;
    }
    var DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    exports.DNS = DNS;
    var URL2 = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
    exports.URL = URL2;
    function _default(name, version4, hashfunc) {
      function generateUUID(value, namespace, buf, offset) {
        if (typeof value === "string") {
          value = stringToBytes(value);
        }
        if (typeof namespace === "string") {
          namespace = (0, _parse.default)(namespace);
        }
        if (namespace.length !== 16) {
          throw TypeError("Namespace must be array-like (16 iterable integer values, 0-255)");
        }
        let bytes = new Uint8Array(16 + value.length);
        bytes.set(namespace);
        bytes.set(value, namespace.length);
        bytes = hashfunc(bytes);
        bytes[6] = bytes[6] & 15 | version4;
        bytes[8] = bytes[8] & 63 | 128;
        if (buf) {
          offset = offset || 0;
          for (let i13 = 0; i13 < 16; ++i13) {
            buf[offset + i13] = bytes[i13];
          }
          return buf;
        }
        return (0, _stringify.default)(bytes);
      }
      try {
        generateUUID.name = name;
      } catch (err) {
      }
      generateUUID.DNS = DNS;
      generateUUID.URL = URL2;
      return generateUUID;
    }
  }
});

// ../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/md5.js
var require_md5 = __commonJS({
  "../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/md5.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _crypto = _interopRequireDefault(require("crypto"));
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function md5(bytes) {
      if (Array.isArray(bytes)) {
        bytes = Buffer.from(bytes);
      } else if (typeof bytes === "string") {
        bytes = Buffer.from(bytes, "utf8");
      }
      return _crypto.default.createHash("md5").update(bytes).digest();
    }
    var _default = md5;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/v3.js
var require_v3 = __commonJS({
  "../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/v3.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _v = _interopRequireDefault(require_v35());
    var _md = _interopRequireDefault(require_md5());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var v34 = (0, _v.default)("v3", 48, _md.default);
    var _default = v34;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/v4.js
var require_v4 = __commonJS({
  "../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/v4.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _rng = _interopRequireDefault(require_rng());
    var _stringify = _interopRequireDefault(require_stringify());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function v44(options, buf, offset) {
      options = options || {};
      const rnds = options.random || (options.rng || _rng.default)();
      rnds[6] = rnds[6] & 15 | 64;
      rnds[8] = rnds[8] & 63 | 128;
      if (buf) {
        offset = offset || 0;
        for (let i13 = 0; i13 < 16; ++i13) {
          buf[offset + i13] = rnds[i13];
        }
        return buf;
      }
      return (0, _stringify.default)(rnds);
    }
    var _default = v44;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/sha1.js
var require_sha1 = __commonJS({
  "../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/sha1.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _crypto = _interopRequireDefault(require("crypto"));
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function sha1(bytes) {
      if (Array.isArray(bytes)) {
        bytes = Buffer.from(bytes);
      } else if (typeof bytes === "string") {
        bytes = Buffer.from(bytes, "utf8");
      }
      return _crypto.default.createHash("sha1").update(bytes).digest();
    }
    var _default = sha1;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/v5.js
var require_v5 = __commonJS({
  "../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/v5.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _v = _interopRequireDefault(require_v35());
    var _sha = _interopRequireDefault(require_sha1());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var v54 = (0, _v.default)("v5", 80, _sha.default);
    var _default = v54;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/nil.js
var require_nil = __commonJS({
  "../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/nil.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _default = "00000000-0000-0000-0000-000000000000";
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/version.js
var require_version = __commonJS({
  "../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/version.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _validate = _interopRequireDefault(require_validate());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function version4(uuid4) {
      if (!(0, _validate.default)(uuid4)) {
        throw TypeError("Invalid UUID");
      }
      return parseInt(uuid4.substr(14, 1), 16);
    }
    var _default = version4;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/index.js
var require_dist = __commonJS({
  "../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    Object.defineProperty(exports, "v1", {
      enumerable: true,
      get: function() {
        return _v.default;
      }
    });
    Object.defineProperty(exports, "v3", {
      enumerable: true,
      get: function() {
        return _v2.default;
      }
    });
    Object.defineProperty(exports, "v4", {
      enumerable: true,
      get: function() {
        return _v3.default;
      }
    });
    Object.defineProperty(exports, "v5", {
      enumerable: true,
      get: function() {
        return _v4.default;
      }
    });
    Object.defineProperty(exports, "NIL", {
      enumerable: true,
      get: function() {
        return _nil.default;
      }
    });
    Object.defineProperty(exports, "version", {
      enumerable: true,
      get: function() {
        return _version.default;
      }
    });
    Object.defineProperty(exports, "validate", {
      enumerable: true,
      get: function() {
        return _validate.default;
      }
    });
    Object.defineProperty(exports, "stringify", {
      enumerable: true,
      get: function() {
        return _stringify.default;
      }
    });
    Object.defineProperty(exports, "parse", {
      enumerable: true,
      get: function() {
        return _parse.default;
      }
    });
    var _v = _interopRequireDefault(require_v1());
    var _v2 = _interopRequireDefault(require_v3());
    var _v3 = _interopRequireDefault(require_v4());
    var _v4 = _interopRequireDefault(require_v5());
    var _nil = _interopRequireDefault(require_nil());
    var _version = _interopRequireDefault(require_version());
    var _validate = _interopRequireDefault(require_validate());
    var _stringify = _interopRequireDefault(require_stringify());
    var _parse = _interopRequireDefault(require_parse());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
  }
});

// ../../node_modules/obliterator/iterator.js
var require_iterator = __commonJS({
  "../../node_modules/obliterator/iterator.js"(exports, module2) {
    function Iterator(next) {
      Object.defineProperty(this, "_next", {
        writable: false,
        enumerable: false,
        value: next
      });
      this.done = false;
    }
    Iterator.prototype.next = function() {
      if (this.done)
        return { done: true };
      var step = this._next();
      if (step.done)
        this.done = true;
      return step;
    };
    if (typeof Symbol !== "undefined")
      Iterator.prototype[Symbol.iterator] = function() {
        return this;
      };
    Iterator.of = function() {
      var args = arguments, l13 = args.length, i13 = 0;
      return new Iterator(function() {
        if (i13 >= l13)
          return { done: true };
        return { done: false, value: args[i13++] };
      });
    };
    Iterator.empty = function() {
      var iterator = new Iterator(null);
      iterator.done = true;
      return iterator;
    };
    Iterator.is = function(value) {
      if (value instanceof Iterator)
        return true;
      return typeof value === "object" && value !== null && typeof value.next === "function";
    };
    module2.exports = Iterator;
  }
});

// ../../node_modules/obliterator/foreach.js
var require_foreach = __commonJS({
  "../../node_modules/obliterator/foreach.js"(exports, module2) {
    var ARRAY_BUFFER_SUPPORT = typeof ArrayBuffer !== "undefined";
    var SYMBOL_SUPPORT = typeof Symbol !== "undefined";
    function forEach(iterable, callback) {
      var iterator, k13, i13, l13, s13;
      if (!iterable)
        throw new Error("obliterator/forEach: invalid iterable.");
      if (typeof callback !== "function")
        throw new Error("obliterator/forEach: expecting a callback.");
      if (Array.isArray(iterable) || ARRAY_BUFFER_SUPPORT && ArrayBuffer.isView(iterable) || typeof iterable === "string" || iterable.toString() === "[object Arguments]") {
        for (i13 = 0, l13 = iterable.length; i13 < l13; i13++)
          callback(iterable[i13], i13);
        return;
      }
      if (typeof iterable.forEach === "function") {
        iterable.forEach(callback);
        return;
      }
      if (SYMBOL_SUPPORT && Symbol.iterator in iterable && typeof iterable.next !== "function") {
        iterable = iterable[Symbol.iterator]();
      }
      if (typeof iterable.next === "function") {
        iterator = iterable;
        i13 = 0;
        while (s13 = iterator.next(), s13.done !== true) {
          callback(s13.value, i13);
          i13++;
        }
        return;
      }
      for (k13 in iterable) {
        if (iterable.hasOwnProperty(k13)) {
          callback(iterable[k13], k13);
        }
      }
      return;
    }
    forEach.forEachWithNullKeys = function(iterable, callback) {
      var iterator, k13, i13, l13, s13;
      if (!iterable)
        throw new Error("obliterator/forEachWithNullKeys: invalid iterable.");
      if (typeof callback !== "function")
        throw new Error("obliterator/forEachWithNullKeys: expecting a callback.");
      if (Array.isArray(iterable) || ARRAY_BUFFER_SUPPORT && ArrayBuffer.isView(iterable) || typeof iterable === "string" || iterable.toString() === "[object Arguments]") {
        for (i13 = 0, l13 = iterable.length; i13 < l13; i13++)
          callback(iterable[i13], null);
        return;
      }
      if (iterable instanceof Set) {
        iterable.forEach(function(value) {
          callback(value, null);
        });
        return;
      }
      if (typeof iterable.forEach === "function") {
        iterable.forEach(callback);
        return;
      }
      if (SYMBOL_SUPPORT && Symbol.iterator in iterable && typeof iterable.next !== "function") {
        iterable = iterable[Symbol.iterator]();
      }
      if (typeof iterable.next === "function") {
        iterator = iterable;
        i13 = 0;
        while (s13 = iterator.next(), s13.done !== true) {
          callback(s13.value, null);
          i13++;
        }
        return;
      }
      for (k13 in iterable) {
        if (iterable.hasOwnProperty(k13)) {
          callback(iterable[k13], k13);
        }
      }
      return;
    };
    module2.exports = forEach;
  }
});

// ../../node_modules/mnemonist/utils/typed-arrays.js
var require_typed_arrays = __commonJS({
  "../../node_modules/mnemonist/utils/typed-arrays.js"(exports) {
    var MAX_8BIT_INTEGER = Math.pow(2, 8) - 1;
    var MAX_16BIT_INTEGER = Math.pow(2, 16) - 1;
    var MAX_32BIT_INTEGER = Math.pow(2, 32) - 1;
    var MAX_SIGNED_8BIT_INTEGER = Math.pow(2, 7) - 1;
    var MAX_SIGNED_16BIT_INTEGER = Math.pow(2, 15) - 1;
    var MAX_SIGNED_32BIT_INTEGER = Math.pow(2, 31) - 1;
    exports.getPointerArray = function(size) {
      var maxIndex = size - 1;
      if (maxIndex <= MAX_8BIT_INTEGER)
        return Uint8Array;
      if (maxIndex <= MAX_16BIT_INTEGER)
        return Uint16Array;
      if (maxIndex <= MAX_32BIT_INTEGER)
        return Uint32Array;
      return Float64Array;
    };
    exports.getSignedPointerArray = function(size) {
      var maxIndex = size - 1;
      if (maxIndex <= MAX_SIGNED_8BIT_INTEGER)
        return Int8Array;
      if (maxIndex <= MAX_SIGNED_16BIT_INTEGER)
        return Int16Array;
      if (maxIndex <= MAX_SIGNED_32BIT_INTEGER)
        return Int32Array;
      return Float64Array;
    };
    exports.getNumberType = function(value) {
      if (value === (value | 0)) {
        if (Math.sign(value) === -1) {
          if (value <= 127 && value >= -128)
            return Int8Array;
          if (value <= 32767 && value >= -32768)
            return Int16Array;
          return Int32Array;
        } else {
          if (value <= 255)
            return Uint8Array;
          if (value <= 65535)
            return Uint16Array;
          return Uint32Array;
        }
      }
      return Float64Array;
    };
    var TYPE_PRIORITY = {
      Uint8Array: 1,
      Int8Array: 2,
      Uint16Array: 3,
      Int16Array: 4,
      Uint32Array: 5,
      Int32Array: 6,
      Float32Array: 7,
      Float64Array: 8
    };
    exports.getMinimalRepresentation = function(array, getter) {
      var maxType = null, maxPriority = 0, p13, t8, v8, i13, l13;
      for (i13 = 0, l13 = array.length; i13 < l13; i13++) {
        v8 = getter ? getter(array[i13]) : array[i13];
        t8 = exports.getNumberType(v8);
        p13 = TYPE_PRIORITY[t8.name];
        if (p13 > maxPriority) {
          maxPriority = p13;
          maxType = t8;
        }
      }
      return maxType;
    };
    exports.isTypedArray = function(value) {
      return typeof ArrayBuffer !== "undefined" && ArrayBuffer.isView(value);
    };
    exports.concat = function() {
      var length = 0, i13, o13, l13;
      for (i13 = 0, l13 = arguments.length; i13 < l13; i13++)
        length += arguments[i13].length;
      var array = new arguments[0].constructor(length);
      for (i13 = 0, o13 = 0; i13 < l13; i13++) {
        array.set(arguments[i13], o13);
        o13 += arguments[i13].length;
      }
      return array;
    };
    exports.indices = function(length) {
      var PointerArray = exports.getPointerArray(length);
      var array = new PointerArray(length);
      for (var i13 = 0; i13 < length; i13++)
        array[i13] = i13;
      return array;
    };
  }
});

// ../../node_modules/mnemonist/utils/iterables.js
var require_iterables = __commonJS({
  "../../node_modules/mnemonist/utils/iterables.js"(exports) {
    var forEach = require_foreach();
    var typed = require_typed_arrays();
    function isArrayLike(target) {
      return Array.isArray(target) || typed.isTypedArray(target);
    }
    function guessLength(target) {
      if (typeof target.length === "number")
        return target.length;
      if (typeof target.size === "number")
        return target.size;
      return;
    }
    function toArray(target) {
      var l13 = guessLength(target);
      var array = typeof l13 === "number" ? new Array(l13) : [];
      var i13 = 0;
      forEach(target, function(value) {
        array[i13++] = value;
      });
      return array;
    }
    function toArrayWithIndices(target) {
      var l13 = guessLength(target);
      var IndexArray = typeof l13 === "number" ? typed.getPointerArray(l13) : Array;
      var array = typeof l13 === "number" ? new Array(l13) : [];
      var indices = typeof l13 === "number" ? new IndexArray(l13) : [];
      var i13 = 0;
      forEach(target, function(value) {
        array[i13] = value;
        indices[i13] = i13++;
      });
      return [array, indices];
    }
    exports.isArrayLike = isArrayLike;
    exports.guessLength = guessLength;
    exports.toArray = toArray;
    exports.toArrayWithIndices = toArrayWithIndices;
  }
});

// ../../node_modules/mnemonist/lru-cache.js
var require_lru_cache = __commonJS({
  "../../node_modules/mnemonist/lru-cache.js"(exports, module2) {
    var Iterator = require_iterator();
    var forEach = require_foreach();
    var typed = require_typed_arrays();
    var iterables = require_iterables();
    function LRUCache2(Keys, Values, capacity) {
      if (arguments.length < 2) {
        capacity = Keys;
        Keys = null;
        Values = null;
      }
      this.capacity = capacity;
      if (typeof this.capacity !== "number" || this.capacity <= 0)
        throw new Error("mnemonist/lru-cache: capacity should be positive number.");
      var PointerArray = typed.getPointerArray(capacity);
      this.forward = new PointerArray(capacity);
      this.backward = new PointerArray(capacity);
      this.K = typeof Keys === "function" ? new Keys(capacity) : new Array(capacity);
      this.V = typeof Values === "function" ? new Values(capacity) : new Array(capacity);
      this.size = 0;
      this.head = 0;
      this.tail = 0;
      this.items = {};
    }
    LRUCache2.prototype.clear = function() {
      this.size = 0;
      this.head = 0;
      this.tail = 0;
      this.items = {};
    };
    LRUCache2.prototype.splayOnTop = function(pointer) {
      var oldHead = this.head;
      if (this.head === pointer)
        return this;
      var previous = this.backward[pointer], next = this.forward[pointer];
      if (this.tail === pointer) {
        this.tail = previous;
      } else {
        this.backward[next] = previous;
      }
      this.forward[previous] = next;
      this.backward[oldHead] = pointer;
      this.head = pointer;
      this.forward[pointer] = oldHead;
      return this;
    };
    LRUCache2.prototype.set = function(key, value) {
      var pointer = this.items[key];
      if (typeof pointer !== "undefined") {
        this.splayOnTop(pointer);
        this.V[pointer] = value;
        return;
      }
      if (this.size < this.capacity) {
        pointer = this.size++;
      } else {
        pointer = this.tail;
        this.tail = this.backward[pointer];
        delete this.items[this.K[pointer]];
      }
      this.items[key] = pointer;
      this.K[pointer] = key;
      this.V[pointer] = value;
      this.forward[pointer] = this.head;
      this.backward[this.head] = pointer;
      this.head = pointer;
    };
    LRUCache2.prototype.setpop = function(key, value) {
      var oldValue = null;
      var oldKey = null;
      var pointer = this.items[key];
      if (typeof pointer !== "undefined") {
        this.splayOnTop(pointer);
        oldValue = this.V[pointer];
        this.V[pointer] = value;
        return { evicted: false, key, value: oldValue };
      }
      if (this.size < this.capacity) {
        pointer = this.size++;
      } else {
        pointer = this.tail;
        this.tail = this.backward[pointer];
        oldValue = this.V[pointer];
        oldKey = this.K[pointer];
        delete this.items[this.K[pointer]];
      }
      this.items[key] = pointer;
      this.K[pointer] = key;
      this.V[pointer] = value;
      this.forward[pointer] = this.head;
      this.backward[this.head] = pointer;
      this.head = pointer;
      if (oldKey) {
        return { evicted: true, key: oldKey, value: oldValue };
      } else {
        return null;
      }
    };
    LRUCache2.prototype.has = function(key) {
      return key in this.items;
    };
    LRUCache2.prototype.get = function(key) {
      var pointer = this.items[key];
      if (typeof pointer === "undefined")
        return;
      this.splayOnTop(pointer);
      return this.V[pointer];
    };
    LRUCache2.prototype.peek = function(key) {
      var pointer = this.items[key];
      if (typeof pointer === "undefined")
        return;
      return this.V[pointer];
    };
    LRUCache2.prototype.forEach = function(callback, scope) {
      scope = arguments.length > 1 ? scope : this;
      var i13 = 0, l13 = this.size;
      var pointer = this.head, keys = this.K, values = this.V, forward = this.forward;
      while (i13 < l13) {
        callback.call(scope, values[pointer], keys[pointer], this);
        pointer = forward[pointer];
        i13++;
      }
    };
    LRUCache2.prototype.keys = function() {
      var i13 = 0, l13 = this.size;
      var pointer = this.head, keys = this.K, forward = this.forward;
      return new Iterator(function() {
        if (i13 >= l13)
          return { done: true };
        var key = keys[pointer];
        i13++;
        if (i13 < l13)
          pointer = forward[pointer];
        return {
          done: false,
          value: key
        };
      });
    };
    LRUCache2.prototype.values = function() {
      var i13 = 0, l13 = this.size;
      var pointer = this.head, values = this.V, forward = this.forward;
      return new Iterator(function() {
        if (i13 >= l13)
          return { done: true };
        var value = values[pointer];
        i13++;
        if (i13 < l13)
          pointer = forward[pointer];
        return {
          done: false,
          value
        };
      });
    };
    LRUCache2.prototype.entries = function() {
      var i13 = 0, l13 = this.size;
      var pointer = this.head, keys = this.K, values = this.V, forward = this.forward;
      return new Iterator(function() {
        if (i13 >= l13)
          return { done: true };
        var key = keys[pointer], value = values[pointer];
        i13++;
        if (i13 < l13)
          pointer = forward[pointer];
        return {
          done: false,
          value: [key, value]
        };
      });
    };
    if (typeof Symbol !== "undefined")
      LRUCache2.prototype[Symbol.iterator] = LRUCache2.prototype.entries;
    LRUCache2.prototype.inspect = function() {
      var proxy = /* @__PURE__ */ new Map();
      var iterator = this.entries(), step;
      while (step = iterator.next(), !step.done)
        proxy.set(step.value[0], step.value[1]);
      Object.defineProperty(proxy, "constructor", {
        value: LRUCache2,
        enumerable: false
      });
      return proxy;
    };
    if (typeof Symbol !== "undefined")
      LRUCache2.prototype[Symbol.for("nodejs.util.inspect.custom")] = LRUCache2.prototype.inspect;
    LRUCache2.from = function(iterable, Keys, Values, capacity) {
      if (arguments.length < 2) {
        capacity = iterables.guessLength(iterable);
        if (typeof capacity !== "number")
          throw new Error("mnemonist/lru-cache.from: could not guess iterable length. Please provide desired capacity as last argument.");
      } else if (arguments.length === 2) {
        capacity = Keys;
        Keys = null;
        Values = null;
      }
      var cache = new LRUCache2(Keys, Values, capacity);
      forEach(iterable, function(value, key) {
        cache.set(key, value);
      });
      return cache;
    };
    module2.exports = LRUCache2;
  }
});

// ../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/rng.js
var require_rng2 = __commonJS({
  "../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/rng.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = rng;
    var _crypto = _interopRequireDefault(require("crypto"));
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var rnds8Pool = new Uint8Array(256);
    var poolPtr = rnds8Pool.length;
    function rng() {
      if (poolPtr > rnds8Pool.length - 16) {
        _crypto.default.randomFillSync(rnds8Pool);
        poolPtr = 0;
      }
      return rnds8Pool.slice(poolPtr, poolPtr += 16);
    }
  }
});

// ../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/regex.js
var require_regex2 = __commonJS({
  "../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/regex.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _default = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/validate.js
var require_validate2 = __commonJS({
  "../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/validate.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _regex = _interopRequireDefault(require_regex2());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function validate4(uuid4) {
      return typeof uuid4 === "string" && _regex.default.test(uuid4);
    }
    var _default = validate4;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/stringify.js
var require_stringify2 = __commonJS({
  "../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/stringify.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _validate = _interopRequireDefault(require_validate2());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var byteToHex = [];
    for (let i13 = 0; i13 < 256; ++i13) {
      byteToHex.push((i13 + 256).toString(16).substr(1));
    }
    function stringify4(arr, offset = 0) {
      const uuid4 = (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
      if (!(0, _validate.default)(uuid4)) {
        throw TypeError("Stringified UUID is invalid");
      }
      return uuid4;
    }
    var _default = stringify4;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/v1.js
var require_v12 = __commonJS({
  "../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/v1.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _rng = _interopRequireDefault(require_rng2());
    var _stringify = _interopRequireDefault(require_stringify2());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var _nodeId;
    var _clockseq;
    var _lastMSecs = 0;
    var _lastNSecs = 0;
    function v14(options, buf, offset) {
      let i13 = buf && offset || 0;
      const b13 = buf || new Array(16);
      options = options || {};
      let node = options.node || _nodeId;
      let clockseq = options.clockseq !== void 0 ? options.clockseq : _clockseq;
      if (node == null || clockseq == null) {
        const seedBytes = options.random || (options.rng || _rng.default)();
        if (node == null) {
          node = _nodeId = [seedBytes[0] | 1, seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]];
        }
        if (clockseq == null) {
          clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 16383;
        }
      }
      let msecs = options.msecs !== void 0 ? options.msecs : Date.now();
      let nsecs = options.nsecs !== void 0 ? options.nsecs : _lastNSecs + 1;
      const dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 1e4;
      if (dt < 0 && options.clockseq === void 0) {
        clockseq = clockseq + 1 & 16383;
      }
      if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === void 0) {
        nsecs = 0;
      }
      if (nsecs >= 1e4) {
        throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");
      }
      _lastMSecs = msecs;
      _lastNSecs = nsecs;
      _clockseq = clockseq;
      msecs += 122192928e5;
      const tl = ((msecs & 268435455) * 1e4 + nsecs) % 4294967296;
      b13[i13++] = tl >>> 24 & 255;
      b13[i13++] = tl >>> 16 & 255;
      b13[i13++] = tl >>> 8 & 255;
      b13[i13++] = tl & 255;
      const tmh = msecs / 4294967296 * 1e4 & 268435455;
      b13[i13++] = tmh >>> 8 & 255;
      b13[i13++] = tmh & 255;
      b13[i13++] = tmh >>> 24 & 15 | 16;
      b13[i13++] = tmh >>> 16 & 255;
      b13[i13++] = clockseq >>> 8 | 128;
      b13[i13++] = clockseq & 255;
      for (let n13 = 0; n13 < 6; ++n13) {
        b13[i13 + n13] = node[n13];
      }
      return buf || (0, _stringify.default)(b13);
    }
    var _default = v14;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/parse.js
var require_parse2 = __commonJS({
  "../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/parse.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _validate = _interopRequireDefault(require_validate2());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function parse5(uuid4) {
      if (!(0, _validate.default)(uuid4)) {
        throw TypeError("Invalid UUID");
      }
      let v8;
      const arr = new Uint8Array(16);
      arr[0] = (v8 = parseInt(uuid4.slice(0, 8), 16)) >>> 24;
      arr[1] = v8 >>> 16 & 255;
      arr[2] = v8 >>> 8 & 255;
      arr[3] = v8 & 255;
      arr[4] = (v8 = parseInt(uuid4.slice(9, 13), 16)) >>> 8;
      arr[5] = v8 & 255;
      arr[6] = (v8 = parseInt(uuid4.slice(14, 18), 16)) >>> 8;
      arr[7] = v8 & 255;
      arr[8] = (v8 = parseInt(uuid4.slice(19, 23), 16)) >>> 8;
      arr[9] = v8 & 255;
      arr[10] = (v8 = parseInt(uuid4.slice(24, 36), 16)) / 1099511627776 & 255;
      arr[11] = v8 / 4294967296 & 255;
      arr[12] = v8 >>> 24 & 255;
      arr[13] = v8 >>> 16 & 255;
      arr[14] = v8 >>> 8 & 255;
      arr[15] = v8 & 255;
      return arr;
    }
    var _default = parse5;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/v35.js
var require_v352 = __commonJS({
  "../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/v35.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = _default;
    exports.URL = exports.DNS = void 0;
    var _stringify = _interopRequireDefault(require_stringify2());
    var _parse = _interopRequireDefault(require_parse2());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function stringToBytes(str) {
      str = unescape(encodeURIComponent(str));
      const bytes = [];
      for (let i13 = 0; i13 < str.length; ++i13) {
        bytes.push(str.charCodeAt(i13));
      }
      return bytes;
    }
    var DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    exports.DNS = DNS;
    var URL2 = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
    exports.URL = URL2;
    function _default(name, version4, hashfunc) {
      function generateUUID(value, namespace, buf, offset) {
        if (typeof value === "string") {
          value = stringToBytes(value);
        }
        if (typeof namespace === "string") {
          namespace = (0, _parse.default)(namespace);
        }
        if (namespace.length !== 16) {
          throw TypeError("Namespace must be array-like (16 iterable integer values, 0-255)");
        }
        let bytes = new Uint8Array(16 + value.length);
        bytes.set(namespace);
        bytes.set(value, namespace.length);
        bytes = hashfunc(bytes);
        bytes[6] = bytes[6] & 15 | version4;
        bytes[8] = bytes[8] & 63 | 128;
        if (buf) {
          offset = offset || 0;
          for (let i13 = 0; i13 < 16; ++i13) {
            buf[offset + i13] = bytes[i13];
          }
          return buf;
        }
        return (0, _stringify.default)(bytes);
      }
      try {
        generateUUID.name = name;
      } catch (err) {
      }
      generateUUID.DNS = DNS;
      generateUUID.URL = URL2;
      return generateUUID;
    }
  }
});

// ../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/md5.js
var require_md52 = __commonJS({
  "../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/md5.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _crypto = _interopRequireDefault(require("crypto"));
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function md5(bytes) {
      if (Array.isArray(bytes)) {
        bytes = Buffer.from(bytes);
      } else if (typeof bytes === "string") {
        bytes = Buffer.from(bytes, "utf8");
      }
      return _crypto.default.createHash("md5").update(bytes).digest();
    }
    var _default = md5;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/v3.js
var require_v32 = __commonJS({
  "../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/v3.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _v = _interopRequireDefault(require_v352());
    var _md = _interopRequireDefault(require_md52());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var v34 = (0, _v.default)("v3", 48, _md.default);
    var _default = v34;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/v4.js
var require_v42 = __commonJS({
  "../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/v4.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _rng = _interopRequireDefault(require_rng2());
    var _stringify = _interopRequireDefault(require_stringify2());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function v44(options, buf, offset) {
      options = options || {};
      const rnds = options.random || (options.rng || _rng.default)();
      rnds[6] = rnds[6] & 15 | 64;
      rnds[8] = rnds[8] & 63 | 128;
      if (buf) {
        offset = offset || 0;
        for (let i13 = 0; i13 < 16; ++i13) {
          buf[offset + i13] = rnds[i13];
        }
        return buf;
      }
      return (0, _stringify.default)(rnds);
    }
    var _default = v44;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/sha1.js
var require_sha12 = __commonJS({
  "../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/sha1.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _crypto = _interopRequireDefault(require("crypto"));
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function sha1(bytes) {
      if (Array.isArray(bytes)) {
        bytes = Buffer.from(bytes);
      } else if (typeof bytes === "string") {
        bytes = Buffer.from(bytes, "utf8");
      }
      return _crypto.default.createHash("sha1").update(bytes).digest();
    }
    var _default = sha1;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/v5.js
var require_v52 = __commonJS({
  "../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/v5.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _v = _interopRequireDefault(require_v352());
    var _sha = _interopRequireDefault(require_sha12());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var v54 = (0, _v.default)("v5", 80, _sha.default);
    var _default = v54;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/nil.js
var require_nil2 = __commonJS({
  "../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/nil.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _default = "00000000-0000-0000-0000-000000000000";
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/version.js
var require_version2 = __commonJS({
  "../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/version.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _validate = _interopRequireDefault(require_validate2());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function version4(uuid4) {
      if (!(0, _validate.default)(uuid4)) {
        throw TypeError("Invalid UUID");
      }
      return parseInt(uuid4.substr(14, 1), 16);
    }
    var _default = version4;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/index.js
var require_dist2 = __commonJS({
  "../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    Object.defineProperty(exports, "v1", {
      enumerable: true,
      get: function() {
        return _v.default;
      }
    });
    Object.defineProperty(exports, "v3", {
      enumerable: true,
      get: function() {
        return _v2.default;
      }
    });
    Object.defineProperty(exports, "v4", {
      enumerable: true,
      get: function() {
        return _v3.default;
      }
    });
    Object.defineProperty(exports, "v5", {
      enumerable: true,
      get: function() {
        return _v4.default;
      }
    });
    Object.defineProperty(exports, "NIL", {
      enumerable: true,
      get: function() {
        return _nil.default;
      }
    });
    Object.defineProperty(exports, "version", {
      enumerable: true,
      get: function() {
        return _version.default;
      }
    });
    Object.defineProperty(exports, "validate", {
      enumerable: true,
      get: function() {
        return _validate.default;
      }
    });
    Object.defineProperty(exports, "stringify", {
      enumerable: true,
      get: function() {
        return _stringify.default;
      }
    });
    Object.defineProperty(exports, "parse", {
      enumerable: true,
      get: function() {
        return _parse.default;
      }
    });
    var _v = _interopRequireDefault(require_v12());
    var _v2 = _interopRequireDefault(require_v32());
    var _v3 = _interopRequireDefault(require_v42());
    var _v4 = _interopRequireDefault(require_v52());
    var _nil = _interopRequireDefault(require_nil2());
    var _version = _interopRequireDefault(require_version2());
    var _validate = _interopRequireDefault(require_validate2());
    var _stringify = _interopRequireDefault(require_stringify2());
    var _parse = _interopRequireDefault(require_parse2());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
  }
});

// ../../node_modules/fast-xml-parser/src/util.js
var require_util = __commonJS({
  "../../node_modules/fast-xml-parser/src/util.js"(exports) {
    "use strict";
    var nameStartChar = ":A-Za-z_\\u00C0-\\u00D6\\u00D8-\\u00F6\\u00F8-\\u02FF\\u0370-\\u037D\\u037F-\\u1FFF\\u200C-\\u200D\\u2070-\\u218F\\u2C00-\\u2FEF\\u3001-\\uD7FF\\uF900-\\uFDCF\\uFDF0-\\uFFFD";
    var nameChar = nameStartChar + "\\-.\\d\\u00B7\\u0300-\\u036F\\u203F-\\u2040";
    var nameRegexp = "[" + nameStartChar + "][" + nameChar + "]*";
    var regexName = new RegExp("^" + nameRegexp + "$");
    var getAllMatches = function(string, regex) {
      const matches = [];
      let match = regex.exec(string);
      while (match) {
        const allmatches = [];
        allmatches.startIndex = regex.lastIndex - match[0].length;
        const len = match.length;
        for (let index = 0; index < len; index++) {
          allmatches.push(match[index]);
        }
        matches.push(allmatches);
        match = regex.exec(string);
      }
      return matches;
    };
    var isName = function(string) {
      const match = regexName.exec(string);
      return !(match === null || typeof match === "undefined");
    };
    exports.isExist = function(v8) {
      return typeof v8 !== "undefined";
    };
    exports.isEmptyObject = function(obj) {
      return Object.keys(obj).length === 0;
    };
    exports.merge = function(target, a13, arrayMode) {
      if (a13) {
        const keys = Object.keys(a13);
        const len = keys.length;
        for (let i13 = 0; i13 < len; i13++) {
          if (arrayMode === "strict") {
            target[keys[i13]] = [a13[keys[i13]]];
          } else {
            target[keys[i13]] = a13[keys[i13]];
          }
        }
      }
    };
    exports.getValue = function(v8) {
      if (exports.isExist(v8)) {
        return v8;
      } else {
        return "";
      }
    };
    exports.isName = isName;
    exports.getAllMatches = getAllMatches;
    exports.nameRegexp = nameRegexp;
  }
});

// ../../node_modules/fast-xml-parser/src/validator.js
var require_validator = __commonJS({
  "../../node_modules/fast-xml-parser/src/validator.js"(exports) {
    "use strict";
    var util = require_util();
    var defaultOptions = {
      allowBooleanAttributes: false,
      unpairedTags: []
    };
    exports.validate = function(xmlData, options) {
      options = Object.assign({}, defaultOptions, options);
      const tags = [];
      let tagFound = false;
      let reachedRoot = false;
      if (xmlData[0] === "\uFEFF") {
        xmlData = xmlData.substr(1);
      }
      for (let i13 = 0; i13 < xmlData.length; i13++) {
        if (xmlData[i13] === "<" && xmlData[i13 + 1] === "?") {
          i13 += 2;
          i13 = readPI(xmlData, i13);
          if (i13.err)
            return i13;
        } else if (xmlData[i13] === "<") {
          let tagStartPos = i13;
          i13++;
          if (xmlData[i13] === "!") {
            i13 = readCommentAndCDATA(xmlData, i13);
            continue;
          } else {
            let closingTag = false;
            if (xmlData[i13] === "/") {
              closingTag = true;
              i13++;
            }
            let tagName = "";
            for (; i13 < xmlData.length && xmlData[i13] !== ">" && xmlData[i13] !== " " && xmlData[i13] !== "	" && xmlData[i13] !== "\n" && xmlData[i13] !== "\r"; i13++) {
              tagName += xmlData[i13];
            }
            tagName = tagName.trim();
            if (tagName[tagName.length - 1] === "/") {
              tagName = tagName.substring(0, tagName.length - 1);
              i13--;
            }
            if (!validateTagName(tagName)) {
              let msg;
              if (tagName.trim().length === 0) {
                msg = "Invalid space after '<'.";
              } else {
                msg = "Tag '" + tagName + "' is an invalid name.";
              }
              return getErrorObject("InvalidTag", msg, getLineNumberForPosition(xmlData, i13));
            }
            const result = readAttributeStr(xmlData, i13);
            if (result === false) {
              return getErrorObject("InvalidAttr", "Attributes for '" + tagName + "' have open quote.", getLineNumberForPosition(xmlData, i13));
            }
            let attrStr = result.value;
            i13 = result.index;
            if (attrStr[attrStr.length - 1] === "/") {
              const attrStrStart = i13 - attrStr.length;
              attrStr = attrStr.substring(0, attrStr.length - 1);
              const isValid = validateAttributeString(attrStr, options);
              if (isValid === true) {
                tagFound = true;
              } else {
                return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, attrStrStart + isValid.err.line));
              }
            } else if (closingTag) {
              if (!result.tagClosed) {
                return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' doesn't have proper closing.", getLineNumberForPosition(xmlData, i13));
              } else if (attrStr.trim().length > 0) {
                return getErrorObject("InvalidTag", "Closing tag '" + tagName + "' can't have attributes or invalid starting.", getLineNumberForPosition(xmlData, tagStartPos));
              } else {
                const otg = tags.pop();
                if (tagName !== otg.tagName) {
                  let openPos = getLineNumberForPosition(xmlData, otg.tagStartPos);
                  return getErrorObject(
                    "InvalidTag",
                    "Expected closing tag '" + otg.tagName + "' (opened in line " + openPos.line + ", col " + openPos.col + ") instead of closing tag '" + tagName + "'.",
                    getLineNumberForPosition(xmlData, tagStartPos)
                  );
                }
                if (tags.length == 0) {
                  reachedRoot = true;
                }
              }
            } else {
              const isValid = validateAttributeString(attrStr, options);
              if (isValid !== true) {
                return getErrorObject(isValid.err.code, isValid.err.msg, getLineNumberForPosition(xmlData, i13 - attrStr.length + isValid.err.line));
              }
              if (reachedRoot === true) {
                return getErrorObject("InvalidXml", "Multiple possible root nodes found.", getLineNumberForPosition(xmlData, i13));
              } else if (options.unpairedTags.indexOf(tagName) !== -1) {
              } else {
                tags.push({ tagName, tagStartPos });
              }
              tagFound = true;
            }
            for (i13++; i13 < xmlData.length; i13++) {
              if (xmlData[i13] === "<") {
                if (xmlData[i13 + 1] === "!") {
                  i13++;
                  i13 = readCommentAndCDATA(xmlData, i13);
                  continue;
                } else if (xmlData[i13 + 1] === "?") {
                  i13 = readPI(xmlData, ++i13);
                  if (i13.err)
                    return i13;
                } else {
                  break;
                }
              } else if (xmlData[i13] === "&") {
                const afterAmp = validateAmpersand(xmlData, i13);
                if (afterAmp == -1)
                  return getErrorObject("InvalidChar", "char '&' is not expected.", getLineNumberForPosition(xmlData, i13));
                i13 = afterAmp;
              } else {
                if (reachedRoot === true && !isWhiteSpace(xmlData[i13])) {
                  return getErrorObject("InvalidXml", "Extra text at the end", getLineNumberForPosition(xmlData, i13));
                }
              }
            }
            if (xmlData[i13] === "<") {
              i13--;
            }
          }
        } else {
          if (isWhiteSpace(xmlData[i13])) {
            continue;
          }
          return getErrorObject("InvalidChar", "char '" + xmlData[i13] + "' is not expected.", getLineNumberForPosition(xmlData, i13));
        }
      }
      if (!tagFound) {
        return getErrorObject("InvalidXml", "Start tag expected.", 1);
      } else if (tags.length == 1) {
        return getErrorObject("InvalidTag", "Unclosed tag '" + tags[0].tagName + "'.", getLineNumberForPosition(xmlData, tags[0].tagStartPos));
      } else if (tags.length > 0) {
        return getErrorObject("InvalidXml", "Invalid '" + JSON.stringify(tags.map((t8) => t8.tagName), null, 4).replace(/\r?\n/g, "") + "' found.", { line: 1, col: 1 });
      }
      return true;
    };
    function isWhiteSpace(char) {
      return char === " " || char === "	" || char === "\n" || char === "\r";
    }
    function readPI(xmlData, i13) {
      const start = i13;
      for (; i13 < xmlData.length; i13++) {
        if (xmlData[i13] == "?" || xmlData[i13] == " ") {
          const tagname = xmlData.substr(start, i13 - start);
          if (i13 > 5 && tagname === "xml") {
            return getErrorObject("InvalidXml", "XML declaration allowed only at the start of the document.", getLineNumberForPosition(xmlData, i13));
          } else if (xmlData[i13] == "?" && xmlData[i13 + 1] == ">") {
            i13++;
            break;
          } else {
            continue;
          }
        }
      }
      return i13;
    }
    function readCommentAndCDATA(xmlData, i13) {
      if (xmlData.length > i13 + 5 && xmlData[i13 + 1] === "-" && xmlData[i13 + 2] === "-") {
        for (i13 += 3; i13 < xmlData.length; i13++) {
          if (xmlData[i13] === "-" && xmlData[i13 + 1] === "-" && xmlData[i13 + 2] === ">") {
            i13 += 2;
            break;
          }
        }
      } else if (xmlData.length > i13 + 8 && xmlData[i13 + 1] === "D" && xmlData[i13 + 2] === "O" && xmlData[i13 + 3] === "C" && xmlData[i13 + 4] === "T" && xmlData[i13 + 5] === "Y" && xmlData[i13 + 6] === "P" && xmlData[i13 + 7] === "E") {
        let angleBracketsCount = 1;
        for (i13 += 8; i13 < xmlData.length; i13++) {
          if (xmlData[i13] === "<") {
            angleBracketsCount++;
          } else if (xmlData[i13] === ">") {
            angleBracketsCount--;
            if (angleBracketsCount === 0) {
              break;
            }
          }
        }
      } else if (xmlData.length > i13 + 9 && xmlData[i13 + 1] === "[" && xmlData[i13 + 2] === "C" && xmlData[i13 + 3] === "D" && xmlData[i13 + 4] === "A" && xmlData[i13 + 5] === "T" && xmlData[i13 + 6] === "A" && xmlData[i13 + 7] === "[") {
        for (i13 += 8; i13 < xmlData.length; i13++) {
          if (xmlData[i13] === "]" && xmlData[i13 + 1] === "]" && xmlData[i13 + 2] === ">") {
            i13 += 2;
            break;
          }
        }
      }
      return i13;
    }
    var doubleQuote = '"';
    var singleQuote = "'";
    function readAttributeStr(xmlData, i13) {
      let attrStr = "";
      let startChar = "";
      let tagClosed = false;
      for (; i13 < xmlData.length; i13++) {
        if (xmlData[i13] === doubleQuote || xmlData[i13] === singleQuote) {
          if (startChar === "") {
            startChar = xmlData[i13];
          } else if (startChar !== xmlData[i13]) {
          } else {
            startChar = "";
          }
        } else if (xmlData[i13] === ">") {
          if (startChar === "") {
            tagClosed = true;
            break;
          }
        }
        attrStr += xmlData[i13];
      }
      if (startChar !== "") {
        return false;
      }
      return {
        value: attrStr,
        index: i13,
        tagClosed
      };
    }
    var validAttrStrRegxp = new RegExp(`(\\s*)([^\\s=]+)(\\s*=)?(\\s*(['"])(([\\s\\S])*?)\\5)?`, "g");
    function validateAttributeString(attrStr, options) {
      const matches = util.getAllMatches(attrStr, validAttrStrRegxp);
      const attrNames = {};
      for (let i13 = 0; i13 < matches.length; i13++) {
        if (matches[i13][1].length === 0) {
          return getErrorObject("InvalidAttr", "Attribute '" + matches[i13][2] + "' has no space in starting.", getPositionFromMatch(matches[i13]));
        } else if (matches[i13][3] !== void 0 && matches[i13][4] === void 0) {
          return getErrorObject("InvalidAttr", "Attribute '" + matches[i13][2] + "' is without value.", getPositionFromMatch(matches[i13]));
        } else if (matches[i13][3] === void 0 && !options.allowBooleanAttributes) {
          return getErrorObject("InvalidAttr", "boolean attribute '" + matches[i13][2] + "' is not allowed.", getPositionFromMatch(matches[i13]));
        }
        const attrName = matches[i13][2];
        if (!validateAttrName(attrName)) {
          return getErrorObject("InvalidAttr", "Attribute '" + attrName + "' is an invalid name.", getPositionFromMatch(matches[i13]));
        }
        if (!attrNames.hasOwnProperty(attrName)) {
          attrNames[attrName] = 1;
        } else {
          return getErrorObject("InvalidAttr", "Attribute '" + attrName + "' is repeated.", getPositionFromMatch(matches[i13]));
        }
      }
      return true;
    }
    function validateNumberAmpersand(xmlData, i13) {
      let re = /\d/;
      if (xmlData[i13] === "x") {
        i13++;
        re = /[\da-fA-F]/;
      }
      for (; i13 < xmlData.length; i13++) {
        if (xmlData[i13] === ";")
          return i13;
        if (!xmlData[i13].match(re))
          break;
      }
      return -1;
    }
    function validateAmpersand(xmlData, i13) {
      i13++;
      if (xmlData[i13] === ";")
        return -1;
      if (xmlData[i13] === "#") {
        i13++;
        return validateNumberAmpersand(xmlData, i13);
      }
      let count = 0;
      for (; i13 < xmlData.length; i13++, count++) {
        if (xmlData[i13].match(/\w/) && count < 20)
          continue;
        if (xmlData[i13] === ";")
          break;
        return -1;
      }
      return i13;
    }
    function getErrorObject(code, message, lineNumber) {
      return {
        err: {
          code,
          msg: message,
          line: lineNumber.line || lineNumber,
          col: lineNumber.col
        }
      };
    }
    function validateAttrName(attrName) {
      return util.isName(attrName);
    }
    function validateTagName(tagname) {
      return util.isName(tagname);
    }
    function getLineNumberForPosition(xmlData, index) {
      const lines = xmlData.substring(0, index).split(/\r?\n/);
      return {
        line: lines.length,
        col: lines[lines.length - 1].length + 1
      };
    }
    function getPositionFromMatch(match) {
      return match.startIndex + match[1].length;
    }
  }
});

// ../../node_modules/fast-xml-parser/src/xmlparser/OptionsBuilder.js
var require_OptionsBuilder = __commonJS({
  "../../node_modules/fast-xml-parser/src/xmlparser/OptionsBuilder.js"(exports) {
    var defaultOptions = {
      preserveOrder: false,
      attributeNamePrefix: "@_",
      attributesGroupName: false,
      textNodeName: "#text",
      ignoreAttributes: true,
      removeNSPrefix: false,
      allowBooleanAttributes: false,
      parseTagValue: true,
      parseAttributeValue: false,
      trimValues: true,
      cdataPropName: false,
      numberParseOptions: {
        hex: true,
        leadingZeros: true
      },
      tagValueProcessor: function(tagName, val) {
        return val;
      },
      attributeValueProcessor: function(attrName, val) {
        return val;
      },
      stopNodes: [],
      alwaysCreateTextNode: false,
      isArray: () => false,
      commentPropName: false,
      unpairedTags: [],
      processEntities: true,
      htmlEntities: false,
      ignoreDeclaration: false,
      ignorePiTags: false,
      transformTagName: false
    };
    var buildOptions = function(options) {
      return Object.assign({}, defaultOptions, options);
    };
    exports.buildOptions = buildOptions;
    exports.defaultOptions = defaultOptions;
  }
});

// ../../node_modules/fast-xml-parser/src/xmlparser/xmlNode.js
var require_xmlNode = __commonJS({
  "../../node_modules/fast-xml-parser/src/xmlparser/xmlNode.js"(exports, module2) {
    "use strict";
    var XmlNode = class {
      constructor(tagname) {
        this.tagname = tagname;
        this.child = [];
        this[":@"] = {};
      }
      add(key, val) {
        this.child.push({ [key]: val });
      }
      addChild(node) {
        if (node[":@"] && Object.keys(node[":@"]).length > 0) {
          this.child.push({ [node.tagname]: node.child, [":@"]: node[":@"] });
        } else {
          this.child.push({ [node.tagname]: node.child });
        }
      }
    };
    module2.exports = XmlNode;
  }
});

// ../../node_modules/fast-xml-parser/src/xmlparser/DocTypeReader.js
var require_DocTypeReader = __commonJS({
  "../../node_modules/fast-xml-parser/src/xmlparser/DocTypeReader.js"(exports, module2) {
    function readDocType(xmlData, i13) {
      const entities = {};
      if (xmlData[i13 + 3] === "O" && xmlData[i13 + 4] === "C" && xmlData[i13 + 5] === "T" && xmlData[i13 + 6] === "Y" && xmlData[i13 + 7] === "P" && xmlData[i13 + 8] === "E") {
        i13 = i13 + 9;
        let angleBracketsCount = 1;
        let hasBody = false, entity = false, comment = false;
        let exp = "";
        for (; i13 < xmlData.length; i13++) {
          if (xmlData[i13] === "<") {
            if (hasBody && xmlData[i13 + 1] === "!" && xmlData[i13 + 2] === "E" && xmlData[i13 + 3] === "N" && xmlData[i13 + 4] === "T" && xmlData[i13 + 5] === "I" && xmlData[i13 + 6] === "T" && xmlData[i13 + 7] === "Y") {
              i13 += 7;
              entity = true;
            } else if (hasBody && xmlData[i13 + 1] === "!" && xmlData[i13 + 2] === "E" && xmlData[i13 + 3] === "L" && xmlData[i13 + 4] === "E" && xmlData[i13 + 5] === "M" && xmlData[i13 + 6] === "E" && xmlData[i13 + 7] === "N" && xmlData[i13 + 8] === "T") {
              i13 += 8;
            } else if (hasBody && xmlData[i13 + 1] === "!" && xmlData[i13 + 2] === "A" && xmlData[i13 + 3] === "T" && xmlData[i13 + 4] === "T" && xmlData[i13 + 5] === "L" && xmlData[i13 + 6] === "I" && xmlData[i13 + 7] === "S" && xmlData[i13 + 8] === "T") {
              i13 += 8;
            } else if (hasBody && xmlData[i13 + 1] === "!" && xmlData[i13 + 2] === "N" && xmlData[i13 + 3] === "O" && xmlData[i13 + 4] === "T" && xmlData[i13 + 5] === "A" && xmlData[i13 + 6] === "T" && xmlData[i13 + 7] === "I" && xmlData[i13 + 8] === "O" && xmlData[i13 + 9] === "N") {
              i13 += 9;
            } else if (xmlData[i13 + 1] === "!" && xmlData[i13 + 2] === "-" && xmlData[i13 + 3] === "-") {
              comment = true;
            } else {
              throw new Error("Invalid DOCTYPE");
            }
            angleBracketsCount++;
            exp = "";
          } else if (xmlData[i13] === ">") {
            if (comment) {
              if (xmlData[i13 - 1] === "-" && xmlData[i13 - 2] === "-") {
                comment = false;
              } else {
                throw new Error(`Invalid XML comment in DOCTYPE`);
              }
            } else if (entity) {
              parseEntityExp(exp, entities);
              entity = false;
            }
            angleBracketsCount--;
            if (angleBracketsCount === 0) {
              break;
            }
          } else if (xmlData[i13] === "[") {
            hasBody = true;
          } else {
            exp += xmlData[i13];
          }
        }
        if (angleBracketsCount !== 0) {
          throw new Error(`Unclosed DOCTYPE`);
        }
      } else {
        throw new Error(`Invalid Tag instead of DOCTYPE`);
      }
      return { entities, i: i13 };
    }
    var entityRegex = RegExp(`^\\s([a-zA-z0-0]+)[ 	](['"])([^&]+)\\2`);
    function parseEntityExp(exp, entities) {
      const match = entityRegex.exec(exp);
      if (match) {
        entities[match[1]] = {
          regx: RegExp(`&${match[1]};`, "g"),
          val: match[3]
        };
      }
    }
    module2.exports = readDocType;
  }
});

// ../../node_modules/strnum/strnum.js
var require_strnum = __commonJS({
  "../../node_modules/strnum/strnum.js"(exports, module2) {
    var hexRegex = /^[-+]?0x[a-fA-F0-9]+$/;
    var numRegex = /^([\-\+])?(0*)(\.[0-9]+([eE]\-?[0-9]+)?|[0-9]+(\.[0-9]+([eE]\-?[0-9]+)?)?)$/;
    if (!Number.parseInt && window.parseInt) {
      Number.parseInt = window.parseInt;
    }
    if (!Number.parseFloat && window.parseFloat) {
      Number.parseFloat = window.parseFloat;
    }
    var consider = {
      hex: true,
      leadingZeros: true,
      decimalPoint: ".",
      eNotation: true
    };
    function toNumber(str, options = {}) {
      options = Object.assign({}, consider, options);
      if (!str || typeof str !== "string")
        return str;
      let trimmedStr = str.trim();
      if (options.skipLike !== void 0 && options.skipLike.test(trimmedStr))
        return str;
      else if (options.hex && hexRegex.test(trimmedStr)) {
        return Number.parseInt(trimmedStr, 16);
      } else {
        const match = numRegex.exec(trimmedStr);
        if (match) {
          const sign = match[1];
          const leadingZeros = match[2];
          let numTrimmedByZeros = trimZeros(match[3]);
          const eNotation = match[4] || match[6];
          if (!options.leadingZeros && leadingZeros.length > 0 && sign && trimmedStr[2] !== ".")
            return str;
          else if (!options.leadingZeros && leadingZeros.length > 0 && !sign && trimmedStr[1] !== ".")
            return str;
          else {
            const num = Number(trimmedStr);
            const numStr = "" + num;
            if (numStr.search(/[eE]/) !== -1) {
              if (options.eNotation)
                return num;
              else
                return str;
            } else if (eNotation) {
              if (options.eNotation)
                return num;
              else
                return str;
            } else if (trimmedStr.indexOf(".") !== -1) {
              if (numStr === "0" && numTrimmedByZeros === "")
                return num;
              else if (numStr === numTrimmedByZeros)
                return num;
              else if (sign && numStr === "-" + numTrimmedByZeros)
                return num;
              else
                return str;
            }
            if (leadingZeros) {
              if (numTrimmedByZeros === numStr)
                return num;
              else if (sign + numTrimmedByZeros === numStr)
                return num;
              else
                return str;
            }
            if (trimmedStr === numStr)
              return num;
            else if (trimmedStr === sign + numStr)
              return num;
            return str;
          }
        } else {
          return str;
        }
      }
    }
    function trimZeros(numStr) {
      if (numStr && numStr.indexOf(".") !== -1) {
        numStr = numStr.replace(/0+$/, "");
        if (numStr === ".")
          numStr = "0";
        else if (numStr[0] === ".")
          numStr = "0" + numStr;
        else if (numStr[numStr.length - 1] === ".")
          numStr = numStr.substr(0, numStr.length - 1);
        return numStr;
      }
      return numStr;
    }
    module2.exports = toNumber;
  }
});

// ../../node_modules/fast-xml-parser/src/xmlparser/OrderedObjParser.js
var require_OrderedObjParser = __commonJS({
  "../../node_modules/fast-xml-parser/src/xmlparser/OrderedObjParser.js"(exports, module2) {
    "use strict";
    var util = require_util();
    var xmlNode = require_xmlNode();
    var readDocType = require_DocTypeReader();
    var toNumber = require_strnum();
    var regx = "<((!\\[CDATA\\[([\\s\\S]*?)(]]>))|((NAME:)?(NAME))([^>]*)>|((\\/)(NAME)\\s*>))([^<]*)".replace(/NAME/g, util.nameRegexp);
    var OrderedObjParser = class {
      constructor(options) {
        this.options = options;
        this.currentNode = null;
        this.tagsNodeStack = [];
        this.docTypeEntities = {};
        this.lastEntities = {
          "apos": { regex: /&(apos|#39|#x27);/g, val: "'" },
          "gt": { regex: /&(gt|#62|#x3E);/g, val: ">" },
          "lt": { regex: /&(lt|#60|#x3C);/g, val: "<" },
          "quot": { regex: /&(quot|#34|#x22);/g, val: '"' }
        };
        this.ampEntity = { regex: /&(amp|#38|#x26);/g, val: "&" };
        this.htmlEntities = {
          "space": { regex: /&(nbsp|#160);/g, val: " " },
          "cent": { regex: /&(cent|#162);/g, val: "\xA2" },
          "pound": { regex: /&(pound|#163);/g, val: "\xA3" },
          "yen": { regex: /&(yen|#165);/g, val: "\xA5" },
          "euro": { regex: /&(euro|#8364);/g, val: "\u20AC" },
          "copyright": { regex: /&(copy|#169);/g, val: "\xA9" },
          "reg": { regex: /&(reg|#174);/g, val: "\xAE" },
          "inr": { regex: /&(inr|#8377);/g, val: "\u20B9" }
        };
        this.addExternalEntities = addExternalEntities;
        this.parseXml = parseXml;
        this.parseTextData = parseTextData;
        this.resolveNameSpace = resolveNameSpace;
        this.buildAttributesMap = buildAttributesMap;
        this.isItStopNode = isItStopNode;
        this.replaceEntitiesValue = replaceEntitiesValue;
        this.readStopNodeData = readStopNodeData;
        this.saveTextToParentTag = saveTextToParentTag;
      }
    };
    function addExternalEntities(externalEntities) {
      const entKeys = Object.keys(externalEntities);
      for (let i13 = 0; i13 < entKeys.length; i13++) {
        const ent = entKeys[i13];
        this.lastEntities[ent] = {
          regex: new RegExp("&" + ent + ";", "g"),
          val: externalEntities[ent]
        };
      }
    }
    function parseTextData(val, tagName, jPath, dontTrim, hasAttributes, isLeafNode, escapeEntities) {
      if (val !== void 0) {
        if (this.options.trimValues && !dontTrim) {
          val = val.trim();
        }
        if (val.length > 0) {
          if (!escapeEntities)
            val = this.replaceEntitiesValue(val);
          const newval = this.options.tagValueProcessor(tagName, val, jPath, hasAttributes, isLeafNode);
          if (newval === null || newval === void 0) {
            return val;
          } else if (typeof newval !== typeof val || newval !== val) {
            return newval;
          } else if (this.options.trimValues) {
            return parseValue(val, this.options.parseTagValue, this.options.numberParseOptions);
          } else {
            const trimmedVal = val.trim();
            if (trimmedVal === val) {
              return parseValue(val, this.options.parseTagValue, this.options.numberParseOptions);
            } else {
              return val;
            }
          }
        }
      }
    }
    function resolveNameSpace(tagname) {
      if (this.options.removeNSPrefix) {
        const tags = tagname.split(":");
        const prefix = tagname.charAt(0) === "/" ? "/" : "";
        if (tags[0] === "xmlns") {
          return "";
        }
        if (tags.length === 2) {
          tagname = prefix + tags[1];
        }
      }
      return tagname;
    }
    var attrsRegx = new RegExp(`([^\\s=]+)\\s*(=\\s*(['"])([\\s\\S]*?)\\3)?`, "gm");
    function buildAttributesMap(attrStr, jPath) {
      if (!this.options.ignoreAttributes && typeof attrStr === "string") {
        const matches = util.getAllMatches(attrStr, attrsRegx);
        const len = matches.length;
        const attrs = {};
        for (let i13 = 0; i13 < len; i13++) {
          const attrName = this.resolveNameSpace(matches[i13][1]);
          let oldVal = matches[i13][4];
          const aName = this.options.attributeNamePrefix + attrName;
          if (attrName.length) {
            if (oldVal !== void 0) {
              if (this.options.trimValues) {
                oldVal = oldVal.trim();
              }
              oldVal = this.replaceEntitiesValue(oldVal);
              const newVal = this.options.attributeValueProcessor(attrName, oldVal, jPath);
              if (newVal === null || newVal === void 0) {
                attrs[aName] = oldVal;
              } else if (typeof newVal !== typeof oldVal || newVal !== oldVal) {
                attrs[aName] = newVal;
              } else {
                attrs[aName] = parseValue(
                  oldVal,
                  this.options.parseAttributeValue,
                  this.options.numberParseOptions
                );
              }
            } else if (this.options.allowBooleanAttributes) {
              attrs[aName] = true;
            }
          }
        }
        if (!Object.keys(attrs).length) {
          return;
        }
        if (this.options.attributesGroupName) {
          const attrCollection = {};
          attrCollection[this.options.attributesGroupName] = attrs;
          return attrCollection;
        }
        return attrs;
      }
    }
    var parseXml = function(xmlData) {
      xmlData = xmlData.replace(/\r\n?/g, "\n");
      const xmlObj = new xmlNode("!xml");
      let currentNode = xmlObj;
      let textData = "";
      let jPath = "";
      for (let i13 = 0; i13 < xmlData.length; i13++) {
        const ch = xmlData[i13];
        if (ch === "<") {
          if (xmlData[i13 + 1] === "/") {
            const closeIndex = findClosingIndex(xmlData, ">", i13, "Closing Tag is not closed.");
            let tagName = xmlData.substring(i13 + 2, closeIndex).trim();
            if (this.options.removeNSPrefix) {
              const colonIndex = tagName.indexOf(":");
              if (colonIndex !== -1) {
                tagName = tagName.substr(colonIndex + 1);
              }
            }
            if (this.options.transformTagName) {
              tagName = this.options.transformTagName(tagName);
            }
            if (currentNode) {
              textData = this.saveTextToParentTag(textData, currentNode, jPath);
            }
            jPath = jPath.substr(0, jPath.lastIndexOf("."));
            currentNode = this.tagsNodeStack.pop();
            textData = "";
            i13 = closeIndex;
          } else if (xmlData[i13 + 1] === "?") {
            let tagData = readTagExp(xmlData, i13, false, "?>");
            if (!tagData)
              throw new Error("Pi Tag is not closed.");
            textData = this.saveTextToParentTag(textData, currentNode, jPath);
            if (this.options.ignoreDeclaration && tagData.tagName === "?xml" || this.options.ignorePiTags) {
            } else {
              const childNode = new xmlNode(tagData.tagName);
              childNode.add(this.options.textNodeName, "");
              if (tagData.tagName !== tagData.tagExp && tagData.attrExpPresent) {
                childNode[":@"] = this.buildAttributesMap(tagData.tagExp, jPath);
              }
              currentNode.addChild(childNode);
            }
            i13 = tagData.closeIndex + 1;
          } else if (xmlData.substr(i13 + 1, 3) === "!--") {
            const endIndex = findClosingIndex(xmlData, "-->", i13 + 4, "Comment is not closed.");
            if (this.options.commentPropName) {
              const comment = xmlData.substring(i13 + 4, endIndex - 2);
              textData = this.saveTextToParentTag(textData, currentNode, jPath);
              currentNode.add(this.options.commentPropName, [{ [this.options.textNodeName]: comment }]);
            }
            i13 = endIndex;
          } else if (xmlData.substr(i13 + 1, 2) === "!D") {
            const result = readDocType(xmlData, i13);
            this.docTypeEntities = result.entities;
            i13 = result.i;
          } else if (xmlData.substr(i13 + 1, 2) === "![") {
            const closeIndex = findClosingIndex(xmlData, "]]>", i13, "CDATA is not closed.") - 2;
            const tagExp = xmlData.substring(i13 + 9, closeIndex);
            textData = this.saveTextToParentTag(textData, currentNode, jPath);
            if (this.options.cdataPropName) {
              currentNode.add(this.options.cdataPropName, [{ [this.options.textNodeName]: tagExp }]);
            } else {
              let val = this.parseTextData(tagExp, currentNode.tagname, jPath, true, false, true);
              if (val == void 0)
                val = "";
              currentNode.add(this.options.textNodeName, val);
            }
            i13 = closeIndex + 2;
          } else {
            let result = readTagExp(xmlData, i13, this.options.removeNSPrefix);
            let tagName = result.tagName;
            let tagExp = result.tagExp;
            let attrExpPresent = result.attrExpPresent;
            let closeIndex = result.closeIndex;
            if (this.options.transformTagName) {
              tagName = this.options.transformTagName(tagName);
            }
            if (currentNode && textData) {
              if (currentNode.tagname !== "!xml") {
                textData = this.saveTextToParentTag(textData, currentNode, jPath, false);
              }
            }
            if (tagName !== xmlObj.tagname) {
              jPath += jPath ? "." + tagName : tagName;
            }
            const lastTag = currentNode;
            if (lastTag && this.options.unpairedTags.indexOf(lastTag.tagname) !== -1) {
              currentNode = this.tagsNodeStack.pop();
            }
            if (this.isItStopNode(this.options.stopNodes, jPath, tagName)) {
              let tagContent = "";
              if (tagExp.length > 0 && tagExp.lastIndexOf("/") === tagExp.length - 1) {
                i13 = result.closeIndex;
              } else if (this.options.unpairedTags.indexOf(tagName) !== -1) {
                i13 = result.closeIndex;
              } else {
                const result2 = this.readStopNodeData(xmlData, tagName, closeIndex + 1);
                if (!result2)
                  throw new Error(`Unexpected end of ${tagName}`);
                i13 = result2.i;
                tagContent = result2.tagContent;
              }
              const childNode = new xmlNode(tagName);
              if (tagName !== tagExp && attrExpPresent) {
                childNode[":@"] = this.buildAttributesMap(tagExp, jPath);
              }
              if (tagContent) {
                tagContent = this.parseTextData(tagContent, tagName, jPath, true, attrExpPresent, true, true);
              }
              jPath = jPath.substr(0, jPath.lastIndexOf("."));
              childNode.add(this.options.textNodeName, tagContent);
              currentNode.addChild(childNode);
            } else {
              if (tagExp.length > 0 && tagExp.lastIndexOf("/") === tagExp.length - 1) {
                if (tagName[tagName.length - 1] === "/") {
                  tagName = tagName.substr(0, tagName.length - 1);
                  tagExp = tagName;
                } else {
                  tagExp = tagExp.substr(0, tagExp.length - 1);
                }
                if (this.options.transformTagName) {
                  tagName = this.options.transformTagName(tagName);
                }
                const childNode = new xmlNode(tagName);
                if (tagName !== tagExp && attrExpPresent) {
                  childNode[":@"] = this.buildAttributesMap(tagExp, jPath);
                }
                jPath = jPath.substr(0, jPath.lastIndexOf("."));
                currentNode.addChild(childNode);
              } else {
                const childNode = new xmlNode(tagName);
                this.tagsNodeStack.push(currentNode);
                if (tagName !== tagExp && attrExpPresent) {
                  childNode[":@"] = this.buildAttributesMap(tagExp, jPath);
                }
                currentNode.addChild(childNode);
                currentNode = childNode;
              }
              textData = "";
              i13 = closeIndex;
            }
          }
        } else {
          textData += xmlData[i13];
        }
      }
      return xmlObj.child;
    };
    var replaceEntitiesValue = function(val) {
      if (this.options.processEntities) {
        for (let entityName in this.docTypeEntities) {
          const entity = this.docTypeEntities[entityName];
          val = val.replace(entity.regx, entity.val);
        }
        for (let entityName in this.lastEntities) {
          const entity = this.lastEntities[entityName];
          val = val.replace(entity.regex, entity.val);
        }
        if (this.options.htmlEntities) {
          for (let entityName in this.htmlEntities) {
            const entity = this.htmlEntities[entityName];
            val = val.replace(entity.regex, entity.val);
          }
        }
        val = val.replace(this.ampEntity.regex, this.ampEntity.val);
      }
      return val;
    };
    function saveTextToParentTag(textData, currentNode, jPath, isLeafNode) {
      if (textData) {
        if (isLeafNode === void 0)
          isLeafNode = Object.keys(currentNode.child).length === 0;
        textData = this.parseTextData(
          textData,
          currentNode.tagname,
          jPath,
          false,
          currentNode[":@"] ? Object.keys(currentNode[":@"]).length !== 0 : false,
          isLeafNode
        );
        if (textData !== void 0 && textData !== "")
          currentNode.add(this.options.textNodeName, textData);
        textData = "";
      }
      return textData;
    }
    function isItStopNode(stopNodes, jPath, currentTagName) {
      const allNodesExp = "*." + currentTagName;
      for (const stopNodePath in stopNodes) {
        const stopNodeExp = stopNodes[stopNodePath];
        if (allNodesExp === stopNodeExp || jPath === stopNodeExp)
          return true;
      }
      return false;
    }
    function tagExpWithClosingIndex(xmlData, i13, closingChar = ">") {
      let attrBoundary;
      let tagExp = "";
      for (let index = i13; index < xmlData.length; index++) {
        let ch = xmlData[index];
        if (attrBoundary) {
          if (ch === attrBoundary)
            attrBoundary = "";
        } else if (ch === '"' || ch === "'") {
          attrBoundary = ch;
        } else if (ch === closingChar[0]) {
          if (closingChar[1]) {
            if (xmlData[index + 1] === closingChar[1]) {
              return {
                data: tagExp,
                index
              };
            }
          } else {
            return {
              data: tagExp,
              index
            };
          }
        } else if (ch === "	") {
          ch = " ";
        }
        tagExp += ch;
      }
    }
    function findClosingIndex(xmlData, str, i13, errMsg) {
      const closingIndex = xmlData.indexOf(str, i13);
      if (closingIndex === -1) {
        throw new Error(errMsg);
      } else {
        return closingIndex + str.length - 1;
      }
    }
    function readTagExp(xmlData, i13, removeNSPrefix, closingChar = ">") {
      const result = tagExpWithClosingIndex(xmlData, i13 + 1, closingChar);
      if (!result)
        return;
      let tagExp = result.data;
      const closeIndex = result.index;
      const separatorIndex = tagExp.search(/\s/);
      let tagName = tagExp;
      let attrExpPresent = true;
      if (separatorIndex !== -1) {
        tagName = tagExp.substr(0, separatorIndex).replace(/\s\s*$/, "");
        tagExp = tagExp.substr(separatorIndex + 1);
      }
      if (removeNSPrefix) {
        const colonIndex = tagName.indexOf(":");
        if (colonIndex !== -1) {
          tagName = tagName.substr(colonIndex + 1);
          attrExpPresent = tagName !== result.data.substr(colonIndex + 1);
        }
      }
      return {
        tagName,
        tagExp,
        closeIndex,
        attrExpPresent
      };
    }
    function readStopNodeData(xmlData, tagName, i13) {
      const startIndex = i13;
      let openTagCount = 1;
      for (; i13 < xmlData.length; i13++) {
        if (xmlData[i13] === "<") {
          if (xmlData[i13 + 1] === "/") {
            const closeIndex = findClosingIndex(xmlData, ">", i13, `${tagName} is not closed`);
            let closeTagName = xmlData.substring(i13 + 2, closeIndex).trim();
            if (closeTagName === tagName) {
              openTagCount--;
              if (openTagCount === 0) {
                return {
                  tagContent: xmlData.substring(startIndex, i13),
                  i: closeIndex
                };
              }
            }
            i13 = closeIndex;
          } else if (xmlData[i13 + 1] === "?") {
            const closeIndex = findClosingIndex(xmlData, "?>", i13 + 1, "StopNode is not closed.");
            i13 = closeIndex;
          } else if (xmlData.substr(i13 + 1, 3) === "!--") {
            const closeIndex = findClosingIndex(xmlData, "-->", i13 + 3, "StopNode is not closed.");
            i13 = closeIndex;
          } else if (xmlData.substr(i13 + 1, 2) === "![") {
            const closeIndex = findClosingIndex(xmlData, "]]>", i13, "StopNode is not closed.") - 2;
            i13 = closeIndex;
          } else {
            const tagData = readTagExp(xmlData, i13, ">");
            if (tagData) {
              const openTagName = tagData && tagData.tagName;
              if (openTagName === tagName && tagData.tagExp[tagData.tagExp.length - 1] !== "/") {
                openTagCount++;
              }
              i13 = tagData.closeIndex;
            }
          }
        }
      }
    }
    function parseValue(val, shouldParse, options) {
      if (shouldParse && typeof val === "string") {
        const newval = val.trim();
        if (newval === "true")
          return true;
        else if (newval === "false")
          return false;
        else
          return toNumber(val, options);
      } else {
        if (util.isExist(val)) {
          return val;
        } else {
          return "";
        }
      }
    }
    module2.exports = OrderedObjParser;
  }
});

// ../../node_modules/fast-xml-parser/src/xmlparser/node2json.js
var require_node2json = __commonJS({
  "../../node_modules/fast-xml-parser/src/xmlparser/node2json.js"(exports) {
    "use strict";
    function prettify(node, options) {
      return compress(node, options);
    }
    function compress(arr, options, jPath) {
      let text;
      const compressedObj = {};
      for (let i13 = 0; i13 < arr.length; i13++) {
        const tagObj = arr[i13];
        const property = propName(tagObj);
        let newJpath = "";
        if (jPath === void 0)
          newJpath = property;
        else
          newJpath = jPath + "." + property;
        if (property === options.textNodeName) {
          if (text === void 0)
            text = tagObj[property];
          else
            text += "" + tagObj[property];
        } else if (property === void 0) {
          continue;
        } else if (tagObj[property]) {
          let val = compress(tagObj[property], options, newJpath);
          const isLeaf = isLeafTag(val, options);
          if (tagObj[":@"]) {
            assignAttributes(val, tagObj[":@"], newJpath, options);
          } else if (Object.keys(val).length === 1 && val[options.textNodeName] !== void 0 && !options.alwaysCreateTextNode) {
            val = val[options.textNodeName];
          } else if (Object.keys(val).length === 0) {
            if (options.alwaysCreateTextNode)
              val[options.textNodeName] = "";
            else
              val = "";
          }
          if (compressedObj[property] !== void 0 && compressedObj.hasOwnProperty(property)) {
            if (!Array.isArray(compressedObj[property])) {
              compressedObj[property] = [compressedObj[property]];
            }
            compressedObj[property].push(val);
          } else {
            if (options.isArray(property, newJpath, isLeaf)) {
              compressedObj[property] = [val];
            } else {
              compressedObj[property] = val;
            }
          }
        }
      }
      if (typeof text === "string") {
        if (text.length > 0)
          compressedObj[options.textNodeName] = text;
      } else if (text !== void 0)
        compressedObj[options.textNodeName] = text;
      return compressedObj;
    }
    function propName(obj) {
      const keys = Object.keys(obj);
      for (let i13 = 0; i13 < keys.length; i13++) {
        const key = keys[i13];
        if (key !== ":@")
          return key;
      }
    }
    function assignAttributes(obj, attrMap, jpath, options) {
      if (attrMap) {
        const keys = Object.keys(attrMap);
        const len = keys.length;
        for (let i13 = 0; i13 < len; i13++) {
          const atrrName = keys[i13];
          if (options.isArray(atrrName, jpath + "." + atrrName, true, true)) {
            obj[atrrName] = [attrMap[atrrName]];
          } else {
            obj[atrrName] = attrMap[atrrName];
          }
        }
      }
    }
    function isLeafTag(obj, options) {
      const propCount = Object.keys(obj).length;
      if (propCount === 0 || propCount === 1 && obj[options.textNodeName])
        return true;
      return false;
    }
    exports.prettify = prettify;
  }
});

// ../../node_modules/fast-xml-parser/src/xmlparser/XMLParser.js
var require_XMLParser = __commonJS({
  "../../node_modules/fast-xml-parser/src/xmlparser/XMLParser.js"(exports, module2) {
    var { buildOptions } = require_OptionsBuilder();
    var OrderedObjParser = require_OrderedObjParser();
    var { prettify } = require_node2json();
    var validator = require_validator();
    var XMLParser4 = class {
      constructor(options) {
        this.externalEntities = {};
        this.options = buildOptions(options);
      }
      parse(xmlData, validationOption) {
        if (typeof xmlData === "string") {
        } else if (xmlData.toString) {
          xmlData = xmlData.toString();
        } else {
          throw new Error("XML data is accepted in String or Bytes[] form.");
        }
        if (validationOption) {
          if (validationOption === true)
            validationOption = {};
          const result = validator.validate(xmlData, validationOption);
          if (result !== true) {
            throw Error(`${result.err.msg}:${result.err.line}:${result.err.col}`);
          }
        }
        const orderedObjParser = new OrderedObjParser(this.options);
        orderedObjParser.addExternalEntities(this.externalEntities);
        const orderedResult = orderedObjParser.parseXml(xmlData);
        if (this.options.preserveOrder || orderedResult === void 0)
          return orderedResult;
        else
          return prettify(orderedResult, this.options);
      }
      addEntity(key, value) {
        if (value.indexOf("&") !== -1) {
          throw new Error("Entity value can't have '&'");
        } else if (key.indexOf("&") !== -1 || key.indexOf(";") !== -1) {
          throw new Error("An entity must be set without '&' and ';'. Eg. use '#xD' for '&#xD;'");
        } else if (value === "&") {
          throw new Error("An entity with value '&' is not permitted");
        } else {
          this.externalEntities[key] = value;
        }
      }
    };
    module2.exports = XMLParser4;
  }
});

// ../../node_modules/fast-xml-parser/src/xmlbuilder/orderedJs2Xml.js
var require_orderedJs2Xml = __commonJS({
  "../../node_modules/fast-xml-parser/src/xmlbuilder/orderedJs2Xml.js"(exports, module2) {
    var EOL = "\n";
    function toXml(jArray, options) {
      return arrToStr(jArray, options, "", 0);
    }
    function arrToStr(arr, options, jPath, level) {
      let xmlStr = "";
      let indentation = "";
      if (options.format && options.indentBy.length > 0) {
        indentation = EOL + "" + options.indentBy.repeat(level);
      }
      for (let i13 = 0; i13 < arr.length; i13++) {
        const tagObj = arr[i13];
        const tagName = propName(tagObj);
        let newJPath = "";
        if (jPath.length === 0)
          newJPath = tagName;
        else
          newJPath = `${jPath}.${tagName}`;
        if (tagName === options.textNodeName) {
          let tagText = tagObj[tagName];
          if (!isStopNode(newJPath, options)) {
            tagText = options.tagValueProcessor(tagName, tagText);
            tagText = replaceEntitiesValue(tagText, options);
          }
          xmlStr += indentation + tagText;
          continue;
        } else if (tagName === options.cdataPropName) {
          xmlStr += indentation + `<![CDATA[${tagObj[tagName][0][options.textNodeName]}]]>`;
          continue;
        } else if (tagName === options.commentPropName) {
          xmlStr += indentation + `<!--${tagObj[tagName][0][options.textNodeName]}-->`;
          continue;
        } else if (tagName[0] === "?") {
          const attStr2 = attr_to_str(tagObj[":@"], options);
          const tempInd = tagName === "?xml" ? "" : indentation;
          let piTextNodeName = tagObj[tagName][0][options.textNodeName];
          piTextNodeName = piTextNodeName.length !== 0 ? " " + piTextNodeName : "";
          xmlStr += tempInd + `<${tagName}${piTextNodeName}${attStr2}?>`;
          continue;
        }
        const attStr = attr_to_str(tagObj[":@"], options);
        let tagStart = indentation + `<${tagName}${attStr}`;
        let tagValue = arrToStr(tagObj[tagName], options, newJPath, level + 1);
        if (options.unpairedTags.indexOf(tagName) !== -1) {
          if (options.suppressUnpairedNode)
            xmlStr += tagStart + ">";
          else
            xmlStr += tagStart + "/>";
        } else if ((!tagValue || tagValue.length === 0) && options.suppressEmptyNode) {
          xmlStr += tagStart + "/>";
        } else {
          xmlStr += tagStart + `>${tagValue}${indentation}</${tagName}>`;
        }
      }
      return xmlStr;
    }
    function propName(obj) {
      const keys = Object.keys(obj);
      for (let i13 = 0; i13 < keys.length; i13++) {
        const key = keys[i13];
        if (key !== ":@")
          return key;
      }
    }
    function attr_to_str(attrMap, options) {
      let attrStr = "";
      if (attrMap && !options.ignoreAttributes) {
        for (let attr in attrMap) {
          let attrVal = options.attributeValueProcessor(attr, attrMap[attr]);
          attrVal = replaceEntitiesValue(attrVal, options);
          if (attrVal === true && options.suppressBooleanAttributes) {
            attrStr += ` ${attr.substr(options.attributeNamePrefix.length)}`;
          } else {
            attrStr += ` ${attr.substr(options.attributeNamePrefix.length)}="${attrVal}"`;
          }
        }
      }
      return attrStr;
    }
    function isStopNode(jPath, options) {
      jPath = jPath.substr(0, jPath.length - options.textNodeName.length - 1);
      let tagName = jPath.substr(jPath.lastIndexOf(".") + 1);
      for (let index in options.stopNodes) {
        if (options.stopNodes[index] === jPath || options.stopNodes[index] === "*." + tagName)
          return true;
      }
      return false;
    }
    function replaceEntitiesValue(textValue, options) {
      if (textValue && textValue.length > 0 && options.processEntities) {
        for (let i13 = 0; i13 < options.entities.length; i13++) {
          const entity = options.entities[i13];
          textValue = textValue.replace(entity.regex, entity.val);
        }
      }
      return textValue;
    }
    module2.exports = toXml;
  }
});

// ../../node_modules/fast-xml-parser/src/xmlbuilder/json2xml.js
var require_json2xml = __commonJS({
  "../../node_modules/fast-xml-parser/src/xmlbuilder/json2xml.js"(exports, module2) {
    "use strict";
    var buildFromOrderedJs = require_orderedJs2Xml();
    var defaultOptions = {
      attributeNamePrefix: "@_",
      attributesGroupName: false,
      textNodeName: "#text",
      ignoreAttributes: true,
      cdataPropName: false,
      format: false,
      indentBy: "  ",
      suppressEmptyNode: false,
      suppressUnpairedNode: true,
      suppressBooleanAttributes: true,
      tagValueProcessor: function(key, a13) {
        return a13;
      },
      attributeValueProcessor: function(attrName, a13) {
        return a13;
      },
      preserveOrder: false,
      commentPropName: false,
      unpairedTags: [],
      entities: [
        { regex: new RegExp("&", "g"), val: "&amp;" },
        { regex: new RegExp(">", "g"), val: "&gt;" },
        { regex: new RegExp("<", "g"), val: "&lt;" },
        { regex: new RegExp("'", "g"), val: "&apos;" },
        { regex: new RegExp('"', "g"), val: "&quot;" }
      ],
      processEntities: true,
      stopNodes: [],
      transformTagName: false
    };
    function Builder(options) {
      this.options = Object.assign({}, defaultOptions, options);
      if (this.options.ignoreAttributes || this.options.attributesGroupName) {
        this.isAttribute = function() {
          return false;
        };
      } else {
        this.attrPrefixLen = this.options.attributeNamePrefix.length;
        this.isAttribute = isAttribute;
      }
      this.processTextOrObjNode = processTextOrObjNode;
      if (this.options.format) {
        this.indentate = indentate;
        this.tagEndChar = ">\n";
        this.newLine = "\n";
      } else {
        this.indentate = function() {
          return "";
        };
        this.tagEndChar = ">";
        this.newLine = "";
      }
      if (this.options.suppressEmptyNode) {
        this.buildTextNode = buildEmptyTextNode;
        this.buildObjNode = buildEmptyObjNode;
      } else {
        this.buildTextNode = buildTextValNode;
        this.buildObjNode = buildObjectNode;
      }
      this.buildTextValNode = buildTextValNode;
      this.buildObjectNode = buildObjectNode;
      this.replaceEntitiesValue = replaceEntitiesValue;
      this.buildAttrPairStr = buildAttrPairStr;
    }
    Builder.prototype.build = function(jObj) {
      if (this.options.preserveOrder) {
        return buildFromOrderedJs(jObj, this.options);
      } else {
        if (Array.isArray(jObj) && this.options.arrayNodeName && this.options.arrayNodeName.length > 1) {
          jObj = {
            [this.options.arrayNodeName]: jObj
          };
        }
        return this.j2x(jObj, 0).val;
      }
    };
    Builder.prototype.j2x = function(jObj, level) {
      let attrStr = "";
      let val = "";
      for (let key in jObj) {
        if (typeof jObj[key] === "undefined") {
        } else if (jObj[key] === null) {
          if (key[0] === "?")
            val += this.indentate(level) + "<" + key + "?" + this.tagEndChar;
          else
            val += this.indentate(level) + "<" + key + "/" + this.tagEndChar;
        } else if (jObj[key] instanceof Date) {
          val += this.buildTextNode(jObj[key], key, "", level);
        } else if (typeof jObj[key] !== "object") {
          const attr = this.isAttribute(key);
          if (attr) {
            attrStr += this.buildAttrPairStr(attr, "" + jObj[key]);
          } else {
            if (key === this.options.textNodeName) {
              let newval = this.options.tagValueProcessor(key, "" + jObj[key]);
              val += this.replaceEntitiesValue(newval);
            } else {
              val += this.buildTextNode(jObj[key], key, "", level);
            }
          }
        } else if (Array.isArray(jObj[key])) {
          const arrLen = jObj[key].length;
          for (let j13 = 0; j13 < arrLen; j13++) {
            const item = jObj[key][j13];
            if (typeof item === "undefined") {
            } else if (item === null) {
              if (key[0] === "?")
                val += this.indentate(level) + "<" + key + "?" + this.tagEndChar;
              else
                val += this.indentate(level) + "<" + key + "/" + this.tagEndChar;
            } else if (typeof item === "object") {
              val += this.processTextOrObjNode(item, key, level);
            } else {
              val += this.buildTextNode(item, key, "", level);
            }
          }
        } else {
          if (this.options.attributesGroupName && key === this.options.attributesGroupName) {
            const Ks = Object.keys(jObj[key]);
            const L2 = Ks.length;
            for (let j13 = 0; j13 < L2; j13++) {
              attrStr += this.buildAttrPairStr(Ks[j13], "" + jObj[key][Ks[j13]]);
            }
          } else {
            val += this.processTextOrObjNode(jObj[key], key, level);
          }
        }
      }
      return { attrStr, val };
    };
    function buildAttrPairStr(attrName, val) {
      val = this.options.attributeValueProcessor(attrName, "" + val);
      val = this.replaceEntitiesValue(val);
      if (this.options.suppressBooleanAttributes && val === "true") {
        return " " + attrName;
      } else
        return " " + attrName + '="' + val + '"';
    }
    function processTextOrObjNode(object, key, level) {
      const result = this.j2x(object, level + 1);
      if (object[this.options.textNodeName] !== void 0 && Object.keys(object).length === 1) {
        return this.buildTextNode(object[this.options.textNodeName], key, result.attrStr, level);
      } else {
        return this.buildObjNode(result.val, key, result.attrStr, level);
      }
    }
    function buildObjectNode(val, key, attrStr, level) {
      let tagEndExp = "</" + key + this.tagEndChar;
      let piClosingChar = "";
      if (key[0] === "?") {
        piClosingChar = "?";
        tagEndExp = "";
      }
      if (attrStr && val.indexOf("<") === -1) {
        return this.indentate(level) + "<" + key + attrStr + piClosingChar + ">" + val + tagEndExp;
      } else if (this.options.commentPropName !== false && key === this.options.commentPropName && piClosingChar.length === 0) {
        return this.indentate(level) + `<!--${val}-->` + this.newLine;
      } else {
        return this.indentate(level) + "<" + key + attrStr + piClosingChar + this.tagEndChar + val + this.indentate(level) + tagEndExp;
      }
    }
    function buildEmptyObjNode(val, key, attrStr, level) {
      if (val !== "") {
        return this.buildObjectNode(val, key, attrStr, level);
      } else {
        if (key[0] === "?")
          return this.indentate(level) + "<" + key + attrStr + "?" + this.tagEndChar;
        else
          return this.indentate(level) + "<" + key + attrStr + "/" + this.tagEndChar;
      }
    }
    function buildTextValNode(val, key, attrStr, level) {
      if (this.options.cdataPropName !== false && key === this.options.cdataPropName) {
        return this.indentate(level) + `<![CDATA[${val}]]>` + this.newLine;
      } else if (this.options.commentPropName !== false && key === this.options.commentPropName) {
        return this.indentate(level) + `<!--${val}-->` + this.newLine;
      } else {
        let textValue = this.options.tagValueProcessor(key, val);
        textValue = this.replaceEntitiesValue(textValue);
        if (textValue === "" && this.options.unpairedTags.indexOf(key) !== -1) {
          if (this.options.suppressUnpairedNode) {
            return this.indentate(level) + "<" + key + this.tagEndChar;
          } else {
            return this.indentate(level) + "<" + key + "/" + this.tagEndChar;
          }
        } else {
          return this.indentate(level) + "<" + key + attrStr + ">" + textValue + "</" + key + this.tagEndChar;
        }
      }
    }
    function replaceEntitiesValue(textValue) {
      if (textValue && textValue.length > 0 && this.options.processEntities) {
        for (let i13 = 0; i13 < this.options.entities.length; i13++) {
          const entity = this.options.entities[i13];
          textValue = textValue.replace(entity.regex, entity.val);
        }
      }
      return textValue;
    }
    function buildEmptyTextNode(val, key, attrStr, level) {
      if (val === "" && this.options.unpairedTags.indexOf(key) !== -1) {
        if (this.options.suppressUnpairedNode) {
          return this.indentate(level) + "<" + key + this.tagEndChar;
        } else {
          return this.indentate(level) + "<" + key + "/" + this.tagEndChar;
        }
      } else if (val !== "") {
        return this.buildTextValNode(val, key, attrStr, level);
      } else {
        if (key[0] === "?")
          return this.indentate(level) + "<" + key + attrStr + "?" + this.tagEndChar;
        else
          return this.indentate(level) + "<" + key + attrStr + "/" + this.tagEndChar;
      }
    }
    function indentate(level) {
      return this.options.indentBy.repeat(level);
    }
    function isAttribute(name) {
      if (name.startsWith(this.options.attributeNamePrefix)) {
        return name.substr(this.attrPrefixLen);
      } else {
        return false;
      }
    }
    module2.exports = Builder;
  }
});

// ../../node_modules/fast-xml-parser/src/fxp.js
var require_fxp = __commonJS({
  "../../node_modules/fast-xml-parser/src/fxp.js"(exports, module2) {
    "use strict";
    var validator = require_validator();
    var XMLParser4 = require_XMLParser();
    var XMLBuilder = require_json2xml();
    module2.exports = {
      XMLParser: XMLParser4,
      XMLValidator: validator,
      XMLBuilder
    };
  }
});

// ../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/rng.js
var require_rng3 = __commonJS({
  "../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/rng.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = rng;
    var _crypto = _interopRequireDefault(require("crypto"));
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var rnds8Pool = new Uint8Array(256);
    var poolPtr = rnds8Pool.length;
    function rng() {
      if (poolPtr > rnds8Pool.length - 16) {
        _crypto.default.randomFillSync(rnds8Pool);
        poolPtr = 0;
      }
      return rnds8Pool.slice(poolPtr, poolPtr += 16);
    }
  }
});

// ../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/regex.js
var require_regex3 = __commonJS({
  "../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/regex.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _default = /^(?:[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}|00000000-0000-0000-0000-000000000000)$/i;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/validate.js
var require_validate3 = __commonJS({
  "../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/validate.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _regex = _interopRequireDefault(require_regex3());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function validate4(uuid4) {
      return typeof uuid4 === "string" && _regex.default.test(uuid4);
    }
    var _default = validate4;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/stringify.js
var require_stringify3 = __commonJS({
  "../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/stringify.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _validate = _interopRequireDefault(require_validate3());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var byteToHex = [];
    for (let i13 = 0; i13 < 256; ++i13) {
      byteToHex.push((i13 + 256).toString(16).substr(1));
    }
    function stringify4(arr, offset = 0) {
      const uuid4 = (byteToHex[arr[offset + 0]] + byteToHex[arr[offset + 1]] + byteToHex[arr[offset + 2]] + byteToHex[arr[offset + 3]] + "-" + byteToHex[arr[offset + 4]] + byteToHex[arr[offset + 5]] + "-" + byteToHex[arr[offset + 6]] + byteToHex[arr[offset + 7]] + "-" + byteToHex[arr[offset + 8]] + byteToHex[arr[offset + 9]] + "-" + byteToHex[arr[offset + 10]] + byteToHex[arr[offset + 11]] + byteToHex[arr[offset + 12]] + byteToHex[arr[offset + 13]] + byteToHex[arr[offset + 14]] + byteToHex[arr[offset + 15]]).toLowerCase();
      if (!(0, _validate.default)(uuid4)) {
        throw TypeError("Stringified UUID is invalid");
      }
      return uuid4;
    }
    var _default = stringify4;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/v1.js
var require_v13 = __commonJS({
  "../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/v1.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _rng = _interopRequireDefault(require_rng3());
    var _stringify = _interopRequireDefault(require_stringify3());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var _nodeId;
    var _clockseq;
    var _lastMSecs = 0;
    var _lastNSecs = 0;
    function v14(options, buf, offset) {
      let i13 = buf && offset || 0;
      const b13 = buf || new Array(16);
      options = options || {};
      let node = options.node || _nodeId;
      let clockseq = options.clockseq !== void 0 ? options.clockseq : _clockseq;
      if (node == null || clockseq == null) {
        const seedBytes = options.random || (options.rng || _rng.default)();
        if (node == null) {
          node = _nodeId = [seedBytes[0] | 1, seedBytes[1], seedBytes[2], seedBytes[3], seedBytes[4], seedBytes[5]];
        }
        if (clockseq == null) {
          clockseq = _clockseq = (seedBytes[6] << 8 | seedBytes[7]) & 16383;
        }
      }
      let msecs = options.msecs !== void 0 ? options.msecs : Date.now();
      let nsecs = options.nsecs !== void 0 ? options.nsecs : _lastNSecs + 1;
      const dt = msecs - _lastMSecs + (nsecs - _lastNSecs) / 1e4;
      if (dt < 0 && options.clockseq === void 0) {
        clockseq = clockseq + 1 & 16383;
      }
      if ((dt < 0 || msecs > _lastMSecs) && options.nsecs === void 0) {
        nsecs = 0;
      }
      if (nsecs >= 1e4) {
        throw new Error("uuid.v1(): Can't create more than 10M uuids/sec");
      }
      _lastMSecs = msecs;
      _lastNSecs = nsecs;
      _clockseq = clockseq;
      msecs += 122192928e5;
      const tl = ((msecs & 268435455) * 1e4 + nsecs) % 4294967296;
      b13[i13++] = tl >>> 24 & 255;
      b13[i13++] = tl >>> 16 & 255;
      b13[i13++] = tl >>> 8 & 255;
      b13[i13++] = tl & 255;
      const tmh = msecs / 4294967296 * 1e4 & 268435455;
      b13[i13++] = tmh >>> 8 & 255;
      b13[i13++] = tmh & 255;
      b13[i13++] = tmh >>> 24 & 15 | 16;
      b13[i13++] = tmh >>> 16 & 255;
      b13[i13++] = clockseq >>> 8 | 128;
      b13[i13++] = clockseq & 255;
      for (let n13 = 0; n13 < 6; ++n13) {
        b13[i13 + n13] = node[n13];
      }
      return buf || (0, _stringify.default)(b13);
    }
    var _default = v14;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/parse.js
var require_parse3 = __commonJS({
  "../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/parse.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _validate = _interopRequireDefault(require_validate3());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function parse5(uuid4) {
      if (!(0, _validate.default)(uuid4)) {
        throw TypeError("Invalid UUID");
      }
      let v8;
      const arr = new Uint8Array(16);
      arr[0] = (v8 = parseInt(uuid4.slice(0, 8), 16)) >>> 24;
      arr[1] = v8 >>> 16 & 255;
      arr[2] = v8 >>> 8 & 255;
      arr[3] = v8 & 255;
      arr[4] = (v8 = parseInt(uuid4.slice(9, 13), 16)) >>> 8;
      arr[5] = v8 & 255;
      arr[6] = (v8 = parseInt(uuid4.slice(14, 18), 16)) >>> 8;
      arr[7] = v8 & 255;
      arr[8] = (v8 = parseInt(uuid4.slice(19, 23), 16)) >>> 8;
      arr[9] = v8 & 255;
      arr[10] = (v8 = parseInt(uuid4.slice(24, 36), 16)) / 1099511627776 & 255;
      arr[11] = v8 / 4294967296 & 255;
      arr[12] = v8 >>> 24 & 255;
      arr[13] = v8 >>> 16 & 255;
      arr[14] = v8 >>> 8 & 255;
      arr[15] = v8 & 255;
      return arr;
    }
    var _default = parse5;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/v35.js
var require_v353 = __commonJS({
  "../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/v35.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = _default;
    exports.URL = exports.DNS = void 0;
    var _stringify = _interopRequireDefault(require_stringify3());
    var _parse = _interopRequireDefault(require_parse3());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function stringToBytes(str) {
      str = unescape(encodeURIComponent(str));
      const bytes = [];
      for (let i13 = 0; i13 < str.length; ++i13) {
        bytes.push(str.charCodeAt(i13));
      }
      return bytes;
    }
    var DNS = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";
    exports.DNS = DNS;
    var URL2 = "6ba7b811-9dad-11d1-80b4-00c04fd430c8";
    exports.URL = URL2;
    function _default(name, version4, hashfunc) {
      function generateUUID(value, namespace, buf, offset) {
        if (typeof value === "string") {
          value = stringToBytes(value);
        }
        if (typeof namespace === "string") {
          namespace = (0, _parse.default)(namespace);
        }
        if (namespace.length !== 16) {
          throw TypeError("Namespace must be array-like (16 iterable integer values, 0-255)");
        }
        let bytes = new Uint8Array(16 + value.length);
        bytes.set(namespace);
        bytes.set(value, namespace.length);
        bytes = hashfunc(bytes);
        bytes[6] = bytes[6] & 15 | version4;
        bytes[8] = bytes[8] & 63 | 128;
        if (buf) {
          offset = offset || 0;
          for (let i13 = 0; i13 < 16; ++i13) {
            buf[offset + i13] = bytes[i13];
          }
          return buf;
        }
        return (0, _stringify.default)(bytes);
      }
      try {
        generateUUID.name = name;
      } catch (err) {
      }
      generateUUID.DNS = DNS;
      generateUUID.URL = URL2;
      return generateUUID;
    }
  }
});

// ../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/md5.js
var require_md53 = __commonJS({
  "../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/md5.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _crypto = _interopRequireDefault(require("crypto"));
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function md5(bytes) {
      if (Array.isArray(bytes)) {
        bytes = Buffer.from(bytes);
      } else if (typeof bytes === "string") {
        bytes = Buffer.from(bytes, "utf8");
      }
      return _crypto.default.createHash("md5").update(bytes).digest();
    }
    var _default = md5;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/v3.js
var require_v33 = __commonJS({
  "../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/v3.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _v = _interopRequireDefault(require_v353());
    var _md = _interopRequireDefault(require_md53());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var v34 = (0, _v.default)("v3", 48, _md.default);
    var _default = v34;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/v4.js
var require_v43 = __commonJS({
  "../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/v4.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _rng = _interopRequireDefault(require_rng3());
    var _stringify = _interopRequireDefault(require_stringify3());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function v44(options, buf, offset) {
      options = options || {};
      const rnds = options.random || (options.rng || _rng.default)();
      rnds[6] = rnds[6] & 15 | 64;
      rnds[8] = rnds[8] & 63 | 128;
      if (buf) {
        offset = offset || 0;
        for (let i13 = 0; i13 < 16; ++i13) {
          buf[offset + i13] = rnds[i13];
        }
        return buf;
      }
      return (0, _stringify.default)(rnds);
    }
    var _default = v44;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/sha1.js
var require_sha13 = __commonJS({
  "../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/sha1.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _crypto = _interopRequireDefault(require("crypto"));
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function sha1(bytes) {
      if (Array.isArray(bytes)) {
        bytes = Buffer.from(bytes);
      } else if (typeof bytes === "string") {
        bytes = Buffer.from(bytes, "utf8");
      }
      return _crypto.default.createHash("sha1").update(bytes).digest();
    }
    var _default = sha1;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/v5.js
var require_v53 = __commonJS({
  "../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/v5.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _v = _interopRequireDefault(require_v353());
    var _sha = _interopRequireDefault(require_sha13());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var v54 = (0, _v.default)("v5", 80, _sha.default);
    var _default = v54;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/nil.js
var require_nil3 = __commonJS({
  "../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/nil.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _default = "00000000-0000-0000-0000-000000000000";
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/version.js
var require_version3 = __commonJS({
  "../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/version.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = void 0;
    var _validate = _interopRequireDefault(require_validate3());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    function version4(uuid4) {
      if (!(0, _validate.default)(uuid4)) {
        throw TypeError("Invalid UUID");
      }
      return parseInt(uuid4.substr(14, 1), 16);
    }
    var _default = version4;
    exports.default = _default;
  }
});

// ../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/index.js
var require_dist3 = __commonJS({
  "../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/dist/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    Object.defineProperty(exports, "v1", {
      enumerable: true,
      get: function() {
        return _v.default;
      }
    });
    Object.defineProperty(exports, "v3", {
      enumerable: true,
      get: function() {
        return _v2.default;
      }
    });
    Object.defineProperty(exports, "v4", {
      enumerable: true,
      get: function() {
        return _v3.default;
      }
    });
    Object.defineProperty(exports, "v5", {
      enumerable: true,
      get: function() {
        return _v4.default;
      }
    });
    Object.defineProperty(exports, "NIL", {
      enumerable: true,
      get: function() {
        return _nil.default;
      }
    });
    Object.defineProperty(exports, "version", {
      enumerable: true,
      get: function() {
        return _version.default;
      }
    });
    Object.defineProperty(exports, "validate", {
      enumerable: true,
      get: function() {
        return _validate.default;
      }
    });
    Object.defineProperty(exports, "stringify", {
      enumerable: true,
      get: function() {
        return _stringify.default;
      }
    });
    Object.defineProperty(exports, "parse", {
      enumerable: true,
      get: function() {
        return _parse.default;
      }
    });
    var _v = _interopRequireDefault(require_v13());
    var _v2 = _interopRequireDefault(require_v33());
    var _v3 = _interopRequireDefault(require_v43());
    var _v4 = _interopRequireDefault(require_v53());
    var _nil = _interopRequireDefault(require_nil3());
    var _version = _interopRequireDefault(require_version3());
    var _validate = _interopRequireDefault(require_validate3());
    var _stringify = _interopRequireDefault(require_stringify3());
    var _parse = _interopRequireDefault(require_parse3());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
  }
});

// src/index.ts
var src_exports = {};
__export(src_exports, {
  DynamoDBServer: () => DynamoDBServer,
  mockDynamoDB: () => mockDynamoDB,
  mockIoT: () => mockIoT,
  mockLambda: () => mockLambda,
  mockSES: () => mockSES,
  mockSNS: () => mockSNS,
  mockSQS: () => mockSQS,
  mockSSM: () => mockSSM,
  mockScheduler: () => mockScheduler,
  startDynamoDB: () => startDynamoDB
});
module.exports = __toCommonJS(src_exports);

// ../../node_modules/@aws-sdk/middleware-endpoint/dist-es/service-customizations/s3.js
var resolveParamsForS3 = async (endpointParams) => {
  const bucket = endpointParams?.Bucket || "";
  if (typeof endpointParams.Bucket === "string") {
    endpointParams.Bucket = bucket.replace(/#/g, encodeURIComponent("#")).replace(/\?/g, encodeURIComponent("?"));
  }
  if (isArnBucketName(bucket)) {
    if (endpointParams.ForcePathStyle === true) {
      throw new Error("Path-style addressing cannot be used with ARN buckets");
    }
  } else if (!isDnsCompatibleBucketName(bucket) || bucket.indexOf(".") !== -1 && !String(endpointParams.Endpoint).startsWith("http:") || bucket.toLowerCase() !== bucket || bucket.length < 3) {
    endpointParams.ForcePathStyle = true;
  }
  if (endpointParams.DisableMultiRegionAccessPoints) {
    endpointParams.disableMultiRegionAccessPoints = true;
    endpointParams.DisableMRAP = true;
  }
  return endpointParams;
};
var DOMAIN_PATTERN = /^[a-z0-9][a-z0-9\.\-]{1,61}[a-z0-9]$/;
var IP_ADDRESS_PATTERN = /(\d+\.){3}\d+/;
var DOTS_PATTERN = /\.\./;
var isDnsCompatibleBucketName = (bucketName) => DOMAIN_PATTERN.test(bucketName) && !IP_ADDRESS_PATTERN.test(bucketName) && !DOTS_PATTERN.test(bucketName);
var isArnBucketName = (bucketName) => {
  const [arn, partition2, service, region, account, typeOrId] = bucketName.split(":");
  const isArn = arn === "arn" && bucketName.split(":").length >= 6;
  const isValidArn = [arn, partition2, service, account, typeOrId].filter(Boolean).length === 5;
  if (isArn && !isValidArn) {
    throw new Error(`Invalid ARN: ${bucketName} was an invalid ARN.`);
  }
  return arn === "arn" && !!partition2 && !!service && !!account && !!typeOrId;
};

// ../../node_modules/@aws-sdk/middleware-endpoint/dist-es/adaptors/createConfigValueProvider.js
var createConfigValueProvider = (configKey, canonicalEndpointParamKey, config) => {
  const configProvider = async () => {
    const configValue = config[configKey] ?? config[canonicalEndpointParamKey];
    if (typeof configValue === "function") {
      return configValue();
    }
    return configValue;
  };
  if (configKey === "endpoint" || canonicalEndpointParamKey === "endpoint") {
    return async () => {
      const endpoint = await configProvider();
      if (endpoint && typeof endpoint === "object") {
        if ("url" in endpoint) {
          return endpoint.url.href;
        }
        if ("hostname" in endpoint) {
          const { protocol, hostname, port, path } = endpoint;
          return `${protocol}//${hostname}${port ? ":" + port : ""}${path}`;
        }
      }
      return endpoint;
    };
  }
  return configProvider;
};

// ../../node_modules/@aws-sdk/middleware-endpoint/dist-es/adaptors/getEndpointFromInstructions.js
var getEndpointFromInstructions = async (commandInput, instructionsSupplier, clientConfig, context) => {
  const endpointParams = await resolveParams(commandInput, instructionsSupplier, clientConfig);
  if (typeof clientConfig.endpointProvider !== "function") {
    throw new Error("config.endpointProvider is not set.");
  }
  const endpoint = clientConfig.endpointProvider(endpointParams, context);
  return endpoint;
};
var resolveParams = async (commandInput, instructionsSupplier, clientConfig) => {
  const endpointParams = {};
  const instructions = instructionsSupplier?.getEndpointParameterInstructions?.() || {};
  for (const [name, instruction] of Object.entries(instructions)) {
    switch (instruction.type) {
      case "staticContextParams":
        endpointParams[name] = instruction.value;
        break;
      case "contextParams":
        endpointParams[name] = commandInput[instruction.name];
        break;
      case "clientContextParams":
      case "builtInParams":
        endpointParams[name] = await createConfigValueProvider(instruction.name, name, clientConfig)();
        break;
      default:
        throw new Error("Unrecognized endpoint parameter instruction: " + JSON.stringify(instruction));
    }
  }
  if (Object.keys(instructions).length === 0) {
    Object.assign(endpointParams, clientConfig);
  }
  if (String(clientConfig.serviceId).toLowerCase() === "s3") {
    await resolveParamsForS3(endpointParams);
  }
  return endpointParams;
};

// ../../node_modules/@aws-sdk/querystring-parser/dist-es/index.js
function parseQueryString(querystring) {
  const query = {};
  querystring = querystring.replace(/^\?/, "");
  if (querystring) {
    for (const pair of querystring.split("&")) {
      let [key, value = null] = pair.split("=");
      key = decodeURIComponent(key);
      if (value) {
        value = decodeURIComponent(value);
      }
      if (!(key in query)) {
        query[key] = value;
      } else if (Array.isArray(query[key])) {
        query[key].push(value);
      } else {
        query[key] = [query[key], value];
      }
    }
  }
  return query;
}

// ../../node_modules/@aws-sdk/url-parser/dist-es/index.js
var parseUrl = (url) => {
  if (typeof url === "string") {
    return parseUrl(new URL(url));
  }
  const { hostname, pathname, port, protocol, search } = url;
  let query;
  if (search) {
    query = parseQueryString(search);
  }
  return {
    hostname,
    port: port ? parseInt(port) : void 0,
    protocol,
    path: pathname,
    query
  };
};

// ../../node_modules/@aws-sdk/middleware-endpoint/dist-es/adaptors/toEndpointV1.js
var toEndpointV1 = (endpoint) => {
  if (typeof endpoint === "object") {
    if ("url" in endpoint) {
      return parseUrl(endpoint.url);
    }
    return endpoint;
  }
  return parseUrl(endpoint);
};

// ../../node_modules/@aws-sdk/middleware-endpoint/dist-es/endpointMiddleware.js
var endpointMiddleware = ({ config, instructions }) => {
  return (next, context) => async (args) => {
    const endpoint = await getEndpointFromInstructions(args.input, {
      getEndpointParameterInstructions() {
        return instructions;
      }
    }, { ...config }, context);
    context.endpointV2 = endpoint;
    context.authSchemes = endpoint.properties?.authSchemes;
    const authScheme = context.authSchemes?.[0];
    if (authScheme) {
      context["signing_region"] = authScheme.signingRegion;
      context["signing_service"] = authScheme.signingName;
    }
    return next({
      ...args
    });
  };
};

// ../../node_modules/@aws-sdk/middleware-serde/dist-es/deserializerMiddleware.js
var deserializerMiddleware = (options, deserializer) => (next, context) => async (args) => {
  const { response } = await next(args);
  try {
    const parsed = await deserializer(response, options);
    return {
      response,
      output: parsed
    };
  } catch (error) {
    Object.defineProperty(error, "$response", {
      value: response
    });
    throw error;
  }
};

// ../../node_modules/@aws-sdk/middleware-serde/dist-es/serializerMiddleware.js
var serializerMiddleware = (options, serializer) => (next, context) => async (args) => {
  const endpoint = context.endpointV2?.url && options.urlParser ? async () => options.urlParser(context.endpointV2.url) : options.endpoint;
  if (!endpoint) {
    throw new Error("No valid endpoint provider available.");
  }
  const request2 = await serializer(args.input, { ...options, endpoint });
  return next({
    ...args,
    request: request2
  });
};

// ../../node_modules/@aws-sdk/middleware-serde/dist-es/serdePlugin.js
var deserializerMiddlewareOption = {
  name: "deserializerMiddleware",
  step: "deserialize",
  tags: ["DESERIALIZER"],
  override: true
};
var serializerMiddlewareOption = {
  name: "serializerMiddleware",
  step: "serialize",
  tags: ["SERIALIZER"],
  override: true
};
function getSerdePlugin(config, serializer, deserializer) {
  return {
    applyToStack: (commandStack) => {
      commandStack.add(deserializerMiddleware(config, deserializer), deserializerMiddlewareOption);
      commandStack.add(serializerMiddleware(config, serializer), serializerMiddlewareOption);
    }
  };
}

// ../../node_modules/@aws-sdk/middleware-endpoint/dist-es/getEndpointPlugin.js
var endpointMiddlewareOptions = {
  step: "serialize",
  tags: ["ENDPOINT_PARAMETERS", "ENDPOINT_V2", "ENDPOINT"],
  name: "endpointV2Middleware",
  override: true,
  relation: "before",
  toMiddleware: serializerMiddlewareOption.name
};
var getEndpointPlugin = (config, instructions) => ({
  applyToStack: (clientStack) => {
    clientStack.addRelativeTo(endpointMiddleware({
      config,
      instructions
    }), endpointMiddlewareOptions);
  }
});

// ../../node_modules/@aws-sdk/util-middleware/dist-es/normalizeProvider.js
var normalizeProvider = (input) => {
  if (typeof input === "function")
    return input;
  const promisified = Promise.resolve(input);
  return () => promisified;
};

// ../../node_modules/@aws-sdk/middleware-endpoint/dist-es/resolveEndpointConfig.js
var resolveEndpointConfig = (input) => {
  const tls = input.tls ?? true;
  const { endpoint } = input;
  const customEndpointProvider = endpoint != null ? async () => toEndpointV1(await normalizeProvider(endpoint)()) : void 0;
  const isCustomEndpoint = !!endpoint;
  return {
    ...input,
    endpoint: customEndpointProvider,
    tls,
    isCustomEndpoint,
    useDualstackEndpoint: normalizeProvider(input.useDualstackEndpoint ?? false),
    useFipsEndpoint: normalizeProvider(input.useFipsEndpoint ?? false)
  };
};

// ../../node_modules/@aws-sdk/smithy-client/dist-es/NoOpLogger.js
var NoOpLogger = class {
  trace() {
  }
  debug() {
  }
  info() {
  }
  warn() {
  }
  error() {
  }
};

// ../../node_modules/@aws-sdk/middleware-stack/dist-es/MiddlewareStack.js
var constructStack = () => {
  let absoluteEntries = [];
  let relativeEntries = [];
  const entriesNameSet = /* @__PURE__ */ new Set();
  const sort = (entries) => entries.sort((a13, b13) => stepWeights[b13.step] - stepWeights[a13.step] || priorityWeights[b13.priority || "normal"] - priorityWeights[a13.priority || "normal"]);
  const removeByName = (toRemove) => {
    let isRemoved = false;
    const filterCb = (entry) => {
      if (entry.name && entry.name === toRemove) {
        isRemoved = true;
        entriesNameSet.delete(toRemove);
        return false;
      }
      return true;
    };
    absoluteEntries = absoluteEntries.filter(filterCb);
    relativeEntries = relativeEntries.filter(filterCb);
    return isRemoved;
  };
  const removeByReference = (toRemove) => {
    let isRemoved = false;
    const filterCb = (entry) => {
      if (entry.middleware === toRemove) {
        isRemoved = true;
        if (entry.name)
          entriesNameSet.delete(entry.name);
        return false;
      }
      return true;
    };
    absoluteEntries = absoluteEntries.filter(filterCb);
    relativeEntries = relativeEntries.filter(filterCb);
    return isRemoved;
  };
  const cloneTo = (toStack) => {
    absoluteEntries.forEach((entry) => {
      toStack.add(entry.middleware, { ...entry });
    });
    relativeEntries.forEach((entry) => {
      toStack.addRelativeTo(entry.middleware, { ...entry });
    });
    return toStack;
  };
  const expandRelativeMiddlewareList = (from) => {
    const expandedMiddlewareList = [];
    from.before.forEach((entry) => {
      if (entry.before.length === 0 && entry.after.length === 0) {
        expandedMiddlewareList.push(entry);
      } else {
        expandedMiddlewareList.push(...expandRelativeMiddlewareList(entry));
      }
    });
    expandedMiddlewareList.push(from);
    from.after.reverse().forEach((entry) => {
      if (entry.before.length === 0 && entry.after.length === 0) {
        expandedMiddlewareList.push(entry);
      } else {
        expandedMiddlewareList.push(...expandRelativeMiddlewareList(entry));
      }
    });
    return expandedMiddlewareList;
  };
  const getMiddlewareList = (debug = false) => {
    const normalizedAbsoluteEntries = [];
    const normalizedRelativeEntries = [];
    const normalizedEntriesNameMap = {};
    absoluteEntries.forEach((entry) => {
      const normalizedEntry = {
        ...entry,
        before: [],
        after: []
      };
      if (normalizedEntry.name)
        normalizedEntriesNameMap[normalizedEntry.name] = normalizedEntry;
      normalizedAbsoluteEntries.push(normalizedEntry);
    });
    relativeEntries.forEach((entry) => {
      const normalizedEntry = {
        ...entry,
        before: [],
        after: []
      };
      if (normalizedEntry.name)
        normalizedEntriesNameMap[normalizedEntry.name] = normalizedEntry;
      normalizedRelativeEntries.push(normalizedEntry);
    });
    normalizedRelativeEntries.forEach((entry) => {
      if (entry.toMiddleware) {
        const toMiddleware = normalizedEntriesNameMap[entry.toMiddleware];
        if (toMiddleware === void 0) {
          if (debug) {
            return;
          }
          throw new Error(`${entry.toMiddleware} is not found when adding ${entry.name || "anonymous"} middleware ${entry.relation} ${entry.toMiddleware}`);
        }
        if (entry.relation === "after") {
          toMiddleware.after.push(entry);
        }
        if (entry.relation === "before") {
          toMiddleware.before.push(entry);
        }
      }
    });
    const mainChain = sort(normalizedAbsoluteEntries).map(expandRelativeMiddlewareList).reduce((wholeList, expendedMiddlewareList) => {
      wholeList.push(...expendedMiddlewareList);
      return wholeList;
    }, []);
    return mainChain;
  };
  const stack = {
    add: (middleware, options = {}) => {
      const { name, override } = options;
      const entry = {
        step: "initialize",
        priority: "normal",
        middleware,
        ...options
      };
      if (name) {
        if (entriesNameSet.has(name)) {
          if (!override)
            throw new Error(`Duplicate middleware name '${name}'`);
          const toOverrideIndex = absoluteEntries.findIndex((entry2) => entry2.name === name);
          const toOverride = absoluteEntries[toOverrideIndex];
          if (toOverride.step !== entry.step || toOverride.priority !== entry.priority) {
            throw new Error(`"${name}" middleware with ${toOverride.priority} priority in ${toOverride.step} step cannot be overridden by same-name middleware with ${entry.priority} priority in ${entry.step} step.`);
          }
          absoluteEntries.splice(toOverrideIndex, 1);
        }
        entriesNameSet.add(name);
      }
      absoluteEntries.push(entry);
    },
    addRelativeTo: (middleware, options) => {
      const { name, override } = options;
      const entry = {
        middleware,
        ...options
      };
      if (name) {
        if (entriesNameSet.has(name)) {
          if (!override)
            throw new Error(`Duplicate middleware name '${name}'`);
          const toOverrideIndex = relativeEntries.findIndex((entry2) => entry2.name === name);
          const toOverride = relativeEntries[toOverrideIndex];
          if (toOverride.toMiddleware !== entry.toMiddleware || toOverride.relation !== entry.relation) {
            throw new Error(`"${name}" middleware ${toOverride.relation} "${toOverride.toMiddleware}" middleware cannot be overridden by same-name middleware ${entry.relation} "${entry.toMiddleware}" middleware.`);
          }
          relativeEntries.splice(toOverrideIndex, 1);
        }
        entriesNameSet.add(name);
      }
      relativeEntries.push(entry);
    },
    clone: () => cloneTo(constructStack()),
    use: (plugin) => {
      plugin.applyToStack(stack);
    },
    remove: (toRemove) => {
      if (typeof toRemove === "string")
        return removeByName(toRemove);
      else
        return removeByReference(toRemove);
    },
    removeByTag: (toRemove) => {
      let isRemoved = false;
      const filterCb = (entry) => {
        const { tags, name } = entry;
        if (tags && tags.includes(toRemove)) {
          if (name)
            entriesNameSet.delete(name);
          isRemoved = true;
          return false;
        }
        return true;
      };
      absoluteEntries = absoluteEntries.filter(filterCb);
      relativeEntries = relativeEntries.filter(filterCb);
      return isRemoved;
    },
    concat: (from) => {
      const cloned = cloneTo(constructStack());
      cloned.use(from);
      return cloned;
    },
    applyToStack: cloneTo,
    identify: () => {
      return getMiddlewareList(true).map((mw) => {
        return mw.name + ": " + (mw.tags || []).join(",");
      });
    },
    resolve: (handler, context) => {
      for (const middleware of getMiddlewareList().map((entry) => entry.middleware).reverse()) {
        handler = middleware(handler, context);
      }
      return handler;
    }
  };
  return stack;
};
var stepWeights = {
  initialize: 5,
  serialize: 4,
  build: 3,
  finalizeRequest: 2,
  deserialize: 1
};
var priorityWeights = {
  high: 3,
  normal: 2,
  low: 1
};

// ../../node_modules/@aws-sdk/smithy-client/dist-es/client.js
var Client = class {
  constructor(config) {
    this.middlewareStack = constructStack();
    this.config = config;
  }
  send(command, optionsOrCb, cb) {
    const options = typeof optionsOrCb !== "function" ? optionsOrCb : void 0;
    const callback = typeof optionsOrCb === "function" ? optionsOrCb : cb;
    const handler = command.resolveMiddleware(this.middlewareStack, this.config, options);
    if (callback) {
      handler(command).then((result) => callback(null, result.output), (err) => callback(err)).catch(() => {
      });
    } else {
      return handler(command).then((result) => result.output);
    }
  }
  destroy() {
    if (this.config.requestHandler.destroy)
      this.config.requestHandler.destroy();
  }
};

// ../../node_modules/@aws-sdk/smithy-client/dist-es/command.js
var Command = class {
  constructor() {
    this.middlewareStack = constructStack();
  }
};

// ../../node_modules/@aws-sdk/smithy-client/dist-es/constants.js
var SENSITIVE_STRING = "***SensitiveInformation***";

// ../../node_modules/@aws-sdk/smithy-client/dist-es/parse-utils.js
var parseBoolean = (value) => {
  switch (value) {
    case "true":
      return true;
    case "false":
      return false;
    default:
      throw new Error(`Unable to parse boolean value "${value}"`);
  }
};
var expectBoolean = (value) => {
  if (value === null || value === void 0) {
    return void 0;
  }
  if (typeof value === "number") {
    if (value === 0 || value === 1) {
      logger.warn(stackTraceWarning(`Expected boolean, got ${typeof value}: ${value}`));
    }
    if (value === 0) {
      return false;
    }
    if (value === 1) {
      return true;
    }
  }
  if (typeof value === "string") {
    const lower = value.toLowerCase();
    if (lower === "false" || lower === "true") {
      logger.warn(stackTraceWarning(`Expected boolean, got ${typeof value}: ${value}`));
    }
    if (lower === "false") {
      return false;
    }
    if (lower === "true") {
      return true;
    }
  }
  if (typeof value === "boolean") {
    return value;
  }
  throw new TypeError(`Expected boolean, got ${typeof value}: ${value}`);
};
var expectNumber = (value) => {
  if (value === null || value === void 0) {
    return void 0;
  }
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    if (!Number.isNaN(parsed)) {
      if (String(parsed) !== String(value)) {
        logger.warn(stackTraceWarning(`Expected number but observed string: ${value}`));
      }
      return parsed;
    }
  }
  if (typeof value === "number") {
    return value;
  }
  throw new TypeError(`Expected number, got ${typeof value}: ${value}`);
};
var MAX_FLOAT = Math.ceil(2 ** 127 * (2 - 2 ** -23));
var expectFloat32 = (value) => {
  const expected = expectNumber(value);
  if (expected !== void 0 && !Number.isNaN(expected) && expected !== Infinity && expected !== -Infinity) {
    if (Math.abs(expected) > MAX_FLOAT) {
      throw new TypeError(`Expected 32-bit float, got ${value}`);
    }
  }
  return expected;
};
var expectLong = (value) => {
  if (value === null || value === void 0) {
    return void 0;
  }
  if (Number.isInteger(value) && !Number.isNaN(value)) {
    return value;
  }
  throw new TypeError(`Expected integer, got ${typeof value}: ${value}`);
};
var expectInt32 = (value) => expectSizedInt(value, 32);
var expectShort = (value) => expectSizedInt(value, 16);
var expectByte = (value) => expectSizedInt(value, 8);
var expectSizedInt = (value, size) => {
  const expected = expectLong(value);
  if (expected !== void 0 && castInt(expected, size) !== expected) {
    throw new TypeError(`Expected ${size}-bit integer, got ${value}`);
  }
  return expected;
};
var castInt = (value, size) => {
  switch (size) {
    case 32:
      return Int32Array.of(value)[0];
    case 16:
      return Int16Array.of(value)[0];
    case 8:
      return Int8Array.of(value)[0];
  }
};
var expectNonNull = (value, location) => {
  if (value === null || value === void 0) {
    if (location) {
      throw new TypeError(`Expected a non-null value for ${location}`);
    }
    throw new TypeError("Expected a non-null value");
  }
  return value;
};
var expectObject = (value) => {
  if (value === null || value === void 0) {
    return void 0;
  }
  if (typeof value === "object" && !Array.isArray(value)) {
    return value;
  }
  const receivedType = Array.isArray(value) ? "array" : typeof value;
  throw new TypeError(`Expected object, got ${receivedType}: ${value}`);
};
var expectString = (value) => {
  if (value === null || value === void 0) {
    return void 0;
  }
  if (typeof value === "string") {
    return value;
  }
  if (["boolean", "number", "bigint"].includes(typeof value)) {
    logger.warn(stackTraceWarning(`Expected string, got ${typeof value}: ${value}`));
    return String(value);
  }
  throw new TypeError(`Expected string, got ${typeof value}: ${value}`);
};
var expectUnion = (value) => {
  if (value === null || value === void 0) {
    return void 0;
  }
  const asObject = expectObject(value);
  const setKeys = Object.entries(asObject).filter(([, v8]) => v8 != null).map(([k13]) => k13);
  if (setKeys.length === 0) {
    throw new TypeError(`Unions must have exactly one non-null member. None were found.`);
  }
  if (setKeys.length > 1) {
    throw new TypeError(`Unions must have exactly one non-null member. Keys ${setKeys} were not null.`);
  }
  return asObject;
};
var strictParseDouble = (value) => {
  if (typeof value == "string") {
    return expectNumber(parseNumber(value));
  }
  return expectNumber(value);
};
var strictParseFloat32 = (value) => {
  if (typeof value == "string") {
    return expectFloat32(parseNumber(value));
  }
  return expectFloat32(value);
};
var NUMBER_REGEX = /(-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)|(-?Infinity)|(NaN)/g;
var parseNumber = (value) => {
  const matches = value.match(NUMBER_REGEX);
  if (matches === null || matches[0].length !== value.length) {
    throw new TypeError(`Expected real number, got implicit NaN`);
  }
  return parseFloat(value);
};
var limitedParseDouble = (value) => {
  if (typeof value == "string") {
    return parseFloatString(value);
  }
  return expectNumber(value);
};
var parseFloatString = (value) => {
  switch (value) {
    case "NaN":
      return NaN;
    case "Infinity":
      return Infinity;
    case "-Infinity":
      return -Infinity;
    default:
      throw new Error(`Unable to parse float value: ${value}`);
  }
};
var strictParseInt32 = (value) => {
  if (typeof value === "string") {
    return expectInt32(parseNumber(value));
  }
  return expectInt32(value);
};
var strictParseShort = (value) => {
  if (typeof value === "string") {
    return expectShort(parseNumber(value));
  }
  return expectShort(value);
};
var strictParseByte = (value) => {
  if (typeof value === "string") {
    return expectByte(parseNumber(value));
  }
  return expectByte(value);
};
var stackTraceWarning = (message) => {
  return String(new TypeError(message).stack || message).split("\n").slice(0, 5).filter((s13) => !s13.includes("stackTraceWarning")).join("\n");
};
var logger = {
  warn: console.warn
};

// ../../node_modules/@aws-sdk/smithy-client/dist-es/date-utils.js
var MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
var RFC3339 = new RegExp(/^(\d{4})-(\d{2})-(\d{2})[tT](\d{2}):(\d{2}):(\d{2})(?:\.(\d+))?[zZ]$/);
var parseRfc3339DateTime = (value) => {
  if (value === null || value === void 0) {
    return void 0;
  }
  if (typeof value !== "string") {
    throw new TypeError("RFC-3339 date-times must be expressed as strings");
  }
  const match = RFC3339.exec(value);
  if (!match) {
    throw new TypeError("Invalid RFC-3339 date-time value");
  }
  const [_, yearStr, monthStr, dayStr, hours, minutes, seconds, fractionalMilliseconds] = match;
  const year = strictParseShort(stripLeadingZeroes(yearStr));
  const month = parseDateValue(monthStr, "month", 1, 12);
  const day = parseDateValue(dayStr, "day", 1, 31);
  return buildDate(year, month, day, { hours, minutes, seconds, fractionalMilliseconds });
};
var IMF_FIXDATE = new RegExp(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), (\d{2}) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) (\d{4}) (\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))? GMT$/);
var RFC_850_DATE = new RegExp(/^(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday), (\d{2})-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-(\d{2}) (\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))? GMT$/);
var ASC_TIME = new RegExp(/^(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun) (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) ( [1-9]|\d{2}) (\d{1,2}):(\d{2}):(\d{2})(?:\.(\d+))? (\d{4})$/);
var parseEpochTimestamp = (value) => {
  if (value === null || value === void 0) {
    return void 0;
  }
  let valueAsDouble;
  if (typeof value === "number") {
    valueAsDouble = value;
  } else if (typeof value === "string") {
    valueAsDouble = strictParseDouble(value);
  } else {
    throw new TypeError("Epoch timestamps must be expressed as floating point numbers or their string representation");
  }
  if (Number.isNaN(valueAsDouble) || valueAsDouble === Infinity || valueAsDouble === -Infinity) {
    throw new TypeError("Epoch timestamps must be valid, non-Infinite, non-NaN numerics");
  }
  return new Date(Math.round(valueAsDouble * 1e3));
};
var buildDate = (year, month, day, time) => {
  const adjustedMonth = month - 1;
  validateDayOfMonth(year, adjustedMonth, day);
  return new Date(Date.UTC(year, adjustedMonth, day, parseDateValue(time.hours, "hour", 0, 23), parseDateValue(time.minutes, "minute", 0, 59), parseDateValue(time.seconds, "seconds", 0, 60), parseMilliseconds(time.fractionalMilliseconds)));
};
var FIFTY_YEARS_IN_MILLIS = 50 * 365 * 24 * 60 * 60 * 1e3;
var DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
var validateDayOfMonth = (year, month, day) => {
  let maxDays = DAYS_IN_MONTH[month];
  if (month === 1 && isLeapYear(year)) {
    maxDays = 29;
  }
  if (day > maxDays) {
    throw new TypeError(`Invalid day for ${MONTHS[month]} in ${year}: ${day}`);
  }
};
var isLeapYear = (year) => {
  return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
};
var parseDateValue = (value, type, lower, upper) => {
  const dateVal = strictParseByte(stripLeadingZeroes(value));
  if (dateVal < lower || dateVal > upper) {
    throw new TypeError(`${type} must be between ${lower} and ${upper}, inclusive`);
  }
  return dateVal;
};
var parseMilliseconds = (value) => {
  if (value === null || value === void 0) {
    return 0;
  }
  return strictParseFloat32("0." + value) * 1e3;
};
var stripLeadingZeroes = (value) => {
  let idx = 0;
  while (idx < value.length - 1 && value.charAt(idx) === "0") {
    idx++;
  }
  if (idx === 0) {
    return value;
  }
  return value.slice(idx);
};

// ../../node_modules/@aws-sdk/smithy-client/dist-es/exceptions.js
var ServiceException = class extends Error {
  constructor(options) {
    super(options.message);
    Object.setPrototypeOf(this, ServiceException.prototype);
    this.name = options.name;
    this.$fault = options.$fault;
    this.$metadata = options.$metadata;
  }
};
var decorateServiceException = (exception, additions = {}) => {
  Object.entries(additions).filter(([, v8]) => v8 !== void 0).forEach(([k13, v8]) => {
    if (exception[k13] == void 0 || exception[k13] === "") {
      exception[k13] = v8;
    }
  });
  const message = exception.message || exception.Message || "UnknownError";
  exception.message = message;
  delete exception.Message;
  return exception;
};

// ../../node_modules/@aws-sdk/smithy-client/dist-es/default-error-handler.js
var throwDefaultError = ({ output, parsedBody, exceptionCtor, errorCode }) => {
  const $metadata = deserializeMetadata(output);
  const statusCode = $metadata.httpStatusCode ? $metadata.httpStatusCode + "" : void 0;
  const response = new exceptionCtor({
    name: parsedBody.code || parsedBody.Code || errorCode || statusCode || "UnknownError",
    $fault: "client",
    $metadata
  });
  throw decorateServiceException(response, parsedBody);
};
var deserializeMetadata = (output) => ({
  httpStatusCode: output.statusCode,
  requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
  extendedRequestId: output.headers["x-amz-id-2"],
  cfId: output.headers["x-amz-cf-id"]
});

// ../../node_modules/@aws-sdk/smithy-client/dist-es/defaults-mode.js
var loadConfigsForDefaultMode = (mode) => {
  switch (mode) {
    case "standard":
      return {
        retryMode: "standard",
        connectionTimeout: 3100
      };
    case "in-region":
      return {
        retryMode: "standard",
        connectionTimeout: 1100
      };
    case "cross-region":
      return {
        retryMode: "standard",
        connectionTimeout: 3100
      };
    case "mobile":
      return {
        retryMode: "standard",
        connectionTimeout: 3e4
      };
    default:
      return {};
  }
};

// ../../node_modules/@aws-sdk/smithy-client/dist-es/emitWarningIfUnsupportedVersion.js
var warningEmitted = false;
var emitWarningIfUnsupportedVersion = (version4) => {
  if (version4 && !warningEmitted && parseInt(version4.substring(1, version4.indexOf("."))) < 14) {
    warningEmitted = true;
  }
};

// ../../node_modules/@aws-sdk/smithy-client/dist-es/extended-encode-uri-component.js
function extendedEncodeURIComponent(str) {
  return encodeURIComponent(str).replace(/[!'()*]/g, function(c13) {
    return "%" + c13.charCodeAt(0).toString(16).toUpperCase();
  });
}

// ../../node_modules/@aws-sdk/smithy-client/dist-es/get-array-if-single-item.js
var getArrayIfSingleItem = (mayBeArray) => Array.isArray(mayBeArray) ? mayBeArray : [mayBeArray];

// ../../node_modules/@aws-sdk/smithy-client/dist-es/get-value-from-text-node.js
var getValueFromTextNode = (obj) => {
  const textNodeName = "#text";
  for (const key in obj) {
    if (obj.hasOwnProperty(key) && obj[key][textNodeName] !== void 0) {
      obj[key] = obj[key][textNodeName];
    } else if (typeof obj[key] === "object" && obj[key] !== null) {
      obj[key] = getValueFromTextNode(obj[key]);
    }
  }
  return obj;
};

// ../../node_modules/@aws-sdk/smithy-client/dist-es/lazy-json.js
var StringWrapper = function() {
  const Class = Object.getPrototypeOf(this).constructor;
  const Constructor = Function.bind.apply(String, [null, ...arguments]);
  const instance = new Constructor();
  Object.setPrototypeOf(instance, Class.prototype);
  return instance;
};
StringWrapper.prototype = Object.create(String.prototype, {
  constructor: {
    value: StringWrapper,
    enumerable: false,
    writable: true,
    configurable: true
  }
});
Object.setPrototypeOf(StringWrapper, String);
var LazyJsonString = class extends StringWrapper {
  deserializeJSON() {
    return JSON.parse(super.toString());
  }
  toJSON() {
    return super.toString();
  }
  static fromObject(object) {
    if (object instanceof LazyJsonString) {
      return object;
    } else if (object instanceof String || typeof object === "string") {
      return new LazyJsonString(object);
    }
    return new LazyJsonString(JSON.stringify(object));
  }
};

// ../../node_modules/@aws-sdk/smithy-client/dist-es/object-mapping.js
function map(arg0, arg1, arg2) {
  let target;
  let filter;
  let instructions;
  if (typeof arg1 === "undefined" && typeof arg2 === "undefined") {
    target = {};
    instructions = arg0;
  } else {
    target = arg0;
    if (typeof arg1 === "function") {
      filter = arg1;
      instructions = arg2;
      return mapWithFilter(target, filter, instructions);
    } else {
      instructions = arg1;
    }
  }
  for (const key of Object.keys(instructions)) {
    if (!Array.isArray(instructions[key])) {
      target[key] = instructions[key];
      continue;
    }
    let [filter2, value] = instructions[key];
    if (typeof value === "function") {
      let _value;
      const defaultFilterPassed = filter2 === void 0 && (_value = value()) != null;
      const customFilterPassed = typeof filter2 === "function" && !!filter2(void 0) || typeof filter2 !== "function" && !!filter2;
      if (defaultFilterPassed) {
        target[key] = _value;
      } else if (customFilterPassed) {
        target[key] = value();
      }
    } else {
      const defaultFilterPassed = filter2 === void 0 && value != null;
      const customFilterPassed = typeof filter2 === "function" && !!filter2(value) || typeof filter2 !== "function" && !!filter2;
      if (defaultFilterPassed || customFilterPassed) {
        target[key] = value;
      }
    }
  }
  return target;
}
var mapWithFilter = (target, filter, instructions) => {
  return map(target, Object.entries(instructions).reduce((_instructions, [key, value]) => {
    if (Array.isArray(value)) {
      _instructions[key] = value;
    } else {
      if (typeof value === "function") {
        _instructions[key] = [filter, value()];
      } else {
        _instructions[key] = [filter, value];
      }
    }
    return _instructions;
  }, {}));
};

// ../../node_modules/@aws-sdk/smithy-client/dist-es/resolve-path.js
var resolvedPath = (resolvedPath2, input, memberName, labelValueProvider, uriLabel, isGreedyLabel) => {
  if (input != null && input[memberName] !== void 0) {
    const labelValue = labelValueProvider();
    if (labelValue.length <= 0) {
      throw new Error("Empty value provided for input HTTP label: " + memberName + ".");
    }
    resolvedPath2 = resolvedPath2.replace(uriLabel, isGreedyLabel ? labelValue.split("/").map((segment) => extendedEncodeURIComponent(segment)).join("/") : extendedEncodeURIComponent(labelValue));
  } else {
    throw new Error("No value provided for input HTTP label: " + memberName + ".");
  }
  return resolvedPath2;
};

// ../../node_modules/@aws-sdk/client-dynamodb/dist-es/models/DynamoDBServiceException.js
var DynamoDBServiceException = class extends ServiceException {
  constructor(options) {
    super(options);
    Object.setPrototypeOf(this, DynamoDBServiceException.prototype);
  }
};

// ../../node_modules/@aws-sdk/client-dynamodb/dist-es/models/models_0.js
var AttributeAction;
(function(AttributeAction2) {
  AttributeAction2["ADD"] = "ADD";
  AttributeAction2["DELETE"] = "DELETE";
  AttributeAction2["PUT"] = "PUT";
})(AttributeAction || (AttributeAction = {}));
var ScalarAttributeType;
(function(ScalarAttributeType2) {
  ScalarAttributeType2["B"] = "B";
  ScalarAttributeType2["N"] = "N";
  ScalarAttributeType2["S"] = "S";
})(ScalarAttributeType || (ScalarAttributeType = {}));
var BackupStatus;
(function(BackupStatus2) {
  BackupStatus2["AVAILABLE"] = "AVAILABLE";
  BackupStatus2["CREATING"] = "CREATING";
  BackupStatus2["DELETED"] = "DELETED";
})(BackupStatus || (BackupStatus = {}));
var BackupType;
(function(BackupType2) {
  BackupType2["AWS_BACKUP"] = "AWS_BACKUP";
  BackupType2["SYSTEM"] = "SYSTEM";
  BackupType2["USER"] = "USER";
})(BackupType || (BackupType = {}));
var BillingMode;
(function(BillingMode2) {
  BillingMode2["PAY_PER_REQUEST"] = "PAY_PER_REQUEST";
  BillingMode2["PROVISIONED"] = "PROVISIONED";
})(BillingMode || (BillingMode = {}));
var KeyType;
(function(KeyType2) {
  KeyType2["HASH"] = "HASH";
  KeyType2["RANGE"] = "RANGE";
})(KeyType || (KeyType = {}));
var ProjectionType;
(function(ProjectionType2) {
  ProjectionType2["ALL"] = "ALL";
  ProjectionType2["INCLUDE"] = "INCLUDE";
  ProjectionType2["KEYS_ONLY"] = "KEYS_ONLY";
})(ProjectionType || (ProjectionType = {}));
var SSEType;
(function(SSEType2) {
  SSEType2["AES256"] = "AES256";
  SSEType2["KMS"] = "KMS";
})(SSEType || (SSEType = {}));
var SSEStatus;
(function(SSEStatus2) {
  SSEStatus2["DISABLED"] = "DISABLED";
  SSEStatus2["DISABLING"] = "DISABLING";
  SSEStatus2["ENABLED"] = "ENABLED";
  SSEStatus2["ENABLING"] = "ENABLING";
  SSEStatus2["UPDATING"] = "UPDATING";
})(SSEStatus || (SSEStatus = {}));
var StreamViewType;
(function(StreamViewType2) {
  StreamViewType2["KEYS_ONLY"] = "KEYS_ONLY";
  StreamViewType2["NEW_AND_OLD_IMAGES"] = "NEW_AND_OLD_IMAGES";
  StreamViewType2["NEW_IMAGE"] = "NEW_IMAGE";
  StreamViewType2["OLD_IMAGE"] = "OLD_IMAGE";
})(StreamViewType || (StreamViewType = {}));
var TimeToLiveStatus;
(function(TimeToLiveStatus2) {
  TimeToLiveStatus2["DISABLED"] = "DISABLED";
  TimeToLiveStatus2["DISABLING"] = "DISABLING";
  TimeToLiveStatus2["ENABLED"] = "ENABLED";
  TimeToLiveStatus2["ENABLING"] = "ENABLING";
})(TimeToLiveStatus || (TimeToLiveStatus = {}));
var BackupTypeFilter;
(function(BackupTypeFilter2) {
  BackupTypeFilter2["ALL"] = "ALL";
  BackupTypeFilter2["AWS_BACKUP"] = "AWS_BACKUP";
  BackupTypeFilter2["SYSTEM"] = "SYSTEM";
  BackupTypeFilter2["USER"] = "USER";
})(BackupTypeFilter || (BackupTypeFilter = {}));
var ReturnConsumedCapacity;
(function(ReturnConsumedCapacity2) {
  ReturnConsumedCapacity2["INDEXES"] = "INDEXES";
  ReturnConsumedCapacity2["NONE"] = "NONE";
  ReturnConsumedCapacity2["TOTAL"] = "TOTAL";
})(ReturnConsumedCapacity || (ReturnConsumedCapacity = {}));
var BatchStatementErrorCodeEnum;
(function(BatchStatementErrorCodeEnum2) {
  BatchStatementErrorCodeEnum2["AccessDenied"] = "AccessDenied";
  BatchStatementErrorCodeEnum2["ConditionalCheckFailed"] = "ConditionalCheckFailed";
  BatchStatementErrorCodeEnum2["DuplicateItem"] = "DuplicateItem";
  BatchStatementErrorCodeEnum2["InternalServerError"] = "InternalServerError";
  BatchStatementErrorCodeEnum2["ItemCollectionSizeLimitExceeded"] = "ItemCollectionSizeLimitExceeded";
  BatchStatementErrorCodeEnum2["ProvisionedThroughputExceeded"] = "ProvisionedThroughputExceeded";
  BatchStatementErrorCodeEnum2["RequestLimitExceeded"] = "RequestLimitExceeded";
  BatchStatementErrorCodeEnum2["ResourceNotFound"] = "ResourceNotFound";
  BatchStatementErrorCodeEnum2["ThrottlingError"] = "ThrottlingError";
  BatchStatementErrorCodeEnum2["TransactionConflict"] = "TransactionConflict";
  BatchStatementErrorCodeEnum2["ValidationError"] = "ValidationError";
})(BatchStatementErrorCodeEnum || (BatchStatementErrorCodeEnum = {}));
var InternalServerError = class extends DynamoDBServiceException {
  constructor(opts) {
    super({
      name: "InternalServerError",
      $fault: "server",
      ...opts
    });
    this.name = "InternalServerError";
    this.$fault = "server";
    Object.setPrototypeOf(this, InternalServerError.prototype);
  }
};
var RequestLimitExceeded = class extends DynamoDBServiceException {
  constructor(opts) {
    super({
      name: "RequestLimitExceeded",
      $fault: "client",
      ...opts
    });
    this.name = "RequestLimitExceeded";
    this.$fault = "client";
    Object.setPrototypeOf(this, RequestLimitExceeded.prototype);
  }
};
var InvalidEndpointException = class extends DynamoDBServiceException {
  constructor(opts) {
    super({
      name: "InvalidEndpointException",
      $fault: "client",
      ...opts
    });
    this.name = "InvalidEndpointException";
    this.$fault = "client";
    Object.setPrototypeOf(this, InvalidEndpointException.prototype);
    this.Message = opts.Message;
  }
};
var ProvisionedThroughputExceededException = class extends DynamoDBServiceException {
  constructor(opts) {
    super({
      name: "ProvisionedThroughputExceededException",
      $fault: "client",
      ...opts
    });
    this.name = "ProvisionedThroughputExceededException";
    this.$fault = "client";
    Object.setPrototypeOf(this, ProvisionedThroughputExceededException.prototype);
  }
};
var ResourceNotFoundException = class extends DynamoDBServiceException {
  constructor(opts) {
    super({
      name: "ResourceNotFoundException",
      $fault: "client",
      ...opts
    });
    this.name = "ResourceNotFoundException";
    this.$fault = "client";
    Object.setPrototypeOf(this, ResourceNotFoundException.prototype);
  }
};
var ReturnItemCollectionMetrics;
(function(ReturnItemCollectionMetrics2) {
  ReturnItemCollectionMetrics2["NONE"] = "NONE";
  ReturnItemCollectionMetrics2["SIZE"] = "SIZE";
})(ReturnItemCollectionMetrics || (ReturnItemCollectionMetrics = {}));
var ItemCollectionSizeLimitExceededException = class extends DynamoDBServiceException {
  constructor(opts) {
    super({
      name: "ItemCollectionSizeLimitExceededException",
      $fault: "client",
      ...opts
    });
    this.name = "ItemCollectionSizeLimitExceededException";
    this.$fault = "client";
    Object.setPrototypeOf(this, ItemCollectionSizeLimitExceededException.prototype);
  }
};
var ComparisonOperator;
(function(ComparisonOperator3) {
  ComparisonOperator3["BEGINS_WITH"] = "BEGINS_WITH";
  ComparisonOperator3["BETWEEN"] = "BETWEEN";
  ComparisonOperator3["CONTAINS"] = "CONTAINS";
  ComparisonOperator3["EQ"] = "EQ";
  ComparisonOperator3["GE"] = "GE";
  ComparisonOperator3["GT"] = "GT";
  ComparisonOperator3["IN"] = "IN";
  ComparisonOperator3["LE"] = "LE";
  ComparisonOperator3["LT"] = "LT";
  ComparisonOperator3["NE"] = "NE";
  ComparisonOperator3["NOT_CONTAINS"] = "NOT_CONTAINS";
  ComparisonOperator3["NOT_NULL"] = "NOT_NULL";
  ComparisonOperator3["NULL"] = "NULL";
})(ComparisonOperator || (ComparisonOperator = {}));
var ConditionalCheckFailedException = class extends DynamoDBServiceException {
  constructor(opts) {
    super({
      name: "ConditionalCheckFailedException",
      $fault: "client",
      ...opts
    });
    this.name = "ConditionalCheckFailedException";
    this.$fault = "client";
    Object.setPrototypeOf(this, ConditionalCheckFailedException.prototype);
  }
};
var ConditionalOperator;
(function(ConditionalOperator2) {
  ConditionalOperator2["AND"] = "AND";
  ConditionalOperator2["OR"] = "OR";
})(ConditionalOperator || (ConditionalOperator = {}));
var ReturnValuesOnConditionCheckFailure;
(function(ReturnValuesOnConditionCheckFailure2) {
  ReturnValuesOnConditionCheckFailure2["ALL_OLD"] = "ALL_OLD";
  ReturnValuesOnConditionCheckFailure2["NONE"] = "NONE";
})(ReturnValuesOnConditionCheckFailure || (ReturnValuesOnConditionCheckFailure = {}));
var ContinuousBackupsStatus;
(function(ContinuousBackupsStatus2) {
  ContinuousBackupsStatus2["DISABLED"] = "DISABLED";
  ContinuousBackupsStatus2["ENABLED"] = "ENABLED";
})(ContinuousBackupsStatus || (ContinuousBackupsStatus = {}));
var PointInTimeRecoveryStatus;
(function(PointInTimeRecoveryStatus2) {
  PointInTimeRecoveryStatus2["DISABLED"] = "DISABLED";
  PointInTimeRecoveryStatus2["ENABLED"] = "ENABLED";
})(PointInTimeRecoveryStatus || (PointInTimeRecoveryStatus = {}));
var ContributorInsightsAction;
(function(ContributorInsightsAction2) {
  ContributorInsightsAction2["DISABLE"] = "DISABLE";
  ContributorInsightsAction2["ENABLE"] = "ENABLE";
})(ContributorInsightsAction || (ContributorInsightsAction = {}));
var ContributorInsightsStatus;
(function(ContributorInsightsStatus2) {
  ContributorInsightsStatus2["DISABLED"] = "DISABLED";
  ContributorInsightsStatus2["DISABLING"] = "DISABLING";
  ContributorInsightsStatus2["ENABLED"] = "ENABLED";
  ContributorInsightsStatus2["ENABLING"] = "ENABLING";
  ContributorInsightsStatus2["FAILED"] = "FAILED";
})(ContributorInsightsStatus || (ContributorInsightsStatus = {}));
var LimitExceededException = class extends DynamoDBServiceException {
  constructor(opts) {
    super({
      name: "LimitExceededException",
      $fault: "client",
      ...opts
    });
    this.name = "LimitExceededException";
    this.$fault = "client";
    Object.setPrototypeOf(this, LimitExceededException.prototype);
  }
};
var GlobalTableStatus;
(function(GlobalTableStatus2) {
  GlobalTableStatus2["ACTIVE"] = "ACTIVE";
  GlobalTableStatus2["CREATING"] = "CREATING";
  GlobalTableStatus2["DELETING"] = "DELETING";
  GlobalTableStatus2["UPDATING"] = "UPDATING";
})(GlobalTableStatus || (GlobalTableStatus = {}));
var ReplicaStatus;
(function(ReplicaStatus2) {
  ReplicaStatus2["ACTIVE"] = "ACTIVE";
  ReplicaStatus2["CREATING"] = "CREATING";
  ReplicaStatus2["CREATION_FAILED"] = "CREATION_FAILED";
  ReplicaStatus2["DELETING"] = "DELETING";
  ReplicaStatus2["INACCESSIBLE_ENCRYPTION_CREDENTIALS"] = "INACCESSIBLE_ENCRYPTION_CREDENTIALS";
  ReplicaStatus2["REGION_DISABLED"] = "REGION_DISABLED";
  ReplicaStatus2["UPDATING"] = "UPDATING";
})(ReplicaStatus || (ReplicaStatus = {}));
var TableClass;
(function(TableClass2) {
  TableClass2["STANDARD"] = "STANDARD";
  TableClass2["STANDARD_INFREQUENT_ACCESS"] = "STANDARD_INFREQUENT_ACCESS";
})(TableClass || (TableClass = {}));
var IndexStatus;
(function(IndexStatus3) {
  IndexStatus3["ACTIVE"] = "ACTIVE";
  IndexStatus3["CREATING"] = "CREATING";
  IndexStatus3["DELETING"] = "DELETING";
  IndexStatus3["UPDATING"] = "UPDATING";
})(IndexStatus || (IndexStatus = {}));
var TableStatus;
(function(TableStatus2) {
  TableStatus2["ACTIVE"] = "ACTIVE";
  TableStatus2["ARCHIVED"] = "ARCHIVED";
  TableStatus2["ARCHIVING"] = "ARCHIVING";
  TableStatus2["CREATING"] = "CREATING";
  TableStatus2["DELETING"] = "DELETING";
  TableStatus2["INACCESSIBLE_ENCRYPTION_CREDENTIALS"] = "INACCESSIBLE_ENCRYPTION_CREDENTIALS";
  TableStatus2["UPDATING"] = "UPDATING";
})(TableStatus || (TableStatus = {}));
var ResourceInUseException = class extends DynamoDBServiceException {
  constructor(opts) {
    super({
      name: "ResourceInUseException",
      $fault: "client",
      ...opts
    });
    this.name = "ResourceInUseException";
    this.$fault = "client";
    Object.setPrototypeOf(this, ResourceInUseException.prototype);
  }
};
var ReturnValue;
(function(ReturnValue2) {
  ReturnValue2["ALL_NEW"] = "ALL_NEW";
  ReturnValue2["ALL_OLD"] = "ALL_OLD";
  ReturnValue2["NONE"] = "NONE";
  ReturnValue2["UPDATED_NEW"] = "UPDATED_NEW";
  ReturnValue2["UPDATED_OLD"] = "UPDATED_OLD";
})(ReturnValue || (ReturnValue = {}));
var TransactionConflictException = class extends DynamoDBServiceException {
  constructor(opts) {
    super({
      name: "TransactionConflictException",
      $fault: "client",
      ...opts
    });
    this.name = "TransactionConflictException";
    this.$fault = "client";
    Object.setPrototypeOf(this, TransactionConflictException.prototype);
  }
};
var ExportFormat;
(function(ExportFormat2) {
  ExportFormat2["DYNAMODB_JSON"] = "DYNAMODB_JSON";
  ExportFormat2["ION"] = "ION";
})(ExportFormat || (ExportFormat = {}));
var ExportStatus;
(function(ExportStatus2) {
  ExportStatus2["COMPLETED"] = "COMPLETED";
  ExportStatus2["FAILED"] = "FAILED";
  ExportStatus2["IN_PROGRESS"] = "IN_PROGRESS";
})(ExportStatus || (ExportStatus = {}));
var S3SseAlgorithm;
(function(S3SseAlgorithm2) {
  S3SseAlgorithm2["AES256"] = "AES256";
  S3SseAlgorithm2["KMS"] = "KMS";
})(S3SseAlgorithm || (S3SseAlgorithm = {}));
var ImportStatus;
(function(ImportStatus2) {
  ImportStatus2["CANCELLED"] = "CANCELLED";
  ImportStatus2["CANCELLING"] = "CANCELLING";
  ImportStatus2["COMPLETED"] = "COMPLETED";
  ImportStatus2["FAILED"] = "FAILED";
  ImportStatus2["IN_PROGRESS"] = "IN_PROGRESS";
})(ImportStatus || (ImportStatus = {}));
var InputCompressionType;
(function(InputCompressionType2) {
  InputCompressionType2["GZIP"] = "GZIP";
  InputCompressionType2["NONE"] = "NONE";
  InputCompressionType2["ZSTD"] = "ZSTD";
})(InputCompressionType || (InputCompressionType = {}));
var InputFormat;
(function(InputFormat2) {
  InputFormat2["CSV"] = "CSV";
  InputFormat2["DYNAMODB_JSON"] = "DYNAMODB_JSON";
  InputFormat2["ION"] = "ION";
})(InputFormat || (InputFormat = {}));
var DestinationStatus;
(function(DestinationStatus2) {
  DestinationStatus2["ACTIVE"] = "ACTIVE";
  DestinationStatus2["DISABLED"] = "DISABLED";
  DestinationStatus2["DISABLING"] = "DISABLING";
  DestinationStatus2["ENABLE_FAILED"] = "ENABLE_FAILED";
  DestinationStatus2["ENABLING"] = "ENABLING";
})(DestinationStatus || (DestinationStatus = {}));
var IdempotentParameterMismatchException = class extends DynamoDBServiceException {
  constructor(opts) {
    super({
      name: "IdempotentParameterMismatchException",
      $fault: "client",
      ...opts
    });
    this.name = "IdempotentParameterMismatchException";
    this.$fault = "client";
    Object.setPrototypeOf(this, IdempotentParameterMismatchException.prototype);
    this.Message = opts.Message;
  }
};
var TransactionInProgressException = class extends DynamoDBServiceException {
  constructor(opts) {
    super({
      name: "TransactionInProgressException",
      $fault: "client",
      ...opts
    });
    this.name = "TransactionInProgressException";
    this.$fault = "client";
    Object.setPrototypeOf(this, TransactionInProgressException.prototype);
    this.Message = opts.Message;
  }
};
var Select;
(function(Select2) {
  Select2["ALL_ATTRIBUTES"] = "ALL_ATTRIBUTES";
  Select2["ALL_PROJECTED_ATTRIBUTES"] = "ALL_PROJECTED_ATTRIBUTES";
  Select2["COUNT"] = "COUNT";
  Select2["SPECIFIC_ATTRIBUTES"] = "SPECIFIC_ATTRIBUTES";
})(Select || (Select = {}));
var AttributeValue;
(function(AttributeValue2) {
  AttributeValue2.visit = (value, visitor) => {
    if (value.S !== void 0)
      return visitor.S(value.S);
    if (value.N !== void 0)
      return visitor.N(value.N);
    if (value.B !== void 0)
      return visitor.B(value.B);
    if (value.SS !== void 0)
      return visitor.SS(value.SS);
    if (value.NS !== void 0)
      return visitor.NS(value.NS);
    if (value.BS !== void 0)
      return visitor.BS(value.BS);
    if (value.M !== void 0)
      return visitor.M(value.M);
    if (value.L !== void 0)
      return visitor.L(value.L);
    if (value.NULL !== void 0)
      return visitor.NULL(value.NULL);
    if (value.BOOL !== void 0)
      return visitor.BOOL(value.BOOL);
    return visitor._(value.$unknown[0], value.$unknown[1]);
  };
})(AttributeValue || (AttributeValue = {}));
var TransactionCanceledException = class extends DynamoDBServiceException {
  constructor(opts) {
    super({
      name: "TransactionCanceledException",
      $fault: "client",
      ...opts
    });
    this.name = "TransactionCanceledException";
    this.$fault = "client";
    Object.setPrototypeOf(this, TransactionCanceledException.prototype);
    this.Message = opts.Message;
    this.CancellationReasons = opts.CancellationReasons;
  }
};
var CreateTableInputFilterSensitiveLog = (obj) => ({
  ...obj
});
var CreateTableOutputFilterSensitiveLog = (obj) => ({
  ...obj
});
var DescribeEndpointsRequestFilterSensitiveLog = (obj) => ({
  ...obj
});
var DescribeEndpointsResponseFilterSensitiveLog = (obj) => ({
  ...obj
});
var ListTablesInputFilterSensitiveLog = (obj) => ({
  ...obj
});
var ListTablesOutputFilterSensitiveLog = (obj) => ({
  ...obj
});
var AttributeValueFilterSensitiveLog = (obj) => {
  if (obj.S !== void 0)
    return { S: obj.S };
  if (obj.N !== void 0)
    return { N: obj.N };
  if (obj.B !== void 0)
    return { B: obj.B };
  if (obj.SS !== void 0)
    return { SS: obj.SS };
  if (obj.NS !== void 0)
    return { NS: obj.NS };
  if (obj.BS !== void 0)
    return { BS: obj.BS };
  if (obj.M !== void 0)
    return {
      M: Object.entries(obj.M).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
    };
  if (obj.L !== void 0)
    return { L: obj.L.map((item) => AttributeValueFilterSensitiveLog(item)) };
  if (obj.NULL !== void 0)
    return { NULL: obj.NULL };
  if (obj.BOOL !== void 0)
    return { BOOL: obj.BOOL };
  if (obj.$unknown !== void 0)
    return { [obj.$unknown[0]]: "UNKNOWN" };
};
var AttributeValueUpdateFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Value && { Value: AttributeValueFilterSensitiveLog(obj.Value) }
});
var ConditionFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.AttributeValueList && {
    AttributeValueList: obj.AttributeValueList.map((item) => AttributeValueFilterSensitiveLog(item))
  }
});
var DeleteRequestFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Key && {
    Key: Object.entries(obj.Key).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  }
});
var GetFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Key && {
    Key: Object.entries(obj.Key).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  }
});
var GetItemInputFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Key && {
    Key: Object.entries(obj.Key).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  }
});
var GetItemOutputFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Item && {
    Item: Object.entries(obj.Item).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  }
});
var ItemCollectionMetricsFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.ItemCollectionKey && {
    ItemCollectionKey: Object.entries(obj.ItemCollectionKey).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  }
});
var ItemResponseFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Item && {
    Item: Object.entries(obj.Item).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  }
});
var PutRequestFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Item && {
    Item: Object.entries(obj.Item).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  }
});
var KeysAndAttributesFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Keys && {
    Keys: obj.Keys.map((item) => Object.entries(item).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {}))
  }
});
var TransactGetItemFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Get && { Get: GetFilterSensitiveLog(obj.Get) }
});
var TransactGetItemsOutputFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Responses && { Responses: obj.Responses.map((item) => ItemResponseFilterSensitiveLog(item)) }
});
var BatchGetItemInputFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.RequestItems && {
    RequestItems: Object.entries(obj.RequestItems).reduce((acc, [key, value]) => (acc[key] = KeysAndAttributesFilterSensitiveLog(value), acc), {})
  }
});
var ExpectedAttributeValueFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Value && { Value: AttributeValueFilterSensitiveLog(obj.Value) },
  ...obj.AttributeValueList && {
    AttributeValueList: obj.AttributeValueList.map((item) => AttributeValueFilterSensitiveLog(item))
  }
});
var TransactGetItemsInputFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.TransactItems && { TransactItems: obj.TransactItems.map((item) => TransactGetItemFilterSensitiveLog(item)) }
});
var TransactWriteItemsOutputFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.ItemCollectionMetrics && {
    ItemCollectionMetrics: Object.entries(obj.ItemCollectionMetrics).reduce((acc, [key, value]) => (acc[key] = value.map((item) => ItemCollectionMetricsFilterSensitiveLog(item)), acc), {})
  }
});
var ConditionCheckFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Key && {
    Key: Object.entries(obj.Key).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  },
  ...obj.ExpressionAttributeValues && {
    ExpressionAttributeValues: Object.entries(obj.ExpressionAttributeValues).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  }
});
var DeleteFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Key && {
    Key: Object.entries(obj.Key).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  },
  ...obj.ExpressionAttributeValues && {
    ExpressionAttributeValues: Object.entries(obj.ExpressionAttributeValues).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  }
});
var PutFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Item && {
    Item: Object.entries(obj.Item).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  },
  ...obj.ExpressionAttributeValues && {
    ExpressionAttributeValues: Object.entries(obj.ExpressionAttributeValues).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  }
});
var UpdateFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Key && {
    Key: Object.entries(obj.Key).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  },
  ...obj.ExpressionAttributeValues && {
    ExpressionAttributeValues: Object.entries(obj.ExpressionAttributeValues).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  }
});
var DeleteItemOutputFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Attributes && {
    Attributes: Object.entries(obj.Attributes).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  },
  ...obj.ItemCollectionMetrics && {
    ItemCollectionMetrics: ItemCollectionMetricsFilterSensitiveLog(obj.ItemCollectionMetrics)
  }
});
var PutItemOutputFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Attributes && {
    Attributes: Object.entries(obj.Attributes).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  },
  ...obj.ItemCollectionMetrics && {
    ItemCollectionMetrics: ItemCollectionMetricsFilterSensitiveLog(obj.ItemCollectionMetrics)
  }
});
var QueryOutputFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Items && {
    Items: obj.Items.map((item) => Object.entries(item).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {}))
  },
  ...obj.LastEvaluatedKey && {
    LastEvaluatedKey: Object.entries(obj.LastEvaluatedKey).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  }
});
var ScanOutputFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Items && {
    Items: obj.Items.map((item) => Object.entries(item).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {}))
  },
  ...obj.LastEvaluatedKey && {
    LastEvaluatedKey: Object.entries(obj.LastEvaluatedKey).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  }
});
var UpdateItemOutputFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Attributes && {
    Attributes: Object.entries(obj.Attributes).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  },
  ...obj.ItemCollectionMetrics && {
    ItemCollectionMetrics: ItemCollectionMetricsFilterSensitiveLog(obj.ItemCollectionMetrics)
  }
});
var WriteRequestFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.PutRequest && { PutRequest: PutRequestFilterSensitiveLog(obj.PutRequest) },
  ...obj.DeleteRequest && { DeleteRequest: DeleteRequestFilterSensitiveLog(obj.DeleteRequest) }
});
var BatchGetItemOutputFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Responses && {
    Responses: Object.entries(obj.Responses).reduce((acc, [key, value]) => (acc[key] = value.map((item) => Object.entries(item).reduce((acc2, [key2, value2]) => (acc2[key2] = AttributeValueFilterSensitiveLog(value2), acc2), {})), acc), {})
  },
  ...obj.UnprocessedKeys && {
    UnprocessedKeys: Object.entries(obj.UnprocessedKeys).reduce((acc, [key, value]) => (acc[key] = KeysAndAttributesFilterSensitiveLog(value), acc), {})
  }
});
var ScanInputFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.ScanFilter && {
    ScanFilter: Object.entries(obj.ScanFilter).reduce((acc, [key, value]) => (acc[key] = ConditionFilterSensitiveLog(value), acc), {})
  },
  ...obj.ExclusiveStartKey && {
    ExclusiveStartKey: Object.entries(obj.ExclusiveStartKey).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  },
  ...obj.ExpressionAttributeValues && {
    ExpressionAttributeValues: Object.entries(obj.ExpressionAttributeValues).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  }
});
var BatchWriteItemInputFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.RequestItems && {
    RequestItems: Object.entries(obj.RequestItems).reduce((acc, [key, value]) => (acc[key] = value.map((item) => WriteRequestFilterSensitiveLog(item)), acc), {})
  }
});
var DeleteItemInputFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Key && {
    Key: Object.entries(obj.Key).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  },
  ...obj.Expected && {
    Expected: Object.entries(obj.Expected).reduce((acc, [key, value]) => (acc[key] = ExpectedAttributeValueFilterSensitiveLog(value), acc), {})
  },
  ...obj.ExpressionAttributeValues && {
    ExpressionAttributeValues: Object.entries(obj.ExpressionAttributeValues).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  }
});
var PutItemInputFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Item && {
    Item: Object.entries(obj.Item).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  },
  ...obj.Expected && {
    Expected: Object.entries(obj.Expected).reduce((acc, [key, value]) => (acc[key] = ExpectedAttributeValueFilterSensitiveLog(value), acc), {})
  },
  ...obj.ExpressionAttributeValues && {
    ExpressionAttributeValues: Object.entries(obj.ExpressionAttributeValues).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  }
});
var QueryInputFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.KeyConditions && {
    KeyConditions: Object.entries(obj.KeyConditions).reduce((acc, [key, value]) => (acc[key] = ConditionFilterSensitiveLog(value), acc), {})
  },
  ...obj.QueryFilter && {
    QueryFilter: Object.entries(obj.QueryFilter).reduce((acc, [key, value]) => (acc[key] = ConditionFilterSensitiveLog(value), acc), {})
  },
  ...obj.ExclusiveStartKey && {
    ExclusiveStartKey: Object.entries(obj.ExclusiveStartKey).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  },
  ...obj.ExpressionAttributeValues && {
    ExpressionAttributeValues: Object.entries(obj.ExpressionAttributeValues).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  }
});
var BatchWriteItemOutputFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.UnprocessedItems && {
    UnprocessedItems: Object.entries(obj.UnprocessedItems).reduce((acc, [key, value]) => (acc[key] = value.map((item) => WriteRequestFilterSensitiveLog(item)), acc), {})
  },
  ...obj.ItemCollectionMetrics && {
    ItemCollectionMetrics: Object.entries(obj.ItemCollectionMetrics).reduce((acc, [key, value]) => (acc[key] = value.map((item) => ItemCollectionMetricsFilterSensitiveLog(item)), acc), {})
  }
});
var UpdateItemInputFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Key && {
    Key: Object.entries(obj.Key).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  },
  ...obj.AttributeUpdates && {
    AttributeUpdates: Object.entries(obj.AttributeUpdates).reduce((acc, [key, value]) => (acc[key] = AttributeValueUpdateFilterSensitiveLog(value), acc), {})
  },
  ...obj.Expected && {
    Expected: Object.entries(obj.Expected).reduce((acc, [key, value]) => (acc[key] = ExpectedAttributeValueFilterSensitiveLog(value), acc), {})
  },
  ...obj.ExpressionAttributeValues && {
    ExpressionAttributeValues: Object.entries(obj.ExpressionAttributeValues).reduce((acc, [key, value]) => (acc[key] = AttributeValueFilterSensitiveLog(value), acc), {})
  }
});
var TransactWriteItemFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.ConditionCheck && { ConditionCheck: ConditionCheckFilterSensitiveLog(obj.ConditionCheck) },
  ...obj.Put && { Put: PutFilterSensitiveLog(obj.Put) },
  ...obj.Delete && { Delete: DeleteFilterSensitiveLog(obj.Delete) },
  ...obj.Update && { Update: UpdateFilterSensitiveLog(obj.Update) }
});
var TransactWriteItemsInputFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.TransactItems && {
    TransactItems: obj.TransactItems.map((item) => TransactWriteItemFilterSensitiveLog(item))
  }
});

// ../../node_modules/@aws-sdk/protocol-http/dist-es/httpRequest.js
var HttpRequest = class {
  constructor(options) {
    this.method = options.method || "GET";
    this.hostname = options.hostname || "localhost";
    this.port = options.port;
    this.query = options.query || {};
    this.headers = options.headers || {};
    this.body = options.body;
    this.protocol = options.protocol ? options.protocol.slice(-1) !== ":" ? `${options.protocol}:` : options.protocol : "https:";
    this.path = options.path ? options.path.charAt(0) !== "/" ? `/${options.path}` : options.path : "/";
  }
  static isInstance(request2) {
    if (!request2)
      return false;
    const req = request2;
    return "method" in req && "protocol" in req && "hostname" in req && "path" in req && typeof req["query"] === "object" && typeof req["headers"] === "object";
  }
  clone() {
    const cloned = new HttpRequest({
      ...this,
      headers: { ...this.headers }
    });
    if (cloned.query)
      cloned.query = cloneQuery(cloned.query);
    return cloned;
  }
};
function cloneQuery(query) {
  return Object.keys(query).reduce((carry, paramName) => {
    const param = query[paramName];
    return {
      ...carry,
      [paramName]: Array.isArray(param) ? [...param] : param
    };
  }, {});
}

// ../../node_modules/@aws-sdk/protocol-http/dist-es/httpResponse.js
var HttpResponse = class {
  constructor(options) {
    this.statusCode = options.statusCode;
    this.headers = options.headers || {};
    this.body = options.body;
  }
  static isInstance(response) {
    if (!response)
      return false;
    const resp = response;
    return typeof resp.statusCode === "number" && typeof resp.headers === "object";
  }
};

// ../../node_modules/@aws-sdk/client-dynamodb/node_modules/uuid/wrapper.mjs
var import_dist = __toESM(require_dist(), 1);
var v1 = import_dist.default.v1;
var v3 = import_dist.default.v3;
var v4 = import_dist.default.v4;
var v5 = import_dist.default.v5;
var NIL = import_dist.default.NIL;
var version = import_dist.default.version;
var validate = import_dist.default.validate;
var stringify = import_dist.default.stringify;
var parse = import_dist.default.parse;

// ../../node_modules/@aws-sdk/client-dynamodb/dist-es/protocols/Aws_json1_0.js
var serializeAws_json1_0BatchGetItemCommand = async (input, context) => {
  const headers = {
    "content-type": "application/x-amz-json-1.0",
    "x-amz-target": "DynamoDB_20120810.BatchGetItem"
  };
  let body;
  body = JSON.stringify(serializeAws_json1_0BatchGetItemInput(input, context));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
};
var serializeAws_json1_0BatchWriteItemCommand = async (input, context) => {
  const headers = {
    "content-type": "application/x-amz-json-1.0",
    "x-amz-target": "DynamoDB_20120810.BatchWriteItem"
  };
  let body;
  body = JSON.stringify(serializeAws_json1_0BatchWriteItemInput(input, context));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
};
var serializeAws_json1_0CreateTableCommand = async (input, context) => {
  const headers = {
    "content-type": "application/x-amz-json-1.0",
    "x-amz-target": "DynamoDB_20120810.CreateTable"
  };
  let body;
  body = JSON.stringify(serializeAws_json1_0CreateTableInput(input, context));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
};
var serializeAws_json1_0DeleteItemCommand = async (input, context) => {
  const headers = {
    "content-type": "application/x-amz-json-1.0",
    "x-amz-target": "DynamoDB_20120810.DeleteItem"
  };
  let body;
  body = JSON.stringify(serializeAws_json1_0DeleteItemInput(input, context));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
};
var serializeAws_json1_0DescribeEndpointsCommand = async (input, context) => {
  const headers = {
    "content-type": "application/x-amz-json-1.0",
    "x-amz-target": "DynamoDB_20120810.DescribeEndpoints"
  };
  let body;
  body = JSON.stringify(serializeAws_json1_0DescribeEndpointsRequest(input, context));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
};
var serializeAws_json1_0GetItemCommand = async (input, context) => {
  const headers = {
    "content-type": "application/x-amz-json-1.0",
    "x-amz-target": "DynamoDB_20120810.GetItem"
  };
  let body;
  body = JSON.stringify(serializeAws_json1_0GetItemInput(input, context));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
};
var serializeAws_json1_0ListTablesCommand = async (input, context) => {
  const headers = {
    "content-type": "application/x-amz-json-1.0",
    "x-amz-target": "DynamoDB_20120810.ListTables"
  };
  let body;
  body = JSON.stringify(serializeAws_json1_0ListTablesInput(input, context));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
};
var serializeAws_json1_0PutItemCommand = async (input, context) => {
  const headers = {
    "content-type": "application/x-amz-json-1.0",
    "x-amz-target": "DynamoDB_20120810.PutItem"
  };
  let body;
  body = JSON.stringify(serializeAws_json1_0PutItemInput(input, context));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
};
var serializeAws_json1_0QueryCommand = async (input, context) => {
  const headers = {
    "content-type": "application/x-amz-json-1.0",
    "x-amz-target": "DynamoDB_20120810.Query"
  };
  let body;
  body = JSON.stringify(serializeAws_json1_0QueryInput(input, context));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
};
var serializeAws_json1_0ScanCommand = async (input, context) => {
  const headers = {
    "content-type": "application/x-amz-json-1.0",
    "x-amz-target": "DynamoDB_20120810.Scan"
  };
  let body;
  body = JSON.stringify(serializeAws_json1_0ScanInput(input, context));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
};
var serializeAws_json1_0TransactGetItemsCommand = async (input, context) => {
  const headers = {
    "content-type": "application/x-amz-json-1.0",
    "x-amz-target": "DynamoDB_20120810.TransactGetItems"
  };
  let body;
  body = JSON.stringify(serializeAws_json1_0TransactGetItemsInput(input, context));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
};
var serializeAws_json1_0TransactWriteItemsCommand = async (input, context) => {
  const headers = {
    "content-type": "application/x-amz-json-1.0",
    "x-amz-target": "DynamoDB_20120810.TransactWriteItems"
  };
  let body;
  body = JSON.stringify(serializeAws_json1_0TransactWriteItemsInput(input, context));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
};
var serializeAws_json1_0UpdateItemCommand = async (input, context) => {
  const headers = {
    "content-type": "application/x-amz-json-1.0",
    "x-amz-target": "DynamoDB_20120810.UpdateItem"
  };
  let body;
  body = JSON.stringify(serializeAws_json1_0UpdateItemInput(input, context));
  return buildHttpRpcRequest(context, headers, "/", void 0, body);
};
var deserializeAws_json1_0BatchGetItemCommand = async (output, context) => {
  if (output.statusCode >= 300) {
    return deserializeAws_json1_0BatchGetItemCommandError(output, context);
  }
  const data = await parseBody(output.body, context);
  let contents = {};
  contents = deserializeAws_json1_0BatchGetItemOutput(data, context);
  const response = {
    $metadata: deserializeMetadata2(output),
    ...contents
  };
  return Promise.resolve(response);
};
var deserializeAws_json1_0BatchGetItemCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody(output.body, context)
  };
  const errorCode = loadRestJsonErrorCode(output, parsedOutput.body);
  switch (errorCode) {
    case "InternalServerError":
    case "com.amazonaws.dynamodb#InternalServerError":
      throw await deserializeAws_json1_0InternalServerErrorResponse(parsedOutput, context);
    case "InvalidEndpointException":
    case "com.amazonaws.dynamodb#InvalidEndpointException":
      throw await deserializeAws_json1_0InvalidEndpointExceptionResponse(parsedOutput, context);
    case "ProvisionedThroughputExceededException":
    case "com.amazonaws.dynamodb#ProvisionedThroughputExceededException":
      throw await deserializeAws_json1_0ProvisionedThroughputExceededExceptionResponse(parsedOutput, context);
    case "RequestLimitExceeded":
    case "com.amazonaws.dynamodb#RequestLimitExceeded":
      throw await deserializeAws_json1_0RequestLimitExceededResponse(parsedOutput, context);
    case "ResourceNotFoundException":
    case "com.amazonaws.dynamodb#ResourceNotFoundException":
      throw await deserializeAws_json1_0ResourceNotFoundExceptionResponse(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody,
        exceptionCtor: DynamoDBServiceException,
        errorCode
      });
  }
};
var deserializeAws_json1_0BatchWriteItemCommand = async (output, context) => {
  if (output.statusCode >= 300) {
    return deserializeAws_json1_0BatchWriteItemCommandError(output, context);
  }
  const data = await parseBody(output.body, context);
  let contents = {};
  contents = deserializeAws_json1_0BatchWriteItemOutput(data, context);
  const response = {
    $metadata: deserializeMetadata2(output),
    ...contents
  };
  return Promise.resolve(response);
};
var deserializeAws_json1_0BatchWriteItemCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody(output.body, context)
  };
  const errorCode = loadRestJsonErrorCode(output, parsedOutput.body);
  switch (errorCode) {
    case "InternalServerError":
    case "com.amazonaws.dynamodb#InternalServerError":
      throw await deserializeAws_json1_0InternalServerErrorResponse(parsedOutput, context);
    case "InvalidEndpointException":
    case "com.amazonaws.dynamodb#InvalidEndpointException":
      throw await deserializeAws_json1_0InvalidEndpointExceptionResponse(parsedOutput, context);
    case "ItemCollectionSizeLimitExceededException":
    case "com.amazonaws.dynamodb#ItemCollectionSizeLimitExceededException":
      throw await deserializeAws_json1_0ItemCollectionSizeLimitExceededExceptionResponse(parsedOutput, context);
    case "ProvisionedThroughputExceededException":
    case "com.amazonaws.dynamodb#ProvisionedThroughputExceededException":
      throw await deserializeAws_json1_0ProvisionedThroughputExceededExceptionResponse(parsedOutput, context);
    case "RequestLimitExceeded":
    case "com.amazonaws.dynamodb#RequestLimitExceeded":
      throw await deserializeAws_json1_0RequestLimitExceededResponse(parsedOutput, context);
    case "ResourceNotFoundException":
    case "com.amazonaws.dynamodb#ResourceNotFoundException":
      throw await deserializeAws_json1_0ResourceNotFoundExceptionResponse(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody,
        exceptionCtor: DynamoDBServiceException,
        errorCode
      });
  }
};
var deserializeAws_json1_0CreateTableCommand = async (output, context) => {
  if (output.statusCode >= 300) {
    return deserializeAws_json1_0CreateTableCommandError(output, context);
  }
  const data = await parseBody(output.body, context);
  let contents = {};
  contents = deserializeAws_json1_0CreateTableOutput(data, context);
  const response = {
    $metadata: deserializeMetadata2(output),
    ...contents
  };
  return Promise.resolve(response);
};
var deserializeAws_json1_0CreateTableCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody(output.body, context)
  };
  const errorCode = loadRestJsonErrorCode(output, parsedOutput.body);
  switch (errorCode) {
    case "InternalServerError":
    case "com.amazonaws.dynamodb#InternalServerError":
      throw await deserializeAws_json1_0InternalServerErrorResponse(parsedOutput, context);
    case "InvalidEndpointException":
    case "com.amazonaws.dynamodb#InvalidEndpointException":
      throw await deserializeAws_json1_0InvalidEndpointExceptionResponse(parsedOutput, context);
    case "LimitExceededException":
    case "com.amazonaws.dynamodb#LimitExceededException":
      throw await deserializeAws_json1_0LimitExceededExceptionResponse(parsedOutput, context);
    case "ResourceInUseException":
    case "com.amazonaws.dynamodb#ResourceInUseException":
      throw await deserializeAws_json1_0ResourceInUseExceptionResponse(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody,
        exceptionCtor: DynamoDBServiceException,
        errorCode
      });
  }
};
var deserializeAws_json1_0DeleteItemCommand = async (output, context) => {
  if (output.statusCode >= 300) {
    return deserializeAws_json1_0DeleteItemCommandError(output, context);
  }
  const data = await parseBody(output.body, context);
  let contents = {};
  contents = deserializeAws_json1_0DeleteItemOutput(data, context);
  const response = {
    $metadata: deserializeMetadata2(output),
    ...contents
  };
  return Promise.resolve(response);
};
var deserializeAws_json1_0DeleteItemCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody(output.body, context)
  };
  const errorCode = loadRestJsonErrorCode(output, parsedOutput.body);
  switch (errorCode) {
    case "ConditionalCheckFailedException":
    case "com.amazonaws.dynamodb#ConditionalCheckFailedException":
      throw await deserializeAws_json1_0ConditionalCheckFailedExceptionResponse(parsedOutput, context);
    case "InternalServerError":
    case "com.amazonaws.dynamodb#InternalServerError":
      throw await deserializeAws_json1_0InternalServerErrorResponse(parsedOutput, context);
    case "InvalidEndpointException":
    case "com.amazonaws.dynamodb#InvalidEndpointException":
      throw await deserializeAws_json1_0InvalidEndpointExceptionResponse(parsedOutput, context);
    case "ItemCollectionSizeLimitExceededException":
    case "com.amazonaws.dynamodb#ItemCollectionSizeLimitExceededException":
      throw await deserializeAws_json1_0ItemCollectionSizeLimitExceededExceptionResponse(parsedOutput, context);
    case "ProvisionedThroughputExceededException":
    case "com.amazonaws.dynamodb#ProvisionedThroughputExceededException":
      throw await deserializeAws_json1_0ProvisionedThroughputExceededExceptionResponse(parsedOutput, context);
    case "RequestLimitExceeded":
    case "com.amazonaws.dynamodb#RequestLimitExceeded":
      throw await deserializeAws_json1_0RequestLimitExceededResponse(parsedOutput, context);
    case "ResourceNotFoundException":
    case "com.amazonaws.dynamodb#ResourceNotFoundException":
      throw await deserializeAws_json1_0ResourceNotFoundExceptionResponse(parsedOutput, context);
    case "TransactionConflictException":
    case "com.amazonaws.dynamodb#TransactionConflictException":
      throw await deserializeAws_json1_0TransactionConflictExceptionResponse(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody,
        exceptionCtor: DynamoDBServiceException,
        errorCode
      });
  }
};
var deserializeAws_json1_0DescribeEndpointsCommand = async (output, context) => {
  if (output.statusCode >= 300) {
    return deserializeAws_json1_0DescribeEndpointsCommandError(output, context);
  }
  const data = await parseBody(output.body, context);
  let contents = {};
  contents = deserializeAws_json1_0DescribeEndpointsResponse(data, context);
  const response = {
    $metadata: deserializeMetadata2(output),
    ...contents
  };
  return Promise.resolve(response);
};
var deserializeAws_json1_0DescribeEndpointsCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody(output.body, context)
  };
  const errorCode = loadRestJsonErrorCode(output, parsedOutput.body);
  const parsedBody = parsedOutput.body;
  throwDefaultError({
    output,
    parsedBody,
    exceptionCtor: DynamoDBServiceException,
    errorCode
  });
};
var deserializeAws_json1_0GetItemCommand = async (output, context) => {
  if (output.statusCode >= 300) {
    return deserializeAws_json1_0GetItemCommandError(output, context);
  }
  const data = await parseBody(output.body, context);
  let contents = {};
  contents = deserializeAws_json1_0GetItemOutput(data, context);
  const response = {
    $metadata: deserializeMetadata2(output),
    ...contents
  };
  return Promise.resolve(response);
};
var deserializeAws_json1_0GetItemCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody(output.body, context)
  };
  const errorCode = loadRestJsonErrorCode(output, parsedOutput.body);
  switch (errorCode) {
    case "InternalServerError":
    case "com.amazonaws.dynamodb#InternalServerError":
      throw await deserializeAws_json1_0InternalServerErrorResponse(parsedOutput, context);
    case "InvalidEndpointException":
    case "com.amazonaws.dynamodb#InvalidEndpointException":
      throw await deserializeAws_json1_0InvalidEndpointExceptionResponse(parsedOutput, context);
    case "ProvisionedThroughputExceededException":
    case "com.amazonaws.dynamodb#ProvisionedThroughputExceededException":
      throw await deserializeAws_json1_0ProvisionedThroughputExceededExceptionResponse(parsedOutput, context);
    case "RequestLimitExceeded":
    case "com.amazonaws.dynamodb#RequestLimitExceeded":
      throw await deserializeAws_json1_0RequestLimitExceededResponse(parsedOutput, context);
    case "ResourceNotFoundException":
    case "com.amazonaws.dynamodb#ResourceNotFoundException":
      throw await deserializeAws_json1_0ResourceNotFoundExceptionResponse(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody,
        exceptionCtor: DynamoDBServiceException,
        errorCode
      });
  }
};
var deserializeAws_json1_0ListTablesCommand = async (output, context) => {
  if (output.statusCode >= 300) {
    return deserializeAws_json1_0ListTablesCommandError(output, context);
  }
  const data = await parseBody(output.body, context);
  let contents = {};
  contents = deserializeAws_json1_0ListTablesOutput(data, context);
  const response = {
    $metadata: deserializeMetadata2(output),
    ...contents
  };
  return Promise.resolve(response);
};
var deserializeAws_json1_0ListTablesCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody(output.body, context)
  };
  const errorCode = loadRestJsonErrorCode(output, parsedOutput.body);
  switch (errorCode) {
    case "InternalServerError":
    case "com.amazonaws.dynamodb#InternalServerError":
      throw await deserializeAws_json1_0InternalServerErrorResponse(parsedOutput, context);
    case "InvalidEndpointException":
    case "com.amazonaws.dynamodb#InvalidEndpointException":
      throw await deserializeAws_json1_0InvalidEndpointExceptionResponse(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody,
        exceptionCtor: DynamoDBServiceException,
        errorCode
      });
  }
};
var deserializeAws_json1_0PutItemCommand = async (output, context) => {
  if (output.statusCode >= 300) {
    return deserializeAws_json1_0PutItemCommandError(output, context);
  }
  const data = await parseBody(output.body, context);
  let contents = {};
  contents = deserializeAws_json1_0PutItemOutput(data, context);
  const response = {
    $metadata: deserializeMetadata2(output),
    ...contents
  };
  return Promise.resolve(response);
};
var deserializeAws_json1_0PutItemCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody(output.body, context)
  };
  const errorCode = loadRestJsonErrorCode(output, parsedOutput.body);
  switch (errorCode) {
    case "ConditionalCheckFailedException":
    case "com.amazonaws.dynamodb#ConditionalCheckFailedException":
      throw await deserializeAws_json1_0ConditionalCheckFailedExceptionResponse(parsedOutput, context);
    case "InternalServerError":
    case "com.amazonaws.dynamodb#InternalServerError":
      throw await deserializeAws_json1_0InternalServerErrorResponse(parsedOutput, context);
    case "InvalidEndpointException":
    case "com.amazonaws.dynamodb#InvalidEndpointException":
      throw await deserializeAws_json1_0InvalidEndpointExceptionResponse(parsedOutput, context);
    case "ItemCollectionSizeLimitExceededException":
    case "com.amazonaws.dynamodb#ItemCollectionSizeLimitExceededException":
      throw await deserializeAws_json1_0ItemCollectionSizeLimitExceededExceptionResponse(parsedOutput, context);
    case "ProvisionedThroughputExceededException":
    case "com.amazonaws.dynamodb#ProvisionedThroughputExceededException":
      throw await deserializeAws_json1_0ProvisionedThroughputExceededExceptionResponse(parsedOutput, context);
    case "RequestLimitExceeded":
    case "com.amazonaws.dynamodb#RequestLimitExceeded":
      throw await deserializeAws_json1_0RequestLimitExceededResponse(parsedOutput, context);
    case "ResourceNotFoundException":
    case "com.amazonaws.dynamodb#ResourceNotFoundException":
      throw await deserializeAws_json1_0ResourceNotFoundExceptionResponse(parsedOutput, context);
    case "TransactionConflictException":
    case "com.amazonaws.dynamodb#TransactionConflictException":
      throw await deserializeAws_json1_0TransactionConflictExceptionResponse(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody,
        exceptionCtor: DynamoDBServiceException,
        errorCode
      });
  }
};
var deserializeAws_json1_0QueryCommand = async (output, context) => {
  if (output.statusCode >= 300) {
    return deserializeAws_json1_0QueryCommandError(output, context);
  }
  const data = await parseBody(output.body, context);
  let contents = {};
  contents = deserializeAws_json1_0QueryOutput(data, context);
  const response = {
    $metadata: deserializeMetadata2(output),
    ...contents
  };
  return Promise.resolve(response);
};
var deserializeAws_json1_0QueryCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody(output.body, context)
  };
  const errorCode = loadRestJsonErrorCode(output, parsedOutput.body);
  switch (errorCode) {
    case "InternalServerError":
    case "com.amazonaws.dynamodb#InternalServerError":
      throw await deserializeAws_json1_0InternalServerErrorResponse(parsedOutput, context);
    case "InvalidEndpointException":
    case "com.amazonaws.dynamodb#InvalidEndpointException":
      throw await deserializeAws_json1_0InvalidEndpointExceptionResponse(parsedOutput, context);
    case "ProvisionedThroughputExceededException":
    case "com.amazonaws.dynamodb#ProvisionedThroughputExceededException":
      throw await deserializeAws_json1_0ProvisionedThroughputExceededExceptionResponse(parsedOutput, context);
    case "RequestLimitExceeded":
    case "com.amazonaws.dynamodb#RequestLimitExceeded":
      throw await deserializeAws_json1_0RequestLimitExceededResponse(parsedOutput, context);
    case "ResourceNotFoundException":
    case "com.amazonaws.dynamodb#ResourceNotFoundException":
      throw await deserializeAws_json1_0ResourceNotFoundExceptionResponse(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody,
        exceptionCtor: DynamoDBServiceException,
        errorCode
      });
  }
};
var deserializeAws_json1_0ScanCommand = async (output, context) => {
  if (output.statusCode >= 300) {
    return deserializeAws_json1_0ScanCommandError(output, context);
  }
  const data = await parseBody(output.body, context);
  let contents = {};
  contents = deserializeAws_json1_0ScanOutput(data, context);
  const response = {
    $metadata: deserializeMetadata2(output),
    ...contents
  };
  return Promise.resolve(response);
};
var deserializeAws_json1_0ScanCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody(output.body, context)
  };
  const errorCode = loadRestJsonErrorCode(output, parsedOutput.body);
  switch (errorCode) {
    case "InternalServerError":
    case "com.amazonaws.dynamodb#InternalServerError":
      throw await deserializeAws_json1_0InternalServerErrorResponse(parsedOutput, context);
    case "InvalidEndpointException":
    case "com.amazonaws.dynamodb#InvalidEndpointException":
      throw await deserializeAws_json1_0InvalidEndpointExceptionResponse(parsedOutput, context);
    case "ProvisionedThroughputExceededException":
    case "com.amazonaws.dynamodb#ProvisionedThroughputExceededException":
      throw await deserializeAws_json1_0ProvisionedThroughputExceededExceptionResponse(parsedOutput, context);
    case "RequestLimitExceeded":
    case "com.amazonaws.dynamodb#RequestLimitExceeded":
      throw await deserializeAws_json1_0RequestLimitExceededResponse(parsedOutput, context);
    case "ResourceNotFoundException":
    case "com.amazonaws.dynamodb#ResourceNotFoundException":
      throw await deserializeAws_json1_0ResourceNotFoundExceptionResponse(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody,
        exceptionCtor: DynamoDBServiceException,
        errorCode
      });
  }
};
var deserializeAws_json1_0TransactGetItemsCommand = async (output, context) => {
  if (output.statusCode >= 300) {
    return deserializeAws_json1_0TransactGetItemsCommandError(output, context);
  }
  const data = await parseBody(output.body, context);
  let contents = {};
  contents = deserializeAws_json1_0TransactGetItemsOutput(data, context);
  const response = {
    $metadata: deserializeMetadata2(output),
    ...contents
  };
  return Promise.resolve(response);
};
var deserializeAws_json1_0TransactGetItemsCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody(output.body, context)
  };
  const errorCode = loadRestJsonErrorCode(output, parsedOutput.body);
  switch (errorCode) {
    case "InternalServerError":
    case "com.amazonaws.dynamodb#InternalServerError":
      throw await deserializeAws_json1_0InternalServerErrorResponse(parsedOutput, context);
    case "InvalidEndpointException":
    case "com.amazonaws.dynamodb#InvalidEndpointException":
      throw await deserializeAws_json1_0InvalidEndpointExceptionResponse(parsedOutput, context);
    case "ProvisionedThroughputExceededException":
    case "com.amazonaws.dynamodb#ProvisionedThroughputExceededException":
      throw await deserializeAws_json1_0ProvisionedThroughputExceededExceptionResponse(parsedOutput, context);
    case "RequestLimitExceeded":
    case "com.amazonaws.dynamodb#RequestLimitExceeded":
      throw await deserializeAws_json1_0RequestLimitExceededResponse(parsedOutput, context);
    case "ResourceNotFoundException":
    case "com.amazonaws.dynamodb#ResourceNotFoundException":
      throw await deserializeAws_json1_0ResourceNotFoundExceptionResponse(parsedOutput, context);
    case "TransactionCanceledException":
    case "com.amazonaws.dynamodb#TransactionCanceledException":
      throw await deserializeAws_json1_0TransactionCanceledExceptionResponse(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody,
        exceptionCtor: DynamoDBServiceException,
        errorCode
      });
  }
};
var deserializeAws_json1_0TransactWriteItemsCommand = async (output, context) => {
  if (output.statusCode >= 300) {
    return deserializeAws_json1_0TransactWriteItemsCommandError(output, context);
  }
  const data = await parseBody(output.body, context);
  let contents = {};
  contents = deserializeAws_json1_0TransactWriteItemsOutput(data, context);
  const response = {
    $metadata: deserializeMetadata2(output),
    ...contents
  };
  return Promise.resolve(response);
};
var deserializeAws_json1_0TransactWriteItemsCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody(output.body, context)
  };
  const errorCode = loadRestJsonErrorCode(output, parsedOutput.body);
  switch (errorCode) {
    case "IdempotentParameterMismatchException":
    case "com.amazonaws.dynamodb#IdempotentParameterMismatchException":
      throw await deserializeAws_json1_0IdempotentParameterMismatchExceptionResponse(parsedOutput, context);
    case "InternalServerError":
    case "com.amazonaws.dynamodb#InternalServerError":
      throw await deserializeAws_json1_0InternalServerErrorResponse(parsedOutput, context);
    case "InvalidEndpointException":
    case "com.amazonaws.dynamodb#InvalidEndpointException":
      throw await deserializeAws_json1_0InvalidEndpointExceptionResponse(parsedOutput, context);
    case "ProvisionedThroughputExceededException":
    case "com.amazonaws.dynamodb#ProvisionedThroughputExceededException":
      throw await deserializeAws_json1_0ProvisionedThroughputExceededExceptionResponse(parsedOutput, context);
    case "RequestLimitExceeded":
    case "com.amazonaws.dynamodb#RequestLimitExceeded":
      throw await deserializeAws_json1_0RequestLimitExceededResponse(parsedOutput, context);
    case "ResourceNotFoundException":
    case "com.amazonaws.dynamodb#ResourceNotFoundException":
      throw await deserializeAws_json1_0ResourceNotFoundExceptionResponse(parsedOutput, context);
    case "TransactionCanceledException":
    case "com.amazonaws.dynamodb#TransactionCanceledException":
      throw await deserializeAws_json1_0TransactionCanceledExceptionResponse(parsedOutput, context);
    case "TransactionInProgressException":
    case "com.amazonaws.dynamodb#TransactionInProgressException":
      throw await deserializeAws_json1_0TransactionInProgressExceptionResponse(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody,
        exceptionCtor: DynamoDBServiceException,
        errorCode
      });
  }
};
var deserializeAws_json1_0UpdateItemCommand = async (output, context) => {
  if (output.statusCode >= 300) {
    return deserializeAws_json1_0UpdateItemCommandError(output, context);
  }
  const data = await parseBody(output.body, context);
  let contents = {};
  contents = deserializeAws_json1_0UpdateItemOutput(data, context);
  const response = {
    $metadata: deserializeMetadata2(output),
    ...contents
  };
  return Promise.resolve(response);
};
var deserializeAws_json1_0UpdateItemCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody(output.body, context)
  };
  const errorCode = loadRestJsonErrorCode(output, parsedOutput.body);
  switch (errorCode) {
    case "ConditionalCheckFailedException":
    case "com.amazonaws.dynamodb#ConditionalCheckFailedException":
      throw await deserializeAws_json1_0ConditionalCheckFailedExceptionResponse(parsedOutput, context);
    case "InternalServerError":
    case "com.amazonaws.dynamodb#InternalServerError":
      throw await deserializeAws_json1_0InternalServerErrorResponse(parsedOutput, context);
    case "InvalidEndpointException":
    case "com.amazonaws.dynamodb#InvalidEndpointException":
      throw await deserializeAws_json1_0InvalidEndpointExceptionResponse(parsedOutput, context);
    case "ItemCollectionSizeLimitExceededException":
    case "com.amazonaws.dynamodb#ItemCollectionSizeLimitExceededException":
      throw await deserializeAws_json1_0ItemCollectionSizeLimitExceededExceptionResponse(parsedOutput, context);
    case "ProvisionedThroughputExceededException":
    case "com.amazonaws.dynamodb#ProvisionedThroughputExceededException":
      throw await deserializeAws_json1_0ProvisionedThroughputExceededExceptionResponse(parsedOutput, context);
    case "RequestLimitExceeded":
    case "com.amazonaws.dynamodb#RequestLimitExceeded":
      throw await deserializeAws_json1_0RequestLimitExceededResponse(parsedOutput, context);
    case "ResourceNotFoundException":
    case "com.amazonaws.dynamodb#ResourceNotFoundException":
      throw await deserializeAws_json1_0ResourceNotFoundExceptionResponse(parsedOutput, context);
    case "TransactionConflictException":
    case "com.amazonaws.dynamodb#TransactionConflictException":
      throw await deserializeAws_json1_0TransactionConflictExceptionResponse(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody,
        exceptionCtor: DynamoDBServiceException,
        errorCode
      });
  }
};
var deserializeAws_json1_0ConditionalCheckFailedExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_json1_0ConditionalCheckFailedException(body, context);
  const exception = new ConditionalCheckFailedException({
    $metadata: deserializeMetadata2(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_json1_0IdempotentParameterMismatchExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_json1_0IdempotentParameterMismatchException(body, context);
  const exception = new IdempotentParameterMismatchException({
    $metadata: deserializeMetadata2(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_json1_0InternalServerErrorResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_json1_0InternalServerError(body, context);
  const exception = new InternalServerError({
    $metadata: deserializeMetadata2(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_json1_0InvalidEndpointExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_json1_0InvalidEndpointException(body, context);
  const exception = new InvalidEndpointException({
    $metadata: deserializeMetadata2(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_json1_0ItemCollectionSizeLimitExceededExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_json1_0ItemCollectionSizeLimitExceededException(body, context);
  const exception = new ItemCollectionSizeLimitExceededException({
    $metadata: deserializeMetadata2(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_json1_0LimitExceededExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_json1_0LimitExceededException(body, context);
  const exception = new LimitExceededException({
    $metadata: deserializeMetadata2(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_json1_0ProvisionedThroughputExceededExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_json1_0ProvisionedThroughputExceededException(body, context);
  const exception = new ProvisionedThroughputExceededException({
    $metadata: deserializeMetadata2(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_json1_0RequestLimitExceededResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_json1_0RequestLimitExceeded(body, context);
  const exception = new RequestLimitExceeded({
    $metadata: deserializeMetadata2(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_json1_0ResourceInUseExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_json1_0ResourceInUseException(body, context);
  const exception = new ResourceInUseException({
    $metadata: deserializeMetadata2(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_json1_0ResourceNotFoundExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_json1_0ResourceNotFoundException(body, context);
  const exception = new ResourceNotFoundException({
    $metadata: deserializeMetadata2(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_json1_0TransactionCanceledExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_json1_0TransactionCanceledException(body, context);
  const exception = new TransactionCanceledException({
    $metadata: deserializeMetadata2(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_json1_0TransactionConflictExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_json1_0TransactionConflictException(body, context);
  const exception = new TransactionConflictException({
    $metadata: deserializeMetadata2(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_json1_0TransactionInProgressExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_json1_0TransactionInProgressException(body, context);
  const exception = new TransactionInProgressException({
    $metadata: deserializeMetadata2(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var serializeAws_json1_0AttributeDefinition = (input, context) => {
  return {
    ...input.AttributeName != null && { AttributeName: input.AttributeName },
    ...input.AttributeType != null && { AttributeType: input.AttributeType }
  };
};
var serializeAws_json1_0AttributeDefinitions = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return serializeAws_json1_0AttributeDefinition(entry, context);
  });
};
var serializeAws_json1_0AttributeNameList = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return entry;
  });
};
var serializeAws_json1_0AttributeUpdates = (input, context) => {
  return Object.entries(input).reduce((acc, [key, value]) => {
    if (value === null) {
      return acc;
    }
    acc[key] = serializeAws_json1_0AttributeValueUpdate(value, context);
    return acc;
  }, {});
};
var serializeAws_json1_0AttributeValue = (input, context) => {
  return AttributeValue.visit(input, {
    B: (value) => ({ B: context.base64Encoder(value) }),
    BOOL: (value) => ({ BOOL: value }),
    BS: (value) => ({ BS: serializeAws_json1_0BinarySetAttributeValue(value, context) }),
    L: (value) => ({ L: serializeAws_json1_0ListAttributeValue(value, context) }),
    M: (value) => ({ M: serializeAws_json1_0MapAttributeValue(value, context) }),
    N: (value) => ({ N: value }),
    NS: (value) => ({ NS: serializeAws_json1_0NumberSetAttributeValue(value, context) }),
    NULL: (value) => ({ NULL: value }),
    S: (value) => ({ S: value }),
    SS: (value) => ({ SS: serializeAws_json1_0StringSetAttributeValue(value, context) }),
    _: (name, value) => ({ name: value })
  });
};
var serializeAws_json1_0AttributeValueList = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return serializeAws_json1_0AttributeValue(entry, context);
  });
};
var serializeAws_json1_0AttributeValueUpdate = (input, context) => {
  return {
    ...input.Action != null && { Action: input.Action },
    ...input.Value != null && { Value: serializeAws_json1_0AttributeValue(input.Value, context) }
  };
};
var serializeAws_json1_0BatchGetItemInput = (input, context) => {
  return {
    ...input.RequestItems != null && {
      RequestItems: serializeAws_json1_0BatchGetRequestMap(input.RequestItems, context)
    },
    ...input.ReturnConsumedCapacity != null && { ReturnConsumedCapacity: input.ReturnConsumedCapacity }
  };
};
var serializeAws_json1_0BatchGetRequestMap = (input, context) => {
  return Object.entries(input).reduce((acc, [key, value]) => {
    if (value === null) {
      return acc;
    }
    acc[key] = serializeAws_json1_0KeysAndAttributes(value, context);
    return acc;
  }, {});
};
var serializeAws_json1_0BatchWriteItemInput = (input, context) => {
  return {
    ...input.RequestItems != null && {
      RequestItems: serializeAws_json1_0BatchWriteItemRequestMap(input.RequestItems, context)
    },
    ...input.ReturnConsumedCapacity != null && { ReturnConsumedCapacity: input.ReturnConsumedCapacity },
    ...input.ReturnItemCollectionMetrics != null && {
      ReturnItemCollectionMetrics: input.ReturnItemCollectionMetrics
    }
  };
};
var serializeAws_json1_0BatchWriteItemRequestMap = (input, context) => {
  return Object.entries(input).reduce((acc, [key, value]) => {
    if (value === null) {
      return acc;
    }
    acc[key] = serializeAws_json1_0WriteRequests(value, context);
    return acc;
  }, {});
};
var serializeAws_json1_0BinarySetAttributeValue = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return context.base64Encoder(entry);
  });
};
var serializeAws_json1_0Condition = (input, context) => {
  return {
    ...input.AttributeValueList != null && {
      AttributeValueList: serializeAws_json1_0AttributeValueList(input.AttributeValueList, context)
    },
    ...input.ComparisonOperator != null && { ComparisonOperator: input.ComparisonOperator }
  };
};
var serializeAws_json1_0ConditionCheck = (input, context) => {
  return {
    ...input.ConditionExpression != null && { ConditionExpression: input.ConditionExpression },
    ...input.ExpressionAttributeNames != null && {
      ExpressionAttributeNames: serializeAws_json1_0ExpressionAttributeNameMap(input.ExpressionAttributeNames, context)
    },
    ...input.ExpressionAttributeValues != null && {
      ExpressionAttributeValues: serializeAws_json1_0ExpressionAttributeValueMap(input.ExpressionAttributeValues, context)
    },
    ...input.Key != null && { Key: serializeAws_json1_0Key(input.Key, context) },
    ...input.ReturnValuesOnConditionCheckFailure != null && {
      ReturnValuesOnConditionCheckFailure: input.ReturnValuesOnConditionCheckFailure
    },
    ...input.TableName != null && { TableName: input.TableName }
  };
};
var serializeAws_json1_0CreateTableInput = (input, context) => {
  return {
    ...input.AttributeDefinitions != null && {
      AttributeDefinitions: serializeAws_json1_0AttributeDefinitions(input.AttributeDefinitions, context)
    },
    ...input.BillingMode != null && { BillingMode: input.BillingMode },
    ...input.GlobalSecondaryIndexes != null && {
      GlobalSecondaryIndexes: serializeAws_json1_0GlobalSecondaryIndexList(input.GlobalSecondaryIndexes, context)
    },
    ...input.KeySchema != null && { KeySchema: serializeAws_json1_0KeySchema(input.KeySchema, context) },
    ...input.LocalSecondaryIndexes != null && {
      LocalSecondaryIndexes: serializeAws_json1_0LocalSecondaryIndexList(input.LocalSecondaryIndexes, context)
    },
    ...input.ProvisionedThroughput != null && {
      ProvisionedThroughput: serializeAws_json1_0ProvisionedThroughput(input.ProvisionedThroughput, context)
    },
    ...input.SSESpecification != null && {
      SSESpecification: serializeAws_json1_0SSESpecification(input.SSESpecification, context)
    },
    ...input.StreamSpecification != null && {
      StreamSpecification: serializeAws_json1_0StreamSpecification(input.StreamSpecification, context)
    },
    ...input.TableClass != null && { TableClass: input.TableClass },
    ...input.TableName != null && { TableName: input.TableName },
    ...input.Tags != null && { Tags: serializeAws_json1_0TagList(input.Tags, context) }
  };
};
var serializeAws_json1_0Delete = (input, context) => {
  return {
    ...input.ConditionExpression != null && { ConditionExpression: input.ConditionExpression },
    ...input.ExpressionAttributeNames != null && {
      ExpressionAttributeNames: serializeAws_json1_0ExpressionAttributeNameMap(input.ExpressionAttributeNames, context)
    },
    ...input.ExpressionAttributeValues != null && {
      ExpressionAttributeValues: serializeAws_json1_0ExpressionAttributeValueMap(input.ExpressionAttributeValues, context)
    },
    ...input.Key != null && { Key: serializeAws_json1_0Key(input.Key, context) },
    ...input.ReturnValuesOnConditionCheckFailure != null && {
      ReturnValuesOnConditionCheckFailure: input.ReturnValuesOnConditionCheckFailure
    },
    ...input.TableName != null && { TableName: input.TableName }
  };
};
var serializeAws_json1_0DeleteItemInput = (input, context) => {
  return {
    ...input.ConditionExpression != null && { ConditionExpression: input.ConditionExpression },
    ...input.ConditionalOperator != null && { ConditionalOperator: input.ConditionalOperator },
    ...input.Expected != null && { Expected: serializeAws_json1_0ExpectedAttributeMap(input.Expected, context) },
    ...input.ExpressionAttributeNames != null && {
      ExpressionAttributeNames: serializeAws_json1_0ExpressionAttributeNameMap(input.ExpressionAttributeNames, context)
    },
    ...input.ExpressionAttributeValues != null && {
      ExpressionAttributeValues: serializeAws_json1_0ExpressionAttributeValueMap(input.ExpressionAttributeValues, context)
    },
    ...input.Key != null && { Key: serializeAws_json1_0Key(input.Key, context) },
    ...input.ReturnConsumedCapacity != null && { ReturnConsumedCapacity: input.ReturnConsumedCapacity },
    ...input.ReturnItemCollectionMetrics != null && {
      ReturnItemCollectionMetrics: input.ReturnItemCollectionMetrics
    },
    ...input.ReturnValues != null && { ReturnValues: input.ReturnValues },
    ...input.TableName != null && { TableName: input.TableName }
  };
};
var serializeAws_json1_0DeleteRequest = (input, context) => {
  return {
    ...input.Key != null && { Key: serializeAws_json1_0Key(input.Key, context) }
  };
};
var serializeAws_json1_0DescribeEndpointsRequest = (input, context) => {
  return {};
};
var serializeAws_json1_0ExpectedAttributeMap = (input, context) => {
  return Object.entries(input).reduce((acc, [key, value]) => {
    if (value === null) {
      return acc;
    }
    acc[key] = serializeAws_json1_0ExpectedAttributeValue(value, context);
    return acc;
  }, {});
};
var serializeAws_json1_0ExpectedAttributeValue = (input, context) => {
  return {
    ...input.AttributeValueList != null && {
      AttributeValueList: serializeAws_json1_0AttributeValueList(input.AttributeValueList, context)
    },
    ...input.ComparisonOperator != null && { ComparisonOperator: input.ComparisonOperator },
    ...input.Exists != null && { Exists: input.Exists },
    ...input.Value != null && { Value: serializeAws_json1_0AttributeValue(input.Value, context) }
  };
};
var serializeAws_json1_0ExpressionAttributeNameMap = (input, context) => {
  return Object.entries(input).reduce((acc, [key, value]) => {
    if (value === null) {
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});
};
var serializeAws_json1_0ExpressionAttributeValueMap = (input, context) => {
  return Object.entries(input).reduce((acc, [key, value]) => {
    if (value === null) {
      return acc;
    }
    acc[key] = serializeAws_json1_0AttributeValue(value, context);
    return acc;
  }, {});
};
var serializeAws_json1_0FilterConditionMap = (input, context) => {
  return Object.entries(input).reduce((acc, [key, value]) => {
    if (value === null) {
      return acc;
    }
    acc[key] = serializeAws_json1_0Condition(value, context);
    return acc;
  }, {});
};
var serializeAws_json1_0Get = (input, context) => {
  return {
    ...input.ExpressionAttributeNames != null && {
      ExpressionAttributeNames: serializeAws_json1_0ExpressionAttributeNameMap(input.ExpressionAttributeNames, context)
    },
    ...input.Key != null && { Key: serializeAws_json1_0Key(input.Key, context) },
    ...input.ProjectionExpression != null && { ProjectionExpression: input.ProjectionExpression },
    ...input.TableName != null && { TableName: input.TableName }
  };
};
var serializeAws_json1_0GetItemInput = (input, context) => {
  return {
    ...input.AttributesToGet != null && {
      AttributesToGet: serializeAws_json1_0AttributeNameList(input.AttributesToGet, context)
    },
    ...input.ConsistentRead != null && { ConsistentRead: input.ConsistentRead },
    ...input.ExpressionAttributeNames != null && {
      ExpressionAttributeNames: serializeAws_json1_0ExpressionAttributeNameMap(input.ExpressionAttributeNames, context)
    },
    ...input.Key != null && { Key: serializeAws_json1_0Key(input.Key, context) },
    ...input.ProjectionExpression != null && { ProjectionExpression: input.ProjectionExpression },
    ...input.ReturnConsumedCapacity != null && { ReturnConsumedCapacity: input.ReturnConsumedCapacity },
    ...input.TableName != null && { TableName: input.TableName }
  };
};
var serializeAws_json1_0GlobalSecondaryIndex = (input, context) => {
  return {
    ...input.IndexName != null && { IndexName: input.IndexName },
    ...input.KeySchema != null && { KeySchema: serializeAws_json1_0KeySchema(input.KeySchema, context) },
    ...input.Projection != null && { Projection: serializeAws_json1_0Projection(input.Projection, context) },
    ...input.ProvisionedThroughput != null && {
      ProvisionedThroughput: serializeAws_json1_0ProvisionedThroughput(input.ProvisionedThroughput, context)
    }
  };
};
var serializeAws_json1_0GlobalSecondaryIndexList = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return serializeAws_json1_0GlobalSecondaryIndex(entry, context);
  });
};
var serializeAws_json1_0Key = (input, context) => {
  return Object.entries(input).reduce((acc, [key, value]) => {
    if (value === null) {
      return acc;
    }
    acc[key] = serializeAws_json1_0AttributeValue(value, context);
    return acc;
  }, {});
};
var serializeAws_json1_0KeyConditions = (input, context) => {
  return Object.entries(input).reduce((acc, [key, value]) => {
    if (value === null) {
      return acc;
    }
    acc[key] = serializeAws_json1_0Condition(value, context);
    return acc;
  }, {});
};
var serializeAws_json1_0KeyList = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return serializeAws_json1_0Key(entry, context);
  });
};
var serializeAws_json1_0KeysAndAttributes = (input, context) => {
  return {
    ...input.AttributesToGet != null && {
      AttributesToGet: serializeAws_json1_0AttributeNameList(input.AttributesToGet, context)
    },
    ...input.ConsistentRead != null && { ConsistentRead: input.ConsistentRead },
    ...input.ExpressionAttributeNames != null && {
      ExpressionAttributeNames: serializeAws_json1_0ExpressionAttributeNameMap(input.ExpressionAttributeNames, context)
    },
    ...input.Keys != null && { Keys: serializeAws_json1_0KeyList(input.Keys, context) },
    ...input.ProjectionExpression != null && { ProjectionExpression: input.ProjectionExpression }
  };
};
var serializeAws_json1_0KeySchema = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return serializeAws_json1_0KeySchemaElement(entry, context);
  });
};
var serializeAws_json1_0KeySchemaElement = (input, context) => {
  return {
    ...input.AttributeName != null && { AttributeName: input.AttributeName },
    ...input.KeyType != null && { KeyType: input.KeyType }
  };
};
var serializeAws_json1_0ListAttributeValue = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return serializeAws_json1_0AttributeValue(entry, context);
  });
};
var serializeAws_json1_0ListTablesInput = (input, context) => {
  return {
    ...input.ExclusiveStartTableName != null && { ExclusiveStartTableName: input.ExclusiveStartTableName },
    ...input.Limit != null && { Limit: input.Limit }
  };
};
var serializeAws_json1_0LocalSecondaryIndex = (input, context) => {
  return {
    ...input.IndexName != null && { IndexName: input.IndexName },
    ...input.KeySchema != null && { KeySchema: serializeAws_json1_0KeySchema(input.KeySchema, context) },
    ...input.Projection != null && { Projection: serializeAws_json1_0Projection(input.Projection, context) }
  };
};
var serializeAws_json1_0LocalSecondaryIndexList = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return serializeAws_json1_0LocalSecondaryIndex(entry, context);
  });
};
var serializeAws_json1_0MapAttributeValue = (input, context) => {
  return Object.entries(input).reduce((acc, [key, value]) => {
    if (value === null) {
      return acc;
    }
    acc[key] = serializeAws_json1_0AttributeValue(value, context);
    return acc;
  }, {});
};
var serializeAws_json1_0NonKeyAttributeNameList = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return entry;
  });
};
var serializeAws_json1_0NumberSetAttributeValue = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return entry;
  });
};
var serializeAws_json1_0Projection = (input, context) => {
  return {
    ...input.NonKeyAttributes != null && {
      NonKeyAttributes: serializeAws_json1_0NonKeyAttributeNameList(input.NonKeyAttributes, context)
    },
    ...input.ProjectionType != null && { ProjectionType: input.ProjectionType }
  };
};
var serializeAws_json1_0ProvisionedThroughput = (input, context) => {
  return {
    ...input.ReadCapacityUnits != null && { ReadCapacityUnits: input.ReadCapacityUnits },
    ...input.WriteCapacityUnits != null && { WriteCapacityUnits: input.WriteCapacityUnits }
  };
};
var serializeAws_json1_0Put = (input, context) => {
  return {
    ...input.ConditionExpression != null && { ConditionExpression: input.ConditionExpression },
    ...input.ExpressionAttributeNames != null && {
      ExpressionAttributeNames: serializeAws_json1_0ExpressionAttributeNameMap(input.ExpressionAttributeNames, context)
    },
    ...input.ExpressionAttributeValues != null && {
      ExpressionAttributeValues: serializeAws_json1_0ExpressionAttributeValueMap(input.ExpressionAttributeValues, context)
    },
    ...input.Item != null && { Item: serializeAws_json1_0PutItemInputAttributeMap(input.Item, context) },
    ...input.ReturnValuesOnConditionCheckFailure != null && {
      ReturnValuesOnConditionCheckFailure: input.ReturnValuesOnConditionCheckFailure
    },
    ...input.TableName != null && { TableName: input.TableName }
  };
};
var serializeAws_json1_0PutItemInput = (input, context) => {
  return {
    ...input.ConditionExpression != null && { ConditionExpression: input.ConditionExpression },
    ...input.ConditionalOperator != null && { ConditionalOperator: input.ConditionalOperator },
    ...input.Expected != null && { Expected: serializeAws_json1_0ExpectedAttributeMap(input.Expected, context) },
    ...input.ExpressionAttributeNames != null && {
      ExpressionAttributeNames: serializeAws_json1_0ExpressionAttributeNameMap(input.ExpressionAttributeNames, context)
    },
    ...input.ExpressionAttributeValues != null && {
      ExpressionAttributeValues: serializeAws_json1_0ExpressionAttributeValueMap(input.ExpressionAttributeValues, context)
    },
    ...input.Item != null && { Item: serializeAws_json1_0PutItemInputAttributeMap(input.Item, context) },
    ...input.ReturnConsumedCapacity != null && { ReturnConsumedCapacity: input.ReturnConsumedCapacity },
    ...input.ReturnItemCollectionMetrics != null && {
      ReturnItemCollectionMetrics: input.ReturnItemCollectionMetrics
    },
    ...input.ReturnValues != null && { ReturnValues: input.ReturnValues },
    ...input.TableName != null && { TableName: input.TableName }
  };
};
var serializeAws_json1_0PutItemInputAttributeMap = (input, context) => {
  return Object.entries(input).reduce((acc, [key, value]) => {
    if (value === null) {
      return acc;
    }
    acc[key] = serializeAws_json1_0AttributeValue(value, context);
    return acc;
  }, {});
};
var serializeAws_json1_0PutRequest = (input, context) => {
  return {
    ...input.Item != null && { Item: serializeAws_json1_0PutItemInputAttributeMap(input.Item, context) }
  };
};
var serializeAws_json1_0QueryInput = (input, context) => {
  return {
    ...input.AttributesToGet != null && {
      AttributesToGet: serializeAws_json1_0AttributeNameList(input.AttributesToGet, context)
    },
    ...input.ConditionalOperator != null && { ConditionalOperator: input.ConditionalOperator },
    ...input.ConsistentRead != null && { ConsistentRead: input.ConsistentRead },
    ...input.ExclusiveStartKey != null && {
      ExclusiveStartKey: serializeAws_json1_0Key(input.ExclusiveStartKey, context)
    },
    ...input.ExpressionAttributeNames != null && {
      ExpressionAttributeNames: serializeAws_json1_0ExpressionAttributeNameMap(input.ExpressionAttributeNames, context)
    },
    ...input.ExpressionAttributeValues != null && {
      ExpressionAttributeValues: serializeAws_json1_0ExpressionAttributeValueMap(input.ExpressionAttributeValues, context)
    },
    ...input.FilterExpression != null && { FilterExpression: input.FilterExpression },
    ...input.IndexName != null && { IndexName: input.IndexName },
    ...input.KeyConditionExpression != null && { KeyConditionExpression: input.KeyConditionExpression },
    ...input.KeyConditions != null && {
      KeyConditions: serializeAws_json1_0KeyConditions(input.KeyConditions, context)
    },
    ...input.Limit != null && { Limit: input.Limit },
    ...input.ProjectionExpression != null && { ProjectionExpression: input.ProjectionExpression },
    ...input.QueryFilter != null && {
      QueryFilter: serializeAws_json1_0FilterConditionMap(input.QueryFilter, context)
    },
    ...input.ReturnConsumedCapacity != null && { ReturnConsumedCapacity: input.ReturnConsumedCapacity },
    ...input.ScanIndexForward != null && { ScanIndexForward: input.ScanIndexForward },
    ...input.Select != null && { Select: input.Select },
    ...input.TableName != null && { TableName: input.TableName }
  };
};
var serializeAws_json1_0ScanInput = (input, context) => {
  return {
    ...input.AttributesToGet != null && {
      AttributesToGet: serializeAws_json1_0AttributeNameList(input.AttributesToGet, context)
    },
    ...input.ConditionalOperator != null && { ConditionalOperator: input.ConditionalOperator },
    ...input.ConsistentRead != null && { ConsistentRead: input.ConsistentRead },
    ...input.ExclusiveStartKey != null && {
      ExclusiveStartKey: serializeAws_json1_0Key(input.ExclusiveStartKey, context)
    },
    ...input.ExpressionAttributeNames != null && {
      ExpressionAttributeNames: serializeAws_json1_0ExpressionAttributeNameMap(input.ExpressionAttributeNames, context)
    },
    ...input.ExpressionAttributeValues != null && {
      ExpressionAttributeValues: serializeAws_json1_0ExpressionAttributeValueMap(input.ExpressionAttributeValues, context)
    },
    ...input.FilterExpression != null && { FilterExpression: input.FilterExpression },
    ...input.IndexName != null && { IndexName: input.IndexName },
    ...input.Limit != null && { Limit: input.Limit },
    ...input.ProjectionExpression != null && { ProjectionExpression: input.ProjectionExpression },
    ...input.ReturnConsumedCapacity != null && { ReturnConsumedCapacity: input.ReturnConsumedCapacity },
    ...input.ScanFilter != null && { ScanFilter: serializeAws_json1_0FilterConditionMap(input.ScanFilter, context) },
    ...input.Segment != null && { Segment: input.Segment },
    ...input.Select != null && { Select: input.Select },
    ...input.TableName != null && { TableName: input.TableName },
    ...input.TotalSegments != null && { TotalSegments: input.TotalSegments }
  };
};
var serializeAws_json1_0SSESpecification = (input, context) => {
  return {
    ...input.Enabled != null && { Enabled: input.Enabled },
    ...input.KMSMasterKeyId != null && { KMSMasterKeyId: input.KMSMasterKeyId },
    ...input.SSEType != null && { SSEType: input.SSEType }
  };
};
var serializeAws_json1_0StreamSpecification = (input, context) => {
  return {
    ...input.StreamEnabled != null && { StreamEnabled: input.StreamEnabled },
    ...input.StreamViewType != null && { StreamViewType: input.StreamViewType }
  };
};
var serializeAws_json1_0StringSetAttributeValue = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return entry;
  });
};
var serializeAws_json1_0Tag = (input, context) => {
  return {
    ...input.Key != null && { Key: input.Key },
    ...input.Value != null && { Value: input.Value }
  };
};
var serializeAws_json1_0TagList = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return serializeAws_json1_0Tag(entry, context);
  });
};
var serializeAws_json1_0TransactGetItem = (input, context) => {
  return {
    ...input.Get != null && { Get: serializeAws_json1_0Get(input.Get, context) }
  };
};
var serializeAws_json1_0TransactGetItemList = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return serializeAws_json1_0TransactGetItem(entry, context);
  });
};
var serializeAws_json1_0TransactGetItemsInput = (input, context) => {
  return {
    ...input.ReturnConsumedCapacity != null && { ReturnConsumedCapacity: input.ReturnConsumedCapacity },
    ...input.TransactItems != null && {
      TransactItems: serializeAws_json1_0TransactGetItemList(input.TransactItems, context)
    }
  };
};
var serializeAws_json1_0TransactWriteItem = (input, context) => {
  return {
    ...input.ConditionCheck != null && {
      ConditionCheck: serializeAws_json1_0ConditionCheck(input.ConditionCheck, context)
    },
    ...input.Delete != null && { Delete: serializeAws_json1_0Delete(input.Delete, context) },
    ...input.Put != null && { Put: serializeAws_json1_0Put(input.Put, context) },
    ...input.Update != null && { Update: serializeAws_json1_0Update(input.Update, context) }
  };
};
var serializeAws_json1_0TransactWriteItemList = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return serializeAws_json1_0TransactWriteItem(entry, context);
  });
};
var serializeAws_json1_0TransactWriteItemsInput = (input, context) => {
  return {
    ClientRequestToken: input.ClientRequestToken ?? v4(),
    ...input.ReturnConsumedCapacity != null && { ReturnConsumedCapacity: input.ReturnConsumedCapacity },
    ...input.ReturnItemCollectionMetrics != null && {
      ReturnItemCollectionMetrics: input.ReturnItemCollectionMetrics
    },
    ...input.TransactItems != null && {
      TransactItems: serializeAws_json1_0TransactWriteItemList(input.TransactItems, context)
    }
  };
};
var serializeAws_json1_0Update = (input, context) => {
  return {
    ...input.ConditionExpression != null && { ConditionExpression: input.ConditionExpression },
    ...input.ExpressionAttributeNames != null && {
      ExpressionAttributeNames: serializeAws_json1_0ExpressionAttributeNameMap(input.ExpressionAttributeNames, context)
    },
    ...input.ExpressionAttributeValues != null && {
      ExpressionAttributeValues: serializeAws_json1_0ExpressionAttributeValueMap(input.ExpressionAttributeValues, context)
    },
    ...input.Key != null && { Key: serializeAws_json1_0Key(input.Key, context) },
    ...input.ReturnValuesOnConditionCheckFailure != null && {
      ReturnValuesOnConditionCheckFailure: input.ReturnValuesOnConditionCheckFailure
    },
    ...input.TableName != null && { TableName: input.TableName },
    ...input.UpdateExpression != null && { UpdateExpression: input.UpdateExpression }
  };
};
var serializeAws_json1_0UpdateItemInput = (input, context) => {
  return {
    ...input.AttributeUpdates != null && {
      AttributeUpdates: serializeAws_json1_0AttributeUpdates(input.AttributeUpdates, context)
    },
    ...input.ConditionExpression != null && { ConditionExpression: input.ConditionExpression },
    ...input.ConditionalOperator != null && { ConditionalOperator: input.ConditionalOperator },
    ...input.Expected != null && { Expected: serializeAws_json1_0ExpectedAttributeMap(input.Expected, context) },
    ...input.ExpressionAttributeNames != null && {
      ExpressionAttributeNames: serializeAws_json1_0ExpressionAttributeNameMap(input.ExpressionAttributeNames, context)
    },
    ...input.ExpressionAttributeValues != null && {
      ExpressionAttributeValues: serializeAws_json1_0ExpressionAttributeValueMap(input.ExpressionAttributeValues, context)
    },
    ...input.Key != null && { Key: serializeAws_json1_0Key(input.Key, context) },
    ...input.ReturnConsumedCapacity != null && { ReturnConsumedCapacity: input.ReturnConsumedCapacity },
    ...input.ReturnItemCollectionMetrics != null && {
      ReturnItemCollectionMetrics: input.ReturnItemCollectionMetrics
    },
    ...input.ReturnValues != null && { ReturnValues: input.ReturnValues },
    ...input.TableName != null && { TableName: input.TableName },
    ...input.UpdateExpression != null && { UpdateExpression: input.UpdateExpression }
  };
};
var serializeAws_json1_0WriteRequest = (input, context) => {
  return {
    ...input.DeleteRequest != null && {
      DeleteRequest: serializeAws_json1_0DeleteRequest(input.DeleteRequest, context)
    },
    ...input.PutRequest != null && { PutRequest: serializeAws_json1_0PutRequest(input.PutRequest, context) }
  };
};
var serializeAws_json1_0WriteRequests = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return serializeAws_json1_0WriteRequest(entry, context);
  });
};
var deserializeAws_json1_0ArchivalSummary = (output, context) => {
  return {
    ArchivalBackupArn: expectString(output.ArchivalBackupArn),
    ArchivalDateTime: output.ArchivalDateTime != null ? expectNonNull(parseEpochTimestamp(expectNumber(output.ArchivalDateTime))) : void 0,
    ArchivalReason: expectString(output.ArchivalReason)
  };
};
var deserializeAws_json1_0AttributeDefinition = (output, context) => {
  return {
    AttributeName: expectString(output.AttributeName),
    AttributeType: expectString(output.AttributeType)
  };
};
var deserializeAws_json1_0AttributeDefinitions = (output, context) => {
  const retVal = (output || []).filter((e13) => e13 != null).map((entry) => {
    if (entry === null) {
      return null;
    }
    return deserializeAws_json1_0AttributeDefinition(entry, context);
  });
  return retVal;
};
var deserializeAws_json1_0AttributeMap = (output, context) => {
  return Object.entries(output).reduce((acc, [key, value]) => {
    if (value === null) {
      return acc;
    }
    acc[key] = deserializeAws_json1_0AttributeValue(expectUnion(value), context);
    return acc;
  }, {});
};
var deserializeAws_json1_0AttributeNameList = (output, context) => {
  const retVal = (output || []).filter((e13) => e13 != null).map((entry) => {
    if (entry === null) {
      return null;
    }
    return expectString(entry);
  });
  return retVal;
};
var deserializeAws_json1_0AttributeValue = (output, context) => {
  if (output.B != null) {
    return {
      B: context.base64Decoder(output.B)
    };
  }
  if (expectBoolean(output.BOOL) !== void 0) {
    return { BOOL: expectBoolean(output.BOOL) };
  }
  if (output.BS != null) {
    return {
      BS: deserializeAws_json1_0BinarySetAttributeValue(output.BS, context)
    };
  }
  if (output.L != null) {
    return {
      L: deserializeAws_json1_0ListAttributeValue(output.L, context)
    };
  }
  if (output.M != null) {
    return {
      M: deserializeAws_json1_0MapAttributeValue(output.M, context)
    };
  }
  if (expectString(output.N) !== void 0) {
    return { N: expectString(output.N) };
  }
  if (output.NS != null) {
    return {
      NS: deserializeAws_json1_0NumberSetAttributeValue(output.NS, context)
    };
  }
  if (expectBoolean(output.NULL) !== void 0) {
    return { NULL: expectBoolean(output.NULL) };
  }
  if (expectString(output.S) !== void 0) {
    return { S: expectString(output.S) };
  }
  if (output.SS != null) {
    return {
      SS: deserializeAws_json1_0StringSetAttributeValue(output.SS, context)
    };
  }
  return { $unknown: Object.entries(output)[0] };
};
var deserializeAws_json1_0BatchGetItemOutput = (output, context) => {
  return {
    ConsumedCapacity: output.ConsumedCapacity != null ? deserializeAws_json1_0ConsumedCapacityMultiple(output.ConsumedCapacity, context) : void 0,
    Responses: output.Responses != null ? deserializeAws_json1_0BatchGetResponseMap(output.Responses, context) : void 0,
    UnprocessedKeys: output.UnprocessedKeys != null ? deserializeAws_json1_0BatchGetRequestMap(output.UnprocessedKeys, context) : void 0
  };
};
var deserializeAws_json1_0BatchGetRequestMap = (output, context) => {
  return Object.entries(output).reduce((acc, [key, value]) => {
    if (value === null) {
      return acc;
    }
    acc[key] = deserializeAws_json1_0KeysAndAttributes(value, context);
    return acc;
  }, {});
};
var deserializeAws_json1_0BatchGetResponseMap = (output, context) => {
  return Object.entries(output).reduce((acc, [key, value]) => {
    if (value === null) {
      return acc;
    }
    acc[key] = deserializeAws_json1_0ItemList(value, context);
    return acc;
  }, {});
};
var deserializeAws_json1_0BatchWriteItemOutput = (output, context) => {
  return {
    ConsumedCapacity: output.ConsumedCapacity != null ? deserializeAws_json1_0ConsumedCapacityMultiple(output.ConsumedCapacity, context) : void 0,
    ItemCollectionMetrics: output.ItemCollectionMetrics != null ? deserializeAws_json1_0ItemCollectionMetricsPerTable(output.ItemCollectionMetrics, context) : void 0,
    UnprocessedItems: output.UnprocessedItems != null ? deserializeAws_json1_0BatchWriteItemRequestMap(output.UnprocessedItems, context) : void 0
  };
};
var deserializeAws_json1_0BatchWriteItemRequestMap = (output, context) => {
  return Object.entries(output).reduce((acc, [key, value]) => {
    if (value === null) {
      return acc;
    }
    acc[key] = deserializeAws_json1_0WriteRequests(value, context);
    return acc;
  }, {});
};
var deserializeAws_json1_0BillingModeSummary = (output, context) => {
  return {
    BillingMode: expectString(output.BillingMode),
    LastUpdateToPayPerRequestDateTime: output.LastUpdateToPayPerRequestDateTime != null ? expectNonNull(parseEpochTimestamp(expectNumber(output.LastUpdateToPayPerRequestDateTime))) : void 0
  };
};
var deserializeAws_json1_0BinarySetAttributeValue = (output, context) => {
  const retVal = (output || []).filter((e13) => e13 != null).map((entry) => {
    if (entry === null) {
      return null;
    }
    return context.base64Decoder(entry);
  });
  return retVal;
};
var deserializeAws_json1_0CancellationReason = (output, context) => {
  return {
    Code: expectString(output.Code),
    Item: output.Item != null ? deserializeAws_json1_0AttributeMap(output.Item, context) : void 0,
    Message: expectString(output.Message)
  };
};
var deserializeAws_json1_0CancellationReasonList = (output, context) => {
  const retVal = (output || []).filter((e13) => e13 != null).map((entry) => {
    if (entry === null) {
      return null;
    }
    return deserializeAws_json1_0CancellationReason(entry, context);
  });
  return retVal;
};
var deserializeAws_json1_0Capacity = (output, context) => {
  return {
    CapacityUnits: limitedParseDouble(output.CapacityUnits),
    ReadCapacityUnits: limitedParseDouble(output.ReadCapacityUnits),
    WriteCapacityUnits: limitedParseDouble(output.WriteCapacityUnits)
  };
};
var deserializeAws_json1_0ConditionalCheckFailedException = (output, context) => {
  return {
    message: expectString(output.message)
  };
};
var deserializeAws_json1_0ConsumedCapacity = (output, context) => {
  return {
    CapacityUnits: limitedParseDouble(output.CapacityUnits),
    GlobalSecondaryIndexes: output.GlobalSecondaryIndexes != null ? deserializeAws_json1_0SecondaryIndexesCapacityMap(output.GlobalSecondaryIndexes, context) : void 0,
    LocalSecondaryIndexes: output.LocalSecondaryIndexes != null ? deserializeAws_json1_0SecondaryIndexesCapacityMap(output.LocalSecondaryIndexes, context) : void 0,
    ReadCapacityUnits: limitedParseDouble(output.ReadCapacityUnits),
    Table: output.Table != null ? deserializeAws_json1_0Capacity(output.Table, context) : void 0,
    TableName: expectString(output.TableName),
    WriteCapacityUnits: limitedParseDouble(output.WriteCapacityUnits)
  };
};
var deserializeAws_json1_0ConsumedCapacityMultiple = (output, context) => {
  const retVal = (output || []).filter((e13) => e13 != null).map((entry) => {
    if (entry === null) {
      return null;
    }
    return deserializeAws_json1_0ConsumedCapacity(entry, context);
  });
  return retVal;
};
var deserializeAws_json1_0CreateTableOutput = (output, context) => {
  return {
    TableDescription: output.TableDescription != null ? deserializeAws_json1_0TableDescription(output.TableDescription, context) : void 0
  };
};
var deserializeAws_json1_0DeleteItemOutput = (output, context) => {
  return {
    Attributes: output.Attributes != null ? deserializeAws_json1_0AttributeMap(output.Attributes, context) : void 0,
    ConsumedCapacity: output.ConsumedCapacity != null ? deserializeAws_json1_0ConsumedCapacity(output.ConsumedCapacity, context) : void 0,
    ItemCollectionMetrics: output.ItemCollectionMetrics != null ? deserializeAws_json1_0ItemCollectionMetrics(output.ItemCollectionMetrics, context) : void 0
  };
};
var deserializeAws_json1_0DeleteRequest = (output, context) => {
  return {
    Key: output.Key != null ? deserializeAws_json1_0Key(output.Key, context) : void 0
  };
};
var deserializeAws_json1_0DescribeEndpointsResponse = (output, context) => {
  return {
    Endpoints: output.Endpoints != null ? deserializeAws_json1_0Endpoints(output.Endpoints, context) : void 0
  };
};
var deserializeAws_json1_0Endpoint = (output, context) => {
  return {
    Address: expectString(output.Address),
    CachePeriodInMinutes: expectLong(output.CachePeriodInMinutes)
  };
};
var deserializeAws_json1_0Endpoints = (output, context) => {
  const retVal = (output || []).filter((e13) => e13 != null).map((entry) => {
    if (entry === null) {
      return null;
    }
    return deserializeAws_json1_0Endpoint(entry, context);
  });
  return retVal;
};
var deserializeAws_json1_0ExpressionAttributeNameMap = (output, context) => {
  return Object.entries(output).reduce((acc, [key, value]) => {
    if (value === null) {
      return acc;
    }
    acc[key] = expectString(value);
    return acc;
  }, {});
};
var deserializeAws_json1_0GetItemOutput = (output, context) => {
  return {
    ConsumedCapacity: output.ConsumedCapacity != null ? deserializeAws_json1_0ConsumedCapacity(output.ConsumedCapacity, context) : void 0,
    Item: output.Item != null ? deserializeAws_json1_0AttributeMap(output.Item, context) : void 0
  };
};
var deserializeAws_json1_0GlobalSecondaryIndexDescription = (output, context) => {
  return {
    Backfilling: expectBoolean(output.Backfilling),
    IndexArn: expectString(output.IndexArn),
    IndexName: expectString(output.IndexName),
    IndexSizeBytes: expectLong(output.IndexSizeBytes),
    IndexStatus: expectString(output.IndexStatus),
    ItemCount: expectLong(output.ItemCount),
    KeySchema: output.KeySchema != null ? deserializeAws_json1_0KeySchema(output.KeySchema, context) : void 0,
    Projection: output.Projection != null ? deserializeAws_json1_0Projection(output.Projection, context) : void 0,
    ProvisionedThroughput: output.ProvisionedThroughput != null ? deserializeAws_json1_0ProvisionedThroughputDescription(output.ProvisionedThroughput, context) : void 0
  };
};
var deserializeAws_json1_0GlobalSecondaryIndexDescriptionList = (output, context) => {
  const retVal = (output || []).filter((e13) => e13 != null).map((entry) => {
    if (entry === null) {
      return null;
    }
    return deserializeAws_json1_0GlobalSecondaryIndexDescription(entry, context);
  });
  return retVal;
};
var deserializeAws_json1_0IdempotentParameterMismatchException = (output, context) => {
  return {
    Message: expectString(output.Message)
  };
};
var deserializeAws_json1_0InternalServerError = (output, context) => {
  return {
    message: expectString(output.message)
  };
};
var deserializeAws_json1_0InvalidEndpointException = (output, context) => {
  return {
    Message: expectString(output.Message)
  };
};
var deserializeAws_json1_0ItemCollectionKeyAttributeMap = (output, context) => {
  return Object.entries(output).reduce((acc, [key, value]) => {
    if (value === null) {
      return acc;
    }
    acc[key] = deserializeAws_json1_0AttributeValue(expectUnion(value), context);
    return acc;
  }, {});
};
var deserializeAws_json1_0ItemCollectionMetrics = (output, context) => {
  return {
    ItemCollectionKey: output.ItemCollectionKey != null ? deserializeAws_json1_0ItemCollectionKeyAttributeMap(output.ItemCollectionKey, context) : void 0,
    SizeEstimateRangeGB: output.SizeEstimateRangeGB != null ? deserializeAws_json1_0ItemCollectionSizeEstimateRange(output.SizeEstimateRangeGB, context) : void 0
  };
};
var deserializeAws_json1_0ItemCollectionMetricsMultiple = (output, context) => {
  const retVal = (output || []).filter((e13) => e13 != null).map((entry) => {
    if (entry === null) {
      return null;
    }
    return deserializeAws_json1_0ItemCollectionMetrics(entry, context);
  });
  return retVal;
};
var deserializeAws_json1_0ItemCollectionMetricsPerTable = (output, context) => {
  return Object.entries(output).reduce((acc, [key, value]) => {
    if (value === null) {
      return acc;
    }
    acc[key] = deserializeAws_json1_0ItemCollectionMetricsMultiple(value, context);
    return acc;
  }, {});
};
var deserializeAws_json1_0ItemCollectionSizeEstimateRange = (output, context) => {
  const retVal = (output || []).filter((e13) => e13 != null).map((entry) => {
    if (entry === null) {
      return null;
    }
    return limitedParseDouble(entry);
  });
  return retVal;
};
var deserializeAws_json1_0ItemCollectionSizeLimitExceededException = (output, context) => {
  return {
    message: expectString(output.message)
  };
};
var deserializeAws_json1_0ItemList = (output, context) => {
  const retVal = (output || []).filter((e13) => e13 != null).map((entry) => {
    if (entry === null) {
      return null;
    }
    return deserializeAws_json1_0AttributeMap(entry, context);
  });
  return retVal;
};
var deserializeAws_json1_0ItemResponse = (output, context) => {
  return {
    Item: output.Item != null ? deserializeAws_json1_0AttributeMap(output.Item, context) : void 0
  };
};
var deserializeAws_json1_0ItemResponseList = (output, context) => {
  const retVal = (output || []).filter((e13) => e13 != null).map((entry) => {
    if (entry === null) {
      return null;
    }
    return deserializeAws_json1_0ItemResponse(entry, context);
  });
  return retVal;
};
var deserializeAws_json1_0Key = (output, context) => {
  return Object.entries(output).reduce((acc, [key, value]) => {
    if (value === null) {
      return acc;
    }
    acc[key] = deserializeAws_json1_0AttributeValue(expectUnion(value), context);
    return acc;
  }, {});
};
var deserializeAws_json1_0KeyList = (output, context) => {
  const retVal = (output || []).filter((e13) => e13 != null).map((entry) => {
    if (entry === null) {
      return null;
    }
    return deserializeAws_json1_0Key(entry, context);
  });
  return retVal;
};
var deserializeAws_json1_0KeysAndAttributes = (output, context) => {
  return {
    AttributesToGet: output.AttributesToGet != null ? deserializeAws_json1_0AttributeNameList(output.AttributesToGet, context) : void 0,
    ConsistentRead: expectBoolean(output.ConsistentRead),
    ExpressionAttributeNames: output.ExpressionAttributeNames != null ? deserializeAws_json1_0ExpressionAttributeNameMap(output.ExpressionAttributeNames, context) : void 0,
    Keys: output.Keys != null ? deserializeAws_json1_0KeyList(output.Keys, context) : void 0,
    ProjectionExpression: expectString(output.ProjectionExpression)
  };
};
var deserializeAws_json1_0KeySchema = (output, context) => {
  const retVal = (output || []).filter((e13) => e13 != null).map((entry) => {
    if (entry === null) {
      return null;
    }
    return deserializeAws_json1_0KeySchemaElement(entry, context);
  });
  return retVal;
};
var deserializeAws_json1_0KeySchemaElement = (output, context) => {
  return {
    AttributeName: expectString(output.AttributeName),
    KeyType: expectString(output.KeyType)
  };
};
var deserializeAws_json1_0LimitExceededException = (output, context) => {
  return {
    message: expectString(output.message)
  };
};
var deserializeAws_json1_0ListAttributeValue = (output, context) => {
  const retVal = (output || []).filter((e13) => e13 != null).map((entry) => {
    if (entry === null) {
      return null;
    }
    return deserializeAws_json1_0AttributeValue(expectUnion(entry), context);
  });
  return retVal;
};
var deserializeAws_json1_0ListTablesOutput = (output, context) => {
  return {
    LastEvaluatedTableName: expectString(output.LastEvaluatedTableName),
    TableNames: output.TableNames != null ? deserializeAws_json1_0TableNameList(output.TableNames, context) : void 0
  };
};
var deserializeAws_json1_0LocalSecondaryIndexDescription = (output, context) => {
  return {
    IndexArn: expectString(output.IndexArn),
    IndexName: expectString(output.IndexName),
    IndexSizeBytes: expectLong(output.IndexSizeBytes),
    ItemCount: expectLong(output.ItemCount),
    KeySchema: output.KeySchema != null ? deserializeAws_json1_0KeySchema(output.KeySchema, context) : void 0,
    Projection: output.Projection != null ? deserializeAws_json1_0Projection(output.Projection, context) : void 0
  };
};
var deserializeAws_json1_0LocalSecondaryIndexDescriptionList = (output, context) => {
  const retVal = (output || []).filter((e13) => e13 != null).map((entry) => {
    if (entry === null) {
      return null;
    }
    return deserializeAws_json1_0LocalSecondaryIndexDescription(entry, context);
  });
  return retVal;
};
var deserializeAws_json1_0MapAttributeValue = (output, context) => {
  return Object.entries(output).reduce((acc, [key, value]) => {
    if (value === null) {
      return acc;
    }
    acc[key] = deserializeAws_json1_0AttributeValue(expectUnion(value), context);
    return acc;
  }, {});
};
var deserializeAws_json1_0NonKeyAttributeNameList = (output, context) => {
  const retVal = (output || []).filter((e13) => e13 != null).map((entry) => {
    if (entry === null) {
      return null;
    }
    return expectString(entry);
  });
  return retVal;
};
var deserializeAws_json1_0NumberSetAttributeValue = (output, context) => {
  const retVal = (output || []).filter((e13) => e13 != null).map((entry) => {
    if (entry === null) {
      return null;
    }
    return expectString(entry);
  });
  return retVal;
};
var deserializeAws_json1_0Projection = (output, context) => {
  return {
    NonKeyAttributes: output.NonKeyAttributes != null ? deserializeAws_json1_0NonKeyAttributeNameList(output.NonKeyAttributes, context) : void 0,
    ProjectionType: expectString(output.ProjectionType)
  };
};
var deserializeAws_json1_0ProvisionedThroughputDescription = (output, context) => {
  return {
    LastDecreaseDateTime: output.LastDecreaseDateTime != null ? expectNonNull(parseEpochTimestamp(expectNumber(output.LastDecreaseDateTime))) : void 0,
    LastIncreaseDateTime: output.LastIncreaseDateTime != null ? expectNonNull(parseEpochTimestamp(expectNumber(output.LastIncreaseDateTime))) : void 0,
    NumberOfDecreasesToday: expectLong(output.NumberOfDecreasesToday),
    ReadCapacityUnits: expectLong(output.ReadCapacityUnits),
    WriteCapacityUnits: expectLong(output.WriteCapacityUnits)
  };
};
var deserializeAws_json1_0ProvisionedThroughputExceededException = (output, context) => {
  return {
    message: expectString(output.message)
  };
};
var deserializeAws_json1_0ProvisionedThroughputOverride = (output, context) => {
  return {
    ReadCapacityUnits: expectLong(output.ReadCapacityUnits)
  };
};
var deserializeAws_json1_0PutItemInputAttributeMap = (output, context) => {
  return Object.entries(output).reduce((acc, [key, value]) => {
    if (value === null) {
      return acc;
    }
    acc[key] = deserializeAws_json1_0AttributeValue(expectUnion(value), context);
    return acc;
  }, {});
};
var deserializeAws_json1_0PutItemOutput = (output, context) => {
  return {
    Attributes: output.Attributes != null ? deserializeAws_json1_0AttributeMap(output.Attributes, context) : void 0,
    ConsumedCapacity: output.ConsumedCapacity != null ? deserializeAws_json1_0ConsumedCapacity(output.ConsumedCapacity, context) : void 0,
    ItemCollectionMetrics: output.ItemCollectionMetrics != null ? deserializeAws_json1_0ItemCollectionMetrics(output.ItemCollectionMetrics, context) : void 0
  };
};
var deserializeAws_json1_0PutRequest = (output, context) => {
  return {
    Item: output.Item != null ? deserializeAws_json1_0PutItemInputAttributeMap(output.Item, context) : void 0
  };
};
var deserializeAws_json1_0QueryOutput = (output, context) => {
  return {
    ConsumedCapacity: output.ConsumedCapacity != null ? deserializeAws_json1_0ConsumedCapacity(output.ConsumedCapacity, context) : void 0,
    Count: expectInt32(output.Count),
    Items: output.Items != null ? deserializeAws_json1_0ItemList(output.Items, context) : void 0,
    LastEvaluatedKey: output.LastEvaluatedKey != null ? deserializeAws_json1_0Key(output.LastEvaluatedKey, context) : void 0,
    ScannedCount: expectInt32(output.ScannedCount)
  };
};
var deserializeAws_json1_0ReplicaDescription = (output, context) => {
  return {
    GlobalSecondaryIndexes: output.GlobalSecondaryIndexes != null ? deserializeAws_json1_0ReplicaGlobalSecondaryIndexDescriptionList(output.GlobalSecondaryIndexes, context) : void 0,
    KMSMasterKeyId: expectString(output.KMSMasterKeyId),
    ProvisionedThroughputOverride: output.ProvisionedThroughputOverride != null ? deserializeAws_json1_0ProvisionedThroughputOverride(output.ProvisionedThroughputOverride, context) : void 0,
    RegionName: expectString(output.RegionName),
    ReplicaInaccessibleDateTime: output.ReplicaInaccessibleDateTime != null ? expectNonNull(parseEpochTimestamp(expectNumber(output.ReplicaInaccessibleDateTime))) : void 0,
    ReplicaStatus: expectString(output.ReplicaStatus),
    ReplicaStatusDescription: expectString(output.ReplicaStatusDescription),
    ReplicaStatusPercentProgress: expectString(output.ReplicaStatusPercentProgress),
    ReplicaTableClassSummary: output.ReplicaTableClassSummary != null ? deserializeAws_json1_0TableClassSummary(output.ReplicaTableClassSummary, context) : void 0
  };
};
var deserializeAws_json1_0ReplicaDescriptionList = (output, context) => {
  const retVal = (output || []).filter((e13) => e13 != null).map((entry) => {
    if (entry === null) {
      return null;
    }
    return deserializeAws_json1_0ReplicaDescription(entry, context);
  });
  return retVal;
};
var deserializeAws_json1_0ReplicaGlobalSecondaryIndexDescription = (output, context) => {
  return {
    IndexName: expectString(output.IndexName),
    ProvisionedThroughputOverride: output.ProvisionedThroughputOverride != null ? deserializeAws_json1_0ProvisionedThroughputOverride(output.ProvisionedThroughputOverride, context) : void 0
  };
};
var deserializeAws_json1_0ReplicaGlobalSecondaryIndexDescriptionList = (output, context) => {
  const retVal = (output || []).filter((e13) => e13 != null).map((entry) => {
    if (entry === null) {
      return null;
    }
    return deserializeAws_json1_0ReplicaGlobalSecondaryIndexDescription(entry, context);
  });
  return retVal;
};
var deserializeAws_json1_0RequestLimitExceeded = (output, context) => {
  return {
    message: expectString(output.message)
  };
};
var deserializeAws_json1_0ResourceInUseException = (output, context) => {
  return {
    message: expectString(output.message)
  };
};
var deserializeAws_json1_0ResourceNotFoundException = (output, context) => {
  return {
    message: expectString(output.message)
  };
};
var deserializeAws_json1_0RestoreSummary = (output, context) => {
  return {
    RestoreDateTime: output.RestoreDateTime != null ? expectNonNull(parseEpochTimestamp(expectNumber(output.RestoreDateTime))) : void 0,
    RestoreInProgress: expectBoolean(output.RestoreInProgress),
    SourceBackupArn: expectString(output.SourceBackupArn),
    SourceTableArn: expectString(output.SourceTableArn)
  };
};
var deserializeAws_json1_0ScanOutput = (output, context) => {
  return {
    ConsumedCapacity: output.ConsumedCapacity != null ? deserializeAws_json1_0ConsumedCapacity(output.ConsumedCapacity, context) : void 0,
    Count: expectInt32(output.Count),
    Items: output.Items != null ? deserializeAws_json1_0ItemList(output.Items, context) : void 0,
    LastEvaluatedKey: output.LastEvaluatedKey != null ? deserializeAws_json1_0Key(output.LastEvaluatedKey, context) : void 0,
    ScannedCount: expectInt32(output.ScannedCount)
  };
};
var deserializeAws_json1_0SecondaryIndexesCapacityMap = (output, context) => {
  return Object.entries(output).reduce((acc, [key, value]) => {
    if (value === null) {
      return acc;
    }
    acc[key] = deserializeAws_json1_0Capacity(value, context);
    return acc;
  }, {});
};
var deserializeAws_json1_0SSEDescription = (output, context) => {
  return {
    InaccessibleEncryptionDateTime: output.InaccessibleEncryptionDateTime != null ? expectNonNull(parseEpochTimestamp(expectNumber(output.InaccessibleEncryptionDateTime))) : void 0,
    KMSMasterKeyArn: expectString(output.KMSMasterKeyArn),
    SSEType: expectString(output.SSEType),
    Status: expectString(output.Status)
  };
};
var deserializeAws_json1_0StreamSpecification = (output, context) => {
  return {
    StreamEnabled: expectBoolean(output.StreamEnabled),
    StreamViewType: expectString(output.StreamViewType)
  };
};
var deserializeAws_json1_0StringSetAttributeValue = (output, context) => {
  const retVal = (output || []).filter((e13) => e13 != null).map((entry) => {
    if (entry === null) {
      return null;
    }
    return expectString(entry);
  });
  return retVal;
};
var deserializeAws_json1_0TableClassSummary = (output, context) => {
  return {
    LastUpdateDateTime: output.LastUpdateDateTime != null ? expectNonNull(parseEpochTimestamp(expectNumber(output.LastUpdateDateTime))) : void 0,
    TableClass: expectString(output.TableClass)
  };
};
var deserializeAws_json1_0TableDescription = (output, context) => {
  return {
    ArchivalSummary: output.ArchivalSummary != null ? deserializeAws_json1_0ArchivalSummary(output.ArchivalSummary, context) : void 0,
    AttributeDefinitions: output.AttributeDefinitions != null ? deserializeAws_json1_0AttributeDefinitions(output.AttributeDefinitions, context) : void 0,
    BillingModeSummary: output.BillingModeSummary != null ? deserializeAws_json1_0BillingModeSummary(output.BillingModeSummary, context) : void 0,
    CreationDateTime: output.CreationDateTime != null ? expectNonNull(parseEpochTimestamp(expectNumber(output.CreationDateTime))) : void 0,
    GlobalSecondaryIndexes: output.GlobalSecondaryIndexes != null ? deserializeAws_json1_0GlobalSecondaryIndexDescriptionList(output.GlobalSecondaryIndexes, context) : void 0,
    GlobalTableVersion: expectString(output.GlobalTableVersion),
    ItemCount: expectLong(output.ItemCount),
    KeySchema: output.KeySchema != null ? deserializeAws_json1_0KeySchema(output.KeySchema, context) : void 0,
    LatestStreamArn: expectString(output.LatestStreamArn),
    LatestStreamLabel: expectString(output.LatestStreamLabel),
    LocalSecondaryIndexes: output.LocalSecondaryIndexes != null ? deserializeAws_json1_0LocalSecondaryIndexDescriptionList(output.LocalSecondaryIndexes, context) : void 0,
    ProvisionedThroughput: output.ProvisionedThroughput != null ? deserializeAws_json1_0ProvisionedThroughputDescription(output.ProvisionedThroughput, context) : void 0,
    Replicas: output.Replicas != null ? deserializeAws_json1_0ReplicaDescriptionList(output.Replicas, context) : void 0,
    RestoreSummary: output.RestoreSummary != null ? deserializeAws_json1_0RestoreSummary(output.RestoreSummary, context) : void 0,
    SSEDescription: output.SSEDescription != null ? deserializeAws_json1_0SSEDescription(output.SSEDescription, context) : void 0,
    StreamSpecification: output.StreamSpecification != null ? deserializeAws_json1_0StreamSpecification(output.StreamSpecification, context) : void 0,
    TableArn: expectString(output.TableArn),
    TableClassSummary: output.TableClassSummary != null ? deserializeAws_json1_0TableClassSummary(output.TableClassSummary, context) : void 0,
    TableId: expectString(output.TableId),
    TableName: expectString(output.TableName),
    TableSizeBytes: expectLong(output.TableSizeBytes),
    TableStatus: expectString(output.TableStatus)
  };
};
var deserializeAws_json1_0TableNameList = (output, context) => {
  const retVal = (output || []).filter((e13) => e13 != null).map((entry) => {
    if (entry === null) {
      return null;
    }
    return expectString(entry);
  });
  return retVal;
};
var deserializeAws_json1_0TransactGetItemsOutput = (output, context) => {
  return {
    ConsumedCapacity: output.ConsumedCapacity != null ? deserializeAws_json1_0ConsumedCapacityMultiple(output.ConsumedCapacity, context) : void 0,
    Responses: output.Responses != null ? deserializeAws_json1_0ItemResponseList(output.Responses, context) : void 0
  };
};
var deserializeAws_json1_0TransactionCanceledException = (output, context) => {
  return {
    CancellationReasons: output.CancellationReasons != null ? deserializeAws_json1_0CancellationReasonList(output.CancellationReasons, context) : void 0,
    Message: expectString(output.Message)
  };
};
var deserializeAws_json1_0TransactionConflictException = (output, context) => {
  return {
    message: expectString(output.message)
  };
};
var deserializeAws_json1_0TransactionInProgressException = (output, context) => {
  return {
    Message: expectString(output.Message)
  };
};
var deserializeAws_json1_0TransactWriteItemsOutput = (output, context) => {
  return {
    ConsumedCapacity: output.ConsumedCapacity != null ? deserializeAws_json1_0ConsumedCapacityMultiple(output.ConsumedCapacity, context) : void 0,
    ItemCollectionMetrics: output.ItemCollectionMetrics != null ? deserializeAws_json1_0ItemCollectionMetricsPerTable(output.ItemCollectionMetrics, context) : void 0
  };
};
var deserializeAws_json1_0UpdateItemOutput = (output, context) => {
  return {
    Attributes: output.Attributes != null ? deserializeAws_json1_0AttributeMap(output.Attributes, context) : void 0,
    ConsumedCapacity: output.ConsumedCapacity != null ? deserializeAws_json1_0ConsumedCapacity(output.ConsumedCapacity, context) : void 0,
    ItemCollectionMetrics: output.ItemCollectionMetrics != null ? deserializeAws_json1_0ItemCollectionMetrics(output.ItemCollectionMetrics, context) : void 0
  };
};
var deserializeAws_json1_0WriteRequest = (output, context) => {
  return {
    DeleteRequest: output.DeleteRequest != null ? deserializeAws_json1_0DeleteRequest(output.DeleteRequest, context) : void 0,
    PutRequest: output.PutRequest != null ? deserializeAws_json1_0PutRequest(output.PutRequest, context) : void 0
  };
};
var deserializeAws_json1_0WriteRequests = (output, context) => {
  const retVal = (output || []).filter((e13) => e13 != null).map((entry) => {
    if (entry === null) {
      return null;
    }
    return deserializeAws_json1_0WriteRequest(entry, context);
  });
  return retVal;
};
var deserializeMetadata2 = (output) => ({
  httpStatusCode: output.statusCode,
  requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
  extendedRequestId: output.headers["x-amz-id-2"],
  cfId: output.headers["x-amz-cf-id"]
});
var collectBody = (streamBody = new Uint8Array(), context) => {
  if (streamBody instanceof Uint8Array) {
    return Promise.resolve(streamBody);
  }
  return context.streamCollector(streamBody) || Promise.resolve(new Uint8Array());
};
var collectBodyString = (streamBody, context) => collectBody(streamBody, context).then((body) => context.utf8Encoder(body));
var buildHttpRpcRequest = async (context, headers, path, resolvedHostname, body) => {
  const { hostname, protocol = "https", port, path: basePath } = await context.endpoint();
  const contents = {
    protocol,
    hostname,
    port,
    method: "POST",
    path: basePath.endsWith("/") ? basePath.slice(0, -1) + path : basePath + path,
    headers
  };
  if (resolvedHostname !== void 0) {
    contents.hostname = resolvedHostname;
  }
  if (body !== void 0) {
    contents.body = body;
  }
  return new HttpRequest(contents);
};
var parseBody = (streamBody, context) => collectBodyString(streamBody, context).then((encoded) => {
  if (encoded.length) {
    return JSON.parse(encoded);
  }
  return {};
});
var parseErrorBody = async (errorBody, context) => {
  const value = await parseBody(errorBody, context);
  value.message = value.message ?? value.Message;
  return value;
};
var loadRestJsonErrorCode = (output, data) => {
  const findKey = (object, key) => Object.keys(object).find((k13) => k13.toLowerCase() === key.toLowerCase());
  const sanitizeErrorCode = (rawValue) => {
    let cleanValue = rawValue;
    if (typeof cleanValue === "number") {
      cleanValue = cleanValue.toString();
    }
    if (cleanValue.indexOf(",") >= 0) {
      cleanValue = cleanValue.split(",")[0];
    }
    if (cleanValue.indexOf(":") >= 0) {
      cleanValue = cleanValue.split(":")[0];
    }
    if (cleanValue.indexOf("#") >= 0) {
      cleanValue = cleanValue.split("#")[1];
    }
    return cleanValue;
  };
  const headerKey = findKey(output.headers, "x-amzn-errortype");
  if (headerKey !== void 0) {
    return sanitizeErrorCode(output.headers[headerKey]);
  }
  if (data.code !== void 0) {
    return sanitizeErrorCode(data.code);
  }
  if (data["__type"] !== void 0) {
    return sanitizeErrorCode(data["__type"]);
  }
};

// ../../node_modules/@aws-sdk/client-dynamodb/dist-es/commands/BatchGetItemCommand.js
var BatchGetItemCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, BatchGetItemCommand.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "DynamoDBClient";
    const commandName = "BatchGetItemCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: BatchGetItemInputFilterSensitiveLog,
      outputFilterSensitiveLog: BatchGetItemOutputFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_json1_0BatchGetItemCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_json1_0BatchGetItemCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-dynamodb/dist-es/commands/BatchWriteItemCommand.js
var BatchWriteItemCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, BatchWriteItemCommand.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "DynamoDBClient";
    const commandName = "BatchWriteItemCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: BatchWriteItemInputFilterSensitiveLog,
      outputFilterSensitiveLog: BatchWriteItemOutputFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_json1_0BatchWriteItemCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_json1_0BatchWriteItemCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-dynamodb/dist-es/commands/CreateTableCommand.js
var CreateTableCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, CreateTableCommand.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "DynamoDBClient";
    const commandName = "CreateTableCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: CreateTableInputFilterSensitiveLog,
      outputFilterSensitiveLog: CreateTableOutputFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_json1_0CreateTableCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_json1_0CreateTableCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-dynamodb/dist-es/commands/DeleteItemCommand.js
var DeleteItemCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, DeleteItemCommand.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "DynamoDBClient";
    const commandName = "DeleteItemCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: DeleteItemInputFilterSensitiveLog,
      outputFilterSensitiveLog: DeleteItemOutputFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_json1_0DeleteItemCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_json1_0DeleteItemCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-dynamodb/dist-es/commands/DescribeEndpointsCommand.js
var DescribeEndpointsCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, DescribeEndpointsCommand.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "DynamoDBClient";
    const commandName = "DescribeEndpointsCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: DescribeEndpointsRequestFilterSensitiveLog,
      outputFilterSensitiveLog: DescribeEndpointsResponseFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_json1_0DescribeEndpointsCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_json1_0DescribeEndpointsCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-dynamodb/dist-es/commands/GetItemCommand.js
var GetItemCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, GetItemCommand.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "DynamoDBClient";
    const commandName = "GetItemCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: GetItemInputFilterSensitiveLog,
      outputFilterSensitiveLog: GetItemOutputFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_json1_0GetItemCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_json1_0GetItemCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-dynamodb/dist-es/commands/ListTablesCommand.js
var ListTablesCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, ListTablesCommand.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "DynamoDBClient";
    const commandName = "ListTablesCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: ListTablesInputFilterSensitiveLog,
      outputFilterSensitiveLog: ListTablesOutputFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_json1_0ListTablesCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_json1_0ListTablesCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-dynamodb/dist-es/commands/PutItemCommand.js
var PutItemCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, PutItemCommand.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "DynamoDBClient";
    const commandName = "PutItemCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: PutItemInputFilterSensitiveLog,
      outputFilterSensitiveLog: PutItemOutputFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_json1_0PutItemCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_json1_0PutItemCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-dynamodb/dist-es/commands/QueryCommand.js
var QueryCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, QueryCommand.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "DynamoDBClient";
    const commandName = "QueryCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: QueryInputFilterSensitiveLog,
      outputFilterSensitiveLog: QueryOutputFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_json1_0QueryCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_json1_0QueryCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-dynamodb/dist-es/commands/ScanCommand.js
var ScanCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, ScanCommand.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "DynamoDBClient";
    const commandName = "ScanCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: ScanInputFilterSensitiveLog,
      outputFilterSensitiveLog: ScanOutputFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_json1_0ScanCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_json1_0ScanCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-dynamodb/dist-es/commands/TransactGetItemsCommand.js
var TransactGetItemsCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, TransactGetItemsCommand.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "DynamoDBClient";
    const commandName = "TransactGetItemsCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: TransactGetItemsInputFilterSensitiveLog,
      outputFilterSensitiveLog: TransactGetItemsOutputFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_json1_0TransactGetItemsCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_json1_0TransactGetItemsCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-dynamodb/dist-es/commands/TransactWriteItemsCommand.js
var TransactWriteItemsCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, TransactWriteItemsCommand.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "DynamoDBClient";
    const commandName = "TransactWriteItemsCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: TransactWriteItemsInputFilterSensitiveLog,
      outputFilterSensitiveLog: TransactWriteItemsOutputFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_json1_0TransactWriteItemsCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_json1_0TransactWriteItemsCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-dynamodb/dist-es/commands/UpdateItemCommand.js
var UpdateItemCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, UpdateItemCommand.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "DynamoDBClient";
    const commandName = "UpdateItemCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: UpdateItemInputFilterSensitiveLog,
      outputFilterSensitiveLog: UpdateItemOutputFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_json1_0UpdateItemCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_json1_0UpdateItemCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/util-config-provider/dist-es/booleanSelector.js
var SelectorType;
(function(SelectorType2) {
  SelectorType2["ENV"] = "env";
  SelectorType2["CONFIG"] = "shared config entry";
})(SelectorType || (SelectorType = {}));
var booleanSelector = (obj, key, type) => {
  if (!(key in obj))
    return void 0;
  if (obj[key] === "true")
    return true;
  if (obj[key] === "false")
    return false;
  throw new Error(`Cannot load ${type} "${key}". Expected "true" or "false", got ${obj[key]}.`);
};

// ../../node_modules/@aws-sdk/config-resolver/dist-es/endpointsConfig/NodeUseDualstackEndpointConfigOptions.js
var ENV_USE_DUALSTACK_ENDPOINT = "AWS_USE_DUALSTACK_ENDPOINT";
var CONFIG_USE_DUALSTACK_ENDPOINT = "use_dualstack_endpoint";
var NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS = {
  environmentVariableSelector: (env2) => booleanSelector(env2, ENV_USE_DUALSTACK_ENDPOINT, SelectorType.ENV),
  configFileSelector: (profile) => booleanSelector(profile, CONFIG_USE_DUALSTACK_ENDPOINT, SelectorType.CONFIG),
  default: false
};

// ../../node_modules/@aws-sdk/config-resolver/dist-es/endpointsConfig/NodeUseFipsEndpointConfigOptions.js
var ENV_USE_FIPS_ENDPOINT = "AWS_USE_FIPS_ENDPOINT";
var CONFIG_USE_FIPS_ENDPOINT = "use_fips_endpoint";
var NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS = {
  environmentVariableSelector: (env2) => booleanSelector(env2, ENV_USE_FIPS_ENDPOINT, SelectorType.ENV),
  configFileSelector: (profile) => booleanSelector(profile, CONFIG_USE_FIPS_ENDPOINT, SelectorType.CONFIG),
  default: false
};

// ../../node_modules/@aws-sdk/config-resolver/dist-es/regionConfig/config.js
var REGION_ENV_NAME = "AWS_REGION";
var REGION_INI_NAME = "region";
var NODE_REGION_CONFIG_OPTIONS = {
  environmentVariableSelector: (env2) => env2[REGION_ENV_NAME],
  configFileSelector: (profile) => profile[REGION_INI_NAME],
  default: () => {
    throw new Error("Region is missing");
  }
};
var NODE_REGION_CONFIG_FILE_OPTIONS = {
  preferredFile: "credentials"
};

// ../../node_modules/@aws-sdk/config-resolver/dist-es/regionConfig/isFipsRegion.js
var isFipsRegion = (region) => typeof region === "string" && (region.startsWith("fips-") || region.endsWith("-fips"));

// ../../node_modules/@aws-sdk/config-resolver/dist-es/regionConfig/getRealRegion.js
var getRealRegion = (region) => isFipsRegion(region) ? ["fips-aws-global", "aws-fips"].includes(region) ? "us-east-1" : region.replace(/fips-(dkr-|prod-)?|-fips/, "") : region;

// ../../node_modules/@aws-sdk/config-resolver/dist-es/regionConfig/resolveRegionConfig.js
var resolveRegionConfig = (input) => {
  const { region, useFipsEndpoint } = input;
  if (!region) {
    throw new Error("Region is missing");
  }
  return {
    ...input,
    region: async () => {
      if (typeof region === "string") {
        return getRealRegion(region);
      }
      const providedRegion = await region();
      return getRealRegion(providedRegion);
    },
    useFipsEndpoint: async () => {
      const providedRegion = typeof region === "string" ? region : await region();
      if (isFipsRegion(providedRegion)) {
        return true;
      }
      return typeof useFipsEndpoint !== "function" ? Promise.resolve(!!useFipsEndpoint) : useFipsEndpoint();
    }
  };
};

// ../../node_modules/@aws-sdk/middleware-content-length/dist-es/index.js
var CONTENT_LENGTH_HEADER = "content-length";
function contentLengthMiddleware(bodyLengthChecker) {
  return (next) => async (args) => {
    const request2 = args.request;
    if (HttpRequest.isInstance(request2)) {
      const { body, headers } = request2;
      if (body && Object.keys(headers).map((str) => str.toLowerCase()).indexOf(CONTENT_LENGTH_HEADER) === -1) {
        try {
          const length = bodyLengthChecker(body);
          request2.headers = {
            ...request2.headers,
            [CONTENT_LENGTH_HEADER]: String(length)
          };
        } catch (error) {
        }
      }
    }
    return next({
      ...args,
      request: request2
    });
  };
}
var contentLengthMiddlewareOptions = {
  step: "build",
  tags: ["SET_CONTENT_LENGTH", "CONTENT_LENGTH"],
  name: "contentLengthMiddleware",
  override: true
};
var getContentLengthPlugin = (options) => ({
  applyToStack: (clientStack) => {
    clientStack.add(contentLengthMiddleware(options.bodyLengthChecker), contentLengthMiddlewareOptions);
  }
});

// ../../node_modules/@aws-sdk/middleware-endpoint-discovery/dist-es/configurations.js
var ENV_ENDPOINT_DISCOVERY = ["AWS_ENABLE_ENDPOINT_DISCOVERY", "AWS_ENDPOINT_DISCOVERY_ENABLED"];
var CONFIG_ENDPOINT_DISCOVERY = "endpoint_discovery_enabled";
var isFalsy = (value) => ["false", "0"].indexOf(value) >= 0;
var NODE_ENDPOINT_DISCOVERY_CONFIG_OPTIONS = {
  environmentVariableSelector: (env2) => {
    for (let i13 = 0; i13 < ENV_ENDPOINT_DISCOVERY.length; i13++) {
      const envKey = ENV_ENDPOINT_DISCOVERY[i13];
      if (envKey in env2) {
        const value = env2[envKey];
        if (value === "") {
          throw Error(`Environment variable ${envKey} can't be empty of undefined, got "${value}"`);
        }
        return !isFalsy(value);
      }
    }
  },
  configFileSelector: (profile) => {
    if (CONFIG_ENDPOINT_DISCOVERY in profile) {
      const value = profile[CONFIG_ENDPOINT_DISCOVERY];
      if (value === void 0) {
        throw Error(`Shared config entry ${CONFIG_ENDPOINT_DISCOVERY} can't be undefined, got "${value}"`);
      }
      return !isFalsy(value);
    }
  },
  default: void 0
};

// ../../node_modules/@aws-sdk/endpoint-cache/dist-es/EndpointCache.js
var import_lru_cache = __toESM(require_lru_cache());
var EndpointCache = class {
  constructor(capacity) {
    this.cache = new import_lru_cache.default(capacity);
  }
  getEndpoint(key) {
    const endpointsWithExpiry = this.get(key);
    if (!endpointsWithExpiry || endpointsWithExpiry.length === 0) {
      return void 0;
    }
    const endpoints = endpointsWithExpiry.map((endpoint) => endpoint.Address);
    return endpoints[Math.floor(Math.random() * endpoints.length)];
  }
  get(key) {
    if (!this.has(key)) {
      return;
    }
    const value = this.cache.get(key);
    if (!value) {
      return;
    }
    const now = Date.now();
    const endpointsWithExpiry = value.filter((endpoint) => now < endpoint.Expires);
    if (endpointsWithExpiry.length === 0) {
      this.delete(key);
      return void 0;
    }
    return endpointsWithExpiry;
  }
  set(key, endpoints) {
    const now = Date.now();
    this.cache.set(key, endpoints.map(({ Address, CachePeriodInMinutes }) => ({
      Address,
      Expires: now + CachePeriodInMinutes * 60 * 1e3
    })));
  }
  delete(key) {
    this.cache.set(key, []);
  }
  has(key) {
    if (!this.cache.has(key)) {
      return false;
    }
    const endpoints = this.cache.peek(key);
    if (!endpoints) {
      return false;
    }
    return endpoints.length > 0;
  }
  clear() {
    this.cache.clear();
  }
};

// ../../node_modules/@aws-sdk/middleware-endpoint-discovery/dist-es/resolveEndpointDiscoveryConfig.js
var resolveEndpointDiscoveryConfig = (input, { endpointDiscoveryCommandCtor }) => ({
  ...input,
  endpointDiscoveryCommandCtor,
  endpointCache: new EndpointCache(input.endpointCacheSize ?? 1e3),
  endpointDiscoveryEnabled: input.endpointDiscoveryEnabled !== void 0 ? () => Promise.resolve(input.endpointDiscoveryEnabled) : input.endpointDiscoveryEnabledProvider,
  isClientEndpointDiscoveryEnabled: input.endpointDiscoveryEnabled !== void 0
});

// ../../node_modules/@aws-sdk/middleware-host-header/dist-es/index.js
function resolveHostHeaderConfig(input) {
  return input;
}
var hostHeaderMiddleware = (options) => (next) => async (args) => {
  if (!HttpRequest.isInstance(args.request))
    return next(args);
  const { request: request2 } = args;
  const { handlerProtocol = "" } = options.requestHandler.metadata || {};
  if (handlerProtocol.indexOf("h2") >= 0 && !request2.headers[":authority"]) {
    delete request2.headers["host"];
    request2.headers[":authority"] = "";
  } else if (!request2.headers["host"]) {
    request2.headers["host"] = request2.hostname;
  }
  return next(args);
};
var hostHeaderMiddlewareOptions = {
  name: "hostHeaderMiddleware",
  step: "build",
  priority: "low",
  tags: ["HOST"],
  override: true
};
var getHostHeaderPlugin = (options) => ({
  applyToStack: (clientStack) => {
    clientStack.add(hostHeaderMiddleware(options), hostHeaderMiddlewareOptions);
  }
});

// ../../node_modules/@aws-sdk/middleware-logger/dist-es/loggerMiddleware.js
var loggerMiddleware = () => (next, context) => async (args) => {
  const response = await next(args);
  const { clientName, commandName, logger: logger2, inputFilterSensitiveLog, outputFilterSensitiveLog, dynamoDbDocumentClientOptions = {} } = context;
  const { overrideInputFilterSensitiveLog, overrideOutputFilterSensitiveLog } = dynamoDbDocumentClientOptions;
  if (!logger2) {
    return response;
  }
  if (typeof logger2.info === "function") {
    const { $metadata, ...outputWithoutMetadata } = response.output;
    logger2.info({
      clientName,
      commandName,
      input: (overrideInputFilterSensitiveLog ?? inputFilterSensitiveLog)(args.input),
      output: (overrideOutputFilterSensitiveLog ?? outputFilterSensitiveLog)(outputWithoutMetadata),
      metadata: $metadata
    });
  }
  return response;
};
var loggerMiddlewareOptions = {
  name: "loggerMiddleware",
  tags: ["LOGGER"],
  step: "initialize",
  override: true
};
var getLoggerPlugin = (options) => ({
  applyToStack: (clientStack) => {
    clientStack.add(loggerMiddleware(), loggerMiddlewareOptions);
  }
});

// ../../node_modules/@aws-sdk/middleware-recursion-detection/dist-es/index.js
var TRACE_ID_HEADER_NAME = "X-Amzn-Trace-Id";
var ENV_LAMBDA_FUNCTION_NAME = "AWS_LAMBDA_FUNCTION_NAME";
var ENV_TRACE_ID = "_X_AMZN_TRACE_ID";
var recursionDetectionMiddleware = (options) => (next) => async (args) => {
  const { request: request2 } = args;
  if (!HttpRequest.isInstance(request2) || options.runtime !== "node" || request2.headers.hasOwnProperty(TRACE_ID_HEADER_NAME)) {
    return next(args);
  }
  const functionName = process.env[ENV_LAMBDA_FUNCTION_NAME];
  const traceId = process.env[ENV_TRACE_ID];
  const nonEmptyString = (str) => typeof str === "string" && str.length > 0;
  if (nonEmptyString(functionName) && nonEmptyString(traceId)) {
    request2.headers[TRACE_ID_HEADER_NAME] = traceId;
  }
  return next({
    ...args,
    request: request2
  });
};
var addRecursionDetectionMiddlewareOptions = {
  step: "build",
  tags: ["RECURSION_DETECTION"],
  name: "recursionDetectionMiddleware",
  override: true,
  priority: "low"
};
var getRecursionDetectionPlugin = (options) => ({
  applyToStack: (clientStack) => {
    clientStack.add(recursionDetectionMiddleware(options), addRecursionDetectionMiddlewareOptions);
  }
});

// ../../node_modules/@aws-sdk/util-retry/dist-es/config.js
var RETRY_MODES;
(function(RETRY_MODES2) {
  RETRY_MODES2["STANDARD"] = "standard";
  RETRY_MODES2["ADAPTIVE"] = "adaptive";
})(RETRY_MODES || (RETRY_MODES = {}));
var DEFAULT_MAX_ATTEMPTS = 3;
var DEFAULT_RETRY_MODE = "STANDARD";

// ../../node_modules/@aws-sdk/service-error-classification/dist-es/constants.js
var THROTTLING_ERROR_CODES = [
  "BandwidthLimitExceeded",
  "EC2ThrottledException",
  "LimitExceededException",
  "PriorRequestNotComplete",
  "ProvisionedThroughputExceededException",
  "RequestLimitExceeded",
  "RequestThrottled",
  "RequestThrottledException",
  "SlowDown",
  "ThrottledException",
  "Throttling",
  "ThrottlingException",
  "TooManyRequestsException",
  "TransactionInProgressException"
];
var TRANSIENT_ERROR_CODES = ["AbortError", "TimeoutError", "RequestTimeout", "RequestTimeoutException"];
var TRANSIENT_ERROR_STATUS_CODES = [500, 502, 503, 504];
var NODEJS_TIMEOUT_ERROR_CODES = ["ECONNRESET", "EPIPE", "ETIMEDOUT"];

// ../../node_modules/@aws-sdk/service-error-classification/dist-es/index.js
var isThrottlingError = (error) => error.$metadata?.httpStatusCode === 429 || THROTTLING_ERROR_CODES.includes(error.name) || error.$retryable?.throttling == true;
var isTransientError = (error) => TRANSIENT_ERROR_CODES.includes(error.name) || NODEJS_TIMEOUT_ERROR_CODES.includes(error?.code || "") || TRANSIENT_ERROR_STATUS_CODES.includes(error.$metadata?.httpStatusCode || 0);
var isServerError = (error) => {
  if (error.$metadata?.httpStatusCode !== void 0) {
    const statusCode = error.$metadata.httpStatusCode;
    if (500 <= statusCode && statusCode <= 599 && !isTransientError(error)) {
      return true;
    }
    return false;
  }
  return false;
};

// ../../node_modules/@aws-sdk/util-retry/dist-es/DefaultRateLimiter.js
var DefaultRateLimiter = class {
  constructor(options) {
    this.currentCapacity = 0;
    this.enabled = false;
    this.lastMaxRate = 0;
    this.measuredTxRate = 0;
    this.requestCount = 0;
    this.lastTimestamp = 0;
    this.timeWindow = 0;
    this.beta = options?.beta ?? 0.7;
    this.minCapacity = options?.minCapacity ?? 1;
    this.minFillRate = options?.minFillRate ?? 0.5;
    this.scaleConstant = options?.scaleConstant ?? 0.4;
    this.smooth = options?.smooth ?? 0.8;
    const currentTimeInSeconds = this.getCurrentTimeInSeconds();
    this.lastThrottleTime = currentTimeInSeconds;
    this.lastTxRateBucket = Math.floor(this.getCurrentTimeInSeconds());
    this.fillRate = this.minFillRate;
    this.maxCapacity = this.minCapacity;
  }
  getCurrentTimeInSeconds() {
    return Date.now() / 1e3;
  }
  async getSendToken() {
    return this.acquireTokenBucket(1);
  }
  async acquireTokenBucket(amount) {
    if (!this.enabled) {
      return;
    }
    this.refillTokenBucket();
    if (amount > this.currentCapacity) {
      const delay = (amount - this.currentCapacity) / this.fillRate * 1e3;
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
    this.currentCapacity = this.currentCapacity - amount;
  }
  refillTokenBucket() {
    const timestamp = this.getCurrentTimeInSeconds();
    if (!this.lastTimestamp) {
      this.lastTimestamp = timestamp;
      return;
    }
    const fillAmount = (timestamp - this.lastTimestamp) * this.fillRate;
    this.currentCapacity = Math.min(this.maxCapacity, this.currentCapacity + fillAmount);
    this.lastTimestamp = timestamp;
  }
  updateClientSendingRate(response) {
    let calculatedRate;
    this.updateMeasuredRate();
    if (isThrottlingError(response)) {
      const rateToUse = !this.enabled ? this.measuredTxRate : Math.min(this.measuredTxRate, this.fillRate);
      this.lastMaxRate = rateToUse;
      this.calculateTimeWindow();
      this.lastThrottleTime = this.getCurrentTimeInSeconds();
      calculatedRate = this.cubicThrottle(rateToUse);
      this.enableTokenBucket();
    } else {
      this.calculateTimeWindow();
      calculatedRate = this.cubicSuccess(this.getCurrentTimeInSeconds());
    }
    const newRate = Math.min(calculatedRate, 2 * this.measuredTxRate);
    this.updateTokenBucketRate(newRate);
  }
  calculateTimeWindow() {
    this.timeWindow = this.getPrecise(Math.pow(this.lastMaxRate * (1 - this.beta) / this.scaleConstant, 1 / 3));
  }
  cubicThrottle(rateToUse) {
    return this.getPrecise(rateToUse * this.beta);
  }
  cubicSuccess(timestamp) {
    return this.getPrecise(this.scaleConstant * Math.pow(timestamp - this.lastThrottleTime - this.timeWindow, 3) + this.lastMaxRate);
  }
  enableTokenBucket() {
    this.enabled = true;
  }
  updateTokenBucketRate(newRate) {
    this.refillTokenBucket();
    this.fillRate = Math.max(newRate, this.minFillRate);
    this.maxCapacity = Math.max(newRate, this.minCapacity);
    this.currentCapacity = Math.min(this.currentCapacity, this.maxCapacity);
  }
  updateMeasuredRate() {
    const t8 = this.getCurrentTimeInSeconds();
    const timeBucket = Math.floor(t8 * 2) / 2;
    this.requestCount++;
    if (timeBucket > this.lastTxRateBucket) {
      const currentRate = this.requestCount / (timeBucket - this.lastTxRateBucket);
      this.measuredTxRate = this.getPrecise(currentRate * this.smooth + this.measuredTxRate * (1 - this.smooth));
      this.requestCount = 0;
      this.lastTxRateBucket = timeBucket;
    }
  }
  getPrecise(num) {
    return parseFloat(num.toFixed(8));
  }
};

// ../../node_modules/@aws-sdk/util-retry/dist-es/constants.js
var DEFAULT_RETRY_DELAY_BASE = 100;
var MAXIMUM_RETRY_DELAY = 20 * 1e3;
var THROTTLING_RETRY_DELAY_BASE = 500;
var INITIAL_RETRY_TOKENS = 500;
var RETRY_COST = 5;
var TIMEOUT_RETRY_COST = 10;
var NO_RETRY_INCREMENT = 1;
var INVOCATION_ID_HEADER = "amz-sdk-invocation-id";
var REQUEST_HEADER = "amz-sdk-request";

// ../../node_modules/@aws-sdk/util-retry/dist-es/defaultRetryBackoffStrategy.js
var getDefaultRetryBackoffStrategy = () => {
  let delayBase = DEFAULT_RETRY_DELAY_BASE;
  const computeNextBackoffDelay = (attempts) => {
    return Math.floor(Math.min(MAXIMUM_RETRY_DELAY, Math.random() * 2 ** attempts * delayBase));
  };
  const setDelayBase = (delay) => {
    delayBase = delay;
  };
  return {
    computeNextBackoffDelay,
    setDelayBase
  };
};

// ../../node_modules/@aws-sdk/util-retry/dist-es/defaultRetryToken.js
var getDefaultRetryToken = (initialRetryTokens, initialRetryDelay, initialRetryCount, options) => {
  const MAX_CAPACITY = initialRetryTokens;
  const retryCost = options?.retryCost ?? RETRY_COST;
  const timeoutRetryCost = options?.timeoutRetryCost ?? TIMEOUT_RETRY_COST;
  const retryBackoffStrategy = options?.retryBackoffStrategy ?? getDefaultRetryBackoffStrategy();
  let availableCapacity = initialRetryTokens;
  let retryDelay = Math.min(MAXIMUM_RETRY_DELAY, initialRetryDelay);
  let lastRetryCost = void 0;
  let retryCount = initialRetryCount ?? 0;
  const getCapacityAmount = (errorType) => errorType === "TRANSIENT" ? timeoutRetryCost : retryCost;
  const getRetryCount = () => retryCount;
  const getRetryDelay = () => retryDelay;
  const getLastRetryCost = () => lastRetryCost;
  const hasRetryTokens = (errorType) => getCapacityAmount(errorType) <= availableCapacity;
  const getRetryTokenCount = (errorInfo) => {
    const errorType = errorInfo.errorType;
    if (!hasRetryTokens(errorType)) {
      throw new Error("No retry token available");
    }
    const capacityAmount = getCapacityAmount(errorType);
    const delayBase = errorType === "THROTTLING" ? THROTTLING_RETRY_DELAY_BASE : DEFAULT_RETRY_DELAY_BASE;
    retryBackoffStrategy.setDelayBase(delayBase);
    const delayFromErrorType = retryBackoffStrategy.computeNextBackoffDelay(retryCount);
    if (errorInfo.retryAfterHint) {
      const delayFromRetryAfterHint = errorInfo.retryAfterHint.getTime() - Date.now();
      retryDelay = Math.max(delayFromRetryAfterHint || 0, delayFromErrorType);
    } else {
      retryDelay = delayFromErrorType;
    }
    retryCount++;
    lastRetryCost = capacityAmount;
    availableCapacity -= capacityAmount;
    return capacityAmount;
  };
  const releaseRetryTokens = (releaseAmount) => {
    availableCapacity += releaseAmount ?? NO_RETRY_INCREMENT;
    availableCapacity = Math.min(availableCapacity, MAX_CAPACITY);
  };
  return {
    getRetryCount,
    getRetryDelay,
    getLastRetryCost,
    hasRetryTokens,
    getRetryTokenCount,
    releaseRetryTokens
  };
};

// ../../node_modules/@aws-sdk/util-retry/dist-es/StandardRetryStrategy.js
var StandardRetryStrategy = class {
  constructor(maxAttemptsProvider) {
    this.maxAttemptsProvider = maxAttemptsProvider;
    this.mode = RETRY_MODES.STANDARD;
    this.retryToken = getDefaultRetryToken(INITIAL_RETRY_TOKENS, DEFAULT_RETRY_DELAY_BASE);
    this.maxAttemptsProvider = maxAttemptsProvider;
  }
  async acquireInitialRetryToken(retryTokenScope) {
    return this.retryToken;
  }
  async refreshRetryTokenForRetry(tokenToRenew, errorInfo) {
    const maxAttempts = await this.getMaxAttempts();
    if (this.shouldRetry(tokenToRenew, errorInfo, maxAttempts)) {
      tokenToRenew.getRetryTokenCount(errorInfo);
      return tokenToRenew;
    }
    throw new Error("No retry token available");
  }
  recordSuccess(token) {
    this.retryToken.releaseRetryTokens(token.getLastRetryCost());
  }
  async getMaxAttempts() {
    let maxAttempts;
    try {
      return await this.maxAttemptsProvider();
    } catch (error) {
      console.warn(`Max attempts provider could not resolve. Using default of ${DEFAULT_MAX_ATTEMPTS}`);
      return DEFAULT_MAX_ATTEMPTS;
    }
  }
  shouldRetry(tokenToRenew, errorInfo, maxAttempts) {
    const attempts = tokenToRenew.getRetryCount();
    return attempts < maxAttempts && tokenToRenew.hasRetryTokens(errorInfo.errorType) && this.isRetryableError(errorInfo.errorType);
  }
  isRetryableError(errorType) {
    return errorType === "THROTTLING" || errorType === "TRANSIENT";
  }
};

// ../../node_modules/@aws-sdk/util-retry/dist-es/AdaptiveRetryStrategy.js
var AdaptiveRetryStrategy = class {
  constructor(maxAttemptsProvider, options) {
    this.maxAttemptsProvider = maxAttemptsProvider;
    this.mode = RETRY_MODES.ADAPTIVE;
    const { rateLimiter } = options ?? {};
    this.rateLimiter = rateLimiter ?? new DefaultRateLimiter();
    this.standardRetryStrategy = new StandardRetryStrategy(maxAttemptsProvider);
  }
  async acquireInitialRetryToken(retryTokenScope) {
    await this.rateLimiter.getSendToken();
    return this.standardRetryStrategy.acquireInitialRetryToken(retryTokenScope);
  }
  async refreshRetryTokenForRetry(tokenToRenew, errorInfo) {
    this.rateLimiter.updateClientSendingRate(errorInfo);
    return this.standardRetryStrategy.refreshRetryTokenForRetry(tokenToRenew, errorInfo);
  }
  recordSuccess(token) {
    this.rateLimiter.updateClientSendingRate({});
    this.standardRetryStrategy.recordSuccess(token);
  }
};

// ../../node_modules/@aws-sdk/middleware-retry/node_modules/uuid/wrapper.mjs
var import_dist2 = __toESM(require_dist2(), 1);
var v12 = import_dist2.default.v1;
var v32 = import_dist2.default.v3;
var v42 = import_dist2.default.v4;
var v52 = import_dist2.default.v5;
var NIL2 = import_dist2.default.NIL;
var version2 = import_dist2.default.version;
var validate2 = import_dist2.default.validate;
var stringify2 = import_dist2.default.stringify;
var parse2 = import_dist2.default.parse;

// ../../node_modules/@aws-sdk/middleware-retry/dist-es/util.js
var asSdkError = (error) => {
  if (error instanceof Error)
    return error;
  if (error instanceof Object)
    return Object.assign(new Error(), error);
  if (typeof error === "string")
    return new Error(error);
  return new Error(`AWS SDK error wrapper for ${error}`);
};

// ../../node_modules/@aws-sdk/middleware-retry/dist-es/configurations.js
var ENV_MAX_ATTEMPTS = "AWS_MAX_ATTEMPTS";
var CONFIG_MAX_ATTEMPTS = "max_attempts";
var NODE_MAX_ATTEMPT_CONFIG_OPTIONS = {
  environmentVariableSelector: (env2) => {
    const value = env2[ENV_MAX_ATTEMPTS];
    if (!value)
      return void 0;
    const maxAttempt = parseInt(value);
    if (Number.isNaN(maxAttempt)) {
      throw new Error(`Environment variable ${ENV_MAX_ATTEMPTS} mast be a number, got "${value}"`);
    }
    return maxAttempt;
  },
  configFileSelector: (profile) => {
    const value = profile[CONFIG_MAX_ATTEMPTS];
    if (!value)
      return void 0;
    const maxAttempt = parseInt(value);
    if (Number.isNaN(maxAttempt)) {
      throw new Error(`Shared config file entry ${CONFIG_MAX_ATTEMPTS} mast be a number, got "${value}"`);
    }
    return maxAttempt;
  },
  default: DEFAULT_MAX_ATTEMPTS
};
var resolveRetryConfig = (input) => {
  const { retryStrategy } = input;
  const maxAttempts = normalizeProvider(input.maxAttempts ?? DEFAULT_MAX_ATTEMPTS);
  return {
    ...input,
    maxAttempts,
    retryStrategy: async () => {
      if (retryStrategy) {
        return retryStrategy;
      }
      const retryMode = await normalizeProvider(input.retryMode)();
      if (retryMode === RETRY_MODES.ADAPTIVE) {
        return new AdaptiveRetryStrategy(maxAttempts);
      }
      return new StandardRetryStrategy(maxAttempts);
    }
  };
};
var ENV_RETRY_MODE = "AWS_RETRY_MODE";
var CONFIG_RETRY_MODE = "retry_mode";
var NODE_RETRY_MODE_CONFIG_OPTIONS = {
  environmentVariableSelector: (env2) => env2[ENV_RETRY_MODE],
  configFileSelector: (profile) => profile[CONFIG_RETRY_MODE],
  default: DEFAULT_RETRY_MODE
};

// ../../node_modules/@aws-sdk/middleware-retry/dist-es/omitRetryHeadersMiddleware.js
var omitRetryHeadersMiddleware = () => (next) => async (args) => {
  const { request: request2 } = args;
  if (HttpRequest.isInstance(request2)) {
    delete request2.headers[INVOCATION_ID_HEADER];
    delete request2.headers[REQUEST_HEADER];
  }
  return next(args);
};
var omitRetryHeadersMiddlewareOptions = {
  name: "omitRetryHeadersMiddleware",
  tags: ["RETRY", "HEADERS", "OMIT_RETRY_HEADERS"],
  relation: "before",
  toMiddleware: "awsAuthMiddleware",
  override: true
};
var getOmitRetryHeadersPlugin = (options) => ({
  applyToStack: (clientStack) => {
    clientStack.addRelativeTo(omitRetryHeadersMiddleware(), omitRetryHeadersMiddlewareOptions);
  }
});

// ../../node_modules/@aws-sdk/middleware-retry/dist-es/retryMiddleware.js
var retryMiddleware = (options) => (next, context) => async (args) => {
  let retryStrategy = await options.retryStrategy();
  const maxAttempts = await options.maxAttempts();
  if (isRetryStrategyV2(retryStrategy)) {
    retryStrategy = retryStrategy;
    let retryToken = await retryStrategy.acquireInitialRetryToken(context["partition_id"]);
    let lastError = new Error();
    let attempts = 0;
    let totalRetryDelay = 0;
    const { request: request2 } = args;
    if (HttpRequest.isInstance(request2)) {
      request2.headers[INVOCATION_ID_HEADER] = v42();
    }
    while (true) {
      try {
        if (HttpRequest.isInstance(request2)) {
          request2.headers[REQUEST_HEADER] = `attempt=${attempts + 1}; max=${maxAttempts}`;
        }
        const { response, output } = await next(args);
        retryStrategy.recordSuccess(retryToken);
        output.$metadata.attempts = attempts + 1;
        output.$metadata.totalRetryDelay = totalRetryDelay;
        return { response, output };
      } catch (e13) {
        const retryErrorInfo = getRetyErrorInto(e13);
        lastError = asSdkError(e13);
        try {
          retryToken = await retryStrategy.refreshRetryTokenForRetry(retryToken, retryErrorInfo);
        } catch (refreshError) {
          if (!lastError.$metadata) {
            lastError.$metadata = {};
          }
          lastError.$metadata.attempts = attempts + 1;
          lastError.$metadata.totalRetryDelay = totalRetryDelay;
          throw lastError;
        }
        attempts = retryToken.getRetryCount();
        const delay = retryToken.getRetryDelay();
        totalRetryDelay += delay;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  } else {
    retryStrategy = retryStrategy;
    if (retryStrategy?.mode)
      context.userAgent = [...context.userAgent || [], ["cfg/retry-mode", retryStrategy.mode]];
    return retryStrategy.retry(next, args);
  }
};
var isRetryStrategyV2 = (retryStrategy) => typeof retryStrategy.acquireInitialRetryToken !== "undefined" && typeof retryStrategy.refreshRetryTokenForRetry !== "undefined" && typeof retryStrategy.recordSuccess !== "undefined";
var getRetyErrorInto = (error) => {
  const errorInfo = {
    errorType: getRetryErrorType(error)
  };
  const retryAfterHint = getRetryAfterHint(error.$response);
  if (retryAfterHint) {
    errorInfo.retryAfterHint = retryAfterHint;
  }
  return errorInfo;
};
var getRetryErrorType = (error) => {
  if (isThrottlingError(error))
    return "THROTTLING";
  if (isTransientError(error))
    return "TRANSIENT";
  if (isServerError(error))
    return "SERVER_ERROR";
  return "CLIENT_ERROR";
};
var retryMiddlewareOptions = {
  name: "retryMiddleware",
  tags: ["RETRY"],
  step: "finalizeRequest",
  priority: "high",
  override: true
};
var getRetryPlugin = (options) => ({
  applyToStack: (clientStack) => {
    clientStack.add(retryMiddleware(options), retryMiddlewareOptions);
  }
});
var getRetryAfterHint = (response) => {
  if (!HttpResponse.isInstance(response))
    return;
  const retryAfterHeaderName = Object.keys(response.headers).find((key) => key.toLowerCase() === "retry-after");
  if (!retryAfterHeaderName)
    return;
  const retryAfter = response.headers[retryAfterHeaderName];
  const retryAfterSeconds = Number(retryAfter);
  if (!Number.isNaN(retryAfterSeconds))
    return new Date(retryAfterSeconds * 1e3);
  const retryAfterDate = new Date(retryAfter);
  return retryAfterDate;
};

// ../../node_modules/@aws-sdk/property-provider/dist-es/ProviderError.js
var ProviderError = class extends Error {
  constructor(message, tryNextLink = true) {
    super(message);
    this.tryNextLink = tryNextLink;
    this.name = "ProviderError";
    Object.setPrototypeOf(this, ProviderError.prototype);
  }
  static from(error, tryNextLink = true) {
    return Object.assign(new this(error.message, tryNextLink), error);
  }
};

// ../../node_modules/@aws-sdk/property-provider/dist-es/CredentialsProviderError.js
var CredentialsProviderError = class extends ProviderError {
  constructor(message, tryNextLink = true) {
    super(message, tryNextLink);
    this.tryNextLink = tryNextLink;
    this.name = "CredentialsProviderError";
    Object.setPrototypeOf(this, CredentialsProviderError.prototype);
  }
};

// ../../node_modules/@aws-sdk/property-provider/dist-es/TokenProviderError.js
var TokenProviderError = class extends ProviderError {
  constructor(message, tryNextLink = true) {
    super(message, tryNextLink);
    this.tryNextLink = tryNextLink;
    this.name = "TokenProviderError";
    Object.setPrototypeOf(this, TokenProviderError.prototype);
  }
};

// ../../node_modules/@aws-sdk/property-provider/dist-es/chain.js
function chain(...providers) {
  return () => {
    let promise = Promise.reject(new ProviderError("No providers in chain"));
    for (const provider of providers) {
      promise = promise.catch((err) => {
        if (err?.tryNextLink) {
          return provider();
        }
        throw err;
      });
    }
    return promise;
  };
}

// ../../node_modules/@aws-sdk/property-provider/dist-es/fromStatic.js
var fromStatic = (staticValue) => () => Promise.resolve(staticValue);

// ../../node_modules/@aws-sdk/property-provider/dist-es/memoize.js
var memoize = (provider, isExpired, requiresRefresh) => {
  let resolved;
  let pending;
  let hasResult;
  let isConstant = false;
  const coalesceProvider = async () => {
    if (!pending) {
      pending = provider();
    }
    try {
      resolved = await pending;
      hasResult = true;
      isConstant = false;
    } finally {
      pending = void 0;
    }
    return resolved;
  };
  if (isExpired === void 0) {
    return async (options) => {
      if (!hasResult || options?.forceRefresh) {
        resolved = await coalesceProvider();
      }
      return resolved;
    };
  }
  return async (options) => {
    if (!hasResult || options?.forceRefresh) {
      resolved = await coalesceProvider();
    }
    if (isConstant) {
      return resolved;
    }
    if (requiresRefresh && !requiresRefresh(resolved)) {
      isConstant = true;
      return resolved;
    }
    if (isExpired(resolved)) {
      await coalesceProvider();
      return resolved;
    }
    return resolved;
  };
};

// ../../node_modules/@aws-sdk/util-hex-encoding/dist-es/index.js
var SHORT_TO_HEX = {};
var HEX_TO_SHORT = {};
for (let i13 = 0; i13 < 256; i13++) {
  let encodedByte = i13.toString(16).toLowerCase();
  if (encodedByte.length === 1) {
    encodedByte = `0${encodedByte}`;
  }
  SHORT_TO_HEX[i13] = encodedByte;
  HEX_TO_SHORT[encodedByte] = i13;
}
function toHex(bytes) {
  let out = "";
  for (let i13 = 0; i13 < bytes.byteLength; i13++) {
    out += SHORT_TO_HEX[bytes[i13]];
  }
  return out;
}

// ../../node_modules/@aws-sdk/is-array-buffer/dist-es/index.js
var isArrayBuffer = (arg) => typeof ArrayBuffer === "function" && arg instanceof ArrayBuffer || Object.prototype.toString.call(arg) === "[object ArrayBuffer]";

// ../../node_modules/@aws-sdk/util-buffer-from/dist-es/index.js
var import_buffer = require("buffer");
var fromArrayBuffer = (input, offset = 0, length = input.byteLength - offset) => {
  if (!isArrayBuffer(input)) {
    throw new TypeError(`The "input" argument must be ArrayBuffer. Received type ${typeof input} (${input})`);
  }
  return import_buffer.Buffer.from(input, offset, length);
};
var fromString = (input, encoding) => {
  if (typeof input !== "string") {
    throw new TypeError(`The "input" argument must be of type string. Received type ${typeof input} (${input})`);
  }
  return encoding ? import_buffer.Buffer.from(input, encoding) : import_buffer.Buffer.from(input);
};

// ../../node_modules/@aws-sdk/util-utf8/dist-es/fromUtf8.js
var fromUtf8 = (input) => {
  const buf = fromString(input, "utf8");
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength / Uint8Array.BYTES_PER_ELEMENT);
};

// ../../node_modules/@aws-sdk/util-utf8/dist-es/toUint8Array.js
var toUint8Array = (data) => {
  if (typeof data === "string") {
    return fromUtf8(data);
  }
  if (ArrayBuffer.isView(data)) {
    return new Uint8Array(data.buffer, data.byteOffset, data.byteLength / Uint8Array.BYTES_PER_ELEMENT);
  }
  return new Uint8Array(data);
};

// ../../node_modules/@aws-sdk/signature-v4/dist-es/constants.js
var ALGORITHM_QUERY_PARAM = "X-Amz-Algorithm";
var CREDENTIAL_QUERY_PARAM = "X-Amz-Credential";
var AMZ_DATE_QUERY_PARAM = "X-Amz-Date";
var SIGNED_HEADERS_QUERY_PARAM = "X-Amz-SignedHeaders";
var EXPIRES_QUERY_PARAM = "X-Amz-Expires";
var SIGNATURE_QUERY_PARAM = "X-Amz-Signature";
var TOKEN_QUERY_PARAM = "X-Amz-Security-Token";
var AUTH_HEADER = "authorization";
var AMZ_DATE_HEADER = AMZ_DATE_QUERY_PARAM.toLowerCase();
var DATE_HEADER = "date";
var GENERATED_HEADERS = [AUTH_HEADER, AMZ_DATE_HEADER, DATE_HEADER];
var SIGNATURE_HEADER = SIGNATURE_QUERY_PARAM.toLowerCase();
var SHA256_HEADER = "x-amz-content-sha256";
var TOKEN_HEADER = TOKEN_QUERY_PARAM.toLowerCase();
var ALWAYS_UNSIGNABLE_HEADERS = {
  authorization: true,
  "cache-control": true,
  connection: true,
  expect: true,
  from: true,
  "keep-alive": true,
  "max-forwards": true,
  pragma: true,
  referer: true,
  te: true,
  trailer: true,
  "transfer-encoding": true,
  upgrade: true,
  "user-agent": true,
  "x-amzn-trace-id": true
};
var PROXY_HEADER_PATTERN = /^proxy-/;
var SEC_HEADER_PATTERN = /^sec-/;
var ALGORITHM_IDENTIFIER = "AWS4-HMAC-SHA256";
var EVENT_ALGORITHM_IDENTIFIER = "AWS4-HMAC-SHA256-PAYLOAD";
var UNSIGNED_PAYLOAD = "UNSIGNED-PAYLOAD";
var MAX_CACHE_SIZE = 50;
var KEY_TYPE_IDENTIFIER = "aws4_request";
var MAX_PRESIGNED_TTL = 60 * 60 * 24 * 7;

// ../../node_modules/@aws-sdk/signature-v4/dist-es/credentialDerivation.js
var signingKeyCache = {};
var cacheQueue = [];
var createScope = (shortDate, region, service) => `${shortDate}/${region}/${service}/${KEY_TYPE_IDENTIFIER}`;
var getSigningKey = async (sha256Constructor, credentials, shortDate, region, service) => {
  const credsHash = await hmac(sha256Constructor, credentials.secretAccessKey, credentials.accessKeyId);
  const cacheKey = `${shortDate}:${region}:${service}:${toHex(credsHash)}:${credentials.sessionToken}`;
  if (cacheKey in signingKeyCache) {
    return signingKeyCache[cacheKey];
  }
  cacheQueue.push(cacheKey);
  while (cacheQueue.length > MAX_CACHE_SIZE) {
    delete signingKeyCache[cacheQueue.shift()];
  }
  let key = `AWS4${credentials.secretAccessKey}`;
  for (const signable of [shortDate, region, service, KEY_TYPE_IDENTIFIER]) {
    key = await hmac(sha256Constructor, key, signable);
  }
  return signingKeyCache[cacheKey] = key;
};
var hmac = (ctor, secret, data) => {
  const hash = new ctor(secret);
  hash.update(toUint8Array(data));
  return hash.digest();
};

// ../../node_modules/@aws-sdk/signature-v4/dist-es/getCanonicalHeaders.js
var getCanonicalHeaders = ({ headers }, unsignableHeaders, signableHeaders) => {
  const canonical = {};
  for (const headerName of Object.keys(headers).sort()) {
    if (headers[headerName] == void 0) {
      continue;
    }
    const canonicalHeaderName = headerName.toLowerCase();
    if (canonicalHeaderName in ALWAYS_UNSIGNABLE_HEADERS || unsignableHeaders?.has(canonicalHeaderName) || PROXY_HEADER_PATTERN.test(canonicalHeaderName) || SEC_HEADER_PATTERN.test(canonicalHeaderName)) {
      if (!signableHeaders || signableHeaders && !signableHeaders.has(canonicalHeaderName)) {
        continue;
      }
    }
    canonical[canonicalHeaderName] = headers[headerName].trim().replace(/\s+/g, " ");
  }
  return canonical;
};

// ../../node_modules/@aws-sdk/util-uri-escape/dist-es/escape-uri.js
var escapeUri = (uri) => encodeURIComponent(uri).replace(/[!'()*]/g, hexEncode);
var hexEncode = (c13) => `%${c13.charCodeAt(0).toString(16).toUpperCase()}`;

// ../../node_modules/@aws-sdk/signature-v4/dist-es/getCanonicalQuery.js
var getCanonicalQuery = ({ query = {} }) => {
  const keys = [];
  const serialized = {};
  for (const key of Object.keys(query).sort()) {
    if (key.toLowerCase() === SIGNATURE_HEADER) {
      continue;
    }
    keys.push(key);
    const value = query[key];
    if (typeof value === "string") {
      serialized[key] = `${escapeUri(key)}=${escapeUri(value)}`;
    } else if (Array.isArray(value)) {
      serialized[key] = value.slice(0).sort().reduce((encoded, value2) => encoded.concat([`${escapeUri(key)}=${escapeUri(value2)}`]), []).join("&");
    }
  }
  return keys.map((key) => serialized[key]).filter((serialized2) => serialized2).join("&");
};

// ../../node_modules/@aws-sdk/signature-v4/dist-es/getPayloadHash.js
var getPayloadHash = async ({ headers, body }, hashConstructor) => {
  for (const headerName of Object.keys(headers)) {
    if (headerName.toLowerCase() === SHA256_HEADER) {
      return headers[headerName];
    }
  }
  if (body == void 0) {
    return "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855";
  } else if (typeof body === "string" || ArrayBuffer.isView(body) || isArrayBuffer(body)) {
    const hashCtor = new hashConstructor();
    hashCtor.update(toUint8Array(body));
    return toHex(await hashCtor.digest());
  }
  return UNSIGNED_PAYLOAD;
};

// ../../node_modules/@aws-sdk/signature-v4/dist-es/headerUtil.js
var hasHeader = (soughtHeader, headers) => {
  soughtHeader = soughtHeader.toLowerCase();
  for (const headerName of Object.keys(headers)) {
    if (soughtHeader === headerName.toLowerCase()) {
      return true;
    }
  }
  return false;
};

// ../../node_modules/@aws-sdk/signature-v4/dist-es/cloneRequest.js
var cloneRequest = ({ headers, query, ...rest }) => ({
  ...rest,
  headers: { ...headers },
  query: query ? cloneQuery2(query) : void 0
});
var cloneQuery2 = (query) => Object.keys(query).reduce((carry, paramName) => {
  const param = query[paramName];
  return {
    ...carry,
    [paramName]: Array.isArray(param) ? [...param] : param
  };
}, {});

// ../../node_modules/@aws-sdk/signature-v4/dist-es/moveHeadersToQuery.js
var moveHeadersToQuery = (request2, options = {}) => {
  const { headers, query = {} } = typeof request2.clone === "function" ? request2.clone() : cloneRequest(request2);
  for (const name of Object.keys(headers)) {
    const lname = name.toLowerCase();
    if (lname.slice(0, 6) === "x-amz-" && !options.unhoistableHeaders?.has(lname)) {
      query[name] = headers[name];
      delete headers[name];
    }
  }
  return {
    ...request2,
    headers,
    query
  };
};

// ../../node_modules/@aws-sdk/signature-v4/dist-es/prepareRequest.js
var prepareRequest = (request2) => {
  request2 = typeof request2.clone === "function" ? request2.clone() : cloneRequest(request2);
  for (const headerName of Object.keys(request2.headers)) {
    if (GENERATED_HEADERS.indexOf(headerName.toLowerCase()) > -1) {
      delete request2.headers[headerName];
    }
  }
  return request2;
};

// ../../node_modules/@aws-sdk/signature-v4/dist-es/utilDate.js
var iso8601 = (time) => toDate(time).toISOString().replace(/\.\d{3}Z$/, "Z");
var toDate = (time) => {
  if (typeof time === "number") {
    return new Date(time * 1e3);
  }
  if (typeof time === "string") {
    if (Number(time)) {
      return new Date(Number(time) * 1e3);
    }
    return new Date(time);
  }
  return time;
};

// ../../node_modules/@aws-sdk/signature-v4/dist-es/SignatureV4.js
var SignatureV4 = class {
  constructor({ applyChecksum, credentials, region, service, sha256, uriEscapePath = true }) {
    this.service = service;
    this.sha256 = sha256;
    this.uriEscapePath = uriEscapePath;
    this.applyChecksum = typeof applyChecksum === "boolean" ? applyChecksum : true;
    this.regionProvider = normalizeProvider(region);
    this.credentialProvider = normalizeProvider(credentials);
  }
  async presign(originalRequest, options = {}) {
    const { signingDate = new Date(), expiresIn = 3600, unsignableHeaders, unhoistableHeaders, signableHeaders, signingRegion, signingService } = options;
    const credentials = await this.credentialProvider();
    this.validateResolvedCredentials(credentials);
    const region = signingRegion ?? await this.regionProvider();
    const { longDate, shortDate } = formatDate(signingDate);
    if (expiresIn > MAX_PRESIGNED_TTL) {
      return Promise.reject("Signature version 4 presigned URLs must have an expiration date less than one week in the future");
    }
    const scope = createScope(shortDate, region, signingService ?? this.service);
    const request2 = moveHeadersToQuery(prepareRequest(originalRequest), { unhoistableHeaders });
    if (credentials.sessionToken) {
      request2.query[TOKEN_QUERY_PARAM] = credentials.sessionToken;
    }
    request2.query[ALGORITHM_QUERY_PARAM] = ALGORITHM_IDENTIFIER;
    request2.query[CREDENTIAL_QUERY_PARAM] = `${credentials.accessKeyId}/${scope}`;
    request2.query[AMZ_DATE_QUERY_PARAM] = longDate;
    request2.query[EXPIRES_QUERY_PARAM] = expiresIn.toString(10);
    const canonicalHeaders = getCanonicalHeaders(request2, unsignableHeaders, signableHeaders);
    request2.query[SIGNED_HEADERS_QUERY_PARAM] = getCanonicalHeaderList(canonicalHeaders);
    request2.query[SIGNATURE_QUERY_PARAM] = await this.getSignature(longDate, scope, this.getSigningKey(credentials, region, shortDate, signingService), this.createCanonicalRequest(request2, canonicalHeaders, await getPayloadHash(originalRequest, this.sha256)));
    return request2;
  }
  async sign(toSign, options) {
    if (typeof toSign === "string") {
      return this.signString(toSign, options);
    } else if (toSign.headers && toSign.payload) {
      return this.signEvent(toSign, options);
    } else {
      return this.signRequest(toSign, options);
    }
  }
  async signEvent({ headers, payload }, { signingDate = new Date(), priorSignature, signingRegion, signingService }) {
    const region = signingRegion ?? await this.regionProvider();
    const { shortDate, longDate } = formatDate(signingDate);
    const scope = createScope(shortDate, region, signingService ?? this.service);
    const hashedPayload = await getPayloadHash({ headers: {}, body: payload }, this.sha256);
    const hash = new this.sha256();
    hash.update(headers);
    const hashedHeaders = toHex(await hash.digest());
    const stringToSign = [
      EVENT_ALGORITHM_IDENTIFIER,
      longDate,
      scope,
      priorSignature,
      hashedHeaders,
      hashedPayload
    ].join("\n");
    return this.signString(stringToSign, { signingDate, signingRegion: region, signingService });
  }
  async signString(stringToSign, { signingDate = new Date(), signingRegion, signingService } = {}) {
    const credentials = await this.credentialProvider();
    this.validateResolvedCredentials(credentials);
    const region = signingRegion ?? await this.regionProvider();
    const { shortDate } = formatDate(signingDate);
    const hash = new this.sha256(await this.getSigningKey(credentials, region, shortDate, signingService));
    hash.update(toUint8Array(stringToSign));
    return toHex(await hash.digest());
  }
  async signRequest(requestToSign, { signingDate = new Date(), signableHeaders, unsignableHeaders, signingRegion, signingService } = {}) {
    const credentials = await this.credentialProvider();
    this.validateResolvedCredentials(credentials);
    const region = signingRegion ?? await this.regionProvider();
    const request2 = prepareRequest(requestToSign);
    const { longDate, shortDate } = formatDate(signingDate);
    const scope = createScope(shortDate, region, signingService ?? this.service);
    request2.headers[AMZ_DATE_HEADER] = longDate;
    if (credentials.sessionToken) {
      request2.headers[TOKEN_HEADER] = credentials.sessionToken;
    }
    const payloadHash = await getPayloadHash(request2, this.sha256);
    if (!hasHeader(SHA256_HEADER, request2.headers) && this.applyChecksum) {
      request2.headers[SHA256_HEADER] = payloadHash;
    }
    const canonicalHeaders = getCanonicalHeaders(request2, unsignableHeaders, signableHeaders);
    const signature = await this.getSignature(longDate, scope, this.getSigningKey(credentials, region, shortDate, signingService), this.createCanonicalRequest(request2, canonicalHeaders, payloadHash));
    request2.headers[AUTH_HEADER] = `${ALGORITHM_IDENTIFIER} Credential=${credentials.accessKeyId}/${scope}, SignedHeaders=${getCanonicalHeaderList(canonicalHeaders)}, Signature=${signature}`;
    return request2;
  }
  createCanonicalRequest(request2, canonicalHeaders, payloadHash) {
    const sortedHeaders = Object.keys(canonicalHeaders).sort();
    return `${request2.method}
${this.getCanonicalPath(request2)}
${getCanonicalQuery(request2)}
${sortedHeaders.map((name) => `${name}:${canonicalHeaders[name]}`).join("\n")}

${sortedHeaders.join(";")}
${payloadHash}`;
  }
  async createStringToSign(longDate, credentialScope, canonicalRequest) {
    const hash = new this.sha256();
    hash.update(toUint8Array(canonicalRequest));
    const hashedRequest = await hash.digest();
    return `${ALGORITHM_IDENTIFIER}
${longDate}
${credentialScope}
${toHex(hashedRequest)}`;
  }
  getCanonicalPath({ path }) {
    if (this.uriEscapePath) {
      const normalizedPathSegments = [];
      for (const pathSegment of path.split("/")) {
        if (pathSegment?.length === 0)
          continue;
        if (pathSegment === ".")
          continue;
        if (pathSegment === "..") {
          normalizedPathSegments.pop();
        } else {
          normalizedPathSegments.push(pathSegment);
        }
      }
      const normalizedPath = `${path?.startsWith("/") ? "/" : ""}${normalizedPathSegments.join("/")}${normalizedPathSegments.length > 0 && path?.endsWith("/") ? "/" : ""}`;
      const doubleEncoded = encodeURIComponent(normalizedPath);
      return doubleEncoded.replace(/%2F/g, "/");
    }
    return path;
  }
  async getSignature(longDate, credentialScope, keyPromise, canonicalRequest) {
    const stringToSign = await this.createStringToSign(longDate, credentialScope, canonicalRequest);
    const hash = new this.sha256(await keyPromise);
    hash.update(toUint8Array(stringToSign));
    return toHex(await hash.digest());
  }
  getSigningKey(credentials, region, shortDate, service) {
    return getSigningKey(this.sha256, credentials, shortDate, region, service || this.service);
  }
  validateResolvedCredentials(credentials) {
    if (typeof credentials !== "object" || typeof credentials.accessKeyId !== "string" || typeof credentials.secretAccessKey !== "string") {
      throw new Error("Resolved credential object is not valid");
    }
  }
};
var formatDate = (now) => {
  const longDate = iso8601(now).replace(/[\-:]/g, "");
  return {
    longDate,
    shortDate: longDate.slice(0, 8)
  };
};
var getCanonicalHeaderList = (headers) => Object.keys(headers).sort().join(";");

// ../../node_modules/@aws-sdk/middleware-signing/dist-es/configurations.js
var CREDENTIAL_EXPIRE_WINDOW = 3e5;
var resolveAwsAuthConfig = (input) => {
  const normalizedCreds = input.credentials ? normalizeCredentialProvider(input.credentials) : input.credentialDefaultProvider(input);
  const { signingEscapePath = true, systemClockOffset = input.systemClockOffset || 0, sha256 } = input;
  let signer;
  if (input.signer) {
    signer = normalizeProvider(input.signer);
  } else if (input.regionInfoProvider) {
    signer = () => normalizeProvider(input.region)().then(async (region) => [
      await input.regionInfoProvider(region, {
        useFipsEndpoint: await input.useFipsEndpoint(),
        useDualstackEndpoint: await input.useDualstackEndpoint()
      }) || {},
      region
    ]).then(([regionInfo, region]) => {
      const { signingRegion, signingService } = regionInfo;
      input.signingRegion = input.signingRegion || signingRegion || region;
      input.signingName = input.signingName || signingService || input.serviceId;
      const params = {
        ...input,
        credentials: normalizedCreds,
        region: input.signingRegion,
        service: input.signingName,
        sha256,
        uriEscapePath: signingEscapePath
      };
      const SignerCtor = input.signerConstructor || SignatureV4;
      return new SignerCtor(params);
    });
  } else {
    signer = async (authScheme) => {
      authScheme = Object.assign({}, {
        name: "sigv4",
        signingName: input.signingName || input.defaultSigningName,
        signingRegion: await normalizeProvider(input.region)(),
        properties: {}
      }, authScheme);
      const signingRegion = authScheme.signingRegion;
      const signingService = authScheme.signingName;
      input.signingRegion = input.signingRegion || signingRegion;
      input.signingName = input.signingName || signingService || input.serviceId;
      const params = {
        ...input,
        credentials: normalizedCreds,
        region: input.signingRegion,
        service: input.signingName,
        sha256,
        uriEscapePath: signingEscapePath
      };
      const SignerCtor = input.signerConstructor || SignatureV4;
      return new SignerCtor(params);
    };
  }
  return {
    ...input,
    systemClockOffset,
    signingEscapePath,
    credentials: normalizedCreds,
    signer
  };
};
var normalizeCredentialProvider = (credentials) => {
  if (typeof credentials === "function") {
    return memoize(credentials, (credentials2) => credentials2.expiration !== void 0 && credentials2.expiration.getTime() - Date.now() < CREDENTIAL_EXPIRE_WINDOW, (credentials2) => credentials2.expiration !== void 0);
  }
  return normalizeProvider(credentials);
};

// ../../node_modules/@aws-sdk/middleware-signing/dist-es/utils/getSkewCorrectedDate.js
var getSkewCorrectedDate = (systemClockOffset) => new Date(Date.now() + systemClockOffset);

// ../../node_modules/@aws-sdk/middleware-signing/dist-es/utils/isClockSkewed.js
var isClockSkewed = (clockTime, systemClockOffset) => Math.abs(getSkewCorrectedDate(systemClockOffset).getTime() - clockTime) >= 3e5;

// ../../node_modules/@aws-sdk/middleware-signing/dist-es/utils/getUpdatedSystemClockOffset.js
var getUpdatedSystemClockOffset = (clockTime, currentSystemClockOffset) => {
  const clockTimeInMs = Date.parse(clockTime);
  if (isClockSkewed(clockTimeInMs, currentSystemClockOffset)) {
    return clockTimeInMs - Date.now();
  }
  return currentSystemClockOffset;
};

// ../../node_modules/@aws-sdk/middleware-signing/dist-es/middleware.js
var awsAuthMiddleware = (options) => (next, context) => async function(args) {
  if (!HttpRequest.isInstance(args.request))
    return next(args);
  const authScheme = context.endpointV2?.properties?.authSchemes?.[0];
  const multiRegionOverride = authScheme?.name === "sigv4a" ? authScheme?.signingRegionSet?.join(",") : void 0;
  const signer = await options.signer(authScheme);
  const output = await next({
    ...args,
    request: await signer.sign(args.request, {
      signingDate: getSkewCorrectedDate(options.systemClockOffset),
      signingRegion: multiRegionOverride || context["signing_region"],
      signingService: context["signing_service"]
    })
  }).catch((error) => {
    const serverTime = error.ServerTime ?? getDateHeader(error.$response);
    if (serverTime) {
      options.systemClockOffset = getUpdatedSystemClockOffset(serverTime, options.systemClockOffset);
    }
    throw error;
  });
  const dateHeader = getDateHeader(output.response);
  if (dateHeader) {
    options.systemClockOffset = getUpdatedSystemClockOffset(dateHeader, options.systemClockOffset);
  }
  return output;
};
var getDateHeader = (response) => HttpResponse.isInstance(response) ? response.headers?.date ?? response.headers?.Date : void 0;
var awsAuthMiddlewareOptions = {
  name: "awsAuthMiddleware",
  tags: ["SIGNATURE", "AWSAUTH"],
  relation: "after",
  toMiddleware: "retryMiddleware",
  override: true
};
var getAwsAuthPlugin = (options) => ({
  applyToStack: (clientStack) => {
    clientStack.addRelativeTo(awsAuthMiddleware(options), awsAuthMiddlewareOptions);
  }
});

// ../../node_modules/@aws-sdk/middleware-user-agent/dist-es/configurations.js
function resolveUserAgentConfig(input) {
  return {
    ...input,
    customUserAgent: typeof input.customUserAgent === "string" ? [[input.customUserAgent]] : input.customUserAgent
  };
}

// ../../node_modules/@aws-sdk/middleware-user-agent/dist-es/constants.js
var USER_AGENT = "user-agent";
var X_AMZ_USER_AGENT = "x-amz-user-agent";
var SPACE = " ";
var UA_ESCAPE_REGEX = /[^\!\#\$\%\&\'\*\+\-\.\^\_\`\|\~\d\w]/g;

// ../../node_modules/@aws-sdk/middleware-user-agent/dist-es/user-agent-middleware.js
var userAgentMiddleware = (options) => (next, context) => async (args) => {
  const { request: request2 } = args;
  if (!HttpRequest.isInstance(request2))
    return next(args);
  const { headers } = request2;
  const userAgent = context?.userAgent?.map(escapeUserAgent) || [];
  const defaultUserAgent2 = (await options.defaultUserAgentProvider()).map(escapeUserAgent);
  const customUserAgent = options?.customUserAgent?.map(escapeUserAgent) || [];
  const sdkUserAgentValue = [...defaultUserAgent2, ...userAgent, ...customUserAgent].join(SPACE);
  const normalUAValue = [
    ...defaultUserAgent2.filter((section) => section.startsWith("aws-sdk-")),
    ...customUserAgent
  ].join(SPACE);
  if (options.runtime !== "browser") {
    if (normalUAValue) {
      headers[X_AMZ_USER_AGENT] = headers[X_AMZ_USER_AGENT] ? `${headers[USER_AGENT]} ${normalUAValue}` : normalUAValue;
    }
    headers[USER_AGENT] = sdkUserAgentValue;
  } else {
    headers[X_AMZ_USER_AGENT] = sdkUserAgentValue;
  }
  return next({
    ...args,
    request: request2
  });
};
var escapeUserAgent = ([name, version4]) => {
  const prefixSeparatorIndex = name.indexOf("/");
  const prefix = name.substring(0, prefixSeparatorIndex);
  let uaName = name.substring(prefixSeparatorIndex + 1);
  if (prefix === "api") {
    uaName = uaName.toLowerCase();
  }
  return [prefix, uaName, version4].filter((item) => item && item.length > 0).map((item) => item?.replace(UA_ESCAPE_REGEX, "_")).join("/");
};
var getUserAgentMiddlewareOptions = {
  name: "getUserAgentMiddleware",
  step: "build",
  priority: "low",
  tags: ["SET_USER_AGENT", "USER_AGENT"],
  override: true
};
var getUserAgentPlugin = (config) => ({
  applyToStack: (clientStack) => {
    clientStack.add(userAgentMiddleware(config), getUserAgentMiddlewareOptions);
  }
});

// ../../node_modules/@aws-sdk/client-dynamodb/dist-es/endpoint/EndpointParameters.js
var resolveClientEndpointParameters = (options) => {
  return {
    ...options,
    useDualstackEndpoint: options.useDualstackEndpoint ?? false,
    useFipsEndpoint: options.useFipsEndpoint ?? false,
    defaultSigningName: "dynamodb"
  };
};

// ../../node_modules/@aws-sdk/client-dynamodb/package.json
var package_default = {
  name: "@aws-sdk/client-dynamodb",
  description: "AWS SDK for JavaScript Dynamodb Client for Node.js, Browser and React Native",
  version: "3.256.0",
  scripts: {
    build: "concurrently 'yarn:build:cjs' 'yarn:build:es' 'yarn:build:types'",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "build:docs": "typedoc",
    "build:es": "tsc -p tsconfig.es.json",
    "build:include:deps": "lerna run --scope $npm_package_name --include-dependencies build",
    "build:types": "tsc -p tsconfig.types.json",
    "build:types:downlevel": "downlevel-dts dist-types dist-types/ts3.4",
    clean: "rimraf ./dist-* && rimraf *.tsbuildinfo",
    "generate:client": "node ../../scripts/generate-clients/single-service --solo dynamodb"
  },
  main: "./dist-cjs/index.js",
  types: "./dist-types/index.d.ts",
  module: "./dist-es/index.js",
  sideEffects: false,
  dependencies: {
    "@aws-crypto/sha256-browser": "3.0.0",
    "@aws-crypto/sha256-js": "3.0.0",
    "@aws-sdk/client-sts": "3.256.0",
    "@aws-sdk/config-resolver": "3.254.0",
    "@aws-sdk/credential-provider-node": "3.256.0",
    "@aws-sdk/fetch-http-handler": "3.254.0",
    "@aws-sdk/hash-node": "3.254.0",
    "@aws-sdk/invalid-dependency": "3.254.0",
    "@aws-sdk/middleware-content-length": "3.254.0",
    "@aws-sdk/middleware-endpoint": "3.254.0",
    "@aws-sdk/middleware-endpoint-discovery": "3.254.0",
    "@aws-sdk/middleware-host-header": "3.254.0",
    "@aws-sdk/middleware-logger": "3.254.0",
    "@aws-sdk/middleware-recursion-detection": "3.254.0",
    "@aws-sdk/middleware-retry": "3.254.0",
    "@aws-sdk/middleware-serde": "3.254.0",
    "@aws-sdk/middleware-signing": "3.254.0",
    "@aws-sdk/middleware-stack": "3.254.0",
    "@aws-sdk/middleware-user-agent": "3.254.0",
    "@aws-sdk/node-config-provider": "3.254.0",
    "@aws-sdk/node-http-handler": "3.254.0",
    "@aws-sdk/protocol-http": "3.254.0",
    "@aws-sdk/smithy-client": "3.254.0",
    "@aws-sdk/types": "3.254.0",
    "@aws-sdk/url-parser": "3.254.0",
    "@aws-sdk/util-base64": "3.208.0",
    "@aws-sdk/util-body-length-browser": "3.188.0",
    "@aws-sdk/util-body-length-node": "3.208.0",
    "@aws-sdk/util-defaults-mode-browser": "3.254.0",
    "@aws-sdk/util-defaults-mode-node": "3.254.0",
    "@aws-sdk/util-endpoints": "3.254.0",
    "@aws-sdk/util-retry": "3.254.0",
    "@aws-sdk/util-user-agent-browser": "3.254.0",
    "@aws-sdk/util-user-agent-node": "3.254.0",
    "@aws-sdk/util-utf8-browser": "3.188.0",
    "@aws-sdk/util-utf8-node": "3.208.0",
    "@aws-sdk/util-waiter": "3.254.0",
    tslib: "^2.3.1",
    uuid: "^8.3.2"
  },
  devDependencies: {
    "@aws-sdk/service-client-documentation-generator": "3.208.0",
    "@tsconfig/node14": "1.0.3",
    "@types/node": "^14.14.31",
    "@types/uuid": "^8.3.0",
    concurrently: "7.0.0",
    "downlevel-dts": "0.10.1",
    rimraf: "3.0.2",
    typedoc: "0.19.2",
    typescript: "~4.6.2"
  },
  overrides: {
    typedoc: {
      typescript: "~4.6.2"
    }
  },
  engines: {
    node: ">=14.0.0"
  },
  typesVersions: {
    "<4.0": {
      "dist-types/*": [
        "dist-types/ts3.4/*"
      ]
    }
  },
  files: [
    "dist-*"
  ],
  author: {
    name: "AWS SDK for JavaScript Team",
    url: "https://aws.amazon.com/javascript/"
  },
  license: "Apache-2.0",
  browser: {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.browser"
  },
  "react-native": {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.native"
  },
  homepage: "https://github.com/aws/aws-sdk-js-v3/tree/main/clients/client-dynamodb",
  repository: {
    type: "git",
    url: "https://github.com/aws/aws-sdk-js-v3.git",
    directory: "clients/client-dynamodb"
  }
};

// ../../node_modules/@aws-sdk/client-sts/dist-es/models/STSServiceException.js
var STSServiceException = class extends ServiceException {
  constructor(options) {
    super(options);
    Object.setPrototypeOf(this, STSServiceException.prototype);
  }
};

// ../../node_modules/@aws-sdk/client-sts/dist-es/models/models_0.js
var ExpiredTokenException = class extends STSServiceException {
  constructor(opts) {
    super({
      name: "ExpiredTokenException",
      $fault: "client",
      ...opts
    });
    this.name = "ExpiredTokenException";
    this.$fault = "client";
    Object.setPrototypeOf(this, ExpiredTokenException.prototype);
  }
};
var MalformedPolicyDocumentException = class extends STSServiceException {
  constructor(opts) {
    super({
      name: "MalformedPolicyDocumentException",
      $fault: "client",
      ...opts
    });
    this.name = "MalformedPolicyDocumentException";
    this.$fault = "client";
    Object.setPrototypeOf(this, MalformedPolicyDocumentException.prototype);
  }
};
var PackedPolicyTooLargeException = class extends STSServiceException {
  constructor(opts) {
    super({
      name: "PackedPolicyTooLargeException",
      $fault: "client",
      ...opts
    });
    this.name = "PackedPolicyTooLargeException";
    this.$fault = "client";
    Object.setPrototypeOf(this, PackedPolicyTooLargeException.prototype);
  }
};
var RegionDisabledException = class extends STSServiceException {
  constructor(opts) {
    super({
      name: "RegionDisabledException",
      $fault: "client",
      ...opts
    });
    this.name = "RegionDisabledException";
    this.$fault = "client";
    Object.setPrototypeOf(this, RegionDisabledException.prototype);
  }
};
var IDPRejectedClaimException = class extends STSServiceException {
  constructor(opts) {
    super({
      name: "IDPRejectedClaimException",
      $fault: "client",
      ...opts
    });
    this.name = "IDPRejectedClaimException";
    this.$fault = "client";
    Object.setPrototypeOf(this, IDPRejectedClaimException.prototype);
  }
};
var InvalidIdentityTokenException = class extends STSServiceException {
  constructor(opts) {
    super({
      name: "InvalidIdentityTokenException",
      $fault: "client",
      ...opts
    });
    this.name = "InvalidIdentityTokenException";
    this.$fault = "client";
    Object.setPrototypeOf(this, InvalidIdentityTokenException.prototype);
  }
};
var IDPCommunicationErrorException = class extends STSServiceException {
  constructor(opts) {
    super({
      name: "IDPCommunicationErrorException",
      $fault: "client",
      ...opts
    });
    this.name = "IDPCommunicationErrorException";
    this.$fault = "client";
    Object.setPrototypeOf(this, IDPCommunicationErrorException.prototype);
  }
};
var AssumeRoleRequestFilterSensitiveLog = (obj) => ({
  ...obj
});
var AssumeRoleResponseFilterSensitiveLog = (obj) => ({
  ...obj
});
var AssumeRoleWithWebIdentityRequestFilterSensitiveLog = (obj) => ({
  ...obj
});
var AssumeRoleWithWebIdentityResponseFilterSensitiveLog = (obj) => ({
  ...obj
});

// ../../node_modules/@aws-sdk/client-sts/dist-es/protocols/Aws_query.js
var import_fast_xml_parser = __toESM(require_fxp());
var serializeAws_queryAssumeRoleCommand = async (input, context) => {
  const headers = {
    "content-type": "application/x-www-form-urlencoded"
  };
  let body;
  body = buildFormUrlencodedString({
    ...serializeAws_queryAssumeRoleRequest(input, context),
    Action: "AssumeRole",
    Version: "2011-06-15"
  });
  return buildHttpRpcRequest2(context, headers, "/", void 0, body);
};
var serializeAws_queryAssumeRoleWithWebIdentityCommand = async (input, context) => {
  const headers = {
    "content-type": "application/x-www-form-urlencoded"
  };
  let body;
  body = buildFormUrlencodedString({
    ...serializeAws_queryAssumeRoleWithWebIdentityRequest(input, context),
    Action: "AssumeRoleWithWebIdentity",
    Version: "2011-06-15"
  });
  return buildHttpRpcRequest2(context, headers, "/", void 0, body);
};
var deserializeAws_queryAssumeRoleCommand = async (output, context) => {
  if (output.statusCode >= 300) {
    return deserializeAws_queryAssumeRoleCommandError(output, context);
  }
  const data = await parseBody2(output.body, context);
  let contents = {};
  contents = deserializeAws_queryAssumeRoleResponse(data.AssumeRoleResult, context);
  const response = {
    $metadata: deserializeMetadata3(output),
    ...contents
  };
  return Promise.resolve(response);
};
var deserializeAws_queryAssumeRoleCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody2(output.body, context)
  };
  const errorCode = loadQueryErrorCode(output, parsedOutput.body);
  switch (errorCode) {
    case "ExpiredTokenException":
    case "com.amazonaws.sts#ExpiredTokenException":
      throw await deserializeAws_queryExpiredTokenExceptionResponse(parsedOutput, context);
    case "MalformedPolicyDocument":
    case "com.amazonaws.sts#MalformedPolicyDocumentException":
      throw await deserializeAws_queryMalformedPolicyDocumentExceptionResponse(parsedOutput, context);
    case "PackedPolicyTooLarge":
    case "com.amazonaws.sts#PackedPolicyTooLargeException":
      throw await deserializeAws_queryPackedPolicyTooLargeExceptionResponse(parsedOutput, context);
    case "RegionDisabledException":
    case "com.amazonaws.sts#RegionDisabledException":
      throw await deserializeAws_queryRegionDisabledExceptionResponse(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody: parsedBody.Error,
        exceptionCtor: STSServiceException,
        errorCode
      });
  }
};
var deserializeAws_queryAssumeRoleWithWebIdentityCommand = async (output, context) => {
  if (output.statusCode >= 300) {
    return deserializeAws_queryAssumeRoleWithWebIdentityCommandError(output, context);
  }
  const data = await parseBody2(output.body, context);
  let contents = {};
  contents = deserializeAws_queryAssumeRoleWithWebIdentityResponse(data.AssumeRoleWithWebIdentityResult, context);
  const response = {
    $metadata: deserializeMetadata3(output),
    ...contents
  };
  return Promise.resolve(response);
};
var deserializeAws_queryAssumeRoleWithWebIdentityCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody2(output.body, context)
  };
  const errorCode = loadQueryErrorCode(output, parsedOutput.body);
  switch (errorCode) {
    case "ExpiredTokenException":
    case "com.amazonaws.sts#ExpiredTokenException":
      throw await deserializeAws_queryExpiredTokenExceptionResponse(parsedOutput, context);
    case "IDPCommunicationError":
    case "com.amazonaws.sts#IDPCommunicationErrorException":
      throw await deserializeAws_queryIDPCommunicationErrorExceptionResponse(parsedOutput, context);
    case "IDPRejectedClaim":
    case "com.amazonaws.sts#IDPRejectedClaimException":
      throw await deserializeAws_queryIDPRejectedClaimExceptionResponse(parsedOutput, context);
    case "InvalidIdentityToken":
    case "com.amazonaws.sts#InvalidIdentityTokenException":
      throw await deserializeAws_queryInvalidIdentityTokenExceptionResponse(parsedOutput, context);
    case "MalformedPolicyDocument":
    case "com.amazonaws.sts#MalformedPolicyDocumentException":
      throw await deserializeAws_queryMalformedPolicyDocumentExceptionResponse(parsedOutput, context);
    case "PackedPolicyTooLarge":
    case "com.amazonaws.sts#PackedPolicyTooLargeException":
      throw await deserializeAws_queryPackedPolicyTooLargeExceptionResponse(parsedOutput, context);
    case "RegionDisabledException":
    case "com.amazonaws.sts#RegionDisabledException":
      throw await deserializeAws_queryRegionDisabledExceptionResponse(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody: parsedBody.Error,
        exceptionCtor: STSServiceException,
        errorCode
      });
  }
};
var deserializeAws_queryExpiredTokenExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryExpiredTokenException(body.Error, context);
  const exception = new ExpiredTokenException({
    $metadata: deserializeMetadata3(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryIDPCommunicationErrorExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryIDPCommunicationErrorException(body.Error, context);
  const exception = new IDPCommunicationErrorException({
    $metadata: deserializeMetadata3(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryIDPRejectedClaimExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryIDPRejectedClaimException(body.Error, context);
  const exception = new IDPRejectedClaimException({
    $metadata: deserializeMetadata3(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryInvalidIdentityTokenExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryInvalidIdentityTokenException(body.Error, context);
  const exception = new InvalidIdentityTokenException({
    $metadata: deserializeMetadata3(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryMalformedPolicyDocumentExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryMalformedPolicyDocumentException(body.Error, context);
  const exception = new MalformedPolicyDocumentException({
    $metadata: deserializeMetadata3(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryPackedPolicyTooLargeExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryPackedPolicyTooLargeException(body.Error, context);
  const exception = new PackedPolicyTooLargeException({
    $metadata: deserializeMetadata3(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryRegionDisabledExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryRegionDisabledException(body.Error, context);
  const exception = new RegionDisabledException({
    $metadata: deserializeMetadata3(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var serializeAws_queryAssumeRoleRequest = (input, context) => {
  const entries = {};
  if (input.RoleArn != null) {
    entries["RoleArn"] = input.RoleArn;
  }
  if (input.RoleSessionName != null) {
    entries["RoleSessionName"] = input.RoleSessionName;
  }
  if (input.PolicyArns != null) {
    const memberEntries = serializeAws_querypolicyDescriptorListType(input.PolicyArns, context);
    if (input.PolicyArns?.length === 0) {
      entries.PolicyArns = [];
    }
    Object.entries(memberEntries).forEach(([key, value]) => {
      const loc = `PolicyArns.${key}`;
      entries[loc] = value;
    });
  }
  if (input.Policy != null) {
    entries["Policy"] = input.Policy;
  }
  if (input.DurationSeconds != null) {
    entries["DurationSeconds"] = input.DurationSeconds;
  }
  if (input.Tags != null) {
    const memberEntries = serializeAws_querytagListType(input.Tags, context);
    if (input.Tags?.length === 0) {
      entries.Tags = [];
    }
    Object.entries(memberEntries).forEach(([key, value]) => {
      const loc = `Tags.${key}`;
      entries[loc] = value;
    });
  }
  if (input.TransitiveTagKeys != null) {
    const memberEntries = serializeAws_querytagKeyListType(input.TransitiveTagKeys, context);
    if (input.TransitiveTagKeys?.length === 0) {
      entries.TransitiveTagKeys = [];
    }
    Object.entries(memberEntries).forEach(([key, value]) => {
      const loc = `TransitiveTagKeys.${key}`;
      entries[loc] = value;
    });
  }
  if (input.ExternalId != null) {
    entries["ExternalId"] = input.ExternalId;
  }
  if (input.SerialNumber != null) {
    entries["SerialNumber"] = input.SerialNumber;
  }
  if (input.TokenCode != null) {
    entries["TokenCode"] = input.TokenCode;
  }
  if (input.SourceIdentity != null) {
    entries["SourceIdentity"] = input.SourceIdentity;
  }
  return entries;
};
var serializeAws_queryAssumeRoleWithWebIdentityRequest = (input, context) => {
  const entries = {};
  if (input.RoleArn != null) {
    entries["RoleArn"] = input.RoleArn;
  }
  if (input.RoleSessionName != null) {
    entries["RoleSessionName"] = input.RoleSessionName;
  }
  if (input.WebIdentityToken != null) {
    entries["WebIdentityToken"] = input.WebIdentityToken;
  }
  if (input.ProviderId != null) {
    entries["ProviderId"] = input.ProviderId;
  }
  if (input.PolicyArns != null) {
    const memberEntries = serializeAws_querypolicyDescriptorListType(input.PolicyArns, context);
    if (input.PolicyArns?.length === 0) {
      entries.PolicyArns = [];
    }
    Object.entries(memberEntries).forEach(([key, value]) => {
      const loc = `PolicyArns.${key}`;
      entries[loc] = value;
    });
  }
  if (input.Policy != null) {
    entries["Policy"] = input.Policy;
  }
  if (input.DurationSeconds != null) {
    entries["DurationSeconds"] = input.DurationSeconds;
  }
  return entries;
};
var serializeAws_querypolicyDescriptorListType = (input, context) => {
  const entries = {};
  let counter = 1;
  for (const entry of input) {
    if (entry === null) {
      continue;
    }
    const memberEntries = serializeAws_queryPolicyDescriptorType(entry, context);
    Object.entries(memberEntries).forEach(([key, value]) => {
      entries[`member.${counter}.${key}`] = value;
    });
    counter++;
  }
  return entries;
};
var serializeAws_queryPolicyDescriptorType = (input, context) => {
  const entries = {};
  if (input.arn != null) {
    entries["arn"] = input.arn;
  }
  return entries;
};
var serializeAws_queryTag = (input, context) => {
  const entries = {};
  if (input.Key != null) {
    entries["Key"] = input.Key;
  }
  if (input.Value != null) {
    entries["Value"] = input.Value;
  }
  return entries;
};
var serializeAws_querytagKeyListType = (input, context) => {
  const entries = {};
  let counter = 1;
  for (const entry of input) {
    if (entry === null) {
      continue;
    }
    entries[`member.${counter}`] = entry;
    counter++;
  }
  return entries;
};
var serializeAws_querytagListType = (input, context) => {
  const entries = {};
  let counter = 1;
  for (const entry of input) {
    if (entry === null) {
      continue;
    }
    const memberEntries = serializeAws_queryTag(entry, context);
    Object.entries(memberEntries).forEach(([key, value]) => {
      entries[`member.${counter}.${key}`] = value;
    });
    counter++;
  }
  return entries;
};
var deserializeAws_queryAssumedRoleUser = (output, context) => {
  const contents = {
    AssumedRoleId: void 0,
    Arn: void 0
  };
  if (output["AssumedRoleId"] !== void 0) {
    contents.AssumedRoleId = expectString(output["AssumedRoleId"]);
  }
  if (output["Arn"] !== void 0) {
    contents.Arn = expectString(output["Arn"]);
  }
  return contents;
};
var deserializeAws_queryAssumeRoleResponse = (output, context) => {
  const contents = {
    Credentials: void 0,
    AssumedRoleUser: void 0,
    PackedPolicySize: void 0,
    SourceIdentity: void 0
  };
  if (output["Credentials"] !== void 0) {
    contents.Credentials = deserializeAws_queryCredentials(output["Credentials"], context);
  }
  if (output["AssumedRoleUser"] !== void 0) {
    contents.AssumedRoleUser = deserializeAws_queryAssumedRoleUser(output["AssumedRoleUser"], context);
  }
  if (output["PackedPolicySize"] !== void 0) {
    contents.PackedPolicySize = strictParseInt32(output["PackedPolicySize"]);
  }
  if (output["SourceIdentity"] !== void 0) {
    contents.SourceIdentity = expectString(output["SourceIdentity"]);
  }
  return contents;
};
var deserializeAws_queryAssumeRoleWithWebIdentityResponse = (output, context) => {
  const contents = {
    Credentials: void 0,
    SubjectFromWebIdentityToken: void 0,
    AssumedRoleUser: void 0,
    PackedPolicySize: void 0,
    Provider: void 0,
    Audience: void 0,
    SourceIdentity: void 0
  };
  if (output["Credentials"] !== void 0) {
    contents.Credentials = deserializeAws_queryCredentials(output["Credentials"], context);
  }
  if (output["SubjectFromWebIdentityToken"] !== void 0) {
    contents.SubjectFromWebIdentityToken = expectString(output["SubjectFromWebIdentityToken"]);
  }
  if (output["AssumedRoleUser"] !== void 0) {
    contents.AssumedRoleUser = deserializeAws_queryAssumedRoleUser(output["AssumedRoleUser"], context);
  }
  if (output["PackedPolicySize"] !== void 0) {
    contents.PackedPolicySize = strictParseInt32(output["PackedPolicySize"]);
  }
  if (output["Provider"] !== void 0) {
    contents.Provider = expectString(output["Provider"]);
  }
  if (output["Audience"] !== void 0) {
    contents.Audience = expectString(output["Audience"]);
  }
  if (output["SourceIdentity"] !== void 0) {
    contents.SourceIdentity = expectString(output["SourceIdentity"]);
  }
  return contents;
};
var deserializeAws_queryCredentials = (output, context) => {
  const contents = {
    AccessKeyId: void 0,
    SecretAccessKey: void 0,
    SessionToken: void 0,
    Expiration: void 0
  };
  if (output["AccessKeyId"] !== void 0) {
    contents.AccessKeyId = expectString(output["AccessKeyId"]);
  }
  if (output["SecretAccessKey"] !== void 0) {
    contents.SecretAccessKey = expectString(output["SecretAccessKey"]);
  }
  if (output["SessionToken"] !== void 0) {
    contents.SessionToken = expectString(output["SessionToken"]);
  }
  if (output["Expiration"] !== void 0) {
    contents.Expiration = expectNonNull(parseRfc3339DateTime(output["Expiration"]));
  }
  return contents;
};
var deserializeAws_queryExpiredTokenException = (output, context) => {
  const contents = {
    message: void 0
  };
  if (output["message"] !== void 0) {
    contents.message = expectString(output["message"]);
  }
  return contents;
};
var deserializeAws_queryIDPCommunicationErrorException = (output, context) => {
  const contents = {
    message: void 0
  };
  if (output["message"] !== void 0) {
    contents.message = expectString(output["message"]);
  }
  return contents;
};
var deserializeAws_queryIDPRejectedClaimException = (output, context) => {
  const contents = {
    message: void 0
  };
  if (output["message"] !== void 0) {
    contents.message = expectString(output["message"]);
  }
  return contents;
};
var deserializeAws_queryInvalidIdentityTokenException = (output, context) => {
  const contents = {
    message: void 0
  };
  if (output["message"] !== void 0) {
    contents.message = expectString(output["message"]);
  }
  return contents;
};
var deserializeAws_queryMalformedPolicyDocumentException = (output, context) => {
  const contents = {
    message: void 0
  };
  if (output["message"] !== void 0) {
    contents.message = expectString(output["message"]);
  }
  return contents;
};
var deserializeAws_queryPackedPolicyTooLargeException = (output, context) => {
  const contents = {
    message: void 0
  };
  if (output["message"] !== void 0) {
    contents.message = expectString(output["message"]);
  }
  return contents;
};
var deserializeAws_queryRegionDisabledException = (output, context) => {
  const contents = {
    message: void 0
  };
  if (output["message"] !== void 0) {
    contents.message = expectString(output["message"]);
  }
  return contents;
};
var deserializeMetadata3 = (output) => ({
  httpStatusCode: output.statusCode,
  requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
  extendedRequestId: output.headers["x-amz-id-2"],
  cfId: output.headers["x-amz-cf-id"]
});
var collectBody2 = (streamBody = new Uint8Array(), context) => {
  if (streamBody instanceof Uint8Array) {
    return Promise.resolve(streamBody);
  }
  return context.streamCollector(streamBody) || Promise.resolve(new Uint8Array());
};
var collectBodyString2 = (streamBody, context) => collectBody2(streamBody, context).then((body) => context.utf8Encoder(body));
var buildHttpRpcRequest2 = async (context, headers, path, resolvedHostname, body) => {
  const { hostname, protocol = "https", port, path: basePath } = await context.endpoint();
  const contents = {
    protocol,
    hostname,
    port,
    method: "POST",
    path: basePath.endsWith("/") ? basePath.slice(0, -1) + path : basePath + path,
    headers
  };
  if (resolvedHostname !== void 0) {
    contents.hostname = resolvedHostname;
  }
  if (body !== void 0) {
    contents.body = body;
  }
  return new HttpRequest(contents);
};
var parseBody2 = (streamBody, context) => collectBodyString2(streamBody, context).then((encoded) => {
  if (encoded.length) {
    const parser = new import_fast_xml_parser.XMLParser({
      attributeNamePrefix: "",
      htmlEntities: true,
      ignoreAttributes: false,
      ignoreDeclaration: true,
      parseTagValue: false,
      trimValues: false,
      tagValueProcessor: (_, val) => val.trim() === "" && val.includes("\n") ? "" : void 0
    });
    parser.addEntity("#xD", "\r");
    parser.addEntity("#10", "\n");
    const parsedObj = parser.parse(encoded);
    const textNodeName = "#text";
    const key = Object.keys(parsedObj)[0];
    const parsedObjToReturn = parsedObj[key];
    if (parsedObjToReturn[textNodeName]) {
      parsedObjToReturn[key] = parsedObjToReturn[textNodeName];
      delete parsedObjToReturn[textNodeName];
    }
    return getValueFromTextNode(parsedObjToReturn);
  }
  return {};
});
var parseErrorBody2 = async (errorBody, context) => {
  const value = await parseBody2(errorBody, context);
  if (value.Error) {
    value.Error.message = value.Error.message ?? value.Error.Message;
  }
  return value;
};
var buildFormUrlencodedString = (formEntries) => Object.entries(formEntries).map(([key, value]) => extendedEncodeURIComponent(key) + "=" + extendedEncodeURIComponent(value)).join("&");
var loadQueryErrorCode = (output, data) => {
  if (data.Error.Code !== void 0) {
    return data.Error.Code;
  }
  if (output.statusCode == 404) {
    return "NotFound";
  }
};

// ../../node_modules/@aws-sdk/client-sts/dist-es/commands/AssumeRoleCommand.js
var AssumeRoleCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseGlobalEndpoint: { type: "builtInParams", name: "useGlobalEndpoint" },
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, AssumeRoleCommand.getEndpointParameterInstructions()));
    this.middlewareStack.use(getAwsAuthPlugin(configuration));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "STSClient";
    const commandName = "AssumeRoleCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: AssumeRoleRequestFilterSensitiveLog,
      outputFilterSensitiveLog: AssumeRoleResponseFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_queryAssumeRoleCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_queryAssumeRoleCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-sts/dist-es/commands/AssumeRoleWithWebIdentityCommand.js
var AssumeRoleWithWebIdentityCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseGlobalEndpoint: { type: "builtInParams", name: "useGlobalEndpoint" },
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, AssumeRoleWithWebIdentityCommand.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "STSClient";
    const commandName = "AssumeRoleWithWebIdentityCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: AssumeRoleWithWebIdentityRequestFilterSensitiveLog,
      outputFilterSensitiveLog: AssumeRoleWithWebIdentityResponseFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_queryAssumeRoleWithWebIdentityCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_queryAssumeRoleWithWebIdentityCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/middleware-sdk-sts/dist-es/index.js
var resolveStsAuthConfig = (input, { stsClientCtor }) => resolveAwsAuthConfig({
  ...input,
  stsClientCtor
});

// ../../node_modules/@aws-sdk/client-sts/dist-es/endpoint/EndpointParameters.js
var resolveClientEndpointParameters2 = (options) => {
  return {
    ...options,
    useDualstackEndpoint: options.useDualstackEndpoint ?? false,
    useFipsEndpoint: options.useFipsEndpoint ?? false,
    useGlobalEndpoint: options.useGlobalEndpoint ?? false,
    defaultSigningName: "sts"
  };
};

// ../../node_modules/@aws-sdk/client-sts/package.json
var package_default2 = {
  name: "@aws-sdk/client-sts",
  description: "AWS SDK for JavaScript Sts Client for Node.js, Browser and React Native",
  version: "3.256.0",
  scripts: {
    build: "concurrently 'yarn:build:cjs' 'yarn:build:es' 'yarn:build:types'",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "build:docs": "typedoc",
    "build:es": "tsc -p tsconfig.es.json",
    "build:include:deps": "lerna run --scope $npm_package_name --include-dependencies build",
    "build:types": "tsc -p tsconfig.types.json",
    "build:types:downlevel": "downlevel-dts dist-types dist-types/ts3.4",
    clean: "rimraf ./dist-* && rimraf *.tsbuildinfo",
    "generate:client": "node ../../scripts/generate-clients/single-service --solo sts",
    test: "yarn test:unit",
    "test:unit": "jest"
  },
  main: "./dist-cjs/index.js",
  types: "./dist-types/index.d.ts",
  module: "./dist-es/index.js",
  sideEffects: false,
  dependencies: {
    "@aws-crypto/sha256-browser": "3.0.0",
    "@aws-crypto/sha256-js": "3.0.0",
    "@aws-sdk/config-resolver": "3.254.0",
    "@aws-sdk/credential-provider-node": "3.256.0",
    "@aws-sdk/fetch-http-handler": "3.254.0",
    "@aws-sdk/hash-node": "3.254.0",
    "@aws-sdk/invalid-dependency": "3.254.0",
    "@aws-sdk/middleware-content-length": "3.254.0",
    "@aws-sdk/middleware-endpoint": "3.254.0",
    "@aws-sdk/middleware-host-header": "3.254.0",
    "@aws-sdk/middleware-logger": "3.254.0",
    "@aws-sdk/middleware-recursion-detection": "3.254.0",
    "@aws-sdk/middleware-retry": "3.254.0",
    "@aws-sdk/middleware-sdk-sts": "3.254.0",
    "@aws-sdk/middleware-serde": "3.254.0",
    "@aws-sdk/middleware-signing": "3.254.0",
    "@aws-sdk/middleware-stack": "3.254.0",
    "@aws-sdk/middleware-user-agent": "3.254.0",
    "@aws-sdk/node-config-provider": "3.254.0",
    "@aws-sdk/node-http-handler": "3.254.0",
    "@aws-sdk/protocol-http": "3.254.0",
    "@aws-sdk/smithy-client": "3.254.0",
    "@aws-sdk/types": "3.254.0",
    "@aws-sdk/url-parser": "3.254.0",
    "@aws-sdk/util-base64": "3.208.0",
    "@aws-sdk/util-body-length-browser": "3.188.0",
    "@aws-sdk/util-body-length-node": "3.208.0",
    "@aws-sdk/util-defaults-mode-browser": "3.254.0",
    "@aws-sdk/util-defaults-mode-node": "3.254.0",
    "@aws-sdk/util-endpoints": "3.254.0",
    "@aws-sdk/util-retry": "3.254.0",
    "@aws-sdk/util-user-agent-browser": "3.254.0",
    "@aws-sdk/util-user-agent-node": "3.254.0",
    "@aws-sdk/util-utf8-browser": "3.188.0",
    "@aws-sdk/util-utf8-node": "3.208.0",
    "fast-xml-parser": "4.0.11",
    tslib: "^2.3.1"
  },
  devDependencies: {
    "@aws-sdk/service-client-documentation-generator": "3.208.0",
    "@tsconfig/node14": "1.0.3",
    "@types/node": "^14.14.31",
    concurrently: "7.0.0",
    "downlevel-dts": "0.10.1",
    rimraf: "3.0.2",
    typedoc: "0.19.2",
    typescript: "~4.6.2"
  },
  overrides: {
    typedoc: {
      typescript: "~4.6.2"
    }
  },
  engines: {
    node: ">=14.0.0"
  },
  typesVersions: {
    "<4.0": {
      "dist-types/*": [
        "dist-types/ts3.4/*"
      ]
    }
  },
  files: [
    "dist-*"
  ],
  author: {
    name: "AWS SDK for JavaScript Team",
    url: "https://aws.amazon.com/javascript/"
  },
  license: "Apache-2.0",
  browser: {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.browser"
  },
  "react-native": {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.native"
  },
  homepage: "https://github.com/aws/aws-sdk-js-v3/tree/main/clients/client-sts",
  repository: {
    type: "git",
    url: "https://github.com/aws/aws-sdk-js-v3.git",
    directory: "clients/client-sts"
  }
};

// ../../node_modules/@aws-sdk/client-sts/dist-es/defaultStsRoleAssumers.js
var ASSUME_ROLE_DEFAULT_REGION = "us-east-1";
var decorateDefaultRegion = (region) => {
  if (typeof region !== "function") {
    return region === void 0 ? ASSUME_ROLE_DEFAULT_REGION : region;
  }
  return async () => {
    try {
      return await region();
    } catch (e13) {
      return ASSUME_ROLE_DEFAULT_REGION;
    }
  };
};
var getDefaultRoleAssumer = (stsOptions, stsClientCtor) => {
  let stsClient;
  let closureSourceCreds;
  return async (sourceCreds, params) => {
    closureSourceCreds = sourceCreds;
    if (!stsClient) {
      const { logger: logger2, region, requestHandler } = stsOptions;
      stsClient = new stsClientCtor({
        logger: logger2,
        credentialDefaultProvider: () => async () => closureSourceCreds,
        region: decorateDefaultRegion(region || stsOptions.region),
        ...requestHandler ? { requestHandler } : {}
      });
    }
    const { Credentials } = await stsClient.send(new AssumeRoleCommand(params));
    if (!Credentials || !Credentials.AccessKeyId || !Credentials.SecretAccessKey) {
      throw new Error(`Invalid response from STS.assumeRole call with role ${params.RoleArn}`);
    }
    return {
      accessKeyId: Credentials.AccessKeyId,
      secretAccessKey: Credentials.SecretAccessKey,
      sessionToken: Credentials.SessionToken,
      expiration: Credentials.Expiration
    };
  };
};
var getDefaultRoleAssumerWithWebIdentity = (stsOptions, stsClientCtor) => {
  let stsClient;
  return async (params) => {
    if (!stsClient) {
      const { logger: logger2, region, requestHandler } = stsOptions;
      stsClient = new stsClientCtor({
        logger: logger2,
        region: decorateDefaultRegion(region || stsOptions.region),
        ...requestHandler ? { requestHandler } : {}
      });
    }
    const { Credentials } = await stsClient.send(new AssumeRoleWithWebIdentityCommand(params));
    if (!Credentials || !Credentials.AccessKeyId || !Credentials.SecretAccessKey) {
      throw new Error(`Invalid response from STS.assumeRoleWithWebIdentity call with role ${params.RoleArn}`);
    }
    return {
      accessKeyId: Credentials.AccessKeyId,
      secretAccessKey: Credentials.SecretAccessKey,
      sessionToken: Credentials.SessionToken,
      expiration: Credentials.Expiration
    };
  };
};
var decorateDefaultCredentialProvider = (provider) => (input) => provider({
  roleAssumer: getDefaultRoleAssumer(input, input.stsClientCtor),
  roleAssumerWithWebIdentity: getDefaultRoleAssumerWithWebIdentity(input, input.stsClientCtor),
  ...input
});

// ../../node_modules/@aws-sdk/credential-provider-env/dist-es/fromEnv.js
var ENV_KEY = "AWS_ACCESS_KEY_ID";
var ENV_SECRET = "AWS_SECRET_ACCESS_KEY";
var ENV_SESSION = "AWS_SESSION_TOKEN";
var ENV_EXPIRATION = "AWS_CREDENTIAL_EXPIRATION";
var fromEnv = () => async () => {
  const accessKeyId = process.env[ENV_KEY];
  const secretAccessKey = process.env[ENV_SECRET];
  const sessionToken = process.env[ENV_SESSION];
  const expiry = process.env[ENV_EXPIRATION];
  if (accessKeyId && secretAccessKey) {
    return {
      accessKeyId,
      secretAccessKey,
      ...sessionToken && { sessionToken },
      ...expiry && { expiration: new Date(expiry) }
    };
  }
  throw new CredentialsProviderError("Unable to find environment variable credentials.");
};

// ../../node_modules/@aws-sdk/shared-ini-file-loader/dist-es/getHomeDir.js
var import_os = require("os");
var import_path = require("path");
var getHomeDir = () => {
  const { HOME, USERPROFILE, HOMEPATH, HOMEDRIVE = `C:${import_path.sep}` } = process.env;
  if (HOME)
    return HOME;
  if (USERPROFILE)
    return USERPROFILE;
  if (HOMEPATH)
    return `${HOMEDRIVE}${HOMEPATH}`;
  return (0, import_os.homedir)();
};

// ../../node_modules/@aws-sdk/shared-ini-file-loader/dist-es/getProfileName.js
var ENV_PROFILE = "AWS_PROFILE";
var DEFAULT_PROFILE = "default";
var getProfileName = (init) => init.profile || process.env[ENV_PROFILE] || DEFAULT_PROFILE;

// ../../node_modules/@aws-sdk/shared-ini-file-loader/dist-es/getSSOTokenFilepath.js
var import_crypto = require("crypto");
var import_path2 = require("path");
var getSSOTokenFilepath = (id) => {
  const hasher = (0, import_crypto.createHash)("sha1");
  const cacheName = hasher.update(id).digest("hex");
  return (0, import_path2.join)(getHomeDir(), ".aws", "sso", "cache", `${cacheName}.json`);
};

// ../../node_modules/@aws-sdk/shared-ini-file-loader/dist-es/getSSOTokenFromFile.js
var import_fs = require("fs");
var { readFile } = import_fs.promises;
var getSSOTokenFromFile = async (id) => {
  const ssoTokenFilepath = getSSOTokenFilepath(id);
  const ssoTokenText = await readFile(ssoTokenFilepath, "utf8");
  return JSON.parse(ssoTokenText);
};

// ../../node_modules/@aws-sdk/shared-ini-file-loader/dist-es/getConfigFilepath.js
var import_path3 = require("path");
var ENV_CONFIG_PATH = "AWS_CONFIG_FILE";
var getConfigFilepath = () => process.env[ENV_CONFIG_PATH] || (0, import_path3.join)(getHomeDir(), ".aws", "config");

// ../../node_modules/@aws-sdk/shared-ini-file-loader/dist-es/getCredentialsFilepath.js
var import_path4 = require("path");
var ENV_CREDENTIALS_PATH = "AWS_SHARED_CREDENTIALS_FILE";
var getCredentialsFilepath = () => process.env[ENV_CREDENTIALS_PATH] || (0, import_path4.join)(getHomeDir(), ".aws", "credentials");

// ../../node_modules/@aws-sdk/shared-ini-file-loader/dist-es/getProfileData.js
var profileKeyRegex = /^profile\s(["'])?([^\1]+)\1$/;
var getProfileData = (data) => Object.entries(data).filter(([key]) => profileKeyRegex.test(key)).reduce((acc, [key, value]) => ({ ...acc, [profileKeyRegex.exec(key)[2]]: value }), {
  ...data.default && { default: data.default }
});

// ../../node_modules/@aws-sdk/shared-ini-file-loader/dist-es/parseIni.js
var profileNameBlockList = ["__proto__", "profile __proto__"];
var parseIni = (iniData) => {
  const map9 = {};
  let currentSection;
  for (let line of iniData.split(/\r?\n/)) {
    line = line.split(/(^|\s)[;#]/)[0].trim();
    const isSection = line[0] === "[" && line[line.length - 1] === "]";
    if (isSection) {
      currentSection = line.substring(1, line.length - 1);
      if (profileNameBlockList.includes(currentSection)) {
        throw new Error(`Found invalid profile name "${currentSection}"`);
      }
    } else if (currentSection) {
      const indexOfEqualsSign = line.indexOf("=");
      const start = 0;
      const end = line.length - 1;
      const isAssignment = indexOfEqualsSign !== -1 && indexOfEqualsSign !== start && indexOfEqualsSign !== end;
      if (isAssignment) {
        const [name, value] = [
          line.substring(0, indexOfEqualsSign).trim(),
          line.substring(indexOfEqualsSign + 1).trim()
        ];
        map9[currentSection] = map9[currentSection] || {};
        map9[currentSection][name] = value;
      }
    }
  }
  return map9;
};

// ../../node_modules/@aws-sdk/shared-ini-file-loader/dist-es/slurpFile.js
var import_fs2 = require("fs");
var { readFile: readFile2 } = import_fs2.promises;
var filePromisesHash = {};
var slurpFile = (path) => {
  if (!filePromisesHash[path]) {
    filePromisesHash[path] = readFile2(path, "utf8");
  }
  return filePromisesHash[path];
};

// ../../node_modules/@aws-sdk/shared-ini-file-loader/dist-es/loadSharedConfigFiles.js
var swallowError = () => ({});
var loadSharedConfigFiles = async (init = {}) => {
  const { filepath = getCredentialsFilepath(), configFilepath = getConfigFilepath() } = init;
  const parsedFiles = await Promise.all([
    slurpFile(configFilepath).then(parseIni).then(getProfileData).catch(swallowError),
    slurpFile(filepath).then(parseIni).catch(swallowError)
  ]);
  return {
    configFile: parsedFiles[0],
    credentialsFile: parsedFiles[1]
  };
};

// ../../node_modules/@aws-sdk/shared-ini-file-loader/dist-es/getSsoSessionData.js
var ssoSessionKeyRegex = /^sso-session\s(["'])?([^\1]+)\1$/;
var getSsoSessionData = (data) => Object.entries(data).filter(([key]) => ssoSessionKeyRegex.test(key)).reduce((acc, [key, value]) => ({ ...acc, [ssoSessionKeyRegex.exec(key)[2]]: value }), {});

// ../../node_modules/@aws-sdk/shared-ini-file-loader/dist-es/loadSsoSessionData.js
var swallowError2 = () => ({});
var loadSsoSessionData = async (init = {}) => slurpFile(init.configFilepath ?? getConfigFilepath()).then(parseIni).then(getSsoSessionData).catch(swallowError2);

// ../../node_modules/@aws-sdk/shared-ini-file-loader/dist-es/parseKnownFiles.js
var parseKnownFiles = async (init) => {
  const parsedFiles = await loadSharedConfigFiles(init);
  return {
    ...parsedFiles.configFile,
    ...parsedFiles.credentialsFile
  };
};

// ../../node_modules/@aws-sdk/credential-provider-imds/dist-es/fromContainerMetadata.js
var import_url = require("url");

// ../../node_modules/@aws-sdk/credential-provider-imds/dist-es/remoteProvider/httpRequest.js
var import_buffer2 = require("buffer");
var import_http = require("http");
function httpRequest(options) {
  return new Promise((resolve, reject) => {
    const req = (0, import_http.request)({
      method: "GET",
      ...options,
      hostname: options.hostname?.replace(/^\[(.+)\]$/, "$1")
    });
    req.on("error", (err) => {
      reject(Object.assign(new ProviderError("Unable to connect to instance metadata service"), err));
      req.destroy();
    });
    req.on("timeout", () => {
      reject(new ProviderError("TimeoutError from instance metadata service"));
      req.destroy();
    });
    req.on("response", (res) => {
      const { statusCode = 400 } = res;
      if (statusCode < 200 || 300 <= statusCode) {
        reject(Object.assign(new ProviderError("Error response received from instance metadata service"), { statusCode }));
        req.destroy();
      }
      const chunks = [];
      res.on("data", (chunk) => {
        chunks.push(chunk);
      });
      res.on("end", () => {
        resolve(import_buffer2.Buffer.concat(chunks));
        req.destroy();
      });
    });
    req.end();
  });
}

// ../../node_modules/@aws-sdk/credential-provider-imds/dist-es/remoteProvider/ImdsCredentials.js
var isImdsCredentials = (arg) => Boolean(arg) && typeof arg === "object" && typeof arg.AccessKeyId === "string" && typeof arg.SecretAccessKey === "string" && typeof arg.Token === "string" && typeof arg.Expiration === "string";
var fromImdsCredentials = (creds) => ({
  accessKeyId: creds.AccessKeyId,
  secretAccessKey: creds.SecretAccessKey,
  sessionToken: creds.Token,
  expiration: new Date(creds.Expiration)
});

// ../../node_modules/@aws-sdk/credential-provider-imds/dist-es/remoteProvider/RemoteProviderInit.js
var DEFAULT_TIMEOUT = 1e3;
var DEFAULT_MAX_RETRIES = 0;
var providerConfigFromInit = ({ maxRetries = DEFAULT_MAX_RETRIES, timeout = DEFAULT_TIMEOUT }) => ({ maxRetries, timeout });

// ../../node_modules/@aws-sdk/credential-provider-imds/dist-es/remoteProvider/retry.js
var retry = (toRetry, maxRetries) => {
  let promise = toRetry();
  for (let i13 = 0; i13 < maxRetries; i13++) {
    promise = promise.catch(toRetry);
  }
  return promise;
};

// ../../node_modules/@aws-sdk/credential-provider-imds/dist-es/fromContainerMetadata.js
var ENV_CMDS_FULL_URI = "AWS_CONTAINER_CREDENTIALS_FULL_URI";
var ENV_CMDS_RELATIVE_URI = "AWS_CONTAINER_CREDENTIALS_RELATIVE_URI";
var ENV_CMDS_AUTH_TOKEN = "AWS_CONTAINER_AUTHORIZATION_TOKEN";
var fromContainerMetadata = (init = {}) => {
  const { timeout, maxRetries } = providerConfigFromInit(init);
  return () => retry(async () => {
    const requestOptions = await getCmdsUri();
    const credsResponse = JSON.parse(await requestFromEcsImds(timeout, requestOptions));
    if (!isImdsCredentials(credsResponse)) {
      throw new CredentialsProviderError("Invalid response received from instance metadata service.");
    }
    return fromImdsCredentials(credsResponse);
  }, maxRetries);
};
var requestFromEcsImds = async (timeout, options) => {
  if (process.env[ENV_CMDS_AUTH_TOKEN]) {
    options.headers = {
      ...options.headers,
      Authorization: process.env[ENV_CMDS_AUTH_TOKEN]
    };
  }
  const buffer = await httpRequest({
    ...options,
    timeout
  });
  return buffer.toString();
};
var CMDS_IP = "169.254.170.2";
var GREENGRASS_HOSTS = {
  localhost: true,
  "127.0.0.1": true
};
var GREENGRASS_PROTOCOLS = {
  "http:": true,
  "https:": true
};
var getCmdsUri = async () => {
  if (process.env[ENV_CMDS_RELATIVE_URI]) {
    return {
      hostname: CMDS_IP,
      path: process.env[ENV_CMDS_RELATIVE_URI]
    };
  }
  if (process.env[ENV_CMDS_FULL_URI]) {
    const parsed = (0, import_url.parse)(process.env[ENV_CMDS_FULL_URI]);
    if (!parsed.hostname || !(parsed.hostname in GREENGRASS_HOSTS)) {
      throw new CredentialsProviderError(`${parsed.hostname} is not a valid container metadata service hostname`, false);
    }
    if (!parsed.protocol || !(parsed.protocol in GREENGRASS_PROTOCOLS)) {
      throw new CredentialsProviderError(`${parsed.protocol} is not a valid container metadata service protocol`, false);
    }
    return {
      ...parsed,
      port: parsed.port ? parseInt(parsed.port, 10) : void 0
    };
  }
  throw new CredentialsProviderError(`The container metadata credential provider cannot be used unless the ${ENV_CMDS_RELATIVE_URI} or ${ENV_CMDS_FULL_URI} environment variable is set`, false);
};

// ../../node_modules/@aws-sdk/node-config-provider/dist-es/fromEnv.js
var fromEnv2 = (envVarSelector) => async () => {
  try {
    const config = envVarSelector(process.env);
    if (config === void 0) {
      throw new Error();
    }
    return config;
  } catch (e13) {
    throw new CredentialsProviderError(e13.message || `Cannot load config from environment variables with getter: ${envVarSelector}`);
  }
};

// ../../node_modules/@aws-sdk/node-config-provider/dist-es/fromSharedConfigFiles.js
var fromSharedConfigFiles = (configSelector, { preferredFile = "config", ...init } = {}) => async () => {
  const profile = getProfileName(init);
  const { configFile, credentialsFile } = await loadSharedConfigFiles(init);
  const profileFromCredentials = credentialsFile[profile] || {};
  const profileFromConfig = configFile[profile] || {};
  const mergedProfile = preferredFile === "config" ? { ...profileFromCredentials, ...profileFromConfig } : { ...profileFromConfig, ...profileFromCredentials };
  try {
    const configValue = configSelector(mergedProfile);
    if (configValue === void 0) {
      throw new Error();
    }
    return configValue;
  } catch (e13) {
    throw new CredentialsProviderError(e13.message || `Cannot load config for profile ${profile} in SDK configuration files with getter: ${configSelector}`);
  }
};

// ../../node_modules/@aws-sdk/node-config-provider/dist-es/fromStatic.js
var isFunction = (func) => typeof func === "function";
var fromStatic2 = (defaultValue) => isFunction(defaultValue) ? async () => await defaultValue() : fromStatic(defaultValue);

// ../../node_modules/@aws-sdk/node-config-provider/dist-es/configLoader.js
var loadConfig = ({ environmentVariableSelector, configFileSelector, default: defaultValue }, configuration = {}) => memoize(chain(fromEnv2(environmentVariableSelector), fromSharedConfigFiles(configFileSelector, configuration), fromStatic2(defaultValue)));

// ../../node_modules/@aws-sdk/credential-provider-imds/dist-es/config/Endpoint.js
var Endpoint;
(function(Endpoint2) {
  Endpoint2["IPv4"] = "http://169.254.169.254";
  Endpoint2["IPv6"] = "http://[fd00:ec2::254]";
})(Endpoint || (Endpoint = {}));

// ../../node_modules/@aws-sdk/credential-provider-imds/dist-es/config/EndpointConfigOptions.js
var ENV_ENDPOINT_NAME = "AWS_EC2_METADATA_SERVICE_ENDPOINT";
var CONFIG_ENDPOINT_NAME = "ec2_metadata_service_endpoint";
var ENDPOINT_CONFIG_OPTIONS = {
  environmentVariableSelector: (env2) => env2[ENV_ENDPOINT_NAME],
  configFileSelector: (profile) => profile[CONFIG_ENDPOINT_NAME],
  default: void 0
};

// ../../node_modules/@aws-sdk/credential-provider-imds/dist-es/config/EndpointMode.js
var EndpointMode;
(function(EndpointMode2) {
  EndpointMode2["IPv4"] = "IPv4";
  EndpointMode2["IPv6"] = "IPv6";
})(EndpointMode || (EndpointMode = {}));

// ../../node_modules/@aws-sdk/credential-provider-imds/dist-es/config/EndpointModeConfigOptions.js
var ENV_ENDPOINT_MODE_NAME = "AWS_EC2_METADATA_SERVICE_ENDPOINT_MODE";
var CONFIG_ENDPOINT_MODE_NAME = "ec2_metadata_service_endpoint_mode";
var ENDPOINT_MODE_CONFIG_OPTIONS = {
  environmentVariableSelector: (env2) => env2[ENV_ENDPOINT_MODE_NAME],
  configFileSelector: (profile) => profile[CONFIG_ENDPOINT_MODE_NAME],
  default: EndpointMode.IPv4
};

// ../../node_modules/@aws-sdk/credential-provider-imds/dist-es/utils/getInstanceMetadataEndpoint.js
var getInstanceMetadataEndpoint = async () => parseUrl(await getFromEndpointConfig() || await getFromEndpointModeConfig());
var getFromEndpointConfig = async () => loadConfig(ENDPOINT_CONFIG_OPTIONS)();
var getFromEndpointModeConfig = async () => {
  const endpointMode = await loadConfig(ENDPOINT_MODE_CONFIG_OPTIONS)();
  switch (endpointMode) {
    case EndpointMode.IPv4:
      return Endpoint.IPv4;
    case EndpointMode.IPv6:
      return Endpoint.IPv6;
    default:
      throw new Error(`Unsupported endpoint mode: ${endpointMode}. Select from ${Object.values(EndpointMode)}`);
  }
};

// ../../node_modules/@aws-sdk/credential-provider-imds/dist-es/utils/getExtendedInstanceMetadataCredentials.js
var STATIC_STABILITY_REFRESH_INTERVAL_SECONDS = 5 * 60;
var STATIC_STABILITY_REFRESH_INTERVAL_JITTER_WINDOW_SECONDS = 5 * 60;
var STATIC_STABILITY_DOC_URL = "https://docs.aws.amazon.com/sdkref/latest/guide/feature-static-credentials.html";
var getExtendedInstanceMetadataCredentials = (credentials, logger2) => {
  const refreshInterval = STATIC_STABILITY_REFRESH_INTERVAL_SECONDS + Math.floor(Math.random() * STATIC_STABILITY_REFRESH_INTERVAL_JITTER_WINDOW_SECONDS);
  const newExpiration = new Date(Date.now() + refreshInterval * 1e3);
  logger2.warn("Attempting credential expiration extension due to a credential service availability issue. A refresh of these credentials will be attempted after ${new Date(newExpiration)}.\nFor more information, please visit: " + STATIC_STABILITY_DOC_URL);
  const originalExpiration = credentials.originalExpiration ?? credentials.expiration;
  return {
    ...credentials,
    ...originalExpiration ? { originalExpiration } : {},
    expiration: newExpiration
  };
};

// ../../node_modules/@aws-sdk/credential-provider-imds/dist-es/utils/staticStabilityProvider.js
var staticStabilityProvider = (provider, options = {}) => {
  const logger2 = options?.logger || console;
  let pastCredentials;
  return async () => {
    let credentials;
    try {
      credentials = await provider();
      if (credentials.expiration && credentials.expiration.getTime() < Date.now()) {
        credentials = getExtendedInstanceMetadataCredentials(credentials, logger2);
      }
    } catch (e13) {
      if (pastCredentials) {
        logger2.warn("Credential renew failed: ", e13);
        credentials = getExtendedInstanceMetadataCredentials(pastCredentials, logger2);
      } else {
        throw e13;
      }
    }
    pastCredentials = credentials;
    return credentials;
  };
};

// ../../node_modules/@aws-sdk/credential-provider-imds/dist-es/fromInstanceMetadata.js
var IMDS_PATH = "/latest/meta-data/iam/security-credentials/";
var IMDS_TOKEN_PATH = "/latest/api/token";
var fromInstanceMetadata = (init = {}) => staticStabilityProvider(getInstanceImdsProvider(init), { logger: init.logger });
var getInstanceImdsProvider = (init) => {
  let disableFetchToken = false;
  const { timeout, maxRetries } = providerConfigFromInit(init);
  const getCredentials = async (maxRetries2, options) => {
    const profile = (await retry(async () => {
      let profile2;
      try {
        profile2 = await getProfile(options);
      } catch (err) {
        if (err.statusCode === 401) {
          disableFetchToken = false;
        }
        throw err;
      }
      return profile2;
    }, maxRetries2)).trim();
    return retry(async () => {
      let creds;
      try {
        creds = await getCredentialsFromProfile(profile, options);
      } catch (err) {
        if (err.statusCode === 401) {
          disableFetchToken = false;
        }
        throw err;
      }
      return creds;
    }, maxRetries2);
  };
  return async () => {
    const endpoint = await getInstanceMetadataEndpoint();
    if (disableFetchToken) {
      return getCredentials(maxRetries, { ...endpoint, timeout });
    } else {
      let token;
      try {
        token = (await getMetadataToken({ ...endpoint, timeout })).toString();
      } catch (error) {
        if (error?.statusCode === 400) {
          throw Object.assign(error, {
            message: "EC2 Metadata token request returned error"
          });
        } else if (error.message === "TimeoutError" || [403, 404, 405].includes(error.statusCode)) {
          disableFetchToken = true;
        }
        return getCredentials(maxRetries, { ...endpoint, timeout });
      }
      return getCredentials(maxRetries, {
        ...endpoint,
        headers: {
          "x-aws-ec2-metadata-token": token
        },
        timeout
      });
    }
  };
};
var getMetadataToken = async (options) => httpRequest({
  ...options,
  path: IMDS_TOKEN_PATH,
  method: "PUT",
  headers: {
    "x-aws-ec2-metadata-token-ttl-seconds": "21600"
  }
});
var getProfile = async (options) => (await httpRequest({ ...options, path: IMDS_PATH })).toString();
var getCredentialsFromProfile = async (profile, options) => {
  const credsResponse = JSON.parse((await httpRequest({
    ...options,
    path: IMDS_PATH + profile
  })).toString());
  if (!isImdsCredentials(credsResponse)) {
    throw new CredentialsProviderError("Invalid response received from instance metadata service.");
  }
  return fromImdsCredentials(credsResponse);
};

// ../../node_modules/@aws-sdk/credential-provider-ini/dist-es/resolveCredentialSource.js
var resolveCredentialSource = (credentialSource, profileName) => {
  const sourceProvidersMap = {
    EcsContainer: fromContainerMetadata,
    Ec2InstanceMetadata: fromInstanceMetadata,
    Environment: fromEnv
  };
  if (credentialSource in sourceProvidersMap) {
    return sourceProvidersMap[credentialSource]();
  } else {
    throw new CredentialsProviderError(`Unsupported credential source in profile ${profileName}. Got ${credentialSource}, expected EcsContainer or Ec2InstanceMetadata or Environment.`);
  }
};

// ../../node_modules/@aws-sdk/credential-provider-ini/dist-es/resolveAssumeRoleCredentials.js
var isAssumeRoleProfile = (arg) => Boolean(arg) && typeof arg === "object" && typeof arg.role_arn === "string" && ["undefined", "string"].indexOf(typeof arg.role_session_name) > -1 && ["undefined", "string"].indexOf(typeof arg.external_id) > -1 && ["undefined", "string"].indexOf(typeof arg.mfa_serial) > -1 && (isAssumeRoleWithSourceProfile(arg) || isAssumeRoleWithProviderProfile(arg));
var isAssumeRoleWithSourceProfile = (arg) => typeof arg.source_profile === "string" && typeof arg.credential_source === "undefined";
var isAssumeRoleWithProviderProfile = (arg) => typeof arg.credential_source === "string" && typeof arg.source_profile === "undefined";
var resolveAssumeRoleCredentials = async (profileName, profiles, options, visitedProfiles = {}) => {
  const data = profiles[profileName];
  if (!options.roleAssumer) {
    throw new CredentialsProviderError(`Profile ${profileName} requires a role to be assumed, but no role assumption callback was provided.`, false);
  }
  const { source_profile } = data;
  if (source_profile && source_profile in visitedProfiles) {
    throw new CredentialsProviderError(`Detected a cycle attempting to resolve credentials for profile ${getProfileName(options)}. Profiles visited: ` + Object.keys(visitedProfiles).join(", "), false);
  }
  const sourceCredsProvider = source_profile ? resolveProfileData(source_profile, profiles, options, {
    ...visitedProfiles,
    [source_profile]: true
  }) : resolveCredentialSource(data.credential_source, profileName)();
  const params = {
    RoleArn: data.role_arn,
    RoleSessionName: data.role_session_name || `aws-sdk-js-${Date.now()}`,
    ExternalId: data.external_id
  };
  const { mfa_serial } = data;
  if (mfa_serial) {
    if (!options.mfaCodeProvider) {
      throw new CredentialsProviderError(`Profile ${profileName} requires multi-factor authentication, but no MFA code callback was provided.`, false);
    }
    params.SerialNumber = mfa_serial;
    params.TokenCode = await options.mfaCodeProvider(mfa_serial);
  }
  const sourceCreds = await sourceCredsProvider;
  return options.roleAssumer(sourceCreds, params);
};

// ../../node_modules/@aws-sdk/credential-provider-process/dist-es/resolveProcessCredentials.js
var import_child_process = require("child_process");
var import_util3 = require("util");

// ../../node_modules/@aws-sdk/credential-provider-process/dist-es/getValidatedProcessCredentials.js
var getValidatedProcessCredentials = (profileName, data) => {
  if (data.Version !== 1) {
    throw Error(`Profile ${profileName} credential_process did not return Version 1.`);
  }
  if (data.AccessKeyId === void 0 || data.SecretAccessKey === void 0) {
    throw Error(`Profile ${profileName} credential_process returned invalid credentials.`);
  }
  if (data.Expiration) {
    const currentTime = new Date();
    const expireTime = new Date(data.Expiration);
    if (expireTime < currentTime) {
      throw Error(`Profile ${profileName} credential_process returned expired credentials.`);
    }
  }
  return {
    accessKeyId: data.AccessKeyId,
    secretAccessKey: data.SecretAccessKey,
    ...data.SessionToken && { sessionToken: data.SessionToken },
    ...data.Expiration && { expiration: new Date(data.Expiration) }
  };
};

// ../../node_modules/@aws-sdk/credential-provider-process/dist-es/resolveProcessCredentials.js
var resolveProcessCredentials = async (profileName, profiles) => {
  const profile = profiles[profileName];
  if (profiles[profileName]) {
    const credentialProcess = profile["credential_process"];
    if (credentialProcess !== void 0) {
      const execPromise = (0, import_util3.promisify)(import_child_process.exec);
      try {
        const { stdout } = await execPromise(credentialProcess);
        let data;
        try {
          data = JSON.parse(stdout.trim());
        } catch {
          throw Error(`Profile ${profileName} credential_process returned invalid JSON.`);
        }
        return getValidatedProcessCredentials(profileName, data);
      } catch (error) {
        throw new CredentialsProviderError(error.message);
      }
    } else {
      throw new CredentialsProviderError(`Profile ${profileName} did not contain credential_process.`);
    }
  } else {
    throw new CredentialsProviderError(`Profile ${profileName} could not be found in shared credentials file.`);
  }
};

// ../../node_modules/@aws-sdk/credential-provider-process/dist-es/fromProcess.js
var fromProcess = (init = {}) => async () => {
  const profiles = await parseKnownFiles(init);
  return resolveProcessCredentials(getProfileName(init), profiles);
};

// ../../node_modules/@aws-sdk/credential-provider-ini/dist-es/resolveProcessCredentials.js
var isProcessProfile = (arg) => Boolean(arg) && typeof arg === "object" && typeof arg.credential_process === "string";
var resolveProcessCredentials2 = async (options, profile) => fromProcess({
  ...options,
  profile
})();

// ../../node_modules/@aws-sdk/credential-provider-sso/dist-es/isSsoProfile.js
var isSsoProfile = (arg) => arg && (typeof arg.sso_start_url === "string" || typeof arg.sso_account_id === "string" || typeof arg.sso_session === "string" || typeof arg.sso_region === "string" || typeof arg.sso_role_name === "string");

// ../../node_modules/@aws-sdk/client-sso/dist-es/models/SSOServiceException.js
var SSOServiceException = class extends ServiceException {
  constructor(options) {
    super(options);
    Object.setPrototypeOf(this, SSOServiceException.prototype);
  }
};

// ../../node_modules/@aws-sdk/client-sso/dist-es/models/models_0.js
var InvalidRequestException = class extends SSOServiceException {
  constructor(opts) {
    super({
      name: "InvalidRequestException",
      $fault: "client",
      ...opts
    });
    this.name = "InvalidRequestException";
    this.$fault = "client";
    Object.setPrototypeOf(this, InvalidRequestException.prototype);
  }
};
var ResourceNotFoundException2 = class extends SSOServiceException {
  constructor(opts) {
    super({
      name: "ResourceNotFoundException",
      $fault: "client",
      ...opts
    });
    this.name = "ResourceNotFoundException";
    this.$fault = "client";
    Object.setPrototypeOf(this, ResourceNotFoundException2.prototype);
  }
};
var TooManyRequestsException = class extends SSOServiceException {
  constructor(opts) {
    super({
      name: "TooManyRequestsException",
      $fault: "client",
      ...opts
    });
    this.name = "TooManyRequestsException";
    this.$fault = "client";
    Object.setPrototypeOf(this, TooManyRequestsException.prototype);
  }
};
var UnauthorizedException = class extends SSOServiceException {
  constructor(opts) {
    super({
      name: "UnauthorizedException",
      $fault: "client",
      ...opts
    });
    this.name = "UnauthorizedException";
    this.$fault = "client";
    Object.setPrototypeOf(this, UnauthorizedException.prototype);
  }
};
var GetRoleCredentialsRequestFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.accessToken && { accessToken: SENSITIVE_STRING }
});
var RoleCredentialsFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.secretAccessKey && { secretAccessKey: SENSITIVE_STRING },
  ...obj.sessionToken && { sessionToken: SENSITIVE_STRING }
});
var GetRoleCredentialsResponseFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.roleCredentials && { roleCredentials: RoleCredentialsFilterSensitiveLog(obj.roleCredentials) }
});

// ../../node_modules/@aws-sdk/client-sso/dist-es/protocols/Aws_restJson1.js
var serializeAws_restJson1GetRoleCredentialsCommand = async (input, context) => {
  const { hostname, protocol = "https", port, path: basePath } = await context.endpoint();
  const headers = map2({}, isSerializableHeaderValue, {
    "x-amz-sso_bearer_token": input.accessToken
  });
  const resolvedPath2 = `${basePath?.endsWith("/") ? basePath.slice(0, -1) : basePath || ""}/federation/credentials`;
  const query = map2({
    role_name: [, expectNonNull(input.roleName, `roleName`)],
    account_id: [, expectNonNull(input.accountId, `accountId`)]
  });
  let body;
  return new HttpRequest({
    protocol,
    hostname,
    port,
    method: "GET",
    headers,
    path: resolvedPath2,
    query,
    body
  });
};
var deserializeAws_restJson1GetRoleCredentialsCommand = async (output, context) => {
  if (output.statusCode !== 200 && output.statusCode >= 300) {
    return deserializeAws_restJson1GetRoleCredentialsCommandError(output, context);
  }
  const contents = map2({
    $metadata: deserializeMetadata4(output)
  });
  const data = expectNonNull(expectObject(await parseBody3(output.body, context)), "body");
  if (data.roleCredentials != null) {
    contents.roleCredentials = deserializeAws_restJson1RoleCredentials(data.roleCredentials, context);
  }
  return contents;
};
var deserializeAws_restJson1GetRoleCredentialsCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody3(output.body, context)
  };
  const errorCode = loadRestJsonErrorCode2(output, parsedOutput.body);
  switch (errorCode) {
    case "InvalidRequestException":
    case "com.amazonaws.sso#InvalidRequestException":
      throw await deserializeAws_restJson1InvalidRequestExceptionResponse(parsedOutput, context);
    case "ResourceNotFoundException":
    case "com.amazonaws.sso#ResourceNotFoundException":
      throw await deserializeAws_restJson1ResourceNotFoundExceptionResponse(parsedOutput, context);
    case "TooManyRequestsException":
    case "com.amazonaws.sso#TooManyRequestsException":
      throw await deserializeAws_restJson1TooManyRequestsExceptionResponse(parsedOutput, context);
    case "UnauthorizedException":
    case "com.amazonaws.sso#UnauthorizedException":
      throw await deserializeAws_restJson1UnauthorizedExceptionResponse(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody,
        exceptionCtor: SSOServiceException,
        errorCode
      });
  }
};
var map2 = map;
var deserializeAws_restJson1InvalidRequestExceptionResponse = async (parsedOutput, context) => {
  const contents = map2({});
  const data = parsedOutput.body;
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new InvalidRequestException({
    $metadata: deserializeMetadata4(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1ResourceNotFoundExceptionResponse = async (parsedOutput, context) => {
  const contents = map2({});
  const data = parsedOutput.body;
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new ResourceNotFoundException2({
    $metadata: deserializeMetadata4(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1TooManyRequestsExceptionResponse = async (parsedOutput, context) => {
  const contents = map2({});
  const data = parsedOutput.body;
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new TooManyRequestsException({
    $metadata: deserializeMetadata4(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1UnauthorizedExceptionResponse = async (parsedOutput, context) => {
  const contents = map2({});
  const data = parsedOutput.body;
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new UnauthorizedException({
    $metadata: deserializeMetadata4(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1RoleCredentials = (output, context) => {
  return {
    accessKeyId: expectString(output.accessKeyId),
    expiration: expectLong(output.expiration),
    secretAccessKey: expectString(output.secretAccessKey),
    sessionToken: expectString(output.sessionToken)
  };
};
var deserializeMetadata4 = (output) => ({
  httpStatusCode: output.statusCode,
  requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
  extendedRequestId: output.headers["x-amz-id-2"],
  cfId: output.headers["x-amz-cf-id"]
});
var collectBody3 = (streamBody = new Uint8Array(), context) => {
  if (streamBody instanceof Uint8Array) {
    return Promise.resolve(streamBody);
  }
  return context.streamCollector(streamBody) || Promise.resolve(new Uint8Array());
};
var collectBodyString3 = (streamBody, context) => collectBody3(streamBody, context).then((body) => context.utf8Encoder(body));
var isSerializableHeaderValue = (value) => value !== void 0 && value !== null && value !== "" && (!Object.getOwnPropertyNames(value).includes("length") || value.length != 0) && (!Object.getOwnPropertyNames(value).includes("size") || value.size != 0);
var parseBody3 = (streamBody, context) => collectBodyString3(streamBody, context).then((encoded) => {
  if (encoded.length) {
    return JSON.parse(encoded);
  }
  return {};
});
var parseErrorBody3 = async (errorBody, context) => {
  const value = await parseBody3(errorBody, context);
  value.message = value.message ?? value.Message;
  return value;
};
var loadRestJsonErrorCode2 = (output, data) => {
  const findKey = (object, key) => Object.keys(object).find((k13) => k13.toLowerCase() === key.toLowerCase());
  const sanitizeErrorCode = (rawValue) => {
    let cleanValue = rawValue;
    if (typeof cleanValue === "number") {
      cleanValue = cleanValue.toString();
    }
    if (cleanValue.indexOf(",") >= 0) {
      cleanValue = cleanValue.split(",")[0];
    }
    if (cleanValue.indexOf(":") >= 0) {
      cleanValue = cleanValue.split(":")[0];
    }
    if (cleanValue.indexOf("#") >= 0) {
      cleanValue = cleanValue.split("#")[1];
    }
    return cleanValue;
  };
  const headerKey = findKey(output.headers, "x-amzn-errortype");
  if (headerKey !== void 0) {
    return sanitizeErrorCode(output.headers[headerKey]);
  }
  if (data.code !== void 0) {
    return sanitizeErrorCode(data.code);
  }
  if (data["__type"] !== void 0) {
    return sanitizeErrorCode(data["__type"]);
  }
};

// ../../node_modules/@aws-sdk/client-sso/dist-es/commands/GetRoleCredentialsCommand.js
var GetRoleCredentialsCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, GetRoleCredentialsCommand.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "SSOClient";
    const commandName = "GetRoleCredentialsCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: GetRoleCredentialsRequestFilterSensitiveLog,
      outputFilterSensitiveLog: GetRoleCredentialsResponseFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_restJson1GetRoleCredentialsCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_restJson1GetRoleCredentialsCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-sso/dist-es/endpoint/EndpointParameters.js
var resolveClientEndpointParameters3 = (options) => {
  return {
    ...options,
    useDualstackEndpoint: options.useDualstackEndpoint ?? false,
    useFipsEndpoint: options.useFipsEndpoint ?? false,
    defaultSigningName: "awsssoportal"
  };
};

// ../../node_modules/@aws-sdk/client-sso/package.json
var package_default3 = {
  name: "@aws-sdk/client-sso",
  description: "AWS SDK for JavaScript Sso Client for Node.js, Browser and React Native",
  version: "3.256.0",
  scripts: {
    build: "concurrently 'yarn:build:cjs' 'yarn:build:es' 'yarn:build:types'",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "build:docs": "typedoc",
    "build:es": "tsc -p tsconfig.es.json",
    "build:include:deps": "lerna run --scope $npm_package_name --include-dependencies build",
    "build:types": "tsc -p tsconfig.types.json",
    "build:types:downlevel": "downlevel-dts dist-types dist-types/ts3.4",
    clean: "rimraf ./dist-* && rimraf *.tsbuildinfo",
    "generate:client": "node ../../scripts/generate-clients/single-service --solo sso"
  },
  main: "./dist-cjs/index.js",
  types: "./dist-types/index.d.ts",
  module: "./dist-es/index.js",
  sideEffects: false,
  dependencies: {
    "@aws-crypto/sha256-browser": "3.0.0",
    "@aws-crypto/sha256-js": "3.0.0",
    "@aws-sdk/config-resolver": "3.254.0",
    "@aws-sdk/fetch-http-handler": "3.254.0",
    "@aws-sdk/hash-node": "3.254.0",
    "@aws-sdk/invalid-dependency": "3.254.0",
    "@aws-sdk/middleware-content-length": "3.254.0",
    "@aws-sdk/middleware-endpoint": "3.254.0",
    "@aws-sdk/middleware-host-header": "3.254.0",
    "@aws-sdk/middleware-logger": "3.254.0",
    "@aws-sdk/middleware-recursion-detection": "3.254.0",
    "@aws-sdk/middleware-retry": "3.254.0",
    "@aws-sdk/middleware-serde": "3.254.0",
    "@aws-sdk/middleware-stack": "3.254.0",
    "@aws-sdk/middleware-user-agent": "3.254.0",
    "@aws-sdk/node-config-provider": "3.254.0",
    "@aws-sdk/node-http-handler": "3.254.0",
    "@aws-sdk/protocol-http": "3.254.0",
    "@aws-sdk/smithy-client": "3.254.0",
    "@aws-sdk/types": "3.254.0",
    "@aws-sdk/url-parser": "3.254.0",
    "@aws-sdk/util-base64": "3.208.0",
    "@aws-sdk/util-body-length-browser": "3.188.0",
    "@aws-sdk/util-body-length-node": "3.208.0",
    "@aws-sdk/util-defaults-mode-browser": "3.254.0",
    "@aws-sdk/util-defaults-mode-node": "3.254.0",
    "@aws-sdk/util-endpoints": "3.254.0",
    "@aws-sdk/util-retry": "3.254.0",
    "@aws-sdk/util-user-agent-browser": "3.254.0",
    "@aws-sdk/util-user-agent-node": "3.254.0",
    "@aws-sdk/util-utf8-browser": "3.188.0",
    "@aws-sdk/util-utf8-node": "3.208.0",
    tslib: "^2.3.1"
  },
  devDependencies: {
    "@aws-sdk/service-client-documentation-generator": "3.208.0",
    "@tsconfig/node14": "1.0.3",
    "@types/node": "^14.14.31",
    concurrently: "7.0.0",
    "downlevel-dts": "0.10.1",
    rimraf: "3.0.2",
    typedoc: "0.19.2",
    typescript: "~4.6.2"
  },
  overrides: {
    typedoc: {
      typescript: "~4.6.2"
    }
  },
  engines: {
    node: ">=14.0.0"
  },
  typesVersions: {
    "<4.0": {
      "dist-types/*": [
        "dist-types/ts3.4/*"
      ]
    }
  },
  files: [
    "dist-*"
  ],
  author: {
    name: "AWS SDK for JavaScript Team",
    url: "https://aws.amazon.com/javascript/"
  },
  license: "Apache-2.0",
  browser: {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.browser"
  },
  "react-native": {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.native"
  },
  homepage: "https://github.com/aws/aws-sdk-js-v3/tree/main/clients/client-sso",
  repository: {
    type: "git",
    url: "https://github.com/aws/aws-sdk-js-v3.git",
    directory: "clients/client-sso"
  }
};

// ../../node_modules/@aws-sdk/hash-node/dist-es/index.js
var import_buffer3 = require("buffer");
var import_crypto2 = require("crypto");
var Hash = class {
  constructor(algorithmIdentifier, secret) {
    this.algorithmIdentifier = algorithmIdentifier;
    this.secret = secret;
    this.reset();
  }
  update(toHash, encoding) {
    this.hash.update(toUint8Array(castSourceData(toHash, encoding)));
  }
  digest() {
    return Promise.resolve(this.hash.digest());
  }
  reset() {
    this.hash = this.secret ? (0, import_crypto2.createHmac)(this.algorithmIdentifier, castSourceData(this.secret)) : (0, import_crypto2.createHash)(this.algorithmIdentifier);
  }
};
function castSourceData(toCast, encoding) {
  if (import_buffer3.Buffer.isBuffer(toCast)) {
    return toCast;
  }
  if (typeof toCast === "string") {
    return fromString(toCast, encoding);
  }
  if (ArrayBuffer.isView(toCast)) {
    return fromArrayBuffer(toCast.buffer, toCast.byteOffset, toCast.byteLength);
  }
  return fromArrayBuffer(toCast);
}

// ../../node_modules/@aws-sdk/querystring-builder/dist-es/index.js
function buildQueryString(query) {
  const parts = [];
  for (let key of Object.keys(query).sort()) {
    const value = query[key];
    key = escapeUri(key);
    if (Array.isArray(value)) {
      for (let i13 = 0, iLen = value.length; i13 < iLen; i13++) {
        parts.push(`${key}=${escapeUri(value[i13])}`);
      }
    } else {
      let qsEntry = key;
      if (value || typeof value === "string") {
        qsEntry += `=${escapeUri(value)}`;
      }
      parts.push(qsEntry);
    }
  }
  return parts.join("&");
}

// ../../node_modules/@aws-sdk/node-http-handler/dist-es/node-http-handler.js
var import_http2 = require("http");
var import_https = require("https");

// ../../node_modules/@aws-sdk/node-http-handler/dist-es/constants.js
var NODEJS_TIMEOUT_ERROR_CODES2 = ["ECONNRESET", "EPIPE", "ETIMEDOUT"];

// ../../node_modules/@aws-sdk/node-http-handler/dist-es/get-transformed-headers.js
var getTransformedHeaders = (headers) => {
  const transformedHeaders = {};
  for (const name of Object.keys(headers)) {
    const headerValues = headers[name];
    transformedHeaders[name] = Array.isArray(headerValues) ? headerValues.join(",") : headerValues;
  }
  return transformedHeaders;
};

// ../../node_modules/@aws-sdk/node-http-handler/dist-es/set-connection-timeout.js
var setConnectionTimeout = (request2, reject, timeoutInMs = 0) => {
  if (!timeoutInMs) {
    return;
  }
  request2.on("socket", (socket) => {
    if (socket.connecting) {
      const timeoutId = setTimeout(() => {
        request2.destroy();
        reject(Object.assign(new Error(`Socket timed out without establishing a connection within ${timeoutInMs} ms`), {
          name: "TimeoutError"
        }));
      }, timeoutInMs);
      socket.on("connect", () => {
        clearTimeout(timeoutId);
      });
    }
  });
};

// ../../node_modules/@aws-sdk/node-http-handler/dist-es/set-socket-timeout.js
var setSocketTimeout = (request2, reject, timeoutInMs = 0) => {
  request2.setTimeout(timeoutInMs, () => {
    request2.destroy();
    reject(Object.assign(new Error(`Connection timed out after ${timeoutInMs} ms`), { name: "TimeoutError" }));
  });
};

// ../../node_modules/@aws-sdk/node-http-handler/dist-es/write-request-body.js
var import_stream = require("stream");
function writeRequestBody(httpRequest2, request2) {
  const expect = request2.headers["Expect"] || request2.headers["expect"];
  if (expect === "100-continue") {
    httpRequest2.on("continue", () => {
      writeBody(httpRequest2, request2.body);
    });
  } else {
    writeBody(httpRequest2, request2.body);
  }
}
function writeBody(httpRequest2, body) {
  if (body instanceof import_stream.Readable) {
    body.pipe(httpRequest2);
  } else if (body) {
    httpRequest2.end(Buffer.from(body));
  } else {
    httpRequest2.end();
  }
}

// ../../node_modules/@aws-sdk/node-http-handler/dist-es/node-http-handler.js
var NodeHttpHandler = class {
  constructor(options) {
    this.metadata = { handlerProtocol: "http/1.1" };
    this.configProvider = new Promise((resolve, reject) => {
      if (typeof options === "function") {
        options().then((_options) => {
          resolve(this.resolveDefaultConfig(_options));
        }).catch(reject);
      } else {
        resolve(this.resolveDefaultConfig(options));
      }
    });
  }
  resolveDefaultConfig(options) {
    const { connectionTimeout, socketTimeout, httpAgent, httpsAgent } = options || {};
    const keepAlive = true;
    const maxSockets = 50;
    return {
      connectionTimeout,
      socketTimeout,
      httpAgent: httpAgent || new import_http2.Agent({ keepAlive, maxSockets }),
      httpsAgent: httpsAgent || new import_https.Agent({ keepAlive, maxSockets })
    };
  }
  destroy() {
    this.config?.httpAgent?.destroy();
    this.config?.httpsAgent?.destroy();
  }
  async handle(request2, { abortSignal } = {}) {
    if (!this.config) {
      this.config = await this.configProvider;
    }
    return new Promise((resolve, reject) => {
      if (!this.config) {
        throw new Error("Node HTTP request handler config is not resolved");
      }
      if (abortSignal?.aborted) {
        const abortError = new Error("Request aborted");
        abortError.name = "AbortError";
        reject(abortError);
        return;
      }
      const isSSL = request2.protocol === "https:";
      const queryString = buildQueryString(request2.query || {});
      const nodeHttpsOptions = {
        headers: request2.headers,
        host: request2.hostname,
        method: request2.method,
        path: queryString ? `${request2.path}?${queryString}` : request2.path,
        port: request2.port,
        agent: isSSL ? this.config.httpsAgent : this.config.httpAgent
      };
      const requestFunc = isSSL ? import_https.request : import_http2.request;
      const req = requestFunc(nodeHttpsOptions, (res) => {
        const httpResponse = new HttpResponse({
          statusCode: res.statusCode || -1,
          headers: getTransformedHeaders(res.headers),
          body: res
        });
        resolve({ response: httpResponse });
      });
      req.on("error", (err) => {
        if (NODEJS_TIMEOUT_ERROR_CODES2.includes(err.code)) {
          reject(Object.assign(err, { name: "TimeoutError" }));
        } else {
          reject(err);
        }
      });
      setConnectionTimeout(req, reject, this.config.connectionTimeout);
      setSocketTimeout(req, reject, this.config.socketTimeout);
      if (abortSignal) {
        abortSignal.onabort = () => {
          req.abort();
          const abortError = new Error("Request aborted");
          abortError.name = "AbortError";
          reject(abortError);
        };
      }
      writeRequestBody(req, request2);
    });
  }
};

// ../../node_modules/@aws-sdk/node-http-handler/dist-es/stream-collector/collector.js
var import_stream2 = require("stream");
var Collector = class extends import_stream2.Writable {
  constructor() {
    super(...arguments);
    this.bufferedBytes = [];
  }
  _write(chunk, encoding, callback) {
    this.bufferedBytes.push(chunk);
    callback();
  }
};

// ../../node_modules/@aws-sdk/node-http-handler/dist-es/stream-collector/index.js
var streamCollector = (stream) => new Promise((resolve, reject) => {
  const collector = new Collector();
  stream.pipe(collector);
  stream.on("error", (err) => {
    collector.end();
    reject(err);
  });
  collector.on("error", reject);
  collector.on("finish", function() {
    const bytes = new Uint8Array(Buffer.concat(this.bufferedBytes));
    resolve(bytes);
  });
});

// ../../node_modules/@aws-sdk/util-body-length-node/dist-es/calculateBodyLength.js
var import_fs3 = require("fs");
var calculateBodyLength = (body) => {
  if (!body) {
    return 0;
  }
  if (typeof body === "string") {
    return Buffer.from(body).length;
  } else if (typeof body.byteLength === "number") {
    return body.byteLength;
  } else if (typeof body.size === "number") {
    return body.size;
  } else if (typeof body.path === "string" || Buffer.isBuffer(body.path)) {
    return (0, import_fs3.lstatSync)(body.path).size;
  } else if (typeof body.fd === "number") {
    return (0, import_fs3.fstatSync)(body.fd).size;
  }
  throw new Error(`Body Length computation failed for ${body}`);
};

// ../../node_modules/@aws-sdk/util-user-agent-node/dist-es/index.js
var import_os2 = require("os");
var import_process = require("process");

// ../../node_modules/@aws-sdk/util-user-agent-node/dist-es/is-crt-available.js
var isCrtAvailable = () => {
  try {
    if (typeof require === "function" && typeof module !== "undefined" && module.require && require("aws-crt")) {
      return ["md/crt-avail"];
    }
    return null;
  } catch (e13) {
    return null;
  }
};

// ../../node_modules/@aws-sdk/util-user-agent-node/dist-es/index.js
var UA_APP_ID_ENV_NAME = "AWS_SDK_UA_APP_ID";
var UA_APP_ID_INI_NAME = "sdk-ua-app-id";
var defaultUserAgent = ({ serviceId, clientVersion }) => {
  const sections = [
    ["aws-sdk-js", clientVersion],
    [`os/${(0, import_os2.platform)()}`, (0, import_os2.release)()],
    ["lang/js"],
    ["md/nodejs", `${import_process.versions.node}`]
  ];
  const crtAvailable = isCrtAvailable();
  if (crtAvailable) {
    sections.push(crtAvailable);
  }
  if (serviceId) {
    sections.push([`api/${serviceId}`, clientVersion]);
  }
  if (import_process.env.AWS_EXECUTION_ENV) {
    sections.push([`exec-env/${import_process.env.AWS_EXECUTION_ENV}`]);
  }
  const appIdPromise = loadConfig({
    environmentVariableSelector: (env2) => env2[UA_APP_ID_ENV_NAME],
    configFileSelector: (profile) => profile[UA_APP_ID_INI_NAME],
    default: void 0
  })();
  let resolvedUserAgent = void 0;
  return async () => {
    if (!resolvedUserAgent) {
      const appId = await appIdPromise;
      resolvedUserAgent = appId ? [...sections, [`app/${appId}`]] : [...sections];
    }
    return resolvedUserAgent;
  };
};

// ../../node_modules/@aws-sdk/util-utf8-node/dist-es/index.js
var fromUtf82 = (input) => {
  const buf = fromString(input, "utf8");
  return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength / Uint8Array.BYTES_PER_ELEMENT);
};
var toUtf8 = (input) => fromArrayBuffer(input.buffer, input.byteOffset, input.byteLength).toString("utf8");

// ../../node_modules/@aws-sdk/util-base64/dist-es/fromBase64.js
var BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/;
var fromBase64 = (input) => {
  if (input.length * 3 % 4 !== 0) {
    throw new TypeError(`Incorrect padding on base64 string.`);
  }
  if (!BASE64_REGEX.exec(input)) {
    throw new TypeError(`Invalid base64 string.`);
  }
  const buffer = fromString(input, "base64");
  return new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
};

// ../../node_modules/@aws-sdk/util-base64/dist-es/toBase64.js
var toBase64 = (input) => fromArrayBuffer(input.buffer, input.byteOffset, input.byteLength).toString("base64");

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/lib/aws/partitions.json
var partitions_default = {
  partitions: [{
    id: "aws",
    outputs: {
      dnsSuffix: "amazonaws.com",
      dualStackDnsSuffix: "api.aws",
      name: "aws",
      supportsDualStack: true,
      supportsFIPS: true
    },
    regionRegex: "^(us|eu|ap|sa|ca|me|af)\\-\\w+\\-\\d+$",
    regions: {
      "af-south-1": {
        description: "Africa (Cape Town)"
      },
      "ap-east-1": {
        description: "Asia Pacific (Hong Kong)"
      },
      "ap-northeast-1": {
        description: "Asia Pacific (Tokyo)"
      },
      "ap-northeast-2": {
        description: "Asia Pacific (Seoul)"
      },
      "ap-northeast-3": {
        description: "Asia Pacific (Osaka)"
      },
      "ap-south-1": {
        description: "Asia Pacific (Mumbai)"
      },
      "ap-south-2": {
        description: "Asia Pacific (Hyderabad)"
      },
      "ap-southeast-1": {
        description: "Asia Pacific (Singapore)"
      },
      "ap-southeast-2": {
        description: "Asia Pacific (Sydney)"
      },
      "ap-southeast-3": {
        description: "Asia Pacific (Jakarta)"
      },
      "aws-global": {
        description: "AWS Standard global region"
      },
      "ca-central-1": {
        description: "Canada (Central)"
      },
      "eu-central-1": {
        description: "Europe (Frankfurt)"
      },
      "eu-central-2": {
        description: "Europe (Zurich)"
      },
      "eu-north-1": {
        description: "Europe (Stockholm)"
      },
      "eu-south-1": {
        description: "Europe (Milan)"
      },
      "eu-south-2": {
        description: "Europe (Spain)"
      },
      "eu-west-1": {
        description: "Europe (Ireland)"
      },
      "eu-west-2": {
        description: "Europe (London)"
      },
      "eu-west-3": {
        description: "Europe (Paris)"
      },
      "me-central-1": {
        description: "Middle East (UAE)"
      },
      "me-south-1": {
        description: "Middle East (Bahrain)"
      },
      "sa-east-1": {
        description: "South America (Sao Paulo)"
      },
      "us-east-1": {
        description: "US East (N. Virginia)"
      },
      "us-east-2": {
        description: "US East (Ohio)"
      },
      "us-west-1": {
        description: "US West (N. California)"
      },
      "us-west-2": {
        description: "US West (Oregon)"
      }
    }
  }, {
    id: "aws-cn",
    outputs: {
      dnsSuffix: "amazonaws.com.cn",
      dualStackDnsSuffix: "api.amazonwebservices.com.cn",
      name: "aws-cn",
      supportsDualStack: true,
      supportsFIPS: true
    },
    regionRegex: "^cn\\-\\w+\\-\\d+$",
    regions: {
      "aws-cn-global": {
        description: "AWS China global region"
      },
      "cn-north-1": {
        description: "China (Beijing)"
      },
      "cn-northwest-1": {
        description: "China (Ningxia)"
      }
    }
  }, {
    id: "aws-us-gov",
    outputs: {
      dnsSuffix: "amazonaws.com",
      dualStackDnsSuffix: "api.aws",
      name: "aws-us-gov",
      supportsDualStack: true,
      supportsFIPS: true
    },
    regionRegex: "^us\\-gov\\-\\w+\\-\\d+$",
    regions: {
      "aws-us-gov-global": {
        description: "AWS GovCloud (US) global region"
      },
      "us-gov-east-1": {
        description: "AWS GovCloud (US-East)"
      },
      "us-gov-west-1": {
        description: "AWS GovCloud (US-West)"
      }
    }
  }, {
    id: "aws-iso",
    outputs: {
      dnsSuffix: "c2s.ic.gov",
      dualStackDnsSuffix: "c2s.ic.gov",
      name: "aws-iso",
      supportsDualStack: false,
      supportsFIPS: true
    },
    regionRegex: "^us\\-iso\\-\\w+\\-\\d+$",
    regions: {
      "aws-iso-global": {
        description: "AWS ISO (US) global region"
      },
      "us-iso-east-1": {
        description: "US ISO East"
      },
      "us-iso-west-1": {
        description: "US ISO WEST"
      }
    }
  }, {
    id: "aws-iso-b",
    outputs: {
      dnsSuffix: "sc2s.sgov.gov",
      dualStackDnsSuffix: "sc2s.sgov.gov",
      name: "aws-iso-b",
      supportsDualStack: false,
      supportsFIPS: true
    },
    regionRegex: "^us\\-isob\\-\\w+\\-\\d+$",
    regions: {
      "aws-iso-b-global": {
        description: "AWS ISOB (US) global region"
      },
      "us-isob-east-1": {
        description: "US ISOB East (Ohio)"
      }
    }
  }],
  version: "1.1"
};

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/lib/aws/partition.js
var { partitions } = partitions_default;
var DEFAULT_PARTITION = partitions.find((partition2) => partition2.id === "aws");
var partition = (value) => {
  for (const partition2 of partitions) {
    const { regions, outputs } = partition2;
    for (const [region, regionData] of Object.entries(regions)) {
      if (region === value) {
        return {
          ...outputs,
          ...regionData
        };
      }
    }
  }
  for (const partition2 of partitions) {
    const { regionRegex, outputs } = partition2;
    if (new RegExp(regionRegex).test(value)) {
      return {
        ...outputs
      };
    }
  }
  if (!DEFAULT_PARTITION) {
    throw new Error("Provided region was not found in the partition array or regex, and default partition with id 'aws' doesn't exist.");
  }
  return {
    ...DEFAULT_PARTITION.outputs
  };
};

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/debug/debugId.js
var debugId = "endpoints";

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/debug/toDebugString.js
function toDebugString(input) {
  if (typeof input !== "object" || input == null) {
    return input;
  }
  if ("ref" in input) {
    return `$${toDebugString(input.ref)}`;
  }
  if ("fn" in input) {
    return `${input.fn}(${(input.argv || []).map(toDebugString).join(", ")})`;
  }
  return JSON.stringify(input, null, 2);
}

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/types/EndpointError.js
var EndpointError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "EndpointError";
  }
};

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/lib/index.js
var lib_exports = {};
__export(lib_exports, {
  aws: () => aws_exports,
  booleanEquals: () => booleanEquals,
  getAttr: () => getAttr,
  isSet: () => isSet,
  isValidHostLabel: () => isValidHostLabel,
  not: () => not,
  parseURL: () => parseURL,
  stringEquals: () => stringEquals,
  substring: () => substring,
  uriEncode: () => uriEncode
});

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/lib/aws/index.js
var aws_exports = {};
__export(aws_exports, {
  isVirtualHostableS3Bucket: () => isVirtualHostableS3Bucket,
  parseArn: () => parseArn,
  partition: () => partition
});

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/lib/isIpAddress.js
var IP_V4_REGEX = new RegExp(`^(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)(?:\\.(?:25[0-5]|2[0-4]\\d|1\\d\\d|[1-9]\\d|\\d)){3}$`);
var isIpAddress = (value) => IP_V4_REGEX.test(value) || value.startsWith("[") && value.endsWith("]");

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/lib/isValidHostLabel.js
var VALID_HOST_LABEL_REGEX = new RegExp(`^(?!.*-$)(?!-)[a-zA-Z0-9-]{1,63}$`);
var isValidHostLabel = (value, allowSubDomains = false) => {
  if (!allowSubDomains) {
    return VALID_HOST_LABEL_REGEX.test(value);
  }
  const labels = value.split(".");
  for (const label of labels) {
    if (!isValidHostLabel(label)) {
      return false;
    }
  }
  return true;
};

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/lib/aws/isVirtualHostableS3Bucket.js
var isVirtualHostableS3Bucket = (value, allowSubDomains = false) => {
  if (allowSubDomains) {
    for (const label of value.split(".")) {
      if (!isVirtualHostableS3Bucket(label)) {
        return false;
      }
    }
    return true;
  }
  if (!isValidHostLabel(value)) {
    return false;
  }
  if (value.length < 3 || value.length > 63) {
    return false;
  }
  if (value !== value.toLowerCase()) {
    return false;
  }
  if (isIpAddress(value)) {
    return false;
  }
  return true;
};

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/lib/aws/parseArn.js
var parseArn = (value) => {
  const segments = value.split(":");
  if (segments.length < 6)
    return null;
  const [arn, partition2, service, region, accountId, ...resourceId] = segments;
  if (arn !== "arn" || partition2 === "" || service === "" || resourceId[0] === "")
    return null;
  return {
    partition: partition2,
    service,
    region,
    accountId,
    resourceId: resourceId[0].includes("/") ? resourceId[0].split("/") : resourceId
  };
};

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/lib/booleanEquals.js
var booleanEquals = (value1, value2) => value1 === value2;

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/lib/getAttrPathList.js
var getAttrPathList = (path) => {
  const parts = path.split(".");
  const pathList = [];
  for (const part of parts) {
    const squareBracketIndex = part.indexOf("[");
    if (squareBracketIndex !== -1) {
      if (part.indexOf("]") !== part.length - 1) {
        throw new EndpointError(`Path: '${path}' does not end with ']'`);
      }
      const arrayIndex = part.slice(squareBracketIndex + 1, -1);
      if (Number.isNaN(parseInt(arrayIndex))) {
        throw new EndpointError(`Invalid array index: '${arrayIndex}' in path: '${path}'`);
      }
      if (squareBracketIndex !== 0) {
        pathList.push(part.slice(0, squareBracketIndex));
      }
      pathList.push(arrayIndex);
    } else {
      pathList.push(part);
    }
  }
  return pathList;
};

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/lib/getAttr.js
var getAttr = (value, path) => getAttrPathList(path).reduce((acc, index) => {
  if (typeof acc !== "object") {
    throw new EndpointError(`Index '${index}' in '${path}' not found in '${JSON.stringify(value)}'`);
  } else if (Array.isArray(acc)) {
    return acc[parseInt(index)];
  }
  return acc[index];
}, value);

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/lib/isSet.js
var isSet = (value) => value != null;

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/lib/not.js
var not = (value) => !value;

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/lib/parseURL.js
var import_types3 = require("@aws-sdk/types");
var DEFAULT_PORTS = {
  [import_types3.EndpointURLScheme.HTTP]: 80,
  [import_types3.EndpointURLScheme.HTTPS]: 443
};
var parseURL = (value) => {
  const whatwgURL = (() => {
    try {
      if (value instanceof URL) {
        return value;
      }
      if (typeof value === "object" && "hostname" in value) {
        const { hostname: hostname2, port, protocol: protocol2 = "", path = "", query = {} } = value;
        const url = new URL(`${protocol2}//${hostname2}${port ? `:${port}` : ""}${path}`);
        url.search = Object.entries(query).map(([k13, v8]) => `${k13}=${v8}`).join("&");
        return url;
      }
      return new URL(value);
    } catch (error) {
      return null;
    }
  })();
  if (!whatwgURL) {
    console.error(`Unable to parse ${JSON.stringify(value)} as a whatwg URL.`);
    return null;
  }
  const urlString = whatwgURL.href;
  const { host, hostname, pathname, protocol, search } = whatwgURL;
  if (search) {
    return null;
  }
  const scheme = protocol.slice(0, -1);
  if (!Object.values(import_types3.EndpointURLScheme).includes(scheme)) {
    return null;
  }
  const isIp = isIpAddress(hostname);
  const inputContainsDefaultPort = urlString.includes(`${host}:${DEFAULT_PORTS[scheme]}`) || typeof value === "string" && value.includes(`${host}:${DEFAULT_PORTS[scheme]}`);
  const authority = `${host}${inputContainsDefaultPort ? `:${DEFAULT_PORTS[scheme]}` : ``}`;
  return {
    scheme,
    authority,
    path: pathname,
    normalizedPath: pathname.endsWith("/") ? pathname : `${pathname}/`,
    isIp
  };
};

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/lib/stringEquals.js
var stringEquals = (value1, value2) => value1 === value2;

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/lib/substring.js
var substring = (input, start, stop, reverse) => {
  if (start >= stop || input.length < stop) {
    return null;
  }
  if (!reverse) {
    return input.substring(start, stop);
  }
  return input.substring(input.length - stop, input.length - start);
};

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/lib/uriEncode.js
var uriEncode = (value) => encodeURIComponent(value).replace(/[!*'()]/g, (c13) => `%${c13.charCodeAt(0).toString(16).toUpperCase()}`);

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/utils/evaluateTemplate.js
var evaluateTemplate = (template, options) => {
  const evaluatedTemplateArr = [];
  const templateContext = {
    ...options.endpointParams,
    ...options.referenceRecord
  };
  let currentIndex = 0;
  while (currentIndex < template.length) {
    const openingBraceIndex = template.indexOf("{", currentIndex);
    if (openingBraceIndex === -1) {
      evaluatedTemplateArr.push(template.slice(currentIndex));
      break;
    }
    evaluatedTemplateArr.push(template.slice(currentIndex, openingBraceIndex));
    const closingBraceIndex = template.indexOf("}", openingBraceIndex);
    if (closingBraceIndex === -1) {
      evaluatedTemplateArr.push(template.slice(openingBraceIndex));
      break;
    }
    if (template[openingBraceIndex + 1] === "{" && template[closingBraceIndex + 1] === "}") {
      evaluatedTemplateArr.push(template.slice(openingBraceIndex + 1, closingBraceIndex));
      currentIndex = closingBraceIndex + 2;
    }
    const parameterName = template.substring(openingBraceIndex + 1, closingBraceIndex);
    if (parameterName.includes("#")) {
      const [refName, attrName] = parameterName.split("#");
      evaluatedTemplateArr.push(getAttr(templateContext[refName], attrName));
    } else {
      evaluatedTemplateArr.push(templateContext[parameterName]);
    }
    currentIndex = closingBraceIndex + 1;
  }
  return evaluatedTemplateArr.join("");
};

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/utils/getReferenceValue.js
var getReferenceValue = ({ ref }, options) => {
  const referenceRecord = {
    ...options.endpointParams,
    ...options.referenceRecord
  };
  return referenceRecord[ref];
};

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/utils/evaluateExpression.js
var evaluateExpression = (obj, keyName, options) => {
  if (typeof obj === "string") {
    return evaluateTemplate(obj, options);
  } else if (obj["fn"]) {
    return callFunction(obj, options);
  } else if (obj["ref"]) {
    return getReferenceValue(obj, options);
  }
  throw new EndpointError(`'${keyName}': ${String(obj)} is not a string, function or reference.`);
};

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/utils/callFunction.js
var callFunction = ({ fn, argv }, options) => {
  const evaluatedArgs = argv.map((arg) => ["boolean", "number"].includes(typeof arg) ? arg : evaluateExpression(arg, "arg", options));
  return fn.split(".").reduce((acc, key) => acc[key], lib_exports)(...evaluatedArgs);
};

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/utils/evaluateCondition.js
var evaluateCondition = ({ assign, ...fnArgs }, options) => {
  if (assign && assign in options.referenceRecord) {
    throw new EndpointError(`'${assign}' is already defined in Reference Record.`);
  }
  const value = callFunction(fnArgs, options);
  options.logger?.debug?.(debugId, `evaluateCondition: ${toDebugString(fnArgs)} = ${toDebugString(value)}`);
  return {
    result: value === "" ? true : !!value,
    ...assign != null && { toAssign: { name: assign, value } }
  };
};

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/utils/evaluateConditions.js
var evaluateConditions = (conditions = [], options) => {
  const conditionsReferenceRecord = {};
  for (const condition of conditions) {
    const { result, toAssign } = evaluateCondition(condition, {
      ...options,
      referenceRecord: {
        ...options.referenceRecord,
        ...conditionsReferenceRecord
      }
    });
    if (!result) {
      return { result };
    }
    if (toAssign) {
      conditionsReferenceRecord[toAssign.name] = toAssign.value;
      options.logger?.debug?.(debugId, `assign: ${toAssign.name} := ${toDebugString(toAssign.value)}`);
    }
  }
  return { result: true, referenceRecord: conditionsReferenceRecord };
};

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/utils/getEndpointHeaders.js
var getEndpointHeaders = (headers, options) => Object.entries(headers).reduce((acc, [headerKey, headerVal]) => ({
  ...acc,
  [headerKey]: headerVal.map((headerValEntry) => {
    const processedExpr = evaluateExpression(headerValEntry, "Header value entry", options);
    if (typeof processedExpr !== "string") {
      throw new EndpointError(`Header '${headerKey}' value '${processedExpr}' is not a string`);
    }
    return processedExpr;
  })
}), {});

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/utils/getEndpointProperty.js
var getEndpointProperty = (property, options) => {
  if (Array.isArray(property)) {
    return property.map((propertyEntry) => getEndpointProperty(propertyEntry, options));
  }
  switch (typeof property) {
    case "string":
      return evaluateTemplate(property, options);
    case "object":
      if (property === null) {
        throw new EndpointError(`Unexpected endpoint property: ${property}`);
      }
      return getEndpointProperties(property, options);
    case "boolean":
      return property;
    default:
      throw new EndpointError(`Unexpected endpoint property type: ${typeof property}`);
  }
};

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/utils/getEndpointProperties.js
var getEndpointProperties = (properties, options) => Object.entries(properties).reduce((acc, [propertyKey, propertyVal]) => ({
  ...acc,
  [propertyKey]: getEndpointProperty(propertyVal, options)
}), {});

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/utils/getEndpointUrl.js
var getEndpointUrl = (endpointUrl, options) => {
  const expression = evaluateExpression(endpointUrl, "Endpoint URL", options);
  if (typeof expression === "string") {
    try {
      return new URL(expression);
    } catch (error) {
      console.error(`Failed to construct URL with ${expression}`, error);
      throw error;
    }
  }
  throw new EndpointError(`Endpoint URL must be a string, got ${typeof expression}`);
};

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/utils/evaluateEndpointRule.js
var evaluateEndpointRule = (endpointRule, options) => {
  const { conditions, endpoint } = endpointRule;
  const { result, referenceRecord } = evaluateConditions(conditions, options);
  if (!result) {
    return;
  }
  const endpointRuleOptions = {
    ...options,
    referenceRecord: { ...options.referenceRecord, ...referenceRecord }
  };
  const { url, properties, headers } = endpoint;
  options.logger?.debug?.(debugId, `Resolving endpoint from template: ${toDebugString(endpoint)}`);
  return {
    ...headers != void 0 && {
      headers: getEndpointHeaders(headers, endpointRuleOptions)
    },
    ...properties != void 0 && {
      properties: getEndpointProperties(properties, endpointRuleOptions)
    },
    url: getEndpointUrl(url, endpointRuleOptions)
  };
};

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/utils/evaluateErrorRule.js
var evaluateErrorRule = (errorRule, options) => {
  const { conditions, error } = errorRule;
  const { result, referenceRecord } = evaluateConditions(conditions, options);
  if (!result) {
    return;
  }
  throw new EndpointError(evaluateExpression(error, "Error", {
    ...options,
    referenceRecord: { ...options.referenceRecord, ...referenceRecord }
  }));
};

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/utils/evaluateTreeRule.js
var evaluateTreeRule = (treeRule, options) => {
  const { conditions, rules } = treeRule;
  const { result, referenceRecord } = evaluateConditions(conditions, options);
  if (!result) {
    return;
  }
  return evaluateRules(rules, {
    ...options,
    referenceRecord: { ...options.referenceRecord, ...referenceRecord }
  });
};

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/utils/evaluateRules.js
var evaluateRules = (rules, options) => {
  for (const rule of rules) {
    if (rule.type === "endpoint") {
      const endpointOrUndefined = evaluateEndpointRule(rule, options);
      if (endpointOrUndefined) {
        return endpointOrUndefined;
      }
    } else if (rule.type === "error") {
      evaluateErrorRule(rule, options);
    } else if (rule.type === "tree") {
      const endpointOrUndefined = evaluateTreeRule(rule, options);
      if (endpointOrUndefined) {
        return endpointOrUndefined;
      }
    } else {
      throw new EndpointError(`Unknown endpoint rule: ${rule}`);
    }
  }
  throw new EndpointError(`Rules evaluation failed`);
};

// ../../node_modules/@aws-sdk/util-endpoints/dist-es/resolveEndpoint.js
var resolveEndpoint = (ruleSetObject, options) => {
  const { endpointParams, logger: logger2 } = options;
  const { parameters, rules } = ruleSetObject;
  options.logger?.debug?.(debugId, `Initial EndpointParams: ${toDebugString(endpointParams)}`);
  const paramsWithDefault = Object.entries(parameters).filter(([, v8]) => v8.default != null).map(([k13, v8]) => [k13, v8.default]);
  if (paramsWithDefault.length > 0) {
    for (const [paramKey, paramDefaultValue] of paramsWithDefault) {
      endpointParams[paramKey] = endpointParams[paramKey] ?? paramDefaultValue;
    }
  }
  const requiredParams = Object.entries(parameters).filter(([, v8]) => v8.required).map(([k13]) => k13);
  for (const requiredParam of requiredParams) {
    if (endpointParams[requiredParam] == null) {
      throw new EndpointError(`Missing required parameter: '${requiredParam}'`);
    }
  }
  const endpoint = evaluateRules(rules, { endpointParams, logger: logger2, referenceRecord: {} });
  if (options.endpointParams?.Endpoint) {
    try {
      const givenEndpoint = new URL(options.endpointParams.Endpoint);
      const { protocol, port } = givenEndpoint;
      endpoint.url.protocol = protocol;
      endpoint.url.port = port;
    } catch (e13) {
    }
  }
  options.logger?.debug?.(debugId, `Resolved endpoint: ${toDebugString(endpoint)}`);
  return endpoint;
};

// ../../node_modules/@aws-sdk/client-sso/dist-es/endpoint/ruleset.js
var p = "required";
var q = "fn";
var r = "argv";
var s = "ref";
var a = "PartitionResult";
var b = "tree";
var c = "error";
var d = "endpoint";
var e = { [p]: false, "type": "String" };
var f = { [p]: true, "default": false, "type": "Boolean" };
var g = { [s]: "Endpoint" };
var h = { [q]: "booleanEquals", [r]: [{ [s]: "UseFIPS" }, true] };
var i = { [q]: "booleanEquals", [r]: [{ [s]: "UseDualStack" }, true] };
var j = {};
var k = { [q]: "booleanEquals", [r]: [true, { [q]: "getAttr", [r]: [{ [s]: a }, "supportsFIPS"] }] };
var l = { [q]: "booleanEquals", [r]: [true, { [q]: "getAttr", [r]: [{ [s]: a }, "supportsDualStack"] }] };
var m = [g];
var n = [h];
var o = [i];
var _data = { version: "1.0", parameters: { Region: e, UseDualStack: f, UseFIPS: f, Endpoint: e }, rules: [{ conditions: [{ [q]: "aws.partition", [r]: [{ [s]: "Region" }], assign: a }], type: b, rules: [{ conditions: [{ [q]: "isSet", [r]: m }, { [q]: "parseURL", [r]: m, assign: "url" }], type: b, rules: [{ conditions: n, error: "Invalid Configuration: FIPS and custom endpoint are not supported", type: c }, { type: b, rules: [{ conditions: o, error: "Invalid Configuration: Dualstack and custom endpoint are not supported", type: c }, { endpoint: { url: g, properties: j, headers: j }, type: d }] }] }, { conditions: [h, i], type: b, rules: [{ conditions: [k, l], type: b, rules: [{ endpoint: { url: "https://portal.sso-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: j, headers: j }, type: d }] }, { error: "FIPS and DualStack are enabled, but this partition does not support one or both", type: c }] }, { conditions: n, type: b, rules: [{ conditions: [k], type: b, rules: [{ type: b, rules: [{ endpoint: { url: "https://portal.sso-fips.{Region}.{PartitionResult#dnsSuffix}", properties: j, headers: j }, type: d }] }] }, { error: "FIPS is enabled but this partition does not support FIPS", type: c }] }, { conditions: o, type: b, rules: [{ conditions: [l], type: b, rules: [{ endpoint: { url: "https://portal.sso.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: j, headers: j }, type: d }] }, { error: "DualStack is enabled but this partition does not support DualStack", type: c }] }, { endpoint: { url: "https://portal.sso.{Region}.{PartitionResult#dnsSuffix}", properties: j, headers: j }, type: d }] }] };
var ruleSet = _data;

// ../../node_modules/@aws-sdk/client-sso/dist-es/endpoint/endpointResolver.js
var defaultEndpointResolver = (endpointParams, context = {}) => {
  return resolveEndpoint(ruleSet, {
    endpointParams,
    logger: context.logger
  });
};

// ../../node_modules/@aws-sdk/client-sso/dist-es/runtimeConfig.shared.js
var getRuntimeConfig = (config) => ({
  apiVersion: "2019-06-10",
  base64Decoder: config?.base64Decoder ?? fromBase64,
  base64Encoder: config?.base64Encoder ?? toBase64,
  disableHostPrefix: config?.disableHostPrefix ?? false,
  endpointProvider: config?.endpointProvider ?? defaultEndpointResolver,
  logger: config?.logger ?? new NoOpLogger(),
  serviceId: config?.serviceId ?? "SSO",
  urlParser: config?.urlParser ?? parseUrl
});

// ../../node_modules/@aws-sdk/util-defaults-mode-node/dist-es/constants.js
var AWS_EXECUTION_ENV = "AWS_EXECUTION_ENV";
var AWS_REGION_ENV = "AWS_REGION";
var AWS_DEFAULT_REGION_ENV = "AWS_DEFAULT_REGION";
var ENV_IMDS_DISABLED = "AWS_EC2_METADATA_DISABLED";
var DEFAULTS_MODE_OPTIONS = ["in-region", "cross-region", "mobile", "standard", "legacy"];
var IMDS_REGION_PATH = "/latest/meta-data/placement/region";

// ../../node_modules/@aws-sdk/util-defaults-mode-node/dist-es/defaultsModeConfig.js
var AWS_DEFAULTS_MODE_ENV = "AWS_DEFAULTS_MODE";
var AWS_DEFAULTS_MODE_CONFIG = "defaults_mode";
var NODE_DEFAULTS_MODE_CONFIG_OPTIONS = {
  environmentVariableSelector: (env2) => {
    return env2[AWS_DEFAULTS_MODE_ENV];
  },
  configFileSelector: (profile) => {
    return profile[AWS_DEFAULTS_MODE_CONFIG];
  },
  default: "legacy"
};

// ../../node_modules/@aws-sdk/util-defaults-mode-node/dist-es/resolveDefaultsModeConfig.js
var resolveDefaultsModeConfig = ({ region = loadConfig(NODE_REGION_CONFIG_OPTIONS), defaultsMode = loadConfig(NODE_DEFAULTS_MODE_CONFIG_OPTIONS) } = {}) => memoize(async () => {
  const mode = typeof defaultsMode === "function" ? await defaultsMode() : defaultsMode;
  switch (mode?.toLowerCase()) {
    case "auto":
      return resolveNodeDefaultsModeAuto(region);
    case "in-region":
    case "cross-region":
    case "mobile":
    case "standard":
    case "legacy":
      return Promise.resolve(mode?.toLocaleLowerCase());
    case void 0:
      return Promise.resolve("legacy");
    default:
      throw new Error(`Invalid parameter for "defaultsMode", expect ${DEFAULTS_MODE_OPTIONS.join(", ")}, got ${mode}`);
  }
});
var resolveNodeDefaultsModeAuto = async (clientRegion) => {
  if (clientRegion) {
    const resolvedRegion = typeof clientRegion === "function" ? await clientRegion() : clientRegion;
    const inferredRegion = await inferPhysicalRegion();
    if (!inferredRegion) {
      return "standard";
    }
    if (resolvedRegion === inferredRegion) {
      return "in-region";
    } else {
      return "cross-region";
    }
  }
  return "standard";
};
var inferPhysicalRegion = async () => {
  if (process.env[AWS_EXECUTION_ENV] && (process.env[AWS_REGION_ENV] || process.env[AWS_DEFAULT_REGION_ENV])) {
    return process.env[AWS_REGION_ENV] ?? process.env[AWS_DEFAULT_REGION_ENV];
  }
  if (!process.env[ENV_IMDS_DISABLED]) {
    try {
      const endpoint = await getInstanceMetadataEndpoint();
      return (await httpRequest({ ...endpoint, path: IMDS_REGION_PATH })).toString();
    } catch (e13) {
    }
  }
};

// ../../node_modules/@aws-sdk/client-sso/dist-es/runtimeConfig.js
var getRuntimeConfig2 = (config) => {
  emitWarningIfUnsupportedVersion(process.version);
  const defaultsMode = resolveDefaultsModeConfig(config);
  const defaultConfigProvider = () => defaultsMode().then(loadConfigsForDefaultMode);
  const clientSharedValues = getRuntimeConfig(config);
  return {
    ...clientSharedValues,
    ...config,
    runtime: "node",
    defaultsMode,
    bodyLengthChecker: config?.bodyLengthChecker ?? calculateBodyLength,
    defaultUserAgentProvider: config?.defaultUserAgentProvider ?? defaultUserAgent({ serviceId: clientSharedValues.serviceId, clientVersion: package_default3.version }),
    maxAttempts: config?.maxAttempts ?? loadConfig(NODE_MAX_ATTEMPT_CONFIG_OPTIONS),
    region: config?.region ?? loadConfig(NODE_REGION_CONFIG_OPTIONS, NODE_REGION_CONFIG_FILE_OPTIONS),
    requestHandler: config?.requestHandler ?? new NodeHttpHandler(defaultConfigProvider),
    retryMode: config?.retryMode ?? loadConfig({
      ...NODE_RETRY_MODE_CONFIG_OPTIONS,
      default: async () => (await defaultConfigProvider()).retryMode || DEFAULT_RETRY_MODE
    }),
    sha256: config?.sha256 ?? Hash.bind(null, "sha256"),
    streamCollector: config?.streamCollector ?? streamCollector,
    useDualstackEndpoint: config?.useDualstackEndpoint ?? loadConfig(NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS),
    useFipsEndpoint: config?.useFipsEndpoint ?? loadConfig(NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS),
    utf8Decoder: config?.utf8Decoder ?? fromUtf82,
    utf8Encoder: config?.utf8Encoder ?? toUtf8
  };
};

// ../../node_modules/@aws-sdk/client-sso/dist-es/SSOClient.js
var SSOClient = class extends Client {
  constructor(configuration) {
    const _config_0 = getRuntimeConfig2(configuration);
    const _config_1 = resolveClientEndpointParameters3(_config_0);
    const _config_2 = resolveRegionConfig(_config_1);
    const _config_3 = resolveEndpointConfig(_config_2);
    const _config_4 = resolveRetryConfig(_config_3);
    const _config_5 = resolveHostHeaderConfig(_config_4);
    const _config_6 = resolveUserAgentConfig(_config_5);
    super(_config_6);
    this.config = _config_6;
    this.middlewareStack.use(getRetryPlugin(this.config));
    this.middlewareStack.use(getContentLengthPlugin(this.config));
    this.middlewareStack.use(getHostHeaderPlugin(this.config));
    this.middlewareStack.use(getLoggerPlugin(this.config));
    this.middlewareStack.use(getRecursionDetectionPlugin(this.config));
    this.middlewareStack.use(getUserAgentPlugin(this.config));
  }
  destroy() {
    super.destroy();
  }
};

// ../../node_modules/@aws-sdk/token-providers/dist-es/constants.js
var EXPIRE_WINDOW_MS = 5 * 60 * 1e3;
var REFRESH_MESSAGE = `To refresh this SSO session run 'aws sso login' with the corresponding profile.`;

// ../../node_modules/@aws-sdk/client-sso-oidc/dist-es/models/SSOOIDCServiceException.js
var SSOOIDCServiceException = class extends ServiceException {
  constructor(options) {
    super(options);
    Object.setPrototypeOf(this, SSOOIDCServiceException.prototype);
  }
};

// ../../node_modules/@aws-sdk/client-sso-oidc/dist-es/models/models_0.js
var AccessDeniedException = class extends SSOOIDCServiceException {
  constructor(opts) {
    super({
      name: "AccessDeniedException",
      $fault: "client",
      ...opts
    });
    this.name = "AccessDeniedException";
    this.$fault = "client";
    Object.setPrototypeOf(this, AccessDeniedException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
var AuthorizationPendingException = class extends SSOOIDCServiceException {
  constructor(opts) {
    super({
      name: "AuthorizationPendingException",
      $fault: "client",
      ...opts
    });
    this.name = "AuthorizationPendingException";
    this.$fault = "client";
    Object.setPrototypeOf(this, AuthorizationPendingException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
var ExpiredTokenException2 = class extends SSOOIDCServiceException {
  constructor(opts) {
    super({
      name: "ExpiredTokenException",
      $fault: "client",
      ...opts
    });
    this.name = "ExpiredTokenException";
    this.$fault = "client";
    Object.setPrototypeOf(this, ExpiredTokenException2.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
var InternalServerException = class extends SSOOIDCServiceException {
  constructor(opts) {
    super({
      name: "InternalServerException",
      $fault: "server",
      ...opts
    });
    this.name = "InternalServerException";
    this.$fault = "server";
    Object.setPrototypeOf(this, InternalServerException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
var InvalidClientException = class extends SSOOIDCServiceException {
  constructor(opts) {
    super({
      name: "InvalidClientException",
      $fault: "client",
      ...opts
    });
    this.name = "InvalidClientException";
    this.$fault = "client";
    Object.setPrototypeOf(this, InvalidClientException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
var InvalidGrantException = class extends SSOOIDCServiceException {
  constructor(opts) {
    super({
      name: "InvalidGrantException",
      $fault: "client",
      ...opts
    });
    this.name = "InvalidGrantException";
    this.$fault = "client";
    Object.setPrototypeOf(this, InvalidGrantException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
var InvalidRequestException2 = class extends SSOOIDCServiceException {
  constructor(opts) {
    super({
      name: "InvalidRequestException",
      $fault: "client",
      ...opts
    });
    this.name = "InvalidRequestException";
    this.$fault = "client";
    Object.setPrototypeOf(this, InvalidRequestException2.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
var InvalidScopeException = class extends SSOOIDCServiceException {
  constructor(opts) {
    super({
      name: "InvalidScopeException",
      $fault: "client",
      ...opts
    });
    this.name = "InvalidScopeException";
    this.$fault = "client";
    Object.setPrototypeOf(this, InvalidScopeException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
var SlowDownException = class extends SSOOIDCServiceException {
  constructor(opts) {
    super({
      name: "SlowDownException",
      $fault: "client",
      ...opts
    });
    this.name = "SlowDownException";
    this.$fault = "client";
    Object.setPrototypeOf(this, SlowDownException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
var UnauthorizedClientException = class extends SSOOIDCServiceException {
  constructor(opts) {
    super({
      name: "UnauthorizedClientException",
      $fault: "client",
      ...opts
    });
    this.name = "UnauthorizedClientException";
    this.$fault = "client";
    Object.setPrototypeOf(this, UnauthorizedClientException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
var UnsupportedGrantTypeException = class extends SSOOIDCServiceException {
  constructor(opts) {
    super({
      name: "UnsupportedGrantTypeException",
      $fault: "client",
      ...opts
    });
    this.name = "UnsupportedGrantTypeException";
    this.$fault = "client";
    Object.setPrototypeOf(this, UnsupportedGrantTypeException.prototype);
    this.error = opts.error;
    this.error_description = opts.error_description;
  }
};
var CreateTokenRequestFilterSensitiveLog = (obj) => ({
  ...obj
});
var CreateTokenResponseFilterSensitiveLog = (obj) => ({
  ...obj
});

// ../../node_modules/@aws-sdk/client-sso-oidc/dist-es/protocols/Aws_restJson1.js
var serializeAws_restJson1CreateTokenCommand = async (input, context) => {
  const { hostname, protocol = "https", port, path: basePath } = await context.endpoint();
  const headers = {
    "content-type": "application/json"
  };
  const resolvedPath2 = `${basePath?.endsWith("/") ? basePath.slice(0, -1) : basePath || ""}/token`;
  let body;
  body = JSON.stringify({
    ...input.clientId != null && { clientId: input.clientId },
    ...input.clientSecret != null && { clientSecret: input.clientSecret },
    ...input.code != null && { code: input.code },
    ...input.deviceCode != null && { deviceCode: input.deviceCode },
    ...input.grantType != null && { grantType: input.grantType },
    ...input.redirectUri != null && { redirectUri: input.redirectUri },
    ...input.refreshToken != null && { refreshToken: input.refreshToken },
    ...input.scope != null && { scope: serializeAws_restJson1Scopes(input.scope, context) }
  });
  return new HttpRequest({
    protocol,
    hostname,
    port,
    method: "POST",
    headers,
    path: resolvedPath2,
    body
  });
};
var deserializeAws_restJson1CreateTokenCommand = async (output, context) => {
  if (output.statusCode !== 200 && output.statusCode >= 300) {
    return deserializeAws_restJson1CreateTokenCommandError(output, context);
  }
  const contents = map3({
    $metadata: deserializeMetadata5(output)
  });
  const data = expectNonNull(expectObject(await parseBody4(output.body, context)), "body");
  if (data.accessToken != null) {
    contents.accessToken = expectString(data.accessToken);
  }
  if (data.expiresIn != null) {
    contents.expiresIn = expectInt32(data.expiresIn);
  }
  if (data.idToken != null) {
    contents.idToken = expectString(data.idToken);
  }
  if (data.refreshToken != null) {
    contents.refreshToken = expectString(data.refreshToken);
  }
  if (data.tokenType != null) {
    contents.tokenType = expectString(data.tokenType);
  }
  return contents;
};
var deserializeAws_restJson1CreateTokenCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody4(output.body, context)
  };
  const errorCode = loadRestJsonErrorCode3(output, parsedOutput.body);
  switch (errorCode) {
    case "AccessDeniedException":
    case "com.amazonaws.ssooidc#AccessDeniedException":
      throw await deserializeAws_restJson1AccessDeniedExceptionResponse(parsedOutput, context);
    case "AuthorizationPendingException":
    case "com.amazonaws.ssooidc#AuthorizationPendingException":
      throw await deserializeAws_restJson1AuthorizationPendingExceptionResponse(parsedOutput, context);
    case "ExpiredTokenException":
    case "com.amazonaws.ssooidc#ExpiredTokenException":
      throw await deserializeAws_restJson1ExpiredTokenExceptionResponse(parsedOutput, context);
    case "InternalServerException":
    case "com.amazonaws.ssooidc#InternalServerException":
      throw await deserializeAws_restJson1InternalServerExceptionResponse(parsedOutput, context);
    case "InvalidClientException":
    case "com.amazonaws.ssooidc#InvalidClientException":
      throw await deserializeAws_restJson1InvalidClientExceptionResponse(parsedOutput, context);
    case "InvalidGrantException":
    case "com.amazonaws.ssooidc#InvalidGrantException":
      throw await deserializeAws_restJson1InvalidGrantExceptionResponse(parsedOutput, context);
    case "InvalidRequestException":
    case "com.amazonaws.ssooidc#InvalidRequestException":
      throw await deserializeAws_restJson1InvalidRequestExceptionResponse2(parsedOutput, context);
    case "InvalidScopeException":
    case "com.amazonaws.ssooidc#InvalidScopeException":
      throw await deserializeAws_restJson1InvalidScopeExceptionResponse(parsedOutput, context);
    case "SlowDownException":
    case "com.amazonaws.ssooidc#SlowDownException":
      throw await deserializeAws_restJson1SlowDownExceptionResponse(parsedOutput, context);
    case "UnauthorizedClientException":
    case "com.amazonaws.ssooidc#UnauthorizedClientException":
      throw await deserializeAws_restJson1UnauthorizedClientExceptionResponse(parsedOutput, context);
    case "UnsupportedGrantTypeException":
    case "com.amazonaws.ssooidc#UnsupportedGrantTypeException":
      throw await deserializeAws_restJson1UnsupportedGrantTypeExceptionResponse(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody,
        exceptionCtor: SSOOIDCServiceException,
        errorCode
      });
  }
};
var map3 = map;
var deserializeAws_restJson1AccessDeniedExceptionResponse = async (parsedOutput, context) => {
  const contents = map3({});
  const data = parsedOutput.body;
  if (data.error != null) {
    contents.error = expectString(data.error);
  }
  if (data.error_description != null) {
    contents.error_description = expectString(data.error_description);
  }
  const exception = new AccessDeniedException({
    $metadata: deserializeMetadata5(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1AuthorizationPendingExceptionResponse = async (parsedOutput, context) => {
  const contents = map3({});
  const data = parsedOutput.body;
  if (data.error != null) {
    contents.error = expectString(data.error);
  }
  if (data.error_description != null) {
    contents.error_description = expectString(data.error_description);
  }
  const exception = new AuthorizationPendingException({
    $metadata: deserializeMetadata5(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1ExpiredTokenExceptionResponse = async (parsedOutput, context) => {
  const contents = map3({});
  const data = parsedOutput.body;
  if (data.error != null) {
    contents.error = expectString(data.error);
  }
  if (data.error_description != null) {
    contents.error_description = expectString(data.error_description);
  }
  const exception = new ExpiredTokenException2({
    $metadata: deserializeMetadata5(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1InternalServerExceptionResponse = async (parsedOutput, context) => {
  const contents = map3({});
  const data = parsedOutput.body;
  if (data.error != null) {
    contents.error = expectString(data.error);
  }
  if (data.error_description != null) {
    contents.error_description = expectString(data.error_description);
  }
  const exception = new InternalServerException({
    $metadata: deserializeMetadata5(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1InvalidClientExceptionResponse = async (parsedOutput, context) => {
  const contents = map3({});
  const data = parsedOutput.body;
  if (data.error != null) {
    contents.error = expectString(data.error);
  }
  if (data.error_description != null) {
    contents.error_description = expectString(data.error_description);
  }
  const exception = new InvalidClientException({
    $metadata: deserializeMetadata5(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1InvalidGrantExceptionResponse = async (parsedOutput, context) => {
  const contents = map3({});
  const data = parsedOutput.body;
  if (data.error != null) {
    contents.error = expectString(data.error);
  }
  if (data.error_description != null) {
    contents.error_description = expectString(data.error_description);
  }
  const exception = new InvalidGrantException({
    $metadata: deserializeMetadata5(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1InvalidRequestExceptionResponse2 = async (parsedOutput, context) => {
  const contents = map3({});
  const data = parsedOutput.body;
  if (data.error != null) {
    contents.error = expectString(data.error);
  }
  if (data.error_description != null) {
    contents.error_description = expectString(data.error_description);
  }
  const exception = new InvalidRequestException2({
    $metadata: deserializeMetadata5(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1InvalidScopeExceptionResponse = async (parsedOutput, context) => {
  const contents = map3({});
  const data = parsedOutput.body;
  if (data.error != null) {
    contents.error = expectString(data.error);
  }
  if (data.error_description != null) {
    contents.error_description = expectString(data.error_description);
  }
  const exception = new InvalidScopeException({
    $metadata: deserializeMetadata5(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1SlowDownExceptionResponse = async (parsedOutput, context) => {
  const contents = map3({});
  const data = parsedOutput.body;
  if (data.error != null) {
    contents.error = expectString(data.error);
  }
  if (data.error_description != null) {
    contents.error_description = expectString(data.error_description);
  }
  const exception = new SlowDownException({
    $metadata: deserializeMetadata5(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1UnauthorizedClientExceptionResponse = async (parsedOutput, context) => {
  const contents = map3({});
  const data = parsedOutput.body;
  if (data.error != null) {
    contents.error = expectString(data.error);
  }
  if (data.error_description != null) {
    contents.error_description = expectString(data.error_description);
  }
  const exception = new UnauthorizedClientException({
    $metadata: deserializeMetadata5(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1UnsupportedGrantTypeExceptionResponse = async (parsedOutput, context) => {
  const contents = map3({});
  const data = parsedOutput.body;
  if (data.error != null) {
    contents.error = expectString(data.error);
  }
  if (data.error_description != null) {
    contents.error_description = expectString(data.error_description);
  }
  const exception = new UnsupportedGrantTypeException({
    $metadata: deserializeMetadata5(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var serializeAws_restJson1Scopes = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return entry;
  });
};
var deserializeMetadata5 = (output) => ({
  httpStatusCode: output.statusCode,
  requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
  extendedRequestId: output.headers["x-amz-id-2"],
  cfId: output.headers["x-amz-cf-id"]
});
var collectBody4 = (streamBody = new Uint8Array(), context) => {
  if (streamBody instanceof Uint8Array) {
    return Promise.resolve(streamBody);
  }
  return context.streamCollector(streamBody) || Promise.resolve(new Uint8Array());
};
var collectBodyString4 = (streamBody, context) => collectBody4(streamBody, context).then((body) => context.utf8Encoder(body));
var parseBody4 = (streamBody, context) => collectBodyString4(streamBody, context).then((encoded) => {
  if (encoded.length) {
    return JSON.parse(encoded);
  }
  return {};
});
var parseErrorBody4 = async (errorBody, context) => {
  const value = await parseBody4(errorBody, context);
  value.message = value.message ?? value.Message;
  return value;
};
var loadRestJsonErrorCode3 = (output, data) => {
  const findKey = (object, key) => Object.keys(object).find((k13) => k13.toLowerCase() === key.toLowerCase());
  const sanitizeErrorCode = (rawValue) => {
    let cleanValue = rawValue;
    if (typeof cleanValue === "number") {
      cleanValue = cleanValue.toString();
    }
    if (cleanValue.indexOf(",") >= 0) {
      cleanValue = cleanValue.split(",")[0];
    }
    if (cleanValue.indexOf(":") >= 0) {
      cleanValue = cleanValue.split(":")[0];
    }
    if (cleanValue.indexOf("#") >= 0) {
      cleanValue = cleanValue.split("#")[1];
    }
    return cleanValue;
  };
  const headerKey = findKey(output.headers, "x-amzn-errortype");
  if (headerKey !== void 0) {
    return sanitizeErrorCode(output.headers[headerKey]);
  }
  if (data.code !== void 0) {
    return sanitizeErrorCode(data.code);
  }
  if (data["__type"] !== void 0) {
    return sanitizeErrorCode(data["__type"]);
  }
};

// ../../node_modules/@aws-sdk/client-sso-oidc/dist-es/commands/CreateTokenCommand.js
var CreateTokenCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, CreateTokenCommand.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "SSOOIDCClient";
    const commandName = "CreateTokenCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: CreateTokenRequestFilterSensitiveLog,
      outputFilterSensitiveLog: CreateTokenResponseFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_restJson1CreateTokenCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_restJson1CreateTokenCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-sso-oidc/dist-es/endpoint/EndpointParameters.js
var resolveClientEndpointParameters4 = (options) => {
  return {
    ...options,
    useDualstackEndpoint: options.useDualstackEndpoint ?? false,
    useFipsEndpoint: options.useFipsEndpoint ?? false,
    defaultSigningName: "awsssooidc"
  };
};

// ../../node_modules/@aws-sdk/client-sso-oidc/package.json
var package_default4 = {
  name: "@aws-sdk/client-sso-oidc",
  description: "AWS SDK for JavaScript Sso Oidc Client for Node.js, Browser and React Native",
  version: "3.256.0",
  scripts: {
    build: "concurrently 'yarn:build:cjs' 'yarn:build:es' 'yarn:build:types'",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "build:docs": "typedoc",
    "build:es": "tsc -p tsconfig.es.json",
    "build:include:deps": "lerna run --scope $npm_package_name --include-dependencies build",
    "build:types": "tsc -p tsconfig.types.json",
    "build:types:downlevel": "downlevel-dts dist-types dist-types/ts3.4",
    clean: "rimraf ./dist-* && rimraf *.tsbuildinfo",
    "generate:client": "node ../../scripts/generate-clients/single-service --solo sso-oidc"
  },
  main: "./dist-cjs/index.js",
  types: "./dist-types/index.d.ts",
  module: "./dist-es/index.js",
  sideEffects: false,
  dependencies: {
    "@aws-crypto/sha256-browser": "3.0.0",
    "@aws-crypto/sha256-js": "3.0.0",
    "@aws-sdk/config-resolver": "3.254.0",
    "@aws-sdk/fetch-http-handler": "3.254.0",
    "@aws-sdk/hash-node": "3.254.0",
    "@aws-sdk/invalid-dependency": "3.254.0",
    "@aws-sdk/middleware-content-length": "3.254.0",
    "@aws-sdk/middleware-endpoint": "3.254.0",
    "@aws-sdk/middleware-host-header": "3.254.0",
    "@aws-sdk/middleware-logger": "3.254.0",
    "@aws-sdk/middleware-recursion-detection": "3.254.0",
    "@aws-sdk/middleware-retry": "3.254.0",
    "@aws-sdk/middleware-serde": "3.254.0",
    "@aws-sdk/middleware-stack": "3.254.0",
    "@aws-sdk/middleware-user-agent": "3.254.0",
    "@aws-sdk/node-config-provider": "3.254.0",
    "@aws-sdk/node-http-handler": "3.254.0",
    "@aws-sdk/protocol-http": "3.254.0",
    "@aws-sdk/smithy-client": "3.254.0",
    "@aws-sdk/types": "3.254.0",
    "@aws-sdk/url-parser": "3.254.0",
    "@aws-sdk/util-base64": "3.208.0",
    "@aws-sdk/util-body-length-browser": "3.188.0",
    "@aws-sdk/util-body-length-node": "3.208.0",
    "@aws-sdk/util-defaults-mode-browser": "3.254.0",
    "@aws-sdk/util-defaults-mode-node": "3.254.0",
    "@aws-sdk/util-endpoints": "3.254.0",
    "@aws-sdk/util-retry": "3.254.0",
    "@aws-sdk/util-user-agent-browser": "3.254.0",
    "@aws-sdk/util-user-agent-node": "3.254.0",
    "@aws-sdk/util-utf8-browser": "3.188.0",
    "@aws-sdk/util-utf8-node": "3.208.0",
    tslib: "^2.3.1"
  },
  devDependencies: {
    "@aws-sdk/service-client-documentation-generator": "3.208.0",
    "@tsconfig/node14": "1.0.3",
    "@types/node": "^14.14.31",
    concurrently: "7.0.0",
    "downlevel-dts": "0.10.1",
    rimraf: "3.0.2",
    typedoc: "0.19.2",
    typescript: "~4.6.2"
  },
  overrides: {
    typedoc: {
      typescript: "~4.6.2"
    }
  },
  engines: {
    node: ">=14.0.0"
  },
  typesVersions: {
    "<4.0": {
      "dist-types/*": [
        "dist-types/ts3.4/*"
      ]
    }
  },
  files: [
    "dist-*"
  ],
  author: {
    name: "AWS SDK for JavaScript Team",
    url: "https://aws.amazon.com/javascript/"
  },
  license: "Apache-2.0",
  browser: {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.browser"
  },
  "react-native": {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.native"
  },
  homepage: "https://github.com/aws/aws-sdk-js-v3/tree/main/clients/client-sso-oidc",
  repository: {
    type: "git",
    url: "https://github.com/aws/aws-sdk-js-v3.git",
    directory: "clients/client-sso-oidc"
  }
};

// ../../node_modules/@aws-sdk/client-sso-oidc/dist-es/endpoint/ruleset.js
var p2 = "required";
var q2 = "fn";
var r2 = "argv";
var s2 = "ref";
var a2 = "PartitionResult";
var b2 = "tree";
var c2 = "error";
var d2 = "endpoint";
var e2 = { [p2]: false, "type": "String" };
var f2 = { [p2]: true, "default": false, "type": "Boolean" };
var g2 = { [s2]: "Endpoint" };
var h2 = { [q2]: "booleanEquals", [r2]: [{ [s2]: "UseFIPS" }, true] };
var i2 = { [q2]: "booleanEquals", [r2]: [{ [s2]: "UseDualStack" }, true] };
var j2 = {};
var k2 = { [q2]: "booleanEquals", [r2]: [true, { [q2]: "getAttr", [r2]: [{ [s2]: a2 }, "supportsFIPS"] }] };
var l2 = { [q2]: "booleanEquals", [r2]: [true, { [q2]: "getAttr", [r2]: [{ [s2]: a2 }, "supportsDualStack"] }] };
var m2 = [g2];
var n2 = [h2];
var o2 = [i2];
var _data2 = { version: "1.0", parameters: { Region: e2, UseDualStack: f2, UseFIPS: f2, Endpoint: e2 }, rules: [{ conditions: [{ [q2]: "aws.partition", [r2]: [{ [s2]: "Region" }], assign: a2 }], type: b2, rules: [{ conditions: [{ [q2]: "isSet", [r2]: m2 }, { [q2]: "parseURL", [r2]: m2, assign: "url" }], type: b2, rules: [{ conditions: n2, error: "Invalid Configuration: FIPS and custom endpoint are not supported", type: c2 }, { type: b2, rules: [{ conditions: o2, error: "Invalid Configuration: Dualstack and custom endpoint are not supported", type: c2 }, { endpoint: { url: g2, properties: j2, headers: j2 }, type: d2 }] }] }, { conditions: [h2, i2], type: b2, rules: [{ conditions: [k2, l2], type: b2, rules: [{ endpoint: { url: "https://oidc-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: j2, headers: j2 }, type: d2 }] }, { error: "FIPS and DualStack are enabled, but this partition does not support one or both", type: c2 }] }, { conditions: n2, type: b2, rules: [{ conditions: [k2], type: b2, rules: [{ type: b2, rules: [{ endpoint: { url: "https://oidc-fips.{Region}.{PartitionResult#dnsSuffix}", properties: j2, headers: j2 }, type: d2 }] }] }, { error: "FIPS is enabled but this partition does not support FIPS", type: c2 }] }, { conditions: o2, type: b2, rules: [{ conditions: [l2], type: b2, rules: [{ endpoint: { url: "https://oidc.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: j2, headers: j2 }, type: d2 }] }, { error: "DualStack is enabled but this partition does not support DualStack", type: c2 }] }, { endpoint: { url: "https://oidc.{Region}.{PartitionResult#dnsSuffix}", properties: j2, headers: j2 }, type: d2 }] }] };
var ruleSet2 = _data2;

// ../../node_modules/@aws-sdk/client-sso-oidc/dist-es/endpoint/endpointResolver.js
var defaultEndpointResolver2 = (endpointParams, context = {}) => {
  return resolveEndpoint(ruleSet2, {
    endpointParams,
    logger: context.logger
  });
};

// ../../node_modules/@aws-sdk/client-sso-oidc/dist-es/runtimeConfig.shared.js
var getRuntimeConfig3 = (config) => ({
  apiVersion: "2019-06-10",
  base64Decoder: config?.base64Decoder ?? fromBase64,
  base64Encoder: config?.base64Encoder ?? toBase64,
  disableHostPrefix: config?.disableHostPrefix ?? false,
  endpointProvider: config?.endpointProvider ?? defaultEndpointResolver2,
  logger: config?.logger ?? new NoOpLogger(),
  serviceId: config?.serviceId ?? "SSO OIDC",
  urlParser: config?.urlParser ?? parseUrl
});

// ../../node_modules/@aws-sdk/client-sso-oidc/dist-es/runtimeConfig.js
var getRuntimeConfig4 = (config) => {
  emitWarningIfUnsupportedVersion(process.version);
  const defaultsMode = resolveDefaultsModeConfig(config);
  const defaultConfigProvider = () => defaultsMode().then(loadConfigsForDefaultMode);
  const clientSharedValues = getRuntimeConfig3(config);
  return {
    ...clientSharedValues,
    ...config,
    runtime: "node",
    defaultsMode,
    bodyLengthChecker: config?.bodyLengthChecker ?? calculateBodyLength,
    defaultUserAgentProvider: config?.defaultUserAgentProvider ?? defaultUserAgent({ serviceId: clientSharedValues.serviceId, clientVersion: package_default4.version }),
    maxAttempts: config?.maxAttempts ?? loadConfig(NODE_MAX_ATTEMPT_CONFIG_OPTIONS),
    region: config?.region ?? loadConfig(NODE_REGION_CONFIG_OPTIONS, NODE_REGION_CONFIG_FILE_OPTIONS),
    requestHandler: config?.requestHandler ?? new NodeHttpHandler(defaultConfigProvider),
    retryMode: config?.retryMode ?? loadConfig({
      ...NODE_RETRY_MODE_CONFIG_OPTIONS,
      default: async () => (await defaultConfigProvider()).retryMode || DEFAULT_RETRY_MODE
    }),
    sha256: config?.sha256 ?? Hash.bind(null, "sha256"),
    streamCollector: config?.streamCollector ?? streamCollector,
    useDualstackEndpoint: config?.useDualstackEndpoint ?? loadConfig(NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS),
    useFipsEndpoint: config?.useFipsEndpoint ?? loadConfig(NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS),
    utf8Decoder: config?.utf8Decoder ?? fromUtf82,
    utf8Encoder: config?.utf8Encoder ?? toUtf8
  };
};

// ../../node_modules/@aws-sdk/client-sso-oidc/dist-es/SSOOIDCClient.js
var SSOOIDCClient = class extends Client {
  constructor(configuration) {
    const _config_0 = getRuntimeConfig4(configuration);
    const _config_1 = resolveClientEndpointParameters4(_config_0);
    const _config_2 = resolveRegionConfig(_config_1);
    const _config_3 = resolveEndpointConfig(_config_2);
    const _config_4 = resolveRetryConfig(_config_3);
    const _config_5 = resolveHostHeaderConfig(_config_4);
    const _config_6 = resolveUserAgentConfig(_config_5);
    super(_config_6);
    this.config = _config_6;
    this.middlewareStack.use(getRetryPlugin(this.config));
    this.middlewareStack.use(getContentLengthPlugin(this.config));
    this.middlewareStack.use(getHostHeaderPlugin(this.config));
    this.middlewareStack.use(getLoggerPlugin(this.config));
    this.middlewareStack.use(getRecursionDetectionPlugin(this.config));
    this.middlewareStack.use(getUserAgentPlugin(this.config));
  }
  destroy() {
    super.destroy();
  }
};

// ../../node_modules/@aws-sdk/token-providers/dist-es/getSsoOidcClient.js
var ssoOidcClientsHash = {};
var getSsoOidcClient = (ssoRegion) => {
  if (ssoOidcClientsHash[ssoRegion]) {
    return ssoOidcClientsHash[ssoRegion];
  }
  const ssoOidcClient = new SSOOIDCClient({ region: ssoRegion });
  ssoOidcClientsHash[ssoRegion] = ssoOidcClient;
  return ssoOidcClient;
};

// ../../node_modules/@aws-sdk/token-providers/dist-es/getNewSsoOidcToken.js
var getNewSsoOidcToken = (ssoToken, ssoRegion) => {
  const ssoOidcClient = getSsoOidcClient(ssoRegion);
  return ssoOidcClient.send(new CreateTokenCommand({
    clientId: ssoToken.clientId,
    clientSecret: ssoToken.clientSecret,
    refreshToken: ssoToken.refreshToken,
    grantType: "refresh_token"
  }));
};

// ../../node_modules/@aws-sdk/token-providers/dist-es/validateTokenExpiry.js
var validateTokenExpiry = (token) => {
  if (token.expiration && token.expiration.getTime() < Date.now()) {
    throw new TokenProviderError(`Token is expired. ${REFRESH_MESSAGE}`, false);
  }
};

// ../../node_modules/@aws-sdk/token-providers/dist-es/validateTokenKey.js
var validateTokenKey = (key, value, forRefresh = false) => {
  if (typeof value === "undefined") {
    throw new TokenProviderError(`Value not present for '${key}' in SSO Token${forRefresh ? ". Cannot refresh" : ""}. ${REFRESH_MESSAGE}`, false);
  }
};

// ../../node_modules/@aws-sdk/token-providers/dist-es/writeSSOTokenToFile.js
var import_fs4 = require("fs");
var { writeFile } = import_fs4.promises;
var writeSSOTokenToFile = (id, ssoToken) => {
  const tokenFilepath = getSSOTokenFilepath(id);
  const tokenString = JSON.stringify(ssoToken, null, 2);
  return writeFile(tokenFilepath, tokenString);
};

// ../../node_modules/@aws-sdk/token-providers/dist-es/fromSso.js
var lastRefreshAttemptTime = new Date(0);
var fromSso = (init = {}) => async () => {
  const profiles = await parseKnownFiles(init);
  const profileName = getProfileName(init);
  const profile = profiles[profileName];
  if (!profile) {
    throw new TokenProviderError(`Profile '${profileName}' could not be found in shared credentials file.`, false);
  } else if (!profile["sso_session"]) {
    throw new TokenProviderError(`Profile '${profileName}' is missing required property 'sso_session'.`);
  }
  const ssoSessionName = profile["sso_session"];
  const ssoSessions = await loadSsoSessionData(init);
  const ssoSession = ssoSessions[ssoSessionName];
  if (!ssoSession) {
    throw new TokenProviderError(`Sso session '${ssoSessionName}' could not be found in shared credentials file.`, false);
  }
  for (const ssoSessionRequiredKey of ["sso_start_url", "sso_region"]) {
    if (!ssoSession[ssoSessionRequiredKey]) {
      throw new TokenProviderError(`Sso session '${ssoSessionName}' is missing required property '${ssoSessionRequiredKey}'.`, false);
    }
  }
  const ssoStartUrl = ssoSession["sso_start_url"];
  const ssoRegion = ssoSession["sso_region"];
  let ssoToken;
  try {
    ssoToken = await getSSOTokenFromFile(ssoSessionName);
  } catch (e13) {
    throw new TokenProviderError(`The SSO session token associated with profile=${profileName} was not found or is invalid. ${REFRESH_MESSAGE}`, false);
  }
  validateTokenKey("accessToken", ssoToken.accessToken);
  validateTokenKey("expiresAt", ssoToken.expiresAt);
  const { accessToken, expiresAt } = ssoToken;
  const existingToken = { token: accessToken, expiration: new Date(expiresAt) };
  if (existingToken.expiration.getTime() - Date.now() > EXPIRE_WINDOW_MS) {
    return existingToken;
  }
  if (Date.now() - lastRefreshAttemptTime.getTime() < 30 * 1e3) {
    validateTokenExpiry(existingToken);
    return existingToken;
  }
  validateTokenKey("clientId", ssoToken.clientId, true);
  validateTokenKey("clientSecret", ssoToken.clientSecret, true);
  validateTokenKey("refreshToken", ssoToken.refreshToken, true);
  try {
    lastRefreshAttemptTime.setTime(Date.now());
    const newSsoOidcToken = await getNewSsoOidcToken(ssoToken, ssoRegion);
    validateTokenKey("accessToken", newSsoOidcToken.accessToken);
    validateTokenKey("expiresIn", newSsoOidcToken.expiresIn);
    const newTokenExpiration = new Date(Date.now() + newSsoOidcToken.expiresIn * 1e3);
    try {
      await writeSSOTokenToFile(ssoSessionName, {
        ...ssoToken,
        accessToken: newSsoOidcToken.accessToken,
        expiresAt: newTokenExpiration.toISOString(),
        refreshToken: newSsoOidcToken.refreshToken
      });
    } catch (error) {
    }
    return {
      token: newSsoOidcToken.accessToken,
      expiration: newTokenExpiration
    };
  } catch (error) {
    validateTokenExpiry(existingToken);
    return existingToken;
  }
};

// ../../node_modules/@aws-sdk/credential-provider-sso/dist-es/resolveSSOCredentials.js
var EXPIRE_WINDOW_MS2 = 15 * 60 * 1e3;
var SHOULD_FAIL_CREDENTIAL_CHAIN = false;
var resolveSSOCredentials = async ({ ssoStartUrl, ssoSession, ssoAccountId, ssoRegion, ssoRoleName, ssoClient, profile }) => {
  let token;
  const refreshMessage = `To refresh this SSO session run aws sso login with the corresponding profile.`;
  if (ssoSession) {
    try {
      const _token = await fromSso({ profile })();
      token = {
        accessToken: _token.token,
        expiresAt: new Date(_token.expiration).toISOString()
      };
    } catch (e13) {
      throw new CredentialsProviderError(e13.message, SHOULD_FAIL_CREDENTIAL_CHAIN);
    }
  } else {
    try {
      token = await getSSOTokenFromFile(ssoStartUrl);
    } catch (e13) {
      throw new CredentialsProviderError(`The SSO session associated with this profile is invalid. ${refreshMessage}`, SHOULD_FAIL_CREDENTIAL_CHAIN);
    }
  }
  if (new Date(token.expiresAt).getTime() - Date.now() <= EXPIRE_WINDOW_MS2) {
    throw new CredentialsProviderError(`The SSO session associated with this profile has expired. ${refreshMessage}`, SHOULD_FAIL_CREDENTIAL_CHAIN);
  }
  const { accessToken } = token;
  const sso = ssoClient || new SSOClient({ region: ssoRegion });
  let ssoResp;
  try {
    ssoResp = await sso.send(new GetRoleCredentialsCommand({
      accountId: ssoAccountId,
      roleName: ssoRoleName,
      accessToken
    }));
  } catch (e13) {
    throw CredentialsProviderError.from(e13, SHOULD_FAIL_CREDENTIAL_CHAIN);
  }
  const { roleCredentials: { accessKeyId, secretAccessKey, sessionToken, expiration } = {} } = ssoResp;
  if (!accessKeyId || !secretAccessKey || !sessionToken || !expiration) {
    throw new CredentialsProviderError("SSO returns an invalid temporary credential.", SHOULD_FAIL_CREDENTIAL_CHAIN);
  }
  return { accessKeyId, secretAccessKey, sessionToken, expiration: new Date(expiration) };
};

// ../../node_modules/@aws-sdk/credential-provider-sso/dist-es/validateSsoProfile.js
var validateSsoProfile = (profile) => {
  const { sso_start_url, sso_account_id, sso_region, sso_role_name } = profile;
  if (!sso_start_url || !sso_account_id || !sso_region || !sso_role_name) {
    throw new CredentialsProviderError(`Profile is configured with invalid SSO credentials. Required parameters "sso_account_id", "sso_region", "sso_role_name", "sso_start_url". Got ${Object.keys(profile).join(", ")}
Reference: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html`, false);
  }
  return profile;
};

// ../../node_modules/@aws-sdk/credential-provider-sso/dist-es/fromSSO.js
var fromSSO = (init = {}) => async () => {
  const { ssoStartUrl, ssoAccountId, ssoRegion, ssoRoleName, ssoClient, ssoSession } = init;
  const profileName = getProfileName(init);
  if (!ssoStartUrl && !ssoAccountId && !ssoRegion && !ssoRoleName && !ssoSession) {
    const profiles = await parseKnownFiles(init);
    const profile = profiles[profileName];
    if (!profile) {
      throw new CredentialsProviderError(`Profile ${profileName} was not found.`);
    }
    if (!isSsoProfile(profile)) {
      throw new CredentialsProviderError(`Profile ${profileName} is not configured with SSO credentials.`);
    }
    if (profile?.sso_session) {
      const ssoSessions = await loadSsoSessionData(init);
      const session = ssoSessions[profile.sso_session];
      const conflictMsg = ` configurations in profile ${profileName} and sso-session ${profile.sso_session}`;
      if (ssoRegion && ssoRegion !== session.sso_region) {
        throw new CredentialsProviderError(`Conflicting SSO region` + conflictMsg, false);
      }
      if (ssoStartUrl && ssoStartUrl !== session.sso_start_url) {
        throw new CredentialsProviderError(`Conflicting SSO start_url` + conflictMsg, false);
      }
      profile.sso_region = session.sso_region;
      profile.sso_start_url = session.sso_start_url;
    }
    const { sso_start_url, sso_account_id, sso_region, sso_role_name, sso_session } = validateSsoProfile(profile);
    return resolveSSOCredentials({
      ssoStartUrl: sso_start_url,
      ssoSession: sso_session,
      ssoAccountId: sso_account_id,
      ssoRegion: sso_region,
      ssoRoleName: sso_role_name,
      ssoClient,
      profile: profileName
    });
  } else if (!ssoStartUrl || !ssoAccountId || !ssoRegion || !ssoRoleName) {
    throw new CredentialsProviderError('Incomplete configuration. The fromSSO() argument hash must include "ssoStartUrl", "ssoAccountId", "ssoRegion", "ssoRoleName"');
  } else {
    return resolveSSOCredentials({
      ssoStartUrl,
      ssoSession,
      ssoAccountId,
      ssoRegion,
      ssoRoleName,
      ssoClient,
      profile: profileName
    });
  }
};

// ../../node_modules/@aws-sdk/credential-provider-ini/dist-es/resolveSsoCredentials.js
var resolveSsoCredentials = (data) => {
  const { sso_start_url, sso_account_id, sso_session, sso_region, sso_role_name } = validateSsoProfile(data);
  return fromSSO({
    ssoStartUrl: sso_start_url,
    ssoAccountId: sso_account_id,
    ssoSession: sso_session,
    ssoRegion: sso_region,
    ssoRoleName: sso_role_name
  })();
};

// ../../node_modules/@aws-sdk/credential-provider-ini/dist-es/resolveStaticCredentials.js
var isStaticCredsProfile = (arg) => Boolean(arg) && typeof arg === "object" && typeof arg.aws_access_key_id === "string" && typeof arg.aws_secret_access_key === "string" && ["undefined", "string"].indexOf(typeof arg.aws_session_token) > -1;
var resolveStaticCredentials = (profile) => Promise.resolve({
  accessKeyId: profile.aws_access_key_id,
  secretAccessKey: profile.aws_secret_access_key,
  sessionToken: profile.aws_session_token
});

// ../../node_modules/@aws-sdk/credential-provider-web-identity/dist-es/fromTokenFile.js
var import_fs5 = require("fs");

// ../../node_modules/@aws-sdk/credential-provider-web-identity/dist-es/fromWebToken.js
var fromWebToken = (init) => () => {
  const { roleArn, roleSessionName, webIdentityToken, providerId, policyArns, policy, durationSeconds, roleAssumerWithWebIdentity } = init;
  if (!roleAssumerWithWebIdentity) {
    throw new CredentialsProviderError(`Role Arn '${roleArn}' needs to be assumed with web identity, but no role assumption callback was provided.`, false);
  }
  return roleAssumerWithWebIdentity({
    RoleArn: roleArn,
    RoleSessionName: roleSessionName ?? `aws-sdk-js-session-${Date.now()}`,
    WebIdentityToken: webIdentityToken,
    ProviderId: providerId,
    PolicyArns: policyArns,
    Policy: policy,
    DurationSeconds: durationSeconds
  });
};

// ../../node_modules/@aws-sdk/credential-provider-web-identity/dist-es/fromTokenFile.js
var ENV_TOKEN_FILE = "AWS_WEB_IDENTITY_TOKEN_FILE";
var ENV_ROLE_ARN = "AWS_ROLE_ARN";
var ENV_ROLE_SESSION_NAME = "AWS_ROLE_SESSION_NAME";
var fromTokenFile = (init = {}) => async () => {
  return resolveTokenFile(init);
};
var resolveTokenFile = (init) => {
  const webIdentityTokenFile = init?.webIdentityTokenFile ?? process.env[ENV_TOKEN_FILE];
  const roleArn = init?.roleArn ?? process.env[ENV_ROLE_ARN];
  const roleSessionName = init?.roleSessionName ?? process.env[ENV_ROLE_SESSION_NAME];
  if (!webIdentityTokenFile || !roleArn) {
    throw new CredentialsProviderError("Web identity configuration not specified");
  }
  return fromWebToken({
    ...init,
    webIdentityToken: (0, import_fs5.readFileSync)(webIdentityTokenFile, { encoding: "ascii" }),
    roleArn,
    roleSessionName
  })();
};

// ../../node_modules/@aws-sdk/credential-provider-ini/dist-es/resolveWebIdentityCredentials.js
var isWebIdentityProfile = (arg) => Boolean(arg) && typeof arg === "object" && typeof arg.web_identity_token_file === "string" && typeof arg.role_arn === "string" && ["undefined", "string"].indexOf(typeof arg.role_session_name) > -1;
var resolveWebIdentityCredentials = async (profile, options) => fromTokenFile({
  webIdentityTokenFile: profile.web_identity_token_file,
  roleArn: profile.role_arn,
  roleSessionName: profile.role_session_name,
  roleAssumerWithWebIdentity: options.roleAssumerWithWebIdentity
})();

// ../../node_modules/@aws-sdk/credential-provider-ini/dist-es/resolveProfileData.js
var resolveProfileData = async (profileName, profiles, options, visitedProfiles = {}) => {
  const data = profiles[profileName];
  if (Object.keys(visitedProfiles).length > 0 && isStaticCredsProfile(data)) {
    return resolveStaticCredentials(data);
  }
  if (isAssumeRoleProfile(data)) {
    return resolveAssumeRoleCredentials(profileName, profiles, options, visitedProfiles);
  }
  if (isStaticCredsProfile(data)) {
    return resolveStaticCredentials(data);
  }
  if (isWebIdentityProfile(data)) {
    return resolveWebIdentityCredentials(data, options);
  }
  if (isProcessProfile(data)) {
    return resolveProcessCredentials2(options, profileName);
  }
  if (isSsoProfile(data)) {
    return resolveSsoCredentials(data);
  }
  throw new CredentialsProviderError(`Profile ${profileName} could not be found or parsed in shared credentials file.`);
};

// ../../node_modules/@aws-sdk/credential-provider-ini/dist-es/fromIni.js
var fromIni = (init = {}) => async () => {
  const profiles = await parseKnownFiles(init);
  return resolveProfileData(getProfileName(init), profiles, init);
};

// ../../node_modules/@aws-sdk/credential-provider-node/dist-es/remoteProvider.js
var ENV_IMDS_DISABLED2 = "AWS_EC2_METADATA_DISABLED";
var remoteProvider = (init) => {
  if (process.env[ENV_CMDS_RELATIVE_URI] || process.env[ENV_CMDS_FULL_URI]) {
    return fromContainerMetadata(init);
  }
  if (process.env[ENV_IMDS_DISABLED2]) {
    return async () => {
      throw new CredentialsProviderError("EC2 Instance Metadata Service access disabled");
    };
  }
  return fromInstanceMetadata(init);
};

// ../../node_modules/@aws-sdk/credential-provider-node/dist-es/defaultProvider.js
var defaultProvider = (init = {}) => memoize(chain(...init.profile || process.env[ENV_PROFILE] ? [] : [fromEnv()], fromSSO(init), fromIni(init), fromProcess(init), fromTokenFile(init), remoteProvider(init), async () => {
  throw new CredentialsProviderError("Could not load credentials from any providers", false);
}), (credentials) => credentials.expiration !== void 0 && credentials.expiration.getTime() - Date.now() < 3e5, (credentials) => credentials.expiration !== void 0);

// ../../node_modules/@aws-sdk/client-sts/dist-es/endpoint/ruleset.js
var H = "required";
var I = "fn";
var J = "argv";
var K = "ref";
var L = "properties";
var M = "headers";
var a3 = false;
var b3 = true;
var c3 = "PartitionResult";
var d3 = "tree";
var e3 = "booleanEquals";
var f3 = "stringEquals";
var g3 = "https://sts.amazonaws.com";
var h3 = "sigv4";
var i3 = "sts";
var j3 = "us-east-1";
var k3 = "endpoint";
var l3 = "https://sts.{Region}.{PartitionResult#dnsSuffix}";
var m3 = "error";
var n3 = "getAttr";
var o3 = { [H]: false, "type": "String" };
var p3 = { [H]: true, "default": false, "type": "Boolean" };
var q3 = { [K]: "Region" };
var r3 = { [K]: "UseFIPS" };
var s3 = { [K]: "UseDualStack" };
var t = { [I]: "isSet", [J]: [{ [K]: "Endpoint" }] };
var u = { [K]: "Endpoint" };
var v = { "url": g3, [L]: { "authSchemes": [{ "name": h3, "signingName": i3, "signingRegion": j3 }] }, [M]: {} };
var w = {};
var x = { [I]: e3, [J]: [r3, true] };
var y = { [I]: e3, [J]: [s3, true] };
var z = { [I]: e3, [J]: [true, { [I]: n3, [J]: [{ [K]: c3 }, "supportsFIPS"] }] };
var A = { [K]: c3 };
var B = { [I]: e3, [J]: [true, { [I]: n3, [J]: [A, "supportsDualStack"] }] };
var C = { "url": l3, [L]: {}, [M]: {} };
var D = [u];
var E = [{ [I]: f3, [J]: [q3, "aws-global"] }];
var F = [x];
var G = [y];
var _data3 = { version: "1.0", parameters: { Region: o3, UseDualStack: p3, UseFIPS: p3, Endpoint: o3, UseGlobalEndpoint: p3 }, rules: [{ conditions: [{ [I]: "aws.partition", [J]: [q3], assign: c3 }], type: d3, rules: [{ conditions: [{ [I]: e3, [J]: [{ [K]: "UseGlobalEndpoint" }, b3] }, { [I]: e3, [J]: [r3, a3] }, { [I]: e3, [J]: [s3, a3] }, { [I]: "not", [J]: [t] }], type: d3, rules: [{ conditions: [{ [I]: f3, [J]: [q3, "ap-northeast-1"] }], endpoint: v, type: k3 }, { conditions: [{ [I]: f3, [J]: [q3, "ap-south-1"] }], endpoint: v, type: k3 }, { conditions: [{ [I]: f3, [J]: [q3, "ap-southeast-1"] }], endpoint: v, type: k3 }, { conditions: [{ [I]: f3, [J]: [q3, "ap-southeast-2"] }], endpoint: v, type: k3 }, { conditions: E, endpoint: v, type: k3 }, { conditions: [{ [I]: f3, [J]: [q3, "ca-central-1"] }], endpoint: v, type: k3 }, { conditions: [{ [I]: f3, [J]: [q3, "eu-central-1"] }], endpoint: v, type: k3 }, { conditions: [{ [I]: f3, [J]: [q3, "eu-north-1"] }], endpoint: v, type: k3 }, { conditions: [{ [I]: f3, [J]: [q3, "eu-west-1"] }], endpoint: v, type: k3 }, { conditions: [{ [I]: f3, [J]: [q3, "eu-west-2"] }], endpoint: v, type: k3 }, { conditions: [{ [I]: f3, [J]: [q3, "eu-west-3"] }], endpoint: v, type: k3 }, { conditions: [{ [I]: f3, [J]: [q3, "sa-east-1"] }], endpoint: v, type: k3 }, { conditions: [{ [I]: f3, [J]: [q3, j3] }], endpoint: v, type: k3 }, { conditions: [{ [I]: f3, [J]: [q3, "us-east-2"] }], endpoint: v, type: k3 }, { conditions: [{ [I]: f3, [J]: [q3, "us-west-1"] }], endpoint: v, type: k3 }, { conditions: [{ [I]: f3, [J]: [q3, "us-west-2"] }], endpoint: v, type: k3 }, { endpoint: { url: l3, [L]: { authSchemes: [{ name: h3, signingName: i3, signingRegion: "{Region}" }] }, [M]: w }, type: k3 }] }, { conditions: [t, { [I]: "parseURL", [J]: D, assign: "url" }], type: d3, rules: [{ conditions: F, error: "Invalid Configuration: FIPS and custom endpoint are not supported", type: m3 }, { type: d3, rules: [{ conditions: G, error: "Invalid Configuration: Dualstack and custom endpoint are not supported", type: m3 }, { endpoint: { url: u, [L]: w, [M]: w }, type: k3 }] }] }, { conditions: [x, y], type: d3, rules: [{ conditions: [z, B], type: d3, rules: [{ endpoint: { url: "https://sts-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", [L]: w, [M]: w }, type: k3 }] }, { error: "FIPS and DualStack are enabled, but this partition does not support one or both", type: m3 }] }, { conditions: F, type: d3, rules: [{ conditions: [z], type: d3, rules: [{ type: d3, rules: [{ conditions: [{ [I]: f3, [J]: ["aws-us-gov", { [I]: n3, [J]: [A, "name"] }] }], endpoint: C, type: k3 }, { endpoint: { url: "https://sts-fips.{Region}.{PartitionResult#dnsSuffix}", [L]: w, [M]: w }, type: k3 }] }] }, { error: "FIPS is enabled but this partition does not support FIPS", type: m3 }] }, { conditions: G, type: d3, rules: [{ conditions: [B], type: d3, rules: [{ endpoint: { url: "https://sts.{Region}.{PartitionResult#dualStackDnsSuffix}", [L]: w, [M]: w }, type: k3 }] }, { error: "DualStack is enabled but this partition does not support DualStack", type: m3 }] }, { type: d3, rules: [{ conditions: E, endpoint: { url: g3, [L]: { authSchemes: [{ name: h3, signingRegion: j3, signingName: i3 }] }, [M]: w }, type: k3 }, { endpoint: C, type: k3 }] }] }] };
var ruleSet3 = _data3;

// ../../node_modules/@aws-sdk/client-sts/dist-es/endpoint/endpointResolver.js
var defaultEndpointResolver3 = (endpointParams, context = {}) => {
  return resolveEndpoint(ruleSet3, {
    endpointParams,
    logger: context.logger
  });
};

// ../../node_modules/@aws-sdk/client-sts/dist-es/runtimeConfig.shared.js
var getRuntimeConfig5 = (config) => ({
  apiVersion: "2011-06-15",
  base64Decoder: config?.base64Decoder ?? fromBase64,
  base64Encoder: config?.base64Encoder ?? toBase64,
  disableHostPrefix: config?.disableHostPrefix ?? false,
  endpointProvider: config?.endpointProvider ?? defaultEndpointResolver3,
  logger: config?.logger ?? new NoOpLogger(),
  serviceId: config?.serviceId ?? "STS",
  urlParser: config?.urlParser ?? parseUrl
});

// ../../node_modules/@aws-sdk/client-sts/dist-es/runtimeConfig.js
var getRuntimeConfig6 = (config) => {
  emitWarningIfUnsupportedVersion(process.version);
  const defaultsMode = resolveDefaultsModeConfig(config);
  const defaultConfigProvider = () => defaultsMode().then(loadConfigsForDefaultMode);
  const clientSharedValues = getRuntimeConfig5(config);
  return {
    ...clientSharedValues,
    ...config,
    runtime: "node",
    defaultsMode,
    bodyLengthChecker: config?.bodyLengthChecker ?? calculateBodyLength,
    credentialDefaultProvider: config?.credentialDefaultProvider ?? decorateDefaultCredentialProvider(defaultProvider),
    defaultUserAgentProvider: config?.defaultUserAgentProvider ?? defaultUserAgent({ serviceId: clientSharedValues.serviceId, clientVersion: package_default2.version }),
    maxAttempts: config?.maxAttempts ?? loadConfig(NODE_MAX_ATTEMPT_CONFIG_OPTIONS),
    region: config?.region ?? loadConfig(NODE_REGION_CONFIG_OPTIONS, NODE_REGION_CONFIG_FILE_OPTIONS),
    requestHandler: config?.requestHandler ?? new NodeHttpHandler(defaultConfigProvider),
    retryMode: config?.retryMode ?? loadConfig({
      ...NODE_RETRY_MODE_CONFIG_OPTIONS,
      default: async () => (await defaultConfigProvider()).retryMode || DEFAULT_RETRY_MODE
    }),
    sha256: config?.sha256 ?? Hash.bind(null, "sha256"),
    streamCollector: config?.streamCollector ?? streamCollector,
    useDualstackEndpoint: config?.useDualstackEndpoint ?? loadConfig(NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS),
    useFipsEndpoint: config?.useFipsEndpoint ?? loadConfig(NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS),
    utf8Decoder: config?.utf8Decoder ?? fromUtf82,
    utf8Encoder: config?.utf8Encoder ?? toUtf8
  };
};

// ../../node_modules/@aws-sdk/client-sts/dist-es/STSClient.js
var STSClient = class extends Client {
  constructor(configuration) {
    const _config_0 = getRuntimeConfig6(configuration);
    const _config_1 = resolveClientEndpointParameters2(_config_0);
    const _config_2 = resolveRegionConfig(_config_1);
    const _config_3 = resolveEndpointConfig(_config_2);
    const _config_4 = resolveRetryConfig(_config_3);
    const _config_5 = resolveHostHeaderConfig(_config_4);
    const _config_6 = resolveStsAuthConfig(_config_5, { stsClientCtor: STSClient });
    const _config_7 = resolveUserAgentConfig(_config_6);
    super(_config_7);
    this.config = _config_7;
    this.middlewareStack.use(getRetryPlugin(this.config));
    this.middlewareStack.use(getContentLengthPlugin(this.config));
    this.middlewareStack.use(getHostHeaderPlugin(this.config));
    this.middlewareStack.use(getLoggerPlugin(this.config));
    this.middlewareStack.use(getRecursionDetectionPlugin(this.config));
    this.middlewareStack.use(getUserAgentPlugin(this.config));
  }
  destroy() {
    super.destroy();
  }
};

// ../../node_modules/@aws-sdk/client-sts/dist-es/defaultRoleAssumers.js
var getCustomizableStsClientCtor = (baseCtor, customizations) => {
  if (!customizations)
    return baseCtor;
  else
    return class CustomizableSTSClient extends baseCtor {
      constructor(config) {
        super(config);
        for (const customization of customizations) {
          this.middlewareStack.use(customization);
        }
      }
    };
};
var getDefaultRoleAssumer2 = (stsOptions = {}, stsPlugins) => getDefaultRoleAssumer(stsOptions, getCustomizableStsClientCtor(STSClient, stsPlugins));
var getDefaultRoleAssumerWithWebIdentity2 = (stsOptions = {}, stsPlugins) => getDefaultRoleAssumerWithWebIdentity(stsOptions, getCustomizableStsClientCtor(STSClient, stsPlugins));
var decorateDefaultCredentialProvider2 = (provider) => (input) => provider({
  roleAssumer: getDefaultRoleAssumer2(input),
  roleAssumerWithWebIdentity: getDefaultRoleAssumerWithWebIdentity2(input),
  ...input
});

// ../../node_modules/@aws-sdk/client-dynamodb/dist-es/endpoint/ruleset.js
var v2 = "fn";
var w2 = "argv";
var x2 = "ref";
var a4 = true;
var b4 = false;
var c4 = "String";
var d4 = "PartitionResult";
var e4 = "tree";
var f4 = "error";
var g4 = "endpoint";
var h4 = "getAttr";
var i4 = "stringEquals";
var j4 = { "required": true, "default": false, "type": "Boolean" };
var k4 = { [x2]: "Region" };
var l4 = { [x2]: "Endpoint" };
var m4 = { [v2]: "booleanEquals", [w2]: [{ [x2]: "UseFIPS" }, true] };
var n4 = { [v2]: "booleanEquals", [w2]: [{ [x2]: "UseDualStack" }, true] };
var o4 = {};
var p4 = { [v2]: "booleanEquals", [w2]: [true, { [v2]: h4, [w2]: [{ [x2]: d4 }, "supportsFIPS"] }] };
var q4 = { [x2]: d4 };
var r4 = { [v2]: "booleanEquals", [w2]: [true, { [v2]: h4, [w2]: [q4, "supportsDualStack"] }] };
var s4 = { "url": "https://dynamodb.{Region}.{PartitionResult#dnsSuffix}", "properties": {}, "headers": {} };
var t2 = [m4];
var u2 = [n4];
var _data4 = { version: "1.0", parameters: { Region: { required: a4, type: c4 }, UseDualStack: j4, UseFIPS: j4, Endpoint: { required: b4, type: c4 } }, rules: [{ conditions: [{ [v2]: "aws.partition", [w2]: [k4], assign: d4 }], type: e4, rules: [{ conditions: [{ [v2]: "isSet", [w2]: [l4] }], type: e4, rules: [{ conditions: t2, error: "Invalid Configuration: FIPS and custom endpoint are not supported", type: f4 }, { type: e4, rules: [{ conditions: u2, error: "Invalid Configuration: Dualstack and custom endpoint are not supported", type: f4 }, { endpoint: { url: l4, properties: o4, headers: o4 }, type: g4 }] }] }, { conditions: [m4, n4], type: e4, rules: [{ conditions: [p4, r4], type: e4, rules: [{ endpoint: { url: "https://dynamodb-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: o4, headers: o4 }, type: g4 }] }, { error: "FIPS and DualStack are enabled, but this partition does not support one or both", type: f4 }] }, { conditions: t2, type: e4, rules: [{ conditions: [p4], type: e4, rules: [{ type: e4, rules: [{ conditions: [{ [v2]: i4, [w2]: ["aws-us-gov", { [v2]: h4, [w2]: [q4, "name"] }] }], endpoint: s4, type: g4 }, { endpoint: { url: "https://dynamodb-fips.{Region}.{PartitionResult#dnsSuffix}", properties: o4, headers: o4 }, type: g4 }] }] }, { error: "FIPS is enabled but this partition does not support FIPS", type: f4 }] }, { conditions: u2, type: e4, rules: [{ conditions: [r4], type: e4, rules: [{ endpoint: { url: "https://dynamodb.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: o4, headers: o4 }, type: g4 }] }, { error: "DualStack is enabled but this partition does not support DualStack", type: f4 }] }, { type: e4, rules: [{ conditions: [{ [v2]: i4, [w2]: [k4, "local"] }], endpoint: { url: "http://localhost:8000", properties: { authSchemes: [{ name: "sigv4", signingRegion: "us-east-1", signingName: "dynamodb" }] }, headers: o4 }, type: g4 }, { endpoint: s4, type: g4 }] }] }] };
var ruleSet4 = _data4;

// ../../node_modules/@aws-sdk/client-dynamodb/dist-es/endpoint/endpointResolver.js
var defaultEndpointResolver4 = (endpointParams, context = {}) => {
  return resolveEndpoint(ruleSet4, {
    endpointParams,
    logger: context.logger
  });
};

// ../../node_modules/@aws-sdk/client-dynamodb/dist-es/runtimeConfig.shared.js
var getRuntimeConfig7 = (config) => ({
  apiVersion: "2012-08-10",
  base64Decoder: config?.base64Decoder ?? fromBase64,
  base64Encoder: config?.base64Encoder ?? toBase64,
  disableHostPrefix: config?.disableHostPrefix ?? false,
  endpointProvider: config?.endpointProvider ?? defaultEndpointResolver4,
  logger: config?.logger ?? new NoOpLogger(),
  serviceId: config?.serviceId ?? "DynamoDB",
  urlParser: config?.urlParser ?? parseUrl
});

// ../../node_modules/@aws-sdk/client-dynamodb/dist-es/runtimeConfig.js
var getRuntimeConfig8 = (config) => {
  emitWarningIfUnsupportedVersion(process.version);
  const defaultsMode = resolveDefaultsModeConfig(config);
  const defaultConfigProvider = () => defaultsMode().then(loadConfigsForDefaultMode);
  const clientSharedValues = getRuntimeConfig7(config);
  return {
    ...clientSharedValues,
    ...config,
    runtime: "node",
    defaultsMode,
    bodyLengthChecker: config?.bodyLengthChecker ?? calculateBodyLength,
    credentialDefaultProvider: config?.credentialDefaultProvider ?? decorateDefaultCredentialProvider2(defaultProvider),
    defaultUserAgentProvider: config?.defaultUserAgentProvider ?? defaultUserAgent({ serviceId: clientSharedValues.serviceId, clientVersion: package_default.version }),
    endpointDiscoveryEnabledProvider: config?.endpointDiscoveryEnabledProvider ?? loadConfig(NODE_ENDPOINT_DISCOVERY_CONFIG_OPTIONS),
    maxAttempts: config?.maxAttempts ?? loadConfig(NODE_MAX_ATTEMPT_CONFIG_OPTIONS),
    region: config?.region ?? loadConfig(NODE_REGION_CONFIG_OPTIONS, NODE_REGION_CONFIG_FILE_OPTIONS),
    requestHandler: config?.requestHandler ?? new NodeHttpHandler(defaultConfigProvider),
    retryMode: config?.retryMode ?? loadConfig({
      ...NODE_RETRY_MODE_CONFIG_OPTIONS,
      default: async () => (await defaultConfigProvider()).retryMode || DEFAULT_RETRY_MODE
    }),
    sha256: config?.sha256 ?? Hash.bind(null, "sha256"),
    streamCollector: config?.streamCollector ?? streamCollector,
    useDualstackEndpoint: config?.useDualstackEndpoint ?? loadConfig(NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS),
    useFipsEndpoint: config?.useFipsEndpoint ?? loadConfig(NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS),
    utf8Decoder: config?.utf8Decoder ?? fromUtf82,
    utf8Encoder: config?.utf8Encoder ?? toUtf8
  };
};

// ../../node_modules/@aws-sdk/client-dynamodb/dist-es/DynamoDBClient.js
var DynamoDBClient = class extends Client {
  constructor(configuration) {
    const _config_0 = getRuntimeConfig8(configuration);
    const _config_1 = resolveClientEndpointParameters(_config_0);
    const _config_2 = resolveRegionConfig(_config_1);
    const _config_3 = resolveEndpointConfig(_config_2);
    const _config_4 = resolveRetryConfig(_config_3);
    const _config_5 = resolveHostHeaderConfig(_config_4);
    const _config_6 = resolveAwsAuthConfig(_config_5);
    const _config_7 = resolveUserAgentConfig(_config_6);
    const _config_8 = resolveEndpointDiscoveryConfig(_config_7, {
      endpointDiscoveryCommandCtor: DescribeEndpointsCommand
    });
    super(_config_8);
    this.config = _config_8;
    this.middlewareStack.use(getRetryPlugin(this.config));
    this.middlewareStack.use(getContentLengthPlugin(this.config));
    this.middlewareStack.use(getHostHeaderPlugin(this.config));
    this.middlewareStack.use(getLoggerPlugin(this.config));
    this.middlewareStack.use(getRecursionDetectionPlugin(this.config));
    this.middlewareStack.use(getAwsAuthPlugin(this.config));
    this.middlewareStack.use(getUserAgentPlugin(this.config));
  }
  destroy() {
    super.destroy();
  }
};

// ../../node_modules/@aws-sdk/util-dynamodb/dist-es/convertToAttr.js
var convertToAttr = (data, options) => {
  if (data === void 0) {
    throw new Error(`Pass options.removeUndefinedValues=true to remove undefined values from map/array/set.`);
  } else if (data === null && typeof data === "object") {
    return convertToNullAttr();
  } else if (Array.isArray(data)) {
    return convertToListAttr(data, options);
  } else if (data?.constructor?.name === "Set") {
    return convertToSetAttr(data, options);
  } else if (data?.constructor?.name === "Map") {
    return convertToMapAttrFromIterable(data, options);
  } else if (data?.constructor?.name === "Object" || !data.constructor && typeof data === "object") {
    return convertToMapAttrFromEnumerableProps(data, options);
  } else if (isBinary(data)) {
    if (data.length === 0 && options?.convertEmptyValues) {
      return convertToNullAttr();
    }
    return convertToBinaryAttr(data);
  } else if (typeof data === "boolean" || data?.constructor?.name === "Boolean") {
    return { BOOL: data.valueOf() };
  } else if (typeof data === "number" || data?.constructor?.name === "Number") {
    return convertToNumberAttr(data);
  } else if (typeof data === "bigint") {
    return convertToBigIntAttr(data);
  } else if (typeof data === "string" || data?.constructor?.name === "String") {
    if (data.length === 0 && options?.convertEmptyValues) {
      return convertToNullAttr();
    }
    return convertToStringAttr(data);
  } else if (options?.convertClassInstanceToMap && typeof data === "object") {
    return convertToMapAttrFromEnumerableProps(data, options);
  }
  throw new Error(`Unsupported type passed: ${data}. Pass options.convertClassInstanceToMap=true to marshall typeof object as map attribute.`);
};
var convertToListAttr = (data, options) => ({
  L: data.filter((item) => !options?.removeUndefinedValues || options?.removeUndefinedValues && item !== void 0).map((item) => convertToAttr(item, options))
});
var convertToSetAttr = (set, options) => {
  const setToOperate = options?.removeUndefinedValues ? new Set([...set].filter((value) => value !== void 0)) : set;
  if (!options?.removeUndefinedValues && setToOperate.has(void 0)) {
    throw new Error(`Pass options.removeUndefinedValues=true to remove undefined values from map/array/set.`);
  }
  if (setToOperate.size === 0) {
    if (options?.convertEmptyValues) {
      return convertToNullAttr();
    }
    throw new Error(`Pass a non-empty set, or options.convertEmptyValues=true.`);
  }
  const item = setToOperate.values().next().value;
  if (typeof item === "number") {
    return {
      NS: Array.from(setToOperate).map(convertToNumberAttr).map((item2) => item2.N)
    };
  } else if (typeof item === "bigint") {
    return {
      NS: Array.from(setToOperate).map(convertToBigIntAttr).map((item2) => item2.N)
    };
  } else if (typeof item === "string") {
    return {
      SS: Array.from(setToOperate).map(convertToStringAttr).map((item2) => item2.S)
    };
  } else if (isBinary(item)) {
    return {
      BS: Array.from(setToOperate).map(convertToBinaryAttr).map((item2) => item2.B)
    };
  } else {
    throw new Error(`Only Number Set (NS), Binary Set (BS) or String Set (SS) are allowed.`);
  }
};
var convertToMapAttrFromIterable = (data, options) => ({
  M: ((data2) => {
    const map9 = {};
    for (const [key, value] of data2) {
      if (typeof value !== "function" && (value !== void 0 || !options?.removeUndefinedValues)) {
        map9[key] = convertToAttr(value, options);
      }
    }
    return map9;
  })(data)
});
var convertToMapAttrFromEnumerableProps = (data, options) => ({
  M: ((data2) => {
    const map9 = {};
    for (const key in data2) {
      const value = data2[key];
      if (typeof value !== "function" && (value !== void 0 || !options?.removeUndefinedValues)) {
        map9[key] = convertToAttr(value, options);
      }
    }
    return map9;
  })(data)
});
var convertToNullAttr = () => ({ NULL: true });
var convertToBinaryAttr = (data) => ({ B: data });
var convertToStringAttr = (data) => ({ S: data.toString() });
var convertToBigIntAttr = (data) => ({ N: data.toString() });
var validateBigIntAndThrow = (errorPrefix) => {
  throw new Error(`${errorPrefix} ${typeof BigInt === "function" ? "Use BigInt." : "Pass string value instead."} `);
};
var convertToNumberAttr = (num) => {
  if ([Number.NaN, Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY].map((val) => val.toString()).includes(num.toString())) {
    throw new Error(`Special numeric value ${num.toString()} is not allowed`);
  } else if (num > Number.MAX_SAFE_INTEGER) {
    validateBigIntAndThrow(`Number ${num.toString()} is greater than Number.MAX_SAFE_INTEGER.`);
  } else if (num < Number.MIN_SAFE_INTEGER) {
    validateBigIntAndThrow(`Number ${num.toString()} is lesser than Number.MIN_SAFE_INTEGER.`);
  }
  return { N: num.toString() };
};
var isBinary = (data) => {
  const binaryTypes = [
    "ArrayBuffer",
    "Blob",
    "Buffer",
    "DataView",
    "File",
    "Int8Array",
    "Uint8Array",
    "Uint8ClampedArray",
    "Int16Array",
    "Uint16Array",
    "Int32Array",
    "Uint32Array",
    "Float32Array",
    "Float64Array",
    "BigInt64Array",
    "BigUint64Array"
  ];
  if (data?.constructor) {
    return binaryTypes.includes(data.constructor.name);
  }
  return false;
};

// ../../node_modules/@aws-sdk/util-dynamodb/dist-es/convertToNative.js
var convertToNative = (data, options) => {
  for (const [key, value] of Object.entries(data)) {
    if (value !== void 0) {
      switch (key) {
        case "NULL":
          return null;
        case "BOOL":
          return Boolean(value);
        case "N":
          return convertNumber(value, options);
        case "B":
          return convertBinary(value);
        case "S":
          return convertString(value);
        case "L":
          return convertList(value, options);
        case "M":
          return convertMap(value, options);
        case "NS":
          return new Set(value.map((item) => convertNumber(item, options)));
        case "BS":
          return new Set(value.map(convertBinary));
        case "SS":
          return new Set(value.map(convertString));
        default:
          throw new Error(`Unsupported type passed: ${key}`);
      }
    }
  }
  throw new Error(`No value defined: ${JSON.stringify(data)}`);
};
var convertNumber = (numString, options) => {
  if (options?.wrapNumbers) {
    return { value: numString };
  }
  const num = Number(numString);
  const infinityValues = [Number.POSITIVE_INFINITY, Number.NEGATIVE_INFINITY];
  if ((num > Number.MAX_SAFE_INTEGER || num < Number.MIN_SAFE_INTEGER) && !infinityValues.includes(num)) {
    if (typeof BigInt === "function") {
      try {
        return BigInt(numString);
      } catch (error) {
        throw new Error(`${numString} can't be converted to BigInt. Set options.wrapNumbers to get string value.`);
      }
    } else {
      throw new Error(`${numString} is outside SAFE_INTEGER bounds. Set options.wrapNumbers to get string value.`);
    }
  }
  return num;
};
var convertString = (stringValue) => stringValue;
var convertBinary = (binaryValue) => binaryValue;
var convertList = (list, options) => list.map((item) => convertToNative(item, options));
var convertMap = (map9, options) => Object.entries(map9).reduce((acc, [key, value]) => (acc[key] = convertToNative(value, options), acc), {});

// ../../node_modules/@aws-sdk/util-dynamodb/dist-es/marshall.js
function marshall(data, options) {
  const attributeValue = convertToAttr(data, options);
  const [key, value] = Object.entries(attributeValue)[0];
  switch (key) {
    case "M":
    case "L":
      return value;
    case "SS":
    case "NS":
    case "BS":
    case "S":
    case "N":
    case "B":
    case "NULL":
    case "BOOL":
    case "$unknown":
    default:
      return attributeValue;
  }
}

// ../../node_modules/@aws-sdk/util-dynamodb/dist-es/unmarshall.js
var unmarshall = (data, options) => convertToNative({ M: data }, options);

// ../../node_modules/@aws-sdk/lib-dynamodb/dist-es/commands/utils.js
var processObj = (obj, processFunc, children) => {
  if (obj !== void 0) {
    if (!children || Array.isArray(children) && children.length === 0) {
      return processFunc(obj);
    } else {
      if (Array.isArray(children)) {
        return processKeysInObj(obj, processFunc, children);
      } else {
        return processAllKeysInObj(obj, processFunc, children.children);
      }
    }
  }
  return void 0;
};
var processKeyInObj = (obj, processFunc, children) => {
  if (Array.isArray(obj)) {
    return obj.map((item) => processObj(item, processFunc, children));
  }
  return processObj(obj, processFunc, children);
};
var processKeysInObj = (obj, processFunc, keyNodes) => {
  const accumulator = { ...obj };
  return keyNodes.reduce((acc, { key, children }) => {
    acc[key] = processKeyInObj(acc[key], processFunc, children);
    return acc;
  }, accumulator);
};
var processAllKeysInObj = (obj, processFunc, children) => Object.entries(obj).reduce((acc, [key, value]) => {
  acc[key] = processKeyInObj(value, processFunc, children);
  return acc;
}, {});
var marshallInput = (obj, keyNodes, options) => {
  const marshallFunc = (toMarshall) => marshall(toMarshall, options);
  return processKeysInObj(obj, marshallFunc, keyNodes);
};
var unmarshallOutput = (obj, keyNodes, options) => {
  const unmarshallFunc = (toMarshall) => unmarshall(toMarshall, options);
  return processKeysInObj(obj, unmarshallFunc, keyNodes);
};

// ../../node_modules/@aws-sdk/lib-dynamodb/dist-es/baseCommand/DynamoDBDocumentClientCommand.js
var DynamoDBDocumentClientCommand = class extends Command {
  addMarshallingMiddleware(configuration) {
    const { marshallOptions, unmarshallOptions } = configuration.translateConfig || {};
    this.clientCommand.middlewareStack.addRelativeTo((next, context) => async (args) => {
      args.input = marshallInput(this.input, this.inputKeyNodes, marshallOptions);
      context.dynamoDbDocumentClientOptions = context.dynamoDbDocumentClientOptions || DynamoDBDocumentClientCommand.defaultLogFilterOverrides;
      const input = args.input;
      context.dynamoDbDocumentClientOptions.overrideInputFilterSensitiveLog = () => {
        return context.inputFilterSensitiveLog?.(input);
      };
      return next(args);
    }, {
      name: "DocumentMarshall",
      relation: "before",
      toMiddleware: "serializerMiddleware",
      override: true
    });
    this.clientCommand.middlewareStack.addRelativeTo((next, context) => async (args) => {
      const deserialized = await next(args);
      const output = deserialized.output;
      context.dynamoDbDocumentClientOptions = context.dynamoDbDocumentClientOptions || DynamoDBDocumentClientCommand.defaultLogFilterOverrides;
      context.dynamoDbDocumentClientOptions.overrideOutputFilterSensitiveLog = () => {
        return context.outputFilterSensitiveLog?.(output);
      };
      deserialized.output = unmarshallOutput(deserialized.output, this.outputKeyNodes, unmarshallOptions);
      return deserialized;
    }, {
      name: "DocumentUnmarshall",
      relation: "before",
      toMiddleware: "deserializerMiddleware",
      override: true
    });
  }
};
DynamoDBDocumentClientCommand.defaultLogFilterOverrides = {
  overrideInputFilterSensitiveLog(...args) {
  },
  overrideOutputFilterSensitiveLog(...args) {
  }
};

// ../../node_modules/@aws-sdk/lib-dynamodb/dist-es/commands/BatchGetCommand.js
var BatchGetCommand = class extends DynamoDBDocumentClientCommand {
  constructor(input) {
    super();
    this.input = input;
    this.inputKeyNodes = [
      {
        key: "RequestItems",
        children: {
          children: [{ key: "Keys" }]
        }
      }
    ];
    this.outputKeyNodes = [
      { key: "Responses", children: {} },
      {
        key: "UnprocessedKeys",
        children: {
          children: [{ key: "Keys" }]
        }
      }
    ];
    this.clientCommand = new BatchGetItemCommand(this.input);
    this.middlewareStack = this.clientCommand.middlewareStack;
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.addMarshallingMiddleware(configuration);
    const stack = clientStack.concat(this.middlewareStack);
    const handler = this.clientCommand.resolveMiddleware(stack, configuration, options);
    return async () => handler(this.clientCommand);
  }
};

// ../../node_modules/@aws-sdk/lib-dynamodb/dist-es/commands/BatchWriteCommand.js
var BatchWriteCommand = class extends DynamoDBDocumentClientCommand {
  constructor(input) {
    super();
    this.input = input;
    this.inputKeyNodes = [
      {
        key: "RequestItems",
        children: {
          children: [
            { key: "PutRequest", children: [{ key: "Item" }] },
            { key: "DeleteRequest", children: [{ key: "Key" }] }
          ]
        }
      }
    ];
    this.outputKeyNodes = [
      {
        key: "UnprocessedItems",
        children: {
          children: [
            { key: "PutRequest", children: [{ key: "Item" }] },
            { key: "DeleteRequest", children: [{ key: "Key" }] }
          ]
        }
      },
      {
        key: "ItemCollectionMetrics",
        children: {
          children: [{ key: "ItemCollectionKey" }]
        }
      }
    ];
    this.clientCommand = new BatchWriteItemCommand(this.input);
    this.middlewareStack = this.clientCommand.middlewareStack;
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.addMarshallingMiddleware(configuration);
    const stack = clientStack.concat(this.middlewareStack);
    const handler = this.clientCommand.resolveMiddleware(stack, configuration, options);
    return async () => handler(this.clientCommand);
  }
};

// ../../node_modules/@aws-sdk/lib-dynamodb/dist-es/commands/DeleteCommand.js
var DeleteCommand = class extends DynamoDBDocumentClientCommand {
  constructor(input) {
    super();
    this.input = input;
    this.inputKeyNodes = [
      { key: "Key" },
      {
        key: "Expected",
        children: {
          children: [{ key: "Value" }, { key: "AttributeValueList" }]
        }
      },
      { key: "ExpressionAttributeValues" }
    ];
    this.outputKeyNodes = [
      { key: "Attributes" },
      { key: "ItemCollectionMetrics", children: [{ key: "ItemCollectionKey" }] }
    ];
    this.clientCommand = new DeleteItemCommand(this.input);
    this.middlewareStack = this.clientCommand.middlewareStack;
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.addMarshallingMiddleware(configuration);
    const stack = clientStack.concat(this.middlewareStack);
    const handler = this.clientCommand.resolveMiddleware(stack, configuration, options);
    return async () => handler(this.clientCommand);
  }
};

// ../../node_modules/@aws-sdk/lib-dynamodb/dist-es/commands/GetCommand.js
var GetCommand = class extends DynamoDBDocumentClientCommand {
  constructor(input) {
    super();
    this.input = input;
    this.inputKeyNodes = [{ key: "Key" }];
    this.outputKeyNodes = [{ key: "Item" }];
    this.clientCommand = new GetItemCommand(this.input);
    this.middlewareStack = this.clientCommand.middlewareStack;
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.addMarshallingMiddleware(configuration);
    const stack = clientStack.concat(this.middlewareStack);
    const handler = this.clientCommand.resolveMiddleware(stack, configuration, options);
    return async () => handler(this.clientCommand);
  }
};

// ../../node_modules/@aws-sdk/lib-dynamodb/dist-es/commands/PutCommand.js
var PutCommand = class extends DynamoDBDocumentClientCommand {
  constructor(input) {
    super();
    this.input = input;
    this.inputKeyNodes = [
      { key: "Item" },
      {
        key: "Expected",
        children: {
          children: [{ key: "Value" }, { key: "AttributeValueList" }]
        }
      },
      { key: "ExpressionAttributeValues" }
    ];
    this.outputKeyNodes = [
      { key: "Attributes" },
      { key: "ItemCollectionMetrics", children: [{ key: "ItemCollectionKey" }] }
    ];
    this.clientCommand = new PutItemCommand(this.input);
    this.middlewareStack = this.clientCommand.middlewareStack;
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.addMarshallingMiddleware(configuration);
    const stack = clientStack.concat(this.middlewareStack);
    const handler = this.clientCommand.resolveMiddleware(stack, configuration, options);
    return async () => handler(this.clientCommand);
  }
};

// ../../node_modules/@aws-sdk/lib-dynamodb/dist-es/commands/QueryCommand.js
var QueryCommand2 = class extends DynamoDBDocumentClientCommand {
  constructor(input) {
    super();
    this.input = input;
    this.inputKeyNodes = [
      {
        key: "KeyConditions",
        children: {
          children: [{ key: "AttributeValueList" }]
        }
      },
      {
        key: "QueryFilter",
        children: {
          children: [{ key: "AttributeValueList" }]
        }
      },
      { key: "ExclusiveStartKey" },
      { key: "ExpressionAttributeValues" }
    ];
    this.outputKeyNodes = [{ key: "Items" }, { key: "LastEvaluatedKey" }];
    this.clientCommand = new QueryCommand(this.input);
    this.middlewareStack = this.clientCommand.middlewareStack;
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.addMarshallingMiddleware(configuration);
    const stack = clientStack.concat(this.middlewareStack);
    const handler = this.clientCommand.resolveMiddleware(stack, configuration, options);
    return async () => handler(this.clientCommand);
  }
};

// ../../node_modules/@aws-sdk/lib-dynamodb/dist-es/commands/ScanCommand.js
var ScanCommand2 = class extends DynamoDBDocumentClientCommand {
  constructor(input) {
    super();
    this.input = input;
    this.inputKeyNodes = [
      {
        key: "ScanFilter",
        children: {
          children: [{ key: "AttributeValueList" }]
        }
      },
      { key: "ExclusiveStartKey" },
      { key: "ExpressionAttributeValues" }
    ];
    this.outputKeyNodes = [{ key: "Items" }, { key: "LastEvaluatedKey" }];
    this.clientCommand = new ScanCommand(this.input);
    this.middlewareStack = this.clientCommand.middlewareStack;
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.addMarshallingMiddleware(configuration);
    const stack = clientStack.concat(this.middlewareStack);
    const handler = this.clientCommand.resolveMiddleware(stack, configuration, options);
    return async () => handler(this.clientCommand);
  }
};

// ../../node_modules/@aws-sdk/lib-dynamodb/dist-es/commands/TransactGetCommand.js
var TransactGetCommand = class extends DynamoDBDocumentClientCommand {
  constructor(input) {
    super();
    this.input = input;
    this.inputKeyNodes = [{ key: "TransactItems", children: [{ key: "Get", children: [{ key: "Key" }] }] }];
    this.outputKeyNodes = [{ key: "Responses", children: [{ key: "Item" }] }];
    this.clientCommand = new TransactGetItemsCommand(this.input);
    this.middlewareStack = this.clientCommand.middlewareStack;
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.addMarshallingMiddleware(configuration);
    const stack = clientStack.concat(this.middlewareStack);
    const handler = this.clientCommand.resolveMiddleware(stack, configuration, options);
    return async () => handler(this.clientCommand);
  }
};

// ../../node_modules/@aws-sdk/lib-dynamodb/dist-es/commands/TransactWriteCommand.js
var TransactWriteCommand = class extends DynamoDBDocumentClientCommand {
  constructor(input) {
    super();
    this.input = input;
    this.inputKeyNodes = [
      {
        key: "TransactItems",
        children: [
          { key: "ConditionCheck", children: [{ key: "Key" }, { key: "ExpressionAttributeValues" }] },
          { key: "Put", children: [{ key: "Item" }, { key: "ExpressionAttributeValues" }] },
          { key: "Delete", children: [{ key: "Key" }, { key: "ExpressionAttributeValues" }] },
          { key: "Update", children: [{ key: "Key" }, { key: "ExpressionAttributeValues" }] }
        ]
      }
    ];
    this.outputKeyNodes = [
      {
        key: "ItemCollectionMetrics",
        children: {
          children: [{ key: "ItemCollectionKey" }]
        }
      }
    ];
    this.clientCommand = new TransactWriteItemsCommand(this.input);
    this.middlewareStack = this.clientCommand.middlewareStack;
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.addMarshallingMiddleware(configuration);
    const stack = clientStack.concat(this.middlewareStack);
    const handler = this.clientCommand.resolveMiddleware(stack, configuration, options);
    return async () => handler(this.clientCommand);
  }
};

// ../../node_modules/@aws-sdk/lib-dynamodb/dist-es/commands/UpdateCommand.js
var UpdateCommand = class extends DynamoDBDocumentClientCommand {
  constructor(input) {
    super();
    this.input = input;
    this.inputKeyNodes = [
      { key: "Key" },
      {
        key: "AttributeUpdates",
        children: {
          children: [{ key: "Value" }]
        }
      },
      {
        key: "Expected",
        children: {
          children: [{ key: "Value" }, { key: "AttributeValueList" }]
        }
      },
      { key: "ExpressionAttributeValues" }
    ];
    this.outputKeyNodes = [
      { key: "Attributes" },
      { key: "ItemCollectionMetrics", children: [{ key: "ItemCollectionKey" }] }
    ];
    this.clientCommand = new UpdateItemCommand(this.input);
    this.middlewareStack = this.clientCommand.middlewareStack;
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.addMarshallingMiddleware(configuration);
    const stack = clientStack.concat(this.middlewareStack);
    const handler = this.clientCommand.resolveMiddleware(stack, configuration, options);
    return async () => handler(this.clientCommand);
  }
};

// ../../node_modules/@aws-sdk/lib-dynamodb/dist-es/DynamoDBDocumentClient.js
var DynamoDBDocumentClient = class extends Client {
  constructor(client, translateConfig) {
    super(client.config);
    this.config = client.config;
    this.config.translateConfig = translateConfig;
    this.middlewareStack = client.middlewareStack;
  }
  static from(client, translateConfig) {
    return new DynamoDBDocumentClient(client, translateConfig);
  }
  destroy() {
  }
};

// src/services/dynamodb/database.ts
var migrate = (client, definitions) => {
  return Promise.all(definitions.map((definition) => {
    return client.send(new CreateTableCommand(definition));
  }));
};
var seed = (client, data) => {
  return Promise.all(Object.entries(data).map(([TableName, items]) => {
    return Promise.all(items.map(async (item) => {
      try {
        await client.send(new PutCommand({
          TableName,
          Item: item
        }));
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`DynamoDB Seeding Error: ${error.message}`);
        }
        throw error;
      }
    }));
  }));
};

// src/services/dynamodb/definition.ts
var import_awsless = require("@heat/awsless");
var loadDefinitions = async (paths) => {
  const definitions = [];
  if (!Array.isArray(paths)) {
    paths = [paths];
  }
  await Promise.all(paths.map(async (path) => {
    const stacks = await (0, import_awsless.load)(path, {
      resolveRemoteResolvers: false,
      resolveLocalResolvers: false
    });
    for (let stack of stacks) {
      const template = JSON.parse(stack.templateBody);
      Object.values(template.Resources).map((resource) => {
        if (resource.Type !== "AWS::DynamoDB::Table") {
          return;
        }
        const properties = Object.assign({}, resource.Properties, {
          BillingMode: "PAY_PER_REQUEST"
        });
        delete properties.TableClass;
        delete properties.TimeToLiveSpecification;
        delete properties.PointInTimeRecoverySpecification;
        delete properties.Tags;
        if (properties.StreamSpecification) {
          properties.StreamSpecification.StreamEnabled = true;
        }
        definitions.push(properties);
      });
    }
  }));
  return definitions;
};

// src/services/dynamodb/server.ts
var import_sleep_await = require("sleep-await");
var import_dynamo_db_local = __toESM(require("dynamo-db-local"));
var DynamoDBServer = class {
  constructor(region = "us-east-1") {
    this.region = region;
    this.endpoint = parseUrl(`http://localhost`);
  }
  client;
  documentClient;
  endpoint;
  process;
  async listen(port) {
    this.endpoint.port = port;
    this.process = await import_dynamo_db_local.default.spawn({ port });
  }
  async kill() {
    if (this.process) {
      await this.process.kill();
      this.process = void 0;
    }
  }
  async ping() {
    const client = this.getClient();
    const command = new ListTablesCommand({});
    const response = await client.send(command);
    return Array.isArray(response.TableNames);
  }
  async wait(times = 10) {
    while (times--) {
      try {
        if (await this.ping()) {
          return;
        }
      } catch (error) {
        await (0, import_sleep_await.sleepAwait)(100 * times);
        continue;
      }
    }
    throw new Error("DynamoDB server is unavailable");
  }
  async migrate(path) {
    const definitions = await loadDefinitions(path);
    await migrate(this.getClient(), definitions);
  }
  async seed(data) {
    await seed(this.getDocumentClient(), data);
  }
  getClient() {
    if (!this.client) {
      this.client = new DynamoDBClient({
        maxAttempts: 10,
        endpoint: this.endpoint,
        region: this.region,
        tls: false,
        credentials: {
          accessKeyId: "fake",
          secretAccessKey: "fake"
        }
      });
    }
    return this.client;
  }
  getDocumentClient() {
    if (!this.documentClient) {
      this.documentClient = DynamoDBDocumentClient.from(this.getClient(), {
        marshallOptions: {
          removeUndefinedValues: true
        }
      });
    }
    return this.documentClient;
  }
};

// src/helpers/port.ts
var import_net = __toESM(require("net"));
var import_proper_lockfile = __toESM(require("proper-lockfile"));
var import_promises = require("fs/promises");
var random = (min, max) => {
  return Math.floor(
    Math.random() * (max - min) + min
  );
};
var isAvailable = (port) => {
  return new Promise((resolve, reject) => {
    const server = import_net.default.createServer();
    server.once("error", (error) => {
      error.code === "EADDRINUSE" ? resolve(false) : reject(error);
    });
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port);
  });
};
var prepareLockFile = async (file) => {
  try {
    await (0, import_promises.access)(file, import_promises.constants.W_OK);
  } catch (error) {
    const handle = await (0, import_promises.open)(file, "w");
    await handle.close();
  }
};
var lock = async (file, timeout) => {
  try {
    await prepareLockFile(file);
    await import_proper_lockfile.default.lock(file, {
      stale: timeout,
      retries: 0
    });
  } catch (error) {
    return false;
  }
  return true;
};
var unlock = (file) => {
  return import_proper_lockfile.default.unlock(file);
};
var requestPort = async ({ min = 32768, max = 65535, timeout = 1e3 * 60 * 5 } = {}) => {
  let times = 10;
  while (times--) {
    const port = random(min, max);
    const open2 = await isAvailable(port);
    if (!open2)
      continue;
    const file = `/var/tmp/port-${port}`;
    if (await lock(file, timeout)) {
      return [
        port,
        async () => {
          await unlock(file);
          await (0, import_promises.unlink)(file);
        }
      ];
    }
  }
  throw new Error("No port found");
};

// src/services/dynamodb/index.ts
var startDynamoDB = ({ path, timeout = 30 * 1e3, seed: seed2 = {} }) => {
  const server = new DynamoDBServer();
  let releasePort;
  beforeAll(async () => {
    const [port, release2] = await requestPort();
    releasePort = release2;
    await server.listen(port);
    await server.wait();
    await server.migrate(path);
    await server.seed(seed2);
  }, timeout);
  afterAll(async () => {
    await server.kill();
    await releasePort();
  }, timeout);
  return server;
};

// src/mocks/dynamodb.ts
var import_aws_sdk_client_mock = require("aws-sdk-client-mock");
var mockDynamoDB = (configOrServer) => {
  const dynamo = configOrServer instanceof DynamoDBServer ? configOrServer : startDynamoDB(configOrServer);
  const client = dynamo.getClient();
  const documentClient = dynamo.getDocumentClient();
  const clientSend = (command) => {
    return client.__proto__.send.wrappedMethod.call(client, command);
  };
  const documentClientSend = (command) => {
    return documentClient.__proto__.send.wrappedMethod.call(documentClient, command);
  };
  (0, import_aws_sdk_client_mock.mockClient)(DynamoDBClient).on(CreateTableCommand).callsFake((input) => clientSend(new CreateTableCommand(input))).on(ListTablesCommand).callsFake((input) => clientSend(new ListTablesCommand(input))).on(GetItemCommand).callsFake((input) => clientSend(new GetItemCommand(input))).on(PutItemCommand).callsFake((input) => clientSend(new PutItemCommand(input))).on(DeleteItemCommand).callsFake((input) => clientSend(new DeleteItemCommand(input))).on(UpdateItemCommand).callsFake((input) => clientSend(new UpdateItemCommand(input))).on(QueryCommand).callsFake((input) => clientSend(new QueryCommand(input))).on(ScanCommand).callsFake((input) => clientSend(new ScanCommand(input))).on(BatchGetItemCommand).callsFake((input) => clientSend(new BatchGetItemCommand(input))).on(BatchWriteItemCommand).callsFake((input) => clientSend(new BatchWriteItemCommand(input))).on(TransactGetItemsCommand).callsFake((input) => clientSend(new TransactGetItemsCommand(input))).on(TransactWriteItemsCommand).callsFake((input) => clientSend(new TransactWriteItemsCommand(input)));
  (0, import_aws_sdk_client_mock.mockClient)(DynamoDBDocumentClient).on(GetCommand).callsFake((input) => documentClientSend(new GetCommand(input))).on(PutCommand).callsFake((input) => documentClientSend(new PutCommand(input))).on(DeleteCommand).callsFake((input) => documentClientSend(new DeleteCommand(input))).on(UpdateCommand).callsFake((input) => documentClientSend(new UpdateCommand(input))).on(QueryCommand2).callsFake((input) => documentClientSend(new QueryCommand2(input))).on(ScanCommand2).callsFake((input) => documentClientSend(new ScanCommand2(input))).on(BatchGetCommand).callsFake((input) => documentClientSend(new BatchGetCommand(input))).on(BatchWriteCommand).callsFake((input) => documentClientSend(new BatchWriteCommand(input))).on(TransactGetCommand).callsFake((input) => documentClientSend(new TransactGetCommand(input))).on(TransactWriteCommand).callsFake((input) => documentClientSend(new TransactWriteCommand(input)));
  return dynamo;
};

// src/helpers/mock.ts
var mockObjectKeys = (object) => {
  const list = {};
  Object.entries(object).forEach(([key, value]) => {
    list[key] = mockFn(value);
  });
  return Object.freeze(list);
};
var mockFn = (fn) => {
  return vi ? vi.fn(fn) : fn;
};
var asyncCall = (fn, ...args) => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(fn(...args));
    }, 0);
  });
};

// ../../node_modules/@aws-sdk/client-lambda/dist-es/models/LambdaServiceException.js
var LambdaServiceException = class extends ServiceException {
  constructor(options) {
    super(options);
    Object.setPrototypeOf(this, LambdaServiceException.prototype);
  }
};

// ../../node_modules/@aws-sdk/client-lambda/dist-es/models/models_0.js
var InvalidParameterValueException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "InvalidParameterValueException",
      $fault: "client",
      ...opts
    });
    this.name = "InvalidParameterValueException";
    this.$fault = "client";
    Object.setPrototypeOf(this, InvalidParameterValueException.prototype);
    this.Type = opts.Type;
  }
};
var ResourceConflictException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "ResourceConflictException",
      $fault: "client",
      ...opts
    });
    this.name = "ResourceConflictException";
    this.$fault = "client";
    Object.setPrototypeOf(this, ResourceConflictException.prototype);
    this.Type = opts.Type;
  }
};
var ResourceNotFoundException3 = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "ResourceNotFoundException",
      $fault: "client",
      ...opts
    });
    this.name = "ResourceNotFoundException";
    this.$fault = "client";
    Object.setPrototypeOf(this, ResourceNotFoundException3.prototype);
    this.Type = opts.Type;
    this.Message = opts.Message;
  }
};
var ServiceException2 = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "ServiceException",
      $fault: "server",
      ...opts
    });
    this.name = "ServiceException";
    this.$fault = "server";
    Object.setPrototypeOf(this, ServiceException2.prototype);
    this.Type = opts.Type;
    this.Message = opts.Message;
  }
};
var ThrottleReason;
(function(ThrottleReason2) {
  ThrottleReason2["CallerRateLimitExceeded"] = "CallerRateLimitExceeded";
  ThrottleReason2["ConcurrentInvocationLimitExceeded"] = "ConcurrentInvocationLimitExceeded";
  ThrottleReason2["ConcurrentSnapshotCreateLimitExceeded"] = "ConcurrentSnapshotCreateLimitExceeded";
  ThrottleReason2["FunctionInvocationRateLimitExceeded"] = "FunctionInvocationRateLimitExceeded";
  ThrottleReason2["ReservedFunctionConcurrentInvocationLimitExceeded"] = "ReservedFunctionConcurrentInvocationLimitExceeded";
  ThrottleReason2["ReservedFunctionInvocationRateLimitExceeded"] = "ReservedFunctionInvocationRateLimitExceeded";
})(ThrottleReason || (ThrottleReason = {}));
var TooManyRequestsException2 = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "TooManyRequestsException",
      $fault: "client",
      ...opts
    });
    this.name = "TooManyRequestsException";
    this.$fault = "client";
    Object.setPrototypeOf(this, TooManyRequestsException2.prototype);
    this.retryAfterSeconds = opts.retryAfterSeconds;
    this.Type = opts.Type;
    this.Reason = opts.Reason;
  }
};
var FunctionUrlAuthType;
(function(FunctionUrlAuthType2) {
  FunctionUrlAuthType2["AWS_IAM"] = "AWS_IAM";
  FunctionUrlAuthType2["NONE"] = "NONE";
})(FunctionUrlAuthType || (FunctionUrlAuthType = {}));
var Architecture;
(function(Architecture2) {
  Architecture2["arm64"] = "arm64";
  Architecture2["x86_64"] = "x86_64";
})(Architecture || (Architecture = {}));
var CodeSigningPolicy;
(function(CodeSigningPolicy2) {
  CodeSigningPolicy2["Enforce"] = "Enforce";
  CodeSigningPolicy2["Warn"] = "Warn";
})(CodeSigningPolicy || (CodeSigningPolicy = {}));
var FunctionResponseType;
(function(FunctionResponseType2) {
  FunctionResponseType2["ReportBatchItemFailures"] = "ReportBatchItemFailures";
})(FunctionResponseType || (FunctionResponseType = {}));
var EndPointType;
(function(EndPointType2) {
  EndPointType2["KAFKA_BOOTSTRAP_SERVERS"] = "KAFKA_BOOTSTRAP_SERVERS";
})(EndPointType || (EndPointType = {}));
var SourceAccessType;
(function(SourceAccessType2) {
  SourceAccessType2["BASIC_AUTH"] = "BASIC_AUTH";
  SourceAccessType2["CLIENT_CERTIFICATE_TLS_AUTH"] = "CLIENT_CERTIFICATE_TLS_AUTH";
  SourceAccessType2["SASL_SCRAM_256_AUTH"] = "SASL_SCRAM_256_AUTH";
  SourceAccessType2["SASL_SCRAM_512_AUTH"] = "SASL_SCRAM_512_AUTH";
  SourceAccessType2["SERVER_ROOT_CA_CERTIFICATE"] = "SERVER_ROOT_CA_CERTIFICATE";
  SourceAccessType2["VIRTUAL_HOST"] = "VIRTUAL_HOST";
  SourceAccessType2["VPC_SECURITY_GROUP"] = "VPC_SECURITY_GROUP";
  SourceAccessType2["VPC_SUBNET"] = "VPC_SUBNET";
})(SourceAccessType || (SourceAccessType = {}));
var EventSourcePosition;
(function(EventSourcePosition2) {
  EventSourcePosition2["AT_TIMESTAMP"] = "AT_TIMESTAMP";
  EventSourcePosition2["LATEST"] = "LATEST";
  EventSourcePosition2["TRIM_HORIZON"] = "TRIM_HORIZON";
})(EventSourcePosition || (EventSourcePosition = {}));
var PackageType;
(function(PackageType2) {
  PackageType2["Image"] = "Image";
  PackageType2["Zip"] = "Zip";
})(PackageType || (PackageType = {}));
var Runtime;
(function(Runtime2) {
  Runtime2["dotnet6"] = "dotnet6";
  Runtime2["dotnetcore10"] = "dotnetcore1.0";
  Runtime2["dotnetcore20"] = "dotnetcore2.0";
  Runtime2["dotnetcore21"] = "dotnetcore2.1";
  Runtime2["dotnetcore31"] = "dotnetcore3.1";
  Runtime2["go1x"] = "go1.x";
  Runtime2["java11"] = "java11";
  Runtime2["java8"] = "java8";
  Runtime2["java8al2"] = "java8.al2";
  Runtime2["nodejs"] = "nodejs";
  Runtime2["nodejs10x"] = "nodejs10.x";
  Runtime2["nodejs12x"] = "nodejs12.x";
  Runtime2["nodejs14x"] = "nodejs14.x";
  Runtime2["nodejs16x"] = "nodejs16.x";
  Runtime2["nodejs18x"] = "nodejs18.x";
  Runtime2["nodejs43"] = "nodejs4.3";
  Runtime2["nodejs43edge"] = "nodejs4.3-edge";
  Runtime2["nodejs610"] = "nodejs6.10";
  Runtime2["nodejs810"] = "nodejs8.10";
  Runtime2["provided"] = "provided";
  Runtime2["providedal2"] = "provided.al2";
  Runtime2["python27"] = "python2.7";
  Runtime2["python36"] = "python3.6";
  Runtime2["python37"] = "python3.7";
  Runtime2["python38"] = "python3.8";
  Runtime2["python39"] = "python3.9";
  Runtime2["ruby25"] = "ruby2.5";
  Runtime2["ruby27"] = "ruby2.7";
})(Runtime || (Runtime = {}));
var SnapStartApplyOn;
(function(SnapStartApplyOn2) {
  SnapStartApplyOn2["None"] = "None";
  SnapStartApplyOn2["PublishedVersions"] = "PublishedVersions";
})(SnapStartApplyOn || (SnapStartApplyOn = {}));
var TracingMode;
(function(TracingMode2) {
  TracingMode2["Active"] = "Active";
  TracingMode2["PassThrough"] = "PassThrough";
})(TracingMode || (TracingMode = {}));
var LastUpdateStatus;
(function(LastUpdateStatus2) {
  LastUpdateStatus2["Failed"] = "Failed";
  LastUpdateStatus2["InProgress"] = "InProgress";
  LastUpdateStatus2["Successful"] = "Successful";
})(LastUpdateStatus || (LastUpdateStatus = {}));
var LastUpdateStatusReasonCode;
(function(LastUpdateStatusReasonCode2) {
  LastUpdateStatusReasonCode2["DisabledKMSKey"] = "DisabledKMSKey";
  LastUpdateStatusReasonCode2["EFSIOError"] = "EFSIOError";
  LastUpdateStatusReasonCode2["EFSMountConnectivityError"] = "EFSMountConnectivityError";
  LastUpdateStatusReasonCode2["EFSMountFailure"] = "EFSMountFailure";
  LastUpdateStatusReasonCode2["EFSMountTimeout"] = "EFSMountTimeout";
  LastUpdateStatusReasonCode2["EniLimitExceeded"] = "EniLimitExceeded";
  LastUpdateStatusReasonCode2["FunctionError"] = "FunctionError";
  LastUpdateStatusReasonCode2["ImageAccessDenied"] = "ImageAccessDenied";
  LastUpdateStatusReasonCode2["ImageDeleted"] = "ImageDeleted";
  LastUpdateStatusReasonCode2["InsufficientRolePermissions"] = "InsufficientRolePermissions";
  LastUpdateStatusReasonCode2["InternalError"] = "InternalError";
  LastUpdateStatusReasonCode2["InvalidConfiguration"] = "InvalidConfiguration";
  LastUpdateStatusReasonCode2["InvalidImage"] = "InvalidImage";
  LastUpdateStatusReasonCode2["InvalidRuntime"] = "InvalidRuntime";
  LastUpdateStatusReasonCode2["InvalidSecurityGroup"] = "InvalidSecurityGroup";
  LastUpdateStatusReasonCode2["InvalidStateKMSKey"] = "InvalidStateKMSKey";
  LastUpdateStatusReasonCode2["InvalidSubnet"] = "InvalidSubnet";
  LastUpdateStatusReasonCode2["InvalidZipFileException"] = "InvalidZipFileException";
  LastUpdateStatusReasonCode2["KMSKeyAccessDenied"] = "KMSKeyAccessDenied";
  LastUpdateStatusReasonCode2["KMSKeyNotFound"] = "KMSKeyNotFound";
  LastUpdateStatusReasonCode2["SubnetOutOfIPAddresses"] = "SubnetOutOfIPAddresses";
})(LastUpdateStatusReasonCode || (LastUpdateStatusReasonCode = {}));
var SnapStartOptimizationStatus;
(function(SnapStartOptimizationStatus2) {
  SnapStartOptimizationStatus2["Off"] = "Off";
  SnapStartOptimizationStatus2["On"] = "On";
})(SnapStartOptimizationStatus || (SnapStartOptimizationStatus = {}));
var State;
(function(State2) {
  State2["Active"] = "Active";
  State2["Failed"] = "Failed";
  State2["Inactive"] = "Inactive";
  State2["Pending"] = "Pending";
})(State || (State = {}));
var StateReasonCode;
(function(StateReasonCode2) {
  StateReasonCode2["Creating"] = "Creating";
  StateReasonCode2["DisabledKMSKey"] = "DisabledKMSKey";
  StateReasonCode2["EFSIOError"] = "EFSIOError";
  StateReasonCode2["EFSMountConnectivityError"] = "EFSMountConnectivityError";
  StateReasonCode2["EFSMountFailure"] = "EFSMountFailure";
  StateReasonCode2["EFSMountTimeout"] = "EFSMountTimeout";
  StateReasonCode2["EniLimitExceeded"] = "EniLimitExceeded";
  StateReasonCode2["FunctionError"] = "FunctionError";
  StateReasonCode2["Idle"] = "Idle";
  StateReasonCode2["ImageAccessDenied"] = "ImageAccessDenied";
  StateReasonCode2["ImageDeleted"] = "ImageDeleted";
  StateReasonCode2["InsufficientRolePermissions"] = "InsufficientRolePermissions";
  StateReasonCode2["InternalError"] = "InternalError";
  StateReasonCode2["InvalidConfiguration"] = "InvalidConfiguration";
  StateReasonCode2["InvalidImage"] = "InvalidImage";
  StateReasonCode2["InvalidRuntime"] = "InvalidRuntime";
  StateReasonCode2["InvalidSecurityGroup"] = "InvalidSecurityGroup";
  StateReasonCode2["InvalidStateKMSKey"] = "InvalidStateKMSKey";
  StateReasonCode2["InvalidSubnet"] = "InvalidSubnet";
  StateReasonCode2["InvalidZipFileException"] = "InvalidZipFileException";
  StateReasonCode2["KMSKeyAccessDenied"] = "KMSKeyAccessDenied";
  StateReasonCode2["KMSKeyNotFound"] = "KMSKeyNotFound";
  StateReasonCode2["Restoring"] = "Restoring";
  StateReasonCode2["SubnetOutOfIPAddresses"] = "SubnetOutOfIPAddresses";
})(StateReasonCode || (StateReasonCode = {}));
var ProvisionedConcurrencyStatusEnum;
(function(ProvisionedConcurrencyStatusEnum2) {
  ProvisionedConcurrencyStatusEnum2["FAILED"] = "FAILED";
  ProvisionedConcurrencyStatusEnum2["IN_PROGRESS"] = "IN_PROGRESS";
  ProvisionedConcurrencyStatusEnum2["READY"] = "READY";
})(ProvisionedConcurrencyStatusEnum || (ProvisionedConcurrencyStatusEnum = {}));
var UpdateRuntimeOn;
(function(UpdateRuntimeOn2) {
  UpdateRuntimeOn2["Auto"] = "Auto";
  UpdateRuntimeOn2["FunctionUpdate"] = "FunctionUpdate";
  UpdateRuntimeOn2["Manual"] = "Manual";
})(UpdateRuntimeOn || (UpdateRuntimeOn = {}));
var EC2AccessDeniedException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "EC2AccessDeniedException",
      $fault: "server",
      ...opts
    });
    this.name = "EC2AccessDeniedException";
    this.$fault = "server";
    Object.setPrototypeOf(this, EC2AccessDeniedException.prototype);
    this.Type = opts.Type;
    this.Message = opts.Message;
  }
};
var EC2ThrottledException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "EC2ThrottledException",
      $fault: "server",
      ...opts
    });
    this.name = "EC2ThrottledException";
    this.$fault = "server";
    Object.setPrototypeOf(this, EC2ThrottledException.prototype);
    this.Type = opts.Type;
    this.Message = opts.Message;
  }
};
var EC2UnexpectedException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "EC2UnexpectedException",
      $fault: "server",
      ...opts
    });
    this.name = "EC2UnexpectedException";
    this.$fault = "server";
    Object.setPrototypeOf(this, EC2UnexpectedException.prototype);
    this.Type = opts.Type;
    this.Message = opts.Message;
    this.EC2ErrorCode = opts.EC2ErrorCode;
  }
};
var EFSIOException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "EFSIOException",
      $fault: "client",
      ...opts
    });
    this.name = "EFSIOException";
    this.$fault = "client";
    Object.setPrototypeOf(this, EFSIOException.prototype);
    this.Type = opts.Type;
    this.Message = opts.Message;
  }
};
var EFSMountConnectivityException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "EFSMountConnectivityException",
      $fault: "client",
      ...opts
    });
    this.name = "EFSMountConnectivityException";
    this.$fault = "client";
    Object.setPrototypeOf(this, EFSMountConnectivityException.prototype);
    this.Type = opts.Type;
    this.Message = opts.Message;
  }
};
var EFSMountFailureException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "EFSMountFailureException",
      $fault: "client",
      ...opts
    });
    this.name = "EFSMountFailureException";
    this.$fault = "client";
    Object.setPrototypeOf(this, EFSMountFailureException.prototype);
    this.Type = opts.Type;
    this.Message = opts.Message;
  }
};
var EFSMountTimeoutException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "EFSMountTimeoutException",
      $fault: "client",
      ...opts
    });
    this.name = "EFSMountTimeoutException";
    this.$fault = "client";
    Object.setPrototypeOf(this, EFSMountTimeoutException.prototype);
    this.Type = opts.Type;
    this.Message = opts.Message;
  }
};
var ENILimitReachedException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "ENILimitReachedException",
      $fault: "server",
      ...opts
    });
    this.name = "ENILimitReachedException";
    this.$fault = "server";
    Object.setPrototypeOf(this, ENILimitReachedException.prototype);
    this.Type = opts.Type;
    this.Message = opts.Message;
  }
};
var InvalidRequestContentException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "InvalidRequestContentException",
      $fault: "client",
      ...opts
    });
    this.name = "InvalidRequestContentException";
    this.$fault = "client";
    Object.setPrototypeOf(this, InvalidRequestContentException.prototype);
    this.Type = opts.Type;
  }
};
var InvalidRuntimeException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "InvalidRuntimeException",
      $fault: "server",
      ...opts
    });
    this.name = "InvalidRuntimeException";
    this.$fault = "server";
    Object.setPrototypeOf(this, InvalidRuntimeException.prototype);
    this.Type = opts.Type;
    this.Message = opts.Message;
  }
};
var InvalidSecurityGroupIDException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "InvalidSecurityGroupIDException",
      $fault: "server",
      ...opts
    });
    this.name = "InvalidSecurityGroupIDException";
    this.$fault = "server";
    Object.setPrototypeOf(this, InvalidSecurityGroupIDException.prototype);
    this.Type = opts.Type;
    this.Message = opts.Message;
  }
};
var InvalidSubnetIDException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "InvalidSubnetIDException",
      $fault: "server",
      ...opts
    });
    this.name = "InvalidSubnetIDException";
    this.$fault = "server";
    Object.setPrototypeOf(this, InvalidSubnetIDException.prototype);
    this.Type = opts.Type;
    this.Message = opts.Message;
  }
};
var InvalidZipFileException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "InvalidZipFileException",
      $fault: "server",
      ...opts
    });
    this.name = "InvalidZipFileException";
    this.$fault = "server";
    Object.setPrototypeOf(this, InvalidZipFileException.prototype);
    this.Type = opts.Type;
    this.Message = opts.Message;
  }
};
var InvocationType;
(function(InvocationType2) {
  InvocationType2["DryRun"] = "DryRun";
  InvocationType2["Event"] = "Event";
  InvocationType2["RequestResponse"] = "RequestResponse";
})(InvocationType || (InvocationType = {}));
var LogType;
(function(LogType2) {
  LogType2["None"] = "None";
  LogType2["Tail"] = "Tail";
})(LogType || (LogType = {}));
var KMSAccessDeniedException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "KMSAccessDeniedException",
      $fault: "server",
      ...opts
    });
    this.name = "KMSAccessDeniedException";
    this.$fault = "server";
    Object.setPrototypeOf(this, KMSAccessDeniedException.prototype);
    this.Type = opts.Type;
    this.Message = opts.Message;
  }
};
var KMSDisabledException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "KMSDisabledException",
      $fault: "server",
      ...opts
    });
    this.name = "KMSDisabledException";
    this.$fault = "server";
    Object.setPrototypeOf(this, KMSDisabledException.prototype);
    this.Type = opts.Type;
    this.Message = opts.Message;
  }
};
var KMSInvalidStateException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "KMSInvalidStateException",
      $fault: "server",
      ...opts
    });
    this.name = "KMSInvalidStateException";
    this.$fault = "server";
    Object.setPrototypeOf(this, KMSInvalidStateException.prototype);
    this.Type = opts.Type;
    this.Message = opts.Message;
  }
};
var KMSNotFoundException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "KMSNotFoundException",
      $fault: "server",
      ...opts
    });
    this.name = "KMSNotFoundException";
    this.$fault = "server";
    Object.setPrototypeOf(this, KMSNotFoundException.prototype);
    this.Type = opts.Type;
    this.Message = opts.Message;
  }
};
var RequestTooLargeException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "RequestTooLargeException",
      $fault: "client",
      ...opts
    });
    this.name = "RequestTooLargeException";
    this.$fault = "client";
    Object.setPrototypeOf(this, RequestTooLargeException.prototype);
    this.Type = opts.Type;
  }
};
var ResourceNotReadyException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "ResourceNotReadyException",
      $fault: "server",
      ...opts
    });
    this.name = "ResourceNotReadyException";
    this.$fault = "server";
    Object.setPrototypeOf(this, ResourceNotReadyException.prototype);
    this.Type = opts.Type;
  }
};
var SnapStartException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "SnapStartException",
      $fault: "client",
      ...opts
    });
    this.name = "SnapStartException";
    this.$fault = "client";
    Object.setPrototypeOf(this, SnapStartException.prototype);
    this.Type = opts.Type;
    this.Message = opts.Message;
  }
};
var SnapStartNotReadyException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "SnapStartNotReadyException",
      $fault: "client",
      ...opts
    });
    this.name = "SnapStartNotReadyException";
    this.$fault = "client";
    Object.setPrototypeOf(this, SnapStartNotReadyException.prototype);
    this.Type = opts.Type;
    this.Message = opts.Message;
  }
};
var SnapStartTimeoutException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "SnapStartTimeoutException",
      $fault: "client",
      ...opts
    });
    this.name = "SnapStartTimeoutException";
    this.$fault = "client";
    Object.setPrototypeOf(this, SnapStartTimeoutException.prototype);
    this.Type = opts.Type;
    this.Message = opts.Message;
  }
};
var SubnetIPAddressLimitReachedException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "SubnetIPAddressLimitReachedException",
      $fault: "server",
      ...opts
    });
    this.name = "SubnetIPAddressLimitReachedException";
    this.$fault = "server";
    Object.setPrototypeOf(this, SubnetIPAddressLimitReachedException.prototype);
    this.Type = opts.Type;
    this.Message = opts.Message;
  }
};
var UnsupportedMediaTypeException = class extends LambdaServiceException {
  constructor(opts) {
    super({
      name: "UnsupportedMediaTypeException",
      $fault: "client",
      ...opts
    });
    this.name = "UnsupportedMediaTypeException";
    this.$fault = "client";
    Object.setPrototypeOf(this, UnsupportedMediaTypeException.prototype);
    this.Type = opts.Type;
  }
};
var FunctionVersion;
(function(FunctionVersion2) {
  FunctionVersion2["ALL"] = "ALL";
})(FunctionVersion || (FunctionVersion = {}));
var InvocationRequestFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Payload && { Payload: SENSITIVE_STRING }
});
var InvocationResponseFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Payload && { Payload: SENSITIVE_STRING }
});

// ../../node_modules/@aws-sdk/client-lambda/dist-es/protocols/Aws_restJson1.js
var serializeAws_restJson1InvokeCommand = async (input, context) => {
  const { hostname, protocol = "https", port, path: basePath } = await context.endpoint();
  const headers = map4({}, isSerializableHeaderValue2, {
    "content-type": "application/octet-stream",
    "x-amz-invocation-type": input.InvocationType,
    "x-amz-log-type": input.LogType,
    "x-amz-client-context": input.ClientContext
  });
  let resolvedPath2 = `${basePath?.endsWith("/") ? basePath.slice(0, -1) : basePath || ""}/2015-03-31/functions/{FunctionName}/invocations`;
  resolvedPath2 = resolvedPath(resolvedPath2, input, "FunctionName", () => input.FunctionName, "{FunctionName}", false);
  const query = map4({
    Qualifier: [, input.Qualifier]
  });
  let body;
  if (input.Payload !== void 0) {
    body = input.Payload;
  }
  return new HttpRequest({
    protocol,
    hostname,
    port,
    method: "POST",
    headers,
    path: resolvedPath2,
    query,
    body
  });
};
var deserializeAws_restJson1InvokeCommand = async (output, context) => {
  if (output.statusCode !== 200 && output.statusCode >= 300) {
    return deserializeAws_restJson1InvokeCommandError(output, context);
  }
  const contents = map4({
    $metadata: deserializeMetadata6(output),
    FunctionError: [, output.headers["x-amz-function-error"]],
    LogResult: [, output.headers["x-amz-log-result"]],
    ExecutedVersion: [, output.headers["x-amz-executed-version"]]
  });
  const data = await collectBody5(output.body, context);
  contents.Payload = data;
  map4(contents, {
    StatusCode: [, output.statusCode]
  });
  return contents;
};
var deserializeAws_restJson1InvokeCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody5(output.body, context)
  };
  const errorCode = loadRestJsonErrorCode4(output, parsedOutput.body);
  switch (errorCode) {
    case "EC2AccessDeniedException":
    case "com.amazonaws.lambda#EC2AccessDeniedException":
      throw await deserializeAws_restJson1EC2AccessDeniedExceptionResponse(parsedOutput, context);
    case "EC2ThrottledException":
    case "com.amazonaws.lambda#EC2ThrottledException":
      throw await deserializeAws_restJson1EC2ThrottledExceptionResponse(parsedOutput, context);
    case "EC2UnexpectedException":
    case "com.amazonaws.lambda#EC2UnexpectedException":
      throw await deserializeAws_restJson1EC2UnexpectedExceptionResponse(parsedOutput, context);
    case "EFSIOException":
    case "com.amazonaws.lambda#EFSIOException":
      throw await deserializeAws_restJson1EFSIOExceptionResponse(parsedOutput, context);
    case "EFSMountConnectivityException":
    case "com.amazonaws.lambda#EFSMountConnectivityException":
      throw await deserializeAws_restJson1EFSMountConnectivityExceptionResponse(parsedOutput, context);
    case "EFSMountFailureException":
    case "com.amazonaws.lambda#EFSMountFailureException":
      throw await deserializeAws_restJson1EFSMountFailureExceptionResponse(parsedOutput, context);
    case "EFSMountTimeoutException":
    case "com.amazonaws.lambda#EFSMountTimeoutException":
      throw await deserializeAws_restJson1EFSMountTimeoutExceptionResponse(parsedOutput, context);
    case "ENILimitReachedException":
    case "com.amazonaws.lambda#ENILimitReachedException":
      throw await deserializeAws_restJson1ENILimitReachedExceptionResponse(parsedOutput, context);
    case "InvalidParameterValueException":
    case "com.amazonaws.lambda#InvalidParameterValueException":
      throw await deserializeAws_restJson1InvalidParameterValueExceptionResponse(parsedOutput, context);
    case "InvalidRequestContentException":
    case "com.amazonaws.lambda#InvalidRequestContentException":
      throw await deserializeAws_restJson1InvalidRequestContentExceptionResponse(parsedOutput, context);
    case "InvalidRuntimeException":
    case "com.amazonaws.lambda#InvalidRuntimeException":
      throw await deserializeAws_restJson1InvalidRuntimeExceptionResponse(parsedOutput, context);
    case "InvalidSecurityGroupIDException":
    case "com.amazonaws.lambda#InvalidSecurityGroupIDException":
      throw await deserializeAws_restJson1InvalidSecurityGroupIDExceptionResponse(parsedOutput, context);
    case "InvalidSubnetIDException":
    case "com.amazonaws.lambda#InvalidSubnetIDException":
      throw await deserializeAws_restJson1InvalidSubnetIDExceptionResponse(parsedOutput, context);
    case "InvalidZipFileException":
    case "com.amazonaws.lambda#InvalidZipFileException":
      throw await deserializeAws_restJson1InvalidZipFileExceptionResponse(parsedOutput, context);
    case "KMSAccessDeniedException":
    case "com.amazonaws.lambda#KMSAccessDeniedException":
      throw await deserializeAws_restJson1KMSAccessDeniedExceptionResponse(parsedOutput, context);
    case "KMSDisabledException":
    case "com.amazonaws.lambda#KMSDisabledException":
      throw await deserializeAws_restJson1KMSDisabledExceptionResponse(parsedOutput, context);
    case "KMSInvalidStateException":
    case "com.amazonaws.lambda#KMSInvalidStateException":
      throw await deserializeAws_restJson1KMSInvalidStateExceptionResponse(parsedOutput, context);
    case "KMSNotFoundException":
    case "com.amazonaws.lambda#KMSNotFoundException":
      throw await deserializeAws_restJson1KMSNotFoundExceptionResponse(parsedOutput, context);
    case "RequestTooLargeException":
    case "com.amazonaws.lambda#RequestTooLargeException":
      throw await deserializeAws_restJson1RequestTooLargeExceptionResponse(parsedOutput, context);
    case "ResourceConflictException":
    case "com.amazonaws.lambda#ResourceConflictException":
      throw await deserializeAws_restJson1ResourceConflictExceptionResponse(parsedOutput, context);
    case "ResourceNotFoundException":
    case "com.amazonaws.lambda#ResourceNotFoundException":
      throw await deserializeAws_restJson1ResourceNotFoundExceptionResponse2(parsedOutput, context);
    case "ResourceNotReadyException":
    case "com.amazonaws.lambda#ResourceNotReadyException":
      throw await deserializeAws_restJson1ResourceNotReadyExceptionResponse(parsedOutput, context);
    case "ServiceException":
    case "com.amazonaws.lambda#ServiceException":
      throw await deserializeAws_restJson1ServiceExceptionResponse(parsedOutput, context);
    case "SnapStartException":
    case "com.amazonaws.lambda#SnapStartException":
      throw await deserializeAws_restJson1SnapStartExceptionResponse(parsedOutput, context);
    case "SnapStartNotReadyException":
    case "com.amazonaws.lambda#SnapStartNotReadyException":
      throw await deserializeAws_restJson1SnapStartNotReadyExceptionResponse(parsedOutput, context);
    case "SnapStartTimeoutException":
    case "com.amazonaws.lambda#SnapStartTimeoutException":
      throw await deserializeAws_restJson1SnapStartTimeoutExceptionResponse(parsedOutput, context);
    case "SubnetIPAddressLimitReachedException":
    case "com.amazonaws.lambda#SubnetIPAddressLimitReachedException":
      throw await deserializeAws_restJson1SubnetIPAddressLimitReachedExceptionResponse(parsedOutput, context);
    case "TooManyRequestsException":
    case "com.amazonaws.lambda#TooManyRequestsException":
      throw await deserializeAws_restJson1TooManyRequestsExceptionResponse2(parsedOutput, context);
    case "UnsupportedMediaTypeException":
    case "com.amazonaws.lambda#UnsupportedMediaTypeException":
      throw await deserializeAws_restJson1UnsupportedMediaTypeExceptionResponse(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody,
        exceptionCtor: LambdaServiceException,
        errorCode
      });
  }
};
var map4 = map;
var deserializeAws_restJson1EC2AccessDeniedExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  const exception = new EC2AccessDeniedException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1EC2ThrottledExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  const exception = new EC2ThrottledException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1EC2UnexpectedExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.EC2ErrorCode != null) {
    contents.EC2ErrorCode = expectString(data.EC2ErrorCode);
  }
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  const exception = new EC2UnexpectedException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1EFSIOExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  const exception = new EFSIOException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1EFSMountConnectivityExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  const exception = new EFSMountConnectivityException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1EFSMountFailureExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  const exception = new EFSMountFailureException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1EFSMountTimeoutExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  const exception = new EFSMountTimeoutException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1ENILimitReachedExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  const exception = new ENILimitReachedException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1InvalidParameterValueExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new InvalidParameterValueException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1InvalidRequestContentExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new InvalidRequestContentException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1InvalidRuntimeExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  const exception = new InvalidRuntimeException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1InvalidSecurityGroupIDExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  const exception = new InvalidSecurityGroupIDException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1InvalidSubnetIDExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  const exception = new InvalidSubnetIDException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1InvalidZipFileExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  const exception = new InvalidZipFileException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1KMSAccessDeniedExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  const exception = new KMSAccessDeniedException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1KMSDisabledExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  const exception = new KMSDisabledException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1KMSInvalidStateExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  const exception = new KMSInvalidStateException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1KMSNotFoundExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  const exception = new KMSNotFoundException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1RequestTooLargeExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new RequestTooLargeException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1ResourceConflictExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new ResourceConflictException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1ResourceNotFoundExceptionResponse2 = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  const exception = new ResourceNotFoundException3({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1ResourceNotReadyExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new ResourceNotReadyException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1ServiceExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  const exception = new ServiceException2({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1SnapStartExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  const exception = new SnapStartException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1SnapStartNotReadyExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  const exception = new SnapStartNotReadyException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1SnapStartTimeoutExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  const exception = new SnapStartTimeoutException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1SubnetIPAddressLimitReachedExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  const exception = new SubnetIPAddressLimitReachedException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1TooManyRequestsExceptionResponse2 = async (parsedOutput, context) => {
  const contents = map4({
    retryAfterSeconds: [, parsedOutput.headers["retry-after"]]
  });
  const data = parsedOutput.body;
  if (data.Reason != null) {
    contents.Reason = expectString(data.Reason);
  }
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new TooManyRequestsException2({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1UnsupportedMediaTypeExceptionResponse = async (parsedOutput, context) => {
  const contents = map4({});
  const data = parsedOutput.body;
  if (data.Type != null) {
    contents.Type = expectString(data.Type);
  }
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new UnsupportedMediaTypeException({
    $metadata: deserializeMetadata6(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeMetadata6 = (output) => ({
  httpStatusCode: output.statusCode,
  requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
  extendedRequestId: output.headers["x-amz-id-2"],
  cfId: output.headers["x-amz-cf-id"]
});
var collectBody5 = (streamBody = new Uint8Array(), context) => {
  if (streamBody instanceof Uint8Array) {
    return Promise.resolve(streamBody);
  }
  return context.streamCollector(streamBody) || Promise.resolve(new Uint8Array());
};
var collectBodyString5 = (streamBody, context) => collectBody5(streamBody, context).then((body) => context.utf8Encoder(body));
var isSerializableHeaderValue2 = (value) => value !== void 0 && value !== null && value !== "" && (!Object.getOwnPropertyNames(value).includes("length") || value.length != 0) && (!Object.getOwnPropertyNames(value).includes("size") || value.size != 0);
var parseBody5 = (streamBody, context) => collectBodyString5(streamBody, context).then((encoded) => {
  if (encoded.length) {
    return JSON.parse(encoded);
  }
  return {};
});
var parseErrorBody5 = async (errorBody, context) => {
  const value = await parseBody5(errorBody, context);
  value.message = value.message ?? value.Message;
  return value;
};
var loadRestJsonErrorCode4 = (output, data) => {
  const findKey = (object, key) => Object.keys(object).find((k13) => k13.toLowerCase() === key.toLowerCase());
  const sanitizeErrorCode = (rawValue) => {
    let cleanValue = rawValue;
    if (typeof cleanValue === "number") {
      cleanValue = cleanValue.toString();
    }
    if (cleanValue.indexOf(",") >= 0) {
      cleanValue = cleanValue.split(",")[0];
    }
    if (cleanValue.indexOf(":") >= 0) {
      cleanValue = cleanValue.split(":")[0];
    }
    if (cleanValue.indexOf("#") >= 0) {
      cleanValue = cleanValue.split("#")[1];
    }
    return cleanValue;
  };
  const headerKey = findKey(output.headers, "x-amzn-errortype");
  if (headerKey !== void 0) {
    return sanitizeErrorCode(output.headers[headerKey]);
  }
  if (data.code !== void 0) {
    return sanitizeErrorCode(data.code);
  }
  if (data["__type"] !== void 0) {
    return sanitizeErrorCode(data["__type"]);
  }
};

// ../../node_modules/@aws-sdk/client-lambda/dist-es/commands/InvokeCommand.js
var InvokeCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, InvokeCommand.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "LambdaClient";
    const commandName = "InvokeCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: InvocationRequestFilterSensitiveLog,
      outputFilterSensitiveLog: InvocationResponseFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_restJson1InvokeCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_restJson1InvokeCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-lambda/dist-es/endpoint/EndpointParameters.js
var resolveClientEndpointParameters5 = (options) => {
  return {
    ...options,
    useDualstackEndpoint: options.useDualstackEndpoint ?? false,
    useFipsEndpoint: options.useFipsEndpoint ?? false,
    defaultSigningName: "lambda"
  };
};

// ../../node_modules/@aws-sdk/client-lambda/package.json
var package_default5 = {
  name: "@aws-sdk/client-lambda",
  description: "AWS SDK for JavaScript Lambda Client for Node.js, Browser and React Native",
  version: "3.256.0",
  scripts: {
    build: "concurrently 'yarn:build:cjs' 'yarn:build:es' 'yarn:build:types'",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "build:docs": "typedoc",
    "build:es": "tsc -p tsconfig.es.json",
    "build:include:deps": "lerna run --scope $npm_package_name --include-dependencies build",
    "build:types": "tsc -p tsconfig.types.json",
    "build:types:downlevel": "downlevel-dts dist-types dist-types/ts3.4",
    clean: "rimraf ./dist-* && rimraf *.tsbuildinfo",
    "generate:client": "node ../../scripts/generate-clients/single-service --solo lambda"
  },
  main: "./dist-cjs/index.js",
  types: "./dist-types/index.d.ts",
  module: "./dist-es/index.js",
  sideEffects: false,
  dependencies: {
    "@aws-crypto/sha256-browser": "3.0.0",
    "@aws-crypto/sha256-js": "3.0.0",
    "@aws-sdk/client-sts": "3.256.0",
    "@aws-sdk/config-resolver": "3.254.0",
    "@aws-sdk/credential-provider-node": "3.256.0",
    "@aws-sdk/fetch-http-handler": "3.254.0",
    "@aws-sdk/hash-node": "3.254.0",
    "@aws-sdk/invalid-dependency": "3.254.0",
    "@aws-sdk/middleware-content-length": "3.254.0",
    "@aws-sdk/middleware-endpoint": "3.254.0",
    "@aws-sdk/middleware-host-header": "3.254.0",
    "@aws-sdk/middleware-logger": "3.254.0",
    "@aws-sdk/middleware-recursion-detection": "3.254.0",
    "@aws-sdk/middleware-retry": "3.254.0",
    "@aws-sdk/middleware-serde": "3.254.0",
    "@aws-sdk/middleware-signing": "3.254.0",
    "@aws-sdk/middleware-stack": "3.254.0",
    "@aws-sdk/middleware-user-agent": "3.254.0",
    "@aws-sdk/node-config-provider": "3.254.0",
    "@aws-sdk/node-http-handler": "3.254.0",
    "@aws-sdk/protocol-http": "3.254.0",
    "@aws-sdk/smithy-client": "3.254.0",
    "@aws-sdk/types": "3.254.0",
    "@aws-sdk/url-parser": "3.254.0",
    "@aws-sdk/util-base64": "3.208.0",
    "@aws-sdk/util-body-length-browser": "3.188.0",
    "@aws-sdk/util-body-length-node": "3.208.0",
    "@aws-sdk/util-defaults-mode-browser": "3.254.0",
    "@aws-sdk/util-defaults-mode-node": "3.254.0",
    "@aws-sdk/util-endpoints": "3.254.0",
    "@aws-sdk/util-retry": "3.254.0",
    "@aws-sdk/util-user-agent-browser": "3.254.0",
    "@aws-sdk/util-user-agent-node": "3.254.0",
    "@aws-sdk/util-utf8-browser": "3.188.0",
    "@aws-sdk/util-utf8-node": "3.208.0",
    "@aws-sdk/util-waiter": "3.254.0",
    tslib: "^2.3.1"
  },
  devDependencies: {
    "@aws-sdk/service-client-documentation-generator": "3.208.0",
    "@tsconfig/node14": "1.0.3",
    "@types/node": "^14.14.31",
    concurrently: "7.0.0",
    "downlevel-dts": "0.10.1",
    rimraf: "3.0.2",
    typedoc: "0.19.2",
    typescript: "~4.6.2"
  },
  overrides: {
    typedoc: {
      typescript: "~4.6.2"
    }
  },
  engines: {
    node: ">=14.0.0"
  },
  typesVersions: {
    "<4.0": {
      "dist-types/*": [
        "dist-types/ts3.4/*"
      ]
    }
  },
  files: [
    "dist-*"
  ],
  author: {
    name: "AWS SDK for JavaScript Team",
    url: "https://aws.amazon.com/javascript/"
  },
  license: "Apache-2.0",
  browser: {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.browser"
  },
  "react-native": {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.native"
  },
  homepage: "https://github.com/aws/aws-sdk-js-v3/tree/main/clients/client-lambda",
  repository: {
    type: "git",
    url: "https://github.com/aws/aws-sdk-js-v3.git",
    directory: "clients/client-lambda"
  }
};

// ../../node_modules/@aws-sdk/client-lambda/dist-es/endpoint/ruleset.js
var q5 = "fn";
var r5 = "argv";
var s5 = "ref";
var a5 = true;
var b5 = false;
var c5 = "String";
var d5 = "PartitionResult";
var e5 = "tree";
var f5 = "error";
var g5 = "endpoint";
var h5 = { "required": true, "default": false, "type": "Boolean" };
var i5 = { [s5]: "Endpoint" };
var j5 = { [q5]: "booleanEquals", [r5]: [{ [s5]: "UseFIPS" }, true] };
var k5 = { [q5]: "booleanEquals", [r5]: [{ [s5]: "UseDualStack" }, true] };
var l5 = {};
var m5 = { [q5]: "booleanEquals", [r5]: [true, { [q5]: "getAttr", [r5]: [{ [s5]: d5 }, "supportsFIPS"] }] };
var n5 = { [q5]: "booleanEquals", [r5]: [true, { [q5]: "getAttr", [r5]: [{ [s5]: d5 }, "supportsDualStack"] }] };
var o5 = [j5];
var p5 = [k5];
var _data5 = { version: "1.0", parameters: { Region: { required: a5, type: c5 }, UseDualStack: h5, UseFIPS: h5, Endpoint: { required: b5, type: c5 } }, rules: [{ conditions: [{ [q5]: "aws.partition", [r5]: [{ [s5]: "Region" }], assign: d5 }], type: e5, rules: [{ conditions: [{ [q5]: "isSet", [r5]: [i5] }], type: e5, rules: [{ conditions: o5, error: "Invalid Configuration: FIPS and custom endpoint are not supported", type: f5 }, { type: e5, rules: [{ conditions: p5, error: "Invalid Configuration: Dualstack and custom endpoint are not supported", type: f5 }, { endpoint: { url: i5, properties: l5, headers: l5 }, type: g5 }] }] }, { conditions: [j5, k5], type: e5, rules: [{ conditions: [m5, n5], type: e5, rules: [{ endpoint: { url: "https://lambda-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: l5, headers: l5 }, type: g5 }] }, { error: "FIPS and DualStack are enabled, but this partition does not support one or both", type: f5 }] }, { conditions: o5, type: e5, rules: [{ conditions: [m5], type: e5, rules: [{ type: e5, rules: [{ endpoint: { url: "https://lambda-fips.{Region}.{PartitionResult#dnsSuffix}", properties: l5, headers: l5 }, type: g5 }] }] }, { error: "FIPS is enabled but this partition does not support FIPS", type: f5 }] }, { conditions: p5, type: e5, rules: [{ conditions: [n5], type: e5, rules: [{ endpoint: { url: "https://lambda.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: l5, headers: l5 }, type: g5 }] }, { error: "DualStack is enabled but this partition does not support DualStack", type: f5 }] }, { endpoint: { url: "https://lambda.{Region}.{PartitionResult#dnsSuffix}", properties: l5, headers: l5 }, type: g5 }] }] };
var ruleSet5 = _data5;

// ../../node_modules/@aws-sdk/client-lambda/dist-es/endpoint/endpointResolver.js
var defaultEndpointResolver5 = (endpointParams, context = {}) => {
  return resolveEndpoint(ruleSet5, {
    endpointParams,
    logger: context.logger
  });
};

// ../../node_modules/@aws-sdk/client-lambda/dist-es/runtimeConfig.shared.js
var getRuntimeConfig9 = (config) => ({
  apiVersion: "2015-03-31",
  base64Decoder: config?.base64Decoder ?? fromBase64,
  base64Encoder: config?.base64Encoder ?? toBase64,
  disableHostPrefix: config?.disableHostPrefix ?? false,
  endpointProvider: config?.endpointProvider ?? defaultEndpointResolver5,
  logger: config?.logger ?? new NoOpLogger(),
  serviceId: config?.serviceId ?? "Lambda",
  urlParser: config?.urlParser ?? parseUrl
});

// ../../node_modules/@aws-sdk/client-lambda/dist-es/runtimeConfig.js
var getRuntimeConfig10 = (config) => {
  emitWarningIfUnsupportedVersion(process.version);
  const defaultsMode = resolveDefaultsModeConfig(config);
  const defaultConfigProvider = () => defaultsMode().then(loadConfigsForDefaultMode);
  const clientSharedValues = getRuntimeConfig9(config);
  return {
    ...clientSharedValues,
    ...config,
    runtime: "node",
    defaultsMode,
    bodyLengthChecker: config?.bodyLengthChecker ?? calculateBodyLength,
    credentialDefaultProvider: config?.credentialDefaultProvider ?? decorateDefaultCredentialProvider2(defaultProvider),
    defaultUserAgentProvider: config?.defaultUserAgentProvider ?? defaultUserAgent({ serviceId: clientSharedValues.serviceId, clientVersion: package_default5.version }),
    maxAttempts: config?.maxAttempts ?? loadConfig(NODE_MAX_ATTEMPT_CONFIG_OPTIONS),
    region: config?.region ?? loadConfig(NODE_REGION_CONFIG_OPTIONS, NODE_REGION_CONFIG_FILE_OPTIONS),
    requestHandler: config?.requestHandler ?? new NodeHttpHandler(defaultConfigProvider),
    retryMode: config?.retryMode ?? loadConfig({
      ...NODE_RETRY_MODE_CONFIG_OPTIONS,
      default: async () => (await defaultConfigProvider()).retryMode || DEFAULT_RETRY_MODE
    }),
    sha256: config?.sha256 ?? Hash.bind(null, "sha256"),
    streamCollector: config?.streamCollector ?? streamCollector,
    useDualstackEndpoint: config?.useDualstackEndpoint ?? loadConfig(NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS),
    useFipsEndpoint: config?.useFipsEndpoint ?? loadConfig(NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS),
    utf8Decoder: config?.utf8Decoder ?? fromUtf82,
    utf8Encoder: config?.utf8Encoder ?? toUtf8
  };
};

// ../../node_modules/@aws-sdk/client-lambda/dist-es/LambdaClient.js
var LambdaClient = class extends Client {
  constructor(configuration) {
    const _config_0 = getRuntimeConfig10(configuration);
    const _config_1 = resolveClientEndpointParameters5(_config_0);
    const _config_2 = resolveRegionConfig(_config_1);
    const _config_3 = resolveEndpointConfig(_config_2);
    const _config_4 = resolveRetryConfig(_config_3);
    const _config_5 = resolveHostHeaderConfig(_config_4);
    const _config_6 = resolveAwsAuthConfig(_config_5);
    const _config_7 = resolveUserAgentConfig(_config_6);
    super(_config_7);
    this.config = _config_7;
    this.middlewareStack.use(getRetryPlugin(this.config));
    this.middlewareStack.use(getContentLengthPlugin(this.config));
    this.middlewareStack.use(getHostHeaderPlugin(this.config));
    this.middlewareStack.use(getLoggerPlugin(this.config));
    this.middlewareStack.use(getRecursionDetectionPlugin(this.config));
    this.middlewareStack.use(getAwsAuthPlugin(this.config));
    this.middlewareStack.use(getUserAgentPlugin(this.config));
  }
  destroy() {
    super.destroy();
  }
};

// src/mocks/lambda.ts
var import_aws_sdk_client_mock2 = require("aws-sdk-client-mock");
var mockLambda = (lambdas) => {
  const list = mockObjectKeys(lambdas);
  (0, import_aws_sdk_client_mock2.mockClient)(LambdaClient).on(InvokeCommand).callsFake(async (input) => {
    const name = input.FunctionName || "";
    const type = input.InvocationType || "RequestResponse";
    const payload = input.Payload ? JSON.parse(toUtf8(input.Payload)) : void 0;
    const callback = list[name];
    if (!callback) {
      throw new TypeError(`Lambda mock function not defined for: ${name}`);
    }
    const result = await asyncCall(callback, payload);
    if (type === "RequestResponse" && result) {
      return {
        Payload: fromUtf82(JSON.stringify(result))
      };
    }
    return {
      Payload: void 0
    };
  });
  beforeEach(() => {
    Object.values(list).forEach((fn) => {
      fn.mockClear();
    });
  });
  return list;
};

// ../../node_modules/@aws-sdk/client-iot/dist-es/models/IoTServiceException.js
var IoTServiceException = class extends ServiceException {
  constructor(options) {
    super(options);
    Object.setPrototypeOf(this, IoTServiceException.prototype);
  }
};

// ../../node_modules/@aws-sdk/client-iot/dist-es/models/models_0.js
var AbortAction;
(function(AbortAction2) {
  AbortAction2["CANCEL"] = "CANCEL";
})(AbortAction || (AbortAction = {}));
var JobExecutionFailureType;
(function(JobExecutionFailureType2) {
  JobExecutionFailureType2["ALL"] = "ALL";
  JobExecutionFailureType2["FAILED"] = "FAILED";
  JobExecutionFailureType2["REJECTED"] = "REJECTED";
  JobExecutionFailureType2["TIMED_OUT"] = "TIMED_OUT";
})(JobExecutionFailureType || (JobExecutionFailureType = {}));
var InternalFailureException = class extends IoTServiceException {
  constructor(opts) {
    super({
      name: "InternalFailureException",
      $fault: "server",
      ...opts
    });
    this.name = "InternalFailureException";
    this.$fault = "server";
    Object.setPrototypeOf(this, InternalFailureException.prototype);
  }
};
var InvalidRequestException3 = class extends IoTServiceException {
  constructor(opts) {
    super({
      name: "InvalidRequestException",
      $fault: "client",
      ...opts
    });
    this.name = "InvalidRequestException";
    this.$fault = "client";
    Object.setPrototypeOf(this, InvalidRequestException3.prototype);
  }
};
var ThrottlingException = class extends IoTServiceException {
  constructor(opts) {
    super({
      name: "ThrottlingException",
      $fault: "client",
      ...opts
    });
    this.name = "ThrottlingException";
    this.$fault = "client";
    Object.setPrototypeOf(this, ThrottlingException.prototype);
  }
};
var UnauthorizedException2 = class extends IoTServiceException {
  constructor(opts) {
    super({
      name: "UnauthorizedException",
      $fault: "client",
      ...opts
    });
    this.name = "UnauthorizedException";
    this.$fault = "client";
    Object.setPrototypeOf(this, UnauthorizedException2.prototype);
  }
};
var DynamoKeyType;
(function(DynamoKeyType2) {
  DynamoKeyType2["NUMBER"] = "NUMBER";
  DynamoKeyType2["STRING"] = "STRING";
})(DynamoKeyType || (DynamoKeyType = {}));
var AssetPropertyVariant;
(function(AssetPropertyVariant2) {
  AssetPropertyVariant2.visit = (value, visitor) => {
    if (value.stringValue !== void 0)
      return visitor.stringValue(value.stringValue);
    if (value.integerValue !== void 0)
      return visitor.integerValue(value.integerValue);
    if (value.doubleValue !== void 0)
      return visitor.doubleValue(value.doubleValue);
    if (value.booleanValue !== void 0)
      return visitor.booleanValue(value.booleanValue);
    return visitor._(value.$unknown[0], value.$unknown[1]);
  };
})(AssetPropertyVariant || (AssetPropertyVariant = {}));
var CannedAccessControlList;
(function(CannedAccessControlList2) {
  CannedAccessControlList2["AuthenticatedRead"] = "authenticated-read";
  CannedAccessControlList2["AwsExecRead"] = "aws-exec-read";
  CannedAccessControlList2["BucketOwnerFullControl"] = "bucket-owner-full-control";
  CannedAccessControlList2["BucketOwnerRead"] = "bucket-owner-read";
  CannedAccessControlList2["LogDeliveryWrite"] = "log-delivery-write";
  CannedAccessControlList2["Private"] = "private";
  CannedAccessControlList2["PublicRead"] = "public-read";
  CannedAccessControlList2["PublicReadWrite"] = "public-read-write";
})(CannedAccessControlList || (CannedAccessControlList = {}));
var MessageFormat;
(function(MessageFormat2) {
  MessageFormat2["JSON"] = "JSON";
  MessageFormat2["RAW"] = "RAW";
})(MessageFormat || (MessageFormat = {}));
var ActionType;
(function(ActionType2) {
  ActionType2["CONNECT"] = "CONNECT";
  ActionType2["PUBLISH"] = "PUBLISH";
  ActionType2["RECEIVE"] = "RECEIVE";
  ActionType2["SUBSCRIBE"] = "SUBSCRIBE";
})(ActionType || (ActionType = {}));
var ComparisonOperator2;
(function(ComparisonOperator3) {
  ComparisonOperator3["GREATER_THAN"] = "greater-than";
  ComparisonOperator3["GREATER_THAN_EQUALS"] = "greater-than-equals";
  ComparisonOperator3["IN_CIDR_SET"] = "in-cidr-set";
  ComparisonOperator3["IN_PORT_SET"] = "in-port-set";
  ComparisonOperator3["IN_SET"] = "in-set";
  ComparisonOperator3["LESS_THAN"] = "less-than";
  ComparisonOperator3["LESS_THAN_EQUALS"] = "less-than-equals";
  ComparisonOperator3["NOT_IN_CIDR_SET"] = "not-in-cidr-set";
  ComparisonOperator3["NOT_IN_PORT_SET"] = "not-in-port-set";
  ComparisonOperator3["NOT_IN_SET"] = "not-in-set";
})(ComparisonOperator2 || (ComparisonOperator2 = {}));
var ConfidenceLevel;
(function(ConfidenceLevel2) {
  ConfidenceLevel2["HIGH"] = "HIGH";
  ConfidenceLevel2["LOW"] = "LOW";
  ConfidenceLevel2["MEDIUM"] = "MEDIUM";
})(ConfidenceLevel || (ConfidenceLevel = {}));
var DimensionValueOperator;
(function(DimensionValueOperator2) {
  DimensionValueOperator2["IN"] = "IN";
  DimensionValueOperator2["NOT_IN"] = "NOT_IN";
})(DimensionValueOperator || (DimensionValueOperator = {}));
var VerificationState;
(function(VerificationState2) {
  VerificationState2["BENIGN_POSITIVE"] = "BENIGN_POSITIVE";
  VerificationState2["FALSE_POSITIVE"] = "FALSE_POSITIVE";
  VerificationState2["TRUE_POSITIVE"] = "TRUE_POSITIVE";
  VerificationState2["UNKNOWN"] = "UNKNOWN";
})(VerificationState || (VerificationState = {}));
var AggregationTypeName;
(function(AggregationTypeName2) {
  AggregationTypeName2["CARDINALITY"] = "Cardinality";
  AggregationTypeName2["PERCENTILES"] = "Percentiles";
  AggregationTypeName2["STATISTICS"] = "Statistics";
})(AggregationTypeName || (AggregationTypeName = {}));
var AlertTargetType;
(function(AlertTargetType2) {
  AlertTargetType2["SNS"] = "SNS";
})(AlertTargetType || (AlertTargetType = {}));
var AuditCheckRunStatus;
(function(AuditCheckRunStatus2) {
  AuditCheckRunStatus2["CANCELED"] = "CANCELED";
  AuditCheckRunStatus2["COMPLETED_COMPLIANT"] = "COMPLETED_COMPLIANT";
  AuditCheckRunStatus2["COMPLETED_NON_COMPLIANT"] = "COMPLETED_NON_COMPLIANT";
  AuditCheckRunStatus2["FAILED"] = "FAILED";
  AuditCheckRunStatus2["IN_PROGRESS"] = "IN_PROGRESS";
  AuditCheckRunStatus2["WAITING_FOR_DATA_COLLECTION"] = "WAITING_FOR_DATA_COLLECTION";
})(AuditCheckRunStatus || (AuditCheckRunStatus = {}));
var ResourceType;
(function(ResourceType3) {
  ResourceType3["ACCOUNT_SETTINGS"] = "ACCOUNT_SETTINGS";
  ResourceType3["CA_CERTIFICATE"] = "CA_CERTIFICATE";
  ResourceType3["CLIENT_ID"] = "CLIENT_ID";
  ResourceType3["COGNITO_IDENTITY_POOL"] = "COGNITO_IDENTITY_POOL";
  ResourceType3["DEVICE_CERTIFICATE"] = "DEVICE_CERTIFICATE";
  ResourceType3["IAM_ROLE"] = "IAM_ROLE";
  ResourceType3["IOT_POLICY"] = "IOT_POLICY";
  ResourceType3["ISSUER_CERTIFICATE"] = "ISSUER_CERTIFICATE";
  ResourceType3["ROLE_ALIAS"] = "ROLE_ALIAS";
})(ResourceType || (ResourceType = {}));
var AuditFindingSeverity;
(function(AuditFindingSeverity2) {
  AuditFindingSeverity2["CRITICAL"] = "CRITICAL";
  AuditFindingSeverity2["HIGH"] = "HIGH";
  AuditFindingSeverity2["LOW"] = "LOW";
  AuditFindingSeverity2["MEDIUM"] = "MEDIUM";
})(AuditFindingSeverity || (AuditFindingSeverity = {}));
var AuditFrequency;
(function(AuditFrequency2) {
  AuditFrequency2["BIWEEKLY"] = "BIWEEKLY";
  AuditFrequency2["DAILY"] = "DAILY";
  AuditFrequency2["MONTHLY"] = "MONTHLY";
  AuditFrequency2["WEEKLY"] = "WEEKLY";
})(AuditFrequency || (AuditFrequency = {}));
var AuditMitigationActionsExecutionStatus;
(function(AuditMitigationActionsExecutionStatus2) {
  AuditMitigationActionsExecutionStatus2["CANCELED"] = "CANCELED";
  AuditMitigationActionsExecutionStatus2["COMPLETED"] = "COMPLETED";
  AuditMitigationActionsExecutionStatus2["FAILED"] = "FAILED";
  AuditMitigationActionsExecutionStatus2["IN_PROGRESS"] = "IN_PROGRESS";
  AuditMitigationActionsExecutionStatus2["PENDING"] = "PENDING";
  AuditMitigationActionsExecutionStatus2["SKIPPED"] = "SKIPPED";
})(AuditMitigationActionsExecutionStatus || (AuditMitigationActionsExecutionStatus = {}));
var AuditMitigationActionsTaskStatus;
(function(AuditMitigationActionsTaskStatus2) {
  AuditMitigationActionsTaskStatus2["CANCELED"] = "CANCELED";
  AuditMitigationActionsTaskStatus2["COMPLETED"] = "COMPLETED";
  AuditMitigationActionsTaskStatus2["FAILED"] = "FAILED";
  AuditMitigationActionsTaskStatus2["IN_PROGRESS"] = "IN_PROGRESS";
})(AuditMitigationActionsTaskStatus || (AuditMitigationActionsTaskStatus = {}));
var AuditNotificationType;
(function(AuditNotificationType2) {
  AuditNotificationType2["SNS"] = "SNS";
})(AuditNotificationType || (AuditNotificationType = {}));
var AuditTaskStatus;
(function(AuditTaskStatus2) {
  AuditTaskStatus2["CANCELED"] = "CANCELED";
  AuditTaskStatus2["COMPLETED"] = "COMPLETED";
  AuditTaskStatus2["FAILED"] = "FAILED";
  AuditTaskStatus2["IN_PROGRESS"] = "IN_PROGRESS";
})(AuditTaskStatus || (AuditTaskStatus = {}));
var AuditTaskType;
(function(AuditTaskType2) {
  AuditTaskType2["ON_DEMAND_AUDIT_TASK"] = "ON_DEMAND_AUDIT_TASK";
  AuditTaskType2["SCHEDULED_AUDIT_TASK"] = "SCHEDULED_AUDIT_TASK";
})(AuditTaskType || (AuditTaskType = {}));
var AuthDecision;
(function(AuthDecision2) {
  AuthDecision2["ALLOWED"] = "ALLOWED";
  AuthDecision2["EXPLICIT_DENY"] = "EXPLICIT_DENY";
  AuthDecision2["IMPLICIT_DENY"] = "IMPLICIT_DENY";
})(AuthDecision || (AuthDecision = {}));
var AuthorizerStatus;
(function(AuthorizerStatus2) {
  AuthorizerStatus2["ACTIVE"] = "ACTIVE";
  AuthorizerStatus2["INACTIVE"] = "INACTIVE";
})(AuthorizerStatus || (AuthorizerStatus = {}));
var AutoRegistrationStatus;
(function(AutoRegistrationStatus2) {
  AutoRegistrationStatus2["DISABLE"] = "DISABLE";
  AutoRegistrationStatus2["ENABLE"] = "ENABLE";
})(AutoRegistrationStatus || (AutoRegistrationStatus = {}));
var CustomMetricType;
(function(CustomMetricType2) {
  CustomMetricType2["IP_ADDRESS_LIST"] = "ip-address-list";
  CustomMetricType2["NUMBER"] = "number";
  CustomMetricType2["NUMBER_LIST"] = "number-list";
  CustomMetricType2["STRING_LIST"] = "string-list";
})(CustomMetricType || (CustomMetricType = {}));
var DimensionType;
(function(DimensionType2) {
  DimensionType2["TOPIC_FILTER"] = "TOPIC_FILTER";
})(DimensionType || (DimensionType = {}));
var ServiceType;
(function(ServiceType2) {
  ServiceType2["CREDENTIAL_PROVIDER"] = "CREDENTIAL_PROVIDER";
  ServiceType2["DATA"] = "DATA";
  ServiceType2["JOBS"] = "JOBS";
})(ServiceType || (ServiceType = {}));
var FleetMetricUnit;
(function(FleetMetricUnit2) {
  FleetMetricUnit2["Bits"] = "Bits";
  FleetMetricUnit2["BitsSecond"] = "Bits/Second";
  FleetMetricUnit2["Bytes"] = "Bytes";
  FleetMetricUnit2["BytesSecond"] = "Bytes/Second";
  FleetMetricUnit2["Count"] = "Count";
  FleetMetricUnit2["CountSecond"] = "Count/Second";
  FleetMetricUnit2["Gigabits"] = "Gigabits";
  FleetMetricUnit2["GigabitsSecond"] = "Gigabits/Second";
  FleetMetricUnit2["Gigabytes"] = "Gigabytes";
  FleetMetricUnit2["GigabytesSecond"] = "Gigabytes/Second";
  FleetMetricUnit2["Kilobits"] = "Kilobits";
  FleetMetricUnit2["KilobitsSecond"] = "Kilobits/Second";
  FleetMetricUnit2["Kilobytes"] = "Kilobytes";
  FleetMetricUnit2["KilobytesSecond"] = "Kilobytes/Second";
  FleetMetricUnit2["Megabits"] = "Megabits";
  FleetMetricUnit2["MegabitsSecond"] = "Megabits/Second";
  FleetMetricUnit2["Megabytes"] = "Megabytes";
  FleetMetricUnit2["MegabytesSecond"] = "Megabytes/Second";
  FleetMetricUnit2["Microseconds"] = "Microseconds";
  FleetMetricUnit2["Milliseconds"] = "Milliseconds";
  FleetMetricUnit2["None"] = "None";
  FleetMetricUnit2["Percent"] = "Percent";
  FleetMetricUnit2["Seconds"] = "Seconds";
  FleetMetricUnit2["Terabits"] = "Terabits";
  FleetMetricUnit2["TerabitsSecond"] = "Terabits/Second";
  FleetMetricUnit2["Terabytes"] = "Terabytes";
  FleetMetricUnit2["TerabytesSecond"] = "Terabytes/Second";
})(FleetMetricUnit || (FleetMetricUnit = {}));
var RetryableFailureType;
(function(RetryableFailureType2) {
  RetryableFailureType2["ALL"] = "ALL";
  RetryableFailureType2["FAILED"] = "FAILED";
  RetryableFailureType2["TIMED_OUT"] = "TIMED_OUT";
})(RetryableFailureType || (RetryableFailureType = {}));
var JobEndBehavior;
(function(JobEndBehavior2) {
  JobEndBehavior2["CANCEL"] = "CANCEL";
  JobEndBehavior2["FORCE_CANCEL"] = "FORCE_CANCEL";
  JobEndBehavior2["STOP_ROLLOUT"] = "STOP_ROLLOUT";
})(JobEndBehavior || (JobEndBehavior = {}));
var TargetSelection;
(function(TargetSelection2) {
  TargetSelection2["CONTINUOUS"] = "CONTINUOUS";
  TargetSelection2["SNAPSHOT"] = "SNAPSHOT";
})(TargetSelection || (TargetSelection = {}));
var LogLevel;
(function(LogLevel2) {
  LogLevel2["DEBUG"] = "DEBUG";
  LogLevel2["DISABLED"] = "DISABLED";
  LogLevel2["ERROR"] = "ERROR";
  LogLevel2["INFO"] = "INFO";
  LogLevel2["WARN"] = "WARN";
})(LogLevel || (LogLevel = {}));
var PolicyTemplateName;
(function(PolicyTemplateName2) {
  PolicyTemplateName2["BLANK_POLICY"] = "BLANK_POLICY";
})(PolicyTemplateName || (PolicyTemplateName = {}));
var CACertificateUpdateAction;
(function(CACertificateUpdateAction2) {
  CACertificateUpdateAction2["DEACTIVATE"] = "DEACTIVATE";
})(CACertificateUpdateAction || (CACertificateUpdateAction = {}));
var DeviceCertificateUpdateAction;
(function(DeviceCertificateUpdateAction2) {
  DeviceCertificateUpdateAction2["DEACTIVATE"] = "DEACTIVATE";
})(DeviceCertificateUpdateAction || (DeviceCertificateUpdateAction = {}));
var AwsJobAbortCriteriaAbortAction;
(function(AwsJobAbortCriteriaAbortAction2) {
  AwsJobAbortCriteriaAbortAction2["CANCEL"] = "CANCEL";
})(AwsJobAbortCriteriaAbortAction || (AwsJobAbortCriteriaAbortAction = {}));
var AwsJobAbortCriteriaFailureType;
(function(AwsJobAbortCriteriaFailureType2) {
  AwsJobAbortCriteriaFailureType2["ALL"] = "ALL";
  AwsJobAbortCriteriaFailureType2["FAILED"] = "FAILED";
  AwsJobAbortCriteriaFailureType2["REJECTED"] = "REJECTED";
  AwsJobAbortCriteriaFailureType2["TIMED_OUT"] = "TIMED_OUT";
})(AwsJobAbortCriteriaFailureType || (AwsJobAbortCriteriaFailureType = {}));
var Protocol;
(function(Protocol2) {
  Protocol2["HTTP"] = "HTTP";
  Protocol2["MQTT"] = "MQTT";
})(Protocol || (Protocol = {}));
var OTAUpdateStatus;
(function(OTAUpdateStatus2) {
  OTAUpdateStatus2["CREATE_COMPLETE"] = "CREATE_COMPLETE";
  OTAUpdateStatus2["CREATE_FAILED"] = "CREATE_FAILED";
  OTAUpdateStatus2["CREATE_IN_PROGRESS"] = "CREATE_IN_PROGRESS";
  OTAUpdateStatus2["CREATE_PENDING"] = "CREATE_PENDING";
})(OTAUpdateStatus || (OTAUpdateStatus = {}));
var TemplateType;
(function(TemplateType2) {
  TemplateType2["FLEET_PROVISIONING"] = "FLEET_PROVISIONING";
  TemplateType2["JITP"] = "JITP";
})(TemplateType || (TemplateType = {}));
var DayOfWeek;
(function(DayOfWeek2) {
  DayOfWeek2["FRI"] = "FRI";
  DayOfWeek2["MON"] = "MON";
  DayOfWeek2["SAT"] = "SAT";
  DayOfWeek2["SUN"] = "SUN";
  DayOfWeek2["THU"] = "THU";
  DayOfWeek2["TUE"] = "TUE";
  DayOfWeek2["WED"] = "WED";
})(DayOfWeek || (DayOfWeek = {}));
var TopicRuleDestinationStatus;
(function(TopicRuleDestinationStatus2) {
  TopicRuleDestinationStatus2["DELETING"] = "DELETING";
  TopicRuleDestinationStatus2["DISABLED"] = "DISABLED";
  TopicRuleDestinationStatus2["ENABLED"] = "ENABLED";
  TopicRuleDestinationStatus2["ERROR"] = "ERROR";
  TopicRuleDestinationStatus2["IN_PROGRESS"] = "IN_PROGRESS";
})(TopicRuleDestinationStatus || (TopicRuleDestinationStatus = {}));

// ../../node_modules/@aws-sdk/client-iot/dist-es/models/models_1.js
var LogTargetType;
(function(LogTargetType2) {
  LogTargetType2["CLIENT_ID"] = "CLIENT_ID";
  LogTargetType2["DEFAULT"] = "DEFAULT";
  LogTargetType2["PRINCIPAL_ID"] = "PRINCIPAL_ID";
  LogTargetType2["SOURCE_IP"] = "SOURCE_IP";
  LogTargetType2["THING_GROUP"] = "THING_GROUP";
})(LogTargetType || (LogTargetType = {}));
var CertificateMode;
(function(CertificateMode2) {
  CertificateMode2["DEFAULT"] = "DEFAULT";
  CertificateMode2["SNI_ONLY"] = "SNI_ONLY";
})(CertificateMode || (CertificateMode = {}));
var CACertificateStatus;
(function(CACertificateStatus2) {
  CACertificateStatus2["ACTIVE"] = "ACTIVE";
  CACertificateStatus2["INACTIVE"] = "INACTIVE";
})(CACertificateStatus || (CACertificateStatus = {}));
var CertificateStatus;
(function(CertificateStatus2) {
  CertificateStatus2["ACTIVE"] = "ACTIVE";
  CertificateStatus2["INACTIVE"] = "INACTIVE";
  CertificateStatus2["PENDING_ACTIVATION"] = "PENDING_ACTIVATION";
  CertificateStatus2["PENDING_TRANSFER"] = "PENDING_TRANSFER";
  CertificateStatus2["REGISTER_INACTIVE"] = "REGISTER_INACTIVE";
  CertificateStatus2["REVOKED"] = "REVOKED";
})(CertificateStatus || (CertificateStatus = {}));
var DetectMitigationActionsTaskStatus;
(function(DetectMitigationActionsTaskStatus2) {
  DetectMitigationActionsTaskStatus2["CANCELED"] = "CANCELED";
  DetectMitigationActionsTaskStatus2["FAILED"] = "FAILED";
  DetectMitigationActionsTaskStatus2["IN_PROGRESS"] = "IN_PROGRESS";
  DetectMitigationActionsTaskStatus2["SUCCESSFUL"] = "SUCCESSFUL";
})(DetectMitigationActionsTaskStatus || (DetectMitigationActionsTaskStatus = {}));
var DomainConfigurationStatus;
(function(DomainConfigurationStatus2) {
  DomainConfigurationStatus2["DISABLED"] = "DISABLED";
  DomainConfigurationStatus2["ENABLED"] = "ENABLED";
})(DomainConfigurationStatus || (DomainConfigurationStatus = {}));
var DomainType;
(function(DomainType2) {
  DomainType2["AWS_MANAGED"] = "AWS_MANAGED";
  DomainType2["CUSTOMER_MANAGED"] = "CUSTOMER_MANAGED";
  DomainType2["ENDPOINT"] = "ENDPOINT";
})(DomainType || (DomainType = {}));
var ServerCertificateStatus;
(function(ServerCertificateStatus2) {
  ServerCertificateStatus2["INVALID"] = "INVALID";
  ServerCertificateStatus2["VALID"] = "VALID";
})(ServerCertificateStatus || (ServerCertificateStatus = {}));
var EventType;
(function(EventType3) {
  EventType3["CA_CERTIFICATE"] = "CA_CERTIFICATE";
  EventType3["CERTIFICATE"] = "CERTIFICATE";
  EventType3["JOB"] = "JOB";
  EventType3["JOB_EXECUTION"] = "JOB_EXECUTION";
  EventType3["POLICY"] = "POLICY";
  EventType3["THING"] = "THING";
  EventType3["THING_GROUP"] = "THING_GROUP";
  EventType3["THING_GROUP_HIERARCHY"] = "THING_GROUP_HIERARCHY";
  EventType3["THING_GROUP_MEMBERSHIP"] = "THING_GROUP_MEMBERSHIP";
  EventType3["THING_TYPE"] = "THING_TYPE";
  EventType3["THING_TYPE_ASSOCIATION"] = "THING_TYPE_ASSOCIATION";
})(EventType || (EventType = {}));
var IndexStatus2;
(function(IndexStatus3) {
  IndexStatus3["ACTIVE"] = "ACTIVE";
  IndexStatus3["BUILDING"] = "BUILDING";
  IndexStatus3["REBUILDING"] = "REBUILDING";
})(IndexStatus2 || (IndexStatus2 = {}));
var JobStatus;
(function(JobStatus3) {
  JobStatus3["CANCELED"] = "CANCELED";
  JobStatus3["COMPLETED"] = "COMPLETED";
  JobStatus3["DELETION_IN_PROGRESS"] = "DELETION_IN_PROGRESS";
  JobStatus3["IN_PROGRESS"] = "IN_PROGRESS";
  JobStatus3["SCHEDULED"] = "SCHEDULED";
})(JobStatus || (JobStatus = {}));
var JobExecutionStatus;
(function(JobExecutionStatus2) {
  JobExecutionStatus2["CANCELED"] = "CANCELED";
  JobExecutionStatus2["FAILED"] = "FAILED";
  JobExecutionStatus2["IN_PROGRESS"] = "IN_PROGRESS";
  JobExecutionStatus2["QUEUED"] = "QUEUED";
  JobExecutionStatus2["REJECTED"] = "REJECTED";
  JobExecutionStatus2["REMOVED"] = "REMOVED";
  JobExecutionStatus2["SUCCEEDED"] = "SUCCEEDED";
  JobExecutionStatus2["TIMED_OUT"] = "TIMED_OUT";
})(JobExecutionStatus || (JobExecutionStatus = {}));
var MitigationActionType;
(function(MitigationActionType2) {
  MitigationActionType2["ADD_THINGS_TO_THING_GROUP"] = "ADD_THINGS_TO_THING_GROUP";
  MitigationActionType2["ENABLE_IOT_LOGGING"] = "ENABLE_IOT_LOGGING";
  MitigationActionType2["PUBLISH_FINDING_TO_SNS"] = "PUBLISH_FINDING_TO_SNS";
  MitigationActionType2["REPLACE_DEFAULT_POLICY_VERSION"] = "REPLACE_DEFAULT_POLICY_VERSION";
  MitigationActionType2["UPDATE_CA_CERTIFICATE"] = "UPDATE_CA_CERTIFICATE";
  MitigationActionType2["UPDATE_DEVICE_CERTIFICATE"] = "UPDATE_DEVICE_CERTIFICATE";
})(MitigationActionType || (MitigationActionType = {}));
var DynamicGroupStatus;
(function(DynamicGroupStatus2) {
  DynamicGroupStatus2["ACTIVE"] = "ACTIVE";
  DynamicGroupStatus2["BUILDING"] = "BUILDING";
  DynamicGroupStatus2["REBUILDING"] = "REBUILDING";
})(DynamicGroupStatus || (DynamicGroupStatus = {}));
var Status;
(function(Status2) {
  Status2["Cancelled"] = "Cancelled";
  Status2["Cancelling"] = "Cancelling";
  Status2["Completed"] = "Completed";
  Status2["Failed"] = "Failed";
  Status2["InProgress"] = "InProgress";
})(Status || (Status = {}));
var ModelStatus;
(function(ModelStatus2) {
  ModelStatus2["ACTIVE"] = "ACTIVE";
  ModelStatus2["EXPIRED"] = "EXPIRED";
  ModelStatus2["PENDING_BUILD"] = "PENDING_BUILD";
})(ModelStatus || (ModelStatus = {}));
var FieldType;
(function(FieldType2) {
  FieldType2["BOOLEAN"] = "Boolean";
  FieldType2["NUMBER"] = "Number";
  FieldType2["STRING"] = "String";
})(FieldType || (FieldType = {}));
var ThingGroupIndexingMode;
(function(ThingGroupIndexingMode2) {
  ThingGroupIndexingMode2["OFF"] = "OFF";
  ThingGroupIndexingMode2["ON"] = "ON";
})(ThingGroupIndexingMode || (ThingGroupIndexingMode = {}));
var DeviceDefenderIndexingMode;
(function(DeviceDefenderIndexingMode2) {
  DeviceDefenderIndexingMode2["OFF"] = "OFF";
  DeviceDefenderIndexingMode2["VIOLATIONS"] = "VIOLATIONS";
})(DeviceDefenderIndexingMode || (DeviceDefenderIndexingMode = {}));
var NamedShadowIndexingMode;
(function(NamedShadowIndexingMode2) {
  NamedShadowIndexingMode2["OFF"] = "OFF";
  NamedShadowIndexingMode2["ON"] = "ON";
})(NamedShadowIndexingMode || (NamedShadowIndexingMode = {}));
var ThingConnectivityIndexingMode;
(function(ThingConnectivityIndexingMode2) {
  ThingConnectivityIndexingMode2["OFF"] = "OFF";
  ThingConnectivityIndexingMode2["STATUS"] = "STATUS";
})(ThingConnectivityIndexingMode || (ThingConnectivityIndexingMode = {}));
var ThingIndexingMode;
(function(ThingIndexingMode2) {
  ThingIndexingMode2["OFF"] = "OFF";
  ThingIndexingMode2["REGISTRY"] = "REGISTRY";
  ThingIndexingMode2["REGISTRY_AND_SHADOW"] = "REGISTRY_AND_SHADOW";
})(ThingIndexingMode || (ThingIndexingMode = {}));
var BehaviorCriteriaType;
(function(BehaviorCriteriaType2) {
  BehaviorCriteriaType2["MACHINE_LEARNING"] = "MACHINE_LEARNING";
  BehaviorCriteriaType2["STATIC"] = "STATIC";
  BehaviorCriteriaType2["STATISTICAL"] = "STATISTICAL";
})(BehaviorCriteriaType || (BehaviorCriteriaType = {}));
var DetectMitigationActionExecutionStatus;
(function(DetectMitigationActionExecutionStatus2) {
  DetectMitigationActionExecutionStatus2["FAILED"] = "FAILED";
  DetectMitigationActionExecutionStatus2["IN_PROGRESS"] = "IN_PROGRESS";
  DetectMitigationActionExecutionStatus2["SKIPPED"] = "SKIPPED";
  DetectMitigationActionExecutionStatus2["SUCCESSFUL"] = "SUCCESSFUL";
})(DetectMitigationActionExecutionStatus || (DetectMitigationActionExecutionStatus = {}));
var DescribeEndpointRequestFilterSensitiveLog = (obj) => ({
  ...obj
});
var DescribeEndpointResponseFilterSensitiveLog = (obj) => ({
  ...obj
});

// ../../node_modules/@aws-sdk/client-iot/dist-es/protocols/Aws_restJson1.js
var serializeAws_restJson1DescribeEndpointCommand = async (input, context) => {
  const { hostname, protocol = "https", port, path: basePath } = await context.endpoint();
  const headers = {};
  const resolvedPath2 = `${basePath?.endsWith("/") ? basePath.slice(0, -1) : basePath || ""}/endpoint`;
  const query = map5({
    endpointType: [, input.endpointType]
  });
  let body;
  return new HttpRequest({
    protocol,
    hostname,
    port,
    method: "GET",
    headers,
    path: resolvedPath2,
    query,
    body
  });
};
var deserializeAws_restJson1DescribeEndpointCommand = async (output, context) => {
  if (output.statusCode !== 200 && output.statusCode >= 300) {
    return deserializeAws_restJson1DescribeEndpointCommandError(output, context);
  }
  const contents = map5({
    $metadata: deserializeMetadata7(output)
  });
  const data = expectNonNull(expectObject(await parseBody6(output.body, context)), "body");
  if (data.endpointAddress != null) {
    contents.endpointAddress = expectString(data.endpointAddress);
  }
  return contents;
};
var deserializeAws_restJson1DescribeEndpointCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody6(output.body, context)
  };
  const errorCode = loadRestJsonErrorCode5(output, parsedOutput.body);
  switch (errorCode) {
    case "InternalFailureException":
    case "com.amazonaws.iot#InternalFailureException":
      throw await deserializeAws_restJson1InternalFailureExceptionResponse(parsedOutput, context);
    case "InvalidRequestException":
    case "com.amazonaws.iot#InvalidRequestException":
      throw await deserializeAws_restJson1InvalidRequestExceptionResponse3(parsedOutput, context);
    case "ThrottlingException":
    case "com.amazonaws.iot#ThrottlingException":
      throw await deserializeAws_restJson1ThrottlingExceptionResponse(parsedOutput, context);
    case "UnauthorizedException":
    case "com.amazonaws.iot#UnauthorizedException":
      throw await deserializeAws_restJson1UnauthorizedExceptionResponse2(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody,
        exceptionCtor: IoTServiceException,
        errorCode
      });
  }
};
var map5 = map;
var deserializeAws_restJson1InternalFailureExceptionResponse = async (parsedOutput, context) => {
  const contents = map5({});
  const data = parsedOutput.body;
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new InternalFailureException({
    $metadata: deserializeMetadata7(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1InvalidRequestExceptionResponse3 = async (parsedOutput, context) => {
  const contents = map5({});
  const data = parsedOutput.body;
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new InvalidRequestException3({
    $metadata: deserializeMetadata7(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1ThrottlingExceptionResponse = async (parsedOutput, context) => {
  const contents = map5({});
  const data = parsedOutput.body;
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new ThrottlingException({
    $metadata: deserializeMetadata7(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1UnauthorizedExceptionResponse2 = async (parsedOutput, context) => {
  const contents = map5({});
  const data = parsedOutput.body;
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new UnauthorizedException2({
    $metadata: deserializeMetadata7(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeMetadata7 = (output) => ({
  httpStatusCode: output.statusCode,
  requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
  extendedRequestId: output.headers["x-amz-id-2"],
  cfId: output.headers["x-amz-cf-id"]
});
var collectBody6 = (streamBody = new Uint8Array(), context) => {
  if (streamBody instanceof Uint8Array) {
    return Promise.resolve(streamBody);
  }
  return context.streamCollector(streamBody) || Promise.resolve(new Uint8Array());
};
var collectBodyString6 = (streamBody, context) => collectBody6(streamBody, context).then((body) => context.utf8Encoder(body));
var parseBody6 = (streamBody, context) => collectBodyString6(streamBody, context).then((encoded) => {
  if (encoded.length) {
    return JSON.parse(encoded);
  }
  return {};
});
var parseErrorBody6 = async (errorBody, context) => {
  const value = await parseBody6(errorBody, context);
  value.message = value.message ?? value.Message;
  return value;
};
var loadRestJsonErrorCode5 = (output, data) => {
  const findKey = (object, key) => Object.keys(object).find((k13) => k13.toLowerCase() === key.toLowerCase());
  const sanitizeErrorCode = (rawValue) => {
    let cleanValue = rawValue;
    if (typeof cleanValue === "number") {
      cleanValue = cleanValue.toString();
    }
    if (cleanValue.indexOf(",") >= 0) {
      cleanValue = cleanValue.split(",")[0];
    }
    if (cleanValue.indexOf(":") >= 0) {
      cleanValue = cleanValue.split(":")[0];
    }
    if (cleanValue.indexOf("#") >= 0) {
      cleanValue = cleanValue.split("#")[1];
    }
    return cleanValue;
  };
  const headerKey = findKey(output.headers, "x-amzn-errortype");
  if (headerKey !== void 0) {
    return sanitizeErrorCode(output.headers[headerKey]);
  }
  if (data.code !== void 0) {
    return sanitizeErrorCode(data.code);
  }
  if (data["__type"] !== void 0) {
    return sanitizeErrorCode(data["__type"]);
  }
};

// ../../node_modules/@aws-sdk/client-iot/dist-es/commands/DescribeEndpointCommand.js
var DescribeEndpointCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, DescribeEndpointCommand.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "IoTClient";
    const commandName = "DescribeEndpointCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: DescribeEndpointRequestFilterSensitiveLog,
      outputFilterSensitiveLog: DescribeEndpointResponseFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_restJson1DescribeEndpointCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_restJson1DescribeEndpointCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-iot/dist-es/endpoint/EndpointParameters.js
var resolveClientEndpointParameters6 = (options) => {
  return {
    ...options,
    useDualstackEndpoint: options.useDualstackEndpoint ?? false,
    useFipsEndpoint: options.useFipsEndpoint ?? false,
    defaultSigningName: "execute-api"
  };
};

// ../../node_modules/@aws-sdk/client-iot/package.json
var package_default6 = {
  name: "@aws-sdk/client-iot",
  description: "AWS SDK for JavaScript Iot Client for Node.js, Browser and React Native",
  version: "3.256.0",
  scripts: {
    build: "concurrently 'yarn:build:cjs' 'yarn:build:es' 'yarn:build:types'",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "build:docs": "typedoc",
    "build:es": "tsc -p tsconfig.es.json",
    "build:include:deps": "lerna run --scope $npm_package_name --include-dependencies build",
    "build:types": "tsc -p tsconfig.types.json",
    "build:types:downlevel": "downlevel-dts dist-types dist-types/ts3.4",
    clean: "rimraf ./dist-* && rimraf *.tsbuildinfo",
    "generate:client": "node ../../scripts/generate-clients/single-service --solo iot"
  },
  main: "./dist-cjs/index.js",
  types: "./dist-types/index.d.ts",
  module: "./dist-es/index.js",
  sideEffects: false,
  dependencies: {
    "@aws-crypto/sha256-browser": "3.0.0",
    "@aws-crypto/sha256-js": "3.0.0",
    "@aws-sdk/client-sts": "3.256.0",
    "@aws-sdk/config-resolver": "3.254.0",
    "@aws-sdk/credential-provider-node": "3.256.0",
    "@aws-sdk/fetch-http-handler": "3.254.0",
    "@aws-sdk/hash-node": "3.254.0",
    "@aws-sdk/invalid-dependency": "3.254.0",
    "@aws-sdk/middleware-content-length": "3.254.0",
    "@aws-sdk/middleware-endpoint": "3.254.0",
    "@aws-sdk/middleware-host-header": "3.254.0",
    "@aws-sdk/middleware-logger": "3.254.0",
    "@aws-sdk/middleware-recursion-detection": "3.254.0",
    "@aws-sdk/middleware-retry": "3.254.0",
    "@aws-sdk/middleware-serde": "3.254.0",
    "@aws-sdk/middleware-signing": "3.254.0",
    "@aws-sdk/middleware-stack": "3.254.0",
    "@aws-sdk/middleware-user-agent": "3.254.0",
    "@aws-sdk/node-config-provider": "3.254.0",
    "@aws-sdk/node-http-handler": "3.254.0",
    "@aws-sdk/protocol-http": "3.254.0",
    "@aws-sdk/smithy-client": "3.254.0",
    "@aws-sdk/types": "3.254.0",
    "@aws-sdk/url-parser": "3.254.0",
    "@aws-sdk/util-base64": "3.208.0",
    "@aws-sdk/util-body-length-browser": "3.188.0",
    "@aws-sdk/util-body-length-node": "3.208.0",
    "@aws-sdk/util-defaults-mode-browser": "3.254.0",
    "@aws-sdk/util-defaults-mode-node": "3.254.0",
    "@aws-sdk/util-endpoints": "3.254.0",
    "@aws-sdk/util-retry": "3.254.0",
    "@aws-sdk/util-user-agent-browser": "3.254.0",
    "@aws-sdk/util-user-agent-node": "3.254.0",
    "@aws-sdk/util-utf8-browser": "3.188.0",
    "@aws-sdk/util-utf8-node": "3.208.0",
    tslib: "^2.3.1",
    uuid: "^8.3.2"
  },
  devDependencies: {
    "@aws-sdk/service-client-documentation-generator": "3.208.0",
    "@tsconfig/node14": "1.0.3",
    "@types/node": "^14.14.31",
    "@types/uuid": "^8.3.0",
    concurrently: "7.0.0",
    "downlevel-dts": "0.10.1",
    rimraf: "3.0.2",
    typedoc: "0.19.2",
    typescript: "~4.6.2"
  },
  overrides: {
    typedoc: {
      typescript: "~4.6.2"
    }
  },
  engines: {
    node: ">=14.0.0"
  },
  typesVersions: {
    "<4.0": {
      "dist-types/*": [
        "dist-types/ts3.4/*"
      ]
    }
  },
  files: [
    "dist-*"
  ],
  author: {
    name: "AWS SDK for JavaScript Team",
    url: "https://aws.amazon.com/javascript/"
  },
  license: "Apache-2.0",
  browser: {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.browser"
  },
  "react-native": {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.native"
  },
  homepage: "https://github.com/aws/aws-sdk-js-v3/tree/main/clients/client-iot",
  repository: {
    type: "git",
    url: "https://github.com/aws/aws-sdk-js-v3.git",
    directory: "clients/client-iot"
  }
};

// ../../node_modules/@aws-sdk/client-iot/dist-es/endpoint/ruleset.js
var r6 = "fn";
var s6 = "argv";
var t3 = "ref";
var a6 = true;
var b6 = false;
var c6 = "String";
var d6 = "PartitionResult";
var e6 = "tree";
var f6 = "error";
var g6 = "endpoint";
var h6 = { "required": true, "default": false, "type": "Boolean" };
var i6 = { [t3]: "Endpoint" };
var j6 = { [r6]: "booleanEquals", [s6]: [{ [t3]: "UseFIPS" }, true] };
var k6 = { [r6]: "booleanEquals", [s6]: [{ [t3]: "UseDualStack" }, true] };
var l6 = {};
var m6 = { [r6]: "booleanEquals", [s6]: [true, { [r6]: "getAttr", [s6]: [{ [t3]: d6 }, "supportsFIPS"] }] };
var n6 = { [r6]: "booleanEquals", [s6]: [true, { [r6]: "getAttr", [s6]: [{ [t3]: d6 }, "supportsDualStack"] }] };
var o6 = [i6];
var p6 = [j6];
var q6 = [k6];
var _data6 = { version: "1.0", parameters: { Region: { required: a6, type: c6 }, UseDualStack: h6, UseFIPS: h6, Endpoint: { required: b6, type: c6 } }, rules: [{ conditions: [{ [r6]: "aws.partition", [s6]: [{ [t3]: "Region" }], assign: d6 }], type: e6, rules: [{ conditions: [{ [r6]: "isSet", [s6]: o6 }, { [r6]: "parseURL", [s6]: o6, assign: "url" }], type: e6, rules: [{ conditions: p6, error: "Invalid Configuration: FIPS and custom endpoint are not supported", type: f6 }, { type: e6, rules: [{ conditions: q6, error: "Invalid Configuration: Dualstack and custom endpoint are not supported", type: f6 }, { endpoint: { url: i6, properties: l6, headers: l6 }, type: g6 }] }] }, { conditions: [j6, k6], type: e6, rules: [{ conditions: [m6, n6], type: e6, rules: [{ endpoint: { url: "https://iot-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: l6, headers: l6 }, type: g6 }] }, { error: "FIPS and DualStack are enabled, but this partition does not support one or both", type: f6 }] }, { conditions: p6, type: e6, rules: [{ conditions: [m6], type: e6, rules: [{ type: e6, rules: [{ endpoint: { url: "https://iot-fips.{Region}.{PartitionResult#dnsSuffix}", properties: l6, headers: l6 }, type: g6 }] }] }, { error: "FIPS is enabled but this partition does not support FIPS", type: f6 }] }, { conditions: q6, type: e6, rules: [{ conditions: [n6], type: e6, rules: [{ endpoint: { url: "https://iot.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: l6, headers: l6 }, type: g6 }] }, { error: "DualStack is enabled but this partition does not support DualStack", type: f6 }] }, { endpoint: { url: "https://iot.{Region}.{PartitionResult#dnsSuffix}", properties: l6, headers: l6 }, type: g6 }] }] };
var ruleSet6 = _data6;

// ../../node_modules/@aws-sdk/client-iot/dist-es/endpoint/endpointResolver.js
var defaultEndpointResolver6 = (endpointParams, context = {}) => {
  return resolveEndpoint(ruleSet6, {
    endpointParams,
    logger: context.logger
  });
};

// ../../node_modules/@aws-sdk/client-iot/dist-es/runtimeConfig.shared.js
var getRuntimeConfig11 = (config) => ({
  apiVersion: "2015-05-28",
  base64Decoder: config?.base64Decoder ?? fromBase64,
  base64Encoder: config?.base64Encoder ?? toBase64,
  disableHostPrefix: config?.disableHostPrefix ?? false,
  endpointProvider: config?.endpointProvider ?? defaultEndpointResolver6,
  logger: config?.logger ?? new NoOpLogger(),
  serviceId: config?.serviceId ?? "IoT",
  urlParser: config?.urlParser ?? parseUrl
});

// ../../node_modules/@aws-sdk/client-iot/dist-es/runtimeConfig.js
var getRuntimeConfig12 = (config) => {
  emitWarningIfUnsupportedVersion(process.version);
  const defaultsMode = resolveDefaultsModeConfig(config);
  const defaultConfigProvider = () => defaultsMode().then(loadConfigsForDefaultMode);
  const clientSharedValues = getRuntimeConfig11(config);
  return {
    ...clientSharedValues,
    ...config,
    runtime: "node",
    defaultsMode,
    bodyLengthChecker: config?.bodyLengthChecker ?? calculateBodyLength,
    credentialDefaultProvider: config?.credentialDefaultProvider ?? decorateDefaultCredentialProvider2(defaultProvider),
    defaultUserAgentProvider: config?.defaultUserAgentProvider ?? defaultUserAgent({ serviceId: clientSharedValues.serviceId, clientVersion: package_default6.version }),
    maxAttempts: config?.maxAttempts ?? loadConfig(NODE_MAX_ATTEMPT_CONFIG_OPTIONS),
    region: config?.region ?? loadConfig(NODE_REGION_CONFIG_OPTIONS, NODE_REGION_CONFIG_FILE_OPTIONS),
    requestHandler: config?.requestHandler ?? new NodeHttpHandler(defaultConfigProvider),
    retryMode: config?.retryMode ?? loadConfig({
      ...NODE_RETRY_MODE_CONFIG_OPTIONS,
      default: async () => (await defaultConfigProvider()).retryMode || DEFAULT_RETRY_MODE
    }),
    sha256: config?.sha256 ?? Hash.bind(null, "sha256"),
    streamCollector: config?.streamCollector ?? streamCollector,
    useDualstackEndpoint: config?.useDualstackEndpoint ?? loadConfig(NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS),
    useFipsEndpoint: config?.useFipsEndpoint ?? loadConfig(NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS),
    utf8Decoder: config?.utf8Decoder ?? fromUtf82,
    utf8Encoder: config?.utf8Encoder ?? toUtf8
  };
};

// ../../node_modules/@aws-sdk/client-iot/dist-es/IoTClient.js
var IoTClient = class extends Client {
  constructor(configuration) {
    const _config_0 = getRuntimeConfig12(configuration);
    const _config_1 = resolveClientEndpointParameters6(_config_0);
    const _config_2 = resolveRegionConfig(_config_1);
    const _config_3 = resolveEndpointConfig(_config_2);
    const _config_4 = resolveRetryConfig(_config_3);
    const _config_5 = resolveHostHeaderConfig(_config_4);
    const _config_6 = resolveAwsAuthConfig(_config_5);
    const _config_7 = resolveUserAgentConfig(_config_6);
    super(_config_7);
    this.config = _config_7;
    this.middlewareStack.use(getRetryPlugin(this.config));
    this.middlewareStack.use(getContentLengthPlugin(this.config));
    this.middlewareStack.use(getHostHeaderPlugin(this.config));
    this.middlewareStack.use(getLoggerPlugin(this.config));
    this.middlewareStack.use(getRecursionDetectionPlugin(this.config));
    this.middlewareStack.use(getAwsAuthPlugin(this.config));
    this.middlewareStack.use(getUserAgentPlugin(this.config));
    this.middlewareStack.use(getOmitRetryHeadersPlugin(this.config));
  }
  destroy() {
    super.destroy();
  }
};

// ../../node_modules/@aws-sdk/client-iot-data-plane/dist-es/models/IoTDataPlaneServiceException.js
var IoTDataPlaneServiceException = class extends ServiceException {
  constructor(options) {
    super(options);
    Object.setPrototypeOf(this, IoTDataPlaneServiceException.prototype);
  }
};

// ../../node_modules/@aws-sdk/client-iot-data-plane/dist-es/models/models_0.js
var InternalFailureException2 = class extends IoTDataPlaneServiceException {
  constructor(opts) {
    super({
      name: "InternalFailureException",
      $fault: "server",
      ...opts
    });
    this.name = "InternalFailureException";
    this.$fault = "server";
    Object.setPrototypeOf(this, InternalFailureException2.prototype);
  }
};
var InvalidRequestException4 = class extends IoTDataPlaneServiceException {
  constructor(opts) {
    super({
      name: "InvalidRequestException",
      $fault: "client",
      ...opts
    });
    this.name = "InvalidRequestException";
    this.$fault = "client";
    Object.setPrototypeOf(this, InvalidRequestException4.prototype);
  }
};
var MethodNotAllowedException = class extends IoTDataPlaneServiceException {
  constructor(opts) {
    super({
      name: "MethodNotAllowedException",
      $fault: "client",
      ...opts
    });
    this.name = "MethodNotAllowedException";
    this.$fault = "client";
    Object.setPrototypeOf(this, MethodNotAllowedException.prototype);
  }
};
var ThrottlingException2 = class extends IoTDataPlaneServiceException {
  constructor(opts) {
    super({
      name: "ThrottlingException",
      $fault: "client",
      ...opts
    });
    this.name = "ThrottlingException";
    this.$fault = "client";
    Object.setPrototypeOf(this, ThrottlingException2.prototype);
  }
};
var UnauthorizedException3 = class extends IoTDataPlaneServiceException {
  constructor(opts) {
    super({
      name: "UnauthorizedException",
      $fault: "client",
      ...opts
    });
    this.name = "UnauthorizedException";
    this.$fault = "client";
    Object.setPrototypeOf(this, UnauthorizedException3.prototype);
  }
};
var PayloadFormatIndicator;
(function(PayloadFormatIndicator2) {
  PayloadFormatIndicator2["UNSPECIFIED_BYTES"] = "UNSPECIFIED_BYTES";
  PayloadFormatIndicator2["UTF8_DATA"] = "UTF8_DATA";
})(PayloadFormatIndicator || (PayloadFormatIndicator = {}));
var PublishRequestFilterSensitiveLog = (obj) => ({
  ...obj
});

// ../../node_modules/@aws-sdk/client-iot-data-plane/dist-es/protocols/Aws_restJson1.js
var serializeAws_restJson1PublishCommand = async (input, context) => {
  const { hostname, protocol = "https", port, path: basePath } = await context.endpoint();
  const headers = map6({}, isSerializableHeaderValue3, {
    "content-type": "application/octet-stream",
    "x-amz-mqtt5-user-properties": [
      () => isSerializableHeaderValue3(input.userProperties),
      () => context.base64Encoder(Buffer.from(LazyJsonString.fromObject(input.userProperties)))
    ],
    "x-amz-mqtt5-payload-format-indicator": input.payloadFormatIndicator,
    "x-amz-mqtt5-correlation-data": input.correlationData
  });
  let resolvedPath2 = `${basePath?.endsWith("/") ? basePath.slice(0, -1) : basePath || ""}/topics/{topic}`;
  resolvedPath2 = resolvedPath(resolvedPath2, input, "topic", () => input.topic, "{topic}", false);
  const query = map6({
    qos: [() => input.qos !== void 0, () => input.qos.toString()],
    retain: [() => input.retain !== void 0, () => input.retain.toString()],
    contentType: [, input.contentType],
    responseTopic: [, input.responseTopic],
    messageExpiry: [() => input.messageExpiry !== void 0, () => input.messageExpiry.toString()]
  });
  let body;
  if (input.payload !== void 0) {
    body = input.payload;
  }
  return new HttpRequest({
    protocol,
    hostname,
    port,
    method: "POST",
    headers,
    path: resolvedPath2,
    query,
    body
  });
};
var deserializeAws_restJson1PublishCommand = async (output, context) => {
  if (output.statusCode !== 200 && output.statusCode >= 300) {
    return deserializeAws_restJson1PublishCommandError(output, context);
  }
  const contents = map6({
    $metadata: deserializeMetadata8(output)
  });
  await collectBody7(output.body, context);
  return contents;
};
var deserializeAws_restJson1PublishCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody7(output.body, context)
  };
  const errorCode = loadRestJsonErrorCode6(output, parsedOutput.body);
  switch (errorCode) {
    case "InternalFailureException":
    case "com.amazonaws.iotdataplane#InternalFailureException":
      throw await deserializeAws_restJson1InternalFailureExceptionResponse2(parsedOutput, context);
    case "InvalidRequestException":
    case "com.amazonaws.iotdataplane#InvalidRequestException":
      throw await deserializeAws_restJson1InvalidRequestExceptionResponse4(parsedOutput, context);
    case "MethodNotAllowedException":
    case "com.amazonaws.iotdataplane#MethodNotAllowedException":
      throw await deserializeAws_restJson1MethodNotAllowedExceptionResponse(parsedOutput, context);
    case "ThrottlingException":
    case "com.amazonaws.iotdataplane#ThrottlingException":
      throw await deserializeAws_restJson1ThrottlingExceptionResponse2(parsedOutput, context);
    case "UnauthorizedException":
    case "com.amazonaws.iotdataplane#UnauthorizedException":
      throw await deserializeAws_restJson1UnauthorizedExceptionResponse3(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody,
        exceptionCtor: IoTDataPlaneServiceException,
        errorCode
      });
  }
};
var map6 = map;
var deserializeAws_restJson1InternalFailureExceptionResponse2 = async (parsedOutput, context) => {
  const contents = map6({});
  const data = parsedOutput.body;
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new InternalFailureException2({
    $metadata: deserializeMetadata8(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1InvalidRequestExceptionResponse4 = async (parsedOutput, context) => {
  const contents = map6({});
  const data = parsedOutput.body;
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new InvalidRequestException4({
    $metadata: deserializeMetadata8(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1MethodNotAllowedExceptionResponse = async (parsedOutput, context) => {
  const contents = map6({});
  const data = parsedOutput.body;
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new MethodNotAllowedException({
    $metadata: deserializeMetadata8(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1ThrottlingExceptionResponse2 = async (parsedOutput, context) => {
  const contents = map6({});
  const data = parsedOutput.body;
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new ThrottlingException2({
    $metadata: deserializeMetadata8(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1UnauthorizedExceptionResponse3 = async (parsedOutput, context) => {
  const contents = map6({});
  const data = parsedOutput.body;
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new UnauthorizedException3({
    $metadata: deserializeMetadata8(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeMetadata8 = (output) => ({
  httpStatusCode: output.statusCode,
  requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
  extendedRequestId: output.headers["x-amz-id-2"],
  cfId: output.headers["x-amz-cf-id"]
});
var collectBody7 = (streamBody = new Uint8Array(), context) => {
  if (streamBody instanceof Uint8Array) {
    return Promise.resolve(streamBody);
  }
  return context.streamCollector(streamBody) || Promise.resolve(new Uint8Array());
};
var collectBodyString7 = (streamBody, context) => collectBody7(streamBody, context).then((body) => context.utf8Encoder(body));
var isSerializableHeaderValue3 = (value) => value !== void 0 && value !== null && value !== "" && (!Object.getOwnPropertyNames(value).includes("length") || value.length != 0) && (!Object.getOwnPropertyNames(value).includes("size") || value.size != 0);
var parseBody7 = (streamBody, context) => collectBodyString7(streamBody, context).then((encoded) => {
  if (encoded.length) {
    return JSON.parse(encoded);
  }
  return {};
});
var parseErrorBody7 = async (errorBody, context) => {
  const value = await parseBody7(errorBody, context);
  value.message = value.message ?? value.Message;
  return value;
};
var loadRestJsonErrorCode6 = (output, data) => {
  const findKey = (object, key) => Object.keys(object).find((k13) => k13.toLowerCase() === key.toLowerCase());
  const sanitizeErrorCode = (rawValue) => {
    let cleanValue = rawValue;
    if (typeof cleanValue === "number") {
      cleanValue = cleanValue.toString();
    }
    if (cleanValue.indexOf(",") >= 0) {
      cleanValue = cleanValue.split(",")[0];
    }
    if (cleanValue.indexOf(":") >= 0) {
      cleanValue = cleanValue.split(":")[0];
    }
    if (cleanValue.indexOf("#") >= 0) {
      cleanValue = cleanValue.split("#")[1];
    }
    return cleanValue;
  };
  const headerKey = findKey(output.headers, "x-amzn-errortype");
  if (headerKey !== void 0) {
    return sanitizeErrorCode(output.headers[headerKey]);
  }
  if (data.code !== void 0) {
    return sanitizeErrorCode(data.code);
  }
  if (data["__type"] !== void 0) {
    return sanitizeErrorCode(data["__type"]);
  }
};

// ../../node_modules/@aws-sdk/client-iot-data-plane/dist-es/commands/PublishCommand.js
var PublishCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, PublishCommand.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "IoTDataPlaneClient";
    const commandName = "PublishCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: PublishRequestFilterSensitiveLog,
      outputFilterSensitiveLog: (output) => output
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_restJson1PublishCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_restJson1PublishCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-iot-data-plane/dist-es/endpoint/EndpointParameters.js
var resolveClientEndpointParameters7 = (options) => {
  return {
    ...options,
    useDualstackEndpoint: options.useDualstackEndpoint ?? false,
    useFipsEndpoint: options.useFipsEndpoint ?? false,
    defaultSigningName: "iotdata"
  };
};

// ../../node_modules/@aws-sdk/client-iot-data-plane/package.json
var package_default7 = {
  name: "@aws-sdk/client-iot-data-plane",
  description: "AWS SDK for JavaScript Iot Data Plane Client for Node.js, Browser and React Native",
  version: "3.256.0",
  scripts: {
    build: "concurrently 'yarn:build:cjs' 'yarn:build:es' 'yarn:build:types'",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "build:docs": "typedoc",
    "build:es": "tsc -p tsconfig.es.json",
    "build:include:deps": "lerna run --scope $npm_package_name --include-dependencies build",
    "build:types": "tsc -p tsconfig.types.json",
    "build:types:downlevel": "downlevel-dts dist-types dist-types/ts3.4",
    clean: "rimraf ./dist-* && rimraf *.tsbuildinfo",
    "generate:client": "node ../../scripts/generate-clients/single-service --solo iot-data-plane"
  },
  main: "./dist-cjs/index.js",
  types: "./dist-types/index.d.ts",
  module: "./dist-es/index.js",
  sideEffects: false,
  dependencies: {
    "@aws-crypto/sha256-browser": "3.0.0",
    "@aws-crypto/sha256-js": "3.0.0",
    "@aws-sdk/client-sts": "3.256.0",
    "@aws-sdk/config-resolver": "3.254.0",
    "@aws-sdk/credential-provider-node": "3.256.0",
    "@aws-sdk/fetch-http-handler": "3.254.0",
    "@aws-sdk/hash-node": "3.254.0",
    "@aws-sdk/invalid-dependency": "3.254.0",
    "@aws-sdk/middleware-content-length": "3.254.0",
    "@aws-sdk/middleware-endpoint": "3.254.0",
    "@aws-sdk/middleware-host-header": "3.254.0",
    "@aws-sdk/middleware-logger": "3.254.0",
    "@aws-sdk/middleware-recursion-detection": "3.254.0",
    "@aws-sdk/middleware-retry": "3.254.0",
    "@aws-sdk/middleware-serde": "3.254.0",
    "@aws-sdk/middleware-signing": "3.254.0",
    "@aws-sdk/middleware-stack": "3.254.0",
    "@aws-sdk/middleware-user-agent": "3.254.0",
    "@aws-sdk/node-config-provider": "3.254.0",
    "@aws-sdk/node-http-handler": "3.254.0",
    "@aws-sdk/protocol-http": "3.254.0",
    "@aws-sdk/smithy-client": "3.254.0",
    "@aws-sdk/types": "3.254.0",
    "@aws-sdk/url-parser": "3.254.0",
    "@aws-sdk/util-base64": "3.208.0",
    "@aws-sdk/util-body-length-browser": "3.188.0",
    "@aws-sdk/util-body-length-node": "3.208.0",
    "@aws-sdk/util-defaults-mode-browser": "3.254.0",
    "@aws-sdk/util-defaults-mode-node": "3.254.0",
    "@aws-sdk/util-endpoints": "3.254.0",
    "@aws-sdk/util-retry": "3.254.0",
    "@aws-sdk/util-user-agent-browser": "3.254.0",
    "@aws-sdk/util-user-agent-node": "3.254.0",
    "@aws-sdk/util-utf8-browser": "3.188.0",
    "@aws-sdk/util-utf8-node": "3.208.0",
    tslib: "^2.3.1"
  },
  devDependencies: {
    "@aws-sdk/service-client-documentation-generator": "3.208.0",
    "@tsconfig/node14": "1.0.3",
    "@types/node": "^14.14.31",
    concurrently: "7.0.0",
    "downlevel-dts": "0.10.1",
    rimraf: "3.0.2",
    typedoc: "0.19.2",
    typescript: "~4.6.2"
  },
  overrides: {
    typedoc: {
      typescript: "~4.6.2"
    }
  },
  engines: {
    node: ">=14.0.0"
  },
  typesVersions: {
    "<4.0": {
      "dist-types/*": [
        "dist-types/ts3.4/*"
      ]
    }
  },
  files: [
    "dist-*"
  ],
  author: {
    name: "AWS SDK for JavaScript Team",
    url: "https://aws.amazon.com/javascript/"
  },
  license: "Apache-2.0",
  browser: {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.browser"
  },
  "react-native": {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.native"
  },
  homepage: "https://github.com/aws/aws-sdk-js-v3/tree/main/clients/client-iot-data-plane",
  repository: {
    type: "git",
    url: "https://github.com/aws/aws-sdk-js-v3.git",
    directory: "clients/client-iot-data-plane"
  }
};

// ../../node_modules/@aws-sdk/client-iot-data-plane/dist-es/endpoint/ruleset.js
var r7 = "required";
var s7 = "fn";
var t4 = "argv";
var u3 = "ref";
var a7 = "PartitionResult";
var b7 = "tree";
var c7 = "error";
var d7 = "endpoint";
var e7 = "stringEquals";
var f7 = { [r7]: false, "type": "String" };
var g7 = { [r7]: true, "default": false, "type": "Boolean" };
var h7 = { [u3]: "Region" };
var i7 = { [u3]: "Endpoint" };
var j7 = { [s7]: "booleanEquals", [t4]: [{ [u3]: "UseFIPS" }, true] };
var k7 = { [s7]: "booleanEquals", [t4]: [{ [u3]: "UseDualStack" }, true] };
var l7 = {};
var m7 = { [s7]: "booleanEquals", [t4]: [true, { [s7]: "getAttr", [t4]: [{ [u3]: a7 }, "supportsFIPS"] }] };
var n7 = { [s7]: "booleanEquals", [t4]: [true, { [s7]: "getAttr", [t4]: [{ [u3]: a7 }, "supportsDualStack"] }] };
var o7 = [i7];
var p7 = [j7];
var q7 = [k7];
var _data7 = { version: "1.0", parameters: { Region: f7, UseDualStack: g7, UseFIPS: g7, Endpoint: f7 }, rules: [{ conditions: [{ [s7]: "aws.partition", [t4]: [h7], assign: a7 }], type: b7, rules: [{ conditions: [{ [s7]: "isSet", [t4]: o7 }, { [s7]: "parseURL", [t4]: o7, assign: "url" }], type: b7, rules: [{ conditions: p7, error: "Invalid Configuration: FIPS and custom endpoint are not supported", type: c7 }, { type: b7, rules: [{ conditions: q7, error: "Invalid Configuration: Dualstack and custom endpoint are not supported", type: c7 }, { endpoint: { url: i7, properties: l7, headers: l7 }, type: d7 }] }] }, { conditions: [j7, k7], type: b7, rules: [{ conditions: [m7, n7], type: b7, rules: [{ endpoint: { url: "https://data-ats.iot-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: l7, headers: l7 }, type: d7 }] }, { error: "FIPS and DualStack are enabled, but this partition does not support one or both", type: c7 }] }, { conditions: p7, type: b7, rules: [{ conditions: [m7], type: b7, rules: [{ type: b7, rules: [{ conditions: [{ [s7]: e7, [t4]: [h7, "us-east-1"] }], endpoint: { url: "https://data.iot-fips.us-east-1.amazonaws.com", properties: l7, headers: l7 }, type: d7 }, { conditions: [{ [s7]: e7, [t4]: [h7, "us-east-2"] }], endpoint: { url: "https://data.iot-fips.us-east-2.amazonaws.com", properties: l7, headers: l7 }, type: d7 }, { conditions: [{ [s7]: e7, [t4]: [h7, "ca-central-1"] }], endpoint: { url: "https://data.iot-fips.ca-central-1.amazonaws.com", properties: l7, headers: l7 }, type: d7 }, { conditions: [{ [s7]: e7, [t4]: [h7, "us-west-1"] }], endpoint: { url: "https://data.iot-fips.us-west-1.amazonaws.com", properties: l7, headers: l7 }, type: d7 }, { conditions: [{ [s7]: e7, [t4]: [h7, "us-west-2"] }], endpoint: { url: "https://data.iot-fips.us-west-2.amazonaws.com", properties: l7, headers: l7 }, type: d7 }, { conditions: [{ [s7]: e7, [t4]: [h7, "us-gov-west-1"] }], endpoint: { url: "https://data.iot-fips.us-gov-west-1.amazonaws.com", properties: l7, headers: l7 }, type: d7 }, { conditions: [{ [s7]: e7, [t4]: [h7, "us-gov-east-1"] }], endpoint: { url: "https://data.iot-fips.us-gov-east-1.amazonaws.com", properties: l7, headers: l7 }, type: d7 }, { endpoint: { url: "https://data-ats.iot-fips.{Region}.{PartitionResult#dnsSuffix}", properties: l7, headers: l7 }, type: d7 }] }] }, { error: "FIPS is enabled but this partition does not support FIPS", type: c7 }] }, { conditions: q7, type: b7, rules: [{ conditions: [n7], type: b7, rules: [{ endpoint: { url: "https://data-ats.iot.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: l7, headers: l7 }, type: d7 }] }, { error: "DualStack is enabled but this partition does not support DualStack", type: c7 }] }, { endpoint: { url: "https://data-ats.iot.{Region}.{PartitionResult#dnsSuffix}", properties: l7, headers: l7 }, type: d7 }] }] };
var ruleSet7 = _data7;

// ../../node_modules/@aws-sdk/client-iot-data-plane/dist-es/endpoint/endpointResolver.js
var defaultEndpointResolver7 = (endpointParams, context = {}) => {
  return resolveEndpoint(ruleSet7, {
    endpointParams,
    logger: context.logger
  });
};

// ../../node_modules/@aws-sdk/client-iot-data-plane/dist-es/runtimeConfig.shared.js
var getRuntimeConfig13 = (config) => ({
  apiVersion: "2015-05-28",
  base64Decoder: config?.base64Decoder ?? fromBase64,
  base64Encoder: config?.base64Encoder ?? toBase64,
  disableHostPrefix: config?.disableHostPrefix ?? false,
  endpointProvider: config?.endpointProvider ?? defaultEndpointResolver7,
  logger: config?.logger ?? new NoOpLogger(),
  serviceId: config?.serviceId ?? "IoT Data Plane",
  urlParser: config?.urlParser ?? parseUrl
});

// ../../node_modules/@aws-sdk/client-iot-data-plane/dist-es/runtimeConfig.js
var getRuntimeConfig14 = (config) => {
  emitWarningIfUnsupportedVersion(process.version);
  const defaultsMode = resolveDefaultsModeConfig(config);
  const defaultConfigProvider = () => defaultsMode().then(loadConfigsForDefaultMode);
  const clientSharedValues = getRuntimeConfig13(config);
  return {
    ...clientSharedValues,
    ...config,
    runtime: "node",
    defaultsMode,
    bodyLengthChecker: config?.bodyLengthChecker ?? calculateBodyLength,
    credentialDefaultProvider: config?.credentialDefaultProvider ?? decorateDefaultCredentialProvider2(defaultProvider),
    defaultUserAgentProvider: config?.defaultUserAgentProvider ?? defaultUserAgent({ serviceId: clientSharedValues.serviceId, clientVersion: package_default7.version }),
    maxAttempts: config?.maxAttempts ?? loadConfig(NODE_MAX_ATTEMPT_CONFIG_OPTIONS),
    region: config?.region ?? loadConfig(NODE_REGION_CONFIG_OPTIONS, NODE_REGION_CONFIG_FILE_OPTIONS),
    requestHandler: config?.requestHandler ?? new NodeHttpHandler(defaultConfigProvider),
    retryMode: config?.retryMode ?? loadConfig({
      ...NODE_RETRY_MODE_CONFIG_OPTIONS,
      default: async () => (await defaultConfigProvider()).retryMode || DEFAULT_RETRY_MODE
    }),
    sha256: config?.sha256 ?? Hash.bind(null, "sha256"),
    streamCollector: config?.streamCollector ?? streamCollector,
    useDualstackEndpoint: config?.useDualstackEndpoint ?? loadConfig(NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS),
    useFipsEndpoint: config?.useFipsEndpoint ?? loadConfig(NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS),
    utf8Decoder: config?.utf8Decoder ?? fromUtf82,
    utf8Encoder: config?.utf8Encoder ?? toUtf8
  };
};

// ../../node_modules/@aws-sdk/client-iot-data-plane/dist-es/IoTDataPlaneClient.js
var IoTDataPlaneClient = class extends Client {
  constructor(configuration) {
    const _config_0 = getRuntimeConfig14(configuration);
    const _config_1 = resolveClientEndpointParameters7(_config_0);
    const _config_2 = resolveRegionConfig(_config_1);
    const _config_3 = resolveEndpointConfig(_config_2);
    const _config_4 = resolveRetryConfig(_config_3);
    const _config_5 = resolveHostHeaderConfig(_config_4);
    const _config_6 = resolveAwsAuthConfig(_config_5);
    const _config_7 = resolveUserAgentConfig(_config_6);
    super(_config_7);
    this.config = _config_7;
    this.middlewareStack.use(getRetryPlugin(this.config));
    this.middlewareStack.use(getContentLengthPlugin(this.config));
    this.middlewareStack.use(getHostHeaderPlugin(this.config));
    this.middlewareStack.use(getLoggerPlugin(this.config));
    this.middlewareStack.use(getRecursionDetectionPlugin(this.config));
    this.middlewareStack.use(getAwsAuthPlugin(this.config));
    this.middlewareStack.use(getUserAgentPlugin(this.config));
  }
  destroy() {
    super.destroy();
  }
};

// src/mocks/iot.ts
var import_aws_sdk_client_mock3 = require("aws-sdk-client-mock");
var mockIoT = (fn = () => {
}) => {
  const mock = mockFn(fn);
  (0, import_aws_sdk_client_mock3.mockClient)(IoTClient).on(DescribeEndpointCommand).resolves({
    endpointAddress: "endpoint"
  });
  (0, import_aws_sdk_client_mock3.mockClient)(IoTDataPlaneClient).on(PublishCommand).callsFake(() => {
    return asyncCall(mock);
  });
  beforeEach && beforeEach(() => {
    mock.mockClear();
  });
  return mock;
};

// ../../node_modules/@aws-sdk/client-scheduler/dist-es/models/SchedulerServiceException.js
var SchedulerServiceException = class extends ServiceException {
  constructor(options) {
    super(options);
    Object.setPrototypeOf(this, SchedulerServiceException.prototype);
  }
};

// ../../node_modules/@aws-sdk/client-scheduler/dist-es/models/models_0.js
var AssignPublicIp;
(function(AssignPublicIp2) {
  AssignPublicIp2["DISABLED"] = "DISABLED";
  AssignPublicIp2["ENABLED"] = "ENABLED";
})(AssignPublicIp || (AssignPublicIp = {}));
var InternalServerException2 = class extends SchedulerServiceException {
  constructor(opts) {
    super({
      name: "InternalServerException",
      $fault: "server",
      ...opts
    });
    this.name = "InternalServerException";
    this.$fault = "server";
    Object.setPrototypeOf(this, InternalServerException2.prototype);
    this.Message = opts.Message;
  }
};
var ResourceNotFoundException6 = class extends SchedulerServiceException {
  constructor(opts) {
    super({
      name: "ResourceNotFoundException",
      $fault: "client",
      ...opts
    });
    this.name = "ResourceNotFoundException";
    this.$fault = "client";
    Object.setPrototypeOf(this, ResourceNotFoundException6.prototype);
    this.Message = opts.Message;
  }
};
var ThrottlingException3 = class extends SchedulerServiceException {
  constructor(opts) {
    super({
      name: "ThrottlingException",
      $fault: "client",
      ...opts
    });
    this.name = "ThrottlingException";
    this.$fault = "client";
    Object.setPrototypeOf(this, ThrottlingException3.prototype);
    this.Message = opts.Message;
  }
};
var ValidationException = class extends SchedulerServiceException {
  constructor(opts) {
    super({
      name: "ValidationException",
      $fault: "client",
      ...opts
    });
    this.name = "ValidationException";
    this.$fault = "client";
    Object.setPrototypeOf(this, ValidationException.prototype);
    this.Message = opts.Message;
  }
};
var ConflictException3 = class extends SchedulerServiceException {
  constructor(opts) {
    super({
      name: "ConflictException",
      $fault: "client",
      ...opts
    });
    this.name = "ConflictException";
    this.$fault = "client";
    Object.setPrototypeOf(this, ConflictException3.prototype);
    this.Message = opts.Message;
  }
};
var FlexibleTimeWindowMode;
(function(FlexibleTimeWindowMode2) {
  FlexibleTimeWindowMode2["FLEXIBLE"] = "FLEXIBLE";
  FlexibleTimeWindowMode2["OFF"] = "OFF";
})(FlexibleTimeWindowMode || (FlexibleTimeWindowMode = {}));
var ScheduleState;
(function(ScheduleState2) {
  ScheduleState2["DISABLED"] = "DISABLED";
  ScheduleState2["ENABLED"] = "ENABLED";
})(ScheduleState || (ScheduleState = {}));
var LaunchType;
(function(LaunchType2) {
  LaunchType2["EC2"] = "EC2";
  LaunchType2["EXTERNAL"] = "EXTERNAL";
  LaunchType2["FARGATE"] = "FARGATE";
})(LaunchType || (LaunchType = {}));
var PlacementConstraintType;
(function(PlacementConstraintType2) {
  PlacementConstraintType2["DISTINCT_INSTANCE"] = "distinctInstance";
  PlacementConstraintType2["MEMBER_OF"] = "memberOf";
})(PlacementConstraintType || (PlacementConstraintType = {}));
var PlacementStrategyType;
(function(PlacementStrategyType2) {
  PlacementStrategyType2["BINPACK"] = "binpack";
  PlacementStrategyType2["RANDOM"] = "random";
  PlacementStrategyType2["SPREAD"] = "spread";
})(PlacementStrategyType || (PlacementStrategyType = {}));
var PropagateTags;
(function(PropagateTags2) {
  PropagateTags2["TASK_DEFINITION"] = "TASK_DEFINITION";
})(PropagateTags || (PropagateTags = {}));
var ServiceQuotaExceededException = class extends SchedulerServiceException {
  constructor(opts) {
    super({
      name: "ServiceQuotaExceededException",
      $fault: "client",
      ...opts
    });
    this.name = "ServiceQuotaExceededException";
    this.$fault = "client";
    Object.setPrototypeOf(this, ServiceQuotaExceededException.prototype);
    this.Message = opts.Message;
  }
};
var ScheduleGroupState;
(function(ScheduleGroupState2) {
  ScheduleGroupState2["ACTIVE"] = "ACTIVE";
  ScheduleGroupState2["DELETING"] = "DELETING";
})(ScheduleGroupState || (ScheduleGroupState = {}));
var CreateScheduleInputFilterSensitiveLog = (obj) => ({
  ...obj
});
var CreateScheduleOutputFilterSensitiveLog = (obj) => ({
  ...obj
});
var DeleteScheduleInputFilterSensitiveLog = (obj) => ({
  ...obj
});
var DeleteScheduleOutputFilterSensitiveLog = (obj) => ({
  ...obj
});

// ../../node_modules/@aws-sdk/client-scheduler/node_modules/uuid/wrapper.mjs
var import_dist3 = __toESM(require_dist3(), 1);
var v13 = import_dist3.default.v1;
var v33 = import_dist3.default.v3;
var v43 = import_dist3.default.v4;
var v53 = import_dist3.default.v5;
var NIL3 = import_dist3.default.NIL;
var version3 = import_dist3.default.version;
var validate3 = import_dist3.default.validate;
var stringify3 = import_dist3.default.stringify;
var parse4 = import_dist3.default.parse;

// ../../node_modules/@aws-sdk/client-scheduler/dist-es/protocols/Aws_restJson1.js
var serializeAws_restJson1CreateScheduleCommand = async (input, context) => {
  const { hostname, protocol = "https", port, path: basePath } = await context.endpoint();
  const headers = {
    "content-type": "application/json"
  };
  let resolvedPath2 = `${basePath?.endsWith("/") ? basePath.slice(0, -1) : basePath || ""}/schedules/{Name}`;
  resolvedPath2 = resolvedPath(resolvedPath2, input, "Name", () => input.Name, "{Name}", false);
  let body;
  body = JSON.stringify({
    ClientToken: input.ClientToken ?? v43(),
    ...input.Description != null && { Description: input.Description },
    ...input.EndDate != null && { EndDate: Math.round(input.EndDate.getTime() / 1e3) },
    ...input.FlexibleTimeWindow != null && {
      FlexibleTimeWindow: serializeAws_restJson1FlexibleTimeWindow(input.FlexibleTimeWindow, context)
    },
    ...input.GroupName != null && { GroupName: input.GroupName },
    ...input.KmsKeyArn != null && { KmsKeyArn: input.KmsKeyArn },
    ...input.ScheduleExpression != null && { ScheduleExpression: input.ScheduleExpression },
    ...input.ScheduleExpressionTimezone != null && { ScheduleExpressionTimezone: input.ScheduleExpressionTimezone },
    ...input.StartDate != null && { StartDate: Math.round(input.StartDate.getTime() / 1e3) },
    ...input.State != null && { State: input.State },
    ...input.Target != null && { Target: serializeAws_restJson1Target(input.Target, context) }
  });
  return new HttpRequest({
    protocol,
    hostname,
    port,
    method: "POST",
    headers,
    path: resolvedPath2,
    body
  });
};
var serializeAws_restJson1DeleteScheduleCommand = async (input, context) => {
  const { hostname, protocol = "https", port, path: basePath } = await context.endpoint();
  const headers = {};
  let resolvedPath2 = `${basePath?.endsWith("/") ? basePath.slice(0, -1) : basePath || ""}/schedules/{Name}`;
  resolvedPath2 = resolvedPath(resolvedPath2, input, "Name", () => input.Name, "{Name}", false);
  const query = map7({
    groupName: [, input.GroupName],
    clientToken: [, input.ClientToken ?? v43()]
  });
  let body;
  return new HttpRequest({
    protocol,
    hostname,
    port,
    method: "DELETE",
    headers,
    path: resolvedPath2,
    query,
    body
  });
};
var deserializeAws_restJson1CreateScheduleCommand = async (output, context) => {
  if (output.statusCode !== 200 && output.statusCode >= 300) {
    return deserializeAws_restJson1CreateScheduleCommandError(output, context);
  }
  const contents = map7({
    $metadata: deserializeMetadata9(output)
  });
  const data = expectNonNull(expectObject(await parseBody8(output.body, context)), "body");
  if (data.ScheduleArn != null) {
    contents.ScheduleArn = expectString(data.ScheduleArn);
  }
  return contents;
};
var deserializeAws_restJson1CreateScheduleCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody8(output.body, context)
  };
  const errorCode = loadRestJsonErrorCode7(output, parsedOutput.body);
  switch (errorCode) {
    case "ConflictException":
    case "com.amazonaws.scheduler#ConflictException":
      throw await deserializeAws_restJson1ConflictExceptionResponse(parsedOutput, context);
    case "InternalServerException":
    case "com.amazonaws.scheduler#InternalServerException":
      throw await deserializeAws_restJson1InternalServerExceptionResponse2(parsedOutput, context);
    case "ResourceNotFoundException":
    case "com.amazonaws.scheduler#ResourceNotFoundException":
      throw await deserializeAws_restJson1ResourceNotFoundExceptionResponse3(parsedOutput, context);
    case "ServiceQuotaExceededException":
    case "com.amazonaws.scheduler#ServiceQuotaExceededException":
      throw await deserializeAws_restJson1ServiceQuotaExceededExceptionResponse(parsedOutput, context);
    case "ThrottlingException":
    case "com.amazonaws.scheduler#ThrottlingException":
      throw await deserializeAws_restJson1ThrottlingExceptionResponse3(parsedOutput, context);
    case "ValidationException":
    case "com.amazonaws.scheduler#ValidationException":
      throw await deserializeAws_restJson1ValidationExceptionResponse(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody,
        exceptionCtor: SchedulerServiceException,
        errorCode
      });
  }
};
var deserializeAws_restJson1DeleteScheduleCommand = async (output, context) => {
  if (output.statusCode !== 200 && output.statusCode >= 300) {
    return deserializeAws_restJson1DeleteScheduleCommandError(output, context);
  }
  const contents = map7({
    $metadata: deserializeMetadata9(output)
  });
  await collectBody8(output.body, context);
  return contents;
};
var deserializeAws_restJson1DeleteScheduleCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody8(output.body, context)
  };
  const errorCode = loadRestJsonErrorCode7(output, parsedOutput.body);
  switch (errorCode) {
    case "ConflictException":
    case "com.amazonaws.scheduler#ConflictException":
      throw await deserializeAws_restJson1ConflictExceptionResponse(parsedOutput, context);
    case "InternalServerException":
    case "com.amazonaws.scheduler#InternalServerException":
      throw await deserializeAws_restJson1InternalServerExceptionResponse2(parsedOutput, context);
    case "ResourceNotFoundException":
    case "com.amazonaws.scheduler#ResourceNotFoundException":
      throw await deserializeAws_restJson1ResourceNotFoundExceptionResponse3(parsedOutput, context);
    case "ThrottlingException":
    case "com.amazonaws.scheduler#ThrottlingException":
      throw await deserializeAws_restJson1ThrottlingExceptionResponse3(parsedOutput, context);
    case "ValidationException":
    case "com.amazonaws.scheduler#ValidationException":
      throw await deserializeAws_restJson1ValidationExceptionResponse(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody,
        exceptionCtor: SchedulerServiceException,
        errorCode
      });
  }
};
var map7 = map;
var deserializeAws_restJson1ConflictExceptionResponse = async (parsedOutput, context) => {
  const contents = map7({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  const exception = new ConflictException3({
    $metadata: deserializeMetadata9(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1InternalServerExceptionResponse2 = async (parsedOutput, context) => {
  const contents = map7({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  const exception = new InternalServerException2({
    $metadata: deserializeMetadata9(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1ResourceNotFoundExceptionResponse3 = async (parsedOutput, context) => {
  const contents = map7({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  const exception = new ResourceNotFoundException6({
    $metadata: deserializeMetadata9(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1ServiceQuotaExceededExceptionResponse = async (parsedOutput, context) => {
  const contents = map7({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  const exception = new ServiceQuotaExceededException({
    $metadata: deserializeMetadata9(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1ThrottlingExceptionResponse3 = async (parsedOutput, context) => {
  const contents = map7({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  const exception = new ThrottlingException3({
    $metadata: deserializeMetadata9(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1ValidationExceptionResponse = async (parsedOutput, context) => {
  const contents = map7({});
  const data = parsedOutput.body;
  if (data.Message != null) {
    contents.Message = expectString(data.Message);
  }
  const exception = new ValidationException({
    $metadata: deserializeMetadata9(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var serializeAws_restJson1AwsVpcConfiguration = (input, context) => {
  return {
    ...input.AssignPublicIp != null && { AssignPublicIp: input.AssignPublicIp },
    ...input.SecurityGroups != null && {
      SecurityGroups: serializeAws_restJson1SecurityGroups(input.SecurityGroups, context)
    },
    ...input.Subnets != null && { Subnets: serializeAws_restJson1Subnets(input.Subnets, context) }
  };
};
var serializeAws_restJson1CapacityProviderStrategy = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return serializeAws_restJson1CapacityProviderStrategyItem(entry, context);
  });
};
var serializeAws_restJson1CapacityProviderStrategyItem = (input, context) => {
  return {
    ...input.base != null && { base: input.base },
    ...input.capacityProvider != null && { capacityProvider: input.capacityProvider },
    ...input.weight != null && { weight: input.weight }
  };
};
var serializeAws_restJson1DeadLetterConfig = (input, context) => {
  return {
    ...input.Arn != null && { Arn: input.Arn }
  };
};
var serializeAws_restJson1EcsParameters = (input, context) => {
  return {
    ...input.CapacityProviderStrategy != null && {
      CapacityProviderStrategy: serializeAws_restJson1CapacityProviderStrategy(input.CapacityProviderStrategy, context)
    },
    ...input.EnableECSManagedTags != null && { EnableECSManagedTags: input.EnableECSManagedTags },
    ...input.EnableExecuteCommand != null && { EnableExecuteCommand: input.EnableExecuteCommand },
    ...input.Group != null && { Group: input.Group },
    ...input.LaunchType != null && { LaunchType: input.LaunchType },
    ...input.NetworkConfiguration != null && {
      NetworkConfiguration: serializeAws_restJson1NetworkConfiguration(input.NetworkConfiguration, context)
    },
    ...input.PlacementConstraints != null && {
      PlacementConstraints: serializeAws_restJson1PlacementConstraints(input.PlacementConstraints, context)
    },
    ...input.PlacementStrategy != null && {
      PlacementStrategy: serializeAws_restJson1PlacementStrategies(input.PlacementStrategy, context)
    },
    ...input.PlatformVersion != null && { PlatformVersion: input.PlatformVersion },
    ...input.PropagateTags != null && { PropagateTags: input.PropagateTags },
    ...input.ReferenceId != null && { ReferenceId: input.ReferenceId },
    ...input.Tags != null && { Tags: serializeAws_restJson1Tags(input.Tags, context) },
    ...input.TaskCount != null && { TaskCount: input.TaskCount },
    ...input.TaskDefinitionArn != null && { TaskDefinitionArn: input.TaskDefinitionArn }
  };
};
var serializeAws_restJson1EventBridgeParameters = (input, context) => {
  return {
    ...input.DetailType != null && { DetailType: input.DetailType },
    ...input.Source != null && { Source: input.Source }
  };
};
var serializeAws_restJson1FlexibleTimeWindow = (input, context) => {
  return {
    ...input.MaximumWindowInMinutes != null && { MaximumWindowInMinutes: input.MaximumWindowInMinutes },
    ...input.Mode != null && { Mode: input.Mode }
  };
};
var serializeAws_restJson1KinesisParameters = (input, context) => {
  return {
    ...input.PartitionKey != null && { PartitionKey: input.PartitionKey }
  };
};
var serializeAws_restJson1NetworkConfiguration = (input, context) => {
  return {
    ...input.awsvpcConfiguration != null && {
      awsvpcConfiguration: serializeAws_restJson1AwsVpcConfiguration(input.awsvpcConfiguration, context)
    }
  };
};
var serializeAws_restJson1PlacementConstraint = (input, context) => {
  return {
    ...input.expression != null && { expression: input.expression },
    ...input.type != null && { type: input.type }
  };
};
var serializeAws_restJson1PlacementConstraints = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return serializeAws_restJson1PlacementConstraint(entry, context);
  });
};
var serializeAws_restJson1PlacementStrategies = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return serializeAws_restJson1PlacementStrategy(entry, context);
  });
};
var serializeAws_restJson1PlacementStrategy = (input, context) => {
  return {
    ...input.field != null && { field: input.field },
    ...input.type != null && { type: input.type }
  };
};
var serializeAws_restJson1RetryPolicy = (input, context) => {
  return {
    ...input.MaximumEventAgeInSeconds != null && { MaximumEventAgeInSeconds: input.MaximumEventAgeInSeconds },
    ...input.MaximumRetryAttempts != null && { MaximumRetryAttempts: input.MaximumRetryAttempts }
  };
};
var serializeAws_restJson1SageMakerPipelineParameter = (input, context) => {
  return {
    ...input.Name != null && { Name: input.Name },
    ...input.Value != null && { Value: input.Value }
  };
};
var serializeAws_restJson1SageMakerPipelineParameterList = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return serializeAws_restJson1SageMakerPipelineParameter(entry, context);
  });
};
var serializeAws_restJson1SageMakerPipelineParameters = (input, context) => {
  return {
    ...input.PipelineParameterList != null && {
      PipelineParameterList: serializeAws_restJson1SageMakerPipelineParameterList(input.PipelineParameterList, context)
    }
  };
};
var serializeAws_restJson1SecurityGroups = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return entry;
  });
};
var serializeAws_restJson1SqsParameters = (input, context) => {
  return {
    ...input.MessageGroupId != null && { MessageGroupId: input.MessageGroupId }
  };
};
var serializeAws_restJson1Subnets = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return entry;
  });
};
var serializeAws_restJson1TagMap = (input, context) => {
  return Object.entries(input).reduce((acc, [key, value]) => {
    if (value === null) {
      return acc;
    }
    acc[key] = value;
    return acc;
  }, {});
};
var serializeAws_restJson1Tags = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return serializeAws_restJson1TagMap(entry, context);
  });
};
var serializeAws_restJson1Target = (input, context) => {
  return {
    ...input.Arn != null && { Arn: input.Arn },
    ...input.DeadLetterConfig != null && {
      DeadLetterConfig: serializeAws_restJson1DeadLetterConfig(input.DeadLetterConfig, context)
    },
    ...input.EcsParameters != null && {
      EcsParameters: serializeAws_restJson1EcsParameters(input.EcsParameters, context)
    },
    ...input.EventBridgeParameters != null && {
      EventBridgeParameters: serializeAws_restJson1EventBridgeParameters(input.EventBridgeParameters, context)
    },
    ...input.Input != null && { Input: input.Input },
    ...input.KinesisParameters != null && {
      KinesisParameters: serializeAws_restJson1KinesisParameters(input.KinesisParameters, context)
    },
    ...input.RetryPolicy != null && { RetryPolicy: serializeAws_restJson1RetryPolicy(input.RetryPolicy, context) },
    ...input.RoleArn != null && { RoleArn: input.RoleArn },
    ...input.SageMakerPipelineParameters != null && {
      SageMakerPipelineParameters: serializeAws_restJson1SageMakerPipelineParameters(input.SageMakerPipelineParameters, context)
    },
    ...input.SqsParameters != null && {
      SqsParameters: serializeAws_restJson1SqsParameters(input.SqsParameters, context)
    }
  };
};
var deserializeMetadata9 = (output) => ({
  httpStatusCode: output.statusCode,
  requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
  extendedRequestId: output.headers["x-amz-id-2"],
  cfId: output.headers["x-amz-cf-id"]
});
var collectBody8 = (streamBody = new Uint8Array(), context) => {
  if (streamBody instanceof Uint8Array) {
    return Promise.resolve(streamBody);
  }
  return context.streamCollector(streamBody) || Promise.resolve(new Uint8Array());
};
var collectBodyString8 = (streamBody, context) => collectBody8(streamBody, context).then((body) => context.utf8Encoder(body));
var parseBody8 = (streamBody, context) => collectBodyString8(streamBody, context).then((encoded) => {
  if (encoded.length) {
    return JSON.parse(encoded);
  }
  return {};
});
var parseErrorBody8 = async (errorBody, context) => {
  const value = await parseBody8(errorBody, context);
  value.message = value.message ?? value.Message;
  return value;
};
var loadRestJsonErrorCode7 = (output, data) => {
  const findKey = (object, key) => Object.keys(object).find((k13) => k13.toLowerCase() === key.toLowerCase());
  const sanitizeErrorCode = (rawValue) => {
    let cleanValue = rawValue;
    if (typeof cleanValue === "number") {
      cleanValue = cleanValue.toString();
    }
    if (cleanValue.indexOf(",") >= 0) {
      cleanValue = cleanValue.split(",")[0];
    }
    if (cleanValue.indexOf(":") >= 0) {
      cleanValue = cleanValue.split(":")[0];
    }
    if (cleanValue.indexOf("#") >= 0) {
      cleanValue = cleanValue.split("#")[1];
    }
    return cleanValue;
  };
  const headerKey = findKey(output.headers, "x-amzn-errortype");
  if (headerKey !== void 0) {
    return sanitizeErrorCode(output.headers[headerKey]);
  }
  if (data.code !== void 0) {
    return sanitizeErrorCode(data.code);
  }
  if (data["__type"] !== void 0) {
    return sanitizeErrorCode(data["__type"]);
  }
};

// ../../node_modules/@aws-sdk/client-scheduler/dist-es/commands/CreateScheduleCommand.js
var CreateScheduleCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, CreateScheduleCommand.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "SchedulerClient";
    const commandName = "CreateScheduleCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: CreateScheduleInputFilterSensitiveLog,
      outputFilterSensitiveLog: CreateScheduleOutputFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_restJson1CreateScheduleCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_restJson1CreateScheduleCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-scheduler/dist-es/commands/DeleteScheduleCommand.js
var DeleteScheduleCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, DeleteScheduleCommand.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "SchedulerClient";
    const commandName = "DeleteScheduleCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: DeleteScheduleInputFilterSensitiveLog,
      outputFilterSensitiveLog: DeleteScheduleOutputFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_restJson1DeleteScheduleCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_restJson1DeleteScheduleCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-scheduler/dist-es/endpoint/EndpointParameters.js
var resolveClientEndpointParameters8 = (options) => {
  return {
    ...options,
    useDualstackEndpoint: options.useDualstackEndpoint ?? false,
    useFipsEndpoint: options.useFipsEndpoint ?? false,
    defaultSigningName: "scheduler"
  };
};

// ../../node_modules/@aws-sdk/client-scheduler/package.json
var package_default8 = {
  name: "@aws-sdk/client-scheduler",
  description: "AWS SDK for JavaScript Scheduler Client for Node.js, Browser and React Native",
  version: "3.256.0",
  scripts: {
    build: "concurrently 'yarn:build:cjs' 'yarn:build:es' 'yarn:build:types'",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "build:docs": "typedoc",
    "build:es": "tsc -p tsconfig.es.json",
    "build:include:deps": "lerna run --scope $npm_package_name --include-dependencies build",
    "build:types": "tsc -p tsconfig.types.json",
    "build:types:downlevel": "downlevel-dts dist-types dist-types/ts3.4",
    clean: "rimraf ./dist-* && rimraf *.tsbuildinfo",
    "generate:client": "node ../../scripts/generate-clients/single-service --solo scheduler"
  },
  main: "./dist-cjs/index.js",
  types: "./dist-types/index.d.ts",
  module: "./dist-es/index.js",
  sideEffects: false,
  dependencies: {
    "@aws-crypto/sha256-browser": "3.0.0",
    "@aws-crypto/sha256-js": "3.0.0",
    "@aws-sdk/client-sts": "3.256.0",
    "@aws-sdk/config-resolver": "3.254.0",
    "@aws-sdk/credential-provider-node": "3.256.0",
    "@aws-sdk/fetch-http-handler": "3.254.0",
    "@aws-sdk/hash-node": "3.254.0",
    "@aws-sdk/invalid-dependency": "3.254.0",
    "@aws-sdk/middleware-content-length": "3.254.0",
    "@aws-sdk/middleware-endpoint": "3.254.0",
    "@aws-sdk/middleware-host-header": "3.254.0",
    "@aws-sdk/middleware-logger": "3.254.0",
    "@aws-sdk/middleware-recursion-detection": "3.254.0",
    "@aws-sdk/middleware-retry": "3.254.0",
    "@aws-sdk/middleware-serde": "3.254.0",
    "@aws-sdk/middleware-signing": "3.254.0",
    "@aws-sdk/middleware-stack": "3.254.0",
    "@aws-sdk/middleware-user-agent": "3.254.0",
    "@aws-sdk/node-config-provider": "3.254.0",
    "@aws-sdk/node-http-handler": "3.254.0",
    "@aws-sdk/protocol-http": "3.254.0",
    "@aws-sdk/smithy-client": "3.254.0",
    "@aws-sdk/types": "3.254.0",
    "@aws-sdk/url-parser": "3.254.0",
    "@aws-sdk/util-base64": "3.208.0",
    "@aws-sdk/util-body-length-browser": "3.188.0",
    "@aws-sdk/util-body-length-node": "3.208.0",
    "@aws-sdk/util-defaults-mode-browser": "3.254.0",
    "@aws-sdk/util-defaults-mode-node": "3.254.0",
    "@aws-sdk/util-endpoints": "3.254.0",
    "@aws-sdk/util-retry": "3.254.0",
    "@aws-sdk/util-user-agent-browser": "3.254.0",
    "@aws-sdk/util-user-agent-node": "3.254.0",
    "@aws-sdk/util-utf8-browser": "3.188.0",
    "@aws-sdk/util-utf8-node": "3.208.0",
    tslib: "^2.3.1",
    uuid: "^8.3.2"
  },
  devDependencies: {
    "@aws-sdk/service-client-documentation-generator": "3.208.0",
    "@tsconfig/node14": "1.0.3",
    "@types/node": "^14.14.31",
    "@types/uuid": "^8.3.0",
    concurrently: "7.0.0",
    "downlevel-dts": "0.10.1",
    rimraf: "3.0.2",
    typedoc: "0.19.2",
    typescript: "~4.6.2"
  },
  overrides: {
    typedoc: {
      typescript: "~4.6.2"
    }
  },
  engines: {
    node: ">=14.0.0"
  },
  typesVersions: {
    "<4.0": {
      "dist-types/*": [
        "dist-types/ts3.4/*"
      ]
    }
  },
  files: [
    "dist-*"
  ],
  author: {
    name: "AWS SDK for JavaScript Team",
    url: "https://aws.amazon.com/javascript/"
  },
  license: "Apache-2.0",
  browser: {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.browser"
  },
  "react-native": {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.native"
  },
  homepage: "https://github.com/aws/aws-sdk-js-v3/tree/main/clients/client-scheduler",
  repository: {
    type: "git",
    url: "https://github.com/aws/aws-sdk-js-v3.git",
    directory: "clients/client-scheduler"
  }
};

// ../../node_modules/@aws-sdk/client-scheduler/dist-es/endpoint/ruleset.js
var q8 = "fn";
var r8 = "argv";
var s8 = "ref";
var a8 = true;
var b8 = false;
var c8 = "String";
var d8 = "PartitionResult";
var e8 = "tree";
var f8 = "error";
var g8 = "endpoint";
var h8 = { "required": true, "default": false, "type": "Boolean" };
var i8 = { [s8]: "Endpoint" };
var j8 = { [q8]: "booleanEquals", [r8]: [{ [s8]: "UseFIPS" }, true] };
var k8 = { [q8]: "booleanEquals", [r8]: [{ [s8]: "UseDualStack" }, true] };
var l8 = {};
var m8 = { [q8]: "booleanEquals", [r8]: [true, { [q8]: "getAttr", [r8]: [{ [s8]: d8 }, "supportsFIPS"] }] };
var n8 = { [q8]: "booleanEquals", [r8]: [true, { [q8]: "getAttr", [r8]: [{ [s8]: d8 }, "supportsDualStack"] }] };
var o8 = [j8];
var p8 = [k8];
var _data8 = { version: "1.0", parameters: { Region: { required: a8, type: c8 }, UseDualStack: h8, UseFIPS: h8, Endpoint: { required: b8, type: c8 } }, rules: [{ conditions: [{ [q8]: "aws.partition", [r8]: [{ [s8]: "Region" }], assign: d8 }], type: e8, rules: [{ conditions: [{ [q8]: "isSet", [r8]: [i8] }], type: e8, rules: [{ conditions: o8, error: "Invalid Configuration: FIPS and custom endpoint are not supported", type: f8 }, { type: e8, rules: [{ conditions: p8, error: "Invalid Configuration: Dualstack and custom endpoint are not supported", type: f8 }, { endpoint: { url: i8, properties: l8, headers: l8 }, type: g8 }] }] }, { conditions: [j8, k8], type: e8, rules: [{ conditions: [m8, n8], type: e8, rules: [{ endpoint: { url: "https://scheduler-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: l8, headers: l8 }, type: g8 }] }, { error: "FIPS and DualStack are enabled, but this partition does not support one or both", type: f8 }] }, { conditions: o8, type: e8, rules: [{ conditions: [m8], type: e8, rules: [{ endpoint: { url: "https://scheduler-fips.{Region}.{PartitionResult#dnsSuffix}", properties: l8, headers: l8 }, type: g8 }] }, { error: "FIPS is enabled but this partition does not support FIPS", type: f8 }] }, { conditions: p8, type: e8, rules: [{ conditions: [n8], type: e8, rules: [{ endpoint: { url: "https://scheduler.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: l8, headers: l8 }, type: g8 }] }, { error: "DualStack is enabled but this partition does not support DualStack", type: f8 }] }, { endpoint: { url: "https://scheduler.{Region}.{PartitionResult#dnsSuffix}", properties: l8, headers: l8 }, type: g8 }] }] };
var ruleSet8 = _data8;

// ../../node_modules/@aws-sdk/client-scheduler/dist-es/endpoint/endpointResolver.js
var defaultEndpointResolver8 = (endpointParams, context = {}) => {
  return resolveEndpoint(ruleSet8, {
    endpointParams,
    logger: context.logger
  });
};

// ../../node_modules/@aws-sdk/client-scheduler/dist-es/runtimeConfig.shared.js
var getRuntimeConfig15 = (config) => ({
  apiVersion: "2021-06-30",
  base64Decoder: config?.base64Decoder ?? fromBase64,
  base64Encoder: config?.base64Encoder ?? toBase64,
  disableHostPrefix: config?.disableHostPrefix ?? false,
  endpointProvider: config?.endpointProvider ?? defaultEndpointResolver8,
  logger: config?.logger ?? new NoOpLogger(),
  serviceId: config?.serviceId ?? "Scheduler",
  urlParser: config?.urlParser ?? parseUrl
});

// ../../node_modules/@aws-sdk/client-scheduler/dist-es/runtimeConfig.js
var getRuntimeConfig16 = (config) => {
  emitWarningIfUnsupportedVersion(process.version);
  const defaultsMode = resolveDefaultsModeConfig(config);
  const defaultConfigProvider = () => defaultsMode().then(loadConfigsForDefaultMode);
  const clientSharedValues = getRuntimeConfig15(config);
  return {
    ...clientSharedValues,
    ...config,
    runtime: "node",
    defaultsMode,
    bodyLengthChecker: config?.bodyLengthChecker ?? calculateBodyLength,
    credentialDefaultProvider: config?.credentialDefaultProvider ?? decorateDefaultCredentialProvider2(defaultProvider),
    defaultUserAgentProvider: config?.defaultUserAgentProvider ?? defaultUserAgent({ serviceId: clientSharedValues.serviceId, clientVersion: package_default8.version }),
    maxAttempts: config?.maxAttempts ?? loadConfig(NODE_MAX_ATTEMPT_CONFIG_OPTIONS),
    region: config?.region ?? loadConfig(NODE_REGION_CONFIG_OPTIONS, NODE_REGION_CONFIG_FILE_OPTIONS),
    requestHandler: config?.requestHandler ?? new NodeHttpHandler(defaultConfigProvider),
    retryMode: config?.retryMode ?? loadConfig({
      ...NODE_RETRY_MODE_CONFIG_OPTIONS,
      default: async () => (await defaultConfigProvider()).retryMode || DEFAULT_RETRY_MODE
    }),
    sha256: config?.sha256 ?? Hash.bind(null, "sha256"),
    streamCollector: config?.streamCollector ?? streamCollector,
    useDualstackEndpoint: config?.useDualstackEndpoint ?? loadConfig(NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS),
    useFipsEndpoint: config?.useFipsEndpoint ?? loadConfig(NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS),
    utf8Decoder: config?.utf8Decoder ?? fromUtf82,
    utf8Encoder: config?.utf8Encoder ?? toUtf8
  };
};

// ../../node_modules/@aws-sdk/client-scheduler/dist-es/SchedulerClient.js
var SchedulerClient = class extends Client {
  constructor(configuration) {
    const _config_0 = getRuntimeConfig16(configuration);
    const _config_1 = resolveClientEndpointParameters8(_config_0);
    const _config_2 = resolveRegionConfig(_config_1);
    const _config_3 = resolveEndpointConfig(_config_2);
    const _config_4 = resolveRetryConfig(_config_3);
    const _config_5 = resolveHostHeaderConfig(_config_4);
    const _config_6 = resolveAwsAuthConfig(_config_5);
    const _config_7 = resolveUserAgentConfig(_config_6);
    super(_config_7);
    this.config = _config_7;
    this.middlewareStack.use(getRetryPlugin(this.config));
    this.middlewareStack.use(getContentLengthPlugin(this.config));
    this.middlewareStack.use(getHostHeaderPlugin(this.config));
    this.middlewareStack.use(getLoggerPlugin(this.config));
    this.middlewareStack.use(getRecursionDetectionPlugin(this.config));
    this.middlewareStack.use(getAwsAuthPlugin(this.config));
    this.middlewareStack.use(getUserAgentPlugin(this.config));
  }
  destroy() {
    super.destroy();
  }
};

// src/mocks/scheduler.ts
var import_aws_sdk_client_mock4 = require("aws-sdk-client-mock");
var mockScheduler = (lambdas) => {
  const list = mockObjectKeys(lambdas);
  (0, import_aws_sdk_client_mock4.mockClient)(SchedulerClient).on(CreateScheduleCommand).callsFake(async (input) => {
    const parts = input.Target?.Arn?.split(":") || [];
    const name = parts[parts.length - 1];
    const callback = list[name];
    if (!callback) {
      throw new TypeError(`Scheduler mock function not defined for: ${name}`);
    }
    const payload = input.Target?.Input ? JSON.parse(input.Target.Input) : void 0;
    await asyncCall(callback, payload);
  }).on(DeleteScheduleCommand).callsFake(async (_) => {
  });
  beforeEach(() => {
    Object.values(list).forEach((fn) => {
      fn.mockClear();
    });
  });
  return list;
};

// ../../node_modules/@aws-sdk/client-sns/dist-es/models/SNSServiceException.js
var SNSServiceException = class extends ServiceException {
  constructor(options) {
    super(options);
    Object.setPrototypeOf(this, SNSServiceException.prototype);
  }
};

// ../../node_modules/@aws-sdk/client-sns/dist-es/models/models_0.js
var AuthorizationErrorException = class extends SNSServiceException {
  constructor(opts) {
    super({
      name: "AuthorizationErrorException",
      $fault: "client",
      ...opts
    });
    this.name = "AuthorizationErrorException";
    this.$fault = "client";
    Object.setPrototypeOf(this, AuthorizationErrorException.prototype);
  }
};
var InternalErrorException = class extends SNSServiceException {
  constructor(opts) {
    super({
      name: "InternalErrorException",
      $fault: "server",
      ...opts
    });
    this.name = "InternalErrorException";
    this.$fault = "server";
    Object.setPrototypeOf(this, InternalErrorException.prototype);
  }
};
var InvalidParameterException = class extends SNSServiceException {
  constructor(opts) {
    super({
      name: "InvalidParameterException",
      $fault: "client",
      ...opts
    });
    this.name = "InvalidParameterException";
    this.$fault = "client";
    Object.setPrototypeOf(this, InvalidParameterException.prototype);
  }
};
var NotFoundException = class extends SNSServiceException {
  constructor(opts) {
    super({
      name: "NotFoundException",
      $fault: "client",
      ...opts
    });
    this.name = "NotFoundException";
    this.$fault = "client";
    Object.setPrototypeOf(this, NotFoundException.prototype);
  }
};
var LanguageCodeString;
(function(LanguageCodeString2) {
  LanguageCodeString2["de_DE"] = "de-DE";
  LanguageCodeString2["en_GB"] = "en-GB";
  LanguageCodeString2["en_US"] = "en-US";
  LanguageCodeString2["es_419"] = "es-419";
  LanguageCodeString2["es_ES"] = "es-ES";
  LanguageCodeString2["fr_CA"] = "fr-CA";
  LanguageCodeString2["fr_FR"] = "fr-FR";
  LanguageCodeString2["it_IT"] = "it-IT";
  LanguageCodeString2["jp_JP"] = "ja-JP";
  LanguageCodeString2["kr_KR"] = "kr-KR";
  LanguageCodeString2["pt_BR"] = "pt-BR";
  LanguageCodeString2["zh_CN"] = "zh-CN";
  LanguageCodeString2["zh_TW"] = "zh-TW";
})(LanguageCodeString || (LanguageCodeString = {}));
var InvalidSecurityException = class extends SNSServiceException {
  constructor(opts) {
    super({
      name: "InvalidSecurityException",
      $fault: "client",
      ...opts
    });
    this.name = "InvalidSecurityException";
    this.$fault = "client";
    Object.setPrototypeOf(this, InvalidSecurityException.prototype);
  }
};
var NumberCapability;
(function(NumberCapability2) {
  NumberCapability2["MMS"] = "MMS";
  NumberCapability2["SMS"] = "SMS";
  NumberCapability2["VOICE"] = "VOICE";
})(NumberCapability || (NumberCapability = {}));
var RouteType;
(function(RouteType2) {
  RouteType2["Premium"] = "Premium";
  RouteType2["Promotional"] = "Promotional";
  RouteType2["Transactional"] = "Transactional";
})(RouteType || (RouteType = {}));
var ValidationException2 = class extends SNSServiceException {
  constructor(opts) {
    super({
      name: "ValidationException",
      $fault: "client",
      ...opts
    });
    this.name = "ValidationException";
    this.$fault = "client";
    Object.setPrototypeOf(this, ValidationException2.prototype);
    this.Message = opts.Message;
  }
};
var SMSSandboxPhoneNumberVerificationStatus;
(function(SMSSandboxPhoneNumberVerificationStatus2) {
  SMSSandboxPhoneNumberVerificationStatus2["Pending"] = "Pending";
  SMSSandboxPhoneNumberVerificationStatus2["Verified"] = "Verified";
})(SMSSandboxPhoneNumberVerificationStatus || (SMSSandboxPhoneNumberVerificationStatus = {}));
var EndpointDisabledException = class extends SNSServiceException {
  constructor(opts) {
    super({
      name: "EndpointDisabledException",
      $fault: "client",
      ...opts
    });
    this.name = "EndpointDisabledException";
    this.$fault = "client";
    Object.setPrototypeOf(this, EndpointDisabledException.prototype);
  }
};
var InvalidParameterValueException2 = class extends SNSServiceException {
  constructor(opts) {
    super({
      name: "InvalidParameterValueException",
      $fault: "client",
      ...opts
    });
    this.name = "InvalidParameterValueException";
    this.$fault = "client";
    Object.setPrototypeOf(this, InvalidParameterValueException2.prototype);
  }
};
var KMSAccessDeniedException2 = class extends SNSServiceException {
  constructor(opts) {
    super({
      name: "KMSAccessDeniedException",
      $fault: "client",
      ...opts
    });
    this.name = "KMSAccessDeniedException";
    this.$fault = "client";
    Object.setPrototypeOf(this, KMSAccessDeniedException2.prototype);
  }
};
var KMSDisabledException2 = class extends SNSServiceException {
  constructor(opts) {
    super({
      name: "KMSDisabledException",
      $fault: "client",
      ...opts
    });
    this.name = "KMSDisabledException";
    this.$fault = "client";
    Object.setPrototypeOf(this, KMSDisabledException2.prototype);
  }
};
var KMSInvalidStateException2 = class extends SNSServiceException {
  constructor(opts) {
    super({
      name: "KMSInvalidStateException",
      $fault: "client",
      ...opts
    });
    this.name = "KMSInvalidStateException";
    this.$fault = "client";
    Object.setPrototypeOf(this, KMSInvalidStateException2.prototype);
  }
};
var KMSNotFoundException2 = class extends SNSServiceException {
  constructor(opts) {
    super({
      name: "KMSNotFoundException",
      $fault: "client",
      ...opts
    });
    this.name = "KMSNotFoundException";
    this.$fault = "client";
    Object.setPrototypeOf(this, KMSNotFoundException2.prototype);
  }
};
var KMSOptInRequired = class extends SNSServiceException {
  constructor(opts) {
    super({
      name: "KMSOptInRequired",
      $fault: "client",
      ...opts
    });
    this.name = "KMSOptInRequired";
    this.$fault = "client";
    Object.setPrototypeOf(this, KMSOptInRequired.prototype);
  }
};
var KMSThrottlingException = class extends SNSServiceException {
  constructor(opts) {
    super({
      name: "KMSThrottlingException",
      $fault: "client",
      ...opts
    });
    this.name = "KMSThrottlingException";
    this.$fault = "client";
    Object.setPrototypeOf(this, KMSThrottlingException.prototype);
  }
};
var PlatformApplicationDisabledException = class extends SNSServiceException {
  constructor(opts) {
    super({
      name: "PlatformApplicationDisabledException",
      $fault: "client",
      ...opts
    });
    this.name = "PlatformApplicationDisabledException";
    this.$fault = "client";
    Object.setPrototypeOf(this, PlatformApplicationDisabledException.prototype);
  }
};
var PublishInputFilterSensitiveLog = (obj) => ({
  ...obj
});
var PublishResponseFilterSensitiveLog = (obj) => ({
  ...obj
});

// ../../node_modules/@aws-sdk/client-sns/dist-es/protocols/Aws_query.js
var import_fast_xml_parser2 = __toESM(require_fxp());
var serializeAws_queryPublishCommand = async (input, context) => {
  const headers = {
    "content-type": "application/x-www-form-urlencoded"
  };
  let body;
  body = buildFormUrlencodedString2({
    ...serializeAws_queryPublishInput(input, context),
    Action: "Publish",
    Version: "2010-03-31"
  });
  return buildHttpRpcRequest3(context, headers, "/", void 0, body);
};
var deserializeAws_queryPublishCommand = async (output, context) => {
  if (output.statusCode >= 300) {
    return deserializeAws_queryPublishCommandError(output, context);
  }
  const data = await parseBody9(output.body, context);
  let contents = {};
  contents = deserializeAws_queryPublishResponse(data.PublishResult, context);
  const response = {
    $metadata: deserializeMetadata10(output),
    ...contents
  };
  return Promise.resolve(response);
};
var deserializeAws_queryPublishCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody9(output.body, context)
  };
  const errorCode = loadQueryErrorCode2(output, parsedOutput.body);
  switch (errorCode) {
    case "AuthorizationError":
    case "com.amazonaws.sns#AuthorizationErrorException":
      throw await deserializeAws_queryAuthorizationErrorExceptionResponse(parsedOutput, context);
    case "EndpointDisabled":
    case "com.amazonaws.sns#EndpointDisabledException":
      throw await deserializeAws_queryEndpointDisabledExceptionResponse(parsedOutput, context);
    case "InternalError":
    case "com.amazonaws.sns#InternalErrorException":
      throw await deserializeAws_queryInternalErrorExceptionResponse(parsedOutput, context);
    case "InvalidParameter":
    case "com.amazonaws.sns#InvalidParameterException":
      throw await deserializeAws_queryInvalidParameterExceptionResponse(parsedOutput, context);
    case "InvalidSecurity":
    case "com.amazonaws.sns#InvalidSecurityException":
      throw await deserializeAws_queryInvalidSecurityExceptionResponse(parsedOutput, context);
    case "KMSAccessDenied":
    case "com.amazonaws.sns#KMSAccessDeniedException":
      throw await deserializeAws_queryKMSAccessDeniedExceptionResponse(parsedOutput, context);
    case "KMSDisabled":
    case "com.amazonaws.sns#KMSDisabledException":
      throw await deserializeAws_queryKMSDisabledExceptionResponse(parsedOutput, context);
    case "KMSInvalidState":
    case "com.amazonaws.sns#KMSInvalidStateException":
      throw await deserializeAws_queryKMSInvalidStateExceptionResponse(parsedOutput, context);
    case "KMSNotFound":
    case "com.amazonaws.sns#KMSNotFoundException":
      throw await deserializeAws_queryKMSNotFoundExceptionResponse(parsedOutput, context);
    case "KMSOptInRequired":
    case "com.amazonaws.sns#KMSOptInRequired":
      throw await deserializeAws_queryKMSOptInRequiredResponse(parsedOutput, context);
    case "KMSThrottling":
    case "com.amazonaws.sns#KMSThrottlingException":
      throw await deserializeAws_queryKMSThrottlingExceptionResponse(parsedOutput, context);
    case "NotFound":
    case "com.amazonaws.sns#NotFoundException":
      throw await deserializeAws_queryNotFoundExceptionResponse(parsedOutput, context);
    case "ParameterValueInvalid":
    case "com.amazonaws.sns#InvalidParameterValueException":
      throw await deserializeAws_queryInvalidParameterValueExceptionResponse(parsedOutput, context);
    case "PlatformApplicationDisabled":
    case "com.amazonaws.sns#PlatformApplicationDisabledException":
      throw await deserializeAws_queryPlatformApplicationDisabledExceptionResponse(parsedOutput, context);
    case "ValidationException":
    case "com.amazonaws.sns#ValidationException":
      throw await deserializeAws_queryValidationExceptionResponse(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody: parsedBody.Error,
        exceptionCtor: SNSServiceException,
        errorCode
      });
  }
};
var deserializeAws_queryAuthorizationErrorExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryAuthorizationErrorException(body.Error, context);
  const exception = new AuthorizationErrorException({
    $metadata: deserializeMetadata10(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryEndpointDisabledExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryEndpointDisabledException(body.Error, context);
  const exception = new EndpointDisabledException({
    $metadata: deserializeMetadata10(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryInternalErrorExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryInternalErrorException(body.Error, context);
  const exception = new InternalErrorException({
    $metadata: deserializeMetadata10(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryInvalidParameterExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryInvalidParameterException(body.Error, context);
  const exception = new InvalidParameterException({
    $metadata: deserializeMetadata10(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryInvalidParameterValueExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryInvalidParameterValueException(body.Error, context);
  const exception = new InvalidParameterValueException2({
    $metadata: deserializeMetadata10(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryInvalidSecurityExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryInvalidSecurityException(body.Error, context);
  const exception = new InvalidSecurityException({
    $metadata: deserializeMetadata10(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryKMSAccessDeniedExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryKMSAccessDeniedException(body.Error, context);
  const exception = new KMSAccessDeniedException2({
    $metadata: deserializeMetadata10(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryKMSDisabledExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryKMSDisabledException(body.Error, context);
  const exception = new KMSDisabledException2({
    $metadata: deserializeMetadata10(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryKMSInvalidStateExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryKMSInvalidStateException(body.Error, context);
  const exception = new KMSInvalidStateException2({
    $metadata: deserializeMetadata10(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryKMSNotFoundExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryKMSNotFoundException(body.Error, context);
  const exception = new KMSNotFoundException2({
    $metadata: deserializeMetadata10(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryKMSOptInRequiredResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryKMSOptInRequired(body.Error, context);
  const exception = new KMSOptInRequired({
    $metadata: deserializeMetadata10(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryKMSThrottlingExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryKMSThrottlingException(body.Error, context);
  const exception = new KMSThrottlingException({
    $metadata: deserializeMetadata10(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryNotFoundExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryNotFoundException(body.Error, context);
  const exception = new NotFoundException({
    $metadata: deserializeMetadata10(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryPlatformApplicationDisabledExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryPlatformApplicationDisabledException(body.Error, context);
  const exception = new PlatformApplicationDisabledException({
    $metadata: deserializeMetadata10(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryValidationExceptionResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryValidationException(body.Error, context);
  const exception = new ValidationException2({
    $metadata: deserializeMetadata10(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var serializeAws_queryMessageAttributeMap = (input, context) => {
  const entries = {};
  let counter = 1;
  Object.keys(input).filter((key) => input[key] != null).forEach((key) => {
    entries[`entry.${counter}.Name`] = key;
    const memberEntries = serializeAws_queryMessageAttributeValue(input[key], context);
    Object.entries(memberEntries).forEach(([key2, value]) => {
      entries[`entry.${counter}.Value.${key2}`] = value;
    });
    counter++;
  });
  return entries;
};
var serializeAws_queryMessageAttributeValue = (input, context) => {
  const entries = {};
  if (input.DataType != null) {
    entries["DataType"] = input.DataType;
  }
  if (input.StringValue != null) {
    entries["StringValue"] = input.StringValue;
  }
  if (input.BinaryValue != null) {
    entries["BinaryValue"] = context.base64Encoder(input.BinaryValue);
  }
  return entries;
};
var serializeAws_queryPublishInput = (input, context) => {
  const entries = {};
  if (input.TopicArn != null) {
    entries["TopicArn"] = input.TopicArn;
  }
  if (input.TargetArn != null) {
    entries["TargetArn"] = input.TargetArn;
  }
  if (input.PhoneNumber != null) {
    entries["PhoneNumber"] = input.PhoneNumber;
  }
  if (input.Message != null) {
    entries["Message"] = input.Message;
  }
  if (input.Subject != null) {
    entries["Subject"] = input.Subject;
  }
  if (input.MessageStructure != null) {
    entries["MessageStructure"] = input.MessageStructure;
  }
  if (input.MessageAttributes != null) {
    const memberEntries = serializeAws_queryMessageAttributeMap(input.MessageAttributes, context);
    Object.entries(memberEntries).forEach(([key, value]) => {
      const loc = `MessageAttributes.${key}`;
      entries[loc] = value;
    });
  }
  if (input.MessageDeduplicationId != null) {
    entries["MessageDeduplicationId"] = input.MessageDeduplicationId;
  }
  if (input.MessageGroupId != null) {
    entries["MessageGroupId"] = input.MessageGroupId;
  }
  return entries;
};
var deserializeAws_queryAuthorizationErrorException = (output, context) => {
  const contents = {
    message: void 0
  };
  if (output["message"] !== void 0) {
    contents.message = expectString(output["message"]);
  }
  return contents;
};
var deserializeAws_queryEndpointDisabledException = (output, context) => {
  const contents = {
    message: void 0
  };
  if (output["message"] !== void 0) {
    contents.message = expectString(output["message"]);
  }
  return contents;
};
var deserializeAws_queryInternalErrorException = (output, context) => {
  const contents = {
    message: void 0
  };
  if (output["message"] !== void 0) {
    contents.message = expectString(output["message"]);
  }
  return contents;
};
var deserializeAws_queryInvalidParameterException = (output, context) => {
  const contents = {
    message: void 0
  };
  if (output["message"] !== void 0) {
    contents.message = expectString(output["message"]);
  }
  return contents;
};
var deserializeAws_queryInvalidParameterValueException = (output, context) => {
  const contents = {
    message: void 0
  };
  if (output["message"] !== void 0) {
    contents.message = expectString(output["message"]);
  }
  return contents;
};
var deserializeAws_queryInvalidSecurityException = (output, context) => {
  const contents = {
    message: void 0
  };
  if (output["message"] !== void 0) {
    contents.message = expectString(output["message"]);
  }
  return contents;
};
var deserializeAws_queryKMSAccessDeniedException = (output, context) => {
  const contents = {
    message: void 0
  };
  if (output["message"] !== void 0) {
    contents.message = expectString(output["message"]);
  }
  return contents;
};
var deserializeAws_queryKMSDisabledException = (output, context) => {
  const contents = {
    message: void 0
  };
  if (output["message"] !== void 0) {
    contents.message = expectString(output["message"]);
  }
  return contents;
};
var deserializeAws_queryKMSInvalidStateException = (output, context) => {
  const contents = {
    message: void 0
  };
  if (output["message"] !== void 0) {
    contents.message = expectString(output["message"]);
  }
  return contents;
};
var deserializeAws_queryKMSNotFoundException = (output, context) => {
  const contents = {
    message: void 0
  };
  if (output["message"] !== void 0) {
    contents.message = expectString(output["message"]);
  }
  return contents;
};
var deserializeAws_queryKMSOptInRequired = (output, context) => {
  const contents = {
    message: void 0
  };
  if (output["message"] !== void 0) {
    contents.message = expectString(output["message"]);
  }
  return contents;
};
var deserializeAws_queryKMSThrottlingException = (output, context) => {
  const contents = {
    message: void 0
  };
  if (output["message"] !== void 0) {
    contents.message = expectString(output["message"]);
  }
  return contents;
};
var deserializeAws_queryNotFoundException = (output, context) => {
  const contents = {
    message: void 0
  };
  if (output["message"] !== void 0) {
    contents.message = expectString(output["message"]);
  }
  return contents;
};
var deserializeAws_queryPlatformApplicationDisabledException = (output, context) => {
  const contents = {
    message: void 0
  };
  if (output["message"] !== void 0) {
    contents.message = expectString(output["message"]);
  }
  return contents;
};
var deserializeAws_queryPublishResponse = (output, context) => {
  const contents = {
    MessageId: void 0,
    SequenceNumber: void 0
  };
  if (output["MessageId"] !== void 0) {
    contents.MessageId = expectString(output["MessageId"]);
  }
  if (output["SequenceNumber"] !== void 0) {
    contents.SequenceNumber = expectString(output["SequenceNumber"]);
  }
  return contents;
};
var deserializeAws_queryValidationException = (output, context) => {
  const contents = {
    Message: void 0
  };
  if (output["Message"] !== void 0) {
    contents.Message = expectString(output["Message"]);
  }
  return contents;
};
var deserializeMetadata10 = (output) => ({
  httpStatusCode: output.statusCode,
  requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
  extendedRequestId: output.headers["x-amz-id-2"],
  cfId: output.headers["x-amz-cf-id"]
});
var collectBody9 = (streamBody = new Uint8Array(), context) => {
  if (streamBody instanceof Uint8Array) {
    return Promise.resolve(streamBody);
  }
  return context.streamCollector(streamBody) || Promise.resolve(new Uint8Array());
};
var collectBodyString9 = (streamBody, context) => collectBody9(streamBody, context).then((body) => context.utf8Encoder(body));
var buildHttpRpcRequest3 = async (context, headers, path, resolvedHostname, body) => {
  const { hostname, protocol = "https", port, path: basePath } = await context.endpoint();
  const contents = {
    protocol,
    hostname,
    port,
    method: "POST",
    path: basePath.endsWith("/") ? basePath.slice(0, -1) + path : basePath + path,
    headers
  };
  if (resolvedHostname !== void 0) {
    contents.hostname = resolvedHostname;
  }
  if (body !== void 0) {
    contents.body = body;
  }
  return new HttpRequest(contents);
};
var parseBody9 = (streamBody, context) => collectBodyString9(streamBody, context).then((encoded) => {
  if (encoded.length) {
    const parser = new import_fast_xml_parser2.XMLParser({
      attributeNamePrefix: "",
      htmlEntities: true,
      ignoreAttributes: false,
      ignoreDeclaration: true,
      parseTagValue: false,
      trimValues: false,
      tagValueProcessor: (_, val) => val.trim() === "" && val.includes("\n") ? "" : void 0
    });
    parser.addEntity("#xD", "\r");
    parser.addEntity("#10", "\n");
    const parsedObj = parser.parse(encoded);
    const textNodeName = "#text";
    const key = Object.keys(parsedObj)[0];
    const parsedObjToReturn = parsedObj[key];
    if (parsedObjToReturn[textNodeName]) {
      parsedObjToReturn[key] = parsedObjToReturn[textNodeName];
      delete parsedObjToReturn[textNodeName];
    }
    return getValueFromTextNode(parsedObjToReturn);
  }
  return {};
});
var parseErrorBody9 = async (errorBody, context) => {
  const value = await parseBody9(errorBody, context);
  if (value.Error) {
    value.Error.message = value.Error.message ?? value.Error.Message;
  }
  return value;
};
var buildFormUrlencodedString2 = (formEntries) => Object.entries(formEntries).map(([key, value]) => extendedEncodeURIComponent(key) + "=" + extendedEncodeURIComponent(value)).join("&");
var loadQueryErrorCode2 = (output, data) => {
  if (data.Error.Code !== void 0) {
    return data.Error.Code;
  }
  if (output.statusCode == 404) {
    return "NotFound";
  }
};

// ../../node_modules/@aws-sdk/client-sns/dist-es/commands/PublishCommand.js
var PublishCommand2 = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, PublishCommand2.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "SNSClient";
    const commandName = "PublishCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: PublishInputFilterSensitiveLog,
      outputFilterSensitiveLog: PublishResponseFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_queryPublishCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_queryPublishCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-sns/dist-es/endpoint/EndpointParameters.js
var resolveClientEndpointParameters9 = (options) => {
  return {
    ...options,
    useDualstackEndpoint: options.useDualstackEndpoint ?? false,
    useFipsEndpoint: options.useFipsEndpoint ?? false,
    defaultSigningName: "sns"
  };
};

// ../../node_modules/@aws-sdk/client-sns/package.json
var package_default9 = {
  name: "@aws-sdk/client-sns",
  description: "AWS SDK for JavaScript Sns Client for Node.js, Browser and React Native",
  version: "3.256.0",
  scripts: {
    build: "concurrently 'yarn:build:cjs' 'yarn:build:es' 'yarn:build:types'",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "build:docs": "typedoc",
    "build:es": "tsc -p tsconfig.es.json",
    "build:include:deps": "lerna run --scope $npm_package_name --include-dependencies build",
    "build:types": "tsc -p tsconfig.types.json",
    "build:types:downlevel": "downlevel-dts dist-types dist-types/ts3.4",
    clean: "rimraf ./dist-* && rimraf *.tsbuildinfo",
    "generate:client": "node ../../scripts/generate-clients/single-service --solo sns"
  },
  main: "./dist-cjs/index.js",
  types: "./dist-types/index.d.ts",
  module: "./dist-es/index.js",
  sideEffects: false,
  dependencies: {
    "@aws-crypto/sha256-browser": "3.0.0",
    "@aws-crypto/sha256-js": "3.0.0",
    "@aws-sdk/client-sts": "3.256.0",
    "@aws-sdk/config-resolver": "3.254.0",
    "@aws-sdk/credential-provider-node": "3.256.0",
    "@aws-sdk/fetch-http-handler": "3.254.0",
    "@aws-sdk/hash-node": "3.254.0",
    "@aws-sdk/invalid-dependency": "3.254.0",
    "@aws-sdk/middleware-content-length": "3.254.0",
    "@aws-sdk/middleware-endpoint": "3.254.0",
    "@aws-sdk/middleware-host-header": "3.254.0",
    "@aws-sdk/middleware-logger": "3.254.0",
    "@aws-sdk/middleware-recursion-detection": "3.254.0",
    "@aws-sdk/middleware-retry": "3.254.0",
    "@aws-sdk/middleware-serde": "3.254.0",
    "@aws-sdk/middleware-signing": "3.254.0",
    "@aws-sdk/middleware-stack": "3.254.0",
    "@aws-sdk/middleware-user-agent": "3.254.0",
    "@aws-sdk/node-config-provider": "3.254.0",
    "@aws-sdk/node-http-handler": "3.254.0",
    "@aws-sdk/protocol-http": "3.254.0",
    "@aws-sdk/smithy-client": "3.254.0",
    "@aws-sdk/types": "3.254.0",
    "@aws-sdk/url-parser": "3.254.0",
    "@aws-sdk/util-base64": "3.208.0",
    "@aws-sdk/util-body-length-browser": "3.188.0",
    "@aws-sdk/util-body-length-node": "3.208.0",
    "@aws-sdk/util-defaults-mode-browser": "3.254.0",
    "@aws-sdk/util-defaults-mode-node": "3.254.0",
    "@aws-sdk/util-endpoints": "3.254.0",
    "@aws-sdk/util-retry": "3.254.0",
    "@aws-sdk/util-user-agent-browser": "3.254.0",
    "@aws-sdk/util-user-agent-node": "3.254.0",
    "@aws-sdk/util-utf8-browser": "3.188.0",
    "@aws-sdk/util-utf8-node": "3.208.0",
    "fast-xml-parser": "4.0.11",
    tslib: "^2.3.1"
  },
  devDependencies: {
    "@aws-sdk/service-client-documentation-generator": "3.208.0",
    "@tsconfig/node14": "1.0.3",
    "@types/node": "^14.14.31",
    concurrently: "7.0.0",
    "downlevel-dts": "0.10.1",
    rimraf: "3.0.2",
    typedoc: "0.19.2",
    typescript: "~4.6.2"
  },
  overrides: {
    typedoc: {
      typescript: "~4.6.2"
    }
  },
  engines: {
    node: ">=14.0.0"
  },
  typesVersions: {
    "<4.0": {
      "dist-types/*": [
        "dist-types/ts3.4/*"
      ]
    }
  },
  files: [
    "dist-*"
  ],
  author: {
    name: "AWS SDK for JavaScript Team",
    url: "https://aws.amazon.com/javascript/"
  },
  license: "Apache-2.0",
  browser: {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.browser"
  },
  "react-native": {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.native"
  },
  homepage: "https://github.com/aws/aws-sdk-js-v3/tree/main/clients/client-sns",
  repository: {
    type: "git",
    url: "https://github.com/aws/aws-sdk-js-v3.git",
    directory: "clients/client-sns"
  }
};

// ../../node_modules/@aws-sdk/client-sns/dist-es/endpoint/ruleset.js
var r9 = "required";
var s9 = "fn";
var t5 = "argv";
var u4 = "ref";
var a9 = "PartitionResult";
var b9 = "tree";
var c9 = "error";
var d9 = "endpoint";
var e9 = "stringEquals";
var f9 = { [r9]: false, "type": "String" };
var g9 = { [r9]: true, "default": false, "type": "Boolean" };
var h9 = { [u4]: "Region" };
var i9 = { [u4]: "Endpoint" };
var j9 = { [s9]: "booleanEquals", [t5]: [{ [u4]: "UseFIPS" }, true] };
var k9 = { [s9]: "booleanEquals", [t5]: [{ [u4]: "UseDualStack" }, true] };
var l9 = {};
var m9 = { [s9]: "booleanEquals", [t5]: [true, { [s9]: "getAttr", [t5]: [{ [u4]: a9 }, "supportsFIPS"] }] };
var n9 = { [s9]: "booleanEquals", [t5]: [true, { [s9]: "getAttr", [t5]: [{ [u4]: a9 }, "supportsDualStack"] }] };
var o9 = [i9];
var p9 = [j9];
var q9 = [k9];
var _data9 = { version: "1.0", parameters: { Region: f9, UseDualStack: g9, UseFIPS: g9, Endpoint: f9 }, rules: [{ conditions: [{ [s9]: "aws.partition", [t5]: [h9], assign: a9 }], type: b9, rules: [{ conditions: [{ [s9]: "isSet", [t5]: o9 }, { [s9]: "parseURL", [t5]: o9, assign: "url" }], type: b9, rules: [{ conditions: p9, error: "Invalid Configuration: FIPS and custom endpoint are not supported", type: c9 }, { type: b9, rules: [{ conditions: q9, error: "Invalid Configuration: Dualstack and custom endpoint are not supported", type: c9 }, { endpoint: { url: i9, properties: l9, headers: l9 }, type: d9 }] }] }, { conditions: [j9, k9], type: b9, rules: [{ conditions: [m9, n9], type: b9, rules: [{ endpoint: { url: "https://sns-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: l9, headers: l9 }, type: d9 }] }, { error: "FIPS and DualStack are enabled, but this partition does not support one or both", type: c9 }] }, { conditions: p9, type: b9, rules: [{ conditions: [m9], type: b9, rules: [{ type: b9, rules: [{ conditions: [{ [s9]: e9, [t5]: [h9, "us-gov-east-1"] }], endpoint: { url: "https://sns.us-gov-east-1.amazonaws.com", properties: l9, headers: l9 }, type: d9 }, { conditions: [{ [s9]: e9, [t5]: [h9, "us-gov-west-1"] }], endpoint: { url: "https://sns.us-gov-west-1.amazonaws.com", properties: l9, headers: l9 }, type: d9 }, { endpoint: { url: "https://sns-fips.{Region}.{PartitionResult#dnsSuffix}", properties: l9, headers: l9 }, type: d9 }] }] }, { error: "FIPS is enabled but this partition does not support FIPS", type: c9 }] }, { conditions: q9, type: b9, rules: [{ conditions: [n9], type: b9, rules: [{ endpoint: { url: "https://sns.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: l9, headers: l9 }, type: d9 }] }, { error: "DualStack is enabled but this partition does not support DualStack", type: c9 }] }, { endpoint: { url: "https://sns.{Region}.{PartitionResult#dnsSuffix}", properties: l9, headers: l9 }, type: d9 }] }] };
var ruleSet9 = _data9;

// ../../node_modules/@aws-sdk/client-sns/dist-es/endpoint/endpointResolver.js
var defaultEndpointResolver9 = (endpointParams, context = {}) => {
  return resolveEndpoint(ruleSet9, {
    endpointParams,
    logger: context.logger
  });
};

// ../../node_modules/@aws-sdk/client-sns/dist-es/runtimeConfig.shared.js
var getRuntimeConfig17 = (config) => ({
  apiVersion: "2010-03-31",
  base64Decoder: config?.base64Decoder ?? fromBase64,
  base64Encoder: config?.base64Encoder ?? toBase64,
  disableHostPrefix: config?.disableHostPrefix ?? false,
  endpointProvider: config?.endpointProvider ?? defaultEndpointResolver9,
  logger: config?.logger ?? new NoOpLogger(),
  serviceId: config?.serviceId ?? "SNS",
  urlParser: config?.urlParser ?? parseUrl
});

// ../../node_modules/@aws-sdk/client-sns/dist-es/runtimeConfig.js
var getRuntimeConfig18 = (config) => {
  emitWarningIfUnsupportedVersion(process.version);
  const defaultsMode = resolveDefaultsModeConfig(config);
  const defaultConfigProvider = () => defaultsMode().then(loadConfigsForDefaultMode);
  const clientSharedValues = getRuntimeConfig17(config);
  return {
    ...clientSharedValues,
    ...config,
    runtime: "node",
    defaultsMode,
    bodyLengthChecker: config?.bodyLengthChecker ?? calculateBodyLength,
    credentialDefaultProvider: config?.credentialDefaultProvider ?? decorateDefaultCredentialProvider2(defaultProvider),
    defaultUserAgentProvider: config?.defaultUserAgentProvider ?? defaultUserAgent({ serviceId: clientSharedValues.serviceId, clientVersion: package_default9.version }),
    maxAttempts: config?.maxAttempts ?? loadConfig(NODE_MAX_ATTEMPT_CONFIG_OPTIONS),
    region: config?.region ?? loadConfig(NODE_REGION_CONFIG_OPTIONS, NODE_REGION_CONFIG_FILE_OPTIONS),
    requestHandler: config?.requestHandler ?? new NodeHttpHandler(defaultConfigProvider),
    retryMode: config?.retryMode ?? loadConfig({
      ...NODE_RETRY_MODE_CONFIG_OPTIONS,
      default: async () => (await defaultConfigProvider()).retryMode || DEFAULT_RETRY_MODE
    }),
    sha256: config?.sha256 ?? Hash.bind(null, "sha256"),
    streamCollector: config?.streamCollector ?? streamCollector,
    useDualstackEndpoint: config?.useDualstackEndpoint ?? loadConfig(NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS),
    useFipsEndpoint: config?.useFipsEndpoint ?? loadConfig(NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS),
    utf8Decoder: config?.utf8Decoder ?? fromUtf82,
    utf8Encoder: config?.utf8Encoder ?? toUtf8
  };
};

// ../../node_modules/@aws-sdk/client-sns/dist-es/SNSClient.js
var SNSClient = class extends Client {
  constructor(configuration) {
    const _config_0 = getRuntimeConfig18(configuration);
    const _config_1 = resolveClientEndpointParameters9(_config_0);
    const _config_2 = resolveRegionConfig(_config_1);
    const _config_3 = resolveEndpointConfig(_config_2);
    const _config_4 = resolveRetryConfig(_config_3);
    const _config_5 = resolveHostHeaderConfig(_config_4);
    const _config_6 = resolveAwsAuthConfig(_config_5);
    const _config_7 = resolveUserAgentConfig(_config_6);
    super(_config_7);
    this.config = _config_7;
    this.middlewareStack.use(getRetryPlugin(this.config));
    this.middlewareStack.use(getContentLengthPlugin(this.config));
    this.middlewareStack.use(getHostHeaderPlugin(this.config));
    this.middlewareStack.use(getLoggerPlugin(this.config));
    this.middlewareStack.use(getRecursionDetectionPlugin(this.config));
    this.middlewareStack.use(getAwsAuthPlugin(this.config));
    this.middlewareStack.use(getUserAgentPlugin(this.config));
  }
  destroy() {
    super.destroy();
  }
};

// src/mocks/sns.ts
var import_crypto3 = require("crypto");
var import_aws_sdk_client_mock5 = require("aws-sdk-client-mock");
var mockSNS = (topics) => {
  const list = mockObjectKeys(topics);
  (0, import_aws_sdk_client_mock5.mockClient)(SNSClient).on(PublishCommand2).callsFake(async (input) => {
    const parts = (input.TopicArn || "").split(":");
    const topic = parts[parts.length - 1];
    const callback = list[topic];
    if (!callback) {
      throw new TypeError(`Sns mock function not defined for: ${topic}`);
    }
    await asyncCall(callback, {
      Records: [{
        Sns: {
          TopicArn: input.TopicArn,
          MessageId: (0, import_crypto3.randomUUID)(),
          Timestamp: Date.now(),
          Message: input.Message
        }
      }]
    });
  });
  beforeEach && beforeEach(() => {
    Object.values(list).forEach((fn) => {
      fn.mockClear();
    });
  });
  return list;
};

// ../../node_modules/@aws-sdk/client-sqs/dist-es/models/SQSServiceException.js
var SQSServiceException = class extends ServiceException {
  constructor(options) {
    super(options);
    Object.setPrototypeOf(this, SQSServiceException.prototype);
  }
};

// ../../node_modules/@aws-sdk/client-sqs/dist-es/models/models_0.js
var BatchEntryIdsNotDistinct = class extends SQSServiceException {
  constructor(opts) {
    super({
      name: "BatchEntryIdsNotDistinct",
      $fault: "client",
      ...opts
    });
    this.name = "BatchEntryIdsNotDistinct";
    this.$fault = "client";
    Object.setPrototypeOf(this, BatchEntryIdsNotDistinct.prototype);
  }
};
var EmptyBatchRequest = class extends SQSServiceException {
  constructor(opts) {
    super({
      name: "EmptyBatchRequest",
      $fault: "client",
      ...opts
    });
    this.name = "EmptyBatchRequest";
    this.$fault = "client";
    Object.setPrototypeOf(this, EmptyBatchRequest.prototype);
  }
};
var InvalidBatchEntryId = class extends SQSServiceException {
  constructor(opts) {
    super({
      name: "InvalidBatchEntryId",
      $fault: "client",
      ...opts
    });
    this.name = "InvalidBatchEntryId";
    this.$fault = "client";
    Object.setPrototypeOf(this, InvalidBatchEntryId.prototype);
  }
};
var TooManyEntriesInBatchRequest = class extends SQSServiceException {
  constructor(opts) {
    super({
      name: "TooManyEntriesInBatchRequest",
      $fault: "client",
      ...opts
    });
    this.name = "TooManyEntriesInBatchRequest";
    this.$fault = "client";
    Object.setPrototypeOf(this, TooManyEntriesInBatchRequest.prototype);
  }
};
var QueueDoesNotExist = class extends SQSServiceException {
  constructor(opts) {
    super({
      name: "QueueDoesNotExist",
      $fault: "client",
      ...opts
    });
    this.name = "QueueDoesNotExist";
    this.$fault = "client";
    Object.setPrototypeOf(this, QueueDoesNotExist.prototype);
  }
};
var InvalidMessageContents = class extends SQSServiceException {
  constructor(opts) {
    super({
      name: "InvalidMessageContents",
      $fault: "client",
      ...opts
    });
    this.name = "InvalidMessageContents";
    this.$fault = "client";
    Object.setPrototypeOf(this, InvalidMessageContents.prototype);
  }
};
var UnsupportedOperation = class extends SQSServiceException {
  constructor(opts) {
    super({
      name: "UnsupportedOperation",
      $fault: "client",
      ...opts
    });
    this.name = "UnsupportedOperation";
    this.$fault = "client";
    Object.setPrototypeOf(this, UnsupportedOperation.prototype);
  }
};
var BatchRequestTooLong = class extends SQSServiceException {
  constructor(opts) {
    super({
      name: "BatchRequestTooLong",
      $fault: "client",
      ...opts
    });
    this.name = "BatchRequestTooLong";
    this.$fault = "client";
    Object.setPrototypeOf(this, BatchRequestTooLong.prototype);
  }
};
var GetQueueUrlRequestFilterSensitiveLog = (obj) => ({
  ...obj
});
var GetQueueUrlResultFilterSensitiveLog = (obj) => ({
  ...obj
});
var SendMessageRequestFilterSensitiveLog = (obj) => ({
  ...obj
});
var SendMessageResultFilterSensitiveLog = (obj) => ({
  ...obj
});
var SendMessageBatchRequestFilterSensitiveLog = (obj) => ({
  ...obj
});
var SendMessageBatchResultFilterSensitiveLog = (obj) => ({
  ...obj
});

// ../../node_modules/@aws-sdk/client-sqs/dist-es/protocols/Aws_query.js
var import_fast_xml_parser3 = __toESM(require_fxp());
var serializeAws_queryGetQueueUrlCommand = async (input, context) => {
  const headers = {
    "content-type": "application/x-www-form-urlencoded"
  };
  let body;
  body = buildFormUrlencodedString3({
    ...serializeAws_queryGetQueueUrlRequest(input, context),
    Action: "GetQueueUrl",
    Version: "2012-11-05"
  });
  return buildHttpRpcRequest4(context, headers, "/", void 0, body);
};
var serializeAws_querySendMessageCommand = async (input, context) => {
  const headers = {
    "content-type": "application/x-www-form-urlencoded"
  };
  let body;
  body = buildFormUrlencodedString3({
    ...serializeAws_querySendMessageRequest(input, context),
    Action: "SendMessage",
    Version: "2012-11-05"
  });
  return buildHttpRpcRequest4(context, headers, "/", void 0, body);
};
var serializeAws_querySendMessageBatchCommand = async (input, context) => {
  const headers = {
    "content-type": "application/x-www-form-urlencoded"
  };
  let body;
  body = buildFormUrlencodedString3({
    ...serializeAws_querySendMessageBatchRequest(input, context),
    Action: "SendMessageBatch",
    Version: "2012-11-05"
  });
  return buildHttpRpcRequest4(context, headers, "/", void 0, body);
};
var deserializeAws_queryGetQueueUrlCommand = async (output, context) => {
  if (output.statusCode >= 300) {
    return deserializeAws_queryGetQueueUrlCommandError(output, context);
  }
  const data = await parseBody10(output.body, context);
  let contents = {};
  contents = deserializeAws_queryGetQueueUrlResult(data.GetQueueUrlResult, context);
  const response = {
    $metadata: deserializeMetadata11(output),
    ...contents
  };
  return Promise.resolve(response);
};
var deserializeAws_queryGetQueueUrlCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody10(output.body, context)
  };
  const errorCode = loadQueryErrorCode3(output, parsedOutput.body);
  switch (errorCode) {
    case "AWS.SimpleQueueService.NonExistentQueue":
    case "com.amazonaws.sqs#QueueDoesNotExist":
      throw await deserializeAws_queryQueueDoesNotExistResponse(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody: parsedBody.Error,
        exceptionCtor: SQSServiceException,
        errorCode
      });
  }
};
var deserializeAws_querySendMessageCommand = async (output, context) => {
  if (output.statusCode >= 300) {
    return deserializeAws_querySendMessageCommandError(output, context);
  }
  const data = await parseBody10(output.body, context);
  let contents = {};
  contents = deserializeAws_querySendMessageResult(data.SendMessageResult, context);
  const response = {
    $metadata: deserializeMetadata11(output),
    ...contents
  };
  return Promise.resolve(response);
};
var deserializeAws_querySendMessageCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody10(output.body, context)
  };
  const errorCode = loadQueryErrorCode3(output, parsedOutput.body);
  switch (errorCode) {
    case "AWS.SimpleQueueService.UnsupportedOperation":
    case "com.amazonaws.sqs#UnsupportedOperation":
      throw await deserializeAws_queryUnsupportedOperationResponse(parsedOutput, context);
    case "InvalidMessageContents":
    case "com.amazonaws.sqs#InvalidMessageContents":
      throw await deserializeAws_queryInvalidMessageContentsResponse(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody: parsedBody.Error,
        exceptionCtor: SQSServiceException,
        errorCode
      });
  }
};
var deserializeAws_querySendMessageBatchCommand = async (output, context) => {
  if (output.statusCode >= 300) {
    return deserializeAws_querySendMessageBatchCommandError(output, context);
  }
  const data = await parseBody10(output.body, context);
  let contents = {};
  contents = deserializeAws_querySendMessageBatchResult(data.SendMessageBatchResult, context);
  const response = {
    $metadata: deserializeMetadata11(output),
    ...contents
  };
  return Promise.resolve(response);
};
var deserializeAws_querySendMessageBatchCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody10(output.body, context)
  };
  const errorCode = loadQueryErrorCode3(output, parsedOutput.body);
  switch (errorCode) {
    case "AWS.SimpleQueueService.BatchEntryIdsNotDistinct":
    case "com.amazonaws.sqs#BatchEntryIdsNotDistinct":
      throw await deserializeAws_queryBatchEntryIdsNotDistinctResponse(parsedOutput, context);
    case "AWS.SimpleQueueService.BatchRequestTooLong":
    case "com.amazonaws.sqs#BatchRequestTooLong":
      throw await deserializeAws_queryBatchRequestTooLongResponse(parsedOutput, context);
    case "AWS.SimpleQueueService.EmptyBatchRequest":
    case "com.amazonaws.sqs#EmptyBatchRequest":
      throw await deserializeAws_queryEmptyBatchRequestResponse(parsedOutput, context);
    case "AWS.SimpleQueueService.InvalidBatchEntryId":
    case "com.amazonaws.sqs#InvalidBatchEntryId":
      throw await deserializeAws_queryInvalidBatchEntryIdResponse(parsedOutput, context);
    case "AWS.SimpleQueueService.TooManyEntriesInBatchRequest":
    case "com.amazonaws.sqs#TooManyEntriesInBatchRequest":
      throw await deserializeAws_queryTooManyEntriesInBatchRequestResponse(parsedOutput, context);
    case "AWS.SimpleQueueService.UnsupportedOperation":
    case "com.amazonaws.sqs#UnsupportedOperation":
      throw await deserializeAws_queryUnsupportedOperationResponse(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody: parsedBody.Error,
        exceptionCtor: SQSServiceException,
        errorCode
      });
  }
};
var deserializeAws_queryBatchEntryIdsNotDistinctResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryBatchEntryIdsNotDistinct(body.Error, context);
  const exception = new BatchEntryIdsNotDistinct({
    $metadata: deserializeMetadata11(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryBatchRequestTooLongResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryBatchRequestTooLong(body.Error, context);
  const exception = new BatchRequestTooLong({
    $metadata: deserializeMetadata11(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryEmptyBatchRequestResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryEmptyBatchRequest(body.Error, context);
  const exception = new EmptyBatchRequest({
    $metadata: deserializeMetadata11(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryInvalidBatchEntryIdResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryInvalidBatchEntryId(body.Error, context);
  const exception = new InvalidBatchEntryId({
    $metadata: deserializeMetadata11(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryInvalidMessageContentsResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryInvalidMessageContents(body.Error, context);
  const exception = new InvalidMessageContents({
    $metadata: deserializeMetadata11(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryQueueDoesNotExistResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryQueueDoesNotExist(body.Error, context);
  const exception = new QueueDoesNotExist({
    $metadata: deserializeMetadata11(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryTooManyEntriesInBatchRequestResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryTooManyEntriesInBatchRequest(body.Error, context);
  const exception = new TooManyEntriesInBatchRequest({
    $metadata: deserializeMetadata11(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_queryUnsupportedOperationResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_queryUnsupportedOperation(body.Error, context);
  const exception = new UnsupportedOperation({
    $metadata: deserializeMetadata11(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var serializeAws_queryBinaryList = (input, context) => {
  const entries = {};
  let counter = 1;
  for (const entry of input) {
    if (entry === null) {
      continue;
    }
    entries[`BinaryListValue.${counter}`] = context.base64Encoder(entry);
    counter++;
  }
  return entries;
};
var serializeAws_queryGetQueueUrlRequest = (input, context) => {
  const entries = {};
  if (input.QueueName != null) {
    entries["QueueName"] = input.QueueName;
  }
  if (input.QueueOwnerAWSAccountId != null) {
    entries["QueueOwnerAWSAccountId"] = input.QueueOwnerAWSAccountId;
  }
  return entries;
};
var serializeAws_queryMessageAttributeValue2 = (input, context) => {
  const entries = {};
  if (input.StringValue != null) {
    entries["StringValue"] = input.StringValue;
  }
  if (input.BinaryValue != null) {
    entries["BinaryValue"] = context.base64Encoder(input.BinaryValue);
  }
  if (input.StringListValues != null) {
    const memberEntries = serializeAws_queryStringList(input.StringListValues, context);
    if (input.StringListValues?.length === 0) {
      entries.StringListValue = [];
    }
    Object.entries(memberEntries).forEach(([key, value]) => {
      const loc = `StringListValue.${key.substring(key.indexOf(".") + 1)}`;
      entries[loc] = value;
    });
  }
  if (input.BinaryListValues != null) {
    const memberEntries = serializeAws_queryBinaryList(input.BinaryListValues, context);
    if (input.BinaryListValues?.length === 0) {
      entries.BinaryListValue = [];
    }
    Object.entries(memberEntries).forEach(([key, value]) => {
      const loc = `BinaryListValue.${key.substring(key.indexOf(".") + 1)}`;
      entries[loc] = value;
    });
  }
  if (input.DataType != null) {
    entries["DataType"] = input.DataType;
  }
  return entries;
};
var serializeAws_queryMessageBodyAttributeMap = (input, context) => {
  const entries = {};
  let counter = 1;
  Object.keys(input).filter((key) => input[key] != null).forEach((key) => {
    entries[`entry.${counter}.Name`] = key;
    const memberEntries = serializeAws_queryMessageAttributeValue2(input[key], context);
    Object.entries(memberEntries).forEach(([key2, value]) => {
      entries[`entry.${counter}.Value.${key2}`] = value;
    });
    counter++;
  });
  return entries;
};
var serializeAws_queryMessageBodySystemAttributeMap = (input, context) => {
  const entries = {};
  let counter = 1;
  Object.keys(input).filter((key) => input[key] != null).forEach((key) => {
    entries[`entry.${counter}.Name`] = key;
    const memberEntries = serializeAws_queryMessageSystemAttributeValue(input[key], context);
    Object.entries(memberEntries).forEach(([key2, value]) => {
      entries[`entry.${counter}.Value.${key2}`] = value;
    });
    counter++;
  });
  return entries;
};
var serializeAws_queryMessageSystemAttributeValue = (input, context) => {
  const entries = {};
  if (input.StringValue != null) {
    entries["StringValue"] = input.StringValue;
  }
  if (input.BinaryValue != null) {
    entries["BinaryValue"] = context.base64Encoder(input.BinaryValue);
  }
  if (input.StringListValues != null) {
    const memberEntries = serializeAws_queryStringList(input.StringListValues, context);
    if (input.StringListValues?.length === 0) {
      entries.StringListValue = [];
    }
    Object.entries(memberEntries).forEach(([key, value]) => {
      const loc = `StringListValue.${key.substring(key.indexOf(".") + 1)}`;
      entries[loc] = value;
    });
  }
  if (input.BinaryListValues != null) {
    const memberEntries = serializeAws_queryBinaryList(input.BinaryListValues, context);
    if (input.BinaryListValues?.length === 0) {
      entries.BinaryListValue = [];
    }
    Object.entries(memberEntries).forEach(([key, value]) => {
      const loc = `BinaryListValue.${key.substring(key.indexOf(".") + 1)}`;
      entries[loc] = value;
    });
  }
  if (input.DataType != null) {
    entries["DataType"] = input.DataType;
  }
  return entries;
};
var serializeAws_querySendMessageBatchRequest = (input, context) => {
  const entries = {};
  if (input.QueueUrl != null) {
    entries["QueueUrl"] = input.QueueUrl;
  }
  if (input.Entries != null) {
    const memberEntries = serializeAws_querySendMessageBatchRequestEntryList(input.Entries, context);
    if (input.Entries?.length === 0) {
      entries.SendMessageBatchRequestEntry = [];
    }
    Object.entries(memberEntries).forEach(([key, value]) => {
      const loc = `SendMessageBatchRequestEntry.${key.substring(key.indexOf(".") + 1)}`;
      entries[loc] = value;
    });
  }
  return entries;
};
var serializeAws_querySendMessageBatchRequestEntry = (input, context) => {
  const entries = {};
  if (input.Id != null) {
    entries["Id"] = input.Id;
  }
  if (input.MessageBody != null) {
    entries["MessageBody"] = input.MessageBody;
  }
  if (input.DelaySeconds != null) {
    entries["DelaySeconds"] = input.DelaySeconds;
  }
  if (input.MessageAttributes != null) {
    const memberEntries = serializeAws_queryMessageBodyAttributeMap(input.MessageAttributes, context);
    Object.entries(memberEntries).forEach(([key, value]) => {
      const loc = `MessageAttribute.${key.substring(key.indexOf(".") + 1)}`;
      entries[loc] = value;
    });
  }
  if (input.MessageSystemAttributes != null) {
    const memberEntries = serializeAws_queryMessageBodySystemAttributeMap(input.MessageSystemAttributes, context);
    Object.entries(memberEntries).forEach(([key, value]) => {
      const loc = `MessageSystemAttribute.${key.substring(key.indexOf(".") + 1)}`;
      entries[loc] = value;
    });
  }
  if (input.MessageDeduplicationId != null) {
    entries["MessageDeduplicationId"] = input.MessageDeduplicationId;
  }
  if (input.MessageGroupId != null) {
    entries["MessageGroupId"] = input.MessageGroupId;
  }
  return entries;
};
var serializeAws_querySendMessageBatchRequestEntryList = (input, context) => {
  const entries = {};
  let counter = 1;
  for (const entry of input) {
    if (entry === null) {
      continue;
    }
    const memberEntries = serializeAws_querySendMessageBatchRequestEntry(entry, context);
    Object.entries(memberEntries).forEach(([key, value]) => {
      entries[`member.${counter}.${key}`] = value;
    });
    counter++;
  }
  return entries;
};
var serializeAws_querySendMessageRequest = (input, context) => {
  const entries = {};
  if (input.QueueUrl != null) {
    entries["QueueUrl"] = input.QueueUrl;
  }
  if (input.MessageBody != null) {
    entries["MessageBody"] = input.MessageBody;
  }
  if (input.DelaySeconds != null) {
    entries["DelaySeconds"] = input.DelaySeconds;
  }
  if (input.MessageAttributes != null) {
    const memberEntries = serializeAws_queryMessageBodyAttributeMap(input.MessageAttributes, context);
    Object.entries(memberEntries).forEach(([key, value]) => {
      const loc = `MessageAttribute.${key.substring(key.indexOf(".") + 1)}`;
      entries[loc] = value;
    });
  }
  if (input.MessageSystemAttributes != null) {
    const memberEntries = serializeAws_queryMessageBodySystemAttributeMap(input.MessageSystemAttributes, context);
    Object.entries(memberEntries).forEach(([key, value]) => {
      const loc = `MessageSystemAttribute.${key.substring(key.indexOf(".") + 1)}`;
      entries[loc] = value;
    });
  }
  if (input.MessageDeduplicationId != null) {
    entries["MessageDeduplicationId"] = input.MessageDeduplicationId;
  }
  if (input.MessageGroupId != null) {
    entries["MessageGroupId"] = input.MessageGroupId;
  }
  return entries;
};
var serializeAws_queryStringList = (input, context) => {
  const entries = {};
  let counter = 1;
  for (const entry of input) {
    if (entry === null) {
      continue;
    }
    entries[`StringListValue.${counter}`] = entry;
    counter++;
  }
  return entries;
};
var deserializeAws_queryBatchEntryIdsNotDistinct = (output, context) => {
  const contents = {};
  return contents;
};
var deserializeAws_queryBatchRequestTooLong = (output, context) => {
  const contents = {};
  return contents;
};
var deserializeAws_queryBatchResultErrorEntry = (output, context) => {
  const contents = {
    Id: void 0,
    SenderFault: void 0,
    Code: void 0,
    Message: void 0
  };
  if (output["Id"] !== void 0) {
    contents.Id = expectString(output["Id"]);
  }
  if (output["SenderFault"] !== void 0) {
    contents.SenderFault = parseBoolean(output["SenderFault"]);
  }
  if (output["Code"] !== void 0) {
    contents.Code = expectString(output["Code"]);
  }
  if (output["Message"] !== void 0) {
    contents.Message = expectString(output["Message"]);
  }
  return contents;
};
var deserializeAws_queryBatchResultErrorEntryList = (output, context) => {
  return (output || []).filter((e13) => e13 != null).map((entry) => {
    return deserializeAws_queryBatchResultErrorEntry(entry, context);
  });
};
var deserializeAws_queryEmptyBatchRequest = (output, context) => {
  const contents = {};
  return contents;
};
var deserializeAws_queryGetQueueUrlResult = (output, context) => {
  const contents = {
    QueueUrl: void 0
  };
  if (output["QueueUrl"] !== void 0) {
    contents.QueueUrl = expectString(output["QueueUrl"]);
  }
  return contents;
};
var deserializeAws_queryInvalidBatchEntryId = (output, context) => {
  const contents = {};
  return contents;
};
var deserializeAws_queryInvalidMessageContents = (output, context) => {
  const contents = {};
  return contents;
};
var deserializeAws_queryQueueDoesNotExist = (output, context) => {
  const contents = {};
  return contents;
};
var deserializeAws_querySendMessageBatchResult = (output, context) => {
  const contents = {
    Successful: void 0,
    Failed: void 0
  };
  if (output.SendMessageBatchResultEntry === "") {
    contents.Successful = [];
  } else if (output["SendMessageBatchResultEntry"] !== void 0) {
    contents.Successful = deserializeAws_querySendMessageBatchResultEntryList(getArrayIfSingleItem(output["SendMessageBatchResultEntry"]), context);
  }
  if (output.BatchResultErrorEntry === "") {
    contents.Failed = [];
  } else if (output["BatchResultErrorEntry"] !== void 0) {
    contents.Failed = deserializeAws_queryBatchResultErrorEntryList(getArrayIfSingleItem(output["BatchResultErrorEntry"]), context);
  }
  return contents;
};
var deserializeAws_querySendMessageBatchResultEntry = (output, context) => {
  const contents = {
    Id: void 0,
    MessageId: void 0,
    MD5OfMessageBody: void 0,
    MD5OfMessageAttributes: void 0,
    MD5OfMessageSystemAttributes: void 0,
    SequenceNumber: void 0
  };
  if (output["Id"] !== void 0) {
    contents.Id = expectString(output["Id"]);
  }
  if (output["MessageId"] !== void 0) {
    contents.MessageId = expectString(output["MessageId"]);
  }
  if (output["MD5OfMessageBody"] !== void 0) {
    contents.MD5OfMessageBody = expectString(output["MD5OfMessageBody"]);
  }
  if (output["MD5OfMessageAttributes"] !== void 0) {
    contents.MD5OfMessageAttributes = expectString(output["MD5OfMessageAttributes"]);
  }
  if (output["MD5OfMessageSystemAttributes"] !== void 0) {
    contents.MD5OfMessageSystemAttributes = expectString(output["MD5OfMessageSystemAttributes"]);
  }
  if (output["SequenceNumber"] !== void 0) {
    contents.SequenceNumber = expectString(output["SequenceNumber"]);
  }
  return contents;
};
var deserializeAws_querySendMessageBatchResultEntryList = (output, context) => {
  return (output || []).filter((e13) => e13 != null).map((entry) => {
    return deserializeAws_querySendMessageBatchResultEntry(entry, context);
  });
};
var deserializeAws_querySendMessageResult = (output, context) => {
  const contents = {
    MD5OfMessageBody: void 0,
    MD5OfMessageAttributes: void 0,
    MD5OfMessageSystemAttributes: void 0,
    MessageId: void 0,
    SequenceNumber: void 0
  };
  if (output["MD5OfMessageBody"] !== void 0) {
    contents.MD5OfMessageBody = expectString(output["MD5OfMessageBody"]);
  }
  if (output["MD5OfMessageAttributes"] !== void 0) {
    contents.MD5OfMessageAttributes = expectString(output["MD5OfMessageAttributes"]);
  }
  if (output["MD5OfMessageSystemAttributes"] !== void 0) {
    contents.MD5OfMessageSystemAttributes = expectString(output["MD5OfMessageSystemAttributes"]);
  }
  if (output["MessageId"] !== void 0) {
    contents.MessageId = expectString(output["MessageId"]);
  }
  if (output["SequenceNumber"] !== void 0) {
    contents.SequenceNumber = expectString(output["SequenceNumber"]);
  }
  return contents;
};
var deserializeAws_queryTooManyEntriesInBatchRequest = (output, context) => {
  const contents = {};
  return contents;
};
var deserializeAws_queryUnsupportedOperation = (output, context) => {
  const contents = {};
  return contents;
};
var deserializeMetadata11 = (output) => ({
  httpStatusCode: output.statusCode,
  requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
  extendedRequestId: output.headers["x-amz-id-2"],
  cfId: output.headers["x-amz-cf-id"]
});
var collectBody10 = (streamBody = new Uint8Array(), context) => {
  if (streamBody instanceof Uint8Array) {
    return Promise.resolve(streamBody);
  }
  return context.streamCollector(streamBody) || Promise.resolve(new Uint8Array());
};
var collectBodyString10 = (streamBody, context) => collectBody10(streamBody, context).then((body) => context.utf8Encoder(body));
var buildHttpRpcRequest4 = async (context, headers, path, resolvedHostname, body) => {
  const { hostname, protocol = "https", port, path: basePath } = await context.endpoint();
  const contents = {
    protocol,
    hostname,
    port,
    method: "POST",
    path: basePath.endsWith("/") ? basePath.slice(0, -1) + path : basePath + path,
    headers
  };
  if (resolvedHostname !== void 0) {
    contents.hostname = resolvedHostname;
  }
  if (body !== void 0) {
    contents.body = body;
  }
  return new HttpRequest(contents);
};
var parseBody10 = (streamBody, context) => collectBodyString10(streamBody, context).then((encoded) => {
  if (encoded.length) {
    const parser = new import_fast_xml_parser3.XMLParser({
      attributeNamePrefix: "",
      htmlEntities: true,
      ignoreAttributes: false,
      ignoreDeclaration: true,
      parseTagValue: false,
      trimValues: false,
      tagValueProcessor: (_, val) => val.trim() === "" && val.includes("\n") ? "" : void 0
    });
    parser.addEntity("#xD", "\r");
    parser.addEntity("#10", "\n");
    const parsedObj = parser.parse(encoded);
    const textNodeName = "#text";
    const key = Object.keys(parsedObj)[0];
    const parsedObjToReturn = parsedObj[key];
    if (parsedObjToReturn[textNodeName]) {
      parsedObjToReturn[key] = parsedObjToReturn[textNodeName];
      delete parsedObjToReturn[textNodeName];
    }
    return getValueFromTextNode(parsedObjToReturn);
  }
  return {};
});
var parseErrorBody10 = async (errorBody, context) => {
  const value = await parseBody10(errorBody, context);
  if (value.Error) {
    value.Error.message = value.Error.message ?? value.Error.Message;
  }
  return value;
};
var buildFormUrlencodedString3 = (formEntries) => Object.entries(formEntries).map(([key, value]) => extendedEncodeURIComponent(key) + "=" + extendedEncodeURIComponent(value)).join("&");
var loadQueryErrorCode3 = (output, data) => {
  if (data.Error.Code !== void 0) {
    return data.Error.Code;
  }
  if (output.statusCode == 404) {
    return "NotFound";
  }
};

// ../../node_modules/@aws-sdk/client-sqs/dist-es/commands/GetQueueUrlCommand.js
var GetQueueUrlCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, GetQueueUrlCommand.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "SQSClient";
    const commandName = "GetQueueUrlCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: GetQueueUrlRequestFilterSensitiveLog,
      outputFilterSensitiveLog: GetQueueUrlResultFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_queryGetQueueUrlCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_queryGetQueueUrlCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/middleware-sdk-sqs/dist-es/send-message.js
var sendMessageMiddleware = (options) => (next) => async (args) => {
  const resp = await next({ ...args });
  const output = resp.output;
  const hash = new options.md5();
  hash.update(toUint8Array(args.input.MessageBody || ""));
  if (output.MD5OfMessageBody !== toHex(await hash.digest())) {
    throw new Error("InvalidChecksumError");
  }
  return resp;
};
var sendMessageMiddlewareOptions = {
  step: "initialize",
  tags: ["VALIDATE_BODY_MD5"],
  name: "sendMessageMiddleware",
  override: true
};
var getSendMessagePlugin = (config) => ({
  applyToStack: (clientStack) => {
    clientStack.add(sendMessageMiddleware(config), sendMessageMiddlewareOptions);
  }
});

// ../../node_modules/@aws-sdk/middleware-sdk-sqs/dist-es/send-message-batch.js
var sendMessageBatchMiddleware = (options) => (next) => async (args) => {
  const resp = await next({ ...args });
  const output = resp.output;
  const messageIds = [];
  const entries = {};
  if (output.Successful !== void 0) {
    for (const entry of output.Successful) {
      if (entry.Id !== void 0) {
        entries[entry.Id] = entry;
      }
    }
  }
  for (const entry of args.input.Entries) {
    if (entries[entry.Id]) {
      const md5 = entries[entry.Id].MD5OfMessageBody;
      const hash = new options.md5();
      hash.update(toUint8Array(entry.MessageBody || ""));
      if (md5 !== toHex(await hash.digest())) {
        messageIds.push(entries[entry.Id].MessageId);
      }
    }
  }
  if (messageIds.length > 0) {
    throw new Error("Invalid MD5 checksum on messages: " + messageIds.join(", "));
  }
  return resp;
};
var sendMessageBatchMiddlewareOptions = {
  step: "initialize",
  tags: ["VALIDATE_BODY_MD5"],
  name: "sendMessageBatchMiddleware",
  override: true
};
var getSendMessageBatchPlugin = (config) => ({
  applyToStack: (clientStack) => {
    clientStack.add(sendMessageBatchMiddleware(config), sendMessageBatchMiddlewareOptions);
  }
});

// ../../node_modules/@aws-sdk/client-sqs/dist-es/commands/SendMessageBatchCommand.js
var SendMessageBatchCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, SendMessageBatchCommand.getEndpointParameterInstructions()));
    this.middlewareStack.use(getSendMessageBatchPlugin(configuration));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "SQSClient";
    const commandName = "SendMessageBatchCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: SendMessageBatchRequestFilterSensitiveLog,
      outputFilterSensitiveLog: SendMessageBatchResultFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_querySendMessageBatchCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_querySendMessageBatchCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-sqs/dist-es/commands/SendMessageCommand.js
var SendMessageCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, SendMessageCommand.getEndpointParameterInstructions()));
    this.middlewareStack.use(getSendMessagePlugin(configuration));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "SQSClient";
    const commandName = "SendMessageCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: SendMessageRequestFilterSensitiveLog,
      outputFilterSensitiveLog: SendMessageResultFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_querySendMessageCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_querySendMessageCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-sqs/dist-es/endpoint/EndpointParameters.js
var resolveClientEndpointParameters10 = (options) => {
  return {
    ...options,
    useDualstackEndpoint: options.useDualstackEndpoint ?? false,
    useFipsEndpoint: options.useFipsEndpoint ?? false,
    defaultSigningName: "sqs"
  };
};

// ../../node_modules/@aws-sdk/client-sqs/package.json
var package_default10 = {
  name: "@aws-sdk/client-sqs",
  description: "AWS SDK for JavaScript Sqs Client for Node.js, Browser and React Native",
  version: "3.256.0",
  scripts: {
    build: "concurrently 'yarn:build:cjs' 'yarn:build:es' 'yarn:build:types'",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "build:docs": "typedoc",
    "build:es": "tsc -p tsconfig.es.json",
    "build:include:deps": "lerna run --scope $npm_package_name --include-dependencies build",
    "build:types": "tsc -p tsconfig.types.json",
    "build:types:downlevel": "downlevel-dts dist-types dist-types/ts3.4",
    clean: "rimraf ./dist-* && rimraf *.tsbuildinfo",
    "generate:client": "node ../../scripts/generate-clients/single-service --solo sqs"
  },
  main: "./dist-cjs/index.js",
  types: "./dist-types/index.d.ts",
  module: "./dist-es/index.js",
  sideEffects: false,
  dependencies: {
    "@aws-crypto/sha256-browser": "3.0.0",
    "@aws-crypto/sha256-js": "3.0.0",
    "@aws-sdk/client-sts": "3.256.0",
    "@aws-sdk/config-resolver": "3.254.0",
    "@aws-sdk/credential-provider-node": "3.256.0",
    "@aws-sdk/fetch-http-handler": "3.254.0",
    "@aws-sdk/hash-node": "3.254.0",
    "@aws-sdk/invalid-dependency": "3.254.0",
    "@aws-sdk/md5-js": "3.254.0",
    "@aws-sdk/middleware-content-length": "3.254.0",
    "@aws-sdk/middleware-endpoint": "3.254.0",
    "@aws-sdk/middleware-host-header": "3.254.0",
    "@aws-sdk/middleware-logger": "3.254.0",
    "@aws-sdk/middleware-recursion-detection": "3.254.0",
    "@aws-sdk/middleware-retry": "3.254.0",
    "@aws-sdk/middleware-sdk-sqs": "3.254.0",
    "@aws-sdk/middleware-serde": "3.254.0",
    "@aws-sdk/middleware-signing": "3.254.0",
    "@aws-sdk/middleware-stack": "3.254.0",
    "@aws-sdk/middleware-user-agent": "3.254.0",
    "@aws-sdk/node-config-provider": "3.254.0",
    "@aws-sdk/node-http-handler": "3.254.0",
    "@aws-sdk/protocol-http": "3.254.0",
    "@aws-sdk/smithy-client": "3.254.0",
    "@aws-sdk/types": "3.254.0",
    "@aws-sdk/url-parser": "3.254.0",
    "@aws-sdk/util-base64": "3.208.0",
    "@aws-sdk/util-body-length-browser": "3.188.0",
    "@aws-sdk/util-body-length-node": "3.208.0",
    "@aws-sdk/util-defaults-mode-browser": "3.254.0",
    "@aws-sdk/util-defaults-mode-node": "3.254.0",
    "@aws-sdk/util-endpoints": "3.254.0",
    "@aws-sdk/util-retry": "3.254.0",
    "@aws-sdk/util-user-agent-browser": "3.254.0",
    "@aws-sdk/util-user-agent-node": "3.254.0",
    "@aws-sdk/util-utf8-browser": "3.188.0",
    "@aws-sdk/util-utf8-node": "3.208.0",
    "fast-xml-parser": "4.0.11",
    tslib: "^2.3.1"
  },
  devDependencies: {
    "@aws-sdk/service-client-documentation-generator": "3.208.0",
    "@tsconfig/node14": "1.0.3",
    "@types/node": "^14.14.31",
    concurrently: "7.0.0",
    "downlevel-dts": "0.10.1",
    rimraf: "3.0.2",
    typedoc: "0.19.2",
    typescript: "~4.6.2"
  },
  overrides: {
    typedoc: {
      typescript: "~4.6.2"
    }
  },
  engines: {
    node: ">=14.0.0"
  },
  typesVersions: {
    "<4.0": {
      "dist-types/*": [
        "dist-types/ts3.4/*"
      ]
    }
  },
  files: [
    "dist-*"
  ],
  author: {
    name: "AWS SDK for JavaScript Team",
    url: "https://aws.amazon.com/javascript/"
  },
  license: "Apache-2.0",
  browser: {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.browser"
  },
  "react-native": {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.native"
  },
  homepage: "https://github.com/aws/aws-sdk-js-v3/tree/main/clients/client-sqs",
  repository: {
    type: "git",
    url: "https://github.com/aws/aws-sdk-js-v3.git",
    directory: "clients/client-sqs"
  }
};

// ../../node_modules/@aws-sdk/client-sqs/dist-es/endpoint/ruleset.js
var s10 = "required";
var t6 = "fn";
var u5 = "argv";
var v6 = "ref";
var a10 = "PartitionResult";
var b10 = "tree";
var c10 = "error";
var d10 = "endpoint";
var e10 = "getAttr";
var f10 = { [s10]: false, "type": "String" };
var g10 = { [s10]: true, "default": false, "type": "Boolean" };
var h10 = { [v6]: "Endpoint" };
var i10 = { [t6]: "booleanEquals", [u5]: [{ [v6]: "UseFIPS" }, true] };
var j10 = { [t6]: "booleanEquals", [u5]: [{ [v6]: "UseDualStack" }, true] };
var k10 = {};
var l10 = { [t6]: "booleanEquals", [u5]: [true, { [t6]: e10, [u5]: [{ [v6]: a10 }, "supportsFIPS"] }] };
var m10 = { [v6]: a10 };
var n10 = { [t6]: "booleanEquals", [u5]: [true, { [t6]: e10, [u5]: [m10, "supportsDualStack"] }] };
var o10 = { "url": "https://sqs.{Region}.{PartitionResult#dnsSuffix}", "properties": {}, "headers": {} };
var p10 = [h10];
var q10 = [i10];
var r10 = [j10];
var _data10 = { version: "1.0", parameters: { Region: f10, UseDualStack: g10, UseFIPS: g10, Endpoint: f10 }, rules: [{ conditions: [{ [t6]: "aws.partition", [u5]: [{ [v6]: "Region" }], assign: a10 }], type: b10, rules: [{ conditions: [{ [t6]: "isSet", [u5]: p10 }, { [t6]: "parseURL", [u5]: p10, assign: "url" }], type: b10, rules: [{ conditions: q10, error: "Invalid Configuration: FIPS and custom endpoint are not supported", type: c10 }, { type: b10, rules: [{ conditions: r10, error: "Invalid Configuration: Dualstack and custom endpoint are not supported", type: c10 }, { endpoint: { url: h10, properties: k10, headers: k10 }, type: d10 }] }] }, { conditions: [i10, j10], type: b10, rules: [{ conditions: [l10, n10], type: b10, rules: [{ endpoint: { url: "https://sqs-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: k10, headers: k10 }, type: d10 }] }, { error: "FIPS and DualStack are enabled, but this partition does not support one or both", type: c10 }] }, { conditions: q10, type: b10, rules: [{ conditions: [l10], type: b10, rules: [{ type: b10, rules: [{ conditions: [{ [t6]: "stringEquals", [u5]: ["aws-us-gov", { [t6]: e10, [u5]: [m10, "name"] }] }], endpoint: o10, type: d10 }, { endpoint: { url: "https://sqs-fips.{Region}.{PartitionResult#dnsSuffix}", properties: k10, headers: k10 }, type: d10 }] }] }, { error: "FIPS is enabled but this partition does not support FIPS", type: c10 }] }, { conditions: r10, type: b10, rules: [{ conditions: [n10], type: b10, rules: [{ endpoint: { url: "https://sqs.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: k10, headers: k10 }, type: d10 }] }, { error: "DualStack is enabled but this partition does not support DualStack", type: c10 }] }, { endpoint: o10, type: d10 }] }] };
var ruleSet10 = _data10;

// ../../node_modules/@aws-sdk/client-sqs/dist-es/endpoint/endpointResolver.js
var defaultEndpointResolver10 = (endpointParams, context = {}) => {
  return resolveEndpoint(ruleSet10, {
    endpointParams,
    logger: context.logger
  });
};

// ../../node_modules/@aws-sdk/client-sqs/dist-es/runtimeConfig.shared.js
var getRuntimeConfig19 = (config) => ({
  apiVersion: "2012-11-05",
  base64Decoder: config?.base64Decoder ?? fromBase64,
  base64Encoder: config?.base64Encoder ?? toBase64,
  disableHostPrefix: config?.disableHostPrefix ?? false,
  endpointProvider: config?.endpointProvider ?? defaultEndpointResolver10,
  logger: config?.logger ?? new NoOpLogger(),
  serviceId: config?.serviceId ?? "SQS",
  urlParser: config?.urlParser ?? parseUrl
});

// ../../node_modules/@aws-sdk/client-sqs/dist-es/runtimeConfig.js
var getRuntimeConfig20 = (config) => {
  emitWarningIfUnsupportedVersion(process.version);
  const defaultsMode = resolveDefaultsModeConfig(config);
  const defaultConfigProvider = () => defaultsMode().then(loadConfigsForDefaultMode);
  const clientSharedValues = getRuntimeConfig19(config);
  return {
    ...clientSharedValues,
    ...config,
    runtime: "node",
    defaultsMode,
    bodyLengthChecker: config?.bodyLengthChecker ?? calculateBodyLength,
    credentialDefaultProvider: config?.credentialDefaultProvider ?? decorateDefaultCredentialProvider2(defaultProvider),
    defaultUserAgentProvider: config?.defaultUserAgentProvider ?? defaultUserAgent({ serviceId: clientSharedValues.serviceId, clientVersion: package_default10.version }),
    maxAttempts: config?.maxAttempts ?? loadConfig(NODE_MAX_ATTEMPT_CONFIG_OPTIONS),
    md5: config?.md5 ?? Hash.bind(null, "md5"),
    region: config?.region ?? loadConfig(NODE_REGION_CONFIG_OPTIONS, NODE_REGION_CONFIG_FILE_OPTIONS),
    requestHandler: config?.requestHandler ?? new NodeHttpHandler(defaultConfigProvider),
    retryMode: config?.retryMode ?? loadConfig({
      ...NODE_RETRY_MODE_CONFIG_OPTIONS,
      default: async () => (await defaultConfigProvider()).retryMode || DEFAULT_RETRY_MODE
    }),
    sha256: config?.sha256 ?? Hash.bind(null, "sha256"),
    streamCollector: config?.streamCollector ?? streamCollector,
    useDualstackEndpoint: config?.useDualstackEndpoint ?? loadConfig(NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS),
    useFipsEndpoint: config?.useFipsEndpoint ?? loadConfig(NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS),
    utf8Decoder: config?.utf8Decoder ?? fromUtf82,
    utf8Encoder: config?.utf8Encoder ?? toUtf8
  };
};

// ../../node_modules/@aws-sdk/client-sqs/dist-es/SQSClient.js
var SQSClient = class extends Client {
  constructor(configuration) {
    const _config_0 = getRuntimeConfig20(configuration);
    const _config_1 = resolveClientEndpointParameters10(_config_0);
    const _config_2 = resolveRegionConfig(_config_1);
    const _config_3 = resolveEndpointConfig(_config_2);
    const _config_4 = resolveRetryConfig(_config_3);
    const _config_5 = resolveHostHeaderConfig(_config_4);
    const _config_6 = resolveAwsAuthConfig(_config_5);
    const _config_7 = resolveUserAgentConfig(_config_6);
    super(_config_7);
    this.config = _config_7;
    this.middlewareStack.use(getRetryPlugin(this.config));
    this.middlewareStack.use(getContentLengthPlugin(this.config));
    this.middlewareStack.use(getHostHeaderPlugin(this.config));
    this.middlewareStack.use(getLoggerPlugin(this.config));
    this.middlewareStack.use(getRecursionDetectionPlugin(this.config));
    this.middlewareStack.use(getAwsAuthPlugin(this.config));
    this.middlewareStack.use(getUserAgentPlugin(this.config));
  }
  destroy() {
    super.destroy();
  }
};

// src/mocks/sqs.ts
var import_crypto4 = require("crypto");
var import_aws_sdk_client_mock6 = require("aws-sdk-client-mock");
var formatAttributes = (attributes) => {
  const list = {};
  for (const key in attributes) {
    list[key] = {
      dataType: attributes[key].DataType,
      stringValue: attributes[key].StringValue
    };
  }
  return list;
};
var mockSQS = (queues) => {
  const list = mockObjectKeys(queues);
  const get = (input) => {
    const name = input.QueueUrl || "";
    const callback = list[name];
    if (!callback) {
      throw new TypeError(`Sqs mock function not defined for: ${name}`);
    }
    return callback;
  };
  (0, import_aws_sdk_client_mock6.mockClient)(SQSClient).on(GetQueueUrlCommand).callsFake((input) => ({ QueueUrl: input.QueueName })).on(SendMessageCommand).callsFake(async (input) => {
    const callback = get(input);
    await asyncCall(callback, {
      Records: [{
        body: input.MessageBody,
        messageId: (0, import_crypto4.randomUUID)(),
        messageAttributes: formatAttributes(input.MessageAttributes)
      }]
    });
  }).on(SendMessageBatchCommand).callsFake(async (input) => {
    const callback = get(input);
    await asyncCall(callback, {
      Records: (input.Entries || []).map((entry) => ({
        body: entry.MessageBody,
        messageId: entry.Id || (0, import_crypto4.randomUUID)(),
        messageAttributes: formatAttributes(entry.MessageAttributes)
      }))
    });
  });
  beforeEach && beforeEach(() => {
    Object.values(list).forEach((fn) => {
      fn.mockClear();
    });
  });
  return list;
};

// ../../node_modules/@aws-sdk/client-ssm/dist-es/models/SSMServiceException.js
var SSMServiceException = class extends ServiceException {
  constructor(options) {
    super(options);
    Object.setPrototypeOf(this, SSMServiceException.prototype);
  }
};

// ../../node_modules/@aws-sdk/client-ssm/dist-es/models/models_0.js
var ResourceTypeForTagging;
(function(ResourceTypeForTagging2) {
  ResourceTypeForTagging2["ASSOCIATION"] = "Association";
  ResourceTypeForTagging2["AUTOMATION"] = "Automation";
  ResourceTypeForTagging2["DOCUMENT"] = "Document";
  ResourceTypeForTagging2["MAINTENANCE_WINDOW"] = "MaintenanceWindow";
  ResourceTypeForTagging2["MANAGED_INSTANCE"] = "ManagedInstance";
  ResourceTypeForTagging2["OPSMETADATA"] = "OpsMetadata";
  ResourceTypeForTagging2["OPS_ITEM"] = "OpsItem";
  ResourceTypeForTagging2["PARAMETER"] = "Parameter";
  ResourceTypeForTagging2["PATCH_BASELINE"] = "PatchBaseline";
})(ResourceTypeForTagging || (ResourceTypeForTagging = {}));
var InternalServerError2 = class extends SSMServiceException {
  constructor(opts) {
    super({
      name: "InternalServerError",
      $fault: "server",
      ...opts
    });
    this.name = "InternalServerError";
    this.$fault = "server";
    Object.setPrototypeOf(this, InternalServerError2.prototype);
    this.Message = opts.Message;
  }
};
var ExternalAlarmState;
(function(ExternalAlarmState2) {
  ExternalAlarmState2["ALARM"] = "ALARM";
  ExternalAlarmState2["UNKNOWN"] = "UNKNOWN";
})(ExternalAlarmState || (ExternalAlarmState = {}));
var AssociationComplianceSeverity;
(function(AssociationComplianceSeverity2) {
  AssociationComplianceSeverity2["Critical"] = "CRITICAL";
  AssociationComplianceSeverity2["High"] = "HIGH";
  AssociationComplianceSeverity2["Low"] = "LOW";
  AssociationComplianceSeverity2["Medium"] = "MEDIUM";
  AssociationComplianceSeverity2["Unspecified"] = "UNSPECIFIED";
})(AssociationComplianceSeverity || (AssociationComplianceSeverity = {}));
var AssociationSyncCompliance;
(function(AssociationSyncCompliance2) {
  AssociationSyncCompliance2["Auto"] = "AUTO";
  AssociationSyncCompliance2["Manual"] = "MANUAL";
})(AssociationSyncCompliance || (AssociationSyncCompliance = {}));
var AssociationStatusName;
(function(AssociationStatusName2) {
  AssociationStatusName2["Failed"] = "Failed";
  AssociationStatusName2["Pending"] = "Pending";
  AssociationStatusName2["Success"] = "Success";
})(AssociationStatusName || (AssociationStatusName = {}));
var Fault;
(function(Fault2) {
  Fault2["Client"] = "Client";
  Fault2["Server"] = "Server";
  Fault2["Unknown"] = "Unknown";
})(Fault || (Fault = {}));
var AttachmentsSourceKey;
(function(AttachmentsSourceKey2) {
  AttachmentsSourceKey2["AttachmentReference"] = "AttachmentReference";
  AttachmentsSourceKey2["S3FileUrl"] = "S3FileUrl";
  AttachmentsSourceKey2["SourceUrl"] = "SourceUrl";
})(AttachmentsSourceKey || (AttachmentsSourceKey = {}));
var DocumentFormat;
(function(DocumentFormat2) {
  DocumentFormat2["JSON"] = "JSON";
  DocumentFormat2["TEXT"] = "TEXT";
  DocumentFormat2["YAML"] = "YAML";
})(DocumentFormat || (DocumentFormat = {}));
var DocumentType;
(function(DocumentType2) {
  DocumentType2["ApplicationConfiguration"] = "ApplicationConfiguration";
  DocumentType2["ApplicationConfigurationSchema"] = "ApplicationConfigurationSchema";
  DocumentType2["Automation"] = "Automation";
  DocumentType2["ChangeCalendar"] = "ChangeCalendar";
  DocumentType2["ChangeTemplate"] = "Automation.ChangeTemplate";
  DocumentType2["CloudFormation"] = "CloudFormation";
  DocumentType2["Command"] = "Command";
  DocumentType2["ConformancePackTemplate"] = "ConformancePackTemplate";
  DocumentType2["DeploymentStrategy"] = "DeploymentStrategy";
  DocumentType2["Package"] = "Package";
  DocumentType2["Policy"] = "Policy";
  DocumentType2["ProblemAnalysis"] = "ProblemAnalysis";
  DocumentType2["ProblemAnalysisTemplate"] = "ProblemAnalysisTemplate";
  DocumentType2["QuickSetup"] = "QuickSetup";
  DocumentType2["Session"] = "Session";
})(DocumentType || (DocumentType = {}));
var DocumentHashType;
(function(DocumentHashType2) {
  DocumentHashType2["SHA1"] = "Sha1";
  DocumentHashType2["SHA256"] = "Sha256";
})(DocumentHashType || (DocumentHashType = {}));
var DocumentParameterType;
(function(DocumentParameterType2) {
  DocumentParameterType2["String"] = "String";
  DocumentParameterType2["StringList"] = "StringList";
})(DocumentParameterType || (DocumentParameterType = {}));
var PlatformType;
(function(PlatformType2) {
  PlatformType2["LINUX"] = "Linux";
  PlatformType2["MACOS"] = "MacOS";
  PlatformType2["WINDOWS"] = "Windows";
})(PlatformType || (PlatformType = {}));
var ReviewStatus;
(function(ReviewStatus3) {
  ReviewStatus3["APPROVED"] = "APPROVED";
  ReviewStatus3["NOT_REVIEWED"] = "NOT_REVIEWED";
  ReviewStatus3["PENDING"] = "PENDING";
  ReviewStatus3["REJECTED"] = "REJECTED";
})(ReviewStatus || (ReviewStatus = {}));
var DocumentStatus;
(function(DocumentStatus2) {
  DocumentStatus2["Active"] = "Active";
  DocumentStatus2["Creating"] = "Creating";
  DocumentStatus2["Deleting"] = "Deleting";
  DocumentStatus2["Failed"] = "Failed";
  DocumentStatus2["Updating"] = "Updating";
})(DocumentStatus || (DocumentStatus = {}));
var OpsItemDataType;
(function(OpsItemDataType2) {
  OpsItemDataType2["SEARCHABLE_STRING"] = "SearchableString";
  OpsItemDataType2["STRING"] = "String";
})(OpsItemDataType || (OpsItemDataType = {}));
var PatchComplianceLevel;
(function(PatchComplianceLevel2) {
  PatchComplianceLevel2["Critical"] = "CRITICAL";
  PatchComplianceLevel2["High"] = "HIGH";
  PatchComplianceLevel2["Informational"] = "INFORMATIONAL";
  PatchComplianceLevel2["Low"] = "LOW";
  PatchComplianceLevel2["Medium"] = "MEDIUM";
  PatchComplianceLevel2["Unspecified"] = "UNSPECIFIED";
})(PatchComplianceLevel || (PatchComplianceLevel = {}));
var PatchFilterKey;
(function(PatchFilterKey2) {
  PatchFilterKey2["AdvisoryId"] = "ADVISORY_ID";
  PatchFilterKey2["Arch"] = "ARCH";
  PatchFilterKey2["BugzillaId"] = "BUGZILLA_ID";
  PatchFilterKey2["CVEId"] = "CVE_ID";
  PatchFilterKey2["Classification"] = "CLASSIFICATION";
  PatchFilterKey2["Epoch"] = "EPOCH";
  PatchFilterKey2["MsrcSeverity"] = "MSRC_SEVERITY";
  PatchFilterKey2["Name"] = "NAME";
  PatchFilterKey2["PatchId"] = "PATCH_ID";
  PatchFilterKey2["PatchSet"] = "PATCH_SET";
  PatchFilterKey2["Priority"] = "PRIORITY";
  PatchFilterKey2["Product"] = "PRODUCT";
  PatchFilterKey2["ProductFamily"] = "PRODUCT_FAMILY";
  PatchFilterKey2["Release"] = "RELEASE";
  PatchFilterKey2["Repository"] = "REPOSITORY";
  PatchFilterKey2["Section"] = "SECTION";
  PatchFilterKey2["Security"] = "SECURITY";
  PatchFilterKey2["Severity"] = "SEVERITY";
  PatchFilterKey2["Version"] = "VERSION";
})(PatchFilterKey || (PatchFilterKey = {}));
var OperatingSystem;
(function(OperatingSystem2) {
  OperatingSystem2["AmazonLinux"] = "AMAZON_LINUX";
  OperatingSystem2["AmazonLinux2"] = "AMAZON_LINUX_2";
  OperatingSystem2["AmazonLinux2022"] = "AMAZON_LINUX_2022";
  OperatingSystem2["CentOS"] = "CENTOS";
  OperatingSystem2["Debian"] = "DEBIAN";
  OperatingSystem2["MacOS"] = "MACOS";
  OperatingSystem2["OracleLinux"] = "ORACLE_LINUX";
  OperatingSystem2["Raspbian"] = "RASPBIAN";
  OperatingSystem2["RedhatEnterpriseLinux"] = "REDHAT_ENTERPRISE_LINUX";
  OperatingSystem2["Rocky_Linux"] = "ROCKY_LINUX";
  OperatingSystem2["Suse"] = "SUSE";
  OperatingSystem2["Ubuntu"] = "UBUNTU";
  OperatingSystem2["Windows"] = "WINDOWS";
})(OperatingSystem || (OperatingSystem = {}));
var PatchAction;
(function(PatchAction2) {
  PatchAction2["AllowAsDependency"] = "ALLOW_AS_DEPENDENCY";
  PatchAction2["Block"] = "BLOCK";
})(PatchAction || (PatchAction = {}));
var ResourceDataSyncS3Format;
(function(ResourceDataSyncS3Format2) {
  ResourceDataSyncS3Format2["JSON_SERDE"] = "JsonSerDe";
})(ResourceDataSyncS3Format || (ResourceDataSyncS3Format = {}));
var InventorySchemaDeleteOption;
(function(InventorySchemaDeleteOption2) {
  InventorySchemaDeleteOption2["DELETE_SCHEMA"] = "DeleteSchema";
  InventorySchemaDeleteOption2["DISABLE_SCHEMA"] = "DisableSchema";
})(InventorySchemaDeleteOption || (InventorySchemaDeleteOption = {}));
var DescribeActivationsFilterKeys;
(function(DescribeActivationsFilterKeys2) {
  DescribeActivationsFilterKeys2["ACTIVATION_IDS"] = "ActivationIds";
  DescribeActivationsFilterKeys2["DEFAULT_INSTANCE_NAME"] = "DefaultInstanceName";
  DescribeActivationsFilterKeys2["IAM_ROLE"] = "IamRole";
})(DescribeActivationsFilterKeys || (DescribeActivationsFilterKeys = {}));
var AssociationExecutionFilterKey;
(function(AssociationExecutionFilterKey2) {
  AssociationExecutionFilterKey2["CreatedTime"] = "CreatedTime";
  AssociationExecutionFilterKey2["ExecutionId"] = "ExecutionId";
  AssociationExecutionFilterKey2["Status"] = "Status";
})(AssociationExecutionFilterKey || (AssociationExecutionFilterKey = {}));
var AssociationFilterOperatorType;
(function(AssociationFilterOperatorType2) {
  AssociationFilterOperatorType2["Equal"] = "EQUAL";
  AssociationFilterOperatorType2["GreaterThan"] = "GREATER_THAN";
  AssociationFilterOperatorType2["LessThan"] = "LESS_THAN";
})(AssociationFilterOperatorType || (AssociationFilterOperatorType = {}));
var AssociationExecutionTargetsFilterKey;
(function(AssociationExecutionTargetsFilterKey2) {
  AssociationExecutionTargetsFilterKey2["ResourceId"] = "ResourceId";
  AssociationExecutionTargetsFilterKey2["ResourceType"] = "ResourceType";
  AssociationExecutionTargetsFilterKey2["Status"] = "Status";
})(AssociationExecutionTargetsFilterKey || (AssociationExecutionTargetsFilterKey = {}));
var AutomationExecutionFilterKey;
(function(AutomationExecutionFilterKey2) {
  AutomationExecutionFilterKey2["AUTOMATION_SUBTYPE"] = "AutomationSubtype";
  AutomationExecutionFilterKey2["AUTOMATION_TYPE"] = "AutomationType";
  AutomationExecutionFilterKey2["CURRENT_ACTION"] = "CurrentAction";
  AutomationExecutionFilterKey2["DOCUMENT_NAME_PREFIX"] = "DocumentNamePrefix";
  AutomationExecutionFilterKey2["EXECUTION_ID"] = "ExecutionId";
  AutomationExecutionFilterKey2["EXECUTION_STATUS"] = "ExecutionStatus";
  AutomationExecutionFilterKey2["OPS_ITEM_ID"] = "OpsItemId";
  AutomationExecutionFilterKey2["PARENT_EXECUTION_ID"] = "ParentExecutionId";
  AutomationExecutionFilterKey2["START_TIME_AFTER"] = "StartTimeAfter";
  AutomationExecutionFilterKey2["START_TIME_BEFORE"] = "StartTimeBefore";
  AutomationExecutionFilterKey2["TAG_KEY"] = "TagKey";
  AutomationExecutionFilterKey2["TARGET_RESOURCE_GROUP"] = "TargetResourceGroup";
})(AutomationExecutionFilterKey || (AutomationExecutionFilterKey = {}));
var AutomationExecutionStatus;
(function(AutomationExecutionStatus2) {
  AutomationExecutionStatus2["APPROVED"] = "Approved";
  AutomationExecutionStatus2["CANCELLED"] = "Cancelled";
  AutomationExecutionStatus2["CANCELLING"] = "Cancelling";
  AutomationExecutionStatus2["CHANGE_CALENDAR_OVERRIDE_APPROVED"] = "ChangeCalendarOverrideApproved";
  AutomationExecutionStatus2["CHANGE_CALENDAR_OVERRIDE_REJECTED"] = "ChangeCalendarOverrideRejected";
  AutomationExecutionStatus2["COMPLETED_WITH_FAILURE"] = "CompletedWithFailure";
  AutomationExecutionStatus2["COMPLETED_WITH_SUCCESS"] = "CompletedWithSuccess";
  AutomationExecutionStatus2["FAILED"] = "Failed";
  AutomationExecutionStatus2["INPROGRESS"] = "InProgress";
  AutomationExecutionStatus2["PENDING"] = "Pending";
  AutomationExecutionStatus2["PENDING_APPROVAL"] = "PendingApproval";
  AutomationExecutionStatus2["PENDING_CHANGE_CALENDAR_OVERRIDE"] = "PendingChangeCalendarOverride";
  AutomationExecutionStatus2["REJECTED"] = "Rejected";
  AutomationExecutionStatus2["RUNBOOK_INPROGRESS"] = "RunbookInProgress";
  AutomationExecutionStatus2["SCHEDULED"] = "Scheduled";
  AutomationExecutionStatus2["SUCCESS"] = "Success";
  AutomationExecutionStatus2["TIMEDOUT"] = "TimedOut";
  AutomationExecutionStatus2["WAITING"] = "Waiting";
})(AutomationExecutionStatus || (AutomationExecutionStatus = {}));
var AutomationSubtype;
(function(AutomationSubtype2) {
  AutomationSubtype2["ChangeRequest"] = "ChangeRequest";
})(AutomationSubtype || (AutomationSubtype = {}));
var AutomationType;
(function(AutomationType2) {
  AutomationType2["CrossAccount"] = "CrossAccount";
  AutomationType2["Local"] = "Local";
})(AutomationType || (AutomationType = {}));
var ExecutionMode;
(function(ExecutionMode2) {
  ExecutionMode2["Auto"] = "Auto";
  ExecutionMode2["Interactive"] = "Interactive";
})(ExecutionMode || (ExecutionMode = {}));
var StepExecutionFilterKey;
(function(StepExecutionFilterKey2) {
  StepExecutionFilterKey2["ACTION"] = "Action";
  StepExecutionFilterKey2["START_TIME_AFTER"] = "StartTimeAfter";
  StepExecutionFilterKey2["START_TIME_BEFORE"] = "StartTimeBefore";
  StepExecutionFilterKey2["STEP_EXECUTION_ID"] = "StepExecutionId";
  StepExecutionFilterKey2["STEP_EXECUTION_STATUS"] = "StepExecutionStatus";
  StepExecutionFilterKey2["STEP_NAME"] = "StepName";
})(StepExecutionFilterKey || (StepExecutionFilterKey = {}));
var DocumentPermissionType;
(function(DocumentPermissionType2) {
  DocumentPermissionType2["SHARE"] = "Share";
})(DocumentPermissionType || (DocumentPermissionType = {}));
var PatchDeploymentStatus;
(function(PatchDeploymentStatus2) {
  PatchDeploymentStatus2["Approved"] = "APPROVED";
  PatchDeploymentStatus2["ExplicitApproved"] = "EXPLICIT_APPROVED";
  PatchDeploymentStatus2["ExplicitRejected"] = "EXPLICIT_REJECTED";
  PatchDeploymentStatus2["PendingApproval"] = "PENDING_APPROVAL";
})(PatchDeploymentStatus || (PatchDeploymentStatus = {}));
var InstanceInformationFilterKey;
(function(InstanceInformationFilterKey2) {
  InstanceInformationFilterKey2["ACTIVATION_IDS"] = "ActivationIds";
  InstanceInformationFilterKey2["AGENT_VERSION"] = "AgentVersion";
  InstanceInformationFilterKey2["ASSOCIATION_STATUS"] = "AssociationStatus";
  InstanceInformationFilterKey2["IAM_ROLE"] = "IamRole";
  InstanceInformationFilterKey2["INSTANCE_IDS"] = "InstanceIds";
  InstanceInformationFilterKey2["PING_STATUS"] = "PingStatus";
  InstanceInformationFilterKey2["PLATFORM_TYPES"] = "PlatformTypes";
  InstanceInformationFilterKey2["RESOURCE_TYPE"] = "ResourceType";
})(InstanceInformationFilterKey || (InstanceInformationFilterKey = {}));
var PingStatus;
(function(PingStatus2) {
  PingStatus2["CONNECTION_LOST"] = "ConnectionLost";
  PingStatus2["INACTIVE"] = "Inactive";
  PingStatus2["ONLINE"] = "Online";
})(PingStatus || (PingStatus = {}));
var ResourceType2;
(function(ResourceType3) {
  ResourceType3["DOCUMENT"] = "Document";
  ResourceType3["EC2_INSTANCE"] = "EC2Instance";
  ResourceType3["MANAGED_INSTANCE"] = "ManagedInstance";
})(ResourceType2 || (ResourceType2 = {}));
var SourceType;
(function(SourceType2) {
  SourceType2["AWS_EC2_INSTANCE"] = "AWS::EC2::Instance";
  SourceType2["AWS_IOT_THING"] = "AWS::IoT::Thing";
  SourceType2["AWS_SSM_MANAGEDINSTANCE"] = "AWS::SSM::ManagedInstance";
})(SourceType || (SourceType = {}));
var PatchComplianceDataState;
(function(PatchComplianceDataState2) {
  PatchComplianceDataState2["Failed"] = "FAILED";
  PatchComplianceDataState2["Installed"] = "INSTALLED";
  PatchComplianceDataState2["InstalledOther"] = "INSTALLED_OTHER";
  PatchComplianceDataState2["InstalledPendingReboot"] = "INSTALLED_PENDING_REBOOT";
  PatchComplianceDataState2["InstalledRejected"] = "INSTALLED_REJECTED";
  PatchComplianceDataState2["Missing"] = "MISSING";
  PatchComplianceDataState2["NotApplicable"] = "NOT_APPLICABLE";
})(PatchComplianceDataState || (PatchComplianceDataState = {}));
var PatchOperationType;
(function(PatchOperationType2) {
  PatchOperationType2["INSTALL"] = "Install";
  PatchOperationType2["SCAN"] = "Scan";
})(PatchOperationType || (PatchOperationType = {}));
var RebootOption;
(function(RebootOption2) {
  RebootOption2["NO_REBOOT"] = "NoReboot";
  RebootOption2["REBOOT_IF_NEEDED"] = "RebootIfNeeded";
})(RebootOption || (RebootOption = {}));
var InstancePatchStateOperatorType;
(function(InstancePatchStateOperatorType2) {
  InstancePatchStateOperatorType2["EQUAL"] = "Equal";
  InstancePatchStateOperatorType2["GREATER_THAN"] = "GreaterThan";
  InstancePatchStateOperatorType2["LESS_THAN"] = "LessThan";
  InstancePatchStateOperatorType2["NOT_EQUAL"] = "NotEqual";
})(InstancePatchStateOperatorType || (InstancePatchStateOperatorType = {}));
var InventoryDeletionStatus;
(function(InventoryDeletionStatus2) {
  InventoryDeletionStatus2["COMPLETE"] = "Complete";
  InventoryDeletionStatus2["IN_PROGRESS"] = "InProgress";
})(InventoryDeletionStatus || (InventoryDeletionStatus = {}));
var MaintenanceWindowExecutionStatus;
(function(MaintenanceWindowExecutionStatus2) {
  MaintenanceWindowExecutionStatus2["Cancelled"] = "CANCELLED";
  MaintenanceWindowExecutionStatus2["Cancelling"] = "CANCELLING";
  MaintenanceWindowExecutionStatus2["Failed"] = "FAILED";
  MaintenanceWindowExecutionStatus2["InProgress"] = "IN_PROGRESS";
  MaintenanceWindowExecutionStatus2["Pending"] = "PENDING";
  MaintenanceWindowExecutionStatus2["SkippedOverlapping"] = "SKIPPED_OVERLAPPING";
  MaintenanceWindowExecutionStatus2["Success"] = "SUCCESS";
  MaintenanceWindowExecutionStatus2["TimedOut"] = "TIMED_OUT";
})(MaintenanceWindowExecutionStatus || (MaintenanceWindowExecutionStatus = {}));
var MaintenanceWindowTaskType;
(function(MaintenanceWindowTaskType2) {
  MaintenanceWindowTaskType2["Automation"] = "AUTOMATION";
  MaintenanceWindowTaskType2["Lambda"] = "LAMBDA";
  MaintenanceWindowTaskType2["RunCommand"] = "RUN_COMMAND";
  MaintenanceWindowTaskType2["StepFunctions"] = "STEP_FUNCTIONS";
})(MaintenanceWindowTaskType || (MaintenanceWindowTaskType = {}));
var MaintenanceWindowResourceType;
(function(MaintenanceWindowResourceType2) {
  MaintenanceWindowResourceType2["Instance"] = "INSTANCE";
  MaintenanceWindowResourceType2["ResourceGroup"] = "RESOURCE_GROUP";
})(MaintenanceWindowResourceType || (MaintenanceWindowResourceType = {}));
var MaintenanceWindowTaskCutoffBehavior;
(function(MaintenanceWindowTaskCutoffBehavior2) {
  MaintenanceWindowTaskCutoffBehavior2["CancelTask"] = "CANCEL_TASK";
  MaintenanceWindowTaskCutoffBehavior2["ContinueTask"] = "CONTINUE_TASK";
})(MaintenanceWindowTaskCutoffBehavior || (MaintenanceWindowTaskCutoffBehavior = {}));
var OpsItemFilterKey;
(function(OpsItemFilterKey2) {
  OpsItemFilterKey2["ACCOUNT_ID"] = "AccountId";
  OpsItemFilterKey2["ACTUAL_END_TIME"] = "ActualEndTime";
  OpsItemFilterKey2["ACTUAL_START_TIME"] = "ActualStartTime";
  OpsItemFilterKey2["AUTOMATION_ID"] = "AutomationId";
  OpsItemFilterKey2["CATEGORY"] = "Category";
  OpsItemFilterKey2["CHANGE_REQUEST_APPROVER_ARN"] = "ChangeRequestByApproverArn";
  OpsItemFilterKey2["CHANGE_REQUEST_APPROVER_NAME"] = "ChangeRequestByApproverName";
  OpsItemFilterKey2["CHANGE_REQUEST_REQUESTER_ARN"] = "ChangeRequestByRequesterArn";
  OpsItemFilterKey2["CHANGE_REQUEST_REQUESTER_NAME"] = "ChangeRequestByRequesterName";
  OpsItemFilterKey2["CHANGE_REQUEST_TARGETS_RESOURCE_GROUP"] = "ChangeRequestByTargetsResourceGroup";
  OpsItemFilterKey2["CHANGE_REQUEST_TEMPLATE"] = "ChangeRequestByTemplate";
  OpsItemFilterKey2["CREATED_BY"] = "CreatedBy";
  OpsItemFilterKey2["CREATED_TIME"] = "CreatedTime";
  OpsItemFilterKey2["INSIGHT_TYPE"] = "InsightByType";
  OpsItemFilterKey2["LAST_MODIFIED_TIME"] = "LastModifiedTime";
  OpsItemFilterKey2["OPERATIONAL_DATA"] = "OperationalData";
  OpsItemFilterKey2["OPERATIONAL_DATA_KEY"] = "OperationalDataKey";
  OpsItemFilterKey2["OPERATIONAL_DATA_VALUE"] = "OperationalDataValue";
  OpsItemFilterKey2["OPSITEM_ID"] = "OpsItemId";
  OpsItemFilterKey2["OPSITEM_TYPE"] = "OpsItemType";
  OpsItemFilterKey2["PLANNED_END_TIME"] = "PlannedEndTime";
  OpsItemFilterKey2["PLANNED_START_TIME"] = "PlannedStartTime";
  OpsItemFilterKey2["PRIORITY"] = "Priority";
  OpsItemFilterKey2["RESOURCE_ID"] = "ResourceId";
  OpsItemFilterKey2["SEVERITY"] = "Severity";
  OpsItemFilterKey2["SOURCE"] = "Source";
  OpsItemFilterKey2["STATUS"] = "Status";
  OpsItemFilterKey2["TITLE"] = "Title";
})(OpsItemFilterKey || (OpsItemFilterKey = {}));
var OpsItemFilterOperator;
(function(OpsItemFilterOperator2) {
  OpsItemFilterOperator2["CONTAINS"] = "Contains";
  OpsItemFilterOperator2["EQUAL"] = "Equal";
  OpsItemFilterOperator2["GREATER_THAN"] = "GreaterThan";
  OpsItemFilterOperator2["LESS_THAN"] = "LessThan";
})(OpsItemFilterOperator || (OpsItemFilterOperator = {}));

// ../../node_modules/@aws-sdk/client-ssm/dist-es/models/models_1.js
var OpsItemStatus;
(function(OpsItemStatus2) {
  OpsItemStatus2["APPROVED"] = "Approved";
  OpsItemStatus2["CANCELLED"] = "Cancelled";
  OpsItemStatus2["CANCELLING"] = "Cancelling";
  OpsItemStatus2["CHANGE_CALENDAR_OVERRIDE_APPROVED"] = "ChangeCalendarOverrideApproved";
  OpsItemStatus2["CHANGE_CALENDAR_OVERRIDE_REJECTED"] = "ChangeCalendarOverrideRejected";
  OpsItemStatus2["CLOSED"] = "Closed";
  OpsItemStatus2["COMPLETED_WITH_FAILURE"] = "CompletedWithFailure";
  OpsItemStatus2["COMPLETED_WITH_SUCCESS"] = "CompletedWithSuccess";
  OpsItemStatus2["FAILED"] = "Failed";
  OpsItemStatus2["IN_PROGRESS"] = "InProgress";
  OpsItemStatus2["OPEN"] = "Open";
  OpsItemStatus2["PENDING"] = "Pending";
  OpsItemStatus2["PENDING_APPROVAL"] = "PendingApproval";
  OpsItemStatus2["PENDING_CHANGE_CALENDAR_OVERRIDE"] = "PendingChangeCalendarOverride";
  OpsItemStatus2["REJECTED"] = "Rejected";
  OpsItemStatus2["RESOLVED"] = "Resolved";
  OpsItemStatus2["RUNBOOK_IN_PROGRESS"] = "RunbookInProgress";
  OpsItemStatus2["SCHEDULED"] = "Scheduled";
  OpsItemStatus2["TIMED_OUT"] = "TimedOut";
})(OpsItemStatus || (OpsItemStatus = {}));
var ParametersFilterKey;
(function(ParametersFilterKey2) {
  ParametersFilterKey2["KEY_ID"] = "KeyId";
  ParametersFilterKey2["NAME"] = "Name";
  ParametersFilterKey2["TYPE"] = "Type";
})(ParametersFilterKey || (ParametersFilterKey = {}));
var ParameterTier;
(function(ParameterTier2) {
  ParameterTier2["ADVANCED"] = "Advanced";
  ParameterTier2["INTELLIGENT_TIERING"] = "Intelligent-Tiering";
  ParameterTier2["STANDARD"] = "Standard";
})(ParameterTier || (ParameterTier = {}));
var ParameterType;
(function(ParameterType2) {
  ParameterType2["SECURE_STRING"] = "SecureString";
  ParameterType2["STRING"] = "String";
  ParameterType2["STRING_LIST"] = "StringList";
})(ParameterType || (ParameterType = {}));
var PatchSet;
(function(PatchSet2) {
  PatchSet2["Application"] = "APPLICATION";
  PatchSet2["Os"] = "OS";
})(PatchSet || (PatchSet = {}));
var PatchProperty;
(function(PatchProperty2) {
  PatchProperty2["PatchClassification"] = "CLASSIFICATION";
  PatchProperty2["PatchMsrcSeverity"] = "MSRC_SEVERITY";
  PatchProperty2["PatchPriority"] = "PRIORITY";
  PatchProperty2["PatchProductFamily"] = "PRODUCT_FAMILY";
  PatchProperty2["PatchSeverity"] = "SEVERITY";
  PatchProperty2["Product"] = "PRODUCT";
})(PatchProperty || (PatchProperty = {}));
var SessionFilterKey;
(function(SessionFilterKey2) {
  SessionFilterKey2["INVOKED_AFTER"] = "InvokedAfter";
  SessionFilterKey2["INVOKED_BEFORE"] = "InvokedBefore";
  SessionFilterKey2["OWNER"] = "Owner";
  SessionFilterKey2["SESSION_ID"] = "SessionId";
  SessionFilterKey2["STATUS"] = "Status";
  SessionFilterKey2["TARGET_ID"] = "Target";
})(SessionFilterKey || (SessionFilterKey = {}));
var SessionState;
(function(SessionState2) {
  SessionState2["ACTIVE"] = "Active";
  SessionState2["HISTORY"] = "History";
})(SessionState || (SessionState = {}));
var SessionStatus;
(function(SessionStatus2) {
  SessionStatus2["CONNECTED"] = "Connected";
  SessionStatus2["CONNECTING"] = "Connecting";
  SessionStatus2["DISCONNECTED"] = "Disconnected";
  SessionStatus2["FAILED"] = "Failed";
  SessionStatus2["TERMINATED"] = "Terminated";
  SessionStatus2["TERMINATING"] = "Terminating";
})(SessionStatus || (SessionStatus = {}));
var CalendarState;
(function(CalendarState2) {
  CalendarState2["CLOSED"] = "CLOSED";
  CalendarState2["OPEN"] = "OPEN";
})(CalendarState || (CalendarState = {}));
var CommandInvocationStatus;
(function(CommandInvocationStatus2) {
  CommandInvocationStatus2["CANCELLED"] = "Cancelled";
  CommandInvocationStatus2["CANCELLING"] = "Cancelling";
  CommandInvocationStatus2["DELAYED"] = "Delayed";
  CommandInvocationStatus2["FAILED"] = "Failed";
  CommandInvocationStatus2["IN_PROGRESS"] = "InProgress";
  CommandInvocationStatus2["PENDING"] = "Pending";
  CommandInvocationStatus2["SUCCESS"] = "Success";
  CommandInvocationStatus2["TIMED_OUT"] = "TimedOut";
})(CommandInvocationStatus || (CommandInvocationStatus = {}));
var ConnectionStatus;
(function(ConnectionStatus2) {
  ConnectionStatus2["CONNECTED"] = "Connected";
  ConnectionStatus2["NOT_CONNECTED"] = "NotConnected";
})(ConnectionStatus || (ConnectionStatus = {}));
var AttachmentHashType;
(function(AttachmentHashType2) {
  AttachmentHashType2["SHA256"] = "Sha256";
})(AttachmentHashType || (AttachmentHashType = {}));
var InventoryQueryOperatorType;
(function(InventoryQueryOperatorType2) {
  InventoryQueryOperatorType2["BEGIN_WITH"] = "BeginWith";
  InventoryQueryOperatorType2["EQUAL"] = "Equal";
  InventoryQueryOperatorType2["EXISTS"] = "Exists";
  InventoryQueryOperatorType2["GREATER_THAN"] = "GreaterThan";
  InventoryQueryOperatorType2["LESS_THAN"] = "LessThan";
  InventoryQueryOperatorType2["NOT_EQUAL"] = "NotEqual";
})(InventoryQueryOperatorType || (InventoryQueryOperatorType = {}));
var InventoryAttributeDataType;
(function(InventoryAttributeDataType2) {
  InventoryAttributeDataType2["NUMBER"] = "number";
  InventoryAttributeDataType2["STRING"] = "string";
})(InventoryAttributeDataType || (InventoryAttributeDataType = {}));
var NotificationEvent;
(function(NotificationEvent2) {
  NotificationEvent2["ALL"] = "All";
  NotificationEvent2["CANCELLED"] = "Cancelled";
  NotificationEvent2["FAILED"] = "Failed";
  NotificationEvent2["IN_PROGRESS"] = "InProgress";
  NotificationEvent2["SUCCESS"] = "Success";
  NotificationEvent2["TIMED_OUT"] = "TimedOut";
})(NotificationEvent || (NotificationEvent = {}));
var NotificationType;
(function(NotificationType2) {
  NotificationType2["Command"] = "Command";
  NotificationType2["Invocation"] = "Invocation";
})(NotificationType || (NotificationType = {}));
var OpsFilterOperatorType;
(function(OpsFilterOperatorType2) {
  OpsFilterOperatorType2["BEGIN_WITH"] = "BeginWith";
  OpsFilterOperatorType2["EQUAL"] = "Equal";
  OpsFilterOperatorType2["EXISTS"] = "Exists";
  OpsFilterOperatorType2["GREATER_THAN"] = "GreaterThan";
  OpsFilterOperatorType2["LESS_THAN"] = "LessThan";
  OpsFilterOperatorType2["NOT_EQUAL"] = "NotEqual";
})(OpsFilterOperatorType || (OpsFilterOperatorType = {}));
var InvalidKeyId = class extends SSMServiceException {
  constructor(opts) {
    super({
      name: "InvalidKeyId",
      $fault: "client",
      ...opts
    });
    this.name = "InvalidKeyId";
    this.$fault = "client";
    Object.setPrototypeOf(this, InvalidKeyId.prototype);
  }
};
var AssociationFilterKey;
(function(AssociationFilterKey2) {
  AssociationFilterKey2["AssociationId"] = "AssociationId";
  AssociationFilterKey2["AssociationName"] = "AssociationName";
  AssociationFilterKey2["InstanceId"] = "InstanceId";
  AssociationFilterKey2["LastExecutedAfter"] = "LastExecutedAfter";
  AssociationFilterKey2["LastExecutedBefore"] = "LastExecutedBefore";
  AssociationFilterKey2["Name"] = "Name";
  AssociationFilterKey2["ResourceGroupName"] = "ResourceGroupName";
  AssociationFilterKey2["Status"] = "AssociationStatusName";
})(AssociationFilterKey || (AssociationFilterKey = {}));
var CommandFilterKey;
(function(CommandFilterKey2) {
  CommandFilterKey2["DOCUMENT_NAME"] = "DocumentName";
  CommandFilterKey2["EXECUTION_STAGE"] = "ExecutionStage";
  CommandFilterKey2["INVOKED_AFTER"] = "InvokedAfter";
  CommandFilterKey2["INVOKED_BEFORE"] = "InvokedBefore";
  CommandFilterKey2["STATUS"] = "Status";
})(CommandFilterKey || (CommandFilterKey = {}));
var CommandPluginStatus;
(function(CommandPluginStatus2) {
  CommandPluginStatus2["CANCELLED"] = "Cancelled";
  CommandPluginStatus2["FAILED"] = "Failed";
  CommandPluginStatus2["IN_PROGRESS"] = "InProgress";
  CommandPluginStatus2["PENDING"] = "Pending";
  CommandPluginStatus2["SUCCESS"] = "Success";
  CommandPluginStatus2["TIMED_OUT"] = "TimedOut";
})(CommandPluginStatus || (CommandPluginStatus = {}));
var CommandStatus;
(function(CommandStatus2) {
  CommandStatus2["CANCELLED"] = "Cancelled";
  CommandStatus2["CANCELLING"] = "Cancelling";
  CommandStatus2["FAILED"] = "Failed";
  CommandStatus2["IN_PROGRESS"] = "InProgress";
  CommandStatus2["PENDING"] = "Pending";
  CommandStatus2["SUCCESS"] = "Success";
  CommandStatus2["TIMED_OUT"] = "TimedOut";
})(CommandStatus || (CommandStatus = {}));
var ComplianceQueryOperatorType;
(function(ComplianceQueryOperatorType2) {
  ComplianceQueryOperatorType2["BeginWith"] = "BEGIN_WITH";
  ComplianceQueryOperatorType2["Equal"] = "EQUAL";
  ComplianceQueryOperatorType2["GreaterThan"] = "GREATER_THAN";
  ComplianceQueryOperatorType2["LessThan"] = "LESS_THAN";
  ComplianceQueryOperatorType2["NotEqual"] = "NOT_EQUAL";
})(ComplianceQueryOperatorType || (ComplianceQueryOperatorType = {}));
var ComplianceSeverity;
(function(ComplianceSeverity2) {
  ComplianceSeverity2["Critical"] = "CRITICAL";
  ComplianceSeverity2["High"] = "HIGH";
  ComplianceSeverity2["Informational"] = "INFORMATIONAL";
  ComplianceSeverity2["Low"] = "LOW";
  ComplianceSeverity2["Medium"] = "MEDIUM";
  ComplianceSeverity2["Unspecified"] = "UNSPECIFIED";
})(ComplianceSeverity || (ComplianceSeverity = {}));
var ComplianceStatus;
(function(ComplianceStatus2) {
  ComplianceStatus2["Compliant"] = "COMPLIANT";
  ComplianceStatus2["NonCompliant"] = "NON_COMPLIANT";
})(ComplianceStatus || (ComplianceStatus = {}));
var DocumentMetadataEnum;
(function(DocumentMetadataEnum2) {
  DocumentMetadataEnum2["DocumentReviews"] = "DocumentReviews";
})(DocumentMetadataEnum || (DocumentMetadataEnum = {}));
var DocumentReviewCommentType;
(function(DocumentReviewCommentType2) {
  DocumentReviewCommentType2["Comment"] = "Comment";
})(DocumentReviewCommentType || (DocumentReviewCommentType = {}));
var DocumentFilterKey;
(function(DocumentFilterKey2) {
  DocumentFilterKey2["DocumentType"] = "DocumentType";
  DocumentFilterKey2["Name"] = "Name";
  DocumentFilterKey2["Owner"] = "Owner";
  DocumentFilterKey2["PlatformTypes"] = "PlatformTypes";
})(DocumentFilterKey || (DocumentFilterKey = {}));
var OpsItemEventFilterKey;
(function(OpsItemEventFilterKey2) {
  OpsItemEventFilterKey2["OPSITEM_ID"] = "OpsItemId";
})(OpsItemEventFilterKey || (OpsItemEventFilterKey = {}));
var OpsItemEventFilterOperator;
(function(OpsItemEventFilterOperator2) {
  OpsItemEventFilterOperator2["EQUAL"] = "Equal";
})(OpsItemEventFilterOperator || (OpsItemEventFilterOperator = {}));
var OpsItemRelatedItemsFilterKey;
(function(OpsItemRelatedItemsFilterKey2) {
  OpsItemRelatedItemsFilterKey2["ASSOCIATION_ID"] = "AssociationId";
  OpsItemRelatedItemsFilterKey2["RESOURCE_TYPE"] = "ResourceType";
  OpsItemRelatedItemsFilterKey2["RESOURCE_URI"] = "ResourceUri";
})(OpsItemRelatedItemsFilterKey || (OpsItemRelatedItemsFilterKey = {}));
var OpsItemRelatedItemsFilterOperator;
(function(OpsItemRelatedItemsFilterOperator2) {
  OpsItemRelatedItemsFilterOperator2["EQUAL"] = "Equal";
})(OpsItemRelatedItemsFilterOperator || (OpsItemRelatedItemsFilterOperator = {}));
var LastResourceDataSyncStatus;
(function(LastResourceDataSyncStatus2) {
  LastResourceDataSyncStatus2["FAILED"] = "Failed";
  LastResourceDataSyncStatus2["INPROGRESS"] = "InProgress";
  LastResourceDataSyncStatus2["SUCCESSFUL"] = "Successful";
})(LastResourceDataSyncStatus || (LastResourceDataSyncStatus = {}));
var ComplianceUploadType;
(function(ComplianceUploadType2) {
  ComplianceUploadType2["Complete"] = "COMPLETE";
  ComplianceUploadType2["Partial"] = "PARTIAL";
})(ComplianceUploadType || (ComplianceUploadType = {}));
var SignalType;
(function(SignalType2) {
  SignalType2["APPROVE"] = "Approve";
  SignalType2["REJECT"] = "Reject";
  SignalType2["RESUME"] = "Resume";
  SignalType2["START_STEP"] = "StartStep";
  SignalType2["STOP_STEP"] = "StopStep";
})(SignalType || (SignalType = {}));
var StopType;
(function(StopType2) {
  StopType2["CANCEL"] = "Cancel";
  StopType2["COMPLETE"] = "Complete";
})(StopType || (StopType = {}));
var ParameterFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Value && { Value: SENSITIVE_STRING }
});
var GetParametersRequestFilterSensitiveLog = (obj) => ({
  ...obj
});
var GetParametersResultFilterSensitiveLog = (obj) => ({
  ...obj,
  ...obj.Parameters && { Parameters: obj.Parameters.map((item) => ParameterFilterSensitiveLog(item)) }
});

// ../../node_modules/@aws-sdk/client-ssm/dist-es/protocols/Aws_json1_1.js
var serializeAws_json1_1GetParametersCommand = async (input, context) => {
  const headers = {
    "content-type": "application/x-amz-json-1.1",
    "x-amz-target": "AmazonSSM.GetParameters"
  };
  let body;
  body = JSON.stringify(serializeAws_json1_1GetParametersRequest(input, context));
  return buildHttpRpcRequest5(context, headers, "/", void 0, body);
};
var deserializeAws_json1_1GetParametersCommand = async (output, context) => {
  if (output.statusCode >= 300) {
    return deserializeAws_json1_1GetParametersCommandError(output, context);
  }
  const data = await parseBody11(output.body, context);
  let contents = {};
  contents = deserializeAws_json1_1GetParametersResult(data, context);
  const response = {
    $metadata: deserializeMetadata12(output),
    ...contents
  };
  return Promise.resolve(response);
};
var deserializeAws_json1_1GetParametersCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody11(output.body, context)
  };
  const errorCode = loadRestJsonErrorCode8(output, parsedOutput.body);
  switch (errorCode) {
    case "InternalServerError":
    case "com.amazonaws.ssm#InternalServerError":
      throw await deserializeAws_json1_1InternalServerErrorResponse(parsedOutput, context);
    case "InvalidKeyId":
    case "com.amazonaws.ssm#InvalidKeyId":
      throw await deserializeAws_json1_1InvalidKeyIdResponse(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody,
        exceptionCtor: SSMServiceException,
        errorCode
      });
  }
};
var deserializeAws_json1_1InternalServerErrorResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_json1_1InternalServerError(body, context);
  const exception = new InternalServerError2({
    $metadata: deserializeMetadata12(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var deserializeAws_json1_1InvalidKeyIdResponse = async (parsedOutput, context) => {
  const body = parsedOutput.body;
  const deserialized = deserializeAws_json1_1InvalidKeyId(body, context);
  const exception = new InvalidKeyId({
    $metadata: deserializeMetadata12(parsedOutput),
    ...deserialized
  });
  return decorateServiceException(exception, body);
};
var serializeAws_json1_1GetParametersRequest = (input, context) => {
  return {
    ...input.Names != null && { Names: serializeAws_json1_1ParameterNameList(input.Names, context) },
    ...input.WithDecryption != null && { WithDecryption: input.WithDecryption }
  };
};
var serializeAws_json1_1ParameterNameList = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return entry;
  });
};
var deserializeAws_json1_1GetParametersResult = (output, context) => {
  return {
    InvalidParameters: output.InvalidParameters != null ? deserializeAws_json1_1ParameterNameList(output.InvalidParameters, context) : void 0,
    Parameters: output.Parameters != null ? deserializeAws_json1_1ParameterList(output.Parameters, context) : void 0
  };
};
var deserializeAws_json1_1InternalServerError = (output, context) => {
  return {
    Message: expectString(output.Message)
  };
};
var deserializeAws_json1_1InvalidKeyId = (output, context) => {
  return {
    message: expectString(output.message)
  };
};
var deserializeAws_json1_1Parameter = (output, context) => {
  return {
    ARN: expectString(output.ARN),
    DataType: expectString(output.DataType),
    LastModifiedDate: output.LastModifiedDate != null ? expectNonNull(parseEpochTimestamp(expectNumber(output.LastModifiedDate))) : void 0,
    Name: expectString(output.Name),
    Selector: expectString(output.Selector),
    SourceResult: expectString(output.SourceResult),
    Type: expectString(output.Type),
    Value: expectString(output.Value),
    Version: expectLong(output.Version)
  };
};
var deserializeAws_json1_1ParameterList = (output, context) => {
  const retVal = (output || []).filter((e13) => e13 != null).map((entry) => {
    if (entry === null) {
      return null;
    }
    return deserializeAws_json1_1Parameter(entry, context);
  });
  return retVal;
};
var deserializeAws_json1_1ParameterNameList = (output, context) => {
  const retVal = (output || []).filter((e13) => e13 != null).map((entry) => {
    if (entry === null) {
      return null;
    }
    return expectString(entry);
  });
  return retVal;
};
var deserializeMetadata12 = (output) => ({
  httpStatusCode: output.statusCode,
  requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
  extendedRequestId: output.headers["x-amz-id-2"],
  cfId: output.headers["x-amz-cf-id"]
});
var collectBody11 = (streamBody = new Uint8Array(), context) => {
  if (streamBody instanceof Uint8Array) {
    return Promise.resolve(streamBody);
  }
  return context.streamCollector(streamBody) || Promise.resolve(new Uint8Array());
};
var collectBodyString11 = (streamBody, context) => collectBody11(streamBody, context).then((body) => context.utf8Encoder(body));
var buildHttpRpcRequest5 = async (context, headers, path, resolvedHostname, body) => {
  const { hostname, protocol = "https", port, path: basePath } = await context.endpoint();
  const contents = {
    protocol,
    hostname,
    port,
    method: "POST",
    path: basePath.endsWith("/") ? basePath.slice(0, -1) + path : basePath + path,
    headers
  };
  if (resolvedHostname !== void 0) {
    contents.hostname = resolvedHostname;
  }
  if (body !== void 0) {
    contents.body = body;
  }
  return new HttpRequest(contents);
};
var parseBody11 = (streamBody, context) => collectBodyString11(streamBody, context).then((encoded) => {
  if (encoded.length) {
    return JSON.parse(encoded);
  }
  return {};
});
var parseErrorBody11 = async (errorBody, context) => {
  const value = await parseBody11(errorBody, context);
  value.message = value.message ?? value.Message;
  return value;
};
var loadRestJsonErrorCode8 = (output, data) => {
  const findKey = (object, key) => Object.keys(object).find((k13) => k13.toLowerCase() === key.toLowerCase());
  const sanitizeErrorCode = (rawValue) => {
    let cleanValue = rawValue;
    if (typeof cleanValue === "number") {
      cleanValue = cleanValue.toString();
    }
    if (cleanValue.indexOf(",") >= 0) {
      cleanValue = cleanValue.split(",")[0];
    }
    if (cleanValue.indexOf(":") >= 0) {
      cleanValue = cleanValue.split(":")[0];
    }
    if (cleanValue.indexOf("#") >= 0) {
      cleanValue = cleanValue.split("#")[1];
    }
    return cleanValue;
  };
  const headerKey = findKey(output.headers, "x-amzn-errortype");
  if (headerKey !== void 0) {
    return sanitizeErrorCode(output.headers[headerKey]);
  }
  if (data.code !== void 0) {
    return sanitizeErrorCode(data.code);
  }
  if (data["__type"] !== void 0) {
    return sanitizeErrorCode(data["__type"]);
  }
};

// ../../node_modules/@aws-sdk/client-ssm/dist-es/commands/GetParametersCommand.js
var GetParametersCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, GetParametersCommand.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "SSMClient";
    const commandName = "GetParametersCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: GetParametersRequestFilterSensitiveLog,
      outputFilterSensitiveLog: GetParametersResultFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_json1_1GetParametersCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_json1_1GetParametersCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-ssm/dist-es/endpoint/EndpointParameters.js
var resolveClientEndpointParameters11 = (options) => {
  return {
    ...options,
    useDualstackEndpoint: options.useDualstackEndpoint ?? false,
    useFipsEndpoint: options.useFipsEndpoint ?? false,
    defaultSigningName: "ssm"
  };
};

// ../../node_modules/@aws-sdk/client-ssm/package.json
var package_default11 = {
  name: "@aws-sdk/client-ssm",
  description: "AWS SDK for JavaScript Ssm Client for Node.js, Browser and React Native",
  version: "3.256.0",
  scripts: {
    build: "concurrently 'yarn:build:cjs' 'yarn:build:es' 'yarn:build:types'",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "build:docs": "typedoc",
    "build:es": "tsc -p tsconfig.es.json",
    "build:include:deps": "lerna run --scope $npm_package_name --include-dependencies build",
    "build:types": "tsc -p tsconfig.types.json",
    "build:types:downlevel": "downlevel-dts dist-types dist-types/ts3.4",
    clean: "rimraf ./dist-* && rimraf *.tsbuildinfo",
    "generate:client": "node ../../scripts/generate-clients/single-service --solo ssm"
  },
  main: "./dist-cjs/index.js",
  types: "./dist-types/index.d.ts",
  module: "./dist-es/index.js",
  sideEffects: false,
  dependencies: {
    "@aws-crypto/sha256-browser": "3.0.0",
    "@aws-crypto/sha256-js": "3.0.0",
    "@aws-sdk/client-sts": "3.256.0",
    "@aws-sdk/config-resolver": "3.254.0",
    "@aws-sdk/credential-provider-node": "3.256.0",
    "@aws-sdk/fetch-http-handler": "3.254.0",
    "@aws-sdk/hash-node": "3.254.0",
    "@aws-sdk/invalid-dependency": "3.254.0",
    "@aws-sdk/middleware-content-length": "3.254.0",
    "@aws-sdk/middleware-endpoint": "3.254.0",
    "@aws-sdk/middleware-host-header": "3.254.0",
    "@aws-sdk/middleware-logger": "3.254.0",
    "@aws-sdk/middleware-recursion-detection": "3.254.0",
    "@aws-sdk/middleware-retry": "3.254.0",
    "@aws-sdk/middleware-serde": "3.254.0",
    "@aws-sdk/middleware-signing": "3.254.0",
    "@aws-sdk/middleware-stack": "3.254.0",
    "@aws-sdk/middleware-user-agent": "3.254.0",
    "@aws-sdk/node-config-provider": "3.254.0",
    "@aws-sdk/node-http-handler": "3.254.0",
    "@aws-sdk/protocol-http": "3.254.0",
    "@aws-sdk/smithy-client": "3.254.0",
    "@aws-sdk/types": "3.254.0",
    "@aws-sdk/url-parser": "3.254.0",
    "@aws-sdk/util-base64": "3.208.0",
    "@aws-sdk/util-body-length-browser": "3.188.0",
    "@aws-sdk/util-body-length-node": "3.208.0",
    "@aws-sdk/util-defaults-mode-browser": "3.254.0",
    "@aws-sdk/util-defaults-mode-node": "3.254.0",
    "@aws-sdk/util-endpoints": "3.254.0",
    "@aws-sdk/util-retry": "3.254.0",
    "@aws-sdk/util-user-agent-browser": "3.254.0",
    "@aws-sdk/util-user-agent-node": "3.254.0",
    "@aws-sdk/util-utf8-browser": "3.188.0",
    "@aws-sdk/util-utf8-node": "3.208.0",
    "@aws-sdk/util-waiter": "3.254.0",
    tslib: "^2.3.1",
    uuid: "^8.3.2"
  },
  devDependencies: {
    "@aws-sdk/service-client-documentation-generator": "3.208.0",
    "@tsconfig/node14": "1.0.3",
    "@types/node": "^14.14.31",
    "@types/uuid": "^8.3.0",
    concurrently: "7.0.0",
    "downlevel-dts": "0.10.1",
    rimraf: "3.0.2",
    typedoc: "0.19.2",
    typescript: "~4.6.2"
  },
  overrides: {
    typedoc: {
      typescript: "~4.6.2"
    }
  },
  engines: {
    node: ">=14.0.0"
  },
  typesVersions: {
    "<4.0": {
      "dist-types/*": [
        "dist-types/ts3.4/*"
      ]
    }
  },
  files: [
    "dist-*"
  ],
  author: {
    name: "AWS SDK for JavaScript Team",
    url: "https://aws.amazon.com/javascript/"
  },
  license: "Apache-2.0",
  browser: {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.browser"
  },
  "react-native": {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.native"
  },
  homepage: "https://github.com/aws/aws-sdk-js-v3/tree/main/clients/client-ssm",
  repository: {
    type: "git",
    url: "https://github.com/aws/aws-sdk-js-v3.git",
    directory: "clients/client-ssm"
  }
};

// ../../node_modules/@aws-sdk/client-ssm/dist-es/endpoint/ruleset.js
var t7 = "fn";
var u6 = "argv";
var v7 = "ref";
var a11 = true;
var b11 = false;
var c11 = "String";
var d11 = "PartitionResult";
var e11 = "tree";
var f11 = "error";
var g11 = "endpoint";
var h11 = "getAttr";
var i11 = { "required": true, "default": false, "type": "Boolean" };
var j11 = { [v7]: "Endpoint" };
var k11 = { [t7]: "booleanEquals", [u6]: [{ [v7]: "UseFIPS" }, true] };
var l11 = { [t7]: "booleanEquals", [u6]: [{ [v7]: "UseDualStack" }, true] };
var m11 = {};
var n11 = { [t7]: "booleanEquals", [u6]: [true, { [t7]: h11, [u6]: [{ [v7]: d11 }, "supportsFIPS"] }] };
var o11 = { [v7]: d11 };
var p11 = { [t7]: "booleanEquals", [u6]: [true, { [t7]: h11, [u6]: [o11, "supportsDualStack"] }] };
var q11 = { "url": "https://ssm.{Region}.{PartitionResult#dnsSuffix}", "properties": {}, "headers": {} };
var r11 = [k11];
var s11 = [l11];
var _data11 = { version: "1.0", parameters: { Region: { required: a11, type: c11 }, UseDualStack: i11, UseFIPS: i11, Endpoint: { required: b11, type: c11 } }, rules: [{ conditions: [{ [t7]: "aws.partition", [u6]: [{ [v7]: "Region" }], assign: d11 }], type: e11, rules: [{ conditions: [{ [t7]: "isSet", [u6]: [j11] }], type: e11, rules: [{ conditions: r11, error: "Invalid Configuration: FIPS and custom endpoint are not supported", type: f11 }, { type: e11, rules: [{ conditions: s11, error: "Invalid Configuration: Dualstack and custom endpoint are not supported", type: f11 }, { endpoint: { url: j11, properties: m11, headers: m11 }, type: g11 }] }] }, { conditions: [k11, l11], type: e11, rules: [{ conditions: [n11, p11], type: e11, rules: [{ endpoint: { url: "https://ssm-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: m11, headers: m11 }, type: g11 }] }, { error: "FIPS and DualStack are enabled, but this partition does not support one or both", type: f11 }] }, { conditions: r11, type: e11, rules: [{ conditions: [n11], type: e11, rules: [{ type: e11, rules: [{ conditions: [{ [t7]: "stringEquals", [u6]: ["aws-us-gov", { [t7]: h11, [u6]: [o11, "name"] }] }], endpoint: q11, type: g11 }, { endpoint: { url: "https://ssm-fips.{Region}.{PartitionResult#dnsSuffix}", properties: m11, headers: m11 }, type: g11 }] }] }, { error: "FIPS is enabled but this partition does not support FIPS", type: f11 }] }, { conditions: s11, type: e11, rules: [{ conditions: [p11], type: e11, rules: [{ endpoint: { url: "https://ssm.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: m11, headers: m11 }, type: g11 }] }, { error: "DualStack is enabled but this partition does not support DualStack", type: f11 }] }, { endpoint: q11, type: g11 }] }] };
var ruleSet11 = _data11;

// ../../node_modules/@aws-sdk/client-ssm/dist-es/endpoint/endpointResolver.js
var defaultEndpointResolver11 = (endpointParams, context = {}) => {
  return resolveEndpoint(ruleSet11, {
    endpointParams,
    logger: context.logger
  });
};

// ../../node_modules/@aws-sdk/client-ssm/dist-es/runtimeConfig.shared.js
var getRuntimeConfig21 = (config) => ({
  apiVersion: "2014-11-06",
  base64Decoder: config?.base64Decoder ?? fromBase64,
  base64Encoder: config?.base64Encoder ?? toBase64,
  disableHostPrefix: config?.disableHostPrefix ?? false,
  endpointProvider: config?.endpointProvider ?? defaultEndpointResolver11,
  logger: config?.logger ?? new NoOpLogger(),
  serviceId: config?.serviceId ?? "SSM",
  urlParser: config?.urlParser ?? parseUrl
});

// ../../node_modules/@aws-sdk/client-ssm/dist-es/runtimeConfig.js
var getRuntimeConfig22 = (config) => {
  emitWarningIfUnsupportedVersion(process.version);
  const defaultsMode = resolveDefaultsModeConfig(config);
  const defaultConfigProvider = () => defaultsMode().then(loadConfigsForDefaultMode);
  const clientSharedValues = getRuntimeConfig21(config);
  return {
    ...clientSharedValues,
    ...config,
    runtime: "node",
    defaultsMode,
    bodyLengthChecker: config?.bodyLengthChecker ?? calculateBodyLength,
    credentialDefaultProvider: config?.credentialDefaultProvider ?? decorateDefaultCredentialProvider2(defaultProvider),
    defaultUserAgentProvider: config?.defaultUserAgentProvider ?? defaultUserAgent({ serviceId: clientSharedValues.serviceId, clientVersion: package_default11.version }),
    maxAttempts: config?.maxAttempts ?? loadConfig(NODE_MAX_ATTEMPT_CONFIG_OPTIONS),
    region: config?.region ?? loadConfig(NODE_REGION_CONFIG_OPTIONS, NODE_REGION_CONFIG_FILE_OPTIONS),
    requestHandler: config?.requestHandler ?? new NodeHttpHandler(defaultConfigProvider),
    retryMode: config?.retryMode ?? loadConfig({
      ...NODE_RETRY_MODE_CONFIG_OPTIONS,
      default: async () => (await defaultConfigProvider()).retryMode || DEFAULT_RETRY_MODE
    }),
    sha256: config?.sha256 ?? Hash.bind(null, "sha256"),
    streamCollector: config?.streamCollector ?? streamCollector,
    useDualstackEndpoint: config?.useDualstackEndpoint ?? loadConfig(NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS),
    useFipsEndpoint: config?.useFipsEndpoint ?? loadConfig(NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS),
    utf8Decoder: config?.utf8Decoder ?? fromUtf82,
    utf8Encoder: config?.utf8Encoder ?? toUtf8
  };
};

// ../../node_modules/@aws-sdk/client-ssm/dist-es/SSMClient.js
var SSMClient = class extends Client {
  constructor(configuration) {
    const _config_0 = getRuntimeConfig22(configuration);
    const _config_1 = resolveClientEndpointParameters11(_config_0);
    const _config_2 = resolveRegionConfig(_config_1);
    const _config_3 = resolveEndpointConfig(_config_2);
    const _config_4 = resolveRetryConfig(_config_3);
    const _config_5 = resolveHostHeaderConfig(_config_4);
    const _config_6 = resolveAwsAuthConfig(_config_5);
    const _config_7 = resolveUserAgentConfig(_config_6);
    super(_config_7);
    this.config = _config_7;
    this.middlewareStack.use(getRetryPlugin(this.config));
    this.middlewareStack.use(getContentLengthPlugin(this.config));
    this.middlewareStack.use(getHostHeaderPlugin(this.config));
    this.middlewareStack.use(getLoggerPlugin(this.config));
    this.middlewareStack.use(getRecursionDetectionPlugin(this.config));
    this.middlewareStack.use(getAwsAuthPlugin(this.config));
    this.middlewareStack.use(getUserAgentPlugin(this.config));
  }
  destroy() {
    super.destroy();
  }
};

// src/mocks/ssm.ts
var import_aws_sdk_client_mock7 = require("aws-sdk-client-mock");
var mockSSM = (values) => {
  const mock = mockFn(() => {
  });
  (0, import_aws_sdk_client_mock7.mockClient)(SSMClient).on(GetParametersCommand).callsFake(async (input) => {
    await asyncCall(mock);
    return {
      Parameters: (input.Names || []).map((name) => {
        return {
          Name: name,
          Value: values[name] || ""
        };
      })
    };
  });
  beforeEach && beforeEach(() => {
    mock.mockClear();
  });
  return mock;
};

// ../../node_modules/@aws-sdk/client-sesv2/dist-es/models/SESv2ServiceException.js
var SESv2ServiceException = class extends ServiceException {
  constructor(options) {
    super(options);
    Object.setPrototypeOf(this, SESv2ServiceException.prototype);
  }
};

// ../../node_modules/@aws-sdk/client-sesv2/dist-es/models/models_0.js
var ContactLanguage;
(function(ContactLanguage2) {
  ContactLanguage2["EN"] = "EN";
  ContactLanguage2["JA"] = "JA";
})(ContactLanguage || (ContactLanguage = {}));
var MailType;
(function(MailType2) {
  MailType2["MARKETING"] = "MARKETING";
  MailType2["TRANSACTIONAL"] = "TRANSACTIONAL";
})(MailType || (MailType = {}));
var ReviewStatus2;
(function(ReviewStatus3) {
  ReviewStatus3["DENIED"] = "DENIED";
  ReviewStatus3["FAILED"] = "FAILED";
  ReviewStatus3["GRANTED"] = "GRANTED";
  ReviewStatus3["PENDING"] = "PENDING";
})(ReviewStatus2 || (ReviewStatus2 = {}));
var AccountSuspendedException = class extends SESv2ServiceException {
  constructor(opts) {
    super({
      name: "AccountSuspendedException",
      $fault: "client",
      ...opts
    });
    this.name = "AccountSuspendedException";
    this.$fault = "client";
    Object.setPrototypeOf(this, AccountSuspendedException.prototype);
  }
};
var BadRequestException = class extends SESv2ServiceException {
  constructor(opts) {
    super({
      name: "BadRequestException",
      $fault: "client",
      ...opts
    });
    this.name = "BadRequestException";
    this.$fault = "client";
    Object.setPrototypeOf(this, BadRequestException.prototype);
  }
};
var MetricDimensionName;
(function(MetricDimensionName2) {
  MetricDimensionName2["CONFIGURATION_SET"] = "CONFIGURATION_SET";
  MetricDimensionName2["EMAIL_IDENTITY"] = "EMAIL_IDENTITY";
  MetricDimensionName2["ISP"] = "ISP";
})(MetricDimensionName || (MetricDimensionName = {}));
var Metric;
(function(Metric2) {
  Metric2["CLICK"] = "CLICK";
  Metric2["COMPLAINT"] = "COMPLAINT";
  Metric2["DELIVERY"] = "DELIVERY";
  Metric2["DELIVERY_CLICK"] = "DELIVERY_CLICK";
  Metric2["DELIVERY_COMPLAINT"] = "DELIVERY_COMPLAINT";
  Metric2["DELIVERY_OPEN"] = "DELIVERY_OPEN";
  Metric2["OPEN"] = "OPEN";
  Metric2["PERMANENT_BOUNCE"] = "PERMANENT_BOUNCE";
  Metric2["SEND"] = "SEND";
  Metric2["TRANSIENT_BOUNCE"] = "TRANSIENT_BOUNCE";
})(Metric || (Metric = {}));
var MetricNamespace;
(function(MetricNamespace2) {
  MetricNamespace2["VDM"] = "VDM";
})(MetricNamespace || (MetricNamespace = {}));
var QueryErrorCode;
(function(QueryErrorCode2) {
  QueryErrorCode2["ACCESS_DENIED"] = "ACCESS_DENIED";
  QueryErrorCode2["INTERNAL_FAILURE"] = "INTERNAL_FAILURE";
})(QueryErrorCode || (QueryErrorCode = {}));
var NotFoundException2 = class extends SESv2ServiceException {
  constructor(opts) {
    super({
      name: "NotFoundException",
      $fault: "client",
      ...opts
    });
    this.name = "NotFoundException";
    this.$fault = "client";
    Object.setPrototypeOf(this, NotFoundException2.prototype);
  }
};
var TooManyRequestsException3 = class extends SESv2ServiceException {
  constructor(opts) {
    super({
      name: "TooManyRequestsException",
      $fault: "client",
      ...opts
    });
    this.name = "TooManyRequestsException";
    this.$fault = "client";
    Object.setPrototypeOf(this, TooManyRequestsException3.prototype);
  }
};
var BehaviorOnMxFailure;
(function(BehaviorOnMxFailure2) {
  BehaviorOnMxFailure2["REJECT_MESSAGE"] = "REJECT_MESSAGE";
  BehaviorOnMxFailure2["USE_DEFAULT_VALUE"] = "USE_DEFAULT_VALUE";
})(BehaviorOnMxFailure || (BehaviorOnMxFailure = {}));
var BulkEmailStatus;
(function(BulkEmailStatus2) {
  BulkEmailStatus2["ACCOUNT_DAILY_QUOTA_EXCEEDED"] = "ACCOUNT_DAILY_QUOTA_EXCEEDED";
  BulkEmailStatus2["ACCOUNT_SENDING_PAUSED"] = "ACCOUNT_SENDING_PAUSED";
  BulkEmailStatus2["ACCOUNT_SUSPENDED"] = "ACCOUNT_SUSPENDED";
  BulkEmailStatus2["ACCOUNT_THROTTLED"] = "ACCOUNT_THROTTLED";
  BulkEmailStatus2["CONFIGURATION_SET_NOT_FOUND"] = "CONFIGURATION_SET_NOT_FOUND";
  BulkEmailStatus2["CONFIGURATION_SET_SENDING_PAUSED"] = "CONFIGURATION_SET_SENDING_PAUSED";
  BulkEmailStatus2["FAILED"] = "FAILED";
  BulkEmailStatus2["INVALID_PARAMETER"] = "INVALID_PARAMETER";
  BulkEmailStatus2["INVALID_SENDING_POOL_NAME"] = "INVALID_SENDING_POOL_NAME";
  BulkEmailStatus2["MAIL_FROM_DOMAIN_NOT_VERIFIED"] = "MAIL_FROM_DOMAIN_NOT_VERIFIED";
  BulkEmailStatus2["MESSAGE_REJECTED"] = "MESSAGE_REJECTED";
  BulkEmailStatus2["SUCCESS"] = "SUCCESS";
  BulkEmailStatus2["TEMPLATE_NOT_FOUND"] = "TEMPLATE_NOT_FOUND";
  BulkEmailStatus2["TRANSIENT_FAILURE"] = "TRANSIENT_FAILURE";
})(BulkEmailStatus || (BulkEmailStatus = {}));
var DimensionValueSource;
(function(DimensionValueSource2) {
  DimensionValueSource2["EMAIL_HEADER"] = "EMAIL_HEADER";
  DimensionValueSource2["LINK_TAG"] = "LINK_TAG";
  DimensionValueSource2["MESSAGE_TAG"] = "MESSAGE_TAG";
})(DimensionValueSource || (DimensionValueSource = {}));
var SubscriptionStatus;
(function(SubscriptionStatus2) {
  SubscriptionStatus2["OPT_IN"] = "OPT_IN";
  SubscriptionStatus2["OPT_OUT"] = "OPT_OUT";
})(SubscriptionStatus || (SubscriptionStatus = {}));
var ContactListImportAction;
(function(ContactListImportAction2) {
  ContactListImportAction2["DELETE"] = "DELETE";
  ContactListImportAction2["PUT"] = "PUT";
})(ContactListImportAction || (ContactListImportAction = {}));
var TlsPolicy;
(function(TlsPolicy2) {
  TlsPolicy2["OPTIONAL"] = "OPTIONAL";
  TlsPolicy2["REQUIRE"] = "REQUIRE";
})(TlsPolicy || (TlsPolicy = {}));
var SuppressionListReason;
(function(SuppressionListReason2) {
  SuppressionListReason2["BOUNCE"] = "BOUNCE";
  SuppressionListReason2["COMPLAINT"] = "COMPLAINT";
})(SuppressionListReason || (SuppressionListReason = {}));
var FeatureStatus;
(function(FeatureStatus2) {
  FeatureStatus2["DISABLED"] = "DISABLED";
  FeatureStatus2["ENABLED"] = "ENABLED";
})(FeatureStatus || (FeatureStatus = {}));
var LimitExceededException3 = class extends SESv2ServiceException {
  constructor(opts) {
    super({
      name: "LimitExceededException",
      $fault: "client",
      ...opts
    });
    this.name = "LimitExceededException";
    this.$fault = "client";
    Object.setPrototypeOf(this, LimitExceededException3.prototype);
  }
};
var EventType2;
(function(EventType3) {
  EventType3["BOUNCE"] = "BOUNCE";
  EventType3["CLICK"] = "CLICK";
  EventType3["COMPLAINT"] = "COMPLAINT";
  EventType3["DELIVERY"] = "DELIVERY";
  EventType3["DELIVERY_DELAY"] = "DELIVERY_DELAY";
  EventType3["OPEN"] = "OPEN";
  EventType3["REJECT"] = "REJECT";
  EventType3["RENDERING_FAILURE"] = "RENDERING_FAILURE";
  EventType3["SEND"] = "SEND";
  EventType3["SUBSCRIPTION"] = "SUBSCRIPTION";
})(EventType2 || (EventType2 = {}));
var ScalingMode;
(function(ScalingMode2) {
  ScalingMode2["MANAGED"] = "MANAGED";
  ScalingMode2["STANDARD"] = "STANDARD";
})(ScalingMode || (ScalingMode = {}));
var DeliverabilityTestStatus;
(function(DeliverabilityTestStatus2) {
  DeliverabilityTestStatus2["COMPLETED"] = "COMPLETED";
  DeliverabilityTestStatus2["IN_PROGRESS"] = "IN_PROGRESS";
})(DeliverabilityTestStatus || (DeliverabilityTestStatus = {}));
var MailFromDomainNotVerifiedException = class extends SESv2ServiceException {
  constructor(opts) {
    super({
      name: "MailFromDomainNotVerifiedException",
      $fault: "client",
      ...opts
    });
    this.name = "MailFromDomainNotVerifiedException";
    this.$fault = "client";
    Object.setPrototypeOf(this, MailFromDomainNotVerifiedException.prototype);
  }
};
var MessageRejected = class extends SESv2ServiceException {
  constructor(opts) {
    super({
      name: "MessageRejected",
      $fault: "client",
      ...opts
    });
    this.name = "MessageRejected";
    this.$fault = "client";
    Object.setPrototypeOf(this, MessageRejected.prototype);
  }
};
var SendingPausedException = class extends SESv2ServiceException {
  constructor(opts) {
    super({
      name: "SendingPausedException",
      $fault: "client",
      ...opts
    });
    this.name = "SendingPausedException";
    this.$fault = "client";
    Object.setPrototypeOf(this, SendingPausedException.prototype);
  }
};
var DkimSigningKeyLength;
(function(DkimSigningKeyLength2) {
  DkimSigningKeyLength2["RSA_1024_BIT"] = "RSA_1024_BIT";
  DkimSigningKeyLength2["RSA_2048_BIT"] = "RSA_2048_BIT";
})(DkimSigningKeyLength || (DkimSigningKeyLength = {}));
var DkimSigningAttributesOrigin;
(function(DkimSigningAttributesOrigin2) {
  DkimSigningAttributesOrigin2["AWS_SES"] = "AWS_SES";
  DkimSigningAttributesOrigin2["EXTERNAL"] = "EXTERNAL";
})(DkimSigningAttributesOrigin || (DkimSigningAttributesOrigin = {}));
var DkimStatus;
(function(DkimStatus2) {
  DkimStatus2["FAILED"] = "FAILED";
  DkimStatus2["NOT_STARTED"] = "NOT_STARTED";
  DkimStatus2["PENDING"] = "PENDING";
  DkimStatus2["SUCCESS"] = "SUCCESS";
  DkimStatus2["TEMPORARY_FAILURE"] = "TEMPORARY_FAILURE";
})(DkimStatus || (DkimStatus = {}));
var IdentityType;
(function(IdentityType2) {
  IdentityType2["DOMAIN"] = "DOMAIN";
  IdentityType2["EMAIL_ADDRESS"] = "EMAIL_ADDRESS";
  IdentityType2["MANAGED_DOMAIN"] = "MANAGED_DOMAIN";
})(IdentityType || (IdentityType = {}));
var DataFormat;
(function(DataFormat2) {
  DataFormat2["CSV"] = "CSV";
  DataFormat2["JSON"] = "JSON";
})(DataFormat || (DataFormat = {}));
var SuppressionListImportAction;
(function(SuppressionListImportAction2) {
  SuppressionListImportAction2["DELETE"] = "DELETE";
  SuppressionListImportAction2["PUT"] = "PUT";
})(SuppressionListImportAction || (SuppressionListImportAction = {}));
var WarmupStatus;
(function(WarmupStatus2) {
  WarmupStatus2["DONE"] = "DONE";
  WarmupStatus2["IN_PROGRESS"] = "IN_PROGRESS";
})(WarmupStatus || (WarmupStatus = {}));
var DeliverabilityDashboardAccountStatus;
(function(DeliverabilityDashboardAccountStatus2) {
  DeliverabilityDashboardAccountStatus2["ACTIVE"] = "ACTIVE";
  DeliverabilityDashboardAccountStatus2["DISABLED"] = "DISABLED";
  DeliverabilityDashboardAccountStatus2["PENDING_EXPIRATION"] = "PENDING_EXPIRATION";
})(DeliverabilityDashboardAccountStatus || (DeliverabilityDashboardAccountStatus = {}));
var MailFromDomainStatus;
(function(MailFromDomainStatus2) {
  MailFromDomainStatus2["FAILED"] = "FAILED";
  MailFromDomainStatus2["PENDING"] = "PENDING";
  MailFromDomainStatus2["SUCCESS"] = "SUCCESS";
  MailFromDomainStatus2["TEMPORARY_FAILURE"] = "TEMPORARY_FAILURE";
})(MailFromDomainStatus || (MailFromDomainStatus = {}));
var VerificationStatus;
(function(VerificationStatus2) {
  VerificationStatus2["FAILED"] = "FAILED";
  VerificationStatus2["NOT_STARTED"] = "NOT_STARTED";
  VerificationStatus2["PENDING"] = "PENDING";
  VerificationStatus2["SUCCESS"] = "SUCCESS";
  VerificationStatus2["TEMPORARY_FAILURE"] = "TEMPORARY_FAILURE";
})(VerificationStatus || (VerificationStatus = {}));
var JobStatus2;
(function(JobStatus3) {
  JobStatus3["COMPLETED"] = "COMPLETED";
  JobStatus3["CREATED"] = "CREATED";
  JobStatus3["FAILED"] = "FAILED";
  JobStatus3["PROCESSING"] = "PROCESSING";
})(JobStatus2 || (JobStatus2 = {}));
var ImportDestinationType;
(function(ImportDestinationType2) {
  ImportDestinationType2["CONTACT_LIST"] = "CONTACT_LIST";
  ImportDestinationType2["SUPPRESSION_LIST"] = "SUPPRESSION_LIST";
})(ImportDestinationType || (ImportDestinationType = {}));
var ListRecommendationsFilterKey;
(function(ListRecommendationsFilterKey2) {
  ListRecommendationsFilterKey2["IMPACT"] = "IMPACT";
  ListRecommendationsFilterKey2["RESOURCE_ARN"] = "RESOURCE_ARN";
  ListRecommendationsFilterKey2["STATUS"] = "STATUS";
  ListRecommendationsFilterKey2["TYPE"] = "TYPE";
})(ListRecommendationsFilterKey || (ListRecommendationsFilterKey = {}));
var RecommendationImpact;
(function(RecommendationImpact2) {
  RecommendationImpact2["HIGH"] = "HIGH";
  RecommendationImpact2["LOW"] = "LOW";
})(RecommendationImpact || (RecommendationImpact = {}));
var RecommendationStatus;
(function(RecommendationStatus2) {
  RecommendationStatus2["FIXED"] = "FIXED";
  RecommendationStatus2["OPEN"] = "OPEN";
})(RecommendationStatus || (RecommendationStatus = {}));
var RecommendationType;
(function(RecommendationType2) {
  RecommendationType2["DKIM"] = "DKIM";
  RecommendationType2["DMARC"] = "DMARC";
  RecommendationType2["SPF"] = "SPF";
})(RecommendationType || (RecommendationType = {}));
var SendEmailRequestFilterSensitiveLog = (obj) => ({
  ...obj
});
var SendEmailResponseFilterSensitiveLog = (obj) => ({
  ...obj
});

// ../../node_modules/@aws-sdk/client-sesv2/dist-es/protocols/Aws_restJson1.js
var serializeAws_restJson1SendEmailCommand = async (input, context) => {
  const { hostname, protocol = "https", port, path: basePath } = await context.endpoint();
  const headers = {
    "content-type": "application/json"
  };
  const resolvedPath2 = `${basePath?.endsWith("/") ? basePath.slice(0, -1) : basePath || ""}/v2/email/outbound-emails`;
  let body;
  body = JSON.stringify({
    ...input.ConfigurationSetName != null && { ConfigurationSetName: input.ConfigurationSetName },
    ...input.Content != null && { Content: serializeAws_restJson1EmailContent(input.Content, context) },
    ...input.Destination != null && { Destination: serializeAws_restJson1Destination(input.Destination, context) },
    ...input.EmailTags != null && { EmailTags: serializeAws_restJson1MessageTagList(input.EmailTags, context) },
    ...input.FeedbackForwardingEmailAddress != null && {
      FeedbackForwardingEmailAddress: input.FeedbackForwardingEmailAddress
    },
    ...input.FeedbackForwardingEmailAddressIdentityArn != null && {
      FeedbackForwardingEmailAddressIdentityArn: input.FeedbackForwardingEmailAddressIdentityArn
    },
    ...input.FromEmailAddress != null && { FromEmailAddress: input.FromEmailAddress },
    ...input.FromEmailAddressIdentityArn != null && {
      FromEmailAddressIdentityArn: input.FromEmailAddressIdentityArn
    },
    ...input.ListManagementOptions != null && {
      ListManagementOptions: serializeAws_restJson1ListManagementOptions(input.ListManagementOptions, context)
    },
    ...input.ReplyToAddresses != null && {
      ReplyToAddresses: serializeAws_restJson1EmailAddressList(input.ReplyToAddresses, context)
    }
  });
  return new HttpRequest({
    protocol,
    hostname,
    port,
    method: "POST",
    headers,
    path: resolvedPath2,
    body
  });
};
var deserializeAws_restJson1SendEmailCommand = async (output, context) => {
  if (output.statusCode !== 200 && output.statusCode >= 300) {
    return deserializeAws_restJson1SendEmailCommandError(output, context);
  }
  const contents = map8({
    $metadata: deserializeMetadata13(output)
  });
  const data = expectNonNull(expectObject(await parseBody12(output.body, context)), "body");
  if (data.MessageId != null) {
    contents.MessageId = expectString(data.MessageId);
  }
  return contents;
};
var deserializeAws_restJson1SendEmailCommandError = async (output, context) => {
  const parsedOutput = {
    ...output,
    body: await parseErrorBody12(output.body, context)
  };
  const errorCode = loadRestJsonErrorCode9(output, parsedOutput.body);
  switch (errorCode) {
    case "AccountSuspendedException":
    case "com.amazonaws.sesv2#AccountSuspendedException":
      throw await deserializeAws_restJson1AccountSuspendedExceptionResponse(parsedOutput, context);
    case "BadRequestException":
    case "com.amazonaws.sesv2#BadRequestException":
      throw await deserializeAws_restJson1BadRequestExceptionResponse(parsedOutput, context);
    case "LimitExceededException":
    case "com.amazonaws.sesv2#LimitExceededException":
      throw await deserializeAws_restJson1LimitExceededExceptionResponse(parsedOutput, context);
    case "MailFromDomainNotVerifiedException":
    case "com.amazonaws.sesv2#MailFromDomainNotVerifiedException":
      throw await deserializeAws_restJson1MailFromDomainNotVerifiedExceptionResponse(parsedOutput, context);
    case "MessageRejected":
    case "com.amazonaws.sesv2#MessageRejected":
      throw await deserializeAws_restJson1MessageRejectedResponse(parsedOutput, context);
    case "NotFoundException":
    case "com.amazonaws.sesv2#NotFoundException":
      throw await deserializeAws_restJson1NotFoundExceptionResponse(parsedOutput, context);
    case "SendingPausedException":
    case "com.amazonaws.sesv2#SendingPausedException":
      throw await deserializeAws_restJson1SendingPausedExceptionResponse(parsedOutput, context);
    case "TooManyRequestsException":
    case "com.amazonaws.sesv2#TooManyRequestsException":
      throw await deserializeAws_restJson1TooManyRequestsExceptionResponse3(parsedOutput, context);
    default:
      const parsedBody = parsedOutput.body;
      throwDefaultError({
        output,
        parsedBody,
        exceptionCtor: SESv2ServiceException,
        errorCode
      });
  }
};
var map8 = map;
var deserializeAws_restJson1AccountSuspendedExceptionResponse = async (parsedOutput, context) => {
  const contents = map8({});
  const data = parsedOutput.body;
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new AccountSuspendedException({
    $metadata: deserializeMetadata13(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1BadRequestExceptionResponse = async (parsedOutput, context) => {
  const contents = map8({});
  const data = parsedOutput.body;
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new BadRequestException({
    $metadata: deserializeMetadata13(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1LimitExceededExceptionResponse = async (parsedOutput, context) => {
  const contents = map8({});
  const data = parsedOutput.body;
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new LimitExceededException3({
    $metadata: deserializeMetadata13(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1MailFromDomainNotVerifiedExceptionResponse = async (parsedOutput, context) => {
  const contents = map8({});
  const data = parsedOutput.body;
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new MailFromDomainNotVerifiedException({
    $metadata: deserializeMetadata13(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1MessageRejectedResponse = async (parsedOutput, context) => {
  const contents = map8({});
  const data = parsedOutput.body;
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new MessageRejected({
    $metadata: deserializeMetadata13(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1NotFoundExceptionResponse = async (parsedOutput, context) => {
  const contents = map8({});
  const data = parsedOutput.body;
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new NotFoundException2({
    $metadata: deserializeMetadata13(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1SendingPausedExceptionResponse = async (parsedOutput, context) => {
  const contents = map8({});
  const data = parsedOutput.body;
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new SendingPausedException({
    $metadata: deserializeMetadata13(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var deserializeAws_restJson1TooManyRequestsExceptionResponse3 = async (parsedOutput, context) => {
  const contents = map8({});
  const data = parsedOutput.body;
  if (data.message != null) {
    contents.message = expectString(data.message);
  }
  const exception = new TooManyRequestsException3({
    $metadata: deserializeMetadata13(parsedOutput),
    ...contents
  });
  return decorateServiceException(exception, parsedOutput.body);
};
var serializeAws_restJson1Body = (input, context) => {
  return {
    ...input.Html != null && { Html: serializeAws_restJson1Content(input.Html, context) },
    ...input.Text != null && { Text: serializeAws_restJson1Content(input.Text, context) }
  };
};
var serializeAws_restJson1Content = (input, context) => {
  return {
    ...input.Charset != null && { Charset: input.Charset },
    ...input.Data != null && { Data: input.Data }
  };
};
var serializeAws_restJson1Destination = (input, context) => {
  return {
    ...input.BccAddresses != null && {
      BccAddresses: serializeAws_restJson1EmailAddressList(input.BccAddresses, context)
    },
    ...input.CcAddresses != null && {
      CcAddresses: serializeAws_restJson1EmailAddressList(input.CcAddresses, context)
    },
    ...input.ToAddresses != null && {
      ToAddresses: serializeAws_restJson1EmailAddressList(input.ToAddresses, context)
    }
  };
};
var serializeAws_restJson1EmailAddressList = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return entry;
  });
};
var serializeAws_restJson1EmailContent = (input, context) => {
  return {
    ...input.Raw != null && { Raw: serializeAws_restJson1RawMessage(input.Raw, context) },
    ...input.Simple != null && { Simple: serializeAws_restJson1Message(input.Simple, context) },
    ...input.Template != null && { Template: serializeAws_restJson1Template(input.Template, context) }
  };
};
var serializeAws_restJson1ListManagementOptions = (input, context) => {
  return {
    ...input.ContactListName != null && { ContactListName: input.ContactListName },
    ...input.TopicName != null && { TopicName: input.TopicName }
  };
};
var serializeAws_restJson1Message = (input, context) => {
  return {
    ...input.Body != null && { Body: serializeAws_restJson1Body(input.Body, context) },
    ...input.Subject != null && { Subject: serializeAws_restJson1Content(input.Subject, context) }
  };
};
var serializeAws_restJson1MessageTag = (input, context) => {
  return {
    ...input.Name != null && { Name: input.Name },
    ...input.Value != null && { Value: input.Value }
  };
};
var serializeAws_restJson1MessageTagList = (input, context) => {
  return input.filter((e13) => e13 != null).map((entry) => {
    return serializeAws_restJson1MessageTag(entry, context);
  });
};
var serializeAws_restJson1RawMessage = (input, context) => {
  return {
    ...input.Data != null && { Data: context.base64Encoder(input.Data) }
  };
};
var serializeAws_restJson1Template = (input, context) => {
  return {
    ...input.TemplateArn != null && { TemplateArn: input.TemplateArn },
    ...input.TemplateData != null && { TemplateData: input.TemplateData },
    ...input.TemplateName != null && { TemplateName: input.TemplateName }
  };
};
var deserializeMetadata13 = (output) => ({
  httpStatusCode: output.statusCode,
  requestId: output.headers["x-amzn-requestid"] ?? output.headers["x-amzn-request-id"] ?? output.headers["x-amz-request-id"],
  extendedRequestId: output.headers["x-amz-id-2"],
  cfId: output.headers["x-amz-cf-id"]
});
var collectBody12 = (streamBody = new Uint8Array(), context) => {
  if (streamBody instanceof Uint8Array) {
    return Promise.resolve(streamBody);
  }
  return context.streamCollector(streamBody) || Promise.resolve(new Uint8Array());
};
var collectBodyString12 = (streamBody, context) => collectBody12(streamBody, context).then((body) => context.utf8Encoder(body));
var parseBody12 = (streamBody, context) => collectBodyString12(streamBody, context).then((encoded) => {
  if (encoded.length) {
    return JSON.parse(encoded);
  }
  return {};
});
var parseErrorBody12 = async (errorBody, context) => {
  const value = await parseBody12(errorBody, context);
  value.message = value.message ?? value.Message;
  return value;
};
var loadRestJsonErrorCode9 = (output, data) => {
  const findKey = (object, key) => Object.keys(object).find((k13) => k13.toLowerCase() === key.toLowerCase());
  const sanitizeErrorCode = (rawValue) => {
    let cleanValue = rawValue;
    if (typeof cleanValue === "number") {
      cleanValue = cleanValue.toString();
    }
    if (cleanValue.indexOf(",") >= 0) {
      cleanValue = cleanValue.split(",")[0];
    }
    if (cleanValue.indexOf(":") >= 0) {
      cleanValue = cleanValue.split(":")[0];
    }
    if (cleanValue.indexOf("#") >= 0) {
      cleanValue = cleanValue.split("#")[1];
    }
    return cleanValue;
  };
  const headerKey = findKey(output.headers, "x-amzn-errortype");
  if (headerKey !== void 0) {
    return sanitizeErrorCode(output.headers[headerKey]);
  }
  if (data.code !== void 0) {
    return sanitizeErrorCode(data.code);
  }
  if (data["__type"] !== void 0) {
    return sanitizeErrorCode(data["__type"]);
  }
};

// ../../node_modules/@aws-sdk/client-sesv2/dist-es/commands/SendEmailCommand.js
var SendEmailCommand = class extends Command {
  constructor(input) {
    super();
    this.input = input;
  }
  static getEndpointParameterInstructions() {
    return {
      UseFIPS: { type: "builtInParams", name: "useFipsEndpoint" },
      Endpoint: { type: "builtInParams", name: "endpoint" },
      Region: { type: "builtInParams", name: "region" },
      UseDualStack: { type: "builtInParams", name: "useDualstackEndpoint" }
    };
  }
  resolveMiddleware(clientStack, configuration, options) {
    this.middlewareStack.use(getSerdePlugin(configuration, this.serialize, this.deserialize));
    this.middlewareStack.use(getEndpointPlugin(configuration, SendEmailCommand.getEndpointParameterInstructions()));
    const stack = clientStack.concat(this.middlewareStack);
    const { logger: logger2 } = configuration;
    const clientName = "SESv2Client";
    const commandName = "SendEmailCommand";
    const handlerExecutionContext = {
      logger: logger2,
      clientName,
      commandName,
      inputFilterSensitiveLog: SendEmailRequestFilterSensitiveLog,
      outputFilterSensitiveLog: SendEmailResponseFilterSensitiveLog
    };
    const { requestHandler } = configuration;
    return stack.resolve((request2) => requestHandler.handle(request2.request, options || {}), handlerExecutionContext);
  }
  serialize(input, context) {
    return serializeAws_restJson1SendEmailCommand(input, context);
  }
  deserialize(output, context) {
    return deserializeAws_restJson1SendEmailCommand(output, context);
  }
};

// ../../node_modules/@aws-sdk/client-sesv2/dist-es/endpoint/EndpointParameters.js
var resolveClientEndpointParameters12 = (options) => {
  return {
    ...options,
    useDualstackEndpoint: options.useDualstackEndpoint ?? false,
    useFipsEndpoint: options.useFipsEndpoint ?? false,
    defaultSigningName: "ses"
  };
};

// ../../node_modules/@aws-sdk/client-sesv2/package.json
var package_default12 = {
  name: "@aws-sdk/client-sesv2",
  description: "AWS SDK for JavaScript Sesv2 Client for Node.js, Browser and React Native",
  version: "3.256.0",
  scripts: {
    build: "concurrently 'yarn:build:cjs' 'yarn:build:es' 'yarn:build:types'",
    "build:cjs": "tsc -p tsconfig.cjs.json",
    "build:docs": "typedoc",
    "build:es": "tsc -p tsconfig.es.json",
    "build:include:deps": "lerna run --scope $npm_package_name --include-dependencies build",
    "build:types": "tsc -p tsconfig.types.json",
    "build:types:downlevel": "downlevel-dts dist-types dist-types/ts3.4",
    clean: "rimraf ./dist-* && rimraf *.tsbuildinfo",
    "generate:client": "node ../../scripts/generate-clients/single-service --solo sesv2"
  },
  main: "./dist-cjs/index.js",
  types: "./dist-types/index.d.ts",
  module: "./dist-es/index.js",
  sideEffects: false,
  dependencies: {
    "@aws-crypto/sha256-browser": "3.0.0",
    "@aws-crypto/sha256-js": "3.0.0",
    "@aws-sdk/client-sts": "3.256.0",
    "@aws-sdk/config-resolver": "3.254.0",
    "@aws-sdk/credential-provider-node": "3.256.0",
    "@aws-sdk/fetch-http-handler": "3.254.0",
    "@aws-sdk/hash-node": "3.254.0",
    "@aws-sdk/invalid-dependency": "3.254.0",
    "@aws-sdk/middleware-content-length": "3.254.0",
    "@aws-sdk/middleware-endpoint": "3.254.0",
    "@aws-sdk/middleware-host-header": "3.254.0",
    "@aws-sdk/middleware-logger": "3.254.0",
    "@aws-sdk/middleware-recursion-detection": "3.254.0",
    "@aws-sdk/middleware-retry": "3.254.0",
    "@aws-sdk/middleware-serde": "3.254.0",
    "@aws-sdk/middleware-signing": "3.254.0",
    "@aws-sdk/middleware-stack": "3.254.0",
    "@aws-sdk/middleware-user-agent": "3.254.0",
    "@aws-sdk/node-config-provider": "3.254.0",
    "@aws-sdk/node-http-handler": "3.254.0",
    "@aws-sdk/protocol-http": "3.254.0",
    "@aws-sdk/smithy-client": "3.254.0",
    "@aws-sdk/types": "3.254.0",
    "@aws-sdk/url-parser": "3.254.0",
    "@aws-sdk/util-base64": "3.208.0",
    "@aws-sdk/util-body-length-browser": "3.188.0",
    "@aws-sdk/util-body-length-node": "3.208.0",
    "@aws-sdk/util-defaults-mode-browser": "3.254.0",
    "@aws-sdk/util-defaults-mode-node": "3.254.0",
    "@aws-sdk/util-endpoints": "3.254.0",
    "@aws-sdk/util-retry": "3.254.0",
    "@aws-sdk/util-user-agent-browser": "3.254.0",
    "@aws-sdk/util-user-agent-node": "3.254.0",
    "@aws-sdk/util-utf8-browser": "3.188.0",
    "@aws-sdk/util-utf8-node": "3.208.0",
    tslib: "^2.3.1"
  },
  devDependencies: {
    "@aws-sdk/service-client-documentation-generator": "3.208.0",
    "@tsconfig/node14": "1.0.3",
    "@types/node": "^14.14.31",
    concurrently: "7.0.0",
    "downlevel-dts": "0.10.1",
    rimraf: "3.0.2",
    typedoc: "0.19.2",
    typescript: "~4.6.2"
  },
  overrides: {
    typedoc: {
      typescript: "~4.6.2"
    }
  },
  engines: {
    node: ">=14.0.0"
  },
  typesVersions: {
    "<4.0": {
      "dist-types/*": [
        "dist-types/ts3.4/*"
      ]
    }
  },
  files: [
    "dist-*"
  ],
  author: {
    name: "AWS SDK for JavaScript Team",
    url: "https://aws.amazon.com/javascript/"
  },
  license: "Apache-2.0",
  browser: {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.browser"
  },
  "react-native": {
    "./dist-es/runtimeConfig": "./dist-es/runtimeConfig.native"
  },
  homepage: "https://github.com/aws/aws-sdk-js-v3/tree/main/clients/client-sesv2",
  repository: {
    type: "git",
    url: "https://github.com/aws/aws-sdk-js-v3.git",
    directory: "clients/client-sesv2"
  }
};

// ../../node_modules/@aws-sdk/client-sesv2/dist-es/endpoint/ruleset.js
var p12 = "required";
var q12 = "fn";
var r12 = "argv";
var s12 = "ref";
var a12 = "PartitionResult";
var b12 = "tree";
var c12 = "error";
var d12 = "endpoint";
var e12 = { [p12]: false, "type": "String" };
var f12 = { [p12]: true, "default": false, "type": "Boolean" };
var g12 = { [s12]: "Endpoint" };
var h12 = { [q12]: "booleanEquals", [r12]: [{ [s12]: "UseFIPS" }, true] };
var i12 = { [q12]: "booleanEquals", [r12]: [{ [s12]: "UseDualStack" }, true] };
var j12 = {};
var k12 = { [q12]: "booleanEquals", [r12]: [true, { [q12]: "getAttr", [r12]: [{ [s12]: a12 }, "supportsFIPS"] }] };
var l12 = { [q12]: "booleanEquals", [r12]: [true, { [q12]: "getAttr", [r12]: [{ [s12]: a12 }, "supportsDualStack"] }] };
var m12 = [g12];
var n12 = [h12];
var o12 = [i12];
var _data12 = { version: "1.0", parameters: { Region: e12, UseDualStack: f12, UseFIPS: f12, Endpoint: e12 }, rules: [{ conditions: [{ [q12]: "aws.partition", [r12]: [{ [s12]: "Region" }], assign: a12 }], type: b12, rules: [{ conditions: [{ [q12]: "isSet", [r12]: m12 }, { [q12]: "parseURL", [r12]: m12, assign: "url" }], type: b12, rules: [{ conditions: n12, error: "Invalid Configuration: FIPS and custom endpoint are not supported", type: c12 }, { type: b12, rules: [{ conditions: o12, error: "Invalid Configuration: Dualstack and custom endpoint are not supported", type: c12 }, { endpoint: { url: g12, properties: j12, headers: j12 }, type: d12 }] }] }, { conditions: [h12, i12], type: b12, rules: [{ conditions: [k12, l12], type: b12, rules: [{ endpoint: { url: "https://email-fips.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: j12, headers: j12 }, type: d12 }] }, { error: "FIPS and DualStack are enabled, but this partition does not support one or both", type: c12 }] }, { conditions: n12, type: b12, rules: [{ conditions: [k12], type: b12, rules: [{ type: b12, rules: [{ endpoint: { url: "https://email-fips.{Region}.{PartitionResult#dnsSuffix}", properties: j12, headers: j12 }, type: d12 }] }] }, { error: "FIPS is enabled but this partition does not support FIPS", type: c12 }] }, { conditions: o12, type: b12, rules: [{ conditions: [l12], type: b12, rules: [{ endpoint: { url: "https://email.{Region}.{PartitionResult#dualStackDnsSuffix}", properties: j12, headers: j12 }, type: d12 }] }, { error: "DualStack is enabled but this partition does not support DualStack", type: c12 }] }, { endpoint: { url: "https://email.{Region}.{PartitionResult#dnsSuffix}", properties: j12, headers: j12 }, type: d12 }] }] };
var ruleSet12 = _data12;

// ../../node_modules/@aws-sdk/client-sesv2/dist-es/endpoint/endpointResolver.js
var defaultEndpointResolver12 = (endpointParams, context = {}) => {
  return resolveEndpoint(ruleSet12, {
    endpointParams,
    logger: context.logger
  });
};

// ../../node_modules/@aws-sdk/client-sesv2/dist-es/runtimeConfig.shared.js
var getRuntimeConfig23 = (config) => ({
  apiVersion: "2019-09-27",
  base64Decoder: config?.base64Decoder ?? fromBase64,
  base64Encoder: config?.base64Encoder ?? toBase64,
  disableHostPrefix: config?.disableHostPrefix ?? false,
  endpointProvider: config?.endpointProvider ?? defaultEndpointResolver12,
  logger: config?.logger ?? new NoOpLogger(),
  serviceId: config?.serviceId ?? "SESv2",
  urlParser: config?.urlParser ?? parseUrl
});

// ../../node_modules/@aws-sdk/client-sesv2/dist-es/runtimeConfig.js
var getRuntimeConfig24 = (config) => {
  emitWarningIfUnsupportedVersion(process.version);
  const defaultsMode = resolveDefaultsModeConfig(config);
  const defaultConfigProvider = () => defaultsMode().then(loadConfigsForDefaultMode);
  const clientSharedValues = getRuntimeConfig23(config);
  return {
    ...clientSharedValues,
    ...config,
    runtime: "node",
    defaultsMode,
    bodyLengthChecker: config?.bodyLengthChecker ?? calculateBodyLength,
    credentialDefaultProvider: config?.credentialDefaultProvider ?? decorateDefaultCredentialProvider2(defaultProvider),
    defaultUserAgentProvider: config?.defaultUserAgentProvider ?? defaultUserAgent({ serviceId: clientSharedValues.serviceId, clientVersion: package_default12.version }),
    maxAttempts: config?.maxAttempts ?? loadConfig(NODE_MAX_ATTEMPT_CONFIG_OPTIONS),
    region: config?.region ?? loadConfig(NODE_REGION_CONFIG_OPTIONS, NODE_REGION_CONFIG_FILE_OPTIONS),
    requestHandler: config?.requestHandler ?? new NodeHttpHandler(defaultConfigProvider),
    retryMode: config?.retryMode ?? loadConfig({
      ...NODE_RETRY_MODE_CONFIG_OPTIONS,
      default: async () => (await defaultConfigProvider()).retryMode || DEFAULT_RETRY_MODE
    }),
    sha256: config?.sha256 ?? Hash.bind(null, "sha256"),
    streamCollector: config?.streamCollector ?? streamCollector,
    useDualstackEndpoint: config?.useDualstackEndpoint ?? loadConfig(NODE_USE_DUALSTACK_ENDPOINT_CONFIG_OPTIONS),
    useFipsEndpoint: config?.useFipsEndpoint ?? loadConfig(NODE_USE_FIPS_ENDPOINT_CONFIG_OPTIONS),
    utf8Decoder: config?.utf8Decoder ?? fromUtf82,
    utf8Encoder: config?.utf8Encoder ?? toUtf8
  };
};

// ../../node_modules/@aws-sdk/client-sesv2/dist-es/SESv2Client.js
var SESv2Client = class extends Client {
  constructor(configuration) {
    const _config_0 = getRuntimeConfig24(configuration);
    const _config_1 = resolveClientEndpointParameters12(_config_0);
    const _config_2 = resolveRegionConfig(_config_1);
    const _config_3 = resolveEndpointConfig(_config_2);
    const _config_4 = resolveRetryConfig(_config_3);
    const _config_5 = resolveHostHeaderConfig(_config_4);
    const _config_6 = resolveAwsAuthConfig(_config_5);
    const _config_7 = resolveUserAgentConfig(_config_6);
    super(_config_7);
    this.config = _config_7;
    this.middlewareStack.use(getRetryPlugin(this.config));
    this.middlewareStack.use(getContentLengthPlugin(this.config));
    this.middlewareStack.use(getHostHeaderPlugin(this.config));
    this.middlewareStack.use(getLoggerPlugin(this.config));
    this.middlewareStack.use(getRecursionDetectionPlugin(this.config));
    this.middlewareStack.use(getAwsAuthPlugin(this.config));
    this.middlewareStack.use(getUserAgentPlugin(this.config));
  }
  destroy() {
    super.destroy();
  }
};

// src/mocks/ses.ts
var import_aws_sdk_client_mock8 = require("aws-sdk-client-mock");
var mockSES = (fn = () => {
}) => {
  const mock = mockFn(fn);
  (0, import_aws_sdk_client_mock8.mockClient)(SESv2Client).on(SendEmailCommand).callsFake(() => {
    return asyncCall(mock);
  });
  beforeEach && beforeEach(() => {
    mock.mockClear();
  });
  return mock;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DynamoDBServer,
  mockDynamoDB,
  mockIoT,
  mockLambda,
  mockSES,
  mockSNS,
  mockSQS,
  mockSSM,
  mockScheduler,
  startDynamoDB
});
