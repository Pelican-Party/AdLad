/**
 * @param {import("./AdLad.js").ShowFullScreenAdResult} pluginResult
 */
export function sanitizeFullScreenAdResult(pluginResult) {
	/** @type {import("./AdLad.js").ShowFullScreenAdResult} */
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
			/** @type {import("./AdLad.js").AdErrorReason[]} */
			const validReasons = [
				"not-supported",
				"no-ad-available",
				"adblocker",
				"time-constraint",
				"user-dismissed",
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
