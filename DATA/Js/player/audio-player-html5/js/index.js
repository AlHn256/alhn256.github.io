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
  {'icon': iconImage, 'title': 'Gamefire', 'file': '../Data/gamefire.mp3'},
  {'icon': iconImage, 'title': 'Hans Zimmer Time Myzuka Fm', 'file': '../Data/hans_zimmer_time_myzuka.fm.mp3'},
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
  {'icon': iconImage, 'title': 'Time To Burn', 'file': '../Data/Time to Burn.mp3'},
  {'icon': iconImage, 'title': 'Towards The Sun', 'file': '../Data/Towards the sun.mp3'},
  {'icon': iconImage, 'title': 'Tuyo', 'file': '../Data/Tuyo.mp3'},
  {'icon': iconImage, 'title': 'Varien Valkyrie Feat Laura Brehm', 'file': '../Data/varien_valkyrie_feat_laura_brehm.mp3'},
  {'icon': iconImage, 'title': 'What A Life', 'file': '../Data/What A Life.mp3'},
  {'icon': iconImage, 'title': 'Whatever It Takes', 'file': '../Data/Whatever It Takes.mp3'},
  {'icon': iconImage, 'title': 'When I Dream', 'file': '../Data/When I Dream.mp3'},
  {'icon': iconImage, 'title': 'Whenever Wherever', 'file': '../Data/Whenever Wherever.mp3'},
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
document.getElementById('mp3').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Bad Liar', 'file': '../../../../../../Test/Kn/mp3/Bad Liar.mp3'},
  {'icon': iconImage, 'title': 'Behind Blue Eyes', 'file': '../../../../../../Test/Kn/mp3/Behind Blue Eyes.mp3'},
  {'icon': iconImage, 'title': 'Careless Whispe', 'file': '../../../../../../Test/Kn/mp3/Careless Whispe.mp3'},
  {'icon': iconImage, 'title': 'Celebrate The Love', 'file': '../../../../../../Test/Kn/mp3/Celebrate the Love.mp3'},
  {'icon': iconImage, 'title': 'Chandelier', 'file': '../../../../../../Test/Kn/mp3/Chandelier.mp3'},
  {'icon': iconImage, 'title': 'Changed The Way You Kiss Me', 'file': '../../../../../../Test/Kn/mp3/Changed the way you kiss me.mp3'},
  {'icon': iconImage, 'title': 'Diamonds Myzuka', 'file': '../../../../../../Test/Kn/mp3/Diamonds myzuka.mp3'},
  {'icon': iconImage, 'title': 'Thunder', 'file': '../../../../../../Test/Kn/mp3/Thunder.mp3'},
  {'icon': iconImage, 'title': 'Whatever It Takes', 'file': '../../../../../../Test/Kn/mp3/Whatever It Takes.mp3'},
  {'icon': iconImage, 'title': 'Whenever Wherever', 'file': '../../../../../../Test/Kn/mp3/Whenever Wherever.mp3'},
]);
})

document.getElementById('mp4').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Birds (official Audio)', 'file': '../../../../../../Test/Kn/mp4/Birds (Official Audio).mp4'},
  {'icon': iconImage, 'title': 'Game Of Thrones Theme', 'file': '../../../../../../Test/Kn/mp4/GAME OF THRONES THEME.mp4'},
  {'icon': iconImage, 'title': 'Now We Are Free (piano Version)', 'file': '../../../../../../Test/Kn/mp4/Now We Are Free (Piano Version).mp4'},
  {'icon': iconImage, 'title': 'Кошмары Кукрыниксы', 'file': '../../../../../../Test/Kn/mp4/Кошмары кукрыниксы.mp4'},
  {'icon': iconImage, 'title': 'Спокойная Ночь', 'file': '../../../../../../Test/Kn/mp4/Спокойная ночь.mp4'},
  {'icon': iconImage, 'title': 'Четыре Окна', 'file': '../../../../../../Test/Kn/mp4/ЧЕТЫРЕ ОКНА.mp4'},
]);
})

document.getElementById('wav').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Позови Меня С Собой', 'file': '../../../../../../Test/Kn/WAV/Позови меня с собой.WAV'},
]);
})

