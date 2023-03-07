import { assertEquals } from "$std/testing/asserts.ts";
import { assertSpyCalls, spy } from "$std/testing/mock.ts";
import { AdLad } from "../../src/AdLad.js";
import { initializingPluginTest, waitForMicrotasks } from "../shared.js";

/**
 * @param {import("../../src/AdLad.js").AdLadPlugin} plugin
 */
function createSpyPlugin(plugin) {
	/** @type {import("$std/testing/mock.ts").Spy<import("../../src/AdLad.js").AdLadPlugin, unknown[], unknown>} */
	let startSpy = spy();
	if (plugin.gameplayStart) startSpy = spy(plugin, "gameplayStart");

	/** @type {import("$std/testing/mock.ts").Spy<import("../../src/AdLad.js").AdLadPlugin, unknown[], unknown>} */
	let stopSpy = spy();
	if (plugin.gameplayStop) stopSpy = spy(plugin, "gameplayStop");
	return { startSpy, stopSpy, plugin };
}

Deno.test({
	name: "Is a no op when no plugin is active",
	async fn() {
		const adLad = new AdLad();

		assertEquals(adLad.gameplayStart(), undefined);
		assertEquals(adLad.gameplayStop(), undefined);
		adLad.gameplayStart();
		adLad.gameplayStop();
		adLad.gameplayStart();
		adLad.gameplayStop();
	},
});

Deno.test({
	name: "Is a no op when plugin has no support",
	async fn() {
		const adLad = new AdLad([
			{ name: "plugin" },
		]);

		assertEquals(adLad.gameplayStart(), undefined);
		assertEquals(adLad.gameplayStop(), undefined);
		adLad.gameplayStart();
		adLad.gameplayStop();
		adLad.gameplayStart();
		adLad.gameplayStop();
	},
});

Deno.test({
	name: "state is passed to plugins",
	async fn() {
		const { plugin, startSpy, stopSpy } = createSpyPlugin({
			name: "plugin",
			gameplayStart() {},
			gameplayStop() {},
		});
		const adLad = new AdLad([plugin]);

		adLad.gameplayStart();
		await waitForMicrotasks();
		assertSpyCalls(startSpy, 1);
		adLad.gameplayStop();
		await waitForMicrotasks();
		assertSpyCalls(stopSpy, 1);
	},
});

Deno.test({
	name: "A plugin that only supports gameplay start",
	async fn() {
		const { plugin, startSpy } = createSpyPlugin({
			name: "plugin",
			gameplayStart() {},
		});
		const adLad = new AdLad([plugin]);

		adLad.gameplayStart();
		await waitForMicrotasks();
		assertSpyCalls(startSpy, 1);
		adLad.gameplayStop();
		await waitForMicrotasks();
		adLad.gameplayStart();
		await waitForMicrotasks();
		assertSpyCalls(startSpy, 2);
		adLad.gameplayStop();
		await waitForMicrotasks();
	},
});

Deno.test({
	name: "A plugin that only supports gameplay stop",
	async fn() {
		const { plugin, stopSpy } = createSpyPlugin({
			name: "plugin",
			gameplayStop() {},
		});
		const adLad = new AdLad([plugin]);

		adLad.gameplayStart();
		await waitForMicrotasks();
		adLad.gameplayStop();
		await waitForMicrotasks();
		assertSpyCalls(stopSpy, 1);
		adLad.gameplayStart();
		await waitForMicrotasks();
		adLad.gameplayStop();
		await waitForMicrotasks();
		assertSpyCalls(stopSpy, 2);
	},
});

Deno.test({
	name: "gameplayStart is not called until after the plugin has initialized",
	async fn() {
		const { plugin, startSpy, stopSpy } = createSpyPlugin({
			name: "plugin",
			gameplayStart() {},
			gameplayStop() {},
		});
		const { adLad, resolveInitialize } = initializingPluginTest(plugin);

		adLad.gameplayStart();
		assertSpyCalls(startSpy, 0);
		assertSpyCalls(stopSpy, 0);

		await resolveInitialize();
		assertSpyCalls(startSpy, 1);
		assertSpyCalls(stopSpy, 0);
	},
});

