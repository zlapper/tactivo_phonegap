// Nota: Este archivo debe ir incluido en el html ANTES de jQuery Mobile.
// Ref: http://jquerymobile.com/test/docs/api/globalconfig.html


// $(document).bind("mobileinit", function () {

	// 	// Navigation
	// 	$.mobile.page.prototype.options.backBtnText = "Go back";
	// 	$.mobile.page.prototype.options.addBackBtn      = true;
	// 	$.mobile.page.prototype.options.backBtnTheme    = "d";

	// 	// Page
	// 	$.mobile.page.prototype.options.headerTheme = "a";  // Page header only
	// 	$.mobile.page.prototype.options.contentTheme    = "c";
	// 	$.mobile.page.prototype.options.footerTheme = "a";

	// 	// Listviews
	// 	$.mobile.listview.prototype.options.headerTheme = "a";  // Header for nested lists
	// 	$.mobile.listview.prototype.options.theme           = "c";  // List items / content
	// 	$.mobile.listview.prototype.options.dividerTheme    = "d";  // List divider

	// 	$.mobile.listview.prototype.options.splitTheme   = "c";
	// 	$.mobile.listview.prototype.options.countTheme   = "c";
	// 	$.mobile.listview.prototype.options.filterTheme = "c";
	// 	$.mobile.listview.prototype.options.filterPlaceholder = "Filter data...";
// });

// Configuracion global de jQuery Mobile
$(document).on("mobileinit", function () {
	$.mobile.defaultPageTransition = 'none';

	$.mobile.loader.prototype.options.theme = "a";
	// $.mobile.loader.prototype.options.text = "Cargando...";
	// $.mobile.loader.prototype.options.textVisible = true;
	$.mobile.page.prototype.options.backBtnText = "Atrás";

	/* Necesario para Phonegap, aunque genera peligro potencial de XSS sin el Whitelist de Phonegap.
	 * Ref: http://jquerymobile.com/test/docs/pages/phonegap.html
	 * Nota: Mirar $.support.cors */
	// $.mobile.allowCrossDomainPages = true;
});

