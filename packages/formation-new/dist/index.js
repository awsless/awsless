// src/formation/meta.ts
var hasMeta = (obj) => {
  return "$" in obj && typeof obj.$ === "object" && obj.$ !== null && "tag" in obj.$ && typeof obj.$.tag === "string";
};
var isResource = (obj) => {
  return hasMeta(obj) && obj.$.tag === "resource";
};
var isDataSource = (obj) => {
  return hasMeta(obj) && obj.$.tag === "data-source";
};

// src/formation/group.ts
var Group = class _Group {
  constructor(parent, type, name) {
    this.parent = parent;
    this.type = type;
    this.name = name;
    parent?.children.push(this);
  }
  children = [];
  get urn() {
    const urn = this.parent ? this.parent.urn : "urn";
    return `${urn}:${this.type}:{${this.name}}`;
  }
  add(...children) {
    this.children.push(...children);
  }
  get resources() {
    return this.children.map((child) => {
      if (child instanceof _Group) {
        return child.resources;
      }
      if (isResource(child)) {
        return child;
      }
      return;
    }).flat().filter((child) => !!child);
  }
  get dataSources() {
    return this.children.map((child) => {
      if (child instanceof _Group) {
        return child.dataSources;
      }
      if (isDataSource(child)) {
        return child;
      }
      return;
    }).flat().filter((child) => !!child);
  }
};

// src/formation/stack.ts
var Stack = class extends Group {
  constructor(app, name) {
    super(app, "Stack", name);
    this.app = app;
  }
  dependencies = /* @__PURE__ */ new Set();
  dependsOn(...stacks) {
    for (const stack of stacks) {
      if (stack.app !== this.app) {
        throw new Error(
          `Stacks that belong to different apps can't be dependent on each other`
        );
      }
      this.dependencies.add(stack);
    }
    return this;
  }
};
var findParentStack = (group) => {
  if (group instanceof Stack) {
    return group;
  }
  if (!group.parent) {
    throw new Error("No stack found");
  }
  return findParentStack(group.parent);
};

// src/formation/app.ts
var App = class extends Group {
  constructor(name) {
    super(void 0, "App", name);
    this.name = name;
  }
  get stacks() {
    return this.children.filter((child) => child instanceof Stack);
  }
};

// src/formation/future.ts
var IDLE = 0;
var PENDING = 1;
var RESOLVED = 2;
var REJECTED = 3;
var Future = class _Future {
  constructor(callback) {
    this.callback = callback;
  }
  listeners = /* @__PURE__ */ new Set();
  status = IDLE;
  data;
  error;
  get [Symbol.toStringTag]() {
    switch (this.status) {
      case IDLE:
        return `<idle>`;
      case PENDING:
        return `<pending>`;
      case RESOLVED:
        return `${this.data}`;
      case REJECTED:
        return `<rejected> ${this.error}`;
    }
  }
  pipe(cb) {
    return new _Future((resolve2, reject) => {
      this.then((value) => {
        Promise.resolve(cb(value)).then((value2) => {
          resolve2(value2);
        }).catch(reject);
      }, reject);
    });
  }
  then(resolve2, reject) {
    if (this.status === RESOLVED) {
      resolve2(this.data);
    } else if (this.status === REJECTED) {
      reject?.(this.error);
    } else {
      this.listeners.add({ resolve: resolve2, reject });
      if (this.status === IDLE) {
        this.status = PENDING;
        this.callback(
          (data) => {
            if (this.status === PENDING) {
              this.status = RESOLVED;
              this.data = data;
              this.listeners.forEach(({ resolve: resolve3 }) => resolve3(data));
              this.listeners.clear();
            }
          },
          (error) => {
            if (this.status === PENDING) {
              this.status = REJECTED;
              this.error = error;
              this.listeners.forEach(({ reject: reject2 }) => reject2?.(error));
              this.listeners.clear();
            }
          }
        );
      }
    }
  }
};

// src/formation/output.ts
var Output = class _Output extends Future {
  constructor(dependencies, callback) {
    super(callback);
    this.dependencies = dependencies;
  }
  pipe(cb) {
    return new _Output(this.dependencies, (resolve2, reject) => {
      this.then((value) => {
        Promise.resolve(cb(value)).then((value2) => {
          resolve2(value2);
        }).catch(reject);
      }, reject);
    });
  }
};
var deferredOutput = (cb) => {
  return new Output(/* @__PURE__ */ new Set(), cb);
};
var output = (value) => {
  return deferredOutput((resolve2) => resolve2(value));
};
var combine = (...inputs) => {
  const deps = new Set(
    ...inputs.filter((o) => o instanceof Output).map((o) => o.dependencies)
  );
  return new Output(deps, (resolve2, reject) => {
    Promise.all(inputs).then((result) => {
      resolve2(result);
    }, reject);
  });
};
var resolve = (inputs, transformer) => {
  return combine(...inputs).pipe((data) => {
    return transformer(...data);
  });
};
var interpolate = (literals, ...placeholders) => {
  return combine(...placeholders).pipe((unwrapped) => {
    const result = [];
    for (let i = 0; i < unwrapped.length; i++) {
      result.push(literals[i], unwrapped[i]);
    }
    result.push(literals.at(-1));
    return result.join("");
  });
};

// src/formation/input.ts
var findInputDeps = (props) => {
  const deps = [];
  const find = (props2) => {
    if (props2 instanceof Output) {
      deps.push(...props2.dependencies);
    } else if (Array.isArray(props2)) {
      props2.map(find);
    } else if (props2?.constructor === Object) {
      Object.values(props2).map(find);
    }
  };
  find(props);
  return deps;
};
var resolveInputs = async (inputs) => {
  const unresolved = [];
  const find = (props, parent, key) => {
    if (props instanceof Output || props instanceof Future || props instanceof Promise) {
      unresolved.push([parent, key]);
    } else if (Array.isArray(props)) {
      props.map((value, index) => find(value, props, index));
    } else if (props?.constructor === Object) {
      Object.entries(props).map(([key2, value]) => find(value, props, key2));
    }
  };
  find(inputs, {}, "root");
  const responses = await Promise.all(unresolved.map(([obj, key]) => obj[key]));
  unresolved.forEach(([props, key], i) => {
    props[key] = responses[i];
  });
  return inputs;
};

// src/formation/resource.ts
var createUrn = (type, name, parentUrn) => {
  return `${parentUrn ? parentUrn : "urn"}:${type}:{${name}}`;
};
var createResourceMeta = (provider, parent, type, id, input, config) => {
  const urn = createUrn(type, id, parent.urn);
  const stack = findParentStack(parent);
  const dependencies = /* @__PURE__ */ new Set();
  const dependencyResources = /* @__PURE__ */ new Set([...findInputDeps(input)]);
  let output2;
  for (const dep of dependencyResources) {
    if (dep.stack.urn === stack.urn) {
      dependencies.add(dep.urn);
    } else {
      stack.dependsOn(dep.stack);
    }
  }
  return {
    tag: "resource",
    urn,
    type,
    stack,
    provider,
    input,
    config,
    dependencies,
    resolve(data) {
      output2 = data;
    },
    output(cb) {
      return new Output(/* @__PURE__ */ new Set([this]), (resolve2) => {
        if (!output2) {
          throw new Error(`Unresolved output for resource: ${urn}`);
        }
        resolve2(cb(output2));
      });
    }
  };
};

// src/formation/debug.ts
var enabled = false;
var enableDebug = () => {
  enabled = true;
};
var createDebugger = (group) => {
  return (...args) => {
    if (!enabled) {
      return;
    }
    console.log(`${group}:`, ...args);
  };
};

// src/formation/workspace/lock.ts
var lockApp = async (lockBackend, app, fn) => {
  let release;
  try {
    release = await lockBackend.lock(app.urn);
  } catch (error) {
    throw new Error(`Already in progress: ${app.urn}`);
  }
  const cleanupAndExit = async () => {
    await release();
    process.exit(0);
  };
  process.on("SIGTERM", cleanupAndExit);
  process.on("SIGINT", cleanupAndExit);
  let result;
  try {
    result = await fn();
  } catch (error) {
    throw error;
  } finally {
    await release();
  }
  return result;
};

// src/formation/workspace/concurrency.ts
import promiseLimit from "p-limit";
var concurrencyQueue = (concurrency) => {
  const queue = promiseLimit(concurrency);
  return (cb) => {
    return queue(cb);
  };
};

// src/formation/workspace/dependency.ts
import { run } from "promise-dag";

// src/formation/workspace/entries.ts
var entries = (object) => {
  return Object.entries(object);
};

// src/formation/workspace/dependency.ts
var DependencyGraph = class {
  graph = {};
  add(urn, deps, callback) {
    this.graph[urn] = [...deps, callback];
  }
  run() {
    return Promise.allSettled(Object.values(run(this.graph)));
  }
};
var dependentsOn = (resources, dependency) => {
  const dependents = [];
  for (const [urn, resource] of entries(resources)) {
    if (resource.dependencies.includes(dependency)) {
      dependents.push(urn);
    }
  }
  return dependents;
};

// src/formation/workspace/error.ts
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
var AppError = class extends Error {
  constructor(app, issues, message) {
    super(message);
    this.app = app;
    this.issues = issues;
  }
};
var StackError = class extends Error {
  constructor(stack, issues, message) {
    super(message);
    this.stack = stack;
    this.issues = issues;
  }
};
var ResourceNotFound = class extends Error {
};
var ResourceAlreadyExists = class extends Error {
};

// src/formation/provider.ts
var findProvider = (providers, id) => {
  for (const provider of providers) {
    if (provider.ownResource(id)) {
      return provider;
    }
  }
  throw new TypeError(`Can't find the "${id}" provider.`);
};

