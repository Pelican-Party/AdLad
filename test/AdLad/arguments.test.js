import { assertEquals, assertThrows } from "$std/testing/asserts.ts";
import { AdLad } from "../../src/AdLad.js";

/**
 * @param {string?} expectedPlugin
 * @param {ConstructorParameters<typeof AdLad>} args
 */
function argumentsTest(expectedPlugin, ...args) {
	const adLad = new AdLad(...args);
	assertEquals(adLad.activePlugin, expectedPlugin);
}

Deno.test({
	name: "options object with only plugins list",
	fn() {
		argumentsTest("plugin", {
			plugins: [{ name: "plugin" }],
		});
	},
});

Deno.test({
	name: "array object with plugins",
	fn() {
		argumentsTest("plugin", [{ name: "plugin" }]);
	},
});

Deno.test({
	name: "empty array",
	fn() {
		argumentsTest(null, []);
	},
});

Deno.test({
	name: "empty object",
	fn() {
		argumentsTest(null, {});
	},
});

Deno.test({
	name: "no argument",
	fn() {
		argumentsTest(null);
	},
});

Deno.test({
	name: "forcing plugin with the 'plugin' argument",
	fn() {
		argumentsTest("pluginB", {
			plugins: [
				{ name: "pluginA" },
				{ name: "pluginB" },
				{ name: "pluginC" },
			],
			plugin: "pluginB",
		});
	},
});

Deno.test({
	name: "forcing an inactive plugin with the 'plugin' argument",
	fn() {
		argumentsTest("pluginB", {
			plugins: [
				{
					name: "pluginA",
					shouldBeActive: () => false,
				},
				{
					name: "pluginB",
					shouldBeActive: () => false,
				},
				{
					name: "pluginC",
					shouldBeActive: () => false,
				},
			],
			plugin: "pluginB",
		});
	},
});

Deno.test({
	name: "forcing an inactive plugin with the 'plugin' argument, even though others are active",
	fn() {
		argumentsTest("pluginB", {
			plugins: [
				{
					name: "pluginA",
				},
				{
					name: "pluginB",
					shouldBeActive: () => false,
				},
				{
					name: "pluginC",
				},
			],
			plugin: "pluginB",
		});
	},
});

Deno.test({
	name: "throws when the forced plugin does not exist",
	fn() {
		assertThrows(
			() => {
				new AdLad({
					plugins: [],
					plugin: "missing",
				});
			},
			Error,
			'The plugin "missing" does not exist.',
		);
	},
});

Deno.test({
	name: "throws when the forced plugin is an empty string",
	fn() {
		assertThrows(
			() => {
				new AdLad({
					plugins: [],
					plugin: "",
				});
			},
			Error,
			'The plugin "" does not exist.',
		);
	},
});

Deno.test({
	name: "Selects no plugin when plugin value is 'none'",
	fn() {
		const adLad = new AdLad({
			plugins: [{ name: "plugin" }],
			plugin: "none",
		});
		assertEquals(adLad.activePlugin, null);
	},
});

/**
 * @param {string} queryString
 */
function mockQueryString(queryString) {
	const previousLocation = window.location;
	window.location = /** @type {Location} */ ({
		href: "https://example.com/" + queryString,
	});
	return function restore() {
		window.location = previousLocation;
	};
}

/**
 * @param {string} queryString
 * @param {string?} expectedPlugin
 * @param {ConstructorParameters<typeof AdLad>} args
 */
function queryStringTest(queryString, expectedPlugin, ...args) {
	const restore = mockQueryString(queryString);
	try {
		const adLad = new AdLad(...args);
		assertEquals(adLad.activePlugin, expectedPlugin);
	} finally {
		restore();
	}
}

