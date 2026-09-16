import { assertEquals } from "$std/testing/asserts.ts";
import { assertSpyCall, assertSpyCalls, spy } from "$std/testing/mock.ts";
import { AdLadPlugin } from "../src/AdLad.js";
import { AdLadStorage } from "../src/AdLadStorage.js";
import { assertPromiseResolved } from "./shared.js";

function createSpyPlugin({
	setItem = (_key, _value) => {},
	getItem = (_key) => {},
}: {
	setItem?: (key: string, value: unknown) => void | Promise<void>;
	getItem?: (key: string) => unknown | Promise<unknown>;
} = {}) {
	const plugin = {
		name: "spy plugin",
		setStorageItem(key, value) {
			return setItem(key, value);
		},
		getStorageItem(key) {
			return getItem(key);
		},
	} satisfies AdLadPlugin;

	const setSpy = spy(plugin, "setStorageItem");
	const getSpy = spy(plugin, "getStorageItem");

	return { plugin, setSpy, getSpy };
}

function createMockLocalStorage(throws = false) {
	const values = new Map<string, string>();
	const setSpy = spy((key: string, value: string) => {
		if (throws) throw new Error("the local storage api is not available");
		values.set(key, String(value));
	});
	const getSpy = spy((key: string) => {
		if (throws) throw new Error("the local storage api is not available");
		const value = values.get(key);
		if (value == undefined) return null;
		return value;
	});
	const localStorage = {
		getItem: getSpy,
		setItem: setSpy,
	} as unknown as Storage;
	return { localStorage, setSpy, getSpy };
}

function createMockConsole() {
	const warnSpy = spy();
	const console = {
		warn: warnSpy,
	} as unknown as Console;
	return { console, warnSpy };
}

Deno.test({
	name: "Items are not stored and retrieved until the plugin is ready",
	async fn() {
		const { promise, resolve } = Promise.withResolvers<void>();

		const { plugin, setSpy, getSpy } = createSpyPlugin({
			getItem(_key) {
				return "bar";
			},
		});

		const storage = new AdLadStorage({
			plugin,
			pluginInitializePromise: promise,
		});

		const setPromise = storage.setStorageItem("foo", "foo");
		const getPromise = storage.getStorageItem("bar");

		await assertPromiseResolved(setPromise, false);
		await assertPromiseResolved(getPromise, false);
		assertSpyCalls(setSpy, 0);
		assertSpyCalls(getSpy, 0);

		resolve();

		await assertPromiseResolved(setPromise, true);
		await assertPromiseResolved(getPromise, true);
		assertSpyCalls(setSpy, 1);
		assertSpyCalls(getSpy, 1);

		const result = await getPromise;
		assertEquals(result, "bar");
	},
});

Deno.test({
	name: "setStorageItem and getStorageItem promises don't resolve until the plugin resolves its promises",
	async fn() {
		const { promise: setPluginPromise, resolve: resolveSet } = Promise.withResolvers<void>();
		const { promise: getPluginPromise, resolve: resolveGet } = Promise.withResolvers<void>();

		const { plugin } = createSpyPlugin({
			async setItem(_key, _value) {
				await setPluginPromise;
			},
			async getItem(_key) {
				await getPluginPromise;
				return "bar";
			},
		});

		const storage = new AdLadStorage({
			plugin,
			pluginInitializePromise: Promise.resolve(),
		});

		const setPromise = storage.setStorageItem("foo", "foo");
		await assertPromiseResolved(setPromise, false);

		resolveSet();
		await assertPromiseResolved(setPromise, true);

		const getPromise = storage.getStorageItem("bar");
		await assertPromiseResolved(getPromise, false);

		resolveGet();
		await assertPromiseResolved(getPromise, true);
	},
});

Deno.test({
	name: "Value is undefined when a key doesn't exist",
	async fn() {
		const { localStorage } = createMockLocalStorage();
		const storage = new AdLadStorage({
			plugin: null,
			pluginInitializePromise: null,
			localStorage,
		});

		const value = await storage.getStorageItem("foo");
		assertEquals(value, undefined);
	},
});

Deno.test({
	name: "Item values are cached when requested a second time",
	async fn() {
		const { plugin, getSpy } = createSpyPlugin({
			getItem(_key) {
				return "foo";
			},
		});

		const storage = new AdLadStorage({
			plugin,
			pluginInitializePromise: Promise.resolve(),
		});

		assertSpyCalls(getSpy, 0);

		const result1 = await storage.getStorageItem("foo");
		assertEquals(result1, "foo");
		assertSpyCalls(getSpy, 1);

		const result2 = await storage.getStorageItem("foo");
		assertEquals(result2, "foo");
		assertSpyCalls(getSpy, 1);
	},
});

