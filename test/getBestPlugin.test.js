import { assertEquals, assertStrictEquals, assertThrows } from "$std/testing/asserts.ts";
import { getBestPlugin } from "../src/getBestPlugin.js";

Deno.test({
	name: "Returns the plugin that wants to be active",
	fn() {
		/** @type {import("../src/AdLad.js").AdLadPlugin} */
		const pluginA = {
			name: "plugin a",
			shouldBeActive: () => false,
		};
		/** @type {import("../src/AdLad.js").AdLadPlugin} */
		const pluginB = {
			name: "plugin b",
			shouldBeActive: () => true,
		};

		assertStrictEquals(getBestPlugin([pluginA, pluginB]), pluginB);
	},
});

Deno.test({
	name: "Plugins want to be active by default",
	fn() {
		/** @type {import("../src/AdLad.js").AdLadPlugin} */
		const pluginA = {
			name: "plugin a",
		};
		/** @type {import("../src/AdLad.js").AdLadPlugin} */
		const pluginB = {
			name: "plugin b",
			shouldBeActive: () => false,
		};

		assertStrictEquals(getBestPlugin([pluginA, pluginB]), pluginA);
	},
});

Deno.test({
	name: "Returns null when no plugins are provided",
	fn() {
		assertEquals(getBestPlugin(), null);
		assertEquals(getBestPlugin([]), null);
	},
});

Deno.test({
	name: "Throws when more than one plugin wants to be active",
	fn() {
		/** @type {import("../src/AdLad.js").AdLadPlugin} */
		const pluginA = {
			name: "plugin a",
		};
		/** @type {import("../src/AdLad.js").AdLadPlugin} */
		const pluginB = {
			name: "plugin b",
		};
		assertThrows(
			() => {
				getBestPlugin([pluginA, pluginB]);
			},
			Error,
			"More than one plugin requested to be active: plugin a, plugin b.",
		);
	},
});

Deno.test({
	name: "Returns null when no plugin wants to be active",
	fn() {
		/** @type {import("../src/AdLad.js").AdLadPlugin} */
		const pluginA = {
			name: "plugin a",
			shouldBeActive: () => false,
		};
		/** @type {import("../src/AdLad.js").AdLadPlugin} */
		const pluginB = {
			name: "plugin b",
			shouldBeActive: () => false,
		};

		assertEquals(getBestPlugin([pluginA, pluginB]), null);
	},
});
