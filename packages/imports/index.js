// @ts-check
/// <reference path="./import.d.ts" />

import * as assets from './lib/asset.js'
import { promises as fs, createReadStream } from 'node:fs'
import * as posix from './lib/posix.js'
import * as template from './lib/template.js'

import { MagicString } from './lib/magic-string.js'
import acornImportAssertionsPlugin from './lib/acorn-plugin.js'

/** @type {{ (): import('vite').Plugin }} */
export const importPlusPlugin = () => {
	const rootDir = posix.normalize(process.cwd()) + '/'

	const internal = {
		assetsName: '',
		baseName: '',
		distDir: '',
		hostname: 'localhost',
		https: false,
		pagesDir: rootDir + 'src/pages/',
		port: 3000,
		rootDir,
		site: 'http://localhost/',
	}

	return {
		name: '@astropub/imports',
		enforce: 'pre',
		configResolved(config) {
			const rootDir = posix.normalize(config.root) + '/'

			internal.baseName = posix.normalize(config.base).replace(/^\/|\/$/g, '')

			internal.assetsName = (internal.baseName ? internal.baseName + '/' : '') + posix.normalize(config.build.assetsDir)

			internal.distDir = posix.normalize(config.build.outDir)
			internal.hostname = typeof config.server.host === 'string' ? config.server.host : 'localhost'
			internal.https = Boolean(config.server.https)
			internal.pagesDir = rootDir + 'src/pages/'
			internal.port = Number(config.server.port) || 3000
			internal.rootDir = rootDir
			internal.site = `http${internal.https ? 's' : ''}://${internal.hostname}${internal.port ? `:${internal.port}` : ``}/`

			assets.data.baseName = internal.baseName
			assets.data.assetsName = internal.assetsName
		},
		options(options) {
			// @ts-ignore
			(options.acornInjectPlugins = options.acornInjectPlugins || []).push(acornImportAssertionsPlugin)

			return options
		},
		configureServer(server) {
			server.middlewares.use((request, response, next) => {
				const url = String(request.url)

				const assetsLead = '/' + internal.assetsName + '/'

				if (url.startsWith(assetsLead)) {
					const assetFile = assets.data.assets.getFromServer(url.slice(assetsLead.length))

					if (assetFile === null) next()
					else createReadStream(assetFile).pipe(response)
				} else next()
			})
		},
		resolveId(importeeId, importerId, options) {
			if (!importeeId || !importeeId.includes('assert=')) return undefined

			let [ safeImporteeId, assert ] = posix.normalizeWithAssertions(importeeId)

			if (assert == null) return

			safeImporteeId = safeImporteeId.replace(/^\/src\//, internal.rootDir + 'src/')

			return this.resolve(safeImporteeId, importerId, { ...options, skipSelf: true }).then(
				resolved => {
					if (resolved == null) return null

					let [ resolvedId, resolvedParams ] = posix.normalizeWithParams(resolved.id)

					resolvedParams.set('assert', JSON.stringify(assert))

					resolved.id = resolvedId + '.js?' + resolvedParams

					return resolved
				}
			)
		},
		load(importeeId) {
			if (!importeeId || !importeeId.includes('assert=')) return undefined

			let [ safeImporteeId, assert ] = posix.normalizeWithAssertions(importeeId)

			if (assert == null) return

			switch (assert.type) {
				case 'arraybuffer':
					return fetch(safeImporteeId).then(
						response => response.arrayBuffer()
					).then(
						buffer => {
							return `export default new Uint16Array(${JSON.stringify(Array.from(new Uint8Array(buffer)))}).buffer`
						}
					)

				case 'json':
					return fetch(safeImporteeId).then(
						response => response.json()
					).then(
						text => `export default ${JSON.stringify(text)}`
					)

				case 'raw':
				case 'text':
					return fetch(safeImporteeId).then(
						response => response.text()
					).then(
						text => `export default ${JSON.stringify(text)}`
					)

				case 'url':
					return `export default ${JSON.stringify(safeImporteeId)}`

				case 'javascript':
				case 'js':
					return fetch(safeImporteeId).then(
						response => response.text()
					)
				default:
					throw new TypeError(`Unsupported assertion: ${JSON.stringify(assert.type)}`)
			}
		},
		transform(code, importee) {
			importee = posix.normalize(importee)

			if (isScriptingExtension(importee)) {
				const source = new MagicString(code)
				const isPage = importee.startsWith(internal.pagesDir) && importee.endsWith('.astro')

				for (const index of [ ...code.matchAll(componentParamsMatch) ].map(
					(match) => Object(match).index + match[0].length
				).sort().reverse()) {
					source.appendRight(index, `globalThis[${template.symbolJS}].props=$$props;`)
				}

				source.prepend(`{${curlyJoin(
					template.headerJS,
					`m.fileHref=${getJSON(importee)}`,
					isPage ? `m.pageHref=m.fileHref` : ``,
					`m.siteHref=${getJSON(internal.site)}`,
					`m.requestHref=(m.siteHref+m.pageHref.slice(${internal.pagesDir.length},-6)).replace(/\\/index$/i, '/')`,
					`let ${commaJoin(
						`pageMeta=r(m.pageHref)`,
						`requestMeta=r(m.requestHref)`,
					)}`,
					`Object.defineProperties(import.meta,{${commaJoin(
						`...Object.getOwnPropertyDescriptors(r(m.fileHref))`,
						`page:{configurable:true,get(){return pageMeta}}`,
						`request:{configurable:true,get(){return requestMeta}}`,
						`props:{configurable:true,get(){return m.props}}`,
					)}})`,
				)}}`)

				return {
					code: source.toString(),
					map: source.generateMap({
						source: importee,
						includeContent: true
					}),
				}
			}

			return undefined
		},
		async buildEnd() {
			for (const [path, asset] of assets.data.assets) {
				const assetDir = new URL(internal.distDir + internal.assetsName + '/', 'file:')

				await fs.mkdir(assetDir, { recursive: true })
				await fs.copyFile(new URL(path, 'file:'), new URL(asset.hashname, assetDir))
			}
		},
	}
}

export default importPlusPlugin

/** Regular expression to match Astro components. */
const componentParamsMatch = /\(\s*\$\$result\s*,\s*\$\$props\s*,\s*\$\$slots\s*\)\s*=>\s*\{/g

/** Regular expression test to match scripting extensions. */
const isScriptingExtension = RegExp.prototype.test.bind(/\.(astro|[cm]?[jt]sx?)$/i)

/** Returns a collection of strings joined by a comma. */
const commaJoin = (/** @type {string[]} */ ...values) => values.join(',')

/** Returns a collection of strings joined by a semicolon. */
const curlyJoin = (/** @type {string[]} */ ...values) => values.join(';')

/** Returns a value stringified as JSON. */
const getJSON = JSON.stringify