document.getElementById('борисштерн').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '(1)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/(1).mp3'},
  {'icon': iconImage, 'title': '(10)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (10).mp3'},
  {'icon': iconImage, 'title': '(11)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (11).mp3'},
  {'icon': iconImage, 'title': '(12)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (12).mp3'},
  {'icon': iconImage, 'title': '(13)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (13).mp3'},
  {'icon': iconImage, 'title': '(14)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (14).mp3'},
  {'icon': iconImage, 'title': '(15)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (15).mp3'},
  {'icon': iconImage, 'title': '(16)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (16).mp3'},
  {'icon': iconImage, 'title': '(17)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (17).mp3'},
  {'icon': iconImage, 'title': '(18)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (18).mp3'},
  {'icon': iconImage, 'title': '(19)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (19).mp3'},
  {'icon': iconImage, 'title': '(2)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (2).mp3'},
  {'icon': iconImage, 'title': '(20)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (20).mp3'},
  {'icon': iconImage, 'title': '(21)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (21).mp3'},
  {'icon': iconImage, 'title': '(22)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (22).mp3'},
  {'icon': iconImage, 'title': '(23)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (23).mp3'},
  {'icon': iconImage, 'title': '(24)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (24).mp3'},
  {'icon': iconImage, 'title': '(25)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (25).mp3'},
  {'icon': iconImage, 'title': '(26)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (26).mp3'},
  {'icon': iconImage, 'title': '(27)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (27).mp3'},
  {'icon': iconImage, 'title': '(28)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (28).mp3'},
  {'icon': iconImage, 'title': '(29)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (29).mp3'},
  {'icon': iconImage, 'title': '(3)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (3).mp3'},
  {'icon': iconImage, 'title': '(30)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (30).mp3'},
  {'icon': iconImage, 'title': '(31)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (31).mp3'},
  {'icon': iconImage, 'title': '(32)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (32).mp3'},
  {'icon': iconImage, 'title': '(33)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (33).mp3'},
  {'icon': iconImage, 'title': '(34)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (34).mp3'},
  {'icon': iconImage, 'title': '(35)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (35).mp3'},
  {'icon': iconImage, 'title': '(36)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (36).mp3'},
  {'icon': iconImage, 'title': '(37)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (37).mp3'},
  {'icon': iconImage, 'title': '(38)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (38).mp3'},
  {'icon': iconImage, 'title': '(39)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (39).mp3'},
  {'icon': iconImage, 'title': '(4)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (4).mp3'},
  {'icon': iconImage, 'title': '(40)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (40).mp3'},
  {'icon': iconImage, 'title': '(41)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (41).mp3'},
  {'icon': iconImage, 'title': '(42)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (42).mp3'},
  {'icon': iconImage, 'title': '(43)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (43).mp3'},
  {'icon': iconImage, 'title': '(44)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (44).mp3'},
  {'icon': iconImage, 'title': '(5)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (5).mp3'},
  {'icon': iconImage, 'title': '(6)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (6).mp3'},
  {'icon': iconImage, 'title': '(7)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (7).mp3'},
  {'icon': iconImage, 'title': '(8)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (8).mp3'},
  {'icon': iconImage, 'title': '(9)', 'file': '../../../../../../Test/Kn/Борис Штерн/Записки динозавра/ (9).mp3'},
  {'icon': iconImage, 'title': '1', 'file': '../../../../../../Test/Kn/Борис Штерн/Сумасшедший король/1.mp3'},
  {'icon': iconImage, 'title': '2', 'file': '../../../../../../Test/Kn/Борис Штерн/Сумасшедший король/2.mp3'},
  {'icon': iconImage, 'title': '3 4', 'file': '../../../../../../Test/Kn/Борис Штерн/Сумасшедший король/3_4.mp3'},
  {'icon': iconImage, 'title': 'Gorynych By Nighthunter 21 01', 'file': '../../../../../../Test/Kn/Борис Штерн/Gorynych_by_Nighthunter_21-01.mp3'},
  {'icon': iconImage, 'title': 'Spasti Cheloveka', 'file': '../../../../../../Test/Kn/Борис Штерн/Spasti_cheloveka.mp3'},
  {'icon': iconImage, 'title': 'Дед Мороз', 'file': '../../../../../../Test/Kn/Борис Штерн/Дед мороз.mp3'},
]);
})

document.getElementById('земляшорохов').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '001 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/001_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '002 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/002_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '003 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/003_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '004 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/004_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '005 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/005_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '005a Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/005a_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '006 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/006_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '007 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/007_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '008 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/008_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '009 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/009_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '010 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/010_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '011 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/011_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '012 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/012_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '013 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/013_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '014 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/014_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '015 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/015_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '016 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/016_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '017 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/017_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '018 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/018_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '019 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/019_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '020 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/020_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '021 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/021_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '022 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/022_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '023 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/023_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '024 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/024_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '025 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/025_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '026 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/026_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '027 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/027_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '028 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/028_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '029 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/029_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '030 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/030_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '031 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/031_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '032 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/032_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '033 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/033_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '034 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/034_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '035 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/035_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '036 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/036_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '037 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/037_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '038 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/038_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '039 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/039_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '040 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/040_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '041 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/041_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '042 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/042_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '043 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/043_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '044 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/044_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '045 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/045_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '046 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/046_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '047 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/047_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '048 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/048_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '049 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/049_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '050 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/050_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '051 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/051_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '052 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/052_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '053 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/053_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '054 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/054_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '055 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/055_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '056 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/056_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '057 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/057_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '058 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/058_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '059 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/059_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '060 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/060_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '061 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/061_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '062 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/062_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '063 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/063_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '064 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/064_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '065 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/065_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '066 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/066_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '067 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/067_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '068 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/068_Durell_G_Zemlja_shorohov.mp3'},
  {'icon': iconImage, 'title': '069 Durell G Zemlja Shorohov', 'file': '../../../../../../Test/Kn/Земля шорохов/069_Durell_G_Zemlja_shorohov.mp3'},
]);
})

document.getElementById('крахвеликойимперии(арменгаспарян)').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Февральская Революция Лекция В Гим', 'file': '../../../../../../Test/Kn/Крах великой империи (Армен Гаспарян)/Февральская революция. Лекция в ГИМ.mp4'},
]);
})

