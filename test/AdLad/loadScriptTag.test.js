import { runWithDomAsync } from "$fake-dom/FakeDocument.js";
import { assertEquals, assertRejects } from "$std/testing/asserts.ts";
import { AdLad } from "../../src/AdLad.js";
import { assertPromiseResolved } from "../shared.js";

function extractPluginContext() {
	/** @param {import("../../src/AdLad.js").AdLadPluginInitializeContext} _ctx */
	let resolveFn = (_ctx) => {};

	/** @type {Promise<import("../../src/AdLad.js").AdLadPluginInitializeContext>} */
	const promise = new Promise((resolve) => {
		resolveFn = resolve;
	});

	/** @type {import("../../src/AdLad.js").AdLadPlugin} */
	const plugin = {
		name: "plugin",
		async initialize(ctx) {
			resolveFn(ctx);
		},
	};

	new AdLad([plugin]);
	return promise;
}

Deno.test({
	name: "Resolves when loaded",
	async fn() {
		await runWithDomAsync(async () => {
			const ctx = await extractPluginContext();
			const promise = ctx.loadScriptTag("script src");

			const elements = Array.from(document.body.children).filter((child) => child.tagName == "SCRIPT");
			const scriptElements = /** @type {HTMLScriptElement[]} */ (elements);
			assertEquals(scriptElements.length, 1);
			assertEquals(scriptElements[0].src, "script src");

			await assertPromiseResolved(promise, false);

			scriptElements[0].dispatchEvent(new Event("load"));

			await assertPromiseResolved(promise, true);
		});
	},
});

Deno.test({
	name: "Rejects when it errors",
	async fn() {
		await runWithDomAsync(async () => {
			const ctx = await extractPluginContext();
			const promise = ctx.loadScriptTag("script src");

			const assertRejectsPromise = assertRejects(async () => {
				await promise;
			});

			const elements = Array.from(document.body.children).filter((child) => child.tagName == "SCRIPT");
			const scriptElements = /** @type {HTMLScriptElement[]} */ (elements);
			assertEquals(scriptElements.length, 1);

			scriptElements[0].dispatchEvent(new Event("error"));

			await assertRejectsPromise;
		});
	},
});
