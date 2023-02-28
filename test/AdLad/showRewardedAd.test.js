import { assertEquals } from "$std/testing/asserts.ts";
import { AdLad } from "../../src/AdLad.js";

Deno.test({
	name: "showRewardedAd when no plugin is active",
	async fn() {
		const adLad = new AdLad();

		const result = await adLad.showRewardedAd();
		assertEquals(result, {
			didShowAd: false,
			errorReason: "no-active-plugin",
		});
	},
});

Deno.test({
	name: "showRewardedAd not supported by plugin",
	async fn() {
		/** @type {import("../../src/AdLad.js").AdLadPlugin} */
		const plugin = {
			name: "plugin",
		};
		const adLad = new AdLad([plugin]);
		assertEquals(await adLad.showRewardedAd(), {
			didShowAd: false,
			errorReason: "not-supported",
		});
	},
});
