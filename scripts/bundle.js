/**
 * @fileoverview Bundles AdLad into a single file so that it can be published to package managers.
 */

import { rollup } from "npm:rollup@3.17.3";
import { minify } from "npm:terser@5.15.0";
import { setCwd } from "$chdir_anywhere";
setCwd();

/**
 * A rollup plugin for minifying builds.
 * @param {import("npm:terser@5.15.0").MinifyOptions} minifyOptions
 * @returns {import("npm:rollup@3.17.3").Plugin}
 */
export function terser(minifyOptions = {}) {
	return {
		name: "terser",
		async renderChunk(code) {
			const output = await minify(code, minifyOptions);
			if (!output.code) return null;
			return {
				code: output.code,
			};
		},
	};
}

const bundle = await rollup({
	input: "../mod.js",
	plugins: [terser()],
});

await bundle.write({
	file: "../dist/AdLad.js",
	format: "esm",
});
