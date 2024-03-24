var __create = Object.create;
var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
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
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/resource/node.ts
var Node = class {
  constructor(type, identifier) {
    this.type = type;
    this.identifier = identifier;
    this.childs = /* @__PURE__ */ new Set();
  }
  get urn() {
    return `${this.parental ? this.parental.urn : "urn"}:${this.type}:{${this.identifier}}`;
  }
  get parent() {
    return this.parental;
  }
  get children() {
    return this.childs;
  }
  add(node) {
    node.parental = this;
    for (const child of this.childs) {
      if (child.urn === node.urn) {
        throw new Error(`Duplicate nodes detected: ${node.urn}`);
      }
    }
    this.childs.add(node);
  }
};
var flatten = (node) => {
  const list = [node];
  for (const child of node.children) {
    list.push(...flatten(child));
  }
  return list;
};

// src/resource/output.ts
var Output = class _Output {
  constructor(resource, cb) {
    this.resource = resource;
    // protected resources = new Set<Resource>()
    // protected deps = new Set<Resource>()
    this.listeners = /* @__PURE__ */ new Set();
    this.resolved = false;
    cb((value) => {
      if (!this.resolved) {
        this.value = value;
        this.resolved = true;
        for (const listener of this.listeners) {
          listener(value);
        }
      } else {
        throw new Error(`Output values can only be resolved once.`);
      }
    });
  }
  apply(cb) {
    return new _Output(this.resource, (resolve) => {
      if (!this.resolved) {
        this.listeners.add((value) => {
          resolve(cb(value));
        });
      } else {
        cb(this.value);
      }
    });
  }
  toJSON() {
    if (!this.resolved) {
      throw new TypeError(`Output hasn't been resolved yet.`);
    }
    return this.value;
  }
};
function unwrap(input, defaultValue) {
  if (typeof input === "undefined") {
    return defaultValue;
  }
  if (input instanceof Output) {
    return input.toJSON();
  }
  return input;
}

// src/resource/resource.ts
var Resource = class _Resource extends Node {
  constructor(type, identifier, inputs) {
    super(type, identifier);
    this.type = type;
    this.identifier = identifier;
    this.listeners = /* @__PURE__ */ new Set();
    this.dependencies = /* @__PURE__ */ new Set();
    if (inputs) {
      this.registerDependency(inputs);
    }
  }
  dependsOn(resource) {
    this.dependencies.add(resource);
    return this;
  }
  registerDependency(props) {
    if (props instanceof Output) {
      if (props.resource) {
        this.dependsOn(props.resource);
      }
    } else if (props instanceof _Resource) {
      this.dependsOn(props);
    } else if (Array.isArray(props)) {
      props.map((p) => this.registerDependency(p));
    } else if ((props == null ? void 0 : props.constructor) === Object) {
      Object.values(props).map((p) => this.registerDependency(p));
    }
  }
  setRemoteDocument(remoteDocument) {
    for (const listener of this.listeners) {
      listener(remoteDocument);
    }
    this.listeners.clear();
    this.remoteDocument = remoteDocument;
  }
  output(getter) {
    return new Output(this, (resolve) => {
      if (this.remoteDocument) {
        resolve(getter(this.remoteDocument));
      } else {
        this.listeners.add((remoteDocument) => {
          resolve(getter(remoteDocument));
        });
      }
    });
  }
  attr(name, input) {
    const value = unwrap(input);
    if (typeof value === "undefined") {
      return {};
    }
    return {
      [name]: value
    };
  }
};

// src/resource/stack.ts
var Stack = class extends Node {
  constructor(name) {
    super("Stack", name);
    this.name = name;
  }
  get resources() {
    return flatten(this).filter((node) => node instanceof Resource);
  }
};

// src/resource/app.ts
var App = class extends Node {
  constructor(name) {
    super("App", name);
    this.name = name;
  }
  get stacks() {
    return this.children;
  }
  add(stack2) {
    if (stack2 instanceof Stack) {
      return super.add(stack2);
    }
    throw new TypeError("You can only add stacks to an app");
  }
};

// src/example.ts
var import_credential_providers = require("@aws-sdk/credential-providers");

// src/resource/workspace.ts
var import_events = __toESM(require("events"), 1);
var import_promise_dag = require("promise-dag");
var WorkSpace = class extends import_events.default {
  constructor(props) {
    super();
    this.props = props;
  }
  getCloudProvider(providerId) {
    for (const provider of this.props.cloudProviders) {
      if (provider.own(providerId)) {
        return provider;
      }
    }
    throw new TypeError(`Can't find cloud provider for: ${providerId}`);
  }
  copyDocument(document) {
    return JSON.parse(JSON.stringify(document));
  }
  unwrapDocument(urn, document) {
    const replacer = (_, value) => {
      return typeof value === "bigint" ? Number(value) : value;
    };
    try {
      return JSON.parse(JSON.stringify(document, replacer));
    } catch (error) {
      if (error instanceof TypeError) {
        throw new TypeError(`Resource has unresolved inputs: ${urn}`);
      }
      throw error;
    }
  }
  lockedOperation(urn, fn) {
    return __async(this, null, function* () {
      let release;
      try {
        release = yield this.props.stateProvider.lock(urn);
      } catch (error) {
        throw new Error(`Already in progress: ${urn}`);
      }
      let result;
      try {
        result = yield fn();
      } catch (error) {
        throw error;
      } finally {
        yield release();
      }
      return result;
    });
  }
  resolveAssets(assets) {
    return __async(this, null, function* () {
      const resolved = {};
      const hashes = {};
      yield Promise.all(
        Object.entries(assets).map((_0) => __async(this, [_0], function* ([name, asset]) {
          const data = yield unwrap(asset).load();
          const buff = yield crypto.subtle.digest("SHA-256", data);
          const hash = Buffer.from(buff).toString("hex");
          hashes[name] = hash;
          resolved[name] = {
            data,
            hash
          };
        }))
      );
      return [resolved, hashes];
    });
  }
  // async deployApp(app: App) {
  // 	return this.lockedOperation(app.urn, async () => {
  // 		const appState = await this.props.stateProvider.get(app.urn)
  // 		for (const stack of app.stacks) {
  // 			await this.deployStack(stack)
  // 		}
  // 		console.log(appState)
  // 		// for (const [urn, stackState] of appState) {
  // 		// 	stackState
  // 		// }
  // 	})
  // }
  deployStack(stack2) {
    return __async(this, null, function* () {
      if (!stack2.parent) {
        throw new TypeError("Stack must belong to an App");
      }
      const appUrn = stack2.parent.urn;
      return this.lockedOperation(appUrn, () => __async(this, null, function* () {
        var _a;
        const appState = yield this.props.stateProvider.get(appUrn);
        const stackState = appState[stack2.urn] = (_a = appState[stack2.urn]) != null ? _a : {};
        const resources = stack2.resources;
        this.emit("stack", {
          urn: stack2.urn,
          operation: "deploy",
          status: "in-progress",
          stack: stack2
        });
        const deleteResources = {};
        for (const [urn, state] of Object.entries(stackState)) {
          const resource = resources.find((r) => r.urn === urn);
          if (!resource) {
            deleteResources[urn] = state;
          }
        }
        try {
          if (Object.keys(deleteResources).length > 0) {
            yield this.deleteStackResources(appUrn, appState, stackState, deleteResources);
          }
          yield this.deployStackResources(appUrn, appState, stackState, resources);
        } catch (error) {
          this.emit("stack", {
            urn: stack2.urn,
            operation: "deploy",
            status: "error",
            stack: stack2,
            reason: error instanceof Error ? error : new Error("Unknown Error")
          });
          throw error;
        }
        this.emit("stack", {
          urn: stack2.urn,
          operation: "deploy",
          status: "success",
          stack: stack2
        });
        return stackState;
      }));
    });
  }
  deleteStack(stack2) {
    return __async(this, null, function* () {
      if (!stack2.parent) {
        throw new TypeError("Stack must belong to an App");
      }
      const appUrn = stack2.parent.urn;
      return this.lockedOperation(appUrn, () => __async(this, null, function* () {
        const appState = yield this.props.stateProvider.get(appUrn);
        const stackState = appState[stack2.urn];
        if (!stackState) {
          throw new Error(`Stack already deleted: ${stack2.name}`);
        }
        this.emit("stack", {
          urn: stack2.urn,
          operation: "delete",
          status: "in-progress",
          stack: stack2
        });
        try {
          yield this.deleteStackResources(appUrn, appState, stackState, stackState);
        } catch (error) {
          this.emit("stack", {
            urn: stack2.urn,
            operation: "delete",
            status: "error",
            stack: stack2,
            reason: error instanceof Error ? error : new Error("Unknown Error")
          });
          throw error;
        }
        delete appState[stack2.urn];
        yield this.props.stateProvider.update(appUrn, appState);
        this.emit("stack", {
          urn: stack2.urn,
          operation: "delete",
          status: "success",
          stack: stack2
        });
      }));
    });
  }
  deployStackResources(appUrn, appState, stackState, resources) {
    return __async(this, null, function* () {
      yield this.healFromUnknownRemoteState(stackState);
      const deployGraph = {};
      for (const resource of resources) {
        const provider = this.getCloudProvider(resource.cloudProviderId);
        deployGraph[resource.urn] = [
          ...[...resource.dependencies].map((dep) => dep.urn),
          () => __async(this, null, function* () {
            var _a, _b, _c;
            const state = resource.toState();
            const [assets, assetHashes] = yield this.resolveAssets((_a = state.assets) != null ? _a : {});
            const document = this.unwrapDocument(resource.urn, (_b = state.document) != null ? _b : {});
            const extra = this.unwrapDocument(resource.urn, (_c = state.extra) != null ? _c : {});
            const resourceState = stackState[resource.urn];
            if (!resourceState) {
              this.emit("resource", {
                urn: resource.urn,
                type: resource.type,
                operation: "create",
                status: "in-progress"
              });
              let id;
              try {
                id = yield provider.create({
                  urn: resource.urn,
                  type: resource.type,
                  document,
                  assets,
                  extra
                });
              } catch (error) {
                this.emit("resource", {
                  urn: resource.urn,
                  type: resource.type,
                  operation: "create",
                  status: "error",
                  reason: error instanceof Error ? error : new Error("Unknown Error")
                });
                throw error;
              }
              stackState[resource.urn] = {
                id,
                type: resource.type,
                provider: resource.cloudProviderId,
                local: document,
                assets: assetHashes,
                dependencies: [...resource.dependencies].map((d) => d.urn),
                extra
                // deletionPolicy: unwrap(state.deletionPolicy),
              };
              const remote = yield provider.get({
                urn: resource.urn,
                id,
                type: resource.type,
                document,
                extra
              });
              stackState[resource.urn].remote = remote;
              this.emit("resource", {
                urn: resource.urn,
                type: resource.type,
                operation: "create",
                status: "success"
              });
            } else if (
              // Check if any state has changed
              JSON.stringify([resourceState.local, resourceState.assets]) !== JSON.stringify([document, assetHashes])
            ) {
              this.emit("resource", {
                urn: resource.urn,
                type: resource.type,
                operation: "update",
                status: "in-progress"
              });
              let id;
              try {
                id = yield provider.update({
                  urn: resource.urn,
                  id: resourceState.id,
                  type: resource.type,
                  remoteDocument: this.copyDocument(resourceState.remote),
                  oldDocument: this.copyDocument(resourceState.local),
                  newDocument: document,
                  assets,
                  extra
                });
              } catch (error) {
                this.emit("resource", {
                  urn: resource.urn,
                  type: resource.type,
                  operation: "update",
                  status: "error",
                  reason: error instanceof Error ? error : new Error("Unknown Error")
                });
                throw error;
              }
              stackState[resource.urn].id = id;
              stackState[resource.urn].local = document;
              stackState[resource.urn].assets = assetHashes;
              const remote = yield provider.get({
                urn: resource.urn,
                id: resourceState.id,
                type: resource.type,
                document,
                extra
              });
              stackState[resource.urn].remote = remote;
              this.emit("resource", {
                urn: resource.urn,
                type: resource.type,
                operation: "update",
                status: "success"
              });
            }
            stackState[resource.urn].extra = extra;
            stackState[resource.urn].dependencies = [...resource.dependencies].map((d) => d.urn);
            resource.setRemoteDocument(stackState[resource.urn].remote);
          })
        ];
      }
      const results = yield Promise.allSettled(Object.values((0, import_promise_dag.run)(deployGraph)));
      yield this.props.stateProvider.update(appUrn, appState);
      for (const result of results) {
        if (result.status === "rejected") {
          throw result.reason;
        }
      }
    });
  }
  dependentsOn(resources, dependency) {
    const dependents = [];
    for (const [urn, resource] of Object.entries(resources)) {
      if (resource.dependencies.includes(dependency)) {
        dependents.push(urn);
      }
    }
    return dependents;
  }
  deleteStackResources(appUrn, appState, stackState, resources) {
    return __async(this, null, function* () {
      const deleteGraph = {};
      for (const [urnStr, state] of Object.entries(resources)) {
        const urn = urnStr;
        const provider = this.getCloudProvider(state.provider);
        deleteGraph[urn] = [
          ...this.dependentsOn(resources, urn),
          () => __async(this, null, function* () {
            this.emit("resource", {
              urn,
              type: state.type,
              operation: "delete",
              status: "in-progress"
            });
            try {
              yield provider.delete({
                urn,
                id: state.id,
                type: state.type,
                document: state.local,
                assets: state.assets,
                extra: state.extra
              });
            } catch (error) {
              this.emit("resource", {
                urn,
                type: state.type,
                operation: "delete",
                status: "error",
                reason: error instanceof Error ? error : new Error("Unknown Error")
              });
              throw error;
            }
            delete stackState[urn];
            this.emit("resource", {
              urn,
              type: state.type,
              operation: "delete",
              status: "success"
            });
          })
        ];
      }
      const deleteResults = yield Promise.allSettled(Object.values((0, import_promise_dag.run)(deleteGraph)));
      yield this.props.stateProvider.update(appUrn, appState);
      for (const result of deleteResults) {
        if (result.status === "rejected") {
          throw result.reason;
        }
      }
    });
  }
  healFromUnknownRemoteState(stackState) {
    return __async(this, null, function* () {
      const results = yield Promise.allSettled(
        Object.entries(stackState).map((_0) => __async(this, [_0], function* ([urnStr, resourceState]) {
          const urn = urnStr;
          if (typeof resourceState.remote === "undefined") {
            const provider = this.getCloudProvider(resourceState.provider);
            const remote = yield provider.get({
              urn,
              id: resourceState.id,
              type: resourceState.type,
              document: resourceState.local,
              extra: resourceState.extra
            });
            if (typeof remote === "undefined") {
              throw new Error(`Fetching remote state returned undefined: ${urn}`);
            }
            resourceState.remote = remote;
          }
        }))
      );
      for (const result of results) {
        if (result.status === "rejected") {
          throw result.reason;
        }
      }
    });
  }
};

