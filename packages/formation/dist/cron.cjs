var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all2) => {
  for (var name in all2)
    __defProp(target, name, { get: all2[name], enumerable: true });
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

// examples/resources/cron.ts
var import_credential_providers = require("@aws-sdk/credential-providers");

// src/core/node.ts
var Node = class {
  constructor(type, identifier) {
    this.type = type;
    this.identifier = identifier;
  }
  childs = /* @__PURE__ */ new Set();
  parental;
  get urn() {
    return `${this.parental ? this.parental.urn : "urn"}:${this.type}:{${this.identifier}}`;
  }
  get parent() {
    return this.parental;
  }
  get children() {
    return this.childs;
  }
  add(...nodes) {
    for (const node of nodes) {
      if (node.parental) {
        throw new Error(`Node already has a parent: ${node.urn}`);
      }
      node.parental = this;
      for (const child of this.childs) {
        if (child.urn === node.urn) {
          throw new Error(`Duplicate nodes detected: ${node.urn}`);
        }
      }
      this.childs.add(node);
    }
  }
};
var flatten = (node) => {
  const list = [node];
  for (const child of node.children) {
    list.push(...flatten(child));
  }
  return list;
};

// src/core/resource.ts
var Resource = class extends Node {
  constructor(type, identifier, inputs) {
    super(type, identifier);
    this.type = type;
    this.identifier = identifier;
    if (inputs) {
      this.registerDependency(inputs);
    }
  }
  remoteDocument;
  listeners = /* @__PURE__ */ new Set();
  dependencies = /* @__PURE__ */ new Set();
  deletionPolicy = "before-deployment";
  // set deletionPolicy(policy: ResourceDeletionPolicy) {
  // 	this.resourcePolicies?.deletionPolicy policy
  // }
  // get deletionPolicy() {
  // 	return this.resourcePolicies?.deletionPolicy ?? 'before-deployment'
  // }
  dependsOn(...resources) {
    for (const resource of resources) {
      this.dependencies.add(resource);
    }
    return this;
  }
  registerDependency(props) {
    this.dependsOn(...findResources(props));
  }
  setRemoteDocument(remoteDocument) {
    for (const listener of this.listeners) {
      listener(remoteDocument);
    }
    this.listeners.clear();
    this.remoteDocument = remoteDocument;
  }
  output(getter) {
    return new Output([this], (resolve) => {
      if (this.remoteDocument) {
        resolve(getter(this.remoteDocument));
      } else {
        this.listeners.add((remoteDocument) => {
          resolve(getter(remoteDocument));
        });
      }
    });
  }
  attr(name, input, transform) {
    const value = unwrap(input);
    if (typeof value === "undefined") {
      return {};
    }
    return {
      [name]: transform ? transform(value) : value
    };
  }
};

// src/core/output.ts
var Output = class _Output {
  constructor(resources, cb) {
    this.resources = resources;
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
  // protected resources = new Set<Resource>()
  // protected deps = new Set<Resource>()
  listeners = /* @__PURE__ */ new Set();
  value;
  resolved = false;
  apply(cb) {
    return new _Output(this.resources, (resolve) => {
      if (!this.resolved) {
        this.listeners.add((value) => {
          resolve(cb(value));
        });
      } else {
        cb(this.value);
      }
    });
  }
  valueOf() {
    if (!this.resolved) {
      throw new TypeError(`Output hasn't been resolved yet.`);
    }
    return this.value;
  }
};
var findResources = (props) => {
  const resources = [];
  const find = (props2) => {
    if (props2 instanceof Output) {
      resources.push(...props2.resources);
    } else if (props2 instanceof Resource) {
      resources.push(props2);
    } else if (Array.isArray(props2)) {
      props2.map(find);
    } else if (props2?.constructor === Object) {
      Object.values(props2).map(find);
    }
  };
  find(props);
  return resources;
};
var all = (inputs) => {
  return new Output(findResources(inputs), (resolve) => {
    let count = inputs.length;
    const done = () => {
      if (--count === 0) {
        resolve(inputs.map(unwrap));
      }
    };
    for (const input of inputs) {
      if (input instanceof Output) {
        input.apply(done);
      } else {
        done();
      }
    }
  });
};
function unwrap(input, defaultValue) {
  if (typeof input === "undefined") {
    return defaultValue;
  }
  if (input instanceof Output) {
    return input.valueOf();
  }
  return input;
}

// src/core/error.ts
var ResourceError = class _ResourceError extends Error {
  constructor(urn, type, operation, message) {
    super(message);
    this.urn = urn;
    this.type = type;
    this.operation = operation;
  }
  static wrap(urn, type, operation, error) {
    if (error instanceof Error) {
      return new _ResourceError(urn, type, operation, error.message);
    }
    return new _ResourceError(urn, type, operation, "Unknown Error");
  }
};
var StackError = class extends Error {
  constructor(issues, message) {
    super(message);
    this.issues = issues;
  }
};
var ResourceNotFound = class extends Error {
};
var ImportValueNotFound = class extends Error {
  constructor(stack2, key) {
    super(`Import value "${key}" doesn't exist for the "${stack2}" stack`);
  }
};

// src/core/stack.ts
var Stack = class extends Node {
  constructor(name) {
    super("Stack", name);
    this.name = name;
  }
  exported = {};
  get resources() {
    return flatten(this).filter((node) => node instanceof Resource);
  }
  export(key, value) {
    this.exported[key] = value;
    return this;
  }
  import(key) {
    if (key in this.exported) {
      return this.exported[key];
    }
    throw new ImportValueNotFound(this.name, key);
  }
};

// src/core/app.ts
var App = class extends Node {
  constructor(name) {
    super("App", name);
    this.name = name;
  }
  exported;
  listeners = /* @__PURE__ */ new Set();
  get stacks() {
    return this.children;
  }
  add(stack2) {
    if (stack2 instanceof Stack) {
      return super.add(stack2);
    }
    throw new TypeError("You can only add stacks to an app");
  }
  import(stack2, key) {
    return new Output([], (resolve) => {
      const get = (data) => {
        if (typeof data[stack2]?.[key] !== "undefined") {
          resolve(data[stack2][key]);
          this.listeners.delete(get);
        }
      };
      if (this.exported) {
        get(this.exported);
      } else {
        this.listeners.add(get);
      }
    });
  }
  setExportedData(data) {
    for (const listener of this.listeners) {
      listener(data);
    }
    this.exported = data;
  }
};

// src/core/workspace.ts
var import_events = __toESM(require("events"), 1);
var import_promise_dag = require("promise-dag");
var WorkSpace = class extends import_events.default {
  constructor(props) {
    super();
    this.props = props;
  }
  getCloudProvider(providerId, urn) {
    for (const provider of this.props.cloudProviders) {
      if (provider.own(providerId)) {
        return provider;
      }
    }
    throw new TypeError(`Can't find the "${providerId}" cloud provider for: ${urn}`);
  }
  unwrapDocument(urn, document, safe = true) {
    const replacer = (_, value) => {
      if (value instanceof Output) {
        if (safe) {
          return value.valueOf();
        } else {
          try {
            return value.valueOf();
          } catch (e) {
            return "[UnresolvedOutput]";
          }
        }
      }
      if (typeof value === "bigint") {
        return Number(value);
      }
      return value;
    };
    try {
      return this.copy(document, replacer);
    } catch (error) {
      if (error instanceof TypeError) {
        throw new TypeError(`Resource has unresolved inputs: ${urn}`);
      }
      throw error;
    }
  }
  async lockedOperation(urn, fn) {
    let release;
    try {
      release = await this.props.stateProvider.lock(urn);
    } catch (error) {
      throw new Error(`Already in progress: ${urn}`);
    }
    let result;
    try {
      result = await fn();
    } catch (error) {
      throw error;
    } finally {
      await release();
    }
    return result;
  }
  async resolveAssets(assets) {
    const resolved = {};
    const hashes = {};
    await Promise.all(
      Object.entries(assets).map(async ([name, asset]) => {
        const data = await unwrap(asset).load();
        const buff = await crypto.subtle.digest("SHA-256", data);
        const hash = Buffer.from(buff).toString("hex");
        hashes[name] = hash;
        resolved[name] = {
          data,
          hash
        };
      })
    );
    return [resolved, hashes];
  }
  copy(document, replacer) {
    return JSON.parse(JSON.stringify(document, replacer));
  }
  compare(left, right) {
    const replacer = (_, value) => {
      if (value !== null && value instanceof Object && !Array.isArray(value)) {
        return Object.keys(value).sort().reduce((sorted, key) => {
          sorted[key] = value[key];
          return sorted;
        }, {});
      }
      return value;
    };
    const l = JSON.stringify(left, replacer);
    const r = JSON.stringify(right, replacer);
    return l === r;
  }
  resolveDocumentAssets(document, assets) {
    if (document !== null && typeof document === "object") {
      for (const [key, value] of Object.entries(document)) {
        if (value !== null && typeof value === "object" && "__ASSET__" in value && typeof value.__ASSET__ === "string") {
          document[key] = assets[value.__ASSET__]?.data.toString("utf8");
        } else {
          this.resolveDocumentAssets(value, assets);
        }
      }
    } else if (Array.isArray(document)) {
      for (const value of document) {
        this.resolveDocumentAssets(value, assets);
      }
    }
    return document;
  }
  getExportedData(appState) {
    const data = {};
    for (const stackData of Object.values(appState)) {
      data[stackData.name] = stackData.exports;
    }
    return data;
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
  async diffStack(stack2) {
    const app2 = stack2.parent;
    if (!app2 || !(app2 instanceof App)) {
      throw new StackError([], "Stack must belong to an App");
    }
    const appState = await this.props.stateProvider.get(app2.urn);
    const stackState = appState[stack2.urn] = appState[stack2.urn] ?? {
      name: stack2.name,
      exports: {},
      resources: {}
    };
    const resources = stack2.resources;
    const creates = [];
    const updates = [];
    const deletes = [];
    for (const resource of resources) {
      const resourceState = stackState.resources[resource.urn];
      if (resourceState) {
        resource.setRemoteDocument(resourceState.remote);
      }
    }
    for (const urn of Object.keys(stackState.resources)) {
      const resource = resources.find((r) => r.urn === urn);
      if (!resource) {
        deletes.push(urn);
      }
    }
    for (const resource of resources) {
      const resourceState = stackState.resources[resource.urn];
      if (resourceState) {
        const state = resource.toState();
        const [_, assetHashes] = await this.resolveAssets(state.assets ?? {});
        const document = this.unwrapDocument(resource.urn, state.document ?? {}, false);
        if (!this.compare(
          //
          [resourceState.local, resourceState.assets],
          [document, assetHashes]
        )) {
          updates.push(resource.urn);
        }
      } else {
        creates.push(resource.urn);
      }
    }
    return {
      creates,
      updates,
      deletes
    };
  }
  async deployStack(stack2) {
    const app2 = stack2.parent;
    if (!app2 || !(app2 instanceof App)) {
      throw new StackError([], "Stack must belong to an App");
    }
    return this.lockedOperation(app2.urn, async () => {
      const appState = await this.props.stateProvider.get(app2.urn);
      const stackState = appState[stack2.urn] = appState[stack2.urn] ?? {
        name: stack2.name,
        exports: {},
        resources: {}
      };
      const resources = stack2.resources;
      app2.setExportedData(this.getExportedData(appState));
      this.emit("stack", {
        urn: stack2.urn,
        operation: "deploy",
        status: "in-progress",
        stack: stack2
      });
      const deleteResourcesBefore = {};
      const deleteResourcesAfter = {};
      for (const [urnStr, state] of Object.entries(stackState.resources)) {
        const urn = urnStr;
        const resource = resources.find((r) => r.urn === urn);
        if (!resource) {
          if (state.policies.deletion === "before-deployment") {
            deleteResourcesBefore[urn] = state;
          }
          if (state.policies.deletion === "after-deployment") {
            deleteResourcesAfter[urn] = state;
          }
        }
      }
      try {
        if (Object.keys(deleteResourcesBefore).length > 0) {
          await this.deleteStackResources(app2.urn, appState, stackState, deleteResourcesBefore);
        }
        await this.deployStackResources(app2.urn, appState, stackState, resources);
        if (Object.keys(deleteResourcesAfter).length > 0) {
          await this.deleteStackResources(app2.urn, appState, stackState, deleteResourcesAfter);
        }
      } catch (error) {
        this.emit("stack", {
          urn: stack2.urn,
          operation: "deploy",
          status: "error",
          stack: stack2,
          reason: error
        });
        throw error;
      }
      stackState.exports = this.unwrapDocument(stack2.urn, stack2.exported);
      await this.props.stateProvider.update(app2.urn, appState);
      this.emit("stack", {
        urn: stack2.urn,
        operation: "deploy",
        status: "success",
        stack: stack2
      });
      return stackState;
    });
  }
  async deleteStack(stack2) {
    const app2 = stack2.parent;
    if (!app2 || !(app2 instanceof App)) {
      throw new StackError([], "Stack must belong to an App");
    }
    return this.lockedOperation(app2.urn, async () => {
      const appState = await this.props.stateProvider.get(app2.urn);
      const stackState = appState[stack2.urn];
      if (!stackState) {
        throw new StackError([], `Stack already deleted: ${stack2.name}`);
      }
      this.emit("stack", {
        urn: stack2.urn,
        operation: "delete",
        status: "in-progress",
        stack: stack2
      });
      try {
        await this.deleteStackResources(app2.urn, appState, stackState, stackState.resources);
      } catch (error) {
        this.emit("stack", {
          urn: stack2.urn,
          operation: "delete",
          status: "error",
          stack: stack2,
          reason: error
        });
        throw error;
      }
      delete appState[stack2.urn];
      await this.props.stateProvider.update(app2.urn, appState);
      this.emit("stack", {
        urn: stack2.urn,
        operation: "delete",
        status: "success",
        stack: stack2
      });
    });
  }
  async deployStackResources(appUrn, appState, stackState, resources) {
    await this.healFromUnknownRemoteState(stackState);
    const deployGraph = {};
    for (const resource of resources) {
      const provider = this.getCloudProvider(resource.cloudProviderId, resource.urn);
      deployGraph[resource.urn] = [
        ...[...resource.dependencies].map((dep) => dep.urn),
        async () => {
          const state = resource.toState();
          const [assets, assetHashes] = await this.resolveAssets(state.assets ?? {});
          const document = this.unwrapDocument(resource.urn, state.document ?? {});
          const extra = this.unwrapDocument(resource.urn, state.extra ?? {});
          let resourceState = stackState.resources[resource.urn];
          if (!resourceState) {
            this.emit("resource", {
              urn: resource.urn,
              type: resource.type,
              operation: "create",
              status: "in-progress"
            });
            let id;
            try {
              id = await provider.create({
                urn: resource.urn,
                type: resource.type,
                document: this.resolveDocumentAssets(this.copy(document), assets),
                assets,
                extra
              });
            } catch (error) {
              const resourceError = ResourceError.wrap(resource.urn, resource.type, "create", error);
              this.emit("resource", {
                urn: resource.urn,
                type: resource.type,
                operation: "create",
                status: "error",
                reason: resourceError
              });
              throw resourceError;
            }
            resourceState = stackState.resources[resource.urn] = {
              id,
              type: resource.type,
              provider: resource.cloudProviderId,
              local: document,
              assets: assetHashes,
              dependencies: [...resource.dependencies].map((d) => d.urn),
              extra,
              policies: {
                deletion: resource.deletionPolicy
              }
              // deletionPolicy: unwrap(state.deletionPolicy),
            };
            const remote = await provider.get({
              urn: resource.urn,
              id,
              type: resource.type,
              document,
              extra
            });
            resourceState.remote = remote;
            this.emit("resource", {
              urn: resource.urn,
              type: resource.type,
              operation: "create",
              status: "success"
            });
          } else if (
            // Check if any state has changed
            !this.compare(
              //
              [resourceState.local, resourceState.assets],
              [document, assetHashes]
            )
          ) {
            this.emit("resource", {
              urn: resource.urn,
              type: resource.type,
              operation: "update",
              status: "in-progress"
            });
            let id;
            try {
              id = await provider.update({
                urn: resource.urn,
                id: resourceState.id,
                type: resource.type,
                remoteDocument: this.resolveDocumentAssets(
                  this.copy(resourceState.remote),
                  assets
                ),
                oldDocument: this.resolveDocumentAssets(this.copy(resourceState.local), assets),
                newDocument: document,
                assets,
                extra
              });
            } catch (error) {
              const resourceError = ResourceError.wrap(resource.urn, resource.type, "update", error);
              this.emit("resource", {
                urn: resource.urn,
                type: resource.type,
                operation: "update",
                status: "error",
                reason: resourceError
              });
              throw resourceError;
            }
            resourceState.id = id;
            resourceState.local = document;
            resourceState.assets = assetHashes;
            const remote = await provider.get({
              urn: resource.urn,
              id: resourceState.id,
              type: resource.type,
              document,
              extra
            });
            resourceState.remote = remote;
            this.emit("resource", {
              urn: resource.urn,
              type: resource.type,
              operation: "update",
              status: "success"
            });
          }
          resourceState.extra = extra;
          resourceState.dependencies = [...resource.dependencies].map((d) => d.urn);
          resourceState.policies.deletion = resource.deletionPolicy;
          resource.setRemoteDocument(resourceState.remote);
        }
      ];
    }
    const results = await Promise.allSettled(Object.values((0, import_promise_dag.run)(deployGraph)));
    await this.props.stateProvider.update(appUrn, appState);
    const errors = results.filter((r) => r.status === "rejected").map((r) => r.reason);
    if (errors.length > 0) {
      throw new StackError(errors, "Deploying resources failed.");
    }
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
  async deleteStackResources(appUrn, appState, stackState, resources) {
    const deleteGraph = {};
    for (const [urnStr, state] of Object.entries(resources)) {
      const urn = urnStr;
      const provider = this.getCloudProvider(state.provider, urn);
      deleteGraph[urn] = [
        ...this.dependentsOn(resources, urn),
        async () => {
          this.emit("resource", {
            urn,
            type: state.type,
            operation: "delete",
            status: "in-progress"
          });
          try {
            await provider.delete({
              urn,
              id: state.id,
              type: state.type,
              document: state.local,
              assets: state.assets,
              extra: state.extra
            });
          } catch (error) {
            if (error instanceof ResourceNotFound) {
            } else {
              const resourceError = ResourceError.wrap(urn, state.type, "delete", error);
              this.emit("resource", {
                urn,
                type: state.type,
                operation: "delete",
                status: "error",
                reason: resourceError
              });
              throw resourceError;
            }
          }
          delete stackState.resources[urn];
          this.emit("resource", {
            urn,
            type: state.type,
            operation: "delete",
            status: "success"
          });
        }
      ];
    }
    const results = await Promise.allSettled(Object.values((0, import_promise_dag.run)(deleteGraph)));
    await this.props.stateProvider.update(appUrn, appState);
    const errors = results.filter((r) => r.status === "rejected").map((r) => r.reason);
    if (errors.length > 0) {
      throw new StackError(errors, "Deleting resources failed.");
    }
  }
  async healFromUnknownRemoteState(stackState) {
    const results = await Promise.allSettled(
      Object.entries(stackState.resources).map(async ([urnStr, resourceState]) => {
        const urn = urnStr;
        if (typeof resourceState.remote === "undefined") {
          const provider = this.getCloudProvider(resourceState.provider, urn);
          const remote = await provider.get({
            urn,
            id: resourceState.id,
            type: resourceState.type,
            document: resourceState.local,
            extra: resourceState.extra
          });
          if (typeof remote === "undefined") {
            const resourceError = new ResourceError(
              urn,
              resourceState.type,
              "heal",
              `Fetching remote state returned undefined`
            );
            this.emit("resource", {
              urn,
              type: resourceState.type,
              operation: "heal",
              status: "error",
              reason: resourceError
            });
            throw resourceError;
          }
          resourceState.remote = remote;
        }
      })
    );
    const errors = results.filter((r) => r.status === "rejected").map((r) => r.reason);
    if (errors.length > 0) {
      throw new StackError(errors, "Healing remote state failed.");
    }
  }
};

// src/provider/aws/index.ts
var aws_exports = {};
__export(aws_exports, {
  acm: () => acm_exports,
  appsync: () => appsync_exports,
  cloudControlApi: () => cloud_control_api_exports,
  cloudFront: () => cloud_front_exports,
  cloudWatch: () => cloud_watch_exports,
  cognito: () => cognito_exports,
  createCloudProviders: () => createCloudProviders,
  dynamodb: () => dynamodb_exports,
  ec2: () => ec2_exports,
  events: () => events_exports,
  iam: () => iam_exports,
  iot: () => iot_exports,
  lambda: () => lambda_exports,
  memorydb: () => memorydb_exports,
  openSearchServerless: () => open_search_serverless_exports,
  route53: () => route53_exports,
  s3: () => s3_exports,
  ses: () => ses_exports,
  sns: () => sns_exports,
  sqs: () => sqs_exports
});

// src/provider/aws/acm/index.ts
var acm_exports = {};
__export(acm_exports, {
  Certificate: () => Certificate,
  CertificateProvider: () => CertificateProvider,
  CertificateValidation: () => CertificateValidation,
  CertificateValidationProvider: () => CertificateValidationProvider
});

// src/provider/aws/acm/certificate-provider.ts
var import_client_acm = require("@aws-sdk/client-acm");

// src/core/hash.ts
var import_crypto = require("crypto");
var sha256 = (data) => {
  return (0, import_crypto.createHash)("sha256").update(JSON.stringify(data)).digest("hex");
};
var sleep = (delay) => {
  return new Promise((r) => setTimeout(r, delay));
};

// src/provider/aws/acm/certificate-provider.ts
var CertificateProvider = class {
  constructor(props) {
    this.props = props;
  }
  clients = {};
  own(id) {
    return id === "aws-acm-certificate";
  }
  wait(delay) {
    return new Promise((r) => setTimeout(r, delay));
  }
  client(region2 = this.props.region) {
    if (!this.clients[region2]) {
      this.clients[region2] = new import_client_acm.ACMClient({
        ...this.props,
        region: region2
      });
    }
    return this.clients[region2];
  }
  async get({ id, extra }) {
    const client = this.client(extra.region);
    while (true) {
      const result = await client.send(
        new import_client_acm.DescribeCertificateCommand({
          CertificateArn: id
        })
      );
      if (result.Certificate?.DomainValidationOptions?.at(0)?.ResourceRecord) {
        return result.Certificate;
      }
      await this.wait(5e3);
    }
  }
  async create({ urn, document, extra }) {
    const token = sha256(urn).substring(0, 32);
    const result = await this.client(extra.region).send(
      new import_client_acm.RequestCertificateCommand({
        IdempotencyToken: token,
        ...document
      })
    );
    return result.CertificateArn;
  }
  async update() {
    throw new Error(`Certificate can't be changed`);
    return "";
  }
  async delete({ id, extra }) {
    try {
      await this.client(extra.region).send(
        new import_client_acm.DeleteCertificateCommand({
          CertificateArn: id
        })
      );
    } catch (error) {
      if (error instanceof import_client_acm.ResourceNotFoundException) {
        throw new ResourceNotFound(error.message);
      }
      throw error;
    }
  }
};

// src/provider/aws/acm/certificate-validation-provider.ts
var import_client_acm2 = require("@aws-sdk/client-acm");
var CertificateValidationProvider = class {
  constructor(props) {
    this.props = props;
  }
  clients = {};
  own(id) {
    return id === "aws-acm-certificate-validation";
  }
  client(region2 = this.props.region) {
    if (!this.clients[region2]) {
      this.clients[region2] = new import_client_acm2.ACMClient({
        ...this.props,
        region: region2
      });
    }
    return this.clients[region2];
  }
  wait(delay) {
    return new Promise((r) => setTimeout(r, delay));
  }
  async get({ id, extra }) {
    const client = this.client(extra.region);
    while (true) {
      const result = await client.send(
        new import_client_acm2.DescribeCertificateCommand({
          CertificateArn: id
        })
      );
      switch (result.Certificate?.Status) {
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
          return result.Certificate;
      }
      await this.wait(5e3);
    }
  }
  async create({ document }) {
    return document.CertificateArn;
  }
  async update({ newDocument }) {
    return newDocument.CertificateArn;
  }
  async delete() {
  }
};

// src/provider/aws/acm/certificate-validation.ts
var CertificateValidation = class extends Resource {
  constructor(id, props) {
    super("AWS::CertificateManager::CertificateValidation", id, props);
    this.props = props;
    this.deletionPolicy = "retain";
  }
  cloudProviderId = "aws-acm-certificate-validation";
  get arn() {
    return this.output((v) => v.CertificateArn);
  }
  toState() {
    return {
      extra: {
        region: this.props.region
      },
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
    this.deletionPolicy = "after-deployment";
  }
  cloudProviderId = "aws-acm-certificate";
  validation;
  get arn() {
    return this.output((v) => v.CertificateArn);
  }
  get issuer() {
    return this.output((v) => v.Issuer);
  }
  validationRecord(index) {
    return this.output((v) => {
      const record = v.DomainValidationOptions.at(index).ResourceRecord;
      return {
        name: record.Name,
        type: record.Type,
        records: [record.Value]
      };
    });
  }
  get validationRecords() {
    return this.output(
      (v) => v.DomainValidationOptions.map((opt) => {
        const record = opt.ResourceRecord;
        return {
          name: record.Name,
          type: record.Type,
          records: [record.Value]
        };
      })
    );
  }
  get issuedArn() {
    if (!this.validation) {
      this.validation = new CertificateValidation("validation", {
        certificateArn: this.arn,
        region: this.props.region
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
      document: {
        DomainName: this.props.domainName,
        ...this.props.alternativeNames ? {
          SubjectAlternativeNames: unwrap(this.props.alternativeNames, [])
        } : {},
        ValidationMethod: unwrap(this.props.validationMethod, "dns").toUpperCase(),
        KeyAlgorithm: unwrap(this.props.keyAlgorithm, "RSA_2048"),
        ...this.props.validationOptions ? {
          DomainValidationOptions: unwrap(this.props.validationOptions).map((v) => unwrap(v)).map((options) => ({
            DomainName: options.domainName,
            ValidationDomain: options.validationDomain
            // HostedZoneId: options.hostedZoneId,
            // HostedZoneId: 'Z0157889170MJQ0XTIRZD',
          }))
        } : {}
      }
    };
  }
};

// src/provider/aws/appsync/index.ts
var appsync_exports = {};
__export(appsync_exports, {
  DataSource: () => DataSource,
  DataSourceProvider: () => DataSourceProvider,
  DomainName: () => DomainName,
  DomainNameApiAssociation: () => DomainNameApiAssociation,
  FunctionConfiguration: () => FunctionConfiguration,
  GraphQLApi: () => GraphQLApi,
  GraphQLApiProvider: () => GraphQLApiProvider,
  GraphQLSchema: () => GraphQLSchema,
  GraphQLSchemaProvider: () => GraphQLSchemaProvider,
  Resolver: () => Resolver,
  SourceApiAssociation: () => SourceApiAssociation
});

// src/provider/aws/appsync/data-source-provider.ts
var import_client_appsync = require("@aws-sdk/client-appsync");
var DataSourceProvider = class {
  client;
  constructor(props) {
    this.client = new import_client_appsync.AppSyncClient(props);
  }
  own(id) {
    return id === "aws-appsync-data-source";
  }
  async get({ document }) {
    const result = await this.client.send(
      new import_client_appsync.GetDataSourceCommand({
        apiId: document.apiId,
        name: document.name
      })
    );
    return result.dataSource;
  }
  async create({ document }) {
    await this.client.send(new import_client_appsync.CreateDataSourceCommand(document));
    return JSON.stringify([document.apiId, document.name]);
  }
  async update({ id, oldDocument, newDocument }) {
    if (oldDocument.apiId !== newDocument.apiId) {
      throw new Error(`DataSource can't update apiId`);
    }
    if (oldDocument.name !== newDocument.name) {
      throw new Error(`DataSource can't update name`);
    }
    await this.client.send(new import_client_appsync.UpdateDataSourceCommand(newDocument));
    return id;
  }
  async delete({ document }) {
    try {
      await this.client.send(
        new import_client_appsync.DeleteDataSourceCommand({
          apiId: document.apiId,
          name: document.name
        })
      );
    } catch (error) {
      if (error instanceof import_client_appsync.NotFoundException) {
        throw new ResourceNotFound(error.message);
      }
      throw error;
    }
  }
};

// src/provider/aws/appsync/data-source.ts
var DataSource = class extends Resource {
  constructor(id, props) {
    super("AWS::AppSync::DataSource", id, props);
    this.props = props;
  }
  cloudProviderId = "aws-appsync-data-source";
  get arn() {
    return this.output((v) => v.dataSourceArn);
  }
  get name() {
    return this.output((v) => v.name);
  }
  toState() {
    return {
      document: {
        apiId: this.props.apiId,
        name: this.props.name,
        ...this.props.type === "none" ? {
          type: "NONE"
        } : {},
        ...this.props.type === "lambda" ? {
          type: "AWS_LAMBDA",
          serviceRoleArn: this.props.role,
          lambdaConfig: {
            lambdaFunctionArn: this.props.functionArn
          }
        } : {}
      }
    };
  }
};

// src/provider/aws/cloud-control-api/resource.ts
var CloudControlApiResource = class extends Resource {
  cloudProviderId = "aws-cloud-control-api";
  // protected _region: string | undefined
  // get region() {
  // 	return this._region
  // }
  // setRegion(region: string) {
  // 	this._region = region
  // 	return this
  // }
};

// src/provider/aws/appsync/domain-name-api-association.ts
var DomainNameApiAssociation = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::AppSync::DomainNameApiAssociation", id, props);
    this.props = props;
  }
  toState() {
    return {
      document: {
        ApiId: this.props.apiId,
        DomainName: this.props.domainName
      }
    };
  }
};

// src/provider/aws/appsync/domain-name.ts
var DomainName = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::AppSync::DomainName", id, props);
    this.props = props;
  }
  get appSyncDomainName() {
    return this.output((v) => v.AppSyncDomainName);
  }
  get domainName() {
    return this.output((v) => v.DomainName);
  }
  get hostedZoneId() {
    return this.output((v) => v.HostedZoneId);
  }
  toState() {
    return {
      document: {
        DomainName: this.props.domainName,
        CertificateArn: this.props.certificateArn
      }
    };
  }
};

// src/provider/aws/appsync/function-configuration.ts
var FunctionConfiguration = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::AppSync::FunctionConfiguration", id, props);
    this.props = props;
  }
  get id() {
    return this.output((v) => v.FunctionId);
  }
  get arn() {
    return this.output((v) => v.FunctionArn);
  }
  toState() {
    return {
      assets: {
        code: this.props.code
      },
      document: {
        ApiId: this.props.apiId,
        DataSourceName: this.props.dataSourceName,
        Name: this.props.name,
        Code: { __ASSET__: "code" },
        Runtime: {
          Name: "APPSYNC_JS",
          RuntimeVersion: "1.0.0"
        }
      }
    };
  }
};

// src/provider/aws/appsync/graphql-api-provider.ts
var import_client_appsync2 = require("@aws-sdk/client-appsync");
var GraphQLApiProvider = class {
  client;
  constructor(props) {
    this.client = new import_client_appsync2.AppSyncClient(props);
  }
  own(id) {
    return id === "aws-appsync-graphql-api";
  }
  async get({ id }) {
    const result = await this.client.send(
      new import_client_appsync2.GetGraphqlApiCommand({
        apiId: id
      })
    );
    return result.graphqlApi;
  }
  async create({ document }) {
    const result = await this.client.send(new import_client_appsync2.CreateGraphqlApiCommand(document));
    return result.graphqlApi?.apiId;
  }
  async update({ id, newDocument }) {
    await this.client.send(
      new import_client_appsync2.UpdateGraphqlApiCommand({
        apiId: id,
        ...newDocument
      })
    );
    return id;
  }
  async delete({ id }) {
    try {
      await this.client.send(
        new import_client_appsync2.DeleteGraphqlApiCommand({
          apiId: id
        })
      );
    } catch (error) {
      if (error instanceof import_client_appsync2.NotFoundException) {
        throw new ResourceNotFound(error.message);
      }
      throw error;
    }
  }
};

// src/provider/aws/appsync/graphql-api.ts
var import_duration = require("@awsless/duration");
var GraphQLApi = class extends Resource {
  // private defaultAuthorization?: GraphQLAuthorization
  // private lambdaAuthProviders: { arn: string, ttl: Duration }[] = []
  constructor(id, props) {
    super("AWS::AppSync::GraphQLApi", id, props);
    this.props = props;
  }
  cloudProviderId = "aws-appsync-graphql-api";
  get id() {
    return this.output((v) => v.apiId);
  }
  get arn() {
    return this.output((v) => v.arn);
  }
  get name() {
    return this.output((v) => v.name);
  }
  get realtime() {
    return {
      uri: this.output((v) => v.uris.REALTIME),
      dns: this.output((v) => v.dns.REALTIME)
    };
  }
  get graphql() {
    return {
      uri: this.output((v) => v.uris.GRAPHQL),
      dns: this.output((v) => v.dns.GRAPHQL)
    };
  }
  // addDataSource(id: string, props:) {
  // }
  assignDomainName(id, props) {
    const domain = new DomainName(id, props);
    this.add(domain);
    return domain;
  }
  // setDefaultAuthorization(auth: GraphQLAuthorization) {
  // 	this.defaultAuthorization = auth
  // 	return this
  // }
  // addLambdaAuthProvider(lambdaAuthorizerArn: string, resultTTL: Duration = Duration.seconds(0)) {
  // 	this.lambdaAuthProviders.push({
  // 		arn: lambdaAuthorizerArn,
  // 		ttl: resultTTL,
  // 	})
  // 	return this
  // }
  // addCognitoAuthProvider(lambdaAuthorizerArn: string, resultTTL: Duration = Duration.seconds(0)) {
  // 	this.lambdaAuthProviders.push({
  // 		arn: lambdaAuthorizerArn,
  // 		ttl: resultTTL,
  // 	})
  // 	return this
  // }
  formatAuth(props) {
    const type = unwrap(props.type);
    if (type === "api-key") {
      return { authenticationType: "API_KEY" };
    }
    if (type === "iam") {
      return { authenticationType: "AWS_IAM" };
    }
    if (type === "cognito") {
      const prop2 = props;
      return {
        authenticationType: "AMAZON_COGNITO_USER_POOLS",
        userPoolConfig: {
          userPoolId: prop2.userPoolId,
          ...this.attr("awsRegion", prop2.region),
          ...this.attr("defaultAction", prop2.defaultAction),
          ...this.attr("appIdClientRegex", prop2.appIdClientRegex)
        }
      };
    }
    const prop = props;
    return {
      authenticationType: "AWS_LAMBDA",
      lambdaAuthorizerConfig: {
        authorizerUri: prop.functionArn,
        ...this.attr("authorizerResultTtlInSeconds", prop.resultTtl && (0, import_duration.toSeconds)(unwrap(prop.resultTtl))),
        ...this.attr("identityValidationExpression", prop.tokenRegex)
      }
    };
  }
  toState() {
    const auth = unwrap(this.props.auth);
    return {
      document: {
        name: this.props.name,
        apiType: unwrap(this.props.type, "graphql").toUpperCase(),
        ...this.attr("mergedApiExecutionRoleArn", this.props.role),
        ...this.formatAuth(unwrap(auth.default)),
        additionalAuthenticationProviders: unwrap(auth.additional, []).map(unwrap).map(this.formatAuth),
        visibility: unwrap(this.props.visibility, true) ? "GLOBAL" : "PRIVATE",
        introspectionConfig: unwrap(this.props.introspection, true) ? "ENABLED" : "DISABLED",
        environmentVariables: JSON.stringify(unwrap(this.props.environment, {}))
      }
    };
  }
};

// src/provider/aws/appsync/graphql-schema-provider.ts
var import_client_appsync3 = require("@aws-sdk/client-appsync");
var GraphQLSchemaProvider = class {
  client;
  constructor(props) {
    this.client = new import_client_appsync3.AppSyncClient(props);
  }
  own(id) {
    return id === "aws-appsync-graphql-schema";
  }
  async get({ id }) {
    while (true) {
      const result = await this.client.send(
        new import_client_appsync3.GetSchemaCreationStatusCommand({
          apiId: id
        })
      );
      if (result.status === "FAILED") {
        throw new Error("Failed updating graphql schema");
      }
      if (result.status === "SUCCESS" || result.status === "ACTIVE") {
        return {};
      }
      await sleep(5e3);
    }
  }
  async create({ document, assets }) {
    await this.client.send(
      new import_client_appsync3.StartSchemaCreationCommand({
        apiId: document.apiId,
        definition: assets.definition?.data
      })
    );
    return document.apiId;
  }
  async update({ oldDocument, newDocument, assets }) {
    if (oldDocument.apiId !== newDocument.apiId) {
      throw new Error(`GraphGLSchema can't change the api id`);
    }
    await this.client.send(
      new import_client_appsync3.StartSchemaCreationCommand({
        apiId: newDocument.apiId,
        definition: assets.definition?.data
      })
    );
    return newDocument.apiId;
  }
  async delete({ id }) {
    try {
      await this.client.send(
        new import_client_appsync3.DeleteGraphqlApiCommand({
          apiId: id
        })
      );
    } catch (error) {
      if (error instanceof import_client_appsync3.NotFoundException) {
        throw new ResourceNotFound(error.message);
      }
      throw error;
    }
  }
};

// src/provider/aws/appsync/graphql-schema.ts
var GraphQLSchema = class extends Resource {
  constructor(id, props) {
    super("AWS::AppSync::GraphQLSchema", id, props);
    this.props = props;
  }
  cloudProviderId = "aws-appsync-graphql-schema";
  toState() {
    return {
      assets: {
        definition: this.props.definition
      },
      document: {
        apiId: this.props.apiId
      }
    };
  }
};

// src/provider/aws/appsync/resolver.ts
var Resolver = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::AppSync::Resolver", id, props);
    this.props = props;
  }
  get arn() {
    return this.output((v) => v.ResolverArn);
  }
  toState() {
    return {
      assets: {
        code: this.props.code
      },
      document: {
        ApiId: this.props.apiId,
        Kind: "PIPELINE",
        TypeName: this.props.typeName,
        FieldName: this.props.fieldName,
        PipelineConfig: {
          Functions: this.props.functions
        },
        Code: { __ASSET__: "code" },
        Runtime: {
          Name: "APPSYNC_JS",
          RuntimeVersion: "1.0.0"
        }
      }
    };
  }
};

