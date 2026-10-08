import { ExpectedError } from '../../error.js'
import { renderPage } from './page.js'

// The id of a route table in maintenance starts with this marker. The viewer
// function reads the table id from the live pointer on every request anyway,
// so maintenance starts & ends in the same instant as the rest of a deploy.
export const MAINTENANCE_TABLE_PREFIX = 'm'

// The page travels inside the route table, so it is there exactly as long as the table is live.
export const MAINTENANCE_KEY = '$maintenance'

// The route store caps a value at 1KB.
const MAX_VALUE_SIZE = 1000

export const MAINTENANCE_PAGE = renderPage({
	title: 'Maintenance',
	icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
	heading: 'Down for maintenance',
	text: "We're making some improvements and will be back shortly.",
})

// The page as route table rows, which the viewer function glues back together.
export const createMaintenanceEntries = (router: string) => {
	const chunks = MAINTENANCE_PAGE.match(/[\s\S]{1,900}/g) ?? []

	return chunks.map((value, index) => {
		if (Buffer.byteLength(value, 'utf8') > MAX_VALUE_SIZE) {
			throw new ExpectedError('The maintenance page has a part that is too large for the route store.')
		}

		return { key: `${router}:${MAINTENANCE_KEY}#${index}`, value }
	})
}