// src/formation/workspace/token.ts
import { v5 } from "uuid";
var createIdempotantToken = (appToken, urn, operation) => {
  return v5(`${urn}-${operation}`, appToken);
};

// src/formation/workspace/procedure/delete-resource.ts
var debug = createDebugger("Delete");
var deleteResource = async (appToken, urn, state, opt) => {
  debug(state.type);
  if (state.lifecycle?.retainOnDelete) {
    debug("retain", state.type);
    return;
  }
  const idempotantToken = createIdempotantToken(appToken, urn, "delete");
  const provider = findProvider(opt.providers, state.provider);
  try {
    await provider.deleteResource({
      type: state.type,
      state: state.output,
      idempotantToken
    });
  } catch (error) {
    if (error instanceof ResourceNotFound) {
      debug(state.type, "already deleted");
    } else {
      throw ResourceError.wrap(urn, state.type, "delete", error);
    }
  }
};

// src/formation/workspace/procedure/delete-stack.ts
var deleteStackResources = async (stackState, resourceStates, appToken, queue, options) => {
  const graph = new DependencyGraph();
  for (const [urn, state] of entries(resourceStates)) {
    graph.add(urn, dependentsOn(stackState.resources, urn), async () => {
      await queue(() => deleteResource(appToken, urn, state, options));
      delete stackState.resources[urn];
    });
  }
  const results = await graph.run();
  const errors = results.filter((r) => r.status === "rejected").map((r) => r.reason);
  if (errors.length > 0) {
    throw new StackError(stackState.name, [...new Set(errors)], "Deleting resources failed.");
  }
};

// src/formation/workspace/procedure/delete-app.ts
var deleteApp = async (app, opt) => {
  const appState = await opt.backend.state.get(app.urn);
  if (!appState) {
    throw new AppError(app.name, [], `App already deleted: ${app.name}`);
  }
  if (opt.idempotentToken || !appState.idempotentToken) {
    appState.idempotentToken = opt.idempotentToken ?? crypto.randomUUID();
    await opt.backend.state.update(app.urn, appState);
  }
  let stacks = entries(appState.stacks);
  if (opt.filters && opt.filters.length > 0) {
    stacks = stacks.filter(([_, stack]) => opt.filters.includes(stack.name));
  }
  const queue = concurrencyQueue(opt.concurrency ?? 10);
  const graph = new DependencyGraph();
  for (const [urn, stackState] of stacks) {
    graph.add(urn, dependentsOn(appState.stacks, urn), async () => {
      await deleteStackResources(stackState, stackState.resources, appState.idempotentToken, queue, opt);
      delete appState.stacks[urn];
    });
  }
  const results = await graph.run();
  delete appState.idempotentToken;
  await opt.backend.state.update(app.urn, appState);
  const errors = results.filter((r) => r.status === "rejected").map((r) => r.reason);
  if (errors.length > 0) {
    throw new AppError(app.name, [...new Set(errors)], "Deleting app failed.");
  }
  if (Object.keys(appState.stacks).length === 0) {
    await opt.backend.state.delete(app.urn);
  }
};

// src/formation/workspace/state.ts
var compareState = (left, right) => {
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
};

// src/formation/workspace/procedure/create-resource.ts
var debug2 = createDebugger("Create");
var createResource = async (resource, appToken, input, opt) => {
  const provider = findProvider(opt.providers, resource.$.provider);
  const idempotantToken = createIdempotantToken(appToken, resource.$.urn, "create");
  debug2(resource.$.type);
  let result;
  try {
    result = await provider.createResource({
      type: resource.$.type,
      state: input,
      idempotantToken
    });
  } catch (error) {
    throw ResourceError.wrap(resource.$.urn, resource.$.type, "create", error);
  }
  return {
    version: result.version,
    type: resource.$.type,
    provider: resource.$.provider,
    input: resource.$.input,
    output: result.state
  };
};

// src/formation/workspace/procedure/get-data-source.ts
var debug3 = createDebugger("Data Source");
var getDataSource = async (dataSource, opt) => {
  const provider = findProvider(opt.providers, dataSource.$.provider);
  debug3(dataSource.$.type);
  let result;
  try {
    result = await provider.getResource({
      type: dataSource.$.type,
      state: {
        id: dataSource.$.physicalId
      }
    });
  } catch (error) {
    throw ResourceError.wrap(dataSource.$.urn, dataSource.$.type, "get", error);
  }
  return result.state;
};

// src/formation/workspace/procedure/import-resource.ts
var debug4 = createDebugger("Import");
var importResource = async (resource, input, opt) => {
  const provider = findProvider(opt.providers, resource.$.provider);
  debug4(resource.$.type);
  let result;
  try {
    result = await provider.getResource({
      type: resource.$.type,
      state: {
        ...input,
        id: resource.$.config?.import
      }
    });
  } catch (error) {
    throw ResourceError.wrap(resource.$.urn, resource.$.type, "import", error);
  }
  return {
    version: result.version,
    type: resource.$.type,
    provider: resource.$.provider,
    input: resource.$.input,
    output: result.state
  };
};

// src/formation/workspace/procedure/update-resource.ts
var debug5 = createDebugger("Update");
var updateResource = async (resource, appToken, priorState, proposedState, opt) => {
  const provider = findProvider(opt.providers, resource.$.provider);
  const idempotantToken = createIdempotantToken(appToken, resource.$.urn, "update");
  let result;
  debug5(resource.$.type);
  try {
    result = await provider.updateResource({
      type: resource.$.type,
      priorState,
      proposedState,
      idempotantToken
    });
  } catch (error) {
    throw ResourceError.wrap(resource.urn, resource.type, "update", error);
  }
  return {
    version: result.version,
    output: result.state
  };
};

// src/formation/workspace/procedure/deploy-stack.ts
var deployStackResources = async (stackState, resources, dataSources, appToken, queue, opt) => {
  const graph = new DependencyGraph();
  for (const dataSource of dataSources) {
    graph.add(dataSource.$.urn, [], () => {
      return queue(async () => {
        const output2 = await getDataSource(dataSource, opt);
        dataSource.$.resolve(output2);
      });
    });
  }
  for (const resource of resources) {
    const dependencies = [
      ...resource.$.dependencies,
      ...resource.$.config?.dependsOn?.map((r) => r.$.urn) ?? []
    ];
    const partialNewResourceState = {
      dependencies,
      lifecycle: {
        deleteBeforeCreate: resource.$.config?.deleteBeforeCreate,
        retainOnDelete: resource.$.config?.retainOnDelete
      }
    };
    graph.add(resource.$.urn, dependencies, () => {
      return queue(async () => {
        let resourceState = stackState.resources[resource.$.urn];
        const input = await resolveInputs(resource.$.input);
        if (!resourceState) {
          if (resource.$.config?.import) {
            const importedState = await importResource(resource, input, opt);
            const newResourceState = await updateResource(
              resource,
              appToken,
              importedState.output,
              input,
              opt
            );
            resourceState = stackState.resources[resource.$.urn] = {
              ...importedState,
              ...newResourceState,
              ...partialNewResourceState
            };
          } else {
            const newResourceState = await createResource(resource, appToken, input, opt);
            resourceState = stackState.resources[resource.$.urn] = {
              ...newResourceState,
              ...partialNewResourceState
            };
          }
        } else if (
          // --------------------------------------------------
          // Check if any state has changed
          !compareState(resourceState.input, input)
        ) {
          const newResourceState = await updateResource(resource, appToken, resourceState.output, input, opt);
          Object.assign(resourceState, {
            input,
            ...newResourceState,
            ...partialNewResourceState
          });
        } else {
          Object.assign(resourceState, partialNewResourceState);
        }
        if (resourceState.output) {
          resource.$.resolve(resourceState.output);
        }
      });
    });
  }
  const results = await graph.run();
  const errors = results.filter((r) => r.status === "rejected").map((r) => r.reason);
  if (errors.length > 0) {
    throw new StackError(stackState.name, [...new Set(errors)], "Deploying resources failed.");
  }
};

// src/formation/workspace/procedure/deploy-app.ts
var deployApp = async (app, opt) => {
  const appState = await opt.backend.state.get(app.urn) ?? {
    name: app.name,
    stacks: {}
  };
  if (opt.idempotentToken || !appState.idempotentToken) {
    appState.idempotentToken = opt.idempotentToken ?? crypto.randomUUID();
    await opt.backend.state.update(app.urn, appState);
  }
  let stacks = app.stacks;
  let filteredOutStacks = [];
  if (opt.filters && opt.filters.length > 0) {
    stacks = app.stacks.filter((stack) => opt.filters.includes(stack.name));
    filteredOutStacks = app.stacks.filter((stack) => !opt.filters.includes(stack.name));
  }
  const queue = concurrencyQueue(opt.concurrency ?? 10);
  const graph = new DependencyGraph();
  for (const stack of filteredOutStacks) {
    graph.add(stack.urn, [], async () => {
      const stackState = appState.stacks[stack.urn];
      if (stackState) {
        for (const resource of stack.resources) {
          const resourceState = stackState.resources[resource.urn];
          if (resourceState && resourceState.output) {
            resource.$.resolve(resourceState.output);
          }
        }
      }
    });
  }
  for (const stack of stacks) {
    graph.add(
      stack.urn,
      [...stack.dependencies].map((dep) => dep.urn),
      async () => {
        const resources = stack.resources;
        const stackState = appState.stacks[stack.urn] = appState.stacks[stack.urn] ?? {
          name: stack.name,
          dependencies: [],
          resources: {}
        };
        const deleteResourcesBefore = {};
        const deleteResourcesAfter = {};
        for (const [urn, state] of entries(stackState.resources)) {
          const resource = resources.find((r) => r.$.urn === urn);
          if (!resource) {
            if (state.lifecycle?.deleteBeforeCreate) {
              deleteResourcesBefore[urn] = state;
            } else {
              deleteResourcesAfter[urn] = state;
            }
          }
        }
        if (Object.keys(deleteResourcesBefore).length > 0) {
          await deleteStackResources(stackState, deleteResourcesBefore, appState.idempotentToken, queue, opt);
        }
        await deployStackResources(
          stackState,
          resources,
          stack.dataSources,
          appState.idempotentToken,
          queue,
          opt
        );
        if (Object.keys(deleteResourcesAfter).length > 0) {
          await deleteStackResources(stackState, deleteResourcesAfter, appState.idempotentToken, queue, opt);
        }
        stackState.dependencies = [...stack.dependencies].map((d) => d.urn);
      }
    );
  }
  for (const [urn, stackState] of entries(appState.stacks)) {
    const found = app.stacks.find((stack) => {
      return stack.urn === urn;
    });
    const filtered = opt.filters ? opt.filters.find((filter) => filter === stackState.name) : true;
    if (!found && filtered) {
      graph.add(urn, dependentsOn(appState.stacks, urn), async () => {
        await deleteStackResources(stackState, stackState.resources, appState.idempotentToken, queue, opt);
        delete appState.stacks[urn];
      });
    }
  }
  const results = await graph.run();
  delete appState.idempotentToken;
  await opt.backend.state.update(app.urn, appState);
  const errors = results.filter((r) => r.status === "rejected").map((r) => r.reason);
  if (errors.length > 0) {
    throw new AppError(app.name, [...new Set(errors)], "Deploying app failed.");
  }
  return appState;
};

