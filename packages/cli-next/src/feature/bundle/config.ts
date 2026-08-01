import { kebabCase } from 'change-case'

export const getBundleName = () => `${kebabCase(process.env.APP!)}--function--bundle`

export const LIVE_BUNDLE_ALIAS = 'live'
