import { assertSpyCall, assertSpyCalls, spy } from "$std/testing/mock.ts";
import { assertEquals } from "$std/testing/asserts.ts";
import { AdLad } from "../../src/AdLad.js";

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
		const el = createMockElement();
		adLad.showBannerAd(el);
	},
});

function createSpyPlugin() {
	/** @type {import("../../src/AdLad.js").AdLadPlugin} */
	const plugin = {
		name: "plugin",
		showBannerAd() {},
	};
	const castPlugin = /** @type {Required<import("../../src/AdLad.js").AdLadPlugin>} */ (plugin);
	const showBannerSpy = spy(castPlugin, "showBannerAd");
	return { plugin, showBannerSpy };
}

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
			],
		});
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
