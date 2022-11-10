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
  {'icon': iconImage, 'title': 'Chiquitita', 'file': '../../../../../../../../D:/MUSIK/ABBA/1986 - Abba Live/Chiquitita.mp3'},
  {'icon': iconImage, 'title': 'Dancing Queen', 'file': '../../../../../../../../D:/MUSIK/ABBA/1986 - Abba Live/Dancing Queen.mp3'},
  {'icon': iconImage, 'title': 'Fernando', 'file': '../../../../../../../../D:/MUSIK/ABBA/1976 - Arrival/Fernando.mp3'},
  {'icon': iconImage, 'title': 'Gimme! Gimme! Gimme! (a Man After Midnight)', 'file': '../../../../../../../../D:/MUSIK/ABBA/1979 - Voulez-Vous/Gimme! Gimme! Gimme! (a man after midnight).mp3'},
  {'icon': iconImage, 'title': 'Happy New Year', 'file': '../../../../../../../../D:/MUSIK/ABBA/1980 - Super Trouper/Happy New Year.mp3'},
  {'icon': iconImage, 'title': 'Head Over Heels', 'file': '../../../../../../../../D:/MUSIK/ABBA/1993 - More Abba Gold/Head Over Heels.mp3'},
  {'icon': iconImage, 'title': 'Honey Honey', 'file': '../../../../../../../../D:/MUSIK/ABBA/1974 - Waterloo/Honey, Honey.mp3'},
  {'icon': iconImage, 'title': 'I Do I Do I Do', 'file': '../../../../../../../../D:/MUSIK/ABBA/1993 - More Abba Gold/I do, I do, I do.mp3'},
  {'icon': iconImage, 'title': 'I Have A Dream', 'file': '../../../../../../../../D:/MUSIK/ABBA/1979 - Voulez-Vous/I Have A Dream.mp3'},
  {'icon': iconImage, 'title': 'Knowing Me Knowing You', 'file': '../../../../../../../../D:/MUSIK/ABBA/1992 - Abba Gold Greatest Hits/Knowing Me, Knowing You.mp3'},
  {'icon': iconImage, 'title': 'Lay All Your Love On Me', 'file': '../../../../../../../../D:/MUSIK/ABBA/1980 - Super Trouper/Lay All Your Love On Me.mp3'},
  {'icon': iconImage, 'title': 'Mamma Mia', 'file': '../../../../../../../../D:/MUSIK/ABBA/1975 - ABBA/Mamma Mia.mp3'},
  {'icon': iconImage, 'title': 'Monday', 'file': '../../../../../../../../D:/MUSIK/ABBA/Monday.mp3'},
  {'icon': iconImage, 'title': 'Money Money Money', 'file': '../../../../../../../../D:/MUSIK/ABBA/1976 - Arrival/Money, Money, Money.mp3'},
  {'icon': iconImage, 'title': 'One Of Us', 'file': '../../../../../../../../D:/MUSIK/ABBA/1981 - The Visitors/One of Us.mp3'},
  {'icon': iconImage, 'title': 'Ring Ring', 'file': '../../../../../../../../D:/MUSIK/ABBA/1973 - Ring Ring/Ring Ring.mp3'},
  {'icon': iconImage, 'title': 'Sos', 'file': '../../../../../../../../D:/MUSIK/ABBA/1975 - ABBA/SOS.mp3'},
  {'icon': iconImage, 'title': 'Summer Night City', 'file': '../../../../../../../../D:/MUSIK/ABBA/1993 - More Abba Gold/Summer Night City.mp3'},
  {'icon': iconImage, 'title': 'Super Trouper', 'file': '../../../../../../../../D:/MUSIK/ABBA/1986 - Abba Live/Super Trouper.mp3'},
  {'icon': iconImage, 'title': 'Thank You For The Music', 'file': '../../../../../../../../D:/MUSIK/ABBA/1986 - Abba Live/Thank You For The Music.mp3'},
  {'icon': iconImage, 'title': 'The Winner Takes It All', 'file': '../../../../../../../../D:/MUSIK/ABBA/1980 - Super Trouper/The Winner Takes It All.mp3'},
  {'icon': iconImage, 'title': 'Voulez Vous', 'file': '../../../../../../../../D:/MUSIK/ABBA/1979 - Voulez-Vous/Voulez-Vous.mp3'},
  {'icon': iconImage, 'title': 'Waterloo', 'file': '../../../../../../../../D:/MUSIK/ABBA/1974 - Waterloo/Waterloo.mp3'},
]);
})

document.getElementById('akk').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '15 Rock Songs', 'file': '../../../../../../../../D:/MUSIK/Akk/15 ROCK SONGS.mp4'},
  {'icon': iconImage, 'title': '30 Риффов Арии ( Кипелов Маврин) Лучшая Подборка (guitar Cover)', 'file': '../../../../../../../../D:/MUSIK/Akk/30 риффов Арии (+Кипелов _ Маврин) - лучшая подборка (guitar cover).mp4'},
  {'icon': iconImage, 'title': 'A Mi Manera My Way Elena Yerevan ', 'file': '../../../../../../../../D:/MUSIK/Akk/A mi manera - My way -Elena -Yerevan- .mp4'},
  {'icon': iconImage, 'title': 'Addio A Cheyene', 'file': '../../../../../../../../D:/MUSIK/Akk/Addio A Cheyene.mp4'},
  {'icon': iconImage, 'title': 'Ausländer Guitar Lesson W Tabs (720p 30fps H264 128kbit Aac)', 'file': '../../../../../../../../D:/MUSIK/Akk/Ausländer Guitar Lesson w_ TABS (720p_30fps_H264-128kbit_AAC).mp4'},
  {'icon': iconImage, 'title': 'Bad Liar (chords & Lyrics)', 'file': '../../../../../../../../D:/MUSIK/Akk/Bad Liar (chords & lyrics).mp4'},
  {'icon': iconImage, 'title': 'Bamboleo Elena Yerevan', 'file': '../../../../../../../../D:/MUSIK/Akk/Bamboleo ELENA _Yerevan.mp4'},
  {'icon': iconImage, 'title': 'Bamboleo Gipsy Kings Como Tocar No Tvcifras (candô)', 'file': '../../../../../../../../D:/MUSIK/Akk/Bamboleo - Gipsy Kings - Como Tocar no TVCifras (Candô).mp4'},
  {'icon': iconImage, 'title': 'Behind Blue Eyes (the Who) Разбор Corus Guitar Guide #6', 'file': '../../../../../../../../D:/MUSIK/Akk/Behind Blue Eyes (The Who)   Разбор COrus Guitar Guide #6.mp4'},
  {'icon': iconImage, 'title': 'Birds On Guitaarr', 'file': '../../../../../../../../D:/MUSIK/Akk/Birds on Guitaarr.mp4'},
  {'icon': iconImage, 'title': 'California Dreamin Gabriella Quevedo', 'file': '../../../../../../../../D:/MUSIK/Akk/California Dreamin%27 - Gabriella Quevedo.mp4'},
  {'icon': iconImage, 'title': 'California Dreaming', 'file': '../../../../../../../../D:/MUSIK/Akk/California Dreaming.mp4'},
  {'icon': iconImage, 'title': 'Cancion Del Mariachi In Studio 2017 Dpr', 'file': '../../../../../../../../D:/MUSIK/Akk/Cancion Del Mariachi-IN STUDIO-2017 DPR.mp4'},
  {'icon': iconImage, 'title': 'Canción Del Mariachi Разбор Вступления На Гитаре', 'file': '../../../../../../../../D:/MUSIK/Akk/Canción Del Mariachi Разбор вступления на гитаре.mp4'},
  {'icon': iconImage, 'title': 'Chi Mai', 'file': '../../../../../../../../D:/MUSIK/Akk/Chi Mai.mp4'},
  {'icon': iconImage, 'title': 'Children', 'file': '../../../../../../../../D:/MUSIK/Akk/Children.mp4'},
  {'icon': iconImage, 'title': 'Children Robert Miles', 'file': '../../../../../../../../D:/MUSIK/Akk/Children - Robert Miles.webm'},
  {'icon': iconImage, 'title': 'Conquest Of Paradise Classical Guitar', 'file': '../../../../../../../../D:/MUSIK/Akk/Conquest of paradise- Classical Guitar.mp4'},
  {'icon': iconImage, 'title': 'Creep Fingerstyle Guitare', 'file': '../../../../../../../../D:/MUSIK/Akk/Creep FINGERSTYLE GUITARE.mp4'},
  {'icon': iconImage, 'title': 'Demons Fingerstyle Guitar Cover By James Bartholomew', 'file': '../../../../../../../../D:/MUSIK/Akk/Demons - Fingerstyle Guitar Cover By James Bartholomew.webm'},
  {'icon': iconImage, 'title': 'Dust In The Wind Gabriella Quevedo', 'file': '../../../../../../../../D:/MUSIK/Akk/Dust In The Wind - Gabriella Quevedo.mp4'},
  {'icon': iconImage, 'title': 'Ecstasy Of Gold Spanish Guitar Fingerstyle', 'file': '../../../../../../../../D:/MUSIK/Akk/ECSTASY OF GOLD - SPANISH GUITAR FINGERSTYLE.mp4'},
  {'icon': iconImage, 'title': 'Eleanor Rigby Acoustic Guitar Lesson Note Tabs', 'file': '../../../../../../../../D:/MUSIK/Akk/Eleanor Rigby  Acoustic guitar lesson note tabs.mp4'},
  {'icon': iconImage, 'title': 'Eleanor Rigby Guitar Lesson (easy)', 'file': '../../../../../../../../D:/MUSIK/Akk/Eleanor Rigby - Guitar Lesson (easy).mp4'},
  {'icon': iconImage, 'title': 'Elena Yerevan Белый Конь', 'file': '../../../../../../../../D:/MUSIK/Akk/Elena -Yerevan- Белый конь.mp4'},
  {'icon': iconImage, 'title': 'Enjoy The Silence Guitar Lesson Depeche Mode', 'file': '../../../../../../../../D:/MUSIK/Akk/Enjoy the Silence Guitar Lesson - Depeche Mode.mp4'},
  {'icon': iconImage, 'title': 'Enter Sandman By Metallica Legendary Riff #1', 'file': '../../../../../../../../D:/MUSIK/Akk/Enter Sandman by Metallica - Legendary Riff #1.mp4'},
  {'icon': iconImage, 'title': 'Et Si Tu Nexistais Pas', 'file': '../../../../../../../../D:/MUSIK/Akk/Et Si Tu N%27existais Pas.mp4'},
  {'icon': iconImage, 'title': 'Fly Ludovico Einaudi Intouchables Piano Tutorial By Plutax Synthesia', 'file': '../../../../../../../../D:/MUSIK/Akk/Fly - Ludovico Einaudi Intouchables Piano Tutorial by PlutaX Synthesia.mp4'},
  {'icon': iconImage, 'title': 'Forrest Gump Soundtrack', 'file': '../../../../../../../../D:/MUSIK/Akk/Forrest Gump Soundtrack.mp4'},
  {'icon': iconImage, 'title': 'Fragile 1 2 Intro Verse Sting How To Play Acoustic Tutorial', 'file': '../../../../../../../../D:/MUSIK/Akk/Fragile 1_2 - Intro_Verse - Sting - How to play_ Acoustic Tutorial.mp4'},
  {'icon': iconImage, 'title': 'Fragile 2 2 Chorus Sting How To Play Acoustic Tutorial', 'file': '../../../../../../../../D:/MUSIK/Akk/Fragile 2_2 - Chorus - Sting - How to play_ Acoustic Tutorial.mp4'},
  {'icon': iconImage, 'title': 'Help! Guitar Cover', 'file': '../../../../../../../../D:/MUSIK/Akk/Help! - Guitar Cover.mp4'},
  {'icon': iconImage, 'title': 'Help! Guitar Secrets', 'file': '../../../../../../../../D:/MUSIK/Akk/Help! Guitar Secrets.mp4'},
  {'icon': iconImage, 'title': 'Hero Of The Day By Metallica United We Tab', 'file': '../../../../../../../../D:/MUSIK/Akk/Hero of the Day by Metallica - United We Tab.mp4'},
  {'icon': iconImage, 'title': 'Hero Of The Day Guitar Lesson Metallica', 'file': '../../../../../../../../D:/MUSIK/Akk/Hero of the Day Guitar Lesson - Metallica.mp4'},
  {'icon': iconImage, 'title': 'High Hopes', 'file': '../../../../../../../../D:/MUSIK/Akk/High-Hopes.mp4'},
  {'icon': iconImage, 'title': 'High Hopes (piano Cover)', 'file': '../../../../../../../../D:/MUSIK/Akk/High Hopes (Piano Cover).mp4'},
  {'icon': iconImage, 'title': 'High Hopes Piano Cover', 'file': '../../../../../../../../D:/MUSIK/Akk/High Hopes - piano cover.webm'},
  {'icon': iconImage, 'title': 'Honor Him Guitar Fingerstyle', 'file': '../../../../../../../../D:/MUSIK/Akk/HONOR HIM - Guitar FingerStyle.mp4'},
  {'icon': iconImage, 'title': 'Hotel California Gabriella Quevedo', 'file': '../../../../../../../../D:/MUSIK/Akk/Hotel California - Gabriella Quevedo.mp4'},
  {'icon': iconImage, 'title': 'House Of The Rising Sun', 'file': '../../../../../../../../D:/MUSIK/Akk/House Of The Rising Sun.mp4'},
  {'icon': iconImage, 'title': 'Interstellar Theme (day One)', 'file': '../../../../../../../../D:/MUSIK/Akk/Interstellar Theme (Day One).webm'},
  {'icon': iconImage, 'title': 'Johnny B Goode Larissa Liveir (1080p 30fps H264 128kbit Aac)', 'file': '../../../../../../../../D:/MUSIK/Akk/Johnny B. Goode - Larissa Liveir (1080p_30fps_H264-128kbit_AAC).mp4'},
  {'icon': iconImage, 'title': 'Lost On Youu', 'file': '../../../../../../../../D:/MUSIK/Akk/Lost on youu.mp4'},
  {'icon': iconImage, 'title': 'Low Mans Lyric Abridged Acoustic Metallica Cover', 'file': '../../../../../../../../D:/MUSIK/Akk/Low Man%27s Lyric - Abridged Acoustic Metallica Cover.mp4'},
  {'icon': iconImage, 'title': 'My Heart Will Go On', 'file': '../../../../../../../../D:/MUSIK/Akk/My Heart Will Go On.mp4'},
  {'icon': iconImage, 'title': 'My Heart Will Go On Gabriella Quevedo', 'file': '../../../../../../../../D:/MUSIK/Akk/My Heart Will Go On - Gabriella Quevedo.mp4'},
  {'icon': iconImage, 'title': 'Nothing Else Matters Gabriella Quevedo', 'file': '../../../../../../../../D:/MUSIK/Akk/Nothing Else Matters - Gabriella Quevedo.mp4'},
  {'icon': iconImage, 'title': 'One Jasmine Jams Episode 4 Metallica', 'file': '../../../../../../../../D:/MUSIK/Akk/ONE - Jasmine Jams Episode 4 _ METALLICA.mp4'},
  {'icon': iconImage, 'title': 'Parole Parole Elena Yerevan', 'file': '../../../../../../../../D:/MUSIK/Akk/Parole Parole ELENA _Yerevan.mp4'},
  {'icon': iconImage, 'title': 'Personal Jesus De Depeche Mode En Guitarra Acústica (hd) Tutorial Christianvib', 'file': '../../../../../../../../D:/MUSIK/Akk/Personal Jesus de Depeche Mode en Guitarra Acústica (HD) Tutorial - Christianvib.mp4'},
  {'icon': iconImage, 'title': 'Por Una Cabeza (carlos Gardel)', 'file': '../../../../../../../../D:/MUSIK/Akk/Por Una Cabeza (Carlos Gardel).mp4'},
  {'icon': iconImage, 'title': 'Por Una Cabeza (theme From The Scent Of A Woman) Guitar Arrangement By Nemanja Bogunovic', 'file': '../../../../../../../../D:/MUSIK/Akk/Por una Cabeza (theme from The Scent of a Woman) guitar arrangement by Nemanja Bogunovic.mp4'},
  {'icon': iconImage, 'title': 'Por Una Cabeza Scent Of A Woman Tango Guitar Cover', 'file': '../../../../../../../../D:/MUSIK/Akk/Por Una Cabeza - Scent of a woman tango. Guitar cover.mp4'},
  {'icon': iconImage, 'title': 'Send Me On My Way Rusted Root (lilos Wall Jemima Coulter Cover)', 'file': '../../../../../../../../D:/MUSIK/Akk/Send Me On My Way - Rusted Root (Lilo%27s Wall Jemima Coulter Cover).mp4'},
  {'icon': iconImage, 'title': 'Seven Nation Army Разбор', 'file': '../../../../../../../../D:/MUSIK/Akk/Seven Nation Army-Разбор.mp4'},
  {'icon': iconImage, 'title': 'Shape Of My Heart Тональность ( Fm# ) Как Играть На Гитаре Песню', 'file': '../../../../../../../../D:/MUSIK/Akk/Shape Of My Heart Тональность ( Fm# ) Как играть на гитаре песню.mp4'},
  {'icon': iconImage, 'title': 'Shine On You Crazy Diamond (cover With Tab)', 'file': '../../../../../../../../D:/MUSIK/Akk/Shine On You Crazy Diamond (Cover With Tab).mp4'},
  {'icon': iconImage, 'title': 'Summer Presto Guitar Cover', 'file': '../../../../../../../../D:/MUSIK/Akk/Summer Presto guitar cover.mp4'},
  {'icon': iconImage, 'title': 'The Battle Guitare Fingerstyle', 'file': '../../../../../../../../D:/MUSIK/Akk/THE BATTLE - Guitare FingerStyle.mp4'},
  {'icon': iconImage, 'title': 'The Lonely Shepherd Одинокий Пастух James Last', 'file': '../../../../../../../../D:/MUSIK/Akk/The Lonely Shepherd, Одинокий пастух - James Last.mp4'},
  {'icon': iconImage, 'title': 'The Thing That Should Not Be Guitar Lesson (full Song) Metallica', 'file': '../../../../../../../../D:/MUSIK/Akk/The Thing That Should Not Be - Guitar Lesson (FULL SONG) - Metallica.mp4'},
  {'icon': iconImage, 'title': 'The Unforgiven Metallica Fingerstyle', 'file': '../../../../../../../../D:/MUSIK/Akk/The Unforgiven - Metallica _ Fingerstyle.mp4'},
  {'icon': iconImage, 'title': 'The Unforgiven Metallica Fingerstyle На Гитаре Ноты Табы Разбор', 'file': '../../../../../../../../D:/MUSIK/Akk/The Unforgiven - Metallica _ Fingerstyle На гитаре _ Ноты Табы Разбор.mp4'},
  {'icon': iconImage, 'title': 'Time (piano Version) Sheet Music', 'file': '../../../../../../../../D:/MUSIK/Akk/Time (Piano Version)   Sheet Music.mp4'},
  {'icon': iconImage, 'title': 'Tuto Godfather Le Parrain Tablature Fingerstyle Guitar', 'file': '../../../../../../../../D:/MUSIK/Akk/TUTO - GODFATHER - LE PARRAIN - tablature - FINGERSTYLE GUITAR.mp4'},
  {'icon': iconImage, 'title': 'Tuyo (live) September 26 2016', 'file': '../../../../../../../../D:/MUSIK/Akk/Tuyo (live) - September 26, 2016.mp4'},
  {'icon': iconImage, 'title': 'Tuyo (narcos Theme Song) Easy Piano Tutorial How To Play Tuyo On Piano', 'file': '../../../../../../../../D:/MUSIK/Akk/Tuyo (Narcos Theme Song) - EASY Piano Tutorial - How to play Tuyo on piano.mp4'},
  {'icon': iconImage, 'title': 'Tuyo Narcos Intro Song (live @le Guess Who 2018)', 'file': '../../../../../../../../D:/MUSIK/Akk/Tuyo - Narcos intro song (live @Le Guess Who 2018).webm'},
  {'icon': iconImage, 'title': 'Tuyo Sesc Pinheiros', 'file': '../../../../../../../../D:/MUSIK/Akk/Tuyo _ SESC Pinheiros.mp4'},
  {'icon': iconImage, 'title': 'Videoplayback', 'file': '../../../../../../../../D:/MUSIK/Akk/videoplayback.mp4'},
  {'icon': iconImage, 'title': 'Was Ich Liebe Guitar Lesson W Tabs (720p 30fps H264 128kbit Aac)', 'file': '../../../../../../../../D:/MUSIK/Akk/Was Ich Liebe Guitar Lesson w_ TABS (720p_30fps_H264-128kbit_AAC).mp4'},
  {'icon': iconImage, 'title': 'Welcome Home (sanitarium) (guitar Cover With Tab)', 'file': '../../../../../../../../D:/MUSIK/Akk/WELCOME HOME (SANITARIUM) (Guitar cover with TAB).mp4'},
  {'icon': iconImage, 'title': 'Welcome Home (sanitarium) Full Guitar Cover', 'file': '../../../../../../../../D:/MUSIK/Akk/Welcome Home (Sanitarium) FULL Guitar Cover.mp4'},
  {'icon': iconImage, 'title': 'Whatever It Takes Lyrics', 'file': '../../../../../../../../D:/MUSIK/Akk/Whatever It Takes - Lyrics.mp4'},
  {'icon': iconImage, 'title': 'Whatever It Takes Разбор На Гитаре Как Играть Аккорды', 'file': '../../../../../../../../D:/MUSIK/Akk/Whatever It Takes разбор на гитаре как играть аккорды.mp4'},
  {'icon': iconImage, 'title': 'While My Guitar Gently Weeps', 'file': '../../../../../../../../D:/MUSIK/Akk/While My Guitar Gently Weeps.mp4'},
  {'icon': iconImage, 'title': 'Yesterday Gabriella Quevedo', 'file': '../../../../../../../../D:/MUSIK/Akk/Yesterday - Gabriella Quevedo.mp4'},
  {'icon': iconImage, 'title': 'Ария', 'file': '../../../../../../../../D:/MUSIK/Akk/Ария.mp4'},
  {'icon': iconImage, 'title': 'Бережкарики А Иващенко (кавер)', 'file': '../../../../../../../../D:/MUSIK/Akk/Бережкарики, А.Иващенко (кавер).mp4'},
  {'icon': iconImage, 'title': 'Бременские Музыканты Бременские Музыканты', 'file': '../../../../../../../../D:/MUSIK/Akk/Бременские музыканты - Бременские музыканты.mp4'},
  {'icon': iconImage, 'title': 'Бременские Музыканты Музыкальное Вскрытие', 'file': '../../../../../../../../D:/MUSIK/Akk/Бременские музыканты - Музыкальное вскрытие.mp4'},
  {'icon': iconImage, 'title': 'Бременские Музыкантыбуратино Ну Погоди Garri Pat', 'file': '../../../../../../../../D:/MUSIK/Akk/Бременские Музыканты,Буратино- %27Ну Погоди%27 , Garri Pat.mp4'},
  {'icon': iconImage, 'title': 'Вальс Из К Ф Мой Ласковый И Нежный Зверь Fingerstyle Cover', 'file': '../../../../../../../../D:/MUSIK/Akk/Вальс из к_ф %27Мой ласковый и нежный зверь%27 _ Fingerstyle cover.mp4'},
  {'icon': iconImage, 'title': 'Вальс Из К Ф Мой Ласковый И Нежный Зверь На Гитаре Разбор Ноты Табы', 'file': '../../../../../../../../D:/MUSIK/Akk/Вальс из к_ф %27Мой ласковый и нежный зверь%27 _ На гитаре + разбор _ Ноты Табы.mp4'},
  {'icon': iconImage, 'title': 'Ваше Благородие ♫ Разбор Аккорды ♫ Как Играть На Гитаре Уроки Игры !', 'file': '../../../../../../../../D:/MUSIK/Akk/Ваше благородие ♫ РАЗБОР АККОРДЫ ♫ Как играть на гитаре - уроки игры !.webm'},
  {'icon': iconImage, 'title': 'Гже Же Ты Разбор Соло Тональность ( Dm ) Как Играть На Гитаре Песню', 'file': '../../../../../../../../D:/MUSIK/Akk/Гже же ты - РАЗБОР СОЛО - Тональность ( Dm ) Как играть на гитаре песню.mp4'},
  {'icon': iconImage, 'title': 'Гори Огонь Гори', 'file': '../../../../../../../../D:/MUSIK/Akk/гори огонь гори.mp4'},
  {'icon': iconImage, 'title': 'Гудбай Америка', 'file': '../../../../../../../../D:/MUSIK/Akk/Гудбай, Америка.mp4'},
  {'icon': iconImage, 'title': 'Если Б Не Было Тебя Соло На Гитаре(разбор) Тональность ( Нm )', 'file': '../../../../../../../../D:/MUSIK/Akk/Если б не было тебя - Соло на гитаре(разбор) Тональность ( Нm ).mp4'},
  {'icon': iconImage, 'title': 'Жмурки На Гитаре Из Фильма', 'file': '../../../../../../../../D:/MUSIK/Akk/Жмурки - на гитаре из фильма.mp4'},
  {'icon': iconImage, 'title': 'Иерусалим Разбор Вступления И Бой На Гитаре', 'file': '../../../../../../../../D:/MUSIK/Akk/Иерусалим - Разбор Вступления и Бой на гитаре.mp4'},
  {'icon': iconImage, 'title': 'Кончится Лето2', 'file': '../../../../../../../../D:/MUSIK/Akk/Кончится лето2.mp4'},
  {'icon': iconImage, 'title': 'Конь Тональность (hm) Песни Под Гитару', 'file': '../../../../../../../../D:/MUSIK/Akk/Конь Тональность (Hm) Песни под гитару.mp4'},
  {'icon': iconImage, 'title': 'Корабли', 'file': '../../../../../../../../D:/MUSIK/Akk/Корабли.mp4'},
  {'icon': iconImage, 'title': 'Легенда (1988)', 'file': '../../../../../../../../D:/MUSIK/Akk/Легенда (1988).mp4'},
  {'icon': iconImage, 'title': 'Мексиканский Бой На Гитаре', 'file': '../../../../../../../../D:/MUSIK/Akk/Мексиканский Бой на гитаре.mp4'},
  {'icon': iconImage, 'title': 'Мой Рок Н Ролл Разбор Corus Guitar Guide #77', 'file': '../../../../../../../../D:/MUSIK/Akk/Мой рок-н-ролл - Разбор COrus Guitar Guide #77.webm'},
  {'icon': iconImage, 'title': 'Мы Как Трепетные Птицы Аккорды Обучение На Гитаре ', 'file': '../../../../../../../../D:/MUSIK/Akk/Мы, как трепетные птицы аккорды, обучение на гитаре..mp4'},
  {'icon': iconImage, 'title': 'Непогода Песня Из К Ф Мэри Поппинс До Свидания Как Играть На Гитаре Песню', 'file': '../../../../../../../../D:/MUSIK/Akk/Непогода - Песня из к_ф Мэри Поппинс, до свидания - Как играть на гитаре песню.mp4'},
  {'icon': iconImage, 'title': 'Ночная Дорога Ст Ю Визбор Муз С Никитин И В Берковский', 'file': '../../../../../../../../D:/MUSIK/Akk/Ночная дорога - ст. Ю.Визбор, муз. С.Никитин и В.Берковский.mp4'},
  {'icon': iconImage, 'title': 'Она', 'file': '../../../../../../../../D:/MUSIK/Akk/Она.mp4'},
  {'icon': iconImage, 'title': 'От Кореи До Карелии Акк', 'file': '../../../../../../../../D:/MUSIK/Akk/От Кореи до Карелии аКК.mp4'},
  {'icon': iconImage, 'title': 'Охота На Волков Аккорды Высоцкого', 'file': '../../../../../../../../D:/MUSIK/Akk/Охота на волков. Аккорды Высоцкого.mp4'},
  {'icon': iconImage, 'title': 'Переведи Меня Через Майдан', 'file': '../../../../../../../../D:/MUSIK/Akk/Переведи меня через майдан.mp4'},
  {'icon': iconImage, 'title': 'Переведи Меня Через Майдан Тональность ( Еm ) Как Играть На Гитаре Песню', 'file': '../../../../../../../../D:/MUSIK/Akk/Переведи меня через майдан Тональность ( Еm ) Как играть на гитаре песню.mp4'},
  {'icon': iconImage, 'title': 'Перемен Кино (аккорды На Гитаре) Играй Как Бенедикт! Выпуск №68', 'file': '../../../../../../../../D:/MUSIK/Akk/ПЕРЕМЕН - КИНО (аккорды на гитаре) Играй, как Бенедикт! Выпуск №68.webm'},
  {'icon': iconImage, 'title': 'Песня Красной Шапочки(бегемотыкрокодилы) Guitar Cover Garri Pat', 'file': '../../../../../../../../D:/MUSIK/Akk/Песня красной шапочки(Бегемоты,Крокодилы)- guitar Cover Garri Pat.mp4'},
  {'icon': iconImage, 'title': 'Под Музыку Вивальди', 'file': '../../../../../../../../D:/MUSIK/Akk/Под музыку Вивальди.mp4'},
  {'icon': iconImage, 'title': 'Пока Горит Свеча А Макаревич (cover)', 'file': '../../../../../../../../D:/MUSIK/Akk/Пока горит свеча А. Макаревич (cover).mp4'},
  {'icon': iconImage, 'title': 'Полковнику Никто Не Пишет Тональность ( Gm ) Как Играть На Гитаре Песню', 'file': '../../../../../../../../D:/MUSIK/Akk/Полковнику никто не пишет Тональность ( Gm ) Как играть на гитаре песню.mp4'},
  {'icon': iconImage, 'title': 'Популярные Песни На Фортепиано В Обр А Дзарковски (dzarkovsky) Попурри На Пианино', 'file': '../../../../../../../../D:/MUSIK/Akk/Популярные песни на фортепиано в обр. А. Дзарковски (Dzarkovsky)  Попурри на пианино.mp4'},
  {'icon': iconImage, 'title': 'Последняя Поэма', 'file': '../../../../../../../../D:/MUSIK/Akk/Последняя поэма.mp4'},
  {'icon': iconImage, 'title': 'Последняя Поэма Из К Ф Вам И Не Снилось Fingerstyle Cover', 'file': '../../../../../../../../D:/MUSIK/Akk/Последняя поэма из к_ф %27Вам и не снилось%27 _ Fingerstyle cover.mp4'},
  {'icon': iconImage, 'title': 'Послепобедный Вальс А Я Розенбаум', 'file': '../../../../../../../../D:/MUSIK/Akk/Послепобедный вальс  А.Я. Розенбаум.mp4'},
  {'icon': iconImage, 'title': 'Послепобедный Вальс А Я Розенбаум', 'file': '../../../../../../../../D:/MUSIK/Akk/Послепобедный вальс - А.Я. Розенбаум.mp4'},
  {'icon': iconImage, 'title': 'Просто Взорвал Интернет Самая Сложная Песня На Гитаре!', 'file': '../../../../../../../../D:/MUSIK/Akk/Просто взорвал интернет самая сложная песня на гитаре!.mp4'},
  {'icon': iconImage, 'title': 'Расстреляли Рассветами', 'file': '../../../../../../../../D:/MUSIK/Akk/Расстреляли рассветами.mp4'},
  {'icon': iconImage, 'title': 'Сергей Маврин Кровь За Кровь(ария) Фрагмент 2020', 'file': '../../../../../../../../D:/MUSIK/Akk/Сергей Маврин - %27Кровь за кровь%27(Ария). Фрагмент. 2020.mp4'},
  {'icon': iconImage, 'title': 'Сказка', 'file': '../../../../../../../../D:/MUSIK/Akk/Сказка.mp4'},
  {'icon': iconImage, 'title': 'Скромный Настройщик Самоучка В Магазине Музыкальных Инструментов', 'file': '../../../../../../../../D:/MUSIK/Akk/Скромный настройщик-самоучка в магазине музыкальных инструментов.webm'},
  {'icon': iconImage, 'title': 'Следствие Ведут Колобки Fingerstyle Cover', 'file': '../../../../../../../../D:/MUSIK/Akk/Следствие ведут Колобки _ Fingerstyle cover.mp4'},
  {'icon': iconImage, 'title': 'Следствие Ведут Колобки Guitar Cover Garri Pat', 'file': '../../../../../../../../D:/MUSIK/Akk/Следствие ведут КОЛОБКИ- guitar Cover Garri Pat.mp4'},
  {'icon': iconImage, 'title': 'Спокойная Ночь', 'file': '../../../../../../../../D:/MUSIK/Akk/Спокойная ночь.mp4'},
  {'icon': iconImage, 'title': 'Три Лучших Гитариста В Мире 2012 Года', 'file': '../../../../../../../../D:/MUSIK/Akk/Три лучших гитариста в мире 2012 года.mp4'},
  {'icon': iconImage, 'title': 'Человек И Кошка Гитара', 'file': '../../../../../../../../D:/MUSIK/Akk/Человек и кошка. Гитара.mp4'},
  {'icon': iconImage, 'title': 'Человек И Кошка Ноль Как Играть На Гитаре (3 Партии) Табы Аккорды Гитарин', 'file': '../../../../../../../../D:/MUSIK/Akk/Человек и кошка - НОЛЬ   Как играть на гитаре (3 партии)  Табы, аккорды - Гитарин.mp4'},
  {'icon': iconImage, 'title': 'Чтоб Ветра Тебя Сынок Знали(разборка) А Я Розенбаум', 'file': '../../../../../../../../D:/MUSIK/Akk/Чтоб ветра тебя сынок знали(разборка), А.Я. Розенбаум.webm'},
  {'icon': iconImage, 'title': 'Этот Гитарист Точно Вошел В Историю Голоса', 'file': '../../../../../../../../D:/MUSIK/Akk/Этот гитарист точно вошел в историю Голоса.mp4'},
  {'icon': iconImage, 'title': 'Я Свободен Соло На Электрогитаре', 'file': '../../../../../../../../D:/MUSIK/Akk/Я СВОБОДЕН соло на электрогитаре.mp4'},
  {'icon': iconImage, 'title': 'Я Так Соскучился', 'file': '../../../../../../../../D:/MUSIK/Akk/Я так соскучился.mp4'},
]);
})

document.getElementById('akvarium').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Finalis Jutto', 'file': '../../../../../../../../D:/MUSIK/Akvarium/1997 - Рапсодия для воды/Finalis Jutto.mp3'},
  {'icon': iconImage, 'title': 'Город', 'file': '../../../../../../../../D:/MUSIK/Akvarium/2003 - БГ 50/Город.mp3'},
  {'icon': iconImage, 'title': 'Здравствуй Моя Смерть', 'file': '../../../../../../../../D:/MUSIK/Akvarium/1984 - День серебра/Здравствуй моя Смерть.mp3'},
  {'icon': iconImage, 'title': 'Лейса Песня На Просторе', 'file': '../../../../../../../../D:/MUSIK/Akvarium/1996 - Двадцать лет спустя/Лейса песня на просторе.mp3'},
  {'icon': iconImage, 'title': 'Не Пей Вина Гертруда', 'file': '../../../../../../../../D:/MUSIK/Akvarium/2000 - Территория/Не Пей Вина Гертруда.mp3'},
  {'icon': iconImage, 'title': 'Пока Горит Свеча', 'file': '../../../../../../../../D:/MUSIK/Akvarium/1996 - Двадцать лет спустя/Пока горит свеча.mp3'},
  {'icon': iconImage, 'title': 'Русская Нирвана', 'file': '../../../../../../../../D:/MUSIK/Akvarium/1994 - КОСТРОМА MON AMOUR/Русская Нирвана.mp3'},
  {'icon': iconImage, 'title': 'Серебро Господа', 'file': '../../../../../../../../D:/MUSIK/Akvarium/1997 - Рапсодия для воды/Серебро Господа.mp3'},
  {'icon': iconImage, 'title': 'Электричество', 'file': '../../../../../../../../D:/MUSIK/Akvarium/1984 - День серебра/Электричество.mp3'},
]);
})

document.getElementById('alla').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Can No Laditi', 'file': '../../../../../../../../D:/MUSIK/ALLA/Не делайте мне больно, господа/Can No Laditi.mp3'},
  {'icon': iconImage, 'title': 'А Знаешь Все Еще Будет', 'file': '../../../../../../../../D:/MUSIK/ALLA/На дороге ожиданий/А знаешь, все еще будет.WAV'},
  {'icon': iconImage, 'title': 'А Я В Воду Войду', 'file': '../../../../../../../../D:/MUSIK/ALLA/Да!/А я в воду войду.WAV'},
  {'icon': iconImage, 'title': 'Автомобиль', 'file': '../../../../../../../../D:/MUSIK/ALLA/Ах, как хочется жить!/Автомобиль.WAV'},
  {'icon': iconImage, 'title': 'Айсберг', 'file': '../../../../../../../../D:/MUSIK/ALLA/По острым иглам яркого огня/Айсберг.WAV'},
  {'icon': iconImage, 'title': 'Арлекино', 'file': '../../../../../../../../D:/MUSIK/ALLA/По острым иглам яркого огня/Арлекино.mp3'},
  {'icon': iconImage, 'title': 'Ах Как Живется Мне Сегодня!', 'file': '../../../../../../../../D:/MUSIK/ALLA/Не делайте мне больно, господа/Ах, как живется мне сегодня!.mp3'},
  {'icon': iconImage, 'title': 'Балет', 'file': '../../../../../../../../D:/MUSIK/ALLA/На дороге ожиданий/Балет.WAV'},
  {'icon': iconImage, 'title': 'Бежала Голову Сломя', 'file': '../../../../../../../../D:/MUSIK/ALLA/Не делайте мне больно, господа/Бежала голову сломя.mp3'},
  {'icon': iconImage, 'title': 'Без Меня', 'file': '../../../../../../../../D:/MUSIK/ALLA/По острым иглам яркого огня/Без меня.WAV'},
  {'icon': iconImage, 'title': 'Бессонница', 'file': '../../../../../../../../D:/MUSIK/ALLA/Не делайте мне больно, господа/Бессонница.mp3'},
  {'icon': iconImage, 'title': 'Близкие Люди', 'file': '../../../../../../../../D:/MUSIK/ALLA/Билет на вчерашний спектакль/Близкие люди.WAV'},
  {'icon': iconImage, 'title': 'Бог С Тобой', 'file': '../../../../../../../../D:/MUSIK/ALLA/Встречи в пути/Бог с тобой.WAV'},
  {'icon': iconImage, 'title': 'Большак', 'file': '../../../../../../../../D:/MUSIK/ALLA/Не делайте мне больно, господа/Большак.mp3'},
  {'icon': iconImage, 'title': 'В Петербурге Гроза', 'file': '../../../../../../../../D:/MUSIK/ALLA/Да!/В Петербурге гроза.WAV'},
  {'icon': iconImage, 'title': 'Волшебник', 'file': '../../../../../../../../D:/MUSIK/ALLA/По острым иглам яркого огня/Волшебник.WAV'},
  {'icon': iconImage, 'title': 'Все Могут Короли', 'file': '../../../../../../../../D:/MUSIK/ALLA/По острым иглам яркого огня/Все могут короли.WAV'},
  {'icon': iconImage, 'title': 'Встреча В Пути', 'file': '../../../../../../../../D:/MUSIK/ALLA/Встречи в пути/Встреча в пути.WAV'},
  {'icon': iconImage, 'title': 'Голубь Сизокрылый', 'file': '../../../../../../../../D:/MUSIK/ALLA/Встречи в пути/Голубь сизокрылый.WAV'},
  {'icon': iconImage, 'title': 'Гонка', 'file': '../../../../../../../../D:/MUSIK/ALLA/Только в кино/Гонка.WAV'},
  {'icon': iconImage, 'title': 'Грабитель', 'file': '../../../../../../../../D:/MUSIK/ALLA/Не делайте мне больно, господа/Грабитель.mp3'},
  {'icon': iconImage, 'title': 'Две Звезды', 'file': '../../../../../../../../D:/MUSIK/ALLA/Билет на вчерашний спектакль/Две звезды.WAV'},
  {'icon': iconImage, 'title': 'Две Рюмки', 'file': '../../../../../../../../D:/MUSIK/ALLA/Не делайте мне больно, господа/Две рюмки.mp3'},
  {'icon': iconImage, 'title': 'Делу Время', 'file': '../../../../../../../../D:/MUSIK/ALLA/По острым иглам яркого огня/Делу время.WAV'},
  {'icon': iconImage, 'title': 'И Зимой И Летом', 'file': '../../../../../../../../D:/MUSIK/ALLA/Ах, как хочется жить!/И зимой и летом.mp3'},
  {'icon': iconImage, 'title': 'Как Тревожен Этот Путь', 'file': '../../../../../../../../D:/MUSIK/ALLA/И в этом вся моя печаль/Как тревожен этот путь.WAV'},
  {'icon': iconImage, 'title': 'Когда Я Буду Бабушкой', 'file': '../../../../../../../../D:/MUSIK/ALLA/Песни на бис/Когда я буду бабушкой.WAV'},
  {'icon': iconImage, 'title': 'Колдун', 'file': '../../../../../../../../D:/MUSIK/ALLA/Не делайте мне больно, господа/Колдун.mp3'},
  {'icon': iconImage, 'title': 'Коралловые Бусы', 'file': '../../../../../../../../D:/MUSIK/ALLA/На дороге ожиданий/Коралловые бусы.WAV'},
  {'icon': iconImage, 'title': 'Королева', 'file': '../../../../../../../../D:/MUSIK/ALLA/Размышления у камина/Королева.WAV'},
  {'icon': iconImage, 'title': 'Куда Все Уходят', 'file': '../../../../../../../../D:/MUSIK/ALLA/Не делайте мне больно, господа/Куда все уходят.mp3'},
  {'icon': iconImage, 'title': 'Любовь Похожая На Сон', 'file': '../../../../../../../../D:/MUSIK/ALLA/Не делайте мне больно, господа/Любовь, похожая на сон.mp3'},
  {'icon': iconImage, 'title': 'Мал Помалу', 'file': '../../../../../../../../D:/MUSIK/ALLA/Да!/Мал-помалу.WAV'},
  {'icon': iconImage, 'title': 'Между Небом И Землей', 'file': '../../../../../../../../D:/MUSIK/ALLA/Встречи в пути/Между небом и землей.WAV'},
  {'icon': iconImage, 'title': 'Миллион Алых Роз', 'file': '../../../../../../../../D:/MUSIK/ALLA/По острым иглам яркого огня/Миллион алых роз.WAV'},
  {'icon': iconImage, 'title': 'Милый Мой', 'file': '../../../../../../../../D:/MUSIK/ALLA/Ах, как хочется жить!/Милый мой.WAV'},
  {'icon': iconImage, 'title': 'Мимоходом', 'file': '../../../../../../../../D:/MUSIK/ALLA/Это завтра, а сегодня/Мимоходом.WAV'},
  {'icon': iconImage, 'title': 'Мэри', 'file': '../../../../../../../../D:/MUSIK/ALLA/Не делайте мне больно, господа/Мэри.mp3'},
  {'icon': iconImage, 'title': 'Надо Же', 'file': '../../../../../../../../D:/MUSIK/ALLA/Билет на вчерашний спектакль/Надо же.WAV'},
  {'icon': iconImage, 'title': 'Настоящий Полковник', 'file': '../../../../../../../../D:/MUSIK/ALLA/Не делайте мне больно, господа/Настоящий полковник.mp3'},
  {'icon': iconImage, 'title': 'Не Делайте Мне Больно Господа', 'file': '../../../../../../../../D:/MUSIK/ALLA/Не делайте мне больно, господа/Не делайте мне больно, господа.mp3'},
  {'icon': iconImage, 'title': 'Не Отрекаются Любя', 'file': '../../../../../../../../D:/MUSIK/ALLA/По острым иглам яркого огня/Не отрекаются любя.WAV'},
  {'icon': iconImage, 'title': 'Непогода', 'file': '../../../../../../../../D:/MUSIK/ALLA/Непогода.mp3'},
  {'icon': iconImage, 'title': 'Непогода', 'file': '../../../../../../../../D:/MUSIK/ALLA/Непогода.mp4'},
  {'icon': iconImage, 'title': 'О Любви Не Говори', 'file': '../../../../../../../../D:/MUSIK/ALLA/Только в кино/О любви не говори.WAV'},
  {'icon': iconImage, 'title': 'Озеро Надежды', 'file': '../../../../../../../../D:/MUSIK/ALLA/Встречи в пути/Озеро надежды.WAV'},
  {'icon': iconImage, 'title': 'Осенний Поцелуй', 'file': '../../../../../../../../D:/MUSIK/ALLA/Размышления у камина/Осенний поцелуй.WAV'},
  {'icon': iconImage, 'title': 'Паромщик', 'file': '../../../../../../../../D:/MUSIK/ALLA/По острым иглам яркого огня/Паромщик.WAV'},
  {'icon': iconImage, 'title': 'Песенка Первоклассника', 'file': '../../../../../../../../D:/MUSIK/ALLA/По острым иглам яркого огня/Песенка первоклассника.WAV'},
  {'icon': iconImage, 'title': 'Песенка Про Меня', 'file': '../../../../../../../../D:/MUSIK/ALLA/По острым иглам яркого огня/Песенка про меня.WAV'},
  {'icon': iconImage, 'title': 'Позови Меня С Собой', 'file': '../../../../../../../../D:/MUSIK/ALLA/Да!/Позови меня с собой.WAV'},
  {'icon': iconImage, 'title': 'Пригласите Танцевать', 'file': '../../../../../../../../D:/MUSIK/ALLA/Встречи в пути/Пригласите танцевать.WAV'},
  {'icon': iconImage, 'title': 'Придумай Что Нибудь', 'file': '../../../../../../../../D:/MUSIK/ALLA/Встречи в пути/Придумай что-нибудь.WAV'},
  {'icon': iconImage, 'title': 'Примадонна', 'file': '../../../../../../../../D:/MUSIK/ALLA/Да!/Примадонна.WAV'},
  {'icon': iconImage, 'title': 'Примадонна (фрн )', 'file': '../../../../../../../../D:/MUSIK/ALLA/Да!/Примадонна (фрн.).WAV'},
  {'icon': iconImage, 'title': 'Пришла И Говорю', 'file': '../../../../../../../../D:/MUSIK/ALLA/Только в кино/Пришла и говорю.WAV'},
  {'icon': iconImage, 'title': 'Про Любовь', 'file': '../../../../../../../../D:/MUSIK/ALLA/Барышня с крестьянской заставы/Про любовь.WAV'},
  {'icon': iconImage, 'title': 'Пропади Ты Пропадом', 'file': '../../../../../../../../D:/MUSIK/ALLA/Размышления у камина/Пропади ты пропадом.WAV'},
  {'icon': iconImage, 'title': 'Прости Поверь', 'file': '../../../../../../../../D:/MUSIK/ALLA/И в этом вся моя печаль/Прости, поверь.WAV'},
  {'icon': iconImage, 'title': 'Реквием', 'file': '../../../../../../../../D:/MUSIK/ALLA/Размышления у камина/Реквием.WAV'},
  {'icon': iconImage, 'title': 'Свирель', 'file': '../../../../../../../../D:/MUSIK/ALLA/Размышления у камина/Свирель.WAV'},
  {'icon': iconImage, 'title': 'Сильная Женщина', 'file': '../../../../../../../../D:/MUSIK/ALLA/Не делайте мне больно, господа/Сильная женщина.mp3'},
  {'icon': iconImage, 'title': 'Старинные Часы', 'file': '../../../../../../../../D:/MUSIK/ALLA/По острым иглам яркого огня/Старинные часы.WAV'},
  {'icon': iconImage, 'title': 'Сто Друзей', 'file': '../../../../../../../../D:/MUSIK/ALLA/Это завтра, а сегодня/Сто друзей.WAV'},
  {'icon': iconImage, 'title': 'Счастье', 'file': '../../../../../../../../D:/MUSIK/ALLA/Да!/Счастье.WAV'},
  {'icon': iconImage, 'title': 'Так Иди Же Сюда', 'file': '../../../../../../../../D:/MUSIK/ALLA/Не делайте мне больно, господа/Так иди же сюда.mp3'},
  {'icon': iconImage, 'title': 'Три Счастливых Дня', 'file': '../../../../../../../../D:/MUSIK/ALLA/Встречи в пути/Три счастливых дня.WAV'},
  {'icon': iconImage, 'title': 'Ты На Свете Есть', 'file': '../../../../../../../../D:/MUSIK/ALLA/На дороге ожиданий/Ты на свете есть.WAV'},
  {'icon': iconImage, 'title': 'Фотограф', 'file': '../../../../../../../../D:/MUSIK/ALLA/Встречи в пути/Фотограф.WAV'},
  {'icon': iconImage, 'title': 'Чао', 'file': '../../../../../../../../D:/MUSIK/ALLA/Билет на вчерашний спектакль/Чао.WAV'},
  {'icon': iconImage, 'title': 'Этот Мир', 'file': '../../../../../../../../D:/MUSIK/ALLA/Ах, как хочется жить!/Этот мир.mp3'},
  {'icon': iconImage, 'title': 'Я Больше Не Ревную', 'file': '../../../../../../../../D:/MUSIK/ALLA/И в этом вся моя печаль/Я больше не ревную.WAV'},
  {'icon': iconImage, 'title': 'Я Тебя Никому Не Отдам', 'file': '../../../../../../../../D:/MUSIK/ALLA/Не делайте мне больно, господа/Я тебя никому не отдам.mp3'},
  {'icon': iconImage, 'title': 'Я Тебя Поцеловала', 'file': '../../../../../../../../D:/MUSIK/ALLA/Это завтра, а сегодня/Я тебя поцеловала.WAV'},
]);
})

document.getElementById('aqua').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Barbie Girl', 'file': '../../../../../../../../D:/MUSIK/Aqua/Barbie girl.mp3'},
  {'icon': iconImage, 'title': 'Cartoon Heroes', 'file': '../../../../../../../../D:/MUSIK/Aqua/Cartoon heroes.mp3'},
  {'icon': iconImage, 'title': 'My Oh My', 'file': '../../../../../../../../D:/MUSIK/Aqua/My oh my.mp3'},
  {'icon': iconImage, 'title': 'Turn Back Time', 'file': '../../../../../../../../D:/MUSIK/Aqua/Turn Back Time.mp3'},
]);
})

document.getElementById('avrillavign').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Complicated', 'file': '../../../../../../../../D:/MUSIK/Avril Lavign/2002 - Complicated/Complicated.mp3'},
  {'icon': iconImage, 'title': 'Dont Tell Me', 'file': '../../../../../../../../D:/MUSIK/Avril Lavign/2004 - Don%27t Tell Me/Don%27t Tell Me.mp3'},
  {'icon': iconImage, 'title': 'Get Over It', 'file': '../../../../../../../../D:/MUSIK/Avril Lavign/2002 - Sk8er Boi/Get Over It.mp3'},
  {'icon': iconImage, 'title': 'Girlfriend', 'file': '../../../../../../../../D:/MUSIK/Avril Lavign/2007 - Girlfriend/Girlfriend.mp3'},
  {'icon': iconImage, 'title': 'He Wasnt (live)', 'file': '../../../../../../../../D:/MUSIK/Avril Lavign/2004 - Under My Skin/He Wasn%27t (Live).mp3'},
  {'icon': iconImage, 'title': 'I Always Get What I Want', 'file': '../../../../../../../../D:/MUSIK/Avril Lavign/2004 - Nobody%27s Home/I Always Get What I Want.mp3'},
  {'icon': iconImage, 'title': 'Im With You', 'file': '../../../../../../../../D:/MUSIK/Avril Lavign/2002 - I%27m With You/I%27m With You.mp3'},
  {'icon': iconImage, 'title': 'Imagine', 'file': '../../../../../../../../D:/MUSIK/Avril Lavign/2009 - iTunes Essentials/Imagine.mp3'},
  {'icon': iconImage, 'title': 'Keep Holding On', 'file': '../../../../../../../../D:/MUSIK/Avril Lavign/2006 - Keep Holding On/Keep Holding On.mp3'},
  {'icon': iconImage, 'title': 'Knockin On Heavens Door', 'file': '../../../../../../../../D:/MUSIK/Avril Lavign/2004 - Nobody%27s Home/Knockin%27  On  Heaven%27s Door.mp3'},
  {'icon': iconImage, 'title': 'Losing Grip', 'file': '../../../../../../../../D:/MUSIK/Avril Lavign/2002 - Let Go/Losing Grip.mp3'},
  {'icon': iconImage, 'title': 'Losing Grip (live)', 'file': '../../../../../../../../D:/MUSIK/Avril Lavign/2002 - Let Go/Losing Grip (Live).mp3'},
  {'icon': iconImage, 'title': 'My Happy Ending', 'file': '../../../../../../../../D:/MUSIK/Avril Lavign/2004 - My Happy Ending/My Happy Ending.mp3'},
  {'icon': iconImage, 'title': 'Nobodys Home', 'file': '../../../../../../../../D:/MUSIK/Avril Lavign/2004 - Nobody%27s Home/Nobody%27s Home.mp3'},
  {'icon': iconImage, 'title': 'Skater Boy', 'file': '../../../../../../../../D:/MUSIK/Avril Lavign/2002 - Sk8er Boi/Skater Boy.mp3'},
  {'icon': iconImage, 'title': 'Take Me Away', 'file': '../../../../../../../../D:/MUSIK/Avril Lavign/2004 - Don%27t Tell Me/Take Me Away.mp3'},
  {'icon': iconImage, 'title': 'Things Ill Never Say', 'file': '../../../../../../../../D:/MUSIK/Avril Lavign/2009 - iTunes Essentials/Things I%27ll Never Say.mp3'},
  {'icon': iconImage, 'title': 'When Youre Gone', 'file': '../../../../../../../../D:/MUSIK/Avril Lavign/2007 - When You%27re Gone/When You%27re Gone.mp3'},
  {'icon': iconImage, 'title': 'Why', 'file': '../../../../../../../../D:/MUSIK/Avril Lavign/2002 - Complicated/Why.mp3'},
]);
})

document.getElementById('beatles').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A Hard Days Night', 'file': '../../../../../../../../D:/MUSIK/Beatles/1964 - A Hard Days Night/A Hard Day%27s Night.mp3'},
  {'icon': iconImage, 'title': 'All My Loving', 'file': '../../../../../../../../D:/MUSIK/Beatles/1963 - With The Beatles/All My Loving.mp3'},
  {'icon': iconImage, 'title': 'All You Need Is Love', 'file': '../../../../../../../../D:/MUSIK/Beatles/1967 - Magical Mystery Tour/All You Need Is Love.mp3'},
  {'icon': iconImage, 'title': 'Another Girl', 'file': '../../../../../../../../D:/MUSIK/Beatles/1965 - Help/Another Girl.mp3'},
  {'icon': iconImage, 'title': 'Any Time At All', 'file': '../../../../../../../../D:/MUSIK/Beatles/1964 - A Hard Days Night/Any Time At All.mp3'},
  {'icon': iconImage, 'title': 'Babys In Black', 'file': '../../../../../../../../D:/MUSIK/Beatles/1964 - Beatles For Sale/Baby%27s In Black.mp3'},
  {'icon': iconImage, 'title': 'Back In The Ussr', 'file': '../../../../../../../../D:/MUSIK/Beatles/1968 - White Album CD 1/Back in the USSR.mp3'},
  {'icon': iconImage, 'title': 'Cant Buy Me Love', 'file': '../../../../../../../../D:/MUSIK/Beatles/1964 - A Hard Days Night/Can%27t Buy Me Love.mp3'},
  {'icon': iconImage, 'title': 'Carry That Weight', 'file': '../../../../../../../../D:/MUSIK/Beatles/1969 - Abbey Road/Carry That Weight.mp3'},
  {'icon': iconImage, 'title': 'Devil In Her Heart', 'file': '../../../../../../../../D:/MUSIK/Beatles/1963 - With The Beatles/Devil In Her Heart.mp3'},
  {'icon': iconImage, 'title': 'Dizzy Miss Lizzie', 'file': '../../../../../../../../D:/MUSIK/Beatles/1965 - Help/Dizzy Miss Lizzie.mp3'},
  {'icon': iconImage, 'title': 'Do You Want To Know A Secret', 'file': '../../../../../../../../D:/MUSIK/Beatles/1963 - Please Please Me/Do You Want To Know A Secret.mp3'},
  {'icon': iconImage, 'title': 'Drive My Car', 'file': '../../../../../../../../D:/MUSIK/Beatles/1965 - Rubber Soul/Drive My Car.mp3'},
  {'icon': iconImage, 'title': 'Eight Days A Week', 'file': '../../../../../../../../D:/MUSIK/Beatles/1964 - Beatles For Sale/Eight Days A Week.mp3'},
  {'icon': iconImage, 'title': 'Eleanor Rigby', 'file': '../../../../../../../../D:/MUSIK/Beatles/1966 - Revolver/Eleanor Rigby.mp3'},
  {'icon': iconImage, 'title': 'For No One', 'file': '../../../../../../../../D:/MUSIK/Beatles/1966 - Revolver/For No One.mp3'},
  {'icon': iconImage, 'title': 'Girl', 'file': '../../../../../../../../D:/MUSIK/Beatles/1965 - Rubber Soul/Girl.mp3'},
  {'icon': iconImage, 'title': 'Good Day Sunshine', 'file': '../../../../../../../../D:/MUSIK/Beatles/1966 - Revolver/Good Day Sunshine.mp3'},
  {'icon': iconImage, 'title': 'Help!', 'file': '../../../../../../../../D:/MUSIK/Beatles/Help!.mp4'},
  {'icon': iconImage, 'title': 'Help!', 'file': '../../../../../../../../D:/MUSIK/Beatles/1965 - Help/Help!.mp3'},
  {'icon': iconImage, 'title': 'Here Comes The Sun', 'file': '../../../../../../../../D:/MUSIK/Beatles/1969 - Abbey Road/Here Comes The Sun.mp3'},
  {'icon': iconImage, 'title': 'I Dont Want To Spoil The Part', 'file': '../../../../../../../../D:/MUSIK/Beatles/1964 - Beatles For Sale/I Don%27t Want To Spoil The Part.mp3'},
  {'icon': iconImage, 'title': 'I Me Mine', 'file': '../../../../../../../../D:/MUSIK/Beatles/1970 - Let It Be/I Me Mine.mp3'},
  {'icon': iconImage, 'title': 'I Need You', 'file': '../../../../../../../../D:/MUSIK/Beatles/1965 - Help/I Need You.mp3'},
  {'icon': iconImage, 'title': 'I Need You', 'file': '../../../../../../../../D:/MUSIK/Beatles/I Need You.mp4'},
  {'icon': iconImage, 'title': 'I Should Have Known Better', 'file': '../../../../../../../../D:/MUSIK/Beatles/1964 - A Hard Days Night/I Should Have Known Better.mp3'},
  {'icon': iconImage, 'title': 'I Want To Tell You', 'file': '../../../../../../../../D:/MUSIK/Beatles/1966 - Revolver/I Want To Tell You.mp3'},
  {'icon': iconImage, 'title': 'I Want You', 'file': '../../../../../../../../D:/MUSIK/Beatles/1969 - Abbey Road/I Want You.mp3'},
  {'icon': iconImage, 'title': 'Im Happy Just To Dance With You', 'file': '../../../../../../../../D:/MUSIK/Beatles/1964 - A Hard Days Night/I%27m Happy Just To Dance With You.mp3'},
  {'icon': iconImage, 'title': 'It Wont Be Long', 'file': '../../../../../../../../D:/MUSIK/Beatles/1963 - With The Beatles/It Won%27t Be Long.mp3'},
  {'icon': iconImage, 'title': 'Its Only Love', 'file': '../../../../../../../../D:/MUSIK/Beatles/1965 - Help/It%27s Only Love.mp3'},
  {'icon': iconImage, 'title': 'Ive Got A Feeling', 'file': '../../../../../../../../D:/MUSIK/Beatles/1970 - Let It Be/I%27ve Got A Feeling.mp3'},
  {'icon': iconImage, 'title': 'Ive Just Seen A Face', 'file': '../../../../../../../../D:/MUSIK/Beatles/1965 - Help/I%27ve Just Seen A Face.mp3'},
  {'icon': iconImage, 'title': 'Let It Be', 'file': '../../../../../../../../D:/MUSIK/Beatles/1970 - Let It Be/Let It Be.mp3'},
  {'icon': iconImage, 'title': 'Maxwells Silver Hammer', 'file': '../../../../../../../../D:/MUSIK/Beatles/1969 - Abbey Road/Maxwell%27s Silver Hammer.mp3'},
  {'icon': iconImage, 'title': 'Michelle', 'file': '../../../../../../../../D:/MUSIK/Beatles/1965 - Rubber Soul/Michelle.mp3'},
  {'icon': iconImage, 'title': 'Misery', 'file': '../../../../../../../../D:/MUSIK/Beatles/1963 - Please Please Me/Misery.mp3'},
  {'icon': iconImage, 'title': 'No Reply', 'file': '../../../../../../../../D:/MUSIK/Beatles/1964 - Beatles For Sale/No Reply.mp3'},
  {'icon': iconImage, 'title': 'Norwegian Wood', 'file': '../../../../../../../../D:/MUSIK/Beatles/1965 - Rubber Soul/Norwegian Wood.mp3'},
  {'icon': iconImage, 'title': 'Nowhere Man', 'file': '../../../../../../../../D:/MUSIK/Beatles/1965 - Rubber Soul/Nowhere Man.mp3'},
  {'icon': iconImage, 'title': 'Ob La Di Ob La Da', 'file': '../../../../../../../../D:/MUSIK/Beatles/1968 - White Album CD 1/Ob-La-Di, Ob-La-Da.mp3'},
  {'icon': iconImage, 'title': 'Octopuss Garden', 'file': '../../../../../../../../D:/MUSIK/Beatles/1969 - Abbey Road/Octopus%27s Garden.mp3'},
  {'icon': iconImage, 'title': 'Oh! Darling', 'file': '../../../../../../../../D:/MUSIK/Beatles/1969 - Abbey Road/Oh! Darling.mp3'},
  {'icon': iconImage, 'title': 'P S I Love You', 'file': '../../../../../../../../D:/MUSIK/Beatles/1963 - Please Please Me/P.S. I Love You.mp3'},
  {'icon': iconImage, 'title': 'Penny Lane', 'file': '../../../../../../../../D:/MUSIK/Beatles/1967 - Magical Mystery Tour/Penny Lane.mp3'},
  {'icon': iconImage, 'title': 'Rock And Roll Music', 'file': '../../../../../../../../D:/MUSIK/Beatles/1964 - Beatles For Sale/Rock And Roll Music.mp3'},
  {'icon': iconImage, 'title': 'Roll Over Beethoven', 'file': '../../../../../../../../D:/MUSIK/Beatles/1963 - With The Beatles/Roll Over Beethoven.mp3'},
  {'icon': iconImage, 'title': 'Something', 'file': '../../../../../../../../D:/MUSIK/Beatles/1969 - Abbey Road/Something.mp3'},
  {'icon': iconImage, 'title': 'Tell Me Why', 'file': '../../../../../../../../D:/MUSIK/Beatles/1964 - A Hard Days Night/Tell Me Why.mp3'},
  {'icon': iconImage, 'title': 'The Night Before', 'file': '../../../../../../../../D:/MUSIK/Beatles/1965 - Help/The Night Before.mp3'},
  {'icon': iconImage, 'title': 'Think For Yourself', 'file': '../../../../../../../../D:/MUSIK/Beatles/1965 - Rubber Soul/Think For Yourself.mp3'},
  {'icon': iconImage, 'title': 'Twist And Shout', 'file': '../../../../../../../../D:/MUSIK/Beatles/1963 - Please Please Me/Twist And Shout.mp3'},
  {'icon': iconImage, 'title': 'Wait', 'file': '../../../../../../../../D:/MUSIK/Beatles/1965 - Rubber Soul/Wait.mp3'},
  {'icon': iconImage, 'title': 'While My Guitar Gently Weeps', 'file': '../../../../../../../../D:/MUSIK/Beatles/1968 - White Album CD 1/While My Guitar Gently Weeps.mp3'},
  {'icon': iconImage, 'title': 'Yellow Submarine', 'file': '../../../../../../../../D:/MUSIK/Beatles/1969 - Yellow Submarine/Yellow Submarine.mp3'},
  {'icon': iconImage, 'title': 'Yesterday', 'file': '../../../../../../../../D:/MUSIK/Beatles/1965 - Help/Yesterday.mp3'},
  {'icon': iconImage, 'title': 'You Like Me Too Much', 'file': '../../../../../../../../D:/MUSIK/Beatles/1965 - Help/You Like Me Too Much.mp3'},
  {'icon': iconImage, 'title': 'You Wont See Me', 'file': '../../../../../../../../D:/MUSIK/Beatles/1965 - Rubber Soul/You Won%27t See Me.mp3'},
  {'icon': iconImage, 'title': 'Youre Going To Lose That Girl', 'file': '../../../../../../../../D:/MUSIK/Beatles/1965 - Help/You%27re Going to Lose that Girl.mp3'},
  {'icon': iconImage, 'title': 'Youve Got To Hide Your Love Away', 'file': '../../../../../../../../D:/MUSIK/Beatles/1965 - Help/You%27ve Got to Hide Your Love Away.mp3'},
]);
})

document.getElementById('blackmore%27snight').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Again Someday', 'file': '../../../../../../../../D:/MUSIK/Blackmore%27s Night/2001 - Fires At Midnight/Again Someday.mp3'},
  {'icon': iconImage, 'title': 'Home Again', 'file': '../../../../../../../../D:/MUSIK/Blackmore%27s Night/2001 - Fires At Midnight/Home Again.mp3'},
  {'icon': iconImage, 'title': 'Olde Mill Inn', 'file': '../../../../../../../../D:/MUSIK/Blackmore%27s Night/2006 - Village Lanterne/Olde Mill inn.mp3'},
  {'icon': iconImage, 'title': 'Olde Village Lanterne', 'file': '../../../../../../../../D:/MUSIK/Blackmore%27s Night/2006 - Village Lanterne/Olde Village Lanterne.mp3'},
  {'icon': iconImage, 'title': 'Possums Last Dance', 'file': '../../../../../../../../D:/MUSIK/Blackmore%27s Night/2001 - Fires At Midnight/Possum%27s Last Dance.mp3'},
  {'icon': iconImage, 'title': 'Spanish Nights', 'file': '../../../../../../../../D:/MUSIK/Blackmore%27s Night/1999 - Under A Violet Moon/Spanish Nights.mp3'},
  {'icon': iconImage, 'title': 'Street Of Dreams', 'file': '../../../../../../../../D:/MUSIK/Blackmore%27s Night/2006 - Village Lanterne/Street of Dreams.mp3'},
  {'icon': iconImage, 'title': 'The Times They Are A Changin', 'file': '../../../../../../../../D:/MUSIK/Blackmore%27s Night/2001 - Fires At Midnight/The Times They Are A Changin.mp3'},
  {'icon': iconImage, 'title': 'Wind In The Willows', 'file': '../../../../../../../../D:/MUSIK/Blackmore%27s Night/1999 - Under A Violet Moon/Wind In The Willows.mp3'},
  {'icon': iconImage, 'title': 'Wind In The Willows', 'file': '../../../../../../../../D:/MUSIK/Blackmore%27s Night/2003-The Best Of/Wind In The Willows.mp3'},
  {'icon': iconImage, 'title': 'Wish You Were Here', 'file': '../../../../../../../../D:/MUSIK/Blackmore%27s Night/1997 - Shadow of the moon/Wish You Were Here.mp3'},
  {'icon': iconImage, 'title': 'Wish You Where Here', 'file': '../../../../../../../../D:/MUSIK/Blackmore%27s Night/2003-The Best Of/Wish You Where Here.mp3'},
]);
})

document.getElementById('boneym').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Belfast', 'file': '../../../../../../../../D:/MUSIK/Boney M/1986.The Best Of 10 Years/Belfast.mp3'},
  {'icon': iconImage, 'title': 'Brown Girl In The Ring', 'file': '../../../../../../../../D:/MUSIK/Boney M/1992 - Gold/Brown Girl In The Ring.mp3'},
  {'icon': iconImage, 'title': 'Gotta Go Home', 'file': '../../../../../../../../D:/MUSIK/Boney M/1986.The Best Of 10 Years/Gotta Go Home.mp3'},
  {'icon': iconImage, 'title': 'Have You Ever Seen The Rain', 'file': '../../../../../../../../D:/MUSIK/Boney M/2007 - Love For Sale/Have You Ever Seen The Rain.mp3'},
  {'icon': iconImage, 'title': 'Hooray! Hooray! Its A Holi Holiday', 'file': '../../../../../../../../D:/MUSIK/Boney M/1986.The Best Of 10 Years/Hooray! Hooray! It%27s A Holi-Holiday.mp3'},
  {'icon': iconImage, 'title': 'Jingle Bells', 'file': '../../../../../../../../D:/MUSIK/Boney M/1986 - The 20 Greatest Christmas Songs/Jingle Bells.mp3'},
  {'icon': iconImage, 'title': 'No Woman No Cry', 'file': '../../../../../../../../D:/MUSIK/Boney M/2007 - Take The Heat Off Me/No Woman No Cry.mp3'},
  {'icon': iconImage, 'title': 'Rasputin', 'file': '../../../../../../../../D:/MUSIK/Boney M/1978 - Nightflight To Venus/Rasputin.mp3'},
  {'icon': iconImage, 'title': 'Rivers Of Babylon', 'file': '../../../../../../../../D:/MUSIK/Boney M/1986.The Best Of 10 Years/Rivers Of Babylon.mp3'},
  {'icon': iconImage, 'title': 'Somewhere In The World', 'file': '../../../../../../../../D:/MUSIK/Boney M/1981 - Boonoonoonoos/Somewhere In The World.mp3'},
  {'icon': iconImage, 'title': 'Sunny', 'file': '../../../../../../../../D:/MUSIK/Boney M/1976 - Take The Heat Off Me/Sunny.mp3'},
  {'icon': iconImage, 'title': 'We Kill The World', 'file': '../../../../../../../../D:/MUSIK/Boney M/1981 - Boonoonoonoos/We Kill The World.mp3'},
]);
})

document.getElementById('c.c.catch').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Are You Man Enough', 'file': '../../../../../../../../D:/MUSIK/C.C.Catch/1987 - Like A Hurricane/Are You Man Enough.mp3'},
  {'icon': iconImage, 'title': 'Backseat Of Your Cadillac', 'file': '../../../../../../../../D:/MUSIK/C.C.Catch/1988 - Big Fun/Backseat of Your Cadillac.mp3'},
  {'icon': iconImage, 'title': 'Cause You Are Young', 'file': '../../../../../../../../D:/MUSIK/C.C.Catch/1986 - Catch The Catch/Cause you are young.mp3'},
  {'icon': iconImage, 'title': 'Dont Shot My Sheriff Tonight', 'file': '../../../../../../../../D:/MUSIK/C.C.Catch/1988 - Big Fun/Don%27t Shot My Sheriff Tonight.mp3'},
  {'icon': iconImage, 'title': 'Fire Of Love', 'file': '../../../../../../../../D:/MUSIK/C.C.Catch/1988 - Big Fun/Fire of Love.mp3'},
  {'icon': iconImage, 'title': 'Good Guys Only Win In Movies', 'file': '../../../../../../../../D:/MUSIK/C.C.Catch/1987 - Like A Hurricane/Good Guys Only Win In Movies.mp3'},
  {'icon': iconImage, 'title': 'Heartbreak Hotel', 'file': '../../../../../../../../D:/MUSIK/C.C.Catch/1988 - Diamonds/Heartbreak Hotel.mp3'},
  {'icon': iconImage, 'title': 'Heaven And Hell', 'file': '../../../../../../../../D:/MUSIK/C.C.Catch/1986 - Welcome To The Heartbreak Hotel/Heaven and Hell.mp3'},
  {'icon': iconImage, 'title': 'Hollywood Nights', 'file': '../../../../../../../../D:/MUSIK/C.C.Catch/1988 - Diamonds/Hollywood Nights.mp3'},
  {'icon': iconImage, 'title': 'House Of Mystic Light', 'file': '../../../../../../../../D:/MUSIK/C.C.Catch/1988 - Diamonds/House Of Mystic Light.mp3'},
  {'icon': iconImage, 'title': 'I Can Loose My Heart Tonight', 'file': '../../../../../../../../D:/MUSIK/C.C.Catch/1988 - Diamonds/I Can Loose My Heart Tonight.mp3'},
  {'icon': iconImage, 'title': 'Jump In My Car', 'file': '../../../../../../../../D:/MUSIK/C.C.Catch/1986 - Catch The Catch/Jump In My Car.mp3'},
  {'icon': iconImage, 'title': 'Little By Little', 'file': '../../../../../../../../D:/MUSIK/C.C.Catch/1988 - Big Fun/Little By Little.mp3'},
  {'icon': iconImage, 'title': 'Megamix', 'file': '../../../../../../../../D:/MUSIK/C.C.Catch/1998 - Best Of`98/Megamix.mp3'},
  {'icon': iconImage, 'title': 'One Night Is Not Enough', 'file': '../../../../../../../../D:/MUSIK/C.C.Catch/1986 - Catch The Catch/One Night Is Not Enough.mp3'},
  {'icon': iconImage, 'title': 'Smoky Joes Cafe', 'file': '../../../../../../../../D:/MUSIK/C.C.Catch/1987 - Like A Hurricane/Smoky Joe%27s Cafe.mp3'},
  {'icon': iconImage, 'title': 'Soul Survivor', 'file': '../../../../../../../../D:/MUSIK/C.C.Catch/1987 - Like A Hurricane/Soul Survivor.mp3'},
  {'icon': iconImage, 'title': 'Strangers By Night', 'file': '../../../../../../../../D:/MUSIK/C.C.Catch/1986 - Catch The Catch/Strangers By Night.mp3'},
]);
})

document.getElementById('chrisnorman').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Dont Play Your Rock N Roll To Me', 'file': '../../../../../../../../D:/MUSIK/Chris Norman/disk 1 Smokie Years/Don%27t Play Your Rock %27n%27 Roll to Me.mp3'},
  {'icon': iconImage, 'title': 'Ill Meet You At Midnight', 'file': '../../../../../../../../D:/MUSIK/Chris Norman/disk 1 Smokie Years/I%27ll meet you at Midnight.mp3'},
  {'icon': iconImage, 'title': 'Midnight Lady', 'file': '../../../../../../../../D:/MUSIK/Chris Norman/Chris Norman THE HITS - From His Smokie And Solo Years[tfile.ru]/Midnight lady.mp3'},
  {'icon': iconImage, 'title': 'Some Hearts Are Diamonds', 'file': '../../../../../../../../D:/MUSIK/Chris Norman/disk 2 Solo Years/Some hearts are diamonds.mp3'},
  {'icon': iconImage, 'title': 'Stumblin In', 'file': '../../../../../../../../D:/MUSIK/Chris Norman/disk 1 Smokie Years/Stumblin%27 in.mp3'},
  {'icon': iconImage, 'title': 'What Can I Do', 'file': '../../../../../../../../D:/MUSIK/Chris Norman/What Can I Do.mp3'},
]);
})

document.getElementById('chrisrea').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'And You My Love', 'file': '../../../../../../../../D:/MUSIK/Chris Rea/1991 - Auberge/And You My Love.mp3'},
  {'icon': iconImage, 'title': 'Auberge', 'file': '../../../../../../../../D:/MUSIK/Chris Rea/1991 - Auberge/Auberge.mp3'},
  {'icon': iconImage, 'title': 'I Can Hear Your Heartbeat', 'file': '../../../../../../../../D:/MUSIK/Chris Rea/1988 - New Light Through Old Windows/I Can Hear Your Heartbeat.mp3'},
  {'icon': iconImage, 'title': 'I Just Wanna Be With You', 'file': '../../../../../../../../D:/MUSIK/Chris Rea/1989 - The Road To Hell/I Just Wanna Be With You.mp3'},
  {'icon': iconImage, 'title': 'Josephine', 'file': '../../../../../../../../D:/MUSIK/Chris Rea/1985 - Shamrock Diaries/Josephine.mp3'},
  {'icon': iconImage, 'title': 'Julia', 'file': '../../../../../../../../D:/MUSIK/Chris Rea/1994 - Espresso Logic/Julia.mp3'},
  {'icon': iconImage, 'title': 'Looking For The Summer', 'file': '../../../../../../../../D:/MUSIK/Chris Rea/1991 - Auberge/Looking For The Summer.mp3'},
  {'icon': iconImage, 'title': 'Sing A Song Of Love To Me', 'file': '../../../../../../../../D:/MUSIK/Chris Rea/1991 - Auberge/Sing A Song Of Love To Me.mp3'},
  {'icon': iconImage, 'title': 'The Road To Hell', 'file': '../../../../../../../../D:/MUSIK/Chris Rea/1989 - The Road To Hell/The Road to Hell.mp3'},
]);
})

document.getElementById('classics').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Allegro', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Vivaldi/Concerto in F minor, RV 297 Winter/Allegro.mp3'},
  {'icon': iconImage, 'title': 'Allegro', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Vivaldi/Concerto in C major, RV 180 Il Piacere/Allegro.mp3'},
  {'icon': iconImage, 'title': 'Allegro', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Vivaldi/Concerto in D minor, RV 242/Allegro.mp3'},
  {'icon': iconImage, 'title': 'Allegro', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Vivaldi/Concerto in G minor, RV 157/Allegro.mp3'},
  {'icon': iconImage, 'title': 'Allegro Molto', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Vivaldi/Concerto a 6 in A minor RV 523/Allegro molto.mp3'},
  {'icon': iconImage, 'title': 'Allegro Non Molto', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Vivaldi/Concerto in F minor, RV 297 Winter/Allegro non molto.mp3'},
  {'icon': iconImage, 'title': 'Allegro Non Molto', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Vivaldi/Concerto in G minor, RV 315 Summer/Allegro non molto.mp3'},
  {'icon': iconImage, 'title': 'Alonette', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Paul Mauriat/Alonette.mp3'},
  {'icon': iconImage, 'title': 'Alouette', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Paul Mauriat/Alouette.mp4'},
  {'icon': iconImage, 'title': 'Also Sprash Zaratustra', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Also sprash Zaratustra.mp3'},
  {'icon': iconImage, 'title': 'Aurora', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Vanessa Mai/Aurora.mp3'},
  {'icon': iconImage, 'title': 'Badinerie', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Иоганн Себастьян Бах/Badinerie.mp3'},
  {'icon': iconImage, 'title': 'Cavalleria Rusticana Intermezzo', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Cavalleria Rusticana Intermezzo.mp3'},
  {'icon': iconImage, 'title': 'Classical Gas', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Vanessa Mai/Classical Gas.mp3'},
  {'icon': iconImage, 'title': 'Con Brio', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Ludwig Van Beethoven/Con brio.mp3'},
  {'icon': iconImage, 'title': 'Concerto E Dur Rv 269 Danza Pastorale Allegro', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Vivaldi/Concerto E-dur RV 269 Danza pastorale Allegro.mp3'},
  {'icon': iconImage, 'title': 'Concerto For 2 Violonist & String', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Иоганн Себастьян Бах/Concerto for  2 Violonist & String.mp3'},
  {'icon': iconImage, 'title': 'Concerto For Piano', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Вольфганг Амадей Моцарт/Concerto for piano.mp3'},
  {'icon': iconImage, 'title': 'Contradanza', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Vanessa Mai/Contradanza.mp3'},
  {'icon': iconImage, 'title': 'Contradanza 1995', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Vanessa Mai/Contradanza 1995.mp4'},
  {'icon': iconImage, 'title': 'Die Walkure Ride Of The Valky Act3', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Die Walkure Ride of the Valky Act3.mp3'},
  {'icon': iconImage, 'title': 'Egmont Увертюра (opus 84)', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Ludwig Van Beethoven/Egmont увертюра (opus 84).mp3'},
  {'icon': iconImage, 'title': 'El Bimbo', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Paul Mauriat/El Bimbo.mp3'},
  {'icon': iconImage, 'title': 'Elise', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Ludwig Van Beethoven/Elise.mp3'},
  {'icon': iconImage, 'title': 'Fortress', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Fortress.mp3'},
  {'icon': iconImage, 'title': 'Godfather', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Godfather.mp3'},
  {'icon': iconImage, 'title': 'Godfather', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Paul Mauriat/Godfather.mp3'},
  {'icon': iconImage, 'title': 'Lilium', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Lilium.mp3'},
  {'icon': iconImage, 'title': 'Love Is Blue', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Paul Mauriat/Love Is Blue.mp3'},
  {'icon': iconImage, 'title': 'Molto Allegro Simphonie No 40 In G Minor K550', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Вольфганг Амадей Моцарт/Molto allegro Simphonie No.40 in G minor K550.mp3'},
  {'icon': iconImage, 'title': 'Moonlight Sonata (лунная Соната №14 ) (ч1)', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Ludwig Van Beethoven/Moonlight Sonata (Лунная Соната №14 ) (ч1).mp3'},
  {'icon': iconImage, 'title': 'Moonlight Sonata (лунная Соната №14 ) (ч2)', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Ludwig Van Beethoven/Moonlight Sonata (Лунная Соната №14 ) (ч2).mp3'},
  {'icon': iconImage, 'title': 'Orfeo Euridice Atto Secondo Balletto', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Orfeo Euridice Atto Secondo.Balletto.mp3'},
  {'icon': iconImage, 'title': 'Parapluies De Cherbury', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Paul Mauriat/Parapluies De Cherbury.mp3'},
  {'icon': iconImage, 'title': 'Per Elisa', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Ludwig Van Beethoven/Per Elisa.mp3'},
  {'icon': iconImage, 'title': 'Piano Sonata №14 In C Sharp Minor Op 27 №2', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Ludwig Van Beethoven/Piano Sonata №14 in C-sharp minor Op.27 №2.mp3'},
  {'icon': iconImage, 'title': 'Presto', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Vivaldi/Concerto in E flat major, RV 253 La Tempesta di Mare/Presto.mp3'},
  {'icon': iconImage, 'title': 'Presto Tempo Impetuoso Destate', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Vivaldi/Concerto in G minor, RV 315 Summer/Presto - Tempo impetuoso d%27Estate.mp3'},
  {'icon': iconImage, 'title': 'Requiem Lacrimoza', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Вольфганг Амадей Моцарт/Requiem Lacrimoza.mp3'},
  {'icon': iconImage, 'title': 'Retro', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Vanessa Mai/Retro.mp3'},
  {'icon': iconImage, 'title': 'Rondo Andantino', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Rondo Andantino.mp3'},
  {'icon': iconImage, 'title': 'Storm', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Vanessa Mai/Storm.mp3'},
  {'icon': iconImage, 'title': 'The Blue Danube Op 314', 'file': '../../../../../../../../D:/MUSIK/ClassicS/The Blue Danube Op.314.mp3'},
  {'icon': iconImage, 'title': 'The Diva Dance', 'file': '../../../../../../../../D:/MUSIK/ClassicS/The Diva Dance.MP3'},
  {'icon': iconImage, 'title': 'Toccata', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Vanessa Mai/Toccata.mp3'},
  {'icon': iconImage, 'title': 'Toccatа', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Paul Mauriat/Toccatа.mp3'},
  {'icon': iconImage, 'title': 'Valse Op 64i2', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Valse Op.64I2.mp3'},
  {'icon': iconImage, 'title': 'Vienna Blood Op 354', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Vienna Blood Op.354.mp3'},
  {'icon': iconImage, 'title': 'Балетная Сюита Лебединое Озеро Соч 20', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Чайковский Петр Ильич/Балетная сюита Лебединое озеро соч.20 .mp3'},
  {'icon': iconImage, 'title': 'Балетная Сюита Спящая Красавица Соч 66 Вальс Allegro', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Чайковский Петр Ильич/Балетная сюита Спящая красавица соч 66.Вальс Allegro.mp3'},
  {'icon': iconImage, 'title': 'Вальс', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Георгии Васильевич Свиридов/Вальс.mp3'},
  {'icon': iconImage, 'title': 'Вальс', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Вальс.mp3'},
  {'icon': iconImage, 'title': 'Вальс К Драме М Лермонтова Маскарад', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Вальс к драме М.Лермонтова %27Маскарад%27.mp3'},
  {'icon': iconImage, 'title': 'Гопак', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Гопак.mp3'},
  {'icon': iconImage, 'title': 'Евгений Онегин Полонез', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Евгений Онегин Полонез.mp3'},
  {'icon': iconImage, 'title': 'Зимняя Дорога', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Георгии Васильевич Свиридов/Зимняя Дорога.mp3'},
  {'icon': iconImage, 'title': 'Кан Кли', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Кан Кли.mp3'},
  {'icon': iconImage, 'title': 'Кармен', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Кармен.mp3'},
  {'icon': iconImage, 'title': 'Метель Музыкльная Иллюстрация К Повести А Пушкина', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Георгии Васильевич Свиридов/Метель Музыкльная иллюстрация к повести А.Пушкина.mp3'},
  {'icon': iconImage, 'title': 'Песня Тореадора', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Песня тореадора.mp3'},
  {'icon': iconImage, 'title': 'Половецкие Пляски', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Половецкие пляски.mp3'},
  {'icon': iconImage, 'title': 'Полонез', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Огинский М. К/Полонез.mp3'},
  {'icon': iconImage, 'title': 'Ромео И Джульета Балетная Сюита Монтекки И Капулетти', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Ромео и Джульета Балетная сюита Монтекки и Капулетти.mp3'},
  {'icon': iconImage, 'title': 'Свадебный Марш', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Свадебный марш.mp3'},
  {'icon': iconImage, 'title': 'Тройка', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Георгии Васильевич Свиридов/Тройка.mp3'},
  {'icon': iconImage, 'title': 'Турецкий Марш', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Вольфганг Амадей Моцарт/Турецкий марш.mp3'},
  {'icon': iconImage, 'title': 'Хованщина Прелюдия', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Хованщина. Прелюдия.mp3'},
  {'icon': iconImage, 'title': 'Эхо Вальса', 'file': '../../../../../../../../D:/MUSIK/ClassicS/Георгии Васильевич Свиридов/Эхо вальса.mp3'},
]);
})

document.getElementById('ddt').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '180 См', 'file': '../../../../../../../../D:/MUSIK/DDT/2002 - Единочество/180 см.mp3'},
  {'icon': iconImage, 'title': '7 Я Глава', 'file': '../../../../../../../../D:/MUSIK/DDT/7-я глава.mp3'},
  {'icon': iconImage, 'title': 'Агидель', 'file': '../../../../../../../../D:/MUSIK/DDT/1995 - Это все/Агидель.mp3'},
  {'icon': iconImage, 'title': 'Актриса Весна', 'file': '../../../../../../../../D:/MUSIK/DDT/1992 - Актриса весна/Актриса-Весна.mp3'},
  {'icon': iconImage, 'title': 'Актриса Весна', 'file': '../../../../../../../../D:/MUSIK/DDT/1991 - Пластун/Актриса-Весна.mp3'},
  {'icon': iconImage, 'title': 'Апокалипсис', 'file': '../../../../../../../../D:/MUSIK/DDT/1997 - Рожденный в СССР/Апокалипсис.mp3'},
  {'icon': iconImage, 'title': 'Беда', 'file': '../../../../../../../../D:/MUSIK/DDT/1993 - Черный пес Петербург/Беда.mp3'},
  {'icon': iconImage, 'title': 'Беда', 'file': '../../../../../../../../D:/MUSIK/DDT/1993 - Черный пес Петербург/Беда.mp4'},
  {'icon': iconImage, 'title': 'Белая Ночь', 'file': '../../../../../../../../D:/MUSIK/DDT/1995 - Это все/Белая ночь.mp3'},
  {'icon': iconImage, 'title': 'Белая Птица', 'file': '../../../../../../../../D:/MUSIK/DDT/1993 - Черный пес Петербург/Белая птица.mp3'},
  {'icon': iconImage, 'title': 'Бородино', 'file': '../../../../../../../../D:/MUSIK/DDT/2003 - Единочество/Бородино.mp3'},
  {'icon': iconImage, 'title': 'Бродяга', 'file': '../../../../../../../../D:/MUSIK/DDT/2000 - Метель августа/Бродяга.mp3'},
  {'icon': iconImage, 'title': 'В Гостях У Генерала', 'file': '../../../../../../../../D:/MUSIK/DDT/2006 - ДК им. Дзержинского/В гостях у генерала.mp3'},
  {'icon': iconImage, 'title': 'В Очереди За Правдой', 'file': '../../../../../../../../D:/MUSIK/DDT/2014 - Прозрачный/В Очереди За Правдой.mp3'},
  {'icon': iconImage, 'title': 'В Последнюю Осень', 'file': '../../../../../../../../D:/MUSIK/DDT/2001 - Два концерта Москва-Петербург2/В последнюю осень.mp3'},
  {'icon': iconImage, 'title': 'Вальс О Творчеств', 'file': '../../../../../../../../D:/MUSIK/DDT/2002 - Единочество/Вальс о творчеств.mp3'},
  {'icon': iconImage, 'title': 'Вальс О Творчестве', 'file': '../../../../../../../../D:/MUSIK/DDT/2002 - Единочество/Вальс о творчестве.mp3'},
  {'icon': iconImage, 'title': 'Вася', 'file': '../../../../../../../../D:/MUSIK/DDT/1982 - Квартирник/Вася.mp3'},
  {'icon': iconImage, 'title': 'Ветер', 'file': '../../../../../../../../D:/MUSIK/DDT/1995 - Это все/Ветер.mp3'},
  {'icon': iconImage, 'title': 'Ветры', 'file': '../../../../../../../../D:/MUSIK/DDT/1991 - Пластун/Ветры.mp3'},
  {'icon': iconImage, 'title': 'Война Бывает Детская', 'file': '../../../../../../../../D:/MUSIK/DDT/2007 - Прекрасная любовь/Война бывает детская.mp3'},
  {'icon': iconImage, 'title': 'Вокзал', 'file': '../../../../../../../../D:/MUSIK/DDT/2018 - Галя ходи/Вокзал.mp3'},
  {'icon': iconImage, 'title': 'Вокзал', 'file': '../../../../../../../../D:/MUSIK/DDT/2018 - Галя ходи/Вокзал.mp4'},
  {'icon': iconImage, 'title': 'Встреча', 'file': '../../../../../../../../D:/MUSIK/DDT/2011 - Иначе/Встреча.mp3'},
  {'icon': iconImage, 'title': 'Где Мы Летим', 'file': '../../../../../../../../D:/MUSIK/DDT/2011 - Иначе/Где мы летим.mp4'},
  {'icon': iconImage, 'title': 'Где Мы Летим', 'file': '../../../../../../../../D:/MUSIK/DDT/2011 - Иначе/Где мы летим.mp3'},
  {'icon': iconImage, 'title': 'Герой', 'file': '../../../../../../../../D:/MUSIK/DDT/1998 - Мир номер ноль/Герой.mp3'},
  {'icon': iconImage, 'title': 'Глазища', 'file': '../../../../../../../../D:/MUSIK/DDT/1995 - Это все/Глазища.mp3'},
  {'icon': iconImage, 'title': 'Гляди Пешком', 'file': '../../../../../../../../D:/MUSIK/DDT/1997 - Рожденный в СССР/Гляди пешком.mp3'},
  {'icon': iconImage, 'title': 'Гражданка', 'file': '../../../../../../../../D:/MUSIK/DDT/2000 - Метель августа/Гражданка.mp3'},
  {'icon': iconImage, 'title': 'Давайте Что Нибудь Придумаем', 'file': '../../../../../../../../D:/MUSIK/DDT/1982 - Квартирник/Давайте что-нибудь придумаем.mp3'},
  {'icon': iconImage, 'title': 'Далеко Далеко', 'file': '../../../../../../../../D:/MUSIK/DDT/1996 - Любовь/Далеко, далеко.mp3'},
  {'icon': iconImage, 'title': 'Далеко Далеко', 'file': '../../../../../../../../D:/MUSIK/DDT/2004 - Город без окон - Вход/Далеко, Далеко.mp3'},
  {'icon': iconImage, 'title': 'Деревня', 'file': '../../../../../../../../D:/MUSIK/DDT/1982 - Квартирник/Деревня.mp3'},
  {'icon': iconImage, 'title': 'Дождь', 'file': '../../../../../../../../D:/MUSIK/DDT/2001 - Два концерта Москва-Петербург1/Дождь.mp3'},
  {'icon': iconImage, 'title': 'Дождь', 'file': '../../../../../../../../D:/MUSIK/DDT/1992 - Актриса весна/Дождь.mp3'},
  {'icon': iconImage, 'title': 'Донести Синь', 'file': '../../../../../../../../D:/MUSIK/DDT/1998 - Мир номер ноль/Донести синь.mp3'},
  {'icon': iconImage, 'title': 'Дороги', 'file': '../../../../../../../../D:/MUSIK/DDT/1991 - Пластун/Дороги.mp3'},
  {'icon': iconImage, 'title': 'Духи', 'file': '../../../../../../../../D:/MUSIK/DDT/1997 - Рожденный в СССР/Духи.mp3'},
  {'icon': iconImage, 'title': 'Если', 'file': '../../../../../../../../D:/MUSIK/DDT/2018 - Галя ходи/Если.mp3'},
  {'icon': iconImage, 'title': 'Живой', 'file': '../../../../../../../../D:/MUSIK/DDT/2003 - Единочество/Живой.mp3'},
  {'icon': iconImage, 'title': 'Жизнь На Месте', 'file': '../../../../../../../../D:/MUSIK/DDT/1995 - Это все/Жизнь на месте.mp3'},
  {'icon': iconImage, 'title': 'Забери Эту Ночь', 'file': '../../../../../../../../D:/MUSIK/DDT/2003 - Единочество/Забери эту ночь.mp3'},
  {'icon': iconImage, 'title': 'Змей Петров', 'file': '../../../../../../../../D:/MUSIK/DDT/1991 - Пластун/Змей Петров.mp3'},
  {'icon': iconImage, 'title': 'Инопланетянин', 'file': '../../../../../../../../D:/MUSIK/DDT/1982 - Свинья на радуге/Инопланетянин.mp3'},
  {'icon': iconImage, 'title': 'Капитан Колесников', 'file': '../../../../../../../../D:/MUSIK/DDT/2007 - Прекрасная любовь/Капитан Колесников.mp3'},
  {'icon': iconImage, 'title': 'Кладбище', 'file': '../../../../../../../../D:/MUSIK/DDT/2003 - Единочество/Кладбище.mp3'},
  {'icon': iconImage, 'title': 'Конвеер', 'file': '../../../../../../../../D:/MUSIK/DDT/1988 - Я получил эту роль/Конвеер.mp3'},
  {'icon': iconImage, 'title': 'Конец Света', 'file': '../../../../../../../../D:/MUSIK/DDT/2001 - Два концерта Москва-Петербург1/Конец света.mp3'},
  {'icon': iconImage, 'title': 'Концерт (тула)', 'file': '../../../../../../../../D:/MUSIK/DDT/Концерт (Тула).mp3'},
  {'icon': iconImage, 'title': 'Ленинград', 'file': '../../../../../../../../D:/MUSIK/DDT/2001 - Два концерта Москва-Петербург2/Ленинград.mp3'},
  {'icon': iconImage, 'title': 'Ленинград', 'file': '../../../../../../../../D:/MUSIK/DDT/1990 - Оттепель/Ленинград.mp3'},
  {'icon': iconImage, 'title': 'Летели Облака', 'file': '../../../../../../../../D:/MUSIK/DDT/2000 - Метель августа/Летели облака.mp3'},
  {'icon': iconImage, 'title': 'Любовь', 'file': '../../../../../../../../D:/MUSIK/DDT/1996 - Любовь/Любовь.mp3'},
  {'icon': iconImage, 'title': 'Любовь Подумай Обо Мне', 'file': '../../../../../../../../D:/MUSIK/DDT/2003 - Единочество/Любовь, подумай обо мне.mp3'},
  {'icon': iconImage, 'title': 'Мальчики Мажоры', 'file': '../../../../../../../../D:/MUSIK/DDT/1988 - Я получил эту роль/Мальчики мажоры.mp3'},
  {'icon': iconImage, 'title': 'Мама Это Рок Н Ролл', 'file': '../../../../../../../../D:/MUSIK/DDT/2004 - Город без окон - Вход/Мама Это Рок-Н-Ролл.mp3'},
  {'icon': iconImage, 'title': 'Мертвый Город Рождество', 'file': '../../../../../../../../D:/MUSIK/DDT/2001 - Два концерта Москва-Петербург1/Мертвый город. Рождество.mp3'},
  {'icon': iconImage, 'title': 'Мертвый Город Рождество', 'file': '../../../../../../../../D:/MUSIK/DDT/1997 - Рожденный в СССР/Мертвый город. Рождество.mp3'},
  {'icon': iconImage, 'title': 'Метель', 'file': '../../../../../../../../D:/MUSIK/DDT/2001 - Два концерта Москва-Петербург1/Метель.mp3'},
  {'icon': iconImage, 'title': 'Метель', 'file': '../../../../../../../../D:/MUSIK/DDT/1998 - Мир номер ноль/Метель.mp3'},
  {'icon': iconImage, 'title': 'Метель Августа', 'file': '../../../../../../../../D:/MUSIK/DDT/2000 - Метель августа/Метель августа.mp3'},
  {'icon': iconImage, 'title': 'Милиционер В Рок Клубе', 'file': '../../../../../../../../D:/MUSIK/DDT/1990 - Оттепель/Милиционер в рок-клубе.mp3'},
  {'icon': iconImage, 'title': 'Монолог В Ванной', 'file': '../../../../../../../../D:/MUSIK/DDT/2001 - Два концерта Москва-Петербург1/Монолог в ванной.mp3'},
  {'icon': iconImage, 'title': 'Московская Барыня', 'file': '../../../../../../../../D:/MUSIK/DDT/2000 - Метель августа/Московская барыня.mp3'},
  {'icon': iconImage, 'title': 'Музыкальный Образ Iii', 'file': '../../../../../../../../D:/MUSIK/DDT/1998 - Мир номер ноль/Музыкальный образ III.mp3'},
  {'icon': iconImage, 'title': 'На Небе Вороны', 'file': '../../../../../../../../D:/MUSIK/DDT/1993 - Черный пес Петербург/На небе вороны.mp3'},
  {'icon': iconImage, 'title': 'Наполним Небо Добротой', 'file': '../../../../../../../../D:/MUSIK/DDT/1984 - Переферия/Наполним небо добротой.mp3'},
  {'icon': iconImage, 'title': 'Не Стреляй', 'file': '../../../../../../../../D:/MUSIK/DDT/1988 - Я получил эту роль/Не стреляй.mp3'},
  {'icon': iconImage, 'title': 'Небо На Земле', 'file': '../../../../../../../../D:/MUSIK/DDT/1998 - Мир номер ноль/Небо на земле.mp3'},
  {'icon': iconImage, 'title': 'Небо На Земле', 'file': '../../../../../../../../D:/MUSIK/DDT/1998 - Мир номер ноль/Небо на земле .mp3'},
  {'icon': iconImage, 'title': 'Ночь', 'file': '../../../../../../../../D:/MUSIK/DDT/1992 - Актриса весна/Ночь.mp3'},
  {'icon': iconImage, 'title': 'Ночь Людмила', 'file': '../../../../../../../../D:/MUSIK/DDT/2000 - Метель августа/Ночь-Людмила.mp3'},
  {'icon': iconImage, 'title': 'Облом', 'file': '../../../../../../../../D:/MUSIK/DDT/2003 - Единочество/Облом.mp3'},
  {'icon': iconImage, 'title': 'Она', 'file': '../../../../../../../../D:/MUSIK/DDT/2002 - Единочество/Она.mp3'},
  {'icon': iconImage, 'title': 'Осенняя', 'file': '../../../../../../../../D:/MUSIK/DDT/2002 - Единочество/Осенняя.mp3'},
  {'icon': iconImage, 'title': 'Памятник', 'file': '../../../../../../../../D:/MUSIK/DDT/1984 - Переферия/Памятник.mp3'},
  {'icon': iconImage, 'title': 'Париж', 'file': '../../../../../../../../D:/MUSIK/DDT/2001 - Два концерта Москва-Петербург2/Париж.mp3'},
  {'icon': iconImage, 'title': 'Париж', 'file': '../../../../../../../../D:/MUSIK/DDT/Париж.mp4'},
  {'icon': iconImage, 'title': 'Пацаны', 'file': '../../../../../../../../D:/MUSIK/DDT/2001 - Два концерта Москва-Петербург1/Пацаны.mp3'},
  {'icon': iconImage, 'title': 'Пацаны', 'file': '../../../../../../../../D:/MUSIK/DDT/1997 - Рожденный в СССР/Пацаны.mp3'},
  {'icon': iconImage, 'title': 'Пашка', 'file': '../../../../../../../../D:/MUSIK/DDT/2003 - Единочество/Пашка.mp3'},
  {'icon': iconImage, 'title': 'Песня О Людях Героических Профессий', 'file': '../../../../../../../../D:/MUSIK/DDT/2005 - Чистый звук/Песня о людях героических профессий.mp3'},
  {'icon': iconImage, 'title': 'Песня О Свободе', 'file': '../../../../../../../../D:/MUSIK/DDT/Песня о Свободе.mp4'},
  {'icon': iconImage, 'title': 'Песня О Свободе', 'file': '../../../../../../../../D:/MUSIK/DDT/2011 - Иначе/Песня о свободе.mp3'},
  {'icon': iconImage, 'title': 'Питер', 'file': '../../../../../../../../D:/MUSIK/DDT/2000 - Метель августа/Питер.mp3'},
  {'icon': iconImage, 'title': 'Победа', 'file': '../../../../../../../../D:/MUSIK/DDT/1991 - Пластун/Победа.mp3'},
  {'icon': iconImage, 'title': 'Победа', 'file': '../../../../../../../../D:/MUSIK/DDT/1991 - Пластун/Победа.mp4'},
  {'icon': iconImage, 'title': 'Подарок', 'file': '../../../../../../../../D:/MUSIK/DDT/2000 - Метель августа/Подарок.mp3'},
  {'icon': iconImage, 'title': 'Поколение', 'file': '../../../../../../../../D:/MUSIK/DDT/2002 - Единочество/Поколение.mp3'},
  {'icon': iconImage, 'title': 'Последняя Осень', 'file': '../../../../../../../../D:/MUSIK/DDT/1992 - Актриса весна/Последняя осень.mp3'},
  {'icon': iconImage, 'title': 'Пост Интеллигент', 'file': '../../../../../../../../D:/MUSIK/DDT/1990 - Оттепель/Пост-интеллигент.mp3'},
  {'icon': iconImage, 'title': 'Постелите Мне Степь', 'file': '../../../../../../../../D:/MUSIK/DDT/Постелите мне степь.mp3'},
  {'icon': iconImage, 'title': 'Потолок', 'file': '../../../../../../../../D:/MUSIK/DDT/2000 - Метель августа/Потолок.mp3'},
  {'icon': iconImage, 'title': 'Поэт', 'file': '../../../../../../../../D:/MUSIK/DDT/1988 - Я получил эту роль/Поэт.mp3'},
  {'icon': iconImage, 'title': 'Правда На Правду', 'file': '../../../../../../../../D:/MUSIK/DDT/1997 - Рожденный в СССР/Правда на правду.mp3'},
  {'icon': iconImage, 'title': 'Правда На Правду', 'file': '../../../../../../../../D:/MUSIK/DDT/2001 - Два концерта Москва-Петербург2/Правда на правду.mp3'},
  {'icon': iconImage, 'title': 'Предчувствие Гражданской Войны', 'file': '../../../../../../../../D:/MUSIK/DDT/1991 - Пластун/Предчувствие гражданской войны.mp3'},
  {'icon': iconImage, 'title': 'Прекрасная Любовь', 'file': '../../../../../../../../D:/MUSIK/DDT/2001 - Два концерта Москва-Петербург2/Прекрасная любовь.mp3'},
  {'icon': iconImage, 'title': 'Прекрасная Любовь', 'file': '../../../../../../../../D:/MUSIK/DDT/2006 - DDT Family/Прекрасная Любовь.mp3'},
  {'icon': iconImage, 'title': 'Пропавший Без Вести', 'file': '../../../../../../../../D:/MUSIK/DDT/2005 - Пропавший без вести/Пропавший без вести.mp3'},
  {'icon': iconImage, 'title': 'Просвистела', 'file': '../../../../../../../../D:/MUSIK/DDT/1999 - Просвистела/Просвистела.mp3'},
  {'icon': iconImage, 'title': 'Просвистела', 'file': '../../../../../../../../D:/MUSIK/DDT/2001 - Два концерта Москва-Петербург1/Просвистела.mp3'},
  {'icon': iconImage, 'title': 'Пустота', 'file': '../../../../../../../../D:/MUSIK/DDT/2011 - Иначе/Пустота.mp3'},
  {'icon': iconImage, 'title': 'Разговор На Войне', 'file': '../../../../../../../../D:/MUSIK/DDT/2007 - Прекрасная любовь/Разговор на войне.mp3'},
  {'icon': iconImage, 'title': 'Расстреляли Рассветами', 'file': '../../../../../../../../D:/MUSIK/DDT/1998 - Мир номер ноль/Расстреляли рассветами .mp3'},
  {'icon': iconImage, 'title': 'Расстреляли Рассветами', 'file': '../../../../../../../../D:/MUSIK/DDT/1998 - Мир номер ноль/Расстреляли рассветами.mp3'},
  {'icon': iconImage, 'title': 'Реальность', 'file': '../../../../../../../../D:/MUSIK/DDT/2014 - Прозрачный/Реальность.mp3'},
  {'icon': iconImage, 'title': 'Революция', 'file': '../../../../../../../../D:/MUSIK/DDT/1988 - Я получил эту роль/Революция.mp3'},
  {'icon': iconImage, 'title': 'Родина', 'file': '../../../../../../../../D:/MUSIK/DDT/1992 - Актриса весна/Родина.mp3'},
  {'icon': iconImage, 'title': 'Родина', 'file': '../../../../../../../../D:/MUSIK/DDT/2001 - Два концерта Москва-Петербург2/Родина.mp3'},
  {'icon': iconImage, 'title': 'Рожденный В Ссср', 'file': '../../../../../../../../D:/MUSIK/DDT/1997 - Рожденный в СССР/Рожденный в СССР.mp3'},
  {'icon': iconImage, 'title': 'Рождественская', 'file': '../../../../../../../../D:/MUSIK/DDT/1993 - Черный пес Петербург/Рождественская.mp3'},
  {'icon': iconImage, 'title': 'Рождество Ночная Пьеса', 'file': '../../../../../../../../D:/MUSIK/DDT/2004 - Город без окон - Выход/Рождество ночная пьеса.mp3'},
  {'icon': iconImage, 'title': 'Рождество Ночная Пьеса', 'file': '../../../../../../../../D:/MUSIK/DDT/2004 - Город без окон - Выход/Рождество ночная пьеса.mp4'},
  {'icon': iconImage, 'title': 'Российское Танго', 'file': '../../../../../../../../D:/MUSIK/DDT/1995 - Это все/Российское танго.mp3'},
  {'icon': iconImage, 'title': 'Россияне', 'file': '../../../../../../../../D:/MUSIK/DDT/2000 - Метель августа/Россияне.mp3'},
  {'icon': iconImage, 'title': 'Русская Весна', 'file': '../../../../../../../../D:/MUSIK/DDT/2018 - Галя ходи/Русская весна.mp3'},
  {'icon': iconImage, 'title': 'Свинья На Радуге', 'file': '../../../../../../../../D:/MUSIK/DDT/1982 - Свинья на радуге/Свинья на радуге.mp3'},
  {'icon': iconImage, 'title': 'Свобода', 'file': '../../../../../../../../D:/MUSIK/DDT/2001 - Два концерта Москва-Петербург2/Свобода.mp3'},
  {'icon': iconImage, 'title': 'Свобода', 'file': '../../../../../../../../D:/MUSIK/DDT/2000 - Метель августа/Свобода.mp3'},
  {'icon': iconImage, 'title': 'Сказка', 'file': '../../../../../../../../D:/MUSIK/DDT/1996 - Любовь/Сказка.mp3'},
  {'icon': iconImage, 'title': 'Смерть Поэта', 'file': '../../../../../../../../D:/MUSIK/DDT/2001 - Два концерта Москва-Петербург1/Смерть поэта.mp3'},
  {'icon': iconImage, 'title': 'Спой Бг', 'file': '../../../../../../../../D:/MUSIK/DDT/Спой БГ.mp3'},
  {'icon': iconImage, 'title': 'Спокойно Дружище', 'file': '../../../../../../../../D:/MUSIK/DDT/Спокойно, дружище.mp4'},
  {'icon': iconImage, 'title': 'Суббота', 'file': '../../../../../../../../D:/MUSIK/DDT/1990 - Оттепель/Суббота.mp3'},
  {'icon': iconImage, 'title': 'Счастливый День', 'file': '../../../../../../../../D:/MUSIK/DDT/1982 - Свинья на радуге/Счастливый день.mp3'},
  {'icon': iconImage, 'title': 'Танго Войны', 'file': '../../../../../../../../D:/MUSIK/DDT/2004 - Город без окон - Вход/Танго Войны.mp3'},
  {'icon': iconImage, 'title': 'Террорист', 'file': '../../../../../../../../D:/MUSIK/DDT/1988 - Я получил эту роль/Террорист.mp3'},
  {'icon': iconImage, 'title': 'Ты Не Один', 'file': '../../../../../../../../D:/MUSIK/DDT/1993 - Черный пес Петербург/Ты не один .mp3'},
  {'icon': iconImage, 'title': 'Ты Не Один', 'file': '../../../../../../../../D:/MUSIK/DDT/1993 - Черный пес Петербург/Ты не один.mp3'},
  {'icon': iconImage, 'title': 'У Тебя Есть Сын', 'file': '../../../../../../../../D:/MUSIK/DDT/1992 - Актриса весна/У тебя есть сын.mp3'},
  {'icon': iconImage, 'title': 'Фома', 'file': '../../../../../../../../D:/MUSIK/DDT/1992 - Актриса весна/Фома.mp3'},
  {'icon': iconImage, 'title': 'Хипаны', 'file': '../../../../../../../../D:/MUSIK/DDT/1988 - Я получил эту роль/Хипаны.mp3'},
  {'icon': iconImage, 'title': 'Храм', 'file': '../../../../../../../../D:/MUSIK/DDT/1992 - Актриса весна/Храм.mp3'},
  {'icon': iconImage, 'title': 'Церковь', 'file': '../../../../../../../../D:/MUSIK/DDT/1990 - Оттепель/Церковь.mp3'},
  {'icon': iconImage, 'title': 'Цыганочка', 'file': '../../../../../../../../D:/MUSIK/DDT/2006 - DDT Family/Цыганочка.mp3'},
  {'icon': iconImage, 'title': 'Цыганская', 'file': '../../../../../../../../D:/MUSIK/DDT/2006 - DDT Family/Цыганская.mp3'},
  {'icon': iconImage, 'title': 'Черно Белые Танцы', 'file': '../../../../../../../../D:/MUSIK/DDT/1998 - Мир номер ноль/Черно-белые танцы.mp3'},
  {'icon': iconImage, 'title': 'Черный Пес Петербург', 'file': '../../../../../../../../D:/MUSIK/DDT/2001 - Два концерта Москва-Петербург2/Черный пес Петербург.mp3'},
  {'icon': iconImage, 'title': 'Черный Пес Петербург', 'file': '../../../../../../../../D:/MUSIK/DDT/1993 - Черный пес Петербург/Черный Пес Петербург.mp3'},
  {'icon': iconImage, 'title': 'Четыре Окна', 'file': '../../../../../../../../D:/MUSIK/DDT/1995 - Это все/Четыре окна.mp3'},
  {'icon': iconImage, 'title': 'Что Такое Осень', 'file': '../../../../../../../../D:/MUSIK/DDT/2001 - Два концерта Москва-Петербург2/Что такое осень.mp3'},
  {'icon': iconImage, 'title': 'Что Такое Осень', 'file': '../../../../../../../../D:/MUSIK/DDT/1993 - Черный пес Петербург/Что такое осень.mp3'},
  {'icon': iconImage, 'title': 'Это Все', 'file': '../../../../../../../../D:/MUSIK/DDT/1995 - Это все/Это все.mp3'},
  {'icon': iconImage, 'title': 'Я Завтра Брошу Пить', 'file': '../../../../../../../../D:/MUSIK/DDT/2001 - Два концерта Москва-Петербург1/Я завтра брошу пить.mp3'},
  {'icon': iconImage, 'title': 'Я Зажог В Церквях Все Свечи', 'file': '../../../../../../../../D:/MUSIK/DDT/1993 - Черный пес Петербург/Я зажог в церквях все свечи.mp3'},
  {'icon': iconImage, 'title': 'Я Остановил Время', 'file': '../../../../../../../../D:/MUSIK/DDT/1993 - Черный пес Петербург/Я остановил время.mp3'},
  {'icon': iconImage, 'title': 'Я Остановил Время', 'file': '../../../../../../../../D:/MUSIK/DDT/1993 - Черный пес Петербург/Я остановил время.mp4'},
  {'icon': iconImage, 'title': 'Я Получил Эту Роль', 'file': '../../../../../../../../D:/MUSIK/DDT/1988 - Я получил эту роль/Я получил эту роль.mp3'},
  {'icon': iconImage, 'title': 'Я Сижу На Жестком Табурете', 'file': '../../../../../../../../D:/MUSIK/DDT/1983 - Компромис/Я сижу на жестком табурете.mp3'},
  {'icon': iconImage, 'title': 'Я У Вас', 'file': '../../../../../../../../D:/MUSIK/DDT/1996 - Любовь/Я у вас.mp3'},
  {'icon': iconImage, 'title': 'Январским Вечером Храним', 'file': '../../../../../../../../D:/MUSIK/DDT/Январским Вечером Храним.mp4'},
]);
})

document.getElementById('depechemode').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A Pain That Im Used To', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/2005 Playing The Angel/A Pain That I%27m Used To.mp3'},
  {'icon': iconImage, 'title': 'Alone', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/2013 Delta Machine (Deluxe Edition, 2CD) (CD 1)/Alone.mp3'},
  {'icon': iconImage, 'title': 'Black Celebration', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/1986 Black Celebration/Black Celebration.mp3'},
  {'icon': iconImage, 'title': 'Broken', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/2013 Delta Machine (Deluxe Edition, 2CD) (CD 1)/Broken.mp3'},
  {'icon': iconImage, 'title': 'But Not Tonight', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/1986 Black Celebration/But Not Tonight.mp3'},
  {'icon': iconImage, 'title': 'Enjoy The Silence', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/1990 Violator/Enjoy the Silence.mp4'},
  {'icon': iconImage, 'title': 'Enjoy The Silence', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/1990 Violator/Enjoy the Silence.mp3'},
  {'icon': iconImage, 'title': 'Heaven', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/2013 Delta Machine (Deluxe Edition, 2CD) (CD 1)/Heaven.mp3'},
  {'icon': iconImage, 'title': 'Heaven', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/2013 Delta Machine (Deluxe Edition, 2CD) (CD 1)/Heaven.mp4'},
  {'icon': iconImage, 'title': 'Home', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/1997 Ultra/Home.mp3'},
  {'icon': iconImage, 'title': 'I Feel You', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/1993 Songs of Faith and Devotion/I Feel You.mp3'},
  {'icon': iconImage, 'title': 'In Your Room', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/1993 Songs of Faith and Devotion/In Your Room.mp3'},
  {'icon': iconImage, 'title': 'Little 15', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/1987 Music For The Masses/Little 15.mp3'},
  {'icon': iconImage, 'title': 'Never Let Me Down Again', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/1987 Music For The Masses/Never Let Me Down Again.mp3'},
  {'icon': iconImage, 'title': 'Nothings Impossible', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/2005 Playing The Angel/Nothing%27s Impossible.mp3'},
  {'icon': iconImage, 'title': 'Personal Jesus', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/1990 Violator/Personal Jesus .mp4'},
  {'icon': iconImage, 'title': 'Personal Jesus', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/1990 Violator/Personal Jesus.mp3'},
  {'icon': iconImage, 'title': 'Secret To The End', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/2013 Delta Machine (Deluxe Edition, 2CD) (CD 1)/Secret To The End.mp3'},
  {'icon': iconImage, 'title': 'Soothe My Soul', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/2013 Delta Machine (Deluxe Edition, 2CD) (CD 1)/Soothe My Soul.mp3'},
  {'icon': iconImage, 'title': 'Strangelove', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/1987 Music For The Masses/Strangelove.mp3'},
  {'icon': iconImage, 'title': 'Strippedd', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/1986 Black Celebration/Strippedd.mp3'},
  {'icon': iconImage, 'title': 'Sweetest Perfection', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/2009 Sounds Of The Universe/Sweetest Perfection .mp3'},
  {'icon': iconImage, 'title': 'Sweetest Perfection', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/1990 Violator/Sweetest Perfection.mp3'},
  {'icon': iconImage, 'title': 'The Sinner In Me', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/2005 Playing The Angel/The Sinner In Me.mp3'},
  {'icon': iconImage, 'title': 'To Have And To Hold (spanish Taster)', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/1987 Music For The Masses/To Have And To Hold (Spanish Taster).mp3'},
  {'icon': iconImage, 'title': 'Walking In My Shoes', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/1993 Songs of Faith and Devotion/Walking In My Shoes.mp3'},
  {'icon': iconImage, 'title': 'Welcome To My World', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/2013 Delta Machine (Deluxe Edition, 2CD) (CD 1)/Welcome To My World.mp3'},
  {'icon': iconImage, 'title': 'World In My Eyes', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/1990 Violator/World in My Eyes.mp3'},
  {'icon': iconImage, 'title': 'Wrong', 'file': '../../../../../../../../D:/MUSIK/Depeche Mode/2009 Sounds Of The Universe/Wrong.mp3'},
]);
})

document.getElementById('eltonjohn').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Believe', 'file': '../../../../../../../../D:/MUSIK/Elton John/1995 - Made In England/Believe.mp3'},
  {'icon': iconImage, 'title': 'Blessed', 'file': '../../../../../../../../D:/MUSIK/Elton John/1995 - Love Songs/Blessed.mp3'},
  {'icon': iconImage, 'title': 'Electricity', 'file': '../../../../../../../../D:/MUSIK/Elton John/2005 - Electricity/Electricity.mp3'},
  {'icon': iconImage, 'title': 'Ive Been Loving You', 'file': '../../../../../../../../D:/MUSIK/Elton John/1992 - Rare Masters/Ive been loving you.mp3'},
  {'icon': iconImage, 'title': 'Nikita', 'file': '../../../../../../../../D:/MUSIK/Elton John/1995 - Love Songs/Nikita.mp3'},
  {'icon': iconImage, 'title': 'Original Sin', 'file': '../../../../../../../../D:/MUSIK/Elton John/2001 - Songs from the West Coast/Original sin.mp3'},
  {'icon': iconImage, 'title': 'Shoot Down The Moon', 'file': '../../../../../../../../D:/MUSIK/Elton John/1985 - Ice On Fire/Shoot down the moon.mp3'},
  {'icon': iconImage, 'title': 'Sorry Seems To Be The Hardest Word', 'file': '../../../../../../../../D:/MUSIK/Elton John/1987 - Live In Australia/Sorry seems to be the hardest word.mp3'},
  {'icon': iconImage, 'title': 'To Young', 'file': '../../../../../../../../D:/MUSIK/Elton John/1985 - Ice On Fire/To young.mp3'},
  {'icon': iconImage, 'title': 'Without Question', 'file': '../../../../../../../../D:/MUSIK/Elton John/2000 - The Road To El Dorado/Without question.mp3'},
  {'icon': iconImage, 'title': 'Wonders Of The New World', 'file': '../../../../../../../../D:/MUSIK/Elton John/2000 - The Road To El Dorado/Wonders of the new world.mp3'},
]);
})

document.getElementById('enya').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A Day Without Rain', 'file': '../../../../../../../../D:/MUSIK/Enya/2000 - A Day Without Rain/A Day Without Rain.mp3'},
  {'icon': iconImage, 'title': 'After Ventus', 'file': '../../../../../../../../D:/MUSIK/Enya/1991 - Shepherd Moons/After Ventus.mp3'},
  {'icon': iconImage, 'title': 'Aldebaran', 'file': '../../../../../../../../D:/MUSIK/Enya/1987 - Enya/Aldebaran.mp3'},
  {'icon': iconImage, 'title': 'Amarantine', 'file': '../../../../../../../../D:/MUSIK/Enya/2005 - Amarantine/Amarantine.mp3'},
  {'icon': iconImage, 'title': 'Aniron', 'file': '../../../../../../../../D:/MUSIK/Enya/2009 - The Very Best of Enya/Aniron.mp3'},
  {'icon': iconImage, 'title': 'Anywhere Is', 'file': '../../../../../../../../D:/MUSIK/Enya/1995 - The Memory Of Trees/Anywhere Is.mp3'},
  {'icon': iconImage, 'title': 'Athair Ar Neamh', 'file': '../../../../../../../../D:/MUSIK/Enya/2006 - Taliesin Orchestra/Athair Ar Neamh.mp3'},
  {'icon': iconImage, 'title': 'Boadicea', 'file': '../../../../../../../../D:/MUSIK/Enya/1997 - Box Of Dreams (Oceans)/Boadicea.mp3'},
  {'icon': iconImage, 'title': 'Book Of Days', 'file': '../../../../../../../../D:/MUSIK/Enya/1991 - Shepherd Moons/Book of Days.mp3'},
  {'icon': iconImage, 'title': 'Caribbean Blue', 'file': '../../../../../../../../D:/MUSIK/Enya/1991 - Caribbean Blue/Caribbean Blue.mp3'},
  {'icon': iconImage, 'title': 'China Roses', 'file': '../../../../../../../../D:/MUSIK/Enya/1997 - Paint the Sky with Stars/China Roses.mp3'},
  {'icon': iconImage, 'title': 'Ebudae', 'file': '../../../../../../../../D:/MUSIK/Enya/1991 - Shepherd Moons/Ebudae.mp3'},
  {'icon': iconImage, 'title': 'Elian', 'file': '../../../../../../../../D:/MUSIK/Enya/2005 - Sumiregusa/Elian.mp3'},
  {'icon': iconImage, 'title': 'Evening Falls ', 'file': '../../../../../../../../D:/MUSIK/Enya/1997 - Box Of Dreams (Stars)/Evening Falls....mp3'},
  {'icon': iconImage, 'title': 'Exile', 'file': '../../../../../../../../D:/MUSIK/Enya/1988 - Watermark/Exile.mp3'},
  {'icon': iconImage, 'title': 'Floras Secret', 'file': '../../../../../../../../D:/MUSIK/Enya/2000 - A Day Without Rain/Flora%27s Secret.mp3'},
  {'icon': iconImage, 'title': 'I Want Tomorrow', 'file': '../../../../../../../../D:/MUSIK/Enya/1987 - Enya/I Want Tomorrow.mp3'},
  {'icon': iconImage, 'title': 'Lazy Days', 'file': '../../../../../../../../D:/MUSIK/Enya/2001 - Oceans/Lazy Days.mp3'},
  {'icon': iconImage, 'title': 'Lothlorien', 'file': '../../../../../../../../D:/MUSIK/Enya/1991 - Shepherd Moons/Lothlorien.mp3'},
  {'icon': iconImage, 'title': 'May It Be', 'file': '../../../../../../../../D:/MUSIK/Enya/2001 - May it be/May It Be.mp3'},
  {'icon': iconImage, 'title': 'Mysterium', 'file': '../../../../../../../../D:/MUSIK/Enya/2005 - Sumiregusa/Mysterium.mp3'},
  {'icon': iconImage, 'title': 'On My Way Home', 'file': '../../../../../../../../D:/MUSIK/Enya/1996 - On My Way Home/On my way home.mp3'},
  {'icon': iconImage, 'title': 'One By One', 'file': '../../../../../../../../D:/MUSIK/Enya/2000 - A Day Without Rain/One By One.mp3'},
  {'icon': iconImage, 'title': 'Only If You Want To', 'file': '../../../../../../../../D:/MUSIK/Enya/1997 - Box Of Dreams (Oceans)/Only If You Want To.mp3'},
  {'icon': iconImage, 'title': 'Only Time', 'file': '../../../../../../../../D:/MUSIK/Enya/2000 - A Day Without Rain/Only Time.mp3'},
  {'icon': iconImage, 'title': 'Orinoco Flow', 'file': '../../../../../../../../D:/MUSIK/Enya/1988 - Watermark/Orinoco Flow.mp3'},
  {'icon': iconImage, 'title': 'Pilgrim', 'file': '../../../../../../../../D:/MUSIK/Enya/2002 - Best Of Enya/Pilgrim.mp3'},
  {'icon': iconImage, 'title': 'Shepherd Moons', 'file': '../../../../../../../../D:/MUSIK/Enya/1991 - Shepherd Moons/Shepherd Moons.mp3'},
  {'icon': iconImage, 'title': 'Somebody Said Goodbye', 'file': '../../../../../../../../D:/MUSIK/Enya/2005 - Amarantine/Somebody Said Goodbye.mp3'},
  {'icon': iconImage, 'title': 'St Patrick Cu Chulainn Oisin', 'file': '../../../../../../../../D:/MUSIK/Enya/2008 - Greatest Hits/St. Patrick-Cu Chulainn-Oisin.mp3'},
  {'icon': iconImage, 'title': 'Storms In Africa', 'file': '../../../../../../../../D:/MUSIK/Enya/1988 - Watermark/Storms In Africa.mp3'},
  {'icon': iconImage, 'title': 'Sumiregusa', 'file': '../../../../../../../../D:/MUSIK/Enya/2005 - Sumiregusa/Sumiregusa.mp3'},
  {'icon': iconImage, 'title': 'Tempus Vernum', 'file': '../../../../../../../../D:/MUSIK/Enya/2000 - A Day Without Rain/Tempus Vernum.mp3'},
  {'icon': iconImage, 'title': 'The Celts', 'file': '../../../../../../../../D:/MUSIK/Enya/1987 - Enya/The Celts.mp3'},
  {'icon': iconImage, 'title': 'The First Of Autumn', 'file': '../../../../../../../../D:/MUSIK/Enya/2000 - A Day Without Rain/The First Of Autumn.mp3'},
  {'icon': iconImage, 'title': 'The Memory Of Trees', 'file': '../../../../../../../../D:/MUSIK/Enya/1995 - The Memory Of Trees/The Memory Of Trees.mp3'},
  {'icon': iconImage, 'title': 'Trains And Winter Rains', 'file': '../../../../../../../../D:/MUSIK/Enya/2008 - And Winter Came/Trains And Winter Rains.mp3'},
  {'icon': iconImage, 'title': 'Watermark', 'file': '../../../../../../../../D:/MUSIK/Enya/1988 - Watermark/Watermark.mp3'},
  {'icon': iconImage, 'title': 'We Wish You A Merry Christmas', 'file': '../../../../../../../../D:/MUSIK/Enya/2005 - Amarantine Special Christmas Edition/We Wish You a Merry Christmas.mp3'},
  {'icon': iconImage, 'title': 'Wild Child', 'file': '../../../../../../../../D:/MUSIK/Enya/2000 - A Day Without Rain/Wild Child.mp3'},
]);
})

document.getElementById('era').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'After Time', 'file': '../../../../../../../../D:/MUSIK/Era/1998 - Era/After Time.mp3'},
  {'icon': iconImage, 'title': 'Ameno', 'file': '../../../../../../../../D:/MUSIK/Era/1998 - Era/Ameno.mp3'},
  {'icon': iconImage, 'title': 'Avatar', 'file': '../../../../../../../../D:/MUSIK/Era/1998 - Infinity/Avatar.mp3'},
  {'icon': iconImage, 'title': 'Divano', 'file': '../../../../../../../../D:/MUSIK/Era/2000 - Era/Divano.mp3'},
  {'icon': iconImage, 'title': 'Enae Volare Mezzo', 'file': '../../../../../../../../D:/MUSIK/Era/1998 - Era/Enae Volare Mezzo.mp3'},
  {'icon': iconImage, 'title': 'Habanera', 'file': '../../../../../../../../D:/MUSIK/Era/1998 - Infinity/Habanera.mp3'},
  {'icon': iconImage, 'title': 'Hymne', 'file': '../../../../../../../../D:/MUSIK/Era/2000 - Era/Hymne.mp3'},
  {'icon': iconImage, 'title': 'Madona', 'file': '../../../../../../../../D:/MUSIK/Era/2000 - Era/Madona.mp3'},
  {'icon': iconImage, 'title': 'Mirror', 'file': '../../../../../../../../D:/MUSIK/Era/1998 - Era/Mirror.mp3'},
  {'icon': iconImage, 'title': 'Misere Mani', 'file': '../../../../../../../../D:/MUSIK/Era/2000 - Era/Misere Mani.mp3'},
  {'icon': iconImage, 'title': 'Mother', 'file': '../../../../../../../../D:/MUSIK/Era/1998 - Era/Mother.mp3'},
  {'icon': iconImage, 'title': 'Sempire Damor', 'file': '../../../../../../../../D:/MUSIK/Era/1998 - Era/Sempire D%27Amor.mp3'},
  {'icon': iconImage, 'title': 'The Mass', 'file': '../../../../../../../../D:/MUSIK/Era/2003 - The Mass/The Mass.mp3'},
]);
})

document.getElementById('evanescence').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Anywhere', 'file': '../../../../../../../../D:/MUSIK/Evanescence/2000 - Origin/Anywhere.mp3'},
  {'icon': iconImage, 'title': 'Anywhere', 'file': '../../../../../../../../D:/MUSIK/Evanescence/Origin/Anywhere .Mp3'},
  {'icon': iconImage, 'title': 'Ascension Of The Spirit', 'file': '../../../../../../../../D:/MUSIK/Evanescence/1996 - Demos/Ascension Of The Spirit.mp3'},
  {'icon': iconImage, 'title': 'Away From Me', 'file': '../../../../../../../../D:/MUSIK/Evanescence/2000 - Origin/Away From Me.mp3'},
  {'icon': iconImage, 'title': 'Away From Me', 'file': '../../../../../../../../D:/MUSIK/Evanescence/Origin/Away From Me .Mp3'},
  {'icon': iconImage, 'title': 'Bring Me To Life', 'file': '../../../../../../../../D:/MUSIK/Evanescence/Singles & Remix%27s/Bring Me to Life.mp3'},
  {'icon': iconImage, 'title': 'Bring Me To Life', 'file': '../../../../../../../../D:/MUSIK/Evanescence/2003 - Bring Me To Life/Bring me to life.mp3'},
  {'icon': iconImage, 'title': 'Evanescence Track 10', 'file': '../../../../../../../../D:/MUSIK/Evanescence/Evanescence - Track 10.mp3'},
  {'icon': iconImage, 'title': 'Evrywhere', 'file': '../../../../../../../../D:/MUSIK/Evanescence/Ultra Rare Trax Vol. 1/Evrywhere.mp3'},
  {'icon': iconImage, 'title': 'Going Under', 'file': '../../../../../../../../D:/MUSIK/Evanescence/Fallen/Going Under.mp3'},
  {'icon': iconImage, 'title': 'Going Under', 'file': '../../../../../../../../D:/MUSIK/Evanescence/2003 - Going Under/Going under.mp3'},
  {'icon': iconImage, 'title': 'Imaginary', 'file': '../../../../../../../../D:/MUSIK/Evanescence/2000 - Origin/Imaginary.mp3'},
  {'icon': iconImage, 'title': 'Imaginary', 'file': '../../../../../../../../D:/MUSIK/Evanescence/Ultra Rare Trax Vol. 1/Imaginary.mp3'},
  {'icon': iconImage, 'title': 'Lies', 'file': '../../../../../../../../D:/MUSIK/Evanescence/2000 - Origin/Lies.mp3'},
  {'icon': iconImage, 'title': 'My Immortal', 'file': '../../../../../../../../D:/MUSIK/Evanescence/2000 - Origin/My Immortal.mp3'},
  {'icon': iconImage, 'title': 'Nickelback', 'file': '../../../../../../../../D:/MUSIK/Evanescence/Daredevil/Nickelback .mp3'},
  {'icon': iconImage, 'title': 'Origin', 'file': '../../../../../../../../D:/MUSIK/Evanescence/Ultra Rare Trax Vol. 1/Origin.mp3'},
  {'icon': iconImage, 'title': 'Where Will You Go', 'file': '../../../../../../../../D:/MUSIK/Evanescence/Evanescence Ep/Where Will You Go.Mp3'},
  {'icon': iconImage, 'title': 'Where Will You Go', 'file': '../../../../../../../../D:/MUSIK/Evanescence/1998 - Evanescence EP/Where Will You Go.mp3'},
  {'icon': iconImage, 'title': 'Whisper', 'file': '../../../../../../../../D:/MUSIK/Evanescence/1999 - Sound Asleep EP/Whisper.mp3'},
  {'icon': iconImage, 'title': 'Whisper', 'file': '../../../../../../../../D:/MUSIK/Evanescence/Ultra Rare Trax Vol. 1/Whisper.mp3'},
]);
})

document.getElementById('france').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A Contre Courant', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Alizee/A Contre-Courant.mp3'},
  {'icon': iconImage, 'title': 'A Toi', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/A toi.mp3'},
  {'icon': iconImage, 'title': 'Amelie Ma Dit', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Alizee/Amelie_M%27a_Dit.mp3'},
  {'icon': iconImage, 'title': 'Amies Ennemies', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Amies-Ennemies.mp3'},
  {'icon': iconImage, 'title': 'Autumn Dreams', 'file': '../../../../../../../../D:/MUSIK/FRANCE/FRANK DUVAL/Autumn Dreams.mp3'},
  {'icon': iconImage, 'title': 'Ballade Pour Adeline', 'file': '../../../../../../../../D:/MUSIK/FRANCE/FRANK DUVAL/Ballade pour Adeline.mp3'},
  {'icon': iconImage, 'title': 'Belle', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Notre Dame de Paris/Belle.mp3'},
  {'icon': iconImage, 'title': 'Bohemienne', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Notre Dame de Paris/Bohemienne.mp3'},
  {'icon': iconImage, 'title': 'Ca Va Pas Changer Le Monde', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/Ca va pas changer le monde.mp3'},
  {'icon': iconImage, 'title': 'California', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Mylene Farmer/Anamorphosee -1995/California.mp3'},
  {'icon': iconImage, 'title': 'Ces Diamants La', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Notre Dame de Paris/Ces Diamants-La.mp3'},
  {'icon': iconImage, 'title': 'Ciao Bambino Sorry', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Ciao, Bambino, Sorry.mp3'},
  {'icon': iconImage, 'title': 'Dans Les Yeux Demilie', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1978 - Dans Les Yeux d%27Emilie/Dans Les Yeux d%27Emilie.mp3'},
  {'icon': iconImage, 'title': 'Dechire', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Notre Dame de Paris/Dechire.mp3'},
  {'icon': iconImage, 'title': 'Des Mensonges En Musique', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Des Mensonges En Musique.mp3'},
  {'icon': iconImage, 'title': 'Desenchantee', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Mylene Farmer/L%27Autre -1991/Desenchantee.mp3'},
  {'icon': iconImage, 'title': 'Eaunanisme', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Mylene Farmer/Anamorphosee -1995/Eaunanisme.mp3'},
  {'icon': iconImage, 'title': 'Emmanuelles Song', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Emmanuelles Song.mp3'},
  {'icon': iconImage, 'title': 'Et Si Tu Nexistais Pas', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/Et si tu n%27existais pas.mp3'},
  {'icon': iconImage, 'title': 'Et Tournoie', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Mylene Farmer/Anamorphosee -1995/Et Tournoie.mp3'},
  {'icon': iconImage, 'title': 'Face To Face', 'file': '../../../../../../../../D:/MUSIK/FRANCE/FRANK DUVAL/Face To Face.mp3'},
  {'icon': iconImage, 'title': 'Fleur Du Mal', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Stephanie De Monaco/1986 - Ouragan/Fleur Du Mal.MP3'},
  {'icon': iconImage, 'title': 'Guantanamer', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1966 - Guantanamera/Guantanamer.mp3'},
  {'icon': iconImage, 'title': 'Ihistoire Dune Free Cest', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Mylene Farmer/Dance Remixes -2001/I%27histoire D%27une Free, C%27est.mp3'},
  {'icon': iconImage, 'title': 'Il Etait Une Fois Nous Deux', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/Il Etait une fois nous deux.mp3'},
  {'icon': iconImage, 'title': 'Il Faut Naitre A Monaco', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/Il faut naitre a monaco.mp3'},
  {'icon': iconImage, 'title': 'In Grid In Tango', 'file': '../../../../../../../../D:/MUSIK/FRANCE/In-Grid - In-Tango.mp3'},
  {'icon': iconImage, 'title': 'In Grid Milord (dj Skydreamer Remix)', 'file': '../../../../../../../../D:/MUSIK/FRANCE/In-Grid - Milord (DJ Skydreamer remix).mp3'},
  {'icon': iconImage, 'title': 'Innamoramento', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Mylene Farmer/Innamoramento/Innamoramento.mp3'},
  {'icon': iconImage, 'title': 'Intro', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Notre Dame de Paris/Intro.mp3'},
  {'icon': iconImage, 'title': 'Jai Pas Vingt Ans!', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Alizee/J%27ai pas vingt ans!.mp3'},
  {'icon': iconImage, 'title': 'Jen Ai Marre', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Alizee/J%27en Ai Marre.mp3'},
  {'icon': iconImage, 'title': 'Joe Le Taxi', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Vanessa Paradis - M & J (1988)/Joe Le Taxi.mp3'},
  {'icon': iconImage, 'title': 'La Cafe Des 3 Colombes', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/La cafe des 3 colombes.mp3'},
  {'icon': iconImage, 'title': 'La Chemin De Papa', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1967 - Les Dalton/La Chemin De Papa.mp3'},
  {'icon': iconImage, 'title': 'La Demoniselle De Deshonneur', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1978 - Dans Les Yeux d%27Emilie/La Demoniselle De Deshonneur.mp3'},
  {'icon': iconImage, 'title': 'La Fete Des Fous', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Notre Dame de Paris/La Fete Des Fous.mp3'},
  {'icon': iconImage, 'title': 'La Fleur Aux Dents', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1970 - L%27Amerique/La Fleur Aux Dents.mp3'},
  {'icon': iconImage, 'title': 'Lamerique', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1970 - L%27Amerique/L%27Amerique.mp3'},
  {'icon': iconImage, 'title': 'Last Summer Day', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Last Summer Day.mp3'},
  {'icon': iconImage, 'title': 'Le Chateau De Sable', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1978 - Dans Les Yeux d%27Emilie/Le Chateau De Sable.mp3'},
  {'icon': iconImage, 'title': 'Le Dernier Slow', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1979 - Le Dernier Slow/Le Dernier Slow.mp3'},
  {'icon': iconImage, 'title': 'Le Jardin Du Luxembourg', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/Le jardin du luxembourg.mp3'},
  {'icon': iconImage, 'title': 'Le Monture', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Notre Dame de Paris/Le Monture.mp3'},
  {'icon': iconImage, 'title': 'Le Pettit Pain Au Chocolat', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1967 - Les Dalton/Le Pettit Pain Au Chocolat.mp3'},
  {'icon': iconImage, 'title': 'Le Temps Des Cathedrales', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Notre Dame de Paris/Le Temps Des Cathedrales.mp3'},
  {'icon': iconImage, 'title': 'Le Temps Des Cathedrales Fin', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Notre Dame de Paris/Le Temps Des Cathedrales Fin.mp3'},
  {'icon': iconImage, 'title': 'Lefant Trouve', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Notre Dame de Paris/L%27Efant trouve.mp3'},
  {'icon': iconImage, 'title': 'Lequipe A Jojo', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1970 - L%27Amerique/L%27equipe A Jojo.mp3'},
  {'icon': iconImage, 'title': 'Les Champs Elysees', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1967 - Les Dalton/Les Champs-Elysees.mp3'},
  {'icon': iconImage, 'title': 'Les Cloches', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Notre Dame de Paris/Les Cloches.mp3'},
  {'icon': iconImage, 'title': 'Lete Indien', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/L%27ete indien.mp3'},
  {'icon': iconImage, 'title': 'Magnetic Fields', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Magnetic Fields.mp3'},
  {'icon': iconImage, 'title': 'Mamme Blue', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Mamme Blue.mp3'},
  {'icon': iconImage, 'title': 'Moi  Lolita', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Alizee/Moi.... Lolita.mp3'},
  {'icon': iconImage, 'title': 'Moi Lolita', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Alizee/Moi Lolita.mp4'},
  {'icon': iconImage, 'title': 'Mon Maguis', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Alizee/Mon Maguis.mp3'},
  {'icon': iconImage, 'title': 'Mon Mec A Moi', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Mon Mec A Moi.mp3'},
  {'icon': iconImage, 'title': 'Noiisette Et Cassidy', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1978 - Dans Les Yeux d%27Emilie/Noiisette Et Cassidy.mp3'},
  {'icon': iconImage, 'title': 'Non Je Ne Regrette Rien', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Non.Je Ne Regrette Rien.mp3'},
  {'icon': iconImage, 'title': 'Pardone Moi', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Pardone moi.mp3'},
  {'icon': iconImage, 'title': 'Paroles Paroles', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Paroles Paroles.mp3'},
  {'icon': iconImage, 'title': 'Regrets', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Mylene Farmer/L%27Autre -1991/Regrets.mp3'},
  {'icon': iconImage, 'title': 'Rendez Vous', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Stephanie De Monaco/1986 - Ouragan/Rendez-Vous.MP3'},
  {'icon': iconImage, 'title': 'Salut', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/Salut.mp3'},
  {'icon': iconImage, 'title': 'Salut Les Amoureux', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1972 - La Complainte De L%27Heure De Pointe/Salut Les Amoureux.mp3'},
  {'icon': iconImage, 'title': 'Scaled With A Kiss', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Scaled With A Kiss.mp3'},
  {'icon': iconImage, 'title': 'Schwarzer Walzer', 'file': '../../../../../../../../D:/MUSIK/FRANCE/FRANK DUVAL/Schwarzer Walzer.mp3'},
  {'icon': iconImage, 'title': 'Si Tu Tappelles Melancolie', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1974 - Si Tu T%27appelles Melancolie/Si Tu T%27appelles Melancolie.mp3'},
  {'icon': iconImage, 'title': 'Siffler Sur La Colline', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1967 - Les Dalton/Siffler Sur La Colline.mp3'},
  {'icon': iconImage, 'title': 'Sound', 'file': '../../../../../../../../D:/MUSIK/FRANCE/FRANK DUVAL/Sound.mp3'},
  {'icon': iconImage, 'title': 'Taka Takata', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1972 - La Complainte De L%27Heure De Pointe/Taka Takata.mp3'},
  {'icon': iconImage, 'title': 'Take My Breath Away', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Take my breath away.mp3'},
  {'icon': iconImage, 'title': 'The Guitar Dont Lie (le Marche Aux Puces)', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1979 - Le Dernier Slow/The guitar don%27t lie (Le marche aux puces).mp3'},
  {'icon': iconImage, 'title': 'Tombe La Neige', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Tombe La Neige.mp3'},
  {'icon': iconImage, 'title': 'Track 8', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Mylene Farmer/TRACK__8.MP3'},
  {'icon': iconImage, 'title': 'Tristana', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Mylene Farmer/Dance Remixes -1995/Tristana.MP3'},
  {'icon': iconImage, 'title': 'Tu Vas Me Detruire', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Notre Dame de Paris/Tu Vas Me Detruire.mp3'},
  {'icon': iconImage, 'title': 'Une Histoire Damour', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Une Histoire-D%27Amour.mp3'},
  {'icon': iconImage, 'title': 'Vade Retro', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Joseph Ira Dassin/1974 - Si Tu T%27appelles Melancolie/Vade Retro.mp3'},
  {'icon': iconImage, 'title': 'Venus De Abribus', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Venus de Abribus.mp3'},
  {'icon': iconImage, 'title': 'Wanderful Live', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Wanderful Live.mp3'},
  {'icon': iconImage, 'title': 'What Can I Do', 'file': '../../../../../../../../D:/MUSIK/FRANCE/What Can I Do.mp3'},
  {'icon': iconImage, 'title': 'Xxl', 'file': '../../../../../../../../D:/MUSIK/FRANCE/Mylene Farmer/Anamorphosee -1995/XXL.mp3'},
]);
})

document.getElementById('gipsykings').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Bamboleo', 'file': '../../../../../../../../D:/MUSIK/Gipsy Kings/1988 - Gipsy Kings/Bamboleo.mp3'},
  {'icon': iconImage, 'title': 'Inspiration', 'file': '../../../../../../../../D:/MUSIK/Gipsy Kings/1988 - Gipsy Kings/Inspiration.mp3'},
  {'icon': iconImage, 'title': 'Luna De Fuego', 'file': '../../../../../../../../D:/MUSIK/Gipsy Kings/1983 - Luna De Fuego/Luna De Fuego.mp3'},
  {'icon': iconImage, 'title': 'Soy', 'file': '../../../../../../../../D:/MUSIK/Gipsy Kings/1989 - Mosaique/Soy .mp3'},
  {'icon': iconImage, 'title': 'Soy', 'file': '../../../../../../../../D:/MUSIK/Gipsy Kings/1989 - Mosaique/Soy.mp3'},
  {'icon': iconImage, 'title': 'Un Amor', 'file': '../../../../../../../../D:/MUSIK/Gipsy Kings/1988 - Gipsy Kings/Un Amor.mp3'},
  {'icon': iconImage, 'title': 'Volare', 'file': '../../../../../../../../D:/MUSIK/Gipsy Kings/1989 - Mosaique/Volare.mp3'},
  {'icon': iconImage, 'title': 'Volare (live)', 'file': '../../../../../../../../D:/MUSIK/Gipsy Kings/1989 - Mosaique/Volare (Live).mp3'},
]);
})

document.getElementById('imaginedragons').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Bad Liar', 'file': '../../../../../../../../D:/MUSIK/Imagine Dragons/Bad Liar.mp4'},
  {'icon': iconImage, 'title': 'Bad Liar', 'file': '../../../../../../../../D:/MUSIK/Imagine Dragons/Bad Liar.mp3'},
  {'icon': iconImage, 'title': 'Believer', 'file': '../../../../../../../../D:/MUSIK/Imagine Dragons/Believer.mp4'},
  {'icon': iconImage, 'title': 'Believer', 'file': '../../../../../../../../D:/MUSIK/Imagine Dragons/Believer.mp3'},
  {'icon': iconImage, 'title': 'Birds', 'file': '../../../../../../../../D:/MUSIK/Imagine Dragons/Birds.mp4'},
  {'icon': iconImage, 'title': 'Birds', 'file': '../../../../../../../../D:/MUSIK/Imagine Dragons/Birds.mp3'},
  {'icon': iconImage, 'title': 'Demons', 'file': '../../../../../../../../D:/MUSIK/Imagine Dragons/Demons.mp4'},
  {'icon': iconImage, 'title': 'Demons', 'file': '../../../../../../../../D:/MUSIK/Imagine Dragons/Demons.mp3'},
  {'icon': iconImage, 'title': 'Its Time', 'file': '../../../../../../../../D:/MUSIK/Imagine Dragons/It%27s Time.mp4'},
  {'icon': iconImage, 'title': 'Its Time', 'file': '../../../../../../../../D:/MUSIK/Imagine Dragons/It%27s Time.mp3'},
  {'icon': iconImage, 'title': 'Thunder', 'file': '../../../../../../../../D:/MUSIK/Imagine Dragons/Thunder.mp4'},
  {'icon': iconImage, 'title': 'Thunder', 'file': '../../../../../../../../D:/MUSIK/Imagine Dragons/Thunder.mp3'},
  {'icon': iconImage, 'title': 'Walking The Wire', 'file': '../../../../../../../../D:/MUSIK/Imagine Dragons/Walking The Wire.mp4'},
  {'icon': iconImage, 'title': 'Whatever It Takes', 'file': '../../../../../../../../D:/MUSIK/Imagine Dragons/Whatever It Takes.mp4'},
  {'icon': iconImage, 'title': 'Whatever It Takes', 'file': '../../../../../../../../D:/MUSIK/Imagine Dragons/Whatever It Takes.mp3'},
]);
})

document.getElementById('italiano').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Cancion Del Mariachi', 'file': '../../../../../../../../D:/MUSIK/Italiano/Cancion Del Mariachi.mp3'},
  {'icon': iconImage, 'title': 'Caruso', 'file': '../../../../../../../../D:/MUSIK/Italiano/Caruso.mp3'},
  {'icon': iconImage, 'title': 'Carusо', 'file': '../../../../../../../../D:/MUSIK/Italiano/Carusо.MP3'},
  {'icon': iconImage, 'title': 'Casa Mia', 'file': '../../../../../../../../D:/MUSIK/Italiano/Ricchi & Poveri/1990 - Hasta La Vista, Signora-Le Grand Ricchi E Poveri/Casa Mia.mp3'},
  {'icon': iconImage, 'title': 'Cosa Sei', 'file': '../../../../../../../../D:/MUSIK/Italiano/Ricchi & Poveri/1983 - Voulez Vous Dancer/Cosa Sei.mp3'},
  {'icon': iconImage, 'title': 'Cose Della Vita', 'file': '../../../../../../../../D:/MUSIK/Italiano/Cose della vita.mp3'},
  {'icon': iconImage, 'title': 'Donna Musica', 'file': '../../../../../../../../D:/MUSIK/Italiano/Donna Musica.mp3'},
  {'icon': iconImage, 'title': 'Felichita', 'file': '../../../../../../../../D:/MUSIK/Italiano/Felichita.mp3'},
  {'icon': iconImage, 'title': 'Godfather', 'file': '../../../../../../../../D:/MUSIK/Italiano/Godfather.mp3'},
  {'icon': iconImage, 'title': 'Il Tempo Se Ne Va', 'file': '../../../../../../../../D:/MUSIK/Italiano/Il tempo se ne va.mp3'},
  {'icon': iconImage, 'title': 'Italiano', 'file': '../../../../../../../../D:/MUSIK/Italiano/Italiano.mp3'},
  {'icon': iconImage, 'title': 'La Notte', 'file': '../../../../../../../../D:/MUSIK/Italiano/La notte.mp3'},
  {'icon': iconImage, 'title': 'Liberta', 'file': '../../../../../../../../D:/MUSIK/Italiano/Liberta.mp3'},
  {'icon': iconImage, 'title': 'Mamma Maria', 'file': '../../../../../../../../D:/MUSIK/Italiano/Ricchi & Poveri/1982 - Mamma Maria/Mamma Maria.mp3'},
  {'icon': iconImage, 'title': 'Mamma Maria 1983', 'file': '../../../../../../../../D:/MUSIK/Italiano/Ricchi & Poveri/1982 - Mamma Maria/Mamma Maria 1983.mp4'},
  {'icon': iconImage, 'title': 'Natalie', 'file': '../../../../../../../../D:/MUSIK/Italiano/Natalie.mp4'},
  {'icon': iconImage, 'title': 'O Sole Mio', 'file': '../../../../../../../../D:/MUSIK/Italiano/O sole mio.mp3'},
  {'icon': iconImage, 'title': 'Piccolo Amore', 'file': '../../../../../../../../D:/MUSIK/Italiano/Ricchi & Poveri/1982 - Mamma Maria/Piccolo Amore.mp3'},
  {'icon': iconImage, 'title': 'Piu Che Puoi', 'file': '../../../../../../../../D:/MUSIK/Italiano/Piu che puoi.mp3'},
  {'icon': iconImage, 'title': 'Sara Perche Ti Amo', 'file': '../../../../../../../../D:/MUSIK/Italiano/Ricchi & Poveri/Sara Perche Ti Amo .mp3'},
  {'icon': iconImage, 'title': 'Sara Perche Ti Amo', 'file': '../../../../../../../../D:/MUSIK/Italiano/Ricchi & Poveri/1981 - E Penso A Te/Sara Perche Ti Amo.mp3'},
  {'icon': iconImage, 'title': 'Senza Una Donna', 'file': '../../../../../../../../D:/MUSIK/Italiano/Senza Una Donna.mp3'},
  {'icon': iconImage, 'title': 'Sharazan', 'file': '../../../../../../../../D:/MUSIK/Italiano/Sharazan.mp3'},
  {'icon': iconImage, 'title': 'Soli', 'file': '../../../../../../../../D:/MUSIK/Italiano/Soli.mp3'},
  {'icon': iconImage, 'title': 'Solo Noi', 'file': '../../../../../../../../D:/MUSIK/Italiano/Solo Noi.mp3'},
  {'icon': iconImage, 'title': 'Sudinoi', 'file': '../../../../../../../../D:/MUSIK/Italiano/Sudinoi.mp3'},
  {'icon': iconImage, 'title': 'Sоli', 'file': '../../../../../../../../D:/MUSIK/Italiano/Sоli.mp3'},
  {'icon': iconImage, 'title': 'Tu', 'file': '../../../../../../../../D:/MUSIK/Italiano/Tu.mp3'},
  {'icon': iconImage, 'title': 'Uomini Soli', 'file': '../../../../../../../../D:/MUSIK/Italiano/Uomini soli.mp3'},
  {'icon': iconImage, 'title': 'Vivo Per Lei', 'file': '../../../../../../../../D:/MUSIK/Italiano/Vivo Per Lei.mp3'},
  {'icon': iconImage, 'title': 'Voulez Vous Dancer', 'file': '../../../../../../../../D:/MUSIK/Italiano/Ricchi & Poveri/1983 - Voulez Vous Dancer/Voulez Vous Dancer.mp3'},
]);
})

document.getElementById('koяn').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Alone I Break', 'file': '../../../../../../../../D:/MUSIK/Koяn/2002 - Untouchables/Alone I break.mp3'},
  {'icon': iconImage, 'title': 'Another Brick In The Wall', 'file': '../../../../../../../../D:/MUSIK/Koяn/2004 - GREATEST HITS/Another Brick In The Wall.mp3'},
  {'icon': iconImage, 'title': 'Coming Undone', 'file': '../../../../../../../../D:/MUSIK/Koяn/2007 - Mtv Unplugged/Coming Undone.mp3'},
  {'icon': iconImage, 'title': 'Creep', 'file': '../../../../../../../../D:/MUSIK/Koяn/2007 - Mtv Unplugged/Creep.mp3'},
  {'icon': iconImage, 'title': 'Did My Time', 'file': '../../../../../../../../D:/MUSIK/Koяn/2003 - Take a Look In The Mirror/Did My Time.mp3'},
  {'icon': iconImage, 'title': 'Eaten Up Inside', 'file': '../../../../../../../../D:/MUSIK/Koяn/2006 - Coming Undone/Eaten Up Inside.mp3'},
  {'icon': iconImage, 'title': 'Evolution', 'file': '../../../../../../../../D:/MUSIK/Koяn/2007 - Evolution/Evolution.mp3'},
  {'icon': iconImage, 'title': 'Falling Away From Me', 'file': '../../../../../../../../D:/MUSIK/Koяn/2006 - LIVE & RARE/Falling Away From Me.mp3'},
  {'icon': iconImage, 'title': 'Freak On A Leash', 'file': '../../../../../../../../D:/MUSIK/Koяn/2004 - GREATEST HITS/Freak On A Leash.mp3'},
  {'icon': iconImage, 'title': 'Here To Stay', 'file': '../../../../../../../../D:/MUSIK/Koяn/2004 - GREATEST HITS/Here To Stay.mp3'},
  {'icon': iconImage, 'title': 'Innocent Bystander', 'file': '../../../../../../../../D:/MUSIK/Koяn/2007 - Untitled/Innocent Bystander.mp3'},
  {'icon': iconImage, 'title': 'Killing', 'file': '../../../../../../../../D:/MUSIK/Koяn/2007 - Untitled/Killing.mp3'},
  {'icon': iconImage, 'title': 'Kiss', 'file': '../../../../../../../../D:/MUSIK/Koяn/2007 - Untitled/Kiss.mp3'},
  {'icon': iconImage, 'title': 'Love Song', 'file': '../../../../../../../../D:/MUSIK/Koяn/2005 - See You On The Other Side/Love Song.mp3'},
  {'icon': iconImage, 'title': 'Make It Go Away', 'file': '../../../../../../../../D:/MUSIK/Koяn/2002 - Untouchables/Make It Go Away.mp3'},
  {'icon': iconImage, 'title': 'Open Up', 'file': '../../../../../../../../D:/MUSIK/Koяn/2005 - See You On The Other Side/Open Up.mp3'},
  {'icon': iconImage, 'title': 'Somebody Someone', 'file': '../../../../../../../../D:/MUSIK/Koяn/2004 - GREATEST HITS/Somebody Someone.mp3'},
  {'icon': iconImage, 'title': 'Tear Me Down', 'file': '../../../../../../../../D:/MUSIK/Koяn/2002 - Untouchables/Tear Me Down.mp3'},
  {'icon': iconImage, 'title': 'When Will This End', 'file': '../../../../../../../../D:/MUSIK/Koяn/2003 - Take a Look In The Mirror/When Will This End.mp3'},
  {'icon': iconImage, 'title': 'Word Up!', 'file': '../../../../../../../../D:/MUSIK/Koяn/2004 - GREATEST HITS/Word Up!.mp3'},
  {'icon': iconImage, 'title': 'Yall Want A Single', 'file': '../../../../../../../../D:/MUSIK/Koяn/2003 - Take a Look In The Mirror/Ya%27ll Want A Single.mp3'},
]);
})

document.getElementById('limpbizkit').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Behind Blue Eyes', 'file': '../../../../../../../../D:/MUSIK/Limp Bizkit/2003 - Results May Vary/Behind Blue Eyes.mp3'},
  {'icon': iconImage, 'title': 'Boiler', 'file': '../../../../../../../../D:/MUSIK/Limp Bizkit/2000 - Chocolate Starfish And The Hot Dog Flavored Water/Boiler.mp3'},
  {'icon': iconImage, 'title': 'Break Stuff', 'file': '../../../../../../../../D:/MUSIK/Limp Bizkit/1999 - Significant Other/Break Stuff.mp3'},
  {'icon': iconImage, 'title': 'Build A Bridge', 'file': '../../../../../../../../D:/MUSIK/Limp Bizkit/2003 - Results May Vary/Build a Bridge.mp3'},
  {'icon': iconImage, 'title': 'Faith', 'file': '../../../../../../../../D:/MUSIK/Limp Bizkit/1997-2002 - White Side - Rare, Demos and Lost sound/Faith.mp3'},
  {'icon': iconImage, 'title': 'Getcha Groove On', 'file': '../../../../../../../../D:/MUSIK/Limp Bizkit/2000 - Chocolate Starfish And The Hot Dog Flavored Water/Getcha Groove On.mp3'},
  {'icon': iconImage, 'title': 'Itll Be Ok', 'file': '../../../../../../../../D:/MUSIK/Limp Bizkit/2000 - Chocolate Starfish And The Hot Dog Flavored Water/It%27ll Be OK.mp3'},
  {'icon': iconImage, 'title': 'Lonely World', 'file': '../../../../../../../../D:/MUSIK/Limp Bizkit/2003 - Results May Vary/Lonely World.mp3'},
  {'icon': iconImage, 'title': 'My Way', 'file': '../../../../../../../../D:/MUSIK/Limp Bizkit/2000 - Chocolate Starfish And The Hot Dog Flavored Water/My Way.mp3'},
  {'icon': iconImage, 'title': 'Rollin', 'file': '../../../../../../../../D:/MUSIK/Limp Bizkit/2000 - Chocolate Starfish And The Hot Dog Flavored Water/Rollin.mp3'},
  {'icon': iconImage, 'title': 'Take A Look Around', 'file': '../../../../../../../../D:/MUSIK/Limp Bizkit/2000 - Chocolate Starfish And The Hot Dog Flavored Water/Take A Look Around.mp3'},
]);
})

document.getElementById('linkinpark').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '1stp Klosr', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/2002 - Reanimation/1stp Klosr.mp3'},
  {'icon': iconImage, 'title': 'A Place For My Head', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/1999 - Hybrid Theory/A Place For My Head.mp3'},
  {'icon': iconImage, 'title': 'All For Nothing', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/All For Nothing.mp4'},
  {'icon': iconImage, 'title': 'All For Nothing', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/All for nothing.mp3'},
  {'icon': iconImage, 'title': 'Bleed It Out', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/2007 - Minutes To Midnight/Bleed It Out.mp3'},
  {'icon': iconImage, 'title': 'Breaking The Habit', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/2003 - Meteora/Breaking The Habit.mp3'},
  {'icon': iconImage, 'title': 'Crawling', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/1999 - Hybrid Theory/Crawling.mp3'},
  {'icon': iconImage, 'title': 'Cure For The Itch', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/1999 - Hybrid Theory/Cure For the Itch.mp3'},
  {'icon': iconImage, 'title': 'Easier To Run', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/2003 - Meteora/Easier To Run.mp3'},
  {'icon': iconImage, 'title': 'Faint', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/2003 - Meteora/Faint.mp3'},
  {'icon': iconImage, 'title': 'Figure 09', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/2003 - Meteora/Figure.09.mp3'},
  {'icon': iconImage, 'title': 'Forgotten', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/1999 - Hybrid Theory/Forgotten.mp3'},
  {'icon': iconImage, 'title': 'From The Inside', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/2003 - Meteora/From The Inside.mp3'},
  {'icon': iconImage, 'title': 'Giving In', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/2006 - Project Revolution/Giving In.mp3'},
  {'icon': iconImage, 'title': 'In The End', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/1999 - Hybrid Theory/In the End.mp3'},
  {'icon': iconImage, 'title': 'Krwlng', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/2002 - Reanimation/Krwlng.mp3'},
  {'icon': iconImage, 'title': 'Leave Out All The Rest', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/2007 - Minutes To Midnight/Leave Out All The Rest.mp3'},
  {'icon': iconImage, 'title': 'My December (single)', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/2000 - Live/My December (single).mp3'},
  {'icon': iconImage, 'title': 'No More Sorrow', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/2007 - Minutes To Midnight/No More Sorrow.mp3'},
  {'icon': iconImage, 'title': 'Numb', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/2003 - Meteora/Numb.mp3'},
  {'icon': iconImage, 'title': 'One Step Closer', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/1999 - Hybrid Theory/One Step Closer.mp3'},
  {'icon': iconImage, 'title': 'P5hng Me Axwy', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/2002 - Reanimation/P5hng Me Axwy.mp3'},
  {'icon': iconImage, 'title': 'Papercut', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/1999 - Hybrid Theory/Papercut.mp3'},
  {'icon': iconImage, 'title': 'Plc 4 Mie Head', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/2002 - Reanimation/Plc.4 Mie Head.mp3'},
  {'icon': iconImage, 'title': 'Points Of Authority', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/1999 - Hybrid Theory/Points of Authority.mp3'},
  {'icon': iconImage, 'title': 'Pushing Me Away', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/1999 - Hybrid Theory/Pushing Me Away.mp3'},
  {'icon': iconImage, 'title': 'Runaway', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/1999 - Hybrid Theory/Runaway.mp3'},
  {'icon': iconImage, 'title': 'Session', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/2003 - Meteora/Session.mp3'},
  {'icon': iconImage, 'title': 'Somewhere I Belong', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/2003 - Meteora/Somewhere I Belong.mp3'},
  {'icon': iconImage, 'title': 'Wake', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/2007 - Minutes To Midnight/Wake.mp3'},
  {'icon': iconImage, 'title': 'What Ive Done', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/2007 - Minutes To Midnight/What I%27ve Done.mp3'},
  {'icon': iconImage, 'title': 'With You', 'file': '../../../../../../../../D:/MUSIK/Linkin Park/1999 - Hybrid Theory/With You.mp3'},
]);
})

document.getElementById('madonna').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'American Life', 'file': '../../../../../../../../D:/MUSIK/Madonna/2003 - American Life/American Life.mp3'},
  {'icon': iconImage, 'title': 'Beautiful Stranger', 'file': '../../../../../../../../D:/MUSIK/Madonna/1999 - Beautiful Stranger/Beautiful stranger.mp3'},
  {'icon': iconImage, 'title': 'Die Another Day', 'file': '../../../../../../../../D:/MUSIK/Madonna/2002 - Die Another Day/Die Another Day.mp3'},
  {'icon': iconImage, 'title': 'Dont Tell Me', 'file': '../../../../../../../../D:/MUSIK/Madonna/2000 - Music/Don%27t tell me.mp3'},
  {'icon': iconImage, 'title': 'Frozen', 'file': '../../../../../../../../D:/MUSIK/Madonna/1998 - Ray Of Light/Frozen.mp3'},
  {'icon': iconImage, 'title': 'La Isla Bonita', 'file': '../../../../../../../../D:/MUSIK/Madonna/1986 - True Blue/La isla bonita.mp3'},
  {'icon': iconImage, 'title': 'Live To Tell', 'file': '../../../../../../../../D:/MUSIK/Madonna/1995 - Something To Remember/Live To Tell.mp3'},
  {'icon': iconImage, 'title': 'Music', 'file': '../../../../../../../../D:/MUSIK/Madonna/2000 - Music/Music.mp3'},
  {'icon': iconImage, 'title': 'Power Of Good Bye', 'file': '../../../../../../../../D:/MUSIK/Madonna/2003 - American Life/Power of good-bye.mp3'},
  {'icon': iconImage, 'title': 'Secret', 'file': '../../../../../../../../D:/MUSIK/Madonna/1994 - Bedtime Stories/Secret.mp3'},
  {'icon': iconImage, 'title': 'Sorry', 'file': '../../../../../../../../D:/MUSIK/Madonna/2007 - The Confessions Tour/Sorry.mp3'},
  {'icon': iconImage, 'title': 'Youll See', 'file': '../../../../../../../../D:/MUSIK/Madonna/1995 - Something To Remember/You%27ll see.mp3'},
]);
})

document.getElementById('maywood').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Give Me Back My Love', 'file': '../../../../../../../../D:/MUSIK/Maywood/1980 - Late At Night/Give Me Back My Love.mp3'},
  {'icon': iconImage, 'title': 'I Only Want To Be With You', 'file': '../../../../../../../../D:/MUSIK/Maywood/1991 - Walking Back To Happiness/I Only Want To Be With You.mp3'},
  {'icon': iconImage, 'title': 'Pasadena', 'file': '../../../../../../../../D:/MUSIK/Maywood/1981 - Different Worlds/Pasadena.mp3'},
  {'icon': iconImage, 'title': 'Will You Still Love Me Tomorrow', 'file': '../../../../../../../../D:/MUSIK/Maywood/1991 - Walking Back To Happiness/Will You Still Love Me Tomorrow.mp3'},
]);
})

document.getElementById('metallica').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Astronomy', 'file': '../../../../../../../../D:/MUSIK/Metallica/1998 - Garage Inc/Astronomy.mp3'},
  {'icon': iconImage, 'title': 'Bleeding Me', 'file': '../../../../../../../../D:/MUSIK/Metallica/1996 - Load/Bleeding Me.mp3'},
  {'icon': iconImage, 'title': 'Devils Dance', 'file': '../../../../../../../../D:/MUSIK/Metallica/1997 - Reload/Devil%27s Dance.mp3'},
  {'icon': iconImage, 'title': 'Enter Sandman', 'file': '../../../../../../../../D:/MUSIK/Metallica/1991 - Metallica/Enter Sandman.mp3'},
  {'icon': iconImage, 'title': 'Fade To Black', 'file': '../../../../../../../../D:/MUSIK/Metallica/1984 - Ride The Lightning/Fade To Black.mp3'},
  {'icon': iconImage, 'title': 'Fuel', 'file': '../../../../../../../../D:/MUSIK/Metallica/1997 - Reload/Fuel.mp3'},
  {'icon': iconImage, 'title': 'Hero Of The Day', 'file': '../../../../../../../../D:/MUSIK/Metallica/1996 - Load/Hero Of The Day.mp3'},
  {'icon': iconImage, 'title': 'I Disappear', 'file': '../../../../../../../../D:/MUSIK/Metallica/2003 - St. Anger/I Disappear.MP3'},
  {'icon': iconImage, 'title': 'Loverman', 'file': '../../../../../../../../D:/MUSIK/Metallica/1991 - Metallica/Loverman.mp3'},
  {'icon': iconImage, 'title': 'Low Mans Lyric', 'file': '../../../../../../../../D:/MUSIK/Metallica/1997 - Reload/Low Man%27s Lyric.mp3'},
  {'icon': iconImage, 'title': 'Mama Said', 'file': '../../../../../../../../D:/MUSIK/Metallica/1996 - Load/Mama Said.mp3'},
  {'icon': iconImage, 'title': 'Master Of Puppets (live Berlin 09 12 2008)', 'file': '../../../../../../../../D:/MUSIK/Metallica/2008 - All Nightmare Long/Master of Puppets (Live Berlin 09.12.2008).mp3'},
  {'icon': iconImage, 'title': 'No Leaf Clover', 'file': '../../../../../../../../D:/MUSIK/Metallica/1999 - S&M/No Leaf Clover.mp3'},
  {'icon': iconImage, 'title': 'Nothing Else Matters', 'file': '../../../../../../../../D:/MUSIK/Metallica/1991 - Metallica/Nothing Else Matters.mp3'},
  {'icon': iconImage, 'title': 'One', 'file': '../../../../../../../../D:/MUSIK/Metallica/1988 - And Justice For All/One.mp3'},
  {'icon': iconImage, 'title': 'Sad But True', 'file': '../../../../../../../../D:/MUSIK/Metallica/1991 - Metallica/Sad But True.mp3'},
  {'icon': iconImage, 'title': 'Shoot Me Again', 'file': '../../../../../../../../D:/MUSIK/Metallica/2003 - St. Anger/Shoot Me Again.mp3'},
  {'icon': iconImage, 'title': 'St Anger', 'file': '../../../../../../../../D:/MUSIK/Metallica/2003 - St. Anger/St. Anger.mp3'},
  {'icon': iconImage, 'title': 'The Ecstasy Of Gold', 'file': '../../../../../../../../D:/MUSIK/Metallica/1999 - S&M/The Ecstasy Of Gold.mp3'},
  {'icon': iconImage, 'title': 'The Memory Remains', 'file': '../../../../../../../../D:/MUSIK/Metallica/1997 - Reload/The Memory Remains.mp3'},
  {'icon': iconImage, 'title': 'The Outlaw Torn', 'file': '../../../../../../../../D:/MUSIK/Metallica/1996 - Load/The Outlaw Torn.mp3'},
  {'icon': iconImage, 'title': 'The Thing That Should Not Be', 'file': '../../../../../../../../D:/MUSIK/Metallica/1999 - S&M/The Thing That Should Not Be.mp3'},
  {'icon': iconImage, 'title': 'The Unforgiven', 'file': '../../../../../../../../D:/MUSIK/Metallica/1991 - Metallica/The Unforgiven.MP3'},
  {'icon': iconImage, 'title': 'The Unforgiven Ii', 'file': '../../../../../../../../D:/MUSIK/Metallica/1997 - Reload/The Unforgiven II.mp3'},
  {'icon': iconImage, 'title': 'Through The Never', 'file': '../../../../../../../../D:/MUSIK/Metallica/1991 - Metallica/Through The Never.mp3'},
  {'icon': iconImage, 'title': 'Until It Sleeps', 'file': '../../../../../../../../D:/MUSIK/Metallica/1996 - Load/Until It Sleeps.mp3'},
  {'icon': iconImage, 'title': 'Welcome Home', 'file': '../../../../../../../../D:/MUSIK/Metallica/1986 - Master Of Puppets/Welcome Home.mp3'},
  {'icon': iconImage, 'title': 'Wherever I May Roam', 'file': '../../../../../../../../D:/MUSIK/Metallica/1991 - Metallica/Wherever I May Roam.mp3'},
  {'icon': iconImage, 'title': 'Wherever I May Roam (live Berlin 09 12 2008)', 'file': '../../../../../../../../D:/MUSIK/Metallica/2008 - All Nightmare Long/Wherever I May Roam (Live Berlin 09.12.2008).mp3'},
  {'icon': iconImage, 'title': 'Whiskey In Jar', 'file': '../../../../../../../../D:/MUSIK/Metallica/1998 - Garage Inc/Whiskey In Jar.mp3'},
]);
})

document.getElementById('michaeljackson').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Bad', 'file': '../../../../../../../../D:/MUSIK/Michael Jackson/1987 - Bad/Bad.mp3'},
  {'icon': iconImage, 'title': 'Billie Jean', 'file': '../../../../../../../../D:/MUSIK/Michael Jackson/1982 - Thriller/Billie Jean.mp3'},
  {'icon': iconImage, 'title': 'Black Or White', 'file': '../../../../../../../../D:/MUSIK/Michael Jackson/1991 - Dangerous/Black Or White.mp3'},
  {'icon': iconImage, 'title': 'Come Together', 'file': '../../../../../../../../D:/MUSIK/Michael Jackson/1995 - HIStory/Come Together.mp3'},
  {'icon': iconImage, 'title': 'Dirty Diana', 'file': '../../../../../../../../D:/MUSIK/Michael Jackson/1987 - Bad/Dirty Diana.mp3'},
  {'icon': iconImage, 'title': 'Earth Song', 'file': '../../../../../../../../D:/MUSIK/Michael Jackson/1995 - HIStory/Earth Song.mp3'},
  {'icon': iconImage, 'title': 'Give In To Me', 'file': '../../../../../../../../D:/MUSIK/Michael Jackson/1991 - Dangerous/Give In To Me.mp3'},
  {'icon': iconImage, 'title': 'Human Nature', 'file': '../../../../../../../../D:/MUSIK/Michael Jackson/1982 - Thriller/Human Nature.mp3'},
  {'icon': iconImage, 'title': 'Leave Me Alone', 'file': '../../../../../../../../D:/MUSIK/Michael Jackson/1987 - Bad/Leave Me Alone.mp3'},
  {'icon': iconImage, 'title': 'Michael Jackson You Are Not Alone Live In Munic', 'file': '../../../../../../../../D:/MUSIK/Michael Jackson/1995 - HIStory/michael_jackson_-_you_are_not_alone_live_in_munic.mp3'},
  {'icon': iconImage, 'title': 'Smooth Criminal', 'file': '../../../../../../../../D:/MUSIK/Michael Jackson/1987 - Bad/Smooth Criminal.mp3'},
  {'icon': iconImage, 'title': 'They Dont Care About Us', 'file': '../../../../../../../../D:/MUSIK/Michael Jackson/1995 - HIStory/They Don%27t Care About Us.mp3'},
  {'icon': iconImage, 'title': 'You Are Not Alone', 'file': '../../../../../../../../D:/MUSIK/Michael Jackson/1995 - HIStory/You Are Not Alone.mp3'},
]);
})

document.getElementById('moderntalking').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Chery Chery Lady', 'file': '../../../../../../../../D:/MUSIK/Modern talking/Chery, Chery Lady.mp3'},
  {'icon': iconImage, 'title': 'Cinderella Girl', 'file': '../../../../../../../../D:/MUSIK/Modern talking/2001 - Win The Race/Cinderella Girl.mp3'},
  {'icon': iconImage, 'title': 'Im Not Rockfeller', 'file': '../../../../../../../../D:/MUSIK/Modern talking/I%27m not Rockfeller.mp3'},
  {'icon': iconImage, 'title': 'Last Exit To Brooklyn', 'file': '../../../../../../../../D:/MUSIK/Modern talking/2001 - America/Last Exit To Brooklyn.mp3'},
  {'icon': iconImage, 'title': 'No Face No Name No Number', 'file': '../../../../../../../../D:/MUSIK/Modern talking/No Face No Name No Number.mp3'},
  {'icon': iconImage, 'title': 'Sms To My Heart', 'file': '../../../../../../../../D:/MUSIK/Modern talking/2001 - America/SMS To My Heart.mp3'},
  {'icon': iconImage, 'title': 'Tv Makes The Superstar', 'file': '../../../../../../../../D:/MUSIK/Modern talking/2003 - Universe/TV Makes The Superstar.mp3'},
  {'icon': iconImage, 'title': 'Win The Race', 'file': '../../../../../../../../D:/MUSIK/Modern talking/2001 - America/Win The Race.mp3'},
  {'icon': iconImage, 'title': 'Youre My Heart', 'file': '../../../../../../../../D:/MUSIK/Modern talking/You%27re My Heart.mp3'},
]);
})

document.getElementById('morcheeba').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Enjoy The Wait', 'file': '../../../../../../../../D:/MUSIK/Morcheeba/1996 - Who Can You Trust_/Enjoy The Wait.mp3'},
  {'icon': iconImage, 'title': 'Fragments Of Freedom', 'file': '../../../../../../../../D:/MUSIK/Morcheeba/2000 - Fragments of Freedom/Fragments Of Freedom.mp3'},
  {'icon': iconImage, 'title': 'Otherwise', 'file': '../../../../../../../../D:/MUSIK/Morcheeba/2002 - Otherwise/Otherwise.mp3'},
]);
})

document.getElementById('musik').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '03 Дорожка 3', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Шопен Диск 1/03 Дорожка 3.mp3'},
  {'icon': iconImage, 'title': '07 Дорожка 7', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Моцарт/07 Дорожка 7.mp3'},
  {'icon': iconImage, 'title': 'Alexis Sorbas', 'file': '../../../../../../../../D:/MUSIK/MUSIK/R.King/Alexis Sorbas.mp3'},
  {'icon': iconImage, 'title': 'Break You In', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Break You In.mp4'},
  {'icon': iconImage, 'title': 'Childrens Beach In Menton', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Children%27s Beach - In Menton.mp3'},
  {'icon': iconImage, 'title': 'Edge Hill', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Edge Hill.mp3'},
  {'icon': iconImage, 'title': 'Fly', 'file': '../../../../../../../../D:/MUSIK/MUSIK/fly.mp3'},
  {'icon': iconImage, 'title': 'From The Ocean', 'file': '../../../../../../../../D:/MUSIK/MUSIK/From The Ocean.mp3'},
  {'icon': iconImage, 'title': 'Fugue In D Minor', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Fugue in D minor.mp3'},
  {'icon': iconImage, 'title': 'Hellgate Bedlam', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Hellgate bedlam.mp3'},
  {'icon': iconImage, 'title': 'Kogda Ya Zakrivaiu Glaza', 'file': '../../../../../../../../D:/MUSIK/MUSIK/kogda_ya_zakrivaiu_glaza.mp3'},
  {'icon': iconImage, 'title': 'La Petite Fille De La Mer', 'file': '../../../../../../../../D:/MUSIK/MUSIK/La Petite Fille De La Mer.mp3'},
  {'icon': iconImage, 'title': 'Le Reve', 'file': '../../../../../../../../D:/MUSIK/MUSIK/R.King/Le reve.mp3'},
  {'icon': iconImage, 'title': 'Lilly Was Here', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Lilly Was Here.mp3'},
  {'icon': iconImage, 'title': 'Love Theme From Flashdance', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Love Theme From Flashdance.mp3'},
  {'icon': iconImage, 'title': 'Lovers In Madrid', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Lovers In Madrid.mp3'},
  {'icon': iconImage, 'title': 'Morgenstimmung', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Morgenstimmung.mp3'},
  {'icon': iconImage, 'title': 'Nani Nani', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Nani, Nani.mp3'},
  {'icon': iconImage, 'title': 'Orange Walk', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Orange Walk.mp3'},
  {'icon': iconImage, 'title': 'Overdoze', 'file': '../../../../../../../../D:/MUSIK/MUSIK/OverDoze.mp3'},
  {'icon': iconImage, 'title': 'Pop Corn', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Pop Corn.mp3'},
  {'icon': iconImage, 'title': 'Preview', 'file': '../../../../../../../../D:/MUSIK/MUSIK/preview.mp3'},
  {'icon': iconImage, 'title': 'Romance De Amour', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Romance de Amour.mp3'},
  {'icon': iconImage, 'title': 'Sabres Of Paradise', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Sabres of Paradise.mp3'},
  {'icon': iconImage, 'title': 'Song Of Ocarina', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Song Of Ocarina.mp3'},
  {'icon': iconImage, 'title': 'Strangers', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Strangers.mp3'},
  {'icon': iconImage, 'title': 'Tarantul', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Tarantul.mp3'},
  {'icon': iconImage, 'title': 'Tears Of The Ocean', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Tears of the ocean.mp3'},
  {'icon': iconImage, 'title': 'The End Is Near', 'file': '../../../../../../../../D:/MUSIK/MUSIK/The End is Near.mp4'},
  {'icon': iconImage, 'title': 'The Pink Panter', 'file': '../../../../../../../../D:/MUSIK/MUSIK/The Pink Panter.mp3'},
  {'icon': iconImage, 'title': 'Three Dreams', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Three Dreams.mp3'},
  {'icon': iconImage, 'title': 'Tico Tico', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Tico-Tico.mp3'},
  {'icon': iconImage, 'title': 'Tiлsto Euphoria', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Tiлsto - Euphoria.mp3'},
  {'icon': iconImage, 'title': 'Unchained Melody', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Unchained Melody.mp3'},
  {'icon': iconImage, 'title': 'Uvertura', 'file': '../../../../../../../../D:/MUSIK/MUSIK/uvertura.mp3'},
  {'icon': iconImage, 'title': 'Valzer', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Valzer.mp3'},
  {'icon': iconImage, 'title': 'Voices In Jupiter', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Voices In Jupiter.mp3'},
  {'icon': iconImage, 'title': 'Waltz (from Sleeping Beauty)', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Waltz (From Sleeping Beauty).mp3'},
  {'icon': iconImage, 'title': 'Братан', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Братан.mp3'},
  {'icon': iconImage, 'title': 'Когда Я Закрываю Глаза', 'file': '../../../../../../../../D:/MUSIK/MUSIK/И.Крутой/Когда Я Закрываю Глаза.mp3'},
  {'icon': iconImage, 'title': 'Песнь О Друге', 'file': '../../../../../../../../D:/MUSIK/MUSIK/И.Крутой/Песнь о Друге.mp3'},
  {'icon': iconImage, 'title': 'Страна Где Ночует Солнце', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Страна где ночует солнце.mp3'},
  {'icon': iconImage, 'title': 'Трек 3', 'file': '../../../../../../../../D:/MUSIK/MUSIK/Трек  3.mp3'},
]);
})

document.getElementById('nautiluspompilius').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Гибралтар Лабрадор', 'file': '../../../../../../../../D:/MUSIK/Nautilus Pompilius/2000 - Лабрадор-Гибралтар/Гибралтар-Лабрадор.mp3'},
  {'icon': iconImage, 'title': 'Дыхание', 'file': '../../../../../../../../D:/MUSIK/Nautilus Pompilius/1995 - Крылья/Дыхание.mp3'},
  {'icon': iconImage, 'title': 'Зверь', 'file': '../../../../../../../../D:/MUSIK/Nautilus Pompilius/1991 - Титаник на Фонтанке/Зверь.mp3'},
  {'icon': iconImage, 'title': 'Князь Тишины', 'file': '../../../../../../../../D:/MUSIK/Nautilus Pompilius/1989 - Князь Тишины/Князь Тишины.mp3'},
  {'icon': iconImage, 'title': 'Крылья', 'file': '../../../../../../../../D:/MUSIK/Nautilus Pompilius/1995 - Крылья/Крылья.mp3'},
  {'icon': iconImage, 'title': 'Кто Еще ', 'file': '../../../../../../../../D:/MUSIK/Nautilus Pompilius/1995 - Крылья/Кто Еще....mp3'},
  {'icon': iconImage, 'title': 'Люди На Холме', 'file': '../../../../../../../../D:/MUSIK/Nautilus Pompilius/1997 - Яблокитай/Люди на Холме.mp3'},
  {'icon': iconImage, 'title': 'Матерь Богов', 'file': '../../../../../../../../D:/MUSIK/Nautilus Pompilius/1997 - Атлантида/Матерь Богов.mp3'},
  {'icon': iconImage, 'title': 'Моя Звезда', 'file': '../../../../../../../../D:/MUSIK/Nautilus Pompilius/Моя звезда.mp3'},
  {'icon': iconImage, 'title': 'Моя Звезда', 'file': '../../../../../../../../D:/MUSIK/Nautilus Pompilius/Моя звезда.mp4'},
  {'icon': iconImage, 'title': 'На Берегу Безымянной Реки', 'file': '../../../../../../../../D:/MUSIK/Nautilus Pompilius/1987 - Чужая Земля/На Берегу Безымянной Реки.mp3'},
  {'icon': iconImage, 'title': 'Оркестровая Увертюра', 'file': '../../../../../../../../D:/MUSIK/Nautilus Pompilius/1997 - Атлантида/Оркестровая увертюра.mp3'},
  {'icon': iconImage, 'title': 'Песня Идущего Домой', 'file': '../../../../../../../../D:/MUSIK/Nautilus Pompilius/Песня идущего домой.MP3'},
  {'icon': iconImage, 'title': 'Последнее Письмо', 'file': '../../../../../../../../D:/MUSIK/Nautilus Pompilius/1989 - Князь Тишины/Последнее Письмо.mp3'},
  {'icon': iconImage, 'title': 'Прогулки По Воде', 'file': '../../../../../../../../D:/MUSIK/Nautilus Pompilius/1987 - Чужая Земля/Прогулки По Воде.mp3'},
  {'icon': iconImage, 'title': 'Сестры Печали', 'file': '../../../../../../../../D:/MUSIK/Nautilus Pompilius/1997 - Яблокитай/Сестры Печали.mp3'},
  {'icon': iconImage, 'title': 'Таинственный Гость', 'file': '../../../../../../../../D:/MUSIK/Nautilus Pompilius/1997 - Яблокитай/Таинственный гость.mp3'},
  {'icon': iconImage, 'title': 'Тутанхамон', 'file': '../../../../../../../../D:/MUSIK/Nautilus Pompilius/1991 - Титаник на Фонтанке/Тутанхамон.mp3'},
  {'icon': iconImage, 'title': 'Хлоп Хлоп', 'file': '../../../../../../../../D:/MUSIK/Nautilus Pompilius/1996 - Акустика (Лучшие Песни)/Хлоп-Хлоп.mp3'},
  {'icon': iconImage, 'title': 'Человек На Луне', 'file': '../../../../../../../../D:/MUSIK/Nautilus Pompilius/1995 - Крылья/Человек на Луне.mp3'},
  {'icon': iconImage, 'title': 'Я Хочу Быть С Тобой', 'file': '../../../../../../../../D:/MUSIK/Nautilus Pompilius/1989 - Князь Тишины/Я Хочу Быть С Тобой.mp3'},
]);
})

document.getElementById('new').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '001 Julio Iglesias Nostalgie', 'file': '../../../../../../../../D:/MUSIK/New/Copy/001_Julio Iglesias - Nostalgie.mp3'},
  {'icon': iconImage, 'title': '003 Lauren Christie Colour Of The Night', 'file': '../../../../../../../../D:/MUSIK/New/Copy/003_Lauren Christie - Colour Of The Night.mp3'},
  {'icon': iconImage, 'title': '004 Elton John Believe', 'file': '../../../../../../../../D:/MUSIK/New/Copy/004_Elton John - Believe.mp3'},
  {'icon': iconImage, 'title': '005 Riccardo Fogli Storie Di Tutti I Giomi', 'file': '../../../../../../../../D:/MUSIK/New/Copy/005_Riccardo Fogli - Storie Di Tutti I Giomi.mp3'},
  {'icon': iconImage, 'title': '006 Elvis Presley Its Now Or Newer', 'file': '../../../../../../../../D:/MUSIK/New/Copy/006_Elvis Presley - It%27s Now Or Newer.mp3'},
  {'icon': iconImage, 'title': '007 Queen The Show Must Go On', 'file': '../../../../../../../../D:/MUSIK/New/Copy/007_Queen - The Show Must Go On.mp3'},
  {'icon': iconImage, 'title': '008 Scorpions Wind Of Change', 'file': '../../../../../../../../D:/MUSIK/New/Copy/008_Scorpions - Wind Of Change.mp3'},
  {'icon': iconImage, 'title': '01 Георгий Свиридов – Тройка', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Г. Свиридов/01 Георгий Свиридов – Тройка.mp3'},
  {'icon': iconImage, 'title': '011 Abba The Winner Takes It All', 'file': '../../../../../../../../D:/MUSIK/New/Copy/011_ABBA - The Winner Takes It All.mp3'},
  {'icon': iconImage, 'title': '012 Barbara Streisand Woman In Love', 'file': '../../../../../../../../D:/MUSIK/New/Copy/012_Barbara Streisand - Woman In Love.mp3'},
  {'icon': iconImage, 'title': '015 Vanessa Paradise Joe Le Taxi', 'file': '../../../../../../../../D:/MUSIK/New/Copy/015_Vanessa Paradise - Joe Le Taxi.mp3'},
  {'icon': iconImage, 'title': '016 Chris Norman Midnight Lady', 'file': '../../../../../../../../D:/MUSIK/New/Copy/016_Chris Norman - Midnight Lady.mp3'},
  {'icon': iconImage, 'title': '02 Георгий Свиридов – Вальс', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Г. Свиридов/02 Георгий Свиридов – Вальс.mp3'},
  {'icon': iconImage, 'title': '023 Paul Mauriat Parapluies De Cherbury', 'file': '../../../../../../../../D:/MUSIK/New/Copy/023_Paul Mauriat - Parapluies De Cherbury.mp3'},
  {'icon': iconImage, 'title': '039 Madonna Youll See', 'file': '../../../../../../../../D:/MUSIK/New/Copy/039_Madonna - You%27ll See.mp3'},
  {'icon': iconImage, 'title': '04 Георгий Свиридов – Романс', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Г. Свиридов/04 Георгий Свиридов – Романс.mp3'},
  {'icon': iconImage, 'title': '042 Patricia Kaas Mon Mec A Moi', 'file': '../../../../../../../../D:/MUSIK/New/Copy/042_Patricia Kaas - Mon Mec A Moi.mp3'},
  {'icon': iconImage, 'title': '06 J Donovan Sealed With A Kiss', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Romantic/Vellume2/06-J.Donovan-Sealed_With_A_Kiss.mp3'},
  {'icon': iconImage, 'title': '07 Jonny', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Romantic/Vellume2/07_Jonny.mp3'},
  {'icon': iconImage, 'title': '08 Георгий Свиридов – Отзвуки Вальса', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Г. Свиридов/08 Георгий Свиридов – Отзвуки вальса.mp3'},
  {'icon': iconImage, 'title': '09 Love In December', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Romantic/Disco/09_Love In December.mp3'},
  {'icon': iconImage, 'title': '09 Георгий Свиридов – Зимняя Дорога', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Г. Свиридов/09 Георгий Свиридов – Зимняя дорога.mp3'},
  {'icon': iconImage, 'title': '10 I Will Survive', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Romantic/Golden/10_I Will Survive.mp3'},
  {'icon': iconImage, 'title': '10 Георгий Свиридов – Уральский Напев', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Г. Свиридов/10 Георгий Свиридов – Уральский напев.mp3'},
  {'icon': iconImage, 'title': '11 Get Another Boyfriend', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Romantic/Disco/11_Get Another Boyfriend.mp3'},
  {'icon': iconImage, 'title': '11 Oh Pretty Woman', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Romantic/Golden/11_Oh, Pretty Woman.mp3'},
  {'icon': iconImage, 'title': '110 Kiss I Was Made For Lovin You', 'file': '../../../../../../../../D:/MUSIK/New/Copy/110_Kiss - I Was Made For Lovin You.mp3'},
  {'icon': iconImage, 'title': '113 Ricchi E Poveri Voulez Vous Danser', 'file': '../../../../../../../../D:/MUSIK/New/Copy/113_Ricchi E Poveri - Voulez Vous Danser.mp3'},
  {'icon': iconImage, 'title': '127 Tanita Tikaram Twist In My Sobriety', 'file': '../../../../../../../../D:/MUSIK/New/Copy/127_Tanita Tikaram - Twist In My Sobriety.mp3'},
  {'icon': iconImage, 'title': '128 Patricia Kaas Venus De Abribus', 'file': '../../../../../../../../D:/MUSIK/New/Copy/128_Patricia Kaas - Venus De Abribus.mp3'},
  {'icon': iconImage, 'title': '130 Joe Dassin Et Si Tu Nexistais', 'file': '../../../../../../../../D:/MUSIK/New/Copy/130_Joe Dassin - Et Si Tu N%27existais.mp3'},
  {'icon': iconImage, 'title': '136 Animals House Of He Rising Sun', 'file': '../../../../../../../../D:/MUSIK/New/Copy/136_Animals - House Of He Rising Sun.mp3'},
  {'icon': iconImage, 'title': '142 Chris Norman Some Hearts Are Diamonds', 'file': '../../../../../../../../D:/MUSIK/New/Copy/142_Chris Norman - Some Hearts Are Diamonds.mp3'},
  {'icon': iconImage, 'title': '143 Louis Armstrong Go Down Moses', 'file': '../../../../../../../../D:/MUSIK/New/Copy/143_Louis Armstrong - Go Down Moses.mp3'},
  {'icon': iconImage, 'title': '15 Георгий Свиридов – Время Вперед', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Г. Свиридов/15 Георгий Свиридов – Время, вперед.mp3'},
  {'icon': iconImage, 'title': '16 House Of The Rising Sun', 'file': '../../../../../../../../D:/MUSIK/New/Copy/16_House Of The Rising Sun.mp3'},
  {'icon': iconImage, 'title': '162 Frank Sinatra Strangers In The Night', 'file': '../../../../../../../../D:/MUSIK/New/Copy/162_Frank Sinatra - Strangers In The Night.mp3'},
  {'icon': iconImage, 'title': '167 Abba Gimme! Gimme! Gimme!', 'file': '../../../../../../../../D:/MUSIK/New/Copy/167_ABBA - Gimme! Gimme! Gimme!.mp3'},
  {'icon': iconImage, 'title': '18 Girl Youll Be A Woman Soon Overkill', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Romantic/Vellume3/18-Girl_You%27ll_Be_A_Woman_Soon...-Overkill.mp3'},
  {'icon': iconImage, 'title': '184 Chris Rea Road To Hell', 'file': '../../../../../../../../D:/MUSIK/New/Copy/184_Chris Rea - Road To Hell.mp3'},
  {'icon': iconImage, 'title': '188 Ennio Morricone Once Upon A Time In America', 'file': '../../../../../../../../D:/MUSIK/New/Copy/188_Ennio Morricone - Once Upon A Time In America.mp3'},
  {'icon': iconImage, 'title': '194 Alphaville Forever Young', 'file': '../../../../../../../../D:/MUSIK/New/Copy/194_Alphaville - Forever Young.mp3'},
  {'icon': iconImage, 'title': '195 Chris Norman & Suzie Quatro Stambling Inn', 'file': '../../../../../../../../D:/MUSIK/New/Copy/195_Chris Norman & Suzie Quatro - Stambling Inn.mp3'},
  {'icon': iconImage, 'title': '196 Julio Iglesias Mammy Blue', 'file': '../../../../../../../../D:/MUSIK/New/Copy/196_Julio Iglesias - Mammy Blue.mp3'},
  {'icon': iconImage, 'title': '30 Seconds To Mars', 'file': '../../../../../../../../D:/MUSIK/New/2/30_seconds_to_mars.mp3'},
  {'icon': iconImage, 'title': 'A New Day Has Come', 'file': '../../../../../../../../D:/MUSIK/New/2/A new day has come.mp3'},
  {'icon': iconImage, 'title': 'Abba Happy New Year', 'file': '../../../../../../../../D:/MUSIK/New/Copy/abba_-_happy_new_year.mp3'},
  {'icon': iconImage, 'title': 'Adiemus', 'file': '../../../../../../../../D:/MUSIK/New/2/Adiemus.mp3'},
  {'icon': iconImage, 'title': 'Adios', 'file': '../../../../../../../../D:/MUSIK/New/2/Adios.mp3'},
  {'icon': iconImage, 'title': 'Adriano Celentano Il Tomposc Ne Va', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Adriano Celentano - Il Tomposc Ne Va.mp3'},
  {'icon': iconImage, 'title': 'Aerials', 'file': '../../../../../../../../D:/MUSIK/New/2/Aerials.mp3'},
  {'icon': iconImage, 'title': 'Aerosmith I Dont Want To Miss A Thing', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Aerosmith - I dont want to miss a thing.mp3'},
  {'icon': iconImage, 'title': 'Afrojack Shone', 'file': '../../../../../../../../D:/MUSIK/New/2/Afrojack-Shone.mp3'},
  {'icon': iconImage, 'title': 'Alex Theme', 'file': '../../../../../../../../D:/MUSIK/New/G/Alex Theme.mp3'},
  {'icon': iconImage, 'title': 'All For Nothing', 'file': '../../../../../../../../D:/MUSIK/New/2/All for nothing.mp3'},
  {'icon': iconImage, 'title': 'Alphaville Forever Young', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Alphaville - Forever Young.mp3'},
  {'icon': iconImage, 'title': 'Amerika', 'file': '../../../../../../../../D:/MUSIK/New/2/Amerika.mp3'},
  {'icon': iconImage, 'title': 'Amish Life', 'file': '../../../../../../../../D:/MUSIK/New/2/Amish Life.mp3'},
  {'icon': iconImage, 'title': 'Apologize', 'file': '../../../../../../../../D:/MUSIK/New/~sort/Dreaming Out Loud/Apologize.mp3'},
  {'icon': iconImage, 'title': 'Baba Oriley', 'file': '../../../../../../../../D:/MUSIK/New/2/Baba O%27Riley.mp3'},
  {'icon': iconImage, 'title': 'Back In Black', 'file': '../../../../../../../../D:/MUSIK/New/2/Back in black.mp3'},
  {'icon': iconImage, 'title': 'Bad Romance', 'file': '../../../../../../../../D:/MUSIK/New/bad_romance.mp3'},
  {'icon': iconImage, 'title': 'Bamboleo', 'file': '../../../../../../../../D:/MUSIK/New/2/Bamboleo.mp3'},
  {'icon': iconImage, 'title': 'Behind Blue Eyes', 'file': '../../../../../../../../D:/MUSIK/New/2/Behind Blue Eyes.mp3'},
  {'icon': iconImage, 'title': 'Believe', 'file': '../../../../../../../../D:/MUSIK/New/2/Believe.mp3'},
  {'icon': iconImage, 'title': 'Bemidji Mn', 'file': '../../../../../../../../D:/MUSIK/New/2/Bemidji, MN .mp3'},
  {'icon': iconImage, 'title': 'Bemidji Mn', 'file': '../../../../../../../../D:/MUSIK/New/2/Bemidji, MN.mp3'},
  {'icon': iconImage, 'title': 'Berlin Take My Breath Away', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Berlin - Take My Breath Away.mp3'},
  {'icon': iconImage, 'title': 'Besame Mucho', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Romantic/Tet - A - Tet/Besame Mucho.mp3'},
  {'icon': iconImage, 'title': 'Between Angels And Insects', 'file': '../../../../../../../../D:/MUSIK/New/2/Between Angels And Insects.mp3'},
  {'icon': iconImage, 'title': 'Bfg Division', 'file': '../../../../../../../../D:/MUSIK/New/G/BFG Division.mp3'},
  {'icon': iconImage, 'title': 'Big In Japan', 'file': '../../../../../../../../D:/MUSIK/New/2/guano apes/Big In Japan.mp3'},
  {'icon': iconImage, 'title': 'Black Or White', 'file': '../../../../../../../../D:/MUSIK/New/2/Black or White.mp3'},
  {'icon': iconImage, 'title': 'Blame Feat', 'file': '../../../../../../../../D:/MUSIK/New/2/Blame feat.mp3'},
  {'icon': iconImage, 'title': 'Bleed It Out', 'file': '../../../../../../../../D:/MUSIK/New/2/Bleed It Out.mp3'},
  {'icon': iconImage, 'title': 'Boro Boro', 'file': '../../../../../../../../D:/MUSIK/New/2/Boro Boro.mp3'},
  {'icon': iconImage, 'title': 'Breathe', 'file': '../../../../../../../../D:/MUSIK/New/2/Breathe.mp3'},
  {'icon': iconImage, 'title': 'Breathe The Glitch', 'file': '../../../../../../../../D:/MUSIK/New/2/Breathe the glitch.mp3'},
  {'icon': iconImage, 'title': 'California Dreamin Subtitulado Español Inglés', 'file': '../../../../../../../../D:/MUSIK/New/2/California Dreamin%27 - Subtitulado Español   Inglés.mp4'},
  {'icon': iconImage, 'title': 'California Dreamingthe Mamas & Papas California Dreaming Stereo Edit', 'file': '../../../../../../../../D:/MUSIK/New/2/California Dreamingthe mamas & papas - california dreaming - stereo edit.mp4'},
  {'icon': iconImage, 'title': 'Call Of Pripyat Ost Combat Theme 1', 'file': '../../../../../../../../D:/MUSIK/New/G/Call of Pripyat OST - Combat Theme 1.mp3'},
  {'icon': iconImage, 'title': 'Careless Whispe', 'file': '../../../../../../../../D:/MUSIK/New/2/Careless Whispe.mp3'},
  {'icon': iconImage, 'title': 'Cd1 05 Modern Talking Chery Chery Lady', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Romantic/Disco/CD1-05-Modern_Talking-Chery_Chery_Lady.mp3'},
  {'icon': iconImage, 'title': 'Cd1 06 Scorpions Stll Loving You', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Romantic/Golden/CD1-06-Scorpions-Stll_Loving_You.mp3'},
  {'icon': iconImage, 'title': 'Cd1 07 Joy Touch By Touch', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Romantic/Disco/CD1-07-Joy-Touch_By_Touch.mp3'},
  {'icon': iconImage, 'title': 'Cd1 10 Nick Cave And The Bad Sees Where The Wild Roses Grow', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Romantic/Golden/CD1-10-Nick_Cave_And_The_Bad_Sees-Where_The_Wild_Roses_Grow.mp3'},
  {'icon': iconImage, 'title': 'Cd2 01 Space Just Blue', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Romantic/Disco/CD2-01-Space-Just_Blue.mp3'},
  {'icon': iconImage, 'title': 'Cd2 05 James Last Lonesome Shepherd', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Romantic/Golden/CD2-05-James_Last-Lonesome_Shepherd.mp3'},
  {'icon': iconImage, 'title': 'Cd2 07 In The Army Now Status Quo', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Romantic/Golden/CD2-07-In_The_Army_Now-Status_QUO.mp3'},
  {'icon': iconImage, 'title': 'Cd2 10 Gloria Gaynor I Will Survive', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Romantic/Golden/CD2-10-Gloria_Gaynor-I_Will_Survive.mp3'},
  {'icon': iconImage, 'title': 'Cd2 11 Oh Pretty Woman Roy Orbison', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Romantic/Golden/CD2-11-Oh,_Pretty_Woman-Roy_Orbison.mp3'},
  {'icon': iconImage, 'title': 'Cd2 16 Nostalgie Julio Iglesias', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Romantic/Golden/CD2-16-Nostalgie-Julio_Iglesias.mp3'},
  {'icon': iconImage, 'title': 'Cd2 17 Lily Was Here Candy Dulfer', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Romantic/Golden/CD2-17-Lily_Was_Here-Candy_Dulfer.mp3'},
  {'icon': iconImage, 'title': 'Cd2 19 Mary Hopkins Those Were The Days', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Romantic/Disco/CD2-19-Mary_Hopkins-Those_Were_The_Days.mp3'},
  {'icon': iconImage, 'title': 'Celebrate', 'file': '../../../../../../../../D:/MUSIK/New/Copy/CELEBRATE.mp3'},
  {'icon': iconImage, 'title': 'Celebrate The Love', 'file': '../../../../../../../../D:/MUSIK/New/2/Celebrate the Love.mp3'},
  {'icon': iconImage, 'title': 'Chandelier', 'file': '../../../../../../../../D:/MUSIK/New/2/Chandelier.mp3'},
  {'icon': iconImage, 'title': 'Changed The Way You Kiss Me', 'file': '../../../../../../../../D:/MUSIK/New/2/Changed the way you kiss me.mp3'},
  {'icon': iconImage, 'title': 'Chihuahua', 'file': '../../../../../../../../D:/MUSIK/New/2/Chihuahua.mp3'},
  {'icon': iconImage, 'title': 'Chop Suey', 'file': '../../../../../../../../D:/MUSIK/New/2/Chop Suey.mp3'},
  {'icon': iconImage, 'title': 'Chris De Burgh Lady In Red', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Chris De Burgh - Lady In Red.mp3'},
  {'icon': iconImage, 'title': 'Chris De Burgh The Lady In Red M', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Chris De Burgh - The Lady In Red+M.MP3'},
  {'icon': iconImage, 'title': 'Chris Jennings Nothing But You', 'file': '../../../../../../../../D:/MUSIK/New/2/Chris Jennings - Nothing But You.mp3'},
  {'icon': iconImage, 'title': 'Clint Eastwood', 'file': '../../../../../../../../D:/MUSIK/New/2/Clint Eastwood.MP3'},
  {'icon': iconImage, 'title': 'Coco Jambo', 'file': '../../../../../../../../D:/MUSIK/New/2/Coco Jambo.mp3'},
  {'icon': iconImage, 'title': 'Confide In Me', 'file': '../../../../../../../../D:/MUSIK/New/2/Confide in Me.mp3'},
  {'icon': iconImage, 'title': 'Conquest Of Paradise', 'file': '../../../../../../../../D:/MUSIK/New/2/Conquest of paradise.mp3'},
  {'icon': iconImage, 'title': 'Corleone Speaking', 'file': '../../../../../../../../D:/MUSIK/New/2/Corleone_Speaking.mp3'},
  {'icon': iconImage, 'title': 'Cotton Eye Joe', 'file': '../../../../../../../../D:/MUSIK/New/2/Cotton eye joe.mp3'},
  {'icon': iconImage, 'title': 'Crash Boom Bang', 'file': '../../../../../../../../D:/MUSIK/New/2/Crash Boom Bang.mp3'},
  {'icon': iconImage, 'title': 'Creep', 'file': '../../../../../../../../D:/MUSIK/New/2/Creep.mp3'},
  {'icon': iconImage, 'title': 'Dalida Voyage', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Dalida - Voyage.mp3'},
  {'icon': iconImage, 'title': 'Dead!', 'file': '../../../../../../../../D:/MUSIK/New/~sort/MY CHEMICAL ROMANCE/Dead!.mp3'},
  {'icon': iconImage, 'title': 'Deep Six', 'file': '../../../../../../../../D:/MUSIK/New/2/Deep six.mp3'},
  {'icon': iconImage, 'title': 'Desert Rose', 'file': '../../../../../../../../D:/MUSIK/New/2/Desert Rose.mp3'},
  {'icon': iconImage, 'title': 'Deserts Of Mars', 'file': '../../../../../../../../D:/MUSIK/New/2/Deserts Of Mars.MP3'},
  {'icon': iconImage, 'title': 'Desperate Religion', 'file': '../../../../../../../../D:/MUSIK/New/2/Desperate religion.mp3'},
  {'icon': iconImage, 'title': 'Diamonds Myzuka', 'file': '../../../../../../../../D:/MUSIK/New/2/Diamonds myzuka.mp3'},
  {'icon': iconImage, 'title': 'Did My Time', 'file': '../../../../../../../../D:/MUSIK/New/2/Did My Time.mp3'},
  {'icon': iconImage, 'title': 'Dont Dream Its Over', 'file': '../../../../../../../../D:/MUSIK/New/2/Don%27t dream it%27s over.mp3'},
  {'icon': iconImage, 'title': 'Dont Speak', 'file': '../../../../../../../../D:/MUSIK/New/2/Don%27t speak.mp3'},
  {'icon': iconImage, 'title': 'Dont Stop The Music', 'file': '../../../../../../../../D:/MUSIK/New/2/Don%27t Stop The Music.mp3'},
  {'icon': iconImage, 'title': 'Drinking From The Bottle', 'file': '../../../../../../../../D:/MUSIK/New/2/Drinking from the bottle.mp3'},
  {'icon': iconImage, 'title': 'Dup Step', 'file': '../../../../../../../../D:/MUSIK/New/2/Dup Step.mp3'},
  {'icon': iconImage, 'title': 'Elton John Blessed', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Elton John - Blessed.mp3'},
  {'icon': iconImage, 'title': 'Empire', 'file': '../../../../../../../../D:/MUSIK/New/2/Empire.mp3'},
  {'icon': iconImage, 'title': 'Eric Serra The Diva Dance', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Eric Serra-The Diva Dance.MP3'},
  {'icon': iconImage, 'title': 'Eros Ramazotti & Tina Turner Cosse Della Vita', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Eros Ramazotti & Tina Turner - Cosse Della Vita.mp3'},
  {'icon': iconImage, 'title': 'Es Ist Nie Vorbie', 'file': '../../../../../../../../D:/MUSIK/New/2/Es Ist Nie Vorbie.mp3'},
  {'icon': iconImage, 'title': 'Eternal Flame', 'file': '../../../../../../../../D:/MUSIK/New/2/Eternal Flame.mp4'},
  {'icon': iconImage, 'title': 'Evanescence Bring Me To Life', 'file': '../../../../../../../../D:/MUSIK/New/Copy/evanescence_-_bring_me_to_life.mp3'},
  {'icon': iconImage, 'title': 'Every Breath You Take', 'file': '../../../../../../../../D:/MUSIK/New/2/Every breath you take.mp3'},
  {'icon': iconImage, 'title': 'Everybody Wants To Rule The World', 'file': '../../../../../../../../D:/MUSIK/New/2/Everybody wants to rule the world.mp3'},
  {'icon': iconImage, 'title': 'Everything Is Going To Be Okay', 'file': '../../../../../../../../D:/MUSIK/New/G/Everything Is Going to Be Okay.mp3'},
  {'icon': iconImage, 'title': 'Famous Last Words', 'file': '../../../../../../../../D:/MUSIK/New/~sort/MY CHEMICAL ROMANCE/Famous Last Words.mp3'},
  {'icon': iconImage, 'title': 'Feel The Light', 'file': '../../../../../../../../D:/MUSIK/New/2/Feel the light.mp3'},
  {'icon': iconImage, 'title': 'Fighte', 'file': '../../../../../../../../D:/MUSIK/New/2/Fighte.mp3'},
  {'icon': iconImage, 'title': 'Fire Water Burn', 'file': '../../../../../../../../D:/MUSIK/New/2/Fire water burn.mp3'},
  {'icon': iconImage, 'title': 'Fly On The Wings Of Love', 'file': '../../../../../../../../D:/MUSIK/New/2/Fly On The Wings Of Love.mp3'},
  {'icon': iconImage, 'title': 'Fragments Of Freedom', 'file': '../../../../../../../../D:/MUSIK/New/2/Fragments Of Freedom.mp3'},
  {'icon': iconImage, 'title': 'Freestyler', 'file': '../../../../../../../../D:/MUSIK/New/2/Freestyler.mp3'},
  {'icon': iconImage, 'title': 'Friends Will Be Friends', 'file': '../../../../../../../../D:/MUSIK/New/2/Friends Will Be Friends.mp3'},
  {'icon': iconImage, 'title': 'Frozen', 'file': '../../../../../../../../D:/MUSIK/New/2/Frozen.mp3'},
  {'icon': iconImage, 'title': 'George Michael Jesus To A Child', 'file': '../../../../../../../../D:/MUSIK/New/Copy/George Michael - Jesus to a child.mp3'},
  {'icon': iconImage, 'title': 'Georgio Moroder Love Theme From Flash Dance', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Georgio Moroder - Love Theme From Flash Dance.mp3'},
  {'icon': iconImage, 'title': 'Get A Haircut', 'file': '../../../../../../../../D:/MUSIK/New/2/Get a Haircut.mp3'},
  {'icon': iconImage, 'title': 'Get A Job', 'file': '../../../../../../../../D:/MUSIK/New/2/Get a Job.mp3'},
  {'icon': iconImage, 'title': 'Gilla Johnny', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Gilla - Johnny.mp3'},
  {'icon': iconImage, 'title': 'Giving In', 'file': '../../../../../../../../D:/MUSIK/New/2/Giving In.mp3'},
  {'icon': iconImage, 'title': 'Godfather', 'file': '../../../../../../../../D:/MUSIK/New/F/Godfather.mp3'},
  {'icon': iconImage, 'title': 'Gorky Park Bang', 'file': '../../../../../../../../D:/MUSIK/New/2/gorky_park_bang.mp3'},
  {'icon': iconImage, 'title': 'Gorky Park Moscow Calling', 'file': '../../../../../../../../D:/MUSIK/New/2/gorky_park_moscow_calling.mp3'},
  {'icon': iconImage, 'title': 'Goulding Burn', 'file': '../../../../../../../../D:/MUSIK/New/2/Goulding Burn.mp3'},
  {'icon': iconImage, 'title': 'Graig David & Sting Rise And Fall', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Graig David & Sting - Rise And Fall.mp3'},
  {'icon': iconImage, 'title': 'Gridlock', 'file': '../../../../../../../../D:/MUSIK/New/2/Gridlock.mp3'},
  {'icon': iconImage, 'title': 'Gunsn Roses Knocking On Heavens Door M', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Guns%27n Roses - Knocking On Heavens Door+M.mp3'},
  {'icon': iconImage, 'title': 'Gunsnroses Dont Cry', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Guns%27N%27Roses - Don%27t cry.mp3'},
  {'icon': iconImage, 'title': 'Hafanana', 'file': '../../../../../../../../D:/MUSIK/New/2/Hafanana.mp4'},
  {'icon': iconImage, 'title': 'Halo', 'file': '../../../../../../../../D:/MUSIK/New/2/Halo.mp3'},
  {'icon': iconImage, 'title': 'Happy New Year', 'file': '../../../../../../../../D:/MUSIK/New/2/Happy New Year.mp3'},
  {'icon': iconImage, 'title': 'Heaven', 'file': '../../../../../../../../D:/MUSIK/New/2/Heaven.mp3'},
  {'icon': iconImage, 'title': 'Heaven Is A Place On Earth', 'file': '../../../../../../../../D:/MUSIK/New/Heaven is a place on earth.mp3'},
  {'icon': iconImage, 'title': 'Help!', 'file': '../../../../../../../../D:/MUSIK/New/2/Help!.mp3'},
  {'icon': iconImage, 'title': 'Hey Mama', 'file': '../../../../../../../../D:/MUSIK/New/2/Hey-Mama.mp3'},
  {'icon': iconImage, 'title': 'Home Again', 'file': '../../../../../../../../D:/MUSIK/New/2/Home Again.mp3'},
  {'icon': iconImage, 'title': 'How You Remind Me', 'file': '../../../../../../../../D:/MUSIK/New/2/How You Remind Me.mp3'},
  {'icon': iconImage, 'title': 'Hungry Eyes', 'file': '../../../../../../../../D:/MUSIK/New/2/Hungry eyes.mp3'},
  {'icon': iconImage, 'title': 'I Disappear', 'file': '../../../../../../../../D:/MUSIK/New/2/I Disappear.MP3'},
  {'icon': iconImage, 'title': 'I Dont Want To Miss A Thing', 'file': '../../../../../../../../D:/MUSIK/New/2/I Don%27t Want to Miss a Thing.mp4'},
  {'icon': iconImage, 'title': 'I Saw You Dancing', 'file': '../../../../../../../../D:/MUSIK/New/2/I Saw You Dancing.mp3'},
  {'icon': iconImage, 'title': 'If You Leave Me Now', 'file': '../../../../../../../../D:/MUSIK/New/2/If You Leave Me Now.mp3'},
  {'icon': iconImage, 'title': 'Igels Hotel California (studio)', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Igels - Hotel California (studio).mp3'},
  {'icon': iconImage, 'title': 'Iggy Pop In The Death Car', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Iggy Pop - In The Death Car.mp3'},
  {'icon': iconImage, 'title': 'Iko Iko', 'file': '../../../../../../../../D:/MUSIK/New/2/Iko iko.mp3'},
  {'icon': iconImage, 'title': 'In The End', 'file': '../../../../../../../../D:/MUSIK/New/2/In the End.mp3'},
  {'icon': iconImage, 'title': 'In The Shadows', 'file': '../../../../../../../../D:/MUSIK/New/2/In The Shadows.mp3'},
  {'icon': iconImage, 'title': 'In The Summertime', 'file': '../../../../../../../../D:/MUSIK/New/2/In The Summertime.mp3'},
  {'icon': iconImage, 'title': 'It`s Raining Men', 'file': '../../../../../../../../D:/MUSIK/New/2/It`s raining men.mp3'},
  {'icon': iconImage, 'title': 'J Dassiin Et Si Tu Nexistais', 'file': '../../../../../../../../D:/MUSIK/New/Copy/J.Dassiin - Et si tu N%27existais.mp3'},
  {'icon': iconImage, 'title': 'Jason Donovan Scaled With A Kiss', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Jason Donovan - Scaled With A Kiss.mp3'},
  {'icon': iconImage, 'title': 'Joe Dassin A Toi', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Joe Dassin - A Toi.mp3'},
  {'icon': iconImage, 'title': 'Julio Iglesias Caruso', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Julio Iglesias - Caruso.MP3'},
  {'icon': iconImage, 'title': 'Ku Ku Djambo', 'file': '../../../../../../../../D:/MUSIK/New/2/Ku ku Djambo.mp3'},
  {'icon': iconImage, 'title': 'Kung Fu Fighting', 'file': '../../../../../../../../D:/MUSIK/New/2/Kung fu fighting.mp3'},
  {'icon': iconImage, 'title': 'La La La', 'file': '../../../../../../../../D:/MUSIK/New/2/La la la.mp3'},
  {'icon': iconImage, 'title': 'Lambada', 'file': '../../../../../../../../D:/MUSIK/New/2/Lambada.mp3'},
  {'icon': iconImage, 'title': 'Lauren Christy The Color ', 'file': '../../../../../../../../D:/MUSIK/New/Copy/LAUREN_CHRISTY___THE_COLOR_.MP3'},
  {'icon': iconImage, 'title': 'Layla', 'file': '../../../../../../../../D:/MUSIK/New/2/Layla.mp3'},
  {'icon': iconImage, 'title': 'Let It Snow!', 'file': '../../../../../../../../D:/MUSIK/New/2/Let It Snow!.mp3'},
  {'icon': iconImage, 'title': 'Lisa Miskovsky', 'file': '../../../../../../../../D:/MUSIK/New/2/Lisa_Miskovsky.mp3'},
  {'icon': iconImage, 'title': 'Livin La Vida Loca', 'file': '../../../../../../../../D:/MUSIK/New/2/Livin%27 La Vida Loca.mp3'},
  {'icon': iconImage, 'title': 'Logo1', 'file': '../../../../../../../../D:/MUSIK/New/G/LOGO1.mp3'},
  {'icon': iconImage, 'title': 'Logo2', 'file': '../../../../../../../../D:/MUSIK/New/G/LOGO2.mp3'},
  {'icon': iconImage, 'title': 'Lords Of The Boards', 'file': '../../../../../../../../D:/MUSIK/New/2/guano apes/Lords Of The Boards.mp3'},
  {'icon': iconImage, 'title': 'Love Me Like You Do', 'file': '../../../../../../../../D:/MUSIK/New/2/Love me like you do.mp3'},
  {'icon': iconImage, 'title': 'Macarena 1996', 'file': '../../../../../../../../D:/MUSIK/New/2/Macarena 1996.mp4'},
  {'icon': iconImage, 'title': 'Makarena', 'file': '../../../../../../../../D:/MUSIK/New/2/Makarena.mp3'},
  {'icon': iconImage, 'title': 'Mambo Italiano', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Romantic/Disco/Mambo Italiano.mp3'},
  {'icon': iconImage, 'title': 'Manic Monday', 'file': '../../../../../../../../D:/MUSIK/New/~sort/Manic Monday.mp4'},
  {'icon': iconImage, 'title': 'Maria Magdalen(ill Never Be)', 'file': '../../../../../../../../D:/MUSIK/New/2/Maria Magdalen(I%27ll Never Be).mp3'},
  {'icon': iconImage, 'title': 'Mariah Carey Without You ', 'file': '../../../../../../../../D:/MUSIK/New/Copy/MARIAH CAREY - WITHOUT YOU+.mp3'},
  {'icon': iconImage, 'title': 'Maywood Pasadena', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Maywood - Pasadena.mp3'},
  {'icon': iconImage, 'title': 'Metallica Nothing Else Matters', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Metallica - Nothing Else Matters.MP3'},
  {'icon': iconImage, 'title': 'Metallica The Unforgiven', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Metallica - The Unforgiven.MP3'},
  {'icon': iconImage, 'title': 'Mike Oldfield Moonlight Shadow', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Mike Oldfield - Moonlight Shadow.mp3'},
  {'icon': iconImage, 'title': 'Mon Mec A Moi', 'file': '../../../../../../../../D:/MUSIK/New/2/Mon Mec A Moi.mp3'},
  {'icon': iconImage, 'title': 'Moscow Never Sleeps', 'file': '../../../../../../../../D:/MUSIK/New/2/Moscow never sleeps.mp3'},
  {'icon': iconImage, 'title': 'Mr Big Wind World', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Mr.Big - Wind World.mp3'},
  {'icon': iconImage, 'title': 'Mr Black Wonderful Life ', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Mr. Black - Wonderful Life+.mp3'},
  {'icon': iconImage, 'title': 'My All', 'file': '../../../../../../../../D:/MUSIK/New/~sort/My All.mp4'},
  {'icon': iconImage, 'title': 'My Darkest Days Porn Star Dancing Myzuka Fm', 'file': '../../../../../../../../D:/MUSIK/New/2/my_darkest_days_porn_star_dancing_myzuka.fm.mp3'},
  {'icon': iconImage, 'title': 'Nick Cave & Kylie Minogue Where The Wild Roses Grow', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Nick Cave & Kylie Minogue - Where The Wild Roses Grow.mp3'},
  {'icon': iconImage, 'title': 'No Doubt Dont Speak', 'file': '../../../../../../../../D:/MUSIK/New/Copy/no_doubt_-_dont_speak.mp3'},
  {'icon': iconImage, 'title': 'No Doubt Dont Speak', 'file': '../../../../../../../../D:/MUSIK/New/Copy/No Doubt - Don%27t Speak.MP3'},
  {'icon': iconImage, 'title': 'No Doubt Ex Girlfriend', 'file': '../../../../../../../../D:/MUSIK/New/Copy/no_doubt_-_ex-girlfriend.mp3'},
  {'icon': iconImage, 'title': 'No Leaf Clover', 'file': '../../../../../../../../D:/MUSIK/New/2/No Leaf Clover.mp3'},
  {'icon': iconImage, 'title': 'Objection', 'file': '../../../../../../../../D:/MUSIK/New/2/Objection.mp3'},
  {'icon': iconImage, 'title': 'Ode To My Family', 'file': '../../../../../../../../D:/MUSIK/New/2/Ode To My Family.mp3'},
  {'icon': iconImage, 'title': 'Old Man', 'file': '../../../../../../../../D:/MUSIK/New/2/Old man.mp3'},
  {'icon': iconImage, 'title': 'Omen Mt Eden', 'file': '../../../../../../../../D:/MUSIK/New/2/Omen mt eden.mp3'},
  {'icon': iconImage, 'title': 'Once Upon A December', 'file': '../../../../../../../../D:/MUSIK/New/~sort/Once Upon a December.mp4'},
  {'icon': iconImage, 'title': 'Only Time', 'file': '../../../../../../../../D:/MUSIK/New/2/Only Time.mp3'},
  {'icon': iconImage, 'title': 'Overdrive', 'file': '../../../../../../../../D:/MUSIK/New/2/Overdrive.mp3'},
  {'icon': iconImage, 'title': 'Paul Mauriat Love Is Blue', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Paul Mauriat -Love Is Blue.mp3'},
  {'icon': iconImage, 'title': 'Paul Mauriat Love Is Blue', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Paul Mauriat - Love is Blue.mp3'},
  {'icon': iconImage, 'title': 'Paul Mauriat The Good The Bad The Ugly', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Paul Mauriat-The Good ,The  Bad, The Ugly.MP3'},
  {'icon': iconImage, 'title': 'Paul Mauriat Toccata', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Paul Mauriat - Toccata.mp3'},
  {'icon': iconImage, 'title': 'Pink Floyd Another Brick In The Wall (2)', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Pink Floyd - Another Brick In The Wall (2).mp3'},
  {'icon': iconImage, 'title': 'Put Your Lights On', 'file': '../../../../../../../../D:/MUSIK/New/Put Your Lights On.mp3'},
  {'icon': iconImage, 'title': 'Ray Parker Ghostbusters', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Ray Parker - Ghostbusters.mp3'},
  {'icon': iconImage, 'title': 'Rednex Wish You Were Here ', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Rednex - Wish You Were Here+.mp3'},
  {'icon': iconImage, 'title': 'Ricchi E Poveri Casa Mia', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Ricchi E Poveri - Casa Mia.mp3'},
  {'icon': iconImage, 'title': 'Ricchi E Poveri Mamma Mia', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Ricchi E Poveri - Mamma Mia.mp3'},
  {'icon': iconImage, 'title': 'Ricchi E Poveri Sara Perche Ti Amo', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Ricchi E Poveri - Sara Perche Ti Amo.mp3'},
  {'icon': iconImage, 'title': 'Rob D Clubbed To Death(kurayamino Mix)', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Rob D-Clubbed to death(kurayamino mix).MP3'},
  {'icon': iconImage, 'title': 'Robert Miles Children (dream Dance)', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Robert Miles - Children (Dream Dance).mp3'},
  {'icon': iconImage, 'title': 'Robert Myles Fable', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Robert Myles - Fable.mp3'},
  {'icon': iconImage, 'title': 'Rockstar', 'file': '../../../../../../../../D:/MUSIK/New/2/Rockstar.mp3'},
  {'icon': iconImage, 'title': 'Romance', 'file': '../../../../../../../../D:/MUSIK/New/~sort/MY CHEMICAL ROMANCE/Romance.mp3'},
  {'icon': iconImage, 'title': 'Sail', 'file': '../../../../../../../../D:/MUSIK/New/2/Sail.mp3'},
  {'icon': iconImage, 'title': 'Samba De Janeiro', 'file': '../../../../../../../../D:/MUSIK/New/2/Samba De Janeiro.mp4'},
  {'icon': iconImage, 'title': 'Sandra Nasic', 'file': '../../../../../../../../D:/MUSIK/New/2/guano apes/Sandra Nasic.mp3'},
  {'icon': iconImage, 'title': 'Scars', 'file': '../../../../../../../../D:/MUSIK/New/2/Scars.mp3'},
  {'icon': iconImage, 'title': 'Schwarze Sonne', 'file': '../../../../../../../../D:/MUSIK/New/2/Schwarze sonne.mp3'},
  {'icon': iconImage, 'title': 'Scorpions Still Loving You', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Scorpions - Still Loving You.mp3'},
  {'icon': iconImage, 'title': 'Self Control', 'file': '../../../../../../../../D:/MUSIK/New/2/Self Control.mp3'},
  {'icon': iconImage, 'title': 'Semi Sacred Geometry (female Singer Version)', 'file': '../../../../../../../../D:/MUSIK/New/G/Semi Sacred Geometry (Female Singer Version).mp4'},
  {'icon': iconImage, 'title': 'Shape Of My Heart', 'file': '../../../../../../../../D:/MUSIK/New/2/Shape of My Heart.mp3'},
  {'icon': iconImage, 'title': 'Show Must Go On', 'file': '../../../../../../../../D:/MUSIK/New/2/Show Must Go On.mp3'},
  {'icon': iconImage, 'title': 'Sixteen Tons', 'file': '../../../../../../../../D:/MUSIK/New/2/Sixteen Tons.mp3'},
  {'icon': iconImage, 'title': 'Slave To Live', 'file': '../../../../../../../../D:/MUSIK/New/2/Slave To Live.mp3'},
  {'icon': iconImage, 'title': 'Smack My Bitch Up', 'file': '../../../../../../../../D:/MUSIK/New/2/Smack my bitch up.mp3'},
  {'icon': iconImage, 'title': 'Smooth Criminal', 'file': '../../../../../../../../D:/MUSIK/New/2/Smooth Criminal.mp3'},
  {'icon': iconImage, 'title': 'Somebody That I Used To Know', 'file': '../../../../../../../../D:/MUSIK/New/2/Somebody that i used to know.mp3'},
  {'icon': iconImage, 'title': 'Someone To Save You', 'file': '../../../../../../../../D:/MUSIK/New/~sort/Dreaming Out Loud/Someone To Save You.mp3'},
  {'icon': iconImage, 'title': 'Somewhere I Belong', 'file': '../../../../../../../../D:/MUSIK/New/2/Somewhere I Belong.mp3'},
  {'icon': iconImage, 'title': 'Sonne', 'file': '../../../../../../../../D:/MUSIK/New/2/Sonne.mp3'},
  {'icon': iconImage, 'title': 'Stars Dance Myzuka', 'file': '../../../../../../../../D:/MUSIK/New/2/Stars dance myzuka.mp3'},
  {'icon': iconImage, 'title': 'Sting Fields Of Gold', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Sting - Fields Of Gold.mp3'},
  {'icon': iconImage, 'title': 'Storm', 'file': '../../../../../../../../D:/MUSIK/New/2/Storm.mp3'},
  {'icon': iconImage, 'title': 'Straight Up', 'file': '../../../../../../../../D:/MUSIK/New/2/Straight Up.mp3'},
  {'icon': iconImage, 'title': 'Summer', 'file': '../../../../../../../../D:/MUSIK/New/2/Summer.mp3'},
  {'icon': iconImage, 'title': 'Summertime Sadness', 'file': '../../../../../../../../D:/MUSIK/New/2/Summertime Sadness.mp3'},
  {'icon': iconImage, 'title': 'Syberian', 'file': '../../../../../../../../D:/MUSIK/New/2/Syberian.mp3'},
  {'icon': iconImage, 'title': 'Take A Look Around', 'file': '../../../../../../../../D:/MUSIK/New/2/Take A Look Around.mp3'},
  {'icon': iconImage, 'title': 'Takes Me Nowhere', 'file': '../../../../../../../../D:/MUSIK/New/2/Takes Me Nowhere.mp3'},
  {'icon': iconImage, 'title': 'Tanita Tikaram Twist In My Sobriety', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Tanita Tikaram - Twist in my sobriety.mp3'},
  {'icon': iconImage, 'title': 'Team Sleep The Passportal', 'file': '../../../../../../../../D:/MUSIK/New/~sort/Team sleep-The Passportal.mp3'},
  {'icon': iconImage, 'title': 'Teenagers', 'file': '../../../../../../../../D:/MUSIK/New/~sort/MY CHEMICAL ROMANCE/Teenagers.mp3'},
  {'icon': iconImage, 'title': 'The Bangles Eternal Flamme', 'file': '../../../../../../../../D:/MUSIK/New/Copy/The Bangles - Eternal Flamme.mp3'},
  {'icon': iconImage, 'title': 'The Beatles Yesterday', 'file': '../../../../../../../../D:/MUSIK/New/Copy/The Beatles - Yesterday.mp3'},
  {'icon': iconImage, 'title': 'The Experiment', 'file': '../../../../../../../../D:/MUSIK/New/G/The Experiment.mp3'},
  {'icon': iconImage, 'title': 'The Fall', 'file': '../../../../../../../../D:/MUSIK/New/2/The fall.mp3'},
  {'icon': iconImage, 'title': 'The Kids Arent Alright', 'file': '../../../../../../../../D:/MUSIK/New/2/The kids aren%27t alright.mp3'},
  {'icon': iconImage, 'title': 'The Lively Ones', 'file': '../../../../../../../../D:/MUSIK/New/2/The lively ones.mp3'},
  {'icon': iconImage, 'title': 'The Lonely Shepherd', 'file': '../../../../../../../../D:/MUSIK/New/2/The lonely shepherd.mp3'},
  {'icon': iconImage, 'title': 'The Memory Remains', 'file': '../../../../../../../../D:/MUSIK/New/2/The Memory Remains.mp3'},
  {'icon': iconImage, 'title': 'The New Order', 'file': '../../../../../../../../D:/MUSIK/New/G/The New Order.mp3'},
  {'icon': iconImage, 'title': 'The Night Before', 'file': '../../../../../../../../D:/MUSIK/New/2/The Night Before.mp3'},
  {'icon': iconImage, 'title': 'The Roy Orbison Medley', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Romantic/Disco/The Roy Orbison Medley.mp3'},
  {'icon': iconImage, 'title': 'The Show Must Go On', 'file': '../../../../../../../../D:/MUSIK/New/2/The Show Must Go On.mp3'},
  {'icon': iconImage, 'title': 'The Unforgiven', 'file': '../../../../../../../../D:/MUSIK/New/2/The Unforgiven.MP3'},
  {'icon': iconImage, 'title': 'There He Is', 'file': '../../../../../../../../D:/MUSIK/New/F/There he is.mp3'},
  {'icon': iconImage, 'title': 'This Is The New Shit', 'file': '../../../../../../../../D:/MUSIK/New/2/This is The New Shit.mp3'},
  {'icon': iconImage, 'title': 'Time', 'file': '../../../../../../../../D:/MUSIK/New/2/Time.mp3'},
  {'icon': iconImage, 'title': 'Time To Burn', 'file': '../../../../../../../../D:/MUSIK/New/2/Time to Burn.mp3'},
  {'icon': iconImage, 'title': 'Tony Braxton Unbreak My Heart', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Tony Braxton - UnBreak my Heart.mp3'},
  {'icon': iconImage, 'title': 'Touch By Touch', 'file': '../../../../../../../../D:/MUSIK/New/2/Touch by touch.mp3'},
  {'icon': iconImage, 'title': 'Towards The Sun', 'file': '../../../../../../../../D:/MUSIK/New/2/Towards the sun.mp3'},
  {'icon': iconImage, 'title': 'Tuyo', 'file': '../../../../../../../../D:/MUSIK/New/F/Tuyo.mp4'},
  {'icon': iconImage, 'title': 'Umbrella', 'file': '../../../../../../../../D:/MUSIK/New/2/Umbrella.mp3'},
  {'icon': iconImage, 'title': 'Unchain My Heart', 'file': '../../../../../../../../D:/MUSIK/New/Unchain My Heart.mp4'},
  {'icon': iconImage, 'title': 'Underneath Your Clothes', 'file': '../../../../../../../../D:/MUSIK/New/2/Underneath your clothes.mp3'},
  {'icon': iconImage, 'title': 'Vacuum I Breathe', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Vacuum - I Breathe.mp3'},
  {'icon': iconImage, 'title': 'Valkyrie', 'file': '../../../../../../../../D:/MUSIK/New/2/Valkyrie.mp3'},
  {'icon': iconImage, 'title': 'Van Canto', 'file': '../../../../../../../../D:/MUSIK/New/Van Canto.mp4'},
  {'icon': iconImage, 'title': 'Vangelis La Petite Fille De La Mer', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Vangelis - La Petite Fille De La Mer.mp3'},
  {'icon': iconImage, 'title': 'W Houston I Will Always Love You', 'file': '../../../../../../../../D:/MUSIK/New/Copy/W. Houston-I Will Always Love You.MP3'},
  {'icon': iconImage, 'title': 'Waltz (from Sleeping Beauty)', 'file': '../../../../../../../../D:/MUSIK/New/2/Waltz (From Sleeping Beauty).mp3'},
  {'icon': iconImage, 'title': 'We Are One Ole Ola', 'file': '../../../../../../../../D:/MUSIK/New/2/We are one ole ola.mp3'},
  {'icon': iconImage, 'title': 'We Will Rock You', 'file': '../../../../../../../../D:/MUSIK/New/2/We Will Rock You.mp3'},
  {'icon': iconImage, 'title': 'Welcome To My World Myzuka', 'file': '../../../../../../../../D:/MUSIK/New/2/Welcome to my world myzuka.mp3'},
  {'icon': iconImage, 'title': 'Welcome To The Black Parade', 'file': '../../../../../../../../D:/MUSIK/New/~sort/MY CHEMICAL ROMANCE/Welcome To The Black Parade.mp3'},
  {'icon': iconImage, 'title': 'West Bound And Down', 'file': '../../../../../../../../D:/MUSIK/New/2/west_bound_and_down.mp3'},
  {'icon': iconImage, 'title': 'West Coast', 'file': '../../../../../../../../D:/MUSIK/New/2/West coast.mp3'},
  {'icon': iconImage, 'title': 'What A Life', 'file': '../../../../../../../../D:/MUSIK/New/2/What A Life.mp3'},
  {'icon': iconImage, 'title': 'When I Dream', 'file': '../../../../../../../../D:/MUSIK/New/2/When I Dream.mp3'},
  {'icon': iconImage, 'title': 'Whenever Wherever', 'file': '../../../../../../../../D:/MUSIK/New/2/Whenever Wherever.mp3'},
  {'icon': iconImage, 'title': 'Whenever You Will Go', 'file': '../../../../../../../../D:/MUSIK/New/Whenever you will go.MP3'},
  {'icon': iconImage, 'title': 'Where The Wild Roses Grow', 'file': '../../../../../../../../D:/MUSIK/New/2/Where The Wild Roses Grow.mp3'},
  {'icon': iconImage, 'title': 'Whiskey In Jar', 'file': '../../../../../../../../D:/MUSIK/New/2/Whiskey In Jar.mp3'},
  {'icon': iconImage, 'title': 'Whitney Houston I Will Always Love You', 'file': '../../../../../../../../D:/MUSIK/New/Copy/Whitney Houston - I Will Always Love You.mp3'},
  {'icon': iconImage, 'title': 'Who Wants To Live Forever', 'file': '../../../../../../../../D:/MUSIK/New/2/Who Wants To Live Forever.mp3'},
  {'icon': iconImage, 'title': 'Wild Child', 'file': '../../../../../../../../D:/MUSIK/New/2/Wild Child.mp3'},
  {'icon': iconImage, 'title': 'Wind Of Change', 'file': '../../../../../../../../D:/MUSIK/New/2/Wind Of Change.mp3'},
  {'icon': iconImage, 'title': 'Word Up!', 'file': '../../../../../../../../D:/MUSIK/New/2/Word Up!.mp3'},
  {'icon': iconImage, 'title': 'Wrong', 'file': '../../../../../../../../D:/MUSIK/New/2/Wrong.mp3'},
  {'icon': iconImage, 'title': 'You Fly Me Up', 'file': '../../../../../../../../D:/MUSIK/New/2/You Fly Me Up.mp3'},
  {'icon': iconImage, 'title': 'You`re Not Alone', 'file': '../../../../../../../../D:/MUSIK/New/2/You`re not alone.mp3'},
  {'icon': iconImage, 'title': 'Youll Be Under My Wheels', 'file': '../../../../../../../../D:/MUSIK/New/2/Youll be under my wheels.mp3'},
  {'icon': iconImage, 'title': 'Young And Beautiful Myzuka', 'file': '../../../../../../../../D:/MUSIK/New/2/Young and beautiful myzuka.mp3'},
  {'icon': iconImage, 'title': 'Zombie', 'file': '../../../../../../../../D:/MUSIK/New/2/Zombie.mp3'},
  {'icon': iconImage, 'title': 'Безымянный', 'file': '../../../../../../../../D:/MUSIK/New/2/Безымянный.mp3'},
  {'icon': iconImage, 'title': 'Беспечный Ангел', 'file': '../../../../../../../../D:/MUSIK/New/2/Беспечный ангел.mp3'},
  {'icon': iconImage, 'title': 'Вальс Из Кф Мой Ласк Нежн Зверь', 'file': '../../../../../../../../D:/MUSIK/New/2/Вальс из кф Мой ласк нежн зверь.mp3'},
  {'icon': iconImage, 'title': 'Верхом На Звезде', 'file': '../../../../../../../../D:/MUSIK/New/2/Верхом на звезде.mp3'},
  {'icon': iconImage, 'title': 'Возьми Моё Сердце', 'file': '../../../../../../../../D:/MUSIK/New/2/Возьми моё сердце.mp3'},
  {'icon': iconImage, 'title': 'Волки', 'file': '../../../../../../../../D:/MUSIK/New/2/Волки.mp3'},
  {'icon': iconImage, 'title': 'Воспоминания О Былой Любви', 'file': '../../../../../../../../D:/MUSIK/New/2/Воспоминания о былой любви.mp3'},
  {'icon': iconImage, 'title': 'Выбрось Из Головы', 'file': '../../../../../../../../D:/MUSIK/New/2/Выбрось из головы.mp3'},
  {'icon': iconImage, 'title': 'Выхода Нет', 'file': '../../../../../../../../D:/MUSIK/New/2/Выхода нет.mp3'},
  {'icon': iconImage, 'title': 'Где Мы Летим', 'file': '../../../../../../../../D:/MUSIK/New/2/Где мы летим.mp3'},
  {'icon': iconImage, 'title': 'Движение', 'file': '../../../../../../../../D:/MUSIK/New/2/Движение.mp3'},
  {'icon': iconImage, 'title': 'Дыхание', 'file': '../../../../../../../../D:/MUSIK/New/2/Дыхание.mp3'},
  {'icon': iconImage, 'title': 'Зимняя Сказка', 'file': '../../../../../../../../D:/MUSIK/New/2/Зимняя сказка.mp3'},
  {'icon': iconImage, 'title': 'Кукла Колдуна', 'file': '../../../../../../../../D:/MUSIK/New/2/Кукла колдуна.mp3'},
  {'icon': iconImage, 'title': 'Лесник', 'file': '../../../../../../../../D:/MUSIK/New/2/Лесник.mp3'},
  {'icon': iconImage, 'title': 'Мне Бы В Небо', 'file': '../../../../../../../../D:/MUSIK/New/2/Мне Бы В Небо.mp3'},
  {'icon': iconImage, 'title': 'На Берегу Безымянной Реки', 'file': '../../../../../../../../D:/MUSIK/New/2/На Берегу Безымянной Реки.mp3'},
  {'icon': iconImage, 'title': 'Наши Детские Смешные Голоса', 'file': '../../../../../../../../D:/MUSIK/New/2/Наши детские смешные голоса.mp3'},
  {'icon': iconImage, 'title': 'Никогда', 'file': '../../../../../../../../D:/MUSIK/New/2/Никогда.mp3'},
  {'icon': iconImage, 'title': 'Ночная Дорога', 'file': '../../../../../../../../D:/MUSIK/New/2/Ночная дорога.mp3'},
  {'icon': iconImage, 'title': 'Позови Меня С Собой', 'file': '../../../../../../../../D:/MUSIK/New/2/Позови меня с собой.WAV'},
  {'icon': iconImage, 'title': 'Полковнику Никто Не Пишет', 'file': '../../../../../../../../D:/MUSIK/New/2/Полковнику никто не пишет.mp3'},
  {'icon': iconImage, 'title': 'Последняя Поэма', 'file': '../../../../../../../../D:/MUSIK/New/2/Последняя поэма.mp3'},
  {'icon': iconImage, 'title': 'Потерянный Рай', 'file': '../../../../../../../../D:/MUSIK/New/2/Потерянный рай.mp3'},
  {'icon': iconImage, 'title': 'Прогулки По Воде', 'file': '../../../../../../../../D:/MUSIK/New/2/Прогулки по воде.mp3'},
  {'icon': iconImage, 'title': 'Родная', 'file': '../../../../../../../../D:/MUSIK/New/2/Родная.mp3'},
  {'icon': iconImage, 'title': 'Серебряный Сентябрь', 'file': '../../../../../../../../D:/MUSIK/New/2/Серебряный сентябрь.mp3'},
  {'icon': iconImage, 'title': 'Там На Самом На Краю Земли', 'file': '../../../../../../../../D:/MUSIK/New/~sort/Там на самом на краю земли.mp4'},
  {'icon': iconImage, 'title': 'Три Полоски', 'file': '../../../../../../../../D:/MUSIK/New/2/Три полоски.mp3'},
  {'icon': iconImage, 'title': 'Тутанхамон', 'file': '../../../../../../../../D:/MUSIK/New/2/Тутанхамон.mp3'},
  {'icon': iconImage, 'title': 'Этот День', 'file': '../../../../../../../../D:/MUSIK/New/2/Этот день.mp3'},
  {'icon': iconImage, 'title': 'Я Здесь', 'file': '../../../../../../../../D:/MUSIK/New/2/Я здесь.mp3'},
]);
})

document.getElementById('nightwish').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '10th Man Down', 'file': '../../../../../../../../D:/MUSIK/Nightwish/2001 - Over The Hills And Far Away 2001/10th Man Down.mp3'},
  {'icon': iconImage, 'title': 'Bless The Child', 'file': '../../../../../../../../D:/MUSIK/Nightwish/2002 - Century Child 2002/Bless The Child.mp3'},
  {'icon': iconImage, 'title': 'Deep Silent Complete', 'file': '../../../../../../../../D:/MUSIK/Nightwish/2001 - From Wishes To Eternity (Live)/Deep Silent Complete.mp3'},
  {'icon': iconImage, 'title': 'High Hopes', 'file': '../../../../../../../../D:/MUSIK/Nightwish/2006 - End of an Era live/High Hopes.mp3'},
  {'icon': iconImage, 'title': 'Know Why The Nightingale Sings !', 'file': '../../../../../../../../D:/MUSIK/Nightwish/1997 - Angels Fall First/Know Why The Nightingale Sings !.mp3'},
  {'icon': iconImage, 'title': 'Outro', 'file': '../../../../../../../../D:/MUSIK/Nightwish/2001 - Live At Gorbunov%27s Palace Of Culture/Outro.mp3'},
  {'icon': iconImage, 'title': 'Phantom Of The Opera', 'file': '../../../../../../../../D:/MUSIK/Nightwish/2006 - End of an Era live/Phantom of the Opera.mp3'},
  {'icon': iconImage, 'title': 'Planet Hell', 'file': '../../../../../../../../D:/MUSIK/Nightwish/2004 - Nemo/Planet Hell.mp3'},
]);
})

document.getElementById('petshopboys').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Always On My Mind', 'file': '../../../../../../../../D:/MUSIK/Pet Shop Boys/Always on my mind.mp3'},
  {'icon': iconImage, 'title': 'Can You Forgive Her', 'file': '../../../../../../../../D:/MUSIK/Pet Shop Boys/Can you forgive her.mp3'},
  {'icon': iconImage, 'title': 'Go West', 'file': '../../../../../../../../D:/MUSIK/Pet Shop Boys/Go west.mp3'},
  {'icon': iconImage, 'title': 'Its A Sin', 'file': '../../../../../../../../D:/MUSIK/Pet Shop Boys/It%27s a Sin.mp4'},
  {'icon': iconImage, 'title': 'Its A Sin', 'file': '../../../../../../../../D:/MUSIK/Pet Shop Boys/It%27s a sin.mp3'},
  {'icon': iconImage, 'title': 'Kind Of Thing', 'file': '../../../../../../../../D:/MUSIK/Pet Shop Boys/Kind of thing.mp3'},
  {'icon': iconImage, 'title': 'Liberation', 'file': '../../../../../../../../D:/MUSIK/Pet Shop Boys/Liberation.mp3'},
  {'icon': iconImage, 'title': 'One In A Million', 'file': '../../../../../../../../D:/MUSIK/Pet Shop Boys/One in a million.mp3'},
  {'icon': iconImage, 'title': 'Point Of View', 'file': '../../../../../../../../D:/MUSIK/Pet Shop Boys/Point of view.mp3'},
  {'icon': iconImage, 'title': 'Queen', 'file': '../../../../../../../../D:/MUSIK/Pet Shop Boys/Queen.mp3'},
  {'icon': iconImage, 'title': 'The Theatre', 'file': '../../../../../../../../D:/MUSIK/Pet Shop Boys/The theatre.mp3'},
  {'icon': iconImage, 'title': 'To Speak Is A Sin', 'file': '../../../../../../../../D:/MUSIK/Pet Shop Boys/To speak is a sin.mp3'},
  {'icon': iconImage, 'title': 'Yesterday', 'file': '../../../../../../../../D:/MUSIK/Pet Shop Boys/Yesterday.mp3'},
]);
})

document.getElementById('piano').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '10 Memes Songs', 'file': '../../../../../../../../D:/MUSIK/Piano/10 Memes Songs.webm'},
  {'icon': iconImage, 'title': '17 Мгновений Весны Seventeen Moments Of Spring (piano)', 'file': '../../../../../../../../D:/MUSIK/Piano/pn/17 мгновений весны - Seventeen Moments of Spring (piano).mp4'},
  {'icon': iconImage, 'title': '5 Reasons Why Piano Is The Easiest Instrument', 'file': '../../../../../../../../D:/MUSIK/Piano/5 Reasons Why Piano is the Easiest Instrument.mp4'},
  {'icon': iconImage, 'title': 'Ac Dc Back In Black (piano Cover By Gamazda)', 'file': '../../../../../../../../D:/MUSIK/Piano/AC_DC - Back In Black (Piano cover by Gamazda).mp4'},
  {'icon': iconImage, 'title': 'Batman V Superman Beautiful Lie (piano Version) Sheet Music', 'file': '../../../../../../../../D:/MUSIK/Piano/Batman v Superman - Beautiful Lie (Piano Version) + Sheet Music.mp4'},
  {'icon': iconImage, 'title': 'Braveheart Main Theme (piano Version)', 'file': '../../../../../../../../D:/MUSIK/Piano/pn/Braveheart - Main Theme (Piano Version).mp4'},
  {'icon': iconImage, 'title': 'Children', 'file': '../../../../../../../../D:/MUSIK/Piano/Children.webm'},
  {'icon': iconImage, 'title': 'Children', 'file': '../../../../../../../../D:/MUSIK/Piano/pn/Children.mp4'},
  {'icon': iconImage, 'title': 'Ecstasy Of Gold (piano Tutorial Lesson) Ennio Morricone', 'file': '../../../../../../../../D:/MUSIK/Piano/Ecstasy of Gold (Piano Tutorial Lesson) Ennio Morricone.mp4'},
  {'icon': iconImage, 'title': 'Every Breath You Take Piano Tutorial', 'file': '../../../../../../../../D:/MUSIK/Piano/Every Breath You Take - Piano Tutorial.webm'},
  {'icon': iconImage, 'title': 'Friend Like Me (from Aladdin) Piano Tutorial', 'file': '../../../../../../../../D:/MUSIK/Piano/Friend Like Me (from Aladdin) - Piano Tutorial.webm'},
  {'icon': iconImage, 'title': 'Game Of Thrones Theme Piano Tutorial', 'file': '../../../../../../../../D:/MUSIK/Piano/GAME OF THRONES THEME - Piano Tutorial.mp4'},
  {'icon': iconImage, 'title': 'Get Over It (guitar Cover)', 'file': '../../../../../../../../D:/MUSIK/Piano/Get Over It (Guitar Cover).mp4'},
  {'icon': iconImage, 'title': 'Get Over It (piano Version)', 'file': '../../../../../../../../D:/MUSIK/Piano/Get over it (Piano version).mp4'},
  {'icon': iconImage, 'title': 'Guns N Roses Dont Cry (piano Cover By Gamazda)', 'file': '../../../../../../../../D:/MUSIK/Piano/Guns N%27 Roses - Don%27t Cry (Piano cover by Gamazda).mp4'},
  {'icon': iconImage, 'title': 'Guns N Roses Sweet Child O Mine (piano Cover By Gamazda)', 'file': '../../../../../../../../D:/MUSIK/Piano/Guns N%27 Roses - Sweet Child O%27 Mine (Piano cover by Gamazda).mp4'},
  {'icon': iconImage, 'title': 'How To Make A Girl Smile', 'file': '../../../../../../../../D:/MUSIK/Piano/How to Make a Girl Smile.mp4'},
  {'icon': iconImage, 'title': 'I Dont Want To Miss A Thing (piano Сover)', 'file': '../../../../../../../../D:/MUSIK/Piano/pn/I Don%27t Want to Miss a Thing (Piano Сover).mp4'},
  {'icon': iconImage, 'title': 'In The Hall Of The Mountain King Piano Tutorial', 'file': '../../../../../../../../D:/MUSIK/Piano/IN THE HALL OF THE MOUNTAIN KING - Piano Tutorial.mp4'},
  {'icon': iconImage, 'title': 'Inception Time (piano Version) Sheet Music', 'file': '../../../../../../../../D:/MUSIK/Piano/Inception - Time (Piano Version) + Sheet Music.mp4'},
  {'icon': iconImage, 'title': 'Interstellar Main Theme (piano Version) Sheet Music', 'file': '../../../../../../../../D:/MUSIK/Piano/Interstellar - Main Theme (Piano Version) + Sheet Music.mp4'},
  {'icon': iconImage, 'title': 'Iron Maiden The Trooper (piano Cover)', 'file': '../../../../../../../../D:/MUSIK/Piano/Iron Maiden - The Trooper (Piano cover).mp4'},
  {'icon': iconImage, 'title': 'Island My Name Is Lincoln', 'file': '../../../../../../../../D:/MUSIK/Piano/Island - My Name is Lincoln.mp4'},
  {'icon': iconImage, 'title': 'King Of Pride Rock (from The Lion King) Piano Tutorial', 'file': '../../../../../../../../D:/MUSIK/Piano/King of Pride Rock (from The Lion King) - Piano Tutorial.webm'},
  {'icon': iconImage, 'title': 'Kraken', 'file': '../../../../../../../../D:/MUSIK/Piano/Kraken.mp4'},
  {'icon': iconImage, 'title': 'Kraken Hans Zimmer [piano Tutorial] (synthesia) Hd Cover', 'file': '../../../../../../../../D:/MUSIK/Piano/Kraken - Hans Zimmer [Piano Tutorial] (Synthesia) HD Cover.mp4'},
  {'icon': iconImage, 'title': 'Krakensynthesia [piano Tutorial] Pirates Of The Caribbean ', 'file': '../../../../../../../../D:/MUSIK/Piano/KrakenSynthesia [Piano Tutorial] Pirates Of The Caribbean - .webm'},
  {'icon': iconImage, 'title': 'Linkin Park In The End (piano Cover By Gamazda)', 'file': '../../../../../../../../D:/MUSIK/Piano/Linkin Park - In The End (Piano cover by Gamazda).mp4'},
  {'icon': iconImage, 'title': 'Listen To Your Heart (piano Cover)', 'file': '../../../../../../../../D:/MUSIK/Piano/pn/Listen To Your Heart (Piano cover).mp4'},
  {'icon': iconImage, 'title': 'Listen To Your Heart (piano Cover)', 'file': '../../../../../../../../D:/MUSIK/Piano/Listen To Your Heart (Piano cover).mp4'},
  {'icon': iconImage, 'title': 'Mein Herz Brennt Rammstein Piano Tutoria', 'file': '../../../../../../../../D:/MUSIK/Piano/Mein Herz Brennt - Rammstein - Piano Tutoria.mp4'},
  {'icon': iconImage, 'title': 'Moskau Piano Tutorial', 'file': '../../../../../../../../D:/MUSIK/Piano/MOSKAU - Piano Tutorial.mp4'},
  {'icon': iconImage, 'title': 'Now We Are Free', 'file': '../../../../../../../../D:/MUSIK/Piano/Now We Are Free.mp4'},
  {'icon': iconImage, 'title': 'Once Upon A December', 'file': '../../../../../../../../D:/MUSIK/Piano/Once Upon a December.mp4'},
  {'icon': iconImage, 'title': 'Pirates Of The Caribbean Hes A Pirate Piano Tutorial', 'file': '../../../../../../../../D:/MUSIK/Piano/PIRATES OF THE CARIBBEAN - HE%27S A PIRATE - Piano Tutorial.mp4'},
  {'icon': iconImage, 'title': 'Polonaise Farewell To My Homeland (poegnanie Ojczyzny) Youtube', 'file': '../../../../../../../../D:/MUSIK/Piano/pn/Polonaise Farewell to My Homeland (Poegnanie Ojczyzny) - YouTube.mp4'},
  {'icon': iconImage, 'title': 'Polonez Oginskogo Piano Tutorial Youtube', 'file': '../../../../../../../../D:/MUSIK/Piano/pn/Polonez Oginskogo Piano Tutorial - YouTube.mp4'},
  {'icon': iconImage, 'title': 'Por Una Cabeza (piano) Tango Carlos Gardel', 'file': '../../../../../../../../D:/MUSIK/Piano/pn/Por una Cabeza (Piano) - Tango -- CARLOS GARDEL.mp4'},
  {'icon': iconImage, 'title': 'Red Hot Chili Peppers Cant Stop (piano Cover By Gamazda)', 'file': '../../../../../../../../D:/MUSIK/Piano/Red Hot Chili Peppers - Can%27t Stop (Piano cover by Gamazda).mp4'},
  {'icon': iconImage, 'title': 'Summer The Four Seasons', 'file': '../../../../../../../../D:/MUSIK/Piano/Summer   The Four Seasons.mp4'},
  {'icon': iconImage, 'title': 'Super Mario Bros Medley Piano Tutorial', 'file': '../../../../../../../../D:/MUSIK/Piano/SUPER MARIO BROS MEDLEY - Piano Tutorial.mp4'},
  {'icon': iconImage, 'title': 'Super Mario On Piano With Sound Effects', 'file': '../../../../../../../../D:/MUSIK/Piano/Super Mario on Piano With Sound Effects.mp4'},
  {'icon': iconImage, 'title': 'Teardrop (cover)', 'file': '../../../../../../../../D:/MUSIK/Piano/Teardrop (Cover).mp4'},
  {'icon': iconImage, 'title': 'Thank You For The Music Piano Tutorial', 'file': '../../../../../../../../D:/MUSIK/Piano/Thank You For The Music - Piano Tutorial.webm'},
  {'icon': iconImage, 'title': 'The Ecstasy Of Gold', 'file': '../../../../../../../../D:/MUSIK/Piano/The Ecstasy of Gold .mp4'},
  {'icon': iconImage, 'title': 'The Offspring The Kids Arent Alright (piano Cover)', 'file': '../../../../../../../../D:/MUSIK/Piano/pn/The Offspring - The Kids Aren%27t Alright (Piano Cover).mp4'},
  {'icon': iconImage, 'title': 'This Land', 'file': '../../../../../../../../D:/MUSIK/Piano/This Land.webm'},
  {'icon': iconImage, 'title': 'Top 7 Most Bizarre Musical Instruments Of The World', 'file': '../../../../../../../../D:/MUSIK/Piano/Top 7 Most Bizarre Musical Instruments of the World.mp4'},
  {'icon': iconImage, 'title': 'What A Life', 'file': '../../../../../../../../D:/MUSIK/Piano/What A Life.mp4'},
  {'icon': iconImage, 'title': 'Winter The Four Seasons', 'file': '../../../../../../../../D:/MUSIK/Piano/Winter   The Four Seasons.mp4'},
  {'icon': iconImage, 'title': 'В Последнюю Осень (piano Cover) Ноты', 'file': '../../../../../../../../D:/MUSIK/Piano/В последнюю осень (PIANO COVER) +Ноты.mp4'},
  {'icon': iconImage, 'title': 'В Последнюю Осень By Piano', 'file': '../../../../../../../../D:/MUSIK/Piano/в последнюю осень by piano.mp4'},
  {'icon': iconImage, 'title': 'Двое В Кафе М Таривердиев (ноты И Видеоурок Для Фортепиано) (piano Cover)', 'file': '../../../../../../../../D:/MUSIK/Piano/Двое в кафе - М. Таривердиев (Ноты и Видеоурок для фортепиано) (piano cover).mp4'},
  {'icon': iconImage, 'title': 'Полонез Огинского', 'file': '../../../../../../../../D:/MUSIK/Piano/Полонез Огинского.mp4'},
  {'icon': iconImage, 'title': 'Следствие Ведут Колобки', 'file': '../../../../../../../../D:/MUSIK/Piano/Следствие ведут колобки%27.mp4'},
  {'icon': iconImage, 'title': 'Токката – Поль Мориа', 'file': '../../../../../../../../D:/MUSIK/Piano/Токката – Поль Мориа.mp4'},
]);
})

document.getElementById('pinkfloyd').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A Great Day For Freedom', 'file': '../../../../../../../../D:/MUSIK/Pink Floyd/1995 - P.U.L.S.E/A Great Day For Freedom.mp3'},
  {'icon': iconImage, 'title': 'Another Brick In The Wall (i)', 'file': '../../../../../../../../D:/MUSIK/Pink Floyd/The Wall/Another Brick In The Wall (I).mp3'},
  {'icon': iconImage, 'title': 'Another Brick In The Wall (ii)', 'file': '../../../../../../../../D:/MUSIK/Pink Floyd/The Wall/Another Brick In The Wall (II).mp3'},
  {'icon': iconImage, 'title': 'Another Brick In The Wall (iii)', 'file': '../../../../../../../../D:/MUSIK/Pink Floyd/The Wall/Another Brick In The Wall (III).mp3'},
  {'icon': iconImage, 'title': 'High Hopes', 'file': '../../../../../../../../D:/MUSIK/Pink Floyd/1995 - P.U.L.S.E/High Hopes.mp3'},
  {'icon': iconImage, 'title': 'Not Naw John', 'file': '../../../../../../../../D:/MUSIK/Pink Floyd/The Final Cut/Not Naw John.mp3'},
  {'icon': iconImage, 'title': 'Shine On Your Crazy Diamond', 'file': '../../../../../../../../D:/MUSIK/Pink Floyd/1995 - P.U.L.S.E/Shine On Your Crazy Diamond.mp3'},
  {'icon': iconImage, 'title': 'Summer68', 'file': '../../../../../../../../D:/MUSIK/Pink Floyd/Atom Heart Mother/Summer%2768.mp3'},
  {'icon': iconImage, 'title': 'Us And Them', 'file': '../../../../../../../../D:/MUSIK/Pink Floyd/1995 - P.U.L.S.E II/Us And Them.mp3'},
]);
})

document.getElementById('queen').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '01 Bohemian Rapsody', 'file': '../../../../../../../../D:/MUSIK/Queen/1978 - Jazz/01 Bohemian Rapsody.mp3'},
  {'icon': iconImage, 'title': '01 Mustapha', 'file': '../../../../../../../../D:/MUSIK/Queen/1978 - Jazz/01 Mustapha.mp3'},
  {'icon': iconImage, 'title': '02 Bohemian Rhapsody', 'file': '../../../../../../../../D:/MUSIK/Queen/1978 - Jazz/02 Bohemian rhapsody.mp3'},
  {'icon': iconImage, 'title': '04 Bohemian Rhapsody', 'file': '../../../../../../../../D:/MUSIK/Queen/1978 - Jazz/04 Bohemian Rhapsody.mp3'},
  {'icon': iconImage, 'title': '06 Bohemian Rhapsody', 'file': '../../../../../../../../D:/MUSIK/Queen/1978 - Jazz/06 Bohemian Rhapsody.mp3'},
  {'icon': iconImage, 'title': '11 Bohemian Rhapsody', 'file': '../../../../../../../../D:/MUSIK/Queen/1978 - Jazz/11 Bohemian Rhapsody.mp3'},
  {'icon': iconImage, 'title': 'A Kind Of Magic', 'file': '../../../../../../../../D:/MUSIK/Queen/A Kind Of Magic.mp3'},
  {'icon': iconImage, 'title': 'A Kind Of Magic', 'file': '../../../../../../../../D:/MUSIK/Queen/1986 - A Kind Of Magic/A Kind Of Magic.mp3'},
  {'icon': iconImage, 'title': 'Crazy Litttle Thing Called Love', 'file': '../../../../../../../../D:/MUSIK/Queen/1992 - Cry Argentina/Crazy litttle thing called love.mp3'},
  {'icon': iconImage, 'title': 'Forever', 'file': '../../../../../../../../D:/MUSIK/Queen/Forever.mp3'},
  {'icon': iconImage, 'title': 'Friends Will Be Friends', 'file': '../../../../../../../../D:/MUSIK/Queen/Friends Will Be Friends.mp3'},
  {'icon': iconImage, 'title': 'Friends Will Be Friends', 'file': '../../../../../../../../D:/MUSIK/Queen/1992 - Live At Wembley %2786/Friends Will Be Friends.mp3'},
  {'icon': iconImage, 'title': 'I Want It All', 'file': '../../../../../../../../D:/MUSIK/Queen/1989 - The Miracle/I want it all.mp3'},
  {'icon': iconImage, 'title': 'My Life Has Been Saved', 'file': '../../../../../../../../D:/MUSIK/Queen/1995 - Made In Heaven/My Life Has Been Saved.mp3'},
  {'icon': iconImage, 'title': 'My Life Has Been Saved', 'file': '../../../../../../../../D:/MUSIK/Queen/My Life Has Been Saved.mp3'},
  {'icon': iconImage, 'title': 'One Vision', 'file': '../../../../../../../../D:/MUSIK/Queen/1992 - Classic Queen/One Vision.mp3'},
  {'icon': iconImage, 'title': 'One Year Of Life', 'file': '../../../../../../../../D:/MUSIK/Queen/One year of life.mp3'},
  {'icon': iconImage, 'title': 'Show Must Go On', 'file': '../../../../../../../../D:/MUSIK/Queen/Show Must Go On.mp3'},
  {'icon': iconImage, 'title': 'Somebody To Love', 'file': '../../../../../../../../D:/MUSIK/Queen/1976 - A Day At The Races/Somebody to love.mp3'},
  {'icon': iconImage, 'title': 'The Show Must Go On', 'file': '../../../../../../../../D:/MUSIK/Queen/1991 - Greatest Hits II/The Show Must Go On.mp3'},
  {'icon': iconImage, 'title': 'The Show Must Go On', 'file': '../../../../../../../../D:/MUSIK/Queen/The Show Must Go On.mp4'},
  {'icon': iconImage, 'title': 'Under Pressure', 'file': '../../../../../../../../D:/MUSIK/Queen/1982 - Hot Space/Under Pressure.mp3'},
  {'icon': iconImage, 'title': 'Universe', 'file': '../../../../../../../../D:/MUSIK/Queen/Universe.mp3'},
  {'icon': iconImage, 'title': 'We Are The Champions', 'file': '../../../../../../../../D:/MUSIK/Queen/1979 - Live Killers/We Are The Champions.mp3'},
  {'icon': iconImage, 'title': 'We Will Rock You', 'file': '../../../../../../../../D:/MUSIK/Queen/We Will Rock You.mp3'},
  {'icon': iconImage, 'title': 'We Will Rock You', 'file': '../../../../../../../../D:/MUSIK/Queen/1981 - Greatest Hits I/We Will Rock You.mp3'},
  {'icon': iconImage, 'title': 'Who Wants To Live Forever', 'file': '../../../../../../../../D:/MUSIK/Queen/Who Wants To Live Forever.mp3'},
  {'icon': iconImage, 'title': 'Who Wants To Live Forever', 'file': '../../../../../../../../D:/MUSIK/Queen/1986 - A Kind Of Magic/Who Wants To Live Forever.mp3'},
]);
})

document.getElementById('radio').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A Mix Of Rock Song', 'file': '../../../../../../../../D:/MUSIK/RADIO/A mix of rock song.mp3'},
  {'icon': iconImage, 'title': 'A New Day Has Come', 'file': '../../../../../../../../D:/MUSIK/RADIO/A new day has come.mp3'},
  {'icon': iconImage, 'title': 'A Pain That Im Used To', 'file': '../../../../../../../../D:/MUSIK/RADIO/Depeche mode/2005 - Playing The Angel/A  Pain That I%27m Used To.mp3'},
  {'icon': iconImage, 'title': 'A Thing About You', 'file': '../../../../../../../../D:/MUSIK/RADIO/Roxette/Bonus/A Thing About You.mp3'},
  {'icon': iconImage, 'title': 'Abro Kadabro', 'file': '../../../../../../../../D:/MUSIK/RADIO/ABRO KADABRO.mp3'},
  {'icon': iconImage, 'title': 'All Or Nothing', 'file': '../../../../../../../../D:/MUSIK/RADIO/All Or Nothing.mp3'},
  {'icon': iconImage, 'title': 'Alleine Zu Zweit', 'file': '../../../../../../../../D:/MUSIK/RADIO/Alleine Zu Zweit.mp3'},
  {'icon': iconImage, 'title': 'Apocalyptica', 'file': '../../../../../../../../D:/MUSIK/RADIO/Apocalyptica.mp3'},
  {'icon': iconImage, 'title': 'Around The World', 'file': '../../../../../../../../D:/MUSIK/RADIO/Around the world.mp3'},
  {'icon': iconImage, 'title': 'Bamboleo', 'file': '../../../../../../../../D:/MUSIK/RADIO/Bamboleo.mp3'},
  {'icon': iconImage, 'title': 'Barbie Girl', 'file': '../../../../../../../../D:/MUSIK/RADIO/Barbie Girl.mp3'},
  {'icon': iconImage, 'title': 'Bitter Sweet Symphony', 'file': '../../../../../../../../D:/MUSIK/RADIO/Bitter Sweet Symphony.mp3'},
  {'icon': iconImage, 'title': 'Black Or White', 'file': '../../../../../../../../D:/MUSIK/RADIO/Black or White.mp3'},
  {'icon': iconImage, 'title': 'Born To Touch Your Feelings', 'file': '../../../../../../../../D:/MUSIK/RADIO/ScorpionS/Born To Touch Your Feelings.mp3'},
  {'icon': iconImage, 'title': 'Broken Promises', 'file': '../../../../../../../../D:/MUSIK/RADIO/Broken Promises.mp3'},
  {'icon': iconImage, 'title': 'Bumble Bees', 'file': '../../../../../../../../D:/MUSIK/RADIO/Bumble bees.mp3'},
  {'icon': iconImage, 'title': 'Bye Bye Bye', 'file': '../../../../../../../../D:/MUSIK/RADIO/Bye Bye Bye.mp3'},
  {'icon': iconImage, 'title': 'California Dreaming', 'file': '../../../../../../../../D:/MUSIK/RADIO/California Dreaming.mp3'},
  {'icon': iconImage, 'title': 'Calling', 'file': '../../../../../../../../D:/MUSIK/RADIO/Calling.mp3'},
  {'icon': iconImage, 'title': 'Cara Mia', 'file': '../../../../../../../../D:/MUSIK/RADIO/Cara Mia.mp3'},
  {'icon': iconImage, 'title': 'Careless Whispe', 'file': '../../../../../../../../D:/MUSIK/RADIO/Careless Whispe.mp3'},
  {'icon': iconImage, 'title': 'Celebrate The Love', 'file': '../../../../../../../../D:/MUSIK/RADIO/Celebrate the Love.mp3'},
  {'icon': iconImage, 'title': 'Chikago', 'file': '../../../../../../../../D:/MUSIK/RADIO/Chikago.mp3'},
  {'icon': iconImage, 'title': 'Children', 'file': '../../../../../../../../D:/MUSIK/RADIO/Children.mp3'},
  {'icon': iconImage, 'title': 'Clint Eastwood', 'file': '../../../../../../../../D:/MUSIK/RADIO/Clint Eastwood.mp3'},
  {'icon': iconImage, 'title': 'Clubbed To Death', 'file': '../../../../../../../../D:/MUSIK/RADIO/Clubbed To Death.mp3'},
  {'icon': iconImage, 'title': 'Crash Boom Bang', 'file': '../../../../../../../../D:/MUSIK/RADIO/Roxette/1994 - Crash Boom Bang/Crash Boom Bang.mp3'},
  {'icon': iconImage, 'title': 'Da Di Dam', 'file': '../../../../../../../../D:/MUSIK/RADIO/Da di dam.mp3'},
  {'icon': iconImage, 'title': 'Daddy Dj', 'file': '../../../../../../../../D:/MUSIK/RADIO/Daddy DJ.mp3'},
  {'icon': iconImage, 'title': 'Darkseed', 'file': '../../../../../../../../D:/MUSIK/RADIO/DARKSEED.mp3'},
  {'icon': iconImage, 'title': 'Dasboot', 'file': '../../../../../../../../D:/MUSIK/RADIO/Dasboot.mp3'},
  {'icon': iconImage, 'title': 'Desenchantee', 'file': '../../../../../../../../D:/MUSIK/RADIO/Desenchantee.mp3'},
  {'icon': iconImage, 'title': 'Desert Rose', 'file': '../../../../../../../../D:/MUSIK/RADIO/Desert Rose.mp3'},
  {'icon': iconImage, 'title': 'Disco Superstar', 'file': '../../../../../../../../D:/MUSIK/RADIO/Disco Superstar.mp3'},
  {'icon': iconImage, 'title': 'Diva', 'file': '../../../../../../../../D:/MUSIK/RADIO/Diva.mp3'},
  {'icon': iconImage, 'title': 'Do What U Want', 'file': '../../../../../../../../D:/MUSIK/RADIO/Do what u want.mp3'},
  {'icon': iconImage, 'title': 'Don`t Play Your Rock`n` Roll To Me', 'file': '../../../../../../../../D:/MUSIK/RADIO/Don`t Play Your Rock`n` Roll To Me.mp3'},
  {'icon': iconImage, 'title': 'Dont Speak', 'file': '../../../../../../../../D:/MUSIK/RADIO/Don%27t speak.mp3'},
  {'icon': iconImage, 'title': 'Dragostea Din Tei', 'file': '../../../../../../../../D:/MUSIK/RADIO/Dragostea Din Tei.MP3'},
  {'icon': iconImage, 'title': 'Eagleheart', 'file': '../../../../../../../../D:/MUSIK/RADIO/Eagleheart.mp3'},
  {'icon': iconImage, 'title': 'Feel', 'file': '../../../../../../../../D:/MUSIK/RADIO/Feel.mp3'},
  {'icon': iconImage, 'title': 'Fight For All The Wrong Reasons', 'file': '../../../../../../../../D:/MUSIK/RADIO/Nickelback/2005 - All The Right Reasons/Fight For All The Wrong Reasons.mp3'},
  {'icon': iconImage, 'title': 'Fire', 'file': '../../../../../../../../D:/MUSIK/RADIO/Fire.mp3'},
  {'icon': iconImage, 'title': 'Five&queen Rock Uconnect U', 'file': '../../../../../../../../D:/MUSIK/RADIO/FIVE&QUEEN-Rock U,Connect U.mp3'},
  {'icon': iconImage, 'title': 'Flames Of Love', 'file': '../../../../../../../../D:/MUSIK/RADIO/Flames of Love.mp3'},
  {'icon': iconImage, 'title': 'Flashdance', 'file': '../../../../../../../../D:/MUSIK/RADIO/Flashdance.mp3'},
  {'icon': iconImage, 'title': 'Fly On The Wings Of Love', 'file': '../../../../../../../../D:/MUSIK/RADIO/Fly On The Wings Of Love.mp3'},
  {'icon': iconImage, 'title': 'Forever Young', 'file': '../../../../../../../../D:/MUSIK/RADIO/Forever Young.mp3'},
  {'icon': iconImage, 'title': 'Fragile', 'file': '../../../../../../../../D:/MUSIK/RADIO/Fragile.mp3'},
  {'icon': iconImage, 'title': 'Freestyler', 'file': '../../../../../../../../D:/MUSIK/RADIO/Freestyler.mp3'},
  {'icon': iconImage, 'title': 'From Sarah With Love', 'file': '../../../../../../../../D:/MUSIK/RADIO/From Sarah with love.mp3'},
  {'icon': iconImage, 'title': 'Get A Job', 'file': '../../../../../../../../D:/MUSIK/RADIO/Get a Job.mp3'},
  {'icon': iconImage, 'title': 'Gone With The Sin', 'file': '../../../../../../../../D:/MUSIK/RADIO/H.I.M/Razorblade Romance/Gone With The Sin.mp3'},
  {'icon': iconImage, 'title': 'Hafanana', 'file': '../../../../../../../../D:/MUSIK/RADIO/Hafanana.mp3'},
  {'icon': iconImage, 'title': 'Happy Nation', 'file': '../../../../../../../../D:/MUSIK/RADIO/Happy Nation.mp3'},
  {'icon': iconImage, 'title': 'Harumamburu', 'file': '../../../../../../../../D:/MUSIK/RADIO/Harumamburu.mp3'},
  {'icon': iconImage, 'title': 'Heartache Every Moment', 'file': '../../../../../../../../D:/MUSIK/RADIO/H.I.M/Deep Shadows And Brilliant Highlights/Heartache Every Moment.mp3'},
  {'icon': iconImage, 'title': 'Here Without You', 'file': '../../../../../../../../D:/MUSIK/RADIO/Here Without You.mp3'},
  {'icon': iconImage, 'title': 'How Do You Do', 'file': '../../../../../../../../D:/MUSIK/RADIO/Roxette/1992 - Tourism/How Do You Do.mp3'},
  {'icon': iconImage, 'title': 'How You Remind Me', 'file': '../../../../../../../../D:/MUSIK/RADIO/Nickelback/2001 - Silver Side Up/How You Remind Me.mp3'},
  {'icon': iconImage, 'title': 'I Breathe', 'file': '../../../../../../../../D:/MUSIK/RADIO/I Breathe.mp3'},
  {'icon': iconImage, 'title': 'I Dont Want To Miss A Thing', 'file': '../../../../../../../../D:/MUSIK/RADIO/I Don%27t Want To Miss A Thing.mp3'},
  {'icon': iconImage, 'title': 'I Get No Down', 'file': '../../../../../../../../D:/MUSIK/RADIO/I get no down.mp3'},
  {'icon': iconImage, 'title': 'I Jast Wont To Feel', 'file': '../../../../../../../../D:/MUSIK/RADIO/I jast wont to feel.mp3'},
  {'icon': iconImage, 'title': 'I Saw You Dancing', 'file': '../../../../../../../../D:/MUSIK/RADIO/I Saw You Dancing.mp3'},
  {'icon': iconImage, 'title': 'I Was Made For Lovin You', 'file': '../../../../../../../../D:/MUSIK/RADIO/I was made for lovin%27 you.MP3'},
  {'icon': iconImage, 'title': 'Im In Love', 'file': '../../../../../../../../D:/MUSIK/RADIO/Im in Love.MP3'},
  {'icon': iconImage, 'title': 'Im Not A Girl', 'file': '../../../../../../../../D:/MUSIK/RADIO/I%27m Not A Girl.mp3'},
  {'icon': iconImage, 'title': 'In For A Panny', 'file': '../../../../../../../../D:/MUSIK/RADIO/In for a panny.mp3'},
  {'icon': iconImage, 'title': 'In For A Penny In For A Pound', 'file': '../../../../../../../../D:/MUSIK/RADIO/In for a Penny In for a Pound.mp4'},
  {'icon': iconImage, 'title': 'In The Army Now', 'file': '../../../../../../../../D:/MUSIK/RADIO/In the army now.mp3'},
  {'icon': iconImage, 'title': 'In The Army Now', 'file': '../../../../../../../../D:/MUSIK/RADIO/In The Army Now .mp4'},
  {'icon': iconImage, 'title': 'In The Army Now', 'file': '../../../../../../../../D:/MUSIK/RADIO/In The Army Now.mp4'},
  {'icon': iconImage, 'title': 'In The Shadows', 'file': '../../../../../../../../D:/MUSIK/RADIO/In The Shadows.mp3'},
  {'icon': iconImage, 'title': 'In Your Room', 'file': '../../../../../../../../D:/MUSIK/RADIO/Depeche mode/1993 - Songs of Faith and Devotion/In Your Room.mp3'},
  {'icon': iconImage, 'title': 'It`s Raining Men', 'file': '../../../../../../../../D:/MUSIK/RADIO/It`s raining men.mp3'},
  {'icon': iconImage, 'title': 'Its My Life', 'file': '../../../../../../../../D:/MUSIK/RADIO/Its My Life.mp3'},
  {'icon': iconImage, 'title': 'Join Me In Death', 'file': '../../../../../../../../D:/MUSIK/RADIO/H.I.M/Razorblade Romance/Join Me In Death.mp3'},
  {'icon': iconImage, 'title': 'Just Be Good To Me', 'file': '../../../../../../../../D:/MUSIK/RADIO/Just Be Good to Me.mp3'},
  {'icon': iconImage, 'title': 'Kara Mia', 'file': '../../../../../../../../D:/MUSIK/RADIO/Kara Mia.mp3'},
  {'icon': iconImage, 'title': 'Kingson Town', 'file': '../../../../../../../../D:/MUSIK/RADIO/Kingson Town.mp3'},
  {'icon': iconImage, 'title': 'Kojo Notsuki', 'file': '../../../../../../../../D:/MUSIK/RADIO/ScorpionS/Kojo NoTsuki.mp3'},
  {'icon': iconImage, 'title': 'Ku Ku Djambo', 'file': '../../../../../../../../D:/MUSIK/RADIO/Ku ku Djambo.mp3'},
  {'icon': iconImage, 'title': 'Late Goodbye', 'file': '../../../../../../../../D:/MUSIK/RADIO/Late Goodbye.mp3'},
  {'icon': iconImage, 'title': 'Learn The Hard Way', 'file': '../../../../../../../../D:/MUSIK/RADIO/Nickelback/2003 - The Long Road/Learn The Hard Way.mp3'},
  {'icon': iconImage, 'title': 'Life Is Life', 'file': '../../../../../../../../D:/MUSIK/RADIO/Life is Life.mp3'},
  {'icon': iconImage, 'title': 'Listen To Your Heart', 'file': '../../../../../../../../D:/MUSIK/RADIO/Roxette/1988 - Look Sharp/Listen To Your Heart.mp3'},
  {'icon': iconImage, 'title': 'Livin La Vida Loca', 'file': '../../../../../../../../D:/MUSIK/RADIO/Livin%27 La Vida Loca.mp3'},
  {'icon': iconImage, 'title': 'Lonely Night', 'file': '../../../../../../../../D:/MUSIK/RADIO/ScorpionS/Lonely Night.mp3'},
  {'icon': iconImage, 'title': 'Losing Grip', 'file': '../../../../../../../../D:/MUSIK/RADIO/Losing grip.mp3'},
  {'icon': iconImage, 'title': 'Love Is Blue', 'file': '../../../../../../../../D:/MUSIK/RADIO/Love is Blue.mp3'},
  {'icon': iconImage, 'title': 'Love To Hate You', 'file': '../../../../../../../../D:/MUSIK/RADIO/Love To Hate You.mp3'},
  {'icon': iconImage, 'title': 'Lucefer', 'file': '../../../../../../../../D:/MUSIK/RADIO/Lucefer.mp3'},
  {'icon': iconImage, 'title': 'Mafia', 'file': '../../../../../../../../D:/MUSIK/RADIO/Mafia.mp3'},
  {'icon': iconImage, 'title': 'Makarena', 'file': '../../../../../../../../D:/MUSIK/RADIO/Makarena.mp3'},
  {'icon': iconImage, 'title': 'Maybe', 'file': '../../../../../../../../D:/MUSIK/RADIO/Maybe.mp3'},
  {'icon': iconImage, 'title': 'Milk Toast Honey', 'file': '../../../../../../../../D:/MUSIK/RADIO/Roxette/2001 - Room Service/Milk Toast Honey.mp3'},
  {'icon': iconImage, 'title': 'Mix', 'file': '../../../../../../../../D:/MUSIK/RADIO/Mix.mp3'},
  {'icon': iconImage, 'title': 'Moltiva', 'file': '../../../../../../../../D:/MUSIK/RADIO/Moltiva.mp3'},
  {'icon': iconImage, 'title': 'Moon Light Shadow', 'file': '../../../../../../../../D:/MUSIK/RADIO/Moon Light Shadow.mp3'},
  {'icon': iconImage, 'title': 'Moskou', 'file': '../../../../../../../../D:/MUSIK/RADIO/Moskou.mp3'},
  {'icon': iconImage, 'title': 'Nah Nah Nah', 'file': '../../../../../../../../D:/MUSIK/RADIO/Nah-Nah-Nah.mp3'},
  {'icon': iconImage, 'title': 'Norting Girl', 'file': '../../../../../../../../D:/MUSIK/RADIO/Norting girl.mp3'},
  {'icon': iconImage, 'title': 'Oops! I Did It Again', 'file': '../../../../../../../../D:/MUSIK/RADIO/OOPS! I Did It Again.mp3'},
  {'icon': iconImage, 'title': 'Pantheon In Flames', 'file': '../../../../../../../../D:/MUSIK/RADIO/Pantheon In Flames.mp3'},
  {'icon': iconImage, 'title': 'Paradise', 'file': '../../../../../../../../D:/MUSIK/RADIO/Paradise.mp3'},
  {'icon': iconImage, 'title': 'Pasadena', 'file': '../../../../../../../../D:/MUSIK/RADIO/Pasadena.mp3'},
  {'icon': iconImage, 'title': 'Personal Jesus', 'file': '../../../../../../../../D:/MUSIK/RADIO/Depeche mode/1996 - The Singles %2786-%2798 (1998)/Personal Jesus.mp3'},
  {'icon': iconImage, 'title': 'Pretty Fly', 'file': '../../../../../../../../D:/MUSIK/RADIO/Pretty fly.mp3'},
  {'icon': iconImage, 'title': 'Rockstar', 'file': '../../../../../../../../D:/MUSIK/RADIO/Nickelback/2005 - All The Right Reasons/Rockstar.mp3'},
  {'icon': iconImage, 'title': 'Sexcrime', 'file': '../../../../../../../../D:/MUSIK/RADIO/Sexcrime.MP3'},
  {'icon': iconImage, 'title': 'Show Me The Meaning', 'file': '../../../../../../../../D:/MUSIK/RADIO/Show Me The Meaning.mp3'},
  {'icon': iconImage, 'title': 'Shut Your Mouth', 'file': '../../../../../../../../D:/MUSIK/RADIO/Shut Your Mouth.mp3'},
  {'icon': iconImage, 'title': 'Smooth Criminal', 'file': '../../../../../../../../D:/MUSIK/RADIO/Smooth Criminal.mp3'},
  {'icon': iconImage, 'title': 'Solo', 'file': '../../../../../../../../D:/MUSIK/RADIO/Solo.mp3'},
  {'icon': iconImage, 'title': 'Spanish Guitar', 'file': '../../../../../../../../D:/MUSIK/RADIO/Spanish guitar.mp3'},
  {'icon': iconImage, 'title': 'Still Loving You', 'file': '../../../../../../../../D:/MUSIK/RADIO/ScorpionS/Still Loving You.mp3'},
  {'icon': iconImage, 'title': 'Strangelove', 'file': '../../../../../../../../D:/MUSIK/RADIO/Depeche mode/1996 - The Singles %2786-%2798 (1998)/Strangelove.mp3'},
  {'icon': iconImage, 'title': 'Stumblin In', 'file': '../../../../../../../../D:/MUSIK/RADIO/Stumblin%27 In.mp3'},
  {'icon': iconImage, 'title': 'Supreme', 'file': '../../../../../../../../D:/MUSIK/RADIO/Supreme.mp3'},
  {'icon': iconImage, 'title': 'Susana', 'file': '../../../../../../../../D:/MUSIK/RADIO/Susana.mp3'},
  {'icon': iconImage, 'title': 'Sweet Dreams', 'file': '../../../../../../../../D:/MUSIK/RADIO/Sweet Dreams.mp3'},
  {'icon': iconImage, 'title': 'Sweetest Perfection', 'file': '../../../../../../../../D:/MUSIK/RADIO/Depeche mode/1990 - Violator/Sweetest Perfection.mp3'},
  {'icon': iconImage, 'title': 'Take My Love', 'file': '../../../../../../../../D:/MUSIK/RADIO/Take My Love.mp3'},
  {'icon': iconImage, 'title': 'Tarzan Boy', 'file': '../../../../../../../../D:/MUSIK/RADIO/Tarzan boy.mp3'},
  {'icon': iconImage, 'title': 'Ten Oclock', 'file': '../../../../../../../../D:/MUSIK/RADIO/Ten o%27clock.MP3'},
  {'icon': iconImage, 'title': 'Thank You', 'file': '../../../../../../../../D:/MUSIK/RADIO/Thank You.mp3'},
  {'icon': iconImage, 'title': 'The Centre Of The Heart', 'file': '../../../../../../../../D:/MUSIK/RADIO/Roxette/2001 - Room Service/The Centre Of The Heart.mp3'},
  {'icon': iconImage, 'title': 'The Color Of Night', 'file': '../../../../../../../../D:/MUSIK/RADIO/The Color of Night.mp3'},
  {'icon': iconImage, 'title': 'The Final Countdown', 'file': '../../../../../../../../D:/MUSIK/RADIO/The Final Countdown.mp3'},
  {'icon': iconImage, 'title': 'The Good The Bad The Ugly', 'file': '../../../../../../../../D:/MUSIK/RADIO/The Good ,The  Bad, The Ugly.MP3'},
  {'icon': iconImage, 'title': 'The Kids Arent Alright', 'file': '../../../../../../../../D:/MUSIK/RADIO/The kids aren%27t alright.mp3'},
  {'icon': iconImage, 'title': 'The Logical Song', 'file': '../../../../../../../../D:/MUSIK/RADIO/The Logical Song.mp3'},
  {'icon': iconImage, 'title': 'The Look', 'file': '../../../../../../../../D:/MUSIK/RADIO/Roxette/The Look.mp3'},
  {'icon': iconImage, 'title': 'The Terminator', 'file': '../../../../../../../../D:/MUSIK/RADIO/The Terminator.mp3'},
  {'icon': iconImage, 'title': 'They Dont Care About Us', 'file': '../../../../../../../../D:/MUSIK/RADIO/They Dont Care About Us.mp3'},
  {'icon': iconImage, 'title': 'Thinking Of You', 'file': '../../../../../../../../D:/MUSIK/RADIO/Thinking of You.MP3'},
  {'icon': iconImage, 'title': 'Tike Tike Kardi', 'file': '../../../../../../../../D:/MUSIK/RADIO/Tike tike kardi.mp3'},
  {'icon': iconImage, 'title': 'Twist In My Sobriety', 'file': '../../../../../../../../D:/MUSIK/RADIO/Twist In My Sobriety.mp4'},
  {'icon': iconImage, 'title': 'Twist In My Sobriety', 'file': '../../../../../../../../D:/MUSIK/RADIO/Twist In My Sobriety.mp3'},
  {'icon': iconImage, 'title': 'Uefa Champions League', 'file': '../../../../../../../../D:/MUSIK/RADIO/UEFA Champions League.mp3'},
  {'icon': iconImage, 'title': 'Velvet', 'file': '../../../../../../../../D:/MUSIK/RADIO/Velvet.mp3'},
  {'icon': iconImage, 'title': 'Weekend!', 'file': '../../../../../../../../D:/MUSIK/RADIO/Weekend!.mp3'},
  {'icon': iconImage, 'title': 'What Is Love', 'file': '../../../../../../../../D:/MUSIK/RADIO/What Is Love.mp3'},
  {'icon': iconImage, 'title': 'When The Lights Go Out', 'file': '../../../../../../../../D:/MUSIK/RADIO/When the Lights Go Out.mp3'},
  {'icon': iconImage, 'title': 'Where The Wild Roses Grow', 'file': '../../../../../../../../D:/MUSIK/RADIO/Where The Wild Roses Grow.mp3'},
  {'icon': iconImage, 'title': 'White Dove', 'file': '../../../../../../../../D:/MUSIK/RADIO/ScorpionS/White Dove.mp3'},
  {'icon': iconImage, 'title': 'Wicked Game', 'file': '../../../../../../../../D:/MUSIK/RADIO/H.I.M/Greatest Lovesongs vol.666/Wicked Game.mp3'},
  {'icon': iconImage, 'title': 'Wind Of Change', 'file': '../../../../../../../../D:/MUSIK/RADIO/ScorpionS/Wind Of Change.mp3'},
  {'icon': iconImage, 'title': 'Wish You Were Here', 'file': '../../../../../../../../D:/MUSIK/RADIO/Wish You Were Here.mp3'},
  {'icon': iconImage, 'title': 'Words', 'file': '../../../../../../../../D:/MUSIK/RADIO/Words.mp3'},
  {'icon': iconImage, 'title': 'Www Ленинград', 'file': '../../../../../../../../D:/MUSIK/RADIO/WWW Ленинград.mp3'},
  {'icon': iconImage, 'title': 'Zombie', 'file': '../../../../../../../../D:/MUSIK/RADIO/Zombie.mp3'},
  {'icon': iconImage, 'title': 'Zoo', 'file': '../../../../../../../../D:/MUSIK/RADIO/Zoo.mp3'},
  {'icon': iconImage, 'title': 'А Мы Любили', 'file': '../../../../../../../../D:/MUSIK/RADIO/Hi-Fi/А мы любили.mp3'},
  {'icon': iconImage, 'title': 'А Что Нам Надо', 'file': '../../../../../../../../D:/MUSIK/RADIO/А Что Нам Надо.mp3'},
  {'icon': iconImage, 'title': 'Бог Устал Нас Любить', 'file': '../../../../../../../../D:/MUSIK/RADIO/Сплин/Бог Устал Нас Любить.mp3'},
  {'icon': iconImage, 'title': 'Была Не Была', 'file': '../../../../../../../../D:/MUSIK/RADIO/Была не была.mp3'},
  {'icon': iconImage, 'title': 'В Жизни Так Бывает', 'file': '../../../../../../../../D:/MUSIK/RADIO/В Жизни Так Бывает.mp3'},
  {'icon': iconImage, 'title': 'Вериш Ли Ты Или Нет', 'file': '../../../../../../../../D:/MUSIK/RADIO/Вериш ли ты или нет.mp3'},
  {'icon': iconImage, 'title': 'Вечно Молодой', 'file': '../../../../../../../../D:/MUSIK/RADIO/Вечно молодой.mp3'},
  {'icon': iconImage, 'title': 'Вместе И Навсегда', 'file': '../../../../../../../../D:/MUSIK/RADIO/Вместе и навсегда.mp3'},
  {'icon': iconImage, 'title': 'Воскрешени', 'file': '../../../../../../../../D:/MUSIK/RADIO/Воскрешени.mp3'},
  {'icon': iconImage, 'title': 'Все Возможно', 'file': '../../../../../../../../D:/MUSIK/RADIO/Все возможно.mp3'},
  {'icon': iconImage, 'title': 'Высоко', 'file': '../../../../../../../../D:/MUSIK/RADIO/Высоко.mp3'},
  {'icon': iconImage, 'title': 'Выхода Нет', 'file': '../../../../../../../../D:/MUSIK/RADIO/Сплин/Выхода нет.mp3'},
  {'icon': iconImage, 'title': 'Генералы Песчаных Карьеров', 'file': '../../../../../../../../D:/MUSIK/RADIO/Генералы песчаных карьеров.mp3'},
  {'icon': iconImage, 'title': 'Глаза', 'file': '../../../../../../../../D:/MUSIK/RADIO/Глаза.mp3'},
  {'icon': iconImage, 'title': 'Городок', 'file': '../../../../../../../../D:/MUSIK/RADIO/Городок.mp3'},
  {'icon': iconImage, 'title': 'Девочка С Севера', 'file': '../../../../../../../../D:/MUSIK/RADIO/Девочка с севера.mp3'},
  {'icon': iconImage, 'title': 'Девушки Как Звёзды', 'file': '../../../../../../../../D:/MUSIK/RADIO/Девушки как звёзды.mp3'},
  {'icon': iconImage, 'title': 'Дедушка По Городу', 'file': '../../../../../../../../D:/MUSIK/RADIO/Дедушка по городу.mp3'},
  {'icon': iconImage, 'title': 'Дожди', 'file': '../../../../../../../../D:/MUSIK/RADIO/Дожди.mp3'},
  {'icon': iconImage, 'title': 'Дождик', 'file': '../../../../../../../../D:/MUSIK/RADIO/Дождик.mp3'},
  {'icon': iconImage, 'title': 'Дождь По Крыше', 'file': '../../../../../../../../D:/MUSIK/RADIO/Дождь по крыше.mp3'},
  {'icon': iconImage, 'title': 'Дрессировщик', 'file': '../../../../../../../../D:/MUSIK/RADIO/Дрессировщик.MP3'},
  {'icon': iconImage, 'title': 'Зачем Топтать Мою Любовь', 'file': '../../../../../../../../D:/MUSIK/RADIO/Зачем топтать мою любовь.mp3'},
  {'icon': iconImage, 'title': 'Зеленоглазое Такси', 'file': '../../../../../../../../D:/MUSIK/RADIO/Зеленоглазое Такси.mp3'},
  {'icon': iconImage, 'title': 'Зимний Сад', 'file': '../../../../../../../../D:/MUSIK/RADIO/Зимний сад.mp3'},
  {'icon': iconImage, 'title': 'Зимний Сон', 'file': '../../../../../../../../D:/MUSIK/RADIO/Зимний сон.mp3'},
  {'icon': iconImage, 'title': 'Иду Курю', 'file': '../../../../../../../../D:/MUSIK/RADIO/Иду, курю.mp3'},
  {'icon': iconImage, 'title': 'Иерусалим', 'file': '../../../../../../../../D:/MUSIK/RADIO/Иерусалим.mp3'},
  {'icon': iconImage, 'title': 'Из Вагантов', 'file': '../../../../../../../../D:/MUSIK/RADIO/Из Вагантов.mp3'},
  {'icon': iconImage, 'title': 'Кавачай', 'file': '../../../../../../../../D:/MUSIK/RADIO/Кавачай.mp3'},
  {'icon': iconImage, 'title': 'Каждый День', 'file': '../../../../../../../../D:/MUSIK/RADIO/Каждый день.mp3'},
  {'icon': iconImage, 'title': 'Лето', 'file': '../../../../../../../../D:/MUSIK/RADIO/Лето.mp3'},
  {'icon': iconImage, 'title': 'Линия Жизни', 'file': '../../../../../../../../D:/MUSIK/RADIO/Сплин/2001 - 25-й кадр/Линия жизни.mp3'},
  {'icon': iconImage, 'title': 'Листай Эфир', 'file': '../../../../../../../../D:/MUSIK/RADIO/Листай эфир.mp3'},
  {'icon': iconImage, 'title': 'Люблю', 'file': '../../../../../../../../D:/MUSIK/RADIO/Люблю.mp3'},
  {'icon': iconImage, 'title': 'Макдональдс', 'file': '../../../../../../../../D:/MUSIK/RADIO/Макдональдс .mp3'},
  {'icon': iconImage, 'title': 'Мне Бы В Небо', 'file': '../../../../../../../../D:/MUSIK/RADIO/Мне Бы В Небо.mp3'},
  {'icon': iconImage, 'title': 'Мне Мама Тихо Говорила', 'file': '../../../../../../../../D:/MUSIK/RADIO/Мне мама тихо говорила.mp3'},
  {'icon': iconImage, 'title': 'Мое Сердце', 'file': '../../../../../../../../D:/MUSIK/RADIO/Сплин/2001 - 25-й кадр/Мое сердце.mp3'},
  {'icon': iconImage, 'title': 'Москва', 'file': '../../../../../../../../D:/MUSIK/RADIO/Москва.mp3'},
  {'icon': iconImage, 'title': 'Моя Любовь', 'file': '../../../../../../../../D:/MUSIK/RADIO/Моя любовь.mp3'},
  {'icon': iconImage, 'title': 'Мурка', 'file': '../../../../../../../../D:/MUSIK/RADIO/Мурка.mp3'},
  {'icon': iconImage, 'title': 'Мусорный Ветер', 'file': '../../../../../../../../D:/MUSIK/RADIO/Мусорный ветер.WAV'},
  {'icon': iconImage, 'title': 'Над Гудзоном', 'file': '../../../../../../../../D:/MUSIK/RADIO/Над Гудзоном.mp3'},
  {'icon': iconImage, 'title': 'Наши Детские Смешные Голоса', 'file': '../../../../../../../../D:/MUSIK/RADIO/Наши детские смешные голоса.mp3'},
  {'icon': iconImage, 'title': 'Не Дано', 'file': '../../../../../../../../D:/MUSIK/RADIO/Hi-Fi/Не дано.mp3'},
  {'icon': iconImage, 'title': 'Небо', 'file': '../../../../../../../../D:/MUSIK/RADIO/Небо.mp3'},
  {'icon': iconImage, 'title': 'Небыло Печали', 'file': '../../../../../../../../D:/MUSIK/RADIO/Небыло печали.mp3'},
  {'icon': iconImage, 'title': 'Но Я Играю Эту Роль', 'file': '../../../../../../../../D:/MUSIK/RADIO/Но я играю эту роль.mp3'},
  {'icon': iconImage, 'title': 'О Любви', 'file': '../../../../../../../../D:/MUSIK/RADIO/О любви.mp3'},
  {'icon': iconImage, 'title': 'Океан И Три Реки', 'file': '../../../../../../../../D:/MUSIK/RADIO/Океан и три реки.mp3'},
  {'icon': iconImage, 'title': 'Орбит Без Сахара', 'file': '../../../../../../../../D:/MUSIK/RADIO/Сплин/1998 - Гранатовый альбом/Орбит без сахара.mp3'},
  {'icon': iconImage, 'title': 'Первый Снег', 'file': '../../../../../../../../D:/MUSIK/RADIO/Первый снег.mp3'},
  {'icon': iconImage, 'title': 'Печаль Моя', 'file': '../../../../../../../../D:/MUSIK/RADIO/Печаль Моя.mp3'},
  {'icon': iconImage, 'title': 'Плакала Береза', 'file': '../../../../../../../../D:/MUSIK/RADIO/Плакала береза.mp3'},
  {'icon': iconImage, 'title': 'Плот', 'file': '../../../../../../../../D:/MUSIK/RADIO/Плот.mp3'},
  {'icon': iconImage, 'title': 'Попытка №5', 'file': '../../../../../../../../D:/MUSIK/RADIO/Попытка №5.mp3'},
  {'icon': iconImage, 'title': 'Пора Домой', 'file': '../../../../../../../../D:/MUSIK/RADIO/Пора Домой.mp3'},
  {'icon': iconImage, 'title': 'Розовые Розы', 'file': '../../../../../../../../D:/MUSIK/RADIO/Розовые розы.mp3'},
  {'icon': iconImage, 'title': 'Седьмой Лепесток', 'file': '../../../../../../../../D:/MUSIK/RADIO/Hi-Fi/Седьмой лепесток.mp3'},
  {'icon': iconImage, 'title': 'Спасибо За День Спасибо За Ночь', 'file': '../../../../../../../../D:/MUSIK/RADIO/Спасибо за день, спасибо за ночь.mp3'},
  {'icon': iconImage, 'title': 'Там Де Нас Нема', 'file': '../../../../../../../../D:/MUSIK/RADIO/Там де нас нема.mp3'},
  {'icon': iconImage, 'title': 'Товарищ Сержант', 'file': '../../../../../../../../D:/MUSIK/RADIO/Товарищ Сержант.mp3'},
  {'icon': iconImage, 'title': 'Три Полоски', 'file': '../../../../../../../../D:/MUSIK/RADIO/Три полоски.mp3'},
  {'icon': iconImage, 'title': 'Тулула', 'file': '../../../../../../../../D:/MUSIK/RADIO/ТуЛуЛа.mp3'},
  {'icon': iconImage, 'title': 'Уходишь', 'file': '../../../../../../../../D:/MUSIK/RADIO/Уходишь.mp3'},
  {'icon': iconImage, 'title': 'Хали Гали', 'file': '../../../../../../../../D:/MUSIK/RADIO/Хали-гали.mp3'},
  {'icon': iconImage, 'title': 'Хоп Хэй', 'file': '../../../../../../../../D:/MUSIK/RADIO/Хоп хэй.mp3'},
  {'icon': iconImage, 'title': 'Часики', 'file': '../../../../../../../../D:/MUSIK/RADIO/Часики.MP3'},
  {'icon': iconImage, 'title': 'Шоссэ', 'file': '../../../../../../../../D:/MUSIK/RADIO/Шоссэ.mp3'},
  {'icon': iconImage, 'title': 'Я За Тебя Умру', 'file': '../../../../../../../../D:/MUSIK/RADIO/Я за тебя умру.mp3'},
  {'icon': iconImage, 'title': 'Я Люблю', 'file': '../../../../../../../../D:/MUSIK/RADIO/Hi-Fi/Я люблю.mp3'},
  {'icon': iconImage, 'title': 'Я Не Болею Тобой', 'file': '../../../../../../../../D:/MUSIK/RADIO/Я не болею тобой.mp3'},
  {'icon': iconImage, 'title': 'Я Покину Родные Края', 'file': '../../../../../../../../D:/MUSIK/RADIO/Я покину родные края.mp3'},
  {'icon': iconImage, 'title': 'Яды', 'file': '../../../../../../../../D:/MUSIK/RADIO/Яды.mp3'},
]);
})

document.getElementById('radioпомойка').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '007 Live', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/007 Live.mp3'},
  {'icon': iconImage, 'title': '01 Za Milih Dam', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Михаил Шуфутинский/1997 - Za milih dam!/01_Za milih dam.mp3'},
  {'icon': iconImage, 'title': '02 Medsestrichka', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Михаил Шуфутинский/2003 - Bum-bum/02_medsestrichka.mp3'},
  {'icon': iconImage, 'title': '04 Palma De Mayorka', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Михаил Шуфутинский/1998 - Odnajdi v Amerike/04_Palma de mayorka.mp3'},
  {'icon': iconImage, 'title': '05 Counting Crows Colorblind', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/05 - Counting Crows - Colorblind.mp3'},
  {'icon': iconImage, 'title': '06 Kashmir', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Led Zeppelin/Physical Graffiti (1975)/06 - Kashmir.mp3'},
  {'icon': iconImage, 'title': '07 Leviy Bereg Dona', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Михаил Шуфутинский/2002 - Svechi/07_leviy_bereg_dona.mp3'},
  {'icon': iconImage, 'title': '07 Staroe Kafe', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Михаил Шуфутинский/1989 - Ti u menia edinstvennaia/07_staroe_kafe.mp3'},
  {'icon': iconImage, 'title': '10 Dorogoy Dlinnoyu', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Михаил Шуфутинский/1989 - Podmoskovnie vechera/10_Dorogoy dlinnoyu.mp3'},
  {'icon': iconImage, 'title': '16 Gop Stop', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Михаил Шуфутинский/1994 - Spasibo, Sasha rozembaum/16_Gop-stop.mp3'},
  {'icon': iconImage, 'title': '18 Dusha Bolit', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Михаил Шуфутинский/2002 - Nalivai, pogovorim/18_dusha_bolit.mp3'},
  {'icon': iconImage, 'title': '2 Become 1', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/2 become 1.mp3'},
  {'icon': iconImage, 'title': '4000 Rainy Nights', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/4000 Rainy Nights.mp3'},
  {'icon': iconImage, 'title': 'Again', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Again.mp3'},
  {'icon': iconImage, 'title': 'All That The Wants', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/All That The Wants.MP3'},
  {'icon': iconImage, 'title': 'All The Small Things', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/All The Small Things.mp3'},
  {'icon': iconImage, 'title': 'American Boy', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/American boy.mp3'},
  {'icon': iconImage, 'title': 'And I Think Of You', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/And I Think Of You.mp3'},
  {'icon': iconImage, 'title': 'Angels Crying', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Angels Crying.mp3'},
  {'icon': iconImage, 'title': 'Anthem', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Anthem.mp3'},
  {'icon': iconImage, 'title': 'Bad Blood', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Bad Blood.MP3'},
  {'icon': iconImage, 'title': 'Bailamos', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Bailamos.mp3'},
  {'icon': iconImage, 'title': 'Banca Banca', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Banca Banca.mp3'},
  {'icon': iconImage, 'title': 'Beautifullife', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/BeautifulLife.mp3'},
  {'icon': iconImage, 'title': 'Between Angels & Insects', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Between Angels & Insects.mp3'},
  {'icon': iconImage, 'title': 'Big In Japan', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Big In Japan.mp3'},
  {'icon': iconImage, 'title': 'Breathe Me', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Breathe Me.mp3'},
  {'icon': iconImage, 'title': 'Broken Days', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Broken days.mp3'},
  {'icon': iconImage, 'title': 'Cant Fight The Moonlight', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Cant Fight the Moonlight.MP3'},
  {'icon': iconImage, 'title': 'Cant Get You Out Of My Head', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Can%27t Get You Out Of My Head.mp3'},
  {'icon': iconImage, 'title': 'Children Of The Damned', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/IRON MAIDEN/1982 - The Number of the Beast/Children of the Damned.mp3'},
  {'icon': iconImage, 'title': 'Chrismasse', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Chrismasse.mp3'},
  {'icon': iconImage, 'title': 'Circle', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Circle.mp3'},
  {'icon': iconImage, 'title': 'Crush', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Crush.mp3'},
  {'icon': iconImage, 'title': 'Dancando Lambada', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Dancando Lambada.mp3'},
  {'icon': iconImage, 'title': 'Dangerous Myzuka', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Dangerous myzuka.mp3'},
  {'icon': iconImage, 'title': 'Disae', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Disae.mp3'},
  {'icon': iconImage, 'title': 'Dont Let Me Get Me', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Don%27t Let Me Get Me.mp3'},
  {'icon': iconImage, 'title': 'Dont Stop The Music', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Don%27t Stop The Music.mp3'},
  {'icon': iconImage, 'title': 'Dont Turn Around', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Dont Turn Around.mp3'},
  {'icon': iconImage, 'title': 'Double Bass', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Double Bass.mp3'},
  {'icon': iconImage, 'title': 'Dr Alban Its My Life', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Dr Alban - It%27s my life.mp3'},
  {'icon': iconImage, 'title': 'Drowning', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Drowning.mp3'},
  {'icon': iconImage, 'title': 'Easy', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Easy.mp3'},
  {'icon': iconImage, 'title': 'Eternal Flame', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Eternal Flame.mp4'},
  {'icon': iconImage, 'title': 'Eternal Flamme', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Eternal Flamme.mp3'},
  {'icon': iconImage, 'title': 'Every Time', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Every time.mp3'},
  {'icon': iconImage, 'title': 'Everything Burns', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Anastacia/2005 - Pieces Of A Dream/Everything Burns.mp3'},
  {'icon': iconImage, 'title': 'Ex Girlfriend', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Ex-Girlfriend.mp3'},
  {'icon': iconImage, 'title': 'Fable', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Fable.mp3'},
  {'icon': iconImage, 'title': 'Fight', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Fight.mp3'},
  {'icon': iconImage, 'title': 'Forever Sleep', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Forever Sleep.mp3'},
  {'icon': iconImage, 'title': 'Fragile', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Fragile.mp3'},
  {'icon': iconImage, 'title': 'Ghostbusters', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Ghostbusters.mp3'},
  {'icon': iconImage, 'title': 'Girl Youll Be A Woman Soon', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Girl You%27ll Be A Woman Soon.mp3'},
  {'icon': iconImage, 'title': 'Give Into Me', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Give Into Me.mp3'},
  {'icon': iconImage, 'title': 'Gunsnroses Dont Cry', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Guns%27N%27Roses - Don%27t cry.mp3'},
  {'icon': iconImage, 'title': 'Hampsterdance Song', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Hampsterdance Song.mp3'},
  {'icon': iconImage, 'title': 'Heavy On My Heart', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Anastacia/2004 - Anastacia/Heavy On My Heart.mp3'},
  {'icon': iconImage, 'title': 'Hero', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Hero.MP3'},
  {'icon': iconImage, 'title': 'Hold Me For A While', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Hold Me For A While.mp3'},
  {'icon': iconImage, 'title': 'Hold On Tight', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Hold On Tight.mp3'},
  {'icon': iconImage, 'title': 'Hotel California', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Hotel California.mp3'},
  {'icon': iconImage, 'title': 'House Of He Rising Sun', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/House Of He Rising Sun.mp3'},
  {'icon': iconImage, 'title': 'How Deep Is Your Love', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/How Deep Is Your Love.MP3'},
  {'icon': iconImage, 'title': 'I Hate This Fucking World', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/I Hate This Fucking World.mp3'},
  {'icon': iconImage, 'title': 'I Like Chopin', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/I like chopin.mp3'},
  {'icon': iconImage, 'title': 'I Love Rock N Roll', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/I Love Rock-n-Roll.MP3'},
  {'icon': iconImage, 'title': 'I Put A Spell On You', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/I Put a Spell on You.MP3'},
  {'icon': iconImage, 'title': 'I Want It That Way', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/I Want it That Way.mp3'},
  {'icon': iconImage, 'title': 'I Was Made For Lovin You', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/I Was Made For Lovin You.mp3'},
  {'icon': iconImage, 'title': 'Id Love You To Want Me', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/I%27d Love You to Want Me.mp3'},
  {'icon': iconImage, 'title': 'Israel', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Israel.mp3'},
  {'icon': iconImage, 'title': 'Jesus To A Child', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Jesus to a child.mp3'},
  {'icon': iconImage, 'title': 'Jingle Bells', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Jingle Bells.mp3'},
  {'icon': iconImage, 'title': 'Johnny Be Good', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Johnny Be Good.mp3'},
  {'icon': iconImage, 'title': 'Just Like A Pill', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Just Like A Pill.mp3'},
  {'icon': iconImage, 'title': 'Kashmir', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Kashmir.mp3'},
  {'icon': iconImage, 'title': 'Knockin On Heavens Door', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Knockin On Heavens Door.mp3'},
  {'icon': iconImage, 'title': 'Knocking On Heavens Door M', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Knocking On Heavens Door+M.mp3'},
  {'icon': iconImage, 'title': 'La La La', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/La La La.mp3'},
  {'icon': iconImage, 'title': 'Lady In Red', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Lady in red.mp3'},
  {'icon': iconImage, 'title': 'Left Outside Alone', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Anastacia/2004 - Anastacia/Left Outside Alone.mp3'},
  {'icon': iconImage, 'title': 'Listen Up', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Listen Up.mp3'},
  {'icon': iconImage, 'title': 'Losing My Religion', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Losing My Religion.mp3'},
  {'icon': iconImage, 'title': 'Love Dont Cost A Thing', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Love dont Cost a Thing.MP3'},
  {'icon': iconImage, 'title': 'Love Hurts', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Love Hurts.mp3'},
  {'icon': iconImage, 'title': 'Lovers On The Sun Feat Sam Martin', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Lovers on the sun feat sam martin.mp3'},
  {'icon': iconImage, 'title': 'Madonna', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Madonna.mp3'},
  {'icon': iconImage, 'title': 'Memory', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Memory.mp3'},
  {'icon': iconImage, 'title': 'Message Home', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Message Home.mp3'},
  {'icon': iconImage, 'title': 'Midnight Danser', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Midnight Danser.mp3'},
  {'icon': iconImage, 'title': 'My Fathers Sоn', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/My Father%27s Sоn.mp3'},
  {'icon': iconImage, 'title': 'My Favourite Game', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/My Favourite Game.mp3'},
  {'icon': iconImage, 'title': 'My Happy Ending', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/My Happy Ending.mp3'},
  {'icon': iconImage, 'title': 'My Heart', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/My Heart.mp3'},
  {'icon': iconImage, 'title': 'Nathalie', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Nathalie.mp3'},
  {'icon': iconImage, 'title': 'Never Be The Same Again', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Never be the same again.mp3'},
  {'icon': iconImage, 'title': 'No Fear', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/No Fear.mp3'},
  {'icon': iconImage, 'title': 'Nostalgie', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Nostalgie.mp3'},
  {'icon': iconImage, 'title': 'One Day In Your Life', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Anastacia/2002 - One Day In Your Life/One Day In Your Life.mp3'},
  {'icon': iconImage, 'title': 'One Of Us', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/ONE OF US.mp3'},
  {'icon': iconImage, 'title': 'One Wild Night', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/One Wild Night.MP3'},
  {'icon': iconImage, 'title': 'Only You', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Only You.mp3'},
  {'icon': iconImage, 'title': 'Out Of The Dark', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Out Of The Dark.mp3'},
  {'icon': iconImage, 'title': 'Paradise', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Paradise.mp3'},
  {'icon': iconImage, 'title': 'Party Up', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Party Up.mp3'},
  {'icon': iconImage, 'title': 'Password', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Password.mp3'},
  {'icon': iconImage, 'title': 'Paul Van Dyk Feat Hemstock & Jennings Nothing But You (pvd Radio Mix)', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Paul Van Dyk feat.Hemstock & Jennings-Nothing But You (PVD Radio Mix).mp3'},
  {'icon': iconImage, 'title': 'Please Forgive Me', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Please Forgive Me.mp3'},
  {'icon': iconImage, 'title': 'Promises', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Promises.mp3'},
  {'icon': iconImage, 'title': 'Prowler', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/IRON MAIDEN/1980 - Iron Maiden/Prowler.mp3'},
  {'icon': iconImage, 'title': 'Raise The Hammer', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Raise the hammer.mp3'},
  {'icon': iconImage, 'title': 'Rape Me', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Rape me.MP3'},
  {'icon': iconImage, 'title': 'Rise And Fall', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Rise And Fall.mp3'},
  {'icon': iconImage, 'title': 'Road Trippin', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Road Trippin%27.mp3'},
  {'icon': iconImage, 'title': 'Rock The Hell Outta You', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Rock the Hell Outta You.mp3'},
  {'icon': iconImage, 'title': 'Round Round', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Round Round.mp3'},
  {'icon': iconImage, 'title': 'Samba', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Samba.mp3'},
  {'icon': iconImage, 'title': 'Save Your Kisses For Me', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Save Your Kisses for Me.mp3'},
  {'icon': iconImage, 'title': 'Sick & Tired', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Anastacia/2004 - Anastacia/Sick & Tired.mp3'},
  {'icon': iconImage, 'title': 'Sk8er Boi', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Sk8er Boi.mp3'},
  {'icon': iconImage, 'title': 'Skin On Skin', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Skin On Skin.mp3'},
  {'icon': iconImage, 'title': 'Smajl', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Smajl.mp3'},
  {'icon': iconImage, 'title': 'Smells Like Teen Spirit', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Smells Like Teen Spirit.mp3'},
  {'icon': iconImage, 'title': 'Smoke On The Water', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Smoke on the water.mp3'},
  {'icon': iconImage, 'title': 'Somewhere In The World', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/SOMEWHERE IN THE WORLD.mp3'},
  {'icon': iconImage, 'title': 'Stop', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Stop.mp3'},
  {'icon': iconImage, 'title': 'Summer Son', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Summer Son.mp3'},
  {'icon': iconImage, 'title': 'Sun Shaine', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Sun Shaine.MP3'},
  {'icon': iconImage, 'title': 'Sunny', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Sunny.mp3'},
  {'icon': iconImage, 'title': 'Sweet Dreams', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Sweet Dreams.mp3'},
  {'icon': iconImage, 'title': 'The Ketchup Song', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/The Ketchup Song.mp3'},
  {'icon': iconImage, 'title': 'The Only', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/The Only.mp3'},
  {'icon': iconImage, 'title': 'The Sweetest Surrender', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/The Sweetest Surrender.mp3'},
  {'icon': iconImage, 'title': 'This Love', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/This love.mp3'},
  {'icon': iconImage, 'title': 'Those Were The Days', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Those Were The Days.mp3'},
  {'icon': iconImage, 'title': 'Those Where The Days', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Those Where The Days.mp3'},
  {'icon': iconImage, 'title': 'Tissue', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Tissue.mp3'},
  {'icon': iconImage, 'title': 'Tm Joy You Are The One', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/TM-Joy - You Are The One.mp3'},
  {'icon': iconImage, 'title': 'Tonight', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Tonight.mp3'},
  {'icon': iconImage, 'title': 'Train Drive By', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Train - Drive By.mp3'},
  {'icon': iconImage, 'title': 'Twisted Nerve', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Twisted Nerve.mp3'},
  {'icon': iconImage, 'title': 'U Stay With Melina Ill Survive', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/U-Stay_With_Melina_-_Ill_Survive.mp3'},
  {'icon': iconImage, 'title': 'Uebers Ende Der Welt', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Uebers ende der welt.mp3'},
  {'icon': iconImage, 'title': 'Unbreak My Heart', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/UnBreak my Heart.mp3'},
  {'icon': iconImage, 'title': 'Venus', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Venus.mp3'},
  {'icon': iconImage, 'title': 'Viva Forever', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Viva Forever.mp3'},
  {'icon': iconImage, 'title': 'Viva Las Vegas', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Viva las vegas.mp3'},
  {'icon': iconImage, 'title': 'Voyage', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Voyage.mp3'},
  {'icon': iconImage, 'title': 'Wasted Years', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/IRON MAIDEN/1986 - Somewhere in Time/Wasted Years.mp3'},
  {'icon': iconImage, 'title': 'Wasting Love', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/IRON MAIDEN/1992 - Fear of the Dark/Wasting Love.mp3'},
  {'icon': iconImage, 'title': 'Welcome To Paradise', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Welcome to Paradise.mp3'},
  {'icon': iconImage, 'title': 'What A Wonderfull World', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/What a wonderfull world.mp3'},
  {'icon': iconImage, 'title': 'When You Tell Me That You Love Me', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/When You Tell Me that You Love Me.mp3'},
  {'icon': iconImage, 'title': 'Wild Wild Web', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Wild Wild Web.mp3'},
  {'icon': iconImage, 'title': 'Wind World', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Wind World.mp3'},
  {'icon': iconImage, 'title': 'Woman In Love', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Woman in love.mp3'},
  {'icon': iconImage, 'title': 'You', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/You.mp3'},
  {'icon': iconImage, 'title': 'You Can Leave Your Hat On', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/You Can Leave Your Hat On.mp3'},
  {'icon': iconImage, 'title': 'You Meet Love', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/You meet love.mp3'},
  {'icon': iconImage, 'title': 'Youll Never Meet An Angel', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/You%27ll Never Meet An Angel.mp3'},
  {'icon': iconImage, 'title': 'Youre A Woman', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/You%27re a woman.mp3'},
  {'icon': iconImage, 'title': 'А Не Спеть Ли Мне Песню', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/А не спеть ли мне песню.mp3'},
  {'icon': iconImage, 'title': 'Аlamedoves', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Аlamedoves.mp3'},
  {'icon': iconImage, 'title': 'Автомобиль', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Автомобиль.mp3'},
  {'icon': iconImage, 'title': 'Амулет', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Белая гвардия/Амулет.mp3'},
  {'icon': iconImage, 'title': 'Аэропорт', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Аэропорт.WAV'},
  {'icon': iconImage, 'title': 'Батарейка', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Батарейка.mp3'},
  {'icon': iconImage, 'title': 'Без Тебя', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Без тебя.mp3'},
  {'icon': iconImage, 'title': 'Белая Гвардия', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Белая гвардия/Белая гвардия.mp3'},
  {'icon': iconImage, 'title': 'Боби Боба', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Боби-боба.mp3'},
  {'icon': iconImage, 'title': 'Боже Какой Пустяк', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Трофим/Боже какой пустяк.mp3'},
  {'icon': iconImage, 'title': 'Братишка', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Братишка.mp3'},
  {'icon': iconImage, 'title': 'В Жарких Странах', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/В жарких странах.mp3'},
  {'icon': iconImage, 'title': 'Ветер В Голове', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Трофим/Ветер в голове.mp3'},
  {'icon': iconImage, 'title': 'Вечная Молодость', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Чиж/1993 - Чиж/Вечная молодость.mp3'},
  {'icon': iconImage, 'title': 'Видение', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Видение.mp3'},
  {'icon': iconImage, 'title': 'Владимирский Централ', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Владимирский централ.mp3'},
  {'icon': iconImage, 'title': 'Возвращайся', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Возвращайся.mp3'},
  {'icon': iconImage, 'title': 'Вороны', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Вороны.mp3'},
  {'icon': iconImage, 'title': 'Все В Порядке', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Все В Порядке.mp3'},
  {'icon': iconImage, 'title': 'Голубая Стрела', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Белая гвардия/Голубая стрела.mp3'},
  {'icon': iconImage, 'title': 'Да Ди Дам', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Да-ди-дам.mp3'},
  {'icon': iconImage, 'title': 'Дальнобойная', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Трофим/Дальнобойная.mp3'},
  {'icon': iconImage, 'title': 'Девочка Моя', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Девочка моя.mp3'},
  {'icon': iconImage, 'title': 'Девушка Из Высшего Общества', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Девушка из высшего общества.mp3'},
  {'icon': iconImage, 'title': 'День Рожденья', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/День рожденья.mp3'},
  {'icon': iconImage, 'title': 'Дорога', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Дорога.mp3'},
  {'icon': iconImage, 'title': 'Если В Сердце Живет Любовь', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Если в сердце живет любовь.mp3'},
  {'icon': iconImage, 'title': 'Если Хочешь Уходи', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Если хочешь уходи.mp3'},
  {'icon': iconImage, 'title': 'Еще Раз Ночь', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Еще раз ночь.mp3'},
  {'icon': iconImage, 'title': 'Жара', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Жара.mp3'},
  {'icon': iconImage, 'title': 'Звезды', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Звезды.mp3'},
  {'icon': iconImage, 'title': 'Земляничный Берсерк', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Земляничный Берсерк.mp3'},
  {'icon': iconImage, 'title': 'Иногда', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Иногда.mp3'},
  {'icon': iconImage, 'title': 'Какой Пустяк', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Какой пустяк.mp3'},
  {'icon': iconImage, 'title': 'Клубника Со Льдом', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Клубника со льдом.WAV'},
  {'icon': iconImage, 'title': 'Колыбельная Волкам', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Колыбельная волкам.mp3'},
  {'icon': iconImage, 'title': 'Кошки', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Кошки.mp3'},
  {'icon': iconImage, 'title': 'Красиво', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Красиво.mp3'},
  {'icon': iconImage, 'title': 'Кто Виноват', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Кто виноват.mp3'},
  {'icon': iconImage, 'title': 'Куранты', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Куранты.mp3'},
  {'icon': iconImage, 'title': 'Ламбада', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Ламбада.mp3'},
  {'icon': iconImage, 'title': 'Ласковаямоя', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Ласковаямоя.mp3'},
  {'icon': iconImage, 'title': 'Лошадка', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Лошадка.mp3'},
  {'icon': iconImage, 'title': 'Маленькая Страна', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Маленькая страна.mp3'},
  {'icon': iconImage, 'title': 'Маленький Зверь', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Маленький зверь.mp3'},
  {'icon': iconImage, 'title': 'Мама Шикодам', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Мама шикодам.mp3'},
  {'icon': iconImage, 'title': 'Мамба', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Мамба.mp3'},
  {'icon': iconImage, 'title': 'Маргарита', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Маргарита.mp3'},
  {'icon': iconImage, 'title': 'Между Мной И Тобой', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Между мной и тобой.mp3'},
  {'icon': iconImage, 'title': 'Мой Мир', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Мой мир.mp3'},
  {'icon': iconImage, 'title': 'Молодые Ветра', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Молодые ветра.MP3'},
  {'icon': iconImage, 'title': 'Музыка Нас Связала', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Музыка нас связала.MP3'},
  {'icon': iconImage, 'title': 'На Поле Танки Грохотали ', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Чиж/1997 - Бомбардировщик/На поле танки грохотали...mp3'},
  {'icon': iconImage, 'title': 'Не Получилось Не Срослось', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Не Получилось, Не Срослось.mp3'},
  {'icon': iconImage, 'title': 'Не Уверен', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Не уверен.mp3'},
  {'icon': iconImage, 'title': 'Невеста', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Невеста.mp3'},
  {'icon': iconImage, 'title': 'Незаконченный Роман', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Аллегрова/Незаконченный роман.mp3'},
  {'icon': iconImage, 'title': 'Немного Огня', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Немного огня.mp3'},
  {'icon': iconImage, 'title': 'Ночь', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Ночь.mp3'},
  {'icon': iconImage, 'title': 'Ну Гдеже Ваши Руки', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Ну гдеже ваши руки.mp3'},
  {'icon': iconImage, 'title': 'Охотники', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Охотники.mp3'},
  {'icon': iconImage, 'title': 'Перелётная Птица', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Перелётная птица.mp3'},
  {'icon': iconImage, 'title': 'Переход', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Переход.mp3'},
  {'icon': iconImage, 'title': 'Печаль', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Печаль.mp3'},
  {'icon': iconImage, 'title': 'Плачет Девушка В Автомате', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Плачет девушка в автомате.mp3'},
  {'icon': iconImage, 'title': 'Поворачивай К Черту', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Поворачивай к черту.mp3'},
  {'icon': iconImage, 'title': 'Поколение Next', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Поколение Next.mp3'},
  {'icon': iconImage, 'title': 'Полет К Новым Мирам', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Полет к новым мирам.mp3'},
  {'icon': iconImage, 'title': 'Понимаешь', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Понимаешь.mp3'},
  {'icon': iconImage, 'title': 'Последняя', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Последняя.mp3'},
  {'icon': iconImage, 'title': 'Прости За Любовь', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Прости за любовь.MP3'},
  {'icon': iconImage, 'title': 'Просто Такая Сильная Любовь', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Просто такая сильная любовь.mp3'},
  {'icon': iconImage, 'title': 'Раз И Навсегда', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Раз и навсегда.mp3'},
  {'icon': iconImage, 'title': 'Сhihuahua', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Сhihuahua.mp3'},
  {'icon': iconImage, 'title': 'Самолеты', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Самолеты.mp3'},
  {'icon': iconImage, 'title': 'Сестра И Принцессы', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Сестра и Принцессы.mp3'},
  {'icon': iconImage, 'title': 'Сиреневый Туман', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Михаил Шуфутинский/1990 - Moya jizn/Сиреневый Туман.mp3'},
  {'icon': iconImage, 'title': 'Снег Кружится', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Снег кружится.mp3'},
  {'icon': iconImage, 'title': 'Старший Брат', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Старший Брат.mp3'},
  {'icon': iconImage, 'title': 'Странник', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Аллегрова/Странник.mp3'},
  {'icon': iconImage, 'title': 'Сукачев', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Сукачев.MP3'},
  {'icon': iconImage, 'title': 'Танкист', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Танкист.mp3'},
  {'icon': iconImage, 'title': 'Таю', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Таю.mp3'},
  {'icon': iconImage, 'title': 'Ты Будешь Плакать', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Ты будешь плакать.mp3'},
  {'icon': iconImage, 'title': 'Ты Где То Там', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Ты где -то там.mp3'},
  {'icon': iconImage, 'title': 'Ты Меня Не Забыай', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Ты меня не забыай.mp3'},
  {'icon': iconImage, 'title': 'Улетай', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Улетай.mp3'},
  {'icon': iconImage, 'title': 'Фантом', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Чиж/1998 - Новый Иерусалим/Фантом.mp3'},
  {'icon': iconImage, 'title': 'Х Х Х И Р Н Р', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Х.Х.Х. и Р.Н.Р.mp3'},
  {'icon': iconImage, 'title': 'Хип Хоп Рэп', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Хип-хоп-рэп.mp3'},
  {'icon': iconImage, 'title': 'Цветы', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Цветы.mp3'},
  {'icon': iconImage, 'title': 'Чудеса', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Чудеса.mp3'},
  {'icon': iconImage, 'title': 'Школьная Пора', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Школьная Пора.mp3'},
  {'icon': iconImage, 'title': 'Я Летата', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Я летата.mp3'},
  {'icon': iconImage, 'title': 'Я Уйду', 'file': '../../../../../../../../D:/MUSIK/RADIO Помойка/Я уйду.mp3'},
]);
})

document.getElementById('rammstein').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Adios', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Adios.mp3'},
  {'icon': iconImage, 'title': 'Alter Mann', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Das modell/Alter Mann.mp3'},
  {'icon': iconImage, 'title': 'Amerika', 'file': '../../../../../../../../D:/MUSIK/Rammstein/2004 - Reise, Reise/Amerika.mp3'},
  {'icon': iconImage, 'title': 'Amour', 'file': '../../../../../../../../D:/MUSIK/Rammstein/2004 - Reise, Reise/Amour.mp3'},
  {'icon': iconImage, 'title': 'Donaukinder', 'file': '../../../../../../../../D:/MUSIK/Rammstein/2009 - LIFAD/Donaukinder.mp3'},
  {'icon': iconImage, 'title': 'Du Hast', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Rosenrot/Du hast.mp3'},
  {'icon': iconImage, 'title': 'Du Riechst So Gut', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Du Riechst So Gut/Du Riechst So Gut.mp3'},
  {'icon': iconImage, 'title': 'Engel', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Sehnsucht/Engel.mp3'},
  {'icon': iconImage, 'title': 'Feuer Frei', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Rosenrot/Feuer frei.mp3'},
  {'icon': iconImage, 'title': 'Feuer Und Wasser', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Rosenrot/Feuer und wasser.mp3'},
  {'icon': iconImage, 'title': 'Fruhling In Paris', 'file': '../../../../../../../../D:/MUSIK/Rammstein/2009 - LIFAD/Fruhling in Paris.mp3'},
  {'icon': iconImage, 'title': 'Haifisch', 'file': '../../../../../../../../D:/MUSIK/Rammstein/2009 - LIFAD/Haifisch.mp3'},
  {'icon': iconImage, 'title': 'Hilf Mir', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Rosenrot/Hilf mir.mp3'},
  {'icon': iconImage, 'title': 'Ich Tu Dir Weh', 'file': '../../../../../../../../D:/MUSIK/Rammstein/2009 - LIFAD/Ich tu dir weh.mp3'},
  {'icon': iconImage, 'title': 'Ich Will', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Mutter/Ich Will.mp3'},
  {'icon': iconImage, 'title': 'Kein Lust', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Rosenrot/Kein lust.mp3'},
  {'icon': iconImage, 'title': 'Links 2 3 4', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Mutter/Links 2 3 4.mp3'},
  {'icon': iconImage, 'title': 'Mann Gegen Mann', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Rosenrot/Mann gegen mann.mp3'},
  {'icon': iconImage, 'title': 'Mein Herz Brennt', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Mutter/Mein Herz Brennt.mp3'},
  {'icon': iconImage, 'title': 'Mein Herz Brennt', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Mutter/Mein Herz brennt.mp4'},
  {'icon': iconImage, 'title': 'Mein Teil', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Rosenrot/Mein teil.mp3'},
  {'icon': iconImage, 'title': 'Morgenstern', 'file': '../../../../../../../../D:/MUSIK/Rammstein/2004 - Reise, Reise/Morgenstern.mp3'},
  {'icon': iconImage, 'title': 'Moskou', 'file': '../../../../../../../../D:/MUSIK/Rammstein/2004 - Reise, Reise/Moskou.mp3'},
  {'icon': iconImage, 'title': 'Mutter', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Mutter/Mutter.mp3'},
  {'icon': iconImage, 'title': 'Ohne Dich', 'file': '../../../../../../../../D:/MUSIK/Rammstein/2004 - Reise, Reise/Ohne Dich.mp3'},
  {'icon': iconImage, 'title': 'Original', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Engel/Original.mp3'},
  {'icon': iconImage, 'title': 'Pussy', 'file': '../../../../../../../../D:/MUSIK/Rammstein/2009 - LIFAD/Pussy .mp3'},
  {'icon': iconImage, 'title': 'Reise Reise', 'file': '../../../../../../../../D:/MUSIK/Rammstein/2004 - Reise, Reise/Reise, Reise.mp3'},
  {'icon': iconImage, 'title': 'Rosenrot', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Rosenrot/Rosenrot.mp3'},
  {'icon': iconImage, 'title': 'Seemann', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Seemann/Seemann.mp3'},
  {'icon': iconImage, 'title': 'Sonne', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Mutter/Sonne.mp3'},
  {'icon': iconImage, 'title': 'Spieluhr', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Spieluhr.mp3'},
  {'icon': iconImage, 'title': 'Stein Um Stein', 'file': '../../../../../../../../D:/MUSIK/Rammstein/2004 - Reise, Reise/Stein um Stein.mp3'},
  {'icon': iconImage, 'title': 'String', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Rosenrot/String.mp3'},
  {'icon': iconImage, 'title': 'Stripped', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Stripped/Stripped.mp3'},
  {'icon': iconImage, 'title': 'Waidmanns Heil', 'file': '../../../../../../../../D:/MUSIK/Rammstein/2009 - LIFAD/Waidmanns Heil.mp3'},
  {'icon': iconImage, 'title': 'Wilder Wein', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Wilder Wein.mp3'},
  {'icon': iconImage, 'title': 'Wobist Du', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Rosenrot/Wobist du.mp3'},
  {'icon': iconImage, 'title': 'Wollt Ihr', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Herzeleid/Wollt Ihr.mp3'},
  {'icon': iconImage, 'title': 'Zwitter', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Mutter/Zwitter.mp3'},
  {'icon': iconImage, 'title': 'Тier', 'file': '../../../../../../../../D:/MUSIK/Rammstein/Sehnsucht/Тier.mp3'},
]);
})

document.getElementById('romanticcollektion').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': ' Track04', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/M/- Track04.mp3'},
  {'icon': iconImage, 'title': '01', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/Romantic Collektion/Romantic Collection 2/01.mp3'},
  {'icon': iconImage, 'title': '02', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/Romantic Collektion/Romantic Collection 1/02.mp3'},
  {'icon': iconImage, 'title': '08', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/Romantic Collektion/Romantic Collection 2/08.mp3'},
  {'icon': iconImage, 'title': '1', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/Romantic Collektion/5/1.MP3'},
  {'icon': iconImage, 'title': '10', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/Romantic Collektion/8/10.MP3'},
  {'icon': iconImage, 'title': '11', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/Romantic Collektion/5/11.MP3'},
  {'icon': iconImage, 'title': '12', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/Romantic Collektion/Romantic Collection 2/12.mp3'},
  {'icon': iconImage, 'title': '13', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/13.mp3'},
  {'icon': iconImage, 'title': '13', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/Romantic Collektion/Romantic Collection 1/13.mp3'},
  {'icon': iconImage, 'title': '13', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/Romantic Collektion/11/13.MP3'},
  {'icon': iconImage, 'title': '14', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/Romantic Collektion/Romantic Collection 2/14.mp3'},
  {'icon': iconImage, 'title': '16', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/16.mp3'},
  {'icon': iconImage, 'title': '16', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/Romantic Collektion/4/16.MP3'},
  {'icon': iconImage, 'title': '17', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/Romantic Collektion/4/17.MP3'},
  {'icon': iconImage, 'title': '18 Track 18', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/18 - Track 18.mp3'},
  {'icon': iconImage, 'title': '19', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/Romantic Collektion/4/19.MP3'},
  {'icon': iconImage, 'title': '19', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/Romantic Collektion/5/19.MP3'},
  {'icon': iconImage, 'title': '22 Трек 22', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/M/22 - Трек 22.mp3'},
  {'icon': iconImage, 'title': '33', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/33.mp3'},
  {'icon': iconImage, 'title': '5', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/5.mp3'},
  {'icon': iconImage, 'title': '5', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/Romantic Collektion/9/5.MP3'},
  {'icon': iconImage, 'title': '5', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/Romantic Collektion/2/5.MP3'},
  {'icon': iconImage, 'title': 'Dido', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/Dido.mp3'},
  {'icon': iconImage, 'title': 'Keane 04 Track 4', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/Keane - 04 - Track  4.mp3'},
  {'icon': iconImage, 'title': 'Keane 05 Track 5', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/Keane - 05 - Track  5.mp3'},
  {'icon': iconImage, 'title': 'Little Russia', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/Romantic Collektion/5/Little Russia.MP3'},
  {'icon': iconImage, 'title': 'Pink Panther', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/Romantic Collektion/Romantic Collection 1/Pink Panther.mp3'},
  {'icon': iconImage, 'title': 'The Phantom Of The Opera', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/Romantic Collektion/Romantic Collection 1/The Phantom Of The Opera.mp3'},
  {'icon': iconImage, 'title': 'Track 10', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/M/инструментал/Track 10.mp3'},
  {'icon': iconImage, 'title': 'Track 12', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/M/инструментал/Track 12.mp3'},
  {'icon': iconImage, 'title': 'Track 5', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/M/инструментал/Track  5.mp3'},
  {'icon': iconImage, 'title': 'Track15', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/TRACK15.mp3'},
  {'icon': iconImage, 'title': 'Track209', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/TRACK209.mp3'},
  {'icon': iconImage, 'title': 'Vot 009', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/VOT-009.mp3'},
  {'icon': iconImage, 'title': 'Дорожка 1', 'file': '../../../../../../../../D:/MUSIK/Romantic Collektion/Дорожка 1.mp3'},
]);
})

document.getElementById('scooter').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Break It Up', 'file': '../../../../../../../../D:/MUSIK/Scooter/1996 - Wicked!/Break It Up.mp4'},
  {'icon': iconImage, 'title': 'Break It Up', 'file': '../../../../../../../../D:/MUSIK/Scooter/1996 - Wicked!/Break It Up.mp3'},
  {'icon': iconImage, 'title': 'Clic Clac', 'file': '../../../../../../../../D:/MUSIK/Scooter/2009 - Under The Radar Over The Top/Clic Clac.mp3'},
  {'icon': iconImage, 'title': 'Fire', 'file': '../../../../../../../../D:/MUSIK/Scooter/1997 - The Age Of Love/Fire.mp3'},
  {'icon': iconImage, 'title': 'How Much Is The Fish', 'file': '../../../../../../../../D:/MUSIK/Scooter/1998 - No Time To Chill/How Much Is The Fish.mp3'},
  {'icon': iconImage, 'title': 'I Was Made For Lovin You', 'file': '../../../../../../../../D:/MUSIK/Scooter/1998 - No Time To Chill/I Was Made For Lovin%27 You.mp3'},
  {'icon': iconImage, 'title': 'Introduction', 'file': '../../../../../../../../D:/MUSIK/Scooter/1997 - The Age Of Love/Introduction.mp3'},
  {'icon': iconImage, 'title': 'The Logical Song', 'file': '../../../../../../../../D:/MUSIK/Scooter/2007 - Jumping All Over The World - Whatever You Want/The Logical Song.mp3'},
  {'icon': iconImage, 'title': 'The Night', 'file': '../../../../../../../../D:/MUSIK/Scooter/2007 - Jumping All Over The World - Whatever You Want/The Night.mp3'},
  {'icon': iconImage, 'title': 'We Are The Greatest', 'file': '../../../../../../../../D:/MUSIK/Scooter/1998 - No Time To Chill/We Are The Greatest.mp3'},
  {'icon': iconImage, 'title': 'Weekend', 'file': '../../../../../../../../D:/MUSIK/Scooter/2007 - Jumping All Over The World - Whatever You Want/Weekend.mp3'},
]);
})

document.getElementById('shakira').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Ciega Sordomuda', 'file': '../../../../../../../../D:/MUSIK/Shakira/1998 - Donde Estan Los Ladrones/Ciega sordomuda.mp3'},
  {'icon': iconImage, 'title': 'Donde Estan Los Ladrones', 'file': '../../../../../../../../D:/MUSIK/Shakira/1998 - Donde Estan Los Ladrones/Donde estan los ladrones.mp3'},
  {'icon': iconImage, 'title': 'Dont Bother', 'file': '../../../../../../../../D:/MUSIK/Shakira/2007 - Oral Fixation Tour/Don%27t Bother.mp3'},
  {'icon': iconImage, 'title': 'Estoy Aqui', 'file': '../../../../../../../../D:/MUSIK/Shakira/1998 - Donde Estan Los Ladrones/Estoy aqui.mp3'},
  {'icon': iconImage, 'title': 'Eyes Like Yours Ojos Asi', 'file': '../../../../../../../../D:/MUSIK/Shakira/2001 - Laundry Service/Eyes Like Yours Ojos asi.mp3'},
  {'icon': iconImage, 'title': 'How Do You Do', 'file': '../../../../../../../../D:/MUSIK/Shakira/2005 - Fijacion Oral/How Do You Do.mp3'},
  {'icon': iconImage, 'title': 'Inevitable', 'file': '../../../../../../../../D:/MUSIK/Shakira/2002 - Grandes Exitos/Inevitable.mp3'},
  {'icon': iconImage, 'title': 'Objection', 'file': '../../../../../../../../D:/MUSIK/Shakira/2001 - Laundry Service/Objection.mp3'},
  {'icon': iconImage, 'title': 'Octavo Dia', 'file': '../../../../../../../../D:/MUSIK/Shakira/1998 - Donde Estan Los Ladrones/Octavo dia.mp3'},
  {'icon': iconImage, 'title': 'Ojos Asi', 'file': '../../../../../../../../D:/MUSIK/Shakira/2002 - Grandes Exitos/Ojos Asi.mp3'},
  {'icon': iconImage, 'title': 'Si Te Vas', 'file': '../../../../../../../../D:/MUSIK/Shakira/1998 - Donde Estan Los Ladrones/Si te vas.mp3'},
  {'icon': iconImage, 'title': 'Suerte Whenever Wherever', 'file': '../../../../../../../../D:/MUSIK/Shakira/2001 - Laundry Service/Suerte whenever wherever.mp3'},
  {'icon': iconImage, 'title': 'Underneath Your Clothes', 'file': '../../../../../../../../D:/MUSIK/Shakira/2001 - Laundry Service/Underneath your clothes.mp3'},
  {'icon': iconImage, 'title': 'Underneath Your Clothes (acoustic Version)', 'file': '../../../../../../../../D:/MUSIK/Shakira/2001 - Laundry Service/Underneath Your Clothes (Acoustic Version).mp3'},
  {'icon': iconImage, 'title': 'Whenever Wherever', 'file': '../../../../../../../../D:/MUSIK/Shakira/2001 - Laundry Service/Whenever Wherever.mp3'},
  {'icon': iconImage, 'title': 'Whenever Wherever', 'file': '../../../../../../../../D:/MUSIK/Shakira/2001 - Laundry Service/Whenever, Wherever.mp3'},
]);
})

document.getElementById('systemofadown').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A T W A', 'file': '../../../../../../../../D:/MUSIK/System of a Down/2001 - Toxicity/A.T.W.A.mp3'},
  {'icon': iconImage, 'title': 'Aerials', 'file': '../../../../../../../../D:/MUSIK/System of a Down/Soundtrack hits (bootleg)/Aerials.mp3'},
  {'icon': iconImage, 'title': 'Chop Suey', 'file': '../../../../../../../../D:/MUSIK/System of a Down/2001 - Toxicity/Chop Suey.mp3'},
  {'icon': iconImage, 'title': 'Pictures', 'file': '../../../../../../../../D:/MUSIK/System of a Down/2002 - Steal This Album!/Pictures.mp3'},
  {'icon': iconImage, 'title': 'Psycho', 'file': '../../../../../../../../D:/MUSIK/System of a Down/Soundtrack hits (bootleg)/Psycho.mp3'},
  {'icon': iconImage, 'title': 'Spiders', 'file': '../../../../../../../../D:/MUSIK/System of a Down/1998 - System Of A Down/Spiders.mp3'},
]);
})

document.getElementById('vanessamae').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Aurora', 'file': '../../../../../../../../D:/MUSIK/Vanessa Mae/1997 - Storm/Aurora.mp3'},
  {'icon': iconImage, 'title': 'Can Can', 'file': '../../../../../../../../D:/MUSIK/Vanessa Mae/1997 - Storm/Can, Can.mp3'},
  {'icon': iconImage, 'title': 'Classical Gas', 'file': '../../../../../../../../D:/MUSIK/Vanessa Mae/1995 - The Violin Player/Classical Gas.mp3'},
  {'icon': iconImage, 'title': 'Contradanza', 'file': '../../../../../../../../D:/MUSIK/Vanessa Mae/1995 - The Violin Player/Contradanza.mp3'},
  {'icon': iconImage, 'title': 'I Feel Love', 'file': '../../../../../../../../D:/MUSIK/Vanessa Mae/1997 - Storm/I Feel Love.mp3'},
  {'icon': iconImage, 'title': 'Retro', 'file': '../../../../../../../../D:/MUSIK/Vanessa Mae/1997 - Storm/Retro.mp3'},
  {'icon': iconImage, 'title': 'Storm', 'file': '../../../../../../../../D:/MUSIK/Vanessa Mae/1997 - Storm/Storm.mp3'},
  {'icon': iconImage, 'title': 'Toccata And Fugue In D Minor', 'file': '../../../../../../../../D:/MUSIK/Vanessa Mae/1995 - The Violin Player/Toccata and Fugue in D minor.mp3'},
  {'icon': iconImage, 'title': 'You Fly Me Up', 'file': '../../../../../../../../D:/MUSIK/Vanessa Mae/1997 - Storm/You Fly Me Up.mp3'},
]);
})

document.getElementById('withintemptation').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A Dangerous Mind', 'file': '../../../../../../../../D:/MUSIK/Within Temptation/2004 - The Silent Force/A Dangerous Mind.mp3'},
  {'icon': iconImage, 'title': 'Angels', 'file': '../../../../../../../../D:/MUSIK/Within Temptation/2005 - Angels/Angels.mp3'},
  {'icon': iconImage, 'title': 'Aquarius', 'file': '../../../../../../../../D:/MUSIK/Within Temptation/2004 - The Silent Force/Aquarius.mp3'},
  {'icon': iconImage, 'title': 'Bittersweet', 'file': '../../../../../../../../D:/MUSIK/Within Temptation/2003 - Mother Earth/Bittersweet.mp3'},
  {'icon': iconImage, 'title': 'Destroyed', 'file': '../../../../../../../../D:/MUSIK/Within Temptation/2005 - Memories/Destroyed.mp3'},
  {'icon': iconImage, 'title': 'Enter', 'file': '../../../../../../../../D:/MUSIK/Within Temptation/1997 - Enter/Enter.mp3'},
  {'icon': iconImage, 'title': 'In Perfect Harmony', 'file': '../../../../../../../../D:/MUSIK/Within Temptation/2003 - Mother Earth/In Perfect Harmony.mp3'},
  {'icon': iconImage, 'title': 'Intro', 'file': '../../../../../../../../D:/MUSIK/Within Temptation/2004 - The Silent Force/Intro.mp3'},
  {'icon': iconImage, 'title': 'Its The Fear', 'file': '../../../../../../../../D:/MUSIK/Within Temptation/2004 - The Silent Force/It%27s the Fear.mp3'},
  {'icon': iconImage, 'title': 'Jillian (id Give My Heart)', 'file': '../../../../../../../../D:/MUSIK/Within Temptation/2004 - The Silent Force/Jillian (I%27d Give My Heart).mp3'},
  {'icon': iconImage, 'title': 'Let Us Burn', 'file': '../../../../../../../../D:/MUSIK/Within Temptation/Let Us Burn.mp4'},
  {'icon': iconImage, 'title': 'Let Us Burn Myzuka', 'file': '../../../../../../../../D:/MUSIK/Within Temptation/Let us burn myzuka.mp3'},
  {'icon': iconImage, 'title': 'Memories', 'file': '../../../../../../../../D:/MUSIK/Within Temptation/2004 - The Silent Force/Memories.mp3'},
  {'icon': iconImage, 'title': 'Mother Earth', 'file': '../../../../../../../../D:/MUSIK/Within Temptation/2003 - Mother Earth/Mother Earth.mp3'},
  {'icon': iconImage, 'title': 'Out Farewell', 'file': '../../../../../../../../D:/MUSIK/Within Temptation/2003 - Mother Earth/Out Farewell.mp3'},
  {'icon': iconImage, 'title': 'Overcome', 'file': '../../../../../../../../D:/MUSIK/Within Temptation/2004 - Stand My Ground/Overcome.mp3'},
  {'icon': iconImage, 'title': 'Pale', 'file': '../../../../../../../../D:/MUSIK/Within Temptation/2004 - The Silent Force/Pale.mp3'},
  {'icon': iconImage, 'title': 'Paradise', 'file': '../../../../../../../../D:/MUSIK/Within Temptation/Paradise.mp4'},
  {'icon': iconImage, 'title': 'Pearls Of Light', 'file': '../../../../../../../../D:/MUSIK/Within Temptation/1997 - Enter/Pearls Of Light.mp3'},
  {'icon': iconImage, 'title': 'Running Up That Hill', 'file': '../../../../../../../../D:/MUSIK/Within Temptation/2003 - Running Up And Hill/Running Up That Hill.mp3'},
  {'icon': iconImage, 'title': 'See Who I Am', 'file': '../../../../../../../../D:/MUSIK/Within Temptation/2004 - The Silent Force/See Who I Am.mp3'},
  {'icon': iconImage, 'title': 'Stand My Ground', 'file': '../../../../../../../../D:/MUSIK/Within Temptation/2004 - The Silent Force/Stand My Ground.mp3'},
  {'icon': iconImage, 'title': 'The Swan Song', 'file': '../../../../../../../../D:/MUSIK/Within Temptation/2004 - The Silent Force/The Swan Song.mp3'},
  {'icon': iconImage, 'title': 'We Run Feat', 'file': '../../../../../../../../D:/MUSIK/Within Temptation/We run feat.mp3'},
]);
})

document.getElementById('а.гордон').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '25 Й Кадр', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/25-й кадр.mp3'},
  {'icon': iconImage, 'title': 'Fenomen Margantsa', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Fenomen margantsa.mp3'},
  {'icon': iconImage, 'title': 'Агрессия Сверчков', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Агрессия сверчков.mp3'},
  {'icon': iconImage, 'title': 'Анатомия Старения', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Анатомия старения.mp3'},
  {'icon': iconImage, 'title': 'Антарктида Древний Климат', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Антарктида древний климат.wav'},
  {'icon': iconImage, 'title': 'Астероидная Опастность', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Астероидная опастность.mp3'},
  {'icon': iconImage, 'title': 'Биоизлучение', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Биоизлучение.mp3'},
  {'icon': iconImage, 'title': 'Биологическая Эволюция', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Биологическая эволюция.mp3'},
  {'icon': iconImage, 'title': 'Биологическое Разнообразие', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Биологическое разнообразие.mp3'},
  {'icon': iconImage, 'title': 'Биотерроризм', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Биотерроризм.mp3'},
  {'icon': iconImage, 'title': 'Братья Вавиловы', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Братья Вавиловы.mp3'},
  {'icon': iconImage, 'title': 'Бред Величия', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Бред величия.mp3'},
  {'icon': iconImage, 'title': 'Великая Отечественная Как Гражданская', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Великая отечественная как гражданская.mp3'},
  {'icon': iconImage, 'title': 'Виртуальные Модели Мира', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Виртуальные модели мира.mp3'},
  {'icon': iconImage, 'title': 'Восприятие Красоты', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Восприятие красоты.mp3'},
  {'icon': iconImage, 'title': 'Генетическая История Человечества', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Генетическая история человечества.mp3'},
  {'icon': iconImage, 'title': 'Геном Человека', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Геном человека.mp3'},
  {'icon': iconImage, 'title': 'Гены И Культура', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Гены и культура.mp3'},
  {'icon': iconImage, 'title': 'Гипноз', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Гипноз.mp3'},
  {'icon': iconImage, 'title': 'Гипноз Ислама', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Гипноз ислама.mp3'},
  {'icon': iconImage, 'title': 'Голоса', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Голоса.mp3'},
  {'icon': iconImage, 'title': 'Голоса 2', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Голоса-2.mp3'},
  {'icon': iconImage, 'title': 'Движение Континентов', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Движение континентов.mp3'},
  {'icon': iconImage, 'title': 'Доказательность В Математике', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Доказательность в математике.mp3'},
  {'icon': iconImage, 'title': 'Ефимов Лекцив Фсб', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Ефимов лекцив ФСБ.mp3'},
  {'icon': iconImage, 'title': 'Еффект Сверх Малых Доз', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Еффект сверх малых доз.mp3'},
  {'icon': iconImage, 'title': 'Жизнь Вне Земли ', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Жизнь вне земли....mp3'},
  {'icon': iconImage, 'title': 'Жизнь Звезных Систем', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Жизнь звезных систем.mp3'},
  {'icon': iconImage, 'title': 'Запрограмированная Смерть', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Запрограмированная смерть.mp3'},
  {'icon': iconImage, 'title': 'Зелёная Химия', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Зелёная химия.mp3'},
  {'icon': iconImage, 'title': 'Игра Жизни И Физика Её Воплощения', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Игра жизни и физика её воплощения.mp3'},
  {'icon': iconImage, 'title': 'Из Лягушек В Принцы', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Из лягушек в принцы.mp3'},
  {'icon': iconImage, 'title': 'Интеллект И Наследственность', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Интеллект и наследственность.mp3'},
  {'icon': iconImage, 'title': 'Интеллект Муравьёв', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Интеллект муравьёв.mp3'},
  {'icon': iconImage, 'title': 'Интуиция', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Интуиция.mp3'},
  {'icon': iconImage, 'title': 'Истоки Происхождения Сознания', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Истоки происхождения сознания .mp3'},
  {'icon': iconImage, 'title': 'Квантовая Гравитация', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Квантовая гравитация.mp3'},
  {'icon': iconImage, 'title': 'Квантовая Математика', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Квантовая математика.mp3'},
  {'icon': iconImage, 'title': 'Квантовая Телепортация', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Квантовая телепортация.mp3'},
  {'icon': iconImage, 'title': 'Квантовые Игры', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Квантовые игры.mp3'},
  {'icon': iconImage, 'title': 'Квантовые Компьютеры И Модели Сознания', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Квантовые компьютеры и модели сознания.mp3'},
  {'icon': iconImage, 'title': 'Квантовый Регулятор Клетки', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Квантовый регулятор клетки.mp3'},
  {'icon': iconImage, 'title': 'Класс Интелектуалов', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Класс интелектуалов.mp3'},
  {'icon': iconImage, 'title': 'Когнитивная Наука [не До Конца]', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Когнитивная наука [не до конца].mp3'},
  {'icon': iconImage, 'title': 'Код Идентичности', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Код идентичности.mp3'},
  {'icon': iconImage, 'title': 'Код Идентичности 2', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Код идентичности-2 .mp3'},
  {'icon': iconImage, 'title': 'Коровье Бешенство', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Коровье бешенство.mp3'},
  {'icon': iconImage, 'title': 'Космология Картина Времени', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Космология картина времени.mp3'},
  {'icon': iconImage, 'title': 'Космос Будущего', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Космос будущего.mp3'},
  {'icon': iconImage, 'title': 'Красное И Чёрное', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Красное и чёрное.mp3'},
  {'icon': iconImage, 'title': 'Культура И Мозг', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Культура и мозг.mp3'},
  {'icon': iconImage, 'title': 'Лабиринт Генетики', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Лабиринт генетики.mp3'},
  {'icon': iconImage, 'title': 'Лики Времени', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Лики времени.mp3'},
  {'icon': iconImage, 'title': 'Луна', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Луна.mp3'},
  {'icon': iconImage, 'title': 'Макроскопические Феномены Спина', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Макроскопические феномены спина.mp3'},
  {'icon': iconImage, 'title': 'Малые Дозы Радиации', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Малые дозы радиации.mp3'},
  {'icon': iconImage, 'title': 'Математика И Структура Вселенной', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Математика и структура вселенной.mp3'},
  {'icon': iconImage, 'title': 'Метафизика Брэнда', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Метафизика брэнда.mp3'},
  {'icon': iconImage, 'title': 'Механизмы Памяти И Забвения', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Механизмы памяти и забвения.mp3'},
  {'icon': iconImage, 'title': 'Микроорганизмы В Метеорите', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Микроорганизмы в метеорите.mp3'},
  {'icon': iconImage, 'title': 'Мир Как Вакуум', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Мир как вакуум.mp3'},
  {'icon': iconImage, 'title': 'Миры И Вселенные', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Миры и вселенные.mp3'},
  {'icon': iconImage, 'title': 'Мифология Повседневности', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Мифология повседневности.mp3'},
  {'icon': iconImage, 'title': 'Моделирование Происхождения Интелекта', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Моделирование происхождения интелекта.mp3'},
  {'icon': iconImage, 'title': 'Модель Вселенной', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Модель вселенной.mp3'},
  {'icon': iconImage, 'title': 'Мужчина И Женщина В Языке', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Мужчина и женщина в языке.mp3'},
  {'icon': iconImage, 'title': 'Мышление Животных', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Мышление животных.mp3'},
  {'icon': iconImage, 'title': 'Мышление О Мышлении', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Мышление о мышлении.mp3'},
  {'icon': iconImage, 'title': 'Нанохимия', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Нанохимия.mp3'},
  {'icon': iconImage, 'title': 'Наука Бессмертия', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Наука бессмертия.mp3'},
  {'icon': iconImage, 'title': 'Наука И Гипотеза', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Наука и гипотеза.mp3'},
  {'icon': iconImage, 'title': 'Нейроэволюция', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Нейроэволюция.mp3'},
  {'icon': iconImage, 'title': 'Нейтрино', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Нейтрино.mp3'},
  {'icon': iconImage, 'title': 'Нелинейный Мир', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Нелинейный мир .mp3'},
  {'icon': iconImage, 'title': 'Новая Астрология', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Новая астрология.mp3'},
  {'icon': iconImage, 'title': 'Нравы Древней Руси', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Нравы древней руси.mp3'},
  {'icon': iconImage, 'title': 'Парадокс Левинталя', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Парадокс Левинталя.mp3'},
  {'icon': iconImage, 'title': 'Парниковая Катастрофа', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Парниковая катастрофа.mp3'},
  {'icon': iconImage, 'title': 'Поиск Внеземной Цивилизации', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Поиск внеземной цивилизации.mp3'},
  {'icon': iconImage, 'title': 'Поиск Временных Цмвилизаций', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Поиск временных цмвилизаций.mp3'},
  {'icon': iconImage, 'title': 'Поиск Черных Дыр', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Поиск черных дыр.mp3'},
  {'icon': iconImage, 'title': 'Постсоветизм', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Постсоветизм.mp3'},
  {'icon': iconImage, 'title': 'Поток Времени', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Поток времени.mp3'},
  {'icon': iconImage, 'title': 'Пределы Бесконечности', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Пределы бесконечности.mp3'},
  {'icon': iconImage, 'title': 'Природа Сна', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Природа сна.mp3'},
  {'icon': iconImage, 'title': 'Причина Времени', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Причина времени.mp3'},
  {'icon': iconImage, 'title': 'Прогноз Погоды', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Прогноз погоды.mp3'},
  {'icon': iconImage, 'title': 'Происхождение Вселенной', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Происхождение Вселенной%27.mp3'},
  {'icon': iconImage, 'title': 'Реалитивистская Теория Гравитации', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Реалитивистская теория гравитации.mp3'},
  {'icon': iconImage, 'title': 'Российский Пациент', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Российский пациент.mp3'},
  {'icon': iconImage, 'title': 'Сверхтяжёлые Элементы', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Сверхтяжёлые элементы.mp3'},
  {'icon': iconImage, 'title': 'Социум Приматов', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Социум приматов.mp3'},
  {'icon': iconImage, 'title': 'Стволовые Клетки Человека', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Стволовые клетки человека.mp3'},
  {'icon': iconImage, 'title': 'Странности Квантового Мира', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Странности квантового мира.mp3'},
  {'icon': iconImage, 'title': 'Страх', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Страх.wav'},
  {'icon': iconImage, 'title': 'Структура Вакуума', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Структура вакуума .mp3'},
  {'icon': iconImage, 'title': 'Тёмная Энергия Во Вселенной', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Тёмная энергия во Вселенной.mp3'},
  {'icon': iconImage, 'title': 'Теории Антропогенеза', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Теории антропогенеза.mp3'},
  {'icon': iconImage, 'title': 'Теория Суперструн', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Теория суперструн.mp3'},
  {'icon': iconImage, 'title': 'Термоядерная Реакция', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Термоядерная реакция.mp3'},
  {'icon': iconImage, 'title': 'Трансформация Элементов', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Трансформация элементов.mp3'},
  {'icon': iconImage, 'title': 'Феномен Жизни', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Феномен жизни.mp3'},
  {'icon': iconImage, 'title': 'Феномен Жизни 2', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Феномен жизни - 2.mp3'},
  {'icon': iconImage, 'title': 'Физика Духа', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Физика духа.mp3'},
  {'icon': iconImage, 'title': 'Физика И Математика В Контексте Биогенеза', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Физика и математика в контексте биогенеза.mp3'},
  {'icon': iconImage, 'title': 'Физика И Свобода Воли', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Физика и свобода воли.mp3'},
  {'icon': iconImage, 'title': 'Физические Поля Человека', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Физические поля человека.mp3'},
  {'icon': iconImage, 'title': 'Философия Денег', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Философия денег.mp3'},
  {'icon': iconImage, 'title': 'Формула Рака', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Формула рака.mp3'},
  {'icon': iconImage, 'title': 'Человек И Солнце', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Человек и Солнце.mp3'},
  {'icon': iconImage, 'title': 'Человек Пунктирный', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Человек пунктирный.mp3'},
  {'icon': iconImage, 'title': 'Черные Курильщики', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Черные курильщики.mp3'},
  {'icon': iconImage, 'title': 'Число Время Свет', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Число, время, свет.mp3'},
  {'icon': iconImage, 'title': 'Что Есть Время', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Что есть время .mp3'},
  {'icon': iconImage, 'title': 'Шаровая Молния', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Шаровая молния.mp3'},
  {'icon': iconImage, 'title': 'Эволюционная Теория Пола', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Эволюционная теория пола.mp3'},
  {'icon': iconImage, 'title': 'Эволюционная Теория Пола Ii', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Эволюционная теория пола II.mp3'},
  {'icon': iconImage, 'title': 'Экономическое Пространство Будущего', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Экономическое пространство будущего.mp3'},
  {'icon': iconImage, 'title': 'Эктоны', 'file': '../../../../../../../../D:/MUSIK/А. Гордон/Эктоны.mp3'},
]);
})

document.getElementById('а.малинин').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '04 В Лунном Саду', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/2001-Любви желанная пора/04 - В лунном саду.mp3'},
  {'icon': iconImage, 'title': '07 В Полуденном Саду', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/2001-Любви желанная пора/07 - В полуденном саду.mp3'},
  {'icon': iconImage, 'title': '1 Гори Гори Моя Звезда', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/1994-Бал/1. Гори, Гори, Моя Звезда.mp3'},
  {'icon': iconImage, 'title': '12 Гори Гори Моя Звезда', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/1994-Бал/12. Гори, гори, моя звезда.mp3'},
  {'icon': iconImage, 'title': '15 Ночь', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/1994-Бал/15. Ночь.mp3'},
  {'icon': iconImage, 'title': 'Ledi Gamilton', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/2005-Grand Collection/Ledi Gamilton.mp3'},
  {'icon': iconImage, 'title': 'Net Puti Nazad', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/2005-Grand Collection/Net puti nazad.mp3'},
  {'icon': iconImage, 'title': 'Piligrimi', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/2005-Grand Collection/Piligrimi.mp3'},
  {'icon': iconImage, 'title': 'Белый Конь', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/1994-Бал/Белый конь.mp3'},
  {'icon': iconImage, 'title': 'В Лунном Саду', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/А.Малинин/В лунном саду.mp3'},
  {'icon': iconImage, 'title': 'В Полуденном Саду', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/А.Малинин/В полуденном саду.mp3'},
  {'icon': iconImage, 'title': 'Глаза Твои', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/2001-Любви желанная пора/Глаза твои.mp3'},
  {'icon': iconImage, 'title': 'Дай Бог', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/А.Малинин/Дай бог.mp3'},
  {'icon': iconImage, 'title': 'Дай Бог', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/2003-Звезды российской эстрады 2CD/Дай Бог.mp3'},
  {'icon': iconImage, 'title': 'Дорогой Длинною', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/2007-Романсы/Дорогой Длинною.mp3'},
  {'icon': iconImage, 'title': 'Забава', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/2003-Звезды российской эстрады 2CD/Забава.mp3'},
  {'icon': iconImage, 'title': 'Зачем Я Влюбился', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/2003-Старинные русские романсы/Зачем я влюбился.mp3'},
  {'icon': iconImage, 'title': 'Звезда', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/А.Малинин/Звезда.mp3'},
  {'icon': iconImage, 'title': 'Любви Желанная Пора', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/2001-Любви желанная пора/Любви желанная пора.mp3'},
  {'icon': iconImage, 'title': 'Любви Желанная Пора', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/А.Малинин/Любви желанная пора.mp3'},
  {'icon': iconImage, 'title': 'Майдан', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/А.Малинин/Майдан.mp3'},
  {'icon': iconImage, 'title': 'Милый Голубь', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/А.Малинин/Милый голубь.mp3'},
  {'icon': iconImage, 'title': 'Мольбa', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/А.Малинин/Мольбa.mp3'},
  {'icon': iconImage, 'title': 'Мольбa', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/1991-Поручик Голицын/Мольбa.mp3'},
  {'icon': iconImage, 'title': 'Напрасные Слова', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/А.Малинин/Напрасные слова.mp3'},
  {'icon': iconImage, 'title': 'Напрасные Слова', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/1991-Поручик Голицын/Напрасные слова.mp3'},
  {'icon': iconImage, 'title': 'Незнакомка', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/2001-Любви желанная пора/Незнакомка.mp3'},
  {'icon': iconImage, 'title': 'Незнакомка', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/А.Малинин/Незнакомка.mp3'},
  {'icon': iconImage, 'title': 'Нищая', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/2003-Старинные русские романсы/Нищая.mp3'},
  {'icon': iconImage, 'title': 'Ночь', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/1994-Бал/Ночь.mp3'},
  {'icon': iconImage, 'title': 'Пaрутчик Галицин', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/А.Малинин/Пaрутчик Галицин.mp3'},
  {'icon': iconImage, 'title': 'Пoэт', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/2003-Звезды российской эстрады 2CD/Пoэт.mp3'},
  {'icon': iconImage, 'title': 'Парутчик Галицин', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/А.Малинин/Парутчик Галицин.mp3'},
  {'icon': iconImage, 'title': 'Помни И Не Забывай', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/2001-Берега/Помни и не забывай.mp3'},
  {'icon': iconImage, 'title': 'Поручик Голицын', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/1991-Поручик Голицын/Поручик Голицын.mp3'},
  {'icon': iconImage, 'title': 'Поэт', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/2003-Звезды российской эстрады 2CD/Поэт.mp3'},
  {'icon': iconImage, 'title': 'Пугачев', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/А.Малинин/Пугачев.mp3'},
  {'icon': iconImage, 'title': 'Пугачев', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/2001-Любви желанная пора/Пугачев.mp3'},
  {'icon': iconImage, 'title': 'Распутин', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/2004-Лучшее 2-CD/Распутин.mp3'},
  {'icon': iconImage, 'title': 'Ти Ж Мене Підманула', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/2007-Чарiвна скрипка/Ти ж мене підманула.mp3'},
  {'icon': iconImage, 'title': 'Ты Не Любишь Меня Милый Голубь', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/2001-Любви желанная пора/Ты не любишь меня, милый голубь.mp3'},
  {'icon': iconImage, 'title': 'Ямщик', 'file': '../../../../../../../../D:/MUSIK/А. Малинин/2003-Старинные русские романсы/Ямщик.mp3'},
]);
})

document.getElementById('а.розенбаум').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '18 Лет Спустя', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1986 - 1988 - Былое/18 лет спустя.mp3'},
  {'icon': iconImage, 'title': '38 Узлов', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1983 - Новые песни/38 узлов .mp3'},
  {'icon': iconImage, 'title': 'А Может Не Было Войныi', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1986 - 1988 - Былое/А, может, не было войныi.mp3'},
  {'icon': iconImage, 'title': 'Баловалась Вечером Гитарой Тишина ', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1983 - Новые песни/Баловалась вечером гитарой тишина....mp3'},
  {'icon': iconImage, 'title': 'Вальс 37 Го Года', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1984 - Концерт в Воркуте/Вальс 37-го года.mp3'},
  {'icon': iconImage, 'title': 'Вальс Бостон', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1984 - Концерт в Воркуте/Вальс-бостон .mp3'},
  {'icon': iconImage, 'title': 'Вальс На Плоскости', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1986 - 1988 - Былое/Вальс на плоскости.mp3'},
  {'icon': iconImage, 'title': 'Вещая Судьба', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1986 - 1988 - Былое/Вещая судьба.mp3'},
  {'icon': iconImage, 'title': 'Воспоминание О Будущем', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1984 - Концерт в Воркуте/Воспоминание о будущем.mp3'},
  {'icon': iconImage, 'title': 'Глухари', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1983 - Новые песни/Глухари .mp3'},
  {'icon': iconImage, 'title': 'Дело Было В Ресторане', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1983 - Новые песни/Дело было в ресторане.mp3'},
  {'icon': iconImage, 'title': 'Есаул Молоденький', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1987 - Концерт в Нью-Йорке/Есаул молоденький.mp3'},
  {'icon': iconImage, 'title': 'Заходите К Нам На Огонек', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1987 - Концерт в Нью-Йорке/Заходите к нам на огонек.mp3'},
  {'icon': iconImage, 'title': 'Зойка', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1983 - Новые песни/Зойка.mp3'},
  {'icon': iconImage, 'title': 'Извозчик', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1982 - Концерт, посвященный памяти А. Северного/Извозчик .mp3'},
  {'icon': iconImage, 'title': 'Казачья', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1983 - Новые песни/Казачья.mp3'},
  {'icon': iconImage, 'title': 'Как На Гриф Резной ', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1983 - Новые песни/Как на гриф резной....mp3'},
  {'icon': iconImage, 'title': 'Камикадзе', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1996 - Концерт в день рождения/Камикадзе.WAV'},
  {'icon': iconImage, 'title': 'Красная Стена', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1986 - 1988 - Былое/Красная стена .mp3'},
  {'icon': iconImage, 'title': 'Кубанская Казачья', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1986 - 1988 - Былое/Кубанская казачья.mp3'},
  {'icon': iconImage, 'title': 'Лесосплав', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1983 - Новые песни/Лесосплав.mp3'},
  {'icon': iconImage, 'title': 'На Улице Марата', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1983 - Новые песни/На улице Марата.mp3'},
  {'icon': iconImage, 'title': 'Надоело', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/Надоело.mp3'},
  {'icon': iconImage, 'title': 'Налетела Грусть', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1986 - 1988 - Былое/Налетела грусть.mp3'},
  {'icon': iconImage, 'title': 'Нету Времени', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1983 - Посвящение посвящающим/Нету времени .mp3'},
  {'icon': iconImage, 'title': 'Отслужи По Мне Отслужи', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1986 - 1988 - Былое/Отслужи по мне, отслужи.mp3'},
  {'icon': iconImage, 'title': 'Песня Коня Цыганских Кровей', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1983 - Новые песни/Песня коня цыганских кровей.mp3'},
  {'icon': iconImage, 'title': 'По Снегу Летящему С Неба', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1983 - Новые песни/По снегу, летящему с неба.mp3'},
  {'icon': iconImage, 'title': 'Посвящение Посвящающим', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1983 - Посвящение посвящающим/Посвящение посвящающим.mp3'},
  {'icon': iconImage, 'title': 'Послепобедный Вальс', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1986 - 1988 - Былое/Послепобедный вальс.mp3'},
  {'icon': iconImage, 'title': 'Проводи Ка Меня Батя На Войну', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1987 - Концерт на ЛОМО/Проводи-ка меня, батя, на войну.mp3'},
  {'icon': iconImage, 'title': 'Проводы', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1986 - 1988 - Былое/Проводы .mp3'},
  {'icon': iconImage, 'title': 'Прости Прощай', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1983 - Посвящение посвящающим/Прости-прощай.mp3'},
  {'icon': iconImage, 'title': 'Разговор Подслушанный В Электричке Ленинград Мга', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1983 - Новые песни/Разговор, подслушанный в электричке Ленинград-МГА.mp3'},
  {'icon': iconImage, 'title': 'Реквием', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1983 - Новые песни/Реквием.mp3'},
  {'icon': iconImage, 'title': 'Рождение Стихов', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1987 - Концерт на ЛОМО/Рождение стихов.mp3'},
  {'icon': iconImage, 'title': 'Романс Генерала Чарноты', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1983 - Новые песни/Романс генерала Чарноты.mp3'},
  {'icon': iconImage, 'title': 'Свадьба', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1983 - Новые песни/Свадьба.mp3'},
  {'icon': iconImage, 'title': 'Утиная Охота', 'file': '../../../../../../../../D:/MUSIK/А.Розенбаум/1983 - Новые песни/Утиная охота.mp3'},
]);
})

document.getElementById('агатакристи').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Viva Kalma', 'file': '../../../../../../../../D:/MUSIK/Агата Кристи/1989 - Коварство и любовь/Viva Kalma.mp3'},
  {'icon': iconImage, 'title': 'Второй Фронт', 'file': '../../../../../../../../D:/MUSIK/Агата Кристи/1988 - Второй фронт/Второй фронт.mp3'},
  {'icon': iconImage, 'title': 'Два Корабля', 'file': '../../../../../../../../D:/MUSIK/Агата Кристи/1996 - Ураган/Два корабля.mp3'},
  {'icon': iconImage, 'title': 'Как На Войне', 'file': '../../../../../../../../D:/MUSIK/Агата Кристи/1993 - Позорная звезда/Как на войне.mp3'},
  {'icon': iconImage, 'title': 'Легион', 'file': '../../../../../../../../D:/MUSIK/Агата Кристи/1996 - Ураган/Легион.mp3'},
  {'icon': iconImage, 'title': 'Сказочная Тайга', 'file': '../../../../../../../../D:/MUSIK/Агата Кристи/1994 - Опиум/Сказочная тайга.mp3'},
  {'icon': iconImage, 'title': 'Сны', 'file': '../../../../../../../../D:/MUSIK/Агата Кристи/1998 - Чудеса/Сны.mp3'},
  {'icon': iconImage, 'title': 'Собачье Сердце', 'file': '../../../../../../../../D:/MUSIK/Агата Кристи/1989 - Коварство и любовь/Собачье сердце.mp3'},
  {'icon': iconImage, 'title': 'Черная Луна', 'file': '../../../../../../../../D:/MUSIK/Агата Кристи/1994 - Опиум/Черная Луна.mp3'},
]);
})

document.getElementById('алиса').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Веретено', 'file': '../../../../../../../../D:/MUSIK/Алиса/2001 - Танцевать/Веретено.mp3'},
  {'icon': iconImage, 'title': 'Вор И Палач', 'file': '../../../../../../../../D:/MUSIK/Алиса/1984 - Нерная ночь/Вор и палач.mp3'},
  {'icon': iconImage, 'title': 'Все Решено', 'file': '../../../../../../../../D:/MUSIK/Алиса/1998 - Пляс Сибири на берегу Невы/Все решено.mp3'},
  {'icon': iconImage, 'title': 'Дождь', 'file': '../../../../../../../../D:/MUSIK/Алиса/1996 - Jazz/Дождь.mp3'},
  {'icon': iconImage, 'title': 'Доктор Франкенштейн', 'file': '../../../../../../../../D:/MUSIK/Алиса/1984 - Нерная ночь/Доктор Франкенштейн.mp3'},
  {'icon': iconImage, 'title': 'Душа', 'file': '../../../../../../../../D:/MUSIK/Алиса/2003 - Сейчас позднее чем  ты думаеш/Душа.mp3'},
  {'icon': iconImage, 'title': 'Емеля', 'file': '../../../../../../../../D:/MUSIK/Алиса/2005 - Мы вместе 20лет/Емеля.mp3'},
  {'icon': iconImage, 'title': 'Мама', 'file': '../../../../../../../../D:/MUSIK/Алиса/1997 - Дурень/Мама.mp3'},
  {'icon': iconImage, 'title': 'Меломан', 'file': '../../../../../../../../D:/MUSIK/Алиса/2002 - Акустика/Меломан.mp3'},
  {'icon': iconImage, 'title': 'Моё Покаление', 'file': '../../../../../../../../D:/MUSIK/Алиса/Моё покаление.WAV'},
  {'icon': iconImage, 'title': 'Папа Тани', 'file': '../../../../../../../../D:/MUSIK/Алиса/1985 - Акустика I/Папа Тани.mp3'},
  {'icon': iconImage, 'title': 'Перекресток', 'file': '../../../../../../../../D:/MUSIK/Алиса/1996 - Jazz/Перекресток.mp3'},
  {'icon': iconImage, 'title': 'Родина', 'file': '../../../../../../../../D:/MUSIK/Алиса/2003 - Сейчас позднее чем  ты думаеш/Родина.mp3'},
  {'icon': iconImage, 'title': 'Сказка', 'file': '../../../../../../../../D:/MUSIK/Алиса/1986 - Поколение X/Сказка.mp3'},
  {'icon': iconImage, 'title': 'Споконая Ночь', 'file': '../../../../../../../../D:/MUSIK/Алиса/1998 - Пляс Сибири на берегу Невы/Споконая ночь.mp3'},
  {'icon': iconImage, 'title': 'Танец На Палубе', 'file': '../../../../../../../../D:/MUSIK/Алиса/1990 - Ст.206 ч.2/Танец на палубе.mp3'},
  {'icon': iconImage, 'title': 'Театр', 'file': '../../../../../../../../D:/MUSIK/Алиса/1993 - Для тех, кто свалился с луны/Театр.mp3'},
  {'icon': iconImage, 'title': 'Траса Е 95', 'file': '../../../../../../../../D:/MUSIK/Алиса/1997 - Дурень/Траса Е-95.mp3'},
]);
})

document.getElementById('ария').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Ангельская Пыль', 'file': '../../../../../../../../D:/MUSIK/Ария/2002 - Штиль/Ангельская пыль.mp3'},
  {'icon': iconImage, 'title': 'Антихрист', 'file': '../../../../../../../../D:/MUSIK/Ария/1991 - Кровь за кровь/Антихрист.mp3'},
  {'icon': iconImage, 'title': 'Беги За Солнцем', 'file': '../../../../../../../../D:/MUSIK/Ария/1998 - Генератор Зла/Беги за солнцем.mp3'},
  {'icon': iconImage, 'title': 'Без Тебя', 'file': '../../../../../../../../D:/MUSIK/Ария/1999 -  2000 И Одна Ночь/Без тебя.mp3'},
  {'icon': iconImage, 'title': 'Беспечный Ангел', 'file': '../../../../../../../../D:/MUSIK/Ария/2002 - Штиль/Беспечный ангел.mp3'},
  {'icon': iconImage, 'title': 'Бесы', 'file': '../../../../../../../../D:/MUSIK/Ария/1991 - Кровь за кровь/Бесы.mp3'},
  {'icon': iconImage, 'title': 'Возьми Моё Сердце', 'file': '../../../../../../../../D:/MUSIK/Ария/1995 - Ночь Короче Дня/Возьми моё сердце.mp3'},
  {'icon': iconImage, 'title': 'Возьми Моё Сердце', 'file': '../../../../../../../../D:/MUSIK/Ария/1999 -  2000 И Одна Ночь/Возьми моё сердце.mp3'},
  {'icon': iconImage, 'title': 'Воля И Разум', 'file': '../../../../../../../../D:/MUSIK/Ария/1986 - С Кем Ты/Воля и разум.mp3'},
  {'icon': iconImage, 'title': 'Все Что Было', 'file': '../../../../../../../../D:/MUSIK/Ария/1991 - Кровь за кровь/Все что было.mp3'},
  {'icon': iconImage, 'title': 'Герой Асфальта', 'file': '../../../../../../../../D:/MUSIK/Ария/2002 - Штиль/Герой асфальта.mp3'},
  {'icon': iconImage, 'title': 'Герой Асфальта', 'file': '../../../../../../../../D:/MUSIK/Ария/2003 - Путь наверх 2/Герой асфальта.mp3'},
  {'icon': iconImage, 'title': 'Грязь', 'file': '../../../../../../../../D:/MUSIK/Ария/1999 -  2000 И Одна Ночь/Грязь.mp3'},
  {'icon': iconImage, 'title': 'Дай Руку Мне', 'file': '../../../../../../../../D:/MUSIK/Ария/2002 - Штиль/Дай руку мне.mp3'},
  {'icon': iconImage, 'title': 'Дезертир', 'file': '../../../../../../../../D:/MUSIK/Ария/1998 - Генератор Зла/Дезертир.mp3'},
  {'icon': iconImage, 'title': 'Закат', 'file': '../../../../../../../../D:/MUSIK/Ария/1999 -  2000 И Одна Ночь/Закат.mp3'},
  {'icon': iconImage, 'title': 'Искушение', 'file': '../../../../../../../../D:/MUSIK/Ария/1989 - Игра С Огнём/Искушение.mp3'},
  {'icon': iconImage, 'title': 'Колизей', 'file': '../../../../../../../../D:/MUSIK/Ария/Колизей/Колизей.mp3'},
  {'icon': iconImage, 'title': 'Кровь За Кровь', 'file': '../../../../../../../../D:/MUSIK/Ария/1991 - Кровь за кровь/Кровь за кровь.mp3'},
  {'icon': iconImage, 'title': 'Кто Ты', 'file': '../../../../../../../../D:/MUSIK/Ария/1999 -  2000 И Одна Ночь/Кто ты .mp3'},
  {'icon': iconImage, 'title': 'Мечты', 'file': '../../../../../../../../D:/MUSIK/Ария/1999 -  2000 И Одна Ночь/Мечты.mp3'},
  {'icon': iconImage, 'title': 'Осколок Льда', 'file': '../../../../../../../../D:/MUSIK/Ария/2001 - Химера/Осколок льда.mp3'},
  {'icon': iconImage, 'title': 'Потерянный Рай', 'file': '../../../../../../../../D:/MUSIK/Ария/1999 -  2000 И Одна Ночь/Потерянный рай.mp3'},
  {'icon': iconImage, 'title': 'Пробил Час', 'file': '../../../../../../../../D:/MUSIK/Ария/2002 - Штиль/Пробил час.mp3'},
  {'icon': iconImage, 'title': 'Путь Наверх', 'file': '../../../../../../../../D:/MUSIK/Ария/1997 - Cмутное Время/Путь наверх.mp3'},
  {'icon': iconImage, 'title': 'Путь Наверх', 'file': '../../../../../../../../D:/MUSIK/Ария/2003 - Путь наверх 1/Путь наверх.mp3'},
  {'icon': iconImage, 'title': 'Раскачаем Этот Мир', 'file': '../../../../../../../../D:/MUSIK/Ария/1989 - Игра С Огнём/Раскачаем этот мир.mp3'},
  {'icon': iconImage, 'title': 'Свобода', 'file': '../../../../../../../../D:/MUSIK/Ария/2002 - Штиль/Свобода.mp3'},
  {'icon': iconImage, 'title': 'Смутное Время', 'file': '../../../../../../../../D:/MUSIK/Ария/2004 - Вавилон/Смутное время.mp3'},
  {'icon': iconImage, 'title': 'Тореро', 'file': '../../../../../../../../D:/MUSIK/Ария/1985 - Мания Величия/Тореро.mp3'},
  {'icon': iconImage, 'title': 'Улица Роз', 'file': '../../../../../../../../D:/MUSIK/Ария/1999 -  2000 И Одна Ночь/Улица Роз.mp3'},
  {'icon': iconImage, 'title': 'Химера', 'file': '../../../../../../../../D:/MUSIK/Ария/2001 - Химера/Химера.mp3'},
  {'icon': iconImage, 'title': 'Штиль', 'file': '../../../../../../../../D:/MUSIK/Ария/2001 - Химера/Штиль.mp3'},
  {'icon': iconImage, 'title': 'Я Здесь', 'file': '../../../../../../../../D:/MUSIK/Ария/2005 - Реки времен/Я здесь.mp3'},
  {'icon': iconImage, 'title': 'Я Свободен', 'file': '../../../../../../../../D:/MUSIK/Ария/2004 - Вавилон/Я свободен.mp3'},
]);
})

document.getElementById('би-2').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Варвара', 'file': '../../../../../../../../D:/MUSIK/Би - 2/2000 - БИ-2/Варвара.mp3'},
  {'icon': iconImage, 'title': 'Волки', 'file': '../../../../../../../../D:/MUSIK/Би - 2/Волки.mp3'},
  {'icon': iconImage, 'title': 'Мой Рок Н Ролл', 'file': '../../../../../../../../D:/MUSIK/Би - 2/Мой рок-н-ролл.mp3'},
  {'icon': iconImage, 'title': 'Остаться В Живых', 'file': '../../../../../../../../D:/MUSIK/Би - 2/Мяу Кисс МИ/Остаться В Живых.mp3'},
  {'icon': iconImage, 'title': 'Полковнику Никто Не Пишет', 'file': '../../../../../../../../D:/MUSIK/Би - 2/2000 - БИ-2/Полковнику никто не пишет.mp3'},
  {'icon': iconImage, 'title': 'Полковнику Никто Не Пишет В Hd', 'file': '../../../../../../../../D:/MUSIK/Би - 2/Полковнику никто не пишет в HD.mp4'},
  {'icon': iconImage, 'title': 'Серебро', 'file': '../../../../../../../../D:/MUSIK/Би - 2/2000 - БИ-2/Серебро.mp3'},
  {'icon': iconImage, 'title': 'Счастье', 'file': '../../../../../../../../D:/MUSIK/Би - 2/2000 - БИ-2/Счастье.mp3'},
  {'icon': iconImage, 'title': 'Феллини', 'file': '../../../../../../../../D:/MUSIK/Би - 2/Феллини.mp3'},
]);
})

document.getElementById('браво').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Ветер Знает ', 'file': '../../../../../../../../D:/MUSIK/Браво/1995 - Ветер Знает/Ветер знает....mp3'},
  {'icon': iconImage, 'title': 'Дорога В Облака', 'file': '../../../../../../../../D:/MUSIK/Браво/1994 - Дорога в Облака/Дорога в облака.mp3'},
  {'icon': iconImage, 'title': 'Замок Из Песка', 'file': '../../../../../../../../D:/MUSIK/Браво/1994 - Дорога в Облака/Замок из песка.mp3'},
  {'icon': iconImage, 'title': 'Кошки', 'file': '../../../../../../../../D:/MUSIK/Браво/1983-88 - Жанна Агузарова и Браво/Кошки.mp3'},
  {'icon': iconImage, 'title': 'Ленинградский Рок Н Рол', 'file': '../../../../../../../../D:/MUSIK/Браво/1999 - Grand Collection/Ленинградский рок-н-рол.mp3'},
  {'icon': iconImage, 'title': 'Лучший Город Земли', 'file': '../../../../../../../../D:/MUSIK/Браво/1994 - Дорога в Облака/Лучший город земли.mp3'},
  {'icon': iconImage, 'title': 'Любите Девушки', 'file': '../../../../../../../../D:/MUSIK/Браво/1994 - Дорога в Облака/Любите девушки.mp3'},
  {'icon': iconImage, 'title': 'Московский Бит', 'file': '../../../../../../../../D:/MUSIK/Браво/1999 - Grand Collection/Московский бит.mp3'},
  {'icon': iconImage, 'title': 'Пилот 12 45', 'file': '../../../../../../../../D:/MUSIK/Браво/1994 - Live In Moscow/Пилот 12-45.mp3'},
  {'icon': iconImage, 'title': 'Старый Отель', 'file': '../../../../../../../../D:/MUSIK/Браво/1983-88 - Жанна Агузарова и Браво/Старый отель.mp3'},
  {'icon': iconImage, 'title': 'Черный Кот', 'file': '../../../../../../../../D:/MUSIK/Браво/1995 - Песни Разных Лет/Черный кот.mp3'},
  {'icon': iconImage, 'title': 'Чудесная Страна', 'file': '../../../../../../../../D:/MUSIK/Браво/1994 - Live In Moscow/Чудесная страна.mp3'},
  {'icon': iconImage, 'title': 'Этот Город', 'file': '../../../../../../../../D:/MUSIK/Браво/1995 - Ветер Знает/Этот город.mp3'},
]);
})

document.getElementById('в.токарев').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'В Шумном Балагане', 'file': '../../../../../../../../D:/MUSIK/В.Токарев/1981 - В шумном балагане/В шумном балагане.mp3'},
  {'icon': iconImage, 'title': 'Мамая Сын Твой', 'file': '../../../../../../../../D:/MUSIK/В.Токарев/1985 - С Днем рожденья, милая мама/Мама,я сын твой.mp3'},
  {'icon': iconImage, 'title': 'Над Гудзоном', 'file': '../../../../../../../../D:/MUSIK/В.Токарев/1983 - Над Гудзоном/Над Гудзоном.mp3'},
  {'icon': iconImage, 'title': 'Нью Йоркский Таксист', 'file': '../../../../../../../../D:/MUSIK/В.Токарев/1981 - В шумном балагане/Нью-йоркский таксист.mp3'},
  {'icon': iconImage, 'title': 'Придурок Ненормальный', 'file': '../../../../../../../../D:/MUSIK/В.Токарев/1981 - В шумном балагане/Придурок ненормальный.mp3'},
  {'icon': iconImage, 'title': 'Ростовский Урка', 'file': '../../../../../../../../D:/MUSIK/В.Токарев/1981 - В шумном балагане/Ростовский урка.mp3'},
  {'icon': iconImage, 'title': 'С Днём Рождения Милая Мама', 'file': '../../../../../../../../D:/MUSIK/В.Токарев/1985 - С Днем рожденья, милая мама/С Днём рождения милая мама.mp3'},
  {'icon': iconImage, 'title': 'Чубчик Кучерявый', 'file': '../../../../../../../../D:/MUSIK/В.Токарев/1983 - Над Гудзоном/Чубчик Кучерявый.mp3'},
]);
})

document.getElementById('високосныйгод').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '16 37', 'file': '../../../../../../../../D:/MUSIK/Високосный год/16.37 .mp3'},
  {'icon': iconImage, 'title': 'Кино', 'file': '../../../../../../../../D:/MUSIK/Високосный год/Кино.mp3'},
  {'icon': iconImage, 'title': 'Лучшая Песня О Любви', 'file': '../../../../../../../../D:/MUSIK/Високосный год/Лучшая песня о любви.mp3'},
  {'icon': iconImage, 'title': 'Метро', 'file': '../../../../../../../../D:/MUSIK/Високосный год/Метро.mp3'},
  {'icon': iconImage, 'title': 'Тихий Огонёк', 'file': '../../../../../../../../D:/MUSIK/Високосный год/Тихий огонёк.mp3'},
  {'icon': iconImage, 'title': 'Шестой День Осени', 'file': '../../../../../../../../D:/MUSIK/Високосный год/Шестой день осени.mp3'},
]);
})

document.getElementById('гроб').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Все Как У Людей', 'file': '../../../../../../../../D:/MUSIK/Гроб/Все как у людей.mp3'},
  {'icon': iconImage, 'title': 'Запретный Плод', 'file': '../../../../../../../../D:/MUSIK/Гроб/Запретный Плод.mp3'},
  {'icon': iconImage, 'title': 'Здорово И Вечно', 'file': '../../../../../../../../D:/MUSIK/Гроб/Здорово и вечно.mp3'},
  {'icon': iconImage, 'title': 'Зоопарк', 'file': '../../../../../../../../D:/MUSIK/Гроб/Зоопарк.mp3'},
  {'icon': iconImage, 'title': 'Мне Насрать На Мое Лицо', 'file': '../../../../../../../../D:/MUSIK/Гроб/Мне насрать на мое лицо.mp3'},
  {'icon': iconImage, 'title': 'Моя Оборона', 'file': '../../../../../../../../D:/MUSIK/Гроб/Моя оборона.mp3'},
  {'icon': iconImage, 'title': 'Никто Не Хотел Умирать', 'file': '../../../../../../../../D:/MUSIK/Гроб/Никто не хотел умирать.mp3'},
  {'icon': iconImage, 'title': 'Оптимизм', 'file': '../../../../../../../../D:/MUSIK/Гроб/Оптимизм.mp3'},
  {'icon': iconImage, 'title': 'Отряд Не Заметил Потери Бойца', 'file': '../../../../../../../../D:/MUSIK/Гроб/Отряд не заметил потери бойца.mp3'},
  {'icon': iconImage, 'title': 'Поезда', 'file': '../../../../../../../../D:/MUSIK/Гроб/Поезда.mp3'},
  {'icon': iconImage, 'title': 'Про Дурачка', 'file': '../../../../../../../../D:/MUSIK/Гроб/Про Дурачка.mp3'},
  {'icon': iconImage, 'title': 'Солдатами Не Рождаются', 'file': '../../../../../../../../D:/MUSIK/Гроб/Солдатами не рождаются.mp3'},
  {'icon': iconImage, 'title': 'Суицид', 'file': '../../../../../../../../D:/MUSIK/Гроб/Суицид.mp3'},
]);
})

document.getElementById('жванецкий').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'В Нашей Жизни Что Хорошо', 'file': '../../../../../../../../D:/MUSIK/Жванецкий/В нашей жизни что хорошо.mp3'},
  {'icon': iconImage, 'title': 'Добились Чего Хотели', 'file': '../../../../../../../../D:/MUSIK/Жванецкий/Добились чего хотели.mp3'},
  {'icon': iconImage, 'title': 'Жванецкий', 'file': '../../../../../../../../D:/MUSIK/Жванецкий/Жванецкий.mp3'},
  {'icon': iconImage, 'title': 'Интервью', 'file': '../../../../../../../../D:/MUSIK/Жванецкий/Интервью.mp3'},
  {'icon': iconImage, 'title': 'Начальник Транспортного Цеха', 'file': '../../../../../../../../D:/MUSIK/Жванецкий/Начальник транспортного цеха.MP3'},
  {'icon': iconImage, 'title': 'Перекличка', 'file': '../../../../../../../../D:/MUSIK/Жванецкий/Перекличка.mp3'},
  {'icon': iconImage, 'title': 'Рассказ Тети Клары', 'file': '../../../../../../../../D:/MUSIK/Жванецкий/Рассказ тети Клары.mp3'},
  {'icon': iconImage, 'title': 'Расстройство', 'file': '../../../../../../../../D:/MUSIK/Жванецкий/Расстройство.mp3'},
  {'icon': iconImage, 'title': 'Стили Спора', 'file': '../../../../../../../../D:/MUSIK/Жванецкий/Стили спора.mp3'},
  {'icon': iconImage, 'title': 'Сцена В Метро', 'file': '../../../../../../../../D:/MUSIK/Жванецкий/Сцена в Метро.mp3'},
  {'icon': iconImage, 'title': 'Там Хорошо Где Нас Нет', 'file': '../../../../../../../../D:/MUSIK/Жванецкий/Там хорошо где нас нет.mp3'},
]);
})

document.getElementById('земфира').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Webgirl', 'file': '../../../../../../../../D:/MUSIK/Земфира/2002 - Четырнадцать недель тишины/Webgirl.mp3'},
  {'icon': iconImage, 'title': 'Аривидерчи', 'file': '../../../../../../../../D:/MUSIK/Земфира/1999 - Zемфира/Аривидерчи.mp3'},
  {'icon': iconImage, 'title': 'Бесконечность', 'file': '../../../../../../../../D:/MUSIK/Земфира/2002 - Четырнадцать недель тишины/Бесконечность.mp3'},
  {'icon': iconImage, 'title': 'До Свидания', 'file': '../../../../../../../../D:/MUSIK/Земфира/1999 - До свидания/До свидания.mp3'},
  {'icon': iconImage, 'title': 'Искала', 'file': '../../../../../../../../D:/MUSIK/Земфира/2000 - Прости меня моя любовь/Искала.mp3'},
  {'icon': iconImage, 'title': 'Прости Меня Моя Любовь', 'file': '../../../../../../../../D:/MUSIK/Земфира/2000 - Прости меня моя любовь/Прости меня моя любовь.mp3'},
  {'icon': iconImage, 'title': 'Хочешь', 'file': '../../../../../../../../D:/MUSIK/Земфира/2000 - Прости меня моя любовь/Хочешь.mp3'},
]);
})

document.getElementById('и.корнелюк').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Билет На Балет', 'file': '../../../../../../../../D:/MUSIK/И. Корнелюк/1989 - Билет на балет/Билет на балет.mp3'},
  {'icon': iconImage, 'title': 'Будем Танцевать', 'file': '../../../../../../../../D:/MUSIK/И. Корнелюк/1990 - Подожди/Будем танцевать.mp3'},
  {'icon': iconImage, 'title': 'Возвращайся!', 'file': '../../../../../../../../D:/MUSIK/И. Корнелюк/1989 - Билет на балет/Возвращайся!.mp3'},
  {'icon': iconImage, 'title': 'Город Которого Нет', 'file': '../../../../../../../../D:/MUSIK/И. Корнелюк/2001 - Бандитский Петербург/Город, которого нет.mp3'},
  {'icon': iconImage, 'title': 'Дожди', 'file': '../../../../../../../../D:/MUSIK/И. Корнелюк/1990 - Подожди/Дожди.mp3'},
  {'icon': iconImage, 'title': 'Маленький Дом', 'file': '../../../../../../../../D:/MUSIK/И. Корнелюк/1990 - Подожди/Маленький дом.mp3'},
  {'icon': iconImage, 'title': 'Мало Ли', 'file': '../../../../../../../../D:/MUSIK/И. Корнелюк/1989 - Билет на балет/Мало ли.mp3'},
  {'icon': iconImage, 'title': 'Месяц Май', 'file': '../../../../../../../../D:/MUSIK/И. Корнелюк/1990 - Подожди/Месяц май.mp3'},
  {'icon': iconImage, 'title': 'Пора Домой', 'file': '../../../../../../../../D:/MUSIK/И. Корнелюк/2001 - Любимые песни/Пора домой.mp3'},
]);
})

document.getElementById('кино').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Алюминиевые Огурцы', 'file': '../../../../../../../../D:/MUSIK/КИНО/1982 - 45/Алюминиевые Огурцы.mp3'},
  {'icon': iconImage, 'title': 'В Наших Глазах', 'file': '../../../../../../../../D:/MUSIK/КИНО/1988 - Группа крови/В наших глазах.mp3'},
  {'icon': iconImage, 'title': 'Видели Ночь', 'file': '../../../../../../../../D:/MUSIK/КИНО/2000 - История этого мира/Видели ночь.mp3'},
  {'icon': iconImage, 'title': 'Война', 'file': '../../../../../../../../D:/MUSIK/КИНО/1989 - Последний герой/Война.mp3'},
  {'icon': iconImage, 'title': 'Восьмиклассница', 'file': '../../../../../../../../D:/MUSIK/КИНО/1987 - Aкустический концерт/Восьмиклассница.mp3'},
  {'icon': iconImage, 'title': 'Генерал', 'file': '../../../../../../../../D:/MUSIK/КИНО/1987 - Aкустический концерт/Генерал.mp3'},
  {'icon': iconImage, 'title': 'Группа Крови', 'file': '../../../../../../../../D:/MUSIK/КИНО/2000 - История этого мира/Группа крови.mp3'},
  {'icon': iconImage, 'title': 'Дальше Действовать Будем Мы', 'file': '../../../../../../../../D:/MUSIK/КИНО/1988 - Группа крови/Дальше действовать будем мы.mp3'},
  {'icon': iconImage, 'title': 'Дождь Для Нас', 'file': '../../../../../../../../D:/MUSIK/КИНО/1983 - 46/Дождь для нас.mp3'},
  {'icon': iconImage, 'title': 'Закрой За Мной Дверь Я Ухожу', 'file': '../../../../../../../../D:/MUSIK/КИНО/1988 - Группа крови/Закрой за мной дверь, я ухожу.mp3'},
  {'icon': iconImage, 'title': 'Звезда', 'file': '../../../../../../../../D:/MUSIK/КИНО/1990 - Черный альбом/Звезда.mp3'},
  {'icon': iconImage, 'title': 'Звезда По Имени Солнце', 'file': '../../../../../../../../D:/MUSIK/КИНО/1989 - Звезда по имени Солнце/Звезда по имени Солнце.MP3'},
  {'icon': iconImage, 'title': 'Каждую Ночь', 'file': '../../../../../../../../D:/MUSIK/КИНО/1984 - Начальник камчатки/Каждую ночь.mp3'},
  {'icon': iconImage, 'title': 'Когда Твоя Девушка Больна', 'file': '../../../../../../../../D:/MUSIK/КИНО/1990 - Черный альбом/Когда твоя девушка больна.mp3'},
  {'icon': iconImage, 'title': 'Кончится Лето', 'file': '../../../../../../../../D:/MUSIK/КИНО/2000 - История этого мира/Кончится лето.mp3'},
  {'icon': iconImage, 'title': 'Красно Желтые Дни', 'file': '../../../../../../../../D:/MUSIK/КИНО/1990 - Черный альбом/Красно-желтые дни.mp3'},
  {'icon': iconImage, 'title': 'Кукушка', 'file': '../../../../../../../../D:/MUSIK/КИНО/2000 - История этого мира/Кукушка.mp3'},
  {'icon': iconImage, 'title': 'Легенда', 'file': '../../../../../../../../D:/MUSIK/КИНО/1988 - Группа крови/Легенда.mp3'},
  {'icon': iconImage, 'title': 'Мама Анархия', 'file': '../../../../../../../../D:/MUSIK/КИНО/1987 - Aкустический концерт/Мама Анархия.mp3'},
  {'icon': iconImage, 'title': 'Место Для Шага Вперед', 'file': '../../../../../../../../D:/MUSIK/КИНО/1989 - Звезда по имени Солнце/Место для шага вперед.mp3'},
  {'icon': iconImage, 'title': 'Музыка Волн', 'file': '../../../../../../../../D:/MUSIK/КИНО/1987 - Aкустический концерт/Музыка волн.mp3'},
  {'icon': iconImage, 'title': 'Муравейник', 'file': '../../../../../../../../D:/MUSIK/КИНО/1990 - Черный альбом/Муравейник.mp3'},
  {'icon': iconImage, 'title': 'Пачка Сигарет', 'file': '../../../../../../../../D:/MUSIK/КИНО/2000 - История этого мира/Пачка сигарет.mp3'},
  {'icon': iconImage, 'title': 'Перемен', 'file': '../../../../../../../../D:/MUSIK/КИНО/2000 - История этого мира/Перемен.mp3'},
  {'icon': iconImage, 'title': 'Песня Без Слов', 'file': '../../../../../../../../D:/MUSIK/КИНО/2000 - История этого мира/Песня без слов.mp3'},
  {'icon': iconImage, 'title': 'Печаль', 'file': '../../../../../../../../D:/MUSIK/КИНО/2000 - История этого мира/Печаль.mp3'},
  {'icon': iconImage, 'title': 'Последний Герой', 'file': '../../../../../../../../D:/MUSIK/КИНО/1989 - Последний герой/Последний герой.mp3'},
  {'icon': iconImage, 'title': 'Следи За Собой', 'file': '../../../../../../../../D:/MUSIK/КИНО/2000 - История этого мира/Следи за собой.mp3'},
  {'icon': iconImage, 'title': 'Спокойная Ночь', 'file': '../../../../../../../../D:/MUSIK/КИНО/2000 - История этого мира/Спокойная ночь.mp3'},
  {'icon': iconImage, 'title': 'Стук', 'file': '../../../../../../../../D:/MUSIK/КИНО/1989 - Звезда по имени Солнце/Стук.mp3'},
  {'icon': iconImage, 'title': 'Троллейбус', 'file': '../../../../../../../../D:/MUSIK/КИНО/2000 - История этого мира/Троллейбус.mp3'},
]);
})

document.getElementById('клипы').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A Gift Of A Thistle', 'file': '../../../../../../../../D:/MUSIK/Клипы/A Gift of a Thistle.mp4'},
  {'icon': iconImage, 'title': 'Adiemus', 'file': '../../../../../../../../D:/MUSIK/Клипы/Adiemus.mp4'},
  {'icon': iconImage, 'title': 'Agnus Dei', 'file': '../../../../../../../../D:/MUSIK/Клипы/Agnus Dei.mp4'},
  {'icon': iconImage, 'title': 'All For Nothing', 'file': '../../../../../../../../D:/MUSIK/Клипы/All For Nothing.mp4'},
  {'icon': iconImage, 'title': 'All Star', 'file': '../../../../../../../../D:/MUSIK/Клипы/All Star.mp4'},
  {'icon': iconImage, 'title': 'And We Run', 'file': '../../../../../../../../D:/MUSIK/Клипы/And We Run.mp4'},
  {'icon': iconImage, 'title': 'Babys On Fire', 'file': '../../../../../../../../D:/MUSIK/Клипы/BABY%27S ON FIRE.mp4'},
  {'icon': iconImage, 'title': 'Bamboleo', 'file': '../../../../../../../../D:/MUSIK/Клипы/Bamboleo.mp4'},
  {'icon': iconImage, 'title': 'Bang', 'file': '../../../../../../../../D:/MUSIK/Клипы/Bang.mp4'},
  {'icon': iconImage, 'title': 'Blame Ft John Newman', 'file': '../../../../../../../../D:/MUSIK/Клипы/Blame ft. John Newman.mp4'},
  {'icon': iconImage, 'title': 'Braveheart Song', 'file': '../../../../../../../../D:/MUSIK/Клипы/Braveheart song.mp4'},
  {'icon': iconImage, 'title': 'Burn', 'file': '../../../../../../../../D:/MUSIK/Клипы/Burn.mp4'},
  {'icon': iconImage, 'title': 'Cancion Del Mariachi', 'file': '../../../../../../../../D:/MUSIK/Клипы/Cancion del Mariachi.mp4'},
  {'icon': iconImage, 'title': 'Cant Remember To Forget You', 'file': '../../../../../../../../D:/MUSIK/Клипы/Can%27t Remember to Forget You.mp4'},
  {'icon': iconImage, 'title': 'Chandelier', 'file': '../../../../../../../../D:/MUSIK/Клипы/Chandelier.mp4'},
  {'icon': iconImage, 'title': 'Changed The Way You Kiss Me', 'file': '../../../../../../../../D:/MUSIK/Клипы/Changed The Way You Kiss Me.mp4'},
  {'icon': iconImage, 'title': 'Chihuahua', 'file': '../../../../../../../../D:/MUSIK/Клипы/Chihuahua.mp4'},
  {'icon': iconImage, 'title': 'Circle Of Life', 'file': '../../../../../../../../D:/MUSIK/Клипы/Circle of Life.mp4'},
  {'icon': iconImage, 'title': 'Color Of The Night', 'file': '../../../../../../../../D:/MUSIK/Клипы/Color Of The Night.mp4'},
  {'icon': iconImage, 'title': 'Confide In Me', 'file': '../../../../../../../../D:/MUSIK/Клипы/Confide In Me.mp4'},
  {'icon': iconImage, 'title': 'Conquest Of Paradise', 'file': '../../../../../../../../D:/MUSIK/Клипы/Conquest of Paradise.mp4'},
  {'icon': iconImage, 'title': 'Cracking The Russian Codes', 'file': '../../../../../../../../D:/MUSIK/Клипы/Cracking The Russian Codes.mp4'},
  {'icon': iconImage, 'title': 'Crash! Boom! Bang!', 'file': '../../../../../../../../D:/MUSIK/Клипы/Crash! Boom! Bang!.mp4'},
  {'icon': iconImage, 'title': 'Désenchantée', 'file': '../../../../../../../../D:/MUSIK/Клипы/Désenchantée.mp4'},
  {'icon': iconImage, 'title': 'Desert Rose', 'file': '../../../../../../../../D:/MUSIK/Клипы/Desert Rose.mp4'},
  {'icon': iconImage, 'title': 'Diamonds', 'file': '../../../../../../../../D:/MUSIK/Клипы/Diamonds.mp4'},
  {'icon': iconImage, 'title': 'Dont Dream Its Over', 'file': '../../../../../../../../D:/MUSIK/Клипы/Don%27t Dream It%27s Over.mp4'},
  {'icon': iconImage, 'title': 'Drinking From The Bottle Ft Tinie Tempah', 'file': '../../../../../../../../D:/MUSIK/Клипы/Drinking from the Bottle ft. Tinie Tempah.mp4'},
  {'icon': iconImage, 'title': 'Dup Step', 'file': '../../../../../../../../D:/MUSIK/Клипы/Dup Step.mp4'},
  {'icon': iconImage, 'title': 'Dust In The Wind', 'file': '../../../../../../../../D:/MUSIK/Клипы/Dust In The Wind.mp4'},
  {'icon': iconImage, 'title': 'Ecstasy Of Gold', 'file': '../../../../../../../../D:/MUSIK/Клипы/Ecstasy of Gold.mp4'},
  {'icon': iconImage, 'title': 'Empire', 'file': '../../../../../../../../D:/MUSIK/Клипы/Empire.mp4'},
  {'icon': iconImage, 'title': 'Escala Palladio', 'file': '../../../../../../../../D:/MUSIK/Клипы/Escala - Palladio.mp4'},
  {'icon': iconImage, 'title': 'Eternal Flame', 'file': '../../../../../../../../D:/MUSIK/Клипы/Eternal Flame.mp4'},
  {'icon': iconImage, 'title': 'Everybody Wants To Rule The World', 'file': '../../../../../../../../D:/MUSIK/Клипы/Everybody Wants to Rule the World.mp4'},
  {'icon': iconImage, 'title': 'Feel The Light', 'file': '../../../../../../../../D:/MUSIK/Клипы/Feel The Light.mp4'},
  {'icon': iconImage, 'title': 'Felicita', 'file': '../../../../../../../../D:/MUSIK/Клипы/Felicita.mp4'},
  {'icon': iconImage, 'title': 'Fighter', 'file': '../../../../../../../../D:/MUSIK/Клипы/Fighter.mp4'},
  {'icon': iconImage, 'title': 'Fleur Du Mal', 'file': '../../../../../../../../D:/MUSIK/Клипы/Fleur du Mal.mp4'},
  {'icon': iconImage, 'title': 'Fly On The Wings Of Love', 'file': '../../../../../../../../D:/MUSIK/Клипы/Fly on the wings of love.mp4'},
  {'icon': iconImage, 'title': 'Fragile', 'file': '../../../../../../../../D:/MUSIK/Клипы/Fragile.mp4'},
  {'icon': iconImage, 'title': 'Get A Haircut', 'file': '../../../../../../../../D:/MUSIK/Клипы/Get A Haircut.mp4'},
  {'icon': iconImage, 'title': 'Heart Of A Coward', 'file': '../../../../../../../../D:/MUSIK/Клипы/3/Heart of a Coward.mp4'},
  {'icon': iconImage, 'title': 'Heaven', 'file': '../../../../../../../../D:/MUSIK/Клипы/Heaven.mp4'},
  {'icon': iconImage, 'title': 'Heaven And Hell', 'file': '../../../../../../../../D:/MUSIK/Клипы/Heaven and Hell.mp4'},
  {'icon': iconImage, 'title': 'Hey Mama', 'file': '../../../../../../../../D:/MUSIK/Клипы/Hey Mama.mp4'},
  {'icon': iconImage, 'title': 'How Do You Do!', 'file': '../../../../../../../../D:/MUSIK/Клипы/How Do You Do!.mp4'},
  {'icon': iconImage, 'title': 'I Believe In Love', 'file': '../../../../../../../../D:/MUSIK/Клипы/I Believe in Love.mp4'},
  {'icon': iconImage, 'title': 'I Saw You Dancing', 'file': '../../../../../../../../D:/MUSIK/Клипы/I Saw You Dancing.mp4'},
  {'icon': iconImage, 'title': 'I Will Always Love You', 'file': '../../../../../../../../D:/MUSIK/Клипы/I Will Always Love You.mp4'},
  {'icon': iconImage, 'title': 'If You Leave Me Now', 'file': '../../../../../../../../D:/MUSIK/Клипы/If You Leave Me Now.mp4'},
  {'icon': iconImage, 'title': 'Iko Iko', 'file': '../../../../../../../../D:/MUSIK/Клипы/Iko Iko.mp4'},
  {'icon': iconImage, 'title': 'In Hell Ill Be In Good Company', 'file': '../../../../../../../../D:/MUSIK/Клипы/In Hell I%27ll Be In Good Company.webm'},
  {'icon': iconImage, 'title': 'In The Death Car', 'file': '../../../../../../../../D:/MUSIK/Клипы/In The Death Car.mp4'},
  {'icon': iconImage, 'title': 'In The Summertime', 'file': '../../../../../../../../D:/MUSIK/Клипы/3/In The Summertime.mp4'},
  {'icon': iconImage, 'title': 'Joe Le Taxi France 1987', 'file': '../../../../../../../../D:/MUSIK/Клипы/Joe Le Taxi France 1987.mp4'},
  {'icon': iconImage, 'title': 'Join Me In Death', 'file': '../../../../../../../../D:/MUSIK/Клипы/Join Me In Death.mp4'},
  {'icon': iconImage, 'title': 'Kaleidoscope Of Mathematics', 'file': '../../../../../../../../D:/MUSIK/Клипы/Kaleidoscope of Mathematics.mp4'},
  {'icon': iconImage, 'title': 'Kraken', 'file': '../../../../../../../../D:/MUSIK/Клипы/Kraken.mp4'},
  {'icon': iconImage, 'title': 'Layla', 'file': '../../../../../../../../D:/MUSIK/Клипы/Layla.mp4'},
  {'icon': iconImage, 'title': 'Let It Snow!let It Snow!let It Snow!', 'file': '../../../../../../../../D:/MUSIK/Клипы/Let It Snow!Let It Snow!Let It Snow!.mp4'},
  {'icon': iconImage, 'title': 'Limbo', 'file': '../../../../../../../../D:/MUSIK/Клипы/Limbo.webm'},
  {'icon': iconImage, 'title': 'Livin La Vida Loca', 'file': '../../../../../../../../D:/MUSIK/Клипы/Livin%27 La Vida Loca.mp4'},
  {'icon': iconImage, 'title': 'Looking For The Summer', 'file': '../../../../../../../../D:/MUSIK/Клипы/Looking For The Summer.mp4'},
  {'icon': iconImage, 'title': 'Love Me Like You Do', 'file': '../../../../../../../../D:/MUSIK/Клипы/Love Me Like You Do .mp4'},
  {'icon': iconImage, 'title': 'Love Me Like You Do', 'file': '../../../../../../../../D:/MUSIK/Клипы/Love Me Like You Do.mp4'},
  {'icon': iconImage, 'title': 'Maria Magdalena 1985', 'file': '../../../../../../../../D:/MUSIK/Клипы/3/Maria Magdalena 1985.mp4'},
  {'icon': iconImage, 'title': 'Master Of The Wind', 'file': '../../../../../../../../D:/MUSIK/Клипы/Master of The Wind.mp4'},
  {'icon': iconImage, 'title': 'Mon Mec A Moi', 'file': '../../../../../../../../D:/MUSIK/Клипы/Mon Mec a Moi.mp4'},
  {'icon': iconImage, 'title': 'My Darkest Days', 'file': '../../../../../../../../D:/MUSIK/Клипы/My Darkest Days.mp4'},
  {'icon': iconImage, 'title': 'My Name Is Lincoln', 'file': '../../../../../../../../D:/MUSIK/Клипы/My Name Is Lincoln.mp4'},
  {'icon': iconImage, 'title': 'Nagano Butovo', 'file': '../../../../../../../../D:/MUSIK/Клипы/3/nagano_-_butovo.mp3'},
  {'icon': iconImage, 'title': 'Now We Are Free', 'file': '../../../../../../../../D:/MUSIK/Клипы/Now We Are Free.mp4'},
  {'icon': iconImage, 'title': 'Ode To My Family', 'file': '../../../../../../../../D:/MUSIK/Клипы/Ode To My Family.mp4'},
  {'icon': iconImage, 'title': 'Once Upon A December', 'file': '../../../../../../../../D:/MUSIK/Клипы/Once Upon A December.mp4'},
  {'icon': iconImage, 'title': 'Once Upon A Time In The West', 'file': '../../../../../../../../D:/MUSIK/Клипы/3/Once Upon a Time in the West.mp4'},
  {'icon': iconImage, 'title': 'One Way Ticket 1978 (high Quality)', 'file': '../../../../../../../../D:/MUSIK/Клипы/One Way Ticket 1978 (High Quality).mp4'},
  {'icon': iconImage, 'title': 'Pardonne Moi Ce Caprice Denfant', 'file': '../../../../../../../../D:/MUSIK/Клипы/Pardonne-moi ce caprice d%27enfant.mp4'},
  {'icon': iconImage, 'title': 'Personal Jesus', 'file': '../../../../../../../../D:/MUSIK/Клипы/Personal Jesus.mp4'},
  {'icon': iconImage, 'title': 'Poker Face', 'file': '../../../../../../../../D:/MUSIK/Клипы/Poker Face.mp4'},
  {'icon': iconImage, 'title': 'Por Una Cabeza', 'file': '../../../../../../../../D:/MUSIK/Клипы/Por una cabeza.mp4'},
  {'icon': iconImage, 'title': 'Sail', 'file': '../../../../../../../../D:/MUSIK/Клипы/SAIL.mp4'},
  {'icon': iconImage, 'title': 'Scars', 'file': '../../../../../../../../D:/MUSIK/Клипы/Scars.mp4'},
  {'icon': iconImage, 'title': 'Scatman', 'file': '../../../../../../../../D:/MUSIK/Клипы/Scatman.mp4'},
  {'icon': iconImage, 'title': 'Sixteen Tons', 'file': '../../../../../../../../D:/MUSIK/Клипы/Sixteen Tons.mp4'},
  {'icon': iconImage, 'title': 'Snoop Dogg Smoke', 'file': '../../../../../../../../D:/MUSIK/Клипы/3/Snoop dogg Smoke.mp4'},
  {'icon': iconImage, 'title': 'Somebody That I Used To Know', 'file': '../../../../../../../../D:/MUSIK/Клипы/Somebody That I Used To Know.mp4'},
  {'icon': iconImage, 'title': 'Somebody To Love', 'file': '../../../../../../../../D:/MUSIK/Клипы/Somebody To Love.mp4'},
  {'icon': iconImage, 'title': 'Soul Survivor 2003', 'file': '../../../../../../../../D:/MUSIK/Клипы/Soul Survivor 2003.mp4'},
  {'icon': iconImage, 'title': 'Still Loving You', 'file': '../../../../../../../../D:/MUSIK/Клипы/Still Loving You.mp4'},
  {'icon': iconImage, 'title': 'Strangelove', 'file': '../../../../../../../../D:/MUSIK/Клипы/Strangelove .mp4'},
  {'icon': iconImage, 'title': 'Summer', 'file': '../../../../../../../../D:/MUSIK/Клипы/Summer.mp4'},
  {'icon': iconImage, 'title': 'Summer Time Sadness', 'file': '../../../../../../../../D:/MUSIK/Клипы/Summer time Sadness.mp4'},
  {'icon': iconImage, 'title': 'Supreme', 'file': '../../../../../../../../D:/MUSIK/Клипы/Supreme.mp4'},
  {'icon': iconImage, 'title': 'Surfin Bird', 'file': '../../../../../../../../D:/MUSIK/Клипы/3/Surfin Bird.mp4'},
  {'icon': iconImage, 'title': 'Surfin Bird (family Guy)', 'file': '../../../../../../../../D:/MUSIK/Клипы/3/Surfin Bird (Family Guy).mp4'},
  {'icon': iconImage, 'title': 'Syberian', 'file': '../../../../../../../../D:/MUSIK/Клипы/Syberian.mp4'},
  {'icon': iconImage, 'title': 'The Godfather Theme', 'file': '../../../../../../../../D:/MUSIK/Клипы/3/The Godfather Theme.mp4'},
  {'icon': iconImage, 'title': 'The Good The Bad And The Ugly Theme • Ennio Morricone', 'file': '../../../../../../../../D:/MUSIK/Клипы/3/The Good, the Bad and the Ugly Theme • Ennio Morricone.mp4'},
  {'icon': iconImage, 'title': 'The Lonely Shepherd', 'file': '../../../../../../../../D:/MUSIK/Клипы/The Lonely Shepherd.mp4'},
  {'icon': iconImage, 'title': 'The Memory Remains', 'file': '../../../../../../../../D:/MUSIK/Клипы/The Memory Remains.mp4'},
  {'icon': iconImage, 'title': 'To Die For', 'file': '../../../../../../../../D:/MUSIK/Клипы/To Die For.mp4'},
  {'icon': iconImage, 'title': 'Towards The Sun', 'file': '../../../../../../../../D:/MUSIK/Клипы/Towards The Sun.mp4'},
  {'icon': iconImage, 'title': 'Try Everything', 'file': '../../../../../../../../D:/MUSIK/Клипы/Try Everything.mp4'},
  {'icon': iconImage, 'title': 'Une Histoire Damour (love Story)', 'file': '../../../../../../../../D:/MUSIK/Клипы/Une histoire d%27amour (Love story).mp4'},
  {'icon': iconImage, 'title': 'Valkyrie', 'file': '../../../../../../../../D:/MUSIK/Клипы/Valkyrie.mp4'},
  {'icon': iconImage, 'title': 'Where The Wild Roses Grow', 'file': '../../../../../../../../D:/MUSIK/Клипы/Where The Wild Roses Grow.mp4'},
  {'icon': iconImage, 'title': 'Wrong', 'file': '../../../../../../../../D:/MUSIK/Клипы/Wrong.mp4'},
  {'icon': iconImage, 'title': 'Young And Beautiful', 'file': '../../../../../../../../D:/MUSIK/Клипы/Young and Beautiful.mp4'},
  {'icon': iconImage, 'title': 'Zombie', 'file': '../../../../../../../../D:/MUSIK/Клипы/Zombie.mp4'},
  {'icon': iconImage, 'title': 'А Мы Любили', 'file': '../../../../../../../../D:/MUSIK/Клипы/А мы любили.mp4'},
  {'icon': iconImage, 'title': 'Ализе', 'file': '../../../../../../../../D:/MUSIK/Клипы/АЛИЗЕ.mp4'},
  {'icon': iconImage, 'title': 'Ах Какая Невезуха Абсолютно Нету Слуха (новогодний Квартирник)', 'file': '../../../../../../../../D:/MUSIK/Клипы/3/Ах, какая невезуха, абсолютно нету слуха. (Новогодний Квартирник).mp4'},
  {'icon': iconImage, 'title': 'Белеет Мой Парус', 'file': '../../../../../../../../D:/MUSIK/Клипы/Белеет мой парус.mp4'},
  {'icon': iconImage, 'title': 'Верхом На Звезде', 'file': '../../../../../../../../D:/MUSIK/Клипы/Верхом на звезде.mp4'},
  {'icon': iconImage, 'title': 'Где Мы Летим', 'file': '../../../../../../../../D:/MUSIK/Клипы/Где мы летим.mp4'},
  {'icon': iconImage, 'title': 'Звенит Январская Вьюга', 'file': '../../../../../../../../D:/MUSIK/Клипы/3/Звенит январская вьюга.mp4'},
  {'icon': iconImage, 'title': 'Зож', 'file': '../../../../../../../../D:/MUSIK/Клипы/ЗОЖ.mp4'},
  {'icon': iconImage, 'title': 'Иду Курю', 'file': '../../../../../../../../D:/MUSIK/Клипы/Иду, курю.mp4'},
  {'icon': iconImage, 'title': 'Иерусалим 1998г', 'file': '../../../../../../../../D:/MUSIK/Клипы/3/Иерусалим 1998г.mp4'},
  {'icon': iconImage, 'title': 'Клубняк', 'file': '../../../../../../../../D:/MUSIK/Клипы/3/Клубняк.mp4'},
  {'icon': iconImage, 'title': 'Кончится Лето', 'file': '../../../../../../../../D:/MUSIK/Клипы/Кончится лето.mp4'},
  {'icon': iconImage, 'title': 'Кукла Колдуна', 'file': '../../../../../../../../D:/MUSIK/Клипы/Кукла колдуна.mp4'},
  {'icon': iconImage, 'title': 'Кукла Колдунаа', 'file': '../../../../../../../../D:/MUSIK/Клипы/Кукла Колдунаа.mp4'},
  {'icon': iconImage, 'title': 'Лучший Танцор Дабстеп В Мире! Levitate Dubstep!', 'file': '../../../../../../../../D:/MUSIK/Клипы/3/Лучший танцор Дабстеп в мире! LEVITATE DUBSTEP!.mp4'},
  {'icon': iconImage, 'title': 'Матвей Блантер – Футбольный Марш (www Petamusic Ru)', 'file': '../../../../../../../../D:/MUSIK/Клипы/3/Матвей Блантер – Футбольный марш (www.petamusic.ru).mp3'},
  {'icon': iconImage, 'title': 'Метель Тройка ', 'file': '../../../../../../../../D:/MUSIK/Клипы/3/Метель%27 %27Тройка%27..mp4'},
  {'icon': iconImage, 'title': 'Мой Ласковый И Нежный Зверь', 'file': '../../../../../../../../D:/MUSIK/Клипы/Мой ласковый и нежный зверь.mp4'},
  {'icon': iconImage, 'title': 'Мы Как Трепетные Птицы', 'file': '../../../../../../../../D:/MUSIK/Клипы/Мы, как трепетные птицы.mp4'},
  {'icon': iconImage, 'title': 'Обама Материт Порошенко И Яценюка (прикольная Озвучка ) Копия', 'file': '../../../../../../../../D:/MUSIK/Клипы/3/Обама материт Порошенко и Яценюка (прикольная озвучка ) - копия.mp4'},
  {'icon': iconImage, 'title': 'Оркестр Ссср – Футбольный Марш (www Petamusic Ru)', 'file': '../../../../../../../../D:/MUSIK/Клипы/3/Оркестр СССР – Футбольный марш (www.petamusic.ru).mp3'},
  {'icon': iconImage, 'title': 'От Кореи До Карелии', 'file': '../../../../../../../../D:/MUSIK/Клипы/От Кореи до Карелии.mp4'},
  {'icon': iconImage, 'title': 'Позови Меня С Собой', 'file': '../../../../../../../../D:/MUSIK/Клипы/Позови меня с собой.mp4'},
  {'icon': iconImage, 'title': 'Потму Что Гладиолус', 'file': '../../../../../../../../D:/MUSIK/Клипы/3/Потму что гладиолус.mp4'},
  {'icon': iconImage, 'title': 'Прогулки По Воде Ddt', 'file': '../../../../../../../../D:/MUSIK/Клипы/Прогулки по воде DDT.mp4'},
  {'icon': iconImage, 'title': 'Разговор Со Счастьем', 'file': '../../../../../../../../D:/MUSIK/Клипы/Разговор со счастьем.mp4'},
  {'icon': iconImage, 'title': 'Спокойная Ночь', 'file': '../../../../../../../../D:/MUSIK/Клипы/СПОКОЙНАЯ НОЧЬ.mp4'},
  {'icon': iconImage, 'title': 'Там Де Нас Нема (official Video)', 'file': '../../../../../../../../D:/MUSIK/Клипы/3/Там, де нас нема (official video).mp4'},
  {'icon': iconImage, 'title': 'Танго Смерти Оркестр Концлагеря Яновский', 'file': '../../../../../../../../D:/MUSIK/Клипы/3/Танго смерти - оркестр концлагеря %27Яновский%27.mp4'},
  {'icon': iconImage, 'title': 'Тыж Программист', 'file': '../../../../../../../../D:/MUSIK/Клипы/3/Тыж программист.mp4'},
  {'icon': iconImage, 'title': 'Человек И Кошка1997', 'file': '../../../../../../../../D:/MUSIK/Клипы/Человек и Кошка1997.mp4'},
  {'icon': iconImage, 'title': 'Я Зажег В Церквях Все Свечи', 'file': '../../../../../../../../D:/MUSIK/Клипы/Я зажег в церквях все свечи.mp4'},
]);
})

document.getElementById('корольишут').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Воспоминания О Былой Любви', 'file': '../../../../../../../../D:/MUSIK/Король и Шут/2001 - Как в старой сказке/Воспоминания о былой любви.mp3'},
  {'icon': iconImage, 'title': 'Охотник', 'file': '../../../../../../../../D:/MUSIK/Король и Шут/1996 - Король и Шут/Охотник.mp3'},
  {'icon': iconImage, 'title': 'Прерванная Любовь Или Арбузная Корка', 'file': '../../../../../../../../D:/MUSIK/Король и Шут/1999 - Акустический Альбом/Прерванная любовь или Арбузная корка.mp3'},
  {'icon': iconImage, 'title': 'Проклятый Старый Дом', 'file': '../../../../../../../../D:/MUSIK/Король и Шут/2001 - Как в старой сказке/Проклятый старый дом.mp3'},
  {'icon': iconImage, 'title': 'Прыгну Со Скалы', 'file': '../../../../../../../../D:/MUSIK/Король и Шут/1999 - Акустический Альбом/Прыгну со скалы.mp3'},
]);
})

document.getElementById('крысишмындра').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Бродяга', 'file': '../../../../../../../../D:/MUSIK/Крыс и Шмындра/Концерт в ДК Маяк - 2000/Бродяга.mp3'},
  {'icon': iconImage, 'title': 'Вей Мой Ветер', 'file': '../../../../../../../../D:/MUSIK/Крыс и Шмындра/Дорога на Калланмор - 1999/Вей, Мой Ветер.mp3'},
  {'icon': iconImage, 'title': 'Женская Песня', 'file': '../../../../../../../../D:/MUSIK/Крыс и Шмындра/Дорога на Калланмор - 1999/Женская Песня.mp3'},
  {'icon': iconImage, 'title': 'Ирландцы', 'file': '../../../../../../../../D:/MUSIK/Крыс и Шмындра/Концерт в ДК Маяк - 2000/Ирландцы.mp3'},
  {'icon': iconImage, 'title': 'Коронах', 'file': '../../../../../../../../D:/MUSIK/Крыс и Шмындра/Дорога на Калланмор - 1999/Коронах.mp3'},
  {'icon': iconImage, 'title': 'Недаром С Гор Спустились', 'file': '../../../../../../../../D:/MUSIK/Крыс и Шмындра/Дорога на Калланмор - 1999/Недаром с Гор Спустились.mp3'},
  {'icon': iconImage, 'title': 'Романс', 'file': '../../../../../../../../D:/MUSIK/Крыс и Шмындра/Дорога на Калланмор - 1999/Романс.mp3'},
  {'icon': iconImage, 'title': 'Странники', 'file': '../../../../../../../../D:/MUSIK/Крыс и Шмындра/Дорога на Калланмор - 1999/Странники.mp3'},
  {'icon': iconImage, 'title': 'Трасса', 'file': '../../../../../../../../D:/MUSIK/Крыс и Шмындра/Дорога на Калланмор - 1999/Трасса.mp3'},
  {'icon': iconImage, 'title': 'Тростник', 'file': '../../../../../../../../D:/MUSIK/Крыс и Шмындра/Дорога на Калланмор - 1999/Тростник.mp3'},
]);
})

document.getElementById('кукрыниксы').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Движение', 'file': '../../../../../../../../D:/MUSIK/Кукрыниксы/2003 - Столкновение/Движение.mp3'},
  {'icon': iconImage, 'title': 'Дорога', 'file': '../../../../../../../../D:/MUSIK/Кукрыниксы/2002 - Раскрашенная Душа/Дорога.mp3'},
  {'icon': iconImage, 'title': 'Звезда', 'file': '../../../../../../../../D:/MUSIK/Кукрыниксы/2006 - Шаман/Звезда.mp3'},
  {'icon': iconImage, 'title': 'Кино', 'file': '../../../../../../../../D:/MUSIK/Кукрыниксы/2004 - Фаворит Солнца/Кино.mp3'},
  {'icon': iconImage, 'title': 'Кошмары', 'file': '../../../../../../../../D:/MUSIK/Кукрыниксы/2004 - Фаворит Солнца/Кошмары.mp3'},
  {'icon': iconImage, 'title': 'Серебряный Сентябрь', 'file': '../../../../../../../../D:/MUSIK/Кукрыниксы/2003 - Столкновение/Серебряный сентябрь.mp3'},
  {'icon': iconImage, 'title': 'Смех', 'file': '../../../../../../../../D:/MUSIK/Кукрыниксы/2001 - Кукрыниксы/Смех.mp3'},
  {'icon': iconImage, 'title': 'Уходящая В Ночь', 'file': '../../../../../../../../D:/MUSIK/Кукрыниксы/Уходящая в ночь.mp3'},
  {'icon': iconImage, 'title': 'Черная Невеста', 'file': '../../../../../../../../D:/MUSIK/Кукрыниксы/2003 - Столкновение/Черная невеста.mp3'},
  {'icon': iconImage, 'title': 'Это Не Беда', 'file': '../../../../../../../../D:/MUSIK/Кукрыниксы/2001 - Кукрыниксы/Это не беда.mp3'},
  {'icon': iconImage, 'title': 'Ясные Дни', 'file': '../../../../../../../../D:/MUSIK/Кукрыниксы/2003 - Столкновение/Ясные Дни.mp3'},
]);
})

document.getElementById('любэ').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Атас', 'file': '../../../../../../../../D:/MUSIK/Любэ/1991 - Атас/Атас.mp3'},
  {'icon': iconImage, 'title': 'Ветер Ветерок', 'file': '../../../../../../../../D:/MUSIK/Любэ/2000 - Полустаночки/Ветер-Ветерок.mp3'},
  {'icon': iconImage, 'title': 'Главное Что Есть Ты У Меня', 'file': '../../../../../../../../D:/MUSIK/Любэ/1996 - Комбат/Главное, что есть ты у меня.mp3'},
  {'icon': iconImage, 'title': 'Давай Давай', 'file': '../../../../../../../../D:/MUSIK/Любэ/1992 - Кто сказал, что мы плохо жили/Давай давай.mp3'},
  {'icon': iconImage, 'title': 'Давай За ', 'file': '../../../../../../../../D:/MUSIK/Любэ/2002 - Давай за/Давай за....mp3'},
  {'icon': iconImage, 'title': 'Дед', 'file': '../../../../../../../../D:/MUSIK/Любэ/2000 - Полустаночки/Дед.mp3'},
  {'icon': iconImage, 'title': 'Дорога', 'file': '../../../../../../../../D:/MUSIK/Любэ/1994 - Зона Любэ/Дорога.mp3'},
  {'icon': iconImage, 'title': 'Комбат', 'file': '../../../../../../../../D:/MUSIK/Любэ/1996 - Комбат/Комбат.mp3'},
  {'icon': iconImage, 'title': 'Конь', 'file': '../../../../../../../../D:/MUSIK/Любэ/Конь.mp3'},
  {'icon': iconImage, 'title': 'Любэ Главное Что Есть Ты У Меня Live', 'file': '../../../../../../../../D:/MUSIK/Любэ/ЛЮБЭ %27Главное, что есть ты у меня%27 live.mp4'},
  {'icon': iconImage, 'title': 'Любэ Дорога (ребята Нашего Полка 23 02 2004)', 'file': '../../../../../../../../D:/MUSIK/Любэ/ЛЮБЭ %27Дорога%27 (%27Ребята нашего полка%27, 23-02-2004).mp4'},
  {'icon': iconImage, 'title': 'Любэ Позови Меня Тихо По Имени Live', 'file': '../../../../../../../../D:/MUSIK/Любэ/ЛЮБЭ %27Позови, меня, тихо по имени%27 live.mp4'},
  {'icon': iconImage, 'title': 'Любэ Там За Туманами (ребята Нашего Полка 23 02 2004)', 'file': '../../../../../../../../D:/MUSIK/Любэ/ЛЮБЭ %27Там за туманами%27 (%27Ребята нашего полка%27, 23-02-2004).mp4'},
  {'icon': iconImage, 'title': 'Любэ Ты Неси Меня Река (краса) (ребята Нашего Полка 23 02 2004)', 'file': '../../../../../../../../D:/MUSIK/Любэ/ЛЮБЭ %27Ты неси меня река (Краса)%27 (%27Ребята нашего полка%27, 23-02-2004).mp4'},
  {'icon': iconImage, 'title': 'Мент', 'file': '../../../../../../../../D:/MUSIK/Любэ/1997 - Песни о людях/Мент.mp3'},
  {'icon': iconImage, 'title': 'Опера', 'file': '../../../../../../../../D:/MUSIK/Любэ/2004 - Ребята нашего полка/Опера.mp3'},
  {'icon': iconImage, 'title': 'Позови Меня', 'file': '../../../../../../../../D:/MUSIK/Любэ/2000 - Полустаночки/Позови меня.mp3'},
  {'icon': iconImage, 'title': 'Ребята С Нашего Двора', 'file': '../../../../../../../../D:/MUSIK/Любэ/1997 - Песни о людях/Ребята с нашего двора.mp3'},
  {'icon': iconImage, 'title': 'Река', 'file': '../../../../../../../../D:/MUSIK/Любэ/2002 - Давай за/Река.mp3'},
  {'icon': iconImage, 'title': 'Солдат', 'file': '../../../../../../../../D:/MUSIK/Любэ/2000 - Полустаночки/Солдат.mp3'},
  {'icon': iconImage, 'title': 'Спят Курганы Тёмные', 'file': '../../../../../../../../D:/MUSIK/Любэ/1996 - Комбат/Спят курганы тёмные.mp3'},
  {'icon': iconImage, 'title': 'Старые Друзья', 'file': '../../../../../../../../D:/MUSIK/Любэ/2000 - Полустаночки/Старые друзья.mp3'},
  {'icon': iconImage, 'title': 'Там За Туманами', 'file': '../../../../../../../../D:/MUSIK/Любэ/1997 - Песни о людях/Там за туманами.mp3'},
  {'icon': iconImage, 'title': 'Тетя Доктор', 'file': '../../../../../../../../D:/MUSIK/Любэ/1991 - Атас/Тетя доктор.mp3'},
  {'icon': iconImage, 'title': 'Течет Река Волга', 'file': '../../../../../../../../D:/MUSIK/Любэ/1997 - Песни о людях/Течет река Волга.mp3'},
  {'icon': iconImage, 'title': 'Шагом Марш', 'file': '../../../../../../../../D:/MUSIK/Любэ/1996 - Комбат/Шагом марш.mp3'},
]);
})

document.getElementById('м.магомаев').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Королева Красоты', 'file': '../../../../../../../../D:/MUSIK/М. Магомаев/2001 - Любовь Моя, Песня/Королева красоты.mp3'},
  {'icon': iconImage, 'title': 'Куплеты Эскамилио', 'file': '../../../../../../../../D:/MUSIK/М. Магомаев/2002 - Арии из опер/Куплеты Эскамилио.mp3'},
  {'icon': iconImage, 'title': 'Луч Солнца Золотого', 'file': '../../../../../../../../D:/MUSIK/М. Магомаев/Луч солнца золотого.mp3'},
  {'icon': iconImage, 'title': 'Лучший Город Земли', 'file': '../../../../../../../../D:/MUSIK/М. Магомаев/1995 - Благодарю тебя/Лучший город Земли.mp3'},
  {'icon': iconImage, 'title': 'Мелодия', 'file': '../../../../../../../../D:/MUSIK/М. Магомаев/1995 - Благодарю тебя/Мелодия.mp3'},
  {'icon': iconImage, 'title': 'Мелодия', 'file': '../../../../../../../../D:/MUSIK/М. Магомаев/1995 - С любовью к женщине/Мелодия.mp3'},
  {'icon': iconImage, 'title': 'Свадьба', 'file': '../../../../../../../../D:/MUSIK/М. Магомаев/1995 - Благодарю тебя/Свадьба.mp3'},
  {'icon': iconImage, 'title': 'Свадьба', 'file': '../../../../../../../../D:/MUSIK/М. Магомаев/2001 - Любовь Моя, Песня/Свадьба.mp3'},
  {'icon': iconImage, 'title': 'Чертово Колесо', 'file': '../../../../../../../../D:/MUSIK/М. Магомаев/1995 - Благодарю тебя/Чертово колесо.mp3'},
]);
})

document.getElementById('м.задорнов').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '[zadornov] 1', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/[zadornov] 1.mp3'},
  {'icon': iconImage, 'title': '[zadornov] 2', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/[zadornov] 2.mp3'},
  {'icon': iconImage, 'title': '[zadornov] 3', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/[zadornov] 3.mp3'},
  {'icon': iconImage, 'title': '03', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/03.MP3'},
  {'icon': iconImage, 'title': '04', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/04.MP3'},
  {'icon': iconImage, 'title': '05', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/05.MP3'},
  {'icon': iconImage, 'title': '06', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/06.MP3'},
  {'icon': iconImage, 'title': '07', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/07.MP3'},
  {'icon': iconImage, 'title': '08', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/08.MP3'},
  {'icon': iconImage, 'title': '09', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/09.MP3'},
  {'icon': iconImage, 'title': '10', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/10.MP3'},
  {'icon': iconImage, 'title': '12', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/12.MP3'},
  {'icon': iconImage, 'title': '13', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/13.MP3'},
  {'icon': iconImage, 'title': '14', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/14.MP3'},
  {'icon': iconImage, 'title': '15', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/15.MP3'},
  {'icon': iconImage, 'title': '16', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/16.MP3'},
  {'icon': iconImage, 'title': '17', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/17.MP3'},
  {'icon': iconImage, 'title': '18', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/18.MP3'},
  {'icon': iconImage, 'title': '22', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/22.MP3'},
  {'icon': iconImage, 'title': '23', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/23.MP3'},
  {'icon': iconImage, 'title': '24', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/24.MP3'},
  {'icon': iconImage, 'title': '25', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/25.MP3'},
  {'icon': iconImage, 'title': '26', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/26.MP3'},
  {'icon': iconImage, 'title': 'Calve', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Анекдоты/Траханый Берг/calve.mp3'},
  {'icon': iconImage, 'title': 'Gangubazz Bobm Birthday Party Part 1', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Gangubazz_BobM_Birthday_party_part_1.mp3'},
  {'icon': iconImage, 'title': 'Gangubazz Bobm Birthday Party Part 2', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Gangubazz_BobM_Birthday_party_part_2.mp3'},
  {'icon': iconImage, 'title': 'Gangubazz Bobm Birthday Party Part 3', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Gangubazz_BobM_Birthday_party_part_3.mp3'},
  {'icon': iconImage, 'title': 'Gangubazz Bobm Birthday Party Part 4', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Gangubazz_BobM_Birthday_party_part_4.mp3'},
  {'icon': iconImage, 'title': 'Michurin', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/michurin.mp3'},
  {'icon': iconImage, 'title': 'Zadorn05', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN05.MP3'},
  {'icon': iconImage, 'title': 'Zadorn06', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN06.MP3'},
  {'icon': iconImage, 'title': 'Zadorn07', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN07.MP3'},
  {'icon': iconImage, 'title': 'Zadorn08', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN08.MP3'},
  {'icon': iconImage, 'title': 'Zadorn09', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN09.MP3'},
  {'icon': iconImage, 'title': 'Zadorn10', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN10.MP3'},
  {'icon': iconImage, 'title': 'Zadorn11', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN11.MP3'},
  {'icon': iconImage, 'title': 'Zadorn12', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN12.MP3'},
  {'icon': iconImage, 'title': 'Zadorn13', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN13.MP3'},
  {'icon': iconImage, 'title': 'Zadorn14', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN14.MP3'},
  {'icon': iconImage, 'title': 'Zadorn15', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN15.MP3'},
  {'icon': iconImage, 'title': 'Zadorn16', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN16.MP3'},
  {'icon': iconImage, 'title': 'Zadorn17', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN17.MP3'},
  {'icon': iconImage, 'title': 'Zadorn18', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN18.MP3'},
  {'icon': iconImage, 'title': 'Zadorn19', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN19.MP3'},
  {'icon': iconImage, 'title': 'Zadorn20', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN20.MP3'},
  {'icon': iconImage, 'title': 'Zadorn21', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN21.MP3'},
  {'icon': iconImage, 'title': 'Zadorn22', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN22.MP3'},
  {'icon': iconImage, 'title': 'Zadorn23', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN23.MP3'},
  {'icon': iconImage, 'title': 'Zadorn24', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN24.MP3'},
  {'icon': iconImage, 'title': 'Zadorn25', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN25.MP3'},
  {'icon': iconImage, 'title': 'Zadorn26', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN26.MP3'},
  {'icon': iconImage, 'title': 'Zadorn27', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN27.MP3'},
  {'icon': iconImage, 'title': 'Zadorn28', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN28.MP3'},
  {'icon': iconImage, 'title': 'Zadorn29', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN29.MP3'},
  {'icon': iconImage, 'title': 'Zadorn30', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/ZADORN30.MP3'},
  {'icon': iconImage, 'title': 'А Бог Всеже Есть', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/А бог всеже есть.mp3'},
  {'icon': iconImage, 'title': 'Анекдоты Котовский На Арбате', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Анекдоты/Анекдоты  %27Котовский на Арбате%27.mp3'},
  {'icon': iconImage, 'title': 'Боги И Демоны Шата', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Боги и демоны шата.mp3'},
  {'icon': iconImage, 'title': 'Бригада', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Анекдоты/Траханый Берг/Бригада.mp3'},
  {'icon': iconImage, 'title': 'Буду Сказать Без Бумажки', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Буду сказать без бумажки.mp3'},
  {'icon': iconImage, 'title': 'Винокур', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Винокур.mp3'},
  {'icon': iconImage, 'title': 'Винокур(на Д Р У Л Измайлова)', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Винокур(На д.р у Л.Измайлова).mp3'},
  {'icon': iconImage, 'title': 'Говно', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Говно.mp3'},
  {'icon': iconImage, 'title': 'да Здравствует То Благодаря Чему Мы Несмотря Ни На Что!', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/%27Да здравствует то, благодаря чему мы, несмотря ни на что!%27.mp3'},
  {'icon': iconImage, 'title': 'Дед Мороз', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Дед Мороз.mp3'},
  {'icon': iconImage, 'title': 'Джатака О Карме', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Джатака о Карме.mp3'},
  {'icon': iconImage, 'title': 'Джатака О Крокодиле', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Джатака о Крокодиле.mp3'},
  {'icon': iconImage, 'title': 'Джатака О Кшатрии Харикеше', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Джатака о кшатрии Харикеше.mp3'},
  {'icon': iconImage, 'title': 'Джатака О Сундуке', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Джатака о сундуке.mp3'},
  {'icon': iconImage, 'title': 'Джатака О Царевиче', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Джатака о царевиче.mp3'},
  {'icon': iconImage, 'title': 'Джатака Про Мудреца И Волка', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Джатака про мудреца и волка.mp3'},
  {'icon': iconImage, 'title': 'Джатака Про Мудрецв И Волка', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Джатака Про Мудрецв и Волка.mp3'},
  {'icon': iconImage, 'title': 'Задорнов', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Задорнов.mp3'},
  {'icon': iconImage, 'title': 'Задорнов', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Задорнов .mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 0', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 0.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 1', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 1.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 2', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 2.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 3', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 3.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 4', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 4.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 5', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 5.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 6', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 6.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 7', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 7.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 9', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 9.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Как Викрам Вывел Битала Из Леса', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Индийский Покойник - Как Викрам Вывел Битала из Леса.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Рассказ Ганэши', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Индийский Покойник - Рассказ Ганэши.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Что Случилось С Биталом', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Индийский Покойник - Что Случилось с Биталом.mp3'},
  {'icon': iconImage, 'title': 'Как Виджай Вручал Викраму Истинное Сокровище', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Как Виджай Вручал Викраму Истинное Сокровище.mp3'},
  {'icon': iconImage, 'title': 'Как Жисть', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Как жисть.mp3'},
  {'icon': iconImage, 'title': 'Королевство Сиджа', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Королевство Сиджа.mp3'},
  {'icon': iconImage, 'title': 'Крутая Мантра', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Крутая Мантра.mp3'},
  {'icon': iconImage, 'title': 'М 3', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/М.3.mp3'},
  {'icon': iconImage, 'title': 'М Задорнoв', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/М.Задорнoв.mp3'},
  {'icon': iconImage, 'title': 'М Задорно Египетские Ночи', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/М.Задорно-Египетские ночи.mp3'},
  {'icon': iconImage, 'title': 'М Задорнов', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/М.Задорнов.mp3'},
  {'icon': iconImage, 'title': 'М Задорнов(9 Вагон)', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/М.Задорнов(9 Вагон).mp3'},
  {'icon': iconImage, 'title': 'М Задорнов(tv)', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/М.Задорнов(TV).mp3'},
  {'icon': iconImage, 'title': 'М Задорнов(версаче)', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/М.Задорнов(Версаче).mp3'},
  {'icon': iconImage, 'title': 'М Задорнов(древня Запись)', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/М.Задорнов(Древня запись).mp3'},
  {'icon': iconImage, 'title': 'М Задорнов(питер)', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/М.Задорнов(Питер).mp3'},
  {'icon': iconImage, 'title': 'М Задорнов(праздники)', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/М.Задорнов(Праздники).mp3'},
  {'icon': iconImage, 'title': 'М Задорнов(про Нового Русского)', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/М.Задорнов(Про нового русского).mp3'},
  {'icon': iconImage, 'title': 'М Задорнов(ударница)', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/М.Задорнов(Ударница).mp3'},
  {'icon': iconImage, 'title': 'М Задорнов1', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/М.Задорнов1.mp3'},
  {'icon': iconImage, 'title': 'М Задорнов2', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/М.Задорнов2.mp3'},
  {'icon': iconImage, 'title': 'М Задорнов3', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/М.Задорнов3.mp3'},
  {'icon': iconImage, 'title': 'Матушка Змея Гудж', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Матушка Змея Гудж.mp3'},
  {'icon': iconImage, 'title': 'Михаил Задорнов', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Михаил Задорнов.mp4'},
  {'icon': iconImage, 'title': 'Михаил Задорновв', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Михаил Задорновв.mp4'},
  {'icon': iconImage, 'title': 'Мндийский Гашиш', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Мндийский Гашиш.mp3'},
  {'icon': iconImage, 'title': 'Морда Красная', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Морда красная.mp3'},
  {'icon': iconImage, 'title': 'Не Дайте Себе Засохнуть', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Не дайте себе засохнуть.mp3'},
  {'icon': iconImage, 'title': 'Не Для Tv', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Не для TV.mp3'},
  {'icon': iconImage, 'title': 'Неприличное', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Анекдоты/Траханый Берг/Неприличное.mp3'},
  {'icon': iconImage, 'title': 'Принцесса Кaмаcандaге 1', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Принцесса Кaмаcандaге 1.mp3'},
  {'icon': iconImage, 'title': 'Принцесса Кaмаcандaге 2', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Принцесса Кaмаcандaге 2.mp3'},
  {'icon': iconImage, 'title': 'Принцесса Кaмаcандaге 3', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Принцесса Кaмаcандaге 3.mp3'},
  {'icon': iconImage, 'title': 'Принцесса Кaмаcандaге 4', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Принцесса Кaмаcандaге 4.mp3'},
  {'icon': iconImage, 'title': 'Принцесса Кaмаcандaге 5', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Принцесса Кaмаcандaге 5.mp3'},
  {'icon': iconImage, 'title': 'Принцесса Кaмаcандaге 6', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Принцесса Кaмаcандaге 6.mp3'},
  {'icon': iconImage, 'title': 'Про Английский Язык', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про Английский Язык.mp3'},
  {'icon': iconImage, 'title': 'Про Ахимсу', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про Ахимсу.mp3'},
  {'icon': iconImage, 'title': 'Про Барбоса', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про Барбоса.mp3'},
  {'icon': iconImage, 'title': 'Про Беззубого Мужика', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про Беззубого Мужика.mp3'},
  {'icon': iconImage, 'title': 'Про Бычка', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про Бычка.mp3'},
  {'icon': iconImage, 'title': 'Про Васю Пиздело', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про Васю Пиздело.mp3'},
  {'icon': iconImage, 'title': 'Про Войну', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про Войну.mp3'},
  {'icon': iconImage, 'title': 'Про День Победы', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про День Победы.mp3'},
  {'icon': iconImage, 'title': 'Про День Хаоса', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про День Хаоса.mp3'},
  {'icon': iconImage, 'title': 'Про Дятла', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про Дятла.mp3'},
  {'icon': iconImage, 'title': 'Про Илью Муромца', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про Илью Муромца.mp3'},
  {'icon': iconImage, 'title': 'Про Инвалида', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про инвалида.mp3'},
  {'icon': iconImage, 'title': 'Про Италию', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про Италию.mp3'},
  {'icon': iconImage, 'title': 'Про Кокоиновый Куст', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про Кокоиновый Куст.mp3'},
  {'icon': iconImage, 'title': 'Про Колбасу', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про колбасу.mp3'},
  {'icon': iconImage, 'title': 'Про Мудрого Китайца Джуан Дзы', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про Мудрого Китайца Джуан-Дзы.mp3'},
  {'icon': iconImage, 'title': 'Про Музыкантов', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про Музыкантов.mp3'},
  {'icon': iconImage, 'title': 'Про Мышу', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про Мышу.mp3'},
  {'icon': iconImage, 'title': 'Про Обезьян', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про Обезьян.mp3'},
  {'icon': iconImage, 'title': 'Про Одинаковых Людей', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про Одинаковых Людей.mp3'},
  {'icon': iconImage, 'title': 'Про Олдовых Людей', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про Олдовых Людей.mp3'},
  {'icon': iconImage, 'title': 'Про Призраков', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про Призраков.mp3'},
  {'icon': iconImage, 'title': 'Про Совсем Хороших Людей', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про Совсем Хороших Людей.mp3'},
  {'icon': iconImage, 'title': 'Про Сотворение Человека(непал)', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про Сотворение Человека(непал).mp3'},
  {'icon': iconImage, 'title': 'Про Тадж Махал', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про Тадж Махал.mp3'},
  {'icon': iconImage, 'title': 'Про Тигра И Кошку', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про тигра и кошку.mp3'},
  {'icon': iconImage, 'title': 'Про Трех Астрологов', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про Трех Астрологов.mp3'},
  {'icon': iconImage, 'title': 'Про Упрямого Царевича', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про Упрямого Царевича.mp3'},
  {'icon': iconImage, 'title': 'Про Шиву', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Про Шиву.mp3'},
  {'icon': iconImage, 'title': 'Снова За Калбасу', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Снова За Калбасу.mp3'},
  {'icon': iconImage, 'title': 'Снова Про Гавно', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Снова Про Гавно.mp3'},
  {'icon': iconImage, 'title': 'Траханый Берг1', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Анекдоты/Траханый Берг/Траханый Берг1.mp3'},
  {'icon': iconImage, 'title': 'Траханый Берг2', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Анекдоты/Траханый Берг/Траханый Берг2.mp3'},
  {'icon': iconImage, 'title': 'Траханый Берг3', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Анекдоты/Траханый Берг/Траханый Берг3.mp3'},
  {'icon': iconImage, 'title': 'Траханый Берг4', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Анекдоты/Траханый Берг/Траханый Берг4.mp3'},
  {'icon': iconImage, 'title': 'Хазанов', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Хазанов.mp3'},
  {'icon': iconImage, 'title': 'Хали Гали', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Анекдоты/Траханый Берг/Хали Гали.mp3'},
  {'icon': iconImage, 'title': 'Художник', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Художник.mp3'},
  {'icon': iconImage, 'title': 'Чего Хочет Бог', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Растаманские сказки/Чего хочет Бог.mp3'},
  {'icon': iconImage, 'title': 'Шуфрин', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Шуфрин.mp3'},
  {'icon': iconImage, 'title': 'Шуфрин(ало Люсь)', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Шуфрин(Ало Люсь).mp3'},
  {'icon': iconImage, 'title': 'Шуфрин1', 'file': '../../../../../../../../D:/MUSIK/М.Задорнов/Шуфрин1.mp3'},
]);
})

document.getElementById('машаимедведи').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Без Тебя', 'file': '../../../../../../../../D:/MUSIK/маша и медведи/Без тебя.mp3'},
  {'icon': iconImage, 'title': 'Земля', 'file': '../../../../../../../../D:/MUSIK/маша и медведи/Земля.mp3'},
  {'icon': iconImage, 'title': 'Любочка', 'file': '../../../../../../../../D:/MUSIK/маша и медведи/Любочка.mp3'},
]);
})

document.getElementById('машинавремени').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Ангел Пустых Бутылок', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/2001 - Место где свет/Ангел пустых бутылок.mp3'},
  {'icon': iconImage, 'title': 'Ах Какой Был Изысканный Бал', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1985 - Песни под гитару 1/Ах, какой был изысканный бал.mp3'},
  {'icon': iconImage, 'title': 'Аэрофлотская', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/Аэрофлотская.MP3'},
  {'icon': iconImage, 'title': 'Барьер', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/1979 - 85 Лучшие песни/Барьер.mp3'},
  {'icon': iconImage, 'title': 'Братский Вальсок', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1994 - Я рисую тебя/Братский вальсок.mp3'},
  {'icon': iconImage, 'title': 'В Добрый Час', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/В добрый час/В добрый час.WAV'},
  {'icon': iconImage, 'title': 'Варьете', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1998 - Женский альбом/Варьете.mp3'},
  {'icon': iconImage, 'title': 'Вверх', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/2001 - Место где свет/Вверх.mp3'},
  {'icon': iconImage, 'title': 'Ветер Надежды', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/В круге света/Ветер надежды.WAV'},
  {'icon': iconImage, 'title': 'Видео Магнитофон', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1985 - Песни под гитару 1/Видео магнитофон.mp3'},
  {'icon': iconImage, 'title': 'Время', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/1979 - 85 Лучшие песни/Время.mp3'},
  {'icon': iconImage, 'title': 'Дружба', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1996 - Песни, которые я люблю/Дружба.mp3'},
  {'icon': iconImage, 'title': 'Если Бы Мы Были Взрослей', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/Реки и мосты/Если бы мы были взрослей.WAV'},
  {'icon': iconImage, 'title': 'За Тех Кто В Море', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/В добрый час/За тех, кто в море.mp3'},
  {'icon': iconImage, 'title': 'Звезды Не Ездят В Метро', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/2001 - Место где свет/Звезды не ездят в метро.mp3'},
  {'icon': iconImage, 'title': 'Знаю Только Я', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/Внештатный командир земли/Знаю только я.WAV'},
  {'icon': iconImage, 'title': 'И Опять Мне Снится Одно И То Же', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1998 - Женский альбом/И опять мне снится одно и то же.mp3'},
  {'icon': iconImage, 'title': 'Идут На Север', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1996 - Песни, которые я люблю/Идут на север.mp3'},
  {'icon': iconImage, 'title': 'Из Гельминтов', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/1999 - Часы и знаки/Из Гельминтов.mp3'},
  {'icon': iconImage, 'title': 'Иногда Я Пою', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/2001 - Место где свет/Иногда я пою.mp3'},
  {'icon': iconImage, 'title': 'Когда Я Был Большим', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/Внештатный командир земли/Когда я был большим.WAV'},
  {'icon': iconImage, 'title': 'Когда Я Вернусь', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1996 - Песни, которые я люблю/Когда я вернусь.mp3'},
  {'icon': iconImage, 'title': 'Костер', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/1979 - 85 Лучшие песни/Костер.mp3'},
  {'icon': iconImage, 'title': 'Костер', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/Костер.mp3'},
  {'icon': iconImage, 'title': 'Кошка Которая Гуляет Сама По Себе', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/Реки и мосты/Кошка, которая гуляет сама по себе.mp3'},
  {'icon': iconImage, 'title': 'Лейся Песня', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1996 - Песни, которые я люблю/Лейся, песня.mp3'},
  {'icon': iconImage, 'title': 'Маленькие Герои', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1985 - Песни под гитару 1/Маленькие герои.mp3'},
  {'icon': iconImage, 'title': 'Марионетки', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/Десять лет спустя/Марионетки .mp3'},
  {'icon': iconImage, 'title': 'Марионетки', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/Десять лет спустя/Марионетки.mp3'},
  {'icon': iconImage, 'title': 'Меня Очень Не Любят Эстеты', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1998 - Женский альбом/Меня очень не любят эстеты.mp3'},
  {'icon': iconImage, 'title': 'Место Где Свет', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/2001 - Место где свет/Место где свет.mp3'},
  {'icon': iconImage, 'title': 'Монолог Бруклинского Таксиста', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1998 - Женский альбом/Монолог Бруклинского таксиста.mp3'},
  {'icon': iconImage, 'title': 'Монолог Гражданина', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/Монолог гражданина.MP3'},
  {'icon': iconImage, 'title': 'Морской Закон', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/1979 - 85 Лучшие песни/Морской закон.mp3'},
  {'icon': iconImage, 'title': 'Музыка Под Снегом', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/В добрый час/Музыка под снегом.mp3'},
  {'icon': iconImage, 'title': 'Мы Сойдем Сума', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/1999 - Часы и знаки/Мы сойдем сума.mp3'},
  {'icon': iconImage, 'title': 'На Абрикосовых Холмах', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/1999 - Часы и знаки/На абрикосовых холмах.mp3'},
  {'icon': iconImage, 'title': 'На Неглинке', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1998 - Женский альбом/На Неглинке.mp3'},
  {'icon': iconImage, 'title': 'На Семи Ветрах', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/Внештатный командир земли/На семи ветрах.WAV'},
  {'icon': iconImage, 'title': 'Нас Ещё Не Согнули Годы', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1985 - Песни под гитару 2/Нас ещё не согнули годы.mp3'},
  {'icon': iconImage, 'title': 'Наш Дом', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/Десять лет спустя/Наш дом.mp3'},
  {'icon': iconImage, 'title': 'Не Маячит Надежда Мне', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/Не маячит надежда мне.MP3'},
  {'icon': iconImage, 'title': 'Не Надо Так', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/2001 - Место где свет/Не надо так.mp3'},
  {'icon': iconImage, 'title': 'Небо', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/2001 - Место где свет/Небо.mp3'},
  {'icon': iconImage, 'title': 'Однажды Мир Прогнётся Под Нас', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/Однажды мир прогнётся под нас.mp3'},
  {'icon': iconImage, 'title': 'Он Был Старше Ее', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/2000 - Время напрокат/Он был старше ее.MP3'},
  {'icon': iconImage, 'title': 'Она Идет По Жизни Смеясь', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/Реки и мосты/Она идет по жизни, смеясь.WAV'},
  {'icon': iconImage, 'title': 'Она Идет По Жизни Смеясь', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/Она идет по жизни, смеясь.mp3'},
  {'icon': iconImage, 'title': 'Опустошение', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/1979 - 85 Лучшие песни/Опустошение.mp3'},
  {'icon': iconImage, 'title': 'Оставь Меня', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/2001 - Место где свет/Оставь меня.mp3'},
  {'icon': iconImage, 'title': 'Отчего Так Жесток Свет', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/Отчего так жесток свет .MP3'},
  {'icon': iconImage, 'title': 'Памяти Бродского', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1998 - Женский альбом/Памяти Бродского.mp3'},
  {'icon': iconImage, 'title': 'Памяти В Высотского', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1985 - Песни под гитару 1/Памяти В. Высотского.mp3'},
  {'icon': iconImage, 'title': 'Перекресток', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1999 - Перекресток/Перекресток.mp3'},
  {'icon': iconImage, 'title': 'Песня Про Надежду', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1998 - Женский альбом/Песня про надежду.mp3'},
  {'icon': iconImage, 'title': 'Песня Про Первых', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1985 - Песни под гитару 2/Песня про первых.mp3'},
  {'icon': iconImage, 'title': 'По Домам', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/2001 - Место где свет/По домам.mp3'},
  {'icon': iconImage, 'title': 'Поворот', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/Десять лет спустя/Поворот.WAV'},
  {'icon': iconImage, 'title': 'Подражание Вертинскому', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1998 - Женский альбом/Подражание Вертинскому.mp3'},
  {'icon': iconImage, 'title': 'Пока Горит Cвeча', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/В добрый час/Пока горит cвeча.mp3'},
  {'icon': iconImage, 'title': 'Пока Горит Свеча', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/В добрый час/Пока горит свеча.WAV'},
  {'icon': iconImage, 'title': 'Посвящение Архитектурному Институту', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1998 - Женский альбом/Посвящение Архитектурному институту.mp3'},
  {'icon': iconImage, 'title': 'Путь', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/Путь.mp3'},
  {'icon': iconImage, 'title': 'Пятнадцать К Тридцати', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1985 - Песни под гитару 1/Пятнадцать к тридцати.mp3'},
  {'icon': iconImage, 'title': 'Разговор В Поезде', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/1979 - 85 Лучшие песни/Разговор в поезде.mp3'},
  {'icon': iconImage, 'title': 'Рождественская Песня', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/Внештатный командир земли/Рождественская песня.WAV'},
  {'icon': iconImage, 'title': 'Романс', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1996 - Песни, которые я люблю/Романс.mp3'},
  {'icon': iconImage, 'title': 'Самая Тихая Песня', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/Десять лет спустя/Самая тихая песня.WAV'},
  {'icon': iconImage, 'title': 'Синяя Птица', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/1979 - 85 Лучшие песни/Синяя птица.mp3'},
  {'icon': iconImage, 'title': 'Снег', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/В добрый час/Снег.WAV'},
  {'icon': iconImage, 'title': 'Снег', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/2000 - Время напрокат/Снег.mp3'},
  {'icon': iconImage, 'title': 'Спецназ', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/1979 - 85 Лучшие песни/Спецназ.mp3'},
  {'icon': iconImage, 'title': 'Старый Рок Н Ролл', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/В добрый час/Старый рок-н-ролл.WAV'},
  {'icon': iconImage, 'title': 'Странные Дни', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/1999 - Часы и знаки/Странные дни.mp3'},
  {'icon': iconImage, 'title': 'Темная Ночь', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1996 - Песни, которые я люблю/Темная ночь.mp3'},
  {'icon': iconImage, 'title': 'Тихие Песни', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/Картонные крылья любви/Тихие песни.WAV'},
  {'icon': iconImage, 'title': 'Три Сестры', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/А.Макаревич и Б.Гребенщиков/1996 - Двадцать лет спустя/Три сестры.mp3'},
  {'icon': iconImage, 'title': 'Ты Или Я', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/Десять лет спустя/Ты или я.mp3'},
  {'icon': iconImage, 'title': 'У Ломбарда', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/А.Макаревич и Б.Гребенщиков/1996 - Двадцать лет спустя/У ломбарда.mp3'},
  {'icon': iconImage, 'title': 'Уходящее Лето', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1985 - Песни под гитару 2/Уходящее лето.mp3'},
  {'icon': iconImage, 'title': 'Флаг', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/2000 - Время напрокат/Флаг.MP3'},
  {'icon': iconImage, 'title': 'Флюгер', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/Реки и мосты/Флюгер.mp3'},
  {'icon': iconImage, 'title': 'Я Не Видел Войны', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1985 - Песни под гитару 2/Я не видел войны.mp3'},
  {'icon': iconImage, 'title': 'Я Смысл Этой Жизни Вижу В Том', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/Я смысл этой жизни вижу в том .MP3'},
  {'icon': iconImage, 'title': 'Я Сюда Еще Вернусь', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/1979 - 85 Лучшие песни/Я сюда еще вернусь.mp3'},
  {'icon': iconImage, 'title': 'Я Хотел Бы Пройти Сто Дорог', 'file': '../../../../../../../../D:/MUSIK/Машина  Времени/А. Макаревич/1985 - Песни под гитару 1/Я хотел бы пройти сто дорог.mp3'},
]);
})

document.getElementById('мумийтроль').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Владивосток 2000', 'file': '../../../../../../../../D:/MUSIK/мумий троль/Владивосток 2000.mp3'},
  {'icon': iconImage, 'title': 'Дельфины', 'file': '../../../../../../../../D:/MUSIK/мумий троль/Дельфины.mp3'},
  {'icon': iconImage, 'title': 'Невеста', 'file': '../../../../../../../../D:/MUSIK/мумий троль/Невеста.mp3'},
  {'icon': iconImage, 'title': 'Это По Любви', 'file': '../../../../../../../../D:/MUSIK/мумий троль/Это по любви .mp3'},
]);
})

document.getElementById('о.газманов').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'А Я Девужек Люблю', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/А я девужек люблю.mp3'},
  {'icon': iconImage, 'title': 'А Я Девушек Люблю!', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/2006 - Лучшее/А я девушек люблю!.mp3'},
  {'icon': iconImage, 'title': 'А Я Девушек Люблю!', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1996 - Бродяга/А я девушек люблю!.mp3'},
  {'icon': iconImage, 'title': 'Бродяга', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/Бродяга.mp4'},
  {'icon': iconImage, 'title': 'Бродяга', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1996 - Бродяга/Бродяга.mp3'},
  {'icon': iconImage, 'title': 'Бродяга', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/Бродяга.mp3'},
  {'icon': iconImage, 'title': 'Ветер', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1991 - Эскадрон/Ветер.mp3'},
  {'icon': iconImage, 'title': 'Ветер', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/Ветер.mp3'},
  {'icon': iconImage, 'title': 'Вороны', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1993 - Морячка/Вороны.mp3'},
  {'icon': iconImage, 'title': 'Вот И Лето Пришло', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/Вот и лето пришло.MP3'},
  {'icon': iconImage, 'title': 'Вот И Лето Прошло', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/2003 - Мои Ясные Дни/Вот И Лето Прошло.mp3'},
  {'icon': iconImage, 'title': 'Говорила Мама', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/Говорила мама.mp3'},
  {'icon': iconImage, 'title': 'Детство Моё', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/2003 - Мои Ясные Дни/Детство Моё.mp3'},
  {'icon': iconImage, 'title': 'Дождись', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/2006 - Лучшие песни. Новая коллекция/Дождись.mp3'},
  {'icon': iconImage, 'title': 'Дождь', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/Дождь.mp3'},
  {'icon': iconImage, 'title': 'Дороги', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/Дороги.mp3'},
  {'icon': iconImage, 'title': 'Дороги', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1994 - Загулял/Дороги.mp3'},
  {'icon': iconImage, 'title': 'Друг', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/Друг.mp3'},
  {'icon': iconImage, 'title': 'Друг', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1994 - Загулял/Друг.mp3'},
  {'icon': iconImage, 'title': 'Единственная', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/Единственная.mp3'},
  {'icon': iconImage, 'title': 'Единственная', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1996 - Бродяга/Единственная.mp3'},
  {'icon': iconImage, 'title': 'Есаул', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/Есаул.mp3'},
  {'icon': iconImage, 'title': 'Есаул', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1991 - Эскадрон/Есаул.mp3'},
  {'icon': iconImage, 'title': 'Загулял', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1994 - Загулял/Загулял.mp3'},
  {'icon': iconImage, 'title': 'Загулял', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/Загулял.mp3'},
  {'icon': iconImage, 'title': 'Красная Книга', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1998 - Красная книга/Красная книга.mp3'},
  {'icon': iconImage, 'title': 'Люси', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1991 - Эскадрон/Люси.mp3'},
  {'icon': iconImage, 'title': 'Марш Высотников', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1998 - Красная книга/Марш высотников.mp3'},
  {'icon': iconImage, 'title': 'Милые Алые Зори', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1996 - Бродяга/Милые, алые зори.mp3'},
  {'icon': iconImage, 'title': 'Мне Не Нравится Дождь', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1998 - Красная книга/Мне не нравится дождь.mp3'},
  {'icon': iconImage, 'title': 'Мои Ясные Дни', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/2003 - Мои Ясные Дни/Мои Ясные Дни.mp3'},
  {'icon': iconImage, 'title': 'Морячка', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1993 - Морячка/Морячка.mp3'},
  {'icon': iconImage, 'title': 'Морячка', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/Морячка.mp3'},
  {'icon': iconImage, 'title': 'Москва', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1993 - Морячка/Москва.mp3'},
  {'icon': iconImage, 'title': 'Москва', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/Москва.mp3'},
  {'icon': iconImage, 'title': 'Мотылек', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1998 - Красная книга/Мотылек.mp3'},
  {'icon': iconImage, 'title': 'Мотылек', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/Мотылек.mp3'},
  {'icon': iconImage, 'title': 'На Заре', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/2000 - Из века в век/На заре.mp3'},
  {'icon': iconImage, 'title': 'На Заре', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/На заре.MP3'},
  {'icon': iconImage, 'title': 'Остров Затонувших Кораблей', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1998 - Красная книга/Остров затонувших кораблей.mp3'},
  {'icon': iconImage, 'title': 'Офицеры', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1993 - Морячка/Офицеры.mp3'},
  {'icon': iconImage, 'title': 'Офицеры', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/Офицеры.mp3'},
  {'icon': iconImage, 'title': 'Питер', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1993 - Морячка/Питер.mp3'},
  {'icon': iconImage, 'title': 'Питербург Петроград Ленинград', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/Питербург Петроград Ленинград.mp3'},
  {'icon': iconImage, 'title': 'Путана', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1991 - Эскадрон/Путана.mp3'},
  {'icon': iconImage, 'title': 'Путана', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/Путана.mp3'},
  {'icon': iconImage, 'title': 'Танцуй Пока Молодой', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1993 - Морячка/Танцуй, пока молодой.mp3'},
  {'icon': iconImage, 'title': 'Тень Буревестника', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/2006 - Лучшие песни. Новая коллекция/Тень буревестника.mp3'},
  {'icon': iconImage, 'title': 'Туман', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/2006 - Лучшие песни. Новая коллекция/Туман.mp3'},
  {'icon': iconImage, 'title': 'Хвастать Милая Не Стану', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1998 - Красная книга/Хвастать, милая, не стану.mp3'},
  {'icon': iconImage, 'title': 'Эскадрон', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/Эскадрон.mp3'},
  {'icon': iconImage, 'title': 'Эскадрон', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/Эскадрон.mp4'},
  {'icon': iconImage, 'title': 'Эскадрон', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1991 - Эскадрон/Эскадрон.mp3'},
  {'icon': iconImage, 'title': 'Этот День', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/Этот день.mp3'},
  {'icon': iconImage, 'title': 'Этот День', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/Этот день.mp4'},
  {'icon': iconImage, 'title': 'Этот День', 'file': '../../../../../../../../D:/MUSIK/О.Газманов/1998 - Красная книга/Этот день.mp3'},
]);
})

document.getElementById('песниизкинофильмов').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '12 Cтульев', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/12 cтульев.mp3'},
  {'icon': iconImage, 'title': '12 Стульев', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/12 стульев.mp3'},
  {'icon': iconImage, 'title': '33 Коровы', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/33 коровы.mp3'},
  {'icon': iconImage, 'title': '5 Минут', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/5 Минут.mp3'},
  {'icon': iconImage, 'title': 'A Stroll Through Town', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/1992 - Beethoven/a_stroll_through_town.mp3'},
  {'icon': iconImage, 'title': 'A Weekend In The Country', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/1993 - The World of Jeeves and Wooster/A Weekend In The Country.mp3'},
  {'icon': iconImage, 'title': 'Addio A Cheyene', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Ennio Morricone/1968 - Once Upon a Time in the West/Addio A Cheyene.mp3'},
  {'icon': iconImage, 'title': 'After Dark', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Pulp Fiction/After dark.mp3'},
  {'icon': iconImage, 'title': 'Alicia Discovers Nashs Dark World', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/Alicia Discovers Nash%27s Dark World.mp3'},
  {'icon': iconImage, 'title': 'All Love Can Be', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/All Love Can Be.mp3'},
  {'icon': iconImage, 'title': 'Angel', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Snatch/Angel.mp3'},
  {'icon': iconImage, 'title': 'Angel', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Massive Attack/1998 - Mezzanine/Angel.mp3'},
  {'icon': iconImage, 'title': 'Beautiful Lie', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/Beautiful Lie.mp3'},
  {'icon': iconImage, 'title': 'Begine', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/Brave Heart/Begine.mp3'},
  {'icon': iconImage, 'title': 'Bemidji Mn', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Bemidji, MN.mp3'},
  {'icon': iconImage, 'title': 'Bethoven', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Bethoven.mp3'},
  {'icon': iconImage, 'title': 'Brave Heart', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/Brave Heart/Brave Heart.mp3'},
  {'icon': iconImage, 'title': 'Bullwinkle', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Pulp Fiction/Bullwinkle.mp3'},
  {'icon': iconImage, 'title': 'Chi Mai', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Ennio Morricone/1981 - Профессионал/Chi Mai.mp3'},
  {'icon': iconImage, 'title': 'Closing Credits', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/Closing Credits.mp3'},
  {'icon': iconImage, 'title': 'Cornfield Chase', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/2014 - Interstellar/Cornfield Chase.mp3'},
  {'icon': iconImage, 'title': 'Cracking The Russian Codes', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/Cracking the Russian Codes.mp3'},
  {'icon': iconImage, 'title': 'Creating Governing Dynamics', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/Creating Governing Dynamics%27.mp3'},
  {'icon': iconImage, 'title': 'Cross The Tracks', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Snatch/Cross The Tracks.mp3'},
  {'icon': iconImage, 'title': 'Day One', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/2014 - Interstellar/Day One.mp3'},
  {'icon': iconImage, 'title': 'Day One Dark', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/2014 - Interstellar/Day One Dark.mp3'},
  {'icon': iconImage, 'title': 'Detach', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/2014 - Interstellar/Detach.mp3'},
  {'icon': iconImage, 'title': 'Diamond', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Snatch/Diamond.mp3'},
  {'icon': iconImage, 'title': 'Disco Science', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Snatch/Disco Science.mp3'},
  {'icon': iconImage, 'title': 'Dreaming Of The Crash', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/2014 - Interstellar/Dreaming of the Crash.mp3'},
  {'icon': iconImage, 'title': 'Dust', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/2014 - Interstellar/Dust.mp3'},
  {'icon': iconImage, 'title': 'Ecstasy Of Gold', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Ennio Morricone/1966 - The Good, The Bad And The Ugly/Ecstasy of Gold.mp3'},
  {'icon': iconImage, 'title': 'Ecstasy Of Gold', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Ennio Morricone/1966 - The Good, The Bad And The Ugly/Ecstasy of Gold.mp4'},
  {'icon': iconImage, 'title': 'Edge Of Tomorrow', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/2014 - Edge of Tomorrow/Edge of Tomorrow.mp3'},
  {'icon': iconImage, 'title': 'Elysium', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/2000 - Гладиатор/Elysium.mp3'},
  {'icon': iconImage, 'title': 'End Titles', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/1996 - Independence Day/end_titles.mp3'},
  {'icon': iconImage, 'title': 'Fiat Вальс', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Артемьев/Fiat-Вальс.mp3'},
  {'icon': iconImage, 'title': 'Fin', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/Brave Heart/Fin.mp3'},
  {'icon': iconImage, 'title': 'Find Me When You Wake Up', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/2014 - Edge of Tomorrow/Find-Me-When-You-Wake-Up.mp3'},
  {'icon': iconImage, 'title': 'First Drop Off First Kiss', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/First Drop-Off First Kiss.mp3'},
  {'icon': iconImage, 'title': 'Flight Of The Dragon', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Jackie Chan/1986 - Armour of God/Flight Of The Dragon.mp3'},
  {'icon': iconImage, 'title': 'Flight Of The Dragon', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Jackie Chan/1986 - Armour of God/Flight Of The Dragon.mp4'},
  {'icon': iconImage, 'title': 'For The Love Of A Princess', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/Brave Heart/For The Love Of A Princess.mp3'},
  {'icon': iconImage, 'title': 'Fort Walton Kansas', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/1996 - The rock/Fort walton kansas.mp3'},
  {'icon': iconImage, 'title': 'France', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/France.mp3'},
  {'icon': iconImage, 'title': 'Ghost Town', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Snatch/Ghost Town.mp3'},
  {'icon': iconImage, 'title': 'History Of Artemisia', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/2014 - 300 спартанцев/History of Artemisia.mp4'},
  {'icon': iconImage, 'title': 'History Of Artemisia', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/2014 - 300 спартанцев/History Of Artemisia.mp3'},
  {'icon': iconImage, 'title': 'Honor Him', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/2000 - Гладиатор/Honor Him.MP3'},
  {'icon': iconImage, 'title': 'Hope Overture', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Requiem of a dream/Hope Overture.mp3'},
  {'icon': iconImage, 'title': 'Htb', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/HTB.mp3'},
  {'icon': iconImage, 'title': 'Hummell Gets The Rockets', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/1996 - The rock/Hummell gets the rockets.mp3'},
  {'icon': iconImage, 'title': 'Hungry Eyes', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/1987 - Dirty Dancing/Hungry eyes.mp3'},
  {'icon': iconImage, 'title': 'I Will Always Love You', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/I Will Always Love You.MP3'},
  {'icon': iconImage, 'title': 'In The Beginning', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Emir Kusturica/Emir Kusturica & The No Smoking Orchestra La Vie Est Un Miracle x Pelotin x Robertorom/In The Beginning.mp3'},
  {'icon': iconImage, 'title': 'In The Death Car', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/In the death car.mp3'},
  {'icon': iconImage, 'title': 'In The Tunnels', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/1996 - The rock/In the tunnels.mp3'},
  {'icon': iconImage, 'title': 'Independence Day', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/1996 - Independence Day/Independence day.mp3'},
  {'icon': iconImage, 'title': 'Inertia Creeps', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Massive Attack/2006 - Collected/Inertia Creeps.mp3'},
  {'icon': iconImage, 'title': 'Jade', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/1996 - The rock/Jade.mp3'},
  {'icon': iconImage, 'title': 'Jakes First Flight (end Credit Edit)', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/2009 - Avatar/Jake%27s First Flight (End Credit Edit).mp3'},
  {'icon': iconImage, 'title': 'James Bond Theme', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Bond Theme.mp3'},
  {'icon': iconImage, 'title': 'Jeeves And Wooster', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/1993 - The World of Jeeves and Wooster/Jeeves and Wooster.mp3'},
  {'icon': iconImage, 'title': 'Kaleidoscope Of Mathematics', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/Kaleidoscope of Mathematics.mp4'},
  {'icon': iconImage, 'title': 'Kaleidoscope Of Mathematics', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/Kaleidoscope of Mathematics.mp3'},
  {'icon': iconImage, 'title': 'Kiss The Mother', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Emir Kusturica/Emir Kusturica & The No Smoking Orchestra La Vie Est Un Miracle x Pelotin x Robertorom/Kiss The Mother.mp3'},
  {'icon': iconImage, 'title': 'Kustu Ba05 16 Evergreen', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Emir Kusturica/Kustu-BA05-16.Evergreen.mp3'},
  {'icon': iconImage, 'title': 'Le Vent Le Cri', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Ennio Morricone/1981 - Профессионал/Le Vent, Le Cri.mp3'},
  {'icon': iconImage, 'title': 'Looking For Luka', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Emir Kusturica/Emir Kusturica & The No Smoking Orchestra La Vie Est Un Miracle x Pelotin x Robertorom/Looking For Luka.mp3'},
  {'icon': iconImage, 'title': 'Looking For Sabaha', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Emir Kusturica/Emir Kusturica & The No Smoking Orchestra La Vie Est Un Miracle x Pelotin x Robertorom/Looking For Sabaha.mp3'},
  {'icon': iconImage, 'title': 'Luomo Dellarmonica', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Ennio Morricone/1968 - Once Upon a Time in the West/L%27uomo Dell%27armonica.mp4'},
  {'icon': iconImage, 'title': 'Luomo Dellarmonica', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Ennio Morricone/1968 - Once Upon a Time in the West/L%27uomo Dell%27armonica.mp3'},
  {'icon': iconImage, 'title': 'Main Theme', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/1999 - Д.Д.Д/Main Theme.mp3'},
  {'icon': iconImage, 'title': 'Main Title', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Main title.mp3'},
  {'icon': iconImage, 'title': 'Misirlou', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Pulp Fiction/Misirlou.mp3'},
  {'icon': iconImage, 'title': 'Modern Time', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Modern time.mp3'},
  {'icon': iconImage, 'title': 'Mountains', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/2014 - Interstellar/Mountains.mp3'},
  {'icon': iconImage, 'title': 'My Heart Will Go On', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/My Heart Will Go On.mp3'},
  {'icon': iconImage, 'title': 'Nash Descends Into Parchers World', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/Nash Descends into Parcher%27s World.mp3'},
  {'icon': iconImage, 'title': 'Now We Are Free', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/2000 - Гладиатор/Now We Are Free.mp4'},
  {'icon': iconImage, 'title': 'Now We Are Free', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/2000 - Гладиатор/Now we are free.mp3'},
  {'icon': iconImage, 'title': 'Of One Heart Of One Mind', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/Of One Heart Of One Mind.mp3'},
  {'icon': iconImage, 'title': 'Once Upon A Time In America', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Ennio Morricone/1984 - Once Upon A Time In America/Once Upon A Time In America.mp3'},
  {'icon': iconImage, 'title': 'Operation Condor', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Jackie Chan/1991 - Armour of God II/Operation Condor.mp3'},
  {'icon': iconImage, 'title': 'Outlawed Tunes On Outlawed Pip', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/Brave Heart/Outlawed Tunes On Outlawed Pip.mp3'},
  {'icon': iconImage, 'title': 'Patricide', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/2000 - Гладиатор/Patricide.mp3'},
  {'icon': iconImage, 'title': 'Police Story', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Jackie Chan/1985 - Police Story/Police Story.mp3'},
  {'icon': iconImage, 'title': 'Police Story Ii', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Jackie Chan/1988 - Police Story II/Police Story II.mp3'},
  {'icon': iconImage, 'title': 'Por Una Cabeza', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Por una cabeza.mp3'},
  {'icon': iconImage, 'title': 'Project A Ii', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Jackie Chan/1987 - Project A II/Project A II.mp3'},
  {'icon': iconImage, 'title': 'Prologue', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/1996 - Independence Day/Prologue.mp3'},
  {'icon': iconImage, 'title': 'Prologue Film Version', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/1996 - Independence Day/Prologue film version.mp3'},
  {'icon': iconImage, 'title': 'Rain Man', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/Rain man.mp3'},
  {'icon': iconImage, 'title': 'Rain Mаn', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/Rain mаn.mp3'},
  {'icon': iconImage, 'title': 'Real Or Imagines', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/Real or Imagines.mp3'},
  {'icon': iconImage, 'title': 'Rose', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/Titanic/Rose.mp3'},
  {'icon': iconImage, 'title': 'Saying Goodbye To Those You So Love', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/Saying Goodbye to Those You So Love.mp3'},
  {'icon': iconImage, 'title': 'Shape Of My Heart', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Shape of My Heart.mp3'},
  {'icon': iconImage, 'title': 'Snatch', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Snatch/Snatch.mp3'},
  {'icon': iconImage, 'title': 'Star Wars', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Star  Wars.MP3'},
  {'icon': iconImage, 'title': 'Stay', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/2014 - Interstellar/Stay.mp3'},
  {'icon': iconImage, 'title': 'Summer Overture', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Requiem of a dream/Summer Overture.mp3'},
  {'icon': iconImage, 'title': 'Supermoves', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Snatch/Supermoves.mp3'},
  {'icon': iconImage, 'title': 'Teaching Mathematics Again', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/Teaching Mathematics Again.mp3'},
  {'icon': iconImage, 'title': 'Teardrop', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Massive Attack/1998 - Mezzanine/Teardrop.mp3'},
  {'icon': iconImage, 'title': 'The Battle', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/2000 - Гладиатор/The battle.mp3'},
  {'icon': iconImage, 'title': 'The Car Chase', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/The Car Chase.mp3'},
  {'icon': iconImage, 'title': 'The Chase', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/1996 - The rock/The chase.mp3'},
  {'icon': iconImage, 'title': 'The Darkest Day', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/1996 - Independence Day/the_darkest_day.mp3'},
  {'icon': iconImage, 'title': 'The Dog Has To Go', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/1992 - Beethoven/the_dog_has_to_go.mp3'},
  {'icon': iconImage, 'title': 'The Dogs Let Loose', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/1992 - Beethoven/the_dogs_let_loose.mp3'},
  {'icon': iconImage, 'title': 'The Kraken', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/2006 - Пираты Карибского моря/The kraken.mp3'},
  {'icon': iconImage, 'title': 'The Lively Ones', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Pulp Fiction/The lively ones.mp3'},
  {'icon': iconImage, 'title': 'The Lonely Shepherd', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/The Lonely Shepherd.mp3'},
  {'icon': iconImage, 'title': 'The Prize Of Ones Life', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/The Prize of One%27s Life.mp3'},
  {'icon': iconImage, 'title': 'The Sinking', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/Titanic/The Sinking.mp3'},
  {'icon': iconImage, 'title': 'The Slave', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/2000 - Гладиатор/The Slave.mp3'},
  {'icon': iconImage, 'title': 'The Twins Effect', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Jackie Chan/2003 - The Twins/The Twins Effect.mp3'},
  {'icon': iconImage, 'title': 'The Waterfall', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Emir Kusturica/Emir Kusturica & The No Smoking Orchestra La Vie Est Un Miracle x Pelotin x Robertorom/The Waterfall.mp3'},
  {'icon': iconImage, 'title': 'Time', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Hans Zimmer/Time.mp3'},
  {'icon': iconImage, 'title': 'Tomorrow', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Tomorrow.mp3'},
  {'icon': iconImage, 'title': 'Tuyo', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Tuyo.mp4'},
  {'icon': iconImage, 'title': 'Tuyo', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Tuyo.mp3'},
  {'icon': iconImage, 'title': 'Unable To Stay Unwilling To Leave', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/Titanic/Unable to Stay, Unwilling to Leave.mp3'},
  {'icon': iconImage, 'title': 'Vision Of Murron', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/Brave Heart/Vision Of Murron.mp3'},
  {'icon': iconImage, 'title': 'Who Am', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Jackie Chan/1998 - Who Am/Who Am.mp3'},
  {'icon': iconImage, 'title': 'X Files', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/X-FILES.MP3'},
  {'icon': iconImage, 'title': 'You Dont Dream In Cryo', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/James Horner/2009 - Avatar/You Don%27t Dream in Cryo.mp3'},
  {'icon': iconImage, 'title': 'You Never Can Tell', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Pulp Fiction/You never can tell.mp3'},
  {'icon': iconImage, 'title': 'А На Последок', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/А на последок.mp3'},
  {'icon': iconImage, 'title': 'Атака', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Артемьев/Атака.mp3'},
  {'icon': iconImage, 'title': 'Брадобрей', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Брадобрей.mp3'},
  {'icon': iconImage, 'title': 'Была Не Была', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Андрей Миронов/Была не была.mp3'},
  {'icon': iconImage, 'title': 'В Городском Парке', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Артемьев/В городском парке.mp3'},
  {'icon': iconImage, 'title': 'Вальс', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/Вальс.mp3'},
  {'icon': iconImage, 'title': 'Вальс (петров)', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/Вальс (Петров).mp3'},
  {'icon': iconImage, 'title': 'Вальс Из Кф Мой Ласк Нежн Зверь', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Вальс из кф Мой ласк нежн зверь.mp3'},
  {'icon': iconImage, 'title': 'Вдруг Как В Сказке', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Вдруг как в сказке.mp3'},
  {'icon': iconImage, 'title': 'Ветер', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Артемьев/Ветер.mp3'},
  {'icon': iconImage, 'title': 'Визиты', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Артемьев/Визиты.mp3'},
  {'icon': iconImage, 'title': 'Возвращение', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/Возвращение.mp3'},
  {'icon': iconImage, 'title': 'Вокзал Прощания', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Михаил Таривердиев/Вокзал прощания.mp3'},
  {'icon': iconImage, 'title': 'Волшебная Страна', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/Волшебная страна.mp3'},
  {'icon': iconImage, 'title': 'Все Пройдет', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Все пройдет.mp3'},
  {'icon': iconImage, 'title': 'Вступление', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/Вступление.mp3'},
  {'icon': iconImage, 'title': 'Гардемарины', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Гардемарины.mp3'},
  {'icon': iconImage, 'title': 'Где То Далеко', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Михаил Таривердиев/Где-то далеко.mp3'},
  {'icon': iconImage, 'title': 'Гимн Квн', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Гимн КВН.mp3'},
  {'icon': iconImage, 'title': 'Город Которого Нет', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Город которого нет.mp3'},
  {'icon': iconImage, 'title': 'Гусарская Балада', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/Гусарская балада.mp3'},
  {'icon': iconImage, 'title': 'Далека Дорога Твоя', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Далека дорога твоя.mp3'},
  {'icon': iconImage, 'title': 'Даным Давно', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/Даным-давно.mp3'},
  {'icon': iconImage, 'title': 'Два Сердца', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Н. Караченцев/Два сердца.mp3'},
  {'icon': iconImage, 'title': 'Двое В Кафе', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Михаил Таривердиев/Двое в кафе.mp3'},
  {'icon': iconImage, 'title': 'Деревенский Танец', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Артемьев/Деревенский танец.mp3'},
  {'icon': iconImage, 'title': 'Дождь', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/Дождь.mp3'},
  {'icon': iconImage, 'title': 'Дорога', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Артемьев/Дорога.mp3'},
  {'icon': iconImage, 'title': 'Дороги', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Михаил Таривердиев/Дороги.mp3'},
  {'icon': iconImage, 'title': 'Друг', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Друг.mp3'},
  {'icon': iconImage, 'title': 'Дым Отечества', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Артемьев/Дым Отечества.mp3'},
  {'icon': iconImage, 'title': 'Если У Вас', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/Если у вас.mp3'},
  {'icon': iconImage, 'title': 'Если Я Был Султан', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Если я был султан.mp3'},
  {'icon': iconImage, 'title': 'Есть Только Миг', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Есть только миг.mp3'},
  {'icon': iconImage, 'title': 'Женюсь', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Андрей Миронов/Женюсь.mp3'},
  {'icon': iconImage, 'title': 'Жестокое Танго', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Андрей Миронов/Жестокое танго.mp3'},
  {'icon': iconImage, 'title': 'Живем Мы Что То Без Азарта', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/Живем мы что-то без азарта.mp3'},
  {'icon': iconImage, 'title': 'Загнанный', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/1999 - Д.Д.Д/Загнанный.mp3'},
  {'icon': iconImage, 'title': 'И Над Степью', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/1966 - Неуловимые/И над степью.mp3'},
  {'icon': iconImage, 'title': 'Из К Ф Крестный Отец', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Из к.ф Крестный Отец.mp3'},
  {'icon': iconImage, 'title': 'Из К Ф Шерлок Холмс', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Из к.ф Шерлок Холмс.mp3'},
  {'icon': iconImage, 'title': 'Из К Ф Шерлок Холмс', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Из к.ф Шерлок  Холмс.mp3'},
  {'icon': iconImage, 'title': 'Кддс', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/КДДС.mp3'},
  {'icon': iconImage, 'title': 'Кленовый Лист', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Кленовый лист.mp3'},
  {'icon': iconImage, 'title': 'Кленовый Лист', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Н. Караченцев/Кленовый лист.mp3'},
  {'icon': iconImage, 'title': 'Куплеты Шансонетки', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/1966 - Неуловимые/Куплеты шансонетки.mp3'},
  {'icon': iconImage, 'title': 'Ланфрен', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Ланфрен.mp3'},
  {'icon': iconImage, 'title': 'Маленькая Данелиада', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Маленькая Данелиада.mp3'},
  {'icon': iconImage, 'title': 'Маруся', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Маруся.mp3'},
  {'icon': iconImage, 'title': 'Марш', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/Марш.mp3'},
  {'icon': iconImage, 'title': 'Механическое Пианино', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Артемьев/Механическое пианино.mp3'},
  {'icon': iconImage, 'title': 'Мне Нравиться', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/Мне нравиться.mp3'},
  {'icon': iconImage, 'title': 'Мобила', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Мобила.mp3'},
  {'icon': iconImage, 'title': 'Моей Душе Покоя Нет', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/Моей душе покоя нет.mp3'},
  {'icon': iconImage, 'title': 'Мотоциклисты', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Артемьев/Мотоциклисты.mp3'},
  {'icon': iconImage, 'title': 'Мохнатый Шмель', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/Мохнатый шмель.mp3'},
  {'icon': iconImage, 'title': 'На Волоске', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/1999 - Д.Д.Д/На волоске.mp3'},
  {'icon': iconImage, 'title': 'На Городской Площади', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Артемьев/На городской площади.mp3'},
  {'icon': iconImage, 'title': 'На Станции', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Артемьев/На станции.mp3'},
  {'icon': iconImage, 'title': 'На Тихорецкую', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/На Тихорецкую.mp3'},
  {'icon': iconImage, 'title': 'Не Думай О Секундах С Высока', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Михаил Таривердиев/Не думай о секундах с высока.mp3'},
  {'icon': iconImage, 'title': 'Неаполитанская Песня', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Неаполитанская песня.mp3'},
  {'icon': iconImage, 'title': 'Некогда', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Некогда.mp3'},
  {'icon': iconImage, 'title': 'Никого Не Будет В Доме', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/Никого не будет в доме.mp3'},
  {'icon': iconImage, 'title': 'Ночной Город', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/1999 - Д.Д.Д/Ночной город.mp3'},
  {'icon': iconImage, 'title': 'О Москве', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/О Москве.mp3'},
  {'icon': iconImage, 'title': 'Облетают Последние Маки', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/Облетают последние маки.mp3'},
  {'icon': iconImage, 'title': 'Один День Из Детсва', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Артемьев/Один день из детсва.mp3'},
  {'icon': iconImage, 'title': 'Остров Невезения', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Андрей Миронов/Остров невезения.mp3'},
  {'icon': iconImage, 'title': 'Память Сердца', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Артемьев/Память сердца.mp3'},
  {'icon': iconImage, 'title': 'Парус', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Андрей Миронов/Парус.WAV'},
  {'icon': iconImage, 'title': 'Песенка О Несостоявшихся Надеждах', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Песенка о несостоявшихся надеждах.mp3'},
  {'icon': iconImage, 'title': 'Песня Мушкетеров', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Песня мушкетеров.mp3'},
  {'icon': iconImage, 'title': 'Песня На Пароходе', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Андрей Миронов/Песня на пароходе.mp3'},
  {'icon': iconImage, 'title': 'Песня О Хорошем Настрении', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/Песня о хорошем настрении.mp3'},
  {'icon': iconImage, 'title': 'Песня О Шпаге', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Андрей Миронов/Песня о шпаге.mp3'},
  {'icon': iconImage, 'title': 'Пикник', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Артемьев/Пикник.mp3'},
  {'icon': iconImage, 'title': 'Письмо', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Артемьев/Письмо.mp3'},
  {'icon': iconImage, 'title': 'По Улице Моей', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/По улице моей.mp3'},
  {'icon': iconImage, 'title': 'Погоня', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/1966 - Неуловимые/Погоня.mp3'},
  {'icon': iconImage, 'title': 'Погоня', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/1966 - Неуловимые/Погоня .mp3'},
  {'icon': iconImage, 'title': 'Под Лаской Плюшевого Пледа', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/Под лаской плюшевого пледа.mp3'},
  {'icon': iconImage, 'title': 'Позвони', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Позвони.mp3'},
  {'icon': iconImage, 'title': 'Поклонники', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Артемьев/Поклонники.mp3'},
  {'icon': iconImage, 'title': 'Последняя Поэма', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Последняя поэма.mp3'},
  {'icon': iconImage, 'title': 'Постой Паровоз', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Постой паровоз.mp3'},
  {'icon': iconImage, 'title': 'Прелестница Младая', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/Прелестница младая.mp3'},
  {'icon': iconImage, 'title': 'Приятно Вспомнить', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Приятно вспомнить.mp3'},
  {'icon': iconImage, 'title': 'Про Бюрократов', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/Про бюрократов.mp3'},
  {'icon': iconImage, 'title': 'Про Зайцев', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Про зайцев.mp3'},
  {'icon': iconImage, 'title': 'Про Медведей', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Про медведей.mp3'},
  {'icon': iconImage, 'title': 'Про Попинс Мэри', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/ПРО ПоПинс Мэри.mp3'},
  {'icon': iconImage, 'title': 'Прощальная Песня', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Андрей Миронов/Прощальная песня.mp3'},
  {'icon': iconImage, 'title': 'Прощание С Россией', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Артемьев/Прощание с Россией.mp3'},
  {'icon': iconImage, 'title': 'С Любимыми Не Расставайтесь', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/С любимыми не расставайтесь.mp3'},
  {'icon': iconImage, 'title': 'Сеанс Немого Кино', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Артемьев/Сеанс немого кино.mp3'},
  {'icon': iconImage, 'title': 'Синема', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Андрей Миронов/Синема.mp3'},
  {'icon': iconImage, 'title': 'Со Мною Вот Что Происходит', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/Со мною вот что происходит.mp3'},
  {'icon': iconImage, 'title': 'Страдание', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Андрей Миронов/Страдание.mp3'},
  {'icon': iconImage, 'title': 'Там Лилии Цветут', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Там лилии цветут.mp3'},
  {'icon': iconImage, 'title': 'Теряют Люди Др Др', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Теряют люди др-др.mp3'},
  {'icon': iconImage, 'title': 'Трубачи', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Андрей Миронов/Трубачи.mp3'},
  {'icon': iconImage, 'title': 'Ты Меня На Рассвете Разбудишь )', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Н. Караченцев/Ты меня на рассвете разбудишь...).mp3'},
  {'icon': iconImage, 'title': 'У Зеркала', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/У зеркала.mp3'},
  {'icon': iconImage, 'title': 'Усатый Нянь', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Усатый нянь.mp3'},
  {'icon': iconImage, 'title': 'Утро', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/Утро.mp3'},
  {'icon': iconImage, 'title': 'Цыганская Таборная', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/1966 - Неуловимые/Цыганская таборная.mp3'},
  {'icon': iconImage, 'title': 'Чарли Чаплин', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Чарли Чаплин.mp3'},
  {'icon': iconImage, 'title': 'Что Тебе Подарить', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Н. Караченцев/Что тебе подарить.mp3'},
  {'icon': iconImage, 'title': 'Эпилог', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Артемьев/Эпилог.mp3'},
  {'icon': iconImage, 'title': 'Я Спросил У Ясеня', 'file': '../../../../../../../../D:/MUSIK/Песни из кинофильмов/Э. Рязанов/Я спросил у ясеня.mp3'},
]);
})

document.getElementById('песниизмультфильмов').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '02 Main Titles', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1989 - The Little Mermaid/02 Main Titles.mp3'},
  {'icon': iconImage, 'title': '05 Part Of Your World', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1989 - The Little Mermaid/05 Part Of Your World.mp3'},
  {'icon': iconImage, 'title': '06 Under The Sea', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1989 - The Little Mermaid/06 Under The Sea.mp3'},
  {'icon': iconImage, 'title': '07 Part Of Your World (reprise)', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1989 - The Little Mermaid/07 Part Of Your World (Reprise).mp3'},
  {'icon': iconImage, 'title': '08 Poor Unfortunate Souls', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1989 - The Little Mermaid/08 Poor Unfortunate Souls.mp3'},
  {'icon': iconImage, 'title': '09 Les Poissons', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1989 - The Little Mermaid/09 Les Poissons.mp3'},
  {'icon': iconImage, 'title': '10 Kiss The Girl', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1989 - The Little Mermaid/10 Kiss The Girl.mp3'},
  {'icon': iconImage, 'title': '13 The Storm', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1989 - The Little Mermaid/13 The Storm.mp3'},
  {'icon': iconImage, 'title': '15 Flotsam And Jetsam', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1989 - The Little Mermaid/15 Flotsam And Jetsam.mp3'},
  {'icon': iconImage, 'title': '17 Bedtime', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1989 - The Little Mermaid/17 Bedtime.mp3'},
  {'icon': iconImage, 'title': '18 Wedding Announcement', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1989 - The Little Mermaid/18 Wedding Announcement.mp3'},
  {'icon': iconImage, 'title': 'A Whole New World', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1994 - Aladdin/A Whole New World.mp3'},
  {'icon': iconImage, 'title': 'Albert', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Albert.mp3'},
  {'icon': iconImage, 'title': 'Arabian Nights', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1994 - Aladdin/Arabian Nights.mp3'},
  {'icon': iconImage, 'title': 'At The Beginning', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/At The Beginning.mp4'},
  {'icon': iconImage, 'title': 'At The Beginning', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/At The Beginning.mp3'},
  {'icon': iconImage, 'title': 'Be Prepared', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1994 - The Lion King/Be Prepared.mp4'},
  {'icon': iconImage, 'title': 'Be Prepared', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1994 - The Lion King/Be Prepared.mp3'},
  {'icon': iconImage, 'title': 'Beauty And The Beast', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1991- Beauty And The Beast/Beauty And The Beast.mp3'},
  {'icon': iconImage, 'title': 'Beauty And The Beast Duet', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1991- Beauty And The Beast/Beauty And The Beast duet.mp3'},
  {'icon': iconImage, 'title': 'Can You Feel The Love Tonight', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1994 - The Lion King/Can you feel the love tonight.mp3'},
  {'icon': iconImage, 'title': 'Can You Feel The Love Tonight End Title', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1994 - The Lion King/Can you feel the love tonight end title.mp3'},
  {'icon': iconImage, 'title': 'Circle Of Life', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1994 - The Lion King/Circle of life.mp3'},
  {'icon': iconImage, 'title': 'Ducks', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Ducks.mp3'},
  {'icon': iconImage, 'title': 'Friend Like Me', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1994 - Aladdin/Friend Like Me.mp3'},
  {'icon': iconImage, 'title': 'Hey Mr Taliban', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Hey Mr Taliban.mp3'},
  {'icon': iconImage, 'title': 'I Just Cant Wait To Be King', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1994 - The Lion King/I just cant wait to be king.mp3'},
  {'icon': iconImage, 'title': 'Ice Age', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Ice Age.mp3'},
  {'icon': iconImage, 'title': 'Ivan Dobsky Theme', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Monkey Dust/Ivan Dobsky theme.mp3'},
  {'icon': iconImage, 'title': 'King Of Pride Rock', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1994 - The Lion King/King of pride rock.mp3'},
  {'icon': iconImage, 'title': 'Kyles Moms A Bech', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Kyle%27s Mom%27s A Bech.mp3'},
  {'icon': iconImage, 'title': 'Menuet', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Menuet.mp3'},
  {'icon': iconImage, 'title': 'Ode Of Joy', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Ode of joy.mp3'},
  {'icon': iconImage, 'title': 'Once Upon A December', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Once Upon a December.mp3'},
  {'icon': iconImage, 'title': 'Paperman', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Paperman.mp3'},
  {'icon': iconImage, 'title': 'Prince Ali', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1994 - Aladdin/Prince Ali.mp3'},
  {'icon': iconImage, 'title': 'Prologue', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1991- Beauty And The Beast/Prologue.mp3'},
  {'icon': iconImage, 'title': 'Send Me On My Way', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Send Me On My Way.mp3'},
  {'icon': iconImage, 'title': 'Send Me On My Way', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Send Me On My Way.mp4'},
  {'icon': iconImage, 'title': 'South Park', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/South park.mp3'},
  {'icon': iconImage, 'title': 'Tanec Malenkih Utyat', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Tanec malenkih utyat.mp3'},
  {'icon': iconImage, 'title': 'This Land', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1994 - The Lion King/This land.mp3'},
  {'icon': iconImage, 'title': 'To Die For', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1994 - The Lion King/To Die For.mp3'},
  {'icon': iconImage, 'title': 'Transformation', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1991- Beauty And The Beast/Transformation.mp3'},
  {'icon': iconImage, 'title': 'Under The Stars', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1994 - The Lion King/Under The Stars.mp3'},
  {'icon': iconImage, 'title': 'West Wing', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/1991- Beauty And The Beast/West wing.mp3'},
  {'icon': iconImage, 'title': 'А Как Известно Мы Народ Горячий!', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/А, Как Известно, Мы Народ Горячий!.mp3'},
  {'icon': iconImage, 'title': 'А Мoжет Быть Ворона', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/А мoжет быть, ворона.mp3'},
  {'icon': iconImage, 'title': 'А Я Все Чаще Замечаю', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/А я все чаще замечаю.wav'},
  {'icon': iconImage, 'title': 'Антошка', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Антошка.mp3'},
  {'icon': iconImage, 'title': 'Бабки Ежки', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Бабки-ежки.mp3'},
  {'icon': iconImage, 'title': 'Бандитто Сеньеритто', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Бандитто - Сеньеритто.mp3'},
  {'icon': iconImage, 'title': 'Белочка', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Белочка.mp3'},
  {'icon': iconImage, 'title': 'Белый Город', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Белый город.mp3'},
  {'icon': iconImage, 'title': 'Бемби', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Бемби.mp3'},
  {'icon': iconImage, 'title': 'Бременские Музыканты', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Бременские музыканты.mp3'},
  {'icon': iconImage, 'title': 'Буратино', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Буратино.mp3'},
  {'icon': iconImage, 'title': 'Вместе Весело Шагать', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Вместе весело шагать.mp3'},
  {'icon': iconImage, 'title': 'Голубой Вагон', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Голубой вагон.mp3'},
  {'icon': iconImage, 'title': 'Горец', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Горец.mp3'},
  {'icon': iconImage, 'title': 'Дорожная', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Дорожная.mp3'},
  {'icon': iconImage, 'title': 'Друг', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Друг.wav'},
  {'icon': iconImage, 'title': 'Кoшки Мышки', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Кoшки мышки.mp3'},
  {'icon': iconImage, 'title': 'Кабы Не Было Зимы', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Кабы не было зимы.mp3'},
  {'icon': iconImage, 'title': 'Колыбельная Медведицы', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Колыбельная медведицы.mp3'},
  {'icon': iconImage, 'title': 'Конь', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Конь.mp3'},
  {'icon': iconImage, 'title': 'Лесной Олень', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Лесной олень.mp3'},
  {'icon': iconImage, 'title': 'Летучий Корабль', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Летучий корабль.mp3'},
  {'icon': iconImage, 'title': 'Мамонтенок', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Мамонтенок.mp3'},
  {'icon': iconImage, 'title': 'Мечта', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Мечта.mp3'},
  {'icon': iconImage, 'title': 'Молодецмолодец', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Молодец,молодец.mp3'},
  {'icon': iconImage, 'title': 'Морскя Песня', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Морскя песня.mp3'},
  {'icon': iconImage, 'title': 'Нeсси', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Нeсси.mp3'},
  {'icon': iconImage, 'title': 'Настоящий Друг', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Настоящий друг.mp3'},
  {'icon': iconImage, 'title': 'Неприятность Эту Мы Переживем', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Неприятность эту мы переживем.mp3'},
  {'icon': iconImage, 'title': 'Обжоры', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Обжоры.mp3'},
  {'icon': iconImage, 'title': 'Облака', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Облака.mp3'},
  {'icon': iconImage, 'title': 'Остров Сокровищ', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Остров сокровищ.mp3'},
  {'icon': iconImage, 'title': 'Пoдарки', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Пoдарки.mp3'},
  {'icon': iconImage, 'title': 'Парад Заграничных Певцов', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Парад заграничных певцов.mp3'},
  {'icon': iconImage, 'title': 'Песенка Мамонтёнка', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Песенка мамонтёнка.mp3'},
  {'icon': iconImage, 'title': 'Песня Атаманши', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Песня Атаманши.mp3'},
  {'icon': iconImage, 'title': 'Песня Крокодила', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Песня крокодила.mp3'},
  {'icon': iconImage, 'title': 'Песня Охранников', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Песня охранников.mp3'},
  {'icon': iconImage, 'title': 'Песня Про Мальчика Бобби', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Песня про мальчика Бобби.mp4'},
  {'icon': iconImage, 'title': 'Песня Пуха', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Песня Пуха.mp3'},
  {'icon': iconImage, 'title': 'Прекрасное Далеко', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Прекрасное далеко.mp3'},
  {'icon': iconImage, 'title': 'Про Папу', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Про папу.mp3'},
  {'icon': iconImage, 'title': 'Про Сыщика', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Про сыщика.mp3'},
  {'icon': iconImage, 'title': 'Рoждественская', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Рoждественская.mp3'},
  {'icon': iconImage, 'title': 'Романтики С Большой Дороги', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Романтики с большой дороги.mp3'},
  {'icon': iconImage, 'title': 'Снегурочка', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Снегурочка.mp3'},
  {'icon': iconImage, 'title': 'Солнце Взошло', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Солнце взошло.mp3'},
  {'icon': iconImage, 'title': 'Спокойной Ночи', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Спокойной ночи.mp3'},
  {'icon': iconImage, 'title': 'Супер Сучная Сучара', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Супер сучная сучара.mp3'},
  {'icon': iconImage, 'title': 'Считайте Меня Гадом', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Считайте меня гадом.mp3'},
  {'icon': iconImage, 'title': 'Три Белых Коня', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Три белых коня.mp3'},
  {'icon': iconImage, 'title': 'Улыбка', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Улыбка.mp3'},
  {'icon': iconImage, 'title': 'Частушки', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Частушки.wav'},
  {'icon': iconImage, 'title': 'Чебурашка', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Чебурашка.mp3'},
  {'icon': iconImage, 'title': 'Чунга Чанга', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Чунга-чанга.mp3'},
  {'icon': iconImage, 'title': 'Шапокляк', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Шапокляк.mp3'},
  {'icon': iconImage, 'title': 'Шкoла', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Шкoла.mp3'},
  {'icon': iconImage, 'title': 'Ясный День', 'file': '../../../../../../../../D:/MUSIK/Песни из Мультфильмов/Ясный день.mp3'},
]);
})

document.getElementById('секрет').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Алиса', 'file': '../../../../../../../../D:/MUSIK/Секрет/Алиса.mp3'},
  {'icon': iconImage, 'title': 'В Жарких Странах', 'file': '../../../../../../../../D:/MUSIK/Секрет/В Жарких Странах.mp3'},
  {'icon': iconImage, 'title': 'Любовь На Пятом Этаже', 'file': '../../../../../../../../D:/MUSIK/Секрет/Любовь на пятом этаже.mp3'},
  {'icon': iconImage, 'title': 'Привет', 'file': '../../../../../../../../D:/MUSIK/Секрет/Привет.mp3'},
]);
})

document.getElementById('старыепесни').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '002 09 Splyashem Peggi!', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1971 - 1975 - Квинтет под управлением С.Никитина/002-09-Splyashem, Peggi!.mp3'},
  {'icon': iconImage, 'title': '002 16 Babushka Pirata', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1971 - 1975 - Квинтет под управлением С.Никитина/002-16-Babushka pirata.mp3'},
  {'icon': iconImage, 'title': '002 22 Na Dalyokoy Amazonke', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1971 - 1975 - Квинтет под управлением С.Никитина/002-22-Na dalyokoy Amazonke.mp3'},
  {'icon': iconImage, 'title': '004 10 Aleksandra', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1997 - Брич-Мулла/004-10-Aleksandra.mp3'},
  {'icon': iconImage, 'title': '005 01 Pole Chudes', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1998 - Девочка и пластилин/005-01-Pole chudes.mp3'},
  {'icon': iconImage, 'title': '005 02 Kakoe Nebo Goluboe', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1998 - Девочка и пластилин/005-02-Kakoe nebo goluboe.mp3'},
  {'icon': iconImage, 'title': '005 03 Pesenka Tortili', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1998 - Девочка и пластилин/005-03-Pesenka Tortili.mp3'},
  {'icon': iconImage, 'title': '005 09 Samaya Pervaya Pesnya', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1998 - Девочка и пластилин/005-09-Samaya pervaya pesnya.mp3'},
  {'icon': iconImage, 'title': '005 22 Konchayte Vashi Preniya', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1998 - Девочка и пластилин/005-22-Konchayte vashi preniya.mp3'},
  {'icon': iconImage, 'title': '007 01 Pod Muziku Vivaldi', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1971 - 1975 - Квинтет под управлением С.Никитина/007-01-Pod muziku Vivaldi.mp3'},
  {'icon': iconImage, 'title': '007 02 Kajdiy Vibiraet Dlya Sebya', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1998 - Is serii Rossiyskie Bardy/007-02-Kajdiy vibiraet dlya sebya.mp3'},
  {'icon': iconImage, 'title': '007 07 Sneg Idyot', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1998 - Is serii Rossiyskie Bardy/007-07-Sneg idyot.mp3'},
  {'icon': iconImage, 'title': '007 22 Samaya Pervaya Pesnya', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1998 - Девочка и пластилин/007-22-Samaya pervaya pesnya.mp3'},
  {'icon': iconImage, 'title': '007 23 Grustniy Marsh Byurokratov', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1998 - Is serii Rossiyskie Bardy/007-23-Grustniy marsh byurokratov.mp3'},
  {'icon': iconImage, 'title': '010 The Beatles Hey Jude', 'file': '../../../../../../../../D:/MUSIK/Старые песни/70-Х/010 THE BEATLES-HEY JUDE.MP3'},
  {'icon': iconImage, 'title': '013 А Фрейндлих У Природы Нет Плохой Погоды', 'file': '../../../../../../../../D:/MUSIK/Старые песни/70-Х/013 А.ФРЕЙНДЛИХ-У ПРИРОДЫ НЕТ ПЛОХОЙ ПОГОДЫ.MP3'},
  {'icon': iconImage, 'title': '040 Gilla Jonny', 'file': '../../../../../../../../D:/MUSIK/Старые песни/70-Х/040 GILLA-JONNY.MP3'},
  {'icon': iconImage, 'title': '045 И Кобзон И Оркестр Кинематографии Мнгновения', 'file': '../../../../../../../../D:/MUSIK/Старые песни/70-Х/045 И.КОБЗОН И ОРКЕСТР КИНЕМАТОГРАФИИ-МНГНОВЕНИЯ.MP3'},
  {'icon': iconImage, 'title': '067 Лейся Песня Кто Тебе Сказал', 'file': '../../../../../../../../D:/MUSIK/Старые песни/70-Х/067 ЛЕЙСЯ ПЕСНЯ-КТО ТЕБЕ СКАЗАЛ.MP3'},
  {'icon': iconImage, 'title': '07', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Избранное/07.mp3'},
  {'icon': iconImage, 'title': '070 Chilly Tic Tic Tac ', 'file': '../../../../../../../../D:/MUSIK/Старые песни/70-Х/070 CHILLY-TIC, TIC, TAC-.MP3'},
  {'icon': iconImage, 'title': '084 Gloria Gaynor I Will Survive', 'file': '../../../../../../../../D:/MUSIK/Старые песни/70-Х/084 GLORIA GAYNOR-I WILL SURVIVE.MP3'},
  {'icon': iconImage, 'title': '18 Лет Спустя', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Розенбаум/18 лет спустя.mp3'},
  {'icon': iconImage, 'title': '38 Узлов', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Розенбаум/38 узлов.mp3'},
  {'icon': iconImage, 'title': '9 Вал', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Иваси/Альма-Матерь/9 вал.mp3'},
  {'icon': iconImage, 'title': 'Ak16', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/AK16.MP3'},
  {'icon': iconImage, 'title': 'Armonie', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Bethoven & others/Armonie.mp3'},
  {'icon': iconImage, 'title': 'Go Down Moses', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Go Down Moses.mp3'},
  {'icon': iconImage, 'title': 'Leisya Pesnya Sinii Inii', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Синяя птица/Leisya Pesnya - Sinii Inii.mp3'},
  {'icon': iconImage, 'title': 'Madonna', 'file': '../../../../../../../../D:/MUSIK/Старые песни/80-Х/Madonna.mp3'},
  {'icon': iconImage, 'title': 'Ne Cip Mne Coli', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Вячеслав Добрынин/Ne Cip Mne Coli.mp3'},
  {'icon': iconImage, 'title': 'One Way Ticket', 'file': '../../../../../../../../D:/MUSIK/Старые песни/One way ticket.mp4'},
  {'icon': iconImage, 'title': 'Sixteen Tons', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Sixteen Tons.mp3'},
  {'icon': iconImage, 'title': 'Strangers In The Night', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Strangers In The Night.mp3'},
  {'icon': iconImage, 'title': 'The Phantom Of The Opera', 'file': '../../../../../../../../D:/MUSIK/Старые песни/The Phantom Of The Opera.mp3'},
  {'icon': iconImage, 'title': 'Zimnii Sad', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Zimnii sad.mp3'},
  {'icon': iconImage, 'title': 'А Может Не Было Войныi', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Розенбаум/А, может, не было войныi.mp3'},
  {'icon': iconImage, 'title': 'А Снег Идет', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А снег идет.mp3'},
  {'icon': iconImage, 'title': 'Агент 007', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Агент 007.WAV'},
  {'icon': iconImage, 'title': 'Аист На Крыше', 'file': '../../../../../../../../D:/MUSIK/Старые песни/София Ротару/Аист на крыше.MP3'},
  {'icon': iconImage, 'title': 'Александра', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1997 - Брич-Мулла/Александра.WAV'},
  {'icon': iconImage, 'title': 'Александра1', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1997 - Брич-Мулла/Александра1.mp3'},
  {'icon': iconImage, 'title': 'Аленушка', 'file': '../../../../../../../../D:/MUSIK/Старые песни/DOLSKI/Старинные часы/Аленушка.MP3'},
  {'icon': iconImage, 'title': 'Альма Матерь', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Иваси/Альма-Матерь/Альма-матерь.mp3'},
  {'icon': iconImage, 'title': 'Альмаматерь', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Городницкий/Альмаматерь.mp3'},
  {'icon': iconImage, 'title': 'Амазонка', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Берковский/Амазонка.WAV'},
  {'icon': iconImage, 'title': 'Антисемиты', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Антисемиты.mp3'},
  {'icon': iconImage, 'title': 'Апрель', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Суханов/Апрель.mp3'},
  {'icon': iconImage, 'title': 'Арбат', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/FIRST_LV/Арбат.MP3'},
  {'icon': iconImage, 'title': 'Архиолог', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Архиолог.mp3'},
  {'icon': iconImage, 'title': 'Атланты', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Городницкий/Атланты.WAV'},
  {'icon': iconImage, 'title': 'Ах Какая Женщина', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Ах, какая женщина.mp3'},
  {'icon': iconImage, 'title': 'Ахвремявремя', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Иваси/Альма-Матерь/Ах,время,время.mp3'},
  {'icon': iconImage, 'title': 'Ахсамара Городок (в Готовцева)', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Огней так много золотых/Ах,Самара-городок (В.Готовцева).WAV'},
  {'icon': iconImage, 'title': 'Бал Маскарад', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Бал-маскарад.mp3'},
  {'icon': iconImage, 'title': 'Бежит Река', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1999 - Со мною вот что происходит/Бежит река.mp3'},
  {'icon': iconImage, 'title': 'Белые Розы', 'file': '../../../../../../../../D:/MUSIK/Старые песни/80-Х/Белые розы.mp3'},
  {'icon': iconImage, 'title': 'Белый Теплоход', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Синяя птица/Белый теплоход .WAV'},
  {'icon': iconImage, 'title': 'Бережкарики', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Иваси/Бережкарики/Бережкарики.mp3'},
  {'icon': iconImage, 'title': 'Бери Шинель', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/DISK1/Бери шинель.MP3'},
  {'icon': iconImage, 'title': 'Боксер', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Париж/Боксер.mp3'},
  {'icon': iconImage, 'title': 'Большой Секрет', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/2002 - Резиновий ежик/Большой секрет.mp3'},
  {'icon': iconImage, 'title': 'Большой Секрет Для Маленькой Компании', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/2002 - Резиновий ежик/Большой секрет для маленькой компании.mp3'},
  {'icon': iconImage, 'title': 'Большой Собачий Секрет', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/2002 - Резиновий ежик/Большой собачий секрет.mp3'},
  {'icon': iconImage, 'title': 'Боцман', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Иваси/Альма-Матерь/Боцман.mp3'},
  {'icon': iconImage, 'title': 'Братские Могилы', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Братские могилы.mp3'},
  {'icon': iconImage, 'title': 'Брич Мула', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1997 - Брич-Мулла/Брич-Мула.WAV'},
  {'icon': iconImage, 'title': 'Брич Мулла', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1997 - Брич-Мулла/Брич-Мулла.mp3'},
  {'icon': iconImage, 'title': 'В Далеком Созвездии Тау Кита', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/В далеком созвездии Тау Кита.mp3'},
  {'icon': iconImage, 'title': 'В Землянке', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Песни военных лет/В землянке.mp3'},
  {'icon': iconImage, 'title': 'В Куски Разлетелася Корона', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/В куски разлетелася корона.mp3'},
  {'icon': iconImage, 'title': 'В Ночном Лесу', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Юрий Лорес/В ночном лесу.MP3'},
  {'icon': iconImage, 'title': 'В Полях Под Снегом И Дождем', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Александр Градский/В полях под снегом и дождем.WAV'},
  {'icon': iconImage, 'title': 'В Путь', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Советская патриотическая/В путь.mp3'},
  {'icon': iconImage, 'title': 'В Салуне Севен Муне', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/В салуне Севен Муне .MP3'},
  {'icon': iconImage, 'title': 'В Суету Городов', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/В суету городов.WAV'},
  {'icon': iconImage, 'title': 'Вальс Бостон', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Розенбаум/Вальс-бостон.mp3'},
  {'icon': iconImage, 'title': 'Вальс Расставания', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Вальс расставания.mp3'},
  {'icon': iconImage, 'title': 'Варяг', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Советская патриотическая/Варяг.mp3'},
  {'icon': iconImage, 'title': 'Ваше Благородие', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/DISK2/Ваше благородие.MP3'},
  {'icon': iconImage, 'title': 'Вечер Бродит', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Вечер бродит.mp3'},
  {'icon': iconImage, 'title': 'Вещая Судьба', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Розенбаум/Вещая судьба.mp3'},
  {'icon': iconImage, 'title': 'Виват Король!', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Виват король!.mp3'},
  {'icon': iconImage, 'title': 'Владимир Высоцкий Последний Концерт (монолог 1980)', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Владимир Высоцкий.Последний концерт (Монолог 1980).mp4'},
  {'icon': iconImage, 'title': 'Воздушный Бой', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Воздушный Бой.WAV'},
  {'icon': iconImage, 'title': 'Возьмемся Заруки', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/Земля/Возьмемся заруки.mp3'},
  {'icon': iconImage, 'title': 'Вологда', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Песняры/Вологда.WAV'},
  {'icon': iconImage, 'title': 'Вологда', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Вологда.mp3'},
  {'icon': iconImage, 'title': 'Вот Идет По Свету Человек Чудак', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Вот идет по свету человек-чудак.mp3'},
  {'icon': iconImage, 'title': 'Все Относительно', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Все относительно.mp3'},
  {'icon': iconImage, 'title': 'Все Пройдет', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Михаил Боярский/Все пройдет.WAV'},
  {'icon': iconImage, 'title': 'Всечто В Жизни Есть У Меня', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Самоцветы/Все,что в жизни есть у меня.mp3'},
  {'icon': iconImage, 'title': 'Встреча', 'file': '../../../../../../../../D:/MUSIK/Старые песни/DOLSKI/Концерт в Москве/Встреча.MP3'},
  {'icon': iconImage, 'title': 'Вся Жизнь Впереди', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Самоцветы/Вся жизнь впереди.mp3'},
  {'icon': iconImage, 'title': 'Высота', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Высота.mp3'},
  {'icon': iconImage, 'title': 'Гадалка', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Гадалка.mp3'},
  {'icon': iconImage, 'title': 'Гимн Российской Федерации', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Гимн Российской Федерации.mp3'},
  {'icon': iconImage, 'title': 'Гимн Ссср', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Гимн СССР.Mp3'},
  {'icon': iconImage, 'title': 'Гимнастика', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Избранное/Гимнастика.mp3'},
  {'icon': iconImage, 'title': 'Глафира', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Иваси/Альма-Матерь/Глафира.mp3'},
  {'icon': iconImage, 'title': 'Глухари', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Розенбаум/Глухари.mp3'},
  {'icon': iconImage, 'title': 'Говорите Я Молчу', 'file': '../../../../../../../../D:/MUSIK/Старые песни/DOLSKI/Концерт в г.Самаре/Говорите, я молчу.MP3'},
  {'icon': iconImage, 'title': 'Голубые В Полоску Штаны', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/Голубые в полоску штаны.MP3'},
  {'icon': iconImage, 'title': 'Горизонт', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Париж/Горизонт.mp3'},
  {'icon': iconImage, 'title': 'Горная Лерическая', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Париж/Горная лерическая.mp3'},
  {'icon': iconImage, 'title': 'Госпиталь', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Париж/Госпиталь.mp3'},
  {'icon': iconImage, 'title': 'Господа Юнкер', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/DISK1/Господа юнкер.MP3'},
  {'icon': iconImage, 'title': 'Грузинская Песня', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/В США/Грузинская песня.mp3'},
  {'icon': iconImage, 'title': 'Давайте Восклицать', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/DISK2/Давайте восклицать.MP3'},
  {'icon': iconImage, 'title': 'Две Судьбы', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Две судьбы.WAV'},
  {'icon': iconImage, 'title': 'Две Судьбы', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Две судьбы .WAV'},
  {'icon': iconImage, 'title': 'Дворник Степанов', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Иваси/Бережкарики/Дворник Степанов.mp3'},
  {'icon': iconImage, 'title': 'Дела', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Дела.mp3'},
  {'icon': iconImage, 'title': 'День Победы', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Песни военных лет/День Победы.mp3'},
  {'icon': iconImage, 'title': 'День Победы', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Лев Лещенко/День Победы.mp3'},
  {'icon': iconImage, 'title': 'Детектива', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Детектива.mp3'},
  {'icon': iconImage, 'title': 'Джим Койот', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/Джим Койот.MP3'},
  {'icon': iconImage, 'title': 'Джин', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Джин.mp3'},
  {'icon': iconImage, 'title': 'Джон', 'file': '../../../../../../../../D:/MUSIK/Старые песни/DOLSKI/Ленинградские акварели/Джон.MP3'},
  {'icon': iconImage, 'title': 'До Свиданья Дорогие', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Берковский/До свиданья, дорогие.WAV'},
  {'icon': iconImage, 'title': 'Дожди', 'file': '../../../../../../../../D:/MUSIK/Старые песни/DOLSKI/Старинные часы/Дожди.mp3'},
  {'icon': iconImage, 'title': 'Дом', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Париж/Дом.mp3'},
  {'icon': iconImage, 'title': 'Дом Хрустальный', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Избранное/Дом хрустальный.mp3'},
  {'icon': iconImage, 'title': 'Дорога', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Суханов/Дорога.mp3'},
  {'icon': iconImage, 'title': 'Друг', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Друг.mp3'},
  {'icon': iconImage, 'title': 'Дурь', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Иваси/Бережкарики/Дурь.mp3'},
  {'icon': iconImage, 'title': 'Ежик С Дыркой В', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/2002 - Резиновий ежик/Ежик с дыркой в.mp3'},
  {'icon': iconImage, 'title': 'Есть Только Миг', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Олег Даль/Есть только миг.mp3'},
  {'icon': iconImage, 'title': 'Еще Не Вечер', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Избранное/Еще не вечер.mp3'},
  {'icon': iconImage, 'title': 'Жираф', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Избранное/Жираф.mp3'},
  {'icon': iconImage, 'title': 'Журавли', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Журавли.WAV'},
  {'icon': iconImage, 'title': 'Журавль', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Ким/Журавль.WAV'},
  {'icon': iconImage, 'title': 'За Туманом', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Кукин/За туманом.WAV'},
  {'icon': iconImage, 'title': 'Зарисовка О Париже', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Зарисовка о Париже.WAV'},
  {'icon': iconImage, 'title': 'Звезда', 'file': '../../../../../../../../D:/MUSIK/Старые песни/DOLSKI/Старинные часы/Звезда.MP3'},
  {'icon': iconImage, 'title': 'Зеленая Карета', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Суханов/Зеленая карета.mp3'},
  {'icon': iconImage, 'title': 'Зимняя Сказка', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1967 - Квинтет под управлением С.Никитина/Зимняя сказка.mp3'},
  {'icon': iconImage, 'title': 'Золотое Сердце', 'file': '../../../../../../../../D:/MUSIK/Старые песни/София Ротару/Золотое сердце.MP3'},
  {'icon': iconImage, 'title': 'Извозчик', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Розенбаум/Извозчик.mp3'},
  {'icon': iconImage, 'title': 'Инопланетяне', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Инопланетяне.mp3'},
  {'icon': iconImage, 'title': 'Исторический Роман', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/Париж/Исторический роман.mp3'},
  {'icon': iconImage, 'title': 'К Вершине', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/К вершине.mp3'},
  {'icon': iconImage, 'title': 'К Чему Нам Быть На Ты', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/DISK3/К чему нам быть на %27ты%27.mp3'},
  {'icon': iconImage, 'title': 'Кабачок Одноглазого Гарри', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/Кабачок одноглазого Гарри.MP3'},
  {'icon': iconImage, 'title': 'Кавалергарды', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/DISK3/Кавалергарды.mp3'},
  {'icon': iconImage, 'title': 'Каждый Выбирает По Себе', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1998 - Is serii Rossiyskie Bardy/Каждый выбирает по себе.mp3'},
  {'icon': iconImage, 'title': 'Казачья', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Розенбаум/Казачья.mp3'},
  {'icon': iconImage, 'title': 'Как Здорово', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Митяев/Как здорово.WAV'},
  {'icon': iconImage, 'title': 'Как То Раз Пришел Домой', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/Как-то раз пришел домой.MP3'},
  {'icon': iconImage, 'title': 'Какое Небо Голубое', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1998 - Девочка и пластилин/Какое небо голубое.mp3'},
  {'icon': iconImage, 'title': 'Какой То Бред', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Какой то бред.WAV'},
  {'icon': iconImage, 'title': 'Камикадзе', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Розенбаум/Камикадзе.WAV'},
  {'icon': iconImage, 'title': 'Капитан', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Ким/Капитан.mp3'},
  {'icon': iconImage, 'title': 'Капли Датского Короля', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/DISK1/Капли датского короля.MP3'},
  {'icon': iconImage, 'title': 'Касандра', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Париж/Касандра.mp3'},
  {'icon': iconImage, 'title': 'Катюша', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Песни военных лет/Катюша.MP3'},
  {'icon': iconImage, 'title': 'Клен', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Синяя птица/Клен.mp3'},
  {'icon': iconImage, 'title': 'Когда Лампа Разбита', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Суханов/Когда лампа разбита.mp3'},
  {'icon': iconImage, 'title': 'Козел Отпущения', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Париж/Козел отпущения.mp3'},
  {'icon': iconImage, 'title': 'Колея', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Париж/Колея.mp3'},
  {'icon': iconImage, 'title': 'Колодец', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Колодец.mp3'},
  {'icon': iconImage, 'title': 'Колокльчик', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Суханов/Колокльчик.mp3'},
  {'icon': iconImage, 'title': 'Комарово', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Комарово.mp3'},
  {'icon': iconImage, 'title': 'Комарово', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Игорь Скляр/Комарово.mp3'},
  {'icon': iconImage, 'title': 'Кони', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Избранное/Кони.mp3'},
  {'icon': iconImage, 'title': 'Корабли', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Избранное/Корабли.mp3'},
  {'icon': iconImage, 'title': 'Корнет', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/DISK3/Корнет.mp3'},
  {'icon': iconImage, 'title': 'Королева Красоты', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Муслим Магомаев/Королева красоты.WAV'},
  {'icon': iconImage, 'title': 'Король', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Дулов/Король.WAV'},
  {'icon': iconImage, 'title': 'Косил Ясь Конюшину', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Песняры/Косил Ясь конюшину.WAV'},
  {'icon': iconImage, 'title': 'Красная Стена', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Розенбаум/Красная стена.mp3'},
  {'icon': iconImage, 'title': 'Кругом 500', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Париж/Кругом 500.mp3'},
  {'icon': iconImage, 'title': 'Кто Сказал Все Сгорело Дотла', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Кто сказал все сгорело дотла.WAV'},
  {'icon': iconImage, 'title': 'Куплеты Курочкина (в Доронин)', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Огней так много золотых/Куплеты Курочкина (В.Доронин).WAV'},
  {'icon': iconImage, 'title': 'Ладони На Глазах', 'file': '../../../../../../../../D:/MUSIK/Старые песни/DOLSKI/Ленинградские акварели/Ладони на глазах.MP3'},
  {'icon': iconImage, 'title': 'Ландыши', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Ландыши.MP3'},
  {'icon': iconImage, 'title': 'Лейся Песня На Просторе', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Лейся песня на просторе.mp3'},
  {'icon': iconImage, 'title': 'Ленинградские Акварели', 'file': '../../../../../../../../D:/MUSIK/Старые песни/DOLSKI/Ленинградские акварели/Ленинградские акварели.MP3'},
  {'icon': iconImage, 'title': 'Лето Это Маленькая Жизнь', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Митяев/Лето это маленькая жизнь.WAV'},
  {'icon': iconImage, 'title': 'Летчик', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1961 - 1968 Охота на волков/Летчик.mp3'},
  {'icon': iconImage, 'title': 'Лирическая', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Избранное/Лирическая.mp3'},
  {'icon': iconImage, 'title': 'Лукоморье', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1967 - 1968 Лукоморье больше нет/Лукоморье.mp3'},
  {'icon': iconImage, 'title': 'Лучший Город Земли', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Муслим Магомаев/Лучший город земли.mp3'},
  {'icon': iconImage, 'title': 'Люси', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/Люси.MP3'},
  {'icon': iconImage, 'title': 'Магадан', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Париж/Магадан.mp3'},
  {'icon': iconImage, 'title': 'Майдан', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/Майдан.WAV'},
  {'icon': iconImage, 'title': 'Майский Вальс', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Песни военных лет/Майский вальс.mp3'},
  {'icon': iconImage, 'title': 'Маленький Принц', 'file': '../../../../../../../../D:/MUSIK/Старые песни/DOLSKI/Старинные часы/Маленький Принц.MP3'},
  {'icon': iconImage, 'title': 'Малиновки Пели', 'file': '../../../../../../../../D:/MUSIK/Старые песни/DOLSKI/Ленинградские акварели/Малиновки пели.MP3'},
  {'icon': iconImage, 'title': 'Маменька', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Поперечный/Маменька.MP3'},
  {'icon': iconImage, 'title': 'Март Сумерки', 'file': '../../../../../../../../D:/MUSIK/Старые песни/DOLSKI/Старинные часы/Март. Сумерки.MP3'},
  {'icon': iconImage, 'title': 'Менуэт Старинном Стиле', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Юрий Лорес/Менуэт старинном стиле.MP3'},
  {'icon': iconImage, 'title': 'Метатель Молота', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1961 - 1968 Охота на волков/Метатель молота.mp3'},
  {'icon': iconImage, 'title': 'Метрополитен', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Иваси/Альма-Матерь/Метрополитен.mp3'},
  {'icon': iconImage, 'title': 'Микрофон', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Париж/Микрофон.mp3'},
  {'icon': iconImage, 'title': 'Мимино', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Вахтанг Кикабидзе/Мимино.WAV'},
  {'icon': iconImage, 'title': 'Мимо Текла Текла Река', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Мимо текла текла река.mp3'},
  {'icon': iconImage, 'title': 'Мне Ребята Сказали', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Мне ребята сказали.mp3'},
  {'icon': iconImage, 'title': 'Мне Твердят', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Г.Хомчик/Мне твердят.mp3'},
  {'icon': iconImage, 'title': 'Мне Этот Бой Не Забыть Ни Почем', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Мне этот бой не забыть ни почем.WAV'},
  {'icon': iconImage, 'title': 'Можжевеловый Куст', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Суханов/Можжевеловый куст.mp3'},
  {'icon': iconImage, 'title': 'Мои Года Мое Богатство', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Вахтанг Кикабидзе/Мои года-мое богатство.WAV'},
  {'icon': iconImage, 'title': 'Мой Милый', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Иваси/Альма-Матерь/Мой милый.mp3'},
  {'icon': iconImage, 'title': 'Москва Одесса', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Избранное/Москва - Одесса.mp3'},
  {'icon': iconImage, 'title': 'Моцарт', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/В США/Моцарт.mp3'},
  {'icon': iconImage, 'title': 'Моя Звезда', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Суханов/Моя звезда.mp3'},
  {'icon': iconImage, 'title': 'Музыка Нас Связала', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Мираж/Музыка нас связала.mp3'},
  {'icon': iconImage, 'title': 'Муравей', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/FIRST_LV/Муравей.MP3'},
  {'icon': iconImage, 'title': 'Мы Вращаем Землю', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Избранное/Мы вращаем землю.mp3'},
  {'icon': iconImage, 'title': 'Мы Говорим Не Штормы', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Мы говорим не штормы.WAV'},
  {'icon': iconImage, 'title': 'Мы Желаем Счастья Вам', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Цветы/Мы желаем счастья вам.MP3'},
  {'icon': iconImage, 'title': 'Мы С Тобой Давно Уже Не Те', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Мы с тобой давно уже не те.mp3'},
  {'icon': iconImage, 'title': 'На Большом Каретном', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/На большом каретном.WAV'},
  {'icon': iconImage, 'title': 'На Нейтральной Полосе', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/На  нейтральной полосе.mp3'},
  {'icon': iconImage, 'title': 'На Перовском На Базаре', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/На Перовском на базаре.mp3'},
  {'icon': iconImage, 'title': 'На Теплоходе Музыка Играет', 'file': '../../../../../../../../D:/MUSIK/Старые песни/На теплоходе музыка играет.mp3'},
  {'icon': iconImage, 'title': 'Надежда', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Анна Герман/Надежда.mp3'},
  {'icon': iconImage, 'title': 'Надежда', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Избранное/Надежда.mp3'},
  {'icon': iconImage, 'title': 'Надежды Маенький Оркестрик', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/FIRST_LV/Надежды маенький оркестрик.MP3'},
  {'icon': iconImage, 'title': 'Надоело', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Розенбаум/Надоело.mp3'},
  {'icon': iconImage, 'title': 'Наш Сосед', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Наш сосед .mp3'},
  {'icon': iconImage, 'title': 'Наши Предки', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1961 - 1968 Охота на волков/Наши предки.mp3'},
  {'icon': iconImage, 'title': 'Не Волнуйтесь Тетя', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Веселые ребята/Не волнуйтесь тетя.mp3'},
  {'icon': iconImage, 'title': 'Не Все То Золото', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/DISK2/Не все то золото.MP3'},
  {'icon': iconImage, 'title': 'Не Надо Печалиться', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Пламя/Не надо печалиться.mp3'},
  {'icon': iconImage, 'title': 'Не Понимаем', 'file': '../../../../../../../../D:/MUSIK/Старые песни/DOLSKI/Ленинградские акварели/Не понимаем.MP3'},
  {'icon': iconImage, 'title': 'Непутевка', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Иваси/Бережкарики/Непутевка.mp3'},
  {'icon': iconImage, 'title': 'Нету Времени', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Розенбаум/Нету времени.mp3'},
  {'icon': iconImage, 'title': 'Неуловимый Джо', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/Неуловимый Джо .MP3'},
  {'icon': iconImage, 'title': 'Нечисть', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Нечисть.mp3'},
  {'icon': iconImage, 'title': 'О Славный Миг', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Городницкий/О славный миг.mp3'},
  {'icon': iconImage, 'title': 'Огонь', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/Земля/Огонь.mp3'},
  {'icon': iconImage, 'title': 'Одесса', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1961 - 1968 Охота на волков/Одесса.mp3'},
  {'icon': iconImage, 'title': 'Один Раз В Год Сады Цветут', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Анна Герман/Один раз в год сады цветут.mp3'},
  {'icon': iconImage, 'title': 'Одиночество', 'file': '../../../../../../../../D:/MUSIK/Старые песни/DOLSKI/Концерт в г.Самаре/Одиночество.MP3'},
  {'icon': iconImage, 'title': 'Одна Научная Загадка', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Одна научная загадка.WAV'},
  {'icon': iconImage, 'title': 'Оклахома', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/Оклахома.MP3'},
  {'icon': iconImage, 'title': 'Октябрь', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Октябрь.mp3'},
  {'icon': iconImage, 'title': 'Оловяный Солдатик', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/Париж2/Оловяный солдатик.mp3'},
  {'icon': iconImage, 'title': 'Он Не Вернулся Из Боя', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Он не вернулся из боя.WAV'},
  {'icon': iconImage, 'title': 'Она Была В Париже', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Избранное/Она была в Париже.mp3'},
  {'icon': iconImage, 'title': 'Орден', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Орден.mp3'},
  {'icon': iconImage, 'title': 'От Прощанья До Прощанья', 'file': '../../../../../../../../D:/MUSIK/Старые песни/DOLSKI/Концерт в г.Самаре/От прощанья до прощанья.MP3'},
  {'icon': iconImage, 'title': 'Откровения', 'file': '../../../../../../../../D:/MUSIK/Старые песни/DOLSKI/Концерт в г.Минске ч.2/Откровения.MP3'},
  {'icon': iconImage, 'title': 'Отслужи По Мнеотслужи', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Розенбаум/Отслужи по мне,отслужи.mp3'},
  {'icon': iconImage, 'title': 'Охота На Волков', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Париж/Охота на волков.mp3'},
  {'icon': iconImage, 'title': 'Охота С Вертолета', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Охота с вертолета.WAV'},
  {'icon': iconImage, 'title': 'Парус', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Париж/Парус.mp3'},
  {'icon': iconImage, 'title': 'Перед Выездом В Загранку', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Перед выездом в загранку.mp3'},
  {'icon': iconImage, 'title': 'Перекаты', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Городницкий/Перекаты.WAV'},
  {'icon': iconImage, 'title': 'Переселение Душ', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Избранное/Переселение душ.mp3'},
  {'icon': iconImage, 'title': 'Песня Завистника', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Песня завистника.mp3'},
  {'icon': iconImage, 'title': 'Песня Застенчивого Гусара', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Александр Быканов/Песня застенчивого гусара.mp3'},
  {'icon': iconImage, 'title': 'Песня Извозчика', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Песня извозчика.mp3'},
  {'icon': iconImage, 'title': 'Песня О Вещем Олеге', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Песня о вещем Олеге.mp3'},
  {'icon': iconImage, 'title': 'Песняры', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Песняры .wav'},
  {'icon': iconImage, 'title': 'Пианист', 'file': '../../../../../../../../D:/MUSIK/Старые песни/DOLSKI/Старинные часы/Пианист.MP3'},
  {'icon': iconImage, 'title': 'Пингвины (виа Аккорд)', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Королева красоты/Пингвины (ВИА Аккорд).WAV'},
  {'icon': iconImage, 'title': 'Плач По Брату', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1999 - Со мною вот что происходит/Плач по брату.mp3'},
  {'icon': iconImage, 'title': 'Плод Что Неспел', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Париж/Плод, что неспел.mp3'},
  {'icon': iconImage, 'title': 'По Диким Степям Аризоны', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/По диким степям Аризоны.MP3'},
  {'icon': iconImage, 'title': 'По Новому', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Митяев/По новому.mp3'},
  {'icon': iconImage, 'title': 'По Прерии Вдоль Железной Дороги', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/По прерии вдоль железной дороги.MP3'},
  {'icon': iconImage, 'title': 'По Цареву Повелению', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1961 - 1968 Охота на волков/По цареву повелению.mp3'},
  {'icon': iconImage, 'title': 'Победа', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/DISK1/Победа.mp3'},
  {'icon': iconImage, 'title': 'Погоня', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Париж/Погоня.mp3'},
  {'icon': iconImage, 'title': 'Под Музыку Вивальди', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1971 - 1975 - Квинтет под управлением С.Никитина/Под музыку вивальди.WAV'},
  {'icon': iconImage, 'title': 'Пожелание', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Пожелание.mp3'},
  {'icon': iconImage, 'title': 'Пожелание', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Вахтанг Кикабидзе/Пожелание.WAV'},
  {'icon': iconImage, 'title': 'Пока Живешь На Свете', 'file': '../../../../../../../../D:/MUSIK/Старые песни/DOLSKI/Старинные часы/Пока живешь на свете.MP3'},
  {'icon': iconImage, 'title': 'Пока Земля Еще Вертится', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/FIRST_LV/Пока земля еще вертится.MP3'},
  {'icon': iconImage, 'title': 'Покойник', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Париж/Покойник.mp3'},
  {'icon': iconImage, 'title': 'Поле Чудес', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1998 - Девочка и пластилин/Поле чудес.mp3'},
  {'icon': iconImage, 'title': 'Помоги Мне (а Ведищева)', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Песни из кинофильмов/Помоги мне (А.Ведищева).WAV'},
  {'icon': iconImage, 'title': 'Пора По Пиву', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Иваси/Ума Палата/Пора по пиву.mp3'},
  {'icon': iconImage, 'title': 'Портлэнд', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/DISK2/Портлэнд.MP3'},
  {'icon': iconImage, 'title': 'Последний Нонешний Денечек', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Бичевская/Последний нонешний денечек.WAV'},
  {'icon': iconImage, 'title': 'Последняя Электричка', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Владимир Макаров/Последняя электричка.WAV'},
  {'icon': iconImage, 'title': 'Послепобедный Вальс', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Розенбаум/Послепобедный вальс.mp3'},
  {'icon': iconImage, 'title': 'Послушайте Все', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Послушайте все.WAV'},
  {'icon': iconImage, 'title': 'Поспел Маис На Ранчо Дяди Билла', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/Поспел маис на ранчо дяди Билла.MP3'},
  {'icon': iconImage, 'title': 'Правда И Лож', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Правда и лож.WAV'},
  {'icon': iconImage, 'title': 'Прекрасное Далеко', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Прекрасное далеко.WAV'},
  {'icon': iconImage, 'title': 'Прерия Кругом Путь Далек Лежит', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/Прерия кругом, путь далек лежит.MP3'},
  {'icon': iconImage, 'title': 'Приходит Время', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Миляев/Приходит время.WAV'},
  {'icon': iconImage, 'title': 'Про Дикого Вепря', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Про дикого вепря.mp3'},
  {'icon': iconImage, 'title': 'Про Индюка', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Суханов/Про индюка.mp3'},
  {'icon': iconImage, 'title': 'Про Йогов', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Про йогов.mp3'},
  {'icon': iconImage, 'title': 'Про Лесных Жителей', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1967 - 1968 Лукоморье больше нет/Про лесных жителей.mp3'},
  {'icon': iconImage, 'title': 'Про Черта', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Про черта.mp3'},
  {'icon': iconImage, 'title': 'Проводы', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Розенбаум/Проводы.mp3'},
  {'icon': iconImage, 'title': 'Провожала Мене Ридна Маты', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/Провожала мене ридна маты.MP3'},
  {'icon': iconImage, 'title': 'Проложите Проложите', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Париж/Проложите проложите.mp3'},
  {'icon': iconImage, 'title': 'Прости Прощай', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Розенбаум/Прости-прощай.MP3'},
  {'icon': iconImage, 'title': 'Прошла Пора', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Прошла пора.WAV'},
  {'icon': iconImage, 'title': 'Прощай', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Лев Лещенко/Прощай.mp3'},
  {'icon': iconImage, 'title': 'Прощай Хх Век', 'file': '../../../../../../../../D:/MUSIK/Старые песни/DOLSKI/Прощай, ХХ век/Прощай, ХХ век.MP3'},
  {'icon': iconImage, 'title': 'Прощальная', 'file': '../../../../../../../../D:/MUSIK/Старые песни/DOLSKI/Старинные часы/Прощальная.MP3'},
  {'icon': iconImage, 'title': 'Прощанье', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Ланцберг/Прощанье.mp3'},
  {'icon': iconImage, 'title': 'Прощяние С Горами', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Прощяние с горами.mp3'},
  {'icon': iconImage, 'title': 'Прыгун В Высоту', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Париж/Прыгун в высоту.mp3'},
  {'icon': iconImage, 'title': 'Птеродактель', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1998 - Девочка и пластилин/Птеродактель.mp3'},
  {'icon': iconImage, 'title': 'Разговор Со Счастьем (в Золотухин)', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Песни из кинофильмов/Разговор со счастьем (В.Золотухин).WAV'},
  {'icon': iconImage, 'title': 'Разлука', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Егоров/Разлука.WAV'},
  {'icon': iconImage, 'title': 'Резиновий Ежик', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/2002 - Резиновий ежик/Резиновий ежик.mp3'},
  {'icon': iconImage, 'title': 'Рождественская', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/DISK2/Рождественская.MP3'},
  {'icon': iconImage, 'title': 'Романс Генерала Чарноты', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Розенбаум/Романс Генерала Чарноты.MP3'},
  {'icon': iconImage, 'title': 'Русская Женщина', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Митяев/Русская женщина.mp3'},
  {'icon': iconImage, 'title': 'Рэквием', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Розенбаум/Рэквием.mp3'},
  {'icon': iconImage, 'title': 'С Добрым Утром Любимая', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Митяев/С добрым утром любимая.mp3'},
  {'icon': iconImage, 'title': 'С Любовью Встретится (н Бродская)', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Песни из кинофильмов/С любовью встретится (Н.Бродская).WAV'},
  {'icon': iconImage, 'title': 'Свадьба', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Муслим Магомаев/Свадьба.mp3'},
  {'icon': iconImage, 'title': 'Свадьба', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Розенбаум/Свадьба.mp3'},
  {'icon': iconImage, 'title': 'Священная Война', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Песни военных лет/Священная Война.MP3'},
  {'icon': iconImage, 'title': 'Священный Бой', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Песни военных лет/Священный Бой.MP3'},
  {'icon': iconImage, 'title': 'Сегодня Не Слышно Биенья Сердец', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Сегодня не слышно биенья сердец.mp3'},
  {'icon': iconImage, 'title': 'Серебрянные Струны', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1961 - 1964 Серебрянные струны/Серебрянные струны.mp3'},
  {'icon': iconImage, 'title': 'Синий Туман', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Вячеслав Добрынин/Синий туман.WAV'},
  {'icon': iconImage, 'title': 'Сказать По Нашему Мы Выпили Немного', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Сказать по нашему мы выпили немного.WAV'},
  {'icon': iconImage, 'title': 'Скалолазка', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Избранное/Скалолазка.mp3'},
  {'icon': iconImage, 'title': 'Скачи Скачи', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Розенбаум/Скачи, скачи.mp3'},
  {'icon': iconImage, 'title': 'Случай На Таможне', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Случай на таможне.WAV'},
  {'icon': iconImage, 'title': 'Смуглянка Молдованка', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Песни военных лет/Смуглянка молдованка.mp3'},
  {'icon': iconImage, 'title': 'Снег', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Городницкий/Снег.WAV'},
  {'icon': iconImage, 'title': 'Сны', 'file': '../../../../../../../../D:/MUSIK/Старые песни/DOLSKI/Ленинградские акварели/Сны.MP3'},
  {'icon': iconImage, 'title': 'Со Мною Вот Что Происходит', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/1999 - Со мною вот что происходит/Со мною вот что происходит.mp3'},
  {'icon': iconImage, 'title': 'Собачий Секрет', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Никитины/2002 - Резиновий ежик/Собачий секрет.mp3'},
  {'icon': iconImage, 'title': 'Солдат', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/FIRST_LV/Солдат.MP3'},
  {'icon': iconImage, 'title': 'Солдаты Группы Центр', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Солдаты группы центр.WAV'},
  {'icon': iconImage, 'title': 'Соловьиная Роща', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Лайма Вайкуле/Соловьиная роща .MP3'},
  {'icon': iconImage, 'title': 'Соловьиная Роща', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Лев Лещенко/Соловьиная роща.mp3'},
  {'icon': iconImage, 'title': 'Спасите Наши Души', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1967 - 1968 Лукоморье больше нет/Спасите наши души.mp3'},
  {'icon': iconImage, 'title': 'Среди Берез Среднй Полосы', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Розенбаум/Среди берез среднй полосы.mp3'},
  {'icon': iconImage, 'title': 'Стали Женщины Нынче Крутые', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Тимур Шаов/Стали женщины нынче крутые.mp3'},
  {'icon': iconImage, 'title': 'Старая Пластинка', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Ариель/Старая пластинка.WAV'},
  {'icon': iconImage, 'title': 'Старинная Солдатская Песня', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/DISK1/Старинная солдатская песня.mp3'},
  {'icon': iconImage, 'title': 'Старые Слова', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Фельцман/Старые слова.MP3'},
  {'icon': iconImage, 'title': 'Старый Дом', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Старый дом.mp3'},
  {'icon': iconImage, 'title': 'Струны Песнями', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Розенбаум/Струны песнями.mp3'},
  {'icon': iconImage, 'title': 'Сюрприз Для Тети Бэкки', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/Сюрприз для тети Бэкки.MP3'},
  {'icon': iconImage, 'title': 'Так Вот Какая Ты', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Синяя птица/Так вот какая ты.mp3'},
  {'icon': iconImage, 'title': 'Так Оно И Есть', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Так оно и есть.mp3'},
  {'icon': iconImage, 'title': 'Тёмная Ночь', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Песни военных лет/Тёмная ночь.mp3'},
  {'icon': iconImage, 'title': 'Темная Ночь (м Бернес)', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Священная война/Темная ночь (М.Бернес).WAV'},
  {'icon': iconImage, 'title': 'То Была Не Интрижка', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/То была не интрижка.WAV'},
  {'icon': iconImage, 'title': 'То Была Не Интрижка', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/То была не интрижка.mp3'},
  {'icon': iconImage, 'title': 'Товарищи Ученые', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Товарищи ученые.WAV'},
  {'icon': iconImage, 'title': 'Только Так', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Иваси/Альма-Матерь/Только так.mp3'},
  {'icon': iconImage, 'title': 'Только Этого Мало', 'file': '../../../../../../../../D:/MUSIK/Старые песни/София Ротару/Только этого мало.mp3'},
  {'icon': iconImage, 'title': 'Тоткоторый Не Стрелял', 'file': '../../../../../../../../D:/MUSIK/Старые песни/TOPIC5/Тот,который не стрелял.WAV'},
  {'icon': iconImage, 'title': 'Три Белих Коня', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Три белих коня.WAV'},
  {'icon': iconImage, 'title': 'Тролейбус', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/FIRST_LV/Тролейбус.mp3'},
  {'icon': iconImage, 'title': 'Трубят Рога', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Трубят рога.WAV'},
  {'icon': iconImage, 'title': 'Туман', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1967 - 1968 Лукоморье больше нет/Туман.mp3'},
  {'icon': iconImage, 'title': 'Ты Мне Не Снишься', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Синяя птица/Ты мне не снишься.mp3'},
  {'icon': iconImage, 'title': 'У Меня Было 40 Фамилий', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1961 - 1968 Охота на волков/У меня было 40 фамилий.mp3'},
  {'icon': iconImage, 'title': 'Увезу Тебя Я В Тундру', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Самоцветы/Увезу тебя я в тундру.mp3'},
  {'icon': iconImage, 'title': 'Удивительный Вальс', 'file': '../../../../../../../../D:/MUSIK/Старые песни/DOLSKI/Старинные часы/Удивительный вальс.MP3'},
  {'icon': iconImage, 'title': 'Ума Палата', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Иваси/Бережкарики/Ума палата.mp3'},
  {'icon': iconImage, 'title': 'Утиная Охота', 'file': '../../../../../../../../D:/MUSIK/Старые песни/А.Розенбаум/Утиная охота.WAV'},
  {'icon': iconImage, 'title': 'Фламинго', 'file': '../../../../../../../../D:/MUSIK/Старые песни/DOLSKI/Ленинградские акварели/Фламинго.MP3'},
  {'icon': iconImage, 'title': 'Холода Холода', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Избранное/Холода , холода.mp3'},
  {'icon': iconImage, 'title': 'Хуторянка', 'file': '../../../../../../../../D:/MUSIK/Старые песни/София Ротару/Хуторянка.mp3'},
  {'icon': iconImage, 'title': 'Целуя Знамя Пропыленный Шелк', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Целуя знамя, пропыленный шелк.WAV'},
  {'icon': iconImage, 'title': 'Черное Золото', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Избранное/Черное золото.mp3'},
  {'icon': iconImage, 'title': 'Черные Бушлаты', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Париж/Черные бушлаты.mp3'},
  {'icon': iconImage, 'title': 'Черный Кот', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Булат.Окуджава/FIRST_LV/Черный кот.MP3'},
  {'icon': iconImage, 'title': 'Чертово Колесо', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Муслим Магомаев/Чертово колесо.mp3'},
  {'icon': iconImage, 'title': 'Честно Говоря', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Цветы/Честно говоря.MP3'},
  {'icon': iconImage, 'title': 'Честь Шахматной Короны', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Честь шахматной короны.wav'},
  {'icon': iconImage, 'title': 'Чудестная Страна', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Чудестная страна.WAV'},
  {'icon': iconImage, 'title': 'Школьный Вальс', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Школьный вальс.mp3'},
  {'icon': iconImage, 'title': 'Шулера', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/1967 - 1968 Лукоморье больше нет/Шулера.mp3'},
  {'icon': iconImage, 'title': 'Экзамен По Химии', 'file': '../../../../../../../../D:/MUSIK/Старые песни/DOLSKI/Концерт в г.Минске ч.2/Экзамен по химии.MP3'},
  {'icon': iconImage, 'title': 'Экспедиция', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Александр Градский/Экспедиция.MP3'},
  {'icon': iconImage, 'title': 'Электричка', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Электричка.mp3'},
  {'icon': iconImage, 'title': 'Эта Ночь', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Мираж/Эта ночь.mp3'},
  {'icon': iconImage, 'title': 'Эти Глаза Напротив', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Валерий Ободзинский/Эти глаза напротив.mp3'},
  {'icon': iconImage, 'title': 'Эх Раз', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Избранное/Эх раз.mp3'},
  {'icon': iconImage, 'title': 'Эхо', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Париж/Эхо.mp3'},
  {'icon': iconImage, 'title': 'Я Баба Яга', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Я баба-яга.WAV'},
  {'icon': iconImage, 'title': 'Я Буду Долго Гнать Велосипед', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Я буду долго гнать велосипед.mp3'},
  {'icon': iconImage, 'title': 'Я Люблю Этот Мир', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Самоцветы/Я люблю этот мир.WAV'},
  {'icon': iconImage, 'title': 'Я Не Могу Иначе', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Валентина Толкунова/Я не могу иначе.mp3'},
  {'icon': iconImage, 'title': 'Я Помню Райвоенкомат', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Я помню райвоенкомат.WAV'},
  {'icon': iconImage, 'title': 'Ягода Малина', 'file': '../../../../../../../../D:/MUSIK/Старые песни/Ягода малина.mp3'},
  {'icon': iconImage, 'title': 'Як Истебитель', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/Избранное/Як истебитель.mp3'},
  {'icon': iconImage, 'title': 'Ярмарка', 'file': '../../../../../../../../D:/MUSIK/Старые песни/В.Высоцкий/СD/Ярмарка.WAV'},
]);
})

document.getElementById('тату').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '30 Минут', 'file': '../../../../../../../../D:/MUSIK/Тату/30 минут.mp3'},
  {'icon': iconImage, 'title': 'All About Us', 'file': '../../../../../../../../D:/MUSIK/Тату/All about Us.mp3'},
  {'icon': iconImage, 'title': 'All The Things She Said', 'file': '../../../../../../../../D:/MUSIK/Тату/All The Things She Said.mp3'},
  {'icon': iconImage, 'title': 'How Soon Is Now', 'file': '../../../../../../../../D:/MUSIK/Тату/How Soon Is Now.mp3'},
  {'icon': iconImage, 'title': 'Not Gonna Get Us', 'file': '../../../../../../../../D:/MUSIK/Тату/Not Gonna Get Us.mp3'},
  {'icon': iconImage, 'title': 'Show Me Love', 'file': '../../../../../../../../D:/MUSIK/Тату/Show me love.mp3'},
  {'icon': iconImage, 'title': 'Stars', 'file': '../../../../../../../../D:/MUSIK/Тату/Stars.mp3'},
  {'icon': iconImage, 'title': 'Досчитай До Ста', 'file': '../../../../../../../../D:/MUSIK/Тату/Досчитай до ста.mp3'},
  {'icon': iconImage, 'title': 'Мальчик Гей', 'file': '../../../../../../../../D:/MUSIK/Тату/Мальчик Гей.mp3'},
  {'icon': iconImage, 'title': 'Нас Не Догнят (engl)', 'file': '../../../../../../../../D:/MUSIK/Тату/Нас не догнят (Engl).mp3'},
  {'icon': iconImage, 'title': 'Нас Не Догонят', 'file': '../../../../../../../../D:/MUSIK/Тату/Нас не догонят .mp3'},
  {'icon': iconImage, 'title': 'Нас Не Догонят', 'file': '../../../../../../../../D:/MUSIK/Тату/Нас не догонят.mp3'},
  {'icon': iconImage, 'title': 'Не Верь Не Бойся Не Проси', 'file': '../../../../../../../../D:/MUSIK/Тату/Не верь, не бойся, не проси.mp3'},
  {'icon': iconImage, 'title': 'Облока', 'file': '../../../../../../../../D:/MUSIK/Тату/Облока.mp3'},
  {'icon': iconImage, 'title': 'Покажи Мне Любовь', 'file': '../../../../../../../../D:/MUSIK/Тату/Покажи мне любовь.mp3'},
  {'icon': iconImage, 'title': 'Пол Часа', 'file': '../../../../../../../../D:/MUSIK/Тату/Пол часа.mp3'},
  {'icon': iconImage, 'title': 'Простые Движения', 'file': '../../../../../../../../D:/MUSIK/Тату/Простые движения.mp3'},
  {'icon': iconImage, 'title': 'Робот', 'file': '../../../../../../../../D:/MUSIK/Тату/Робот.mp3'},
  {'icon': iconImage, 'title': 'Твой Враг', 'file': '../../../../../../../../D:/MUSIK/Тату/Твой враг.mp3'},
  {'icon': iconImage, 'title': 'Я Сошла С Ума', 'file': '../../../../../../../../D:/MUSIK/Тату/Я сошла с ума.MP3'},
]);
})

document.getElementById('чайф').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '17 Лет', 'file': '../../../../../../../../D:/MUSIK/Чайф/1995 - Пусть все будет так, как ты захочешь/17 лет.mp3'},
  {'icon': iconImage, 'title': 'Rocknroll Этой Ночи', 'file': '../../../../../../../../D:/MUSIK/Чайф/1987 - Дерьмонтин/Rock%27n%27roll этой ночи.mp3'},
  {'icon': iconImage, 'title': 'Ангел', 'file': '../../../../../../../../D:/MUSIK/Чайф/2006 - От себя/Ангел.mp3'},
  {'icon': iconImage, 'title': 'Аргентина Ямайка 5 0', 'file': '../../../../../../../../D:/MUSIK/Чайф/2000 - Шекогали/Аргентина-Ямайка 5-0.mp3'},
  {'icon': iconImage, 'title': 'В Ее Глазах', 'file': '../../../../../../../../D:/MUSIK/Чайф/2000 - Шекогали/В ее глазах.mp3'},
  {'icon': iconImage, 'title': 'Давай Вернемся', 'file': '../../../../../../../../D:/MUSIK/Чайф/1990 - Давай вернемся/Давай вернемся.mp3'},
  {'icon': iconImage, 'title': 'Зинаида', 'file': '../../../../../../../../D:/MUSIK/Чайф/1994 - Оранжевое настроение/Зинаида.mp3'},
  {'icon': iconImage, 'title': 'Кончается Век', 'file': '../../../../../../../../D:/MUSIK/Чайф/2000 - Шекогали/Кончается век.mp3'},
  {'icon': iconImage, 'title': 'Мимо', 'file': '../../../../../../../../D:/MUSIK/Чайф/2001 - Время не ждет/Мимо.mp3'},
  {'icon': iconImage, 'title': 'Не Со Мной', 'file': '../../../../../../../../D:/MUSIK/Чайф/1996 - Реальный мир/Не со мной.mp3'},
  {'icon': iconImage, 'title': 'Не Спеши', 'file': '../../../../../../../../D:/MUSIK/Чайф/1993 - Дети гор/Не спеши.mp3'},
  {'icon': iconImage, 'title': 'Никто Не Услышит', 'file': '../../../../../../../../D:/MUSIK/Чайф/1990 - Давай вернемся/Никто не услышит.mp3'},
  {'icon': iconImage, 'title': 'Поплачь О Нем', 'file': '../../../../../../../../D:/MUSIK/Чайф/1989 - Не беда/Поплачь о нем.mp3'},
  {'icon': iconImage, 'title': 'С Войны', 'file': '../../../../../../../../D:/MUSIK/Чайф/1990 - Давай вернемся/С войны.mp3'},
  {'icon': iconImage, 'title': 'Я Рисую На Окне', 'file': '../../../../../../../../D:/MUSIK/Чайф/1999 - Шекогали/Я рисую на окне.mp3'},
]);
})

document.getElementById('эльфийскаярукопись').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Всадник Из Льда', 'file': '../../../../../../../../D:/MUSIK/Эльфийская рукопись/Всадник из льда.mp3'},
  {'icon': iconImage, 'title': 'Золотые Драконы', 'file': '../../../../../../../../D:/MUSIK/Эльфийская рукопись/Золотые драконы.mp3'},
  {'icon': iconImage, 'title': 'Магия И Меч', 'file': '../../../../../../../../D:/MUSIK/Эльфийская рукопись/Магия И Меч.mp3'},
  {'icon': iconImage, 'title': 'Пройди Свой Путь', 'file': '../../../../../../../../D:/MUSIK/Эльфийская рукопись/Пройди Свой Путь.mp3'},
  {'icon': iconImage, 'title': 'Романс О Слезе', 'file': '../../../../../../../../D:/MUSIK/Эльфийская рукопись/Романс О Слезе.mp3'},
  {'icon': iconImage, 'title': 'Час Испытания', 'file': '../../../../../../../../D:/MUSIK/Эльфийская рукопись/Час испытания.mp3'},
  {'icon': iconImage, 'title': 'Эпилог', 'file': '../../../../../../../../D:/MUSIK/Эльфийская рукопись/Эпилог.mp3'},
]);
})

document.getElementById('ю.антонов').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Белый Теплоход', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1987 - От печали до радости 1/Белый теплоход.mp3'},
  {'icon': iconImage, 'title': 'Берегите Женщин', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1987 - От печали до радости 1/Берегите женщин.mp3'},
  {'icon': iconImage, 'title': 'Вот Как Бывает', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1983 - Крыша дома твоего/Вот как бывает.mp3'},
  {'icon': iconImage, 'title': 'Давай Не Будем Спешить', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1987 - От печали до радости 2/Давай не будем спешить.mp3'},
  {'icon': iconImage, 'title': 'Дай Мне Руку', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1987 - От печали до радости 2/Дай мне руку.mp3'},
  {'icon': iconImage, 'title': 'Двадцать Лет Спустя', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1983 - Крыша дома твоего/Двадцать лет спустя.mp3'},
  {'icon': iconImage, 'title': 'Дорога К Морю', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1983 - Крыша дома твоего/Дорога к морю.mp3'},
  {'icon': iconImage, 'title': 'Если Пойдем Вдвоем', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1985 - Поверь в мечту/Если пойдем вдвоем.mp3'},
  {'icon': iconImage, 'title': 'Живет Повсюду Красота', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1987 - От печали до радости 2/Живет повсюду красота.mp3'},
  {'icon': iconImage, 'title': 'Жизнь', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1987 - От печали до радости 2/Жизнь.mp3'},
  {'icon': iconImage, 'title': 'Зеркало', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1983 - Золотая лестница (Группа Аракс)/Зеркало.mp3'},
  {'icon': iconImage, 'title': 'Крыша Дома Твоего', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1983 - Крыша дома твоего/Крыша дома твоего.mp3'},
  {'icon': iconImage, 'title': 'Лунная Дорожка', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1987 - От печали до радости 1/Лунная дорожка.mp3'},
  {'icon': iconImage, 'title': 'Мой Путь Прост', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1987 - От печали до радости 1/Мой путь прост.mp3'},
  {'icon': iconImage, 'title': 'Море', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1983 - Крыша дома твоего/Море.mp3'},
  {'icon': iconImage, 'title': 'На Улице Каштановой', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1985 - Поверь в мечту/На улице Каштановой.mp3'},
  {'icon': iconImage, 'title': 'Не Говорите Мне Прощай', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1987 - От печали до радости 1/Не говорите мне прощай.mp3'},
  {'icon': iconImage, 'title': 'Не До Смеха', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1985 - Поверь в мечту/Не до смеха.mp3'},
  {'icon': iconImage, 'title': 'Не Забывай', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1983 - Золотая лестница (Группа Аракс)/Не забывай.mp3'},
  {'icon': iconImage, 'title': 'Не Рвите Цветы', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1987 - От печали до радости 1/Не рвите цветы.mp3'},
  {'icon': iconImage, 'title': 'От Печали До Радости', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1983 - Золотая лестница (Группа Аракс)/От печали до радости.mp3'},
  {'icon': iconImage, 'title': 'Поверь В Мечту', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1985 - Поверь в мечту/Поверь в мечту.mp3'},
  {'icon': iconImage, 'title': 'Пусть Вечным Будет Мир', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1996 - Песни для детей/Пусть вечным будет мир.mp3'},
  {'icon': iconImage, 'title': 'Родные Места', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1987 - От печали до радости 2/Родные места.mp3'},
  {'icon': iconImage, 'title': 'Снегири', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1985 - Поверь в мечту/Снегири.mp3'},
  {'icon': iconImage, 'title': 'Трава У Дома', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/Трава у дома.mp3'},
  {'icon': iconImage, 'title': 'Туами', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1996 - Песни для детей/Туами.mp3'},
  {'icon': iconImage, 'title': 'У Берез И Сосен', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1973 - Юрий Антонов и оркестр Современник/У берез и сосен.mp3'},
  {'icon': iconImage, 'title': 'Хмельная Сирень', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1987 - От печали до радости 2/Хмельная сирень.mp3'},
  {'icon': iconImage, 'title': 'Я Не Жалею Ни О Чем', 'file': '../../../../../../../../D:/MUSIK/Ю.Антонов/1985 - Поверь в мечту/Я не жалею ни о чем.mp3'},
]);
})

document.getElementById('юрийвизбор').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Vi09 13', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/VI09_13.mp3'},
  {'icon': iconImage, 'title': 'Английский Язык', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/ВСТАВАЙТЕ ГРАФ/Английский язык.mp3'},
  {'icon': iconImage, 'title': 'Базука', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/ЕСЛИ Я ЗАБОЛЕЮ/Базука.mp3'},
  {'icon': iconImage, 'title': 'Бригантина', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/БРИГАНТИНА/Бригантина.mp3'},
  {'icon': iconImage, 'title': 'Велосипед', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/СОЛНЫШКО ЛЕСНОЕ/Велосипед.mp3'},
  {'icon': iconImage, 'title': 'Волейбол На Сретенке', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/ВОЛЕЙБОЛ НА СРЕТЕНКЕ/Волейбол на Сретенке.mp3'},
  {'icon': iconImage, 'title': 'Вставайте Граф', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/ВСТАВАЙТЕ ГРАФ/Вставайте граф.mp3'},
  {'icon': iconImage, 'title': 'Давным Давно', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/ДОМБАИССКИЙ ВАЛЬС/Давным давно.mp3'},
  {'icon': iconImage, 'title': 'Доклад', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/НОЧНАЯ ДОРОГА/Доклад.mp3'},
  {'icon': iconImage, 'title': 'Домбайсский Вальс', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/ДОМБАИССКИЙ ВАЛЬС/Домбайсский вальс.mp3'},
  {'icon': iconImage, 'title': 'Если Я Заболею', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/ЕСЛИ Я ЗАБОЛЕЮ/Если я заболею.mp3'},
  {'icon': iconImage, 'title': 'Жак Ландрэй', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/Жак Ландрэй.mp3'},
  {'icon': iconImage, 'title': 'Здравствуйздравствуй', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/ДОМБАИССКИЙ ВАЛЬС/Здравствуй,здравствуй.mp3'},
  {'icon': iconImage, 'title': 'Излишний Вес', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/ЗЕЛЕНОЕ ПЕРО/Излишний вес.mp3'},
  {'icon': iconImage, 'title': 'Ищи Меня Сегодня', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/Ищи меня сегодня.WAV'},
  {'icon': iconImage, 'title': 'Люси', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/ВСТАВАЙТЕ ГРАФ/Люси.mp3'},
  {'icon': iconImage, 'title': 'Мне Твердят', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/ВОЛЕЙБОЛ НА СРЕТЕНКЕ/Мне твердят.mp3'},
  {'icon': iconImage, 'title': 'Нам Бы Выпить Перед Стартом', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/ВСТАВАЙТЕ ГРАФ/Нам бы выпить перед стартом.mp3'},
  {'icon': iconImage, 'title': 'Наполним Музыкой Сердца', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/ДОМБАИССКИЙ ВАЛЬС/Наполним музыкой сердца.mp3'},
  {'icon': iconImage, 'title': 'Ночная Дорога', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/НОЧНАЯ ДОРОГА/Ночная дорога.mp3'},
  {'icon': iconImage, 'title': 'Памирская Песня', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/РАСПАХНУТЫЕ ВЕТРА/Памирская песня.mp3'},
  {'icon': iconImage, 'title': 'Песня Альпинистов', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/РАСПАХНУТЫЕ ВЕТРА/Песня альпинистов.mp3'},
  {'icon': iconImage, 'title': 'Песня О Москве', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/НОЧНАЯ ДОРОГА/Песня о Москве.mp3'},
  {'icon': iconImage, 'title': 'Подмосковная', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/БРИГАНТИНА/Подмосковная.mp3'},
  {'icon': iconImage, 'title': 'Рассказ Ветерана', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/ЗИМНИЙ ВЕЧЕР/Рассказ ветерана.mp3'},
  {'icon': iconImage, 'title': 'Серега Санин', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/ДОМБАИССКИЙ ВАЛЬС/Серега Санин.mp3'},
  {'icon': iconImage, 'title': 'Солнышко Лесное', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/СОЛНЫШКО ЛЕСНОЕ/Солнышко лесное.mp3'},
  {'icon': iconImage, 'title': 'Солнышко Лесное', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/Солнышко лесное.WAV'},
  {'icon': iconImage, 'title': 'Сорокалетие', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/ВСТАВАЙТЕ ГРАФ/Сорокалетие.mp3'},
  {'icon': iconImage, 'title': 'Спартак На Памире', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/ДОМБАИССКИЙ ВАЛЬС/Спартак на Памире.mp3'},
  {'icon': iconImage, 'title': 'Сретенский Двор', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/ВОЛЕЙБОЛ НА СРЕТЕНКЕ/Сретенский двор.mp3'},
  {'icon': iconImage, 'title': 'Старые Ели', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/БРИГАНТИНА/Старые Ели.mp3'},
  {'icon': iconImage, 'title': 'Телефон', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/ВСТАВАЙТЕ ГРАФ/Телефон.mp3'},
  {'icon': iconImage, 'title': 'Три Минуты Тишины', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/НОЧНАЯ ДОРОГА/Три минуты тишины.mp3'},
  {'icon': iconImage, 'title': 'Три Сосны', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/Три сосны.mp3'},
  {'icon': iconImage, 'title': 'Ты У Меня Одна', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/Ты у меня одна.mp3'},
  {'icon': iconImage, 'title': 'Ты У Меня Одна', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/ДОМБАИССКИЙ ВАЛЬС/Ты у меня одна.mp3'},
  {'icon': iconImage, 'title': 'Укушенный', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/ВОЛЕЙБОЛ НА СРЕТЕНКЕ/Укушенный.mp3'},
  {'icon': iconImage, 'title': 'Фанские Горы', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/РАСПАХНУТЫЕ ВЕТРА/Фанские горы.mp3'},
  {'icon': iconImage, 'title': 'Ходики', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/ВОЛЕЙБОЛ НА СРЕТЕНКЕ/Ходики.mp3'},
  {'icon': iconImage, 'title': 'Я Думаю О Вас', 'file': '../../../../../../../../D:/MUSIK/Юрий Визбор/ЗЕЛЕНОЕ ПЕРО/Я думаю о вас.mp3'},
]);
})