async function fullScreenAdTest({
	autoResolveInitialize = true,
} = {}) {
	/** @type {string[]} */
	const log = [];
	let resolveFullScreen = () => {};
	const { plugin, startSpy, stopSpy } = createSpyPlugin({
		name: "plugin",
		gameplayStart() {
			log.push("start");
		},
		gameplayStop() {
			log.push("stop");
		},
		async showFullScreenAd() {
			log.push("fullScreenAd");
			/** @type {Promise<void>} */
			const promise = new Promise((resolve) => resolveFullScreen = resolve);
			await promise;
			log.push("fullScreenAd finish");
			return {
				didShowAd: true,
				errorReason: null,
			};
		},
	});

	const { adLad, resolveInitialize } = initializingPluginTest(plugin);

	if (autoResolveInitialize) {
		await resolveInitialize();
	}

	return {
		adLad,
		startSpy,
		stopSpy,
		log,
		async resolveFullScreen() {
			resolveFullScreen();
			await waitForMicrotasks();
		},
	};
}

Deno.test({
	name: "Automatically fires gameplay events when displaying full screen events",
	async fn() {
		const { adLad, startSpy, stopSpy, resolveFullScreen, log } = await fullScreenAdTest();

		adLad.gameplayStart();
		await waitForMicrotasks();

		assertSpyCalls(startSpy, 1);
		assertSpyCalls(stopSpy, 0);

		const adPromise = adLad.showFullScreenAd();
		await waitForMicrotasks();
		assertSpyCalls(startSpy, 1);
		assertSpyCalls(stopSpy, 1);

		await resolveFullScreen();
		await adPromise;
		assertSpyCalls(startSpy, 2);
		assertSpyCalls(stopSpy, 1);
		assertEquals(log, [
			"start",
			"stop",
			"fullScreenAd",
			"fullScreenAd finish",
			"start",
		]);
	},
});

Deno.test({
	name: "Does not fire gameplaystart when gameplay stop is being called during a full screen ad",
	async fn() {
		const { adLad, startSpy, stopSpy, resolveFullScreen, log } = await fullScreenAdTest();

		adLad.gameplayStart();
		await waitForMicrotasks();

		assertSpyCalls(startSpy, 1);
		assertSpyCalls(stopSpy, 0);

		const adPromise = adLad.showFullScreenAd();
		await waitForMicrotasks();
		assertSpyCalls(stopSpy, 1);

		adLad.gameplayStop();
		await waitForMicrotasks();
		assertSpyCalls(startSpy, 1);
		assertSpyCalls(stopSpy, 1);

		await resolveFullScreen();
		await adPromise;
		assertSpyCalls(startSpy, 1);

		adLad.gameplayStart();
		await waitForMicrotasks();
		assertSpyCalls(startSpy, 2);
		assertSpyCalls(stopSpy, 1);

		assertEquals(log, [
			"start",
			"stop",
			"fullScreenAd",
			"fullScreenAd finish",
			"start",
		]);
	},
});

Deno.test({
	name: "Does not fire gameplaystop before a full screen ad when already stopped",
	async fn() {
		const { adLad, startSpy, stopSpy, resolveFullScreen, log } = await fullScreenAdTest();

		assertSpyCalls(startSpy, 0);
		assertSpyCalls(stopSpy, 0);

		const adPromise = adLad.showFullScreenAd();
		await waitForMicrotasks();
		assertSpyCalls(stopSpy, 0);
		assertSpyCalls(startSpy, 0);

		await resolveFullScreen();
		await adPromise;
		assertSpyCalls(stopSpy, 0);
		assertSpyCalls(startSpy, 0);

		adLad.gameplayStart();
		await waitForMicrotasks();
		assertSpyCalls(startSpy, 1);
		assertSpyCalls(stopSpy, 0);

		assertEquals(log, [
			"fullScreenAd",
			"fullScreenAd finish",
			"start",
		]);
	},
});
