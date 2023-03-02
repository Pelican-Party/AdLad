import { assertEquals } from "$std/testing/asserts.ts";
import { assertSpyCalls, spy } from "$std/testing/mock.ts";
import { AdLad } from "../../src/AdLad.js";
import { waitForMicroTasks } from "../shared.js";

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
		/** @type {import("../../src/AdLad.js").AdLadPlugin} */
		const plugin = {
			name: "plugin",
			gameplayStart() {},
			gameplayStop() {},
		};

		const adLad = new AdLad([plugin]);
		const startSpy = spy(plugin, "gameplayStart");
		const stopSpy = spy(plugin, "gameplayStop");

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
		/** @type {import("../../src/AdLad.js").AdLadPlugin} */
		const plugin = {
			name: "plugin",
			gameplayStart() {},
		};
		const startSpy = spy(plugin, "gameplayStart");
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
		/** @type {import("../../src/AdLad.js").AdLadPlugin} */
		const plugin = {
			name: "plugin",
			gameplayStop() {},
		};
		const stopSpy = spy(plugin, "gameplayStop");
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
