import { generateTypes } from "https://deno.land/x/deno_tsc_helper@v0.3.0/mod.js";
import { setCwd } from "https://deno.land/x/chdir_anywhere@v0.0.2/mod.js";
setCwd(import.meta.url);
Deno.chdir("..");

generateTypes({
	outputDir: ".denoTypes",
	importMap: "importmap.json",
	include: [
		"scripts",
		"src",
		"test",
	],
	logLevel: "WARNING",
});