// src/provider/aws/appsync/source-api-association.ts
var SourceApiAssociation = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::AppSync::SourceApiAssociation", id, props);
    this.props = props;
  }
  toState() {
    return {
      document: {
        MergedApiIdentifier: this.props.mergedApiId,
        SourceApiIdentifier: this.props.sourceApiId,
        SourceApiAssociationConfig: {
          MergeType: unwrap(this.props.mergeType, "auto") === "auto" ? "AUTO_MERGE" : "MANUAL_MERGE"
        }
      }
    };
  }
};

// src/provider/aws/cloud-control-api/index.ts
var cloud_control_api_exports = {};
__export(cloud_control_api_exports, {
  CloudControlApiProvider: () => CloudControlApiProvider,
  CloudControlApiResource: () => CloudControlApiResource
});

// src/provider/aws/cloud-control-api/provider.ts
var import_client_cloudcontrol = require("@aws-sdk/client-cloudcontrol");
var import_rfc6902 = require("rfc6902");
var import_duration2 = require("@awsless/duration");
var CloudControlApiProvider = class {
  constructor(props) {
    this.props = props;
    this.client = new import_client_cloudcontrol.CloudControlClient(props);
  }
  client;
  own(id) {
    return id === "aws-cloud-control-api";
  }
  async progressStatus(event) {
    const token = event.RequestToken;
    const start = /* @__PURE__ */ new Date();
    const timeout = Number((0, import_duration2.toMilliSeconds)(this.props.timeout ?? (0, import_duration2.minutes)(1)));
    while (true) {
      if (event.OperationStatus === "SUCCESS") {
        return event.Identifier;
      }
      if (event.OperationStatus === "FAILED") {
        if (event.ErrorCode === "NotFound") {
          throw new ResourceNotFound(event.StatusMessage);
        }
        throw new Error(`[${event.ErrorCode}] ${event.StatusMessage}`);
      }
      const now = Date.now();
      const elapsed = now - start.getTime();
      if (elapsed > timeout) {
        throw new Error("AWS Cloud Control API operation timeout.");
      }
      const after = event.RetryAfter?.getTime() ?? 0;
      const delay = Math.min(Math.max(after - now, 1e3), 5e3);
      await sleep(delay);
      const status = await this.client.send(
        new import_client_cloudcontrol.GetResourceRequestStatusCommand({
          RequestToken: token
        })
      );
      const result = await this.get({
        id: "test2",
        type: "AWS::MemoryDB::Cluster"
      });
      console.log(status, result);
      event = status.ProgressEvent;
    }
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
  async get({ id, type }) {
    const result = await this.client.send(
      new import_client_cloudcontrol.GetResourceCommand({
        TypeName: type,
        Identifier: id
      })
    );
    return JSON.parse(result.ResourceDescription.Properties);
  }
  async create({ type, document }) {
    const result = await this.client.send(
      new import_client_cloudcontrol.CreateResourceCommand({
        TypeName: type,
        DesiredState: JSON.stringify(document)
      })
    );
    return this.progressStatus(result.ProgressEvent);
  }
  async update({ type, id, oldDocument, newDocument, remoteDocument }) {
    const result = await this.client.send(
      new import_client_cloudcontrol.UpdateResourceCommand({
        TypeName: type,
        Identifier: id,
        PatchDocument: JSON.stringify(this.updateOperations(remoteDocument, oldDocument, newDocument))
      })
    );
    return this.progressStatus(result.ProgressEvent);
  }
  async delete({ type, id }) {
    const result = await this.client.send(
      new import_client_cloudcontrol.DeleteResourceCommand({
        TypeName: type,
        Identifier: id
      })
    );
    await this.progressStatus(result.ProgressEvent);
  }
};

// src/provider/aws/cloud-front/index.ts
var cloud_front_exports = {};
__export(cloud_front_exports, {
  CachePolicy: () => CachePolicy,
  Distribution: () => Distribution,
  OriginAccessControl: () => OriginAccessControl,
  OriginRequestPolicy: () => OriginRequestPolicy,
  ResponseHeadersPolicy: () => ResponseHeadersPolicy
});

// src/provider/aws/cloud-front/distribution.ts
var import_duration3 = require("@awsless/duration");
var Distribution = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::CloudFront::Distribution", id, props);
    this.props = props;
  }
  // get arn() {
  // 	return sub('arn:${AWS::Partition}:cloudfront::${AWS::AccountId}:distribution/${id}', {
  // 		id: this.id,
  // 	})
  // }
  get id() {
    return this.output((v) => v.Id);
  }
  get domainName() {
    return this.output((v) => v.DomainName);
  }
  get hostedZoneId() {
    return "Z2FDTNDATAQYW2";
  }
  get aliasTarget() {
    return {
      dnsName: this.domainName,
      hostedZoneId: this.hostedZoneId,
      evaluateTargetHealth: false
    };
  }
  toState() {
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
          Origins: unwrap(this.props.origins, []).map((v) => unwrap(v)).map((origin) => ({
            Id: origin.id,
            DomainName: origin.domainName,
            OriginCustomHeaders: Object.entries(unwrap(origin.headers, {})).map(
              ([name, value]) => ({
                HeaderName: name,
                HeaderValue: value
              })
            ),
            ...origin.path ? {
              OriginPath: origin.path
            } : {},
            ...origin.protocol ? {
              CustomOriginConfig: {
                OriginProtocolPolicy: origin.protocol
              }
            } : {},
            ...origin.originAccessIdentityId ? {
              S3OriginConfig: {
                OriginAccessIdentity: `origin-access-identity/cloudfront/${unwrap(
                  origin.originAccessIdentityId
                )}`
              }
            } : {},
            ...origin.originAccessControlId ? {
              OriginAccessControlId: origin.originAccessControlId,
              S3OriginConfig: {
                OriginAccessIdentity: ""
              }
            } : {}
          })),
          OriginGroups: {
            Quantity: unwrap(this.props.originGroups, []).length ?? 0,
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
          CustomErrorResponses: unwrap(this.props.customErrorResponses, []).map((v) => unwrap(v)).map((item) => ({
            ErrorCode: item.errorCode,
            ...this.attr(
              "ErrorCachingMinTTL",
              item.cacheMinTTL && (0, import_duration3.toSeconds)(unwrap(item.cacheMinTTL))
            ),
            ...this.attr("ResponseCode", item.responseCode),
            ...this.attr("ResponsePagePath", item.responsePath)
          })),
          DefaultCacheBehavior: {
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
            })),
            ...this.attr("CachePolicyId", this.props.cachePolicyId),
            ...this.attr("OriginRequestPolicyId", this.props.originRequestPolicyId),
            ...this.attr("ResponseHeadersPolicyId", this.props.responseHeadersPolicyId)
          }
        },
        Tags: [{ Key: "Name", Value: this.props.name }]
      }
    };
  }
};