// src/provider/local/state.ts
var import_path = require("path");
var import_promises = require("fs/promises");
var import_proper_lockfile = require("proper-lockfile");
var LocalStateProvider = class {
  constructor(props) {
    this.props = props;
  }
  stateFile(urn) {
    return (0, import_path.join)(this.props.dir, `${urn}.json`);
  }
  lockFile(urn) {
    return (0, import_path.join)(this.props.dir, urn);
  }
  mkdir() {
    return __async(this, null, function* () {
      yield (0, import_promises.mkdir)(this.props.dir, {
        recursive: true
      });
    });
  }
  lock(urn) {
    return __async(this, null, function* () {
      yield this.mkdir();
      return (0, import_proper_lockfile.lock)(this.lockFile(urn), {
        realpath: false
      });
    });
  }
  get(urn) {
    return __async(this, null, function* () {
      let json;
      try {
        json = yield (0, import_promises.readFile)((0, import_path.join)(this.stateFile(urn)), "utf8");
      } catch (error) {
        return {};
      }
      return JSON.parse(json);
    });
  }
  update(urn, state) {
    return __async(this, null, function* () {
      yield this.mkdir();
      yield (0, import_promises.writeFile)(this.stateFile(urn), JSON.stringify(state, void 0, 2));
    });
  }
  delete(urn) {
    return __async(this, null, function* () {
      yield this.mkdir();
      yield (0, import_promises.rm)(this.stateFile(urn));
    });
  }
};

// src/provider/aws/cloud-control-api/provider.ts
var import_client_cloudcontrol = require("@aws-sdk/client-cloudcontrol");
var import_rfc6902 = require("rfc6902");
var CloudControlApiProvider = class {
  constructor(props) {
    this.client = new import_client_cloudcontrol.CloudControlClient(props);
  }
  own(id) {
    return id === "aws-cloud-control-api";
  }
  wait(delay) {
    return new Promise((r) => setTimeout(r, delay));
  }
  progressStatus(event) {
    return __async(this, null, function* () {
      var _a, _b;
      const token = event.RequestToken;
      while (true) {
        if (event.OperationStatus === "SUCCESS") {
          return event.Identifier;
        }
        if (event.OperationStatus === "FAILED") {
          throw new Error(`[${event.ErrorCode}] ${event.StatusMessage}`);
        }
        const now = Date.now();
        const after = (_b = (_a = event.RetryAfter) == null ? void 0 : _a.getTime()) != null ? _b : 0;
        const delay = Math.min(Math.max(after - now, 1e3), 5e3);
        yield this.wait(delay);
        const status = yield this.client.send(
          new import_client_cloudcontrol.GetResourceRequestStatusCommand({
            RequestToken: token
          })
        );
        event = status.ProgressEvent;
      }
    });
  }
  updateOperations(remoteDocument, oldDocument, newDocument) {
    for (const key in oldDocument) {
      if (typeof remoteDocument[key]) {
        delete oldDocument[key];
      }
    }
    const operations = (0, import_rfc6902.createPatch)(oldDocument, newDocument);
    return operations;
  }
  get(_0) {
    return __async(this, arguments, function* ({ id, type }) {
      const result = yield this.client.send(
        new import_client_cloudcontrol.GetResourceCommand({
          TypeName: type,
          Identifier: id
        })
      );
      return JSON.parse(result.ResourceDescription.Properties);
    });
  }
  create(_0) {
    return __async(this, arguments, function* ({ type, document }) {
      const result = yield this.client.send(
        new import_client_cloudcontrol.CreateResourceCommand({
          TypeName: type,
          DesiredState: JSON.stringify(document)
        })
      );
      return this.progressStatus(result.ProgressEvent);
    });
  }
  update(_0) {
    return __async(this, arguments, function* ({ type, id, oldDocument, newDocument, remoteDocument }) {
      const result = yield this.client.send(
        new import_client_cloudcontrol.UpdateResourceCommand({
          TypeName: type,
          Identifier: id,
          PatchDocument: JSON.stringify(this.updateOperations(remoteDocument, oldDocument, newDocument))
        })
      );
      return this.progressStatus(result.ProgressEvent);
    });
  }
  delete(_0) {
    return __async(this, arguments, function* ({ type, id }) {
      const result = yield this.client.send(
        new import_client_cloudcontrol.DeleteResourceCommand({
          TypeName: type,
          Identifier: id
        })
      );
      yield this.progressStatus(result.ProgressEvent);
    });
  }
};

// src/provider/aws/s3/bucket-object-provider.ts
var import_client_s3 = require("@aws-sdk/client-s3");
var BucketObjectProvider = class {
  constructor(props) {
    this.client = new import_client_s3.S3Client(props);
  }
  own(id) {
    return id === "aws-s3-bucket-object";
  }
  get(_0) {
    return __async(this, arguments, function* ({ document }) {
      const result = yield this.client.send(
        new import_client_s3.GetObjectAttributesCommand({
          Bucket: document.bucket,
          Key: document.key,
          ObjectAttributes: ["ETag", "Checksum"]
        })
      );
      return {
        VersionId: result.VersionId,
        ETag: result.ETag,
        Checksum: result.Checksum
      };
    });
  }
  create(_0) {
    return __async(this, arguments, function* ({ document, assets }) {
      yield this.client.send(
        new import_client_s3.PutObjectCommand({
          Bucket: document.bucket,
          Key: document.key,
          Body: assets.body.data
        })
      );
      return JSON.stringify([document.bucket, document.key]);
    });
  }
  update(_0) {
    return __async(this, arguments, function* ({ oldDocument, newDocument, assets }) {
      if (oldDocument.bucket !== newDocument.bucket) {
        throw new Error(`BucketObject can't change the bucket name`);
      }
      if (oldDocument.key !== newDocument.key) {
        yield this.client.send(
          new import_client_s3.DeleteObjectCommand({
            Bucket: oldDocument.bucket,
            Key: oldDocument.key
          })
        );
      }
      yield this.client.send(
        new import_client_s3.PutObjectCommand({
          Bucket: newDocument.bucket,
          Key: newDocument.key,
          Body: assets.body.data
        })
      );
      return JSON.stringify([newDocument.bucket, newDocument.key]);
    });
  }
  delete(_0) {
    return __async(this, arguments, function* ({ document }) {
      yield this.client.send(
        new import_client_s3.DeleteObjectCommand({
          Bucket: document.bucket,
          Key: document.key
        })
      );
    });
  }
};

// src/provider/aws/dynamodb/table-item-provider.ts
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var import_util_dynamodb = require("@aws-sdk/util-dynamodb");
var TableItemProvider = class {
  constructor(props) {
    this.client = new import_client_dynamodb.DynamoDB(props);
  }
  own(id) {
    return id === "aws-dynamodb-table-item";
  }
  marshall(item) {
    return (0, import_util_dynamodb.marshall)(item, {
      removeUndefinedValues: true
    });
  }
  primaryKey(document, item) {
    const key = {
      [document.hash]: item[document.hash]
    };
    if (document.sort) {
      key[document.sort] = item[document.sort];
    }
    return key;
  }
  get() {
    return __async(this, null, function* () {
      return {};
    });
  }
  create(_0) {
    return __async(this, arguments, function* ({ document, assets }) {
      const item = JSON.parse(assets.item.data.toString("utf8"));
      const key = this.primaryKey(document, item);
      yield this.client.send(
        new import_client_dynamodb.PutItemCommand({
          TableName: document.table,
          Item: this.marshall(item)
        })
      );
      return JSON.stringify([document.table, key]);
    });
  }
  update(_0) {
    return __async(this, arguments, function* ({ id, oldDocument, newDocument, assets }) {
      if (oldDocument.table !== newDocument.table) {
        throw new Error(`TableItem can't change the table name`);
      }
      if (oldDocument.hash !== newDocument.hash) {
        throw new Error(`TableItem can't change the hash key`);
      }
      if (oldDocument.sort !== newDocument.sort) {
        throw new Error(`TableItem can't change the sort key`);
      }
      const [_, oldKey] = JSON.parse(id);
      const item = JSON.parse(assets.item.data.toString("utf8"));
      const key = this.primaryKey(newDocument, item);
      if (JSON.stringify(oldKey) !== JSON.stringify(key)) {
        yield this.client.send(
          new import_client_dynamodb.DeleteItemCommand({
            TableName: newDocument.table,
            Key: this.marshall(oldKey)
          })
        );
      }
      yield this.client.send(
        new import_client_dynamodb.PutItemCommand({
          TableName: newDocument.table,
          Item: this.marshall(item)
        })
      );
      return JSON.stringify([newDocument.table, key]);
    });
  }
  delete(_0) {
    return __async(this, arguments, function* ({ id }) {
      const [table, oldKey] = JSON.parse(id);
      yield this.client.send(
        new import_client_dynamodb.DeleteItemCommand({
          TableName: table,
          Key: this.marshall(oldKey)
        })
      );
    });
  }
};

