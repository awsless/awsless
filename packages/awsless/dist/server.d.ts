import * as s from "@awsless/open-search";
import * as t from "@awsless/dynamodb";
import { AnyTable } from "@awsless/dynamodb";
import * as v from "@awsless/validate";
import { BaseSchema, DynamoDBStreamSchema, GenericIssue, GenericSchema, InferInput, InferOutput, ObjectEntries, ObjectSchema, SnsTopicSchema, SqsQueueSchema } from "@awsless/validate";
import { Handler, InvokeOptions, LambdaContext, LambdaFunction } from "@awsless/lambda";
import { PublishOptions } from "@awsless/sns";
import { UUID } from "node:crypto";
import { Duration } from "@awsless/duration";
import { Mock } from "vitest";
//#region ../../node_modules/.pnpm/valibot@1.4.2_typescript@7.0.2/node_modules/valibot/dist/index.d.mts
//#endregion
//#region src/methods/fallback/fallback.d.ts
/**
 * Fallback type.
 */
type Fallback<TSchema extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>>> = MaybeDeepReadonly<InferOutput$1<TSchema>> | ((dataset?: OutputDataset<InferOutput$1<TSchema>, InferIssue<TSchema>>, config?: Config$1<InferIssue<TSchema>>) => MaybeDeepReadonly<InferOutput$1<TSchema>>);
/**
 * Schema with fallback type.
 */
type SchemaWithFallback<TSchema extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>>, TFallback$1 extends Fallback<TSchema>> = TSchema & {
  /**
   * The fallback value.
   */
  readonly fallback: TFallback$1;
};
//#endregion
//#region src/methods/fallback/fallbackAsync.d.ts
/**
 * Fallback async type.
 */
type FallbackAsync<TSchema extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>> = MaybeDeepReadonly<InferOutput$1<TSchema>> | ((dataset?: OutputDataset<InferOutput$1<TSchema>, InferIssue<TSchema>>, config?: Config$1<InferIssue<TSchema>>) => MaybePromise<MaybeDeepReadonly<InferOutput$1<TSchema>>>);
/**
 * Schema with fallback async type.
 */
type SchemaWithFallbackAsync<TSchema extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>, TFallback$1 extends FallbackAsync<TSchema>> = Omit<TSchema, "async" | "~standard" | "~run"> & {
  /**
   * The fallback value.
   */
  readonly fallback: TFallback$1;
  /**
   * Whether it's async.
   */
  readonly async: true;
  /**
   * The Standard Schema properties.
   *
   * @internal
   */
  readonly "~standard": StandardProps<InferInput$1<TSchema>, InferOutput$1<TSchema>>;
  /**
   * Parses unknown input values.
   *
   * @param dataset The input dataset.
   * @param config The configuration.
   *
   * @returns The output dataset.
   *
   * @internal
   */
  readonly "~run": (dataset: UnknownDataset, config: Config$1<BaseIssue<unknown>>) => Promise<OutputDataset<InferOutput$1<TSchema>, InferIssue<TSchema>>>;
};
//#endregion
//#region src/methods/pipe/pipe.d.ts
/**
 * Schema with pipe type.
 */
type SchemaWithPipe<TPipe$1 extends readonly [BaseSchema$1<unknown, unknown, BaseIssue<unknown>>, ...PipeItem<any, unknown, BaseIssue<unknown>>[]]> = Omit<FirstTupleItem<TPipe$1>, "pipe" | "~standard" | "~run" | "~types"> & {
  /**
   * The pipe items.
   */
  readonly pipe: TPipe$1;
  /**
   * The Standard Schema properties.
   *
   * @internal
   */
  readonly "~standard": StandardProps<InferInput$1<FirstTupleItem<TPipe$1>>, InferOutput$1<LastTupleItem<TPipe$1>>>;
  /**
   * Parses unknown input values.
   *
   * @param dataset The input dataset.
   * @param config The configuration.
   *
   * @returns The output dataset.
   *
   * @internal
   */
  readonly "~run": (dataset: UnknownDataset, config: Config$1<BaseIssue<unknown>>) => OutputDataset<InferOutput$1<LastTupleItem<TPipe$1>>, InferIssue<TPipe$1[number]>>;
  /**
   * The input, output and issue type.
   *
   * @internal
   */
  readonly "~types"?: {
    readonly input: InferInput$1<FirstTupleItem<TPipe$1>>;
    readonly output: InferOutput$1<LastTupleItem<TPipe$1>>;
    readonly issue: InferIssue<TPipe$1[number]>;
  } | undefined;
};
//#endregion
//#region src/types/metadata.d.ts
/**
 * Base metadata interface.
 */
interface BaseMetadata<TInput$1> {
  /**
   * The object kind.
   */
  readonly kind: "metadata";
  /**
   * The metadata type.
   */
  readonly type: string;
  /**
   * The metadata reference.
   */
  readonly reference: (...args: any[]) => BaseMetadata<any>;
  /**
   * The input, output and issue type.
   *
   * @internal
   */
  readonly "~types"?: {
    readonly input: TInput$1;
    readonly output: TInput$1;
    readonly issue: never;
  } | undefined;
}
//#endregion
//#region src/types/dataset.d.ts
/**
 * Unknown dataset interface.
 */
interface UnknownDataset {
  /**
   * Whether is's typed.
   */
  typed?: false;
  /**
   * The dataset value.
   */
  value: unknown;
  /**
   * The dataset issues.
   */
  issues?: undefined;
}
/**
 * Success dataset interface.
 */
interface SuccessDataset<TValue$1> {
  /**
   * Whether is's typed.
   */
  typed: true;
  /**
   * The dataset value.
   */
  value: TValue$1;
  /**
   * The dataset issues.
   */
  issues?: undefined;
}
/**
 * Partial dataset interface.
 */
interface PartialDataset<TValue$1, TIssue extends BaseIssue<unknown>> {
  /**
   * Whether is's typed.
   */
  typed: true;
  /**
   * The dataset value.
   */
  value: TValue$1;
  /**
   * The dataset issues.
   */
  issues: [TIssue, ...TIssue[]];
}
/**
 * Failure dataset interface.
 */
interface FailureDataset<TIssue extends BaseIssue<unknown>> {
  /**
   * Whether is's typed.
   */
  typed: false;
  /**
   * The dataset value.
   */
  value: unknown;
  /**
   * The dataset issues.
   */
  issues: [TIssue, ...TIssue[]];
}
/**
 * Output dataset type.
 */
type OutputDataset<TValue$1, TIssue extends BaseIssue<unknown>> = SuccessDataset<TValue$1> | PartialDataset<TValue$1, TIssue> | FailureDataset<TIssue>;
//#endregion
//#region src/types/standard.d.ts
/**
 * The Standard Schema properties interface.
 */
interface StandardProps<TInput$1, TOutput$1> {
  /**
   * The version number of the standard.
   */
  readonly version: 1;
  /**
   * The vendor name of the schema library.
   */
  readonly vendor: "valibot";
  /**
   * Validates unknown input values.
   */
  readonly validate: (value: unknown) => StandardResult<TOutput$1> | Promise<StandardResult<TOutput$1>>;
  /**
   * Inferred types associated with the schema.
   */
  readonly types?: StandardTypes<TInput$1, TOutput$1> | undefined;
}
/**
 * The result interface of the validate function.
 */
type StandardResult<TOutput$1> = StandardSuccessResult<TOutput$1> | StandardFailureResult;
/**
 * The result interface if validation succeeds.
 */
interface StandardSuccessResult<TOutput$1> {
  /**
   * The typed output value.
   */
  readonly value: TOutput$1;
  /**
   * The non-existent issues.
   */
  readonly issues?: undefined;
}
/**
 * The result interface if validation fails.
 */
interface StandardFailureResult {
  /**
   * The issues of failed validation.
   */
  readonly issues: readonly StandardIssue[];
}
/**
 * The issue interface of the failure output.
 */
interface StandardIssue {
  /**
   * The error message of the issue.
   */
  readonly message: string;
  /**
   * The path of the issue, if any.
   */
  readonly path?: readonly (PropertyKey | StandardPathItem)[] | undefined;
}
/**
 * The path item interface of the issue.
 */
interface StandardPathItem {
  /**
   * The key of the path item.
   */
  readonly key: PropertyKey;
}
/**
 * The Standard Schema types interface.
 */
interface StandardTypes<TInput$1, TOutput$1> {
  /**
   * The input type of the schema.
   */
  readonly input: TInput$1;
  /**
   * The output type of the schema.
   */
  readonly output: TOutput$1;
}
//#endregion
//#region src/types/schema.d.ts
/**
 * Base schema interface.
 */
interface BaseSchema$1<TInput$1, TOutput$1, TIssue extends BaseIssue<unknown>> {
  /**
   * The object kind.
   */
  readonly kind: "schema";
  /**
   * The schema type.
   */
  readonly type: string;
  /**
   * The schema reference.
   */
  readonly reference: (...args: any[]) => BaseSchema$1<unknown, unknown, BaseIssue<unknown>>;
  /**
   * The expected property.
   */
  readonly expects: string;
  /**
   * Whether it's async.
   */
  readonly async: false;
  /**
   * The Standard Schema properties.
   *
   * @internal
   */
  readonly "~standard": StandardProps<TInput$1, TOutput$1>;
  /**
   * Parses unknown input values.
   *
   * @param dataset The input dataset.
   * @param config The configuration.
   *
   * @returns The output dataset.
   *
   * @internal
   */
  readonly "~run": (dataset: UnknownDataset, config: Config$1<BaseIssue<unknown>>) => OutputDataset<TOutput$1, TIssue>;
  /**
   * The input, output and issue type.
   *
   * @internal
   */
  readonly "~types"?: {
    readonly input: TInput$1;
    readonly output: TOutput$1;
    readonly issue: TIssue;
  } | undefined;
}
/**
 * Base schema async interface.
 */
interface BaseSchemaAsync<TInput$1, TOutput$1, TIssue extends BaseIssue<unknown>> extends Omit<BaseSchema$1<TInput$1, TOutput$1, TIssue>, "reference" | "async" | "~run"> {
  /**
   * The schema reference.
   */
  readonly reference: (...args: any[]) => BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>;
  /**
   * Whether it's async.
   */
  readonly async: true;
  /**
   * Parses unknown input values.
   *
   * @param dataset The input dataset.
   * @param config The configuration.
   *
   * @returns The output dataset.
   *
   * @internal
   */
  readonly "~run": (dataset: UnknownDataset, config: Config$1<BaseIssue<unknown>>) => Promise<OutputDataset<TOutput$1, TIssue>>;
}
//#endregion
//#region src/types/transformation.d.ts
/**
 * Base transformation interface.
 */
interface BaseTransformation<TInput$1, TOutput$1, TIssue extends BaseIssue<unknown>> {
  /**
   * The object kind.
   */
  readonly kind: "transformation";
  /**
   * The transformation type.
   */
  readonly type: string;
  /**
   * The transformation reference.
   */
  readonly reference: (...args: any[]) => BaseTransformation<any, any, BaseIssue<unknown>>;
  /**
   * Whether it's async.
   */
  readonly async: false;
  /**
   * Transforms known input values.
   *
   * @param dataset The input dataset.
   * @param config The configuration.
   *
   * @returns The output dataset.
   *
   * @internal
   */
  readonly "~run": (dataset: SuccessDataset<TInput$1>, config: Config$1<BaseIssue<unknown>>) => OutputDataset<TOutput$1, BaseIssue<unknown> | TIssue>;
  /**
   * The input, output and issue type.
   *
   * @internal
   */
  readonly "~types"?: {
    readonly input: TInput$1;
    readonly output: TOutput$1;
    readonly issue: TIssue;
  } | undefined;
}
/**
 * Base transformation async interface.
 */