// src/provider/aws/cloud-front/cache-policy.ts
var import_duration4 = require("@awsless/duration");
var CachePolicy = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::CloudFront::CachePolicy", id, props);
    this.props = props;
  }
  get id() {
    return this.output((v) => v.Id);
  }
  toState() {
    return {
      document: {
        CachePolicyConfig: {
          Name: this.props.name,
          MinTTL: (0, import_duration4.toSeconds)(unwrap(this.props.minTtl)),
          MaxTTL: (0, import_duration4.toSeconds)(unwrap(this.props.maxTtl)),
          DefaultTTL: (0, import_duration4.toSeconds)(unwrap(this.props.defaultTtl)),
          ParametersInCacheKeyAndForwardedToOrigin: {
            EnableAcceptEncodingGzip: unwrap(this.props.acceptGzip, false),
            EnableAcceptEncodingBrotli: unwrap(this.props.acceptBrotli, false),
            CookiesConfig: {
              CookieBehavior: unwrap(this.props.cookies) ? "whitelist" : "none",
              ...this.attr("Cookies", this.props.cookies)
            },
            HeadersConfig: {
              HeaderBehavior: unwrap(this.props.headers) ? "whitelist" : "none",
              ...this.attr("Headers", this.props.headers)
            },
            QueryStringsConfig: {
              QueryStringBehavior: unwrap(this.props.queries) ? "whitelist" : "none",
              ...this.attr("QueryStrings", this.props.queries)
            }
          }
        }
      }
    };
  }
};

