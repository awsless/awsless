import { get } from 'get-wild'
import { State } from '../meta'
import { compareState } from './state'

export const requiresReplacement = (priorState: State, proposedState: State, replaceOnChanges: string[]) => {
	for (const path of replaceOnChanges) {
		const priorValue = get(priorState, path)
		const proposedValue = get(proposedState, path)

		if (path.includes('*') && Array.isArray(priorValue)) {
			for (let i = 0; i < priorValue.length; i++) {
				if (!compareState(priorValue[i], proposedValue[i])) {
					return true
				}
			}
		}

		if (!compareState(priorValue, proposedValue)) {
			return true
		}
	}

	return false
}