interface BaseTransformationAsync<TInput$1, TOutput$1, TIssue extends BaseIssue<unknown>> extends Omit<BaseTransformation<TInput$1, TOutput$1, TIssue>, "reference" | "async" | "~run"> {
  /**
   * The transformation reference.
   */
  readonly reference: (...args: any[]) => BaseTransformation<any, any, BaseIssue<unknown>> | BaseTransformationAsync<any, any, BaseIssue<unknown>>;
  /**
   * Whether it's async.
   */
  readonly async: true;
  /**
   * Transforms known input values.
   *
   * @param dataset The input dataset.
   * @param config The configuration.
   *
   * @returns The output dataset.
   *
   * @internal
   */
  readonly "~run": (dataset: SuccessDataset<TInput$1>, config: Config$1<BaseIssue<unknown>>) => Promise<OutputDataset<TOutput$1, BaseIssue<unknown> | TIssue>>;
}
//#endregion
//#region src/types/validation.d.ts
/**
 * Base validation interface.
 */
interface BaseValidation<TInput$1, TOutput$1, TIssue extends BaseIssue<unknown>> {
  /**
   * The object kind.
   */
  readonly kind: "validation";
  /**
   * The validation type.
   */
  readonly type: string;
  /**
   * The validation reference.
   */
  readonly reference: (...args: any[]) => BaseValidation<any, any, BaseIssue<unknown>>;
  /**
   * The expected property.
   */
  readonly expects: string | null;
  /**
   * Whether it's async.
   */
  readonly async: false;
  /**
   * Validates known input values.
   *
   * @param dataset The input dataset.
   * @param config The configuration.
   *
   * @returns The output dataset.
   *
   * @internal
   */
  readonly "~run": (dataset: OutputDataset<TInput$1, BaseIssue<unknown>>, config: Config$1<BaseIssue<unknown>>) => OutputDataset<TOutput$1, BaseIssue<unknown> | TIssue>;
  /**
   * The input, output and issue type.
   *
   * @internal
   */
  readonly "~types"?: {
    readonly input: TInput$1;
    readonly output: TOutput$1;
    readonly issue: TIssue;
  } | undefined;
}
/**
 * Base validation async interface.
 */
interface BaseValidationAsync<TInput$1, TOutput$1, TIssue extends BaseIssue<unknown>> extends Omit<BaseValidation<TInput$1, TOutput$1, TIssue>, "reference" | "async" | "~run"> {
  /**
   * The validation reference.
   */
  readonly reference: (...args: any[]) => BaseValidation<any, any, BaseIssue<unknown>> | BaseValidationAsync<any, any, BaseIssue<unknown>>;
  /**
   * Whether it's async.
   */
  readonly async: true;
  /**
   * Validates known input values.
   *
   * @param dataset The input dataset.
   * @param config The configuration.
   *
   * @returns The output dataset.
   *
   * @internal
   */
  readonly "~run": (dataset: OutputDataset<TInput$1, BaseIssue<unknown>>, config: Config$1<BaseIssue<unknown>>) => Promise<OutputDataset<TOutput$1, BaseIssue<unknown> | TIssue>>;
}
//#endregion
//#region src/types/infer.d.ts
/**
 * Infer input type.
 */
type InferInput$1<TItem$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>> | BaseValidation<any, unknown, BaseIssue<unknown>> | BaseValidationAsync<any, unknown, BaseIssue<unknown>> | BaseTransformation<any, unknown, BaseIssue<unknown>> | BaseTransformationAsync<any, unknown, BaseIssue<unknown>> | BaseMetadata<any>> = NonNullable<TItem$1["~types"]>["input"];
/**
 * Infer output type.
 */
type InferOutput$1<TItem$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>> | BaseValidation<any, unknown, BaseIssue<unknown>> | BaseValidationAsync<any, unknown, BaseIssue<unknown>> | BaseTransformation<any, unknown, BaseIssue<unknown>> | BaseTransformationAsync<any, unknown, BaseIssue<unknown>> | BaseMetadata<any>> = NonNullable<TItem$1["~types"]>["output"];
/**
 * Infer issue type.
 */
type InferIssue<TItem$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>> | BaseValidation<any, unknown, BaseIssue<unknown>> | BaseValidationAsync<any, unknown, BaseIssue<unknown>> | BaseTransformation<any, unknown, BaseIssue<unknown>> | BaseTransformationAsync<any, unknown, BaseIssue<unknown>> | BaseMetadata<any>> = NonNullable<TItem$1["~types"]>["issue"];
/**
 * Constructs a type that is maybe readonly.
 */
type MaybeReadonly<TValue$1> = TValue$1 | Readonly<TValue$1>;
/**
 * Constructs a type that is deeply readonly.
 */
type DeepReadonly<TValue$1> = TValue$1 extends Record<string, unknown> | readonly unknown[] ? { readonly [TKey in keyof TValue$1]: DeepReadonly<TValue$1[TKey]>; } : TValue$1;
/**
 * Constructs a type that is maybe deeply readonly.
 */
type MaybeDeepReadonly<TValue$1> = TValue$1 | DeepReadonly<TValue$1>;
/**
 * Constructs a type that is maybe a promise.
 */
type MaybePromise<TValue$1> = TValue$1 | Promise<TValue$1>;
/**
 * Prettifies a type for better readability.
 *
 * Hint: This type has no effect and is only used so that TypeScript displays
 * the final type in the preview instead of the utility types used.
 */
type Prettify<TObject> = { [TKey in keyof TObject]: TObject[TKey]; } & {};
/**
 * Marks specific keys as optional.
 */
type MarkOptional<TObject, TKeys extends keyof TObject> = { [TKey in keyof TObject]?: unknown; } & Omit<TObject, TKeys> & Partial<Pick<TObject, TKeys>>;
/**
 * Extracts first tuple item.
 */
type FirstTupleItem<TTuple extends readonly [unknown, ...unknown[]]> = TTuple[0];
/**
 * Extracts last tuple item.
 */
type LastTupleItem<TTuple extends readonly [unknown, ...unknown[]]> = TTuple[TTuple extends readonly [unknown, ...infer TRest] ? TRest["length"] : never];
//#endregion
//#region src/types/other.d.ts
/**
 * Error message type.
 */
type ErrorMessage<TIssue extends BaseIssue<unknown>> = ((issue: TIssue) => string) | string;
/**
 * Default type.
 */
type Default<TWrapped$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>>, TInput$1 extends null | undefined> = MaybeDeepReadonly<InferInput$1<TWrapped$1> | TInput$1> | ((dataset?: UnknownDataset, config?: Config$1<InferIssue<TWrapped$1>>) => MaybeDeepReadonly<InferInput$1<TWrapped$1> | TInput$1>) | undefined;
/**
 * Default async type.
 */
type DefaultAsync<TWrapped$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>, TInput$1 extends null | undefined> = MaybeDeepReadonly<InferInput$1<TWrapped$1> | TInput$1> | ((dataset?: UnknownDataset, config?: Config$1<InferIssue<TWrapped$1>>) => MaybePromise<MaybeDeepReadonly<InferInput$1<TWrapped$1> | TInput$1>>) | undefined;
/**
 * Default value type.
 */
type DefaultValue<TDefault extends Default<BaseSchema$1<unknown, unknown, BaseIssue<unknown>>, null | undefined> | DefaultAsync<BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>, null | undefined>> = TDefault extends DefaultAsync<infer TWrapped extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>, infer TInput> ? TDefault extends ((dataset?: UnknownDataset, config?: Config$1<InferIssue<TWrapped>>) => MaybePromise<MaybeDeepReadonly<InferInput$1<TWrapped> | TInput>>) ? Awaited<ReturnType<TDefault>> : TDefault : never;
//#endregion
//#region src/types/object.d.ts
/**
 * Optional entry schema type.
 */
type OptionalEntrySchema = ExactOptionalSchema<BaseSchema$1<unknown, unknown, BaseIssue<unknown>>, unknown> | NullishSchema<BaseSchema$1<unknown, unknown, BaseIssue<unknown>>, unknown> | OptionalSchema<BaseSchema$1<unknown, unknown, BaseIssue<unknown>>, unknown>;
/**
 * Optional entry schema async type.
 */
type OptionalEntrySchemaAsync = ExactOptionalSchemaAsync<BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>, unknown> | NullishSchemaAsync<BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>, unknown> | OptionalSchemaAsync<BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>, unknown>;
/**
 * Object entries interface.
 */
interface ObjectEntries$1 {
  [key: string]: BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | SchemaWithFallback<BaseSchema$1<unknown, unknown, BaseIssue<unknown>>, unknown> | OptionalEntrySchema;
}
/**
 * Object entries async interface.
 */
interface ObjectEntriesAsync {
  [key: string]: BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>> | SchemaWithFallback<BaseSchema$1<unknown, unknown, BaseIssue<unknown>>, unknown> | SchemaWithFallbackAsync<BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>, unknown> | OptionalEntrySchema | OptionalEntrySchemaAsync;
}
/**
 * Infer entries input type.
 */
type InferEntriesInput<TEntries$1 extends ObjectEntries$1 | ObjectEntriesAsync> = { -readonly [TKey in keyof TEntries$1]: InferInput$1<TEntries$1[TKey]>; };
/**
 * Infer entries output type.
 */
type InferEntriesOutput<TEntries$1 extends ObjectEntries$1 | ObjectEntriesAsync> = { -readonly [TKey in keyof TEntries$1]: InferOutput$1<TEntries$1[TKey]>; };
/**
 * Optional input keys type.
 */
type OptionalInputKeys<TEntries$1 extends ObjectEntries$1 | ObjectEntriesAsync> = { [TKey in keyof TEntries$1]: TEntries$1[TKey] extends OptionalEntrySchema | OptionalEntrySchemaAsync ? TKey : never; }[keyof TEntries$1];
/**
 * Optional output keys type.
 */
type OptionalOutputKeys<TEntries$1 extends ObjectEntries$1 | ObjectEntriesAsync> = { [TKey in keyof TEntries$1]: TEntries$1[TKey] extends OptionalEntrySchema | OptionalEntrySchemaAsync ? undefined extends TEntries$1[TKey]["default"] ? TKey : never : never; }[keyof TEntries$1];
/**
 * Input with question marks type.
 */
type InputWithQuestionMarks<TEntries$1 extends ObjectEntries$1 | ObjectEntriesAsync, TObject extends InferEntriesInput<TEntries$1>> = MarkOptional<TObject, OptionalInputKeys<TEntries$1>>;
/**
 * Output with question marks type.
 */
type OutputWithQuestionMarks<TEntries$1 extends ObjectEntries$1 | ObjectEntriesAsync, TObject extends InferEntriesOutput<TEntries$1>> = MarkOptional<TObject, OptionalOutputKeys<TEntries$1>>;
/**
 * Readonly output keys type.
 */
type ReadonlyOutputKeys<TEntries$1 extends ObjectEntries$1 | ObjectEntriesAsync> = { [TKey in keyof TEntries$1]: TEntries$1[TKey] extends {
  readonly pipe: readonly unknown[];
} ? ReadonlyAction<any> extends TEntries$1[TKey]["pipe"][number] ? TKey : never : never; }[keyof TEntries$1];
/**
 * Output with readonly type.
 */
type OutputWithReadonly<TEntries$1 extends ObjectEntries$1 | ObjectEntriesAsync, TObject extends OutputWithQuestionMarks<TEntries$1, InferEntriesOutput<TEntries$1>>> = ReadonlyOutputKeys<TEntries$1> extends never ? TObject : Readonly<TObject> & Pick<TObject, Exclude<keyof TObject, ReadonlyOutputKeys<TEntries$1>>>;
/**
 * Infer object input type.
 */
