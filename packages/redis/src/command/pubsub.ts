import { InputValue, RedisClient } from '../type'
import { command, returnInt } from './util'

/**
 * Publish a message to a channel.
 *
 * Returns the number of subscribers that received the message. In cluster
 * mode only subscribers connected to the serving node are counted, so a
 * zero reply doesn't mean the message went unseen.
 *
 * Sharded publishing (SPUBLISH) routes the message by channel slot instead
 * of broadcasting to every cluster node, and is only received by sharded
 * subscribers (SSUBSCRIBE).
 *
 * @command PUBLISH | SPUBLISH
 * @complexity O(N+M) where N is the number of channel subscribers and M the number of subscribed patterns
 * @speed fast
 * @since 2.0.0
 */
export const publish = (
	client: RedisClient,
	channel: string,
	message: InputValue,
	options: { sharded?: boolean } = {}
) => {
	return command<number, string>(client, options.sharded ? 'SPUBLISH' : 'PUBLISH', [channel, message], returnInt)
}
