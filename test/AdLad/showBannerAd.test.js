import { assertSpyCall, assertSpyCalls, spy, stub } from "$std/testing/mock.ts";
import { assertEquals, assertRejects } from "$std/testing/asserts.ts";
import { AdLad } from "../../src/AdLad.js";
import {
	assertPromiseResolved,
	createOnBooleanChangeSpy,
	initializingPluginTest,
	testTypes,
	waitForMicrotasks,
} from "../shared.js";
import { HtmlElement } from "$fake-dom/FakeHtmlElement.js";
import { runWithDomAsync } from "$fake-dom/FakeDocument.js";

/**
 * @param {() => Promise<void>} fn
 */
async function runWithDomAndElementAsync(fn) {
	await runWithDomAsync(async () => {
		const oldHtmlElement = globalThis.HTMLElement;
		globalThis.HTMLElement = HtmlElement;
		try {
			await fn();
		} finally {
			globalThis.HTMLElement = oldHtmlElement;
		}
	});
}

function createMockElement({
	width = 300,
	height = 200,
	id = "",
} = {}) {
	const el = new HtmlElement({ tagName: "div", clientWidth: width, clientHeight: height });
	el.id = id;
	return el;
}

Deno.test({
	name: "Does nothing when no plugin is active",
	fn() {
		const adLad = new AdLad();
		const changeSpy = createOnBooleanChangeSpy();
		adLad.onCanShowBannerAdChange(changeSpy);

		assertEquals(adLad.canShowBannerAd, false);
		assertSpyCalls(changeSpy, 0);

		const el = createMockElement();
		adLad.showBannerAd(el);
		adLad.destroyBannerAd(el);
	},
});

Deno.test({
	name: "Does nothing when the plugin doesn't implement it",
	fn() {
		const adLad = new AdLad([
			{
				name: "plugin",
			},
		]);
		const changeSpy = createOnBooleanChangeSpy();
		adLad.onCanShowBannerAdChange(changeSpy);

		assertEquals(adLad.canShowBannerAd, false);
		assertSpyCalls(changeSpy, 0);

		const el = createMockElement();
		adLad.showBannerAd(el);
		adLad.destroyBannerAd(el);
	},
});

function createSpyPlugin({
	name = "plugin",
} = {}) {
	/** @type {import("../../src/AdLad.js").AdLadPlugin} */
	const plugin = {
		name,
		showBannerAd() {},
		destroyBannerAd() {},
	};
	const castPlugin = /** @type {Required<import("../../src/AdLad.js").AdLadPlugin>} */ (plugin);
	const showBannerSpy = spy(castPlugin, "showBannerAd");
	const destroyBannerSpy = spy(castPlugin, "destroyBannerAd");
	return { plugin, showBannerSpy, destroyBannerSpy };
}

Deno.test({
	name: "canShowBannerAd becomes true once initialized",
	async fn() {
		await runWithDomAsync(async () => {
			const { plugin } = createSpyPlugin();
			const { adLad, resolveInitialize } = initializingPluginTest(plugin);
			const changeSpy = createOnBooleanChangeSpy();
			adLad.onCanShowBannerAdChange(changeSpy);

			assertEquals(adLad.canShowBannerAd, false);
			assertSpyCalls(changeSpy, 0);

			await resolveInitialize();

			assertEquals(adLad.canShowBannerAd, true);
			assertSpyCalls(changeSpy, 1);
			assertSpyCall(changeSpy, 0, {
				args: [true],
			});
		});
	},
});

