import { assertEquals } from "$std/testing/asserts.ts";
import { assertSpyCalls, spy } from "$std/testing/mock.ts";
import { AdLad } from "../../src/AdLad.js";
import { waitForMicroTasks } from "../shared.js";

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
		/** @type {import("../../src/AdLad.js").AdLadPlugin} */
		const plugin = {
			name: "plugin",
			loadStart() {},
			loadStop() {},
		};

		const adLad = new AdLad([plugin]);
		const startSpy = spy(plugin, "loadStart");
		const stopSpy = spy(plugin, "loadStop");

		adLad.loadStop();
		await waitForMicroTasks();
		assertSpyCalls(stopSpy, 1);
		adLad.loadStart();
		await waitForMicroTasks();
		assertSpyCalls(startSpy, 1);
	},
});

Deno.test({
	name: "A plugin that only supports load start",
	async fn() {
		/** @type {import("../../src/AdLad.js").AdLadPlugin} */
		const plugin = {
			name: "plugin",
			loadStart() {},
		};
		const startSpy = spy(plugin, "loadStart");
		const adLad = new AdLad([plugin]);

		adLad.loadStop();
		await waitForMicroTasks();
		adLad.loadStart();
		await waitForMicroTasks();
		assertSpyCalls(startSpy, 1);
		adLad.loadStop();
		await waitForMicroTasks();
		adLad.loadStart();
		await waitForMicroTasks();
		assertSpyCalls(startSpy, 2);
		adLad.loadStop();
		await waitForMicroTasks();
	},
});

Deno.test({
	name: "A plugin that only supports load stop",
	async fn() {
		/** @type {import("../../src/AdLad.js").AdLadPlugin} */
		const plugin = {
			name: "plugin",
			loadStop() {},
		};
		const stopSpy = spy(plugin, "loadStop");
		const adLad = new AdLad([plugin]);

		adLad.loadStart();
		await waitForMicroTasks();
		adLad.loadStop();
		await waitForMicroTasks();
		assertSpyCalls(stopSpy, 1);
		adLad.loadStart();
		await waitForMicroTasks();
		adLad.loadStop();
		await waitForMicroTasks();
		assertSpyCalls(stopSpy, 2);
	},
});
