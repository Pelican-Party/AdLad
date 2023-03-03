import { AdLad } from "../src/AdLad.js";

export function waitForMicroTasks() {
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
	const adLad = new AdLad([
		{
			...plugin,
			initialize() {
				/** @type {Promise<void>} */
				const promise = new Promise((resolve) => {
					resolveInitialize = resolve;
				});
				return promise;
			},
		},
	]);

	return {
		adLad,
		async resolveInitialize() {
			resolveInitialize();
			await waitForMicroTasks();
		},
	};
}