// src/provider/aws/route53/record-set-provider.ts
var import_client_route_53 = require("@aws-sdk/client-route-53");
var import_crypto = require("crypto");
var RecordSetProvider = class {
  constructor(props) {
    this.client = new import_client_route_53.Route53Client(props);
  }
  own(id) {
    return id === "aws-route53-record-set";
  }
  get(_0) {
    return __async(this, arguments, function* ({ id, document }) {
      var _a;
      const result = yield this.client.send(
        new import_client_route_53.ListResourceRecordSetsCommand({
          HostedZoneId: document.HostedZoneId,
          MaxItems: 1,
          StartRecordIdentifier: id,
          StartRecordName: document.Name,
          StartRecordType: document.Type
        })
      );
      return (_a = result.ResourceRecordSets) == null ? void 0 : _a.at(0);
    });
  }
  formatRecordSet(id, document) {
    var _a;
    return {
      Name: document.Name,
      Type: document.Type,
      ResourceRecords: (_a = document.ResourceRecords) == null ? void 0 : _a.map((Value) => ({ Value })),
      Weight: document.Weight,
      TTL: document.TTL,
      SetIdentifier: id,
      AliasTarget: document.AliasTarget
    };
  }
  create(_0) {
    return __async(this, arguments, function* ({ document }) {
      const id = (0, import_crypto.randomUUID)();
      yield this.client.send(
        new import_client_route_53.ChangeResourceRecordSetsCommand({
          HostedZoneId: document.HostedZoneId,
          ChangeBatch: {
            Changes: [
              {
                Action: "CREATE",
                ResourceRecordSet: this.formatRecordSet(id, document)
              }
            ]
          }
        })
      );
      return id;
    });
  }
  update(_0) {
    return __async(this, arguments, function* ({ id, oldDocument, newDocument }) {
      if (oldDocument.HostedZoneId !== newDocument.HostedZoneId) {
        throw new Error(`RecordSet hosted zone id can't be changed after creation.`);
      }
      if (oldDocument.Name !== newDocument.Name) {
        throw new Error(`RecordSet name id can't be changed after creation.`);
      }
      if (oldDocument.Type !== newDocument.Type) {
        throw new Error(`RecordSet type can't be changed after creation.`);
      }
      yield this.client.send(
        new import_client_route_53.ChangeResourceRecordSetsCommand({
          HostedZoneId: newDocument.HostedZoneId,
          ChangeBatch: {
            Changes: [
              {
                Action: "UPSERT",
                ResourceRecordSet: this.formatRecordSet(id, newDocument)
              }
            ]
          }
        })
      );
      return id;
    });
  }
  delete(_0) {
    return __async(this, arguments, function* ({ id, document }) {
      yield this.client.send(
        new import_client_route_53.ChangeResourceRecordSetsCommand({
          HostedZoneId: document.HostedZoneId,
          ChangeBatch: {
            Changes: [
              {
                Action: "DELETE",
                ResourceRecordSet: this.formatRecordSet(id, document)
              }
            ]
          }
        })
      );
    });
  }
};

// src/provider/aws/s3/bucket-provider.ts
var import_client_s32 = require("@aws-sdk/client-s3");
var BucketProvider = class {
  constructor(props) {
    this.client = new import_client_s32.S3Client(props);
    this.cloudProvider = props.cloudProvider;
  }
  own(id) {
    return id === "aws-s3-bucket";
  }
  get(props) {
    return __async(this, null, function* () {
      return this.cloudProvider.get(props);
    });
  }
  create(props) {
    return __async(this, null, function* () {
      return this.cloudProvider.create(props);
    });
  }
  update(props) {
    return __async(this, null, function* () {
      return this.cloudProvider.update(props);
    });
  }
  delete(props) {
    return __async(this, null, function* () {
      if (props.extra.forceDelete) {
        yield this.emptyBucket(props.document.BucketName);
      }
      return this.cloudProvider.delete(props);
    });
  }
  emptyBucket(bucket2) {
    return __async(this, null, function* () {
      yield Promise.all([
        //
        this.deleteBucketObjects(bucket2),
        this.deleteBucketObjectVersions(bucket2)
      ]);
    });
  }
  deleteBucketObjects(bucket2) {
    return __async(this, null, function* () {
      while (true) {
        const result = yield this.client.send(
          new import_client_s32.ListObjectsV2Command({
            Bucket: bucket2,
            MaxKeys: 1e3
          })
        );
        if (!result.Contents || result.Contents.length === 0) {
          break;
        }
        yield this.client.send(
          new import_client_s32.DeleteObjectsCommand({
            Bucket: bucket2,
            Delete: {
              Objects: result.Contents.map((object) => ({
                Key: object.Key
              }))
            }
          })
        );
      }
    });
  }
  deleteBucketObjectVersions(bucket2) {
    return __async(this, null, function* () {
      var _a, _b;
      while (true) {
        const result = yield this.client.send(
          new import_client_s32.ListObjectVersionsCommand({
            Bucket: bucket2,
            MaxKeys: 1e3
          })
        );
        const objects = [...(_a = result.DeleteMarkers) != null ? _a : [], ...(_b = result.Versions) != null ? _b : []];
        if (objects.length === 0) {
          break;
        }
        yield this.client.send(
          new import_client_s32.DeleteObjectsCommand({
            Bucket: bucket2,
            Delete: {
              Objects: objects.map((object) => ({
                Key: object.Key,
                VersionId: object.VersionId
              }))
            }
          })
        );
      }
    });
  }
};

// src/provider/aws/acm/certificate-provider.ts
var import_client_acm = require("@aws-sdk/client-acm");

// src/resource/hash.ts
var import_crypto2 = require("crypto");
var sha256 = (data) => {
  return (0, import_crypto2.createHash)("sha256").update(JSON.stringify(data)).digest("hex");
};

// src/provider/aws/acm/certificate-provider.ts
var CertificateProvider = class {
  constructor(props) {
    this.props = props;
    this.clients = {};
  }
  own(id) {
    return id === "aws-acm-certificate";
  }
  client(region2 = this.props.region) {
    if (!this.clients[region2]) {
      this.clients[region2] = new import_client_acm.ACMClient(__spreadProps(__spreadValues({}, this.props), {
        region: region2
      }));
    }
    return this.clients[region2];
  }
  get(_0) {
    return __async(this, arguments, function* ({ id, extra }) {
      const result = yield this.client(extra.region).send(
        new import_client_acm.DescribeCertificateCommand({
          CertificateArn: id
        })
      );
      return result.Certificate;
    });
  }
  create(_0) {
    return __async(this, arguments, function* ({ urn, document, extra }) {
      const token = sha256(urn).substring(0, 32);
      const result = yield this.client(extra.region).send(
        new import_client_acm.RequestCertificateCommand(__spreadValues({
          IdempotencyToken: token
        }, document))
      );
      return result.CertificateArn;
    });
  }
  update() {
    return __async(this, null, function* () {
      throw new Error(`Certificate can't be changed`);
      return "";
    });
  }
  delete(_0) {
    return __async(this, arguments, function* ({ id, extra }) {
      yield this.client(extra.region).send(
        new import_client_acm.DeleteCertificateCommand({
          CertificateArn: id
        })
      );
    });
  }
};

// src/provider/aws/acm/certificate-validation-provider.ts
var import_client_acm2 = require("@aws-sdk/client-acm");
var CertificateValidationProvider = class {
  constructor(props) {
    this.client = new import_client_acm2.ACMClient(props);
  }
  own(id) {
    return id === "aws-acm-certificate-validation";
  }
  get(_0) {
    return __async(this, arguments, function* ({ id }) {
      var _a;
      while (true) {
        const result = yield this.client.send(
          new import_client_acm2.DescribeCertificateCommand({
            CertificateArn: id
          })
        );
        switch ((_a = result.Certificate) == null ? void 0 : _a.Status) {
          case "EXPIRED":
            throw new Error(`Certificate is expired`);
          case "INACTIVE":
            throw new Error(`Certificate is inactive`);
          case "FAILED":
            throw new Error(`Certificate validation failed`);
          case "VALIDATION_TIMED_OUT":
            throw new Error(`Certificate validation timed out`);
          case "REVOKED":
            throw new Error(`Certificate revoked`);
          case "ISSUED":
            return { Status: "ISSUED" };
        }
        yield new Promise((resolve) => setTimeout(resolve, 5e3));
      }
    });
  }
  create(_0) {
    return __async(this, arguments, function* ({ document }) {
      return document.CertificateArn;
    });
  }
  update(_0) {
    return __async(this, arguments, function* ({ newDocument }) {
      return newDocument.CertificateArn;
    });
  }
  delete() {
    return __async(this, null, function* () {
    });
  }
};

// src/provider/aws/cloud.ts
var createCloudProviders = (config) => {
  const cloudControlApiProvider = new CloudControlApiProvider(config);
  return [
    //
    cloudControlApiProvider,
    // new SecurityGroupProvider(config),
    // new SecurityGroupRuleProvider(config),
    new BucketProvider(__spreadProps(__spreadValues({}, config), { cloudProvider: cloudControlApiProvider })),
    new BucketObjectProvider(config),
    new TableItemProvider(config),
    new RecordSetProvider(config),
    new CertificateProvider(__spreadValues({}, config)),
    new CertificateValidationProvider(__spreadValues({}, config))
    // new PolicyProvider(config),
  ];
};

// src/provider/aws/dynamodb/table.ts
var import_change_case = require("change-case");

// src/provider/aws/resource.ts
var AwsResource = class extends Resource {
  constructor() {
    super(...arguments);
    this.cloudProviderId = "aws-cloud-control-api";
  }
  // protected _region: string | undefined
  // get region() {
  // 	return this._region
  // }
  // setRegion(region: string) {
  // 	this._region = region
  // 	return this
  // }
};

// src/provider/aws/dynamodb/table-item.ts
var TableItem = class extends Resource {
  constructor(id, props) {
    super("AWS::DynamoDB::Table::Item", id, props);
    this.props = props;
    this.cloudProviderId = "aws-dynamodb-table-item";
  }
  // get staticProps() {
  // 	return ['table', 'key']
  // }
  toState() {
    const table = this.props.table;
    return {
      assets: {
        item: this.props.item
      },
      document: {
        table: table.name,
        hash: table.hash,
        sort: table.sort
      }
    };
  }
};

