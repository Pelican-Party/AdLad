import { assertEquals, assertNotEquals, assertThrows } from "$std/testing/asserts.ts";
import { assertSpyCall, assertSpyCalls, spy } from "$std/testing/mock.ts";
import { AdLad } from "../../src/AdLad.js";
import { initializingPluginTest, waitForMicrotasks } from "../shared.js";

/**
 * @param {ConstructorParameters<typeof AdLad>} adLadOptions
 */
function eventsTest(...adLadOptions) {
	const adLad = new AdLad(...adLadOptions);
	/** @param {boolean} _needsMute */
	const fn = (_needsMute) => {};
	const needsMuteSpy = spy(fn);
	adLad.onNeedsMuteChange(needsMuteSpy);
	return {
		adLad,
		needsMuteSpy,
	};
}
Deno.test({
	name: "needsMute is false by default",
	async fn() {
		const { adLad, needsMuteSpy } = eventsTest();
		assertEquals(adLad.needsMute, false);
		await waitForMicrotasks();
		assertSpyCalls(needsMuteSpy, 0);
	},
});

Deno.test({
	name: "needsMute stays false when no plugin is active",
	async fn() {
		const { adLad, needsMuteSpy } = eventsTest();
		await adLad.showFullScreenAd();
		assertSpyCalls(needsMuteSpy, 0);
		assertEquals(adLad.needsMute, false);
	},
});

Deno.test({
	name: "needsMute stays false when plugin doesn't have full screen ad support",
	async fn() {
		const { adLad, needsMuteSpy } = eventsTest([
			{
				name: "plugin",
			},
		]);
		await adLad.showFullScreenAd();
		assertSpyCalls(needsMuteSpy, 0);
		assertEquals(adLad.needsMute, false);
	},
});

Deno.test({
	name: "needsMute changes during full screen ads",
	async fn() {
		let resolvePromise = () => {};
		const { adLad, needsMuteSpy } = eventsTest([
			{
				name: "plugin",
				async showFullScreenAd() {
					/** @type {Promise<void>} */
					const promise = new Promise((resolve) => resolvePromise = resolve);
					await promise;
					return {
						didShowAd: true,
						errorReason: null,
					};
				},
			},
		]);
		adLad.showFullScreenAd();
		await waitForMicrotasks();
		assertSpyCalls(needsMuteSpy, 1);
		assertSpyCall(needsMuteSpy, 0, {
			args: [true],
		});
		assertEquals(adLad.needsMute, true);

		resolvePromise();
		await waitForMicrotasks();

		assertSpyCalls(needsMuteSpy, 2);
		assertSpyCall(needsMuteSpy, 1, {
			args: [false],
		});
		assertEquals(adLad.needsMute, false);
	},
});

Deno.test({
	name: "needsMute does not become true when plugin is not initialized yet",
	async fn() {
		const { plugin, resolveInitialize } = initializingPluginTest({
			name: "plugin",
			async showFullScreenAd() {
				return {
					didShowAd: true,
					errorReason: null,
				};
			},
		});
		const { adLad, needsMuteSpy } = eventsTest([plugin]);

		adLad.showFullScreenAd();
		await waitForMicrotasks();
		assertSpyCalls(needsMuteSpy, 0);
		assertEquals(adLad.needsMute, false);

		resolveInitialize();
		await waitForMicrotasks();

		assertSpyCalls(needsMuteSpy, 2);
		assertSpyCall(needsMuteSpy, 0, {
			args: [true],
		});
		assertSpyCall(needsMuteSpy, 1, {
			args: [false],
		});
		assertEquals(adLad.needsMute, false);
	},
});

