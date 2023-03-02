/**
 * This class calls from the developer like gameplayStart() and gameplayStop().
 * And passes these along to plugins while making sure they are not fired more than once.
 * If the plugins return a promise, this also ensures no call is being made while a returned promise is pending.
 */
export class BooleanState {
	/**
	 * @param {Object} options
	 * @param {boolean} [options.defaultState]
	 * @param {() => Promise<void> | void} options.trueCall
	 * @param {() => Promise<void> | void} options.falseCall
	 */
	constructor({
		defaultState = false,
		trueCall,
		falseCall,
	}) {
		/** @private */
		this.trueCall = trueCall;
		/** @private */
		this.falseCall = falseCall;
		/**
		 * @private
		 * The gameplay start state that was last reported by the user.
		 */
		this.lastReceivedState = defaultState;
		/**
		 * @private
		 * The gameplay start state that was last reported to the plugin.
		 */
		this.lastSentState = defaultState;
		/** @private @type {Promise<void>} */
		this.lastSentStatePromise = Promise.resolve();
		/** @private */
		this.lastUpdateSymbol = Symbol();
	}

	/**
	 * @param {boolean} state
	 */
	setState(state) {
		this.lastReceivedState = state;
		this.updateState();
	}

	/** @private  */
	async updateState() {
		const sym = Symbol();
		this.lastUpdateSymbol = sym;
		if (this.lastSentStatePromise) {
			await this.lastSentStatePromise;
		}
		if (this.lastUpdateSymbol != sym) {
			// This function was called again while we were waiting, so we won't do anything.
			return;
		}
		if (this.lastReceivedState == this.lastSentState) return;
		const fn = this.lastReceivedState ? this.trueCall : this.falseCall;
		this.lastSentStatePromise = fn() || Promise.resolve();
		this.lastSentState = this.lastReceivedState;
	}
}