// src/provider/aws/dynamodb/table.ts
var Table = class extends AwsResource {
  constructor(id, props) {
    super("AWS::DynamoDB::Table", id, props);
    this.props = props;
    this.indexes = __spreadValues({}, this.props.indexes || {});
  }
  get arn() {
    return this.output((v) => v.Arn);
  }
  get name() {
    return this.output((v) => v.TableName);
  }
  get hash() {
    return this.output(() => unwrap(this.props.hash));
  }
  get sort() {
    return this.output(() => unwrap(this.props.sort));
  }
  enableStream(viewType) {
    this.props.stream = viewType;
  }
  addIndex(name, props) {
    this.indexes[name] = props;
  }
  addItem(id, item) {
    const tableItem = new TableItem(id, {
      table: this,
      item
    });
    this.add(tableItem);
    return tableItem;
  }
  get permissions() {
    var _a;
    const permissions = [
      {
        actions: [
          "dynamodb:DescribeTable",
          "dynamodb:PutItem",
          "dynamodb:GetItem",
          "dynamodb:UpdateItem",
          "dynamodb:DeleteItem",
          "dynamodb:TransactWrite",
          "dynamodb:BatchWriteItem",
          "dynamodb:BatchGetItem",
          "dynamodb:ConditionCheckItem",
          "dynamodb:Query",
          "dynamodb:Scan"
        ],
        resources: [this.arn]
      }
    ];
    const indexNames = Object.keys((_a = this.indexes) != null ? _a : {});
    if (indexNames.length > 0) {
      permissions.push({
        actions: ["dynamodb:Query"],
        resources: indexNames.map((indexName) => this.arn.apply((arn) => `${arn}/index/${indexName}`))
      });
    }
    return permissions;
  }
  attributeDefinitions() {
    const fields = unwrap(this.props.fields, {});
    const attributes = new Set(
      [
        this.props.hash,
        this.props.sort,
        ...Object.values(this.props.indexes || {}).map((index) => [index.hash, index.sort])
      ].flat().filter(Boolean)
    );
    const types = {
      string: "S",
      number: "N",
      binary: "B"
    };
    return [...attributes].map((name) => ({
      AttributeName: name,
      AttributeType: types[unwrap(fields[name], "string")]
    }));
  }
  toState() {
    return {
      document: __spreadValues(__spreadValues(__spreadValues({
        TableName: this.props.name,
        BillingMode: "PAY_PER_REQUEST",
        KeySchema: [
          { KeyType: "HASH", AttributeName: this.props.hash },
          ...this.props.sort ? [{ KeyType: "RANGE", AttributeName: this.props.sort }] : []
        ],
        AttributeDefinitions: this.attributeDefinitions(),
        TableClass: (0, import_change_case.constantCase)(unwrap(this.props.class, "standard")),
        DeletionProtectionEnabled: unwrap(this.props.deletionProtection, false),
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: unwrap(this.props.pointInTimeRecovery, false)
        }
      }, this.props.timeToLiveAttribute ? {
        TimeToLiveSpecification: {
          AttributeName: this.props.timeToLiveAttribute,
          Enabled: true
        }
      } : {}), this.props.stream ? {
        StreamSpecification: {
          StreamViewType: (0, import_change_case.constantCase)(unwrap(this.props.stream))
        }
      } : {}), Object.keys(this.indexes).length ? {
        GlobalSecondaryIndexes: Object.entries(this.indexes).map(([name, props]) => ({
          IndexName: name,
          KeySchema: [
            { KeyType: "HASH", AttributeName: props.hash },
            ...props.sort ? [{ KeyType: "RANGE", AttributeName: props.sort }] : []
          ],
          Projection: {
            ProjectionType: (0, import_change_case.constantCase)(props.projection || "all")
          }
        }))
      } : {})
    };
  }
};

// src/provider/aws/ec2/peer.ts
var Peer = class _Peer {
  constructor(ip, type) {
    this.ip = ip;
    this.type = type;
  }
  static ipv4(cidrIp) {
    const cidrMatch = cidrIp.match(/^(\d{1,3}\.){3}\d{1,3}(\/\d+)?$/);
    if (!cidrMatch) {
      throw new Error(`Invalid IPv4 CIDR: "${cidrIp}"`);
    }
    if (!cidrMatch[2]) {
      throw new Error(`CIDR mask is missing in IPv4: "${cidrIp}". Did you mean "${cidrIp}/32"?`);
    }
    return new _Peer(cidrIp, "v4");
  }
  static anyIpv4() {
    return new _Peer("0.0.0.0/0", "v4");
  }
  static ipv6(cidrIpv6) {
    const cidrMatch = cidrIpv6.match(/^([\da-f]{0,4}:){2,7}([\da-f]{0,4})?(\/\d+)?$/);
    if (!cidrMatch) {
      throw new Error(`Invalid IPv6 CIDR: "${cidrIpv6}"`);
    }
    if (!cidrMatch[3]) {
      throw new Error(`CIDR mask is missing in IPv6: "${cidrIpv6}". Did you mean "${cidrIpv6}/128"?`);
    }
    return new _Peer(cidrIpv6, "v6");
  }
  static anyIpv6() {
    return new _Peer("::/0", "v6");
  }
  toRuleJson() {
    switch (this.type) {
      case "v4":
        return { CidrIp: this.ip };
      case "v6":
        return { CidrIpv6: this.ip };
    }
  }
  toString() {
    return this.ip;
  }
};

// src/provider/aws/ec2/port.ts
var Port = class _Port {
  static tcp(port) {
    return new _Port({
      protocol: "tcp" /* TCP */,
      from: port,
      to: port
    });
  }
  static tcpRange(startPort, endPort) {
    return new _Port({
      protocol: "tcp" /* TCP */,
      from: startPort,
      to: endPort
    });
  }
  static allTcp() {
    return new _Port({
      protocol: "tcp" /* TCP */,
      from: 0,
      to: 65535
    });
  }
  static allTraffic() {
    return new _Port({
      protocol: "-1" /* ALL */
    });
  }
  constructor(props) {
    this.protocol = props.protocol;
    this.from = props.from;
    this.to = props.to;
  }
  toRuleJson() {
    return {
      IpProtocol: this.protocol,
      FromPort: this.from,
      ToPort: this.to
    };
  }
};

// src/provider/aws/events/rule.ts
var Rule = class extends AwsResource {
  constructor(id, props) {
    super("AWS::Events::Rule", id, props);
    this.props = props;
  }
  get id() {
    return this.output((v) => v.Id);
  }
  get arn() {
    return this.output((v) => v.Arn);
  }
  toState() {
    return {
      document: __spreadProps(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues({
        Name: this.props.name
      }, this.attr("State", this.props.enabled ? "ENABLED" : "DISABLED")), this.attr("Description", this.props.description)), this.attr("ScheduleExpression", this.props.schedule)), this.attr("RoleArn", this.props.roleArn)), this.attr("EventBusName", this.props.eventBusName)), this.attr("EventPattern", this.props.eventPattern)), {
        Targets: unwrap(this.props.targets).map((v) => unwrap(v)).map((target) => __spreadValues({
          Arn: target.arn,
          Id: target.id
        }, this.attr("Input", unwrap(target.input) && JSON.stringify(unwrap(target.input)))))
      })
    };
  }
};

// src/provider/aws/iam/__policy.ts
var import_change_case2 = require("change-case");

// src/provider/aws/cloud-control-api/resource.ts
var CloudControlApiResource = class extends Resource {
  constructor() {
    super(...arguments);
    this.cloudProviderId = "aws-cloud-control-api";
  }
  // protected _region: string | undefined
  // get region() {
  // 	return this._region
  // }
  // setRegion(region: string) {
  // 	this._region = region
  // 	return this
  // }
};

// src/provider/aws/iam/__policy.ts
var formatPolicyDocument = (policy) => ({
  PolicyName: policy.name,
  PolicyDocument: {
    Version: unwrap(policy.version, "2012-10-17"),
    Statement: unwrap(policy.statements, []).map((v) => unwrap(v)).map(formatStatement)
  }
});
var formatStatement = (statement) => ({
  Effect: (0, import_change_case2.capitalCase)(unwrap(statement.effect, "allow")),
  Action: statement.actions,
  Resource: statement.resources
});

// src/provider/aws/iam/role-policy.ts
var import_change_case3 = require("change-case");
var formatPolicyDocument2 = (policy) => ({
  PolicyName: policy.name,
  PolicyDocument: {
    Version: unwrap(policy.version, "2012-10-17"),
    Statement: unwrap(policy.statements, []).map((v) => unwrap(v)).map(formatStatement2)
  }
});
var formatStatement2 = (statement) => ({
  Effect: (0, import_change_case3.capitalCase)(unwrap(statement.effect, "allow")),
  Action: statement.actions,
  Resource: statement.resources
});
var RolePolicy = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::IAM::RolePolicy", id, props);
    this.props = props;
    this.statements = [];
  }
  get id() {
    return this.output((v) => v.PolicyId);
  }
  get arn() {
    return this.output((v) => v.Arn);
  }
  get name() {
    return this.output((v) => v.PolicyName);
  }
  addStatement(...statements) {
    this.registerDependency(statements);
    this.statements.push(...statements);
    return this;
  }
  toState() {
    return {
      document: __spreadValues({
        RoleName: this.props.role
      }, formatPolicyDocument2(__spreadProps(__spreadValues({}, this.props), {
        statements: [...unwrap(this.props.statements, []), ...this.statements]
      })))
    };
  }
};

// src/provider/aws/iam/role.ts
var Role = class extends AwsResource {
  constructor(id, props = {}) {
    super("AWS::IAM::Role", id, props);
    this.props = props;
    this.inlinePolicies = [];
    this.managedPolicies = /* @__PURE__ */ new Set();
  }
  get id() {
    return this.output((v) => v.RoleId);
  }
  get arn() {
    return this.output((v) => v.Arn);
  }
  get name() {
    return this.output((v) => v.RoleName);
  }
  addManagedPolicy(...policies) {
    this.registerDependency(policies);
    for (const arn of policies) {
      this.managedPolicies.add(arn);
    }
    return this;
  }
  addInlinePolicy(...policies) {
    this.registerDependency(policies);
    for (const policy of policies) {
      this.inlinePolicies.push(policy);
    }
    return this;
  }
  addPolicy(id, props) {
    const policy = new RolePolicy(id, __spreadValues({
      role: this.name
    }, props));
    this.add(policy);
    return policy;
  }
  toState() {
    return {
      document: __spreadValues(__spreadProps(__spreadValues(__spreadValues({}, this.attr("RoleName", this.props.name)), this.attr("Path", this.props.path)), {
        ManagedPolicyArns: [...this.managedPolicies],
        Policies: [...unwrap(this.props.policies, []), ...this.inlinePolicies].map(
          (policy) => formatPolicyDocument(policy)
        )
      }), this.props.assumedBy ? {
        AssumeRolePolicyDocument: {
          Version: "2012-10-17",
          Statement: [
            {
              Action: ["sts:AssumeRole"],
              Effect: "Allow",
              Principal: {
                Service: [this.props.assumedBy]
              }
            }
          ]
        }
      } : {})
    };
  }
};

// src/provider/aws/iot/topic-rule.ts
var TopicRule = class extends AwsResource {
  constructor(id, props) {
    super("AWS::IoT::TopicRule", id, props);
    this.props = props;
  }
  get arn() {
    return this.output((v) => v.Arn);
  }
  toState() {
    return {
      document: {
        RuleName: this.props.name,
        TopicRulePayload: {
          Sql: this.props.sql,
          AwsIotSqlVersion: unwrap(this.props.sqlVersion, "2016-03-23"),
          RuleDisabled: !unwrap(this.props.enabled, true),
          Actions: unwrap(this.props.actions).map((action) => ({
            Lambda: { FunctionArn: unwrap(unwrap(action).lambda).functionArn }
          }))
        }
      }
    };
  }
};

// src/provider/aws/lambda/function.ts
var import_change_case6 = require("change-case");

// src/provider/aws/lambda/code.ts
var formatCode = (code) => {
  if ("bucket" in code) {
    return {
      S3Bucket: code.bucket,
      S3Key: code.key,
      S3ObjectVersion: code.version
    };
  }
  if ("imageUri" in code) {
    return {
      ImageUri: code.imageUri
    };
  }
  return {
    ZipFile: code.zipFile
  };
};

