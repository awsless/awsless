import { Numeric } from '@awsless/big-float';
import { Duration } from '@awsless/duration';
import { RedisOptions } from 'ioredis';

declare const mockRedis: () => void;

type InputValue = number | string;
type RedisClient = {
    send: <T = any>(name: string, args: (InputValue | undefined)[]) => Promise<T>;
    batch: <T = any[]>(commands: {
        name: string;
        args: (InputValue | undefined)[];
    }[]) => Promise<T>;
    transact: <T = any[]>(commands: {
        name: string;
        args: (InputValue | undefined)[];
    }[]) => Promise<T>;
    destroy(): Promise<void>;
};
type Command<T, R> = {
    preloadScript?: string;
    name: string;
    args: (InputValue | undefined)[];
    resolve: (response: R) => T;
    then<Result1 = T, Result2 = never>(onfulfilled: (value: T) => Result1, onrejected?: (reason: any) => Result2): Promise<Result1 | Result2>;
};

/**
 * Get a string value by key.
 *
 * @command GET
 * @complexity O(1)
 * @speed fast
 * @since 1.0.0
 */
declare const get$3: (client: RedisClient, key: string) => Command<string | undefined, string | null>;
/**
 * Set a string value with optional TTL and existence conditions.
 *
 * @command SET
 * @complexity O(1)
 * @speed slow
 * @since 1.0.0
 */
declare const set$4: (client: RedisClient, key: string, value: InputValue, options?: {
    ttl?: Duration | Date | "keep";
    when?: "not-exists" | "exists";
}) => Command<boolean, number>;
/**
 * Check whether a key exists.
 *
 * @command EXISTS
 * @complexity O(N) where N is the number of keys to check
 * @speed fast
 * @since 1.0.0
 */
declare const has$5: (client: RedisClient, key: string) => Command<boolean, string | number>;
/**
 * Increment a numeric string value by a given amount.
 *
 * @command INCRBYFLOAT
 * @complexity O(1)
 * @speed fast
 * @since 2.6.0
 */
declare const incr$2: (client: RedisClient, key: string, value?: Numeric) => Command<`${number}`, `${number}`>;
/**
 * Decrement a numeric string value by a given amount.
 *
 * @command INCRBYFLOAT
 * @complexity O(1)
 * @speed fast
 * @since 2.6.0
 */
declare const decr$1: (client: RedisClient, key: string, value?: Numeric) => Command<`${number}`, `${number}`>;
/**
 * Append text to the end of a string value.
 *
 * @command APPEND
 * @complexity O(1). The amortized time complexity is O(1) assuming the appended value is small and the already present value is any size
 * @speed fast
 * @since 2.0.0
 */
declare const append$1: (client: RedisClient, key: string, value: string) => Command<number, string>;
/**
 * Read a substring by start and end offsets.
 *
 * @command GETRANGE
 * @complexity O(N) where N is the length of the returned string
 * @speed slow
 * @since 2.4.0
 */
declare const substring: (client: RedisClient, key: string, start: number, end?: number) => Command<string, string>;
/**
 * Delete a key.
 *
 * @command DEL
 * @complexity O(N) where N is the number of keys that will be removed
 * @speed slow
 * @since 1.0.0
 */
declare const del$5: (client: RedisClient, key: string) => Command<boolean, number>;

declare const string_substring: typeof substring;
declare namespace string {
  export { append$1 as append, decr$1 as decr, del$5 as delete, get$3 as get, has$5 as has, incr$2 as incr, set$4 as set, string_substring as substring };
}

type KeyType = 'none' | 'string' | 'list' | 'set' | 'zset' | 'hash' | 'stream';
/**
 * Check whether a key exists.
 *
 * @command EXISTS
 * @complexity O(N) where N is the number of keys to check
 * @speed fast
 * @since 1.0.0
 */
declare const has$4: (client: RedisClient, key: string) => Command<boolean, string | number>;
/**
 * Delete a key.
 *
 * @command DEL
 * @complexity O(N) where N is the number of keys that will be removed
 * @speed slow
 * @since 1.0.0
 */
declare const del$4: (client: RedisClient, key: string) => Command<boolean, number>;

/**
 * Get the type of value stored at a key.
 *
 * @command TYPE
 * @complexity O(1)
 * @speed fast
 * @since 1.0.0
 */
declare const type: (client: RedisClient, key: string) => Command<KeyType, KeyType>;
/**
 * Rename a key.
 *
 * @command RENAME | RENAMENX
 * @complexity O(1)
 * @speed fast
 * @since 1.0.0
 */