Deno.test({
	name: "Item values are cached when stored",
	async fn() {
		const { plugin, getSpy } = createSpyPlugin();

		const storage = new AdLadStorage({
			plugin,
			pluginInitializePromise: Promise.resolve(),
		});

		await storage.setStorageItem("foo", "foo");

		assertSpyCalls(getSpy, 0);

		const result1 = await storage.getStorageItem("foo");
		assertEquals(result1, "foo");
		assertSpyCalls(getSpy, 0);

		const result2 = await storage.getStorageItem("foo");
		assertEquals(result2, "foo");
		assertSpyCalls(getSpy, 0);
	},
});

Deno.test({
	name: "setStorageItem on plugin is called even when the value is already cached",
	async fn() {
		const { plugin, setSpy, getSpy } = createSpyPlugin();

		const storage = new AdLadStorage({
			plugin,
			pluginInitializePromise: Promise.resolve(),
		});

		await storage.setStorageItem("foo", "foo");
		assertSpyCalls(setSpy, 1);

		assertSpyCalls(getSpy, 0);

		const result1 = await storage.getStorageItem("foo");
		assertEquals(result1, "foo");
		assertSpyCalls(getSpy, 0);

		await storage.setStorageItem("foo", "bar");
		assertSpyCalls(setSpy, 2);

		const result2 = await storage.getStorageItem("foo");
		assertEquals(result2, "bar");
		assertSpyCalls(getSpy, 0);
	},
});

Deno.test({
	name: "Falls back to localstorage when no plugin is active",
	async fn() {
		const { localStorage, setSpy, getSpy } = createMockLocalStorage();

		const storage1 = new AdLadStorage({
			plugin: null,
			pluginInitializePromise: null,
			localStorage,
		});

		await storage1.setStorageItem("foo", "foo");
		assertSpyCalls(setSpy, 1);

		const storage2 = new AdLadStorage({
			plugin: null,
			pluginInitializePromise: null,
			localStorage,
		});
		const result2 = await storage2.getStorageItem("foo");
		assertEquals(result2, "foo");
		assertSpyCalls(getSpy, 1);
	},
});

Deno.test({
	name: "When localstorage throws, only one warning is logged",
	async fn() {
		const { localStorage } = createMockLocalStorage(true);
		const { console, warnSpy } = createMockConsole();

		const storage = new AdLadStorage({
			plugin: null,
			pluginInitializePromise: null,
			localStorage,
			console,
		});

		await storage.setStorageItem("foo", "foo");
		assertSpyCalls(warnSpy, 1);
		assertSpyCall(warnSpy, 0, {
			args: ["Failed to access localStorage, the user might be browsing in a private window."],
		});

		await storage.setStorageItem("foo", "bar");
		assertSpyCalls(warnSpy, 1);

		const result = await storage.getStorageItem("foo");
		assertEquals(result, "bar");
		assertSpyCalls(warnSpy, 1);
	},
});

Deno.test({
	name: "Falls back to localstorage when plugin doesn't integrate the storage hooks",
	async fn() {
		const { localStorage, setSpy, getSpy } = createMockLocalStorage();

		const storage1 = new AdLadStorage({
			plugin: {
				name: "plugin",
			},
			pluginInitializePromise: Promise.resolve(),
			localStorage,
		});

		await storage1.setStorageItem("foo", "foo");
		assertSpyCalls(setSpy, 1);

		const storage2 = new AdLadStorage({
			plugin: {
				name: "plugin",
			},
			pluginInitializePromise: null,
			localStorage,
		});
		const result = await storage2.getStorageItem("foo");
		assertEquals(result, "foo");
		assertSpyCalls(getSpy, 1);
	},
});

Deno.test({
	name: "Falls back to localstorage when setStorageItem plugin call fails",
	async fn() {
		const { localStorage, setSpy } = createMockLocalStorage();
		const { console, warnSpy } = createMockConsole();
		const { plugin } = createSpyPlugin({
			setItem(_key, _value) {
				throw new Error("custom plugin error");
			},
		});

		const storage = new AdLadStorage({
			plugin,
			pluginInitializePromise: Promise.resolve(),
			localStorage,
			console,
		});

		await storage.setStorageItem("foo", "foo");
		assertSpyCalls(setSpy, 1);
		assertSpyCalls(warnSpy, 1);
		assertSpyCall(warnSpy, 0, {
			args: [
				`Failed to store data via the "spy plugin" plugin. Falling back to localStorage.\nError: custom plugin error`,
			],
		});
	},
});

