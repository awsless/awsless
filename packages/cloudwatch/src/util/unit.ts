import { StandardUnit } from '@aws-sdk/client-cloudwatch'

export type Unit = 'number' | 'size' | 'duration'

export type DisplayUnit = Unit | 'count' | 'percent'

export const toStandedUnit = (unit: DisplayUnit): StandardUnit => {
	switch (unit) {
		case 'number':
			return 'None'
		case 'count':
			return 'Count'
		case 'size':
			return 'Bytes'
		case 'duration':
			return 'Milliseconds'
		case 'percent':
			return 'Percent'
	}
}
