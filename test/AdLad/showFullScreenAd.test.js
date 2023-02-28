import { assertEquals } from "$std/testing/asserts.ts";
import { AdLad } from "../../src/AdLad.js";

Deno.test({
	name: "showFullScreenAd when no plugin is active",
	async fn() {
		const adLad = new AdLad();

		const result = await adLad.showFullScreenAd();
		assertEquals(result, {
			didShowAd: false,
			errorReason: "no-active-plugin",
		});
	},
});

Deno.test({
	name: "showFullScreenAd not supported by plugin",
	async fn() {
		/** @type {import("../../src/AdLad.js").AdLadPlugin} */
		const plugin = {
			name: "plugin",
		};
		const adLad = new AdLad([plugin]);
		assertEquals(await adLad.showFullScreenAd(), {
			didShowAd: false,
			errorReason: "not-supported",
		});
	},
});