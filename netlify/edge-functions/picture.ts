const API_ENDPOINT = 'https://api.bing.microsoft.com/v7.0/images/search'

export default async (req: Request) => {
  // Only allow HTTP GET method
  if (req.method !== 'GET') {
    return new Response(
      JSON.stringify({
        message: { error: true, message: 'Method Not Allowed' },
      }),
      {
        headers: { 'content-type': 'application/json' },
        status: 405,
      },
    )
  }

  try {
    const q = new URL(req.url).searchParams.get('q')!
    const url = new URL(API_ENDPOINT)
    url.search = new URLSearchParams({
      q,
      count: '1',
      imageType: 'Photo',
      mkt: 'pt-BR',
      size: 'Large',
    }).toString()

    const response = await fetch(url, {
      headers: { 'Ocp-Apim-Subscription-Key': Deno.env.get('BING_API_KEY')! },
    })
    const data = await response.json()

    return new Response(
      JSON.stringify({
        message: { error: false, message: '' },
        url: data.value[0].contentUrl,
      }),
      {
        headers: { 'content-type': 'application/json' },
      },
    )
  } catch (error) {
    return new Response(
      JSON.stringify({
        message: { error: true, message: error.message },
      }),
      {
        headers: { 'content-type': 'application/json' },
        status: 500,
      },
    )
  }
}
