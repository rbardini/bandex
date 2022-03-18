import Cookies from 'https://cdn.skypack.dev/js-cookie';
import $ from 'https://cdn.skypack.dev/jquery';

Date.prototype.getWeek = function() {
	var onejan = new Date(this.getFullYear(), 0, 1);
	return Math.ceil((((this - onejan) / 86400000) + onejan.getDay() - 1) / 7);
};

Date.prototype.toTimezoneISODateString = function() {
	var date = new Date(this.getTime() - this.getTimezoneOffset() * 60000);
	return date.toISOString().split('T').shift();
};

function refreshStorage(event) {
	event.preventDefault();
	window.localStorage.clear();
	window.location.reload();
}

function refreshCache(event) {
	event.preventDefault();
	navigator.serviceWorker.getRegistration().then(function(registration) {
		registration.unregister().then(function() {
			window.location.reload();
		});
	});
}

function logoutBalance(event) {
	event.preventDefault();
	Cookies.remove('nusp');
	Cookies.remove('senha');
	window.location.reload();
}

function requestMenu(callback) {
	var now = new Date(),
		api = '/api/menu';
	
	var unavailable = 'Cardápio indisponível',
		outdated = 'Cardápio desatualizado',
		connection = 'Conecte-se à Internet',
		nothing = 'Nada :(';
	
	var hour = now.getHours(),
		nextday = (hour < 19) ? 0 : 1,
		meal = (hour < 13 || nextday) ? 'lunch' : 'dinner',
		day = new Date(now.getTime() + nextday * 86400000).toTimezoneISODateString();

	if (localStorage.getItem('menu')) {
		var json = JSON.parse(localStorage.getItem('menu')),
			downloaded = new Date(parseInt(json.downloaded));
		if (downloaded.getWeek() === now.getWeek()) {
			window.bandex.stored = true;
			render(json, validate(json));
		}
		else {
			localStorage.removeItem('menu');
			getMenu();
		}
	}
	else { getMenu(); }
	
	async function getMenu() {
		if (!window.bandex.offline) {
			var response = await fetch(api);
			var json = await response.json();
			var valid = validate(json);
			
			if (valid) {
				json.downloaded = now.valueOf();
				localStorage.setItem('menu', JSON.stringify(json));
				window.bandex.stored = true;
			}
			render(json, valid);
		}
		else if (typeof callback === 'function') { callback({'nextmeal':'<li class="title">'+outdated+'</li><li>'+connection+'</li>'}); }
	}
	
	function validate(json) {
		return !json.message.error && json.meals.some(function({date}) { return date === day });
	}

	function render(json, valid) {
		var menu, greve = true, nextmeal;
		
		if (valid) {
			nextmeal = '<li class="title">'+(meal === 'lunch' ? 'Almoço' : 'Jantar')+' de '+(!nextday ? 'hoje' : 'amanhã, hoje já era')+'</li>';
			json.meals.find(function({date}) { return date === day })?.[meal].menu.forEach(function(food) {
				nextmeal += '<li><a href="#" title="Visualizar">'+food+'</a></li>';
				greve = false;
			});
			
			var columns = '<col class="meals" />',
				days = '<tr><th></th>',
				lunches = '<tr><td class="meal lunch">Almoço</td>',
				dinners = '<tr><td class="meal dinner">Jantar</td>';
			
			json.meals.forEach(function({date, lunch, dinner}) {
				columns += '<col '+((date === now.toTimezoneISODateString()) ? 'class="today"' : '')+'/>';
				days += '<th>'+new Date(date).toLocaleDateString('pt-BR', {weekday: 'short', day: '2-digit'}).replace(/\W+/, ' ')+'</th>';
				
				lunches +='<td class="lunch"><ul>';
				lunch.menu.forEach(function(food) {
					if (food) { lunches += '<li>'+food+'</li>'; }
				});
				lunches += '</ul></td>';
				
				dinners += '<td class="dinner"><ul>';
				dinner.menu.forEach(function(food) {
					if (food) { dinners += '<li>'+food+'</li>'; }
				});
				dinners += '</ul></td>';
			});
			
			days += '</tr>'; lunches += '</tr>'; dinners += '</tr>';
			menu = '<table><colgroup>'+columns+'</colgroup><thead>'+days+'</thead><tbody>'+lunches+dinners+'</tbody></table>';
		}
		else { nextmeal = '<li class="title">'+unavailable+'</li>'; }
		if (greve) { nextmeal += '<li>'+nothing+'</li>'; }
		
		if (typeof callback === 'function') { callback({'nextmeal':nextmeal, 'menu':menu}); }
	}
}

