/**
 * This class calls from the developer like gameplayStart() and gameplayStop().
 * And passes these along to plugins while making sure they are not fired more than once.
 * If the plugins return a promise, this also ensures no call is being made while a returned promise is pending.
 */
export class BooleanState {
	/**
	 * @param {Object} options
	 * @param {boolean} [options.defaultState] The default state that the AdLad api uses. For example,
	 * games always start in the loading state for developers using AdLad. That way developers don't need
	 * to call adLad.loadStart right after instantiation.
	 * @param {boolean} [options.defaultPluginState] The default state that sdks expect. For example,
	 * sdks usually expect loadStart to be called right after initialization.
	 * @param {Promise<void>?} [options.pluginInitializePromise]
	 * @param {() => Promise<void> | void} options.trueCall
	 * @param {() => Promise<void> | void} options.falseCall
	 */
	constructor({
		defaultState = false,
		defaultPluginState = false,
		pluginInitializePromise = null,
		trueCall,
		falseCall,
	}) {
		/** @private */
		this.pluginInitializePromise = pluginInitializePromise;
		/** @private */
		this.pluginInitialized = false;
		/** @private */
		this.trueCall = trueCall;
		/** @private */
		this.falseCall = falseCall;
		/**
		 * @private
		 * The gameplay start state that was last reported to the plugin.
		 */
		this.lastSentState = defaultPluginState;
		/** @private @type {boolean[]} */
		this.stateQueue = [defaultState];
		/** @private @type {Promise<void>} */
		this.lastSentStatePromise = Promise.resolve();
		/**
		 * When the state is switched while waiting for plugin initialization,
		 * we want to set this flag so that we can toggle the state twice once it loads.
		 * @private
		 */
		this.needsDoubleToggle = false;
		/** @private */
		this.lastUpdateSymbol = Symbol();

		(async () => {
			await this.pluginInitializePromise;
			await this.updateState();
			this.pluginInitialized = true;
		})();
	}

	/**
	 * @param {boolean} state
	 */
	setState(state) {
		this.stateQueue.push(state);
		this.updateState();
	}

	/** @private  */
	async updateState() {
		const sym = Symbol();
		this.lastUpdateSymbol = sym;
		if (this.pluginInitializePromise) await this.pluginInitializePromise;
		if (this.lastSentStatePromise) await this.lastSentStatePromise;
		if (this.lastUpdateSymbol != sym) {
			// This function was called again while we were waiting, so we won't do anything.
			return;
		}

		if (this.pluginInitialized) {
			if (this.stateQueue.length > 0) {
				const lastState = this.stateQueue[this.stateQueue.length - 1];
				if (lastState == this.lastSentState) {
					this.stateQueue = [];
				} else {
					this.stateQueue = [lastState];
				}
			}
		} else {
			this.stateQueue = filterStateQueue(this.lastSentState, this.stateQueue);
		}

		if (this.stateQueue.length > 0) {
			const newState = /** @type {boolean} */ (this.stateQueue.shift());
			const fn = newState ? this.trueCall : this.falseCall;
			this.lastSentStatePromise = fn() || Promise.resolve();
			this.lastSentState = newState;
			this.updateState();
		}
	}
}

/**
 * Filters a queue to remove unnecessary and duplicate entries.
 * @param {boolean} currentState
 * @param {boolean[]} queue
 */
export function filterStateQueue(currentState, queue) {
	queue = filterQueueDuplicates(currentState, queue);

	// filter duplicate double switches
	if (queue.length > 0) {
		const first = queue[0];
		const last = queue[queue.length - 1];
		queue = [first, last];
	}

	queue = filterQueueDuplicates(currentState, queue);

	return queue;
}

/**
 * @param {boolean} startState
 * @param {boolean[]} queue
 */
function filterQueueDuplicates(startState, queue) {
	const filteredDuplicates = [];
	let lastEntry = startState;
	for (const entry of queue) {
		if (entry != lastEntry) {
			filteredDuplicates.push(entry);
			lastEntry = entry;
		}
	}
	return filteredDuplicates;
}
