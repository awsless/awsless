export declare const deferTestDatabase: (database: string, create: () => Promise<void>) => void;
export declare const ensureTestDatabase: (database: string) => Promise<void> | undefined;
