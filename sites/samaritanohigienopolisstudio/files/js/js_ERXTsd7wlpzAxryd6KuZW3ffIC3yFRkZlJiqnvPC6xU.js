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
/*!
@sitestudioexcludesonar
     _ _      _       _
 ___| (_) ___| | __  (_)___
/ __| | |/ __| |/ /  | / __|
\__ \ | | (__|   < _ | \__ \
|___/_|_|\___|_|\_(_)/ |___/
                   |__/

 Version: 1.9.0
  Author: Ken Wheeler
 Website: http://kenwheeler.github.io
    Docs: http://kenwheeler.github.io/slick
    Repo: http://github.com/kenwheeler/slick
  Issues: http://github.com/kenwheeler/slick/issues
  Forked to: https://github.com/cohesiondx8/slick

 */
/* global window, document, define, jQuery, setInterval, clearInterval */
;(function(factory) {
  'use strict';
  if (typeof define === 'function' && define.amd) {
    define(['jquery'], factory);
  } else if (typeof exports !== 'undefined') {
    module.exports = factory(require('jquery'));
  } else {
    factory(jQuery);
  }

}(function($) {
  'use strict';
  var Slick = window.Slick || {};

  Slick = (function() {

    var instanceUid = 0;

    function Slick(element, settings) {

      var _ = this, dataSettings;

      _.defaults = {
        accessibility: true,
        adaptiveHeight: false,
        appendArrows: $(element),
        appendDots: $(element),
        arrows: true,
        asNavFor: null,
        playpauseButton: '',
        prevArrow: '<button class="slick-prev" aria-label="Previous" type="button">Previous</button>',
        nextArrow: '<button class="slick-next" aria-label="Next" type="button">Next</button>',
        autoplay: false,
        autoplaySpeed: 3000,
        centerMode: false,
        centerPadding: '50px',
        cssEase: 'ease',
        customPaging: function(slider, i) {
          return $('<button type="button" />').text(i + 1);
        },
        dots: false,
        dotsClass: 'slick-dots',
        draggable: true,
        easing: 'linear',
        edgeFriction: 0.35,
        fade: false,
        focusOnSelect: false,
        focusOnChange: false,
        infinite: true,
        initialSlide: 0,
        keyboardNavigation: true,
        lazyLoad: 'ondemand',
        mobileFirst: false,
        pauseOnHover: true,
        pauseOnFocus: true,
        pauseOnDotsHover: false,
        respondTo: 'window',
        responsive: null,
        rows: 1,
        rtl: false,
        slide: '',
        slidesPerRow: 1,
        slidesToShow: 1,
        slidesToScroll: 1,
        speed: 500,
        swipe: true,
        swipeToSlide: false,
        touchMove: true,
        touchThreshold: 5,
        useCSS: true,
        useTransform: true,
        variableWidth: false,
        vertical: false,
        verticalSwiping: false,
        waitForAnimate: true,
        zIndex: 1000
      };

      _.initials = {
        animating: false,
        dragging: false,
        autoPlayTimer: null,
        currentDirection: 0,
        currentLeft: null,
        currentSlide: 0,
        direction: 1,
        $dots: null,
        listWidth: null,
        listHeight: null,
        loadIndex: 0,
        $nextArrow: null,
        $prevArrow: null,
        scrolling: false,
        slideCount: null,
        slideWidth: null,
        $slideTrack: null,
        $playpauseButton: null,
        $playpausePlayIcon: null,
        $playpausePauseIcon: null,
        $playpausePlayLabel: null,
        $playpausePauseLabel: null,
        $slides: null,
        sliding: false,
        slideOffset: 0,
        swipeLeft: null,
        swiping: false,
        $list: null,
        touchObject: {},
        transformsEnabled: false,
        unslicked: false
      };

      $.extend(_, _.initials);

      _.activeBreakpoint = null;
      _.animType = null;
      _.animProp = null;
      _.breakpoints = [];
      _.breakpointSettings = [];
      _.cssTransitions = false;
      _.focussed = false;
      _.interrupted = false;
      _.hidden = 'hidden';
      _.paused = false;
      _.pausedByUser = false;
      _.positionProp = null;
      _.respondTo = null;
      _.rowCount = 1;
      _.shouldClick = true;
      _.$slider = $(element);
      _.$slidesCache = null;
      _.transformType = null;
      _.transitionType = null;
      _.visibilityChange = 'visibilitychange';
      _.windowWidth = 0;
      _.windowTimer = null;

      dataSettings = $(element).data('slick') || {};

      _.options = $.extend({}, _.defaults, settings, dataSettings);

      _.currentSlide = _.options.initialSlide;

      _.originalSettings = _.options;

      if (typeof document.mozHidden !== 'undefined') {
        _.hidden = 'mozHidden';
        _.visibilityChange = 'mozvisibilitychange';
      } else if (typeof document.webkitHidden !== 'undefined') {
        _.hidden = 'webkitHidden';
        _.visibilityChange = 'webkitvisibilitychange';
      }

      _.autoPlay = $.proxy(_.autoPlay, _);
      _.autoPlayClear = $.proxy(_.autoPlayClear, _);
      _.autoPlayIterator = $.proxy(_.autoPlayIterator, _);
      _.changeSlide = $.proxy(_.changeSlide, _);
      _.clickHandler = $.proxy(_.clickHandler, _);
      _.selectHandler = $.proxy(_.selectHandler, _);
      _.setPosition = $.proxy(_.setPosition, _);
      _.swipeHandler = $.proxy(_.swipeHandler, _);
      _.dragHandler = $.proxy(_.dragHandler, _);
      _.keyHandler = $.proxy(_.keyHandler, _);
      _.playpauseToggleHandler = $.proxy(_.playpauseToggleHandler, _);

      _.instanceUid = instanceUid++;

      // A simple way to check for HTML strings
      // Strict HTML recognition (must start with <)
      // Extracted from jQuery v1.11 source
      _.htmlExpr = /^(?:\s*(<[\w\W]+>)[^>]*)$/;


      _.registerBreakpoints();
      _.init(true);
    }

    return Slick;

  }());

  Slick.prototype.activateADA = function() {
    var _ = this;

    _.$slideTrack.find('.slick-active').attr({
      'aria-hidden': 'false',
      'tabindex': 0
    }).find('a, input, button, select').attr({
      'tabindex': '0'
    });

  };

  Slick.prototype.addSlide = Slick.prototype.slickAdd = function(markup, index, addBefore) {

    var _ = this;

    if (typeof(index) === 'boolean') {
      addBefore = index;
      index = null;
    } else if (index < 0 || (index >= _.slideCount)) {
      return false;
    }

    _.unload();

    if (typeof(index) === 'number') {
      if (index === 0 && _.$slides.length === 0) {
        $(markup).appendTo(_.$slideTrack);
      } else if (addBefore) {
        $(markup).insertBefore(_.$slides.eq(index));
      } else {
        $(markup).insertAfter(_.$slides.eq(index));
      }
    } else {
      if (addBefore === true) {
        $(markup).prependTo(_.$slideTrack);
      } else {
        $(markup).appendTo(_.$slideTrack);
      }
    }

    _.$slides = _.$slideTrack.children(this.options.slide);

    _.$slideTrack.children(this.options.slide).detach();

    _.$slideTrack.append(_.$slides);

    _.$slides.each(function(index, element) {
      $(element).attr('data-slick-index', index);
    });

    _.$slidesCache = _.$slides;

    _.reinit();

  };

  Slick.prototype.animateHeight = function() {
    var _ = this;
    if (_.options.slidesToShow === 1 && _.options.adaptiveHeight === true && _.options.vertical === false) {
      var targetHeight = _.$slides.eq(_.currentSlide).outerHeight(true);
      _.$list.animate({
        height: targetHeight
      }, _.options.speed);
    }
  };

  Slick.prototype.animateSlide = function(targetLeft, callback) {

    var animProps = {},
      _ = this;

    _.animateHeight();

    if (_.options.rtl === true && _.options.vertical === false) {
      targetLeft = -targetLeft;
    }
    if (_.transformsEnabled === false) {
      if (_.options.vertical === false) {
        _.$slideTrack.animate({
          left: targetLeft
        }, _.options.speed, _.options.easing, callback);
      } else {
        _.$slideTrack.animate({
          top: targetLeft
        }, _.options.speed, _.options.easing, callback);
      }

    } else {

      if (_.cssTransitions === false) {
        if (_.options.rtl === true) {
          _.currentLeft = -(_.currentLeft);
        }
        $({
          animStart: _.currentLeft
        }).animate({
          animStart: targetLeft
        }, {
          duration: _.options.speed,
          easing: _.options.easing,
          step: function(now) {
            now = Math.ceil(now);
            if (_.options.vertical === false) {
              animProps[_.animType] = 'translate(' +
                                now + 'px, 0px)';
              _.$slideTrack.css(animProps);
            } else {
              animProps[_.animType] = 'translate(0px,' +
                                now + 'px)';
              _.$slideTrack.css(animProps);
            }
          },
          complete: function() {
            if (callback) {
              callback.call();
            }
          }
        });

      } else {

        _.applyTransition();
        targetLeft = Math.ceil(targetLeft);

        if (_.options.vertical === false) {
          animProps[_.animType] = 'translate3d(' + targetLeft + 'px, 0px, 0px)';
        } else {
          animProps[_.animType] = 'translate3d(0px,' + targetLeft + 'px, 0px)';
        }
        _.$slideTrack.css(animProps);

        if (callback) {
          setTimeout(function() {

            _.disableTransition();

            callback.call();
          }, _.options.speed);
        }

      }

    }

  };

  Slick.prototype.getNavTarget = function() {

    var _ = this,
      asNavFor = _.options.asNavFor;

    if ( asNavFor && asNavFor !== null ) {
      asNavFor = $(asNavFor).not(_.$slider);
    }

    return asNavFor;

  };

  Slick.prototype.asNavFor = function(index) {

    var _ = this,
      asNavFor = _.getNavTarget();

    if ( asNavFor !== null && typeof asNavFor === 'object' ) {
      asNavFor.each(function() {
        var target = $(this).slick('getSlick');
        if(!target.unslicked) {
          target.slideHandler(index, true);
        }
      });
    }

  };

  Slick.prototype.applyTransition = function(slide) {

    var _ = this,
      transition = {};

    if (_.options.fade === false) {
      transition[_.transitionType] = _.transformType + ' ' + _.options.speed + 'ms ' + _.options.cssEase;
    } else {
      transition[_.transitionType] = 'opacity ' + _.options.speed + 'ms ' + _.options.cssEase;
    }

    if (_.options.fade === false) {
      _.$slideTrack.css(transition);
    } else {
      _.$slides.eq(slide).css(transition);
    }

  };

  Slick.prototype.autoPlay = function() {

    var _ = this;

    _.autoPlayClear();

    if ( _.slideCount > _.options.slidesToShow ) {
      _.autoPlayTimer = setInterval( _.autoPlayIterator, _.options.autoplaySpeed );
    }

  };

  Slick.prototype.autoPlayClear = function() {

    var _ = this;

    if (_.autoPlayTimer) {
      clearInterval(_.autoPlayTimer);
    }

  };

  Slick.prototype.autoPlayIterator = function() {

    var _ = this,
      slideTo = _.currentSlide + _.options.slidesToScroll;

    if ( !_.paused && !_.interrupted && !_.focussed ) {

      if ( _.options.infinite === false ) {

        if ( _.direction === 1 && ( _.currentSlide + 1 ) === ( _.slideCount - 1 )) {
          _.direction = 0;
        }

        else if ( _.direction === 0 ) {

          slideTo = _.currentSlide - _.options.slidesToScroll;

          if ( _.currentSlide - 1 === 0 ) {
            _.direction = 1;
          }

        }

      }

      _.slideHandler( slideTo );

    }

  };

  Slick.prototype.playpauseToggleHandler = function(event) {

    var _ = this;
    var paused = _.paused;

    _.$playpausePauseIcon.css('display', paused ? '' : 'none');
    _.$playpausePlayIcon.css('display', !paused ? '' : 'none');
    _.$playpausePauseLabel.css('display', paused ? '' : 'none');
    _.$playpausePlayLabel.css('display', !paused ? '' : 'none');

    if(paused) {

      _.pausedByUser = false;

      _.slickPlay();

    } else {

      _.pausedByUser = true;

      _.slickPause();
    }
  };

  Slick.prototype.buildArrows = function() {

    var _ = this;

    if (_.options.arrows === true ) {

      _.$prevArrow = $(_.options.prevArrow).addClass('slick-arrow');
      _.$nextArrow = $(_.options.nextArrow).addClass('slick-arrow');

      if( _.slideCount > _.options.slidesToShow ) {

        _.$prevArrow.removeClass('slick-hidden').removeAttr('aria-hidden tabindex');
        _.$nextArrow.removeClass('slick-hidden').removeAttr('aria-hidden tabindex');

        if (_.htmlExpr.test(_.options.prevArrow)) {
          _.options.rtl === true ? _.$prevArrow.appendTo(_.options.appendArrows) : _.$prevArrow.prependTo(_.options.appendArrows);
        }

        if (_.htmlExpr.test(_.options.nextArrow)) {
          _.options.rtl === true ? _.$nextArrow.prependTo(_.options.appendArrows) : _.$nextArrow.appendTo(_.options.appendArrows);
        }

        if (_.options.infinite !== true) {
          _.$prevArrow
            .addClass('slick-disabled')
            .attr('disabled', true);
        }

      } else {

        _.$prevArrow.add( _.$nextArrow )
          .addClass('slick-hidden')
          .attr({
            'disabled': true,
            'tabindex': '-1'
          });

      }

    }

  };

  Slick.prototype.buildDots = function() {

    var _ = this,
      i, dot;

    if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {

      _.$slider.addClass('slick-dotted');

      dot = $('<ul />').addClass(_.options.dotsClass);

      for (i = 0; i <= _.getDotCount(); i += 1) {
        dot.append($('<li />').append(_.options.customPaging.call(this, _, i)));
      }

      _.$dots = dot.appendTo(_.options.appendDots);

      _.$dots.find('li').first().addClass('slick-active');

    }

  };


  Slick.prototype.buildPlaypause = function() {
    var _ = this;

    var paused = _.paused;

    if (_.options.autoplay && _.options.showPlaypause) {
      _.$playpauseButton = $(_.options.playpauseButton);
      _.$playpausePlayIcon = $('.slick-play-icon', _.$playpauseButton).css('display', (paused !== true) ? 'none' : '');
      _.$playpausePauseIcon = $('.slick-pause-icon', _.$playpauseButton).css('display', (paused === true) ? 'none' : '');
      _.$playpausePlayLabel = $('.slick-play-text', _.$playpauseButton).css('display', paused ? 'none' : '');
      _.$playpausePauseLabel = $('.slick-pause-text', _.$playpauseButton).css('display', !paused ? 'none' : '');

      _.$playpauseButton.appendTo(_.options.appendPlaypause);
    }
  };

  Slick.prototype.buildOut = function() {

    var _ = this;

    _.$slides =
            _.$slider
              .children( _.options.slide + ':not(.slick-cloned)')
              .addClass('slick-slide');

    _.slideCount = _.$slides.length;

    _.$slides.each(function(index, element) {
      $(element)
        .attr('data-slick-index', index)
        .data('originalStyling', $(element).attr('style') || '')
        .attr('role', 'group')
        .attr('aria-label', 'slide ' + (index + 1));
    });

    _.$slider.addClass('slick-slider');

    _.$slideTrack = (_.slideCount === 0) ?
      $('<div class="slick-track"/>').appendTo(_.$slider) :
      _.$slides.wrapAll('<div class="slick-track"/>').parent();

    _.$list = _.$slideTrack.wrap(
      '<div class="slick-list"/>').parent();
    _.$slideTrack.css('opacity', 0);

    if (_.options.centerMode === true || _.options.swipeToSlide === true) {
      _.options.slidesToScroll = 1;
    }

    $('img[data-lazy]', _.$slider).not('[src]').addClass('slick-loading');

    _.setupInfinite();

    _.buildArrows();

    _.buildDots();

    _.buildPlaypause();

    _.updateDots();

    _.setSlideClasses(typeof _.currentSlide === 'number' ? _.currentSlide : 0);

    if (_.options.draggable === true) {
      _.$list.addClass('draggable');
    }

  };

  Slick.prototype.buildRows = function() {

    var _ = this, a, b, c, newSlides, numOfSlides, originalSlides,slidesPerSection;

    newSlides = document.createDocumentFragment();
    originalSlides = _.$slider.children();

    if(_.options.rows > 0) {

      slidesPerSection = _.options.slidesPerRow * _.options.rows;
      numOfSlides = Math.ceil(
        originalSlides.length / slidesPerSection
      );

      for(a = 0; a < numOfSlides; a++){
        var slide = document.createElement('div');
        for(b = 0; b < _.options.rows; b++) {
          var row = document.createElement('div');
          for(c = 0; c < _.options.slidesPerRow; c++) {
            var target = (a * slidesPerSection + ((b * _.options.slidesPerRow) + c));
            if (originalSlides.get(target)) {
              row.appendChild(originalSlides.get(target));
            }
          }
          slide.appendChild(row);
        }
        newSlides.appendChild(slide);
      }

      _.$slider.empty().append(newSlides);
      _.$slider.children().children().children()
        .css({
          'width':(100 / _.options.slidesPerRow) + '%',
          'display': 'inline-block'
        });

    }

  };

  Slick.prototype.checkResponsive = function(initial, forceUpdate) {

    var _ = this,
      breakpoint, targetBreakpoint, respondToWidth, triggerBreakpoint = false;
    var sliderWidth = _.$slider.width();
    var windowWidth = window.innerWidth || $(window).width();

    if (_.respondTo === 'window') {
      respondToWidth = windowWidth;
    } else if (_.respondTo === 'slider') {
      respondToWidth = sliderWidth;
    } else if (_.respondTo === 'min') {
      respondToWidth = Math.min(windowWidth, sliderWidth);
    }

    if ( _.options.responsive &&
            _.options.responsive.length &&
            _.options.responsive !== null) {

      targetBreakpoint = null;

      for (breakpoint in _.breakpoints) {
        if (_.breakpoints.hasOwnProperty(breakpoint)) {
          if (_.originalSettings.mobileFirst === false) {
            if (respondToWidth < _.breakpoints[breakpoint]) {
              targetBreakpoint = _.breakpoints[breakpoint];
            }
          } else {
            if (respondToWidth > _.breakpoints[breakpoint]) {
              targetBreakpoint = _.breakpoints[breakpoint];
            }
          }
        }
      }

      if (targetBreakpoint !== null) {
        if (_.activeBreakpoint !== null) {
          if (targetBreakpoint !== _.activeBreakpoint || forceUpdate) {
            _.activeBreakpoint =
                            targetBreakpoint;
            if (_.breakpointSettings[targetBreakpoint] === 'unslick') {
              _.unslick(targetBreakpoint);
            } else {
              _.options = $.extend({}, _.originalSettings,
                _.breakpointSettings[
                  targetBreakpoint]);
              if (initial === true) {
                _.currentSlide = _.options.initialSlide;
              }
              _.refresh(initial);
            }
            triggerBreakpoint = targetBreakpoint;
          }
        } else {
          _.activeBreakpoint = targetBreakpoint;
          if (_.breakpointSettings[targetBreakpoint] === 'unslick') {
            _.unslick(targetBreakpoint);
          } else {
            _.options = $.extend({}, _.originalSettings,
              _.breakpointSettings[
                targetBreakpoint]);
            if (initial === true) {
              _.currentSlide = _.options.initialSlide;
            }
            _.refresh(initial);
          }
          triggerBreakpoint = targetBreakpoint;
        }
      } else {
        if (_.activeBreakpoint !== null) {
          _.activeBreakpoint = null;
          _.options = _.originalSettings;
          if (initial === true) {
            _.currentSlide = _.options.initialSlide;
          }
          _.refresh(initial);
          triggerBreakpoint = targetBreakpoint;
        }
      }

      // only trigger breakpoints during an actual break. not on initialize.
      if( !initial && triggerBreakpoint !== false ) {
        _.$slider.trigger('breakpoint', [_, triggerBreakpoint]);
      }
    }

  };

  Slick.prototype.changeSlide = function(event, dontAnimate) {

    var _ = this,
      $target = $(event.currentTarget),
      indexOffset, slideOffset, unevenOffset;

    // If target is a link, prevent default action.
    if($target.is('a')) {
      event.preventDefault();
    }

    // If target is not the <li> element (ie: a child), find the <li>.
    if(!$target.is('li')) {
      $target = $target.closest('li');
    }

    unevenOffset = (_.slideCount % _.options.slidesToScroll !== 0);
    indexOffset = unevenOffset ? 0 : (_.slideCount - _.currentSlide) % _.options.slidesToScroll;

    switch (event.data.message) {

      case 'previous':
        slideOffset = indexOffset === 0 ? _.options.slidesToScroll : _.options.slidesToShow - indexOffset;
        if (_.slideCount > _.options.slidesToShow) {
          _.slideHandler(_.currentSlide - slideOffset, false, dontAnimate);
        }
        break;

      case 'next':
        slideOffset = indexOffset === 0 ? _.options.slidesToScroll : indexOffset;
        if (_.slideCount > _.options.slidesToShow) {
          _.slideHandler(_.currentSlide + slideOffset, false, dontAnimate);
        }
        break;

      case 'index':
        var index = event.data.index === 0 ? 0 :
          event.data.index || $target.index() * _.options.slidesToScroll;

        _.slideHandler(_.checkNavigable(index), false, dontAnimate);
        $target.children().trigger('focus');
        break;

      default:
        return;
    }

  };

  Slick.prototype.checkNavigable = function(index) {

    var _ = this,
      navigables, prevNavigable;

    navigables = _.getNavigableIndexes();
    prevNavigable = 0;
    if (index > navigables[navigables.length - 1]) {
      index = navigables[navigables.length - 1];
    } else {
      for (var n in navigables) {
        if (index < navigables[n]) {
          index = prevNavigable;
          break;
        }
        prevNavigable = navigables[n];
      }
    }

    return index;
  };

  Slick.prototype.cleanUpEvents = function() {

    var _ = this;

    if(_.$playpauseButton !== null) {
      _.$playpauseButton.off('click.slick', _.playpauseToggleHandler);
    }

    if (_.options.dots && _.$dots !== null) {

      $('li', _.$dots)
        .off('click.slick', _.changeSlide)
        .off('mouseenter.slick', $.proxy(_.interrupt, _, true))
        .off('mouseleave.slick', $.proxy(_.interrupt, _, false));

      if (_.options.keyboardNavigation === true) {
        _.$dots.off('keydown.slick', _.keyHandler);
      }
    }

    _.$slider.off('focus.slick blur.slick');

    if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {
      _.$prevArrow && _.$prevArrow.off('click.slick', _.changeSlide);
      _.$nextArrow && _.$nextArrow.off('click.slick', _.changeSlide);

      if (_.options.keyboardNavigation === true) {
        _.$prevArrow && _.$prevArrow.off('keydown.slick', _.keyHandler);
        _.$nextArrow && _.$nextArrow.off('keydown.slick', _.keyHandler);
      }
    }

    _.$list.off('touchstart.slick mousedown.slick', _.swipeHandler);
    _.$list.off('touchmove.slick mousemove.slick', _.swipeHandler);
    _.$list.off('touchend.slick mouseup.slick', _.swipeHandler);
    _.$list.off('touchcancel.slick mouseleave.slick', _.swipeHandler);

    _.$list.off('click.slick', _.clickHandler);

    $(document).off(_.visibilityChange, _.visibility);

    _.cleanUpSlideEvents();

    if (_.options.keyboardNavigation === true) {
      _.$list.off('keydown.slick', _.keyHandler);
    }

    if (_.options.focusOnSelect === true) {
      $(_.$slideTrack).children().off('click.slick', _.selectHandler);
    }

    $(window).off('orientationchange.slick.slick-' + _.instanceUid, _.orientationChange);

    $(window).off('resize.slick.slick-' + _.instanceUid, _.resize);

    $('[draggable!=true]', _.$slideTrack).off('dragstart', _.preventDefault);

    $(window).off('load.slick.slick-' + _.instanceUid, _.setPosition);

  };

  Slick.prototype.cleanUpSlideEvents = function() {

    var _ = this;

    _.$list.off('mouseenter.slick', $.proxy(_.interrupt, _, true));
    _.$list.off('mouseleave.slick', $.proxy(_.interrupt, _, false));

  };

  Slick.prototype.cleanUpRows = function() {

    var _ = this, originalSlides;

    if(_.options.rows > 0) {
      originalSlides = _.$slides.children().children();
      originalSlides.removeAttr('style');
      _.$slider.empty().append(originalSlides);
    }

  };

  Slick.prototype.clickHandler = function(event) {

    var _ = this;

    if (_.shouldClick === false) {
      event.stopImmediatePropagation();
      event.stopPropagation();
      event.preventDefault();
    }

  };

  Slick.prototype.destroy = function(refresh) {

    var _ = this;

    _.autoPlayClear();

    _.touchObject = {};

    _.cleanUpEvents();

    $('.slick-cloned', _.$slider).detach();

    if(_.$playpauseButton !== null) {
      _.$playpauseButton.remove();
    }

    if (_.$dots) {
      _.$dots.remove();
    }

    if ( _.$prevArrow && _.$prevArrow.length ) {

      _.$prevArrow
        .removeClass('slick-disabled slick-arrow slick-hidden')
        .removeAttr('aria-hidden disabled tabindex')
        .css('display','')
        .remove();
    }

    if ( _.$nextArrow && _.$nextArrow.length ) {

      _.$nextArrow
        .removeClass('slick-disabled slick-arrow slick-hidden')
        .removeAttr('aria-hidden disabled tabindex')
        .css('display','')
        .remove();
    }


    if (_.$slides) {

      _.$slides
        .removeClass('slick-slide slick-active slick-center slick-visible slick-current')
        .removeAttr('aria-hidden')
        .removeAttr('data-slick-index')
        .each(function(){
          $(this).attr('style', $(this).data('originalStyling'));
        });

      _.$slideTrack.children(this.options.slide).detach();

      _.$slideTrack.detach();

      _.$list.detach();

      _.$slider.append(_.$slides);
    }

    _.cleanUpRows();

    _.$slider.removeClass('slick-slider');
    _.$slider.removeClass('slick-initialized');
    _.$slider.removeClass('slick-dotted');

    _.unslicked = true;

    if(!refresh) {
      _.$slider.trigger('destroy', [_]);
    }

  };

  Slick.prototype.disableTransition = function(slide) {

    var _ = this,
      transition = {};

    transition[_.transitionType] = '';

    if (_.options.fade === false) {
      _.$slideTrack.css(transition);
    } else {
      _.$slides.eq(slide).css(transition);
    }

  };

  Slick.prototype.fadeSlide = function(slideIndex, callback) {

    var _ = this;

    if (_.cssTransitions === false) {

      _.$slides.eq(slideIndex).css({
        zIndex: _.options.zIndex
      });

      _.$slides.eq(slideIndex).animate({
        opacity: 1
      }, _.options.speed, _.options.easing, callback);

    } else {

      _.applyTransition(slideIndex);

      _.$slides.eq(slideIndex).css({
        opacity: 1,
        zIndex: _.options.zIndex
      });

      if (callback) {
        setTimeout(function() {

          _.disableTransition(slideIndex);

          callback.call();
        }, _.options.speed);
      }

    }

  };

  Slick.prototype.fadeSlideOut = function(slideIndex) {

    var _ = this;

    if (_.cssTransitions === false) {

      _.$slides.eq(slideIndex).animate({
        opacity: 0,
        zIndex: _.options.zIndex - 2
      }, _.options.speed, _.options.easing);

    } else {

      _.applyTransition(slideIndex);

      _.$slides.eq(slideIndex).css({
        opacity: 0,
        zIndex: _.options.zIndex - 2
      });

    }

  };

  Slick.prototype.filterSlides = Slick.prototype.slickFilter = function(filter) {

    var _ = this;

    if (filter !== null) {

      _.$slidesCache = _.$slides;

      _.unload();

      _.$slideTrack.children(this.options.slide).detach();

      _.$slidesCache.filter(filter).appendTo(_.$slideTrack);

      _.reinit();

    }

  };

  Slick.prototype.focusHandler = function() {

    var _ = this;

    // If any child element receives focus within the slider we need to pause the autoplay
    _.$slider
      .off('focus.slick blur.slick')
      .on(
        'focus.slick',
        '*',
        function(event) {
          var $sf = $(this);

          setTimeout(function() {
            if( _.options.pauseOnFocus ) {
              if ($sf.is(':focus')) {
                _.focussed = true;
                _.autoPlay();
              }
            }
          }, 0);
        }
      ).on(
        'blur.slick',
        '*',
        function(event) {
          var $sf = $(this);

          // When a blur occurs on any elements within the slider we become unfocused
          if( _.options.pauseOnFocus ) {
            _.focussed = false;
            _.autoPlay();
          }
        }
      );
  };

  Slick.prototype.getCurrent = Slick.prototype.slickCurrentSlide = function() {

    var _ = this;
    return _.currentSlide;

  };

  Slick.prototype.getDotCount = function() {

    var _ = this;

    var breakPoint = 0;
    var counter = 0;
    var pagerQty = 0;

    if (_.options.infinite === true) {
      if (_.slideCount <= _.options.slidesToShow) {
        ++pagerQty;
      } else {
        while (breakPoint < _.slideCount) {
          ++pagerQty;
          breakPoint = counter + _.options.slidesToScroll;
          counter += _.options.slidesToScroll <= _.options.slidesToShow ? _.options.slidesToScroll : _.options.slidesToShow;
        }
      }
    } else if (_.options.centerMode === true) {
      pagerQty = _.slideCount;
    } else if(!_.options.asNavFor) {
      pagerQty = 1 + Math.ceil((_.slideCount - _.options.slidesToShow) / _.options.slidesToScroll);
    }else {
      while (breakPoint < _.slideCount) {
        ++pagerQty;
        breakPoint = counter + _.options.slidesToScroll;
        counter += _.options.slidesToScroll <= _.options.slidesToShow ? _.options.slidesToScroll : _.options.slidesToShow;
      }
    }

    return pagerQty - 1;

  };

  Slick.prototype.getLeft = function(slideIndex) {

    var _ = this,
      targetLeft,
      verticalHeight,
      verticalOffset = 0,
      targetSlide,
      coef;

    _.slideOffset = 0;
    verticalHeight = _.$slides.first().outerHeight(true);

    if (_.options.infinite === true) {
      if (_.slideCount > _.options.slidesToShow) {
        _.slideOffset = (_.slideWidth * _.options.slidesToShow) * -1;
        coef = -1

        if (_.options.vertical === true && _.options.centerMode === true) {
          if (_.options.slidesToShow === 2) {
            coef = -1.5;
          } else if (_.options.slidesToShow === 1) {
            coef = -2
          }
        }
        verticalOffset = (verticalHeight * _.options.slidesToShow) * coef;
      }
      if (_.slideCount % _.options.slidesToScroll !== 0) {
        if (slideIndex + _.options.slidesToScroll > _.slideCount && _.slideCount > _.options.slidesToShow) {
          if (slideIndex > _.slideCount) {
            _.slideOffset = ((_.options.slidesToShow - (slideIndex - _.slideCount)) * _.slideWidth) * -1;
            verticalOffset = ((_.options.slidesToShow - (slideIndex - _.slideCount)) * verticalHeight) * -1;
          } else {
            _.slideOffset = ((_.slideCount % _.options.slidesToScroll) * _.slideWidth) * -1;
            verticalOffset = ((_.slideCount % _.options.slidesToScroll) * verticalHeight) * -1;
          }
        }
      }
    } else {
      if (slideIndex + _.options.slidesToShow > _.slideCount) {
        _.slideOffset = ((slideIndex + _.options.slidesToShow) - _.slideCount) * _.slideWidth;
        verticalOffset = ((slideIndex + _.options.slidesToShow) - _.slideCount) * verticalHeight;
      }
    }

    if (_.slideCount <= _.options.slidesToShow) {
      _.slideOffset = 0;
      verticalOffset = 0;
    }

    if (_.options.centerMode === true && _.slideCount <= _.options.slidesToShow) {
      _.slideOffset = ((_.slideWidth * Math.floor(_.options.slidesToShow)) / 2) - ((_.slideWidth * _.slideCount) / 2);
    } else if (_.options.centerMode === true && _.options.infinite === true) {
      _.slideOffset += _.slideWidth * Math.floor(_.options.slidesToShow / 2) - _.slideWidth;
    } else if (_.options.centerMode === true) {
      _.slideOffset = 0;
      _.slideOffset += _.slideWidth * Math.floor(_.options.slidesToShow / 2);
    }

    if (_.options.vertical === false) {
      targetLeft = ((slideIndex * _.slideWidth) * -1) + _.slideOffset;
    } else {
      targetLeft = ((slideIndex * verticalHeight) * -1) + verticalOffset;
    }

    if (_.options.variableWidth === true) {

      if (_.slideCount <= _.options.slidesToShow || _.options.infinite === false) {
        targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex);
      } else {
        targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex + _.options.slidesToShow);
      }

      if (_.options.rtl === true) {
        if (targetSlide[0]) {
          targetLeft = (_.$slideTrack.width() - targetSlide[0].offsetLeft - targetSlide.width()) * -1;
        } else {
          targetLeft =  0;
        }
      } else {
        targetLeft = targetSlide[0] ? targetSlide[0].offsetLeft * -1 : 0;
      }

      if (_.options.centerMode === true) {
        if (_.slideCount <= _.options.slidesToShow || _.options.infinite === false) {
          targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex);
        } else {
          targetSlide = _.$slideTrack.children('.slick-slide').eq(slideIndex + _.options.slidesToShow + 1);
        }

        if (_.options.rtl === true) {
          if (targetSlide[0]) {
            targetLeft = (_.$slideTrack.width() - targetSlide[0].offsetLeft - targetSlide.width()) * -1;
          } else {
            targetLeft =  0;
          }
        } else {
          targetLeft = targetSlide[0] ? targetSlide[0].offsetLeft * -1 : 0;
        }

        targetLeft += (_.$list.width() - targetSlide.outerWidth()) / 2;
      }
    }

    return targetLeft;

  };

  Slick.prototype.getOption = Slick.prototype.slickGetOption = function(option) {

    var _ = this;

    return _.options[option];

  };

  Slick.prototype.getNavigableIndexes = function() {

    var _ = this,
      breakPoint = 0,
      counter = 0,
      indexes = [],
      max;

    if (_.options.infinite === false) {
      max = _.slideCount;
    } else {
      breakPoint = _.options.slidesToScroll * -1;
      counter = _.options.slidesToScroll * -1;
      max = _.slideCount * 2;
    }

    while (breakPoint < max) {
      indexes.push(breakPoint);
      breakPoint = counter + _.options.slidesToScroll;
      counter += _.options.slidesToScroll <= _.options.slidesToShow ? _.options.slidesToScroll : _.options.slidesToShow;
    }

    return indexes;

  };

  Slick.prototype.getSlick = function() {

    return this;

  };

  Slick.prototype.getSlideCount = function() {

    var _ = this,
      slidesTraversed, swipedSlide, swipeTarget, centerOffset;

    centerOffset = _.options.centerMode === true ? Math.floor(_.$list.width() / 2) : 0;
    swipeTarget = (_.swipeLeft * -1) + centerOffset;

    if (_.options.swipeToSlide === true) {

      _.$slideTrack.find('.slick-slide').each(function(index, slide) {

        var slideOuterWidth, slideOffset, slideRightBoundary;
        slideOuterWidth = $(slide).outerWidth();
        slideOffset = slide.offsetLeft;
        if (_.options.centerMode !== true) {
          slideOffset += (slideOuterWidth / 2);
        }

        slideRightBoundary = slideOffset + (slideOuterWidth);

        if (swipeTarget < slideRightBoundary) {
          swipedSlide = slide;
          return false;
        }
      });

      slidesTraversed = Math.abs($(swipedSlide).attr('data-slick-index') - _.currentSlide) || 1;

      return slidesTraversed;

    } else {
      return _.options.slidesToScroll;
    }

  };

  Slick.prototype.goTo = Slick.prototype.slickGoTo = function(slide, dontAnimate) {

    var _ = this;

    _.changeSlide({
      data: {
        message: 'index',
        index: parseInt(slide)
      }
    }, dontAnimate);

  };

  Slick.prototype.init = function(creation) {
    var _ = this;

    if (!$(_.$slider).hasClass('slick-initialized')) {

      $(_.$slider).addClass('slick-initialized');

      if(_.pausedByUser) {
        _.paused = true;
      }

      _.buildRows();
      _.buildOut();
      _.setProps();
      _.startLoad();
      _.loadSlider();
      _.initializeEvents();
      _.updateArrows();
      _.updateDots();
      _.checkResponsive(true);
      _.focusHandler();

    }

    if (creation) {
      _.$slider.trigger('init', [_]);
    }

    if (_.options.accessibility === true) {
      _.initADA();
    }

    if ( _.options.autoplay && !_.pausedByUser ) {
      _.paused = false;
      _.autoPlay();
    }

  };

  Slick.prototype.initADA = function() {
    var _ = this,
      numDotGroups = Math.ceil(_.slideCount / _.options.slidesToShow),
      tabControlIndexes = _.getNavigableIndexes().filter(function(val) {
        return (val >= 0) && (val < _.slideCount);
      });

    _.$slides.add(_.$slideTrack.find('.slick-cloned')).attr({
      'aria-hidden': 'true',
      'tabindex': '-1'
    }).find('a, input, button, select').attr({
      'tabindex': '-1'
    });

    if (_.$dots !== null) {
      _.$slides.not(_.$slideTrack.find('.slick-cloned')).each(function(i) {
        var slideControlIndex = tabControlIndexes.indexOf(i);

        $(this).attr({
          'id': 'slick-slide' + _.instanceUid + i
        });

        if (slideControlIndex !== -1) {
          var ariaButtonControl = 'slick-slide-control' + _.instanceUid + slideControlIndex
          if ($('#' + ariaButtonControl).length) {
            $(this).attr({
              'aria-describedby': ariaButtonControl
            });
          }
        }
      });

      _.$dots.find('li').each(function(i) {
        var mappedSlideIndex = tabControlIndexes[i];

        $(this).find('button').first().attr({
          'id': 'slick-slide-control' + _.instanceUid + i,
          'aria-controls': 'slick-slide' + _.instanceUid + mappedSlideIndex,
          'aria-label': (i + 1) + ' of ' + numDotGroups,
          'aria-selected': null
        });

      }).eq(_.currentSlide).find('button').attr({
        'aria-selected': 'true'
      }).end();
    }

    for (var i=_.currentSlide, max=i+_.options.slidesToShow; i < max; i++) {
      if (_.options.focusOnChange) {
        _.$slides.eq(i).attr({'tabindex': '0'});
      } else {
        _.$slides.eq(i).removeAttr('tabindex');
      }
    }

    _.activateADA();

  };

  Slick.prototype.initArrowEvents = function() {

    var _ = this;

    if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {
      _.$prevArrow
        .off('click.slick')
        .on('click.slick', {
          message: 'previous'
        }, _.changeSlide);
      _.$nextArrow
        .off('click.slick')
        .on('click.slick', {
          message: 'next'
        }, _.changeSlide);

      if (_.options.keyboardNavigation === true) {
        _.$prevArrow.on('keydown.slick', _.keyHandler);
        _.$nextArrow.on('keydown.slick', _.keyHandler);
      }
    }

  };

  Slick.prototype.initDotEvents = function() {

    var _ = this;

    if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {
      $('li', _.$dots).on('click.slick', {
        message: 'index'
      }, _.changeSlide);

      if (_.options.keyboardNavigation === true) {
        _.$dots.on('keydown.slick', _.keyHandler);
      }
    }

    if (_.options.dots === true && _.options.pauseOnDotsHover === true && _.slideCount > _.options.slidesToShow) {

      $('li', _.$dots)
        .on('mouseenter.slick', $.proxy(_.interrupt, _, true))
        .on('mouseleave.slick', $.proxy(_.interrupt, _, false));

    }

  };

  Slick.prototype.initAutoplayEvents = function() {

    var _ = this;

    if(_.$playpauseButton != null) {
      _.$playpauseButton.on('click.slick', _.playpauseToggleHandler);
    }
  };

  Slick.prototype.initSlideEvents = function() {

    var _ = this;

    if ( _.options.pauseOnHover ) {

      _.$list.on('mouseenter.slick', $.proxy(_.interrupt, _, true));
      _.$list.on('mouseleave.slick', $.proxy(_.interrupt, _, false));

    }

  };

  Slick.prototype.initializeEvents = function() {

    var _ = this;

    _.initArrowEvents();

    _.initDotEvents();
    _.initAutoplayEvents();
    _.initSlideEvents();

    _.$list.on('touchstart.slick mousedown.slick', {
      action: 'start'
    }, _.swipeHandler);
    _.$list.on('touchmove.slick mousemove.slick', {
      action: 'move'
    }, _.swipeHandler);
    _.$list.on('touchend.slick mouseup.slick', {
      action: 'end'
    }, _.swipeHandler);
    _.$list.on('touchcancel.slick mouseleave.slick', {
      action: 'end'
    }, _.swipeHandler);

    _.$list.on('click.slick', _.clickHandler);

    $(document).on(_.visibilityChange, $.proxy(_.visibility, _));

    if (_.options.keyboardNavigation === true) {
      _.$list.on('keydown.slick', _.keyHandler);
    }

    if (_.options.focusOnSelect === true) {
      $(_.$slideTrack).children().on('click.slick', _.selectHandler);
    }

    $(window).on('orientationchange.slick.slick-' + _.instanceUid, $.proxy(_.orientationChange, _));

    $(window).on('resize.slick.slick-' + _.instanceUid, $.proxy(_.resize, _));

    $('[draggable!=true]', _.$slideTrack).on('dragstart', _.preventDefault);

    $(window).on('load.slick.slick-' + _.instanceUid, _.setPosition);
    $(_.setPosition);

  };

  Slick.prototype.initUI = function() {

    var _ = this;

    if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {

      _.$prevArrow.show();
      _.$nextArrow.show();

    }

    if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {

      _.$dots.show();

    }

  };

  Slick.prototype.keyHandler = function(event) {

    var _ = this;

    function reFocus(direction) {

        if(direction === 'next' && _.$nextArrow) {
            _.$nextArrow.trigger('focus');
        } else if(direction === 'previous' && _.$prevArrow) {
            _.$prevArrow.trigger('focus');
        } else {
            _.$slides.filter('[tabindex="0"]').trigger('focus');
        }
    }

    //Dont slide if the cursor is inside the form fields and arrow keys are pressed
    if(!event.target.tagName.match('TEXTAREA|INPUT|SELECT')) {
      if (event.keyCode === 37 && _.options.keyboardNavigation === true) {
        _.changeSlide({
          data: {
            message: _.options.rtl === true ? 'next' :  'previous'
          }
        });
        reFocus(_.options.rtl === true ? 'next' :  'previous');
      } else if (event.keyCode === 39 && _.options.keyboardNavigation === true) {
        _.changeSlide({
          data: {
            message: _.options.rtl === true ? 'previous' : 'next'
          }
        });
        reFocus(_.options.rtl === true ? 'previous' : 'next');
      }
    }

  };

  Slick.prototype.lazyLoad = function() {

    var _ = this,
      loadRange, cloneRange, rangeStart, rangeEnd;

    function loadImages(imagesScope) {

      $('img[data-lazy]', imagesScope).each(function() {

        var image = $(this),
          imageSource = $(this).attr('data-lazy'),
          imageSrcSet = $(this).attr('data-srcset'),
          imageSizes  = $(this).attr('data-sizes') || _.$slider.attr('data-sizes'),
          imageToLoad = document.createElement('img');

        imageToLoad.onload = function() {

          image
            .animate({ opacity: 0 }, 100, function() {

              if (imageSrcSet) {
                image
                  .attr('srcset', imageSrcSet );

                if (imageSizes) {
                  image
                    .attr('sizes', imageSizes );
                }
              }

              image
                .attr('src', imageSource)
                .animate({ opacity: 1 }, 200, function() {
                  image
                    .removeAttr('data-lazy data-srcset data-sizes')
                    .removeClass('slick-loading');
                });
              _.$slider.trigger('lazyLoaded', [_, image, imageSource]);
            });

        };

        imageToLoad.onerror = function() {

          image
            .removeAttr( 'data-lazy' )
            .removeClass( 'slick-loading' )
            .addClass( 'slick-lazyload-error' );

          _.$slider.trigger('lazyLoadError', [ _, image, imageSource ]);

        };

        imageToLoad.src = imageSource;

      });

    }

    if (_.options.centerMode === true) {
      if (_.options.infinite === true) {
        rangeStart = _.currentSlide + (_.options.slidesToShow / 2 + 1);
        rangeEnd = rangeStart + _.options.slidesToShow + 2;
      } else {
        rangeStart = Math.max(0, _.currentSlide - (_.options.slidesToShow / 2 + 1));
        rangeEnd = 2 + (_.options.slidesToShow / 2 + 1) + _.currentSlide;
      }
    } else {
      rangeStart = _.options.infinite ? _.options.slidesToShow + _.currentSlide : _.currentSlide;
      rangeEnd = Math.ceil(rangeStart + _.options.slidesToShow);
      if (_.options.fade === true) {
        if (rangeStart > 0) rangeStart--;
        if (rangeEnd <= _.slideCount) rangeEnd++;
      }
    }

    loadRange = _.$slider.find('.slick-slide').slice(rangeStart, rangeEnd);

    if (_.options.lazyLoad === 'anticipated') {
      var prevSlide = rangeStart - 1,
        nextSlide = rangeEnd,
        $slides = _.$slider.find('.slick-slide');

      for (var i = 0; i < _.options.slidesToScroll; i++) {
        if (prevSlide < 0) prevSlide = _.slideCount - 1;
        loadRange = loadRange.add($slides.eq(prevSlide));
        loadRange = loadRange.add($slides.eq(nextSlide));
        prevSlide--;
        nextSlide++;
      }
    }

    loadImages(loadRange);

    if (_.slideCount <= _.options.slidesToShow) {
      cloneRange = _.$slider.find('.slick-slide');
      loadImages(cloneRange);
    } else
    if (_.currentSlide >= _.slideCount - _.options.slidesToShow) {
      cloneRange = _.$slider.find('.slick-cloned').slice(0, _.options.slidesToShow);
      loadImages(cloneRange);
    } else if (_.currentSlide === 0) {
      cloneRange = _.$slider.find('.slick-cloned').slice(_.options.slidesToShow * -1);
      loadImages(cloneRange);
    }

  };

  Slick.prototype.loadSlider = function() {

    var _ = this;

    _.setPosition();

    _.$slideTrack.css({
      opacity: 1
    });

    _.$slider.removeClass('slick-loading');

    _.initUI();

    if (_.options.lazyLoad === 'progressive') {
      _.progressiveLazyLoad();
    }

  };

  Slick.prototype.next = Slick.prototype.slickNext = function() {

    var _ = this;

    _.changeSlide({
      data: {
        message: 'next'
      }
    });

  };

  Slick.prototype.orientationChange = function() {

    var _ = this;

    _.checkResponsive();
    _.setPosition();

  };

  Slick.prototype.pause = Slick.prototype.slickPause = function() {

    var _ = this;

    _.autoPlayClear();
    _.paused = true;

  };

  Slick.prototype.play = Slick.prototype.slickPlay = function() {

    var _ = this;

    _.autoPlay();
    _.options.autoplay = true;
    _.paused = false;
    _.focussed = false;
    _.interrupted = false;

  };

  Slick.prototype.postSlide = function(index) {

    var _ = this;

    if( !_.unslicked ) {

      _.$slider.trigger('afterChange', [_, index]);

      _.animating = false;

      if (_.slideCount > _.options.slidesToShow) {
        _.setPosition();
      }

      _.swipeLeft = null;

      if ( _.options.autoplay ) {
        _.autoPlay();
      }

      if (_.options.accessibility === true) {
        _.initADA();

        if (_.options.focusOnChange) {
          var $currentSlide = $(_.$slides.get(_.currentSlide));
          $currentSlide.attr('tabindex', 0).focus();
        }
      }

    }

  };

  Slick.prototype.prev = Slick.prototype.slickPrev = function() {

    var _ = this;

    _.changeSlide({
      data: {
        message: 'previous'
      }
    });

  };

  Slick.prototype.preventDefault = function(event) {

    event.preventDefault();

  };

  Slick.prototype.progressiveLazyLoad = function( tryCount ) {

    tryCount = tryCount || 1;

    var _ = this,
      $imgsToLoad = $( 'img[data-lazy]', _.$slider ),
      image,
      imageSource,
      imageSrcSet,
      imageSizes,
      imageToLoad;

    if ( $imgsToLoad.length ) {

      image = $imgsToLoad.first();
      imageSource = image.attr('data-lazy');
      imageSrcSet = image.attr('data-srcset');
      imageSizes  = image.attr('data-sizes') || _.$slider.attr('data-sizes');
      imageToLoad = document.createElement('img');

      imageToLoad.onload = function() {

        if (imageSrcSet) {
          image
            .attr('srcset', imageSrcSet );

          if (imageSizes) {
            image
              .attr('sizes', imageSizes );
          }
        }

        image
          .attr( 'src', imageSource )
          .removeAttr('data-lazy data-srcset data-sizes')
          .removeClass('slick-loading');

        if ( _.options.adaptiveHeight === true ) {
          _.setPosition();
        }

        _.$slider.trigger('lazyLoaded', [ _, image, imageSource ]);
        _.progressiveLazyLoad();

      };

      imageToLoad.onerror = function() {

        if ( tryCount < 3 ) {

          /**
                     * try to load the image 3 times,
                     * leave a slight delay so we don't get
                     * servers blocking the request.
                     */
          setTimeout( function() {
            _.progressiveLazyLoad( tryCount + 1 );
          }, 500 );

        } else {

          image
            .removeAttr( 'data-lazy' )
            .removeClass( 'slick-loading' )
            .addClass( 'slick-lazyload-error' );

          _.$slider.trigger('lazyLoadError', [ _, image, imageSource ]);

          _.progressiveLazyLoad();

        }

      };

      imageToLoad.src = imageSource;

    } else {

      _.$slider.trigger('allImagesLoaded', [ _ ]);

    }

  };

  Slick.prototype.refresh = function( initializing ) {

    var _ = this, currentSlide, lastVisibleIndex;

    lastVisibleIndex = _.slideCount - _.options.slidesToShow;

    // in non-infinite sliders, we don't want to go past the
    // last visible index.
    if( !_.options.infinite && ( _.currentSlide > lastVisibleIndex )) {
      _.currentSlide = lastVisibleIndex;
    }

    // if less slides than to show, go to start.
    if ( _.slideCount <= _.options.slidesToShow ) {
      _.currentSlide = 0;

    }

    currentSlide = _.currentSlide;

    _.destroy(true);

    $.extend(_, _.initials, { currentSlide: currentSlide });

    _.init();

    if( !initializing ) {

      _.changeSlide({
        data: {
          message: 'index',
          index: currentSlide
        }
      }, false);

    }

  };

  Slick.prototype.registerBreakpoints = function() {

    var _ = this, breakpoint, currentBreakpoint, l,
      responsiveSettings = _.options.responsive || null;

    if ( $.type(responsiveSettings) === 'array' && responsiveSettings.length ) {

      _.respondTo = _.options.respondTo || 'window';

      for ( breakpoint in responsiveSettings ) {

        l = _.breakpoints.length-1;

        if (responsiveSettings.hasOwnProperty(breakpoint)) {
          currentBreakpoint = responsiveSettings[breakpoint].breakpoint;

          // loop through the breakpoints and cut out any existing
          // ones with the same breakpoint number, we don't want dupes.
          while( l >= 0 ) {
            if( _.breakpoints[l] && _.breakpoints[l] === currentBreakpoint ) {
              _.breakpoints.splice(l,1);
            }
            l--;
          }

          _.breakpoints.push(currentBreakpoint);
          _.breakpointSettings[currentBreakpoint] = responsiveSettings[breakpoint].settings;

        }

      }

      _.breakpoints.sort(function(a, b) {
        return ( _.options.mobileFirst ) ? a-b : b-a;
      });

    }

  };

  Slick.prototype.reinit = function() {
    var _ = this;

    _.$slides =
            _.$slideTrack
              .children(_.options.slide)
              .addClass('slick-slide');

    _.slideCount = _.$slides.length;

    if (_.currentSlide >= _.slideCount && _.currentSlide !== 0) {
      _.currentSlide = _.currentSlide - _.options.slidesToScroll;
    }

    if (_.slideCount <= _.options.slidesToShow) {
      _.currentSlide = 0;
    }

    _.registerBreakpoints();

    _.setProps();
    _.setupInfinite();
    _.buildArrows();
    _.updateArrows();
    _.initArrowEvents();
    _.buildDots();
    _.updateDots();
    _.initDotEvents();
    _.cleanUpSlideEvents();
    _.initSlideEvents();

    _.checkResponsive(false, true);

    if (_.options.focusOnSelect === true) {
      $(_.$slideTrack).children().on('click.slick', _.selectHandler);
    }

    _.setSlideClasses(typeof _.currentSlide === 'number' ? _.currentSlide : 0);

    _.setPosition();
    _.focusHandler();

    _.paused = !_.options.autoplay;
    _.autoPlay();

    _.$slider.trigger('reInit', [_]);

  };

  Slick.prototype.resize = function() {

    var _ = this;

    if ($(window).width() !== _.windowWidth) {
      clearTimeout(_.windowDelay);
      _.windowDelay = window.setTimeout(function() {
        _.windowWidth = $(window).width();
        _.checkResponsive();
        if( !_.unslicked ) { _.setPosition(); }
      }, 50);
    }
  };

  Slick.prototype.removeSlide = Slick.prototype.slickRemove = function(index, removeBefore, removeAll) {

    var _ = this;

    if (typeof(index) === 'boolean') {
      removeBefore = index;
      index = removeBefore === true ? 0 : _.slideCount - 1;
    } else {
      index = removeBefore === true ? --index : index;
    }

    if (_.slideCount < 1 || index < 0 || index > _.slideCount - 1) {
      return false;
    }

    _.unload();

    if (removeAll === true) {
      _.$slideTrack.children().remove();
    } else {
      _.$slideTrack.children(this.options.slide).eq(index).remove();
    }

    _.$slides = _.$slideTrack.children(this.options.slide);

    _.$slideTrack.children(this.options.slide).detach();

    _.$slideTrack.append(_.$slides);

    _.$slidesCache = _.$slides;

    _.reinit();

  };

  Slick.prototype.setCSS = function(position) {

    var _ = this,
      positionProps = {},
      x, y;

    if (_.options.rtl === true) {
      position = -position;
    }
    x = _.positionProp == 'left' ? Math.ceil(position) + 'px' : '0px';
    y = _.positionProp == 'top' ? Math.ceil(position) + 'px' : '0px';

    positionProps[_.positionProp] = position;

    if (_.transformsEnabled === false) {
      _.$slideTrack.css(positionProps);
    } else {
      positionProps = {};
      if (_.cssTransitions === false) {
        positionProps[_.animType] = 'translate(' + x + ', ' + y + ')';
        _.$slideTrack.css(positionProps);
      } else {
        positionProps[_.animType] = 'translate3d(' + x + ', ' + y + ', 0px)';
        _.$slideTrack.css(positionProps);
      }
    }

  };

  Slick.prototype.setDimensions = function() {

    var _ = this;

    if (_.options.vertical === false) {
      if (_.options.centerMode === true) {
        _.$list.css({
          padding: ('0px ' + _.options.centerPadding)
        });
      }
    } else {
      _.$list.height(_.$slides.first().outerHeight(true) * _.options.slidesToShow);
      if (_.options.centerMode === true) {
        _.$list.css({
          padding: (_.options.centerPadding + ' 0px')
        });
      }
    }

    _.listWidth = _.$list.width();
    _.listHeight = _.$list.height();


    if (_.options.vertical === false && _.options.variableWidth === false) {
      _.slideWidth = _.listWidth / _.options.slidesToShow;
      _.$slideTrack.width(Math.ceil((_.slideWidth * _.$slideTrack.children('.slick-slide').length)));

    } else if (_.options.variableWidth === true) {
      _.$slideTrack.width(5000 * _.slideCount);
    } else {
      _.slideWidth = Math.ceil(_.listWidth);
      _.$slideTrack.height(Math.ceil((_.$slides.first().outerHeight(true) * _.$slideTrack.children('.slick-slide').length)));
    }

    var offset = _.$slides.first().outerWidth(true) - _.$slides.first().width();
    if (_.options.variableWidth === false) _.$slideTrack.children('.slick-slide').width(_.slideWidth - offset);

  };

  Slick.prototype.setFade = function() {

    var _ = this,
      targetLeft;

    _.$slides.each(function(index, element) {
      targetLeft = (_.slideWidth * index) * -1;
      if (_.options.rtl === true) {
        $(element).css({
          position: 'relative',
          right: targetLeft,
          top: 0,
          zIndex: _.options.zIndex - 2,
          opacity: 0
        });
      } else {
        $(element).css({
          position: 'relative',
          left: targetLeft,
          top: 0,
          zIndex: _.options.zIndex - 2,
          opacity: 0
        });
      }
    });

    _.$slides.eq(_.currentSlide).css({
      zIndex: _.options.zIndex - 1,
      opacity: 1
    });

  };

  Slick.prototype.setHeight = function() {

    var _ = this;

    if (_.options.slidesToShow === 1 && _.options.adaptiveHeight === true && _.options.vertical === false) {
      var targetHeight = _.$slides.eq(_.currentSlide).outerHeight(true);
      _.$list.css('height', targetHeight);
    }

  };

  Slick.prototype.setOption =
        Slick.prototype.slickSetOption = function() {

          /**
             * accepts arguments in format of:
             *
             *  - for changing a single option's value:
             *     .slick("setOption", option, value, refresh )
             *
             *  - for changing a set of responsive options:
             *     .slick("setOption", 'responsive', [{}, ...], refresh )
             *
             *  - for updating multiple values at once (not responsive)
             *     .slick("setOption", { 'option': value, ... }, refresh )
             */

          var _ = this, l, item, option, value, refresh = false, type;

          if( $.type( arguments[0] ) === 'object' ) {

            option =  arguments[0];
            refresh = arguments[1];
            type = 'multiple';

          } else if ( $.type( arguments[0] ) === 'string' ) {

            option =  arguments[0];
            value = arguments[1];
            refresh = arguments[2];

            if ( arguments[0] === 'responsive' && $.type( arguments[1] ) === 'array' ) {

              type = 'responsive';

            } else if ( typeof arguments[1] !== 'undefined' ) {

              type = 'single';

            }

          }

          if ( type === 'single' ) {

            _.options[option] = value;


          } else if ( type === 'multiple' ) {

            $.each( option , function( opt, val ) {

              _.options[opt] = val;

            });


          } else if ( type === 'responsive' ) {

            for ( item in value ) {

              if( $.type( _.options.responsive ) !== 'array' ) {

                _.options.responsive = [ value[item] ];

              } else {

                l = _.options.responsive.length-1;

                // loop through the responsive object and splice out duplicates.
                while( l >= 0 ) {

                  if( _.options.responsive[l].breakpoint === value[item].breakpoint ) {

                    _.options.responsive.splice(l,1);

                  }

                  l--;

                }

                _.options.responsive.push( value[item] );

              }

            }

          }

          if ( refresh ) {

            _.unload();
            _.reinit();

          }

        };

  Slick.prototype.setPosition = function() {

    var _ = this;

    _.setDimensions();

    _.setHeight();

    if (_.options.fade === false) {
      _.setCSS(_.getLeft(_.currentSlide));
    } else {
      _.setFade();
    }

    _.$slider.trigger('setPosition', [_]);

  };

  Slick.prototype.setProps = function() {

    var _ = this,
      bodyStyle = document.body.style;

    _.positionProp = _.options.vertical === true ? 'top' : 'left';

    if (_.positionProp === 'top') {
      _.$slider.addClass('slick-vertical');
    } else {
      _.$slider.removeClass('slick-vertical');
    }

    if (bodyStyle.WebkitTransition !== undefined ||
            bodyStyle.MozTransition !== undefined ||
            bodyStyle.msTransition !== undefined) {
      if (_.options.useCSS === true) {
        _.cssTransitions = true;
      }
    }

    if ( _.options.fade ) {
      if ( typeof _.options.zIndex === 'number' ) {
        if( _.options.zIndex < 3 ) {
          _.options.zIndex = 3;
        }
      } else {
        _.options.zIndex = _.defaults.zIndex;
      }
    }

    if (bodyStyle.OTransform !== undefined) {
      _.animType = 'OTransform';
      _.transformType = '-o-transform';
      _.transitionType = 'OTransition';
      if (bodyStyle.perspectiveProperty === undefined && bodyStyle.webkitPerspective === undefined) _.animType = false;
    }
    if (bodyStyle.MozTransform !== undefined) {
      _.animType = 'MozTransform';
      _.transformType = '-moz-transform';
      _.transitionType = 'MozTransition';
      if (bodyStyle.perspectiveProperty === undefined && bodyStyle.MozPerspective === undefined) _.animType = false;
    }
    if (bodyStyle.webkitTransform !== undefined) {
      _.animType = 'webkitTransform';
      _.transformType = '-webkit-transform';
      _.transitionType = 'webkitTransition';
      if (bodyStyle.perspectiveProperty === undefined && bodyStyle.webkitPerspective === undefined) _.animType = false;
    }
    if (bodyStyle.msTransform !== undefined) {
      _.animType = 'msTransform';
      _.transformType = '-ms-transform';
      _.transitionType = 'msTransition';
      if (bodyStyle.msTransform === undefined) _.animType = false;
    }
    if (bodyStyle.transform !== undefined && _.animType !== false) {
      _.animType = 'transform';
      _.transformType = 'transform';
      _.transitionType = 'transition';
    }
    _.transformsEnabled = _.options.useTransform && (_.animType !== null && _.animType !== false);
  };


  Slick.prototype.setSlideClasses = function(index) {

    var _ = this,
      centerOffset, allSlides, indexOffset, remainder;

    allSlides = _.$slider
      .find('.slick-slide')
      .removeClass('slick-active slick-center slick-current')
      .attr('aria-hidden', 'true')
      .attr('aria-label', function() {
        return $(this).attr('aria-label').replace(' (centered)', '');
      });

    _.$slides
      .eq(index)
      .addClass('slick-current');

    if (_.options.centerMode === true) {

      var evenCoef = _.options.slidesToShow % 2 === 0 ? 1 : 0;

      centerOffset = Math.floor(_.options.slidesToShow / 2);

      if (_.options.infinite === true) {

        if (index >= centerOffset && index <= (_.slideCount - 1) - centerOffset) {
          _.$slides
            .slice(index - centerOffset + evenCoef, index + centerOffset + 1)
            .addClass('slick-active')
            .attr('aria-hidden', 'false');

        } else {

          indexOffset = _.options.slidesToShow + index;
          allSlides
            .slice(indexOffset - centerOffset + 1 + evenCoef, indexOffset + centerOffset + 2)
            .addClass('slick-active')
            .attr('aria-hidden', 'false');

        }

        if (index === 0) {

          allSlides
            .eq(allSlides.length - 1 - _.options.slidesToShow)
            .addClass('slick-center')
            .attr('aria-label', function() {
              return $(this).attr('aria-label') + ' (centered)';
            });

        } else if (index === _.slideCount - 1) {

          allSlides
            .eq(_.options.slidesToShow)
            .addClass('slick-center')
            .attr('aria-label', function() {
              return $(this).attr('aria-label') + ' (centered)';
            });

        }

      }

      _.$slides
        .eq(index)
        .addClass('slick-center')
          .attr('aria-label', function() {
            return $(this).attr('aria-label') + ' (centered)';
          });

    } else {

      if (index >= 0 && index <= (_.slideCount - _.options.slidesToShow)) {

        _.$slides
          .slice(index, index + _.options.slidesToShow)
          .addClass('slick-active')
          .attr('aria-hidden', 'false');

      } else if (allSlides.length <= _.options.slidesToShow) {

        allSlides
          .addClass('slick-active')
          .attr('aria-hidden', 'false');

      } else {

        remainder = _.slideCount % _.options.slidesToShow;
        indexOffset = _.options.infinite === true ? _.options.slidesToShow + index : index;

        if (_.options.slidesToShow == _.options.slidesToScroll && (_.slideCount - index) < _.options.slidesToShow) {

          allSlides
            .slice(indexOffset - (_.options.slidesToShow - remainder), indexOffset + remainder)
            .addClass('slick-active')
            .attr('aria-hidden', 'false');

        } else {

          allSlides
            .slice(indexOffset, indexOffset + _.options.slidesToShow)
            .addClass('slick-active')
            .attr('aria-hidden', 'false');

        }

      }

    }

    if (_.options.lazyLoad === 'ondemand' || _.options.lazyLoad === 'anticipated') {
      _.lazyLoad();
    }
  };

  Slick.prototype.setupInfinite = function() {

    var _ = this,
      i, slideIndex, infiniteCount;

    if (_.options.fade === true) {
      _.options.centerMode = false;
    }

    if (_.options.infinite === true && _.options.fade === false) {

      slideIndex = null;

      if (_.slideCount > _.options.slidesToShow) {

        if (_.options.centerMode === true) {
          infiniteCount = _.options.slidesToShow + 1;
        } else {
          infiniteCount = _.options.slidesToShow;
        }

        for (i = _.slideCount; i > (_.slideCount -
                    infiniteCount); i -= 1) {
          slideIndex = i - 1;
          $(_.$slides[slideIndex]).clone(true).attr('id', '')
            .attr('data-slick-index', slideIndex - _.slideCount)
            .prependTo(_.$slideTrack).addClass('slick-cloned');
        }
        for (i = 0; i < infiniteCount  + _.slideCount; i += 1) {
          slideIndex = i;
          $(_.$slides[slideIndex]).clone(true).attr('id', '')
            .attr('data-slick-index', slideIndex + _.slideCount)
            .appendTo(_.$slideTrack).addClass('slick-cloned');
        }
        _.$slideTrack.find('.slick-cloned').find('[id]').each(function() {
          $(this).attr('id', '');
        });

      }

    }

  };

  Slick.prototype.interrupt = function( toggle ) {

    var _ = this;

    if( !toggle ) {
      _.autoPlay();
    }
    _.interrupted = toggle;

  };

  Slick.prototype.selectHandler = function(event) {

    var _ = this;

    var targetElement =
            $(event.target).is('.slick-slide') ?
              $(event.target) :
              $(event.target).parents('.slick-slide');

    var index = parseInt(targetElement.attr('data-slick-index'));

    if (!index) index = 0;

    if (_.slideCount <= _.options.slidesToShow) {

      _.slideHandler(index, false, true);
      return;

    }

    _.slideHandler(index);

  };

  Slick.prototype.slideHandler = function(index, sync, dontAnimate) {

    var targetSlide, animSlide, oldSlide, slideLeft, targetLeft = null,
      _ = this, navTarget;

    sync = sync || false;

    if (_.animating === true && _.options.waitForAnimate === true) {
      return;
    }

    if (_.options.fade === true && _.currentSlide === index) {
      return;
    }

    if (sync === false) {
      _.asNavFor(index);
    }

    targetSlide = index;
    targetLeft = _.getLeft(targetSlide);
    slideLeft = _.getLeft(_.currentSlide);

    _.currentLeft = _.swipeLeft === null ? slideLeft : _.swipeLeft;

    if (_.options.infinite === false && _.options.centerMode === false && (index < 0 || index > _.getDotCount() * _.options.slidesToScroll)) {
      if (_.options.fade === false) {
        targetSlide = _.currentSlide;
        if (dontAnimate !== true && _.slideCount > _.options.slidesToShow) {
          _.animateSlide(slideLeft, function() {
            _.postSlide(targetSlide);
          });
        } else {
          _.postSlide(targetSlide);
        }
      }
      return;
    } else if (_.options.infinite === false && _.options.centerMode === true && (index < 0 || index > (_.slideCount - _.options.slidesToScroll))) {
      if (_.options.fade === false) {
        targetSlide = _.currentSlide;
        if (dontAnimate !== true && _.slideCount > _.options.slidesToShow) {
          _.animateSlide(slideLeft, function() {
            _.postSlide(targetSlide);
          });
        } else {
          _.postSlide(targetSlide);
        }
      }
      return;
    }

    if ( _.options.autoplay ) {
      clearInterval(_.autoPlayTimer);
    }

    if (targetSlide < 0) {
      if (_.slideCount % _.options.slidesToScroll !== 0) {
        animSlide = _.slideCount - (_.slideCount % _.options.slidesToScroll);
      } else {
        animSlide = _.slideCount + targetSlide;
      }
    } else if (targetSlide >= _.slideCount) {
      if (_.slideCount % _.options.slidesToScroll !== 0) {
        animSlide = 0;
      } else {
        animSlide = targetSlide - _.slideCount;
      }
    } else {
      animSlide = targetSlide;
    }

    _.animating = true;

    _.$slider.trigger('beforeChange', [_, _.currentSlide, animSlide]);

    oldSlide = _.currentSlide;
    _.currentSlide = animSlide;

    _.setSlideClasses(_.currentSlide);

    if ( _.options.asNavFor ) {

      navTarget = _.getNavTarget();
      navTarget = navTarget.slick('getSlick');

      if ( navTarget.slideCount <= navTarget.options.slidesToShow ) {
        navTarget.setSlideClasses(_.currentSlide);
      }

    }

    _.updateDots();
    _.updateArrows();

    if (_.options.fade === true) {
      if (dontAnimate !== true) {

        _.fadeSlideOut(oldSlide);

        _.fadeSlide(animSlide, function() {
          _.postSlide(animSlide);
        });

      } else {
        _.postSlide(animSlide);
      }
      _.animateHeight();
      return;
    }

    if (dontAnimate !== true && _.slideCount > _.options.slidesToShow) {
      _.animateSlide(targetLeft, function() {
        _.postSlide(animSlide);
      });
    } else {
      _.postSlide(animSlide);
    }

  };

  Slick.prototype.startLoad = function() {

    var _ = this;

    if (_.options.arrows === true && _.slideCount > _.options.slidesToShow) {

      _.$prevArrow.hide();
      _.$nextArrow.hide();

    }

    if (_.options.dots === true && _.slideCount > _.options.slidesToShow) {

      _.$dots.hide();

    }

    _.$slider.addClass('slick-loading');

  };

  Slick.prototype.swipeDirection = function() {

    var xDist, yDist, r, swipeAngle, _ = this;

    xDist = _.touchObject.startX - _.touchObject.curX;
    yDist = _.touchObject.startY - _.touchObject.curY;
    r = Math.atan2(yDist, xDist);

    swipeAngle = Math.round(r * 180 / Math.PI);
    if (swipeAngle < 0) {
      swipeAngle = 360 - Math.abs(swipeAngle);
    }

    if ((swipeAngle <= 45) && (swipeAngle >= 0)) {
      return (_.options.rtl === false ? 'left' : 'right');
    }
    if ((swipeAngle <= 360) && (swipeAngle >= 315)) {
      return (_.options.rtl === false ? 'left' : 'right');
    }
    if ((swipeAngle >= 135) && (swipeAngle <= 225)) {
      return (_.options.rtl === false ? 'right' : 'left');
    }
    if (_.options.verticalSwiping === true) {
      if ((swipeAngle >= 35) && (swipeAngle <= 135)) {
        return 'down';
      } else {
        return 'up';
      }
    }

    return 'vertical';

  };

  Slick.prototype.swipeEnd = function(event) {

    var _ = this,
      slideCount,
      direction;

    _.dragging = false;
    _.swiping = false;

    if (_.scrolling) {
      _.scrolling = false;
      return false;
    }

    _.interrupted = false;
    _.shouldClick = ( _.touchObject.swipeLength > 10 ) ? false : true;

    if ( _.touchObject.curX === undefined ) {
      return false;
    }

    if ( _.touchObject.edgeHit === true ) {
      _.$slider.trigger('edge', [_, _.swipeDirection() ]);
    }

    if ( _.touchObject.swipeLength >= _.touchObject.minSwipe ) {

      direction = _.swipeDirection();

      switch ( direction ) {

        case 'left':
        case 'down':

          slideCount =
                        _.options.swipeToSlide ?
                          _.checkNavigable( _.currentSlide + _.getSlideCount() ) :
                          _.currentSlide + _.getSlideCount();

          _.currentDirection = 0;

          break;

        case 'right':
        case 'up':

          slideCount =
                        _.options.swipeToSlide ?
                          _.checkNavigable( _.currentSlide - _.getSlideCount() ) :
                          _.currentSlide - _.getSlideCount();

          _.currentDirection = 1;

          break;

        default:


      }

      if( direction != 'vertical' ) {

        _.slideHandler( slideCount );
        _.touchObject = {};
        _.$slider.trigger('swipe', [_, direction ]);

      }

    } else {

      if ( _.touchObject.startX !== _.touchObject.curX ) {

        _.slideHandler( _.currentSlide );
        _.touchObject = {};

      }

    }

  };

  Slick.prototype.swipeHandler = function(event) {

    var _ = this;

    if ((_.options.swipe === false) || ('ontouchend' in document && _.options.swipe === false)) {
      return;
    } else if (_.options.draggable === false && event.type.indexOf('mouse') !== -1) {
      return;
    }

    _.touchObject.fingerCount = event.originalEvent && event.originalEvent.touches !== undefined ?
      event.originalEvent.touches.length : 1;

    _.touchObject.minSwipe = _.listWidth / _.options
      .touchThreshold;

    if (_.options.verticalSwiping === true) {
      _.touchObject.minSwipe = _.listHeight / _.options
        .touchThreshold;
    }

    switch (event.data.action) {

      case 'start':
        _.swipeStart(event);
        break;

      case 'move':
        _.swipeMove(event);
        break;

      case 'end':
        _.swipeEnd(event);
        break;

    }

  };

  Slick.prototype.swipeMove = function(event) {

    var _ = this,
      edgeWasHit = false,
      curLeft, swipeDirection, swipeLength, positionOffset, touches, verticalSwipeLength;

    touches = event.originalEvent !== undefined ? event.originalEvent.touches : null;

    if (!_.dragging || _.scrolling || touches && touches.length !== 1) {
      return false;
    }

    curLeft = _.getLeft(_.currentSlide);

    _.touchObject.curX = touches !== undefined ? touches[0].pageX : event.clientX;
    _.touchObject.curY = touches !== undefined ? touches[0].pageY : event.clientY;

    _.touchObject.swipeLength = Math.round(Math.sqrt(
      Math.pow(_.touchObject.curX - _.touchObject.startX, 2)));

    verticalSwipeLength = Math.round(Math.sqrt(
      Math.pow(_.touchObject.curY - _.touchObject.startY, 2)));

    if (!_.options.verticalSwiping && !_.swiping && verticalSwipeLength > 4) {
      _.scrolling = true;
      return false;
    }

    if (_.options.verticalSwiping === true) {
      _.touchObject.swipeLength = verticalSwipeLength;
    }

    swipeDirection = _.swipeDirection();

    if (event.originalEvent !== undefined && _.touchObject.swipeLength > 4) {
      _.swiping = true;
      event.preventDefault();
    }

    positionOffset = (_.options.rtl === false ? 1 : -1) * (_.touchObject.curX > _.touchObject.startX ? 1 : -1);
    if (_.options.verticalSwiping === true) {
      positionOffset = _.touchObject.curY > _.touchObject.startY ? 1 : -1;
    }


    swipeLength = _.touchObject.swipeLength;

    _.touchObject.edgeHit = false;

    if (_.options.infinite === false) {
      if ((_.currentSlide === 0 && swipeDirection === 'right') || (_.currentSlide >= _.getDotCount() && swipeDirection === 'left')) {
        swipeLength = _.touchObject.swipeLength * _.options.edgeFriction;
        _.touchObject.edgeHit = true;
      }
    }

    if (_.options.vertical === false) {
      _.swipeLeft = curLeft + swipeLength * positionOffset;
    } else {
      _.swipeLeft = curLeft + (swipeLength * (_.$list.height() / _.listWidth)) * positionOffset;
    }
    if (_.options.verticalSwiping === true) {
      _.swipeLeft = curLeft + swipeLength * positionOffset;
    }

    if (_.options.fade === true || _.options.touchMove === false) {
      return false;
    }

    if (_.animating === true) {
      _.swipeLeft = null;
      return false;
    }

    _.setCSS(_.swipeLeft);

  };

  Slick.prototype.swipeStart = function(event) {

    var _ = this,
      touches;

    _.interrupted = true;

    if (_.touchObject.fingerCount !== 1 || _.slideCount <= _.options.slidesToShow) {
      _.touchObject = {};
      return false;
    }

    if (event.originalEvent !== undefined && event.originalEvent.touches !== undefined) {
      touches = event.originalEvent.touches[0];
    }

    _.touchObject.startX = _.touchObject.curX = touches !== undefined ? touches.pageX : event.clientX;
    _.touchObject.startY = _.touchObject.curY = touches !== undefined ? touches.pageY : event.clientY;

    _.dragging = true;

  };

  Slick.prototype.unfilterSlides = Slick.prototype.slickUnfilter = function() {

    var _ = this;

    if (_.$slidesCache !== null) {

      _.unload();

      _.$slideTrack.children(this.options.slide).detach();

      _.$slidesCache.appendTo(_.$slideTrack);

      _.reinit();

    }

  };

  Slick.prototype.unload = function() {

    var _ = this;

    $('.slick-cloned', _.$slider).remove();

    if (_.$dots) {
      _.$dots.remove();
    }

    if (_.$prevArrow && _.htmlExpr.test(_.options.prevArrow)) {
      _.$prevArrow.remove();
    }

    if (_.$nextArrow && _.htmlExpr.test(_.options.nextArrow)) {
      _.$nextArrow.remove();
    }

    _.$slides
      .removeClass('slick-slide slick-active slick-visible slick-current')
      .attr('aria-hidden', 'true')
      .css('width', '');

  };

  Slick.prototype.unslick = function(fromBreakpoint) {

    var _ = this;
    _.$slider.trigger('unslick', [_, fromBreakpoint]);
    _.destroy();

  };

  Slick.prototype.updateArrows = function() {

    var _ = this,
      centerOffset;

    centerOffset = Math.floor(_.options.slidesToShow / 2);

    if ( _.options.arrows === true &&
            _.slideCount > _.options.slidesToShow &&
            !_.options.infinite ) {

      _.$prevArrow.removeClass('slick-disabled').attr('disabled', false);
      _.$nextArrow.removeClass('slick-disabled').attr('disabled', false);

      if (_.currentSlide === 0) {

        _.$prevArrow.addClass('slick-disabled').attr('disabled', true);
        _.$nextArrow.removeClass('slick-disabled').attr('disabled', false);

      } else if (_.currentSlide >= _.slideCount - _.options.slidesToShow && _.options.centerMode === false) {

        _.$nextArrow.addClass('slick-disabled').attr('disabled', true);
        _.$prevArrow.removeClass('slick-disabled').attr('disabled', false);

      } else if (_.currentSlide >= _.slideCount - 1 && _.options.centerMode === true) {

        _.$nextArrow.addClass('slick-disabled').attr('disabled', true);
        _.$prevArrow.removeClass('slick-disabled').attr('disabled', false);

      }

    }

  };

  Slick.prototype.updateDots = function() {

    var _ = this;

    if (_.$dots !== null) {

      _.$dots
        .find('li')
        .removeClass('slick-active')
        .end();

      _.$dots
        .find('li')
        .eq(Math.floor(_.currentSlide / _.options.slidesToScroll))
        .addClass('slick-active');

    }

  };

  Slick.prototype.visibility = function() {

    var _ = this;

    if ( _.options.autoplay ) {

      if ( document[_.hidden] ) {

        _.interrupted = true;

      } else {

        _.interrupted = false;

      }

    }

  };

  $.fn.slick = function() {
    var _ = this,
      opt = arguments[0],
      args = Array.prototype.slice.call(arguments, 1),
      l = _.length,
      i,
      ret;
    for (i = 0; i < l; i++) {
      if (typeof opt == 'object' || typeof opt == 'undefined')
        _[i].slick = new Slick(_[i], opt);
      else
        ret = _[i].slick[opt].apply(_[i].slick, args);
      if (typeof ret != 'undefined') return ret;
    }
    return _;
  };

}));
;
// @TODO withClassName || with-class-name

