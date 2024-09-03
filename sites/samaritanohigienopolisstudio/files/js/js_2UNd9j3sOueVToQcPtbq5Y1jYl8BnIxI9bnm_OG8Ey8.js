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
 * Abas container
 */

(function ($, Drupal) {
  "use strict";
  Drupal.behaviors.abasContainer = {
    attach: function (context, settings) {
      $('.custom-tabs-wrapper').once().each(function () {
        const tabsWrapperItem = $(this).get(0);

        function getTabsSumWidth(tabs) {
          let widthAll = 0;
          tabs.forEach(item => {
            widthAll += item.getBoundingClientRect().width;
          })
          return widthAll;
        }

        function normalizeElementSizes() {
          if (typeof Event === 'function') {
            window.dispatchEvent(new Event('resize'));
          } else {
            var resizeEvent = window.document.createEvent('UIEvents');
            resizeEvent.initUIEvent('resize', true, false, window, 0);
            window.dispatchEvent(resizeEvent);
          }
        }

        function rebuildButtonClasses(tabsList, wrapper) {
          const tabsListPosition = tabsList.getBoundingClientRect();
          let firstChildLeftPosition = tabsList.firstChild.getBoundingClientRect().left;
          let lastChildRightPosition = tabsList.lastChild.getBoundingClientRect().right;

          if (firstChildLeftPosition < 0) firstChildLeftPosition = Math.abs(firstChildLeftPosition);
          if (Math.abs(firstChildLeftPosition - tabsListPosition.left) < 2) {
            wrapper.querySelector('button.prevButton').classList.add('slick-disabled')
          } else {
            wrapper.querySelector('button.prevButton').classList.remove('slick-disabled')
          }

          if (lastChildRightPosition < 0) lastChildRightPosition = Math.abs(lastChildRightPosition);
          if (Math.abs(lastChildRightPosition - tabsListPosition.right) < 2) {
            wrapper.querySelector('button.nextButton').classList.add('slick-disabled')
          } else {
            wrapper.querySelector('button.nextButton').classList.remove('slick-disabled')
          }
        }

        function bindEventsButtonsScroll(wrapper, tabsList) {
          const buttons = wrapper.querySelectorAll('button')
          buttons.forEach(button => {
            button.addEventListener('click', e => {
              let leftValue = 0;
              if (e.target.classList.contains('prevButton')) {
                leftValue = tabsList.scrollLeft - 500;
              }
              if (e.target.classList.contains('nextButton')) {
                leftValue = tabsList.scrollLeft + 500;
              }
              tabsList.scrollTo({
                left: leftValue,
                behavior: "smooth",
              });

              let scrollTimeout = null;
              function tabScrollListener(e) {
                if (scrollTimeout) {
                  window.clearTimeout(scrollTimeout);
                }
                scrollTimeout = window.setTimeout(function () {
                  rebuildButtonClasses(tabsList, wrapper);
                  tabsList.removeEventListener('scroll', tabScrollListener);
                }, 100);
              }
              tabsList.addEventListener('scroll', tabScrollListener);
            })
          })
        }

        setTimeout(() => {
          const tabsList = tabsWrapperItem.querySelector('.coh-accordion-tabs-nav');
          const buttonsWrapper = tabsWrapperItem.querySelector('.buttonsWrapper');
          const tabs = tabsWrapperItem.querySelectorAll('.coh-accordion-tabs-nav li');

          const links = tabsList.querySelectorAll('.custom-tabs-wrapper .coh-accordion-tabs-nav a')
          links.forEach(linkItem => {
            linkItem.addEventListener('click', e => {
              normalizeElementSizes();
            })
          })
          if (tabsList.getBoundingClientRect().width < getTabsSumWidth(tabs)) {
            buttonsWrapper.classList.add('active');
            bindEventsButtonsScroll(buttonsWrapper, tabsList);
          }
        }, 1);
      });
    }
  };
})(jQuery, Drupal);
;
/**
 * @sitestudioexcludesonar
 * *************************************************
 * ************ WARNING WARNING WARNING ************
 * *************************************************
 * This code has been modified from the original
 * there are several pull requests which should
 * include these modifications
 * See ...
 * *************************************************
 */