// src/provider/aws/lambda/function.ts
var import_size = require("@awsless/size");
var import_duration2 = require("@awsless/duration");

// src/provider/aws/lambda/url.ts
var import_change_case4 = require("change-case");
var import_duration = require("@awsless/duration");
var Url = class extends AwsResource {
  constructor(id, props) {
    super("AWS::Lambda::Url", id, props);
    this.props = props;
  }
  get url() {
    return this.output((v) => v.FunctionUrl);
  }
  get domain() {
    return this.url.apply((url2) => url2.split("/")[2]);
  }
  cors() {
    const cors = unwrap(this.props.cors);
    if (!cors) {
      return {};
    }
    const allow = unwrap(cors.allow, {});
    const expose = unwrap(cors.expose, {});
    return __spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues({}, this.attr("AllowCredentials", allow.credentials)), this.attr("AllowHeaders", allow.headers)), this.attr("AllowMethods", allow.methods)), this.attr("AllowOrigins", allow.origins)), this.attr("ExposeHeaders", expose.headers)), this.attr("MaxAge", cors.maxAge && (0, import_duration.toSeconds)(unwrap(cors.maxAge))));
  }
  toState() {
    return {
      document: __spreadProps(__spreadValues({
        AuthType: (0, import_change_case4.constantCase)(unwrap(this.props.authType, "none")),
        InvokeMode: (0, import_change_case4.constantCase)(unwrap(this.props.invokeMode, "buffered")),
        TargetFunctionArn: this.props.targetArn
      }, this.attr("Qualifier", this.props.qualifier)), {
        Cors: this.cors()
      })
    };
  }
};

// src/provider/aws/lambda/permission.ts
var import_change_case5 = require("change-case");
var Permission = class extends AwsResource {
  constructor(id, props) {
    super("AWS::Lambda::Permission", id, props);
    this.props = props;
  }
  toState() {
    return {
      document: __spreadValues(__spreadValues({
        FunctionName: this.props.functionArn,
        Action: unwrap(this.props.action, "lambda:InvokeFunction"),
        Principal: this.props.principal
      }, this.attr("SourceArn", this.props.sourceArn)), this.attr(
        "FunctionUrlAuthType",
        this.props.urlAuthType && (0, import_change_case5.constantCase)(unwrap(this.props.urlAuthType))
      ))
    };
  }
};

// src/provider/aws/lambda/function.ts
var Function = class extends AwsResource {
  constructor(id, props) {
    super("AWS::Lambda::Function", id, props);
    this.props = props;
    this.environmentVariables = {};
  }
  get arn() {
    return this.output((v) => v.Arn);
  }
  get name() {
    return this.output((v) => v.FunctionName);
  }
  addEnvironment(name, value) {
    this.environmentVariables[name] = value;
    return this;
  }
  setVpc(vpc) {
    this.props.vpc = vpc;
    return this;
  }
  get permissions() {
    return {
      actions: [
        //
        "lambda:InvokeFunction",
        "lambda:InvokeAsync"
      ],
      resources: [this.arn]
    };
  }
  enableUrlAccess(props = {}) {
    var _a;
    const url2 = new Url("url", __spreadProps(__spreadValues({}, props), {
      targetArn: this.arn
    }));
    const permissions = new Permission("url", {
      principal: "*",
      // principal: 'cloudfront.amazonaws.com',
      // sourceArn: distribution.arn,
      action: "lambda:InvokeFunctionUrl",
      functionArn: this.arn,
      urlAuthType: (_a = props.authType) != null ? _a : "none"
    });
    this.add(permissions);
    this.add(url2);
    return url2;
  }
  toState() {
    if (unwrap(this.props.name).length > 64) {
      throw new TypeError(`Lambda function name length can't be greater then 64. ${unwrap(this.props.name)}`);
    }
    return {
      asset: {
        code: this.props.code
      },
      document: __spreadProps(__spreadValues(__spreadValues(__spreadProps(__spreadValues({
        FunctionName: this.props.name,
        Description: this.props.description,
        MemorySize: (0, import_size.toMebibytes)(unwrap(this.props.memorySize, (0, import_size.mebibytes)(128))),
        Handler: unwrap(this.props.handler, "index.default"),
        Runtime: unwrap(this.props.runtime, "nodejs18.x"),
        Timeout: (0, import_duration2.toSeconds)(unwrap(this.props.timeout, (0, import_duration2.seconds)(10))),
        Architectures: [unwrap(this.props.architecture, "arm64")],
        Role: this.props.role
      }, this.attr("ReservedConcurrentExecutions", this.props.reserved)), {
        Code: formatCode(unwrap(this.props.code)),
        EphemeralStorage: {
          Size: (0, import_size.toMebibytes)(unwrap(this.props.ephemeralStorageSize, (0, import_size.mebibytes)(512)))
        }
      }), this.props.log ? {
        LoggingConfig: {
          LogFormat: unwrap(this.props.log).format === "text" ? "Text" : "JSON",
          ApplicationLogLevel: (0, import_change_case6.constantCase)(unwrap(unwrap(this.props.log).level, "error")),
          SystemLogLevel: (0, import_change_case6.constantCase)(unwrap(unwrap(this.props.log).system, "warn"))
        }
      } : {}), this.props.vpc ? {
        VpcConfig: {
          SecurityGroupIds: unwrap(this.props.vpc).securityGroupIds,
          SubnetIds: unwrap(this.props.vpc).subnetIds
        }
      } : {}), {
        Environment: {
          Variables: __spreadValues(__spreadValues({}, unwrap(this.props.environment)), this.environmentVariables)
        }
      })
    };
  }
};

// src/provider/aws/memorydb/cluster.ts
var Cluster = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::MemoryDB::Cluster", id, props);
    this.props = props;
  }
  // get status() {
  // 	return this.output<string>(v => v.Status)
  // }
  get arn() {
    return this.output((v) => v.Arn);
  }
  get address() {
    return this.output((v) => v.ClusterEndpoint.Address);
  }
  get port() {
    return this.output((v) => v.ClusterEndpoint.Port);
  }
  toState() {
    return {
      document: __spreadProps(__spreadValues(__spreadValues(__spreadProps(__spreadValues({
        ClusterName: this.props.name,
        ClusterEndpoint: {
          Port: this.props.port
        },
        Port: this.props.port
      }, this.attr("Description", this.props.description)), {
        ACLName: this.props.aclName,
        EngineVersion: unwrap(this.props.engine, "7.0")
      }), this.attr("SubnetGroupName", this.props.subnetGroupName)), this.attr("SecurityGroupIds", this.props.securityGroupIds)), {
        NodeType: "db." + unwrap(this.props.type),
        NumReplicasPerShard: unwrap(this.props.replicasPerShard, 1),
        NumShards: unwrap(this.props.shards, 1),
        TLSEnabled: unwrap(this.props.tls, false),
        DataTiering: unwrap(this.props.dataTiering) ? "true" : "false",
        AutoMinorVersionUpgrade: unwrap(this.props.autoMinorVersionUpgrade, true),
        MaintenanceWindow: unwrap(this.props.maintenanceWindow, "Sat:02:00-Sat:05:00")
      })
    };
  }
};

// src/provider/aws/memorydb/subnet-group.ts
var SubnetGroup = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::MemoryDB::SubnetGroup", id, props);
    this.props = props;
  }
  get arn() {
    return this.output((v) => v.ARN);
  }
  get name() {
    return this.output((v) => v.SubnetGroupName);
  }
  toState() {
    return {
      document: __spreadValues({
        SubnetGroupName: this.props.name,
        SubnetIds: this.props.subnetIds
      }, this.attr("Description", this.props.description))
    };
  }
};

// src/provider/aws/open-search-serverless/collection.ts
var Collection = class extends AwsResource {
  constructor(id, props) {
    super("AWS::OpenSearchServerless::Collection", id, props);
    this.props = props;
  }
  get id() {
    return this.output((v) => v.Id);
  }
  get arn() {
    return this.output((v) => v.Arn);
  }
  get endpoint() {
    return this.output((v) => v.CollectionEndpoint);
  }
  get permissions() {
    return {
      actions: ["aoss:APIAccessAll"],
      resources: [this.arn]
    };
  }
  toState() {
    return {
      document: __spreadValues({
        Name: this.props.name,
        Type: unwrap(this.props.type).toUpperCase()
      }, this.attr("Description", this.props.description))
    };
  }
};

// src/provider/aws/route53/hosted-zone.ts
var HostedZone = class extends AwsResource {
  constructor(id, props) {
    super("AWS::Route53::HostedZone", id, props);
    this.props = props;
  }
  get id() {
    return this.output((v) => v.Id);
  }
  get name() {
    return this.output((v) => v.Name);
  }
  get nameServers() {
    return this.output((v) => v.NameServers);
  }
  toState() {
    const name = unwrap(this.props.name);
    return {
      document: {
        Name: name.endsWith(".") ? name : name + "."
      }
    };
  }
};

// src/provider/aws/route53/record-set.ts
var import_duration3 = require("@awsless/duration");
var formatRecordSet = (record) => {
  const name = unwrap(record.name);
  return __spreadValues(__spreadValues(__spreadValues({
    Name: name.endsWith(".") ? name : name + ".",
    Type: record.type,
    Weight: unwrap(record.weight, 0)
  }, record.ttl ? {
    TTL: (0, import_duration3.toSeconds)(unwrap(record.ttl))
  } : {}), "records" in record ? {
    ResourceRecords: record.records
  } : {}), "alias" in record && record.alias ? {
    AliasTarget: {
      DNSName: unwrap(record.alias).dnsName,
      HostedZoneId: unwrap(record.alias).hostedZoneId
    }
  } : {});
};
var RecordSet = class extends Resource {
  constructor(id, props) {
    super("AWS::Route53::RecordSet", id, props);
    this.props = props;
    this.cloudProviderId = "aws-route53-record-set";
  }
  toState() {
    return {
      document: __spreadValues({
        HostedZoneId: this.props.hostedZoneId
      }, formatRecordSet(this.props))
    };
  }
};

// src/provider/aws/s3/bucket.ts
var import_change_case7 = require("change-case");

// src/provider/aws/s3/bucket-object.ts
var BucketObject = class extends Resource {
  constructor(id, props) {
    super("AWS::S3::Bucket::Object", id, props);
    this.props = props;
    this.cloudProviderId = "aws-s3-bucket-object";
  }
  get bucket() {
    return this.props.bucket;
  }
  get key() {
    return this.props.key;
  }
  get version() {
    return this.output((v) => v.VersionId);
  }
  get etag() {
    return this.output((v) => v.ETag);
  }
  get checksum() {
    return this.output((v) => v.Checksum);
  }
  // 			ACL:			acl
  // 			Bucket: 		bucket
  // 			Body:			body
  // 			Key:			file.key
  // 			Metadata:		metadata
  // 			CacheControl:	cacheControl
  // 			ContentType:	mime.contentType(file.ext) or 'text/html; charset=utf-8'
  toState() {
    return {
      assets: {
        body: this.props.body
      },
      document: {
        bucket: this.props.bucket,
        key: this.props.key
      }
    };
  }
};

