import { kebabCase } from 'change-case'

// Copied from the awsless lib, so the sandbox proxy prebuild stays self-contained.

export const getEventFunctionName = () => `${kebabCase(process.env.APP!)}--bundle--event`

export const LIVE_BUNDLE_ALIAS = 'live'
