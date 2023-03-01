import { generateTypes } from "https://deno.land/x/deno_tsc_helper@v0.3.0/mod.js";
import { setCwd } from "$chdir_anywhere";
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
});
