import { assertEquals } from "$std/testing/asserts.ts";
import { AdLad } from "../../src/AdLad.js";

Deno.test({
	name: "options object with plugins",
	fn() {
		const plugin = { name: "plugin" };
		const adLad = new AdLad({
			plugins: [plugin],
		});

		assertEquals(adLad.activePlugin, "plugin");
	},
});

Deno.test({
	name: "array object with plugins",
	fn() {
		const plugin = { name: "plugin" };
		const adLad = new AdLad([plugin]);

		assertEquals(adLad.activePlugin, "plugin");
	},
});

Deno.test({
	name: "no argument",
	fn() {
		const adLad = new AdLad();

		assertEquals(adLad.activePlugin, null);
	},
});
