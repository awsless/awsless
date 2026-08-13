import { kebabCase } from 'change-case'

// Copied from the awsless lib, so the sandbox proxy prebuild stays self-contained.

export const getBundleName = () => `${kebabCase(process.env.APP!)}--function--bundle`

export const LIVE_BUNDLE_ALIAS = 'live'
