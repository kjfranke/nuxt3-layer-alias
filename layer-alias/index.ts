import { existsSync } from 'fs'

import {
  defineNuxtModule
} from 'nuxt/kit'

export default defineNuxtModule({
  meta: {
    name: 'layer-alias', // Usually the npm package name of your module
    compatibility: { // Compatibility constraints
      nuxt: '^3.0.0' // Semver version of supported nuxt versions
    }
  },
  hooks: {},
  setup(_moduleOptions, nuxt) {
    const layersCopy = [...nuxt.options._layers]

    const customResolver = (source: string) => {
      let file = source

      if (source.includes('?')) {
        file = source.split('?')[0]
      }

      for (const layer of layersCopy) {
        const layerSource = source.replace(nuxt.options.rootDir, layer.cwd) // can contain parameters
        const layerFile = file.replace(nuxt.options.rootDir, layer.cwd)

        if (existsSync(layerFile)) {
          return layerSource
        }
      }

      return source
    }

    const convertObjectAliasToArray = (aliasObject) => {
      const aliases = []
      const extendAlias = ['@', '~', '@@', '~~', 'assets', 'public']
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

      layersCopy.forEach((layer) => {
        const pathParts = layer.cwd.split('/').reverse()
        const name = pathParts[0] === 'src' ? pathParts[1] : pathParts[0]

        aliases.push({
          find: `~${name}`,
          replacement: layer.cwd
        })
      })

      return aliases
    }

    nuxt.hook('vite:extendConfig', (viteInlineConfig) => {
      viteInlineConfig.resolve.alias = convertObjectAliasToArray(viteInlineConfig.resolve.alias)
    })
  }
})
