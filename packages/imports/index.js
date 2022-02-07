// @ts-check
/// <reference path="./import.d.ts" />

import { MagicString } from './lib/magic-string.js'
import acornImportAssertionsPlugin from './lib/acorn-plugin.js'

/** @type {{ (): import('vite').Plugin }} */
export const importPlusPlugin = () => {
	const rootDir = getPosixPath(process.cwd()) + '/'

	const symbolJS = `Symbol.for("import.meta")`
	const headerJS = `let ${commaJoin(
		`s=${symbolJS}`,
		`m=(globalThis[s]=globalThis[s]||(globalThis[s]={fileHref:"",pageHref:"",requestHref:"",siteHref:"",props:{}}))`,
		`r=r=>({${commaJoin(
			`get url(){return r}`,
			`get resolve(){${
				`return ((...paths) => paths.reduce(${
					`(u,p) => new URL(p, u), new URL(r, "file:"))`
				}.pathname).bind(null)`
			}}`,
		)}})`,
	)}`

	const internal = {
		hostname: 'localhost',
		https: false,
		pagesDir: rootDir + 'src/pages/',
		port: 3000,
		rootDir,
		site: 'http://localhost/',
	}

	return {
		name: '@astropub/imports',
		configResolved(config) {
			const rootDir = getPosixPath(config.root) + '/'

			internal.hostname = typeof config.server.host === 'string' ? config.server.host : 'localhost'
			internal.https = Boolean(config.server.https)
			internal.pagesDir = rootDir + 'src/pages/'
			internal.port = Number(config.server.port) || 3000
			internal.rootDir = rootDir
			internal.site = `http${internal.https ? 's' : ''}://${internal.hostname}${internal.port ? `:${internal.port}` : ``}/`
		},
		options(options) {
			(options.acornInjectPlugins = options.acornInjectPlugins || []).push(
				acornImportAssertionsPlugin
			)
			return options
		},
		resolveId(importeeId, importerId, options) {
			if (!importeeId || !importeeId.includes('assert=')) return undefined

			let [ resolvedId, search ] = importeeId.split(/(?<=^[^?]+)\?/)
			const params = new URLSearchParams(search)

			const assertJSON = params.get('assert')

			if (!assertJSON) return undefined

			params.delete('assert')

			const searchParams = [ ...params ].length ? `?${params}` : ''

			resolvedId = resolvedId.slice(0, -3).replace(
				/^\/src\//,
				internal.rootDir + 'src/'
			) + searchParams

			return this.resolve(resolvedId, importerId, { ...options, skipSelf: true }).then(
				resolved => {
					if (resolved == null) return undefined

					let [ resolvedId, search ] = resolved.id.split(/(?<=^[^?]+)\?/)
					let params = new URLSearchParams(search)

					params.set('assert', assertJSON)

					resolved.id = resolvedId + '.js?' + params

					return resolved
				}
			)
		},
		load(importeeId) {
			if (!importeeId || !importeeId.includes('assert=')) return undefined

			const [ resolvedId, search ] = importeeId.split(/(?<=^[^?]+)\?/)
			const params = new URLSearchParams(search)

			const assertJSON = params.get('assert')

			if (!assertJSON) return undefined

			params.delete('assert')

			const assert = JSON.parse(assertJSON)
			const searchParams = [ ...params ].length ? `?${params}` : ''

			const resolveUrl = resolvedId.slice(0, -3).replace(
				/^\/src\//,
				internal.rootDir + 'src/'
			) + searchParams

			switch (assert.type) {
				case 'buffer':
					return fetch(resolveUrl).then(
						response => response.arrayBuffer()
					).then(
						buffer => {
							return `export default new Uint16Array(${JSON.stringify(Array.from(new Uint8Array(buffer)))}).buffer`
						}
					)

				case 'json':
					return fetch(resolveUrl).then(
						response => response.json()
					).then(
						text => `export default ${JSON.stringify(text)}`
					)

				case 'raw':
				case 'text':
					return fetch(resolveUrl).then(
						response => response.text()
					).then(
						text => `export default ${JSON.stringify(text)}`
					)

				case 'url':
					return `export default ${JSON.stringify(resolveUrl)}`

				case 'javascript':
				case 'js':
					return fetch(resolveUrl).then(
						response => response.text()
					)
				default:
					throw new TypeError(`Unsupported assertion: ${JSON.stringify(assert.type)}`)
			}
		},
		transform(code, importee) {
			importee = getPosixPath(importee)

			if (isScriptingExtension(importee)) {
				const source = new MagicString(code)
				const isPage = importee.startsWith(internal.pagesDir) && importee.endsWith('.astro')

				for (const index of [ ...code.matchAll(componentParamsMatch) ].map(
					(match) => Object(match).index + match[0].length
				).sort().reverse()) {
					source.appendRight(index, `globalThis[${symbolJS}].props=$$props;`)
				}

				source.prepend(`{${curlyJoin(
					headerJS,
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
	}
}

export default importPlusPlugin

/** Regular expression to match Astro components. */
const componentParamsMatch = /\(\s*\$\$result\s*,\s*\$\$props\s*,\s*\$\$slots\s*\)\s*=>\s*\{/g

/** Regular expression test to match scripting extensions. */
const isScriptingExtension = RegExp.prototype.test.bind(/\.(astro|[cm]?[jt]sx?)$/i)

/** Regular expression test to match scripting extensions. */
const isExportingExtension = RegExp.prototype.test.bind(/\.(astro|[cm]?[jt]sx?|json)$/i)

/** Returns the posix-normalized path from the given path. */
const getPosixPath = (/** @type {string} */ path) => path.replace(/\\+/g, '/').replace(/^(?=[A-Za-z]:\/)/, '/').replace(/%/g, '%25').replace(/\n/g, '%0A').replace(/\r/g, '%0D').replace(/\t/g, '%09')

/** Returns a collection of strings joined by a comma. */
const commaJoin = (/** @type {string[]} */ ...values) => values.join(',')

/** Returns a collection of strings joined by a semicolon. */
const curlyJoin = (/** @type {string[]} */ ...values) => values.join(';')

/** Returns a value stringified as JSON. */
const getJSON = JSON.stringify
