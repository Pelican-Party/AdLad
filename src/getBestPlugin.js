/**
 * @param {import("./AdLad.js").AdLadPlugin[]} plugins
 * @returns {import("./AdLad.js").AdLadPlugin?}
 */
export function getBestPlugin(plugins = []) {
	const desiredActivePlugins = plugins.filter((plugin) => {
		if (!plugin.shouldBeActive) return true;
		return plugin.shouldBeActive();
	});
	if (desiredActivePlugins.length > 0) {
		return desiredActivePlugins[0];
	}
	return null;
}