// src/provider/aws/s3/bucket.ts
var Bucket = class extends Resource {
  constructor(id, props = {}) {
    super("AWS::S3::Bucket", id, props);
    this.props = props;
    this.cloudProviderId = "aws-s3-bucket";
  }
  get name() {
    return this.output((v) => v.BucketName);
  }
  get arn() {
    return this.output((v) => v.Arn);
  }
  get domainName() {
    return this.output((v) => v.DomainName);
  }
  get dealStackDomainName() {
    return this.output((v) => v.DualStackDomainName);
  }
  get regionalDomainName() {
    return this.output((v) => v.RegionalDomainName);
  }
  get url() {
    return this.output((v) => v.WebsiteURL);
  }
  get permissions() {
    return {
      actions: [
        "s3:ListBucket",
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject",
        "s3:GetObjectAttributes"
      ],
      resources: [
        this.arn,
        this.arn.apply((arn) => `${arn}/*`)
        // `arn:aws:s3:::${this.name}`,
        // `arn:aws:s3:::${this.name}/*`,
      ]
    };
  }
  addObject(id, props) {
    const object = new BucketObject(id, __spreadProps(__spreadValues({}, props), {
      bucket: this.name
    }));
    this.add(object);
    return object;
  }
  toState() {
    return {
      extra: {
        forceDelete: this.props.forceDelete
      },
      document: __spreadValues(__spreadValues(__spreadValues({
        BucketName: unwrap(this.props.name, this.identifier),
        AccessControl: (0, import_change_case7.pascalCase)(unwrap(this.props.accessControl, "private"))
      }, unwrap(this.props.versioning, false) ? {
        VersioningConfiguration: {
          Status: "Enabled"
        }
      } : {}), this.props.website ? {
        WebsiteConfiguration: {
          IndexDocument: unwrap(this.props.website).indexDocument,
          ErrorDocument: unwrap(this.props.website).errorDocument
        }
      } : {}), this.props.cors ? {
        CorsConfiguration: {
          CorsRules: unwrap(this.props.cors, []).map((rule) => unwrap(rule)).map((rule) => ({
            MaxAge: rule.maxAge,
            AllowedHeaders: rule.headers,
            AllowedMethods: rule.headers,
            AllowedOrigins: rule.headers,
            ExposedHeaders: rule.headers
          }))
        }
      } : {})
    };
  }
};

// src/provider/aws/s3/bucket-policy.ts
var import_change_case8 = require("change-case");
var BucketPolicy = class extends AwsResource {
  constructor(id, props) {
    super("AWS::S3::BucketPolicy", id);
    this.props = props;
  }
  toState() {
    var _a;
    return {
      document: {
        Bucket: this.props.bucketName,
        PolicyDocument: {
          Version: (_a = this.props.version) != null ? _a : "2012-10-17",
          Statement: unwrap(this.props.statements, []).map((s) => unwrap(s)).map((statement) => {
            var _a2;
            return __spreadValues(__spreadProps(__spreadValues({
              Effect: (0, import_change_case8.capitalCase)((_a2 = statement.effect) != null ? _a2 : "allow")
            }, statement.principal ? {
              Principal: {
                Service: statement.principal
              }
            } : {}), {
              Action: statement.actions,
              Resource: statement.resources
            }), statement.sourceArn ? {
              Condition: {
                StringEquals: {
                  "AWS:SourceArn": statement.sourceArn
                }
              }
            } : {});
          })
        }
      }
    };
  }
};

// src/provider/aws/s3/state-provider.ts
var StateProvider = class {
  lock(urn) {
    return __async(this, null, function* () {
      console.log("LOCK", urn);
      return () => __async(this, null, function* () {
        console.log("UNLOCK", urn);
      });
    });
  }
  get(urn) {
    return __async(this, null, function* () {
      console.log("LOAD APP STATE", urn);
      return {};
    });
  }
  update(urn, state) {
    return __async(this, null, function* () {
      console.log("UPDATE APP STATE", urn, state);
    });
  }
  delete(urn) {
    return __async(this, null, function* () {
      console.log("DELETE APP STATE", urn);
    });
  }
};

// src/provider/aws/sns/subscription.ts
var Subscription = class extends AwsResource {
  constructor(id, props) {
    super("AWS::SNS::Subscription", id, props);
    this.props = props;
  }
  toState() {
    return {
      document: {
        TopicArn: this.props.topicArn,
        Protocol: this.props.protocol,
        Endpoint: this.props.endpoint
      }
    };
  }
};

// src/provider/aws/sns/topic.ts
var Topic = class extends AwsResource {
  constructor(id, props) {
    super("AWS::SNS::Topic", id, props);
    this.props = props;
  }
  get arn() {
    return this.output((v) => v.Arn);
  }
  get name() {
    return this.output((v) => v.TopicName);
  }
  get permissions() {
    return {
      actions: ["sns:Publish"],
      resources: [this.arn]
    };
  }
  toState() {
    return {
      document: {
        TopicName: this.props.name,
        DisplayName: this.props.name,
        Tags: [{ Key: "name", Value: this.props.name }]
      }
    };
  }
};

// src/provider/aws/sqs/queue.ts
var import_duration4 = require("@awsless/duration");
var import_size2 = require("@awsless/size");
var Queue = class extends AwsResource {
  constructor(id, props) {
    super("AWS::SQS::Queue", id, props);
    this.props = props;
  }
  setDeadLetter(arn) {
    this.props.deadLetterArn = arn;
    return this;
  }
  get arn() {
    return this.output((v) => v.Arn);
  }
  get url() {
    return this.output((v) => v.QueueUrl);
  }
  get name() {
    return this.output((v) => v.QueueName);
  }
  get permissions() {
    return {
      actions: [
        //
        "sqs:SendMessage",
        "sqs:ReceiveMessage",
        "sqs:GetQueueUrl",
        "sqs:GetQueueAttributes"
      ],
      resources: [this.arn]
    };
  }
  toState() {
    return {
      document: __spreadValues({
        QueueName: this.props.name,
        Tags: [{ Key: "name", Value: this.props.name }],
        DelaySeconds: (0, import_duration4.toSeconds)(unwrap(this.props.deliveryDelay, (0, import_duration4.seconds)(0))),
        MaximumMessageSize: (0, import_size2.toBytes)(unwrap(this.props.maxMessageSize, (0, import_size2.kibibytes)(256))),
        MessageRetentionPeriod: (0, import_duration4.toSeconds)(unwrap(this.props.retentionPeriod, (0, import_duration4.days)(4))),
        ReceiveMessageWaitTimeSeconds: (0, import_duration4.toSeconds)(unwrap(this.props.receiveMessageWaitTime, (0, import_duration4.seconds)(0))),
        VisibilityTimeout: (0, import_duration4.toSeconds)(unwrap(this.props.visibilityTimeout, (0, import_duration4.seconds)(30)))
      }, this.props.deadLetterArn ? {
        RedrivePolicy: {
          deadLetterTargetArn: this.props.deadLetterArn,
          maxReceiveCount: unwrap(this.props.maxReceiveCount, 100)
        }
      } : {})
    };
  }
};

// src/provider/aws/ec2/vpc.ts
var Vpc = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::EC2::VPC", id, props);
    this.props = props;
  }
  get id() {
    return this.output((v) => v.VpcId);
  }
  get defaultNetworkAcl() {
    return this.output((v) => v.DefaultNetworkAcl);
  }
  get defaultSecurityGroup() {
    return this.output((v) => v.DefaultSecurityGroup);
  }
  toState() {
    return {
      document: {
        CidrBlock: unwrap(this.props.cidrBlock).ip,
        Tags: [
          {
            Key: "Name",
            Value: this.props.name
          }
        ]
      }
    };
  }
};

// src/provider/aws/ec2/route-table.ts
var RouteTable = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::EC2::RouteTable", id, props);
    this.props = props;
  }
  get id() {
    return this.output((v) => v.RouteTableId);
  }
  // get name() {
  // 	return this.output<string>(v => v.RouteTableId)
  // }
  toState() {
    return {
      document: {
        VpcId: this.props.vpcId,
        Tags: [
          {
            Key: "Name",
            Value: this.props.name
          }
        ]
      }
    };
  }
};

// src/provider/aws/ec2/internet-gateway.ts
var InternetGateway = class extends CloudControlApiResource {
  constructor(id, props = {}) {
    super("AWS::EC2::InternetGateway", id, props);
    this.props = props;
  }
  get id() {
    return this.output((v) => v.InternetGatewayId);
  }
  toState() {
    return {
      document: {
        Tags: this.props.name ? [
          {
            Key: "Name",
            Value: this.props.name
          }
        ] : []
      }
    };
  }
};

// src/provider/aws/ec2/vpc-gateway-attachment.ts
var VPCGatewayAttachment = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::EC2::VPCGatewayAttachment", id, props);
    this.props = props;
  }
  get vpcId() {
    return this.output((v) => v.VpcId);
  }
  get internetGatewayId() {
    return this.output((v) => v.InternetGatewayId);
  }
  toState() {
    return {
      document: {
        VpcId: this.props.vpcId,
        InternetGatewayId: this.props.internetGatewayId
      }
    };
  }
};

// src/provider/aws/ec2/route.ts
var Route = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::EC2::Route", id, props);
    this.props = props;
  }
  get gatewayId() {
    return this.output((v) => v.GatewayId);
  }
  get routeTableId() {
    return this.output((v) => v.RouteTableId);
  }
  get vpcEndpointId() {
    return this.output((v) => v.VpcEndpointId);
  }
  get cidrBlock() {
    return this.output((v) => Peer.ipv4(v.CidrBlock));
  }
  get destinationCidrBlock() {
    return this.output((v) => Peer.ipv4(v.DestinationCidrBlock));
  }
  toState() {
    return {
      document: {
        GatewayId: this.props.gatewayId,
        RouteTableId: this.props.routeTableId,
        DestinationCidrBlock: unwrap(this.props.destination).ip
      }
    };
  }
};

// src/provider/aws/ec2/subnet-route-table-association.ts
var SubnetRouteTableAssociation = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::EC2::SubnetRouteTableAssociation", id, props);
    this.props = props;
  }
  get id() {
    return this.output((v) => v.Id);
  }
  toState() {
    return {
      document: {
        SubnetId: this.props.subnetId,
        RouteTableId: this.props.routeTableId
      }
    };
  }
};

// src/provider/aws/ec2/subnet.ts
var Subnet = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::EC2::Subnet", id, props);
    this.props = props;
  }
  get id() {
    return this.output((v) => v.SubnetId);
  }
  get vpcId() {
    return this.output((v) => v.VpcId);
  }
  get availabilityZone() {
    return this.output((v) => v.AvailabilityZone);
  }
  get availabilityZoneId() {
    return this.output((v) => v.AvailabilityZoneId);
  }
  associateRouteTable(routeTableId) {
    const association = new SubnetRouteTableAssociation(this.identifier, {
      routeTableId,
      subnetId: this.id
    });
    this.add(association);
    return this;
  }
  toState() {
    return {
      document: {
        VpcId: this.props.vpcId,
        CidrBlock: unwrap(this.props.cidrBlock).ip,
        AvailabilityZone: this.props.availabilityZone
      }
    };
  }
};

// src/provider/aws/ec2/security-group.ts
var SecurityGroup = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::EC2::SecurityGroup", id, props);
    this.props = props;
    this.ingress = [];
    this.egress = [];
  }
  get id() {
    return this.output((v) => v.GroupId);
  }
  get name() {
    return this.output((v) => v.GroupName);
  }
  addIngressRule(rule) {
    this.ingress.push(rule);
    return this;
  }
  addEgressRule(rule) {
    this.egress.push(rule);
    return this;
  }
  toState() {
    return {
      document: {
        VpcId: this.props.vpcId,
        GroupName: this.props.name,
        GroupDescription: this.props.description,
        SecurityGroupEgress: this.egress.map((rule) => unwrap(rule)).map((rule) => __spreadProps(__spreadValues(__spreadValues({}, unwrap(rule.peer).toRuleJson()), unwrap(rule.port).toRuleJson()), {
          Description: unwrap(rule.description, "")
        })),
        SecurityGroupIngress: this.ingress.map((rule) => unwrap(rule)).map((rule) => __spreadProps(__spreadValues(__spreadValues({}, unwrap(rule.peer).toRuleJson()), unwrap(rule.port).toRuleJson()), {
          Description: unwrap(rule.description, "")
        }))
      }
    };
  }
};

