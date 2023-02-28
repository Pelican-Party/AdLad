import { getBestPlugin } from "./getBestPlugin.js";
import { sanitizeFullScreenAdResult } from "./sanitizeFullScreenAdResult.js";

/** @typedef {"no-active-plugin" | "not-supported" | "no-ad-available" | "adblocker" | "unknown"} AdErrorReason */
/**
 * @typedef ShowFullScreenAdResult
 * @property {boolean?} didShowAd
 * @property {AdErrorReason?} errorReason
 */

/**
 * @typedef AdLadPlugin
 * @property {string} name
 * @property {() => void} [shouldBeActive]
 * @property {() => void} [initialize]
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
		if (this._plugin && this._plugin.initialize) {
			try {
				this._plugin.initialize();
			} catch (e) {
				console.warn(`The "${this._plugin.name}" AdLad plugin failed to initialize`, e);
			}
		}
	}

	/**
	 * The name of the plugin that is currently active or `null` when no plugin is active.
	 */
	get activePlugin() {
		if (this._plugin) return this._plugin.name;
		return null;
	}

	/**
	 * @returns {Promise<ShowFullScreenAdResult>}
	 */
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
		return sanitizeFullScreenAdResult(pluginResult);
	}

	/**
	 * @returns {Promise<ShowFullScreenAdResult>}
	 */
	async showRewardedAd() {
		if (!this._plugin) {
			return {
				didShowAd: false,
				errorReason: "no-active-plugin",
			};
		}
		if (!this._plugin.showRewardedAd) {
			return {
				didShowAd: false,
				errorReason: "not-supported",
			};
		}
		const pluginResult = await this._plugin.showRewardedAd();
		return sanitizeFullScreenAdResult(pluginResult);
	}
}
