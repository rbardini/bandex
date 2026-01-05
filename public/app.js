var cookies = {
  get(name) {
    return document.cookie
      .split('; ')
      .find(row => row.startsWith(name + '='))
      ?.split('=')[1]
  },
  set(name, value, attributes = {}) {
    return (document.cookie = [
      [name, value],
      ['path', '/'],
      ...Object.entries(attributes),
    ]
      .map(entry => entry.join('='))
      .filter(Boolean)
      .join('; '))
  },
  remove(name) {
    return this.set(name, '', { expires: new Date(0).toUTCString() })
  },
}

var effects = {
  duration: { fast: 200, normal: 400, slow: 600 },
  animate(element, keyframes, duration = 'normal') {
    return new Promise(resolve => {
      element.animate(keyframes, {
        duration: this.duration[duration],
        fill: 'forwards',
      }).onfinish = resolve
    })
  },
  slideUp(element, duration) {
    return this.animate(element, { height: 0 }, duration)
  },
  slideDown(element, duration) {
    return this.animate(element, { height: 'auto' }, duration)
  },
  slideToggle(element, duration) {
    return element.clientHeight
      ? this.slideUp(element, duration)
      : this.slideDown(element, duration)
  },
}

function getTimezoneISODateString(date) {
  return new Date(date.getTime() - date.getTimezoneOffset() * 60000)
    .toISOString()
    .split('T')
    .shift()
}

function refreshCache(event) {
  event.preventDefault()
  navigator.serviceWorker.getRegistration().then(function (registration) {
    registration.unregister().then(function () {
      window.location.reload()
    })
  })
}

function logoutBalance(event) {
  event.preventDefault()
  cookies.remove('nusp')
  cookies.remove('senha')
  window.location.reload()
}

function requestMenu(callback) {
  var now = new Date(),
    api = '/api/menu'

  var unavailable = 'Cardápio indisponível',
    outdated = 'Cardápio desatualizado',
    connection = 'Conecte-se à Internet',
    nothing = 'Nada :('

  var hour = now.getHours(),
    nextday = hour < 19 ? 0 : 1,
    meal = hour < 13 || nextday ? 'lunch' : 'dinner',
    day = getTimezoneISODateString(new Date(now.getTime() + nextday * 86400000))

  getMenu()

  async function getMenu() {
    try {
      var response = await fetch(api)

      if (!response.ok) throw new Error(response.statusText)

      var json = await response.json()
      var valid = validate(json)

      render(json, valid)
    } catch {
      callback({
        nextmeal:
          '<li class="title">' + outdated + '</li><li>' + connection + '</li>',
      })
    }
  }

  function validate(json) {
    return (
      !json.message.error &&
      json.meals.some(function ({ date }) {
        return date === day
      })
    )
  }

  function render(json, valid) {
    var menu,
      greve = true,
      nextmeal

    if (valid) {
      nextmeal =
        '<li class="title">' +
        (meal === 'lunch' ? 'Almoço' : 'Jantar') +
        ' de ' +
        (!nextday ? 'hoje' : 'amanhã, hoje já era') +
        '</li>'
      json.meals
        .find(function ({ date }) {
          return date === day
        })
        ?.[meal].menu.forEach(function (food) {
          nextmeal += '<li>' + food + '</li>'
          greve = false
        })

      var columns = '<col class="meals" />',
        days = '<tr><th></th>',
        lunches = '<tr><td class="meal lunch">Almoço</td>',
        dinners = '<tr><td class="meal dinner">Jantar</td>'

      json.meals.forEach(function ({ date, lunch, dinner }) {
        columns +=
          '<col ' +
          (date === getTimezoneISODateString(now) ? 'class="today"' : '') +
          '/>'
        days +=
          '<th>' +
          new Date(date)
            .toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })
            .replace('.,', '') +
          '</th>'

        lunches += '<td class="lunch"><ul>'
        lunch.menu.forEach(function (food) {
          if (food) {
            lunches += '<li>' + food + '</li>'
          }
        })
        lunches += '</ul></td>'

        dinners += '<td class="dinner"><ul>'
        dinner.menu.forEach(function (food) {
          if (food) {
            dinners += '<li>' + food + '</li>'
          }
        })
        dinners += '</ul></td>'
      })

      days += '</tr>'
      lunches += '</tr>'
      dinners += '</tr>'
      menu =
        '<table><colgroup>' +
        columns +
        '</colgroup><thead>' +
        days +
        '</thead><tbody>' +
        lunches +
        dinners +
        '</tbody></table>'
    } else {
      nextmeal = '<li class="title">' + unavailable + '</li>'
    }
    if (greve) {
      nextmeal += '<li>' + nothing + '</li>'
    }

    callback({ nextmeal: nextmeal, menu: menu })
  }
}