type InferObjectInput<TEntries$1 extends ObjectEntries$1 | ObjectEntriesAsync> = Prettify<InputWithQuestionMarks<TEntries$1, InferEntriesInput<TEntries$1>>>;
/**
 * Infer object output type.
 */
type InferObjectOutput<TEntries$1 extends ObjectEntries$1 | ObjectEntriesAsync> = Prettify<OutputWithReadonly<TEntries$1, OutputWithQuestionMarks<TEntries$1, InferEntriesOutput<TEntries$1>>>>;
/**
 * Infer object issue type.
 */
type InferObjectIssue<TEntries$1 extends ObjectEntries$1 | ObjectEntriesAsync> = InferIssue<TEntries$1[keyof TEntries$1]>;
//#endregion
//#region src/types/issue.d.ts
/**
 * Array path item interface.
 */
interface ArrayPathItem {
  /**
   * The path item type.
   */
  readonly type: "array";
  /**
   * The path item origin.
   */
  readonly origin: "value";
  /**
   * The path item input.
   */
  readonly input: MaybeReadonly<unknown[]>;
  /**
   * The path item key.
   */
  readonly key: number;
  /**
   * The path item value.
   */
  readonly value: unknown;
}
/**
 * Map path item interface.
 */
interface MapPathItem {
  /**
   * The path item type.
   */
  readonly type: "map";
  /**
   * The path item origin.
   */
  readonly origin: "key" | "value";
  /**
   * The path item input.
   */
  readonly input: Map<unknown, unknown>;
  /**
   * The path item key.
   */
  readonly key: unknown;
  /**
   * The path item value.
   */
  readonly value: unknown;
}
/**
 * Object path item interface.
 */
interface ObjectPathItem {
  /**
   * The path item type.
   */
  readonly type: "object";
  /**
   * The path item origin.
   */
  readonly origin: "key" | "value";
  /**
   * The path item input.
   */
  readonly input: Record<string, unknown>;
  /**
   * The path item key.
   */
  readonly key: string;
  /**
   * The path item value.
   */
  readonly value: unknown;
}
/**
 * Set path item interface.
 */
interface SetPathItem {
  /**
   * The path item type.
   */
  readonly type: "set";
  /**
   * The path item origin.
   */
  readonly origin: "value";
  /**
   * The path item input.
   */
  readonly input: Set<unknown>;
  /**
   * The path item key.
   */
  readonly key: null;
  /**
   * The path item key.
   */
  readonly value: unknown;
}
/**
 * Unknown path item interface.
 */
interface UnknownPathItem {
  /**
   * The path item type.
   */
  readonly type: "unknown";
  /**
   * The path item origin.
   */
  readonly origin: "key" | "value";
  /**
   * The path item input.
   */
  readonly input: unknown;
  /**
   * The path item key.
   */
  readonly key: unknown;
  /**
   * The path item value.
   */
  readonly value: unknown;
}
/**
 * Issue path item type.
 */
type IssuePathItem = ArrayPathItem | MapPathItem | ObjectPathItem | SetPathItem | UnknownPathItem;
/**
 * Base issue interface.
 */
interface BaseIssue<TInput$1> extends Config$1<BaseIssue<TInput$1>> {
  /**
   * The issue kind.
   */
  readonly kind: "schema" | "validation" | "transformation";
  /**
   * The issue type.
   */
  readonly type: string;
  /**
   * The raw input data.
   */
  readonly input: TInput$1;
  /**
   * The expected property.
   */
  readonly expected: string | null;
  /**
   * The received property.
   */
  readonly received: string;
  /**
   * The error message.
   */
  readonly message: string;
  /**
   * The input requirement.
   */
  readonly requirement?: unknown | undefined;
  /**
   * The issue path.
   */
  readonly path?: [IssuePathItem, ...IssuePathItem[]] | undefined;
  /**
   * The sub issues.
   */
  readonly issues?: [BaseIssue<TInput$1>, ...BaseIssue<TInput$1>[]] | undefined;
}
//#endregion
//#region src/types/config.d.ts
/**
 * Config interface.
 */
interface Config$1<TIssue extends BaseIssue<unknown>> {
  /**
   * The selected language.
   */
  readonly lang?: string | undefined;
  /**
   * The error message.
   */
  readonly message?: ErrorMessage<TIssue> | undefined;
  /**
   * Whether it should be aborted early.
   */
  readonly abortEarly?: boolean | undefined;
  /**
   * Whether a pipe should be aborted early.
   */
  readonly abortPipeEarly?: boolean | undefined;
}
//#endregion
//#region src/types/pipe.d.ts
/**
 * Pipe action type.
 */
type PipeAction<TInput$1, TOutput$1, TIssue extends BaseIssue<unknown>> = BaseValidation<TInput$1, TOutput$1, TIssue> | BaseTransformation<TInput$1, TOutput$1, TIssue> | BaseMetadata<TInput$1>;
/**
 * Pipe item type.
 */
type PipeItem<TInput$1, TOutput$1, TIssue extends BaseIssue<unknown>> = BaseSchema$1<TInput$1, TOutput$1, TIssue> | PipeAction<TInput$1, TOutput$1, TIssue>;
//#endregion
//#region src/schemas/array/types.d.ts
/**
 * Array issue interface.
 */
interface ArrayIssue extends BaseIssue<unknown> {
  /**
   * The issue kind.
   */
  readonly kind: "schema";
  /**
   * The issue type.
   */
  readonly type: "array";
  /**
   * The expected property.
   */
  readonly expected: "Array";
}
//#endregion
//#region src/schemas/array/array.d.ts
/**
 * Array schema interface.
 */
interface ArraySchema<TItem$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>>, TMessage extends ErrorMessage<ArrayIssue> | undefined> extends BaseSchema$1<InferInput$1<TItem$1>[], InferOutput$1<TItem$1>[], ArrayIssue | InferIssue<TItem$1>> {
  /**
   * The schema type.
   */
  readonly type: "array";
  /**
   * The schema reference.
   */
  readonly reference: typeof array$1;
  /**
   * The expected property.
   */
  readonly expects: "Array";
  /**
   * The array item schema.
   */
  readonly item: TItem$1;
  /**
   * The error message.
   */
  readonly message: TMessage;
}
/**
 * Creates an array schema.
 *
 * @param item The item schema.
 *
 * @returns An array schema.
 */
declare function array$1<const TItem$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>>>(item: TItem$1): ArraySchema<TItem$1, undefined>;
/**
 * Creates an array schema.
 *
 * @param item The item schema.
 * @param message The error message.
 *
 * @returns An array schema.
 */
declare function array$1<const TItem$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>>, const TMessage extends ErrorMessage<ArrayIssue> | undefined>(item: TItem$1, message: TMessage): ArraySchema<TItem$1, TMessage>;
//#endregion
//#region src/schemas/boolean/boolean.d.ts
/**
 * Boolean issue interface.
 */
interface BooleanIssue extends BaseIssue<unknown> {
  /**
   * The issue kind.
   */
  readonly kind: "schema";
  /**
   * The issue type.
   */
  readonly type: "boolean";
  /**
   * The expected property.
   */
  readonly expected: "boolean";
}
/**
 * Boolean schema interface.
 */
interface BooleanSchema<TMessage extends ErrorMessage<BooleanIssue> | undefined> extends BaseSchema$1<boolean, boolean, BooleanIssue> {
  /**
   * The schema type.
   */
  readonly type: "boolean";
  /**
   * The schema reference.
   */
  readonly reference: typeof boolean$1;
  /**
   * The expected property.
   */
  readonly expects: "boolean";
  /**
   * The error message.
   */
  readonly message: TMessage;
}
/**
 * Creates a boolean schema.
 *
 * @returns A boolean schema.
 */
declare function boolean$1(): BooleanSchema<undefined>;
/**
 * Creates a boolean schema.
 *
 * @param message The error message.
 *
 * @returns A boolean schema.
 */
declare function boolean$1<const TMessage extends ErrorMessage<BooleanIssue> | undefined>(message: TMessage): BooleanSchema<TMessage>;
//#endregion
//#region src/schemas/date/date.d.ts
/**
 * Date issue interface.
 */
interface DateIssue extends BaseIssue<unknown> {
  /**
   * The issue kind.
   */
  readonly kind: "schema";
  /**
   * The issue type.
   */
  readonly type: "date";
  /**
   * The expected property.
   */
  readonly expected: "Date";
}
/**
 * Date schema interface.
 */
interface DateSchema<TMessage extends ErrorMessage<DateIssue> | undefined> extends BaseSchema$1<Date, Date, DateIssue> {
  /**
   * The schema type.
   */
  readonly type: "date";
  /**
   * The schema reference.
   */
  readonly reference: typeof date$1;
  /**
   * The expected property.
   */
  readonly expects: "Date";
  /**
   * The error message.
   */
  readonly message: TMessage;
}
/**
 * Creates a date schema.
 *
 * @returns A date schema.
 */
declare function date$1(): DateSchema<undefined>;
/**
 * Creates a date schema.
 *
 * @param message The error message.
 *
 * @returns A date schema.
 */
declare function date$1<const TMessage extends ErrorMessage<DateIssue> | undefined>(message: TMessage): DateSchema<TMessage>;
//#endregion
//#region src/schemas/exactOptional/exactOptional.d.ts
/**
 * Exact optional schema interface.
 */
interface ExactOptionalSchema<TWrapped$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>>, TDefault extends Default<TWrapped$1, never>> extends BaseSchema$1<InferInput$1<TWrapped$1>, InferOutput$1<TWrapped$1>, InferIssue<TWrapped$1>> {
  /**
   * The schema type.
   */
  readonly type: "exact_optional";
  /**
   * The schema reference.
   */
  readonly reference: typeof exactOptional;
  /**
   * The expected property.
   */
  readonly expects: TWrapped$1["expects"];
  /**
   * The wrapped schema.
   */
  readonly wrapped: TWrapped$1;
  /**
   * The default value.
   */
  readonly default: TDefault;
}
/**
 * Creates an exact optional schema.
 *
 * @param wrapped The wrapped schema.
 *
 * @returns An exact optional schema.
 */
declare function exactOptional<const TWrapped$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>>>(wrapped: TWrapped$1): ExactOptionalSchema<TWrapped$1, undefined>;
/**
 * Creates an exact optional schema.
 *
 * @param wrapped The wrapped schema.
 * @param default_ The default value.
 *
 * @returns An exact optional schema.
 */
declare function exactOptional<const TWrapped$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>>, const TDefault extends Default<TWrapped$1, never>>(wrapped: TWrapped$1, default_: TDefault): ExactOptionalSchema<TWrapped$1, TDefault>;
//#endregion
//#region src/schemas/exactOptional/exactOptionalAsync.d.ts
/**
 * Exact optional schema async interface.
 */
interface ExactOptionalSchemaAsync<TWrapped$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>, TDefault extends DefaultAsync<TWrapped$1, never>> extends BaseSchemaAsync<InferInput$1<TWrapped$1>, InferOutput$1<TWrapped$1>, InferIssue<TWrapped$1>> {
  /**
   * The schema type.
   */
  readonly type: "exact_optional";
  /**
   * The schema reference.
   */
  readonly reference: typeof exactOptional | typeof exactOptionalAsync;
  /**
   * The expected property.
   */
  readonly expects: TWrapped$1["expects"];
  /**
   * The wrapped schema.
   */
  readonly wrapped: TWrapped$1;
  /**
   * The default value.
   */
  readonly default: TDefault;
}
/**
 * Creates an exact optional schema.
 *
 * @param wrapped The wrapped schema.
 *
 * @returns An exact optional schema.
 */
