import { Input } from '../../../core/output'

// export type Code =
// 	| {
// 			bucket: Input<string>
// 			key: Input<string>
// 			version?: Input<string | undefined>
// 	  }
// 	| {
// 			imageUri: Input<string>
// 			imageHash: Input<Asset>
// 	  }
// 	| {
// 			zipFile: Input<string>
// 	  }

export type S3Code = {
	bucket: Input<string>
	key: Input<string>
	version?: Input<string | undefined>
}

export type Code =
	| S3Code
	| {
			imageUri: Input<string>
	  }
	| {
			zipFile: Input<string>
	  }

export const formatCode = (code: Code) => {
	if ('bucket' in code) {
		return {
			S3Bucket: code.bucket,
			S3Key: code.key,
			S3ObjectVersion: code.version,
		}
	}

	if ('imageUri' in code) {
		return {
			ImageUri: code.imageUri,
		}
	}

	return {
		ZipFile: code.zipFile,
	}
}
