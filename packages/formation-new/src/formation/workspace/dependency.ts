import { run, Step } from "promise-dag";
import { URN } from "../resource.ts";
import { entries } from "./entries.ts";

export class DependencyGraph {
  private graph: Record<URN, Step[]> = {};

  add(urn: URN, deps: Step[], callback: () => Promise<void>) {
    this.graph[urn] = [...deps, callback];
  }

  run() {
    return Promise.allSettled(Object.values(run(this.graph)));
  }
}

export const dependentsOn = (
  resources: Record<URN, { dependencies: URN[] }>,
  dependency: URN
) => {
  const dependents: URN[] = [];

  for (const [urn, resource] of entries(resources)) {
    if (resource.dependencies.includes(dependency)) {
      dependents.push(urn);
    }
  }

  return dependents;
};
