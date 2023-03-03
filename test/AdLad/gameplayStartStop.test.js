import { assertEquals } from "$std/testing/asserts.ts";
import { assertSpyCalls, spy } from "$std/testing/mock.ts";
import { AdLad } from "../../src/AdLad.js";
import { initializingPluginTest, waitForMicroTasks } from "../shared.js";

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
		await waitForMicroTasks();
		assertSpyCalls(startSpy, 1);
		adLad.gameplayStop();
		await waitForMicroTasks();
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
		await waitForMicroTasks();
		assertSpyCalls(startSpy, 1);
		adLad.gameplayStop();
		await waitForMicroTasks();
		adLad.gameplayStart();
		await waitForMicroTasks();
		assertSpyCalls(startSpy, 2);
		adLad.gameplayStop();
		await waitForMicroTasks();
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
		await waitForMicroTasks();
		adLad.gameplayStop();
		await waitForMicroTasks();
		assertSpyCalls(stopSpy, 1);
		adLad.gameplayStart();
		await waitForMicroTasks();
		adLad.gameplayStop();
		await waitForMicroTasks();
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