// Transporte Activo
window.ta = {
	// BASE_URL: (location.hostname == 'localhost') ? 'localhost:8000' : 'transporteactivo.com/api',
	BASE_URL: 'http://transporteactivo.com/',
	nearbyStops: [],
	buses_icons: {
		E: "img/bus_articulado.png",
		T: "img/bus_articulado.png",
		P: "img/bus_padron.png",
		A: "img/bus_alimentador.png"
	},
	faces_images: {
		positivo: "img/carita_verde.png",
		negativo: "img/carita_amarilla.png",
		neutro: "img/carita_roja.png"
	},
	buses_names: {
		E: "Expreso (Articulado)",
		T: "Articulado",
		P: "Padrón",
		A: "Alimentador"
	},
	orientaciones: {
		0: "Norte &rsaquo; Sur",
		1: "Sur &rsaquo; Norte"
	},

	geoLocation: {
		browserSupportFlag: new Boolean(),

		findLocation: function() {
			if(navigator.geolocation) {
				this.browserSupportFlag = true;
				$.mobile.loading('show', {text: 'Buscando localización...'});
				navigator.geolocation.getCurrentPosition(this.locationFound, this.locationNotFound);
			}
			else { // browser doesn't support Geolocation
				this.browserSupportFlag = false;
				alert("Geolocation service failed.");
			}
		},

		locationFound: function(position){
			$.mobile.loading('hide');
			// update the current position
			ta.map.currentPosition = new google.maps.LatLng(position.coords.latitude, position.coords.longitude);
			// center the map
			ta.map.map.panTo(ta.map.currentPosition);
			// resets the zoom
			ta.map.resetZoom();
			// add the blue point marker
			ta.map.setPositionMarker(ta.map.currentPosition);
		},

		locationNotFound: function(err) {
			$.mobile.loading('hide');
			if (err.code == 1) { //PERMISSION_DENIED
				// user denied
			} else if (err.code == 2) { //POSITION_UNAVAILABLE
				// network not available/satellites could not be contacted
			} else if (err.code == 3) { //TIMEOUT
				// network took too long to calculate the user's position
			} else {
				//unexpected error
			}
		}
	},
	map: {
		init: function() {
			this.defaultPosition = new google.maps.LatLng(3.422556, -76.517222);
			this.currentPosition = this.defaultPosition;
			this.currentPositionMarker = null;
			this.nearbyStopsMarkers = [];
			this.ajaxTimeout = null;
			this.$infoPopup = $('#info-popup');
			this.marker_icons = {
				dot: {
					url: 'img/marker_dot.png',
					anchor: new google.maps.Point(16.5,16.5),
					scaledSize: new google.maps.Size(22,22)
				},
				dot_shadow: {
					url: 'img/marker_dot_shadow.png',
					anchor: new google.maps.Point(22,22),
					scaledSize: new google.maps.Size(33,33)
				},
				shadow: {
					url: 'img/marker_icon_shadow.png',
					anchor: new google.maps.Point(17,34),
					scaledSize: new google.maps.Size(43,35)
				},
				1: {
					url: 'img/stop_troncal.png',
				},
				2: {
					url: 'img/stop_pretroncal.png',
				},
				3: {
					url: 'img/stop_alimentadora.png',
				}
			};
			this.createMap();
		},

		createMap: function() {
			var mapOptions = {
				zoom: 15,
				maxZoom: 17,
				minZoom: 11,
				center: this.defaultPosition,
				mapTypeId: google.maps.MapTypeId.ROADMAP,
				panControl: false,
				streetViewControl: false,
				zoomControl: true,
				zoomControlOptions: {
					style: google.maps.ZoomControlStyle.SMALL
				}
			};
			this.map = new google.maps.Map($(".map-canvas").get(0), mapOptions);
		},

		setPositionMarker: function(position) {
			if (this.currentPositionMarker === null) {
				var markerOptions = {
					map: this.map,
					title: "¡Estas aquí!",
					icon: this.marker_icons.dot,
					shadow: this.marker_icons.dot_shadow,
					position: new google.maps.LatLng(position.lat(), position.lng()),
					zIndex: google.maps.Marker.MAX_ZINDEX
					// animation : google.maps.Animation.DROP
				};
				this.currentPositionMarker = new google.maps.Marker(markerOptions);
			} else {
				ta.map.currentPositionMarker.setPosition(position);
			}
		},

		addStopMarker: function(stop) {
			var markerOptions = {
				map: this.map,
				title: stop.nombre,
				icon: this.marker_icons[stop.tipo_parada],
				// shadow: this.marker_icons.shadow,
				position: new google.maps.LatLng(stop.lat, stop.lng),
				zIndex: google.maps.Marker.MAX_ZINDEX - stop.tipo_parada
				// animation : google.maps.Animation.DROP
			};
			var marker = new google.maps.Marker(markerOptions);
			marker.stop = stop;
			this.nearbyStopsMarkers.push(marker);

			// Asocio el click del marcador a la ventana con los detalle de la parada
			google.maps.event.addListener(marker, "click", function() {
				ta.map.$infoPopup
					.find('h2').text(marker.getTitle()).end()
					.find('.routes').html('').end()
					.find('.ver-mas').attr('href', "parada.html").data('id', marker.stop.id).end()
					.popup('open');

				$.ajax({
					url: ta.BASE_URL+"api/v1/rutas-por-parada/",
					type: "get",
					data: {parada_id: marker.stop.id},
					dataType: "JSON",
					success: function(data, textStatus, jqXHR) {
						if (textStatus === "success") {
							// var html_list = {};
							// // construct the html for each routes list, grouped by orientation
							// for (i = 0; i < data.length; ++i) {
							// 	val = data[i];
							// 	html_list[val.orientacion] = html_list[val.orientacion] || '';
							// 	tipo = val.nombre_ruta.substring(0, 1);
							// 	html_list[val.orientacion] += '<a href="ruta.html" data-id="'+val.id_ruta+'" data-nombre="'+val.nombre_ruta+'" data-descripcion="' + val.descripcion + '" data-orientacion="'+val.orientacion+'" data-linevariant="'+val.linevariant+'" data-role="button" data-mini="true" class="'+tipo+'" title="'+val.descripcion+'">'+val.nombre_ruta+'</a>';
							// }
							// var html = '';
							// // add opening and closing tags for the lists
							// for (var k in html_list) {
							// 	html += '<h4>Sentido '+ta.orientaciones[k]+'</h4><div data-role="controlgroup" data-type="horizontal">' + html_list[k] + '</div>';
							// }
							html_list = '';
							for (i = 0; i < data.length; ++i) {
								val = data[i];
								tipo = val.nombre_ruta.substring(0, 1);
								html_list += '<a href="ruta.html" data-id="'+val.id_ruta+'" data-nombre="'+val.nombre_ruta+'" data-orientacion="'+val.orientacion+'" data-linevariant="'+val.linevariant+'" data-role="button" data-mini="true" class="'+tipo+'">'+val.nombre_ruta+'</a>';
								html = '<div data-role="controlgroup" data-type="horizontal">' + html_list + '</div>';
							}
							$("#parada").find('.routes').html(html).trigger('create');

							// console.log(html_list);
							ta.search.parada = {id: marker.stop.id, nombre: marker.getTitle(), position: marker.getPosition(), icon: marker.getIcon().url};
							ta.map.$infoPopup
								.find('.routes').html(html).trigger('create').end()
								.on('click', 'a', function(){
									ta.search.ruta = {
										id: jQuery(this).data('id'),
										nombre: jQuery(this).data('nombre'),
										orientacion: jQuery(this).data('orientacion'),
										descripcion: jQuery(this).data('descripcion'),
										linevariant: jQuery(this).data('linevariant')
									};
								});
						}
					}
				});
			});
		},

		loadVisibleStops: function(type){
			var bounds= this.map.getBounds();
			var data = {
				ne: [bounds.getNorthEast().lat(), bounds.getNorthEast().lng()],
				sw: [bounds.getSouthWest().lat(), bounds.getSouthWest().lng()]
			};

			data.tipo = [];
			if ($('#ver-troncales').is(":enabled:checked")) data.tipo.push(1);
			if ($('#ver-pretroncales').is(":enabled:checked")) data.tipo.push(2);
			if ($('#ver-alimentadoras').is(":enabled:checked")) data.tipo.push(3);
			// console.log(data);

			// TODO: Idea: mostrar max 100 puntos, ordenados por tipo y cercania?
			$.ajax({
				url: ta.BASE_URL+"api/v1/paradas-cercanas/",
				type: "get",
				data: data,
				dataType: "JSON",
				// async: false,
				beforeSend: function(jqXHR, settings) {
					// $.mobile.loading('show', {text: 'Cargando estaciones cercanas...'});
					$.mobile.loading('show');
				},
				complete: function(jqXHR, settings) {
					$.mobile.loading('hide');
				},
				success: function(data, textStatus, jqXHR) {
					if (textStatus === "success") {
						//remove the current markers from the map and their reference to the stop
						for (i = 0; i < ta.map.nearbyStopsMarkers.length; ++i) {
							ta.map.nearbyStopsMarkers[i].setMap(null);
							ta.map.nearbyStopsMarkers[i].stop = null;
						}
						ta.nearbyStops = data;
						ta.map.addStopMarkers(ta.nearbyStops);
					}
				},
				error: function(jqXHR, textStatus, errorThrown) {
					// console.log(jqXHR);
					// console.log(textStatus);
					// console.log(errorThrown);
					//ocultarIndicadorAjax();
					toast("Error cargando las paradas cercanas.");
				}
			});
		},

		addStopMarkers: function(stopsArray){
			// console.log(stopsArray);
			for (i = 0; i < stopsArray.length; ++i) {
				this.addStopMarker(stopsArray[i]);
			}
		},

		resetZoom: function() {
			this.map.setZoom(15);
		}
	},

	search: {
		parada: null,
		ruta: null
	},

	favs: {
		toggleFav: function($button, tipo) {
			if (Modernizr.localstorage) {
				if (localStorage[tipo] == null) { localStorage[tipo] = ''; }
				temp = localStorage[tipo].split(',');

				$button.toggleClass('yellow');
				if ($button.hasClass('yellow')) {
					if (tipo == 'paradasf') {
						temp.push(ta.search.parada.id.toString());
					} else if (tipo == 'rutasf') {
						temp.push(ta.search.ruta.id.toString());
					}
					toast('Agregada a Favoritos');
				} else {
					if (tipo == 'paradasf') {
						temp.splice( $.inArray(ta.search.parada.id.toString(), temp), 1 ); //remove element
					} else if (tipo == 'rutasf') {
						temp.splice( $.inArray(ta.search.ruta.id.toString(), temp), 1 ); //remove element
					}
					toast('Eliminada de Favoritos');
				}
				// localStorage[tipo] = temp.join(',');
				localStorage[tipo] = temp;
			} else {
				toast('Lo sentimos, tu navegador no soporta esta función.');
			}
		}
	},

	ratings: {
		// model: [miostops|lines]
		// tipo: [a|n|d] (aprueba, comentario, desaprueba)
		rate: function($form) {
			object_id = $form.find('[name=object_id]').val();
			model = $form.find('[name=model]').val();
			tipo = $form.find('[name=tipo]').val();
			comentario = $form.find('[name=comentario]').val();

			$.ajax({
				url: ta.BASE_URL+"api/v1/calificar/",
				type: "post",
				data: {object_id: object_id, model: model, tipo: tipo, comentario: comentario},
				success: function(data, textStatus, jqXHR) {
					if (textStatus === "success") {
						toast("Reporte enviado con éxito.");
						$form.get(0).reset();
					}
				},
				error: function(jqXHR, textStatus, errorThrown) {
					toast("Ocurrió un error enviando el reporte.");
				},
			});
		},
		getRatings: function($ratings, id, model, tipo) {
			$.ajax({
				url: ta.BASE_URL+"api/v1/calificar/",
				type: "get",
				data: {id: id, model: model, tipo: tipo},
				success: function(data, textStatus, jqXHR) {
					if (textStatus === "success") {
						html = '';
						$.each(data, function (i, val) {
							html += '<li>';
							html += '<img src="' + ta.faces_images[val.tipo] + '" alt="Aprueba">';
							html += val.comentario;
							html += "</li>";
						});
						$ratings
							.html(html)
							.listview("refresh")
							.trigger("updatelayout");
					}
				},
				error: function(jqXHR, textStatus, errorThrown) {
					// toast("Ocurrió un error enviando el reporte.");
				},
			});
		}
	},

	init: function() {
		this.map.init();
		this.geoLocation.findLocation();
	}
};

