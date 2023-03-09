import { assertSpyCall, assertSpyCalls, spy, stub } from "$std/testing/mock.ts";
import { assertEquals, assertThrows } from "$std/testing/asserts.ts";
import { AdLad } from "../../src/AdLad.js";
import { waitForMicrotasks } from "../shared.js";

Deno.test({
	name: "Plugins are initialized when they are chosen as active plugin",
	fn() {
		/** @type {import("../../src/AdLad.js").AdLadPlugin} */
		const plugin = {
			name: "plugin",
			initialize() {},
		};
		const initializeSpy = spy(plugin, "initialize");
		new AdLad([plugin]);
		assertSpyCalls(initializeSpy, 1);
	},
});

Deno.test({
	name: "Plugins that don't request to be active are not initialized",
	fn() {
		const activePlugin = {
			name: "active",
		};

		/** @type {import("../../src/AdLad.js").AdLadPlugin} */
		const inactivePlugin = {
			name: "inactive",
			initialize() {},
			shouldBeActive: () => false,
		};

		const initializeSpy = spy(inactivePlugin, "initialize");
		new AdLad([activePlugin, inactivePlugin]);
		assertSpyCalls(initializeSpy, 0);
	},
});

Deno.test({
	name: "Errors during initialization are caught",
	async fn() {
		const consoleWarnSpy = stub(console, "warn", () => {});
		try {
			const error = new Error("oh no");
			/** @type {import("../../src/AdLad.js").AdLadPlugin} */
			const plugin = {
				name: "plugin",
				initialize() {
					throw error;
				},
			};

			const adLad = new AdLad([plugin]);

			assertSpyCalls(consoleWarnSpy, 1);
			assertSpyCall(consoleWarnSpy, 0, {
				args: [
					'The "plugin" AdLad plugin failed to initialize',
					error,
				],
			});

			// other calls should still work as well
			assertEquals(await adLad.showFullScreenAd(), {
				didShowAd: false,
				errorReason: "not-supported",
			});
		} finally {
			consoleWarnSpy.restore();
		}
	},
});

Deno.test({
	name: "Errors during async initialization are caught",
	async fn() {
		const consoleWarnSpy = stub(console, "warn", () => {});
		try {
			const error = new Error("oh no");
			/** @type {import("../../src/AdLad.js").AdLadPlugin} */
			const plugin = {
				name: "plugin",
				async initialize() {
					await waitForMicrotasks();
					throw error;
				},
			};

			const adLad = new AdLad([plugin]);
			await waitForMicrotasks();

			assertSpyCalls(consoleWarnSpy, 1);
			assertSpyCall(consoleWarnSpy, 0, {
				args: [
					'The "plugin" AdLad plugin failed to initialize',
					error,
				],
			});

			// other calls should still work as well
			assertEquals(await adLad.showFullScreenAd(), {
				didShowAd: false,
				errorReason: "not-supported",
			});
		} finally {
			consoleWarnSpy.restore();
		}
	},
});

Deno.test({
	name: "providing a plugin with an invalid name throws",
	fn() {
		const invalidNames = [
			"invalid name",
			"invalidName",
			"INVALID_NAME",
			"-invalid",
			"invalid-",
			"_invalid",
			"invalid_",
		];
		for (const name of invalidNames) {
			assertThrows(
				() => {
					new AdLad([
						{
							name,
						},
					]);
				},
				Error,
				`The plugin "${name}" has an invalid name.`,
			);
		}
	},
});

Deno.test({
	name: "providing a plugin with a valid name doesn't throw",
	fn() {
		const validNames = [
			"valid-name",
			"valid_name",
			"validname",
			"a",
		];
		for (const name of validNames) {
			new AdLad([
				{
					name,
				},
			]);
		}
	},
});