// src/formation/workspace/procedure/hydrate.ts
var hydrate = async (app, opt) => {
  const appState = await opt.backend.state.get(app.urn);
  if (appState) {
    for (const stack of app.stacks) {
      const stackState = appState.stacks[stack.urn];
      if (stackState) {
        for (const resource of stack.resources) {
          const resourceState = stackState.resources[resource.urn];
          if (resourceState && resourceState.output) {
            resource.$.resolve(resourceState.output);
          }
        }
      }
    }
  }
};

// src/formation/workspace/workspace.ts
var WorkSpace = class {
  constructor(props) {
    this.props = props;
  }
  deploy(app, options = {}) {
    return lockApp(this.props.backend.lock, app, async () => {
      try {
        await deployApp(app, { ...this.props, ...options });
      } finally {
        await this.destroyProviders();
      }
    });
  }
  delete(app, options = {}) {
    return lockApp(this.props.backend.lock, app, async () => {
      try {
        await deleteApp(app, { ...this.props, ...options });
      } finally {
        await this.destroyProviders();
      }
    });
  }
  hydrate(app) {
    return hydrate(app, this.props);
  }
  //   refresh(app: App) {
  //     return lockApp(this.props.backend.lock, app, async () => {
  //       try {
  //         await refresh(app, this.props);
  //       } finally {
  //         await this.destroyProviders();
  //       }
  //     });
  //   }
  async destroyProviders() {
    await Promise.all(
      this.props.providers.map((p) => {
        return p.destroy?.();
      })
    );
  }
};

// src/formation/backend/memory/state.ts
var MemoryStateBackend = class {
  states = /* @__PURE__ */ new Map();
  async get(urn) {
    return this.states.get(urn);
  }
  async update(urn, state) {
    this.states.set(urn, state);
  }
  async delete(urn) {
    this.states.delete(urn);
  }
};

// src/formation/backend/memory/lock.ts
var MemoryLockBackend = class {
  locks = /* @__PURE__ */ new Map();
  async insecureReleaseLock(urn) {
    this.locks.delete(urn);
  }
  async locked(urn) {
    return this.locks.has(urn);
  }
  async lock(urn) {
    if (this.locks.has(urn)) {
      throw new Error("Already locked");
    }
    const id = Math.random();
    this.locks.set(urn, id);
    return async () => {
      if (this.locks.get(urn) === id) {
        this.locks.delete(urn);
      }
    };
  }
};

// src/formation/backend/file/state.ts
import { mkdir, readFile, rm, writeFile } from "fs/promises";
import { join } from "path";
var debug6 = createDebugger("State");
var FileStateBackend = class {
  constructor(props) {
    this.props = props;
  }
  stateFile(urn) {
    return join(this.props.dir, `${urn}.json`);
  }
  async mkdir() {
    await mkdir(this.props.dir, {
      recursive: true
    });
  }
  async get(urn) {
    debug6("get");
    let json;
    try {
      json = await readFile(join(this.stateFile(urn)), "utf8");
    } catch (error) {
      return;
    }
    return JSON.parse(json);
  }
  async update(urn, state) {
    debug6("update");
    await this.mkdir();
    await writeFile(this.stateFile(urn), JSON.stringify(state, void 0, 2));
  }
  async delete(urn) {
    debug6("delete");
    await this.mkdir();
    await rm(this.stateFile(urn));
  }
};

// src/formation/backend/file/lock.ts
import { mkdir as mkdir2, rm as rm2, stat } from "fs/promises";
import { join as join2 } from "path";
import { lock } from "proper-lockfile";
var FileLockBackend = class {
  constructor(props) {
    this.props = props;
  }
  lockFile(urn) {
    return join2(this.props.dir, `${urn}.lock`);
  }
  async mkdir() {
    await mkdir2(this.props.dir, {
      recursive: true
    });
  }
  async insecureReleaseLock(urn) {
    if (await this.locked(urn)) {
      await rm2(this.lockFile(urn));
    }
  }
  async locked(urn) {
    const result = await stat(this.lockFile(urn));
    return result.isFile();
  }
  async lock(urn) {
    await this.mkdir();
    return lock(this.lockFile(urn), {
      realpath: false
    });
  }
};

// src/formation/backend/aws/s3-state.ts
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  S3ServiceException
} from "@aws-sdk/client-s3";
var S3StateBackend = class {
  constructor(props) {
    this.props = props;
    this.client = new S3Client(props);
  }
  client;
  async get(urn) {
    let result;
    try {
      result = await this.client.send(
        new GetObjectCommand({
          Bucket: this.props.bucket,
          Key: `${urn}.state`
        })
      );
    } catch (error) {
      if (error instanceof S3ServiceException && error.name === "NoSuchKey") {
        return;
      }
      throw error;
    }
    if (!result.Body) {
      return;
    }
    const body = await result.Body.transformToString("utf8");
    const state = JSON.parse(body);
    return state;
  }
  async update(urn, state) {
    await this.client.send(
      new PutObjectCommand({
        Bucket: this.props.bucket,
        Key: `${urn}.state`,
        Body: JSON.stringify(state)
      })
    );
  }
  async delete(urn) {
    await this.client.send(
      new DeleteObjectCommand({
        Bucket: this.props.bucket,
        Key: `${urn}.state`
      })
    );
  }
};

// src/formation/backend/aws/dynamodb-lock.ts
import { DynamoDB } from "@aws-sdk/client-dynamodb";
import { marshall, unmarshall } from "@aws-sdk/util-dynamodb";
var DynamoLockProvider = class {
  constructor(props) {
    this.props = props;
    this.client = new DynamoDB(props);
  }
  client;
  async insecureReleaseLock(urn) {
    await this.client.updateItem({
      TableName: this.props.tableName,
      Key: marshall({ urn }),
      ExpressionAttributeNames: { "#lock": "lock" },
      UpdateExpression: "REMOVE #lock"
    });
  }
  async locked(urn) {
    const result = await this.client.getItem({
      TableName: this.props.tableName,
      Key: marshall({ urn })
    });
    if (!result.Item) {
      return false;
    }
    const item = unmarshall(result.Item);
    return typeof item.lock === "number";
  }
  async lock(urn) {
    const id = Math.floor(Math.random() * 1e5);
    const props = {
      TableName: this.props.tableName,
      Key: marshall({ urn }),
      ExpressionAttributeNames: { "#lock": "lock" },
      ExpressionAttributeValues: { ":id": marshall(id) }
    };
    await this.client.updateItem({
      ...props,
      UpdateExpression: "SET #lock = :id",
      ConditionExpression: "attribute_not_exists(#lock)"
    });
    return async () => {
      await this.client.updateItem({
        ...props,
        UpdateExpression: "REMOVE #lock",
        ConditionExpression: "#lock = :id"
      });
    };
  }
};

// src/formation/helpers.ts
import { createHash } from "crypto";
import { readFile as readFile2 } from "fs/promises";
var file = (path, encoding = "utf8") => {
  return new Future(async (resolve2, reject) => {
    try {
      const file2 = await readFile2(path, {
        encoding
      });
      resolve2(file2);
    } catch (error) {
      reject(error);
    }
  });
};
var hash = (path, algo = "sha256") => {
  return file(path).pipe((file2) => createHash(algo).update(file2).digest("hex"));
};

// src/formation/globals.ts
globalThis.$resolve = resolve;
globalThis.$combine = combine;
globalThis.$interpolate = interpolate;
globalThis.$hash = hash;
globalThis.$file = file;

// src/terraform/plugin/client.ts
import { credentials, loadPackageDefinition } from "@grpc/grpc-js";
import { fromJSON } from "@grpc/proto-loader";

// src/terraform/plugin/diagnostic.ts
var DiagnosticsError = class extends Error {
  diagnostics;
  constructor(diagnostics) {
    super(diagnostics[0]?.summary ?? "Diagnostic error");
    this.diagnostics = diagnostics;
  }
};
var throwDiagnosticError = (response) => {
  const diagnostics = response.diagnostics.map((item) => ({
    severity: item.severity === 1 ? "error" : "warning",
    summary: item.summary,
    detail: item.detail,
    path: item.attribute?.steps.map((step) => step.attributeName)
  }));
  return new DiagnosticsError(diagnostics);
};

