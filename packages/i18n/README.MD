# AI-generated internationalization made easy

The `@awsless/i18n` package is a Vite plugin that automatically translates your text in build time using AI or any other tool you prefer. The plugin will inline the translations so you don't have to worry about loading the translations at the right time.

## Features

- Automatic text translation
- Inlines translations
- Extremely lightweight (373 bytes uncompressed 🔥)
- Svelte support

## Setup

Install with (NPM):

```
npm i @awsless/i18n
```

## Vite installation

```ts
import { i18n, chatgpt } from '@awsless/i18n'

export defineConfig({
  plugins: [
    i18n({
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

The plugin will find all instances where you want text to be translated.
The text is translated automatically during build time to produce
a bundled output something like this:

```ts
import { t } from '@awsless/i18n/svelte'

const count = 1

$t.get({
  en: `${count} count`,
  es: `${count} contar`,
  jp: `${count} カウント`,
})
```

To change the locale that is being rendered simply call the `locale.set` function.

```ts
import { locale } from '@awsless/i18n/svelte'

locale.set('jp')
```

## Changing the AI-generated text

A `i18n.json` file with all the translations will be generated in the root of your project the first time you run a build. We use this file as a cache to not translate any text that has already been translated before.

If you don't like the auto-generated translations by AI, you can safely change any of the ai generated translations here.

```json
{
  "${count} count": {
    "es": "${count} contar",
    "jp": "${count} カウント"
  }
}
```