(function ($, once, window, undefined) {

  /** Default settings */
  var defaults = {
    active: null,
    event: 'click',
    disabled: [],
    collapsible: 'accordion',
    startCollapsed: false,
    rotate: false,
    setHash: false,
    animation: 'default',
    animationQueue: false,
    duration: 500,
    fluidHeight: true,
    scrollToAccordion: false,
    scrollToAccordionOnLoad: false,
    scrollToAccordionOffset: 0,
    accordionTabElement: '<div></div>',
    click: function () { },
    activate: function () { },
    activateStart: function () { },
    activateFinished: function () { },
    deactivate: function () { },
    load: function () { },
    activateState: function () { },
    classes: {
      stateDefault: 'r-tabs-state-default',
      stateActive: 'r-tabs-state-active',
      stateDisabled: 'r-tabs-state-disabled',
      stateExcluded: 'r-tabs-state-excluded',
      stateTypePrefix: 'r-tabs-state',
      container: 'r-tabs',
      ul: 'r-tabs-nav',
      tab: 'r-tabs-tab',
      anchor: 'r-tabs-anchor',
      panel: 'r-tabs-panel',
      accordionTitle: 'r-tabs-accordion-title'
    }
  };

  var events = [
    'tabs-click',
    'tabs-activate',
    'tabs-active-start',
    'tabs-activate-finished',
    'tabs-deactivate',
    'tabs-activate-state',
    'tabs-load',
    'tabs-refresh'
  ];

  /**
   * Responsive Tabs
   * @constructor
   * @param {object} element - The HTML element the validator should be bound to
   * @param {object} options - An option map
   */
  function ResponsiveTabs(element, options) {
    this.element = element; // Selected DOM element
    this.$element = $(element); // Selected jQuery element

    this.tabs = []; // Create tabs array
    this.panels = []; // Create panels array
    this.tabItems = []; // Create tabbed navigation items array
    this.tabItemAnchors = []; // Create tabbed naviation anchors array
    this.accordionItems = []; // Create accordion items array
    this.accordionItemAnchors = []; // Create accordion item anchor
    this.state = ''; // Define the plugin state (tabs/accordion)
    this.rotateInterval = 0; // Define rotate interval
    this.$queue = $({});

    // Extend the defaults with the passed options
    this.options = $.extend({}, defaults, options);

    this.init();
  }


  /**
   * This function initializes the tab plugin
   */
  ResponsiveTabs.prototype.init = function () {
    var _this = this;

    // Load all the elements
    this.tabs = this._loadElements();
    this._loadClasses();
    this._loadEvents();
    this._loadAria();

    // Window resize bind to check state
    $(window).on('resize', function (e) {
      _this._setState(e);
      if (_this.options.fluidHeight !== true) {
        _this._equaliseHeights();
      }
    });

    // Hashchange event
    $(window).on('hashchange', function (e) {
      var tabRef = _this._getTabRefBySelector(window.location.hash);
      var oTab = _this._getTab(tabRef);

      // Check if a tab is found that matches the hash
      if (tabRef >= 0 && !oTab._ignoreHashChange && !oTab.disabled) {
        // If so, open the tab and auto close the current one
        _this._openTab(e, _this._getTab(tabRef), true);
      }
    });

    // Start rotate event if rotate option is defined
    if (this.options.rotate !== false) {
      this.startRotation();
    }

    // Set fluid height
    if (this.options.fluidHeight !== true) {
      _this._equaliseHeights();
    }

    // --------------------
    // Define plugin events
    //

    // Activate: this event is called when a tab is selected
    this.$element.bind('tabs-click', function (e, oTab) {
      _this.options.click.call(this, e, oTab);
    });

    // Activate: this event is called when a tab is selected
    this.$element.bind('tabs-activate', function (e, oTab) {
      _this.options.activate.call(this, e, oTab);
    });
    // Activate start: this event is called when a tab is selected and before the animation has completed
    this.$element.bind('tabs-activate-start', function (e, oTab) {
      _this.options.activateFinished.call(this, e, oTab);
    });
    // Activate finished: this event is called when a tab is selected and the animation has completed
    this.$element.bind('tabs-activate-finished', function (e, oTab) {
      _this.options.activateFinished.call(this, e, oTab);
    });
    // Deactivate: this event is called when a tab is closed
    this.$element.bind('tabs-deactivate', function (e, oTab) {
      _this.options.deactivate.call(this, e, oTab);
    });
    // Activate State: this event is called when the plugin switches states
    this.$element.bind('tabs-activate-state', function (e, state) {
      _this.options.activateState.call(this, e, state);
    });

    // Load: this event is called when the plugin has been loaded
    this.$element.bind('tabs-load', function (e) {
      e.stopPropagation();
      var startTab;

      _this._setState(e); // Set state

      // Check if the panel should be collapsed on load
      if ((_this.options.startCollapsed !== true) && !(_this.options.startCollapsed === 'accordion' && _this.state === 'accordion')) {

        startTab = _this._getStartTab();

        // disable animation on initial page load
        var cacheAnimationType = _this.options.animation;
        _this.options.animation = 'default';

        // Open the initial tab
        _this._openTab(e, startTab); // Open first tab

        // restore animation after initial page load
        _this.options.animation = cacheAnimationType;

        // Call the callback function
        _this.options.load.call(this, e, startTab); // Call the load callback
      }
    });
    // Trigger loaded event
    this.$element.trigger('tabs-load', _this);
  };

  //
  // PRIVATE FUNCTIONS
  //

  /**
   * This function loads the tab elements and stores them in an array
   * @returns {Array} Array of tab elements
   */
  ResponsiveTabs.prototype._loadElements = function () {
    var _this = this;
    var $ul = this.$element.children('ul:first');
    var tabs = [];
    var id = 0;

    // Add the classes to the basic html elements
    this.$element.addClass(_this.options.classes.container); // Tab container
    $ul.addClass(_this.options.classes.ul); // List container

    var wrapper = $('.coh-accordion-tabs-content-wrapper:first', this.$element);

    // use .not to ensure we dont select child tab items from any nested accordions
    var tabButtons = $('.' + _this.options.classes.accordionTitle, wrapper)
      .not(wrapper.find('.coh-accordion-tabs-content-wrapper .'+ _this.options.classes.accordionTitle));

    once('tab-init', $(tabButtons)).forEach(function (e, i) {

      var $accordionTab = $(e);

      var $anchor = $('a', $accordionTab);

      var isExcluded = $accordionTab.hasClass(_this.options.classes.stateExcluded);
      var $panel, panelSelector, $tab, $tabAnchor, tabSettings;

      // Check if the tab should be excluded
      if (!isExcluded) {

        panelSelector = $anchor.attr('href');
        $panel = $(panelSelector);
        $panel.hide();

        tabSettings = $accordionTab.data('cohTabSettings');

        $tab = $('<li />').appendTo($ul);

        $tab.addClass(tabSettings.customStyle);

        $tabAnchor = $('<a />', {
          href: panelSelector,
        }).html($anchor.html()).appendTo($tab);

        var oTab = {
          _ignoreHashChange: false,
          id: id,
          disabled: typeof tabSettings.disabled !== 'undefined' ? tabSettings.disabled : false,
          tab: $tab,
          anchor: $tabAnchor,
          panel: $panel,
          selector: panelSelector,
          accordionTab: $accordionTab,
          accordionAnchor: $anchor,
          active: false,
          linkUrl: typeof tabSettings.linkUrl !== 'undefined' ? tabSettings.linkUrl : false,
          linkTarget: typeof tabSettings.linkTarget !== 'undefined' ? tabSettings.linkTarget : false,
          hide: typeof tabSettings.hide !== 'undefined' ? tabSettings.hide : false
        };

        // 1up the ID
        id++;
        // Add to tab array
        tabs.push(oTab);

        // Add to panels array
        _this.panels.push(oTab.panel);

        // Add to tab items array
        _this.tabItems.push(oTab.tab);
        _this.tabItemAnchors.push(oTab.anchor);

        // Add to accordion items array
        _this.accordionItems.push(oTab.accordionTab);
        _this.accordionItemAnchors.push(oTab.accordionAnchor);
      }
    });

    return tabs;
  };

  /**
   * Load the initial aria attributes
   * @private
   */
  ResponsiveTabs.prototype._loadAria = function () {
    for (var i = 0; i < this.tabs.length; i++) {

      this.tabs[i].accordionAnchor.attr('aria-expanded', this.tabs[i].active);

      if (this.tabs[i].disabled) {
        this.tabs[i].accordionAnchor.attr('aria-disabled', this.tabs[i].disabled);
      }
    }
  }

  /**
   * Update the state of the aria attributes
   * @param tab | obj - the tab object
   * @private
   */
  ResponsiveTabs.prototype._updateAria = function (tab) {

    tab.accordionAnchor.attr('aria-expanded', tab.active);
    tab.accordionAnchor.removeAttr('aria-disabled');

    if (tab.disabled || (!this.options.collapsible && tab.active)) {
      tab.accordionAnchor.attr('aria-disabled', true);
    }
  }

  /**
   * This function adds classes to the tab elements based on the options
   */
  ResponsiveTabs.prototype._loadClasses = function () {
    for (var i = 0; i < this.tabs.length; i++) { // Change this to a $.each with once
      this.tabs[i].tab.addClass(this.options.classes.stateDefault).addClass(this.options.classes.tab);
      this.tabs[i].anchor.addClass(this.options.classes.anchor);
      this.tabs[i].panel.addClass(this.options.classes.stateDefault).addClass(this.options.classes.panel);
      this.tabs[i].accordionTab.addClass(this.options.classes.accordionTitle);
      this.tabs[i].accordionAnchor.addClass(this.options.classes.anchor);
      if (this.tabs[i].disabled) {
        this.tabs[i].tab.removeClass(this.options.classes.stateDefault).addClass(this.options.classes.stateDisabled);
        this.tabs[i].accordionTab.removeClass(this.options.classes.stateDefault).addClass(this.options.classes.stateDisabled);
      }
    }
  };

  /**
   * This function adds events to the tab elements
   */
  ResponsiveTabs.prototype._loadEvents = function () {
    var _this = this;

    // Define activate event on a tab element
    var fActivate = function (e) {
      var current = _this._getCurrentTab(); // Fetch current tab
      var activatedTab = e.data.tab;

      e.preventDefault();

      // If the tab is a link
      if (activatedTab.linkUrl !== false) {
        window.open(activatedTab.linkUrl, activatedTab.linkTarget);
        return;
      }

      // Trigger click event for whenever a tab is clicked/touched even if the tab is disabled
      activatedTab.tab.trigger('tabs-click', activatedTab);

      // Make sure this tab isn't disabled
      if (!(activatedTab.disabled || activatedTab.linkUrl)) {

        // Check if hash has to be set in the URL location
        if (_this.options.setHash) {
          // Set the hash using the history api if available to tackle Chromes repaint bug on hash change
          if (history.pushState) {
            // Fix for missing window.location.origin in IE
            if (!window.location.origin) {
              window.location.origin = window.location.protocol + "//" + window.location.hostname + (window.location.port ? ':' + window.location.port : '');
            }

            history.pushState(null, null, window.location.origin + window.location.pathname + window.location.search + activatedTab.selector);
          } else {
            // Otherwise fallback to the hash update for sites that don't support the history api
            window.location.hash = activatedTab.selector;
          }
        }

        e.data.tab._ignoreHashChange = true;

        // Check if the activated tab isnt the current one or if its collapsible. If not, do nothing
        if (current !== activatedTab || _this._isCollapisble()) {
          // The activated tab is either another tab of the current one. If it's the current tab it is collapsible
          // Either way, the current tab can be closed
          _this._closeTab(e, current);

          // Check if the activated tab isnt the current one or if it isnt collapsible
          if (current !== activatedTab || !_this._isCollapisble()) {
            _this._openTab(e, activatedTab, false, true);
          }
        }
      }
    };

    // Loop tabs
    for (var i = 0; i < this.tabs.length; i++) {
      // Add activate function to the tab and accordion selection element
      $(once('loadEvent', this.tabs[i].anchor.get(0))).on(_this.options.event, { tab: _this.tabs[i] }, fActivate);
      $(once('loadEvent', this.tabs[i].accordionAnchor.get(0))).on(_this.options.event, { tab: _this.tabs[i] }, fActivate);
    }
  };

  /**
   * This function gets the tab that should be opened at start
   * @returns {Object} Tab object
   */
  ResponsiveTabs.prototype._getStartTab = function () {
    var tabRef = this._getTabRefBySelector(window.location.hash);
    var startTab;

    // Check if the page has a hash set that is linked to a tab
    if (tabRef >= 0 && !this._getTab(tabRef).disabled) {
      // If so, set the current tab to the linked tab
      startTab = this._getTab(tabRef);
    } else if (this.options.active > 0 && !this._getTab(this.options.active).disabled) {
      startTab = this._getTab(this.options.active);
    } else {
      // If not, just get the first one
      startTab = this._getTab(0);
    }

    return startTab;
  };

  /**
   * This function sets the current state of the plugin
   * @param {Event} e - The event that triggers the state change
   */
  ResponsiveTabs.prototype._setState = function (e) {
    var $ul = $('ul:first', this.$element);
    var oldState = this.state;
    var startCollapsedIsState = (typeof this.options.startCollapsed === 'string');
    var startTab;

    var visible = $ul.is(':visible');

    // The state is based on the visibility of the tabs list
    if (visible) {
      // Tab list is visible, so the state is 'tabs'
      this.state = 'tabs';
    } else {
      // Tab list is invisible, so the state is 'accordion'
      this.state = 'accordion';
    }

    // If the new state is different from the old state
    if (this.state !== oldState) {

      // Add the state class to the Container
      this.$element.toggleClass(this.options.classes.stateTypePrefix + '-' + 'tabs', visible);
      this.$element.toggleClass(this.options.classes.stateTypePrefix + '-' + 'accordion', !visible);

      // If so, the state activate trigger must be called
      this.$element.trigger('tabs-activate-state', { oldState: oldState, newState: this.state, tabs: this });

      // Check if the state switch should open a tab
      if (oldState && startCollapsedIsState && this.options.startCollapsed !== this.state && this._getCurrentTab() === undefined) {
        // Get initial tab
        startTab = this._getStartTab(e);
        // Open the initial tab
        this._openTab(e, startTab); // Open first tab
      }
    }
  };

  /**
   * This function opens a tab
   * @param {Event} e - The event that triggers the tab opening
   * @param {Object} oTab - The tab object that should be opened
   * @param {Boolean} closeCurrent - Defines if the current tab should be closed
   * @param {Boolean} stopRotation - Defines if the tab rotation loop should be stopped
   */
  ResponsiveTabs.prototype._openTab = function (e, oTab, closeCurrent, stopRotation) {
    var _this = this;
    var scrollOffset;

    // If there is no tab (generally when tabs are empty) just return
    if (typeof oTab === 'undefined') {
      return;
    }

    // Check if the current tab has to be closed
    if (closeCurrent) {
      this._closeTab(e, this._getCurrentTab());
    }

    // Check if the rotation has to be stopped when activated
    if (stopRotation && this.rotateInterval > 0) {
      this.stopRotation();
    }

    // Set this tab to active
    oTab.active = true;
    // Set active classes to the tab button and accordion tab button
    oTab.tab.removeClass(_this.options.classes.stateDefault).addClass(_this.options.classes.stateActive);
    oTab.accordionTab.removeClass(_this.options.classes.stateDefault).addClass(_this.options.classes.stateActive);

    // Run panel transiton
    _this._doTransition(oTab, _this.options.animation, 'open', function () {
      var scrollOnLoad = (e.type !== 'tabs-load' || _this.options.scrollToAccordionOnLoad);

      // When finished, set active class to the panel
      oTab.panel.removeClass(_this.options.classes.stateDefault).addClass(_this.options.classes.stateActive);

      // Update the aria
      _this._updateAria(oTab);

      // And if enabled and state is accordion, scroll to the accordion tab
      if (_this.getState() === 'accordion' && _this.options.scrollToAccordion && (!_this._isInView(oTab.accordionTab) || _this.options.animation !== 'default') && scrollOnLoad) {

        // Add offset element's height to scroll position
        scrollOffset = oTab.accordionTab.offset().top - _this.options.scrollToAccordionOffset;

        // Check if the animation option is enabled, and if the duration isn't 0
        if (_this.options.animation !== 'default' && _this.options.duration > 0) {
          // If so, set scrollTop with animate and use the 'animation' duration
          $('html, body').animate({
            scrollTop: scrollOffset
          }, _this.options.duration);
        } else {
          //  If not, just set scrollTop
          $('html, body').animate({
            scrollTop: scrollOffset
          }, 1);

          // $('html, body').scrollTop(scrollOffset);
        }
      }
    });

    this.$element.trigger('tabs-activate', oTab);
  };

  /**
   * This function closes a tab
   * @param {Event} e - The event that is triggered when a tab is closed
   * @param {Object} oTab - The tab object that should be closed
   */
  ResponsiveTabs.prototype._closeTab = function (e, oTab) {
    var _this = this;
    var doQueueOnState = typeof _this.options.animationQueue === 'string';
    var doQueue;

    if (oTab !== undefined) {
      if (doQueueOnState && _this.getState() === _this.options.animationQueue) {
        doQueue = true;
      } else if (doQueueOnState) {
        doQueue = false;
      } else {
        doQueue = _this.options.animationQueue;
      }

      // Deactivate tab
      oTab.active = false;
      // Set default class to the tab button
      oTab.tab.removeClass(_this.options.classes.stateActive).addClass(_this.options.classes.stateDefault);

      // Update the aria
      _this._updateAria(oTab);

      // Run panel transition
      _this._doTransition(oTab, _this.options.animation, 'close', function () {
        // Set default class to the accordion tab button and tab panel
        oTab.accordionTab.removeClass(_this.options.classes.stateActive).addClass(_this.options.classes.stateDefault);
        oTab.panel.removeClass(_this.options.classes.stateActive).addClass(_this.options.classes.stateDefault);
      }, !doQueue);

      this.$element.trigger('tabs-deactivate', oTab);
    }
  };

  /**
   * This function runs an effect on a panel
   * @param {Object} oTab - The object for the panel
   * @param {String} method - The transition method reference
   * @param {String} state - The state (open/closed) that the panel should transition to
   * @param {Function} callback - The callback function that is called after the transition
   * @param {Boolean} dequeue - Defines if the event queue should be dequeued after the transition
   */
  ResponsiveTabs.prototype._doTransition = function (oTab, method, state, callback, dequeue) {
    var effect;
    var _this = this;
    var duration = _this.options.duration;

    // Get effect based on method
    switch (method) {
      case 'slide':
        effect = (state === 'open') ? 'slideDown' : 'slideUp';
        duration = _this.options.duration;
        break;
      case 'fade':
        effect = (state === 'open') ? 'fadeIn' : 'fadeOut';
        duration = _this.options.duration;
        break;
      default:
        effect = (state === 'open') ? 'show' : 'hide';
        // When default is used, set the duration to 0
        //_this.options.duration = 0;
        duration = 0;
        break;
    }

    // Prevent new tab content stacking underneath current tab content by removing fade animation duration
    if (_this.options.animation === 'fade' && _this.state === 'tabs') {
      effect = state === 'open' ? effect : 'hide';
      duration = state === 'open' ? duration : 0;
      oTab.panel.css('opacity', '');
    }
    // Run the transition on the panel
    oTab.panel[effect]({
      duration: duration,
      queue: 'responsive-tabs-' + state,
      complete: function () {
        // Call the callback function
        callback.call(oTab.panel, method, state);
        _this.$element.trigger('tabs-activate-finished', oTab);
      }
    }).dequeue('responsive-tabs-' + state);
  };

  /**
   * This function returns the collapsibility of the tab in this state
   * @returns {Boolean} The collapsibility of the tab
   */
  ResponsiveTabs.prototype._isCollapisble = function () {
    return (typeof this.options.collapsible === 'boolean' && this.options.collapsible) || (typeof this.options.collapsible === 'string' && this.options.collapsible === this.getState());
  };

  /**
   * This function returns a tab by numeric reference
   * @param {Integer} numRef - Numeric tab reference
   * @returns {Object} Tab object
   */
  ResponsiveTabs.prototype._getTab = function (numRef) {
    return this.tabs[numRef];
  };

  /**
   * This function returns the numeric tab reference based on a hash selector
   * @param {String} selector - Hash selector
   * @returns {Integer} Numeric tab reference
   */
  ResponsiveTabs.prototype._getTabRefBySelector = function (selector) {
    // Loop all tabs
    for (var i = 0; i < this.tabs.length; i++) {
      // Check if the hash selector is equal to the tab selector
      if (this.tabs[i].selector === selector) {
        return i;
      }
    }
    // If none is found return a negative index
    return -1;
  };

  /**
   * This function returns the current tab element
   * @returns {Object} Current tab element
   */
  ResponsiveTabs.prototype._getCurrentTab = function () {
    return this._getTab(this._getCurrentTabRef());
  };

  /**
   * This function returns the next tab's numeric reference
   * @param {Integer} currentTabRef - Current numeric tab reference
   * @returns {Integer} Numeric tab reference
   */
  ResponsiveTabs.prototype._getNextTabRef = function (currentTabRef) {
    var tabRef = (currentTabRef || this._getCurrentTabRef());
    var nextTabRef = (tabRef === this.tabs.length - 1) ? 0 : tabRef + 1;
    return (this._getTab(nextTabRef).disabled) ? this._getNextTabRef(nextTabRef) : nextTabRef;
  };

  /**
   * This function returns the previous tab's numeric reference
   * @returns {Integer} Numeric tab reference
   */
  ResponsiveTabs.prototype._getPreviousTabRef = function () {
    return (this._getCurrentTabRef() === 0) ? this.tabs.length - 1 : this._getCurrentTabRef() - 1;
  };

  /**
   * This function returns the current tab's numeric reference
   * @returns {Integer} Numeric tab reference
   */
  ResponsiveTabs.prototype._getCurrentTabRef = function () {
    // Loop all tabs
    for (var i = 0; i < this.tabs.length; i++) {
      // If this tab is active, return it
      if (this.tabs[i].active) {
        return i;
      }
    }
    // No tabs have been found, return negative index
    return -1;
  };

  /**
   * This function gets the tallest tab and applied the height to all tabs
   */
  ResponsiveTabs.prototype._equaliseHeights = function () {
    var maxHeight = 0;

    $.each($.map(this.tabs, function (tab) {
      maxHeight = Math.max(maxHeight, tab.panel.css('minHeight', '').height());
      return tab.panel;
    }), function () {
      this.css('minHeight', maxHeight);
    });
  };

  //
  // HELPER FUNCTIONS
  //

  ResponsiveTabs.prototype._isInView = function ($element) {
    var docViewTop = $(window).scrollTop(),
      docViewBottom = docViewTop + $(window).height(),
      elemTop = $element.offset().top,
      elemBottom = elemTop + $element.height();
    return ((elemBottom <= docViewBottom) && (elemTop >= docViewTop));
  };

  //
  // PUBLIC FUNCTIONS
  //


  /**
   * This function returns the current tab's numeric reference
   * @returns {Integer} Numeric tab reference
   */
  ResponsiveTabs.prototype.getCurrentTab = function () {
    return this._getCurrentTabRef();
  };

  /**
   * This function returns the previous tab's numeric reference
   * @returns {Integer} Numeric tab reference
   */
  ResponsiveTabs.prototype.getPreviousTab = function () {
    return this._getPreviousTabRef();
  };

  /**
   * This function activates a tab
   * @param {Integer} tabRef - Numeric tab reference
   * @param {Boolean} stopRotation - Defines if the tab rotation should stop after activation
   */
  ResponsiveTabs.prototype.activate = function (tabRef, stopRotation) {
    var e = jQuery.Event('tabs-activate');
    var oTab = this._getTab(tabRef);
    if (!oTab.disabled) {
      this._openTab(e, oTab, true, stopRotation || true);
    }
  };

  /**
   * This function deactivates a tab
   * @param {Integer} tabRef - Numeric tab reference
   */
  ResponsiveTabs.prototype.deactivate = function (tabRef) {
    var e = jQuery.Event('tabs-dectivate');
    var oTab = this._getTab(tabRef);
    if (!oTab.disabled) {
      this._closeTab(e, oTab);
    }
  };

  /**
   * This function enables a tab
   * @param {Integer} tabRef - Numeric tab reference
   */
  ResponsiveTabs.prototype.enable = function (tabRef) {
    var oTab = this._getTab(tabRef);
    if (oTab) {
      oTab.disabled = false;
      oTab.tab.addClass(this.options.classes.stateDefault).removeClass(this.options.classes.stateDisabled);
      oTab.accordionTab.addClass(this.options.classes.stateDefault).removeClass(this.options.classes.stateDisabled);
    }
  };

  /**
   * This function disable a tab
   * @param {Integer} tabRef - Numeric tab reference
   */
  ResponsiveTabs.prototype.disable = function (tabRef) {
    var oTab = this._getTab(tabRef);
    if (oTab) {
      oTab.disabled = true;
      oTab.tab.removeClass(this.options.classes.stateDefault).addClass(this.options.classes.stateDisabled);
      oTab.accordionTab.removeClass(this.options.classes.stateDefault).addClass(this.options.classes.stateDisabled);
    }
  };

  /**
   * This function gets the current state of the plugin
   * @returns {String} State of the plugin
   */
  ResponsiveTabs.prototype.getState = function () {
    return this.state;
  };

  /**
   * This function starts the rotation of the tabs
   * @param {Integer} speed - The speed of the rotation
   */
  ResponsiveTabs.prototype.startRotation = function (speed) {
    var _this = this;
    // Make sure not all tabs are disabled
    if (this.tabs.length > this.options.disabled.length) {
      this.rotateInterval = setInterval(function () {
        var e = jQuery.Event('rotate');
        _this._openTab(e, _this._getTab(_this._getNextTabRef()), true);
      }, speed || (($.isNumeric(_this.options.rotate)) ? _this.options.rotate : 4000));
    } else {
      throw new Error("Rotation is not possible if all tabs are disabled");
    }
  };

  /**
   * This function stops the rotation of the tabs
   */
  ResponsiveTabs.prototype.stopRotation = function () {
    window.clearInterval(this.rotateInterval);
    this.rotateInterval = 0;
  };

  /**
   * This function can be used to get/set options
   * @return {any} Option value
   */
  ResponsiveTabs.prototype.option = function (key, value) {
    if (typeof value !== 'undefined') {
      this.options[key] = value;
    }
    return this.options[key];
  };

  /**
   * This function refreshes current list of tabs - particularly useful for adding tabs with AJAX
   * @returns {undefined}
   */
  ResponsiveTabs.prototype.refresh = function () {

    this.tabs = this.tabs.concat(this._loadElements());

    this._loadClasses();
    this._loadEvents();

    // Set fluid height
    if (this.options.fluidHeight !== true) {
      this._equaliseHeights();
    }

    this.$element.trigger('tabs-refresh', this);

    this._setState();

    return this;
  };

  /** jQuery wrapper */
  $.fn.responsiveTabs = function (options) {
    var args = arguments;
    var instance;

    var classes = [
      'stateActive',
      'stateDisabled',
      'stateExcluded'
    ];

    if (options === undefined || typeof options === 'object') {
      return this.each(function () {

        // If responsiveTabs doesn't exist init
        if (!$.data(this, 'responsivetabs')) {
          $.data(this, 'responsivetabs', new ResponsiveTabs(this, options));
        } else {
          // Otherwise just update the settings
          $.extend($.data(this, 'responsivetabs').options, options);
        }
      });
    } else if (typeof options === 'string' && options[0] !== '_' && options !== 'init') {
      instance = $.data(this[0], 'responsivetabs');

      // Allow instances to be destroyed via the 'destroy' method
      if (options === 'destroy') {
        // TODO: destroy instance classes, etc

        // Clean up the tabs etc
        if (typeof instance !== 'undefined') {
          for (var i = 0; i < instance.tabs.length; i++) {
            $.each($([instance.tabs[i].accordionTab, instance.tabs[i].panel, instance.tabs[i].tab]), function () {
              var $this = $(this);
              $this.removeAttr('style');
              $this.removeClass(instance.options.classes.stateActive);
              $this.removeClass(instance.options.classes.stateDisabled);
              $this.removeClass(instance.options.classes.stateExcluded);
            });
          }

          // Remove any bound event handlers on the container
          for (var i = 0; i < events.length; i++) {
            instance.$element.unbind(events[i]);
          }

          // Loop tabs to remove any 'event' bindings
          for (var i = 0; i < instance.tabs.length; i++) {
            // Add activate function to the tab and accordion selection element
            instance.tabs[i].anchor.off(instance.options.event);
            instance.tabs[i].accordionAnchor.off(instance.options.event);
          }

          // Remove data from the DOM element
          $.removeData(this[0], 'responsivetabs');
        }
      }

      if (instance instanceof ResponsiveTabs && typeof instance[options] === 'function') {
        return instance[options].apply(instance, Array.prototype.slice.call(args, 1));
      } else {
        return this;
      }
    }
  };

}(jQuery, once, window));
;
(function ($, Drupal, once, drupalSettings) {
  "use strict";

  Drupal.behaviors.CohesionAccordionTabs = {
    attach: function (context) {

      var onceTabs = 'cohAccordionTabs';

      var cmm = new Drupal.CohesionResponsiveBreakpoints(drupalSettings.cohesion.responsive_grid_settings);

      var $at = $('.coh-accordion-tabs > .coh-accordion-tabs-inner', context);

      function matchHeights(elements, remove) {
        return $(elements).matchHeight({
          byRow: false,
          remove: remove
        });
      }

      /**
       * Callback when the tabs initially load
       * @param {type} e
       * @param {type} tabs
       * @returns {undefined}
       */
      function tabsLoad(e, tabs) {
        getTabSettings(tabs);
      }

      /**
       * Callback when the tabs have been manually refreshed - normally ajax
       * @param {type} e
       * @param {type} tabs
       * @returns {undefined}
       */
      function tabsRefresh(e, tabs) {

        var opts = tabs.options;

        // Match the heights of the content
        if (typeof opts.contentMatchHeight !== 'undefined') {
          matchHeights(tabs.tabs.panels, opts.contentMatchHeight === true ? false : true);
        }

        // Match the heights of the lid
        if (typeof opts.tabsMatchHeight !== 'undefined') {
          matchHeights(tabs.tabs.tabItemAnchors, opts.tabsMatchHeight === true ? false : true);
        }

        getTabSettings(tabs);
      }

      /**
       * Callback when the tabs change state
       * @param {type} e
       * @param {type} tabs
       * @returns {undefined}
       */
      function tabsStateChange(e, tabs) {

        var opts = tabs.tabs.options;

        // Match the heights of the content
        if (typeof opts.contentMatchHeight !== 'undefined') {
          matchHeights(tabs.tabs.panels, opts.contentMatchHeight === true ? false : true);
        }

        // Match the heights of the lid
        if (typeof opts.tabsMatchHeight !== 'undefined') {
          matchHeights(tabs.tabs.tabItemAnchors, opts.tabsMatchHeight === true ? false : true);
        }
      }

      /**
       * Callback when switching between tabs and will return the activated tab object
       * @param {type} e
       * @param {type} tab
       * @returns {undefined}
       */
      function tabsActivate(e, tab) {

        // Update Drupal behaviors
        for (var i = 0; i < tab.panel.length; i++) {
          Drupal.attachBehaviors(tab.panel[i]);
        }
      }

      /**
       * Callback function to update settings when a breakpoint changes
       * @param {type} settings
       * @returns {undefined}
       */
      function updateSettings(settings) {

        var key = settings.cohesion.key;
        settings = settings.cohesion.settings;

        settings.$element.responsiveTabs(settings.breakpoints[key]);

        // Update the settings for each of the tabs
        for (var i = 0; i < settings.act.tabs.length; i++) {
          if (settings.act.tabs[i].hide !== false) {
            $(settings.act.tabs[i].accordionTab).toggleClass('is-hidden', settings.act.tabs[i].hide[key]);
            $(settings.act.tabs[i].tab).toggleClass('is-hidden', settings.act.tabs[i].hide[key]);
          }
        }
      }

      /**
       *
       * @param {type} settings
       * @param {type} key
       * @returns {undefined}
       */
      function manageSettings(settings, key) {

        // Handle non-breakpointed settings (these are passed to the breakpointed settings)
        // setHash
        if (typeof settings.setHash !== 'undefined') {
          settings.styles[key].setHash = settings.setHash;

          // Set the behavior when accordion view to autoscroll if a hash is selected
          if(settings.styles[key].accordionOrTab === 'accordion') {
            settings.styles[key].scrollToAccordionOnLoad = true;
          }
        }

        // scrollToAccordion
        if (typeof settings.scrollToAccordion !== 'undefined') {
          settings.styles[key].scrollToAccordion = settings.scrollToAccordion;
        }

        // scrollToAccordionOffsetClass
        if (typeof settings.scrollToAccordionOffsetClass !== 'undefined' && typeof settings.offsetPositionAgainst !== 'undefined' && settings.offsetPositionAgainst === 'class') {

          var offsetClass = settings.scrollToAccordionOffsetClass.match(/^[.]/) ? settings.scrollToAccordionOffsetClass : '.' + settings.scrollToAccordionOffsetClass;

          settings.styles[key].scrollToAccordionOffset = $(offsetClass).outerHeight(true);
        }

        // Handle breakpointed settings
        var breakpoint = settings.styles[key];

        // The active property on the form is from 1 but the plugin expect it to be from 0 so -1 to it
        if (typeof breakpoint.active !== 'undefined') {
          settings.styles[key].active = (parseInt(breakpoint.active) - 1).toString();
        }

        // Handle a custom animation speed
        if (typeof breakpoint.duration !== 'undefined' && typeof breakpoint.durationMs !== 'undefined' && breakpoint.duration === 'custom') {
          settings.styles[key].duration = parseInt(breakpoint.durationMs);
        } else if (typeof breakpoint.duration !== 'undefined' && breakpoint.duration !== 'custom') {
          //ensure duration is a number
          settings.styles[key].duration = parseInt(breakpoint.duration);
        }
        return settings;
      }

      /**
       * Get the default and breakpointed settings
       * @param {type} $el
       * @param {type} settings
       * @returns {unresolved}
       */
      function getSettings($el, settings) {

        // Set the defaults
        var defaults = {

          classes: {
            stateDefault: '',
            stateActive: 'is-active',
            stateDisabled: 'is-disabled',
            stateExcluded: 'is-excluded',
            container: '',
            ul: '',
            tab: '',
            anchor: '',
            panel: '',
            accordionTitle: 'coh-accordion-title',
            stateTypePrefix: 'coh-accordion-tabs-display'
          }
        };

        settings.breakpoints = {};
        settings.$element = $el;

        // Manage the settings

        // Update the settings prior to attaching the listeners
        for (var i = 0; i < cmm.breakpoints.length; i++) {

          var key = cmm.breakpoints[i].key;

          // Populate all breakpoints regardless of whether the settings are set or not to simulate inheritance
          settings.breakpoints[key] = {};

          $.extend(settings.breakpoints[key], defaults);

          if (typeof settings.styles[key] === 'object') {

            // Some settings need to be manually updated
            settings = manageSettings(settings, key);

            $.extend(settings.breakpoints[key], settings.styles[key]);
            $.extend(defaults, settings.styles[key]);
          }

          if(typeof settings.breakpoints[key].animation !== 'undefined')  {

            switch(settings.breakpoints[key].animation) {
              case 'slide':
                settings.breakpoints[key].animationQueue = false;
                break;
              case 'fade':
                settings.breakpoints[key].animationQueue = true;
                break;
              default:
                settings.breakpoints[key].animationQueue = true;
                break;
            }
          }
        }

        return settings;
      }

      /**
       * Get the settings for each tab
       * @param {type} tabs
       * @returns {undefined}
       */
      function getTabSettings(tabs) {

        // Manage tabs responsive settings
        for (var i = 0; i < tabs.tabs.length; i++) {

          // Visibility settings
          var previous, key;
          if (tabs.tabs[i].hide !== false && typeof tabs.tabs[i].hide === 'object') {

            for (var c = 0; c < cmm.breakpoints.length; c++) {

              key = cmm.breakpoints[c].key;

              if (typeof tabs.tabs[i].hide[key] === 'undefined') {
                tabs.tabs[i].hide[key] = previous;
              }
              previous = tabs.tabs[i].hide[key];
            }
          }
        }
      }

      /**
       * Initialise each instance of Accordion tabs
       */
      $.each($at, function (i, e) {

        var $this = $(e);

        var $onecd = once.filter(onceTabs, $this);

        // Has been initialised previously (must be checked first otherwise it gets bound next)
        once.filter(onceTabs, $this).forEach(function (e, i) {

          var $f = $(e);

          // Refresh the tabs and the settings to makesure it's upto date with all the latest tabs etc
          $f.responsiveTabs('refresh');
        });

        // No need to do anything after this as we only want to refresh ^^
        if($onecd.length > 0) {
          return true;
        }

        // Init the tabs
        var settings = getSettings($this, $this.data('cohAccordion'));

        // Bind the custom events
        $this.on('tabs-load', tabsLoad);
        $this.on('tabs-refresh', tabsRefresh);
        $this.on('tabs-activate-state', tabsStateChange);
        $this.on('tabs-activate', tabsActivate);

        $(once(onceTabs, $this)).responsiveTabs(settings.breakpoints[cmm.getCurrentBreakpoint().key]);

        // Pass the object for the Accordion tabs to the callback settings
        settings.act = $.data(this, 'responsivetabs');

        cmm.addListeners(settings, updateSettings);
      });
    }
  };

})(jQuery, Drupal, once, drupalSettings);
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