declare const rename: (client: RedisClient, from: string, to: string, options?: {
    when?: "not-exists";
}) => Command<boolean, string>;

type key_KeyType = KeyType;
declare const key_rename: typeof rename;
declare const key_type: typeof type;
declare namespace key {
  export { type key_KeyType as KeyType, del$4 as del, del$4 as delete, has$4 as has, key_rename as rename, key_type as type };
}

type ScanOptions = {
    match?: string;
    limit?: number;
    cursor?: string;
};

/**
 * Set expirations on one or more hash fields.
 *
 * @command HPEXPIRE | HPEXPIREAT
 * @complexity O(N) where N is the number of specified fields
 * @speed fast
 * @since 7.4.0
 */
declare const set$3: (client: RedisClient, key: string, ttl: Duration | Date, ...fields: [string, ...string[]]) => Command<boolean[], number[]>;
/**
 * Get expiration dates for hash fields.
 *
 * @command HPEXPIRETIME
 * @complexity O(N) where N is the number of specified fields
 * @speed fast
 * @since 7.4.0
 */
declare const get$2: (client: RedisClient, key: string, ...fields: [string, ...string[]]) => Command<(Date | undefined)[], number[]>;
/**
 * Get remaining TTL durations for hash fields.
 *
 * @command HPTTL
 * @complexity O(N) where N is the number of specified fields
 * @speed fast
 * @since 7.4.0
 */
declare const duration$1: (client: RedisClient, key: string, ...fields: [string, ...string[]]) => Command<(Duration | undefined)[], number[]>;
/**
 * Remove expirations from hash fields.
 *
 * @command HPERSIST
 * @complexity O(N) where N is the number of specified fields
 * @speed fast
 * @since 7.4.0
 */
declare const persist$1: (client: RedisClient, key: string, ...fields: [string, ...string[]]) => Command<boolean[], number[]>;

declare namespace ttl$1 {
  export { persist$1 as delete, duration$1 as duration, get$2 as get, set$3 as set };
}

/**
 * Get a hash field value.
 *
 * @command HGET
 * @complexity O(1)
 * @speed fast
 * @since 2.0.0
 */
declare const get$1: (client: RedisClient, key: string, field: string) => Command<string | undefined, string | null>;
/**
 * Set a hash field value.
 *
 * @command HSET
 * @complexity O(1) for each field/value pair added
 * @speed fast
 * @since 2.0.0
 */
declare const set$2: (client: RedisClient, key: string, field: string, value: InputValue) => Command<boolean, number>;
/**
 * Check whether a hash field exists.
 *
 * @command HEXISTS
 * @complexity O(1)
 * @speed fast
 * @since 2.0.0
 */
declare const has$3: (client: RedisClient, key: string, field: string) => Command<boolean, number>;
/**
 * Delete a field from a hash.
 *
 * @command HDEL
 * @complexity O(N) where N is the number of fields to be removed
 * @speed fast
 * @since 2.0.0
 */
declare const del$3: (client: RedisClient, key: string, field: string) => Command<boolean, number>;

/**
 * Increment a numeric hash field by a given amount.
 *
 * @command HINCRBYFLOAT
 * @complexity O(1)
 * @speed fast
 * @since 2.6.0
 */
declare const incr$1: (client: RedisClient, key: string, field: string, value?: Numeric) => Command<`${number}`, `${number}`>;
/**
 * Decrement a numeric hash field by a given amount.
 *
 * @command HINCRBYFLOAT
 * @complexity O(1)
 * @speed fast
 * @since 2.6.0
 */
declare const decr: (client: RedisClient, key: string, field: string, value?: Numeric) => Command<`${number}`, `${number}`>;
/**
 * Get the number of fields in a hash.
 *
 * @command HLEN
 * @complexity O(1)
 * @speed fast
 * @since 2.0.0
 */
declare const length$3: (client: RedisClient, key: string) => Command<number, string>;
/**
 * Delete an entire hash key.
 *
 * @command DEL
 * @complexity O(N) where N is the number of keys that will be removed
 * @speed slow
 * @since 1.0.0
 */
declare const clear$3: (client: RedisClient, key: string) => Command<boolean, number>;
/**
 * Get all fields and values from a hash.
 *
 * @command HGETALL
 * @complexity O(N) where N is the size of the hash
 * @speed slow
 * @since 2.1.0
 */
