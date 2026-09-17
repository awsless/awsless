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

A `i18n.generated.json` file with the auto-generated translations will be created in the root of your project the first time you run a build. We use this file as a cache to not translate any text that has already been translated before.

If you want to overwrite an AI-generated translation, create or edit `i18n.json`. Any translation in `i18n.json` takes precedence over the generated cache during build time. Translations are grouped by the context they were found with, the group with the empty name holds the text without a context.

```json
{
	"": {
		"${count} count": {
			"es": "${count} contar",
			"jp": "${count} カウント"
		}
	},
	"button label": {
		"Save": {
			"es": "Guardar",
			"jp": "保存"
		}
	}
}
```

## Translating markup with `<T>`

Wrap markup in the `T` component to translate a whole sentence at once,
tags and all. The AI sees the sentence with its markup reduced to bare
tags and placeholders, so it gets the full context and may move the tags
and placeholders around when the grammar of the target language needs it.

```svelte
<script>
	import { T } from '@awsless/i18n/svelte'
</script>

<T>Hello <b>{user.name}</b>, you have <a href="/inbox">{count} new messages</a>.</T>
```

The text sent to the AI, and the key used in `i18n.json`, looks like this:

```
Hello <b>{user.name}</b>, you have <a>{count} new messages</a>.
```

During the build the component is rewritten into a small render tree per
locale plus one snippet per tag or placeholder of the original markup. The
attributes, expressions and event handlers stay in your file and are never
sent to the AI. A translation that loses or renames a tag or placeholder is
rejected and translated again on the next build.

A `context` attribute gives the AI a hint about where the text is used.
It is passed along with the text and dropped from the build. The same
text with different contexts is translated separately.

```svelte
<T context="button label">Save</T>
```

A few rules apply inside `<T>`:

- Blocks like `{#if}` and `{#each}` are not supported, branch outside the component instead.
- Nested `<T>` components are not supported.
- The same tag used twice gets a suffix in the translation key, e.g. `<a_1>` and `<a_2>`.
- Attribute text like `placeholder` or `alt` still needs `` lang.t`...` ``.
