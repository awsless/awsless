import { renderPage } from './page.js'

// Reserved router path for the maintenance page.
export const MAINTENANCE_PATH = '/__awsless/maintenance'

// S3 echoes the object metadata as a response header, which lets the
// viewer response function give the page its 503 status.
export const MAINTENANCE_PAGE_METADATA = { 'awsless-maintenance': '1' }
export const MAINTENANCE_PAGE_HEADER = 'x-amz-meta-awsless-maintenance'

export const MAINTENANCE_PAGE = renderPage({
	title: 'Maintenance',
	icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>',
	heading: 'Down for maintenance',
	text: "We're making some improvements and will be back shortly.",
})