declare const all$3: (client: RedisClient, key: string) => Command<Map<string, string>, string[]>;
/**
 * Iterate through hash fields and values.
 *
 * @command HSCAN
 * @complexity O(1) for every call. O(N) for a complete iteration, including enough command calls for the cursor to return to 0
 * @speed slow
 * @since 2.8.0
 */
declare const scan$3: (client: RedisClient, key: string, options?: ScanOptions) => {
    [Symbol.asyncIterator](): {
        next(): Promise<{
            done: true;
        } | {
            done: false;
            value: Map<string, string>;
        }>;
    };
    preloadScript?: string;
    name: string;
    args: (InputValue | undefined)[];
    resolve: (response: [string, string[]]) => {
        cursor: string | undefined;
        items: Map<string, string>;
    };
    then<Result1 = {
        cursor: string | undefined;
        items: Map<string, string>;
    }, Result2 = never>(onfulfilled: (value: {
        cursor: string | undefined;
        items: Map<string, string>;
    }) => Result1, onrejected?: ((reason: any) => Result2) | undefined): Promise<Result1 | Result2>;
};

declare const map_decr: typeof decr;
declare namespace map {
  export { all$3 as all, clear$3 as clear, map_decr as decr, del$3 as delete, get$1 as get, has$3 as has, incr$1 as incr, length$3 as length, scan$3 as scan, set$2 as set, ttl$1 as ttl };
}

/**
 * Set or update the expiration for a string key.
 *
 * @command PEXPIRE | PEXPIREAT
 * @complexity O(1)
 * @speed fast
 * @since 2.6.0
 */
declare const set$1: (client: RedisClient, key: string, ttl: Duration | Date) => Command<boolean, number>;
/**
 * Get the expiration date for a string key.
 *
 * @command PEXPIRETIME
 * @complexity O(1)
 * @speed fast
 * @since 7.0.0
 */
declare const get: (client: RedisClient, key: string) => Command<Date | undefined, number>;
/**
 * Get the remaining TTL duration for a string key.
 *
 * @command PTTL
 * @complexity O(1)
 * @speed fast
 * @since 2.6.0
 */
declare const duration: (client: RedisClient, key: string) => Command<Duration | undefined, number>;
/**
 * Remove the expiration from a string key.
 *
 * @command PERSIST
 * @complexity O(1)
 * @speed fast
 * @since 2.2.0
 */
declare const persist: (client: RedisClient, key: string) => Command<boolean, number>;

declare const ttl_duration: typeof duration;
declare const ttl_get: typeof get;
declare namespace ttl {
  export { persist as delete, ttl_duration as duration, ttl_get as get, set$1 as set };
}

/**
 * Add one or more values to a set.
 *
 * @command SADD
 * @complexity O(N) where N is the number of members to be added
 * @speed fast
 * @since 1.0.0
 */
declare const add$1: (client: RedisClient, key: string, ...values: [InputValue, ...InputValue[]]) => Command<number, string>;
/**
 * Remove one or more values from a set.
 *
 * @command SREM
 * @complexity O(N) where N is the number of members to be removed
 * @speed fast
 * @since 1.0.0
 */
declare const del$2: (client: RedisClient, key: string, ...values: [InputValue, ...InputValue[]]) => Command<number, string>;

/**
 * Check whether a set contains a value.
 *
 * @command SISMEMBER
 * @complexity O(1)
 * @speed fast
 * @since 1.0.0
 */
declare const has$2: (client: RedisClient, key: string, value: InputValue) => Command<boolean, number>;
/**
 * Get one or more random values from a set without removing them.
 *
 * @command SRANDMEMBER
 * @complexity Without the count argument O(1), otherwise O(N) where N is the absolute value of the passed count
 * @speed slow
 * @since 1.0.0
 */
declare function random$1(client: RedisClient, key: string): Command<string | undefined, string | null>;
declare function random$1(client: RedisClient, key: string, count: number): Command<Set<string>, string[]>;
/**
 * Remove and return one or more random values from a set.
 *
 * @command SPOP
 * @complexity Without the count argument O(1), otherwise O(N) where N is the value of the passed count
 * @speed fast
 * @since 1.0.0
 */
declare function pop$2(client: RedisClient, key: string): Command<string | undefined, string | null>;
declare function pop$2(client: RedisClient, key: string, count: number): Command<Set<string>, string[]>;
/**
 * Get the number of values in a set.
 *
 * @command SCARD
 * @complexity O(1)
 * @speed fast
 * @since 1.0.0
 */
