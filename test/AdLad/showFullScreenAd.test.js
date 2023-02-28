import { assertEquals, equal } from "$std/testing/asserts.ts";
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

/**
 * @param {unknown[]} pluginReturnDatas
 * @param {import("../../src/AdLad.js").ShowFullScreenAdResult} expectedReturnData
 */
async function returnTest(pluginReturnDatas, expectedReturnData) {
	for (const pluginReturnData of pluginReturnDatas) {
		/** @type {import("../../src/AdLad.js").AdLadPlugin} */
		const plugin = {
			name: "plugin",
			async showFullScreenAd() {
				return /** @type {any} */ (pluginReturnData);
			},
		};
		const adLad = new AdLad([plugin]);
		const result = await adLad.showFullScreenAd();
		if (!equal(result, expectedReturnData)) {
			console.error("Test failed for", pluginReturnData);
			assertEquals(result, expectedReturnData);
		}
	}
}

Deno.test({
	name: "showFullScreenAd returns the results from the plugin",
	async fn() {
		/** @type {import("../../src/AdLad.js").ShowFullScreenAdResult[]} */
		const tests = [
			{
				didShowAd: true,
				errorReason: null,
			},
			{
				didShowAd: false,
				errorReason: "adblocker",
			},
			{
				didShowAd: false,
				errorReason: "not-supported",
			},
			{
				didShowAd: false,
				errorReason: "unknown",
			},
			{
				didShowAd: null,
				errorReason: null,
			},
		];

		for (const test of tests) {
			await returnTest([test], test);
		}
	},
});
Deno.test({
	name: "showFullScreenAd returns sanitized results from misbehaving plugins",
	async fn() {
		// should be converted to unknown error
		await returnTest([
			{
				didShowAd: "not a boolean",
				errorReason: null,
			},
			{
				didShowAd: false,
				errorReason: "invalid error value",
			},
			{
				didShowAd: false,
				errorReason: "no-active-plugin",
			},
			{
				didShowAd: false,
			},
			{},
			true,
			undefined,
			"not an object",
			42,
		], {
			didShowAd: false,
			errorReason: "unknown",
		});

		// Should be converted to didShowAd true
		await returnTest([
			{
				didShowAd: true,
				errorReason: "not null",
			},
			{
				didShowAd: true,
			},
			{
				didShowAd: true,
				errorReason: undefined,
			},
			{
				didShowAd: true,
				errorReason: "adblocker",
			},
		], {
			didShowAd: true,
			errorReason: null,
		});
	},
});
