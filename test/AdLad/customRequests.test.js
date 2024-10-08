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
		adLad.customRequests.command("arg1", "arg2");
		// @ts-ignore no plugins
		adLad.customRequestsForPlugin("non-existent").command("arg1", "arg2");
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
		adLad.customRequests.command("arg1", "arg2");
		// @ts-ignore no plugins
		adLad.customRequestsForPlugin("plugin").command("arg1", "arg2");
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
		adLad.customRequests.nonExistent("arg1", "arg2");
		// @ts-ignore no plugins
		adLad.customRequestsForPlugin("plugin").nonExistent("arg1", "arg2");
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

		await adLad.customRequests.foo(3, "bar");
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

		const promise = adLad.customRequests.foo(3, "bar");

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
		adLad.customRequests.nonExistent();
		// @ts-expect-error missing arguments
		adLad.customRequests.foo();
		// @ts-expect-error too many arguments
		adLad.customRequests.foo(42, "str", "too many");
		// @ts-expect-error incorrect arguments
		adLad.customRequests.foo("not a number", "str");
		// Exactly right
		const result = adLad.customRequests.foo(42, "str");
		adLad.customRequests.bar(42, "str");

		// Verify that the type is a `Promise<boolean | undefined>` and nothing else
		const booleanPromise = Promise.resolve(/** @type {boolean | undefined} */ (true));
		assertIsType(booleanPromise, result);

		const strPromise = Promise.resolve("string");
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(strPromise, result);
	},
});

testTypes({
	name: "customRequestsForPlugin arguments and return type are inferred from the command",
	fn() {
		const adLad = createAdLadWithMultipleCustomRequestPlugins();

		// @ts-expect-error non existent command
		adLad.customRequestsForPlugin("pluginWithFoo").nonExistent();
		// @ts-expect-error missing arguments
		adLad.customRequestsForPlugin("pluginWithFoo").foo();
		// @ts-expect-error too many arguments
		adLad.customRequestsForPlugin("pluginWithFoo").foo(42, "str", "too many");
		// @ts-expect-error incorrect arguments
		adLad.customRequestsForPlugin("pluginWithFoo").foo("not a number", "str");
		// Exactly right
		const result = adLad.customRequestsForPlugin("pluginWithFoo").foo(42, "str");
		adLad.customRequestsForPlugin("pluginWithBar").bar(42, "str");

		// @ts-expect-error plugin with no custom requests
		adLad.customRequestsForPlugin("pluginWithEmptyCustomRequests").nonExistent();
		// @ts-expect-error plugin with no custom requests
		adLad.customRequestsForPlugin("pluginWithoutCustomRequests").nonExistent();

		// Verify that the type is a `Promise<boolean | undefined>` and nothing else
		const booleanPromise = Promise.resolve(/** @type {boolean | undefined} */ (true));
		assertIsType(booleanPromise, result);

		const strPromise = Promise.resolve("string");
		// @ts-expect-error Verify that the type isn't 'any'
		assertIsType(strPromise, result);
	},
});

testTypes({
	name: "customRequestsForPlugin only allows commands from the specified plugin",
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

		adLad.customRequestsForPlugin("plugin-a").foo(42);
		adLad.customRequestsForPlugin("plugin-b").bar("str");

		// @ts-expect-error incorrect command
		adLad.customRequestsForPlugin("plugin-a").bar();
		// @ts-expect-error incorrect command
		adLad.customRequestsForPlugin("plugin-b").foo();
	},
});
