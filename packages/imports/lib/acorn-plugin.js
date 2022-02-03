/*! acorn-import-assertions (modified) | MIT License | Sven Sauleau <sven@sauleau.com> | github.com/xtuc/acorn-import-assertions */

/** { */ const LEFT_CURLY_BRACKET = 0x007B
/** ␠ */ const SPACE              = 0x0020

const FUNC_STATEMENT = 1
const FUNC_NULLABLE_ID = 4

const keyword = 'assert'

export default function importAssertions(Parser) {
	const acorn = Parser.acorn
	const { tokTypes: tt, TokenType } = acorn

	return class extends Parser {
		constructor(...args) {
			super(...args)
			this.assertToken = new TokenType(keyword)
		}

		_codeAt(i) {
			return this.input.charCodeAt(i)
		}

		_eat(t) {
			if (this.type !== t) {
				this.unexpected()
			}
			this.next()
		}

		readToken(code) {
			let i = 0
			for (; i < keyword.length; i++) {
				if (this._codeAt(this.pos + i) !== keyword.charCodeAt(i)) {
					return super.readToken(code)
				}
			}

			// ensure that the keyword is at the correct location
			// ie `assert{...` or `assert {...`
			for (; ; i++) {
				if (this._codeAt(this.pos + i) === LEFT_CURLY_BRACKET) {
					// Found '{'
					break
				} else if (this._codeAt(this.pos + i) === SPACE) {
					// white space is allowed between `assert` and `{`, so continue.
					continue
				} else {
					return super.readToken(code)
				}
			}

			// If we're inside a dynamic import expression we'll parse
			// the `assert` keyword as a standard object property name
			// ie `import(""./foo.json", { assert: { type: "json" } })`
			if (this.type.label === '{') {
				return super.readToken(code)
			}

			this.pos += keyword.length
			return this.finishToken(this.assertToken)
		}

		parseDynamicImport(node) {
			this.next() // skip `(`

			// Parse node.source.
			node.source = this.parseMaybeAssign()

			if (this.eat(tt.comma)) {
				const obj = this.parseObj(false)
				node.arguments = [obj]
			}
			this._eat(tt.parenR)
			return this.finishNode(node, 'ImportExpression')
		}

		// ported from acorn/src/statement.js pp.parseExport
		parseExport(node, exports) {
			this.next()
			// export * from '...'
			if (this.eat(tt.star)) {
				if (this.options.ecmaVersion >= 11) {
					if (this.eatContextual('as')) {
						node.exported = this.parseIdent(true)
						this.checkExport(exports, node.exported.name, this.lastTokStart)
					} else {
						node.exported = null
					}
				}
				this.expectContextual('from')
				if (this.type !== tt.string) {
					this.unexpected()
				}
				node.source = this.parseExprAtom()

				if (this.type === this.assertToken) {
					this.next()

					const assertions = this.parseImportAssertions()

					if (assertions) {
						node.assertions = assertions
					}
				}

				this.semicolon()
				return this.finishNode(node, 'ExportAllDeclaration')
			}
			if (this.eat(tt._default)) {
				// export default ...
				this.checkExport(exports, 'default', this.lastTokStart)
				var isAsync
				if (this.type === tt._function || (isAsync = this.isAsyncFunction())) {
					var fNode = this.startNode()
					this.next()
					if (isAsync) {
						this.next()
					}
					node.declaration = this.parseFunction(
						fNode,
						FUNC_STATEMENT | FUNC_NULLABLE_ID,
						false,
						isAsync
					)
				} else if (this.type === tt._class) {
					var cNode = this.startNode()
					node.declaration = this.parseClass(cNode, 'nullableID')
				} else {
					node.declaration = this.parseMaybeAssign()
					this.semicolon()
				}
				return this.finishNode(node, 'ExportDefaultDeclaration')
			}
			// export var|const|let|function|class ...
			if (this.shouldParseExportStatement()) {
				node.declaration = this.parseStatement(null)
				if (node.declaration.type === 'VariableDeclaration') {
					this.checkVariableExport(exports, node.declaration.declarations)
				} else {
					this.checkExport(
						exports,
						node.declaration.id.name,
						node.declaration.id.start
					)
				}
				node.specifiers = []
				node.source = null
			} else {
				// export { x, y as z } [from '...']
				node.declaration = null
				node.specifiers = this.parseExportSpecifiers(exports)
				if (this.eatContextual('from')) {
					if (this.type !== tt.string) {
						this.unexpected()
					}
					node.source = this.parseExprAtom()

					if (this.type === this.assertToken) {
						this.next()
						const assertions = this.parseImportAssertions()
						if (assertions) {
							node.assertions = assertions
						}
					}
				} else {
					for (var i = 0, list = node.specifiers; i < list.length; i += 1) {
						// check for keywords used as local names
						var spec = list[i]

						this.checkUnreserved(spec.local)
						// check if export is defined
						this.checkLocalExport(spec.local)
					}

					node.source = null
				}
				this.semicolon()
			}
			return this.finishNode(node, 'ExportNamedDeclaration')
		}

		parseImport(node) {
			this.next()
			// import '...'
			if (this.type === tt.string) {
				node.specifiers = []
				node.source = this.parseExprAtom()
			} else {
				node.specifiers = this.parseImportSpecifiers()
				this.expectContextual('from')
				node.source =
					this.type === tt.string ? this.parseExprAtom() : this.unexpected()
			}

			if (this.type === this.assertToken) {
				this.next()
				const assertions = this.parseImportAssertions()

				if (assertions) {
					node.assertions = assertions

					let [ id, ...params ] = node.source.value.split('?')

					params = new URLSearchParams(params.join('?'))

					const assertionsJSON = {}

					for (const assertion of assertions) {
						assertionsJSON[assertion.key.name] = assertion.value.value
					}

					params.set(keyword, JSON.stringify(assertionsJSON))

					node.source.value = `${id}.js?${params}`
					node.source.raw = JSON.stringify(node.source.value)
				}
			}
			this.semicolon()
			return this.finishNode(node, 'ImportDeclaration')
		}

		parseImportAssertions() {
			this._eat(tt.braceL)
			const attrs = this.parseAssertEntries()
			this._eat(tt.braceR)
			return attrs
		}

		parseAssertEntries() {
			const attrs = []
			const attrNames = new Set()

			do {
				if (this.type === tt.braceR) {
					break
				}

				const node = this.startNode()

				// parse AssertionKey : IdentifierName, StringLiteral
				let assertionKeyNode
				if (this.type === tt.string) {
					assertionKeyNode = this.parseLiteral(this.value)
				} else {
					assertionKeyNode = this.parseIdent(true)
				}
				this.next()
				node.key = assertionKeyNode

				// check if we already have an entry for an attribute
				// if a duplicate entry is found, throw an error
				// for now this logic will come into play only when someone declares `type` twice
				if (attrNames.has(node.key.name)) {
					this.raise(this.pos, 'Duplicated key in assertions')
				}
				attrNames.add(node.key.name)

				if (this.type !== tt.string) {
					this.raise(this.pos, 'Only string is supported as an assertion value')
				}

				node.value = this.parseLiteral(this.value)

				attrs.push(this.finishNode(node, 'ImportAttribute'))
			} while (this.eat(tt.comma))

			return attrs
		}
	}
}
