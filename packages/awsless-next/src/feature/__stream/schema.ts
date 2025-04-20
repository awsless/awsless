import { z } from 'zod'
import { ResourceIdSchema } from '../../config/schema/resource-id.js'

const LatencyModeSchema = z.enum(['low', 'normal']).describe(
	`Channel latency mode. Valid values:
- normal: Use "normal" to broadcast and deliver live video up to Full HD.
- low: Use "low" for near real-time interactions with viewers.`
)

// const PresetSchema = z.enum(['higher', 'constrained']).describe(
// 	`An optional transcode preset for the channel.
// This is selectable only for ADVANCED_HD and ADVANCED_SD channel types.
// For those channel types, the default preset is HIGHER_BANDWIDTH_DELIVERY.
// For other channel types (BASIC and STANDARD), preset is the empty string ("").`
// )

const TypeSchema = z.enum(['standard', 'basic', 'advanced-sd', 'advanced-hd'])
	.describe(`The channel type, which determines the allowable resolution and bitrate.
If you exceed the allowable resolution or bitrate, the stream probably will disconnect immediately. Valid values:
- standard: Video is transcoded: multiple qualities are generated from the original input to automatically give viewers the best experience for their devices and network conditions. Transcoding allows higher playback quality across a range of download speeds. Resolution can be up to 1080p and bitrate can be up to 8.5 Mbps. Audio is transcoded only for renditions 360p and below; above that, audio is passed through.
- basic: Video is transmuxed: Amazon IVS delivers the original input to viewers. The viewer's video-quality choice is limited to the original input. Resolution can be up to 1080p and bitrate can be up to 1.5 Mbps for 480p and up to 3.5 Mbps for resolutions between 480p and 1080p.
- advanced-sd: Video is transcoded; multiple qualities are generated from the original input, to automatically give viewers the best experience for their devices and network conditions. Input resolution can be up to 1080p and bitrate can be up to 8.5 Mbps; output is capped at SD quality (480p). You can select an optional transcode preset (see below). Audio for all renditions is transcoded, and an audio-only rendition is available.
- advanced-hd: Video is transcoded; multiple qualities are generated from the original input, to automatically give viewers the best experience for their devices and network conditions. Input resolution can be up to 1080p and bitrate can be up to 8.5 Mbps; output is capped at HD quality (720p). You can select an optional transcode preset (see below). Audio for all renditions is transcoded, and an audio-only rendition is available.
`)

export const StreamsSchema = z
	.record(
		ResourceIdSchema,
		z.object({
			type: TypeSchema.default('standard'),
			// preset: PresetSchema.optional(),
			latencyMode: LatencyModeSchema.default('low'),
		})
	)
	.optional()
	.describe('Define the streams in your stack.')
