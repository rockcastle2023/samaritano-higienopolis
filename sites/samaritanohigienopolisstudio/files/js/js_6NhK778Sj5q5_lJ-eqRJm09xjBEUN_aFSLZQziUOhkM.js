/**
 * @file
 * Consulta de eventos - Américas
*/

(function ($, Drupal) {
  "use strict";
  Drupal.behaviors.consultaEventos = {
    itemSkeleton: null,
    notFoundMessage: null,
    swiperInstances: [],
    eventCategories: null,
    attach: function (context, settings) {
      $('.consultaEventos').once().each(async function () {
        const componentItem = $(this).get(0);
        if (componentItem) {
          let siteUrl = componentItem.dataset.site;
          if (componentItem.dataset.customSource && componentItem.dataset.customSource.length > 0) siteUrl = componentItem.dataset.customSource;
          if (!Drupal.behaviors.consultaEventos.itemSkeleton) {
            Drupal.behaviors.consultaEventos.itemSkeleton = componentItem.querySelector('.itemDeEvento').cloneNode(true);
            componentItem.querySelector('.itemDeEvento').remove();
          }
          if (!Drupal.behaviors.consultaEventos.notFoundMessage) {
            Drupal.behaviors.consultaEventos.notFoundMessage = componentItem.querySelector('.notFoundMessage').cloneNode(true);
            Drupal.behaviors.consultaEventos.notFoundMessage.classList.remove('hide');
            componentItem.querySelector('.notFoundMessage').remove();
          }
          await Drupal.behaviors.consultaEventos.getData(componentItem, siteUrl);
          if (!Drupal.behaviors.consultaEventos.eventCategories) await Drupal.behaviors.consultaEventos.getEventCategories(siteUrl);
          Drupal.behaviors.consultaEventos.buildFilter(componentItem, siteUrl);
        }
      });
    },
    getData: async function (componentItem, url, params = '') {
      try {
        componentItem.querySelector('.consultaContentWrapper').classList.add('querying')
        const currentDate = new Date().toISOString().split('T')[0];
        const requestUrl = `${url}/jsonapi/node/eventos?include=field_thumb_do_evento.field_asset&fields[file--file]=uri,url&sort=field_data_de_inicio&page[offset]=0&page[limit]=${componentItem.dataset.items}${params.length > 0 ? '&' + params : '&filter[field_data_de_inicio][value]=' + currentDate + '&filter[field_data_de_inicio][operator]=>='}`;

        let data = await fetch(`${requestUrl}`);
        data = await data.json();

        for (let index = 0; index < data['data'].length; index++) {
          const element = data['data'][index];
          element['thumbSrcFixed'] = null;

          const fieldThumbId = element['relationships']['field_thumb_do_evento']['data']?.['id'];
          if (!fieldThumbId) continue;

          const fieldThumb = data['included'].find(item => item.id === fieldThumbId)?.['relationships']['field_asset']['data']?.['id'];
          if (!fieldThumb) continue;

          element['thumbSrcFixed'] = data['included'].find(item => item.id === fieldThumb)?.['attributes']['uri']['url'];
        }

        Drupal.behaviors.consultaEventos.buildStructure(componentItem, data);
        componentItem.querySelector('.consultaContentWrapper').classList.remove('querying')
      } catch (error) {
        console.log(error)
        Drupal.behaviors.consultaEventos.buildStructure(componentItem, null);
        componentItem.querySelector('.consultaContentWrapper').classList.remove('querying')
      }
    },
    getEventCategories: async function (siteUrl) {
      try {
        if (!Drupal.behaviors.consultaEventos.eventCategories) {
          let categoriasData = await fetch(`${siteUrl}/jsonapi/taxonomy_term/categoria_de_eventos?sort=name`);
          Drupal.behaviors.consultaEventos.eventCategories = await categoriasData.json();
        }
      } catch (error) {
        console.log(error)
      }
    },
    buildFilter: function (componentItem, siteUrl) {
      const categoriaEvento = componentItem.querySelector('[name="taxonomy_term--categoria_de_eventos"]');
      categoriaEvento.innerHTML += Drupal.behaviors.consultaEventos.eventCategories['data'].map(item => {
        return `<option value="${item.id}">${item['attributes']['name']}</option>`
      }).join('');

      let timeout = null;
      function delayEvento() {
        clearTimeout(timeout);
        timeout = setTimeout(async function () {
          await Drupal.behaviors.consultaEventos.getData(componentItem, siteUrl, Drupal.behaviors.consultaEventos.buildQueryString(componentItem.querySelectorAll('.eventosFilter')));
        }, 500);
      }

      $(componentItem).find('.customSelect2').select2(
        {
          containerCssClass: 'consultaEventosSelect2'
        }
      );

      $(componentItem).find("[name='date_range']").datepicker({
        numberOfMonths: 1,
        dateFormat: 'dd/mm/yy',
        dayNamesMin: ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'],
        onSelect: function (selectedDate) {
          if (!$(this).data().datepicker.first) {
            $(this).data().datepicker.inline = true;
            $(this).data().datepicker.first = selectedDate;
          } else {
            const firstDate = $(this).data().datepicker.first;
            const secondDate = selectedDate;
            const startDateParts = firstDate.split("/");
            const endDateParts = secondDate.split("/");
            let startDate = new Date(startDateParts[2], startDateParts[1] - 1, startDateParts[0]);
            let endDate = new Date(endDateParts[2], endDateParts[1] - 1, endDateParts[0]);

            if (startDate > endDate) {
              let temp = startDate;
              startDate = endDate;
              endDate = temp;
            }

            const formattedStartDate = startDate.toLocaleDateString("pt-BR");
            const formattedEndDate = endDate.toLocaleDateString("pt-BR");

            $(this).val(formattedStartDate + " - " + formattedEndDate);
            $(this).data().datepicker.inline = false;
            delayEvento();
          }
        },
        onClose: function (selectedDate) {
          if (selectedDate.length === 0) delayEvento();
          delete $(this).data().datepicker.first;
          $(this).data().datepicker.inline = false;
        },
        beforeShow: function (input, inst) {
          $(this).val('');
        }
      });

      componentItem.querySelectorAll('input').forEach(item => {
        if (item.type === 'text' && item.name !== 'date_range') {
          item.addEventListener('keydown', e => {
            delayEvento()
          })
        }
      })

      $(componentItem).find('.customSelect2').on('change', function () {
        delayEvento();
      });
    },
    buildStructure: function (componentItem, data) {
      const consultaContentWrapper = componentItem.querySelector('.consultaContentWrapper');
      consultaContentWrapper.classList.remove('hide');
      const consultaInnerContent = componentItem.querySelector('.consultaInnerContent');
      const getSwiperInstance = Drupal.behaviors.consultaEventos.swiperInstances.find(item => item.component === componentItem);

      consultaInnerContent.innerHTML = '';
      if (getSwiperInstance && getSwiperInstance.swiperInstance) getSwiperInstance.swiperInstance.destroy();
      if (data['data'].length === 0) {
        consultaInnerContent.appendChild(Drupal.behaviors.consultaEventos.notFoundMessage);
        componentItem.querySelector('.arrowsWrapper').style.cssText = 'display: none;'
        return false;
      }
      componentItem.querySelector('.arrowsWrapper').style.cssText = ''

      data['data'].forEach(item => {
        const eventoItem = Drupal.behaviors.consultaEventos.itemSkeleton.cloneNode(true);

        const link = eventoItem.querySelector('a');
        link.href = item['attributes']['field_link_externo']['uri'];
        link.title = `Link para o evento ${item['attributes']['title']}`;

        const img = eventoItem.querySelector('img');
        if (!item['thumbSrcFixed']) {
          img.style.cssText = 'display: none;';
        } else {
          img.src = item['thumbSrcFixed']
          img.alt = `Thumbnail do evento ${item['attributes']['title']}`;
          img.title = `Thumbnail do evento ${item['attributes']['title']}`;
        }

        const dataDoEvento = eventoItem.querySelector('.dataDoEvento');
        dataDoEvento.innerHTML = Drupal.behaviors.consultaEventos.getDateString(item['attributes']['field_data_de_inicio'], item['attributes']['field_data_final']);

        const nomeEvento = eventoItem.querySelector('.nomeDoEvento');
        nomeEvento.innerHTML = item['attributes']['title'];

        const enderecoDoEvento = eventoItem.querySelector('.enderecoDoEvento');
        enderecoDoEvento.innerHTML = item['attributes']['field_nome_do_endereco'];

        consultaInnerContent.appendChild(eventoItem);
      });

      const mySlide = new Swiper(consultaContentWrapper, {
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
            slidesPerView: 4,
          },
          768: {
            slidesPerView: 2,
          }
        },
      });

      if (!getSwiperInstance) {
        Drupal.behaviors.consultaEventos.swiperInstances.push({
          component: componentItem,
          swiperInstance: mySlide
        })
      } else {
        getSwiperInstance.swiperInstance = mySlide
      }
    },
    buildQueryString: function (filterElements) {
      const arr = [];
      for (let index = 0; index < filterElements.length; index++) {
        const element = filterElements[index];
        if (element.value.length === 0) continue;
        if (element.name === 'date_range') {
          const arrValue = element.value.split('-');
          if (arrValue.length === 1) continue;
          const startDateArr = arrValue[0].split('/');
          const endDateArr = arrValue[1].split('/');
          const startDate = new Date(startDateArr[2], startDateArr[1] - 1, startDateArr[0]);
          const endDate = new Date(endDateArr[2], endDateArr[1] - 1, endDateArr[0]);
          startDate.setHours(0, 0, 0, 0);
          endDate.setHours(23, 59, 59, 999);

          arr.push(`filter[startDate][condition][path]=field_data_de_inicio`);
          arr.push(`filter[startDate][condition][operator]=>=`);
          arr.push(`filter[startDate][condition][value][]=${Drupal.behaviors.consultaEventos.formatDateToISO(startDate)}`);
          arr.push(`filter[endDate][condition][path]=field_data_final`);
          arr.push(`filter[endDate][condition][operator]=<=`);
          arr.push(`filter[endDate][condition][value][]=${Drupal.behaviors.consultaEventos.formatDateToISO(endDate)}`);
        }
        else if (element.name.includes('taxonomy_')) {
          arr.push(`filter[${element.name}][condition][path]=field_categoria.id`)
          arr.push(`filter[${element.name}][condition][operator]=IN`)
          arr.push(`filter[${element.name}][condition][value][]=${element.value}`)
        } else {
          arr.push(`filter[${element.name}][operator]=CONTAINS`)
          arr.push(`filter[${element.name}][value]=${element.value}`)
        }
      }
      return arr.length > 0 ? arr.join('&') : ''
    },
    getDateString: function (inicio, final) {
      const dataInicio = new Date(inicio);
      const dataFinal = new Date(final);

      if (dataInicio.getDate() === dataFinal.getDate()) {
        return `${dataInicio.toLocaleString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', '')}, ${dataInicio.getDate()} ${dataInicio.toLocaleString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '')} - ${dataInicio.toLocaleString('pt-BR', { hour: 'numeric', hour12: false }).padStart(2, '0')}:${dataInicio.toLocaleString('pt-BR', { minute: 'numeric' }).padStart(2, '0')} ~ ${dataFinal.toLocaleString('pt-BR', { hour: 'numeric', hour12: false }).padStart(2, '0')}:${dataFinal.toLocaleString('pt-BR', { minute: 'numeric' }).padStart(2, '0')}`
      }
      return `<span>${dataInicio.getDate()} ${dataInicio.toLocaleString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '')}</span> <div class="custom-separator"></div> <span>${dataFinal.getDate()} ${dataFinal.toLocaleString('pt-BR', { month: 'short' }).toUpperCase().replace('.', '')}</span>`
    },
    formatDateToISO: function (date) {
      const year = date.getFullYear();
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const day = date.getDate().toString().padStart(2, '0');
      const hours = date.getHours().toString().padStart(2, '0');
      const minutes = date.getMinutes().toString().padStart(2, '0');
      const seconds = date.getSeconds().toString().padStart(2, '0');
      return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}Z`;
    },
  }
})(jQuery, Drupal);
;
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
