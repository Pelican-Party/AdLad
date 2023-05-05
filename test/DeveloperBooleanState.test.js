import { assertSpyCalls, spy } from "$std/testing/mock.ts";
import { assertEquals } from "$std/testing/asserts.ts";
import { DeveloperBooleanState, filterStateQueue } from "../src/DeveloperBooleanState.js";
import { assertPromiseResolved, waitForMicrotasks } from "./shared.js";

/**
 * @param {Object} options
 * @param {boolean} [options.autoResolve]
 * @param {boolean} [options.defaultState]
 * @param {boolean} [options.defaultPluginState]
 * @param {Promise<void>} [options.pluginInitializePromise]
 */
function booleanStateTest({
	autoResolve = true,
	defaultState = undefined,
	defaultPluginState = undefined,
	pluginInitializePromise,
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

	const state = new DeveloperBooleanState({
		pluginInitializePromise,
		defaultState,
		defaultPluginState,
		trueCall: trueSpy,
		falseCall: falseSpy,
	});

	return {
		trueSpy,
		falseSpy,
		state,
		async resolveTrue() {
			resolveTrue();
			await waitForMicrotasks();
		},
		async resolveFalse() {
			resolveFalse();
			await waitForMicrotasks();
		},
	};
}

Deno.test({
	name: "state is passed to calls",
	async fn() {
		const { state, trueSpy, falseSpy } = booleanStateTest();

		state.setState(true);
		await waitForMicrotasks();
		assertSpyCalls(trueSpy, 1);
		state.setState(false);
		await waitForMicrotasks();
		assertSpyCalls(falseSpy, 1);
	},
});

Deno.test({
	name: "plugin is not called when start and stop state is already set",
	async fn() {
		const { state, trueSpy, falseSpy } = booleanStateTest();

		state.setState(false);
		await waitForMicrotasks();
		assertSpyCalls(falseSpy, 0);

		state.setState(true);
		await waitForMicrotasks();
		assertSpyCalls(trueSpy, 1);

		state.setState(true);
		await waitForMicrotasks();
		assertSpyCalls(trueSpy, 1);

		state.setState(false);
		await waitForMicrotasks();
		assertSpyCalls(falseSpy, 1);

		state.setState(false);
		await waitForMicrotasks();
		assertSpyCalls(falseSpy, 1);

		state.setState(true);
		await waitForMicrotasks();
		assertSpyCalls(trueSpy, 2);

		state.setState(false);
		await waitForMicrotasks();
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
		await waitForMicrotasks();
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
		const { state, trueSpy, falseSpy } = booleanStateTest({ defaultState: true, defaultPluginState: true });

		state.setState(true);
		await waitForMicrotasks();
		// Does nothing, state starts at true
		assertSpyCalls(trueSpy, 0);
		assertSpyCalls(falseSpy, 0);

		state.setState(false);
		state.setState(true);
		await waitForMicrotasks();
		// Nothing gets called because nothing was changed the same event loop.
		assertSpyCalls(trueSpy, 0);
		assertSpyCalls(falseSpy, 0);

		state.setState(false);
		await waitForMicrotasks();
		assertSpyCalls(trueSpy, 0);
		assertSpyCalls(falseSpy, 1);
	},
});

Deno.test({
	name: "Doesn't fire plugin calls when called while pluginInitializePromise is not resolved",
	async fn() {
		let resolvePromise = () => {};
		/** @type {Promise<void>} */
		const promise = new Promise((resolve) => {
			resolvePromise = resolve;
		});

		const { state, trueSpy, falseSpy } = booleanStateTest({
			pluginInitializePromise: promise,
		});

		// Does nothing, promise is not resolved
		state.setState(true);
		await waitForMicrotasks();
		state.setState(false);
		await waitForMicrotasks();
		assertSpyCalls(trueSpy, 0);
		assertSpyCalls(falseSpy, 0);

		resolvePromise();
		await waitForMicrotasks();
		assertSpyCalls(trueSpy, 1);
		assertSpyCalls(falseSpy, 1);
	},
});

Deno.test({
	name: "State is fired on the plugin, even when no call was made",
	async fn() {
		let resolvePromise = () => {};
		/** @type {Promise<void>} */
		const promise = new Promise((resolve) => {
			resolvePromise = resolve;
		});

		const { trueSpy, falseSpy } = booleanStateTest({
			pluginInitializePromise: promise,
			defaultState: true,
			defaultPluginState: false,
		});

		assertSpyCalls(trueSpy, 0);
		assertSpyCalls(falseSpy, 0);

		resolvePromise();
		await waitForMicrotasks();

		assertSpyCalls(trueSpy, 1);
		assertSpyCalls(falseSpy, 0);
	},
});

Deno.test({
	name: "Doesn't fire plugin calls until pluginInitializePromise is resolved",
	async fn() {
		let resolvePromise = () => {};
		/** @type {Promise<void>} */
		const promise = new Promise((resolve) => {
			resolvePromise = resolve;
		});

		const { state, trueSpy, falseSpy } = booleanStateTest({
			pluginInitializePromise: promise,
		});

		// Does nothing, promise is not resolved
		state.setState(true);
		await waitForMicrotasks();
		assertSpyCalls(trueSpy, 0);
		assertSpyCalls(falseSpy, 0);

		// Does nothing, promise is not resolved
		state.setState(false);
		await waitForMicrotasks();
		assertSpyCalls(trueSpy, 0);
		assertSpyCalls(falseSpy, 0);

		// Does nothing, promise is not resolved
		state.setState(true);
		await waitForMicrotasks();
		assertSpyCalls(trueSpy, 0);
		assertSpyCalls(falseSpy, 0);

		// True state was fired before resolving, this should fire the true function
		resolvePromise();
		await waitForMicrotasks();
		assertSpyCalls(trueSpy, 1);
		assertSpyCalls(falseSpy, 0);
	},
});

Deno.test({
	name: "Doesn't fire plugin calls until pluginInitializePromise is resolved, default state is true",
	async fn() {
		let resolvePromise = () => {};
		/** @type {Promise<void>} */
		const promise = new Promise((resolve) => {
			resolvePromise = resolve;
		});

		const { state, trueSpy, falseSpy } = booleanStateTest({
			pluginInitializePromise: promise,
			defaultState: true,
			defaultPluginState: true,
		});

		// Does nothing, promise is not resolved
		state.setState(false);
		await waitForMicrotasks();
		assertSpyCalls(trueSpy, 0);
		assertSpyCalls(falseSpy, 0);

		// True state was fired before resolving, this should fire the true function
		resolvePromise();
		await waitForMicrotasks();
		assertSpyCalls(trueSpy, 0);
		assertSpyCalls(falseSpy, 1);
	},
});

Deno.test({
	name: "waitForEmptyQueue resolves once the queue is empty",
	async fn() {
		const { state, trueSpy, falseSpy } = booleanStateTest();

		state.setState(true);
		state.setState(false);
		await state.waitForEmptyQueue();
		assertSpyCalls(trueSpy, 1);
		assertSpyCalls(falseSpy, 1);

		state.setState(true);
		await state.waitForEmptyQueue();
		assertSpyCalls(trueSpy, 2);
		assertSpyCalls(falseSpy, 1);
	},
});

Deno.test({
	name: "waitForEmptyQueue also waits for plugin initialization",
	async fn() {
		let resolvePromise = () => {};
		/** @type {Promise<void>} */
		const promise = new Promise((resolve) => {
			resolvePromise = resolve;
		});

		const { state, trueSpy, falseSpy } = booleanStateTest({
			pluginInitializePromise: promise,
		});

		state.setState(true);
		state.setState(false);
		const waitPromise = state.waitForEmptyQueue();
		await assertPromiseResolved(waitPromise, false);
		assertSpyCalls(trueSpy, 0);
		assertSpyCalls(falseSpy, 0);

		resolvePromise();
		await waitForMicrotasks();
		assertSpyCalls(trueSpy, 1);
		assertSpyCalls(falseSpy, 1);
		await assertPromiseResolved(waitPromise, true);
	},
});

Deno.test({
	name: "waitForEmptyQueue resolves when it is already empty",
	async fn() {
		const { state } = booleanStateTest();

		await state.waitForEmptyQueue();
		await state.waitForEmptyQueue();
		await state.waitForEmptyQueue();
	},
});

/**
 * @param {boolean} currentState
 * @param {boolean[]} queue
 * @param {boolean[]} expectedQueue
 */
function queStateTest(currentState, queue, expectedQueue) {
	Deno.test({
		name: `filters the queue state correctly: current: ${currentState}, queue: ${queue.join(",")} -> ${
			expectedQueue.join(",")
		}`,
		fn() {
			const result = filterStateQueue(currentState, queue);
			assertEquals(result, expectedQueue);
		},
	});
}

queStateTest(true, [], []);
queStateTest(false, [], []);
queStateTest(false, [false], []);
queStateTest(true, [true], []);
queStateTest(true, [false], [false]);
queStateTest(true, [false, false], [false]);
queStateTest(true, [false, true], [false, true]);
queStateTest(false, [true, false], [true, false]);
queStateTest(false, [true, true], [true]);
queStateTest(false, [false, true], [true]);
queStateTest(false, [true, false, false], [true, false]);

queStateTest(true, [false, true, false, true], [false, true]);
queStateTest(true, [false, true, true, true, false], [false]);
queStateTest(false, [true, false, true, false, true], [true]);
queStateTest(false, [true, false, true, false], [true, false]);
queStateTest(false, [true, true, true, true], [true]);
queStateTest(false, [false, true, true, true], [true]);
