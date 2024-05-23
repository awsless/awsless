import { APP } from './util.js'
import { join } from 'path'

export const getRealTimeTopic = <T extends string>(name: T) => {
	return join(APP, name)
}

export const RealTime = {
	publish(topic: string, payload: unknown) {
		return publish({
			topic: getRealTimeTopic(topic),
			payload,
		})
	},
}

const ratesEvent = RealTime.topic('players', 'rates', object({

})

RealTime.publish(ratesEvent, {})

RealTime.subscribe(ratesEvent, (rates) => {

})
