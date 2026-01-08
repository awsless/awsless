# AI-generated internationalization made easy

The `@awsless/i18n` package is a Vite plugin that automatically translates your text during build time using AI or any other tool you prefer. The plugin will inline the translations so you don't have to worry about loading the translations at the right time. This means, switching the locale will instantly switch all your translated text on the page.

## Features

- Automatic text translation
- Inlines translations
- Extremely lightweight (431 bytes uncompressed 🔥)
- Instant locale switch
- Svelte 5 support

## Setup

Install with (NPM):

```
npm i @awsless/i18n
```

## Vite installation

```ts
import { i18n, ai } from '@awsless/i18n'
import { openai } from '@ai-sdk/openai'

export defineConfig({
  plugins: [
    i18n({
      default: 'en',
      locales: ['es', 'jp'],
      translate: ai({
		maxTokens: 32_000,
		model: openai('gpt-4.1'),
      })
    })
  ]
})
```

## Svelte example

```ts
import { lang } from '@awsless/i18n/svelte'

const count = 1

lang.t`${count} count`
```

The plugin will find all instances where you want text to be translated.
The text is translated automatically during build time to produce
a bundled output something like this:

```ts
import { lang } from '@awsless/i18n/svelte'

const count = 1

lang.t.get(lang.s`${count} count`, {
	es: lang.s`${count} contar`,
	jp: lang.s`${count} カウント`,
})
```

To change the locale that is being rendered simply change the `lang.locale` property.

```ts
import { lang } from '@awsless/i18n/svelte'

lang.locale = 'jp'
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