declare const length$2: (client: RedisClient, key: string) => Command<number, string>;
/**
 * Delete a set key.
 *
 * @command DEL
 * @complexity O(N) where N is the number of keys that will be removed
 * @speed slow
 * @since 1.0.0
 */
declare const clear$2: (client: RedisClient, key: string) => Command<boolean, number>;
/**
 * Get all values from a set.
 *
 * @command SMEMBERS
 * @complexity O(N) where N is the set cardinality
 * @speed slow
 * @since 2.1.0
 */
declare const all$2: (client: RedisClient, key: string) => Command<Set<string>, string[]>;
/**
 * Iterate through set values.
 *
 * @command SSCAN
 * @complexity O(1) for every call. O(N) for a complete iteration, including enough command calls for the cursor to return to 0
 * @speed slow
 * @since 2.8.0
 */
declare const scan$2: (client: RedisClient, key: string, options?: ScanOptions) => {
    [Symbol.asyncIterator](): {
        next(): Promise<{
            done: true;
        } | {
            done: false;
            value: Set<string>;
        }>;
    };
    preloadScript?: string;
    name: string;
    args: (InputValue | undefined)[];
    resolve: (response: [string, string[]]) => {
        cursor: string | undefined;
        items: Set<string>;
    };
    then<Result1 = {
        cursor: string | undefined;
        items: Set<string>;
    }, Result2 = never>(onfulfilled: (value: {
        cursor: string | undefined;
        items: Set<string>;
    }) => Result1, onrejected?: ((reason: any) => Result2) | undefined): Promise<Result1 | Result2>;
};

declare namespace set {
  export { add$1 as add, all$2 as all, clear$2 as clear, del$2 as delete, has$2 as has, length$2 as length, pop$2 as pop, random$1 as random, scan$2 as scan };
}

type SortedSetInputValue = [InputValue, Numeric];
type SortedSetOutput = [string, number];
/**
 * Add one or more scored values to a sorted set.
 *
 * @command ZADD
 * @complexity O(log(N)) for each item added, where N is the number of elements in the sorted set
 * @speed fast
 * @since 1.2.0
 */
declare const add: (client: RedisClient, key: string, ...values: [SortedSetInputValue, ...SortedSetInputValue[]]) => Command<number, string>;
/**
 * Increment the score for a value in a sorted set.
 *
 * @command ZINCRBY
 * @complexity O(log(N)) where N is the number of elements in the sorted set
 * @speed fast
 * @since 1.2.0
 */
declare const incr: (client: RedisClient, key: string, value: InputValue, score: Numeric) => Command<number, string>;
/**
 * Get the score for a value in a sorted set.
 *
 * @command ZSCORE
 * @complexity O(1)
 * @speed fast
 * @since 1.2.0
 */
declare const score: (client: RedisClient, key: string, value: InputValue) => Command<number | undefined, string | null>;
/**
 * Get the rank of a value in a sorted set.
 *
 * @command ZRANK
 * @complexity O(log(N)) where N is the number of elements in the sorted set
 * @speed fast
 * @since 2.0.0
 */
declare const indexOf$1: (client: RedisClient, key: string, value: InputValue) => Command<number | undefined, number | null>;
/**
 * Remove one or more values from a sorted set.
 *
 * @command ZREM
 * @complexity O(M*log(N)) with N being the number of elements in the sorted set and M the number of elements to be removed
 * @speed fast
 * @since 1.2.0
 */
declare const del$1: (client: RedisClient, key: string, ...values: [InputValue, ...InputValue[]]) => Command<number, string>;

/**
 * Check whether a sorted set contains a value.
 *
 * @command ZRANK
 * @complexity O(log(N)) where N is the number of elements in the sorted set
 * @speed fast
 * @since 2.0.0
 */
declare const has$1: (client: RedisClient, key: string, value: InputValue) => Command<boolean, number | null>;
/**
 * Get one or more random values from a sorted set.
 *
 * @command ZRANDMEMBER
 * @complexity O(N) where N is the number of members returned
 * @speed slow
 * @since 6.2.0
 */
declare function random(client: RedisClient, key: string): Command<string | undefined, string | null>;
declare function random(client: RedisClient, key: string, count: number): Command<string[], string[]>;
/**
 * Remove and return the lowest or highest scored values.
 *
 * @command ZPOPMIN | ZPOPMAX
 * @complexity O(log(N)*M) with N being the number of elements in the sorted set and M being the number of elements popped
 * @speed fast
 * @since 5.0.0
 */
