# Stream Feature

The Stream feature in Awsless provides a streamlined way to define, configure, and use Amazon Interactive Video Service (IVS) for live streaming. It handles the complex aspects of stream setup including channel configuration, stream keys, and endpoint management.

## Overview

Live streaming is essential for many modern applications. The Stream feature in Awsless makes it easy to:

- Define IVS channels with optimal configurations
- Configure stream types and latency modes
- Generate and manage stream keys
- Access ingest and playback endpoints
- Integrate streaming with your application

## Schema

The Stream feature uses a simple schema to define streaming channels in your stack:

### Basic Usage

The simplest way to define a streaming channel is with default settings:

```json
{
  "streams": {
    "live": {}
  }
}
```

### Advanced Configuration

For more control, you can use the full configuration object:

```json
{
  "streams": {
    "live": {
      "type": "advanced-hd",
      "latencyMode": "low"
    }
  }
}
```

### Schema Properties

| Property | Type | Description | Default |
|----------|------|-------------|---------|
| `type` | String | Channel type determining resolution and bitrate | `standard` |
| `latencyMode` | String | Channel latency mode | `low` |

#### Channel Types

The `type` property can be one of the following values:

- `standard`: Video is transcoded to multiple qualities up to 1080p with bitrate up to 8.5 Mbps
- `basic`: Video is transmuxed (original input delivered to viewers) up to 1080p with bitrate up to 3.5 Mbps
- `advanced-sd`: Video is transcoded to multiple qualities with output capped at SD quality (480p)
- `advanced-hd`: Video is transcoded to multiple qualities with output capped at HD quality (720p)

#### Latency Modes

The `latencyMode` property can be one of the following values:

- `low`: Near real-time interactions with viewers (recommended for interactive streams)
- `normal`: Standard latency for broadcasting live video up to Full HD

## How Streams Work

When you define a stream in Awsless:

1. An IVS channel is created with your specified configuration
2. A stream key is generated for secure ingest
3. The ingest endpoint, stream key, and playback URL are exposed as environment variables
4. Your application can use these values to stream and play content

## Streaming Workflow

The typical workflow for using the Stream feature involves:

1. **Stream Setup**: Configure your streaming software (OBS, Streamlabs, etc.) with the ingest endpoint and stream key
2. **Stream Ingest**: Stream content to the IVS ingest endpoint
3. **Stream Playback**: Use the playback URL to view the stream in your application

### Stream Setup

To set up streaming software like OBS Studio:

1. Open your streaming software
2. Configure the stream settings:
   - Service: Custom
   - Server: Use the `STREAM_STACKNAME_STREAMNAME_INGEST_ENDPOINT` value
   - Stream Key: Use the `STREAM_STACKNAME_STREAMNAME_STREAM_KEY` value
3. Configure your video and audio settings according to your channel type
4. Start streaming

### Stream Playback

To play the stream in your application:

```html
<!-- Using the IVS player -->
<script src="https://player.live-video.net/1.8.0/amazon-ivs-player.min.js"></script>
<video id="video-player" playsinline></video>

<script>
  const player = IVS.create();
  player.attachHTMLVideoElement(document.getElementById('video-player'));
  player.load('PLAYBACK_URL'); // Use the STREAM_STACKNAME_STREAMNAME_ENDPOINT value
  player.play();
</script>
```

## Environment Variables

For each stream, Awsless automatically sets the following environment variables in your Lambda functions:

```
STREAM_STACKNAME_STREAMNAME_ENDPOINT=https://playback-endpoint.live-video.net/channel-id
STREAM_STACKNAME_STREAMNAME_INGEST_ENDPOINT=rtmps://ingest-endpoint.live-video.net:443/app
STREAM_STACKNAME_STREAMNAME_STREAM_KEY=your-stream-key
```

You can use these environment variables in your application code:

```typescript
// Get stream information
const playbackUrl = process.env.STREAM_MYSTACK_LIVE_ENDPOINT;
const ingestEndpoint = process.env.STREAM_MYSTACK_LIVE_INGEST_ENDPOINT;
const streamKey = process.env.STREAM_MYSTACK_LIVE_STREAM_KEY;

// Use the information in your application
function getStreamInfo() {
  return {
    playbackUrl,
    ingestEndpoint,
    streamKey
  };
}
```

## Stream Key Security

Stream keys are sensitive credentials that allow anyone to stream to your channel. To maintain security:

1. **Never expose stream keys publicly**: Don't include them in client-side code or public repositories
2. **Rotate stream keys regularly**: Create a new stream key if you suspect it has been compromised
3. **Use secure methods to distribute stream keys**: Only provide stream keys to authorized streamers

## Monitoring Streams

You can monitor your streams using the AWS Management Console or the IVS API:

- **Stream Health**: Monitor metrics like ingest quality, viewer count, and error rates
- **Stream Status**: Check if a stream is live, idle, or experiencing issues
- **Stream Recording**: Configure automatic recording of streams for later playback

## Best Practices

When using the Stream feature, consider these best practices:

1. **Choose the Right Channel Type**: Select a channel type based on your quality and cost requirements
2. **Use Low Latency for Interactive Streams**: Choose the `low` latency mode for streams with viewer interaction
3. **Optimize Ingest Settings**: Configure your streaming software according to IVS recommendations
4. **Implement Stream Authentication**: Use server-side authentication for sensitive streams
5. **Monitor Stream Health**: Set up monitoring and alerts for stream health metrics
6. **Implement Fallback Content**: Provide fallback content when streams are offline

## Integration with Other Features

The Stream feature integrates seamlessly with other Awsless features:

- **Function**: Lambda functions can manage stream metadata and authentication
- **Site**: Web applications can embed stream players
- **Auth**: Authentication can be used to secure stream access
- **Config**: Configuration values can store stream settings
- **Alert**: Alerts can notify you of stream health issues
