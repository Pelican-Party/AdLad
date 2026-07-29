/**
 * @param {unknown} value
 */
function serializeJson(value) {
	return JSON.stringify(value);
}

/**
 * @param {string | null | undefined} str
 */
function deserializeJson(str) {
	if (!str) return undefined;
	try {
		return JSON.parse(str);
	} catch {
		return undefined;
	}
}

export class AdLadStorage {
	/**
	 * @param {Object} options
	 * @param {import("./AdLad.js").AdLadPlugin?} options.plugin
	 * @param {Promise<void>?} options.pluginInitializePromise
	 * @param {Storage} [options.localStorage]
	 * @param {Console} [options.console]
	 */
	constructor({
		plugin,
		pluginInitializePromise,
		localStorage = globalThis.localStorage,
		console = globalThis.console,
	}) {
		/** @private */
		this._plugin = plugin;
		/** @private */
		this._pluginInitializePromise = pluginInitializePromise;
		/** @private */
		this._localStorage = localStorage;
		/** @private */
		this._console = console;

		/** @private */
		this._didLogStorageErrorWarning = false;

		/** @private @type {Map<string, string>} */
		this._cachedValues = new Map();
		/**
		 * Keys which we have previously stored or retrieved a value for from the plugin.
		 * If a key has already been stored or retrieved, we return our own cached value instead.
		 * @private @type {Set<string>}
		 */
		this._cachedKeys = new Set();
	}

	/**
	 * @template T
	 * @param {() => T} cb
	 * @returns {T | undefined}
	 */
	_tryAccessStorage(cb) {
		try {
			return cb();
		} catch {
			if (!this._didLogStorageErrorWarning) {
				this._console.warn("Failed to access localStorage, the user might be browsing in a private window.");
				this._didLogStorageErrorWarning = true;
			}
		}
	}

	/**
	 * @private
	 * @param {string} key
	 * @param {unknown} value
	 */
	_cacheValue(key, value) {
		const serialized = serializeJson(value);
		this._cachedValues.set(key, serialized);
		this._cachedKeys.add(key);
		return serialized;
	}

	/**
	 * @param {string} key
	 * @param {unknown} value
	 */
	async setStorageItem(key, value) {
		this._cacheValue(key, value);
		await this._pluginInitializePromise;
		if (this._plugin?.setStorageItem) {
			try {
				await this._plugin.setStorageItem(key, value);
				return;
			} catch (error) {
				this._console.warn(
					`Failed to store data via the "${this._plugin.name}" plugin. Falling back to localStorage.\n${error}`,
				);
			}
		}

		// Fall back to localstorage if the plugin fails or doesn't implement the API
		this._tryAccessStorage(() => this._localStorage.setItem(key, serializeJson(value)));
	}

	/**
	 * @template T
	 * @param {string} key
	 * @returns {Promise<T>}
	 */
	async getStorageItem(key) {
		await this._pluginInitializePromise;
		if (this._cachedKeys.has(key)) {
			return deserializeJson(this._cachedValues.get(key));
		}

		let result;
		let needsFallback = true;
		if (this._plugin?.getStorageItem) {
			try {
				result = await this._plugin.getStorageItem(key);
				needsFallback = false;
			} catch (error) {
				this._console.warn(
					`Failed to retrieve data from the "${this._plugin.name}" plugin. Falling back to localStorage.\n${error}`,
				);
			}
		}

		let serialized;
		if (needsFallback) {
			serialized = this._tryAccessStorage(() => this._localStorage.getItem(key));
		} else {
			serialized = this._cacheValue(key, result);
		}

		return /** @type {T} */ (deserializeJson(serialized));
	}
}
