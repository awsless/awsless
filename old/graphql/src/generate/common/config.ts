export const RUNTIME_LIB_NAME = '@gqlts/runtime'

// export interface Config {
//   verbose?: boolean;
//   endpoint?: string;
//   useGet?: boolean;
//   // the schema string
//   schema?: string;
//   // the output dir
//   output?: string;
//   methodPrefix?: string;
//   methodSuffix?: string;
//   // options?: Options
//   headers?: Record<string, string>;
// }

export type Config = {
	package?: string
	scalarTypes?: { [k: string]: string }
}