// src/provider/aws/cloud-front/origin-access-control.ts
var OriginAccessControl = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::CloudFront::OriginAccessControl", id, props);
    this.props = props;
  }
  get id() {
    return this.output((v) => v.Id);
  }
  toState() {
    return {
      document: {
        OriginAccessControlConfig: {
          Name: this.props.name,
          OriginAccessControlOriginType: this.props.type,
          SigningBehavior: unwrap(this.props.behavior, "always"),
          SigningProtocol: unwrap(this.props.protocol, "sigv4")
        }
      }
    };
  }
};

// src/provider/aws/cloud-front/origin-request-policy.ts
var import_change_case = require("change-case");
var OriginRequestPolicy = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::CloudFront::OriginRequestPolicy", id, props);
    this.props = props;
  }
  get id() {
    return this.output((v) => v.Id);
  }
  toState() {
    const cookie = unwrap(this.props.cookie);
    const header = unwrap(this.props.header);
    const query = unwrap(this.props.query);
    return {
      document: {
        OriginRequestPolicyConfig: {
          Name: this.props.name,
          CookiesConfig: {
            CookieBehavior: (0, import_change_case.camelCase)(unwrap(cookie?.behavior, "all")),
            ...this.attr("Cookies", cookie?.values)
          },
          HeadersConfig: {
            HeaderBehavior: (0, import_change_case.camelCase)(unwrap(header?.behavior, "all-viewer")),
            ...this.attr("Headers", header?.values)
          },
          QueryStringsConfig: {
            QueryStringBehavior: (0, import_change_case.camelCase)(unwrap(query?.behavior, "all")),
            ...this.attr("QueryStrings", query?.values)
          }
        }
      }
    };
  }
};

// src/provider/aws/cloud-front/response-headers-policy.ts
var import_duration5 = require("@awsless/duration");
var ResponseHeadersPolicy = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::CloudFront::ResponseHeadersPolicy", id, props);
    this.props = props;
  }
  get id() {
    return this.output((v) => v.Id);
  }
  toState() {
    const remove = unwrap(this.props.remove, []);
    const cors = unwrap(this.props.cors, {});
    const contentSecurityPolicy = unwrap(this.props.contentSecurityPolicy);
    const contentTypeOptions = unwrap(this.props.contentTypeOptions, {});
    const frameOptions = unwrap(this.props.frameOptions, {});
    const referrerPolicy = unwrap(this.props.referrerPolicy, {});
    const strictTransportSecurity = unwrap(this.props.strictTransportSecurity, {});
    const xssProtection = unwrap(this.props.xssProtection, {});
    return {
      document: {
        ResponseHeadersPolicyConfig: {
          Name: this.props.name,
          ...remove.length > 0 ? {
            RemoveHeadersConfig: {
              Items: remove.map((value) => ({
                Header: value
              }))
            }
          } : {},
          CorsConfig: {
            OriginOverride: unwrap(cors.override, false),
            AccessControlAllowCredentials: unwrap(cors.credentials, false),
            AccessControlMaxAgeSec: (0, import_duration5.toSeconds)(unwrap(cors.maxAge, (0, import_duration5.days)(365))),
            AccessControlAllowHeaders: {
              Items: unwrap(cors.headers, ["*"])
            },
            AccessControlAllowMethods: {
              Items: unwrap(cors.methods, ["ALL"])
            },
            AccessControlAllowOrigins: {
              Items: unwrap(cors.origins, ["*"])
            },
            AccessControlExposeHeaders: {
              Items: unwrap(cors.exposeHeaders, ["*"])
            }
          },
          SecurityHeadersConfig: {
            ...contentSecurityPolicy ? {
              ContentSecurityPolicy: {
                Override: unwrap(contentSecurityPolicy.override, false),
                ContentSecurityPolicy: unwrap(
                  contentSecurityPolicy?.contentSecurityPolicy
                )
              }
            } : {},
            ContentTypeOptions: {
              Override: unwrap(contentTypeOptions.override, false)
            },
            FrameOptions: {
              Override: unwrap(frameOptions.override, false),
              FrameOption: unwrap(frameOptions.frameOption, "same-origin") === "same-origin" ? "SAMEORIGIN" : "DENY"
            },
            ReferrerPolicy: {
              Override: unwrap(referrerPolicy.override, false),
              ReferrerPolicy: unwrap(referrerPolicy.referrerPolicy, "same-origin")
            },
            StrictTransportSecurity: {
              Override: unwrap(strictTransportSecurity.override, false),
              Preload: unwrap(strictTransportSecurity.preload, true),
              AccessControlMaxAgeSec: (0, import_duration5.toSeconds)(unwrap(strictTransportSecurity.maxAge, (0, import_duration5.days)(365))),
              IncludeSubdomains: unwrap(strictTransportSecurity.includeSubdomains, true)
            },
            XSSProtection: {
              Override: unwrap(xssProtection.override, false),
              ModeBlock: unwrap(xssProtection.modeBlock, true),
              Protection: unwrap(xssProtection.enable, true),
              ...this.attr("ReportUri", unwrap(xssProtection.reportUri))
            }
          }
        }
      }
    };
  }
};

// src/provider/aws/cloud-watch/index.ts
var cloud_watch_exports = {};
__export(cloud_watch_exports, {
  LogGroup: () => LogGroup
});

