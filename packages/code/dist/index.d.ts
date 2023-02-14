import * as rollup from 'rollup';
import { RollupLog } from 'rollup';
import * as child_process from 'child_process';

declare class RuntimeError extends Error {
    constructor(message: string);
}

declare const extensions: string[];
interface RollupOptions {
    format?: 'cjs' | 'esm';
    sourceMap?: boolean;
    external?: (importee: string) => boolean;
    minimize?: boolean;
    moduleSideEffects?: boolean | string[] | 'no-external' | ((id: string, external: boolean) => boolean);
    exports?: 'auto' | 'default' | 'named' | 'none';
    onwarn?: (warning: RollupLog) => void;
    transpilers?: {
        typescript?: boolean;
        coffeescript?: boolean;
    };
}

declare const build: (inputs: string[], output: string, options?: RollupOptions) => Promise<void>;

declare const bundle: (input: string, options?: RollupOptions) => Promise<{
    code: string;
    map: rollup.SourceMap | undefined;
}>;

declare const compile: (input: string, options?: RollupOptions) => Promise<{
    code: string;
    map: rollup.SourceMap | undefined;
}>;

declare const importModule: (input: string, options?: RollupOptions) => Promise<any>;

interface Options extends RollupOptions {
    includePackages?: boolean;
    env?: string[];
}
declare const spawn: (input: string, options?: Options) => Promise<child_process.ChildProcessWithoutNullStreams>;
declare const exec: (input: string, options?: Options) => Promise<unknown>;

export { RuntimeError, build, bundle, compile, exec, extensions, importModule, spawn };
