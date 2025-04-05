import { Input, OptionalInput, Output, ResourceClass, DataSource } from './base.ts'

type ArchiveFileProps = {

	/** Boolean flag indicating whether symbolically linked directories should be excluded during the creation of the archive. Defaults to `false`. */
	exclude_symlink_directories?: OptionalInput<boolean>

	/** Specify files/directories to ignore when reading the `source_dir`. Supports glob file matching patterns including doublestar/globstar (`**`) patterns. */
	excludes?: OptionalInput<Array<Input<string>>>

	/** String that specifies the octal file mode for all archived files. For example: `"0666"`. Setting this will ensure that cross platform usage of this module will not vary the modes of archived files (and ultimately checksums) resulting in more deterministic behavior. */
	output_file_mode?: OptionalInput<string>

	/** The output of the archive file. */
	output_path: Input<string>

	/** Add only this content to the archive with `source_content_filename` as the filename. One and only one of `source`, `source_content_filename` (with `source_content`), `source_file`, or `source_dir` must be specified. */
	source_content?: OptionalInput<string>

	/** Set this as the filename when using `source_content`. One and only one of `source`, `source_content_filename` (with `source_content`), `source_file`, or `source_dir` must be specified. */
	source_content_filename?: OptionalInput<string>

	/** Package entire contents of this directory into the archive. One and only one of `source`, `source_content_filename` (with `source_content`), `source_file`, or `source_dir` must be specified. */
	source_dir?: OptionalInput<string>

	/** Package this file into the archive. One and only one of `source`, `source_content_filename` (with `source_content`), `source_file`, or `source_dir` must be specified. */
	source_file?: OptionalInput<string>

	/** The type of archive to generate. NOTE: `zip` and `tar.gz` is supported. */
	type: Input<string>
	source?: OptionalInput<Array<Input<{

		/** Add this content to the archive with `filename` as the filename. */
		content: Input<string>

		/** Set this as the filename when declaring a `source`. */
		filename: Input<string>
	}>>>
}

type ArchiveFile = Readonly<{

	/** Boolean flag indicating whether symbolically linked directories should be excluded during the creation of the archive. Defaults to `false`. */
	exclude_symlink_directories: Output<boolean | undefined>

	/** Specify files/directories to ignore when reading the `source_dir`. Supports glob file matching patterns including doublestar/globstar (`**`) patterns. */
	excludes: ReadonlyArray<string>

	/** The sha1 checksum hash of the output. */
	id: Output<string>

	/** Base64 Encoded SHA256 checksum of output file */
	output_base64sha256: Output<string>

	/** Base64 Encoded SHA512 checksum of output file */
	output_base64sha512: Output<string>

	/** String that specifies the octal file mode for all archived files. For example: `"0666"`. Setting this will ensure that cross platform usage of this module will not vary the modes of archived files (and ultimately checksums) resulting in more deterministic behavior. */
	output_file_mode: Output<string | undefined>

	/** MD5 of output file */
	output_md5: Output<string>

	/** The output of the archive file. */
	output_path: Output<string>

	/** SHA1 checksum of output file */
	output_sha: Output<string>

	/** SHA256 checksum of output file */
	output_sha256: Output<string>

	/** SHA512 checksum of output file */
	output_sha512: Output<string>

	/** The byte size of the output archive file. */
	output_size: Output<number>

	/** Add only this content to the archive with `source_content_filename` as the filename. One and only one of `source`, `source_content_filename` (with `source_content`), `source_file`, or `source_dir` must be specified. */
	source_content: Output<string | undefined>

	/** Set this as the filename when using `source_content`. One and only one of `source`, `source_content_filename` (with `source_content`), `source_file`, or `source_dir` must be specified. */
	source_content_filename: Output<string | undefined>

	/** Package entire contents of this directory into the archive. One and only one of `source`, `source_content_filename` (with `source_content`), `source_file`, or `source_dir` must be specified. */
	source_dir: Output<string | undefined>

	/** Package this file into the archive. One and only one of `source`, `source_content_filename` (with `source_content`), `source_file`, or `source_dir` must be specified. */
	source_file: Output<string | undefined>

	/** The type of archive to generate. NOTE: `zip` and `tar.gz` is supported. */
	type: Output<string>
	source: ReadonlyArray<Readonly<{

		/** Add this content to the archive with `filename` as the filename. */
		content: string

		/** Set this as the filename when declaring a `source`. */
		filename: string
	}>>
}>