Deno.test({
	name: "Falls back to localstorage when getStorageItem plugin call fails",
	async fn() {
		const { localStorage, getSpy, setSpy } = createMockLocalStorage();
		setSpy("foo", '"bar"');
		const { console, warnSpy } = createMockConsole();

		const { plugin } = createSpyPlugin({
			getItem(_key) {
				throw new Error("custom plugin error");
			},
		});

		const storage = new AdLadStorage({
			plugin,
			pluginInitializePromise: Promise.resolve(),
			localStorage,
			console,
		});

		const result = await storage.getStorageItem("foo");
		assertSpyCalls(getSpy, 1);
		assertSpyCalls(warnSpy, 1);
		assertSpyCall(warnSpy, 0, {
			args: [
				`Failed to retrieve data from the "spy plugin" plugin. Falling back to localStorage.\nError: custom plugin error`,
			],
		});
		assertEquals(result, "bar");
	},
});

Deno.test({
	name: "Values are always serialized to json even when no plugin is active",
	async fn() {
		const { localStorage } = createMockLocalStorage();

		const storage = new AdLadStorage({
			plugin: null,
			pluginInitializePromise: null,
			localStorage,
		});

		async function test(setValue: unknown, expectedValue: unknown) {
			await storage.setStorageItem("value", setValue);

			const result = await storage.getStorageItem("value");
			assertEquals(result, expectedValue);
		}

		await test({
			date: new Date("2026-07-28T15:53:55.353Z"),
			map: new Map([["a", 1]]),
			fn: () => {},
			undefinedValue: undefined,
		}, {
			date: "2026-07-28T15:53:55.353Z",
			map: {},
		});

		await test(false, false);
		await test(true, true);
		await test("str", "str");
		await test(42, 42);
		await test(null, null);
		await test(undefined, undefined);
	},
});

Deno.test({
	name: "Values are always serialized to json even when the plugin allows non-json values",
	async fn() {
		const storedItems = new Map<string, unknown>();
		const { plugin } = createSpyPlugin({
			setItem(key, value) {
				storedItems.set(key, value);
			},
			getItem(key) {
				return storedItems.get(key);
			},
		});

		const storage1 = new AdLadStorage({
			plugin,
			pluginInitializePromise: Promise.resolve(),
		});

		await storage1.setStorageItem("foo", {
			date: new Date("2026-07-28T15:53:55.353Z"),
			map: new Map([["a", 1]]),
			fn: () => {},
			undefinedValue: undefined,
		});

		const storage2 = new AdLadStorage({
			plugin,
			pluginInitializePromise: Promise.resolve(),
		});

		const result = await storage2.getStorageItem("foo");
		assertEquals(result, {
			date: "2026-07-28T15:53:55.353Z",
			map: {},
		});
	},
});

Deno.test({
	name: "Values are always serialized to json, even when the plugin currently has non json values stored",
	async fn() {
		const storage = new AdLadStorage({
			plugin: {
				name: "plugin",
				getStorageItem(_key) {
					return {
						date: new Date("2026-07-28T15:53:55.353Z"),
						fn: () => {},
					};
				},
			},
			pluginInitializePromise: Promise.resolve(),
		});

		const result = await storage.getStorageItem("foo");
		assertEquals(result, {
			date: "2026-07-28T15:53:55.353Z",
		});
	},
});

Deno.test({
	name: "Setting and getting before the plugin is ready still uses the cached value",
	async fn() {
		const { promise, resolve } = Promise.withResolvers<void>();

		const { plugin, setSpy, getSpy } = createSpyPlugin();

		const storage = new AdLadStorage({
			plugin,
			pluginInitializePromise: promise,
		});

		storage.setStorageItem("foo", "foo");
		const getPromise = storage.getStorageItem("foo");

		resolve();

		const result = await getPromise;
		assertEquals(result, "foo");

		assertSpyCalls(setSpy, 1);
		assertSpyCalls(getSpy, 0);
	},
});

Deno.test({
	name: "Setting before the plugin is ready and getting after the plugin is ready still uses the cached value",
	async fn() {
		const { promise, resolve } = Promise.withResolvers<void>();

		const { plugin, getSpy } = createSpyPlugin();

		const storage = new AdLadStorage({
			plugin,
			pluginInitializePromise: promise,
		});

		storage.setStorageItem("foo", "foo");

		resolve();

		const result = await storage.getStorageItem("foo");
		assertEquals(result, "foo");

		assertSpyCalls(getSpy, 0);
	},
});
