import { assertEquals, equal } from "$std/testing/asserts.ts";
import { sanitizeFullScreenAdResult } from "../../src/sanitizeFullScreenAdResult.js";

/**
 * @param {unknown[]} pluginReturnDatas
 * @param {import("../../src/AdLad.js").ShowFullScreenAdResult} expectedReturnData
 */
async function runTests(pluginReturnDatas, expectedReturnData) {
	for (const pluginReturnData of pluginReturnDatas) {
		const result = sanitizeFullScreenAdResult(/** @type {any} */ (pluginReturnData));
		if (!equal(result, expectedReturnData)) {
			console.error("Test failed for", pluginReturnData);
			assertEquals(result, expectedReturnData);
		}
	}
}

Deno.test({
	name: "Values that should returns the exact results from the plugin",
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
				errorReason: "no-ad-available",
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
			await runTests([test], test);
		}
	},
});
Deno.test({
	name: "Values from misbehaving plugins are sanitized to errorReason: unknown",
	async fn() {
		await runTests([
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
	},
});

Deno.test({
	name: "Values from misbehaving plugins are sanitized to errorReason: null when didShowAd is true",
	async fn() {
		// Should be converted to didShowAd true
		await runTests([
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
			{
				didShowAd: true,
				errorReason: "no-ad-available",
			},
		], {
			didShowAd: true,
			errorReason: null,
		});
	},
});