// src/terraform/plugin/protocol/tfplugin5.ts
var tfplugin5_default = {
  options: { syntax: "proto3" },
  nested: {
    tfplugin5: {
      nested: {
        DynamicValue: { fields: { msgpack: { type: "bytes", id: 1 }, json: { type: "bytes", id: 2 } } },
        Diagnostic: {
          fields: {
            severity: { type: "Severity", id: 1 },
            summary: { type: "string", id: 2 },
            detail: { type: "string", id: 3 },
            attribute: { type: "AttributePath", id: 4 }
          },
          nested: { Severity: { values: { INVALID: 0, ERROR: 1, WARNING: 2 } } }
        },
        AttributePath: {
          fields: { steps: { rule: "repeated", type: "Step", id: 1 } },
          nested: {
            Step: {
              oneofs: { selector: { oneof: ["attributeName", "elementKeyString", "elementKeyInt"] } },
              fields: {
                attributeName: { type: "string", id: 1 },
                elementKeyString: { type: "string", id: 2 },
                elementKeyInt: { type: "int64", id: 3 }
              }
            }
          }
        },
        Stop: {
          fields: {},
          nested: { Request: { fields: {} }, Response: { fields: { Error: { type: "string", id: 1 } } } }
        },
        RawState: {
          fields: { json: { type: "bytes", id: 1 }, flatmap: { keyType: "string", type: "string", id: 2 } }
        },
        Schema: {
          fields: { version: { type: "int64", id: 1 }, block: { type: "Block", id: 2 } },
          nested: {
            Block: {
              fields: {
                version: { type: "int64", id: 1 },
                attributes: { rule: "repeated", type: "Attribute", id: 2 },
                blockTypes: { rule: "repeated", type: "NestedBlock", id: 3 }
              }
            },
            Attribute: {
              fields: {
                name: { type: "string", id: 1 },
                type: { type: "bytes", id: 2 },
                description: { type: "string", id: 3 },
                required: { type: "bool", id: 4 },
                optional: { type: "bool", id: 5 },
                computed: { type: "bool", id: 6 },
                sensitive: { type: "bool", id: 7 }
              }
            },
            NestedBlock: {
              fields: {
                typeName: { type: "string", id: 1 },
                block: { type: "Block", id: 2 },
                nesting: { type: "NestingMode", id: 3 },
                minItems: { type: "int64", id: 4 },
                maxItems: { type: "int64", id: 5 }
              },
              nested: {
                NestingMode: { values: { INVALID: 0, SINGLE: 1, LIST: 2, SET: 3, MAP: 4, GROUP: 5 } }
              }
            }
          }
        },
        Provider: {
          methods: {
            GetSchema: {
              requestType: "GetProviderSchema.Request",
              responseType: "GetProviderSchema.Response"
            },
            PrepareProviderConfig: {
              requestType: "PrepareProviderConfig.Request",
              responseType: "PrepareProviderConfig.Response"
            },
            ValidateResourceTypeConfig: {
              requestType: "ValidateResourceTypeConfig.Request",
              responseType: "ValidateResourceTypeConfig.Response"
            },
            ValidateDataSourceConfig: {
              requestType: "ValidateDataSourceConfig.Request",
              responseType: "ValidateDataSourceConfig.Response"
            },
            UpgradeResourceState: {
              requestType: "UpgradeResourceState.Request",
              responseType: "UpgradeResourceState.Response"
            },
            Configure: { requestType: "Configure.Request", responseType: "Configure.Response" },
            ReadResource: { requestType: "ReadResource.Request", responseType: "ReadResource.Response" },
            PlanResourceChange: {
              requestType: "PlanResourceChange.Request",
              responseType: "PlanResourceChange.Response"
            },
            ApplyResourceChange: {
              requestType: "ApplyResourceChange.Request",
              responseType: "ApplyResourceChange.Response"
            },
            ImportResourceState: {
              requestType: "ImportResourceState.Request",
              responseType: "ImportResourceState.Response"
            },
            ReadDataSource: {
              requestType: "ReadDataSource.Request",
              responseType: "ReadDataSource.Response"
            },
            Stop: { requestType: "Stop.Request", responseType: "Stop.Response" }
          }
        },
        GetProviderSchema: {
          fields: {},
          nested: {
            Request: { fields: {} },
            Response: {
              fields: {
                provider: { type: "Schema", id: 1 },
                resourceSchemas: { keyType: "string", type: "Schema", id: 2 },
                dataSourceSchemas: { keyType: "string", type: "Schema", id: 3 },
                diagnostics: { rule: "repeated", type: "Diagnostic", id: 4 }
              }
            }
          }
        },
        PrepareProviderConfig: {
          fields: {},
          nested: {
            Request: { fields: { config: { type: "DynamicValue", id: 1 } } },
            Response: {
              fields: {
                preparedConfig: { type: "DynamicValue", id: 1 },
                diagnostics: { rule: "repeated", type: "Diagnostic", id: 2 }
              }
            }
          }
        },
        UpgradeResourceState: {
          fields: {},
          nested: {
            Request: {
              fields: {
                typeName: { type: "string", id: 1 },
                version: { type: "int64", id: 2 },
                rawState: { type: "RawState", id: 3 }
              }
            },
            Response: {
              fields: {
                upgradedState: { type: "DynamicValue", id: 1 },
                diagnostics: { rule: "repeated", type: "Diagnostic", id: 2 }
              }
            }
          }
        },
        ValidateResourceTypeConfig: {
          fields: {},
          nested: {
            Request: {
              fields: { typeName: { type: "string", id: 1 }, config: { type: "DynamicValue", id: 2 } }
            },
            Response: { fields: { diagnostics: { rule: "repeated", type: "Diagnostic", id: 1 } } }
          }
        },
        ValidateDataSourceConfig: {
          fields: {},
          nested: {
            Request: {
              fields: { typeName: { type: "string", id: 1 }, config: { type: "DynamicValue", id: 2 } }
            },
            Response: { fields: { diagnostics: { rule: "repeated", type: "Diagnostic", id: 1 } } }
          }
        },
        Configure: {
          fields: {},
          nested: {
            Request: {
              fields: {
                terraformVersion: { type: "string", id: 1 },
                config: { type: "DynamicValue", id: 2 }
              }
            },
            Response: { fields: { diagnostics: { rule: "repeated", type: "Diagnostic", id: 1 } } }
          }
        },
        ReadResource: {
          fields: {},
          nested: {
            Request: {
              fields: {
                typeName: { type: "string", id: 1 },
                currentState: { type: "DynamicValue", id: 2 },
                private: { type: "bytes", id: 3 }
              }
            },
            Response: {
              fields: {
                newState: { type: "DynamicValue", id: 1 },
                diagnostics: { rule: "repeated", type: "Diagnostic", id: 2 },
                private: { type: "bytes", id: 3 }
              }
            }
          }
        },
        PlanResourceChange: {
          fields: {},
          nested: {
            Request: {
              fields: {
                typeName: { type: "string", id: 1 },
                priorState: { type: "DynamicValue", id: 2 },
                proposedNewState: { type: "DynamicValue", id: 3 },
                config: { type: "DynamicValue", id: 4 },
                priorPrivate: { type: "bytes", id: 5 }
              }
            },
            Response: {
              fields: {
                plannedState: { type: "DynamicValue", id: 1 },
                requiresReplace: { rule: "repeated", type: "AttributePath", id: 2 },
                plannedPrivate: { type: "bytes", id: 3 },
                diagnostics: { rule: "repeated", type: "Diagnostic", id: 4 },
                legacyTypeSystem: { type: "bool", id: 5 }
              }
            }
          }
        },
        ApplyResourceChange: {
          fields: {},
          nested: {
            Request: {
              fields: {
                typeName: { type: "string", id: 1 },
                priorState: { type: "DynamicValue", id: 2 },
                plannedState: { type: "DynamicValue", id: 3 },
                config: { type: "DynamicValue", id: 4 },
                plannedPrivate: { type: "bytes", id: 5 }
              }
            },
            Response: {
              fields: {
                newState: { type: "DynamicValue", id: 1 },
                private: { type: "bytes", id: 2 },
                diagnostics: { rule: "repeated", type: "Diagnostic", id: 3 },
                legacyTypeSystem: { type: "bool", id: 4 }
              }
            }
          }
        },
        ImportResourceState: {
          fields: {},
          nested: {
            Request: { fields: { typeName: { type: "string", id: 1 }, id: { type: "string", id: 2 } } },
            ImportedResource: {
              fields: {
                typeName: { type: "string", id: 1 },
                state: { type: "DynamicValue", id: 2 },
                private: { type: "bytes", id: 3 }
              }
            },
            Response: {
              fields: {
                importedResources: { rule: "repeated", type: "ImportedResource", id: 1 },
                diagnostics: { rule: "repeated", type: "Diagnostic", id: 2 }
              }
            }
          }
        },
        ReadDataSource: {
          fields: {},
          nested: {
            Request: {
              fields: { typeName: { type: "string", id: 1 }, config: { type: "DynamicValue", id: 2 } }
            },
            Response: {
              fields: {
                state: { type: "DynamicValue", id: 1 },
                diagnostics: { rule: "repeated", type: "Diagnostic", id: 2 }
              }
            }
          }
        },
        Provisioner: {
          methods: {
            GetSchema: {
              requestType: "GetProvisionerSchema.Request",
              responseType: "GetProvisionerSchema.Response"
            },
            ValidateProvisionerConfig: {
              requestType: "ValidateProvisionerConfig.Request",
              responseType: "ValidateProvisionerConfig.Response"
            },
            ProvisionResource: {
              requestType: "ProvisionResource.Request",
              responseType: "ProvisionResource.Response",
              responseStream: true
            },
            Stop: { requestType: "Stop.Request", responseType: "Stop.Response" }
          }
        },
        GetProvisionerSchema: {
          fields: {},
          nested: {
            Request: { fields: {} },
            Response: {
              fields: {
                provisioner: { type: "Schema", id: 1 },
                diagnostics: { rule: "repeated", type: "Diagnostic", id: 2 }
              }
            }
          }
        },
        ValidateProvisionerConfig: {
          fields: {},
          nested: {
            Request: { fields: { config: { type: "DynamicValue", id: 1 } } },
            Response: { fields: { diagnostics: { rule: "repeated", type: "Diagnostic", id: 1 } } }
          }
        },
        ProvisionResource: {
          fields: {},
          nested: {
            Request: {
              fields: {
                config: { type: "DynamicValue", id: 1 },
                connection: { type: "DynamicValue", id: 2 }
              }
            },
            Response: {
              fields: {
                output: { type: "string", id: 1 },
                diagnostics: { rule: "repeated", type: "Diagnostic", id: 2 }
              }
            }
          }
        }
      }
    }
  }
};