// Mapa page
	$(document).on('pageinit', '#mapa', function(event){
		window.ta.init();

		// when the map finishes loading
		google.maps.event.addListenerOnce(ta.map.map, 'idle', function() {
			// load the stops nearby to the center of the map
			ta.map.loadVisibleStops();

			// add the custom controls
			ta.map.map.controls[google.maps.ControlPosition.TOP_LEFT].push($('a.control.location').get(0));
			$('a.control.location').addClass('visible').click(function(){ta.geoLocation.findLocation();});
		});

		// every time the map is moved/dragged or the zoom changed
		google.maps.event.addListener(ta.map.map, 'bounds_changed', function() {
			if (ta.map.ajaxTimeout) {
				window.clearTimeout(ta.map.ajaxTimeout);
			}
			ta.map.ajaxTimeout = window.setTimeout(function() {
				// uncheck and disable some stop types in order to avoid showing too many markers
				if (ta.map.map.getZoom() <= 13){
					$('#ver-alimentadoras').prop("disabled", true).checkboxradio( "refresh" );
					$('#ver-pretroncales').prop("disabled", true).checkboxradio( "refresh" );
				}
				else if (ta.map.map.getZoom() == 14){
					$('#ver-alimentadoras').prop("disabled", true).checkboxradio( "refresh" );
					$('#ver-pretroncales').prop("disabled", false).checkboxradio( "refresh" );
				}
				else {
					$('#ver-alimentadoras').prop("disabled", false).checkboxradio( "refresh" );
					$('#ver-pretroncales').prop("disabled", false).checkboxradio( "refresh" );
				}

				ta.map.loadVisibleStops();
			}, 250);
		});

		// every time the map options are changed, refresh the markers
		$("#map-options input[type='checkbox']").bind( "change", function(event, ui) {
			ta.map.loadVisibleStops();
		});
	});