Deno.test({
	name: "Passes showBannerAd and destroyBannerAd requests on and creates/destroys a child element",
	async fn() {
		await runWithDomAndElementAsync(async () => {
			const { plugin, showBannerSpy, destroyBannerSpy } = createSpyPlugin();
			const adLad = new AdLad([plugin]);
			const elementId = "the_element_id";
			const el = createMockElement({ id: elementId });

			const oldGetElementById = document.getElementById;
			document.getElementById = (id) => {
				if (id == elementId) {
					return el;
				}
				return null;
			};

			try {
				await adLad.showBannerAd(el);

				assertSpyCalls(destroyBannerSpy, 0);
				assertSpyCalls(showBannerSpy, 1);
				const childEl = showBannerSpy.calls[0].args[0].el;
				assertEquals(showBannerSpy.calls[0].args[0].id, childEl.id);
				assertEquals(showBannerSpy.calls[0].args[0].width, 300);
				assertEquals(showBannerSpy.calls[0].args[0].height, 200);
				assertEquals(showBannerSpy.calls[0].args[1], undefined);

				assertEquals(childEl.style.width, "100%");
				assertEquals(childEl.style.height, "100%");

				await adLad.destroyBannerAd(el);

				assertEquals(el.children.length, 0);
				assertSpyCalls(showBannerSpy, 1);
				assertSpyCalls(destroyBannerSpy, 1);

				// Same thing but by id
				await adLad.showBannerAd(elementId);

				assertEquals(el.children.length, 1);
				assertSpyCalls(showBannerSpy, 2);
				assertSpyCalls(destroyBannerSpy, 1);

				await adLad.destroyBannerAd(elementId);

				assertEquals(el.children.length, 0);
				assertSpyCalls(showBannerSpy, 2);
				assertSpyCalls(destroyBannerSpy, 2);
			} finally {
				document.getElementById = oldGetElementById;
			}
		});
	},
});

Deno.test({
	name: "showBannerAd and destroyBannerAd throw when passing non existent id",
	async fn() {
		await runWithDomAsync(async () => {
			const oldGetElementById = document.getElementById;
			document.getElementById = (_id) => null;
			try {
				const { plugin } = createSpyPlugin();
				const adLad = new AdLad([plugin]);

				await assertRejects(
					async () => {
						await adLad.showBannerAd("non existent");
					},
					Error,
					'Element with id "non existent" was not found.',
				);
				await assertRejects(
					async () => {
						await adLad.destroyBannerAd("non existent");
					},
					Error,
					'Element with id "non existent" was not found.',
				);
			} finally {
				document.getElementById = oldGetElementById;
			}
		});
	},
});

Deno.test({
	name: "Doesn't fire on plugin until it has been initialized",
	async fn() {
		await runWithDomAndElementAsync(async () => {
			const { plugin, showBannerSpy, destroyBannerSpy } = createSpyPlugin();
			const { adLad, resolveInitialize } = initializingPluginTest(plugin);

			const el = createMockElement();
			const promise1 = adLad.showBannerAd(el);
			const promise2 = adLad.destroyBannerAd(el);

			await waitForMicrotasks();
			assertSpyCalls(showBannerSpy, 0);
			assertSpyCalls(destroyBannerSpy, 0);
			await assertPromiseResolved(promise1, false);
			await assertPromiseResolved(promise2, false);

			await resolveInitialize();
			assertSpyCalls(showBannerSpy, 1);
			assertSpyCalls(destroyBannerSpy, 1);
			await assertPromiseResolved(promise1, true);
			await assertPromiseResolved(promise2, true);
		});
	},
});