// src/terraform/plugin/protocol/tfplugin6.ts
var tfplugin6_default = {
  options: { syntax: "proto3", go_package: "github.com/hashicorp/terraform/internal/tfplugin6" },
  nested: {
    tfplugin6: {
      nested: {
        DynamicValue: { fields: { msgpack: { type: "bytes", id: 1 }, json: { type: "bytes", id: 2 } } },
        Diagnostic: {
          fields: {
            severity: { type: "Severity", id: 1 },
            summary: { type: "string", id: 2 },
            detail: { type: "string", id: 3 },
            attribute: { type: "AttributePath", id: 4 }
          },
          nested: { Severity: { values: { INVALID: 0, ERROR: 1, WARNING: 2 } } }
        },
        AttributePath: {
          fields: { steps: { rule: "repeated", type: "Step", id: 1 } },
          nested: {
            Step: {
              oneofs: { selector: { oneof: ["attributeName", "elementKeyString", "elementKeyInt"] } },
              fields: {
                attributeName: { type: "string", id: 1 },
                elementKeyString: { type: "string", id: 2 },
                elementKeyInt: { type: "int64", id: 3 }
              }
            }
          }
        },
        StopProvider: {
          fields: {},
          nested: { Request: { fields: {} }, Response: { fields: { Error: { type: "string", id: 1 } } } }
        },
        RawState: {
          fields: { json: { type: "bytes", id: 1 }, flatmap: { keyType: "string", type: "string", id: 2 } }
        },
        StringKind: { values: { PLAIN: 0, MARKDOWN: 1 } },
        Schema: {
          fields: { version: { type: "int64", id: 1 }, block: { type: "Block", id: 2 } },
          nested: {
            Block: {
              fields: {
                version: { type: "int64", id: 1 },
                attributes: { rule: "repeated", type: "Attribute", id: 2 },
                blockTypes: { rule: "repeated", type: "NestedBlock", id: 3 },
                description: { type: "string", id: 4 },
                descriptionKind: { type: "StringKind", id: 5 },
                deprecated: { type: "bool", id: 6 }
              }
            },
            Attribute: {
              fields: {
                name: { type: "string", id: 1 },
                type: { type: "bytes", id: 2 },
                nestedType: { type: "Object", id: 10 },
                description: { type: "string", id: 3 },
                required: { type: "bool", id: 4 },
                optional: { type: "bool", id: 5 },
                computed: { type: "bool", id: 6 },
                sensitive: { type: "bool", id: 7 },
                descriptionKind: { type: "StringKind", id: 8 },
                deprecated: { type: "bool", id: 9 }
              }
            },
            NestedBlock: {
              fields: {
                typeName: { type: "string", id: 1 },
                block: { type: "Block", id: 2 },
                nesting: { type: "NestingMode", id: 3 },
                minItems: { type: "int64", id: 4 },
                maxItems: { type: "int64", id: 5 }
              },
              nested: {
                NestingMode: { values: { INVALID: 0, SINGLE: 1, LIST: 2, SET: 3, MAP: 4, GROUP: 5 } }
              }
            },
            Object: {
              fields: {
                attributes: { rule: "repeated", type: "Attribute", id: 1 },
                nesting: { type: "NestingMode", id: 3 },
                minItems: { type: "int64", id: 4 },
                maxItems: { type: "int64", id: 5 }
              },
              nested: { NestingMode: { values: { INVALID: 0, SINGLE: 1, LIST: 2, SET: 3, MAP: 4 } } }
            }
          }
        },
        Provider: {
          methods: {
            GetProviderSchema: {
              requestType: "GetProviderSchema.Request",
              responseType: "GetProviderSchema.Response"
            },
            ValidateProviderConfig: {
              requestType: "ValidateProviderConfig.Request",
              responseType: "ValidateProviderConfig.Response"
            },
            ValidateResourceConfig: {
              requestType: "ValidateResourceConfig.Request",
              responseType: "ValidateResourceConfig.Response"
            },
            ValidateDataResourceConfig: {
              requestType: "ValidateDataResourceConfig.Request",
              responseType: "ValidateDataResourceConfig.Response"
            },
            UpgradeResourceState: {
              requestType: "UpgradeResourceState.Request",
              responseType: "UpgradeResourceState.Response"
            },
            ConfigureProvider: {
              requestType: "ConfigureProvider.Request",
              responseType: "ConfigureProvider.Response"
            },
            ReadResource: { requestType: "ReadResource.Request", responseType: "ReadResource.Response" },
            PlanResourceChange: {
              requestType: "PlanResourceChange.Request",
              responseType: "PlanResourceChange.Response"
            },
            ApplyResourceChange: {
              requestType: "ApplyResourceChange.Request",
              responseType: "ApplyResourceChange.Response"
            },
            ImportResourceState: {
              requestType: "ImportResourceState.Request",
              responseType: "ImportResourceState.Response"
            },
            ReadDataSource: {
              requestType: "ReadDataSource.Request",
              responseType: "ReadDataSource.Response"
            },
            StopProvider: { requestType: "StopProvider.Request", responseType: "StopProvider.Response" }
          }
        },
        GetProviderSchema: {
          fields: {},
          nested: {
            Request: { fields: {} },
            Response: {
              fields: {
                provider: { type: "Schema", id: 1 },
                resourceSchemas: { keyType: "string", type: "Schema", id: 2 },
                dataSourceSchemas: { keyType: "string", type: "Schema", id: 3 },
                diagnostics: { rule: "repeated", type: "Diagnostic", id: 4 },
                providerMeta: { type: "Schema", id: 5 }
              }
            }
          }
        },
        ValidateProviderConfig: {
          fields: {},
          nested: {
            Request: { fields: { config: { type: "DynamicValue", id: 1 } } },
            Response: { fields: { diagnostics: { rule: "repeated", type: "Diagnostic", id: 2 } } }
          }
        },
        UpgradeResourceState: {
          fields: {},
          nested: {
            Request: {
              fields: {
                typeName: { type: "string", id: 1 },
                version: { type: "int64", id: 2 },
                rawState: { type: "RawState", id: 3 }
              }
            },
            Response: {
              fields: {
                upgradedState: { type: "DynamicValue", id: 1 },
                diagnostics: { rule: "repeated", type: "Diagnostic", id: 2 }
              }
            }
          }
        },
        ValidateResourceConfig: {
          fields: {},
          nested: {
            Request: {
              fields: { typeName: { type: "string", id: 1 }, config: { type: "DynamicValue", id: 2 } }
            },
            Response: { fields: { diagnostics: { rule: "repeated", type: "Diagnostic", id: 1 } } }
          }
        },
        ValidateDataResourceConfig: {
          fields: {},
          nested: {
            Request: {
              fields: { typeName: { type: "string", id: 1 }, config: { type: "DynamicValue", id: 2 } }
            },
            Response: { fields: { diagnostics: { rule: "repeated", type: "Diagnostic", id: 1 } } }
          }
        },
        ConfigureProvider: {
          fields: {},
          nested: {
            Request: {
              fields: {
                terraformVersion: { type: "string", id: 1 },
                config: { type: "DynamicValue", id: 2 }
              }
            },
            Response: { fields: { diagnostics: { rule: "repeated", type: "Diagnostic", id: 1 } } }
          }
        },
        ReadResource: {
          fields: {},
          nested: {
            Request: {
              fields: {
                typeName: { type: "string", id: 1 },
                currentState: { type: "DynamicValue", id: 2 },
                private: { type: "bytes", id: 3 },
                providerMeta: { type: "DynamicValue", id: 4 }
              }
            },
            Response: {
              fields: {
                newState: { type: "DynamicValue", id: 1 },
                diagnostics: { rule: "repeated", type: "Diagnostic", id: 2 },
                private: { type: "bytes", id: 3 }
              }
            }
          }
        },
        PlanResourceChange: {
          fields: {},
          nested: {
            Request: {
              fields: {
                typeName: { type: "string", id: 1 },
                priorState: { type: "DynamicValue", id: 2 },
                proposedNewState: { type: "DynamicValue", id: 3 },
                config: { type: "DynamicValue", id: 4 },
                priorPrivate: { type: "bytes", id: 5 },
                providerMeta: { type: "DynamicValue", id: 6 }
              }
            },
            Response: {
              fields: {
                plannedState: { type: "DynamicValue", id: 1 },
                requiresReplace: { rule: "repeated", type: "AttributePath", id: 2 },
                plannedPrivate: { type: "bytes", id: 3 },
                diagnostics: { rule: "repeated", type: "Diagnostic", id: 4 }
              }
            }
          }
        },
        ApplyResourceChange: {
          fields: {},
          nested: {
            Request: {
              fields: {
                typeName: { type: "string", id: 1 },
                priorState: { type: "DynamicValue", id: 2 },
                plannedState: { type: "DynamicValue", id: 3 },
                config: { type: "DynamicValue", id: 4 },
                plannedPrivate: { type: "bytes", id: 5 },
                providerMeta: { type: "DynamicValue", id: 6 }
              }
            },
            Response: {
              fields: {
                newState: { type: "DynamicValue", id: 1 },
                private: { type: "bytes", id: 2 },
                diagnostics: { rule: "repeated", type: "Diagnostic", id: 3 }
              }
            }
          }
        },
        ImportResourceState: {
          fields: {},
          nested: {
            Request: { fields: { typeName: { type: "string", id: 1 }, id: { type: "string", id: 2 } } },
            ImportedResource: {
              fields: {
                typeName: { type: "string", id: 1 },
                state: { type: "DynamicValue", id: 2 },
                private: { type: "bytes", id: 3 }
              }
            },
            Response: {
              fields: {
                importedResources: { rule: "repeated", type: "ImportedResource", id: 1 },
                diagnostics: { rule: "repeated", type: "Diagnostic", id: 2 }
              }
            }
          }
        },
        ReadDataSource: {
          fields: {},
          nested: {
            Request: {
              fields: {
                typeName: { type: "string", id: 1 },
                config: { type: "DynamicValue", id: 2 },
                providerMeta: { type: "DynamicValue", id: 3 }
              }
            },
            Response: {
              fields: {
                state: { type: "DynamicValue", id: 1 },
                diagnostics: { rule: "repeated", type: "Diagnostic", id: 2 }
              }
            }
          }
        }
      }
    }
  }
};