// Buscar page
	$(document).on("pageinit", "#buscar", function(event) {
		$("#autocomplete").on("listviewbeforefilter", function (e, data) {
			var $ul = $(this),
				$input = $(data.input),
				value = $input.val(),
				html = "";
			$ul.html("");
			if (value && value.length >= 2) {
				// $ul.html("<li><div class='ui-loader'><span class='ui-icon ui-icon-loading'></span></div></li>");
				$ul.listview("refresh");
				$.ajax({
					url: ta.BASE_URL+"api/v1/buscar/",
					dataType: "json",
					crossDomain: true,
					data: {
						q: $input.val()
					},
					beforeSend: function(jqXHR, settings) {
						$.mobile.loading('show');
					},
					complete: function(jqXHR, settings) {
						$.mobile.loading('hide');
					},
					error: function(jqXHR, textStatus, errorThrown) {
						toast("Error cargando los resultados de búsqueda.");
					},
					success: function(data, textStatus, jqXHR) {
						$.each(data, function (i, val) {
							html += '<li data-tipo="' + val.tipo + '">';
							if (val.tipo == 'p') { //paradas
								html += '<a href="parada.html" data-id="' + val.id + '" data-position="' + val.extra2 + '">';
								html += '<span class="stop icon tipo_' + val.extra + '"></span>';
								html += val.nombre;
							} else { //ruta
								html += '<a href="ruta.html" data-id="' + val.id + '" data-nombre="' + val.nombre + '" data-descripcion="' + val.extra + '" data-orientacion="' + val.extra2 + '"  data-linevariant="' + val.linevariant + '" class="routes">';
								tipo_ruta = val.nombre.substring(0, 1);
								html += '<span class="' + tipo_ruta + '">' + val.nombre + '</span> ' + val.extra + ' (' + ta.orientaciones[val.extra2] + ')';
							}
							html += '</a>';
							html += "</li>";
						});
						$ul.html(html);
						$ul.listview("refresh");
						$ul.trigger("updatelayout");
					}
				});
			}
		});
		$('#autocomplete').on('click', 'a', function(event) {
			tipo = jQuery(this).closest("li").data('tipo');
			switch(tipo) {
				case 'r': //ruta
					ta.search.ruta = {
										id: jQuery(this).data('id'),
										nombre: jQuery(this).data('nombre'),
										descripcion: jQuery(this).data('descripcion'),
										orientacion: jQuery(this).data('orientacion'),
										linevariant: jQuery(this).data('linevariant')
									};
					break;
				case 'p': //parada
					coords = jQuery(this).data('position').split(';');
					position = new google.maps.LatLng(parseFloat(coords[0]), parseFloat(coords[1]));
					ta.search.parada = {
										id: jQuery(this).data('id'),
										nombre: jQuery(this).text(),
										position: position
									};
					//TODO: ADD ICON URL
					break;
			}
		});
	});

