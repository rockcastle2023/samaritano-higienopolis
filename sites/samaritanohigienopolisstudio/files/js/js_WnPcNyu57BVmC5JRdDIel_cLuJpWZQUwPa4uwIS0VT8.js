/**
 * @file
 * Carousel Informativos API - Américas
*/

(function ($, Drupal) {
  "use strict";
  Drupal.behaviors.carouselInformativosApi = {
    itemSkeleton: null,
    instances: [],
    attach: function (context, settings) {
      $('.carouselInformativosApi').once().each(async function () {
        const componentItem = $(this).get(0);
        if (componentItem) {
          let siteUrl = new URL(componentItem.dataset.site).origin
          if (componentItem.dataset.customSource && componentItem.dataset.customSource.length > 0) {
            siteUrl = new URL(componentItem.dataset.customSource).origin
          }
          if ((componentItem.dataset.styleguideSource && componentItem.dataset.styleguideSource.length > 0) && componentItem.dataset.force !== 'force') {
            siteUrl = new URL(componentItem.dataset.styleguideSource).origin
            const button = componentItem.querySelector('.buttonCentral')
            if(button) button.href = siteUrl + '/central-de-conteudo/informativos'
          }
          if (!Drupal.behaviors.carouselInformativosApi.itemSkeleton) {
            Drupal.behaviors.carouselInformativosApi.itemSkeleton = componentItem.querySelector('.itemDeInformativo').cloneNode(true);
            componentItem.querySelector('.itemDeInformativo').remove();
          }
          await Drupal.behaviors.carouselInformativosApi.getData(componentItem, siteUrl, Drupal.behaviors.carouselInformativosApi.buildQueryString(componentItem));
        }
      });
    },
    getData: async function (componentItem, url, params = '') {
      try {
        let data = await fetch(`${url}/jsonapi/node/informativos?sort=-created&include=field_tags,field_banner_mobile_informativo.field_asset&fields[file--file]=uri,url${params.length > 0 ? '&' + params : ''}`);
        data = await data.json();
        for (let index = 0; index < data['data'].length; index++) {
          const element = data['data'][index];
          element['thumbSrcFixed'] = null;

          const fieldThumbId = element['relationships']['field_banner_mobile_informativo']['data']?.['id'];
          if (!fieldThumbId) continue;

          const fieldThumb = data['included'].find(item => item.id === fieldThumbId)?.['relationships']['field_asset']['data']?.['id'];
          if (!fieldThumb) continue;

          element['thumbSrcFixed'] = data['included'].find(item => item.id === fieldThumb)?.['attributes']['uri']['url'];

          element['taxonomys'] = data.included.filter(item => {
            return element['relationships']['field_tags'].data.map(itemX => itemX.id).includes(item.id)
          }).map(item => item['attributes']['name']).sort()
        }
        Drupal.behaviors.carouselInformativosApi.buildStructure(componentItem, data, url);
      } catch (error) {
        console.log(error)
      }
    },
    buildStructure: function (componentItem, data, url) {
      const consultaInnerContent = componentItem.querySelector('.consultaInnerContent');
      if (!data || data['data'].length === 0) return false;
      componentItem.classList.remove('hide');
      const taxonomys = Drupal.behaviors.carouselInformativosApi.getTaxonomys(componentItem);
      consultaInnerContent.innerHTML = '';
      for (let index = 0; index < data['data'].length; index++) {
        const item = data['data'][index];
        const itemConsulta = Drupal.behaviors.carouselInformativosApi.itemSkeleton.cloneNode(true);

        if ((taxonomys && taxonomys.length > 0) && !item['taxonomys']) continue;

        const link = itemConsulta.querySelector('a');
        link.href = url + item['attributes']['path']['alias'];
        link.title = `Veja o informativo ${item['attributes']['title']}`;

        const img = itemConsulta.querySelector('img');
        img.src = url + item['thumbSrcFixed']
        img.alt = `Thumbnail do informativo ${item['attributes']['title']}`;
        img.title = `Thumbnail do informativo ${item['attributes']['title']}`;

        const tagString = itemConsulta.querySelector('.tagString');
        if(item['taxonomys'] && item['taxonomys'].length > 0) {
          tagString.innerHTML = taxonomys.length > 0 ? item['taxonomys'].filter(taxonomyItem => taxonomys.includes(taxonomyItem)).join(', ') : item['taxonomys'].join(', ');
        }

        const dateString = itemConsulta.querySelector('.dateString');
        dateString.innerHTML = Drupal.behaviors.carouselInformativosApi.getDateString(item['attributes']['created']);

        const cardTitle = itemConsulta.querySelector('.cardTitle');
        cardTitle.innerHTML = item['attributes']['title'];

        consultaInnerContent.appendChild(itemConsulta);
      }

      const consultaContentWrapper = componentItem.querySelector('.consultaContentWrapper');
      new Swiper(consultaContentWrapper, {
        slidesPerView: 1.1,
        slidesPerGroup: 1,
        spaceBetween: 20,
        autoplay: false,
        loop: false,
        speed: 500,
        navigation: {
          prevEl: componentItem.querySelector('.slider-custom-prev'),
          nextEl: componentItem.querySelector('.slider-custom-next')
        },
        breakpoints: {
          1024: {
            slidesPerView: 3,
          },
          768: {
            slidesPerView: 2,
          }
        },
      });
    },
    buildQueryString: function (componentItem) {
      const dataset = componentItem.dataset;
      const arr = [];
      const taxonomys = Drupal.behaviors.carouselInformativosApi.getTaxonomys(componentItem);
      const titles = Drupal.behaviors.carouselInformativosApi.getTitles(componentItem);

      if (dataset['customItems']) {
        arr.push(`page[offset]=0`);
        arr.push(`page[limit]=${dataset['customItems']}`);
      }

      if (taxonomys.length > 0) {
        taxonomys.forEach(item => {
          arr.push(`filter[taxonomy][condition][path]=field_tags.name`)
          arr.push(`filter[taxonomy][condition][operator]=IN`)
          arr.push(`filter[taxonomy][condition][value][]=${item}`)
        })
      }

      if (titles && titles.length > 0) {
        titles.forEach((title, index) => {
          arr.push(`filter[titleFilter][condition][path]=title`)
          arr.push(`filter[titleFilter][condition][operator]=IN`)
          arr.push(`filter[titleFilter][condition][value][]=${title}`)
        });
      }

      return arr.length > 0 ? arr.join('&') : '';
    },
    getTaxonomys: function (componentItem) {
      const getInstance = Drupal.behaviors.carouselInformativosApi.instances.find(item => item.component === componentItem);
      if (getInstance && getInstance['taxsArray']) return getInstance['taxsArray'];

      if(componentItem.querySelectorAll('.taxsWrapper a div').length === 0) return [];

      const taxonomys = {
        component: componentItem,
        taxsArray: Array.from(componentItem.querySelectorAll('.taxsWrapper a div')).map(element => {
          return element.innerText;
        })
      }

      if(getInstance) {
        getInstance['taxsArray'] = taxonomys['taxsArray']
      } else {
        Drupal.behaviors.carouselInformativosApi.instances.push(taxonomys);
      }

      componentItem.querySelector('.taxsWrapper').remove();
      return taxonomys['taxsArray'];
    },
    getTitles: function (componentItem) {
      const getInstance = Drupal.behaviors.carouselInformativosApi.instances.find(item => item.component === componentItem);
      if (getInstance && getInstance['titlesArray']) return getInstance['titlesArray'];

      if(componentItem.querySelectorAll('.titlesFilterWrapper p').length === 0) return [];

      const titles = {
        component: componentItem,
        titlesArray: Array.from(componentItem.querySelectorAll('.titlesFilterWrapper p')).map(element => {
          return element.innerText;
        })
      }

      if(getInstance) {
        getInstance['titlesArray'] = titles['titlesArray']
      } else {
        Drupal.behaviors.carouselInformativosApi.instances.push(titles);
      }

      componentItem.querySelector('.titlesFilterWrapper').remove();
      return titles['titlesArray'];
    },
    getDateString: function (date) {
      const dateObj = new Date(date);
      return `${String(dateObj.getDate()).padStart(2, '0')}/${String(dateObj.getMonth() + 1).padStart(2, '0')}/${dateObj.getFullYear()}`
    },
  }
})(jQuery, Drupal);
;
/**
 * @file
 * Custom collapse
 */

