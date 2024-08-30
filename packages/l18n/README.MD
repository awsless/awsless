
# Basic usage

### Vite installation

```ts
import { L18nPlugin } from '@awsless/l18n/vite'

export {
	plugins: [
		new L18nPlugin({
			locales: ['es', 'jp']
			chatGpt: {
				apiKey: '...',
			}
		})
	]
}
```

## Svelte example

```ts
import { t } from '@awsless/l18n/svelte'

const count = 1

$t`${count} count`
```

The plugin will find all instances where you want text to be translated. And during build time will translate all text that needs to be translated automaticly.
The bundled output will look something like this:

```ts
import { t } from '@awsless/l18n/svelte'

const count = 1

$t({
	en: `${count} count`,
	es: `${count} contar`,
	jp: `${count} カウント`,
})
```

To change the locale that is being rendered simply call the `setLocale` function.

```ts
import { setLocale } from '@awsless/l18n/svelte'

setLocale('jp')
```

## Changing the AI generated text

A `li8n.json` file with all the translated text will be generated in the root of your project the first time you run a build. We use this file as a cache to not translate any text that already has been translated before. Because we never translate text twice, you can safely change any of the ai generated transactions here, if you don't like the auto generated transactions by AI.