// src/provider/aws/cloud-watch/log-group.ts
var import_duration6 = require("@awsless/duration");
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
      document: {
        LogGroupName: this.props.name,
        ...this.attr("RetentionInDays", this.props.retention && (0, import_duration6.toDays)(unwrap(this.props.retention)))
        // KmsKeyId: String
        // DataProtectionPolicy : Json,
      }
    };
  }
};

// src/provider/aws/cognito/index.ts
var cognito_exports = {};
__export(cognito_exports, {
  UserPool: () => UserPool,
  UserPoolClient: () => UserPoolClient,
  UserPoolDomain: () => UserPoolDomain,
  UserPoolEmail: () => UserPoolEmail
});

// src/provider/aws/cognito/user-pool-client.ts
var import_duration7 = require("@awsless/duration");
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
    if (unwrap(props?.userPassword)) {
      authFlows.push("ALLOW_USER_PASSWORD_AUTH");
    }
    if (unwrap(props?.adminUserPassword)) {
      authFlows.push("ALLOW_ADMIN_USER_PASSWORD_AUTH");
    }
    if (unwrap(props?.custom)) {
      authFlows.push("ALLOW_CUSTOM_AUTH");
    }
    if (unwrap(props?.userSrp)) {
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
      document: {
        ClientName: this.props.name,
        UserPoolId: this.props.userPoolId,
        ExplicitAuthFlows: this.formatAuthFlows(),
        EnableTokenRevocation: unwrap(this.props.enableTokenRevocation, false),
        GenerateSecret: unwrap(this.props.generateSecret, false),
        PreventUserExistenceErrors: unwrap(this.props.preventUserExistenceErrors, true) ? "ENABLED" : "LEGACY",
        ...this.attr("SupportedIdentityProviders", this.formatIdentityProviders()),
        // AllowedOAuthFlows: ['code'],
        // AllowedOAuthScopes: ['openid'],
        // AllowedOAuthFlowsUserPoolClient: true,
        // CallbackURLs: ['https://example.com'],
        // LogoutURLs: ['https://example.com'],
        // DefaultRedirectURI: String
        // EnablePropagateAdditionalUserContextData
        ...this.attr("ReadAttributes", this.props.readAttributes),
        ...this.attr("WriteAttributes", this.props.writeAttributes),
        ...this.attr(
          "AuthSessionValidity",
          validity.authSession && (0, import_duration7.toMinutes)(unwrap(validity.authSession))
        ),
        ...this.attr("AccessTokenValidity", validity.accessToken && (0, import_duration7.toHours)(unwrap(validity.accessToken))),
        ...this.attr("IdTokenValidity", validity.idToken && (0, import_duration7.toHours)(unwrap(validity.idToken))),
        ...this.attr(
          "RefreshTokenValidity",
          validity.refreshToken && (0, import_duration7.toDays)(unwrap(validity.refreshToken))
        ),
        TokenValidityUnits: {
          ...this.attr("AccessToken", validity.accessToken && "hours"),
          ...this.attr("IdToken", validity.idToken && "hours"),
          ...this.attr("RefreshToken", validity.refreshToken && "days")
        }
      }
    };
  }
};

// src/provider/aws/cognito/user-pool-domain.ts
var UserPoolDomain = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::Cognito::UserPoolDomain", id, props);
    this.props = props;
  }
  // get domain() {
  // 	return this.ref()
  // }
  // get cloudFrontDistribution() {
  // 	return this.getAtt('CloudFrontDistribution')
  // }
  toState() {
    return {
      document: {
        UserPoolId: this.props.userPoolId,
        Domain: this.props.domain
      }
    };
  }
};

// src/provider/aws/cognito/user-pool.ts
var import_change_case2 = require("change-case");
var import_duration8 = require("@awsless/duration");
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
    const client = new UserPoolClient(id, {
      ...props,
      userPoolId: this.id
    });
    this.add(client);
    return client;
  }
  toState() {
    const username = unwrap(this.props.username);
    const password = unwrap(this.props.password);
    const triggers = unwrap(this.props.triggers);
    return {
      document: {
        UserPoolName: this.props.name,
        DeletionProtection: unwrap(this.props.deletionProtection) ? "ACTIVE" : "INACTIVE",
        AccountRecoverySetting: {
          RecoveryMechanisms: [{ Name: "verified_email", Priority: 1 }]
        },
        // UserPoolTags: [],
        ...unwrap(username?.emailAlias) ? {
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
                MinLength: "5",
                MaxLength: "100"
              }
            }
          ]
        } : {},
        UsernameConfiguration: {
          CaseSensitive: unwrap(username?.caseSensitive, false)
        },
        ...this.attr("EmailConfiguration", unwrap(this.props.email)?.toJSON()),
        DeviceConfiguration: {
          DeviceOnlyRememberedOnUserPrompt: false
        },
        AdminCreateUserConfig: {
          AllowAdminCreateUserOnly: !unwrap(this.props.allowUserRegistration, true)
        },
        Policies: {
          PasswordPolicy: {
            MinimumLength: unwrap(password?.minLength, 12),
            RequireUppercase: unwrap(password?.uppercase, false),
            RequireLowercase: unwrap(password?.lowercase, false),
            RequireNumbers: unwrap(password?.numbers, false),
            RequireSymbols: unwrap(password?.symbols, false),
            TemporaryPasswordValidityDays: (0, import_duration8.toDays)(
              unwrap(password?.temporaryPasswordValidity, (0, import_duration8.days)(7))
            )
          }
        },
        LambdaConfig: {
          ...this.attr("PreAuthentication", triggers?.beforeLogin),
          ...this.attr("PostAuthentication", triggers?.afterLogin),
          ...this.attr("PostConfirmation", triggers?.afterRegister),
          ...this.attr("PreSignUp", triggers?.beforeRegister),
          ...this.attr("PreTokenGeneration", triggers?.beforeToken),
          ...this.attr("CustomMessage", triggers?.customMessage),
          ...this.attr("UserMigration", triggers?.userMigration),
          ...this.attr("DefineAuthChallenge", triggers?.defineChallange),
          ...this.attr("CreateAuthChallenge", triggers?.createChallange),
          ...this.attr("VerifyAuthChallengeResponse", triggers?.verifyChallange),
          ...triggers?.emailSender ? {
            CustomEmailSender: {
              LambdaArn: triggers.emailSender,
              LambdaVersion: "V1_0"
            }
          } : {}
        }
      }
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
    return {
      ...this.props.type ? { EmailSendingAccount: (0, import_change_case2.constantCase)(this.props.type) } : {},
      ...this.props.from ? { From: this.props.from } : {},
      ...this.props.replyTo ? { ReplyToEmailAddress: this.props.replyTo } : {},
      ...this.props.sourceArn ? { SourceArn: this.props.sourceArn } : {}
    };
  }
};

// src/provider/aws/dynamodb/index.ts
var dynamodb_exports = {};
__export(dynamodb_exports, {
  DynamoDBStateProvider: () => DynamoDBStateProvider,
  Table: () => Table,
  TableItem: () => TableItem,
  TableItemProvider: () => TableItemProvider
});

// src/provider/aws/dynamodb/state-provider.ts
var import_util_dynamodb = require("@aws-sdk/util-dynamodb");
var import_client_dynamodb = require("@aws-sdk/client-dynamodb");
var DynamoDBStateProvider = class {
  constructor(props) {
    this.props = props;
    this.client = new import_client_dynamodb.DynamoDB(props);
    this.id = Math.floor(Math.random() * 1e5);
  }
  client;
  id;
  async lock(urn) {
    await this.client.send(
      new import_client_dynamodb.UpdateItemCommand({
        TableName: this.props.tableName,
        Key: (0, import_util_dynamodb.marshall)({ urn }),
        UpdateExpression: "SET #lock = :id",
        ConditionExpression: "attribute_not_exists(#lock)",
        ExpressionAttributeNames: { "#lock": "lock" },
        ExpressionAttributeValues: { ":id": (0, import_util_dynamodb.marshall)(this.id) }
      })
    );
    return async () => {
      await this.client.send(
        new import_client_dynamodb.UpdateItemCommand({
          TableName: this.props.tableName,
          Key: (0, import_util_dynamodb.marshall)({ urn }),
          UpdateExpression: "REMOVE #lock",
          ConditionExpression: "#lock = :id",
          ExpressionAttributeNames: { "#lock": "lock" },
          ExpressionAttributeValues: { ":id": (0, import_util_dynamodb.marshall)(this.id) }
        })
      );
    };
  }
  async get(urn) {
    const result = await this.client.send(
      new import_client_dynamodb.GetItemCommand({
        TableName: this.props.tableName,
        Key: (0, import_util_dynamodb.marshall)({ urn })
      })
    );
    if (!result.Item) {
      return {};
    }
    const item = (0, import_util_dynamodb.unmarshall)(result.Item);
    return item.state ?? {};
  }
  async update(urn, state) {
    await this.client.send(
      new import_client_dynamodb.UpdateItemCommand({
        TableName: this.props.tableName,
        Key: (0, import_util_dynamodb.marshall)({ urn }),
        UpdateExpression: "SET #state = :state",
        ExpressionAttributeNames: { "#state": "state" },
        ExpressionAttributeValues: (0, import_util_dynamodb.marshall)(
          {
            ":state": JSON.parse(JSON.stringify(state))
          },
          {
            removeUndefinedValues: true,
            convertEmptyValues: true
          }
        )
      })
    );
  }
  async delete(urn) {
    await this.client.send(
      new import_client_dynamodb.UpdateItemCommand({
        TableName: this.props.tableName,
        Key: (0, import_util_dynamodb.marshall)({ urn }),
        UpdateExpression: "REMOVE #state",
        ExpressionAttributeNames: { "#state": "state" }
      })
    );
  }
};

// src/provider/aws/dynamodb/table-item-provider.ts
var import_client_dynamodb2 = require("@aws-sdk/client-dynamodb");
var import_util_dynamodb2 = require("@aws-sdk/util-dynamodb");
var TableItemProvider = class {
  client;
  constructor(props) {
    this.client = new import_client_dynamodb2.DynamoDB(props);
  }
  own(id) {
    return id === "aws-dynamodb-table-item";
  }
  marshall(item) {
    return (0, import_util_dynamodb2.marshall)(item, {
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
  async get() {
    return {};
  }
  async create({ document, assets }) {
    const item = JSON.parse(assets.item.data.toString("utf8"));
    const key = this.primaryKey(document, item);
    await this.client.send(
      new import_client_dynamodb2.PutItemCommand({
        TableName: document.table,
        Item: this.marshall(item)
      })
    );
    return JSON.stringify([document.table, key]);
  }
  async update({ id, oldDocument, newDocument, assets }) {
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
      await this.client.send(
        new import_client_dynamodb2.DeleteItemCommand({
          TableName: newDocument.table,
          Key: this.marshall(oldKey)
        })
      );
    }
    await this.client.send(
      new import_client_dynamodb2.PutItemCommand({
        TableName: newDocument.table,
        Item: this.marshall(item)
      })
    );
    return JSON.stringify([newDocument.table, key]);
  }
  async delete({ id }) {
    const [table, oldKey] = JSON.parse(id);
    await this.client.send(
      new import_client_dynamodb2.DeleteItemCommand({
        TableName: table,
        Key: this.marshall(oldKey)
      })
    );
  }
};

// src/provider/aws/dynamodb/table-item.ts
var TableItem = class extends Resource {
  constructor(id, props) {
    super("AWS::DynamoDB::Table::Item", id, props);
    this.props = props;
  }
  cloudProviderId = "aws-dynamodb-table-item";
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
var import_change_case3 = require("change-case");
var Table = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::DynamoDB::Table", id, props);
    this.props = props;
    this.indexes = { ...this.props.indexes || {} };
  }
  indexes;
  get arn() {
    return this.output((v) => v.Arn);
  }
  get streamArn() {
    return this.output((v) => v.StreamArn);
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
  get streamPermissions() {
    return {
      actions: [
        "dynamodb:ListStreams",
        "dynamodb:DescribeStream",
        "dynamodb:GetRecords",
        "dynamodb:GetShardIterator"
      ],
      resources: [this.streamArn]
    };
  }
  get permissions() {
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
    const indexNames = Object.keys(this.indexes ?? {});
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
      document: {
        TableName: this.props.name,
        BillingMode: "PAY_PER_REQUEST",
        KeySchema: [
          { KeyType: "HASH", AttributeName: this.props.hash },
          ...this.props.sort ? [{ KeyType: "RANGE", AttributeName: this.props.sort }] : []
        ],
        AttributeDefinitions: this.attributeDefinitions(),
        TableClass: (0, import_change_case3.constantCase)(unwrap(this.props.class, "standard")),
        DeletionProtectionEnabled: unwrap(this.props.deletionProtection, false),
        PointInTimeRecoverySpecification: {
          PointInTimeRecoveryEnabled: unwrap(this.props.pointInTimeRecovery, false)
        },
        ...this.props.timeToLiveAttribute ? {
          TimeToLiveSpecification: {
            AttributeName: this.props.timeToLiveAttribute,
            Enabled: true
          }
        } : {},
        ...this.props.stream ? {
          StreamSpecification: {
            StreamViewType: (0, import_change_case3.constantCase)(unwrap(this.props.stream))
          }
        } : {},
        ...Object.keys(this.indexes).length ? {
          GlobalSecondaryIndexes: Object.entries(this.indexes).map(([name, props]) => ({
            IndexName: name,
            KeySchema: [
              { KeyType: "HASH", AttributeName: props.hash },
              ...props.sort ? [{ KeyType: "RANGE", AttributeName: props.sort }] : []
            ],
            Projection: {
              ProjectionType: (0, import_change_case3.constantCase)(props.projection || "all")
            }
          }))
        } : {}
      }
    };
  }
};

// src/provider/aws/ec2/index.ts
var ec2_exports = {};
__export(ec2_exports, {
  InternetGateway: () => InternetGateway,
  Peer: () => Peer,
  Port: () => Port,
  Protocol: () => Protocol,
  Route: () => Route,
  RouteTable: () => RouteTable,
  SecurityGroup: () => SecurityGroup,
  Subnet: () => Subnet,
  SubnetRouteTableAssociation: () => SubnetRouteTableAssociation,
  VPCGatewayAttachment: () => VPCGatewayAttachment,
  Vpc: () => Vpc
});

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
  }
  ingress = [];
  egress = [];
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
        SecurityGroupEgress: this.egress.map((rule) => unwrap(rule)).map((rule) => ({
          ...unwrap(rule.peer).toRuleJson(),
          ...unwrap(rule.port).toRuleJson(),
          Description: unwrap(rule.description, "")
        })),
        SecurityGroupIngress: this.ingress.map((rule) => unwrap(rule)).map((rule) => ({
          ...unwrap(rule.peer).toRuleJson(),
          ...unwrap(rule.port).toRuleJson(),
          Description: unwrap(rule.description, "")
        }))
      }
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

