# AI generated internationalization made easy

The @awsless/i18n package is a vite plugin that automaticly translates your text in build time using AI or any other tool you prefer. The plugin will inline the translations for you so you don't have to worry about loading the translations at the right time.

## Features

- Automatic text translation
- Inline transactions
- Super lightweight
- Svelte support

_A simple wrapper can be made for any framework._

## Setup

Install with (NPM):

```
npm i @awsless/i18n
```

## Vite installation

```ts
import { I18nPlugin, chatgpt } from '@awsless/i18n'

export defineConfig({
  plugins: [
    i18nVitePlugin({
      default: 'en',
      locales: ['es', 'jp'],
      translate: chatgpt({
      	apiKey: '...',
      })
    })
  ]
})
```

## Svelte example

```ts
import { t } from '@awsless/i18n/svelte'

const count = 1

$t`${count} count`
```

The plugin will find all instances where you want text to be translated. And during build time will translate all text that needs to be translated automaticly.
The bundled output will look something like this:

```ts
import { t } from '@awsless/i18n/svelte'

const count = 1

$t.get({
  en: `${count} count`,
  es: `${count} contar`,
  jp: `${count} カウント`,
})
```

To change the locale that is being rendered simply call the `setLocale` function.

```ts
import { locale } from '@awsless/i18n/svelte'

locale.set('jp')
```

## Changing the AI generated text

A `i18n.json` file with all the translations will be generated in the root of your project the first time you run a build. We use this file as a cache to not translate any text that has already been translated before.

If you don't like the auto generated transactions by AI, you can safely change any of the ai generated transactions here.

```json
{
  "${count} count": {
  	"es": "${count} contar",
  	"jp": "${count} カウント"
  }
}
```
