(function($, once) {
  "use strict";

  Drupal.behaviors.CohesionGoogleMap = {
    attach: function(context, settings) {
        var elements = $('.js-coh-map-container', context).filter(':visible');

        $.each($(once('coh-js-googlemap-init', elements)), function(i, e) {

        var $this = $(this);

        var settings = $(this).data().settings;
        var styles = $(this).data().styles;

        $('.js-coh-map-marker', $this).each(function() {
          var pin_data = $(this).data();
          var setting = {
            'latlong': pin_data.mapMarkerLatlong,
            'marker_image': pin_data.mapMarkerImage,
            'link': pin_data.mapMarkerLink,
            'label': pin_data.mapMarkerLabel,
            'wysiwyg_info_window': pin_data.mapMarkerInfo,
            'marker_scaled_x': pin_data.mapMarkerScaledX,
            'marker_scaled_y': pin_data.mapMarkerScaledY,
            'info_window_class': pin_data.infoWindowClass
          };

          // Split the lat and lng ready for google
          if (typeof setting.latlong === 'string' && setting.latlong.indexOf(',') !== -1) {
            setting.lat = setting.latlong.split(',')[0];
            setting.lng = setting.latlong.split(',')[1];
          } else {
            setting.lat = setting.lng = ''
          }

          settings.pins.push(setting);
        });

        if ((typeof settings.pins !== 'undefined' && settings.pins.length > 0) || (typeof settings.latlong !== 'undefined' && settings.latlong !== '')) {

          // Set map options
          var map = new google.maps.Map(e, getMapOptions(settings, styles));

          // Set map bounds
          var bounds = new google.maps.LatLngBounds();

          // Set Info markers and info windows
          var infowindow = new google.maps.InfoWindow({
            maxWidth: $('.js-coh-map-container:visible', context).width() - 60
          });

          for (var i = 0; i < settings.pins.length; i++) {
            /**
                             * Set markers
                             */
            var marker = new google.maps.Marker(getMarkerOptions(map, settings.pins[i], settings, settings.marker_animation, settings.pins.length - i));

            bounds.extend(marker.position);
            /**
                             * Set info windows
                             */

            if (settings.pins[i].wysiwyg_info_window && settings.pins[i].info_window_class) {
              settings.pins[i].wysiwyg_info_window  = '<div class="' + settings.pins[i].info_window_class + '">' + settings.pins[i].wysiwyg_info_window + '</div>';
            }

            google.maps.event.addListener(marker, 'click', (function(marker, i) {
              return function() {
                if (typeof settings.pins[i].link !== "undefined" && settings.pins[i].link !== '') {
                  window.open(settings.pins[i].link, unescape(settings.pins[i].open_in));
                } else if (typeof settings.pins[i].wysiwyg_info_window !== "undefined" && settings.pins[i].wysiwyg_info_window !== '') {
                  // Ensure the infowindow fits inside the map bounds. -60 gives room for the padding and close button on the info window.
                  infowindow.maxWidth = $('.js-coh-map-container:visible', context).width() - 60;
                  infowindow.setContent(settings.pins[i].wysiwyg_info_window);
                  infowindow.open(map, marker);
                }
              }
            })(marker, i));
          }

          // For multiple pins zoom to pin bounds, or configured zoom if bound zoom is greater
          if (settings.pins.length > 1) {
            map.fitBounds(bounds);
            var baseZoom = parseInt(settings.zoom);
            var listener = google.maps.event.addListener(map, "idle", function() {
              if (map.getZoom() > baseZoom) map.setZoom(baseZoom);
              google.maps.event.removeListener(listener);
            });
          }

          // On resize, keep map centered on pin/s
          var currentCenter = map.getCenter();
          var resizeTimer;
          window.onresize = function() {
            clearTimeout(resizeTimer);
            resizeTimer = setTimeout(function () {
              google.maps.event.trigger(map, 'resize');
              if (settings.pins.length === 1) {
                map.setCenter(currentCenter);
              }
            }, 100);
          };
        }
      });
    }
  };

  /**
     * @summary Get map type compared to Chameleon Drupal values
     * @param {type} settings
     * @returns {google.maps.MapTypeId}
     */
  function getMapType(settings) {

    switch(settings.type) {

      case 'default':

        return google.maps.MapTypeId.ROADMAP;
        break;

      case 'satellite':

        return google.maps.MapTypeId.SATELLITE;
        break;

      case 'hybrid':

        return google.maps.MapTypeId.HYBRID;
        break;

      case 'terrain':

        return google.maps.MapTypeId.TERRAIN;
        break;

      default:

        return google.maps.MapTypeId.ROADMAP;
        break;
    }
  }

  /**
     * @summary Get the map options
     * @param {type} settings
     * @returns {$return}
     */
  function getMapOptions(settings, styles) {
    var $return = {};

    $return = {
      zoom: parseInt(settings.zoom),
      mapTypeId: getMapType(settings),
      scrollwheel: getBoolean(settings.scrollwheel),
      mapTypeControl: getBoolean(settings.maptypecontrol),
      draggable: getBoolean(settings.draggable),
      zoomControl: getBoolean(settings.zoomcontrol),
      scaleControl: getBoolean(settings.scalecontrol)
    };

    // Set the center (container as priority)
    if (typeof settings.latlong !== 'undefined' && settings.latlong !== '')  {

      $return.center = new google.maps.LatLng(
        settings.latlong.split(',')[0],
        settings.latlong.split(',')[1]
      );

    } else {

      $return.center = new google.maps.LatLng(
        settings.pins[0].lat,
        settings.pins[0].lng
      )
    }

    if (typeof styles !== "undefined") {
      $return.styles = styles;
    }

    return $return;
  }

  /**
     * @summary Get the marker options
     * @param {type} map
     * @param {type} settings
     * @param {type} defaultPin
     * @returns {$return}
     */
  function getMarkerOptions(map, settings, defaultSettings, marker_animation, zIndex) {

    var $return = {};

    $return = {
      position: new google.maps.LatLng(
        settings.lat,
        settings.lng
      ),
      optimized: false,
      zIndex: zIndex,
      map: map
    };

    if (typeof settings.label !== "undefined") {
      $return.label = settings.label;
    }

    if (typeof settings.marker_image !== "undefined") {
      var image = {
        url: settings.marker_image
      };

      if (typeof settings.marker_scaled_x !== "undefined" && typeof settings.marker_scaled_y !== "undefined") {
        image.scaledSize = new google.maps.Size(settings.marker_scaled_x, settings.marker_scaled_y);
      }
      $return.icon = image;

    } else if (typeof defaultSettings.marker_image !== "undefined") {
      var image = {
        url: defaultSettings.marker_image

      };

      if (typeof defaultSettings.marker_scaled_x !== "undefined" && typeof defaultSettings.marker_scaled_y !== "undefined") {
        image.scaledSize = new google.maps.Size(defaultSettings.marker_scaled_x, defaultSettings.marker_scaled_y);
      }
      $return.icon = image;
    }

    if (typeof marker_animation !== "undefined") {
      if (marker_animation === 'drop') {
        $return.animation = google.maps.Animation.DROP;
      } else if (marker_animation === 'bounce') {
        $return.animation = google.maps.Animation.BOUNCE;
      }
    }

    return $return;
  }

  /**
     * @summary parse string to html
     * @param {type} input
     * @returns html object
     */
  function htmlDecode(input) {
    var e = document.createElement('div');
    e.innerHTML = input;
    return e.childNodes.length === 0 ? "" : e.childNodes[0].nodeValue;
  }

  /**
     * @summary parse string to bool
     * @param {string} string
     * @returns {bool} true || false
     */
  function getBoolean(string) {
    try {
      JSON.parse(string);
    } catch (e) {
      return false;
    }
  }

})(jQuery, once);
;
/**
 * @file
 * Responsive text
 */

