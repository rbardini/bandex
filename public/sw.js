// https://gist.github.com/adactio/3717b7da007a9363ddf21f584aae34af

const cacheName = 'files';

addEventListener('fetch', fetchEvent => {
	const request = fetchEvent.request;
	if (request.method !== 'GET') {
		return;
	}
	fetchEvent.respondWith(async function() {
		const fetchPromise = fetch(request);
		fetchEvent.waitUntil(async function() {
			const responseFromFetch = await fetchPromise;
			const responseCopy = responseFromFetch.clone();
			const myCache = await caches.open(cacheName);
			return myCache.put(request, responseCopy);
		}());
		if (request.headers.get('Accept').includes('text/html')) {
			try {
				return await fetchPromise;
			}
			catch(error) {
				return caches.match(request);
			}
		} else {
			const responseFromCache = await caches.match(request);
			return responseFromCache || fetchPromise;
		}
	}());
});
