import fetch from 'node-fetch';

// https://github.com/JopiterApp/USP-Restaurant-API
const API_ENDPOINT = 'https://uspdigital.usp.br/rucard/servicos/menu/';
const RESTAURANT_ID = 2;
const HASH = '596df9effde6f877717b4e81fdb2ca9f';

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
		const response = await fetch(new URL(RESTAURANT_ID, API_ENDPOINT), {
			method: 'POST',
			body: new URLSearchParams({ hash: HASH }),
		});
		const data = await response.json();
		
		data.meals.forEach((meal) => {
			const { date, lunch, dinner } = meal;
			
			// Convert dates to ISO 8601 format
			meal.date = date.split('/').reverse().join('-');
			
			// Normalize and split dishes
			[lunch, dinner].forEach((meal) => {
				meal.menu = meal.menu
					.replace('Arroz/Feijão', 'Arroz e feijão')
					.split('/')
					.map((dish) => dish.replace(/^.*\:\s*/, ''))
					.filter((dish) => dish !== 'Fechado');
			});
		});
		
		return { statusCode: 200, body: JSON.stringify(data) };
	} catch (error) {
		return {
			statusCode: 500,
			body: JSON.stringify({
				message: { error: true, message: error.message },
			}),
		};
	}
};
