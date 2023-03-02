import { assertSpyCalls, spy } from "$std/testing/mock.ts";
import { BooleanState } from "../src/BooleanState.js";
import { waitForMicroTasks } from "./shared.js";

/**
 * @param {Object} options
 * @param {boolean} [options.autoResolve]
 * @param {boolean} [options.defaultState]
 */
function booleanStateTest({
	autoResolve = true,
	defaultState = undefined,
} = {}) {
	let resolveTrue = () => {};
	let resolveFalse = () => {};

	const trueSpy = spy(() => {
		if (autoResolve) return;
		/** @type {Promise<void>} */
		const promise = new Promise((resolve) => resolveTrue = resolve);
		return promise;
	});
	const falseSpy = spy(() => {
		if (autoResolve) return;
		/** @type {Promise<void>} */
		const promise = new Promise((resolve) => resolveFalse = resolve);
		return promise;
	});

	const state = new BooleanState({
		defaultState,
		trueCall: trueSpy,
		falseCall: falseSpy,
	});

	return {
		trueSpy,
		falseSpy,
		state,
		async resolveTrue() {
			resolveTrue();
			await waitForMicroTasks();
		},
		async resolveFalse() {
			resolveFalse();
			await waitForMicroTasks();
		},
	};
}

Deno.test({
	name: "state is passed to calls",
	async fn() {
		const { state, trueSpy, falseSpy } = booleanStateTest();

		state.setState(true);
		await waitForMicroTasks();
		assertSpyCalls(trueSpy, 1);
		state.setState(false);
		await waitForMicroTasks();
		assertSpyCalls(falseSpy, 1);
	},
});

Deno.test({
	name: "plugin is not called when start and stop state is already set",
	async fn() {
		const { state, trueSpy, falseSpy } = booleanStateTest();

		state.setState(false);
		await waitForMicroTasks();
		assertSpyCalls(falseSpy, 0);

		state.setState(true);
		await waitForMicroTasks();
		assertSpyCalls(trueSpy, 1);

		state.setState(true);
		await waitForMicroTasks();
		assertSpyCalls(trueSpy, 1);

		state.setState(false);
		await waitForMicroTasks();
		assertSpyCalls(falseSpy, 1);

		state.setState(false);
		await waitForMicroTasks();
		assertSpyCalls(falseSpy, 1);

		state.setState(true);
		await waitForMicroTasks();
		assertSpyCalls(trueSpy, 2);

		state.setState(false);
		await waitForMicroTasks();
		assertSpyCalls(falseSpy, 2);
	},
});

Deno.test({
	name: "It waits for the plugin calls to resolve before calling the next state",
	async fn() {
		const { state, trueSpy, falseSpy, resolveTrue, resolveFalse } = booleanStateTest({ autoResolve: false });

		// Nothing gets called because nothing was changed the same event loop.
		state.setState(true);
		state.setState(false);
		assertSpyCalls(trueSpy, 0);
		assertSpyCalls(falseSpy, 0);
		await resolveTrue();
		await resolveFalse();

		// Now it gets called because an event loop happened in between two calls.
		state.setState(true);
		await waitForMicroTasks();
		state.setState(false);
		assertSpyCalls(trueSpy, 1);
		await resolveTrue();
		assertSpyCalls(falseSpy, 1);
		await resolveFalse();

		// Nothing gets called because nothing was changed the same event loop.
		state.setState(true);
		state.setState(false);
		state.setState(true);
		state.setState(false);
		state.setState(true);
		state.setState(false);
		await resolveTrue();
		await resolveFalse();
		await resolveTrue();
		await resolveFalse();
		await resolveTrue();
		await resolveFalse();
		assertSpyCalls(trueSpy, 1);
		assertSpyCalls(falseSpy, 1);

		// Only calls once because in the end it only changed once in the same event loop
		state.setState(true);
		state.setState(false);
		state.setState(true);
		state.setState(false);
		state.setState(true);
		await resolveTrue();
		await resolveFalse();
		await resolveTrue();
		await resolveFalse();
		await resolveTrue();
		assertSpyCalls(trueSpy, 2);
		assertSpyCalls(falseSpy, 1);
	},
});

Deno.test({
	name: "Different default state",
	async fn() {
		const { state, trueSpy, falseSpy } = booleanStateTest({ defaultState: true });

		state.setState(true);
		await waitForMicroTasks();
		// Does nothing, state starts at true
		assertSpyCalls(trueSpy, 0);
		assertSpyCalls(falseSpy, 0);

		state.setState(false);
		state.setState(true);
		await waitForMicroTasks();
		// Nothing gets called because nothing was changed the same event loop.
		assertSpyCalls(trueSpy, 0);
		assertSpyCalls(falseSpy, 0);

		state.setState(false);
		await waitForMicroTasks();
		assertSpyCalls(trueSpy, 0);
		assertSpyCalls(falseSpy, 1);
	},
});