Deno.test({
	name: "Options are passed to the right plugin",
	async fn() {
		await runWithDomAndElementAsync(async () => {
			const { plugin: rightPlugin, showBannerSpy: showBannerRightSpy, destroyBannerSpy: destroyBannerRightSpy } =
				createSpyPlugin({
					name: "right-plugin",
				});
			const { plugin: wrongPlugin, showBannerSpy: showBannerWrongSpy, destroyBannerSpy: destroyBannerWrongSpy } =
				createSpyPlugin({
					name: "wrong-plugin",
				});
			const adLad = new AdLad([rightPlugin, wrongPlugin]);
			const el = createMockElement();

			adLad.showBannerAd(el, {
				pluginOptions: {
					"right-plugin": {
						foo: "foo",
						bar: "bar",
					},
					"wrong-plugin": {
						baz: "baz",
					},
				},
			});

			assertSpyCalls(showBannerRightSpy, 1);
			assertSpyCalls(showBannerWrongSpy, 0);
			assertEquals(showBannerRightSpy.calls[0].args[1], {
				foo: "foo",
				bar: "bar",
			});

			adLad.destroyBannerAd(el, {
				pluginOptions: {
					"right-plugin": {
						foo: "foo",
						bar: "bar",
					},
					"wrong-plugin": {
						baz: "baz",
					},
				},
			});

			assertSpyCalls(destroyBannerRightSpy, 1);
			assertSpyCalls(destroyBannerWrongSpy, 0);
			assertEquals(destroyBannerRightSpy.calls[0].args[1], {
				foo: "foo",
				bar: "bar",
			});
		});
	},
});

testTypes({
	name: "showBanner plugin options are inferred from the plugins passed to the constructor",
	fn() {
		const pluginA = /** @type {const} */ ({
			name: "plugin-a",
			/**
			 * @param {import("../../src/AdLad.js").ShowBannerAdPluginOptions} _opts
			 * @param {Object} _userOpts
			 * @param {string} _userOpts.foo
			 * @param {number} _userOpts.bar
			 */
			showBannerAd(_opts, _userOpts) {},
			/**
			 * @param {import("../../src/AdLad.js").DestroyBannerAdPluginOptions} _opts
			 * @param {Object} _userOpts
			 * @param {string} _userOpts.foo
			 * @param {number} _userOpts.bar
			 */
			destroyBannerAd(_opts, _userOpts) {},
		});

		const pluginB = /** @type {const} */ ({
			name: "plugin-b",
			/**
			 * @param {import("../../src/AdLad.js").ShowBannerAdPluginOptions} _opts
			 * @param {Object} _userOpts
			 * @param {boolean} _userOpts.baz
			 */
			showBannerAd(_opts, _userOpts) {},
			/**
			 * @param {import("../../src/AdLad.js").DestroyBannerAdPluginOptions} _opts
			 * @param {Object} _userOpts
			 * @param {boolean} _userOpts.baz
			 */
			destroyBannerAd(_opts, _userOpts) {},
		});

		const pluginC = /** @type {const} */ ({
			name: "plugin-without-implemented-banner-ad",
		});

		const pluginD = /** @type {const} */ ({
			name: "plugin-without-args",
			/**
			 * @param {import("../../src/AdLad.js").ShowBannerAdPluginOptions} _opts
			 */
			showBannerAd(_opts) {},
			/**
			 * @param {import("../../src/AdLad.js").DestroyBannerAdPluginOptions} _opts
			 */
			destroyBannerAd(_opts) {},
		});

		const adLad = new AdLad({
			plugins: [pluginA, pluginB, pluginC, pluginD],
		});
		const el = createMockElement();

		adLad.showBannerAd(el, {
			pluginOptions: {
				"plugin-a": {
					foo: "str",
					bar: 23,
				},
				"plugin-b": {
					baz: true,
				},
			},
		});
		adLad.destroyBannerAd(el, {
			pluginOptions: {
				"plugin-a": {
					foo: "str",
					bar: 23,
				},
				"plugin-b": {
					baz: true,
				},
			},
		});

		adLad.showBannerAd(el, {
			pluginOptions: {
				"plugin-a": {
					foo: "str",
					bar: 23,
					// @ts-expect-error It should only allow known properties
					nonExistent: true,
				},
				"plugin-b": {
					baz: true,
					// @ts-expect-error It should only allow known properties
					nonExistent: true,
				},
			},
		});
		adLad.destroyBannerAd(el, {
			pluginOptions: {
				"plugin-a": {
					foo: "str",
					bar: 23,
					// @ts-expect-error It should only allow known properties
					nonExistent: true,
				},
				"plugin-b": {
					baz: true,
					// @ts-expect-error It should only allow known properties
					nonExistent: true,
				},
			},
		});

		adLad.showBannerAd(el, {
			pluginOptions: {
				// @ts-expect-error It should enforce use of all required properties (bar is missing)
				"plugin-a": {
					foo: "str",
				},
				"plugin-b": {
					baz: true,
				},
			},
		});
		adLad.destroyBannerAd(el, {
			pluginOptions: {
				// @ts-expect-error It should enforce use of all required properties (bar is missing)
				"plugin-a": {
					foo: "str",
				},
				"plugin-b": {
					baz: true,
				},
			},
		});

		adLad.showBannerAd(el, {
			// @ts-expect-error It should emit when a plugin that requires options is missing.
			pluginOptions: {},
		});
		adLad.destroyBannerAd(el, {
			// @ts-expect-error It should emit when a plugin that requires options is missing.
			pluginOptions: {},
		});

		// TODO #19 In the future we might want to emit when the options object is missing as well.
		adLad.showBannerAd(el);
		adLad.showBannerAd(el, {});
		adLad.destroyBannerAd(el);
		adLad.destroyBannerAd(el, {});
	},
});

