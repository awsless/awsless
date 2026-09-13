import { Handler } from '@awsless/lambda';
/** The origin request an image handler receives. */
export type ImageEvent = {
    /** The path of the requested source image, without the preset & extension suffix. */
    path: string;
};
/** What an image handler returns: the source image as raw bytes or a base64 encoded string, or undefined for a 404. */
export type ImageResponse = Buffer | ArrayBuffer | Uint8Array | string | undefined;
type ImageHandler = (event: ImageEvent, context: Parameters<Handler>[1]) => ImageResponse | Promise<ImageResponse>;
export declare const image: <H extends ImageHandler>(handle: H) => (event: {
    path: string;
}, context?: import("@awsless/lambda").LambdaContext) => Promise<string | undefined>;
export declare const icon: typeof image;
export {};