// src/terraform/plugin/client.ts
var debug7 = createDebugger("Client");
var protocols = {
  tfplugin5: tfplugin5_default,
  tfplugin6: tfplugin6_default
};
var createPluginClient = async (props) => {
  const proto = protocols[props.protocol.split(".").at(0) ?? ""];
  if (!proto) {
    throw new Error(`We don't have support for the ${props.protocol} protocol`);
  }
  const pack2 = fromJSON(proto);
  const grpc = loadPackageDefinition(pack2);
  const client = new grpc["tfplugin" + props.version].Provider(
    `unix://${props.endpoint}`,
    credentials.createInsecure(),
    {
      "grpc.max_receive_message_length": 100 * 1024 * 1024,
      "grpc.max_send_message_length": 100 * 1024 * 1024
    }
  );
  debug7("init", props.protocol);
  await new Promise((resolve2, reject) => {
    const deadline = /* @__PURE__ */ new Date();
    deadline.setSeconds(deadline.getSeconds() + 10);
    client.waitForReady(deadline, (error) => {
      if (error) {
        reject(error);
      } else {
        resolve2();
      }
    });
  });
  debug7("connected");
  return {
    call(method, payload) {
      return new Promise((resolve2, reject) => {
        const fn = client[method];
        debug7("call", method);
        if (!fn) {
          reject(new Error(`Unknown method call: ${method}`));
          return;
        }
        fn.call(client, payload, (error, response) => {
          if (error) {
            debug7("failed", error);
            reject(error);
          } else if (response.diagnostics) {
            debug7("failed", response);
            reject(throwDiagnosticError(response));
          } else {
            resolve2(response);
          }
        });
      });
    }
  };
};

// src/terraform/plugin/download.ts
import jszip from "jszip";
import { stat as stat2, writeFile as writeFile2 } from "fs/promises";
import { join as join3 } from "path";

// src/terraform/plugin/registry.ts
import { arch, platform } from "os";
import { compare } from "semver";
var baseUrl = "https://registry.terraform.io/v1/providers";
var getProviderVersions = async (org, type) => {
  const resp = await fetch(`${baseUrl}/${org}/${type}/versions`);
  const data = await resp.json();
  const versions = data.versions;
  const os = platform();
  const ar = arch();
  const supported = versions.filter((v) => {
    return !!v.platforms.find((p) => p.os === os && p.arch === ar);
  });
  const sorted = supported.sort((a, b) => compare(a.version, b.version));
  const latest = sorted.at(-1);
  if (!latest) {
    throw new Error("Version is unsupported for your platform.");
  }
  return {
    versions,
    supported,
    latest: latest.version
  };
};
var getProviderDownloadUrl = async (org, type, version) => {
  const os = platform();
  const ar = arch();
  const url = [baseUrl, org, type, version, "download", os, ar].join("/");
  const response = await fetch(url);
  const result = await response.json();
  return {
    url: result.download_url,
    shasum: result.shasum,
    protocols: result.protocols
  };
};

// src/terraform/plugin/download.ts
var exists = async (file2) => {
  try {
    await stat2(file2);
  } catch (error) {
    return false;
  }
  return true;
};
var debug8 = createDebugger("Downloader");
var downloadPlugin = async (location, org, type, version) => {
  if (version === "latest") {
    const { latest } = await getProviderVersions(org, type);
    version = latest;
  }
  const file2 = join3(location, `${org}-${type}-${version}`);
  const exist = await exists(file2);
  if (!exist) {
    debug8(type, "downloading...");
    const info = await getProviderDownloadUrl(org, type, version);
    const res = await fetch(info.url);
    const buf = await res.bytes();
    const zip = await jszip.loadAsync(buf);
    const zipped = zip.filter((file3) => file3.startsWith("terraform-provider")).at(0);
    if (!zipped) {
      throw new Error(`Can't find the provider inside the downloaded zip file.`);
    }
    const binary = await zipped.async("nodebuffer");
    debug8(type, "done");
    await writeFile2(file2, binary, {
      mode: 509
    });
  } else {
    debug8(type, "already downloaded");
  }
  return {
    file: file2,
    version
  };
};

