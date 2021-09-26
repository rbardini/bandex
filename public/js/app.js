/**
 * Bandex v3.5
 * Copyright (c) 2011 Rafael Bardini
 * 
 * Licensed under the MIT license
 * http://www.opensource.org/licenses/mit-license.php
 */

Date.prototype.getWeek = function() {
	var onejan = new Date(this.getFullYear(), 0, 1);
	return Math.ceil((((this - onejan) / 86400000) + onejan.getDay() - 1) / 7);
};

/* jQuery Cookie plugin (minified)
   https://github.com/carhartl/jquery-cookie */
jQuery.cookie=function(d,e,b){if(arguments.length>1&&String(e)!=="[object Object]"){b=jQuery.extend({},b);if(e===null||e===undefined){b.expires=-1}if(typeof b.expires==="number"){var g=b.expires,c=b.expires=new Date();c.setDate(c.getDate()+g)}e=String(e);return(document.cookie=[encodeURIComponent(d),"=",b.raw?e:encodeURIComponent(e),b.expires?"; expires="+b.expires.toUTCString():"",b.path?"; path="+b.path:"",b.domain?"; domain="+b.domain:"",b.secure?"; secure":""].join(""))}b=e||{};var a,f=b.raw?function(h){return h}:decodeURIComponent;return(a=new RegExp("(?:^|; )"+encodeURIComponent(d)+"=([^;]*)").exec(document.cookie))?f(a[1]):null};

/* jQuery Backstretch plugin v1.2.5 (minified)
   http://srobbin.com/jquery-plugins/jquery-backstretch/ */
(function(a){a.backstretch=function(l,b,j){function m(c){try{h={left:0,top:0},e=f.width(),d=e/k,d>=f.height()?(i=(d-f.height())/2,g.centeredY&&a.extend(h,{top:"-"+i+"px"})):(d=f.height(),e=d*k,i=(e-f.width())/2,g.centeredX&&a.extend(h,{left:"-"+i+"px"})),a("#backstretch, #backstretch img:not(.deleteable)").width(e).height(d).filter("img").css(h)}catch(b){}"function"==typeof c&&c()}var n={centeredX:!0,centeredY:!0,speed:0},c=a("#backstretch"),g=c.data("settings")||n;c.data("settings");var f="onorientationchange"in window?a(document):a(window),k,e,d,i,h;b&&"object"==typeof b&&a.extend(g,b);b&&"function"==typeof b&&(j=b);a(document).ready(function(){if(l){var b;0==c.length?c=a("<div />").attr("id","backstretch").css({left:0,top:0,position:"fixed",overflow:"hidden",zIndex:-999999,margin:0,padding:0,height:"100%",width:"100%"}):c.find("img").addClass("deleteable");b=a("<img />").css({position:"absolute",display:"none",margin:0,padding:0,border:"none",zIndex:-999999}).bind("load",function(b){var d=a(this),e;d.css({width:"auto",height:"auto"});e=this.width||a(b.target).width();b=this.height||a(b.target).height();k=e/b;m(function(){d.fadeIn(g.speed,function(){c.find(".deleteable").remove();"function"==typeof j&&j()})})}).appendTo(c);0==a("body #backstretch").length&&a("body").append(c);c.data("settings",g);b.attr("src",l);a(window).resize(m)}});return this}})(jQuery);

function refreshStorage() {
	window.localStorage.clear();
	window.location.reload();
	return false;
}

function refreshCache() {
	window.applicationCache.update();
	if (window.applicationCache.status === 4) { window.applicationCache.swapCache(); }
	window.location.reload();
	return false;
}

function logoutBalance() {
	$.cookie('nusp', null);
	$.cookie('senha', null);
	window.location.reload();
	return false;
}

