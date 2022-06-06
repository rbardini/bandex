// https://github.com/JopiterApp/USP-Restaurant-API
const API_ENDPOINT = 'https://uspdigital.usp.br/rucard/servicos/menu/'
const RESTAURANT_ID = '2'

type Meal = {
  menu: string
  calories: string
}

type Day = {
  date: string
  lunch: Meal
  dinner: Meal
}

type Response = {
  message: {
    error: boolean
    message: string
  }
  meals: Day[]
  observation: {
    observation: string
  }
}

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
    const response = await fetch(new URL(RESTAURANT_ID, API_ENDPOINT), {
      method: 'POST',
      body: new URLSearchParams({ hash: Deno.env.get('MENU_API_HASH')! }),
    })
    const data = (await response.json()) as Response

    data.meals.forEach(meal => {
      const { date, lunch, dinner } = meal

      // Convert dates to ISO 8601 format
      meal.date = date.split('/').reverse().join('-')

      // Normalize and split dishes
      ;[lunch, dinner].forEach(meal => {
        // @ts-expect-error converting string to string array
        meal.menu = meal.menu
          .replace('Arroz/Feijão', 'Arroz e feijão')
          .replace('Saladas: Diversas', 'Saladas diversas')
          .split(/[/\n]/)
          .map(dish => dish.replace(/^.*:\s*/, '').trim())
          .filter(dish => dish && dish !== 'Fechado')
      })
    })

    return new Response(JSON.stringify(data), {
      headers: { 'content-type': 'application/json' },
    })
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
