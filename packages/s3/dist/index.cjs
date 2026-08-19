Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
let _aws_sdk_client_s3 = require("@aws-sdk/client-s3");
let _awsless_utils = require("@awsless/utils");
let _aws_sdk_s3_presigned_post = require("@aws-sdk/s3-presigned-post");
let _aws_sdk_s3_request_presigner = require("@aws-sdk/s3-request-presigner");
let _awsless_duration = require("@awsless/duration");
let _awsless_size = require("@awsless/size");
let stream = require("stream");
let _smithy_util_stream = require("@smithy/util-stream");
let aws_sdk_client_mock = require("aws-sdk-client-mock");
let crypto = require("crypto");
//#region src/client.ts
const s3Client = (0, _awsless_utils.globalClient)(() => {
	return new _aws_sdk_client_s3.S3Client({});
});
//#endregion
//#region src/commands.ts
const putObject = async ({ client = s3Client(), bucket, key, body, metadata, contentType, cacheControl, storageClass = "STANDARD" }) => {
	const command = new _aws_sdk_client_s3.PutObjectCommand({
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
	const command = new _aws_sdk_client_s3.GetObjectCommand({
		Bucket: bucket,
		Key: key,
		VersionId: versionId
	});
	let result;
	try {
		result = await client.send(command);
	} catch (error) {
		if (error instanceof _aws_sdk_client_s3.NoSuchKey) return;
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
	const command = new _aws_sdk_client_s3.HeadObjectCommand({
		Bucket: bucket,
		Key: key,
		VersionId: versionId
	});
	let result;
	try {
		result = await client.send(command);
	} catch (error) {
		if (error instanceof _aws_sdk_client_s3.NotFound || error instanceof _aws_sdk_client_s3.NoSuchKey) return;
		throw error;
	}
	if (!result) return;
	return {
		metadata: result.Metadata ?? {},
		sha1: result.ChecksumSHA1
	};
};
const deleteObject = async ({ client = s3Client(), bucket, key }) => {
	const command = new _aws_sdk_client_s3.DeleteObjectCommand({
		Bucket: bucket,
		Key: key
	});
	await client.send(command);
};
const copyObject = async ({ client = s3Client(), source, destination }) => {
	if (source.versionId) source.key = `${source.key}?versionId=${source.versionId}`;
	const command = new _aws_sdk_client_s3.CopyObjectCommand({
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
	return await (0, _aws_sdk_s3_presigned_post.createPresignedPost)(client, {
		Bucket: bucket,
		Key: key,
		Fields: fields,
		Expires: expires ? (0, _awsless_duration.toSeconds)(expires) : void 0,
		Conditions: contentLengthRange ? [[
			"content-length-range",
			(0, _awsless_size.toBytes)(contentLengthRange[0]),
			(0, _awsless_size.toBytes)(contentLengthRange[1])
		]] : void 0
	});
};
let signedDownloadUrlMock;
const setSignedDownloadUrlMock = (url) => {
	signedDownloadUrlMock = url;
};
const createSignedDownloadUrl = async ({ client = s3Client(), bucket, key, versionId, expires }) => {
	if (signedDownloadUrlMock) return signedDownloadUrlMock;
	const command = new _aws_sdk_client_s3.GetObjectCommand({
		Bucket: bucket,
		Key: key,
		VersionId: versionId
	});
	return await (0, _aws_sdk_s3_request_presigner.getSignedUrl)(client, command, { expiresIn: expires ? (0, _awsless_duration.toSeconds)(expires) : void 0 });
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
	if (data instanceof stream.Readable) return "";
	if (data instanceof ReadableStream) return "";
	return (0, crypto.createHash)("sha1").update(data).digest("hex");
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
	const s3ClientMock = (0, aws_sdk_client_mock.mockClient)(_aws_sdk_client_s3.S3Client);
	s3ClientMock.on(_aws_sdk_client_s3.PutObjectCommand).callsFake(async (input) => {
		await (0, _awsless_utils.nextTick)(fn);
		const sha1 = await hashSHA1(input.Body);
		store.put(input.Bucket, input.Key, {
			body: input.Body,
			sha1,
			meta: input.Metadata ?? {}
		});
		return { ChecksumSHA1: sha1 };
	});
	s3ClientMock.on(_aws_sdk_client_s3.GetObjectCommand).callsFake(async (input) => {
		await (0, _awsless_utils.nextTick)(fn);
		const data = store.get(input.Bucket, input.Key);
		if (data) {
			const stream$1 = new stream.Readable();
			stream$1.push(data.body);
			stream$1.push(null);
			return {
				Metadata: data.meta,
				ChecksumSHA1: data.sha1,
				Body: (0, _smithy_util_stream.sdkStreamMixin)(stream$1)
			};
		}
		throw new _aws_sdk_client_s3.NoSuchKey({
			$metadata: {},
			message: "No such key"
		});
	});
	s3ClientMock.on(_aws_sdk_client_s3.HeadObjectCommand).callsFake(async (input) => {
		await (0, _awsless_utils.nextTick)(fn);
		const data = store.get(input.Bucket, input.Key);
		if (data) return {
			Metadata: data.meta,
			ChecksumSHA1: data.sha1
		};
		throw new _aws_sdk_client_s3.NotFound({
			$metadata: {},
			message: "Not found"
		});
	});
	s3ClientMock.on(_aws_sdk_client_s3.CopyObjectCommand).callsFake(async (input) => {
		await (0, _awsless_utils.nextTick)(fn);
		const [_, SourceBucket, ...Path] = input.CopySource.split("/");
		const SourceKey = Path.join("/");
		const data = store.get(SourceBucket, SourceKey);
		if (data) store.put(input.Bucket, input.Key, data);
	});
	s3ClientMock.on(_aws_sdk_client_s3.DeleteObjectCommand).callsFake(async (input) => {
		await (0, _awsless_utils.nextTick)(fn);
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
Object.defineProperty(exports, "S3Client", {
	enumerable: true,
	get: function() {
		return _aws_sdk_client_s3.S3Client;
	}
});
Object.defineProperty(exports, "StorageClass", {
	enumerable: true,
	get: function() {
		return _aws_sdk_client_s3.StorageClass;
	}
});
exports.copyObject = copyObject;
exports.createSignedDownloadUrl = createSignedDownloadUrl;
exports.createSignedUploadUrl = createSignedUploadUrl;
exports.deleteObject = deleteObject;
exports.getObject = getObject;
exports.headObject = headObject;
exports.mockS3 = mockS3;
exports.putObject = putObject;
exports.s3Client = s3Client;
