import { assertEquals, assertRejects } from "$std/testing/asserts.ts";
import { assertSpyCall, assertSpyCalls, spy, stub } from "$std/testing/mock.ts";
import { AdLad } from "../../src/AdLad.js";
import { assertPromiseResolved, initializingPluginTest, waitForMicrotasks } from "../shared.js";

Deno.test({
	name: "canShowFullScreenAd when no plugin is active",
	fn() {
		const adLad = new AdLad();

		assertEquals(adLad.canShowFullScreenAd, false);
	},
});

Deno.test({
	name: "canShowRewardedAd when no plugin is active",
	fn() {
		const adLad = new AdLad();

		assertEquals(adLad.canShowRewardedAd, false);
	},
});

/**
 * @param  {Partial<import("../../src/AdLad.js").AdLadPlugin>} [pluginOptions]
 */
function initializePromisePlugin(pluginOptions) {
	let resolvePromiseFn = () => {};

	/** @type {import("../../src/AdLad.js").AdLadPlugin} */
	const plugin = {
		name: "plugin",
		initialize() {
			return new Promise((r) => {
				resolvePromiseFn = r;
			});
		},
		...pluginOptions,
	};

	return {
		plugin,
		async resolvePromise() {
			resolvePromiseFn();
			await waitForMicrotasks();
		},
	};
}

Deno.test({
	name: "canShowFullScreenAd becomes true once plugins are initialized",
	async fn() {
		const { plugin, resolvePromise } = initializePromisePlugin({
			async showFullScreenAd() {
				return {
					didShowAd: false,
					errorReason: "unknown",
				};
			},
		});

		const adLad = new AdLad([plugin]);
		assertEquals(adLad.canShowFullScreenAd, false);

		await resolvePromise();

		assertEquals(adLad.canShowFullScreenAd, true);
	},
});

Deno.test({
	name: "canShowRewardedAd becomes true once plugins are initialized",
	async fn() {
		const { plugin, resolvePromise } = initializePromisePlugin({
			async showRewardedAd() {
				return {
					didShowAd: false,
					errorReason: "unknown",
				};
			},
		});

		const adLad = new AdLad([plugin]);
		assertEquals(adLad.canShowRewardedAd, false);

		await resolvePromise();

		assertEquals(adLad.canShowRewardedAd, true);
	},
});

Deno.test({
	name: "canShowFullScreenAd stays false when the plugin doesn't support showFullScreenAd",
	async fn() {
		const { plugin, resolvePromise } = initializePromisePlugin();

		const adLad = new AdLad([plugin]);
		assertEquals(adLad.canShowFullScreenAd, false);

		await resolvePromise();

		assertEquals(adLad.canShowFullScreenAd, false);
	},
});

Deno.test({
	name: "canShowRewardedAd stays false when the plugin doesn't support showFullScreenAd",
	async fn() {
		const { plugin, resolvePromise } = initializePromisePlugin();

		const adLad = new AdLad([plugin]);
		assertEquals(adLad.canShowRewardedAd, false);

		await resolvePromise();

		assertEquals(adLad.canShowRewardedAd, false);
	},
});