// src/provider/aws/ec2/__security-group-rule.ts
var SecurityGroupRule = class extends Resource {
  constructor(id, props) {
    super("AWS::EC2::SecurityGroupRule", id, props);
    this.props = props;
    this.cloudProviderId = "aws-ec2-security-group-rule";
  }
  toState() {
    return {
      document: __spreadValues(__spreadValues({
        SecurityGroupId: this.props.securityGroupId,
        Type: this.props.type,
        Description: unwrap(this.props.description, "")
      }, unwrap(this.props.port).toRuleJson()), unwrap(this.props.peer).toRuleJson())
    };
  }
};

// src/provider/aws/cloud-watch/log-group.ts
var import_duration5 = require("@awsless/duration");
var LogGroup = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::Logs::LogGroup", id, props);
    this.props = props;
  }
  get arn() {
    return this.output((v) => v.Arn);
  }
  get name() {
    return this.output((v) => v.LogGroupName);
  }
  get permissions() {
    return [
      {
        actions: ["logs:CreateLogStream"],
        resources: [this.arn]
      },
      {
        actions: ["logs:PutLogEvents"],
        resources: [this.arn.apply((arn) => `${arn}:*`)]
      }
    ];
  }
  toState() {
    return {
      document: __spreadValues({
        LogGroupName: this.props.name
      }, this.attr("RetentionInDays", this.props.retention && (0, import_duration5.toDays)(unwrap(this.props.retention))))
    };
  }
};

// src/provider/aws/cognito/user-pool.ts
var import_change_case9 = require("change-case");

// src/provider/aws/cognito/user-pool-client.ts
var import_duration6 = require("@awsless/duration");
var UserPoolClient = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::Cognito::UserPoolClient", id, props);
    this.props = props;
  }
  get id() {
    return this.output((v) => v.ClientId);
  }
  get name() {
    return this.output((v) => v.ClientName);
  }
  get userPoolId() {
    return this.output((v) => v.UserPoolId);
  }
  formatAuthFlows() {
    const authFlows = [];
    const props = unwrap(this.props.authFlows);
    if (unwrap(props == null ? void 0 : props.userPassword)) {
      authFlows.push("ALLOW_USER_PASSWORD_AUTH");
    }
    if (unwrap(props == null ? void 0 : props.adminUserPassword)) {
      authFlows.push("ALLOW_ADMIN_USER_PASSWORD_AUTH");
    }
    if (unwrap(props == null ? void 0 : props.custom)) {
      authFlows.push("ALLOW_CUSTOM_AUTH");
    }
    if (unwrap(props == null ? void 0 : props.userSrp)) {
      authFlows.push("ALLOW_USER_SRP_AUTH");
    }
    authFlows.push("ALLOW_REFRESH_TOKEN_AUTH");
    return authFlows;
  }
  formatIdentityProviders() {
    const supported = unwrap(this.props.supportedIdentityProviders, []).map((v) => unwrap(v));
    const providers = [];
    if (supported.length === 0) {
      return void 0;
    }
    if (supported.includes("amazon")) {
      providers.push("LoginWithAmazon");
    }
    if (supported.includes("apple")) {
      providers.push("SignInWithApple");
    }
    if (supported.includes("cognito")) {
      providers.push("COGNITO");
    }
    if (supported.includes("facebook")) {
      providers.push("Facebook");
    }
    if (supported.includes("google")) {
      providers.push("Google");
    }
    return providers;
  }
  toState() {
    const validity = unwrap(this.props.validity, {});
    return {
      document: __spreadProps(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues({
        ClientName: this.props.name,
        UserPoolId: this.props.userPoolId,
        ExplicitAuthFlows: this.formatAuthFlows(),
        EnableTokenRevocation: unwrap(this.props.enableTokenRevocation, false),
        GenerateSecret: unwrap(this.props.generateSecret, false),
        PreventUserExistenceErrors: unwrap(this.props.preventUserExistenceErrors, true) ? "ENABLED" : "LEGACY"
      }, this.attr("SupportedIdentityProviders", this.formatIdentityProviders())), this.attr("ReadAttributes", this.props.readAttributes)), this.attr("WriteAttributes", this.props.writeAttributes)), this.attr(
        "AuthSessionValidity",
        validity.authSession && (0, import_duration6.toMinutes)(unwrap(validity.authSession))
      )), this.attr("AccessTokenValidity", validity.accessToken && (0, import_duration6.toHours)(unwrap(validity.accessToken)))), this.attr("IdTokenValidity", validity.idToken && (0, import_duration6.toHours)(unwrap(validity.idToken)))), this.attr(
        "RefreshTokenValidity",
        validity.refreshToken && (0, import_duration6.toDays)(unwrap(validity.refreshToken))
      )), {
        TokenValidityUnits: __spreadValues(__spreadValues(__spreadValues({}, this.attr("AccessToken", validity.accessToken && "hours")), this.attr("IdToken", validity.idToken && "hours")), this.attr("RefreshToken", validity.refreshToken && "days"))
      })
    };
  }
};

// src/provider/aws/cognito/user-pool.ts
var import_duration7 = require("@awsless/duration");
var UserPool = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::Cognito::UserPool", id, props);
    this.props = props;
  }
  get id() {
    return this.output((v) => v.UserPoolId);
  }
  get arn() {
    return this.output((v) => v.Arn);
  }
  get providerName() {
    return this.output((v) => v.ProviderName);
  }
  get providerUrl() {
    return this.output((v) => v.ProviderURL);
  }
  // addDomain(props: Omit<UserPoolDomainProps, 'userPoolId'>) {
  // 	const domain = new UserPoolDomain(this.logicalId, {
  // 		...props,
  // 		userPoolId: this.id,
  // 	}).dependsOn(this)
  // 	this.addChild(domain)
  // 	return domain
  // }
  addClient(id, props) {
    const client = new UserPoolClient(id, __spreadProps(__spreadValues({}, props), {
      userPoolId: this.id
    }));
    this.add(client);
    return client;
  }
  toState() {
    var _a;
    const username = unwrap(this.props.username);
    const password = unwrap(this.props.password);
    const triggers = unwrap(this.props.triggers);
    return {
      document: __spreadProps(__spreadValues(__spreadProps(__spreadValues({
        UserPoolName: this.props.name,
        DeletionProtection: unwrap(this.props.deletionProtection) ? "ACTIVE" : "INACTIVE"
      }, unwrap(username == null ? void 0 : username.emailAlias) ? {
        AliasAttributes: ["email"],
        // UsernameAttributes: [ 'email' ],
        AutoVerifiedAttributes: ["email"],
        Schema: [
          {
            AttributeDataType: "String",
            Name: "email",
            Required: true,
            Mutable: false,
            StringAttributeConstraints: {
              MinLength: 5,
              MaxLength: 100
            }
          }
        ]
      } : {}), {
        UsernameConfiguration: {
          CaseSensitive: unwrap(username == null ? void 0 : username.caseSensitive, false)
        }
      }), this.attr("EmailConfiguration", (_a = unwrap(this.props.email)) == null ? void 0 : _a.toJSON())), {
        DeviceConfiguration: {
          DeviceOnlyRememberedOnUserPrompt: false
        },
        AdminCreateUserConfig: {
          AllowAdminCreateUserOnly: !unwrap(this.props.allowUserRegistration, true)
        },
        Policies: {
          PasswordPolicy: {
            MinimumLength: unwrap(password == null ? void 0 : password.minLength, 8),
            RequireUppercase: unwrap(password == null ? void 0 : password.uppercase, false),
            RequireLowercase: unwrap(password == null ? void 0 : password.lowercase, false),
            RequireNumbers: unwrap(password == null ? void 0 : password.numbers, false),
            RequireSymbols: unwrap(password == null ? void 0 : password.symbols, false),
            TemporaryPasswordValidityDays: (0, import_duration7.toDays)(
              unwrap(password == null ? void 0 : password.temporaryPasswordValidity, (0, import_duration7.days)(7))
            )
          }
        },
        LambdaConfig: __spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues(__spreadValues({}, this.attr("PreAuthentication", triggers == null ? void 0 : triggers.beforeLogin)), this.attr("PostAuthentication", triggers == null ? void 0 : triggers.afterLogin)), this.attr("PostConfirmation", triggers == null ? void 0 : triggers.afterRegister)), this.attr("PreSignUp", triggers == null ? void 0 : triggers.beforeRegister)), this.attr("PreTokenGeneration", triggers == null ? void 0 : triggers.beforeToken)), this.attr("CustomMessage", triggers == null ? void 0 : triggers.customMessage)), this.attr("UserMigration", triggers == null ? void 0 : triggers.userMigration)), this.attr("DefineAuthChallenge", triggers == null ? void 0 : triggers.defineChallange)), this.attr("CreateAuthChallenge", triggers == null ? void 0 : triggers.createChallange)), this.attr("VerifyAuthChallengeResponse", triggers == null ? void 0 : triggers.verifyChallange)), (triggers == null ? void 0 : triggers.emailSender) ? {
          CustomEmailSender: {
            LambdaArn: triggers.emailSender,
            LambdaVersion: "V1_0"
          }
        } : {})
      })
    };
  }
};
var UserPoolEmail = class _UserPoolEmail {
  constructor(props) {
    this.props = props;
  }
  static withSES(props) {
    return new _UserPoolEmail({
      type: "developer",
      replyTo: props.replyTo,
      from: props.fromName ? `${props.fromName} <${props.fromEmail}>` : props.fromEmail,
      sourceArn: props.sourceArn
    });
  }
  toJSON() {
    return __spreadValues(__spreadValues(__spreadValues(__spreadValues({}, this.props.type ? { EmailSendingAccount: (0, import_change_case9.constantCase)(this.props.type) } : {}), this.props.from ? { From: this.props.from } : {}), this.props.replyTo ? { ReplyToEmailAddress: this.props.replyTo } : {}), this.props.sourceArn ? { SourceArn: this.props.sourceArn } : {});
  }
};

// src/provider/aws/ses/email-identity.ts
var import_change_case10 = require("change-case");
var import_duration8 = require("@awsless/duration");
var EmailIdentity = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::SES::EmailIdentity", id, props);
    this.props = props;
  }
  getDnsToken(index) {
    return this.output((v) => ({
      name: v[`DkimDNSTokenName${index}`],
      value: v[`DkimDNSTokenValue${index}`]
    }));
  }
  // get fullDomain() {
  // 	return `${this.props.subDomain}.${this.props.domain}`
  // }
  // get verifiedForSendingStatus() {
  // 	return
  // }
  get dkimDnsTokens() {
    return [
      //
      this.getDnsToken(1),
      this.getDnsToken(2),
      this.getDnsToken(3)
    ];
  }
  dnsRecords(region2) {
    const ttl = (0, import_duration8.minutes)(5);
    return [
      ...this.dkimDnsTokens.map(
        (token) => token.apply((token2) => {
          const record = {
            name: token2.name,
            type: "CNAME",
            ttl,
            records: [token2.value]
          };
          return record;
        })
      ),
      {
        name: this.props.emailIdentity,
        type: "TXT",
        ttl,
        records: ['"v=spf1 include:amazonses.com -all"']
      },
      {
        name: this.props.emailIdentity,
        type: "MX",
        ttl,
        records: [`10 feedback-smtp.${region2}.amazonses.com.`]
      }
    ];
  }
  toState() {
    return {
      document: __spreadProps(__spreadValues(__spreadValues({
        EmailIdentity: this.props.emailIdentity
      }, this.props.configurationSetName ? {
        ConfigurationSetAttributes: {
          ConfigurationSetName: this.props.configurationSetName
        }
      } : {}), this.props.dkim ? {
        DkimAttributes: {
          SigningEnabled: true
        },
        DkimSigningAttributes: {
          NextSigningKeyLength: (0, import_change_case10.constantCase)(unwrap(this.props.dkim))
        }
      } : {}), {
        FeedbackAttributes: {
          EmailForwardingEnabled: unwrap(this.props.feedback, false)
        },
        MailFromAttributes: {
          MailFromDomain: this.props.mailFromDomain,
          BehaviorOnMxFailure: unwrap(this.props.rejectOnMxFailure, true) ? "REJECT_MESSAGE" : "USE_DEFAULT_VALUE"
        }
      })
    };
  }
};