declare function exactOptionalAsync<const TWrapped$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>>(wrapped: TWrapped$1): ExactOptionalSchemaAsync<TWrapped$1, undefined>;
/**
 * Creates an exact optional schema.
 *
 * @param wrapped The wrapped schema.
 * @param default_ The default value.
 *
 * @returns An exact optional schema.
 */
declare function exactOptionalAsync<const TWrapped$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>, const TDefault extends DefaultAsync<TWrapped$1, never>>(wrapped: TWrapped$1, default_: TDefault): ExactOptionalSchemaAsync<TWrapped$1, TDefault>;
//#endregion
//#region src/schemas/literal/literal.d.ts
/**
 * Literal type.
 */
type Literal = bigint | boolean | number | string | symbol;
/**
 * Literal issue interface.
 */
interface LiteralIssue extends BaseIssue<unknown> {
  /**
   * The issue kind.
   */
  readonly kind: "schema";
  /**
   * The issue type.
   */
  readonly type: "literal";
  /**
   * The expected property.
   */
  readonly expected: string;
}
/**
 * Literal schema interface.
 */
interface LiteralSchema<TLiteral extends Literal, TMessage extends ErrorMessage<LiteralIssue> | undefined> extends BaseSchema$1<TLiteral, TLiteral, LiteralIssue> {
  /**
   * The schema type.
   */
  readonly type: "literal";
  /**
   * The schema reference.
   */
  readonly reference: typeof literal$1;
  /**
   * The literal value.
   */
  readonly literal: TLiteral;
  /**
   * The error message.
   */
  readonly message: TMessage;
}
/**
 * Creates a literal schema.
 *
 * @param literal_ The literal value.
 *
 * @returns A literal schema.
 */
declare function literal$1<const TLiteral extends Literal>(literal_: TLiteral): LiteralSchema<TLiteral, undefined>;
/**
 * Creates a literal schema.
 *
 * @param literal_ The literal value.
 * @param message The error message.
 *
 * @returns A literal schema.
 */
declare function literal$1<const TLiteral extends Literal, const TMessage extends ErrorMessage<LiteralIssue> | undefined>(literal_: TLiteral, message: TMessage): LiteralSchema<TLiteral, TMessage>;
//#endregion
//#region src/schemas/union/types.d.ts
/**
 * Union issue interface.
 */
interface UnionIssue<TSubIssue extends BaseIssue<unknown>> extends BaseIssue<unknown> {
  /**
   * The issue kind.
   */
  readonly kind: "schema";
  /**
   * The issue type.
   */
  readonly type: "union";
  /**
   * The expected property.
   */
  readonly expected: string;
  /**
   * The sub issues.
   */
  readonly issues?: [TSubIssue, ...TSubIssue[]];
}
//#endregion
//#region src/schemas/union/union.d.ts
/**
 * Union options type.
 */
type UnionOptions = MaybeReadonly<BaseSchema$1<unknown, unknown, BaseIssue<unknown>>[]>;
/**
 * Union schema interface.
 */
interface UnionSchema<TOptions$1 extends UnionOptions, TMessage extends ErrorMessage<UnionIssue<InferIssue<TOptions$1[number]>>> | undefined> extends BaseSchema$1<InferInput$1<TOptions$1[number]>, InferOutput$1<TOptions$1[number]>, UnionIssue<InferIssue<TOptions$1[number]>> | InferIssue<TOptions$1[number]>> {
  /**
   * The schema type.
   */
  readonly type: "union";
  /**
   * The schema reference.
   */
  readonly reference: typeof union$1;
  /**
   * The union options.
   */
  readonly options: TOptions$1;
  /**
   * The error message.
   */
  readonly message: TMessage;
}
/**
 * Creates an union schema.
 *
 * @param options The union options.
 *
 * @returns An union schema.
 */
declare function union$1<const TOptions$1 extends UnionOptions>(options: TOptions$1): UnionSchema<TOptions$1, undefined>;
/**
 * Creates an union schema.
 *
 * @param options The union options.
 * @param message The error message.
 *
 * @returns An union schema.
 */
declare function union$1<const TOptions$1 extends UnionOptions, const TMessage extends ErrorMessage<UnionIssue<InferIssue<TOptions$1[number]>>> | undefined>(options: TOptions$1, message: TMessage): UnionSchema<TOptions$1, TMessage>;
//#endregion
//#region src/schemas/nullish/types.d.ts
/**
 * Infer nullish output type.
 */
type InferNullishOutput<TWrapped$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>, TDefault extends DefaultAsync<TWrapped$1, null | undefined>> = undefined extends TDefault ? InferOutput$1<TWrapped$1> | null | undefined : InferOutput$1<TWrapped$1> | Extract<DefaultValue<TDefault>, null | undefined>;
//#endregion
//#region src/schemas/nullish/nullish.d.ts
/**
 * Nullish schema interface.
 */
interface NullishSchema<TWrapped$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>>, TDefault extends Default<TWrapped$1, null | undefined>> extends BaseSchema$1<InferInput$1<TWrapped$1> | null | undefined, InferNullishOutput<TWrapped$1, TDefault>, InferIssue<TWrapped$1>> {
  /**
   * The schema type.
   */
  readonly type: "nullish";
  /**
   * The schema reference.
   */
  readonly reference: typeof nullish;
  /**
   * The expected property.
   */
  readonly expects: `(${TWrapped$1["expects"]} | null | undefined)`;
  /**
   * The wrapped schema.
   */
  readonly wrapped: TWrapped$1;
  /**
   * The default value.
   */
  readonly default: TDefault;
}
/**
 * Creates a nullish schema.
 *
 * @param wrapped The wrapped schema.
 *
 * @returns A nullish schema.
 */
declare function nullish<const TWrapped$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>>>(wrapped: TWrapped$1): NullishSchema<TWrapped$1, undefined>;
/**
 * Creates a nullish schema.
 *
 * @param wrapped The wrapped schema.
 * @param default_ The default value.
 *
 * @returns A nullish schema.
 */
declare function nullish<const TWrapped$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>>, const TDefault extends Default<TWrapped$1, null | undefined>>(wrapped: TWrapped$1, default_: TDefault): NullishSchema<TWrapped$1, TDefault>;
//#endregion
//#region src/schemas/nullish/nullishAsync.d.ts
/**
 * Nullish schema async interface.
 */
interface NullishSchemaAsync<TWrapped$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>, TDefault extends DefaultAsync<TWrapped$1, null | undefined>> extends BaseSchemaAsync<InferInput$1<TWrapped$1> | null | undefined, InferNullishOutput<TWrapped$1, TDefault>, InferIssue<TWrapped$1>> {
  /**
   * The schema type.
   */
  readonly type: "nullish";
  /**
   * The schema reference.
   */
  readonly reference: typeof nullish | typeof nullishAsync;
  /**
   * The expected property.
   */
  readonly expects: `(${TWrapped$1["expects"]} | null | undefined)`;
  /**
   * The wrapped schema.
   */
  readonly wrapped: TWrapped$1;
  /**
   * The default value.
   */
  readonly default: TDefault;
}
/**
 * Creates a nullish schema.
 *
 * @param wrapped The wrapped schema.
 *
 * @returns A nullish schema.
 */
declare function nullishAsync<const TWrapped$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>>(wrapped: TWrapped$1): NullishSchemaAsync<TWrapped$1, undefined>;
/**
 * Creates a nullish schema.
 *
 * @param wrapped The wrapped schema.
 * @param default_ The default value.
 *
 * @returns A nullish schema.
 */
declare function nullishAsync<const TWrapped$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>, const TDefault extends DefaultAsync<TWrapped$1, null | undefined>>(wrapped: TWrapped$1, default_: TDefault): NullishSchemaAsync<TWrapped$1, TDefault>;
//#endregion
//#region src/schemas/object/types.d.ts
/**
 * Object issue interface.
 */
interface ObjectIssue extends BaseIssue<unknown> {
  /**
   * The issue kind.
   */
  readonly kind: "schema";
  /**
   * The issue type.
   */
  readonly type: "object";
  /**
   * The expected property.
   */
  readonly expected: "Object" | `"${string}"`;
}
//#endregion
//#region src/schemas/object/object.d.ts
/**
 * Object schema interface.
 */
interface ObjectSchema$1<TEntries$1 extends ObjectEntries$1, TMessage extends ErrorMessage<ObjectIssue> | undefined> extends BaseSchema$1<InferObjectInput<TEntries$1>, InferObjectOutput<TEntries$1>, ObjectIssue | InferObjectIssue<TEntries$1>> {
  /**
   * The schema type.
   */
  readonly type: "object";
  /**
   * The schema reference.
   */
  readonly reference: typeof object$1;
  /**
   * The expected property.
   */
  readonly expects: "Object";
  /**
   * The entries schema.
   */
  readonly entries: TEntries$1;
  /**
   * The error message.
   */
  readonly message: TMessage;
}
/**
 * Creates an object schema.
 *
 * Hint: This schema removes unknown entries. The output will only include the
 * entries you specify. To include unknown entries, use `looseObject`. To
 * return an issue for unknown entries, use `strictObject`. To include and
 * validate unknown entries, use `objectWithRest`.
 *
 * @param entries The entries schema.
 *
 * @returns An object schema.
 */
declare function object$1<const TEntries$1 extends ObjectEntries$1>(entries: TEntries$1): ObjectSchema$1<TEntries$1, undefined>;
/**
 * Creates an object schema.
 *
 * Hint: This schema removes unknown entries. The output will only include the
 * entries you specify. To include unknown entries, use `looseObject`. To
 * return an issue for unknown entries, use `strictObject`. To include and
 * validate unknown entries, use `objectWithRest`.
 *
 * @param entries The entries schema.
 * @param message The error message.
 *
 * @returns An object schema.
 */
declare function object$1<const TEntries$1 extends ObjectEntries$1, const TMessage extends ErrorMessage<ObjectIssue> | undefined>(entries: TEntries$1, message: TMessage): ObjectSchema$1<TEntries$1, TMessage>;
//#endregion
//#region src/schemas/optional/types.d.ts
/**
 * Infer optional output type.
 */
type InferOptionalOutput<TWrapped$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>, TDefault extends DefaultAsync<TWrapped$1, undefined>> = undefined extends TDefault ? InferOutput$1<TWrapped$1> | undefined : InferOutput$1<TWrapped$1> | Extract<DefaultValue<TDefault>, undefined>;
//#endregion
//#region src/schemas/optional/optional.d.ts
/**
 * Optional schema interface.
 */
interface OptionalSchema<TWrapped$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>>, TDefault extends Default<TWrapped$1, undefined>> extends BaseSchema$1<InferInput$1<TWrapped$1> | undefined, InferOptionalOutput<TWrapped$1, TDefault>, InferIssue<TWrapped$1>> {
  /**
   * The schema type.
   */
  readonly type: "optional";
  /**
   * The schema reference.
   */
  readonly reference: typeof optional$1;
  /**
   * The expected property.
   */
  readonly expects: `(${TWrapped$1["expects"]} | undefined)`;
  /**
   * The wrapped schema.
   */
  readonly wrapped: TWrapped$1;
  /**
   * The default value.
   */
  readonly default: TDefault;
}
/**
 * Creates an optional schema.
 *
 * @param wrapped The wrapped schema.
 *
 * @returns An optional schema.
 */
declare function optional$1<const TWrapped$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>>>(wrapped: TWrapped$1): OptionalSchema<TWrapped$1, undefined>;
/**
 * Creates an optional schema.
 *
 * @param wrapped The wrapped schema.
 * @param default_ The default value.
 *
 * @returns An optional schema.
 */