(function ($, Drupal) {
  "use strict";
  Drupal.behaviors.responsiveText = {
    attach: function (context, settings) {
      $('.responsive-text-wrapper').once().each(function () {
        const componentItem = $(this).get(0);
        const textResponsiveItems = componentItem.querySelectorAll('.responsive-text-item');
        if (textResponsiveItems && textResponsiveItems.length > 1) {
          for (let index = 0; index < textResponsiveItems.length; index++) {
            if (index + 1 === textResponsiveItems.length) {
              break;
            }
            textResponsiveItems[index + 1].classList.forEach(classItem => {
              if (classItem.includes('responsive-text-') && classItem !== 'responsive-text-item') {
                textResponsiveItems[index].classList.add('hide-on-' + classItem.split('-').pop());
              }
            });
          }
        }
      });
    }
  };
})(jQuery, Drupal);;
/**
 * @file
 * Responsive text
 */

(function ($, Drupal) {
  "use strict";
  Drupal.behaviors.tempoDeEspera = {
    attach: function (context, settings) {
      $('.tempoDeEsperaWrapper').once().each(function () {
        const tempoEsperaWrapper = $(this).get(0);
        if (tempoEsperaWrapper) {
          const tempoEsperaItems = tempoEsperaWrapper.querySelector('.tempoEsperaItems')
          const tempoEsperaItemSkel = tempoEsperaWrapper.querySelector('.tempoEsperaItem')
          fetch(tempoEsperaWrapper.dataset.apiUrl)
            .then(response => response.json())
            .then(resp => {
              tempoEsperaItems.innerHTML = ''
              resp.forEach(item => {
                const tempoEsperaItem = tempoEsperaItemSkel.cloneNode(true)
                let { clinica, qt_espera } = item
                qt_espera = qt_espera.split(':')
                let qt_esperaMinTotal = (parseInt(qt_espera[0]) * 60) + parseInt(qt_espera[1])

                if (clinica === 'Ginecológica/Obstétrica') clinica = 'Ginecologia e obstetrícia'
                else if (clinica === 'Médica') clinica = 'Clínica Médica'
                else if (clinica === 'Ortopedia') clinica = 'Ortopedia'
                else if (clinica === 'Pediátrica') clinica = 'Pediatria'

                tempoEsperaItem.classList.remove('hide')
                tempoEsperaItem.querySelector('strong').innerHTML = qt_esperaMinTotal
                tempoEsperaItem.querySelector('span').innerHTML = 'min'
                tempoEsperaItem.querySelector('p').innerHTML = clinica
                tempoEsperaItems.appendChild(tempoEsperaItem)

                window.dispatchEvent(new Event('tempoEsperaApiDone'))
              })
            })
        }
      });
    }
  };
})(jQuery, Drupal);
;
/**
 * @file
 * Header Americas
 */