// src/provider/aws/ses/configuration-set.ts
var ConfigurationSet = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::SES::ConfigurationSet", id, props);
    this.props = props;
  }
  get name() {
    return this.output((v) => v.Name);
  }
  toState() {
    return {
      document: {
        Name: this.props.name,
        VdmOptions: {
          DashboardOptions: {
            EngagementMetrics: unwrap(this.props.engagementMetrics, false) ? "ENABLED" : "DISABLED"
          }
        },
        ReputationOptions: {
          ReputationMetricsEnabled: unwrap(this.props.reputationMetrics, false)
        },
        SendingOptions: {
          SendingEnabled: unwrap(this.props.sending, true)
        }
      }
    };
  }
};

// src/provider/aws/cloud-front/distribution.ts
var import_duration9 = require("@awsless/duration");
var Distribution = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::CloudFront::Distribution", id, props);
    this.props = props;
  }
  // get id() {
  // 	return this.getAtt('Id')
  // }
  // get arn() {
  // 	return sub('arn:${AWS::Partition}:cloudfront::${AWS::AccountId}:distribution/${id}', {
  // 		id: this.id,
  // 	})
  // }
  // get domainName() {
  // 	return getAtt(this.logicalId, 'DomainName')
  // }
  get hostedZoneId() {
    return "Z2FDTNDATAQYW2";
  }
  toState() {
    var _a;
    return {
      document: {
        DistributionConfig: {
          Enabled: true,
          Aliases: unwrap(this.props.aliases, []),
          PriceClass: "PriceClass_" + unwrap(this.props.priceClass, "All"),
          HttpVersion: unwrap(this.props.httpVersion, "http2and3"),
          ViewerCertificate: this.props.certificateArn ? {
            SslSupportMethod: "sni-only",
            AcmCertificateArn: this.props.certificateArn
          } : {},
          Origins: unwrap(this.props.origins, []).map((v) => unwrap(v)).map((origin) => __spreadValues(__spreadValues(__spreadValues(__spreadValues({
            Id: origin.id,
            DomainName: origin.domainName,
            OriginCustomHeaders: Object.entries(unwrap(origin.headers, {})).map(
              ([name, value]) => ({
                HeaderName: name,
                HeaderValue: value
              })
            )
          }, origin.path ? {
            OriginPath: origin.path
          } : {}), origin.protocol ? {
            CustomOriginConfig: {
              OriginProtocolPolicy: origin.protocol
            }
          } : {}), origin.originAccessIdentityId ? {
            S3OriginConfig: {
              OriginAccessIdentity: `origin-access-identity/cloudfront/${unwrap(
                origin.originAccessIdentityId
              )}`
            }
          } : {}), origin.originAccessControlId ? {
            OriginAccessControlId: origin.originAccessControlId,
            S3OriginConfig: {
              OriginAccessIdentity: ""
            }
          } : {})),
          OriginGroups: {
            Quantity: (_a = unwrap(this.props.originGroups, []).length) != null ? _a : 0,
            Items: unwrap(this.props.originGroups, []).map((v) => unwrap(v)).map((originGroup) => ({
              Id: originGroup.id,
              Members: {
                Quantity: unwrap(originGroup.members).length,
                Items: unwrap(originGroup.members).map((member) => ({
                  OriginId: member
                }))
              },
              FailoverCriteria: {
                StatusCodes: {
                  Quantity: unwrap(originGroup.statusCodes).length,
                  Items: originGroup.statusCodes
                }
              }
            }))
          },
          CustomErrorResponses: unwrap(this.props.customErrorResponses, []).map((v) => unwrap(v)).map((item) => __spreadValues(__spreadValues(__spreadValues({
            ErrorCode: item.errorCode
          }, this.attr(
            "ErrorCachingMinTTL",
            item.cacheMinTTL && (0, import_duration9.toSeconds)(unwrap(item.cacheMinTTL))
          )), this.attr("ResponseCode", item.responseCode)), this.attr("ResponsePagePath", item.responsePath))),
          DefaultCacheBehavior: __spreadValues(__spreadValues(__spreadValues({
            TargetOriginId: this.props.targetOriginId,
            ViewerProtocolPolicy: unwrap(this.props.viewerProtocol, "redirect-to-https"),
            AllowedMethods: unwrap(this.props.allowMethod, ["GET", "HEAD", "OPTIONS"]),
            Compress: unwrap(this.props.compress, false),
            FunctionAssociations: unwrap(this.props.associations, []).map((v) => unwrap(v)).map((association) => ({
              EventType: association.type,
              FunctionARN: association.functionArn
            })),
            LambdaFunctionAssociations: unwrap(this.props.lambdaAssociations, []).map((v) => unwrap(v)).map((association) => ({
              EventType: association.type,
              IncludeBody: unwrap(association.includeBody, false),
              FunctionARN: association.functionArn
            }))
          }, this.attr("CachePolicyId", this.props.cachePolicyId)), this.attr("OriginRequestPolicyId", this.props.originRequestPolicyId)), this.attr("ResponseHeadersPolicyId", this.props.responseHeadersPolicyId))
        },
        Tags: [{ Key: "Name", Value: this.props.name }]
      }
    };
  }
};

// src/provider/aws/acm/certificate-validation.ts
var CertificateValidation = class extends Resource {
  constructor(id, props) {
    super("AWS::CertificateManager::CertificateValidation", id, props);
    this.props = props;
    this.cloudProviderId = "aws-acm-certificate-validation";
  }
  get arn() {
    return this.output((v) => v.CertificateArn);
  }
  // get issuer() {
  // 	return this.output<string>(v => v.Issuer)
  // }
  toState() {
    return {
      document: {
        CertificateArn: this.props.certificateArn
      }
    };
  }
};

// src/provider/aws/acm/certificate.ts
var Certificate = class extends Resource {
  constructor(id, props) {
    super("AWS::CertificateManager::Certificate", id, props);
    this.props = props;
    this.cloudProviderId = "aws-acm-certificate";
  }
  get arn() {
    return this.output((v) => v.CertificateArn);
  }
  get issuer() {
    return this.output((v) => v.Issuer);
  }
  get issuedArn() {
    if (!this.validation) {
      this.validation = new CertificateValidation("validation", {
        certificateArn: this.arn
      });
      this.add(this.validation);
    }
    return this.validation.arn;
  }
  toState() {
    return {
      extra: {
        region: this.props.region
      },
      document: __spreadValues(__spreadProps(__spreadValues({
        DomainName: this.props.domainName
      }, this.props.alternativeNames ? {
        SubjectAlternativeNames: unwrap(this.props.alternativeNames, [])
      } : {}), {
        ValidationMethod: unwrap(this.props.validationMethod, "dns").toUpperCase(),
        KeyAlgorithm: this.props.keyAlgorithm
      }), this.props.validationOptions ? {
        DomainValidationOptions: unwrap(this.props.validationOptions).map((v) => unwrap(v)).map((options) => ({
          DomainName: options.domainName,
          ValidationDomain: options.validationDomain
          // HostedZoneId: options.hostedZoneId,
        }))
      } : {})
    };
  }
};

// src/provider/aws/index.ts
var aws = {
  createCloudProviders,
  cloudControlApi: {
    Provider: CloudControlApiProvider
  },
  cloudWatch: {
    LogGroup
  },
  cloudFront: {
    Distribution
  },
  acm: {
    Certificate,
    CertificateValidation
  },
  s3: {
    Bucket,
    BucketPolicy,
    BucketObject,
    BucketObjectProvider,
    StateProvider
  },
  dynamodb: {
    Table,
    TableItem,
    TableItemProvider
  },
  sqs: {
    Queue
  },
  sns: {
    Topic,
    Subscription
  },
  lambda: {
    Permission,
    Function,
    Url
  },
  iam: {
    Role,
    RolePolicy
  },
  iot: {
    TopicRule
  },
  events: {
    Rule
  },
  openSearchServerless: {
    Collection
  },
  route53: {
    HostedZone,
    RecordSet
    // RecordSetGroup,
  },
  memorydb: {
    Cluster,
    SubnetGroup
  },
  cognito: {
    UserPool,
    UserPoolEmail,
    // UserPoolDomain,
    UserPoolClient
  },
  ec2: {
    Peer,
    Port,
    SecurityGroup,
    SecurityGroupRule,
    Vpc,
    Route,
    RouteTable,
    InternetGateway,
    VPCGatewayAttachment,
    Subnet,
    SubnetRouteTableAssociation
  },
  ses: {
    EmailIdentity,
    ConfigurationSet
  }
};

// src/example.ts
var region = "eu-west-1";
var credentials = (0, import_credential_providers.fromIni)({
  profile: "jacksclub"
});
var workspace = new WorkSpace({
  cloudProviders: aws.createCloudProviders({ region, credentials }),
  stateProvider: new LocalStateProvider({
    dir: "./state"
  })
});
workspace.on(
  "stack",
  (e) => console.log(
    //
    /* @__PURE__ */ new Date(),
    "[Stack]".padEnd(30),
    // e.stack.name,
    e.operation.toUpperCase(),
    e.status.toUpperCase()
  )
);
workspace.on(
  "resource",
  (e) => {
    var _a, _b;
    return console.log(
      //
      /* @__PURE__ */ new Date(),
      `[${e.type}]`.padEnd(30),
      e.operation.toUpperCase(),
      e.status.toUpperCase(),
      (_b = (_a = e.reason) == null ? void 0 : _a.message) != null ? _b : ""
    );
  }
);
var app = new App("test");
var stack = new Stack("test");
app.add(stack);
var bucket = new aws.s3.Bucket("test", {
  name: "awsless-formation-test",
  versioning: true,
  forceDelete: true
});
stack.add(bucket);
var role = new aws.iam.Role("test", {
  assumedBy: "lambda.amazonaws.com"
});
stack.add(role);
var lambda = new aws.lambda.Function("test", {
  name: "awsless-formation-test",
  description: "Test",
  // code,
  code: {
    zipFile: `exports.default = function(){ return Promise.resolve({ statusCode: 200, body: 'HELLO' }) }`
  },
  role: role.arn,
  log: {
    format: "json",
    level: "error",
    system: "warn"
  },
  environment: {
    TEST: "1"
  }
});
var url = lambda.enableUrlAccess();
stack.add(lambda);
var hostedZone = new aws.route53.HostedZone("test", {
  name: "mycustomdomain123.com"
});
stack.add(hostedZone);
var certificate = new aws.acm.Certificate("test", {
  region: "us-east-1",
  domainName: "example.com",
  validationOptions: [
    {
      domainName: "example.com",
      validationDomain: "example.com"
    }
  ]
});
stack.add(certificate);
var main = () => __async(void 0, null, function* () {
  yield workspace.deployStack(stack);
});
main();
