declare class WeakCache<Key extends string | number | symbol, Value extends unknown> {
    private registry;
    private cache;
    constructor();
    set(key: Key, value: Value): this;
    get(key: Key): Value | undefined;
    get(key: Key, defaultValue: Value): Value;
    has(key: Key): boolean;
    delete(key: Key): boolean;
    clear(): void;
    get size(): number;
    [Symbol.iterator](): IterableIterator<[Key, Value]>;
    keys(): IterableIterator<Key>;
    values(): IterableIterator<Value>;
    entries(): IterableIterator<[Key, Value]>;
}

export { WeakCache };
