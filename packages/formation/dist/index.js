var __defProp = Object.defineProperty;
var __export = (target, all2) => {
  for (var name in all2)
    __defProp(target, name, { get: all2[name], enumerable: true });
};

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
var ResourceAlreadyExists = class extends Error {
};
var ImportValueNotFound = class extends Error {
  constructor(stack, key) {
    super(`Import value "${key}" doesn't exist for the "${stack}" stack`);
  }
};

// src/core/stack.ts
var Stack = class extends Node {
  constructor(name) {
    super("Stack", name);
    this.name = name;
  }
  exported = {};
  dependencies = /* @__PURE__ */ new Set();
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
  add(stack) {
    if (stack instanceof Stack) {
      return super.add(stack);
    }
    throw new TypeError("You can only add stacks to an app");
  }
  import(stack, key) {
    return new Output([], (resolve) => {
      const get = (data) => {
        if (typeof data[stack]?.[key] !== "undefined") {
          resolve(data[stack][key]);
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

// src/core/asset.ts
import { readFile } from "fs/promises";
var Asset = class {
  static fromJSON(json) {
    return new StringAsset(JSON.stringify(json));
  }
  static fromString(string, encoding = "utf8") {
    return new StringAsset(string, encoding);
  }
  static fromFile(path) {
    return new FileAsset(path);
  }
  static fromRemote(url) {
    return new RemoteAsset(url);
  }
};
var StringAsset = class extends Asset {
  constructor(value, encoding = "utf8") {
    super();
    this.value = value;
    this.encoding = encoding;
  }
  async load() {
    return Buffer.from(this.value, this.encoding);
  }
};
var FileAsset = class extends Asset {
  constructor(path) {
    super();
    this.path = path;
  }
  async load() {
    return readFile(this.path);
  }
};
var RemoteAsset = class extends Asset {
  constructor(url) {
    super();
    this.url = url;
  }
  async load() {
    const response = await fetch(this.url);
    const data = await response.arrayBuffer();
    return Buffer.from(data);
  }
};

// src/core/workspace.ts
import EventEmitter from "events";
import { run } from "promise-dag";
var WorkSpace = class extends EventEmitter {
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
  async diffStack(stack) {
    const app = stack.parent;
    if (!app || !(app instanceof App)) {
      throw new StackError([], "Stack must belong to an App");
    }
    const appState = await this.props.stateProvider.get(app.urn);
    const stackState = appState[stack.urn] = appState[stack.urn] ?? {
      name: stack.name,
      exports: {},
      resources: {}
    };
    const resources = stack.resources;
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
  async deployStack(stack) {
    const app = stack.parent;
    if (!app || !(app instanceof App)) {
      throw new StackError([], "Stack must belong to an App");
    }
    return this.lockedOperation(app.urn, async () => {
      const appState = await this.props.stateProvider.get(app.urn);
      const stackState = appState[stack.urn] = appState[stack.urn] ?? {
        name: stack.name,
        exports: {},
        resources: {}
      };
      const resources = stack.resources;
      app.setExportedData(this.getExportedData(appState));
      this.emit("stack", {
        urn: stack.urn,
        operation: "deploy",
        status: "in-progress",
        stack
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
          await this.deleteStackResources(app.urn, appState, stackState, deleteResourcesBefore);
        }
        await this.deployStackResources(app.urn, appState, stackState, resources);
        if (Object.keys(deleteResourcesAfter).length > 0) {
          await this.deleteStackResources(app.urn, appState, stackState, deleteResourcesAfter);
        }
      } catch (error) {
        this.emit("stack", {
          urn: stack.urn,
          operation: "deploy",
          status: "error",
          stack,
          reason: error
        });
        throw error;
      }
      stackState.exports = this.unwrapDocument(stack.urn, stack.exported);
      await this.props.stateProvider.update(app.urn, appState);
      this.emit("stack", {
        urn: stack.urn,
        operation: "deploy",
        status: "success",
        stack
      });
      return stackState;
    });
  }
  async deleteStack(stack) {
    const app = stack.parent;
    if (!app || !(app instanceof App)) {
      throw new StackError([], "Stack must belong to an App");
    }
    return this.lockedOperation(app.urn, async () => {
      const appState = await this.props.stateProvider.get(app.urn);
      const stackState = appState[stack.urn];
      if (!stackState) {
        throw new StackError([], `Stack already deleted: ${stack.name}`);
      }
      this.emit("stack", {
        urn: stack.urn,
        operation: "delete",
        status: "in-progress",
        stack
      });
      try {
        await this.deleteStackResources(app.urn, appState, stackState, stackState.resources);
      } catch (error) {
        this.emit("stack", {
          urn: stack.urn,
          operation: "delete",
          status: "error",
          stack,
          reason: error
        });
        throw error;
      }
      delete appState[stack.urn];
      await this.props.stateProvider.update(app.urn, appState);
      this.emit("stack", {
        urn: stack.urn,
        operation: "delete",
        status: "success",
        stack
      });
    });
  }
  async getRemoteResource(props) {
    this.emit("resource", {
      urn: props.urn,
      type: props.type,
      operation: "get",
      status: "in-progress"
    });
    let remote;
    try {
      remote = await props.provider.get(props);
    } catch (error) {
      const resourceError = ResourceError.wrap(props.urn, props.type, "get", error);
      this.emit("resource", {
        urn: props.urn,
        type: props.type,
        operation: "get",
        status: "error",
        reason: resourceError
      });
      throw resourceError;
    }
    this.emit("resource", {
      urn: props.urn,
      type: props.type,
      operation: "get",
      status: "success"
    });
    return remote;
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
            const remote = await this.getRemoteResource({
              id,
              urn: resource.urn,
              type: resource.type,
              document,
              extra,
              provider
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
            const remote = await this.getRemoteResource({
              id,
              urn: resource.urn,
              type: resource.type,
              document,
              extra,
              provider
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
    const results = await Promise.allSettled(Object.values(run(deployGraph)));
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
    const results = await Promise.allSettled(Object.values(run(deleteGraph)));
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
          const remote = await this.getRemoteResource({
            urn,
            id: resourceState.id,
            type: resourceState.type,
            document: resourceState.local,
            extra: resourceState.extra,
            provider
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
  elb: () => elb_exports,
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
import {
  ACMClient,
  DeleteCertificateCommand,
  DescribeCertificateCommand,
  RequestCertificateCommand,
  ResourceNotFoundException
} from "@aws-sdk/client-acm";

// src/core/hash.ts
import { createHash } from "crypto";
var sha256 = (data) => {
  return createHash("sha256").update(JSON.stringify(data)).digest("hex");
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
  client(region = this.props.region) {
    if (!this.clients[region]) {
      this.clients[region] = new ACMClient({
        ...this.props,
        region
      });
    }
    return this.clients[region];
  }
  async get({ id, extra }) {
    const client = this.client(extra.region);
    while (true) {
      const result = await client.send(
        new DescribeCertificateCommand({
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
      new RequestCertificateCommand({
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
        new DeleteCertificateCommand({
          CertificateArn: id
        })
      );
    } catch (error) {
      if (error instanceof ResourceNotFoundException) {
        throw new ResourceNotFound(error.message);
      }
      throw error;
    }
  }
};

// src/provider/aws/acm/certificate-validation-provider.ts
import { ACMClient as ACMClient2, DescribeCertificateCommand as DescribeCertificateCommand2 } from "@aws-sdk/client-acm";
var CertificateValidationProvider = class {
  constructor(props) {
    this.props = props;
  }
  clients = {};
  own(id) {
    return id === "aws-acm-certificate-validation";
  }
  client(region = this.props.region) {
    if (!this.clients[region]) {
      this.clients[region] = new ACMClient2({
        ...this.props,
        region
      });
    }
    return this.clients[region];
  }
  wait(delay) {
    return new Promise((r) => setTimeout(r, delay));
  }
  async get({ id, document }) {
    const client = this.client(document.Region);
    while (true) {
      const result = await client.send(
        new DescribeCertificateCommand2({
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
      document: {
        Region: this.props.region,
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
import {
  AppSyncClient,
  CreateDataSourceCommand,
  DeleteDataSourceCommand,
  GetDataSourceCommand,
  NotFoundException,
  UpdateDataSourceCommand
} from "@aws-sdk/client-appsync";
var DataSourceProvider = class {
  client;
  constructor(props) {
    this.client = new AppSyncClient(props);
  }
  own(id) {
    return id === "aws-appsync-data-source";
  }
  async get({ document }) {
    const result = await this.client.send(
      new GetDataSourceCommand({
        apiId: document.apiId,
        name: document.name
      })
    );
    return result.dataSource;
  }
  async create({ document }) {
    await this.client.send(new CreateDataSourceCommand(document));
    return JSON.stringify([document.apiId, document.name]);
  }
  async update({ id, oldDocument, newDocument }) {
    if (oldDocument.apiId !== newDocument.apiId) {
      throw new Error(`DataSource can't update apiId`);
    }
    if (oldDocument.name !== newDocument.name) {
      throw new Error(`DataSource can't update name`);
    }
    await this.client.send(new UpdateDataSourceCommand(newDocument));
    return id;
  }
  async delete({ document }) {
    try {
      await this.client.send(
        new DeleteDataSourceCommand({
          apiId: document.apiId,
          name: document.name
        })
      );
    } catch (error) {
      if (error instanceof NotFoundException) {
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
import {
  AppSyncClient as AppSyncClient2,
  CreateGraphqlApiCommand,
  DeleteGraphqlApiCommand,
  GetGraphqlApiCommand,
  NotFoundException as NotFoundException2,
  UpdateGraphqlApiCommand
} from "@aws-sdk/client-appsync";
var GraphQLApiProvider = class {
  client;
  constructor(props) {
    this.client = new AppSyncClient2(props);
  }
  own(id) {
    return id === "aws-appsync-graphql-api";
  }
  async get({ id }) {
    const result = await this.client.send(
      new GetGraphqlApiCommand({
        apiId: id
      })
    );
    return result.graphqlApi;
  }
  async create({ document }) {
    const result = await this.client.send(new CreateGraphqlApiCommand(document));
    return result.graphqlApi?.apiId;
  }
  async update({ id, newDocument }) {
    await this.client.send(
      new UpdateGraphqlApiCommand({
        apiId: id,
        ...newDocument
      })
    );
    return id;
  }
  async delete({ id }) {
    try {
      await this.client.send(
        new DeleteGraphqlApiCommand({
          apiId: id
        })
      );
    } catch (error) {
      if (error instanceof NotFoundException2) {
        throw new ResourceNotFound(error.message);
      }
      throw error;
    }
  }
};

// src/provider/aws/appsync/graphql-api.ts
import { toSeconds } from "@awsless/duration";
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
  // assignDomainName(
  // 	id: string,
  // 	props: {
  // 		domainName: Input<string>
  // 		certificateArn: Input<ARN>
  // 	}
  // ) {
  // 	const domain = new DomainName(id, props)
  // 	this.add(domain)
  // 	// const association = new DomainNameApiAssociation(id, {
  // 	// 	apiId: this.id,
  // 	// 	domainName: domain.domainName,
  // 	// })
  // 	// domain.add(association)
  // 	return domain
  // }
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
          defaultAction: prop2.defaultAction ?? "ALLOW",
          ...this.attr("awsRegion", prop2.region),
          ...this.attr("appIdClientRegex", prop2.appIdClientRegex)
        }
      };
    }
    const prop = props;
    return {
      authenticationType: "AWS_LAMBDA",
      lambdaAuthorizerConfig: {
        authorizerUri: prop.functionArn,
        ...this.attr("authorizerResultTtlInSeconds", prop.resultTtl && toSeconds(unwrap(prop.resultTtl))),
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
import {
  AppSyncClient as AppSyncClient3,
  DeleteGraphqlApiCommand as DeleteGraphqlApiCommand2,
  GetSchemaCreationStatusCommand,
  NotFoundException as NotFoundException3,
  StartSchemaCreationCommand
} from "@aws-sdk/client-appsync";
var GraphQLSchemaProvider = class {
  client;
  constructor(props) {
    this.client = new AppSyncClient3(props);
  }
  own(id) {
    return id === "aws-appsync-graphql-schema";
  }
  async get({ id }) {
    while (true) {
      const result = await this.client.send(
        new GetSchemaCreationStatusCommand({
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
      new StartSchemaCreationCommand({
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
      new StartSchemaCreationCommand({
        apiId: newDocument.apiId,
        definition: assets.definition?.data
      })
    );
    return newDocument.apiId;
  }
  async delete({ id }) {
    try {
      await this.client.send(
        new DeleteGraphqlApiCommand2({
          apiId: id
        })
      );
    } catch (error) {
      if (error instanceof NotFoundException3) {
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
import {
  CloudControlClient,
  CreateResourceCommand,
  DeleteResourceCommand,
  GetResourceCommand,
  GetResourceRequestStatusCommand,
  UpdateResourceCommand
} from "@aws-sdk/client-cloudcontrol";
import { createPatch } from "rfc6902";
import { minutes, toMilliSeconds } from "@awsless/duration";
var CloudControlApiProvider = class {
  constructor(props) {
    this.props = props;
    this.client = new CloudControlClient(props);
  }
  client;
  own(id) {
    return id === "aws-cloud-control-api";
  }
  async progressStatus(event) {
    const token = event.RequestToken;
    const start = /* @__PURE__ */ new Date();
    const timeout = Number(toMilliSeconds(this.props.timeout ?? minutes(1)));
    while (true) {
      if (event.OperationStatus === "SUCCESS") {
        return event.Identifier;
      }
      if (event.OperationStatus === "FAILED") {
        if (event.ErrorCode === "AlreadyExists") {
        }
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
        new GetResourceRequestStatusCommand({
          RequestToken: token
        })
      );
      event = status.ProgressEvent;
    }
  }
  updateOperations(remoteDocument, oldDocument, newDocument) {
    for (const key in oldDocument) {
      if (typeof remoteDocument[key]) {
        delete oldDocument[key];
      }
    }
    const operations = createPatch(oldDocument, newDocument);
    return operations;
  }
  async get({ id, type }) {
    const result = await this.client.send(
      new GetResourceCommand({
        TypeName: type,
        Identifier: id
      })
    );
    return JSON.parse(result.ResourceDescription.Properties);
  }
  async create({ type, document }) {
    const result = await this.client.send(
      new CreateResourceCommand({
        TypeName: type,
        DesiredState: JSON.stringify(document)
      })
    );
    return this.progressStatus(result.ProgressEvent);
  }
  async update({ type, id, oldDocument, newDocument, remoteDocument }) {
    const result = await this.client.send(
      new UpdateResourceCommand({
        TypeName: type,
        Identifier: id,
        PatchDocument: JSON.stringify(this.updateOperations(remoteDocument, oldDocument, newDocument))
      })
    );
    return this.progressStatus(result.ProgressEvent);
  }
  async delete({ type, id }) {
    const result = await this.client.send(
      new DeleteResourceCommand({
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
  InvalidateCache: () => InvalidateCache,
  InvalidateCacheProvider: () => InvalidateCacheProvider,
  OriginAccessControl: () => OriginAccessControl,
  OriginRequestPolicy: () => OriginRequestPolicy,
  ResponseHeadersPolicy: () => ResponseHeadersPolicy
});

// src/provider/aws/cloud-front/cache-policy.ts
import { toSeconds as toSeconds2 } from "@awsless/duration";
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
          MinTTL: toSeconds2(unwrap(this.props.minTtl)),
          MaxTTL: toSeconds2(unwrap(this.props.maxTtl)),
          DefaultTTL: toSeconds2(unwrap(this.props.defaultTtl)),
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

// src/provider/aws/cloud-front/distribution.ts
import { toSeconds as toSeconds3 } from "@awsless/duration";
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
              item.cacheMinTTL && toSeconds3(unwrap(item.cacheMinTTL))
            ),
            ...this.attr("ResponseCode", item.responseCode),
            ...this.attr("ResponsePagePath", item.responsePath)
          })),
          DefaultCacheBehavior: {
            TargetOriginId: this.props.targetOriginId,
            ViewerProtocolPolicy: unwrap(this.props.viewerProtocol, "redirect-to-https"),
            AllowedMethods: unwrap(this.props.allowMethod, ["GET", "HEAD", "OPTIONS"]),
            Compress: unwrap(this.props.compress, false),
            ...this.attr("DefaultRootObject", this.props.defaultRootObject),
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

// src/provider/aws/cloud-front/invalidate-cache-provider.ts
import { CloudFrontClient, CreateInvalidationCommand } from "@aws-sdk/client-cloudfront";
var InvalidateCacheProvider = class {
  client;
  constructor(props) {
    this.client = new CloudFrontClient(props);
  }
  own(id) {
    return id === "aws-cloud-front-invalidate-cache";
  }
  async invalidate(document) {
    const id = sha256(JSON.stringify(document.Versions));
    await this.client.send(
      new CreateInvalidationCommand({
        DistributionId: document.DistributionId,
        InvalidationBatch: {
          CallerReference: id,
          Paths: {
            Items: document.Paths,
            Quantity: document.Paths.length
          }
        }
      })
    );
    return id;
  }
  async get() {
    return {};
  }
  async create({ document }) {
    return this.invalidate(document);
  }
  async update({ newDocument }) {
    return this.invalidate(newDocument);
  }
  async delete() {
  }
};

// src/provider/aws/cloud-front/invalidate-cache.ts
var InvalidateCache = class extends Resource {
  constructor(id, props) {
    super("AWS::CloudFront::InvalidateCache", id, props);
    this.props = props;
  }
  cloudProviderId = "aws-cloud-front-invalidate-cache";
  toState() {
    return {
      document: {
        DistributionId: this.props.distributionId,
        Versions: this.props.versions,
        Paths: this.props.paths
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
import { camelCase } from "change-case";
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
            CookieBehavior: camelCase(unwrap(cookie?.behavior, "all")),
            ...this.attr("Cookies", cookie?.values)
          },
          HeadersConfig: {
            HeaderBehavior: camelCase(unwrap(header?.behavior, "all-viewer")),
            ...this.attr("Headers", header?.values)
          },
          QueryStringsConfig: {
            QueryStringBehavior: camelCase(unwrap(query?.behavior, "all")),
            ...this.attr("QueryStrings", query?.values)
          }
        }
      }
    };
  }
};

// src/provider/aws/cloud-front/response-headers-policy.ts
import { days, toSeconds as toSeconds4 } from "@awsless/duration";
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
            AccessControlMaxAgeSec: toSeconds4(unwrap(cors.maxAge, days(365))),
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
              AccessControlMaxAgeSec: toSeconds4(unwrap(strictTransportSecurity.maxAge, days(365))),
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
import { toDays } from "@awsless/duration";
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
        ...this.attr("RetentionInDays", this.props.retention && toDays(unwrap(this.props.retention)))
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
  UserPoolDomain: () => UserPoolDomain
});

// src/provider/aws/cognito/user-pool-client.ts
import { toDays as toDays2, toHours, toMinutes } from "@awsless/duration";
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
          validity.authSession && toMinutes(unwrap(validity.authSession))
        ),
        ...this.attr("AccessTokenValidity", validity.accessToken && toHours(unwrap(validity.accessToken))),
        ...this.attr("IdTokenValidity", validity.idToken && toHours(unwrap(validity.idToken))),
        ...this.attr(
          "RefreshTokenValidity",
          validity.refreshToken && toDays2(unwrap(validity.refreshToken))
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
import { constantCase } from "change-case";
import { days as days2, toDays as toDays3 } from "@awsless/duration";
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
    const email = unwrap(this.props.email);
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
        ...this.attr(
          "EmailConfiguration",
          email && {
            ...this.attr("EmailSendingAccount", email.type, constantCase),
            ...this.attr("From", email.from),
            ...this.attr("ReplyToEmailAddress", email.replyTo),
            ...this.attr("SourceArn", email.sourceArn)
          }
        ),
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
            TemporaryPasswordValidityDays: toDays3(
              unwrap(password?.temporaryPasswordValidity, days2(7))
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

// src/provider/aws/dynamodb/index.ts
var dynamodb_exports = {};
__export(dynamodb_exports, {
  DynamoDBStateProvider: () => DynamoDBStateProvider,
  Table: () => Table,
  TableItem: () => TableItem,
  TableItemProvider: () => TableItemProvider
});

// src/provider/aws/dynamodb/state-provider.ts
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
import { DynamoDB, GetItemCommand, UpdateItemCommand } from "@aws-sdk/client-dynamodb";
var DynamoDBStateProvider = class {
  constructor(props) {
    this.props = props;
    this.client = new DynamoDB(props);
    this.id = Math.floor(Math.random() * 1e5);
  }
  client;
  id;
  async lock(urn) {
    await this.client.send(
      new UpdateItemCommand({
        TableName: this.props.tableName,
        Key: marshall({ urn }),
        UpdateExpression: "SET #lock = :id",
        ConditionExpression: "attribute_not_exists(#lock)",
        ExpressionAttributeNames: { "#lock": "lock" },
        ExpressionAttributeValues: { ":id": marshall(this.id) }
      })
    );
    return async () => {
      await this.client.send(
        new UpdateItemCommand({
          TableName: this.props.tableName,
          Key: marshall({ urn }),
          UpdateExpression: "REMOVE #lock",
          ConditionExpression: "#lock = :id",
          ExpressionAttributeNames: { "#lock": "lock" },
          ExpressionAttributeValues: { ":id": marshall(this.id) }
        })
      );
    };
  }
  async get(urn) {
    const result = await this.client.send(
      new GetItemCommand({
        TableName: this.props.tableName,
        Key: marshall({ urn })
      })
    );
    if (!result.Item) {
      return {};
    }
    const item = unmarshall(result.Item);
    return item.state ?? {};
  }
  async update(urn, state) {
    await this.client.send(
      new UpdateItemCommand({
        TableName: this.props.tableName,
        Key: marshall({ urn }),
        UpdateExpression: "SET #state = :state",
        ExpressionAttributeNames: { "#state": "state" },
        ExpressionAttributeValues: marshall(
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
      new UpdateItemCommand({
        TableName: this.props.tableName,
        Key: marshall({ urn }),
        UpdateExpression: "REMOVE #state",
        ExpressionAttributeNames: { "#state": "state" }
      })
    );
  }
};

// src/provider/aws/dynamodb/table-item-provider.ts
import { DeleteItemCommand, DynamoDB as DynamoDB2, PutItemCommand } from "@aws-sdk/client-dynamodb";
import { marshall as marshall2 } from "@aws-sdk/util-dynamodb";
var TableItemProvider = class {
  client;
  constructor(props) {
    this.client = new DynamoDB2(props);
  }
  own(id) {
    return id === "aws-dynamodb-table-item";
  }
  marshall(item) {
    return marshall2(item, {
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
      new PutItemCommand({
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
        new DeleteItemCommand({
          TableName: newDocument.table,
          Key: this.marshall(oldKey)
        })
      );
    }
    await this.client.send(
      new PutItemCommand({
        TableName: newDocument.table,
        Item: this.marshall(item)
      })
    );
    return JSON.stringify([newDocument.table, key]);
  }
  async delete({ id }) {
    const [table, oldKey] = JSON.parse(id);
    await this.client.send(
      new DeleteItemCommand({
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
import { constantCase as constantCase2 } from "change-case";
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
        TableClass: constantCase2(unwrap(this.props.class, "standard")),
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
            StreamViewType: constantCase2(unwrap(this.props.stream))
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
              ProjectionType: constantCase2(props.projection || "all")
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

// src/provider/aws/elb/index.ts
var elb_exports = {};
__export(elb_exports, {
  AuthCognitoAction: () => AuthCognitoAction,
  FixedResponseAction: () => FixedResponseAction,
  ForwardAction: () => ForwardAction,
  HttpRequestMethods: () => HttpRequestMethods,
  Listener: () => Listener,
  ListenerAction: () => ListenerAction,
  ListenerCondition: () => ListenerCondition,
  ListenerRule: () => ListenerRule,
  LoadBalancer: () => LoadBalancer,
  PathPattern: () => PathPattern,
  TargetGroup: () => TargetGroup
});

// src/provider/aws/elb/listener-action.ts
import { days as days3, toSeconds as toSeconds5 } from "@awsless/duration";
var ListenerAction = class {
  static authCognito(props) {
    return new AuthCognitoAction(props);
  }
  static fixedResponse(props) {
    return new FixedResponseAction(props);
  }
  static forward(targets) {
    return new ForwardAction({
      targetGroups: targets
    });
  }
};
var ForwardAction = class extends ListenerAction {
  constructor(props) {
    super();
    this.props = props;
  }
  toJSON() {
    return {
      Type: "forward",
      ForwardConfig: {
        TargetGroups: unwrap(this.props.targetGroups).map((target) => ({
          TargetGroupArn: target
        }))
      }
    };
  }
};
var FixedResponseAction = class extends ListenerAction {
  constructor(props) {
    super();
    this.props = props;
  }
  toJSON() {
    return {
      Type: "fixed-response",
      FixedResponseConfig: {
        StatusCode: unwrap(this.props.statusCode).toString(),
        ...this.props.contentType ? { ContentType: this.props.contentType } : {},
        ...this.props.messageBody ? { MessageBody: this.props.messageBody } : {}
      }
    };
  }
};
var AuthCognitoAction = class extends ListenerAction {
  constructor(props) {
    super();
    this.props = props;
  }
  toJSON() {
    const session = unwrap(this.props.session, {});
    const userPool = unwrap(this.props.userPool);
    return {
      Type: "authenticate-cognito",
      AuthenticateCognitoConfig: {
        OnUnauthenticatedRequest: unwrap(this.props.onUnauthenticated, "deny"),
        Scope: unwrap(this.props.scope, "openid"),
        SessionCookieName: unwrap(session.cookieName, "AWSELBAuthSessionCookie"),
        SessionTimeout: toSeconds5(unwrap(session.timeout, days3(7))),
        UserPoolArn: userPool.arn,
        UserPoolClientId: userPool.clientId,
        UserPoolDomain: userPool.domain
      }
    };
  }
};

// src/provider/aws/elb/listener-condition.ts
var ListenerCondition = class {
  static httpRequestMethods(methods) {
    return new HttpRequestMethods({ methods });
  }
  static pathPatterns(paths) {
    return new PathPattern({ paths });
  }
};
var HttpRequestMethods = class extends ListenerCondition {
  constructor(props) {
    super();
    this.props = props;
  }
  toJSON() {
    return {
      Field: "http-request-method",
      HttpRequestMethodConfig: {
        Values: this.props.methods
      }
    };
  }
};
var PathPattern = class extends ListenerCondition {
  constructor(props) {
    super();
    this.props = props;
  }
  toJSON() {
    return {
      Field: "path-pattern",
      PathPatternConfig: {
        Values: this.props.paths
      }
    };
  }
};

// src/provider/aws/elb/listener-rule.ts
var ListenerRule = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::ElasticLoadBalancingV2::ListenerRule", id, props);
    this.props = props;
  }
  get arn() {
    return this.output((v) => v.RuleArn);
  }
  toState() {
    return {
      document: {
        ListenerArn: this.props.listenerArn,
        Priority: this.props.priority,
        Conditions: unwrap(this.props.conditions).map((v) => unwrap(v)).map((condition) => condition.toJSON()),
        Actions: unwrap(this.props.actions).map((v) => unwrap(v)).map((action, i) => {
          return {
            Order: i + 1,
            ...action.toJSON()
          };
        })
      }
    };
  }
};

// src/provider/aws/elb/listener.ts
import { constantCase as constantCase3 } from "change-case";
var Listener = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::ElasticLoadBalancingV2::Listener", id, props);
    this.props = props;
  }
  get arn() {
    return this.output((v) => v.ListenerArn);
  }
  toState() {
    return {
      document: {
        LoadBalancerArn: this.props.loadBalancerArn,
        Port: this.props.port,
        Protocol: constantCase3(unwrap(this.props.protocol)),
        Certificates: unwrap(this.props.certificates).map((arn) => ({
          CertificateArn: arn
        })),
        ...this.attr(
          "DefaultActions",
          this.props.defaultActions && unwrap(this.props.defaultActions).map((action, i) => {
            return {
              Order: i + 1,
              ...unwrap(action).toJSON()
            };
          })
        )
      }
    };
  }
};

// src/provider/aws/elb/load-balancer.ts
var LoadBalancer = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::ElasticLoadBalancingV2::LoadBalancer", id, props);
    this.props = props;
  }
  get arn() {
    return this.output((v) => v.LoadBalancerArn);
  }
  get name() {
    return this.output((v) => v.LoadBalancerName);
  }
  get dnsName() {
    return this.output((v) => v.DNSName);
  }
  get fullName() {
    return this.output((v) => v.LoadBalancerFullName);
  }
  get hostedZoneId() {
    return this.output((v) => v.CanonicalHostedZoneID);
  }
  toState() {
    return {
      document: {
        Name: this.props.name,
        Type: this.props.type,
        Scheme: unwrap(this.props.schema, "internet-facing"),
        SecurityGroups: this.props.securityGroups,
        Subnets: this.props.subnets
      }
    };
  }
};

// src/provider/aws/elb/target-group.ts
var TargetGroup = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::ElasticLoadBalancingV2::TargetGroup", id, props);
    this.props = props;
  }
  get arn() {
    return this.output((v) => v.TargetGroupArn);
  }
  get fullName() {
    return this.output((v) => v.TargetGroupFullName);
  }
  toState() {
    return {
      document: {
        Name: this.props.name,
        TargetType: this.props.type,
        Targets: unwrap(this.props.targets).map((target) => ({
          Id: target
        }))
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
import { capitalCase } from "change-case";
var formatPolicyDocument = (policy) => ({
  PolicyName: policy.name,
  PolicyDocument: {
    Version: unwrap(policy.version, "2012-10-17"),
    Statement: unwrap(policy.statements, []).map((v) => unwrap(v)).map(formatStatement)
  }
});
var formatStatement = (statement) => ({
  Effect: capitalCase(unwrap(statement.effect, "allow")),
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
import { constantCase as constantCase4 } from "change-case";
import { toSeconds as toSeconds6 } from "@awsless/duration";
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
      ...this.attr("MaxAge", cors.maxAge, toSeconds6)
    };
  }
  toState() {
    return {
      document: {
        AuthType: constantCase4(unwrap(this.props.authType, "none")),
        InvokeMode: constantCase4(unwrap(this.props.invokeMode, "buffered")),
        TargetFunctionArn: this.props.targetArn,
        ...this.attr("Qualifier", this.props.qualifier),
        Cors: this.cors()
      }
    };
  }
};

// src/provider/aws/lambda/permission.ts
import { constantCase as constantCase5 } from "change-case";
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
        ...this.attr("FunctionUrlAuthType", this.props.urlAuthType, constantCase5)
        // ...(this.props.sourceArn ? { SourceArn: this.props.sourceArn } : {}),
        // ...(this.props.urlAuthType
        // 	? { FunctionUrlAuthType: constantCase(unwrap(this.props.urlAuthType)) }
        // 	: {}),
      }
    };
  }
};

// src/provider/aws/lambda/function.ts
import { constantCase as constantCase6 } from "change-case";

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
import { mebibytes, toMebibytes } from "@awsless/size";
import { seconds, toSeconds as toSeconds7 } from "@awsless/duration";
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
  // enableUrlAccess(props: Omit<UrlProps, 'targetArn'> = {}) {
  // 	const url = new Url('url', {
  // 		...props,
  // 		targetArn: this.arn,
  // 	})
  // 	const permissions = new Permission('url', {
  // 		principal: '*',
  // 		// principal: 'cloudfront.amazonaws.com',
  // 		// sourceArn: distribution.arn,
  // 		action: 'lambda:InvokeFunctionUrl',
  // 		functionArn: this.arn,
  // 		urlAuthType: props.authType ?? 'none',
  // 	})
  // 	this.add(permissions)
  // 	this.add(url)
  // 	return url
  // }
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
        MemorySize: toMebibytes(unwrap(this.props.memorySize, mebibytes(128))),
        Handler: unwrap(this.props.handler, "index.default"),
        Runtime: unwrap(this.props.runtime, "nodejs18.x"),
        Timeout: toSeconds7(unwrap(this.props.timeout, seconds(10))),
        Architectures: [unwrap(this.props.architecture, "arm64")],
        Role: this.props.role,
        ...this.attr("ReservedConcurrentExecutions", this.props.reserved),
        Code: formatCode(unwrap(this.props.code)),
        EphemeralStorage: {
          Size: toMebibytes(unwrap(this.props.ephemeralStorageSize, mebibytes(512)))
        },
        ...this.props.log ? {
          LoggingConfig: {
            LogFormat: unwrap(this.props.log).format === "text" ? "Text" : "JSON",
            ApplicationLogLevel: constantCase6(unwrap(unwrap(this.props.log).level, "error")),
            SystemLogLevel: constantCase6(unwrap(unwrap(this.props.log).system, "warn"))
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
import { toSeconds as toSeconds8 } from "@awsless/duration";
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
        ...this.attr("MaximumEventAgeInSeconds", this.props.maxEventAge, toSeconds8),
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
import { toSeconds as toSeconds9 } from "@awsless/duration";
import { constantCase as constantCase7 } from "change-case";
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
        ...this.attr("MaximumBatchingWindowInSeconds", this.props.maxBatchingWindow, toSeconds9),
        ...this.attr("MaximumRecordAgeInSeconds", this.props.maxRecordAge, toSeconds9),
        ...this.attr("MaximumRetryAttempts", this.props.retryAttempts),
        ...this.attr("ParallelizationFactor", this.props.parallelizationFactor),
        ...this.attr("TumblingWindowInSeconds", this.props.tumblingWindow, toSeconds9),
        ...this.attr("BisectBatchOnFunctionError", this.props.bisectBatchOnError),
        ...this.attr("StartingPosition", this.props.startingPosition, constantCase7),
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
  Collection: () => Collection,
  SecurityPolicy: () => SecurityPolicy
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

// src/provider/aws/open-search-serverless/security-policy.ts
var SecurityPolicy = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::OpenSearchServerless::SecurityPolicy", id, props);
    this.props = props;
  }
  toState() {
    return {
      document: {
        Name: this.props.name,
        Type: this.props.type,
        Policy: this.props.policy,
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
import { minutes as minutes2, toSeconds as toSeconds10 } from "@awsless/duration";
var formatRecordSet = (record) => {
  const name = unwrap(record.name);
  return {
    Name: name.endsWith(".") ? name : name + ".",
    Type: record.type,
    Weight: unwrap(record.weight, 0),
    // ...(record.ttl ? {} : {}),
    ..."records" in record ? {
      TTL: toSeconds10(unwrap(record.ttl, minutes2(5))),
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
import {
  ChangeResourceRecordSetsCommand,
  ListResourceRecordSetsCommand,
  Route53Client
} from "@aws-sdk/client-route-53";
import { randomUUID } from "crypto";
var RecordSetProvider = class {
  client;
  constructor(props) {
    this.client = new Route53Client(props);
  }
  own(id) {
    return id === "aws-route53-record-set";
  }
  async get({ id, document }) {
    const result = await this.client.send(
      new ListResourceRecordSetsCommand({
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
    const id = randomUUID();
    await this.client.send(
      new ChangeResourceRecordSetsCommand({
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
      new ChangeResourceRecordSetsCommand({
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
      new ChangeResourceRecordSetsCommand({
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
        Bucket: this.props.bucket,
        Key: this.props.key,
        CacheControl: this.props.cacheControl,
        ContentType: this.props.contentType,
        Metadata: this.props.metadata
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
import {
  DeleteObjectsCommand,
  ListObjectVersionsCommand,
  ListObjectsV2Command,
  S3Client
} from "@aws-sdk/client-s3";
var BucketProvider = class {
  client;
  cloudProvider;
  constructor(props) {
    this.client = new S3Client(props);
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
        new ListObjectsV2Command({
          Bucket: bucket,
          MaxKeys: 1e3
        })
      );
      if (!result.Contents || result.Contents.length === 0) {
        break;
      }
      await this.client.send(
        new DeleteObjectsCommand({
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
        new ListObjectVersionsCommand({
          Bucket: bucket,
          MaxKeys: 1e3
        })
      );
      const objects = [...result.DeleteMarkers ?? [], ...result.Versions ?? []];
      if (objects.length === 0) {
        break;
      }
      await this.client.send(
        new DeleteObjectsCommand({
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
import { capitalCase as capitalCase2 } from "change-case";
var BucketPolicy = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::S3::BucketPolicy", id, props);
    this.props = props;
  }
  toState() {
    return {
      document: {
        Bucket: this.props.bucketName,
        PolicyDocument: {
          Version: unwrap(this.props.version, "2012-10-17"),
          Statement: unwrap(this.props.statements, []).map((s) => unwrap(s)).map((statement) => ({
            Effect: capitalCase2(unwrap(statement.effect, "allow")),
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
import { DeleteObjectCommand, GetObjectAttributesCommand, PutObjectCommand, S3Client as S3Client2 } from "@aws-sdk/client-s3";
var BucketObjectProvider = class {
  client;
  constructor(props) {
    this.client = new S3Client2(props);
  }
  own(id) {
    return id === "aws-s3-bucket-object";
  }
  async get({ document }) {
    const result = await this.client.send(
      new GetObjectAttributesCommand({
        Bucket: document.Bucket,
        Key: document.Key,
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
      new PutObjectCommand({
        ...document,
        Body: assets.body?.data
      })
    );
    return JSON.stringify([document.Bucket, document.Key]);
  }
  async update({ oldDocument, newDocument, assets }) {
    if (oldDocument.Bucket !== newDocument.Bucket) {
      throw new Error(`BucketObject can't change the bucket name`);
    }
    if (oldDocument.Key !== newDocument.Key) {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: oldDocument.Bucket,
          Key: oldDocument.Key
        })
      );
    }
    await this.client.send(
      new PutObjectCommand({
        ...newDocument,
        Body: assets.body?.data
      })
    );
    return JSON.stringify([newDocument.Bucket, newDocument.Key]);
  }
  async delete({ document }) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: document.Bucket,
        Key: document.Key
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
import { constantCase as constantCase8 } from "change-case";
import { minutes as minutes3 } from "@awsless/duration";
var EmailIdentity = class extends CloudControlApiResource {
  constructor(id, props) {
    super("AWS::SES::EmailIdentity", id, props);
    this.props = props;
  }
  // get arn() {
  // 	return this.output(() => `arn:aws:ses:eu-west-1:468004125411:identity/${this.props.emailIdentity}`)
  // }
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
  get dkimRecords() {
    const ttl = minutes3(5);
    return this.dkimDnsTokens.map((token) => ({
      name: token.apply((token2) => token2.name),
      type: "CNAME",
      ttl,
      records: [token.apply((token2) => token2.value)]
    }));
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
            NextSigningKeyLength: constantCase8(unwrap(this.props.dkim))
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
import {
  GetSubscriptionAttributesCommand,
  SNSClient,
  SubscribeCommand,
  UnsubscribeCommand
} from "@aws-sdk/client-sns";
var SubscriptionProvider = class {
  client;
  constructor(props) {
    this.client = new SNSClient(props);
  }
  own(id) {
    return id === "aws-sns-subscription";
  }
  async get({ id }) {
    const result = await this.client.send(
      new GetSubscriptionAttributesCommand({
        SubscriptionArn: id
      })
    );
    return result.Attributes;
  }
  async create({ document }) {
    const result = await this.client.send(
      new SubscribeCommand({
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
      new UnsubscribeCommand({
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
import { days as days4, seconds as seconds2, toSeconds as toSeconds11 } from "@awsless/duration";
import { kibibytes, toBytes } from "@awsless/size";
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
        DelaySeconds: toSeconds11(unwrap(this.props.deliveryDelay, seconds2(0))),
        MaximumMessageSize: toBytes(unwrap(this.props.maxMessageSize, kibibytes(256))),
        MessageRetentionPeriod: toSeconds11(unwrap(this.props.retentionPeriod, days4(4))),
        ReceiveMessageWaitTimeSeconds: toSeconds11(unwrap(this.props.receiveMessageWaitTime, seconds2(0))),
        VisibilityTimeout: toSeconds11(unwrap(this.props.visibilityTimeout, seconds2(30))),
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
    new SubscriptionProvider(config),
    new InvalidateCacheProvider(config)
  ];
};

// src/provider/local/index.ts
var local_exports = {};
__export(local_exports, {
  StateProvider: () => LocalStateProvider
});

// src/provider/local/state-provider.ts
import { join } from "path";
import { mkdir, readFile as readFile2, rm, writeFile } from "fs/promises";
import { lock } from "proper-lockfile";
var LocalStateProvider = class {
  constructor(props) {
    this.props = props;
  }
  stateFile(urn) {
    return join(this.props.dir, `${urn}.json`);
  }
  lockFile(urn) {
    return join(this.props.dir, urn);
  }
  async mkdir() {
    await mkdir(this.props.dir, {
      recursive: true
    });
  }
  async lock(urn) {
    await this.mkdir();
    return lock(this.lockFile(urn), {
      realpath: false
    });
  }
  async get(urn) {
    let json;
    try {
      json = await readFile2(join(this.stateFile(urn)), "utf8");
    } catch (error) {
      return {};
    }
    return JSON.parse(json);
  }
  async update(urn, state) {
    await this.mkdir();
    await writeFile(this.stateFile(urn), JSON.stringify(state, void 0, 2));
  }
  async delete(urn) {
    await this.mkdir();
    await rm(this.stateFile(urn));
  }
};
export {
  App,
  Asset,
  FileAsset,
  ImportValueNotFound,
  Node,
  Output,
  RemoteAsset,
  Resource,
  ResourceAlreadyExists,
  ResourceError,
  ResourceNotFound,
  Stack,
  StackError,
  StringAsset,
  WorkSpace,
  all,
  aws_exports as aws,
  findResources,
  flatten,
  local_exports as local,
  unwrap
};