type ArchiveFileProps = {

	/** Boolean flag indicating whether symbolically linked directories should be excluded during the creation of the archive. Defaults to `false`. */
	exclude_symlink_directories?: OptionalInput<boolean>

	/** Specify files/directories to ignore when reading the `source_dir`. Supports glob file matching patterns including doublestar/globstar (`**`) patterns. */
	excludes?: OptionalInput<Array<Input<string>>>

	/** String that specifies the octal file mode for all archived files. For example: `"0666"`. Setting this will ensure that cross platform usage of this module will not vary the modes of archived files (and ultimately checksums) resulting in more deterministic behavior. */
	output_file_mode?: OptionalInput<string>

	/** The output of the archive file. */
	output_path: Input<string>

	/** Add only this content to the archive with `source_content_filename` as the filename. One and only one of `source`, `source_content_filename` (with `source_content`), `source_file`, or `source_dir` must be specified. */
	source_content?: OptionalInput<string>

	/** Set this as the filename when using `source_content`. One and only one of `source`, `source_content_filename` (with `source_content`), `source_file`, or `source_dir` must be specified. */
	source_content_filename?: OptionalInput<string>

	/** Package entire contents of this directory into the archive. One and only one of `source`, `source_content_filename` (with `source_content`), `source_file`, or `source_dir` must be specified. */
	source_dir?: OptionalInput<string>

	/** Package this file into the archive. One and only one of `source`, `source_content_filename` (with `source_content`), `source_file`, or `source_dir` must be specified. */
	source_file?: OptionalInput<string>

	/** The type of archive to generate. NOTE: `zip` and `tar.gz` is supported. */
	type: Input<string>
	source?: OptionalInput<Array<Input<{

		/** Add this content to the archive with `filename` as the filename. */
		content: Input<string>

		/** Set this as the filename when declaring a `source`. */
		filename: Input<string>
	}>>>
}

type ArchiveFile = Readonly<{

	/** Boolean flag indicating whether symbolically linked directories should be excluded during the creation of the archive. Defaults to `false`. */
	exclude_symlink_directories: Output<boolean | undefined>

	/** Specify files/directories to ignore when reading the `source_dir`. Supports glob file matching patterns including doublestar/globstar (`**`) patterns. */
	excludes: ReadonlyArray<string>

	/** The sha1 checksum hash of the output. */
	id: Output<string>

	/** Base64 Encoded SHA256 checksum of output file */
	output_base64sha256: Output<string>

	/** Base64 Encoded SHA512 checksum of output file */
	output_base64sha512: Output<string>

	/** String that specifies the octal file mode for all archived files. For example: `"0666"`. Setting this will ensure that cross platform usage of this module will not vary the modes of archived files (and ultimately checksums) resulting in more deterministic behavior. */
	output_file_mode: Output<string | undefined>

	/** MD5 of output file */
	output_md5: Output<string>

	/** The output of the archive file. */
	output_path: Output<string>

	/** SHA1 checksum of output file */
	output_sha: Output<string>

	/** SHA256 checksum of output file */
	output_sha256: Output<string>

	/** SHA512 checksum of output file */
	output_sha512: Output<string>

	/** The byte size of the output archive file. */
	output_size: Output<number>

	/** Add only this content to the archive with `source_content_filename` as the filename. One and only one of `source`, `source_content_filename` (with `source_content`), `source_file`, or `source_dir` must be specified. */
	source_content: Output<string | undefined>

	/** Set this as the filename when using `source_content`. One and only one of `source`, `source_content_filename` (with `source_content`), `source_file`, or `source_dir` must be specified. */
	source_content_filename: Output<string | undefined>

	/** Package entire contents of this directory into the archive. One and only one of `source`, `source_content_filename` (with `source_content`), `source_file`, or `source_dir` must be specified. */
	source_dir: Output<string | undefined>

	/** Package this file into the archive. One and only one of `source`, `source_content_filename` (with `source_content`), `source_file`, or `source_dir` must be specified. */
	source_file: Output<string | undefined>

	/** The type of archive to generate. NOTE: `zip` and `tar.gz` is supported. */
	type: Output<string>
	source: ReadonlyArray<Readonly<{

		/** Add this content to the archive with `filename` as the filename. */
		content: string

		/** Set this as the filename when declaring a `source`. */
		filename: string
	}>>
}>

declare global {
	interface TerraformResources {
		archive: {
			File: ResourceClass<ArchiveFileProps, ArchiveFile, "archive_file">
		}
	}
}


declare global {
	interface TerraformProviders {
		archive: {

		}	}
}
