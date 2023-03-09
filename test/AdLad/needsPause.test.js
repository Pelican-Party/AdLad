import { assertEquals, assertNotEquals, assertThrows } from "$std/testing/asserts.ts";
import { assertSpyCall, assertSpyCalls, spy } from "$std/testing/mock.ts";
import { AdLad } from "../../src/AdLad.js";
import { initializingPluginTest, waitForMicrotasks } from "../shared.js";

/**
 * @param {ConstructorParameters<typeof AdLad>} adLadOptions
 */
function eventsTest(...adLadOptions) {
	const adLad = new AdLad(...adLadOptions);
	/** @param {boolean} _needsPause */
	const fn = (_needsPause) => {};
	const needsPauseSpy = spy(fn);
	adLad.onNeedsPauseChange(needsPauseSpy);
	return {
		adLad,
		needsPauseSpy,
	};
}
Deno.test({
	name: "needsPause is false by default",
	async fn() {
		const { adLad, needsPauseSpy } = eventsTest();
		assertEquals(adLad.needsPause, false);
		await waitForMicrotasks();
		assertSpyCalls(needsPauseSpy, 0);
	},
});

Deno.test({
	name: "needsPause stays false when no plugin is active",
	async fn() {
		const { adLad, needsPauseSpy } = eventsTest();
		await adLad.showFullScreenAd();
		assertSpyCalls(needsPauseSpy, 0);
		assertEquals(adLad.needsPause, false);
	},
});

Deno.test({
	name: "needsPause stays false when plugin doesn't have full screen ad support",
	async fn() {
		const { adLad, needsPauseSpy } = eventsTest([
			{
				name: "plugin",
			},
		]);
		await adLad.showFullScreenAd();
		assertSpyCalls(needsPauseSpy, 0);
		assertEquals(adLad.needsPause, false);
	},
});

Deno.test({
	name: "needsPause changes during full screen ads",
	async fn() {
		let resolvePromise = () => {};
		const { adLad, needsPauseSpy } = eventsTest([
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
		assertSpyCalls(needsPauseSpy, 1);
		assertSpyCall(needsPauseSpy, 0, {
			args: [true],
		});
		assertEquals(adLad.needsPause, true);

		resolvePromise();
		await waitForMicrotasks();

		assertSpyCalls(needsPauseSpy, 2);
		assertSpyCall(needsPauseSpy, 1, {
			args: [false],
		});
		assertEquals(adLad.needsPause, false);
	},
});

Deno.test({
	name: "needsPause does not become true when plugin is not initialized yet",
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
		const { adLad, needsPauseSpy } = eventsTest([plugin]);

		adLad.showFullScreenAd();
		await waitForMicrotasks();
		assertSpyCalls(needsPauseSpy, 0);
		assertEquals(adLad.needsPause, false);

		resolveInitialize();
		await waitForMicrotasks();

		assertSpyCalls(needsPauseSpy, 2);
		assertSpyCall(needsPauseSpy, 0, {
			args: [true],
		});
		assertSpyCall(needsPauseSpy, 1, {
			args: [false],
		});
		assertEquals(adLad.needsPause, false);
	},
});

Deno.test({
	name: "needsPause stays false when plugin has manualNeedsPause set",
	async fn() {
		/** @param {boolean} manualNeedsPause */
		function createPlugin(manualNeedsPause) {
			/** @type {import("../../src/AdLad.js").AdLadPlugin} */
			const plugin = {
				name: "plugin",
				manualNeedsPause,
				async showFullScreenAd() {
					return {
						didShowAd: true,
						errorReason: null,
					};
				},
			};
			return plugin;
		}
		// First we run with manualNeedsPause set to false, to verify that the needsPause would otherwise get changed.
		// This is to ensure this test doesn't become useless if something changes in the future.
		{
			const { adLad, needsPauseSpy } = eventsTest([createPlugin(false)]);

			adLad.showFullScreenAd();
			await waitForMicrotasks();
			assertNotEquals(needsPauseSpy.calls.length, 0);
		}

		// Then we run the actual test
		{
			const { adLad, needsPauseSpy } = eventsTest([createPlugin(true)]);

			adLad.showFullScreenAd();
			await waitForMicrotasks();
			assertSpyCalls(needsPauseSpy, 0);
			assertEquals(adLad.needsPause, false);
		}
	},
});

function setNeedsPausePluginTest({
	manualNeedsPause = true,
} = {}) {
	/** @param {boolean} _needsPause */
	let setNeedsPause = (_needsPause) => {};

	/** @type {import("../../src/AdLad.js").AdLadPlugin} */
	const plugin = {
		name: "plugin",
		manualNeedsPause,
		initialize(ctx) {
			setNeedsPause = ctx.setNeedsPause;
		},
		async showFullScreenAd() {
			return {
				didShowAd: true,
				errorReason: null,
			};
		},
	};

	const { adLad, needsPauseSpy } = eventsTest([plugin]);
	return {
		adLad,
		plugin,
		setNeedsPause,
		needsPauseSpy,
	};
}

Deno.test({
	name: "Setting needsPause via plugin",
	fn() {
		const { adLad, setNeedsPause, needsPauseSpy } = setNeedsPausePluginTest();

		assertSpyCalls(needsPauseSpy, 0);
		assertEquals(adLad.needsPause, false);

		setNeedsPause(true);
		assertSpyCalls(needsPauseSpy, 1);
		assertSpyCall(needsPauseSpy, 0, {
			args: [true],
		});
		assertEquals(adLad.needsPause, true);

		setNeedsPause(false);
		assertSpyCalls(needsPauseSpy, 2);
		assertSpyCall(needsPauseSpy, 1, {
			args: [false],
		});
		assertEquals(adLad.needsPause, false);

		setNeedsPause(false);
		assertSpyCalls(needsPauseSpy, 2);
	},
});

Deno.test({
	name: "Setting needsPause via plugin throws when manualNeedsPause is false",
	fn() {
		const { adLad, setNeedsPause, needsPauseSpy } = setNeedsPausePluginTest({ manualNeedsPause: false });

		assertThrows(
			() => {
				setNeedsPause(true);
			},
			Error,
			"Plugin is not allowed to modify needsPause because 'manualNeedsPause' is not set.",
		);

		assertSpyCalls(needsPauseSpy, 0);
		assertEquals(adLad.needsPause, false);
	},
});

Deno.test({
	name: "AdLad can't be tricked into setting needs pause by changing the property on the plugin",
	async fn() {
		const { adLad, setNeedsPause, needsPauseSpy, plugin } = setNeedsPausePluginTest({ manualNeedsPause: false });

		plugin.manualNeedsPause = false;

		assertThrows(
			() => {
				setNeedsPause(true);
			},
			Error,
			"Plugin is not allowed to modify needsPause because 'manualNeedsPause' is not set.",
		);

		assertSpyCalls(needsPauseSpy, 0);
		assertEquals(adLad.needsPause, false);

		adLad.showFullScreenAd();
		await waitForMicrotasks();
		assertSpyCalls(needsPauseSpy, 2);
		assertSpyCall(needsPauseSpy, 0, {
			args: [true],
		});
		assertSpyCall(needsPauseSpy, 1, {
			args: [false],
		});
		assertEquals(adLad.needsPause, false);
	},
});
