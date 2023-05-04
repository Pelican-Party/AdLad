# AdLad

AdLad allows you to easily integrate ads for your games without the need for different implementations from every
publisher. Instead, you can configure which plugins you would like to use, and whenever you want to show an ad, AdLad
will forward your request to the plugin that is currently active.

## Usage

To quickly get started, you can use jsdelivr.com to import AdLad:

```html
<script type="module">
	import {AdLad} from "https://cdn.jsdelivr.net/npm/@adlad/adlad/mod.min.js";

	// You need at least one plugin in order for AdLad calls to function.
	import {crazyGamesPlugin} from "https://cdn.jsdelivr.net/npm/@adlad/plugin-crazygames/mod.min.js";

	const adLad = new AdLad({
		plugins: [
			crazyGamesPlugin(),
		]
	});
</script>
```

You can immediately start making calls, but ads won't show until the plugin has initialized.

```js
await adLad.showFullScreenAd();
```

Both `showFullScreenAd()` and `showRewardedAd()` return an object that allows you to determine if an ad was shown.

```js
const result = await adLad.showRewardedAd();
console.log(result); // { didShowAd: true, errorReason: null }
```

Some portals require you to report loading and gameplay state, which can be done with the methods below. You can call
these as often as you like, if you call `gameplayStart()` twice in a row for example, AdLad will make sure it is passed
to the plugin only once.

```js
adLad.gameplayStart();
adLad.gameplayStop();
adLad.loadStart();
adLad.loadStop();
```

It's important that you mute audio and pause gameplay during ads. This can be done by observing the following values:

```js
adLad.needsPause; // true | false
adLad.needsMute; // true | false
```

Usually these both become `true` once you make a call for showing ads, but plugins can manually override this value.
That way your game always behaves according to the policies of the platform it's embedded on.

You can also listen for changes to these values:

```js
adLad.onNeedsPauseChange((needsPause) => {
	console.log(needsPause);
});
adLad.onNeedsMuteChange((needsMute) => {
	console.log(needsMute);
});
```

You can use `adLad.removeOnNeedsPauseChange` and `adLad.removeOnNeedsMuteChange` To remove your callbacks.

Once you have experimented enough, you can bundle AdLad using a build tool of choice. AdLad is available as
[an npm package](https://www.npmjs.com/package/@adlad/adlad) and on [deno.land/x](https://deno.land/x/adlad@v0.1.0).

For the full API reference, see [this page](removeOnNeedsPauseChange).

## Plugins

By default the first available plugin from your `plugins` option is used. You can get the id of the active plugin using
`adLad.activePlugin`.

To override which plugin is active, you can pass the plugin id via the `plugin` option like so:

```js
const adLad = new AdLad({
	plugins: [notSoCoolPlugin(), myCoolPlugin()],
	plugin: "my-cool-plugin",
});
```

Alternatively, you can use the `?adlad=my-cool-plugin` query string. This is useful when you want to host your own page,
while still allowing gaming portals to use a specific plugin. You can simply provide each gaming portal with a different
url.

## List of supported plugins

- [adlad-plugin-crazygames](https://github.com/Pelican-Party/adlad-plugin-crazygames) for
  [crazygames.com](https://www.crazygames.com/)
- [adlad-plugin-poki](https://github.com/Pelican-Party/adlad-plugin-poki) for [poki.com](https://poki.com/)
- [adlad-plugin-gamedistribution](https://github.com/Pelican-Party/adlad-plugin-gamedistribution) for
  [gamedistribution.com](https://gamedistribution.com/sdk/html5)
- [adlad-plugin-gamemonetize](https://github.com/Pelican-Party/adlad-plugin-gamemonetize) for
  [gamemonetize.com](https://gamemonetize.com/)
- [adlad-plugin-gamepix](https://github.com/Pelican-Party/adlad-plugin-gamepix) for
  [gamepix.com](https://www.gamepix.com/)
- [adlad-plugin-google-ad-placement](https://github.com/Pelican-Party/adlad-plugin-google-ad-placement) for the
  [AdSense Ad Placement API](https://developers.google.com/ad-placement/apis)