// Parada page
	$(document).on("pageinit", "#parada", function(event) {
		$('#parada')
			.on('click', '.add-fav', function () {
				ta.favs.toggleFav($(this), "paradasf");
			});

		// associate rate button to popup
		$('#reportar-parada').click(function(){
			$('#parada-popup').popup('open');
		});
		// reset form
		$('#parada-popup form').get(0).reset();
		// override submit
		$('#parada-popup form').submit(function(){
			ta.ratings.rate($(this));
			// return false;
		});
	});

	$(document).on("pageshow", "#parada", function(event) {
		parada = ta.search.parada;
		if (parada) {
			// change the page title
			$("#parada").find('h1').html(parada.nombre);

			// set the static map
			if (parada.position) {
				$staticmap = $("#parada").find('.staticmap');
				url = "http://maps.googleapis.com/maps/api/staticmap?";
				url += "center=" + parada.position.lat() + "," + parada.position.lng();
				url += "&markers=icon:" + ta.BASE_URL + "static/" + parada.icon + "%7C" + parada.position.lat() + "," + parada.position.lng();
				url += "&size=" + $staticmap.width() + "x" + Math.round($staticmap.width()/3);
				url += "&zoom=15&maptype=roadmap&sensor=false";
				$staticmap.html("<img src='"+url+"'/>");
			}

			// load and display the routes
			$.ajax({
				url: ta.BASE_URL+"api/v1/rutas-por-parada/",
				type: "get",
				data: {parada_id: parada.id},
				dataType: "JSON",
				success: function(data, textStatus, jqXHR) {
					if (textStatus === "success") {
						// var html_list = {};
						// // construct the html for each routes list, grouped by orientation
						// for (i = 0; i < data.length; ++i) {
						// 	val = data[i];
						// 	html_list[val.orientacion] = html_list[val.orientacion] || '';
						// 	tipo = val.nombre_ruta.substring(0, 1);
						// 	html_list[val.orientacion] += '<a href="ruta.html" data-id="'+val.id_ruta+'" data-nombre="'+val.nombre_ruta+'" data-orientacion="'+val.orientacion+'" data-linevariant="'+val.linevariant+'" data-role="button" data-mini="true" class="'+tipo+'">'+val.nombre_ruta+'</a>';
						// }
						// var html = '';
						// // add opening and closing tags for the lists
						// for (var k in html_list) {
						// 	html += '<h3>Sentido '+ta.orientaciones[k]+'</h3><div data-role="controlgroup" data-type="horizontal">' + html_list[k] + '</div>';
						// }
						html_list = '';
						for (i = 0; i < data.length; ++i) {
							val = data[i];
							tipo = val.nombre_ruta.substring(0, 1);
							html_list += '<a href="ruta.html" data-id="'+val.id_ruta+'" data-nombre="'+val.nombre_ruta+'" data-orientacion="'+val.orientacion+'" data-linevariant="'+val.linevariant+'" data-role="button" data-mini="true" class="'+tipo+'">'+val.nombre_ruta+'</a>';
							html = '<div data-role="controlgroup" data-type="horizontal">' + html_list + '</div>';
						}
						$("#parada").find('.routes').html(html).trigger('create');
					}
				}
			});

			// is favorite?
			if (localStorage["paradasf"]) {
				paradasf = localStorage["paradasf"].split(',');
				if ($.inArray(parada.id.toString(), paradasf) != -1) {
					$('#parada .add-fav').addClass('yellow');
				} else {
					$('#parada .add-fav').removeClass('yellow');
				}
			}

			// fill rate popup
			ta.ratings.getRatings($("#parada-popup .ratings"), parada.id, 'miostops');
			$("#parada-popup").find('input[name=object_id]').val(parada.id);
		}
		else {
			jQuery.mobile.changePage("#buscar");
		}
	});

