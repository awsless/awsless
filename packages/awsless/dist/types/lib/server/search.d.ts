export declare const formatSearchIndexName: (stackName: string, indexName: string) => string;
export declare const getSearchProps: (name: string, stack?: string) => {
    readonly endpoint: string | undefined;
    readonly name: string;
};
type SearchMapping = {
    type?: string;
    properties?: Record<string, SearchMapping>;
};
export declare const assertMatchingMappings: (label: string, declared: SearchMapping, defined: SearchMapping, path?: string) => void;
export interface SearchResources {
}
export declare const Search: SearchResources;
export {};
