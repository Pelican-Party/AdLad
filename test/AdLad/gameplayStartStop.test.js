import { assertEquals, assertStrictEquals } from "$std/testing/asserts.ts";
import { assertSpyCall, assertSpyCalls, spy, stub } from "$std/testing/mock.ts";
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

		// @ts-expect-error 'gameplayStart' is expected to take 0 parameters
		adLad.gameplayStart({});
		// @ts-expect-error 'gameplayStop' is expected to take 0 parameters
		adLad.gameplayStop({});
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

		// @ts-expect-error 'gameplayStart' is expected to take 0 parameters
		adLad.gameplayStart({});
		// @ts-expect-error 'gameplayStop' is expected to take 0 parameters
		adLad.gameplayStop({});
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

Deno.test({
	name: "Errors from the plugin are caught",
	async fn() {
		const trueError = new Error("oh no true");
		const falseError = new Error("oh no true");
		/** @type {import("../../src/AdLad.js").AdLadPlugin} */
		const plugin = {
			name: "plugin",
			gameplayStart() {
				throw trueError;
			},
			async gameplayStop() {
				throw falseError;
			},
		};
		const adLad = new AdLad([plugin]);

		const consoleErrorSpy = stub(console, "error");
		try {
			adLad.gameplayStart();
			await waitForMicrotasks();

			adLad.gameplayStop();
			await waitForMicrotasks();

			assertSpyCalls(consoleErrorSpy, 2);
			assertEquals(
				consoleErrorSpy.calls[0].args[0],
				'An error occurred while trying to change the gameplay start/stop state of the "plugin" plugin:',
			);
			assertStrictEquals(consoleErrorSpy.calls[0].args[1], trueError);
			assertEquals(
				consoleErrorSpy.calls[1].args[0],
				'An error occurred while trying to change the gameplay start/stop state of the "plugin" plugin:',
			);
			assertStrictEquals(consoleErrorSpy.calls[1].args[1], falseError);
		} finally {
			consoleErrorSpy.restore();
		}
	},
});

Deno.test({
	name: "gameplayStart and gameplayStop parameters are passed to the plugin",
	async fn() {
		const plugin = /** @type {const} @satisfies {import("../../src/AdLad.js").AdLadPlugin} */ ({
			name: "myplugin",
			/**
			 * @param {Object} options
			 * @param {number} options._foo
			 * @param {string} options._bar
			 */
			gameplayStart({ _foo, _bar }) {},
			/**
			 * @param {Object} options
			 * @param {number} options._foo
			 * @param {string} options._bar
			 */
			gameplayStop({ _foo, _bar }) {},
		});

		const unusedPlugin = /** @type {const} @satisfies {import("../../src/AdLad.js").AdLadPlugin} */ ({
			name: "unused",
			/**
			 * @param {Object} options
			 * @param {boolean} options._baz
			 */
			gameplayStart({ _baz }) {},
			/**
			 * @param {Object} options
			 * @param {boolean} options._baz
			 */
			gameplayStop({ _baz }) {},
		});

		const pluginWithoutOptions = /** @type {const} @satisfies {import("../../src/AdLad.js").AdLadPlugin} */ ({
			name: "withoutoptions",
			gameplayStart() {},
			gameplayStop() {},
		});

		const pluginStartSpy = spy(plugin, "gameplayStart");
		const unusedPluginStartSpy = spy(unusedPlugin, "gameplayStart");
		const pluginWithoutOptionsStartSpy = spy(pluginWithoutOptions, "gameplayStart");
		const pluginStopSpy = spy(plugin, "gameplayStop");
		const unusedPluginStopSpy = spy(unusedPlugin, "gameplayStop");
		const pluginWithoutOptionsStopSpy = spy(pluginWithoutOptions, "gameplayStop");

		const adLad = new AdLad([plugin, unusedPlugin, pluginWithoutOptions]);
		adLad.gameplayStart({
			myplugin: {
				_foo: 3,
				_bar: "str",
			},
			unused: {
				_baz: true,
			},
		});

		await waitForMicrotasks();

		assertSpyCalls(pluginStartSpy, 1);
		assertSpyCalls(unusedPluginStartSpy, 0);
		assertSpyCalls(pluginWithoutOptionsStartSpy, 0);
		assertSpyCall(pluginStartSpy, 0, {
			args: [{ _foo: 3, _bar: "str" }],
		});

		adLad.gameplayStop({
			myplugin: {
				_foo: 4,
				_bar: "str2",
			},
			unused: {
				_baz: false,
			},
		});

		await waitForMicrotasks();

		assertSpyCalls(pluginStopSpy, 1);
		assertSpyCalls(unusedPluginStopSpy, 0);
		assertSpyCalls(pluginWithoutOptionsStopSpy, 0);
		assertSpyCall(pluginStopSpy, 0, {
			args: [{ _foo: 4, _bar: "str2" }],
		});

		// @ts-expect-error gameplayStart should exect one parameter
		adLad.gameplayStart();

		adLad.gameplayStart({
			// @ts-expect-error 'invalid' is not an expected plugin
			invalid: {
				_foo: 3,
				_bar: "str",
			},
		});

		// @ts-expect-error 'unused' plugin is missing
		adLad.gameplayStart({
			myplugin: {
				_foo: 3,
				_bar: "str",
			},
		});

		adLad.gameplayStart({
			myplugin: {
				// @ts-expect-error '_foo' is a number
				_foo: "not a string",
				_bar: "str",
			},
			unused: {
				_baz: true,
			},
		});
	},
});

