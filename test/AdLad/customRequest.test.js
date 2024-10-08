import { assertSpyCall, assertSpyCalls, spy } from "$std/testing/mock.ts";
import { AdLad } from "../../src/AdLad.js";
import {
	assertIsType,
	assertPromiseResolved,
	initializingPluginTest,
	testTypes,
	waitForMicrotasks,
} from "../shared.js";

Deno.test({
	name: "Does nothing when no plugin is active",
	fn() {
		const adLad = new AdLad();

		// @ts-ignore no plugins
		adLad.customRequest("command", "arg1", "arg2");
		// @ts-ignore no plugins
		adLad.customRequestSpecific("non-existent", "command", "arg1", "arg2");
	},
});

Deno.test({
	name: "Does nothing when a plugin doesn't have custom requests",
	fn() {
		const adLad = new AdLad([
			{
				name: "plugin",
			},
		]);

		// @ts-ignore no custom requests
		adLad.customRequest("command", "arg1", "arg2");
		// @ts-ignore no plugins
		adLad.customRequestSpecific("plugin", "command", "arg1", "arg2");
	},
});

Deno.test({
	name: "Does nothing when a plugin doesn't implement the command",
	fn() {
		const adLad = new AdLad([
			{
				name: "plugin",
				customRequests: {
					foo() {},
				},
			},
		]);

		// @ts-ignore non-existent
		adLad.customRequest("nonExistent", "arg1", "arg2");
		// @ts-ignore no plugins
		adLad.customRequestSpecific("plugin", "nonExistent", "arg1", "arg2");
	},
});

function createSpyPlugin({
	name = "plugin",
} = {}) {
	const plugin = /** @type {const} @satisfies {import("../../src/AdLad.js").AdLadPlugin} */ ({
		name,
		customRequests: {
			/**
			 * @param {number} _num
			 * @param {string} _str
			 */
			foo(_num, _str) {},
		},
	});
	const fooSpy = spy(plugin.customRequests, "foo");
	return { plugin, fooSpy };
}

Deno.test({
	name: "Fires custom requests on the active plugin",
	async fn() {
		const { plugin: activePlugin, fooSpy: activeFooSpy } = createSpyPlugin({ name: "active-plugin" });
		const { plugin: inactivePlugin, fooSpy: inactiveFooSpy } = createSpyPlugin({ name: "inactive-plugin" });

		const adLad = new AdLad([activePlugin, inactivePlugin]);

		// Wait for plugin initialization
		await waitForMicrotasks();

		await adLad.customRequest("foo", 3, "bar");
		assertSpyCalls(inactiveFooSpy, 0);
		assertSpyCalls(activeFooSpy, 1);
		assertSpyCall(activeFooSpy, 0, {
			args: [3, "bar"],
		});
	},
});

Deno.test({
	name: "Only fires after the plugin has initialized",
	async fn() {
		const { plugin, fooSpy } = createSpyPlugin();
		const { adLad, resolveInitialize } = initializingPluginTest(plugin);

		const promise = adLad.customRequest("foo", 3, "bar");

		await waitForMicrotasks();
		assertSpyCalls(fooSpy, 0);
		await assertPromiseResolved(promise, false);

		await resolveInitialize();
		assertSpyCalls(fooSpy, 1);
		await assertPromiseResolved(promise, true);
	},
});

function createAdLadWithMultipleCustomRequestPlugins() {
	const pluginA = /** @type {const} */ ({
		name: "pluginWithFoo",
		customRequests: {
			/**
			 * @param {number} _num
			 * @param {string} _str
			 */
			foo(_num, _str) {
				return true;
			},
		},
	});
	const pluginB = /** @type {const} */ ({
		name: "pluginWithBar",
		customRequests: {
			/**
			 * @param {number} _num
			 * @param {string} _str
			 */
			bar(_num, _str) {
				return true;
			},
		},
	});
	const pluginC = /** @type {const} */ ({
		name: "pluginWithEmptyCustomRequests",
		customRequests: {},
	});
	const pluginD = /** @type {const} */ ({
		name: "pluginWithoutCustomRequests",
	});
	/** @type {AdLad<typeof pluginA | typeof pluginB | typeof pluginC | typeof pluginD>} */
	const adLad = new AdLad([pluginA, pluginB, pluginC, pluginD]);
	return adLad;
}

testTypes({
	name: "customRequest arguments and return type are inferred from the command",
	fn() {
		const adLad = createAdLadWithMultipleCustomRequestPlugins();

		// @ts-expect-error non existent command
		adLad.customRequest("non-existent");
		// @ts-expect-error missing arguments
		adLad.customRequest("foo");
		// @ts-expect-error too many arguments
		adLad.customRequest("foo", 42, "str", "too many");
		// @ts-expect-error incorrect arguments
		adLad.customRequest("foo", "not a number", "str");
		// Exactly right
		const result = adLad.customRequest("foo", 42, "str");
		adLad.customRequest("bar", 42, "str");

		// Verify that the type is a `Promise<boolean | undefined>` and nothing else
		const booleanPromise = Promise.resolve(/** @type {boolean | undefined} */ (true));
		assertIsType(booleanPromise, result);

		const strPromise = Promise.resolve("string");
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(strPromise, result);
	},
});

testTypes({
	name: "customRequestSpecific arguments and return type are inferred from the command",
	fn() {
		const adLad = createAdLadWithMultipleCustomRequestPlugins();

		// @ts-expect-error non existent command
		adLad.customRequestSpecific("pluginWithFoo", "non-existent");
		// @ts-expect-error missing arguments
		adLad.customRequestSpecific("pluginWithFoo", "foo");
		// @ts-expect-error too many arguments
		adLad.customRequestSpecific("pluginWithFoo", "foo", 42, "str", "too many");
		// @ts-expect-error incorrect arguments
		adLad.customRequestSpecific("pluginWithFoo", "foo", "not a number", "str");
		// Exactly right
		const result = adLad.customRequestSpecific("pluginWithFoo", "foo", 42, "str");
		adLad.customRequestSpecific("pluginWithBar", "bar", 42, "str");

		// @ts-expect-error plugin with no custom requests
		adLad.customRequestSpecific("pluginWithEmptyCustomRequests", "plugin has no custom requests");
		// @ts-expect-error plugin with no custom requests
		adLad.customRequestSpecific("pluginWithoutCustomRequests", "plugin has no custom requests");

		// Verify that the type is a `Promise<boolean | undefined>` and nothing else
		const booleanPromise = Promise.resolve(/** @type {boolean | undefined} */ (true));
		assertIsType(booleanPromise, result);

		const strPromise = Promise.resolve("string");
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(strPromise, result);
	},
});

testTypes({
	name: "customRequestSpecific only allows commands from the specified plugin",
	fn() {
		const pluginA = /** @type {const} */ ({
			name: "plugin-a",
			customRequests: {
				/**
				 * @param {number} _num
				 */
				foo(_num) {},
			},
		});
		const pluginB = /** @type {const} */ ({
			name: "plugin-b",
			customRequests: {
				/**
				 * @param {string} _str
				 */
				bar(_str) {},
			},
		});
		const adLad = new AdLad([pluginA, pluginB]);

		adLad.customRequestSpecific("plugin-a", "foo", 42);
		adLad.customRequestSpecific("plugin-b", "bar", "str");

		// @ts-expect-error incorrect command
		adLad.customRequestSpecific("plugin-a", "bar");
		// @ts-expect-error incorrect command
		adLad.customRequestSpecific("plugin-b", "foo");
	},
});