// src/provider/aws/ec2/port.ts
var Protocol = /* @__PURE__ */ ((Protocol2) => {
  Protocol2["ALL"] = "-1";
  Protocol2["HOPOPT"] = "0";
  Protocol2["ICMP"] = "icmp";
  Protocol2["IGMP"] = "2";
  Protocol2["GGP"] = "3";
  Protocol2["IPV4"] = "4";
  Protocol2["ST"] = "5";
  Protocol2["TCP"] = "tcp";
  Protocol2["CBT"] = "7";
  Protocol2["EGP"] = "8";
  Protocol2["IGP"] = "9";
  Protocol2["BBN_RCC_MON"] = "10";
  Protocol2["NVP_II"] = "11";
  Protocol2["PUP"] = "12";
  Protocol2["EMCON"] = "14";
  Protocol2["XNET"] = "15";
  Protocol2["CHAOS"] = "16";
  Protocol2["UDP"] = "udp";
  Protocol2["MUX"] = "18";
  Protocol2["DCN_MEAS"] = "19";
  Protocol2["HMP"] = "20";
  Protocol2["PRM"] = "21";
  Protocol2["XNS_IDP"] = "22";
  Protocol2["TRUNK_1"] = "23";
  Protocol2["TRUNK_2"] = "24";
  Protocol2["LEAF_1"] = "25";
  Protocol2["LEAF_2"] = "26";
  Protocol2["RDP"] = "27";
  Protocol2["IRTP"] = "28";
  Protocol2["ISO_TP4"] = "29";
  Protocol2["NETBLT"] = "30";
  Protocol2["MFE_NSP"] = "31";
  Protocol2["MERIT_INP"] = "32";
  Protocol2["DCCP"] = "33";
  Protocol2["THREEPC"] = "34";
  Protocol2["IDPR"] = "35";
  Protocol2["XTP"] = "36";
  Protocol2["DDP"] = "37";
  Protocol2["IDPR_CMTP"] = "38";
  Protocol2["TPPLUSPLUS"] = "39";
  Protocol2["IL"] = "40";
  Protocol2["IPV6"] = "41";
  Protocol2["SDRP"] = "42";
  Protocol2["IPV6_ROUTE"] = "43";
  Protocol2["IPV6_FRAG"] = "44";
  Protocol2["IDRP"] = "45";
  Protocol2["RSVP"] = "46";
  Protocol2["GRE"] = "47";
  Protocol2["DSR"] = "48";
  Protocol2["BNA"] = "49";
  Protocol2["ESP"] = "50";
  Protocol2["AH"] = "51";
  Protocol2["I_NLSP"] = "52";
  Protocol2["SWIPE"] = "53";
  Protocol2["NARP"] = "54";
  Protocol2["MOBILE"] = "55";
  Protocol2["TLSP"] = "56";
  Protocol2["SKIP"] = "57";
  Protocol2["ICMPV6"] = "icmpv6";
  Protocol2["IPV6_NONXT"] = "59";
  Protocol2["IPV6_OPTS"] = "60";
  Protocol2["CFTP"] = "62";
  Protocol2["ANY_LOCAL"] = "63";
  Protocol2["SAT_EXPAK"] = "64";
  Protocol2["KRYPTOLAN"] = "65";
  Protocol2["RVD"] = "66";
  Protocol2["IPPC"] = "67";
  Protocol2["ANY_DFS"] = "68";
  Protocol2["SAT_MON"] = "69";
  Protocol2["VISA"] = "70";
  Protocol2["IPCV"] = "71";
  Protocol2["CPNX"] = "72";
  Protocol2["CPHB"] = "73";
  Protocol2["WSN"] = "74";
  Protocol2["PVP"] = "75";
  Protocol2["BR_SAT_MON"] = "76";
  Protocol2["SUN_ND"] = "77";
  Protocol2["WB_MON"] = "78";
  Protocol2["WB_EXPAK"] = "79";
  Protocol2["ISO_IP"] = "80";
  Protocol2["VMTP"] = "81";
  Protocol2["SECURE_VMTP"] = "82";
  Protocol2["VINES"] = "83";
  Protocol2["TTP"] = "84";
  Protocol2["IPTM"] = "84_";
  Protocol2["NSFNET_IGP"] = "85";
  Protocol2["DGP"] = "86";
  Protocol2["TCF"] = "87";
  Protocol2["EIGRP"] = "88";
  Protocol2["OSPFIGP"] = "89";
  Protocol2["SPRITE_RPC"] = "90";
  Protocol2["LARP"] = "91";
  Protocol2["MTP"] = "92";
  Protocol2["AX_25"] = "93";
  Protocol2["IPIP"] = "94";
  Protocol2["MICP"] = "95";
  Protocol2["SCC_SP"] = "96";
  Protocol2["ETHERIP"] = "97";
  Protocol2["ENCAP"] = "98";
  Protocol2["ANY_ENC"] = "99";
  Protocol2["GMTP"] = "100";
  Protocol2["IFMP"] = "101";
  Protocol2["PNNI"] = "102";
  Protocol2["PIM"] = "103";
  Protocol2["ARIS"] = "104";
  Protocol2["SCPS"] = "105";
  Protocol2["QNX"] = "106";
  Protocol2["A_N"] = "107";
  Protocol2["IPCOMP"] = "108";
  Protocol2["SNP"] = "109";
  Protocol2["COMPAQ_PEER"] = "110";
  Protocol2["IPX_IN_IP"] = "111";
  Protocol2["VRRP"] = "112";
  Protocol2["PGM"] = "113";
  Protocol2["ANY_0_HOP"] = "114";
  Protocol2["L2_T_P"] = "115";
  Protocol2["DDX"] = "116";
  Protocol2["IATP"] = "117";
  Protocol2["STP"] = "118";
  Protocol2["SRP"] = "119";
  Protocol2["UTI"] = "120";
  Protocol2["SMP"] = "121";
  Protocol2["SM"] = "122";
  Protocol2["PTP"] = "123";
  Protocol2["ISIS_IPV4"] = "124";
  Protocol2["FIRE"] = "125";
  Protocol2["CRTP"] = "126";
  Protocol2["CRUDP"] = "127";
  Protocol2["SSCOPMCE"] = "128";
  Protocol2["IPLT"] = "129";
  Protocol2["SPS"] = "130";
  Protocol2["PIPE"] = "131";
  Protocol2["SCTP"] = "132";
  Protocol2["FC"] = "133";
  Protocol2["RSVP_E2E_IGNORE"] = "134";
  Protocol2["MOBILITY_HEADER"] = "135";
  Protocol2["UDPLITE"] = "136";
  Protocol2["MPLS_IN_IP"] = "137";
  Protocol2["MANET"] = "138";
  Protocol2["HIP"] = "139";
  Protocol2["SHIM6"] = "140";
  Protocol2["WESP"] = "141";
  Protocol2["ROHC"] = "142";
  Protocol2["ETHERNET"] = "143";
  Protocol2["EXPERIMENT_1"] = "253";
  Protocol2["EXPERIMENT_2"] = "254";
  Protocol2["RESERVED"] = "255";
  return Protocol2;
})(Protocol || {});
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
  protocol;
  from;
  to;
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

// src/provider/aws/events/index.ts
var events_exports = {};
__export(events_exports, {
  Rule: () => Rule
});

// src/provider/aws/events/rule.ts
var Rule = class extends CloudControlApiResource {
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
      document: {
        Name: this.props.name,
        ...this.attr("State", this.props.enabled ? "ENABLED" : "DISABLED"),
        ...this.attr("Description", this.props.description),
        ...this.attr("ScheduleExpression", this.props.schedule),
        ...this.attr("RoleArn", this.props.roleArn),
        ...this.attr("EventBusName", this.props.eventBusName),
        ...this.attr("EventPattern", this.props.eventPattern),
        Targets: unwrap(this.props.targets).map((v) => unwrap(v)).map((target) => ({
          Arn: target.arn,
          Id: target.id,
          ...this.attr("Input", unwrap(target.input) && JSON.stringify(unwrap(target.input)))
        }))
      }
    };
  }
};

// src/provider/aws/iam/index.ts
var iam_exports = {};
__export(iam_exports, {
  Role: () => Role,
  RolePolicy: () => RolePolicy,
  formatPolicyDocument: () => formatPolicyDocument,
  formatStatement: () => formatStatement,
  fromAwsManagedPolicyName: () => fromAwsManagedPolicyName
});

// src/provider/aws/iam/role-policy.ts
var import_change_case4 = require("change-case");
var formatPolicyDocument = (policy) => ({
  PolicyName: policy.name,
  PolicyDocument: {
    Version: unwrap(policy.version, "2012-10-17"),
    Statement: unwrap(policy.statements, []).map((v) => unwrap(v)).map(formatStatement)
  }
});
var formatStatement = (statement) => ({
  Effect: (0, import_change_case4.capitalCase)(unwrap(statement.effect, "allow")),
  Action: statement.actions,
  Resource: statement.resources
});
var RolePolicy = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::IAM::RolePolicy", id, props);
    this.props = props;
  }
  statements = [];
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
      document: {
        RoleName: this.props.role,
        ...formatPolicyDocument({
          ...this.props,
          statements: [...unwrap(this.props.statements, []), ...this.statements]
        })
      }
    };
  }
};

// src/provider/aws/iam/role.ts
var Role = class extends CloudControlApiResource {
  constructor(id, props = {}) {
    super("AWS::IAM::Role", id, props);
    this.props = props;
  }
  inlinePolicies = [];
  managedPolicies = /* @__PURE__ */ new Set();
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
    const policy = new RolePolicy(id, {
      role: this.name,
      ...props
    });
    this.add(policy);
    return policy;
  }
  toState() {
    return {
      document: {
        ...this.attr("RoleName", this.props.name),
        ...this.attr("Path", this.props.path),
        ManagedPolicyArns: [...this.managedPolicies],
        Policies: [...unwrap(this.props.policies, []), ...this.inlinePolicies].map(
          (policy) => formatPolicyDocument(policy)
        ),
        ...this.props.assumedBy ? {
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
        } : {}
      }
    };
  }
};

// src/provider/aws/iam/managed-policy.ts
var fromAwsManagedPolicyName = (name) => {
  return `arn:aws:iam::aws:policy/service-role/${name}`;
};

// src/provider/aws/iot/index.ts
var iot_exports = {};
__export(iot_exports, {
  TopicRule: () => TopicRule
});

// src/provider/aws/iot/topic-rule.ts
var TopicRule = class extends CloudControlApiResource {
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

// src/provider/aws/lambda/index.ts
var lambda_exports = {};
__export(lambda_exports, {
  EventInvokeConfig: () => EventInvokeConfig,
  EventSourceMapping: () => EventSourceMapping,
  Function: () => Function,
  Permission: () => Permission,
  Url: () => Url,
  formatCode: () => formatCode
});

// src/provider/aws/lambda/url.ts
var import_change_case5 = require("change-case");
var import_duration9 = require("@awsless/duration");
var Url = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::Lambda::Url", id, props);
    this.props = props;
  }
  get url() {
    return this.output((v) => v.FunctionUrl);
  }
  get domain() {
    return this.url.apply((url) => url.split("/")[2]);
  }
  cors() {
    const cors = unwrap(this.props.cors);
    if (!cors) {
      return {};
    }
    const allow = unwrap(cors.allow, {});
    const expose = unwrap(cors.expose, {});
    return {
      ...this.attr("AllowCredentials", allow.credentials),
      ...this.attr("AllowHeaders", allow.headers),
      ...this.attr("AllowMethods", allow.methods),
      ...this.attr("AllowOrigins", allow.origins),
      ...this.attr("ExposeHeaders", expose.headers),
      ...this.attr("MaxAge", cors.maxAge, import_duration9.toSeconds)
    };
  }
  toState() {
    return {
      document: {
        AuthType: (0, import_change_case5.constantCase)(unwrap(this.props.authType, "none")),
        InvokeMode: (0, import_change_case5.constantCase)(unwrap(this.props.invokeMode, "buffered")),
        TargetFunctionArn: this.props.targetArn,
        ...this.attr("Qualifier", this.props.qualifier),
        Cors: this.cors()
      }
    };
  }
};