// Ruta page
	$(document).on("pageinit", "#ruta", function(event) {
		$('#ruta')
			.on('expand', '.ui-collapsible', function () {
				$(this).find('h3 .ui-btn-text').text('Ocultar Paradas');
			})
			.on('collapse', '.ui-collapsible', function () {
				$(this).find('h3 .ui-btn-text').text('Ver Paradas');
			})
			.on('click', '.add-fav', function () {
				ta.favs.toggleFav($(this), "rutasf");
			});

		// associate rate button to popup
		$('#reportar-ruta').click(function(){
			$('#ruta-popup').popup('open');
		});
		// reset form
		$('#ruta-popup form').get(0).reset();
		// override submit
		$('#ruta-popup form').submit(function(){
			ta.ratings.rate($(this));
			// return false;
		});


	});

	$(document).on("pageshow", "#ruta", function(event) {
		ruta = ta.search.ruta;
		if (ruta) {
			tipo = ruta.nombre.substring(0,1);
			$("#ruta")
				.find('h1').html(ruta.nombre).end()
				.find('.type').html("Tipo: " + ta.buses_names[tipo] + "<img src='"+ta.buses_icons[tipo]+"' />").end()
				.find('.description').html(ruta.descripcion).end();
				// .find('.orientation').html("Sentido: " + ta.orientaciones[ruta.orientacion]);

			// load and display the stops
			$.ajax({
				url: ta.BASE_URL+"api/v1/paradas-por-ruta/",
				type: "get",
				data: {ruta_id: ruta.id, orientacion: ruta.orientacion, linevariant: ruta.linevariant},
				dataType: "JSON",
				success: function(data, textStatus, jqXHR) {
					if (textStatus === "success") {
						// console.log(data);
						var html = '<ul data-role="listview">';
						// construct the html list for stops
						for (i = 0; i < data.length; ++i) {
							parada = data[i];
							html += '<li><a href="parada.html" data-id="' + parada.id + '" data-lat="' + parada.lat + '" data-lng="' + parada.lng + '">';
							html += '<span class="stop icon tipo_' + parada.extra + '"></span>';
							html += parada.nombre;
							html += '</a></li>';
						}
						html += '</ul>';
						$("#ruta .stops")
							.html(html).trigger('create')
							.on('click', 'a', function(){
								position = new google.maps.LatLng(
												parseFloat(jQuery(this).data('lat')),
												parseFloat(jQuery(this).data('lng'))
								);
								ta.search.parada = {
									id: jQuery(this).data('id'),
									nombre: jQuery(this).text(),
									position: position//,
									// icon: marker.getIcon().url
								};
							});
						// todo: set parada ID and ICON
					}
				}
			});

			// is favorite?
			if (localStorage["rutasf"]) {
				rutasf = localStorage["rutasf"].split(',');
				if ($.inArray(ruta.id.toString(), rutasf) != -1) {
					$('#ruta .add-fav').addClass('yellow');
				} else {
					$('#ruta .add-fav').removeClass('yellow');
				}
			}

			// fill rate popup
			ta.ratings.getRatings($("#ruta-popup .ratings"), ruta.id, 'lines');
			$("#ruta-popup").find('input[name=object_id]').val(ruta.id);
		}
		else {
			jQuery.mobile.changePage("#buscar");
		}
	});

