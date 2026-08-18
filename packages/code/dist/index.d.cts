import { RollupLog } from "rollup";
import { Alias } from "@rollup/plugin-alias";
//#region src/error/runtime.d.ts
declare class RuntimeError extends Error {
  constructor(message: string);
}
//#endregion
//#region src/rollup/index.d.ts
declare const extensions: string[];
interface RollupOptions {
  format?: 'cjs' | 'esm';
  sourceMap?: boolean;
  external?: (importee: string) => boolean;
  minimize?: boolean;
  moduleSideEffects?: boolean | string[] | 'no-external' | ((id: string, external: boolean) => boolean);
  exports?: 'auto' | 'default' | 'named' | 'none';
  onwarn?: (warning: RollupLog) => void;
  aliases?: Record<string, string> | Alias[];
  transpilers?: {
    typescript?: boolean;
    coffeescript?: boolean;
  };
}
//#endregion
//#region src/build.d.ts
declare const build: (inputs: string[], output: string, options?: RollupOptions) => Promise<void>;
//#endregion
//#region src/bundle.d.ts
declare const bundle: (input: string, options?: RollupOptions) => Promise<{
  code: string;
  map: import("rollup").SourceMap | undefined;
}>;
//#endregion
//#region src/compile.d.ts
declare const compile: (input: string, options?: RollupOptions) => Promise<{
  code: string;
  map: import("rollup").SourceMap | undefined;
}>;
//#endregion
//#region src/import.d.ts
declare const importModule: (input: string, options?: RollupOptions) => Promise<any>;
//#endregion
//#region src/run.d.ts
interface Options extends RollupOptions {
  includePackages?: boolean;
  env?: string[];
}
declare const spawn: (input: string, options?: Options) => Promise<import("node:child_process").ChildProcessWithoutNullStreams>;
declare const exec: (input: string, options?: Options) => Promise<unknown>;
//#endregion
export { RuntimeError, build, bundle, compile, exec, extensions, importModule, spawn };