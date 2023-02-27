/**
 * @param {import("./AdLad.js").AdLadPlugin[]} plugins
 * @returns {import("./AdLad.js").AdLadPlugin?}
 */
export function getBestPlugin(plugins = []) {
	const desiredActivePlugins = plugins.filter((plugin) => {
		if (!plugin.shouldBeActive) return true;
		return plugin.shouldBeActive();
	});
	if (desiredActivePlugins.length > 1) {
		const pluginNames = desiredActivePlugins.map((plugin) => plugin.name).join(", ");
		throw new Error(`More than one plugin requested to be active: ${pluginNames}.`);
	}
	return desiredActivePlugins[0] || null;
}