declare function pop$1(client: RedisClient, key: string, score: 'min' | 'max'): Command<SortedSetOutput | undefined, (number | string)[]>;
declare function pop$1(client: RedisClient, key: string, score: 'min' | 'max', count: number): Command<SortedSetOutput[], (number | string)[]>;
/**
 * Get the number of values in a sorted set.
 *
 * @command ZCARD
 * @complexity O(1)
 * @speed fast
 * @since 1.2.0
 */
declare const length$1: (client: RedisClient, key: string) => Command<number, string>;
/**
 * Delete a sorted set key.
 *
 * @command DEL
 * @complexity O(N) where N is the number of keys that will be removed
 * @speed slow
 * @since 1.0.0
 */
declare const clear$1: (client: RedisClient, key: string) => Command<boolean, number>;
/**
 * Get all values from a sorted set.
 *
 * @command ZRANGE
 * @complexity O(log(N)+M) where N is the number of elements in the sorted set and M the number of elements returned
 * @speed slow
 * @since 2.1.0
 */
declare function all$1(client: RedisClient, key: string): Command<string[], string[]>;
declare function all$1(client: RedisClient, key: string, options: {
    withScores?: false;
}): Command<string[], string[]>;
declare function all$1(client: RedisClient, key: string, options: {
    withScores: true;
}): Command<SortedSetOutput[], (number | string)[]>;
type RangeBaseOptions = {
    reverse?: boolean;
};
type RankRangeOptions = RangeBaseOptions & {
    withScores?: boolean;
};
type ScoreRangeOptions = RangeBaseOptions & {
    limit?: number;
    offset?: number;
    withScores?: boolean;
};
type LexRangeOptions = RangeBaseOptions & {
    limit?: number;
    offset?: number;
};
/**
 * Read members by their rank positions in a sorted set.
 *
 * @command ZRANGE
 * @complexity O(log(N)+M) with N being the number of elements in the sorted set and M the number of elements returned
 * @speed slow
 * @since 1.2.0
 */
declare function rangeByRank(client: RedisClient, key: string, start: number, end: number, options?: RankRangeOptions & {
    withScores?: false;
}): Command<string[], string[]>;
declare function rangeByRank(client: RedisClient, key: string, start: number, end: number, options: RankRangeOptions & {
    withScores: true;
}): Command<SortedSetOutput[], (number | string)[]>;
/**
 * Read members whose scores fall between two bounds.
 *
 * @command ZRANGE
 * @complexity O(log(N)+M) with N being the number of elements in the sorted set and M the number of elements returned
 * @speed slow
 * @since 1.2.0
 */
declare function rangeByScore(client: RedisClient, key: string, start: Numeric, end: Numeric, options?: ScoreRangeOptions & {
    withScores?: false;
}): Command<string[], string[]>;
declare function rangeByScore(client: RedisClient, key: string, start: Numeric, end: Numeric, options: ScoreRangeOptions & {
    withScores: true;
}): Command<SortedSetOutput[], (number | string)[]>;
/**
 * Read members whose values fall between two lexicographical bounds.
 *
 * @command ZRANGE
 * @complexity O(log(N)+M) with N being the number of elements in the sorted set and M the number of elements returned
 * @speed slow
 * @since 1.2.0
 */
declare const rangeByLex: (client: RedisClient, key: string, start: string, end: string, options?: LexRangeOptions) => Command<string[], string[]>;
/**
 * Iterate through sorted set values and scores.
 *
 * @command ZSCAN
 * @complexity O(1) for every call. O(N) for a complete iteration, including enough command calls for the cursor to return to 0
 * @speed slow
 * @since 2.8.0
 */
declare const scan$1: (client: RedisClient, key: string, options?: ScanOptions) => {
    [Symbol.asyncIterator](): {
        next(): Promise<{
            done: true;
        } | {
            done: false;
            value: SortedSetOutput[];
        }>;
    };
    preloadScript?: string;
    name: string;
    args: (InputValue | undefined)[];
    resolve: (response: [string, (string | number)[]]) => {
        cursor: string | undefined;
        items: SortedSetOutput[];
    };
    then<Result1 = {
        cursor: string | undefined;
        items: SortedSetOutput[];
    }, Result2 = never>(onfulfilled: (value: {
        cursor: string | undefined;
        items: SortedSetOutput[];
    }) => Result1, onrejected?: ((reason: any) => Result2) | undefined): Promise<Result1 | Result2>;
};

