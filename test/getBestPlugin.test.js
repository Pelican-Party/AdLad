import { assertEquals, assertStrictEquals } from "$std/testing/asserts.ts";
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
	name: "Picks the last plugin when more than one wishes to be active",
	fn() {
		/** @type {import("../src/AdLad.js").AdLadPlugin} */
		const pluginA = {
			name: "plugin a",
			shouldBeActive: () => false,
		};
		/** @type {import("../src/AdLad.js").AdLadPlugin} */
		const pluginB = {
			name: "plugin b",
		};
		/** @type {import("../src/AdLad.js").AdLadPlugin} */
		const pluginC = {
			name: "plugin c",
		};
		/** @type {import("../src/AdLad.js").AdLadPlugin} */
		const pluginD = {
			name: "plugin d",
			shouldBeActive: () => false,
		};
		const result = getBestPlugin([pluginA, pluginB, pluginC, pluginD]);
		assertStrictEquals(result, pluginC);
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
