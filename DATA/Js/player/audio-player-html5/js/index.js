(function(window, undefined) {

'use strict';

var AudioPlayer = (function() {

  // Player vars!
  var
  docTitle = document.title,
  player   = document.getElementById('ap'),
  playBtn,
  playSvg,
  playSvgPath,
  prevBtn,
  nextBtn,
  plBtn,
  repeatBtn,
  volumeBtn,
  progressBar,
  preloadBar,
  curTime,
  durTime,
  trackTitle,
  audio,
  index = 0,
  playList,
  volumeBar,
  wheelVolumeValue = 0,
  volumeLength,
  repeating = true,
  seeking = false,
  seekingVol = false,
  rightClick = false,
  apActive = false,
  // playlist vars
  pl,
  plUl,
  plLi,
  tplList =
            '<li class="pl-list" data-track="{count}">'+
              '<div class="pl-list__track">'+
                '<div class="pl-list__icon"></div>'+
                '<div class="pl-list__eq">'+
                  '<div class="eq">'+
                    '<div class="eq__bar"></div>'+
                    '<div class="eq__bar"></div>'+
                    '<div class="eq__bar"></div>'+
                  '</div>'+
                '</div>'+
              '</div>'+
              '<div class="pl-list__title">{title}</div>'+
              '<button class="pl-list__remove">'+
                '<svg fill="#AA0000" height="20" viewBox="0 0 24 24" width="20" xmlns="http://www.w3.org/2000/svg">'+
                    '<path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>'+
                    '<path d="M0 0h24v24H0z" fill="none"/>'+
                '</svg>'+
              '</button>'+

            '</li>',
  // settings
  settings = {
    volume        : 1,
    changeDocTitle: true,
    confirmClose  : false,
    autoPlay      : false,
    buffered      : true,
    notification  : false,
    playList      : []
	
  };

  
  
  function init(options) {

    if(!('classList' in document.documentElement)) {
      return false;
    }

    if(apActive || player === null) {
      return 'Player already init';
    }

    settings = extend(settings, options);

    // get player elements
    playBtn        = player.querySelector('.ap__controls--toggle');
    playSvg        = playBtn.querySelector('.icon-play');
    playSvgPath    = playSvg.querySelector('path');
    prevBtn        = player.querySelector('.ap__controls--prev');
    nextBtn        = player.querySelector('.ap__controls--next');
    repeatBtn      = player.querySelector('.ap__controls--repeat');
    volumeBtn      = player.querySelector('.volume-btn');
    plBtn          = player.querySelector('.ap__controls--playlist');
    curTime        = player.querySelector('.track__time--current');
    durTime        = player.querySelector('.track__time--duration');
    trackTitle     = player.querySelector('.track__title');
    progressBar    = player.querySelector('.progress__bar');
    preloadBar     = player.querySelector('.progress__preload');
    volumeBar      = player.querySelector('.volume__bar');

    playList = settings.playList;

    playBtn.addEventListener('click', playToggle, false);
    volumeBtn.addEventListener('click', volumeToggle, false);
    repeatBtn.addEventListener('click', repeatToggle, false);

    progressBar.closest('.progress-container').addEventListener('mousedown', handlerBar, false);
    progressBar.closest('.progress-container').addEventListener('mousemove', seek, false);

    document.documentElement.addEventListener('mouseup', seekingFalse, false);

    volumeBar.closest('.volume').addEventListener('mousedown', handlerVol, false);
    volumeBar.closest('.volume').addEventListener('mousemove', setVolume);
    volumeBar.closest('.volume').addEventListener(wheel(), setVolume, false);

    prevBtn.addEventListener('click', prev, false);
    nextBtn.addEventListener('click', next, false);

    apActive = true;

    // Create playlist
    renderPL();
    plBtn.addEventListener('click', plToggle, false);

    // Create audio object
    audio = new Audio();
    audio.volume = settings.volume;
    audio.preload = 'auto';

    audio.addEventListener('error', errorHandler, false);
    audio.addEventListener('timeupdate', timeUpdate, false);
    audio.addEventListener('ended', doEnd, false);

    volumeBar.style.height = audio.volume * 50 + '%';
    volumeLength = volumeBar.css('height');

    if(settings.confirmClose) {
      window.addEventListener("beforeunload", beforeUnload, false);
    }

    if(isEmptyList()) {
      return false;
    }
    audio.src = playList[index].file;
    trackTitle.innerHTML = playList[index].title;

    if(settings.autoPlay) {
      audio.play();
      playBtn.classList.add('is-playing');
      playSvgPath.setAttribute('d', playSvg.getAttribute('data-pause'));
      plLi[index].classList.add('pl-list--current');
      notify(playList[index].title, {
        icon: playList[index].icon,
        body: 'Now playing'
      });
    }
  }

  function changeDocumentTitle(title) {
    if(settings.changeDocTitle) {
      if(title) {
        document.title = title;
      }
      else {
        document.title = docTitle;
      }
    }
  }

  function beforeUnload(evt) {
    if(!audio.paused) {
      var message = 'Music still playing';
      evt.returnValue = message;
      return message;
    }
  }

  function errorHandler(evt) {
    if(isEmptyList()) {
      return;
    }
    var mediaError = {
      '1': 'MEDIA_ERR_ABORTED',
      '2': 'MEDIA_ERR_NETWORK',
      '3': 'MEDIA_ERR_DECODE',
      '4': 'MEDIA_ERR_SRC_NOT_SUPPORTED'
    };
    audio.pause();
    curTime.innerHTML = '--';
    durTime.innerHTML = '--';
    progressBar.style.width = 0;
    preloadBar.style.width = 0;
    playBtn.classList.remove('is-playing');
    playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
    plLi[index] && plLi[index].classList.remove('pl-list--current');
    changeDocumentTitle();
    throw new Error('Houston we have a problem: ' + mediaError[evt.target.error.code]);
  }

/**
 * UPDATE PL
 */
  function updatePL(addList) {
    if(!apActive) {
      return 'Player is not yet initialized';
    }
    if(!Array.isArray(addList)) {
      return;
    }
	
    if(addList.length === 0) {
      return;
    }
	
	console.log('plUl ',plUl);
	console.log('plUl.querySelector(.pl-list--empty) ',plUl.querySelector('.pl-list--empty'));
	
    var count = playList.length;
    var html  = [];
    playList.push.apply(playList, addList);
    addList.forEach(function(item) {
      html.push(
        tplList.replace('{count}', count++).replace('{title}', item.title)
      );
    });
    // If exist empty message
    if(plUl.querySelector('.pl-list--empty')) {
      plUl.removeChild( pl.querySelector('.pl-list--empty') );
      audio.src = playList[index].file;
      trackTitle.innerHTML = playList[index].title;
    }
	
    plUl.insertAdjacentHTML('beforeEnd', html.join(''));
    plLi = pl.querySelectorAll('li');
  }

/**
 *  PlayList methods
 */
    function renderPL() {
      var html = [];

      playList.forEach(function(item, i) {
        html.push(
          tplList.replace('{count}', i).replace('{title}', item.title)
        );
      });

      pl = create('div', {
        'className': 'pl-container h-show',
        'id': 'pl',
        'innerHTML': '<ul class="pl-ul">' + (!isEmptyList() ? html.join('') : '<li class="pl-list--empty">PlayList is empty</li>') + '</ul>'
      });

      player.parentNode.insertBefore(pl, player.nextSibling);

      plUl = pl.querySelector('.pl-ul');
      plLi = plUl.querySelectorAll('li');

      pl.addEventListener('click', listHandler, false);
    }

    function listHandler(evt) {
      evt.preventDefault();

      if(evt.target.matches('.pl-list__title')) {
        var current = parseInt(evt.target.closest('.pl-list').getAttribute('data-track'), 10);
        if(index !== current) {
          index = current;
          play(current);
        }
        else {
          playToggle();
        }
      }
      else {
          if(!!evt.target.closest('.pl-list__remove')) {
            var parentEl = evt.target.closest('.pl-list');
            var isDel = parseInt(parentEl.getAttribute('data-track'), 10);

            playList.splice(isDel, 1);
            parentEl.closest('.pl-ul').removeChild(parentEl);

            plLi = pl.querySelectorAll('li');

            [].forEach.call(plLi, function(el, i) {
              el.setAttribute('data-track', i);
            });

            if(!audio.paused) {

              if(isDel === index) {
                play(index);
              }

            }
            else {
              if(isEmptyList()) {
                clearAll();
              }
              else {
                if(isDel === index) {
                  if(isDel > playList.length - 1) {
                    index -= 1;
                  }
                  audio.src = playList[index].file;
                  trackTitle.innerHTML = playList[index].title;
                  progressBar.style.width = 0;
                }
              }
            }
            if(isDel < index) {
              index--;
            }
          }

      }
    }

	
	function delall()
	{
		clearAll();
	}
	
    function plActive() {
      if(audio.paused) {
        plLi[index].classList.remove('pl-list--current');
        return;
      }
      var current = index;
      for(var i = 0, len = plLi.length; len > i; i++) {
        plLi[i].classList.remove('pl-list--current');
      }
      plLi[current].classList.add('pl-list--current');
    }


/**
 * Player methods
 */
  function play(currentIndex) {

    if(isEmptyList()) {
      return clearAll();
    }

    index = (currentIndex + playList.length) % playList.length;

    audio.src = playList[index].file;
    trackTitle.innerHTML = playList[index].title;

    // Change document title
    changeDocumentTitle(playList[index].title);

    // Audio play
    audio.play();

    // Show notification
    notify(playList[index].title, {
      icon: playList[index].icon,
      body: 'Now playing',
      tag: 'music-player'
    });

    // Toggle play button
    playBtn.classList.add('is-playing');
    playSvgPath.setAttribute('d', playSvg.getAttribute('data-pause'));

    // Set active song playlist
    plActive();
  }

  function prev() {
    play(index - 1);
  }

  function next() {
    play(index + 1);
  }

  function isEmptyList() {
    return playList.length === 0;
  }

  function clearAll() {
    audio.pause();
    audio.src = '';
    trackTitle.innerHTML = 'queue is empty';
    curTime.innerHTML = '--';
    durTime.innerHTML = '--';
    progressBar.style.width = 0;
    preloadBar.style.width = 0;
    playBtn.classList.remove('is-playing');
    playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
    if(!plUl.querySelector('.pl-list--empty')) {
      plUl.innerHTML = '<li class="pl-list--empty">PlayList is empty</li>';
    }
    changeDocumentTitle();
	
	playList = playList.splice();
	index = 0;
  }

  function playToggle() {
    if(isEmptyList()) {
      return;
    }
    if(audio.paused) {

      if(audio.currentTime === 0) {
        notify(playList[index].title, {
          icon: playList[index].icon,
          body: 'Now playing'
        });
      }
      changeDocumentTitle(playList[index].title);

      audio.play();

      playBtn.classList.add('is-playing');
      playSvgPath.setAttribute('d', playSvg.getAttribute('data-pause'));
    }
    else {
      changeDocumentTitle();
      audio.pause();
      playBtn.classList.remove('is-playing');
      playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
    }
    plActive();
  }

  function volumeToggle() {
    if(audio.muted) {
      if(parseInt(volumeLength, 10) === 0) {
        volumeBar.style.height = settings.volume * 100 + '%';
        audio.volume = settings.volume;
      }
      else {
        volumeBar.style.height = volumeLength;
      }
      audio.muted = false;
      volumeBtn.classList.remove('has-muted');
    }
    else {
      audio.muted = true;
      volumeBar.style.height = 0;
      volumeBtn.classList.add('has-muted');
    }
  }

  function repeatToggle() {
    if(repeatBtn.classList.contains('is-active')) {
      repeating = false;
      repeatBtn.classList.remove('is-active');
    }
    else {
      repeating = true;
      repeatBtn.classList.add('is-active');
    }
  }

  function plToggle() {
    plBtn.classList.toggle('is-active');
    pl.classList.toggle('h-show');
  }

  function timeUpdate() {
    if(audio.readyState === 0 || seeking) return;

    var barlength = Math.round(audio.currentTime * (100 / audio.duration));
    progressBar.style.width = barlength + '%';

    var
    curMins = Math.floor(audio.currentTime / 60),
    curSecs = Math.floor(audio.currentTime - curMins * 60),
    mins = Math.floor(audio.duration / 60),
    secs = Math.floor(audio.duration - mins * 60);
    (curSecs < 10) && (curSecs = '0' + curSecs);
    (secs < 10) && (secs = '0' + secs);

    curTime.innerHTML = curMins + ':' + curSecs;
    durTime.innerHTML = mins + ':' + secs;

    if(settings.buffered) {
      var buffered = audio.buffered;
      if(buffered.length) {
        var loaded = Math.round(100 * buffered.end(0) / audio.duration);
        preloadBar.style.width = loaded + '%';
      }
    }
  }

  /**
   * TODO shuffle
   */
  function shuffle() {
    if(shuffle) {
      index = Math.round(Math.random() * playList.length);
    }
  }

  function doEnd() {
    if(index === playList.length - 1) {
      if(!repeating) {
        audio.pause();
        plActive();
        playBtn.classList.remove('is-playing');
        playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
        return;
      }
      else {
        play(0);
      }
    }
    else {
      play(index + 1);
    }
  }

  function moveBar(evt, el, dir) {
    var value;
    if(dir === 'horizontal') {
      value = Math.round( ((evt.clientX - el.offset().left) + window.pageXOffset)  * 100 / el.parentNode.offsetWidth);
      el.style.width = value + '%';
      return value;
    }
    else {
      if(evt.type === wheel()) {
        value = parseInt(volumeLength, 10);
        var delta = evt.deltaY || evt.detail || -evt.wheelDelta;
        value = (delta > 0) ? value - 10 : value + 10;
      }
      else {
        var offset = (el.offset().top + el.offsetHeight) - window.pageYOffset;
        value = Math.round((offset - evt.clientY));
      }
      if(value > 100) value = wheelVolumeValue = 100;
      if(value < 0) value = wheelVolumeValue = 0;
      volumeBar.style.height = value + '%';
      return value;
    }
  }

  function handlerBar(evt) {
    rightClick = (evt.which === 3) ? true : false;
    seeking = true;
    !rightClick && progressBar.classList.add('progress__bar--active');
    seek(evt);
  }

  function handlerVol(evt) {
    rightClick = (evt.which === 3) ? true : false;
    seekingVol = true;
    setVolume(evt);
  }

  function seek(evt) {
    evt.preventDefault();
    if(seeking && rightClick === false && audio.readyState !== 0) {
      window.value = moveBar(evt, progressBar, 'horizontal');
    }
  }

  function seekingFalse() {
    if(seeking && rightClick === false && audio.readyState !== 0) {
      audio.currentTime = audio.duration * (window.value / 100);
      progressBar.classList.remove('progress__bar--active');
    }
    seeking = false;
    seekingVol = false;
  }

  function setVolume(evt) {
    evt.preventDefault();
    volumeLength = volumeBar.css('height');
    if(seekingVol && rightClick === false || evt.type === wheel()) {
      var value = moveBar(evt, volumeBar.parentNode, 'vertical') / 100;
      if(value <= 0) {
        audio.volume = 0;
        audio.muted = true;
        volumeBtn.classList.add('has-muted');
      }
      else {
        if(audio.muted) audio.muted = false;
        audio.volume = value;
        volumeBtn.classList.remove('has-muted');
      }
    }
  }

  function notify(title, attr) {
    if(!settings.notification) {
      return;
    }
    if(window.Notification === undefined) {
      return;
    }
    attr.tag = 'AP music player';
    window.Notification.requestPermission(function(access) {
      if(access === 'granted') {
        var notice = new Notification(title.substr(0, 110), attr);
        setTimeout(notice.close.bind(notice), 5000);
      }
    });
  }

/* Destroy method. Clear All */
  function destroy() {
    if(!apActive) return;

    if(settings.confirmClose) {
      window.removeEventListener('beforeunload', beforeUnload, false);
    }

    playBtn.removeEventListener('click', playToggle, false);
    volumeBtn.removeEventListener('click', volumeToggle, false);
    repeatBtn.removeEventListener('click', repeatToggle, false);
    plBtn.removeEventListener('click', plToggle, false);

    progressBar.closest('.progress-container').removeEventListener('mousedown', handlerBar, false);
    progressBar.closest('.progress-container').removeEventListener('mousemove', seek, false);
    document.documentElement.removeEventListener('mouseup', seekingFalse, false);

    volumeBar.closest('.volume').removeEventListener('mousedown', handlerVol, false);
    volumeBar.closest('.volume').removeEventListener('mousemove', setVolume);
    volumeBar.closest('.volume').removeEventListener(wheel(), setVolume);
    document.documentElement.removeEventListener('mouseup', seekingFalse, false);

    prevBtn.removeEventListener('click', prev, false);
    nextBtn.removeEventListener('click', next, false);

    audio.removeEventListener('error', errorHandler, false);
    audio.removeEventListener('timeupdate', timeUpdate, false);
    audio.removeEventListener('ended', doEnd, false);

    // Playlist
    pl.removeEventListener('click', listHandler, false);
    pl.parentNode.removeChild(pl);

    audio.pause();
    apActive = false;
    index = 0;

    playBtn.classList.remove('is-playing');
    playSvgPath.setAttribute('d', playSvg.getAttribute('data-play'));
    volumeBtn.classList.remove('has-muted');
    plBtn.classList.remove('is-active');
    repeatBtn.classList.remove('is-active');

    // Remove player from the DOM if necessary
     player.parentNode.removeChild(player);
  }


/**
 *  Helpers
 */
  function wheel() {
    var wheel;
    if ('onwheel' in document) {
      wheel = 'wheel';
    } else if ('onmousewheel' in document) {
      wheel = 'mousewheel';
    } else {
      wheel = 'MozMousePixelScroll';
    }
    return wheel;
  }

  function extend(defaults, options) {
    for(var name in options) {
      if(defaults.hasOwnProperty(name)) {
        defaults[name] = options[name];
      }
    }
    return defaults;
  }
  function create(el, attr) {
    var element = document.createElement(el);
    if(attr) {
      for(var name in attr) {
        if(element[name] !== undefined) {
          element[name] = attr[name];
        }
      }
    }
    return element;
  }

  Element.prototype.offset = function() {
    var el = this.getBoundingClientRect(),
    scrollLeft = window.pageXOffset || document.documentElement.scrollLeft,
    scrollTop = window.pageYOffset || document.documentElement.scrollTop;

    return {
      top: el.top + scrollTop,
      left: el.left + scrollLeft
    };
  };

  Element.prototype.css = function(attr) {
    if(typeof attr === 'string') {
      return getComputedStyle(this, '')[attr];
    }
    else if(typeof attr === 'object') {
      for(var name in attr) {
        if(this.style[name] !== undefined) {
          this.style[name] = attr[name];
        }
      }
    }
  };

  // matches polyfill
  window.Element && function(ElementPrototype) {
      ElementPrototype.matches = ElementPrototype.matches ||
      ElementPrototype.matchesSelector ||
      ElementPrototype.webkitMatchesSelector ||
      ElementPrototype.msMatchesSelector ||
      function(selector) {
          var node = this, nodes = (node.parentNode || node.document).querySelectorAll(selector), i = -1;
          while (nodes[++i] && nodes[i] != node);
          return !!nodes[i];
      };
  }(Element.prototype);

  // closest polyfill
  window.Element && function(ElementPrototype) {
      ElementPrototype.closest = ElementPrototype.closest ||
      function(selector) {
          var el = this;
          while (el.matches && !el.matches(selector)) el = el.parentNode;
          return el.matches ? el : null;
      };
  }(Element.prototype);

/**
 *  Public methods
 */
  return {
    init: init,
    update: updatePL,
	delall: delall,
    destroy: destroy
  };

})();

window.AP = AudioPlayer;

})(window);

// TEST: image for web notifications
var iconImage = 'http://funkyimg.com/i/21pX5.png';


AP.init({
  playList: [
  {'icon': iconImage, 'title': 'Alex Theme', 'file': '../Data/alex_theme.mp3'},
  {'icon': iconImage, 'title': 'Bad Liar', 'file': '../Data/Bad Liar.mp3'},
  {'icon': iconImage, 'title': 'Bang', 'file': '../Data/bang.mp3'},
  {'icon': iconImage, 'title': 'Beautiful Lie', 'file': '../Data/beautiful_lie.mp3'},
  {'icon': iconImage, 'title': 'Behind Blue Eyes', 'file': '../Data/Behind Blue Eyes.mp3'},
  {'icon': iconImage, 'title': 'Bfg Division', 'file': '../Data/bfg_division.mp3'},
  {'icon': iconImage, 'title': 'Big In Japan', 'file': '../Data/Big In Japan.mp3'},
  {'icon': iconImage, 'title': 'Birds', 'file': '../Data/Birds.mp3'},
  {'icon': iconImage, 'title': 'California Dreaming', 'file': '../Data/California dreaming.mp4'},
  {'icon': iconImage, 'title': 'Careless Whispe', 'file': '../Data/Careless Whispe.mp3'},
  {'icon': iconImage, 'title': 'Celebrate The Love', 'file': '../Data/Celebrate the Love.mp3'},
  {'icon': iconImage, 'title': 'Chandelier', 'file': '../Data/Chandelier.mp3'},
  {'icon': iconImage, 'title': 'Changed The Way You Kiss Me', 'file': '../Data/Changed the way you kiss me.mp3'},
  {'icon': iconImage, 'title': 'Color Of The Night', 'file': '../Data/Color Of The Night.mp4'},
  {'icon': iconImage, 'title': 'Conquest Of Paradise', 'file': '../Data/Conquest of paradise.mp3'},
  {'icon': iconImage, 'title': 'Deamons', 'file': '../Data/Deamons.mp3'},
  {'icon': iconImage, 'title': 'Diamonds Myzuka', 'file': '../Data/Diamonds myzuka.mp3'},
  {'icon': iconImage, 'title': 'Dreamer', 'file': '../Data/Dreamer.mp3'},
  {'icon': iconImage, 'title': 'Dust In The Wind', 'file': '../Data/Dust In The Wind.mp4'},
  {'icon': iconImage, 'title': 'Ecstasy Of Gold', 'file': '../Data/Ecstasy_of_gold.mp3'},
  {'icon': iconImage, 'title': 'Eleanor Rigby', 'file': '../Data/Eleanor Rigby.mp4'},
  {'icon': iconImage, 'title': 'Every Breath You Take', 'file': '../Data/Every breath you take.mp3'},
  {'icon': iconImage, 'title': 'Everything Is Going To Be Okay', 'file': '../Data/everything_is_going_to_be_okay.mp3'},
  {'icon': iconImage, 'title': 'Fly Ludovico Einaudi', 'file': '../Data/fly_ludovico_einaudi.mp3'},
  {'icon': iconImage, 'title': 'Game Of Thrones Theme', 'file': '../Data/GAME OF THRONES THEME.mp4'},
  {'icon': iconImage, 'title': 'Heven', 'file': '../Data/Heven.mp4'},
  {'icon': iconImage, 'title': 'Hey Now Don T Dream It S Over', 'file': '../Data/Hey Now Don t Dream It s Over.mp4'},
  {'icon': iconImage, 'title': 'High Hopes', 'file': '../Data/High Hopes.mp3'},
  {'icon': iconImage, 'title': 'History Of Artemisia', 'file': '../Data/History Of Artemisia.mp3'},
  {'icon': iconImage, 'title': 'Hitman', 'file': '../Data/Hitman.mp3'},
  {'icon': iconImage, 'title': 'If You Leave Me Now', 'file': '../Data/if_you_leave_me_now.mp3'},
  {'icon': iconImage, 'title': 'Interstellar', 'file': '../Data/Interstellar.mp4'},
  {'icon': iconImage, 'title': 'Island My Name Is Lincoln', 'file': '../Data/Island - My Name is Lincoln.mp4'},
  {'icon': iconImage, 'title': 'Its Time', 'file': '../Data/Its Time.mp4'},
  {'icon': iconImage, 'title': 'Kraken', 'file': '../Data/kraken.mp3'},
  {'icon': iconImage, 'title': 'Lost On You', 'file': '../Data/Lost_On_You.mp3'},
  {'icon': iconImage, 'title': 'Love Me Like You Do', 'file': '../Data/Love Me Like You Do.mp3'},
  {'icon': iconImage, 'title': 'Low Mans Lyric', 'file': '../Data/low_mans_lyric.mp3'},
  {'icon': iconImage, 'title': 'Mama Said', 'file': '../Data/Mama Said.mp4'},
  {'icon': iconImage, 'title': 'Moscow Calling', 'file': '../Data/moscow_calling.mp3'},
  {'icon': iconImage, 'title': 'My Darkest Days', 'file': '../Data/my_darkest_days.mp3'},
  {'icon': iconImage, 'title': 'Now We Are Free (piano Version)', 'file': '../Data/Now We Are Free (Piano Version).mp4'},
  {'icon': iconImage, 'title': 'Now We Are Free • Hans Zimmer & Lisa Gerrard', 'file': '../Data/Now We Are Free • Hans Zimmer & Lisa Gerrard.mp4'},
  {'icon': iconImage, 'title': 'Nowhere Man', 'file': '../Data/Nowhere Man.mp4'},
  {'icon': iconImage, 'title': 'Numb', 'file': '../Data/Numb.mp3'},
  {'icon': iconImage, 'title': 'Old Man', 'file': '../Data/Old man.mp3'},
  {'icon': iconImage, 'title': 'Pompeii', 'file': '../Data/pompeii.mp3'},
  {'icon': iconImage, 'title': 'Sail', 'file': '../Data/sail.mp3'},
  {'icon': iconImage, 'title': 'Seven Nation Army', 'file': '../Data/seven_nation_army.mp3'},
  {'icon': iconImage, 'title': 'Souviens Toi', 'file': '../Data/souviens-toi.mp3'},
  {'icon': iconImage, 'title': 'Teardrop', 'file': '../Data/Teardrop.mp4'},
  {'icon': iconImage, 'title': 'The Experiment', 'file': '../Data/the_experiment.mp3'},
  {'icon': iconImage, 'title': 'The Hero Of The Day', 'file': '../Data/the hero of the day.mp4'},
  {'icon': iconImage, 'title': 'The New Order', 'file': '../Data/the_new_order.mp3'},
  {'icon': iconImage, 'title': 'Thunder', 'file': '../Data/Thunder.mp3'},
  {'icon': iconImage, 'title': 'Time', 'file': '../Data/time.mp3'},
  {'icon': iconImage, 'title': 'Time To Burn', 'file': '../Data/Time to Burn.mp3'},
  {'icon': iconImage, 'title': 'Towards The Sun', 'file': '../Data/Towards the sun.mp3'},
  {'icon': iconImage, 'title': 'Tuyo', 'file': '../Data/Tuyo.mp3'},
  {'icon': iconImage, 'title': 'Varien Valkyrie Feat Laura Brehm', 'file': '../Data/varien_valkyrie_feat_laura_brehm.mp3'},
  {'icon': iconImage, 'title': 'What A Life', 'file': '../Data/What A Life.mp3'},
  {'icon': iconImage, 'title': 'Whatever It Takes', 'file': '../Data/Whatever It Takes.mp3'},
  {'icon': iconImage, 'title': 'When I Dream', 'file': '../Data/When I Dream.mp3'},
  {'icon': iconImage, 'title': 'Whenever Wherever', 'file': '../Data/Whenever Wherever.mp3'},
  {'icon': iconImage, 'title': 'Wish You Were Here', 'file': '../Data/Wish You Were Here.webm'},
  {'icon': iconImage, 'title': 'Вокзал', 'file': '../Data/Вокзал.mp4'},
  {'icon': iconImage, 'title': 'Где Мы Летим', 'file': '../Data/Где мы летим.mp3'},
  {'icon': iconImage, 'title': 'Герой', 'file': '../Data/Герой.mp3'},
  {'icon': iconImage, 'title': 'Если', 'file': '../Data/Если.mp3'},
  {'icon': iconImage, 'title': 'Живет Повсюду Красота', 'file': '../Data/Живет повсюду красота.mp3'},
  {'icon': iconImage, 'title': 'Кошмары Кукрыниксы', 'file': '../Data/Кошмары кукрыниксы.mp4'},
  {'icon': iconImage, 'title': 'Крылатые Качели (rammstein)', 'file': '../Data/Крылатые качели (Rammstein).mp4'},
  {'icon': iconImage, 'title': 'Летели Облака', 'file': '../Data/Летели Облака.mp3'},
  {'icon': iconImage, 'title': 'Метель', 'file': '../Data/Метель.mp3'},
  {'icon': iconImage, 'title': 'Мы Как Трепетные Птицы', 'file': '../Data/Мы как трепетные птицы.mp3'},
  {'icon': iconImage, 'title': 'Ночная Дорога', 'file': '../Data/Ночная дорога.mp4'},
  {'icon': iconImage, 'title': 'Ночная Пьеса', 'file': '../Data/Ночная пьеса.mp4'},
  {'icon': iconImage, 'title': 'Она', 'file': '../Data/Она.mp4'},
  {'icon': iconImage, 'title': 'Победа', 'file': '../Data/Победа.mp4'},
  {'icon': iconImage, 'title': 'Реальность', 'file': '../Data/Реальность.mp3'},
  {'icon': iconImage, 'title': 'Рожденный В Ссср', 'file': '../Data/Рожденный в СССР.mp4'},
  {'icon': iconImage, 'title': 'Русская Весна', 'file': '../Data/Русская весна.mp3'},
  {'icon': iconImage, 'title': 'Спокойная Ночь', 'file': '../Data/Спокойная ночь.mp4'},
  {'icon': iconImage, 'title': 'Спокойно Дружище', 'file': '../Data/Спокойно, дружище.mp4'},
  {'icon': iconImage, 'title': 'Там На Самом Краю Земли', 'file': '../Data/Там, на самом краю земли.mp4'},
  {'icon': iconImage, 'title': 'Четыре Окна', 'file': '../Data/ЧЕТЫРЕ ОКНА.mp4'},
  {'icon': iconImage, 'title': 'Я Не Жалею Ни О Чем', 'file': '../Data/Я не жалею ни о чем.mp3'},
  {'icon': iconImage, 'title': 'Я Так Соскучился', 'file': '../Data/Я так соскучился.mp3'},
   ]
});

// TEST: update playlist
document.getElementById('abba').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Chiquitita', 'file': '../../../../../../../Test/Music/ABBA/1986 - Abba Live/Chiquitita.mp3'},
  {'icon': iconImage, 'title': 'Dancing Queen', 'file': '../../../../../../../Test/Music/ABBA/1986 - Abba Live/Dancing Queen.mp3'},
  {'icon': iconImage, 'title': 'Fernando', 'file': '../../../../../../../Test/Music/ABBA/1976 - Arrival/Fernando.mp3'},
  {'icon': iconImage, 'title': 'Gimme! Gimme! Gimme! (a Man After Midnight)', 'file': '../../../../../../../Test/Music/ABBA/1979 - Voulez-Vous/Gimme! Gimme! Gimme! (a man after midnight).mp3'},
  {'icon': iconImage, 'title': 'Happy New Year', 'file': '../../../../../../../Test/Music/ABBA/1980 - Super Trouper/Happy New Year.mp3'},
  {'icon': iconImage, 'title': 'Head Over Heels', 'file': '../../../../../../../Test/Music/ABBA/1993 - More Abba Gold/Head Over Heels.mp3'},
  {'icon': iconImage, 'title': 'Honey Honey', 'file': '../../../../../../../Test/Music/ABBA/1974 - Waterloo/Honey, Honey.mp3'},
  {'icon': iconImage, 'title': 'I Do I Do I Do', 'file': '../../../../../../../Test/Music/ABBA/1993 - More Abba Gold/I do, I do, I do.mp3'},
  {'icon': iconImage, 'title': 'I Have A Dream', 'file': '../../../../../../../Test/Music/ABBA/1979 - Voulez-Vous/I Have A Dream.mp3'},
  {'icon': iconImage, 'title': 'Knowing Me Knowing You', 'file': '../../../../../../../Test/Music/ABBA/1992 - Abba Gold Greatest Hits/Knowing Me, Knowing You.mp3'},
  {'icon': iconImage, 'title': 'Lay All Your Love On Me', 'file': '../../../../../../../Test/Music/ABBA/1980 - Super Trouper/Lay All Your Love On Me.mp3'},
  {'icon': iconImage, 'title': 'Mamma Mia', 'file': '../../../../../../../Test/Music/ABBA/1975 - ABBA/Mamma Mia.mp3'},
  {'icon': iconImage, 'title': 'Monday', 'file': '../../../../../../../Test/Music/ABBA/Monday.mp3'},
  {'icon': iconImage, 'title': 'Money Money Money', 'file': '../../../../../../../Test/Music/ABBA/1976 - Arrival/Money, Money, Money.mp3'},
  {'icon': iconImage, 'title': 'One Of Us', 'file': '../../../../../../../Test/Music/ABBA/1981 - The Visitors/One of Us.mp3'},
  {'icon': iconImage, 'title': 'Ring Ring', 'file': '../../../../../../../Test/Music/ABBA/1973 - Ring Ring/Ring Ring.mp3'},
  {'icon': iconImage, 'title': 'Sos', 'file': '../../../../../../../Test/Music/ABBA/1975 - ABBA/SOS.mp3'},
  {'icon': iconImage, 'title': 'Summer Night City', 'file': '../../../../../../../Test/Music/ABBA/1993 - More Abba Gold/Summer Night City.mp3'},
  {'icon': iconImage, 'title': 'Super Trouper', 'file': '../../../../../../../Test/Music/ABBA/1986 - Abba Live/Super Trouper.mp3'},
  {'icon': iconImage, 'title': 'Thank You For The Music', 'file': '../../../../../../../Test/Music/ABBA/1986 - Abba Live/Thank You For The Music.mp3'},
  {'icon': iconImage, 'title': 'The Winner Takes It All', 'file': '../../../../../../../Test/Music/ABBA/1980 - Super Trouper/The Winner Takes It All.mp3'},
  {'icon': iconImage, 'title': 'Voulez Vous', 'file': '../../../../../../../Test/Music/ABBA/1979 - Voulez-Vous/Voulez-Vous.mp3'},
  {'icon': iconImage, 'title': 'Waterloo', 'file': '../../../../../../../Test/Music/ABBA/1974 - Waterloo/Waterloo.mp3'},
]);
})

document.getElementById('akk').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '15 Rock Songs', 'file': '../../../../../../../Test/Music/Akk/15 ROCK SONGS.mp4'},
  {'icon': iconImage, 'title': '30 Риффов Арии ( Кипелов Маврин) Лучшая Подборка (guitar Cover)', 'file': '../../../../../../../Test/Music/Akk/30 риффов Арии (+Кипелов _ Маврин) - лучшая подборка (guitar cover).mp4'},
  {'icon': iconImage, 'title': 'A Mi Manera My Way Elena Yerevan ', 'file': '../../../../../../../Test/Music/Akk/A mi manera - My way -Elena -Yerevan- .mp4'},
  {'icon': iconImage, 'title': 'Addio A Cheyene', 'file': '../../../../../../../Test/Music/Akk/Addio A Cheyene.mp4'},
  {'icon': iconImage, 'title': 'Ausländer Guitar Lesson W Tabs (720p 30fps H264 128kbit Aac)', 'file': '../../../../../../../Test/Music/Akk/Ausländer Guitar Lesson w_ TABS (720p_30fps_H264-128kbit_AAC).mp4'},
  {'icon': iconImage, 'title': 'Bad Liar (chords & Lyrics)', 'file': '../../../../../../../Test/Music/Akk/Bad Liar (chords & lyrics).mp4'},
  {'icon': iconImage, 'title': 'Bamboleo Elena Yerevan', 'file': '../../../../../../../Test/Music/Akk/Bamboleo ELENA _Yerevan.mp4'},
  {'icon': iconImage, 'title': 'Bamboleo Gipsy Kings Como Tocar No Tvcifras (candô)', 'file': '../../../../../../../Test/Music/Akk/Bamboleo - Gipsy Kings - Como Tocar no TVCifras (Candô).mp4'},
  {'icon': iconImage, 'title': 'Behind Blue Eyes (the Who) Разбор Corus Guitar Guide #6', 'file': '../../../../../../../Test/Music/Akk/Behind Blue Eyes (The Who)   Разбор COrus Guitar Guide #6.mp4'},
  {'icon': iconImage, 'title': 'Birds On Guitaarr', 'file': '../../../../../../../Test/Music/Akk/Birds on Guitaarr.mp4'},
  {'icon': iconImage, 'title': 'California Dreamin Gabriella Quevedo', 'file': '../../../../../../../Test/Music/Akk/California Dreamin%27 - Gabriella Quevedo.mp4'},
  {'icon': iconImage, 'title': 'California Dreaming', 'file': '../../../../../../../Test/Music/Akk/California Dreaming.mp4'},
  {'icon': iconImage, 'title': 'Cancion Del Mariachi In Studio 2017 Dpr', 'file': '../../../../../../../Test/Music/Akk/Cancion Del Mariachi-IN STUDIO-2017 DPR.mp4'},
  {'icon': iconImage, 'title': 'Canción Del Mariachi Разбор Вступления На Гитаре', 'file': '../../../../../../../Test/Music/Akk/Canción Del Mariachi Разбор вступления на гитаре.mp4'},
  {'icon': iconImage, 'title': 'Chi Mai', 'file': '../../../../../../../Test/Music/Akk/Chi Mai.mp4'},
  {'icon': iconImage, 'title': 'Children', 'file': '../../../../../../../Test/Music/Akk/Children.mp4'},
  {'icon': iconImage, 'title': 'Children Robert Miles', 'file': '../../../../../../../Test/Music/Akk/Children - Robert Miles.webm'},
  {'icon': iconImage, 'title': 'Conquest Of Paradise Classical Guitar', 'file': '../../../../../../../Test/Music/Akk/Conquest of paradise- Classical Guitar.mp4'},
  {'icon': iconImage, 'title': 'Creep Fingerstyle Guitare', 'file': '../../../../../../../Test/Music/Akk/Creep FINGERSTYLE GUITARE.mp4'},
  {'icon': iconImage, 'title': 'Demons Fingerstyle Guitar Cover By James Bartholomew', 'file': '../../../../../../../Test/Music/Akk/Demons - Fingerstyle Guitar Cover By James Bartholomew.webm'},
  {'icon': iconImage, 'title': 'Dust In The Wind Gabriella Quevedo', 'file': '../../../../../../../Test/Music/Akk/Dust In The Wind - Gabriella Quevedo.mp4'},
  {'icon': iconImage, 'title': 'Ecstasy Of Gold Spanish Guitar Fingerstyle', 'file': '../../../../../../../Test/Music/Akk/ECSTASY OF GOLD - SPANISH GUITAR FINGERSTYLE.mp4'},
  {'icon': iconImage, 'title': 'Eleanor Rigby Acoustic Guitar Lesson Note Tabs', 'file': '../../../../../../../Test/Music/Akk/Eleanor Rigby  Acoustic guitar lesson note tabs.mp4'},
  {'icon': iconImage, 'title': 'Eleanor Rigby Guitar Lesson (easy)', 'file': '../../../../../../../Test/Music/Akk/Eleanor Rigby - Guitar Lesson (easy).mp4'},
  {'icon': iconImage, 'title': 'Elena Yerevan Белый Конь', 'file': '../../../../../../../Test/Music/Akk/Elena -Yerevan- Белый конь.mp4'},
  {'icon': iconImage, 'title': 'Enjoy The Silence Guitar Lesson Depeche Mode', 'file': '../../../../../../../Test/Music/Akk/Enjoy the Silence Guitar Lesson - Depeche Mode.mp4'},
  {'icon': iconImage, 'title': 'Enter Sandman By Metallica Legendary Riff #1', 'file': '../../../../../../../Test/Music/Akk/Enter Sandman by Metallica - Legendary Riff #1.mp4'},
  {'icon': iconImage, 'title': 'Et Si Tu Nexistais Pas', 'file': '../../../../../../../Test/Music/Akk/Et Si Tu N%27existais Pas.mp4'},
  {'icon': iconImage, 'title': 'Fly Ludovico Einaudi Intouchables Piano Tutorial By Plutax Synthesia', 'file': '../../../../../../../Test/Music/Akk/Fly - Ludovico Einaudi Intouchables Piano Tutorial by PlutaX Synthesia.mp4'},
  {'icon': iconImage, 'title': 'Forrest Gump Soundtrack', 'file': '../../../../../../../Test/Music/Akk/Forrest Gump Soundtrack.mp4'},
  {'icon': iconImage, 'title': 'Fragile 1 2 Intro Verse Sting How To Play Acoustic Tutorial', 'file': '../../../../../../../Test/Music/Akk/Fragile 1_2 - Intro_Verse - Sting - How to play_ Acoustic Tutorial.mp4'},
  {'icon': iconImage, 'title': 'Fragile 2 2 Chorus Sting How To Play Acoustic Tutorial', 'file': '../../../../../../../Test/Music/Akk/Fragile 2_2 - Chorus - Sting - How to play_ Acoustic Tutorial.mp4'},
  {'icon': iconImage, 'title': 'Help! Guitar Cover', 'file': '../../../../../../../Test/Music/Akk/Help! - Guitar Cover.mp4'},
  {'icon': iconImage, 'title': 'Help! Guitar Secrets', 'file': '../../../../../../../Test/Music/Akk/Help! Guitar Secrets.mp4'},
  {'icon': iconImage, 'title': 'Hero Of The Day By Metallica United We Tab', 'file': '../../../../../../../Test/Music/Akk/Hero of the Day by Metallica - United We Tab.mp4'},
  {'icon': iconImage, 'title': 'Hero Of The Day Guitar Lesson Metallica', 'file': '../../../../../../../Test/Music/Akk/Hero of the Day Guitar Lesson - Metallica.mp4'},
  {'icon': iconImage, 'title': 'High Hopes', 'file': '../../../../../../../Test/Music/Akk/High-Hopes.mp4'},
  {'icon': iconImage, 'title': 'High Hopes (piano Cover)', 'file': '../../../../../../../Test/Music/Akk/High Hopes (Piano Cover).mp4'},
  {'icon': iconImage, 'title': 'High Hopes Piano Cover', 'file': '../../../../../../../Test/Music/Akk/High Hopes - piano cover.webm'},
  {'icon': iconImage, 'title': 'Honor Him Guitar Fingerstyle', 'file': '../../../../../../../Test/Music/Akk/HONOR HIM - Guitar FingerStyle.mp4'},
  {'icon': iconImage, 'title': 'Hotel California Gabriella Quevedo', 'file': '../../../../../../../Test/Music/Akk/Hotel California - Gabriella Quevedo.mp4'},
  {'icon': iconImage, 'title': 'House Of The Rising Sun', 'file': '../../../../../../../Test/Music/Akk/House Of The Rising Sun.mp4'},
  {'icon': iconImage, 'title': 'Interstellar Theme (day One)', 'file': '../../../../../../../Test/Music/Akk/Interstellar Theme (Day One).webm'},
  {'icon': iconImage, 'title': 'Johnny B Goode Larissa Liveir (1080p 30fps H264 128kbit Aac)', 'file': '../../../../../../../Test/Music/Akk/Johnny B. Goode - Larissa Liveir (1080p_30fps_H264-128kbit_AAC).mp4'},
  {'icon': iconImage, 'title': 'Lost On Youu', 'file': '../../../../../../../Test/Music/Akk/Lost on youu.mp4'},
  {'icon': iconImage, 'title': 'Low Mans Lyric Abridged Acoustic Metallica Cover', 'file': '../../../../../../../Test/Music/Akk/Low Man%27s Lyric - Abridged Acoustic Metallica Cover.mp4'},
  {'icon': iconImage, 'title': 'My Heart Will Go On', 'file': '../../../../../../../Test/Music/Akk/My Heart Will Go On.mp4'},
  {'icon': iconImage, 'title': 'My Heart Will Go On Gabriella Quevedo', 'file': '../../../../../../../Test/Music/Akk/My Heart Will Go On - Gabriella Quevedo.mp4'},
  {'icon': iconImage, 'title': 'Nothing Else Matters Gabriella Quevedo', 'file': '../../../../../../../Test/Music/Akk/Nothing Else Matters - Gabriella Quevedo.mp4'},
  {'icon': iconImage, 'title': 'One Jasmine Jams Episode 4 Metallica', 'file': '../../../../../../../Test/Music/Akk/ONE - Jasmine Jams Episode 4 _ METALLICA.mp4'},
  {'icon': iconImage, 'title': 'Parole Parole Elena Yerevan', 'file': '../../../../../../../Test/Music/Akk/Parole Parole ELENA _Yerevan.mp4'},
  {'icon': iconImage, 'title': 'Personal Jesus De Depeche Mode En Guitarra Acústica (hd) Tutorial Christianvib', 'file': '../../../../../../../Test/Music/Akk/Personal Jesus de Depeche Mode en Guitarra Acústica (HD) Tutorial - Christianvib.mp4'},
  {'icon': iconImage, 'title': 'Por Una Cabeza (carlos Gardel)', 'file': '../../../../../../../Test/Music/Akk/Por Una Cabeza (Carlos Gardel).mp4'},
  {'icon': iconImage, 'title': 'Por Una Cabeza (theme From The Scent Of A Woman) Guitar Arrangement By Nemanja Bogunovic', 'file': '../../../../../../../Test/Music/Akk/Por una Cabeza (theme from The Scent of a Woman) guitar arrangement by Nemanja Bogunovic.mp4'},
  {'icon': iconImage, 'title': 'Por Una Cabeza Scent Of A Woman Tango Guitar Cover', 'file': '../../../../../../../Test/Music/Akk/Por Una Cabeza - Scent of a woman tango. Guitar cover.mp4'},
  {'icon': iconImage, 'title': 'Send Me On My Way Rusted Root (lilos Wall Jemima Coulter Cover)', 'file': '../../../../../../../Test/Music/Akk/Send Me On My Way - Rusted Root (Lilo%27s Wall Jemima Coulter Cover).mp4'},
  {'icon': iconImage, 'title': 'Seven Nation Army Разбор', 'file': '../../../../../../../Test/Music/Akk/Seven Nation Army-Разбор.mp4'},
  {'icon': iconImage, 'title': 'Shape Of My Heart Тональность ( Fm# ) Как Играть На Гитаре Песню', 'file': '../../../../../../../Test/Music/Akk/Shape Of My Heart Тональность ( Fm# ) Как играть на гитаре песню.mp4'},
  {'icon': iconImage, 'title': 'Shine On You Crazy Diamond (cover With Tab)', 'file': '../../../../../../../Test/Music/Akk/Shine On You Crazy Diamond (Cover With Tab).mp4'},
  {'icon': iconImage, 'title': 'Summer Presto Guitar Cover', 'file': '../../../../../../../Test/Music/Akk/Summer Presto guitar cover.mp4'},
  {'icon': iconImage, 'title': 'The Battle Guitare Fingerstyle', 'file': '../../../../../../../Test/Music/Akk/THE BATTLE - Guitare FingerStyle.mp4'},
  {'icon': iconImage, 'title': 'The Lonely Shepherd Одинокий Пастух James Last', 'file': '../../../../../../../Test/Music/Akk/The Lonely Shepherd, Одинокий пастух - James Last.mp4'},
  {'icon': iconImage, 'title': 'The Thing That Should Not Be Guitar Lesson (full Song) Metallica', 'file': '../../../../../../../Test/Music/Akk/The Thing That Should Not Be - Guitar Lesson (FULL SONG) - Metallica.mp4'},
  {'icon': iconImage, 'title': 'The Unforgiven Metallica Fingerstyle', 'file': '../../../../../../../Test/Music/Akk/The Unforgiven - Metallica _ Fingerstyle.mp4'},
  {'icon': iconImage, 'title': 'The Unforgiven Metallica Fingerstyle На Гитаре Ноты Табы Разбор', 'file': '../../../../../../../Test/Music/Akk/The Unforgiven - Metallica _ Fingerstyle На гитаре _ Ноты Табы Разбор.mp4'},
  {'icon': iconImage, 'title': 'Time (piano Version) Sheet Music', 'file': '../../../../../../../Test/Music/Akk/Time (Piano Version)   Sheet Music.mp4'},
  {'icon': iconImage, 'title': 'Tuto Godfather Le Parrain Tablature Fingerstyle Guitar', 'file': '../../../../../../../Test/Music/Akk/TUTO - GODFATHER - LE PARRAIN - tablature - FINGERSTYLE GUITAR.mp4'},
  {'icon': iconImage, 'title': 'Tuyo (live) September 26 2016', 'file': '../../../../../../../Test/Music/Akk/Tuyo (live) - September 26, 2016.mp4'},
  {'icon': iconImage, 'title': 'Tuyo (narcos Theme Song) Easy Piano Tutorial How To Play Tuyo On Piano', 'file': '../../../../../../../Test/Music/Akk/Tuyo (Narcos Theme Song) - EASY Piano Tutorial - How to play Tuyo on piano.mp4'},
  {'icon': iconImage, 'title': 'Tuyo Narcos Intro Song (live @le Guess Who 2018)', 'file': '../../../../../../../Test/Music/Akk/Tuyo - Narcos intro song (live @Le Guess Who 2018).webm'},
  {'icon': iconImage, 'title': 'Tuyo Sesc Pinheiros', 'file': '../../../../../../../Test/Music/Akk/Tuyo _ SESC Pinheiros.mp4'},
  {'icon': iconImage, 'title': 'Videoplayback', 'file': '../../../../../../../Test/Music/Akk/videoplayback.mp4'},
  {'icon': iconImage, 'title': 'Was Ich Liebe Guitar Lesson W Tabs (720p 30fps H264 128kbit Aac)', 'file': '../../../../../../../Test/Music/Akk/Was Ich Liebe Guitar Lesson w_ TABS (720p_30fps_H264-128kbit_AAC).mp4'},
  {'icon': iconImage, 'title': 'Welcome Home (sanitarium) (guitar Cover With Tab)', 'file': '../../../../../../../Test/Music/Akk/WELCOME HOME (SANITARIUM) (Guitar cover with TAB).mp4'},
  {'icon': iconImage, 'title': 'Welcome Home (sanitarium) Full Guitar Cover', 'file': '../../../../../../../Test/Music/Akk/Welcome Home (Sanitarium) FULL Guitar Cover.mp4'},
  {'icon': iconImage, 'title': 'Whatever It Takes Lyrics', 'file': '../../../../../../../Test/Music/Akk/Whatever It Takes - Lyrics.mp4'},
  {'icon': iconImage, 'title': 'Whatever It Takes Разбор На Гитаре Как Играть Аккорды', 'file': '../../../../../../../Test/Music/Akk/Whatever It Takes разбор на гитаре как играть аккорды.mp4'},
  {'icon': iconImage, 'title': 'While My Guitar Gently Weeps', 'file': '../../../../../../../Test/Music/Akk/While My Guitar Gently Weeps.mp4'},
  {'icon': iconImage, 'title': 'Yesterday Gabriella Quevedo', 'file': '../../../../../../../Test/Music/Akk/Yesterday - Gabriella Quevedo.mp4'},
  {'icon': iconImage, 'title': 'Ария', 'file': '../../../../../../../Test/Music/Akk/Ария.mp4'},
  {'icon': iconImage, 'title': 'Бережкарики А Иващенко (кавер)', 'file': '../../../../../../../Test/Music/Akk/Бережкарики, А.Иващенко (кавер).mp4'},
  {'icon': iconImage, 'title': 'Бременские Музыканты Бременские Музыканты', 'file': '../../../../../../../Test/Music/Akk/Бременские музыканты - Бременские музыканты.mp4'},
  {'icon': iconImage, 'title': 'Бременские Музыканты Музыкальное Вскрытие', 'file': '../../../../../../../Test/Music/Akk/Бременские музыканты - Музыкальное вскрытие.mp4'},
  {'icon': iconImage, 'title': 'Бременские Музыкантыбуратино Ну Погоди Garri Pat', 'file': '../../../../../../../Test/Music/Akk/Бременские Музыканты,Буратино- %27Ну Погоди%27 , Garri Pat.mp4'},
  {'icon': iconImage, 'title': 'Вальс Из К Ф Мой Ласковый И Нежный Зверь Fingerstyle Cover', 'file': '../../../../../../../Test/Music/Akk/Вальс из к_ф %27Мой ласковый и нежный зверь%27 _ Fingerstyle cover.mp4'},
  {'icon': iconImage, 'title': 'Вальс Из К Ф Мой Ласковый И Нежный Зверь На Гитаре Разбор Ноты Табы', 'file': '../../../../../../../Test/Music/Akk/Вальс из к_ф %27Мой ласковый и нежный зверь%27 _ На гитаре + разбор _ Ноты Табы.mp4'},
  {'icon': iconImage, 'title': 'Ваше Благородие ♫ Разбор Аккорды ♫ Как Играть На Гитаре Уроки Игры !', 'file': '../../../../../../../Test/Music/Akk/Ваше благородие ♫ РАЗБОР АККОРДЫ ♫ Как играть на гитаре - уроки игры !.webm'},
  {'icon': iconImage, 'title': 'Гже Же Ты Разбор Соло Тональность ( Dm ) Как Играть На Гитаре Песню', 'file': '../../../../../../../Test/Music/Akk/Гже же ты - РАЗБОР СОЛО - Тональность ( Dm ) Как играть на гитаре песню.mp4'},
  {'icon': iconImage, 'title': 'Гори Огонь Гори', 'file': '../../../../../../../Test/Music/Akk/гори огонь гори.mp4'},
  {'icon': iconImage, 'title': 'Гудбай Америка', 'file': '../../../../../../../Test/Music/Akk/Гудбай, Америка.mp4'},
  {'icon': iconImage, 'title': 'Если Б Не Было Тебя Соло На Гитаре(разбор) Тональность ( Нm )', 'file': '../../../../../../../Test/Music/Akk/Если б не было тебя - Соло на гитаре(разбор) Тональность ( Нm ).mp4'},
  {'icon': iconImage, 'title': 'Жмурки На Гитаре Из Фильма', 'file': '../../../../../../../Test/Music/Akk/Жмурки - на гитаре из фильма.mp4'},
  {'icon': iconImage, 'title': 'Иерусалим Разбор Вступления И Бой На Гитаре', 'file': '../../../../../../../Test/Music/Akk/Иерусалим - Разбор Вступления и Бой на гитаре.mp4'},
  {'icon': iconImage, 'title': 'Кончится Лето2', 'file': '../../../../../../../Test/Music/Akk/Кончится лето2.mp4'},
  {'icon': iconImage, 'title': 'Конь Тональность (hm) Песни Под Гитару', 'file': '../../../../../../../Test/Music/Akk/Конь Тональность (Hm) Песни под гитару.mp4'},
  {'icon': iconImage, 'title': 'Корабли', 'file': '../../../../../../../Test/Music/Akk/Корабли.mp4'},
  {'icon': iconImage, 'title': 'Легенда (1988)', 'file': '../../../../../../../Test/Music/Akk/Легенда (1988).mp4'},
  {'icon': iconImage, 'title': 'Мексиканский Бой На Гитаре', 'file': '../../../../../../../Test/Music/Akk/Мексиканский Бой на гитаре.mp4'},
  {'icon': iconImage, 'title': 'Мой Рок Н Ролл Разбор Corus Guitar Guide #77', 'file': '../../../../../../../Test/Music/Akk/Мой рок-н-ролл - Разбор COrus Guitar Guide #77.webm'},
  {'icon': iconImage, 'title': 'Мы Как Трепетные Птицы Аккорды Обучение На Гитаре ', 'file': '../../../../../../../Test/Music/Akk/Мы, как трепетные птицы аккорды, обучение на гитаре..mp4'},
  {'icon': iconImage, 'title': 'Непогода Песня Из К Ф Мэри Поппинс До Свидания Как Играть На Гитаре Песню', 'file': '../../../../../../../Test/Music/Akk/Непогода - Песня из к_ф Мэри Поппинс, до свидания - Как играть на гитаре песню.mp4'},
  {'icon': iconImage, 'title': 'Ночная Дорога Ст Ю Визбор Муз С Никитин И В Берковский', 'file': '../../../../../../../Test/Music/Akk/Ночная дорога - ст. Ю.Визбор, муз. С.Никитин и В.Берковский.mp4'},
  {'icon': iconImage, 'title': 'Она', 'file': '../../../../../../../Test/Music/Akk/Она.mp4'},
  {'icon': iconImage, 'title': 'От Кореи До Карелии Акк', 'file': '../../../../../../../Test/Music/Akk/От Кореи до Карелии аКК.mp4'},
  {'icon': iconImage, 'title': 'Охота На Волков Аккорды Высоцкого', 'file': '../../../../../../../Test/Music/Akk/Охота на волков. Аккорды Высоцкого.mp4'},
  {'icon': iconImage, 'title': 'Переведи Меня Через Майдан', 'file': '../../../../../../../Test/Music/Akk/Переведи меня через майдан.mp4'},
  {'icon': iconImage, 'title': 'Переведи Меня Через Майдан Тональность ( Еm ) Как Играть На Гитаре Песню', 'file': '../../../../../../../Test/Music/Akk/Переведи меня через майдан Тональность ( Еm ) Как играть на гитаре песню.mp4'},
  {'icon': iconImage, 'title': 'Перемен Кино (аккорды На Гитаре) Играй Как Бенедикт! Выпуск №68', 'file': '../../../../../../../Test/Music/Akk/ПЕРЕМЕН - КИНО (аккорды на гитаре) Играй, как Бенедикт! Выпуск №68.webm'},
  {'icon': iconImage, 'title': 'Песня Красной Шапочки(бегемотыкрокодилы) Guitar Cover Garri Pat', 'file': '../../../../../../../Test/Music/Akk/Песня красной шапочки(Бегемоты,Крокодилы)- guitar Cover Garri Pat.mp4'},
  {'icon': iconImage, 'title': 'Под Музыку Вивальди', 'file': '../../../../../../../Test/Music/Akk/Под музыку Вивальди.mp4'},
  {'icon': iconImage, 'title': 'Пока Горит Свеча А Макаревич (cover)', 'file': '../../../../../../../Test/Music/Akk/Пока горит свеча А. Макаревич (cover).mp4'},
  {'icon': iconImage, 'title': 'Полковнику Никто Не Пишет Тональность ( Gm ) Как Играть На Гитаре Песню', 'file': '../../../../../../../Test/Music/Akk/Полковнику никто не пишет Тональность ( Gm ) Как играть на гитаре песню.mp4'},
  {'icon': iconImage, 'title': 'Популярные Песни На Фортепиано В Обр А Дзарковски (dzarkovsky) Попурри На Пианино', 'file': '../../../../../../../Test/Music/Akk/Популярные песни на фортепиано в обр. А. Дзарковски (Dzarkovsky)  Попурри на пианино.mp4'},
  {'icon': iconImage, 'title': 'Последняя Поэма', 'file': '../../../../../../../Test/Music/Akk/Последняя поэма.mp4'},
  {'icon': iconImage, 'title': 'Последняя Поэма Из К Ф Вам И Не Снилось Fingerstyle Cover', 'file': '../../../../../../../Test/Music/Akk/Последняя поэма из к_ф %27Вам и не снилось%27 _ Fingerstyle cover.mp4'},
  {'icon': iconImage, 'title': 'Послепобедный Вальс А Я Розенбаум', 'file': '../../../../../../../Test/Music/Akk/Послепобедный вальс  А.Я. Розенбаум.mp4'},
  {'icon': iconImage, 'title': 'Послепобедный Вальс А Я Розенбаум', 'file': '../../../../../../../Test/Music/Akk/Послепобедный вальс - А.Я. Розенбаум.mp4'},
  {'icon': iconImage, 'title': 'Просто Взорвал Интернет Самая Сложная Песня На Гитаре!', 'file': '../../../../../../../Test/Music/Akk/Просто взорвал интернет самая сложная песня на гитаре!.mp4'},
  {'icon': iconImage, 'title': 'Расстреляли Рассветами', 'file': '../../../../../../../Test/Music/Akk/Расстреляли рассветами.mp4'},
  {'icon': iconImage, 'title': 'Сергей Маврин Кровь За Кровь(ария) Фрагмент 2020', 'file': '../../../../../../../Test/Music/Akk/Сергей Маврин - %27Кровь за кровь%27(Ария). Фрагмент. 2020.mp4'},
  {'icon': iconImage, 'title': 'Сказка', 'file': '../../../../../../../Test/Music/Akk/Сказка.mp4'},
  {'icon': iconImage, 'title': 'Скромный Настройщик Самоучка В Магазине Музыкальных Инструментов', 'file': '../../../../../../../Test/Music/Akk/Скромный настройщик-самоучка в магазине музыкальных инструментов.webm'},
  {'icon': iconImage, 'title': 'Следствие Ведут Колобки Fingerstyle Cover', 'file': '../../../../../../../Test/Music/Akk/Следствие ведут Колобки _ Fingerstyle cover.mp4'},
  {'icon': iconImage, 'title': 'Следствие Ведут Колобки Guitar Cover Garri Pat', 'file': '../../../../../../../Test/Music/Akk/Следствие ведут КОЛОБКИ- guitar Cover Garri Pat.mp4'},
  {'icon': iconImage, 'title': 'Спокойная Ночь', 'file': '../../../../../../../Test/Music/Akk/Спокойная ночь.mp4'},
  {'icon': iconImage, 'title': 'Три Лучших Гитариста В Мире 2012 Года', 'file': '../../../../../../../Test/Music/Akk/Три лучших гитариста в мире 2012 года.mp4'},
  {'icon': iconImage, 'title': 'Человек И Кошка Гитара', 'file': '../../../../../../../Test/Music/Akk/Человек и кошка. Гитара.mp4'},
  {'icon': iconImage, 'title': 'Человек И Кошка Ноль Как Играть На Гитаре (3 Партии) Табы Аккорды Гитарин', 'file': '../../../../../../../Test/Music/Akk/Человек и кошка - НОЛЬ   Как играть на гитаре (3 партии)  Табы, аккорды - Гитарин.mp4'},
  {'icon': iconImage, 'title': 'Чтоб Ветра Тебя Сынок Знали(разборка) А Я Розенбаум', 'file': '../../../../../../../Test/Music/Akk/Чтоб ветра тебя сынок знали(разборка), А.Я. Розенбаум.webm'},
  {'icon': iconImage, 'title': 'Этот Гитарист Точно Вошел В Историю Голоса', 'file': '../../../../../../../Test/Music/Akk/Этот гитарист точно вошел в историю Голоса.mp4'},
  {'icon': iconImage, 'title': 'Я Свободен Соло На Электрогитаре', 'file': '../../../../../../../Test/Music/Akk/Я СВОБОДЕН соло на электрогитаре.mp4'},
  {'icon': iconImage, 'title': 'Я Так Соскучился', 'file': '../../../../../../../Test/Music/Akk/Я так соскучился.mp4'},
]);
})

document.getElementById('akvarium').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Finalis Jutto', 'file': '../../../../../../../Test/Music/Akvarium/1997 - Рапсодия для воды/Finalis Jutto.mp3'},
  {'icon': iconImage, 'title': 'Город', 'file': '../../../../../../../Test/Music/Akvarium/2003 - БГ 50/Город.mp3'},
  {'icon': iconImage, 'title': 'Здравствуй Моя Смерть', 'file': '../../../../../../../Test/Music/Akvarium/1984 - День серебра/Здравствуй моя Смерть.mp3'},
  {'icon': iconImage, 'title': 'Лейса Песня На Просторе', 'file': '../../../../../../../Test/Music/Akvarium/1996 - Двадцать лет спустя/Лейса песня на просторе.mp3'},
  {'icon': iconImage, 'title': 'Не Пей Вина Гертруда', 'file': '../../../../../../../Test/Music/Akvarium/2000 - Территория/Не Пей Вина Гертруда.mp3'},
  {'icon': iconImage, 'title': 'Пока Горит Свеча', 'file': '../../../../../../../Test/Music/Akvarium/1996 - Двадцать лет спустя/Пока горит свеча.mp3'},
  {'icon': iconImage, 'title': 'Русская Нирвана', 'file': '../../../../../../../Test/Music/Akvarium/1994 - КОСТРОМА MON AMOUR/Русская Нирвана.mp3'},
  {'icon': iconImage, 'title': 'Серебро Господа', 'file': '../../../../../../../Test/Music/Akvarium/1997 - Рапсодия для воды/Серебро Господа.mp3'},
  {'icon': iconImage, 'title': 'Электричество', 'file': '../../../../../../../Test/Music/Akvarium/1984 - День серебра/Электричество.mp3'},
]);
})

document.getElementById('alla').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Can No Laditi', 'file': '../../../../../../../Test/Music/ALLA/Не делайте мне больно, господа/Can No Laditi.mp3'},
  {'icon': iconImage, 'title': 'А Знаешь Все Еще Будет', 'file': '../../../../../../../Test/Music/ALLA/На дороге ожиданий/А знаешь, все еще будет.WAV'},
  {'icon': iconImage, 'title': 'А Я В Воду Войду', 'file': '../../../../../../../Test/Music/ALLA/Да!/А я в воду войду.WAV'},
  {'icon': iconImage, 'title': 'Автомобиль', 'file': '../../../../../../../Test/Music/ALLA/Ах, как хочется жить!/Автомобиль.WAV'},
  {'icon': iconImage, 'title': 'Айсберг', 'file': '../../../../../../../Test/Music/ALLA/По острым иглам яркого огня/Айсберг.WAV'},
  {'icon': iconImage, 'title': 'Арлекино', 'file': '../../../../../../../Test/Music/ALLA/По острым иглам яркого огня/Арлекино.mp3'},
  {'icon': iconImage, 'title': 'Ах Как Живется Мне Сегодня!', 'file': '../../../../../../../Test/Music/ALLA/Не делайте мне больно, господа/Ах, как живется мне сегодня!.mp3'},
  {'icon': iconImage, 'title': 'Балет', 'file': '../../../../../../../Test/Music/ALLA/На дороге ожиданий/Балет.WAV'},
  {'icon': iconImage, 'title': 'Бежала Голову Сломя', 'file': '../../../../../../../Test/Music/ALLA/Не делайте мне больно, господа/Бежала голову сломя.mp3'},
  {'icon': iconImage, 'title': 'Без Меня', 'file': '../../../../../../../Test/Music/ALLA/По острым иглам яркого огня/Без меня.WAV'},
  {'icon': iconImage, 'title': 'Бессонница', 'file': '../../../../../../../Test/Music/ALLA/Не делайте мне больно, господа/Бессонница.mp3'},
  {'icon': iconImage, 'title': 'Близкие Люди', 'file': '../../../../../../../Test/Music/ALLA/Билет на вчерашний спектакль/Близкие люди.WAV'},
  {'icon': iconImage, 'title': 'Бог С Тобой', 'file': '../../../../../../../Test/Music/ALLA/Встречи в пути/Бог с тобой.WAV'},
  {'icon': iconImage, 'title': 'Большак', 'file': '../../../../../../../Test/Music/ALLA/Не делайте мне больно, господа/Большак.mp3'},
  {'icon': iconImage, 'title': 'В Петербурге Гроза', 'file': '../../../../../../../Test/Music/ALLA/Да!/В Петербурге гроза.WAV'},
  {'icon': iconImage, 'title': 'Волшебник', 'file': '../../../../../../../Test/Music/ALLA/По острым иглам яркого огня/Волшебник.WAV'},
  {'icon': iconImage, 'title': 'Все Могут Короли', 'file': '../../../../../../../Test/Music/ALLA/По острым иглам яркого огня/Все могут короли.WAV'},
  {'icon': iconImage, 'title': 'Встреча В Пути', 'file': '../../../../../../../Test/Music/ALLA/Встречи в пути/Встреча в пути.WAV'},
  {'icon': iconImage, 'title': 'Голубь Сизокрылый', 'file': '../../../../../../../Test/Music/ALLA/Встречи в пути/Голубь сизокрылый.WAV'},
  {'icon': iconImage, 'title': 'Гонка', 'file': '../../../../../../../Test/Music/ALLA/Только в кино/Гонка.WAV'},
  {'icon': iconImage, 'title': 'Грабитель', 'file': '../../../../../../../Test/Music/ALLA/Не делайте мне больно, господа/Грабитель.mp3'},
  {'icon': iconImage, 'title': 'Две Звезды', 'file': '../../../../../../../Test/Music/ALLA/Билет на вчерашний спектакль/Две звезды.WAV'},
  {'icon': iconImage, 'title': 'Две Рюмки', 'file': '../../../../../../../Test/Music/ALLA/Не делайте мне больно, господа/Две рюмки.mp3'},
  {'icon': iconImage, 'title': 'Делу Время', 'file': '../../../../../../../Test/Music/ALLA/По острым иглам яркого огня/Делу время.WAV'},
  {'icon': iconImage, 'title': 'И Зимой И Летом', 'file': '../../../../../../../Test/Music/ALLA/Ах, как хочется жить!/И зимой и летом.mp3'},
  {'icon': iconImage, 'title': 'Как Тревожен Этот Путь', 'file': '../../../../../../../Test/Music/ALLA/И в этом вся моя печаль/Как тревожен этот путь.WAV'},
  {'icon': iconImage, 'title': 'Когда Я Буду Бабушкой', 'file': '../../../../../../../Test/Music/ALLA/Песни на бис/Когда я буду бабушкой.WAV'},
  {'icon': iconImage, 'title': 'Колдун', 'file': '../../../../../../../Test/Music/ALLA/Не делайте мне больно, господа/Колдун.mp3'},
  {'icon': iconImage, 'title': 'Коралловые Бусы', 'file': '../../../../../../../Test/Music/ALLA/На дороге ожиданий/Коралловые бусы.WAV'},
  {'icon': iconImage, 'title': 'Королева', 'file': '../../../../../../../Test/Music/ALLA/Размышления у камина/Королева.WAV'},
  {'icon': iconImage, 'title': 'Куда Все Уходят', 'file': '../../../../../../../Test/Music/ALLA/Не делайте мне больно, господа/Куда все уходят.mp3'},
  {'icon': iconImage, 'title': 'Любовь Похожая На Сон', 'file': '../../../../../../../Test/Music/ALLA/Не делайте мне больно, господа/Любовь, похожая на сон.mp3'},
  {'icon': iconImage, 'title': 'Мал Помалу', 'file': '../../../../../../../Test/Music/ALLA/Да!/Мал-помалу.WAV'},
  {'icon': iconImage, 'title': 'Между Небом И Землей', 'file': '../../../../../../../Test/Music/ALLA/Встречи в пути/Между небом и землей.WAV'},
  {'icon': iconImage, 'title': 'Миллион Алых Роз', 'file': '../../../../../../../Test/Music/ALLA/По острым иглам яркого огня/Миллион алых роз.WAV'},
  {'icon': iconImage, 'title': 'Милый Мой', 'file': '../../../../../../../Test/Music/ALLA/Ах, как хочется жить!/Милый мой.WAV'},
  {'icon': iconImage, 'title': 'Мимоходом', 'file': '../../../../../../../Test/Music/ALLA/Это завтра, а сегодня/Мимоходом.WAV'},
  {'icon': iconImage, 'title': 'Мэри', 'file': '../../../../../../../Test/Music/ALLA/Не делайте мне больно, господа/Мэри.mp3'},
  {'icon': iconImage, 'title': 'Надо Же', 'file': '../../../../../../../Test/Music/ALLA/Билет на вчерашний спектакль/Надо же.WAV'},
  {'icon': iconImage, 'title': 'Настоящий Полковник', 'file': '../../../../../../../Test/Music/ALLA/Не делайте мне больно, господа/Настоящий полковник.mp3'},
  {'icon': iconImage, 'title': 'Не Делайте Мне Больно Господа', 'file': '../../../../../../../Test/Music/ALLA/Не делайте мне больно, господа/Не делайте мне больно, господа.mp3'},
  {'icon': iconImage, 'title': 'Не Отрекаются Любя', 'file': '../../../../../../../Test/Music/ALLA/По острым иглам яркого огня/Не отрекаются любя.WAV'},
  {'icon': iconImage, 'title': 'Непогода', 'file': '../../../../../../../Test/Music/ALLA/Непогода.mp3'},
  {'icon': iconImage, 'title': 'Непогода', 'file': '../../../../../../../Test/Music/ALLA/Непогода.mp4'},
  {'icon': iconImage, 'title': 'О Любви Не Говори', 'file': '../../../../../../../Test/Music/ALLA/Только в кино/О любви не говори.WAV'},
  {'icon': iconImage, 'title': 'Озеро Надежды', 'file': '../../../../../../../Test/Music/ALLA/Встречи в пути/Озеро надежды.WAV'},
  {'icon': iconImage, 'title': 'Осенний Поцелуй', 'file': '../../../../../../../Test/Music/ALLA/Размышления у камина/Осенний поцелуй.WAV'},
  {'icon': iconImage, 'title': 'Паромщик', 'file': '../../../../../../../Test/Music/ALLA/По острым иглам яркого огня/Паромщик.WAV'},
  {'icon': iconImage, 'title': 'Песенка Первоклассника', 'file': '../../../../../../../Test/Music/ALLA/По острым иглам яркого огня/Песенка первоклассника.WAV'},
  {'icon': iconImage, 'title': 'Песенка Про Меня', 'file': '../../../../../../../Test/Music/ALLA/По острым иглам яркого огня/Песенка про меня.WAV'},
  {'icon': iconImage, 'title': 'Позови Меня С Собой', 'file': '../../../../../../../Test/Music/ALLA/Да!/Позови меня с собой.WAV'},
  {'icon': iconImage, 'title': 'Пригласите Танцевать', 'file': '../../../../../../../Test/Music/ALLA/Встречи в пути/Пригласите танцевать.WAV'},
  {'icon': iconImage, 'title': 'Придумай Что Нибудь', 'file': '../../../../../../../Test/Music/ALLA/Встречи в пути/Придумай что-нибудь.WAV'},
  {'icon': iconImage, 'title': 'Примадонна', 'file': '../../../../../../../Test/Music/ALLA/Да!/Примадонна.WAV'},
  {'icon': iconImage, 'title': 'Примадонна (фрн )', 'file': '../../../../../../../Test/Music/ALLA/Да!/Примадонна (фрн.).WAV'},
  {'icon': iconImage, 'title': 'Пришла И Говорю', 'file': '../../../../../../../Test/Music/ALLA/Только в кино/Пришла и говорю.WAV'},
  {'icon': iconImage, 'title': 'Про Любовь', 'file': '../../../../../../../Test/Music/ALLA/Барышня с крестьянской заставы/Про любовь.WAV'},
  {'icon': iconImage, 'title': 'Пропади Ты Пропадом', 'file': '../../../../../../../Test/Music/ALLA/Размышления у камина/Пропади ты пропадом.WAV'},
  {'icon': iconImage, 'title': 'Прости Поверь', 'file': '../../../../../../../Test/Music/ALLA/И в этом вся моя печаль/Прости, поверь.WAV'},
  {'icon': iconImage, 'title': 'Реквием', 'file': '../../../../../../../Test/Music/ALLA/Размышления у камина/Реквием.WAV'},
  {'icon': iconImage, 'title': 'Свирель', 'file': '../../../../../../../Test/Music/ALLA/Размышления у камина/Свирель.WAV'},
  {'icon': iconImage, 'title': 'Сильная Женщина', 'file': '../../../../../../../Test/Music/ALLA/Не делайте мне больно, господа/Сильная женщина.mp3'},
  {'icon': iconImage, 'title': 'Старинные Часы', 'file': '../../../../../../../Test/Music/ALLA/По острым иглам яркого огня/Старинные часы.WAV'},
  {'icon': iconImage, 'title': 'Сто Друзей', 'file': '../../../../../../../Test/Music/ALLA/Это завтра, а сегодня/Сто друзей.WAV'},
  {'icon': iconImage, 'title': 'Счастье', 'file': '../../../../../../../Test/Music/ALLA/Да!/Счастье.WAV'},
  {'icon': iconImage, 'title': 'Так Иди Же Сюда', 'file': '../../../../../../../Test/Music/ALLA/Не делайте мне больно, господа/Так иди же сюда.mp3'},
  {'icon': iconImage, 'title': 'Три Счастливых Дня', 'file': '../../../../../../../Test/Music/ALLA/Встречи в пути/Три счастливых дня.WAV'},
  {'icon': iconImage, 'title': 'Ты На Свете Есть', 'file': '../../../../../../../Test/Music/ALLA/На дороге ожиданий/Ты на свете есть.WAV'},
  {'icon': iconImage, 'title': 'Фотограф', 'file': '../../../../../../../Test/Music/ALLA/Встречи в пути/Фотограф.WAV'},
  {'icon': iconImage, 'title': 'Чао', 'file': '../../../../../../../Test/Music/ALLA/Билет на вчерашний спектакль/Чао.WAV'},
  {'icon': iconImage, 'title': 'Этот Мир', 'file': '../../../../../../../Test/Music/ALLA/Ах, как хочется жить!/Этот мир.mp3'},
  {'icon': iconImage, 'title': 'Я Больше Не Ревную', 'file': '../../../../../../../Test/Music/ALLA/И в этом вся моя печаль/Я больше не ревную.WAV'},
  {'icon': iconImage, 'title': 'Я Тебя Никому Не Отдам', 'file': '../../../../../../../Test/Music/ALLA/Не делайте мне больно, господа/Я тебя никому не отдам.mp3'},
  {'icon': iconImage, 'title': 'Я Тебя Поцеловала', 'file': '../../../../../../../Test/Music/ALLA/Это завтра, а сегодня/Я тебя поцеловала.WAV'},
]);
})

document.getElementById('aqua').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Barbie Girl', 'file': '../../../../../../../Test/Music/Aqua/Barbie girl.mp3'},
  {'icon': iconImage, 'title': 'Cartoon Heroes', 'file': '../../../../../../../Test/Music/Aqua/Cartoon heroes.mp3'},
  {'icon': iconImage, 'title': 'My Oh My', 'file': '../../../../../../../Test/Music/Aqua/My oh my.mp3'},
  {'icon': iconImage, 'title': 'Turn Back Time', 'file': '../../../../../../../Test/Music/Aqua/Turn Back Time.mp3'},
]);
})

document.getElementById('avrillavign').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Complicated', 'file': '../../../../../../../Test/Music/Avril Lavign/2002 - Complicated/Complicated.mp3'},
  {'icon': iconImage, 'title': 'Dont Tell Me', 'file': '../../../../../../../Test/Music/Avril Lavign/2004 - Don%27t Tell Me/Don%27t Tell Me.mp3'},
  {'icon': iconImage, 'title': 'Get Over It', 'file': '../../../../../../../Test/Music/Avril Lavign/2002 - Sk8er Boi/Get Over It.mp3'},
  {'icon': iconImage, 'title': 'Girlfriend', 'file': '../../../../../../../Test/Music/Avril Lavign/2007 - Girlfriend/Girlfriend.mp3'},
  {'icon': iconImage, 'title': 'He Wasnt (live)', 'file': '../../../../../../../Test/Music/Avril Lavign/2004 - Under My Skin/He Wasn%27t (Live).mp3'},
  {'icon': iconImage, 'title': 'I Always Get What I Want', 'file': '../../../../../../../Test/Music/Avril Lavign/2004 - Nobody%27s Home/I Always Get What I Want.mp3'},
  {'icon': iconImage, 'title': 'Im With You', 'file': '../../../../../../../Test/Music/Avril Lavign/2002 - I%27m With You/I%27m With You.mp3'},
  {'icon': iconImage, 'title': 'Imagine', 'file': '../../../../../../../Test/Music/Avril Lavign/2009 - iTunes Essentials/Imagine.mp3'},
  {'icon': iconImage, 'title': 'Keep Holding On', 'file': '../../../../../../../Test/Music/Avril Lavign/2006 - Keep Holding On/Keep Holding On.mp3'},
  {'icon': iconImage, 'title': 'Knockin On Heavens Door', 'file': '../../../../../../../Test/Music/Avril Lavign/2004 - Nobody%27s Home/Knockin%27  On  Heaven%27s Door.mp3'},
  {'icon': iconImage, 'title': 'Losing Grip', 'file': '../../../../../../../Test/Music/Avril Lavign/2002 - Let Go/Losing Grip.mp3'},
  {'icon': iconImage, 'title': 'Losing Grip (live)', 'file': '../../../../../../../Test/Music/Avril Lavign/2002 - Let Go/Losing Grip (Live).mp3'},
  {'icon': iconImage, 'title': 'My Happy Ending', 'file': '../../../../../../../Test/Music/Avril Lavign/2004 - My Happy Ending/My Happy Ending.mp3'},
  {'icon': iconImage, 'title': 'Nobodys Home', 'file': '../../../../../../../Test/Music/Avril Lavign/2004 - Nobody%27s Home/Nobody%27s Home.mp3'},
  {'icon': iconImage, 'title': 'Skater Boy', 'file': '../../../../../../../Test/Music/Avril Lavign/2002 - Sk8er Boi/Skater Boy.mp3'},
  {'icon': iconImage, 'title': 'Take Me Away', 'file': '../../../../../../../Test/Music/Avril Lavign/2004 - Don%27t Tell Me/Take Me Away.mp3'},
  {'icon': iconImage, 'title': 'Things Ill Never Say', 'file': '../../../../../../../Test/Music/Avril Lavign/2009 - iTunes Essentials/Things I%27ll Never Say.mp3'},
  {'icon': iconImage, 'title': 'When Youre Gone', 'file': '../../../../../../../Test/Music/Avril Lavign/2007 - When You%27re Gone/When You%27re Gone.mp3'},
  {'icon': iconImage, 'title': 'Why', 'file': '../../../../../../../Test/Music/Avril Lavign/2002 - Complicated/Why.mp3'},
]);
})

document.getElementById('beatles').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A Hard Days Night', 'file': '../../../../../../../Test/Music/Beatles/1964 - A Hard Days Night/A Hard Day%27s Night.mp3'},
  {'icon': iconImage, 'title': 'All My Loving', 'file': '../../../../../../../Test/Music/Beatles/1963 - With The Beatles/All My Loving.mp3'},
  {'icon': iconImage, 'title': 'All You Need Is Love', 'file': '../../../../../../../Test/Music/Beatles/1967 - Magical Mystery Tour/All You Need Is Love.mp3'},
  {'icon': iconImage, 'title': 'Another Girl', 'file': '../../../../../../../Test/Music/Beatles/1965 - Help/Another Girl.mp3'},
  {'icon': iconImage, 'title': 'Any Time At All', 'file': '../../../../../../../Test/Music/Beatles/1964 - A Hard Days Night/Any Time At All.mp3'},
  {'icon': iconImage, 'title': 'Babys In Black', 'file': '../../../../../../../Test/Music/Beatles/1964 - Beatles For Sale/Baby%27s In Black.mp3'},
  {'icon': iconImage, 'title': 'Back In The Ussr', 'file': '../../../../../../../Test/Music/Beatles/1968 - White Album CD 1/Back in the USSR.mp3'},
  {'icon': iconImage, 'title': 'Cant Buy Me Love', 'file': '../../../../../../../Test/Music/Beatles/1964 - A Hard Days Night/Can%27t Buy Me Love.mp3'},
  {'icon': iconImage, 'title': 'Carry That Weight', 'file': '../../../../../../../Test/Music/Beatles/1969 - Abbey Road/Carry That Weight.mp3'},
  {'icon': iconImage, 'title': 'Devil In Her Heart', 'file': '../../../../../../../Test/Music/Beatles/1963 - With The Beatles/Devil In Her Heart.mp3'},
  {'icon': iconImage, 'title': 'Dizzy Miss Lizzie', 'file': '../../../../../../../Test/Music/Beatles/1965 - Help/Dizzy Miss Lizzie.mp3'},
  {'icon': iconImage, 'title': 'Do You Want To Know A Secret', 'file': '../../../../../../../Test/Music/Beatles/1963 - Please Please Me/Do You Want To Know A Secret.mp3'},
  {'icon': iconImage, 'title': 'Drive My Car', 'file': '../../../../../../../Test/Music/Beatles/1965 - Rubber Soul/Drive My Car.mp3'},
  {'icon': iconImage, 'title': 'Eight Days A Week', 'file': '../../../../../../../Test/Music/Beatles/1964 - Beatles For Sale/Eight Days A Week.mp3'},
  {'icon': iconImage, 'title': 'Eleanor Rigby', 'file': '../../../../../../../Test/Music/Beatles/1966 - Revolver/Eleanor Rigby.mp3'},
  {'icon': iconImage, 'title': 'For No One', 'file': '../../../../../../../Test/Music/Beatles/1966 - Revolver/For No One.mp3'},
  {'icon': iconImage, 'title': 'Girl', 'file': '../../../../../../../Test/Music/Beatles/1965 - Rubber Soul/Girl.mp3'},
  {'icon': iconImage, 'title': 'Good Day Sunshine', 'file': '../../../../../../../Test/Music/Beatles/1966 - Revolver/Good Day Sunshine.mp3'},
  {'icon': iconImage, 'title': 'Help!', 'file': '../../../../../../../Test/Music/Beatles/Help!.mp4'},
  {'icon': iconImage, 'title': 'Help!', 'file': '../../../../../../../Test/Music/Beatles/1965 - Help/Help!.mp3'},
  {'icon': iconImage, 'title': 'Here Comes The Sun', 'file': '../../../../../../../Test/Music/Beatles/1969 - Abbey Road/Here Comes The Sun.mp3'},
  {'icon': iconImage, 'title': 'I Dont Want To Spoil The Part', 'file': '../../../../../../../Test/Music/Beatles/1964 - Beatles For Sale/I Don%27t Want To Spoil The Part.mp3'},
  {'icon': iconImage, 'title': 'I Me Mine', 'file': '../../../../../../../Test/Music/Beatles/1970 - Let It Be/I Me Mine.mp3'},
  {'icon': iconImage, 'title': 'I Need You', 'file': '../../../../../../../Test/Music/Beatles/1965 - Help/I Need You.mp3'},
  {'icon': iconImage, 'title': 'I Need You', 'file': '../../../../../../../Test/Music/Beatles/I Need You.mp4'},
  {'icon': iconImage, 'title': 'I Should Have Known Better', 'file': '../../../../../../../Test/Music/Beatles/1964 - A Hard Days Night/I Should Have Known Better.mp3'},
  {'icon': iconImage, 'title': 'I Want To Tell You', 'file': '../../../../../../../Test/Music/Beatles/1966 - Revolver/I Want To Tell You.mp3'},
  {'icon': iconImage, 'title': 'I Want You', 'file': '../../../../../../../Test/Music/Beatles/1969 - Abbey Road/I Want You.mp3'},
  {'icon': iconImage, 'title': 'Im Happy Just To Dance With You', 'file': '../../../../../../../Test/Music/Beatles/1964 - A Hard Days Night/I%27m Happy Just To Dance With You.mp3'},
  {'icon': iconImage, 'title': 'It Wont Be Long', 'file': '../../../../../../../Test/Music/Beatles/1963 - With The Beatles/It Won%27t Be Long.mp3'},
  {'icon': iconImage, 'title': 'Its Only Love', 'file': '../../../../../../../Test/Music/Beatles/1965 - Help/It%27s Only Love.mp3'},
  {'icon': iconImage, 'title': 'Ive Got A Feeling', 'file': '../../../../../../../Test/Music/Beatles/1970 - Let It Be/I%27ve Got A Feeling.mp3'},
  {'icon': iconImage, 'title': 'Ive Just Seen A Face', 'file': '../../../../../../../Test/Music/Beatles/1965 - Help/I%27ve Just Seen A Face.mp3'},
  {'icon': iconImage, 'title': 'Let It Be', 'file': '../../../../../../../Test/Music/Beatles/1970 - Let It Be/Let It Be.mp3'},
  {'icon': iconImage, 'title': 'Maxwells Silver Hammer', 'file': '../../../../../../../Test/Music/Beatles/1969 - Abbey Road/Maxwell%27s Silver Hammer.mp3'},
  {'icon': iconImage, 'title': 'Michelle', 'file': '../../../../../../../Test/Music/Beatles/1965 - Rubber Soul/Michelle.mp3'},
  {'icon': iconImage, 'title': 'Misery', 'file': '../../../../../../../Test/Music/Beatles/1963 - Please Please Me/Misery.mp3'},
  {'icon': iconImage, 'title': 'No Reply', 'file': '../../../../../../../Test/Music/Beatles/1964 - Beatles For Sale/No Reply.mp3'},
  {'icon': iconImage, 'title': 'Norwegian Wood', 'file': '../../../../../../../Test/Music/Beatles/1965 - Rubber Soul/Norwegian Wood.mp3'},
  {'icon': iconImage, 'title': 'Nowhere Man', 'file': '../../../../../../../Test/Music/Beatles/1965 - Rubber Soul/Nowhere Man.mp3'},
  {'icon': iconImage, 'title': 'Ob La Di Ob La Da', 'file': '../../../../../../../Test/Music/Beatles/1968 - White Album CD 1/Ob-La-Di, Ob-La-Da.mp3'},
  {'icon': iconImage, 'title': 'Octopuss Garden', 'file': '../../../../../../../Test/Music/Beatles/1969 - Abbey Road/Octopus%27s Garden.mp3'},
  {'icon': iconImage, 'title': 'Oh! Darling', 'file': '../../../../../../../Test/Music/Beatles/1969 - Abbey Road/Oh! Darling.mp3'},
  {'icon': iconImage, 'title': 'P S I Love You', 'file': '../../../../../../../Test/Music/Beatles/1963 - Please Please Me/P.S. I Love You.mp3'},
  {'icon': iconImage, 'title': 'Penny Lane', 'file': '../../../../../../../Test/Music/Beatles/1967 - Magical Mystery Tour/Penny Lane.mp3'},
  {'icon': iconImage, 'title': 'Rock And Roll Music', 'file': '../../../../../../../Test/Music/Beatles/1964 - Beatles For Sale/Rock And Roll Music.mp3'},
  {'icon': iconImage, 'title': 'Roll Over Beethoven', 'file': '../../../../../../../Test/Music/Beatles/1963 - With The Beatles/Roll Over Beethoven.mp3'},
  {'icon': iconImage, 'title': 'Something', 'file': '../../../../../../../Test/Music/Beatles/1969 - Abbey Road/Something.mp3'},
  {'icon': iconImage, 'title': 'Tell Me Why', 'file': '../../../../../../../Test/Music/Beatles/1964 - A Hard Days Night/Tell Me Why.mp3'},
  {'icon': iconImage, 'title': 'The Night Before', 'file': '../../../../../../../Test/Music/Beatles/1965 - Help/The Night Before.mp3'},
  {'icon': iconImage, 'title': 'Think For Yourself', 'file': '../../../../../../../Test/Music/Beatles/1965 - Rubber Soul/Think For Yourself.mp3'},
  {'icon': iconImage, 'title': 'Twist And Shout', 'file': '../../../../../../../Test/Music/Beatles/1963 - Please Please Me/Twist And Shout.mp3'},
  {'icon': iconImage, 'title': 'Wait', 'file': '../../../../../../../Test/Music/Beatles/1965 - Rubber Soul/Wait.mp3'},
  {'icon': iconImage, 'title': 'While My Guitar Gently Weeps', 'file': '../../../../../../../Test/Music/Beatles/1968 - White Album CD 1/While My Guitar Gently Weeps.mp3'},
  {'icon': iconImage, 'title': 'Yellow Submarine', 'file': '../../../../../../../Test/Music/Beatles/1969 - Yellow Submarine/Yellow Submarine.mp3'},
  {'icon': iconImage, 'title': 'Yesterday', 'file': '../../../../../../../Test/Music/Beatles/1965 - Help/Yesterday.mp3'},
  {'icon': iconImage, 'title': 'You Like Me Too Much', 'file': '../../../../../../../Test/Music/Beatles/1965 - Help/You Like Me Too Much.mp3'},
  {'icon': iconImage, 'title': 'You Wont See Me', 'file': '../../../../../../../Test/Music/Beatles/1965 - Rubber Soul/You Won%27t See Me.mp3'},
  {'icon': iconImage, 'title': 'Youre Going To Lose That Girl', 'file': '../../../../../../../Test/Music/Beatles/1965 - Help/You%27re Going to Lose that Girl.mp3'},
  {'icon': iconImage, 'title': 'Youve Got To Hide Your Love Away', 'file': '../../../../../../../Test/Music/Beatles/1965 - Help/You%27ve Got to Hide Your Love Away.mp3'},
]);
})

document.getElementById('blackmore%27snight').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Again Someday', 'file': '../../../../../../../Test/Music/Blackmore%27s Night/2001 - Fires At Midnight/Again Someday.mp3'},
  {'icon': iconImage, 'title': 'Home Again', 'file': '../../../../../../../Test/Music/Blackmore%27s Night/2001 - Fires At Midnight/Home Again.mp3'},
  {'icon': iconImage, 'title': 'Olde Mill Inn', 'file': '../../../../../../../Test/Music/Blackmore%27s Night/2006 - Village Lanterne/Olde Mill inn.mp3'},
  {'icon': iconImage, 'title': 'Olde Village Lanterne', 'file': '../../../../../../../Test/Music/Blackmore%27s Night/2006 - Village Lanterne/Olde Village Lanterne.mp3'},
  {'icon': iconImage, 'title': 'Possums Last Dance', 'file': '../../../../../../../Test/Music/Blackmore%27s Night/2001 - Fires At Midnight/Possum%27s Last Dance.mp3'},
  {'icon': iconImage, 'title': 'Spanish Nights', 'file': '../../../../../../../Test/Music/Blackmore%27s Night/1999 - Under A Violet Moon/Spanish Nights.mp3'},
  {'icon': iconImage, 'title': 'Street Of Dreams', 'file': '../../../../../../../Test/Music/Blackmore%27s Night/2006 - Village Lanterne/Street of Dreams.mp3'},
  {'icon': iconImage, 'title': 'The Times They Are A Changin', 'file': '../../../../../../../Test/Music/Blackmore%27s Night/2001 - Fires At Midnight/The Times They Are A Changin.mp3'},
  {'icon': iconImage, 'title': 'Wind In The Willows', 'file': '../../../../../../../Test/Music/Blackmore%27s Night/1999 - Under A Violet Moon/Wind In The Willows.mp3'},
  {'icon': iconImage, 'title': 'Wind In The Willows', 'file': '../../../../../../../Test/Music/Blackmore%27s Night/2003-The Best Of/Wind In The Willows.mp3'},
  {'icon': iconImage, 'title': 'Wish You Were Here', 'file': '../../../../../../../Test/Music/Blackmore%27s Night/1997 - Shadow of the moon/Wish You Were Here.mp3'},
  {'icon': iconImage, 'title': 'Wish You Where Here', 'file': '../../../../../../../Test/Music/Blackmore%27s Night/2003-The Best Of/Wish You Where Here.mp3'},
]);
})

document.getElementById('boneym').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Belfast', 'file': '../../../../../../../Test/Music/Boney M/1986.The Best Of 10 Years/Belfast.mp3'},
  {'icon': iconImage, 'title': 'Brown Girl In The Ring', 'file': '../../../../../../../Test/Music/Boney M/1992 - Gold/Brown Girl In The Ring.mp3'},
  {'icon': iconImage, 'title': 'Gotta Go Home', 'file': '../../../../../../../Test/Music/Boney M/1986.The Best Of 10 Years/Gotta Go Home.mp3'},
  {'icon': iconImage, 'title': 'Have You Ever Seen The Rain', 'file': '../../../../../../../Test/Music/Boney M/2007 - Love For Sale/Have You Ever Seen The Rain.mp3'},
  {'icon': iconImage, 'title': 'Hooray! Hooray! Its A Holi Holiday', 'file': '../../../../../../../Test/Music/Boney M/1986.The Best Of 10 Years/Hooray! Hooray! It%27s A Holi-Holiday.mp3'},
  {'icon': iconImage, 'title': 'Jingle Bells', 'file': '../../../../../../../Test/Music/Boney M/1986 - The 20 Greatest Christmas Songs/Jingle Bells.mp3'},
  {'icon': iconImage, 'title': 'No Woman No Cry', 'file': '../../../../../../../Test/Music/Boney M/2007 - Take The Heat Off Me/No Woman No Cry.mp3'},
  {'icon': iconImage, 'title': 'Rasputin', 'file': '../../../../../../../Test/Music/Boney M/1978 - Nightflight To Venus/Rasputin.mp3'},
  {'icon': iconImage, 'title': 'Rivers Of Babylon', 'file': '../../../../../../../Test/Music/Boney M/1986.The Best Of 10 Years/Rivers Of Babylon.mp3'},
  {'icon': iconImage, 'title': 'Somewhere In The World', 'file': '../../../../../../../Test/Music/Boney M/1981 - Boonoonoonoos/Somewhere In The World.mp3'},
  {'icon': iconImage, 'title': 'Sunny', 'file': '../../../../../../../Test/Music/Boney M/1976 - Take The Heat Off Me/Sunny.mp3'},
  {'icon': iconImage, 'title': 'We Kill The World', 'file': '../../../../../../../Test/Music/Boney M/1981 - Boonoonoonoos/We Kill The World.mp3'},
]);
})

document.getElementById('c.c.catch').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Are You Man Enough', 'file': '../../../../../../../Test/Music/C.C.Catch/1987 - Like A Hurricane/Are You Man Enough.mp3'},
  {'icon': iconImage, 'title': 'Backseat Of Your Cadillac', 'file': '../../../../../../../Test/Music/C.C.Catch/1988 - Big Fun/Backseat of Your Cadillac.mp3'},
  {'icon': iconImage, 'title': 'Cause You Are Young', 'file': '../../../../../../../Test/Music/C.C.Catch/1986 - Catch The Catch/Cause you are young.mp3'},
  {'icon': iconImage, 'title': 'Dont Shot My Sheriff Tonight', 'file': '../../../../../../../Test/Music/C.C.Catch/1988 - Big Fun/Don%27t Shot My Sheriff Tonight.mp3'},
  {'icon': iconImage, 'title': 'Fire Of Love', 'file': '../../../../../../../Test/Music/C.C.Catch/1988 - Big Fun/Fire of Love.mp3'},
  {'icon': iconImage, 'title': 'Good Guys Only Win In Movies', 'file': '../../../../../../../Test/Music/C.C.Catch/1987 - Like A Hurricane/Good Guys Only Win In Movies.mp3'},
  {'icon': iconImage, 'title': 'Heartbreak Hotel', 'file': '../../../../../../../Test/Music/C.C.Catch/1988 - Diamonds/Heartbreak Hotel.mp3'},
  {'icon': iconImage, 'title': 'Heaven And Hell', 'file': '../../../../../../../Test/Music/C.C.Catch/1986 - Welcome To The Heartbreak Hotel/Heaven and Hell.mp3'},
  {'icon': iconImage, 'title': 'Hollywood Nights', 'file': '../../../../../../../Test/Music/C.C.Catch/1988 - Diamonds/Hollywood Nights.mp3'},
  {'icon': iconImage, 'title': 'House Of Mystic Light', 'file': '../../../../../../../Test/Music/C.C.Catch/1988 - Diamonds/House Of Mystic Light.mp3'},
  {'icon': iconImage, 'title': 'I Can Loose My Heart Tonight', 'file': '../../../../../../../Test/Music/C.C.Catch/1988 - Diamonds/I Can Loose My Heart Tonight.mp3'},
  {'icon': iconImage, 'title': 'Jump In My Car', 'file': '../../../../../../../Test/Music/C.C.Catch/1986 - Catch The Catch/Jump In My Car.mp3'},
  {'icon': iconImage, 'title': 'Little By Little', 'file': '../../../../../../../Test/Music/C.C.Catch/1988 - Big Fun/Little By Little.mp3'},
  {'icon': iconImage, 'title': 'Megamix', 'file': '../../../../../../../Test/Music/C.C.Catch/1998 - Best Of`98/Megamix.mp3'},
  {'icon': iconImage, 'title': 'One Night Is Not Enough', 'file': '../../../../../../../Test/Music/C.C.Catch/1986 - Catch The Catch/One Night Is Not Enough.mp3'},
  {'icon': iconImage, 'title': 'Smoky Joes Cafe', 'file': '../../../../../../../Test/Music/C.C.Catch/1987 - Like A Hurricane/Smoky Joe%27s Cafe.mp3'},
  {'icon': iconImage, 'title': 'Soul Survivor', 'file': '../../../../../../../Test/Music/C.C.Catch/1987 - Like A Hurricane/Soul Survivor.mp3'},
  {'icon': iconImage, 'title': 'Strangers By Night', 'file': '../../../../../../../Test/Music/C.C.Catch/1986 - Catch The Catch/Strangers By Night.mp3'},
]);
})

document.getElementById('chrisnorman').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Dont Play Your Rock N Roll To Me', 'file': '../../../../../../../Test/Music/Chris Norman/disk 1 Smokie Years/Don%27t Play Your Rock %27n%27 Roll to Me.mp3'},
  {'icon': iconImage, 'title': 'Ill Meet You At Midnight', 'file': '../../../../../../../Test/Music/Chris Norman/disk 1 Smokie Years/I%27ll meet you at Midnight.mp3'},
  {'icon': iconImage, 'title': 'Midnight Lady', 'file': '../../../../../../../Test/Music/Chris Norman/Chris Norman THE HITS - From His Smokie And Solo Years[tfile.ru]/Midnight lady.mp3'},
  {'icon': iconImage, 'title': 'Some Hearts Are Diamonds', 'file': '../../../../../../../Test/Music/Chris Norman/disk 2 Solo Years/Some hearts are diamonds.mp3'},
  {'icon': iconImage, 'title': 'Stumblin In', 'file': '../../../../../../../Test/Music/Chris Norman/disk 1 Smokie Years/Stumblin%27 in.mp3'},
  {'icon': iconImage, 'title': 'What Can I Do', 'file': '../../../../../../../Test/Music/Chris Norman/What Can I Do.mp3'},
]);
})

document.getElementById('chrisrea').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'And You My Love', 'file': '../../../../../../../Test/Music/Chris Rea/1991 - Auberge/And You My Love.mp3'},
  {'icon': iconImage, 'title': 'Auberge', 'file': '../../../../../../../Test/Music/Chris Rea/1991 - Auberge/Auberge.mp3'},
  {'icon': iconImage, 'title': 'I Can Hear Your Heartbeat', 'file': '../../../../../../../Test/Music/Chris Rea/1988 - New Light Through Old Windows/I Can Hear Your Heartbeat.mp3'},
  {'icon': iconImage, 'title': 'I Just Wanna Be With You', 'file': '../../../../../../../Test/Music/Chris Rea/1989 - The Road To Hell/I Just Wanna Be With You.mp3'},
  {'icon': iconImage, 'title': 'Josephine', 'file': '../../../../../../../Test/Music/Chris Rea/1985 - Shamrock Diaries/Josephine.mp3'},
  {'icon': iconImage, 'title': 'Julia', 'file': '../../../../../../../Test/Music/Chris Rea/1994 - Espresso Logic/Julia.mp3'},
  {'icon': iconImage, 'title': 'Looking For The Summer', 'file': '../../../../../../../Test/Music/Chris Rea/1991 - Auberge/Looking For The Summer.mp3'},
  {'icon': iconImage, 'title': 'Sing A Song Of Love To Me', 'file': '../../../../../../../Test/Music/Chris Rea/1991 - Auberge/Sing A Song Of Love To Me.mp3'},
  {'icon': iconImage, 'title': 'The Road To Hell', 'file': '../../../../../../../Test/Music/Chris Rea/1989 - The Road To Hell/The Road to Hell.mp3'},
]);
})

document.getElementById('classics').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Allegro', 'file': '../../../../../../../Test/Music/ClassicS/Vivaldi/Concerto in F minor, RV 297 Winter/Allegro.mp3'},
  {'icon': iconImage, 'title': 'Allegro', 'file': '../../../../../../../Test/Music/ClassicS/Vivaldi/Concerto in C major, RV 180 Il Piacere/Allegro.mp3'},
  {'icon': iconImage, 'title': 'Allegro', 'file': '../../../../../../../Test/Music/ClassicS/Vivaldi/Concerto in D minor, RV 242/Allegro.mp3'},
  {'icon': iconImage, 'title': 'Allegro', 'file': '../../../../../../../Test/Music/ClassicS/Vivaldi/Concerto in G minor, RV 157/Allegro.mp3'},
  {'icon': iconImage, 'title': 'Allegro Molto', 'file': '../../../../../../../Test/Music/ClassicS/Vivaldi/Concerto a 6 in A minor RV 523/Allegro molto.mp3'},
  {'icon': iconImage, 'title': 'Allegro Non Molto', 'file': '../../../../../../../Test/Music/ClassicS/Vivaldi/Concerto in F minor, RV 297 Winter/Allegro non molto.mp3'},
  {'icon': iconImage, 'title': 'Allegro Non Molto', 'file': '../../../../../../../Test/Music/ClassicS/Vivaldi/Concerto in G minor, RV 315 Summer/Allegro non molto.mp3'},
  {'icon': iconImage, 'title': 'Alonette', 'file': '../../../../../../../Test/Music/ClassicS/Paul Mauriat/Alonette.mp3'},
  {'icon': iconImage, 'title': 'Alouette', 'file': '../../../../../../../Test/Music/ClassicS/Paul Mauriat/Alouette.mp4'},
  {'icon': iconImage, 'title': 'Also Sprash Zaratustra', 'file': '../../../../../../../Test/Music/ClassicS/Also sprash Zaratustra.mp3'},
  {'icon': iconImage, 'title': 'Aurora', 'file': '../../../../../../../Test/Music/ClassicS/Vanessa Mai/Aurora.mp3'},
  {'icon': iconImage, 'title': 'Badinerie', 'file': '../../../../../../../Test/Music/ClassicS/Иоганн Себастьян Бах/Badinerie.mp3'},
  {'icon': iconImage, 'title': 'Cavalleria Rusticana Intermezzo', 'file': '../../../../../../../Test/Music/ClassicS/Cavalleria Rusticana Intermezzo.mp3'},
  {'icon': iconImage, 'title': 'Classical Gas', 'file': '../../../../../../../Test/Music/ClassicS/Vanessa Mai/Classical Gas.mp3'},
  {'icon': iconImage, 'title': 'Con Brio', 'file': '../../../../../../../Test/Music/ClassicS/Ludwig Van Beethoven/Con brio.mp3'},
  {'icon': iconImage, 'title': 'Concerto E Dur Rv 269 Danza Pastorale Allegro', 'file': '../../../../../../../Test/Music/ClassicS/Vivaldi/Concerto E-dur RV 269 Danza pastorale Allegro.mp3'},
  {'icon': iconImage, 'title': 'Concerto For 2 Violonist & String', 'file': '../../../../../../../Test/Music/ClassicS/Иоганн Себастьян Бах/Concerto for  2 Violonist & String.mp3'},
  {'icon': iconImage, 'title': 'Concerto For Piano', 'file': '../../../../../../../Test/Music/ClassicS/Вольфганг Амадей Моцарт/Concerto for piano.mp3'},
  {'icon': iconImage, 'title': 'Contradanza', 'file': '../../../../../../../Test/Music/ClassicS/Vanessa Mai/Contradanza.mp3'},
  {'icon': iconImage, 'title': 'Contradanza 1995', 'file': '../../../../../../../Test/Music/ClassicS/Vanessa Mai/Contradanza 1995.mp4'},
  {'icon': iconImage, 'title': 'Die Walkure Ride Of The Valky Act3', 'file': '../../../../../../../Test/Music/ClassicS/Die Walkure Ride of the Valky Act3.mp3'},
  {'icon': iconImage, 'title': 'Egmont Увертюра (opus 84)', 'file': '../../../../../../../Test/Music/ClassicS/Ludwig Van Beethoven/Egmont увертюра (opus 84).mp3'},
  {'icon': iconImage, 'title': 'El Bimbo', 'file': '../../../../../../../Test/Music/ClassicS/Paul Mauriat/El Bimbo.mp3'},
  {'icon': iconImage, 'title': 'Elise', 'file': '../../../../../../../Test/Music/ClassicS/Ludwig Van Beethoven/Elise.mp3'},
  {'icon': iconImage, 'title': 'Fortress', 'file': '../../../../../../../Test/Music/ClassicS/Fortress.mp3'},
  {'icon': iconImage, 'title': 'Godfather', 'file': '../../../../../../../Test/Music/ClassicS/Godfather.mp3'},
  {'icon': iconImage, 'title': 'Godfather', 'file': '../../../../../../../Test/Music/ClassicS/Paul Mauriat/Godfather.mp3'},
  {'icon': iconImage, 'title': 'Lilium', 'file': '../../../../../../../Test/Music/ClassicS/Lilium.mp3'},
  {'icon': iconImage, 'title': 'Love Is Blue', 'file': '../../../../../../../Test/Music/ClassicS/Paul Mauriat/Love Is Blue.mp3'},
  {'icon': iconImage, 'title': 'Molto Allegro Simphonie No 40 In G Minor K550', 'file': '../../../../../../../Test/Music/ClassicS/Вольфганг Амадей Моцарт/Molto allegro Simphonie No.40 in G minor K550.mp3'},
  {'icon': iconImage, 'title': 'Moonlight Sonata (лунная Соната №14 ) (ч1)', 'file': '../../../../../../../Test/Music/ClassicS/Ludwig Van Beethoven/Moonlight Sonata (Лунная Соната №14 ) (ч1).mp3'},
  {'icon': iconImage, 'title': 'Moonlight Sonata (лунная Соната №14 ) (ч2)', 'file': '../../../../../../../Test/Music/ClassicS/Ludwig Van Beethoven/Moonlight Sonata (Лунная Соната №14 ) (ч2).mp3'},
  {'icon': iconImage, 'title': 'Orfeo Euridice Atto Secondo Balletto', 'file': '../../../../../../../Test/Music/ClassicS/Orfeo Euridice Atto Secondo.Balletto.mp3'},
  {'icon': iconImage, 'title': 'Parapluies De Cherbury', 'file': '../../../../../../../Test/Music/ClassicS/Paul Mauriat/Parapluies De Cherbury.mp3'},
  {'icon': iconImage, 'title': 'Per Elisa', 'file': '../../../../../../../Test/Music/ClassicS/Ludwig Van Beethoven/Per Elisa.mp3'},
  {'icon': iconImage, 'title': 'Piano Sonata №14 In C Sharp Minor Op 27 №2', 'file': '../../../../../../../Test/Music/ClassicS/Ludwig Van Beethoven/Piano Sonata №14 in C-sharp minor Op.27 №2.mp3'},
  {'icon': iconImage, 'title': 'Presto', 'file': '../../../../../../../Test/Music/ClassicS/Vivaldi/Concerto in E flat major, RV 253 La Tempesta di Mare/Presto.mp3'},
  {'icon': iconImage, 'title': 'Presto Tempo Impetuoso Destate', 'file': '../../../../../../../Test/Music/ClassicS/Vivaldi/Concerto in G minor, RV 315 Summer/Presto - Tempo impetuoso d%27Estate.mp3'},
  {'icon': iconImage, 'title': 'Requiem Lacrimoza', 'file': '../../../../../../../Test/Music/ClassicS/Вольфганг Амадей Моцарт/Requiem Lacrimoza.mp3'},
  {'icon': iconImage, 'title': 'Retro', 'file': '../../../../../../../Test/Music/ClassicS/Vanessa Mai/Retro.mp3'},
  {'icon': iconImage, 'title': 'Rondo Andantino', 'file': '../../../../../../../Test/Music/ClassicS/Rondo Andantino.mp3'},
  {'icon': iconImage, 'title': 'Storm', 'file': '../../../../../../../Test/Music/ClassicS/Vanessa Mai/Storm.mp3'},
  {'icon': iconImage, 'title': 'The Blue Danube Op 314', 'file': '../../../../../../../Test/Music/ClassicS/The Blue Danube Op.314.mp3'},
  {'icon': iconImage, 'title': 'The Diva Dance', 'file': '../../../../../../../Test/Music/ClassicS/The Diva Dance.MP3'},
  {'icon': iconImage, 'title': 'Toccata', 'file': '../../../../../../../Test/Music/ClassicS/Vanessa Mai/Toccata.mp3'},
  {'icon': iconImage, 'title': 'Toccatа', 'file': '../../../../../../../Test/Music/ClassicS/Paul Mauriat/Toccatа.mp3'},
  {'icon': iconImage, 'title': 'Valse Op 64i2', 'file': '../../../../../../../Test/Music/ClassicS/Valse Op.64I2.mp3'},
  {'icon': iconImage, 'title': 'Vienna Blood Op 354', 'file': '../../../../../../../Test/Music/ClassicS/Vienna Blood Op.354.mp3'},
  {'icon': iconImage, 'title': 'Балетная Сюита Лебединое Озеро Соч 20', 'file': '../../../../../../../Test/Music/ClassicS/Чайковский Петр Ильич/Балетная сюита Лебединое озеро соч.20 .mp3'},
  {'icon': iconImage, 'title': 'Балетная Сюита Спящая Красавица Соч 66 Вальс Allegro', 'file': '../../../../../../../Test/Music/ClassicS/Чайковский Петр Ильич/Балетная сюита Спящая красавица соч 66.Вальс Allegro.mp3'},
  {'icon': iconImage, 'title': 'Вальс', 'file': '../../../../../../../Test/Music/ClassicS/Георгии Васильевич Свиридов/Вальс.mp3'},
  {'icon': iconImage, 'title': 'Вальс', 'file': '../../../../../../../Test/Music/ClassicS/Вальс.mp3'},
  {'icon': iconImage, 'title': 'Вальс К Драме М Лермонтова Маскарад', 'file': '../../../../../../../Test/Music/ClassicS/Вальс к драме М.Лермонтова %27Маскарад%27.mp3'},
  {'icon': iconImage, 'title': 'Гопак', 'file': '../../../../../../../Test/Music/ClassicS/Гопак.mp3'},
  {'icon': iconImage, 'title': 'Евгений Онегин Полонез', 'file': '../../../../../../../Test/Music/ClassicS/Евгений Онегин Полонез.mp3'},
  {'icon': iconImage, 'title': 'Зимняя Дорога', 'file': '../../../../../../../Test/Music/ClassicS/Георгии Васильевич Свиридов/Зимняя Дорога.mp3'},
  {'icon': iconImage, 'title': 'Кан Кли', 'file': '../../../../../../../Test/Music/ClassicS/Кан Кли.mp3'},
  {'icon': iconImage, 'title': 'Кармен', 'file': '../../../../../../../Test/Music/ClassicS/Кармен.mp3'},
  {'icon': iconImage, 'title': 'Метель Музыкльная Иллюстрация К Повести А Пушкина', 'file': '../../../../../../../Test/Music/ClassicS/Георгии Васильевич Свиридов/Метель Музыкльная иллюстрация к повести А.Пушкина.mp3'},
  {'icon': iconImage, 'title': 'Песня Тореадора', 'file': '../../../../../../../Test/Music/ClassicS/Песня тореадора.mp3'},
  {'icon': iconImage, 'title': 'Половецкие Пляски', 'file': '../../../../../../../Test/Music/ClassicS/Половецкие пляски.mp3'},
  {'icon': iconImage, 'title': 'Полонез', 'file': '../../../../../../../Test/Music/ClassicS/Огинский М. К/Полонез.mp3'},
  {'icon': iconImage, 'title': 'Ромео И Джульета Балетная Сюита Монтекки И Капулетти', 'file': '../../../../../../../Test/Music/ClassicS/Ромео и Джульета Балетная сюита Монтекки и Капулетти.mp3'},
  {'icon': iconImage, 'title': 'Свадебный Марш', 'file': '../../../../../../../Test/Music/ClassicS/Свадебный марш.mp3'},
  {'icon': iconImage, 'title': 'Тройка', 'file': '../../../../../../../Test/Music/ClassicS/Георгии Васильевич Свиридов/Тройка.mp3'},
  {'icon': iconImage, 'title': 'Турецкий Марш', 'file': '../../../../../../../Test/Music/ClassicS/Вольфганг Амадей Моцарт/Турецкий марш.mp3'},
  {'icon': iconImage, 'title': 'Хованщина Прелюдия', 'file': '../../../../../../../Test/Music/ClassicS/Хованщина. Прелюдия.mp3'},
  {'icon': iconImage, 'title': 'Эхо Вальса', 'file': '../../../../../../../Test/Music/ClassicS/Георгии Васильевич Свиридов/Эхо вальса.mp3'},
]);
})

document.getElementById('ddt').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '180 См', 'file': '../../../../../../../Test/Music/DDT/2002 - Единочество/180 см.mp3'},
  {'icon': iconImage, 'title': '7 Я Глава', 'file': '../../../../../../../Test/Music/DDT/7-я глава.mp3'},
  {'icon': iconImage, 'title': 'Агидель', 'file': '../../../../../../../Test/Music/DDT/1995 - Это все/Агидель.mp3'},
  {'icon': iconImage, 'title': 'Актриса Весна', 'file': '../../../../../../../Test/Music/DDT/1992 - Актриса весна/Актриса-Весна.mp3'},
  {'icon': iconImage, 'title': 'Актриса Весна', 'file': '../../../../../../../Test/Music/DDT/1991 - Пластун/Актриса-Весна.mp3'},
  {'icon': iconImage, 'title': 'Апокалипсис', 'file': '../../../../../../../Test/Music/DDT/1997 - Рожденный в СССР/Апокалипсис.mp3'},
  {'icon': iconImage, 'title': 'Беда', 'file': '../../../../../../../Test/Music/DDT/1993 - Черный пес Петербург/Беда.mp3'},
  {'icon': iconImage, 'title': 'Беда', 'file': '../../../../../../../Test/Music/DDT/1993 - Черный пес Петербург/Беда.mp4'},
  {'icon': iconImage, 'title': 'Белая Ночь', 'file': '../../../../../../../Test/Music/DDT/1995 - Это все/Белая ночь.mp3'},
  {'icon': iconImage, 'title': 'Белая Птица', 'file': '../../../../../../../Test/Music/DDT/1993 - Черный пес Петербург/Белая птица.mp3'},
  {'icon': iconImage, 'title': 'Бородино', 'file': '../../../../../../../Test/Music/DDT/2003 - Единочество/Бородино.mp3'},
  {'icon': iconImage, 'title': 'Бродяга', 'file': '../../../../../../../Test/Music/DDT/2000 - Метель августа/Бродяга.mp3'},
  {'icon': iconImage, 'title': 'В Гостях У Генерала', 'file': '../../../../../../../Test/Music/DDT/2006 - ДК им. Дзержинского/В гостях у генерала.mp3'},
  {'icon': iconImage, 'title': 'В Очереди За Правдой', 'file': '../../../../../../../Test/Music/DDT/2014 - Прозрачный/В Очереди За Правдой.mp3'},
  {'icon': iconImage, 'title': 'В Последнюю Осень', 'file': '../../../../../../../Test/Music/DDT/2001 - Два концерта Москва-Петербург2/В последнюю осень.mp3'},
  {'icon': iconImage, 'title': 'Вальс О Творчеств', 'file': '../../../../../../../Test/Music/DDT/2002 - Единочество/Вальс о творчеств.mp3'},
  {'icon': iconImage, 'title': 'Вальс О Творчестве', 'file': '../../../../../../../Test/Music/DDT/2002 - Единочество/Вальс о творчестве.mp3'},
  {'icon': iconImage, 'title': 'Вася', 'file': '../../../../../../../Test/Music/DDT/1982 - Квартирник/Вася.mp3'},
  {'icon': iconImage, 'title': 'Ветер', 'file': '../../../../../../../Test/Music/DDT/1995 - Это все/Ветер.mp3'},
  {'icon': iconImage, 'title': 'Ветры', 'file': '../../../../../../../Test/Music/DDT/1991 - Пластун/Ветры.mp3'},
  {'icon': iconImage, 'title': 'Война Бывает Детская', 'file': '../../../../../../../Test/Music/DDT/2007 - Прекрасная любовь/Война бывает детская.mp3'},
  {'icon': iconImage, 'title': 'Вокзал', 'file': '../../../../../../../Test/Music/DDT/2018 - Галя ходи/Вокзал.mp3'},
  {'icon': iconImage, 'title': 'Вокзал', 'file': '../../../../../../../Test/Music/DDT/2018 - Галя ходи/Вокзал.mp4'},
  {'icon': iconImage, 'title': 'Встреча', 'file': '../../../../../../../Test/Music/DDT/2011 - Иначе/Встреча.mp3'},
  {'icon': iconImage, 'title': 'Где Мы Летим', 'file': '../../../../../../../Test/Music/DDT/2011 - Иначе/Где мы летим.mp4'},
  {'icon': iconImage, 'title': 'Где Мы Летим', 'file': '../../../../../../../Test/Music/DDT/2011 - Иначе/Где мы летим.mp3'},
  {'icon': iconImage, 'title': 'Герой', 'file': '../../../../../../../Test/Music/DDT/1998 - Мир номер ноль/Герой.mp3'},
  {'icon': iconImage, 'title': 'Глазища', 'file': '../../../../../../../Test/Music/DDT/1995 - Это все/Глазища.mp3'},
  {'icon': iconImage, 'title': 'Гляди Пешком', 'file': '../../../../../../../Test/Music/DDT/1997 - Рожденный в СССР/Гляди пешком.mp3'},
  {'icon': iconImage, 'title': 'Гражданка', 'file': '../../../../../../../Test/Music/DDT/2000 - Метель августа/Гражданка.mp3'},
  {'icon': iconImage, 'title': 'Давайте Что Нибудь Придумаем', 'file': '../../../../../../../Test/Music/DDT/1982 - Квартирник/Давайте что-нибудь придумаем.mp3'},
  {'icon': iconImage, 'title': 'Далеко Далеко', 'file': '../../../../../../../Test/Music/DDT/1996 - Любовь/Далеко, далеко.mp3'},
  {'icon': iconImage, 'title': 'Далеко Далеко', 'file': '../../../../../../../Test/Music/DDT/2004 - Город без окон - Вход/Далеко, Далеко.mp3'},
  {'icon': iconImage, 'title': 'Деревня', 'file': '../../../../../../../Test/Music/DDT/1982 - Квартирник/Деревня.mp3'},
  {'icon': iconImage, 'title': 'Дождь', 'file': '../../../../../../../Test/Music/DDT/2001 - Два концерта Москва-Петербург1/Дождь.mp3'},
  {'icon': iconImage, 'title': 'Дождь', 'file': '../../../../../../../Test/Music/DDT/1992 - Актриса весна/Дождь.mp3'},
  {'icon': iconImage, 'title': 'Донести Синь', 'file': '../../../../../../../Test/Music/DDT/1998 - Мир номер ноль/Донести синь.mp3'},
  {'icon': iconImage, 'title': 'Дороги', 'file': '../../../../../../../Test/Music/DDT/1991 - Пластун/Дороги.mp3'},
  {'icon': iconImage, 'title': 'Духи', 'file': '../../../../../../../Test/Music/DDT/1997 - Рожденный в СССР/Духи.mp3'},
  {'icon': iconImage, 'title': 'Если', 'file': '../../../../../../../Test/Music/DDT/2018 - Галя ходи/Если.mp3'},
  {'icon': iconImage, 'title': 'Живой', 'file': '../../../../../../../Test/Music/DDT/2003 - Единочество/Живой.mp3'},
  {'icon': iconImage, 'title': 'Жизнь На Месте', 'file': '../../../../../../../Test/Music/DDT/1995 - Это все/Жизнь на месте.mp3'},
  {'icon': iconImage, 'title': 'Забери Эту Ночь', 'file': '../../../../../../../Test/Music/DDT/2003 - Единочество/Забери эту ночь.mp3'},
  {'icon': iconImage, 'title': 'Змей Петров', 'file': '../../../../../../../Test/Music/DDT/1991 - Пластун/Змей Петров.mp3'},
  {'icon': iconImage, 'title': 'Инопланетянин', 'file': '../../../../../../../Test/Music/DDT/1982 - Свинья на радуге/Инопланетянин.mp3'},
  {'icon': iconImage, 'title': 'Капитан Колесников', 'file': '../../../../../../../Test/Music/DDT/2007 - Прекрасная любовь/Капитан Колесников.mp3'},
  {'icon': iconImage, 'title': 'Кладбище', 'file': '../../../../../../../Test/Music/DDT/2003 - Единочество/Кладбище.mp3'},
  {'icon': iconImage, 'title': 'Конвеер', 'file': '../../../../../../../Test/Music/DDT/1988 - Я получил эту роль/Конвеер.mp3'},
  {'icon': iconImage, 'title': 'Конец Света', 'file': '../../../../../../../Test/Music/DDT/2001 - Два концерта Москва-Петербург1/Конец света.mp3'},
  {'icon': iconImage, 'title': 'Концерт (тула)', 'file': '../../../../../../../Test/Music/DDT/Концерт (Тула).mp3'},
  {'icon': iconImage, 'title': 'Ленинград', 'file': '../../../../../../../Test/Music/DDT/2001 - Два концерта Москва-Петербург2/Ленинград.mp3'},
  {'icon': iconImage, 'title': 'Ленинград', 'file': '../../../../../../../Test/Music/DDT/1990 - Оттепель/Ленинград.mp3'},
  {'icon': iconImage, 'title': 'Летели Облака', 'file': '../../../../../../../Test/Music/DDT/2000 - Метель августа/Летели облака.mp3'},
  {'icon': iconImage, 'title': 'Любовь', 'file': '../../../../../../../Test/Music/DDT/1996 - Любовь/Любовь.mp3'},
  {'icon': iconImage, 'title': 'Любовь Подумай Обо Мне', 'file': '../../../../../../../Test/Music/DDT/2003 - Единочество/Любовь, подумай обо мне.mp3'},
  {'icon': iconImage, 'title': 'Мальчики Мажоры', 'file': '../../../../../../../Test/Music/DDT/1988 - Я получил эту роль/Мальчики мажоры.mp3'},
  {'icon': iconImage, 'title': 'Мама Это Рок Н Ролл', 'file': '../../../../../../../Test/Music/DDT/2004 - Город без окон - Вход/Мама Это Рок-Н-Ролл.mp3'},
  {'icon': iconImage, 'title': 'Мертвый Город Рождество', 'file': '../../../../../../../Test/Music/DDT/2001 - Два концерта Москва-Петербург1/Мертвый город. Рождество.mp3'},
  {'icon': iconImage, 'title': 'Мертвый Город Рождество', 'file': '../../../../../../../Test/Music/DDT/1997 - Рожденный в СССР/Мертвый город. Рождество.mp3'},
  {'icon': iconImage, 'title': 'Метель', 'file': '../../../../../../../Test/Music/DDT/2001 - Два концерта Москва-Петербург1/Метель.mp3'},
  {'icon': iconImage, 'title': 'Метель', 'file': '../../../../../../../Test/Music/DDT/1998 - Мир номер ноль/Метель.mp3'},
  {'icon': iconImage, 'title': 'Метель Августа', 'file': '../../../../../../../Test/Music/DDT/2000 - Метель августа/Метель августа.mp3'},
  {'icon': iconImage, 'title': 'Милиционер В Рок Клубе', 'file': '../../../../../../../Test/Music/DDT/1990 - Оттепель/Милиционер в рок-клубе.mp3'},
  {'icon': iconImage, 'title': 'Монолог В Ванной', 'file': '../../../../../../../Test/Music/DDT/2001 - Два концерта Москва-Петербург1/Монолог в ванной.mp3'},
  {'icon': iconImage, 'title': 'Московская Барыня', 'file': '../../../../../../../Test/Music/DDT/2000 - Метель августа/Московская барыня.mp3'},
  {'icon': iconImage, 'title': 'Музыкальный Образ Iii', 'file': '../../../../../../../Test/Music/DDT/1998 - Мир номер ноль/Музыкальный образ III.mp3'},
  {'icon': iconImage, 'title': 'На Небе Вороны', 'file': '../../../../../../../Test/Music/DDT/1993 - Черный пес Петербург/На небе вороны.mp3'},
  {'icon': iconImage, 'title': 'Наполним Небо Добротой', 'file': '../../../../../../../Test/Music/DDT/1984 - Переферия/Наполним небо добротой.mp3'},
  {'icon': iconImage, 'title': 'Не Стреляй', 'file': '../../../../../../../Test/Music/DDT/1988 - Я получил эту роль/Не стреляй.mp3'},
  {'icon': iconImage, 'title': 'Небо На Земле', 'file': '../../../../../../../Test/Music/DDT/1998 - Мир номер ноль/Небо на земле.mp3'},
  {'icon': iconImage, 'title': 'Небо На Земле', 'file': '../../../../../../../Test/Music/DDT/1998 - Мир номер ноль/Небо на земле .mp3'},
  {'icon': iconImage, 'title': 'Ночь', 'file': '../../../../../../../Test/Music/DDT/1992 - Актриса весна/Ночь.mp3'},
  {'icon': iconImage, 'title': 'Ночь Людмила', 'file': '../../../../../../../Test/Music/DDT/2000 - Метель августа/Ночь-Людмила.mp3'},
  {'icon': iconImage, 'title': 'Облом', 'file': '../../../../../../../Test/Music/DDT/2003 - Единочество/Облом.mp3'},
  {'icon': iconImage, 'title': 'Она', 'file': '../../../../../../../Test/Music/DDT/2002 - Единочество/Она.mp3'},
  {'icon': iconImage, 'title': 'Осенняя', 'file': '../../../../../../../Test/Music/DDT/2002 - Единочество/Осенняя.mp3'},
  {'icon': iconImage, 'title': 'Памятник', 'file': '../../../../../../../Test/Music/DDT/1984 - Переферия/Памятник.mp3'},
  {'icon': iconImage, 'title': 'Париж', 'file': '../../../../../../../Test/Music/DDT/2001 - Два концерта Москва-Петербург2/Париж.mp3'},
  {'icon': iconImage, 'title': 'Париж', 'file': '../../../../../../../Test/Music/DDT/Париж.mp4'},
  {'icon': iconImage, 'title': 'Пацаны', 'file': '../../../../../../../Test/Music/DDT/2001 - Два концерта Москва-Петербург1/Пацаны.mp3'},
  {'icon': iconImage, 'title': 'Пацаны', 'file': '../../../../../../../Test/Music/DDT/1997 - Рожденный в СССР/Пацаны.mp3'},
  {'icon': iconImage, 'title': 'Пашка', 'file': '../../../../../../../Test/Music/DDT/2003 - Единочество/Пашка.mp3'},
  {'icon': iconImage, 'title': 'Песня О Людях Героических Профессий', 'file': '../../../../../../../Test/Music/DDT/2005 - Чистый звук/Песня о людях героических профессий.mp3'},
  {'icon': iconImage, 'title': 'Песня О Свободе', 'file': '../../../../../../../Test/Music/DDT/Песня о Свободе.mp4'},
  {'icon': iconImage, 'title': 'Песня О Свободе', 'file': '../../../../../../../Test/Music/DDT/2011 - Иначе/Песня о свободе.mp3'},
  {'icon': iconImage, 'title': 'Питер', 'file': '../../../../../../../Test/Music/DDT/2000 - Метель августа/Питер.mp3'},
  {'icon': iconImage, 'title': 'Победа', 'file': '../../../../../../../Test/Music/DDT/1991 - Пластун/Победа.mp3'},
  {'icon': iconImage, 'title': 'Победа', 'file': '../../../../../../../Test/Music/DDT/1991 - Пластун/Победа.mp4'},
  {'icon': iconImage, 'title': 'Подарок', 'file': '../../../../../../../Test/Music/DDT/2000 - Метель августа/Подарок.mp3'},
  {'icon': iconImage, 'title': 'Поколение', 'file': '../../../../../../../Test/Music/DDT/2002 - Единочество/Поколение.mp3'},
  {'icon': iconImage, 'title': 'Последняя Осень', 'file': '../../../../../../../Test/Music/DDT/1992 - Актриса весна/Последняя осень.mp3'},
  {'icon': iconImage, 'title': 'Пост Интеллигент', 'file': '../../../../../../../Test/Music/DDT/1990 - Оттепель/Пост-интеллигент.mp3'},
  {'icon': iconImage, 'title': 'Постелите Мне Степь', 'file': '../../../../../../../Test/Music/DDT/Постелите мне степь.mp3'},
  {'icon': iconImage, 'title': 'Потолок', 'file': '../../../../../../../Test/Music/DDT/2000 - Метель августа/Потолок.mp3'},
  {'icon': iconImage, 'title': 'Поэт', 'file': '../../../../../../../Test/Music/DDT/1988 - Я получил эту роль/Поэт.mp3'},
  {'icon': iconImage, 'title': 'Правда На Правду', 'file': '../../../../../../../Test/Music/DDT/1997 - Рожденный в СССР/Правда на правду.mp3'},
  {'icon': iconImage, 'title': 'Правда На Правду', 'file': '../../../../../../../Test/Music/DDT/2001 - Два концерта Москва-Петербург2/Правда на правду.mp3'},
  {'icon': iconImage, 'title': 'Предчувствие Гражданской Войны', 'file': '../../../../../../../Test/Music/DDT/1991 - Пластун/Предчувствие гражданской войны.mp3'},
  {'icon': iconImage, 'title': 'Прекрасная Любовь', 'file': '../../../../../../../Test/Music/DDT/2001 - Два концерта Москва-Петербург2/Прекрасная любовь.mp3'},
  {'icon': iconImage, 'title': 'Прекрасная Любовь', 'file': '../../../../../../../Test/Music/DDT/2006 - DDT Family/Прекрасная Любовь.mp3'},
  {'icon': iconImage, 'title': 'Пропавший Без Вести', 'file': '../../../../../../../Test/Music/DDT/2005 - Пропавший без вести/Пропавший без вести.mp3'},
  {'icon': iconImage, 'title': 'Просвистела', 'file': '../../../../../../../Test/Music/DDT/1999 - Просвистела/Просвистела.mp3'},
  {'icon': iconImage, 'title': 'Просвистела', 'file': '../../../../../../../Test/Music/DDT/2001 - Два концерта Москва-Петербург1/Просвистела.mp3'},
  {'icon': iconImage, 'title': 'Пустота', 'file': '../../../../../../../Test/Music/DDT/2011 - Иначе/Пустота.mp3'},
  {'icon': iconImage, 'title': 'Разговор На Войне', 'file': '../../../../../../../Test/Music/DDT/2007 - Прекрасная любовь/Разговор на войне.mp3'},
  {'icon': iconImage, 'title': 'Расстреляли Рассветами', 'file': '../../../../../../../Test/Music/DDT/1998 - Мир номер ноль/Расстреляли рассветами .mp3'},
  {'icon': iconImage, 'title': 'Расстреляли Рассветами', 'file': '../../../../../../../Test/Music/DDT/1998 - Мир номер ноль/Расстреляли рассветами.mp3'},
  {'icon': iconImage, 'title': 'Реальность', 'file': '../../../../../../../Test/Music/DDT/2014 - Прозрачный/Реальность.mp3'},
  {'icon': iconImage, 'title': 'Революция', 'file': '../../../../../../../Test/Music/DDT/1988 - Я получил эту роль/Революция.mp3'},
  {'icon': iconImage, 'title': 'Родина', 'file': '../../../../../../../Test/Music/DDT/1992 - Актриса весна/Родина.mp3'},
  {'icon': iconImage, 'title': 'Родина', 'file': '../../../../../../../Test/Music/DDT/2001 - Два концерта Москва-Петербург2/Родина.mp3'},
  {'icon': iconImage, 'title': 'Рожденный В Ссср', 'file': '../../../../../../../Test/Music/DDT/1997 - Рожденный в СССР/Рожденный в СССР.mp3'},
  {'icon': iconImage, 'title': 'Рождественская', 'file': '../../../../../../../Test/Music/DDT/1993 - Черный пес Петербург/Рождественская.mp3'},
  {'icon': iconImage, 'title': 'Рождество Ночная Пьеса', 'file': '../../../../../../../Test/Music/DDT/2004 - Город без окон - Выход/Рождество ночная пьеса.mp3'},
  {'icon': iconImage, 'title': 'Рождество Ночная Пьеса', 'file': '../../../../../../../Test/Music/DDT/2004 - Город без окон - Выход/Рождество ночная пьеса.mp4'},
  {'icon': iconImage, 'title': 'Российское Танго', 'file': '../../../../../../../Test/Music/DDT/1995 - Это все/Российское танго.mp3'},
  {'icon': iconImage, 'title': 'Россияне', 'file': '../../../../../../../Test/Music/DDT/2000 - Метель августа/Россияне.mp3'},
  {'icon': iconImage, 'title': 'Русская Весна', 'file': '../../../../../../../Test/Music/DDT/2018 - Галя ходи/Русская весна.mp3'},
  {'icon': iconImage, 'title': 'Свинья На Радуге', 'file': '../../../../../../../Test/Music/DDT/1982 - Свинья на радуге/Свинья на радуге.mp3'},
  {'icon': iconImage, 'title': 'Свобода', 'file': '../../../../../../../Test/Music/DDT/2001 - Два концерта Москва-Петербург2/Свобода.mp3'},
  {'icon': iconImage, 'title': 'Свобода', 'file': '../../../../../../../Test/Music/DDT/2000 - Метель августа/Свобода.mp3'},
  {'icon': iconImage, 'title': 'Сказка', 'file': '../../../../../../../Test/Music/DDT/1996 - Любовь/Сказка.mp3'},
  {'icon': iconImage, 'title': 'Смерть Поэта', 'file': '../../../../../../../Test/Music/DDT/2001 - Два концерта Москва-Петербург1/Смерть поэта.mp3'},
  {'icon': iconImage, 'title': 'Спой Бг', 'file': '../../../../../../../Test/Music/DDT/Спой БГ.mp3'},
  {'icon': iconImage, 'title': 'Спокойно Дружище', 'file': '../../../../../../../Test/Music/DDT/Спокойно, дружище.mp4'},
  {'icon': iconImage, 'title': 'Суббота', 'file': '../../../../../../../Test/Music/DDT/1990 - Оттепель/Суббота.mp3'},
  {'icon': iconImage, 'title': 'Счастливый День', 'file': '../../../../../../../Test/Music/DDT/1982 - Свинья на радуге/Счастливый день.mp3'},
  {'icon': iconImage, 'title': 'Танго Войны', 'file': '../../../../../../../Test/Music/DDT/2004 - Город без окон - Вход/Танго Войны.mp3'},
  {'icon': iconImage, 'title': 'Террорист', 'file': '../../../../../../../Test/Music/DDT/1988 - Я получил эту роль/Террорист.mp3'},
  {'icon': iconImage, 'title': 'Ты Не Один', 'file': '../../../../../../../Test/Music/DDT/1993 - Черный пес Петербург/Ты не один .mp3'},
  {'icon': iconImage, 'title': 'Ты Не Один', 'file': '../../../../../../../Test/Music/DDT/1993 - Черный пес Петербург/Ты не один.mp3'},
  {'icon': iconImage, 'title': 'У Тебя Есть Сын', 'file': '../../../../../../../Test/Music/DDT/1992 - Актриса весна/У тебя есть сын.mp3'},
  {'icon': iconImage, 'title': 'Фома', 'file': '../../../../../../../Test/Music/DDT/1992 - Актриса весна/Фома.mp3'},
  {'icon': iconImage, 'title': 'Хипаны', 'file': '../../../../../../../Test/Music/DDT/1988 - Я получил эту роль/Хипаны.mp3'},
  {'icon': iconImage, 'title': 'Храм', 'file': '../../../../../../../Test/Music/DDT/1992 - Актриса весна/Храм.mp3'},
  {'icon': iconImage, 'title': 'Церковь', 'file': '../../../../../../../Test/Music/DDT/1990 - Оттепель/Церковь.mp3'},
  {'icon': iconImage, 'title': 'Цыганочка', 'file': '../../../../../../../Test/Music/DDT/2006 - DDT Family/Цыганочка.mp3'},
  {'icon': iconImage, 'title': 'Цыганская', 'file': '../../../../../../../Test/Music/DDT/2006 - DDT Family/Цыганская.mp3'},
  {'icon': iconImage, 'title': 'Черно Белые Танцы', 'file': '../../../../../../../Test/Music/DDT/1998 - Мир номер ноль/Черно-белые танцы.mp3'},
  {'icon': iconImage, 'title': 'Черный Пес Петербург', 'file': '../../../../../../../Test/Music/DDT/2001 - Два концерта Москва-Петербург2/Черный пес Петербург.mp3'},
  {'icon': iconImage, 'title': 'Черный Пес Петербург', 'file': '../../../../../../../Test/Music/DDT/1993 - Черный пес Петербург/Черный Пес Петербург.mp3'},
  {'icon': iconImage, 'title': 'Четыре Окна', 'file': '../../../../../../../Test/Music/DDT/1995 - Это все/Четыре окна.mp3'},
  {'icon': iconImage, 'title': 'Что Такое Осень', 'file': '../../../../../../../Test/Music/DDT/2001 - Два концерта Москва-Петербург2/Что такое осень.mp3'},
  {'icon': iconImage, 'title': 'Что Такое Осень', 'file': '../../../../../../../Test/Music/DDT/1993 - Черный пес Петербург/Что такое осень.mp3'},
  {'icon': iconImage, 'title': 'Это Все', 'file': '../../../../../../../Test/Music/DDT/1995 - Это все/Это все.mp3'},
  {'icon': iconImage, 'title': 'Я Завтра Брошу Пить', 'file': '../../../../../../../Test/Music/DDT/2001 - Два концерта Москва-Петербург1/Я завтра брошу пить.mp3'},
  {'icon': iconImage, 'title': 'Я Зажог В Церквях Все Свечи', 'file': '../../../../../../../Test/Music/DDT/1993 - Черный пес Петербург/Я зажог в церквях все свечи.mp3'},
  {'icon': iconImage, 'title': 'Я Остановил Время', 'file': '../../../../../../../Test/Music/DDT/1993 - Черный пес Петербург/Я остановил время.mp3'},
  {'icon': iconImage, 'title': 'Я Остановил Время', 'file': '../../../../../../../Test/Music/DDT/1993 - Черный пес Петербург/Я остановил время.mp4'},
  {'icon': iconImage, 'title': 'Я Получил Эту Роль', 'file': '../../../../../../../Test/Music/DDT/1988 - Я получил эту роль/Я получил эту роль.mp3'},
  {'icon': iconImage, 'title': 'Я Сижу На Жестком Табурете', 'file': '../../../../../../../Test/Music/DDT/1983 - Компромис/Я сижу на жестком табурете.mp3'},
  {'icon': iconImage, 'title': 'Я У Вас', 'file': '../../../../../../../Test/Music/DDT/1996 - Любовь/Я у вас.mp3'},
  {'icon': iconImage, 'title': 'Январским Вечером Храним', 'file': '../../../../../../../Test/Music/DDT/Январским Вечером Храним.mp4'},
]);
})

document.getElementById('depechemode').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A Pain That Im Used To', 'file': '../../../../../../../Test/Music/Depeche Mode/2005 Playing The Angel/A Pain That I%27m Used To.mp3'},
  {'icon': iconImage, 'title': 'Alone', 'file': '../../../../../../../Test/Music/Depeche Mode/2013 Delta Machine (Deluxe Edition, 2CD) (CD 1)/Alone.mp3'},
  {'icon': iconImage, 'title': 'Black Celebration', 'file': '../../../../../../../Test/Music/Depeche Mode/1986 Black Celebration/Black Celebration.mp3'},
  {'icon': iconImage, 'title': 'Broken', 'file': '../../../../../../../Test/Music/Depeche Mode/2013 Delta Machine (Deluxe Edition, 2CD) (CD 1)/Broken.mp3'},
  {'icon': iconImage, 'title': 'But Not Tonight', 'file': '../../../../../../../Test/Music/Depeche Mode/1986 Black Celebration/But Not Tonight.mp3'},
  {'icon': iconImage, 'title': 'Enjoy The Silence', 'file': '../../../../../../../Test/Music/Depeche Mode/1990 Violator/Enjoy the Silence.mp4'},
  {'icon': iconImage, 'title': 'Enjoy The Silence', 'file': '../../../../../../../Test/Music/Depeche Mode/1990 Violator/Enjoy the Silence.mp3'},
  {'icon': iconImage, 'title': 'Heaven', 'file': '../../../../../../../Test/Music/Depeche Mode/2013 Delta Machine (Deluxe Edition, 2CD) (CD 1)/Heaven.mp3'},
  {'icon': iconImage, 'title': 'Heaven', 'file': '../../../../../../../Test/Music/Depeche Mode/2013 Delta Machine (Deluxe Edition, 2CD) (CD 1)/Heaven.mp4'},
  {'icon': iconImage, 'title': 'Home', 'file': '../../../../../../../Test/Music/Depeche Mode/1997 Ultra/Home.mp3'},
  {'icon': iconImage, 'title': 'I Feel You', 'file': '../../../../../../../Test/Music/Depeche Mode/1993 Songs of Faith and Devotion/I Feel You.mp3'},
  {'icon': iconImage, 'title': 'In Your Room', 'file': '../../../../../../../Test/Music/Depeche Mode/1993 Songs of Faith and Devotion/In Your Room.mp3'},
  {'icon': iconImage, 'title': 'Little 15', 'file': '../../../../../../../Test/Music/Depeche Mode/1987 Music For The Masses/Little 15.mp3'},
  {'icon': iconImage, 'title': 'Never Let Me Down Again', 'file': '../../../../../../../Test/Music/Depeche Mode/1987 Music For The Masses/Never Let Me Down Again.mp3'},
  {'icon': iconImage, 'title': 'Nothings Impossible', 'file': '../../../../../../../Test/Music/Depeche Mode/2005 Playing The Angel/Nothing%27s Impossible.mp3'},
  {'icon': iconImage, 'title': 'Personal Jesus', 'file': '../../../../../../../Test/Music/Depeche Mode/1990 Violator/Personal Jesus .mp4'},
  {'icon': iconImage, 'title': 'Personal Jesus', 'file': '../../../../../../../Test/Music/Depeche Mode/1990 Violator/Personal Jesus.mp3'},
  {'icon': iconImage, 'title': 'Secret To The End', 'file': '../../../../../../../Test/Music/Depeche Mode/2013 Delta Machine (Deluxe Edition, 2CD) (CD 1)/Secret To The End.mp3'},
  {'icon': iconImage, 'title': 'Soothe My Soul', 'file': '../../../../../../../Test/Music/Depeche Mode/2013 Delta Machine (Deluxe Edition, 2CD) (CD 1)/Soothe My Soul.mp3'},
  {'icon': iconImage, 'title': 'Strangelove', 'file': '../../../../../../../Test/Music/Depeche Mode/1987 Music For The Masses/Strangelove.mp3'},
  {'icon': iconImage, 'title': 'Strippedd', 'file': '../../../../../../../Test/Music/Depeche Mode/1986 Black Celebration/Strippedd.mp3'},
  {'icon': iconImage, 'title': 'Sweetest Perfection', 'file': '../../../../../../../Test/Music/Depeche Mode/2009 Sounds Of The Universe/Sweetest Perfection .mp3'},
  {'icon': iconImage, 'title': 'Sweetest Perfection', 'file': '../../../../../../../Test/Music/Depeche Mode/1990 Violator/Sweetest Perfection.mp3'},
  {'icon': iconImage, 'title': 'The Sinner In Me', 'file': '../../../../../../../Test/Music/Depeche Mode/2005 Playing The Angel/The Sinner In Me.mp3'},
  {'icon': iconImage, 'title': 'To Have And To Hold (spanish Taster)', 'file': '../../../../../../../Test/Music/Depeche Mode/1987 Music For The Masses/To Have And To Hold (Spanish Taster).mp3'},
  {'icon': iconImage, 'title': 'Walking In My Shoes', 'file': '../../../../../../../Test/Music/Depeche Mode/1993 Songs of Faith and Devotion/Walking In My Shoes.mp3'},
  {'icon': iconImage, 'title': 'Welcome To My World', 'file': '../../../../../../../Test/Music/Depeche Mode/2013 Delta Machine (Deluxe Edition, 2CD) (CD 1)/Welcome To My World.mp3'},
  {'icon': iconImage, 'title': 'World In My Eyes', 'file': '../../../../../../../Test/Music/Depeche Mode/1990 Violator/World in My Eyes.mp3'},
  {'icon': iconImage, 'title': 'Wrong', 'file': '../../../../../../../Test/Music/Depeche Mode/2009 Sounds Of The Universe/Wrong.mp3'},
]);
})

document.getElementById('eltonjohn').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Believe', 'file': '../../../../../../../Test/Music/Elton John/1995 - Made In England/Believe.mp3'},
  {'icon': iconImage, 'title': 'Blessed', 'file': '../../../../../../../Test/Music/Elton John/1995 - Love Songs/Blessed.mp3'},
  {'icon': iconImage, 'title': 'Electricity', 'file': '../../../../../../../Test/Music/Elton John/2005 - Electricity/Electricity.mp3'},
  {'icon': iconImage, 'title': 'Ive Been Loving You', 'file': '../../../../../../../Test/Music/Elton John/1992 - Rare Masters/Ive been loving you.mp3'},
  {'icon': iconImage, 'title': 'Nikita', 'file': '../../../../../../../Test/Music/Elton John/1995 - Love Songs/Nikita.mp3'},
  {'icon': iconImage, 'title': 'Original Sin', 'file': '../../../../../../../Test/Music/Elton John/2001 - Songs from the West Coast/Original sin.mp3'},
  {'icon': iconImage, 'title': 'Shoot Down The Moon', 'file': '../../../../../../../Test/Music/Elton John/1985 - Ice On Fire/Shoot down the moon.mp3'},
  {'icon': iconImage, 'title': 'Sorry Seems To Be The Hardest Word', 'file': '../../../../../../../Test/Music/Elton John/1987 - Live In Australia/Sorry seems to be the hardest word.mp3'},
  {'icon': iconImage, 'title': 'To Young', 'file': '../../../../../../../Test/Music/Elton John/1985 - Ice On Fire/To young.mp3'},
  {'icon': iconImage, 'title': 'Without Question', 'file': '../../../../../../../Test/Music/Elton John/2000 - The Road To El Dorado/Without question.mp3'},
  {'icon': iconImage, 'title': 'Wonders Of The New World', 'file': '../../../../../../../Test/Music/Elton John/2000 - The Road To El Dorado/Wonders of the new world.mp3'},
]);
})

document.getElementById('enya').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A Day Without Rain', 'file': '../../../../../../../Test/Music/Enya/2000 - A Day Without Rain/A Day Without Rain.mp3'},
  {'icon': iconImage, 'title': 'After Ventus', 'file': '../../../../../../../Test/Music/Enya/1991 - Shepherd Moons/After Ventus.mp3'},
  {'icon': iconImage, 'title': 'Aldebaran', 'file': '../../../../../../../Test/Music/Enya/1987 - Enya/Aldebaran.mp3'},
  {'icon': iconImage, 'title': 'Amarantine', 'file': '../../../../../../../Test/Music/Enya/2005 - Amarantine/Amarantine.mp3'},
  {'icon': iconImage, 'title': 'Aniron', 'file': '../../../../../../../Test/Music/Enya/2009 - The Very Best of Enya/Aniron.mp3'},
  {'icon': iconImage, 'title': 'Anywhere Is', 'file': '../../../../../../../Test/Music/Enya/1995 - The Memory Of Trees/Anywhere Is.mp3'},
  {'icon': iconImage, 'title': 'Athair Ar Neamh', 'file': '../../../../../../../Test/Music/Enya/2006 - Taliesin Orchestra/Athair Ar Neamh.mp3'},
  {'icon': iconImage, 'title': 'Boadicea', 'file': '../../../../../../../Test/Music/Enya/1997 - Box Of Dreams (Oceans)/Boadicea.mp3'},
  {'icon': iconImage, 'title': 'Book Of Days', 'file': '../../../../../../../Test/Music/Enya/1991 - Shepherd Moons/Book of Days.mp3'},
  {'icon': iconImage, 'title': 'Caribbean Blue', 'file': '../../../../../../../Test/Music/Enya/1991 - Caribbean Blue/Caribbean Blue.mp3'},
  {'icon': iconImage, 'title': 'China Roses', 'file': '../../../../../../../Test/Music/Enya/1997 - Paint the Sky with Stars/China Roses.mp3'},
  {'icon': iconImage, 'title': 'Ebudae', 'file': '../../../../../../../Test/Music/Enya/1991 - Shepherd Moons/Ebudae.mp3'},
  {'icon': iconImage, 'title': 'Elian', 'file': '../../../../../../../Test/Music/Enya/2005 - Sumiregusa/Elian.mp3'},
  {'icon': iconImage, 'title': 'Evening Falls ', 'file': '../../../../../../../Test/Music/Enya/1997 - Box Of Dreams (Stars)/Evening Falls....mp3'},
  {'icon': iconImage, 'title': 'Exile', 'file': '../../../../../../../Test/Music/Enya/1988 - Watermark/Exile.mp3'},
  {'icon': iconImage, 'title': 'Floras Secret', 'file': '../../../../../../../Test/Music/Enya/2000 - A Day Without Rain/Flora%27s Secret.mp3'},
  {'icon': iconImage, 'title': 'I Want Tomorrow', 'file': '../../../../../../../Test/Music/Enya/1987 - Enya/I Want Tomorrow.mp3'},
  {'icon': iconImage, 'title': 'Lazy Days', 'file': '../../../../../../../Test/Music/Enya/2001 - Oceans/Lazy Days.mp3'},
  {'icon': iconImage, 'title': 'Lothlorien', 'file': '../../../../../../../Test/Music/Enya/1991 - Shepherd Moons/Lothlorien.mp3'},
  {'icon': iconImage, 'title': 'May It Be', 'file': '../../../../../../../Test/Music/Enya/2001 - May it be/May It Be.mp3'},
  {'icon': iconImage, 'title': 'Mysterium', 'file': '../../../../../../../Test/Music/Enya/2005 - Sumiregusa/Mysterium.mp3'},
  {'icon': iconImage, 'title': 'On My Way Home', 'file': '../../../../../../../Test/Music/Enya/1996 - On My Way Home/On my way home.mp3'},
  {'icon': iconImage, 'title': 'One By One', 'file': '../../../../../../../Test/Music/Enya/2000 - A Day Without Rain/One By One.mp3'},
  {'icon': iconImage, 'title': 'Only If You Want To', 'file': '../../../../../../../Test/Music/Enya/1997 - Box Of Dreams (Oceans)/Only If You Want To.mp3'},
  {'icon': iconImage, 'title': 'Only Time', 'file': '../../../../../../../Test/Music/Enya/2000 - A Day Without Rain/Only Time.mp3'},
  {'icon': iconImage, 'title': 'Orinoco Flow', 'file': '../../../../../../../Test/Music/Enya/1988 - Watermark/Orinoco Flow.mp3'},
  {'icon': iconImage, 'title': 'Pilgrim', 'file': '../../../../../../../Test/Music/Enya/2002 - Best Of Enya/Pilgrim.mp3'},
  {'icon': iconImage, 'title': 'Shepherd Moons', 'file': '../../../../../../../Test/Music/Enya/1991 - Shepherd Moons/Shepherd Moons.mp3'},
  {'icon': iconImage, 'title': 'Somebody Said Goodbye', 'file': '../../../../../../../Test/Music/Enya/2005 - Amarantine/Somebody Said Goodbye.mp3'},
  {'icon': iconImage, 'title': 'St Patrick Cu Chulainn Oisin', 'file': '../../../../../../../Test/Music/Enya/2008 - Greatest Hits/St. Patrick-Cu Chulainn-Oisin.mp3'},
  {'icon': iconImage, 'title': 'Storms In Africa', 'file': '../../../../../../../Test/Music/Enya/1988 - Watermark/Storms In Africa.mp3'},
  {'icon': iconImage, 'title': 'Sumiregusa', 'file': '../../../../../../../Test/Music/Enya/2005 - Sumiregusa/Sumiregusa.mp3'},
  {'icon': iconImage, 'title': 'Tempus Vernum', 'file': '../../../../../../../Test/Music/Enya/2000 - A Day Without Rain/Tempus Vernum.mp3'},
  {'icon': iconImage, 'title': 'The Celts', 'file': '../../../../../../../Test/Music/Enya/1987 - Enya/The Celts.mp3'},
  {'icon': iconImage, 'title': 'The First Of Autumn', 'file': '../../../../../../../Test/Music/Enya/2000 - A Day Without Rain/The First Of Autumn.mp3'},
  {'icon': iconImage, 'title': 'The Memory Of Trees', 'file': '../../../../../../../Test/Music/Enya/1995 - The Memory Of Trees/The Memory Of Trees.mp3'},
  {'icon': iconImage, 'title': 'Trains And Winter Rains', 'file': '../../../../../../../Test/Music/Enya/2008 - And Winter Came/Trains And Winter Rains.mp3'},
  {'icon': iconImage, 'title': 'Watermark', 'file': '../../../../../../../Test/Music/Enya/1988 - Watermark/Watermark.mp3'},
  {'icon': iconImage, 'title': 'We Wish You A Merry Christmas', 'file': '../../../../../../../Test/Music/Enya/2005 - Amarantine Special Christmas Edition/We Wish You a Merry Christmas.mp3'},
  {'icon': iconImage, 'title': 'Wild Child', 'file': '../../../../../../../Test/Music/Enya/2000 - A Day Without Rain/Wild Child.mp3'},
]);
})

document.getElementById('era').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'After Time', 'file': '../../../../../../../Test/Music/Era/1998 - Era/After Time.mp3'},
  {'icon': iconImage, 'title': 'Ameno', 'file': '../../../../../../../Test/Music/Era/1998 - Era/Ameno.mp3'},
  {'icon': iconImage, 'title': 'Avatar', 'file': '../../../../../../../Test/Music/Era/1998 - Infinity/Avatar.mp3'},
  {'icon': iconImage, 'title': 'Divano', 'file': '../../../../../../../Test/Music/Era/2000 - Era/Divano.mp3'},
  {'icon': iconImage, 'title': 'Enae Volare Mezzo', 'file': '../../../../../../../Test/Music/Era/1998 - Era/Enae Volare Mezzo.mp3'},
  {'icon': iconImage, 'title': 'Habanera', 'file': '../../../../../../../Test/Music/Era/1998 - Infinity/Habanera.mp3'},
  {'icon': iconImage, 'title': 'Hymne', 'file': '../../../../../../../Test/Music/Era/2000 - Era/Hymne.mp3'},
  {'icon': iconImage, 'title': 'Madona', 'file': '../../../../../../../Test/Music/Era/2000 - Era/Madona.mp3'},
  {'icon': iconImage, 'title': 'Mirror', 'file': '../../../../../../../Test/Music/Era/1998 - Era/Mirror.mp3'},
  {'icon': iconImage, 'title': 'Misere Mani', 'file': '../../../../../../../Test/Music/Era/2000 - Era/Misere Mani.mp3'},
  {'icon': iconImage, 'title': 'Mother', 'file': '../../../../../../../Test/Music/Era/1998 - Era/Mother.mp3'},
  {'icon': iconImage, 'title': 'Sempire Damor', 'file': '../../../../../../../Test/Music/Era/1998 - Era/Sempire D%27Amor.mp3'},
  {'icon': iconImage, 'title': 'The Mass', 'file': '../../../../../../../Test/Music/Era/2003 - The Mass/The Mass.mp3'},
]);
})

document.getElementById('evanescence').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Anywhere', 'file': '../../../../../../../Test/Music/Evanescence/2000 - Origin/Anywhere.mp3'},
  {'icon': iconImage, 'title': 'Anywhere', 'file': '../../../../../../../Test/Music/Evanescence/Origin/Anywhere .Mp3'},
  {'icon': iconImage, 'title': 'Ascension Of The Spirit', 'file': '../../../../../../../Test/Music/Evanescence/1996 - Demos/Ascension Of The Spirit.mp3'},
  {'icon': iconImage, 'title': 'Away From Me', 'file': '../../../../../../../Test/Music/Evanescence/2000 - Origin/Away From Me.mp3'},
  {'icon': iconImage, 'title': 'Away From Me', 'file': '../../../../../../../Test/Music/Evanescence/Origin/Away From Me .Mp3'},
  {'icon': iconImage, 'title': 'Bring Me To Life', 'file': '../../../../../../../Test/Music/Evanescence/Singles & Remix%27s/Bring Me to Life.mp3'},
  {'icon': iconImage, 'title': 'Bring Me To Life', 'file': '../../../../../../../Test/Music/Evanescence/2003 - Bring Me To Life/Bring me to life.mp3'},
  {'icon': iconImage, 'title': 'Evanescence Track 10', 'file': '../../../../../../../Test/Music/Evanescence/Evanescence - Track 10.mp3'},
  {'icon': iconImage, 'title': 'Evrywhere', 'file': '../../../../../../../Test/Music/Evanescence/Ultra Rare Trax Vol. 1/Evrywhere.mp3'},
  {'icon': iconImage, 'title': 'Going Under', 'file': '../../../../../../../Test/Music/Evanescence/Fallen/Going Under.mp3'},
  {'icon': iconImage, 'title': 'Going Under', 'file': '../../../../../../../Test/Music/Evanescence/2003 - Going Under/Going under.mp3'},
  {'icon': iconImage, 'title': 'Imaginary', 'file': '../../../../../../../Test/Music/Evanescence/2000 - Origin/Imaginary.mp3'},
  {'icon': iconImage, 'title': 'Imaginary', 'file': '../../../../../../../Test/Music/Evanescence/Ultra Rare Trax Vol. 1/Imaginary.mp3'},
  {'icon': iconImage, 'title': 'Lies', 'file': '../../../../../../../Test/Music/Evanescence/2000 - Origin/Lies.mp3'},
  {'icon': iconImage, 'title': 'My Immortal', 'file': '../../../../../../../Test/Music/Evanescence/2000 - Origin/My Immortal.mp3'},
  {'icon': iconImage, 'title': 'Nickelback', 'file': '../../../../../../../Test/Music/Evanescence/Daredevil/Nickelback .mp3'},
  {'icon': iconImage, 'title': 'Origin', 'file': '../../../../../../../Test/Music/Evanescence/Ultra Rare Trax Vol. 1/Origin.mp3'},
  {'icon': iconImage, 'title': 'Where Will You Go', 'file': '../../../../../../../Test/Music/Evanescence/Evanescence Ep/Where Will You Go.Mp3'},
  {'icon': iconImage, 'title': 'Where Will You Go', 'file': '../../../../../../../Test/Music/Evanescence/1998 - Evanescence EP/Where Will You Go.mp3'},
  {'icon': iconImage, 'title': 'Whisper', 'file': '../../../../../../../Test/Music/Evanescence/1999 - Sound Asleep EP/Whisper.mp3'},
  {'icon': iconImage, 'title': 'Whisper', 'file': '../../../../../../../Test/Music/Evanescence/Ultra Rare Trax Vol. 1/Whisper.mp3'},
]);
})

document.getElementById('france').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A Contre Courant', 'file': '../../../../../../../Test/Music/FRANCE/Alizee/A Contre-Courant.mp3'},
  {'icon': iconImage, 'title': 'A Toi', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/A toi.mp3'},
  {'icon': iconImage, 'title': 'Amelie Ma Dit', 'file': '../../../../../../../Test/Music/FRANCE/Alizee/Amelie_M%27a_Dit.mp3'},
  {'icon': iconImage, 'title': 'Amies Ennemies', 'file': '../../../../../../../Test/Music/FRANCE/Amies-Ennemies.mp3'},
  {'icon': iconImage, 'title': 'Autumn Dreams', 'file': '../../../../../../../Test/Music/FRANCE/FRANK DUVAL/Autumn Dreams.mp3'},
  {'icon': iconImage, 'title': 'Ballade Pour Adeline', 'file': '../../../../../../../Test/Music/FRANCE/FRANK DUVAL/Ballade pour Adeline.mp3'},
  {'icon': iconImage, 'title': 'Belle', 'file': '../../../../../../../Test/Music/FRANCE/Notre Dame de Paris/Belle.mp3'},
  {'icon': iconImage, 'title': 'Bohemienne', 'file': '../../../../../../../Test/Music/FRANCE/Notre Dame de Paris/Bohemienne.mp3'},
  {'icon': iconImage, 'title': 'Ca Va Pas Changer Le Monde', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/Ca va pas changer le monde.mp3'},
  {'icon': iconImage, 'title': 'California', 'file': '../../../../../../../Test/Music/FRANCE/Mylene Farmer/Anamorphosee -1995/California.mp3'},
  {'icon': iconImage, 'title': 'Ces Diamants La', 'file': '../../../../../../../Test/Music/FRANCE/Notre Dame de Paris/Ces Diamants-La.mp3'},
  {'icon': iconImage, 'title': 'Ciao Bambino Sorry', 'file': '../../../../../../../Test/Music/FRANCE/Ciao, Bambino, Sorry.mp3'},
  {'icon': iconImage, 'title': 'Dans Les Yeux Demilie', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1978 - Dans Les Yeux d%27Emilie/Dans Les Yeux d%27Emilie.mp3'},
  {'icon': iconImage, 'title': 'Dechire', 'file': '../../../../../../../Test/Music/FRANCE/Notre Dame de Paris/Dechire.mp3'},
  {'icon': iconImage, 'title': 'Des Mensonges En Musique', 'file': '../../../../../../../Test/Music/FRANCE/Des Mensonges En Musique.mp3'},
  {'icon': iconImage, 'title': 'Desenchantee', 'file': '../../../../../../../Test/Music/FRANCE/Mylene Farmer/L%27Autre -1991/Desenchantee.mp3'},
  {'icon': iconImage, 'title': 'Eaunanisme', 'file': '../../../../../../../Test/Music/FRANCE/Mylene Farmer/Anamorphosee -1995/Eaunanisme.mp3'},
  {'icon': iconImage, 'title': 'Emmanuelles Song', 'file': '../../../../../../../Test/Music/FRANCE/Emmanuelles Song.mp3'},
  {'icon': iconImage, 'title': 'Et Si Tu Nexistais Pas', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/Et si tu n%27existais pas.mp3'},
  {'icon': iconImage, 'title': 'Et Tournoie', 'file': '../../../../../../../Test/Music/FRANCE/Mylene Farmer/Anamorphosee -1995/Et Tournoie.mp3'},
  {'icon': iconImage, 'title': 'Face To Face', 'file': '../../../../../../../Test/Music/FRANCE/FRANK DUVAL/Face To Face.mp3'},
  {'icon': iconImage, 'title': 'Fleur Du Mal', 'file': '../../../../../../../Test/Music/FRANCE/Stephanie De Monaco/1986 - Ouragan/Fleur Du Mal.MP3'},
  {'icon': iconImage, 'title': 'Guantanamer', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1966 - Guantanamera/Guantanamer.mp3'},
  {'icon': iconImage, 'title': 'Ihistoire Dune Free Cest', 'file': '../../../../../../../Test/Music/FRANCE/Mylene Farmer/Dance Remixes -2001/I%27histoire D%27une Free, C%27est.mp3'},
  {'icon': iconImage, 'title': 'Il Etait Une Fois Nous Deux', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/Il Etait une fois nous deux.mp3'},
  {'icon': iconImage, 'title': 'Il Faut Naitre A Monaco', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/Il faut naitre a monaco.mp3'},
  {'icon': iconImage, 'title': 'In Grid In Tango', 'file': '../../../../../../../Test/Music/FRANCE/In-Grid - In-Tango.mp3'},
  {'icon': iconImage, 'title': 'In Grid Milord (dj Skydreamer Remix)', 'file': '../../../../../../../Test/Music/FRANCE/In-Grid - Milord (DJ Skydreamer remix).mp3'},
  {'icon': iconImage, 'title': 'Innamoramento', 'file': '../../../../../../../Test/Music/FRANCE/Mylene Farmer/Innamoramento/Innamoramento.mp3'},
  {'icon': iconImage, 'title': 'Intro', 'file': '../../../../../../../Test/Music/FRANCE/Notre Dame de Paris/Intro.mp3'},
  {'icon': iconImage, 'title': 'Jai Pas Vingt Ans!', 'file': '../../../../../../../Test/Music/FRANCE/Alizee/J%27ai pas vingt ans!.mp3'},
  {'icon': iconImage, 'title': 'Jen Ai Marre', 'file': '../../../../../../../Test/Music/FRANCE/Alizee/J%27en Ai Marre.mp3'},
  {'icon': iconImage, 'title': 'Joe Le Taxi', 'file': '../../../../../../../Test/Music/FRANCE/Vanessa Paradis - M & J (1988)/Joe Le Taxi.mp3'},
  {'icon': iconImage, 'title': 'La Cafe Des 3 Colombes', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/La cafe des 3 colombes.mp3'},
  {'icon': iconImage, 'title': 'La Chemin De Papa', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1967 - Les Dalton/La Chemin De Papa.mp3'},
  {'icon': iconImage, 'title': 'La Demoniselle De Deshonneur', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1978 - Dans Les Yeux d%27Emilie/La Demoniselle De Deshonneur.mp3'},
  {'icon': iconImage, 'title': 'La Fete Des Fous', 'file': '../../../../../../../Test/Music/FRANCE/Notre Dame de Paris/La Fete Des Fous.mp3'},
  {'icon': iconImage, 'title': 'La Fleur Aux Dents', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1970 - L%27Amerique/La Fleur Aux Dents.mp3'},
  {'icon': iconImage, 'title': 'Lamerique', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1970 - L%27Amerique/L%27Amerique.mp3'},
  {'icon': iconImage, 'title': 'Last Summer Day', 'file': '../../../../../../../Test/Music/FRANCE/Last Summer Day.mp3'},
  {'icon': iconImage, 'title': 'Le Chateau De Sable', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1978 - Dans Les Yeux d%27Emilie/Le Chateau De Sable.mp3'},
  {'icon': iconImage, 'title': 'Le Dernier Slow', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1979 - Le Dernier Slow/Le Dernier Slow.mp3'},
  {'icon': iconImage, 'title': 'Le Jardin Du Luxembourg', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/Le jardin du luxembourg.mp3'},
  {'icon': iconImage, 'title': 'Le Monture', 'file': '../../../../../../../Test/Music/FRANCE/Notre Dame de Paris/Le Monture.mp3'},
  {'icon': iconImage, 'title': 'Le Pettit Pain Au Chocolat', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1967 - Les Dalton/Le Pettit Pain Au Chocolat.mp3'},
  {'icon': iconImage, 'title': 'Le Temps Des Cathedrales', 'file': '../../../../../../../Test/Music/FRANCE/Notre Dame de Paris/Le Temps Des Cathedrales.mp3'},
  {'icon': iconImage, 'title': 'Le Temps Des Cathedrales Fin', 'file': '../../../../../../../Test/Music/FRANCE/Notre Dame de Paris/Le Temps Des Cathedrales Fin.mp3'},
  {'icon': iconImage, 'title': 'Lefant Trouve', 'file': '../../../../../../../Test/Music/FRANCE/Notre Dame de Paris/L%27Efant trouve.mp3'},
  {'icon': iconImage, 'title': 'Lequipe A Jojo', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1970 - L%27Amerique/L%27equipe A Jojo.mp3'},
  {'icon': iconImage, 'title': 'Les Champs Elysees', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1967 - Les Dalton/Les Champs-Elysees.mp3'},
  {'icon': iconImage, 'title': 'Les Cloches', 'file': '../../../../../../../Test/Music/FRANCE/Notre Dame de Paris/Les Cloches.mp3'},
  {'icon': iconImage, 'title': 'Lete Indien', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/L%27ete indien.mp3'},
  {'icon': iconImage, 'title': 'Magnetic Fields', 'file': '../../../../../../../Test/Music/FRANCE/Magnetic Fields.mp3'},
  {'icon': iconImage, 'title': 'Mamme Blue', 'file': '../../../../../../../Test/Music/FRANCE/Mamme Blue.mp3'},
  {'icon': iconImage, 'title': 'Moi  Lolita', 'file': '../../../../../../../Test/Music/FRANCE/Alizee/Moi.... Lolita.mp3'},
  {'icon': iconImage, 'title': 'Moi Lolita', 'file': '../../../../../../../Test/Music/FRANCE/Alizee/Moi Lolita.mp4'},
  {'icon': iconImage, 'title': 'Mon Maguis', 'file': '../../../../../../../Test/Music/FRANCE/Alizee/Mon Maguis.mp3'},
  {'icon': iconImage, 'title': 'Mon Mec A Moi', 'file': '../../../../../../../Test/Music/FRANCE/Mon Mec A Moi.mp3'},
  {'icon': iconImage, 'title': 'Noiisette Et Cassidy', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1978 - Dans Les Yeux d%27Emilie/Noiisette Et Cassidy.mp3'},
  {'icon': iconImage, 'title': 'Non Je Ne Regrette Rien', 'file': '../../../../../../../Test/Music/FRANCE/Non.Je Ne Regrette Rien.mp3'},
  {'icon': iconImage, 'title': 'Pardone Moi', 'file': '../../../../../../../Test/Music/FRANCE/Pardone moi.mp3'},
  {'icon': iconImage, 'title': 'Paroles Paroles', 'file': '../../../../../../../Test/Music/FRANCE/Paroles Paroles.mp3'},
  {'icon': iconImage, 'title': 'Regrets', 'file': '../../../../../../../Test/Music/FRANCE/Mylene Farmer/L%27Autre -1991/Regrets.mp3'},
  {'icon': iconImage, 'title': 'Rendez Vous', 'file': '../../../../../../../Test/Music/FRANCE/Stephanie De Monaco/1986 - Ouragan/Rendez-Vous.MP3'},
  {'icon': iconImage, 'title': 'Salut', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/Salut.mp3'},
  {'icon': iconImage, 'title': 'Salut Les Amoureux', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1972 - La Complainte De L%27Heure De Pointe/Salut Les Amoureux.mp3'},
  {'icon': iconImage, 'title': 'Scaled With A Kiss', 'file': '../../../../../../../Test/Music/FRANCE/Scaled With A Kiss.mp3'},
  {'icon': iconImage, 'title': 'Schwarzer Walzer', 'file': '../../../../../../../Test/Music/FRANCE/FRANK DUVAL/Schwarzer Walzer.mp3'},
  {'icon': iconImage, 'title': 'Si Tu Tappelles Melancolie', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1974 - Si Tu T%27appelles Melancolie/Si Tu T%27appelles Melancolie.mp3'},
  {'icon': iconImage, 'title': 'Siffler Sur La Colline', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1967 - Les Dalton/Siffler Sur La Colline.mp3'},
  {'icon': iconImage, 'title': 'Sound', 'file': '../../../../../../../Test/Music/FRANCE/FRANK DUVAL/Sound.mp3'},
  {'icon': iconImage, 'title': 'Taka Takata', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1972 - La Complainte De L%27Heure De Pointe/Taka Takata.mp3'},
  {'icon': iconImage, 'title': 'Take My Breath Away', 'file': '../../../../../../../Test/Music/FRANCE/Take my breath away.mp3'},
  {'icon': iconImage, 'title': 'The Guitar Dont Lie (le Marche Aux Puces)', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1979 - Le Dernier Slow/The guitar don%27t lie (Le marche aux puces).mp3'},
  {'icon': iconImage, 'title': 'Tombe La Neige', 'file': '../../../../../../../Test/Music/FRANCE/Tombe La Neige.mp3'},
  {'icon': iconImage, 'title': 'Track 8', 'file': '../../../../../../../Test/Music/FRANCE/Mylene Farmer/TRACK__8.MP3'},
  {'icon': iconImage, 'title': 'Tristana', 'file': '../../../../../../../Test/Music/FRANCE/Mylene Farmer/Dance Remixes -1995/Tristana.MP3'},
  {'icon': iconImage, 'title': 'Tu Vas Me Detruire', 'file': '../../../../../../../Test/Music/FRANCE/Notre Dame de Paris/Tu Vas Me Detruire.mp3'},
  {'icon': iconImage, 'title': 'Une Histoire Damour', 'file': '../../../../../../../Test/Music/FRANCE/Une Histoire-D%27Amour.mp3'},
  {'icon': iconImage, 'title': 'Vade Retro', 'file': '../../../../../../../Test/Music/FRANCE/Joseph Ira Dassin/1974 - Si Tu T%27appelles Melancolie/Vade Retro.mp3'},
  {'icon': iconImage, 'title': 'Venus De Abribus', 'file': '../../../../../../../Test/Music/FRANCE/Venus de Abribus.mp3'},
  {'icon': iconImage, 'title': 'Wanderful Live', 'file': '../../../../../../../Test/Music/FRANCE/Wanderful Live.mp3'},
  {'icon': iconImage, 'title': 'What Can I Do', 'file': '../../../../../../../Test/Music/FRANCE/What Can I Do.mp3'},
  {'icon': iconImage, 'title': 'Xxl', 'file': '../../../../../../../Test/Music/FRANCE/Mylene Farmer/Anamorphosee -1995/XXL.mp3'},
]);
})

document.getElementById('gipsykings').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Bamboleo', 'file': '../../../../../../../Test/Music/Gipsy Kings/1988 - Gipsy Kings/Bamboleo.mp3'},
  {'icon': iconImage, 'title': 'Inspiration', 'file': '../../../../../../../Test/Music/Gipsy Kings/1988 - Gipsy Kings/Inspiration.mp3'},
  {'icon': iconImage, 'title': 'Luna De Fuego', 'file': '../../../../../../../Test/Music/Gipsy Kings/1983 - Luna De Fuego/Luna De Fuego.mp3'},
  {'icon': iconImage, 'title': 'Soy', 'file': '../../../../../../../Test/Music/Gipsy Kings/1989 - Mosaique/Soy .mp3'},
  {'icon': iconImage, 'title': 'Soy', 'file': '../../../../../../../Test/Music/Gipsy Kings/1989 - Mosaique/Soy.mp3'},
  {'icon': iconImage, 'title': 'Un Amor', 'file': '../../../../../../../Test/Music/Gipsy Kings/1988 - Gipsy Kings/Un Amor.mp3'},
  {'icon': iconImage, 'title': 'Volare', 'file': '../../../../../../../Test/Music/Gipsy Kings/1989 - Mosaique/Volare.mp3'},
  {'icon': iconImage, 'title': 'Volare (live)', 'file': '../../../../../../../Test/Music/Gipsy Kings/1989 - Mosaique/Volare (Live).mp3'},
]);
})

document.getElementById('imaginedragons').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Bad Liar', 'file': '../../../../../../../Test/Music/Imagine Dragons/Bad Liar.mp4'},
  {'icon': iconImage, 'title': 'Bad Liar', 'file': '../../../../../../../Test/Music/Imagine Dragons/Bad Liar.mp3'},
  {'icon': iconImage, 'title': 'Believer', 'file': '../../../../../../../Test/Music/Imagine Dragons/Believer.mp4'},
  {'icon': iconImage, 'title': 'Believer', 'file': '../../../../../../../Test/Music/Imagine Dragons/Believer.mp3'},
  {'icon': iconImage, 'title': 'Birds', 'file': '../../../../../../../Test/Music/Imagine Dragons/Birds.mp4'},
  {'icon': iconImage, 'title': 'Birds', 'file': '../../../../../../../Test/Music/Imagine Dragons/Birds.mp3'},
  {'icon': iconImage, 'title': 'Demons', 'file': '../../../../../../../Test/Music/Imagine Dragons/Demons.mp4'},
  {'icon': iconImage, 'title': 'Demons', 'file': '../../../../../../../Test/Music/Imagine Dragons/Demons.mp3'},
  {'icon': iconImage, 'title': 'Its Time', 'file': '../../../../../../../Test/Music/Imagine Dragons/It%27s Time.mp4'},
  {'icon': iconImage, 'title': 'Its Time', 'file': '../../../../../../../Test/Music/Imagine Dragons/It%27s Time.mp3'},
  {'icon': iconImage, 'title': 'Thunder', 'file': '../../../../../../../Test/Music/Imagine Dragons/Thunder.mp4'},
  {'icon': iconImage, 'title': 'Thunder', 'file': '../../../../../../../Test/Music/Imagine Dragons/Thunder.mp3'},
  {'icon': iconImage, 'title': 'Walking The Wire', 'file': '../../../../../../../Test/Music/Imagine Dragons/Walking The Wire.mp4'},
  {'icon': iconImage, 'title': 'Whatever It Takes', 'file': '../../../../../../../Test/Music/Imagine Dragons/Whatever It Takes.mp4'},
  {'icon': iconImage, 'title': 'Whatever It Takes', 'file': '../../../../../../../Test/Music/Imagine Dragons/Whatever It Takes.mp3'},
]);
})

document.getElementById('italiano').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Cancion Del Mariachi', 'file': '../../../../../../../Test/Music/Italiano/Cancion Del Mariachi.mp3'},
  {'icon': iconImage, 'title': 'Caruso', 'file': '../../../../../../../Test/Music/Italiano/Caruso.mp3'},
  {'icon': iconImage, 'title': 'Carusо', 'file': '../../../../../../../Test/Music/Italiano/Carusо.MP3'},
  {'icon': iconImage, 'title': 'Casa Mia', 'file': '../../../../../../../Test/Music/Italiano/Ricchi & Poveri/1990 - Hasta La Vista, Signora-Le Grand Ricchi E Poveri/Casa Mia.mp3'},
  {'icon': iconImage, 'title': 'Cosa Sei', 'file': '../../../../../../../Test/Music/Italiano/Ricchi & Poveri/1983 - Voulez Vous Dancer/Cosa Sei.mp3'},
  {'icon': iconImage, 'title': 'Cose Della Vita', 'file': '../../../../../../../Test/Music/Italiano/Cose della vita.mp3'},
  {'icon': iconImage, 'title': 'Donna Musica', 'file': '../../../../../../../Test/Music/Italiano/Donna Musica.mp3'},
  {'icon': iconImage, 'title': 'Felichita', 'file': '../../../../../../../Test/Music/Italiano/Felichita.mp3'},
  {'icon': iconImage, 'title': 'Godfather', 'file': '../../../../../../../Test/Music/Italiano/Godfather.mp3'},
  {'icon': iconImage, 'title': 'Il Tempo Se Ne Va', 'file': '../../../../../../../Test/Music/Italiano/Il tempo se ne va.mp3'},
  {'icon': iconImage, 'title': 'Italiano', 'file': '../../../../../../../Test/Music/Italiano/Italiano.mp3'},
  {'icon': iconImage, 'title': 'La Notte', 'file': '../../../../../../../Test/Music/Italiano/La notte.mp3'},
  {'icon': iconImage, 'title': 'Liberta', 'file': '../../../../../../../Test/Music/Italiano/Liberta.mp3'},
  {'icon': iconImage, 'title': 'Mamma Maria', 'file': '../../../../../../../Test/Music/Italiano/Ricchi & Poveri/1982 - Mamma Maria/Mamma Maria.mp3'},
  {'icon': iconImage, 'title': 'Mamma Maria 1983', 'file': '../../../../../../../Test/Music/Italiano/Ricchi & Poveri/1982 - Mamma Maria/Mamma Maria 1983.mp4'},
  {'icon': iconImage, 'title': 'Natalie', 'file': '../../../../../../../Test/Music/Italiano/Natalie.mp4'},
  {'icon': iconImage, 'title': 'O Sole Mio', 'file': '../../../../../../../Test/Music/Italiano/O sole mio.mp3'},
  {'icon': iconImage, 'title': 'Piccolo Amore', 'file': '../../../../../../../Test/Music/Italiano/Ricchi & Poveri/1982 - Mamma Maria/Piccolo Amore.mp3'},
  {'icon': iconImage, 'title': 'Piu Che Puoi', 'file': '../../../../../../../Test/Music/Italiano/Piu che puoi.mp3'},
  {'icon': iconImage, 'title': 'Sara Perche Ti Amo', 'file': '../../../../../../../Test/Music/Italiano/Ricchi & Poveri/Sara Perche Ti Amo .mp3'},
  {'icon': iconImage, 'title': 'Sara Perche Ti Amo', 'file': '../../../../../../../Test/Music/Italiano/Ricchi & Poveri/1981 - E Penso A Te/Sara Perche Ti Amo.mp3'},
  {'icon': iconImage, 'title': 'Senza Una Donna', 'file': '../../../../../../../Test/Music/Italiano/Senza Una Donna.mp3'},
  {'icon': iconImage, 'title': 'Sharazan', 'file': '../../../../../../../Test/Music/Italiano/Sharazan.mp3'},
  {'icon': iconImage, 'title': 'Soli', 'file': '../../../../../../../Test/Music/Italiano/Soli.mp3'},
  {'icon': iconImage, 'title': 'Solo Noi', 'file': '../../../../../../../Test/Music/Italiano/Solo Noi.mp3'},
  {'icon': iconImage, 'title': 'Sudinoi', 'file': '../../../../../../../Test/Music/Italiano/Sudinoi.mp3'},
  {'icon': iconImage, 'title': 'Sоli', 'file': '../../../../../../../Test/Music/Italiano/Sоli.mp3'},
  {'icon': iconImage, 'title': 'Tu', 'file': '../../../../../../../Test/Music/Italiano/Tu.mp3'},
  {'icon': iconImage, 'title': 'Uomini Soli', 'file': '../../../../../../../Test/Music/Italiano/Uomini soli.mp3'},
  {'icon': iconImage, 'title': 'Vivo Per Lei', 'file': '../../../../../../../Test/Music/Italiano/Vivo Per Lei.mp3'},
  {'icon': iconImage, 'title': 'Voulez Vous Dancer', 'file': '../../../../../../../Test/Music/Italiano/Ricchi & Poveri/1983 - Voulez Vous Dancer/Voulez Vous Dancer.mp3'},
]);
})

document.getElementById('koяn').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Alone I Break', 'file': '../../../../../../../Test/Music/Koяn/2002 - Untouchables/Alone I break.mp3'},
  {'icon': iconImage, 'title': 'Another Brick In The Wall', 'file': '../../../../../../../Test/Music/Koяn/2004 - GREATEST HITS/Another Brick In The Wall.mp3'},
  {'icon': iconImage, 'title': 'Coming Undone', 'file': '../../../../../../../Test/Music/Koяn/2007 - Mtv Unplugged/Coming Undone.mp3'},
  {'icon': iconImage, 'title': 'Creep', 'file': '../../../../../../../Test/Music/Koяn/2007 - Mtv Unplugged/Creep.mp3'},
  {'icon': iconImage, 'title': 'Did My Time', 'file': '../../../../../../../Test/Music/Koяn/2003 - Take a Look In The Mirror/Did My Time.mp3'},
  {'icon': iconImage, 'title': 'Eaten Up Inside', 'file': '../../../../../../../Test/Music/Koяn/2006 - Coming Undone/Eaten Up Inside.mp3'},
  {'icon': iconImage, 'title': 'Evolution', 'file': '../../../../../../../Test/Music/Koяn/2007 - Evolution/Evolution.mp3'},
  {'icon': iconImage, 'title': 'Falling Away From Me', 'file': '../../../../../../../Test/Music/Koяn/2006 - LIVE & RARE/Falling Away From Me.mp3'},
  {'icon': iconImage, 'title': 'Freak On A Leash', 'file': '../../../../../../../Test/Music/Koяn/2004 - GREATEST HITS/Freak On A Leash.mp3'},
  {'icon': iconImage, 'title': 'Here To Stay', 'file': '../../../../../../../Test/Music/Koяn/2004 - GREATEST HITS/Here To Stay.mp3'},
  {'icon': iconImage, 'title': 'Innocent Bystander', 'file': '../../../../../../../Test/Music/Koяn/2007 - Untitled/Innocent Bystander.mp3'},
  {'icon': iconImage, 'title': 'Killing', 'file': '../../../../../../../Test/Music/Koяn/2007 - Untitled/Killing.mp3'},
  {'icon': iconImage, 'title': 'Kiss', 'file': '../../../../../../../Test/Music/Koяn/2007 - Untitled/Kiss.mp3'},
  {'icon': iconImage, 'title': 'Love Song', 'file': '../../../../../../../Test/Music/Koяn/2005 - See You On The Other Side/Love Song.mp3'},
  {'icon': iconImage, 'title': 'Make It Go Away', 'file': '../../../../../../../Test/Music/Koяn/2002 - Untouchables/Make It Go Away.mp3'},
  {'icon': iconImage, 'title': 'Open Up', 'file': '../../../../../../../Test/Music/Koяn/2005 - See You On The Other Side/Open Up.mp3'},
  {'icon': iconImage, 'title': 'Somebody Someone', 'file': '../../../../../../../Test/Music/Koяn/2004 - GREATEST HITS/Somebody Someone.mp3'},
  {'icon': iconImage, 'title': 'Tear Me Down', 'file': '../../../../../../../Test/Music/Koяn/2002 - Untouchables/Tear Me Down.mp3'},
  {'icon': iconImage, 'title': 'When Will This End', 'file': '../../../../../../../Test/Music/Koяn/2003 - Take a Look In The Mirror/When Will This End.mp3'},
  {'icon': iconImage, 'title': 'Word Up!', 'file': '../../../../../../../Test/Music/Koяn/2004 - GREATEST HITS/Word Up!.mp3'},
  {'icon': iconImage, 'title': 'Yall Want A Single', 'file': '../../../../../../../Test/Music/Koяn/2003 - Take a Look In The Mirror/Ya%27ll Want A Single.mp3'},
]);
})

document.getElementById('limpbizkit').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Behind Blue Eyes', 'file': '../../../../../../../Test/Music/Limp Bizkit/2003 - Results May Vary/Behind Blue Eyes.mp3'},
  {'icon': iconImage, 'title': 'Boiler', 'file': '../../../../../../../Test/Music/Limp Bizkit/2000 - Chocolate Starfish And The Hot Dog Flavored Water/Boiler.mp3'},
  {'icon': iconImage, 'title': 'Break Stuff', 'file': '../../../../../../../Test/Music/Limp Bizkit/1999 - Significant Other/Break Stuff.mp3'},
  {'icon': iconImage, 'title': 'Build A Bridge', 'file': '../../../../../../../Test/Music/Limp Bizkit/2003 - Results May Vary/Build a Bridge.mp3'},
  {'icon': iconImage, 'title': 'Faith', 'file': '../../../../../../../Test/Music/Limp Bizkit/1997-2002 - White Side - Rare, Demos and Lost sound/Faith.mp3'},
  {'icon': iconImage, 'title': 'Getcha Groove On', 'file': '../../../../../../../Test/Music/Limp Bizkit/2000 - Chocolate Starfish And The Hot Dog Flavored Water/Getcha Groove On.mp3'},
  {'icon': iconImage, 'title': 'Itll Be Ok', 'file': '../../../../../../../Test/Music/Limp Bizkit/2000 - Chocolate Starfish And The Hot Dog Flavored Water/It%27ll Be OK.mp3'},
  {'icon': iconImage, 'title': 'Lonely World', 'file': '../../../../../../../Test/Music/Limp Bizkit/2003 - Results May Vary/Lonely World.mp3'},
  {'icon': iconImage, 'title': 'My Way', 'file': '../../../../../../../Test/Music/Limp Bizkit/2000 - Chocolate Starfish And The Hot Dog Flavored Water/My Way.mp3'},
  {'icon': iconImage, 'title': 'Rollin', 'file': '../../../../../../../Test/Music/Limp Bizkit/2000 - Chocolate Starfish And The Hot Dog Flavored Water/Rollin.mp3'},
  {'icon': iconImage, 'title': 'Take A Look Around', 'file': '../../../../../../../Test/Music/Limp Bizkit/2000 - Chocolate Starfish And The Hot Dog Flavored Water/Take A Look Around.mp3'},
]);
})

document.getElementById('linkinpark').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '1stp Klosr', 'file': '../../../../../../../Test/Music/Linkin Park/2002 - Reanimation/1stp Klosr.mp3'},
  {'icon': iconImage, 'title': 'A Place For My Head', 'file': '../../../../../../../Test/Music/Linkin Park/1999 - Hybrid Theory/A Place For My Head.mp3'},
  {'icon': iconImage, 'title': 'All For Nothing', 'file': '../../../../../../../Test/Music/Linkin Park/All For Nothing.mp4'},
  {'icon': iconImage, 'title': 'All For Nothing', 'file': '../../../../../../../Test/Music/Linkin Park/All for nothing.mp3'},
  {'icon': iconImage, 'title': 'Bleed It Out', 'file': '../../../../../../../Test/Music/Linkin Park/2007 - Minutes To Midnight/Bleed It Out.mp3'},
  {'icon': iconImage, 'title': 'Breaking The Habit', 'file': '../../../../../../../Test/Music/Linkin Park/2003 - Meteora/Breaking The Habit.mp3'},
  {'icon': iconImage, 'title': 'Crawling', 'file': '../../../../../../../Test/Music/Linkin Park/1999 - Hybrid Theory/Crawling.mp3'},
  {'icon': iconImage, 'title': 'Cure For The Itch', 'file': '../../../../../../../Test/Music/Linkin Park/1999 - Hybrid Theory/Cure For the Itch.mp3'},
  {'icon': iconImage, 'title': 'Easier To Run', 'file': '../../../../../../../Test/Music/Linkin Park/2003 - Meteora/Easier To Run.mp3'},
  {'icon': iconImage, 'title': 'Faint', 'file': '../../../../../../../Test/Music/Linkin Park/2003 - Meteora/Faint.mp3'},
  {'icon': iconImage, 'title': 'Figure 09', 'file': '../../../../../../../Test/Music/Linkin Park/2003 - Meteora/Figure.09.mp3'},
  {'icon': iconImage, 'title': 'Forgotten', 'file': '../../../../../../../Test/Music/Linkin Park/1999 - Hybrid Theory/Forgotten.mp3'},
  {'icon': iconImage, 'title': 'From The Inside', 'file': '../../../../../../../Test/Music/Linkin Park/2003 - Meteora/From The Inside.mp3'},
  {'icon': iconImage, 'title': 'Giving In', 'file': '../../../../../../../Test/Music/Linkin Park/2006 - Project Revolution/Giving In.mp3'},
  {'icon': iconImage, 'title': 'In The End', 'file': '../../../../../../../Test/Music/Linkin Park/1999 - Hybrid Theory/In the End.mp3'},
  {'icon': iconImage, 'title': 'Krwlng', 'file': '../../../../../../../Test/Music/Linkin Park/2002 - Reanimation/Krwlng.mp3'},
  {'icon': iconImage, 'title': 'Leave Out All The Rest', 'file': '../../../../../../../Test/Music/Linkin Park/2007 - Minutes To Midnight/Leave Out All The Rest.mp3'},
  {'icon': iconImage, 'title': 'My December (single)', 'file': '../../../../../../../Test/Music/Linkin Park/2000 - Live/My December (single).mp3'},
  {'icon': iconImage, 'title': 'No More Sorrow', 'file': '../../../../../../../Test/Music/Linkin Park/2007 - Minutes To Midnight/No More Sorrow.mp3'},
  {'icon': iconImage, 'title': 'Numb', 'file': '../../../../../../../Test/Music/Linkin Park/2003 - Meteora/Numb.mp3'},
  {'icon': iconImage, 'title': 'One Step Closer', 'file': '../../../../../../../Test/Music/Linkin Park/1999 - Hybrid Theory/One Step Closer.mp3'},
  {'icon': iconImage, 'title': 'P5hng Me Axwy', 'file': '../../../../../../../Test/Music/Linkin Park/2002 - Reanimation/P5hng Me Axwy.mp3'},
  {'icon': iconImage, 'title': 'Papercut', 'file': '../../../../../../../Test/Music/Linkin Park/1999 - Hybrid Theory/Papercut.mp3'},
  {'icon': iconImage, 'title': 'Plc 4 Mie Head', 'file': '../../../../../../../Test/Music/Linkin Park/2002 - Reanimation/Plc.4 Mie Head.mp3'},
  {'icon': iconImage, 'title': 'Points Of Authority', 'file': '../../../../../../../Test/Music/Linkin Park/1999 - Hybrid Theory/Points of Authority.mp3'},
  {'icon': iconImage, 'title': 'Pushing Me Away', 'file': '../../../../../../../Test/Music/Linkin Park/1999 - Hybrid Theory/Pushing Me Away.mp3'},
  {'icon': iconImage, 'title': 'Runaway', 'file': '../../../../../../../Test/Music/Linkin Park/1999 - Hybrid Theory/Runaway.mp3'},
  {'icon': iconImage, 'title': 'Session', 'file': '../../../../../../../Test/Music/Linkin Park/2003 - Meteora/Session.mp3'},
  {'icon': iconImage, 'title': 'Somewhere I Belong', 'file': '../../../../../../../Test/Music/Linkin Park/2003 - Meteora/Somewhere I Belong.mp3'},
  {'icon': iconImage, 'title': 'Wake', 'file': '../../../../../../../Test/Music/Linkin Park/2007 - Minutes To Midnight/Wake.mp3'},
  {'icon': iconImage, 'title': 'What Ive Done', 'file': '../../../../../../../Test/Music/Linkin Park/2007 - Minutes To Midnight/What I%27ve Done.mp3'},
  {'icon': iconImage, 'title': 'With You', 'file': '../../../../../../../Test/Music/Linkin Park/1999 - Hybrid Theory/With You.mp3'},
]);
})

document.getElementById('madonna').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'American Life', 'file': '../../../../../../../Test/Music/Madonna/2003 - American Life/American Life.mp3'},
  {'icon': iconImage, 'title': 'Beautiful Stranger', 'file': '../../../../../../../Test/Music/Madonna/1999 - Beautiful Stranger/Beautiful stranger.mp3'},
  {'icon': iconImage, 'title': 'Die Another Day', 'file': '../../../../../../../Test/Music/Madonna/2002 - Die Another Day/Die Another Day.mp3'},
  {'icon': iconImage, 'title': 'Dont Tell Me', 'file': '../../../../../../../Test/Music/Madonna/2000 - Music/Don%27t tell me.mp3'},
  {'icon': iconImage, 'title': 'Frozen', 'file': '../../../../../../../Test/Music/Madonna/1998 - Ray Of Light/Frozen.mp3'},
  {'icon': iconImage, 'title': 'La Isla Bonita', 'file': '../../../../../../../Test/Music/Madonna/1986 - True Blue/La isla bonita.mp3'},
  {'icon': iconImage, 'title': 'Live To Tell', 'file': '../../../../../../../Test/Music/Madonna/1995 - Something To Remember/Live To Tell.mp3'},
  {'icon': iconImage, 'title': 'Music', 'file': '../../../../../../../Test/Music/Madonna/2000 - Music/Music.mp3'},
  {'icon': iconImage, 'title': 'Power Of Good Bye', 'file': '../../../../../../../Test/Music/Madonna/2003 - American Life/Power of good-bye.mp3'},
  {'icon': iconImage, 'title': 'Secret', 'file': '../../../../../../../Test/Music/Madonna/1994 - Bedtime Stories/Secret.mp3'},
  {'icon': iconImage, 'title': 'Sorry', 'file': '../../../../../../../Test/Music/Madonna/2007 - The Confessions Tour/Sorry.mp3'},
  {'icon': iconImage, 'title': 'Youll See', 'file': '../../../../../../../Test/Music/Madonna/1995 - Something To Remember/You%27ll see.mp3'},
]);
})

document.getElementById('maywood').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Give Me Back My Love', 'file': '../../../../../../../Test/Music/Maywood/1980 - Late At Night/Give Me Back My Love.mp3'},
  {'icon': iconImage, 'title': 'I Only Want To Be With You', 'file': '../../../../../../../Test/Music/Maywood/1991 - Walking Back To Happiness/I Only Want To Be With You.mp3'},
  {'icon': iconImage, 'title': 'Pasadena', 'file': '../../../../../../../Test/Music/Maywood/1981 - Different Worlds/Pasadena.mp3'},
  {'icon': iconImage, 'title': 'Will You Still Love Me Tomorrow', 'file': '../../../../../../../Test/Music/Maywood/1991 - Walking Back To Happiness/Will You Still Love Me Tomorrow.mp3'},
]);
})

document.getElementById('metallica').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Astronomy', 'file': '../../../../../../../Test/Music/Metallica/1998 - Garage Inc/Astronomy.mp3'},
  {'icon': iconImage, 'title': 'Bleeding Me', 'file': '../../../../../../../Test/Music/Metallica/1996 - Load/Bleeding Me.mp3'},
  {'icon': iconImage, 'title': 'Devils Dance', 'file': '../../../../../../../Test/Music/Metallica/1997 - Reload/Devil%27s Dance.mp3'},
  {'icon': iconImage, 'title': 'Enter Sandman', 'file': '../../../../../../../Test/Music/Metallica/1991 - Metallica/Enter Sandman.mp3'},
  {'icon': iconImage, 'title': 'Fade To Black', 'file': '../../../../../../../Test/Music/Metallica/1984 - Ride The Lightning/Fade To Black.mp3'},
  {'icon': iconImage, 'title': 'Fuel', 'file': '../../../../../../../Test/Music/Metallica/1997 - Reload/Fuel.mp3'},
  {'icon': iconImage, 'title': 'Hero Of The Day', 'file': '../../../../../../../Test/Music/Metallica/1996 - Load/Hero Of The Day.mp3'},
  {'icon': iconImage, 'title': 'I Disappear', 'file': '../../../../../../../Test/Music/Metallica/2003 - St. Anger/I Disappear.MP3'},
  {'icon': iconImage, 'title': 'Loverman', 'file': '../../../../../../../Test/Music/Metallica/1991 - Metallica/Loverman.mp3'},
  {'icon': iconImage, 'title': 'Low Mans Lyric', 'file': '../../../../../../../Test/Music/Metallica/1997 - Reload/Low Man%27s Lyric.mp3'},
  {'icon': iconImage, 'title': 'Mama Said', 'file': '../../../../../../../Test/Music/Metallica/1996 - Load/Mama Said.mp3'},
  {'icon': iconImage, 'title': 'Master Of Puppets (live Berlin 09 12 2008)', 'file': '../../../../../../../Test/Music/Metallica/2008 - All Nightmare Long/Master of Puppets (Live Berlin 09.12.2008).mp3'},
  {'icon': iconImage, 'title': 'No Leaf Clover', 'file': '../../../../../../../Test/Music/Metallica/1999 - S&M/No Leaf Clover.mp3'},
  {'icon': iconImage, 'title': 'Nothing Else Matters', 'file': '../../../../../../../Test/Music/Metallica/1991 - Metallica/Nothing Else Matters.mp3'},
  {'icon': iconImage, 'title': 'One', 'file': '../../../../../../../Test/Music/Metallica/1988 - And Justice For All/One.mp3'},
  {'icon': iconImage, 'title': 'Sad But True', 'file': '../../../../../../../Test/Music/Metallica/1991 - Metallica/Sad But True.mp3'},
  {'icon': iconImage, 'title': 'Shoot Me Again', 'file': '../../../../../../../Test/Music/Metallica/2003 - St. Anger/Shoot Me Again.mp3'},
  {'icon': iconImage, 'title': 'St Anger', 'file': '../../../../../../../Test/Music/Metallica/2003 - St. Anger/St. Anger.mp3'},
  {'icon': iconImage, 'title': 'The Ecstasy Of Gold', 'file': '../../../../../../../Test/Music/Metallica/1999 - S&M/The Ecstasy Of Gold.mp3'},
  {'icon': iconImage, 'title': 'The Memory Remains', 'file': '../../../../../../../Test/Music/Metallica/1997 - Reload/The Memory Remains.mp3'},
  {'icon': iconImage, 'title': 'The Outlaw Torn', 'file': '../../../../../../../Test/Music/Metallica/1996 - Load/The Outlaw Torn.mp3'},
  {'icon': iconImage, 'title': 'The Thing That Should Not Be', 'file': '../../../../../../../Test/Music/Metallica/1999 - S&M/The Thing That Should Not Be.mp3'},
  {'icon': iconImage, 'title': 'The Unforgiven', 'file': '../../../../../../../Test/Music/Metallica/1991 - Metallica/The Unforgiven.MP3'},
  {'icon': iconImage, 'title': 'The Unforgiven Ii', 'file': '../../../../../../../Test/Music/Metallica/1997 - Reload/The Unforgiven II.mp3'},
  {'icon': iconImage, 'title': 'Through The Never', 'file': '../../../../../../../Test/Music/Metallica/1991 - Metallica/Through The Never.mp3'},
  {'icon': iconImage, 'title': 'Until It Sleeps', 'file': '../../../../../../../Test/Music/Metallica/1996 - Load/Until It Sleeps.mp3'},
  {'icon': iconImage, 'title': 'Welcome Home', 'file': '../../../../../../../Test/Music/Metallica/1986 - Master Of Puppets/Welcome Home.mp3'},
  {'icon': iconImage, 'title': 'Wherever I May Roam', 'file': '../../../../../../../Test/Music/Metallica/1991 - Metallica/Wherever I May Roam.mp3'},
  {'icon': iconImage, 'title': 'Wherever I May Roam (live Berlin 09 12 2008)', 'file': '../../../../../../../Test/Music/Metallica/2008 - All Nightmare Long/Wherever I May Roam (Live Berlin 09.12.2008).mp3'},
  {'icon': iconImage, 'title': 'Whiskey In Jar', 'file': '../../../../../../../Test/Music/Metallica/1998 - Garage Inc/Whiskey In Jar.mp3'},
]);
})

document.getElementById('michaeljackson').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Bad', 'file': '../../../../../../../Test/Music/Michael Jackson/1987 - Bad/Bad.mp3'},
  {'icon': iconImage, 'title': 'Billie Jean', 'file': '../../../../../../../Test/Music/Michael Jackson/1982 - Thriller/Billie Jean.mp3'},
  {'icon': iconImage, 'title': 'Black Or White', 'file': '../../../../../../../Test/Music/Michael Jackson/1991 - Dangerous/Black Or White.mp3'},
  {'icon': iconImage, 'title': 'Come Together', 'file': '../../../../../../../Test/Music/Michael Jackson/1995 - HIStory/Come Together.mp3'},
  {'icon': iconImage, 'title': 'Dirty Diana', 'file': '../../../../../../../Test/Music/Michael Jackson/1987 - Bad/Dirty Diana.mp3'},
  {'icon': iconImage, 'title': 'Earth Song', 'file': '../../../../../../../Test/Music/Michael Jackson/1995 - HIStory/Earth Song.mp3'},
  {'icon': iconImage, 'title': 'Give In To Me', 'file': '../../../../../../../Test/Music/Michael Jackson/1991 - Dangerous/Give In To Me.mp3'},
  {'icon': iconImage, 'title': 'Human Nature', 'file': '../../../../../../../Test/Music/Michael Jackson/1982 - Thriller/Human Nature.mp3'},
  {'icon': iconImage, 'title': 'Leave Me Alone', 'file': '../../../../../../../Test/Music/Michael Jackson/1987 - Bad/Leave Me Alone.mp3'},
  {'icon': iconImage, 'title': 'Michael Jackson You Are Not Alone Live In Munic', 'file': '../../../../../../../Test/Music/Michael Jackson/1995 - HIStory/michael_jackson_-_you_are_not_alone_live_in_munic.mp3'},
  {'icon': iconImage, 'title': 'Smooth Criminal', 'file': '../../../../../../../Test/Music/Michael Jackson/1987 - Bad/Smooth Criminal.mp3'},
  {'icon': iconImage, 'title': 'They Dont Care About Us', 'file': '../../../../../../../Test/Music/Michael Jackson/1995 - HIStory/They Don%27t Care About Us.mp3'},
  {'icon': iconImage, 'title': 'You Are Not Alone', 'file': '../../../../../../../Test/Music/Michael Jackson/1995 - HIStory/You Are Not Alone.mp3'},
]);
})

document.getElementById('moderntalking').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Chery Chery Lady', 'file': '../../../../../../../Test/Music/Modern talking/Chery, Chery Lady.mp3'},
  {'icon': iconImage, 'title': 'Cinderella Girl', 'file': '../../../../../../../Test/Music/Modern talking/2001 - Win The Race/Cinderella Girl.mp3'},
  {'icon': iconImage, 'title': 'Im Not Rockfeller', 'file': '../../../../../../../Test/Music/Modern talking/I%27m not Rockfeller.mp3'},
  {'icon': iconImage, 'title': 'Last Exit To Brooklyn', 'file': '../../../../../../../Test/Music/Modern talking/2001 - America/Last Exit To Brooklyn.mp3'},
  {'icon': iconImage, 'title': 'No Face No Name No Number', 'file': '../../../../../../../Test/Music/Modern talking/No Face No Name No Number.mp3'},
  {'icon': iconImage, 'title': 'Sms To My Heart', 'file': '../../../../../../../Test/Music/Modern talking/2001 - America/SMS To My Heart.mp3'},
  {'icon': iconImage, 'title': 'Tv Makes The Superstar', 'file': '../../../../../../../Test/Music/Modern talking/2003 - Universe/TV Makes The Superstar.mp3'},
  {'icon': iconImage, 'title': 'Win The Race', 'file': '../../../../../../../Test/Music/Modern talking/2001 - America/Win The Race.mp3'},
  {'icon': iconImage, 'title': 'Youre My Heart', 'file': '../../../../../../../Test/Music/Modern talking/You%27re My Heart.mp3'},
]);
})

document.getElementById('morcheeba').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Enjoy The Wait', 'file': '../../../../../../../Test/Music/Morcheeba/1996 - Who Can You Trust_/Enjoy The Wait.mp3'},
  {'icon': iconImage, 'title': 'Fragments Of Freedom', 'file': '../../../../../../../Test/Music/Morcheeba/2000 - Fragments of Freedom/Fragments Of Freedom.mp3'},
  {'icon': iconImage, 'title': 'Otherwise', 'file': '../../../../../../../Test/Music/Morcheeba/2002 - Otherwise/Otherwise.mp3'},
]);
})

document.getElementById('musik').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '03 Дорожка 3', 'file': '../../../../../../../Test/Music/MUSIK/Шопен Диск 1/03 Дорожка 3.mp3'},
  {'icon': iconImage, 'title': '07 Дорожка 7', 'file': '../../../../../../../Test/Music/MUSIK/Моцарт/07 Дорожка 7.mp3'},
  {'icon': iconImage, 'title': 'Alexis Sorbas', 'file': '../../../../../../../Test/Music/MUSIK/R.King/Alexis Sorbas.mp3'},
  {'icon': iconImage, 'title': 'Break You In', 'file': '../../../../../../../Test/Music/MUSIK/Break You In.mp4'},
  {'icon': iconImage, 'title': 'Childrens Beach In Menton', 'file': '../../../../../../../Test/Music/MUSIK/Children%27s Beach - In Menton.mp3'},
  {'icon': iconImage, 'title': 'Edge Hill', 'file': '../../../../../../../Test/Music/MUSIK/Edge Hill.mp3'},
  {'icon': iconImage, 'title': 'Fly', 'file': '../../../../../../../Test/Music/MUSIK/fly.mp3'},
  {'icon': iconImage, 'title': 'From The Ocean', 'file': '../../../../../../../Test/Music/MUSIK/From The Ocean.mp3'},
  {'icon': iconImage, 'title': 'Fugue In D Minor', 'file': '../../../../../../../Test/Music/MUSIK/Fugue in D minor.mp3'},
  {'icon': iconImage, 'title': 'Hellgate Bedlam', 'file': '../../../../../../../Test/Music/MUSIK/Hellgate bedlam.mp3'},
  {'icon': iconImage, 'title': 'Kogda Ya Zakrivaiu Glaza', 'file': '../../../../../../../Test/Music/MUSIK/kogda_ya_zakrivaiu_glaza.mp3'},
  {'icon': iconImage, 'title': 'La Petite Fille De La Mer', 'file': '../../../../../../../Test/Music/MUSIK/La Petite Fille De La Mer.mp3'},
  {'icon': iconImage, 'title': 'Le Reve', 'file': '../../../../../../../Test/Music/MUSIK/R.King/Le reve.mp3'},
  {'icon': iconImage, 'title': 'Lilly Was Here', 'file': '../../../../../../../Test/Music/MUSIK/Lilly Was Here.mp3'},
  {'icon': iconImage, 'title': 'Love Theme From Flashdance', 'file': '../../../../../../../Test/Music/MUSIK/Love Theme From Flashdance.mp3'},
  {'icon': iconImage, 'title': 'Lovers In Madrid', 'file': '../../../../../../../Test/Music/MUSIK/Lovers In Madrid.mp3'},
  {'icon': iconImage, 'title': 'Morgenstimmung', 'file': '../../../../../../../Test/Music/MUSIK/Morgenstimmung.mp3'},
  {'icon': iconImage, 'title': 'Nani Nani', 'file': '../../../../../../../Test/Music/MUSIK/Nani, Nani.mp3'},
  {'icon': iconImage, 'title': 'Orange Walk', 'file': '../../../../../../../Test/Music/MUSIK/Orange Walk.mp3'},
  {'icon': iconImage, 'title': 'Overdoze', 'file': '../../../../../../../Test/Music/MUSIK/OverDoze.mp3'},
  {'icon': iconImage, 'title': 'Pop Corn', 'file': '../../../../../../../Test/Music/MUSIK/Pop Corn.mp3'},
  {'icon': iconImage, 'title': 'Preview', 'file': '../../../../../../../Test/Music/MUSIK/preview.mp3'},
  {'icon': iconImage, 'title': 'Romance De Amour', 'file': '../../../../../../../Test/Music/MUSIK/Romance de Amour.mp3'},
  {'icon': iconImage, 'title': 'Sabres Of Paradise', 'file': '../../../../../../../Test/Music/MUSIK/Sabres of Paradise.mp3'},
  {'icon': iconImage, 'title': 'Song Of Ocarina', 'file': '../../../../../../../Test/Music/MUSIK/Song Of Ocarina.mp3'},
  {'icon': iconImage, 'title': 'Strangers', 'file': '../../../../../../../Test/Music/MUSIK/Strangers.mp3'},
  {'icon': iconImage, 'title': 'Tarantul', 'file': '../../../../../../../Test/Music/MUSIK/Tarantul.mp3'},
  {'icon': iconImage, 'title': 'Tears Of The Ocean', 'file': '../../../../../../../Test/Music/MUSIK/Tears of the ocean.mp3'},
  {'icon': iconImage, 'title': 'The End Is Near', 'file': '../../../../../../../Test/Music/MUSIK/The End is Near.mp4'},
  {'icon': iconImage, 'title': 'The Pink Panter', 'file': '../../../../../../../Test/Music/MUSIK/The Pink Panter.mp3'},
  {'icon': iconImage, 'title': 'Three Dreams', 'file': '../../../../../../../Test/Music/MUSIK/Three Dreams.mp3'},
  {'icon': iconImage, 'title': 'Tico Tico', 'file': '../../../../../../../Test/Music/MUSIK/Tico-Tico.mp3'},
  {'icon': iconImage, 'title': 'Tiлsto Euphoria', 'file': '../../../../../../../Test/Music/MUSIK/Tiлsto - Euphoria.mp3'},
  {'icon': iconImage, 'title': 'Unchained Melody', 'file': '../../../../../../../Test/Music/MUSIK/Unchained Melody.mp3'},
  {'icon': iconImage, 'title': 'Uvertura', 'file': '../../../../../../../Test/Music/MUSIK/uvertura.mp3'},
  {'icon': iconImage, 'title': 'Valzer', 'file': '../../../../../../../Test/Music/MUSIK/Valzer.mp3'},
  {'icon': iconImage, 'title': 'Voices In Jupiter', 'file': '../../../../../../../Test/Music/MUSIK/Voices In Jupiter.mp3'},
  {'icon': iconImage, 'title': 'Waltz (from Sleeping Beauty)', 'file': '../../../../../../../Test/Music/MUSIK/Waltz (From Sleeping Beauty).mp3'},
  {'icon': iconImage, 'title': 'Братан', 'file': '../../../../../../../Test/Music/MUSIK/Братан.mp3'},
  {'icon': iconImage, 'title': 'Когда Я Закрываю Глаза', 'file': '../../../../../../../Test/Music/MUSIK/И.Крутой/Когда Я Закрываю Глаза.mp3'},
  {'icon': iconImage, 'title': 'Песнь О Друге', 'file': '../../../../../../../Test/Music/MUSIK/И.Крутой/Песнь о Друге.mp3'},
  {'icon': iconImage, 'title': 'Страна Где Ночует Солнце', 'file': '../../../../../../../Test/Music/MUSIK/Страна где ночует солнце.mp3'},
  {'icon': iconImage, 'title': 'Трек 3', 'file': '../../../../../../../Test/Music/MUSIK/Трек  3.mp3'},
]);
})

document.getElementById('nautiluspompilius').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Гибралтар Лабрадор', 'file': '../../../../../../../Test/Music/Nautilus Pompilius/2000 - Лабрадор-Гибралтар/Гибралтар-Лабрадор.mp3'},
  {'icon': iconImage, 'title': 'Дыхание', 'file': '../../../../../../../Test/Music/Nautilus Pompilius/1995 - Крылья/Дыхание.mp3'},
  {'icon': iconImage, 'title': 'Зверь', 'file': '../../../../../../../Test/Music/Nautilus Pompilius/1991 - Титаник на Фонтанке/Зверь.mp3'},
  {'icon': iconImage, 'title': 'Князь Тишины', 'file': '../../../../../../../Test/Music/Nautilus Pompilius/1989 - Князь Тишины/Князь Тишины.mp3'},
  {'icon': iconImage, 'title': 'Крылья', 'file': '../../../../../../../Test/Music/Nautilus Pompilius/1995 - Крылья/Крылья.mp3'},
  {'icon': iconImage, 'title': 'Кто Еще ', 'file': '../../../../../../../Test/Music/Nautilus Pompilius/1995 - Крылья/Кто Еще....mp3'},
  {'icon': iconImage, 'title': 'Люди На Холме', 'file': '../../../../../../../Test/Music/Nautilus Pompilius/1997 - Яблокитай/Люди на Холме.mp3'},
  {'icon': iconImage, 'title': 'Матерь Богов', 'file': '../../../../../../../Test/Music/Nautilus Pompilius/1997 - Атлантида/Матерь Богов.mp3'},
  {'icon': iconImage, 'title': 'Моя Звезда', 'file': '../../../../../../../Test/Music/Nautilus Pompilius/Моя звезда.mp3'},
  {'icon': iconImage, 'title': 'Моя Звезда', 'file': '../../../../../../../Test/Music/Nautilus Pompilius/Моя звезда.mp4'},
  {'icon': iconImage, 'title': 'На Берегу Безымянной Реки', 'file': '../../../../../../../Test/Music/Nautilus Pompilius/1987 - Чужая Земля/На Берегу Безымянной Реки.mp3'},
  {'icon': iconImage, 'title': 'Оркестровая Увертюра', 'file': '../../../../../../../Test/Music/Nautilus Pompilius/1997 - Атлантида/Оркестровая увертюра.mp3'},
  {'icon': iconImage, 'title': 'Песня Идущего Домой', 'file': '../../../../../../../Test/Music/Nautilus Pompilius/Песня идущего домой.MP3'},
  {'icon': iconImage, 'title': 'Последнее Письмо', 'file': '../../../../../../../Test/Music/Nautilus Pompilius/1989 - Князь Тишины/Последнее Письмо.mp3'},
  {'icon': iconImage, 'title': 'Прогулки По Воде', 'file': '../../../../../../../Test/Music/Nautilus Pompilius/1987 - Чужая Земля/Прогулки По Воде.mp3'},
  {'icon': iconImage, 'title': 'Сестры Печали', 'file': '../../../../../../../Test/Music/Nautilus Pompilius/1997 - Яблокитай/Сестры Печали.mp3'},
  {'icon': iconImage, 'title': 'Таинственный Гость', 'file': '../../../../../../../Test/Music/Nautilus Pompilius/1997 - Яблокитай/Таинственный гость.mp3'},
  {'icon': iconImage, 'title': 'Тутанхамон', 'file': '../../../../../../../Test/Music/Nautilus Pompilius/1991 - Титаник на Фонтанке/Тутанхамон.mp3'},
  {'icon': iconImage, 'title': 'Хлоп Хлоп', 'file': '../../../../../../../Test/Music/Nautilus Pompilius/1996 - Акустика (Лучшие Песни)/Хлоп-Хлоп.mp3'},
  {'icon': iconImage, 'title': 'Человек На Луне', 'file': '../../../../../../../Test/Music/Nautilus Pompilius/1995 - Крылья/Человек на Луне.mp3'},
  {'icon': iconImage, 'title': 'Я Хочу Быть С Тобой', 'file': '../../../../../../../Test/Music/Nautilus Pompilius/1989 - Князь Тишины/Я Хочу Быть С Тобой.mp3'},
]);
})

document.getElementById('new').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '001 Julio Iglesias Nostalgie', 'file': '../../../../../../../Test/Music/New/Copy/001_Julio Iglesias - Nostalgie.mp3'},
  {'icon': iconImage, 'title': '003 Lauren Christie Colour Of The Night', 'file': '../../../../../../../Test/Music/New/Copy/003_Lauren Christie - Colour Of The Night.mp3'},
  {'icon': iconImage, 'title': '004 Elton John Believe', 'file': '../../../../../../../Test/Music/New/Copy/004_Elton John - Believe.mp3'},
  {'icon': iconImage, 'title': '005 Riccardo Fogli Storie Di Tutti I Giomi', 'file': '../../../../../../../Test/Music/New/Copy/005_Riccardo Fogli - Storie Di Tutti I Giomi.mp3'},
  {'icon': iconImage, 'title': '006 Elvis Presley Its Now Or Newer', 'file': '../../../../../../../Test/Music/New/Copy/006_Elvis Presley - It%27s Now Or Newer.mp3'},
  {'icon': iconImage, 'title': '007 Queen The Show Must Go On', 'file': '../../../../../../../Test/Music/New/Copy/007_Queen - The Show Must Go On.mp3'},
  {'icon': iconImage, 'title': '008 Scorpions Wind Of Change', 'file': '../../../../../../../Test/Music/New/Copy/008_Scorpions - Wind Of Change.mp3'},
  {'icon': iconImage, 'title': '01 Георгий Свиридов – Тройка', 'file': '../../../../../../../Test/Music/New/Copy/Г. Свиридов/01 Георгий Свиридов – Тройка.mp3'},
  {'icon': iconImage, 'title': '011 Abba The Winner Takes It All', 'file': '../../../../../../../Test/Music/New/Copy/011_ABBA - The Winner Takes It All.mp3'},
  {'icon': iconImage, 'title': '012 Barbara Streisand Woman In Love', 'file': '../../../../../../../Test/Music/New/Copy/012_Barbara Streisand - Woman In Love.mp3'},
  {'icon': iconImage, 'title': '015 Vanessa Paradise Joe Le Taxi', 'file': '../../../../../../../Test/Music/New/Copy/015_Vanessa Paradise - Joe Le Taxi.mp3'},
  {'icon': iconImage, 'title': '016 Chris Norman Midnight Lady', 'file': '../../../../../../../Test/Music/New/Copy/016_Chris Norman - Midnight Lady.mp3'},
  {'icon': iconImage, 'title': '02 Георгий Свиридов – Вальс', 'file': '../../../../../../../Test/Music/New/Copy/Г. Свиридов/02 Георгий Свиридов – Вальс.mp3'},
  {'icon': iconImage, 'title': '023 Paul Mauriat Parapluies De Cherbury', 'file': '../../../../../../../Test/Music/New/Copy/023_Paul Mauriat - Parapluies De Cherbury.mp3'},
  {'icon': iconImage, 'title': '039 Madonna Youll See', 'file': '../../../../../../../Test/Music/New/Copy/039_Madonna - You%27ll See.mp3'},
  {'icon': iconImage, 'title': '04 Георгий Свиридов – Романс', 'file': '../../../../../../../Test/Music/New/Copy/Г. Свиридов/04 Георгий Свиридов – Романс.mp3'},
  {'icon': iconImage, 'title': '042 Patricia Kaas Mon Mec A Moi', 'file': '../../../../../../../Test/Music/New/Copy/042_Patricia Kaas - Mon Mec A Moi.mp3'},
  {'icon': iconImage, 'title': '06 J Donovan Sealed With A Kiss', 'file': '../../../../../../../Test/Music/New/Copy/Romantic/Vellume2/06-J.Donovan-Sealed_With_A_Kiss.mp3'},
  {'icon': iconImage, 'title': '07 Jonny', 'file': '../../../../../../../Test/Music/New/Copy/Romantic/Vellume2/07_Jonny.mp3'},
  {'icon': iconImage, 'title': '08 Георгий Свиридов – Отзвуки Вальса', 'file': '../../../../../../../Test/Music/New/Copy/Г. Свиридов/08 Георгий Свиридов – Отзвуки вальса.mp3'},
  {'icon': iconImage, 'title': '09 Love In December', 'file': '../../../../../../../Test/Music/New/Copy/Romantic/Disco/09_Love In December.mp3'},
  {'icon': iconImage, 'title': '09 Георгий Свиридов – Зимняя Дорога', 'file': '../../../../../../../Test/Music/New/Copy/Г. Свиридов/09 Георгий Свиридов – Зимняя дорога.mp3'},
  {'icon': iconImage, 'title': '10 I Will Survive', 'file': '../../../../../../../Test/Music/New/Copy/Romantic/Golden/10_I Will Survive.mp3'},
  {'icon': iconImage, 'title': '10 Георгий Свиридов – Уральский Напев', 'file': '../../../../../../../Test/Music/New/Copy/Г. Свиридов/10 Георгий Свиридов – Уральский напев.mp3'},
  {'icon': iconImage, 'title': '11 Get Another Boyfriend', 'file': '../../../../../../../Test/Music/New/Copy/Romantic/Disco/11_Get Another Boyfriend.mp3'},
  {'icon': iconImage, 'title': '11 Oh Pretty Woman', 'file': '../../../../../../../Test/Music/New/Copy/Romantic/Golden/11_Oh, Pretty Woman.mp3'},
  {'icon': iconImage, 'title': '110 Kiss I Was Made For Lovin You', 'file': '../../../../../../../Test/Music/New/Copy/110_Kiss - I Was Made For Lovin You.mp3'},
  {'icon': iconImage, 'title': '113 Ricchi E Poveri Voulez Vous Danser', 'file': '../../../../../../../Test/Music/New/Copy/113_Ricchi E Poveri - Voulez Vous Danser.mp3'},
  {'icon': iconImage, 'title': '127 Tanita Tikaram Twist In My Sobriety', 'file': '../../../../../../../Test/Music/New/Copy/127_Tanita Tikaram - Twist In My Sobriety.mp3'},
  {'icon': iconImage, 'title': '128 Patricia Kaas Venus De Abribus', 'file': '../../../../../../../Test/Music/New/Copy/128_Patricia Kaas - Venus De Abribus.mp3'},
  {'icon': iconImage, 'title': '130 Joe Dassin Et Si Tu Nexistais', 'file': '../../../../../../../Test/Music/New/Copy/130_Joe Dassin - Et Si Tu N%27existais.mp3'},
  {'icon': iconImage, 'title': '136 Animals House Of He Rising Sun', 'file': '../../../../../../../Test/Music/New/Copy/136_Animals - House Of He Rising Sun.mp3'},
  {'icon': iconImage, 'title': '142 Chris Norman Some Hearts Are Diamonds', 'file': '../../../../../../../Test/Music/New/Copy/142_Chris Norman - Some Hearts Are Diamonds.mp3'},
  {'icon': iconImage, 'title': '143 Louis Armstrong Go Down Moses', 'file': '../../../../../../../Test/Music/New/Copy/143_Louis Armstrong - Go Down Moses.mp3'},
  {'icon': iconImage, 'title': '15 Георгий Свиридов – Время Вперед', 'file': '../../../../../../../Test/Music/New/Copy/Г. Свиридов/15 Георгий Свиридов – Время, вперед.mp3'},
  {'icon': iconImage, 'title': '16 House Of The Rising Sun', 'file': '../../../../../../../Test/Music/New/Copy/16_House Of The Rising Sun.mp3'},
  {'icon': iconImage, 'title': '162 Frank Sinatra Strangers In The Night', 'file': '../../../../../../../Test/Music/New/Copy/162_Frank Sinatra - Strangers In The Night.mp3'},
  {'icon': iconImage, 'title': '167 Abba Gimme! Gimme! Gimme!', 'file': '../../../../../../../Test/Music/New/Copy/167_ABBA - Gimme! Gimme! Gimme!.mp3'},
  {'icon': iconImage, 'title': '18 Girl Youll Be A Woman Soon Overkill', 'file': '../../../../../../../Test/Music/New/Copy/Romantic/Vellume3/18-Girl_You%27ll_Be_A_Woman_Soon...-Overkill.mp3'},
  {'icon': iconImage, 'title': '184 Chris Rea Road To Hell', 'file': '../../../../../../../Test/Music/New/Copy/184_Chris Rea - Road To Hell.mp3'},
  {'icon': iconImage, 'title': '188 Ennio Morricone Once Upon A Time In America', 'file': '../../../../../../../Test/Music/New/Copy/188_Ennio Morricone - Once Upon A Time In America.mp3'},
  {'icon': iconImage, 'title': '194 Alphaville Forever Young', 'file': '../../../../../../../Test/Music/New/Copy/194_Alphaville - Forever Young.mp3'},
  {'icon': iconImage, 'title': '195 Chris Norman & Suzie Quatro Stambling Inn', 'file': '../../../../../../../Test/Music/New/Copy/195_Chris Norman & Suzie Quatro - Stambling Inn.mp3'},
  {'icon': iconImage, 'title': '196 Julio Iglesias Mammy Blue', 'file': '../../../../../../../Test/Music/New/Copy/196_Julio Iglesias - Mammy Blue.mp3'},
  {'icon': iconImage, 'title': '30 Seconds To Mars', 'file': '../../../../../../../Test/Music/New/2/30_seconds_to_mars.mp3'},
  {'icon': iconImage, 'title': 'A New Day Has Come', 'file': '../../../../../../../Test/Music/New/2/A new day has come.mp3'},
  {'icon': iconImage, 'title': 'Abba Happy New Year', 'file': '../../../../../../../Test/Music/New/Copy/abba_-_happy_new_year.mp3'},
  {'icon': iconImage, 'title': 'Adiemus', 'file': '../../../../../../../Test/Music/New/2/Adiemus.mp3'},
  {'icon': iconImage, 'title': 'Adios', 'file': '../../../../../../../Test/Music/New/2/Adios.mp3'},
  {'icon': iconImage, 'title': 'Adriano Celentano Il Tomposc Ne Va', 'file': '../../../../../../../Test/Music/New/Copy/Adriano Celentano - Il Tomposc Ne Va.mp3'},
  {'icon': iconImage, 'title': 'Aerials', 'file': '../../../../../../../Test/Music/New/2/Aerials.mp3'},
  {'icon': iconImage, 'title': 'Aerosmith I Dont Want To Miss A Thing', 'file': '../../../../../../../Test/Music/New/Copy/Aerosmith - I dont want to miss a thing.mp3'},
  {'icon': iconImage, 'title': 'Afrojack Shone', 'file': '../../../../../../../Test/Music/New/2/Afrojack-Shone.mp3'},
  {'icon': iconImage, 'title': 'Alex Theme', 'file': '../../../../../../../Test/Music/New/G/Alex Theme.mp3'},
  {'icon': iconImage, 'title': 'All For Nothing', 'file': '../../../../../../../Test/Music/New/2/All for nothing.mp3'},
  {'icon': iconImage, 'title': 'Alphaville Forever Young', 'file': '../../../../../../../Test/Music/New/Copy/Alphaville - Forever Young.mp3'},
  {'icon': iconImage, 'title': 'Amerika', 'file': '../../../../../../../Test/Music/New/2/Amerika.mp3'},
  {'icon': iconImage, 'title': 'Amish Life', 'file': '../../../../../../../Test/Music/New/2/Amish Life.mp3'},
  {'icon': iconImage, 'title': 'Apologize', 'file': '../../../../../../../Test/Music/New/~sort/Dreaming Out Loud/Apologize.mp3'},
  {'icon': iconImage, 'title': 'Baba Oriley', 'file': '../../../../../../../Test/Music/New/2/Baba O%27Riley.mp3'},
  {'icon': iconImage, 'title': 'Back In Black', 'file': '../../../../../../../Test/Music/New/2/Back in black.mp3'},
  {'icon': iconImage, 'title': 'Bad Romance', 'file': '../../../../../../../Test/Music/New/bad_romance.mp3'},
  {'icon': iconImage, 'title': 'Bamboleo', 'file': '../../../../../../../Test/Music/New/2/Bamboleo.mp3'},
  {'icon': iconImage, 'title': 'Behind Blue Eyes', 'file': '../../../../../../../Test/Music/New/2/Behind Blue Eyes.mp3'},
  {'icon': iconImage, 'title': 'Believe', 'file': '../../../../../../../Test/Music/New/2/Believe.mp3'},
  {'icon': iconImage, 'title': 'Bemidji Mn', 'file': '../../../../../../../Test/Music/New/2/Bemidji, MN .mp3'},
  {'icon': iconImage, 'title': 'Bemidji Mn', 'file': '../../../../../../../Test/Music/New/2/Bemidji, MN.mp3'},
  {'icon': iconImage, 'title': 'Berlin Take My Breath Away', 'file': '../../../../../../../Test/Music/New/Copy/Berlin - Take My Breath Away.mp3'},
  {'icon': iconImage, 'title': 'Besame Mucho', 'file': '../../../../../../../Test/Music/New/Copy/Romantic/Tet - A - Tet/Besame Mucho.mp3'},
  {'icon': iconImage, 'title': 'Between Angels And Insects', 'file': '../../../../../../../Test/Music/New/2/Between Angels And Insects.mp3'},
  {'icon': iconImage, 'title': 'Bfg Division', 'file': '../../../../../../../Test/Music/New/G/BFG Division.mp3'},
  {'icon': iconImage, 'title': 'Big In Japan', 'file': '../../../../../../../Test/Music/New/2/guano apes/Big In Japan.mp3'},
  {'icon': iconImage, 'title': 'Black Or White', 'file': '../../../../../../../Test/Music/New/2/Black or White.mp3'},
  {'icon': iconImage, 'title': 'Blame Feat', 'file': '../../../../../../../Test/Music/New/2/Blame feat.mp3'},
  {'icon': iconImage, 'title': 'Bleed It Out', 'file': '../../../../../../../Test/Music/New/2/Bleed It Out.mp3'},
  {'icon': iconImage, 'title': 'Boro Boro', 'file': '../../../../../../../Test/Music/New/2/Boro Boro.mp3'},
  {'icon': iconImage, 'title': 'Breathe', 'file': '../../../../../../../Test/Music/New/2/Breathe.mp3'},
  {'icon': iconImage, 'title': 'Breathe The Glitch', 'file': '../../../../../../../Test/Music/New/2/Breathe the glitch.mp3'},
  {'icon': iconImage, 'title': 'California Dreamin Subtitulado Español Inglés', 'file': '../../../../../../../Test/Music/New/2/California Dreamin%27 - Subtitulado Español   Inglés.mp4'},
  {'icon': iconImage, 'title': 'California Dreamingthe Mamas & Papas California Dreaming Stereo Edit', 'file': '../../../../../../../Test/Music/New/2/California Dreamingthe mamas & papas - california dreaming - stereo edit.mp4'},
  {'icon': iconImage, 'title': 'Call Of Pripyat Ost Combat Theme 1', 'file': '../../../../../../../Test/Music/New/G/Call of Pripyat OST - Combat Theme 1.mp3'},
  {'icon': iconImage, 'title': 'Careless Whispe', 'file': '../../../../../../../Test/Music/New/2/Careless Whispe.mp3'},
  {'icon': iconImage, 'title': 'Cd1 05 Modern Talking Chery Chery Lady', 'file': '../../../../../../../Test/Music/New/Copy/Romantic/Disco/CD1-05-Modern_Talking-Chery_Chery_Lady.mp3'},
  {'icon': iconImage, 'title': 'Cd1 06 Scorpions Stll Loving You', 'file': '../../../../../../../Test/Music/New/Copy/Romantic/Golden/CD1-06-Scorpions-Stll_Loving_You.mp3'},
  {'icon': iconImage, 'title': 'Cd1 07 Joy Touch By Touch', 'file': '../../../../../../../Test/Music/New/Copy/Romantic/Disco/CD1-07-Joy-Touch_By_Touch.mp3'},
  {'icon': iconImage, 'title': 'Cd1 10 Nick Cave And The Bad Sees Where The Wild Roses Grow', 'file': '../../../../../../../Test/Music/New/Copy/Romantic/Golden/CD1-10-Nick_Cave_And_The_Bad_Sees-Where_The_Wild_Roses_Grow.mp3'},
  {'icon': iconImage, 'title': 'Cd2 01 Space Just Blue', 'file': '../../../../../../../Test/Music/New/Copy/Romantic/Disco/CD2-01-Space-Just_Blue.mp3'},
  {'icon': iconImage, 'title': 'Cd2 05 James Last Lonesome Shepherd', 'file': '../../../../../../../Test/Music/New/Copy/Romantic/Golden/CD2-05-James_Last-Lonesome_Shepherd.mp3'},
  {'icon': iconImage, 'title': 'Cd2 07 In The Army Now Status Quo', 'file': '../../../../../../../Test/Music/New/Copy/Romantic/Golden/CD2-07-In_The_Army_Now-Status_QUO.mp3'},
  {'icon': iconImage, 'title': 'Cd2 10 Gloria Gaynor I Will Survive', 'file': '../../../../../../../Test/Music/New/Copy/Romantic/Golden/CD2-10-Gloria_Gaynor-I_Will_Survive.mp3'},
  {'icon': iconImage, 'title': 'Cd2 11 Oh Pretty Woman Roy Orbison', 'file': '../../../../../../../Test/Music/New/Copy/Romantic/Golden/CD2-11-Oh,_Pretty_Woman-Roy_Orbison.mp3'},
  {'icon': iconImage, 'title': 'Cd2 16 Nostalgie Julio Iglesias', 'file': '../../../../../../../Test/Music/New/Copy/Romantic/Golden/CD2-16-Nostalgie-Julio_Iglesias.mp3'},
  {'icon': iconImage, 'title': 'Cd2 17 Lily Was Here Candy Dulfer', 'file': '../../../../../../../Test/Music/New/Copy/Romantic/Golden/CD2-17-Lily_Was_Here-Candy_Dulfer.mp3'},
  {'icon': iconImage, 'title': 'Cd2 19 Mary Hopkins Those Were The Days', 'file': '../../../../../../../Test/Music/New/Copy/Romantic/Disco/CD2-19-Mary_Hopkins-Those_Were_The_Days.mp3'},
  {'icon': iconImage, 'title': 'Celebrate', 'file': '../../../../../../../Test/Music/New/Copy/CELEBRATE.mp3'},
  {'icon': iconImage, 'title': 'Celebrate The Love', 'file': '../../../../../../../Test/Music/New/2/Celebrate the Love.mp3'},
  {'icon': iconImage, 'title': 'Chandelier', 'file': '../../../../../../../Test/Music/New/2/Chandelier.mp3'},
  {'icon': iconImage, 'title': 'Changed The Way You Kiss Me', 'file': '../../../../../../../Test/Music/New/2/Changed the way you kiss me.mp3'},
  {'icon': iconImage, 'title': 'Chihuahua', 'file': '../../../../../../../Test/Music/New/2/Chihuahua.mp3'},
  {'icon': iconImage, 'title': 'Chop Suey', 'file': '../../../../../../../Test/Music/New/2/Chop Suey.mp3'},
  {'icon': iconImage, 'title': 'Chris De Burgh Lady In Red', 'file': '../../../../../../../Test/Music/New/Copy/Chris De Burgh - Lady In Red.mp3'},
  {'icon': iconImage, 'title': 'Chris De Burgh The Lady In Red M', 'file': '../../../../../../../Test/Music/New/Copy/Chris De Burgh - The Lady In Red+M.MP3'},
  {'icon': iconImage, 'title': 'Chris Jennings Nothing But You', 'file': '../../../../../../../Test/Music/New/2/Chris Jennings - Nothing But You.mp3'},
  {'icon': iconImage, 'title': 'Clint Eastwood', 'file': '../../../../../../../Test/Music/New/2/Clint Eastwood.MP3'},
  {'icon': iconImage, 'title': 'Coco Jambo', 'file': '../../../../../../../Test/Music/New/2/Coco Jambo.mp3'},
  {'icon': iconImage, 'title': 'Confide In Me', 'file': '../../../../../../../Test/Music/New/2/Confide in Me.mp3'},
  {'icon': iconImage, 'title': 'Conquest Of Paradise', 'file': '../../../../../../../Test/Music/New/2/Conquest of paradise.mp3'},
  {'icon': iconImage, 'title': 'Corleone Speaking', 'file': '../../../../../../../Test/Music/New/2/Corleone_Speaking.mp3'},
  {'icon': iconImage, 'title': 'Cotton Eye Joe', 'file': '../../../../../../../Test/Music/New/2/Cotton eye joe.mp3'},
  {'icon': iconImage, 'title': 'Crash Boom Bang', 'file': '../../../../../../../Test/Music/New/2/Crash Boom Bang.mp3'},
  {'icon': iconImage, 'title': 'Creep', 'file': '../../../../../../../Test/Music/New/2/Creep.mp3'},
  {'icon': iconImage, 'title': 'Dalida Voyage', 'file': '../../../../../../../Test/Music/New/Copy/Dalida - Voyage.mp3'},
  {'icon': iconImage, 'title': 'Dead!', 'file': '../../../../../../../Test/Music/New/~sort/MY CHEMICAL ROMANCE/Dead!.mp3'},
  {'icon': iconImage, 'title': 'Deep Six', 'file': '../../../../../../../Test/Music/New/2/Deep six.mp3'},
  {'icon': iconImage, 'title': 'Desert Rose', 'file': '../../../../../../../Test/Music/New/2/Desert Rose.mp3'},
  {'icon': iconImage, 'title': 'Deserts Of Mars', 'file': '../../../../../../../Test/Music/New/2/Deserts Of Mars.MP3'},
  {'icon': iconImage, 'title': 'Desperate Religion', 'file': '../../../../../../../Test/Music/New/2/Desperate religion.mp3'},
  {'icon': iconImage, 'title': 'Diamonds Myzuka', 'file': '../../../../../../../Test/Music/New/2/Diamonds myzuka.mp3'},
  {'icon': iconImage, 'title': 'Did My Time', 'file': '../../../../../../../Test/Music/New/2/Did My Time.mp3'},
  {'icon': iconImage, 'title': 'Dont Dream Its Over', 'file': '../../../../../../../Test/Music/New/2/Don%27t dream it%27s over.mp3'},
  {'icon': iconImage, 'title': 'Dont Speak', 'file': '../../../../../../../Test/Music/New/2/Don%27t speak.mp3'},
  {'icon': iconImage, 'title': 'Dont Stop The Music', 'file': '../../../../../../../Test/Music/New/2/Don%27t Stop The Music.mp3'},
  {'icon': iconImage, 'title': 'Drinking From The Bottle', 'file': '../../../../../../../Test/Music/New/2/Drinking from the bottle.mp3'},
  {'icon': iconImage, 'title': 'Dup Step', 'file': '../../../../../../../Test/Music/New/2/Dup Step.mp3'},
  {'icon': iconImage, 'title': 'Elton John Blessed', 'file': '../../../../../../../Test/Music/New/Copy/Elton John - Blessed.mp3'},
  {'icon': iconImage, 'title': 'Empire', 'file': '../../../../../../../Test/Music/New/2/Empire.mp3'},
  {'icon': iconImage, 'title': 'Eric Serra The Diva Dance', 'file': '../../../../../../../Test/Music/New/Copy/Eric Serra-The Diva Dance.MP3'},
  {'icon': iconImage, 'title': 'Eros Ramazotti & Tina Turner Cosse Della Vita', 'file': '../../../../../../../Test/Music/New/Copy/Eros Ramazotti & Tina Turner - Cosse Della Vita.mp3'},
  {'icon': iconImage, 'title': 'Es Ist Nie Vorbie', 'file': '../../../../../../../Test/Music/New/2/Es Ist Nie Vorbie.mp3'},
  {'icon': iconImage, 'title': 'Eternal Flame', 'file': '../../../../../../../Test/Music/New/2/Eternal Flame.mp4'},
  {'icon': iconImage, 'title': 'Evanescence Bring Me To Life', 'file': '../../../../../../../Test/Music/New/Copy/evanescence_-_bring_me_to_life.mp3'},
  {'icon': iconImage, 'title': 'Every Breath You Take', 'file': '../../../../../../../Test/Music/New/2/Every breath you take.mp3'},
  {'icon': iconImage, 'title': 'Everybody Wants To Rule The World', 'file': '../../../../../../../Test/Music/New/2/Everybody wants to rule the world.mp3'},
  {'icon': iconImage, 'title': 'Everything Is Going To Be Okay', 'file': '../../../../../../../Test/Music/New/G/Everything Is Going to Be Okay.mp3'},
  {'icon': iconImage, 'title': 'Famous Last Words', 'file': '../../../../../../../Test/Music/New/~sort/MY CHEMICAL ROMANCE/Famous Last Words.mp3'},
  {'icon': iconImage, 'title': 'Feel The Light', 'file': '../../../../../../../Test/Music/New/2/Feel the light.mp3'},
  {'icon': iconImage, 'title': 'Fighte', 'file': '../../../../../../../Test/Music/New/2/Fighte.mp3'},
  {'icon': iconImage, 'title': 'Fire Water Burn', 'file': '../../../../../../../Test/Music/New/2/Fire water burn.mp3'},
  {'icon': iconImage, 'title': 'Fly On The Wings Of Love', 'file': '../../../../../../../Test/Music/New/2/Fly On The Wings Of Love.mp3'},
  {'icon': iconImage, 'title': 'Fragments Of Freedom', 'file': '../../../../../../../Test/Music/New/2/Fragments Of Freedom.mp3'},
  {'icon': iconImage, 'title': 'Freestyler', 'file': '../../../../../../../Test/Music/New/2/Freestyler.mp3'},
  {'icon': iconImage, 'title': 'Friends Will Be Friends', 'file': '../../../../../../../Test/Music/New/2/Friends Will Be Friends.mp3'},
  {'icon': iconImage, 'title': 'Frozen', 'file': '../../../../../../../Test/Music/New/2/Frozen.mp3'},
  {'icon': iconImage, 'title': 'George Michael Jesus To A Child', 'file': '../../../../../../../Test/Music/New/Copy/George Michael - Jesus to a child.mp3'},
  {'icon': iconImage, 'title': 'Georgio Moroder Love Theme From Flash Dance', 'file': '../../../../../../../Test/Music/New/Copy/Georgio Moroder - Love Theme From Flash Dance.mp3'},
  {'icon': iconImage, 'title': 'Get A Haircut', 'file': '../../../../../../../Test/Music/New/2/Get a Haircut.mp3'},
  {'icon': iconImage, 'title': 'Get A Job', 'file': '../../../../../../../Test/Music/New/2/Get a Job.mp3'},
  {'icon': iconImage, 'title': 'Gilla Johnny', 'file': '../../../../../../../Test/Music/New/Copy/Gilla - Johnny.mp3'},
  {'icon': iconImage, 'title': 'Giving In', 'file': '../../../../../../../Test/Music/New/2/Giving In.mp3'},
  {'icon': iconImage, 'title': 'Godfather', 'file': '../../../../../../../Test/Music/New/F/Godfather.mp3'},
  {'icon': iconImage, 'title': 'Gorky Park Bang', 'file': '../../../../../../../Test/Music/New/2/gorky_park_bang.mp3'},
  {'icon': iconImage, 'title': 'Gorky Park Moscow Calling', 'file': '../../../../../../../Test/Music/New/2/gorky_park_moscow_calling.mp3'},
  {'icon': iconImage, 'title': 'Goulding Burn', 'file': '../../../../../../../Test/Music/New/2/Goulding Burn.mp3'},
  {'icon': iconImage, 'title': 'Graig David & Sting Rise And Fall', 'file': '../../../../../../../Test/Music/New/Copy/Graig David & Sting - Rise And Fall.mp3'},
  {'icon': iconImage, 'title': 'Gridlock', 'file': '../../../../../../../Test/Music/New/2/Gridlock.mp3'},
  {'icon': iconImage, 'title': 'Gunsn Roses Knocking On Heavens Door M', 'file': '../../../../../../../Test/Music/New/Copy/Guns%27n Roses - Knocking On Heavens Door+M.mp3'},
  {'icon': iconImage, 'title': 'Gunsnroses Dont Cry', 'file': '../../../../../../../Test/Music/New/Copy/Guns%27N%27Roses - Don%27t cry.mp3'},
  {'icon': iconImage, 'title': 'Hafanana', 'file': '../../../../../../../Test/Music/New/2/Hafanana.mp4'},
  {'icon': iconImage, 'title': 'Halo', 'file': '../../../../../../../Test/Music/New/2/Halo.mp3'},
  {'icon': iconImage, 'title': 'Happy New Year', 'file': '../../../../../../../Test/Music/New/2/Happy New Year.mp3'},
  {'icon': iconImage, 'title': 'Heaven', 'file': '../../../../../../../Test/Music/New/2/Heaven.mp3'},
  {'icon': iconImage, 'title': 'Heaven Is A Place On Earth', 'file': '../../../../../../../Test/Music/New/Heaven is a place on earth.mp3'},
  {'icon': iconImage, 'title': 'Help!', 'file': '../../../../../../../Test/Music/New/2/Help!.mp3'},
  {'icon': iconImage, 'title': 'Hey Mama', 'file': '../../../../../../../Test/Music/New/2/Hey-Mama.mp3'},
  {'icon': iconImage, 'title': 'Home Again', 'file': '../../../../../../../Test/Music/New/2/Home Again.mp3'},
  {'icon': iconImage, 'title': 'How You Remind Me', 'file': '../../../../../../../Test/Music/New/2/How You Remind Me.mp3'},
  {'icon': iconImage, 'title': 'Hungry Eyes', 'file': '../../../../../../../Test/Music/New/2/Hungry eyes.mp3'},
  {'icon': iconImage, 'title': 'I Disappear', 'file': '../../../../../../../Test/Music/New/2/I Disappear.MP3'},
  {'icon': iconImage, 'title': 'I Dont Want To Miss A Thing', 'file': '../../../../../../../Test/Music/New/2/I Don%27t Want to Miss a Thing.mp4'},
  {'icon': iconImage, 'title': 'I Saw You Dancing', 'file': '../../../../../../../Test/Music/New/2/I Saw You Dancing.mp3'},
  {'icon': iconImage, 'title': 'If You Leave Me Now', 'file': '../../../../../../../Test/Music/New/2/If You Leave Me Now.mp3'},
  {'icon': iconImage, 'title': 'Igels Hotel California (studio)', 'file': '../../../../../../../Test/Music/New/Copy/Igels - Hotel California (studio).mp3'},
  {'icon': iconImage, 'title': 'Iggy Pop In The Death Car', 'file': '../../../../../../../Test/Music/New/Copy/Iggy Pop - In The Death Car.mp3'},
  {'icon': iconImage, 'title': 'Iko Iko', 'file': '../../../../../../../Test/Music/New/2/Iko iko.mp3'},
  {'icon': iconImage, 'title': 'In The End', 'file': '../../../../../../../Test/Music/New/2/In the End.mp3'},
  {'icon': iconImage, 'title': 'In The Shadows', 'file': '../../../../../../../Test/Music/New/2/In The Shadows.mp3'},
  {'icon': iconImage, 'title': 'In The Summertime', 'file': '../../../../../../../Test/Music/New/2/In The Summertime.mp3'},
  {'icon': iconImage, 'title': 'It`s Raining Men', 'file': '../../../../../../../Test/Music/New/2/It`s raining men.mp3'},
  {'icon': iconImage, 'title': 'J Dassiin Et Si Tu Nexistais', 'file': '../../../../../../../Test/Music/New/Copy/J.Dassiin - Et si tu N%27existais.mp3'},
  {'icon': iconImage, 'title': 'Jason Donovan Scaled With A Kiss', 'file': '../../../../../../../Test/Music/New/Copy/Jason Donovan - Scaled With A Kiss.mp3'},
  {'icon': iconImage, 'title': 'Joe Dassin A Toi', 'file': '../../../../../../../Test/Music/New/Copy/Joe Dassin - A Toi.mp3'},
  {'icon': iconImage, 'title': 'Julio Iglesias Caruso', 'file': '../../../../../../../Test/Music/New/Copy/Julio Iglesias - Caruso.MP3'},
  {'icon': iconImage, 'title': 'Ku Ku Djambo', 'file': '../../../../../../../Test/Music/New/2/Ku ku Djambo.mp3'},
  {'icon': iconImage, 'title': 'Kung Fu Fighting', 'file': '../../../../../../../Test/Music/New/2/Kung fu fighting.mp3'},
  {'icon': iconImage, 'title': 'La La La', 'file': '../../../../../../../Test/Music/New/2/La la la.mp3'},
  {'icon': iconImage, 'title': 'Lambada', 'file': '../../../../../../../Test/Music/New/2/Lambada.mp3'},
  {'icon': iconImage, 'title': 'Lauren Christy The Color ', 'file': '../../../../../../../Test/Music/New/Copy/LAUREN_CHRISTY___THE_COLOR_.MP3'},
  {'icon': iconImage, 'title': 'Layla', 'file': '../../../../../../../Test/Music/New/2/Layla.mp3'},
  {'icon': iconImage, 'title': 'Let It Snow!', 'file': '../../../../../../../Test/Music/New/2/Let It Snow!.mp3'},
  {'icon': iconImage, 'title': 'Lisa Miskovsky', 'file': '../../../../../../../Test/Music/New/2/Lisa_Miskovsky.mp3'},
  {'icon': iconImage, 'title': 'Livin La Vida Loca', 'file': '../../../../../../../Test/Music/New/2/Livin%27 La Vida Loca.mp3'},
  {'icon': iconImage, 'title': 'Logo1', 'file': '../../../../../../../Test/Music/New/G/LOGO1.mp3'},
  {'icon': iconImage, 'title': 'Logo2', 'file': '../../../../../../../Test/Music/New/G/LOGO2.mp3'},
  {'icon': iconImage, 'title': 'Lords Of The Boards', 'file': '../../../../../../../Test/Music/New/2/guano apes/Lords Of The Boards.mp3'},
  {'icon': iconImage, 'title': 'Love Me Like You Do', 'file': '../../../../../../../Test/Music/New/2/Love me like you do.mp3'},
  {'icon': iconImage, 'title': 'Macarena 1996', 'file': '../../../../../../../Test/Music/New/2/Macarena 1996.mp4'},
  {'icon': iconImage, 'title': 'Makarena', 'file': '../../../../../../../Test/Music/New/2/Makarena.mp3'},
  {'icon': iconImage, 'title': 'Mambo Italiano', 'file': '../../../../../../../Test/Music/New/Copy/Romantic/Disco/Mambo Italiano.mp3'},
  {'icon': iconImage, 'title': 'Manic Monday', 'file': '../../../../../../../Test/Music/New/~sort/Manic Monday.mp4'},
  {'icon': iconImage, 'title': 'Maria Magdalen(ill Never Be)', 'file': '../../../../../../../Test/Music/New/2/Maria Magdalen(I%27ll Never Be).mp3'},
  {'icon': iconImage, 'title': 'Mariah Carey Without You ', 'file': '../../../../../../../Test/Music/New/Copy/MARIAH CAREY - WITHOUT YOU+.mp3'},
  {'icon': iconImage, 'title': 'Maywood Pasadena', 'file': '../../../../../../../Test/Music/New/Copy/Maywood - Pasadena.mp3'},
  {'icon': iconImage, 'title': 'Metallica Nothing Else Matters', 'file': '../../../../../../../Test/Music/New/Copy/Metallica - Nothing Else Matters.MP3'},
  {'icon': iconImage, 'title': 'Metallica The Unforgiven', 'file': '../../../../../../../Test/Music/New/Copy/Metallica - The Unforgiven.MP3'},
  {'icon': iconImage, 'title': 'Mike Oldfield Moonlight Shadow', 'file': '../../../../../../../Test/Music/New/Copy/Mike Oldfield - Moonlight Shadow.mp3'},
  {'icon': iconImage, 'title': 'Mon Mec A Moi', 'file': '../../../../../../../Test/Music/New/2/Mon Mec A Moi.mp3'},
  {'icon': iconImage, 'title': 'Moscow Never Sleeps', 'file': '../../../../../../../Test/Music/New/2/Moscow never sleeps.mp3'},
  {'icon': iconImage, 'title': 'Mr Big Wind World', 'file': '../../../../../../../Test/Music/New/Copy/Mr.Big - Wind World.mp3'},
  {'icon': iconImage, 'title': 'Mr Black Wonderful Life ', 'file': '../../../../../../../Test/Music/New/Copy/Mr. Black - Wonderful Life+.mp3'},
  {'icon': iconImage, 'title': 'My All', 'file': '../../../../../../../Test/Music/New/~sort/My All.mp4'},
  {'icon': iconImage, 'title': 'My Darkest Days Porn Star Dancing Myzuka Fm', 'file': '../../../../../../../Test/Music/New/2/my_darkest_days_porn_star_dancing_myzuka.fm.mp3'},
  {'icon': iconImage, 'title': 'Nick Cave & Kylie Minogue Where The Wild Roses Grow', 'file': '../../../../../../../Test/Music/New/Copy/Nick Cave & Kylie Minogue - Where The Wild Roses Grow.mp3'},
  {'icon': iconImage, 'title': 'No Doubt Dont Speak', 'file': '../../../../../../../Test/Music/New/Copy/no_doubt_-_dont_speak.mp3'},
  {'icon': iconImage, 'title': 'No Doubt Dont Speak', 'file': '../../../../../../../Test/Music/New/Copy/No Doubt - Don%27t Speak.MP3'},
  {'icon': iconImage, 'title': 'No Doubt Ex Girlfriend', 'file': '../../../../../../../Test/Music/New/Copy/no_doubt_-_ex-girlfriend.mp3'},
  {'icon': iconImage, 'title': 'No Leaf Clover', 'file': '../../../../../../../Test/Music/New/2/No Leaf Clover.mp3'},
  {'icon': iconImage, 'title': 'Objection', 'file': '../../../../../../../Test/Music/New/2/Objection.mp3'},
  {'icon': iconImage, 'title': 'Ode To My Family', 'file': '../../../../../../../Test/Music/New/2/Ode To My Family.mp3'},
  {'icon': iconImage, 'title': 'Old Man', 'file': '../../../../../../../Test/Music/New/2/Old man.mp3'},
  {'icon': iconImage, 'title': 'Omen Mt Eden', 'file': '../../../../../../../Test/Music/New/2/Omen mt eden.mp3'},
  {'icon': iconImage, 'title': 'Once Upon A December', 'file': '../../../../../../../Test/Music/New/~sort/Once Upon a December.mp4'},
  {'icon': iconImage, 'title': 'Only Time', 'file': '../../../../../../../Test/Music/New/2/Only Time.mp3'},
  {'icon': iconImage, 'title': 'Overdrive', 'file': '../../../../../../../Test/Music/New/2/Overdrive.mp3'},
  {'icon': iconImage, 'title': 'Paul Mauriat Love Is Blue', 'file': '../../../../../../../Test/Music/New/Copy/Paul Mauriat -Love Is Blue.mp3'},
  {'icon': iconImage, 'title': 'Paul Mauriat Love Is Blue', 'file': '../../../../../../../Test/Music/New/Copy/Paul Mauriat - Love is Blue.mp3'},
  {'icon': iconImage, 'title': 'Paul Mauriat The Good The Bad The Ugly', 'file': '../../../../../../../Test/Music/New/Copy/Paul Mauriat-The Good ,The  Bad, The Ugly.MP3'},
  {'icon': iconImage, 'title': 'Paul Mauriat Toccata', 'file': '../../../../../../../Test/Music/New/Copy/Paul Mauriat - Toccata.mp3'},
  {'icon': iconImage, 'title': 'Pink Floyd Another Brick In The Wall (2)', 'file': '../../../../../../../Test/Music/New/Copy/Pink Floyd - Another Brick In The Wall (2).mp3'},
  {'icon': iconImage, 'title': 'Put Your Lights On', 'file': '../../../../../../../Test/Music/New/Put Your Lights On.mp3'},
  {'icon': iconImage, 'title': 'Ray Parker Ghostbusters', 'file': '../../../../../../../Test/Music/New/Copy/Ray Parker - Ghostbusters.mp3'},
  {'icon': iconImage, 'title': 'Rednex Wish You Were Here ', 'file': '../../../../../../../Test/Music/New/Copy/Rednex - Wish You Were Here+.mp3'},
  {'icon': iconImage, 'title': 'Ricchi E Poveri Casa Mia', 'file': '../../../../../../../Test/Music/New/Copy/Ricchi E Poveri - Casa Mia.mp3'},
  {'icon': iconImage, 'title': 'Ricchi E Poveri Mamma Mia', 'file': '../../../../../../../Test/Music/New/Copy/Ricchi E Poveri - Mamma Mia.mp3'},
  {'icon': iconImage, 'title': 'Ricchi E Poveri Sara Perche Ti Amo', 'file': '../../../../../../../Test/Music/New/Copy/Ricchi E Poveri - Sara Perche Ti Amo.mp3'},
  {'icon': iconImage, 'title': 'Rob D Clubbed To Death(kurayamino Mix)', 'file': '../../../../../../../Test/Music/New/Copy/Rob D-Clubbed to death(kurayamino mix).MP3'},
  {'icon': iconImage, 'title': 'Robert Miles Children (dream Dance)', 'file': '../../../../../../../Test/Music/New/Copy/Robert Miles - Children (Dream Dance).mp3'},
  {'icon': iconImage, 'title': 'Robert Myles Fable', 'file': '../../../../../../../Test/Music/New/Copy/Robert Myles - Fable.mp3'},
  {'icon': iconImage, 'title': 'Rockstar', 'file': '../../../../../../../Test/Music/New/2/Rockstar.mp3'},
  {'icon': iconImage, 'title': 'Romance', 'file': '../../../../../../../Test/Music/New/~sort/MY CHEMICAL ROMANCE/Romance.mp3'},
  {'icon': iconImage, 'title': 'Sail', 'file': '../../../../../../../Test/Music/New/2/Sail.mp3'},
  {'icon': iconImage, 'title': 'Samba De Janeiro', 'file': '../../../../../../../Test/Music/New/2/Samba De Janeiro.mp4'},
  {'icon': iconImage, 'title': 'Sandra Nasic', 'file': '../../../../../../../Test/Music/New/2/guano apes/Sandra Nasic.mp3'},
  {'icon': iconImage, 'title': 'Scars', 'file': '../../../../../../../Test/Music/New/2/Scars.mp3'},
  {'icon': iconImage, 'title': 'Schwarze Sonne', 'file': '../../../../../../../Test/Music/New/2/Schwarze sonne.mp3'},
  {'icon': iconImage, 'title': 'Scorpions Still Loving You', 'file': '../../../../../../../Test/Music/New/Copy/Scorpions - Still Loving You.mp3'},
  {'icon': iconImage, 'title': 'Self Control', 'file': '../../../../../../../Test/Music/New/2/Self Control.mp3'},
  {'icon': iconImage, 'title': 'Semi Sacred Geometry (female Singer Version)', 'file': '../../../../../../../Test/Music/New/G/Semi Sacred Geometry (Female Singer Version).mp4'},
  {'icon': iconImage, 'title': 'Shape Of My Heart', 'file': '../../../../../../../Test/Music/New/2/Shape of My Heart.mp3'},
  {'icon': iconImage, 'title': 'Show Must Go On', 'file': '../../../../../../../Test/Music/New/2/Show Must Go On.mp3'},
  {'icon': iconImage, 'title': 'Sixteen Tons', 'file': '../../../../../../../Test/Music/New/2/Sixteen Tons.mp3'},
  {'icon': iconImage, 'title': 'Slave To Live', 'file': '../../../../../../../Test/Music/New/2/Slave To Live.mp3'},
  {'icon': iconImage, 'title': 'Smack My Bitch Up', 'file': '../../../../../../../Test/Music/New/2/Smack my bitch up.mp3'},
  {'icon': iconImage, 'title': 'Smooth Criminal', 'file': '../../../../../../../Test/Music/New/2/Smooth Criminal.mp3'},
  {'icon': iconImage, 'title': 'Somebody That I Used To Know', 'file': '../../../../../../../Test/Music/New/2/Somebody that i used to know.mp3'},
  {'icon': iconImage, 'title': 'Someone To Save You', 'file': '../../../../../../../Test/Music/New/~sort/Dreaming Out Loud/Someone To Save You.mp3'},
  {'icon': iconImage, 'title': 'Somewhere I Belong', 'file': '../../../../../../../Test/Music/New/2/Somewhere I Belong.mp3'},
  {'icon': iconImage, 'title': 'Sonne', 'file': '../../../../../../../Test/Music/New/2/Sonne.mp3'},
  {'icon': iconImage, 'title': 'Stars Dance Myzuka', 'file': '../../../../../../../Test/Music/New/2/Stars dance myzuka.mp3'},
  {'icon': iconImage, 'title': 'Sting Fields Of Gold', 'file': '../../../../../../../Test/Music/New/Copy/Sting - Fields Of Gold.mp3'},
  {'icon': iconImage, 'title': 'Storm', 'file': '../../../../../../../Test/Music/New/2/Storm.mp3'},
  {'icon': iconImage, 'title': 'Straight Up', 'file': '../../../../../../../Test/Music/New/2/Straight Up.mp3'},
  {'icon': iconImage, 'title': 'Summer', 'file': '../../../../../../../Test/Music/New/2/Summer.mp3'},
  {'icon': iconImage, 'title': 'Summertime Sadness', 'file': '../../../../../../../Test/Music/New/2/Summertime Sadness.mp3'},
  {'icon': iconImage, 'title': 'Syberian', 'file': '../../../../../../../Test/Music/New/2/Syberian.mp3'},
  {'icon': iconImage, 'title': 'Take A Look Around', 'file': '../../../../../../../Test/Music/New/2/Take A Look Around.mp3'},
  {'icon': iconImage, 'title': 'Takes Me Nowhere', 'file': '../../../../../../../Test/Music/New/2/Takes Me Nowhere.mp3'},
  {'icon': iconImage, 'title': 'Tanita Tikaram Twist In My Sobriety', 'file': '../../../../../../../Test/Music/New/Copy/Tanita Tikaram - Twist in my sobriety.mp3'},
  {'icon': iconImage, 'title': 'Team Sleep The Passportal', 'file': '../../../../../../../Test/Music/New/~sort/Team sleep-The Passportal.mp3'},
  {'icon': iconImage, 'title': 'Teenagers', 'file': '../../../../../../../Test/Music/New/~sort/MY CHEMICAL ROMANCE/Teenagers.mp3'},
  {'icon': iconImage, 'title': 'The Bangles Eternal Flamme', 'file': '../../../../../../../Test/Music/New/Copy/The Bangles - Eternal Flamme.mp3'},
  {'icon': iconImage, 'title': 'The Beatles Yesterday', 'file': '../../../../../../../Test/Music/New/Copy/The Beatles - Yesterday.mp3'},
  {'icon': iconImage, 'title': 'The Experiment', 'file': '../../../../../../../Test/Music/New/G/The Experiment.mp3'},
  {'icon': iconImage, 'title': 'The Fall', 'file': '../../../../../../../Test/Music/New/2/The fall.mp3'},
  {'icon': iconImage, 'title': 'The Kids Arent Alright', 'file': '../../../../../../../Test/Music/New/2/The kids aren%27t alright.mp3'},
  {'icon': iconImage, 'title': 'The Lively Ones', 'file': '../../../../../../../Test/Music/New/2/The lively ones.mp3'},
  {'icon': iconImage, 'title': 'The Lonely Shepherd', 'file': '../../../../../../../Test/Music/New/2/The lonely shepherd.mp3'},
  {'icon': iconImage, 'title': 'The Memory Remains', 'file': '../../../../../../../Test/Music/New/2/The Memory Remains.mp3'},
  {'icon': iconImage, 'title': 'The New Order', 'file': '../../../../../../../Test/Music/New/G/The New Order.mp3'},
  {'icon': iconImage, 'title': 'The Night Before', 'file': '../../../../../../../Test/Music/New/2/The Night Before.mp3'},
  {'icon': iconImage, 'title': 'The Roy Orbison Medley', 'file': '../../../../../../../Test/Music/New/Copy/Romantic/Disco/The Roy Orbison Medley.mp3'},
  {'icon': iconImage, 'title': 'The Show Must Go On', 'file': '../../../../../../../Test/Music/New/2/The Show Must Go On.mp3'},
  {'icon': iconImage, 'title': 'The Unforgiven', 'file': '../../../../../../../Test/Music/New/2/The Unforgiven.MP3'},
  {'icon': iconImage, 'title': 'There He Is', 'file': '../../../../../../../Test/Music/New/F/There he is.mp3'},
  {'icon': iconImage, 'title': 'This Is The New Shit', 'file': '../../../../../../../Test/Music/New/2/This is The New Shit.mp3'},
  {'icon': iconImage, 'title': 'Time', 'file': '../../../../../../../Test/Music/New/2/Time.mp3'},
  {'icon': iconImage, 'title': 'Time To Burn', 'file': '../../../../../../../Test/Music/New/2/Time to Burn.mp3'},
  {'icon': iconImage, 'title': 'Tony Braxton Unbreak My Heart', 'file': '../../../../../../../Test/Music/New/Copy/Tony Braxton - UnBreak my Heart.mp3'},
  {'icon': iconImage, 'title': 'Touch By Touch', 'file': '../../../../../../../Test/Music/New/2/Touch by touch.mp3'},
  {'icon': iconImage, 'title': 'Towards The Sun', 'file': '../../../../../../../Test/Music/New/2/Towards the sun.mp3'},
  {'icon': iconImage, 'title': 'Tuyo', 'file': '../../../../../../../Test/Music/New/F/Tuyo.mp4'},
  {'icon': iconImage, 'title': 'Umbrella', 'file': '../../../../../../../Test/Music/New/2/Umbrella.mp3'},
  {'icon': iconImage, 'title': 'Unchain My Heart', 'file': '../../../../../../../Test/Music/New/Unchain My Heart.mp4'},
  {'icon': iconImage, 'title': 'Underneath Your Clothes', 'file': '../../../../../../../Test/Music/New/2/Underneath your clothes.mp3'},
  {'icon': iconImage, 'title': 'Vacuum I Breathe', 'file': '../../../../../../../Test/Music/New/Copy/Vacuum - I Breathe.mp3'},
  {'icon': iconImage, 'title': 'Valkyrie', 'file': '../../../../../../../Test/Music/New/2/Valkyrie.mp3'},
  {'icon': iconImage, 'title': 'Van Canto', 'file': '../../../../../../../Test/Music/New/Van Canto.mp4'},
  {'icon': iconImage, 'title': 'Vangelis La Petite Fille De La Mer', 'file': '../../../../../../../Test/Music/New/Copy/Vangelis - La Petite Fille De La Mer.mp3'},
  {'icon': iconImage, 'title': 'W Houston I Will Always Love You', 'file': '../../../../../../../Test/Music/New/Copy/W. Houston-I Will Always Love You.MP3'},
  {'icon': iconImage, 'title': 'Waltz (from Sleeping Beauty)', 'file': '../../../../../../../Test/Music/New/2/Waltz (From Sleeping Beauty).mp3'},
  {'icon': iconImage, 'title': 'We Are One Ole Ola', 'file': '../../../../../../../Test/Music/New/2/We are one ole ola.mp3'},
  {'icon': iconImage, 'title': 'We Will Rock You', 'file': '../../../../../../../Test/Music/New/2/We Will Rock You.mp3'},
  {'icon': iconImage, 'title': 'Welcome To My World Myzuka', 'file': '../../../../../../../Test/Music/New/2/Welcome to my world myzuka.mp3'},
  {'icon': iconImage, 'title': 'Welcome To The Black Parade', 'file': '../../../../../../../Test/Music/New/~sort/MY CHEMICAL ROMANCE/Welcome To The Black Parade.mp3'},
  {'icon': iconImage, 'title': 'West Bound And Down', 'file': '../../../../../../../Test/Music/New/2/west_bound_and_down.mp3'},
  {'icon': iconImage, 'title': 'West Coast', 'file': '../../../../../../../Test/Music/New/2/West coast.mp3'},
  {'icon': iconImage, 'title': 'What A Life', 'file': '../../../../../../../Test/Music/New/2/What A Life.mp3'},
  {'icon': iconImage, 'title': 'When I Dream', 'file': '../../../../../../../Test/Music/New/2/When I Dream.mp3'},
  {'icon': iconImage, 'title': 'Whenever Wherever', 'file': '../../../../../../../Test/Music/New/2/Whenever Wherever.mp3'},
  {'icon': iconImage, 'title': 'Whenever You Will Go', 'file': '../../../../../../../Test/Music/New/Whenever you will go.MP3'},
  {'icon': iconImage, 'title': 'Where The Wild Roses Grow', 'file': '../../../../../../../Test/Music/New/2/Where The Wild Roses Grow.mp3'},
  {'icon': iconImage, 'title': 'Whiskey In Jar', 'file': '../../../../../../../Test/Music/New/2/Whiskey In Jar.mp3'},
  {'icon': iconImage, 'title': 'Whitney Houston I Will Always Love You', 'file': '../../../../../../../Test/Music/New/Copy/Whitney Houston - I Will Always Love You.mp3'},
  {'icon': iconImage, 'title': 'Who Wants To Live Forever', 'file': '../../../../../../../Test/Music/New/2/Who Wants To Live Forever.mp3'},
  {'icon': iconImage, 'title': 'Wild Child', 'file': '../../../../../../../Test/Music/New/2/Wild Child.mp3'},
  {'icon': iconImage, 'title': 'Wind Of Change', 'file': '../../../../../../../Test/Music/New/2/Wind Of Change.mp3'},
  {'icon': iconImage, 'title': 'Word Up!', 'file': '../../../../../../../Test/Music/New/2/Word Up!.mp3'},
  {'icon': iconImage, 'title': 'Wrong', 'file': '../../../../../../../Test/Music/New/2/Wrong.mp3'},
  {'icon': iconImage, 'title': 'You Fly Me Up', 'file': '../../../../../../../Test/Music/New/2/You Fly Me Up.mp3'},
  {'icon': iconImage, 'title': 'You`re Not Alone', 'file': '../../../../../../../Test/Music/New/2/You`re not alone.mp3'},
  {'icon': iconImage, 'title': 'Youll Be Under My Wheels', 'file': '../../../../../../../Test/Music/New/2/Youll be under my wheels.mp3'},
  {'icon': iconImage, 'title': 'Young And Beautiful Myzuka', 'file': '../../../../../../../Test/Music/New/2/Young and beautiful myzuka.mp3'},
  {'icon': iconImage, 'title': 'Zombie', 'file': '../../../../../../../Test/Music/New/2/Zombie.mp3'},
  {'icon': iconImage, 'title': 'Безымянный', 'file': '../../../../../../../Test/Music/New/2/Безымянный.mp3'},
  {'icon': iconImage, 'title': 'Беспечный Ангел', 'file': '../../../../../../../Test/Music/New/2/Беспечный ангел.mp3'},
  {'icon': iconImage, 'title': 'Вальс Из Кф Мой Ласк Нежн Зверь', 'file': '../../../../../../../Test/Music/New/2/Вальс из кф Мой ласк нежн зверь.mp3'},
  {'icon': iconImage, 'title': 'Верхом На Звезде', 'file': '../../../../../../../Test/Music/New/2/Верхом на звезде.mp3'},
  {'icon': iconImage, 'title': 'Возьми Моё Сердце', 'file': '../../../../../../../Test/Music/New/2/Возьми моё сердце.mp3'},
  {'icon': iconImage, 'title': 'Волки', 'file': '../../../../../../../Test/Music/New/2/Волки.mp3'},
  {'icon': iconImage, 'title': 'Воспоминания О Былой Любви', 'file': '../../../../../../../Test/Music/New/2/Воспоминания о былой любви.mp3'},
  {'icon': iconImage, 'title': 'Выбрось Из Головы', 'file': '../../../../../../../Test/Music/New/2/Выбрось из головы.mp3'},
  {'icon': iconImage, 'title': 'Выхода Нет', 'file': '../../../../../../../Test/Music/New/2/Выхода нет.mp3'},
  {'icon': iconImage, 'title': 'Где Мы Летим', 'file': '../../../../../../../Test/Music/New/2/Где мы летим.mp3'},
  {'icon': iconImage, 'title': 'Движение', 'file': '../../../../../../../Test/Music/New/2/Движение.mp3'},
  {'icon': iconImage, 'title': 'Дыхание', 'file': '../../../../../../../Test/Music/New/2/Дыхание.mp3'},
  {'icon': iconImage, 'title': 'Зимняя Сказка', 'file': '../../../../../../../Test/Music/New/2/Зимняя сказка.mp3'},
  {'icon': iconImage, 'title': 'Кукла Колдуна', 'file': '../../../../../../../Test/Music/New/2/Кукла колдуна.mp3'},
  {'icon': iconImage, 'title': 'Лесник', 'file': '../../../../../../../Test/Music/New/2/Лесник.mp3'},
  {'icon': iconImage, 'title': 'Мне Бы В Небо', 'file': '../../../../../../../Test/Music/New/2/Мне Бы В Небо.mp3'},
  {'icon': iconImage, 'title': 'На Берегу Безымянной Реки', 'file': '../../../../../../../Test/Music/New/2/На Берегу Безымянной Реки.mp3'},
  {'icon': iconImage, 'title': 'Наши Детские Смешные Голоса', 'file': '../../../../../../../Test/Music/New/2/Наши детские смешные голоса.mp3'},
  {'icon': iconImage, 'title': 'Никогда', 'file': '../../../../../../../Test/Music/New/2/Никогда.mp3'},
  {'icon': iconImage, 'title': 'Ночная Дорога', 'file': '../../../../../../../Test/Music/New/2/Ночная дорога.mp3'},
  {'icon': iconImage, 'title': 'Позови Меня С Собой', 'file': '../../../../../../../Test/Music/New/2/Позови меня с собой.WAV'},
  {'icon': iconImage, 'title': 'Полковнику Никто Не Пишет', 'file': '../../../../../../../Test/Music/New/2/Полковнику никто не пишет.mp3'},
  {'icon': iconImage, 'title': 'Последняя Поэма', 'file': '../../../../../../../Test/Music/New/2/Последняя поэма.mp3'},
  {'icon': iconImage, 'title': 'Потерянный Рай', 'file': '../../../../../../../Test/Music/New/2/Потерянный рай.mp3'},
  {'icon': iconImage, 'title': 'Прогулки По Воде', 'file': '../../../../../../../Test/Music/New/2/Прогулки по воде.mp3'},
  {'icon': iconImage, 'title': 'Родная', 'file': '../../../../../../../Test/Music/New/2/Родная.mp3'},
  {'icon': iconImage, 'title': 'Серебряный Сентябрь', 'file': '../../../../../../../Test/Music/New/2/Серебряный сентябрь.mp3'},
  {'icon': iconImage, 'title': 'Там На Самом На Краю Земли', 'file': '../../../../../../../Test/Music/New/~sort/Там на самом на краю земли.mp4'},
  {'icon': iconImage, 'title': 'Три Полоски', 'file': '../../../../../../../Test/Music/New/2/Три полоски.mp3'},
  {'icon': iconImage, 'title': 'Тутанхамон', 'file': '../../../../../../../Test/Music/New/2/Тутанхамон.mp3'},
  {'icon': iconImage, 'title': 'Этот День', 'file': '../../../../../../../Test/Music/New/2/Этот день.mp3'},
  {'icon': iconImage, 'title': 'Я Здесь', 'file': '../../../../../../../Test/Music/New/2/Я здесь.mp3'},
]);
})

document.getElementById('nightwish').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '10th Man Down', 'file': '../../../../../../../Test/Music/Nightwish/2001 - Over The Hills And Far Away 2001/10th Man Down.mp3'},
  {'icon': iconImage, 'title': 'Bless The Child', 'file': '../../../../../../../Test/Music/Nightwish/2002 - Century Child 2002/Bless The Child.mp3'},
  {'icon': iconImage, 'title': 'Deep Silent Complete', 'file': '../../../../../../../Test/Music/Nightwish/2001 - From Wishes To Eternity (Live)/Deep Silent Complete.mp3'},
  {'icon': iconImage, 'title': 'High Hopes', 'file': '../../../../../../../Test/Music/Nightwish/2006 - End of an Era live/High Hopes.mp3'},
  {'icon': iconImage, 'title': 'Know Why The Nightingale Sings !', 'file': '../../../../../../../Test/Music/Nightwish/1997 - Angels Fall First/Know Why The Nightingale Sings !.mp3'},
  {'icon': iconImage, 'title': 'Outro', 'file': '../../../../../../../Test/Music/Nightwish/2001 - Live At Gorbunov%27s Palace Of Culture/Outro.mp3'},
  {'icon': iconImage, 'title': 'Phantom Of The Opera', 'file': '../../../../../../../Test/Music/Nightwish/2006 - End of an Era live/Phantom of the Opera.mp3'},
  {'icon': iconImage, 'title': 'Planet Hell', 'file': '../../../../../../../Test/Music/Nightwish/2004 - Nemo/Planet Hell.mp3'},
]);
})

document.getElementById('petshopboys').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Always On My Mind', 'file': '../../../../../../../Test/Music/Pet Shop Boys/Always on my mind.mp3'},
  {'icon': iconImage, 'title': 'Can You Forgive Her', 'file': '../../../../../../../Test/Music/Pet Shop Boys/Can you forgive her.mp3'},
  {'icon': iconImage, 'title': 'Go West', 'file': '../../../../../../../Test/Music/Pet Shop Boys/Go west.mp3'},
  {'icon': iconImage, 'title': 'Its A Sin', 'file': '../../../../../../../Test/Music/Pet Shop Boys/It%27s a Sin.mp4'},
  {'icon': iconImage, 'title': 'Its A Sin', 'file': '../../../../../../../Test/Music/Pet Shop Boys/It%27s a sin.mp3'},
  {'icon': iconImage, 'title': 'Kind Of Thing', 'file': '../../../../../../../Test/Music/Pet Shop Boys/Kind of thing.mp3'},
  {'icon': iconImage, 'title': 'Liberation', 'file': '../../../../../../../Test/Music/Pet Shop Boys/Liberation.mp3'},
  {'icon': iconImage, 'title': 'One In A Million', 'file': '../../../../../../../Test/Music/Pet Shop Boys/One in a million.mp3'},
  {'icon': iconImage, 'title': 'Point Of View', 'file': '../../../../../../../Test/Music/Pet Shop Boys/Point of view.mp3'},
  {'icon': iconImage, 'title': 'Queen', 'file': '../../../../../../../Test/Music/Pet Shop Boys/Queen.mp3'},
  {'icon': iconImage, 'title': 'The Theatre', 'file': '../../../../../../../Test/Music/Pet Shop Boys/The theatre.mp3'},
  {'icon': iconImage, 'title': 'To Speak Is A Sin', 'file': '../../../../../../../Test/Music/Pet Shop Boys/To speak is a sin.mp3'},
  {'icon': iconImage, 'title': 'Yesterday', 'file': '../../../../../../../Test/Music/Pet Shop Boys/Yesterday.mp3'},
]);
})

document.getElementById('piano').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '10 Memes Songs', 'file': '../../../../../../../Test/Music/Piano/10 Memes Songs.webm'},
  {'icon': iconImage, 'title': '17 Мгновений Весны Seventeen Moments Of Spring (piano)', 'file': '../../../../../../../Test/Music/Piano/pn/17 мгновений весны - Seventeen Moments of Spring (piano).mp4'},
  {'icon': iconImage, 'title': '5 Reasons Why Piano Is The Easiest Instrument', 'file': '../../../../../../../Test/Music/Piano/5 Reasons Why Piano is the Easiest Instrument.mp4'},
  {'icon': iconImage, 'title': 'Ac Dc Back In Black (piano Cover By Gamazda)', 'file': '../../../../../../../Test/Music/Piano/AC_DC - Back In Black (Piano cover by Gamazda).mp4'},
  {'icon': iconImage, 'title': 'Batman V Superman Beautiful Lie (piano Version) Sheet Music', 'file': '../../../../../../../Test/Music/Piano/Batman v Superman - Beautiful Lie (Piano Version) + Sheet Music.mp4'},
  {'icon': iconImage, 'title': 'Braveheart Main Theme (piano Version)', 'file': '../../../../../../../Test/Music/Piano/pn/Braveheart - Main Theme (Piano Version).mp4'},
  {'icon': iconImage, 'title': 'Children', 'file': '../../../../../../../Test/Music/Piano/pn/Children.mp4'},
  {'icon': iconImage, 'title': 'Children', 'file': '../../../../../../../Test/Music/Piano/Children.webm'},
  {'icon': iconImage, 'title': 'Ecstasy Of Gold (piano Tutorial Lesson) Ennio Morricone', 'file': '../../../../../../../Test/Music/Piano/Ecstasy of Gold (Piano Tutorial Lesson) Ennio Morricone.mp4'},
  {'icon': iconImage, 'title': 'Every Breath You Take Piano Tutorial', 'file': '../../../../../../../Test/Music/Piano/Every Breath You Take - Piano Tutorial.webm'},
  {'icon': iconImage, 'title': 'Friend Like Me (from Aladdin) Piano Tutorial', 'file': '../../../../../../../Test/Music/Piano/Friend Like Me (from Aladdin) - Piano Tutorial.webm'},
  {'icon': iconImage, 'title': 'Game Of Thrones Theme Piano Tutorial', 'file': '../../../../../../../Test/Music/Piano/GAME OF THRONES THEME - Piano Tutorial.mp4'},
  {'icon': iconImage, 'title': 'Get Over It (guitar Cover)', 'file': '../../../../../../../Test/Music/Piano/Get Over It (Guitar Cover).mp4'},
  {'icon': iconImage, 'title': 'Get Over It (piano Version)', 'file': '../../../../../../../Test/Music/Piano/Get over it (Piano version).mp4'},
  {'icon': iconImage, 'title': 'Guns N Roses Dont Cry (piano Cover By Gamazda)', 'file': '../../../../../../../Test/Music/Piano/Guns N%27 Roses - Don%27t Cry (Piano cover by Gamazda).mp4'},
  {'icon': iconImage, 'title': 'Guns N Roses Sweet Child O Mine (piano Cover By Gamazda)', 'file': '../../../../../../../Test/Music/Piano/Guns N%27 Roses - Sweet Child O%27 Mine (Piano cover by Gamazda).mp4'},
  {'icon': iconImage, 'title': 'How To Make A Girl Smile', 'file': '../../../../../../../Test/Music/Piano/How to Make a Girl Smile.mp4'},
  {'icon': iconImage, 'title': 'I Dont Want To Miss A Thing (piano Сover)', 'file': '../../../../../../../Test/Music/Piano/pn/I Don%27t Want to Miss a Thing (Piano Сover).mp4'},
  {'icon': iconImage, 'title': 'In The Hall Of The Mountain King Piano Tutorial', 'file': '../../../../../../../Test/Music/Piano/IN THE HALL OF THE MOUNTAIN KING - Piano Tutorial.mp4'},
  {'icon': iconImage, 'title': 'Inception Time (piano Version) Sheet Music', 'file': '../../../../../../../Test/Music/Piano/Inception - Time (Piano Version) + Sheet Music.mp4'},
  {'icon': iconImage, 'title': 'Interstellar Main Theme (piano Version) Sheet Music', 'file': '../../../../../../../Test/Music/Piano/Interstellar - Main Theme (Piano Version) + Sheet Music.mp4'},
  {'icon': iconImage, 'title': 'Iron Maiden The Trooper (piano Cover)', 'file': '../../../../../../../Test/Music/Piano/Iron Maiden - The Trooper (Piano cover).mp4'},
  {'icon': iconImage, 'title': 'Island My Name Is Lincoln', 'file': '../../../../../../../Test/Music/Piano/Island - My Name is Lincoln.mp4'},
  {'icon': iconImage, 'title': 'King Of Pride Rock (from The Lion King) Piano Tutorial', 'file': '../../../../../../../Test/Music/Piano/King of Pride Rock (from The Lion King) - Piano Tutorial.webm'},
  {'icon': iconImage, 'title': 'Kraken', 'file': '../../../../../../../Test/Music/Piano/Kraken.mp4'},
  {'icon': iconImage, 'title': 'Kraken Hans Zimmer [piano Tutorial] (synthesia) Hd Cover', 'file': '../../../../../../../Test/Music/Piano/Kraken - Hans Zimmer [Piano Tutorial] (Synthesia) HD Cover.mp4'},
  {'icon': iconImage, 'title': 'Krakensynthesia [piano Tutorial] Pirates Of The Caribbean ', 'file': '../../../../../../../Test/Music/Piano/KrakenSynthesia [Piano Tutorial] Pirates Of The Caribbean - .webm'},
  {'icon': iconImage, 'title': 'Linkin Park In The End (piano Cover By Gamazda)', 'file': '../../../../../../../Test/Music/Piano/Linkin Park - In The End (Piano cover by Gamazda).mp4'},
  {'icon': iconImage, 'title': 'Listen To Your Heart (piano Cover)', 'file': '../../../../../../../Test/Music/Piano/Listen To Your Heart (Piano cover).mp4'},
  {'icon': iconImage, 'title': 'Mein Herz Brennt Rammstein Piano Tutoria', 'file': '../../../../../../../Test/Music/Piano/Mein Herz Brennt - Rammstein - Piano Tutoria.mp4'},
  {'icon': iconImage, 'title': 'Moskau Piano Tutorial', 'file': '../../../../../../../Test/Music/Piano/MOSKAU - Piano Tutorial.mp4'},
  {'icon': iconImage, 'title': 'Now We Are Free', 'file': '../../../../../../../Test/Music/Piano/Now We Are Free.mp4'},
  {'icon': iconImage, 'title': 'Once Upon A December', 'file': '../../../../../../../Test/Music/Piano/Once Upon a December.mp4'},
  {'icon': iconImage, 'title': 'Pirates Of The Caribbean Hes A Pirate Piano Tutorial', 'file': '../../../../../../../Test/Music/Piano/PIRATES OF THE CARIBBEAN - HE%27S A PIRATE - Piano Tutorial.mp4'},
  {'icon': iconImage, 'title': 'Polonaise Farewell To My Homeland (poegnanie Ojczyzny) Youtube', 'file': '../../../../../../../Test/Music/Piano/pn/Polonaise Farewell to My Homeland (Poegnanie Ojczyzny) - YouTube.mp4'},
  {'icon': iconImage, 'title': 'Polonez Oginskogo Piano Tutorial Youtube', 'file': '../../../../../../../Test/Music/Piano/pn/Polonez Oginskogo Piano Tutorial - YouTube.mp4'},
  {'icon': iconImage, 'title': 'Por Una Cabeza (piano) Tango Carlos Gardel', 'file': '../../../../../../../Test/Music/Piano/pn/Por una Cabeza (Piano) - Tango -- CARLOS GARDEL.mp4'},
  {'icon': iconImage, 'title': 'Red Hot Chili Peppers Cant Stop (piano Cover By Gamazda)', 'file': '../../../../../../../Test/Music/Piano/Red Hot Chili Peppers - Can%27t Stop (Piano cover by Gamazda).mp4'},
  {'icon': iconImage, 'title': 'Summer The Four Seasons', 'file': '../../../../../../../Test/Music/Piano/Summer   The Four Seasons.mp4'},
  {'icon': iconImage, 'title': 'Super Mario Bros Medley Piano Tutorial', 'file': '../../../../../../../Test/Music/Piano/SUPER MARIO BROS MEDLEY - Piano Tutorial.mp4'},
  {'icon': iconImage, 'title': 'Super Mario On Piano With Sound Effects', 'file': '../../../../../../../Test/Music/Piano/Super Mario on Piano With Sound Effects.mp4'},
  {'icon': iconImage, 'title': 'Teardrop (cover)', 'file': '../../../../../../../Test/Music/Piano/Teardrop (Cover).mp4'},
  {'icon': iconImage, 'title': 'Thank You For The Music Piano Tutorial', 'file': '../../../../../../../Test/Music/Piano/Thank You For The Music - Piano Tutorial.webm'},
  {'icon': iconImage, 'title': 'The Ecstasy Of Gold', 'file': '../../../../../../../Test/Music/Piano/The Ecstasy of Gold .mp4'},
  {'icon': iconImage, 'title': 'The Offspring The Kids Arent Alright (piano Cover)', 'file': '../../../../../../../Test/Music/Piano/pn/The Offspring - The Kids Aren%27t Alright (Piano Cover).mp4'},
  {'icon': iconImage, 'title': 'This Land', 'file': '../../../../../../../Test/Music/Piano/This Land.webm'},
  {'icon': iconImage, 'title': 'Top 7 Most Bizarre Musical Instruments Of The World', 'file': '../../../../../../../Test/Music/Piano/Top 7 Most Bizarre Musical Instruments of the World.mp4'},
  {'icon': iconImage, 'title': 'What A Life', 'file': '../../../../../../../Test/Music/Piano/What A Life.mp4'},
  {'icon': iconImage, 'title': 'Winter The Four Seasons', 'file': '../../../../../../../Test/Music/Piano/Winter   The Four Seasons.mp4'},
  {'icon': iconImage, 'title': 'В Последнюю Осень (piano Cover) Ноты', 'file': '../../../../../../../Test/Music/Piano/В последнюю осень (PIANO COVER) +Ноты.mp4'},
  {'icon': iconImage, 'title': 'В Последнюю Осень By Piano', 'file': '../../../../../../../Test/Music/Piano/в последнюю осень by piano.mp4'},
  {'icon': iconImage, 'title': 'Двое В Кафе М Таривердиев (ноты И Видеоурок Для Фортепиано) (piano Cover)', 'file': '../../../../../../../Test/Music/Piano/Двое в кафе - М. Таривердиев (Ноты и Видеоурок для фортепиано) (piano cover).mp4'},
  {'icon': iconImage, 'title': 'Полонез Огинского', 'file': '../../../../../../../Test/Music/Piano/Полонез Огинского.mp4'},
  {'icon': iconImage, 'title': 'Следствие Ведут Колобки', 'file': '../../../../../../../Test/Music/Piano/Следствие ведут колобки%27.mp4'},
  {'icon': iconImage, 'title': 'Токката – Поль Мориа', 'file': '../../../../../../../Test/Music/Piano/Токката – Поль Мориа.mp4'},
]);
})

document.getElementById('pinkfloyd').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A Great Day For Freedom', 'file': '../../../../../../../Test/Music/Pink Floyd/1995 - P.U.L.S.E/A Great Day For Freedom.mp3'},
  {'icon': iconImage, 'title': 'Another Brick In The Wall (i)', 'file': '../../../../../../../Test/Music/Pink Floyd/The Wall/Another Brick In The Wall (I).mp3'},
  {'icon': iconImage, 'title': 'Another Brick In The Wall (ii)', 'file': '../../../../../../../Test/Music/Pink Floyd/The Wall/Another Brick In The Wall (II).mp3'},
  {'icon': iconImage, 'title': 'Another Brick In The Wall (iii)', 'file': '../../../../../../../Test/Music/Pink Floyd/The Wall/Another Brick In The Wall (III).mp3'},
  {'icon': iconImage, 'title': 'High Hopes', 'file': '../../../../../../../Test/Music/Pink Floyd/1995 - P.U.L.S.E/High Hopes.mp3'},
  {'icon': iconImage, 'title': 'Not Naw John', 'file': '../../../../../../../Test/Music/Pink Floyd/The Final Cut/Not Naw John.mp3'},
  {'icon': iconImage, 'title': 'Shine On Your Crazy Diamond', 'file': '../../../../../../../Test/Music/Pink Floyd/1995 - P.U.L.S.E/Shine On Your Crazy Diamond.mp3'},
  {'icon': iconImage, 'title': 'Summer68', 'file': '../../../../../../../Test/Music/Pink Floyd/Atom Heart Mother/Summer%2768.mp3'},
  {'icon': iconImage, 'title': 'Us And Them', 'file': '../../../../../../../Test/Music/Pink Floyd/1995 - P.U.L.S.E II/Us And Them.mp3'},
]);
})

document.getElementById('queen').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '01 Bohemian Rapsody', 'file': '../../../../../../../Test/Music/Queen/1978 - Jazz/01 Bohemian Rapsody.mp3'},
  {'icon': iconImage, 'title': '01 Mustapha', 'file': '../../../../../../../Test/Music/Queen/1978 - Jazz/01 Mustapha.mp3'},
  {'icon': iconImage, 'title': '02 Bohemian Rhapsody', 'file': '../../../../../../../Test/Music/Queen/1978 - Jazz/02 Bohemian rhapsody.mp3'},
  {'icon': iconImage, 'title': '04 Bohemian Rhapsody', 'file': '../../../../../../../Test/Music/Queen/1978 - Jazz/04 Bohemian Rhapsody.mp3'},
  {'icon': iconImage, 'title': '06 Bohemian Rhapsody', 'file': '../../../../../../../Test/Music/Queen/1978 - Jazz/06 Bohemian Rhapsody.mp3'},
  {'icon': iconImage, 'title': '11 Bohemian Rhapsody', 'file': '../../../../../../../Test/Music/Queen/1978 - Jazz/11 Bohemian Rhapsody.mp3'},
  {'icon': iconImage, 'title': 'A Kind Of Magic', 'file': '../../../../../../../Test/Music/Queen/A Kind Of Magic.mp3'},
  {'icon': iconImage, 'title': 'A Kind Of Magic', 'file': '../../../../../../../Test/Music/Queen/1986 - A Kind Of Magic/A Kind Of Magic.mp3'},
  {'icon': iconImage, 'title': 'Crazy Litttle Thing Called Love', 'file': '../../../../../../../Test/Music/Queen/1992 - Cry Argentina/Crazy litttle thing called love.mp3'},
  {'icon': iconImage, 'title': 'Forever', 'file': '../../../../../../../Test/Music/Queen/Forever.mp3'},
  {'icon': iconImage, 'title': 'Friends Will Be Friends', 'file': '../../../../../../../Test/Music/Queen/Friends Will Be Friends.mp3'},
  {'icon': iconImage, 'title': 'Friends Will Be Friends', 'file': '../../../../../../../Test/Music/Queen/1992 - Live At Wembley %2786/Friends Will Be Friends.mp3'},
  {'icon': iconImage, 'title': 'I Want It All', 'file': '../../../../../../../Test/Music/Queen/1989 - The Miracle/I want it all.mp3'},
  {'icon': iconImage, 'title': 'My Life Has Been Saved', 'file': '../../../../../../../Test/Music/Queen/1995 - Made In Heaven/My Life Has Been Saved.mp3'},
  {'icon': iconImage, 'title': 'My Life Has Been Saved', 'file': '../../../../../../../Test/Music/Queen/My Life Has Been Saved.mp3'},
  {'icon': iconImage, 'title': 'One Vision', 'file': '../../../../../../../Test/Music/Queen/1992 - Classic Queen/One Vision.mp3'},
  {'icon': iconImage, 'title': 'One Year Of Life', 'file': '../../../../../../../Test/Music/Queen/One year of life.mp3'},
  {'icon': iconImage, 'title': 'Show Must Go On', 'file': '../../../../../../../Test/Music/Queen/Show Must Go On.mp3'},
  {'icon': iconImage, 'title': 'Somebody To Love', 'file': '../../../../../../../Test/Music/Queen/1976 - A Day At The Races/Somebody to love.mp3'},
  {'icon': iconImage, 'title': 'The Show Must Go On', 'file': '../../../../../../../Test/Music/Queen/1991 - Greatest Hits II/The Show Must Go On.mp3'},
  {'icon': iconImage, 'title': 'The Show Must Go On', 'file': '../../../../../../../Test/Music/Queen/The Show Must Go On.mp4'},
  {'icon': iconImage, 'title': 'Under Pressure', 'file': '../../../../../../../Test/Music/Queen/1982 - Hot Space/Under Pressure.mp3'},
  {'icon': iconImage, 'title': 'Universe', 'file': '../../../../../../../Test/Music/Queen/Universe.mp3'},
  {'icon': iconImage, 'title': 'We Are The Champions', 'file': '../../../../../../../Test/Music/Queen/1979 - Live Killers/We Are The Champions.mp3'},
  {'icon': iconImage, 'title': 'We Will Rock You', 'file': '../../../../../../../Test/Music/Queen/We Will Rock You.mp3'},
  {'icon': iconImage, 'title': 'We Will Rock You', 'file': '../../../../../../../Test/Music/Queen/1981 - Greatest Hits I/We Will Rock You.mp3'},
  {'icon': iconImage, 'title': 'Who Wants To Live Forever', 'file': '../../../../../../../Test/Music/Queen/Who Wants To Live Forever.mp3'},
  {'icon': iconImage, 'title': 'Who Wants To Live Forever', 'file': '../../../../../../../Test/Music/Queen/1986 - A Kind Of Magic/Who Wants To Live Forever.mp3'},
]);
})

document.getElementById('radio').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A Mix Of Rock Song', 'file': '../../../../../../../Test/Music/RADIO/A mix of rock song.mp3'},
  {'icon': iconImage, 'title': 'A New Day Has Come', 'file': '../../../../../../../Test/Music/RADIO/A new day has come.mp3'},
  {'icon': iconImage, 'title': 'A Pain That Im Used To', 'file': '../../../../../../../Test/Music/RADIO/Depeche mode/2005 - Playing The Angel/A  Pain That I%27m Used To.mp3'},
  {'icon': iconImage, 'title': 'A Thing About You', 'file': '../../../../../../../Test/Music/RADIO/Roxette/Bonus/A Thing About You.mp3'},
  {'icon': iconImage, 'title': 'Abro Kadabro', 'file': '../../../../../../../Test/Music/RADIO/ABRO KADABRO.mp3'},
  {'icon': iconImage, 'title': 'All Or Nothing', 'file': '../../../../../../../Test/Music/RADIO/All Or Nothing.mp3'},
  {'icon': iconImage, 'title': 'Alleine Zu Zweit', 'file': '../../../../../../../Test/Music/RADIO/Alleine Zu Zweit.mp3'},
  {'icon': iconImage, 'title': 'Apocalyptica', 'file': '../../../../../../../Test/Music/RADIO/Apocalyptica.mp3'},
  {'icon': iconImage, 'title': 'Around The World', 'file': '../../../../../../../Test/Music/RADIO/Around the world.mp3'},
  {'icon': iconImage, 'title': 'Bamboleo', 'file': '../../../../../../../Test/Music/RADIO/Bamboleo.mp3'},
  {'icon': iconImage, 'title': 'Barbie Girl', 'file': '../../../../../../../Test/Music/RADIO/Barbie Girl.mp3'},
  {'icon': iconImage, 'title': 'Bitter Sweet Symphony', 'file': '../../../../../../../Test/Music/RADIO/Bitter Sweet Symphony.mp3'},
  {'icon': iconImage, 'title': 'Black Or White', 'file': '../../../../../../../Test/Music/RADIO/Black or White.mp3'},
  {'icon': iconImage, 'title': 'Born To Touch Your Feelings', 'file': '../../../../../../../Test/Music/RADIO/ScorpionS/Born To Touch Your Feelings.mp3'},
  {'icon': iconImage, 'title': 'Broken Promises', 'file': '../../../../../../../Test/Music/RADIO/Broken Promises.mp3'},
  {'icon': iconImage, 'title': 'Bumble Bees', 'file': '../../../../../../../Test/Music/RADIO/Bumble bees.mp3'},
  {'icon': iconImage, 'title': 'Bye Bye Bye', 'file': '../../../../../../../Test/Music/RADIO/Bye Bye Bye.mp3'},
  {'icon': iconImage, 'title': 'California Dreaming', 'file': '../../../../../../../Test/Music/RADIO/California Dreaming.mp3'},
  {'icon': iconImage, 'title': 'Calling', 'file': '../../../../../../../Test/Music/RADIO/Calling.mp3'},
  {'icon': iconImage, 'title': 'Cara Mia', 'file': '../../../../../../../Test/Music/RADIO/Cara Mia.mp3'},
  {'icon': iconImage, 'title': 'Careless Whispe', 'file': '../../../../../../../Test/Music/RADIO/Careless Whispe.mp3'},
  {'icon': iconImage, 'title': 'Celebrate The Love', 'file': '../../../../../../../Test/Music/RADIO/Celebrate the Love.mp3'},
  {'icon': iconImage, 'title': 'Chikago', 'file': '../../../../../../../Test/Music/RADIO/Chikago.mp3'},
  {'icon': iconImage, 'title': 'Children', 'file': '../../../../../../../Test/Music/RADIO/Children.mp3'},
  {'icon': iconImage, 'title': 'Clint Eastwood', 'file': '../../../../../../../Test/Music/RADIO/Clint Eastwood.mp3'},
  {'icon': iconImage, 'title': 'Clubbed To Death', 'file': '../../../../../../../Test/Music/RADIO/Clubbed To Death.mp3'},
  {'icon': iconImage, 'title': 'Crash Boom Bang', 'file': '../../../../../../../Test/Music/RADIO/Roxette/1994 - Crash Boom Bang/Crash Boom Bang.mp3'},
  {'icon': iconImage, 'title': 'Da Di Dam', 'file': '../../../../../../../Test/Music/RADIO/Da di dam.mp3'},
  {'icon': iconImage, 'title': 'Daddy Dj', 'file': '../../../../../../../Test/Music/RADIO/Daddy DJ.mp3'},
  {'icon': iconImage, 'title': 'Darkseed', 'file': '../../../../../../../Test/Music/RADIO/DARKSEED.mp3'},
  {'icon': iconImage, 'title': 'Dasboot', 'file': '../../../../../../../Test/Music/RADIO/Dasboot.mp3'},
  {'icon': iconImage, 'title': 'Desenchantee', 'file': '../../../../../../../Test/Music/RADIO/Desenchantee.mp3'},
  {'icon': iconImage, 'title': 'Desert Rose', 'file': '../../../../../../../Test/Music/RADIO/Desert Rose.mp3'},
  {'icon': iconImage, 'title': 'Disco Superstar', 'file': '../../../../../../../Test/Music/RADIO/Disco Superstar.mp3'},
  {'icon': iconImage, 'title': 'Diva', 'file': '../../../../../../../Test/Music/RADIO/Diva.mp3'},
  {'icon': iconImage, 'title': 'Do What U Want', 'file': '../../../../../../../Test/Music/RADIO/Do what u want.mp3'},
  {'icon': iconImage, 'title': 'Don`t Play Your Rock`n` Roll To Me', 'file': '../../../../../../../Test/Music/RADIO/Don`t Play Your Rock`n` Roll To Me.mp3'},
  {'icon': iconImage, 'title': 'Dont Speak', 'file': '../../../../../../../Test/Music/RADIO/Don%27t speak.mp3'},
  {'icon': iconImage, 'title': 'Dragostea Din Tei', 'file': '../../../../../../../Test/Music/RADIO/Dragostea Din Tei.MP3'},
  {'icon': iconImage, 'title': 'Eagleheart', 'file': '../../../../../../../Test/Music/RADIO/Eagleheart.mp3'},
  {'icon': iconImage, 'title': 'Feel', 'file': '../../../../../../../Test/Music/RADIO/Feel.mp3'},
  {'icon': iconImage, 'title': 'Fight For All The Wrong Reasons', 'file': '../../../../../../../Test/Music/RADIO/Nickelback/2005 - All The Right Reasons/Fight For All The Wrong Reasons.mp3'},
  {'icon': iconImage, 'title': 'Fire', 'file': '../../../../../../../Test/Music/RADIO/Fire.mp3'},
  {'icon': iconImage, 'title': 'Five&queen Rock Uconnect U', 'file': '../../../../../../../Test/Music/RADIO/FIVE&QUEEN-Rock U,Connect U.mp3'},
  {'icon': iconImage, 'title': 'Flames Of Love', 'file': '../../../../../../../Test/Music/RADIO/Flames of Love.mp3'},
  {'icon': iconImage, 'title': 'Flashdance', 'file': '../../../../../../../Test/Music/RADIO/Flashdance.mp3'},
  {'icon': iconImage, 'title': 'Fly On The Wings Of Love', 'file': '../../../../../../../Test/Music/RADIO/Fly On The Wings Of Love.mp3'},
  {'icon': iconImage, 'title': 'Forever Young', 'file': '../../../../../../../Test/Music/RADIO/Forever Young.mp3'},
  {'icon': iconImage, 'title': 'Fragile', 'file': '../../../../../../../Test/Music/RADIO/Fragile.mp3'},
  {'icon': iconImage, 'title': 'Freestyler', 'file': '../../../../../../../Test/Music/RADIO/Freestyler.mp3'},
  {'icon': iconImage, 'title': 'From Sarah With Love', 'file': '../../../../../../../Test/Music/RADIO/From Sarah with love.mp3'},
  {'icon': iconImage, 'title': 'Get A Job', 'file': '../../../../../../../Test/Music/RADIO/Get a Job.mp3'},
  {'icon': iconImage, 'title': 'Gone With The Sin', 'file': '../../../../../../../Test/Music/RADIO/H.I.M/Razorblade Romance/Gone With The Sin.mp3'},
  {'icon': iconImage, 'title': 'Hafanana', 'file': '../../../../../../../Test/Music/RADIO/Hafanana.mp3'},
  {'icon': iconImage, 'title': 'Happy Nation', 'file': '../../../../../../../Test/Music/RADIO/Happy Nation.mp3'},
  {'icon': iconImage, 'title': 'Harumamburu', 'file': '../../../../../../../Test/Music/RADIO/Harumamburu.mp3'},
  {'icon': iconImage, 'title': 'Heartache Every Moment', 'file': '../../../../../../../Test/Music/RADIO/H.I.M/Deep Shadows And Brilliant Highlights/Heartache Every Moment.mp3'},
  {'icon': iconImage, 'title': 'Here Without You', 'file': '../../../../../../../Test/Music/RADIO/Here Without You.mp3'},
  {'icon': iconImage, 'title': 'How Do You Do', 'file': '../../../../../../../Test/Music/RADIO/Roxette/1992 - Tourism/How Do You Do.mp3'},
  {'icon': iconImage, 'title': 'How You Remind Me', 'file': '../../../../../../../Test/Music/RADIO/Nickelback/2001 - Silver Side Up/How You Remind Me.mp3'},
  {'icon': iconImage, 'title': 'I Breathe', 'file': '../../../../../../../Test/Music/RADIO/I Breathe.mp3'},
  {'icon': iconImage, 'title': 'I Dont Want To Miss A Thing', 'file': '../../../../../../../Test/Music/RADIO/I Don%27t Want To Miss A Thing.mp3'},
  {'icon': iconImage, 'title': 'I Get No Down', 'file': '../../../../../../../Test/Music/RADIO/I get no down.mp3'},
  {'icon': iconImage, 'title': 'I Jast Wont To Feel', 'file': '../../../../../../../Test/Music/RADIO/I jast wont to feel.mp3'},
  {'icon': iconImage, 'title': 'I Saw You Dancing', 'file': '../../../../../../../Test/Music/RADIO/I Saw You Dancing.mp3'},
  {'icon': iconImage, 'title': 'I Was Made For Lovin You', 'file': '../../../../../../../Test/Music/RADIO/I was made for lovin%27 you.MP3'},
  {'icon': iconImage, 'title': 'Im In Love', 'file': '../../../../../../../Test/Music/RADIO/Im in Love.MP3'},
  {'icon': iconImage, 'title': 'Im Not A Girl', 'file': '../../../../../../../Test/Music/RADIO/I%27m Not A Girl.mp3'},
  {'icon': iconImage, 'title': 'In For A Panny', 'file': '../../../../../../../Test/Music/RADIO/In for a panny.mp3'},
  {'icon': iconImage, 'title': 'In For A Penny In For A Pound', 'file': '../../../../../../../Test/Music/RADIO/In for a Penny In for a Pound.mp4'},
  {'icon': iconImage, 'title': 'In The Army Now', 'file': '../../../../../../../Test/Music/RADIO/In the army now.mp3'},
  {'icon': iconImage, 'title': 'In The Army Now', 'file': '../../../../../../../Test/Music/RADIO/In The Army Now .mp4'},
  {'icon': iconImage, 'title': 'In The Army Now', 'file': '../../../../../../../Test/Music/RADIO/In The Army Now.mp4'},
  {'icon': iconImage, 'title': 'In The Shadows', 'file': '../../../../../../../Test/Music/RADIO/In The Shadows.mp3'},
  {'icon': iconImage, 'title': 'In Your Room', 'file': '../../../../../../../Test/Music/RADIO/Depeche mode/1993 - Songs of Faith and Devotion/In Your Room.mp3'},
  {'icon': iconImage, 'title': 'It`s Raining Men', 'file': '../../../../../../../Test/Music/RADIO/It`s raining men.mp3'},
  {'icon': iconImage, 'title': 'Its My Life', 'file': '../../../../../../../Test/Music/RADIO/Its My Life.mp3'},
  {'icon': iconImage, 'title': 'Join Me In Death', 'file': '../../../../../../../Test/Music/RADIO/H.I.M/Razorblade Romance/Join Me In Death.mp3'},
  {'icon': iconImage, 'title': 'Just Be Good To Me', 'file': '../../../../../../../Test/Music/RADIO/Just Be Good to Me.mp3'},
  {'icon': iconImage, 'title': 'Kara Mia', 'file': '../../../../../../../Test/Music/RADIO/Kara Mia.mp3'},
  {'icon': iconImage, 'title': 'Kingson Town', 'file': '../../../../../../../Test/Music/RADIO/Kingson Town.mp3'},
  {'icon': iconImage, 'title': 'Kojo Notsuki', 'file': '../../../../../../../Test/Music/RADIO/ScorpionS/Kojo NoTsuki.mp3'},
  {'icon': iconImage, 'title': 'Ku Ku Djambo', 'file': '../../../../../../../Test/Music/RADIO/Ku ku Djambo.mp3'},
  {'icon': iconImage, 'title': 'Late Goodbye', 'file': '../../../../../../../Test/Music/RADIO/Late Goodbye.mp3'},
  {'icon': iconImage, 'title': 'Learn The Hard Way', 'file': '../../../../../../../Test/Music/RADIO/Nickelback/2003 - The Long Road/Learn The Hard Way.mp3'},
  {'icon': iconImage, 'title': 'Life Is Life', 'file': '../../../../../../../Test/Music/RADIO/Life is Life.mp3'},
  {'icon': iconImage, 'title': 'Listen To Your Heart', 'file': '../../../../../../../Test/Music/RADIO/Roxette/1988 - Look Sharp/Listen To Your Heart.mp3'},
  {'icon': iconImage, 'title': 'Livin La Vida Loca', 'file': '../../../../../../../Test/Music/RADIO/Livin%27 La Vida Loca.mp3'},
  {'icon': iconImage, 'title': 'Lonely Night', 'file': '../../../../../../../Test/Music/RADIO/ScorpionS/Lonely Night.mp3'},
  {'icon': iconImage, 'title': 'Losing Grip', 'file': '../../../../../../../Test/Music/RADIO/Losing grip.mp3'},
  {'icon': iconImage, 'title': 'Love Is Blue', 'file': '../../../../../../../Test/Music/RADIO/Love is Blue.mp3'},
  {'icon': iconImage, 'title': 'Love To Hate You', 'file': '../../../../../../../Test/Music/RADIO/Love To Hate You.mp3'},
  {'icon': iconImage, 'title': 'Lucefer', 'file': '../../../../../../../Test/Music/RADIO/Lucefer.mp3'},
  {'icon': iconImage, 'title': 'Mafia', 'file': '../../../../../../../Test/Music/RADIO/Mafia.mp3'},
  {'icon': iconImage, 'title': 'Makarena', 'file': '../../../../../../../Test/Music/RADIO/Makarena.mp3'},
  {'icon': iconImage, 'title': 'Maybe', 'file': '../../../../../../../Test/Music/RADIO/Maybe.mp3'},
  {'icon': iconImage, 'title': 'Milk Toast Honey', 'file': '../../../../../../../Test/Music/RADIO/Roxette/2001 - Room Service/Milk Toast Honey.mp3'},
  {'icon': iconImage, 'title': 'Mix', 'file': '../../../../../../../Test/Music/RADIO/Mix.mp3'},
  {'icon': iconImage, 'title': 'Moltiva', 'file': '../../../../../../../Test/Music/RADIO/Moltiva.mp3'},
  {'icon': iconImage, 'title': 'Moon Light Shadow', 'file': '../../../../../../../Test/Music/RADIO/Moon Light Shadow.mp3'},
  {'icon': iconImage, 'title': 'Moskou', 'file': '../../../../../../../Test/Music/RADIO/Moskou.mp3'},
  {'icon': iconImage, 'title': 'Nah Nah Nah', 'file': '../../../../../../../Test/Music/RADIO/Nah-Nah-Nah.mp3'},
  {'icon': iconImage, 'title': 'Norting Girl', 'file': '../../../../../../../Test/Music/RADIO/Norting girl.mp3'},
  {'icon': iconImage, 'title': 'Oops! I Did It Again', 'file': '../../../../../../../Test/Music/RADIO/OOPS! I Did It Again.mp3'},
  {'icon': iconImage, 'title': 'Pantheon In Flames', 'file': '../../../../../../../Test/Music/RADIO/Pantheon In Flames.mp3'},
  {'icon': iconImage, 'title': 'Paradise', 'file': '../../../../../../../Test/Music/RADIO/Paradise.mp3'},
  {'icon': iconImage, 'title': 'Pasadena', 'file': '../../../../../../../Test/Music/RADIO/Pasadena.mp3'},
  {'icon': iconImage, 'title': 'Personal Jesus', 'file': '../../../../../../../Test/Music/RADIO/Depeche mode/1996 - The Singles %2786-%2798 (1998)/Personal Jesus.mp3'},
  {'icon': iconImage, 'title': 'Pretty Fly', 'file': '../../../../../../../Test/Music/RADIO/Pretty fly.mp3'},
  {'icon': iconImage, 'title': 'Rockstar', 'file': '../../../../../../../Test/Music/RADIO/Nickelback/2005 - All The Right Reasons/Rockstar.mp3'},
  {'icon': iconImage, 'title': 'Sexcrime', 'file': '../../../../../../../Test/Music/RADIO/Sexcrime.MP3'},
  {'icon': iconImage, 'title': 'Show Me The Meaning', 'file': '../../../../../../../Test/Music/RADIO/Show Me The Meaning.mp3'},
  {'icon': iconImage, 'title': 'Shut Your Mouth', 'file': '../../../../../../../Test/Music/RADIO/Shut Your Mouth.mp3'},
  {'icon': iconImage, 'title': 'Smooth Criminal', 'file': '../../../../../../../Test/Music/RADIO/Smooth Criminal.mp3'},
  {'icon': iconImage, 'title': 'Solo', 'file': '../../../../../../../Test/Music/RADIO/Solo.mp3'},
  {'icon': iconImage, 'title': 'Spanish Guitar', 'file': '../../../../../../../Test/Music/RADIO/Spanish guitar.mp3'},
  {'icon': iconImage, 'title': 'Still Loving You', 'file': '../../../../../../../Test/Music/RADIO/ScorpionS/Still Loving You.mp3'},
  {'icon': iconImage, 'title': 'Strangelove', 'file': '../../../../../../../Test/Music/RADIO/Depeche mode/1996 - The Singles %2786-%2798 (1998)/Strangelove.mp3'},
  {'icon': iconImage, 'title': 'Stumblin In', 'file': '../../../../../../../Test/Music/RADIO/Stumblin%27 In.mp3'},
  {'icon': iconImage, 'title': 'Supreme', 'file': '../../../../../../../Test/Music/RADIO/Supreme.mp3'},
  {'icon': iconImage, 'title': 'Susana', 'file': '../../../../../../../Test/Music/RADIO/Susana.mp3'},
  {'icon': iconImage, 'title': 'Sweet Dreams', 'file': '../../../../../../../Test/Music/RADIO/Sweet Dreams.mp3'},
  {'icon': iconImage, 'title': 'Sweetest Perfection', 'file': '../../../../../../../Test/Music/RADIO/Depeche mode/1990 - Violator/Sweetest Perfection.mp3'},
  {'icon': iconImage, 'title': 'Take My Love', 'file': '../../../../../../../Test/Music/RADIO/Take My Love.mp3'},
  {'icon': iconImage, 'title': 'Tarzan Boy', 'file': '../../../../../../../Test/Music/RADIO/Tarzan boy.mp3'},
  {'icon': iconImage, 'title': 'Ten Oclock', 'file': '../../../../../../../Test/Music/RADIO/Ten o%27clock.MP3'},
  {'icon': iconImage, 'title': 'Thank You', 'file': '../../../../../../../Test/Music/RADIO/Thank You.mp3'},
  {'icon': iconImage, 'title': 'The Centre Of The Heart', 'file': '../../../../../../../Test/Music/RADIO/Roxette/2001 - Room Service/The Centre Of The Heart.mp3'},
  {'icon': iconImage, 'title': 'The Color Of Night', 'file': '../../../../../../../Test/Music/RADIO/The Color of Night.mp3'},
  {'icon': iconImage, 'title': 'The Final Countdown', 'file': '../../../../../../../Test/Music/RADIO/The Final Countdown.mp3'},
  {'icon': iconImage, 'title': 'The Good The Bad The Ugly', 'file': '../../../../../../../Test/Music/RADIO/The Good ,The  Bad, The Ugly.MP3'},
  {'icon': iconImage, 'title': 'The Kids Arent Alright', 'file': '../../../../../../../Test/Music/RADIO/The kids aren%27t alright.mp3'},
  {'icon': iconImage, 'title': 'The Logical Song', 'file': '../../../../../../../Test/Music/RADIO/The Logical Song.mp3'},
  {'icon': iconImage, 'title': 'The Look', 'file': '../../../../../../../Test/Music/RADIO/Roxette/The Look.mp3'},
  {'icon': iconImage, 'title': 'The Terminator', 'file': '../../../../../../../Test/Music/RADIO/The Terminator.mp3'},
  {'icon': iconImage, 'title': 'They Dont Care About Us', 'file': '../../../../../../../Test/Music/RADIO/They Dont Care About Us.mp3'},
  {'icon': iconImage, 'title': 'Thinking Of You', 'file': '../../../../../../../Test/Music/RADIO/Thinking of You.MP3'},
  {'icon': iconImage, 'title': 'Tike Tike Kardi', 'file': '../../../../../../../Test/Music/RADIO/Tike tike kardi.mp3'},
  {'icon': iconImage, 'title': 'Twist In My Sobriety', 'file': '../../../../../../../Test/Music/RADIO/Twist In My Sobriety.mp4'},
  {'icon': iconImage, 'title': 'Twist In My Sobriety', 'file': '../../../../../../../Test/Music/RADIO/Twist In My Sobriety.mp3'},
  {'icon': iconImage, 'title': 'Uefa Champions League', 'file': '../../../../../../../Test/Music/RADIO/UEFA Champions League.mp3'},
  {'icon': iconImage, 'title': 'Velvet', 'file': '../../../../../../../Test/Music/RADIO/Velvet.mp3'},
  {'icon': iconImage, 'title': 'Weekend!', 'file': '../../../../../../../Test/Music/RADIO/Weekend!.mp3'},
  {'icon': iconImage, 'title': 'What Is Love', 'file': '../../../../../../../Test/Music/RADIO/What Is Love.mp3'},
  {'icon': iconImage, 'title': 'When The Lights Go Out', 'file': '../../../../../../../Test/Music/RADIO/When the Lights Go Out.mp3'},
  {'icon': iconImage, 'title': 'Where The Wild Roses Grow', 'file': '../../../../../../../Test/Music/RADIO/Where The Wild Roses Grow.mp3'},
  {'icon': iconImage, 'title': 'White Dove', 'file': '../../../../../../../Test/Music/RADIO/ScorpionS/White Dove.mp3'},
  {'icon': iconImage, 'title': 'Wicked Game', 'file': '../../../../../../../Test/Music/RADIO/H.I.M/Greatest Lovesongs vol.666/Wicked Game.mp3'},
  {'icon': iconImage, 'title': 'Wind Of Change', 'file': '../../../../../../../Test/Music/RADIO/ScorpionS/Wind Of Change.mp3'},
  {'icon': iconImage, 'title': 'Wish You Were Here', 'file': '../../../../../../../Test/Music/RADIO/Wish You Were Here.mp3'},
  {'icon': iconImage, 'title': 'Words', 'file': '../../../../../../../Test/Music/RADIO/Words.mp3'},
  {'icon': iconImage, 'title': 'Www Ленинград', 'file': '../../../../../../../Test/Music/RADIO/WWW Ленинград.mp3'},
  {'icon': iconImage, 'title': 'Zombie', 'file': '../../../../../../../Test/Music/RADIO/Zombie.mp3'},
  {'icon': iconImage, 'title': 'Zoo', 'file': '../../../../../../../Test/Music/RADIO/Zoo.mp3'},
  {'icon': iconImage, 'title': 'А Мы Любили', 'file': '../../../../../../../Test/Music/RADIO/Hi-Fi/А мы любили.mp3'},
  {'icon': iconImage, 'title': 'А Что Нам Надо', 'file': '../../../../../../../Test/Music/RADIO/А Что Нам Надо.mp3'},
  {'icon': iconImage, 'title': 'Бог Устал Нас Любить', 'file': '../../../../../../../Test/Music/RADIO/Сплин/Бог Устал Нас Любить.mp3'},
  {'icon': iconImage, 'title': 'Была Не Была', 'file': '../../../../../../../Test/Music/RADIO/Была не была.mp3'},
  {'icon': iconImage, 'title': 'В Жизни Так Бывает', 'file': '../../../../../../../Test/Music/RADIO/В Жизни Так Бывает.mp3'},
  {'icon': iconImage, 'title': 'Вериш Ли Ты Или Нет', 'file': '../../../../../../../Test/Music/RADIO/Вериш ли ты или нет.mp3'},
  {'icon': iconImage, 'title': 'Вечно Молодой', 'file': '../../../../../../../Test/Music/RADIO/Вечно молодой.mp3'},
  {'icon': iconImage, 'title': 'Вместе И Навсегда', 'file': '../../../../../../../Test/Music/RADIO/Вместе и навсегда.mp3'},
  {'icon': iconImage, 'title': 'Воскрешени', 'file': '../../../../../../../Test/Music/RADIO/Воскрешени.mp3'},
  {'icon': iconImage, 'title': 'Все Возможно', 'file': '../../../../../../../Test/Music/RADIO/Все возможно.mp3'},
  {'icon': iconImage, 'title': 'Высоко', 'file': '../../../../../../../Test/Music/RADIO/Высоко.mp3'},
  {'icon': iconImage, 'title': 'Выхода Нет', 'file': '../../../../../../../Test/Music/RADIO/Сплин/Выхода нет.mp3'},
  {'icon': iconImage, 'title': 'Генералы Песчаных Карьеров', 'file': '../../../../../../../Test/Music/RADIO/Генералы песчаных карьеров.mp3'},
  {'icon': iconImage, 'title': 'Глаза', 'file': '../../../../../../../Test/Music/RADIO/Глаза.mp3'},
  {'icon': iconImage, 'title': 'Городок', 'file': '../../../../../../../Test/Music/RADIO/Городок.mp3'},
  {'icon': iconImage, 'title': 'Девочка С Севера', 'file': '../../../../../../../Test/Music/RADIO/Девочка с севера.mp3'},
  {'icon': iconImage, 'title': 'Девушки Как Звёзды', 'file': '../../../../../../../Test/Music/RADIO/Девушки как звёзды.mp3'},
  {'icon': iconImage, 'title': 'Дедушка По Городу', 'file': '../../../../../../../Test/Music/RADIO/Дедушка по городу.mp3'},
  {'icon': iconImage, 'title': 'Дожди', 'file': '../../../../../../../Test/Music/RADIO/Дожди.mp3'},
  {'icon': iconImage, 'title': 'Дождик', 'file': '../../../../../../../Test/Music/RADIO/Дождик.mp3'},
  {'icon': iconImage, 'title': 'Дождь По Крыше', 'file': '../../../../../../../Test/Music/RADIO/Дождь по крыше.mp3'},
  {'icon': iconImage, 'title': 'Дрессировщик', 'file': '../../../../../../../Test/Music/RADIO/Дрессировщик.MP3'},
  {'icon': iconImage, 'title': 'Зачем Топтать Мою Любовь', 'file': '../../../../../../../Test/Music/RADIO/Зачем топтать мою любовь.mp3'},
  {'icon': iconImage, 'title': 'Зеленоглазое Такси', 'file': '../../../../../../../Test/Music/RADIO/Зеленоглазое Такси.mp3'},
  {'icon': iconImage, 'title': 'Зимний Сад', 'file': '../../../../../../../Test/Music/RADIO/Зимний сад.mp3'},
  {'icon': iconImage, 'title': 'Зимний Сон', 'file': '../../../../../../../Test/Music/RADIO/Зимний сон.mp3'},
  {'icon': iconImage, 'title': 'Иду Курю', 'file': '../../../../../../../Test/Music/RADIO/Иду, курю.mp3'},
  {'icon': iconImage, 'title': 'Иерусалим', 'file': '../../../../../../../Test/Music/RADIO/Иерусалим.mp3'},
  {'icon': iconImage, 'title': 'Из Вагантов', 'file': '../../../../../../../Test/Music/RADIO/Из Вагантов.mp3'},
  {'icon': iconImage, 'title': 'Кавачай', 'file': '../../../../../../../Test/Music/RADIO/Кавачай.mp3'},
  {'icon': iconImage, 'title': 'Каждый День', 'file': '../../../../../../../Test/Music/RADIO/Каждый день.mp3'},
  {'icon': iconImage, 'title': 'Лето', 'file': '../../../../../../../Test/Music/RADIO/Лето.mp3'},
  {'icon': iconImage, 'title': 'Линия Жизни', 'file': '../../../../../../../Test/Music/RADIO/Сплин/2001 - 25-й кадр/Линия жизни.mp3'},
  {'icon': iconImage, 'title': 'Листай Эфир', 'file': '../../../../../../../Test/Music/RADIO/Листай эфир.mp3'},
  {'icon': iconImage, 'title': 'Люблю', 'file': '../../../../../../../Test/Music/RADIO/Люблю.mp3'},
  {'icon': iconImage, 'title': 'Макдональдс', 'file': '../../../../../../../Test/Music/RADIO/Макдональдс .mp3'},
  {'icon': iconImage, 'title': 'Мне Бы В Небо', 'file': '../../../../../../../Test/Music/RADIO/Мне Бы В Небо.mp3'},
  {'icon': iconImage, 'title': 'Мне Мама Тихо Говорила', 'file': '../../../../../../../Test/Music/RADIO/Мне мама тихо говорила.mp3'},
  {'icon': iconImage, 'title': 'Мое Сердце', 'file': '../../../../../../../Test/Music/RADIO/Сплин/2001 - 25-й кадр/Мое сердце.mp3'},
  {'icon': iconImage, 'title': 'Москва', 'file': '../../../../../../../Test/Music/RADIO/Москва.mp3'},
  {'icon': iconImage, 'title': 'Моя Любовь', 'file': '../../../../../../../Test/Music/RADIO/Моя любовь.mp3'},
  {'icon': iconImage, 'title': 'Мурка', 'file': '../../../../../../../Test/Music/RADIO/Мурка.mp3'},
  {'icon': iconImage, 'title': 'Мусорный Ветер', 'file': '../../../../../../../Test/Music/RADIO/Мусорный ветер.WAV'},
  {'icon': iconImage, 'title': 'Над Гудзоном', 'file': '../../../../../../../Test/Music/RADIO/Над Гудзоном.mp3'},
  {'icon': iconImage, 'title': 'Наши Детские Смешные Голоса', 'file': '../../../../../../../Test/Music/RADIO/Наши детские смешные голоса.mp3'},
  {'icon': iconImage, 'title': 'Не Дано', 'file': '../../../../../../../Test/Music/RADIO/Hi-Fi/Не дано.mp3'},
  {'icon': iconImage, 'title': 'Небо', 'file': '../../../../../../../Test/Music/RADIO/Небо.mp3'},
  {'icon': iconImage, 'title': 'Небыло Печали', 'file': '../../../../../../../Test/Music/RADIO/Небыло печали.mp3'},
  {'icon': iconImage, 'title': 'Но Я Играю Эту Роль', 'file': '../../../../../../../Test/Music/RADIO/Но я играю эту роль.mp3'},
  {'icon': iconImage, 'title': 'О Любви', 'file': '../../../../../../../Test/Music/RADIO/О любви.mp3'},
  {'icon': iconImage, 'title': 'Океан И Три Реки', 'file': '../../../../../../../Test/Music/RADIO/Океан и три реки.mp3'},
  {'icon': iconImage, 'title': 'Орбит Без Сахара', 'file': '../../../../../../../Test/Music/RADIO/Сплин/1998 - Гранатовый альбом/Орбит без сахара.mp3'},
  {'icon': iconImage, 'title': 'Первый Снег', 'file': '../../../../../../../Test/Music/RADIO/Первый снег.mp3'},
  {'icon': iconImage, 'title': 'Печаль Моя', 'file': '../../../../../../../Test/Music/RADIO/Печаль Моя.mp3'},
  {'icon': iconImage, 'title': 'Плакала Береза', 'file': '../../../../../../../Test/Music/RADIO/Плакала береза.mp3'},
  {'icon': iconImage, 'title': 'Плот', 'file': '../../../../../../../Test/Music/RADIO/Плот.mp3'},
  {'icon': iconImage, 'title': 'Попытка №5', 'file': '../../../../../../../Test/Music/RADIO/Попытка №5.mp3'},
  {'icon': iconImage, 'title': 'Пора Домой', 'file': '../../../../../../../Test/Music/RADIO/Пора Домой.mp3'},
  {'icon': iconImage, 'title': 'Розовые Розы', 'file': '../../../../../../../Test/Music/RADIO/Розовые розы.mp3'},
  {'icon': iconImage, 'title': 'Седьмой Лепесток', 'file': '../../../../../../../Test/Music/RADIO/Hi-Fi/Седьмой лепесток.mp3'},
  {'icon': iconImage, 'title': 'Спасибо За День Спасибо За Ночь', 'file': '../../../../../../../Test/Music/RADIO/Спасибо за день, спасибо за ночь.mp3'},
  {'icon': iconImage, 'title': 'Там Де Нас Нема', 'file': '../../../../../../../Test/Music/RADIO/Там де нас нема.mp3'},
  {'icon': iconImage, 'title': 'Товарищ Сержант', 'file': '../../../../../../../Test/Music/RADIO/Товарищ Сержант.mp3'},
  {'icon': iconImage, 'title': 'Три Полоски', 'file': '../../../../../../../Test/Music/RADIO/Три полоски.mp3'},
  {'icon': iconImage, 'title': 'Тулула', 'file': '../../../../../../../Test/Music/RADIO/ТуЛуЛа.mp3'},
  {'icon': iconImage, 'title': 'Уходишь', 'file': '../../../../../../../Test/Music/RADIO/Уходишь.mp3'},
  {'icon': iconImage, 'title': 'Хали Гали', 'file': '../../../../../../../Test/Music/RADIO/Хали-гали.mp3'},
  {'icon': iconImage, 'title': 'Хоп Хэй', 'file': '../../../../../../../Test/Music/RADIO/Хоп хэй.mp3'},
  {'icon': iconImage, 'title': 'Часики', 'file': '../../../../../../../Test/Music/RADIO/Часики.MP3'},
  {'icon': iconImage, 'title': 'Шоссэ', 'file': '../../../../../../../Test/Music/RADIO/Шоссэ.mp3'},
  {'icon': iconImage, 'title': 'Я За Тебя Умру', 'file': '../../../../../../../Test/Music/RADIO/Я за тебя умру.mp3'},
  {'icon': iconImage, 'title': 'Я Люблю', 'file': '../../../../../../../Test/Music/RADIO/Hi-Fi/Я люблю.mp3'},
  {'icon': iconImage, 'title': 'Я Не Болею Тобой', 'file': '../../../../../../../Test/Music/RADIO/Я не болею тобой.mp3'},
  {'icon': iconImage, 'title': 'Я Покину Родные Края', 'file': '../../../../../../../Test/Music/RADIO/Я покину родные края.mp3'},
  {'icon': iconImage, 'title': 'Яды', 'file': '../../../../../../../Test/Music/RADIO/Яды.mp3'},
]);
})

document.getElementById('radioпомойка').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '007 Live', 'file': '../../../../../../../Test/Music/RADIO Помойка/007 Live.mp3'},
  {'icon': iconImage, 'title': '01 Za Milih Dam', 'file': '../../../../../../../Test/Music/RADIO Помойка/Михаил Шуфутинский/1997 - Za milih dam!/01_Za milih dam.mp3'},
  {'icon': iconImage, 'title': '02 Medsestrichka', 'file': '../../../../../../../Test/Music/RADIO Помойка/Михаил Шуфутинский/2003 - Bum-bum/02_medsestrichka.mp3'},
  {'icon': iconImage, 'title': '04 Palma De Mayorka', 'file': '../../../../../../../Test/Music/RADIO Помойка/Михаил Шуфутинский/1998 - Odnajdi v Amerike/04_Palma de mayorka.mp3'},
  {'icon': iconImage, 'title': '05 Counting Crows Colorblind', 'file': '../../../../../../../Test/Music/RADIO Помойка/05 - Counting Crows - Colorblind.mp3'},
  {'icon': iconImage, 'title': '06 Kashmir', 'file': '../../../../../../../Test/Music/RADIO Помойка/Led Zeppelin/Physical Graffiti (1975)/06 - Kashmir.mp3'},
  {'icon': iconImage, 'title': '07 Leviy Bereg Dona', 'file': '../../../../../../../Test/Music/RADIO Помойка/Михаил Шуфутинский/2002 - Svechi/07_leviy_bereg_dona.mp3'},
  {'icon': iconImage, 'title': '07 Staroe Kafe', 'file': '../../../../../../../Test/Music/RADIO Помойка/Михаил Шуфутинский/1989 - Ti u menia edinstvennaia/07_staroe_kafe.mp3'},
  {'icon': iconImage, 'title': '10 Dorogoy Dlinnoyu', 'file': '../../../../../../../Test/Music/RADIO Помойка/Михаил Шуфутинский/1989 - Podmoskovnie vechera/10_Dorogoy dlinnoyu.mp3'},
  {'icon': iconImage, 'title': '16 Gop Stop', 'file': '../../../../../../../Test/Music/RADIO Помойка/Михаил Шуфутинский/1994 - Spasibo, Sasha rozembaum/16_Gop-stop.mp3'},
  {'icon': iconImage, 'title': '18 Dusha Bolit', 'file': '../../../../../../../Test/Music/RADIO Помойка/Михаил Шуфутинский/2002 - Nalivai, pogovorim/18_dusha_bolit.mp3'},
  {'icon': iconImage, 'title': '2 Become 1', 'file': '../../../../../../../Test/Music/RADIO Помойка/2 become 1.mp3'},
  {'icon': iconImage, 'title': '4000 Rainy Nights', 'file': '../../../../../../../Test/Music/RADIO Помойка/4000 Rainy Nights.mp3'},
  {'icon': iconImage, 'title': 'Again', 'file': '../../../../../../../Test/Music/RADIO Помойка/Again.mp3'},
  {'icon': iconImage, 'title': 'All That The Wants', 'file': '../../../../../../../Test/Music/RADIO Помойка/All That The Wants.MP3'},
  {'icon': iconImage, 'title': 'All The Small Things', 'file': '../../../../../../../Test/Music/RADIO Помойка/All The Small Things.mp3'},
  {'icon': iconImage, 'title': 'American Boy', 'file': '../../../../../../../Test/Music/RADIO Помойка/American boy.mp3'},
  {'icon': iconImage, 'title': 'And I Think Of You', 'file': '../../../../../../../Test/Music/RADIO Помойка/And I Think Of You.mp3'},
  {'icon': iconImage, 'title': 'Angels Crying', 'file': '../../../../../../../Test/Music/RADIO Помойка/Angels Crying.mp3'},
  {'icon': iconImage, 'title': 'Anthem', 'file': '../../../../../../../Test/Music/RADIO Помойка/Anthem.mp3'},
  {'icon': iconImage, 'title': 'Bad Blood', 'file': '../../../../../../../Test/Music/RADIO Помойка/Bad Blood.MP3'},
  {'icon': iconImage, 'title': 'Bailamos', 'file': '../../../../../../../Test/Music/RADIO Помойка/Bailamos.mp3'},
  {'icon': iconImage, 'title': 'Banca Banca', 'file': '../../../../../../../Test/Music/RADIO Помойка/Banca Banca.mp3'},
  {'icon': iconImage, 'title': 'Beautifullife', 'file': '../../../../../../../Test/Music/RADIO Помойка/BeautifulLife.mp3'},
  {'icon': iconImage, 'title': 'Between Angels & Insects', 'file': '../../../../../../../Test/Music/RADIO Помойка/Between Angels & Insects.mp3'},
  {'icon': iconImage, 'title': 'Big In Japan', 'file': '../../../../../../../Test/Music/RADIO Помойка/Big In Japan.mp3'},
  {'icon': iconImage, 'title': 'Breathe Me', 'file': '../../../../../../../Test/Music/RADIO Помойка/Breathe Me.mp3'},
  {'icon': iconImage, 'title': 'Broken Days', 'file': '../../../../../../../Test/Music/RADIO Помойка/Broken days.mp3'},
  {'icon': iconImage, 'title': 'Cant Fight The Moonlight', 'file': '../../../../../../../Test/Music/RADIO Помойка/Cant Fight the Moonlight.MP3'},
  {'icon': iconImage, 'title': 'Cant Get You Out Of My Head', 'file': '../../../../../../../Test/Music/RADIO Помойка/Can%27t Get You Out Of My Head.mp3'},
  {'icon': iconImage, 'title': 'Children Of The Damned', 'file': '../../../../../../../Test/Music/RADIO Помойка/IRON MAIDEN/1982 - The Number of the Beast/Children of the Damned.mp3'},
  {'icon': iconImage, 'title': 'Chrismasse', 'file': '../../../../../../../Test/Music/RADIO Помойка/Chrismasse.mp3'},
  {'icon': iconImage, 'title': 'Circle', 'file': '../../../../../../../Test/Music/RADIO Помойка/Circle.mp3'},
  {'icon': iconImage, 'title': 'Crush', 'file': '../../../../../../../Test/Music/RADIO Помойка/Crush.mp3'},
  {'icon': iconImage, 'title': 'Dancando Lambada', 'file': '../../../../../../../Test/Music/RADIO Помойка/Dancando Lambada.mp3'},
  {'icon': iconImage, 'title': 'Dangerous Myzuka', 'file': '../../../../../../../Test/Music/RADIO Помойка/Dangerous myzuka.mp3'},
  {'icon': iconImage, 'title': 'Disae', 'file': '../../../../../../../Test/Music/RADIO Помойка/Disae.mp3'},
  {'icon': iconImage, 'title': 'Dont Let Me Get Me', 'file': '../../../../../../../Test/Music/RADIO Помойка/Don%27t Let Me Get Me.mp3'},
  {'icon': iconImage, 'title': 'Dont Stop The Music', 'file': '../../../../../../../Test/Music/RADIO Помойка/Don%27t Stop The Music.mp3'},
  {'icon': iconImage, 'title': 'Dont Turn Around', 'file': '../../../../../../../Test/Music/RADIO Помойка/Dont Turn Around.mp3'},
  {'icon': iconImage, 'title': 'Double Bass', 'file': '../../../../../../../Test/Music/RADIO Помойка/Double Bass.mp3'},
  {'icon': iconImage, 'title': 'Dr Alban Its My Life', 'file': '../../../../../../../Test/Music/RADIO Помойка/Dr Alban - It%27s my life.mp3'},
  {'icon': iconImage, 'title': 'Drowning', 'file': '../../../../../../../Test/Music/RADIO Помойка/Drowning.mp3'},
  {'icon': iconImage, 'title': 'Easy', 'file': '../../../../../../../Test/Music/RADIO Помойка/Easy.mp3'},
  {'icon': iconImage, 'title': 'Eternal Flame', 'file': '../../../../../../../Test/Music/RADIO Помойка/Eternal Flame.mp4'},
  {'icon': iconImage, 'title': 'Eternal Flamme', 'file': '../../../../../../../Test/Music/RADIO Помойка/Eternal Flamme.mp3'},
  {'icon': iconImage, 'title': 'Every Time', 'file': '../../../../../../../Test/Music/RADIO Помойка/Every time.mp3'},
  {'icon': iconImage, 'title': 'Everything Burns', 'file': '../../../../../../../Test/Music/RADIO Помойка/Anastacia/2005 - Pieces Of A Dream/Everything Burns.mp3'},
  {'icon': iconImage, 'title': 'Ex Girlfriend', 'file': '../../../../../../../Test/Music/RADIO Помойка/Ex-Girlfriend.mp3'},
  {'icon': iconImage, 'title': 'Fable', 'file': '../../../../../../../Test/Music/RADIO Помойка/Fable.mp3'},
  {'icon': iconImage, 'title': 'Fight', 'file': '../../../../../../../Test/Music/RADIO Помойка/Fight.mp3'},
  {'icon': iconImage, 'title': 'Forever Sleep', 'file': '../../../../../../../Test/Music/RADIO Помойка/Forever Sleep.mp3'},
  {'icon': iconImage, 'title': 'Fragile', 'file': '../../../../../../../Test/Music/RADIO Помойка/Fragile.mp3'},
  {'icon': iconImage, 'title': 'Ghostbusters', 'file': '../../../../../../../Test/Music/RADIO Помойка/Ghostbusters.mp3'},
  {'icon': iconImage, 'title': 'Girl Youll Be A Woman Soon', 'file': '../../../../../../../Test/Music/RADIO Помойка/Girl You%27ll Be A Woman Soon.mp3'},
  {'icon': iconImage, 'title': 'Give Into Me', 'file': '../../../../../../../Test/Music/RADIO Помойка/Give Into Me.mp3'},
  {'icon': iconImage, 'title': 'Gunsnroses Dont Cry', 'file': '../../../../../../../Test/Music/RADIO Помойка/Guns%27N%27Roses - Don%27t cry.mp3'},
  {'icon': iconImage, 'title': 'Hampsterdance Song', 'file': '../../../../../../../Test/Music/RADIO Помойка/Hampsterdance Song.mp3'},
  {'icon': iconImage, 'title': 'Heavy On My Heart', 'file': '../../../../../../../Test/Music/RADIO Помойка/Anastacia/2004 - Anastacia/Heavy On My Heart.mp3'},
  {'icon': iconImage, 'title': 'Hero', 'file': '../../../../../../../Test/Music/RADIO Помойка/Hero.MP3'},
  {'icon': iconImage, 'title': 'Hold Me For A While', 'file': '../../../../../../../Test/Music/RADIO Помойка/Hold Me For A While.mp3'},
  {'icon': iconImage, 'title': 'Hold On Tight', 'file': '../../../../../../../Test/Music/RADIO Помойка/Hold On Tight.mp3'},
  {'icon': iconImage, 'title': 'Hotel California', 'file': '../../../../../../../Test/Music/RADIO Помойка/Hotel California.mp3'},
  {'icon': iconImage, 'title': 'House Of He Rising Sun', 'file': '../../../../../../../Test/Music/RADIO Помойка/House Of He Rising Sun.mp3'},
  {'icon': iconImage, 'title': 'How Deep Is Your Love', 'file': '../../../../../../../Test/Music/RADIO Помойка/How Deep Is Your Love.MP3'},
  {'icon': iconImage, 'title': 'I Hate This Fucking World', 'file': '../../../../../../../Test/Music/RADIO Помойка/I Hate This Fucking World.mp3'},
  {'icon': iconImage, 'title': 'I Like Chopin', 'file': '../../../../../../../Test/Music/RADIO Помойка/I like chopin.mp3'},
  {'icon': iconImage, 'title': 'I Love Rock N Roll', 'file': '../../../../../../../Test/Music/RADIO Помойка/I Love Rock-n-Roll.MP3'},
  {'icon': iconImage, 'title': 'I Put A Spell On You', 'file': '../../../../../../../Test/Music/RADIO Помойка/I Put a Spell on You.MP3'},
  {'icon': iconImage, 'title': 'I Want It That Way', 'file': '../../../../../../../Test/Music/RADIO Помойка/I Want it That Way.mp3'},
  {'icon': iconImage, 'title': 'I Was Made For Lovin You', 'file': '../../../../../../../Test/Music/RADIO Помойка/I Was Made For Lovin You.mp3'},
  {'icon': iconImage, 'title': 'Id Love You To Want Me', 'file': '../../../../../../../Test/Music/RADIO Помойка/I%27d Love You to Want Me.mp3'},
  {'icon': iconImage, 'title': 'Israel', 'file': '../../../../../../../Test/Music/RADIO Помойка/Israel.mp3'},
  {'icon': iconImage, 'title': 'Jesus To A Child', 'file': '../../../../../../../Test/Music/RADIO Помойка/Jesus to a child.mp3'},
  {'icon': iconImage, 'title': 'Jingle Bells', 'file': '../../../../../../../Test/Music/RADIO Помойка/Jingle Bells.mp3'},
  {'icon': iconImage, 'title': 'Johnny Be Good', 'file': '../../../../../../../Test/Music/RADIO Помойка/Johnny Be Good.mp3'},
  {'icon': iconImage, 'title': 'Just Like A Pill', 'file': '../../../../../../../Test/Music/RADIO Помойка/Just Like A Pill.mp3'},
  {'icon': iconImage, 'title': 'Kashmir', 'file': '../../../../../../../Test/Music/RADIO Помойка/Kashmir.mp3'},
  {'icon': iconImage, 'title': 'Knockin On Heavens Door', 'file': '../../../../../../../Test/Music/RADIO Помойка/Knockin On Heavens Door.mp3'},
  {'icon': iconImage, 'title': 'Knocking On Heavens Door M', 'file': '../../../../../../../Test/Music/RADIO Помойка/Knocking On Heavens Door+M.mp3'},
  {'icon': iconImage, 'title': 'La La La', 'file': '../../../../../../../Test/Music/RADIO Помойка/La La La.mp3'},
  {'icon': iconImage, 'title': 'Lady In Red', 'file': '../../../../../../../Test/Music/RADIO Помойка/Lady in red.mp3'},
  {'icon': iconImage, 'title': 'Left Outside Alone', 'file': '../../../../../../../Test/Music/RADIO Помойка/Anastacia/2004 - Anastacia/Left Outside Alone.mp3'},
  {'icon': iconImage, 'title': 'Listen Up', 'file': '../../../../../../../Test/Music/RADIO Помойка/Listen Up.mp3'},
  {'icon': iconImage, 'title': 'Losing My Religion', 'file': '../../../../../../../Test/Music/RADIO Помойка/Losing My Religion.mp3'},
  {'icon': iconImage, 'title': 'Love Dont Cost A Thing', 'file': '../../../../../../../Test/Music/RADIO Помойка/Love dont Cost a Thing.MP3'},
  {'icon': iconImage, 'title': 'Love Hurts', 'file': '../../../../../../../Test/Music/RADIO Помойка/Love Hurts.mp3'},
  {'icon': iconImage, 'title': 'Lovers On The Sun Feat Sam Martin', 'file': '../../../../../../../Test/Music/RADIO Помойка/Lovers on the sun feat sam martin.mp3'},
  {'icon': iconImage, 'title': 'Madonna', 'file': '../../../../../../../Test/Music/RADIO Помойка/Madonna.mp3'},
  {'icon': iconImage, 'title': 'Memory', 'file': '../../../../../../../Test/Music/RADIO Помойка/Memory.mp3'},
  {'icon': iconImage, 'title': 'Message Home', 'file': '../../../../../../../Test/Music/RADIO Помойка/Message Home.mp3'},
  {'icon': iconImage, 'title': 'Midnight Danser', 'file': '../../../../../../../Test/Music/RADIO Помойка/Midnight Danser.mp3'},
  {'icon': iconImage, 'title': 'My Fathers Sоn', 'file': '../../../../../../../Test/Music/RADIO Помойка/My Father%27s Sоn.mp3'},
  {'icon': iconImage, 'title': 'My Favourite Game', 'file': '../../../../../../../Test/Music/RADIO Помойка/My Favourite Game.mp3'},
  {'icon': iconImage, 'title': 'My Happy Ending', 'file': '../../../../../../../Test/Music/RADIO Помойка/My Happy Ending.mp3'},
  {'icon': iconImage, 'title': 'My Heart', 'file': '../../../../../../../Test/Music/RADIO Помойка/My Heart.mp3'},
  {'icon': iconImage, 'title': 'Nathalie', 'file': '../../../../../../../Test/Music/RADIO Помойка/Nathalie.mp3'},
  {'icon': iconImage, 'title': 'Never Be The Same Again', 'file': '../../../../../../../Test/Music/RADIO Помойка/Never be the same again.mp3'},
  {'icon': iconImage, 'title': 'No Fear', 'file': '../../../../../../../Test/Music/RADIO Помойка/No Fear.mp3'},
  {'icon': iconImage, 'title': 'Nostalgie', 'file': '../../../../../../../Test/Music/RADIO Помойка/Nostalgie.mp3'},
  {'icon': iconImage, 'title': 'One Day In Your Life', 'file': '../../../../../../../Test/Music/RADIO Помойка/Anastacia/2002 - One Day In Your Life/One Day In Your Life.mp3'},
  {'icon': iconImage, 'title': 'One Of Us', 'file': '../../../../../../../Test/Music/RADIO Помойка/ONE OF US.mp3'},
  {'icon': iconImage, 'title': 'One Wild Night', 'file': '../../../../../../../Test/Music/RADIO Помойка/One Wild Night.MP3'},
  {'icon': iconImage, 'title': 'Only You', 'file': '../../../../../../../Test/Music/RADIO Помойка/Only You.mp3'},
  {'icon': iconImage, 'title': 'Out Of The Dark', 'file': '../../../../../../../Test/Music/RADIO Помойка/Out Of The Dark.mp3'},
  {'icon': iconImage, 'title': 'Paradise', 'file': '../../../../../../../Test/Music/RADIO Помойка/Paradise.mp3'},
  {'icon': iconImage, 'title': 'Party Up', 'file': '../../../../../../../Test/Music/RADIO Помойка/Party Up.mp3'},
  {'icon': iconImage, 'title': 'Password', 'file': '../../../../../../../Test/Music/RADIO Помойка/Password.mp3'},
  {'icon': iconImage, 'title': 'Paul Van Dyk Feat Hemstock & Jennings Nothing But You (pvd Radio Mix)', 'file': '../../../../../../../Test/Music/RADIO Помойка/Paul Van Dyk feat.Hemstock & Jennings-Nothing But You (PVD Radio Mix).mp3'},
  {'icon': iconImage, 'title': 'Please Forgive Me', 'file': '../../../../../../../Test/Music/RADIO Помойка/Please Forgive Me.mp3'},
  {'icon': iconImage, 'title': 'Promises', 'file': '../../../../../../../Test/Music/RADIO Помойка/Promises.mp3'},
  {'icon': iconImage, 'title': 'Prowler', 'file': '../../../../../../../Test/Music/RADIO Помойка/IRON MAIDEN/1980 - Iron Maiden/Prowler.mp3'},
  {'icon': iconImage, 'title': 'Raise The Hammer', 'file': '../../../../../../../Test/Music/RADIO Помойка/Raise the hammer.mp3'},
  {'icon': iconImage, 'title': 'Rape Me', 'file': '../../../../../../../Test/Music/RADIO Помойка/Rape me.MP3'},
  {'icon': iconImage, 'title': 'Rise And Fall', 'file': '../../../../../../../Test/Music/RADIO Помойка/Rise And Fall.mp3'},
  {'icon': iconImage, 'title': 'Road Trippin', 'file': '../../../../../../../Test/Music/RADIO Помойка/Road Trippin%27.mp3'},
  {'icon': iconImage, 'title': 'Rock The Hell Outta You', 'file': '../../../../../../../Test/Music/RADIO Помойка/Rock the Hell Outta You.mp3'},
  {'icon': iconImage, 'title': 'Round Round', 'file': '../../../../../../../Test/Music/RADIO Помойка/Round Round.mp3'},
  {'icon': iconImage, 'title': 'Samba', 'file': '../../../../../../../Test/Music/RADIO Помойка/Samba.mp3'},
  {'icon': iconImage, 'title': 'Save Your Kisses For Me', 'file': '../../../../../../../Test/Music/RADIO Помойка/Save Your Kisses for Me.mp3'},
  {'icon': iconImage, 'title': 'Sick & Tired', 'file': '../../../../../../../Test/Music/RADIO Помойка/Anastacia/2004 - Anastacia/Sick & Tired.mp3'},
  {'icon': iconImage, 'title': 'Sk8er Boi', 'file': '../../../../../../../Test/Music/RADIO Помойка/Sk8er Boi.mp3'},
  {'icon': iconImage, 'title': 'Skin On Skin', 'file': '../../../../../../../Test/Music/RADIO Помойка/Skin On Skin.mp3'},
  {'icon': iconImage, 'title': 'Smajl', 'file': '../../../../../../../Test/Music/RADIO Помойка/Smajl.mp3'},
  {'icon': iconImage, 'title': 'Smells Like Teen Spirit', 'file': '../../../../../../../Test/Music/RADIO Помойка/Smells Like Teen Spirit.mp3'},
  {'icon': iconImage, 'title': 'Smoke On The Water', 'file': '../../../../../../../Test/Music/RADIO Помойка/Smoke on the water.mp3'},
  {'icon': iconImage, 'title': 'Somewhere In The World', 'file': '../../../../../../../Test/Music/RADIO Помойка/SOMEWHERE IN THE WORLD.mp3'},
  {'icon': iconImage, 'title': 'Stop', 'file': '../../../../../../../Test/Music/RADIO Помойка/Stop.mp3'},
  {'icon': iconImage, 'title': 'Summer Son', 'file': '../../../../../../../Test/Music/RADIO Помойка/Summer Son.mp3'},
  {'icon': iconImage, 'title': 'Sun Shaine', 'file': '../../../../../../../Test/Music/RADIO Помойка/Sun Shaine.MP3'},
  {'icon': iconImage, 'title': 'Sunny', 'file': '../../../../../../../Test/Music/RADIO Помойка/Sunny.mp3'},
  {'icon': iconImage, 'title': 'Sweet Dreams', 'file': '../../../../../../../Test/Music/RADIO Помойка/Sweet Dreams.mp3'},
  {'icon': iconImage, 'title': 'The Ketchup Song', 'file': '../../../../../../../Test/Music/RADIO Помойка/The Ketchup Song.mp3'},
  {'icon': iconImage, 'title': 'The Only', 'file': '../../../../../../../Test/Music/RADIO Помойка/The Only.mp3'},
  {'icon': iconImage, 'title': 'The Sweetest Surrender', 'file': '../../../../../../../Test/Music/RADIO Помойка/The Sweetest Surrender.mp3'},
  {'icon': iconImage, 'title': 'This Love', 'file': '../../../../../../../Test/Music/RADIO Помойка/This love.mp3'},
  {'icon': iconImage, 'title': 'Those Were The Days', 'file': '../../../../../../../Test/Music/RADIO Помойка/Those Were The Days.mp3'},
  {'icon': iconImage, 'title': 'Those Where The Days', 'file': '../../../../../../../Test/Music/RADIO Помойка/Those Where The Days.mp3'},
  {'icon': iconImage, 'title': 'Tissue', 'file': '../../../../../../../Test/Music/RADIO Помойка/Tissue.mp3'},
  {'icon': iconImage, 'title': 'Tm Joy You Are The One', 'file': '../../../../../../../Test/Music/RADIO Помойка/TM-Joy - You Are The One.mp3'},
  {'icon': iconImage, 'title': 'Tonight', 'file': '../../../../../../../Test/Music/RADIO Помойка/Tonight.mp3'},
  {'icon': iconImage, 'title': 'Train Drive By', 'file': '../../../../../../../Test/Music/RADIO Помойка/Train - Drive By.mp3'},
  {'icon': iconImage, 'title': 'Twisted Nerve', 'file': '../../../../../../../Test/Music/RADIO Помойка/Twisted Nerve.mp3'},
  {'icon': iconImage, 'title': 'U Stay With Melina Ill Survive', 'file': '../../../../../../../Test/Music/RADIO Помойка/U-Stay_With_Melina_-_Ill_Survive.mp3'},
  {'icon': iconImage, 'title': 'Uebers Ende Der Welt', 'file': '../../../../../../../Test/Music/RADIO Помойка/Uebers ende der welt.mp3'},
  {'icon': iconImage, 'title': 'Unbreak My Heart', 'file': '../../../../../../../Test/Music/RADIO Помойка/UnBreak my Heart.mp3'},
  {'icon': iconImage, 'title': 'Venus', 'file': '../../../../../../../Test/Music/RADIO Помойка/Venus.mp3'},
  {'icon': iconImage, 'title': 'Viva Forever', 'file': '../../../../../../../Test/Music/RADIO Помойка/Viva Forever.mp3'},
  {'icon': iconImage, 'title': 'Viva Las Vegas', 'file': '../../../../../../../Test/Music/RADIO Помойка/Viva las vegas.mp3'},
  {'icon': iconImage, 'title': 'Voyage', 'file': '../../../../../../../Test/Music/RADIO Помойка/Voyage.mp3'},
  {'icon': iconImage, 'title': 'Wasted Years', 'file': '../../../../../../../Test/Music/RADIO Помойка/IRON MAIDEN/1986 - Somewhere in Time/Wasted Years.mp3'},
  {'icon': iconImage, 'title': 'Wasting Love', 'file': '../../../../../../../Test/Music/RADIO Помойка/IRON MAIDEN/1992 - Fear of the Dark/Wasting Love.mp3'},
  {'icon': iconImage, 'title': 'Welcome To Paradise', 'file': '../../../../../../../Test/Music/RADIO Помойка/Welcome to Paradise.mp3'},
  {'icon': iconImage, 'title': 'What A Wonderfull World', 'file': '../../../../../../../Test/Music/RADIO Помойка/What a wonderfull world.mp3'},
  {'icon': iconImage, 'title': 'When You Tell Me That You Love Me', 'file': '../../../../../../../Test/Music/RADIO Помойка/When You Tell Me that You Love Me.mp3'},
  {'icon': iconImage, 'title': 'Wild Wild Web', 'file': '../../../../../../../Test/Music/RADIO Помойка/Wild Wild Web.mp3'},
  {'icon': iconImage, 'title': 'Wind World', 'file': '../../../../../../../Test/Music/RADIO Помойка/Wind World.mp3'},
  {'icon': iconImage, 'title': 'Woman In Love', 'file': '../../../../../../../Test/Music/RADIO Помойка/Woman in love.mp3'},
  {'icon': iconImage, 'title': 'You', 'file': '../../../../../../../Test/Music/RADIO Помойка/You.mp3'},
  {'icon': iconImage, 'title': 'You Can Leave Your Hat On', 'file': '../../../../../../../Test/Music/RADIO Помойка/You Can Leave Your Hat On.mp3'},
  {'icon': iconImage, 'title': 'You Meet Love', 'file': '../../../../../../../Test/Music/RADIO Помойка/You meet love.mp3'},
  {'icon': iconImage, 'title': 'Youll Never Meet An Angel', 'file': '../../../../../../../Test/Music/RADIO Помойка/You%27ll Never Meet An Angel.mp3'},
  {'icon': iconImage, 'title': 'Youre A Woman', 'file': '../../../../../../../Test/Music/RADIO Помойка/You%27re a woman.mp3'},
  {'icon': iconImage, 'title': 'А Не Спеть Ли Мне Песню', 'file': '../../../../../../../Test/Music/RADIO Помойка/А не спеть ли мне песню.mp3'},
  {'icon': iconImage, 'title': 'Аlamedoves', 'file': '../../../../../../../Test/Music/RADIO Помойка/Аlamedoves.mp3'},
  {'icon': iconImage, 'title': 'Автомобиль', 'file': '../../../../../../../Test/Music/RADIO Помойка/Автомобиль.mp3'},
  {'icon': iconImage, 'title': 'Амулет', 'file': '../../../../../../../Test/Music/RADIO Помойка/Белая гвардия/Амулет.mp3'},
  {'icon': iconImage, 'title': 'Аэропорт', 'file': '../../../../../../../Test/Music/RADIO Помойка/Аэропорт.WAV'},
  {'icon': iconImage, 'title': 'Батарейка', 'file': '../../../../../../../Test/Music/RADIO Помойка/Батарейка.mp3'},
  {'icon': iconImage, 'title': 'Без Тебя', 'file': '../../../../../../../Test/Music/RADIO Помойка/Без тебя.mp3'},
  {'icon': iconImage, 'title': 'Белая Гвардия', 'file': '../../../../../../../Test/Music/RADIO Помойка/Белая гвардия/Белая гвардия.mp3'},
  {'icon': iconImage, 'title': 'Боби Боба', 'file': '../../../../../../../Test/Music/RADIO Помойка/Боби-боба.mp3'},
  {'icon': iconImage, 'title': 'Боже Какой Пустяк', 'file': '../../../../../../../Test/Music/RADIO Помойка/Трофим/Боже какой пустяк.mp3'},
  {'icon': iconImage, 'title': 'Братишка', 'file': '../../../../../../../Test/Music/RADIO Помойка/Братишка.mp3'},
  {'icon': iconImage, 'title': 'В Жарких Странах', 'file': '../../../../../../../Test/Music/RADIO Помойка/В жарких странах.mp3'},
  {'icon': iconImage, 'title': 'Ветер В Голове', 'file': '../../../../../../../Test/Music/RADIO Помойка/Трофим/Ветер в голове.mp3'},
  {'icon': iconImage, 'title': 'Вечная Молодость', 'file': '../../../../../../../Test/Music/RADIO Помойка/Чиж/1993 - Чиж/Вечная молодость.mp3'},
  {'icon': iconImage, 'title': 'Видение', 'file': '../../../../../../../Test/Music/RADIO Помойка/Видение.mp3'},
  {'icon': iconImage, 'title': 'Владимирский Централ', 'file': '../../../../../../../Test/Music/RADIO Помойка/Владимирский централ.mp3'},
  {'icon': iconImage, 'title': 'Возвращайся', 'file': '../../../../../../../Test/Music/RADIO Помойка/Возвращайся.mp3'},
  {'icon': iconImage, 'title': 'Вороны', 'file': '../../../../../../../Test/Music/RADIO Помойка/Вороны.mp3'},
  {'icon': iconImage, 'title': 'Все В Порядке', 'file': '../../../../../../../Test/Music/RADIO Помойка/Все В Порядке.mp3'},
  {'icon': iconImage, 'title': 'Голубая Стрела', 'file': '../../../../../../../Test/Music/RADIO Помойка/Белая гвардия/Голубая стрела.mp3'},
  {'icon': iconImage, 'title': 'Да Ди Дам', 'file': '../../../../../../../Test/Music/RADIO Помойка/Да-ди-дам.mp3'},
  {'icon': iconImage, 'title': 'Дальнобойная', 'file': '../../../../../../../Test/Music/RADIO Помойка/Трофим/Дальнобойная.mp3'},
  {'icon': iconImage, 'title': 'Девочка Моя', 'file': '../../../../../../../Test/Music/RADIO Помойка/Девочка моя.mp3'},
  {'icon': iconImage, 'title': 'Девушка Из Высшего Общества', 'file': '../../../../../../../Test/Music/RADIO Помойка/Девушка из высшего общества.mp3'},
  {'icon': iconImage, 'title': 'День Рожденья', 'file': '../../../../../../../Test/Music/RADIO Помойка/День рожденья.mp3'},
  {'icon': iconImage, 'title': 'Дорога', 'file': '../../../../../../../Test/Music/RADIO Помойка/Дорога.mp3'},
  {'icon': iconImage, 'title': 'Если В Сердце Живет Любовь', 'file': '../../../../../../../Test/Music/RADIO Помойка/Если в сердце живет любовь.mp3'},
  {'icon': iconImage, 'title': 'Если Хочешь Уходи', 'file': '../../../../../../../Test/Music/RADIO Помойка/Если хочешь уходи.mp3'},
  {'icon': iconImage, 'title': 'Еще Раз Ночь', 'file': '../../../../../../../Test/Music/RADIO Помойка/Еще раз ночь.mp3'},
  {'icon': iconImage, 'title': 'Жара', 'file': '../../../../../../../Test/Music/RADIO Помойка/Жара.mp3'},
  {'icon': iconImage, 'title': 'Звезды', 'file': '../../../../../../../Test/Music/RADIO Помойка/Звезды.mp3'},
  {'icon': iconImage, 'title': 'Земляничный Берсерк', 'file': '../../../../../../../Test/Music/RADIO Помойка/Земляничный Берсерк.mp3'},
  {'icon': iconImage, 'title': 'Иногда', 'file': '../../../../../../../Test/Music/RADIO Помойка/Иногда.mp3'},
  {'icon': iconImage, 'title': 'Какой Пустяк', 'file': '../../../../../../../Test/Music/RADIO Помойка/Какой пустяк.mp3'},
  {'icon': iconImage, 'title': 'Клубника Со Льдом', 'file': '../../../../../../../Test/Music/RADIO Помойка/Клубника со льдом.WAV'},
  {'icon': iconImage, 'title': 'Колыбельная Волкам', 'file': '../../../../../../../Test/Music/RADIO Помойка/Колыбельная волкам.mp3'},
  {'icon': iconImage, 'title': 'Кошки', 'file': '../../../../../../../Test/Music/RADIO Помойка/Кошки.mp3'},
  {'icon': iconImage, 'title': 'Красиво', 'file': '../../../../../../../Test/Music/RADIO Помойка/Красиво.mp3'},
  {'icon': iconImage, 'title': 'Кто Виноват', 'file': '../../../../../../../Test/Music/RADIO Помойка/Кто виноват.mp3'},
  {'icon': iconImage, 'title': 'Куранты', 'file': '../../../../../../../Test/Music/RADIO Помойка/Куранты.mp3'},
  {'icon': iconImage, 'title': 'Ламбада', 'file': '../../../../../../../Test/Music/RADIO Помойка/Ламбада.mp3'},
  {'icon': iconImage, 'title': 'Ласковаямоя', 'file': '../../../../../../../Test/Music/RADIO Помойка/Ласковаямоя.mp3'},
  {'icon': iconImage, 'title': 'Лошадка', 'file': '../../../../../../../Test/Music/RADIO Помойка/Лошадка.mp3'},
  {'icon': iconImage, 'title': 'Маленькая Страна', 'file': '../../../../../../../Test/Music/RADIO Помойка/Маленькая страна.mp3'},
  {'icon': iconImage, 'title': 'Маленький Зверь', 'file': '../../../../../../../Test/Music/RADIO Помойка/Маленький зверь.mp3'},
  {'icon': iconImage, 'title': 'Мама Шикодам', 'file': '../../../../../../../Test/Music/RADIO Помойка/Мама шикодам.mp3'},
  {'icon': iconImage, 'title': 'Мамба', 'file': '../../../../../../../Test/Music/RADIO Помойка/Мамба.mp3'},
  {'icon': iconImage, 'title': 'Маргарита', 'file': '../../../../../../../Test/Music/RADIO Помойка/Маргарита.mp3'},
  {'icon': iconImage, 'title': 'Между Мной И Тобой', 'file': '../../../../../../../Test/Music/RADIO Помойка/Между мной и тобой.mp3'},
  {'icon': iconImage, 'title': 'Мой Мир', 'file': '../../../../../../../Test/Music/RADIO Помойка/Мой мир.mp3'},
  {'icon': iconImage, 'title': 'Молодые Ветра', 'file': '../../../../../../../Test/Music/RADIO Помойка/Молодые ветра.MP3'},
  {'icon': iconImage, 'title': 'Музыка Нас Связала', 'file': '../../../../../../../Test/Music/RADIO Помойка/Музыка нас связала.MP3'},
  {'icon': iconImage, 'title': 'На Поле Танки Грохотали ', 'file': '../../../../../../../Test/Music/RADIO Помойка/Чиж/1997 - Бомбардировщик/На поле танки грохотали...mp3'},
  {'icon': iconImage, 'title': 'Не Получилось Не Срослось', 'file': '../../../../../../../Test/Music/RADIO Помойка/Не Получилось, Не Срослось.mp3'},
  {'icon': iconImage, 'title': 'Не Уверен', 'file': '../../../../../../../Test/Music/RADIO Помойка/Не уверен.mp3'},
  {'icon': iconImage, 'title': 'Невеста', 'file': '../../../../../../../Test/Music/RADIO Помойка/Невеста.mp3'},
  {'icon': iconImage, 'title': 'Незаконченный Роман', 'file': '../../../../../../../Test/Music/RADIO Помойка/Аллегрова/Незаконченный роман.mp3'},
  {'icon': iconImage, 'title': 'Немного Огня', 'file': '../../../../../../../Test/Music/RADIO Помойка/Немного огня.mp3'},
  {'icon': iconImage, 'title': 'Ночь', 'file': '../../../../../../../Test/Music/RADIO Помойка/Ночь.mp3'},
  {'icon': iconImage, 'title': 'Ну Гдеже Ваши Руки', 'file': '../../../../../../../Test/Music/RADIO Помойка/Ну гдеже ваши руки.mp3'},
  {'icon': iconImage, 'title': 'Охотники', 'file': '../../../../../../../Test/Music/RADIO Помойка/Охотники.mp3'},
  {'icon': iconImage, 'title': 'Перелётная Птица', 'file': '../../../../../../../Test/Music/RADIO Помойка/Перелётная птица.mp3'},
  {'icon': iconImage, 'title': 'Переход', 'file': '../../../../../../../Test/Music/RADIO Помойка/Переход.mp3'},
  {'icon': iconImage, 'title': 'Печаль', 'file': '../../../../../../../Test/Music/RADIO Помойка/Печаль.mp3'},
  {'icon': iconImage, 'title': 'Плачет Девушка В Автомате', 'file': '../../../../../../../Test/Music/RADIO Помойка/Плачет девушка в автомате.mp3'},
  {'icon': iconImage, 'title': 'Поворачивай К Черту', 'file': '../../../../../../../Test/Music/RADIO Помойка/Поворачивай к черту.mp3'},
  {'icon': iconImage, 'title': 'Поколение Next', 'file': '../../../../../../../Test/Music/RADIO Помойка/Поколение Next.mp3'},
  {'icon': iconImage, 'title': 'Полет К Новым Мирам', 'file': '../../../../../../../Test/Music/RADIO Помойка/Полет к новым мирам.mp3'},
  {'icon': iconImage, 'title': 'Понимаешь', 'file': '../../../../../../../Test/Music/RADIO Помойка/Понимаешь.mp3'},
  {'icon': iconImage, 'title': 'Последняя', 'file': '../../../../../../../Test/Music/RADIO Помойка/Последняя.mp3'},
  {'icon': iconImage, 'title': 'Прости За Любовь', 'file': '../../../../../../../Test/Music/RADIO Помойка/Прости за любовь.MP3'},
  {'icon': iconImage, 'title': 'Просто Такая Сильная Любовь', 'file': '../../../../../../../Test/Music/RADIO Помойка/Просто такая сильная любовь.mp3'},
  {'icon': iconImage, 'title': 'Раз И Навсегда', 'file': '../../../../../../../Test/Music/RADIO Помойка/Раз и навсегда.mp3'},
  {'icon': iconImage, 'title': 'Сhihuahua', 'file': '../../../../../../../Test/Music/RADIO Помойка/Сhihuahua.mp3'},
  {'icon': iconImage, 'title': 'Самолеты', 'file': '../../../../../../../Test/Music/RADIO Помойка/Самолеты.mp3'},
  {'icon': iconImage, 'title': 'Сестра И Принцессы', 'file': '../../../../../../../Test/Music/RADIO Помойка/Сестра и Принцессы.mp3'},
  {'icon': iconImage, 'title': 'Сиреневый Туман', 'file': '../../../../../../../Test/Music/RADIO Помойка/Михаил Шуфутинский/1990 - Moya jizn/Сиреневый Туман.mp3'},
  {'icon': iconImage, 'title': 'Снег Кружится', 'file': '../../../../../../../Test/Music/RADIO Помойка/Снег кружится.mp3'},
  {'icon': iconImage, 'title': 'Старший Брат', 'file': '../../../../../../../Test/Music/RADIO Помойка/Старший Брат.mp3'},
  {'icon': iconImage, 'title': 'Странник', 'file': '../../../../../../../Test/Music/RADIO Помойка/Аллегрова/Странник.mp3'},
  {'icon': iconImage, 'title': 'Сукачев', 'file': '../../../../../../../Test/Music/RADIO Помойка/Сукачев.MP3'},
  {'icon': iconImage, 'title': 'Танкист', 'file': '../../../../../../../Test/Music/RADIO Помойка/Танкист.mp3'},
  {'icon': iconImage, 'title': 'Таю', 'file': '../../../../../../../Test/Music/RADIO Помойка/Таю.mp3'},
  {'icon': iconImage, 'title': 'Ты Будешь Плакать', 'file': '../../../../../../../Test/Music/RADIO Помойка/Ты будешь плакать.mp3'},
  {'icon': iconImage, 'title': 'Ты Где То Там', 'file': '../../../../../../../Test/Music/RADIO Помойка/Ты где -то там.mp3'},
  {'icon': iconImage, 'title': 'Ты Меня Не Забыай', 'file': '../../../../../../../Test/Music/RADIO Помойка/Ты меня не забыай.mp3'},
  {'icon': iconImage, 'title': 'Улетай', 'file': '../../../../../../../Test/Music/RADIO Помойка/Улетай.mp3'},
  {'icon': iconImage, 'title': 'Фантом', 'file': '../../../../../../../Test/Music/RADIO Помойка/Чиж/1998 - Новый Иерусалим/Фантом.mp3'},
  {'icon': iconImage, 'title': 'Х Х Х И Р Н Р', 'file': '../../../../../../../Test/Music/RADIO Помойка/Х.Х.Х. и Р.Н.Р.mp3'},
  {'icon': iconImage, 'title': 'Хип Хоп Рэп', 'file': '../../../../../../../Test/Music/RADIO Помойка/Хип-хоп-рэп.mp3'},
  {'icon': iconImage, 'title': 'Цветы', 'file': '../../../../../../../Test/Music/RADIO Помойка/Цветы.mp3'},
  {'icon': iconImage, 'title': 'Чудеса', 'file': '../../../../../../../Test/Music/RADIO Помойка/Чудеса.mp3'},
  {'icon': iconImage, 'title': 'Школьная Пора', 'file': '../../../../../../../Test/Music/RADIO Помойка/Школьная Пора.mp3'},
  {'icon': iconImage, 'title': 'Я Летата', 'file': '../../../../../../../Test/Music/RADIO Помойка/Я летата.mp3'},
  {'icon': iconImage, 'title': 'Я Уйду', 'file': '../../../../../../../Test/Music/RADIO Помойка/Я уйду.mp3'},
]);
})

document.getElementById('rammstein').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Adios', 'file': '../../../../../../../Test/Music/Rammstein/Adios.mp3'},
  {'icon': iconImage, 'title': 'Alter Mann', 'file': '../../../../../../../Test/Music/Rammstein/Das modell/Alter Mann.mp3'},
  {'icon': iconImage, 'title': 'Amerika', 'file': '../../../../../../../Test/Music/Rammstein/2004 - Reise, Reise/Amerika.mp3'},
  {'icon': iconImage, 'title': 'Amour', 'file': '../../../../../../../Test/Music/Rammstein/2004 - Reise, Reise/Amour.mp3'},
  {'icon': iconImage, 'title': 'Donaukinder', 'file': '../../../../../../../Test/Music/Rammstein/2009 - LIFAD/Donaukinder.mp3'},
  {'icon': iconImage, 'title': 'Du Hast', 'file': '../../../../../../../Test/Music/Rammstein/Rosenrot/Du hast.mp3'},
  {'icon': iconImage, 'title': 'Du Riechst So Gut', 'file': '../../../../../../../Test/Music/Rammstein/Du Riechst So Gut/Du Riechst So Gut.mp3'},
  {'icon': iconImage, 'title': 'Engel', 'file': '../../../../../../../Test/Music/Rammstein/Sehnsucht/Engel.mp3'},
  {'icon': iconImage, 'title': 'Feuer Frei', 'file': '../../../../../../../Test/Music/Rammstein/Rosenrot/Feuer frei.mp3'},
  {'icon': iconImage, 'title': 'Feuer Und Wasser', 'file': '../../../../../../../Test/Music/Rammstein/Rosenrot/Feuer und wasser.mp3'},
  {'icon': iconImage, 'title': 'Fruhling In Paris', 'file': '../../../../../../../Test/Music/Rammstein/2009 - LIFAD/Fruhling in Paris.mp3'},
  {'icon': iconImage, 'title': 'Haifisch', 'file': '../../../../../../../Test/Music/Rammstein/2009 - LIFAD/Haifisch.mp3'},
  {'icon': iconImage, 'title': 'Hilf Mir', 'file': '../../../../../../../Test/Music/Rammstein/Rosenrot/Hilf mir.mp3'},
  {'icon': iconImage, 'title': 'Ich Tu Dir Weh', 'file': '../../../../../../../Test/Music/Rammstein/2009 - LIFAD/Ich tu dir weh.mp3'},
  {'icon': iconImage, 'title': 'Ich Will', 'file': '../../../../../../../Test/Music/Rammstein/Mutter/Ich Will.mp3'},
  {'icon': iconImage, 'title': 'Kein Lust', 'file': '../../../../../../../Test/Music/Rammstein/Rosenrot/Kein lust.mp3'},
  {'icon': iconImage, 'title': 'Links 2 3 4', 'file': '../../../../../../../Test/Music/Rammstein/Mutter/Links 2 3 4.mp3'},
  {'icon': iconImage, 'title': 'Mann Gegen Mann', 'file': '../../../../../../../Test/Music/Rammstein/Rosenrot/Mann gegen mann.mp3'},
  {'icon': iconImage, 'title': 'Mein Herz Brennt', 'file': '../../../../../../../Test/Music/Rammstein/Mutter/Mein Herz Brennt.mp3'},
  {'icon': iconImage, 'title': 'Mein Herz Brennt (live At Download Festival Uk 2016)', 'file': '../../../../../../../Test/Music/Rammstein/Mein Herz brennt (Live at Download Festival UK 2016).mp4'},
  {'icon': iconImage, 'title': 'Mein Teil', 'file': '../../../../../../../Test/Music/Rammstein/Rosenrot/Mein teil.mp3'},
  {'icon': iconImage, 'title': 'Morgenstern', 'file': '../../../../../../../Test/Music/Rammstein/2004 - Reise, Reise/Morgenstern.mp3'},
  {'icon': iconImage, 'title': 'Moskou', 'file': '../../../../../../../Test/Music/Rammstein/2004 - Reise, Reise/Moskou.mp3'},
  {'icon': iconImage, 'title': 'Mutter', 'file': '../../../../../../../Test/Music/Rammstein/Mutter/Mutter.mp3'},
  {'icon': iconImage, 'title': 'Ohne Dich', 'file': '../../../../../../../Test/Music/Rammstein/2004 - Reise, Reise/Ohne Dich.mp3'},
  {'icon': iconImage, 'title': 'Original', 'file': '../../../../../../../Test/Music/Rammstein/Engel/Original.mp3'},
  {'icon': iconImage, 'title': 'Pussy', 'file': '../../../../../../../Test/Music/Rammstein/2009 - LIFAD/Pussy .mp3'},
  {'icon': iconImage, 'title': 'Reise Reise', 'file': '../../../../../../../Test/Music/Rammstein/2004 - Reise, Reise/Reise, Reise.mp3'},
  {'icon': iconImage, 'title': 'Rosenrot', 'file': '../../../../../../../Test/Music/Rammstein/Rosenrot/Rosenrot.mp3'},
  {'icon': iconImage, 'title': 'Seemann', 'file': '../../../../../../../Test/Music/Rammstein/Seemann/Seemann.mp3'},
  {'icon': iconImage, 'title': 'Sonne', 'file': '../../../../../../../Test/Music/Rammstein/Mutter/Sonne.mp3'},
  {'icon': iconImage, 'title': 'Spieluhr', 'file': '../../../../../../../Test/Music/Rammstein/Spieluhr.mp3'},
  {'icon': iconImage, 'title': 'Stein Um Stein', 'file': '../../../../../../../Test/Music/Rammstein/2004 - Reise, Reise/Stein um Stein.mp3'},
  {'icon': iconImage, 'title': 'String', 'file': '../../../../../../../Test/Music/Rammstein/Rosenrot/String.mp3'},
  {'icon': iconImage, 'title': 'Stripped', 'file': '../../../../../../../Test/Music/Rammstein/Stripped/Stripped.mp3'},
  {'icon': iconImage, 'title': 'Waidmanns Heil', 'file': '../../../../../../../Test/Music/Rammstein/2009 - LIFAD/Waidmanns Heil.mp3'},
  {'icon': iconImage, 'title': 'Wilder Wein', 'file': '../../../../../../../Test/Music/Rammstein/Wilder Wein.mp3'},
  {'icon': iconImage, 'title': 'Wobist Du', 'file': '../../../../../../../Test/Music/Rammstein/Rosenrot/Wobist du.mp3'},
  {'icon': iconImage, 'title': 'Wollt Ihr', 'file': '../../../../../../../Test/Music/Rammstein/Herzeleid/Wollt Ihr.mp3'},
  {'icon': iconImage, 'title': 'Zwitter', 'file': '../../../../../../../Test/Music/Rammstein/Mutter/Zwitter.mp3'},
  {'icon': iconImage, 'title': 'Тier', 'file': '../../../../../../../Test/Music/Rammstein/Sehnsucht/Тier.mp3'},
]);
})

document.getElementById('romanticcollektion').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': ' Track04', 'file': '../../../../../../../Test/Music/Romantic Collektion/M/- Track04.mp3'},
  {'icon': iconImage, 'title': '01', 'file': '../../../../../../../Test/Music/Romantic Collektion/Romantic Collektion/Romantic Collection 2/01.mp3'},
  {'icon': iconImage, 'title': '02', 'file': '../../../../../../../Test/Music/Romantic Collektion/Romantic Collektion/Romantic Collection 1/02.mp3'},
  {'icon': iconImage, 'title': '08', 'file': '../../../../../../../Test/Music/Romantic Collektion/Romantic Collektion/Romantic Collection 2/08.mp3'},
  {'icon': iconImage, 'title': '1', 'file': '../../../../../../../Test/Music/Romantic Collektion/Romantic Collektion/5/1.MP3'},
  {'icon': iconImage, 'title': '10', 'file': '../../../../../../../Test/Music/Romantic Collektion/Romantic Collektion/8/10.MP3'},
  {'icon': iconImage, 'title': '11', 'file': '../../../../../../../Test/Music/Romantic Collektion/Romantic Collektion/5/11.MP3'},
  {'icon': iconImage, 'title': '12', 'file': '../../../../../../../Test/Music/Romantic Collektion/Romantic Collektion/Romantic Collection 2/12.mp3'},
  {'icon': iconImage, 'title': '13', 'file': '../../../../../../../Test/Music/Romantic Collektion/13.mp3'},
  {'icon': iconImage, 'title': '13', 'file': '../../../../../../../Test/Music/Romantic Collektion/Romantic Collektion/Romantic Collection 1/13.mp3'},
  {'icon': iconImage, 'title': '13', 'file': '../../../../../../../Test/Music/Romantic Collektion/Romantic Collektion/11/13.MP3'},
  {'icon': iconImage, 'title': '14', 'file': '../../../../../../../Test/Music/Romantic Collektion/Romantic Collektion/Romantic Collection 2/14.mp3'},
  {'icon': iconImage, 'title': '16', 'file': '../../../../../../../Test/Music/Romantic Collektion/16.mp3'},
  {'icon': iconImage, 'title': '16', 'file': '../../../../../../../Test/Music/Romantic Collektion/Romantic Collektion/4/16.MP3'},
  {'icon': iconImage, 'title': '17', 'file': '../../../../../../../Test/Music/Romantic Collektion/Romantic Collektion/4/17.MP3'},
  {'icon': iconImage, 'title': '18 Track 18', 'file': '../../../../../../../Test/Music/Romantic Collektion/18 - Track 18.mp3'},
  {'icon': iconImage, 'title': '19', 'file': '../../../../../../../Test/Music/Romantic Collektion/Romantic Collektion/4/19.MP3'},
  {'icon': iconImage, 'title': '19', 'file': '../../../../../../../Test/Music/Romantic Collektion/Romantic Collektion/5/19.MP3'},
  {'icon': iconImage, 'title': '22 Трек 22', 'file': '../../../../../../../Test/Music/Romantic Collektion/M/22 - Трек 22.mp3'},
  {'icon': iconImage, 'title': '33', 'file': '../../../../../../../Test/Music/Romantic Collektion/33.mp3'},
  {'icon': iconImage, 'title': '5', 'file': '../../../../../../../Test/Music/Romantic Collektion/5.mp3'},
  {'icon': iconImage, 'title': '5', 'file': '../../../../../../../Test/Music/Romantic Collektion/Romantic Collektion/9/5.MP3'},
  {'icon': iconImage, 'title': '5', 'file': '../../../../../../../Test/Music/Romantic Collektion/Romantic Collektion/2/5.MP3'},
  {'icon': iconImage, 'title': 'Dido', 'file': '../../../../../../../Test/Music/Romantic Collektion/Dido.mp3'},
  {'icon': iconImage, 'title': 'Keane 04 Track 4', 'file': '../../../../../../../Test/Music/Romantic Collektion/Keane - 04 - Track  4.mp3'},
  {'icon': iconImage, 'title': 'Keane 05 Track 5', 'file': '../../../../../../../Test/Music/Romantic Collektion/Keane - 05 - Track  5.mp3'},
  {'icon': iconImage, 'title': 'Little Russia', 'file': '../../../../../../../Test/Music/Romantic Collektion/Romantic Collektion/5/Little Russia.MP3'},
  {'icon': iconImage, 'title': 'Pink Panther', 'file': '../../../../../../../Test/Music/Romantic Collektion/Romantic Collektion/Romantic Collection 1/Pink Panther.mp3'},
  {'icon': iconImage, 'title': 'The Phantom Of The Opera', 'file': '../../../../../../../Test/Music/Romantic Collektion/Romantic Collektion/Romantic Collection 1/The Phantom Of The Opera.mp3'},
  {'icon': iconImage, 'title': 'Track 10', 'file': '../../../../../../../Test/Music/Romantic Collektion/M/инструментал/Track 10.mp3'},
  {'icon': iconImage, 'title': 'Track 12', 'file': '../../../../../../../Test/Music/Romantic Collektion/M/инструментал/Track 12.mp3'},
  {'icon': iconImage, 'title': 'Track 5', 'file': '../../../../../../../Test/Music/Romantic Collektion/M/инструментал/Track  5.mp3'},
  {'icon': iconImage, 'title': 'Track15', 'file': '../../../../../../../Test/Music/Romantic Collektion/TRACK15.mp3'},
  {'icon': iconImage, 'title': 'Track209', 'file': '../../../../../../../Test/Music/Romantic Collektion/TRACK209.mp3'},
  {'icon': iconImage, 'title': 'Vot 009', 'file': '../../../../../../../Test/Music/Romantic Collektion/VOT-009.mp3'},
  {'icon': iconImage, 'title': 'Дорожка 1', 'file': '../../../../../../../Test/Music/Romantic Collektion/Дорожка 1.mp3'},
]);
})

document.getElementById('scooter').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Break It Up', 'file': '../../../../../../../Test/Music/Scooter/1996 - Wicked!/Break It Up.mp4'},
  {'icon': iconImage, 'title': 'Break It Up', 'file': '../../../../../../../Test/Music/Scooter/1996 - Wicked!/Break It Up.mp3'},
  {'icon': iconImage, 'title': 'Clic Clac', 'file': '../../../../../../../Test/Music/Scooter/2009 - Under The Radar Over The Top/Clic Clac.mp3'},
  {'icon': iconImage, 'title': 'Fire', 'file': '../../../../../../../Test/Music/Scooter/1997 - The Age Of Love/Fire.mp3'},
  {'icon': iconImage, 'title': 'How Much Is The Fish', 'file': '../../../../../../../Test/Music/Scooter/1998 - No Time To Chill/How Much Is The Fish.mp3'},
  {'icon': iconImage, 'title': 'I Was Made For Lovin You', 'file': '../../../../../../../Test/Music/Scooter/1998 - No Time To Chill/I Was Made For Lovin%27 You.mp3'},
  {'icon': iconImage, 'title': 'Introduction', 'file': '../../../../../../../Test/Music/Scooter/1997 - The Age Of Love/Introduction.mp3'},
  {'icon': iconImage, 'title': 'The Logical Song', 'file': '../../../../../../../Test/Music/Scooter/2007 - Jumping All Over The World - Whatever You Want/The Logical Song.mp3'},
  {'icon': iconImage, 'title': 'The Night', 'file': '../../../../../../../Test/Music/Scooter/2007 - Jumping All Over The World - Whatever You Want/The Night.mp3'},
  {'icon': iconImage, 'title': 'We Are The Greatest', 'file': '../../../../../../../Test/Music/Scooter/1998 - No Time To Chill/We Are The Greatest.mp3'},
  {'icon': iconImage, 'title': 'Weekend', 'file': '../../../../../../../Test/Music/Scooter/2007 - Jumping All Over The World - Whatever You Want/Weekend.mp3'},
]);
})

document.getElementById('shakira').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Ciega Sordomuda', 'file': '../../../../../../../Test/Music/Shakira/1998 - Donde Estan Los Ladrones/Ciega sordomuda.mp3'},
  {'icon': iconImage, 'title': 'Donde Estan Los Ladrones', 'file': '../../../../../../../Test/Music/Shakira/1998 - Donde Estan Los Ladrones/Donde estan los ladrones.mp3'},
  {'icon': iconImage, 'title': 'Dont Bother', 'file': '../../../../../../../Test/Music/Shakira/2007 - Oral Fixation Tour/Don%27t Bother.mp3'},
  {'icon': iconImage, 'title': 'Estoy Aqui', 'file': '../../../../../../../Test/Music/Shakira/1998 - Donde Estan Los Ladrones/Estoy aqui.mp3'},
  {'icon': iconImage, 'title': 'Eyes Like Yours Ojos Asi', 'file': '../../../../../../../Test/Music/Shakira/2001 - Laundry Service/Eyes Like Yours Ojos asi.mp3'},
  {'icon': iconImage, 'title': 'How Do You Do', 'file': '../../../../../../../Test/Music/Shakira/2005 - Fijacion Oral/How Do You Do.mp3'},
  {'icon': iconImage, 'title': 'Inevitable', 'file': '../../../../../../../Test/Music/Shakira/2002 - Grandes Exitos/Inevitable.mp3'},
  {'icon': iconImage, 'title': 'Objection', 'file': '../../../../../../../Test/Music/Shakira/2001 - Laundry Service/Objection.mp3'},
  {'icon': iconImage, 'title': 'Octavo Dia', 'file': '../../../../../../../Test/Music/Shakira/1998 - Donde Estan Los Ladrones/Octavo dia.mp3'},
  {'icon': iconImage, 'title': 'Ojos Asi', 'file': '../../../../../../../Test/Music/Shakira/2002 - Grandes Exitos/Ojos Asi.mp3'},
  {'icon': iconImage, 'title': 'Si Te Vas', 'file': '../../../../../../../Test/Music/Shakira/1998 - Donde Estan Los Ladrones/Si te vas.mp3'},
  {'icon': iconImage, 'title': 'Suerte Whenever Wherever', 'file': '../../../../../../../Test/Music/Shakira/2001 - Laundry Service/Suerte whenever wherever.mp3'},
  {'icon': iconImage, 'title': 'Underneath Your Clothes', 'file': '../../../../../../../Test/Music/Shakira/2001 - Laundry Service/Underneath your clothes.mp3'},
  {'icon': iconImage, 'title': 'Underneath Your Clothes (acoustic Version)', 'file': '../../../../../../../Test/Music/Shakira/2001 - Laundry Service/Underneath Your Clothes (Acoustic Version).mp3'},
  {'icon': iconImage, 'title': 'Whenever Wherever', 'file': '../../../../../../../Test/Music/Shakira/2001 - Laundry Service/Whenever Wherever.mp3'},
  {'icon': iconImage, 'title': 'Whenever Wherever', 'file': '../../../../../../../Test/Music/Shakira/2001 - Laundry Service/Whenever, Wherever.mp3'},
]);
})

document.getElementById('systemofadown').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A T W A', 'file': '../../../../../../../Test/Music/System of a Down/2001 - Toxicity/A.T.W.A.mp3'},
  {'icon': iconImage, 'title': 'Aerials', 'file': '../../../../../../../Test/Music/System of a Down/Soundtrack hits (bootleg)/Aerials.mp3'},
  {'icon': iconImage, 'title': 'Chop Suey', 'file': '../../../../../../../Test/Music/System of a Down/2001 - Toxicity/Chop Suey.mp3'},
  {'icon': iconImage, 'title': 'Pictures', 'file': '../../../../../../../Test/Music/System of a Down/2002 - Steal This Album!/Pictures.mp3'},
  {'icon': iconImage, 'title': 'Psycho', 'file': '../../../../../../../Test/Music/System of a Down/Soundtrack hits (bootleg)/Psycho.mp3'},
  {'icon': iconImage, 'title': 'Spiders', 'file': '../../../../../../../Test/Music/System of a Down/1998 - System Of A Down/Spiders.mp3'},
]);
})

document.getElementById('vanessamae').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Aurora', 'file': '../../../../../../../Test/Music/Vanessa Mae/1997 - Storm/Aurora.mp3'},
  {'icon': iconImage, 'title': 'Can Can', 'file': '../../../../../../../Test/Music/Vanessa Mae/1997 - Storm/Can, Can.mp3'},
  {'icon': iconImage, 'title': 'Classical Gas', 'file': '../../../../../../../Test/Music/Vanessa Mae/1995 - The Violin Player/Classical Gas.mp3'},
  {'icon': iconImage, 'title': 'Contradanza', 'file': '../../../../../../../Test/Music/Vanessa Mae/1995 - The Violin Player/Contradanza.mp3'},
  {'icon': iconImage, 'title': 'I Feel Love', 'file': '../../../../../../../Test/Music/Vanessa Mae/1997 - Storm/I Feel Love.mp3'},
  {'icon': iconImage, 'title': 'Retro', 'file': '../../../../../../../Test/Music/Vanessa Mae/1997 - Storm/Retro.mp3'},
  {'icon': iconImage, 'title': 'Storm', 'file': '../../../../../../../Test/Music/Vanessa Mae/1997 - Storm/Storm.mp3'},
  {'icon': iconImage, 'title': 'Toccata And Fugue In D Minor', 'file': '../../../../../../../Test/Music/Vanessa Mae/1995 - The Violin Player/Toccata and Fugue in D minor.mp3'},
  {'icon': iconImage, 'title': 'You Fly Me Up', 'file': '../../../../../../../Test/Music/Vanessa Mae/1997 - Storm/You Fly Me Up.mp3'},
]);
})

document.getElementById('withintemptation').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A Dangerous Mind', 'file': '../../../../../../../Test/Music/Within Temptation/2004 - The Silent Force/A Dangerous Mind.mp3'},
  {'icon': iconImage, 'title': 'Angels', 'file': '../../../../../../../Test/Music/Within Temptation/2005 - Angels/Angels.mp3'},
  {'icon': iconImage, 'title': 'Aquarius', 'file': '../../../../../../../Test/Music/Within Temptation/2004 - The Silent Force/Aquarius.mp3'},
  {'icon': iconImage, 'title': 'Bittersweet', 'file': '../../../../../../../Test/Music/Within Temptation/2003 - Mother Earth/Bittersweet.mp3'},
  {'icon': iconImage, 'title': 'Destroyed', 'file': '../../../../../../../Test/Music/Within Temptation/2005 - Memories/Destroyed.mp3'},
  {'icon': iconImage, 'title': 'Enter', 'file': '../../../../../../../Test/Music/Within Temptation/1997 - Enter/Enter.mp3'},
  {'icon': iconImage, 'title': 'In Perfect Harmony', 'file': '../../../../../../../Test/Music/Within Temptation/2003 - Mother Earth/In Perfect Harmony.mp3'},
  {'icon': iconImage, 'title': 'Intro', 'file': '../../../../../../../Test/Music/Within Temptation/2004 - The Silent Force/Intro.mp3'},
  {'icon': iconImage, 'title': 'Its The Fear', 'file': '../../../../../../../Test/Music/Within Temptation/2004 - The Silent Force/It%27s the Fear.mp3'},
  {'icon': iconImage, 'title': 'Jillian (id Give My Heart)', 'file': '../../../../../../../Test/Music/Within Temptation/2004 - The Silent Force/Jillian (I%27d Give My Heart).mp3'},
  {'icon': iconImage, 'title': 'Let Us Burn', 'file': '../../../../../../../Test/Music/Within Temptation/Let Us Burn.mp4'},
  {'icon': iconImage, 'title': 'Let Us Burn Myzuka', 'file': '../../../../../../../Test/Music/Within Temptation/Let us burn myzuka.mp3'},
  {'icon': iconImage, 'title': 'Memories', 'file': '../../../../../../../Test/Music/Within Temptation/2004 - The Silent Force/Memories.mp3'},
  {'icon': iconImage, 'title': 'Mother Earth', 'file': '../../../../../../../Test/Music/Within Temptation/2003 - Mother Earth/Mother Earth.mp3'},
  {'icon': iconImage, 'title': 'Out Farewell', 'file': '../../../../../../../Test/Music/Within Temptation/2003 - Mother Earth/Out Farewell.mp3'},
  {'icon': iconImage, 'title': 'Overcome', 'file': '../../../../../../../Test/Music/Within Temptation/2004 - Stand My Ground/Overcome.mp3'},
  {'icon': iconImage, 'title': 'Pale', 'file': '../../../../../../../Test/Music/Within Temptation/2004 - The Silent Force/Pale.mp3'},
  {'icon': iconImage, 'title': 'Paradise', 'file': '../../../../../../../Test/Music/Within Temptation/Paradise.mp4'},
  {'icon': iconImage, 'title': 'Pearls Of Light', 'file': '../../../../../../../Test/Music/Within Temptation/1997 - Enter/Pearls Of Light.mp3'},
  {'icon': iconImage, 'title': 'Running Up That Hill', 'file': '../../../../../../../Test/Music/Within Temptation/2003 - Running Up And Hill/Running Up That Hill.mp3'},
  {'icon': iconImage, 'title': 'See Who I Am', 'file': '../../../../../../../Test/Music/Within Temptation/2004 - The Silent Force/See Who I Am.mp3'},
  {'icon': iconImage, 'title': 'Stand My Ground', 'file': '../../../../../../../Test/Music/Within Temptation/2004 - The Silent Force/Stand My Ground.mp3'},
  {'icon': iconImage, 'title': 'The Swan Song', 'file': '../../../../../../../Test/Music/Within Temptation/2004 - The Silent Force/The Swan Song.mp3'},
  {'icon': iconImage, 'title': 'We Run Feat', 'file': '../../../../../../../Test/Music/Within Temptation/We run feat.mp3'},
]);
})

document.getElementById('а.гордон').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '25 Й Кадр', 'file': '../../../../../../../Test/Music/А. Гордон/25-й кадр.mp3'},
  {'icon': iconImage, 'title': 'Fenomen Margantsa', 'file': '../../../../../../../Test/Music/А. Гордон/Fenomen margantsa.mp3'},
  {'icon': iconImage, 'title': 'Агрессия Сверчков', 'file': '../../../../../../../Test/Music/А. Гордон/Агрессия сверчков.mp3'},
  {'icon': iconImage, 'title': 'Анатомия Старения', 'file': '../../../../../../../Test/Music/А. Гордон/Анатомия старения.mp3'},
  {'icon': iconImage, 'title': 'Антарктида Древний Климат', 'file': '../../../../../../../Test/Music/А. Гордон/Антарктида древний климат.wav'},
  {'icon': iconImage, 'title': 'Астероидная Опастность', 'file': '../../../../../../../Test/Music/А. Гордон/Астероидная опастность.mp3'},
  {'icon': iconImage, 'title': 'Биоизлучение', 'file': '../../../../../../../Test/Music/А. Гордон/Биоизлучение.mp3'},
  {'icon': iconImage, 'title': 'Биологическая Эволюция', 'file': '../../../../../../../Test/Music/А. Гордон/Биологическая эволюция.mp3'},
  {'icon': iconImage, 'title': 'Биологическое Разнообразие', 'file': '../../../../../../../Test/Music/А. Гордон/Биологическое разнообразие.mp3'},
  {'icon': iconImage, 'title': 'Биотерроризм', 'file': '../../../../../../../Test/Music/А. Гордон/Биотерроризм.mp3'},
  {'icon': iconImage, 'title': 'Братья Вавиловы', 'file': '../../../../../../../Test/Music/А. Гордон/Братья Вавиловы.mp3'},
  {'icon': iconImage, 'title': 'Бред Величия', 'file': '../../../../../../../Test/Music/А. Гордон/Бред величия.mp3'},
  {'icon': iconImage, 'title': 'Великая Отечественная Как Гражданская', 'file': '../../../../../../../Test/Music/А. Гордон/Великая отечественная как гражданская.mp3'},
  {'icon': iconImage, 'title': 'Виртуальные Модели Мира', 'file': '../../../../../../../Test/Music/А. Гордон/Виртуальные модели мира.mp3'},
  {'icon': iconImage, 'title': 'Восприятие Красоты', 'file': '../../../../../../../Test/Music/А. Гордон/Восприятие красоты.mp3'},
  {'icon': iconImage, 'title': 'Генетическая История Человечества', 'file': '../../../../../../../Test/Music/А. Гордон/Генетическая история человечества.mp3'},
  {'icon': iconImage, 'title': 'Геном Человека', 'file': '../../../../../../../Test/Music/А. Гордон/Геном человека.mp3'},
  {'icon': iconImage, 'title': 'Гены И Культура', 'file': '../../../../../../../Test/Music/А. Гордон/Гены и культура.mp3'},
  {'icon': iconImage, 'title': 'Гипноз', 'file': '../../../../../../../Test/Music/А. Гордон/Гипноз.mp3'},
  {'icon': iconImage, 'title': 'Гипноз Ислама', 'file': '../../../../../../../Test/Music/А. Гордон/Гипноз ислама.mp3'},
  {'icon': iconImage, 'title': 'Голоса', 'file': '../../../../../../../Test/Music/А. Гордон/Голоса.mp3'},
  {'icon': iconImage, 'title': 'Голоса 2', 'file': '../../../../../../../Test/Music/А. Гордон/Голоса-2.mp3'},
  {'icon': iconImage, 'title': 'Движение Континентов', 'file': '../../../../../../../Test/Music/А. Гордон/Движение континентов.mp3'},
  {'icon': iconImage, 'title': 'Доказательность В Математике', 'file': '../../../../../../../Test/Music/А. Гордон/Доказательность в математике.mp3'},
  {'icon': iconImage, 'title': 'Ефимов Лекцив Фсб', 'file': '../../../../../../../Test/Music/А. Гордон/Ефимов лекцив ФСБ.mp3'},
  {'icon': iconImage, 'title': 'Еффект Сверх Малых Доз', 'file': '../../../../../../../Test/Music/А. Гордон/Еффект сверх малых доз.mp3'},
  {'icon': iconImage, 'title': 'Жизнь Вне Земли ', 'file': '../../../../../../../Test/Music/А. Гордон/Жизнь вне земли....mp3'},
  {'icon': iconImage, 'title': 'Жизнь Звезных Систем', 'file': '../../../../../../../Test/Music/А. Гордон/Жизнь звезных систем.mp3'},
  {'icon': iconImage, 'title': 'Запрограмированная Смерть', 'file': '../../../../../../../Test/Music/А. Гордон/Запрограмированная смерть.mp3'},
  {'icon': iconImage, 'title': 'Зелёная Химия', 'file': '../../../../../../../Test/Music/А. Гордон/Зелёная химия.mp3'},
  {'icon': iconImage, 'title': 'Игра Жизни И Физика Её Воплощения', 'file': '../../../../../../../Test/Music/А. Гордон/Игра жизни и физика её воплощения.mp3'},
  {'icon': iconImage, 'title': 'Из Лягушек В Принцы', 'file': '../../../../../../../Test/Music/А. Гордон/Из лягушек в принцы.mp3'},
  {'icon': iconImage, 'title': 'Интеллект И Наследственность', 'file': '../../../../../../../Test/Music/А. Гордон/Интеллект и наследственность.mp3'},
  {'icon': iconImage, 'title': 'Интеллект Муравьёв', 'file': '../../../../../../../Test/Music/А. Гордон/Интеллект муравьёв.mp3'},
  {'icon': iconImage, 'title': 'Интуиция', 'file': '../../../../../../../Test/Music/А. Гордон/Интуиция.mp3'},
  {'icon': iconImage, 'title': 'Истоки Происхождения Сознания', 'file': '../../../../../../../Test/Music/А. Гордон/Истоки происхождения сознания .mp3'},
  {'icon': iconImage, 'title': 'Квантовая Гравитация', 'file': '../../../../../../../Test/Music/А. Гордон/Квантовая гравитация.mp3'},
  {'icon': iconImage, 'title': 'Квантовая Математика', 'file': '../../../../../../../Test/Music/А. Гордон/Квантовая математика.mp3'},
  {'icon': iconImage, 'title': 'Квантовая Телепортация', 'file': '../../../../../../../Test/Music/А. Гордон/Квантовая телепортация.mp3'},
  {'icon': iconImage, 'title': 'Квантовые Игры', 'file': '../../../../../../../Test/Music/А. Гордон/Квантовые игры.mp3'},
  {'icon': iconImage, 'title': 'Квантовые Компьютеры И Модели Сознания', 'file': '../../../../../../../Test/Music/А. Гордон/Квантовые компьютеры и модели сознания.mp3'},
  {'icon': iconImage, 'title': 'Квантовый Регулятор Клетки', 'file': '../../../../../../../Test/Music/А. Гордон/Квантовый регулятор клетки.mp3'},
  {'icon': iconImage, 'title': 'Класс Интелектуалов', 'file': '../../../../../../../Test/Music/А. Гордон/Класс интелектуалов.mp3'},
  {'icon': iconImage, 'title': 'Когнитивная Наука [не До Конца]', 'file': '../../../../../../../Test/Music/А. Гордон/Когнитивная наука [не до конца].mp3'},
  {'icon': iconImage, 'title': 'Код Идентичности', 'file': '../../../../../../../Test/Music/А. Гордон/Код идентичности.mp3'},
  {'icon': iconImage, 'title': 'Код Идентичности 2', 'file': '../../../../../../../Test/Music/А. Гордон/Код идентичности-2 .mp3'},
  {'icon': iconImage, 'title': 'Коровье Бешенство', 'file': '../../../../../../../Test/Music/А. Гордон/Коровье бешенство.mp3'},
  {'icon': iconImage, 'title': 'Космология Картина Времени', 'file': '../../../../../../../Test/Music/А. Гордон/Космология картина времени.mp3'},
  {'icon': iconImage, 'title': 'Космос Будущего', 'file': '../../../../../../../Test/Music/А. Гордон/Космос будущего.mp3'},
  {'icon': iconImage, 'title': 'Красное И Чёрное', 'file': '../../../../../../../Test/Music/А. Гордон/Красное и чёрное.mp3'},
  {'icon': iconImage, 'title': 'Культура И Мозг', 'file': '../../../../../../../Test/Music/А. Гордон/Культура и мозг.mp3'},
  {'icon': iconImage, 'title': 'Лабиринт Генетики', 'file': '../../../../../../../Test/Music/А. Гордон/Лабиринт генетики.mp3'},
  {'icon': iconImage, 'title': 'Лики Времени', 'file': '../../../../../../../Test/Music/А. Гордон/Лики времени.mp3'},
  {'icon': iconImage, 'title': 'Луна', 'file': '../../../../../../../Test/Music/А. Гордон/Луна.mp3'},
  {'icon': iconImage, 'title': 'Макроскопические Феномены Спина', 'file': '../../../../../../../Test/Music/А. Гордон/Макроскопические феномены спина.mp3'},
  {'icon': iconImage, 'title': 'Малые Дозы Радиации', 'file': '../../../../../../../Test/Music/А. Гордон/Малые дозы радиации.mp3'},
  {'icon': iconImage, 'title': 'Математика И Структура Вселенной', 'file': '../../../../../../../Test/Music/А. Гордон/Математика и структура вселенной.mp3'},
  {'icon': iconImage, 'title': 'Метафизика Брэнда', 'file': '../../../../../../../Test/Music/А. Гордон/Метафизика брэнда.mp3'},
  {'icon': iconImage, 'title': 'Механизмы Памяти И Забвения', 'file': '../../../../../../../Test/Music/А. Гордон/Механизмы памяти и забвения.mp3'},
  {'icon': iconImage, 'title': 'Микроорганизмы В Метеорите', 'file': '../../../../../../../Test/Music/А. Гордон/Микроорганизмы в метеорите.mp3'},
  {'icon': iconImage, 'title': 'Мир Как Вакуум', 'file': '../../../../../../../Test/Music/А. Гордон/Мир как вакуум.mp3'},
  {'icon': iconImage, 'title': 'Миры И Вселенные', 'file': '../../../../../../../Test/Music/А. Гордон/Миры и вселенные.mp3'},
  {'icon': iconImage, 'title': 'Мифология Повседневности', 'file': '../../../../../../../Test/Music/А. Гордон/Мифология повседневности.mp3'},
  {'icon': iconImage, 'title': 'Моделирование Происхождения Интелекта', 'file': '../../../../../../../Test/Music/А. Гордон/Моделирование происхождения интелекта.mp3'},
  {'icon': iconImage, 'title': 'Модель Вселенной', 'file': '../../../../../../../Test/Music/А. Гордон/Модель вселенной.mp3'},
  {'icon': iconImage, 'title': 'Мужчина И Женщина В Языке', 'file': '../../../../../../../Test/Music/А. Гордон/Мужчина и женщина в языке.mp3'},
  {'icon': iconImage, 'title': 'Мышление Животных', 'file': '../../../../../../../Test/Music/А. Гордон/Мышление животных.mp3'},
  {'icon': iconImage, 'title': 'Мышление О Мышлении', 'file': '../../../../../../../Test/Music/А. Гордон/Мышление о мышлении.mp3'},
  {'icon': iconImage, 'title': 'Нанохимия', 'file': '../../../../../../../Test/Music/А. Гордон/Нанохимия.mp3'},
  {'icon': iconImage, 'title': 'Наука Бессмертия', 'file': '../../../../../../../Test/Music/А. Гордон/Наука бессмертия.mp3'},
  {'icon': iconImage, 'title': 'Наука И Гипотеза', 'file': '../../../../../../../Test/Music/А. Гордон/Наука и гипотеза.mp3'},
  {'icon': iconImage, 'title': 'Нейроэволюция', 'file': '../../../../../../../Test/Music/А. Гордон/Нейроэволюция.mp3'},
  {'icon': iconImage, 'title': 'Нейтрино', 'file': '../../../../../../../Test/Music/А. Гордон/Нейтрино.mp3'},
  {'icon': iconImage, 'title': 'Нелинейный Мир', 'file': '../../../../../../../Test/Music/А. Гордон/Нелинейный мир .mp3'},
  {'icon': iconImage, 'title': 'Новая Астрология', 'file': '../../../../../../../Test/Music/А. Гордон/Новая астрология.mp3'},
  {'icon': iconImage, 'title': 'Нравы Древней Руси', 'file': '../../../../../../../Test/Music/А. Гордон/Нравы древней руси.mp3'},
  {'icon': iconImage, 'title': 'Парадокс Левинталя', 'file': '../../../../../../../Test/Music/А. Гордон/Парадокс Левинталя.mp3'},
  {'icon': iconImage, 'title': 'Парниковая Катастрофа', 'file': '../../../../../../../Test/Music/А. Гордон/Парниковая катастрофа.mp3'},
  {'icon': iconImage, 'title': 'Поиск Внеземной Цивилизации', 'file': '../../../../../../../Test/Music/А. Гордон/Поиск внеземной цивилизации.mp3'},
  {'icon': iconImage, 'title': 'Поиск Временных Цмвилизаций', 'file': '../../../../../../../Test/Music/А. Гордон/Поиск временных цмвилизаций.mp3'},
  {'icon': iconImage, 'title': 'Поиск Черных Дыр', 'file': '../../../../../../../Test/Music/А. Гордон/Поиск черных дыр.mp3'},
  {'icon': iconImage, 'title': 'Постсоветизм', 'file': '../../../../../../../Test/Music/А. Гордон/Постсоветизм.mp3'},
  {'icon': iconImage, 'title': 'Поток Времени', 'file': '../../../../../../../Test/Music/А. Гордон/Поток времени.mp3'},
  {'icon': iconImage, 'title': 'Пределы Бесконечности', 'file': '../../../../../../../Test/Music/А. Гордон/Пределы бесконечности.mp3'},
  {'icon': iconImage, 'title': 'Природа Сна', 'file': '../../../../../../../Test/Music/А. Гордон/Природа сна.mp3'},
  {'icon': iconImage, 'title': 'Причина Времени', 'file': '../../../../../../../Test/Music/А. Гордон/Причина времени.mp3'},
  {'icon': iconImage, 'title': 'Прогноз Погоды', 'file': '../../../../../../../Test/Music/А. Гордон/Прогноз погоды.mp3'},
  {'icon': iconImage, 'title': 'Происхождение Вселенной', 'file': '../../../../../../../Test/Music/А. Гордон/Происхождение Вселенной%27.mp3'},
  {'icon': iconImage, 'title': 'Реалитивистская Теория Гравитации', 'file': '../../../../../../../Test/Music/А. Гордон/Реалитивистская теория гравитации.mp3'},
  {'icon': iconImage, 'title': 'Российский Пациент', 'file': '../../../../../../../Test/Music/А. Гордон/Российский пациент.mp3'},
  {'icon': iconImage, 'title': 'Сверхтяжёлые Элементы', 'file': '../../../../../../../Test/Music/А. Гордон/Сверхтяжёлые элементы.mp3'},
  {'icon': iconImage, 'title': 'Социум Приматов', 'file': '../../../../../../../Test/Music/А. Гордон/Социум приматов.mp3'},
  {'icon': iconImage, 'title': 'Стволовые Клетки Человека', 'file': '../../../../../../../Test/Music/А. Гордон/Стволовые клетки человека.mp3'},
  {'icon': iconImage, 'title': 'Странности Квантового Мира', 'file': '../../../../../../../Test/Music/А. Гордон/Странности квантового мира.mp3'},
  {'icon': iconImage, 'title': 'Страх', 'file': '../../../../../../../Test/Music/А. Гордон/Страх.wav'},
  {'icon': iconImage, 'title': 'Структура Вакуума', 'file': '../../../../../../../Test/Music/А. Гордон/Структура вакуума .mp3'},
  {'icon': iconImage, 'title': 'Тёмная Энергия Во Вселенной', 'file': '../../../../../../../Test/Music/А. Гордон/Тёмная энергия во Вселенной.mp3'},
  {'icon': iconImage, 'title': 'Теории Антропогенеза', 'file': '../../../../../../../Test/Music/А. Гордон/Теории антропогенеза.mp3'},
  {'icon': iconImage, 'title': 'Теория Суперструн', 'file': '../../../../../../../Test/Music/А. Гордон/Теория суперструн.mp3'},
  {'icon': iconImage, 'title': 'Термоядерная Реакция', 'file': '../../../../../../../Test/Music/А. Гордон/Термоядерная реакция.mp3'},
  {'icon': iconImage, 'title': 'Трансформация Элементов', 'file': '../../../../../../../Test/Music/А. Гордон/Трансформация элементов.mp3'},
  {'icon': iconImage, 'title': 'Феномен Жизни', 'file': '../../../../../../../Test/Music/А. Гордон/Феномен жизни.mp3'},
  {'icon': iconImage, 'title': 'Феномен Жизни 2', 'file': '../../../../../../../Test/Music/А. Гордон/Феномен жизни - 2.mp3'},
  {'icon': iconImage, 'title': 'Физика Духа', 'file': '../../../../../../../Test/Music/А. Гордон/Физика духа.mp3'},
  {'icon': iconImage, 'title': 'Физика И Математика В Контексте Биогенеза', 'file': '../../../../../../../Test/Music/А. Гордон/Физика и математика в контексте биогенеза.mp3'},
  {'icon': iconImage, 'title': 'Физика И Свобода Воли', 'file': '../../../../../../../Test/Music/А. Гордон/Физика и свобода воли.mp3'},
  {'icon': iconImage, 'title': 'Физические Поля Человека', 'file': '../../../../../../../Test/Music/А. Гордон/Физические поля человека.mp3'},
  {'icon': iconImage, 'title': 'Философия Денег', 'file': '../../../../../../../Test/Music/А. Гордон/Философия денег.mp3'},
  {'icon': iconImage, 'title': 'Формула Рака', 'file': '../../../../../../../Test/Music/А. Гордон/Формула рака.mp3'},
  {'icon': iconImage, 'title': 'Человек И Солнце', 'file': '../../../../../../../Test/Music/А. Гордон/Человек и Солнце.mp3'},
  {'icon': iconImage, 'title': 'Человек Пунктирный', 'file': '../../../../../../../Test/Music/А. Гордон/Человек пунктирный.mp3'},
  {'icon': iconImage, 'title': 'Черные Курильщики', 'file': '../../../../../../../Test/Music/А. Гордон/Черные курильщики.mp3'},
  {'icon': iconImage, 'title': 'Число Время Свет', 'file': '../../../../../../../Test/Music/А. Гордон/Число, время, свет.mp3'},
  {'icon': iconImage, 'title': 'Что Есть Время', 'file': '../../../../../../../Test/Music/А. Гордон/Что есть время .mp3'},
  {'icon': iconImage, 'title': 'Шаровая Молния', 'file': '../../../../../../../Test/Music/А. Гордон/Шаровая молния.mp3'},
  {'icon': iconImage, 'title': 'Эволюционная Теория Пола', 'file': '../../../../../../../Test/Music/А. Гордон/Эволюционная теория пола.mp3'},
  {'icon': iconImage, 'title': 'Эволюционная Теория Пола Ii', 'file': '../../../../../../../Test/Music/А. Гордон/Эволюционная теория пола II.mp3'},
  {'icon': iconImage, 'title': 'Экономическое Пространство Будущего', 'file': '../../../../../../../Test/Music/А. Гордон/Экономическое пространство будущего.mp3'},
  {'icon': iconImage, 'title': 'Эктоны', 'file': '../../../../../../../Test/Music/А. Гордон/Эктоны.mp3'},
]);
})

document.getElementById('а.розенбаум').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '04 В Лунном Саду', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/2001-Любви желанная пора/04 - В лунном саду.mp3'},
  {'icon': iconImage, 'title': '07 В Полуденном Саду', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/2001-Любви желанная пора/07 - В полуденном саду.mp3'},
  {'icon': iconImage, 'title': '1 Гори Гори Моя Звезда', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/1994-Бал/1. Гори, Гори, Моя Звезда.mp3'},
  {'icon': iconImage, 'title': '12 Гори Гори Моя Звезда', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/1994-Бал/12. Гори, гори, моя звезда.mp3'},
  {'icon': iconImage, 'title': '15 Ночь', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/1994-Бал/15. Ночь.mp3'},
  {'icon': iconImage, 'title': '18 Лет Спустя', 'file': '../../../../../../../Test/Music/А.Розенбаум/1986 - 1988 - Былое/18 лет спустя.mp3'},
  {'icon': iconImage, 'title': '38 Узлов', 'file': '../../../../../../../Test/Music/А.Розенбаум/1983 - Новые песни/38 узлов .mp3'},
  {'icon': iconImage, 'title': 'Ledi Gamilton', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/2005-Grand Collection/Ledi Gamilton.mp3'},
  {'icon': iconImage, 'title': 'Net Puti Nazad', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/2005-Grand Collection/Net puti nazad.mp3'},
  {'icon': iconImage, 'title': 'Piligrimi', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/2005-Grand Collection/Piligrimi.mp3'},
  {'icon': iconImage, 'title': 'А Может Не Было Войныi', 'file': '../../../../../../../Test/Music/А.Розенбаум/1986 - 1988 - Былое/А, может, не было войныi.mp3'},
  {'icon': iconImage, 'title': 'Баловалась Вечером Гитарой Тишина ', 'file': '../../../../../../../Test/Music/А.Розенбаум/1983 - Новые песни/Баловалась вечером гитарой тишина....mp3'},
  {'icon': iconImage, 'title': 'Белый Конь', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/1994-Бал/Белый конь.mp3'},
  {'icon': iconImage, 'title': 'В Лунном Саду', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/А.Малинин/В лунном саду.mp3'},
  {'icon': iconImage, 'title': 'В Полуденном Саду', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/А.Малинин/В полуденном саду.mp3'},
  {'icon': iconImage, 'title': 'Вальс 37 Го Года', 'file': '../../../../../../../Test/Music/А.Розенбаум/1984 - Концерт в Воркуте/Вальс 37-го года.mp3'},
  {'icon': iconImage, 'title': 'Вальс Бостон', 'file': '../../../../../../../Test/Music/А.Розенбаум/1984 - Концерт в Воркуте/Вальс-бостон .mp3'},
  {'icon': iconImage, 'title': 'Вальс На Плоскости', 'file': '../../../../../../../Test/Music/А.Розенбаум/1986 - 1988 - Былое/Вальс на плоскости.mp3'},
  {'icon': iconImage, 'title': 'Вещая Судьба', 'file': '../../../../../../../Test/Music/А.Розенбаум/1986 - 1988 - Былое/Вещая судьба.mp3'},
  {'icon': iconImage, 'title': 'Воспоминание О Будущем', 'file': '../../../../../../../Test/Music/А.Розенбаум/1984 - Концерт в Воркуте/Воспоминание о будущем.mp3'},
  {'icon': iconImage, 'title': 'Глаза Твои', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/2001-Любви желанная пора/Глаза твои.mp3'},
  {'icon': iconImage, 'title': 'Глухари', 'file': '../../../../../../../Test/Music/А.Розенбаум/1983 - Новые песни/Глухари .mp3'},
  {'icon': iconImage, 'title': 'Дай Бог', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/2003-Звезды российской эстрады 2CD/Дай Бог.mp3'},
  {'icon': iconImage, 'title': 'Дай Бог', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/А.Малинин/Дай бог.mp3'},
  {'icon': iconImage, 'title': 'Дело Было В Ресторане', 'file': '../../../../../../../Test/Music/А.Розенбаум/1983 - Новые песни/Дело было в ресторане.mp3'},
  {'icon': iconImage, 'title': 'Дорогой Длинною', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/2007-Романсы/Дорогой Длинною.mp3'},
  {'icon': iconImage, 'title': 'Есаул Молоденький', 'file': '../../../../../../../Test/Music/А.Розенбаум/1987 - Концерт в Нью-Йорке/Есаул молоденький.mp3'},
  {'icon': iconImage, 'title': 'Забава', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/2003-Звезды российской эстрады 2CD/Забава.mp3'},
  {'icon': iconImage, 'title': 'Заходите К Нам На Огонек', 'file': '../../../../../../../Test/Music/А.Розенбаум/1987 - Концерт в Нью-Йорке/Заходите к нам на огонек.mp3'},
  {'icon': iconImage, 'title': 'Зачем Я Влюбился', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/2003-Старинные русские романсы/Зачем я влюбился.mp3'},
  {'icon': iconImage, 'title': 'Звезда', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/А.Малинин/Звезда.mp3'},
  {'icon': iconImage, 'title': 'Зойка', 'file': '../../../../../../../Test/Music/А.Розенбаум/1983 - Новые песни/Зойка.mp3'},
  {'icon': iconImage, 'title': 'Извозчик', 'file': '../../../../../../../Test/Music/А.Розенбаум/1982 - Концерт, посвященный памяти А. Северного/Извозчик .mp3'},
  {'icon': iconImage, 'title': 'Казачья', 'file': '../../../../../../../Test/Music/А.Розенбаум/1983 - Новые песни/Казачья.mp3'},
  {'icon': iconImage, 'title': 'Как На Гриф Резной ', 'file': '../../../../../../../Test/Music/А.Розенбаум/1983 - Новые песни/Как на гриф резной....mp3'},
  {'icon': iconImage, 'title': 'Камикадзе', 'file': '../../../../../../../Test/Music/А.Розенбаум/1996 - Концерт в день рождения/Камикадзе.WAV'},
  {'icon': iconImage, 'title': 'Красная Стена', 'file': '../../../../../../../Test/Music/А.Розенбаум/1986 - 1988 - Былое/Красная стена .mp3'},
  {'icon': iconImage, 'title': 'Кубанская Казачья', 'file': '../../../../../../../Test/Music/А.Розенбаум/1986 - 1988 - Былое/Кубанская казачья.mp3'},
  {'icon': iconImage, 'title': 'Лесосплав', 'file': '../../../../../../../Test/Music/А.Розенбаум/1983 - Новые песни/Лесосплав.mp3'},
  {'icon': iconImage, 'title': 'Любви Желанная Пора', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/2001-Любви желанная пора/Любви желанная пора.mp3'},
  {'icon': iconImage, 'title': 'Любви Желанная Пора', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/А.Малинин/Любви желанная пора.mp3'},
  {'icon': iconImage, 'title': 'Майдан', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/А.Малинин/Майдан.mp3'},
  {'icon': iconImage, 'title': 'Милый Голубь', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/А.Малинин/Милый голубь.mp3'},
  {'icon': iconImage, 'title': 'Мольбa', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/1991-Поручик Голицын/Мольбa.mp3'},
  {'icon': iconImage, 'title': 'Мольбa', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/А.Малинин/Мольбa.mp3'},
  {'icon': iconImage, 'title': 'На Улице Марата', 'file': '../../../../../../../Test/Music/А.Розенбаум/1983 - Новые песни/На улице Марата.mp3'},
  {'icon': iconImage, 'title': 'Надоело', 'file': '../../../../../../../Test/Music/А.Розенбаум/Надоело.mp3'},
  {'icon': iconImage, 'title': 'Налетела Грусть', 'file': '../../../../../../../Test/Music/А.Розенбаум/1986 - 1988 - Былое/Налетела грусть.mp3'},
  {'icon': iconImage, 'title': 'Напрасные Слова', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/1991-Поручик Голицын/Напрасные слова.mp3'},
  {'icon': iconImage, 'title': 'Напрасные Слова', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/А.Малинин/Напрасные слова.mp3'},
  {'icon': iconImage, 'title': 'Незнакомка', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/А.Малинин/Незнакомка.mp3'},
  {'icon': iconImage, 'title': 'Незнакомка', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/2001-Любви желанная пора/Незнакомка.mp3'},
  {'icon': iconImage, 'title': 'Нету Времени', 'file': '../../../../../../../Test/Music/А.Розенбаум/1983 - Посвящение посвящающим/Нету времени .mp3'},
  {'icon': iconImage, 'title': 'Нищая', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/2003-Старинные русские романсы/Нищая.mp3'},
  {'icon': iconImage, 'title': 'Ночь', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/1994-Бал/Ночь.mp3'},
  {'icon': iconImage, 'title': 'Отслужи По Мне Отслужи', 'file': '../../../../../../../Test/Music/А.Розенбаум/1986 - 1988 - Былое/Отслужи по мне, отслужи.mp3'},
  {'icon': iconImage, 'title': 'Пaрутчик Галицин', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/А.Малинин/Пaрутчик Галицин.mp3'},
  {'icon': iconImage, 'title': 'Пoэт', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/2003-Звезды российской эстрады 2CD/Пoэт.mp3'},
  {'icon': iconImage, 'title': 'Парутчик Галицин', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/А.Малинин/Парутчик Галицин.mp3'},
  {'icon': iconImage, 'title': 'Песня Коня Цыганских Кровей', 'file': '../../../../../../../Test/Music/А.Розенбаум/1983 - Новые песни/Песня коня цыганских кровей.mp3'},
  {'icon': iconImage, 'title': 'По Снегу Летящему С Неба', 'file': '../../../../../../../Test/Music/А.Розенбаум/1983 - Новые песни/По снегу, летящему с неба.mp3'},
  {'icon': iconImage, 'title': 'Помни И Не Забывай', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/2001-Берега/Помни и не забывай.mp3'},
  {'icon': iconImage, 'title': 'Поручик Голицын', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/1991-Поручик Голицын/Поручик Голицын.mp3'},
  {'icon': iconImage, 'title': 'Посвящение Посвящающим', 'file': '../../../../../../../Test/Music/А.Розенбаум/1983 - Посвящение посвящающим/Посвящение посвящающим.mp3'},
  {'icon': iconImage, 'title': 'Послепобедный Вальс', 'file': '../../../../../../../Test/Music/А.Розенбаум/1986 - 1988 - Былое/Послепобедный вальс.mp3'},
  {'icon': iconImage, 'title': 'Поэт', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/2003-Звезды российской эстрады 2CD/Поэт.mp3'},
  {'icon': iconImage, 'title': 'Проводи Ка Меня Батя На Войну', 'file': '../../../../../../../Test/Music/А.Розенбаум/1987 - Концерт на ЛОМО/Проводи-ка меня, батя, на войну.mp3'},
  {'icon': iconImage, 'title': 'Проводы', 'file': '../../../../../../../Test/Music/А.Розенбаум/1986 - 1988 - Былое/Проводы .mp3'},
  {'icon': iconImage, 'title': 'Прости Прощай', 'file': '../../../../../../../Test/Music/А.Розенбаум/1983 - Посвящение посвящающим/Прости-прощай.mp3'},
  {'icon': iconImage, 'title': 'Пугачев', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/А.Малинин/Пугачев.mp3'},
  {'icon': iconImage, 'title': 'Пугачев', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/2001-Любви желанная пора/Пугачев.mp3'},
  {'icon': iconImage, 'title': 'Разговор Подслушанный В Электричке Ленинград Мга', 'file': '../../../../../../../Test/Music/А.Розенбаум/1983 - Новые песни/Разговор, подслушанный в электричке Ленинград-МГА.mp3'},
  {'icon': iconImage, 'title': 'Распутин', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/2004-Лучшее 2-CD/Распутин.mp3'},
  {'icon': iconImage, 'title': 'Реквием', 'file': '../../../../../../../Test/Music/А.Розенбаум/1983 - Новые песни/Реквием.mp3'},
  {'icon': iconImage, 'title': 'Рождение Стихов', 'file': '../../../../../../../Test/Music/А.Розенбаум/1987 - Концерт на ЛОМО/Рождение стихов.mp3'},
  {'icon': iconImage, 'title': 'Романс Генерала Чарноты', 'file': '../../../../../../../Test/Music/А.Розенбаум/1983 - Новые песни/Романс генерала Чарноты.mp3'},
  {'icon': iconImage, 'title': 'Свадьба', 'file': '../../../../../../../Test/Music/А.Розенбаум/1983 - Новые песни/Свадьба.mp3'},
  {'icon': iconImage, 'title': 'Ти Ж Мене Підманула', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/2007-Чарiвна скрипка/Ти ж мене підманула.mp3'},
  {'icon': iconImage, 'title': 'Ты Не Любишь Меня Милый Голубь', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/2001-Любви желанная пора/Ты не любишь меня, милый голубь.mp3'},
  {'icon': iconImage, 'title': 'Утиная Охота', 'file': '../../../../../../../Test/Music/А.Розенбаум/1983 - Новые песни/Утиная охота.mp3'},
  {'icon': iconImage, 'title': 'Ямщик', 'file': '../../../../../../../Test/Music/А.Розенбаум/А. Малинин/2003-Старинные русские романсы/Ямщик.mp3'},
]);
})

document.getElementById('агатакристи').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Viva Kalma', 'file': '../../../../../../../Test/Music/Агата Кристи/1989 - Коварство и любовь/Viva Kalma.mp3'},
  {'icon': iconImage, 'title': 'Второй Фронт', 'file': '../../../../../../../Test/Music/Агата Кристи/1988 - Второй фронт/Второй фронт.mp3'},
  {'icon': iconImage, 'title': 'Два Корабля', 'file': '../../../../../../../Test/Music/Агата Кристи/1996 - Ураган/Два корабля.mp3'},
  {'icon': iconImage, 'title': 'Как На Войне', 'file': '../../../../../../../Test/Music/Агата Кристи/1993 - Позорная звезда/Как на войне.mp3'},
  {'icon': iconImage, 'title': 'Легион', 'file': '../../../../../../../Test/Music/Агата Кристи/1996 - Ураган/Легион.mp3'},
  {'icon': iconImage, 'title': 'Сказочная Тайга', 'file': '../../../../../../../Test/Music/Агата Кристи/1994 - Опиум/Сказочная тайга.mp3'},
  {'icon': iconImage, 'title': 'Сны', 'file': '../../../../../../../Test/Music/Агата Кристи/1998 - Чудеса/Сны.mp3'},
  {'icon': iconImage, 'title': 'Собачье Сердце', 'file': '../../../../../../../Test/Music/Агата Кристи/1989 - Коварство и любовь/Собачье сердце.mp3'},
  {'icon': iconImage, 'title': 'Черная Луна', 'file': '../../../../../../../Test/Music/Агата Кристи/1994 - Опиум/Черная Луна.mp3'},
]);
})

document.getElementById('алиса').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Веретено', 'file': '../../../../../../../Test/Music/Алиса/2001 - Танцевать/Веретено.mp3'},
  {'icon': iconImage, 'title': 'Вор И Палач', 'file': '../../../../../../../Test/Music/Алиса/1984 - Нерная ночь/Вор и палач.mp3'},
  {'icon': iconImage, 'title': 'Все Решено', 'file': '../../../../../../../Test/Music/Алиса/1998 - Пляс Сибири на берегу Невы/Все решено.mp3'},
  {'icon': iconImage, 'title': 'Дождь', 'file': '../../../../../../../Test/Music/Алиса/1996 - Jazz/Дождь.mp3'},
  {'icon': iconImage, 'title': 'Доктор Франкенштейн', 'file': '../../../../../../../Test/Music/Алиса/1984 - Нерная ночь/Доктор Франкенштейн.mp3'},
  {'icon': iconImage, 'title': 'Душа', 'file': '../../../../../../../Test/Music/Алиса/2003 - Сейчас позднее чем  ты думаеш/Душа.mp3'},
  {'icon': iconImage, 'title': 'Емеля', 'file': '../../../../../../../Test/Music/Алиса/2005 - Мы вместе 20лет/Емеля.mp3'},
  {'icon': iconImage, 'title': 'Мама', 'file': '../../../../../../../Test/Music/Алиса/1997 - Дурень/Мама.mp3'},
  {'icon': iconImage, 'title': 'Меломан', 'file': '../../../../../../../Test/Music/Алиса/2002 - Акустика/Меломан.mp3'},
  {'icon': iconImage, 'title': 'Моё Покаление', 'file': '../../../../../../../Test/Music/Алиса/Моё покаление.WAV'},
  {'icon': iconImage, 'title': 'Папа Тани', 'file': '../../../../../../../Test/Music/Алиса/1985 - Акустика I/Папа Тани.mp3'},
  {'icon': iconImage, 'title': 'Перекресток', 'file': '../../../../../../../Test/Music/Алиса/1996 - Jazz/Перекресток.mp3'},
  {'icon': iconImage, 'title': 'Родина', 'file': '../../../../../../../Test/Music/Алиса/2003 - Сейчас позднее чем  ты думаеш/Родина.mp3'},
  {'icon': iconImage, 'title': 'Сказка', 'file': '../../../../../../../Test/Music/Алиса/1986 - Поколение X/Сказка.mp3'},
  {'icon': iconImage, 'title': 'Споконая Ночь', 'file': '../../../../../../../Test/Music/Алиса/1998 - Пляс Сибири на берегу Невы/Споконая ночь.mp3'},
  {'icon': iconImage, 'title': 'Танец На Палубе', 'file': '../../../../../../../Test/Music/Алиса/1990 - Ст.206 ч.2/Танец на палубе.mp3'},
  {'icon': iconImage, 'title': 'Театр', 'file': '../../../../../../../Test/Music/Алиса/1993 - Для тех, кто свалился с луны/Театр.mp3'},
  {'icon': iconImage, 'title': 'Траса Е 95', 'file': '../../../../../../../Test/Music/Алиса/1997 - Дурень/Траса Е-95.mp3'},
]);
})

document.getElementById('ария').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Ангельская Пыль', 'file': '../../../../../../../Test/Music/Ария/2002 - Штиль/Ангельская пыль.mp3'},
  {'icon': iconImage, 'title': 'Антихрист', 'file': '../../../../../../../Test/Music/Ария/1991 - Кровь за кровь/Антихрист.mp3'},
  {'icon': iconImage, 'title': 'Беги За Солнцем', 'file': '../../../../../../../Test/Music/Ария/1998 - Генератор Зла/Беги за солнцем.mp3'},
  {'icon': iconImage, 'title': 'Без Тебя', 'file': '../../../../../../../Test/Music/Ария/1999 -  2000 И Одна Ночь/Без тебя.mp3'},
  {'icon': iconImage, 'title': 'Беспечный Ангел', 'file': '../../../../../../../Test/Music/Ария/2002 - Штиль/Беспечный ангел.mp3'},
  {'icon': iconImage, 'title': 'Бесы', 'file': '../../../../../../../Test/Music/Ария/1991 - Кровь за кровь/Бесы.mp3'},
  {'icon': iconImage, 'title': 'Возьми Моё Сердце', 'file': '../../../../../../../Test/Music/Ария/1995 - Ночь Короче Дня/Возьми моё сердце.mp3'},
  {'icon': iconImage, 'title': 'Возьми Моё Сердце', 'file': '../../../../../../../Test/Music/Ария/1999 -  2000 И Одна Ночь/Возьми моё сердце.mp3'},
  {'icon': iconImage, 'title': 'Воля И Разум', 'file': '../../../../../../../Test/Music/Ария/1986 - С Кем Ты/Воля и разум.mp3'},
  {'icon': iconImage, 'title': 'Все Что Было', 'file': '../../../../../../../Test/Music/Ария/1991 - Кровь за кровь/Все что было.mp3'},
  {'icon': iconImage, 'title': 'Герой Асфальта', 'file': '../../../../../../../Test/Music/Ария/2002 - Штиль/Герой асфальта.mp3'},
  {'icon': iconImage, 'title': 'Герой Асфальта', 'file': '../../../../../../../Test/Music/Ария/2003 - Путь наверх 2/Герой асфальта.mp3'},
  {'icon': iconImage, 'title': 'Грязь', 'file': '../../../../../../../Test/Music/Ария/1999 -  2000 И Одна Ночь/Грязь.mp3'},
  {'icon': iconImage, 'title': 'Дай Руку Мне', 'file': '../../../../../../../Test/Music/Ария/2002 - Штиль/Дай руку мне.mp3'},
  {'icon': iconImage, 'title': 'Дезертир', 'file': '../../../../../../../Test/Music/Ария/1998 - Генератор Зла/Дезертир.mp3'},
  {'icon': iconImage, 'title': 'Закат', 'file': '../../../../../../../Test/Music/Ария/1999 -  2000 И Одна Ночь/Закат.mp3'},
  {'icon': iconImage, 'title': 'Искушение', 'file': '../../../../../../../Test/Music/Ария/1989 - Игра С Огнём/Искушение.mp3'},
  {'icon': iconImage, 'title': 'Колизей', 'file': '../../../../../../../Test/Music/Ария/Колизей/Колизей.mp3'},
  {'icon': iconImage, 'title': 'Кровь За Кровь', 'file': '../../../../../../../Test/Music/Ария/1991 - Кровь за кровь/Кровь за кровь.mp3'},
  {'icon': iconImage, 'title': 'Кто Ты', 'file': '../../../../../../../Test/Music/Ария/1999 -  2000 И Одна Ночь/Кто ты .mp3'},
  {'icon': iconImage, 'title': 'Мечты', 'file': '../../../../../../../Test/Music/Ария/1999 -  2000 И Одна Ночь/Мечты.mp3'},
  {'icon': iconImage, 'title': 'Осколок Льда', 'file': '../../../../../../../Test/Music/Ария/2001 - Химера/Осколок льда.mp3'},
  {'icon': iconImage, 'title': 'Потерянный Рай', 'file': '../../../../../../../Test/Music/Ария/1999 -  2000 И Одна Ночь/Потерянный рай.mp3'},
  {'icon': iconImage, 'title': 'Пробил Час', 'file': '../../../../../../../Test/Music/Ария/2002 - Штиль/Пробил час.mp3'},
  {'icon': iconImage, 'title': 'Путь Наверх', 'file': '../../../../../../../Test/Music/Ария/1997 - Cмутное Время/Путь наверх.mp3'},
  {'icon': iconImage, 'title': 'Путь Наверх', 'file': '../../../../../../../Test/Music/Ария/2003 - Путь наверх 1/Путь наверх.mp3'},
  {'icon': iconImage, 'title': 'Раскачаем Этот Мир', 'file': '../../../../../../../Test/Music/Ария/1989 - Игра С Огнём/Раскачаем этот мир.mp3'},
  {'icon': iconImage, 'title': 'Свобода', 'file': '../../../../../../../Test/Music/Ария/2002 - Штиль/Свобода.mp3'},
  {'icon': iconImage, 'title': 'Смутное Время', 'file': '../../../../../../../Test/Music/Ария/2004 - Вавилон/Смутное время.mp3'},
  {'icon': iconImage, 'title': 'Тореро', 'file': '../../../../../../../Test/Music/Ария/1985 - Мания Величия/Тореро.mp3'},
  {'icon': iconImage, 'title': 'Улица Роз', 'file': '../../../../../../../Test/Music/Ария/1999 -  2000 И Одна Ночь/Улица Роз.mp3'},
  {'icon': iconImage, 'title': 'Химера', 'file': '../../../../../../../Test/Music/Ария/2001 - Химера/Химера.mp3'},
  {'icon': iconImage, 'title': 'Штиль', 'file': '../../../../../../../Test/Music/Ария/2001 - Химера/Штиль.mp3'},
  {'icon': iconImage, 'title': 'Я Здесь', 'file': '../../../../../../../Test/Music/Ария/2005 - Реки времен/Я здесь.mp3'},
  {'icon': iconImage, 'title': 'Я Свободен', 'file': '../../../../../../../Test/Music/Ария/2004 - Вавилон/Я свободен.mp3'},
]);
})

document.getElementById('би-2').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Варвара', 'file': '../../../../../../../Test/Music/Би - 2/2000 - БИ-2/Варвара.mp3'},
  {'icon': iconImage, 'title': 'Волки', 'file': '../../../../../../../Test/Music/Би - 2/Волки.mp3'},
  {'icon': iconImage, 'title': 'Мой Рок Н Ролл', 'file': '../../../../../../../Test/Music/Би - 2/Мой рок-н-ролл.mp3'},
  {'icon': iconImage, 'title': 'Остаться В Живых', 'file': '../../../../../../../Test/Music/Би - 2/Мяу Кисс МИ/Остаться В Живых.mp3'},
  {'icon': iconImage, 'title': 'Полковнику Никто Не Пишет', 'file': '../../../../../../../Test/Music/Би - 2/2000 - БИ-2/Полковнику никто не пишет.mp3'},
  {'icon': iconImage, 'title': 'Полковнику Никто Не Пишет В Hd', 'file': '../../../../../../../Test/Music/Би - 2/Полковнику никто не пишет в HD.mp4'},
  {'icon': iconImage, 'title': 'Серебро', 'file': '../../../../../../../Test/Music/Би - 2/2000 - БИ-2/Серебро.mp3'},
  {'icon': iconImage, 'title': 'Счастье', 'file': '../../../../../../../Test/Music/Би - 2/2000 - БИ-2/Счастье.mp3'},
  {'icon': iconImage, 'title': 'Феллини', 'file': '../../../../../../../Test/Music/Би - 2/Феллини.mp3'},
]);
})

document.getElementById('браво').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Ветер Знает ', 'file': '../../../../../../../Test/Music/Браво/1995 - Ветер Знает/Ветер знает....mp3'},
  {'icon': iconImage, 'title': 'Дорога В Облака', 'file': '../../../../../../../Test/Music/Браво/1994 - Дорога в Облака/Дорога в облака.mp3'},
  {'icon': iconImage, 'title': 'Замок Из Песка', 'file': '../../../../../../../Test/Music/Браво/1994 - Дорога в Облака/Замок из песка.mp3'},
  {'icon': iconImage, 'title': 'Кошки', 'file': '../../../../../../../Test/Music/Браво/1983-88 - Жанна Агузарова и Браво/Кошки.mp3'},
  {'icon': iconImage, 'title': 'Ленинградский Рок Н Рол', 'file': '../../../../../../../Test/Music/Браво/1999 - Grand Collection/Ленинградский рок-н-рол.mp3'},
  {'icon': iconImage, 'title': 'Лучший Город Земли', 'file': '../../../../../../../Test/Music/Браво/1994 - Дорога в Облака/Лучший город земли.mp3'},
  {'icon': iconImage, 'title': 'Любите Девушки', 'file': '../../../../../../../Test/Music/Браво/1994 - Дорога в Облака/Любите девушки.mp3'},
  {'icon': iconImage, 'title': 'Московский Бит', 'file': '../../../../../../../Test/Music/Браво/1999 - Grand Collection/Московский бит.mp3'},
  {'icon': iconImage, 'title': 'Пилот 12 45', 'file': '../../../../../../../Test/Music/Браво/1994 - Live In Moscow/Пилот 12-45.mp3'},
  {'icon': iconImage, 'title': 'Старый Отель', 'file': '../../../../../../../Test/Music/Браво/1983-88 - Жанна Агузарова и Браво/Старый отель.mp3'},
  {'icon': iconImage, 'title': 'Черный Кот', 'file': '../../../../../../../Test/Music/Браво/1995 - Песни Разных Лет/Черный кот.mp3'},
  {'icon': iconImage, 'title': 'Чудесная Страна', 'file': '../../../../../../../Test/Music/Браво/1994 - Live In Moscow/Чудесная страна.mp3'},
  {'icon': iconImage, 'title': 'Этот Город', 'file': '../../../../../../../Test/Music/Браво/1995 - Ветер Знает/Этот город.mp3'},
]);
})

document.getElementById('в.токарев').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'В Шумном Балагане', 'file': '../../../../../../../Test/Music/В.Токарев/1981 - В шумном балагане/В шумном балагане.mp3'},
  {'icon': iconImage, 'title': 'Мамая Сын Твой', 'file': '../../../../../../../Test/Music/В.Токарев/1985 - С Днем рожденья, милая мама/Мама,я сын твой.mp3'},
  {'icon': iconImage, 'title': 'Над Гудзоном', 'file': '../../../../../../../Test/Music/В.Токарев/1983 - Над Гудзоном/Над Гудзоном.mp3'},
  {'icon': iconImage, 'title': 'Нью Йоркский Таксист', 'file': '../../../../../../../Test/Music/В.Токарев/1981 - В шумном балагане/Нью-йоркский таксист.mp3'},
  {'icon': iconImage, 'title': 'Придурок Ненормальный', 'file': '../../../../../../../Test/Music/В.Токарев/1981 - В шумном балагане/Придурок ненормальный.mp3'},
  {'icon': iconImage, 'title': 'Ростовский Урка', 'file': '../../../../../../../Test/Music/В.Токарев/1981 - В шумном балагане/Ростовский урка.mp3'},
  {'icon': iconImage, 'title': 'С Днём Рождения Милая Мама', 'file': '../../../../../../../Test/Music/В.Токарев/1985 - С Днем рожденья, милая мама/С Днём рождения милая мама.mp3'},
  {'icon': iconImage, 'title': 'Чубчик Кучерявый', 'file': '../../../../../../../Test/Music/В.Токарев/1983 - Над Гудзоном/Чубчик Кучерявый.mp3'},
]);
})

document.getElementById('високосныйгод').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '16 37', 'file': '../../../../../../../Test/Music/Високосный год/16.37 .mp3'},
  {'icon': iconImage, 'title': 'Кино', 'file': '../../../../../../../Test/Music/Високосный год/Кино.mp3'},
  {'icon': iconImage, 'title': 'Лучшая Песня О Любви', 'file': '../../../../../../../Test/Music/Високосный год/Лучшая песня о любви.mp3'},
  {'icon': iconImage, 'title': 'Метро', 'file': '../../../../../../../Test/Music/Високосный год/Метро.mp3'},
  {'icon': iconImage, 'title': 'Тихий Огонёк', 'file': '../../../../../../../Test/Music/Високосный год/Тихий огонёк.mp3'},
  {'icon': iconImage, 'title': 'Шестой День Осени', 'file': '../../../../../../../Test/Music/Високосный год/Шестой день осени.mp3'},
]);
})

document.getElementById('гроб').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Все Как У Людей', 'file': '../../../../../../../Test/Music/Гроб/Все как у людей.mp3'},
  {'icon': iconImage, 'title': 'Запретный Плод', 'file': '../../../../../../../Test/Music/Гроб/Запретный Плод.mp3'},
  {'icon': iconImage, 'title': 'Здорово И Вечно', 'file': '../../../../../../../Test/Music/Гроб/Здорово и вечно.mp3'},
  {'icon': iconImage, 'title': 'Зоопарк', 'file': '../../../../../../../Test/Music/Гроб/Зоопарк.mp3'},
  {'icon': iconImage, 'title': 'Мне Насрать На Мое Лицо', 'file': '../../../../../../../Test/Music/Гроб/Мне насрать на мое лицо.mp3'},
  {'icon': iconImage, 'title': 'Моя Оборона', 'file': '../../../../../../../Test/Music/Гроб/Моя оборона.mp3'},
  {'icon': iconImage, 'title': 'Никто Не Хотел Умирать', 'file': '../../../../../../../Test/Music/Гроб/Никто не хотел умирать.mp3'},
  {'icon': iconImage, 'title': 'Оптимизм', 'file': '../../../../../../../Test/Music/Гроб/Оптимизм.mp3'},
  {'icon': iconImage, 'title': 'Отряд Не Заметил Потери Бойца', 'file': '../../../../../../../Test/Music/Гроб/Отряд не заметил потери бойца.mp3'},
  {'icon': iconImage, 'title': 'Поезда', 'file': '../../../../../../../Test/Music/Гроб/Поезда.mp3'},
  {'icon': iconImage, 'title': 'Про Дурачка', 'file': '../../../../../../../Test/Music/Гроб/Про Дурачка.mp3'},
  {'icon': iconImage, 'title': 'Солдатами Не Рождаются', 'file': '../../../../../../../Test/Music/Гроб/Солдатами не рождаются.mp3'},
  {'icon': iconImage, 'title': 'Суицид', 'file': '../../../../../../../Test/Music/Гроб/Суицид.mp3'},
]);
})

document.getElementById('жванецкий').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'В Нашей Жизни Что Хорошо', 'file': '../../../../../../../Test/Music/Жванецкий/В нашей жизни что хорошо.mp3'},
  {'icon': iconImage, 'title': 'Добились Чего Хотели', 'file': '../../../../../../../Test/Music/Жванецкий/Добились чего хотели.mp3'},
  {'icon': iconImage, 'title': 'Жванецкий', 'file': '../../../../../../../Test/Music/Жванецкий/Жванецкий.mp3'},
  {'icon': iconImage, 'title': 'Интервью', 'file': '../../../../../../../Test/Music/Жванецкий/Интервью.mp3'},
  {'icon': iconImage, 'title': 'Начальник Транспортного Цеха', 'file': '../../../../../../../Test/Music/Жванецкий/Начальник транспортного цеха.MP3'},
  {'icon': iconImage, 'title': 'Перекличка', 'file': '../../../../../../../Test/Music/Жванецкий/Перекличка.mp3'},
  {'icon': iconImage, 'title': 'Рассказ Тети Клары', 'file': '../../../../../../../Test/Music/Жванецкий/Рассказ тети Клары.mp3'},
  {'icon': iconImage, 'title': 'Расстройство', 'file': '../../../../../../../Test/Music/Жванецкий/Расстройство.mp3'},
  {'icon': iconImage, 'title': 'Стили Спора', 'file': '../../../../../../../Test/Music/Жванецкий/Стили спора.mp3'},
  {'icon': iconImage, 'title': 'Сцена В Метро', 'file': '../../../../../../../Test/Music/Жванецкий/Сцена в Метро.mp3'},
  {'icon': iconImage, 'title': 'Там Хорошо Где Нас Нет', 'file': '../../../../../../../Test/Music/Жванецкий/Там хорошо где нас нет.mp3'},
]);
})

document.getElementById('земфира').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Webgirl', 'file': '../../../../../../../Test/Music/Земфира/2002 - Четырнадцать недель тишины/Webgirl.mp3'},
  {'icon': iconImage, 'title': 'Аривидерчи', 'file': '../../../../../../../Test/Music/Земфира/1999 - Zемфира/Аривидерчи.mp3'},
  {'icon': iconImage, 'title': 'Бесконечность', 'file': '../../../../../../../Test/Music/Земфира/2002 - Четырнадцать недель тишины/Бесконечность.mp3'},
  {'icon': iconImage, 'title': 'До Свидания', 'file': '../../../../../../../Test/Music/Земфира/1999 - До свидания/До свидания.mp3'},
  {'icon': iconImage, 'title': 'Искала', 'file': '../../../../../../../Test/Music/Земфира/2000 - Прости меня моя любовь/Искала.mp3'},
  {'icon': iconImage, 'title': 'Прости Меня Моя Любовь', 'file': '../../../../../../../Test/Music/Земфира/2000 - Прости меня моя любовь/Прости меня моя любовь.mp3'},
  {'icon': iconImage, 'title': 'Хочешь', 'file': '../../../../../../../Test/Music/Земфира/2000 - Прости меня моя любовь/Хочешь.mp3'},
]);
})

document.getElementById('и.корнелюк').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Билет На Балет', 'file': '../../../../../../../Test/Music/И. Корнелюк/1989 - Билет на балет/Билет на балет.mp3'},
  {'icon': iconImage, 'title': 'Будем Танцевать', 'file': '../../../../../../../Test/Music/И. Корнелюк/1990 - Подожди/Будем танцевать.mp3'},
  {'icon': iconImage, 'title': 'Возвращайся!', 'file': '../../../../../../../Test/Music/И. Корнелюк/1989 - Билет на балет/Возвращайся!.mp3'},
  {'icon': iconImage, 'title': 'Город Которого Нет', 'file': '../../../../../../../Test/Music/И. Корнелюк/2001 - Бандитский Петербург/Город, которого нет.mp3'},
  {'icon': iconImage, 'title': 'Дожди', 'file': '../../../../../../../Test/Music/И. Корнелюк/1990 - Подожди/Дожди.mp3'},
  {'icon': iconImage, 'title': 'Маленький Дом', 'file': '../../../../../../../Test/Music/И. Корнелюк/1990 - Подожди/Маленький дом.mp3'},
  {'icon': iconImage, 'title': 'Мало Ли', 'file': '../../../../../../../Test/Music/И. Корнелюк/1989 - Билет на балет/Мало ли.mp3'},
  {'icon': iconImage, 'title': 'Месяц Май', 'file': '../../../../../../../Test/Music/И. Корнелюк/1990 - Подожди/Месяц май.mp3'},
  {'icon': iconImage, 'title': 'Пора Домой', 'file': '../../../../../../../Test/Music/И. Корнелюк/2001 - Любимые песни/Пора домой.mp3'},
]);
})

document.getElementById('кино').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Алюминиевые Огурцы', 'file': '../../../../../../../Test/Music/КИНО/1982 - 45/Алюминиевые Огурцы.mp3'},
  {'icon': iconImage, 'title': 'В Наших Глазах', 'file': '../../../../../../../Test/Music/КИНО/1988 - Группа крови/В наших глазах.mp3'},
  {'icon': iconImage, 'title': 'Видели Ночь', 'file': '../../../../../../../Test/Music/КИНО/2000 - История этого мира/Видели ночь.mp3'},
  {'icon': iconImage, 'title': 'Война', 'file': '../../../../../../../Test/Music/КИНО/1989 - Последний герой/Война.mp3'},
  {'icon': iconImage, 'title': 'Восьмиклассница', 'file': '../../../../../../../Test/Music/КИНО/1987 - Aкустический концерт/Восьмиклассница.mp3'},
  {'icon': iconImage, 'title': 'Генерал', 'file': '../../../../../../../Test/Music/КИНО/1987 - Aкустический концерт/Генерал.mp3'},
  {'icon': iconImage, 'title': 'Группа Крови', 'file': '../../../../../../../Test/Music/КИНО/2000 - История этого мира/Группа крови.mp3'},
  {'icon': iconImage, 'title': 'Дальше Действовать Будем Мы', 'file': '../../../../../../../Test/Music/КИНО/1988 - Группа крови/Дальше действовать будем мы.mp3'},
  {'icon': iconImage, 'title': 'Дождь Для Нас', 'file': '../../../../../../../Test/Music/КИНО/1983 - 46/Дождь для нас.mp3'},
  {'icon': iconImage, 'title': 'Закрой За Мной Дверь Я Ухожу', 'file': '../../../../../../../Test/Music/КИНО/1988 - Группа крови/Закрой за мной дверь, я ухожу.mp3'},
  {'icon': iconImage, 'title': 'Звезда', 'file': '../../../../../../../Test/Music/КИНО/1990 - Черный альбом/Звезда.mp3'},
  {'icon': iconImage, 'title': 'Звезда По Имени Солнце', 'file': '../../../../../../../Test/Music/КИНО/1989 - Звезда по имени Солнце/Звезда по имени Солнце.MP3'},
  {'icon': iconImage, 'title': 'Каждую Ночь', 'file': '../../../../../../../Test/Music/КИНО/1984 - Начальник камчатки/Каждую ночь.mp3'},
  {'icon': iconImage, 'title': 'Когда Твоя Девушка Больна', 'file': '../../../../../../../Test/Music/КИНО/1990 - Черный альбом/Когда твоя девушка больна.mp3'},
  {'icon': iconImage, 'title': 'Кончится Лето', 'file': '../../../../../../../Test/Music/КИНО/2000 - История этого мира/Кончится лето.mp3'},
  {'icon': iconImage, 'title': 'Красно Желтые Дни', 'file': '../../../../../../../Test/Music/КИНО/1990 - Черный альбом/Красно-желтые дни.mp3'},
  {'icon': iconImage, 'title': 'Кукушка', 'file': '../../../../../../../Test/Music/КИНО/2000 - История этого мира/Кукушка.mp3'},
  {'icon': iconImage, 'title': 'Легенда', 'file': '../../../../../../../Test/Music/КИНО/1988 - Группа крови/Легенда.mp3'},
  {'icon': iconImage, 'title': 'Мама Анархия', 'file': '../../../../../../../Test/Music/КИНО/1987 - Aкустический концерт/Мама Анархия.mp3'},
  {'icon': iconImage, 'title': 'Место Для Шага Вперед', 'file': '../../../../../../../Test/Music/КИНО/1989 - Звезда по имени Солнце/Место для шага вперед.mp3'},
  {'icon': iconImage, 'title': 'Музыка Волн', 'file': '../../../../../../../Test/Music/КИНО/1987 - Aкустический концерт/Музыка волн.mp3'},
  {'icon': iconImage, 'title': 'Муравейник', 'file': '../../../../../../../Test/Music/КИНО/1990 - Черный альбом/Муравейник.mp3'},
  {'icon': iconImage, 'title': 'Пачка Сигарет', 'file': '../../../../../../../Test/Music/КИНО/2000 - История этого мира/Пачка сигарет.mp3'},
  {'icon': iconImage, 'title': 'Перемен', 'file': '../../../../../../../Test/Music/КИНО/2000 - История этого мира/Перемен.mp3'},
  {'icon': iconImage, 'title': 'Песня Без Слов', 'file': '../../../../../../../Test/Music/КИНО/2000 - История этого мира/Песня без слов.mp3'},
  {'icon': iconImage, 'title': 'Печаль', 'file': '../../../../../../../Test/Music/КИНО/2000 - История этого мира/Печаль.mp3'},
  {'icon': iconImage, 'title': 'Последний Герой', 'file': '../../../../../../../Test/Music/КИНО/1989 - Последний герой/Последний герой.mp3'},
  {'icon': iconImage, 'title': 'Следи За Собой', 'file': '../../../../../../../Test/Music/КИНО/2000 - История этого мира/Следи за собой.mp3'},
  {'icon': iconImage, 'title': 'Спокойная Ночь', 'file': '../../../../../../../Test/Music/КИНО/2000 - История этого мира/Спокойная ночь.mp3'},
  {'icon': iconImage, 'title': 'Стук', 'file': '../../../../../../../Test/Music/КИНО/1989 - Звезда по имени Солнце/Стук.mp3'},
  {'icon': iconImage, 'title': 'Троллейбус', 'file': '../../../../../../../Test/Music/КИНО/2000 - История этого мира/Троллейбус.mp3'},
]);
})

document.getElementById('клипы').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A Gift Of A Thistle', 'file': '../../../../../../../Test/Music/Клипы/A Gift of a Thistle.mp4'},
  {'icon': iconImage, 'title': 'Adiemus', 'file': '../../../../../../../Test/Music/Клипы/Adiemus.mp4'},
  {'icon': iconImage, 'title': 'Agnus Dei', 'file': '../../../../../../../Test/Music/Клипы/Agnus Dei.mp4'},
  {'icon': iconImage, 'title': 'All Star', 'file': '../../../../../../../Test/Music/Клипы/All Star.mp4'},
  {'icon': iconImage, 'title': 'And We Run', 'file': '../../../../../../../Test/Music/Клипы/And We Run.mp4'},
  {'icon': iconImage, 'title': 'At The Beginning', 'file': '../../../../../../../Test/Music/Клипы/At The Beginning.mp4'},
  {'icon': iconImage, 'title': 'Babys On Fire', 'file': '../../../../../../../Test/Music/Клипы/BABY%27S ON FIRE.mp4'},
  {'icon': iconImage, 'title': 'Bamboleo', 'file': '../../../../../../../Test/Music/Клипы/Bamboleo.mp4'},
  {'icon': iconImage, 'title': 'Bang', 'file': '../../../../../../../Test/Music/Клипы/Bang.mp4'},
  {'icon': iconImage, 'title': 'Blame Ft John Newman', 'file': '../../../../../../../Test/Music/Клипы/Blame ft. John Newman.mp4'},
  {'icon': iconImage, 'title': 'Braveheart Song', 'file': '../../../../../../../Test/Music/Клипы/Braveheart song.mp4'},
  {'icon': iconImage, 'title': 'Burn', 'file': '../../../../../../../Test/Music/Клипы/Burn.mp4'},
  {'icon': iconImage, 'title': 'Cancion Del Mariachi', 'file': '../../../../../../../Test/Music/Клипы/Cancion del Mariachi.mp4'},
  {'icon': iconImage, 'title': 'Cant Remember To Forget You', 'file': '../../../../../../../Test/Music/Клипы/Can%27t Remember to Forget You.mp4'},
  {'icon': iconImage, 'title': 'Chandelier', 'file': '../../../../../../../Test/Music/Клипы/Chandelier.mp4'},
  {'icon': iconImage, 'title': 'Changed The Way You Kiss Me', 'file': '../../../../../../../Test/Music/Клипы/Changed The Way You Kiss Me.mp4'},
  {'icon': iconImage, 'title': 'Chihuahua', 'file': '../../../../../../../Test/Music/Клипы/Chihuahua.mp4'},
  {'icon': iconImage, 'title': 'Circle Of Life', 'file': '../../../../../../../Test/Music/Клипы/Circle of Life.mp4'},
  {'icon': iconImage, 'title': 'Color Of The Night', 'file': '../../../../../../../Test/Music/Клипы/Color Of The Night.mp4'},
  {'icon': iconImage, 'title': 'Confide In Me', 'file': '../../../../../../../Test/Music/Клипы/Confide In Me.mp4'},
  {'icon': iconImage, 'title': 'Conquest Of Paradise', 'file': '../../../../../../../Test/Music/Клипы/Conquest of Paradise.mp4'},
  {'icon': iconImage, 'title': 'Cracking The Russian Codes', 'file': '../../../../../../../Test/Music/Клипы/Cracking The Russian Codes.mp4'},
  {'icon': iconImage, 'title': 'Crash! Boom! Bang!', 'file': '../../../../../../../Test/Music/Клипы/Crash! Boom! Bang!.mp4'},
  {'icon': iconImage, 'title': 'Désenchantée', 'file': '../../../../../../../Test/Music/Клипы/Désenchantée.mp4'},
  {'icon': iconImage, 'title': 'Desert Rose', 'file': '../../../../../../../Test/Music/Клипы/Desert Rose.mp4'},
  {'icon': iconImage, 'title': 'Diamonds', 'file': '../../../../../../../Test/Music/Клипы/Diamonds.mp4'},
  {'icon': iconImage, 'title': 'Dont Dream Its Over', 'file': '../../../../../../../Test/Music/Клипы/Don%27t Dream It%27s Over.mp4'},
  {'icon': iconImage, 'title': 'Drinking From The Bottle Ft Tinie Tempah', 'file': '../../../../../../../Test/Music/Клипы/Drinking from the Bottle ft. Tinie Tempah.mp4'},
  {'icon': iconImage, 'title': 'Dup Step', 'file': '../../../../../../../Test/Music/Клипы/Dup Step.mp4'},
  {'icon': iconImage, 'title': 'Dust In The Wind', 'file': '../../../../../../../Test/Music/Клипы/Dust In The Wind.mp4'},
  {'icon': iconImage, 'title': 'Eagleheart', 'file': '../../../../../../../Test/Music/Клипы/Eagleheart.mp4'},
  {'icon': iconImage, 'title': 'Ecstasy Of Gold', 'file': '../../../../../../../Test/Music/Клипы/Ecstasy of Gold.mp4'},
  {'icon': iconImage, 'title': 'Empire', 'file': '../../../../../../../Test/Music/Клипы/Empire.mp4'},
  {'icon': iconImage, 'title': 'Escala Palladio', 'file': '../../../../../../../Test/Music/Клипы/Escala - Palladio.mp4'},
  {'icon': iconImage, 'title': 'Everybody Wants To Rule The World', 'file': '../../../../../../../Test/Music/Клипы/Everybody Wants to Rule the World.mp4'},
  {'icon': iconImage, 'title': 'Feel The Light', 'file': '../../../../../../../Test/Music/Клипы/Feel The Light.mp4'},
  {'icon': iconImage, 'title': 'Felicita', 'file': '../../../../../../../Test/Music/Клипы/Felicita.mp4'},
  {'icon': iconImage, 'title': 'Fighter', 'file': '../../../../../../../Test/Music/Клипы/Fighter.mp4'},
  {'icon': iconImage, 'title': 'Fleur Du Mal', 'file': '../../../../../../../Test/Music/Клипы/Fleur du Mal.mp4'},
  {'icon': iconImage, 'title': 'Fly On The Wings Of Love', 'file': '../../../../../../../Test/Music/Клипы/Fly on the wings of love.mp4'},
  {'icon': iconImage, 'title': 'Fragile', 'file': '../../../../../../../Test/Music/Клипы/Fragile.mp4'},
  {'icon': iconImage, 'title': 'Frozen', 'file': '../../../../../../../Test/Music/Клипы/Frozen.mp4'},
  {'icon': iconImage, 'title': 'Get A Haircut', 'file': '../../../../../../../Test/Music/Клипы/Get A Haircut.mp4'},
  {'icon': iconImage, 'title': 'Heart Of A Coward', 'file': '../../../../../../../Test/Music/Клипы/3/Heart of a Coward.mp4'},
  {'icon': iconImage, 'title': 'Heaven And Hell', 'file': '../../../../../../../Test/Music/Клипы/Heaven and Hell.mp4'},
  {'icon': iconImage, 'title': 'Hey Mama', 'file': '../../../../../../../Test/Music/Клипы/Hey Mama.mp4'},
  {'icon': iconImage, 'title': 'How Do You Do!', 'file': '../../../../../../../Test/Music/Клипы/How Do You Do!.mp4'},
  {'icon': iconImage, 'title': 'I Believe In Love', 'file': '../../../../../../../Test/Music/Клипы/I Believe in Love.mp4'},
  {'icon': iconImage, 'title': 'I Saw You Dancing', 'file': '../../../../../../../Test/Music/Клипы/I Saw You Dancing.mp4'},
  {'icon': iconImage, 'title': 'I Will Always Love You', 'file': '../../../../../../../Test/Music/Клипы/I Will Always Love You.mp4'},
  {'icon': iconImage, 'title': 'If You Leave Me Now', 'file': '../../../../../../../Test/Music/Клипы/If You Leave Me Now.mp4'},
  {'icon': iconImage, 'title': 'Iko Iko', 'file': '../../../../../../../Test/Music/Клипы/Iko Iko.mp4'},
  {'icon': iconImage, 'title': 'In Hell Ill Be In Good Company', 'file': '../../../../../../../Test/Music/Клипы/In Hell I%27ll Be In Good Company.webm'},
  {'icon': iconImage, 'title': 'In The Death Car', 'file': '../../../../../../../Test/Music/Клипы/In The Death Car.mp4'},
  {'icon': iconImage, 'title': 'In The Summertime', 'file': '../../../../../../../Test/Music/Клипы/3/In The Summertime.mp4'},
  {'icon': iconImage, 'title': 'Joe Le Taxi France 1987', 'file': '../../../../../../../Test/Music/Клипы/Joe Le Taxi France 1987.mp4'},
  {'icon': iconImage, 'title': 'Join Me In Death', 'file': '../../../../../../../Test/Music/Клипы/Join Me In Death.mp4'},
  {'icon': iconImage, 'title': 'Kaleidoscope Of Mathematics', 'file': '../../../../../../../Test/Music/Клипы/Kaleidoscope of Mathematics.mp4'},
  {'icon': iconImage, 'title': 'Layla', 'file': '../../../../../../../Test/Music/Клипы/Layla.mp4'},
  {'icon': iconImage, 'title': 'Let It Snow!let It Snow!let It Snow!', 'file': '../../../../../../../Test/Music/Клипы/Let It Snow!Let It Snow!Let It Snow!.mp4'},
  {'icon': iconImage, 'title': 'Limbo', 'file': '../../../../../../../Test/Music/Клипы/Limbo.webm'},
  {'icon': iconImage, 'title': 'Livin La Vida Loca', 'file': '../../../../../../../Test/Music/Клипы/Livin%27 La Vida Loca.mp4'},
  {'icon': iconImage, 'title': 'Looking For The Summer', 'file': '../../../../../../../Test/Music/Клипы/Looking For The Summer.mp4'},
  {'icon': iconImage, 'title': 'Love Me Like You Do', 'file': '../../../../../../../Test/Music/Клипы/Love Me Like You Do .mp4'},
  {'icon': iconImage, 'title': 'Love Me Like You Do', 'file': '../../../../../../../Test/Music/Клипы/Love Me Like You Do.mp4'},
  {'icon': iconImage, 'title': 'Maria Magdalena 1985', 'file': '../../../../../../../Test/Music/Клипы/3/Maria Magdalena 1985.mp4'},
  {'icon': iconImage, 'title': 'Mon Mec A Moi', 'file': '../../../../../../../Test/Music/Клипы/Mon Mec a Moi.mp4'},
  {'icon': iconImage, 'title': 'My Darkest Days', 'file': '../../../../../../../Test/Music/Клипы/My Darkest Days.mp4'},
  {'icon': iconImage, 'title': 'My Name Is Lincoln', 'file': '../../../../../../../Test/Music/Клипы/My Name Is Lincoln.mp4'},
  {'icon': iconImage, 'title': 'Nagano Butovo', 'file': '../../../../../../../Test/Music/Клипы/3/nagano_-_butovo.mp3'},
  {'icon': iconImage, 'title': 'Now We Are Free', 'file': '../../../../../../../Test/Music/Клипы/Now We Are Free.mp4'},
  {'icon': iconImage, 'title': 'Ode To My Family', 'file': '../../../../../../../Test/Music/Клипы/Ode To My Family.mp4'},
  {'icon': iconImage, 'title': 'Once Upon A December', 'file': '../../../../../../../Test/Music/Клипы/Once Upon A December.mp4'},
  {'icon': iconImage, 'title': 'Once Upon A Time In The West', 'file': '../../../../../../../Test/Music/Клипы/3/Once Upon a Time in the West.mp4'},
  {'icon': iconImage, 'title': 'One Way Ticket 1978 (high Quality)', 'file': '../../../../../../../Test/Music/Клипы/One Way Ticket 1978 (High Quality).mp4'},
  {'icon': iconImage, 'title': 'Pardonne Moi Ce Caprice Denfant', 'file': '../../../../../../../Test/Music/Клипы/Pardonne-moi ce caprice d%27enfant.mp4'},
  {'icon': iconImage, 'title': 'Personal Jesus', 'file': '../../../../../../../Test/Music/Клипы/Personal Jesus.mp4'},
  {'icon': iconImage, 'title': 'Poker Face', 'file': '../../../../../../../Test/Music/Клипы/Poker Face.mp4'},
  {'icon': iconImage, 'title': 'Por Una Cabeza', 'file': '../../../../../../../Test/Music/Клипы/Por una cabeza.mp4'},
  {'icon': iconImage, 'title': 'Sail', 'file': '../../../../../../../Test/Music/Клипы/SAIL.mp4'},
  {'icon': iconImage, 'title': 'Scars', 'file': '../../../../../../../Test/Music/Клипы/Scars.mp4'},
  {'icon': iconImage, 'title': 'Scatman', 'file': '../../../../../../../Test/Music/Клипы/Scatman.mp4'},
  {'icon': iconImage, 'title': 'Sixteen Tons', 'file': '../../../../../../../Test/Music/Клипы/Sixteen Tons.mp4'},
  {'icon': iconImage, 'title': 'Snoop Dogg Smoke', 'file': '../../../../../../../Test/Music/Клипы/3/Snoop dogg Smoke.mp4'},
  {'icon': iconImage, 'title': 'Somebody That I Used To Know', 'file': '../../../../../../../Test/Music/Клипы/Somebody That I Used To Know.mp4'},
  {'icon': iconImage, 'title': 'Somebody To Love', 'file': '../../../../../../../Test/Music/Клипы/Somebody To Love.mp4'},
  {'icon': iconImage, 'title': 'Soul Survivor 2003', 'file': '../../../../../../../Test/Music/Клипы/Soul Survivor 2003.mp4'},
  {'icon': iconImage, 'title': 'Still Loving You', 'file': '../../../../../../../Test/Music/Клипы/Still Loving You.mp4'},
  {'icon': iconImage, 'title': 'Strangelove', 'file': '../../../../../../../Test/Music/Клипы/Strangelove .mp4'},
  {'icon': iconImage, 'title': 'Summer', 'file': '../../../../../../../Test/Music/Клипы/Summer.mp4'},
  {'icon': iconImage, 'title': 'Summer Time Sadness', 'file': '../../../../../../../Test/Music/Клипы/Summer time Sadness.mp4'},
  {'icon': iconImage, 'title': 'Supreme', 'file': '../../../../../../../Test/Music/Клипы/Supreme.mp4'},
  {'icon': iconImage, 'title': 'Surfin Bird', 'file': '../../../../../../../Test/Music/Клипы/3/Surfin Bird.mp4'},
  {'icon': iconImage, 'title': 'Surfin Bird (family Guy)', 'file': '../../../../../../../Test/Music/Клипы/3/Surfin Bird (Family Guy).mp4'},
  {'icon': iconImage, 'title': 'Syberian', 'file': '../../../../../../../Test/Music/Клипы/Syberian.mp4'},
  {'icon': iconImage, 'title': 'The Godfather Theme', 'file': '../../../../../../../Test/Music/Клипы/3/The Godfather Theme.mp4'},
  {'icon': iconImage, 'title': 'The Good The Bad And The Ugly Theme • Ennio Morricone', 'file': '../../../../../../../Test/Music/Клипы/3/The Good, the Bad and the Ugly Theme • Ennio Morricone.mp4'},
  {'icon': iconImage, 'title': 'The Lonely Shepherd', 'file': '../../../../../../../Test/Music/Клипы/The Lonely Shepherd.mp4'},
  {'icon': iconImage, 'title': 'The Memory Remains', 'file': '../../../../../../../Test/Music/Клипы/The Memory Remains.mp4'},
  {'icon': iconImage, 'title': 'To Die For', 'file': '../../../../../../../Test/Music/Клипы/To Die For.mp4'},
  {'icon': iconImage, 'title': 'Towards The Sun', 'file': '../../../../../../../Test/Music/Клипы/Towards The Sun.mp4'},
  {'icon': iconImage, 'title': 'Try Everything', 'file': '../../../../../../../Test/Music/Клипы/Try Everything.mp4'},
  {'icon': iconImage, 'title': 'Une Histoire Damour (love Story)', 'file': '../../../../../../../Test/Music/Клипы/Une histoire d%27amour (Love story).mp4'},
  {'icon': iconImage, 'title': 'Valkyrie', 'file': '../../../../../../../Test/Music/Клипы/Valkyrie.mp4'},
  {'icon': iconImage, 'title': 'Where The Wild Roses Grow', 'file': '../../../../../../../Test/Music/Клипы/Where The Wild Roses Grow.mp4'},
  {'icon': iconImage, 'title': 'Wrong', 'file': '../../../../../../../Test/Music/Клипы/Wrong.mp4'},
  {'icon': iconImage, 'title': 'Young And Beautiful', 'file': '../../../../../../../Test/Music/Клипы/Young and Beautiful.mp4'},
  {'icon': iconImage, 'title': 'Zombie', 'file': '../../../../../../../Test/Music/Клипы/Zombie.mp4'},
  {'icon': iconImage, 'title': 'А Мы Любили', 'file': '../../../../../../../Test/Music/Клипы/А мы любили.mp4'},
  {'icon': iconImage, 'title': 'Ализе', 'file': '../../../../../../../Test/Music/Клипы/АЛИЗЕ.mp4'},
  {'icon': iconImage, 'title': 'Ах Какая Невезуха Абсолютно Нету Слуха (новогодний Квартирник)', 'file': '../../../../../../../Test/Music/Клипы/3/Ах, какая невезуха, абсолютно нету слуха. (Новогодний Квартирник).mp4'},
  {'icon': iconImage, 'title': 'Белеет Мой Парус', 'file': '../../../../../../../Test/Music/Клипы/Белеет мой парус.mp4'},
  {'icon': iconImage, 'title': 'Верхом На Звезде', 'file': '../../../../../../../Test/Music/Клипы/Верхом на звезде.mp4'},
  {'icon': iconImage, 'title': 'Звенит Январская Вьюга', 'file': '../../../../../../../Test/Music/Клипы/3/Звенит январская вьюга.mp4'},
  {'icon': iconImage, 'title': 'Зож', 'file': '../../../../../../../Test/Music/Клипы/ЗОЖ.mp4'},
  {'icon': iconImage, 'title': 'Иду Курю', 'file': '../../../../../../../Test/Music/Клипы/Иду, курю.mp4'},
  {'icon': iconImage, 'title': 'Иерусалим 1998г', 'file': '../../../../../../../Test/Music/Клипы/3/Иерусалим 1998г.mp4'},
  {'icon': iconImage, 'title': 'Клубняк', 'file': '../../../../../../../Test/Music/Клипы/3/Клубняк.mp4'},
  {'icon': iconImage, 'title': 'Кончится Лето', 'file': '../../../../../../../Test/Music/Клипы/Кончится лето.mp4'},
  {'icon': iconImage, 'title': 'Кукла Колдуна', 'file': '../../../../../../../Test/Music/Клипы/Кукла колдуна.mp4'},
  {'icon': iconImage, 'title': 'Кукла Колдунаа', 'file': '../../../../../../../Test/Music/Клипы/Кукла Колдунаа.mp4'},
  {'icon': iconImage, 'title': 'Лучший Танцор Дабстеп В Мире! Levitate Dubstep!', 'file': '../../../../../../../Test/Music/Клипы/3/Лучший танцор Дабстеп в мире! LEVITATE DUBSTEP!.mp4'},
  {'icon': iconImage, 'title': 'Матвей Блантер – Футбольный Марш (www Petamusic Ru)', 'file': '../../../../../../../Test/Music/Клипы/3/Матвей Блантер – Футбольный марш (www.petamusic.ru).mp3'},
  {'icon': iconImage, 'title': 'Метель Тройка ', 'file': '../../../../../../../Test/Music/Клипы/3/Метель%27 %27Тройка%27..mp4'},
  {'icon': iconImage, 'title': 'Мой Ласковый И Нежный Зверь', 'file': '../../../../../../../Test/Music/Клипы/Мой ласковый и нежный зверь.mp4'},
  {'icon': iconImage, 'title': 'Мы Как Трепетные Птицы', 'file': '../../../../../../../Test/Music/Клипы/Мы, как трепетные птицы.mp4'},
  {'icon': iconImage, 'title': 'Обама Материт Порошенко И Яценюка (прикольная Озвучка ) Копия', 'file': '../../../../../../../Test/Music/Клипы/3/Обама материт Порошенко и Яценюка (прикольная озвучка ) - копия.mp4'},
  {'icon': iconImage, 'title': 'Оркестр Ссср – Футбольный Марш (www Petamusic Ru)', 'file': '../../../../../../../Test/Music/Клипы/3/Оркестр СССР – Футбольный марш (www.petamusic.ru).mp3'},
  {'icon': iconImage, 'title': 'От Кореи До Карелии', 'file': '../../../../../../../Test/Music/Клипы/От Кореи до Карелии.mp4'},
  {'icon': iconImage, 'title': 'Позови Меня С Собой', 'file': '../../../../../../../Test/Music/Клипы/Позови меня с собой.mp4'},
  {'icon': iconImage, 'title': 'Потму Что Гладиолус', 'file': '../../../../../../../Test/Music/Клипы/3/Потму что гладиолус.mp4'},
  {'icon': iconImage, 'title': 'Прогулки По Воде Ddt', 'file': '../../../../../../../Test/Music/Клипы/Прогулки по воде DDT.mp4'},
  {'icon': iconImage, 'title': 'Разговор Со Счастьем', 'file': '../../../../../../../Test/Music/Клипы/Разговор со счастьем.mp4'},
  {'icon': iconImage, 'title': 'Спокойная Ночь', 'file': '../../../../../../../Test/Music/Клипы/СПОКОЙНАЯ НОЧЬ.mp4'},
  {'icon': iconImage, 'title': 'Там Де Нас Нема (official Video)', 'file': '../../../../../../../Test/Music/Клипы/3/Там, де нас нема (official video).mp4'},
  {'icon': iconImage, 'title': 'Танго Смерти Оркестр Концлагеря Яновский', 'file': '../../../../../../../Test/Music/Клипы/3/Танго смерти - оркестр концлагеря %27Яновский%27.mp4'},
  {'icon': iconImage, 'title': 'Тыж Программист', 'file': '../../../../../../../Test/Music/Клипы/3/Тыж программист.mp4'},
  {'icon': iconImage, 'title': 'Человек И Кошка1997', 'file': '../../../../../../../Test/Music/Клипы/Человек и Кошка1997.mp4'},
  {'icon': iconImage, 'title': 'Я Зажег В Церквях Все Свечи', 'file': '../../../../../../../Test/Music/Клипы/Я зажег в церквях все свечи.mp4'},
]);
})

document.getElementById('корольишут').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Воспоминания О Былой Любви', 'file': '../../../../../../../Test/Music/Король и Шут/2001 - Как в старой сказке/Воспоминания о былой любви.mp3'},
  {'icon': iconImage, 'title': 'Охотник', 'file': '../../../../../../../Test/Music/Король и Шут/1996 - Король и Шут/Охотник.mp3'},
  {'icon': iconImage, 'title': 'Прерванная Любовь Или Арбузная Корка', 'file': '../../../../../../../Test/Music/Король и Шут/1999 - Акустический Альбом/Прерванная любовь или Арбузная корка.mp3'},
  {'icon': iconImage, 'title': 'Проклятый Старый Дом', 'file': '../../../../../../../Test/Music/Король и Шут/2001 - Как в старой сказке/Проклятый старый дом.mp3'},
  {'icon': iconImage, 'title': 'Прыгну Со Скалы', 'file': '../../../../../../../Test/Music/Король и Шут/1999 - Акустический Альбом/Прыгну со скалы.mp3'},
]);
})

document.getElementById('крысишмындра').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Бродяга', 'file': '../../../../../../../Test/Music/Крыс и Шмындра/Концерт в ДК Маяк - 2000/Бродяга.mp3'},
  {'icon': iconImage, 'title': 'Вей Мой Ветер', 'file': '../../../../../../../Test/Music/Крыс и Шмындра/Дорога на Калланмор - 1999/Вей, Мой Ветер.mp3'},
  {'icon': iconImage, 'title': 'Женская Песня', 'file': '../../../../../../../Test/Music/Крыс и Шмындра/Дорога на Калланмор - 1999/Женская Песня.mp3'},
  {'icon': iconImage, 'title': 'Ирландцы', 'file': '../../../../../../../Test/Music/Крыс и Шмындра/Концерт в ДК Маяк - 2000/Ирландцы.mp3'},
  {'icon': iconImage, 'title': 'Коронах', 'file': '../../../../../../../Test/Music/Крыс и Шмындра/Дорога на Калланмор - 1999/Коронах.mp3'},
  {'icon': iconImage, 'title': 'Недаром С Гор Спустились', 'file': '../../../../../../../Test/Music/Крыс и Шмындра/Дорога на Калланмор - 1999/Недаром с Гор Спустились.mp3'},
  {'icon': iconImage, 'title': 'Романс', 'file': '../../../../../../../Test/Music/Крыс и Шмындра/Дорога на Калланмор - 1999/Романс.mp3'},
  {'icon': iconImage, 'title': 'Странники', 'file': '../../../../../../../Test/Music/Крыс и Шмындра/Дорога на Калланмор - 1999/Странники.mp3'},
  {'icon': iconImage, 'title': 'Трасса', 'file': '../../../../../../../Test/Music/Крыс и Шмындра/Дорога на Калланмор - 1999/Трасса.mp3'},
  {'icon': iconImage, 'title': 'Тростник', 'file': '../../../../../../../Test/Music/Крыс и Шмындра/Дорога на Калланмор - 1999/Тростник.mp3'},
]);
})

document.getElementById('кукрыниксы').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Движение', 'file': '../../../../../../../Test/Music/Кукрыниксы/2003 - Столкновение/Движение.mp3'},
  {'icon': iconImage, 'title': 'Дорога', 'file': '../../../../../../../Test/Music/Кукрыниксы/2002 - Раскрашенная Душа/Дорога.mp3'},
  {'icon': iconImage, 'title': 'Звезда', 'file': '../../../../../../../Test/Music/Кукрыниксы/2006 - Шаман/Звезда.mp3'},
  {'icon': iconImage, 'title': 'Кино', 'file': '../../../../../../../Test/Music/Кукрыниксы/2004 - Фаворит Солнца/Кино.mp3'},
  {'icon': iconImage, 'title': 'Кошмары', 'file': '../../../../../../../Test/Music/Кукрыниксы/2004 - Фаворит Солнца/Кошмары.mp3'},
  {'icon': iconImage, 'title': 'Серебряный Сентябрь', 'file': '../../../../../../../Test/Music/Кукрыниксы/2003 - Столкновение/Серебряный сентябрь.mp3'},
  {'icon': iconImage, 'title': 'Смех', 'file': '../../../../../../../Test/Music/Кукрыниксы/2001 - Кукрыниксы/Смех.mp3'},
  {'icon': iconImage, 'title': 'Уходящая В Ночь', 'file': '../../../../../../../Test/Music/Кукрыниксы/Уходящая в ночь.mp3'},
  {'icon': iconImage, 'title': 'Черная Невеста', 'file': '../../../../../../../Test/Music/Кукрыниксы/2003 - Столкновение/Черная невеста.mp3'},
  {'icon': iconImage, 'title': 'Это Не Беда', 'file': '../../../../../../../Test/Music/Кукрыниксы/2001 - Кукрыниксы/Это не беда.mp3'},
  {'icon': iconImage, 'title': 'Ясные Дни', 'file': '../../../../../../../Test/Music/Кукрыниксы/2003 - Столкновение/Ясные Дни.mp3'},
]);
})

document.getElementById('любэ').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Атас', 'file': '../../../../../../../Test/Music/Любэ/1991 - Атас/Атас.mp3'},
  {'icon': iconImage, 'title': 'Ветер Ветерок', 'file': '../../../../../../../Test/Music/Любэ/2000 - Полустаночки/Ветер-Ветерок.mp3'},
  {'icon': iconImage, 'title': 'Главное Что Есть Ты У Меня', 'file': '../../../../../../../Test/Music/Любэ/1996 - Комбат/Главное, что есть ты у меня.mp3'},
  {'icon': iconImage, 'title': 'Давай Давай', 'file': '../../../../../../../Test/Music/Любэ/1992 - Кто сказал, что мы плохо жили/Давай давай.mp3'},
  {'icon': iconImage, 'title': 'Давай За ', 'file': '../../../../../../../Test/Music/Любэ/2002 - Давай за/Давай за....mp3'},
  {'icon': iconImage, 'title': 'Дед', 'file': '../../../../../../../Test/Music/Любэ/2000 - Полустаночки/Дед.mp3'},
  {'icon': iconImage, 'title': 'Дорога', 'file': '../../../../../../../Test/Music/Любэ/1994 - Зона Любэ/Дорога.mp3'},
  {'icon': iconImage, 'title': 'Комбат', 'file': '../../../../../../../Test/Music/Любэ/1996 - Комбат/Комбат.mp3'},
  {'icon': iconImage, 'title': 'Конь', 'file': '../../../../../../../Test/Music/Любэ/Конь.mp3'},
  {'icon': iconImage, 'title': 'Любэ Главное Что Есть Ты У Меня Live', 'file': '../../../../../../../Test/Music/Любэ/ЛЮБЭ %27Главное, что есть ты у меня%27 live.mp4'},
  {'icon': iconImage, 'title': 'Любэ Дорога (ребята Нашего Полка 23 02 2004)', 'file': '../../../../../../../Test/Music/Любэ/ЛЮБЭ %27Дорога%27 (%27Ребята нашего полка%27, 23-02-2004).mp4'},
  {'icon': iconImage, 'title': 'Любэ Позови Меня Тихо По Имени Live', 'file': '../../../../../../../Test/Music/Любэ/ЛЮБЭ %27Позови, меня, тихо по имени%27 live.mp4'},
  {'icon': iconImage, 'title': 'Любэ Там За Туманами (ребята Нашего Полка 23 02 2004)', 'file': '../../../../../../../Test/Music/Любэ/ЛЮБЭ %27Там за туманами%27 (%27Ребята нашего полка%27, 23-02-2004).mp4'},
  {'icon': iconImage, 'title': 'Любэ Ты Неси Меня Река (краса) (ребята Нашего Полка 23 02 2004)', 'file': '../../../../../../../Test/Music/Любэ/ЛЮБЭ %27Ты неси меня река (Краса)%27 (%27Ребята нашего полка%27, 23-02-2004).mp4'},
  {'icon': iconImage, 'title': 'Мент', 'file': '../../../../../../../Test/Music/Любэ/1997 - Песни о людях/Мент.mp3'},
  {'icon': iconImage, 'title': 'Опера', 'file': '../../../../../../../Test/Music/Любэ/2004 - Ребята нашего полка/Опера.mp3'},
  {'icon': iconImage, 'title': 'Позови Меня', 'file': '../../../../../../../Test/Music/Любэ/2000 - Полустаночки/Позови меня.mp3'},
  {'icon': iconImage, 'title': 'Ребята С Нашего Двора', 'file': '../../../../../../../Test/Music/Любэ/1997 - Песни о людях/Ребята с нашего двора.mp3'},
  {'icon': iconImage, 'title': 'Река', 'file': '../../../../../../../Test/Music/Любэ/2002 - Давай за/Река.mp3'},
  {'icon': iconImage, 'title': 'Солдат', 'file': '../../../../../../../Test/Music/Любэ/2000 - Полустаночки/Солдат.mp3'},
  {'icon': iconImage, 'title': 'Спят Курганы Тёмные', 'file': '../../../../../../../Test/Music/Любэ/1996 - Комбат/Спят курганы тёмные.mp3'},
  {'icon': iconImage, 'title': 'Старые Друзья', 'file': '../../../../../../../Test/Music/Любэ/2000 - Полустаночки/Старые друзья.mp3'},
  {'icon': iconImage, 'title': 'Там За Туманами', 'file': '../../../../../../../Test/Music/Любэ/1997 - Песни о людях/Там за туманами.mp3'},
  {'icon': iconImage, 'title': 'Тетя Доктор', 'file': '../../../../../../../Test/Music/Любэ/1991 - Атас/Тетя доктор.mp3'},
  {'icon': iconImage, 'title': 'Течет Река Волга', 'file': '../../../../../../../Test/Music/Любэ/1997 - Песни о людях/Течет река Волга.mp3'},
  {'icon': iconImage, 'title': 'Шагом Марш', 'file': '../../../../../../../Test/Music/Любэ/1996 - Комбат/Шагом марш.mp3'},
]);
})

document.getElementById('м.магомаев').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Королева Красоты', 'file': '../../../../../../../Test/Music/М. Магомаев/2001 - Любовь Моя, Песня/Королева красоты.mp3'},
  {'icon': iconImage, 'title': 'Куплеты Эскамилио', 'file': '../../../../../../../Test/Music/М. Магомаев/2002 - Арии из опер/Куплеты Эскамилио.mp3'},
  {'icon': iconImage, 'title': 'Луч Солнца Золотого', 'file': '../../../../../../../Test/Music/М. Магомаев/Луч солнца золотого.mp3'},
  {'icon': iconImage, 'title': 'Лучший Город Земли', 'file': '../../../../../../../Test/Music/М. Магомаев/1995 - Благодарю тебя/Лучший город Земли.mp3'},
  {'icon': iconImage, 'title': 'Мелодия', 'file': '../../../../../../../Test/Music/М. Магомаев/1995 - Благодарю тебя/Мелодия.mp3'},
  {'icon': iconImage, 'title': 'Мелодия', 'file': '../../../../../../../Test/Music/М. Магомаев/1995 - С любовью к женщине/Мелодия.mp3'},
  {'icon': iconImage, 'title': 'Свадьба', 'file': '../../../../../../../Test/Music/М. Магомаев/1995 - Благодарю тебя/Свадьба.mp3'},
  {'icon': iconImage, 'title': 'Свадьба', 'file': '../../../../../../../Test/Music/М. Магомаев/2001 - Любовь Моя, Песня/Свадьба.mp3'},
  {'icon': iconImage, 'title': 'Чертово Колесо', 'file': '../../../../../../../Test/Music/М. Магомаев/1995 - Благодарю тебя/Чертово колесо.mp3'},
]);
})

document.getElementById('м.задорнов').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '[zadornov] 1', 'file': '../../../../../../../Test/Music/М.Задорнов/[zadornov] 1.mp3'},
  {'icon': iconImage, 'title': '[zadornov] 2', 'file': '../../../../../../../Test/Music/М.Задорнов/[zadornov] 2.mp3'},
  {'icon': iconImage, 'title': '[zadornov] 3', 'file': '../../../../../../../Test/Music/М.Задорнов/[zadornov] 3.mp3'},
  {'icon': iconImage, 'title': '03', 'file': '../../../../../../../Test/Music/М.Задорнов/03.MP3'},
  {'icon': iconImage, 'title': '04', 'file': '../../../../../../../Test/Music/М.Задорнов/04.MP3'},
  {'icon': iconImage, 'title': '05', 'file': '../../../../../../../Test/Music/М.Задорнов/05.MP3'},
  {'icon': iconImage, 'title': '06', 'file': '../../../../../../../Test/Music/М.Задорнов/06.MP3'},
  {'icon': iconImage, 'title': '07', 'file': '../../../../../../../Test/Music/М.Задорнов/07.MP3'},
  {'icon': iconImage, 'title': '08', 'file': '../../../../../../../Test/Music/М.Задорнов/08.MP3'},
  {'icon': iconImage, 'title': '09', 'file': '../../../../../../../Test/Music/М.Задорнов/09.MP3'},
  {'icon': iconImage, 'title': '10', 'file': '../../../../../../../Test/Music/М.Задорнов/10.MP3'},
  {'icon': iconImage, 'title': '12', 'file': '../../../../../../../Test/Music/М.Задорнов/12.MP3'},
  {'icon': iconImage, 'title': '13', 'file': '../../../../../../../Test/Music/М.Задорнов/13.MP3'},
  {'icon': iconImage, 'title': '14', 'file': '../../../../../../../Test/Music/М.Задорнов/14.MP3'},
  {'icon': iconImage, 'title': '15', 'file': '../../../../../../../Test/Music/М.Задорнов/15.MP3'},
  {'icon': iconImage, 'title': '16', 'file': '../../../../../../../Test/Music/М.Задорнов/16.MP3'},
  {'icon': iconImage, 'title': '17', 'file': '../../../../../../../Test/Music/М.Задорнов/17.MP3'},
  {'icon': iconImage, 'title': '18', 'file': '../../../../../../../Test/Music/М.Задорнов/18.MP3'},
  {'icon': iconImage, 'title': '22', 'file': '../../../../../../../Test/Music/М.Задорнов/22.MP3'},
  {'icon': iconImage, 'title': '23', 'file': '../../../../../../../Test/Music/М.Задорнов/23.MP3'},
  {'icon': iconImage, 'title': '24', 'file': '../../../../../../../Test/Music/М.Задорнов/24.MP3'},
  {'icon': iconImage, 'title': '25', 'file': '../../../../../../../Test/Music/М.Задорнов/25.MP3'},
  {'icon': iconImage, 'title': '26', 'file': '../../../../../../../Test/Music/М.Задорнов/26.MP3'},
  {'icon': iconImage, 'title': 'Calve', 'file': '../../../../../../../Test/Music/М.Задорнов/Анекдоты/Траханый Берг/calve.mp3'},
  {'icon': iconImage, 'title': 'Gangubazz Bobm Birthday Party Part 1', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Gangubazz_BobM_Birthday_party_part_1.mp3'},
  {'icon': iconImage, 'title': 'Gangubazz Bobm Birthday Party Part 2', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Gangubazz_BobM_Birthday_party_part_2.mp3'},
  {'icon': iconImage, 'title': 'Gangubazz Bobm Birthday Party Part 3', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Gangubazz_BobM_Birthday_party_part_3.mp3'},
  {'icon': iconImage, 'title': 'Gangubazz Bobm Birthday Party Part 4', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Gangubazz_BobM_Birthday_party_part_4.mp3'},
  {'icon': iconImage, 'title': 'Michurin', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/michurin.mp3'},
  {'icon': iconImage, 'title': 'Zadorn05', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN05.MP3'},
  {'icon': iconImage, 'title': 'Zadorn06', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN06.MP3'},
  {'icon': iconImage, 'title': 'Zadorn07', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN07.MP3'},
  {'icon': iconImage, 'title': 'Zadorn08', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN08.MP3'},
  {'icon': iconImage, 'title': 'Zadorn09', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN09.MP3'},
  {'icon': iconImage, 'title': 'Zadorn10', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN10.MP3'},
  {'icon': iconImage, 'title': 'Zadorn11', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN11.MP3'},
  {'icon': iconImage, 'title': 'Zadorn12', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN12.MP3'},
  {'icon': iconImage, 'title': 'Zadorn13', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN13.MP3'},
  {'icon': iconImage, 'title': 'Zadorn14', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN14.MP3'},
  {'icon': iconImage, 'title': 'Zadorn15', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN15.MP3'},
  {'icon': iconImage, 'title': 'Zadorn16', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN16.MP3'},
  {'icon': iconImage, 'title': 'Zadorn17', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN17.MP3'},
  {'icon': iconImage, 'title': 'Zadorn18', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN18.MP3'},
  {'icon': iconImage, 'title': 'Zadorn19', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN19.MP3'},
  {'icon': iconImage, 'title': 'Zadorn20', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN20.MP3'},
  {'icon': iconImage, 'title': 'Zadorn21', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN21.MP3'},
  {'icon': iconImage, 'title': 'Zadorn22', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN22.MP3'},
  {'icon': iconImage, 'title': 'Zadorn23', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN23.MP3'},
  {'icon': iconImage, 'title': 'Zadorn24', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN24.MP3'},
  {'icon': iconImage, 'title': 'Zadorn25', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN25.MP3'},
  {'icon': iconImage, 'title': 'Zadorn26', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN26.MP3'},
  {'icon': iconImage, 'title': 'Zadorn27', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN27.MP3'},
  {'icon': iconImage, 'title': 'Zadorn28', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN28.MP3'},
  {'icon': iconImage, 'title': 'Zadorn29', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN29.MP3'},
  {'icon': iconImage, 'title': 'Zadorn30', 'file': '../../../../../../../Test/Music/М.Задорнов/ZADORN30.MP3'},
  {'icon': iconImage, 'title': 'А Бог Всеже Есть', 'file': '../../../../../../../Test/Music/М.Задорнов/А бог всеже есть.mp3'},
  {'icon': iconImage, 'title': 'Анекдоты Котовский На Арбате', 'file': '../../../../../../../Test/Music/М.Задорнов/Анекдоты/Анекдоты  %27Котовский на Арбате%27.mp3'},
  {'icon': iconImage, 'title': 'Боги И Демоны Шата', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Боги и демоны шата.mp3'},
  {'icon': iconImage, 'title': 'Бригада', 'file': '../../../../../../../Test/Music/М.Задорнов/Анекдоты/Траханый Берг/Бригада.mp3'},
  {'icon': iconImage, 'title': 'Буду Сказать Без Бумажки', 'file': '../../../../../../../Test/Music/М.Задорнов/Буду сказать без бумажки.mp3'},
  {'icon': iconImage, 'title': 'Винокур', 'file': '../../../../../../../Test/Music/М.Задорнов/Винокур.mp3'},
  {'icon': iconImage, 'title': 'Винокур(на Д Р У Л Измайлова)', 'file': '../../../../../../../Test/Music/М.Задорнов/Винокур(На д.р у Л.Измайлова).mp3'},
  {'icon': iconImage, 'title': 'Говно', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Говно.mp3'},
  {'icon': iconImage, 'title': 'да Здравствует То Благодаря Чему Мы Несмотря Ни На Что!', 'file': '../../../../../../../Test/Music/М.Задорнов/%27Да здравствует то, благодаря чему мы, несмотря ни на что!%27.mp3'},
  {'icon': iconImage, 'title': 'Дед Мороз', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Дед Мороз.mp3'},
  {'icon': iconImage, 'title': 'Джатака О Карме', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Джатака о Карме.mp3'},
  {'icon': iconImage, 'title': 'Джатака О Крокодиле', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Джатака о Крокодиле.mp3'},
  {'icon': iconImage, 'title': 'Джатака О Кшатрии Харикеше', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Джатака о кшатрии Харикеше.mp3'},
  {'icon': iconImage, 'title': 'Джатака О Сундуке', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Джатака о сундуке.mp3'},
  {'icon': iconImage, 'title': 'Джатака О Царевиче', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Джатака о царевиче.mp3'},
  {'icon': iconImage, 'title': 'Джатака Про Мудреца И Волка', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Джатака про мудреца и волка.mp3'},
  {'icon': iconImage, 'title': 'Джатака Про Мудрецв И Волка', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Джатака Про Мудрецв и Волка.mp3'},
  {'icon': iconImage, 'title': 'Задорнов', 'file': '../../../../../../../Test/Music/М.Задорнов/Задорнов.mp3'},
  {'icon': iconImage, 'title': 'Задорнов', 'file': '../../../../../../../Test/Music/М.Задорнов/Задорнов .mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 0', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 0.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 1', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 1.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 2', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 2.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 3', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 3.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 4', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 4.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 5', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 5.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 6', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 6.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 7', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 7.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 9', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 9.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Как Викрам Вывел Битала Из Леса', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Индийский Покойник - Как Викрам Вывел Битала из Леса.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Рассказ Ганэши', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Индийский Покойник - Рассказ Ганэши.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Что Случилось С Биталом', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Индийский Покойник - Что Случилось с Биталом.mp3'},
  {'icon': iconImage, 'title': 'Как Виджай Вручал Викраму Истинное Сокровище', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Как Виджай Вручал Викраму Истинное Сокровище.mp3'},
  {'icon': iconImage, 'title': 'Как Жисть', 'file': '../../../../../../../Test/Music/М.Задорнов/Как жисть.mp3'},
  {'icon': iconImage, 'title': 'Королевство Сиджа', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Королевство Сиджа.mp3'},
  {'icon': iconImage, 'title': 'Крутая Мантра', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Крутая Мантра.mp3'},
  {'icon': iconImage, 'title': 'М 3', 'file': '../../../../../../../Test/Music/М.Задорнов/М.3.mp3'},
  {'icon': iconImage, 'title': 'М Задорнoв', 'file': '../../../../../../../Test/Music/М.Задорнов/М.Задорнoв.mp3'},
  {'icon': iconImage, 'title': 'М Задорно Египетские Ночи', 'file': '../../../../../../../Test/Music/М.Задорнов/М.Задорно-Египетские ночи.mp3'},
  {'icon': iconImage, 'title': 'М Задорнов', 'file': '../../../../../../../Test/Music/М.Задорнов/М.Задорнов.mp3'},
  {'icon': iconImage, 'title': 'М Задорнов(9 Вагон)', 'file': '../../../../../../../Test/Music/М.Задорнов/М.Задорнов(9 Вагон).mp3'},
  {'icon': iconImage, 'title': 'М Задорнов(tv)', 'file': '../../../../../../../Test/Music/М.Задорнов/М.Задорнов(TV).mp3'},
  {'icon': iconImage, 'title': 'М Задорнов(версаче)', 'file': '../../../../../../../Test/Music/М.Задорнов/М.Задорнов(Версаче).mp3'},
  {'icon': iconImage, 'title': 'М Задорнов(древня Запись)', 'file': '../../../../../../../Test/Music/М.Задорнов/М.Задорнов(Древня запись).mp3'},
  {'icon': iconImage, 'title': 'М Задорнов(питер)', 'file': '../../../../../../../Test/Music/М.Задорнов/М.Задорнов(Питер).mp3'},
  {'icon': iconImage, 'title': 'М Задорнов(праздники)', 'file': '../../../../../../../Test/Music/М.Задорнов/М.Задорнов(Праздники).mp3'},
  {'icon': iconImage, 'title': 'М Задорнов(про Нового Русского)', 'file': '../../../../../../../Test/Music/М.Задорнов/М.Задорнов(Про нового русского).mp3'},
  {'icon': iconImage, 'title': 'М Задорнов(ударница)', 'file': '../../../../../../../Test/Music/М.Задорнов/М.Задорнов(Ударница).mp3'},
  {'icon': iconImage, 'title': 'М Задорнов1', 'file': '../../../../../../../Test/Music/М.Задорнов/М.Задорнов1.mp3'},
  {'icon': iconImage, 'title': 'М Задорнов2', 'file': '../../../../../../../Test/Music/М.Задорнов/М.Задорнов2.mp3'},
  {'icon': iconImage, 'title': 'М Задорнов3', 'file': '../../../../../../../Test/Music/М.Задорнов/М.Задорнов3.mp3'},
  {'icon': iconImage, 'title': 'Матушка Змея Гудж', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Матушка Змея Гудж.mp3'},
  {'icon': iconImage, 'title': 'Михаил Задорнов', 'file': '../../../../../../../Test/Music/М.Задорнов/Михаил Задорнов.mp4'},
  {'icon': iconImage, 'title': 'Михаил Задорновв', 'file': '../../../../../../../Test/Music/М.Задорнов/Михаил Задорновв.mp4'},
  {'icon': iconImage, 'title': 'Мндийский Гашиш', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Мндийский Гашиш.mp3'},
  {'icon': iconImage, 'title': 'Морда Красная', 'file': '../../../../../../../Test/Music/М.Задорнов/Морда красная.mp3'},
  {'icon': iconImage, 'title': 'Не Дайте Себе Засохнуть', 'file': '../../../../../../../Test/Music/М.Задорнов/Не дайте себе засохнуть.mp3'},
  {'icon': iconImage, 'title': 'Не Для Tv', 'file': '../../../../../../../Test/Music/М.Задорнов/Не для TV.mp3'},
  {'icon': iconImage, 'title': 'Неприличное', 'file': '../../../../../../../Test/Music/М.Задорнов/Анекдоты/Траханый Берг/Неприличное.mp3'},
  {'icon': iconImage, 'title': 'Принцесса Кaмаcандaге 1', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Принцесса Кaмаcандaге 1.mp3'},
  {'icon': iconImage, 'title': 'Принцесса Кaмаcандaге 2', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Принцесса Кaмаcандaге 2.mp3'},
  {'icon': iconImage, 'title': 'Принцесса Кaмаcандaге 3', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Принцесса Кaмаcандaге 3.mp3'},
  {'icon': iconImage, 'title': 'Принцесса Кaмаcандaге 4', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Принцесса Кaмаcандaге 4.mp3'},
  {'icon': iconImage, 'title': 'Принцесса Кaмаcандaге 5', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Принцесса Кaмаcандaге 5.mp3'},
  {'icon': iconImage, 'title': 'Принцесса Кaмаcандaге 6', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Принцесса Кaмаcандaге 6.mp3'},
  {'icon': iconImage, 'title': 'Про Английский Язык', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про Английский Язык.mp3'},
  {'icon': iconImage, 'title': 'Про Ахимсу', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про Ахимсу.mp3'},
  {'icon': iconImage, 'title': 'Про Барбоса', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про Барбоса.mp3'},
  {'icon': iconImage, 'title': 'Про Беззубого Мужика', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про Беззубого Мужика.mp3'},
  {'icon': iconImage, 'title': 'Про Бычка', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про Бычка.mp3'},
  {'icon': iconImage, 'title': 'Про Васю Пиздело', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про Васю Пиздело.mp3'},
  {'icon': iconImage, 'title': 'Про Войну', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про Войну.mp3'},
  {'icon': iconImage, 'title': 'Про День Победы', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про День Победы.mp3'},
  {'icon': iconImage, 'title': 'Про День Хаоса', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про День Хаоса.mp3'},
  {'icon': iconImage, 'title': 'Про Дятла', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про Дятла.mp3'},
  {'icon': iconImage, 'title': 'Про Илью Муромца', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про Илью Муромца.mp3'},
  {'icon': iconImage, 'title': 'Про Инвалида', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про инвалида.mp3'},
  {'icon': iconImage, 'title': 'Про Италию', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про Италию.mp3'},
  {'icon': iconImage, 'title': 'Про Кокоиновый Куст', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про Кокоиновый Куст.mp3'},
  {'icon': iconImage, 'title': 'Про Колбасу', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про колбасу.mp3'},
  {'icon': iconImage, 'title': 'Про Мудрого Китайца Джуан Дзы', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про Мудрого Китайца Джуан-Дзы.mp3'},
  {'icon': iconImage, 'title': 'Про Музыкантов', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про Музыкантов.mp3'},
  {'icon': iconImage, 'title': 'Про Мышу', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про Мышу.mp3'},
  {'icon': iconImage, 'title': 'Про Обезьян', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про Обезьян.mp3'},
  {'icon': iconImage, 'title': 'Про Одинаковых Людей', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про Одинаковых Людей.mp3'},
  {'icon': iconImage, 'title': 'Про Олдовых Людей', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про Олдовых Людей.mp3'},
  {'icon': iconImage, 'title': 'Про Призраков', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про Призраков.mp3'},
  {'icon': iconImage, 'title': 'Про Совсем Хороших Людей', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про Совсем Хороших Людей.mp3'},
  {'icon': iconImage, 'title': 'Про Сотворение Человека(непал)', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про Сотворение Человека(непал).mp3'},
  {'icon': iconImage, 'title': 'Про Тадж Махал', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про Тадж Махал.mp3'},
  {'icon': iconImage, 'title': 'Про Тигра И Кошку', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про тигра и кошку.mp3'},
  {'icon': iconImage, 'title': 'Про Трех Астрологов', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про Трех Астрологов.mp3'},
  {'icon': iconImage, 'title': 'Про Упрямого Царевича', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про Упрямого Царевича.mp3'},
  {'icon': iconImage, 'title': 'Про Шиву', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Про Шиву.mp3'},
  {'icon': iconImage, 'title': 'Снова За Калбасу', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Снова За Калбасу.mp3'},
  {'icon': iconImage, 'title': 'Снова Про Гавно', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Снова Про Гавно.mp3'},
  {'icon': iconImage, 'title': 'Траханый Берг1', 'file': '../../../../../../../Test/Music/М.Задорнов/Анекдоты/Траханый Берг/Траханый Берг1.mp3'},
  {'icon': iconImage, 'title': 'Траханый Берг2', 'file': '../../../../../../../Test/Music/М.Задорнов/Анекдоты/Траханый Берг/Траханый Берг2.mp3'},
  {'icon': iconImage, 'title': 'Траханый Берг3', 'file': '../../../../../../../Test/Music/М.Задорнов/Анекдоты/Траханый Берг/Траханый Берг3.mp3'},
  {'icon': iconImage, 'title': 'Траханый Берг4', 'file': '../../../../../../../Test/Music/М.Задорнов/Анекдоты/Траханый Берг/Траханый Берг4.mp3'},
  {'icon': iconImage, 'title': 'Хазанов', 'file': '../../../../../../../Test/Music/М.Задорнов/Хазанов.mp3'},
  {'icon': iconImage, 'title': 'Хали Гали', 'file': '../../../../../../../Test/Music/М.Задорнов/Анекдоты/Траханый Берг/Хали Гали.mp3'},
  {'icon': iconImage, 'title': 'Художник', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Художник.mp3'},
  {'icon': iconImage, 'title': 'Чего Хочет Бог', 'file': '../../../../../../../Test/Music/М.Задорнов/Растаманские сказки/Чего хочет Бог.mp3'},
  {'icon': iconImage, 'title': 'Шуфрин', 'file': '../../../../../../../Test/Music/М.Задорнов/Шуфрин.mp3'},
  {'icon': iconImage, 'title': 'Шуфрин(ало Люсь)', 'file': '../../../../../../../Test/Music/М.Задорнов/Шуфрин(Ало Люсь).mp3'},
  {'icon': iconImage, 'title': 'Шуфрин1', 'file': '../../../../../../../Test/Music/М.Задорнов/Шуфрин1.mp3'},
]);
})

document.getElementById('машаимедведи').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Без Тебя', 'file': '../../../../../../../Test/Music/маша и медведи/Без тебя.mp3'},
  {'icon': iconImage, 'title': 'Земля', 'file': '../../../../../../../Test/Music/маша и медведи/Земля.mp3'},
  {'icon': iconImage, 'title': 'Любочка', 'file': '../../../../../../../Test/Music/маша и медведи/Любочка.mp3'},
]);
})

document.getElementById('машинавремени').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Ангел Пустых Бутылок', 'file': '../../../../../../../Test/Music/Машина  Времени/2001 - Место где свет/Ангел пустых бутылок.mp3'},
  {'icon': iconImage, 'title': 'Ах Какой Был Изысканный Бал', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1985 - Песни под гитару 1/Ах, какой был изысканный бал.mp3'},
  {'icon': iconImage, 'title': 'Аэрофлотская', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/Аэрофлотская.MP3'},
  {'icon': iconImage, 'title': 'Барьер', 'file': '../../../../../../../Test/Music/Машина  Времени/1979 - 85 Лучшие песни/Барьер.mp3'},
  {'icon': iconImage, 'title': 'Братский Вальсок', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1994 - Я рисую тебя/Братский вальсок.mp3'},
  {'icon': iconImage, 'title': 'В Добрый Час', 'file': '../../../../../../../Test/Music/Машина  Времени/В добрый час/В добрый час.WAV'},
  {'icon': iconImage, 'title': 'Варьете', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1998 - Женский альбом/Варьете.mp3'},
  {'icon': iconImage, 'title': 'Вверх', 'file': '../../../../../../../Test/Music/Машина  Времени/2001 - Место где свет/Вверх.mp3'},
  {'icon': iconImage, 'title': 'Ветер Надежды', 'file': '../../../../../../../Test/Music/Машина  Времени/В круге света/Ветер надежды.WAV'},
  {'icon': iconImage, 'title': 'Видео Магнитофон', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1985 - Песни под гитару 1/Видео магнитофон.mp3'},
  {'icon': iconImage, 'title': 'Время', 'file': '../../../../../../../Test/Music/Машина  Времени/1979 - 85 Лучшие песни/Время.mp3'},
  {'icon': iconImage, 'title': 'Дружба', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1996 - Песни, которые я люблю/Дружба.mp3'},
  {'icon': iconImage, 'title': 'Если Бы Мы Были Взрослей', 'file': '../../../../../../../Test/Music/Машина  Времени/Реки и мосты/Если бы мы были взрослей.WAV'},
  {'icon': iconImage, 'title': 'За Тех Кто В Море', 'file': '../../../../../../../Test/Music/Машина  Времени/В добрый час/За тех, кто в море.mp3'},
  {'icon': iconImage, 'title': 'Звезды Не Ездят В Метро', 'file': '../../../../../../../Test/Music/Машина  Времени/2001 - Место где свет/Звезды не ездят в метро.mp3'},
  {'icon': iconImage, 'title': 'Знаю Только Я', 'file': '../../../../../../../Test/Music/Машина  Времени/Внештатный командир земли/Знаю только я.WAV'},
  {'icon': iconImage, 'title': 'И Опять Мне Снится Одно И То Же', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1998 - Женский альбом/И опять мне снится одно и то же.mp3'},
  {'icon': iconImage, 'title': 'Идут На Север', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1996 - Песни, которые я люблю/Идут на север.mp3'},
  {'icon': iconImage, 'title': 'Из Гельминтов', 'file': '../../../../../../../Test/Music/Машина  Времени/1999 - Часы и знаки/Из Гельминтов.mp3'},
  {'icon': iconImage, 'title': 'Иногда Я Пою', 'file': '../../../../../../../Test/Music/Машина  Времени/2001 - Место где свет/Иногда я пою.mp3'},
  {'icon': iconImage, 'title': 'Когда Я Был Большим', 'file': '../../../../../../../Test/Music/Машина  Времени/Внештатный командир земли/Когда я был большим.WAV'},
  {'icon': iconImage, 'title': 'Когда Я Вернусь', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1996 - Песни, которые я люблю/Когда я вернусь.mp3'},
  {'icon': iconImage, 'title': 'Костер', 'file': '../../../../../../../Test/Music/Машина  Времени/1979 - 85 Лучшие песни/Костер.mp3'},
  {'icon': iconImage, 'title': 'Костер', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/Костер.mp3'},
  {'icon': iconImage, 'title': 'Кошка Которая Гуляет Сама По Себе', 'file': '../../../../../../../Test/Music/Машина  Времени/Реки и мосты/Кошка, которая гуляет сама по себе.mp3'},
  {'icon': iconImage, 'title': 'Лейся Песня', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1996 - Песни, которые я люблю/Лейся, песня.mp3'},
  {'icon': iconImage, 'title': 'Маленькие Герои', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1985 - Песни под гитару 1/Маленькие герои.mp3'},
  {'icon': iconImage, 'title': 'Марионетки', 'file': '../../../../../../../Test/Music/Машина  Времени/Десять лет спустя/Марионетки .mp3'},
  {'icon': iconImage, 'title': 'Марионетки', 'file': '../../../../../../../Test/Music/Машина  Времени/Десять лет спустя/Марионетки.mp3'},
  {'icon': iconImage, 'title': 'Меня Очень Не Любят Эстеты', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1998 - Женский альбом/Меня очень не любят эстеты.mp3'},
  {'icon': iconImage, 'title': 'Место Где Свет', 'file': '../../../../../../../Test/Music/Машина  Времени/2001 - Место где свет/Место где свет.mp3'},
  {'icon': iconImage, 'title': 'Монолог Бруклинского Таксиста', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1998 - Женский альбом/Монолог Бруклинского таксиста.mp3'},
  {'icon': iconImage, 'title': 'Монолог Гражданина', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/Монолог гражданина.MP3'},
  {'icon': iconImage, 'title': 'Морской Закон', 'file': '../../../../../../../Test/Music/Машина  Времени/1979 - 85 Лучшие песни/Морской закон.mp3'},
  {'icon': iconImage, 'title': 'Музыка Под Снегом', 'file': '../../../../../../../Test/Music/Машина  Времени/В добрый час/Музыка под снегом.mp3'},
  {'icon': iconImage, 'title': 'Мы Сойдем Сума', 'file': '../../../../../../../Test/Music/Машина  Времени/1999 - Часы и знаки/Мы сойдем сума.mp3'},
  {'icon': iconImage, 'title': 'На Абрикосовых Холмах', 'file': '../../../../../../../Test/Music/Машина  Времени/1999 - Часы и знаки/На абрикосовых холмах.mp3'},
  {'icon': iconImage, 'title': 'На Неглинке', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1998 - Женский альбом/На Неглинке.mp3'},
  {'icon': iconImage, 'title': 'На Семи Ветрах', 'file': '../../../../../../../Test/Music/Машина  Времени/Внештатный командир земли/На семи ветрах.WAV'},
  {'icon': iconImage, 'title': 'Нас Ещё Не Согнули Годы', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1985 - Песни под гитару 2/Нас ещё не согнули годы.mp3'},
  {'icon': iconImage, 'title': 'Наш Дом', 'file': '../../../../../../../Test/Music/Машина  Времени/Десять лет спустя/Наш дом.mp3'},
  {'icon': iconImage, 'title': 'Не Маячит Надежда Мне', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/Не маячит надежда мне.MP3'},
  {'icon': iconImage, 'title': 'Не Надо Так', 'file': '../../../../../../../Test/Music/Машина  Времени/2001 - Место где свет/Не надо так.mp3'},
  {'icon': iconImage, 'title': 'Небо', 'file': '../../../../../../../Test/Music/Машина  Времени/2001 - Место где свет/Небо.mp3'},
  {'icon': iconImage, 'title': 'Однажды Мир Прогнётся Под Нас', 'file': '../../../../../../../Test/Music/Машина  Времени/Однажды мир прогнётся под нас.mp3'},
  {'icon': iconImage, 'title': 'Он Был Старше Ее', 'file': '../../../../../../../Test/Music/Машина  Времени/2000 - Время напрокат/Он был старше ее.MP3'},
  {'icon': iconImage, 'title': 'Она Идет По Жизни Смеясь', 'file': '../../../../../../../Test/Music/Машина  Времени/Реки и мосты/Она идет по жизни, смеясь.WAV'},
  {'icon': iconImage, 'title': 'Она Идет По Жизни Смеясь', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/Она идет по жизни, смеясь.mp3'},
  {'icon': iconImage, 'title': 'Опустошение', 'file': '../../../../../../../Test/Music/Машина  Времени/1979 - 85 Лучшие песни/Опустошение.mp3'},
  {'icon': iconImage, 'title': 'Оставь Меня', 'file': '../../../../../../../Test/Music/Машина  Времени/2001 - Место где свет/Оставь меня.mp3'},
  {'icon': iconImage, 'title': 'Отчего Так Жесток Свет', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/Отчего так жесток свет .MP3'},
  {'icon': iconImage, 'title': 'Памяти Бродского', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1998 - Женский альбом/Памяти Бродского.mp3'},
  {'icon': iconImage, 'title': 'Памяти В Высотского', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1985 - Песни под гитару 1/Памяти В. Высотского.mp3'},
  {'icon': iconImage, 'title': 'Перекресток', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1999 - Перекресток/Перекресток.mp3'},
  {'icon': iconImage, 'title': 'Песня Про Надежду', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1998 - Женский альбом/Песня про надежду.mp3'},
  {'icon': iconImage, 'title': 'Песня Про Первых', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1985 - Песни под гитару 2/Песня про первых.mp3'},
  {'icon': iconImage, 'title': 'По Домам', 'file': '../../../../../../../Test/Music/Машина  Времени/2001 - Место где свет/По домам.mp3'},
  {'icon': iconImage, 'title': 'Поворот', 'file': '../../../../../../../Test/Music/Машина  Времени/Десять лет спустя/Поворот.WAV'},
  {'icon': iconImage, 'title': 'Подражание Вертинскому', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1998 - Женский альбом/Подражание Вертинскому.mp3'},
  {'icon': iconImage, 'title': 'Пока Горит Cвeча', 'file': '../../../../../../../Test/Music/Машина  Времени/В добрый час/Пока горит cвeча.mp3'},
  {'icon': iconImage, 'title': 'Пока Горит Свеча', 'file': '../../../../../../../Test/Music/Машина  Времени/В добрый час/Пока горит свеча.WAV'},
  {'icon': iconImage, 'title': 'Посвящение Архитектурному Институту', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1998 - Женский альбом/Посвящение Архитектурному институту.mp3'},
  {'icon': iconImage, 'title': 'Путь', 'file': '../../../../../../../Test/Music/Машина  Времени/Путь.mp3'},
  {'icon': iconImage, 'title': 'Пятнадцать К Тридцати', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1985 - Песни под гитару 1/Пятнадцать к тридцати.mp3'},
  {'icon': iconImage, 'title': 'Разговор В Поезде', 'file': '../../../../../../../Test/Music/Машина  Времени/1979 - 85 Лучшие песни/Разговор в поезде.mp3'},
  {'icon': iconImage, 'title': 'Рождественская Песня', 'file': '../../../../../../../Test/Music/Машина  Времени/Внештатный командир земли/Рождественская песня.WAV'},
  {'icon': iconImage, 'title': 'Романс', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1996 - Песни, которые я люблю/Романс.mp3'},
  {'icon': iconImage, 'title': 'Самая Тихая Песня', 'file': '../../../../../../../Test/Music/Машина  Времени/Десять лет спустя/Самая тихая песня.WAV'},
  {'icon': iconImage, 'title': 'Синяя Птица', 'file': '../../../../../../../Test/Music/Машина  Времени/1979 - 85 Лучшие песни/Синяя птица.mp3'},
  {'icon': iconImage, 'title': 'Снег', 'file': '../../../../../../../Test/Music/Машина  Времени/В добрый час/Снег.WAV'},
  {'icon': iconImage, 'title': 'Снег', 'file': '../../../../../../../Test/Music/Машина  Времени/2000 - Время напрокат/Снег.mp3'},
  {'icon': iconImage, 'title': 'Спецназ', 'file': '../../../../../../../Test/Music/Машина  Времени/1979 - 85 Лучшие песни/Спецназ.mp3'},
  {'icon': iconImage, 'title': 'Старый Рок Н Ролл', 'file': '../../../../../../../Test/Music/Машина  Времени/В добрый час/Старый рок-н-ролл.WAV'},
  {'icon': iconImage, 'title': 'Странные Дни', 'file': '../../../../../../../Test/Music/Машина  Времени/1999 - Часы и знаки/Странные дни.mp3'},
  {'icon': iconImage, 'title': 'Темная Ночь', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1996 - Песни, которые я люблю/Темная ночь.mp3'},
  {'icon': iconImage, 'title': 'Тихие Песни', 'file': '../../../../../../../Test/Music/Машина  Времени/Картонные крылья любви/Тихие песни.WAV'},
  {'icon': iconImage, 'title': 'Три Сестры', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/А.Макаревич и Б.Гребенщиков/1996 - Двадцать лет спустя/Три сестры.mp3'},
  {'icon': iconImage, 'title': 'Ты Или Я', 'file': '../../../../../../../Test/Music/Машина  Времени/Десять лет спустя/Ты или я.mp3'},
  {'icon': iconImage, 'title': 'У Ломбарда', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/А.Макаревич и Б.Гребенщиков/1996 - Двадцать лет спустя/У ломбарда.mp3'},
  {'icon': iconImage, 'title': 'Уходящее Лето', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1985 - Песни под гитару 2/Уходящее лето.mp3'},
  {'icon': iconImage, 'title': 'Флаг', 'file': '../../../../../../../Test/Music/Машина  Времени/2000 - Время напрокат/Флаг.MP3'},
  {'icon': iconImage, 'title': 'Флюгер', 'file': '../../../../../../../Test/Music/Машина  Времени/Реки и мосты/Флюгер.mp3'},
  {'icon': iconImage, 'title': 'Я Не Видел Войны', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1985 - Песни под гитару 2/Я не видел войны.mp3'},
  {'icon': iconImage, 'title': 'Я Смысл Этой Жизни Вижу В Том', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/Я смысл этой жизни вижу в том .MP3'},
  {'icon': iconImage, 'title': 'Я Сюда Еще Вернусь', 'file': '../../../../../../../Test/Music/Машина  Времени/1979 - 85 Лучшие песни/Я сюда еще вернусь.mp3'},
  {'icon': iconImage, 'title': 'Я Хотел Бы Пройти Сто Дорог', 'file': '../../../../../../../Test/Music/Машина  Времени/А. Макаревич/1985 - Песни под гитару 1/Я хотел бы пройти сто дорог.mp3'},
]);
})

document.getElementById('мумийтроль').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Владивосток 2000', 'file': '../../../../../../../Test/Music/мумий троль/Владивосток 2000.mp3'},
  {'icon': iconImage, 'title': 'Дельфины', 'file': '../../../../../../../Test/Music/мумий троль/Дельфины.mp3'},
  {'icon': iconImage, 'title': 'Невеста', 'file': '../../../../../../../Test/Music/мумий троль/Невеста.mp3'},
  {'icon': iconImage, 'title': 'Это По Любви', 'file': '../../../../../../../Test/Music/мумий троль/Это по любви .mp3'},
]);
})

document.getElementById('о.газманов').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'А Я Девужек Люблю', 'file': '../../../../../../../Test/Music/О.Газманов/А я девужек люблю.mp3'},
  {'icon': iconImage, 'title': 'А Я Девушек Люблю!', 'file': '../../../../../../../Test/Music/О.Газманов/2006 - Лучшее/А я девушек люблю!.mp3'},
  {'icon': iconImage, 'title': 'А Я Девушек Люблю!', 'file': '../../../../../../../Test/Music/О.Газманов/1996 - Бродяга/А я девушек люблю!.mp3'},
  {'icon': iconImage, 'title': 'Бродяга', 'file': '../../../../../../../Test/Music/О.Газманов/Бродяга.mp4'},
  {'icon': iconImage, 'title': 'Бродяга', 'file': '../../../../../../../Test/Music/О.Газманов/1996 - Бродяга/Бродяга.mp3'},
  {'icon': iconImage, 'title': 'Бродяга', 'file': '../../../../../../../Test/Music/О.Газманов/Бродяга.mp3'},
  {'icon': iconImage, 'title': 'Ветер', 'file': '../../../../../../../Test/Music/О.Газманов/1991 - Эскадрон/Ветер.mp3'},
  {'icon': iconImage, 'title': 'Ветер', 'file': '../../../../../../../Test/Music/О.Газманов/Ветер.mp3'},
  {'icon': iconImage, 'title': 'Вороны', 'file': '../../../../../../../Test/Music/О.Газманов/1993 - Морячка/Вороны.mp3'},
  {'icon': iconImage, 'title': 'Вот И Лето Пришло', 'file': '../../../../../../../Test/Music/О.Газманов/Вот и лето пришло.MP3'},
  {'icon': iconImage, 'title': 'Вот И Лето Прошло', 'file': '../../../../../../../Test/Music/О.Газманов/2003 - Мои Ясные Дни/Вот И Лето Прошло.mp3'},
  {'icon': iconImage, 'title': 'Говорила Мама', 'file': '../../../../../../../Test/Music/О.Газманов/Говорила мама.mp3'},
  {'icon': iconImage, 'title': 'Детство Моё', 'file': '../../../../../../../Test/Music/О.Газманов/2003 - Мои Ясные Дни/Детство Моё.mp3'},
  {'icon': iconImage, 'title': 'Дождись', 'file': '../../../../../../../Test/Music/О.Газманов/2006 - Лучшие песни. Новая коллекция/Дождись.mp3'},
  {'icon': iconImage, 'title': 'Дождь', 'file': '../../../../../../../Test/Music/О.Газманов/Дождь.mp3'},
  {'icon': iconImage, 'title': 'Дороги', 'file': '../../../../../../../Test/Music/О.Газманов/Дороги.mp3'},
  {'icon': iconImage, 'title': 'Дороги', 'file': '../../../../../../../Test/Music/О.Газманов/1994 - Загулял/Дороги.mp3'},
  {'icon': iconImage, 'title': 'Друг', 'file': '../../../../../../../Test/Music/О.Газманов/Друг.mp3'},
  {'icon': iconImage, 'title': 'Друг', 'file': '../../../../../../../Test/Music/О.Газманов/1994 - Загулял/Друг.mp3'},
  {'icon': iconImage, 'title': 'Единственная', 'file': '../../../../../../../Test/Music/О.Газманов/Единственная.mp3'},
  {'icon': iconImage, 'title': 'Единственная', 'file': '../../../../../../../Test/Music/О.Газманов/1996 - Бродяга/Единственная.mp3'},
  {'icon': iconImage, 'title': 'Есаул', 'file': '../../../../../../../Test/Music/О.Газманов/Есаул.mp3'},
  {'icon': iconImage, 'title': 'Есаул', 'file': '../../../../../../../Test/Music/О.Газманов/1991 - Эскадрон/Есаул.mp3'},
  {'icon': iconImage, 'title': 'Загулял', 'file': '../../../../../../../Test/Music/О.Газманов/1994 - Загулял/Загулял.mp3'},
  {'icon': iconImage, 'title': 'Загулял', 'file': '../../../../../../../Test/Music/О.Газманов/Загулял.mp3'},
  {'icon': iconImage, 'title': 'Красная Книга', 'file': '../../../../../../../Test/Music/О.Газманов/1998 - Красная книга/Красная книга.mp3'},
  {'icon': iconImage, 'title': 'Люси', 'file': '../../../../../../../Test/Music/О.Газманов/1991 - Эскадрон/Люси.mp3'},
  {'icon': iconImage, 'title': 'Марш Высотников', 'file': '../../../../../../../Test/Music/О.Газманов/1998 - Красная книга/Марш высотников.mp3'},
  {'icon': iconImage, 'title': 'Милые Алые Зори', 'file': '../../../../../../../Test/Music/О.Газманов/1996 - Бродяга/Милые, алые зори.mp3'},
  {'icon': iconImage, 'title': 'Мне Не Нравится Дождь', 'file': '../../../../../../../Test/Music/О.Газманов/1998 - Красная книга/Мне не нравится дождь.mp3'},
  {'icon': iconImage, 'title': 'Мои Ясные Дни', 'file': '../../../../../../../Test/Music/О.Газманов/2003 - Мои Ясные Дни/Мои Ясные Дни.mp3'},
  {'icon': iconImage, 'title': 'Морячка', 'file': '../../../../../../../Test/Music/О.Газманов/1993 - Морячка/Морячка.mp3'},
  {'icon': iconImage, 'title': 'Морячка', 'file': '../../../../../../../Test/Music/О.Газманов/Морячка.mp3'},
  {'icon': iconImage, 'title': 'Москва', 'file': '../../../../../../../Test/Music/О.Газманов/1993 - Морячка/Москва.mp3'},
  {'icon': iconImage, 'title': 'Москва', 'file': '../../../../../../../Test/Music/О.Газманов/Москва.mp3'},
  {'icon': iconImage, 'title': 'Мотылек', 'file': '../../../../../../../Test/Music/О.Газманов/1998 - Красная книга/Мотылек.mp3'},
  {'icon': iconImage, 'title': 'Мотылек', 'file': '../../../../../../../Test/Music/О.Газманов/Мотылек.mp3'},
  {'icon': iconImage, 'title': 'На Заре', 'file': '../../../../../../../Test/Music/О.Газманов/2000 - Из века в век/На заре.mp3'},
  {'icon': iconImage, 'title': 'На Заре', 'file': '../../../../../../../Test/Music/О.Газманов/На заре.MP3'},
  {'icon': iconImage, 'title': 'Остров Затонувших Кораблей', 'file': '../../../../../../../Test/Music/О.Газманов/1998 - Красная книга/Остров затонувших кораблей.mp3'},
  {'icon': iconImage, 'title': 'Офицеры', 'file': '../../../../../../../Test/Music/О.Газманов/1993 - Морячка/Офицеры.mp3'},
  {'icon': iconImage, 'title': 'Офицеры', 'file': '../../../../../../../Test/Music/О.Газманов/Офицеры.mp3'},
  {'icon': iconImage, 'title': 'Питер', 'file': '../../../../../../../Test/Music/О.Газманов/1993 - Морячка/Питер.mp3'},
  {'icon': iconImage, 'title': 'Питербург Петроград Ленинград', 'file': '../../../../../../../Test/Music/О.Газманов/Питербург Петроград Ленинград.mp3'},
  {'icon': iconImage, 'title': 'Путана', 'file': '../../../../../../../Test/Music/О.Газманов/1991 - Эскадрон/Путана.mp3'},
  {'icon': iconImage, 'title': 'Путана', 'file': '../../../../../../../Test/Music/О.Газманов/Путана.mp3'},
  {'icon': iconImage, 'title': 'Танцуй Пока Молодой', 'file': '../../../../../../../Test/Music/О.Газманов/1993 - Морячка/Танцуй, пока молодой.mp3'},
  {'icon': iconImage, 'title': 'Тень Буревестника', 'file': '../../../../../../../Test/Music/О.Газманов/2006 - Лучшие песни. Новая коллекция/Тень буревестника.mp3'},
  {'icon': iconImage, 'title': 'Туман', 'file': '../../../../../../../Test/Music/О.Газманов/2006 - Лучшие песни. Новая коллекция/Туман.mp3'},
  {'icon': iconImage, 'title': 'Хвастать Милая Не Стану', 'file': '../../../../../../../Test/Music/О.Газманов/1998 - Красная книга/Хвастать, милая, не стану.mp3'},
  {'icon': iconImage, 'title': 'Эскадрон', 'file': '../../../../../../../Test/Music/О.Газманов/Эскадрон.mp3'},
  {'icon': iconImage, 'title': 'Эскадрон', 'file': '../../../../../../../Test/Music/О.Газманов/Эскадрон.mp4'},
  {'icon': iconImage, 'title': 'Эскадрон', 'file': '../../../../../../../Test/Music/О.Газманов/1991 - Эскадрон/Эскадрон.mp3'},
  {'icon': iconImage, 'title': 'Этот День', 'file': '../../../../../../../Test/Music/О.Газманов/Этот день.mp3'},
  {'icon': iconImage, 'title': 'Этот День', 'file': '../../../../../../../Test/Music/О.Газманов/Этот день.mp4'},
  {'icon': iconImage, 'title': 'Этот День', 'file': '../../../../../../../Test/Music/О.Газманов/1998 - Красная книга/Этот день.mp3'},
]);
})

document.getElementById('песниизкинофильмов').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '12 Cтульев', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/12 cтульев.mp3'},
  {'icon': iconImage, 'title': '12 Стульев', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/12 стульев.mp3'},
  {'icon': iconImage, 'title': '33 Коровы', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/33 коровы.mp3'},
  {'icon': iconImage, 'title': '5 Минут', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/5 Минут.mp3'},
  {'icon': iconImage, 'title': 'A Stroll Through Town', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/1992 - Beethoven/a_stroll_through_town.mp3'},
  {'icon': iconImage, 'title': 'A Weekend In The Country', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/1993 - The World of Jeeves and Wooster/A Weekend In The Country.mp3'},
  {'icon': iconImage, 'title': 'Addio A Cheyene', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Ennio Morricone/1968 - Once Upon a Time in the West/Addio A Cheyene.mp3'},
  {'icon': iconImage, 'title': 'After Dark', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Pulp Fiction/After dark.mp3'},
  {'icon': iconImage, 'title': 'Alicia Discovers Nashs Dark World', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/Beautiful Mind/Alicia Discovers Nash%27s Dark World.mp3'},
  {'icon': iconImage, 'title': 'All Love Can Be', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/Beautiful Mind/All Love Can Be.mp3'},
  {'icon': iconImage, 'title': 'Angel', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Snatch/Angel.mp3'},
  {'icon': iconImage, 'title': 'Angel', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Massive Attack/1998 - Mezzanine/Angel.mp3'},
  {'icon': iconImage, 'title': 'Beautiful Lie', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/Beautiful Lie.mp3'},
  {'icon': iconImage, 'title': 'Begine', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/Brave Heart/Begine.mp3'},
  {'icon': iconImage, 'title': 'Bemidji Mn', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Bemidji, MN.mp3'},
  {'icon': iconImage, 'title': 'Bethoven', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Bethoven.mp3'},
  {'icon': iconImage, 'title': 'Brave Heart', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/Brave Heart/Brave Heart.mp3'},
  {'icon': iconImage, 'title': 'Bullwinkle', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Pulp Fiction/Bullwinkle.mp3'},
  {'icon': iconImage, 'title': 'Chi Mai', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Ennio Morricone/1981 - Профессионал/Chi Mai.mp3'},
  {'icon': iconImage, 'title': 'Closing Credits', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/Beautiful Mind/Closing Credits.mp3'},
  {'icon': iconImage, 'title': 'Cornfield Chase', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/2014 - Interstellar/Cornfield Chase.mp3'},
  {'icon': iconImage, 'title': 'Cracking The Russian Codes', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/Beautiful Mind/Cracking the Russian Codes.mp3'},
  {'icon': iconImage, 'title': 'Creating Governing Dynamics', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/Beautiful Mind/Creating Governing Dynamics%27.mp3'},
  {'icon': iconImage, 'title': 'Cross The Tracks', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Snatch/Cross The Tracks.mp3'},
  {'icon': iconImage, 'title': 'Day One', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/2014 - Interstellar/Day One.mp3'},
  {'icon': iconImage, 'title': 'Day One Dark', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/2014 - Interstellar/Day One Dark.mp3'},
  {'icon': iconImage, 'title': 'Detach', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/2014 - Interstellar/Detach.mp3'},
  {'icon': iconImage, 'title': 'Diamond', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Snatch/Diamond.mp3'},
  {'icon': iconImage, 'title': 'Disco Science', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Snatch/Disco Science.mp3'},
  {'icon': iconImage, 'title': 'Dreaming Of The Crash', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/2014 - Interstellar/Dreaming of the Crash.mp3'},
  {'icon': iconImage, 'title': 'Dust', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/2014 - Interstellar/Dust.mp3'},
  {'icon': iconImage, 'title': 'Ecstasy Of Gold', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Ennio Morricone/1966 - The Good, The Bad And The Ugly/Ecstasy of Gold.mp4'},
  {'icon': iconImage, 'title': 'Ecstasy Of Gold', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Ennio Morricone/1966 - The Good, The Bad And The Ugly/Ecstasy of Gold.mp3'},
  {'icon': iconImage, 'title': 'Edge Of Tomorrow', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/2014 - Edge of Tomorrow/Edge of Tomorrow.mp3'},
  {'icon': iconImage, 'title': 'Elysium', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/2000 - Гладиатор/Elysium.mp3'},
  {'icon': iconImage, 'title': 'End Titles', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/1996 - Independence Day/end_titles.mp3'},
  {'icon': iconImage, 'title': 'Fiat Вальс', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Артемьев/Fiat-Вальс.mp3'},
  {'icon': iconImage, 'title': 'Fin', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/Brave Heart/Fin.mp3'},
  {'icon': iconImage, 'title': 'Find Me When You Wake Up', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/2014 - Edge of Tomorrow/Find-Me-When-You-Wake-Up.mp3'},
  {'icon': iconImage, 'title': 'First Drop Off First Kiss', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/Beautiful Mind/First Drop-Off First Kiss.mp3'},
  {'icon': iconImage, 'title': 'Flight Of The Dragon', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Jackie Chan/1986 - Armour of God/Flight Of The Dragon.mp3'},
  {'icon': iconImage, 'title': 'Flight Of The Dragon', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Jackie Chan/1986 - Armour of God/Flight Of The Dragon.mp4'},
  {'icon': iconImage, 'title': 'For The Love Of A Princess', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/Brave Heart/For The Love Of A Princess.mp3'},
  {'icon': iconImage, 'title': 'Fort Walton Kansas', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/1996 - The rock/Fort walton kansas.mp3'},
  {'icon': iconImage, 'title': 'France', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/France.mp3'},
  {'icon': iconImage, 'title': 'Ghost Town', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Snatch/Ghost Town.mp3'},
  {'icon': iconImage, 'title': 'History Of Artemisia', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/2014 - 300 спартанцев/History of Artemisia.mp4'},
  {'icon': iconImage, 'title': 'History Of Artemisia', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/2014 - 300 спартанцев/History Of Artemisia.mp3'},
  {'icon': iconImage, 'title': 'Honor Him', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/2000 - Гладиатор/Honor Him.MP3'},
  {'icon': iconImage, 'title': 'Hope Overture', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Requiem of a dream/Hope Overture.mp3'},
  {'icon': iconImage, 'title': 'Htb', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/HTB.mp3'},
  {'icon': iconImage, 'title': 'Hummell Gets The Rockets', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/1996 - The rock/Hummell gets the rockets.mp3'},
  {'icon': iconImage, 'title': 'Hungry Eyes', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/1987 - Dirty Dancing/Hungry eyes.mp3'},
  {'icon': iconImage, 'title': 'I Will Always Love You', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/I Will Always Love You.MP3'},
  {'icon': iconImage, 'title': 'In The Beginning', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Emir Kusturica/Emir Kusturica & The No Smoking Orchestra La Vie Est Un Miracle x Pelotin x Robertorom/In The Beginning.mp3'},
  {'icon': iconImage, 'title': 'In The Death Car', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/In the death car.mp3'},
  {'icon': iconImage, 'title': 'In The Tunnels', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/1996 - The rock/In the tunnels.mp3'},
  {'icon': iconImage, 'title': 'Independence Day', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/1996 - Independence Day/Independence day.mp3'},
  {'icon': iconImage, 'title': 'Inertia Creeps', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Massive Attack/2006 - Collected/Inertia Creeps.mp3'},
  {'icon': iconImage, 'title': 'Jade', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/1996 - The rock/Jade.mp3'},
  {'icon': iconImage, 'title': 'Jakes First Flight (end Credit Edit)', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/2009 - Avatar/Jake%27s First Flight (End Credit Edit).mp3'},
  {'icon': iconImage, 'title': 'James Bond Theme', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Bond Theme.mp3'},
  {'icon': iconImage, 'title': 'Jeeves And Wooster', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/1993 - The World of Jeeves and Wooster/Jeeves and Wooster.mp3'},
  {'icon': iconImage, 'title': 'Kaleidoscope Of Mathematics', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/Beautiful Mind/Kaleidoscope of Mathematics.mp4'},
  {'icon': iconImage, 'title': 'Kaleidoscope Of Mathematics', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/Beautiful Mind/Kaleidoscope of Mathematics.mp3'},
  {'icon': iconImage, 'title': 'Kiss The Mother', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Emir Kusturica/Emir Kusturica & The No Smoking Orchestra La Vie Est Un Miracle x Pelotin x Robertorom/Kiss The Mother.mp3'},
  {'icon': iconImage, 'title': 'Kustu Ba05 16 Evergreen', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Emir Kusturica/Kustu-BA05-16.Evergreen.mp3'},
  {'icon': iconImage, 'title': 'Le Vent Le Cri', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Ennio Morricone/1981 - Профессионал/Le Vent, Le Cri.mp3'},
  {'icon': iconImage, 'title': 'Looking For Luka', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Emir Kusturica/Emir Kusturica & The No Smoking Orchestra La Vie Est Un Miracle x Pelotin x Robertorom/Looking For Luka.mp3'},
  {'icon': iconImage, 'title': 'Looking For Sabaha', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Emir Kusturica/Emir Kusturica & The No Smoking Orchestra La Vie Est Un Miracle x Pelotin x Robertorom/Looking For Sabaha.mp3'},
  {'icon': iconImage, 'title': 'Luomo Dellarmonica', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Ennio Morricone/1968 - Once Upon a Time in the West/L%27uomo Dell%27armonica.mp4'},
  {'icon': iconImage, 'title': 'Luomo Dellarmonica', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Ennio Morricone/1968 - Once Upon a Time in the West/L%27uomo Dell%27armonica.mp3'},
  {'icon': iconImage, 'title': 'Main Theme', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/1999 - Д.Д.Д/Main Theme.mp3'},
  {'icon': iconImage, 'title': 'Main Title', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Main title.mp3'},
  {'icon': iconImage, 'title': 'Misirlou', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Pulp Fiction/Misirlou.mp3'},
  {'icon': iconImage, 'title': 'Modern Time', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Modern time.mp3'},
  {'icon': iconImage, 'title': 'Mountains', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/2014 - Interstellar/Mountains.mp3'},
  {'icon': iconImage, 'title': 'My Heart Will Go On', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/My Heart Will Go On.mp3'},
  {'icon': iconImage, 'title': 'Nash Descends Into Parchers World', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/Beautiful Mind/Nash Descends into Parcher%27s World.mp3'},
  {'icon': iconImage, 'title': 'Now We Are Free', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/2000 - Гладиатор/Now We Are Free.mp4'},
  {'icon': iconImage, 'title': 'Now We Are Free', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/2000 - Гладиатор/Now we are free.mp3'},
  {'icon': iconImage, 'title': 'Of One Heart Of One Mind', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/Beautiful Mind/Of One Heart Of One Mind.mp3'},
  {'icon': iconImage, 'title': 'Once Upon A Time In America', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Ennio Morricone/1984 - Once Upon A Time In America/Once Upon A Time In America.mp3'},
  {'icon': iconImage, 'title': 'Operation Condor', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Jackie Chan/1991 - Armour of God II/Operation Condor.mp3'},
  {'icon': iconImage, 'title': 'Outlawed Tunes On Outlawed Pip', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/Brave Heart/Outlawed Tunes On Outlawed Pip.mp3'},
  {'icon': iconImage, 'title': 'Patricide', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/2000 - Гладиатор/Patricide.mp3'},
  {'icon': iconImage, 'title': 'Police Story', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Jackie Chan/1985 - Police Story/Police Story.mp3'},
  {'icon': iconImage, 'title': 'Police Story Ii', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Jackie Chan/1988 - Police Story II/Police Story II.mp3'},
  {'icon': iconImage, 'title': 'Por Una Cabeza', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Por una cabeza.mp3'},
  {'icon': iconImage, 'title': 'Project A Ii', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Jackie Chan/1987 - Project A II/Project A II.mp3'},
  {'icon': iconImage, 'title': 'Prologue', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/1996 - Independence Day/Prologue.mp3'},
  {'icon': iconImage, 'title': 'Prologue Film Version', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/1996 - Independence Day/Prologue film version.mp3'},
  {'icon': iconImage, 'title': 'Rain Man', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/Rain man.mp3'},
  {'icon': iconImage, 'title': 'Rain Mаn', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/Rain mаn.mp3'},
  {'icon': iconImage, 'title': 'Real Or Imagines', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/Beautiful Mind/Real or Imagines.mp3'},
  {'icon': iconImage, 'title': 'Rose', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/Titanic/Rose.mp3'},
  {'icon': iconImage, 'title': 'Saying Goodbye To Those You So Love', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/Beautiful Mind/Saying Goodbye to Those You So Love.mp3'},
  {'icon': iconImage, 'title': 'Shape Of My Heart', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Shape of My Heart.mp3'},
  {'icon': iconImage, 'title': 'Snatch', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Snatch/Snatch.mp3'},
  {'icon': iconImage, 'title': 'Star Wars', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Star  Wars.MP3'},
  {'icon': iconImage, 'title': 'Stay', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/2014 - Interstellar/Stay.mp3'},
  {'icon': iconImage, 'title': 'Summer Overture', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Requiem of a dream/Summer Overture.mp3'},
  {'icon': iconImage, 'title': 'Supermoves', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Snatch/Supermoves.mp3'},
  {'icon': iconImage, 'title': 'Teaching Mathematics Again', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/Beautiful Mind/Teaching Mathematics Again.mp3'},
  {'icon': iconImage, 'title': 'Teardrop', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Massive Attack/1998 - Mezzanine/Teardrop.mp3'},
  {'icon': iconImage, 'title': 'The Battle', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/2000 - Гладиатор/The battle.mp3'},
  {'icon': iconImage, 'title': 'The Car Chase', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/Beautiful Mind/The Car Chase.mp3'},
  {'icon': iconImage, 'title': 'The Chase', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/1996 - The rock/The chase.mp3'},
  {'icon': iconImage, 'title': 'The Darkest Day', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/1996 - Independence Day/the_darkest_day.mp3'},
  {'icon': iconImage, 'title': 'The Dog Has To Go', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/1992 - Beethoven/the_dog_has_to_go.mp3'},
  {'icon': iconImage, 'title': 'The Dogs Let Loose', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/1992 - Beethoven/the_dogs_let_loose.mp3'},
  {'icon': iconImage, 'title': 'The Kraken', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/2006 - Пираты Карибского моря/The kraken.mp3'},
  {'icon': iconImage, 'title': 'The Lively Ones', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Pulp Fiction/The lively ones.mp3'},
  {'icon': iconImage, 'title': 'The Lonely Shepherd', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/The Lonely Shepherd.mp3'},
  {'icon': iconImage, 'title': 'The Prize Of Ones Life', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/Beautiful Mind/The Prize of One%27s Life.mp3'},
  {'icon': iconImage, 'title': 'The Sinking', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/Titanic/The Sinking.mp3'},
  {'icon': iconImage, 'title': 'The Slave', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/2000 - Гладиатор/The Slave.mp3'},
  {'icon': iconImage, 'title': 'The Twins Effect', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Jackie Chan/2003 - The Twins/The Twins Effect.mp3'},
  {'icon': iconImage, 'title': 'The Waterfall', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Emir Kusturica/Emir Kusturica & The No Smoking Orchestra La Vie Est Un Miracle x Pelotin x Robertorom/The Waterfall.mp3'},
  {'icon': iconImage, 'title': 'Time', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Hans Zimmer/Time.mp3'},
  {'icon': iconImage, 'title': 'Tomorrow', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Tomorrow.mp3'},
  {'icon': iconImage, 'title': 'Tuyo', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Tuyo.mp4'},
  {'icon': iconImage, 'title': 'Tuyo', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Tuyo.mp3'},
  {'icon': iconImage, 'title': 'Unable To Stay Unwilling To Leave', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/Titanic/Unable to Stay, Unwilling to Leave.mp3'},
  {'icon': iconImage, 'title': 'Vision Of Murron', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/Brave Heart/Vision Of Murron.mp3'},
  {'icon': iconImage, 'title': 'Who Am', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Jackie Chan/1998 - Who Am/Who Am.mp3'},
  {'icon': iconImage, 'title': 'X Files', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/X-FILES.MP3'},
  {'icon': iconImage, 'title': 'You Dont Dream In Cryo', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/James Horner/2009 - Avatar/You Don%27t Dream in Cryo.mp3'},
  {'icon': iconImage, 'title': 'You Never Can Tell', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Pulp Fiction/You never can tell.mp3'},
  {'icon': iconImage, 'title': 'А На Последок', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/А на последок.mp3'},
  {'icon': iconImage, 'title': 'Атака', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Артемьев/Атака.mp3'},
  {'icon': iconImage, 'title': 'Брадобрей', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Брадобрей.mp3'},
  {'icon': iconImage, 'title': 'Была Не Была', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Андрей Миронов/Была не была.mp3'},
  {'icon': iconImage, 'title': 'В Городском Парке', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Артемьев/В городском парке.mp3'},
  {'icon': iconImage, 'title': 'Вальс', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/Вальс.mp3'},
  {'icon': iconImage, 'title': 'Вальс (петров)', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/Вальс (Петров).mp3'},
  {'icon': iconImage, 'title': 'Вальс Из Кф Мой Ласк Нежн Зверь', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Вальс из кф Мой ласк нежн зверь.mp3'},
  {'icon': iconImage, 'title': 'Вдруг Как В Сказке', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Вдруг как в сказке.mp3'},
  {'icon': iconImage, 'title': 'Ветер', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Артемьев/Ветер.mp3'},
  {'icon': iconImage, 'title': 'Визиты', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Артемьев/Визиты.mp3'},
  {'icon': iconImage, 'title': 'Возвращение', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/Возвращение.mp3'},
  {'icon': iconImage, 'title': 'Вокзал Прощания', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Михаил Таривердиев/Вокзал прощания.mp3'},
  {'icon': iconImage, 'title': 'Волшебная Страна', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/Волшебная страна.mp3'},
  {'icon': iconImage, 'title': 'Все Пройдет', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Все пройдет.mp3'},
  {'icon': iconImage, 'title': 'Вступление', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/Вступление.mp3'},
  {'icon': iconImage, 'title': 'Гардемарины', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Гардемарины.mp3'},
  {'icon': iconImage, 'title': 'Где То Далеко', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Михаил Таривердиев/Где-то далеко.mp3'},
  {'icon': iconImage, 'title': 'Гимн Квн', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Гимн КВН.mp3'},
  {'icon': iconImage, 'title': 'Город Которого Нет', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Город которого нет.mp3'},
  {'icon': iconImage, 'title': 'Гусарская Балада', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/Гусарская балада.mp3'},
  {'icon': iconImage, 'title': 'Далека Дорога Твоя', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Далека дорога твоя.mp3'},
  {'icon': iconImage, 'title': 'Даным Давно', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/Даным-давно.mp3'},
  {'icon': iconImage, 'title': 'Два Сердца', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Н. Караченцев/Два сердца.mp3'},
  {'icon': iconImage, 'title': 'Двое В Кафе', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Михаил Таривердиев/Двое в кафе.mp3'},
  {'icon': iconImage, 'title': 'Деревенский Танец', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Артемьев/Деревенский танец.mp3'},
  {'icon': iconImage, 'title': 'Дождь', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/Дождь.mp3'},
  {'icon': iconImage, 'title': 'Дорога', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Артемьев/Дорога.mp3'},
  {'icon': iconImage, 'title': 'Дороги', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Михаил Таривердиев/Дороги.mp3'},
  {'icon': iconImage, 'title': 'Друг', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Друг.mp3'},
  {'icon': iconImage, 'title': 'Дым Отечества', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Артемьев/Дым Отечества.mp3'},
  {'icon': iconImage, 'title': 'Если У Вас', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/Если у вас.mp3'},
  {'icon': iconImage, 'title': 'Если Я Был Султан', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Если я был султан.mp3'},
  {'icon': iconImage, 'title': 'Есть Только Миг', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Есть только миг.mp3'},
  {'icon': iconImage, 'title': 'Женюсь', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Андрей Миронов/Женюсь.mp3'},
  {'icon': iconImage, 'title': 'Жестокое Танго', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Андрей Миронов/Жестокое танго.mp3'},
  {'icon': iconImage, 'title': 'Живем Мы Что То Без Азарта', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/Живем мы что-то без азарта.mp3'},
  {'icon': iconImage, 'title': 'Загнанный', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/1999 - Д.Д.Д/Загнанный.mp3'},
  {'icon': iconImage, 'title': 'И Над Степью', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/1966 - Неуловимые/И над степью.mp3'},
  {'icon': iconImage, 'title': 'Из К Ф Крестный Отец', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Из к.ф Крестный Отец.mp3'},
  {'icon': iconImage, 'title': 'Из К Ф Шерлок Холмс', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Из к.ф Шерлок Холмс.mp3'},
  {'icon': iconImage, 'title': 'Из К Ф Шерлок Холмс', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Из к.ф Шерлок  Холмс.mp3'},
  {'icon': iconImage, 'title': 'Кддс', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/КДДС.mp3'},
  {'icon': iconImage, 'title': 'Кленовый Лист', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Кленовый лист.mp3'},
  {'icon': iconImage, 'title': 'Кленовый Лист', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Н. Караченцев/Кленовый лист.mp3'},
  {'icon': iconImage, 'title': 'Куплеты Шансонетки', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/1966 - Неуловимые/Куплеты шансонетки.mp3'},
  {'icon': iconImage, 'title': 'Ланфрен', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Ланфрен.mp3'},
  {'icon': iconImage, 'title': 'Маленькая Данелиада', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Маленькая Данелиада.mp3'},
  {'icon': iconImage, 'title': 'Маруся', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Маруся.mp3'},
  {'icon': iconImage, 'title': 'Марш', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/Марш.mp3'},
  {'icon': iconImage, 'title': 'Механическое Пианино', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Артемьев/Механическое пианино.mp3'},
  {'icon': iconImage, 'title': 'Мне Нравиться', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/Мне нравиться.mp3'},
  {'icon': iconImage, 'title': 'Мобила', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Мобила.mp3'},
  {'icon': iconImage, 'title': 'Моей Душе Покоя Нет', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/Моей душе покоя нет.mp3'},
  {'icon': iconImage, 'title': 'Мотоциклисты', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Артемьев/Мотоциклисты.mp3'},
  {'icon': iconImage, 'title': 'Мохнатый Шмель', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/Мохнатый шмель.mp3'},
  {'icon': iconImage, 'title': 'На Волоске', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/1999 - Д.Д.Д/На волоске.mp3'},
  {'icon': iconImage, 'title': 'На Городской Площади', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Артемьев/На городской площади.mp3'},
  {'icon': iconImage, 'title': 'На Станции', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Артемьев/На станции.mp3'},
  {'icon': iconImage, 'title': 'На Тихорецкую', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/На Тихорецкую.mp3'},
  {'icon': iconImage, 'title': 'Не Думай О Секундах С Высока', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Михаил Таривердиев/Не думай о секундах с высока.mp3'},
  {'icon': iconImage, 'title': 'Неаполитанская Песня', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Неаполитанская песня.mp3'},
  {'icon': iconImage, 'title': 'Некогда', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Некогда.mp3'},
  {'icon': iconImage, 'title': 'Никого Не Будет В Доме', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/Никого не будет в доме.mp3'},
  {'icon': iconImage, 'title': 'Ночной Город', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/1999 - Д.Д.Д/Ночной город.mp3'},
  {'icon': iconImage, 'title': 'О Москве', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/О Москве.mp3'},
  {'icon': iconImage, 'title': 'Облетают Последние Маки', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/Облетают последние маки.mp3'},
  {'icon': iconImage, 'title': 'Один День Из Детсва', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Артемьев/Один день из детсва.mp3'},
  {'icon': iconImage, 'title': 'Остров Невезения', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Андрей Миронов/Остров невезения.mp3'},
  {'icon': iconImage, 'title': 'Память Сердца', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Артемьев/Память сердца.mp3'},
  {'icon': iconImage, 'title': 'Парус', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Андрей Миронов/Парус.WAV'},
  {'icon': iconImage, 'title': 'Песенка О Несостоявшихся Надеждах', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Песенка о несостоявшихся надеждах.mp3'},
  {'icon': iconImage, 'title': 'Песня Мушкетеров', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Песня мушкетеров.mp3'},
  {'icon': iconImage, 'title': 'Песня На Пароходе', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Андрей Миронов/Песня на пароходе.mp3'},
  {'icon': iconImage, 'title': 'Песня О Хорошем Настрении', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/Песня о хорошем настрении.mp3'},
  {'icon': iconImage, 'title': 'Песня О Шпаге', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Андрей Миронов/Песня о шпаге.mp3'},
  {'icon': iconImage, 'title': 'Пикник', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Артемьев/Пикник.mp3'},
  {'icon': iconImage, 'title': 'Письмо', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Артемьев/Письмо.mp3'},
  {'icon': iconImage, 'title': 'По Улице Моей', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/По улице моей.mp3'},
  {'icon': iconImage, 'title': 'Погоня', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/1966 - Неуловимые/Погоня.mp3'},
  {'icon': iconImage, 'title': 'Погоня', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/1966 - Неуловимые/Погоня .mp3'},
  {'icon': iconImage, 'title': 'Под Лаской Плюшевого Пледа', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/Под лаской плюшевого пледа.mp3'},
  {'icon': iconImage, 'title': 'Позвони', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Позвони.mp3'},
  {'icon': iconImage, 'title': 'Поклонники', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Артемьев/Поклонники.mp3'},
  {'icon': iconImage, 'title': 'Последняя Поэма', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Последняя поэма.mp3'},
  {'icon': iconImage, 'title': 'Постой Паровоз', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Постой паровоз.mp3'},
  {'icon': iconImage, 'title': 'Прелестница Младая', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/Прелестница младая.mp3'},
  {'icon': iconImage, 'title': 'Приятно Вспомнить', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Приятно вспомнить.mp3'},
  {'icon': iconImage, 'title': 'Про Бюрократов', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/Про бюрократов.mp3'},
  {'icon': iconImage, 'title': 'Про Зайцев', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Про зайцев.mp3'},
  {'icon': iconImage, 'title': 'Про Медведей', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Про медведей.mp3'},
  {'icon': iconImage, 'title': 'Про Попинс Мэри', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/ПРО ПоПинс Мэри.mp3'},
  {'icon': iconImage, 'title': 'Прощальная Песня', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Андрей Миронов/Прощальная песня.mp3'},
  {'icon': iconImage, 'title': 'Прощание С Россией', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Артемьев/Прощание с Россией.mp3'},
  {'icon': iconImage, 'title': 'С Любимыми Не Расставайтесь', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/С любимыми не расставайтесь.mp3'},
  {'icon': iconImage, 'title': 'Сеанс Немого Кино', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Артемьев/Сеанс немого кино.mp3'},
  {'icon': iconImage, 'title': 'Синема', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Андрей Миронов/Синема.mp3'},
  {'icon': iconImage, 'title': 'Со Мною Вот Что Происходит', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/Со мною вот что происходит.mp3'},
  {'icon': iconImage, 'title': 'Страдание', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Андрей Миронов/Страдание.mp3'},
  {'icon': iconImage, 'title': 'Там Лилии Цветут', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Там лилии цветут.mp3'},
  {'icon': iconImage, 'title': 'Теряют Люди Др Др', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Теряют люди др-др.mp3'},
  {'icon': iconImage, 'title': 'Трубачи', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Андрей Миронов/Трубачи.mp3'},
  {'icon': iconImage, 'title': 'Ты Меня На Рассвете Разбудишь )', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Н. Караченцев/Ты меня на рассвете разбудишь...).mp3'},
  {'icon': iconImage, 'title': 'У Зеркала', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/У зеркала.mp3'},
  {'icon': iconImage, 'title': 'Усатый Нянь', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Усатый нянь.mp3'},
  {'icon': iconImage, 'title': 'Утро', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/Утро.mp3'},
  {'icon': iconImage, 'title': 'Флейта', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Ennio Morricone/1984 - Once Upon A Time In America/Флейта.MP3'},
  {'icon': iconImage, 'title': 'Цыганская Таборная', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/1966 - Неуловимые/Цыганская таборная.mp3'},
  {'icon': iconImage, 'title': 'Чарли Чаплин', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Чарли Чаплин.mp3'},
  {'icon': iconImage, 'title': 'Что Тебе Подарить', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Н. Караченцев/Что тебе подарить.mp3'},
  {'icon': iconImage, 'title': 'Эпилог', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Артемьев/Эпилог.mp3'},
  {'icon': iconImage, 'title': 'Я Спросил У Ясеня', 'file': '../../../../../../../Test/Music/Песни из кинофильмов/Э. Рязанов/Я спросил у ясеня.mp3'},
]);
})

document.getElementById('песниизмультфильмов').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '02 Main Titles', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1989 - The Little Mermaid/02 Main Titles.mp3'},
  {'icon': iconImage, 'title': '05 Part Of Your World', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1989 - The Little Mermaid/05 Part Of Your World.mp3'},
  {'icon': iconImage, 'title': '06 Under The Sea', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1989 - The Little Mermaid/06 Under The Sea.mp3'},
  {'icon': iconImage, 'title': '07 Part Of Your World (reprise)', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1989 - The Little Mermaid/07 Part Of Your World (Reprise).mp3'},
  {'icon': iconImage, 'title': '08 Poor Unfortunate Souls', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1989 - The Little Mermaid/08 Poor Unfortunate Souls.mp3'},
  {'icon': iconImage, 'title': '09 Les Poissons', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1989 - The Little Mermaid/09 Les Poissons.mp3'},
  {'icon': iconImage, 'title': '10 Kiss The Girl', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1989 - The Little Mermaid/10 Kiss The Girl.mp3'},
  {'icon': iconImage, 'title': '13 The Storm', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1989 - The Little Mermaid/13 The Storm.mp3'},
  {'icon': iconImage, 'title': '15 Flotsam And Jetsam', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1989 - The Little Mermaid/15 Flotsam And Jetsam.mp3'},
  {'icon': iconImage, 'title': '17 Bedtime', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1989 - The Little Mermaid/17 Bedtime.mp3'},
  {'icon': iconImage, 'title': '18 Wedding Announcement', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1989 - The Little Mermaid/18 Wedding Announcement.mp3'},
  {'icon': iconImage, 'title': 'A Whole New World', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1994 - Aladdin/A Whole New World.mp3'},
  {'icon': iconImage, 'title': 'Albert', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Albert.mp3'},
  {'icon': iconImage, 'title': 'Arabian Nights', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1994 - Aladdin/Arabian Nights.mp3'},
  {'icon': iconImage, 'title': 'At The Beginning', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/At The Beginning.mp4'},
  {'icon': iconImage, 'title': 'At The Beginning', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/At The Beginning.mp3'},
  {'icon': iconImage, 'title': 'Be Prepared', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1994 - The Lion King/Be Prepared.mp4'},
  {'icon': iconImage, 'title': 'Be Prepared', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1994 - The Lion King/Be Prepared.mp3'},
  {'icon': iconImage, 'title': 'Beauty And The Beast', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1991- Beauty And The Beast/Beauty And The Beast.mp3'},
  {'icon': iconImage, 'title': 'Beauty And The Beast Duet', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1991- Beauty And The Beast/Beauty And The Beast duet.mp3'},
  {'icon': iconImage, 'title': 'Can You Feel The Love Tonight', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1994 - The Lion King/Can you feel the love tonight.mp3'},
  {'icon': iconImage, 'title': 'Can You Feel The Love Tonight End Title', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1994 - The Lion King/Can you feel the love tonight end title.mp3'},
  {'icon': iconImage, 'title': 'Circle Of Life', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1994 - The Lion King/Circle of life.mp3'},
  {'icon': iconImage, 'title': 'Ducks', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Ducks.mp3'},
  {'icon': iconImage, 'title': 'Friend Like Me', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1994 - Aladdin/Friend Like Me.mp3'},
  {'icon': iconImage, 'title': 'Hey Mr Taliban', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Hey Mr Taliban.mp3'},
  {'icon': iconImage, 'title': 'I Just Cant Wait To Be King', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1994 - The Lion King/I just cant wait to be king.mp3'},
  {'icon': iconImage, 'title': 'Ice Age', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Ice Age.mp3'},
  {'icon': iconImage, 'title': 'Ivan Dobsky Theme', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Monkey Dust/Ivan Dobsky theme.mp3'},
  {'icon': iconImage, 'title': 'King Of Pride Rock', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1994 - The Lion King/King of pride rock.mp3'},
  {'icon': iconImage, 'title': 'Kyles Moms A Bech', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Kyle%27s Mom%27s A Bech.mp3'},
  {'icon': iconImage, 'title': 'Menuet', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Menuet.mp3'},
  {'icon': iconImage, 'title': 'Ode Of Joy', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Ode of joy.mp3'},
  {'icon': iconImage, 'title': 'Once Upon A December', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Once Upon a December.mp3'},
  {'icon': iconImage, 'title': 'Paperman', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Paperman.mp3'},
  {'icon': iconImage, 'title': 'Prince Ali', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1994 - Aladdin/Prince Ali.mp3'},
  {'icon': iconImage, 'title': 'Prologue', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1991- Beauty And The Beast/Prologue.mp3'},
  {'icon': iconImage, 'title': 'Send Me On My Way', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Send Me On My Way.mp3'},
  {'icon': iconImage, 'title': 'Send Me On My Way', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Send Me On My Way.mp4'},
  {'icon': iconImage, 'title': 'South Park', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/South park.mp3'},
  {'icon': iconImage, 'title': 'Tanec Malenkih Utyat', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Tanec malenkih utyat.mp3'},
  {'icon': iconImage, 'title': 'This Land', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1994 - The Lion King/This land.mp3'},
  {'icon': iconImage, 'title': 'To Die For', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1994 - The Lion King/To Die For.mp3'},
  {'icon': iconImage, 'title': 'Transformation', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1991- Beauty And The Beast/Transformation.mp3'},
  {'icon': iconImage, 'title': 'Under The Stars', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1994 - The Lion King/Under The Stars.mp3'},
  {'icon': iconImage, 'title': 'West Wing', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/1991- Beauty And The Beast/West wing.mp3'},
  {'icon': iconImage, 'title': 'А Как Известно Мы Народ Горячий!', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/А, Как Известно, Мы Народ Горячий!.mp3'},
  {'icon': iconImage, 'title': 'А Мoжет Быть Ворона', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/А мoжет быть, ворона.mp3'},
  {'icon': iconImage, 'title': 'А Я Все Чаще Замечаю', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/А я все чаще замечаю.wav'},
  {'icon': iconImage, 'title': 'Антошка', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Антошка.mp3'},
  {'icon': iconImage, 'title': 'Бабки Ежки', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Бабки-ежки.mp3'},
  {'icon': iconImage, 'title': 'Бандитто Сеньеритто', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Бандитто - Сеньеритто.mp3'},
  {'icon': iconImage, 'title': 'Белочка', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Белочка.mp3'},
  {'icon': iconImage, 'title': 'Белый Город', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Белый город.mp3'},
  {'icon': iconImage, 'title': 'Бемби', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Бемби.mp3'},
  {'icon': iconImage, 'title': 'Бременские Музыканты', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Бременские музыканты.mp3'},
  {'icon': iconImage, 'title': 'Буратино', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Буратино.mp3'},
  {'icon': iconImage, 'title': 'Вместе Весело Шагать', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Вместе весело шагать.mp3'},
  {'icon': iconImage, 'title': 'Голубой Вагон', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Голубой вагон.mp3'},
  {'icon': iconImage, 'title': 'Горец', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Горец.mp3'},
  {'icon': iconImage, 'title': 'Дорожная', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Дорожная.mp3'},
  {'icon': iconImage, 'title': 'Друг', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Друг.wav'},
  {'icon': iconImage, 'title': 'Кoшки Мышки', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Кoшки мышки.mp3'},
  {'icon': iconImage, 'title': 'Кабы Не Было Зимы', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Кабы не было зимы.mp3'},
  {'icon': iconImage, 'title': 'Колыбельная Медведицы', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Колыбельная медведицы.mp3'},
  {'icon': iconImage, 'title': 'Конь', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Конь.mp3'},
  {'icon': iconImage, 'title': 'Лесной Олень', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Лесной олень.mp3'},
  {'icon': iconImage, 'title': 'Летучий Корабль', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Летучий корабль.mp3'},
  {'icon': iconImage, 'title': 'Мамонтенок', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Мамонтенок.mp3'},
  {'icon': iconImage, 'title': 'Мечта', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Мечта.mp3'},
  {'icon': iconImage, 'title': 'Молодецмолодец', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Молодец,молодец.mp3'},
  {'icon': iconImage, 'title': 'Морскя Песня', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Морскя песня.mp3'},
  {'icon': iconImage, 'title': 'Нeсси', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Нeсси.mp3'},
  {'icon': iconImage, 'title': 'Настоящий Друг', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Настоящий друг.mp3'},
  {'icon': iconImage, 'title': 'Неприятность Эту Мы Переживем', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Неприятность эту мы переживем.mp3'},
  {'icon': iconImage, 'title': 'Обжоры', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Обжоры.mp3'},
  {'icon': iconImage, 'title': 'Облака', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Облака.mp3'},
  {'icon': iconImage, 'title': 'Остров Сокровищ', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Остров сокровищ.mp3'},
  {'icon': iconImage, 'title': 'Пoдарки', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Пoдарки.mp3'},
  {'icon': iconImage, 'title': 'Парад Заграничных Певцов', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Парад заграничных певцов.mp3'},
  {'icon': iconImage, 'title': 'Песенка Мамонтёнка', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Песенка мамонтёнка.mp3'},
  {'icon': iconImage, 'title': 'Песня Атаманши', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Песня Атаманши.mp3'},
  {'icon': iconImage, 'title': 'Песня Крокодила', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Песня крокодила.mp3'},
  {'icon': iconImage, 'title': 'Песня Охранников', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Песня охранников.mp3'},
  {'icon': iconImage, 'title': 'Песня Про Мальчика Бобби', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Песня про мальчика Бобби.mp4'},
  {'icon': iconImage, 'title': 'Песня Пуха', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Песня Пуха.mp3'},
  {'icon': iconImage, 'title': 'Прекрасное Далеко', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Прекрасное далеко.mp3'},
  {'icon': iconImage, 'title': 'Про Папу', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Про папу.mp3'},
  {'icon': iconImage, 'title': 'Про Сыщика', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Про сыщика.mp3'},
  {'icon': iconImage, 'title': 'Рoждественская', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Рoждественская.mp3'},
  {'icon': iconImage, 'title': 'Романтики С Большой Дороги', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Романтики с большой дороги.mp3'},
  {'icon': iconImage, 'title': 'Снегурочка', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Снегурочка.mp3'},
  {'icon': iconImage, 'title': 'Солнце Взошло', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Солнце взошло.mp3'},
  {'icon': iconImage, 'title': 'Спокойной Ночи', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Спокойной ночи.mp3'},
  {'icon': iconImage, 'title': 'Супер Сучная Сучара', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Супер сучная сучара.mp3'},
  {'icon': iconImage, 'title': 'Считайте Меня Гадом', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Считайте меня гадом.mp3'},
  {'icon': iconImage, 'title': 'Три Белых Коня', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Три белых коня.mp3'},
  {'icon': iconImage, 'title': 'Улыбка', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Улыбка.mp3'},
  {'icon': iconImage, 'title': 'Частушки', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Частушки.wav'},
  {'icon': iconImage, 'title': 'Чебурашка', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Чебурашка.mp3'},
  {'icon': iconImage, 'title': 'Чунга Чанга', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Чунга-чанга.mp3'},
  {'icon': iconImage, 'title': 'Шапокляк', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Шапокляк.mp3'},
  {'icon': iconImage, 'title': 'Шкoла', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Шкoла.mp3'},
  {'icon': iconImage, 'title': 'Ясный День', 'file': '../../../../../../../Test/Music/Песни из Мультфильмов/Ясный день.mp3'},
]);
})

document.getElementById('секрет').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Алиса', 'file': '../../../../../../../Test/Music/Секрет/Алиса.mp3'},
  {'icon': iconImage, 'title': 'В Жарких Странах', 'file': '../../../../../../../Test/Music/Секрет/В Жарких Странах.mp3'},
  {'icon': iconImage, 'title': 'Любовь На Пятом Этаже', 'file': '../../../../../../../Test/Music/Секрет/Любовь на пятом этаже.mp3'},
  {'icon': iconImage, 'title': 'Привет', 'file': '../../../../../../../Test/Music/Секрет/Привет.mp3'},
]);
})

document.getElementById('старыепесни').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '002 09 Splyashem Peggi!', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1971 - 1975 - Квинтет под управлением С.Никитина/002-09-Splyashem, Peggi!.mp3'},
  {'icon': iconImage, 'title': '002 16 Babushka Pirata', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1971 - 1975 - Квинтет под управлением С.Никитина/002-16-Babushka pirata.mp3'},
  {'icon': iconImage, 'title': '002 22 Na Dalyokoy Amazonke', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1971 - 1975 - Квинтет под управлением С.Никитина/002-22-Na dalyokoy Amazonke.mp3'},
  {'icon': iconImage, 'title': '004 10 Aleksandra', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1997 - Брич-Мулла/004-10-Aleksandra.mp3'},
  {'icon': iconImage, 'title': '005 01 Pole Chudes', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1998 - Девочка и пластилин/005-01-Pole chudes.mp3'},
  {'icon': iconImage, 'title': '005 02 Kakoe Nebo Goluboe', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1998 - Девочка и пластилин/005-02-Kakoe nebo goluboe.mp3'},
  {'icon': iconImage, 'title': '005 03 Pesenka Tortili', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1998 - Девочка и пластилин/005-03-Pesenka Tortili.mp3'},
  {'icon': iconImage, 'title': '005 09 Samaya Pervaya Pesnya', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1998 - Девочка и пластилин/005-09-Samaya pervaya pesnya.mp3'},
  {'icon': iconImage, 'title': '005 22 Konchayte Vashi Preniya', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1998 - Девочка и пластилин/005-22-Konchayte vashi preniya.mp3'},
  {'icon': iconImage, 'title': '007 01 Pod Muziku Vivaldi', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1971 - 1975 - Квинтет под управлением С.Никитина/007-01-Pod muziku Vivaldi.mp3'},
  {'icon': iconImage, 'title': '007 02 Kajdiy Vibiraet Dlya Sebya', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1998 - Is serii Rossiyskie Bardy/007-02-Kajdiy vibiraet dlya sebya.mp3'},
  {'icon': iconImage, 'title': '007 07 Sneg Idyot', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1998 - Is serii Rossiyskie Bardy/007-07-Sneg idyot.mp3'},
  {'icon': iconImage, 'title': '007 22 Samaya Pervaya Pesnya', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1998 - Девочка и пластилин/007-22-Samaya pervaya pesnya.mp3'},
  {'icon': iconImage, 'title': '007 23 Grustniy Marsh Byurokratov', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1998 - Is serii Rossiyskie Bardy/007-23-Grustniy marsh byurokratov.mp3'},
  {'icon': iconImage, 'title': '010 The Beatles Hey Jude', 'file': '../../../../../../../Test/Music/Старые песни/70-Х/010 THE BEATLES-HEY JUDE.MP3'},
  {'icon': iconImage, 'title': '013 А Фрейндлих У Природы Нет Плохой Погоды', 'file': '../../../../../../../Test/Music/Старые песни/70-Х/013 А.ФРЕЙНДЛИХ-У ПРИРОДЫ НЕТ ПЛОХОЙ ПОГОДЫ.MP3'},
  {'icon': iconImage, 'title': '040 Gilla Jonny', 'file': '../../../../../../../Test/Music/Старые песни/70-Х/040 GILLA-JONNY.MP3'},
  {'icon': iconImage, 'title': '045 И Кобзон И Оркестр Кинематографии Мнгновения', 'file': '../../../../../../../Test/Music/Старые песни/70-Х/045 И.КОБЗОН И ОРКЕСТР КИНЕМАТОГРАФИИ-МНГНОВЕНИЯ.MP3'},
  {'icon': iconImage, 'title': '067 Лейся Песня Кто Тебе Сказал', 'file': '../../../../../../../Test/Music/Старые песни/70-Х/067 ЛЕЙСЯ ПЕСНЯ-КТО ТЕБЕ СКАЗАЛ.MP3'},
  {'icon': iconImage, 'title': '07', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Избранное/07.mp3'},
  {'icon': iconImage, 'title': '070 Chilly Tic Tic Tac ', 'file': '../../../../../../../Test/Music/Старые песни/70-Х/070 CHILLY-TIC, TIC, TAC-.MP3'},
  {'icon': iconImage, 'title': '084 Gloria Gaynor I Will Survive', 'file': '../../../../../../../Test/Music/Старые песни/70-Х/084 GLORIA GAYNOR-I WILL SURVIVE.MP3'},
  {'icon': iconImage, 'title': '18 Лет Спустя', 'file': '../../../../../../../Test/Music/Старые песни/А.Розенбаум/18 лет спустя.mp3'},
  {'icon': iconImage, 'title': '38 Узлов', 'file': '../../../../../../../Test/Music/Старые песни/А.Розенбаум/38 узлов.mp3'},
  {'icon': iconImage, 'title': '9 Вал', 'file': '../../../../../../../Test/Music/Старые песни/Иваси/Альма-Матерь/9 вал.mp3'},
  {'icon': iconImage, 'title': 'Ak16', 'file': '../../../../../../../Test/Music/Старые песни/Неуловимый Арчи Или Квасная Америка/AK16.MP3'},
  {'icon': iconImage, 'title': 'Armonie', 'file': '../../../../../../../Test/Music/Старые песни/Bethoven & others/Armonie.mp3'},
  {'icon': iconImage, 'title': 'Go Down Moses', 'file': '../../../../../../../Test/Music/Старые песни/Go Down Moses.mp3'},
  {'icon': iconImage, 'title': 'Leisya Pesnya Sinii Inii', 'file': '../../../../../../../Test/Music/Старые песни/Синяя птица/Leisya Pesnya - Sinii Inii.mp3'},
  {'icon': iconImage, 'title': 'Madonna', 'file': '../../../../../../../Test/Music/Старые песни/80-Х/Madonna.mp3'},
  {'icon': iconImage, 'title': 'Ne Cip Mne Coli', 'file': '../../../../../../../Test/Music/Старые песни/Вячеслав Добрынин/Ne Cip Mne Coli.mp3'},
  {'icon': iconImage, 'title': 'One Way Ticket', 'file': '../../../../../../../Test/Music/Старые песни/One way ticket.mp4'},
  {'icon': iconImage, 'title': 'Sixteen Tons', 'file': '../../../../../../../Test/Music/Старые песни/Sixteen Tons.mp3'},
  {'icon': iconImage, 'title': 'Strangers In The Night', 'file': '../../../../../../../Test/Music/Старые песни/Strangers In The Night.mp3'},
  {'icon': iconImage, 'title': 'The Phantom Of The Opera', 'file': '../../../../../../../Test/Music/Старые песни/The Phantom Of The Opera.mp3'},
  {'icon': iconImage, 'title': 'Zimnii Sad', 'file': '../../../../../../../Test/Music/Старые песни/Zimnii sad.mp3'},
  {'icon': iconImage, 'title': 'А Может Не Было Войныi', 'file': '../../../../../../../Test/Music/Старые песни/А.Розенбаум/А, может, не было войныi.mp3'},
  {'icon': iconImage, 'title': 'А Снег Идет', 'file': '../../../../../../../Test/Music/Старые песни/А снег идет.mp3'},
  {'icon': iconImage, 'title': 'Агент 007', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Агент 007.WAV'},
  {'icon': iconImage, 'title': 'Аист На Крыше', 'file': '../../../../../../../Test/Music/Старые песни/София Ротару/Аист на крыше.MP3'},
  {'icon': iconImage, 'title': 'Александра', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1997 - Брич-Мулла/Александра.WAV'},
  {'icon': iconImage, 'title': 'Александра1', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1997 - Брич-Мулла/Александра1.mp3'},
  {'icon': iconImage, 'title': 'Аленушка', 'file': '../../../../../../../Test/Music/Старые песни/DOLSKI/Старинные часы/Аленушка.MP3'},
  {'icon': iconImage, 'title': 'Альма Матерь', 'file': '../../../../../../../Test/Music/Старые песни/Иваси/Альма-Матерь/Альма-матерь.mp3'},
  {'icon': iconImage, 'title': 'Альмаматерь', 'file': '../../../../../../../Test/Music/Старые песни/Городницкий/Альмаматерь.mp3'},
  {'icon': iconImage, 'title': 'Амазонка', 'file': '../../../../../../../Test/Music/Старые песни/Берковский/Амазонка.WAV'},
  {'icon': iconImage, 'title': 'Антисемиты', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Антисемиты.mp3'},
  {'icon': iconImage, 'title': 'Апрель', 'file': '../../../../../../../Test/Music/Старые песни/А.Суханов/Апрель.mp3'},
  {'icon': iconImage, 'title': 'Арбат', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/FIRST_LV/Арбат.MP3'},
  {'icon': iconImage, 'title': 'Архиолог', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Архиолог.mp3'},
  {'icon': iconImage, 'title': 'Атланты', 'file': '../../../../../../../Test/Music/Старые песни/Городницкий/Атланты.WAV'},
  {'icon': iconImage, 'title': 'Ах Какая Женщина', 'file': '../../../../../../../Test/Music/Старые песни/Ах, какая женщина.mp3'},
  {'icon': iconImage, 'title': 'Ахвремявремя', 'file': '../../../../../../../Test/Music/Старые песни/Иваси/Альма-Матерь/Ах,время,время.mp3'},
  {'icon': iconImage, 'title': 'Ахсамара Городок (в Готовцева)', 'file': '../../../../../../../Test/Music/Старые песни/Огней так много золотых/Ах,Самара-городок (В.Готовцева).WAV'},
  {'icon': iconImage, 'title': 'Бал Маскарад', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Бал-маскарад.mp3'},
  {'icon': iconImage, 'title': 'Бежит Река', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1999 - Со мною вот что происходит/Бежит река.mp3'},
  {'icon': iconImage, 'title': 'Белые Розы', 'file': '../../../../../../../Test/Music/Старые песни/80-Х/Белые розы.mp3'},
  {'icon': iconImage, 'title': 'Белый Теплоход', 'file': '../../../../../../../Test/Music/Старые песни/Синяя птица/Белый теплоход .WAV'},
  {'icon': iconImage, 'title': 'Бережкарики', 'file': '../../../../../../../Test/Music/Старые песни/Иваси/Бережкарики/Бережкарики.mp3'},
  {'icon': iconImage, 'title': 'Бери Шинель', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/DISK1/Бери шинель.MP3'},
  {'icon': iconImage, 'title': 'Боксер', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Париж/Боксер.mp3'},
  {'icon': iconImage, 'title': 'Большой Секрет', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/2002 - Резиновий ежик/Большой секрет.mp3'},
  {'icon': iconImage, 'title': 'Большой Секрет Для Маленькой Компании', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/2002 - Резиновий ежик/Большой секрет для маленькой компании.mp3'},
  {'icon': iconImage, 'title': 'Большой Собачий Секрет', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/2002 - Резиновий ежик/Большой собачий секрет.mp3'},
  {'icon': iconImage, 'title': 'Боцман', 'file': '../../../../../../../Test/Music/Старые песни/Иваси/Альма-Матерь/Боцман.mp3'},
  {'icon': iconImage, 'title': 'Братские Могилы', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Братские могилы.mp3'},
  {'icon': iconImage, 'title': 'Брич Мула', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1997 - Брич-Мулла/Брич-Мула.WAV'},
  {'icon': iconImage, 'title': 'Брич Мулла', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1997 - Брич-Мулла/Брич-Мулла.mp3'},
  {'icon': iconImage, 'title': 'В Высоцкий', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/VIDEO/В. Высоцкий.mp4'},
  {'icon': iconImage, 'title': 'В Далеком Созвездии Тау Кита', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/В далеком созвездии Тау Кита.mp3'},
  {'icon': iconImage, 'title': 'В Землянке', 'file': '../../../../../../../Test/Music/Старые песни/Песни военных лет/В землянке.mp3'},
  {'icon': iconImage, 'title': 'В Куски Разлетелася Корона', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/В куски разлетелася корона.mp3'},
  {'icon': iconImage, 'title': 'В Ночном Лесу', 'file': '../../../../../../../Test/Music/Старые песни/Юрий Лорес/В ночном лесу.MP3'},
  {'icon': iconImage, 'title': 'В Полях Под Снегом И Дождем', 'file': '../../../../../../../Test/Music/Старые песни/Александр Градский/В полях под снегом и дождем.WAV'},
  {'icon': iconImage, 'title': 'В Путь', 'file': '../../../../../../../Test/Music/Старые песни/Советская патриотическая/В путь.mp3'},
  {'icon': iconImage, 'title': 'В Салуне Севен Муне', 'file': '../../../../../../../Test/Music/Старые песни/Неуловимый Арчи Или Квасная Америка/В салуне Севен Муне .MP3'},
  {'icon': iconImage, 'title': 'В Суету Городов', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/В суету городов.WAV'},
  {'icon': iconImage, 'title': 'Вальс Бостон', 'file': '../../../../../../../Test/Music/Старые песни/А.Розенбаум/Вальс-бостон.mp3'},
  {'icon': iconImage, 'title': 'Вальс Расставания', 'file': '../../../../../../../Test/Music/Старые песни/Вальс расставания.mp3'},
  {'icon': iconImage, 'title': 'Варяг', 'file': '../../../../../../../Test/Music/Старые песни/Советская патриотическая/Варяг.mp3'},
  {'icon': iconImage, 'title': 'Ваше Благородие', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/DISK2/Ваше благородие.MP3'},
  {'icon': iconImage, 'title': 'Вечер Бродит', 'file': '../../../../../../../Test/Music/Старые песни/Вечер бродит.mp3'},
  {'icon': iconImage, 'title': 'Вещая Судьба', 'file': '../../../../../../../Test/Music/Старые песни/А.Розенбаум/Вещая судьба.mp3'},
  {'icon': iconImage, 'title': 'Виват Король!', 'file': '../../../../../../../Test/Music/Старые песни/Виват король!.mp3'},
  {'icon': iconImage, 'title': 'Владимир Высоцкий Последний Концерт (монолог 1980)', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Владимир Высоцкий.Последний концерт (Монолог 1980).mp4'},
  {'icon': iconImage, 'title': 'Воздушный Бой', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Воздушный Бой.WAV'},
  {'icon': iconImage, 'title': 'Возьмемся Заруки', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/Земля/Возьмемся заруки.mp3'},
  {'icon': iconImage, 'title': 'Вологда', 'file': '../../../../../../../Test/Music/Старые песни/Вологда.mp3'},
  {'icon': iconImage, 'title': 'Вологда', 'file': '../../../../../../../Test/Music/Старые песни/Песняры/Вологда.WAV'},
  {'icon': iconImage, 'title': 'Вот Идет По Свету Человек Чудак', 'file': '../../../../../../../Test/Music/Старые песни/Вот идет по свету человек-чудак.mp3'},
  {'icon': iconImage, 'title': 'Все Относительно', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Все относительно.mp3'},
  {'icon': iconImage, 'title': 'Все Пройдет', 'file': '../../../../../../../Test/Music/Старые песни/Михаил Боярский/Все пройдет.WAV'},
  {'icon': iconImage, 'title': 'Всечто В Жизни Есть У Меня', 'file': '../../../../../../../Test/Music/Старые песни/Самоцветы/Все,что в жизни есть у меня.mp3'},
  {'icon': iconImage, 'title': 'Встреча', 'file': '../../../../../../../Test/Music/Старые песни/DOLSKI/Концерт в Москве/Встреча.MP3'},
  {'icon': iconImage, 'title': 'Вся Жизнь Впереди', 'file': '../../../../../../../Test/Music/Старые песни/Самоцветы/Вся жизнь впереди.mp3'},
  {'icon': iconImage, 'title': 'Высота', 'file': '../../../../../../../Test/Music/Старые песни/Высота.mp3'},
  {'icon': iconImage, 'title': 'Гадалка', 'file': '../../../../../../../Test/Music/Старые песни/Гадалка.mp3'},
  {'icon': iconImage, 'title': 'Гимн Российской Федерации', 'file': '../../../../../../../Test/Music/Старые песни/Гимн Российской Федерации.mp3'},
  {'icon': iconImage, 'title': 'Гимн Ссср', 'file': '../../../../../../../Test/Music/Старые песни/Гимн СССР.Mp3'},
  {'icon': iconImage, 'title': 'Гимнастика', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Избранное/Гимнастика.mp3'},
  {'icon': iconImage, 'title': 'Глафира', 'file': '../../../../../../../Test/Music/Старые песни/Иваси/Альма-Матерь/Глафира.mp3'},
  {'icon': iconImage, 'title': 'Глухари', 'file': '../../../../../../../Test/Music/Старые песни/А.Розенбаум/Глухари.mp3'},
  {'icon': iconImage, 'title': 'Говорите Я Молчу', 'file': '../../../../../../../Test/Music/Старые песни/DOLSKI/Концерт в г.Самаре/Говорите, я молчу.MP3'},
  {'icon': iconImage, 'title': 'Голубые В Полоску Штаны', 'file': '../../../../../../../Test/Music/Старые песни/Неуловимый Арчи Или Квасная Америка/Голубые в полоску штаны.MP3'},
  {'icon': iconImage, 'title': 'Горизонт', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Париж/Горизонт.mp3'},
  {'icon': iconImage, 'title': 'Горная Лерическая', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Париж/Горная лерическая.mp3'},
  {'icon': iconImage, 'title': 'Госпиталь', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Париж/Госпиталь.mp3'},
  {'icon': iconImage, 'title': 'Господа Юнкер', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/DISK1/Господа юнкер.MP3'},
  {'icon': iconImage, 'title': 'Грузинская Песня', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/В США/Грузинская песня.mp3'},
  {'icon': iconImage, 'title': 'Давайте Восклицать', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/DISK2/Давайте восклицать.MP3'},
  {'icon': iconImage, 'title': 'Две Судьбы', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Две судьбы.WAV'},
  {'icon': iconImage, 'title': 'Две Судьбы', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Две судьбы .WAV'},
  {'icon': iconImage, 'title': 'Дворник Степанов', 'file': '../../../../../../../Test/Music/Старые песни/Иваси/Бережкарики/Дворник Степанов.mp3'},
  {'icon': iconImage, 'title': 'Дела', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Дела.mp3'},
  {'icon': iconImage, 'title': 'День Победы', 'file': '../../../../../../../Test/Music/Старые песни/Песни военных лет/День Победы.mp3'},
  {'icon': iconImage, 'title': 'День Победы', 'file': '../../../../../../../Test/Music/Старые песни/Лев Лещенко/День Победы.mp3'},
  {'icon': iconImage, 'title': 'Детектива', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Детектива.mp3'},
  {'icon': iconImage, 'title': 'Джим Койот', 'file': '../../../../../../../Test/Music/Старые песни/Неуловимый Арчи Или Квасная Америка/Джим Койот.MP3'},
  {'icon': iconImage, 'title': 'Джин', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Джин.mp3'},
  {'icon': iconImage, 'title': 'Джон', 'file': '../../../../../../../Test/Music/Старые песни/DOLSKI/Ленинградские акварели/Джон.MP3'},
  {'icon': iconImage, 'title': 'До Свиданья Дорогие', 'file': '../../../../../../../Test/Music/Старые песни/Берковский/До свиданья, дорогие.WAV'},
  {'icon': iconImage, 'title': 'Дожди', 'file': '../../../../../../../Test/Music/Старые песни/DOLSKI/Старинные часы/Дожди.mp3'},
  {'icon': iconImage, 'title': 'Дом', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Париж/Дом.mp3'},
  {'icon': iconImage, 'title': 'Дом Хрустальный', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Избранное/Дом хрустальный.mp3'},
  {'icon': iconImage, 'title': 'Дорога', 'file': '../../../../../../../Test/Music/Старые песни/А.Суханов/Дорога.mp3'},
  {'icon': iconImage, 'title': 'Друг', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Друг.mp3'},
  {'icon': iconImage, 'title': 'Дурь', 'file': '../../../../../../../Test/Music/Старые песни/Иваси/Бережкарики/Дурь.mp3'},
  {'icon': iconImage, 'title': 'Ежик С Дыркой В', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/2002 - Резиновий ежик/Ежик с дыркой в.mp3'},
  {'icon': iconImage, 'title': 'Есть Только Миг', 'file': '../../../../../../../Test/Music/Старые песни/Олег Даль/Есть только миг.mp3'},
  {'icon': iconImage, 'title': 'Еще Не Вечер', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Избранное/Еще не вечер.mp3'},
  {'icon': iconImage, 'title': 'Жираф', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Избранное/Жираф.mp3'},
  {'icon': iconImage, 'title': 'Журавли', 'file': '../../../../../../../Test/Music/Старые песни/Журавли.WAV'},
  {'icon': iconImage, 'title': 'Журавль', 'file': '../../../../../../../Test/Music/Старые песни/Ким/Журавль.WAV'},
  {'icon': iconImage, 'title': 'За Туманом', 'file': '../../../../../../../Test/Music/Старые песни/Кукин/За туманом.WAV'},
  {'icon': iconImage, 'title': 'Зарисовка О Париже', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Зарисовка о Париже.WAV'},
  {'icon': iconImage, 'title': 'Звезда', 'file': '../../../../../../../Test/Music/Старые песни/DOLSKI/Старинные часы/Звезда.MP3'},
  {'icon': iconImage, 'title': 'Зеленая Карета', 'file': '../../../../../../../Test/Music/Старые песни/А.Суханов/Зеленая карета.mp3'},
  {'icon': iconImage, 'title': 'Зимняя Сказка', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1967 - Квинтет под управлением С.Никитина/Зимняя сказка.mp3'},
  {'icon': iconImage, 'title': 'Золотое Сердце', 'file': '../../../../../../../Test/Music/Старые песни/София Ротару/Золотое сердце.MP3'},
  {'icon': iconImage, 'title': 'Извозчик', 'file': '../../../../../../../Test/Music/Старые песни/А.Розенбаум/Извозчик.mp3'},
  {'icon': iconImage, 'title': 'Инопланетяне', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Инопланетяне.mp3'},
  {'icon': iconImage, 'title': 'Исторический Роман', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/Париж/Исторический роман.mp3'},
  {'icon': iconImage, 'title': 'К Вершине', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/К вершине.mp3'},
  {'icon': iconImage, 'title': 'К Чему Нам Быть На Ты', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/DISK3/К чему нам быть на %27ты%27.mp3'},
  {'icon': iconImage, 'title': 'Кабачок Одноглазого Гарри', 'file': '../../../../../../../Test/Music/Старые песни/Неуловимый Арчи Или Квасная Америка/Кабачок одноглазого Гарри.MP3'},
  {'icon': iconImage, 'title': 'Кавалергарды', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/DISK3/Кавалергарды.mp3'},
  {'icon': iconImage, 'title': 'Каждый Выбирает По Себе', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1998 - Is serii Rossiyskie Bardy/Каждый выбирает по себе.mp3'},
  {'icon': iconImage, 'title': 'Казачья', 'file': '../../../../../../../Test/Music/Старые песни/А.Розенбаум/Казачья.mp3'},
  {'icon': iconImage, 'title': 'Как Здорово', 'file': '../../../../../../../Test/Music/Старые песни/Митяев/Как здорово.WAV'},
  {'icon': iconImage, 'title': 'Как То Раз Пришел Домой', 'file': '../../../../../../../Test/Music/Старые песни/Неуловимый Арчи Или Квасная Америка/Как-то раз пришел домой.MP3'},
  {'icon': iconImage, 'title': 'Какое Небо Голубое', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1998 - Девочка и пластилин/Какое небо голубое.mp3'},
  {'icon': iconImage, 'title': 'Какой То Бред', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Какой то бред.WAV'},
  {'icon': iconImage, 'title': 'Камикадзе', 'file': '../../../../../../../Test/Music/Старые песни/А.Розенбаум/Камикадзе.WAV'},
  {'icon': iconImage, 'title': 'Капитан', 'file': '../../../../../../../Test/Music/Старые песни/Ким/Капитан.mp3'},
  {'icon': iconImage, 'title': 'Капли Датского Короля', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/DISK1/Капли датского короля.MP3'},
  {'icon': iconImage, 'title': 'Касандра', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Париж/Касандра.mp3'},
  {'icon': iconImage, 'title': 'Катюша', 'file': '../../../../../../../Test/Music/Старые песни/Песни военных лет/Катюша.MP3'},
  {'icon': iconImage, 'title': 'Клен', 'file': '../../../../../../../Test/Music/Старые песни/Синяя птица/Клен.mp3'},
  {'icon': iconImage, 'title': 'Когда Лампа Разбита', 'file': '../../../../../../../Test/Music/Старые песни/А.Суханов/Когда лампа разбита.mp3'},
  {'icon': iconImage, 'title': 'Козел Отпущения', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Париж/Козел отпущения.mp3'},
  {'icon': iconImage, 'title': 'Колея', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Париж/Колея.mp3'},
  {'icon': iconImage, 'title': 'Колодец', 'file': '../../../../../../../Test/Music/Старые песни/Колодец.mp3'},
  {'icon': iconImage, 'title': 'Колокльчик', 'file': '../../../../../../../Test/Music/Старые песни/А.Суханов/Колокльчик.mp3'},
  {'icon': iconImage, 'title': 'Комарово', 'file': '../../../../../../../Test/Music/Старые песни/Комарово.mp3'},
  {'icon': iconImage, 'title': 'Комарово', 'file': '../../../../../../../Test/Music/Старые песни/Игорь Скляр/Комарово.mp3'},
  {'icon': iconImage, 'title': 'Кони', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Избранное/Кони.mp3'},
  {'icon': iconImage, 'title': 'Корабли', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Избранное/Корабли.mp3'},
  {'icon': iconImage, 'title': 'Корнет', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/DISK3/Корнет.mp3'},
  {'icon': iconImage, 'title': 'Королева Красоты', 'file': '../../../../../../../Test/Music/Старые песни/Муслим Магомаев/Королева красоты.WAV'},
  {'icon': iconImage, 'title': 'Король', 'file': '../../../../../../../Test/Music/Старые песни/Дулов/Король.WAV'},
  {'icon': iconImage, 'title': 'Косил Ясь Конюшину', 'file': '../../../../../../../Test/Music/Старые песни/Песняры/Косил Ясь конюшину.WAV'},
  {'icon': iconImage, 'title': 'Красная Стена', 'file': '../../../../../../../Test/Music/Старые песни/А.Розенбаум/Красная стена.mp3'},
  {'icon': iconImage, 'title': 'Кругом 500', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Париж/Кругом 500.mp3'},
  {'icon': iconImage, 'title': 'Кто Сказал Все Сгорело Дотла', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Кто сказал все сгорело дотла.WAV'},
  {'icon': iconImage, 'title': 'Куплеты Курочкина (в Доронин)', 'file': '../../../../../../../Test/Music/Старые песни/Огней так много золотых/Куплеты Курочкина (В.Доронин).WAV'},
  {'icon': iconImage, 'title': 'Ладони На Глазах', 'file': '../../../../../../../Test/Music/Старые песни/DOLSKI/Ленинградские акварели/Ладони на глазах.MP3'},
  {'icon': iconImage, 'title': 'Ландыши', 'file': '../../../../../../../Test/Music/Старые песни/Ландыши.MP3'},
  {'icon': iconImage, 'title': 'Лейся Песня На Просторе', 'file': '../../../../../../../Test/Music/Старые песни/Лейся песня на просторе.mp3'},
  {'icon': iconImage, 'title': 'Ленинградские Акварели', 'file': '../../../../../../../Test/Music/Старые песни/DOLSKI/Ленинградские акварели/Ленинградские акварели.MP3'},
  {'icon': iconImage, 'title': 'Лето Это Маленькая Жизнь', 'file': '../../../../../../../Test/Music/Старые песни/Митяев/Лето это маленькая жизнь.WAV'},
  {'icon': iconImage, 'title': 'Летчик', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1961 - 1968 Охота на волков/Летчик.mp3'},
  {'icon': iconImage, 'title': 'Лирическая', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Избранное/Лирическая.mp3'},
  {'icon': iconImage, 'title': 'Лукоморье', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1967 - 1968 Лукоморье больше нет/Лукоморье.mp3'},
  {'icon': iconImage, 'title': 'Лучший Город Земли', 'file': '../../../../../../../Test/Music/Старые песни/Муслим Магомаев/Лучший город земли.mp3'},
  {'icon': iconImage, 'title': 'Люси', 'file': '../../../../../../../Test/Music/Старые песни/Неуловимый Арчи Или Квасная Америка/Люси.MP3'},
  {'icon': iconImage, 'title': 'Магадан', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Париж/Магадан.mp3'},
  {'icon': iconImage, 'title': 'Майдан', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/Майдан.WAV'},
  {'icon': iconImage, 'title': 'Майский Вальс', 'file': '../../../../../../../Test/Music/Старые песни/Песни военных лет/Майский вальс.mp3'},
  {'icon': iconImage, 'title': 'Маленький Принц', 'file': '../../../../../../../Test/Music/Старые песни/DOLSKI/Старинные часы/Маленький Принц.MP3'},
  {'icon': iconImage, 'title': 'Малиновки Пели', 'file': '../../../../../../../Test/Music/Старые песни/DOLSKI/Ленинградские акварели/Малиновки пели.MP3'},
  {'icon': iconImage, 'title': 'Маменька', 'file': '../../../../../../../Test/Music/Старые песни/Поперечный/Маменька.MP3'},
  {'icon': iconImage, 'title': 'Март Сумерки', 'file': '../../../../../../../Test/Music/Старые песни/DOLSKI/Старинные часы/Март. Сумерки.MP3'},
  {'icon': iconImage, 'title': 'Менуэт Старинном Стиле', 'file': '../../../../../../../Test/Music/Старые песни/Юрий Лорес/Менуэт старинном стиле.MP3'},
  {'icon': iconImage, 'title': 'Метатель Молота', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1961 - 1968 Охота на волков/Метатель молота.mp3'},
  {'icon': iconImage, 'title': 'Метрополитен', 'file': '../../../../../../../Test/Music/Старые песни/Иваси/Альма-Матерь/Метрополитен.mp3'},
  {'icon': iconImage, 'title': 'Микрофон', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Париж/Микрофон.mp3'},
  {'icon': iconImage, 'title': 'Мимино', 'file': '../../../../../../../Test/Music/Старые песни/Вахтанг Кикабидзе/Мимино.WAV'},
  {'icon': iconImage, 'title': 'Мимо Текла Текла Река', 'file': '../../../../../../../Test/Music/Старые песни/Мимо текла текла река.mp3'},
  {'icon': iconImage, 'title': 'Мне Ребята Сказали', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Мне ребята сказали.mp3'},
  {'icon': iconImage, 'title': 'Мне Твердят', 'file': '../../../../../../../Test/Music/Старые песни/Г.Хомчик/Мне твердят.mp3'},
  {'icon': iconImage, 'title': 'Мне Этот Бой Не Забыть Ни Почем', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Мне этот бой не забыть ни почем.WAV'},
  {'icon': iconImage, 'title': 'Можжевеловый Куст', 'file': '../../../../../../../Test/Music/Старые песни/А.Суханов/Можжевеловый куст.mp3'},
  {'icon': iconImage, 'title': 'Мои Года Мое Богатство', 'file': '../../../../../../../Test/Music/Старые песни/Вахтанг Кикабидзе/Мои года-мое богатство.WAV'},
  {'icon': iconImage, 'title': 'Мой Милый', 'file': '../../../../../../../Test/Music/Старые песни/Иваси/Альма-Матерь/Мой милый.mp3'},
  {'icon': iconImage, 'title': 'Москва Одесса', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Избранное/Москва - Одесса.mp3'},
  {'icon': iconImage, 'title': 'Моцарт', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/В США/Моцарт.mp3'},
  {'icon': iconImage, 'title': 'Моя Звезда', 'file': '../../../../../../../Test/Music/Старые песни/А.Суханов/Моя звезда.mp3'},
  {'icon': iconImage, 'title': 'Музыка Нас Связала', 'file': '../../../../../../../Test/Music/Старые песни/Мираж/Музыка нас связала.mp3'},
  {'icon': iconImage, 'title': 'Муравей', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/FIRST_LV/Муравей.MP3'},
  {'icon': iconImage, 'title': 'Мы Вращаем Землю', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Избранное/Мы вращаем землю.mp3'},
  {'icon': iconImage, 'title': 'Мы Вращаем Землю', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/VIDEO/Мы вращаем Землю.mp4'},
  {'icon': iconImage, 'title': 'Мы Говорим Не Штормы', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Мы говорим не штормы.WAV'},
  {'icon': iconImage, 'title': 'Мы Желаем Счастья Вам', 'file': '../../../../../../../Test/Music/Старые песни/Цветы/Мы желаем счастья вам.MP3'},
  {'icon': iconImage, 'title': 'Мы С Тобой Давно Уже Не Те', 'file': '../../../../../../../Test/Music/Старые песни/Мы с тобой давно уже не те.mp3'},
  {'icon': iconImage, 'title': 'На Большом Каретном', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/На большом каретном.WAV'},
  {'icon': iconImage, 'title': 'На Нейтральной Полосе', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/На  нейтральной полосе.mp3'},
  {'icon': iconImage, 'title': 'На Перовском На Базаре', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/На Перовском на базаре.mp3'},
  {'icon': iconImage, 'title': 'На Теплоходе Музыка Играет', 'file': '../../../../../../../Test/Music/Старые песни/На теплоходе музыка играет.mp3'},
  {'icon': iconImage, 'title': 'Надежда', 'file': '../../../../../../../Test/Music/Старые песни/Анна Герман/Надежда.mp3'},
  {'icon': iconImage, 'title': 'Надежда', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Избранное/Надежда.mp3'},
  {'icon': iconImage, 'title': 'Надежды Маенький Оркестрик', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/FIRST_LV/Надежды маенький оркестрик.MP3'},
  {'icon': iconImage, 'title': 'Надоело', 'file': '../../../../../../../Test/Music/Старые песни/А.Розенбаум/Надоело.mp3'},
  {'icon': iconImage, 'title': 'Наш Сосед', 'file': '../../../../../../../Test/Music/Старые песни/Наш сосед .mp3'},
  {'icon': iconImage, 'title': 'Наши Предки', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1961 - 1968 Охота на волков/Наши предки.mp3'},
  {'icon': iconImage, 'title': 'Не Волнуйтесь Тетя', 'file': '../../../../../../../Test/Music/Старые песни/Веселые ребята/Не волнуйтесь тетя.mp3'},
  {'icon': iconImage, 'title': 'Не Все То Золото', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/DISK2/Не все то золото.MP3'},
  {'icon': iconImage, 'title': 'Не Надо Печалиться', 'file': '../../../../../../../Test/Music/Старые песни/Пламя/Не надо печалиться.mp3'},
  {'icon': iconImage, 'title': 'Не Понимаем', 'file': '../../../../../../../Test/Music/Старые песни/DOLSKI/Ленинградские акварели/Не понимаем.MP3'},
  {'icon': iconImage, 'title': 'Непутевка', 'file': '../../../../../../../Test/Music/Старые песни/Иваси/Бережкарики/Непутевка.mp3'},
  {'icon': iconImage, 'title': 'Нету Времени', 'file': '../../../../../../../Test/Music/Старые песни/А.Розенбаум/Нету времени.mp3'},
  {'icon': iconImage, 'title': 'Неуловимый Джо', 'file': '../../../../../../../Test/Music/Старые песни/Неуловимый Арчи Или Квасная Америка/Неуловимый Джо .MP3'},
  {'icon': iconImage, 'title': 'Нечисть', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Нечисть.mp3'},
  {'icon': iconImage, 'title': 'О Славный Миг', 'file': '../../../../../../../Test/Music/Старые песни/Городницкий/О славный миг.mp3'},
  {'icon': iconImage, 'title': 'Огонь', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/Земля/Огонь.mp3'},
  {'icon': iconImage, 'title': 'Одесса', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1961 - 1968 Охота на волков/Одесса.mp3'},
  {'icon': iconImage, 'title': 'Один Раз В Год Сады Цветут', 'file': '../../../../../../../Test/Music/Старые песни/Анна Герман/Один раз в год сады цветут.mp3'},
  {'icon': iconImage, 'title': 'Одиночество', 'file': '../../../../../../../Test/Music/Старые песни/DOLSKI/Концерт в г.Самаре/Одиночество.MP3'},
  {'icon': iconImage, 'title': 'Одна Научная Загадка', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Одна научная загадка.WAV'},
  {'icon': iconImage, 'title': 'Оклахома', 'file': '../../../../../../../Test/Music/Старые песни/Неуловимый Арчи Или Квасная Америка/Оклахома.MP3'},
  {'icon': iconImage, 'title': 'Октябрь', 'file': '../../../../../../../Test/Music/Старые песни/Октябрь.mp3'},
  {'icon': iconImage, 'title': 'Оловяный Солдатик', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/Париж2/Оловяный солдатик.mp3'},
  {'icon': iconImage, 'title': 'Он Не Вернулся Из Боя', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Он не вернулся из боя.WAV'},
  {'icon': iconImage, 'title': 'Она Была В Париже', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Избранное/Она была в Париже.mp3'},
  {'icon': iconImage, 'title': 'Орден', 'file': '../../../../../../../Test/Music/Старые песни/Орден.mp3'},
  {'icon': iconImage, 'title': 'От Прощанья До Прощанья', 'file': '../../../../../../../Test/Music/Старые песни/DOLSKI/Концерт в г.Самаре/От прощанья до прощанья.MP3'},
  {'icon': iconImage, 'title': 'Откровения', 'file': '../../../../../../../Test/Music/Старые песни/DOLSKI/Концерт в г.Минске ч.2/Откровения.MP3'},
  {'icon': iconImage, 'title': 'Отслужи По Мнеотслужи', 'file': '../../../../../../../Test/Music/Старые песни/А.Розенбаум/Отслужи по мне,отслужи.mp3'},
  {'icon': iconImage, 'title': 'Охота На Волков', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Париж/Охота на волков.mp3'},
  {'icon': iconImage, 'title': 'Охота На Волков Франция 1977', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/VIDEO/Охота на волков. Франция. 1977.mp4'},
  {'icon': iconImage, 'title': 'Охота С Вертолета', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Охота с вертолета.WAV'},
  {'icon': iconImage, 'title': 'Парус', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Париж/Парус.mp3'},
  {'icon': iconImage, 'title': 'Перед Выездом В Загранку', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Перед выездом в загранку.mp3'},
  {'icon': iconImage, 'title': 'Перекаты', 'file': '../../../../../../../Test/Music/Старые песни/Городницкий/Перекаты.WAV'},
  {'icon': iconImage, 'title': 'Переселение Душ', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Избранное/Переселение душ.mp3'},
  {'icon': iconImage, 'title': 'Песня Завистника', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Песня завистника.mp3'},
  {'icon': iconImage, 'title': 'Песня Застенчивого Гусара', 'file': '../../../../../../../Test/Music/Старые песни/Александр Быканов/Песня застенчивого гусара.mp3'},
  {'icon': iconImage, 'title': 'Песня Извозчика', 'file': '../../../../../../../Test/Music/Старые песни/Песня извозчика.mp3'},
  {'icon': iconImage, 'title': 'Песня О Вещем Олеге', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Песня о вещем Олеге.mp3'},
  {'icon': iconImage, 'title': 'Песняры', 'file': '../../../../../../../Test/Music/Старые песни/Песняры .wav'},
  {'icon': iconImage, 'title': 'Пианист', 'file': '../../../../../../../Test/Music/Старые песни/DOLSKI/Старинные часы/Пианист.MP3'},
  {'icon': iconImage, 'title': 'Пингвины (виа Аккорд)', 'file': '../../../../../../../Test/Music/Старые песни/Королева красоты/Пингвины (ВИА Аккорд).WAV'},
  {'icon': iconImage, 'title': 'Плач По Брату', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1999 - Со мною вот что происходит/Плач по брату.mp3'},
  {'icon': iconImage, 'title': 'Плод Что Неспел', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Париж/Плод, что неспел.mp3'},
  {'icon': iconImage, 'title': 'По Диким Степям Аризоны', 'file': '../../../../../../../Test/Music/Старые песни/Неуловимый Арчи Или Квасная Америка/По диким степям Аризоны.MP3'},
  {'icon': iconImage, 'title': 'По Новому', 'file': '../../../../../../../Test/Music/Старые песни/Митяев/По новому.mp3'},
  {'icon': iconImage, 'title': 'По Прерии Вдоль Железной Дороги', 'file': '../../../../../../../Test/Music/Старые песни/Неуловимый Арчи Или Квасная Америка/По прерии вдоль железной дороги.MP3'},
  {'icon': iconImage, 'title': 'По Цареву Повелению', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1961 - 1968 Охота на волков/По цареву повелению.mp3'},
  {'icon': iconImage, 'title': 'Победа', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/DISK1/Победа.mp3'},
  {'icon': iconImage, 'title': 'Погоня', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Париж/Погоня.mp3'},
  {'icon': iconImage, 'title': 'Под Музыку Вивальди', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1971 - 1975 - Квинтет под управлением С.Никитина/Под музыку вивальди.WAV'},
  {'icon': iconImage, 'title': 'Пожелание', 'file': '../../../../../../../Test/Music/Старые песни/Вахтанг Кикабидзе/Пожелание.WAV'},
  {'icon': iconImage, 'title': 'Пожелание', 'file': '../../../../../../../Test/Music/Старые песни/Пожелание.mp3'},
  {'icon': iconImage, 'title': 'Пока Живешь На Свете', 'file': '../../../../../../../Test/Music/Старые песни/DOLSKI/Старинные часы/Пока живешь на свете.MP3'},
  {'icon': iconImage, 'title': 'Пока Земля Еще Вертится', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/FIRST_LV/Пока земля еще вертится.MP3'},
  {'icon': iconImage, 'title': 'Покойник', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Париж/Покойник.mp3'},
  {'icon': iconImage, 'title': 'Поле Чудес', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1998 - Девочка и пластилин/Поле чудес.mp3'},
  {'icon': iconImage, 'title': 'Помоги Мне (а Ведищева)', 'file': '../../../../../../../Test/Music/Старые песни/Песни из кинофильмов/Помоги мне (А.Ведищева).WAV'},
  {'icon': iconImage, 'title': 'Пора По Пиву', 'file': '../../../../../../../Test/Music/Старые песни/Иваси/Ума Палата/Пора по пиву.mp3'},
  {'icon': iconImage, 'title': 'Портлэнд', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/DISK2/Портлэнд.MP3'},
  {'icon': iconImage, 'title': 'Последний Нонешний Денечек', 'file': '../../../../../../../Test/Music/Старые песни/Бичевская/Последний нонешний денечек.WAV'},
  {'icon': iconImage, 'title': 'Последняя Электричка', 'file': '../../../../../../../Test/Music/Старые песни/Владимир Макаров/Последняя электричка.WAV'},
  {'icon': iconImage, 'title': 'Послепобедный Вальс', 'file': '../../../../../../../Test/Music/Старые песни/А.Розенбаум/Послепобедный вальс.mp3'},
  {'icon': iconImage, 'title': 'Послушайте Все', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Послушайте все.WAV'},
  {'icon': iconImage, 'title': 'Поспел Маис На Ранчо Дяди Билла', 'file': '../../../../../../../Test/Music/Старые песни/Неуловимый Арчи Или Квасная Америка/Поспел маис на ранчо дяди Билла.MP3'},
  {'icon': iconImage, 'title': 'Правда И Лож', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Правда и лож.WAV'},
  {'icon': iconImage, 'title': 'Прекрасное Далеко', 'file': '../../../../../../../Test/Music/Старые песни/Прекрасное далеко.WAV'},
  {'icon': iconImage, 'title': 'Прерия Кругом Путь Далек Лежит', 'file': '../../../../../../../Test/Music/Старые песни/Неуловимый Арчи Или Квасная Америка/Прерия кругом, путь далек лежит.MP3'},
  {'icon': iconImage, 'title': 'Приходит Время', 'file': '../../../../../../../Test/Music/Старые песни/Миляев/Приходит время.WAV'},
  {'icon': iconImage, 'title': 'Про Дикого Вепря', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Про дикого вепря.mp3'},
  {'icon': iconImage, 'title': 'Про Индюка', 'file': '../../../../../../../Test/Music/Старые песни/А.Суханов/Про индюка.mp3'},
  {'icon': iconImage, 'title': 'Про Йогов', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Про йогов.mp3'},
  {'icon': iconImage, 'title': 'Про Лесных Жителей', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1967 - 1968 Лукоморье больше нет/Про лесных жителей.mp3'},
  {'icon': iconImage, 'title': 'Про Черта', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Про черта.mp3'},
  {'icon': iconImage, 'title': 'Проводы', 'file': '../../../../../../../Test/Music/Старые песни/А.Розенбаум/Проводы.mp3'},
  {'icon': iconImage, 'title': 'Провожала Мене Ридна Маты', 'file': '../../../../../../../Test/Music/Старые песни/Неуловимый Арчи Или Квасная Америка/Провожала мене ридна маты.MP3'},
  {'icon': iconImage, 'title': 'Проложите Проложите', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Париж/Проложите проложите.mp3'},
  {'icon': iconImage, 'title': 'Прости Прощай', 'file': '../../../../../../../Test/Music/Старые песни/А.Розенбаум/Прости-прощай.MP3'},
  {'icon': iconImage, 'title': 'Прошла Пора', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Прошла пора.WAV'},
  {'icon': iconImage, 'title': 'Прощай', 'file': '../../../../../../../Test/Music/Старые песни/Лев Лещенко/Прощай.mp3'},
  {'icon': iconImage, 'title': 'Прощай Хх Век', 'file': '../../../../../../../Test/Music/Старые песни/DOLSKI/Прощай, ХХ век/Прощай, ХХ век.MP3'},
  {'icon': iconImage, 'title': 'Прощальная', 'file': '../../../../../../../Test/Music/Старые песни/DOLSKI/Старинные часы/Прощальная.MP3'},
  {'icon': iconImage, 'title': 'Прощанье', 'file': '../../../../../../../Test/Music/Старые песни/В.Ланцберг/Прощанье.mp3'},
  {'icon': iconImage, 'title': 'Прощяние С Горами', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Прощяние с горами.mp3'},
  {'icon': iconImage, 'title': 'Прыгун В Высоту', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Париж/Прыгун в высоту.mp3'},
  {'icon': iconImage, 'title': 'Птеродактель', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1998 - Девочка и пластилин/Птеродактель.mp3'},
  {'icon': iconImage, 'title': 'Разговор Со Счастьем (в Золотухин)', 'file': '../../../../../../../Test/Music/Старые песни/Песни из кинофильмов/Разговор со счастьем (В.Золотухин).WAV'},
  {'icon': iconImage, 'title': 'Разлука', 'file': '../../../../../../../Test/Music/Старые песни/Егоров/Разлука.WAV'},
  {'icon': iconImage, 'title': 'Резиновий Ежик', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/2002 - Резиновий ежик/Резиновий ежик.mp3'},
  {'icon': iconImage, 'title': 'Рождественская', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/DISK2/Рождественская.MP3'},
  {'icon': iconImage, 'title': 'Романс Генерала Чарноты', 'file': '../../../../../../../Test/Music/Старые песни/А.Розенбаум/Романс Генерала Чарноты.MP3'},
  {'icon': iconImage, 'title': 'Русская Женщина', 'file': '../../../../../../../Test/Music/Старые песни/Митяев/Русская женщина.mp3'},
  {'icon': iconImage, 'title': 'Рэквием', 'file': '../../../../../../../Test/Music/Старые песни/А.Розенбаум/Рэквием.mp3'},
  {'icon': iconImage, 'title': 'С Добрым Утром Любимая', 'file': '../../../../../../../Test/Music/Старые песни/Митяев/С добрым утром любимая.mp3'},
  {'icon': iconImage, 'title': 'С Любовью Встретится (н Бродская)', 'file': '../../../../../../../Test/Music/Старые песни/Песни из кинофильмов/С любовью встретится (Н.Бродская).WAV'},
  {'icon': iconImage, 'title': 'Свадьба', 'file': '../../../../../../../Test/Music/Старые песни/А.Розенбаум/Свадьба.mp3'},
  {'icon': iconImage, 'title': 'Свадьба', 'file': '../../../../../../../Test/Music/Старые песни/Муслим Магомаев/Свадьба.mp3'},
  {'icon': iconImage, 'title': 'Священная Война', 'file': '../../../../../../../Test/Music/Старые песни/Песни военных лет/Священная Война.MP3'},
  {'icon': iconImage, 'title': 'Священный Бой', 'file': '../../../../../../../Test/Music/Старые песни/Песни военных лет/Священный Бой.MP3'},
  {'icon': iconImage, 'title': 'Сегодня Не Слышно Биенья Сердец', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Сегодня не слышно биенья сердец.mp3'},
  {'icon': iconImage, 'title': 'Серебрянные Струны', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1961 - 1964 Серебрянные струны/Серебрянные струны.mp3'},
  {'icon': iconImage, 'title': 'Синий Туман', 'file': '../../../../../../../Test/Music/Старые песни/Вячеслав Добрынин/Синий туман.WAV'},
  {'icon': iconImage, 'title': 'Сказать По Нашему Мы Выпили Немного', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Сказать по нашему мы выпили немного.WAV'},
  {'icon': iconImage, 'title': 'Скалолазка', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Избранное/Скалолазка.mp3'},
  {'icon': iconImage, 'title': 'Скачи Скачи', 'file': '../../../../../../../Test/Music/Старые песни/А.Розенбаум/Скачи, скачи.mp3'},
  {'icon': iconImage, 'title': 'Случай На Таможне', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Случай на таможне.WAV'},
  {'icon': iconImage, 'title': 'Смуглянка Молдованка', 'file': '../../../../../../../Test/Music/Старые песни/Песни военных лет/Смуглянка молдованка.mp3'},
  {'icon': iconImage, 'title': 'Снег', 'file': '../../../../../../../Test/Music/Старые песни/Городницкий/Снег.WAV'},
  {'icon': iconImage, 'title': 'Сны', 'file': '../../../../../../../Test/Music/Старые песни/DOLSKI/Ленинградские акварели/Сны.MP3'},
  {'icon': iconImage, 'title': 'Со Мною Вот Что Происходит', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/1999 - Со мною вот что происходит/Со мною вот что происходит.mp3'},
  {'icon': iconImage, 'title': 'Собачий Секрет', 'file': '../../../../../../../Test/Music/Старые песни/Никитины/2002 - Резиновий ежик/Собачий секрет.mp3'},
  {'icon': iconImage, 'title': 'Солдат', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/FIRST_LV/Солдат.MP3'},
  {'icon': iconImage, 'title': 'Солдаты Группы Центр', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Солдаты группы центр.WAV'},
  {'icon': iconImage, 'title': 'Соловьиная Роща', 'file': '../../../../../../../Test/Music/Старые песни/Лев Лещенко/Соловьиная роща.mp3'},
  {'icon': iconImage, 'title': 'Соловьиная Роща', 'file': '../../../../../../../Test/Music/Старые песни/Лайма Вайкуле/Соловьиная роща .MP3'},
  {'icon': iconImage, 'title': 'Спасите Наши Души', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1967 - 1968 Лукоморье больше нет/Спасите наши души.mp3'},
  {'icon': iconImage, 'title': 'Среди Берез Среднй Полосы', 'file': '../../../../../../../Test/Music/Старые песни/А.Розенбаум/Среди берез среднй полосы.mp3'},
  {'icon': iconImage, 'title': 'Стали Женщины Нынче Крутые', 'file': '../../../../../../../Test/Music/Старые песни/Тимур Шаов/Стали женщины нынче крутые.mp3'},
  {'icon': iconImage, 'title': 'Старая Пластинка', 'file': '../../../../../../../Test/Music/Старые песни/Ариель/Старая пластинка.WAV'},
  {'icon': iconImage, 'title': 'Старинная Солдатская Песня', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/DISK1/Старинная солдатская песня.mp3'},
  {'icon': iconImage, 'title': 'Старые Слова', 'file': '../../../../../../../Test/Music/Старые песни/Фельцман/Старые слова.MP3'},
  {'icon': iconImage, 'title': 'Старый Дом', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Старый дом.mp3'},
  {'icon': iconImage, 'title': 'Струны Песнями', 'file': '../../../../../../../Test/Music/Старые песни/А.Розенбаум/Струны песнями.mp3'},
  {'icon': iconImage, 'title': 'Сюрприз Для Тети Бэкки', 'file': '../../../../../../../Test/Music/Старые песни/Неуловимый Арчи Или Квасная Америка/Сюрприз для тети Бэкки.MP3'},
  {'icon': iconImage, 'title': 'Так Вот Какая Ты', 'file': '../../../../../../../Test/Music/Старые песни/Синяя птица/Так вот какая ты.mp3'},
  {'icon': iconImage, 'title': 'Так Оно И Есть', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Так оно и есть.mp3'},
  {'icon': iconImage, 'title': 'Тёмная Ночь', 'file': '../../../../../../../Test/Music/Старые песни/Песни военных лет/Тёмная ночь.mp3'},
  {'icon': iconImage, 'title': 'Темная Ночь (м Бернес)', 'file': '../../../../../../../Test/Music/Старые песни/Священная война/Темная ночь (М.Бернес).WAV'},
  {'icon': iconImage, 'title': 'То Была Не Интрижка', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/То была не интрижка.mp3'},
  {'icon': iconImage, 'title': 'То Была Не Интрижка', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/То была не интрижка.WAV'},
  {'icon': iconImage, 'title': 'Товарищи Ученые', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Товарищи ученые.WAV'},
  {'icon': iconImage, 'title': 'Только Так', 'file': '../../../../../../../Test/Music/Старые песни/Иваси/Альма-Матерь/Только так.mp3'},
  {'icon': iconImage, 'title': 'Только Этого Мало', 'file': '../../../../../../../Test/Music/Старые песни/София Ротару/Только этого мало.mp3'},
  {'icon': iconImage, 'title': 'Тоткоторый Не Стрелял', 'file': '../../../../../../../Test/Music/Старые песни/TOPIC5/Тот,который не стрелял.WAV'},
  {'icon': iconImage, 'title': 'Три Белих Коня', 'file': '../../../../../../../Test/Music/Старые песни/Три белих коня.WAV'},
  {'icon': iconImage, 'title': 'Тролейбус', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/FIRST_LV/Тролейбус.mp3'},
  {'icon': iconImage, 'title': 'Трубят Рога', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Трубят рога.WAV'},
  {'icon': iconImage, 'title': 'Туман', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1967 - 1968 Лукоморье больше нет/Туман.mp3'},
  {'icon': iconImage, 'title': 'Ты Мне Не Снишься', 'file': '../../../../../../../Test/Music/Старые песни/Синяя птица/Ты мне не снишься.mp3'},
  {'icon': iconImage, 'title': 'У Меня Было 40 Фамилий', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1961 - 1968 Охота на волков/У меня было 40 фамилий.mp3'},
  {'icon': iconImage, 'title': 'Увезу Тебя Я В Тундру', 'file': '../../../../../../../Test/Music/Старые песни/Самоцветы/Увезу тебя я в тундру.mp3'},
  {'icon': iconImage, 'title': 'Удивительный Вальс', 'file': '../../../../../../../Test/Music/Старые песни/DOLSKI/Старинные часы/Удивительный вальс.MP3'},
  {'icon': iconImage, 'title': 'Ума Палата', 'file': '../../../../../../../Test/Music/Старые песни/Иваси/Бережкарики/Ума палата.mp3'},
  {'icon': iconImage, 'title': 'Утиная Охота', 'file': '../../../../../../../Test/Music/Старые песни/А.Розенбаум/Утиная охота.WAV'},
  {'icon': iconImage, 'title': 'Фламинго', 'file': '../../../../../../../Test/Music/Старые песни/DOLSKI/Ленинградские акварели/Фламинго.MP3'},
  {'icon': iconImage, 'title': 'Холода Холода', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Избранное/Холода , холода.mp3'},
  {'icon': iconImage, 'title': 'Хуторянка', 'file': '../../../../../../../Test/Music/Старые песни/София Ротару/Хуторянка.mp3'},
  {'icon': iconImage, 'title': 'Целуя Знамя Пропыленный Шелк', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Целуя знамя, пропыленный шелк.WAV'},
  {'icon': iconImage, 'title': 'Черное Золото', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Избранное/Черное золото.mp3'},
  {'icon': iconImage, 'title': 'Черные Бушлаты', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Париж/Черные бушлаты.mp3'},
  {'icon': iconImage, 'title': 'Черный Кот', 'file': '../../../../../../../Test/Music/Старые песни/Булат.Окуджава/FIRST_LV/Черный кот.MP3'},
  {'icon': iconImage, 'title': 'Чертово Колесо', 'file': '../../../../../../../Test/Music/Старые песни/Муслим Магомаев/Чертово колесо.mp3'},
  {'icon': iconImage, 'title': 'Честно Говоря', 'file': '../../../../../../../Test/Music/Старые песни/Цветы/Честно говоря.MP3'},
  {'icon': iconImage, 'title': 'Честь Шахматной Короны', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Честь шахматной короны.wav'},
  {'icon': iconImage, 'title': 'Чудестная Страна', 'file': '../../../../../../../Test/Music/Старые песни/Чудестная страна.WAV'},
  {'icon': iconImage, 'title': 'Школьный Вальс', 'file': '../../../../../../../Test/Music/Старые песни/Школьный вальс.mp3'},
  {'icon': iconImage, 'title': 'Шулера', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/1967 - 1968 Лукоморье больше нет/Шулера.mp3'},
  {'icon': iconImage, 'title': 'Экзамен По Химии', 'file': '../../../../../../../Test/Music/Старые песни/DOLSKI/Концерт в г.Минске ч.2/Экзамен по химии.MP3'},
  {'icon': iconImage, 'title': 'Экспедиция', 'file': '../../../../../../../Test/Music/Старые песни/Александр Градский/Экспедиция.MP3'},
  {'icon': iconImage, 'title': 'Электричка', 'file': '../../../../../../../Test/Music/Старые песни/Электричка.mp3'},
  {'icon': iconImage, 'title': 'Эта Ночь', 'file': '../../../../../../../Test/Music/Старые песни/Мираж/Эта ночь.mp3'},
  {'icon': iconImage, 'title': 'Эти Глаза Напротив', 'file': '../../../../../../../Test/Music/Старые песни/Валерий Ободзинский/Эти глаза напротив.mp3'},
  {'icon': iconImage, 'title': 'Эх Раз', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Избранное/Эх раз.mp3'},
  {'icon': iconImage, 'title': 'Эхо', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Париж/Эхо.mp3'},
  {'icon': iconImage, 'title': 'Я Баба Яга', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Я баба-яга.WAV'},
  {'icon': iconImage, 'title': 'Я Буду Долго Гнать Велосипед', 'file': '../../../../../../../Test/Music/Старые песни/Я буду долго гнать велосипед.mp3'},
  {'icon': iconImage, 'title': 'Я Люблю Этот Мир', 'file': '../../../../../../../Test/Music/Старые песни/Самоцветы/Я люблю этот мир.WAV'},
  {'icon': iconImage, 'title': 'Я Не Могу Иначе', 'file': '../../../../../../../Test/Music/Старые песни/Валентина Толкунова/Я не могу иначе.mp3'},
  {'icon': iconImage, 'title': 'Я Помню Райвоенкомат', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Я помню райвоенкомат.WAV'},
  {'icon': iconImage, 'title': 'Ягода Малина', 'file': '../../../../../../../Test/Music/Старые песни/Ягода малина.mp3'},
  {'icon': iconImage, 'title': 'Як Истебитель', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/Избранное/Як истебитель.mp3'},
  {'icon': iconImage, 'title': 'Ярмарка', 'file': '../../../../../../../Test/Music/Старые песни/В.Высоцкий/СD/Ярмарка.WAV'},
]);
})

document.getElementById('тату').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '30 Минут', 'file': '../../../../../../../Test/Music/Тату/30 минут.mp3'},
  {'icon': iconImage, 'title': 'All About Us', 'file': '../../../../../../../Test/Music/Тату/All about Us.mp3'},
  {'icon': iconImage, 'title': 'All The Things She Said', 'file': '../../../../../../../Test/Music/Тату/All The Things She Said.mp3'},
  {'icon': iconImage, 'title': 'How Soon Is Now', 'file': '../../../../../../../Test/Music/Тату/How Soon Is Now.mp3'},
  {'icon': iconImage, 'title': 'Not Gonna Get Us', 'file': '../../../../../../../Test/Music/Тату/Not Gonna Get Us.mp3'},
  {'icon': iconImage, 'title': 'Show Me Love', 'file': '../../../../../../../Test/Music/Тату/Show me love.mp3'},
  {'icon': iconImage, 'title': 'Stars', 'file': '../../../../../../../Test/Music/Тату/Stars.mp3'},
  {'icon': iconImage, 'title': 'Досчитай До Ста', 'file': '../../../../../../../Test/Music/Тату/Досчитай до ста.mp3'},
  {'icon': iconImage, 'title': 'Мальчик Гей', 'file': '../../../../../../../Test/Music/Тату/Мальчик Гей.mp3'},
  {'icon': iconImage, 'title': 'Нас Не Догнят (engl)', 'file': '../../../../../../../Test/Music/Тату/Нас не догнят (Engl).mp3'},
  {'icon': iconImage, 'title': 'Нас Не Догонят', 'file': '../../../../../../../Test/Music/Тату/Нас не догонят .mp3'},
  {'icon': iconImage, 'title': 'Нас Не Догонят', 'file': '../../../../../../../Test/Music/Тату/Нас не догонят.mp3'},
  {'icon': iconImage, 'title': 'Не Верь Не Бойся Не Проси', 'file': '../../../../../../../Test/Music/Тату/Не верь, не бойся, не проси.mp3'},
  {'icon': iconImage, 'title': 'Облока', 'file': '../../../../../../../Test/Music/Тату/Облока.mp3'},
  {'icon': iconImage, 'title': 'Покажи Мне Любовь', 'file': '../../../../../../../Test/Music/Тату/Покажи мне любовь.mp3'},
  {'icon': iconImage, 'title': 'Пол Часа', 'file': '../../../../../../../Test/Music/Тату/Пол часа.mp3'},
  {'icon': iconImage, 'title': 'Простые Движения', 'file': '../../../../../../../Test/Music/Тату/Простые движения.mp3'},
  {'icon': iconImage, 'title': 'Робот', 'file': '../../../../../../../Test/Music/Тату/Робот.mp3'},
  {'icon': iconImage, 'title': 'Твой Враг', 'file': '../../../../../../../Test/Music/Тату/Твой враг.mp3'},
  {'icon': iconImage, 'title': 'Я Сошла С Ума', 'file': '../../../../../../../Test/Music/Тату/Я сошла с ума.MP3'},
]);
})

document.getElementById('чайф').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '17 Лет', 'file': '../../../../../../../Test/Music/Чайф/1995 - Пусть все будет так, как ты захочешь/17 лет.mp3'},
  {'icon': iconImage, 'title': 'Rocknroll Этой Ночи', 'file': '../../../../../../../Test/Music/Чайф/1987 - Дерьмонтин/Rock%27n%27roll этой ночи.mp3'},
  {'icon': iconImage, 'title': 'Ангел', 'file': '../../../../../../../Test/Music/Чайф/2006 - От себя/Ангел.mp3'},
  {'icon': iconImage, 'title': 'Аргентина Ямайка 5 0', 'file': '../../../../../../../Test/Music/Чайф/2000 - Шекогали/Аргентина-Ямайка 5-0.mp3'},
  {'icon': iconImage, 'title': 'В Ее Глазах', 'file': '../../../../../../../Test/Music/Чайф/2000 - Шекогали/В ее глазах.mp3'},
  {'icon': iconImage, 'title': 'Давай Вернемся', 'file': '../../../../../../../Test/Music/Чайф/1990 - Давай вернемся/Давай вернемся.mp3'},
  {'icon': iconImage, 'title': 'Зинаида', 'file': '../../../../../../../Test/Music/Чайф/1994 - Оранжевое настроение/Зинаида.mp3'},
  {'icon': iconImage, 'title': 'Кончается Век', 'file': '../../../../../../../Test/Music/Чайф/2000 - Шекогали/Кончается век.mp3'},
  {'icon': iconImage, 'title': 'Мимо', 'file': '../../../../../../../Test/Music/Чайф/2001 - Время не ждет/Мимо.mp3'},
  {'icon': iconImage, 'title': 'Не Со Мной', 'file': '../../../../../../../Test/Music/Чайф/1996 - Реальный мир/Не со мной.mp3'},
  {'icon': iconImage, 'title': 'Не Спеши', 'file': '../../../../../../../Test/Music/Чайф/1993 - Дети гор/Не спеши.mp3'},
  {'icon': iconImage, 'title': 'Никто Не Услышит', 'file': '../../../../../../../Test/Music/Чайф/1990 - Давай вернемся/Никто не услышит.mp3'},
  {'icon': iconImage, 'title': 'Поплачь О Нем', 'file': '../../../../../../../Test/Music/Чайф/1989 - Не беда/Поплачь о нем.mp3'},
  {'icon': iconImage, 'title': 'С Войны', 'file': '../../../../../../../Test/Music/Чайф/1990 - Давай вернемся/С войны.mp3'},
  {'icon': iconImage, 'title': 'Я Рисую На Окне', 'file': '../../../../../../../Test/Music/Чайф/1999 - Шекогали/Я рисую на окне.mp3'},
]);
})

document.getElementById('эльфийскаярукопись').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Всадник Из Льда', 'file': '../../../../../../../Test/Music/Эльфийская рукопись/Всадник из льда.mp3'},
  {'icon': iconImage, 'title': 'Золотые Драконы', 'file': '../../../../../../../Test/Music/Эльфийская рукопись/Золотые драконы.mp3'},
  {'icon': iconImage, 'title': 'Магия И Меч', 'file': '../../../../../../../Test/Music/Эльфийская рукопись/Магия И Меч.mp3'},
  {'icon': iconImage, 'title': 'Пройди Свой Путь', 'file': '../../../../../../../Test/Music/Эльфийская рукопись/Пройди Свой Путь.mp3'},
  {'icon': iconImage, 'title': 'Романс О Слезе', 'file': '../../../../../../../Test/Music/Эльфийская рукопись/Романс О Слезе.mp3'},
  {'icon': iconImage, 'title': 'Час Испытания', 'file': '../../../../../../../Test/Music/Эльфийская рукопись/Час испытания.mp3'},
  {'icon': iconImage, 'title': 'Эпилог', 'file': '../../../../../../../Test/Music/Эльфийская рукопись/Эпилог.mp3'},
]);
})

document.getElementById('ю.антонов').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Белый Теплоход', 'file': '../../../../../../../Test/Music/Ю.Антонов/1987 - От печали до радости 1/Белый теплоход.mp3'},
  {'icon': iconImage, 'title': 'Берегите Женщин', 'file': '../../../../../../../Test/Music/Ю.Антонов/1987 - От печали до радости 1/Берегите женщин.mp3'},
  {'icon': iconImage, 'title': 'Вот Как Бывает', 'file': '../../../../../../../Test/Music/Ю.Антонов/1983 - Крыша дома твоего/Вот как бывает.mp3'},
  {'icon': iconImage, 'title': 'Давай Не Будем Спешить', 'file': '../../../../../../../Test/Music/Ю.Антонов/1987 - От печали до радости 2/Давай не будем спешить.mp3'},
  {'icon': iconImage, 'title': 'Дай Мне Руку', 'file': '../../../../../../../Test/Music/Ю.Антонов/1987 - От печали до радости 2/Дай мне руку.mp3'},
  {'icon': iconImage, 'title': 'Двадцать Лет Спустя', 'file': '../../../../../../../Test/Music/Ю.Антонов/1983 - Крыша дома твоего/Двадцать лет спустя.mp3'},
  {'icon': iconImage, 'title': 'Дорога К Морю', 'file': '../../../../../../../Test/Music/Ю.Антонов/1983 - Крыша дома твоего/Дорога к морю.mp3'},
  {'icon': iconImage, 'title': 'Если Пойдем Вдвоем', 'file': '../../../../../../../Test/Music/Ю.Антонов/1985 - Поверь в мечту/Если пойдем вдвоем.mp3'},
  {'icon': iconImage, 'title': 'Живет Повсюду Красота', 'file': '../../../../../../../Test/Music/Ю.Антонов/1987 - От печали до радости 2/Живет повсюду красота.mp3'},
  {'icon': iconImage, 'title': 'Жизнь', 'file': '../../../../../../../Test/Music/Ю.Антонов/1987 - От печали до радости 2/Жизнь.mp3'},
  {'icon': iconImage, 'title': 'Зеркало', 'file': '../../../../../../../Test/Music/Ю.Антонов/1983 - Золотая лестница (Группа Аракс)/Зеркало.mp3'},
  {'icon': iconImage, 'title': 'Крыша Дома Твоего', 'file': '../../../../../../../Test/Music/Ю.Антонов/1983 - Крыша дома твоего/Крыша дома твоего.mp3'},
  {'icon': iconImage, 'title': 'Лунная Дорожка', 'file': '../../../../../../../Test/Music/Ю.Антонов/1987 - От печали до радости 1/Лунная дорожка.mp3'},
  {'icon': iconImage, 'title': 'Мой Путь Прост', 'file': '../../../../../../../Test/Music/Ю.Антонов/1987 - От печали до радости 1/Мой путь прост.mp3'},
  {'icon': iconImage, 'title': 'Море', 'file': '../../../../../../../Test/Music/Ю.Антонов/1983 - Крыша дома твоего/Море.mp3'},
  {'icon': iconImage, 'title': 'На Улице Каштановой', 'file': '../../../../../../../Test/Music/Ю.Антонов/1985 - Поверь в мечту/На улице Каштановой.mp3'},
  {'icon': iconImage, 'title': 'Не Говорите Мне Прощай', 'file': '../../../../../../../Test/Music/Ю.Антонов/1987 - От печали до радости 1/Не говорите мне прощай.mp3'},
  {'icon': iconImage, 'title': 'Не До Смеха', 'file': '../../../../../../../Test/Music/Ю.Антонов/1985 - Поверь в мечту/Не до смеха.mp3'},
  {'icon': iconImage, 'title': 'Не Забывай', 'file': '../../../../../../../Test/Music/Ю.Антонов/1983 - Золотая лестница (Группа Аракс)/Не забывай.mp3'},
  {'icon': iconImage, 'title': 'Не Рвите Цветы', 'file': '../../../../../../../Test/Music/Ю.Антонов/1987 - От печали до радости 1/Не рвите цветы.mp3'},
  {'icon': iconImage, 'title': 'От Печали До Радости', 'file': '../../../../../../../Test/Music/Ю.Антонов/1983 - Золотая лестница (Группа Аракс)/От печали до радости.mp3'},
  {'icon': iconImage, 'title': 'Поверь В Мечту', 'file': '../../../../../../../Test/Music/Ю.Антонов/1985 - Поверь в мечту/Поверь в мечту.mp3'},
  {'icon': iconImage, 'title': 'Пусть Вечным Будет Мир', 'file': '../../../../../../../Test/Music/Ю.Антонов/1996 - Песни для детей/Пусть вечным будет мир.mp3'},
  {'icon': iconImage, 'title': 'Родные Места', 'file': '../../../../../../../Test/Music/Ю.Антонов/1987 - От печали до радости 2/Родные места.mp3'},
  {'icon': iconImage, 'title': 'Снегири', 'file': '../../../../../../../Test/Music/Ю.Антонов/1985 - Поверь в мечту/Снегири.mp3'},
  {'icon': iconImage, 'title': 'Трава У Дома', 'file': '../../../../../../../Test/Music/Ю.Антонов/Трава у дома.mp3'},
  {'icon': iconImage, 'title': 'Туами', 'file': '../../../../../../../Test/Music/Ю.Антонов/1996 - Песни для детей/Туами.mp3'},
  {'icon': iconImage, 'title': 'У Берез И Сосен', 'file': '../../../../../../../Test/Music/Ю.Антонов/1973 - Юрий Антонов и оркестр Современник/У берез и сосен.mp3'},
  {'icon': iconImage, 'title': 'Хмельная Сирень', 'file': '../../../../../../../Test/Music/Ю.Антонов/1987 - От печали до радости 2/Хмельная сирень.mp3'},
  {'icon': iconImage, 'title': 'Я Не Жалею Ни О Чем', 'file': '../../../../../../../Test/Music/Ю.Антонов/1985 - Поверь в мечту/Я не жалею ни о чем.mp3'},
]);
})

document.getElementById('юрийвизбор').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Vi09 13', 'file': '../../../../../../../Test/Music/Юрий Визбор/VI09_13.mp3'},
  {'icon': iconImage, 'title': 'Английский Язык', 'file': '../../../../../../../Test/Music/Юрий Визбор/ВСТАВАЙТЕ ГРАФ/Английский язык.mp3'},
  {'icon': iconImage, 'title': 'Базука', 'file': '../../../../../../../Test/Music/Юрий Визбор/ЕСЛИ Я ЗАБОЛЕЮ/Базука.mp3'},
  {'icon': iconImage, 'title': 'Бригантина', 'file': '../../../../../../../Test/Music/Юрий Визбор/БРИГАНТИНА/Бригантина.mp3'},
  {'icon': iconImage, 'title': 'Велосипед', 'file': '../../../../../../../Test/Music/Юрий Визбор/СОЛНЫШКО ЛЕСНОЕ/Велосипед.mp3'},
  {'icon': iconImage, 'title': 'Волейбол На Сретенке', 'file': '../../../../../../../Test/Music/Юрий Визбор/ВОЛЕЙБОЛ НА СРЕТЕНКЕ/Волейбол на Сретенке.mp3'},
  {'icon': iconImage, 'title': 'Вставайте Граф', 'file': '../../../../../../../Test/Music/Юрий Визбор/ВСТАВАЙТЕ ГРАФ/Вставайте граф.mp3'},
  {'icon': iconImage, 'title': 'Давным Давно', 'file': '../../../../../../../Test/Music/Юрий Визбор/ДОМБАИССКИЙ ВАЛЬС/Давным давно.mp3'},
  {'icon': iconImage, 'title': 'Доклад', 'file': '../../../../../../../Test/Music/Юрий Визбор/НОЧНАЯ ДОРОГА/Доклад.mp3'},
  {'icon': iconImage, 'title': 'Домбайсский Вальс', 'file': '../../../../../../../Test/Music/Юрий Визбор/ДОМБАИССКИЙ ВАЛЬС/Домбайсский вальс.mp3'},
  {'icon': iconImage, 'title': 'Если Я Заболею', 'file': '../../../../../../../Test/Music/Юрий Визбор/ЕСЛИ Я ЗАБОЛЕЮ/Если я заболею.mp3'},
  {'icon': iconImage, 'title': 'Жак Ландрэй', 'file': '../../../../../../../Test/Music/Юрий Визбор/Жак Ландрэй.mp3'},
  {'icon': iconImage, 'title': 'Здравствуйздравствуй', 'file': '../../../../../../../Test/Music/Юрий Визбор/ДОМБАИССКИЙ ВАЛЬС/Здравствуй,здравствуй.mp3'},
  {'icon': iconImage, 'title': 'Излишний Вес', 'file': '../../../../../../../Test/Music/Юрий Визбор/ЗЕЛЕНОЕ ПЕРО/Излишний вес.mp3'},
  {'icon': iconImage, 'title': 'Ищи Меня Сегодня', 'file': '../../../../../../../Test/Music/Юрий Визбор/Ищи меня сегодня.WAV'},
  {'icon': iconImage, 'title': 'Люси', 'file': '../../../../../../../Test/Music/Юрий Визбор/ВСТАВАЙТЕ ГРАФ/Люси.mp3'},
  {'icon': iconImage, 'title': 'Мне Твердят', 'file': '../../../../../../../Test/Music/Юрий Визбор/ВОЛЕЙБОЛ НА СРЕТЕНКЕ/Мне твердят.mp3'},
  {'icon': iconImage, 'title': 'Нам Бы Выпить Перед Стартом', 'file': '../../../../../../../Test/Music/Юрий Визбор/ВСТАВАЙТЕ ГРАФ/Нам бы выпить перед стартом.mp3'},
  {'icon': iconImage, 'title': 'Наполним Музыкой Сердца', 'file': '../../../../../../../Test/Music/Юрий Визбор/ДОМБАИССКИЙ ВАЛЬС/Наполним музыкой сердца.mp3'},
  {'icon': iconImage, 'title': 'Ночная Дорога', 'file': '../../../../../../../Test/Music/Юрий Визбор/НОЧНАЯ ДОРОГА/Ночная дорога.mp3'},
  {'icon': iconImage, 'title': 'Памирская Песня', 'file': '../../../../../../../Test/Music/Юрий Визбор/РАСПАХНУТЫЕ ВЕТРА/Памирская песня.mp3'},
  {'icon': iconImage, 'title': 'Песня Альпинистов', 'file': '../../../../../../../Test/Music/Юрий Визбор/РАСПАХНУТЫЕ ВЕТРА/Песня альпинистов.mp3'},
  {'icon': iconImage, 'title': 'Песня О Москве', 'file': '../../../../../../../Test/Music/Юрий Визбор/НОЧНАЯ ДОРОГА/Песня о Москве.mp3'},
  {'icon': iconImage, 'title': 'Подмосковная', 'file': '../../../../../../../Test/Music/Юрий Визбор/БРИГАНТИНА/Подмосковная.mp3'},
  {'icon': iconImage, 'title': 'Рассказ Ветерана', 'file': '../../../../../../../Test/Music/Юрий Визбор/ЗИМНИЙ ВЕЧЕР/Рассказ ветерана.mp3'},
  {'icon': iconImage, 'title': 'Серега Санин', 'file': '../../../../../../../Test/Music/Юрий Визбор/ДОМБАИССКИЙ ВАЛЬС/Серега Санин.mp3'},
  {'icon': iconImage, 'title': 'Солнышко Лесное', 'file': '../../../../../../../Test/Music/Юрий Визбор/СОЛНЫШКО ЛЕСНОЕ/Солнышко лесное.mp3'},
  {'icon': iconImage, 'title': 'Солнышко Лесное', 'file': '../../../../../../../Test/Music/Юрий Визбор/Солнышко лесное.WAV'},
  {'icon': iconImage, 'title': 'Сорокалетие', 'file': '../../../../../../../Test/Music/Юрий Визбор/ВСТАВАЙТЕ ГРАФ/Сорокалетие.mp3'},
  {'icon': iconImage, 'title': 'Спартак На Памире', 'file': '../../../../../../../Test/Music/Юрий Визбор/ДОМБАИССКИЙ ВАЛЬС/Спартак на Памире.mp3'},
  {'icon': iconImage, 'title': 'Сретенский Двор', 'file': '../../../../../../../Test/Music/Юрий Визбор/ВОЛЕЙБОЛ НА СРЕТЕНКЕ/Сретенский двор.mp3'},
  {'icon': iconImage, 'title': 'Старые Ели', 'file': '../../../../../../../Test/Music/Юрий Визбор/БРИГАНТИНА/Старые Ели.mp3'},
  {'icon': iconImage, 'title': 'Телефон', 'file': '../../../../../../../Test/Music/Юрий Визбор/ВСТАВАЙТЕ ГРАФ/Телефон.mp3'},
  {'icon': iconImage, 'title': 'Три Минуты Тишины', 'file': '../../../../../../../Test/Music/Юрий Визбор/НОЧНАЯ ДОРОГА/Три минуты тишины.mp3'},
  {'icon': iconImage, 'title': 'Три Сосны', 'file': '../../../../../../../Test/Music/Юрий Визбор/Три сосны.mp3'},
  {'icon': iconImage, 'title': 'Ты У Меня Одна', 'file': '../../../../../../../Test/Music/Юрий Визбор/Ты у меня одна.mp3'},
  {'icon': iconImage, 'title': 'Ты У Меня Одна', 'file': '../../../../../../../Test/Music/Юрий Визбор/ДОМБАИССКИЙ ВАЛЬС/Ты у меня одна.mp3'},
  {'icon': iconImage, 'title': 'Укушенный', 'file': '../../../../../../../Test/Music/Юрий Визбор/ВОЛЕЙБОЛ НА СРЕТЕНКЕ/Укушенный.mp3'},
  {'icon': iconImage, 'title': 'Фанские Горы', 'file': '../../../../../../../Test/Music/Юрий Визбор/РАСПАХНУТЫЕ ВЕТРА/Фанские горы.mp3'},
  {'icon': iconImage, 'title': 'Ходики', 'file': '../../../../../../../Test/Music/Юрий Визбор/ВОЛЕЙБОЛ НА СРЕТЕНКЕ/Ходики.mp3'},
  {'icon': iconImage, 'title': 'Я Думаю О Вас', 'file': '../../../../../../../Test/Music/Юрий Визбор/ЗЕЛЕНОЕ ПЕРО/Я думаю о вас.mp3'},
]);
})