Deno.test({
	name: "Plugins that don't take any parameters don't receive them",
	async fn() {
		const pluginA = /** @type {const} @satisfies {import("../../src/AdLad.js").AdLadPlugin} */ ({
			name: "plugina",
			gameplayStart() {},
			gameplayStop() {},
			async showFullScreenAd() {
				return {
					didShowAd: true,
					errorReason: null,
				};
			},
			async showRewardedAd() {
				return {
					didShowAd: true,
					errorReason: null,
				};
			},
		});

		// Add a second plugin to verify that parameter types behave as expected when one of the plugins
		// doesn't have gameplayStart or gameplayStop implemented.
		const pluginB = /** @type {const} @satisfies {import("../../src/AdLad.js").AdLadPlugin} */ ({
			name: "pluginb",
		});

		const startSpy = spy(pluginA, "gameplayStart");
		const stopSpy = spy(pluginA, "gameplayStop");

		const adLad = new AdLad([pluginA, pluginB]);

		adLad.gameplayStart();
		await waitForMicrotasks();
		assertSpyCalls(startSpy, 1);
		assertSpyCall(startSpy, 0, {
			args: [],
		});

		adLad.gameplayStop();
		await waitForMicrotasks();
		assertSpyCalls(stopSpy, 1);
		assertSpyCall(stopSpy, 0, {
			args: [],
		});

		await adLad.showFullScreenAd();
		await adLad.showRewardedAd();

		// @ts-expect-error 'gameplayStart' is expected to take 0 parameters
		adLad.gameplayStart({});
		// @ts-expect-error 'gameplayStop' is expected to take 0 parameters
		adLad.gameplayStop({});
	},
});

Deno.test({
	name: "Some plugins take arguments, but the active plugin doesn't",
	async fn() {
		const plugin = /** @type {const} @satisfies {import("../../src/AdLad.js").AdLadPlugin} */ ({
			name: "myplugin",
			gameplayStart() {},
			gameplayStop() {},
		});

		const unusedPlugin = /** @type {const} @satisfies {import("../../src/AdLad.js").AdLadPlugin} */ ({
			name: "unused",
			/**
			 * @param {Object} options
			 * @param {boolean} options._baz
			 */
			gameplayStart({ _baz }) {},
			/**
			 * @param {Object} options
			 * @param {boolean} options._baz
			 */
			gameplayStop({ _baz }) {},
		});

		const pluginStartSpy = spy(plugin, "gameplayStart");
		const pluginStopSpy = spy(plugin, "gameplayStop");

		const adLad = new AdLad([plugin, unusedPlugin]);
		adLad.gameplayStart({
			unused: {
				_baz: true,
			},
		});

		await waitForMicrotasks();
		assertSpyCalls(pluginStartSpy, 1);
		assertSpyCalls(pluginStopSpy, 0);
		assertSpyCall(pluginStartSpy, 0, {
			args: [],
		});

		adLad.gameplayStop({
			unused: {
				_baz: true,
			},
		});
		await waitForMicrotasks();
		assertSpyCalls(pluginStartSpy, 1);
		assertSpyCalls(pluginStopSpy, 1);
		assertSpyCall(pluginStopSpy, 0, {
			args: [],
		});
	},
});
