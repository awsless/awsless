declare const get: (name: string, defaultValue?: unknown) => any;
declare const string: (name: string, defaultValue?: string) => string;
declare const integer: (name: string, defaultValue?: number) => number;
declare const float: (name: string, defaultValue?: number) => number;
declare const boolean: (name: string, defaultValue?: boolean) => boolean;
declare const array: (name: string, defaultValue?: string[], sep?: string) => string[];
declare const json: (name: string, defaultValue?: any) => any;
declare const enumeration: (name: string, possibilities: string[], defaultValue?: string) => string;

export { array, boolean, enumeration, float, get, integer, json, string };
