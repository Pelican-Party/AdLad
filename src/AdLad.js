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
		/** @private */
		this._plugin = getBestPlugin(plugins);
		if (this._plugin && this._plugin.initialize) {
			try {
				this._plugin.initialize();
			} catch (e) {
				console.warn(`The "${this._plugin.name}" AdLad plugin failed to initialize`, e);
			}
		}
		/** @private */
		this._isShowingAd = false;
	}

	/**
	 * The name of the plugin that is currently active or `null` when no plugin is active.
	 */
	get activePlugin() {
		if (this._plugin) return this._plugin.name;
		return null;
	}

	/**
	 * @param {(() => Promise<ShowFullScreenAdResult>) | undefined} showFn
	 * @returns {Promise<ShowFullScreenAdResult>}
	 */
	async _showPluginFullScreenAd(showFn) {
		if (this._isShowingAd) {
			throw new Error("An ad is already playing");
		}
		this._isShowingAd = true;
		try {
			if (!this._plugin) {
				return {
					didShowAd: false,
					errorReason: "no-active-plugin",
				};
			}
			if (!showFn) {
				return {
					didShowAd: false,
					errorReason: "not-supported",
				};
			}
			let pluginResult;
			try {
				pluginResult = await showFn();
			} catch (e) {
				console.error(
					`An error occurred while trying to display an ad from the "${this._plugin.name}" plugin:`,
					e,
				);
			}
			if (!pluginResult) {
				return {
					didShowAd: false,
					errorReason: "unknown",
				};
			}
			return sanitizeFullScreenAdResult(pluginResult);
		} finally {
			this._isShowingAd = false;
		}
	}

	/**
	 * @returns {Promise<ShowFullScreenAdResult>}
	 */
	async showFullScreenAd() {
		let showFn;
		if (this._plugin) showFn = this._plugin.showFullScreenAd;
		return await this._showPluginFullScreenAd(showFn);
	}

	/**
	 * @returns {Promise<ShowFullScreenAdResult>}
	 */
	async showRewardedAd() {
		let showFn;
		if (this._plugin) showFn = this._plugin.showRewardedAd;
		return await this._showPluginFullScreenAd(showFn);
	}
}