declare function optional$1<const TWrapped$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>>, const TDefault extends Default<TWrapped$1, undefined>>(wrapped: TWrapped$1, default_: TDefault): OptionalSchema<TWrapped$1, TDefault>;
//#endregion
//#region src/schemas/optional/optionalAsync.d.ts
/**
 * Optional schema async interface.
 */
interface OptionalSchemaAsync<TWrapped$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>, TDefault extends DefaultAsync<TWrapped$1, undefined>> extends BaseSchemaAsync<InferInput$1<TWrapped$1> | undefined, InferOptionalOutput<TWrapped$1, TDefault>, InferIssue<TWrapped$1>> {
  /**
   * The schema type.
   */
  readonly type: "optional";
  /**
   * The schema reference.
   */
  readonly reference: typeof optional$1 | typeof optionalAsync;
  /**
   * The expected property.
   */
  readonly expects: `(${TWrapped$1["expects"]} | undefined)`;
  /**
   * The wrapped schema.
   */
  readonly wrapped: TWrapped$1;
  /**
   * The default value.
   */
  readonly default: TDefault;
}
/**
 * Creates an optional schema.
 *
 * @param wrapped The wrapped schema.
 *
 * @returns An optional schema.
 */
declare function optionalAsync<const TWrapped$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>>(wrapped: TWrapped$1): OptionalSchemaAsync<TWrapped$1, undefined>;
/**
 * Creates an optional schema.
 *
 * @param wrapped The wrapped schema.
 * @param default_ The default value.
 *
 * @returns An optional schema.
 */
declare function optionalAsync<const TWrapped$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>, const TDefault extends DefaultAsync<TWrapped$1, undefined>>(wrapped: TWrapped$1, default_: TDefault): OptionalSchemaAsync<TWrapped$1, TDefault>;
//#endregion
//#region src/schemas/picklist/picklist.d.ts
/**
 * Picklist options type.
 */
type PicklistOptions = MaybeReadonly<(string | number | bigint)[]>;
/**
 * Picklist issue interface.
 */
interface PicklistIssue extends BaseIssue<unknown> {
  /**
   * The issue kind.
   */
  readonly kind: "schema";
  /**
   * The issue type.
   */
  readonly type: "picklist";
  /**
   * The expected property.
   */
  readonly expected: string;
}
/**
 * Picklist schema interface.
 */
interface PicklistSchema<TOptions$1 extends PicklistOptions, TMessage extends ErrorMessage<PicklistIssue> | undefined> extends BaseSchema$1<TOptions$1[number], TOptions$1[number], PicklistIssue> {
  /**
   * The schema type.
   */
  readonly type: "picklist";
  /**
   * The schema reference.
   */
  readonly reference: typeof picklist$1;
  /**
   * The picklist options.
   */
  readonly options: TOptions$1;
  /**
   * The error message.
   */
  readonly message: TMessage;
}
/**
 * Creates a picklist schema.
 *
 * @param options The picklist options.
 *
 * @returns A picklist schema.
 */
declare function picklist$1<const TOptions$1 extends PicklistOptions>(options: TOptions$1): PicklistSchema<TOptions$1, undefined>;
/**
 * Creates a picklist schema.
 *
 * @param options The picklist options.
 * @param message The error message.
 *
 * @returns A picklist schema.
 */
declare function picklist$1<const TOptions$1 extends PicklistOptions, const TMessage extends ErrorMessage<PicklistIssue> | undefined>(options: TOptions$1, message: TMessage): PicklistSchema<TOptions$1, TMessage>;
//#endregion
//#region src/schemas/record/types.d.ts
/**
 * Record issue interface.
 */
interface RecordIssue extends BaseIssue<unknown> {
  /**
   * The issue kind.
   */
  readonly kind: "schema";
  /**
   * The issue type.
   */
  readonly type: "record";
  /**
   * The expected property.
   */
  readonly expected: "Object";
}
/**
 * Is literal type.
 */
type IsLiteral<TKey$1 extends string | number | symbol> = string extends TKey$1 ? false : number extends TKey$1 ? false : symbol extends TKey$1 ? false : TKey$1 extends Brand<string | number | symbol> ? false : true;
/**
 * Optional keys type.
 */
type OptionalKeys<TObject extends Record<string | number | symbol, unknown>> = { [TKey in keyof TObject]: IsLiteral<TKey> extends true ? TKey : never; }[keyof TObject];
/**
 * With question marks type.
 *
 * Hint: We mark an entry as optional if we detect that its key is a literal
 * type. The reason for this is that it is not technically possible to detect
 * missing literal keys without restricting the key schema to `string`, `enum`
 * and `picklist`. However, if `enum` and `picklist` are used, it is better to
 * use `object` with `entriesFromList` because it already covers the needed
 * functionality. This decision also reduces the bundle size of `record`,
 * because it only needs to check the entries of the input and not any missing
 * keys.
 */
type WithQuestionMarks<TObject extends Record<string | number | symbol, unknown>> = MarkOptional<TObject, OptionalKeys<TObject>>;
/**
 * With readonly type.
 */
type WithReadonly<TValue$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>, TObject extends WithQuestionMarks<Record<string | number | symbol, unknown>>> = TValue$1 extends {
  readonly pipe: readonly unknown[];
} ? ReadonlyAction<any> extends TValue$1["pipe"][number] ? Readonly<TObject> : TObject : TObject;
/**
 * Infer record input type.
 */
type InferRecordInput<TKey$1 extends BaseSchema$1<string, string | number | symbol, BaseIssue<unknown>> | BaseSchemaAsync<string, string | number | symbol, BaseIssue<unknown>>, TValue$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>> = Prettify<WithQuestionMarks<Record<InferInput$1<TKey$1>, InferInput$1<TValue$1>>>>;
/**
 * Infer record output type.
 */
type InferRecordOutput<TKey$1 extends BaseSchema$1<string, string | number | symbol, BaseIssue<unknown>> | BaseSchemaAsync<string, string | number | symbol, BaseIssue<unknown>>, TValue$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>> | BaseSchemaAsync<unknown, unknown, BaseIssue<unknown>>> = Prettify<WithReadonly<TValue$1, WithQuestionMarks<Record<InferOutput$1<TKey$1>, InferOutput$1<TValue$1>>>>>;
//#endregion
//#region src/schemas/record/record.d.ts
/**
 * Record schema interface.
 */
interface RecordSchema<TKey$1 extends BaseSchema$1<string, string | number | symbol, BaseIssue<unknown>>, TValue$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>>, TMessage extends ErrorMessage<RecordIssue> | undefined> extends BaseSchema$1<InferRecordInput<TKey$1, TValue$1>, InferRecordOutput<TKey$1, TValue$1>, RecordIssue | InferIssue<TKey$1> | InferIssue<TValue$1>> {
  /**
   * The schema type.
   */
  readonly type: "record";
  /**
   * The schema reference.
   */
  readonly reference: typeof record$1;
  /**
   * The expected property.
   */
  readonly expects: "Object";
  /**
   * The record key schema.
   */
  readonly key: TKey$1;
  /**
   * The record value schema.
   */
  readonly value: TValue$1;
  /**
   * The error message.
   */
  readonly message: TMessage;
}
/**
 * Creates a record schema.
 *
 * @param key The key schema.
 * @param value The value schema.
 *
 * @returns A record schema.
 */
declare function record$1<const TKey$1 extends BaseSchema$1<string, string | number | symbol, BaseIssue<unknown>>, const TValue$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>>>(key: TKey$1, value: TValue$1): RecordSchema<TKey$1, TValue$1, undefined>;
/**
 * Creates a record schema.
 *
 * @param key The key schema.
 * @param value The value schema.
 * @param message The error message.
 *
 * @returns A record schema.
 */
declare function record$1<const TKey$1 extends BaseSchema$1<string, string | number | symbol, BaseIssue<unknown>>, const TValue$1 extends BaseSchema$1<unknown, unknown, BaseIssue<unknown>>, const TMessage extends ErrorMessage<RecordIssue> | undefined>(key: TKey$1, value: TValue$1, message: TMessage): RecordSchema<TKey$1, TValue$1, TMessage>;
//#endregion
//#region src/schemas/string/string.d.ts
/**
 * String issue interface.
 */
interface StringIssue extends BaseIssue<unknown> {
  /**
   * The issue kind.
   */
  readonly kind: "schema";
  /**
   * The issue type.
   */
  readonly type: "string";
  /**
   * The expected property.
   */
  readonly expected: "string";
}
/**
 * String schema interface.
 */
interface StringSchema<TMessage extends ErrorMessage<StringIssue> | undefined> extends BaseSchema$1<string, string, StringIssue> {
  /**
   * The schema type.
   */
  readonly type: "string";
  /**
   * The schema reference.
   */
  readonly reference: typeof string$1;
  /**
   * The expected property.
   */
  readonly expects: "string";
  /**
   * The error message.
   */
  readonly message: TMessage;
}
/**
 * Creates a string schema.
 *
 * @returns A string schema.
 */
declare function string$1(): StringSchema<undefined>;
/**
 * Creates a string schema.
 *
 * @param message The error message.
 *
 * @returns A string schema.
 */
declare function string$1<const TMessage extends ErrorMessage<StringIssue> | undefined>(message: TMessage): StringSchema<TMessage>;
//#endregion
//#region src/schemas/unknown/unknown.d.ts
/**
 * Unknown schema interface.
 */
interface UnknownSchema extends BaseSchema$1<unknown, unknown, never> {
  /**
   * The schema type.
   */
  readonly type: "unknown";
  /**
   * The schema reference.
   */
  readonly reference: typeof unknown$1;
  /**
   * The expected property.
   */
  readonly expects: "unknown";
}
/**
 * Creates a unknown schema.
 *
 * @returns A unknown schema.
 */
declare function unknown$1(): UnknownSchema;
//#endregion
//#region src/actions/brand/brand.d.ts
/**
 * Brand symbol.
 */
declare const BrandSymbol: unique symbol;
/**
 * Brand name type.
 */
type BrandName = string | number | symbol;
/**
 * Brand interface.
 */
interface Brand<TName extends BrandName> {
  [BrandSymbol]: { [TValue in TName]: TValue; };
}
//#endregion
//#region src/actions/isoTimestamp/isoTimestamp.d.ts
/**
 * ISO timestamp issue interface.
 */
interface IsoTimestampIssue<TInput$1 extends string> extends BaseIssue<TInput$1> {
  /**
   * The issue kind.
   */
  readonly kind: "validation";
  /**
   * The issue type.
   */
  readonly type: "iso_timestamp";
  /**
   * The expected property.
   */
  readonly expected: null;
  /**
   * The received property.
   */
  readonly received: `"${string}"`;
  /**
   * The ISO timestamp regex.
   */
  readonly requirement: RegExp;
}
/**
 * ISO timestamp action interface.
 */
interface IsoTimestampAction<TInput$1 extends string, TMessage extends ErrorMessage<IsoTimestampIssue<TInput$1>> | undefined> extends BaseValidation<TInput$1, TInput$1, IsoTimestampIssue<TInput$1>> {
  /**
   * The action type.
   */
  readonly type: "iso_timestamp";
  /**
   * The action reference.
   */
  readonly reference: typeof isoTimestamp$1;
  /**
   * The expected property.
   */
  readonly expects: null;
  /**
   * The ISO timestamp regex.
   */
  readonly requirement: RegExp;
  /**
   * The error message.
   */
  readonly message: TMessage;
}
/**
 * Creates an [ISO timestamp](https://en.wikipedia.org/wiki/ISO_8601) validation
 * action.
 *
 * Formats:
 * - yyyy-mm-ddThh:mm:ss.sssZ
 * - yyyy-mm-ddThh:mm:ss.sss±hh:mm
 * - yyyy-mm-ddThh:mm:ss.sss±hhmm
 *
 * Hint: To support timestamps with lower or higher accuracy, the millisecond
 * specification can be removed or contain up to 9 digits.
 *
 * Hint: The regex used cannot validate the maximum number of days based on
 * year and month. For example, "2023-06-31T00:00:00.000Z" is valid although
 * June has only 30 days.
 *
 * Hint: The regex also allows a space as a separator between the date and time
 * parts instead of the "T" character.
 *
 * Hint: The regex also allows a space before the UTC offset (e.g., " +00:00")
 * to support PostgreSQL's `timestamptz` output format.
 *
 * @returns An ISO timestamp action.
 */