async function requestBalance(form, nusp, senha, remember) {
  var result = form.nextElementSibling

  effects.slideUp(form)
  result.classList.remove('error')
  result.innerHTML = 'Perguntando pro tiozinho...'
  effects.slideDown(result)

  var response = await fetch('rucard.php?nusp=' + nusp + '&senha=' + senha)

  if (response.ok) {
    var data = await response.text()

    if (data >= 0) {
      await effects.slideUp(result, 'fast')
      result.innerHTML =
        '<span class="bignum">' +
        data +
        '</span> crédito' +
        (data > 1 ? 's' : '') +
        ' de saldo na conta ' +
        nusp +
        '. '

      var logout = document.createElement('a')
      logout.href = '#'
      logout.textContent = '(sair)'
      logout.onclick = logoutBalance
      result.appendChild(logout)

      effects.slideDown(result)

      form.remove()
      if (remember) {
        cookies.set('nusp', nusp)
        cookies.set('senha', senha)
      }
    } else {
      effects.slideDown(form)
      result.innerHTML = 'Número USP ou senha inválidos.'
      result.classList.add('error')
    }
  } else {
    effects.slideDown(form)
    if (window.bandex.offline) {
      result.innerHTML = 'A consulta de créditos requer uma conexão à Internet.'
    } else {
      result.innerHTML =
        'Não foi possível completar a sua ligação, tente novamente mais tarde.'
    }
    result.classList.add('error')
  }
}

function init() {
  window.bandex = {}
  window.bandex.offline = !navigator.onLine

  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw.js')
    navigator.serviceWorker.ready.then(function () {
      document.querySelector('.appcache > a').style.display = 'block'
    })
  }

  requestMenu(async function (results) {
    var nextmeal = document.querySelector('#nextmeal')
    await effects.animate(nextmeal, { marginLeft: '-100%' }, 'slow')
    nextmeal.innerHTML = results.nextmeal
    effects.animate(nextmeal, { marginLeft: 0 }, 'slow')

    if (results.menu) {
      document.querySelector('#panel').innerHTML = results.menu
      document.querySelector('#btn-slide').style.display = 'block'
    }

    document.querySelector('.balance > a').style.display = 'block'
    if (window.bandex.offline) {
      document.querySelector('.refresh-cache').style.display = 'none'
    }
  })

  document.querySelector('.appcache > a').onclick = function (event) {
    event.preventDefault()
    effects.slideToggle(this.nextElementSibling)
  }

  document.querySelector('.balance > a').onclick = function (event) {
    var form = document.querySelector('form'),
      nusp = cookies.get('nusp'),
      senha = cookies.get('senha')
    event.preventDefault()
    if (form) {
      if (nusp != null && senha != null) {
        requestBalance(form, nusp, senha, true)
        return
      }
    }
    effects.slideToggle(this.nextElementSibling)
  }

  document.querySelector('#remember').onclick = function () {
    effects.slideToggle(document.querySelector('label[for=remember] + p'))
  }

  document.querySelector('form').onsubmit = function () {
    var nusp = document.querySelector('#nusp'),
      senha = document.querySelector('#senha'),
      remember = !!document.querySelector('#remember:checked')

    nusp.classList.toggle('error', !nusp.value)
    senha.classList.toggle('error', !senha.value)
    if (!nusp.value || !senha.value) {
      return false
    }

    requestBalance(this, nusp.value, senha.value, remember)
    return false
  }

  document.querySelector('#btn-slide a').onclick = function (event) {
    event.preventDefault()
    this.classList.toggle('active')
    effects.slideToggle(document.querySelector('#panel'), 'slow')
  }

  document.querySelector('.refresh-cache').onclick = refreshCache
}

init()