// src/terraform/plugin/server.ts
import { spawn } from "child_process";
var debug9 = createDebugger("Server");
var createPluginServer = (props) => {
  return new Promise((resolve2, reject) => {
    const process2 = spawn(`${props.file}`, ["-debug"]);
    debug9("init");
    process2.stderr.on("data", (data) => {
      if (props.debug) {
        const message = data.toString("utf8");
        console.log(message);
      }
    });
    process2.stdout.once("data", (data) => {
      try {
        const message = data.toString("utf8");
        const matches = message.match(/TF_REATTACH_PROVIDERS\=\'(.*)\'/);
        if (matches && matches.length > 0) {
          const match = matches[0];
          const json = match.slice(23, -1);
          const data2 = JSON.parse(json);
          const entries2 = Object.values(data2);
          if (entries2.length > 0) {
            const entry = entries2[0];
            const version = entry.ProtocolVersion;
            const endpoint = entry.Addr.String;
            debug9("started", endpoint);
            resolve2({
              kill() {
                process2.kill();
              },
              protocol: "tfplugin" + version.toFixed(1),
              version,
              endpoint
            });
            return;
          }
        }
      } catch (error) {
      }
      reject(new Error("Failed to start the plugin"));
    });
  });
};

// src/terraform/plugin/schema.ts
var NestingMode = {
  INVALID: 0,
  SINGLE: 1,
  LIST: 2,
  SET: 3,
  MAP: 4,
  GROUP: 5
};
var parseResourceSchema = (schemas) => {
  const props = {};
  for (const [name, schema] of Object.entries(schemas)) {
    if (schema.block) {
      const block = parseBlock(schema.block);
      props[name] = {
        ...block,
        version: block.version ?? schema.version
      };
    }
  }
  return props;
};
var parseProviderSchema = (schema) => {
  if (schema.block) {
    const block = parseBlock(schema.block);
    return {
      ...block,
      version: block.version ?? schema.version
    };
  }
  throw new Error("Invalid block");
};
var parseBlock = (block) => {
  const properties = {};
  for (const entry of block.attributes ?? []) {
    properties[entry.name] = parseAttribute(entry);
  }
  for (const entry of block.blockTypes ?? []) {
    properties[entry.typeName] = parseNestedBlock(entry);
  }
  if (block.deprecated) {
    console.warn("Deprecated block");
  }
  return {
    type: "object",
    version: block.version,
    description: block.description,
    // deprecated: block.deprecated,
    properties
  };
};
var parseNestedBlock = (block) => {
  const type = parseNestedBlockType(block.nesting);
  const item = parseBlock(block.block);
  const prop = {
    optional: true,
    required: false,
    computed: false
  };
  if (type === "array" || type === "record") {
    return {
      ...prop,
      type,
      item
    };
  }
  return {
    ...prop,
    ...item
  };
};
var parseNestedBlockType = (mode) => {
  if (mode === NestingMode.LIST || mode === NestingMode.SET) {
    return "array";
  }
  if (mode === NestingMode.MAP) {
    return "record";
  }
  if (mode === NestingMode.GROUP) {
    return "object";
  }
  if (mode === NestingMode.SINGLE) {
    return "object";
  }
  throw new Error(`Invalid nested block type ${mode}`);
};
var parseAttribute = (attr) => {
  const prop = {
    description: attr.description,
    required: attr.required,
    optional: attr.optional,
    computed: attr.computed,
    deprecated: attr.deprecated,
    sensitive: attr.sensitive
  };
  if (attr.type) {
    const json = JSON.parse(attr.type.toString("utf8"));
    return {
      ...prop,
      ...parseAttributeType(json)
    };
  }
  if (attr.nestedType) {
    return {
      ...prop,
      ...parseBlock(attr.nestedType)
      // properties: parseBlock(attr.nestedType).properties,
    };
  }
  throw new Error("Empty attr");
};
var parseAttributeType = (item) => {
  if (Array.isArray(item)) {
    const type2 = parseType(item[0]);
    if (type2 === "array" || type2 === "record" && item) {
      const record = item[1];
      return {
        type: type2,
        item: parseAttributeType(record)
      };
    }
    if (type2 === "object") {
      const object = item[1];
      const properties = {};
      for (const [name, prop] of Object.entries(object)) {
        properties[name] = parseAttributeType(prop);
      }
      return {
        type: type2,
        properties
      };
    }
    throw new Error("Invalid attribute type");
  }
  const type = parseType(item);
  if (isLeafType(type)) {
    return {
      type
    };
  }
  throw new Error(`Invalid attribute type`);
};
var isLeafType = (type) => {
  return ["string", "number", "boolean", "unknown"].includes(type);
};
var parseType = (type) => {
  if (type === "string") {
    return "string";
  }
  if (type === "number") {
    return "number";
  }
  if (type === "bool") {
    return "boolean";
  }
  if (["set", "list"].includes(type)) {
    return "array";
  }
  if (type === "object") {
    return "object";
  }
  if (type === "map") {
    return "record";
  }
  if (type === "dynamic") {
    return "unknown";
  }
  throw new Error(`Invalid type: ${type}`);
};

// src/terraform/plugin/version/util.ts
import { pack, unpack } from "msgpackr";
var encodeDynamicValue = (value) => {
  return {
    msgpack: pack(value),
    json: value
  };
};
var decodeDynamicValue = (value) => {
  return unpack(value.msgpack);
};
var prepareEmptyState = (prop) => {
  if (prop.type !== "object") {
    return {};
  }
  const empty = {};
  for (const name of Object.keys(prop.properties)) {
    empty[name] = null;
  }
  return empty;
};

// src/terraform/plugin/version/5.ts
var createPlugin5 = async ({
  server,
  client
}) => {
  const schema = await client.call("GetSchema");
  const provider = parseProviderSchema(schema.provider);
  const resources = parseResourceSchema(schema.resourceSchemas);
  const dataSources = parseResourceSchema(schema.dataSourceSchemas);
  const prepareResourceEmpty = (type) => {
    const resource = resources[type];
    if (!resource) {
      throw new Error(`Unknown resource type: ${type}`);
    }
    return prepareEmptyState(resource);
  };
  const prepareDataSourceEmpty = (type) => {
    const dataSource = dataSources[type];
    if (!dataSource) {
      throw new Error(`Unknown data source type: ${type}`);
    }
    return prepareEmptyState(dataSource);
  };
  return {
    schema() {
      return {
        provider,
        resources,
        dataSources
      };
    },
    async stop() {
      await client.call("Stop");
      server.kill();
    },
    async configure(config) {
      const prepared = await client.call("PrepareProviderConfig", {
        config: encodeDynamicValue({
          ...prepareEmptyState(provider),
          ...config
        })
      });
      await client.call("Configure", {
        config: prepared.preparedConfig
        // config: encodeDynamicValue(unpack(prepared.preparedConfig.msgpack)),
      });
    },
    async readResource(type, state) {
      const read = await client.call("ReadResource", {
        typeName: type,
        currentState: encodeDynamicValue({
          ...prepareResourceEmpty(type),
          ...state
        })
      });
      return decodeDynamicValue(read.newState);
    },
    async readDataSource(type, state) {
      const read = await client.call("ReadDataSource", {
        typeName: type,
        config: encodeDynamicValue({
          ...prepareDataSourceEmpty(type),
          ...state
        })
      });
      return decodeDynamicValue(read.state);
    },
    async validateResource(type, state) {
      const empty = prepareResourceEmpty(type);
      await client.call("ValidateResourceTypeConfig", {
        typeName: type,
        config: encodeDynamicValue({ ...empty, ...state })
      });
    },
    async applyResourceChange(type, priorState, proposedNewState) {
      const empty = prepareResourceEmpty(type);
      const plan = await client.call("PlanResourceChange", {
        typeName: type,
        priorState: encodeDynamicValue(priorState && { ...empty, ...priorState }),
        proposedNewState: encodeDynamicValue(proposedNewState && { ...empty, ...proposedNewState }),
        config: encodeDynamicValue({ ...empty, ...proposedNewState })
      });
      const plannedState = decodeDynamicValue(plan.plannedState);
      const apply = await client.call("ApplyResourceChange", {
        typeName: type,
        priorState: encodeDynamicValue(priorState && { ...empty, ...priorState }),
        plannedState: encodeDynamicValue(plannedState && { ...empty, ...plannedState }),
        config: encodeDynamicValue(plannedState && { ...empty, ...plannedState })
      });
      return decodeDynamicValue(apply.newState);
    }
  };
};

// src/terraform/plugin/version/6.ts
var createPlugin6 = async ({
  server,
  client
}) => {
  const schema = await client.call("GetProviderSchema");
  const provider = parseProviderSchema(schema.provider);
  const resources = parseResourceSchema(schema.resourceSchemas);
  const dataSources = parseResourceSchema(schema.dataSourceSchemas);
  const prepareResourceEmpty = (type) => {
    const resource = resources[type];
    if (!resource) {
      throw new Error(`Unknown resource type: ${type}`);
    }
    return prepareEmptyState(resource);
  };
  const prepareDataSourceEmpty = (type) => {
    const dataSource = dataSources[type];
    if (!dataSource) {
      throw new Error(`Unknown data source type: ${type}`);
    }
    return prepareEmptyState(dataSource);
  };
  return {
    schema() {
      return {
        provider,
        resources,
        dataSources
      };
    },
    async stop() {
      await client.call("StopProvider");
      server.kill();
    },
    async configure(config) {
      const prepared = await client.call("ValidateProviderConfig", {
        config: encodeDynamicValue({
          ...prepareEmptyState(provider),
          ...config
        })
      });
      await client.call("ConfigureProvider", {
        config: prepared.preparedConfig
        // config: encodeDynamicValue(unpack(prepared.preparedConfig.msgpack)),
      });
    },
    async readResource(type, state) {
      const read = await client.call("ReadResource", {
        typeName: type,
        currentState: encodeDynamicValue({
          ...prepareResourceEmpty(type),
          ...state
        })
      });
      return decodeDynamicValue(read.newState);
    },
    async readDataSource(type, state) {
      const read = await client.call("ReadDataSource", {
        typeName: type,
        config: encodeDynamicValue({
          ...prepareDataSourceEmpty(type),
          ...state
        })
      });
      return decodeDynamicValue(read.state);
    },
    async validateResource(type, state) {
      const empty = prepareResourceEmpty(type);
      await client.call("ValidateResourceConfig", {
        typeName: type,
        config: encodeDynamicValue({ ...empty, ...state })
      });
    },
    async applyResourceChange(type, priorState, proposedState) {
      const empty = prepareResourceEmpty(type);
      const plan = await client.call("PlanResourceChange", {
        typeName: type,
        priorState: encodeDynamicValue(priorState && { ...empty, ...priorState }),
        proposedNewState: encodeDynamicValue(proposedState && { ...empty, ...proposedState }),
        config: encodeDynamicValue(proposedState && { ...empty, ...proposedState })
      });
      const plannedState = decodeDynamicValue(plan.plannedState);
      const apply = await client.call("ApplyResourceChange", {
        typeName: type,
        priorState: encodeDynamicValue(priorState && { ...empty, ...priorState }),
        plannedState: encodeDynamicValue(plannedState && { ...empty, ...plannedState }),
        config: encodeDynamicValue(plannedState && { ...empty, ...plannedState })
      });
      return decodeDynamicValue(apply.newState);
    }
  };
};

// src/terraform/provider.ts
import { writeFile as writeFile3 } from "fs/promises";
import { join as join4 } from "path";

// src/terraform/type-gen.ts
import { camelCase, pascalCase } from "change-case";
var generateTypes = (providers, resouces, dataSources) => {
  const code = [`import { Input, Output, ResourceClass, DataSource } from './base.ts'`];
  for (const [type, props] of Object.entries(resouces)) {
    const input = generateResourceInputTypes(type, props);
    const output2 = generateResourceOutputTypes(type, props);
    code.push(input);
    code.push(output2);
  }
  for (const [type, props] of Object.entries(dataSources)) {
    const input = generateResourceInputTypes(type, props);
    const output2 = generateResourceOutputTypes(type, props);
    code.push(input);
    code.push(output2);
  }
  code.push(generateResourceInterface(resouces));
  code.push(generateProviderInterface(providers));
  return code.join("\n\n");
};
var generateProviderInterface = (providers) => {
  const code = [`declare global {
`, `	interface TerraformProviders {
`];
  for (const [ns, props] of Object.entries(providers)) {
    code.push(`		${ns}: `);
    code.push(
      generateValue(props, {
        depth: 0,
        indent: 3,
        wrap: (v) => v,
        filter: () => true,
        optional: (p) => p.optional ?? false
      })
    );
  }
  code.push("	}\n");
  code.push("}\n");
  return code.join("");
};
var groupByNamespace = (resources, minLevel, maxLevel) => {
  const grouped = {};
  for (const type of Object.keys(resources)) {
    const names = type.split("_");
    if (names.length < minLevel) {
      throw new Error(`Resource not properly namespaced: ${type}`);
    }
    let current = grouped;
    let count = Math.min(maxLevel, names.length - 1);
    while (count--) {
      const ns = camelCase(names.shift());
      if (!current[ns]) {
        current[ns] = {};
      }
      current = current[ns];
    }
    const name = pascalCase(names.join("_"));
    current[name] = type;
  }
  return grouped;
};
var generateResourceInterface = (resources) => {
  const grouped = groupByNamespace(resources, 1, 2);
  const code = [`declare global {
`, `	interface TerraformResources {
`];
  const renderNamespace = (name, group, indent) => {
    const tabs = `	`.repeat(indent);
    code.push(`${tabs}${name}: {
`);
    for (const [ns, entry] of Object.entries(group)) {
      if (typeof entry === "string") {
        renderResource(ns, entry, indent + 1);
      } else {
        renderNamespace(ns, entry, indent + 1);
      }
    }
    code.push(`${tabs}}
`);
  };
  const renderResource = (name, type, indent) => {
    const tabs = `	`.repeat(indent);
    const propName = pascalCase(name);
    const className = pascalCase(type);
    code.push(`${tabs}${propName}: ResourceClass<${className}Props, ${className}, "${type}">
`);
  };
  for (const [ns, entry] of Object.entries(grouped)) {
    renderNamespace(ns, entry, 2);
  }
  code.push("	}\n");
  code.push("}\n");
  return code.join("");
};
var generateResourceInputTypes = (type, prop) => {
  const code = [
    `type ${pascalCase(type)}Props = `,
    generateValue(prop, {
      depth: 0,
      indent: 1,
      wrap: (v, p, ctx) => ctx.depth > 1 ? `Input<${p.optional ? `${v} | undefined` : v}>` : v,
      filter: (prop2) => !(prop2.computed && typeof prop2.optional === "undefined" && typeof prop2.required === "undefined"),
      optional: (p) => p.optional ?? false
    })
  ].flat();
  return code.join("");
};
var generateResourceOutputTypes = (type, prop) => {
  const code = [
    `type ${pascalCase(type)} = `,
    generateValue(prop, {
      indent: 1,
      depth: 0,
      wrap: (v, p, ctx) => ctx.depth === 2 ? `Output<${p.optional && !p.computed ? `${v} | undefined` : v}>` : v,
      filter: () => true,
      readonly: true,
      // required: true,
      optional: (p, ctx) => ctx.depth > 2 && p.optional && !p.computed || false
    })
  ].flat();
  return code.join("");
};
var generateValue = (prop, ctx) => {
  ctx.depth++;
  if (["string", "number", "boolean", "unknown"].includes(prop.type)) {
    return ctx.wrap(prop.type, prop, ctx);
  }
  if (prop.type === "array") {
    const type = generateValue(prop.item, ctx);
    const array = ctx.readonly ? `ReadonlyArray<${type}>` : `Array<${type}>`;
    return ctx.wrap(array, prop, ctx);
  }
  if (prop.type === "record") {
    const type = generateValue(prop.item, ctx);
    const record = ctx.readonly ? `Readonly<Record<string, ${type}>>` : `Record<string, ${type}>`;
    return ctx.wrap(record, prop, ctx);
  }
  if (prop.type === "object") {
    const type = [
      "{",
      Object.entries(prop.properties).filter(([_, p]) => ctx.filter(p)).map(
        ([name, prop2]) => [
          prop2.description ? [`
`, `	`.repeat(ctx.indent), `/** `, prop2.description.trim(), " */", "\n"].join("") : "",
          `	`.repeat(ctx.indent),
          // ctx.readonly ? "readonly " : "",
          name,
          ctx.optional(prop2, ctx) ? "?" : "",
          ": ",
          generateValue(prop2, { ...ctx, indent: ctx.indent + 1 })
        ].join("")
      ).join("\n"),
      `${`	`.repeat(ctx.indent - 1)}}`
    ].join("\n");
    const object = ctx.readonly ? `Readonly<${type}>` : type;
    return ctx.wrap(object, prop, ctx);
  }
  throw new Error(`Unknown property type: ${prop.type}`);
};

// src/terraform/provider.ts
var TerraformProvider = class {
  constructor(id, createPlugin, config) {
    this.id = id;
    this.createPlugin = createPlugin;
    this.config = config;
  }
  configured;
  plugin;
  async configure() {
    const plugin = await this.prepare();
    if (!this.configured) {
      this.configured = plugin.configure(this.config);
    }
    await this.configured;
    return plugin;
  }
  prepare() {
    if (!this.plugin) {
      this.plugin = this.createPlugin();
    }
    return this.plugin;
  }
  async destroy() {
    if (this.plugin) {
      const plugin = await this.plugin;
      plugin.stop();
      this.plugin = void 0;
      this.configured = void 0;
    }
  }
  ownResource(id) {
    return `terraform:${this.id}` === id;
  }
  async getResource({ type, state }) {
    const plugin = await this.configure();
    const newState = await plugin.readResource(type, state);
    console.log("STATE", newState);
    if (!newState) {
      throw new Error(`Resource not found ${type}`);
    }
    return {
      version: 0,
      state: newState
    };
  }
  async createResource({ type, state }) {
    const plugin = await this.configure();
    const newState = await plugin.applyResourceChange(type, null, state);
    return {
      version: 0,
      state: newState
    };
  }
  async updateResource({ type, priorState, proposedState }) {
    const plugin = await this.configure();
    const newState = await plugin.applyResourceChange(type, priorState, proposedState);
    return {
      version: 0,
      state: newState
    };
  }
  async deleteResource({ type, state }) {
    const plugin = await this.configure();
    await plugin.applyResourceChange(type, state, null);
  }
  async getData({ type, state }) {
    const plugin = await this.configure();
    const data = await plugin.readDataSource(type, state);
    if (!data) {
      throw new Error(`Data source not found ${type}`);
    }
    return {
      state: data
    };
  }
  async generateTypes(dir) {
    const plugin = await this.prepare();
    const schema = plugin.schema();
    const types = generateTypes(
      {
        [this.id]: schema.provider
      },
      schema.resources,
      schema.dataSources
    );
    await writeFile3(join4(dir, `${this.id}.types.d.ts`), types);
    await this.destroy();
  }
};

// src/terraform/installer.ts
var debug10 = createDebugger("Plugin");
var Terraform = class {
  constructor(props) {
    this.props = props;
  }
  async install(org, type, version = "latest") {
    const { file: file2, version: realVersion } = await downloadPlugin(this.props.providerLocation, org, type, version);
    return (config) => {
      const createLazyPlugin = async () => {
        const server = await createPluginServer({ file: file2, debug: false });
        const client = await createPluginClient(server);
        const plugins = {
          5: () => createPlugin5({ server, client }),
          6: () => createPlugin6({ server, client })
        };
        const plugin = await plugins[server.version]?.();
        debug10(org, type, realVersion);
        if (!plugin) {
          throw new Error(`No plugin client available for protocol version ${server.version}`);
        }
        return plugin;
      };
      return new TerraformProvider(type, createLazyPlugin, config);
    };
  }
};

// src/terraform/resource.ts
import { snakeCase } from "change-case";

// src/formation/data-source.ts
var createDataSourceMeta = (provider, parent, type, id, physicalId) => {
  const urn = createUrn(type, id, parent.urn);
  const stack = findParentStack(parent);
  let output2;
  return {
    tag: "data-source",
    urn,
    id,
    physicalId,
    type,
    stack,
    provider,
    resolve(data) {
      output2 = data;
    },
    output(cb) {
      return new Output(/* @__PURE__ */ new Set([this]), (resolve2) => {
        if (!output2) {
          throw new Error(`Unresolved output for data-source: ${type} ${id}`);
        }
        resolve2(cb(output2));
      });
    }
  };
};

// src/terraform/resource.ts
var createNamespaceProxy = (cb, target = {}) => {
  const cache = /* @__PURE__ */ new Map();
  return new Proxy(target, {
    get(_, key) {
      if (!cache.has(key)) {
        cache.set(key, cb(key));
      }
      return cache.get(key);
    },
    set(_, key) {
      throw new Error(`Cannot assign to ${key} because it is a read-only property.`);
    }
  });
};
var createClassProxy = (construct, get) => {
  return new Proxy(class {
  }, {
    construct(_, args) {
      return construct(...args);
    },
    get(_, key) {
      if (key === "get") {
        return (...args) => {
          return get(...args);
        };
      }
      return;
    }
  });
};
var createRecursiveProxy = (construct, get) => {
  const createProxy = (names) => {
    return createNamespaceProxy((name) => {
      if (name === name.toLowerCase()) {
        return createProxy([...names, name]);
      } else {
        return createClassProxy(
          (...args) => {
            return construct([...names, name], ...args);
          },
          (...args) => {
            return get([...names, name], ...args);
          }
        );
      }
    });
  };
  return createProxy([]);
};
var tf = createRecursiveProxy(
  (names, parent, id, input, config) => {
    const type = snakeCase(names.join("_"));
    const provider = `terraform:${names[0]}`;
    const $ = createResourceMeta(provider, parent, type, id, input, config);
    const resource = createNamespaceProxy(
      (key) => {
        if (key === "$") {
          return $;
        }
        return $.output((data) => data[key]);
      },
      { $ }
    );
    parent.add(resource);
    return resource;
  },
  (names, parent, id, physicalId) => {
    const type = snakeCase(names.join("_"));
    const provider = `terraform:${names[0]}`;
    const $ = createDataSourceMeta(provider, parent, type, id, physicalId);
    const dataSource = createNamespaceProxy(
      (key) => {
        if (key === "$") {
          return $;
        }
        return $.output((data) => data[key]);
      },
      { $ }
    );
    parent.add(dataSource);
    return dataSource;
  }
);
export {
  App,
  AppError,
  DynamoLockProvider,
  FileLockBackend,
  FileStateBackend,
  Future,
  Group,
  MemoryLockBackend,
  MemoryStateBackend,
  Output,
  ResourceAlreadyExists,
  ResourceError,
  ResourceNotFound,
  S3StateBackend,
  Stack,
  StackError,
  Terraform,
  WorkSpace,
  createDebugger,
  createResourceMeta,
  deferredOutput,
  enableDebug,
  output,
  tf
};
