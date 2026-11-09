# AGENTS.md

## About this project

AdLad is an ads SDK manager for web games. Game developers write against a single stable API, and AdLad forwards calls
to the "active plugin" that talks to a specific portal (CrazyGames, Poki, GameDistribution, ...). The portal
integrations live in separate `adlad-plugin-*` repos, this repo is the core library, published to npm as `@adlad/adlad`.

- Plain ESM JavaScript typed with JSDoc (`checkJs: true`), there are no `.ts` sources.
- Runtime is Deno, pinned to 2.9.8 (see `.dvmrc`).
- `mod.js` is the package entry point, sources in `src/`, tests in `test/`.

## Commands

- `deno task dev` - (re)generate third-party type declarations in `.denoTypes` for IDE type checking.
- `deno task test` - run the tests.
- `deno task check` - everything CI requires: `deno fmt --check && deno lint && deno test --no-check=remote`.

## Code style

- Formatting is enforced by `deno fmt`: tabs, indent width 4, line width 120.
- Types are JSDoc: `@typedef`, `@param`, `@returns`. The public typedefs in `src/AdLad.js` (`AdLadPlugin`,
  `ShowFullScreenAdResult`, ...) are the API documentation, keep them accurate.
- Dependencies are pinned by URL in `importmap.json` (`$std/`, `$fake-dom/`, `$chdir_anywhere`). npm packages are only
  used by the scripts and are managed by Deno itself (`nodeModulesDir: "auto"`). The lockfile is disabled
  (`lock: false`).
- Lint rules disabled: `require-await`, `no-explicit-any`, `no-window`, `no-import-prefix`.
- `.denoTypes/` and `dist/` are generated and gitignored.

## Architecture

- `src/AdLad.js` - the main `AdLad` class plus all plugin typedefs. The constructor resolves the active plugin (option →
  `?adlad=` query string → `shouldBeActive`), wraps plugin hooks, dedupes gameplay/load calls, manages
  `needsPause`/`needsMute`, and sanitizes ad results.
- `src/getBestPlugin.js` - plugin selection logic.
- `src/AdLadStorage.js` - session-cached storage used by `setStorageItem`/`getStorageItem`, falls back to localStorage
  when the plugin has no storage hooks.
- `src/DeveloperBooleanState.js` / `src/PluginBooleanState.js` - shared logic for the boolean states (`needsPause`,
  `needsMute`, `canShow*Ad`) with change events.
- `src/sanitizeFullScreenAdResult.js` - normalizes plugin ad results into `ShowFullScreenAdResult`.
- `scripts/bundle.js` - rollup + terser bundle to `dist/AdLad.js` and generates `dist/AdLad.d.ts` for npm.
- `scripts/dev.js` - writes `.denoTypes` via deno_tsc_helper.

## Testing

- Deno's built-in test runner, tests in `test/**` named `*.test.js` (one `.test.ts` for type-level coverage).
- Shared helpers in `test/shared.js`: `initializingPluginTest`, `assertPromiseResolved`, `waitForMicrotasks`, spies.
- Type assertions use `assertIsType`/`testTypes` from Renda's shared test helpers, prefer them when testing types.

## CI

- `.github/workflows/check.yml` runs `deno task check` on pushes and PRs to `main`.
- `.github/workflows/npmRelease.yml` publishes to npm when a push to `main` changes `package.json`, but only if the
  version isn't already on npm: `deno task check`, `deno task bundle`, then `npm publish`.
