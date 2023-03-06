import { assert } from "$std/testing/asserts.ts";
import { AdLad } from "../src/AdLad.js";

export function waitForMicrotasks() {
	return new Promise((resolve) => {
		setTimeout(resolve, 0);
	});
}

/**
 * Creates an AdLad instance with the provided plugin,
 * except that the `initialize` hook of the plugin is replaced with one
 * that returns a promise which doesn't resolve until `resolveInitialize` is called.
 * @param {import("../src/AdLad.js").AdLadPlugin} plugin
 */
export function initializingPluginTest(plugin) {
	let resolveInitialize = () => {};
	let rejectInitialize = () => {};
	const adLad = new AdLad([
		{
			...plugin,
			initialize() {
				/** @type {Promise<void>} */
				const promise = new Promise((resolve, reject) => {
					resolveInitialize = resolve;
					rejectInitialize = reject;
				});
				return promise;
			},
		},
	]);

	return {
		adLad,
		async resolveInitialize() {
			resolveInitialize();
			await waitForMicrotasks();
		},
		async rejectInitialize() {
			rejectInitialize();
			await waitForMicrotasks;
		},
	};
}

/**
 * Asserts whether a promise is currently resolved or not. By default, the check is made asynchronously. The call waits
 * for the next event loops and gives the promise a chance to resolve in the current event loop.
 * The reason for this is that there is no way to synchronously check the resolved state of
 * promises in JavaScript.
 * @param {Promise<any>} promise
 * @param {boolean} expected
 */
export async function assertPromiseResolved(promise, expected) {
	let resolved = false;
	(async () => {
		await promise;
		resolved = true;
	})();
	await waitForMicrotasks();
	const msg = expected ? "Expected the promise to be resolved" : "Expected the promise to not be resolved";
	assert(resolved == expected, msg);
}