declare function isoTimestamp$1<TInput$1 extends string>(): IsoTimestampAction<TInput$1, undefined>;
/**
 * Creates an [ISO timestamp](https://en.wikipedia.org/wiki/ISO_8601) validation
 * action.
 *
 * Formats:
 * - yyyy-mm-ddThh:mm:ss.sssZ
 * - yyyy-mm-ddThh:mm:ss.sss±hh:mm
 * - yyyy-mm-ddThh:mm:ss.sss±hhmm
 * - yyyy-mm-ddThh:mm:ss.sss±hh
 *
 * Hint: To support timestamps with lower or higher accuracy, the millisecond
 * specification can be removed or contain up to 9 digits.
 *
 * Hint: The regex used cannot validate the maximum number of days based on
 * year and month. For example, "2023-06-31T00:00:00.000Z" is valid although
 * June has only 30 days.
 *
 * Hint: The regex also allows a space as a separator between the date and time
 * parts instead of the "T" character.
 *
 * Hint: The regex also allows a space before the UTC offset (e.g., " +00:00")
 * to support PostgreSQL's `timestamptz` output format.
 *
 * @param message The error message.
 *
 * @returns An ISO timestamp action.
 */
declare function isoTimestamp$1<TInput$1 extends string, const TMessage extends ErrorMessage<IsoTimestampIssue<TInput$1>> | undefined>(message: TMessage): IsoTimestampAction<TInput$1, TMessage>;
//#endregion
//#region src/actions/readonly/readonly.d.ts
/**
 * Readonly output type.
 */
type ReadonlyOutput<TInput$1> = TInput$1 extends Map<infer TKey, infer TValue> ? ReadonlyMap<TKey, TValue> : TInput$1 extends Set<infer TValue> ? ReadonlySet<TValue> : Readonly<TInput$1>;
/**
 * Readonly action interface.
 */
interface ReadonlyAction<TInput$1> extends BaseTransformation<TInput$1, ReadonlyOutput<TInput$1>, never> {
  /**
   * The action type.
   */
  readonly type: "readonly";
  /**
   * The action reference.
   */
  readonly reference: typeof readonly;
}
/**
 * Creates a readonly transformation action.
 *
 * @returns A readonly action.
 */
declare function readonly<TInput$1>(): ReadonlyAction<TInput$1>;
//#endregion
//#region src/actions/transform/transform.d.ts
/**
 * Transform action interface.
 */
interface TransformAction<TInput$1, TOutput$1> extends BaseTransformation<TInput$1, TOutput$1, never> {
  /**
   * The action type.
   */
  readonly type: "transform";
  /**
   * The action reference.
   */
  readonly reference: typeof transform$1;
  /**
   * The transformation operation.
   */
  readonly operation: (input: TInput$1) => TOutput$1;
}
/**
 * Creates a custom transformation action.
 *
 * @param operation The transformation operation.
 *
 * @returns A transform action.
 */