async function requestBalance(form, nusp, senha, remember) {
	var result = form.next();
	
	form.slideUp();
	result.removeClass('error').html('Perguntando pro tiozinho...').slideDown();

	var response = await fetch('rucard.php?nusp='+nusp+'&senha='+senha);

	if (response.ok) {
		var data = await response.text();

		if (data >= 0) {
			result.slideUp('fast', function() {
				$(this).html('<span class="bignum">'+data+'</span> crédito'+(data > 1 ? 's' : '')+' de saldo na conta '+nusp+'. ').append($('<a href="#">(sair)</a>').click(logoutBalance)).slideDown();
			});
			form.remove();
			if (remember) {
				Cookies.set('nusp', nusp);
				Cookies.set('senha', senha);
			}
		} else {
			form.slideDown();
			result.html('Número USP ou senha inválidos.').addClass('error');
		}
	} else {
		form.slideDown();
		if (window.bandex.offline) {
			result.html('A consulta de créditos requer uma conexão à Internet.');
		} else {
			result.html('Não foi possível completar a sua ligação, tente novamente mais tarde.');
		}
		result.addClass('error');
	}
}

async function displayPicture(anchor) {
	var imgSearch = '/api/picture?q='+encodeURIComponent(anchor.text);
	var item = anchor.closest('li')
	
	item.classList.add('loading');
	
	var response = await fetch(imgSearch);
	var data = await response.json();

	document.body.style.backgroundImage = 'url('+data.url+')';
	item.classList.remove('loading');
}

function init() {
	window.bandex = {};
	window.bandex.offline = !window.navigator.onLine;
	window.bandex.stored = false;
	
	navigator.serviceWorker.register('/sw.js');
	navigator.serviceWorker.ready.then(function() {
		$('.appcache > a').css('display','block');
	});
	
	requestMenu(function(results) {
		$('#nextmeal').animate({marginLeft:'-100%'}, 'slow', function() {
			$(this).html(results.nextmeal);
			$('#nextmeal a').click(function(event) {
				event.preventDefault();
				displayPicture(this);
			});
		}).animate({marginLeft:'0'}, 'slow', function() {
			// $('#newsbar').slideDown(); //.delay(5000).slideUp();
		});
		
		if (results.menu) {
			$('#panel').html(results.menu);
			$('#btn-slide').fadeIn('slow');
		}
		
		$('.balance > a').css('display','block');
		if (window.bandex.stored) { $('.localstorage > a').css('display','block'); }
		if (window.bandex.offline) {
			$('.refresh').hide();
		}
	});
	
	$('.appcache > a, .localstorage > a').click(function(event) {
		event.preventDefault();
		$(this).next().stop(true,true).slideToggle();
	});
	
	$('.balance > a').click(function(event) {
		var form = $('form'),
			nusp = Cookies.get('nusp'),
			senha = Cookies.get('senha');
		event.preventDefault();
		if (form.length) {
			if (nusp != null && senha != null) {
				requestBalance(form, nusp, senha, true);
				return;
			}
		}
		$(this).next().stop(true,true).slideToggle();
	});
	
	$('#remember').click(function(event) {
		$(this).nextAll('p').stop(true,true).slideToggle();
	});
	
	$('form').submit(function() {
		var nusp = $('#nusp'),
			senha = $('#senha'),
			remember = $('#remember').is(':checked');
		
		!nusp.val() ? nusp.addClass('error') : nusp.removeClass('error');
		!senha.val() ? senha.addClass('error') : senha.removeClass('error');
		if (!nusp.val() || !senha.val()) { return false; }
		
		requestBalance($(this), nusp.val(), senha.val(), remember);
		return false;
	});
	
	$('#btn-slide a').click(function(event) {
		event.preventDefault();
		this.classList.toggle('active');
		$('#panel').slideToggle('slow');
	});

	$('.refresh.storage').click(refreshStorage);
	$('.refresh.cache').click(refreshCache);
}

init();
