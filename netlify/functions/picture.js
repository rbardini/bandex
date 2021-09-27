import fetch from 'node-fetch';

const API_ENDPOINT = 'https://api.bing.microsoft.com/v7.0/images/search';

export const handler = async (event) => {
	// Only allow HTTP GET method
	if (event.httpMethod !== 'GET') {
		return {
			statusCode: 405,
			body: JSON.stringify({
				message: { error: true, message: 'Method Not Allowed' },
			}),
		};
	}
	
	try {
		const {q} = event.queryStringParameters;
		const url = new URL(API_ENDPOINT)
		url.search = new URLSearchParams({
			q,
			count: 1,
			imageType: 'Photo',
			mkt: 'pt-BR',
			size: 'Large',
		});
		
		const response = await fetch(url, {
			headers: {'Ocp-Apim-Subscription-Key': process.env.BING_API_KEY}
		});
		const data = await response.json();
		
		return { statusCode: 200, body: JSON.stringify({
			message: { error: false, message: '' },
			url: data.value[0].contentUrl}),
		};
	} catch (error) {
		return {
			statusCode: 500,
			body: JSON.stringify({
				message: { error: true, message: error.message },
			}),
		};
	}
}
