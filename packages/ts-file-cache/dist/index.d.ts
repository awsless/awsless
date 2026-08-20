//#region src/types.d.ts
type PackageDependency = {
  type: 'package';
  version: string;
  treeHash: string;
};
type WorkspaceDependency = {
  type: 'workspace';
  link: string;
};
type Dependency = PackageDependency | WorkspaceDependency;
type Package = {
  path: string;
  name: string;
  main?: string;
  dependencies: Record<string, Dependency>;
};
type Workspace = {
  cwd: string;
  packages: Record<string, Package>;
  lockfileHash: string;
};
//#endregion
//#region src/index.d.ts
declare const loadWorkspace: (search: string) => Promise<Workspace>;
type Options = {
  extensions?: string[];
};
declare const generateFileHash: (workspace: Workspace, file: string, opts?: Options) => Promise<string>;
declare const generateFolderHash: (workspace: Workspace, folder: string, opts?: Options) => Promise<string>;
//#endregion
export { Dependency, Package, PackageDependency, Workspace, WorkspaceDependency, generateFileHash, generateFolderHash, loadWorkspace };