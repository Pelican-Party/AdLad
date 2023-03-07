/**
 * @fileoverview Bundles AdLad into a single file so that it can be published to package managers.
 */

import { rollup } from "npm:rollup@3.17.3";
import { minify } from "npm:terser@5.15.0";
import { setCwd } from "$chdir_anywhere";
import * as path from "$std/path/mod.ts";
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

const tmpDir = await Deno.makeTempDir();

Deno.chdir("..");
const proc = Deno.run({
	cmd: [
		"deno",
		"run",
		"--allow-env",
		"--allow-read",
		"--allow-write",
		"npm:typescript@4.9.5/tsc",
		"-p",
		"./generateTypes.tsconfig.json",
		"--outDir",
		tmpDir,
	],

	// tsc emits a whooole bunch of type errors that we are just going to ignore
	// because deno test already does type checking for us
	stderr: "null",
	stdout: "null",
});
await proc.status();

await Deno.copyFile(path.resolve(tmpDir, "src/AdLad.d.ts"), path.resolve("dist/AdLad.d.ts"));

await Deno.remove(tmpDir, {
	recursive: true,
});
