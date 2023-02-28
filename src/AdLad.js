import { getBestPlugin } from "./getBestPlugin.js";

/** @typedef {"no-active-plugin" | "not-supported" | "adblocker" | "unknown"} AdErrorReason */
/**
 * @typedef ShowFullScreenAdResult
 * @property {boolean?} didShowAd
 * @property {AdErrorReason?} errorReason
 */

/**
 * @typedef AdLadPlugin
 * @property {string} name
 * @property {() => void} [shouldBeActive]
 * @property {() => Promise<ShowFullScreenAdResult>} [showFullScreenAd]
 * @property {() => Promise<ShowFullScreenAdResult>} [showRewardedAd]
 */

/**
 * @typedef AdLadOptions
 * @property {AdLadPlugin[]} [plugins]
 */

export class AdLad {
	/**
	 * @param {AdLadOptions | AdLadPlugin[]} [options]
	 */
	constructor(options) {
		/** @type {AdLadPlugin[]} */
		let plugins = [];
		if (options) {
			if (Array.isArray(options)) {
				plugins = options;
			} else {
				plugins = options.plugins || [];
			}
		}
		this._plugin = getBestPlugin(plugins);
	}

	/**
	 * The name of the plugin that is currently active or `null` when no plugin is active.
	 */
	get activePlugin() {
		if (this._plugin) return this._plugin.name;
		return null;
	}

	async showFullScreenAd() {
		if (!this._plugin) {
			return {
				didShowAd: false,
				errorReason: "no-active-plugin",
			};
		}
		if (!this._plugin.showFullScreenAd) {
			return {
				didShowAd: false,
				errorReason: "not-supported",
			};
		}
		const pluginResult = await this._plugin.showFullScreenAd();
		/** @type {ShowFullScreenAdResult} */
		let result;
		if (!pluginResult || typeof pluginResult != "object") {
			result = {
				didShowAd: false,
				errorReason: "unknown",
			};
		} else {
			if (pluginResult.didShowAd === true || pluginResult.didShowAd === null) {
				result = {
					didShowAd: pluginResult.didShowAd,
					errorReason: null,
				};
			} else {
				/** @type {AdErrorReason[]} */
				const validReasons = [
					"adblocker",
					"not-supported",
					"unknown",
				];
				const reasonIndex = validReasons.indexOf(/** @type {any} */ (pluginResult.errorReason));
				let errorReason = validReasons[reasonIndex];
				if (!errorReason) errorReason = "unknown";
				result = {
					didShowAd: false,
					errorReason,
				};
			}
		}

		return result;
	}

	async showRewardedAd() {
	}
}
