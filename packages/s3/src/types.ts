import type { Readable } from 'stream'
import type { SdkStream } from '@aws-sdk/types'

export type Body = string | Readable | ReadableStream | Blob | Uint8Array | Buffer | undefined
export type BodyStream = SdkStream<Readable | Blob | ReadableStream<any> | undefined>