Deno.test({
	name: "plugin from the query string",
	fn() {
		queryStringTest("?adlad=pluginB", "pluginB", [
			{
				name: "pluginA",
			},
			{
				name: "pluginB",
			},
			{
				name: "pluginC",
			},
		]);

		queryStringTest("?adlad=pluginB", "pluginB", {
			plugins: [
				{
					name: "pluginA",
				},
				{
					name: "pluginB",
				},
				{
					name: "pluginC",
				},
			],
			plugin: "missing",
		});
	},
});

Deno.test({
	name: "plugin from the query string even though it's inactive",
	fn() {
		queryStringTest("?adlad=pluginB", "pluginB", [
			{
				name: "pluginA",
			},
			{
				name: "pluginB",
				shouldBeActive: () => false,
			},
			{
				name: "pluginC",
			},
		]);
	},
});

Deno.test({
	name: "allowQueryStringPluginSelection false",
	fn() {
		queryStringTest("?adlad=pluginA", "pluginB", {
			plugins: [
				{ name: "pluginA" },
				{ name: "pluginB" },
			],
			allowQueryStringPluginSelection: false,
		});

		queryStringTest("?adlad=pluginA&differentKey=pluginA", "pluginB", {
			plugins: [
				{ name: "pluginA" },
				{ name: "pluginB" },
			],
			allowQueryStringPluginSelection: false,
			pluginSelectQueryStringKey: "differentKey",
		});
	},
});

Deno.test({
	name: "Different pluginSelectQueryStringKey provided",
	fn() {
		queryStringTest("?adlad=pluginB&wrong=pluginD&correct=pluginC", "pluginC", {
			plugins: [
				{ name: "pluginA" },
				{ name: "pluginB" },
				{ name: "pluginC" },
				{ name: "pluginD" },
			],
			pluginSelectQueryStringKey: "correct",
		});
	},
});

Deno.test({
	name: "invalid query string plugin defaults to fallback",
	fn() {
		queryStringTest("?adlad=invalid", "pluginB", {
			plugins: [
				{ name: "pluginA" },
				{ name: "pluginB" },
			],
		});

		queryStringTest("?adlad=invalid", "pluginB", {
			plugins: [
				{ name: "pluginA" },
				{ name: "pluginB" },
				{ name: "pluginC" },
			],
			plugin: "pluginB",
		});

		queryStringTest("?adlad=invalid", null, {
			plugins: [],
		});

		const restore = mockQueryString("?adlad=invalid");
		try {
			assertThrows(
				() => {
					new AdLad({
						plugins: [
							{ name: "pluginA" },
							{ name: "pluginB" },
						],
						plugin: "missing",
					});
				},
				Error,
				'The plugin "missing" does not exist.',
			);
		} finally {
			restore();
		}
	},
});

Deno.test({
	name: "invalid query string configured to 'error'",
	fn() {
		const restore = mockQueryString("?adlad=invalid");
		try {
			assertThrows(
				() => {
					new AdLad({
						plugins: [
							{ name: "pluginA" },
							{ name: "pluginB" },
						],
						invalidQueryStringPluginBehaviour: "error",
					});
				},
				Error,
				'The plugin "invalid" does not exist.',
			);
		} finally {
			restore();
		}
	},
});

Deno.test({
	name: "invalid query string configured to 'none'",
	fn() {
		queryStringTest("?adlad=invalid", null, {
			plugins: [
				{ name: "pluginA" },
				{ name: "pluginB" },
				{ name: "pluginC" },
			],
			invalidQueryStringPluginBehaviour: "none",
		});
		queryStringTest("?adlad=invalid", null, {
			plugins: [
				{ name: "pluginA" },
				{ name: "pluginB" },
				{ name: "pluginC" },
			],
			plugin: "pluginB",
			invalidQueryStringPluginBehaviour: "none",
		});
		queryStringTest("?adlad=invalid", null, {
			plugins: [
				{ name: "pluginA" },
				{ name: "pluginB" },
				{ name: "pluginC" },
			],
			plugin: "alsoInvalid",
			invalidQueryStringPluginBehaviour: "none",
		});
	},
});