Deno.test({
	name: "Plugin that fails to initialize",
	async fn() {
		await runWithDomAndElementAsync(async () => {
			const { plugin, showBannerSpy, destroyBannerSpy } = createSpyPlugin();
			plugin.initialize = () => {
				throw new Error("oh no");
			};

			const consoleStub = stub(console, "warn", () => {});
			try {
				const adLad = new AdLad([plugin]);
				await waitForMicrotasks();

				assertEquals(adLad.canShowBannerAd, false);

				const el = createMockElement();
				await adLad.showBannerAd(el);
				await adLad.destroyBannerAd(el);
				assertSpyCalls(showBannerSpy, 0);
				assertSpyCalls(destroyBannerSpy, 0);
			} finally {
				consoleStub.restore();
			}
		});
	},
});

Deno.test({
	name: "Calling showBannerAd on the same element twice throws",
	async fn() {
		await runWithDomAndElementAsync(async () => {
			const { plugin } = createSpyPlugin();
			const adLad = new AdLad([plugin]);

			const el = createMockElement();
			await adLad.showBannerAd(el);

			await assertRejects(
				async () => {
					await adLad.showBannerAd(el);
				},
				Error,
				"A banner ad was already created using this element",
			);
		});
	},
});

Deno.test({
	name: "Banner ads get destroyed when AdLad is disposed",
	async fn() {
		await runWithDomAndElementAsync(async () => {
			const { plugin, showBannerSpy, destroyBannerSpy } = createSpyPlugin();
			const adLad = new AdLad([plugin]);

			const el1 = createMockElement();
			await adLad.showBannerAd(el1);

			const el2 = createMockElement();
			await adLad.showBannerAd(el2);
			await adLad.destroyBannerAd(el2);

			const el3 = createMockElement();
			await adLad.showBannerAd(el3);

			await waitForMicrotasks();
			assertSpyCalls(showBannerSpy, 3);
			assertSpyCalls(destroyBannerSpy, 1);

			adLad.dispose();
			assertSpyCalls(destroyBannerSpy, 3);
		});
	},
});

Deno.test({
	name: "Creating or destroying a banner ad after disposing AdLad should throw",
	async fn() {
		await runWithDomAndElementAsync(async () => {
			const { plugin } = createSpyPlugin();
			const adLad = new AdLad([plugin]);
			adLad.dispose();

			const el = createMockElement();
			await assertRejects(
				async () => {
					await adLad.showBannerAd(el);
				},
				Error,
				"AdLad has been disposed.",
			);
			await assertRejects(
				async () => {
					await adLad.destroyBannerAd(el);
				},
				Error,
				"AdLad has been disposed.",
			);
		});
	},
});
