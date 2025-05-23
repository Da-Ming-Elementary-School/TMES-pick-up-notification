/* eslint-disable promise/prefer-await-to-then */
/*
* MIT License

Copyright (c) Sindre Sorhus <sindresorhus@gmail.com> (https://sindresorhus.com)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

*/

const methodMap = [
	[
		'requestFullscreen',
		'exitFullscreen',
		'fullscreenElement',
		'fullscreenEnabled',
		'fullscreenchange',
		'fullscreenerror',
	],
	// New WebKit
	[
		'webkitRequestFullscreen',
		'webkitExitFullscreen',
		'webkitFullscreenElement',
		'webkitFullscreenEnabled',
		'webkitfullscreenchange',
		'webkitfullscreenerror',

	],
	// Old WebKit
	[
		'webkitRequestFullScreen',
		'webkitCancelFullScreen',
		'webkitCurrentFullScreenElement',
		'webkitCancelFullScreen',
		'webkitfullscreenchange',
		'webkitfullscreenerror',

	],
	[
		'mozRequestFullScreen',
		'mozCancelFullScreen',
		'mozFullScreenElement',
		'mozFullScreenEnabled',
		'mozfullscreenchange',
		'mozfullscreenerror',
	],
	[
		'msRequestFullscreen',
		'msExitFullscreen',
		'msFullscreenElement',
		'msFullscreenEnabled',
		'MSFullscreenChange',
		'MSFullscreenError',
	],
];

const nativeAPI = (() => {
	if (typeof document === 'undefined') {
		return false;
	}

	const unprefixedMethods = methodMap[0];
	const returnValue = {};

	for (const methodList of methodMap) {
		const exitFullscreenMethod = methodList?.[1];
		if (exitFullscreenMethod in document) {
			for (const [index, method] of methodList.entries()) {
				returnValue[unprefixedMethods[index]] = method;
			}

			return returnValue;
		}
	}

	return false;
})();

const eventNameMap = {
	change: nativeAPI.fullscreenchange,
	error: nativeAPI.fullscreenerror,
};

// eslint-disable-next-line import/no-mutable-exports
let screenfull = {
	// eslint-disable-next-line default-param-last
	request(element = document.documentElement, options) {
		return new Promise((resolve, reject) => {
			const onFullScreenEntered = () => {
				screenfull.off('change', onFullScreenEntered);
				resolve();
			};

			screenfull.on('change', onFullScreenEntered);

			const returnPromise = element[nativeAPI.requestFullscreen](options);

			if (returnPromise instanceof Promise) {
				returnPromise.then(onFullScreenEntered).catch(reject);
			}
		});
	},
	exit() {
		return new Promise((resolve, reject) => {
			if (!screenfull.isFullscreen) {
				resolve();
				return;
			}

			const onFullScreenExit = () => {
				screenfull.off('change', onFullScreenExit);
				resolve();
			};

			screenfull.on('change', onFullScreenExit);

			const returnPromise = document[nativeAPI.exitFullscreen]();

			if (returnPromise instanceof Promise) {
				returnPromise.then(onFullScreenExit).catch(reject);
			}
		});
	},
	toggle(element, options) {
		return screenfull.isFullscreen ? screenfull.exit() : screenfull.request(element, options);
	},
	onchange(callback) {
		screenfull.on('change', callback);
	},
	onerror(callback) {
		screenfull.on('error', callback);
	},
	on(event, callback) {
		const eventName = eventNameMap[event];
		if (eventName) {
			document.addEventListener(eventName, callback, false);
		}
	},
	off(event, callback) {
		const eventName = eventNameMap[event];
		if (eventName) {
			document.removeEventListener(eventName, callback, false);
		}
	},
	raw: nativeAPI,
};

Object.defineProperties(screenfull, {
	isFullscreen: {
		get: () => Boolean(document[nativeAPI.fullscreenElement]),
	},
	element: {
		enumerable: true,
		get: () => document[nativeAPI.fullscreenElement] ?? undefined,
	},
	isEnabled: {
		enumerable: true,
		// Coerce to boolean in case of old WebKit.
		get: () => Boolean(document[nativeAPI.fullscreenEnabled]),
	},
});

if (!nativeAPI) {
	screenfull = {isEnabled: false};
}

export default screenfull;