declare const sortedSet_add: typeof add;
declare const sortedSet_incr: typeof incr;
declare const sortedSet_random: typeof random;
declare const sortedSet_rangeByLex: typeof rangeByLex;
declare const sortedSet_rangeByRank: typeof rangeByRank;
declare const sortedSet_rangeByScore: typeof rangeByScore;
declare const sortedSet_score: typeof score;
declare namespace sortedSet {
  export { sortedSet_add as add, all$1 as all, clear$1 as clear, del$1 as delete, has$1 as has, sortedSet_incr as incr, indexOf$1 as indexOf, length$1 as length, pop$1 as pop, sortedSet_random as random, sortedSet_rangeByLex as rangeByLex, sortedSet_rangeByRank as rangeByRank, sortedSet_rangeByScore as rangeByScore, scan$1 as scan, sortedSet_score as score };
}

/**
 * Get the value at a list index.
 *
 * @command LINDEX
 * @complexity O(N) where N is the distance from the closest end of the list
 * @speed slow
 * @since 1.0.0
 */
declare const at: (client: RedisClient, key: string, index: number) => Command<string | undefined, string | null>;
/**
 * Check whether a list contains a value.
 *
 * @command LPOS
 * @complexity O(N) where N is the number of elements in the list
 * @speed slow
 * @since 6.0.6
 */
declare const has: (client: RedisClient, key: string, value: InputValue) => Command<boolean, number | null>;
/**
 * Find the index of a value in a list.
 *
 * @command LPOS
 * @complexity O(N) where N is the number of elements in the list
 * @speed slow
 * @since 6.0.6
 */
declare const indexOf: (client: RedisClient, key: string, value: InputValue) => Command<number | undefined, string | null>;
/**
 * Replace the value at a list index.
 *
 * @command LSET
 * @complexity O(N) where N is the length of the list
 * @speed slow
 * @since 1.0.0
 */
declare const replace: (client: RedisClient, key: string, index: number, value: InputValue) => Command<void, string>;
/**
 * Insert a value before a pivot value in a list.
 *
 * @command LINSERT
 * @complexity O(N) where N is the number of elements to traverse before seeing the pivot value
 * @speed slow
 * @since 2.2.0
 */
declare const insertBefore: (client: RedisClient, key: string, pivot: InputValue, value: InputValue) => Command<number, string>;
/**
 * Insert a value after a pivot value in a list.
 *
 * @command LINSERT
 * @complexity O(N) where N is the number of elements to traverse before seeing the pivot value
 * @speed slow
 * @since 2.2.0
 */
declare const insertAfter: (client: RedisClient, key: string, pivot: InputValue, value: InputValue) => Command<number, string>;
/**
 * Append one or more values to the end of a list.
 *
 * @command RPUSH
 * @complexity O(1) for each element added
 * @speed fast
 * @since 1.0.0
 */
declare const append: (client: RedisClient, key: string, ...elements: InputValue[]) => Command<number, string>;
/**
 * Prepend one or more values to the start of a list.
 *
 * @command LPUSH
 * @complexity O(1) for each element added
 * @speed fast
 * @since 1.0.0
 */
declare const prepend: (client: RedisClient, key: string, ...elements: InputValue[]) => Command<number, string>;
/**
 * Remove and return the last item from a list.
 *
 * @command RPOP
 * @complexity O(1)
 * @speed fast
 * @since 1.0.0
 */
declare const pop: (client: RedisClient, key: string) => Command<string | undefined, string | null>;
/**
 * Remove and return the first item from a list.
 *
 * @command LPOP
 * @complexity O(1)
 * @speed fast
 * @since 1.0.0
 */
declare const shift: (client: RedisClient, key: string) => Command<string | undefined, string | null>;
/**
 * Remove matching values from a list.
 *
 * @command LREM
 * @complexity O(N+M) where N is the length of the list and M is the number of removed elements
 * @speed slow
 * @since 1.0.0
 */
declare const del: (client: RedisClient, key: string, value: InputValue, options?: {
    count?: number;
}) => Command<number, string>;

/**
 * Trim a list to the specified start and end range.
 *
 * @command LTRIM
 * @complexity O(N) where N is the number of elements to be removed
 * @speed slow
 * @since 1.0.0
 */
declare const trim: (client: RedisClient, key: string, start: number, end: number) => Command<boolean, number>;
/**
 * Get the number of items in a list.
 *
 * @command LLEN
 * @complexity O(1)
 * @speed fast
 * @since 1.0.0
 */
