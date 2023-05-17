import { assertSpyCall, assertSpyCalls, spy } from "$std/testing/mock.ts";
import { assertEquals } from "$std/testing/asserts.ts";
import { AdLad } from "../../src/AdLad.js";
import {
	assertPromiseResolved,
	createOnBooleanChangeSpy,
	initializingPluginTest,
	testTypes,
	waitForMicrotasks,
} from "../shared.js";

function createMockElement({
	width = 300,
	height = 200,
	id = "",
} = {}) {
	const el = /** @type {HTMLElement} */ ({
		getBoundingClientRect() {
			const rect = /** @type {DOMRect} */ ({
				width,
				height,
			});
			return rect;
		},
		id,
	});
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
	},
});

function createSpyPlugin({
	name = "plugin",
} = {}) {
	/** @type {import("../../src/AdLad.js").AdLadPlugin} */
	const plugin = {
		name,
		showBannerAd() {},
	};
	const castPlugin = /** @type {Required<import("../../src/AdLad.js").AdLadPlugin>} */ (plugin);
	const showBannerSpy = spy(castPlugin, "showBannerAd");
	return { plugin, showBannerSpy };
}

Deno.test({
	name: "canShowBannerAd becomes true once initialized",
	async fn() {
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
	},
});

Deno.test({
	name: "Passes the request on to the plugin",
	fn() {
		const { plugin, showBannerSpy } = createSpyPlugin();
		const adLad = new AdLad([plugin]);
		const id = "the_element_id";
		const el = createMockElement({ id });

		adLad.showBannerAd(el);

		assertSpyCalls(showBannerSpy, 1);
		assertSpyCall(showBannerSpy, 0, {
			args: [
				{
					el,
					id,
					width: 300,
					height: 200,
				},
				undefined,
			],
		});
	},
});

Deno.test({
	name: "Doesn't fire on plugin until it has been initialized",
	async fn() {
		const { plugin, showBannerSpy } = createSpyPlugin();
		const { adLad, resolveInitialize } = initializingPluginTest(plugin);

		const el = createMockElement();
		const promise = adLad.showBannerAd(el);

		await waitForMicrotasks();
		assertSpyCalls(showBannerSpy, 0);
		await assertPromiseResolved(promise, false);

		await resolveInitialize();
		assertSpyCalls(showBannerSpy, 1);
		await assertPromiseResolved(promise, true);
	},
});

Deno.test({
	name: "Adds an id to the element when it doesn't have one",
	fn() {
		const { plugin, showBannerSpy } = createSpyPlugin();
		const adLad = new AdLad([plugin]);
		const el = createMockElement();

		adLad.showBannerAd(el);

		assertSpyCalls(showBannerSpy, 1);
		assertEquals(showBannerSpy.calls[0].args[0].id, el.id);
	},
});

Deno.test({
	name: "Options are passed to the right plugin",
	fn() {
		const { plugin: rightPlugin, showBannerSpy: showBannerRightSpy } = createSpyPlugin({
			name: "right-plugin",
		});
		const { plugin: wrongPlugin, showBannerSpy: showBannerWrongSpy } = createSpyPlugin({
			name: "wrong-plugin",
		});
		const adLad = new AdLad([wrongPlugin, rightPlugin]);
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
		});

		const pluginB = /** @type {const} */ ({
			name: "plugin-b",
			/**
			 * @param {import("../../src/AdLad.js").ShowBannerAdPluginOptions} _opts
			 * @param {Object} _userOpts
			 * @param {boolean} _userOpts.baz
			 */
			showBannerAd(_opts, _userOpts) {},
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

		adLad.showBannerAd(el, {
			// @ts-expect-error It should emit when a plugin that requires options is missing.
			pluginOptions: {},
		});

		// TODO: In the future we might want to emit when the options object is missing as well.
		adLad.showBannerAd(el);
		adLad.showBannerAd(el, {});
	},
});
