import { assertEquals, assertStrictEquals } from "$std/testing/asserts.ts";
import { assertSpyCalls, spy, stub } from "$std/testing/mock.ts";
import { AdLad } from "../../src/AdLad.js";
import { initializingPluginTest, waitForMicrotasks } from "../shared.js";

/**
 * @param {import("../../src/AdLad.js").AdLadPlugin} plugin
 */
function createSpyPlugin(plugin) {
	/** @type {import("$std/testing/mock.ts").Spy<import("../../src/AdLad.js").AdLadPlugin, unknown[], unknown>} */
	let startSpy = spy();
	if (plugin.loadStart) startSpy = spy(plugin, "loadStart");

	/** @type {import("$std/testing/mock.ts").Spy<import("../../src/AdLad.js").AdLadPlugin, unknown[], unknown>} */
	let stopSpy = spy();
	if (plugin.loadStop) stopSpy = spy(plugin, "loadStop");
	return { startSpy, stopSpy, plugin };
}

Deno.test({
	name: "Is a no op when no plugin is active",
	async fn() {
		const adLad = new AdLad();

		assertEquals(adLad.loadStart(), undefined);
		assertEquals(adLad.loadStop(), undefined);
		adLad.loadStart();
		adLad.loadStop();
		adLad.loadStart();
		adLad.loadStop();
	},
});

Deno.test({
	name: "Is a no op when plugin has no support",
	async fn() {
		const adLad = new AdLad([
			{ name: "plugin" },
		]);

		assertEquals(adLad.loadStart(), undefined);
		assertEquals(adLad.loadStop(), undefined);
		adLad.loadStart();
		adLad.loadStop();
		adLad.loadStart();
		adLad.loadStop();
	},
});

Deno.test({
	name: "state is passed to plugins",
	async fn() {
		const { plugin, startSpy, stopSpy } = createSpyPlugin({
			name: "plugin",
			loadStart() {},
			loadStop() {},
		});
		const adLad = new AdLad([plugin]);
		await waitForMicrotasks();
		assertSpyCalls(startSpy, 1);

		adLad.loadStop();
		await waitForMicrotasks();
		assertSpyCalls(stopSpy, 1);
		adLad.loadStart();
		await waitForMicrotasks();
		assertSpyCalls(startSpy, 2);
	},
});

Deno.test({
	name: "A plugin that only supports load start",
	async fn() {
		const { plugin, startSpy } = createSpyPlugin({
			name: "plugin",
			loadStart() {},
		});
		const adLad = new AdLad([plugin]);

		adLad.loadStop();
		await waitForMicrotasks();
		assertSpyCalls(startSpy, 1);
		adLad.loadStart();
		await waitForMicrotasks();
		assertSpyCalls(startSpy, 2);
		adLad.loadStop();
		await waitForMicrotasks();
		adLad.loadStart();
		await waitForMicrotasks();
		assertSpyCalls(startSpy, 3);
		adLad.loadStop();
		await waitForMicrotasks();
	},
});

Deno.test({
	name: "A plugin that only supports load stop",
	async fn() {
		const { plugin, stopSpy } = createSpyPlugin({
			name: "plugin",
			loadStop() {},
		});
		const adLad = new AdLad([plugin]);

		adLad.loadStart();
		await waitForMicrotasks();
		adLad.loadStop();
		await waitForMicrotasks();
		assertSpyCalls(stopSpy, 1);
		adLad.loadStart();
		await waitForMicrotasks();
		adLad.loadStop();
		await waitForMicrotasks();
		assertSpyCalls(stopSpy, 2);
	},
});

Deno.test({
	name: "loadStart is called by default on initialize",
	async fn() {
		const { plugin, startSpy } = createSpyPlugin({
			name: "plugin",
			loadStart() {},
		});

		const { resolveInitialize } = initializingPluginTest(plugin);

		assertSpyCalls(startSpy, 0);

		await resolveInitialize();
		assertSpyCalls(startSpy, 1);
	},
});

Deno.test({
	name: "loadStart and loadStop are both called before the plugin is initialized",
	async fn() {
		const { plugin, startSpy, stopSpy } = createSpyPlugin({
			name: "plugin",
			loadStart() {},
			loadStop() {},
		});
		const { adLad, resolveInitialize } = initializingPluginTest(plugin);

		adLad.loadStop();
		assertSpyCalls(startSpy, 0);
		assertSpyCalls(stopSpy, 0);

		await resolveInitialize();
		assertSpyCalls(startSpy, 1);
		assertSpyCalls(stopSpy, 1);

		adLad.loadStart();
		await waitForMicrotasks();
		assertSpyCalls(startSpy, 2);
	},
});

Deno.test({
	name: "loadStart is still called when plugin initialization rejects",
	async fn() {
		const { plugin, startSpy, stopSpy } = createSpyPlugin({
			name: "plugin",
			loadStart() {},
			loadStop() {},
		});
		const { adLad, rejectInitialize } = initializingPluginTest(plugin);

		await waitForMicrotasks();
		assertSpyCalls(startSpy, 0);
		assertSpyCalls(stopSpy, 0);

		await rejectInitialize();
		await waitForMicrotasks();
		assertSpyCalls(startSpy, 1);
		assertSpyCalls(stopSpy, 0);

		adLad.loadStop();
		await waitForMicrotasks();
		assertSpyCalls(startSpy, 1);
		assertSpyCalls(stopSpy, 1);
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
			loadStart() {
				throw trueError;
			},
			async loadStop() {
				throw falseError;
			},
		};
		const adLad = new AdLad([plugin]);

		const consoleErrorSpy = stub(console, "error");
		try {
			adLad.loadStart();
			await waitForMicrotasks();

			adLad.loadStop();
			await waitForMicrotasks();

			assertSpyCalls(consoleErrorSpy, 2);
			assertEquals(
				consoleErrorSpy.calls[0].args[0],
				'An error occurred while trying to change the loading state of the "plugin" plugin:',
			);
			assertStrictEquals(consoleErrorSpy.calls[0].args[1], trueError);
			assertEquals(
				consoleErrorSpy.calls[1].args[0],
				'An error occurred while trying to change the loading state of the "plugin" plugin:',
			);
			assertStrictEquals(consoleErrorSpy.calls[1].args[1], falseError);
		} finally {
			consoleErrorSpy.restore();
		}
	},
});
