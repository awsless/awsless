import { Handler } from '@awsless/lambda';
import { GenericSchema, InferInput } from '@awsless/validate';
declare const storeNotificationSchema: import("valibot").UnionSchema<[import("valibot").SchemaWithPipe<readonly [import("valibot").ObjectSchema<{
    readonly bucket: import("valibot").StringSchema<undefined>;
    readonly key: import("valibot").StringSchema<undefined>;
}, undefined>, import("valibot").TransformAction<{
    bucket: string;
    key: string;
}, {
    bucket: string;
    key: string;
}[]>]>, import("valibot").ArraySchema<import("valibot").ObjectSchema<{
    readonly bucket: import("valibot").StringSchema<undefined>;
    readonly key: import("valibot").StringSchema<undefined>;
}, undefined>, undefined>, import("valibot").SchemaWithPipe<readonly [import("valibot").ObjectSchema<{
    readonly Records: import("valibot").ArraySchema<import("valibot").ObjectSchema<{
        readonly s3: import("valibot").ObjectSchema<{
            readonly bucket: import("valibot").ObjectSchema<{
                readonly name: import("valibot").StringSchema<undefined>;
            }, undefined>;
            readonly object: import("valibot").ObjectSchema<{
                readonly key: import("valibot").StringSchema<undefined>;
            }, undefined>;
        }, undefined>;
    }, undefined>, undefined>;
}, undefined>, import("valibot").TransformAction<{
    Records: {
        s3: {
            bucket: {
                name: string;
            };
            object: {
                key: string;
            };
        };
    }[];
}, {
    bucket: string;
    key: string;
}[]>]>], "Invalid store notification input">;
/** The affected objects a store event handler receives. */
export type StoreEvent = {
    /** The name of the bucket holding the affected object. */
    bucket: string;
    /** The key of the affected object. */
    key: string;
}[];
type StoreSchema = GenericSchema<InferInput<typeof storeNotificationSchema>, StoreEvent>;
export declare const event: <H extends Handler<StoreSchema>>(handle: H) => (event: {
    bucket: string;
    key: string;
} | {
    bucket: string;
    key: string;
}[] | {
    Records: {
        s3: {
            bucket: {
                name: string;
            };
            object: {
                key: string;
            };
        };
    }[];
}, context?: import("aws-lambda").Context) => Promise<Awaited<ReturnType<H>>>;
export {};
