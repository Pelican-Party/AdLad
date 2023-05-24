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
		argumentsTest("pluginb", {
			plugins: [
				{ name: "plugina" },
				{ name: "pluginb" },
				{ name: "pluginc" },
			],
			plugin: "pluginb",
		});
	},
});

Deno.test({
	name: "forcing an inactive plugin with the 'plugin' argument",
	fn() {
		argumentsTest("pluginb", {
			plugins: [
				{
					name: "plugina",
					shouldBeActive: () => false,
				},
				{
					name: "pluginb",
					shouldBeActive: () => false,
				},
				{
					name: "pluginc",
					shouldBeActive: () => false,
				},
			],
			plugin: "pluginb",
		});
	},
});

Deno.test({
	name: "forcing an inactive plugin with the 'plugin' argument, even though others are active",
	fn() {
		argumentsTest("pluginb", {
			plugins: [
				{
					name: "plugina",
				},
				{
					name: "pluginb",
					shouldBeActive: () => false,
				},
				{
					name: "pluginc",
				},
			],
			plugin: "pluginb",
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
		queryStringTest("?adlad=pluginb", "pluginb", [
			{
				name: "plugina",
			},
			{
				name: "pluginb",
			},
			{
				name: "pluginc",
			},
		]);

		queryStringTest("?adlad=pluginb", "pluginb", {
			plugins: [
				{
					name: "plugina",
				},
				{
					name: "pluginb",
				},
				{
					name: "pluginc",
				},
			],
			plugin: "missing",
		});
	},
});

Deno.test({
	name: "Forced plugin with invalidQueryStringPluginBehaviour none",
	fn() {
		queryStringTest("", "pluginb", {
			plugins: [
				{
					name: "plugina",
				},
				{
					name: "pluginb",
				},
			],
			plugin: "pluginb",
			pluginSelectQueryStringKey: "ads",
			invalidQueryStringPluginBehaviour: "none",
		});
	},
});

Deno.test({
	name: "plugin from the query string even though it's inactive",
	fn() {
		queryStringTest("?adlad=pluginb", "pluginb", [
			{
				name: "plugin-a",
			},
			{
				name: "pluginb",
				shouldBeActive: () => false,
			},
			{
				name: "plugin-c",
			},
		]);
	},
});

Deno.test({
	name: "allowQueryStringPluginSelection false",
	fn() {
		queryStringTest("?adlad=pluginb", "plugina", {
			plugins: [
				{ name: "plugina" },
				{ name: "pluginb" },
			],
			allowQueryStringPluginSelection: false,
		});

		queryStringTest("?adlad=pluginb&differentKey=plugina", "plugina", {
			plugins: [
				{ name: "plugina" },
				{ name: "pluginb" },
			],
			allowQueryStringPluginSelection: false,
			pluginSelectQueryStringKey: "differentKey",
		});
	},
});

Deno.test({
	name: "Different pluginSelectQueryStringKey provided",
	fn() {
		queryStringTest("?adlad=pluginb&wrong=plugind&correct=pluginc", "pluginc", {
			plugins: [
				{ name: "plugina" },
				{ name: "pluginb" },
				{ name: "pluginc" },
				{ name: "plugind" },
			],
			pluginSelectQueryStringKey: "correct",
		});
	},
});

Deno.test({
	name: "invalid query string plugin defaults to fallback",
	fn() {
		queryStringTest("?adlad=invalid", "plugina", {
			plugins: [
				{ name: "plugina" },
				{ name: "pluginb" },
			],
		});

		queryStringTest("?adlad=invalid", "pluginb", {
			plugins: [
				{ name: "plugina" },
				{ name: "pluginb" },
				{ name: "pluginc" },
			],
			plugin: "pluginb",
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
							{ name: "plugina" },
							{ name: "pluginb" },
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
							{ name: "plugina" },
							{ name: "pluginb" },
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
				{ name: "plugina" },
				{ name: "pluginb" },
				{ name: "pluginc" },
			],
			invalidQueryStringPluginBehaviour: "none",
		});
		queryStringTest("?adlad=invalid", null, {
			plugins: [
				{ name: "plugina" },
				{ name: "pluginb" },
				{ name: "pluginc" },
			],
			plugin: "pluginb",
			invalidQueryStringPluginBehaviour: "none",
		});
		queryStringTest("?adlad=invalid", null, {
			plugins: [
				{ name: "plugina" },
				{ name: "pluginb" },
				{ name: "pluginc" },
			],
			plugin: "alsoInvalid",
			invalidQueryStringPluginBehaviour: "none",
		});
	},
});

// Deno.test({
// 	name: "test",
// 	only: true,
// 	fn() {
// 		const

// 		/** @type {import("../../src/AdLad.js").AdLadPlugin} */
// 		const pluginA = {
// 			name: "plugin-a",
// 			initialize(ctx) {},
// 		};

// 		/** @type {import("../../src/AdLad.js").AdLadPlugin} */
// 		const pluginB = {
// 			name: "plugin-b",
// 			initialize(ctx) {},
// 		};

// 		const adLad = new AdLad({
// 			plugins: [pluginA, pluginB],
// 			plugin: "plugin-a",
// 			pluginSelectQueryStringKey: "myQueryString",
// 			invalidQueryStringPluginBehaviour: "none",
// 		})

// 		assertEquals(adLad.activePlugin, "plugin-a");
// 	}
// })
