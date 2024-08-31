import { get } from 'svelte/store'
import { t } from '../../src/framework/svelte'

export const content = get(t)`Hello ${1} world`
