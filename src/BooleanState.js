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
		this.lastSentState = defaultPluginState;
		/** @private @type {Promise<void>} */
		this.lastSentStatePromise = Promise.resolve();
		/** @private */
		this.lastUpdateSymbol = Symbol();

		(async () => {
			await this.pluginInitializePromise;
			await this.updateState();
		})();
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
		if (this.pluginInitializePromise) await this.pluginInitializePromise;
		if (this.lastSentStatePromise) await this.lastSentStatePromise;
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