declare const length: (client: RedisClient, key: string) => Command<number, string>;
/**
 * Delete a list key.
 *
 * @command DEL
 * @complexity O(N) where N is the number of keys that will be removed
 * @speed slow
 * @since 1.0.0
 */
declare const clear: (client: RedisClient, key: string) => Command<boolean, number>;
/**
 * Get a range of values from a list.
 *
 * @command LRANGE
 * @complexity O(S+N) where S is the distance of start offset and N is the number of elements in the specified range
 * @speed slow
 * @since 1.0.0
 */
declare const range: (client: RedisClient, key: string, start: number, end: number) => Command<string[], string[]>;
/**
 * Get all values from a list.
 *
 * @command LRANGE
 * @complexity O(N) where N is the number of elements in the list
 * @speed slow
 * @since 2.1.0
 */
declare const all: (client: RedisClient, key: string) => Command<string[], string[]>;
/**
 * Iterate through a list in fixed-size ranges.
 *
 * @command LRANGE
 * @complexity O(S+N) where S is the distance of start offset and N is the number of elements in the specified range
 * @speed slow
 * @since 1.0.0
 */
declare const scan: (client: RedisClient, key: string, options?: {
    cursor?: number;
    limit?: number;
}) => {
    [Symbol.asyncIterator](): {
        next(): Promise<{
            done: true;
        } | {
            done: false;
            value: string[];
        }>;
    };
    preloadScript?: string;
    name: string;
    args: (InputValue | undefined)[];
    resolve: (response: string[]) => {
        cursor: number | undefined;
        items: string[];
    };
    then<Result1 = {
        cursor: number | undefined;
        items: string[];
    }, Result2 = never>(onfulfilled: (value: {
        cursor: number | undefined;
        items: string[];
    }) => Result1, onrejected?: ((reason: any) => Result2) | undefined): Promise<Result1 | Result2>;
};

declare const array_all: typeof all;
declare const array_append: typeof append;
declare const array_at: typeof at;
declare const array_clear: typeof clear;
declare const array_has: typeof has;
declare const array_indexOf: typeof indexOf;
declare const array_insertAfter: typeof insertAfter;
declare const array_insertBefore: typeof insertBefore;
declare const array_length: typeof length;
declare const array_pop: typeof pop;
declare const array_prepend: typeof prepend;
declare const array_range: typeof range;
declare const array_replace: typeof replace;
declare const array_scan: typeof scan;
declare const array_shift: typeof shift;
declare const array_trim: typeof trim;
declare namespace array {
  export { array_all as all, array_append as append, array_at as at, array_clear as clear, del as delete, array_has as has, array_indexOf as indexOf, array_insertAfter as insertAfter, array_insertBefore as insertBefore, array_length as length, array_pop as pop, array_prepend as prepend, array_range as range, array_replace as replace, array_scan as scan, array_shift as shift, array_trim as trim };
}

/**
 * Execute a Lua script directly.
 *
 * @command EVAL
 * @complexity Depends on the executed script
 * @speed slow
 * @since 2.6.0
 */
declare const evaluate: (client: RedisClient, script: string, keys: string[], args: InputValue[]) => Command<unknown, unknown>;

/**
 * Execute a Lua script by SHA hash.
 *
 * @command EVALSHA
 * @complexity Depends on the executed script
 * @speed slow
 * @since 2.6.0
 */
declare const evalSha: (client: RedisClient, hash: string, keys: string[], args: InputValue[]) => Command<unknown, unknown>;
/**
 * Load a Lua script into the script cache.
 *
 * @command SCRIPT LOAD
 * @complexity O(N) where N is the length in bytes of the script body
 * @speed slow
 * @since 2.6.0
 */
declare const load: (client: RedisClient, script: string) => Command<string, string>;
/**
 * Check whether one or more scripts exist in the script cache.
 *
 * @command SCRIPT EXISTS
 * @complexity O(N) where N is the number of SHA1 digests to check
 * @speed slow
 * @since 2.6.0
 */
declare const exists: (client: RedisClient, ...hashes: [string, ...string[]]) => Command<boolean[], (string | number)[]>;
/**
 * Flush the script cache.
 *
 * @command SCRIPT FLUSH
 * @complexity O(N) where N is the number of cached scripts
 * @speed slow
 * @since 2.6.0
 */
declare const flush$1: (client: RedisClient, mode?: "sync" | "async") => Command<void, string>;
/**
 * Define a reusable typed Lua script runner.
 *
 * @command EVALSHA | EVAL
 * @complexity Depends on the executed script
 * @speed slow
 * @since 2.6.0
 */