// src/provider/aws/lambda/permission.ts
var import_change_case6 = require("change-case");
var Permission = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::Lambda::Permission", id, props);
    this.props = props;
  }
  toState() {
    return {
      document: {
        FunctionName: this.props.functionArn,
        Action: unwrap(this.props.action, "lambda:InvokeFunction"),
        Principal: this.props.principal,
        ...this.attr("SourceArn", this.props.sourceArn),
        ...this.attr("FunctionUrlAuthType", this.props.urlAuthType, import_change_case6.constantCase)
        // ...(this.props.sourceArn ? { SourceArn: this.props.sourceArn } : {}),
        // ...(this.props.urlAuthType
        // 	? { FunctionUrlAuthType: constantCase(unwrap(this.props.urlAuthType)) }
        // 	: {}),
      }
    };
  }
};

// src/provider/aws/lambda/function.ts
var import_change_case7 = require("change-case");

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
var import_duration10 = require("@awsless/duration");
var Function = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::Lambda::Function", id, props);
    this.props = props;
  }
  environmentVariables = {};
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
    const url = new Url("url", {
      ...props,
      targetArn: this.arn
    });
    const permissions = new Permission("url", {
      principal: "*",
      // principal: 'cloudfront.amazonaws.com',
      // sourceArn: distribution.arn,
      action: "lambda:InvokeFunctionUrl",
      functionArn: this.arn,
      urlAuthType: props.authType ?? "none"
    });
    this.add(permissions);
    this.add(url);
    return url;
  }
  toState() {
    if (unwrap(this.props.name).length > 64) {
      throw new TypeError(`Lambda function name length can't be greater then 64. ${unwrap(this.props.name)}`);
    }
    return {
      asset: {
        code: this.props.code
      },
      document: {
        FunctionName: this.props.name,
        Description: this.props.description,
        MemorySize: (0, import_size.toMebibytes)(unwrap(this.props.memorySize, (0, import_size.mebibytes)(128))),
        Handler: unwrap(this.props.handler, "index.default"),
        Runtime: unwrap(this.props.runtime, "nodejs18.x"),
        Timeout: (0, import_duration10.toSeconds)(unwrap(this.props.timeout, (0, import_duration10.seconds)(10))),
        Architectures: [unwrap(this.props.architecture, "arm64")],
        Role: this.props.role,
        ...this.attr("ReservedConcurrentExecutions", this.props.reserved),
        Code: formatCode(unwrap(this.props.code)),
        EphemeralStorage: {
          Size: (0, import_size.toMebibytes)(unwrap(this.props.ephemeralStorageSize, (0, import_size.mebibytes)(512)))
        },
        ...this.props.log ? {
          LoggingConfig: {
            LogFormat: unwrap(this.props.log).format === "text" ? "Text" : "JSON",
            ApplicationLogLevel: (0, import_change_case7.constantCase)(unwrap(unwrap(this.props.log).level, "error")),
            SystemLogLevel: (0, import_change_case7.constantCase)(unwrap(unwrap(this.props.log).system, "warn"))
          }
        } : {},
        ...this.props.vpc ? {
          VpcConfig: {
            SecurityGroupIds: unwrap(this.props.vpc).securityGroupIds,
            SubnetIds: unwrap(this.props.vpc).subnetIds
          }
        } : {},
        Environment: {
          Variables: {
            ...unwrap(this.props.environment),
            ...this.environmentVariables
          }
        }
      }
    };
  }
};

// src/provider/aws/lambda/event-invoke-config.ts
var import_duration11 = require("@awsless/duration");
var EventInvokeConfig = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::Lambda::EventInvokeConfig", id, props);
    this.props = props;
  }
  setOnFailure(arn) {
    this.props.onFailure = arn;
    return this;
  }
  setOnSuccess(arn) {
    this.props.onSuccess = arn;
    return this;
  }
  toState() {
    return {
      document: {
        FunctionName: this.props.functionArn,
        Qualifier: unwrap(this.props.qualifier, "$LATEST"),
        ...this.attr("MaximumEventAgeInSeconds", this.props.maxEventAge, import_duration11.toSeconds),
        ...this.attr("MaximumRetryAttempts", this.props.retryAttempts),
        ...this.props.onFailure || this.props.onSuccess ? {
          DestinationConfig: {
            ...this.props.onFailure ? {
              OnFailure: {
                Destination: this.props.onFailure
              }
            } : {},
            ...this.props.onSuccess ? {
              OnSuccess: {
                Destination: this.props.onSuccess
              }
            } : {}
          }
        } : {}
      }
    };
  }
};

// src/provider/aws/lambda/event-source-mapping.ts
var import_duration12 = require("@awsless/duration");
var import_change_case8 = require("change-case");
var EventSourceMapping = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::Lambda::EventSourceMapping", id, props);
    this.props = props;
  }
  setOnFailure(arn) {
    this.props.onFailure = arn;
    return this;
  }
  toState() {
    return {
      document: {
        Enabled: true,
        FunctionName: this.props.functionArn,
        EventSourceArn: this.props.sourceArn,
        ...this.attr("BatchSize", this.props.batchSize),
        ...this.attr("MaximumBatchingWindowInSeconds", this.props.maxBatchingWindow, import_duration12.toSeconds),
        ...this.attr("MaximumRecordAgeInSeconds", this.props.maxRecordAge, import_duration12.toSeconds),
        ...this.attr("MaximumRetryAttempts", this.props.retryAttempts),
        ...this.attr("ParallelizationFactor", this.props.parallelizationFactor),
        ...this.attr("TumblingWindowInSeconds", this.props.tumblingWindow, import_duration12.toSeconds),
        ...this.attr("BisectBatchOnFunctionError", this.props.bisectBatchOnError),
        ...this.attr("StartingPosition", this.props.startingPosition, import_change_case8.constantCase),
        ...this.attr("StartingPositionTimestamp", this.props.startingPositionTimestamp),
        ...this.props.maxConcurrency ? {
          ScalingConfig: {
            MaximumConcurrency: this.props.maxConcurrency
          }
        } : {},
        ...this.props.onFailure ? {
          DestinationConfig: {
            OnFailure: {
              Destination: this.props.onFailure
            }
          }
        } : {}
      }
    };
  }
};

// src/provider/aws/memorydb/index.ts
var memorydb_exports = {};
__export(memorydb_exports, {
  Cluster: () => Cluster,
  SubnetGroup: () => SubnetGroup
});

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
      document: {
        ClusterName: this.props.name,
        ClusterEndpoint: {
          Port: this.props.port
        },
        Port: this.props.port,
        ...this.attr("Description", this.props.description),
        ACLName: this.props.aclName,
        EngineVersion: unwrap(this.props.engine, "7.0"),
        ...this.attr("SubnetGroupName", this.props.subnetGroupName),
        ...this.attr("SecurityGroupIds", this.props.securityGroupIds),
        NodeType: "db." + unwrap(this.props.type),
        NumReplicasPerShard: unwrap(this.props.replicasPerShard, 1),
        NumShards: unwrap(this.props.shards, 1),
        TLSEnabled: unwrap(this.props.tls, false),
        DataTiering: unwrap(this.props.dataTiering) ? "true" : "false",
        AutoMinorVersionUpgrade: unwrap(this.props.autoMinorVersionUpgrade, true),
        MaintenanceWindow: unwrap(this.props.maintenanceWindow, "Sat:02:00-Sat:05:00")
      }
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
      document: {
        SubnetGroupName: this.props.name,
        SubnetIds: this.props.subnetIds,
        ...this.attr("Description", this.props.description)
      }
    };
  }
};

// src/provider/aws/open-search-serverless/index.ts
var open_search_serverless_exports = {};
__export(open_search_serverless_exports, {
  Collection: () => Collection
});

// src/provider/aws/open-search-serverless/collection.ts
var Collection = class extends CloudControlApiResource {
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
      document: {
        Name: this.props.name,
        Type: unwrap(this.props.type).toUpperCase(),
        ...this.attr("Description", this.props.description)
      }
    };
  }
};

// src/provider/aws/route53/index.ts
var route53_exports = {};
__export(route53_exports, {
  HostedZone: () => HostedZone,
  RecordSet: () => RecordSet,
  RecordSetProvider: () => RecordSetProvider,
  formatRecordSet: () => formatRecordSet
});

// src/provider/aws/route53/record-set.ts
var import_duration13 = require("@awsless/duration");
var formatRecordSet = (record) => {
  const name = unwrap(record.name);
  return {
    Name: name.endsWith(".") ? name : name + ".",
    Type: record.type,
    Weight: unwrap(record.weight, 0),
    // ...(record.ttl ? {} : {}),
    ..."records" in record ? {
      TTL: (0, import_duration13.toSeconds)(unwrap(record.ttl, (0, import_duration13.minutes)(5))),
      ResourceRecords: record.records
    } : {},
    ..."alias" in record && unwrap(record.alias) ? {
      AliasTarget: {
        DNSName: unwrap(record.alias).dnsName,
        HostedZoneId: unwrap(record.alias).hostedZoneId,
        EvaluateTargetHealth: unwrap(record.alias).evaluateTargetHealth
      }
    } : {}
    // ...unwrap(record.target).toJSON(),
  };
};
var RecordSet = class extends Resource {
  constructor(id, props) {
    super("AWS::Route53::RecordSet", id, props);
    this.props = props;
  }
  cloudProviderId = "aws-route53-record-set";
  toState() {
    return {
      document: {
        HostedZoneId: unwrap(this.props).hostedZoneId,
        ...formatRecordSet(unwrap(this.props))
      }
    };
  }
};

