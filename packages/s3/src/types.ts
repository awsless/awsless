import type { SdkStream } from '@aws-sdk/types'
import type { Readable } from 'stream'

export type Body = string | Readable | ReadableStream | Blob | Uint8Array | Buffer | undefined
export type BodyStream = SdkStream<Readable | Blob | ReadableStream<any> | undefined>