function requestMenu(callback) {
	var date = window.bandex.date,
		api = '/api/menu';
	
	var unavailable = 'Cardápio indisponível',
		outdated = 'Cardápio desatualizado',
		connection = 'Conecte-se à Internet',
		nothing = 'Nada :(';
	
	var day = date.getDay(),
		hour = date.getHours(),
		weekdays = ['Segunda','Terça','Quarta','Quinta','Sexta','Sábado','Domingo'],
		meal = 'lunch',
		meals = {lunch: 'Almoço', dinner: 'Jantar'}
		nextday = 0;
	
	if (hour > 12) {
		if (hour < 19) { meal = 'dinner'; }
		else { nextday = 1; }
	}
	
	// Shift days so that 0 represents Monday and matches menu
	day = (day+nextday+6) % 7;

	if (window.localStorage && localStorage.getItem('bandex')) {
		var json = JSON.parse(localStorage.getItem('bandex')),
			downloaded = new Date(parseInt(json.downloaded));
		if (downloaded.getWeek() === date.getWeek()) {
			window.bandex.stored = true;
			render(json, !(nextday && (date.getDay() === 0))); // inválido entre a janta do domingo e começo de segunda
		}
		else {
			localStorage.removeItem('bandex');
			getMenu();
		}
	}
	else { getMenu(); }
	
	function getMenu() {
		if (!window.bandex.offline) { $.getJSON(api, cbFunc); }
		else if (typeof callback === 'function') { callback({'nextmeal':'<li class="title">'+outdated+'</li><li>'+connection+'</li>'}); }
	}
	
	function cbFunc(json) {
		var valid = validate(json);
		
		if (window.localStorage && valid) {
			json.downloaded = date.valueOf();
			localStorage.setItem('bandex', JSON.stringify(json));
			window.bandex.stored = true;
		}
		render(json, valid);
	}
	
	function validate(json) {
		return !json.message.error;
	}

	function render(json, valid) {
		var menu, greve = true, nextmeal;
		
		if (valid) {
			nextmeal = '<li class="title">'+meals[meal]+' de '+(!nextday ? 'hoje' : 'amanhã, hoje já era')+'</li>';
			if (json.meals[day]) {
				$.each(json.meals[day][meal].menu, function(dish, food) {
					if (food) {
						nextmeal += '<li id="'+dish+'"><a href="#" title="Visualizar '+dish+'">'+food+'</a></li>';
						greve = false;
					}
				});
			}
			else { greve = true; }
			
			var columns = '<col class="meals" />',
				days = '<tr><th></th>',
				lunches = '<tr><td class="meal lunch">Almoço</td>',
				dinners = '<tr><td class="meal dinner">Jantar</td>';
			
			$.each(json.meals, function(i) {
				columns += '<col '+((i === day) ? 'class="today"' : '')+'/>';
				days += '<th>'+weekdays[i]+'</th>';
				
				lunches +='<td class="lunch"><ul>';
				$.each(this.lunch.menu, function(dish, food) {
					if (food) { lunches += '<li>'+food+'</li>'; }
				});
				lunches += '</ul></td>';
				
				dinners += '<td class="dinner"><ul>';
				$.each(this.dinner.menu, function(dish, food) {
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

function requestBalance(form, nusp, senha, remember) {
	var result = form.next();
	
	form.slideUp();
	result.removeClass('error').html('Perguntando pro tiozinho...').slideDown();
	$.ajax({
		url: 'rucard.php',
		data: 'nusp='+nusp+'&senha='+senha,
		success: function(data) {
			if (data >= 0) {
				result.slideUp('fast', function() {
					$(this).html('<span class="bignum">'+data+'</span> crédito'+(data > 1 ? 's' : '')+' de saldo na conta '+nusp+'. <a href="#" onclick="return logoutBalance();">(sair)</a>').slideDown();
				});
				form.remove();
				if (remember) {
					$.cookie('nusp', nusp);
					$.cookie('senha', senha);
				}
			} else {
				form.slideDown();
				result.html('Número USP ou senha inválidos.').addClass('error');
			}
		},
		error: function() {
			form.slideDown();
			if (window.bandex.offline) {
				result.html('A consulta de créditos requer uma conexão à Internet.');
			} else {
				result.html('Não foi possível completar a sua ligação, tente novamente mais tarde.');
			}
			result.addClass('error');
		}
	});
}

function displayPicture(anchor) {
	var imgSearch = 'https://ajax.googleapis.com/ajax/services/search/images?v=1.0&q='+encodeURIComponent(anchor.text())+'&rsz=1&callback=?';
	var item = anchor.closest('li').addClass('loading');
	
	$.getJSON(imgSearch, function(data) {
		var imgUrl = data.responseData.results[0].url;
		$.backstretch(imgUrl, {speed: 300});
		item.removeClass('loading');
	});
}

$(function() {
	window.bandex = {};
	window.bandex.offline = !window.navigator.onLine;
	window.bandex.stored = false;
	window.bandex.date = new Date();
	
	if (!'placeholder' in document.createElement('input')) {
		$('[placeholder]').focus(function() {
			var input = $(this);
			if (input.val() == input.attr('placeholder')) { input.val(''); }
		}).blur(function() {
			var input = $(this);
			if (input.val() == '' || input.val() == input.attr('placeholder')) { input.val(input.attr('placeholder')); }
		}).blur();
		$('[placeholder]').parents('form').submit(function() {
			$(this).find('[placeholder]').each(function() {
				var input = $(this);
				if (input.val() == input.attr('placeholder')) { input.val(''); }
			})
		});
	}
	
	if (window.applicationCache) {
		$(window.applicationCache).bind('updateready cached noupdate', function() {
			$('.appcache > a').css('display','block');
		});
	}
	
	requestMenu(function(results) {
		$('#nextmeal').animate({marginLeft:'-100%'}, 'slow', function() {
			$(this).html(results.nextmeal);
			$('#nextmeal a').click(function(event) {
				event.preventDefault();
				displayPicture($(this));
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
			$('.appcache > a').css('display','block');
			$('.refresh').hide();
		}
	});
	
	$('.appcache > a, .localstorage > a').click(function(event) {
		event.preventDefault();
		$(this).next().stop(true,true).slideToggle();
	});
	
	$('.balance > a').click(function(event) {
		var form = $('form'),
			nusp = $.cookie('nusp'),
			senha = $.cookie('senha');
		event.preventDefault();
		if (form.length) {
			if (nusp !== null && senha !== null) {
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
		$(this).toggleClass('active');
		$('#panel').slideToggle('slow');
	});
});
