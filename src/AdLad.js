import { BooleanState } from "./BooleanState.js";
import { getBestPlugin } from "./getBestPlugin.js";
import { sanitizeFullScreenAdResult } from "./sanitizeFullScreenAdResult.js";

/** @typedef {"no-active-plugin" | "not-supported" | "no-ad-available" | "adblocker" | "unknown"} AdErrorReason */
/**
 * @typedef ShowFullScreenAdResult
 * @property {boolean?} didShowAd - When this is `true` when, ad was shown. In this case `errorReason` will be `null`.
 * - When this is `false`, `errorReason` is a non `null` value, though it might be `"unknown"` when the error reason wasn't known.
 * - When this is `null`, the plugin wasn't sure if an ad was shown. In this case `errorReason` will be `null`.
 * @property {AdErrorReason?} errorReason The reason why an ad wasn't shown,
 * this is a string when `didShowAd` was `false`, and `null` otherwise.
 * A list of possible values can be found at {@linkcode AdErrorReason}.
 */

/**
 * @typedef AdLadPlugin
 * @property {string} name
 * @property {() => boolean} [shouldBeActive] While it is recommended to users to manually choose a plugin either
 * via the {@linkcode AdLadOptions.plugin} or via the query string, if this is not done,
 * plugin developers can tell AdLad whether they wish their plugin to be the active one.
 * You can lock at the domain for instance or whether the page is currently embedded on a game portal.
 * When more than one plugin returns true, the last plugin that was provided will be picked.
 * @property {() => void | Promise<void>} [initialize] Gets called the moment AdLad is instantiated and your
 * plugin is chosen as the active plogin. If you return a promise, no other hooks will be called until the hook resolves.
 * @property {() => Promise<ShowFullScreenAdResult>} [showFullScreenAd] Hook that gets called when the user
 * wants to show a full screen non rewarded ad. This should return a promise that resolves once the ad is no longer visible.
 * The return result should contain info about whether an ad was shown.
 * You can check {@linkcode ShowFullScreenAdResult} to see which rules your result should abide. But your
 * result will be sanitized in case you don't. If your hook rejects, `errorReason: "unknown"` is automatically returned.
 * @property {() => Promise<ShowFullScreenAdResult>} [showRewardedAd] Hook that gets called when the user
 * wants to show a rewarded ad. This should return a promise that resolves once the ad is no longer visible.
 * The return result should contain info about whether an ad was shown.
 * You can check {@linkcode ShowFullScreenAdResult} to see which rules your result should abide. But your
 * result will be sanitized in case you don't. If your hook rejects, `errorReason: "unknown"` is automatically returned.
 * @property {() => void | Promise<void>} [gameplayStart] Hook that gets called when gameplay has started.
 * This will never be called twice in a row without `gameplayStop` being called first, except when the game starts for the first time.
 * @property {() => void | Promise<void>} [gameplayStop] Hook that gets called when gameplay has stopped.
 * This will never be called twice in a row without `gameplayStop` being called first.
 * @property {() => void | Promise<void>} [loadStart] Hook that gets called when loading has started.
 * This is called automatically once your `initialize` hook promise resolves.
 * This will never be called twice in a row without `loadStop` being called first, except when the game loads for the first time.
 * @property {() => void | Promise<void>} [loadStop] Hook that gets called when loading has stopped.
 * This will never be called twice in a row without `loadStart` being called first.
 * @property {boolean} [manualNeedsPause] TODO: This is not implemented yet. Set to `true` (default is `false`) when you manually want to
 * let AdLad know the value `needsPause` and its events. By default `needsPause` is automatically managed and
 * set to `true` during full screen ads. But when you enable manual management you have more control over this.
 * For example, you could make sure `needsPause` never becomes `true` when no ad is shown, even though `showFullScreenAd` was called.
 */

/**
 * @typedef {"error" | "fallback" | "none"} AdLadInvalidQueryStringBehaviour
 */
/** @type {AdLadInvalidQueryStringBehaviour[]} */
const invalidQueryStringBehaviourTypes = [
	"error",
	"fallback",
	"none",
];

