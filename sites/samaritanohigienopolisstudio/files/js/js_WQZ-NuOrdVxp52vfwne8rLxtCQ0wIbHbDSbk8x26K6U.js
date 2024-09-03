/**
 * @file
 * Galeria de Fotos Américas.
*/

(function ($, Drupal) {
  "use strict";
  Drupal.behaviors.americasGaleria = {
    attach: function (context, settings) {
      $('.americasGaleriaWrapper').once().each(function () {
        const componentItem = $(this);

        const galeriaSliderWrapper = componentItem.get(0).querySelector('.galeriaSliderWrapper');
        new Swiper(galeriaSliderWrapper, {
          slidesPerView: 2.15,
          slidesPerGroup: 1,
          spaceBetween: 20,
          autoplay: false,
          loop: false,
          speed: 500,
          navigation: {
            prevEl: galeriaSliderWrapper.querySelector('.slider-custom-prev'),
            nextEl: galeriaSliderWrapper.querySelector('.slider-custom-next')
          },
          breakpoints: {
            1024: {
              slidesPerView: 4,
            },
            768: {
              slidesPerView: 2.5,
            }
          },
        });

        let classSelector = 'img.mobile-image';
        if (!Drupal.behaviors.americasGaleria.isMobileDevice()) classSelector = 'img.desktop-image';

        componentItem.slickLightbox({
          src: 'src',
          itemSelector: classSelector,
          caption: 'caption',
          slick: {
            infinite: false,
            autoplay: false,
            autoplaySpeed: 1500000,
            prevArrow: "<button type='button' class='slick-prev coh-style-americas-slider-navigation slick-arrow americasLightboxBtn'></button>",
            nextArrow: "<button type='button' class='slick-next coh-style-americas-slider-navigation slick-arrow americasLightboxBtn'></button>"
          },
          layouts: { closeButton: '<button type="button" class="slick-lightbox-close"></button>' },
        });

        $('.slick-lightbox .slick-slider').on('afterChange', function (event, slick, currentSlide) {
          const _last = slick.slideCount - slick.options.slidesToShow

          if (_last === currentSlide) {
            _slickItem.slick('slickPause')
            setTimeout(() => {
              _slickItem.slick('slickGoTo', 0, false)
              _slickItem.slick('slickPlay')
              setTimeout(() => {
                _slickItem.slick('refresh')
              }, _slickItem.slick('slickGetOption', 'speed'));
            }, 7000);
          }
        });

        componentItem.find('.swiper-slide img').keyup(function (event) {
          if (event.key === 'Enter') {
            $(this).click();
          }
        });
      });
    },
    isMobileDevice() {
      const userAgent = navigator.userAgent;
      const viewportWidth = window.innerWidth || document.documentElement.clientWidth || document.body.clientWidth;
      const mobileKeywords = ['Android', 'webOS', 'iPhone', 'iPad', 'iPod', 'BlackBerry', 'Windows Phone'];
      const isMobileAgent = mobileKeywords.some(keyword => userAgent.indexOf(keyword) > -1);
      const isMobileWidth = viewportWidth < 1024;
      return isMobileAgent || isMobileWidth;
    }
  }
})(jQuery, Drupal);
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
