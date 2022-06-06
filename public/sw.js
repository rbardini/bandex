// Based on https://gist.github.com/adactio/3717b7da007a9363ddf21f584aae34af

const cacheName = 'files'
const getWeek = (date = new Date()) => {
  const oneJan = new Date(date.getFullYear(), 0, 1)
  return Math.ceil(((date - oneJan) / 86400000 + oneJan.getDay() - 1) / 7)
}

addEventListener('fetch', fetchEvent => {
  const { request } = fetchEvent
  if (request.method !== 'GET') return
  const isNavigation = request.mode === 'navigate'
  const isMenu = request.url.endsWith('/api/menu')
  fetchEvent.respondWith(
    (async () => {
      if (isMenu) {
        // Menu: cache only, network if outdated
        const cachedResponse = await caches.match(request)
        if (cachedResponse) {
          const cachedResponseDate = new Date(
            cachedResponse.headers.get('date'),
          )
          const isCachedResponseValid =
            getWeek(cachedResponseDate) === getWeek()
          if (isCachedResponseValid) return cachedResponse
        }
      }
      const fetchPromise = fetch(request)
      fetchEvent.waitUntil(
        (async () => {
          // All: cache a fresh version if possible
          const fetchedResponse = await fetchPromise
          const responseCopy = fetchedResponse.clone()
          const cache = await caches.open(cacheName)
          return cache.put(request, responseCopy)
        })(),
      )
      if (isNavigation || isMenu) {
        // HTML, menu: network first, then cache
        try {
          return await fetchPromise
        } catch (error) {
          return caches.match(request)
        }
      } else {
        // Other: cache first, then network
        const cachedResponse = await caches.match(request)
        return cachedResponse || fetchPromise
      }
    })(),
  )
})