declare function transform$1<TInput$1, TOutput$1>(operation: (input: TInput$1) => TOutput$1): TransformAction<TInput$1, TOutput$1>;
//#endregion
//#region src/lib/handle/failure.d.ts
/** The event the app level on-failure handler receives for every failed async consumer. */
type FailureEvent = {
  /** The unique id of the failure. */
  id: string;
  /** The moment the failure happened. */
  date: Date | string;
  /** The kind of consumer that failed, like "queue" or "dynamodb-stream". */
  type: string;
  /** The original payload the failed consumer received. */
  payload?: unknown;
  /** The resource the failure originated from. */
  source?: {
    resource?: string;
    event?: unknown;
  };
  /** The queue holding the failed message, for queue failures. */
  queue?: {
    name?: string;
  };
  /** The lambda function the failure happened in. */
  function?: {
    name?: string;
  };
  /** The error that caused the failure. */
  error?: {
    type?: string;
    message?: string;
    stackTrace?: string[];
  };
} & Record<string, unknown>;
type FailureHandler = (event: FailureEvent, context: Parameters<Handler>[1]) => unknown;
declare const failure: <H extends FailureHandler>(handle: H) => (event: unknown, context?: import("aws-lambda").Context) => Promise<unknown>;
declare const onErrorLogSchema: ObjectSchema$1<{
  readonly hash: StringSchema<undefined>;
  readonly requestId: StringSchema<undefined>;
  readonly origin: StringSchema<undefined>;
  readonly level: PicklistSchema<["warn", "error", "fatal"], undefined>;
  readonly type: StringSchema<undefined>;
  readonly message: StringSchema<undefined>;
  readonly stackTrace: OptionalSchema<ArraySchema<StringSchema<undefined>, undefined>, undefined>;
  readonly data: OptionalSchema<UnknownSchema, undefined>;
  readonly date: UnionSchema<[DateSchema<undefined>, SchemaWithPipe<readonly [StringSchema<undefined>, IsoTimestampAction<string, undefined>, TransformAction<string, Date>]>], undefined>;
}, undefined>;
/** The parsed log entry an error handler receives. */
type ErrorEvent = {
  /** The stable hash of the error, grouping repeated occurrences. */
  hash: string;
  /** The aws request id of the invocation that logged the error. */
  requestId: string;
  /** The bundle route key the error originated from. */
  origin: string;
  /** The severity of the log entry. */
  level: 'warn' | 'error' | 'fatal';
  /** The error type, like the class name of the thrown error. */
  type: string;
  /** The error message. */
  message: string;
  /** The stack trace lines of the error. */
  stackTrace?: string[];
  /** Extra structured data attached to the log entry. */
  data?: unknown;
  /** The moment the error was logged. */
  date: Date;
};
type ErrorSchema = GenericSchema<InferInput<typeof onErrorLogSchema>, ErrorEvent>;
declare const error: <H extends Handler<ErrorSchema>>(handle: H) => (event: {
  hash: string;
  requestId: string;
  origin: string;
  level: "error" | "fatal" | "warn";
  type: string;
  message: string;
  stackTrace?: string[] | undefined;
  data?: unknown;
  date: string | Date;
}, context?: import("aws-lambda").Context) => Promise<Awaited<ReturnType<H>>>;
//#endregion
//#region src/lib/handle/func.d.ts
type HandlerContext$1 = Parameters<Handler>[1];
type SchemalessEntry<E, R> = [unknown] extends [E] ? (event?: E, context?: LambdaContext) => Promise<Awaited<R>> : undefined extends E ? (event?: E, context?: LambdaContext) => Promise<Awaited<R>> : (event: E, context?: LambdaContext) => Promise<Awaited<R>>;
declare function func<E, R>(handle: (event: E, context: HandlerContext$1) => R): SchemalessEntry<E, R>;
declare function func<S extends GenericSchema, H extends Handler<S>>(schema: S, handle: H): LambdaFunction<H, S>;
declare const task: typeof func;
declare const cron: typeof func;
//#endregion
//#region src/lib/handle/image.d.ts
/** The origin request an image handler receives. */
type ImageEvent = {
  /** The path of the requested source image, without the preset & extension suffix. */
  path: string;
};
/** What an image handler returns: the source image as raw bytes or a base64 encoded string, or undefined for a 404. */
type ImageResponse = Buffer | ArrayBuffer | Uint8Array | string | undefined;
type ImageHandler = (event: ImageEvent, context: Parameters<Handler>[1]) => ImageResponse | Promise<ImageResponse>;
declare const image: <H extends ImageHandler>(handle: H) => (event: {
  path: string;
}, context?: import("aws-lambda").Context) => Promise<string | undefined>;
declare const icon: typeof image;
//#endregion
//#region src/lib/handle/queue.d.ts
/** The array of parsed message bodies a queue handler receives. */
type QueueEvent<S extends GenericSchema> = InferOutput<SqsQueueSchema<S>>;
declare const queue: <S extends GenericSchema, H extends Handler<SqsQueueSchema<S>>>(schema: S, handle: H) => (event: InferInput$1<S>[] | {
  Records: {
    body: string | InferInput$1<S>;
  }[];
} | InferInput$1<S>, context?: import("aws-lambda").Context) => Promise<Awaited<ReturnType<H>>>;
//#endregion
//#region src/lib/handle/route.d.ts
type RouteSchemaProps = {
  /** The schema the json request body validates against - the parsed result lands on `request.data`. */
  body?: GenericSchema;
  /** The schema the query string parameters validate against. */
  query?: ObjectSchema<ObjectEntries, undefined> | undefined;
  /** The schema the route path parameters validate against. */
  params?: ObjectSchema<ObjectEntries, undefined> | undefined;
};
type Op<T extends GenericSchema | undefined, D> = T extends GenericSchema ? InferOutput<T> : D;
type Method = 'GET' | 'POST' | 'HEAD' | 'OPTIONS' | 'PUT' | 'PATCH' | 'DELETE';
declare class RouteRequest<Params = Record<string, string>, Query = Record<string, string>, Data = unknown> {
  /** The http method of the request. */
  readonly method: Method;
  /** The full request url. */
  readonly url: URL;
  /** The request headers. */
  readonly headers: Headers;
  /** The validated route path parameters. */
  readonly params: Params;
  /** The validated query string parameters. */
  readonly query: Query;
  /** The parsed & validated request body, when a body schema is given. */
  readonly data: Data;
  /** The ip address of the caller. */
  readonly ip: string;
  /** The user agent header of the caller. */
  readonly userAgent: string;
  /** The raw request body bytes. */
  readonly body?: Buffer;
  constructor(props: {
    method: Method;
    url: string;
    headers: Headers;
    params: Params;
    query: Query;
    data: Data;
    ip: string;
    userAgent: string;
    body?: Buffer;
  });
  /** The body decoded as text. */
  text(): string | undefined;
  /** The body parsed as json. */
  json<T = unknown>(): T;
}
declare const envelopeSchema: ObjectSchema<{
  readonly rawPath: OptionalSchema<StringSchema<undefined>, undefined>;
  readonly rawQueryString: OptionalSchema<StringSchema<undefined>, undefined>;
  readonly body: OptionalSchema<StringSchema<undefined>, undefined>;
  readonly isBase64Encoded: OptionalSchema<BooleanSchema<undefined>, undefined>;
  readonly headers: OptionalSchema<RecordSchema<StringSchema<undefined>, StringSchema<undefined>, undefined>, undefined>;
  readonly pathParameters: OptionalSchema<RecordSchema<StringSchema<undefined>, StringSchema<undefined>, undefined>, undefined>;
  readonly queryStringParameters: OptionalSchema<RecordSchema<StringSchema<undefined>, StringSchema<undefined>, undefined>, undefined>;
  readonly requestContext: ObjectSchema<{
    readonly domainName: StringSchema<undefined>;
    readonly http: ObjectSchema<{
      readonly method: PicklistSchema<["GET", "POST", "HEAD", "OPTIONS", "PUT", "PATCH", "DELETE"], undefined>;
      readonly path: StringSchema<undefined>;
      readonly sourceIp: StringSchema<undefined>;
      readonly userAgent: StringSchema<undefined>;
    }, undefined>;
  }, undefined>;
}, undefined>;
type EnvelopeInput = InferInput<typeof envelopeSchema>;
type RouteRequestOf<P extends RouteSchemaProps> = RouteRequest<Op<P['params'], Record<string, string>>, Op<P['query'], Record<string, string>>, Op<P['body'], undefined>>;
type RouteSchema<P extends RouteSchemaProps> = BaseSchema<EnvelopeInput, RouteRequestOf<P>, GenericIssue>;
/** The request a route or site handler receives, validated against the route schemas. */
type RouteEvent<P extends RouteSchemaProps = {}> = RouteRequestOf<P>;
/** What a route or site handler may return: a web Response or a lambda url result object. */
type RouteResponse = Response | RouteEntryResult;
type RouteResult = RouteResponse | Promise<RouteResponse>;
/** The lambda url result a route entry resolves to - a returned web Response converts into this shape. */
type RouteEntryResult = {
  statusCode: number;
  headers?: Record<string, string>;
  cookies?: string[];
  body?: string;
  isBase64Encoded?: boolean;
  [key: string]: unknown;
};
type HandlerContext = Parameters<Handler>[1];
type RouteHandler<P extends RouteSchemaProps> = (request: RouteRequestOf<P>, context: HandlerContext) => RouteResult;
type RouteEntry = (event: unknown, context?: LambdaContext) => Promise<RouteEntryResult>;
declare function route<H extends RouteHandler<{}>>(handle: H): RouteEntry;
declare function route<P extends RouteSchemaProps>(props: P, handle: RouteHandler<P>): RouteEntry;
declare const site: <H extends RouteHandler<{}>>(handle: H) => RouteEntry;
//#endregion
//#region src/lib/handle/util.d.ts
declare const consumer: <S extends GenericSchema | undefined, H extends Handler<S>>(schema: S, handle: H) => (event: import("@awsless/lambda").Input<S>, context?: import("aws-lambda").Context) => Promise<Awaited<ReturnType<H>>>;
//#endregion
//#region src/lib/handle/topic.d.ts
/** The parsed message a subscriber receives, from either a defined topic or a plain payload schema. */
type SubscribeEvent<S extends {
  readonly schema: GenericSchema;
} | GenericSchema> = InferOutput<S extends {
  readonly schema: infer T extends GenericSchema;
} ? T : S extends GenericSchema ? S : never>;
declare function subscribe<D extends {
  readonly name: string;
  readonly schema: GenericSchema;
}, H extends Handler<SnsTopicSchema<D['schema']>>>(topic: D, handle: H): ReturnType<typeof consumer>;
declare function subscribe<S extends GenericSchema, H extends Handler<SnsTopicSchema<S>>>(schema: S, handle: H): ReturnType<typeof consumer>;
declare namespace pubsub_d_exports {
  export { AuthEvent$1 as AuthEvent, AuthResponse$1 as AuthResponse, ConnectedEvent, DisconnectedEvent, PubSubAuthResult, SubscribedEvent, UnsubscribedEvent, auth$1 as auth, connected, disconnected, subscribed, unsubscribed };
}
type PubSubAuthResult = {
  /** Allow the connection. */
  authorized: true;
  /** The topic patterns the connection may subscribe to, like `"chat.*"`. */
  allowed: string[];
  /** Extra data attached to the connection, passed along on every lifecycle event. */
  context?: Record<string, unknown>;
  /** How long the authorization stays cached before the authorizer runs again. */
  ttl?: Duration;
  /**
   * Close the connection after this duration, forcing the client
   * to re-authenticate. Min 1 hour, max 1 week. Default: 1 day.
   */
  disconnectAfter?: Duration;
} | {
  /** Reject the connection. */
  authorized: false;
};
declare const authEventSchema$1: ObjectSchema$1<{
  readonly token: OptionalSchema<StringSchema<undefined>, undefined>;
}, undefined>;
/** The event the pubsub authorizer receives. */
type AuthEvent$1 = {
  /** The auth token the client connected with - guest connections don't provide one. */
  token?: string;
};
/** The contract the pubsub authorizer returns. */
type AuthResponse$1 = PubSubAuthResult;
type AuthSchema$1 = GenericSchema<InferInput<typeof authEventSchema$1>, AuthEvent$1>;
declare const auth$1: <H extends Handler<AuthSchema$1, PubSubAuthResult | Promise<PubSubAuthResult>>>(handle: H) => (event: {
  token?: string | undefined;
}, context?: import("aws-lambda").Context) => Promise<Awaited<ReturnType<H>>>;
type LifecycleEvent<E extends string, C = unknown> = {
  /** The lifecycle event kind. */
  event: E;
  /** The moment the event happened. */
  date: Date;
  /** The unique id of the websocket connection. */
  socketId: string;
  /** The ip address the client connected from. */
  ip: string;
  /** The context the pubsub authorizer attached to the connection. */
  context?: C;
};
/** The parsed event a connected handler receives. */
type ConnectedEvent<C = unknown> = LifecycleEvent<'connected', C>;
/** The parsed event a disconnected handler receives. */
type DisconnectedEvent<C = unknown> = LifecycleEvent<'disconnected', C>;
/** The parsed event a subscribed handler receives. */
type SubscribedEvent<C = unknown> = LifecycleEvent<'subscribed', C> & {
  /** The topics the connection subscribed to. */
  topics: string[];
};
/** The parsed event an unsubscribed handler receives. */
type UnsubscribedEvent<C = unknown> = LifecycleEvent<'unsubscribed', C> & {
  /** The topics the connection unsubscribed from. */
  topics: string[];
};
declare const connectedSchema: import("@awsless/validate").SnsTopicSchema<ObjectSchema$1<{
  readonly event: LiteralSchema<"connected", undefined>;
  readonly date: DateSchema<undefined>;
  readonly socketId: StringSchema<undefined>;
  readonly ip: StringSchema<undefined>;
  readonly context: OptionalSchema<GenericSchema, undefined>;
}, undefined>>;
declare const disconnectedSchema: import("@awsless/validate").SnsTopicSchema<ObjectSchema$1<{
  readonly event: LiteralSchema<"disconnected", undefined>;
  readonly date: DateSchema<undefined>;
  readonly socketId: StringSchema<undefined>;
  readonly ip: StringSchema<undefined>;
  readonly context: OptionalSchema<GenericSchema, undefined>;
}, undefined>>;
declare const subscribedSchema: import("@awsless/validate").SnsTopicSchema<ObjectSchema$1<{
  readonly event: LiteralSchema<"subscribed", undefined>;
  readonly date: DateSchema<undefined>;
  readonly socketId: StringSchema<undefined>;
  readonly ip: StringSchema<undefined>;
  readonly context: OptionalSchema<GenericSchema, undefined>;
  readonly topics: ArraySchema<StringSchema<undefined>, undefined>;
}, undefined>>;
declare const unsubscribedSchema: import("@awsless/validate").SnsTopicSchema<ObjectSchema$1<{
  readonly event: LiteralSchema<"unsubscribed", undefined>;
  readonly date: DateSchema<undefined>;
  readonly socketId: StringSchema<undefined>;
  readonly ip: StringSchema<undefined>;
  readonly context: OptionalSchema<GenericSchema, undefined>;
  readonly topics: ArraySchema<StringSchema<undefined>, undefined>;
}, undefined>>;
type ConnectedSchema<C = unknown> = GenericSchema<InferInput<typeof connectedSchema>, ConnectedEvent<C>>;
type DisconnectedSchema<C = unknown> = GenericSchema<InferInput<typeof disconnectedSchema>, DisconnectedEvent<C>>;
type SubscribedSchema<C = unknown> = GenericSchema<InferInput<typeof subscribedSchema>, SubscribedEvent<C>>;
type UnsubscribedSchema<C = unknown> = GenericSchema<InferInput<typeof unsubscribedSchema>, UnsubscribedEvent<C>>;
declare function connected<H extends Handler<ConnectedSchema>>(handle: H): ReturnType<typeof consumer>;
declare function connected<C extends GenericSchema, H extends Handler<ConnectedSchema<InferOutput<C>>>>(context: C, handle: H): ReturnType<typeof consumer>;
declare function disconnected<H extends Handler<DisconnectedSchema>>(handle: H): ReturnType<typeof consumer>;
declare function disconnected<C extends GenericSchema, H extends Handler<DisconnectedSchema<InferOutput<C>>>>(context: C, handle: H): ReturnType<typeof consumer>;
declare function subscribed<H extends Handler<SubscribedSchema>>(handle: H): ReturnType<typeof consumer>;
declare function subscribed<C extends GenericSchema, H extends Handler<SubscribedSchema<InferOutput<C>>>>(context: C, handle: H): ReturnType<typeof consumer>;
declare function unsubscribed<H extends Handler<UnsubscribedSchema>>(handle: H): ReturnType<typeof consumer>;
declare function unsubscribed<C extends GenericSchema, H extends Handler<UnsubscribedSchema<InferOutput<C>>>>(context: C, handle: H): ReturnType<typeof consumer>;
declare namespace rpc_d_exports {
  export { AuthEvent, AuthResponse, RpcAuthResult, auth };
}
type RpcAuthResult = {
  /** Allow the caller. */
  authorized: true;
  /** How long the authorization stays cached before the authorizer runs again. */
  ttl: Duration;
  /** Extra data attached to the session. */
  context?: Record<string, unknown>;
  /** The rpc function names the caller may invoke - every function when omitted. */
  allowedFunctions?: string[];
  /** Callers sharing this key run one request at a time. */
  lockKey?: string;
} | {
  /** Reject the caller. */
  authorized: false;
};
declare const authEventSchema: ObjectSchema$1<{
  readonly token: StringSchema<undefined>;
}, undefined>;
/** The event the rpc authorizer receives. */
type AuthEvent = {
  /** The auth token the caller sent in the authentication header. */
  token: string;
};
/** The contract the rpc authorizer returns. */
type AuthResponse = RpcAuthResult;
type AuthSchema = GenericSchema<InferInput<typeof authEventSchema>, AuthEvent>;
declare const auth: <H extends Handler<AuthSchema, RpcAuthResult | Promise<RpcAuthResult>>>(handle: H) => (event: {
  token: string;
}, context?: import("aws-lambda").Context) => Promise<Awaited<ReturnType<H>>>;
declare namespace store_d_exports {
  export { StoreEvent, event };
}
declare const storeNotificationSchema: UnionSchema<[SchemaWithPipe<readonly [ObjectSchema$1<{
  readonly bucket: StringSchema<undefined>;
  readonly key: StringSchema<undefined>;
}, undefined>, TransformAction<{
  bucket: string;
  key: string;
}, {
  bucket: string;
  key: string;
}[]>]>, ArraySchema<ObjectSchema$1<{
  readonly bucket: StringSchema<undefined>;
  readonly key: StringSchema<undefined>;
}, undefined>, undefined>, SchemaWithPipe<readonly [ObjectSchema$1<{
  readonly Records: ArraySchema<ObjectSchema$1<{
    readonly s3: ObjectSchema$1<{
      readonly bucket: ObjectSchema$1<{
        readonly name: StringSchema<undefined>;
      }, undefined>;
      readonly object: ObjectSchema$1<{
        readonly key: StringSchema<undefined>;
      }, undefined>;
    }, undefined>;
  }, undefined>, undefined>;
}, undefined>, TransformAction<{
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
type StoreEvent = {
  /** The name of the bucket holding the affected object. */
  bucket: string;
  /** The key of the affected object. */
  key: string;
}[];
type StoreSchema = GenericSchema<InferInput<typeof storeNotificationSchema>, StoreEvent>;
declare const event: <H extends Handler<StoreSchema>>(handle: H) => (event: {
  bucket: string;
  key: string;
}[] | {
  bucket: string;
  key: string;
} | {
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
declare namespace table_d_exports {
  export { StreamEvent, stream };
}
/** The array of parsed change records a stream handler receives. */
type StreamEvent<T extends AnyTable> = InferOutput<DynamoDBStreamSchema<T>>;
declare const stream: <T extends AnyTable, H extends Handler<DynamoDBStreamSchema<T>>>(table: T, handle: H) => (event: {
  Records: {
    eventName: 'INSERT' | 'MODIFY' | 'REMOVE';
    dynamodb: {
      Keys: unknown;
      OldImage?: unknown;
      NewImage?: unknown;
    };
  }[];
}, context?: import("aws-lambda").Context) => Promise<Awaited<ReturnType<H>>>;
declare namespace index_d_exports {
  export { ErrorEvent, FailureEvent, ImageEvent, ImageResponse, QueueEvent, RouteEntryResult, RouteEvent, RouteRequest, RouteResponse, RouteSchema, RouteSchemaProps, SubscribeEvent, cron, error, failure, func, icon, image, pubsub_d_exports as pubsub, queue, route, rpc_d_exports as rpc, site, store_d_exports as store, subscribe, table_d_exports as table, task };
}
//#endregion
//#region src/lib/test/mock.d.ts
interface TestMock {
  readonly email: {
    /** Every email sent through Email.send, recorded for assertions & overridable like any mock. */
    readonly send: Mock<(email: {
      from?: string;
      to?: string[];
      subject?: string;
      html?: string;
    }) => unknown>;
  };
}
declare const mock: TestMock;
//#endregion
//#region src/lib/test/setup.d.ts
type TestManifest = {
  app: string;
  region: string;
  configs: Record<string, string>;
  tables: unknown[];
  tableKeys: {
    stack: string;
    id: string;
    keys: unknown;
  }[];
  streams: {
    stack: string;
    id: string;
    file: string;
    hash: string;
    sort?: string;
  }[];
  searches: {
    stack: string;
    id: string;
    mappings: unknown;
    settings?: unknown;
  }[];
  functions: {
    stack: string;
    id: string;
    file: string;
  }[];
  tasks: {
    stack: string;
    id: string;
    file: string;
  }[];
  queues: {
    stack: string;
    id: string;
    file?: string;
  }[];
  topics: string[];
  pubsub: string[];
  caches: {
    stack: string;
    id: string;
  }[];
  alerts: string[];
  jobs: {
    stack: string;
    id: string;
  }[];
  instances: {
    stack: string;
    id: string;
  }[];
  servers?: {
    redis?: {
      host: string;
      port: number;
    };
    search?: {
      domain: string;
    };
  };
};
declare const mockBaselines: Map<Mock, (...args: unknown[]) => unknown>;
declare const mockState: {
  inTest: boolean;
};
declare const testRegistry: {
  emails: Record<string, Mock>;
  functions: Record<string, Mock>;
  tasks: Record<string, Mock>;
  queues: Record<string, Mock>;
  topics: Record<string, Mock>;
  pubsub: Record<string, Mock>;
  alerts: Record<string, Mock>;
  jobs: Record<string, Mock>;
  instances: Record<string, Mock>;
};
declare const setupTestEnv: (manifest: TestManifest, options: {
  importFile: (file: string) => Promise<any>;
}) => Promise<void>;
//#endregion
//#region src/lib/server/alert.d.ts
declare const getAlertName: <N extends string>(resourceName: N) => `${string}--alert--${N}`;
interface AlertResources {}
declare const Alert: AlertResources;
//#endregion
//#region src/lib/server/auth.d.ts
declare const getAuthProps: (name: string) => {
  readonly userPoolId: string | undefined;
  readonly clientId: string | undefined;
};
interface AuthResources {}
declare const Auth: AuthResources;
//#endregion
//#region src/lib/server/bundle.d.ts
declare const ROUTE_PROPERTY = "$awsless-route";
declare const ROUTE_HEADER = "x-awsless-route";
declare const LIVE_BUNDLE_ALIAS = "live";
declare const getBundleName: () => string;
declare const formatRouteKey: (stackName: string, resourceType: string, resourceName: string) => string;
declare const formatRoutePayload: (routeKey: string, event: unknown) => {
  "$awsless-route": string;
  event: unknown;
};
declare const captureInvokedQualifier: (context: {
  invokedFunctionArn?: string;
}) => void;
declare const getInvokedQualifier: () => string | undefined;
type InvokeBundleProps = Omit<InvokeOptions, 'name' | 'payload'> & {
  routeKey: string;
  payload?: unknown;
};
declare const invokeBundle: ({ routeKey, payload, ...options }: InvokeBundleProps) => Promise<unknown>;
type InternalInvoke = (routeKey: string, payload: unknown) => Promise<unknown>;
declare const isInsideBundle: () => boolean;
declare const getCurrentRoute: () => string | undefined;
declare const withBundleRouteContext: <T>(routeKey: string, internalInvoke: InternalInvoke, callback: () => T) => T;
declare const internalInvoke: (routeKey: string, payload: unknown) => Promise<unknown>;
declare const setBundleRoutes: (routes: string[]) => void;
declare const hasBundleRoute: (routeKey: string) => boolean;
declare const getStandaloneFunctionName: (routeKey: string) => string;
declare const formatRouteEnvName: (routeKey: string, name: string) => string;
declare const getRouteEnv: (name: string) => string | undefined;
//#endregion
//#region src/lib/server/cache.d.ts
declare const getCacheProps: (name: string, stack?: string) => {
  readonly host: string;
  readonly port: number;
};
interface CacheResources {}
declare const Cache: CacheResources;
//#endregion
//#region src/lib/server/config.d.ts
declare const getConfigName: (name: string) => string;
declare const getConfigValue: (name: string) => string;
declare const setConfigValue: (name: string, value: string) => void;
interface ConfigResources {}
declare const Config: ConfigResources;
//#endregion
//#region src/lib/server/cron.d.ts
declare const getCronName: <N extends string, S extends string = string>(resourceName: N, stackName?: S) => `${string}--${S}--cron--${N}`;
interface CronResources {}
declare const Cron: CronResources;
//#endregion
//#region src/lib/server/email.d.ts
type SendEmailProps = {
  /** The verified sender address. */
  from: string;
  /** The recipient addresses. */
  to: string[];
  /** The subject line. */
  subject: string;
  /** The html body. */
  html: string;
};
declare const Email: {
  send(props: SendEmailProps): Promise<void>;
};
//#endregion
//#region src/lib/server/function.d.ts
declare const getFunctionName: <N extends string, S extends string = string>(resourceName: N, stackName?: S) => `${string}--${S}--function--${N}`;
interface FunctionResources {}
declare const Fn: FunctionResources;
//#endregion
//#region src/lib/server/instance.d.ts
declare const getInstanceQueueName: <N extends string, S extends string = string>(resourceName: N, stackName?: S) => `${string}--${S}--instance--${N}`;
declare const getInstanceQueueUrl: (name: string, stack?: string) => string | undefined;
interface InstanceResources {}
declare const Instance: InstanceResources;
//#endregion
//#region src/lib/server/job.d.ts
declare const getJobName: <N extends string, S extends string = string>(resourceName: N, stackName?: S) => `${string}--${S}--job--${N}`;
interface JobResources {}
declare const Job: JobResources;
//#endregion
//#region src/lib/server/metric.d.ts
declare const getMetricName: (name: string) => string;
declare const getMetricNamespace: (stack?: string, app?: string) => string;
interface MetricResources {}
declare const Metric: MetricResources;
//#endregion
//#region src/lib/server/on-failure.d.ts
declare const onFailureBucketName: string;
declare const onFailureQueueName: string;
declare const onFailureBucketArn: string;
declare const onFailureQueueArn: string;
//#endregion
//#region src/lib/server/pubsub.d.ts
declare const getPubSubPublisherName: <N extends string>(resourceName: N) => `${string}--pubsub-publisher--${N}`;
interface PubSubResources {}
declare const PubSub: PubSubResources;
//#endregion
//#region src/lib/server/queue.d.ts
declare const getQueueName: (name: string, stack?: string) => string;
declare const getQueueUrl: (name: string, stack?: string) => string | undefined;
interface QueueResources {}
declare const Queue: QueueResources;
//#endregion
//#region src/lib/server/search.d.ts
declare const getSearchProps: (name: string, stack?: string) => {
  readonly domain: string | undefined;
  readonly name: string;
};
interface SearchResources {}
declare const Search: SearchResources;
//#endregion
//#region src/lib/server/seed.d.ts
declare const seed: {
  uuid(name: string): UUID;
};
//#endregion
//#region src/lib/server/store.d.ts
interface StoreResources {}
declare const Store: StoreResources;
//#endregion
//#region src/lib/server/table.d.ts
declare const getTableName: <N extends string, S extends string = string>(resourceName: N, stackName?: S) => `${string}--${S}--table--${N}`;
type TableKeys = {
  hash: string;
  sort?: string;
  indexes?: Record<string, {
    hash: string | string[];
    sort?: string | string[];
  }>;
};
declare const getTableProps: (name: string, stack?: string) => {
  readonly name: `${string}--${string}--table--${string}`;
  readonly keys: TableKeys | undefined;
};
interface TableResources {}
declare const Table: TableResources;
//#endregion
//#region src/lib/server/task.d.ts
declare const getTaskName: <N extends string, S extends string = string>(resourceName: N, stackName?: S) => `${string}--${S}--task--${N}`;
interface TaskResources {}
declare const Task: TaskResources;
//#endregion
//#region src/lib/server/topic.d.ts
declare const getTopicName: <N extends string>(resourceName: N) => `${string}--topic--${N}`;
type PublishTopicOptions = Omit<PublishOptions, 'topic' | 'payload'>;
type TopicDefinition<S extends GenericSchema = GenericSchema> = {
  (payload: InferInput<S>, options?: PublishTopicOptions): Promise<void>;
  readonly name: string;
  readonly schema: S;
};
interface TopicResources {}
declare const Topic: TopicResources;
//#endregion
//#region src/lib/server/util.d.ts
declare const APP: string;
declare const getStack: () => string;
//#endregion
export { APP, Alert, AlertResources, Auth, AuthResources, Cache, CacheResources, Config, ConfigResources, Cron, CronResources, Email, Fn, FunctionResources, Instance, InstanceResources, InternalInvoke, Job, JobResources, LIVE_BUNDLE_ALIAS, Metric, MetricResources, PubSub, PubSubResources, Queue, QueueResources, ROUTE_HEADER, ROUTE_PROPERTY, Search, SearchResources, SendEmailProps, Store, StoreResources, Table, TableResources, Task, TaskResources, TestManifest, TestMock, Topic, TopicDefinition, TopicResources, captureInvokedQualifier, formatRouteEnvName, formatRouteKey, formatRoutePayload, getAlertName, getAuthProps, getBundleName, getCacheProps, getConfigName, getConfigValue, getCronName, getCurrentRoute, getFunctionName, getInstanceQueueName, getInstanceQueueUrl, getInvokedQualifier, getJobName, getMetricName, getMetricNamespace, getPubSubPublisherName, getQueueName, getQueueUrl, getRouteEnv, getSearchProps, getStack, getStandaloneFunctionName, getTableName, getTableProps, getTaskName, getTopicName, index_d_exports as h, hasBundleRoute, internalInvoke, invokeBundle, isInsideBundle, mock, mockBaselines, mockState, onFailureBucketArn, onFailureBucketName, onFailureQueueArn, onFailureQueueName, s, seed, setBundleRoutes, setConfigValue, setupTestEnv, t, testRegistry, v, withBundleRouteContext };