// src/provider/aws/route53/record-set-provider.ts
var import_client_route_53 = require("@aws-sdk/client-route-53");
var import_crypto2 = require("crypto");
var RecordSetProvider = class {
  client;
  constructor(props) {
    this.client = new import_client_route_53.Route53Client(props);
  }
  own(id) {
    return id === "aws-route53-record-set";
  }
  async get({ id, document }) {
    const result = await this.client.send(
      new import_client_route_53.ListResourceRecordSetsCommand({
        HostedZoneId: document.HostedZoneId,
        MaxItems: 1,
        StartRecordIdentifier: id,
        StartRecordName: document.Name,
        StartRecordType: document.Type
      })
    );
    return result.ResourceRecordSets?.at(0);
  }
  formatRecordSet(id, document) {
    return {
      Name: document.Name,
      Type: document.Type,
      ResourceRecords: document.ResourceRecords?.map((Value) => ({ Value })),
      Weight: document.Weight,
      TTL: document.TTL,
      SetIdentifier: id,
      AliasTarget: document.AliasTarget
    };
  }
  async create({ document }) {
    const id = (0, import_crypto2.randomUUID)();
    await this.client.send(
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
  }
  async update({ id, oldDocument, newDocument }) {
    if (oldDocument.HostedZoneId !== newDocument.HostedZoneId) {
      throw new Error(`RecordSet hosted zone id can't be changed after creation.`);
    }
    if (oldDocument.Name !== newDocument.Name) {
      throw new Error(`RecordSet name id can't be changed after creation.`);
    }
    if (oldDocument.Type !== newDocument.Type) {
      throw new Error(`RecordSet type can't be changed after creation.`);
    }
    await this.client.send(
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
  }
  async delete({ id, document }) {
    await this.client.send(
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
  }
};

// src/provider/aws/route53/hosted-zone.ts
var HostedZone = class extends CloudControlApiResource {
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
  addRecord(id, record) {
    const recordSet = new RecordSet(
      id,
      all([this.id, record]).apply(([hostedZoneId, record2]) => ({
        hostedZoneId,
        ...record2
      }))
    );
    this.add(recordSet);
    return recordSet;
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

// src/provider/aws/s3/index.ts
var s3_exports = {};
__export(s3_exports, {
  Bucket: () => Bucket,
  BucketObject: () => BucketObject,
  BucketObjectProvider: () => BucketObjectProvider,
  BucketPolicy: () => BucketPolicy,
  BucketProvider: () => BucketProvider,
  StateProvider: () => StateProvider
});

// src/provider/aws/s3/bucket-object.ts
var BucketObject = class extends Resource {
  constructor(id, props) {
    super("AWS::S3::Bucket::Object", id, props);
    this.props = props;
  }
  cloudProviderId = "aws-s3-bucket-object";
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
  }
  cloudProviderId = "aws-s3-bucket";
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
    const object = new BucketObject(id, {
      ...props,
      bucket: this.name
    });
    this.add(object);
    return object;
  }
  toState() {
    return {
      extra: {
        forceDelete: this.props.forceDelete
      },
      document: {
        BucketName: unwrap(this.props.name, this.identifier),
        // AccessControl: pascalCase(unwrap(this.props.accessControl, 'private')),
        ...unwrap(this.props.versioning, false) ? {
          VersioningConfiguration: {
            Status: "Enabled"
          }
        } : {},
        ...this.props.website ? {
          WebsiteConfiguration: {
            IndexDocument: unwrap(this.props.website).indexDocument,
            ErrorDocument: unwrap(this.props.website).errorDocument
          }
        } : {},
        ...this.props.cors ? {
          CorsConfiguration: {
            CorsRules: unwrap(this.props.cors, []).map((rule) => unwrap(rule)).map((rule) => ({
              MaxAge: rule.maxAge,
              AllowedHeaders: rule.headers,
              AllowedMethods: rule.methods,
              AllowedOrigins: rule.origins,
              ExposedHeaders: rule.exposeHeaders
            }))
          }
        } : {}
      }
    };
  }
};

// src/provider/aws/s3/bucket-provider.ts
var import_client_s3 = require("@aws-sdk/client-s3");
var BucketProvider = class {
  client;
  cloudProvider;
  constructor(props) {
    this.client = new import_client_s3.S3Client(props);
    this.cloudProvider = props.cloudProvider;
  }
  own(id) {
    return id === "aws-s3-bucket";
  }
  async get(props) {
    return this.cloudProvider.get(props);
  }
  async create(props) {
    return this.cloudProvider.create(props);
  }
  async update(props) {
    return this.cloudProvider.update(props);
  }
  async delete(props) {
    if (props.extra.forceDelete) {
      await this.emptyBucket(props.document.BucketName);
    }
    return this.cloudProvider.delete(props);
  }
  async emptyBucket(bucket) {
    await Promise.all([
      //
      this.deleteBucketObjects(bucket),
      this.deleteBucketObjectVersions(bucket)
    ]);
  }
  async deleteBucketObjects(bucket) {
    while (true) {
      const result = await this.client.send(
        new import_client_s3.ListObjectsV2Command({
          Bucket: bucket,
          MaxKeys: 1e3
        })
      );
      if (!result.Contents || result.Contents.length === 0) {
        break;
      }
      await this.client.send(
        new import_client_s3.DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: result.Contents.map((object) => ({
              Key: object.Key
            }))
          }
        })
      );
    }
  }
  async deleteBucketObjectVersions(bucket) {
    while (true) {
      const result = await this.client.send(
        new import_client_s3.ListObjectVersionsCommand({
          Bucket: bucket,
          MaxKeys: 1e3
        })
      );
      const objects = [...result.DeleteMarkers ?? [], ...result.Versions ?? []];
      if (objects.length === 0) {
        break;
      }
      await this.client.send(
        new import_client_s3.DeleteObjectsCommand({
          Bucket: bucket,
          Delete: {
            Objects: objects.map((object) => ({
              Key: object.Key,
              VersionId: object.VersionId
            }))
          }
        })
      );
    }
  }
};

// src/provider/aws/s3/bucket-policy.ts
var import_change_case9 = require("change-case");
var BucketPolicy = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::S3::BucketPolicy", id);
    this.props = props;
  }
  toState() {
    return {
      document: {
        Bucket: this.props.bucketName,
        PolicyDocument: {
          Version: this.props.version ?? "2012-10-17",
          Statement: unwrap(this.props.statements, []).map((s) => unwrap(s)).map((statement) => ({
            Effect: (0, import_change_case9.capitalCase)(statement.effect ?? "allow"),
            ...statement.principal ? {
              Principal: {
                Service: statement.principal
              }
            } : {},
            Action: statement.actions,
            Resource: statement.resources,
            ...statement.sourceArn ? {
              Condition: {
                StringEquals: {
                  "AWS:SourceArn": statement.sourceArn
                }
              }
            } : {}
          }))
        }
      }
    };
  }
};

// src/provider/aws/s3/bucket-object-provider.ts
var import_client_s32 = require("@aws-sdk/client-s3");
var BucketObjectProvider = class {
  client;
  constructor(props) {
    this.client = new import_client_s32.S3Client(props);
  }
  own(id) {
    return id === "aws-s3-bucket-object";
  }
  async get({ document }) {
    const result = await this.client.send(
      new import_client_s32.GetObjectAttributesCommand({
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
  }
  async create({ document, assets }) {
    await this.client.send(
      new import_client_s32.PutObjectCommand({
        Bucket: document.bucket,
        Key: document.key,
        Body: assets.body?.data
      })
    );
    return JSON.stringify([document.bucket, document.key]);
  }
  async update({ oldDocument, newDocument, assets }) {
    if (oldDocument.bucket !== newDocument.bucket) {
      throw new Error(`BucketObject can't change the bucket name`);
    }
    if (oldDocument.key !== newDocument.key) {
      await this.client.send(
        new import_client_s32.DeleteObjectCommand({
          Bucket: oldDocument.bucket,
          Key: oldDocument.key
        })
      );
    }
    await this.client.send(
      new import_client_s32.PutObjectCommand({
        Bucket: newDocument.bucket,
        Key: newDocument.key,
        Body: assets.body?.data
      })
    );
    return JSON.stringify([newDocument.bucket, newDocument.key]);
  }
  async delete({ document }) {
    await this.client.send(
      new import_client_s32.DeleteObjectCommand({
        Bucket: document.bucket,
        Key: document.key
      })
    );
  }
};

// src/provider/aws/s3/state-provider.ts
var StateProvider = class {
  async lock(urn) {
    console.log("LOCK", urn);
    return async () => {
      console.log("UNLOCK", urn);
    };
  }
  async get(urn) {
    console.log("LOAD APP STATE", urn);
    return {};
  }
  async update(urn, state) {
    console.log("UPDATE APP STATE", urn, state);
  }
  async delete(urn) {
    console.log("DELETE APP STATE", urn);
  }
};

// src/provider/aws/ses/index.ts
var ses_exports = {};
__export(ses_exports, {
  ConfigurationSet: () => ConfigurationSet,
  EmailIdentity: () => EmailIdentity
});

// src/provider/aws/ses/email-identity.ts
var import_change_case10 = require("change-case");
var import_duration14 = require("@awsless/duration");
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
    const ttl = (0, import_duration14.minutes)(5);
    return [
      ...this.dkimDnsTokens.map((token) => ({
        name: token.apply((token2) => token2.name),
        type: "CNAME",
        ttl,
        records: [token.apply((token2) => token2.value)]
      })),
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
      document: {
        EmailIdentity: this.props.emailIdentity,
        ...this.props.configurationSetName ? {
          ConfigurationSetAttributes: {
            ConfigurationSetName: this.props.configurationSetName
          }
        } : {},
        ...this.props.dkim ? {
          DkimAttributes: {
            SigningEnabled: true
          },
          DkimSigningAttributes: {
            NextSigningKeyLength: (0, import_change_case10.constantCase)(unwrap(this.props.dkim))
          }
        } : {},
        FeedbackAttributes: {
          EmailForwardingEnabled: unwrap(this.props.feedback, false)
        },
        MailFromAttributes: {
          MailFromDomain: this.props.mailFromDomain,
          BehaviorOnMxFailure: unwrap(this.props.rejectOnMxFailure, true) ? "REJECT_MESSAGE" : "USE_DEFAULT_VALUE"
        }
      }
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

// src/provider/aws/sns/index.ts
var sns_exports = {};
__export(sns_exports, {
  Subscription: () => Subscription,
  SubscriptionProvider: () => SubscriptionProvider,
  Topic: () => Topic
});

// src/provider/aws/sns/subscription-provider.ts
var import_client_sns = require("@aws-sdk/client-sns");
var SubscriptionProvider = class {
  client;
  constructor(props) {
    this.client = new import_client_sns.SNSClient(props);
  }
  own(id) {
    return id === "aws-sns-subscription";
  }
  async get({ id }) {
    const result = await this.client.send(
      new import_client_sns.GetSubscriptionAttributesCommand({
        SubscriptionArn: id
      })
    );
    return result.Attributes;
  }
  async create({ document }) {
    const result = await this.client.send(
      new import_client_sns.SubscribeCommand({
        ...document,
        ReturnSubscriptionArn: true
      })
    );
    return result.SubscriptionArn;
  }
  async update({}) {
    throw new Error(`SNS Subscription can't be changed after creation.`);
    return "";
  }
  async delete({ id }) {
    await this.client.send(
      new import_client_sns.UnsubscribeCommand({
        SubscriptionArn: id
      })
    );
  }
};

// src/provider/aws/sns/subscription.ts
var Subscription = class extends Resource {
  constructor(id, props) {
    super("AWS::SNS::Subscription", id, props);
    this.props = props;
  }
  cloudProviderId = "aws-sns-subscription";
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
var Topic = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::SNS::Topic", id, props);
    this.props = props;
  }
  get arn() {
    return this.output((v) => v.TopicArn);
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

// src/provider/aws/sqs/index.ts
var sqs_exports = {};
__export(sqs_exports, {
  Queue: () => Queue
});

// src/provider/aws/sqs/queue.ts
var import_duration15 = require("@awsless/duration");
var import_size2 = require("@awsless/size");
var Queue = class extends CloudControlApiResource {
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
      document: {
        QueueName: this.props.name,
        Tags: [{ Key: "name", Value: this.props.name }],
        DelaySeconds: (0, import_duration15.toSeconds)(unwrap(this.props.deliveryDelay, (0, import_duration15.seconds)(0))),
        MaximumMessageSize: (0, import_size2.toBytes)(unwrap(this.props.maxMessageSize, (0, import_size2.kibibytes)(256))),
        MessageRetentionPeriod: (0, import_duration15.toSeconds)(unwrap(this.props.retentionPeriod, (0, import_duration15.days)(4))),
        ReceiveMessageWaitTimeSeconds: (0, import_duration15.toSeconds)(unwrap(this.props.receiveMessageWaitTime, (0, import_duration15.seconds)(0))),
        VisibilityTimeout: (0, import_duration15.toSeconds)(unwrap(this.props.visibilityTimeout, (0, import_duration15.seconds)(30))),
        ...this.props.deadLetterArn ? {
          RedrivePolicy: {
            deadLetterTargetArn: this.props.deadLetterArn,
            maxReceiveCount: unwrap(this.props.maxReceiveCount, 100)
          }
        } : {}
      }
    };
  }
};

// src/provider/aws/cloud.ts
var createCloudProviders = (config) => {
  const cloudControlApiProvider = new CloudControlApiProvider(config);
  return [
    //
    cloudControlApiProvider,
    new BucketProvider({ ...config, cloudProvider: cloudControlApiProvider }),
    new BucketObjectProvider(config),
    new TableItemProvider(config),
    new RecordSetProvider(config),
    new CertificateProvider(config),
    new CertificateValidationProvider(config),
    new GraphQLApiProvider(config),
    new GraphQLSchemaProvider(config),
    new DataSourceProvider(config),
    new SubscriptionProvider(config)
  ];
};

// src/provider/local/index.ts
var local_exports = {};
__export(local_exports, {
  StateProvider: () => LocalStateProvider
});

// src/provider/local/state-provider.ts
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
  async mkdir() {
    await (0, import_promises.mkdir)(this.props.dir, {
      recursive: true
    });
  }
  async lock(urn) {
    await this.mkdir();
    return (0, import_proper_lockfile.lock)(this.lockFile(urn), {
      realpath: false
    });
  }
  async get(urn) {
    let json;
    try {
      json = await (0, import_promises.readFile)((0, import_path.join)(this.stateFile(urn)), "utf8");
    } catch (error) {
      return {};
    }
    return JSON.parse(json);
  }
  async update(urn, state) {
    await this.mkdir();
    await (0, import_promises.writeFile)(this.stateFile(urn), JSON.stringify(state, void 0, 2));
  }
  async delete(urn) {
    await this.mkdir();
    await (0, import_promises.rm)(this.stateFile(urn));
  }
};

// examples/resources/cron.ts
var import_duration16 = require("@awsless/duration");
var region = "eu-west-1";
var credentials = (0, import_credential_providers.fromIni)({
  profile: "jacksclub"
});
var workspace = new WorkSpace({
  cloudProviders: aws_exports.createCloudProviders({
    region,
    credentials,
    timeout: (0, import_duration16.minutes)(15)
  }),
  stateProvider: new local_exports.StateProvider({
    dir: "./examples/resources/state"
  })
  // stateProvider: new aws.dynamodb.DynamoDBStateProvider({
  // 	region,
  // 	credentials,
  // 	tableName: 'awsless-state',
  // }),
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
  (e) => console.log(
    //
    /* @__PURE__ */ new Date(),
    `[${e.type}]`.padEnd(30),
    e.operation.toUpperCase(),
    e.status.toUpperCase(),
    e.reason?.message ?? ""
  )
);
var app = new App("test-formation-cron");
var stack = new Stack("cron");
app.add(stack);
var main = async () => {
  await workspace.deployStack(stack);
};
main();