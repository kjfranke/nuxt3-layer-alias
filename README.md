# Nuxt layer alias

With this module you can:
- Specificly target a layer: ~baseLayer/component/button.vue
- Use a default alias that will fallback checking all layers untill it found a match: ~/component/button.vue (checking project first, than baseLayer)

## Context

At my compony we have a repo per client, but a client can have multiple Nuxt projects, so we put all the Nuxt stuff in subdirectories:

```
./package.json
./src/project-1/[nuxt stuff]
```

Every project extends one or multiple base projects containing modules / components / etc. These have the following structure

```
./package.json
./src/[nuxt stuff]
```

## Layer alias module

The module consists of the following files:

```
~/modules/layer-alias/index.ts
~/modules/layer-alias/type.ts
```

We start of with importing an existsSync function to check if a file does exists, there must be a better 'Nuxt friendly' way of doing this, but haven't found it yet:
```ts
import { existsSync } from 'fs'
```

After that we start a basic/standard Nuxt module.

In the setup function we make a copy of the layers structure (just to prevent messing with the original data)

Then there are 2 arrow functions defined: `customResolver` and `convertObjectAliasToArray` but we skip these for now.

At last we have an nuxt hook hooking into `vite:extendConfig` to override de vite alias configuration:

```ts
nuxt.hook('vite:extendConfig', (viteInlineConfig) => {
  viteInlineConfig.resolve.alias = convertObjectAliasToArray(viteInlineConfig.resolve.alias)
})
```

`viteInlineConfig.resolve.alias` originally has a key (alias) / value (path) pair structure:

```ts
{
  ...
  '~': '/site/src',
  ...
}
```

But vite supports an alternative configuration as an array of objects (which can have an optional customResolver function) like:

```ts
[
  ...
  {
    find: '~',
    replacement: '/site/src',
    customResolver: () => {}
  }
  ...
]
```

So first we need to have a `customResolver` which receives a `source`

```
const customResolver = (source: string) => {
```

It seems that `source` is already resolved relative to the current projects rootDir (CWD) and can contain query parameters to be handeld by transpilers.

For example: `/site/src/assets/css/base/reset.css?vue&type=style&index=3&src=true&lang.css`

We need a version with and without parameters:

```ts
  let file = source

  if (source.includes('?')) {
    file = source.split('?')[0]
  }
```
We check if the file exists in every layer by replacing the original rootDir (CWD) with the layers rootDir and return the original source (with params) with updated path when we found the file.

```ts
  for (const layer of layersCopy) {
    const layerSource = source.replace(nuxt.options.rootDir, layer.cwd) // can contain parameters
    const layerFile = file.replace(nuxt.options.rootDir, layer.cwd)

    if (existsSync(layerFile)) {
      return layerSource
    }
  }

  return source
}
```

Second we need the `convertObjectAliasToArray` function which receives the original aliases.

```ts
const convertObjectAliasToArray = (aliasObject) => {
```

We want to add the `customResolver` only to specific aliases, not every single one of them as it will break stuff (see all the aliases that are set in the chapter "Attachment" below).

```ts
  const aliases = []
  const extendAlias = ['@', '~', '@@', '~~', 'assets', 'public']

```

We loop trhough all the original aliases and convert them to the alternative configuration, when the alias exists in the whitelist we set the `customResolver`:

```ts
  for (const [find, replacement] of Object.entries(aliasObject)) {
    const alias = {
      find,
      replacement
    }

    if (extendAlias.includes(find)) {
      alias.customResolver = customResolver
    }

    aliases.push(alias)
  }
```

We loop through the layers, the name of the layer is based on the path, because I work with subdirectories as explained in the "Context" chapter above I check if we don't get the "src" dir as name.

```ts
  layersCopy.forEach((layer) => {
    const pathParts = layer.cwd.split('/').reverse()
    const name = pathParts[0] === 'src' ? pathParts[1] : pathParts[0]

    aliases.push({
      find: `~${name}`,
      replacement: layer.cwd
    })
  })
```

So our base is in ./node_modules/@xsarus-npm/nuxt3-base and gets the layer ~nuxt3-base

A project which can also be extended is placed in ./src/project-1 and gets alias ~project-1

Problably you want to change the way the name is defined and the alias prefix (~) itself or make more options available (~ and @)

I can imagine setting the name in the nuxt config file of each layer and make the prefix(es) configurable.

## Attachment:

The whole original `viteInlineConfig.resolve.alias`:

```ts
{
  '~': '/site/src',
  '@': '/site/src',
  '~~': '/site/src',
  '@@': '/site/src',
  assets: '/site/src/assets',
  public: '/site/src/public',
  '#app': '/site/node_modules/nuxt/dist/app',
  'vue-demi': '/site/node_modules/nuxt/dist/app/compat/vue-demi',
  '@vue/composition-api': '/site/node_modules/nuxt/dist/app/compat/capi',
  '#apollo': '/site/src/.nuxt/apollo',
  'vue-i18n': '/site/node_modules/vue-i18n/dist/vue-i18n.mjs',
  '@intlify/shared': '/site/node_modules/@intlify/shared/dist/shared.mjs',
  '@intlify/message-compiler': '/site/node_modules/@intlify/message-compiler/dist/message-compiler.mjs',
  '@intlify/core-base': '/site/node_modules/@intlify/core-base/dist/core-base.mjs',
  '@intlify/core': '/site/node_modules/@intlify/core/dist/core.node.mjs',
  '@intlify/utils/h3': '/site/node_modules/@intlify/utils/dist/h3.mjs',
  '@intlify/vue-router-bridge': '/site/node_modules/@intlify/vue-router-bridge/lib/index.mjs',
  '@intlify/vue-i18n-bridge': '/site/node_modules/@intlify/vue-i18n-bridge/lib/index.mjs',
  'vue-i18n-routing': '/site/node_modules/vue-i18n-routing/dist/vue-i18n-routing.mjs',
  ufo: '/site/node_modules/ufo/dist/index.mjs',
  'is-https': '/site/node_modules/is-https/dist/index.mjs',
  '#i18n': '/site/node_modules/@nuxtjs/i18n/dist/runtime/composables/index.mjs',
  '#vue-router': '/site/src/.nuxt/vue-router-stub',
  '#imports': '/site/src/.nuxt/imports',
  '#build/plugins': '/site/src/.nuxt/plugins/client',
  '#build': '/site/src/.nuxt',
  'web-streams-polyfill/ponyfill/es2018': 'unenv/runtime/mock/empty',
  'abort-controller': 'unenv/runtime/mock/empty',
  '#internal/nitro': '/site/src/.nuxt/nitro.client.mjs'
}
```
