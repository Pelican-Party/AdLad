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

export class AdladStorage {
	/**
	 * @param {Object} options
	 * @param {import("./AdLad.js").AdLadPlugin?} options.plugin
	 * @param {Promise<void>?} options.pluginInitializePromise
	 * @param {Storage} [options.storage]
	 * @param {Console} [options.console]
	 */
	constructor({
		plugin,
		pluginInitializePromise,
		storage = globalThis.localStorage,
		console = globalThis.console,
	}) {
		/** @private */
		this._plugin = plugin;
		/** @private */
		this._pluginInitializePromise = pluginInitializePromise;

		/** @private @type {Map<string, string>} */
		this._cachedValues = new Map();
		/**
		 * Keys which we have previously stored or retrieved a value for from the plugin.
		 * If a key has already been stored or retrieved, we return our own cached value instead.
		 * @private @type {Set<string>}
		 */
		this._cachedKeys = new Set();

		let didLogStorageErrorWarning = false;
		/**
		 * @template T
		 * @param {() => T} cb
		 * @returns {T | undefined}
		 */
		function tryAccessStorage(cb) {
			try {
				return cb();
			} catch {
				if (!didLogStorageErrorWarning) {
					console.warn("Failed to access localStorage, the user might be browsing in a private window.");
					didLogStorageErrorWarning = true;
				}
			}
		}

		/** @private @type {(key: string, value: unknown) => Promise<void> | void} */
		this._setPluginStorage = (key, value) => {
			tryAccessStorage(() => storage.setItem(key, serializeJson(value)));
		};

		/** @private @type {(key: string) => Promise<unknown> | unknown} */
		this._getPluginStorage = (key) => {
			const value = tryAccessStorage(() => storage.getItem(key));
			return deserializeJson(value);
		};

		if (plugin) {
			if (plugin.setStorageItem) {
				const setStorage = plugin.setStorageItem.bind(plugin);
				this._setPluginStorage = async (key, value) => {
					await setStorage(key, value);
				};
			}
			if (plugin.getStorageItem) {
				const getStorage = plugin.getStorageItem.bind(plugin);
				this._getPluginStorage = async (key) => {
					return await getStorage(key);
				};
			}
		}
	}

	/**
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
		await this._setPluginStorage(key, value);
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
		const result = await this._getPluginStorage(key);
		const serialized = this._cacheValue(key, result);
		return /** @type {T} */ (deserializeJson(serialized));
	}
}