// Favoritos page
	$(document).on("pageshow", "#favoritos", function(event) {
		// $ul = $('#paradas-favoritas');
		// paradasf = localStorage["paradasf"].split(',');

		// $.each(paradasf, function (i, val) {
		// 	html += '<li data-tipo="' + val.tipo + '">';
		// 	if (val.tipo == 'p') { //paradas
		// 		html += '<a href="parada.html" data-id="' + val.id + '" data-position="' + val.extra2 + '">';
		// 		html += '<span class="stop icon tipo_' + val.extra + '"></span>';
		// 		html += val.nombre;
		// 	} else { //ruta
		// 		html += '<a href="ruta.html" data-id="' + val.id + '" data-nombre="' + val.nombre + '" data-descripcion="' + val.extra + '" data-orientacion="' + val.extra2 + '" class="routes">';
		// 		tipo_ruta = val.nombre.substring(0, 1);
		// 		html += '<span class="' + tipo_ruta + '">' + val.nombre + '</span> ' + val.extra + ' (' + ta.orientaciones[val.extra2] + ')';
		// 	}
		// 	html += '</a>';
		// 	html += "</li>";
		// });
		// $ul.html(html);
		// $ul.listview("refresh");
		// $ul.trigger("updatelayout");

		$('#paradas-favoritas').html(localStorage['paradasf']);
		$('#rutas-favoritas').html(localStorage['rutasf']);
	});

// All pages
	$(window).on('orientationchange resize pageshow', function(event) {
		if ($.mobile.activePage) {
			// fix the content height
			fixgeometry();

			switch($.mobile.activePage.attr('id')) {
				case 'mapa':
					// resize the map to fit the content, minus the search form
					$('.map-canvas').height($(".ui-content:visible").height()-$(".planear-viaje").height());
					google.maps.event.trigger(ta.map.map, "resize");
					break;
				case 'noticias':
					$content = $("#noticias .ui-content");
					height = $content.height();
					width = $content.width();

					showTwitter('twitter-metrocali', {width: width, height: height, element: $content});

					break;
			}
		}
	});