declare const define: <I extends InputValue[], O extends string | string[]>({ script, keys, }: {
    script: string;
    keys?: number;
}) => (client: RedisClient, ...args: I) => Command<O, unknown>;
/**
 * Define a reusable Lua script with template literal arguments.
 *
 * @command EVALSHA | EVAL
 * @complexity Depends on the executed script
 * @speed slow
 * @since 2.6.0
 */
declare const lua: (strings: TemplateStringsArray, ...args: InputValue[]) => <T extends string | string[]>(client: RedisClient) => Command<T, unknown>;

declare const script_define: typeof define;
declare const script_evalSha: typeof evalSha;
declare const script_exists: typeof exists;
declare const script_load: typeof load;
declare const script_lua: typeof lua;
declare namespace script {
  export { script_define as define, evaluate as eval, script_evalSha as evalSha, script_exists as exists, flush$1 as flush, script_load as load, script_lua as lua };
}

/**
 * Remove all keys from the current database.
 *
 * @command FLUSHDB
 * @complexity O(N) where N is the number of keys in the selected database
 * @speed slow
 * @dangerous
 * @since 1.0.0
 */
declare const flush: (client: RedisClient, mode?: "sync" | "async") => Command<void, "OK">;
/**
 * Get the number of keys in the current database.
 *
 * @command DBSIZE
 * @complexity O(1)
 * @speed fast
 * @since 1.0.0
 */
declare const size: (client: RedisClient) => Command<number, string>;

declare const db_flush: typeof flush;
declare const db_size: typeof size;
declare namespace db {
  export { db_flush as flush, db_size as size };
}

/**
 * Remove all keys from all databases.
 *
 * @command FLUSHALL
 * @complexity O(N) where N is the total number of keys in all databases
 * @speed slow
 * @dangerous
 * @since 1.0.0
 */
declare const flushAll: (client: RedisClient, mode?: "sync" | "async") => Command<void, "OK">;
/**
 * Get the Redis server time as a Date.
 *
 * @command TIME
 * @complexity O(1)
 * @speed fast
 * @since 2.6.0
 */
declare const time: (client: RedisClient) => Command<Date, [string, string]>;
/**
 * Swap the contents of two databases.
 *
 * @command SWAPDB
 * @complexity O(N) where N is the count of clients watching or blocking on keys from both databases
 * @speed fast
 * @dangerous
 * @since 4.0.0
 */
declare const swap: (client: RedisClient, db1: number, db2: number) => Command<void, "OK">;

declare const server_flushAll: typeof flushAll;
declare const server_swap: typeof swap;
declare const server_time: typeof time;
declare namespace server {
  export { server_flushAll as flushAll, server_swap as swap, server_time as time };
}

type BatchResponse<T extends Command<any, any>[]> = {
    [K in keyof T]: ReturnType<T[K]['resolve']>;
};
/**
 * Execute multiple commands with a Redis pipeline.
 *
 * @complexity Depends on the commands in the batch
 * @speed depends on commands
 * @since n/a
 */
declare const batch: <const T extends Command<any, any>[]>(client: RedisClient, commands: T) => Promise<BatchResponse<T>>;

declare const index_array: typeof array;
declare const index_batch: typeof batch;
declare const index_db: typeof db;
declare const index_key: typeof key;
declare const index_map: typeof map;
declare const index_script: typeof script;
declare const index_server: typeof server;
declare const index_set: typeof set;
declare const index_sortedSet: typeof sortedSet;
declare const index_string: typeof string;
declare const index_ttl: typeof ttl;
declare namespace index {
  export { index_array as array, index_batch as batch, index_db as db, index_key as key, index_map as map, index_script as script, index_server as server, index_set as set, index_sortedSet as sortedSet, index_string as string, index_ttl as ttl };
}

type IoRedisOptions = RedisOptions & {
    cluster?: boolean;
};
declare const overrideOptions: (options: IoRedisOptions) => void;
declare const createIoRedisClient: (options: IoRedisOptions) => RedisClient;

type RedisClientOptions = IoRedisOptions;
declare const createRedisClient: (options: RedisClientOptions) => RedisClient;

declare const createLazyClient: (cb: () => RedisClient) => RedisClient;

export { type Command, type InputValue, type IoRedisOptions, type RedisClient, type RedisClientOptions, createIoRedisClient, createLazyClient, createRedisClient, mockRedis, overrideOptions, index as redis };