Deno.test({
	name: "needsMute stays false when plugin has manualNeedsMute set",
	async fn() {
		/** @param {boolean} manualNeedsMute */
		function createPlugin(manualNeedsMute) {
			/** @type {import("../../src/AdLad.js").AdLadPlugin} */
			const plugin = {
				name: "plugin",
				manualNeedsMute,
				async showFullScreenAd() {
					return {
						didShowAd: true,
						errorReason: null,
					};
				},
			};
			return plugin;
		}
		// First we run with manualNeedsMute set to false, to verify that the needsMute would otherwise get changed.
		// This is to ensure this test doesn't become useless if something changes in the future.
		{
			const { adLad, needsMuteSpy } = eventsTest([createPlugin(false)]);

			adLad.showFullScreenAd();
			await waitForMicrotasks();
			assertNotEquals(needsMuteSpy.calls.length, 0);
		}

		// Then we run the actual test
		{
			const { adLad, needsMuteSpy } = eventsTest([createPlugin(true)]);

			adLad.showFullScreenAd();
			await waitForMicrotasks();
			assertSpyCalls(needsMuteSpy, 0);
			assertEquals(adLad.needsMute, false);
		}
	},
});

function setNeedsMutePluginTest({
	manualNeedsMute = true,
} = {}) {
	/** @param {boolean} _needsMute */
	let setNeedsMute = (_needsMute) => {};

	/** @type {import("../../src/AdLad.js").AdLadPlugin} */
	const plugin = {
		name: "plugin",
		manualNeedsMute,
		initialize(ctx) {
			setNeedsMute = ctx.setNeedsMute;
		},
		async showFullScreenAd() {
			return {
				didShowAd: true,
				errorReason: null,
			};
		},
	};

	const { adLad, needsMuteSpy } = eventsTest([plugin]);
	return {
		adLad,
		plugin,
		setNeedsMute,
		needsMuteSpy,
	};
}

Deno.test({
	name: "Setting needsMute via plugin",
	fn() {
		const { adLad, setNeedsMute, needsMuteSpy } = setNeedsMutePluginTest();

		assertSpyCalls(needsMuteSpy, 0);
		assertEquals(adLad.needsMute, false);

		setNeedsMute(true);
		assertSpyCalls(needsMuteSpy, 1);
		assertSpyCall(needsMuteSpy, 0, {
			args: [true],
		});
		assertEquals(adLad.needsMute, true);

		setNeedsMute(false);
		assertSpyCalls(needsMuteSpy, 2);
		assertSpyCall(needsMuteSpy, 1, {
			args: [false],
		});
		assertEquals(adLad.needsMute, false);

		setNeedsMute(false);
		assertSpyCalls(needsMuteSpy, 2);
	},
});

Deno.test({
	name: "Setting needsMute via plugin throws when manualNeedsMute is false",
	fn() {
		const { adLad, setNeedsMute, needsMuteSpy } = setNeedsMutePluginTest({ manualNeedsMute: false });

		assertThrows(
			() => {
				setNeedsMute(true);
			},
			Error,
			"Plugin is not allowed to modify needsMute because 'manualNeedsMute' is not set.",
		);

		assertSpyCalls(needsMuteSpy, 0);
		assertEquals(adLad.needsMute, false);
	},
});

Deno.test({
	name: "AdLad can't be tricked into setting needsMute by changing the property on the plugin",
	async fn() {
		const { adLad, setNeedsMute, needsMuteSpy, plugin } = setNeedsMutePluginTest({ manualNeedsMute: false });

		plugin.manualNeedsMute = false;

		assertThrows(
			() => {
				setNeedsMute(true);
			},
			Error,
			"Plugin is not allowed to modify needsMute because 'manualNeedsMute' is not set.",
		);

		assertSpyCalls(needsMuteSpy, 0);
		assertEquals(adLad.needsMute, false);

		adLad.showFullScreenAd();
		await waitForMicrotasks();
		assertSpyCalls(needsMuteSpy, 2);
		assertSpyCall(needsMuteSpy, 0, {
			args: [true],
		});
		assertSpyCall(needsMuteSpy, 1, {
			args: [false],
		});
		assertEquals(adLad.needsMute, false);
	},
});