(function ($, Drupal) {
  "use strict";
  Drupal.behaviors.customCollapse = {
    attach: function (context, settings) {
      $('.custom-collapse-wrapper').once().each(function () {
        const collapseItem = $(this).get(0);
        const collapseItemAnchors = collapseItem.querySelectorAll('.custom-accordion-item-anchor');
        let collapseItemActive;
        if (collapseItem && collapseItemAnchors && collapseItemAnchors.length > 0) {
          collapseItemAnchors.forEach(element => {
            element.addEventListener('click', e => {
              const wrapper = e.target.closest('.custom-collapse-wrapper');
              const parent = e.target.parentNode;
              const content = parent.querySelector('.custom-collapse-item-content');
              e.target.classList.toggle('active');
              if (!e.target.classList.contains('active')) {
                content.style.height = '0px';
                setTimeout(() => {
                  content.classList.remove('expanded');
                }, 201);
              } else {
                if (wrapper.dataset.onlyOneActive === 'true') {
                  wrapper.querySelectorAll('.custom-accordion-item-anchor.active').forEach(item => {
                    if (item !== element) {
                      item.parentNode.querySelector('.custom-collapse-item-content').style.height = '0px';
                      item.classList.remove('active');
                      setTimeout(() => {
                        item.parentNode.querySelector('.custom-collapse-item-content').classList.remove('expanded');
                      }, 201);
                    }
                  })
                }
                content.classList.add('expanded');
                content.style.height = 'auto';
                const contentHeight = content.offsetHeight;
                content.style.cssText = '0px';
                setTimeout(() => {
                  content.style.height = contentHeight + 'px';
                }, 1);
              }
            });
          });

          if (collapseItem.dataset.start === 'started') {
            collapseItemActive = collapseItemAnchors[parseInt(collapseItem.dataset.activeItem) - 1]
            if (!collapseItemActive) collapseItemActive = collapseItemAnchors[0]
            const collapseContent =  collapseItemActive.parentNode.querySelector('.custom-collapse-item-content');
            collapseContent.style.height = 'auto';
            collapseContent.style.height = collapseContent.offsetHeight + 'px';
            collapseContent.classList.add('expanded');
            collapseItemActive.classList.add('active');
          }
        }
      });
    },
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