/**
 * @typedef AdLadOptions
 * @property {AdLadPlugin[]} [plugins] The list of plugins that will be supported.
 * Only a single plugin of this list will be activated depending on which options have been provided to AdLad.
 * By default each plugin will tell AdLad whether it wishes to be active.
 * If more than one plugin wishes to be active, the last plugin of this list will be picked.
 * @property {string} [plugin] The name of the plugin to use.
 * This will override which plugin was chosen by the order of the `plugins` argument,
 * and will activate the provided plugin regardless of whether it choose to be active or not.
 * If the passed value is not an existing plugin, an error will be thrown.
 * An exception to this is the value `"none"`, which will cause no plugin to be selected.
 * `"none"` can still be overridden by the query string.
 * @property {boolean} [allowQueryStringPluginSelection] When set to true (which is the default)
 * allows changing the selected plugin using the `?adlad=` query string.
 * You can change the key of the query string parameter using `pluginSelectQueryStringKey`.
 * @property {string} [pluginSelectQueryStringKey] The key used for selecting plugins using the query string.
 * @property {AdLadInvalidQueryStringBehaviour} [invalidQueryStringPluginBehaviour] The behaviour when
 * an invalid plugin name is passed in the `?adlad=` query string. Defaults to `"fallback"`.
 * - `"error"` throws an error during instantiation of the `AdLad` class.
 * This will make your game completely unplayable when an invalid query string is passed.
 * Preventing users from playing your game with ads disabled.
 * - `"fallback"` switches back to behaviour from the `plugins` and `plugin` parameters,
 * making sure the game is still playable but also disallows disabling ads. This is the default behaviour.
 * - `"none"` No plugin is picked when an invalid value is provided. This completely disables ads.
 * While this makes it possible for users to easily disable ads when they are aware of the query string,
 * this might also be useful when you wish to debug your game without the distraction of third party requests and errors.
 * For example, you would be able to set `?adlad=none` to completely disable plugins this way.
 */

export class AdLad {
	/**
	 * You can instantiate the AdLad class with a list of plugins that should be supported.
	 * You can then make function calls to the AdLad instance,
	 * which will pass on requests such as showing full screen ads to the plugin that is currently active.
	 * Only a single plugin can be active, which will be picked during instantiation.
	 *
	 * There are three methods for picking which plugin should be active:
	 *
	 * - First, every plugin can self report to AdLad whether it wishes to be active.
	 * Most plugins always want to be active,
	 * but some plugins can be configured to only be active depending on the domain the page is embedded on.
	 * If multiple plugins wish to be active, the last plugin from the provided list will be picked.
	 * This allows you to set a priority each plugin.
	 * - Secondly, you can pick a plugin using the `plugin` option.
	 * This will override the priority list, and the request for plugins to be active or not will be ignored.
	 * - Lastly, plugins can be activated using the `?adlad=` query string. This will override all previous options.
	 * However, because this can potentially be abused by players in order to disable ads,
	 * there are some configurations available in order to control or completely disable this functionality.
	 *
	 * Using the query string to select plugins is the recommended method.
	 * Doing it like this will allow you to provide your domain in cluding the query string to different
	 * game portals, which is a much more robust way than trying to figure out where your game is being embedded.
	 * The domains from game portals may change at any time, in which case you will have to update its plugin.
	 * The query string, on the other hand, can be configured by you and so will likely never change.
	 *
	 * If you still want to make sure players can not disable ads using the query string,
	 * you can set `invalidQueryStringPluginBehaviour` to either `"error"` or `"default"`
	 * @param {AdLadOptions | AdLadPlugin[]} [options]
	 */
	constructor(options) {
		/** @type {AdLadPlugin[]} */
		let plugins = [];
		/** @type {string?} */
		let forcedPlugin = null;
		let allowQueryStringPluginSelection = true;
		let pluginSelectQueryStringKey = "adlad";
		/** @type {AdLadInvalidQueryStringBehaviour} */
		let invalidQueryStringPluginBehaviour = "fallback";
		if (options) {
			if (Array.isArray(options)) {
				plugins = options;
			} else {
				plugins = options.plugins || [];
				if (options.plugin !== undefined) {
					forcedPlugin = options.plugin;
				}
				if (options.allowQueryStringPluginSelection === false) {
					allowQueryStringPluginSelection = false;
				}
				if (options.pluginSelectQueryStringKey) {
					pluginSelectQueryStringKey = options.pluginSelectQueryStringKey;
				}
				if (
					options.invalidQueryStringPluginBehaviour &&
					invalidQueryStringBehaviourTypes.includes(options.invalidQueryStringPluginBehaviour)
				) {
					invalidQueryStringPluginBehaviour = options.invalidQueryStringPluginBehaviour;
				}
			}
		}
		/** @private @type {AdLadPlugin?} */
		this._plugin = null;
		let foundPlugin = false;
		if (allowQueryStringPluginSelection && window.location) {
			const url = new URL(window.location.href);
			const queryPlugin = url.searchParams.get(pluginSelectQueryStringKey);
			const plugin = plugins.find((p) => p.name == queryPlugin) || null;
			if (!plugin) {
				if (invalidQueryStringPluginBehaviour == "error") {
					throw new Error(`The plugin "${queryPlugin}" does not exist.`);
				} else if (invalidQueryStringPluginBehaviour == "fallback") {
					//todo
				} else if (invalidQueryStringPluginBehaviour == "none") {
					foundPlugin = true;
				}
			}
			if (plugin) {
				foundPlugin = true;
				this._plugin = plugin;
			}
		}
		if (!foundPlugin && forcedPlugin != null) {
			if (forcedPlugin != "none") {
				const plugin = plugins.find((p) => p.name == forcedPlugin);
				if (!plugin) {
					throw new Error(`The plugin "${forcedPlugin}" does not exist.`);
				}
				this._plugin = plugin;
			}
			foundPlugin = true;
		}
		if (!foundPlugin) {
			this._plugin = getBestPlugin(plugins);
			foundPlugin = true;
		}

		/** @type {Promise<void> | void} */
		let pluginInitializeResult;
		if (this._plugin && this._plugin.initialize) {
			const certainInitialize = this._plugin.initialize;
			const name = this._plugin.name;
			pluginInitializeResult = (async () => {
				try {
					await certainInitialize();
				} catch (e) {
					console.warn(`The "${name}" AdLad plugin failed to initialize`, e);
				}
			})();
		}

		/** @private */
		this.pluginInitializePromise = pluginInitializeResult || null;

		/** @private */
		this._isShowingAd = false;

		/** @private */
		this._loadingState = new BooleanState({
			defaultState: true,
			defaultPluginState: false,
			pluginInitializePromise: this.pluginInitializePromise,
			trueCall: () => {
				if (this._plugin && this._plugin.loadStart) {
					return this._plugin.loadStart();
				}
			},
			falseCall: () => {
				if (this._plugin && this._plugin.loadStop) {
					return this._plugin.loadStop();
				}
			},
		});

		/** @private */
		this._gameplayStartState = new BooleanState({
			pluginInitializePromise: this.pluginInitializePromise,
			trueCall: () => {
				if (this._plugin && this._plugin.gameplayStart) {
					return this._plugin.gameplayStart();
				}
			},
			falseCall: () => {
				if (this._plugin && this._plugin.gameplayStop) {
					return this._plugin.gameplayStop();
				}
			},
		});
		/** @private */
		this._lastGameplayStartCall = false;

		/** @private */
		this._needsPause = false;
		/** @private @type {Set<OnNeedsPauseChangeCallback>} */
		this._onNeedsPauseChangeCbs = new Set();
	}

