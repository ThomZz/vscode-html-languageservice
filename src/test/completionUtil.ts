/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as htmlLanguageService from '../htmlLanguageService';

import { CompletionList, TextDocument, CompletionItemKind } from 'vscode-languageserver-types';

interface ItemDescription {
	label: string;
	documentation?: string;
	kind?: CompletionItemKind;
	resultText?: string;
	notAvailable?: boolean;
}

function asPromise<T>(result: T): Promise<T> {
	return Promise.resolve(result);
}

function assertCompletion(completions: CompletionList, expected: ItemDescription, document: TextDocument, offset: number) {
	const matches = completions.items.filter(completion => {
		return completion.label === expected.label;
	});
	if (expected.notAvailable) {
		assert.equal(matches.length, 0, expected.label + " should not existing is results");
		return;
	}

	assert.equal(matches.length, 1, expected.label + " should only existing once: Actual: " + completions.items.map(c => c.label).join(', '));
	const match = matches[0];
	if (expected.documentation) {
		assert.equal(match.documentation, expected.documentation);
	}
	if (expected.kind) {
		assert.equal(match.kind, expected.kind);
	}
	if (expected.resultText && match.textEdit) {
		assert.equal(TextDocument.applyEdits(document, [match.textEdit]), expected.resultText);
	}
}

export function testCompletionFor(value: string, expected: { count?: number, items?: ItemDescription[] }, settings?: htmlLanguageService.CompletionConfiguration, lsOptions?: htmlLanguageService.LanguageServiceOptions): void {
	const offset = value.indexOf('|');
	value = value.substr(0, offset) + value.substr(offset + 1);

	const ls = htmlLanguageService.getLanguageService(lsOptions);

	const document = TextDocument.create('test://test/test.html', 'html', 0, value);
	const position = document.positionAt(offset);
	const htmlDoc = ls.parseHTMLDocument(document);
	const list = ls.doComplete(document, position, htmlDoc, settings);

	// no duplicate labels
	const labels = list.items.map(i => i.label).sort();
	let previous = null;
	for (const label of labels) {
		assert.ok(previous !== label, `Duplicate label ${label} in ${labels.join(',')}`);
		previous = label;
	}
	if (expected.count) {
		assert.equal(list.items, expected.count);
	}
	if (expected.items) {
		for (const item of expected.items) {
			assertCompletion(list, item, document, offset);
		}
	}
}

export function testTagCompletion(value: string, expected: string | null): void {
	const offset = value.indexOf('|');
	value = value.substr(0, offset) + value.substr(offset + 1);

	const ls = htmlLanguageService.getLanguageService();

	const document = TextDocument.create('test://test/test.html', 'html', 0, value);
	const position = document.positionAt(offset);
	const htmlDoc = ls.parseHTMLDocument(document);
	const actual = ls.doTagComplete(document, position, htmlDoc);
	assert.equal(actual, expected);
}