let headerAmericasAHasBeenAttached = false; // Variável de controle

(function ($, Drupal) {
  "use strict";
  Drupal.behaviors.headerAmericas = {
    attach: function (context, settings) {
      if (headerAmericasAHasBeenAttached) return;
      const americasHeaderWrapper = document.querySelector('.americasHeaderWrapper');
      window.addEventListener('scroll', function () {
        const headerHeight = americasHeaderWrapper.offsetHeight;
        if (window.scrollY > headerHeight) {
          americasHeaderWrapper.classList.add('header-on-scroll');
        } else {
          americasHeaderWrapper.classList.remove('header-on-scroll');
        }
      })

      Drupal.behaviors.headerAmericas.handleFocusableChildsTabIndex($('.americasHeaderExtraMenu').get(0), 'hide');
      $('.extraMenuOpener').click(() => {
        Drupal.behaviors.headerAmericas.handleFocusableChildsTabIndex($('.americasHeaderExtraMenu').get(0), 'show');
        setTimeout(() => $('.extraMenuCloser').focus(), 300)
      });
      $('.extraMenuCloser').click(() => {
        Drupal.behaviors.headerAmericas.handleFocusableChildsTabIndex($('.americasHeaderExtraMenu').get(0), 'hide');
        setTimeout(() => $('.extraMenuOpener').focus(), 300)
      });
      $('.americasHeaderOverlay').click(function () {
        document.querySelector('.extraMenuOpenerMobile').click()
      });
      $('.americasHeaderWrapper .has-children > a').off();
      $('.americasHeaderWrapper .has-children > a').on('click', function (event) {
        event.preventDefault();
      });
      $('.americasHeaderMiddle .has-children > a').on('keydown', function (event) {
        if (event.key === 'Enter') {
          event.preventDefault();
          $(event.target.parentNode).toggleClass('hovered');
        }
      });
      $('.americasHeaderMiddle .menuContainerLevelOne > li > a, .extraMenuOpener').on('focus', function (event) {
        if (event.target.classList.contains('extraMenuOpener')) $('.americasHeaderMiddle li.has-children').removeClass('hovered');

        if (event.target.classList.contains('menuLink')) {
          $('.americasHeaderMiddle li.has-children.hovered').each(function () {
            if ($(this) !== $(event.target.parentNode)) $(this).removeClass('hovered')
          })
        }
      });

      const lastClickedTexts = [];
      let currentDivOpened = null;
      let actualStep = 1;
      let mobileMenu = false;
      function updateMenuNavigation(step) {
        const backStepsWrapper = document.querySelectorAll('.backStepWrapper');
        backStepsWrapper.forEach(element => {
          const stepName = element.querySelector('.stepName');
          if (step > 1) {
            element.classList.remove('hided');
            stepName.innerText = lastClickedTexts[actualStep - 2]
          } else {
            element.classList.add('hided');
            stepName.innerText = '';
          }
        });

        if (!mobileMenu && currentDivOpened) Drupal.behaviors.headerAmericas.removeAllFocusFromUnactiveMenu(document.querySelector('.americasHeaderExtraMenu'), currentDivOpened);
      }

      function handleNavigation(trigger) {
        // Botões de voltar dos menus.
        if (trigger.classList.contains('backStepButton')) {
          actualStep--;

          // Se for o primeiro nível do menu mobile esconder o wrapper geral e não apenas a listagem (evitar de deixar o wrapper vazio)
          if (mobileMenu && currentDivOpened.classList.contains('menuContainerLevelOne')) {
            currentDivOpened = currentDivOpened.closest('.menuMobileContentWrapper')
          }
          handleMenuVisibility(currentDivOpened, 'hide');

          if (currentDivOpened.classList.contains('menuMobileContentWrapper')) {
            currentDivOpened = null;
          }
          else {
            if (!currentDivOpened.classList.contains('menuContainerLevelOne')) currentDivOpened = currentDivOpened.parentNode.closest('.coh-menu-list-container');
          }

          updateMenuNavigation(actualStep);
          return;
        }

        // São os botões iniciais do menu mobile (Veja Mais, Outros, Tempo de espera)
        if (trigger.classList.contains('mainStepButton')) {
          currentDivOpened = document.querySelector(`.${trigger.dataset.target}`)
          mobileMenu = true;
        }

        // Links normais que possuem submenus
        if (trigger.classList.contains('menuLink')) {
          currentDivOpened = trigger.parentNode.querySelector('.coh-menu-list-container');
        }

        actualStep++;
        handleMenuVisibility(currentDivOpened, 'show');
        lastClickedTexts[actualStep - 2] = trigger.innerText;
        updateMenuNavigation(actualStep);
      }

      updateMenuNavigation(actualStep);

      function handleMenuVisibility(node, action) {
        if (action === 'show') {
          node.classList.add('show');
          setTimeout(() => {
            node.classList.add('menuOpened');
          }, 1);
        }

        if (action === 'hide') {
          const nodeStore = node;
          node.classList.remove('menuOpened');
          setTimeout(() => {
            nodeStore.classList.remove('show');
          }, 200);
        }
      }

      $('.americasHeaderExtraMenu .has-children > a, .americasMobileHidedMenu .has-children > a, .mainStepButton, .backStepButton').once().each(function () {
        const item = $(this).get(0);
        item.addEventListener('click', event => {
          event.preventDefault();
          handleNavigation(event.target);
        });
      });

      headerAmericasAHasBeenAttached = true;
    },
    removeAllFocusFromUnactiveMenu: function (wrapper, menu) {
      const allMenus = wrapper.querySelectorAll('.menuContainerAmericas');

      allMenus.forEach(element => {
        const elementosFocaveis = element.querySelectorAll('input, select, textarea, a, button, [tabindex]');
        if (element === menu) {
          elementosFocaveis.forEach(focusable => focusable.tabIndex = '0')
        } else {
          elementosFocaveis.forEach(focusable => focusable.tabIndex = '-1')
        }
      });
    },
    handleFocusableChildsTabIndex: function (wrapper, action = 'hide') {
      if (!wrapper) return;
      const elementosFocaveis = wrapper.querySelectorAll('input, select, textarea, a, button, [tabindex]');

      elementosFocaveis.forEach(element => {
        if (action === 'hide') {
          element.tabIndex = '-1'
        } else {
          element.tabIndex = '0'
        }
      });

    }
  };
})(jQuery, Drupal);
;