	/**
	 * The name of the plugin that is currently active or `null` when no plugin is active.
	 */
	get activePlugin() {
		if (this._plugin) return this._plugin.name;
		return null;
	}

	/**
	 * @private
	 */
	async _updateGameplayStartState() {
		this._gameplayStartState.setState(this._lastGameplayStartCall && !this._isShowingAd);
		await this._gameplayStartState.waitForEmptyQueue();
	}

	gameplayStart() {
		this._lastGameplayStartCall = true;
		this._updateGameplayStartState();
	}

	gameplayStop() {
		this._lastGameplayStartCall = false;
		this._updateGameplayStartState();
	}

	loadStart() {
		this._loadingState.setState(true);
	}

	loadStop() {
		this._loadingState.setState(false);
	}

	/**
	 * This is `true` when an ad is playing and your audio should be muted and game paused.
	 * Use {@linkcode onNeedsPauseChange} to listen for changes.
	 */
	get needsPause() {
		return this._needsPause;
	}

	/**
	 * @param {boolean} needsPause
	 */
	_setNeedsPause(needsPause) {
		if (needsPause == this._needsPause) return;
		this._needsPause = needsPause;
		this._onNeedsPauseChangeCbs.forEach((cb) => cb(needsPause));
	}

	/**
	 * @typedef {(needsPause: boolean) => void} OnNeedsPauseChangeCallback
	 */

	/**
	 * Registers a callback that is fired when {@linkcode needsPause} changes.
	 * Use this to pause your game and mute your audio during ads.
	 * @param {OnNeedsPauseChangeCallback} cb
	 */
	onNeedsPauseChange(cb) {
		this._onNeedsPauseChangeCbs.add(cb);
	}

	/**
	 * Use this to unregister callbacks registered with {@linkcode onNeedsPauseChange}
	 * @param {OnNeedsPauseChangeCallback} cb
	 */
	removeOnNeedsPauseChange(cb) {
		this._onNeedsPauseChangeCbs.delete(cb);
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
		await this._updateGameplayStartState();
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
			if (this.pluginInitializePromise) await this.pluginInitializePromise;
			this._setNeedsPause(true);
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
			this._setNeedsPause(false);
			this._updateGameplayStartState();
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
