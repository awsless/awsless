import { CopyObjectCommand, DeleteObjectCommand, GetObjectCommand, HeadObjectCommand, NoSuchKey, NotFound, PutObjectCommand, S3Client, S3Client as S3Client$1, StorageClass } from "@aws-sdk/client-s3";
import { globalClient, nextTick } from "@awsless/utils";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { toSeconds } from "@awsless/duration";
import { toBytes } from "@awsless/size";
import { Readable } from "stream";
import { sdkStreamMixin } from "@smithy/util-stream";
import { mockClient } from "aws-sdk-client-mock";
import { createHash } from "crypto";
//#region src/client.ts
const s3Client = globalClient(() => {
	return new S3Client$1({});
});
//#endregion
//#region src/commands.ts
const putObject = async ({ client = s3Client(), bucket, key, body, metadata, contentType, cacheControl, storageClass = "STANDARD" }) => {
	const command = new PutObjectCommand({
		Bucket: bucket,
		Key: key,
		Body: body,
		Metadata: metadata,
		StorageClass: storageClass,
		ChecksumAlgorithm: "SHA1",
		ContentType: contentType,
		CacheControl: cacheControl
	});
	return { sha1: (await client.send(command)).ChecksumSHA1 };
};
const getObject = async ({ client = s3Client(), bucket, key, versionId }) => {
	const command = new GetObjectCommand({
		Bucket: bucket,
		Key: key,
		VersionId: versionId
	});
	let result;
	try {
		result = await client.send(command);
	} catch (error) {
		if (error instanceof NoSuchKey) return;
		throw error;
	}
	if (!result || !result.Body) return;
	return {
		metadata: result.Metadata ?? {},
		sha1: result.ChecksumSHA1,
		body: result.Body
	};
};
const headObject = async ({ client = s3Client(), bucket, key, versionId }) => {
	const command = new HeadObjectCommand({
		Bucket: bucket,
		Key: key,
		VersionId: versionId
	});
	let result;
	try {
		result = await client.send(command);
	} catch (error) {
		if (error instanceof NotFound || error instanceof NoSuchKey) return;
		throw error;
	}
	if (!result) return;
	return {
		metadata: result.Metadata ?? {},
		sha1: result.ChecksumSHA1
	};
};
const deleteObject = async ({ client = s3Client(), bucket, key }) => {
	const command = new DeleteObjectCommand({
		Bucket: bucket,
		Key: key
	});
	await client.send(command);
};
const copyObject = async ({ client = s3Client(), source, destination }) => {
	if (source.versionId) source.key = `${source.key}?versionId=${source.versionId}`;
	const command = new CopyObjectCommand({
		Bucket: destination.bucket,
		CopySource: `/${source.bucket}/${source.key}`,
		Key: destination.key
	});
	await client.send(command);
};
let signedUploadUrlMock;
const setSignedUploadUrlMock = (m) => {
	signedUploadUrlMock = m;
};
const createSignedUploadUrl = async ({ client = s3Client(), bucket, key, fields, expires, contentLengthRange }) => {
	if (signedUploadUrlMock) return signedUploadUrlMock;
	return await createPresignedPost(client, {
		Bucket: bucket,
		Key: key,
		Fields: fields,
		Expires: expires ? toSeconds(expires) : void 0,
		Conditions: contentLengthRange ? [[
			"content-length-range",
			toBytes(contentLengthRange[0]),
			toBytes(contentLengthRange[1])
		]] : void 0
	});
};
let signedDownloadUrlMock;
const setSignedDownloadUrlMock = (url) => {
	signedDownloadUrlMock = url;
};
const createSignedDownloadUrl = async ({ client = s3Client(), bucket, key, versionId, expires }) => {
	if (signedDownloadUrlMock) return signedDownloadUrlMock;
	const command = new GetObjectCommand({
		Bucket: bucket,
		Key: key,
		VersionId: versionId
	});
	return await getSignedUrl(client, command, { expiresIn: expires ? toSeconds(expires) : void 0 });
};
//#endregion
//#region src/hash.ts
const hashSHA1 = async (data) => {
	if (!data) return "";
	if (typeof data === "string") data = Buffer.from(data);
	if (data instanceof Blob) {
		const arrayBuffer = await data.arrayBuffer();
		data = Buffer.from(arrayBuffer);
	}
	if (data instanceof Readable) return "";
	if (data instanceof ReadableStream) return "";
	return createHash("sha1").update(data).digest("hex");
};
//#endregion
//#region src/mock.ts
var MemoryStore = class {
	store = {};
	bucket(name) {
		if (!this.store[name]) this.store[name] = {};
		return this.store[name];
	}
	get(bucket, key) {
		return this.bucket(bucket)[key];
	}
	put(bucket, key, object) {
		this.bucket(bucket)[key] = object;
		return this;
	}
	del(bucket, key) {
		delete this.bucket(bucket)[key];
		return this;
	}
};
const mockS3 = () => {
	const fn = vi.fn();
	const store = new MemoryStore();
	const s3ClientMock = mockClient(S3Client$1);
	s3ClientMock.on(PutObjectCommand).callsFake(async (input) => {
		await nextTick(fn);
		const sha1 = await hashSHA1(input.Body);
		store.put(input.Bucket, input.Key, {
			body: input.Body,
			sha1,
			meta: input.Metadata ?? {}
		});
		return { ChecksumSHA1: sha1 };
	});
	s3ClientMock.on(GetObjectCommand).callsFake(async (input) => {
		await nextTick(fn);
		const data = store.get(input.Bucket, input.Key);
		if (data) {
			const stream = new Readable();
			stream.push(data.body);
			stream.push(null);
			return {
				Metadata: data.meta,
				ChecksumSHA1: data.sha1,
				Body: sdkStreamMixin(stream)
			};
		}
		throw new NoSuchKey({
			$metadata: {},
			message: "No such key"
		});
	});
	s3ClientMock.on(HeadObjectCommand).callsFake(async (input) => {
		await nextTick(fn);
		const data = store.get(input.Bucket, input.Key);
		if (data) return {
			Metadata: data.meta,
			ChecksumSHA1: data.sha1
		};
		throw new NotFound({
			$metadata: {},
			message: "Not found"
		});
	});
	s3ClientMock.on(CopyObjectCommand).callsFake(async (input) => {
		await nextTick(fn);
		const [_, SourceBucket, ...Path] = input.CopySource.split("/");
		const SourceKey = Path.join("/");
		const data = store.get(SourceBucket, SourceKey);
		if (data) store.put(input.Bucket, input.Key, data);
	});
	s3ClientMock.on(DeleteObjectCommand).callsFake(async (input) => {
		await nextTick(fn);
		store.del(input.Bucket, input.Key);
		return {};
	});
	setSignedDownloadUrlMock("http://s3-download-url.com");
	setSignedUploadUrlMock({
		url: "http://s3-upload-url.com",
		fields: {}
	});
	beforeEach(() => {
		fn.mockClear();
	});
	return fn;
};
//#endregion
export { S3Client, StorageClass, copyObject, createSignedDownloadUrl, createSignedUploadUrl, deleteObject, getObject, headObject, mockS3, putObject, s3Client };
