import { assertEquals } from "$std/testing/asserts.ts";
import { assertSpyCall, assertSpyCalls, stub } from "$std/testing/mock.ts";
import { AdLad } from "../../src/AdLad.js";
import { createOnBooleanChangeSpy, waitForMicrotasks } from "../shared.js";

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
		initialize(ctx) {
			if (pluginOptions?.initialize) {
				const result = pluginOptions.initialize(ctx);
				if (result instanceof Promise) {
					throw new Error("async initialize functions are not supported in this test");
				}
			}
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

		const changeSpy = createOnBooleanChangeSpy();
		adLad.onCanShowFullScreenAdChange(changeSpy);

		await resolvePromise();

		assertEquals(adLad.canShowFullScreenAd, true);
		assertSpyCalls(changeSpy, 1);
		assertSpyCall(changeSpy, 0, {
			args: [true],
		});
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

		const changeSpy = createOnBooleanChangeSpy();
		adLad.onCanShowRewardedAdChange(changeSpy);

		await resolvePromise();

		assertEquals(adLad.canShowRewardedAd, true);
		assertSpyCalls(changeSpy, 1);
		assertSpyCall(changeSpy, 0, {
			args: [true],
		});
	},
});

Deno.test({
	name: "canShowFullScreenAd stays false when the plugin doesn't support showFullScreenAd",
	async fn() {
		const { plugin, resolvePromise } = initializePromisePlugin();

		const adLad = new AdLad([plugin]);
		assertEquals(adLad.canShowFullScreenAd, false);

		const changeSpy = createOnBooleanChangeSpy();
		adLad.onCanShowFullScreenAdChange(changeSpy);

		await resolvePromise();

		assertEquals(adLad.canShowFullScreenAd, false);
		assertSpyCalls(changeSpy, 0);
	},
});

Deno.test({
	name: "canShowRewardedAd stays false when the plugin doesn't support showFullScreenAd",
	async fn() {
		const { plugin, resolvePromise } = initializePromisePlugin();

		const adLad = new AdLad([plugin]);
		assertEquals(adLad.canShowRewardedAd, false);

		const changeSpy = createOnBooleanChangeSpy();
		adLad.onCanShowRewardedAdChange(changeSpy);

		await resolvePromise();

		assertEquals(adLad.canShowRewardedAd, false);
		assertSpyCalls(changeSpy, 0);
	},
});

Deno.test({
	name: "plugin that sets canShowFullScreenAd",
	async fn() {
		/** @type {(value: boolean) => void} */
		let setFunction = () => {};
		const { plugin, resolvePromise } = initializePromisePlugin({
			initialize(ctx) {
				ctx.setCanShowFullScreenAd(false);
				setFunction = ctx.setCanShowFullScreenAd;
			},
			async showFullScreenAd() {
				return {
					didShowAd: false,
					errorReason: "unknown",
				};
			},
		});

		const adLad = new AdLad([plugin]);
		assertEquals(adLad.canShowFullScreenAd, false);

		const changeSpy = createOnBooleanChangeSpy();
		adLad.onCanShowFullScreenAdChange(changeSpy);

		await resolvePromise();

		assertEquals(adLad.canShowFullScreenAd, false);
		assertSpyCalls(changeSpy, 0);

		setFunction(true);
		assertEquals(adLad.canShowFullScreenAd, true);
		assertSpyCalls(changeSpy, 1);

		setFunction(true);
		assertEquals(adLad.canShowFullScreenAd, true);
		assertSpyCalls(changeSpy, 1);

		setFunction(false);
		assertEquals(adLad.canShowFullScreenAd, false);
		assertSpyCalls(changeSpy, 2);

		assertSpyCall(changeSpy, 0, {
			args: [true],
		});
		assertSpyCall(changeSpy, 1, {
			args: [false],
		});
	},
});

Deno.test({
	name: "plugin that sets canShowRewardedAd",
	async fn() {
		/** @type {(value: boolean) => void} */
		let setFunction = () => {};
		const { plugin, resolvePromise } = initializePromisePlugin({
			initialize(ctx) {
				ctx.setCanShowRewardedAd(false);
				setFunction = ctx.setCanShowRewardedAd;
			},
			async showRewardedAd() {
				return {
					didShowAd: false,
					errorReason: "unknown",
				};
			},
		});

		const adLad = new AdLad([plugin]);
		assertEquals(adLad.canShowRewardedAd, false);

		const changeSpy = createOnBooleanChangeSpy();
		adLad.onCanShowRewardedAdChange(changeSpy);

		await resolvePromise();

		assertEquals(adLad.canShowRewardedAd, false);
		assertSpyCalls(changeSpy, 0);

		setFunction(true);
		assertEquals(adLad.canShowRewardedAd, true);
		assertSpyCalls(changeSpy, 1);

		setFunction(true);
		assertEquals(adLad.canShowRewardedAd, true);
		assertSpyCalls(changeSpy, 1);

		setFunction(false);
		assertEquals(adLad.canShowRewardedAd, false);
		assertSpyCalls(changeSpy, 2);

		assertSpyCall(changeSpy, 0, {
			args: [true],
		});
		assertSpyCall(changeSpy, 1, {
			args: [false],
		});
	},
});

Deno.test({
	name: "plugin with showFullScreenAd implemented but no initialize hook",
	fn() {
		const adLad = new AdLad([
			{
				name: "plugin",
				async showFullScreenAd() {
					return {
						didShowAd: true,
						errorReason: null,
					};
				},
			},
		]);

		const changeSpy = createOnBooleanChangeSpy();
		adLad.onCanShowFullScreenAdChange(changeSpy);

		assertEquals(adLad.canShowFullScreenAd, true);
		assertSpyCalls(changeSpy, 0);
	},
});

Deno.test({
	name: "plugin with showRewardedAd implemented but no initialize hook",
	fn() {
		const adLad = new AdLad([
			{
				name: "plugin",
				async showRewardedAd() {
					return {
						didShowAd: true,
						errorReason: null,
					};
				},
			},
		]);

		const changeSpy = createOnBooleanChangeSpy();
		adLad.onCanShowRewardedAdChange(changeSpy);

		assertEquals(adLad.canShowRewardedAd, true);
		assertSpyCalls(changeSpy, 0);
	},
});

Deno.test({
	name: "Plugin that fails to initialize",
	async fn() {
		const consoleStub = stub(console, "warn", () => {});

		try {
			const adLad = new AdLad([
				{
					name: "plugin",
					initialize(ctx) {
						ctx.setCanShowFullScreenAd(true);
						throw new Error("oh no");
					},
					async showRewardedAd() {
						return {
							didShowAd: true,
							errorReason: null,
						};
					},
				},
			]);
			await waitForMicrotasks();

			assertEquals(adLad.canShowFullScreenAd, false);
			assertEquals(adLad.canShowRewardedAd, false);
		} finally {
			consoleStub.restore();
		}
	},
});