(function ($, Drupal, once, drupalSettings) {
  "use strict";

  Drupal.behaviors.CohesionSlick = {
    attach: function (context) {

      var gridSettings = drupalSettings.cohesion.responsive_grid_settings;
      var cmm = new Drupal.CohesionResponsiveBreakpoints(drupalSettings.cohesion.responsive_grid_settings);
      var onceInit = 'coh-slider-container-init';

      $.each($('.coh-slider-container', context), function () {
        var $this = $(this);
        var $slider = $('> .coh-slider-container-mid > .coh-slider-container-inner', this);
        var $slides = $('> .coh-slider-item', $slider);

        if(!$slides.length) {
            $slider.addClass('slick-initialized');
            return;
        }
        // If this has already be init then return
        // The reason we do this is because we only want to add .once when the slider has actually init
        if ($this.data('jquery-once-' + onceInit)) {
          $slider.slick('refresh');
          return;
        }

        function updateCount(slick)  {
          var i = (slick.currentSlide ? slick.currentSlide : 0) + 1;

          slick.$slideCounter.text(i + '/' + slick.slideCount);
        }

        function updateCounter(slick)    {
          if(slick.options.counter)   {
            // Only append if it doesnt exist - moves the DOM element around so we don't have to worry about any clean up
            if(!$(slick.options.appendCounter).find(slick.$slideCounter).length)    {
              $(slick.options.appendCounter).append(slick.$slideCounter);
            }
          } else {
            // Detach from the DOM, but keep in memory ready for use later if we need it
            slick.$slideCounter.detach();
          }

          // Always keep the counter up to date regardless
          updateCount(slick);
        }

        function updateNavigationLabels(slick)  {
          // Accessibility of labels
          if(slick.options.infinite && slick.options.arrows)  {
            if(i === 1) {
              $(slick.$prevArrow).attr('aria-label','Last slide');
            } else {
              $(slick.$prevArrow).attr('aria-label','Previous slide');
            }

            if(i === slick.slideCount) {
              $(slick.$nextArrow).attr('aria-label','First slide');
            } else {
              $(slick.$nextArrow).attr('aria-label','Next slide');
            }
          }
        }

        // Recall behaviors for any cloned slides
        $slider.on('init', function (event, slick) {

          var clones = $($('.slick-cloned', slick.$slideTrack));

          // Cache the slide counter into memory
          slick.$slideCounter = $('<div />', {
            class: slick.options.counterClass
          });

          // We only want to init this once we know that the slider has actually initd
          once(onceInit, slick);

          $.each(clones, function () {
            Drupal.behaviors.CohesionSlick.attach($(this));
          });

          updateCounter(slick);

          updateNavigationLabels(slick);
        });

        $slider.on('afterChange', function (event, slick) {

          updateCount(slick);

          updateNavigationLabels(slick);
        });

        $slider.on('breakpoint', function (event, slick, breakpoint) {
          // Update the counter encase the position has changed per breakpoint
          updateCounter(slick);
        });

        var settings = $slider.data().cohSlider;

        settings.mobileFirst = (cmm.getGridType() === cmm.constants.mobile);

        // Handle the dots if the user asked for the dots to be numbers otherwise just fallback to a style
        // We can't use === as twig sends back 0 || 1
        settings.customPaging = function (slider, i) {
          return settings.dotsNumbers == true ? $('<button type="button" />').text(i + 1) : $('<button type="button" />');
        };

        if (typeof settings.asNavFor !== 'undefined' && settings.asNavFor !== null) {
          settings.asNavFor = $(settings.asNavFor + ' .coh-slider-container-inner');
        }

        var responsive = [];
        var matchHeights = {};
        var matchHeightsInit = false;
        var previousResponsiveSettings = false;

        // Loop through the slick slider breakpoints.
        for (var i = 0; i < cmm.breakpoints.length; i++) {

          var breakpointKey = cmm.breakpoints[i].key;
          var breakpoint = settings.responsive[breakpointKey];

          // Grab the match heights settings
          if (typeof breakpoint !== 'undefined' && typeof breakpoint.matchHeights !== 'undefined' && !$.isArray(breakpoint.matchHeights)) {
            matchHeights[breakpointKey] = settings.responsive[breakpointKey].matchHeights;

            // Handle custom classes
            if (typeof matchHeights[breakpointKey].class !== 'undefined') {
              matchHeights[breakpointKey].target = matchHeights[breakpointKey].class;
            }

            matchHeightsInit = true;
          }

          // If the grid is set to desktop first then grab the desktop first settings and
          // set them outside the responsive settings so they are default
          if (cmm.getGridType() !== cmm.constants.mobile && breakpointKey === 'xl') {

            // Move the current settings into global
            if (typeof breakpoint.appendArrows !== 'undefined') {
              breakpoint.appendArrows = $(breakpoint.appendArrows.trim() + ':first', $this);
            }

            // Move the current settings into global
            if (typeof breakpoint.appendDots !== 'undefined') {
              breakpoint.appendDots = $(breakpoint.appendDots.trim() + ':first', $this);
            }

            // Move the current settings into global
            if (typeof breakpoint.appendCounter !== 'undefined') {
              breakpoint.appendCounter = $(breakpoint.appendCounter.trim() + ':first', $this);
            }

            // Move the current settings into global
            if (typeof breakpoint.appendPlaypause !== 'undefined') {
              breakpoint.appendPlaypause = $(breakpoint.appendPlaypause.trim() + ':first', $this);
            }

            jQuery.extend(settings, breakpoint);

          } else {

            // Remove anything without any settings
            if (!jQuery.isEmptyObject(breakpoint)) {

              var responsive_obj = {settings: breakpoint};

              // Update the slick slider object with the pixel value width.
              if (typeof gridSettings.breakpoints[breakpointKey].width === 'undefined') {

                // This must be the lowest breakpoint because it doesn't have a width defined
                responsive_obj.breakpoint = 0;

              } else {

                // Otherwise grab the width from the responsive grid settings
                if (cmm.getGridType() === cmm.constants.desktop) {
                  // If the grid is desktop first we have to readd the +1 max-width fix because slick uses < rather than <=
                  responsive_obj.breakpoint = cmm.getBreakpointMediaWidth(breakpointKey) + 1;
                } else {
                  responsive_obj.breakpoint = cmm.getBreakpointMediaWidth(breakpointKey);
                }
              }

              // Handle `appendArrows` to include `this` otherwise if you have multiple sliders on the page it bubbles down
              if (typeof breakpoint.appendArrows !== 'undefined') {
                responsive_obj.settings.appendArrows = $(breakpoint.appendArrows.trim() + '', $this);
              }

              if (typeof breakpoint.appendDots !== 'undefined') {
                responsive_obj.settings.appendDots = $(breakpoint.appendDots.trim() + '', $this);
              }

              if (typeof breakpoint.appendCounter !== 'undefined') {
                responsive_obj.settings.appendCounter = $(breakpoint.appendCounter.trim() + '', $this);
              }

              if (typeof breakpoint.appendPlaypause !== 'undefined') {
                responsive_obj.settings.appendPlaypause = $(breakpoint.appendPlaypause.trim() + ':first', $this);
              }

              if (previousResponsiveSettings !== false) {
                responsive_obj.settings = $.extend({}, previousResponsiveSettings, responsive_obj.settings);
              }
              previousResponsiveSettings = responsive_obj.settings;
              responsive.push(responsive_obj);
            }
          }
        }

        // Set the rtl
        settings.rtl = document.dir === 'ltr' ? false : true;

        settings.responsive = responsive;

        // Init the slick slider.
        $slider.slick(settings);

        // Init match heights
        if (matchHeightsInit !== false) {
          $slider.cohesionContainerMatchHeights({
            excludeElements: ['slide'],
            targets: matchHeights,
            context: context,
            expressionPrefixes: ['.slick-list > .slick-track', '.slick-list > .slick-track > .coh-slider-item'],
            loaders: [
              '.coh-slider-container > .coh-slider-container-mid > .coh-slider-container-inner img',
              '.coh-slider-container > .coh-slider-container-mid > .coh-slider-container-inner frame',
              '.coh-slider-container > .coh-slider-container-mid > .coh-slider-container-inner iframe',
              '.coh-slider-container > .coh-slider-container-mid > .coh-slider-container-inner img',
              '.coh-slider-container > .coh-slider-container-mid > .coh-slider-container-inner input[type="image"]',
              '.coh-slider-container > .coh-slider-container-mid > .coh-slider-container-inner link',
              '.coh-slider-container > .coh-slider-container-mid > .coh-slider-container-inner script',
              '.coh-slider-container > .coh-slider-container-mid > .coh-slider-container-inner style'
            ]
          });
        }

        // Update match heights on change
        var breakpointOriginal = false;
        if ($.fn.matchHeight._groups.length > 0) {
          $slider.on('breakpoint', function (event, slick, breakpoint) {

            if (breakpointOriginal !== breakpoint) {
              $.fn.matchHeight._update();

              breakpointOriginal = breakpoint;
            }
          });
        }
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
