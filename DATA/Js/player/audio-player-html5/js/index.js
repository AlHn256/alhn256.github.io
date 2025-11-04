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
  {'icon': iconImage, 'title': 'Now We Are Free', 'file': '../Data/Now We Are Free.mp4'},
  {'icon': iconImage, 'title': 'Now We Are Free (piano Version)', 'file': '../Data/Now We Are Free (Piano Version).mp4'},
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
  {'icon': iconImage, 'title': 'Whenever Wherever', 'file': '../Data/Whenever Wherever.mp3'},
  {'icon': iconImage, 'title': 'Wish You Were Here', 'file': '../Data/Wish You Were Here.webm'},
  {'icon': iconImage, 'title': 'Вокзал', 'file': '../Data/Вокзал.mp4'},
  {'icon': iconImage, 'title': 'Где Мы Летим', 'file': '../Data/Где мы летим.mp3'},
  {'icon': iconImage, 'title': 'Герой', 'file': '../Data/Герой.mp3'},
  {'icon': iconImage, 'title': 'Живет Повсюду Красота', 'file': '../Data/Живет повсюду красота.mp3'},
  {'icon': iconImage, 'title': 'Жмурки', 'file': '../Data/Жмурки.mp3'},
  {'icon': iconImage, 'title': 'Кошмары Кукрыниксы', 'file': '../Data/Кошмары кукрыниксы.mp4'},
  {'icon': iconImage, 'title': 'Крылатые Качели (rammstein)', 'file': '../Data/Крылатые качели (Rammstein).mp4'},
  {'icon': iconImage, 'title': 'Летели Облака', 'file': '../Data/Летели Облака.mp3'},
  {'icon': iconImage, 'title': 'Метель', 'file': '../Data/Метель.mp3'},
  {'icon': iconImage, 'title': 'Мы Как Трепетные Птицы', 'file': '../Data/Мы как трепетные птицы.mp3'},
  {'icon': iconImage, 'title': 'На Заре', 'file': '../Data/На заре.mp3'},
  {'icon': iconImage, 'title': 'Ночная Дорога', 'file': '../Data/Ночная дорога.mp4'},
  {'icon': iconImage, 'title': 'Ночная Пьеса', 'file': '../Data/Ночная пьеса.mp4'},
  {'icon': iconImage, 'title': 'Она', 'file': '../Data/Она.mp4'},
  {'icon': iconImage, 'title': 'Победа', 'file': '../Data/Победа.mp4'},
  {'icon': iconImage, 'title': 'Пыяла', 'file': '../Data/Пыяла.mp3'},
  {'icon': iconImage, 'title': 'Реальность', 'file': '../Data/Реальность.mp3'},
  {'icon': iconImage, 'title': 'Рожденный В Ссср', 'file': '../Data/Рожденный в СССР.mp4'},
  {'icon': iconImage, 'title': 'Русская Весна', 'file': '../Data/Русская весна.mp3'},
  {'icon': iconImage, 'title': 'Спокойная Ночь', 'file': '../Data/Спокойная ночь.mp4'},
  {'icon': iconImage, 'title': 'Спокойно Дружище', 'file': '../Data/Спокойно, дружище.mp4'},
  {'icon': iconImage, 'title': 'Там На Самом Краю Земли', 'file': '../Data/Там, на самом краю земли.mp4'},
  {'icon': iconImage, 'title': 'Четыре Окна', 'file': '../Data/ЧЕТЫРЕ ОКНА.mp4'},
  {'icon': iconImage, 'title': 'Я Не Жалею Ни О Чем', 'file': '../Data/Я не жалею ни о чем.mp3'},
   ]
});

// TEST: update playlist
document.getElementById('abba').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Chiquitita', 'file': '../../../../../../../../F:/MUSIK/ABBA/1986 - Abba Live/Chiquitita.mp3'},
  {'icon': iconImage, 'title': 'Dancing Queen', 'file': '../../../../../../../../F:/MUSIK/ABBA/1986 - Abba Live/Dancing Queen.mp3'},
  {'icon': iconImage, 'title': 'Fernando', 'file': '../../../../../../../../F:/MUSIK/ABBA/1976 - Arrival/Fernando.mp3'},
  {'icon': iconImage, 'title': 'Gimme! Gimme! Gimme! (a Man After Midnight)', 'file': '../../../../../../../../F:/MUSIK/ABBA/1979 - Voulez-Vous/Gimme! Gimme! Gimme! (a man after midnight).mp3'},
  {'icon': iconImage, 'title': 'Happy New Year', 'file': '../../../../../../../../F:/MUSIK/ABBA/1980 - Super Trouper/Happy New Year.mp3'},
  {'icon': iconImage, 'title': 'Head Over Heels', 'file': '../../../../../../../../F:/MUSIK/ABBA/1993 - More Abba Gold/Head Over Heels.mp3'},
  {'icon': iconImage, 'title': 'Honey Honey', 'file': '../../../../../../../../F:/MUSIK/ABBA/1974 - Waterloo/Honey, Honey.mp3'},
  {'icon': iconImage, 'title': 'I Do I Do I Do', 'file': '../../../../../../../../F:/MUSIK/ABBA/1993 - More Abba Gold/I do, I do, I do.mp3'},
  {'icon': iconImage, 'title': 'I Have A Dream', 'file': '../../../../../../../../F:/MUSIK/ABBA/1979 - Voulez-Vous/I Have A Dream.mp3'},
  {'icon': iconImage, 'title': 'Knowing Me Knowing You', 'file': '../../../../../../../../F:/MUSIK/ABBA/1992 - Abba Gold Greatest Hits/Knowing Me, Knowing You.mp3'},
  {'icon': iconImage, 'title': 'Lay All Your Love On Me', 'file': '../../../../../../../../F:/MUSIK/ABBA/1980 - Super Trouper/Lay All Your Love On Me.mp3'},
  {'icon': iconImage, 'title': 'Mamma Mia', 'file': '../../../../../../../../F:/MUSIK/ABBA/1975 - ABBA/Mamma Mia.mp3'},
  {'icon': iconImage, 'title': 'Mamma Mia', 'file': '../../../../../../../../F:/MUSIK/ABBA/1975 - ABBA/Mamma mia.asf'},
  {'icon': iconImage, 'title': 'Monday', 'file': '../../../../../../../../F:/MUSIK/ABBA/Monday.mp3'},
  {'icon': iconImage, 'title': 'Money Money Money', 'file': '../../../../../../../../F:/MUSIK/ABBA/1976 - Arrival/Money, Money, Money.mp3'},
  {'icon': iconImage, 'title': 'One Of Us', 'file': '../../../../../../../../F:/MUSIK/ABBA/1981 - The Visitors/One of Us.mp3'},
  {'icon': iconImage, 'title': 'Ring Ring', 'file': '../../../../../../../../F:/MUSIK/ABBA/1973 - Ring Ring/Ring Ring.mp3'},
  {'icon': iconImage, 'title': 'Sos', 'file': '../../../../../../../../F:/MUSIK/ABBA/1975 - ABBA/SOS.mp3'},
  {'icon': iconImage, 'title': 'Summer Night City', 'file': '../../../../../../../../F:/MUSIK/ABBA/1993 - More Abba Gold/Summer Night City.mp3'},
  {'icon': iconImage, 'title': 'Super Trouper', 'file': '../../../../../../../../F:/MUSIK/ABBA/1986 - Abba Live/Super Trouper.mp3'},
  {'icon': iconImage, 'title': 'Thank You For The Music', 'file': '../../../../../../../../F:/MUSIK/ABBA/1986 - Abba Live/Thank You For The Music.mp3'},
  {'icon': iconImage, 'title': 'The Winner Takes It All', 'file': '../../../../../../../../F:/MUSIK/ABBA/1980 - Super Trouper/The Winner Takes It All.mp3'},
  {'icon': iconImage, 'title': 'Voulez Vous', 'file': '../../../../../../../../F:/MUSIK/ABBA/1979 - Voulez-Vous/Voulez-Vous.mp3'},
  {'icon': iconImage, 'title': 'Waterloo', 'file': '../../../../../../../../F:/MUSIK/ABBA/1974 - Waterloo/Waterloo.mp3'},
]);
})

document.getElementById('akk').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '15 Rock Songs', 'file': '../../../../../../../../F:/MUSIK/Akk/15 ROCK SONGS.mp4'},
  {'icon': iconImage, 'title': '30 Риффов Арии ( Кипелов Маврин) Лучшая Подборка (guitar Cover)', 'file': '../../../../../../../../F:/MUSIK/Akk/30 риффов Арии (+Кипелов _ Маврин) - лучшая подборка (guitar cover).mp4'},
  {'icon': iconImage, 'title': '50 Rammstein Riffs(1)', 'file': '../../../../../../../../F:/MUSIK/Akk/50 RAMMSTEIN RIFFS(1).mp4'},
  {'icon': iconImage, 'title': 'Addio A Cheyene', 'file': '../../../../../../../../F:/MUSIK/Akk/Addio A Cheyene.mp4'},
  {'icon': iconImage, 'title': 'Ausländer Guitar Lesson W Tabs (720p 30fps H264 128kbit Aac)', 'file': '../../../../../../../../F:/MUSIK/Akk/Ausländer Guitar Lesson w_ TABS (720p_30fps_H264-128kbit_AAC).mp4'},
  {'icon': iconImage, 'title': 'Bad Liar (chords & Lyrics)', 'file': '../../../../../../../../F:/MUSIK/Akk/Bad Liar (chords & lyrics).mp4'},
  {'icon': iconImage, 'title': 'Bamboleo Elena Yerevan', 'file': '../../../../../../../../F:/MUSIK/Akk/Bamboleo ELENA _Yerevan.mp4'},
  {'icon': iconImage, 'title': 'Bamboleo Gipsy Kings Como Tocar No Tvcifras (candô)', 'file': '../../../../../../../../F:/MUSIK/Akk/Bamboleo - Gipsy Kings - Como Tocar no TVCifras (Candô).mp4'},
  {'icon': iconImage, 'title': 'Bamboleo Этот Гитарист Точно Вошел В Историю Голоса', 'file': '../../../../../../../../F:/MUSIK/Akk/Bamboleo Этот гитарист точно вошел в историю Голоса.mp4'},
  {'icon': iconImage, 'title': 'Behind Blue Eyes (the Who) Разбор Corus Guitar Guide #6', 'file': '../../../../../../../../F:/MUSIK/Akk/Behind Blue Eyes (The Who)   Разбор COrus Guitar Guide #6.mp4'},
  {'icon': iconImage, 'title': 'Birds On Guitaarr', 'file': '../../../../../../../../F:/MUSIK/Akk/Birds on Guitaarr.mp4'},
  {'icon': iconImage, 'title': 'California Dreamin Gabriella Quevedo', 'file': '../../../../../../../../F:/MUSIK/Akk/California Dreamin%27 - Gabriella Quevedo.mp4'},
  {'icon': iconImage, 'title': 'California Dreaming', 'file': '../../../../../../../../F:/MUSIK/Akk/California Dreaming.mp4'},
  {'icon': iconImage, 'title': 'Cancion Del Mariachi In Studio 2017 Dpr', 'file': '../../../../../../../../F:/MUSIK/Akk/Cancion Del Mariachi-IN STUDIO-2017 DPR.mp4'},
  {'icon': iconImage, 'title': 'Canción Del Mariachi Разбор Вступления На Гитаре', 'file': '../../../../../../../../F:/MUSIK/Akk/Canción Del Mariachi Разбор вступления на гитаре.mp4'},
  {'icon': iconImage, 'title': 'Check Yes Juliet By We The Kings (1080p 30fps H264 128kbit Aac)', 'file': '../../../../../../../../F:/MUSIK/Akk/Check Yes, Juliet By We The Kings (1080p_30fps_H264-128kbit_AAC).mp4'},
  {'icon': iconImage, 'title': 'Chi Mai', 'file': '../../../../../../../../F:/MUSIK/Akk/Chi Mai.mp4'},
  {'icon': iconImage, 'title': 'Children', 'file': '../../../../../../../../F:/MUSIK/Akk/Children.mp4'},
  {'icon': iconImage, 'title': 'Children (1280p 30fps H264 128kbit Aac)', 'file': '../../../../../../../../F:/MUSIK/Akk/Children (1280p_30fps_H264-128kbit_AAC).mp4'},
  {'icon': iconImage, 'title': 'Children (robert Miles) Part 1 (1080p 24fps H264 128kbit Aac)', 'file': '../../../../../../../../F:/MUSIK/Akk/Children (Robert Miles) - Part 1 (1080p_24fps_H264-128kbit_AAC).mp4'},
  {'icon': iconImage, 'title': 'Conquest Of Paradise Classical Guitar', 'file': '../../../../../../../../F:/MUSIK/Akk/Conquest of paradise- Classical Guitar.mp4'},
  {'icon': iconImage, 'title': 'Creep Fingerstyle Guitare', 'file': '../../../../../../../../F:/MUSIK/Akk/Creep FINGERSTYLE GUITARE.mp4'},
  {'icon': iconImage, 'title': 'Demons Fingerstyle Guitar Cover By James Bartholomew', 'file': '../../../../../../../../F:/MUSIK/Akk/Demons - Fingerstyle Guitar Cover By James Bartholomew.webm'},
  {'icon': iconImage, 'title': 'Dust In The Wind Gabriella Quevedo', 'file': '../../../../../../../../F:/MUSIK/Akk/Dust In The Wind - Gabriella Quevedo.mp4'},
  {'icon': iconImage, 'title': 'Dust In The Wind 🍃 Larissa Liveir Loves You All 🫶🔥🤘 #guitarcover #sologuitar #larissaliveir (1280p 30fps H264 128kbit Aac)', 'file': '../../../../../../../../F:/MUSIK/Akk/Dust in the wind 🍃 _ Larissa Liveir loves you all 🫶🔥🤘 #guitarcover #sologuitar #larissaliveir (1280p_30fps_H264-128kbit_AAC).mp4'},
  {'icon': iconImage, 'title': 'Ecstasy Of Gold Spanish Guitar Fingerstyle', 'file': '../../../../../../../../F:/MUSIK/Akk/ECSTASY OF GOLD - SPANISH GUITAR FINGERSTYLE.mp4'},
  {'icon': iconImage, 'title': 'Eleanor Rigby Acoustic Guitar Lesson Note Tabs', 'file': '../../../../../../../../F:/MUSIK/Akk/Eleanor Rigby  Acoustic guitar lesson note tabs.mp4'},
  {'icon': iconImage, 'title': 'Eleanor Rigby Guitar Lesson (easy)', 'file': '../../../../../../../../F:/MUSIK/Akk/Eleanor Rigby - Guitar Lesson (easy).mp4'},
  {'icon': iconImage, 'title': 'Elena Yerevan Белый Конь', 'file': '../../../../../../../../F:/MUSIK/Akk/Elena -Yerevan- Белый конь.mp4'},
  {'icon': iconImage, 'title': 'Elenayerevan Урокиигрынагитаре', 'file': '../../../../../../../../F:/MUSIK/Akk/elenayerevan урокиигрынагитаре.mp4'},
  {'icon': iconImage, 'title': 'Enjoy The Silence Guitar Lesson Depeche Mode', 'file': '../../../../../../../../F:/MUSIK/Akk/Enjoy the Silence Guitar Lesson - Depeche Mode.mp4'},
  {'icon': iconImage, 'title': 'Enter Sandman By Metallica Legendary Riff #1', 'file': '../../../../../../../../F:/MUSIK/Akk/Enter Sandman by Metallica - Legendary Riff #1.mp4'},
  {'icon': iconImage, 'title': 'Et Si Tu Nexistais Pas', 'file': '../../../../../../../../F:/MUSIK/Akk/Et Si Tu N%27existais Pas.mp4'},
  {'icon': iconImage, 'title': 'Forrest Gump Soundtrack', 'file': '../../../../../../../../F:/MUSIK/Akk/Forrest Gump Soundtrack.mp4'},
  {'icon': iconImage, 'title': 'Fragile 1 2 Intro Verse Sting How To Play Acoustic Tutorial', 'file': '../../../../../../../../F:/MUSIK/Akk/Fragile 1_2 - Intro_Verse - Sting - How to play_ Acoustic Tutorial.mp4'},
  {'icon': iconImage, 'title': 'Fragile 2 2 Chorus Sting How To Play Acoustic Tutorial', 'file': '../../../../../../../../F:/MUSIK/Akk/Fragile 2_2 - Chorus - Sting - How to play_ Acoustic Tutorial.mp4'},
  {'icon': iconImage, 'title': 'Godfather Le Parrain Tablature Fingerstyle Guitar', 'file': '../../../../../../../../F:/MUSIK/Akk/GODFATHER - LE PARRAIN - tablature - FINGERSTYLE GUITAR.mp4'},
  {'icon': iconImage, 'title': 'Help! Guitar Cover', 'file': '../../../../../../../../F:/MUSIK/Akk/Help! - Guitar Cover.mp4'},
  {'icon': iconImage, 'title': 'Help! Guitar Secrets', 'file': '../../../../../../../../F:/MUSIK/Akk/Help! Guitar Secrets.mp4'},
  {'icon': iconImage, 'title': 'Hero Of The Day By Metallica United We Tab', 'file': '../../../../../../../../F:/MUSIK/Akk/Hero of the Day by Metallica - United We Tab.mp4'},
  {'icon': iconImage, 'title': 'Hero Of The Day Guitar Lesson Metallica', 'file': '../../../../../../../../F:/MUSIK/Akk/Hero of the Day Guitar Lesson - Metallica.mp4'},
  {'icon': iconImage, 'title': 'Honor Him Guitar Fingerstyle', 'file': '../../../../../../../../F:/MUSIK/Akk/HONOR HIM - Guitar FingerStyle.mp4'},
  {'icon': iconImage, 'title': 'Hotel California Gabriella Quevedo', 'file': '../../../../../../../../F:/MUSIK/Akk/Hotel California - Gabriella Quevedo.mp4'},
  {'icon': iconImage, 'title': 'House Of The Rising Sun', 'file': '../../../../../../../../F:/MUSIK/Akk/House Of The Rising Sun.mp4'},
  {'icon': iconImage, 'title': 'Interstellar Theme (day One)', 'file': '../../../../../../../../F:/MUSIK/Akk/Interstellar Theme (Day One).webm'},
  {'icon': iconImage, 'title': 'Johnny B Goode Larissa Liveir (1080p 30fps H264 128kbit Aac)', 'file': '../../../../../../../../F:/MUSIK/Akk/Johnny B. Goode - Larissa Liveir (1080p_30fps_H264-128kbit_AAC).mp4'},
  {'icon': iconImage, 'title': 'Litaliano', 'file': '../../../../../../../../F:/MUSIK/Akk/L%27Italiano.mp4'},
  {'icon': iconImage, 'title': 'Lost On Youu', 'file': '../../../../../../../../F:/MUSIK/Akk/Lost on youu.mp4'},
  {'icon': iconImage, 'title': 'Low Mans Lyric Abridged Acoustic Metallica Cover', 'file': '../../../../../../../../F:/MUSIK/Akk/Low Man%27s Lyric - Abridged Acoustic Metallica Cover.mp4'},
  {'icon': iconImage, 'title': 'Maywood Pasadena Guitar (480p 30fps H264 128kbit Aac)', 'file': '../../../../../../../../F:/MUSIK/Akk/Maywood Pasadena Guitar (480p_30fps_H264-128kbit_AAC).mp4'},
  {'icon': iconImage, 'title': 'More Than You Know Guitar Chords (720p 25fps H264 192kbit Aac)', 'file': '../../../../../../../../F:/MUSIK/Akk/More Than You Know - Guitar Chords (720p_25fps_H264-192kbit_AAC).mp4'},
  {'icon': iconImage, 'title': 'My Heart Will Go On', 'file': '../../../../../../../../F:/MUSIK/Akk/My Heart Will Go On.mp4'},
  {'icon': iconImage, 'title': 'My Heart Will Go On Gabriella Quevedo', 'file': '../../../../../../../../F:/MUSIK/Akk/My Heart Will Go On - Gabriella Quevedo.mp4'},
  {'icon': iconImage, 'title': 'Nothing Else Matters Gabriella Quevedo', 'file': '../../../../../../../../F:/MUSIK/Akk/Nothing Else Matters - Gabriella Quevedo.mp4'},
  {'icon': iconImage, 'title': 'One Jasmine Jams Episode 4 Metallica', 'file': '../../../../../../../../F:/MUSIK/Akk/ONE - Jasmine Jams Episode 4 _ METALLICA.mp4'},
  {'icon': iconImage, 'title': 'One Metallica Cover Guitar Tab Lesson Tutorial', 'file': '../../../../../../../../F:/MUSIK/Akk/One Metallica Cover _ Guitar Tab _ Lesson _ Tutorial.mp4'},
  {'icon': iconImage, 'title': 'Parole Parole Elena Yerevan', 'file': '../../../../../../../../F:/MUSIK/Akk/Parole Parole ELENA _Yerevan.mp4'},
  {'icon': iconImage, 'title': 'Personal Jesus De Depeche Mode En Guitarra Acústica (hd) Tutorial Christianvib', 'file': '../../../../../../../../F:/MUSIK/Akk/Personal Jesus de Depeche Mode en Guitarra Acústica (HD) Tutorial - Christianvib.mp4'},
  {'icon': iconImage, 'title': 'Por Una Cabeza (carlos Gardel)', 'file': '../../../../../../../../F:/MUSIK/Akk/Por Una Cabeza (Carlos Gardel).mp4'},
  {'icon': iconImage, 'title': 'Por Una Cabeza (theme From The Scent Of A Woman) Guitar Arrangement By Nemanja Bogunovic', 'file': '../../../../../../../../F:/MUSIK/Akk/Por una Cabeza (theme from The Scent of a Woman) guitar arrangement by Nemanja Bogunovic.mp4'},
  {'icon': iconImage, 'title': 'Por Una Cabeza Scent Of A Woman Tango Guitar Cover', 'file': '../../../../../../../../F:/MUSIK/Akk/Por Una Cabeza - Scent of a woman tango. Guitar cover.mp4'},
  {'icon': iconImage, 'title': 'Send Me On My Way Rusted Root (lilos Wall Jemima Coulter Cover)', 'file': '../../../../../../../../F:/MUSIK/Akk/Send Me On My Way - Rusted Root (Lilo%27s Wall Jemima Coulter Cover).mp4'},
  {'icon': iconImage, 'title': 'Seven Nation Army Разбор', 'file': '../../../../../../../../F:/MUSIK/Akk/Seven Nation Army-Разбор.mp4'},
  {'icon': iconImage, 'title': 'Shape Of My Heart – Sting #sting#shapeofmyheart (1280p 30fps H264 128kbit Aac)', 'file': '../../../../../../../../F:/MUSIK/Akk/Shape of my heart – Sting #sting#shapeofmyheart (1280p_30fps_H264-128kbit_AAC).mp4'},
  {'icon': iconImage, 'title': 'Shape Of My Heart Тональность ( Fm# ) Как Играть На Гитаре Песню', 'file': '../../../../../../../../F:/MUSIK/Akk/Shape Of My Heart Тональность ( Fm# ) Как играть на гитаре песню.mp4'},
  {'icon': iconImage, 'title': 'Shine On You Crazy Diamond (cover With Tab)', 'file': '../../../../../../../../F:/MUSIK/Akk/Shine On You Crazy Diamond (Cover With Tab).mp4'},
  {'icon': iconImage, 'title': 'Summer Presto Guitar Cover', 'file': '../../../../../../../../F:/MUSIK/Akk/Summer Presto guitar cover.mp4'},
  {'icon': iconImage, 'title': 'The Battle Guitare Fingerstyle', 'file': '../../../../../../../../F:/MUSIK/Akk/THE BATTLE - Guitare FingerStyle.mp4'},
  {'icon': iconImage, 'title': 'The Lonely Shepherd Одинокий Пастух James Last', 'file': '../../../../../../../../F:/MUSIK/Akk/The Lonely Shepherd, Одинокий пастух - James Last.mp4'},
  {'icon': iconImage, 'title': 'The Thing That Should Not Be Guitar Lesson (full Song) Metallica', 'file': '../../../../../../../../F:/MUSIK/Akk/The Thing That Should Not Be - Guitar Lesson (FULL SONG) - Metallica.mp4'},
  {'icon': iconImage, 'title': 'The Unforgiven Metallica Fingerstyle', 'file': '../../../../../../../../F:/MUSIK/Akk/The Unforgiven - Metallica _ Fingerstyle.mp4'},
  {'icon': iconImage, 'title': 'The Unforgiven Metallica Fingerstyle На Гитаре Ноты Табы Разбор', 'file': '../../../../../../../../F:/MUSIK/Akk/The Unforgiven - Metallica _ Fingerstyle На гитаре _ Ноты Табы Разбор.mp4'},
  {'icon': iconImage, 'title': 'Tuto Godfather Le Parrain Tablature Fingerstyle Guitar', 'file': '../../../../../../../../F:/MUSIK/Akk/TUTO - GODFATHER - LE PARRAIN - tablature - FINGERSTYLE GUITAR.mp4'},
  {'icon': iconImage, 'title': 'Tuyo (live) September 26 2016', 'file': '../../../../../../../../F:/MUSIK/Akk/Tuyo (live) - September 26, 2016.mp4'},
  {'icon': iconImage, 'title': 'Tuyo (narcos Theme Song) Easy Piano Tutorial How To Play Tuyo On Piano', 'file': '../../../../../../../../F:/MUSIK/Akk/Tuyo (Narcos Theme Song) - EASY Piano Tutorial - How to play Tuyo on piano.mp4'},
  {'icon': iconImage, 'title': 'Tuyo Narcos Intro Song (live @le Guess Who 2018)', 'file': '../../../../../../../../F:/MUSIK/Akk/Tuyo - Narcos intro song (live @Le Guess Who 2018).webm'},
  {'icon': iconImage, 'title': 'Tuyo Sesc Pinheiros', 'file': '../../../../../../../../F:/MUSIK/Akk/Tuyo _ SESC Pinheiros.mp4'},
  {'icon': iconImage, 'title': 'Videoplayback', 'file': '../../../../../../../../F:/MUSIK/Akk/videoplayback.mp4'},
  {'icon': iconImage, 'title': 'Was Ich Liebe Guitar Lesson W Tabs (720p 30fps H264 128kbit Aac)', 'file': '../../../../../../../../F:/MUSIK/Akk/Was Ich Liebe Guitar Lesson w_ TABS (720p_30fps_H264-128kbit_AAC).mp4'},
  {'icon': iconImage, 'title': 'Welcome Home (sanitarium) (guitar Cover With Tab)', 'file': '../../../../../../../../F:/MUSIK/Akk/WELCOME HOME (SANITARIUM) (Guitar cover with TAB).mp4'},
  {'icon': iconImage, 'title': 'Welcome Home (sanitarium) Full Guitar Cover', 'file': '../../../../../../../../F:/MUSIK/Akk/Welcome Home (Sanitarium) FULL Guitar Cover.mp4'},
  {'icon': iconImage, 'title': 'Whatever It Takes Lyrics', 'file': '../../../../../../../../F:/MUSIK/Akk/Whatever It Takes - Lyrics.mp4'},
  {'icon': iconImage, 'title': 'Whatever It Takes Разбор На Гитаре Как Играть Аккорды', 'file': '../../../../../../../../F:/MUSIK/Akk/Whatever It Takes разбор на гитаре как играть аккорды.mp4'},
  {'icon': iconImage, 'title': 'While My Guitar Gently Weeps', 'file': '../../../../../../../../F:/MUSIK/Akk/While My Guitar Gently Weeps.mp4'},
  {'icon': iconImage, 'title': 'Yesterday Gabriella Quevedo', 'file': '../../../../../../../../F:/MUSIK/Akk/Yesterday - Gabriella Quevedo.mp4'},
  {'icon': iconImage, 'title': 'Ария', 'file': '../../../../../../../../F:/MUSIK/Akk/Ария.mp4'},
  {'icon': iconImage, 'title': 'Бережкарики А Иващенко (кавер)', 'file': '../../../../../../../../F:/MUSIK/Akk/Бережкарики, А.Иващенко (кавер).mp4'},
  {'icon': iconImage, 'title': 'Бременские Музыканты Бременские Музыканты', 'file': '../../../../../../../../F:/MUSIK/Akk/Бременские музыканты - Бременские музыканты.mp4'},
  {'icon': iconImage, 'title': 'Бременские Музыкантыбуратино Ну Погоди Garri Pat', 'file': '../../../../../../../../F:/MUSIK/Akk/Бременские Музыканты,Буратино- %27Ну Погоди%27 , Garri Pat.mp4'},
  {'icon': iconImage, 'title': 'Вальс Из К Ф Мой Ласковый И Нежный Зверь Fingerstyle Cover', 'file': '../../../../../../../../F:/MUSIK/Akk/Вальс из к_ф %27Мой ласковый и нежный зверь%27 _ Fingerstyle cover.mp4'},
  {'icon': iconImage, 'title': 'Вальс Из К Ф Мой Ласковый И Нежный Зверь На Гитаре Разбор Ноты Табы', 'file': '../../../../../../../../F:/MUSIK/Akk/Вальс из к_ф %27Мой ласковый и нежный зверь%27 _ На гитаре + разбор _ Ноты Табы.mp4'},
  {'icon': iconImage, 'title': 'Ваше Благородие ♫ Разбор Аккорды ♫ Как Играть На Гитаре Уроки Игры !', 'file': '../../../../../../../../F:/MUSIK/Akk/Ваше благородие ♫ РАЗБОР АККОРДЫ ♫ Как играть на гитаре - уроки игры !.webm'},
  {'icon': iconImage, 'title': 'Гже Же Ты Разбор Соло Тональность ( Dm ) Как Играть На Гитаре Песню', 'file': '../../../../../../../../F:/MUSIK/Akk/Гже же ты - РАЗБОР СОЛО - Тональность ( Dm ) Как играть на гитаре песню.mp4'},
  {'icon': iconImage, 'title': 'Гори Огонь Гори', 'file': '../../../../../../../../F:/MUSIK/Akk/гори огонь гори.mp4'},
  {'icon': iconImage, 'title': 'Гудбай Америка', 'file': '../../../../../../../../F:/MUSIK/Akk/Гудбай, Америка.mp4'},
  {'icon': iconImage, 'title': 'Если Б Не Было Тебя Соло На Гитаре(разбор) Тональность ( Нm )', 'file': '../../../../../../../../F:/MUSIK/Akk/Если б не было тебя - Соло на гитаре(разбор) Тональность ( Нm ).mp4'},
  {'icon': iconImage, 'title': 'Жмурки На Гитаре Из Фильма', 'file': '../../../../../../../../F:/MUSIK/Akk/Жмурки - на гитаре из фильма.mp4'},
  {'icon': iconImage, 'title': 'Иерусалим Разбор Вступления И Бой На Гитаре', 'file': '../../../../../../../../F:/MUSIK/Akk/Иерусалим - Разбор Вступления и Бой на гитаре.mp4'},
  {'icon': iconImage, 'title': 'Кончится Лето2', 'file': '../../../../../../../../F:/MUSIK/Akk/Кончится лето2.mp4'},
  {'icon': iconImage, 'title': 'Конь Тональность (hm) Песни Под Гитару', 'file': '../../../../../../../../F:/MUSIK/Akk/Конь Тональность (Hm) Песни под гитару.mp4'},
  {'icon': iconImage, 'title': 'Корабли', 'file': '../../../../../../../../F:/MUSIK/Akk/Корабли.mp4'},
  {'icon': iconImage, 'title': 'Кровь За Кровь(ария) Фрагмент 2020', 'file': '../../../../../../../../F:/MUSIK/Akk/Кровь за кровь%27(Ария). Фрагмент. 2020.mp4'},
  {'icon': iconImage, 'title': 'Легенда (1988)', 'file': '../../../../../../../../F:/MUSIK/Akk/Легенда (1988).mp4'},
  {'icon': iconImage, 'title': 'Мексиканский Бой На Гитаре', 'file': '../../../../../../../../F:/MUSIK/Akk/Мексиканский Бой на гитаре.mp4'},
  {'icon': iconImage, 'title': 'Мой Рок Н Ролл Разбор Corus Guitar Guide #77', 'file': '../../../../../../../../F:/MUSIK/Akk/Мой рок-н-ролл - Разбор COrus Guitar Guide #77.webm'},
  {'icon': iconImage, 'title': 'Непогода Песня Из К Ф Мэри Поппинс До Свидания Как Играть На Гитаре Песню', 'file': '../../../../../../../../F:/MUSIK/Akk/Непогода - Песня из к_ф Мэри Поппинс, до свидания - Как играть на гитаре песню.mp4'},
  {'icon': iconImage, 'title': 'Ночная Дорога Ст Ю Визбор Муз С Никитин И В Берковский', 'file': '../../../../../../../../F:/MUSIK/Akk/Ночная дорога - ст. Ю.Визбор, муз. С.Никитин и В.Берковский.mp4'},
  {'icon': iconImage, 'title': 'Она', 'file': '../../../../../../../../F:/MUSIK/Akk/Она.mp4'},
  {'icon': iconImage, 'title': 'От Винта', 'file': '../../../../../../../../F:/MUSIK/Akk/ОТ ВИНТА.mp4'},
  {'icon': iconImage, 'title': 'От Кореи До Карелии Акк', 'file': '../../../../../../../../F:/MUSIK/Akk/От Кореи до Карелии аКК.mp4'},
  {'icon': iconImage, 'title': 'Охота На Волков Аккорды Высоцкого', 'file': '../../../../../../../../F:/MUSIK/Akk/Охота на волков. Аккорды Высоцкого.mp4'},
  {'icon': iconImage, 'title': 'Переведи Меня Через Майдан', 'file': '../../../../../../../../F:/MUSIK/Akk/Переведи меня через майдан.mp4'},
  {'icon': iconImage, 'title': 'Переведи Меня Через Майдан Тональность ( Еm ) Как Играть На Гитаре Песню', 'file': '../../../../../../../../F:/MUSIK/Akk/Переведи меня через майдан Тональность ( Еm ) Как играть на гитаре песню.mp4'},
  {'icon': iconImage, 'title': 'Перемен Кино (аккорды На Гитаре) Играй Как Бенедикт! Выпуск №68', 'file': '../../../../../../../../F:/MUSIK/Akk/ПЕРЕМЕН - КИНО (аккорды на гитаре) Играй, как Бенедикт! Выпуск №68.webm'},
  {'icon': iconImage, 'title': 'Песня Красной Шапочки(бегемотыкрокодилы) Guitar Cover Garri Pat', 'file': '../../../../../../../../F:/MUSIK/Akk/Песня красной шапочки(Бегемоты,Крокодилы)- guitar Cover Garri Pat.mp4'},
  {'icon': iconImage, 'title': 'Песня Налётчиков', 'file': '../../../../../../../../F:/MUSIK/Akk/Песня налётчиков.mp4'},
  {'icon': iconImage, 'title': 'Под Музыку Вивальди', 'file': '../../../../../../../../F:/MUSIK/Akk/Под музыку Вивальди.mp4'},
  {'icon': iconImage, 'title': 'Пока Горит Свеча А Макаревич (cover)', 'file': '../../../../../../../../F:/MUSIK/Akk/Пока горит свеча А. Макаревич (cover).mp4'},
  {'icon': iconImage, 'title': 'Полковнику Никто Не Пишет Тональность ( Gm ) Как Играть На Гитаре Песню', 'file': '../../../../../../../../F:/MUSIK/Akk/Полковнику никто не пишет Тональность ( Gm ) Как играть на гитаре песню.mp4'},
  {'icon': iconImage, 'title': 'Последняя Поэма', 'file': '../../../../../../../../F:/MUSIK/Akk/Последняя поэма.mp4'},
  {'icon': iconImage, 'title': 'Последняя Поэма Из К Ф Вам И Не Снилось Fingerstyle Cover', 'file': '../../../../../../../../F:/MUSIK/Akk/Последняя поэма из к_ф %27Вам и не снилось%27 _ Fingerstyle cover.mp4'},
  {'icon': iconImage, 'title': 'Послепобедный Вальс А Я Розенбаум', 'file': '../../../../../../../../F:/MUSIK/Akk/Послепобедный вальс  А.Я. Розенбаум.mp4'},
  {'icon': iconImage, 'title': 'Послепобедный Вальс А Я Розенбаум', 'file': '../../../../../../../../F:/MUSIK/Akk/Послепобедный вальс - А.Я. Розенбаум.mp4'},
  {'icon': iconImage, 'title': 'Просто Взорвал Интернет Самая Сложная Песня На Гитаре!', 'file': '../../../../../../../../F:/MUSIK/Akk/Просто взорвал интернет самая сложная песня на гитаре!.mp4'},
  {'icon': iconImage, 'title': 'Расстреляли Рассветами', 'file': '../../../../../../../../F:/MUSIK/Akk/Расстреляли рассветами.mp4'},
  {'icon': iconImage, 'title': 'Сказка', 'file': '../../../../../../../../F:/MUSIK/Akk/Сказка.mp4'},
  {'icon': iconImage, 'title': 'Скромный Настройщик Самоучка В Магазине Музыкальных Инструментов', 'file': '../../../../../../../../F:/MUSIK/Akk/Скромный настройщик-самоучка в магазине музыкальных инструментов.webm'},
  {'icon': iconImage, 'title': 'Следствие Ведут Колобки Fingerstyle Cover', 'file': '../../../../../../../../F:/MUSIK/Akk/Следствие ведут Колобки _ Fingerstyle cover.mp4'},
  {'icon': iconImage, 'title': 'Следствие Ведут Колобки Guitar Cover Garri Pat', 'file': '../../../../../../../../F:/MUSIK/Akk/Следствие ведут КОЛОБКИ- guitar Cover Garri Pat.mp4'},
  {'icon': iconImage, 'title': 'Спокойная Ночь', 'file': '../../../../../../../../F:/MUSIK/Akk/Спокойная ночь.mp4'},
  {'icon': iconImage, 'title': 'Три Лучших Гитариста В Мире 2012 Года', 'file': '../../../../../../../../F:/MUSIK/Akk/Три лучших гитариста в мире 2012 года.mp4'},
  {'icon': iconImage, 'title': 'Человек И Кошка Гитара', 'file': '../../../../../../../../F:/MUSIK/Akk/Человек и кошка. Гитара.mp4'},
  {'icon': iconImage, 'title': 'Человек И Кошка Ноль Как Играть На Гитаре (3 Партии) Табы Аккорды Гитарин', 'file': '../../../../../../../../F:/MUSIK/Akk/Человек и кошка - НОЛЬ   Как играть на гитаре (3 партии)  Табы, аккорды - Гитарин.mp4'},
  {'icon': iconImage, 'title': 'Чтоб Ветра Тебя Сынок Знали(разборка) А Я Розенбаум', 'file': '../../../../../../../../F:/MUSIK/Akk/Чтоб ветра тебя сынок знали(разборка), А.Я. Розенбаум.webm'},
  {'icon': iconImage, 'title': 'Это Витя Придумал Кино (720p 30fps H264 192kbit Aac)', 'file': '../../../../../../../../F:/MUSIK/Akk/Это Витя придумал_Кино (720p_30fps_H264-192kbit_AAC).mp4'},
  {'icon': iconImage, 'title': 'Я Свободен Соло На Электрогитаре', 'file': '../../../../../../../../F:/MUSIK/Akk/Я СВОБОДЕН соло на электрогитаре.mp4'},
]);
})

document.getElementById('akvarium').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Finalis Jutto', 'file': '../../../../../../../../F:/MUSIK/Akvarium/1997 - Рапсодия для воды/Finalis Jutto.mp3'},
  {'icon': iconImage, 'title': 'Город', 'file': '../../../../../../../../F:/MUSIK/Akvarium/2003 - БГ 50/Город.mp3'},
  {'icon': iconImage, 'title': 'Здравствуй Моя Смерть', 'file': '../../../../../../../../F:/MUSIK/Akvarium/1984 - День серебра/Здравствуй моя Смерть.mp3'},
  {'icon': iconImage, 'title': 'Лейса Песня На Просторе', 'file': '../../../../../../../../F:/MUSIK/Akvarium/1996 - Двадцать лет спустя/Лейса песня на просторе.mp3'},
  {'icon': iconImage, 'title': 'Не Пей Вина Гертруда', 'file': '../../../../../../../../F:/MUSIK/Akvarium/2000 - Территория/Не Пей Вина Гертруда.mp3'},
  {'icon': iconImage, 'title': 'Пока Горит Свеча', 'file': '../../../../../../../../F:/MUSIK/Akvarium/1996 - Двадцать лет спустя/Пока горит свеча.mp3'},
  {'icon': iconImage, 'title': 'Русская Нирвана', 'file': '../../../../../../../../F:/MUSIK/Akvarium/1994 - КОСТРОМА MON AMOUR/Русская Нирвана.mp3'},
  {'icon': iconImage, 'title': 'Серебро Господа', 'file': '../../../../../../../../F:/MUSIK/Akvarium/1997 - Рапсодия для воды/Серебро Господа.mp3'},
  {'icon': iconImage, 'title': 'Электричество', 'file': '../../../../../../../../F:/MUSIK/Akvarium/1984 - День серебра/Электричество.mp3'},
]);
})

document.getElementById('alla').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Can No Laditi', 'file': '../../../../../../../../F:/MUSIK/ALLA/Не делайте мне больно, господа/Can No Laditi.mp3'},
  {'icon': iconImage, 'title': 'А Знаешь Все Еще Будет', 'file': '../../../../../../../../F:/MUSIK/ALLA/На дороге ожиданий/А знаешь, все еще будет.WAV'},
  {'icon': iconImage, 'title': 'А Я В Воду Войду', 'file': '../../../../../../../../F:/MUSIK/ALLA/Да!/А я в воду войду.WAV'},
  {'icon': iconImage, 'title': 'Автомобиль', 'file': '../../../../../../../../F:/MUSIK/ALLA/Ах, как хочется жить!/Автомобиль.WAV'},
  {'icon': iconImage, 'title': 'Айсберг', 'file': '../../../../../../../../F:/MUSIK/ALLA/По острым иглам яркого огня/Айсберг.WAV'},
  {'icon': iconImage, 'title': 'Арлекино', 'file': '../../../../../../../../F:/MUSIK/ALLA/По острым иглам яркого огня/Арлекино.mp3'},
  {'icon': iconImage, 'title': 'Ах Как Живется Мне Сегодня!', 'file': '../../../../../../../../F:/MUSIK/ALLA/Не делайте мне больно, господа/Ах, как живется мне сегодня!.mp3'},
  {'icon': iconImage, 'title': 'Балет', 'file': '../../../../../../../../F:/MUSIK/ALLA/На дороге ожиданий/Балет.WAV'},
  {'icon': iconImage, 'title': 'Бежала Голову Сломя', 'file': '../../../../../../../../F:/MUSIK/ALLA/Не делайте мне больно, господа/Бежала голову сломя.mp3'},
  {'icon': iconImage, 'title': 'Без Меня', 'file': '../../../../../../../../F:/MUSIK/ALLA/По острым иглам яркого огня/Без меня.WAV'},
  {'icon': iconImage, 'title': 'Бессонница', 'file': '../../../../../../../../F:/MUSIK/ALLA/Не делайте мне больно, господа/Бессонница.mp3'},
  {'icon': iconImage, 'title': 'Близкие Люди', 'file': '../../../../../../../../F:/MUSIK/ALLA/Билет на вчерашний спектакль/Близкие люди.WAV'},
  {'icon': iconImage, 'title': 'Бог С Тобой', 'file': '../../../../../../../../F:/MUSIK/ALLA/Встречи в пути/Бог с тобой.WAV'},
  {'icon': iconImage, 'title': 'Большак', 'file': '../../../../../../../../F:/MUSIK/ALLA/Не делайте мне больно, господа/Большак.mp3'},
  {'icon': iconImage, 'title': 'В Петербурге Гроза', 'file': '../../../../../../../../F:/MUSIK/ALLA/Да!/В Петербурге гроза.WAV'},
  {'icon': iconImage, 'title': 'Волшебник', 'file': '../../../../../../../../F:/MUSIK/ALLA/По острым иглам яркого огня/Волшебник.WAV'},
  {'icon': iconImage, 'title': 'Все Могут Короли', 'file': '../../../../../../../../F:/MUSIK/ALLA/По острым иглам яркого огня/Все могут короли.WAV'},
  {'icon': iconImage, 'title': 'Встреча В Пути', 'file': '../../../../../../../../F:/MUSIK/ALLA/Встречи в пути/Встреча в пути.WAV'},
  {'icon': iconImage, 'title': 'Голубь Сизокрылый', 'file': '../../../../../../../../F:/MUSIK/ALLA/Встречи в пути/Голубь сизокрылый.WAV'},
  {'icon': iconImage, 'title': 'Гонка', 'file': '../../../../../../../../F:/MUSIK/ALLA/Только в кино/Гонка.WAV'},
  {'icon': iconImage, 'title': 'Грабитель', 'file': '../../../../../../../../F:/MUSIK/ALLA/Не делайте мне больно, господа/Грабитель.mp3'},
  {'icon': iconImage, 'title': 'Две Звезды', 'file': '../../../../../../../../F:/MUSIK/ALLA/Билет на вчерашний спектакль/Две звезды.WAV'},
  {'icon': iconImage, 'title': 'Две Рюмки', 'file': '../../../../../../../../F:/MUSIK/ALLA/Не делайте мне больно, господа/Две рюмки.mp3'},
  {'icon': iconImage, 'title': 'Делу Время', 'file': '../../../../../../../../F:/MUSIK/ALLA/По острым иглам яркого огня/Делу время.WAV'},
  {'icon': iconImage, 'title': 'И Зимой И Летом', 'file': '../../../../../../../../F:/MUSIK/ALLA/Ах, как хочется жить!/И зимой и летом.mp3'},
  {'icon': iconImage, 'title': 'Как Тревожен Этот Путь', 'file': '../../../../../../../../F:/MUSIK/ALLA/И в этом вся моя печаль/Как тревожен этот путь.WAV'},
  {'icon': iconImage, 'title': 'Когда Я Буду Бабушкой', 'file': '../../../../../../../../F:/MUSIK/ALLA/Песни на бис/Когда я буду бабушкой.WAV'},
  {'icon': iconImage, 'title': 'Колдун', 'file': '../../../../../../../../F:/MUSIK/ALLA/Не делайте мне больно, господа/Колдун.mp3'},
  {'icon': iconImage, 'title': 'Коралловые Бусы', 'file': '../../../../../../../../F:/MUSIK/ALLA/На дороге ожиданий/Коралловые бусы.WAV'},
  {'icon': iconImage, 'title': 'Королева', 'file': '../../../../../../../../F:/MUSIK/ALLA/Размышления у камина/Королева.WAV'},
  {'icon': iconImage, 'title': 'Куда Все Уходят', 'file': '../../../../../../../../F:/MUSIK/ALLA/Не делайте мне больно, господа/Куда все уходят.mp3'},
  {'icon': iconImage, 'title': 'Любовь Похожая На Сон', 'file': '../../../../../../../../F:/MUSIK/ALLA/Не делайте мне больно, господа/Любовь, похожая на сон.mp3'},
  {'icon': iconImage, 'title': 'Мал Помалу', 'file': '../../../../../../../../F:/MUSIK/ALLA/Да!/Мал-помалу.WAV'},
  {'icon': iconImage, 'title': 'Между Небом И Землей', 'file': '../../../../../../../../F:/MUSIK/ALLA/Встречи в пути/Между небом и землей.WAV'},
  {'icon': iconImage, 'title': 'Миллион Алых Роз', 'file': '../../../../../../../../F:/MUSIK/ALLA/По острым иглам яркого огня/Миллион алых роз.WAV'},
  {'icon': iconImage, 'title': 'Милый Мой', 'file': '../../../../../../../../F:/MUSIK/ALLA/Ах, как хочется жить!/Милый мой.WAV'},
  {'icon': iconImage, 'title': 'Мимоходом', 'file': '../../../../../../../../F:/MUSIK/ALLA/Это завтра, а сегодня/Мимоходом.WAV'},
  {'icon': iconImage, 'title': 'Мэри', 'file': '../../../../../../../../F:/MUSIK/ALLA/Не делайте мне больно, господа/Мэри.mp3'},
  {'icon': iconImage, 'title': 'Надо Же', 'file': '../../../../../../../../F:/MUSIK/ALLA/Билет на вчерашний спектакль/Надо же.WAV'},
  {'icon': iconImage, 'title': 'Настоящий Полковник', 'file': '../../../../../../../../F:/MUSIK/ALLA/Не делайте мне больно, господа/Настоящий полковник.mp3'},
  {'icon': iconImage, 'title': 'Не Делайте Мне Больно Господа', 'file': '../../../../../../../../F:/MUSIK/ALLA/Не делайте мне больно, господа/Не делайте мне больно, господа.mp3'},
  {'icon': iconImage, 'title': 'Не Отрекаются Любя', 'file': '../../../../../../../../F:/MUSIK/ALLA/По острым иглам яркого огня/Не отрекаются любя.WAV'},
  {'icon': iconImage, 'title': 'Непогода', 'file': '../../../../../../../../F:/MUSIK/ALLA/Непогода.mp3'},
  {'icon': iconImage, 'title': 'Непогода', 'file': '../../../../../../../../F:/MUSIK/ALLA/Непогода.mp4'},
  {'icon': iconImage, 'title': 'О Любви Не Говори', 'file': '../../../../../../../../F:/MUSIK/ALLA/Только в кино/О любви не говори.WAV'},
  {'icon': iconImage, 'title': 'Озеро Надежды', 'file': '../../../../../../../../F:/MUSIK/ALLA/Встречи в пути/Озеро надежды.WAV'},
  {'icon': iconImage, 'title': 'Осенний Поцелуй', 'file': '../../../../../../../../F:/MUSIK/ALLA/Размышления у камина/Осенний поцелуй.WAV'},
  {'icon': iconImage, 'title': 'Паромщик', 'file': '../../../../../../../../F:/MUSIK/ALLA/По острым иглам яркого огня/Паромщик.WAV'},
  {'icon': iconImage, 'title': 'Песенка Первоклассника', 'file': '../../../../../../../../F:/MUSIK/ALLA/По острым иглам яркого огня/Песенка первоклассника.WAV'},
  {'icon': iconImage, 'title': 'Песенка Про Меня', 'file': '../../../../../../../../F:/MUSIK/ALLA/По острым иглам яркого огня/Песенка про меня.WAV'},
  {'icon': iconImage, 'title': 'Позови Меня С Собой', 'file': '../../../../../../../../F:/MUSIK/ALLA/Да!/Позови меня с собой.WAV'},
  {'icon': iconImage, 'title': 'Пригласите Танцевать', 'file': '../../../../../../../../F:/MUSIK/ALLA/Встречи в пути/Пригласите танцевать.WAV'},
  {'icon': iconImage, 'title': 'Придумай Что Нибудь', 'file': '../../../../../../../../F:/MUSIK/ALLA/Встречи в пути/Придумай что-нибудь.WAV'},
  {'icon': iconImage, 'title': 'Примадонна', 'file': '../../../../../../../../F:/MUSIK/ALLA/Да!/Примадонна.WAV'},
  {'icon': iconImage, 'title': 'Примадонна (фрн )', 'file': '../../../../../../../../F:/MUSIK/ALLA/Да!/Примадонна (фрн.).WAV'},
  {'icon': iconImage, 'title': 'Пришла И Говорю', 'file': '../../../../../../../../F:/MUSIK/ALLA/Только в кино/Пришла и говорю.WAV'},
  {'icon': iconImage, 'title': 'Про Любовь', 'file': '../../../../../../../../F:/MUSIK/ALLA/Барышня с крестьянской заставы/Про любовь.WAV'},
  {'icon': iconImage, 'title': 'Пропади Ты Пропадом', 'file': '../../../../../../../../F:/MUSIK/ALLA/Размышления у камина/Пропади ты пропадом.WAV'},
  {'icon': iconImage, 'title': 'Прости Поверь', 'file': '../../../../../../../../F:/MUSIK/ALLA/И в этом вся моя печаль/Прости, поверь.WAV'},
  {'icon': iconImage, 'title': 'Реквием', 'file': '../../../../../../../../F:/MUSIK/ALLA/Размышления у камина/Реквием.WAV'},
  {'icon': iconImage, 'title': 'Свирель', 'file': '../../../../../../../../F:/MUSIK/ALLA/Размышления у камина/Свирель.WAV'},
  {'icon': iconImage, 'title': 'Сильная Женщина', 'file': '../../../../../../../../F:/MUSIK/ALLA/Не делайте мне больно, господа/Сильная женщина.mp3'},
  {'icon': iconImage, 'title': 'Старинные Часы', 'file': '../../../../../../../../F:/MUSIK/ALLA/По острым иглам яркого огня/Старинные часы.WAV'},
  {'icon': iconImage, 'title': 'Сто Друзей', 'file': '../../../../../../../../F:/MUSIK/ALLA/Это завтра, а сегодня/Сто друзей.WAV'},
  {'icon': iconImage, 'title': 'Счастье', 'file': '../../../../../../../../F:/MUSIK/ALLA/Да!/Счастье.WAV'},
  {'icon': iconImage, 'title': 'Так Иди Же Сюда', 'file': '../../../../../../../../F:/MUSIK/ALLA/Не делайте мне больно, господа/Так иди же сюда.mp3'},
  {'icon': iconImage, 'title': 'Три Счастливых Дня', 'file': '../../../../../../../../F:/MUSIK/ALLA/Встречи в пути/Три счастливых дня.WAV'},
  {'icon': iconImage, 'title': 'Ты На Свете Есть', 'file': '../../../../../../../../F:/MUSIK/ALLA/На дороге ожиданий/Ты на свете есть.WAV'},
  {'icon': iconImage, 'title': 'Фотограф', 'file': '../../../../../../../../F:/MUSIK/ALLA/Встречи в пути/Фотограф.WAV'},
  {'icon': iconImage, 'title': 'Чао', 'file': '../../../../../../../../F:/MUSIK/ALLA/Билет на вчерашний спектакль/Чао.WAV'},
  {'icon': iconImage, 'title': 'Этот Мир', 'file': '../../../../../../../../F:/MUSIK/ALLA/Ах, как хочется жить!/Этот мир.mp3'},
  {'icon': iconImage, 'title': 'Я Больше Не Ревную', 'file': '../../../../../../../../F:/MUSIK/ALLA/И в этом вся моя печаль/Я больше не ревную.WAV'},
  {'icon': iconImage, 'title': 'Я Тебя Никому Не Отдам', 'file': '../../../../../../../../F:/MUSIK/ALLA/Не делайте мне больно, господа/Я тебя никому не отдам.mp3'},
  {'icon': iconImage, 'title': 'Я Тебя Поцеловала', 'file': '../../../../../../../../F:/MUSIK/ALLA/Это завтра, а сегодня/Я тебя поцеловала.WAV'},
]);
})

document.getElementById('aqua').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Barbie Girl', 'file': '../../../../../../../../F:/MUSIK/Aqua/Barbie girl.mp3'},
  {'icon': iconImage, 'title': 'Cartoon Heroes', 'file': '../../../../../../../../F:/MUSIK/Aqua/Cartoon heroes.mp3'},
  {'icon': iconImage, 'title': 'My Oh My', 'file': '../../../../../../../../F:/MUSIK/Aqua/My oh my.mp3'},
  {'icon': iconImage, 'title': 'Turn Back Time', 'file': '../../../../../../../../F:/MUSIK/Aqua/Turn Back Time.mp3'},
]);
})

document.getElementById('avrillavign').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Complicated', 'file': '../../../../../../../../F:/MUSIK/Avril Lavign/2002 - Complicated/Complicated.mp3'},
  {'icon': iconImage, 'title': 'Dont Tell Me', 'file': '../../../../../../../../F:/MUSIK/Avril Lavign/2004 - Don%27t Tell Me/Don%27t Tell Me.mp3'},
  {'icon': iconImage, 'title': 'Get Over It', 'file': '../../../../../../../../F:/MUSIK/Avril Lavign/2002 - Sk8er Boi/Get Over It.mp3'},
  {'icon': iconImage, 'title': 'Girlfriend', 'file': '../../../../../../../../F:/MUSIK/Avril Lavign/2007 - Girlfriend/Girlfriend.mp3'},
  {'icon': iconImage, 'title': 'He Wasnt (live)', 'file': '../../../../../../../../F:/MUSIK/Avril Lavign/2004 - Under My Skin/He Wasn%27t (Live).mp3'},
  {'icon': iconImage, 'title': 'I Always Get What I Want', 'file': '../../../../../../../../F:/MUSIK/Avril Lavign/2004 - Nobody%27s Home/I Always Get What I Want.mp3'},
  {'icon': iconImage, 'title': 'Im With You', 'file': '../../../../../../../../F:/MUSIK/Avril Lavign/2002 - I%27m With You/I%27m With You.mp3'},
  {'icon': iconImage, 'title': 'Imagine', 'file': '../../../../../../../../F:/MUSIK/Avril Lavign/2009 - iTunes Essentials/Imagine.mp3'},
  {'icon': iconImage, 'title': 'Keep Holding On', 'file': '../../../../../../../../F:/MUSIK/Avril Lavign/2006 - Keep Holding On/Keep Holding On.mp3'},
  {'icon': iconImage, 'title': 'Knockin On Heavens Door', 'file': '../../../../../../../../F:/MUSIK/Avril Lavign/2004 - Nobody%27s Home/Knockin%27  On  Heaven%27s Door.mp3'},
  {'icon': iconImage, 'title': 'Losing Grip', 'file': '../../../../../../../../F:/MUSIK/Avril Lavign/2002 - Let Go/Losing Grip.mp3'},
  {'icon': iconImage, 'title': 'Losing Grip (live)', 'file': '../../../../../../../../F:/MUSIK/Avril Lavign/2002 - Let Go/Losing Grip (Live).mp3'},
  {'icon': iconImage, 'title': 'My Happy Ending', 'file': '../../../../../../../../F:/MUSIK/Avril Lavign/2004 - My Happy Ending/My Happy Ending.mp3'},
  {'icon': iconImage, 'title': 'Nobodys Home', 'file': '../../../../../../../../F:/MUSIK/Avril Lavign/2004 - Nobody%27s Home/Nobody%27s Home.mp3'},
  {'icon': iconImage, 'title': 'Skater Boy', 'file': '../../../../../../../../F:/MUSIK/Avril Lavign/2002 - Sk8er Boi/Skater Boy.mp3'},
  {'icon': iconImage, 'title': 'Take Me Away', 'file': '../../../../../../../../F:/MUSIK/Avril Lavign/2004 - Don%27t Tell Me/Take Me Away.mp3'},
  {'icon': iconImage, 'title': 'Things Ill Never Say', 'file': '../../../../../../../../F:/MUSIK/Avril Lavign/2009 - iTunes Essentials/Things I%27ll Never Say.mp3'},
  {'icon': iconImage, 'title': 'When Youre Gone', 'file': '../../../../../../../../F:/MUSIK/Avril Lavign/2007 - When You%27re Gone/When You%27re Gone.mp3'},
  {'icon': iconImage, 'title': 'Why', 'file': '../../../../../../../../F:/MUSIK/Avril Lavign/2002 - Complicated/Why.mp3'},
  {'icon': iconImage, 'title': 'Wish You Were Here', 'file': '../../../../../../../../F:/MUSIK/Avril Lavign/Wish You Were Here.webm'},
]);
})

document.getElementById('beatles').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '010 The Beatles Hey Jude', 'file': '../../../../../../../../F:/MUSIK/Beatles/010 THE BEATLES-HEY JUDE.MP3'},
  {'icon': iconImage, 'title': 'A Hard Days Night', 'file': '../../../../../../../../F:/MUSIK/Beatles/1964 - A Hard Days Night/A Hard Day%27s Night.mp3'},
  {'icon': iconImage, 'title': 'All My Loving', 'file': '../../../../../../../../F:/MUSIK/Beatles/1963 - With The Beatles/All My Loving.mp3'},
  {'icon': iconImage, 'title': 'All You Need Is Love', 'file': '../../../../../../../../F:/MUSIK/Beatles/1967 - Magical Mystery Tour/All You Need Is Love.mp3'},
  {'icon': iconImage, 'title': 'Another Girl', 'file': '../../../../../../../../F:/MUSIK/Beatles/1965 - Help/Another Girl.mp3'},
  {'icon': iconImage, 'title': 'Any Time At All', 'file': '../../../../../../../../F:/MUSIK/Beatles/1964 - A Hard Days Night/Any Time At All.mp3'},
  {'icon': iconImage, 'title': 'Babys In Black', 'file': '../../../../../../../../F:/MUSIK/Beatles/1964 - Beatles For Sale/Baby%27s In Black.mp3'},
  {'icon': iconImage, 'title': 'Back In The Ussr', 'file': '../../../../../../../../F:/MUSIK/Beatles/1968 - White Album CD 1/Back in the USSR.mp3'},
  {'icon': iconImage, 'title': 'Cant Buy Me Love', 'file': '../../../../../../../../F:/MUSIK/Beatles/1964 - A Hard Days Night/Can%27t Buy Me Love.mp3'},
  {'icon': iconImage, 'title': 'Carry That Weight', 'file': '../../../../../../../../F:/MUSIK/Beatles/1969 - Abbey Road/Carry That Weight.mp3'},
  {'icon': iconImage, 'title': 'Devil In Her Heart', 'file': '../../../../../../../../F:/MUSIK/Beatles/1963 - With The Beatles/Devil In Her Heart.mp3'},
  {'icon': iconImage, 'title': 'Dizzy Miss Lizzie', 'file': '../../../../../../../../F:/MUSIK/Beatles/1965 - Help/Dizzy Miss Lizzie.mp3'},
  {'icon': iconImage, 'title': 'Do You Want To Know A Secret', 'file': '../../../../../../../../F:/MUSIK/Beatles/1963 - Please Please Me/Do You Want To Know A Secret.mp3'},
  {'icon': iconImage, 'title': 'Drive My Car', 'file': '../../../../../../../../F:/MUSIK/Beatles/1965 - Rubber Soul/Drive My Car.mp3'},
  {'icon': iconImage, 'title': 'Eight Days A Week', 'file': '../../../../../../../../F:/MUSIK/Beatles/1964 - Beatles For Sale/Eight Days A Week.mp3'},
  {'icon': iconImage, 'title': 'Eleanor Rigby', 'file': '../../../../../../../../F:/MUSIK/Beatles/1966 - Revolver/Eleanor Rigby.mp3'},
  {'icon': iconImage, 'title': 'For No One', 'file': '../../../../../../../../F:/MUSIK/Beatles/1966 - Revolver/For No One.mp3'},
  {'icon': iconImage, 'title': 'Girl', 'file': '../../../../../../../../F:/MUSIK/Beatles/1965 - Rubber Soul/Girl.mp3'},
  {'icon': iconImage, 'title': 'Good Day Sunshine', 'file': '../../../../../../../../F:/MUSIK/Beatles/1966 - Revolver/Good Day Sunshine.mp3'},
  {'icon': iconImage, 'title': 'Help!', 'file': '../../../../../../../../F:/MUSIK/Beatles/1965 - Help/Help!.mp3'},
  {'icon': iconImage, 'title': 'Help!', 'file': '../../../../../../../../F:/MUSIK/Beatles/Help!.mp4'},
  {'icon': iconImage, 'title': 'Here Comes The Sun', 'file': '../../../../../../../../F:/MUSIK/Beatles/1969 - Abbey Road/Here Comes The Sun.mp3'},
  {'icon': iconImage, 'title': 'I Dont Want To Spoil The Part', 'file': '../../../../../../../../F:/MUSIK/Beatles/1964 - Beatles For Sale/I Don%27t Want To Spoil The Part.mp3'},
  {'icon': iconImage, 'title': 'I Me Mine', 'file': '../../../../../../../../F:/MUSIK/Beatles/1970 - Let It Be/I Me Mine.mp3'},
  {'icon': iconImage, 'title': 'I Need You', 'file': '../../../../../../../../F:/MUSIK/Beatles/1965 - Help/I Need You.mp3'},
  {'icon': iconImage, 'title': 'I Need You', 'file': '../../../../../../../../F:/MUSIK/Beatles/I Need You.mp4'},
  {'icon': iconImage, 'title': 'I Should Have Known Better', 'file': '../../../../../../../../F:/MUSIK/Beatles/1964 - A Hard Days Night/I Should Have Known Better.mp3'},
  {'icon': iconImage, 'title': 'I Want To Tell You', 'file': '../../../../../../../../F:/MUSIK/Beatles/1966 - Revolver/I Want To Tell You.mp3'},
  {'icon': iconImage, 'title': 'I Want You', 'file': '../../../../../../../../F:/MUSIK/Beatles/1969 - Abbey Road/I Want You.mp3'},
  {'icon': iconImage, 'title': 'Im Happy Just To Dance With You', 'file': '../../../../../../../../F:/MUSIK/Beatles/1964 - A Hard Days Night/I%27m Happy Just To Dance With You.mp3'},
  {'icon': iconImage, 'title': 'It Wont Be Long', 'file': '../../../../../../../../F:/MUSIK/Beatles/1963 - With The Beatles/It Won%27t Be Long.mp3'},
  {'icon': iconImage, 'title': 'Its Only Love', 'file': '../../../../../../../../F:/MUSIK/Beatles/1965 - Help/It%27s Only Love.mp3'},
  {'icon': iconImage, 'title': 'Ive Got A Feeling', 'file': '../../../../../../../../F:/MUSIK/Beatles/1970 - Let It Be/I%27ve Got A Feeling.mp3'},
  {'icon': iconImage, 'title': 'Ive Just Seen A Face', 'file': '../../../../../../../../F:/MUSIK/Beatles/1965 - Help/I%27ve Just Seen A Face.mp3'},
  {'icon': iconImage, 'title': 'Let It Be', 'file': '../../../../../../../../F:/MUSIK/Beatles/1970 - Let It Be/Let It Be.mp3'},
  {'icon': iconImage, 'title': 'Maxwells Silver Hammer', 'file': '../../../../../../../../F:/MUSIK/Beatles/1969 - Abbey Road/Maxwell%27s Silver Hammer.mp3'},
  {'icon': iconImage, 'title': 'Michelle', 'file': '../../../../../../../../F:/MUSIK/Beatles/1965 - Rubber Soul/Michelle.mp3'},
  {'icon': iconImage, 'title': 'Misery', 'file': '../../../../../../../../F:/MUSIK/Beatles/1963 - Please Please Me/Misery.mp3'},
  {'icon': iconImage, 'title': 'No Reply', 'file': '../../../../../../../../F:/MUSIK/Beatles/1964 - Beatles For Sale/No Reply.mp3'},
  {'icon': iconImage, 'title': 'Norwegian Wood', 'file': '../../../../../../../../F:/MUSIK/Beatles/1965 - Rubber Soul/Norwegian Wood.mp3'},
  {'icon': iconImage, 'title': 'Nowhere Man', 'file': '../../../../../../../../F:/MUSIK/Beatles/1965 - Rubber Soul/Nowhere Man.mp3'},
  {'icon': iconImage, 'title': 'Ob La Di Ob La Da', 'file': '../../../../../../../../F:/MUSIK/Beatles/1968 - White Album CD 1/Ob-La-Di, Ob-La-Da.mp3'},
  {'icon': iconImage, 'title': 'Octopuss Garden', 'file': '../../../../../../../../F:/MUSIK/Beatles/1969 - Abbey Road/Octopus%27s Garden.mp3'},
  {'icon': iconImage, 'title': 'Oh! Darling', 'file': '../../../../../../../../F:/MUSIK/Beatles/1969 - Abbey Road/Oh! Darling.mp3'},
  {'icon': iconImage, 'title': 'P S I Love You', 'file': '../../../../../../../../F:/MUSIK/Beatles/1963 - Please Please Me/P.S. I Love You.mp3'},
  {'icon': iconImage, 'title': 'Penny Lane', 'file': '../../../../../../../../F:/MUSIK/Beatles/1967 - Magical Mystery Tour/Penny Lane.mp3'},
  {'icon': iconImage, 'title': 'Rock And Roll Music', 'file': '../../../../../../../../F:/MUSIK/Beatles/1964 - Beatles For Sale/Rock And Roll Music.mp3'},
  {'icon': iconImage, 'title': 'Roll Over Beethoven', 'file': '../../../../../../../../F:/MUSIK/Beatles/1963 - With The Beatles/Roll Over Beethoven.mp3'},
  {'icon': iconImage, 'title': 'Something', 'file': '../../../../../../../../F:/MUSIK/Beatles/1969 - Abbey Road/Something.mp3'},
  {'icon': iconImage, 'title': 'Tell Me Why', 'file': '../../../../../../../../F:/MUSIK/Beatles/1964 - A Hard Days Night/Tell Me Why.mp3'},
  {'icon': iconImage, 'title': 'The Night Before', 'file': '../../../../../../../../F:/MUSIK/Beatles/1965 - Help/The Night Before.mp3'},
  {'icon': iconImage, 'title': 'Think For Yourself', 'file': '../../../../../../../../F:/MUSIK/Beatles/1965 - Rubber Soul/Think For Yourself.mp3'},
  {'icon': iconImage, 'title': 'Twist And Shout', 'file': '../../../../../../../../F:/MUSIK/Beatles/1963 - Please Please Me/Twist And Shout.mp3'},
  {'icon': iconImage, 'title': 'Wait', 'file': '../../../../../../../../F:/MUSIK/Beatles/1965 - Rubber Soul/Wait.mp3'},
  {'icon': iconImage, 'title': 'While My Guitar Gently Weeps', 'file': '../../../../../../../../F:/MUSIK/Beatles/1968 - White Album CD 1/While My Guitar Gently Weeps.mp3'},
  {'icon': iconImage, 'title': 'Yellow Submarine', 'file': '../../../../../../../../F:/MUSIK/Beatles/1969 - Yellow Submarine/Yellow Submarine.mp3'},
  {'icon': iconImage, 'title': 'Yesterday', 'file': '../../../../../../../../F:/MUSIK/Beatles/1965 - Help/Yesterday.mp3'},
  {'icon': iconImage, 'title': 'You Like Me Too Much', 'file': '../../../../../../../../F:/MUSIK/Beatles/1965 - Help/You Like Me Too Much.mp3'},
  {'icon': iconImage, 'title': 'You Wont See Me', 'file': '../../../../../../../../F:/MUSIK/Beatles/1965 - Rubber Soul/You Won%27t See Me.mp3'},
  {'icon': iconImage, 'title': 'Youre Going To Lose That Girl', 'file': '../../../../../../../../F:/MUSIK/Beatles/1965 - Help/You%27re Going to Lose that Girl.mp3'},
  {'icon': iconImage, 'title': 'Youve Got To Hide Your Love Away', 'file': '../../../../../../../../F:/MUSIK/Beatles/1965 - Help/You%27ve Got to Hide Your Love Away.mp3'},
]);
})

document.getElementById('blackmore%27snight').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Again Someday', 'file': '../../../../../../../../F:/MUSIK/Blackmore%27s Night/2001 - Fires At Midnight/Again Someday.mp3'},
  {'icon': iconImage, 'title': 'Home Again', 'file': '../../../../../../../../F:/MUSIK/Blackmore%27s Night/2001 - Fires At Midnight/Home Again.mp3'},
  {'icon': iconImage, 'title': 'Olde Mill Inn', 'file': '../../../../../../../../F:/MUSIK/Blackmore%27s Night/2006 - Village Lanterne/Olde Mill inn.mp3'},
  {'icon': iconImage, 'title': 'Olde Village Lanterne', 'file': '../../../../../../../../F:/MUSIK/Blackmore%27s Night/2006 - Village Lanterne/Olde Village Lanterne.mp3'},
  {'icon': iconImage, 'title': 'Possums Last Dance', 'file': '../../../../../../../../F:/MUSIK/Blackmore%27s Night/2001 - Fires At Midnight/Possum%27s Last Dance.mp3'},
  {'icon': iconImage, 'title': 'Spanish Nights', 'file': '../../../../../../../../F:/MUSIK/Blackmore%27s Night/1999 - Under A Violet Moon/Spanish Nights.mp3'},
  {'icon': iconImage, 'title': 'Street Of Dreams', 'file': '../../../../../../../../F:/MUSIK/Blackmore%27s Night/2006 - Village Lanterne/Street of Dreams.mp3'},
  {'icon': iconImage, 'title': 'The Times They Are A Changin', 'file': '../../../../../../../../F:/MUSIK/Blackmore%27s Night/2001 - Fires At Midnight/The Times They Are A Changin.mp3'},
  {'icon': iconImage, 'title': 'Wind In The Willows', 'file': '../../../../../../../../F:/MUSIK/Blackmore%27s Night/1999 - Under A Violet Moon/Wind In The Willows.mp3'},
  {'icon': iconImage, 'title': 'Wind In The Willows', 'file': '../../../../../../../../F:/MUSIK/Blackmore%27s Night/2003-The Best Of/Wind In The Willows.mp3'},
  {'icon': iconImage, 'title': 'Wish You Were Here', 'file': '../../../../../../../../F:/MUSIK/Blackmore%27s Night/1997 - Shadow of the moon/Wish You Were Here.mp3'},
  {'icon': iconImage, 'title': 'Wish You Where Here', 'file': '../../../../../../../../F:/MUSIK/Blackmore%27s Night/2003-The Best Of/Wish You Where Here.mp3'},
]);
})

document.getElementById('boneym').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Belfast', 'file': '../../../../../../../../F:/MUSIK/Boney M/1986.The Best Of 10 Years/Belfast.mp3'},
  {'icon': iconImage, 'title': 'Brown Girl In The Ring', 'file': '../../../../../../../../F:/MUSIK/Boney M/1992 - Gold/Brown Girl In The Ring.mp3'},
  {'icon': iconImage, 'title': 'Gotta Go Home', 'file': '../../../../../../../../F:/MUSIK/Boney M/1986.The Best Of 10 Years/Gotta Go Home.mp3'},
  {'icon': iconImage, 'title': 'Have You Ever Seen The Rain', 'file': '../../../../../../../../F:/MUSIK/Boney M/2007 - Love For Sale/Have You Ever Seen The Rain.mp3'},
  {'icon': iconImage, 'title': 'Hooray! Hooray! Its A Holi Holiday', 'file': '../../../../../../../../F:/MUSIK/Boney M/1986.The Best Of 10 Years/Hooray! Hooray! It%27s A Holi-Holiday.mp3'},
  {'icon': iconImage, 'title': 'Jingle Bells', 'file': '../../../../../../../../F:/MUSIK/Boney M/1986 - The 20 Greatest Christmas Songs/Jingle Bells.mp3'},
  {'icon': iconImage, 'title': 'No Woman No Cry', 'file': '../../../../../../../../F:/MUSIK/Boney M/2007 - Take The Heat Off Me/No Woman No Cry.mp3'},
  {'icon': iconImage, 'title': 'Rasputin', 'file': '../../../../../../../../F:/MUSIK/Boney M/1978 - Nightflight To Venus/Rasputin.mp3'},
  {'icon': iconImage, 'title': 'Rivers Of Babylon', 'file': '../../../../../../../../F:/MUSIK/Boney M/1986.The Best Of 10 Years/Rivers Of Babylon.mp3'},
  {'icon': iconImage, 'title': 'Somewhere In The World', 'file': '../../../../../../../../F:/MUSIK/Boney M/1981 - Boonoonoonoos/Somewhere In The World.mp3'},
  {'icon': iconImage, 'title': 'Sunny', 'file': '../../../../../../../../F:/MUSIK/Boney M/1976 - Take The Heat Off Me/Sunny.mp3'},
  {'icon': iconImage, 'title': 'We Kill The World', 'file': '../../../../../../../../F:/MUSIK/Boney M/1981 - Boonoonoonoos/We Kill The World.mp3'},
]);
})

document.getElementById('c.c.catch').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Are You Man Enough', 'file': '../../../../../../../../F:/MUSIK/C.C.Catch/1987 - Like A Hurricane/Are You Man Enough.mp3'},
  {'icon': iconImage, 'title': 'Backseat Of Your Cadillac', 'file': '../../../../../../../../F:/MUSIK/C.C.Catch/1988 - Big Fun/Backseat of Your Cadillac.mp3'},
  {'icon': iconImage, 'title': 'Cause You Are Young', 'file': '../../../../../../../../F:/MUSIK/C.C.Catch/1986 - Catch The Catch/Cause you are young.mp3'},
  {'icon': iconImage, 'title': 'Dont Shot My Sheriff Tonight', 'file': '../../../../../../../../F:/MUSIK/C.C.Catch/1988 - Big Fun/Don%27t Shot My Sheriff Tonight.mp3'},
  {'icon': iconImage, 'title': 'Fire Of Love', 'file': '../../../../../../../../F:/MUSIK/C.C.Catch/1988 - Big Fun/Fire of Love.mp3'},
  {'icon': iconImage, 'title': 'Good Guys Only Win In Movies', 'file': '../../../../../../../../F:/MUSIK/C.C.Catch/1987 - Like A Hurricane/Good Guys Only Win In Movies.mp3'},
  {'icon': iconImage, 'title': 'Heartbreak Hotel', 'file': '../../../../../../../../F:/MUSIK/C.C.Catch/1988 - Diamonds/Heartbreak Hotel.mp3'},
  {'icon': iconImage, 'title': 'Heaven And Hell', 'file': '../../../../../../../../F:/MUSIK/C.C.Catch/1986 - Welcome To The Heartbreak Hotel/Heaven and Hell.mp3'},
  {'icon': iconImage, 'title': 'Hollywood Nights', 'file': '../../../../../../../../F:/MUSIK/C.C.Catch/1988 - Diamonds/Hollywood Nights.mp3'},
  {'icon': iconImage, 'title': 'House Of Mystic Light', 'file': '../../../../../../../../F:/MUSIK/C.C.Catch/1988 - Diamonds/House Of Mystic Light.mp3'},
  {'icon': iconImage, 'title': 'I Can Loose My Heart Tonight', 'file': '../../../../../../../../F:/MUSIK/C.C.Catch/1988 - Diamonds/I Can Loose My Heart Tonight.mp3'},
  {'icon': iconImage, 'title': 'Jump In My Car', 'file': '../../../../../../../../F:/MUSIK/C.C.Catch/1986 - Catch The Catch/Jump In My Car.mp3'},
  {'icon': iconImage, 'title': 'Little By Little', 'file': '../../../../../../../../F:/MUSIK/C.C.Catch/1988 - Big Fun/Little By Little.mp3'},
  {'icon': iconImage, 'title': 'Megamix', 'file': '../../../../../../../../F:/MUSIK/C.C.Catch/1998 - Best Of`98/Megamix.mp3'},
  {'icon': iconImage, 'title': 'One Night Is Not Enough', 'file': '../../../../../../../../F:/MUSIK/C.C.Catch/1986 - Catch The Catch/One Night Is Not Enough.mp3'},
  {'icon': iconImage, 'title': 'Smoky Joes Cafe', 'file': '../../../../../../../../F:/MUSIK/C.C.Catch/1987 - Like A Hurricane/Smoky Joe%27s Cafe.mp3'},
  {'icon': iconImage, 'title': 'Soul Survivor', 'file': '../../../../../../../../F:/MUSIK/C.C.Catch/1987 - Like A Hurricane/Soul Survivor.mp3'},
  {'icon': iconImage, 'title': 'Strangers By Night', 'file': '../../../../../../../../F:/MUSIK/C.C.Catch/1986 - Catch The Catch/Strangers By Night.mp3'},
]);
})

document.getElementById('chrisnorman').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Dont Play Your Rock N Roll To Me', 'file': '../../../../../../../../F:/MUSIK/Chris Norman/disk 1 Smokie Years/Don%27t Play Your Rock %27n%27 Roll to Me.mp3'},
  {'icon': iconImage, 'title': 'Ill Meet You At Midnight', 'file': '../../../../../../../../F:/MUSIK/Chris Norman/disk 1 Smokie Years/I%27ll meet you at Midnight.mp3'},
  {'icon': iconImage, 'title': 'Midnight Lady', 'file': '../../../../../../../../F:/MUSIK/Chris Norman/Chris Norman THE HITS - From His Smokie And Solo Years[tfile.ru]/Midnight lady.mp3'},
  {'icon': iconImage, 'title': 'Some Hearts Are Diamonds', 'file': '../../../../../../../../F:/MUSIK/Chris Norman/disk 2 Solo Years/Some hearts are diamonds.mp3'},
  {'icon': iconImage, 'title': 'Stumblin In', 'file': '../../../../../../../../F:/MUSIK/Chris Norman/disk 1 Smokie Years/Stumblin%27 in.mp3'},
  {'icon': iconImage, 'title': 'What Can I Do', 'file': '../../../../../../../../F:/MUSIK/Chris Norman/What Can I Do.mp3'},
]);
})

document.getElementById('chrisrea').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'And You My Love', 'file': '../../../../../../../../F:/MUSIK/Chris Rea/1991 - Auberge/And You My Love.mp3'},
  {'icon': iconImage, 'title': 'Auberge', 'file': '../../../../../../../../F:/MUSIK/Chris Rea/1991 - Auberge/Auberge.mp3'},
  {'icon': iconImage, 'title': 'I Can Hear Your Heartbeat', 'file': '../../../../../../../../F:/MUSIK/Chris Rea/1988 - New Light Through Old Windows/I Can Hear Your Heartbeat.mp3'},
  {'icon': iconImage, 'title': 'I Just Wanna Be With You', 'file': '../../../../../../../../F:/MUSIK/Chris Rea/1989 - The Road To Hell/I Just Wanna Be With You.mp3'},
  {'icon': iconImage, 'title': 'Josephine', 'file': '../../../../../../../../F:/MUSIK/Chris Rea/1985 - Shamrock Diaries/Josephine.mp3'},
  {'icon': iconImage, 'title': 'Julia', 'file': '../../../../../../../../F:/MUSIK/Chris Rea/1994 - Espresso Logic/Julia.mp3'},
  {'icon': iconImage, 'title': 'Looking For The Summer', 'file': '../../../../../../../../F:/MUSIK/Chris Rea/1991 - Auberge/Looking For The Summer.mp3'},
  {'icon': iconImage, 'title': 'Sing A Song Of Love To Me', 'file': '../../../../../../../../F:/MUSIK/Chris Rea/1991 - Auberge/Sing A Song Of Love To Me.mp3'},
  {'icon': iconImage, 'title': 'The Road To Hell', 'file': '../../../../../../../../F:/MUSIK/Chris Rea/1989 - The Road To Hell/The Road to Hell.mp3'},
]);
})

document.getElementById('classics').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Allegro', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Vivaldi/Concerto in C major, RV 180 Il Piacere/Allegro.mp3'},
  {'icon': iconImage, 'title': 'Allegro', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Vivaldi/Concerto in D minor, RV 242/Allegro.mp3'},
  {'icon': iconImage, 'title': 'Allegro', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Vivaldi/Concerto in F minor, RV 297 Winter/Allegro.mp3'},
  {'icon': iconImage, 'title': 'Allegro', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Vivaldi/Concerto in G minor, RV 157/Allegro.mp3'},
  {'icon': iconImage, 'title': 'Allegro Molto', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Vivaldi/Concerto a 6 in A minor RV 523/Allegro molto.mp3'},
  {'icon': iconImage, 'title': 'Allegro Non Molto', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Vivaldi/Concerto in F minor, RV 297 Winter/Allegro non molto.mp3'},
  {'icon': iconImage, 'title': 'Allegro Non Molto', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Vivaldi/Concerto in G minor, RV 315 Summer/Allegro non molto.mp3'},
  {'icon': iconImage, 'title': 'Alonette', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Paul Mauriat/Alonette.mp3'},
  {'icon': iconImage, 'title': 'Alouette', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Paul Mauriat/Alouette.mp4'},
  {'icon': iconImage, 'title': 'Also Sprash Zaratustra', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Also sprash Zaratustra.mp3'},
  {'icon': iconImage, 'title': 'Aurora', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Vanessa Mai/Aurora.mp3'},
  {'icon': iconImage, 'title': 'Badinerie', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Иоганн Себастьян Бах/Badinerie.mp3'},
  {'icon': iconImage, 'title': 'Cavalleria Rusticana Intermezzo', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Cavalleria Rusticana Intermezzo.mp3'},
  {'icon': iconImage, 'title': 'Classical Gas', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Vanessa Mai/Classical Gas.mp3'},
  {'icon': iconImage, 'title': 'Con Brio', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Ludwig Van Beethoven/Con brio.mp3'},
  {'icon': iconImage, 'title': 'Concerto E Dur Rv 269 Danza Pastorale Allegro', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Vivaldi/Concerto E-dur RV 269 Danza pastorale Allegro.mp3'},
  {'icon': iconImage, 'title': 'Concerto For 2 Violonist & String', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Иоганн Себастьян Бах/Concerto for  2 Violonist & String.mp3'},
  {'icon': iconImage, 'title': 'Concerto For Piano', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Вольфганг Амадей Моцарт/Concerto for piano.mp3'},
  {'icon': iconImage, 'title': 'Contradanza', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Vanessa Mai/Contradanza.mp3'},
  {'icon': iconImage, 'title': 'Contradanza 1995', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Vanessa Mai/Contradanza 1995.mp4'},
  {'icon': iconImage, 'title': 'Die Walkure Ride Of The Valky Act3', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Die Walkure Ride of the Valky Act3.mp3'},
  {'icon': iconImage, 'title': 'Egmont Увертюра (opus 84)', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Ludwig Van Beethoven/Egmont увертюра (opus 84).mp3'},
  {'icon': iconImage, 'title': 'El Bimbo', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Paul Mauriat/El Bimbo.mp3'},
  {'icon': iconImage, 'title': 'Elise', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Ludwig Van Beethoven/Elise.mp3'},
  {'icon': iconImage, 'title': 'Fortress', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Fortress.mp3'},
  {'icon': iconImage, 'title': 'Godfather', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Godfather.mp3'},
  {'icon': iconImage, 'title': 'Godfather', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Paul Mauriat/Godfather.mp3'},
  {'icon': iconImage, 'title': 'Lilium', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Lilium.mp3'},
  {'icon': iconImage, 'title': 'Love Is Blue', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Paul Mauriat/Love Is Blue.mp3'},
  {'icon': iconImage, 'title': 'Molto Allegro Simphonie No 40 In G Minor K550', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Вольфганг Амадей Моцарт/Molto allegro Simphonie No.40 in G minor K550.mp3'},
  {'icon': iconImage, 'title': 'Moonlight Sonata (лунная Соната №14 ) (ч1)', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Ludwig Van Beethoven/Moonlight Sonata (Лунная Соната №14 ) (ч1).mp3'},
  {'icon': iconImage, 'title': 'Moonlight Sonata (лунная Соната №14 ) (ч2)', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Ludwig Van Beethoven/Moonlight Sonata (Лунная Соната №14 ) (ч2).mp3'},
  {'icon': iconImage, 'title': 'Orfeo Euridice Atto Secondo Balletto', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Orfeo Euridice Atto Secondo.Balletto.mp3'},
  {'icon': iconImage, 'title': 'Parapluies De Cherbury', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Paul Mauriat/Parapluies De Cherbury.mp3'},
  {'icon': iconImage, 'title': 'Per Elisa', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Ludwig Van Beethoven/Per Elisa.mp3'},
  {'icon': iconImage, 'title': 'Piano Sonata №14 In C Sharp Minor Op 27 №2', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Ludwig Van Beethoven/Piano Sonata №14 in C-sharp minor Op.27 №2.mp3'},
  {'icon': iconImage, 'title': 'Presto', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Vivaldi/Concerto in E flat major, RV 253 La Tempesta di Mare/Presto.mp3'},
  {'icon': iconImage, 'title': 'Presto Tempo Impetuoso Destate', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Vivaldi/Concerto in G minor, RV 315 Summer/Presto - Tempo impetuoso d%27Estate.mp3'},
  {'icon': iconImage, 'title': 'Requiem Lacrimoza', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Вольфганг Амадей Моцарт/Requiem Lacrimoza.mp3'},
  {'icon': iconImage, 'title': 'Retro', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Vanessa Mai/Retro.mp3'},
  {'icon': iconImage, 'title': 'Rondo Andantino', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Rondo Andantino.mp3'},
  {'icon': iconImage, 'title': 'Storm', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Vanessa Mai/Storm.mp3'},
  {'icon': iconImage, 'title': 'The Blue Danube Op 314', 'file': '../../../../../../../../F:/MUSIK/ClassicS/The Blue Danube Op.314.mp3'},
  {'icon': iconImage, 'title': 'The Diva Dance', 'file': '../../../../../../../../F:/MUSIK/ClassicS/The Diva Dance.MP3'},
  {'icon': iconImage, 'title': 'Toccata', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Vanessa Mai/Toccata.mp3'},
  {'icon': iconImage, 'title': 'Toccatа', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Paul Mauriat/Toccatа.mp3'},
  {'icon': iconImage, 'title': 'Valse Op 64i2', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Valse Op.64I2.mp3'},
  {'icon': iconImage, 'title': 'Vienna Blood Op 354', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Vienna Blood Op.354.mp3'},
  {'icon': iconImage, 'title': 'Балетная Сюита Лебединое Озеро Соч 20', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Чайковский Петр Ильич/Балетная сюита Лебединое озеро соч.20 .mp3'},
  {'icon': iconImage, 'title': 'Балетная Сюита Спящая Красавица Соч 66 Вальс Allegro', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Чайковский Петр Ильич/Балетная сюита Спящая красавица соч 66.Вальс Allegro.mp3'},
  {'icon': iconImage, 'title': 'Вальс', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Вальс.mp3'},
  {'icon': iconImage, 'title': 'Вальс', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Георгии Васильевич Свиридов/Вальс.mp3'},
  {'icon': iconImage, 'title': 'Вальс К Драме М Лермонтова Маскарад', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Вальс к драме М.Лермонтова %27Маскарад%27.mp3'},
  {'icon': iconImage, 'title': 'Время Вперед', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Георгии Васильевич Свиридов/Время, вперед.mp3'},
  {'icon': iconImage, 'title': 'Гопак', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Гопак.mp3'},
  {'icon': iconImage, 'title': 'Евгений Онегин Полонез', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Евгений Онегин Полонез.mp3'},
  {'icon': iconImage, 'title': 'Зимняя Дорога', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Георгии Васильевич Свиридов/Зимняя Дорога.mp3'},
  {'icon': iconImage, 'title': 'Кан Кли', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Кан Кли.mp3'},
  {'icon': iconImage, 'title': 'Кармен', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Кармен.mp3'},
  {'icon': iconImage, 'title': 'Песня Тореадора', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Песня тореадора.mp3'},
  {'icon': iconImage, 'title': 'Половецкие Пляски', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Половецкие пляски.mp3'},
  {'icon': iconImage, 'title': 'Полонез', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Огинский М. К/Полонез.mp3'},
  {'icon': iconImage, 'title': 'Ромео И Джульета Балетная Сюита Монтекки И Капулетти', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Ромео и Джульета Балетная сюита Монтекки и Капулетти.mp3'},
  {'icon': iconImage, 'title': 'Свадебный Марш', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Свадебный марш.mp3'},
  {'icon': iconImage, 'title': 'Тройка', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Георгии Васильевич Свиридов/Тройка.mp3'},
  {'icon': iconImage, 'title': 'Турецкий Марш', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Вольфганг Амадей Моцарт/Турецкий марш.mp3'},
  {'icon': iconImage, 'title': 'Уральский Напев', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Георгии Васильевич Свиридов/Уральский напев.mp3'},
  {'icon': iconImage, 'title': 'Хованщина Прелюдия', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Хованщина. Прелюдия.mp3'},
  {'icon': iconImage, 'title': 'Эхо Вальса', 'file': '../../../../../../../../F:/MUSIK/ClassicS/Георгии Васильевич Свиридов/Эхо вальса.mp3'},
]);
})

document.getElementById('ddt').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '180 См', 'file': '../../../../../../../../F:/MUSIK/DDT/2002 - Единочество/180 см.mp3'},
  {'icon': iconImage, 'title': '7 Я Глава', 'file': '../../../../../../../../F:/MUSIK/DDT/7-я глава.mp3'},
  {'icon': iconImage, 'title': 'Агидель', 'file': '../../../../../../../../F:/MUSIK/DDT/1995 - Это все/Агидель.mp3'},
  {'icon': iconImage, 'title': 'Актриса Весна', 'file': '../../../../../../../../F:/MUSIK/DDT/1991 - Пластун/Актриса-Весна.mp3'},
  {'icon': iconImage, 'title': 'Актриса Весна', 'file': '../../../../../../../../F:/MUSIK/DDT/1992 - Актриса весна/Актриса-Весна.mp3'},
  {'icon': iconImage, 'title': 'Апокалипсис', 'file': '../../../../../../../../F:/MUSIK/DDT/1997 - Рожденный в СССР/Апокалипсис.mp3'},
  {'icon': iconImage, 'title': 'Апокалипсис', 'file': '../../../../../../../../F:/MUSIK/DDT/1997 - Рожденный в СССР/Апокалипсис.mp4'},
  {'icon': iconImage, 'title': 'Беда', 'file': '../../../../../../../../F:/MUSIK/DDT/1993 - Черный пес Петербург/Беда.mp3'},
  {'icon': iconImage, 'title': 'Беда', 'file': '../../../../../../../../F:/MUSIK/DDT/1993 - Черный пес Петербург/Беда.mp4'},
  {'icon': iconImage, 'title': 'Белая Ночь', 'file': '../../../../../../../../F:/MUSIK/DDT/1995 - Это все/Белая ночь.mp3'},
  {'icon': iconImage, 'title': 'Белая Птица', 'file': '../../../../../../../../F:/MUSIK/DDT/1993 - Черный пес Петербург/Белая птица.mp3'},
  {'icon': iconImage, 'title': 'Бородино', 'file': '../../../../../../../../F:/MUSIK/DDT/2003 - Единочество/Бородино.mp3'},
  {'icon': iconImage, 'title': 'Бродяга', 'file': '../../../../../../../../F:/MUSIK/DDT/2000 - Метель августа/Бродяга.mp3'},
  {'icon': iconImage, 'title': 'В Гостях У Генерала', 'file': '../../../../../../../../F:/MUSIK/DDT/2006 - ДК им. Дзержинского/В гостях у генерала.mp3'},
  {'icon': iconImage, 'title': 'В Очереди За Правдой', 'file': '../../../../../../../../F:/MUSIK/DDT/2014 - Прозрачный/В Очереди За Правдой.mp3'},
  {'icon': iconImage, 'title': 'В Последнюю Осень', 'file': '../../../../../../../../F:/MUSIK/DDT/2001 - Два концерта Москва-Петербург2/В последнюю осень.mp3'},
  {'icon': iconImage, 'title': 'Вальс О Творчеств', 'file': '../../../../../../../../F:/MUSIK/DDT/2002 - Единочество/Вальс о творчеств.mp3'},
  {'icon': iconImage, 'title': 'Вальс О Творчестве', 'file': '../../../../../../../../F:/MUSIK/DDT/2002 - Единочество/Вальс о творчестве.mp3'},
  {'icon': iconImage, 'title': 'Вася', 'file': '../../../../../../../../F:/MUSIK/DDT/1982 - Квартирник/Вася.mp3'},
  {'icon': iconImage, 'title': 'Ветер', 'file': '../../../../../../../../F:/MUSIK/DDT/1995 - Это все/Ветер.mp3'},
  {'icon': iconImage, 'title': 'Ветры', 'file': '../../../../../../../../F:/MUSIK/DDT/1991 - Пластун/Ветры.mp3'},
  {'icon': iconImage, 'title': 'Война Бывает Детская', 'file': '../../../../../../../../F:/MUSIK/DDT/2007 - Прекрасная любовь/Война бывает детская.mp3'},
  {'icon': iconImage, 'title': 'Вокзал', 'file': '../../../../../../../../F:/MUSIK/DDT/2018 - Галя ходи/Вокзал.mp3'},
  {'icon': iconImage, 'title': 'Вокзал', 'file': '../../../../../../../../F:/MUSIK/DDT/2018 - Галя ходи/Вокзал.mp4'},
  {'icon': iconImage, 'title': 'Встреча', 'file': '../../../../../../../../F:/MUSIK/DDT/2011 - Иначе/Встреча.mp3'},
  {'icon': iconImage, 'title': 'Где Мы Летим', 'file': '../../../../../../../../F:/MUSIK/DDT/2011 - Иначе/Где мы летим.mp3'},
  {'icon': iconImage, 'title': 'Где Мы Летим', 'file': '../../../../../../../../F:/MUSIK/DDT/2011 - Иначе/Где мы летим.mp4'},
  {'icon': iconImage, 'title': 'Герой', 'file': '../../../../../../../../F:/MUSIK/DDT/1998 - Мир номер ноль/Герой.mp3'},
  {'icon': iconImage, 'title': 'Глазища', 'file': '../../../../../../../../F:/MUSIK/DDT/1995 - Это все/Глазища.mp3'},
  {'icon': iconImage, 'title': 'Гляди Пешком', 'file': '../../../../../../../../F:/MUSIK/DDT/1997 - Рожденный в СССР/Гляди пешком.mp3'},
  {'icon': iconImage, 'title': 'Гражданка', 'file': '../../../../../../../../F:/MUSIK/DDT/2000 - Метель августа/Гражданка.mp3'},
  {'icon': iconImage, 'title': 'Давайте Что Нибудь Придумаем', 'file': '../../../../../../../../F:/MUSIK/DDT/1982 - Квартирник/Давайте что-нибудь придумаем.mp3'},
  {'icon': iconImage, 'title': 'Далеко Далеко', 'file': '../../../../../../../../F:/MUSIK/DDT/1996 - Любовь/Далеко, далеко.mp3'},
  {'icon': iconImage, 'title': 'Далеко Далеко', 'file': '../../../../../../../../F:/MUSIK/DDT/2004 - Город без окон - Вход/Далеко, Далеко.mp3'},
  {'icon': iconImage, 'title': 'Деревня', 'file': '../../../../../../../../F:/MUSIK/DDT/1982 - Квартирник/Деревня.mp3'},
  {'icon': iconImage, 'title': 'Дождь', 'file': '../../../../../../../../F:/MUSIK/DDT/1992 - Актриса весна/Дождь.mp3'},
  {'icon': iconImage, 'title': 'Дождь', 'file': '../../../../../../../../F:/MUSIK/DDT/2001 - Два концерта Москва-Петербург1/Дождь.mp3'},
  {'icon': iconImage, 'title': 'Донести Синь', 'file': '../../../../../../../../F:/MUSIK/DDT/1998 - Мир номер ноль/Донести синь.mp3'},
  {'icon': iconImage, 'title': 'Дороги', 'file': '../../../../../../../../F:/MUSIK/DDT/1991 - Пластун/Дороги.mp3'},
  {'icon': iconImage, 'title': 'Духи', 'file': '../../../../../../../../F:/MUSIK/DDT/1997 - Рожденный в СССР/Духи.mp3'},
  {'icon': iconImage, 'title': 'Если', 'file': '../../../../../../../../F:/MUSIK/DDT/2018 - Галя ходи/Если.mp3'},
  {'icon': iconImage, 'title': 'Живой', 'file': '../../../../../../../../F:/MUSIK/DDT/2003 - Единочество/Живой.mp3'},
  {'icon': iconImage, 'title': 'Жизнь На Месте', 'file': '../../../../../../../../F:/MUSIK/DDT/1995 - Это все/Жизнь на месте.mp3'},
  {'icon': iconImage, 'title': 'Забери Эту Ночь', 'file': '../../../../../../../../F:/MUSIK/DDT/2003 - Единочество/Забери эту ночь.mp3'},
  {'icon': iconImage, 'title': 'Змей Петров', 'file': '../../../../../../../../F:/MUSIK/DDT/1991 - Пластун/Змей Петров.mp3'},
  {'icon': iconImage, 'title': 'Инопланетянин', 'file': '../../../../../../../../F:/MUSIK/DDT/1982 - Свинья на радуге/Инопланетянин.mp3'},
  {'icon': iconImage, 'title': 'Капитан Колесников', 'file': '../../../../../../../../F:/MUSIK/DDT/2007 - Прекрасная любовь/Капитан Колесников.mp3'},
  {'icon': iconImage, 'title': 'Кладбище', 'file': '../../../../../../../../F:/MUSIK/DDT/2003 - Единочество/Кладбище.mp3'},
  {'icon': iconImage, 'title': 'Конвеер', 'file': '../../../../../../../../F:/MUSIK/DDT/1988 - Я получил эту роль/Конвеер.mp3'},
  {'icon': iconImage, 'title': 'Конец Света', 'file': '../../../../../../../../F:/MUSIK/DDT/2001 - Два концерта Москва-Петербург1/Конец света.mp3'},
  {'icon': iconImage, 'title': 'Концерт (тула)', 'file': '../../../../../../../../F:/MUSIK/DDT/Концерт (Тула).mp3'},
  {'icon': iconImage, 'title': 'Ленинград', 'file': '../../../../../../../../F:/MUSIK/DDT/1990 - Оттепель/Ленинград.mp3'},
  {'icon': iconImage, 'title': 'Ленинград', 'file': '../../../../../../../../F:/MUSIK/DDT/2001 - Два концерта Москва-Петербург2/Ленинград.mp3'},
  {'icon': iconImage, 'title': 'Летели Облака', 'file': '../../../../../../../../F:/MUSIK/DDT/2000 - Метель августа/Летели облака.mp3'},
  {'icon': iconImage, 'title': 'Любовь', 'file': '../../../../../../../../F:/MUSIK/DDT/1996 - Любовь/Любовь.mp3'},
  {'icon': iconImage, 'title': 'Любовь Подумай Обо Мне', 'file': '../../../../../../../../F:/MUSIK/DDT/2003 - Единочество/Любовь, подумай обо мне.mp3'},
  {'icon': iconImage, 'title': 'Мальчики Мажоры', 'file': '../../../../../../../../F:/MUSIK/DDT/1988 - Я получил эту роль/Мальчики мажоры.mp3'},
  {'icon': iconImage, 'title': 'Мама Это Рок Н Ролл', 'file': '../../../../../../../../F:/MUSIK/DDT/2004 - Город без окон - Вход/Мама Это Рок-Н-Ролл.mp3'},
  {'icon': iconImage, 'title': 'Мертвый Город Рождество', 'file': '../../../../../../../../F:/MUSIK/DDT/1997 - Рожденный в СССР/Мертвый город. Рождество.mp3'},
  {'icon': iconImage, 'title': 'Мертвый Город Рождество', 'file': '../../../../../../../../F:/MUSIK/DDT/2001 - Два концерта Москва-Петербург1/Мертвый город. Рождество.mp3'},
  {'icon': iconImage, 'title': 'Метель', 'file': '../../../../../../../../F:/MUSIK/DDT/1998 - Мир номер ноль/Метель.mp3'},
  {'icon': iconImage, 'title': 'Метель', 'file': '../../../../../../../../F:/MUSIK/DDT/2001 - Два концерта Москва-Петербург1/Метель.mp3'},
  {'icon': iconImage, 'title': 'Метель Августа', 'file': '../../../../../../../../F:/MUSIK/DDT/2000 - Метель августа/Метель августа.mp3'},
  {'icon': iconImage, 'title': 'Милиционер В Рок Клубе', 'file': '../../../../../../../../F:/MUSIK/DDT/1990 - Оттепель/Милиционер в рок-клубе.mp3'},
  {'icon': iconImage, 'title': 'Монолог В Ванной', 'file': '../../../../../../../../F:/MUSIK/DDT/2001 - Два концерта Москва-Петербург1/Монолог в ванной.mp3'},
  {'icon': iconImage, 'title': 'Московская Барыня', 'file': '../../../../../../../../F:/MUSIK/DDT/2000 - Метель августа/Московская барыня.mp3'},
  {'icon': iconImage, 'title': 'Музыкальный Образ Iii', 'file': '../../../../../../../../F:/MUSIK/DDT/1998 - Мир номер ноль/Музыкальный образ III.mp3'},
  {'icon': iconImage, 'title': 'На Небе Вороны', 'file': '../../../../../../../../F:/MUSIK/DDT/1993 - Черный пес Петербург/На небе вороны.mp3'},
  {'icon': iconImage, 'title': 'Наполним Небо Добротой', 'file': '../../../../../../../../F:/MUSIK/DDT/1984 - Переферия/Наполним небо добротой.mp3'},
  {'icon': iconImage, 'title': 'Не Стреляй', 'file': '../../../../../../../../F:/MUSIK/DDT/1988 - Я получил эту роль/Не стреляй.mp3'},
  {'icon': iconImage, 'title': 'Небо На Земле', 'file': '../../../../../../../../F:/MUSIK/DDT/1998 - Мир номер ноль/Небо на земле .mp3'},
  {'icon': iconImage, 'title': 'Небо На Земле', 'file': '../../../../../../../../F:/MUSIK/DDT/1998 - Мир номер ноль/Небо на земле.mp3'},
  {'icon': iconImage, 'title': 'Ночь', 'file': '../../../../../../../../F:/MUSIK/DDT/1992 - Актриса весна/Ночь.mp3'},
  {'icon': iconImage, 'title': 'Ночь Людмила', 'file': '../../../../../../../../F:/MUSIK/DDT/2000 - Метель августа/Ночь-Людмила.mp3'},
  {'icon': iconImage, 'title': 'Облом', 'file': '../../../../../../../../F:/MUSIK/DDT/2003 - Единочество/Облом.mp3'},
  {'icon': iconImage, 'title': 'Она', 'file': '../../../../../../../../F:/MUSIK/DDT/2002 - Единочество/Она.mp3'},
  {'icon': iconImage, 'title': 'Осенняя', 'file': '../../../../../../../../F:/MUSIK/DDT/2002 - Единочество/Осенняя.mp3'},
  {'icon': iconImage, 'title': 'Памятник', 'file': '../../../../../../../../F:/MUSIK/DDT/1984 - Переферия/Памятник.mp3'},
  {'icon': iconImage, 'title': 'Париж', 'file': '../../../../../../../../F:/MUSIK/DDT/2001 - Два концерта Москва-Петербург2/Париж.mp3'},
  {'icon': iconImage, 'title': 'Париж', 'file': '../../../../../../../../F:/MUSIK/DDT/Париж.mp4'},
  {'icon': iconImage, 'title': 'Пацаны', 'file': '../../../../../../../../F:/MUSIK/DDT/1997 - Рожденный в СССР/Пацаны.mp3'},
  {'icon': iconImage, 'title': 'Пацаны', 'file': '../../../../../../../../F:/MUSIK/DDT/2001 - Два концерта Москва-Петербург1/Пацаны.mp3'},
  {'icon': iconImage, 'title': 'Пашка', 'file': '../../../../../../../../F:/MUSIK/DDT/2003 - Единочество/Пашка.mp3'},
  {'icon': iconImage, 'title': 'Песня О Людях Героических Профессий', 'file': '../../../../../../../../F:/MUSIK/DDT/2005 - Чистый звук/Песня о людях героических профессий.mp3'},
  {'icon': iconImage, 'title': 'Песня О Свободе', 'file': '../../../../../../../../F:/MUSIK/DDT/2011 - Иначе/Песня о свободе.mp3'},
  {'icon': iconImage, 'title': 'Песня О Свободе', 'file': '../../../../../../../../F:/MUSIK/DDT/Песня о Свободе.mp4'},
  {'icon': iconImage, 'title': 'Питер', 'file': '../../../../../../../../F:/MUSIK/DDT/2000 - Метель августа/Питер.mp3'},
  {'icon': iconImage, 'title': 'Победа', 'file': '../../../../../../../../F:/MUSIK/DDT/1991 - Пластун/Победа.mp3'},
  {'icon': iconImage, 'title': 'Победа', 'file': '../../../../../../../../F:/MUSIK/DDT/1991 - Пластун/Победа.mp4'},
  {'icon': iconImage, 'title': 'Подарок', 'file': '../../../../../../../../F:/MUSIK/DDT/2000 - Метель августа/Подарок.mp3'},
  {'icon': iconImage, 'title': 'Поколение', 'file': '../../../../../../../../F:/MUSIK/DDT/2002 - Единочество/Поколение.mp3'},
  {'icon': iconImage, 'title': 'Последняя Осень', 'file': '../../../../../../../../F:/MUSIK/DDT/1992 - Актриса весна/Последняя осень.mp3'},
  {'icon': iconImage, 'title': 'Пост Интеллигент', 'file': '../../../../../../../../F:/MUSIK/DDT/1990 - Оттепель/Пост-интеллигент.mp3'},
  {'icon': iconImage, 'title': 'Постелите Мне Степь', 'file': '../../../../../../../../F:/MUSIK/DDT/Постелите мне степь.mp3'},
  {'icon': iconImage, 'title': 'Потолок', 'file': '../../../../../../../../F:/MUSIK/DDT/2000 - Метель августа/Потолок.mp3'},
  {'icon': iconImage, 'title': 'Поэт', 'file': '../../../../../../../../F:/MUSIK/DDT/1988 - Я получил эту роль/Поэт.mp3'},
  {'icon': iconImage, 'title': 'Правда На Правду', 'file': '../../../../../../../../F:/MUSIK/DDT/1997 - Рожденный в СССР/Правда на правду.mp3'},
  {'icon': iconImage, 'title': 'Правда На Правду', 'file': '../../../../../../../../F:/MUSIK/DDT/2001 - Два концерта Москва-Петербург2/Правда на правду.mp3'},
  {'icon': iconImage, 'title': 'Предчувствие Гражданской Войны', 'file': '../../../../../../../../F:/MUSIK/DDT/1991 - Пластун/Предчувствие гражданской войны.mp3'},
  {'icon': iconImage, 'title': 'Прекрасная Любовь', 'file': '../../../../../../../../F:/MUSIK/DDT/2001 - Два концерта Москва-Петербург2/Прекрасная любовь.mp3'},
  {'icon': iconImage, 'title': 'Прекрасная Любовь', 'file': '../../../../../../../../F:/MUSIK/DDT/2006 - DDT Family/Прекрасная Любовь.mp3'},
  {'icon': iconImage, 'title': 'Пропавший Без Вести', 'file': '../../../../../../../../F:/MUSIK/DDT/2005 - Пропавший без вести/Пропавший без вести.mp3'},
  {'icon': iconImage, 'title': 'Просвистела', 'file': '../../../../../../../../F:/MUSIK/DDT/1999 - Просвистела/Просвистела.mp3'},
  {'icon': iconImage, 'title': 'Просвистела', 'file': '../../../../../../../../F:/MUSIK/DDT/2001 - Два концерта Москва-Петербург1/Просвистела.mp3'},
  {'icon': iconImage, 'title': 'Просвистела', 'file': '../../../../../../../../F:/MUSIK/DDT/1999 - Просвистела/Просвистела.mp4'},
  {'icon': iconImage, 'title': 'Пустота', 'file': '../../../../../../../../F:/MUSIK/DDT/2011 - Иначе/Пустота.mp3'},
  {'icon': iconImage, 'title': 'Разговор На Войне', 'file': '../../../../../../../../F:/MUSIK/DDT/2007 - Прекрасная любовь/Разговор на войне.mp3'},
  {'icon': iconImage, 'title': 'Расстреляли Рассветами', 'file': '../../../../../../../../F:/MUSIK/DDT/1998 - Мир номер ноль/Расстреляли рассветами .mp3'},
  {'icon': iconImage, 'title': 'Расстреляли Рассветами', 'file': '../../../../../../../../F:/MUSIK/DDT/1998 - Мир номер ноль/Расстреляли рассветами.mp3'},
  {'icon': iconImage, 'title': 'Реальность', 'file': '../../../../../../../../F:/MUSIK/DDT/2014 - Прозрачный/Реальность.mp3'},
  {'icon': iconImage, 'title': 'Революция', 'file': '../../../../../../../../F:/MUSIK/DDT/1988 - Я получил эту роль/Революция.mp3'},
  {'icon': iconImage, 'title': 'Родина', 'file': '../../../../../../../../F:/MUSIK/DDT/1992 - Актриса весна/Родина.mp3'},
  {'icon': iconImage, 'title': 'Родина', 'file': '../../../../../../../../F:/MUSIK/DDT/2001 - Два концерта Москва-Петербург2/Родина.mp3'},
  {'icon': iconImage, 'title': 'Рожденный В Ссср', 'file': '../../../../../../../../F:/MUSIK/DDT/1997 - Рожденный в СССР/Рожденный в СССР.mp3'},
  {'icon': iconImage, 'title': 'Рождественская', 'file': '../../../../../../../../F:/MUSIK/DDT/1993 - Черный пес Петербург/Рождественская.mp3'},
  {'icon': iconImage, 'title': 'Рождество Ночная Пьеса', 'file': '../../../../../../../../F:/MUSIK/DDT/2004 - Город без окон - Выход/Рождество ночная пьеса.mp3'},
  {'icon': iconImage, 'title': 'Рождество Ночная Пьеса', 'file': '../../../../../../../../F:/MUSIK/DDT/2004 - Город без окон - Выход/Рождество ночная пьеса.mp4'},
  {'icon': iconImage, 'title': 'Российское Танго', 'file': '../../../../../../../../F:/MUSIK/DDT/1995 - Это все/Российское танго.mp3'},
  {'icon': iconImage, 'title': 'Россияне', 'file': '../../../../../../../../F:/MUSIK/DDT/2000 - Метель августа/Россияне.mp3'},
  {'icon': iconImage, 'title': 'Русская Весна', 'file': '../../../../../../../../F:/MUSIK/DDT/2018 - Галя ходи/Русская весна.mp3'},
  {'icon': iconImage, 'title': 'Свинья На Радуге', 'file': '../../../../../../../../F:/MUSIK/DDT/1982 - Свинья на радуге/Свинья на радуге.mp3'},
  {'icon': iconImage, 'title': 'Свобода', 'file': '../../../../../../../../F:/MUSIK/DDT/2000 - Метель августа/Свобода.mp3'},
  {'icon': iconImage, 'title': 'Свобода', 'file': '../../../../../../../../F:/MUSIK/DDT/2001 - Два концерта Москва-Петербург2/Свобода.mp3'},
  {'icon': iconImage, 'title': 'Сказка', 'file': '../../../../../../../../F:/MUSIK/DDT/1996 - Любовь/Сказка.mp3'},
  {'icon': iconImage, 'title': 'Смерть Поэта', 'file': '../../../../../../../../F:/MUSIK/DDT/2001 - Два концерта Москва-Петербург1/Смерть поэта.mp3'},
  {'icon': iconImage, 'title': 'Спой Бг', 'file': '../../../../../../../../F:/MUSIK/DDT/Спой БГ.mp3'},
  {'icon': iconImage, 'title': 'Спокойно Дружище', 'file': '../../../../../../../../F:/MUSIK/DDT/Спокойно, дружище.mp4'},
  {'icon': iconImage, 'title': 'Суббота', 'file': '../../../../../../../../F:/MUSIK/DDT/1990 - Оттепель/Суббота.mp3'},
  {'icon': iconImage, 'title': 'Счастливый День', 'file': '../../../../../../../../F:/MUSIK/DDT/1982 - Свинья на радуге/Счастливый день.mp3'},
  {'icon': iconImage, 'title': 'Танго Войны', 'file': '../../../../../../../../F:/MUSIK/DDT/2004 - Город без окон - Вход/Танго Войны.mp3'},
  {'icon': iconImage, 'title': 'Террорист', 'file': '../../../../../../../../F:/MUSIK/DDT/1988 - Я получил эту роль/Террорист.mp3'},
  {'icon': iconImage, 'title': 'Ты Не Один', 'file': '../../../../../../../../F:/MUSIK/DDT/1993 - Черный пес Петербург/Ты не один .mp3'},
  {'icon': iconImage, 'title': 'Ты Не Один', 'file': '../../../../../../../../F:/MUSIK/DDT/1993 - Черный пес Петербург/Ты не один.mp3'},
  {'icon': iconImage, 'title': 'У Тебя Есть Сын', 'file': '../../../../../../../../F:/MUSIK/DDT/1992 - Актриса весна/У тебя есть сын.mp3'},
  {'icon': iconImage, 'title': 'Фома', 'file': '../../../../../../../../F:/MUSIK/DDT/1992 - Актриса весна/Фома.mp3'},
  {'icon': iconImage, 'title': 'Хипаны', 'file': '../../../../../../../../F:/MUSIK/DDT/1988 - Я получил эту роль/Хипаны.mp3'},
  {'icon': iconImage, 'title': 'Храм', 'file': '../../../../../../../../F:/MUSIK/DDT/1992 - Актриса весна/Храм.mp3'},
  {'icon': iconImage, 'title': 'Церковь', 'file': '../../../../../../../../F:/MUSIK/DDT/1990 - Оттепель/Церковь.mp3'},
  {'icon': iconImage, 'title': 'Цыганочка', 'file': '../../../../../../../../F:/MUSIK/DDT/2006 - DDT Family/Цыганочка.mp3'},
  {'icon': iconImage, 'title': 'Цыганская', 'file': '../../../../../../../../F:/MUSIK/DDT/2006 - DDT Family/Цыганская.mp3'},
  {'icon': iconImage, 'title': 'Черно Белые Танцы', 'file': '../../../../../../../../F:/MUSIK/DDT/1998 - Мир номер ноль/Черно-белые танцы.mp3'},
  {'icon': iconImage, 'title': 'Черный Пес Петербург', 'file': '../../../../../../../../F:/MUSIK/DDT/1993 - Черный пес Петербург/Черный Пес Петербург.mp3'},
  {'icon': iconImage, 'title': 'Черный Пес Петербург', 'file': '../../../../../../../../F:/MUSIK/DDT/2001 - Два концерта Москва-Петербург2/Черный пес Петербург.mp3'},
  {'icon': iconImage, 'title': 'Четыре Окна', 'file': '../../../../../../../../F:/MUSIK/DDT/1995 - Это все/Четыре окна.mp3'},
  {'icon': iconImage, 'title': 'Что Такое Осень', 'file': '../../../../../../../../F:/MUSIK/DDT/1993 - Черный пес Петербург/Что такое осень.mp3'},
  {'icon': iconImage, 'title': 'Что Такое Осень', 'file': '../../../../../../../../F:/MUSIK/DDT/2001 - Два концерта Москва-Петербург2/Что такое осень.mp3'},
  {'icon': iconImage, 'title': 'Это Все', 'file': '../../../../../../../../F:/MUSIK/DDT/1995 - Это все/Это все.mp3'},
  {'icon': iconImage, 'title': 'Я Завтра Брошу Пить', 'file': '../../../../../../../../F:/MUSIK/DDT/2001 - Два концерта Москва-Петербург1/Я завтра брошу пить.mp3'},
  {'icon': iconImage, 'title': 'Я Зажог В Церквях Все Свечи', 'file': '../../../../../../../../F:/MUSIK/DDT/1993 - Черный пес Петербург/Я зажог в церквях все свечи.mp3'},
  {'icon': iconImage, 'title': 'Я Остановил Время', 'file': '../../../../../../../../F:/MUSIK/DDT/1993 - Черный пес Петербург/Я остановил время.mp3'},
  {'icon': iconImage, 'title': 'Я Остановил Время', 'file': '../../../../../../../../F:/MUSIK/DDT/1993 - Черный пес Петербург/Я остановил время.mp4'},
  {'icon': iconImage, 'title': 'Я Получил Эту Роль', 'file': '../../../../../../../../F:/MUSIK/DDT/1988 - Я получил эту роль/Я получил эту роль.mp3'},
  {'icon': iconImage, 'title': 'Я Сижу На Жестком Табурете', 'file': '../../../../../../../../F:/MUSIK/DDT/1983 - Компромис/Я сижу на жестком табурете.mp3'},
  {'icon': iconImage, 'title': 'Я У Вас', 'file': '../../../../../../../../F:/MUSIK/DDT/1996 - Любовь/Я у вас.mp3'},
  {'icon': iconImage, 'title': 'Январским Вечером Храним', 'file': '../../../../../../../../F:/MUSIK/DDT/Январским Вечером Храним.mp4'},
]);
})

document.getElementById('depechemode').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A Pain That Im Used To', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/2005 Playing The Angel/A Pain That I%27m Used To.mp3'},
  {'icon': iconImage, 'title': 'Alone', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/2013 Delta Machine (Deluxe Edition, 2CD) (CD 1)/Alone.mp3'},
  {'icon': iconImage, 'title': 'Black Celebration', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/1986 Black Celebration/Black Celebration.mp3'},
  {'icon': iconImage, 'title': 'Broken', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/2013 Delta Machine (Deluxe Edition, 2CD) (CD 1)/Broken.mp3'},
  {'icon': iconImage, 'title': 'But Not Tonight', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/1986 Black Celebration/But Not Tonight.mp3'},
  {'icon': iconImage, 'title': 'Enjoy The Silence', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/1990 Violator/Enjoy the Silence.mp3'},
  {'icon': iconImage, 'title': 'Enjoy The Silence', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/1990 Violator/Enjoy the Silence.mp4'},
  {'icon': iconImage, 'title': 'Heaven', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/2013 Delta Machine (Deluxe Edition, 2CD) (CD 1)/Heaven.mp3'},
  {'icon': iconImage, 'title': 'Heaven', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/2013 Delta Machine (Deluxe Edition, 2CD) (CD 1)/Heaven.mp4'},
  {'icon': iconImage, 'title': 'Home', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/1997 Ultra/Home.mp3'},
  {'icon': iconImage, 'title': 'I Feel You', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/1993 Songs of Faith and Devotion/I Feel You.mp3'},
  {'icon': iconImage, 'title': 'In Your Room', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/1993 Songs of Faith and Devotion/In Your Room.mp3'},
  {'icon': iconImage, 'title': 'Little 15', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/1987 Music For The Masses/Little 15.mp3'},
  {'icon': iconImage, 'title': 'Never Let Me Down Again', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/1987 Music For The Masses/Never Let Me Down Again.mp3'},
  {'icon': iconImage, 'title': 'Nothings Impossible', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/2005 Playing The Angel/Nothing%27s Impossible.mp3'},
  {'icon': iconImage, 'title': 'Personal Jesus', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/1990 Violator/Personal Jesus.mp3'},
  {'icon': iconImage, 'title': 'Personal Jesus', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/1996 - The Singles %2786-%2798 (1998)/Personal Jesus.mp3'},
  {'icon': iconImage, 'title': 'Personal Jesus', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/1990 Violator/Personal Jesus.mp4'},
  {'icon': iconImage, 'title': 'Secret To The End', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/2013 Delta Machine (Deluxe Edition, 2CD) (CD 1)/Secret To The End.mp3'},
  {'icon': iconImage, 'title': 'Soothe My Soul', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/2013 Delta Machine (Deluxe Edition, 2CD) (CD 1)/Soothe My Soul.mp3'},
  {'icon': iconImage, 'title': 'Strangelove', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/1987 Music For The Masses/Strangelove.mp3'},
  {'icon': iconImage, 'title': 'Strangelove', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/1996 - The Singles %2786-%2798 (1998)/Strangelove.mp3'},
  {'icon': iconImage, 'title': 'Strippedd', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/1986 Black Celebration/Strippedd.mp3'},
  {'icon': iconImage, 'title': 'Sweetest Perfection', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/1990 Violator/Sweetest Perfection.mp3'},
  {'icon': iconImage, 'title': 'Sweetest Perfection', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/2009 Sounds Of The Universe/Sweetest Perfection .mp3'},
  {'icon': iconImage, 'title': 'The Sinner In Me', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/2005 Playing The Angel/The Sinner In Me.mp3'},
  {'icon': iconImage, 'title': 'To Have And To Hold (spanish Taster)', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/1987 Music For The Masses/To Have And To Hold (Spanish Taster).mp3'},
  {'icon': iconImage, 'title': 'Walking In My Shoes', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/1993 Songs of Faith and Devotion/Walking In My Shoes.mp3'},
  {'icon': iconImage, 'title': 'Welcome To My World', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/2013 Delta Machine (Deluxe Edition, 2CD) (CD 1)/Welcome To My World.mp3'},
  {'icon': iconImage, 'title': 'World In My Eyes', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/1990 Violator/World in My Eyes.mp3'},
  {'icon': iconImage, 'title': 'Wrong', 'file': '../../../../../../../../F:/MUSIK/Depeche Mode/2009 Sounds Of The Universe/Wrong.mp3'},
]);
})

document.getElementById('eltonjohn').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Believe', 'file': '../../../../../../../../F:/MUSIK/Elton John/1995 - Made In England/Believe.mp3'},
  {'icon': iconImage, 'title': 'Blessed', 'file': '../../../../../../../../F:/MUSIK/Elton John/1995 - Love Songs/Blessed.mp3'},
  {'icon': iconImage, 'title': 'Electricity', 'file': '../../../../../../../../F:/MUSIK/Elton John/2005 - Electricity/Electricity.mp3'},
  {'icon': iconImage, 'title': 'Ive Been Loving You', 'file': '../../../../../../../../F:/MUSIK/Elton John/1992 - Rare Masters/Ive been loving you.mp3'},
  {'icon': iconImage, 'title': 'Nikita', 'file': '../../../../../../../../F:/MUSIK/Elton John/1995 - Love Songs/Nikita.mp3'},
  {'icon': iconImage, 'title': 'Original Sin', 'file': '../../../../../../../../F:/MUSIK/Elton John/2001 - Songs from the West Coast/Original sin.mp3'},
  {'icon': iconImage, 'title': 'Shoot Down The Moon', 'file': '../../../../../../../../F:/MUSIK/Elton John/1985 - Ice On Fire/Shoot down the moon.mp3'},
  {'icon': iconImage, 'title': 'Sorry Seems To Be The Hardest Word', 'file': '../../../../../../../../F:/MUSIK/Elton John/1987 - Live In Australia/Sorry seems to be the hardest word.mp3'},
  {'icon': iconImage, 'title': 'To Young', 'file': '../../../../../../../../F:/MUSIK/Elton John/1985 - Ice On Fire/To young.mp3'},
  {'icon': iconImage, 'title': 'Without Question', 'file': '../../../../../../../../F:/MUSIK/Elton John/2000 - The Road To El Dorado/Without question.mp3'},
  {'icon': iconImage, 'title': 'Wonders Of The New World', 'file': '../../../../../../../../F:/MUSIK/Elton John/2000 - The Road To El Dorado/Wonders of the new world.mp3'},
]);
})

document.getElementById('enya').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A Day Without Rain', 'file': '../../../../../../../../F:/MUSIK/Enya/2000 - A Day Without Rain/A Day Without Rain.mp3'},
  {'icon': iconImage, 'title': 'After Ventus', 'file': '../../../../../../../../F:/MUSIK/Enya/1991 - Shepherd Moons/After Ventus.mp3'},
  {'icon': iconImage, 'title': 'Aldebaran', 'file': '../../../../../../../../F:/MUSIK/Enya/1987 - Enya/Aldebaran.mp3'},
  {'icon': iconImage, 'title': 'Amarantine', 'file': '../../../../../../../../F:/MUSIK/Enya/2005 - Amarantine/Amarantine.mp3'},
  {'icon': iconImage, 'title': 'Aniron', 'file': '../../../../../../../../F:/MUSIK/Enya/2009 - The Very Best of Enya/Aniron.mp3'},
  {'icon': iconImage, 'title': 'Anywhere Is', 'file': '../../../../../../../../F:/MUSIK/Enya/1995 - The Memory Of Trees/Anywhere Is.mp3'},
  {'icon': iconImage, 'title': 'Athair Ar Neamh', 'file': '../../../../../../../../F:/MUSIK/Enya/2006 - Taliesin Orchestra/Athair Ar Neamh.mp3'},
  {'icon': iconImage, 'title': 'Boadicea', 'file': '../../../../../../../../F:/MUSIK/Enya/1997 - Box Of Dreams (Oceans)/Boadicea.mp3'},
  {'icon': iconImage, 'title': 'Book Of Days', 'file': '../../../../../../../../F:/MUSIK/Enya/1991 - Shepherd Moons/Book of Days.mp3'},
  {'icon': iconImage, 'title': 'Caribbean Blue', 'file': '../../../../../../../../F:/MUSIK/Enya/1991 - Caribbean Blue/Caribbean Blue.mp3'},
  {'icon': iconImage, 'title': 'China Roses', 'file': '../../../../../../../../F:/MUSIK/Enya/1997 - Paint the Sky with Stars/China Roses.mp3'},
  {'icon': iconImage, 'title': 'Ebudae', 'file': '../../../../../../../../F:/MUSIK/Enya/1991 - Shepherd Moons/Ebudae.mp3'},
  {'icon': iconImage, 'title': 'Elian', 'file': '../../../../../../../../F:/MUSIK/Enya/2005 - Sumiregusa/Elian.mp3'},
  {'icon': iconImage, 'title': 'Evening Falls ', 'file': '../../../../../../../../F:/MUSIK/Enya/1997 - Box Of Dreams (Stars)/Evening Falls....mp3'},
  {'icon': iconImage, 'title': 'Exile', 'file': '../../../../../../../../F:/MUSIK/Enya/1988 - Watermark/Exile.mp3'},
  {'icon': iconImage, 'title': 'Floras Secret', 'file': '../../../../../../../../F:/MUSIK/Enya/2000 - A Day Without Rain/Flora%27s Secret.mp3'},
  {'icon': iconImage, 'title': 'I Want Tomorrow', 'file': '../../../../../../../../F:/MUSIK/Enya/1987 - Enya/I Want Tomorrow.mp3'},
  {'icon': iconImage, 'title': 'Lazy Days', 'file': '../../../../../../../../F:/MUSIK/Enya/2001 - Oceans/Lazy Days.mp3'},
  {'icon': iconImage, 'title': 'Lothlorien', 'file': '../../../../../../../../F:/MUSIK/Enya/1991 - Shepherd Moons/Lothlorien.mp3'},
  {'icon': iconImage, 'title': 'May It Be', 'file': '../../../../../../../../F:/MUSIK/Enya/2001 - May it be/May It Be.mp3'},
  {'icon': iconImage, 'title': 'Mysterium', 'file': '../../../../../../../../F:/MUSIK/Enya/2005 - Sumiregusa/Mysterium.mp3'},
  {'icon': iconImage, 'title': 'On My Way Home', 'file': '../../../../../../../../F:/MUSIK/Enya/1996 - On My Way Home/On my way home.mp3'},
  {'icon': iconImage, 'title': 'One By One', 'file': '../../../../../../../../F:/MUSIK/Enya/2000 - A Day Without Rain/One By One.mp3'},
  {'icon': iconImage, 'title': 'Only If You Want To', 'file': '../../../../../../../../F:/MUSIK/Enya/1997 - Box Of Dreams (Oceans)/Only If You Want To.mp3'},
  {'icon': iconImage, 'title': 'Only Time', 'file': '../../../../../../../../F:/MUSIK/Enya/2000 - A Day Without Rain/Only Time.mp3'},
  {'icon': iconImage, 'title': 'Orinoco Flow', 'file': '../../../../../../../../F:/MUSIK/Enya/1988 - Watermark/Orinoco Flow.mp3'},
  {'icon': iconImage, 'title': 'Pilgrim', 'file': '../../../../../../../../F:/MUSIK/Enya/2002 - Best Of Enya/Pilgrim.mp3'},
  {'icon': iconImage, 'title': 'Shepherd Moons', 'file': '../../../../../../../../F:/MUSIK/Enya/1991 - Shepherd Moons/Shepherd Moons.mp3'},
  {'icon': iconImage, 'title': 'Somebody Said Goodbye', 'file': '../../../../../../../../F:/MUSIK/Enya/2005 - Amarantine/Somebody Said Goodbye.mp3'},
  {'icon': iconImage, 'title': 'St Patrick Cu Chulainn Oisin', 'file': '../../../../../../../../F:/MUSIK/Enya/2008 - Greatest Hits/St. Patrick-Cu Chulainn-Oisin.mp3'},
  {'icon': iconImage, 'title': 'Storms In Africa', 'file': '../../../../../../../../F:/MUSIK/Enya/1988 - Watermark/Storms In Africa.mp3'},
  {'icon': iconImage, 'title': 'Sumiregusa', 'file': '../../../../../../../../F:/MUSIK/Enya/2005 - Sumiregusa/Sumiregusa.mp3'},
  {'icon': iconImage, 'title': 'Tempus Vernum', 'file': '../../../../../../../../F:/MUSIK/Enya/2000 - A Day Without Rain/Tempus Vernum.mp3'},
  {'icon': iconImage, 'title': 'The Celts', 'file': '../../../../../../../../F:/MUSIK/Enya/1987 - Enya/The Celts.mp3'},
  {'icon': iconImage, 'title': 'The First Of Autumn', 'file': '../../../../../../../../F:/MUSIK/Enya/2000 - A Day Without Rain/The First Of Autumn.mp3'},
  {'icon': iconImage, 'title': 'The Memory Of Trees', 'file': '../../../../../../../../F:/MUSIK/Enya/1995 - The Memory Of Trees/The Memory Of Trees.mp3'},
  {'icon': iconImage, 'title': 'Trains And Winter Rains', 'file': '../../../../../../../../F:/MUSIK/Enya/2008 - And Winter Came/Trains And Winter Rains.mp3'},
  {'icon': iconImage, 'title': 'Watermark', 'file': '../../../../../../../../F:/MUSIK/Enya/1988 - Watermark/Watermark.mp3'},
  {'icon': iconImage, 'title': 'We Wish You A Merry Christmas', 'file': '../../../../../../../../F:/MUSIK/Enya/2005 - Amarantine Special Christmas Edition/We Wish You a Merry Christmas.mp3'},
  {'icon': iconImage, 'title': 'Wild Child', 'file': '../../../../../../../../F:/MUSIK/Enya/2000 - A Day Without Rain/Wild Child.mp3'},
]);
})

document.getElementById('era').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'After Time', 'file': '../../../../../../../../F:/MUSIK/Era/1998 - Era/After Time.mp3'},
  {'icon': iconImage, 'title': 'Ameno', 'file': '../../../../../../../../F:/MUSIK/Era/1998 - Era/Ameno.mp3'},
  {'icon': iconImage, 'title': 'Avatar', 'file': '../../../../../../../../F:/MUSIK/Era/1998 - Infinity/Avatar.mp3'},
  {'icon': iconImage, 'title': 'Divano', 'file': '../../../../../../../../F:/MUSIK/Era/2000 - Era/Divano.mp3'},
  {'icon': iconImage, 'title': 'Enae Volare Mezzo', 'file': '../../../../../../../../F:/MUSIK/Era/1998 - Era/Enae Volare Mezzo.mp3'},
  {'icon': iconImage, 'title': 'Habanera', 'file': '../../../../../../../../F:/MUSIK/Era/1998 - Infinity/Habanera.mp3'},
  {'icon': iconImage, 'title': 'Hymne', 'file': '../../../../../../../../F:/MUSIK/Era/2000 - Era/Hymne.mp3'},
  {'icon': iconImage, 'title': 'Madona', 'file': '../../../../../../../../F:/MUSIK/Era/2000 - Era/Madona.mp3'},
  {'icon': iconImage, 'title': 'Mirror', 'file': '../../../../../../../../F:/MUSIK/Era/1998 - Era/Mirror.mp3'},
  {'icon': iconImage, 'title': 'Misere Mani', 'file': '../../../../../../../../F:/MUSIK/Era/2000 - Era/Misere Mani.mp3'},
  {'icon': iconImage, 'title': 'Mother', 'file': '../../../../../../../../F:/MUSIK/Era/1998 - Era/Mother.mp3'},
  {'icon': iconImage, 'title': 'Sempire Damor', 'file': '../../../../../../../../F:/MUSIK/Era/1998 - Era/Sempire D%27Amor.mp3'},
  {'icon': iconImage, 'title': 'The Mass', 'file': '../../../../../../../../F:/MUSIK/Era/2003 - The Mass/The Mass.mp3'},
]);
})

document.getElementById('evanescence').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Anywhere', 'file': '../../../../../../../../F:/MUSIK/Evanescence/2000 - Origin/Anywhere.mp3'},
  {'icon': iconImage, 'title': 'Anywhere', 'file': '../../../../../../../../F:/MUSIK/Evanescence/Origin/Anywhere .Mp3'},
  {'icon': iconImage, 'title': 'Ascension Of The Spirit', 'file': '../../../../../../../../F:/MUSIK/Evanescence/1996 - Demos/Ascension Of The Spirit.mp3'},
  {'icon': iconImage, 'title': 'Away From Me', 'file': '../../../../../../../../F:/MUSIK/Evanescence/2000 - Origin/Away From Me.mp3'},
  {'icon': iconImage, 'title': 'Away From Me', 'file': '../../../../../../../../F:/MUSIK/Evanescence/Origin/Away From Me .Mp3'},
  {'icon': iconImage, 'title': 'Bring Me To Life', 'file': '../../../../../../../../F:/MUSIK/Evanescence/Bring Me to Life.mp3'},
  {'icon': iconImage, 'title': 'Bring Me To Life', 'file': '../../../../../../../../F:/MUSIK/Evanescence/2003 - Bring Me To Life/Bring me to life.mp3'},
  {'icon': iconImage, 'title': 'Evanescence Track 10', 'file': '../../../../../../../../F:/MUSIK/Evanescence/Evanescence - Track 10.mp3'},
  {'icon': iconImage, 'title': 'Evrywhere', 'file': '../../../../../../../../F:/MUSIK/Evanescence/Ultra Rare Trax Vol. 1/Evrywhere.mp3'},
  {'icon': iconImage, 'title': 'Going Under', 'file': '../../../../../../../../F:/MUSIK/Evanescence/2003 - Going Under/Going under.mp3'},
  {'icon': iconImage, 'title': 'Going Under', 'file': '../../../../../../../../F:/MUSIK/Evanescence/Fallen/Going Under.mp3'},
  {'icon': iconImage, 'title': 'Imaginary', 'file': '../../../../../../../../F:/MUSIK/Evanescence/2000 - Origin/Imaginary.mp3'},
  {'icon': iconImage, 'title': 'Imaginary', 'file': '../../../../../../../../F:/MUSIK/Evanescence/Ultra Rare Trax Vol. 1/Imaginary.mp3'},
  {'icon': iconImage, 'title': 'Lies', 'file': '../../../../../../../../F:/MUSIK/Evanescence/2000 - Origin/Lies.mp3'},
  {'icon': iconImage, 'title': 'My Immortal', 'file': '../../../../../../../../F:/MUSIK/Evanescence/2000 - Origin/My Immortal.mp3'},
  {'icon': iconImage, 'title': 'Nickelback', 'file': '../../../../../../../../F:/MUSIK/Evanescence/Daredevil/Nickelback .mp3'},
  {'icon': iconImage, 'title': 'Origin', 'file': '../../../../../../../../F:/MUSIK/Evanescence/Ultra Rare Trax Vol. 1/Origin.mp3'},
  {'icon': iconImage, 'title': 'Where Will You Go', 'file': '../../../../../../../../F:/MUSIK/Evanescence/1998 - Evanescence EP/Where Will You Go.mp3'},
  {'icon': iconImage, 'title': 'Where Will You Go', 'file': '../../../../../../../../F:/MUSIK/Evanescence/Evanescence Ep/Where Will You Go.Mp3'},
  {'icon': iconImage, 'title': 'Whisper', 'file': '../../../../../../../../F:/MUSIK/Evanescence/1999 - Sound Asleep EP/Whisper.mp3'},
  {'icon': iconImage, 'title': 'Whisper', 'file': '../../../../../../../../F:/MUSIK/Evanescence/Ultra Rare Trax Vol. 1/Whisper.mp3'},
]);
})

document.getElementById('france').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A Contre Courant', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Alizee/A Contre-Courant.mp3'},
  {'icon': iconImage, 'title': 'A Toi', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/A toi.mp3'},
  {'icon': iconImage, 'title': 'Amelie Ma Dit', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Alizee/Amelie_M%27a_Dit.mp3'},
  {'icon': iconImage, 'title': 'Amies Ennemies', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Amies-Ennemies.mp3'},
  {'icon': iconImage, 'title': 'Autumn Dreams', 'file': '../../../../../../../../F:/MUSIK/FRANCE/FRANK DUVAL/Autumn Dreams.mp3'},
  {'icon': iconImage, 'title': 'Ballade Pour Adeline', 'file': '../../../../../../../../F:/MUSIK/FRANCE/FRANK DUVAL/Ballade pour Adeline.mp3'},
  {'icon': iconImage, 'title': 'Belle', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Notre Dame de Paris/Belle.mp3'},
  {'icon': iconImage, 'title': 'Bohemienne', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Notre Dame de Paris/Bohemienne.mp3'},
  {'icon': iconImage, 'title': 'Ca Va Pas Changer Le Monde', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/Ca va pas changer le monde.mp3'},
  {'icon': iconImage, 'title': 'California', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Mylene Farmer/Anamorphosee -1995/California.mp3'},
  {'icon': iconImage, 'title': 'Ces Diamants La', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Notre Dame de Paris/Ces Diamants-La.mp3'},
  {'icon': iconImage, 'title': 'Ciao Bambino Sorry', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Ciao, Bambino, Sorry.mp3'},
  {'icon': iconImage, 'title': 'Dans Les Yeux Demilie', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1978 - Dans Les Yeux d%27Emilie/Dans Les Yeux d%27Emilie.mp3'},
  {'icon': iconImage, 'title': 'Dechire', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Notre Dame de Paris/Dechire.mp3'},
  {'icon': iconImage, 'title': 'Des Mensonges En Musique', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Des Mensonges En Musique.mp3'},
  {'icon': iconImage, 'title': 'Desenchantee', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Mylene Farmer/L%27Autre -1991/Desenchantee.mp3'},
  {'icon': iconImage, 'title': 'Eaunanisme', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Mylene Farmer/Anamorphosee -1995/Eaunanisme.mp3'},
  {'icon': iconImage, 'title': 'Emmanuelles Song', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Emmanuelles Song.mp3'},
  {'icon': iconImage, 'title': 'Et Si Tu Nexistais Pas', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/Et si tu n%27existais pas.mp3'},
  {'icon': iconImage, 'title': 'Et Tournoie', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Mylene Farmer/Anamorphosee -1995/Et Tournoie.mp3'},
  {'icon': iconImage, 'title': 'Face To Face', 'file': '../../../../../../../../F:/MUSIK/FRANCE/FRANK DUVAL/Face To Face.mp3'},
  {'icon': iconImage, 'title': 'Fleur Du Mal', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Stephanie De Monaco/1986 - Ouragan/Fleur Du Mal.MP3'},
  {'icon': iconImage, 'title': 'Guantanamer', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1966 - Guantanamera/Guantanamer.mp3'},
  {'icon': iconImage, 'title': 'Ihistoire Dune Free Cest', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Mylene Farmer/Dance Remixes -2001/I%27histoire D%27une Free, C%27est.mp3'},
  {'icon': iconImage, 'title': 'Il Etait Une Fois Nous Deux', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/Il Etait une fois nous deux.mp3'},
  {'icon': iconImage, 'title': 'Il Faut Naitre A Monaco', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/Il faut naitre a monaco.mp3'},
  {'icon': iconImage, 'title': 'In Grid In Tango', 'file': '../../../../../../../../F:/MUSIK/FRANCE/In-Grid - In-Tango.mp3'},
  {'icon': iconImage, 'title': 'In Grid Milord (dj Skydreamer Remix)', 'file': '../../../../../../../../F:/MUSIK/FRANCE/In-Grid - Milord (DJ Skydreamer remix).mp3'},
  {'icon': iconImage, 'title': 'Innamoramento', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Mylene Farmer/Innamoramento/Innamoramento.mp3'},
  {'icon': iconImage, 'title': 'Intro', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Notre Dame de Paris/Intro.mp3'},
  {'icon': iconImage, 'title': 'Jai Pas Vingt Ans!', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Alizee/J%27ai pas vingt ans!.mp3'},
  {'icon': iconImage, 'title': 'Jen Ai Marre', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Alizee/J%27en Ai Marre.mp3'},
  {'icon': iconImage, 'title': 'Joe Le Taxi', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Vanessa Paradis - M & J (1988)/Joe Le Taxi.mp3'},
  {'icon': iconImage, 'title': 'La Cafe Des 3 Colombes', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/La cafe des 3 colombes.mp3'},
  {'icon': iconImage, 'title': 'La Chemin De Papa', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1967 - Les Dalton/La Chemin De Papa.mp3'},
  {'icon': iconImage, 'title': 'La Demoniselle De Deshonneur', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1978 - Dans Les Yeux d%27Emilie/La Demoniselle De Deshonneur.mp3'},
  {'icon': iconImage, 'title': 'La Fete Des Fous', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Notre Dame de Paris/La Fete Des Fous.mp3'},
  {'icon': iconImage, 'title': 'La Fleur Aux Dents', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1970 - L%27Amerique/La Fleur Aux Dents.mp3'},
  {'icon': iconImage, 'title': 'Lamerique', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1970 - L%27Amerique/L%27Amerique.mp3'},
  {'icon': iconImage, 'title': 'Last Summer Day', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Last Summer Day.mp3'},
  {'icon': iconImage, 'title': 'Le Chateau De Sable', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1978 - Dans Les Yeux d%27Emilie/Le Chateau De Sable.mp3'},
  {'icon': iconImage, 'title': 'Le Dernier Slow', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1979 - Le Dernier Slow/Le Dernier Slow.mp3'},
  {'icon': iconImage, 'title': 'Le Jardin Du Luxembourg', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/Le jardin du luxembourg.mp3'},
  {'icon': iconImage, 'title': 'Le Monture', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Notre Dame de Paris/Le Monture.mp3'},
  {'icon': iconImage, 'title': 'Le Pettit Pain Au Chocolat', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1967 - Les Dalton/Le Pettit Pain Au Chocolat.mp3'},
  {'icon': iconImage, 'title': 'Le Temps Des Cathedrales', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Notre Dame de Paris/Le Temps Des Cathedrales.mp3'},
  {'icon': iconImage, 'title': 'Le Temps Des Cathedrales Fin', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Notre Dame de Paris/Le Temps Des Cathedrales Fin.mp3'},
  {'icon': iconImage, 'title': 'Lefant Trouve', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Notre Dame de Paris/L%27Efant trouve.mp3'},
  {'icon': iconImage, 'title': 'Lequipe A Jojo', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1970 - L%27Amerique/L%27equipe A Jojo.mp3'},
  {'icon': iconImage, 'title': 'Les Champs Elysees', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1967 - Les Dalton/Les Champs-Elysees.mp3'},
  {'icon': iconImage, 'title': 'Les Cloches', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Notre Dame de Paris/Les Cloches.mp3'},
  {'icon': iconImage, 'title': 'Lete Indien', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/L%27ete indien.mp3'},
  {'icon': iconImage, 'title': 'Magnetic Fields', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Magnetic Fields.mp3'},
  {'icon': iconImage, 'title': 'Mamme Blue', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Mamme Blue.mp3'},
  {'icon': iconImage, 'title': 'Moi  Lolita', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Alizee/Moi.... Lolita.mp3'},
  {'icon': iconImage, 'title': 'Moi Lolita', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Alizee/Moi Lolita.mp4'},
  {'icon': iconImage, 'title': 'Mon Maguis', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Alizee/Mon Maguis.mp3'},
  {'icon': iconImage, 'title': 'Mon Mec A Moi', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Mon Mec A Moi.mp3'},
  {'icon': iconImage, 'title': 'Noiisette Et Cassidy', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1978 - Dans Les Yeux d%27Emilie/Noiisette Et Cassidy.mp3'},
  {'icon': iconImage, 'title': 'Non Je Ne Regrette Rien', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Non.Je Ne Regrette Rien.mp3'},
  {'icon': iconImage, 'title': 'Pardone Moi', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Pardone moi.mp3'},
  {'icon': iconImage, 'title': 'Paroles Paroles', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Paroles Paroles.mp3'},
  {'icon': iconImage, 'title': 'Regrets', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Mylene Farmer/L%27Autre -1991/Regrets.mp3'},
  {'icon': iconImage, 'title': 'Rendez Vous', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Stephanie De Monaco/1986 - Ouragan/Rendez-Vous.MP3'},
  {'icon': iconImage, 'title': 'Salut', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1975 - Et Si Tu N%27existais Pas/Salut.mp3'},
  {'icon': iconImage, 'title': 'Salut Les Amoureux', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1972 - La Complainte De L%27Heure De Pointe/Salut Les Amoureux.mp3'},
  {'icon': iconImage, 'title': 'Scaled With A Kiss', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Scaled With A Kiss.mp3'},
  {'icon': iconImage, 'title': 'Schwarzer Walzer', 'file': '../../../../../../../../F:/MUSIK/FRANCE/FRANK DUVAL/Schwarzer Walzer.mp3'},
  {'icon': iconImage, 'title': 'Si Tu Tappelles Melancolie', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1974 - Si Tu T%27appelles Melancolie/Si Tu T%27appelles Melancolie.mp3'},
  {'icon': iconImage, 'title': 'Siffler Sur La Colline', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1967 - Les Dalton/Siffler Sur La Colline.mp3'},
  {'icon': iconImage, 'title': 'Sound', 'file': '../../../../../../../../F:/MUSIK/FRANCE/FRANK DUVAL/Sound.mp3'},
  {'icon': iconImage, 'title': 'Taka Takata', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1972 - La Complainte De L%27Heure De Pointe/Taka Takata.mp3'},
  {'icon': iconImage, 'title': 'Take My Breath Away', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Take my breath away.mp3'},
  {'icon': iconImage, 'title': 'The Guitar Dont Lie (le Marche Aux Puces)', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1979 - Le Dernier Slow/The guitar don%27t lie (Le marche aux puces).mp3'},
  {'icon': iconImage, 'title': 'Tombe La Neige', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Tombe La Neige.mp3'},
  {'icon': iconImage, 'title': 'Track 8', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Mylene Farmer/TRACK__8.MP3'},
  {'icon': iconImage, 'title': 'Tristana', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Mylene Farmer/Dance Remixes -1995/Tristana.MP3'},
  {'icon': iconImage, 'title': 'Tu Vas Me Detruire', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Notre Dame de Paris/Tu Vas Me Detruire.mp3'},
  {'icon': iconImage, 'title': 'Une Histoire Damour', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Une Histoire-D%27Amour.mp3'},
  {'icon': iconImage, 'title': 'Vade Retro', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Joseph Ira Dassin/1974 - Si Tu T%27appelles Melancolie/Vade Retro.mp3'},
  {'icon': iconImage, 'title': 'Venus De Abribus', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Venus de Abribus.mp3'},
  {'icon': iconImage, 'title': 'Wanderful Live', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Wanderful Live.mp3'},
  {'icon': iconImage, 'title': 'What Can I Do', 'file': '../../../../../../../../F:/MUSIK/FRANCE/What Can I Do.mp3'},
  {'icon': iconImage, 'title': 'Xxl', 'file': '../../../../../../../../F:/MUSIK/FRANCE/Mylene Farmer/Anamorphosee -1995/XXL.mp3'},
]);
})

document.getElementById('game').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Alex Theme', 'file': '../../../../../../../../F:/MUSIK/Game/Alex Theme.mp3'},
  {'icon': iconImage, 'title': 'Bfg Division', 'file': '../../../../../../../../F:/MUSIK/Game/BFG Division.mp3'},
  {'icon': iconImage, 'title': 'Call Of Pripyat Ost Combat Theme 1', 'file': '../../../../../../../../F:/MUSIK/Game/Call of Pripyat OST - Combat Theme 1.mp3'},
  {'icon': iconImage, 'title': 'Everything Is Going To Be Okay', 'file': '../../../../../../../../F:/MUSIK/Game/Everything Is Going to Be Okay.mp3'},
  {'icon': iconImage, 'title': 'Logo1', 'file': '../../../../../../../../F:/MUSIK/Game/LOGO1.mp3'},
  {'icon': iconImage, 'title': 'Logo2', 'file': '../../../../../../../../F:/MUSIK/Game/LOGO2.mp3'},
  {'icon': iconImage, 'title': 'Semi Sacred Geometry', 'file': '../../../../../../../../F:/MUSIK/Game/Semi Sacred Geometry.mp4'},
  {'icon': iconImage, 'title': 'The Experiment', 'file': '../../../../../../../../F:/MUSIK/Game/The Experiment.mp3'},
]);
})

document.getElementById('gipsykings').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Bamboleo', 'file': '../../../../../../../../F:/MUSIK/Gipsy Kings/1988 - Gipsy Kings/Bamboleo.mp3'},
  {'icon': iconImage, 'title': 'Inspiration', 'file': '../../../../../../../../F:/MUSIK/Gipsy Kings/1988 - Gipsy Kings/Inspiration.mp3'},
  {'icon': iconImage, 'title': 'Luna De Fuego', 'file': '../../../../../../../../F:/MUSIK/Gipsy Kings/1983 - Luna De Fuego/Luna De Fuego.mp3'},
  {'icon': iconImage, 'title': 'Soy', 'file': '../../../../../../../../F:/MUSIK/Gipsy Kings/1989 - Mosaique/Soy .mp3'},
  {'icon': iconImage, 'title': 'Soy', 'file': '../../../../../../../../F:/MUSIK/Gipsy Kings/1989 - Mosaique/Soy.mp3'},
  {'icon': iconImage, 'title': 'Un Amor', 'file': '../../../../../../../../F:/MUSIK/Gipsy Kings/1988 - Gipsy Kings/Un Amor.mp3'},
  {'icon': iconImage, 'title': 'Volare', 'file': '../../../../../../../../F:/MUSIK/Gipsy Kings/1989 - Mosaique/Volare.mp3'},
  {'icon': iconImage, 'title': 'Volare (live)', 'file': '../../../../../../../../F:/MUSIK/Gipsy Kings/1989 - Mosaique/Volare (Live).mp3'},
]);
})

document.getElementById('imaginedragons').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Bad Liar', 'file': '../../../../../../../../F:/MUSIK/Imagine Dragons/Bad Liar.mp3'},
  {'icon': iconImage, 'title': 'Bad Liar', 'file': '../../../../../../../../F:/MUSIK/Imagine Dragons/Bad Liar.mp4'},
  {'icon': iconImage, 'title': 'Believer', 'file': '../../../../../../../../F:/MUSIK/Imagine Dragons/Believer.mp3'},
  {'icon': iconImage, 'title': 'Believer', 'file': '../../../../../../../../F:/MUSIK/Imagine Dragons/Believer.mp4'},
  {'icon': iconImage, 'title': 'Birds', 'file': '../../../../../../../../F:/MUSIK/Imagine Dragons/Birds.mp3'},
  {'icon': iconImage, 'title': 'Birds', 'file': '../../../../../../../../F:/MUSIK/Imagine Dragons/Birds.mp4'},
  {'icon': iconImage, 'title': 'Demons', 'file': '../../../../../../../../F:/MUSIK/Imagine Dragons/Demons.mp3'},
  {'icon': iconImage, 'title': 'Demons', 'file': '../../../../../../../../F:/MUSIK/Imagine Dragons/Demons.mp4'},
  {'icon': iconImage, 'title': 'Enemy', 'file': '../../../../../../../../F:/MUSIK/Imagine Dragons/Enemy.mp4'},
  {'icon': iconImage, 'title': 'Its Time', 'file': '../../../../../../../../F:/MUSIK/Imagine Dragons/It%27s Time.mp3'},
  {'icon': iconImage, 'title': 'Its Time', 'file': '../../../../../../../../F:/MUSIK/Imagine Dragons/It%27s Time.mp4'},
  {'icon': iconImage, 'title': 'Thunder', 'file': '../../../../../../../../F:/MUSIK/Imagine Dragons/Thunder.mp3'},
  {'icon': iconImage, 'title': 'Thunder', 'file': '../../../../../../../../F:/MUSIK/Imagine Dragons/Thunder.mp4'},
  {'icon': iconImage, 'title': 'Walking The Wire', 'file': '../../../../../../../../F:/MUSIK/Imagine Dragons/Walking The Wire.mp4'},
  {'icon': iconImage, 'title': 'Whatever It Takes', 'file': '../../../../../../../../F:/MUSIK/Imagine Dragons/Whatever It Takes.mp3'},
  {'icon': iconImage, 'title': 'Whatever It Takes', 'file': '../../../../../../../../F:/MUSIK/Imagine Dragons/Whatever It Takes.mp4'},
]);
})

document.getElementById('italiano').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Cancion Del Mariachi', 'file': '../../../../../../../../F:/MUSIK/Italiano/Cancion Del Mariachi.mp3'},
  {'icon': iconImage, 'title': 'Caruso', 'file': '../../../../../../../../F:/MUSIK/Italiano/Caruso.mp3'},
  {'icon': iconImage, 'title': 'Carusо', 'file': '../../../../../../../../F:/MUSIK/Italiano/Carusо.MP3'},
  {'icon': iconImage, 'title': 'Casa Mia', 'file': '../../../../../../../../F:/MUSIK/Italiano/Ricchi & Poveri/1990 - Hasta La Vista, Signora-Le Grand Ricchi E Poveri/Casa Mia.mp3'},
  {'icon': iconImage, 'title': 'Cosa Sei', 'file': '../../../../../../../../F:/MUSIK/Italiano/Ricchi & Poveri/1983 - Voulez Vous Dancer/Cosa Sei.mp3'},
  {'icon': iconImage, 'title': 'Cose Della Vita', 'file': '../../../../../../../../F:/MUSIK/Italiano/Cose della vita.mp3'},
  {'icon': iconImage, 'title': 'Donna Musica', 'file': '../../../../../../../../F:/MUSIK/Italiano/Donna Musica.mp3'},
  {'icon': iconImage, 'title': 'Felichita', 'file': '../../../../../../../../F:/MUSIK/Italiano/Felichita.mp3'},
  {'icon': iconImage, 'title': 'Godfather', 'file': '../../../../../../../../F:/MUSIK/Italiano/Godfather.mp3'},
  {'icon': iconImage, 'title': 'Il Tempo Se Ne Va', 'file': '../../../../../../../../F:/MUSIK/Italiano/Il tempo se ne va.mp3'},
  {'icon': iconImage, 'title': 'Italiano', 'file': '../../../../../../../../F:/MUSIK/Italiano/Italiano.mp3'},
  {'icon': iconImage, 'title': 'La Notte', 'file': '../../../../../../../../F:/MUSIK/Italiano/La notte.mp3'},
  {'icon': iconImage, 'title': 'Liberta', 'file': '../../../../../../../../F:/MUSIK/Italiano/Liberta.mp3'},
  {'icon': iconImage, 'title': 'Mamma Maria', 'file': '../../../../../../../../F:/MUSIK/Italiano/Ricchi & Poveri/1982 - Mamma Maria/Mamma Maria.mp3'},
  {'icon': iconImage, 'title': 'Mamma Maria 1983', 'file': '../../../../../../../../F:/MUSIK/Italiano/Ricchi & Poveri/1982 - Mamma Maria/Mamma Maria 1983.mp4'},
  {'icon': iconImage, 'title': 'Natalie', 'file': '../../../../../../../../F:/MUSIK/Italiano/Natalie.mp4'},
  {'icon': iconImage, 'title': 'O Sole Mio', 'file': '../../../../../../../../F:/MUSIK/Italiano/O sole mio.mp3'},
  {'icon': iconImage, 'title': 'Piccolo Amore', 'file': '../../../../../../../../F:/MUSIK/Italiano/Ricchi & Poveri/1982 - Mamma Maria/Piccolo Amore.mp3'},
  {'icon': iconImage, 'title': 'Piu Che Puoi', 'file': '../../../../../../../../F:/MUSIK/Italiano/Piu che puoi.mp3'},
  {'icon': iconImage, 'title': 'Sara Perche Ti Amo', 'file': '../../../../../../../../F:/MUSIK/Italiano/Ricchi & Poveri/Sara Perche Ti Amo .mp3'},
  {'icon': iconImage, 'title': 'Sara Perche Ti Amo', 'file': '../../../../../../../../F:/MUSIK/Italiano/Ricchi & Poveri/1981 - E Penso A Te/Sara Perche Ti Amo.mp3'},
  {'icon': iconImage, 'title': 'Senza Una Donna', 'file': '../../../../../../../../F:/MUSIK/Italiano/Senza Una Donna.mp3'},
  {'icon': iconImage, 'title': 'Sharazan', 'file': '../../../../../../../../F:/MUSIK/Italiano/Sharazan.mp3'},
  {'icon': iconImage, 'title': 'Soli', 'file': '../../../../../../../../F:/MUSIK/Italiano/Soli.mp3'},
  {'icon': iconImage, 'title': 'Solo Noi', 'file': '../../../../../../../../F:/MUSIK/Italiano/Solo Noi.mp3'},
  {'icon': iconImage, 'title': 'Sudinoi', 'file': '../../../../../../../../F:/MUSIK/Italiano/Sudinoi.mp3'},
  {'icon': iconImage, 'title': 'Sоli', 'file': '../../../../../../../../F:/MUSIK/Italiano/Sоli.mp3'},
  {'icon': iconImage, 'title': 'Tu', 'file': '../../../../../../../../F:/MUSIK/Italiano/Tu.mp3'},
  {'icon': iconImage, 'title': 'Uomini Soli', 'file': '../../../../../../../../F:/MUSIK/Italiano/Uomini soli.mp3'},
  {'icon': iconImage, 'title': 'Vivo Per Lei', 'file': '../../../../../../../../F:/MUSIK/Italiano/Vivo Per Lei.mp3'},
  {'icon': iconImage, 'title': 'Voulez Vous Dancer', 'file': '../../../../../../../../F:/MUSIK/Italiano/Ricchi & Poveri/1983 - Voulez Vous Dancer/Voulez Vous Dancer.mp3'},
]);
})

document.getElementById('koяn').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Alone I Break', 'file': '../../../../../../../../F:/MUSIK/Koяn/2002 - Untouchables/Alone I break.mp3'},
  {'icon': iconImage, 'title': 'Another Brick In The Wall', 'file': '../../../../../../../../F:/MUSIK/Koяn/2004 - GREATEST HITS/Another Brick In The Wall.mp3'},
  {'icon': iconImage, 'title': 'Coming Undone', 'file': '../../../../../../../../F:/MUSIK/Koяn/2007 - Mtv Unplugged/Coming Undone.mp3'},
  {'icon': iconImage, 'title': 'Creep', 'file': '../../../../../../../../F:/MUSIK/Koяn/2007 - Mtv Unplugged/Creep.mp3'},
  {'icon': iconImage, 'title': 'Did My Time', 'file': '../../../../../../../../F:/MUSIK/Koяn/2003 - Take a Look In The Mirror/Did My Time.mp3'},
  {'icon': iconImage, 'title': 'Eaten Up Inside', 'file': '../../../../../../../../F:/MUSIK/Koяn/2006 - Coming Undone/Eaten Up Inside.mp3'},
  {'icon': iconImage, 'title': 'Evolution', 'file': '../../../../../../../../F:/MUSIK/Koяn/2007 - Evolution/Evolution.mp3'},
  {'icon': iconImage, 'title': 'Falling Away From Me', 'file': '../../../../../../../../F:/MUSIK/Koяn/2006 - LIVE & RARE/Falling Away From Me.mp3'},
  {'icon': iconImage, 'title': 'Freak On A Leash', 'file': '../../../../../../../../F:/MUSIK/Koяn/2004 - GREATEST HITS/Freak On A Leash.mp3'},
  {'icon': iconImage, 'title': 'Here To Stay', 'file': '../../../../../../../../F:/MUSIK/Koяn/2004 - GREATEST HITS/Here To Stay.mp3'},
  {'icon': iconImage, 'title': 'Innocent Bystander', 'file': '../../../../../../../../F:/MUSIK/Koяn/2007 - Untitled/Innocent Bystander.mp3'},
  {'icon': iconImage, 'title': 'Killing', 'file': '../../../../../../../../F:/MUSIK/Koяn/2007 - Untitled/Killing.mp3'},
  {'icon': iconImage, 'title': 'Kiss', 'file': '../../../../../../../../F:/MUSIK/Koяn/2007 - Untitled/Kiss.mp3'},
  {'icon': iconImage, 'title': 'Love Song', 'file': '../../../../../../../../F:/MUSIK/Koяn/2005 - See You On The Other Side/Love Song.mp3'},
  {'icon': iconImage, 'title': 'Make It Go Away', 'file': '../../../../../../../../F:/MUSIK/Koяn/2002 - Untouchables/Make It Go Away.mp3'},
  {'icon': iconImage, 'title': 'Open Up', 'file': '../../../../../../../../F:/MUSIK/Koяn/2005 - See You On The Other Side/Open Up.mp3'},
  {'icon': iconImage, 'title': 'Somebody Someone', 'file': '../../../../../../../../F:/MUSIK/Koяn/2004 - GREATEST HITS/Somebody Someone.mp3'},
  {'icon': iconImage, 'title': 'Tear Me Down', 'file': '../../../../../../../../F:/MUSIK/Koяn/2002 - Untouchables/Tear Me Down.mp3'},
  {'icon': iconImage, 'title': 'When Will This End', 'file': '../../../../../../../../F:/MUSIK/Koяn/2003 - Take a Look In The Mirror/When Will This End.mp3'},
  {'icon': iconImage, 'title': 'Word Up!', 'file': '../../../../../../../../F:/MUSIK/Koяn/2004 - GREATEST HITS/Word Up!.mp3'},
  {'icon': iconImage, 'title': 'Word Up!', 'file': '../../../../../../../../F:/MUSIK/Koяn/2004 - GREATEST HITS/Word Up!.mp4'},
  {'icon': iconImage, 'title': 'Yall Want A Single', 'file': '../../../../../../../../F:/MUSIK/Koяn/2003 - Take a Look In The Mirror/Ya%27ll Want A Single.mp3'},
]);
})

document.getElementById('limpbizkit').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Behind Blue Eyes', 'file': '../../../../../../../../F:/MUSIK/Limp Bizkit/2003 - Results May Vary/Behind Blue Eyes.mp3'},
  {'icon': iconImage, 'title': 'Boiler', 'file': '../../../../../../../../F:/MUSIK/Limp Bizkit/2000 - Chocolate Starfish And The Hot Dog Flavored Water/Boiler.mp3'},
  {'icon': iconImage, 'title': 'Break Stuff', 'file': '../../../../../../../../F:/MUSIK/Limp Bizkit/1999 - Significant Other/Break Stuff.mp3'},
  {'icon': iconImage, 'title': 'Build A Bridge', 'file': '../../../../../../../../F:/MUSIK/Limp Bizkit/2003 - Results May Vary/Build a Bridge.mp3'},
  {'icon': iconImage, 'title': 'Faith', 'file': '../../../../../../../../F:/MUSIK/Limp Bizkit/1997-2002 - White Side - Rare, Demos and Lost sound/Faith.mp3'},
  {'icon': iconImage, 'title': 'Getcha Groove On', 'file': '../../../../../../../../F:/MUSIK/Limp Bizkit/2000 - Chocolate Starfish And The Hot Dog Flavored Water/Getcha Groove On.mp3'},
  {'icon': iconImage, 'title': 'Itll Be Ok', 'file': '../../../../../../../../F:/MUSIK/Limp Bizkit/2000 - Chocolate Starfish And The Hot Dog Flavored Water/It%27ll Be OK.mp3'},
  {'icon': iconImage, 'title': 'Lonely World', 'file': '../../../../../../../../F:/MUSIK/Limp Bizkit/2003 - Results May Vary/Lonely World.mp3'},
  {'icon': iconImage, 'title': 'My Way', 'file': '../../../../../../../../F:/MUSIK/Limp Bizkit/2000 - Chocolate Starfish And The Hot Dog Flavored Water/My Way.mp3'},
  {'icon': iconImage, 'title': 'Rollin', 'file': '../../../../../../../../F:/MUSIK/Limp Bizkit/2000 - Chocolate Starfish And The Hot Dog Flavored Water/Rollin.mp3'},
  {'icon': iconImage, 'title': 'Take A Look Around', 'file': '../../../../../../../../F:/MUSIK/Limp Bizkit/2000 - Chocolate Starfish And The Hot Dog Flavored Water/Take A Look Around.mp3'},
]);
})

document.getElementById('linkinpark').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '1stp Klosr', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/2002 - Reanimation/1stp Klosr.mp3'},
  {'icon': iconImage, 'title': 'A Place For My Head', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/1999 - Hybrid Theory/A Place For My Head.mp3'},
  {'icon': iconImage, 'title': 'All For Nothing', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/All for nothing.mp3'},
  {'icon': iconImage, 'title': 'All For Nothing', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/All For Nothing.mp4'},
  {'icon': iconImage, 'title': 'Bleed It Out', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/2007 - Minutes To Midnight/Bleed It Out.mp3'},
  {'icon': iconImage, 'title': 'Breaking The Habit', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/2003 - Meteora/Breaking The Habit.mp3'},
  {'icon': iconImage, 'title': 'Crawling', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/1999 - Hybrid Theory/Crawling.mp3'},
  {'icon': iconImage, 'title': 'Cure For The Itch', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/1999 - Hybrid Theory/Cure For the Itch.mp3'},
  {'icon': iconImage, 'title': 'Easier To Run', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/2003 - Meteora/Easier To Run.mp3'},
  {'icon': iconImage, 'title': 'Faint', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/2003 - Meteora/Faint.mp3'},
  {'icon': iconImage, 'title': 'Figure 09', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/2003 - Meteora/Figure.09.mp3'},
  {'icon': iconImage, 'title': 'Forgotten', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/1999 - Hybrid Theory/Forgotten.mp3'},
  {'icon': iconImage, 'title': 'From The Inside', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/2003 - Meteora/From The Inside.mp3'},
  {'icon': iconImage, 'title': 'Giving In', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/2006 - Project Revolution/Giving In.mp3'},
  {'icon': iconImage, 'title': 'In The End', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/1999 - Hybrid Theory/In the End.mp3'},
  {'icon': iconImage, 'title': 'Krwlng', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/2002 - Reanimation/Krwlng.mp3'},
  {'icon': iconImage, 'title': 'Leave Out All The Rest', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/2007 - Minutes To Midnight/Leave Out All The Rest.mp3'},
  {'icon': iconImage, 'title': 'My December (single)', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/2000 - Live/My December (single).mp3'},
  {'icon': iconImage, 'title': 'No More Sorrow', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/2007 - Minutes To Midnight/No More Sorrow.mp3'},
  {'icon': iconImage, 'title': 'Numb', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/2003 - Meteora/Numb.mp3'},
  {'icon': iconImage, 'title': 'One Step Closer', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/1999 - Hybrid Theory/One Step Closer.mp3'},
  {'icon': iconImage, 'title': 'P5hng Me Axwy', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/2002 - Reanimation/P5hng Me Axwy.mp3'},
  {'icon': iconImage, 'title': 'Papercut', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/1999 - Hybrid Theory/Papercut.mp3'},
  {'icon': iconImage, 'title': 'Plc 4 Mie Head', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/2002 - Reanimation/Plc.4 Mie Head.mp3'},
  {'icon': iconImage, 'title': 'Points Of Authority', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/1999 - Hybrid Theory/Points of Authority.mp3'},
  {'icon': iconImage, 'title': 'Pushing Me Away', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/1999 - Hybrid Theory/Pushing Me Away.mp3'},
  {'icon': iconImage, 'title': 'Runaway', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/1999 - Hybrid Theory/Runaway.mp3'},
  {'icon': iconImage, 'title': 'Session', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/2003 - Meteora/Session.mp3'},
  {'icon': iconImage, 'title': 'Somewhere I Belong', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/2003 - Meteora/Somewhere I Belong.mp3'},
  {'icon': iconImage, 'title': 'Wake', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/2007 - Minutes To Midnight/Wake.mp3'},
  {'icon': iconImage, 'title': 'What Ive Done', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/2007 - Minutes To Midnight/What I%27ve Done.mp3'},
  {'icon': iconImage, 'title': 'With You', 'file': '../../../../../../../../F:/MUSIK/Linkin Park/1999 - Hybrid Theory/With You.mp3'},
]);
})

document.getElementById('madonna').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'American Life', 'file': '../../../../../../../../F:/MUSIK/Madonna/2003 - American Life/American Life.mp3'},
  {'icon': iconImage, 'title': 'Beautiful Stranger', 'file': '../../../../../../../../F:/MUSIK/Madonna/1999 - Beautiful Stranger/Beautiful stranger.mp3'},
  {'icon': iconImage, 'title': 'Die Another Day', 'file': '../../../../../../../../F:/MUSIK/Madonna/2002 - Die Another Day/Die Another Day.mp3'},
  {'icon': iconImage, 'title': 'Dont Tell Me', 'file': '../../../../../../../../F:/MUSIK/Madonna/2000 - Music/Don%27t tell me.mp3'},
  {'icon': iconImage, 'title': 'Frozen', 'file': '../../../../../../../../F:/MUSIK/Madonna/1998 - Ray Of Light/Frozen.mp3'},
  {'icon': iconImage, 'title': 'La Isla Bonita', 'file': '../../../../../../../../F:/MUSIK/Madonna/1986 - True Blue/La isla bonita.mp3'},
  {'icon': iconImage, 'title': 'Live To Tell', 'file': '../../../../../../../../F:/MUSIK/Madonna/1995 - Something To Remember/Live To Tell.mp3'},
  {'icon': iconImage, 'title': 'Music', 'file': '../../../../../../../../F:/MUSIK/Madonna/2000 - Music/Music.mp3'},
  {'icon': iconImage, 'title': 'Power Of Good Bye', 'file': '../../../../../../../../F:/MUSIK/Madonna/2003 - American Life/Power of good-bye.mp3'},
  {'icon': iconImage, 'title': 'Secret', 'file': '../../../../../../../../F:/MUSIK/Madonna/1994 - Bedtime Stories/Secret.mp3'},
  {'icon': iconImage, 'title': 'Sorry', 'file': '../../../../../../../../F:/MUSIK/Madonna/2007 - The Confessions Tour/Sorry.mp3'},
  {'icon': iconImage, 'title': 'Youll See', 'file': '../../../../../../../../F:/MUSIK/Madonna/1995 - Something To Remember/You%27ll see.mp3'},
]);
})

document.getElementById('maywood').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Give Me Back My Love', 'file': '../../../../../../../../F:/MUSIK/Maywood/1980 - Late At Night/Give Me Back My Love.mp3'},
  {'icon': iconImage, 'title': 'I Only Want To Be With You', 'file': '../../../../../../../../F:/MUSIK/Maywood/1991 - Walking Back To Happiness/I Only Want To Be With You.mp3'},
  {'icon': iconImage, 'title': 'Pasadena', 'file': '../../../../../../../../F:/MUSIK/Maywood/1981 - Different Worlds/Pasadena.mp3'},
  {'icon': iconImage, 'title': 'Will You Still Love Me Tomorrow', 'file': '../../../../../../../../F:/MUSIK/Maywood/1991 - Walking Back To Happiness/Will You Still Love Me Tomorrow.mp3'},
]);
})

document.getElementById('metallica').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Astronomy', 'file': '../../../../../../../../F:/MUSIK/Metallica/1998 - Garage Inc/Astronomy.mp3'},
  {'icon': iconImage, 'title': 'Bleeding Me', 'file': '../../../../../../../../F:/MUSIK/Metallica/1996 - Load/Bleeding Me.mp3'},
  {'icon': iconImage, 'title': 'Devils Dance', 'file': '../../../../../../../../F:/MUSIK/Metallica/1997 - Reload/Devil%27s Dance.mp3'},
  {'icon': iconImage, 'title': 'Enter Sandman', 'file': '../../../../../../../../F:/MUSIK/Metallica/1991 - Metallica/Enter Sandman.mp3'},
  {'icon': iconImage, 'title': 'Fade To Black', 'file': '../../../../../../../../F:/MUSIK/Metallica/1984 - Ride The Lightning/Fade To Black.mp3'},
  {'icon': iconImage, 'title': 'Fuel', 'file': '../../../../../../../../F:/MUSIK/Metallica/1997 - Reload/Fuel.mp3'},
  {'icon': iconImage, 'title': 'Hero Of The Day', 'file': '../../../../../../../../F:/MUSIK/Metallica/1996 - Load/Hero Of The Day.mp3'},
  {'icon': iconImage, 'title': 'I Disappear', 'file': '../../../../../../../../F:/MUSIK/Metallica/2003 - St. Anger/I Disappear.MP3'},
  {'icon': iconImage, 'title': 'Loverman', 'file': '../../../../../../../../F:/MUSIK/Metallica/1991 - Metallica/Loverman.mp3'},
  {'icon': iconImage, 'title': 'Low Mans Lyric', 'file': '../../../../../../../../F:/MUSIK/Metallica/1997 - Reload/Low Man%27s Lyric.mp3'},
  {'icon': iconImage, 'title': 'Mama Said', 'file': '../../../../../../../../F:/MUSIK/Metallica/1996 - Load/Mama Said.mp3'},
  {'icon': iconImage, 'title': 'Master Of Puppets (live Berlin 09 12 2008)', 'file': '../../../../../../../../F:/MUSIK/Metallica/2008 - All Nightmare Long/Master of Puppets (Live Berlin 09.12.2008).mp3'},
  {'icon': iconImage, 'title': 'No Leaf Clover', 'file': '../../../../../../../../F:/MUSIK/Metallica/1999 - S&M/No Leaf Clover.mp3'},
  {'icon': iconImage, 'title': 'Nothing Else Matters', 'file': '../../../../../../../../F:/MUSIK/Metallica/1991 - Metallica/Nothing Else Matters.mp3'},
  {'icon': iconImage, 'title': 'One', 'file': '../../../../../../../../F:/MUSIK/Metallica/1988 - And Justice For All/One.mp3'},
  {'icon': iconImage, 'title': 'Sad But True', 'file': '../../../../../../../../F:/MUSIK/Metallica/1991 - Metallica/Sad But True.mp3'},
  {'icon': iconImage, 'title': 'Shoot Me Again', 'file': '../../../../../../../../F:/MUSIK/Metallica/2003 - St. Anger/Shoot Me Again.mp3'},
  {'icon': iconImage, 'title': 'St Anger', 'file': '../../../../../../../../F:/MUSIK/Metallica/2003 - St. Anger/St. Anger.mp3'},
  {'icon': iconImage, 'title': 'The Ecstasy Of Gold', 'file': '../../../../../../../../F:/MUSIK/Metallica/1999 - S&M/The Ecstasy Of Gold.mp3'},
  {'icon': iconImage, 'title': 'The Memory Remains', 'file': '../../../../../../../../F:/MUSIK/Metallica/1997 - Reload/The Memory Remains.mp3'},
  {'icon': iconImage, 'title': 'The Outlaw Torn', 'file': '../../../../../../../../F:/MUSIK/Metallica/1996 - Load/The Outlaw Torn.mp3'},
  {'icon': iconImage, 'title': 'The Thing That Should Not Be', 'file': '../../../../../../../../F:/MUSIK/Metallica/1999 - S&M/The Thing That Should Not Be.mp3'},
  {'icon': iconImage, 'title': 'The Unforgiven', 'file': '../../../../../../../../F:/MUSIK/Metallica/1991 - Metallica/The Unforgiven.MP3'},
  {'icon': iconImage, 'title': 'The Unforgiven Ii', 'file': '../../../../../../../../F:/MUSIK/Metallica/1997 - Reload/The Unforgiven II.mp3'},
  {'icon': iconImage, 'title': 'Through The Never', 'file': '../../../../../../../../F:/MUSIK/Metallica/1991 - Metallica/Through The Never.mp3'},
  {'icon': iconImage, 'title': 'Until It Sleeps', 'file': '../../../../../../../../F:/MUSIK/Metallica/1996 - Load/Until It Sleeps.mp3'},
  {'icon': iconImage, 'title': 'Welcome Home', 'file': '../../../../../../../../F:/MUSIK/Metallica/1986 - Master Of Puppets/Welcome Home.mp3'},
  {'icon': iconImage, 'title': 'Wherever I May Roam', 'file': '../../../../../../../../F:/MUSIK/Metallica/1991 - Metallica/Wherever I May Roam.mp3'},
  {'icon': iconImage, 'title': 'Wherever I May Roam (live Berlin 09 12 2008)', 'file': '../../../../../../../../F:/MUSIK/Metallica/2008 - All Nightmare Long/Wherever I May Roam (Live Berlin 09.12.2008).mp3'},
  {'icon': iconImage, 'title': 'Whiskey In Jar', 'file': '../../../../../../../../F:/MUSIK/Metallica/1998 - Garage Inc/Whiskey In Jar.mp3'},
]);
})

document.getElementById('michaeljackson').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Bad', 'file': '../../../../../../../../F:/MUSIK/Michael Jackson/1987 - Bad/Bad.mp3'},
  {'icon': iconImage, 'title': 'Billie Jean', 'file': '../../../../../../../../F:/MUSIK/Michael Jackson/1982 - Thriller/Billie Jean.mp3'},
  {'icon': iconImage, 'title': 'Black Or White', 'file': '../../../../../../../../F:/MUSIK/Michael Jackson/1991 - Dangerous/Black Or White.mp3'},
  {'icon': iconImage, 'title': 'Come Together', 'file': '../../../../../../../../F:/MUSIK/Michael Jackson/1995 - HIStory/Come Together.mp3'},
  {'icon': iconImage, 'title': 'Dirty Diana', 'file': '../../../../../../../../F:/MUSIK/Michael Jackson/1987 - Bad/Dirty Diana.mp3'},
  {'icon': iconImage, 'title': 'Earth Song', 'file': '../../../../../../../../F:/MUSIK/Michael Jackson/1995 - HIStory/Earth Song.mp3'},
  {'icon': iconImage, 'title': 'Give In To Me', 'file': '../../../../../../../../F:/MUSIK/Michael Jackson/1991 - Dangerous/Give In To Me.mp3'},
  {'icon': iconImage, 'title': 'Human Nature', 'file': '../../../../../../../../F:/MUSIK/Michael Jackson/1982 - Thriller/Human Nature.mp3'},
  {'icon': iconImage, 'title': 'Leave Me Alone', 'file': '../../../../../../../../F:/MUSIK/Michael Jackson/1987 - Bad/Leave Me Alone.mp3'},
  {'icon': iconImage, 'title': 'Michael Jackson You Are Not Alone Live In Munic', 'file': '../../../../../../../../F:/MUSIK/Michael Jackson/1995 - HIStory/michael_jackson_-_you_are_not_alone_live_in_munic.mp3'},
  {'icon': iconImage, 'title': 'Smooth Criminal', 'file': '../../../../../../../../F:/MUSIK/Michael Jackson/1987 - Bad/Smooth Criminal.mp3'},
  {'icon': iconImage, 'title': 'They Dont Care About Us', 'file': '../../../../../../../../F:/MUSIK/Michael Jackson/1995 - HIStory/They Don%27t Care About Us.mp3'},
  {'icon': iconImage, 'title': 'You Are Not Alone', 'file': '../../../../../../../../F:/MUSIK/Michael Jackson/1995 - HIStory/You Are Not Alone.mp3'},
]);
})

document.getElementById('moderntalking').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Chery Chery Lady', 'file': '../../../../../../../../F:/MUSIK/Modern talking/Chery, Chery Lady.mp3'},
  {'icon': iconImage, 'title': 'Cinderella Girl', 'file': '../../../../../../../../F:/MUSIK/Modern talking/2001 - Win The Race/Cinderella Girl.mp3'},
  {'icon': iconImage, 'title': 'Im Not Rockfeller', 'file': '../../../../../../../../F:/MUSIK/Modern talking/I%27m not Rockfeller.mp3'},
  {'icon': iconImage, 'title': 'Last Exit To Brooklyn', 'file': '../../../../../../../../F:/MUSIK/Modern talking/2001 - America/Last Exit To Brooklyn.mp3'},
  {'icon': iconImage, 'title': 'No Face No Name No Number', 'file': '../../../../../../../../F:/MUSIK/Modern talking/No Face No Name No Number.mp3'},
  {'icon': iconImage, 'title': 'Sms To My Heart', 'file': '../../../../../../../../F:/MUSIK/Modern talking/2001 - America/SMS To My Heart.mp3'},
  {'icon': iconImage, 'title': 'Tv Makes The Superstar', 'file': '../../../../../../../../F:/MUSIK/Modern talking/2003 - Universe/TV Makes The Superstar.mp3'},
  {'icon': iconImage, 'title': 'Win The Race', 'file': '../../../../../../../../F:/MUSIK/Modern talking/2001 - America/Win The Race.mp3'},
  {'icon': iconImage, 'title': 'Youre My Heart', 'file': '../../../../../../../../F:/MUSIK/Modern talking/You%27re My Heart.mp3'},
]);
})

document.getElementById('morcheeba').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Enjoy The Wait', 'file': '../../../../../../../../F:/MUSIK/Morcheeba/1996 - Who Can You Trust_/Enjoy The Wait.mp3'},
  {'icon': iconImage, 'title': 'Fragments Of Freedom', 'file': '../../../../../../../../F:/MUSIK/Morcheeba/2000 - Fragments of Freedom/Fragments Of Freedom.mp3'},
  {'icon': iconImage, 'title': 'Otherwise', 'file': '../../../../../../../../F:/MUSIK/Morcheeba/2002 - Otherwise/Otherwise.mp3'},
]);
})

document.getElementById('musik').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '03 Дорожка 3', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Шопен Диск 1/03 Дорожка 3.mp3'},
  {'icon': iconImage, 'title': '07 Дорожка 7', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Моцарт/07 Дорожка 7.mp3'},
  {'icon': iconImage, 'title': 'Alexis Sorbas', 'file': '../../../../../../../../F:/MUSIK/MUSIK/R.King/Alexis Sorbas.mp3'},
  {'icon': iconImage, 'title': 'Break You In', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Break You In.mp4'},
  {'icon': iconImage, 'title': 'Childrens Beach In Menton', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Children%27s Beach - In Menton.mp3'},
  {'icon': iconImage, 'title': 'Edge Hill', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Edge Hill.mp3'},
  {'icon': iconImage, 'title': 'Fly', 'file': '../../../../../../../../F:/MUSIK/MUSIK/fly.mp3'},
  {'icon': iconImage, 'title': 'From The Ocean', 'file': '../../../../../../../../F:/MUSIK/MUSIK/From The Ocean.mp3'},
  {'icon': iconImage, 'title': 'Fugue In D Minor', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Fugue in D minor.mp3'},
  {'icon': iconImage, 'title': 'Hellgate Bedlam', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Hellgate bedlam.mp3'},
  {'icon': iconImage, 'title': 'Kogda Ya Zakrivaiu Glaza', 'file': '../../../../../../../../F:/MUSIK/MUSIK/kogda_ya_zakrivaiu_glaza.mp3'},
  {'icon': iconImage, 'title': 'La Petite Fille De La Mer', 'file': '../../../../../../../../F:/MUSIK/MUSIK/La Petite Fille De La Mer.mp3'},
  {'icon': iconImage, 'title': 'Le Reve', 'file': '../../../../../../../../F:/MUSIK/MUSIK/R.King/Le reve.mp3'},
  {'icon': iconImage, 'title': 'Lilly Was Here', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Lilly Was Here.mp3'},
  {'icon': iconImage, 'title': 'Love Theme From Flashdance', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Love Theme From Flashdance.mp3'},
  {'icon': iconImage, 'title': 'Lovers In Madrid', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Lovers In Madrid.mp3'},
  {'icon': iconImage, 'title': 'Morgenstimmung', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Morgenstimmung.mp3'},
  {'icon': iconImage, 'title': 'Nani Nani', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Nani, Nani.mp3'},
  {'icon': iconImage, 'title': 'Orange Walk', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Orange Walk.mp3'},
  {'icon': iconImage, 'title': 'Overdoze', 'file': '../../../../../../../../F:/MUSIK/MUSIK/OverDoze.mp3'},
  {'icon': iconImage, 'title': 'Pop Corn', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Pop Corn.mp3'},
  {'icon': iconImage, 'title': 'Preview', 'file': '../../../../../../../../F:/MUSIK/MUSIK/preview.mp3'},
  {'icon': iconImage, 'title': 'Romance De Amour', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Romance de Amour.mp3'},
  {'icon': iconImage, 'title': 'Sabres Of Paradise', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Sabres of Paradise.mp3'},
  {'icon': iconImage, 'title': 'Song Of Ocarina', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Song Of Ocarina.mp3'},
  {'icon': iconImage, 'title': 'Strangers', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Strangers.mp3'},
  {'icon': iconImage, 'title': 'Tarantul', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Tarantul.mp3'},
  {'icon': iconImage, 'title': 'Tears Of The Ocean', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Tears of the ocean.mp3'},
  {'icon': iconImage, 'title': 'The End Is Near', 'file': '../../../../../../../../F:/MUSIK/MUSIK/The End is Near.mp4'},
  {'icon': iconImage, 'title': 'The Pink Panter', 'file': '../../../../../../../../F:/MUSIK/MUSIK/The Pink Panter.mp3'},
  {'icon': iconImage, 'title': 'Three Dreams', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Three Dreams.mp3'},
  {'icon': iconImage, 'title': 'Tico Tico', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Tico-Tico.mp3'},
  {'icon': iconImage, 'title': 'Tiлsto Euphoria', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Tiлsto - Euphoria.mp3'},
  {'icon': iconImage, 'title': 'Unchained Melody', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Unchained Melody.mp3'},
  {'icon': iconImage, 'title': 'Uvertura', 'file': '../../../../../../../../F:/MUSIK/MUSIK/uvertura.mp3'},
  {'icon': iconImage, 'title': 'Valzer', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Valzer.mp3'},
  {'icon': iconImage, 'title': 'Voices In Jupiter', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Voices In Jupiter.mp3'},
  {'icon': iconImage, 'title': 'Waltz (from Sleeping Beauty)', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Waltz (From Sleeping Beauty).mp3'},
  {'icon': iconImage, 'title': 'Братан', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Братан.mp3'},
  {'icon': iconImage, 'title': 'Когда Я Закрываю Глаза', 'file': '../../../../../../../../F:/MUSIK/MUSIK/И.Крутой/Когда Я Закрываю Глаза.mp3'},
  {'icon': iconImage, 'title': 'Песнь О Друге', 'file': '../../../../../../../../F:/MUSIK/MUSIK/И.Крутой/Песнь о Друге.mp3'},
  {'icon': iconImage, 'title': 'Страна Где Ночует Солнце', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Страна где ночует солнце.mp3'},
  {'icon': iconImage, 'title': 'Трек 3', 'file': '../../../../../../../../F:/MUSIK/MUSIK/Трек  3.mp3'},
]);
})

document.getElementById('nautiluspompilius').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Гибралтар Лабрадор', 'file': '../../../../../../../../F:/MUSIK/Nautilus Pompilius/2000 - Лабрадор-Гибралтар/Гибралтар-Лабрадор.mp3'},
  {'icon': iconImage, 'title': 'Дыхание', 'file': '../../../../../../../../F:/MUSIK/Nautilus Pompilius/1995 - Крылья/Дыхание.mp3'},
  {'icon': iconImage, 'title': 'Зверь', 'file': '../../../../../../../../F:/MUSIK/Nautilus Pompilius/1991 - Титаник на Фонтанке/Зверь.mp3'},
  {'icon': iconImage, 'title': 'Князь Тишины', 'file': '../../../../../../../../F:/MUSIK/Nautilus Pompilius/1989 - Князь Тишины/Князь Тишины.mp3'},
  {'icon': iconImage, 'title': 'Крылья', 'file': '../../../../../../../../F:/MUSIK/Nautilus Pompilius/1995 - Крылья/Крылья.mp3'},
  {'icon': iconImage, 'title': 'Кто Еще ', 'file': '../../../../../../../../F:/MUSIK/Nautilus Pompilius/1995 - Крылья/Кто Еще....mp3'},
  {'icon': iconImage, 'title': 'Люди На Холме', 'file': '../../../../../../../../F:/MUSIK/Nautilus Pompilius/1997 - Яблокитай/Люди на Холме.mp3'},
  {'icon': iconImage, 'title': 'Матерь Богов', 'file': '../../../../../../../../F:/MUSIK/Nautilus Pompilius/1997 - Атлантида/Матерь Богов.mp3'},
  {'icon': iconImage, 'title': 'Моя Звезда', 'file': '../../../../../../../../F:/MUSIK/Nautilus Pompilius/Моя звезда.mp3'},
  {'icon': iconImage, 'title': 'Моя Звезда', 'file': '../../../../../../../../F:/MUSIK/Nautilus Pompilius/Моя звезда.mp4'},
  {'icon': iconImage, 'title': 'На Берегу Безымянной Реки', 'file': '../../../../../../../../F:/MUSIK/Nautilus Pompilius/1987 - Чужая Земля/На Берегу Безымянной Реки.mp3'},
  {'icon': iconImage, 'title': 'Оркестровая Увертюра', 'file': '../../../../../../../../F:/MUSIK/Nautilus Pompilius/1997 - Атлантида/Оркестровая увертюра.mp3'},
  {'icon': iconImage, 'title': 'Песня Идущего Домой', 'file': '../../../../../../../../F:/MUSIK/Nautilus Pompilius/Песня идущего домой.MP3'},
  {'icon': iconImage, 'title': 'Последнее Письмо', 'file': '../../../../../../../../F:/MUSIK/Nautilus Pompilius/1989 - Князь Тишины/Последнее Письмо.mp3'},
  {'icon': iconImage, 'title': 'Прогулки По Воде', 'file': '../../../../../../../../F:/MUSIK/Nautilus Pompilius/1987 - Чужая Земля/Прогулки По Воде.mp3'},
  {'icon': iconImage, 'title': 'Сестры Печали', 'file': '../../../../../../../../F:/MUSIK/Nautilus Pompilius/1997 - Яблокитай/Сестры Печали.mp3'},
  {'icon': iconImage, 'title': 'Таинственный Гость', 'file': '../../../../../../../../F:/MUSIK/Nautilus Pompilius/1997 - Яблокитай/Таинственный гость.mp3'},
  {'icon': iconImage, 'title': 'Тутанхамон', 'file': '../../../../../../../../F:/MUSIK/Nautilus Pompilius/1991 - Титаник на Фонтанке/Тутанхамон.mp3'},
  {'icon': iconImage, 'title': 'Хлоп Хлоп', 'file': '../../../../../../../../F:/MUSIK/Nautilus Pompilius/1996 - Акустика (Лучшие Песни)/Хлоп-Хлоп.mp3'},
  {'icon': iconImage, 'title': 'Человек На Луне', 'file': '../../../../../../../../F:/MUSIK/Nautilus Pompilius/1995 - Крылья/Человек на Луне.mp3'},
  {'icon': iconImage, 'title': 'Я Хочу Быть С Тобой', 'file': '../../../../../../../../F:/MUSIK/Nautilus Pompilius/1989 - Князь Тишины/Я Хочу Быть С Тобой.mp3'},
]);
})

document.getElementById('new').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '(02) [пикник] Мы Как Трепетные Птицы', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1993 - Коллекционный альбом %2783 - %2793 (1994, M&S records)/(02) [Пикник] Мы, Как Трепетные Птицы.mp3'},
  {'icon': iconImage, 'title': '(03) [пикник] Я Пущенная Стрела', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1993 - Коллекционный альбом %2783 - %2793 (1994, M&S records)/(03) [Пикник] Я - Пущенная Стрела.mp3'},
  {'icon': iconImage, 'title': '(04) [пикник] Там На Самом Краю Земли', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1993 - Коллекционный альбом %2783 - %2793 (1994, M&S records)/(04) [Пикник] Там, На Самом Краю Земли.mp3'},
  {'icon': iconImage, 'title': '(05) [пикник] Течёт Большая Река', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1993 - Коллекционный альбом %2783 - %2793 (1994, M&S records)/(05) [Пикник] Течёт Большая Река.mp3'},
  {'icon': iconImage, 'title': '(06) [пикник] С Тех Пор Как Сгорели Дома', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1993 - Коллекционный альбом %2783 - %2793 (1994, M&S records)/(06) [Пикник] С Тех Пор, Как Сгорели Дома.mp3'},
  {'icon': iconImage, 'title': '(07) [пикник] Это Река Ганг', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1993 - Коллекционный альбом %2783 - %2793 (1994, M&S records)/(07) [Пикник] Это Река Ганг.mp3'},
  {'icon': iconImage, 'title': '(08) [пикник] Новая Азбука', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1993 - Коллекционный альбом %2783 - %2793 (1994, M&S records)/(08) [Пикник] Новая Азбука.mp3'},
  {'icon': iconImage, 'title': '001 Julio Iglesias Nostalgie', 'file': '../../../../../../../../F:/MUSIK/New/Copy/001_Julio Iglesias - Nostalgie.mp3'},
  {'icon': iconImage, 'title': '003 Lauren Christie Colour Of The Night', 'file': '../../../../../../../../F:/MUSIK/New/Copy/003_Lauren Christie - Colour Of The Night.mp3'},
  {'icon': iconImage, 'title': '004 Elton John Believe', 'file': '../../../../../../../../F:/MUSIK/New/Copy/004_Elton John - Believe.mp3'},
  {'icon': iconImage, 'title': '005 Riccardo Fogli Storie Di Tutti I Giomi', 'file': '../../../../../../../../F:/MUSIK/New/Copy/005_Riccardo Fogli - Storie Di Tutti I Giomi.mp3'},
  {'icon': iconImage, 'title': '006 Elvis Presley Its Now Or Newer', 'file': '../../../../../../../../F:/MUSIK/New/Copy/006_Elvis Presley - It%27s Now Or Newer.mp3'},
  {'icon': iconImage, 'title': '008 Scorpions Wind Of Change', 'file': '../../../../../../../../F:/MUSIK/New/Copy/008_Scorpions - Wind Of Change.mp3'},
  {'icon': iconImage, 'title': '01 Вечер', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/01. Вечер.mp3'},
  {'icon': iconImage, 'title': '01 Вечер', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/01. Вечер.mp3'},
  {'icon': iconImage, 'title': '01 Дай Себя Сорвать', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Настоящие дни (1982-1992) (2002, Grand Records)/01  Дай себя сорвать.mp3'},
  {'icon': iconImage, 'title': '01 Декаданс', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2012 - Пикник - Певец Декаданса/01  Декаданс.mp3'},
  {'icon': iconImage, 'title': '01 Египтянин', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Смутные дни (1992-2002) (2002, Grand Records)/01   Египтянин.mp3'},
  {'icon': iconImage, 'title': '01 Египтянин', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 2/01 Египтянин.mp3'},
  {'icon': iconImage, 'title': '01 Играй Струна Играй', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2022 - Весёлый и злой/01. Играй, струна, играй.mp3'},
  {'icon': iconImage, 'title': '01 Иероглиф', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1998 - The Best (1998, Аура)/01  Иероглиф.mp3'},
  {'icon': iconImage, 'title': '01 Иероглиф', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 1/01  Иероглиф.mp3'},
  {'icon': iconImage, 'title': '01 Из Мышеловки', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2007 - Мракобесие и джаз (2007, Grand Records)/01  Из мышеловки.mp3'},
  {'icon': iconImage, 'title': '01 Кукла С Человеческим Лицом', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 3/01  Кукла с человеческим лицом.mp3'},
  {'icon': iconImage, 'title': '01 Лихорадка', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2002 - Чужой (2002, Grand Records)/01   Лихорадка.mp3'},
  {'icon': iconImage, 'title': '01 Лишь Влюбленному Вампиру', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/1995 - Вампирские песни (1995, Аура)/01   Лишь влюбленному вампиру.mp3'},
  {'icon': iconImage, 'title': '01 Настоящие Дни', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Live (2002, Музыкальный Экспресс)/01  Настоящие дни.mp3'},
  {'icon': iconImage, 'title': '01 Настоящие Дни', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Концерт с Запорожским камерным оркестром/01  Настоящие Дни.mp3'},
  {'icon': iconImage, 'title': '01 Немного Огня', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/1994 - Немного огня (1994, Контрас)/01  Немного огня.mp3'},
  {'icon': iconImage, 'title': '01 Ночь', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Фиолетово-чёрный (2001, Real Records)/01  Ночь.mp3'},
  {'icon': iconImage, 'title': '01 Ой Мороз Мороз', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2011 - Пикник - Три судьбы/01  Ой, мороз-мороз.mp3'},
  {'icon': iconImage, 'title': '01 Остров', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2005 - Новоегипетские песни (2005, Квадро-диск)/01  Остров.mp3'},
  {'icon': iconImage, 'title': '01 Серебра!', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2003 - Говорит и показывает (2003, Grand Records)/01   Серебра!.mp3'},
  {'icon': iconImage, 'title': '01 Театр Абсурда', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2010 - Театр абсурда (2010, Мистерия Звука)/01 Театр абсурда.mp3'},
  {'icon': iconImage, 'title': '01 Фиолетово Черный', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Пикник - Энциклопедия Российского Рока(2001,Grand Records)/01  Фиолетово-Черный.mp3'},
  {'icon': iconImage, 'title': '011 Abba The Winner Takes It All', 'file': '../../../../../../../../F:/MUSIK/New/Copy/011_ABBA - The Winner Takes It All.mp3'},
  {'icon': iconImage, 'title': '012 Barbara Streisand Woman In Love', 'file': '../../../../../../../../F:/MUSIK/New/Copy/012_Barbara Streisand - Woman In Love.mp3'},
  {'icon': iconImage, 'title': '015 Vanessa Paradise Joe Le Taxi', 'file': '../../../../../../../../F:/MUSIK/New/Copy/015_Vanessa Paradise - Joe Le Taxi.mp3'},
  {'icon': iconImage, 'title': '016 Chris Norman Midnight Lady', 'file': '../../../../../../../../F:/MUSIK/New/Copy/016_Chris Norman - Midnight Lady.mp3'},
  {'icon': iconImage, 'title': '02 Вечер', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Фиолетово-чёрный (2001, Real Records)/02  Вечер.mp3'},
  {'icon': iconImage, 'title': '02 Говорит И Показывает', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2003 - Говорит и показывает (2003, Grand Records)/02   Говорит и показывает.mp3'},
  {'icon': iconImage, 'title': '02 Говорит И Показывает', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 2/02  Говорит и показывает.mp3'},
  {'icon': iconImage, 'title': '02 Игла', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2012 - Пикник - Певец Декаданса/02  Игла.mp3'},
  {'icon': iconImage, 'title': '02 Истерика', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/1995 - Вампирские песни (1995, Аура)/02  Истерика.mp3'},
  {'icon': iconImage, 'title': '02 Королевство Кривых', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 3/02  Королевство кривых.mp3'},
  {'icon': iconImage, 'title': '02 Кукла С Человеческим Лицом', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2010 - Театр абсурда (2010, Мистерия Звука)/02  Кукла с человеческим лицом.mp3'},
  {'icon': iconImage, 'title': '02 Мы Как Трепетные Птицы', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/1991 - Харакири (1994, Anima Vox)/02  Мы, Как Трепетные Птицы.mp3'},
  {'icon': iconImage, 'title': '02 Немного Огня', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1998 - The Best (1998, Аура)/02  Немного огня.mp3'},
  {'icon': iconImage, 'title': '02 Немного Огня', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Смутные дни (1992-2002) (2002, Grand Records)/02   Немного огня.mp3'},
  {'icon': iconImage, 'title': '02 Ночь', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Live (2002, Музыкальный Экспресс)/02  Ночь.mp3'},
  {'icon': iconImage, 'title': '02 Ночь', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Концерт с Запорожским камерным оркестром/02  Ночь.mp3'},
  {'icon': iconImage, 'title': '02 Ночь', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Настоящие дни (1982-1992) (2002, Grand Records)/02  Ночь.mp3'},
  {'icon': iconImage, 'title': '02 Ночь', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2005 - Новоегипетские песни (2005, Квадро-диск)/02  Ночь.mp3'},
  {'icon': iconImage, 'title': '02 Опиумный Дым', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/02. Опиумный дым.mp3'},
  {'icon': iconImage, 'title': '02 Опиумный Дым', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Пикник - Энциклопедия Российского Рока(2001,Grand Records)/02  Опиумный Дым.mp3'},
  {'icon': iconImage, 'title': '02 Опиумный Дым', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/02. Опиумный дым.mp3'},
  {'icon': iconImage, 'title': '02 Полюшко Поле', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2011 - Пикник - Три судьбы/02  Полюшко-поле.mp3'},
  {'icon': iconImage, 'title': '02 Я Пущенная Стрела', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 1/02  Я - пущенная стрела.mp3'},
  {'icon': iconImage, 'title': '023 Paul Mauriat Parapluies De Cherbury', 'file': '../../../../../../../../F:/MUSIK/New/Copy/023_Paul Mauriat - Parapluies De Cherbury.mp3'},
  {'icon': iconImage, 'title': '03 Великан', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Фиолетово-чёрный (2001, Real Records)/03  Великан.mp3'},
  {'icon': iconImage, 'title': '03 Глаза Очерчены Углем', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2005 - Новоегипетские песни (2005, Квадро-диск)/03  Глаза очерчены углем.mp3'},
  {'icon': iconImage, 'title': '03 Жертвоприношение', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/1995 - Вампирские песни (1995, Аура)/03  Жертвоприношение.mp3'},
  {'icon': iconImage, 'title': '03 За Невинно Убиенных', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/1994 - Немного огня (1994, Контрас)/03  За невинно убиенных.mp3'},
  {'icon': iconImage, 'title': '03 Здась Под Желтым Солнцем Ламп', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Смутные дни (1992-2002) (2002, Grand Records)/03   Здась под желтым солнцем ламп.mp3'},
  {'icon': iconImage, 'title': '03 Из Мышеловки', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 3/03  Из мышеловки.mp3'},
  {'icon': iconImage, 'title': '03 Инквизитор', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/03. Инквизитор.mp3'},
  {'icon': iconImage, 'title': '03 Инквизитор', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/03. Инквизитор.mp3'},
  {'icon': iconImage, 'title': '03 Колдыри Да Колдобины', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2008 - Железные мантры (2008, Монолит)/03  Колдыри да колдобины.mp3'},
  {'icon': iconImage, 'title': '03 Мы Как Трепетные Птицы', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1998 - The Best (1998, Аура)/03  Мы как трепетные птицы.mp3'},
  {'icon': iconImage, 'title': '03 Не В Опере Венской ', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2010 - Театр абсурда (2010, Мистерия Звука)/03  Не в опере венской ....mp3'},
  {'icon': iconImage, 'title': '03 Не Говори Мне Нет', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Концерт с Запорожским камерным оркестром/03  Не Говори Мне Нет.mp3'},
  {'icon': iconImage, 'title': '03 Остров', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Настоящие дни (1982-1992) (2002, Grand Records)/03  Остров.mp3'},
  {'icon': iconImage, 'title': '03 Побежать Бы За Леса Горы', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2003 - Говорит и показывает (2003, Grand Records)/03   Побежать бы за леса-горы.mp3'},
  {'icon': iconImage, 'title': '03 Романс', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Live (2002, Музыкальный Экспресс)/03  Романс.mp3'},
  {'icon': iconImage, 'title': '03 У Шамана Три Руки', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 2/03  У шамана три руки.mp3'},
  {'icon': iconImage, 'title': '03 Учили Меня Летать', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Пикник - Энциклопедия Российского Рока(2001,Grand Records)/03  Учили Меня Летать.mp3'},
  {'icon': iconImage, 'title': '03 Фиолетово Черный', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 1/03  Фиолетово-черный.mp3'},
  {'icon': iconImage, 'title': '03 Фиолетово Чёрный', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2001 - Египтян (2001, Grand Records)/03  Фиолетово-чёрный.mp3'},
  {'icon': iconImage, 'title': '03 Черный Ворон', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2011 - Пикник - Три судьбы/03  Черный ворон.mp3'},
  {'icon': iconImage, 'title': '039 Madonna Youll See', 'file': '../../../../../../../../F:/MUSIK/New/Copy/039_Madonna - You%27ll See.mp3'},
  {'icon': iconImage, 'title': '04 Бал', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2005 - Новоегипетские песни (2005, Квадро-диск)/04  Бал.mp3'},
  {'icon': iconImage, 'title': '04 Великан', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/04. Великан.mp3'},
  {'icon': iconImage, 'title': '04 Великан', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/04. Великан.mp3'},
  {'icon': iconImage, 'title': '04 Вплети Меня В Свое Кружево', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2012 - Пикник - Певец Декаданса/04  Вплети меня в свое кружево.mp3'},
  {'icon': iconImage, 'title': '04 Глаза Очерчены Углем', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Live (2002, Музыкальный Экспресс)/04  Глаза очерчены углем.mp3'},
  {'icon': iconImage, 'title': '04 Глаза Очерчены Углём', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Концерт с Запорожским камерным оркестром/04  Глаза Очерчены Углём.mp3'},
  {'icon': iconImage, 'title': '04 Египтянин', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2001 - Египтян (2001, Grand Records)/04  Египтянин.mp3'},
  {'icon': iconImage, 'title': '04 Железные Мантры', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2008 - Железные мантры (2008, Монолит)/04  Железные мантры.mp3'},
  {'icon': iconImage, 'title': '04 Иероглиф', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Пикник - Энциклопедия Российского Рока(2001,Grand Records)/04  Иероглиф.mp3'},
  {'icon': iconImage, 'title': '04 Иероглиф', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Фиолетово-чёрный (2001, Real Records)/04  Иероглиф.mp3'},
  {'icon': iconImage, 'title': '04 Интересно', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Настоящие дни (1982-1992) (2002, Grand Records)/04  Интересно.mp3'},
  {'icon': iconImage, 'title': '04 Искры Около Рта', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/1995 - Вампирские песни (1995, Аура)/04  Искры около рта.mp3'},
  {'icon': iconImage, 'title': '04 Мракобесие И Джаз', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2007 - Мракобесие и джаз (2007, Grand Records)/04  Мракобесие и джаз.mp3'},
  {'icon': iconImage, 'title': '04 Немного Огня', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 3/04  Немного огня.mp3'},
  {'icon': iconImage, 'title': '04 Романс', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/1988 - Родом ниоткуда (1995, Аура)/04  Романс .mp3'},
  {'icon': iconImage, 'title': '04 Романс Сомнение', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2011 - Пикник - Три судьбы/04  Романс %27Сомнение%27.mp3'},
  {'icon': iconImage, 'title': '04 Серебра', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 1/04  Серебра.mp3'},
  {'icon': iconImage, 'title': '04 Сквозь Одежды', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2022 - Весёлый и злой/04. Сквозь одежды.mp3'},
  {'icon': iconImage, 'title': '04 Там На Самом Краю Земли', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/1991 - Харакири (1994, Anima Vox)/04  Там, На Самом Краю Земли.mp3'},
  {'icon': iconImage, 'title': '04 Твое Сердце Должно Быть Моим', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Смутные дни (1992-2002) (2002, Grand Records)/04   Твое сердце должно быть моим.mp3'},
  {'icon': iconImage, 'title': '04 Театр Абсурда', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 2/04 Театр абсурда.mp3'},
  {'icon': iconImage, 'title': '04 Шарманка', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1998 - The Best (1998, Аура)/04  Шарманка.mp3'},
  {'icon': iconImage, 'title': '05 А Учили Меня Летать', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/05. А учили меня летать.mp3'},
  {'icon': iconImage, 'title': '05 А Учили Меня Летать', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/05. А учили меня летать.mp3'},
  {'icon': iconImage, 'title': '05 Глаза Очерчены Углем', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1998 - The Best (1998, Аура)/05  Глаза очерчены углем.mp3'},
  {'icon': iconImage, 'title': '05 До Содома Далеко', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2003 - Говорит и показывает (2003, Grand Records)/05   До Содома далеко.mp3'},
  {'icon': iconImage, 'title': '05 Египтянин', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2005 - Новоегипетские песни (2005, Квадро-диск)/05  Египтянин.mp3'},
  {'icon': iconImage, 'title': '05 И Светлый Ангел Над Ним', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/1994 - Немного огня (1994, Контрас)/05  И Светлый Ангел над ним.mp3'},
  {'icon': iconImage, 'title': '05 Карлик Нос', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2010 - Театр абсурда (2010, Мистерия Звука)/05  Карлик Нос.mp3'},
  {'icon': iconImage, 'title': '05 Клоун Беспощадный', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2012 - Пикник - Певец Декаданса/05  Клоун беспощадный.mp3'},
  {'icon': iconImage, 'title': '05 Лишь Влюбленному Вампиру', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 3/05  Лишь влюбленному вампиру.mp3'},
  {'icon': iconImage, 'title': '05 Мы Как Трепетные Птицы', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Live (2002, Музыкальный Экспресс)/05  Мы как трепетные птицы.mp3'},
  {'icon': iconImage, 'title': '05 На Луче ', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2007 - Мракобесие и джаз (2007, Grand Records)/05  На луче....mp3'},
  {'icon': iconImage, 'title': '05 Настоящие Дни', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Настоящие дни (1982-1992) (2002, Grand Records)/05  Настоящие дни.mp3'},
  {'icon': iconImage, 'title': '05 Ночь', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 2/05  Ночь.mp3'},
  {'icon': iconImage, 'title': '05 Полюшко Поле (heroic Version)', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2011 - Пикник - Три судьбы/05  Полюшко-поле (heroic version).mp3'},
  {'icon': iconImage, 'title': '05 Праздник', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Пикник - Энциклопедия Российского Рока(2001,Grand Records)/05  Праздник.mp3'},
  {'icon': iconImage, 'title': '05 Раз Два ', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/1995 - Вампирские песни (1995, Аура)/05  Раз, два....mp3'},
  {'icon': iconImage, 'title': '05 Там На Самом На Краю Земли', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Концерт с Запорожским камерным оркестром/05 Там На Самом На Краю Земли.mp3'},
  {'icon': iconImage, 'title': '05 Телефон', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Фиолетово-чёрный (2001, Real Records)/05  Телефон.mp3'},
  {'icon': iconImage, 'title': '05 Фетиш', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 1/05  Фетиш.mp3'},
  {'icon': iconImage, 'title': '05 Фиолетово Черный', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Смутные дни (1992-2002) (2002, Grand Records)/05   Фиолетово-черный.mp3'},
  {'icon': iconImage, 'title': '06 J Donovan Sealed With A Kiss', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Romantic/Vellume2/06-J.Donovan-Sealed_With_A_Kiss.mp3'},
  {'icon': iconImage, 'title': '06 Бал', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2001 - Египтян (2001, Grand Records)/06  Бал.mp3'},
  {'icon': iconImage, 'title': '06 Великан', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Live (2002, Музыкальный Экспресс)/06  Великан.mp3'},
  {'icon': iconImage, 'title': '06 Великан', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Настоящие дни (1982-1992) (2002, Grand Records)/06  Великан.mp3'},
  {'icon': iconImage, 'title': '06 Глаза Очерчены Углем', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Смутные дни (1992-2002) (2002, Grand Records)/06   Глаза очерчены углем.mp3'},
  {'icon': iconImage, 'title': '06 Интересно', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Пикник - Энциклопедия Российского Рока(2001,Grand Records)/06  Интересно.mp3'},
  {'icon': iconImage, 'title': '06 Кровь Остынь (фараон)', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/1995 - Вампирские песни (1995, Аура)/06  Кровь, остынь (Фараон).mp3'},
  {'icon': iconImage, 'title': '06 Лихорадка', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 3/06  Лихорадка.mp3'},
  {'icon': iconImage, 'title': '06 Любо Братцы Любо', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2011 - Пикник - Три судьбы/06  Любо, братцы, любо.mp3'},
  {'icon': iconImage, 'title': '06 Мы Как Трепетные Птицы', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Концерт с Запорожским камерным оркестром/06  Мы Как Трепетные Птицы.mp3'},
  {'icon': iconImage, 'title': '06 Настоящие Дни', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2005 - Новоегипетские песни (2005, Квадро-диск)/06  Настоящие дни.mp3'},
  {'icon': iconImage, 'title': '06 Настоящие Дни', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 2/06  Настоящие дни.mp3'},
  {'icon': iconImage, 'title': '06 Остров', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/06. Остров.mp3'},
  {'icon': iconImage, 'title': '06 Остров', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/06. Остров.mp3'},
  {'icon': iconImage, 'title': '06 Праздник', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1998 - The Best (1998, Аура)/06  Праздник.mp3'},
  {'icon': iconImage, 'title': '06 Разбойники', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2007 - Мракобесие и джаз (2007, Grand Records)/06  Разбойники.mp3'},
  {'icon': iconImage, 'title': '06 С Тех Пор Как Сгорели Дома', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/1991 - Харакири (1994, Anima Vox)/06  С Тех Пор, Как Сгорели Дома.mp3'},
  {'icon': iconImage, 'title': '06 Самый Звонкий Крик Тишина', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/1994 - Немного огня (1994, Контрас)/06  Самый звонкий крик - тишина.mp3'},
  {'icon': iconImage, 'title': '06 Ты Вся Из Огня', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Фиолетово-чёрный (2001, Real Records)/06  Ты Вся Из Огня.mp3'},
  {'icon': iconImage, 'title': '06 Урим Туммим', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2010 - Театр абсурда (2010, Мистерия Звука)/06  Урим туммим.mp3'},
  {'icon': iconImage, 'title': '06 Шарманка', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 1/06  Шарманка.mp3'},
  {'icon': iconImage, 'title': '07 Jonny', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Romantic/Vellume2/07_Jonny.mp3'},
  {'icon': iconImage, 'title': '07 Великан', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Концерт с Запорожским камерным оркестром/07  Великан.mp3'},
  {'icon': iconImage, 'title': '07 Дай Себя Сорвать', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/1988 - Родом ниоткуда (1995, Аура)/07  Дай себя сорвать .mp3'},
  {'icon': iconImage, 'title': '07 Дай Себя Сорвать', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 1/07  Дай себя сорвать.mp3'},
  {'icon': iconImage, 'title': '07 Заратустра', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2007 - Мракобесие и джаз (2007, Grand Records)/07  Заратустра.mp3'},
  {'icon': iconImage, 'title': '07 Иероглиф', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/07. Иероглиф.mp3'},
  {'icon': iconImage, 'title': '07 Иероглиф', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/07. Иероглиф.mp3'},
  {'icon': iconImage, 'title': '07 Лихорадка', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Смутные дни (1992-2002) (2002, Grand Records)/07   Лихорадка.mp3'},
  {'icon': iconImage, 'title': '07 Лишь Влюбленному Вампиру', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Фиолетово-чёрный (2001, Real Records)/07  Лишь Влюбленному Вампиру.mp3'},
  {'icon': iconImage, 'title': '07 Мы Как Трепетные Птицы', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Настоящие дни (1982-1992) (2002, Grand Records)/07  Мы как трепетные птицы.mp3'},
  {'icon': iconImage, 'title': '07 На Самом На Краю Земли', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Пикник - Энциклопедия Российского Рока(2001,Grand Records)/07  На Самом, На Краю Земли.mp3'},
  {'icon': iconImage, 'title': '07 Ни Твоё Ни Моё', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 3/07  Ни твоё ни моё.mp3'},
  {'icon': iconImage, 'title': '07 Пикник', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/1986 - Иероглиф (1995, Союз)/07  Пикник.mp3'},
  {'icon': iconImage, 'title': '07 По Долинам М По Взгорьям', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2011 - Пикник - Три судьбы/07  По долинам м по взгорьям.mp3'},
  {'icon': iconImage, 'title': '07 Празник', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2005 - Новоегипетские песни (2005, Квадро-диск)/07  Празник.mp3'},
  {'icon': iconImage, 'title': '07 Самый Звонкий Крик Тишина', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1998 - The Best (1998, Аура)/07  Самый звонкий крик - тишина.mp3'},
  {'icon': iconImage, 'title': '07 Себе Не Найдя Двойников', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 2/07  Себе не найдя двойников.mp3'},
  {'icon': iconImage, 'title': '07 Я Пушенная Стрела', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Live (2002, Музыкальный Экспресс)/07  Я - пушенная стрела.mp3'},
  {'icon': iconImage, 'title': '08 Вертолет (i И Ii Ч )', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/1995 - Вампирские песни (1995, Аура)/08  Вертолет (I и II ч.).mp3'},
  {'icon': iconImage, 'title': '08 Все Остальное Дым', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/1988 - Родом ниоткуда (1995, Аура)/08  Все остальное дым .mp3'},
  {'icon': iconImage, 'title': '08 Глаза Очерчены Углём', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 3/08  Глаза очерчены углём.mp3'},
  {'icon': iconImage, 'title': '08 Иероглиф', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Настоящие дни (1982-1992) (2002, Grand Records)/08  Иероглиф.mp3'},
  {'icon': iconImage, 'title': '08 Инквизитор', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1998 - The Best (1998, Аура)/08  Инквизитор.mp3'},
  {'icon': iconImage, 'title': '08 Инкогнито', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2012 - Пикник - Певец Декаданса/08  Инкогнито.mp3'},
  {'icon': iconImage, 'title': '08 Лишь Влюбленному Вампиру', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Смутные дни (1992-2002) (2002, Grand Records)/08   Лишь влюбленному вампиру.mp3'},
  {'icon': iconImage, 'title': '08 Мы Как Трепетные Птицы', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 1/08  Мы как трепетные птицы.mp3'},
  {'icon': iconImage, 'title': '08 Настоящие Дни', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Пикник - Энциклопедия Российского Рока(2001,Grand Records)/08  Настоящие Дни.mp3'},
  {'icon': iconImage, 'title': '08 Немного Огня', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Live (2002, Музыкальный Экспресс)/08  Немного огня.mp3'},
  {'icon': iconImage, 'title': '08 Новая Азбука', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/1991 - Харакири (1994, Anima Vox)/08  Новая Азбука.mp3'},
  {'icon': iconImage, 'title': '08 Песня О Любви', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2011 - Пикник - Три судьбы/08  Песня о любви.mp3'},
  {'icon': iconImage, 'title': '08 Праздник', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/08. Праздник.mp3'},
  {'icon': iconImage, 'title': '08 Праздник', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/08. Праздник.mp3'},
  {'icon': iconImage, 'title': '08 Смутные Дни', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2005 - Новоегипетские песни (2005, Квадро-диск)/08  Смутные дни.mp3'},
  {'icon': iconImage, 'title': '08 Телефон', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 2/08 Телефон.mp3'},
  {'icon': iconImage, 'title': '08 Я Невидим', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Фиолетово-чёрный (2001, Real Records)/08   Я Невидим.mp3'},
  {'icon': iconImage, 'title': '08 Я Пущенная Стрела', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Концерт с Запорожским камерным оркестром/08  Я Пущенная Стрела.mp3'},
  {'icon': iconImage, 'title': '09 Love In December', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Romantic/Disco/09_Love In December.mp3'},
  {'icon': iconImage, 'title': '09 Бал', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Смутные дни (1992-2002) (2002, Grand Records)/09   Бал.mp3'},
  {'icon': iconImage, 'title': '09 Бал', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 3/09  Бал.mp3'},
  {'icon': iconImage, 'title': '09 Белый Хаос', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/1995 - Вампирские песни (1995, Аура)/09  Белый хаос.mp3'},
  {'icon': iconImage, 'title': '09 В Развороченном Раю', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2007 - Мракобесие и джаз (2007, Grand Records)/09  В развороченном раю.mp3'},
  {'icon': iconImage, 'title': '09 Взгляд Туманный Пьёт Нирвану', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2001 - Египтян (2001, Grand Records)/09  Взгляд туманный пьёт нирвану.mp3'},
  {'icon': iconImage, 'title': '09 Дай Себя Сорвать', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Фиолетово-чёрный (2001, Real Records)/09  Дай Себя Сорвать.mp3'},
  {'icon': iconImage, 'title': '09 Еще Один Дождь', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 2/09  Еще один дождь.mp3'},
  {'icon': iconImage, 'title': '09 Игрушки', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2020 - Обе-рек-Пикник на обочине ()/09 - Игрушки.mp3'},
  {'icon': iconImage, 'title': '09 Иероглиф', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Live (2002, Музыкальный Экспресс)/09  Иероглиф.mp3'},
  {'icon': iconImage, 'title': '09 Лицо', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1998 - The Best (1998, Аура)/09  Лицо.mp3'},
  {'icon': iconImage, 'title': '09 Миллион В Мешке', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Концерт с Запорожским камерным оркестром/09  Миллион В Мешке.mp3'},
  {'icon': iconImage, 'title': '09 Ночь', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/09. Ночь.mp3'},
  {'icon': iconImage, 'title': '09 Ночь', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/09. Ночь.mp3'},
  {'icon': iconImage, 'title': '09 Ой Да Не Вечер', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2011 - Пикник - Три судьбы/09  Ой, да не вечер.mp3'},
  {'icon': iconImage, 'title': '09 Самый Звонкий Крик Тишина', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 1/09  Самый звонкий крик-тишина.mp3'},
  {'icon': iconImage, 'title': '09 Твое Сердце Должно Быть Моим', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Пикник - Энциклопедия Российского Рока(2001,Grand Records)/09 Твое Сердце Должно Быть Моим.mp3'},
  {'icon': iconImage, 'title': '09 Телефон', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Настоящие дни (1982-1992) (2002, Grand Records)/09  Телефон.mp3'},
  {'icon': iconImage, 'title': '09 Телефон', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2005 - Новоегипетские песни (2005, Квадро-диск)/09  Телефон.mp3'},
  {'icon': iconImage, 'title': '10 I Will Survive', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Romantic/Golden/10_I Will Survive.mp3'},
  {'icon': iconImage, 'title': '10 Великан', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1998 - The Best (1998, Аура)/10  Великан.mp3'},
  {'icon': iconImage, 'title': '10 Великан', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 3/10  Великан.mp3'},
  {'icon': iconImage, 'title': '10 Лицо', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 1/10  Лицо.mp3'},
  {'icon': iconImage, 'title': '10 Начало Игры', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2010 - Театр абсурда (2010, Мистерия Звука)/10  Начало игры.mp3'},
  {'icon': iconImage, 'title': '10 Начало Игры', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/10  Начало игры.mp3'},
  {'icon': iconImage, 'title': '10 Немое Кино', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Фиолетово-чёрный (2001, Real Records)/10   Немое Кино.mp3'},
  {'icon': iconImage, 'title': '10 Немое Кино', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Смутные дни (1992-2002) (2002, Grand Records)/10   Немое кино.mp3'},
  {'icon': iconImage, 'title': '10 Самый Громкий Крик Тишина', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Пикник - Энциклопедия Российского Рока(2001,Grand Records)/10  Самый Громкий Крик - Тишина.mp3'},
  {'icon': iconImage, 'title': '10 Самый Звонкий Крик Тишина', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Live (2002, Музыкальный Экспресс)/10  Самый звонкий крик - тишина.mp3'},
  {'icon': iconImage, 'title': '10 Там На Самом На Краю Земли', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Настоящие дни (1982-1992) (2002, Grand Records)/10  Там на самом на краю земли.mp3'},
  {'icon': iconImage, 'title': '10 Твоё Сердце Должно Быть Моим', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 2/10  Твоё сердце должно быть моим.mp3'},
  {'icon': iconImage, 'title': '10 Телефон', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/10. Телефон.mp3'},
  {'icon': iconImage, 'title': '10 Телефон', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/10. Телефон.mp3'},
  {'icon': iconImage, 'title': '10 Течет Река Волга', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2011 - Пикник - Три судьбы/10  Течет река Волга.mp3'},
  {'icon': iconImage, 'title': '10 Фиолетово Черный', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2005 - Новоегипетские песни (2005, Квадро-диск)/10  Фиолетово-черный.mp3'},
  {'icon': iconImage, 'title': '10 Шарманка', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Концерт с Запорожским камерным оркестром/10  Шарманка.mp3'},
  {'icon': iconImage, 'title': '10 Эхо (от Луча)', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2007 - Мракобесие и джаз (2007, Grand Records)/10  Эхо (от луча).mp3'},
  {'icon': iconImage, 'title': '11 Get Another Boyfriend', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Romantic/Disco/11_Get Another Boyfriend.mp3'},
  {'icon': iconImage, 'title': '11 Oh Pretty Woman', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Romantic/Golden/11_Oh, Pretty Woman.mp3'},
  {'icon': iconImage, 'title': '11 Искры Около Рта', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1998 - The Best (1998, Аура)/11  Искры около рта.mp3'},
  {'icon': iconImage, 'title': '11 Искры Около Рта', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Пикник - Энциклопедия Российского Рока(2001,Grand Records)/11  Искры Около Рта.mp3'},
  {'icon': iconImage, 'title': '11 Мы Как Трепетные Птицы', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Фиолетово-чёрный (2001, Real Records)/11  Мы Как Трепетные Птицы.mp3'},
  {'icon': iconImage, 'title': '11 Ни Твоё Ни Моё', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Концерт с Запорожским камерным оркестром/11  Ни Твоё Ни Моё.mp3'},
  {'icon': iconImage, 'title': '11 Ночь (version Алиса)', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2005 - Новоегипетские песни (2005, Квадро-диск)/11  Ночь (version Алиса).mp3'},
  {'icon': iconImage, 'title': '11 Пикник', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/11. Пикник.mp3'},
  {'icon': iconImage, 'title': '11 Пикник', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/11. Пикник.mp3'},
  {'icon': iconImage, 'title': '11 Пикник', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 2/11  Пикник.mp3'},
  {'icon': iconImage, 'title': '11 Праздник', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Настоящие дни (1982-1992) (2002, Grand Records)/11  Праздник.mp3'},
  {'icon': iconImage, 'title': '11 Романс Сомнение (instrumental Version)', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2011 - Пикник - Три судьбы/11  Романс %27Сомнение%27 (instrumental version).mp3'},
  {'icon': iconImage, 'title': '11 Самы Звонкий Крик Тишина', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Смутные дни (1992-2002) (2002, Grand Records)/11  Самы звонкий крик-тишина.mp3'},
  {'icon': iconImage, 'title': '11 Течет Большая Река', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Live (2002, Музыкальный Экспресс)/11  Течет большая река.mp3'},
  {'icon': iconImage, 'title': '11 Через 10000 Лет', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 1/11  Через 10000 лет.mp3'},
  {'icon': iconImage, 'title': '11 Я Почти Итальянец', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 3/11  Я почти итальянец.mp3'},
  {'icon': iconImage, 'title': '110 Kiss I Was Made For Lovin You', 'file': '../../../../../../../../F:/MUSIK/New/Copy/110_Kiss - I Was Made For Lovin You.mp3'},
  {'icon': iconImage, 'title': '113 Ricchi E Poveri Voulez Vous Danser', 'file': '../../../../../../../../F:/MUSIK/New/Copy/113_Ricchi E Poveri - Voulez Vous Danser.mp3'},
  {'icon': iconImage, 'title': '12 Coda', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2007 - Мракобесие и джаз (2007, Grand Records)/12  Coda.mp3'},
  {'icon': iconImage, 'title': '12 Египтянин', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Концерт с Запорожским камерным оркестром/12  Египтянин.mp3'},
  {'icon': iconImage, 'title': '12 Инквизитор', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 2/12  Инквизитор.mp3'},
  {'icon': iconImage, 'title': '12 Королевство Кривых (club Version)', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2005 - Новоегипетские песни (2005, Квадро-диск)/12  Королевство кривых (club version).mp3'},
  {'icon': iconImage, 'title': '12 Много Дивного На Свете', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Настоящие дни (1982-1992) (2002, Grand Records)/12  Много дивного на свете.mp3'},
  {'icon': iconImage, 'title': '12 Немое Кино', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Пикник - Энциклопедия Российского Рока(2001,Grand Records)/12  Немое Кино.mp3'},
  {'icon': iconImage, 'title': '12 Нигредо', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 3/12  Нигредо.mp3'},
  {'icon': iconImage, 'title': '12 Ночь', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1998 - The Best (1998, Аура)/12  Ночь.mp3'},
  {'icon': iconImage, 'title': '12 Праздник', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Live (2002, Музыкальный Экспресс)/12  Праздник.mp3'},
  {'icon': iconImage, 'title': '12 Праздник', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 1/12  Праздник.mp3'},
  {'icon': iconImage, 'title': '12 Сигналы', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2012 - Пикник - Певец Декаданса/12  Сигналы.mp3'},
  {'icon': iconImage, 'title': '12 Смутные Дни', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Смутные дни (1992-2002) (2002, Grand Records)/12  Смутные дни.mp3'},
  {'icon': iconImage, 'title': '12 Я Невидим', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/12. Я невидим.mp3'},
  {'icon': iconImage, 'title': '12 Я Невидим', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/12. Я невидим.mp3'},
  {'icon': iconImage, 'title': '12 Я Пущенная Стрела', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Фиолетово-чёрный (2001, Real Records)/12 Я Пущенная Стрела.mp3'},
  {'icon': iconImage, 'title': '127 Tanita Tikaram Twist In My Sobriety', 'file': '../../../../../../../../F:/MUSIK/New/Copy/127_Tanita Tikaram - Twist In My Sobriety.mp3'},
  {'icon': iconImage, 'title': '128 Patricia Kaas Venus De Abribus', 'file': '../../../../../../../../F:/MUSIK/New/Copy/128_Patricia Kaas - Venus De Abribus.mp3'},
  {'icon': iconImage, 'title': '13 Вечер', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Live (2002, Музыкальный Экспресс)/13  Вечер.mp3'},
  {'icon': iconImage, 'title': '13 Вечер', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Настоящие дни (1982-1992) (2002, Grand Records)/13  Вечер.mp3'},
  {'icon': iconImage, 'title': '13 Колдыри Да Колдобины', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 2/13  Колдыри да колдобины.mp3'},
  {'icon': iconImage, 'title': '13 Не Кончается Пытка', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 1/13  Не кончается пытка.mp3'},
  {'icon': iconImage, 'title': '13 Немного Огня', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Фиолетово-чёрный (2001, Real Records)/13  Немного Огня.mp3'},
  {'icon': iconImage, 'title': '13 Нет Берегов', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/13. Нет берегов.mp3'},
  {'icon': iconImage, 'title': '13 Нет Берегов', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/13. Нет берегов.mp3'},
  {'icon': iconImage, 'title': '13 Самый Звонкий Крик Тишина', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Концерт с Запорожским камерным оркестром/13  Самый Звонкий Крик Тишина.mp3'},
  {'icon': iconImage, 'title': '13 Смутные Дни', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Пикник - Энциклопедия Российского Рока(2001,Grand Records)/13 Смутные Дни.mp3'},
  {'icon': iconImage, 'title': '13 Шарманка', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Смутные дни (1992-2002) (2002, Grand Records)/13   Шарманка.mp3'},
  {'icon': iconImage, 'title': '13 Я Невидим', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 3/13  Я-невидим.mp3'},
  {'icon': iconImage, 'title': '130 Joe Dassin Et Si Tu Nexistais', 'file': '../../../../../../../../F:/MUSIK/New/Copy/130_Joe Dassin - Et Si Tu N%27existais.mp3'},
  {'icon': iconImage, 'title': '136 Animals House Of He Rising Sun', 'file': '../../../../../../../../F:/MUSIK/New/Copy/136_Animals - House Of He Rising Sun.mp3'},
  {'icon': iconImage, 'title': '14 Золушка', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Настоящие дни (1982-1992) (2002, Grand Records)/14  Золушка.mp3'},
  {'icon': iconImage, 'title': '14 Иероглиф', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Концерт с Запорожским камерным оркестром/14  Иероглиф.mp3'},
  {'icon': iconImage, 'title': '14 Из Коры Себе Подругу Выстругал', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 1/14  Из коры себе подругу выстругал.mp3'},
  {'icon': iconImage, 'title': '14 Интересно', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Live (2002, Музыкальный Экспресс)/14  Интересно.mp3'},
  {'icon': iconImage, 'title': '14 Искры Около Рта', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Смутные дни (1992-2002) (2002, Grand Records)/14   Искры около рта.mp3'},
  {'icon': iconImage, 'title': '14 Лицо', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Пикник - Энциклопедия Российского Рока(2001,Grand Records)/14  Лицо.mp3'},
  {'icon': iconImage, 'title': '14 Немое Кино', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 2/14  Немое кино.mp3'},
  {'icon': iconImage, 'title': '14 Романс', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/14. Романс.mp3'},
  {'icon': iconImage, 'title': '14 Романс', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/14. Романс.mp3'},
  {'icon': iconImage, 'title': '14 Скользить По Земле', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 3/14  Скользить по земле.mp3'},
  {'icon': iconImage, 'title': '14 Фиолетово Черный', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Фиолетово-чёрный (2001, Real Records)/14  Фиолетово-Черный.mp3'},
  {'icon': iconImage, 'title': '142 Chris Norman Some Hearts Are Diamonds', 'file': '../../../../../../../../F:/MUSIK/New/Copy/142_Chris Norman - Some Hearts Are Diamonds.mp3'},
  {'icon': iconImage, 'title': '143 Louis Armstrong Go Down Moses', 'file': '../../../../../../../../F:/MUSIK/New/Copy/143_Louis Armstrong - Go Down Moses.mp3'},
  {'icon': iconImage, 'title': '15 А Может Быть И Не Было Меня', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Смутные дни (1992-2002) (2002, Grand Records)/15   А может быть и не было меня.mp3'},
  {'icon': iconImage, 'title': '15 Вечер', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 3/15  Вечер.mp3'},
  {'icon': iconImage, 'title': '15 Глаза Очерчены Углем', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Пикник - Энциклопедия Российского Рока(2001,Grand Records)/15  Глаза Очерчены Углем.mp3'},
  {'icon': iconImage, 'title': '15 Дай Себя Сорвать', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/15. Дай себя сорвать.mp3'},
  {'icon': iconImage, 'title': '15 Дай Себя Сорвать', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/15. Дай себя сорвать.mp3'},
  {'icon': iconImage, 'title': '15 Романс', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 2/15  Романс.mp3'},
  {'icon': iconImage, 'title': '15 Там На Самом На Краю Земли', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2011 - 30 световых лет (2011, Вектор)/CD 1/15  Там на самом на краю земли.mp3'},
  {'icon': iconImage, 'title': '15 Фиолетово Чёрный', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Концерт с Запорожским камерным оркестром/15  Фиолетово-чёрный.mp3'},
  {'icon': iconImage, 'title': '15 Шарманка', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Фиолетово-чёрный (2001, Real Records)/15  Шарманка.mp3'},
  {'icon': iconImage, 'title': '15 Я Почти Итальянец', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Live (2002, Музыкальный Экспресс)/15  Я почти итальянец.mp3'},
  {'icon': iconImage, 'title': '15 Я Почти Итальянец', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Настоящие дни (1982-1992) (2002, Grand Records)/15  Я почти итальянец.mp3'},
  {'icon': iconImage, 'title': '16 House Of The Rising Sun', 'file': '../../../../../../../../F:/MUSIK/New/Copy/16_House Of The Rising Sun.mp3'},
  {'icon': iconImage, 'title': '16 Египтянин', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Пикник - Энциклопедия Российского Рока(2001,Grand Records)/16  Египтянин.mp3'},
  {'icon': iconImage, 'title': '16 Настоящие Дни', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/16. Настоящие дни.mp3'},
  {'icon': iconImage, 'title': '16 Настоящие Дни', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/16. Настоящие дни.mp3'},
  {'icon': iconImage, 'title': '16 Немного Огня', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Концерт с Запорожским камерным оркестром/16  Немного Огня.mp3'},
  {'icon': iconImage, 'title': '16 Пить Электричество', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Смутные дни (1992-2002) (2002, Grand Records)/16   Пить электричество.mp3'},
  {'icon': iconImage, 'title': '16 Телефон', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Live (2002, Музыкальный Экспресс)/16  Телефон.mp3'},
  {'icon': iconImage, 'title': '162 Frank Sinatra Strangers In The Night', 'file': '../../../../../../../../F:/MUSIK/New/Copy/162_Frank Sinatra - Strangers In The Night.mp3'},
  {'icon': iconImage, 'title': '167 Abba Gimme! Gimme! Gimme!', 'file': '../../../../../../../../F:/MUSIK/New/Copy/167_ABBA - Gimme! Gimme! Gimme!.mp3'},
  {'icon': iconImage, 'title': '17 Индеец Джо', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2002 - Смутные дни (1992-2002) (2002, Grand Records)/17  Индеец Джо.mp3'},
  {'icon': iconImage, 'title': '17 Мы Как Трепетные Дни (птицы)', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/17. Мы, как трепетные дни (птицы).mp3'},
  {'icon': iconImage, 'title': '17 Мы Как Трепетные Дни (птицы)', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/17. Мы, как трепетные дни (птицы).mp3'},
  {'icon': iconImage, 'title': '17 Я Почти Итальянец', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2001 - Концерт с Запорожским камерным оркестром/17  Я Почти Итальянец.mp3'},
  {'icon': iconImage, 'title': '18 Girl Youll Be A Woman Soon Overkill', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Romantic/Vellume3/18-Girl_You%27ll_Be_A_Woman_Soon...-Overkill.mp3'},
  {'icon': iconImage, 'title': '18 Я Пущенная Стрела', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/18. Я - пущенная стрела.mp3'},
  {'icon': iconImage, 'title': '18 Я Пущенная Стрела', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/18. Я - пущенная стрела.mp3'},
  {'icon': iconImage, 'title': '184 Chris Rea Road To Hell', 'file': '../../../../../../../../F:/MUSIK/New/Copy/184_Chris Rea - Road To Hell.mp3'},
  {'icon': iconImage, 'title': '188 Ennio Morricone Once Upon A Time In America', 'file': '../../../../../../../../F:/MUSIK/New/Copy/188_Ennio Morricone - Once Upon A Time In America.mp3'},
  {'icon': iconImage, 'title': '19 Там На Самом На Краю Земли', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/19. Там, на самом на краю земли.mp3'},
  {'icon': iconImage, 'title': '19 Там На Самом На Краю Земли', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/19. Там, на самом на краю земли.mp3'},
  {'icon': iconImage, 'title': '194 Alphaville Forever Young', 'file': '../../../../../../../../F:/MUSIK/New/Copy/194_Alphaville - Forever Young.mp3'},
  {'icon': iconImage, 'title': '195 Chris Norman & Suzie Quatro Stambling Inn', 'file': '../../../../../../../../F:/MUSIK/New/Copy/195_Chris Norman & Suzie Quatro - Stambling Inn.mp3'},
  {'icon': iconImage, 'title': '196 Julio Iglesias Mammy Blue', 'file': '../../../../../../../../F:/MUSIK/New/Copy/196_Julio Iglesias - Mammy Blue.mp3'},
  {'icon': iconImage, 'title': '20 Это Река Ганг', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/20. Это река Ганг.mp3'},
  {'icon': iconImage, 'title': '20 Это Река Ганг', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/20. Это река Ганг.mp3'},
  {'icon': iconImage, 'title': '21 Течет Большая Река', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/21. Течет большая река.mp3'},
  {'icon': iconImage, 'title': '21 Течет Большая Река', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/21. Течет большая река.mp3'},
  {'icon': iconImage, 'title': '22 Немного Огня', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/22. Немного огня.mp3'},
  {'icon': iconImage, 'title': '22 Немного Огня', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/22. Немного огня.mp3'},
  {'icon': iconImage, 'title': '23 Твое Сердце Должно Быть Моим', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/23. Твое сердце должно быть моим.mp3'},
  {'icon': iconImage, 'title': '23 Твое Сердце Должно Быть Моим', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/23. Твое сердце должно быть моим.mp3'},
  {'icon': iconImage, 'title': '24 Самый Звонкий Крик Тишина', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/24. Самый звонкий крик - тишина.mp3'},
  {'icon': iconImage, 'title': '24 Самый Звонкий Крик Тишина', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/24. Самый звонкий крик - тишина.mp3'},
  {'icon': iconImage, 'title': '25 Лишь Влюбленному Вампиру', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/25. Лишь влюбленному вампиру.mp3'},
  {'icon': iconImage, 'title': '25 Лишь Влюбленному Вампиру', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/25. Лишь влюбленному вампиру.mp3'},
  {'icon': iconImage, 'title': '26 Искры Около Рта', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/26. Искры около рта.mp3'},
  {'icon': iconImage, 'title': '26 Искры Около Рта', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/26. Искры около рта.mp3'},
  {'icon': iconImage, 'title': '27 Немое Кино', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/27. Немое кино.mp3'},
  {'icon': iconImage, 'title': '27 Немое Кино', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/27. Немое кино.mp3'},
  {'icon': iconImage, 'title': '28 Скользить По Земле', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/28. Скользить по земле.mp3'},
  {'icon': iconImage, 'title': '28 Скользить По Земле', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/28. Скользить по земле.mp3'},
  {'icon': iconImage, 'title': '29 Упругие Их Имена', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/29. Упругие их имена.mp3'},
  {'icon': iconImage, 'title': '29 Упругие Их Имена', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/29. Упругие их имена.mp3'},
  {'icon': iconImage, 'title': '30 Seconds To Mars', 'file': '../../../../../../../../F:/MUSIK/New/2/30_seconds_to_mars.mp3'},
  {'icon': iconImage, 'title': '30 Смутные Дни', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/30. Смутные дни.mp3'},
  {'icon': iconImage, 'title': '30 Смутные Дни', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/30. Смутные дни.mp3'},
  {'icon': iconImage, 'title': '31 Лицо', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/31. Лицо.mp3'},
  {'icon': iconImage, 'title': '31 Лицо', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/31. Лицо.mp3'},
  {'icon': iconImage, 'title': '32 Еще Один Дождь', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/32. Еще один дождь.mp3'},
  {'icon': iconImage, 'title': '32 Еще Один Дождь', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/32. Еще один дождь.mp3'},
  {'icon': iconImage, 'title': '33 Глаза Очерчены Углем', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/33. Глаза очерчены углем.mp3'},
  {'icon': iconImage, 'title': '33 Глаза Очерчены Углем', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/33. Глаза очерчены углем.mp3'},
  {'icon': iconImage, 'title': '34 Шарманка', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/34. Шарманка.mp3'},
  {'icon': iconImage, 'title': '34 Шарманка', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/34. Шарманка.mp3'},
  {'icon': iconImage, 'title': '35 Будь Навсегда', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/35. Будь навсегда.mp3'},
  {'icon': iconImage, 'title': '35 Будь Навсегда', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/35. Будь навсегда.mp3'},
  {'icon': iconImage, 'title': '36 U (напряжение Не Кончается)', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/36. U (Напряжение не кончается).mp3'},
  {'icon': iconImage, 'title': '36 U (напряжение Не Кончается)', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/36. U (Напряжение не кончается).mp3'},
  {'icon': iconImage, 'title': '37 Пить Электричество', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/37. Пить электричество.mp3'},
  {'icon': iconImage, 'title': '37 Пить Электричество', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/37. Пить электричество.mp3'},
  {'icon': iconImage, 'title': '38 Фиолетово Черный', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/38. Фиолетово-черный.mp3'},
  {'icon': iconImage, 'title': '38 Фиолетово Черный', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/38. Фиолетово-черный.mp3'},
  {'icon': iconImage, 'title': '39 Ни Твое Ни Мое', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/39. Ни твое, ни мое.mp3'},
  {'icon': iconImage, 'title': '39 Ни Твое Ни Мое', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/39. Ни твое, ни мое.mp3'},
  {'icon': iconImage, 'title': '40 Бал', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/40. Бал.mp3'},
  {'icon': iconImage, 'title': '40 Бал', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/40. Бал.mp3'},
  {'icon': iconImage, 'title': '41 Миллион В Мешке', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/41. Миллион в мешке.mp3'},
  {'icon': iconImage, 'title': '41 Миллион В Мешке', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/41. Миллион в мешке.mp3'},
  {'icon': iconImage, 'title': '42 Лакомо И Ломко', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/42. Лакомо и ломко.mp3'},
  {'icon': iconImage, 'title': '42 Лакомо И Ломко', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/42. Лакомо и ломко.mp3'},
  {'icon': iconImage, 'title': '43 Лихорадка', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/43. Лихорадка.mp3'},
  {'icon': iconImage, 'title': '43 Лихорадка', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/43. Лихорадка.mp3'},
  {'icon': iconImage, 'title': '44 Герой', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/44. Герой.mp3'},
  {'icon': iconImage, 'title': '44 Герой', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/44. Герой.mp3'},
  {'icon': iconImage, 'title': '45 Нигредо', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/45. Нигредо.mp3'},
  {'icon': iconImage, 'title': '45 Нигредо', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/45. Нигредо.mp3'},
  {'icon': iconImage, 'title': '46 Серебра!!!', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/46. Серебра!!!.mp3'},
  {'icon': iconImage, 'title': '46 Серебра!!!', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/46. Серебра!!!.mp3'},
  {'icon': iconImage, 'title': '47 Говорит И Показывает', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/47. Говорит и показывает.mp3'},
  {'icon': iconImage, 'title': '47 Говорит И Показывает', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/47. Говорит и показывает.mp3'},
  {'icon': iconImage, 'title': '48 До Содома Далеко', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/48. До Содома далеко.mp3'},
  {'icon': iconImage, 'title': '48 До Содома Далеко', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/48. До Содома далеко.mp3'},
  {'icon': iconImage, 'title': '49 Я Почти Итальянец', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/49. Я почти итальянец.mp3'},
  {'icon': iconImage, 'title': '49 Я Почти Итальянец', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/49. Я почти итальянец.mp3'},
  {'icon': iconImage, 'title': '50 Пентакль', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/50. Пентакль.mp3'},
  {'icon': iconImage, 'title': '50 Пентакль', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/50. Пентакль.mp3'},
  {'icon': iconImage, 'title': '51 Не Кончается Пытка', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/51. Не кончается пытка.mp3'},
  {'icon': iconImage, 'title': '51 Не Кончается Пытка', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/51. Не кончается пытка.mp3'},
  {'icon': iconImage, 'title': '52 Сердце Бьется На Три Четверти', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/52. Сердце бьется на три четверти.mp3'},
  {'icon': iconImage, 'title': '52 Сердце Бьется На Три Четверти', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/52. Сердце бьется на три четверти.mp3'},
  {'icon': iconImage, 'title': '53 Граф Д', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/53. Граф Д.mp3'},
  {'icon': iconImage, 'title': '53 Граф Д', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/53. Граф Д.mp3'},
  {'icon': iconImage, 'title': '54 У Шамана Три Руки', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/54. У шамана три руки.mp3'},
  {'icon': iconImage, 'title': '54 У Шамана Три Руки', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/54. У шамана три руки.mp3'},
  {'icon': iconImage, 'title': '55 И Летает Голова То Вверх То Вниз', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/55. И летает голова то вверх, то вниз.mp3'},
  {'icon': iconImage, 'title': '55 И Летает Голова То Вверх То Вниз', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/55. И летает голова то вверх, то вниз.mp3'},
  {'icon': iconImage, 'title': '56 Себе Не Найдя Двойников', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/56. Себе не найдя двойников.mp3'},
  {'icon': iconImage, 'title': '56 Себе Не Найдя Двойников', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/56. Себе не найдя двойников.mp3'},
  {'icon': iconImage, 'title': '57 Королевство Кривых', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/57. Королевство Кривых.mp3'},
  {'icon': iconImage, 'title': '57 Королевство Кривых', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/57. Королевство Кривых.mp3'},
  {'icon': iconImage, 'title': '58 Недобитый Романтик', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/58. Недобитый романтик.mp3'},
  {'icon': iconImage, 'title': '58 Недобитый Романтик', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/58. Недобитый романтик.mp3'},
  {'icon': iconImage, 'title': '59 Гиперболоид', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/59. Гиперболоид.mp3'},
  {'icon': iconImage, 'title': '59 Гиперболоид', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/59. Гиперболоид.mp3'},
  {'icon': iconImage, 'title': '60 Железные Мантры', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/60. Железные мантры.mp3'},
  {'icon': iconImage, 'title': '60 Железные Мантры', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/60. Железные мантры.mp3'},
  {'icon': iconImage, 'title': '61 Слово Это Ветер', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/61. Слово - это ветер.mp3'},
  {'icon': iconImage, 'title': '61 Слово Это Ветер', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/61. Слово - это ветер.mp3'},
  {'icon': iconImage, 'title': '62 Колдыри Да Колдобины', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/62. Колдыри да колдобины.mp3'},
  {'icon': iconImage, 'title': '62 Колдыри Да Колдобины', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/2010 - Пикник - Коллекция легендарных песен (2010)/62. Колдыри да колдобины.mp3'},
  {'icon': iconImage, 'title': '63 Театр Абсурда', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/63. Театр абсурда.mp3'},
  {'icon': iconImage, 'title': '64 Кукла С Человеческим Лицом', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/64.  Кукла с человеческим лицом.mp3'},
  {'icon': iconImage, 'title': '65 Не В Опере Венской ', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/65.  Не в опере венской ....mp3'},
  {'icon': iconImage, 'title': '66 Фетиш', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/66.  Фетиш.mp3'},
  {'icon': iconImage, 'title': '67 Карлик Нос', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/67.  Карлик Нос.mp3'},
  {'icon': iconImage, 'title': '68 Декаданс', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/68.  Декаданс.mp3'},
  {'icon': iconImage, 'title': '69 Игла', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/69.  Игла.mp3'},
  {'icon': iconImage, 'title': '70 За Пижоном Пижон', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/70.  За пижоном пижон.mp3'},
  {'icon': iconImage, 'title': '71 Вплети Меня В Свое Кружево', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/71.  Вплети меня в свое кружево.mp3'},
  {'icon': iconImage, 'title': '72 Гильотины Сечение Веревки Петля', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/72.  Гильотины сечение, веревки петля.mp3'},
  {'icon': iconImage, 'title': '73 Клоун Беспощадный', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/73.  Клоун беспощадный.mp3'},
  {'icon': iconImage, 'title': '74 Трилогия', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/74.  Трилогия.mp3'},
  {'icon': iconImage, 'title': '75 Инкогнито', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/75.  Инкогнито.mp3'},
  {'icon': iconImage, 'title': '76 Звезда Декаданс', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/76.  Звезда Декаданс.mp3'},
  {'icon': iconImage, 'title': '77 Быть Может (утешительная)', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/77.  Быть может... (утешительная).mp3'},
  {'icon': iconImage, 'title': '78 Сигналы', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/78.  Сигналы.mp3'},
  {'icon': iconImage, 'title': '79 Русы Косы Ноги Босы', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/79.  Русы косы, ноги босы.mp3'},
  {'icon': iconImage, 'title': '80 Прикосновение', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/80.  Прикосновение.mp3'},
  {'icon': iconImage, 'title': '81 Урим Туммим', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/81.  Урим туммим.mp3'},
  {'icon': iconImage, 'title': '82 Уйду Останусь', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/82.  Уйду-останусь.mp3'},
  {'icon': iconImage, 'title': '83 И Смоется Грим ', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/83.  И смоется грим ...mp3'},
  {'icon': iconImage, 'title': '84 Дикая Певица', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Сборники/1982-2010 - Пикник - Коллекция легендарных песен_mp3PRO/84.  Дикая певица.mp3'},
  {'icon': iconImage, 'title': 'A New Day Has Come', 'file': '../../../../../../../../F:/MUSIK/New/2/A new day has come.mp3'},
  {'icon': iconImage, 'title': 'Abba Happy New Year', 'file': '../../../../../../../../F:/MUSIK/New/Copy/abba_-_happy_new_year.mp3'},
  {'icon': iconImage, 'title': 'Adiemus', 'file': '../../../../../../../../F:/MUSIK/New/2/Adiemus.mp3'},
  {'icon': iconImage, 'title': 'Adios', 'file': '../../../../../../../../F:/MUSIK/New/2/Adios.mp3'},
  {'icon': iconImage, 'title': 'Adriano Celentano Il Tomposc Ne Va', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Adriano Celentano - Il Tomposc Ne Va.mp3'},
  {'icon': iconImage, 'title': 'Aerials', 'file': '../../../../../../../../F:/MUSIK/New/2/Aerials.mp3'},
  {'icon': iconImage, 'title': 'Aerosmith I Dont Want To Miss A Thing', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Aerosmith - I dont want to miss a thing.mp3'},
  {'icon': iconImage, 'title': 'Afrojack Shone', 'file': '../../../../../../../../F:/MUSIK/New/2/Afrojack-Shone.mp3'},
  {'icon': iconImage, 'title': 'All For Nothing', 'file': '../../../../../../../../F:/MUSIK/New/2/All for nothing.mp3'},
  {'icon': iconImage, 'title': 'Alphaville Forever Young', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Alphaville - Forever Young.mp3'},
  {'icon': iconImage, 'title': 'Amerika', 'file': '../../../../../../../../F:/MUSIK/New/2/Amerika.mp3'},
  {'icon': iconImage, 'title': 'Amish Life', 'file': '../../../../../../../../F:/MUSIK/New/2/Amish Life.mp3'},
  {'icon': iconImage, 'title': 'Apologize', 'file': '../../../../../../../../F:/MUSIK/New/~sort/Dreaming Out Loud/Apologize.mp3'},
  {'icon': iconImage, 'title': 'Baba Oriley', 'file': '../../../../../../../../F:/MUSIK/New/2/Baba O%27Riley.mp3'},
  {'icon': iconImage, 'title': 'Back In Black', 'file': '../../../../../../../../F:/MUSIK/New/2/Back in black.mp3'},
  {'icon': iconImage, 'title': 'Bad Liar', 'file': '../../../../../../../../F:/MUSIK/New/2/Bad Liar.mp3'},
  {'icon': iconImage, 'title': 'Bad Romance', 'file': '../../../../../../../../F:/MUSIK/New/bad_romance.mp3'},
  {'icon': iconImage, 'title': 'Bamboleo', 'file': '../../../../../../../../F:/MUSIK/New/2/Bamboleo.mp3'},
  {'icon': iconImage, 'title': 'Bang', 'file': '../../../../../../../../F:/MUSIK/New/2/Bang.mp3'},
  {'icon': iconImage, 'title': 'Behind Blue Eyes', 'file': '../../../../../../../../F:/MUSIK/New/2/Behind Blue Eyes.mp3'},
  {'icon': iconImage, 'title': 'Believe', 'file': '../../../../../../../../F:/MUSIK/New/2/Believe.mp3'},
  {'icon': iconImage, 'title': 'Believer', 'file': '../../../../../../../../F:/MUSIK/New/2/Believer.mp3'},
  {'icon': iconImage, 'title': 'Bemidji Mn', 'file': '../../../../../../../../F:/MUSIK/New/2/Bemidji, MN .mp3'},
  {'icon': iconImage, 'title': 'Bemidji Mn', 'file': '../../../../../../../../F:/MUSIK/New/2/Bemidji, MN.mp3'},
  {'icon': iconImage, 'title': 'Berlin Take My Breath Away', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Berlin - Take My Breath Away.mp3'},
  {'icon': iconImage, 'title': 'Besame Mucho', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Romantic/Tet - A - Tet/Besame Mucho.mp3'},
  {'icon': iconImage, 'title': 'Between Angels And Insects', 'file': '../../../../../../../../F:/MUSIK/New/2/Between Angels And Insects.mp3'},
  {'icon': iconImage, 'title': 'Big In Japan', 'file': '../../../../../../../../F:/MUSIK/New/2/Big In Japan.mp3'},
  {'icon': iconImage, 'title': 'Birds', 'file': '../../../../../../../../F:/MUSIK/New/2/Birds.mp3'},
  {'icon': iconImage, 'title': 'Black Or White', 'file': '../../../../../../../../F:/MUSIK/New/2/Black or White.mp3'},
  {'icon': iconImage, 'title': 'Blame Feat', 'file': '../../../../../../../../F:/MUSIK/New/2/Blame feat.mp3'},
  {'icon': iconImage, 'title': 'Bleed It Out', 'file': '../../../../../../../../F:/MUSIK/New/2/Bleed It Out.mp3'},
  {'icon': iconImage, 'title': 'Boro Boro', 'file': '../../../../../../../../F:/MUSIK/New/2/Boro Boro.mp3'},
  {'icon': iconImage, 'title': 'Breathe', 'file': '../../../../../../../../F:/MUSIK/New/2/Breathe.mp3'},
  {'icon': iconImage, 'title': 'Breathe The Glitch', 'file': '../../../../../../../../F:/MUSIK/New/2/Breathe the glitch.mp3'},
  {'icon': iconImage, 'title': 'Broken Promises', 'file': '../../../../../../../../F:/MUSIK/New/2/Broken Promises.mp3'},
  {'icon': iconImage, 'title': 'California Dreamin Subtitulado Español Inglés', 'file': '../../../../../../../../F:/MUSIK/New/2/California Dreamin%27 - Subtitulado Español   Inglés.mp4'},
  {'icon': iconImage, 'title': 'California Dreamingthe Mamas & Papas California Dreaming Stereo Edit', 'file': '../../../../../../../../F:/MUSIK/New/2/California Dreamingthe mamas & papas - california dreaming - stereo edit.mp4'},
  {'icon': iconImage, 'title': 'Careless Whispe', 'file': '../../../../../../../../F:/MUSIK/New/2/Careless Whispe.mp3'},
  {'icon': iconImage, 'title': 'Cd1 05 Modern Talking Chery Chery Lady', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Romantic/Disco/CD1-05-Modern_Talking-Chery_Chery_Lady.mp3'},
  {'icon': iconImage, 'title': 'Cd1 06 Scorpions Stll Loving You', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Romantic/Golden/CD1-06-Scorpions-Stll_Loving_You.mp3'},
  {'icon': iconImage, 'title': 'Cd1 07 Joy Touch By Touch', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Romantic/Disco/CD1-07-Joy-Touch_By_Touch.mp3'},
  {'icon': iconImage, 'title': 'Cd1 10 Nick Cave And The Bad Sees Where The Wild Roses Grow', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Romantic/Golden/CD1-10-Nick_Cave_And_The_Bad_Sees-Where_The_Wild_Roses_Grow.mp3'},
  {'icon': iconImage, 'title': 'Cd2 01 Space Just Blue', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Romantic/Disco/CD2-01-Space-Just_Blue.mp3'},
  {'icon': iconImage, 'title': 'Cd2 05 James Last Lonesome Shepherd', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Romantic/Golden/CD2-05-James_Last-Lonesome_Shepherd.mp3'},
  {'icon': iconImage, 'title': 'Cd2 07 In The Army Now Status Quo', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Romantic/Golden/CD2-07-In_The_Army_Now-Status_QUO.mp3'},
  {'icon': iconImage, 'title': 'Cd2 10 Gloria Gaynor I Will Survive', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Romantic/Golden/CD2-10-Gloria_Gaynor-I_Will_Survive.mp3'},
  {'icon': iconImage, 'title': 'Cd2 11 Oh Pretty Woman Roy Orbison', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Romantic/Golden/CD2-11-Oh,_Pretty_Woman-Roy_Orbison.mp3'},
  {'icon': iconImage, 'title': 'Cd2 16 Nostalgie Julio Iglesias', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Romantic/Golden/CD2-16-Nostalgie-Julio_Iglesias.mp3'},
  {'icon': iconImage, 'title': 'Cd2 17 Lily Was Here Candy Dulfer', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Romantic/Golden/CD2-17-Lily_Was_Here-Candy_Dulfer.mp3'},
  {'icon': iconImage, 'title': 'Cd2 19 Mary Hopkins Those Were The Days', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Romantic/Disco/CD2-19-Mary_Hopkins-Those_Were_The_Days.mp3'},
  {'icon': iconImage, 'title': 'Celebrate', 'file': '../../../../../../../../F:/MUSIK/New/Copy/CELEBRATE.mp3'},
  {'icon': iconImage, 'title': 'Celebrate The Love', 'file': '../../../../../../../../F:/MUSIK/New/2/Celebrate the Love.mp3'},
  {'icon': iconImage, 'title': 'Chandelier', 'file': '../../../../../../../../F:/MUSIK/New/2/Chandelier.mp3'},
  {'icon': iconImage, 'title': 'Changed The Way You Kiss Me', 'file': '../../../../../../../../F:/MUSIK/New/2/Changed the way you kiss me.mp3'},
  {'icon': iconImage, 'title': 'Chihuahua', 'file': '../../../../../../../../F:/MUSIK/New/2/Chihuahua.mp3'},
  {'icon': iconImage, 'title': 'Chop Suey', 'file': '../../../../../../../../F:/MUSIK/New/2/Chop Suey.mp3'},
  {'icon': iconImage, 'title': 'Chris De Burgh Lady In Red', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Chris De Burgh - Lady In Red.mp3'},
  {'icon': iconImage, 'title': 'Chris De Burgh The Lady In Red M', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Chris De Burgh - The Lady In Red+M.MP3'},
  {'icon': iconImage, 'title': 'Chris Jennings Nothing But You', 'file': '../../../../../../../../F:/MUSIK/New/2/Chris Jennings - Nothing But You.mp3'},
  {'icon': iconImage, 'title': 'Clint Eastwood', 'file': '../../../../../../../../F:/MUSIK/New/2/Clint Eastwood.MP3'},
  {'icon': iconImage, 'title': 'Coco Jambo', 'file': '../../../../../../../../F:/MUSIK/New/2/Coco Jambo.mp3'},
  {'icon': iconImage, 'title': 'Confide In Me', 'file': '../../../../../../../../F:/MUSIK/New/2/Confide in Me.mp3'},
  {'icon': iconImage, 'title': 'Conquest Of Paradise', 'file': '../../../../../../../../F:/MUSIK/New/2/Conquest of paradise.mp3'},
  {'icon': iconImage, 'title': 'Corleone Speaking', 'file': '../../../../../../../../F:/MUSIK/New/2/Corleone_Speaking.mp3'},
  {'icon': iconImage, 'title': 'Cotton Eye Joe', 'file': '../../../../../../../../F:/MUSIK/New/2/Cotton eye joe.mp3'},
  {'icon': iconImage, 'title': 'Crash Boom Bang', 'file': '../../../../../../../../F:/MUSIK/New/2/Crash Boom Bang.mp3'},
  {'icon': iconImage, 'title': 'Creep', 'file': '../../../../../../../../F:/MUSIK/New/2/Creep.mp3'},
  {'icon': iconImage, 'title': 'Dalida Voyage', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Dalida - Voyage.mp3'},
  {'icon': iconImage, 'title': 'Dead!', 'file': '../../../../../../../../F:/MUSIK/New/~sort/MY CHEMICAL ROMANCE/Dead!.mp3'},
  {'icon': iconImage, 'title': 'Deamons', 'file': '../../../../../../../../F:/MUSIK/New/2/Deamons.mp3'},
  {'icon': iconImage, 'title': 'Deep Six', 'file': '../../../../../../../../F:/MUSIK/New/2/Deep six.mp3'},
  {'icon': iconImage, 'title': 'Desert Rose', 'file': '../../../../../../../../F:/MUSIK/New/2/Desert Rose.mp3'},
  {'icon': iconImage, 'title': 'Deserts Of Mars', 'file': '../../../../../../../../F:/MUSIK/New/2/Deserts Of Mars.MP3'},
  {'icon': iconImage, 'title': 'Desperate Religion', 'file': '../../../../../../../../F:/MUSIK/New/2/Desperate religion.mp3'},
  {'icon': iconImage, 'title': 'Diamonds Myzuka', 'file': '../../../../../../../../F:/MUSIK/New/2/Diamonds myzuka.mp3'},
  {'icon': iconImage, 'title': 'Did My Time', 'file': '../../../../../../../../F:/MUSIK/New/2/Did My Time.mp3'},
  {'icon': iconImage, 'title': 'Dont Dream Its Over', 'file': '../../../../../../../../F:/MUSIK/New/2/Don%27t dream it%27s over.mp3'},
  {'icon': iconImage, 'title': 'Dont Speak', 'file': '../../../../../../../../F:/MUSIK/New/2/Don%27t speak.mp3'},
  {'icon': iconImage, 'title': 'Dont Stop The Music', 'file': '../../../../../../../../F:/MUSIK/New/2/Don%27t Stop The Music.mp3'},
  {'icon': iconImage, 'title': 'Drinking From The Bottle', 'file': '../../../../../../../../F:/MUSIK/New/2/Drinking from the bottle.mp3'},
  {'icon': iconImage, 'title': 'Dup Step', 'file': '../../../../../../../../F:/MUSIK/New/2/Dup Step.mp3'},
  {'icon': iconImage, 'title': 'Elton John Blessed', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Elton John - Blessed.mp3'},
  {'icon': iconImage, 'title': 'Elysium', 'file': '../../../../../../../../F:/MUSIK/New/2/Elysium.mp3'},
  {'icon': iconImage, 'title': 'Empire', 'file': '../../../../../../../../F:/MUSIK/New/2/Empire.mp3'},
  {'icon': iconImage, 'title': 'Eric Serra The Diva Dance', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Eric Serra-The Diva Dance.MP3'},
  {'icon': iconImage, 'title': 'Eros Ramazotti & Tina Turner Cosse Della Vita', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Eros Ramazotti & Tina Turner - Cosse Della Vita.mp3'},
  {'icon': iconImage, 'title': 'Es Ist Nie Vorbie', 'file': '../../../../../../../../F:/MUSIK/New/2/Es Ist Nie Vorbie.mp3'},
  {'icon': iconImage, 'title': 'Eternal Flame', 'file': '../../../../../../../../F:/MUSIK/New/2/Eternal Flame.mp4'},
  {'icon': iconImage, 'title': 'Evanescence Bring Me To Life', 'file': '../../../../../../../../F:/MUSIK/New/Copy/evanescence_-_bring_me_to_life.mp3'},
  {'icon': iconImage, 'title': 'Every Breath You Take', 'file': '../../../../../../../../F:/MUSIK/New/2/Every breath you take.mp3'},
  {'icon': iconImage, 'title': 'Everybody Wants To Rule The World', 'file': '../../../../../../../../F:/MUSIK/New/2/Everybody wants to rule the world.mp3'},
  {'icon': iconImage, 'title': 'Famous Last Words', 'file': '../../../../../../../../F:/MUSIK/New/~sort/MY CHEMICAL ROMANCE/Famous Last Words.mp3'},
  {'icon': iconImage, 'title': 'Feel The Light', 'file': '../../../../../../../../F:/MUSIK/New/2/Feel the light.mp3'},
  {'icon': iconImage, 'title': 'Fighte', 'file': '../../../../../../../../F:/MUSIK/New/2/Fighte.mp3'},
  {'icon': iconImage, 'title': 'Fire Water Burn', 'file': '../../../../../../../../F:/MUSIK/New/2/Fire water burn.mp3'},
  {'icon': iconImage, 'title': 'Fleur Du Mal', 'file': '../../../../../../../../F:/MUSIK/New/2/Fleur Du Mal.MP3'},
  {'icon': iconImage, 'title': 'Fly', 'file': '../../../../../../../../F:/MUSIK/New/2/Fly.mp3'},
  {'icon': iconImage, 'title': 'Fly On The Wings Of Love', 'file': '../../../../../../../../F:/MUSIK/New/2/Fly On The Wings Of Love.mp3'},
  {'icon': iconImage, 'title': 'Fragments Of Freedom', 'file': '../../../../../../../../F:/MUSIK/New/2/Fragments Of Freedom.mp3'},
  {'icon': iconImage, 'title': 'Freestyler', 'file': '../../../../../../../../F:/MUSIK/New/2/Freestyler.mp3'},
  {'icon': iconImage, 'title': 'Friends Will Be Friends', 'file': '../../../../../../../../F:/MUSIK/New/2/Friends Will Be Friends.mp3'},
  {'icon': iconImage, 'title': 'Frozen', 'file': '../../../../../../../../F:/MUSIK/New/2/Frozen.mp3'},
  {'icon': iconImage, 'title': 'George Michael Jesus To A Child', 'file': '../../../../../../../../F:/MUSIK/New/Copy/George Michael - Jesus to a child.mp3'},
  {'icon': iconImage, 'title': 'Georgio Moroder Love Theme From Flash Dance', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Georgio Moroder - Love Theme From Flash Dance.mp3'},
  {'icon': iconImage, 'title': 'Get A Haircut', 'file': '../../../../../../../../F:/MUSIK/New/2/Get a Haircut.mp3'},
  {'icon': iconImage, 'title': 'Get A Job', 'file': '../../../../../../../../F:/MUSIK/New/2/Get a Job.mp3'},
  {'icon': iconImage, 'title': 'Gilla Johnny', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Gilla - Johnny.mp3'},
  {'icon': iconImage, 'title': 'Giving In', 'file': '../../../../../../../../F:/MUSIK/New/2/Giving In.mp3'},
  {'icon': iconImage, 'title': 'Godfather', 'file': '../../../../../../../../F:/MUSIK/New/F/Godfather.mp3'},
  {'icon': iconImage, 'title': 'Gorky Park Bang', 'file': '../../../../../../../../F:/MUSIK/New/2/gorky_park_bang.mp3'},
  {'icon': iconImage, 'title': 'Gorky Park Moscow Calling', 'file': '../../../../../../../../F:/MUSIK/New/2/gorky_park_moscow_calling.mp3'},
  {'icon': iconImage, 'title': 'Goulding Burn', 'file': '../../../../../../../../F:/MUSIK/New/2/Goulding Burn.mp3'},
  {'icon': iconImage, 'title': 'Graig David & Sting Rise And Fall', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Graig David & Sting - Rise And Fall.mp3'},
  {'icon': iconImage, 'title': 'Gridlock', 'file': '../../../../../../../../F:/MUSIK/New/2/Gridlock.mp3'},
  {'icon': iconImage, 'title': 'Gunsn Roses Knocking On Heavens Door M', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Guns%27n Roses - Knocking On Heavens Door+M.mp3'},
  {'icon': iconImage, 'title': 'Gunsnroses Dont Cry', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Guns%27N%27Roses - Don%27t cry.mp3'},
  {'icon': iconImage, 'title': 'Hafanana', 'file': '../../../../../../../../F:/MUSIK/New/2/Hafanana.mp4'},
  {'icon': iconImage, 'title': 'Halo', 'file': '../../../../../../../../F:/MUSIK/New/2/Halo.mp3'},
  {'icon': iconImage, 'title': 'Happy New Year', 'file': '../../../../../../../../F:/MUSIK/New/2/Happy New Year.mp3'},
  {'icon': iconImage, 'title': 'Heaven', 'file': '../../../../../../../../F:/MUSIK/New/2/Heaven.mp3'},
  {'icon': iconImage, 'title': 'Heaven Is A Place On Earth', 'file': '../../../../../../../../F:/MUSIK/New/Heaven is a place on earth.mp3'},
  {'icon': iconImage, 'title': 'Help!', 'file': '../../../../../../../../F:/MUSIK/New/2/Help!.mp3'},
  {'icon': iconImage, 'title': 'Hey Mama', 'file': '../../../../../../../../F:/MUSIK/New/2/Hey-Mama.mp3'},
  {'icon': iconImage, 'title': 'History Of Artemisia', 'file': '../../../../../../../../F:/MUSIK/New/2/History Of Artemisia.mp3'},
  {'icon': iconImage, 'title': 'Home Again', 'file': '../../../../../../../../F:/MUSIK/New/2/Home Again.mp3'},
  {'icon': iconImage, 'title': 'How You Remind Me', 'file': '../../../../../../../../F:/MUSIK/New/2/How You Remind Me.mp3'},
  {'icon': iconImage, 'title': 'Hungry Eyes', 'file': '../../../../../../../../F:/MUSIK/New/2/Hungry eyes.mp3'},
  {'icon': iconImage, 'title': 'I Disappear', 'file': '../../../../../../../../F:/MUSIK/New/2/I Disappear.MP3'},
  {'icon': iconImage, 'title': 'I Dont Want To Miss A Thing', 'file': '../../../../../../../../F:/MUSIK/New/2/I Don%27t Want to Miss a Thing.mp4'},
  {'icon': iconImage, 'title': 'I Saw You Dancing', 'file': '../../../../../../../../F:/MUSIK/New/2/I Saw You Dancing.mp3'},
  {'icon': iconImage, 'title': 'If You Leave Me Now', 'file': '../../../../../../../../F:/MUSIK/New/2/If You Leave Me Now.mp3'},
  {'icon': iconImage, 'title': 'Igels Hotel California (studio)', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Igels - Hotel California (studio).mp3'},
  {'icon': iconImage, 'title': 'Iggy Pop In The Death Car', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Iggy Pop - In The Death Car.mp3'},
  {'icon': iconImage, 'title': 'Iko Iko', 'file': '../../../../../../../../F:/MUSIK/New/2/Iko iko.mp3'},
  {'icon': iconImage, 'title': 'In The End', 'file': '../../../../../../../../F:/MUSIK/New/2/In the End.mp3'},
  {'icon': iconImage, 'title': 'In The Shadows', 'file': '../../../../../../../../F:/MUSIK/New/2/In The Shadows.mp3'},
  {'icon': iconImage, 'title': 'In The Summertime', 'file': '../../../../../../../../F:/MUSIK/New/2/In The Summertime.mp3'},
  {'icon': iconImage, 'title': 'It`s Raining Men', 'file': '../../../../../../../../F:/MUSIK/New/2/It`s raining men.mp3'},
  {'icon': iconImage, 'title': 'Its Time', 'file': '../../../../../../../../F:/MUSIK/New/2/It%27s Time.mp3'},
  {'icon': iconImage, 'title': 'J Dassiin Et Si Tu Nexistais', 'file': '../../../../../../../../F:/MUSIK/New/Copy/J.Dassiin - Et si tu N%27existais.mp3'},
  {'icon': iconImage, 'title': 'Jason Donovan Scaled With A Kiss', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Jason Donovan - Scaled With A Kiss.mp3'},
  {'icon': iconImage, 'title': 'Joe Dassin A Toi', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Joe Dassin - A Toi.mp3'},
  {'icon': iconImage, 'title': 'Julio Iglesias Caruso', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Julio Iglesias - Caruso.MP3'},
  {'icon': iconImage, 'title': 'Kaleidoscope Of Mathematics', 'file': '../../../../../../../../F:/MUSIK/New/2/Kaleidoscope of Mathematics.mp3'},
  {'icon': iconImage, 'title': 'Ku Ku Djambo', 'file': '../../../../../../../../F:/MUSIK/New/2/Ku ku Djambo.mp3'},
  {'icon': iconImage, 'title': 'Kung Fu Fighting', 'file': '../../../../../../../../F:/MUSIK/New/2/Kung fu fighting.mp3'},
  {'icon': iconImage, 'title': 'La Fete Des Fous', 'file': '../../../../../../../../F:/MUSIK/New/2/La Fete Des Fous.mp3'},
  {'icon': iconImage, 'title': 'La La La', 'file': '../../../../../../../../F:/MUSIK/New/2/La la la.mp3'},
  {'icon': iconImage, 'title': 'Lambada', 'file': '../../../../../../../../F:/MUSIK/New/2/Lambada.mp3'},
  {'icon': iconImage, 'title': 'Lauren Christy The Color ', 'file': '../../../../../../../../F:/MUSIK/New/Copy/LAUREN_CHRISTY___THE_COLOR_.MP3'},
  {'icon': iconImage, 'title': 'Layla', 'file': '../../../../../../../../F:/MUSIK/New/2/Layla.mp3'},
  {'icon': iconImage, 'title': 'Le Temps Des Cathedrales Fin', 'file': '../../../../../../../../F:/MUSIK/New/2/Le Temps Des Cathedrales Fin.mp3'},
  {'icon': iconImage, 'title': 'Let It Snow!', 'file': '../../../../../../../../F:/MUSIK/New/2/Let It Snow!.mp3'},
  {'icon': iconImage, 'title': 'Lisa Miskovsky', 'file': '../../../../../../../../F:/MUSIK/New/2/Lisa_Miskovsky.mp3'},
  {'icon': iconImage, 'title': 'Livin La Vida Loca', 'file': '../../../../../../../../F:/MUSIK/New/2/Livin%27 La Vida Loca.mp3'},
  {'icon': iconImage, 'title': 'Looking For The Summer', 'file': '../../../../../../../../F:/MUSIK/New/2/Looking For The Summer.mp3'},
  {'icon': iconImage, 'title': 'Lords Of The Boards', 'file': '../../../../../../../../F:/MUSIK/New/2/Lords Of The Boards.mp3'},
  {'icon': iconImage, 'title': 'Love Me Like You Do', 'file': '../../../../../../../../F:/MUSIK/New/2/Love me like you do.mp3'},
  {'icon': iconImage, 'title': 'Macarena 1996 (high Quality Audio)', 'file': '../../../../../../../../F:/MUSIK/New/~sort/Macarena 1996 (High Quality Audio).mp4'},
  {'icon': iconImage, 'title': 'Makarena', 'file': '../../../../../../../../F:/MUSIK/New/2/Makarena.mp3'},
  {'icon': iconImage, 'title': 'Mambo Italiano', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Romantic/Disco/Mambo Italiano.mp3'},
  {'icon': iconImage, 'title': 'Manic Monday', 'file': '../../../../../../../../F:/MUSIK/New/~sort/Manic Monday.mp4'},
  {'icon': iconImage, 'title': 'Maria Magdalen(ill Never Be)', 'file': '../../../../../../../../F:/MUSIK/New/2/Maria Magdalen(I%27ll Never Be).mp3'},
  {'icon': iconImage, 'title': 'Mariah Carey Without You ', 'file': '../../../../../../../../F:/MUSIK/New/Copy/MARIAH CAREY - WITHOUT YOU+.mp3'},
  {'icon': iconImage, 'title': 'Maywood Pasadena', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Maywood - Pasadena.mp3'},
  {'icon': iconImage, 'title': 'Metallica Nothing Else Matters', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Metallica - Nothing Else Matters.MP3'},
  {'icon': iconImage, 'title': 'Metallica The Unforgiven', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Metallica - The Unforgiven.MP3'},
  {'icon': iconImage, 'title': 'Mike Oldfield Moonlight Shadow', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Mike Oldfield - Moonlight Shadow.mp3'},
  {'icon': iconImage, 'title': 'Mon Mec A Moi', 'file': '../../../../../../../../F:/MUSIK/New/2/Mon Mec A Moi.mp3'},
  {'icon': iconImage, 'title': 'More Than You Know', 'file': '../../../../../../../../F:/MUSIK/New/2/More Than You Know.mp3'},
  {'icon': iconImage, 'title': 'Moscow Calling', 'file': '../../../../../../../../F:/MUSIK/New/2/moscow_calling.mp3'},
  {'icon': iconImage, 'title': 'Moscow Never Sleeps', 'file': '../../../../../../../../F:/MUSIK/New/2/Moscow never sleeps.mp3'},
  {'icon': iconImage, 'title': 'Mr Big Wind World', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Mr.Big - Wind World.mp3'},
  {'icon': iconImage, 'title': 'Mr Black Wonderful Life ', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Mr. Black - Wonderful Life+.mp3'},
  {'icon': iconImage, 'title': 'My All', 'file': '../../../../../../../../F:/MUSIK/New/~sort/My All.mp4'},
  {'icon': iconImage, 'title': 'My Darkest Days Porn Star Dancing Myzuka Fm', 'file': '../../../../../../../../F:/MUSIK/New/2/my_darkest_days_porn_star_dancing_myzuka.fm.mp3'},
  {'icon': iconImage, 'title': 'No Doubt Dont Speak', 'file': '../../../../../../../../F:/MUSIK/New/Copy/No Doubt - Don%27t Speak.MP3'},
  {'icon': iconImage, 'title': 'No Doubt Dont Speak', 'file': '../../../../../../../../F:/MUSIK/New/Copy/no_doubt_-_dont_speak.mp3'},
  {'icon': iconImage, 'title': 'No Doubt Ex Girlfriend', 'file': '../../../../../../../../F:/MUSIK/New/Copy/no_doubt_-_ex-girlfriend.mp3'},
  {'icon': iconImage, 'title': 'No Leaf Clover', 'file': '../../../../../../../../F:/MUSIK/New/2/No Leaf Clover.mp3'},
  {'icon': iconImage, 'title': 'Now We Are Free', 'file': '../../../../../../../../F:/MUSIK/New/2/Now we are free.mp3'},
  {'icon': iconImage, 'title': 'Objection', 'file': '../../../../../../../../F:/MUSIK/New/2/Objection.mp3'},
  {'icon': iconImage, 'title': 'Ode To My Family', 'file': '../../../../../../../../F:/MUSIK/New/2/Ode To My Family.mp3'},
  {'icon': iconImage, 'title': 'Old Man', 'file': '../../../../../../../../F:/MUSIK/New/2/Old man.mp3'},
  {'icon': iconImage, 'title': 'Omen Mt Eden', 'file': '../../../../../../../../F:/MUSIK/New/2/Omen mt eden.mp3'},
  {'icon': iconImage, 'title': 'Once Upon A December', 'file': '../../../../../../../../F:/MUSIK/New/~sort/Once Upon a December.mp4'},
  {'icon': iconImage, 'title': 'Only Time', 'file': '../../../../../../../../F:/MUSIK/New/2/Only Time.mp3'},
  {'icon': iconImage, 'title': 'Overdrive', 'file': '../../../../../../../../F:/MUSIK/New/2/Overdrive.mp3'},
  {'icon': iconImage, 'title': 'Paperman', 'file': '../../../../../../../../F:/MUSIK/New/2/Paperman.mp3'},
  {'icon': iconImage, 'title': 'Pardone Moi', 'file': '../../../../../../../../F:/MUSIK/New/2/Pardone moi.mp3'},
  {'icon': iconImage, 'title': 'Paul Mauriat Love Is Blue', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Paul Mauriat - Love is Blue.mp3'},
  {'icon': iconImage, 'title': 'Paul Mauriat Love Is Blue', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Paul Mauriat -Love Is Blue.mp3'},
  {'icon': iconImage, 'title': 'Paul Mauriat The Good The Bad The Ugly', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Paul Mauriat-The Good ,The  Bad, The Ugly.MP3'},
  {'icon': iconImage, 'title': 'Paul Mauriat Toccata', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Paul Mauriat - Toccata.mp3'},
  {'icon': iconImage, 'title': 'Pink Floyd Another Brick In The Wall (2)', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Pink Floyd - Another Brick In The Wall (2).mp3'},
  {'icon': iconImage, 'title': 'Put Your Lights On', 'file': '../../../../../../../../F:/MUSIK/New/Put Your Lights On.mp3'},
  {'icon': iconImage, 'title': 'Ray Parker Ghostbusters', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Ray Parker - Ghostbusters.mp3'},
  {'icon': iconImage, 'title': 'Real Or Imagines', 'file': '../../../../../../../../F:/MUSIK/New/2/Real or Imagines.mp3'},
  {'icon': iconImage, 'title': 'Rednex Wish You Were Here ', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Rednex - Wish You Were Here+.mp3'},
  {'icon': iconImage, 'title': 'Ricchi E Poveri Casa Mia', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Ricchi E Poveri - Casa Mia.mp3'},
  {'icon': iconImage, 'title': 'Ricchi E Poveri Mamma Mia', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Ricchi E Poveri - Mamma Mia.mp3'},
  {'icon': iconImage, 'title': 'Ricchi E Poveri Sara Perche Ti Amo', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Ricchi E Poveri - Sara Perche Ti Amo.mp3'},
  {'icon': iconImage, 'title': 'Rob D Clubbed To Death(kurayamino Mix)', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Rob D-Clubbed to death(kurayamino mix).MP3'},
  {'icon': iconImage, 'title': 'Robert Miles Children (dream Dance)', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Robert Miles - Children (Dream Dance).mp3'},
  {'icon': iconImage, 'title': 'Robert Myles Fable', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Robert Myles - Fable.mp3'},
  {'icon': iconImage, 'title': 'Rockstar', 'file': '../../../../../../../../F:/MUSIK/New/2/Rockstar.mp3'},
  {'icon': iconImage, 'title': 'Romance', 'file': '../../../../../../../../F:/MUSIK/New/~sort/MY CHEMICAL ROMANCE/Romance.mp3'},
  {'icon': iconImage, 'title': 'Sail', 'file': '../../../../../../../../F:/MUSIK/New/2/Sail.mp3'},
  {'icon': iconImage, 'title': 'Samba De Janeiro', 'file': '../../../../../../../../F:/MUSIK/New/2/Samba De Janeiro.mp4'},
  {'icon': iconImage, 'title': 'Sandra Nasic', 'file': '../../../../../../../../F:/MUSIK/New/2/Sandra Nasic.mp3'},
  {'icon': iconImage, 'title': 'Scars', 'file': '../../../../../../../../F:/MUSIK/New/2/Scars.mp3'},
  {'icon': iconImage, 'title': 'Schwarze Sonne', 'file': '../../../../../../../../F:/MUSIK/New/2/Schwarze sonne.mp3'},
  {'icon': iconImage, 'title': 'Scorpions Still Loving You', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Scorpions - Still Loving You.mp3'},
  {'icon': iconImage, 'title': 'Self Control', 'file': '../../../../../../../../F:/MUSIK/New/2/Self Control.mp3'},
  {'icon': iconImage, 'title': 'Shape Of My Heart', 'file': '../../../../../../../../F:/MUSIK/New/2/Shape of My Heart.mp3'},
  {'icon': iconImage, 'title': 'Show Must Go On', 'file': '../../../../../../../../F:/MUSIK/New/2/Show Must Go On.mp3'},
  {'icon': iconImage, 'title': 'Sixteen Tons', 'file': '../../../../../../../../F:/MUSIK/New/2/Sixteen Tons.mp3'},
  {'icon': iconImage, 'title': 'Slave To Live', 'file': '../../../../../../../../F:/MUSIK/New/2/Slave To Live.mp3'},
  {'icon': iconImage, 'title': 'Smack My Bitch Up', 'file': '../../../../../../../../F:/MUSIK/New/2/Smack my bitch up.mp3'},
  {'icon': iconImage, 'title': 'Smooth Criminal', 'file': '../../../../../../../../F:/MUSIK/New/2/Smooth Criminal.mp3'},
  {'icon': iconImage, 'title': 'Somebody That I Used To Know', 'file': '../../../../../../../../F:/MUSIK/New/2/Somebody that i used to know.mp3'},
  {'icon': iconImage, 'title': 'Someone To Save You', 'file': '../../../../../../../../F:/MUSIK/New/~sort/Dreaming Out Loud/Someone To Save You.mp3'},
  {'icon': iconImage, 'title': 'Somewhere I Belong', 'file': '../../../../../../../../F:/MUSIK/New/2/Somewhere I Belong.mp3'},
  {'icon': iconImage, 'title': 'Sonne', 'file': '../../../../../../../../F:/MUSIK/New/2/Sonne.mp3'},
  {'icon': iconImage, 'title': 'Stars Dance Myzuka', 'file': '../../../../../../../../F:/MUSIK/New/2/Stars dance myzuka.mp3'},
  {'icon': iconImage, 'title': 'Sting Fields Of Gold', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Sting - Fields Of Gold.mp3'},
  {'icon': iconImage, 'title': 'Storm', 'file': '../../../../../../../../F:/MUSIK/New/2/Storm.mp3'},
  {'icon': iconImage, 'title': 'Straight Up', 'file': '../../../../../../../../F:/MUSIK/New/2/Straight Up.mp3'},
  {'icon': iconImage, 'title': 'Summer', 'file': '../../../../../../../../F:/MUSIK/New/2/Summer.mp3'},
  {'icon': iconImage, 'title': 'Summertime Sadness', 'file': '../../../../../../../../F:/MUSIK/New/2/Summertime Sadness.mp3'},
  {'icon': iconImage, 'title': 'Syberian', 'file': '../../../../../../../../F:/MUSIK/New/2/Syberian.mp3'},
  {'icon': iconImage, 'title': 'Take A Look Around', 'file': '../../../../../../../../F:/MUSIK/New/2/Take A Look Around.mp3'},
  {'icon': iconImage, 'title': 'Takes Me Nowhere', 'file': '../../../../../../../../F:/MUSIK/New/2/Takes Me Nowhere.mp3'},
  {'icon': iconImage, 'title': 'Tanita Tikaram Twist In My Sobriety', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Tanita Tikaram - Twist in my sobriety.mp3'},
  {'icon': iconImage, 'title': 'Team Sleep The Passportal', 'file': '../../../../../../../../F:/MUSIK/New/~sort/Team sleep-The Passportal.mp3'},
  {'icon': iconImage, 'title': 'Teardrop', 'file': '../../../../../../../../F:/MUSIK/New/2/Teardrop.mp3'},
  {'icon': iconImage, 'title': 'Teenagers', 'file': '../../../../../../../../F:/MUSIK/New/~sort/MY CHEMICAL ROMANCE/Teenagers.mp3'},
  {'icon': iconImage, 'title': 'The Bangles Eternal Flamme', 'file': '../../../../../../../../F:/MUSIK/New/Copy/The Bangles - Eternal Flamme.mp3'},
  {'icon': iconImage, 'title': 'The Beatles Yesterday', 'file': '../../../../../../../../F:/MUSIK/New/Copy/The Beatles - Yesterday.mp3'},
  {'icon': iconImage, 'title': 'The Fall', 'file': '../../../../../../../../F:/MUSIK/New/2/The fall.mp3'},
  {'icon': iconImage, 'title': 'The Kids Arent Alright', 'file': '../../../../../../../../F:/MUSIK/New/2/The kids aren%27t alright.mp3'},
  {'icon': iconImage, 'title': 'The Lively Ones', 'file': '../../../../../../../../F:/MUSIK/New/2/The lively ones.mp3'},
  {'icon': iconImage, 'title': 'The Lonely Shepherd', 'file': '../../../../../../../../F:/MUSIK/New/2/The lonely shepherd.mp3'},
  {'icon': iconImage, 'title': 'The Memory Remains', 'file': '../../../../../../../../F:/MUSIK/New/2/The Memory Remains.mp3'},
  {'icon': iconImage, 'title': 'The New Order', 'file': '../../../../../../../../F:/MUSIK/New/G/The New Order.mp3'},
  {'icon': iconImage, 'title': 'The Night Before', 'file': '../../../../../../../../F:/MUSIK/New/2/The Night Before.mp3'},
  {'icon': iconImage, 'title': 'The Roy Orbison Medley', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Romantic/Disco/The Roy Orbison Medley.mp3'},
  {'icon': iconImage, 'title': 'The Show Must Go On', 'file': '../../../../../../../../F:/MUSIK/New/2/The Show Must Go On.mp3'},
  {'icon': iconImage, 'title': 'The Unforgiven', 'file': '../../../../../../../../F:/MUSIK/New/2/The Unforgiven.MP3'},
  {'icon': iconImage, 'title': 'There He Is', 'file': '../../../../../../../../F:/MUSIK/New/F/There he is.mp3'},
  {'icon': iconImage, 'title': 'This Is The New Shit', 'file': '../../../../../../../../F:/MUSIK/New/2/This is The New Shit.mp3'},
  {'icon': iconImage, 'title': 'Thunder', 'file': '../../../../../../../../F:/MUSIK/New/2/Thunder.mp3'},
  {'icon': iconImage, 'title': 'Time', 'file': '../../../../../../../../F:/MUSIK/New/2/Time.mp3'},
  {'icon': iconImage, 'title': 'Time To Burn', 'file': '../../../../../../../../F:/MUSIK/New/2/Time to Burn.mp3'},
  {'icon': iconImage, 'title': 'Tony Braxton Unbreak My Heart', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Tony Braxton - UnBreak my Heart.mp3'},
  {'icon': iconImage, 'title': 'Touch By Touch', 'file': '../../../../../../../../F:/MUSIK/New/2/Touch by touch.mp3'},
  {'icon': iconImage, 'title': 'Towards The Sun', 'file': '../../../../../../../../F:/MUSIK/New/2/Towards the sun.mp3'},
  {'icon': iconImage, 'title': 'Tu Vas Me Detruire', 'file': '../../../../../../../../F:/MUSIK/New/2/Tu Vas Me Detruire.mp3'},
  {'icon': iconImage, 'title': 'Tuyo', 'file': '../../../../../../../../F:/MUSIK/New/2/Tuyo.mp3'},
  {'icon': iconImage, 'title': 'Umbrella', 'file': '../../../../../../../../F:/MUSIK/New/2/Umbrella.mp3'},
  {'icon': iconImage, 'title': 'Unchain My Heart', 'file': '../../../../../../../../F:/MUSIK/New/Unchain My Heart.mp4'},
  {'icon': iconImage, 'title': 'Underneath Your Clothes', 'file': '../../../../../../../../F:/MUSIK/New/2/Underneath your clothes.mp3'},
  {'icon': iconImage, 'title': 'Vacuum I Breathe', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Vacuum - I Breathe.mp3'},
  {'icon': iconImage, 'title': 'Valkyrie', 'file': '../../../../../../../../F:/MUSIK/New/2/Valkyrie.mp3'},
  {'icon': iconImage, 'title': 'Vangelis La Petite Fille De La Mer', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Vangelis - La Petite Fille De La Mer.mp3'},
  {'icon': iconImage, 'title': 'W Houston I Will Always Love You', 'file': '../../../../../../../../F:/MUSIK/New/Copy/W. Houston-I Will Always Love You.MP3'},
  {'icon': iconImage, 'title': 'Waltz (from Sleeping Beauty)', 'file': '../../../../../../../../F:/MUSIK/New/2/Waltz (From Sleeping Beauty).mp3'},
  {'icon': iconImage, 'title': 'We Are One Ole Ola', 'file': '../../../../../../../../F:/MUSIK/New/2/We are one ole ola.mp3'},
  {'icon': iconImage, 'title': 'We Will Rock You', 'file': '../../../../../../../../F:/MUSIK/New/2/We Will Rock You.mp3'},
  {'icon': iconImage, 'title': 'Welcome To My World Myzuka', 'file': '../../../../../../../../F:/MUSIK/New/2/Welcome to my world myzuka.mp3'},
  {'icon': iconImage, 'title': 'Welcome To The Black Parade', 'file': '../../../../../../../../F:/MUSIK/New/~sort/MY CHEMICAL ROMANCE/Welcome To The Black Parade.mp3'},
  {'icon': iconImage, 'title': 'West Bound And Down', 'file': '../../../../../../../../F:/MUSIK/New/2/West bound_and_down.mp3'},
  {'icon': iconImage, 'title': 'West Coast', 'file': '../../../../../../../../F:/MUSIK/New/2/West coast.mp3'},
  {'icon': iconImage, 'title': 'What A Life', 'file': '../../../../../../../../F:/MUSIK/New/2/What A Life.mp3'},
  {'icon': iconImage, 'title': 'Whatever It Takes', 'file': '../../../../../../../../F:/MUSIK/New/2/Whatever It Takes.mp3'},
  {'icon': iconImage, 'title': 'When I Dream', 'file': '../../../../../../../../F:/MUSIK/New/2/When I Dream.mp3'},
  {'icon': iconImage, 'title': 'Whenever Wherever', 'file': '../../../../../../../../F:/MUSIK/New/2/Whenever Wherever.mp3'},
  {'icon': iconImage, 'title': 'Whenever You Will Go', 'file': '../../../../../../../../F:/MUSIK/New/Whenever you will go.MP3'},
  {'icon': iconImage, 'title': 'Where The Wild Roses Grow', 'file': '../../../../../../../../F:/MUSIK/New/2/Where The Wild Roses Grow.mp3'},
  {'icon': iconImage, 'title': 'Whiskey In Jar', 'file': '../../../../../../../../F:/MUSIK/New/2/Whiskey In Jar.mp3'},
  {'icon': iconImage, 'title': 'Whitney Houston I Will Always Love You', 'file': '../../../../../../../../F:/MUSIK/New/Copy/Whitney Houston - I Will Always Love You.mp3'},
  {'icon': iconImage, 'title': 'Who Wants To Live Forever', 'file': '../../../../../../../../F:/MUSIK/New/2/Who Wants To Live Forever.mp3'},
  {'icon': iconImage, 'title': 'Wild Child', 'file': '../../../../../../../../F:/MUSIK/New/2/Wild Child.mp3'},
  {'icon': iconImage, 'title': 'Wind Of Change', 'file': '../../../../../../../../F:/MUSIK/New/2/Wind Of Change.mp3'},
  {'icon': iconImage, 'title': 'Word Up!', 'file': '../../../../../../../../F:/MUSIK/New/2/Word Up!.mp3'},
  {'icon': iconImage, 'title': 'Wrong', 'file': '../../../../../../../../F:/MUSIK/New/2/Wrong.mp3'},
  {'icon': iconImage, 'title': 'You Fly Me Up', 'file': '../../../../../../../../F:/MUSIK/New/2/You Fly Me Up.mp3'},
  {'icon': iconImage, 'title': 'You`re Not Alone', 'file': '../../../../../../../../F:/MUSIK/New/2/You`re not alone.mp3'},
  {'icon': iconImage, 'title': 'Youll Be Under My Wheels', 'file': '../../../../../../../../F:/MUSIK/New/2/Youll be under my wheels.mp3'},
  {'icon': iconImage, 'title': 'Young And Beautiful Myzuka', 'file': '../../../../../../../../F:/MUSIK/New/2/Young and beautiful myzuka.mp3'},
  {'icon': iconImage, 'title': 'Zombie', 'file': '../../../../../../../../F:/MUSIK/New/2/Zombie.mp3'},
  {'icon': iconImage, 'title': 'Безымянный', 'file': '../../../../../../../../F:/MUSIK/New/2/Безымянный.mp3'},
  {'icon': iconImage, 'title': 'Беспечный Ангел', 'file': '../../../../../../../../F:/MUSIK/New/2/Беспечный ангел.mp3'},
  {'icon': iconImage, 'title': 'Вальс Из Кф Мой Ласк Нежн Зверь', 'file': '../../../../../../../../F:/MUSIK/New/2/Вальс из кф Мой ласк нежн зверь.mp3'},
  {'icon': iconImage, 'title': 'Верхом На Звезде', 'file': '../../../../../../../../F:/MUSIK/New/2/Верхом на звезде.mp3'},
  {'icon': iconImage, 'title': 'Возьми Моё Сердце', 'file': '../../../../../../../../F:/MUSIK/New/2/Возьми моё сердце.mp3'},
  {'icon': iconImage, 'title': 'Волки', 'file': '../../../../../../../../F:/MUSIK/New/2/Волки.mp3'},
  {'icon': iconImage, 'title': 'Воспоминания О Былой Любви', 'file': '../../../../../../../../F:/MUSIK/New/2/Воспоминания о былой любви.mp3'},
  {'icon': iconImage, 'title': 'Выбрось Из Головы', 'file': '../../../../../../../../F:/MUSIK/New/2/Выбрось из головы.mp3'},
  {'icon': iconImage, 'title': 'Выхода Нет', 'file': '../../../../../../../../F:/MUSIK/New/2/Выхода нет.mp3'},
  {'icon': iconImage, 'title': 'Где Мы Летим', 'file': '../../../../../../../../F:/MUSIK/New/2/Где мы летим.mp3'},
  {'icon': iconImage, 'title': 'Глаза Очерчены Углем', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/1997 - Стекло (1997, Аура)/Глаза очерчены углем.mp3'},
  {'icon': iconImage, 'title': 'Движение', 'file': '../../../../../../../../F:/MUSIK/New/2/Движение.mp3'},
  {'icon': iconImage, 'title': 'Дыхание', 'file': '../../../../../../../../F:/MUSIK/New/2/Дыхание.mp3'},
  {'icon': iconImage, 'title': 'Зимняя Сказка', 'file': '../../../../../../../../F:/MUSIK/New/2/Зимняя сказка.mp3'},
  {'icon': iconImage, 'title': 'Кукла Колдуна', 'file': '../../../../../../../../F:/MUSIK/New/2/Кукла колдуна.mp3'},
  {'icon': iconImage, 'title': 'Лесник', 'file': '../../../../../../../../F:/MUSIK/New/2/Лесник.mp3'},
  {'icon': iconImage, 'title': 'Летели Облака', 'file': '../../../../../../../../F:/MUSIK/New/2/Летели облака.mp3'},
  {'icon': iconImage, 'title': 'Метель', 'file': '../../../../../../../../F:/MUSIK/New/2/Метель.mp3'},
  {'icon': iconImage, 'title': 'Мне Бы В Небо', 'file': '../../../../../../../../F:/MUSIK/New/2/Мне Бы В Небо.mp3'},
  {'icon': iconImage, 'title': 'На Берегу Безымянной Реки', 'file': '../../../../../../../../F:/MUSIK/New/2/На Берегу Безымянной Реки.mp3'},
  {'icon': iconImage, 'title': 'На Заре', 'file': '../../../../../../../../F:/MUSIK/New/1/На заре.mp3'},
  {'icon': iconImage, 'title': 'Наши Детские Смешные Голоса', 'file': '../../../../../../../../F:/MUSIK/New/2/Наши детские смешные голоса.mp3'},
  {'icon': iconImage, 'title': 'Никогда', 'file': '../../../../../../../../F:/MUSIK/New/2/Никогда.mp3'},
  {'icon': iconImage, 'title': 'Ночная Дорога', 'file': '../../../../../../../../F:/MUSIK/New/2/Ночная дорога.mp3'},
  {'icon': iconImage, 'title': 'Осколок Льда', 'file': '../../../../../../../../F:/MUSIK/New/2/Осколок льда.mp3'},
  {'icon': iconImage, 'title': 'От Кореи До Карелии', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2007 - Мракобесие и джаз (2007, Grand Records)/От Кореи до Карелии.mp3'},
  {'icon': iconImage, 'title': 'Отучи Меня Говорить', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/1997 - Стекло (1997, Аура)/Отучи меня говорить.mp3'},
  {'icon': iconImage, 'title': 'Позови Меня С Собой', 'file': '../../../../../../../../F:/MUSIK/New/2/Позови меня с собой.WAV'},
  {'icon': iconImage, 'title': 'Полковнику Никто Не Пишет', 'file': '../../../../../../../../F:/MUSIK/New/2/Полковнику никто не пишет.mp3'},
  {'icon': iconImage, 'title': 'Последняя Поэма', 'file': '../../../../../../../../F:/MUSIK/New/2/Последняя поэма.mp3'},
  {'icon': iconImage, 'title': 'Потерянный Рай', 'file': '../../../../../../../../F:/MUSIK/New/2/Потерянный рай.mp3'},
  {'icon': iconImage, 'title': 'Предчувствие', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/1997 - Стекло (1997, Аура)/Предчувствие.mp3'},
  {'icon': iconImage, 'title': 'Прогулки По Воде', 'file': '../../../../../../../../F:/MUSIK/New/2/Прогулки по воде.mp3'},
  {'icon': iconImage, 'title': 'Пыяла', 'file': '../../../../../../../../F:/MUSIK/New/1/Пыяла.mp3'},
  {'icon': iconImage, 'title': 'Родная', 'file': '../../../../../../../../F:/MUSIK/New/2/Родная.mp3'},
  {'icon': iconImage, 'title': 'Серебряный Сентябрь', 'file': '../../../../../../../../F:/MUSIK/New/2/Серебряный сентябрь.mp3'},
  {'icon': iconImage, 'title': 'Сияние', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2019 - В руках великана/Сияние.mp3'},
  {'icon': iconImage, 'title': 'Счастливчик', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2019 - В руках великана/Счастливчик.mp3'},
  {'icon': iconImage, 'title': 'Там На Самом На Краю Земли', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/Там на самом на краю земли.mp4'},
  {'icon': iconImage, 'title': 'Три Полоски', 'file': '../../../../../../../../F:/MUSIK/New/2/Три полоски.mp3'},
  {'icon': iconImage, 'title': 'Тутанхамон', 'file': '../../../../../../../../F:/MUSIK/New/2/Тутанхамон.mp3'},
  {'icon': iconImage, 'title': 'Ты Кукла Из Папье Маше', 'file': '../../../../../../../../F:/MUSIK/New/Пикник/2017 - Искры и канкан/Ты кукла из папье-маше.mp3'},
  {'icon': iconImage, 'title': 'Хиты Года Хиты 2023 Лучшие Песни 2023 Итоги Года 2023 (256 Kbps)', 'file': '../../../../../../../../F:/MUSIK/New/1/ХИТЫ ГОДА ХИТЫ 2023 ЛУЧШИЕ ПЕСНИ 2023 ИТОГИ ГОДА 2023 (256 kbps).mp3'},
  {'icon': iconImage, 'title': 'Этот День', 'file': '../../../../../../../../F:/MUSIK/New/2/Этот день.mp3'},
  {'icon': iconImage, 'title': 'Я Здесь', 'file': '../../../../../../../../F:/MUSIK/New/2/Я здесь.mp3'},
  {'icon': iconImage, 'title': 'Я Свободен', 'file': '../../../../../../../../F:/MUSIK/New/2/Я свободен.mp3'},
]);
})

document.getElementById('nightwish').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '10th Man Down', 'file': '../../../../../../../../F:/MUSIK/Nightwish/2001 - Over The Hills And Far Away 2001/10th Man Down.mp3'},
  {'icon': iconImage, 'title': 'Bless The Child', 'file': '../../../../../../../../F:/MUSIK/Nightwish/2002 - Century Child 2002/Bless The Child.mp3'},
  {'icon': iconImage, 'title': 'Deep Silent Complete', 'file': '../../../../../../../../F:/MUSIK/Nightwish/2001 - From Wishes To Eternity (Live)/Deep Silent Complete.mp3'},
  {'icon': iconImage, 'title': 'Know Why The Nightingale Sings !', 'file': '../../../../../../../../F:/MUSIK/Nightwish/1997 - Angels Fall First/Know Why The Nightingale Sings !.mp3'},
  {'icon': iconImage, 'title': 'Outro', 'file': '../../../../../../../../F:/MUSIK/Nightwish/2001 - Live At Gorbunov%27s Palace Of Culture/Outro.mp3'},
  {'icon': iconImage, 'title': 'Phantom Of The Opera', 'file': '../../../../../../../../F:/MUSIK/Nightwish/2006 - End of an Era live/Phantom of the Opera.mp3'},
  {'icon': iconImage, 'title': 'Planet Hell', 'file': '../../../../../../../../F:/MUSIK/Nightwish/2004 - Nemo/Planet Hell.mp3'},
]);
})

document.getElementById('petshopboys').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Always On My Mind', 'file': '../../../../../../../../F:/MUSIK/Pet Shop Boys/Always on my mind.mp3'},
  {'icon': iconImage, 'title': 'Can You Forgive Her', 'file': '../../../../../../../../F:/MUSIK/Pet Shop Boys/Can you forgive her.mp3'},
  {'icon': iconImage, 'title': 'Go West', 'file': '../../../../../../../../F:/MUSIK/Pet Shop Boys/Go west.mp3'},
  {'icon': iconImage, 'title': 'Its A Sin', 'file': '../../../../../../../../F:/MUSIK/Pet Shop Boys/It%27s a sin.mp3'},
  {'icon': iconImage, 'title': 'Its A Sin', 'file': '../../../../../../../../F:/MUSIK/Pet Shop Boys/It%27s a Sin.mp4'},
  {'icon': iconImage, 'title': 'Kind Of Thing', 'file': '../../../../../../../../F:/MUSIK/Pet Shop Boys/Kind of thing.mp3'},
  {'icon': iconImage, 'title': 'Liberation', 'file': '../../../../../../../../F:/MUSIK/Pet Shop Boys/Liberation.mp3'},
  {'icon': iconImage, 'title': 'One In A Million', 'file': '../../../../../../../../F:/MUSIK/Pet Shop Boys/One in a million.mp3'},
  {'icon': iconImage, 'title': 'Point Of View', 'file': '../../../../../../../../F:/MUSIK/Pet Shop Boys/Point of view.mp3'},
  {'icon': iconImage, 'title': 'Queen', 'file': '../../../../../../../../F:/MUSIK/Pet Shop Boys/Queen.mp3'},
  {'icon': iconImage, 'title': 'The Theatre', 'file': '../../../../../../../../F:/MUSIK/Pet Shop Boys/The theatre.mp3'},
  {'icon': iconImage, 'title': 'To Speak Is A Sin', 'file': '../../../../../../../../F:/MUSIK/Pet Shop Boys/To speak is a sin.mp3'},
  {'icon': iconImage, 'title': 'Yesterday', 'file': '../../../../../../../../F:/MUSIK/Pet Shop Boys/Yesterday.mp3'},
]);
})

document.getElementById('piano').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '10 Memes Songs', 'file': '../../../../../../../../F:/MUSIK/Piano/10 Memes Songs.webm'},
  {'icon': iconImage, 'title': '17 Мгновений Весны Seventeen Moments Of Spring (piano)', 'file': '../../../../../../../../F:/MUSIK/Piano/17 мгновений весны - Seventeen Moments of Spring (piano).mp4'},
  {'icon': iconImage, 'title': '5 Reasons Why Piano Is The Easiest Instrument', 'file': '../../../../../../../../F:/MUSIK/Piano/5 Reasons Why Piano is the Easiest Instrument.mp4'},
  {'icon': iconImage, 'title': 'Ac Dc Back In Black (piano Cover By Gamazda)', 'file': '../../../../../../../../F:/MUSIK/Piano/AC_DC - Back In Black (Piano cover by Gamazda).mp4'},
  {'icon': iconImage, 'title': 'Batman V Superman Beautiful Lie (piano Version) Sheet Music', 'file': '../../../../../../../../F:/MUSIK/Piano/Batman v Superman - Beautiful Lie (Piano Version) + Sheet Music.mp4'},
  {'icon': iconImage, 'title': 'Braveheart Main Theme (piano Version)', 'file': '../../../../../../../../F:/MUSIK/Piano/Braveheart - Main Theme (Piano Version).mp4'},
  {'icon': iconImage, 'title': 'Children', 'file': '../../../../../../../../F:/MUSIK/Piano/Children.mp4'},
  {'icon': iconImage, 'title': 'Children', 'file': '../../../../../../../../F:/MUSIK/Piano/Children.webm'},
  {'icon': iconImage, 'title': 'Children Robert Miles', 'file': '../../../../../../../../F:/MUSIK/Piano/Children - Robert Miles.webm'},
  {'icon': iconImage, 'title': 'Dance Of The Sugar Plum Fairy', 'file': '../../../../../../../../F:/MUSIK/Piano/Dance of the Sugar Plum Fairy.mp4'},
  {'icon': iconImage, 'title': 'Dawn (from Pride & Prejudice)', 'file': '../../../../../../../../F:/MUSIK/Piano/Dawn (from Pride & Prejudice).mp4'},
  {'icon': iconImage, 'title': 'Didn’t Expect To Get A Public Reaction Like This… 🥲🥹 #piano #music #song #public #reaction (1280p 30fps H264 192kbit Aac)', 'file': '../../../../../../../../F:/MUSIK/Piano/didn’t expect to get a public reaction like this… 🥲🥹 #piano #music #song #public #reaction (1280p_30fps_H264-192kbit_AAC).mp4'},
  {'icon': iconImage, 'title': 'Dire Straits Sultans Of Swing (piano Cover)', 'file': '../../../../../../../../F:/MUSIK/Piano/Dire Straits - Sultans Of Swing (Piano Cover).mp4'},
  {'icon': iconImage, 'title': 'Ecstasy Of Gold (piano Tutorial Lesson) Ennio Morricone', 'file': '../../../../../../../../F:/MUSIK/Piano/Ecstasy of Gold (Piano Tutorial Lesson) Ennio Morricone.mp4'},
  {'icon': iconImage, 'title': 'Ela No Piano', 'file': '../../../../../../../../F:/MUSIK/Piano/Ela no piano.mp4'},
  {'icon': iconImage, 'title': 'Every Breath You Take Piano Tutorial', 'file': '../../../../../../../../F:/MUSIK/Piano/Every Breath You Take - Piano Tutorial.webm'},
  {'icon': iconImage, 'title': 'Everybody Know It Right #popular #pianoforbeginner #rec #pianocover (1280p 30fps H264 192kbit Aac)', 'file': '../../../../../../../../F:/MUSIK/Piano/Everybody know it, right_ #popular #pianoforbeginner #rec #pianocover (1280p_30fps_H264-192kbit_AAC).mp4'},
  {'icon': iconImage, 'title': 'Fly Ludovico Einaudi Intouchables Piano Tutorial By Plutax Synthesia', 'file': '../../../../../../../../F:/MUSIK/Piano/Fly - Ludovico Einaudi Intouchables Piano Tutorial by PlutaX Synthesia.mp4'},
  {'icon': iconImage, 'title': 'Friend Like Me (from Aladdin) Piano Tutorial', 'file': '../../../../../../../../F:/MUSIK/Piano/Friend Like Me (from Aladdin) - Piano Tutorial.webm'},
  {'icon': iconImage, 'title': 'Game Of Thrones Theme Piano Tutorial', 'file': '../../../../../../../../F:/MUSIK/Piano/GAME OF THRONES THEME - Piano Tutorial.mp4'},
  {'icon': iconImage, 'title': 'Get Over It (guitar Cover)', 'file': '../../../../../../../../F:/MUSIK/Piano/Get Over It (Guitar Cover).mp4'},
  {'icon': iconImage, 'title': 'Get Over It (piano Version)', 'file': '../../../../../../../../F:/MUSIK/Piano/Get over it (Piano version).mp4'},
  {'icon': iconImage, 'title': 'Guns N Roses Dont Cry (piano Cover By Gamazda)', 'file': '../../../../../../../../F:/MUSIK/Piano/Guns N%27 Roses - Don%27t Cry (Piano cover by Gamazda).mp4'},
  {'icon': iconImage, 'title': 'Guns N Roses Sweet Child O Mine (piano Cover By Gamazda)', 'file': '../../../../../../../../F:/MUSIK/Piano/Guns N%27 Roses - Sweet Child O%27 Mine (Piano cover by Gamazda).mp4'},
  {'icon': iconImage, 'title': 'High Hopes (piano Cover)', 'file': '../../../../../../../../F:/MUSIK/Piano/High Hopes (Piano Cover).mp4'},
  {'icon': iconImage, 'title': 'High Hopes Piano Cover', 'file': '../../../../../../../../F:/MUSIK/Piano/High Hopes - piano cover.webm'},
  {'icon': iconImage, 'title': 'How To Make A Girl Smile', 'file': '../../../../../../../../F:/MUSIK/Piano/How to Make a Girl Smile.mp4'},
  {'icon': iconImage, 'title': 'I Dont Want To Miss A Thing (piano Сover)', 'file': '../../../../../../../../F:/MUSIK/Piano/I Don%27t Want to Miss a Thing (Piano Сover).mp4'},
  {'icon': iconImage, 'title': 'In The Hall Of The Mountain King Piano Tutorial', 'file': '../../../../../../../../F:/MUSIK/Piano/IN THE HALL OF THE MOUNTAIN KING - Piano Tutorial.mp4'},
  {'icon': iconImage, 'title': 'Inception Time (piano Version) Sheet Music', 'file': '../../../../../../../../F:/MUSIK/Piano/Inception - Time (Piano Version) + Sheet Music.mp4'},
  {'icon': iconImage, 'title': 'Interstellar Main Theme', 'file': '../../../../../../../../F:/MUSIK/Piano/Interstellar - Main Theme.webm'},
  {'icon': iconImage, 'title': 'Iron Maiden The Trooper (piano Cover)', 'file': '../../../../../../../../F:/MUSIK/Piano/Iron Maiden - The Trooper (Piano cover).mp4'},
  {'icon': iconImage, 'title': 'Island My Name Is Lincoln', 'file': '../../../../../../../../F:/MUSIK/Piano/Island - My Name is Lincoln.mp4'},
  {'icon': iconImage, 'title': 'King Of Pride Rock (from The Lion King) Piano Tutorial', 'file': '../../../../../../../../F:/MUSIK/Piano/King of Pride Rock (from The Lion King) - Piano Tutorial.webm'},
  {'icon': iconImage, 'title': 'Kraken Hans Zimmer [piano Tutorial] (synthesia) Hd Cover', 'file': '../../../../../../../../F:/MUSIK/Piano/Kraken - Hans Zimmer [Piano Tutorial] (Synthesia) HD Cover.mp4'},
  {'icon': iconImage, 'title': 'Krakensynthesia [piano Tutorial] Pirates Of The Caribbean ', 'file': '../../../../../../../../F:/MUSIK/Piano/KrakenSynthesia [Piano Tutorial] Pirates Of The Caribbean - .webm'},
  {'icon': iconImage, 'title': 'Linkin Park In The End (piano Cover By Gamazda)', 'file': '../../../../../../../../F:/MUSIK/Piano/Linkin Park - In The End (Piano cover by Gamazda).mp4'},
  {'icon': iconImage, 'title': 'Listen To Your Heart (piano Cover)', 'file': '../../../../../../../../F:/MUSIK/Piano/Listen To Your Heart (Piano cover).mp4'},
  {'icon': iconImage, 'title': 'Mein Herz Brennt Rammstein Piano Tutoria', 'file': '../../../../../../../../F:/MUSIK/Piano/Mein Herz Brennt - Rammstein - Piano Tutoria.mp4'},
  {'icon': iconImage, 'title': 'Moskau Piano Tutorial', 'file': '../../../../../../../../F:/MUSIK/Piano/MOSKAU - Piano Tutorial.mp4'},
  {'icon': iconImage, 'title': 'Now We Are Free', 'file': '../../../../../../../../F:/MUSIK/Piano/Now We Are Free.mp4'},
  {'icon': iconImage, 'title': 'Once Upon A December', 'file': '../../../../../../../../F:/MUSIK/Piano/Once Upon a December.mp4'},
  {'icon': iconImage, 'title': 'Pirates Of The Caribbean Hes A Pirate Piano Tutorial', 'file': '../../../../../../../../F:/MUSIK/Piano/PIRATES OF THE CARIBBEAN - HE%27S A PIRATE - Piano Tutorial.mp4'},
  {'icon': iconImage, 'title': 'Por Una Cabeza (piano) Tango Carlos Gardel', 'file': '../../../../../../../../F:/MUSIK/Piano/Por una Cabeza (Piano) - Tango -- CARLOS GARDEL.mp4'},
  {'icon': iconImage, 'title': 'Red Hot Chili Peppers Cant Stop (piano Cover By Gamazda)', 'file': '../../../../../../../../F:/MUSIK/Piano/Red Hot Chili Peppers - Can%27t Stop (Piano cover by Gamazda).mp4'},
  {'icon': iconImage, 'title': 'Summer The Four Seasons', 'file': '../../../../../../../../F:/MUSIK/Piano/Summer   The Four Seasons.mp4'},
  {'icon': iconImage, 'title': 'Super Mario Bros Medley Piano Tutorial', 'file': '../../../../../../../../F:/MUSIK/Piano/SUPER MARIO BROS MEDLEY - Piano Tutorial.mp4'},
  {'icon': iconImage, 'title': 'Super Mario On Piano With Sound Effects', 'file': '../../../../../../../../F:/MUSIK/Piano/Super Mario on Piano With Sound Effects.mp4'},
  {'icon': iconImage, 'title': 'Teardrop (cover)', 'file': '../../../../../../../../F:/MUSIK/Piano/Teardrop (Cover).mp4'},
  {'icon': iconImage, 'title': 'Thank You For The Music Piano Tutorial', 'file': '../../../../../../../../F:/MUSIK/Piano/Thank You For The Music - Piano Tutorial.webm'},
  {'icon': iconImage, 'title': 'The Ecstasy Of Gold', 'file': '../../../../../../../../F:/MUSIK/Piano/The Ecstasy of Gold .mp4'},
  {'icon': iconImage, 'title': 'The Offspring The Kids Arent Alright (piano Cover)', 'file': '../../../../../../../../F:/MUSIK/Piano/The Offspring - The Kids Aren%27t Alright (Piano Cover).mp4'},
  {'icon': iconImage, 'title': 'This Land', 'file': '../../../../../../../../F:/MUSIK/Piano/This Land.webm'},
  {'icon': iconImage, 'title': 'Top 7 Most Bizarre Musical Instruments Of The World', 'file': '../../../../../../../../F:/MUSIK/Piano/Top 7 Most Bizarre Musical Instruments of the World.mp4'},
  {'icon': iconImage, 'title': 'What A Life', 'file': '../../../../../../../../F:/MUSIK/Piano/What A Life.mp4'},
  {'icon': iconImage, 'title': 'Winter The Four Seasons', 'file': '../../../../../../../../F:/MUSIK/Piano/Winter The Four Seasons.mp4'},
  {'icon': iconImage, 'title': 'В Последнюю Осень (piano Cover) Ноты', 'file': '../../../../../../../../F:/MUSIK/Piano/В последнюю осень (PIANO COVER) +Ноты.mp4'},
  {'icon': iconImage, 'title': 'В Последнюю Осень By Piano', 'file': '../../../../../../../../F:/MUSIK/Piano/в последнюю осень by piano.mp4'},
  {'icon': iconImage, 'title': 'Двое В Кафе', 'file': '../../../../../../../../F:/MUSIK/Piano/Двое в кафе.mp4'},
  {'icon': iconImage, 'title': 'Лесник (piano Cover) (1920p 30fps H264 128kbit Aac)', 'file': '../../../../../../../../F:/MUSIK/Piano/Лесник (piano cover) (1920p_30fps_H264-128kbit_AAC).mp4'},
  {'icon': iconImage, 'title': 'Мой Ласковый И Нежный Зверь Евгений Дога', 'file': '../../../../../../../../F:/MUSIK/Piano/Мой ласковый и нежный зверь - Евгений Дога.mp4'},
  {'icon': iconImage, 'title': 'Полонез Огинского', 'file': '../../../../../../../../F:/MUSIK/Piano/Полонез Огинского.mp4'},
  {'icon': iconImage, 'title': 'Полонез Огинского Farewell To My Homeland (poegnanie Ojczyzny) Youtube', 'file': '../../../../../../../../F:/MUSIK/Piano/Полонез Огинского Farewell to My Homeland (Poegnanie Ojczyzny) - YouTube.mp4'},
  {'icon': iconImage, 'title': 'Полонез Огинского Piano Tutorial Youtube', 'file': '../../../../../../../../F:/MUSIK/Piano/Полонез Огинского Piano Tutorial - YouTube.mp4'},
  {'icon': iconImage, 'title': 'Популярные Песни На Фортепиано В Обр А Дзарковски (dzarkovsky) Попурри На Пианино', 'file': '../../../../../../../../F:/MUSIK/Piano/Популярные песни на фортепиано в обр. А. Дзарковски (Dzarkovsky)  Попурри на пианино.mp4'},
  {'icon': iconImage, 'title': 'Поход(эдуард Артемьев)', 'file': '../../../../../../../../F:/MUSIK/Piano/Поход(Эдуард Артемьев).mp4'},
  {'icon': iconImage, 'title': 'Следствие Ведут Колобки', 'file': '../../../../../../../../F:/MUSIK/Piano/Следствие ведут колобки%27.mp4'},
  {'icon': iconImage, 'title': 'Токката – Поль Мориа', 'file': '../../../../../../../../F:/MUSIK/Piano/Токката – Поль Мориа.mp4'},
  {'icon': iconImage, 'title': 'Тореро Ария (piano Cover) (720p 50fps H264 128kbit Aac)', 'file': '../../../../../../../../F:/MUSIK/Piano/Тореро - АРИЯ (Piano Cover) (720p_50fps_H264-128kbit_AAC).mp4'},
]);
})

document.getElementById('pinkfloyd').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A Great Day For Freedom', 'file': '../../../../../../../../F:/MUSIK/Pink Floyd/1995 - P.U.L.S.E/A Great Day For Freedom.mp3'},
  {'icon': iconImage, 'title': 'Another Brick In The Wall (i)', 'file': '../../../../../../../../F:/MUSIK/Pink Floyd/The Wall/Another Brick In The Wall (I).mp3'},
  {'icon': iconImage, 'title': 'Another Brick In The Wall (ii)', 'file': '../../../../../../../../F:/MUSIK/Pink Floyd/The Wall/Another Brick In The Wall (II).mp3'},
  {'icon': iconImage, 'title': 'Another Brick In The Wall (iii)', 'file': '../../../../../../../../F:/MUSIK/Pink Floyd/The Wall/Another Brick In The Wall (III).mp3'},
  {'icon': iconImage, 'title': 'High Hopes', 'file': '../../../../../../../../F:/MUSIK/Pink Floyd/1995 - P.U.L.S.E/High Hopes.mp3'},
  {'icon': iconImage, 'title': 'High Hopes', 'file': '../../../../../../../../F:/MUSIK/Pink Floyd/1995 - P.U.L.S.E/High Hopes.mp4'},
  {'icon': iconImage, 'title': 'Not Naw John', 'file': '../../../../../../../../F:/MUSIK/Pink Floyd/The Final Cut/Not Naw John.mp3'},
  {'icon': iconImage, 'title': 'Shine On Your Crazy Diamond', 'file': '../../../../../../../../F:/MUSIK/Pink Floyd/1995 - P.U.L.S.E/Shine On Your Crazy Diamond.mp3'},
  {'icon': iconImage, 'title': 'Summer68', 'file': '../../../../../../../../F:/MUSIK/Pink Floyd/Atom Heart Mother/Summer%2768.mp3'},
  {'icon': iconImage, 'title': 'Us And Them', 'file': '../../../../../../../../F:/MUSIK/Pink Floyd/1995 - P.U.L.S.E II/Us And Them.mp3'},
]);
})

document.getElementById('queen').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '01 Bohemian Rapsody', 'file': '../../../../../../../../F:/MUSIK/Queen/1978 - Jazz/01 Bohemian Rapsody.mp3'},
  {'icon': iconImage, 'title': '01 Mustapha', 'file': '../../../../../../../../F:/MUSIK/Queen/1978 - Jazz/01 Mustapha.mp3'},
  {'icon': iconImage, 'title': '02 Bohemian Rhapsody', 'file': '../../../../../../../../F:/MUSIK/Queen/1978 - Jazz/02 Bohemian rhapsody.mp3'},
  {'icon': iconImage, 'title': '04 Bohemian Rhapsody', 'file': '../../../../../../../../F:/MUSIK/Queen/1978 - Jazz/04 Bohemian Rhapsody.mp3'},
  {'icon': iconImage, 'title': '06 Bohemian Rhapsody', 'file': '../../../../../../../../F:/MUSIK/Queen/1978 - Jazz/06 Bohemian Rhapsody.mp3'},
  {'icon': iconImage, 'title': '11 Bohemian Rhapsody', 'file': '../../../../../../../../F:/MUSIK/Queen/1978 - Jazz/11 Bohemian Rhapsody.mp3'},
  {'icon': iconImage, 'title': 'A Kind Of Magic', 'file': '../../../../../../../../F:/MUSIK/Queen/1986 - A Kind Of Magic/A Kind Of Magic.mp3'},
  {'icon': iconImage, 'title': 'Crazy Litttle Thing Called Love', 'file': '../../../../../../../../F:/MUSIK/Queen/1992 - Cry Argentina/Crazy litttle thing called love.mp3'},
  {'icon': iconImage, 'title': 'Friends Will Be Friends', 'file': '../../../../../../../../F:/MUSIK/Queen/1992 - Live At Wembley %2786/Friends Will Be Friends.mp3'},
  {'icon': iconImage, 'title': 'I Want It All', 'file': '../../../../../../../../F:/MUSIK/Queen/1989 - The Miracle/I want it all.mp3'},
  {'icon': iconImage, 'title': 'My Life Has Been Saved', 'file': '../../../../../../../../F:/MUSIK/Queen/1995 - Made In Heaven/My Life Has Been Saved.mp3'},
  {'icon': iconImage, 'title': 'One Vision', 'file': '../../../../../../../../F:/MUSIK/Queen/1992 - Classic Queen/One Vision.mp3'},
  {'icon': iconImage, 'title': 'One Year Of Life', 'file': '../../../../../../../../F:/MUSIK/Queen/One year of life.mp3'},
  {'icon': iconImage, 'title': 'Somebody To Love', 'file': '../../../../../../../../F:/MUSIK/Queen/1976 - A Day At The Races/Somebody to love.mp3'},
  {'icon': iconImage, 'title': 'The Show Must Go On', 'file': '../../../../../../../../F:/MUSIK/Queen/1991 - Greatest Hits II/The Show Must Go On.mp3'},
  {'icon': iconImage, 'title': 'The Show Must Go On', 'file': '../../../../../../../../F:/MUSIK/Queen/1991 - Greatest Hits II/The Show Must Go On.mp4'},
  {'icon': iconImage, 'title': 'Under Pressure', 'file': '../../../../../../../../F:/MUSIK/Queen/1982 - Hot Space/Under Pressure.mp3'},
  {'icon': iconImage, 'title': 'Universe', 'file': '../../../../../../../../F:/MUSIK/Queen/Universe.mp3'},
  {'icon': iconImage, 'title': 'We Are The Champions', 'file': '../../../../../../../../F:/MUSIK/Queen/1979 - Live Killers/We Are The Champions.mp3'},
  {'icon': iconImage, 'title': 'We Will Rock You', 'file': '../../../../../../../../F:/MUSIK/Queen/We Will Rock You.mp3'},
  {'icon': iconImage, 'title': 'We Will Rock You', 'file': '../../../../../../../../F:/MUSIK/Queen/1981 - Greatest Hits I/We Will Rock You.mp3'},
  {'icon': iconImage, 'title': 'Who Wants To Live Forever', 'file': '../../../../../../../../F:/MUSIK/Queen/1986 - A Kind Of Magic/Who Wants To Live Forever.mp3'},
  {'icon': iconImage, 'title': 'Who Wants To Live Forever(musik)', 'file': '../../../../../../../../F:/MUSIK/Queen/1986 - A Kind Of Magic/Who Wants To Live Forever(MUSIK).mp3'},
]);
})

document.getElementById('radio').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A Mix Of Rock Song', 'file': '../../../../../../../../F:/MUSIK/RADIO/A mix of rock song.mp3'},
  {'icon': iconImage, 'title': 'A New Day Has Come', 'file': '../../../../../../../../F:/MUSIK/RADIO/A new day has come.mp3'},
  {'icon': iconImage, 'title': 'A Thing About You', 'file': '../../../../../../../../F:/MUSIK/RADIO/Roxette/Bonus/A Thing About You.mp3'},
  {'icon': iconImage, 'title': 'Abro Kadabro', 'file': '../../../../../../../../F:/MUSIK/RADIO/ABRO KADABRO.mp3'},
  {'icon': iconImage, 'title': 'All Or Nothing', 'file': '../../../../../../../../F:/MUSIK/RADIO/All Or Nothing.mp3'},
  {'icon': iconImage, 'title': 'Alleine Zu Zweit', 'file': '../../../../../../../../F:/MUSIK/RADIO/Alleine Zu Zweit.mp3'},
  {'icon': iconImage, 'title': 'Apocalyptica', 'file': '../../../../../../../../F:/MUSIK/RADIO/Apocalyptica.mp3'},
  {'icon': iconImage, 'title': 'Around The World', 'file': '../../../../../../../../F:/MUSIK/RADIO/Around the world.mp3'},
  {'icon': iconImage, 'title': 'Bamboleo', 'file': '../../../../../../../../F:/MUSIK/RADIO/Bamboleo.mp3'},
  {'icon': iconImage, 'title': 'Barbie Girl', 'file': '../../../../../../../../F:/MUSIK/RADIO/Barbie Girl.mp3'},
  {'icon': iconImage, 'title': 'Big In Japan', 'file': '../../../../../../../../F:/MUSIK/RADIO/Guano Apes/Big In Japan.mp3'},
  {'icon': iconImage, 'title': 'Big In Japann', 'file': '../../../../../../../../F:/MUSIK/RADIO/Guano Apes/Big In Japann.mp3'},
  {'icon': iconImage, 'title': 'Bitter Sweet Symphony', 'file': '../../../../../../../../F:/MUSIK/RADIO/Bitter Sweet Symphony.mp3'},
  {'icon': iconImage, 'title': 'Black Or White', 'file': '../../../../../../../../F:/MUSIK/RADIO/Black or White.mp3'},
  {'icon': iconImage, 'title': 'Born To Touch Your Feelings', 'file': '../../../../../../../../F:/MUSIK/RADIO/ScorpionS/Born To Touch Your Feelings.mp3'},
  {'icon': iconImage, 'title': 'Broken Promises', 'file': '../../../../../../../../F:/MUSIK/RADIO/Broken Promises.mp3'},
  {'icon': iconImage, 'title': 'Bumble Bees', 'file': '../../../../../../../../F:/MUSIK/RADIO/Bumble bees.mp3'},
  {'icon': iconImage, 'title': 'Bye Bye Bye', 'file': '../../../../../../../../F:/MUSIK/RADIO/Bye Bye Bye.mp3'},
  {'icon': iconImage, 'title': 'California Dreaming', 'file': '../../../../../../../../F:/MUSIK/RADIO/California Dreaming.mp3'},
  {'icon': iconImage, 'title': 'Calling', 'file': '../../../../../../../../F:/MUSIK/RADIO/Calling.mp3'},
  {'icon': iconImage, 'title': 'Cara Mia', 'file': '../../../../../../../../F:/MUSIK/RADIO/Cara Mia.mp3'},
  {'icon': iconImage, 'title': 'Careless Whispe', 'file': '../../../../../../../../F:/MUSIK/RADIO/Careless Whispe.mp3'},
  {'icon': iconImage, 'title': 'Celebrate The Love', 'file': '../../../../../../../../F:/MUSIK/RADIO/Celebrate the Love.mp3'},
  {'icon': iconImage, 'title': 'Chikago', 'file': '../../../../../../../../F:/MUSIK/RADIO/Chikago.mp3'},
  {'icon': iconImage, 'title': 'Children', 'file': '../../../../../../../../F:/MUSIK/RADIO/Children.mp3'},
  {'icon': iconImage, 'title': 'Clint Eastwood', 'file': '../../../../../../../../F:/MUSIK/RADIO/Clint Eastwood.mp3'},
  {'icon': iconImage, 'title': 'Clubbed To Death', 'file': '../../../../../../../../F:/MUSIK/RADIO/Clubbed To Death.mp3'},
  {'icon': iconImage, 'title': 'Crash Boom Bang', 'file': '../../../../../../../../F:/MUSIK/RADIO/Roxette/1994 - Crash Boom Bang/Crash Boom Bang.mp3'},
  {'icon': iconImage, 'title': 'Da Di Dam', 'file': '../../../../../../../../F:/MUSIK/RADIO/Da di dam.mp3'},
  {'icon': iconImage, 'title': 'Daddy Dj', 'file': '../../../../../../../../F:/MUSIK/RADIO/Daddy DJ.mp3'},
  {'icon': iconImage, 'title': 'Darkseed', 'file': '../../../../../../../../F:/MUSIK/RADIO/DARKSEED.mp3'},
  {'icon': iconImage, 'title': 'Dasboot', 'file': '../../../../../../../../F:/MUSIK/RADIO/Dasboot.mp3'},
  {'icon': iconImage, 'title': 'Desenchantee', 'file': '../../../../../../../../F:/MUSIK/RADIO/Desenchantee.mp3'},
  {'icon': iconImage, 'title': 'Desert Rose', 'file': '../../../../../../../../F:/MUSIK/RADIO/Desert Rose.mp3'},
  {'icon': iconImage, 'title': 'Disco Superstar', 'file': '../../../../../../../../F:/MUSIK/RADIO/Disco Superstar.mp3'},
  {'icon': iconImage, 'title': 'Diva', 'file': '../../../../../../../../F:/MUSIK/RADIO/Diva.mp3'},
  {'icon': iconImage, 'title': 'Do What U Want', 'file': '../../../../../../../../F:/MUSIK/RADIO/Do what u want.mp3'},
  {'icon': iconImage, 'title': 'Don`t Play Your Rock`n` Roll To Me', 'file': '../../../../../../../../F:/MUSIK/RADIO/Don`t Play Your Rock`n` Roll To Me.mp3'},
  {'icon': iconImage, 'title': 'Dont Speak', 'file': '../../../../../../../../F:/MUSIK/RADIO/Don%27t speak.mp3'},
  {'icon': iconImage, 'title': 'Dragostea Din Tei', 'file': '../../../../../../../../F:/MUSIK/RADIO/Dragostea Din Tei.MP3'},
  {'icon': iconImage, 'title': 'Eagleheart', 'file': '../../../../../../../../F:/MUSIK/RADIO/Eagleheart.mp3'},
  {'icon': iconImage, 'title': 'Feel', 'file': '../../../../../../../../F:/MUSIK/RADIO/Feel.mp3'},
  {'icon': iconImage, 'title': 'Fight For All The Wrong Reasons', 'file': '../../../../../../../../F:/MUSIK/RADIO/Nickelback/2005 - All The Right Reasons/Fight For All The Wrong Reasons.mp3'},
  {'icon': iconImage, 'title': 'Fire', 'file': '../../../../../../../../F:/MUSIK/RADIO/Fire.mp3'},
  {'icon': iconImage, 'title': 'Five&queen Rock Uconnect U', 'file': '../../../../../../../../F:/MUSIK/RADIO/FIVE&QUEEN-Rock U,Connect U.mp3'},
  {'icon': iconImage, 'title': 'Flames Of Love', 'file': '../../../../../../../../F:/MUSIK/RADIO/Flames of Love.mp3'},
  {'icon': iconImage, 'title': 'Flashdance', 'file': '../../../../../../../../F:/MUSIK/RADIO/Flashdance.mp3'},
  {'icon': iconImage, 'title': 'Fly On The Wings Of Love', 'file': '../../../../../../../../F:/MUSIK/RADIO/Fly On The Wings Of Love.mp3'},
  {'icon': iconImage, 'title': 'Forever Young', 'file': '../../../../../../../../F:/MUSIK/RADIO/Forever Young.mp3'},
  {'icon': iconImage, 'title': 'Fragile', 'file': '../../../../../../../../F:/MUSIK/RADIO/Fragile.mp3'},
  {'icon': iconImage, 'title': 'Freestyler', 'file': '../../../../../../../../F:/MUSIK/RADIO/Freestyler.mp3'},
  {'icon': iconImage, 'title': 'From Sarah With Love', 'file': '../../../../../../../../F:/MUSIK/RADIO/From Sarah with love.mp3'},
  {'icon': iconImage, 'title': 'Get A Job', 'file': '../../../../../../../../F:/MUSIK/RADIO/Get a Job.mp3'},
  {'icon': iconImage, 'title': 'Gone With The Sin', 'file': '../../../../../../../../F:/MUSIK/RADIO/H.I.M/Razorblade Romance/Gone With The Sin.mp3'},
  {'icon': iconImage, 'title': 'Hafanana', 'file': '../../../../../../../../F:/MUSIK/RADIO/Hafanana.mp3'},
  {'icon': iconImage, 'title': 'Happy Nation', 'file': '../../../../../../../../F:/MUSIK/RADIO/Happy Nation.mp3'},
  {'icon': iconImage, 'title': 'Harumamburu', 'file': '../../../../../../../../F:/MUSIK/RADIO/Harumamburu.mp3'},
  {'icon': iconImage, 'title': 'Heartache Every Moment', 'file': '../../../../../../../../F:/MUSIK/RADIO/H.I.M/Deep Shadows And Brilliant Highlights/Heartache Every Moment.mp3'},
  {'icon': iconImage, 'title': 'Here Without You', 'file': '../../../../../../../../F:/MUSIK/RADIO/Here Without You.mp3'},
  {'icon': iconImage, 'title': 'How Do You Do', 'file': '../../../../../../../../F:/MUSIK/RADIO/Roxette/1992 - Tourism/How Do You Do.mp3'},
  {'icon': iconImage, 'title': 'How You Remind Me', 'file': '../../../../../../../../F:/MUSIK/RADIO/Nickelback/2001 - Silver Side Up/How You Remind Me.mp3'},
  {'icon': iconImage, 'title': 'I Breathe', 'file': '../../../../../../../../F:/MUSIK/RADIO/I Breathe.mp3'},
  {'icon': iconImage, 'title': 'I Dont Want To Miss A Thing', 'file': '../../../../../../../../F:/MUSIK/RADIO/I Don%27t Want To Miss A Thing.mp3'},
  {'icon': iconImage, 'title': 'I Get No Down', 'file': '../../../../../../../../F:/MUSIK/RADIO/I get no down.mp3'},
  {'icon': iconImage, 'title': 'I Jast Wont To Feel', 'file': '../../../../../../../../F:/MUSIK/RADIO/I jast wont to feel.mp3'},
  {'icon': iconImage, 'title': 'I Saw You Dancing', 'file': '../../../../../../../../F:/MUSIK/RADIO/I Saw You Dancing.mp3'},
  {'icon': iconImage, 'title': 'I Was Made For Lovin You', 'file': '../../../../../../../../F:/MUSIK/RADIO/I was made for lovin%27 you.MP3'},
  {'icon': iconImage, 'title': 'Im In Love', 'file': '../../../../../../../../F:/MUSIK/RADIO/Im in Love.MP3'},
  {'icon': iconImage, 'title': 'Im Not A Girl', 'file': '../../../../../../../../F:/MUSIK/RADIO/I%27m Not A Girl.mp3'},
  {'icon': iconImage, 'title': 'In For A Panny', 'file': '../../../../../../../../F:/MUSIK/RADIO/In for a panny.mp3'},
  {'icon': iconImage, 'title': 'In For A Penny In For A Pound', 'file': '../../../../../../../../F:/MUSIK/RADIO/In for a Penny In for a Pound.mp4'},
  {'icon': iconImage, 'title': 'In The Army Now', 'file': '../../../../../../../../F:/MUSIK/RADIO/In the army now.mp3'},
  {'icon': iconImage, 'title': 'In The Army Now', 'file': '../../../../../../../../F:/MUSIK/RADIO/In The Army Now .mp4'},
  {'icon': iconImage, 'title': 'In The Army Now', 'file': '../../../../../../../../F:/MUSIK/RADIO/In The Army Now.mp4'},
  {'icon': iconImage, 'title': 'In The Shadows', 'file': '../../../../../../../../F:/MUSIK/RADIO/In The Shadows.mp3'},
  {'icon': iconImage, 'title': 'It`s Raining Men', 'file': '../../../../../../../../F:/MUSIK/RADIO/It`s raining men.mp3'},
  {'icon': iconImage, 'title': 'Its My Life', 'file': '../../../../../../../../F:/MUSIK/RADIO/Its My Life.mp3'},
  {'icon': iconImage, 'title': 'Join Me In Death', 'file': '../../../../../../../../F:/MUSIK/RADIO/H.I.M/Razorblade Romance/Join Me In Death.mp3'},
  {'icon': iconImage, 'title': 'Just Be Good To Me', 'file': '../../../../../../../../F:/MUSIK/RADIO/Just Be Good to Me.mp3'},
  {'icon': iconImage, 'title': 'Kara Mia', 'file': '../../../../../../../../F:/MUSIK/RADIO/Kara Mia.mp3'},
  {'icon': iconImage, 'title': 'Kingson Town', 'file': '../../../../../../../../F:/MUSIK/RADIO/Kingson Town.mp3'},
  {'icon': iconImage, 'title': 'Kojo Notsuki', 'file': '../../../../../../../../F:/MUSIK/RADIO/ScorpionS/Kojo NoTsuki.mp3'},
  {'icon': iconImage, 'title': 'Ku Ku Djambo', 'file': '../../../../../../../../F:/MUSIK/RADIO/Ku ku Djambo.mp3'},
  {'icon': iconImage, 'title': 'Late Goodbye', 'file': '../../../../../../../../F:/MUSIK/RADIO/Late Goodbye.mp3'},
  {'icon': iconImage, 'title': 'Learn The Hard Way', 'file': '../../../../../../../../F:/MUSIK/RADIO/Nickelback/2003 - The Long Road/Learn The Hard Way.mp3'},
  {'icon': iconImage, 'title': 'Life Is Life', 'file': '../../../../../../../../F:/MUSIK/RADIO/Life is Life.mp3'},
  {'icon': iconImage, 'title': 'Listen To Your Heart', 'file': '../../../../../../../../F:/MUSIK/RADIO/Roxette/1988 - Look Sharp/Listen To Your Heart.mp3'},
  {'icon': iconImage, 'title': 'Livin La Vida Loca', 'file': '../../../../../../../../F:/MUSIK/RADIO/Livin%27 La Vida Loca.mp3'},
  {'icon': iconImage, 'title': 'Lonely Night', 'file': '../../../../../../../../F:/MUSIK/RADIO/ScorpionS/Lonely Night.mp3'},
  {'icon': iconImage, 'title': 'Lords Of The Boards', 'file': '../../../../../../../../F:/MUSIK/RADIO/Guano Apes/Lords Of The Boards.mp3'},
  {'icon': iconImage, 'title': 'Losing Grip', 'file': '../../../../../../../../F:/MUSIK/RADIO/Losing grip.mp3'},
  {'icon': iconImage, 'title': 'Love Is Blue', 'file': '../../../../../../../../F:/MUSIK/RADIO/Love is Blue.mp3'},
  {'icon': iconImage, 'title': 'Love To Hate You', 'file': '../../../../../../../../F:/MUSIK/RADIO/Love To Hate You.mp3'},
  {'icon': iconImage, 'title': 'Lucefer', 'file': '../../../../../../../../F:/MUSIK/RADIO/Lucefer.mp3'},
  {'icon': iconImage, 'title': 'Mafia', 'file': '../../../../../../../../F:/MUSIK/RADIO/Mafia.mp3'},
  {'icon': iconImage, 'title': 'Makarena', 'file': '../../../../../../../../F:/MUSIK/RADIO/Makarena.mp3'},
  {'icon': iconImage, 'title': 'Maybe', 'file': '../../../../../../../../F:/MUSIK/RADIO/Maybe.mp3'},
  {'icon': iconImage, 'title': 'Milk Toast Honey', 'file': '../../../../../../../../F:/MUSIK/RADIO/Roxette/2001 - Room Service/Milk Toast Honey.mp3'},
  {'icon': iconImage, 'title': 'Mix', 'file': '../../../../../../../../F:/MUSIK/RADIO/Mix.mp3'},
  {'icon': iconImage, 'title': 'Moltiva', 'file': '../../../../../../../../F:/MUSIK/RADIO/Moltiva.mp3'},
  {'icon': iconImage, 'title': 'Moon Light Shadow', 'file': '../../../../../../../../F:/MUSIK/RADIO/Moon Light Shadow.mp3'},
  {'icon': iconImage, 'title': 'Moskou', 'file': '../../../../../../../../F:/MUSIK/RADIO/Moskou.mp3'},
  {'icon': iconImage, 'title': 'Nah Nah Nah', 'file': '../../../../../../../../F:/MUSIK/RADIO/Nah-Nah-Nah.mp3'},
  {'icon': iconImage, 'title': 'Norting Girl', 'file': '../../../../../../../../F:/MUSIK/RADIO/Norting girl.mp3'},
  {'icon': iconImage, 'title': 'Oops! I Did It Again', 'file': '../../../../../../../../F:/MUSIK/RADIO/OOPS! I Did It Again.mp3'},
  {'icon': iconImage, 'title': 'Pantheon In Flames', 'file': '../../../../../../../../F:/MUSIK/RADIO/Pantheon In Flames.mp3'},
  {'icon': iconImage, 'title': 'Paradise', 'file': '../../../../../../../../F:/MUSIK/RADIO/Paradise.mp3'},
  {'icon': iconImage, 'title': 'Pasadena', 'file': '../../../../../../../../F:/MUSIK/RADIO/Pasadena.mp3'},
  {'icon': iconImage, 'title': 'Pretty Fly', 'file': '../../../../../../../../F:/MUSIK/RADIO/Pretty fly.mp3'},
  {'icon': iconImage, 'title': 'Rockstar', 'file': '../../../../../../../../F:/MUSIK/RADIO/Nickelback/2005 - All The Right Reasons/Rockstar.mp3'},
  {'icon': iconImage, 'title': 'Sandra Nasic', 'file': '../../../../../../../../F:/MUSIK/RADIO/Guano Apes/Sandra Nasic.mp3'},
  {'icon': iconImage, 'title': 'Sexcrime', 'file': '../../../../../../../../F:/MUSIK/RADIO/Sexcrime.MP3'},
  {'icon': iconImage, 'title': 'Show Me The Meaning', 'file': '../../../../../../../../F:/MUSIK/RADIO/Show Me The Meaning.mp3'},
  {'icon': iconImage, 'title': 'Shut Your Mouth', 'file': '../../../../../../../../F:/MUSIK/RADIO/Shut Your Mouth.mp3'},
  {'icon': iconImage, 'title': 'Smooth Criminal', 'file': '../../../../../../../../F:/MUSIK/RADIO/Smooth Criminal.mp3'},
  {'icon': iconImage, 'title': 'Solo', 'file': '../../../../../../../../F:/MUSIK/RADIO/Solo.mp3'},
  {'icon': iconImage, 'title': 'Spanish Guitar', 'file': '../../../../../../../../F:/MUSIK/RADIO/Spanish guitar.mp3'},
  {'icon': iconImage, 'title': 'Still Loving You', 'file': '../../../../../../../../F:/MUSIK/RADIO/ScorpionS/Still Loving You.mp3'},
  {'icon': iconImage, 'title': 'Stumblin In', 'file': '../../../../../../../../F:/MUSIK/RADIO/Stumblin%27 In.mp3'},
  {'icon': iconImage, 'title': 'Supreme', 'file': '../../../../../../../../F:/MUSIK/RADIO/Supreme.mp3'},
  {'icon': iconImage, 'title': 'Susana', 'file': '../../../../../../../../F:/MUSIK/RADIO/Susana.mp3'},
  {'icon': iconImage, 'title': 'Sweet Dreams', 'file': '../../../../../../../../F:/MUSIK/RADIO/Sweet Dreams.mp3'},
  {'icon': iconImage, 'title': 'Take My Love', 'file': '../../../../../../../../F:/MUSIK/RADIO/Take My Love.mp3'},
  {'icon': iconImage, 'title': 'Tarzan Boy', 'file': '../../../../../../../../F:/MUSIK/RADIO/Tarzan boy.mp3'},
  {'icon': iconImage, 'title': 'Ten Oclock', 'file': '../../../../../../../../F:/MUSIK/RADIO/Ten o%27clock.MP3'},
  {'icon': iconImage, 'title': 'Thank You', 'file': '../../../../../../../../F:/MUSIK/RADIO/Thank You.mp3'},
  {'icon': iconImage, 'title': 'The Centre Of The Heart', 'file': '../../../../../../../../F:/MUSIK/RADIO/Roxette/2001 - Room Service/The Centre Of The Heart.mp3'},
  {'icon': iconImage, 'title': 'The Color Of Night', 'file': '../../../../../../../../F:/MUSIK/RADIO/The Color of Night.mp3'},
  {'icon': iconImage, 'title': 'The Final Countdown', 'file': '../../../../../../../../F:/MUSIK/RADIO/The Final Countdown.mp3'},
  {'icon': iconImage, 'title': 'The Good The Bad The Ugly', 'file': '../../../../../../../../F:/MUSIK/RADIO/The Good ,The  Bad, The Ugly.MP3'},
  {'icon': iconImage, 'title': 'The Kids Arent Alright', 'file': '../../../../../../../../F:/MUSIK/RADIO/The kids aren%27t alright.mp3'},
  {'icon': iconImage, 'title': 'The Logical Song', 'file': '../../../../../../../../F:/MUSIK/RADIO/The Logical Song.mp3'},
  {'icon': iconImage, 'title': 'The Look', 'file': '../../../../../../../../F:/MUSIK/RADIO/Roxette/The Look.mp3'},
  {'icon': iconImage, 'title': 'The Terminator', 'file': '../../../../../../../../F:/MUSIK/RADIO/The Terminator.mp3'},
  {'icon': iconImage, 'title': 'They Dont Care About Us', 'file': '../../../../../../../../F:/MUSIK/RADIO/They Dont Care About Us.mp3'},
  {'icon': iconImage, 'title': 'Thinking Of You', 'file': '../../../../../../../../F:/MUSIK/RADIO/Thinking of You.MP3'},
  {'icon': iconImage, 'title': 'Tike Tike Kardi', 'file': '../../../../../../../../F:/MUSIK/RADIO/Tike tike kardi.mp3'},
  {'icon': iconImage, 'title': 'Twist In My Sobriety', 'file': '../../../../../../../../F:/MUSIK/RADIO/Twist In My Sobriety.mp3'},
  {'icon': iconImage, 'title': 'Twist In My Sobriety', 'file': '../../../../../../../../F:/MUSIK/RADIO/Twist In My Sobriety.mp4'},
  {'icon': iconImage, 'title': 'Uefa Champions League', 'file': '../../../../../../../../F:/MUSIK/RADIO/UEFA Champions League.mp3'},
  {'icon': iconImage, 'title': 'Velvet', 'file': '../../../../../../../../F:/MUSIK/RADIO/Velvet.mp3'},
  {'icon': iconImage, 'title': 'Weekend!', 'file': '../../../../../../../../F:/MUSIK/RADIO/Weekend!.mp3'},
  {'icon': iconImage, 'title': 'What Is Love', 'file': '../../../../../../../../F:/MUSIK/RADIO/What Is Love.mp3'},
  {'icon': iconImage, 'title': 'When The Lights Go Out', 'file': '../../../../../../../../F:/MUSIK/RADIO/When the Lights Go Out.mp3'},
  {'icon': iconImage, 'title': 'Where The Wild Roses Grow', 'file': '../../../../../../../../F:/MUSIK/RADIO/Where The Wild Roses Grow.mp3'},
  {'icon': iconImage, 'title': 'White Dove', 'file': '../../../../../../../../F:/MUSIK/RADIO/ScorpionS/White Dove.mp3'},
  {'icon': iconImage, 'title': 'Wicked Game', 'file': '../../../../../../../../F:/MUSIK/RADIO/H.I.M/Greatest Lovesongs vol.666/Wicked Game.mp3'},
  {'icon': iconImage, 'title': 'Wind Of Change', 'file': '../../../../../../../../F:/MUSIK/RADIO/ScorpionS/Wind Of Change.mp3'},
  {'icon': iconImage, 'title': 'Wish You Were Here', 'file': '../../../../../../../../F:/MUSIK/RADIO/Wish You Were Here.mp3'},
  {'icon': iconImage, 'title': 'Words', 'file': '../../../../../../../../F:/MUSIK/RADIO/Words.mp3'},
  {'icon': iconImage, 'title': 'Www Ленинград', 'file': '../../../../../../../../F:/MUSIK/RADIO/WWW Ленинград.mp3'},
  {'icon': iconImage, 'title': 'Zombie', 'file': '../../../../../../../../F:/MUSIK/RADIO/Zombie.mp3'},
  {'icon': iconImage, 'title': 'Zoo', 'file': '../../../../../../../../F:/MUSIK/RADIO/Zoo.mp3'},
  {'icon': iconImage, 'title': 'А Мы Любили', 'file': '../../../../../../../../F:/MUSIK/RADIO/Hi-Fi/А мы любили.mp3'},
  {'icon': iconImage, 'title': 'А Что Нам Надо', 'file': '../../../../../../../../F:/MUSIK/RADIO/А Что Нам Надо.mp3'},
  {'icon': iconImage, 'title': 'Бог Устал Нас Любить', 'file': '../../../../../../../../F:/MUSIK/RADIO/Сплин/Бог Устал Нас Любить.mp3'},
  {'icon': iconImage, 'title': 'Была Не Была', 'file': '../../../../../../../../F:/MUSIK/RADIO/Была не была.mp3'},
  {'icon': iconImage, 'title': 'В Жизни Так Бывает', 'file': '../../../../../../../../F:/MUSIK/RADIO/В Жизни Так Бывает.mp3'},
  {'icon': iconImage, 'title': 'Вериш Ли Ты Или Нет', 'file': '../../../../../../../../F:/MUSIK/RADIO/Вериш ли ты или нет.mp3'},
  {'icon': iconImage, 'title': 'Вечно Молодой', 'file': '../../../../../../../../F:/MUSIK/RADIO/Вечно молодой.mp3'},
  {'icon': iconImage, 'title': 'Вместе И Навсегда', 'file': '../../../../../../../../F:/MUSIK/RADIO/Вместе и навсегда.mp3'},
  {'icon': iconImage, 'title': 'Воскрешени', 'file': '../../../../../../../../F:/MUSIK/RADIO/Воскрешени.mp3'},
  {'icon': iconImage, 'title': 'Все Возможно', 'file': '../../../../../../../../F:/MUSIK/RADIO/Все возможно.mp3'},
  {'icon': iconImage, 'title': 'Высоко', 'file': '../../../../../../../../F:/MUSIK/RADIO/Высоко.mp3'},
  {'icon': iconImage, 'title': 'Выхода Нет', 'file': '../../../../../../../../F:/MUSIK/RADIO/Сплин/Выхода нет.mp3'},
  {'icon': iconImage, 'title': 'Генералы Песчаных Карьеров', 'file': '../../../../../../../../F:/MUSIK/RADIO/Генералы песчаных карьеров.mp3'},
  {'icon': iconImage, 'title': 'Глаза', 'file': '../../../../../../../../F:/MUSIK/RADIO/Глаза.mp3'},
  {'icon': iconImage, 'title': 'Городок', 'file': '../../../../../../../../F:/MUSIK/RADIO/Городок.mp3'},
  {'icon': iconImage, 'title': 'Девочка С Севера', 'file': '../../../../../../../../F:/MUSIK/RADIO/Девочка с севера.mp3'},
  {'icon': iconImage, 'title': 'Девушки Как Звёзды', 'file': '../../../../../../../../F:/MUSIK/RADIO/Девушки как звёзды.mp3'},
  {'icon': iconImage, 'title': 'Дедушка По Городу', 'file': '../../../../../../../../F:/MUSIK/RADIO/Дедушка по городу.mp3'},
  {'icon': iconImage, 'title': 'Дожди', 'file': '../../../../../../../../F:/MUSIK/RADIO/Дожди.mp3'},
  {'icon': iconImage, 'title': 'Дождик', 'file': '../../../../../../../../F:/MUSIK/RADIO/Дождик.mp3'},
  {'icon': iconImage, 'title': 'Дождь По Крыше', 'file': '../../../../../../../../F:/MUSIK/RADIO/Дождь по крыше.mp3'},
  {'icon': iconImage, 'title': 'Дрессировщик', 'file': '../../../../../../../../F:/MUSIK/RADIO/Дрессировщик.MP3'},
  {'icon': iconImage, 'title': 'Зачем Топтать Мою Любовь', 'file': '../../../../../../../../F:/MUSIK/RADIO/Зачем топтать мою любовь.mp3'},
  {'icon': iconImage, 'title': 'Зеленоглазое Такси', 'file': '../../../../../../../../F:/MUSIK/RADIO/Зеленоглазое Такси.mp3'},
  {'icon': iconImage, 'title': 'Зимний Сад', 'file': '../../../../../../../../F:/MUSIK/RADIO/Зимний сад.mp3'},
  {'icon': iconImage, 'title': 'Зимний Сон', 'file': '../../../../../../../../F:/MUSIK/RADIO/Зимний сон.mp3'},
  {'icon': iconImage, 'title': 'Иду Курю', 'file': '../../../../../../../../F:/MUSIK/RADIO/Иду, курю.mp3'},
  {'icon': iconImage, 'title': 'Иерусалим', 'file': '../../../../../../../../F:/MUSIK/RADIO/Иерусалим.mp3'},
  {'icon': iconImage, 'title': 'Из Вагантов', 'file': '../../../../../../../../F:/MUSIK/RADIO/Из Вагантов.mp3'},
  {'icon': iconImage, 'title': 'Кавачай', 'file': '../../../../../../../../F:/MUSIK/RADIO/Кавачай.mp3'},
  {'icon': iconImage, 'title': 'Каждый День', 'file': '../../../../../../../../F:/MUSIK/RADIO/Каждый день.mp3'},
  {'icon': iconImage, 'title': 'Лето', 'file': '../../../../../../../../F:/MUSIK/RADIO/Лето.mp3'},
  {'icon': iconImage, 'title': 'Линия Жизни', 'file': '../../../../../../../../F:/MUSIK/RADIO/Сплин/2001 - 25-й кадр/Линия жизни.mp3'},
  {'icon': iconImage, 'title': 'Листай Эфир', 'file': '../../../../../../../../F:/MUSIK/RADIO/Листай эфир.mp3'},
  {'icon': iconImage, 'title': 'Люблю', 'file': '../../../../../../../../F:/MUSIK/RADIO/Люблю.mp3'},
  {'icon': iconImage, 'title': 'Макдональдс', 'file': '../../../../../../../../F:/MUSIK/RADIO/Макдональдс .mp3'},
  {'icon': iconImage, 'title': 'Мне Бы В Небо', 'file': '../../../../../../../../F:/MUSIK/RADIO/Мне Бы В Небо.mp3'},
  {'icon': iconImage, 'title': 'Мне Мама Тихо Говорила', 'file': '../../../../../../../../F:/MUSIK/RADIO/Мне мама тихо говорила.mp3'},
  {'icon': iconImage, 'title': 'Мое Сердце', 'file': '../../../../../../../../F:/MUSIK/RADIO/Сплин/2001 - 25-й кадр/Мое сердце.mp3'},
  {'icon': iconImage, 'title': 'Москва', 'file': '../../../../../../../../F:/MUSIK/RADIO/Москва.mp3'},
  {'icon': iconImage, 'title': 'Моя Любовь', 'file': '../../../../../../../../F:/MUSIK/RADIO/Моя любовь.mp3'},
  {'icon': iconImage, 'title': 'Мурка', 'file': '../../../../../../../../F:/MUSIK/RADIO/Мурка.mp3'},
  {'icon': iconImage, 'title': 'Мусорный Ветер', 'file': '../../../../../../../../F:/MUSIK/RADIO/Мусорный ветер.WAV'},
  {'icon': iconImage, 'title': 'Над Гудзоном', 'file': '../../../../../../../../F:/MUSIK/RADIO/Над Гудзоном.mp3'},
  {'icon': iconImage, 'title': 'Наши Детские Смешные Голоса', 'file': '../../../../../../../../F:/MUSIK/RADIO/Наши детские смешные голоса.mp3'},
  {'icon': iconImage, 'title': 'Не Дано', 'file': '../../../../../../../../F:/MUSIK/RADIO/Hi-Fi/Не дано.mp3'},
  {'icon': iconImage, 'title': 'Небо', 'file': '../../../../../../../../F:/MUSIK/RADIO/Небо.mp3'},
  {'icon': iconImage, 'title': 'Небыло Печали', 'file': '../../../../../../../../F:/MUSIK/RADIO/Небыло печали.mp3'},
  {'icon': iconImage, 'title': 'Но Я Играю Эту Роль', 'file': '../../../../../../../../F:/MUSIK/RADIO/Но я играю эту роль.mp3'},
  {'icon': iconImage, 'title': 'О Любви', 'file': '../../../../../../../../F:/MUSIK/RADIO/О любви.mp3'},
  {'icon': iconImage, 'title': 'Океан И Три Реки', 'file': '../../../../../../../../F:/MUSIK/RADIO/Океан и три реки.mp3'},
  {'icon': iconImage, 'title': 'Орбит Без Сахара', 'file': '../../../../../../../../F:/MUSIK/RADIO/Сплин/1998 - Гранатовый альбом/Орбит без сахара.mp3'},
  {'icon': iconImage, 'title': 'Первый Снег', 'file': '../../../../../../../../F:/MUSIK/RADIO/Первый снег.mp3'},
  {'icon': iconImage, 'title': 'Печаль Моя', 'file': '../../../../../../../../F:/MUSIK/RADIO/Печаль Моя.mp3'},
  {'icon': iconImage, 'title': 'Плакала Береза', 'file': '../../../../../../../../F:/MUSIK/RADIO/Плакала береза.mp3'},
  {'icon': iconImage, 'title': 'Плот', 'file': '../../../../../../../../F:/MUSIK/RADIO/Плот.mp3'},
  {'icon': iconImage, 'title': 'Попытка №5', 'file': '../../../../../../../../F:/MUSIK/RADIO/Попытка №5.mp3'},
  {'icon': iconImage, 'title': 'Пора Домой', 'file': '../../../../../../../../F:/MUSIK/RADIO/Пора Домой.mp3'},
  {'icon': iconImage, 'title': 'Розовые Розы', 'file': '../../../../../../../../F:/MUSIK/RADIO/Розовые розы.mp3'},
  {'icon': iconImage, 'title': 'Седьмой Лепесток', 'file': '../../../../../../../../F:/MUSIK/RADIO/Hi-Fi/Седьмой лепесток.mp3'},
  {'icon': iconImage, 'title': 'Спасибо За День Спасибо За Ночь', 'file': '../../../../../../../../F:/MUSIK/RADIO/Спасибо за день, спасибо за ночь.mp3'},
  {'icon': iconImage, 'title': 'Там Де Нас Нема', 'file': '../../../../../../../../F:/MUSIK/RADIO/Там де нас нема.mp3'},
  {'icon': iconImage, 'title': 'Товарищ Сержант', 'file': '../../../../../../../../F:/MUSIK/RADIO/Товарищ Сержант.mp3'},
  {'icon': iconImage, 'title': 'Три Полоски', 'file': '../../../../../../../../F:/MUSIK/RADIO/Три полоски.mp3'},
  {'icon': iconImage, 'title': 'Тулула', 'file': '../../../../../../../../F:/MUSIK/RADIO/ТуЛуЛа.mp3'},
  {'icon': iconImage, 'title': 'Уходишь', 'file': '../../../../../../../../F:/MUSIK/RADIO/Уходишь.mp3'},
  {'icon': iconImage, 'title': 'Хали Гали', 'file': '../../../../../../../../F:/MUSIK/RADIO/Хали-гали.mp3'},
  {'icon': iconImage, 'title': 'Хоп Хэй', 'file': '../../../../../../../../F:/MUSIK/RADIO/Хоп хэй.mp3'},
  {'icon': iconImage, 'title': 'Часики', 'file': '../../../../../../../../F:/MUSIK/RADIO/Часики.MP3'},
  {'icon': iconImage, 'title': 'Шоссэ', 'file': '../../../../../../../../F:/MUSIK/RADIO/Шоссэ.mp3'},
  {'icon': iconImage, 'title': 'Я За Тебя Умру', 'file': '../../../../../../../../F:/MUSIK/RADIO/Я за тебя умру.mp3'},
  {'icon': iconImage, 'title': 'Я Люблю', 'file': '../../../../../../../../F:/MUSIK/RADIO/Hi-Fi/Я люблю.mp3'},
  {'icon': iconImage, 'title': 'Я Не Болею Тобой', 'file': '../../../../../../../../F:/MUSIK/RADIO/Я не болею тобой.mp3'},
  {'icon': iconImage, 'title': 'Я Покину Родные Края', 'file': '../../../../../../../../F:/MUSIK/RADIO/Я покину родные края.mp3'},
  {'icon': iconImage, 'title': 'Яды', 'file': '../../../../../../../../F:/MUSIK/RADIO/Яды.mp3'},
]);
})

document.getElementById('radioпомойка').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '007 Live', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/007 Live.mp3'},
  {'icon': iconImage, 'title': '02 Medsestrichka', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Михаил Шуфутинский/2003 - Bum-bum/02_medsestrichka.mp3'},
  {'icon': iconImage, 'title': '2 Become 1', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/2 become 1.mp3'},
  {'icon': iconImage, 'title': '4000 Rainy Nights', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/4000 Rainy Nights.mp3'},
  {'icon': iconImage, 'title': 'All That The Wants', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/All That The Wants.MP3'},
  {'icon': iconImage, 'title': 'All The Small Things', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/All The Small Things.mp3'},
  {'icon': iconImage, 'title': 'American Boy', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/American boy.mp3'},
  {'icon': iconImage, 'title': 'And I Think Of You', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/And I Think Of You.mp3'},
  {'icon': iconImage, 'title': 'Angels Crying', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Angels Crying.mp3'},
  {'icon': iconImage, 'title': 'Anthem', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Anthem.mp3'},
  {'icon': iconImage, 'title': 'Bad Blood', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Bad Blood.MP3'},
  {'icon': iconImage, 'title': 'Bailamos', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Bailamos.mp3'},
  {'icon': iconImage, 'title': 'Banca Banca', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Banca Banca.mp3'},
  {'icon': iconImage, 'title': 'Beautifullife', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/BeautifulLife.mp3'},
  {'icon': iconImage, 'title': 'Between Angels & Insects', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Between Angels & Insects.mp3'},
  {'icon': iconImage, 'title': 'Breathe Me', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Breathe Me.mp3'},
  {'icon': iconImage, 'title': 'Broken Days', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Broken days.mp3'},
  {'icon': iconImage, 'title': 'Cant Fight The Moonlight', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Cant Fight the Moonlight.MP3'},
  {'icon': iconImage, 'title': 'Cant Get You Out Of My Head', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Can%27t Get You Out Of My Head.mp3'},
  {'icon': iconImage, 'title': 'Children Of The Damned', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/IRON MAIDEN/1982 - The Number of the Beast/Children of the Damned.mp3'},
  {'icon': iconImage, 'title': 'Chrismasse', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Chrismasse.mp3'},
  {'icon': iconImage, 'title': 'Circle', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Circle.mp3'},
  {'icon': iconImage, 'title': 'Colorblind', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Colorblind.mp3'},
  {'icon': iconImage, 'title': 'Crush', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Crush.mp3'},
  {'icon': iconImage, 'title': 'Dancando Lambada', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Dancando Lambada.mp3'},
  {'icon': iconImage, 'title': 'Dangerous Myzuka', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Dangerous myzuka.mp3'},
  {'icon': iconImage, 'title': 'Disae', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Disae.mp3'},
  {'icon': iconImage, 'title': 'Dont Let Me Get Me', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Don%27t Let Me Get Me.mp3'},
  {'icon': iconImage, 'title': 'Dont Stop The Music', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Don%27t Stop The Music.mp3'},
  {'icon': iconImage, 'title': 'Dont Turn Around', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Dont Turn Around.mp3'},
  {'icon': iconImage, 'title': 'Dorogoy Dlinnoyu', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Михаил Шуфутинский/1989 - Podmoskovnie vechera/Dorogoy dlinnoyu.mp3'},
  {'icon': iconImage, 'title': 'Double Bass', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Double Bass.mp3'},
  {'icon': iconImage, 'title': 'Dr Alban Its My Life', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Dr Alban - It%27s my life.mp3'},
  {'icon': iconImage, 'title': 'Drowning', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Drowning.mp3'},
  {'icon': iconImage, 'title': 'Dusha Bolit', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Михаил Шуфутинский/2002 - Nalivai, pogovorim/dusha_bolit.mp3'},
  {'icon': iconImage, 'title': 'Easy', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Easy.mp3'},
  {'icon': iconImage, 'title': 'Eternal Flame', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Eternal Flame.mp3'},
  {'icon': iconImage, 'title': 'Eternal Flame', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Eternal Flame.mp4'},
  {'icon': iconImage, 'title': 'Every Time', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Every time.mp3'},
  {'icon': iconImage, 'title': 'Everything Burns', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Anastacia/2005 - Pieces Of A Dream/Everything Burns.mp3'},
  {'icon': iconImage, 'title': 'Ex Girlfriend', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Ex-Girlfriend.mp3'},
  {'icon': iconImage, 'title': 'Fable', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Fable.mp3'},
  {'icon': iconImage, 'title': 'Fight', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Fight.mp3'},
  {'icon': iconImage, 'title': 'Forever Sleep', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Forever Sleep.mp3'},
  {'icon': iconImage, 'title': 'Fragile', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Fragile.mp3'},
  {'icon': iconImage, 'title': 'Ghostbusters', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Ghostbusters.mp3'},
  {'icon': iconImage, 'title': 'Girl Youll Be A Woman Soon', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Girl You%27ll Be A Woman Soon.mp3'},
  {'icon': iconImage, 'title': 'Give Into Me', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Give Into Me.mp3'},
  {'icon': iconImage, 'title': 'Gop Stop', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Михаил Шуфутинский/1994 - Spasibo, Sasha rozembaum/Gop-stop.mp3'},
  {'icon': iconImage, 'title': 'Gunsnroses Dont Cry', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Guns%27N%27Roses - Don%27t cry.mp3'},
  {'icon': iconImage, 'title': 'Hampsterdance Song', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Hampsterdance Song.mp3'},
  {'icon': iconImage, 'title': 'Heavy On My Heart', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Anastacia/2004 - Anastacia/Heavy On My Heart.mp3'},
  {'icon': iconImage, 'title': 'Hero', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Hero.MP3'},
  {'icon': iconImage, 'title': 'Hold Me For A While', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Hold Me For A While.mp3'},
  {'icon': iconImage, 'title': 'Hold On Tight', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Hold On Tight.mp3'},
  {'icon': iconImage, 'title': 'Hotel California', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Hotel California.mp3'},
  {'icon': iconImage, 'title': 'House Of He Rising Sun', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/House Of He Rising Sun.mp3'},
  {'icon': iconImage, 'title': 'How Deep Is Your Love', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/How Deep Is Your Love.MP3'},
  {'icon': iconImage, 'title': 'I Hate This Fucking World', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/I Hate This Fucking World.mp3'},
  {'icon': iconImage, 'title': 'I Like Chopin', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/I like chopin.mp3'},
  {'icon': iconImage, 'title': 'I Love Rock N Roll', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/I Love Rock-n-Roll.MP3'},
  {'icon': iconImage, 'title': 'I Put A Spell On You', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/I Put a Spell on You.MP3'},
  {'icon': iconImage, 'title': 'I Want It That Way', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/I Want it That Way.mp3'},
  {'icon': iconImage, 'title': 'I Was Made For Lovin You', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/I Was Made For Lovin You.mp3'},
  {'icon': iconImage, 'title': 'Id Love You To Want Me', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/I%27d Love You to Want Me.mp3'},
  {'icon': iconImage, 'title': 'Israel', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Israel.mp3'},
  {'icon': iconImage, 'title': 'Its Raining Man', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/It%27s Raining Man.mp3'},
  {'icon': iconImage, 'title': 'Jesus To A Child', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Jesus to a child.mp3'},
  {'icon': iconImage, 'title': 'Jingle Bells', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Jingle Bells.mp3'},
  {'icon': iconImage, 'title': 'Johnny Be Good', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Johnny Be Good.mp3'},
  {'icon': iconImage, 'title': 'Just Like A Pill', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Just Like A Pill.mp3'},
  {'icon': iconImage, 'title': 'Kashmir', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Kashmir.mp3'},
  {'icon': iconImage, 'title': 'Knockin On Heavens Door', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Knockin On Heavens Door.mp3'},
  {'icon': iconImage, 'title': 'Knocking On Heavens Door M', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Knocking On Heavens Door+M.mp3'},
  {'icon': iconImage, 'title': 'La La La', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/La La La.mp3'},
  {'icon': iconImage, 'title': 'Lady In Red', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Lady in red.mp3'},
  {'icon': iconImage, 'title': 'Left Outside Alone', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Anastacia/2004 - Anastacia/Left Outside Alone.mp3'},
  {'icon': iconImage, 'title': 'Leviy Bereg Dona', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Михаил Шуфутинский/2002 - Svechi/leviy_bereg_dona.mp3'},
  {'icon': iconImage, 'title': 'Listen Up', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Listen Up.mp3'},
  {'icon': iconImage, 'title': 'Losing My Religion', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Losing My Religion.mp3'},
  {'icon': iconImage, 'title': 'Love Dont Cost A Thing', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Love dont Cost a Thing.MP3'},
  {'icon': iconImage, 'title': 'Love Hurts', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Love Hurts.mp3'},
  {'icon': iconImage, 'title': 'Lovers On The Sun Feat Sam Martin', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Lovers on the sun feat sam martin.mp3'},
  {'icon': iconImage, 'title': 'Madonna', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Madonna.mp3'},
  {'icon': iconImage, 'title': 'Memory', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Memory.mp3'},
  {'icon': iconImage, 'title': 'Message Home', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Message Home.mp3'},
  {'icon': iconImage, 'title': 'Midnight Danser', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Midnight Danser.mp3'},
  {'icon': iconImage, 'title': 'My Fathers Sоn', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/My Father%27s Sоn.mp3'},
  {'icon': iconImage, 'title': 'My Favourite Game', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/My Favourite Game.mp3'},
  {'icon': iconImage, 'title': 'My Heart', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/My Heart.mp3'},
  {'icon': iconImage, 'title': 'Nathalie', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Nathalie.mp3'},
  {'icon': iconImage, 'title': 'Never Be The Same Again', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Never be the same again.mp3'},
  {'icon': iconImage, 'title': 'No Fear', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/No Fear.mp3'},
  {'icon': iconImage, 'title': 'Nostalgie', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Nostalgie.mp3'},
  {'icon': iconImage, 'title': 'Nothing But You (pvd Radio Mix)', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Nothing But You (PVD Radio Mix).mp3'},
  {'icon': iconImage, 'title': 'One Day In Your Life', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Anastacia/2002 - One Day In Your Life/One Day In Your Life.mp3'},
  {'icon': iconImage, 'title': 'One Of Us', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/ONE OF US.mp3'},
  {'icon': iconImage, 'title': 'One Wild Night', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/One Wild Night.MP3'},
  {'icon': iconImage, 'title': 'Only You', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Only You.mp3'},
  {'icon': iconImage, 'title': 'Out Of The Dark', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Out Of The Dark.mp3'},
  {'icon': iconImage, 'title': 'Palma De Mayorka', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Михаил Шуфутинский/1998 - Odnajdi v Amerike/Palma de mayorka.mp3'},
  {'icon': iconImage, 'title': 'Paradise', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Paradise.mp3'},
  {'icon': iconImage, 'title': 'Party Up', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Party Up.mp3'},
  {'icon': iconImage, 'title': 'Password', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Password.mp3'},
  {'icon': iconImage, 'title': 'Please Forgive Me', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Please Forgive Me.mp3'},
  {'icon': iconImage, 'title': 'Promises', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Promises.mp3'},
  {'icon': iconImage, 'title': 'Prowler', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/IRON MAIDEN/1980 - Iron Maiden/Prowler.mp3'},
  {'icon': iconImage, 'title': 'Raise The Hammer', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Raise the hammer.mp3'},
  {'icon': iconImage, 'title': 'Rape Me', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Rape me.MP3'},
  {'icon': iconImage, 'title': 'Rise And Fall', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Rise And Fall.mp3'},
  {'icon': iconImage, 'title': 'Road Trippin', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Road Trippin%27.mp3'},
  {'icon': iconImage, 'title': 'Rock The Hell Outta You', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Rock the Hell Outta You.mp3'},
  {'icon': iconImage, 'title': 'Round Round', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Round Round.mp3'},
  {'icon': iconImage, 'title': 'Samba', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Samba.mp3'},
  {'icon': iconImage, 'title': 'Save Your Kisses For Me', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Save Your Kisses for Me.mp3'},
  {'icon': iconImage, 'title': 'Sick & Tired', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Anastacia/2004 - Anastacia/Sick & Tired.mp3'},
  {'icon': iconImage, 'title': 'Skin On Skin', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Skin On Skin.mp3'},
  {'icon': iconImage, 'title': 'Smajl', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Smajl.mp3'},
  {'icon': iconImage, 'title': 'Smells Like Teen Spirit', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Smells Like Teen Spirit.mp3'},
  {'icon': iconImage, 'title': 'Smoke On The Water', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Smoke on the water.mp3'},
  {'icon': iconImage, 'title': 'Somewhere In The World', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/SOMEWHERE IN THE WORLD.mp3'},
  {'icon': iconImage, 'title': 'Staroe Kafe', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Михаил Шуфутинский/1989 - Ti u menia edinstvennaia/staroe_kafe.mp3'},
  {'icon': iconImage, 'title': 'Stop', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Stop.mp3'},
  {'icon': iconImage, 'title': 'Summer Son', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Summer Son.mp3'},
  {'icon': iconImage, 'title': 'Sun Shaine', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Sun Shaine.MP3'},
  {'icon': iconImage, 'title': 'Sweet Dreams', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Sweet Dreams.mp3'},
  {'icon': iconImage, 'title': 'The Ketchup Song', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/The Ketchup Song.mp3'},
  {'icon': iconImage, 'title': 'The Only', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/The Only.mp3'},
  {'icon': iconImage, 'title': 'The Sweetest Surrender', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/The Sweetest Surrender.mp3'},
  {'icon': iconImage, 'title': 'This Love', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/This love.mp3'},
  {'icon': iconImage, 'title': 'Those Where The Days', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Those Where The Days.mp3'},
  {'icon': iconImage, 'title': 'Tissue', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Tissue.mp3'},
  {'icon': iconImage, 'title': 'Tm Joy You Are The One', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/TM-Joy - You Are The One.mp3'},
  {'icon': iconImage, 'title': 'Tonight', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Tonight.mp3'},
  {'icon': iconImage, 'title': 'Train Drive By', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Train - Drive By.mp3'},
  {'icon': iconImage, 'title': 'Twisted Nerve', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Twisted Nerve.mp3'},
  {'icon': iconImage, 'title': 'U Stay With Melina Ill Survive', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/U-Stay_With_Melina_-_Ill_Survive.mp3'},
  {'icon': iconImage, 'title': 'Uebers Ende Der Welt', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Uebers ende der welt.mp3'},
  {'icon': iconImage, 'title': 'Unbreak My Heart', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/UnBreak my Heart.mp3'},
  {'icon': iconImage, 'title': 'Venus', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Venus.mp3'},
  {'icon': iconImage, 'title': 'Viva Forever', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Viva Forever.mp3'},
  {'icon': iconImage, 'title': 'Viva Las Vegas', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Viva las vegas.mp3'},
  {'icon': iconImage, 'title': 'Voyage', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Voyage.mp3'},
  {'icon': iconImage, 'title': 'Wasted Years', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/IRON MAIDEN/1986 - Somewhere in Time/Wasted Years.mp3'},
  {'icon': iconImage, 'title': 'Wasting Love', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/IRON MAIDEN/1992 - Fear of the Dark/Wasting Love.mp3'},
  {'icon': iconImage, 'title': 'Welcome To Paradise', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Welcome to Paradise.mp3'},
  {'icon': iconImage, 'title': 'What A Wonderfull World', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/What a wonderfull world.mp3'},
  {'icon': iconImage, 'title': 'When You Tell Me That You Love Me', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/When You Tell Me that You Love Me.mp3'},
  {'icon': iconImage, 'title': 'Wild Wild Web', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Wild Wild Web.mp3'},
  {'icon': iconImage, 'title': 'Wind World', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Wind World.mp3'},
  {'icon': iconImage, 'title': 'Woman In Love', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Woman in love.mp3'},
  {'icon': iconImage, 'title': 'You', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/You.mp3'},
  {'icon': iconImage, 'title': 'You Can Leave Your Hat On', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/You Can Leave Your Hat On.mp3'},
  {'icon': iconImage, 'title': 'You Meet Love', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/You meet love.mp3'},
  {'icon': iconImage, 'title': 'Youll Never Meet An Angel', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/You%27ll Never Meet An Angel.mp3'},
  {'icon': iconImage, 'title': 'Youre A Woman', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/You%27re a woman.mp3'},
  {'icon': iconImage, 'title': 'Za Milih Dam', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Михаил Шуфутинский/1997 - Za milih dam!/Za milih dam.mp3'},
  {'icon': iconImage, 'title': 'А Не Спеть Ли Мне Песню', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/А не спеть ли мне песню.mp3'},
  {'icon': iconImage, 'title': 'Аlamedoves', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Аlamedoves.mp3'},
  {'icon': iconImage, 'title': 'Автомобиль', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Автомобиль.mp3'},
  {'icon': iconImage, 'title': 'Амулет', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Белая гвардия/Амулет.mp3'},
  {'icon': iconImage, 'title': 'Аэропорт', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Аэропорт.WAV'},
  {'icon': iconImage, 'title': 'Батарейка', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Батарейка.mp3'},
  {'icon': iconImage, 'title': 'Без Тебя', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Без тебя.mp3'},
  {'icon': iconImage, 'title': 'Белая Гвардия', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Белая гвардия/Белая гвардия.mp3'},
  {'icon': iconImage, 'title': 'Боби Боба', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Боби-боба.mp3'},
  {'icon': iconImage, 'title': 'Боже Какой Пустяк', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Трофим/Боже какой пустяк.mp3'},
  {'icon': iconImage, 'title': 'Братишка', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Братишка.mp3'},
  {'icon': iconImage, 'title': 'В Жарких Странах', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/В жарких странах.mp3'},
  {'icon': iconImage, 'title': 'Ветер В Голове', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Трофим/Ветер в голове.mp3'},
  {'icon': iconImage, 'title': 'Вечная Молодость', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Чиж/1993 - Чиж/Вечная молодость.mp3'},
  {'icon': iconImage, 'title': 'Видение', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Видение.mp3'},
  {'icon': iconImage, 'title': 'Владимирский Централ', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Владимирский централ.mp3'},
  {'icon': iconImage, 'title': 'Вороны', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Вороны.mp3'},
  {'icon': iconImage, 'title': 'Все В Порядке', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Все В Порядке.mp3'},
  {'icon': iconImage, 'title': 'Голубая Стрела', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Белая гвардия/Голубая стрела.mp3'},
  {'icon': iconImage, 'title': 'Да Ди Дам', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Да-ди-дам.mp3'},
  {'icon': iconImage, 'title': 'Дальнобойная', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Трофим/Дальнобойная.mp3'},
  {'icon': iconImage, 'title': 'Девочка Моя', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Девочка моя.mp3'},
  {'icon': iconImage, 'title': 'Девушка Из Высшего Общества', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Девушка из высшего общества.mp3'},
  {'icon': iconImage, 'title': 'День Рожденья', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/День рожденья.mp3'},
  {'icon': iconImage, 'title': 'Дорога', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Дорога.mp3'},
  {'icon': iconImage, 'title': 'Если В Сердце Живет Любовь', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Если в сердце живет любовь.mp3'},
  {'icon': iconImage, 'title': 'Если Хочешь Уходи', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Если хочешь уходи.mp3'},
  {'icon': iconImage, 'title': 'Жара', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Жара.mp3'},
  {'icon': iconImage, 'title': 'Звезды', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Звезды.mp3'},
  {'icon': iconImage, 'title': 'Земляничный Берсерк', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Земляничный Берсерк.mp3'},
  {'icon': iconImage, 'title': 'Иногда', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Иногда.mp3'},
  {'icon': iconImage, 'title': 'Какой Пустяк', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Какой пустяк.mp3'},
  {'icon': iconImage, 'title': 'Клубника Со Льдом', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Клубника со льдом.WAV'},
  {'icon': iconImage, 'title': 'Колыбельная Волкам', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Колыбельная волкам.mp3'},
  {'icon': iconImage, 'title': 'Кошки', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Кошки.mp3'},
  {'icon': iconImage, 'title': 'Красиво', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Красиво.mp3'},
  {'icon': iconImage, 'title': 'Кто Виноват', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Кто виноват.mp3'},
  {'icon': iconImage, 'title': 'Куранты', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Куранты.mp3'},
  {'icon': iconImage, 'title': 'Ламбада', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Ламбада.mp3'},
  {'icon': iconImage, 'title': 'Ласковаямоя', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Ласковаямоя.mp3'},
  {'icon': iconImage, 'title': 'Лошадка', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Лошадка.mp3'},
  {'icon': iconImage, 'title': 'Маленькая Страна', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Маленькая страна.mp3'},
  {'icon': iconImage, 'title': 'Маленький Зверь', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Маленький зверь.mp3'},
  {'icon': iconImage, 'title': 'Мама Шикодам', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Мама шикодам.mp3'},
  {'icon': iconImage, 'title': 'Мамба', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Мамба.mp3'},
  {'icon': iconImage, 'title': 'Маргарита', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Маргарита.mp3'},
  {'icon': iconImage, 'title': 'Между Мной И Тобой', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Между мной и тобой.mp3'},
  {'icon': iconImage, 'title': 'Мой Мир', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Мой мир.mp3'},
  {'icon': iconImage, 'title': 'Молодые Ветра', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Молодые ветра.MP3'},
  {'icon': iconImage, 'title': 'Музыка Нас Связала', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Музыка нас связала.MP3'},
  {'icon': iconImage, 'title': 'На Поле Танки Грохотали ', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Чиж/1997 - Бомбардировщик/На поле танки грохотали...mp3'},
  {'icon': iconImage, 'title': 'Не Получилось Не Срослось', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Не Получилось, Не Срослось.mp3'},
  {'icon': iconImage, 'title': 'Не Уверен', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Не уверен.mp3'},
  {'icon': iconImage, 'title': 'Невеста', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Невеста.mp3'},
  {'icon': iconImage, 'title': 'Незаконченный Роман', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Аллегрова/Незаконченный роман.mp3'},
  {'icon': iconImage, 'title': 'Немного Огня', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Немного огня.mp3'},
  {'icon': iconImage, 'title': 'Ну Гдеже Ваши Руки', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Ну гдеже ваши руки.mp3'},
  {'icon': iconImage, 'title': 'Охотники', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Охотники.mp3'},
  {'icon': iconImage, 'title': 'Перелётная Птица', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Перелётная птица.mp3'},
  {'icon': iconImage, 'title': 'Печаль', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Печаль.mp3'},
  {'icon': iconImage, 'title': 'Плачет Девушка В Автомате', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Плачет девушка в автомате.mp3'},
  {'icon': iconImage, 'title': 'Поворачивай К Черту', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Поворачивай к черту.mp3'},
  {'icon': iconImage, 'title': 'Поколение Next', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Поколение Next.mp3'},
  {'icon': iconImage, 'title': 'Полет К Новым Мирам', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Полет к новым мирам.mp3'},
  {'icon': iconImage, 'title': 'Понимаешь', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Понимаешь.mp3'},
  {'icon': iconImage, 'title': 'Последняя', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Последняя.mp3'},
  {'icon': iconImage, 'title': 'Прости За Любовь', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Прости за любовь.MP3'},
  {'icon': iconImage, 'title': 'Просто Такая Сильная Любовь', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Просто такая сильная любовь.mp3'},
  {'icon': iconImage, 'title': 'Раз И Навсегда', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Раз и навсегда.mp3'},
  {'icon': iconImage, 'title': 'Сhihuahua', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Сhihuahua.mp3'},
  {'icon': iconImage, 'title': 'Самолеты', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Самолеты.mp3'},
  {'icon': iconImage, 'title': 'Сестра И Принцессы', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Сестра и Принцессы.mp3'},
  {'icon': iconImage, 'title': 'Сиреневый Туман', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Михаил Шуфутинский/1990 - Moya jizn/Сиреневый Туман.mp3'},
  {'icon': iconImage, 'title': 'Снег Кружится', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Снег кружится.mp3'},
  {'icon': iconImage, 'title': 'Старший Брат', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Старший Брат.mp3'},
  {'icon': iconImage, 'title': 'Странник', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Аллегрова/Странник.mp3'},
  {'icon': iconImage, 'title': 'Сукачев', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Сукачев.MP3'},
  {'icon': iconImage, 'title': 'Танкист', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Танкист.mp3'},
  {'icon': iconImage, 'title': 'Таю', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Таю.mp3'},
  {'icon': iconImage, 'title': 'Ты Будешь Плакать', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Ты будешь плакать.mp3'},
  {'icon': iconImage, 'title': 'Ты Где То Там', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Ты где -то там.mp3'},
  {'icon': iconImage, 'title': 'Ты Меня Не Забыай', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Ты меня не забыай.mp3'},
  {'icon': iconImage, 'title': 'Улетай', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Улетай.mp3'},
  {'icon': iconImage, 'title': 'Фантом', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Чиж/1998 - Новый Иерусалим/Фантом.mp3'},
  {'icon': iconImage, 'title': 'Х Х Х И Р Н Р', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Х.Х.Х. и Р.Н.Р.mp3'},
  {'icon': iconImage, 'title': 'Хип Хоп Рэп', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Хип-хоп-рэп.mp3'},
  {'icon': iconImage, 'title': 'Цветы', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Цветы.mp3'},
  {'icon': iconImage, 'title': 'Чудеса', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Чудеса.mp3'},
  {'icon': iconImage, 'title': 'Школьная Пора', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Школьная Пора.mp3'},
  {'icon': iconImage, 'title': 'Я Летата', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Я летата.mp3'},
  {'icon': iconImage, 'title': 'Я Уйду', 'file': '../../../../../../../../F:/MUSIK/RADIO Помойка/Я уйду.mp3'},
]);
})

document.getElementById('rammstein').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Adios', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Adios.mp3'},
  {'icon': iconImage, 'title': 'Alter Mann', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Das modell/Alter Mann.mp3'},
  {'icon': iconImage, 'title': 'Amerika', 'file': '../../../../../../../../F:/MUSIK/Rammstein/2004 - Reise, Reise/Amerika.mp3'},
  {'icon': iconImage, 'title': 'Amour', 'file': '../../../../../../../../F:/MUSIK/Rammstein/2004 - Reise, Reise/Amour.mp3'},
  {'icon': iconImage, 'title': 'Ausländer', 'file': '../../../../../../../../F:/MUSIK/Rammstein/2019 - RAMMSTEIN/Ausländer.mp3'},
  {'icon': iconImage, 'title': 'Deustschland', 'file': '../../../../../../../../F:/MUSIK/Rammstein/2019 - RAMMSTEIN/Deustschland.mp3'},
  {'icon': iconImage, 'title': 'Donaukinder', 'file': '../../../../../../../../F:/MUSIK/Rammstein/2009 - LIFAD/Donaukinder.mp3'},
  {'icon': iconImage, 'title': 'Du Hast', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Rosenrot/Du Hast.mp3'},
  {'icon': iconImage, 'title': 'Du Riechst So Gut', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Du Riechst So Gut/Du Riechst So Gut.mp3'},
  {'icon': iconImage, 'title': 'Du Riechst So Gut', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Du Riechst So Gut/Du Riechst So Gut.asf'},
  {'icon': iconImage, 'title': 'Engel', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Sehnsucht/Engel.mp3'},
  {'icon': iconImage, 'title': 'Engel', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Sehnsucht/Engel.asf'},
  {'icon': iconImage, 'title': 'Feuer Frei', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Rosenrot/Feuer Frei.mp3'},
  {'icon': iconImage, 'title': 'Feuer Und Wasser', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Rosenrot/Feuer und wasser.mp3'},
  {'icon': iconImage, 'title': 'Fruhling In Paris', 'file': '../../../../../../../../F:/MUSIK/Rammstein/2009 - LIFAD/Fruhling in Paris.mp3'},
  {'icon': iconImage, 'title': 'Haifisch', 'file': '../../../../../../../../F:/MUSIK/Rammstein/2009 - LIFAD/Haifisch.mp3'},
  {'icon': iconImage, 'title': 'Hilf Mir', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Rosenrot/Hilf mir.mp3'},
  {'icon': iconImage, 'title': 'Ich Tu Dir Weh', 'file': '../../../../../../../../F:/MUSIK/Rammstein/2009 - LIFAD/Ich tu dir weh.mp3'},
  {'icon': iconImage, 'title': 'Ich Will', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Mutter/Ich Will.mp3'},
  {'icon': iconImage, 'title': 'Keine Lust', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Rosenrot/Keine Lust.mp3'},
  {'icon': iconImage, 'title': 'Links 2 3 4', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Mutter/Links 2 3 4.mp3'},
  {'icon': iconImage, 'title': 'Mann Gegen Mann', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Rosenrot/Mann gegen mann.mp3'},
  {'icon': iconImage, 'title': 'Mein Herz Brennt', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Mutter/Mein Herz Brennt.mp3'},
  {'icon': iconImage, 'title': 'Mein Herz Brennt', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Mutter/Mein Herz Brennt.mp4'},
  {'icon': iconImage, 'title': 'Mein Teil', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Rosenrot/Mein Teil.mp3'},
  {'icon': iconImage, 'title': 'Morgenstern', 'file': '../../../../../../../../F:/MUSIK/Rammstein/2004 - Reise, Reise/Morgenstern.mp3'},
  {'icon': iconImage, 'title': 'Moskou', 'file': '../../../../../../../../F:/MUSIK/Rammstein/2004 - Reise, Reise/Moskou.mp3'},
  {'icon': iconImage, 'title': 'Mutter', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Mutter/Mutter.mp3'},
  {'icon': iconImage, 'title': 'Ohne Dich', 'file': '../../../../../../../../F:/MUSIK/Rammstein/2004 - Reise, Reise/Ohne Dich.mp3'},
  {'icon': iconImage, 'title': 'Original', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Engel/Original.mp3'},
  {'icon': iconImage, 'title': 'Pussy', 'file': '../../../../../../../../F:/MUSIK/Rammstein/2009 - LIFAD/Pussy .mp3'},
  {'icon': iconImage, 'title': 'Reise Reise', 'file': '../../../../../../../../F:/MUSIK/Rammstein/2004 - Reise, Reise/Reise, Reise.mp3'},
  {'icon': iconImage, 'title': 'Rosenrot', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Rosenrot/Rosenrot.mp3'},
  {'icon': iconImage, 'title': 'Seemann', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Seemann/Seemann.mp3'},
  {'icon': iconImage, 'title': 'Sonne', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Mutter/Sonne.mp3'},
  {'icon': iconImage, 'title': 'Spieluhr', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Spieluhr.mp3'},
  {'icon': iconImage, 'title': 'Stein Um Stein', 'file': '../../../../../../../../F:/MUSIK/Rammstein/2004 - Reise, Reise/Stein um Stein.mp3'},
  {'icon': iconImage, 'title': 'String', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Rosenrot/String.mp3'},
  {'icon': iconImage, 'title': 'Stripped', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Stripped/Stripped.mp3'},
  {'icon': iconImage, 'title': 'Stripped', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Stripped/Stripped.asf'},
  {'icon': iconImage, 'title': 'Waidmanns Heil', 'file': '../../../../../../../../F:/MUSIK/Rammstein/2009 - LIFAD/Waidmanns Heil.mp3'},
  {'icon': iconImage, 'title': 'Was Ich Liebe', 'file': '../../../../../../../../F:/MUSIK/Rammstein/2019 - RAMMSTEIN/Was Ich Liebe.mp3'},
  {'icon': iconImage, 'title': 'Weit Weg', 'file': '../../../../../../../../F:/MUSIK/Rammstein/2019 - RAMMSTEIN/Weit Weg.mp3'},
  {'icon': iconImage, 'title': 'Wilder Wein', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Wilder Wein.mp3'},
  {'icon': iconImage, 'title': 'Wobist Du', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Rosenrot/Wobist du.mp3'},
  {'icon': iconImage, 'title': 'Wollt Ihr', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Herzeleid/Wollt Ihr.mp3'},
  {'icon': iconImage, 'title': 'Zeig Dich', 'file': '../../../../../../../../F:/MUSIK/Rammstein/2019 - RAMMSTEIN/Zeig Dich.mp3'},
  {'icon': iconImage, 'title': 'Zwitter', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Mutter/Zwitter.mp3'},
  {'icon': iconImage, 'title': 'Тier', 'file': '../../../../../../../../F:/MUSIK/Rammstein/Sehnsucht/Тier.mp3'},
]);
})

document.getElementById('romanticcollektion').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': ' Track04', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/M/- Track04.mp3'},
  {'icon': iconImage, 'title': '01', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/Romantic Collektion/Romantic Collection 2/01.mp3'},
  {'icon': iconImage, 'title': '02', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/Romantic Collektion/Romantic Collection 1/02.mp3'},
  {'icon': iconImage, 'title': '08', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/Romantic Collektion/Romantic Collection 2/08.mp3'},
  {'icon': iconImage, 'title': '1', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/Romantic Collektion/5/1.MP3'},
  {'icon': iconImage, 'title': '10', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/Romantic Collektion/8/10.MP3'},
  {'icon': iconImage, 'title': '11', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/Romantic Collektion/5/11.MP3'},
  {'icon': iconImage, 'title': '12', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/Romantic Collektion/Romantic Collection 2/12.mp3'},
  {'icon': iconImage, 'title': '13', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/13.mp3'},
  {'icon': iconImage, 'title': '13', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/Romantic Collektion/11/13.MP3'},
  {'icon': iconImage, 'title': '13', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/Romantic Collektion/Romantic Collection 1/13.mp3'},
  {'icon': iconImage, 'title': '14', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/Romantic Collektion/Romantic Collection 2/14.mp3'},
  {'icon': iconImage, 'title': '16', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/16.mp3'},
  {'icon': iconImage, 'title': '16', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/Romantic Collektion/4/16.MP3'},
  {'icon': iconImage, 'title': '17', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/Romantic Collektion/4/17.MP3'},
  {'icon': iconImage, 'title': '18 Track 18', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/18 - Track 18.mp3'},
  {'icon': iconImage, 'title': '19', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/Romantic Collektion/4/19.MP3'},
  {'icon': iconImage, 'title': '19', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/Romantic Collektion/5/19.MP3'},
  {'icon': iconImage, 'title': '22 Трек 22', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/M/22 - Трек 22.mp3'},
  {'icon': iconImage, 'title': '33', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/33.mp3'},
  {'icon': iconImage, 'title': '5', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/5.mp3'},
  {'icon': iconImage, 'title': '5', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/Romantic Collektion/2/5.MP3'},
  {'icon': iconImage, 'title': '5', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/Romantic Collektion/9/5.MP3'},
  {'icon': iconImage, 'title': 'Dido', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/Dido.mp3'},
  {'icon': iconImage, 'title': 'Keane 04 Track 4', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/Keane - 04 - Track  4.mp3'},
  {'icon': iconImage, 'title': 'Keane 05 Track 5', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/Keane - 05 - Track  5.mp3'},
  {'icon': iconImage, 'title': 'Little Russia', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/Romantic Collektion/5/Little Russia.MP3'},
  {'icon': iconImage, 'title': 'Pink Panther', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/Romantic Collektion/Romantic Collection 1/Pink Panther.mp3'},
  {'icon': iconImage, 'title': 'The Phantom Of The Opera', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/Romantic Collektion/Romantic Collection 1/The Phantom Of The Opera.mp3'},
  {'icon': iconImage, 'title': 'Track 10', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/M/инструментал/Track 10.mp3'},
  {'icon': iconImage, 'title': 'Track 12', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/M/инструментал/Track 12.mp3'},
  {'icon': iconImage, 'title': 'Track 5', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/M/инструментал/Track  5.mp3'},
  {'icon': iconImage, 'title': 'Track15', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/TRACK15.mp3'},
  {'icon': iconImage, 'title': 'Track209', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/TRACK209.mp3'},
  {'icon': iconImage, 'title': 'Vot 009', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/VOT-009.mp3'},
  {'icon': iconImage, 'title': 'Дорожка 1', 'file': '../../../../../../../../F:/MUSIK/Romantic Collektion/Дорожка 1.mp3'},
]);
})

document.getElementById('scooter').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Break It Up', 'file': '../../../../../../../../F:/MUSIK/Scooter/1996 - Wicked!/Break It Up.mp3'},
  {'icon': iconImage, 'title': 'Break It Up', 'file': '../../../../../../../../F:/MUSIK/Scooter/1996 - Wicked!/Break It Up.mp4'},
  {'icon': iconImage, 'title': 'Clic Clac', 'file': '../../../../../../../../F:/MUSIK/Scooter/2009 - Under The Radar Over The Top/Clic Clac.mp3'},
  {'icon': iconImage, 'title': 'Fire', 'file': '../../../../../../../../F:/MUSIK/Scooter/1997 - The Age Of Love/Fire.mp3'},
  {'icon': iconImage, 'title': 'How Much Is The Fish', 'file': '../../../../../../../../F:/MUSIK/Scooter/1998 - No Time To Chill/How Much Is The Fish.mp3'},
  {'icon': iconImage, 'title': 'I Was Made For Lovin You', 'file': '../../../../../../../../F:/MUSIK/Scooter/1998 - No Time To Chill/I Was Made For Lovin%27 You.mp3'},
  {'icon': iconImage, 'title': 'Introduction', 'file': '../../../../../../../../F:/MUSIK/Scooter/1997 - The Age Of Love/Introduction.mp3'},
  {'icon': iconImage, 'title': 'The Logical Song', 'file': '../../../../../../../../F:/MUSIK/Scooter/2007 - Jumping All Over The World - Whatever You Want/The Logical Song.mp3'},
  {'icon': iconImage, 'title': 'The Night', 'file': '../../../../../../../../F:/MUSIK/Scooter/2007 - Jumping All Over The World - Whatever You Want/The Night.mp3'},
  {'icon': iconImage, 'title': 'We Are The Greatest', 'file': '../../../../../../../../F:/MUSIK/Scooter/1998 - No Time To Chill/We Are The Greatest.mp3'},
  {'icon': iconImage, 'title': 'Weekend', 'file': '../../../../../../../../F:/MUSIK/Scooter/2007 - Jumping All Over The World - Whatever You Want/Weekend.mp3'},
]);
})

document.getElementById('shakira').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Ciega Sordomuda', 'file': '../../../../../../../../F:/MUSIK/Shakira/1998 - Donde Estan Los Ladrones/Ciega sordomuda.mp3'},
  {'icon': iconImage, 'title': 'Donde Estan Los Ladrones', 'file': '../../../../../../../../F:/MUSIK/Shakira/1998 - Donde Estan Los Ladrones/Donde estan los ladrones.mp3'},
  {'icon': iconImage, 'title': 'Dont Bother', 'file': '../../../../../../../../F:/MUSIK/Shakira/2007 - Oral Fixation Tour/Don%27t Bother.mp3'},
  {'icon': iconImage, 'title': 'Estoy Aqui', 'file': '../../../../../../../../F:/MUSIK/Shakira/1998 - Donde Estan Los Ladrones/Estoy aqui.mp3'},
  {'icon': iconImage, 'title': 'Eyes Like Yours Ojos Asi', 'file': '../../../../../../../../F:/MUSIK/Shakira/2001 - Laundry Service/Eyes Like Yours Ojos asi.mp3'},
  {'icon': iconImage, 'title': 'How Do You Do', 'file': '../../../../../../../../F:/MUSIK/Shakira/2005 - Fijacion Oral/How Do You Do.mp3'},
  {'icon': iconImage, 'title': 'Inevitable', 'file': '../../../../../../../../F:/MUSIK/Shakira/2002 - Grandes Exitos/Inevitable.mp3'},
  {'icon': iconImage, 'title': 'Objection', 'file': '../../../../../../../../F:/MUSIK/Shakira/2001 - Laundry Service/Objection.mp3'},
  {'icon': iconImage, 'title': 'Octavo Dia', 'file': '../../../../../../../../F:/MUSIK/Shakira/1998 - Donde Estan Los Ladrones/Octavo dia.mp3'},
  {'icon': iconImage, 'title': 'Ojos Asi', 'file': '../../../../../../../../F:/MUSIK/Shakira/2002 - Grandes Exitos/Ojos Asi.mp3'},
  {'icon': iconImage, 'title': 'Si Te Vas', 'file': '../../../../../../../../F:/MUSIK/Shakira/1998 - Donde Estan Los Ladrones/Si te vas.mp3'},
  {'icon': iconImage, 'title': 'Suerte Whenever Wherever', 'file': '../../../../../../../../F:/MUSIK/Shakira/2001 - Laundry Service/Suerte whenever wherever.mp3'},
  {'icon': iconImage, 'title': 'Underneath Your Clothes', 'file': '../../../../../../../../F:/MUSIK/Shakira/2001 - Laundry Service/Underneath your clothes.mp3'},
  {'icon': iconImage, 'title': 'Underneath Your Clothes (acoustic Version)', 'file': '../../../../../../../../F:/MUSIK/Shakira/2001 - Laundry Service/Underneath Your Clothes (Acoustic Version).mp3'},
  {'icon': iconImage, 'title': 'Whenever Wherever', 'file': '../../../../../../../../F:/MUSIK/Shakira/2001 - Laundry Service/Whenever Wherever.mp3'},
  {'icon': iconImage, 'title': 'Whenever Wherever', 'file': '../../../../../../../../F:/MUSIK/Shakira/2001 - Laundry Service/Whenever, Wherever.mp3'},
]);
})

document.getElementById('systemofadown').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A T W A', 'file': '../../../../../../../../F:/MUSIK/System of a Down/2001 - Toxicity/A.T.W.A.mp3'},
  {'icon': iconImage, 'title': 'Aerials', 'file': '../../../../../../../../F:/MUSIK/System of a Down/Soundtrack hits (bootleg)/Aerials.mp3'},
  {'icon': iconImage, 'title': 'Chop Suey', 'file': '../../../../../../../../F:/MUSIK/System of a Down/2001 - Toxicity/Chop Suey.mp3'},
  {'icon': iconImage, 'title': 'Pictures', 'file': '../../../../../../../../F:/MUSIK/System of a Down/2002 - Steal This Album!/Pictures.mp3'},
  {'icon': iconImage, 'title': 'Psycho', 'file': '../../../../../../../../F:/MUSIK/System of a Down/Soundtrack hits (bootleg)/Psycho.mp3'},
  {'icon': iconImage, 'title': 'Spiders', 'file': '../../../../../../../../F:/MUSIK/System of a Down/1998 - System Of A Down/Spiders.mp3'},
]);
})

document.getElementById('vanessamae').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Aurora', 'file': '../../../../../../../../F:/MUSIK/Vanessa Mae/1997 - Storm/Aurora.mp3'},
  {'icon': iconImage, 'title': 'Can Can', 'file': '../../../../../../../../F:/MUSIK/Vanessa Mae/1997 - Storm/Can, Can.mp3'},
  {'icon': iconImage, 'title': 'Classical Gas', 'file': '../../../../../../../../F:/MUSIK/Vanessa Mae/1995 - The Violin Player/Classical Gas.mp3'},
  {'icon': iconImage, 'title': 'Contradanza', 'file': '../../../../../../../../F:/MUSIK/Vanessa Mae/1995 - The Violin Player/Contradanza.mp3'},
  {'icon': iconImage, 'title': 'I Feel Love', 'file': '../../../../../../../../F:/MUSIK/Vanessa Mae/1997 - Storm/I Feel Love.mp3'},
  {'icon': iconImage, 'title': 'Retro', 'file': '../../../../../../../../F:/MUSIK/Vanessa Mae/1997 - Storm/Retro.mp3'},
  {'icon': iconImage, 'title': 'Storm', 'file': '../../../../../../../../F:/MUSIK/Vanessa Mae/1997 - Storm/Storm.mp3'},
  {'icon': iconImage, 'title': 'Toccata And Fugue In D Minor', 'file': '../../../../../../../../F:/MUSIK/Vanessa Mae/1995 - The Violin Player/Toccata and Fugue in D minor.mp3'},
  {'icon': iconImage, 'title': 'You Fly Me Up', 'file': '../../../../../../../../F:/MUSIK/Vanessa Mae/1997 - Storm/You Fly Me Up.mp3'},
]);
})

document.getElementById('withintemptation').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A Dangerous Mind', 'file': '../../../../../../../../F:/MUSIK/Within Temptation/2004 - The Silent Force/A Dangerous Mind.mp3'},
  {'icon': iconImage, 'title': 'Angels', 'file': '../../../../../../../../F:/MUSIK/Within Temptation/2005 - Angels/Angels.mp3'},
  {'icon': iconImage, 'title': 'Aquarius', 'file': '../../../../../../../../F:/MUSIK/Within Temptation/2004 - The Silent Force/Aquarius.mp3'},
  {'icon': iconImage, 'title': 'Bittersweet', 'file': '../../../../../../../../F:/MUSIK/Within Temptation/2003 - Mother Earth/Bittersweet.mp3'},
  {'icon': iconImage, 'title': 'Destroyed', 'file': '../../../../../../../../F:/MUSIK/Within Temptation/2005 - Memories/Destroyed.mp3'},
  {'icon': iconImage, 'title': 'Enter', 'file': '../../../../../../../../F:/MUSIK/Within Temptation/1997 - Enter/Enter.mp3'},
  {'icon': iconImage, 'title': 'In Perfect Harmony', 'file': '../../../../../../../../F:/MUSIK/Within Temptation/2003 - Mother Earth/In Perfect Harmony.mp3'},
  {'icon': iconImage, 'title': 'Intro', 'file': '../../../../../../../../F:/MUSIK/Within Temptation/2004 - The Silent Force/Intro.mp3'},
  {'icon': iconImage, 'title': 'Its The Fear', 'file': '../../../../../../../../F:/MUSIK/Within Temptation/2004 - The Silent Force/It%27s the Fear.mp3'},
  {'icon': iconImage, 'title': 'Jillian (id Give My Heart)', 'file': '../../../../../../../../F:/MUSIK/Within Temptation/2004 - The Silent Force/Jillian (I%27d Give My Heart).mp3'},
  {'icon': iconImage, 'title': 'Let Us Burn', 'file': '../../../../../../../../F:/MUSIK/Within Temptation/Let Us Burn.mp4'},
  {'icon': iconImage, 'title': 'Let Us Burn Myzuka', 'file': '../../../../../../../../F:/MUSIK/Within Temptation/Let us burn myzuka.mp3'},
  {'icon': iconImage, 'title': 'Memories', 'file': '../../../../../../../../F:/MUSIK/Within Temptation/2004 - The Silent Force/Memories.mp3'},
  {'icon': iconImage, 'title': 'Mother Earth', 'file': '../../../../../../../../F:/MUSIK/Within Temptation/2003 - Mother Earth/Mother Earth.mp3'},
  {'icon': iconImage, 'title': 'Out Farewell', 'file': '../../../../../../../../F:/MUSIK/Within Temptation/2003 - Mother Earth/Out Farewell.mp3'},
  {'icon': iconImage, 'title': 'Overcome', 'file': '../../../../../../../../F:/MUSIK/Within Temptation/2004 - Stand My Ground/Overcome.mp3'},
  {'icon': iconImage, 'title': 'Pale', 'file': '../../../../../../../../F:/MUSIK/Within Temptation/2004 - The Silent Force/Pale.mp3'},
  {'icon': iconImage, 'title': 'Paradise', 'file': '../../../../../../../../F:/MUSIK/Within Temptation/Paradise.mp4'},
  {'icon': iconImage, 'title': 'Pearls Of Light', 'file': '../../../../../../../../F:/MUSIK/Within Temptation/1997 - Enter/Pearls Of Light.mp3'},
  {'icon': iconImage, 'title': 'Running Up That Hill', 'file': '../../../../../../../../F:/MUSIK/Within Temptation/2003 - Running Up And Hill/Running Up That Hill.mp3'},
  {'icon': iconImage, 'title': 'See Who I Am', 'file': '../../../../../../../../F:/MUSIK/Within Temptation/2004 - The Silent Force/See Who I Am.mp3'},
  {'icon': iconImage, 'title': 'Stand My Ground', 'file': '../../../../../../../../F:/MUSIK/Within Temptation/2004 - The Silent Force/Stand My Ground.mp3'},
  {'icon': iconImage, 'title': 'The Swan Song', 'file': '../../../../../../../../F:/MUSIK/Within Temptation/2004 - The Silent Force/The Swan Song.mp3'},
  {'icon': iconImage, 'title': 'We Run Feat', 'file': '../../../../../../../../F:/MUSIK/Within Temptation/We run feat.mp3'},
]);
})

document.getElementById('а.гордон').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '25 Й Кадр', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/25-й кадр.mp3'},
  {'icon': iconImage, 'title': 'Fenomen Margantsa', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Fenomen margantsa.mp3'},
  {'icon': iconImage, 'title': 'Агрессия Сверчков', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Агрессия сверчков.mp3'},
  {'icon': iconImage, 'title': 'Анатомия Старения', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Анатомия старения.mp3'},
  {'icon': iconImage, 'title': 'Антарктида Древний Климат', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Антарктида древний климат.wav'},
  {'icon': iconImage, 'title': 'Астероидная Опастность', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Астероидная опастность.mp3'},
  {'icon': iconImage, 'title': 'Биоизлучение', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Биоизлучение.mp3'},
  {'icon': iconImage, 'title': 'Биологическая Эволюция', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Биологическая эволюция.mp3'},
  {'icon': iconImage, 'title': 'Биологическое Разнообразие', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Биологическое разнообразие.mp3'},
  {'icon': iconImage, 'title': 'Биотерроризм', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Биотерроризм.mp3'},
  {'icon': iconImage, 'title': 'Братья Вавиловы', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Братья Вавиловы.mp3'},
  {'icon': iconImage, 'title': 'Бред Величия', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Бред величия.mp3'},
  {'icon': iconImage, 'title': 'Великая Отечественная Как Гражданская', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Великая отечественная как гражданская.mp3'},
  {'icon': iconImage, 'title': 'Виртуальные Модели Мира', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Виртуальные модели мира.mp3'},
  {'icon': iconImage, 'title': 'Восприятие Красоты', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Восприятие красоты.mp3'},
  {'icon': iconImage, 'title': 'Генетическая История Человечества', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Генетическая история человечества.mp3'},
  {'icon': iconImage, 'title': 'Геном Человека', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Геном человека.mp3'},
  {'icon': iconImage, 'title': 'Гены И Культура', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Гены и культура.mp3'},
  {'icon': iconImage, 'title': 'Гипноз', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Гипноз.mp3'},
  {'icon': iconImage, 'title': 'Гипноз Ислама', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Гипноз ислама.mp3'},
  {'icon': iconImage, 'title': 'Голоса', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Голоса.mp3'},
  {'icon': iconImage, 'title': 'Голоса 2', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Голоса-2.mp3'},
  {'icon': iconImage, 'title': 'Движение Континентов', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Движение континентов.mp3'},
  {'icon': iconImage, 'title': 'Доказательность В Математике', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Доказательность в математике.mp3'},
  {'icon': iconImage, 'title': 'Ефимов Лекцив Фсб', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Ефимов лекцив ФСБ.mp3'},
  {'icon': iconImage, 'title': 'Еффект Сверх Малых Доз', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Еффект сверх малых доз.mp3'},
  {'icon': iconImage, 'title': 'Жизнь Вне Земли ', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Жизнь вне земли....mp3'},
  {'icon': iconImage, 'title': 'Жизнь Звезных Систем', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Жизнь звезных систем.mp3'},
  {'icon': iconImage, 'title': 'Запрограмированная Смерть', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Запрограмированная смерть.mp3'},
  {'icon': iconImage, 'title': 'Зелёная Химия', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Зелёная химия.mp3'},
  {'icon': iconImage, 'title': 'Игра Жизни И Физика Её Воплощения', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Игра жизни и физика её воплощения.mp3'},
  {'icon': iconImage, 'title': 'Из Лягушек В Принцы', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Из лягушек в принцы.mp3'},
  {'icon': iconImage, 'title': 'Интеллект И Наследственность', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Интеллект и наследственность.mp3'},
  {'icon': iconImage, 'title': 'Интеллект Муравьёв', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Интеллект муравьёв.mp3'},
  {'icon': iconImage, 'title': 'Интуиция', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Интуиция.mp3'},
  {'icon': iconImage, 'title': 'Истоки Происхождения Сознания', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Истоки происхождения сознания .mp3'},
  {'icon': iconImage, 'title': 'Квантовая Гравитация', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Квантовая гравитация.mp3'},
  {'icon': iconImage, 'title': 'Квантовая Математика', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Квантовая математика.mp3'},
  {'icon': iconImage, 'title': 'Квантовая Телепортация', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Квантовая телепортация.mp3'},
  {'icon': iconImage, 'title': 'Квантовые Игры', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Квантовые игры.mp3'},
  {'icon': iconImage, 'title': 'Квантовые Компьютеры И Модели Сознания', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Квантовые компьютеры и модели сознания.mp3'},
  {'icon': iconImage, 'title': 'Квантовый Регулятор Клетки', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Квантовый регулятор клетки.mp3'},
  {'icon': iconImage, 'title': 'Класс Интелектуалов', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Класс интелектуалов.mp3'},
  {'icon': iconImage, 'title': 'Когнитивная Наука [не До Конца]', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Когнитивная наука [не до конца].mp3'},
  {'icon': iconImage, 'title': 'Код Идентичности', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Код идентичности.mp3'},
  {'icon': iconImage, 'title': 'Код Идентичности 2', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Код идентичности-2 .mp3'},
  {'icon': iconImage, 'title': 'Коровье Бешенство', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Коровье бешенство.mp3'},
  {'icon': iconImage, 'title': 'Космология Картина Времени', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Космология картина времени.mp3'},
  {'icon': iconImage, 'title': 'Космос Будущего', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Космос будущего.mp3'},
  {'icon': iconImage, 'title': 'Красное И Чёрное', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Красное и чёрное.mp3'},
  {'icon': iconImage, 'title': 'Культура И Мозг', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Культура и мозг.mp3'},
  {'icon': iconImage, 'title': 'Лабиринт Генетики', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Лабиринт генетики.mp3'},
  {'icon': iconImage, 'title': 'Лики Времени', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Лики времени.mp3'},
  {'icon': iconImage, 'title': 'Луна', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Луна.mp3'},
  {'icon': iconImage, 'title': 'Макроскопические Феномены Спина', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Макроскопические феномены спина.mp3'},
  {'icon': iconImage, 'title': 'Малые Дозы Радиации', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Малые дозы радиации.mp3'},
  {'icon': iconImage, 'title': 'Математика И Структура Вселенной', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Математика и структура вселенной.mp3'},
  {'icon': iconImage, 'title': 'Метафизика Брэнда', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Метафизика брэнда.mp3'},
  {'icon': iconImage, 'title': 'Механизмы Памяти И Забвения', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Механизмы памяти и забвения.mp3'},
  {'icon': iconImage, 'title': 'Микроорганизмы В Метеорите', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Микроорганизмы в метеорите.mp3'},
  {'icon': iconImage, 'title': 'Мир Как Вакуум', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Мир как вакуум.mp3'},
  {'icon': iconImage, 'title': 'Миры И Вселенные', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Миры и вселенные.mp3'},
  {'icon': iconImage, 'title': 'Мифология Повседневности', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Мифология повседневности.mp3'},
  {'icon': iconImage, 'title': 'Моделирование Происхождения Интелекта', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Моделирование происхождения интелекта.mp3'},
  {'icon': iconImage, 'title': 'Модель Вселенной', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Модель вселенной.mp3'},
  {'icon': iconImage, 'title': 'Мужчина И Женщина В Языке', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Мужчина и женщина в языке.mp3'},
  {'icon': iconImage, 'title': 'Мышление Животных', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Мышление животных.mp3'},
  {'icon': iconImage, 'title': 'Мышление О Мышлении', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Мышление о мышлении.mp3'},
  {'icon': iconImage, 'title': 'Нанохимия', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Нанохимия.mp3'},
  {'icon': iconImage, 'title': 'Наука Бессмертия', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Наука бессмертия.mp3'},
  {'icon': iconImage, 'title': 'Наука И Гипотеза', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Наука и гипотеза.mp3'},
  {'icon': iconImage, 'title': 'Нейроэволюция', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Нейроэволюция.mp3'},
  {'icon': iconImage, 'title': 'Нейтрино', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Нейтрино.mp3'},
  {'icon': iconImage, 'title': 'Нелинейный Мир', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Нелинейный мир .mp3'},
  {'icon': iconImage, 'title': 'Новая Астрология', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Новая астрология.mp3'},
  {'icon': iconImage, 'title': 'Нравы Древней Руси', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Нравы древней руси.mp3'},
  {'icon': iconImage, 'title': 'Парадокс Левинталя', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Парадокс Левинталя.mp3'},
  {'icon': iconImage, 'title': 'Парниковая Катастрофа', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Парниковая катастрофа.mp3'},
  {'icon': iconImage, 'title': 'Поиск Внеземной Цивилизации', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Поиск внеземной цивилизации.mp3'},
  {'icon': iconImage, 'title': 'Поиск Временных Цмвилизаций', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Поиск временных цмвилизаций.mp3'},
  {'icon': iconImage, 'title': 'Поиск Черных Дыр', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Поиск черных дыр.mp3'},
  {'icon': iconImage, 'title': 'Постсоветизм', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Постсоветизм.mp3'},
  {'icon': iconImage, 'title': 'Поток Времени', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Поток времени.mp3'},
  {'icon': iconImage, 'title': 'Пределы Бесконечности', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Пределы бесконечности.mp3'},
  {'icon': iconImage, 'title': 'Природа Сна', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Природа сна.mp3'},
  {'icon': iconImage, 'title': 'Причина Времени', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Причина времени.mp3'},
  {'icon': iconImage, 'title': 'Прогноз Погоды', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Прогноз погоды.mp3'},
  {'icon': iconImage, 'title': 'Происхождение Вселенной', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Происхождение Вселенной%27.mp3'},
  {'icon': iconImage, 'title': 'Реалитивистская Теория Гравитации', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Реалитивистская теория гравитации.mp3'},
  {'icon': iconImage, 'title': 'Российский Пациент', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Российский пациент.mp3'},
  {'icon': iconImage, 'title': 'Сверхтяжёлые Элементы', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Сверхтяжёлые элементы.mp3'},
  {'icon': iconImage, 'title': 'Социум Приматов', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Социум приматов.mp3'},
  {'icon': iconImage, 'title': 'Стволовые Клетки Человека', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Стволовые клетки человека.mp3'},
  {'icon': iconImage, 'title': 'Странности Квантового Мира', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Странности квантового мира.mp3'},
  {'icon': iconImage, 'title': 'Страх', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Страх.wav'},
  {'icon': iconImage, 'title': 'Структура Вакуума', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Структура вакуума .mp3'},
  {'icon': iconImage, 'title': 'Тёмная Энергия Во Вселенной', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Тёмная энергия во Вселенной.mp3'},
  {'icon': iconImage, 'title': 'Теории Антропогенеза', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Теории антропогенеза.mp3'},
  {'icon': iconImage, 'title': 'Теория Суперструн', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Теория суперструн.mp3'},
  {'icon': iconImage, 'title': 'Термоядерная Реакция', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Термоядерная реакция.mp3'},
  {'icon': iconImage, 'title': 'Трансформация Элементов', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Трансформация элементов.mp3'},
  {'icon': iconImage, 'title': 'Феномен Жизни', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Феномен жизни.mp3'},
  {'icon': iconImage, 'title': 'Феномен Жизни 2', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Феномен жизни - 2.mp3'},
  {'icon': iconImage, 'title': 'Физика Духа', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Физика духа.mp3'},
  {'icon': iconImage, 'title': 'Физика И Математика В Контексте Биогенеза', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Физика и математика в контексте биогенеза.mp3'},
  {'icon': iconImage, 'title': 'Физика И Свобода Воли', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Физика и свобода воли.mp3'},
  {'icon': iconImage, 'title': 'Физические Поля Человека', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Физические поля человека.mp3'},
  {'icon': iconImage, 'title': 'Философия Денег', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Философия денег.mp3'},
  {'icon': iconImage, 'title': 'Формула Рака', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Формула рака.mp3'},
  {'icon': iconImage, 'title': 'Человек И Солнце', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Человек и Солнце.mp3'},
  {'icon': iconImage, 'title': 'Человек Пунктирный', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Человек пунктирный.mp3'},
  {'icon': iconImage, 'title': 'Черные Курильщики', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Черные курильщики.mp3'},
  {'icon': iconImage, 'title': 'Число Время Свет', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Число, время, свет.mp3'},
  {'icon': iconImage, 'title': 'Что Есть Время', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Что есть время .mp3'},
  {'icon': iconImage, 'title': 'Шаровая Молния', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Шаровая молния.mp3'},
  {'icon': iconImage, 'title': 'Эволюционная Теория Пола', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Эволюционная теория пола.mp3'},
  {'icon': iconImage, 'title': 'Эволюционная Теория Пола Ii', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Эволюционная теория пола II.mp3'},
  {'icon': iconImage, 'title': 'Экономическое Пространство Будущего', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Экономическое пространство будущего.mp3'},
  {'icon': iconImage, 'title': 'Эктоны', 'file': '../../../../../../../../F:/MUSIK/А. Гордон/Эктоны.mp3'},
]);
})

document.getElementById('а.малинин').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '04 В Лунном Саду', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/2001-Любви желанная пора/04 - В лунном саду.mp3'},
  {'icon': iconImage, 'title': '07 В Полуденном Саду', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/2001-Любви желанная пора/07 - В полуденном саду.mp3'},
  {'icon': iconImage, 'title': '1 Гори Гори Моя Звезда', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/1994-Бал/1. Гори, Гори, Моя Звезда.mp3'},
  {'icon': iconImage, 'title': '12 Гори Гори Моя Звезда', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/1994-Бал/12. Гори, гори, моя звезда.mp3'},
  {'icon': iconImage, 'title': '15 Ночь', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/1994-Бал/15. Ночь.mp3'},
  {'icon': iconImage, 'title': 'Ledi Gamilton', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/2005-Grand Collection/Ledi Gamilton.mp3'},
  {'icon': iconImage, 'title': 'Net Puti Nazad', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/2005-Grand Collection/Net puti nazad.mp3'},
  {'icon': iconImage, 'title': 'Piligrimi', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/2005-Grand Collection/Piligrimi.mp3'},
  {'icon': iconImage, 'title': 'Белый Конь', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/1994-Бал/Белый конь.mp3'},
  {'icon': iconImage, 'title': 'В Лунном Саду', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/В лунном саду.mp3'},
  {'icon': iconImage, 'title': 'В Полуденном Саду', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/В полуденном саду.mp3'},
  {'icon': iconImage, 'title': 'Глаза Твои', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/2001-Любви желанная пора/Глаза твои.mp3'},
  {'icon': iconImage, 'title': 'Дай Бог', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/2003-Звезды российской эстрады 2CD/Дай Бог.mp3'},
  {'icon': iconImage, 'title': 'Дорогой Длинною', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/2007-Романсы/Дорогой Длинною.mp3'},
  {'icon': iconImage, 'title': 'Забава', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/2003-Звезды российской эстрады 2CD/Забава.mp3'},
  {'icon': iconImage, 'title': 'Зачем Я Влюбился', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/2003-Старинные русские романсы/Зачем я влюбился.mp3'},
  {'icon': iconImage, 'title': 'Звезда', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/Звезда.mp3'},
  {'icon': iconImage, 'title': 'Любви Желанная Пора', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/Любви желанная пора.mp3'},
  {'icon': iconImage, 'title': 'Любви Желанная Пора', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/2001-Любви желанная пора/Любви желанная пора.mp3'},
  {'icon': iconImage, 'title': 'Майдан', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/Майдан.mp3'},
  {'icon': iconImage, 'title': 'Милый Голубь', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/Милый голубь.mp3'},
  {'icon': iconImage, 'title': 'Мольбa', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/1991-Пaрутчик Галицин/Мольбa.mp3'},
  {'icon': iconImage, 'title': 'Напрасные Слова', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/1991-Пaрутчик Галицин/Напрасные слова.mp3'},
  {'icon': iconImage, 'title': 'Незнакомка', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/2001-Любви желанная пора/Незнакомка.mp3'},
  {'icon': iconImage, 'title': 'Нищая', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/2003-Старинные русские романсы/Нищая.mp3'},
  {'icon': iconImage, 'title': 'Ночь', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/1994-Бал/Ночь.mp3'},
  {'icon': iconImage, 'title': 'Пaрутчик Галицин', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/1991-Пaрутчик Галицин/Пaрутчик Галицин.mp3'},
  {'icon': iconImage, 'title': 'Помни И Не Забывай', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/2001-Берега/Помни и не забывай.mp3'},
  {'icon': iconImage, 'title': 'Пугачев', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/2001-Любви желанная пора/Пугачев.mp3'},
  {'icon': iconImage, 'title': 'Распутин', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/2004-Лучшее 2-CD/Распутин.mp3'},
  {'icon': iconImage, 'title': 'Ти Ж Мене Підманула', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/2007-Чарiвна скрипка/Ти ж мене підманула.mp3'},
  {'icon': iconImage, 'title': 'Ты Не Любишь Меня Милый Голубь', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/2001-Любви желанная пора/Ты не любишь меня, милый голубь.mp3'},
  {'icon': iconImage, 'title': 'Ямщик', 'file': '../../../../../../../../F:/MUSIK/А. Малинин/2003-Старинные русские романсы/Ямщик.mp3'},
]);
})

document.getElementById('агатакристи').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Viva Kalma', 'file': '../../../../../../../../F:/MUSIK/Агата Кристи/1989 - Коварство и любовь/Viva Kalma.mp3'},
  {'icon': iconImage, 'title': 'Второй Фронт', 'file': '../../../../../../../../F:/MUSIK/Агата Кристи/1988 - Второй фронт/Второй фронт.mp3'},
  {'icon': iconImage, 'title': 'Два Корабля', 'file': '../../../../../../../../F:/MUSIK/Агата Кристи/1996 - Ураган/Два корабля.mp3'},
  {'icon': iconImage, 'title': 'Как На Войне', 'file': '../../../../../../../../F:/MUSIK/Агата Кристи/1993 - Позорная звезда/Как на войне.mp3'},
  {'icon': iconImage, 'title': 'Легион', 'file': '../../../../../../../../F:/MUSIK/Агата Кристи/1996 - Ураган/Легион.mp3'},
  {'icon': iconImage, 'title': 'Сказочная Тайга', 'file': '../../../../../../../../F:/MUSIK/Агата Кристи/1994 - Опиум/Сказочная тайга.mp3'},
  {'icon': iconImage, 'title': 'Сны', 'file': '../../../../../../../../F:/MUSIK/Агата Кристи/1998 - Чудеса/Сны.mp3'},
  {'icon': iconImage, 'title': 'Собачье Сердце', 'file': '../../../../../../../../F:/MUSIK/Агата Кристи/1989 - Коварство и любовь/Собачье сердце.mp3'},
  {'icon': iconImage, 'title': 'Черная Луна', 'file': '../../../../../../../../F:/MUSIK/Агата Кристи/1994 - Опиум/Черная Луна.mp3'},
]);
})

document.getElementById('алиса').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Веретено', 'file': '../../../../../../../../F:/MUSIK/Алиса/2001 - Танцевать/Веретено.mp3'},
  {'icon': iconImage, 'title': 'Вор И Палач', 'file': '../../../../../../../../F:/MUSIK/Алиса/1984 - Нерная ночь/Вор и палач.mp3'},
  {'icon': iconImage, 'title': 'Все Решено', 'file': '../../../../../../../../F:/MUSIK/Алиса/1998 - Пляс Сибири на берегу Невы/Все решено.mp3'},
  {'icon': iconImage, 'title': 'Дождь', 'file': '../../../../../../../../F:/MUSIK/Алиса/1996 - Jazz/Дождь.mp3'},
  {'icon': iconImage, 'title': 'Доктор Франкенштейн', 'file': '../../../../../../../../F:/MUSIK/Алиса/1984 - Нерная ночь/Доктор Франкенштейн.mp3'},
  {'icon': iconImage, 'title': 'Душа', 'file': '../../../../../../../../F:/MUSIK/Алиса/2003 - Сейчас позднее чем  ты думаеш/Душа.mp3'},
  {'icon': iconImage, 'title': 'Емеля', 'file': '../../../../../../../../F:/MUSIK/Алиса/2005 - Мы вместе 20лет/Емеля.mp3'},
  {'icon': iconImage, 'title': 'Мама', 'file': '../../../../../../../../F:/MUSIK/Алиса/1997 - Дурень/Мама.mp3'},
  {'icon': iconImage, 'title': 'Меломан', 'file': '../../../../../../../../F:/MUSIK/Алиса/2002 - Акустика/Меломан.mp3'},
  {'icon': iconImage, 'title': 'Моё Покаление', 'file': '../../../../../../../../F:/MUSIK/Алиса/Моё покаление.WAV'},
  {'icon': iconImage, 'title': 'Папа Тани', 'file': '../../../../../../../../F:/MUSIK/Алиса/1985 - Акустика I/Папа Тани.mp3'},
  {'icon': iconImage, 'title': 'Перекресток', 'file': '../../../../../../../../F:/MUSIK/Алиса/1996 - Jazz/Перекресток.mp3'},
  {'icon': iconImage, 'title': 'Родина', 'file': '../../../../../../../../F:/MUSIK/Алиса/2003 - Сейчас позднее чем  ты думаеш/Родина.mp3'},
  {'icon': iconImage, 'title': 'Сказка', 'file': '../../../../../../../../F:/MUSIK/Алиса/1986 - Поколение X/Сказка.mp3'},
  {'icon': iconImage, 'title': 'Споконая Ночь', 'file': '../../../../../../../../F:/MUSIK/Алиса/1998 - Пляс Сибири на берегу Невы/Споконая ночь.mp3'},
  {'icon': iconImage, 'title': 'Танец На Палубе', 'file': '../../../../../../../../F:/MUSIK/Алиса/1990 - Ст.206 ч.2/Танец на палубе.mp3'},
  {'icon': iconImage, 'title': 'Театр', 'file': '../../../../../../../../F:/MUSIK/Алиса/1993 - Для тех, кто свалился с луны/Театр.mp3'},
  {'icon': iconImage, 'title': 'Траса Е 95', 'file': '../../../../../../../../F:/MUSIK/Алиса/1997 - Дурень/Траса Е-95.mp3'},
]);
})

document.getElementById('ария').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Ангельская Пыль', 'file': '../../../../../../../../F:/MUSIK/Ария/2002 - Штиль/Ангельская пыль.mp3'},
  {'icon': iconImage, 'title': 'Антихрист', 'file': '../../../../../../../../F:/MUSIK/Ария/1991 - Кровь за кровь/Антихрист.mp3'},
  {'icon': iconImage, 'title': 'Беги За Солнцем', 'file': '../../../../../../../../F:/MUSIK/Ария/1998 - Генератор Зла/Беги за солнцем.mp3'},
  {'icon': iconImage, 'title': 'Без Тебя', 'file': '../../../../../../../../F:/MUSIK/Ария/1999 -  2000 И Одна Ночь/Без тебя.mp3'},
  {'icon': iconImage, 'title': 'Беспечный Ангел', 'file': '../../../../../../../../F:/MUSIK/Ария/2002 - Штиль/Беспечный ангел.mp3'},
  {'icon': iconImage, 'title': 'Бесы', 'file': '../../../../../../../../F:/MUSIK/Ария/1991 - Кровь за кровь/Бесы.mp3'},
  {'icon': iconImage, 'title': 'Возьми Моё Сердце', 'file': '../../../../../../../../F:/MUSIK/Ария/1995 - Ночь Короче Дня/Возьми моё сердце.mp3'},
  {'icon': iconImage, 'title': 'Возьми Моё Сердце', 'file': '../../../../../../../../F:/MUSIK/Ария/1999 -  2000 И Одна Ночь/Возьми моё сердце.mp3'},
  {'icon': iconImage, 'title': 'Воля И Разум', 'file': '../../../../../../../../F:/MUSIK/Ария/1986 - С Кем Ты/Воля и разум.mp3'},
  {'icon': iconImage, 'title': 'Все Что Было', 'file': '../../../../../../../../F:/MUSIK/Ария/1991 - Кровь за кровь/Все что было.mp3'},
  {'icon': iconImage, 'title': 'Герой Асфальта', 'file': '../../../../../../../../F:/MUSIK/Ария/2002 - Штиль/Герой асфальта.mp3'},
  {'icon': iconImage, 'title': 'Герой Асфальта', 'file': '../../../../../../../../F:/MUSIK/Ария/2003 - Путь наверх 2/Герой асфальта.mp3'},
  {'icon': iconImage, 'title': 'Грязь', 'file': '../../../../../../../../F:/MUSIK/Ария/1999 -  2000 И Одна Ночь/Грязь.mp3'},
  {'icon': iconImage, 'title': 'Дай Руку Мне', 'file': '../../../../../../../../F:/MUSIK/Ария/2002 - Штиль/Дай руку мне.mp3'},
  {'icon': iconImage, 'title': 'Дезертир', 'file': '../../../../../../../../F:/MUSIK/Ария/1998 - Генератор Зла/Дезертир.mp3'},
  {'icon': iconImage, 'title': 'Закат', 'file': '../../../../../../../../F:/MUSIK/Ария/1999 -  2000 И Одна Ночь/Закат.mp3'},
  {'icon': iconImage, 'title': 'Искушение', 'file': '../../../../../../../../F:/MUSIK/Ария/1989 - Игра С Огнём/Искушение.mp3'},
  {'icon': iconImage, 'title': 'Колизей', 'file': '../../../../../../../../F:/MUSIK/Ария/2002 - Колизей/Колизей.mp3'},
  {'icon': iconImage, 'title': 'Кровь За Кровь', 'file': '../../../../../../../../F:/MUSIK/Ария/1991 - Кровь за кровь/Кровь за кровь.mp3'},
  {'icon': iconImage, 'title': 'Кто Ты', 'file': '../../../../../../../../F:/MUSIK/Ария/1999 -  2000 И Одна Ночь/Кто ты .mp3'},
  {'icon': iconImage, 'title': 'Мечты', 'file': '../../../../../../../../F:/MUSIK/Ария/1999 -  2000 И Одна Ночь/Мечты.mp3'},
  {'icon': iconImage, 'title': 'Осколок Льда', 'file': '../../../../../../../../F:/MUSIK/Ария/2001 - Химера/Осколок льда.mp3'},
  {'icon': iconImage, 'title': 'Потерянный Рай', 'file': '../../../../../../../../F:/MUSIK/Ария/1999 -  2000 И Одна Ночь/Потерянный рай.mp3'},
  {'icon': iconImage, 'title': 'Пробил Час', 'file': '../../../../../../../../F:/MUSIK/Ария/2002 - Штиль/Пробил час.mp3'},
  {'icon': iconImage, 'title': 'Путь Наверх', 'file': '../../../../../../../../F:/MUSIK/Ария/1997 - Cмутное Время/Путь наверх.mp3'},
  {'icon': iconImage, 'title': 'Путь Наверх', 'file': '../../../../../../../../F:/MUSIK/Ария/2003 - Путь наверх 1/Путь наверх.mp3'},
  {'icon': iconImage, 'title': 'Раскачаем Этот Мир', 'file': '../../../../../../../../F:/MUSIK/Ария/1989 - Игра С Огнём/Раскачаем этот мир.mp3'},
  {'icon': iconImage, 'title': 'Свобода', 'file': '../../../../../../../../F:/MUSIK/Ария/2002 - Штиль/Свобода.mp3'},
  {'icon': iconImage, 'title': 'Смутное Время', 'file': '../../../../../../../../F:/MUSIK/Ария/2004 - Вавилон/Смутное время.mp3'},
  {'icon': iconImage, 'title': 'Тореро', 'file': '../../../../../../../../F:/MUSIK/Ария/1985 - Мания Величия/Тореро.mp3'},
  {'icon': iconImage, 'title': 'Улица Роз', 'file': '../../../../../../../../F:/MUSIK/Ария/1999 -  2000 И Одна Ночь/Улица Роз.mp3'},
  {'icon': iconImage, 'title': 'Химера', 'file': '../../../../../../../../F:/MUSIK/Ария/2001 - Химера/Химера.mp3'},
  {'icon': iconImage, 'title': 'Штиль', 'file': '../../../../../../../../F:/MUSIK/Ария/2001 - Химера/Штиль.mp3'},
  {'icon': iconImage, 'title': 'Я Здесь', 'file': '../../../../../../../../F:/MUSIK/Ария/2005 - Реки времен/Я здесь.mp3'},
  {'icon': iconImage, 'title': 'Я Свободен', 'file': '../../../../../../../../F:/MUSIK/Ария/2004 - Вавилон/Я свободен.mp3'},
]);
})

document.getElementById('би-2').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Варвара', 'file': '../../../../../../../../F:/MUSIK/Би - 2/2000 - БИ-2/Варвара.mp3'},
  {'icon': iconImage, 'title': 'Волки', 'file': '../../../../../../../../F:/MUSIK/Би - 2/Волки.mp3'},
  {'icon': iconImage, 'title': 'Волки', 'file': '../../../../../../../../F:/MUSIK/Би - 2/Волки.mp4'},
  {'icon': iconImage, 'title': 'Мой Рок Н Ролл', 'file': '../../../../../../../../F:/MUSIK/Би - 2/Мой рок-н-ролл.mp3'},
  {'icon': iconImage, 'title': 'Остаться В Живых', 'file': '../../../../../../../../F:/MUSIK/Би - 2/Мяу Кисс МИ/Остаться В Живых.mp3'},
  {'icon': iconImage, 'title': 'Полковнику Никто Не Пишет', 'file': '../../../../../../../../F:/MUSIK/Би - 2/2000 - БИ-2/Полковнику никто не пишет.mp3'},
  {'icon': iconImage, 'title': 'Полковнику Никто Не Пишет', 'file': '../../../../../../../../F:/MUSIK/Би - 2/2000 - БИ-2/Полковнику никто не пишет.mp4'},
  {'icon': iconImage, 'title': 'Серебро', 'file': '../../../../../../../../F:/MUSIK/Би - 2/2000 - БИ-2/Серебро.mp3'},
  {'icon': iconImage, 'title': 'Счастье', 'file': '../../../../../../../../F:/MUSIK/Би - 2/2000 - БИ-2/Счастье.mp3'},
  {'icon': iconImage, 'title': 'Феллини', 'file': '../../../../../../../../F:/MUSIK/Би - 2/Феллини.mp3'},
]);
})

document.getElementById('браво').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Ветер Знает ', 'file': '../../../../../../../../F:/MUSIK/Браво/1995 - Ветер Знает/Ветер знает....mp3'},
  {'icon': iconImage, 'title': 'Дорога В Облака', 'file': '../../../../../../../../F:/MUSIK/Браво/1994 - Дорога в Облака/Дорога в облака.mp3'},
  {'icon': iconImage, 'title': 'Замок Из Песка', 'file': '../../../../../../../../F:/MUSIK/Браво/1994 - Дорога в Облака/Замок из песка.mp3'},
  {'icon': iconImage, 'title': 'Кошки', 'file': '../../../../../../../../F:/MUSIK/Браво/1983-88 - Жанна Агузарова и Браво/Кошки.mp3'},
  {'icon': iconImage, 'title': 'Ленинградский Рок Н Рол', 'file': '../../../../../../../../F:/MUSIK/Браво/1999 - Grand Collection/Ленинградский рок-н-рол.mp3'},
  {'icon': iconImage, 'title': 'Лучший Город Земли', 'file': '../../../../../../../../F:/MUSIK/Браво/1994 - Дорога в Облака/Лучший город земли.mp3'},
  {'icon': iconImage, 'title': 'Любите Девушки', 'file': '../../../../../../../../F:/MUSIK/Браво/1994 - Дорога в Облака/Любите девушки.mp3'},
  {'icon': iconImage, 'title': 'Московский Бит', 'file': '../../../../../../../../F:/MUSIK/Браво/1999 - Grand Collection/Московский бит.mp3'},
  {'icon': iconImage, 'title': 'Пилот 12 45', 'file': '../../../../../../../../F:/MUSIK/Браво/1994 - Live In Moscow/Пилот 12-45.mp3'},
  {'icon': iconImage, 'title': 'Старый Отель', 'file': '../../../../../../../../F:/MUSIK/Браво/1983-88 - Жанна Агузарова и Браво/Старый отель.mp3'},
  {'icon': iconImage, 'title': 'Черный Кот', 'file': '../../../../../../../../F:/MUSIK/Браво/1995 - Песни Разных Лет/Черный кот.mp3'},
  {'icon': iconImage, 'title': 'Чудесная Страна', 'file': '../../../../../../../../F:/MUSIK/Браво/1994 - Live In Moscow/Чудесная страна.mp3'},
  {'icon': iconImage, 'title': 'Этот Город', 'file': '../../../../../../../../F:/MUSIK/Браво/1995 - Ветер Знает/Этот город.mp3'},
]);
})

document.getElementById('в.токарев').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'В Шумном Балагане', 'file': '../../../../../../../../F:/MUSIK/В.Токарев/1981 - В шумном балагане/В шумном балагане.mp3'},
  {'icon': iconImage, 'title': 'Мамая Сын Твой', 'file': '../../../../../../../../F:/MUSIK/В.Токарев/1985 - С Днем рожденья, милая мама/Мама,я сын твой.mp3'},
  {'icon': iconImage, 'title': 'Над Гудзоном', 'file': '../../../../../../../../F:/MUSIK/В.Токарев/1983 - Над Гудзоном/Над Гудзоном.mp3'},
  {'icon': iconImage, 'title': 'Нью Йоркский Таксист', 'file': '../../../../../../../../F:/MUSIK/В.Токарев/1981 - В шумном балагане/Нью-йоркский таксист.mp3'},
  {'icon': iconImage, 'title': 'Придурок Ненормальный', 'file': '../../../../../../../../F:/MUSIK/В.Токарев/1981 - В шумном балагане/Придурок ненормальный.mp3'},
  {'icon': iconImage, 'title': 'Ростовский Урка', 'file': '../../../../../../../../F:/MUSIK/В.Токарев/1981 - В шумном балагане/Ростовский урка.mp3'},
  {'icon': iconImage, 'title': 'С Днём Рождения Милая Мама', 'file': '../../../../../../../../F:/MUSIK/В.Токарев/1985 - С Днем рожденья, милая мама/С Днём рождения милая мама.mp3'},
  {'icon': iconImage, 'title': 'Чубчик Кучерявый', 'file': '../../../../../../../../F:/MUSIK/В.Токарев/1983 - Над Гудзоном/Чубчик Кучерявый.mp3'},
]);
})

document.getElementById('високосныйгод').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '16 37', 'file': '../../../../../../../../F:/MUSIK/Високосный год/16.37 .mp3'},
  {'icon': iconImage, 'title': 'Кино', 'file': '../../../../../../../../F:/MUSIK/Високосный год/Кино.mp3'},
  {'icon': iconImage, 'title': 'Лучшая Песня О Любви', 'file': '../../../../../../../../F:/MUSIK/Високосный год/Лучшая песня о любви.mp3'},
  {'icon': iconImage, 'title': 'Метро', 'file': '../../../../../../../../F:/MUSIK/Високосный год/Метро.mp3'},
  {'icon': iconImage, 'title': 'Тихий Огонёк', 'file': '../../../../../../../../F:/MUSIK/Високосный год/Тихий огонёк.mp3'},
  {'icon': iconImage, 'title': 'Шестой День Осени', 'file': '../../../../../../../../F:/MUSIK/Високосный год/Шестой день осени.mp3'},
]);
})

document.getElementById('гроб').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Все Как У Людей', 'file': '../../../../../../../../F:/MUSIK/Гроб/Все как у людей.mp3'},
  {'icon': iconImage, 'title': 'Запретный Плод', 'file': '../../../../../../../../F:/MUSIK/Гроб/Запретный Плод.mp3'},
  {'icon': iconImage, 'title': 'Здорово И Вечно', 'file': '../../../../../../../../F:/MUSIK/Гроб/Здорово и вечно.mp3'},
  {'icon': iconImage, 'title': 'Зоопарк', 'file': '../../../../../../../../F:/MUSIK/Гроб/Зоопарк.mp3'},
  {'icon': iconImage, 'title': 'Мне Насрать На Мое Лицо', 'file': '../../../../../../../../F:/MUSIK/Гроб/Мне насрать на мое лицо.mp3'},
  {'icon': iconImage, 'title': 'Моя Оборона', 'file': '../../../../../../../../F:/MUSIK/Гроб/Моя оборона.mp3'},
  {'icon': iconImage, 'title': 'Никто Не Хотел Умирать', 'file': '../../../../../../../../F:/MUSIK/Гроб/Никто не хотел умирать.mp3'},
  {'icon': iconImage, 'title': 'Оптимизм', 'file': '../../../../../../../../F:/MUSIK/Гроб/Оптимизм.mp3'},
  {'icon': iconImage, 'title': 'Отряд Не Заметил Потери Бойца', 'file': '../../../../../../../../F:/MUSIK/Гроб/Отряд не заметил потери бойца.mp3'},
  {'icon': iconImage, 'title': 'Поезда', 'file': '../../../../../../../../F:/MUSIK/Гроб/Поезда.mp3'},
  {'icon': iconImage, 'title': 'Про Дурачка', 'file': '../../../../../../../../F:/MUSIK/Гроб/Про Дурачка.mp3'},
  {'icon': iconImage, 'title': 'Солдатами Не Рождаются', 'file': '../../../../../../../../F:/MUSIK/Гроб/Солдатами не рождаются.mp3'},
  {'icon': iconImage, 'title': 'Суицид', 'file': '../../../../../../../../F:/MUSIK/Гроб/Суицид.mp3'},
]);
})

document.getElementById('жванецкий').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'В Нашей Жизни Что Хорошо', 'file': '../../../../../../../../F:/MUSIK/Жванецкий/В нашей жизни что хорошо.mp3'},
  {'icon': iconImage, 'title': 'Добились Чего Хотели', 'file': '../../../../../../../../F:/MUSIK/Жванецкий/Добились чего хотели.mp3'},
  {'icon': iconImage, 'title': 'Жванецкий', 'file': '../../../../../../../../F:/MUSIK/Жванецкий/Жванецкий.mp3'},
  {'icon': iconImage, 'title': 'Интервью', 'file': '../../../../../../../../F:/MUSIK/Жванецкий/Интервью.mp3'},
  {'icon': iconImage, 'title': 'Начальник Транспортного Цеха', 'file': '../../../../../../../../F:/MUSIK/Жванецкий/Начальник транспортного цеха.MP3'},
  {'icon': iconImage, 'title': 'Перекличка', 'file': '../../../../../../../../F:/MUSIK/Жванецкий/Перекличка.mp3'},
  {'icon': iconImage, 'title': 'Рассказ Тети Клары', 'file': '../../../../../../../../F:/MUSIK/Жванецкий/Рассказ тети Клары.mp3'},
  {'icon': iconImage, 'title': 'Расстройство', 'file': '../../../../../../../../F:/MUSIK/Жванецкий/Расстройство.mp3'},
  {'icon': iconImage, 'title': 'Стили Спора', 'file': '../../../../../../../../F:/MUSIK/Жванецкий/Стили спора.mp3'},
  {'icon': iconImage, 'title': 'Сцена В Метро', 'file': '../../../../../../../../F:/MUSIK/Жванецкий/Сцена в Метро.mp3'},
  {'icon': iconImage, 'title': 'Там Хорошо Где Нас Нет', 'file': '../../../../../../../../F:/MUSIK/Жванецкий/Там хорошо где нас нет.mp3'},
]);
})

document.getElementById('земфира').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Webgirl', 'file': '../../../../../../../../F:/MUSIK/Земфира/2002 - Четырнадцать недель тишины/Webgirl.mp3'},
  {'icon': iconImage, 'title': 'Аривидерчи', 'file': '../../../../../../../../F:/MUSIK/Земфира/1999 - Zемфира/Аривидерчи.mp3'},
  {'icon': iconImage, 'title': 'Бесконечность', 'file': '../../../../../../../../F:/MUSIK/Земфира/2002 - Четырнадцать недель тишины/Бесконечность.mp3'},
  {'icon': iconImage, 'title': 'До Свидания', 'file': '../../../../../../../../F:/MUSIK/Земфира/1999 - До свидания/До свидания.mp3'},
  {'icon': iconImage, 'title': 'Искала', 'file': '../../../../../../../../F:/MUSIK/Земфира/2000 - Прости меня моя любовь/Искала.mp3'},
  {'icon': iconImage, 'title': 'Прости Меня Моя Любовь', 'file': '../../../../../../../../F:/MUSIK/Земфира/2000 - Прости меня моя любовь/Прости меня моя любовь.mp3'},
  {'icon': iconImage, 'title': 'Хочешь', 'file': '../../../../../../../../F:/MUSIK/Земфира/2000 - Прости меня моя любовь/Хочешь.mp3'},
]);
})

document.getElementById('и.корнелюк').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Билет На Балет', 'file': '../../../../../../../../F:/MUSIK/И. Корнелюк/1989 - Билет на балет/Билет на балет.mp3'},
  {'icon': iconImage, 'title': 'Будем Танцевать', 'file': '../../../../../../../../F:/MUSIK/И. Корнелюк/1990 - Подожди/Будем танцевать.mp3'},
  {'icon': iconImage, 'title': 'Возвращайся!', 'file': '../../../../../../../../F:/MUSIK/И. Корнелюк/1989 - Билет на балет/Возвращайся!.mp3'},
  {'icon': iconImage, 'title': 'Город Которого Нет', 'file': '../../../../../../../../F:/MUSIK/И. Корнелюк/2001 - Бандитский Петербург/Город, которого нет.mp3'},
  {'icon': iconImage, 'title': 'Дожди', 'file': '../../../../../../../../F:/MUSIK/И. Корнелюк/1990 - Подожди/Дожди.mp3'},
  {'icon': iconImage, 'title': 'Маленький Дом', 'file': '../../../../../../../../F:/MUSIK/И. Корнелюк/1990 - Подожди/Маленький дом.mp3'},
  {'icon': iconImage, 'title': 'Мало Ли', 'file': '../../../../../../../../F:/MUSIK/И. Корнелюк/1989 - Билет на балет/Мало ли.mp3'},
  {'icon': iconImage, 'title': 'Месяц Май', 'file': '../../../../../../../../F:/MUSIK/И. Корнелюк/1990 - Подожди/Месяц май.mp3'},
  {'icon': iconImage, 'title': 'Пора Домой', 'file': '../../../../../../../../F:/MUSIK/И. Корнелюк/2001 - Любимые песни/Пора домой.mp3'},
]);
})

document.getElementById('кино').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Алюминиевые Огурцы', 'file': '../../../../../../../../F:/MUSIK/КИНО/1982 - 45/Алюминиевые Огурцы.mp3'},
  {'icon': iconImage, 'title': 'В Наших Глазах', 'file': '../../../../../../../../F:/MUSIK/КИНО/1988 - Группа крови/В наших глазах.mp3'},
  {'icon': iconImage, 'title': 'Видели Ночь', 'file': '../../../../../../../../F:/MUSIK/КИНО/2000 - История этого мира/Видели ночь.mp3'},
  {'icon': iconImage, 'title': 'Война', 'file': '../../../../../../../../F:/MUSIK/КИНО/1989 - Последний герой/Война.mp3'},
  {'icon': iconImage, 'title': 'Восьмиклассница', 'file': '../../../../../../../../F:/MUSIK/КИНО/1987 - Aкустический концерт/Восьмиклассница.mp3'},
  {'icon': iconImage, 'title': 'Генерал', 'file': '../../../../../../../../F:/MUSIK/КИНО/1987 - Aкустический концерт/Генерал.mp3'},
  {'icon': iconImage, 'title': 'Группа Крови', 'file': '../../../../../../../../F:/MUSIK/КИНО/2000 - История этого мира/Группа крови.mp3'},
  {'icon': iconImage, 'title': 'Дальше Действовать Будем Мы', 'file': '../../../../../../../../F:/MUSIK/КИНО/1988 - Группа крови/Дальше действовать будем мы.mp3'},
  {'icon': iconImage, 'title': 'Дождь Для Нас', 'file': '../../../../../../../../F:/MUSIK/КИНО/1983 - 46/Дождь для нас.mp3'},
  {'icon': iconImage, 'title': 'Закрой За Мной Дверь Я Ухожу', 'file': '../../../../../../../../F:/MUSIK/КИНО/1988 - Группа крови/Закрой за мной дверь, я ухожу.mp3'},
  {'icon': iconImage, 'title': 'Звезда', 'file': '../../../../../../../../F:/MUSIK/КИНО/1990 - Черный альбом/Звезда.mp3'},
  {'icon': iconImage, 'title': 'Звезда По Имени Солнце', 'file': '../../../../../../../../F:/MUSIK/КИНО/1989 - Звезда по имени Солнце/Звезда по имени Солнце.MP3'},
  {'icon': iconImage, 'title': 'Каждую Ночь', 'file': '../../../../../../../../F:/MUSIK/КИНО/1984 - Начальник камчатки/Каждую ночь.mp3'},
  {'icon': iconImage, 'title': 'Когда Твоя Девушка Больна', 'file': '../../../../../../../../F:/MUSIK/КИНО/1990 - Черный альбом/Когда твоя девушка больна.mp3'},
  {'icon': iconImage, 'title': 'Кончится Лето', 'file': '../../../../../../../../F:/MUSIK/КИНО/2000 - История этого мира/Кончится лето.mp3'},
  {'icon': iconImage, 'title': 'Красно Желтые Дни', 'file': '../../../../../../../../F:/MUSIK/КИНО/1990 - Черный альбом/Красно-желтые дни.mp3'},
  {'icon': iconImage, 'title': 'Кукушка', 'file': '../../../../../../../../F:/MUSIK/КИНО/2000 - История этого мира/Кукушка.mp3'},
  {'icon': iconImage, 'title': 'Легенда', 'file': '../../../../../../../../F:/MUSIK/КИНО/1988 - Группа крови/Легенда.mp3'},
  {'icon': iconImage, 'title': 'Мама Анархия', 'file': '../../../../../../../../F:/MUSIK/КИНО/1987 - Aкустический концерт/Мама Анархия.mp3'},
  {'icon': iconImage, 'title': 'Место Для Шага Вперед', 'file': '../../../../../../../../F:/MUSIK/КИНО/1989 - Звезда по имени Солнце/Место для шага вперед.mp3'},
  {'icon': iconImage, 'title': 'Музыка Волн', 'file': '../../../../../../../../F:/MUSIK/КИНО/1987 - Aкустический концерт/Музыка волн.mp3'},
  {'icon': iconImage, 'title': 'Муравейник', 'file': '../../../../../../../../F:/MUSIK/КИНО/1990 - Черный альбом/Муравейник.mp3'},
  {'icon': iconImage, 'title': 'Пачка Сигарет', 'file': '../../../../../../../../F:/MUSIK/КИНО/2000 - История этого мира/Пачка сигарет.mp3'},
  {'icon': iconImage, 'title': 'Перемен', 'file': '../../../../../../../../F:/MUSIK/КИНО/2000 - История этого мира/Перемен.mp3'},
  {'icon': iconImage, 'title': 'Песня Без Слов', 'file': '../../../../../../../../F:/MUSIK/КИНО/2000 - История этого мира/Песня без слов.mp3'},
  {'icon': iconImage, 'title': 'Печаль', 'file': '../../../../../../../../F:/MUSIK/КИНО/2000 - История этого мира/Печаль.mp3'},
  {'icon': iconImage, 'title': 'Последний Герой', 'file': '../../../../../../../../F:/MUSIK/КИНО/1989 - Последний герой/Последний герой.mp3'},
  {'icon': iconImage, 'title': 'Следи За Собой', 'file': '../../../../../../../../F:/MUSIK/КИНО/2000 - История этого мира/Следи за собой.mp3'},
  {'icon': iconImage, 'title': 'Спокойная Ночь', 'file': '../../../../../../../../F:/MUSIK/КИНО/2000 - История этого мира/Спокойная ночь.mp3'},
  {'icon': iconImage, 'title': 'Стук', 'file': '../../../../../../../../F:/MUSIK/КИНО/1989 - Звезда по имени Солнце/Стук.mp3'},
  {'icon': iconImage, 'title': 'Троллейбус', 'file': '../../../../../../../../F:/MUSIK/КИНО/2000 - История этого мира/Троллейбус.mp3'},
]);
})

document.getElementById('клипы').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'A Gift Of A Thistle', 'file': '../../../../../../../../F:/MUSIK/Клипы/A Gift of a Thistle.mp4'},
  {'icon': iconImage, 'title': 'Adiemus', 'file': '../../../../../../../../F:/MUSIK/Клипы/Adiemus.mp4'},
  {'icon': iconImage, 'title': 'Agnus Dei', 'file': '../../../../../../../../F:/MUSIK/Клипы/Agnus Dei.mp4'},
  {'icon': iconImage, 'title': 'All Star', 'file': '../../../../../../../../F:/MUSIK/Клипы/All Star.mp4'},
  {'icon': iconImage, 'title': 'And We Run', 'file': '../../../../../../../../F:/MUSIK/Клипы/And We Run.mp4'},
  {'icon': iconImage, 'title': 'At The Beginning', 'file': '../../../../../../../../F:/MUSIK/Клипы/At The Beginning.mp4'},
  {'icon': iconImage, 'title': 'Babys On Fire', 'file': '../../../../../../../../F:/MUSIK/Клипы/BABY%27S ON FIRE.mp4'},
  {'icon': iconImage, 'title': 'Bamboleo', 'file': '../../../../../../../../F:/MUSIK/Клипы/Bamboleo.mp4'},
  {'icon': iconImage, 'title': 'Bang', 'file': '../../../../../../../../F:/MUSIK/Клипы/Bang.mp4'},
  {'icon': iconImage, 'title': 'Blame Ft John Newman', 'file': '../../../../../../../../F:/MUSIK/Клипы/Blame ft. John Newman.mp4'},
  {'icon': iconImage, 'title': 'Braveheart Song', 'file': '../../../../../../../../F:/MUSIK/Клипы/Braveheart song.mp4'},
  {'icon': iconImage, 'title': 'Burn', 'file': '../../../../../../../../F:/MUSIK/Клипы/Burn.mp4'},
  {'icon': iconImage, 'title': 'Cancion Del Mariachi', 'file': '../../../../../../../../F:/MUSIK/Клипы/Cancion del Mariachi.mp4'},
  {'icon': iconImage, 'title': 'Cant Remember To Forget You', 'file': '../../../../../../../../F:/MUSIK/Клипы/Can%27t Remember to Forget You.mp4'},
  {'icon': iconImage, 'title': 'Chandelier', 'file': '../../../../../../../../F:/MUSIK/Клипы/Chandelier.mp4'},
  {'icon': iconImage, 'title': 'Changed The Way You Kiss Me', 'file': '../../../../../../../../F:/MUSIK/Клипы/Changed The Way You Kiss Me.mp4'},
  {'icon': iconImage, 'title': 'Chihuahua', 'file': '../../../../../../../../F:/MUSIK/Клипы/Chihuahua.mp4'},
  {'icon': iconImage, 'title': 'Circle Of Life', 'file': '../../../../../../../../F:/MUSIK/Клипы/Circle of Life.mp4'},
  {'icon': iconImage, 'title': 'Color Of The Night', 'file': '../../../../../../../../F:/MUSIK/Клипы/Color Of The Night.mp4'},
  {'icon': iconImage, 'title': 'Confide In Me', 'file': '../../../../../../../../F:/MUSIK/Клипы/Confide In Me.mp4'},
  {'icon': iconImage, 'title': 'Conquest Of Paradise', 'file': '../../../../../../../../F:/MUSIK/Клипы/Conquest of Paradise.mp4'},
  {'icon': iconImage, 'title': 'Cracking The Russian Codes', 'file': '../../../../../../../../F:/MUSIK/Клипы/Cracking The Russian Codes.mp4'},
  {'icon': iconImage, 'title': 'Crash! Boom! Bang!', 'file': '../../../../../../../../F:/MUSIK/Клипы/Crash! Boom! Bang!.mp4'},
  {'icon': iconImage, 'title': 'Désenchantée', 'file': '../../../../../../../../F:/MUSIK/Клипы/Désenchantée.mp4'},
  {'icon': iconImage, 'title': 'Desert Rose', 'file': '../../../../../../../../F:/MUSIK/Клипы/Desert Rose.mp4'},
  {'icon': iconImage, 'title': 'Diamonds', 'file': '../../../../../../../../F:/MUSIK/Клипы/Diamonds.mp4'},
  {'icon': iconImage, 'title': 'Dont Dream Its Over', 'file': '../../../../../../../../F:/MUSIK/Клипы/Don%27t Dream It%27s Over.mp4'},
  {'icon': iconImage, 'title': 'Drinking From The Bottle Ft Tinie Tempah', 'file': '../../../../../../../../F:/MUSIK/Клипы/Drinking from the Bottle ft. Tinie Tempah.mp4'},
  {'icon': iconImage, 'title': 'Dup Step', 'file': '../../../../../../../../F:/MUSIK/Клипы/Dup Step.mp4'},
  {'icon': iconImage, 'title': 'Dust In The Wind', 'file': '../../../../../../../../F:/MUSIK/Клипы/Dust In The Wind.mp4'},
  {'icon': iconImage, 'title': 'Eagleheart', 'file': '../../../../../../../../F:/MUSIK/Клипы/Eagleheart.mp4'},
  {'icon': iconImage, 'title': 'Empire', 'file': '../../../../../../../../F:/MUSIK/Клипы/Empire.mp4'},
  {'icon': iconImage, 'title': 'Escala Palladio', 'file': '../../../../../../../../F:/MUSIK/Клипы/Escala - Palladio.mp4'},
  {'icon': iconImage, 'title': 'Everybody Wants To Rule The World', 'file': '../../../../../../../../F:/MUSIK/Клипы/Everybody Wants to Rule the World.mp4'},
  {'icon': iconImage, 'title': 'Feel The Light', 'file': '../../../../../../../../F:/MUSIK/Клипы/Feel The Light.mp4'},
  {'icon': iconImage, 'title': 'Felicita', 'file': '../../../../../../../../F:/MUSIK/Клипы/Felicita.mp4'},
  {'icon': iconImage, 'title': 'Fighter', 'file': '../../../../../../../../F:/MUSIK/Клипы/Fighter.mp4'},
  {'icon': iconImage, 'title': 'Fleur Du Mal', 'file': '../../../../../../../../F:/MUSIK/Клипы/Fleur du Mal.mp4'},
  {'icon': iconImage, 'title': 'Fly On The Wings Of Love', 'file': '../../../../../../../../F:/MUSIK/Клипы/Fly on the wings of love.mp4'},
  {'icon': iconImage, 'title': 'Fragile', 'file': '../../../../../../../../F:/MUSIK/Клипы/Fragile.mp4'},
  {'icon': iconImage, 'title': 'Frozen', 'file': '../../../../../../../../F:/MUSIK/Клипы/Frozen.mp4'},
  {'icon': iconImage, 'title': 'Get A Haircut', 'file': '../../../../../../../../F:/MUSIK/Клипы/Get A Haircut.mp4'},
  {'icon': iconImage, 'title': 'Heart Of A Coward', 'file': '../../../../../../../../F:/MUSIK/Клипы/3/Heart of a Coward.mp4'},
  {'icon': iconImage, 'title': 'Heaven And Hell', 'file': '../../../../../../../../F:/MUSIK/Клипы/Heaven and Hell.mp4'},
  {'icon': iconImage, 'title': 'Hey Mama', 'file': '../../../../../../../../F:/MUSIK/Клипы/Hey Mama.mp4'},
  {'icon': iconImage, 'title': 'How Do You Do!', 'file': '../../../../../../../../F:/MUSIK/Клипы/How Do You Do!.mp4'},
  {'icon': iconImage, 'title': 'I Believe In Love', 'file': '../../../../../../../../F:/MUSIK/Клипы/I Believe in Love.mp4'},
  {'icon': iconImage, 'title': 'I Saw You Dancing', 'file': '../../../../../../../../F:/MUSIK/Клипы/I Saw You Dancing.mp4'},
  {'icon': iconImage, 'title': 'I Will Always Love You', 'file': '../../../../../../../../F:/MUSIK/Клипы/I Will Always Love You.mp4'},
  {'icon': iconImage, 'title': 'If You Leave Me Now', 'file': '../../../../../../../../F:/MUSIK/Клипы/If You Leave Me Now.mp4'},
  {'icon': iconImage, 'title': 'Iko Iko', 'file': '../../../../../../../../F:/MUSIK/Клипы/Iko Iko.mp4'},
  {'icon': iconImage, 'title': 'In Hell Ill Be In Good Company', 'file': '../../../../../../../../F:/MUSIK/Клипы/In Hell I%27ll Be In Good Company.webm'},
  {'icon': iconImage, 'title': 'In The Death Car', 'file': '../../../../../../../../F:/MUSIK/Клипы/In The Death Car.mp4'},
  {'icon': iconImage, 'title': 'In The Summertime', 'file': '../../../../../../../../F:/MUSIK/Клипы/3/In The Summertime.mp4'},
  {'icon': iconImage, 'title': 'Joe Le Taxi France 1987', 'file': '../../../../../../../../F:/MUSIK/Клипы/Joe Le Taxi France 1987.mp4'},
  {'icon': iconImage, 'title': 'Join Me In Death', 'file': '../../../../../../../../F:/MUSIK/Клипы/Join Me In Death.mp4'},
  {'icon': iconImage, 'title': 'Layla', 'file': '../../../../../../../../F:/MUSIK/Клипы/Layla.mp4'},
  {'icon': iconImage, 'title': 'Let It Snow!let It Snow!let It Snow!', 'file': '../../../../../../../../F:/MUSIK/Клипы/Let It Snow!Let It Snow!Let It Snow!.mp4'},
  {'icon': iconImage, 'title': 'Limbo', 'file': '../../../../../../../../F:/MUSIK/Клипы/Limbo.webm'},
  {'icon': iconImage, 'title': 'Livin La Vida Loca', 'file': '../../../../../../../../F:/MUSIK/Клипы/Livin%27 La Vida Loca.mp4'},
  {'icon': iconImage, 'title': 'Looking For The Summer', 'file': '../../../../../../../../F:/MUSIK/Клипы/Looking For The Summer.mp4'},
  {'icon': iconImage, 'title': 'Love Me Like You Do', 'file': '../../../../../../../../F:/MUSIK/Клипы/Love Me Like You Do .mp4'},
  {'icon': iconImage, 'title': 'Love Me Like You Do', 'file': '../../../../../../../../F:/MUSIK/Клипы/Love Me Like You Do.mp4'},
  {'icon': iconImage, 'title': 'Maria Magdalena 1985', 'file': '../../../../../../../../F:/MUSIK/Клипы/3/Maria Magdalena 1985.mp4'},
  {'icon': iconImage, 'title': 'Master Of The Wind', 'file': '../../../../../../../../F:/MUSIK/Клипы/Master of The Wind.mp4'},
  {'icon': iconImage, 'title': 'Mon Mec A Moi', 'file': '../../../../../../../../F:/MUSIK/Клипы/Mon Mec a Moi.mp4'},
  {'icon': iconImage, 'title': 'My Darkest Days', 'file': '../../../../../../../../F:/MUSIK/Клипы/My Darkest Days.mp4'},
  {'icon': iconImage, 'title': 'My Name Is Lincoln', 'file': '../../../../../../../../F:/MUSIK/Клипы/My Name Is Lincoln.mp4'},
  {'icon': iconImage, 'title': 'Nagano Butovo', 'file': '../../../../../../../../F:/MUSIK/Клипы/3/nagano_-_butovo.mp3'},
  {'icon': iconImage, 'title': 'Now We Are Free', 'file': '../../../../../../../../F:/MUSIK/Клипы/Now We Are Free.mp4'},
  {'icon': iconImage, 'title': 'Ode To My Family', 'file': '../../../../../../../../F:/MUSIK/Клипы/Ode To My Family.mp4'},
  {'icon': iconImage, 'title': 'Once Upon A December', 'file': '../../../../../../../../F:/MUSIK/Клипы/Once Upon A December.mp4'},
  {'icon': iconImage, 'title': 'Once Upon A Time In The West', 'file': '../../../../../../../../F:/MUSIK/Клипы/3/Once Upon a Time in the West.mp4'},
  {'icon': iconImage, 'title': 'One Way Ticket 1978 (high Quality)', 'file': '../../../../../../../../F:/MUSIK/Клипы/One Way Ticket 1978 (High Quality).mp4'},
  {'icon': iconImage, 'title': 'Pardonne Moi Ce Caprice Denfant', 'file': '../../../../../../../../F:/MUSIK/Клипы/Pardonne-moi ce caprice d%27enfant.mp4'},
  {'icon': iconImage, 'title': 'Personal Jesus', 'file': '../../../../../../../../F:/MUSIK/Клипы/Personal Jesus.mp4'},
  {'icon': iconImage, 'title': 'Poker Face', 'file': '../../../../../../../../F:/MUSIK/Клипы/Poker Face.mp4'},
  {'icon': iconImage, 'title': 'Por Una Cabeza', 'file': '../../../../../../../../F:/MUSIK/Клипы/Por una cabeza.mp4'},
  {'icon': iconImage, 'title': 'Sail', 'file': '../../../../../../../../F:/MUSIK/Клипы/SAIL.mp4'},
  {'icon': iconImage, 'title': 'Scars', 'file': '../../../../../../../../F:/MUSIK/Клипы/Scars.mp4'},
  {'icon': iconImage, 'title': 'Scatman', 'file': '../../../../../../../../F:/MUSIK/Клипы/Scatman.mp4'},
  {'icon': iconImage, 'title': 'Sixteen Tons', 'file': '../../../../../../../../F:/MUSIK/Клипы/Sixteen Tons.mp4'},
  {'icon': iconImage, 'title': 'Snoop Dogg Smoke', 'file': '../../../../../../../../F:/MUSIK/Клипы/3/Snoop dogg Smoke.mp4'},
  {'icon': iconImage, 'title': 'Somebody That I Used To Know', 'file': '../../../../../../../../F:/MUSIK/Клипы/Somebody That I Used To Know.mp4'},
  {'icon': iconImage, 'title': 'Somebody To Love', 'file': '../../../../../../../../F:/MUSIK/Клипы/Somebody To Love.mp4'},
  {'icon': iconImage, 'title': 'Soul Survivor 2003', 'file': '../../../../../../../../F:/MUSIK/Клипы/Soul Survivor 2003.mp4'},
  {'icon': iconImage, 'title': 'Still Loving You', 'file': '../../../../../../../../F:/MUSIK/Клипы/Still Loving You.mp4'},
  {'icon': iconImage, 'title': 'Strangelove', 'file': '../../../../../../../../F:/MUSIK/Клипы/Strangelove .mp4'},
  {'icon': iconImage, 'title': 'Summer', 'file': '../../../../../../../../F:/MUSIK/Клипы/Summer.mp4'},
  {'icon': iconImage, 'title': 'Summer Time Sadness', 'file': '../../../../../../../../F:/MUSIK/Клипы/Summer time Sadness.mp4'},
  {'icon': iconImage, 'title': 'Supreme', 'file': '../../../../../../../../F:/MUSIK/Клипы/Supreme.mp4'},
  {'icon': iconImage, 'title': 'Surfin Bird', 'file': '../../../../../../../../F:/MUSIK/Клипы/3/Surfin Bird.mp4'},
  {'icon': iconImage, 'title': 'Surfin Bird (family Guy)', 'file': '../../../../../../../../F:/MUSIK/Клипы/3/Surfin Bird (Family Guy).mp4'},
  {'icon': iconImage, 'title': 'Syberian', 'file': '../../../../../../../../F:/MUSIK/Клипы/Syberian.mp4'},
  {'icon': iconImage, 'title': 'The Godfather Theme', 'file': '../../../../../../../../F:/MUSIK/Клипы/3/The Godfather Theme.mp4'},
  {'icon': iconImage, 'title': 'The Good The Bad And The Ugly Theme • Ennio Morricone', 'file': '../../../../../../../../F:/MUSIK/Клипы/3/The Good, the Bad and the Ugly Theme • Ennio Morricone.mp4'},
  {'icon': iconImage, 'title': 'The Lonely Shepherd', 'file': '../../../../../../../../F:/MUSIK/Клипы/The Lonely Shepherd.mp4'},
  {'icon': iconImage, 'title': 'The Memory Remains', 'file': '../../../../../../../../F:/MUSIK/Клипы/The Memory Remains.mp4'},
  {'icon': iconImage, 'title': 'To Die For', 'file': '../../../../../../../../F:/MUSIK/Клипы/To Die For.mp4'},
  {'icon': iconImage, 'title': 'Towards The Sun', 'file': '../../../../../../../../F:/MUSIK/Клипы/Towards The Sun.mp4'},
  {'icon': iconImage, 'title': 'Try Everything', 'file': '../../../../../../../../F:/MUSIK/Клипы/Try Everything.mp4'},
  {'icon': iconImage, 'title': 'Une Histoire Damour (love Story)', 'file': '../../../../../../../../F:/MUSIK/Клипы/Une histoire d%27amour (Love story).mp4'},
  {'icon': iconImage, 'title': 'Valkyrie', 'file': '../../../../../../../../F:/MUSIK/Клипы/Valkyrie.mp4'},
  {'icon': iconImage, 'title': 'Where The Wild Roses Grow', 'file': '../../../../../../../../F:/MUSIK/Клипы/Where The Wild Roses Grow.mp4'},
  {'icon': iconImage, 'title': 'Wrong', 'file': '../../../../../../../../F:/MUSIK/Клипы/Wrong.mp4'},
  {'icon': iconImage, 'title': 'Young And Beautiful', 'file': '../../../../../../../../F:/MUSIK/Клипы/Young and Beautiful.mp4'},
  {'icon': iconImage, 'title': 'Zombie', 'file': '../../../../../../../../F:/MUSIK/Клипы/Zombie.mp4'},
  {'icon': iconImage, 'title': 'А Мы Любили', 'file': '../../../../../../../../F:/MUSIK/Клипы/А мы любили.mp4'},
  {'icon': iconImage, 'title': 'Ализе', 'file': '../../../../../../../../F:/MUSIK/Клипы/АЛИЗЕ.mp4'},
  {'icon': iconImage, 'title': 'Ах Какая Невезуха Абсолютно Нету Слуха (новогодний Квартирник)', 'file': '../../../../../../../../F:/MUSIK/Клипы/3/Ах, какая невезуха, абсолютно нету слуха. (Новогодний Квартирник).mp4'},
  {'icon': iconImage, 'title': 'Белеет Мой Парус', 'file': '../../../../../../../../F:/MUSIK/Клипы/Белеет мой парус.mp4'},
  {'icon': iconImage, 'title': 'Верхом На Звезде', 'file': '../../../../../../../../F:/MUSIK/Клипы/Верхом на звезде.mp4'},
  {'icon': iconImage, 'title': 'Звенит Январская Вьюга', 'file': '../../../../../../../../F:/MUSIK/Клипы/3/Звенит январская вьюга.mp4'},
  {'icon': iconImage, 'title': 'Зож', 'file': '../../../../../../../../F:/MUSIK/Клипы/ЗОЖ.mp4'},
  {'icon': iconImage, 'title': 'Иду Курю', 'file': '../../../../../../../../F:/MUSIK/Клипы/Иду, курю.mp4'},
  {'icon': iconImage, 'title': 'Иерусалим 1998г', 'file': '../../../../../../../../F:/MUSIK/Клипы/3/Иерусалим 1998г.mp4'},
  {'icon': iconImage, 'title': 'Клубняк', 'file': '../../../../../../../../F:/MUSIK/Клипы/3/Клубняк.mp4'},
  {'icon': iconImage, 'title': 'Кончится Лето', 'file': '../../../../../../../../F:/MUSIK/Клипы/Кончится лето.mp4'},
  {'icon': iconImage, 'title': 'Кукла Колдуна', 'file': '../../../../../../../../F:/MUSIK/Клипы/Кукла колдуна.mp4'},
  {'icon': iconImage, 'title': 'Кукла Колдунаа', 'file': '../../../../../../../../F:/MUSIK/Клипы/Кукла Колдунаа.mp4'},
  {'icon': iconImage, 'title': 'Лучший Танцор Дабстеп В Мире! Levitate Dubstep!', 'file': '../../../../../../../../F:/MUSIK/Клипы/3/Лучший танцор Дабстеп в мире! LEVITATE DUBSTEP!.mp4'},
  {'icon': iconImage, 'title': 'Матвей Блантер – Футбольный Марш (www Petamusic Ru)', 'file': '../../../../../../../../F:/MUSIK/Клипы/3/Матвей Блантер – Футбольный марш (www.petamusic.ru).mp3'},
  {'icon': iconImage, 'title': 'Метель Тройка ', 'file': '../../../../../../../../F:/MUSIK/Клипы/3/Метель%27 %27Тройка%27..mp4'},
  {'icon': iconImage, 'title': 'Мой Ласковый И Нежный Зверь', 'file': '../../../../../../../../F:/MUSIK/Клипы/Мой ласковый и нежный зверь.mp4'},
  {'icon': iconImage, 'title': 'Мы Как Трепетные Птицы', 'file': '../../../../../../../../F:/MUSIK/Клипы/Мы, как трепетные птицы.mp4'},
  {'icon': iconImage, 'title': 'Обама Материт Порошенко И Яценюка (прикольная Озвучка ) Копия', 'file': '../../../../../../../../F:/MUSIK/Клипы/3/Обама материт Порошенко и Яценюка (прикольная озвучка ) - копия.mp4'},
  {'icon': iconImage, 'title': 'Оркестр Ссср – Футбольный Марш (www Petamusic Ru)', 'file': '../../../../../../../../F:/MUSIK/Клипы/3/Оркестр СССР – Футбольный марш (www.petamusic.ru).mp3'},
  {'icon': iconImage, 'title': 'От Кореи До Карелии', 'file': '../../../../../../../../F:/MUSIK/Клипы/От Кореи до Карелии.mp4'},
  {'icon': iconImage, 'title': 'Позови Меня С Собой', 'file': '../../../../../../../../F:/MUSIK/Клипы/Позови меня с собой.mp4'},
  {'icon': iconImage, 'title': 'Потму Что Гладиолус', 'file': '../../../../../../../../F:/MUSIK/Клипы/3/Потму что гладиолус.mp4'},
  {'icon': iconImage, 'title': 'Прогулки По Воде Ddt', 'file': '../../../../../../../../F:/MUSIK/Клипы/Прогулки по воде DDT.mp4'},
  {'icon': iconImage, 'title': 'Разговор Со Счастьем', 'file': '../../../../../../../../F:/MUSIK/Клипы/Разговор со счастьем.mp4'},
  {'icon': iconImage, 'title': 'Спокойная Ночь', 'file': '../../../../../../../../F:/MUSIK/Клипы/СПОКОЙНАЯ НОЧЬ.mp4'},
  {'icon': iconImage, 'title': 'Там Де Нас Нема (official Video)', 'file': '../../../../../../../../F:/MUSIK/Клипы/3/Там, де нас нема (official video).mp4'},
  {'icon': iconImage, 'title': 'Танго Смерти Оркестр Концлагеря Яновский', 'file': '../../../../../../../../F:/MUSIK/Клипы/3/Танго смерти - оркестр концлагеря %27Яновский%27.mp4'},
  {'icon': iconImage, 'title': 'Тыж Программист', 'file': '../../../../../../../../F:/MUSIK/Клипы/3/Тыж программист.mp4'},
  {'icon': iconImage, 'title': 'Человек И Кошка', 'file': '../../../../../../../../F:/MUSIK/Клипы/Человек и Кошка.mp4'},
  {'icon': iconImage, 'title': 'Я Зажег В Церквях Все Свечи', 'file': '../../../../../../../../F:/MUSIK/Клипы/Я зажег в церквях все свечи.mp4'},
]);
})

document.getElementById('корольишут').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Воспоминания О Былой Любви', 'file': '../../../../../../../../F:/MUSIK/Король и Шут/2001 - Как в старой сказке/Воспоминания о былой любви.mp3'},
  {'icon': iconImage, 'title': 'Охотник', 'file': '../../../../../../../../F:/MUSIK/Король и Шут/1996 - Король и Шут/Охотник.mp3'},
  {'icon': iconImage, 'title': 'Прерванная Любовь Или Арбузная Корка', 'file': '../../../../../../../../F:/MUSIK/Король и Шут/1999 - Акустический Альбом/Прерванная любовь или Арбузная корка.mp3'},
  {'icon': iconImage, 'title': 'Проклятый Старый Дом', 'file': '../../../../../../../../F:/MUSIK/Король и Шут/2001 - Как в старой сказке/Проклятый старый дом.mp3'},
  {'icon': iconImage, 'title': 'Прыгну Со Скалы', 'file': '../../../../../../../../F:/MUSIK/Король и Шут/1999 - Акустический Альбом/Прыгну со скалы.mp3'},
]);
})

document.getElementById('крысишмындра').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Бродяга', 'file': '../../../../../../../../F:/MUSIK/Крыс и Шмындра/Концерт в ДК Маяк - 2000/Бродяга.mp3'},
  {'icon': iconImage, 'title': 'Вей Мой Ветер', 'file': '../../../../../../../../F:/MUSIK/Крыс и Шмындра/Дорога на Калланмор - 1999/Вей, Мой Ветер.mp3'},
  {'icon': iconImage, 'title': 'Женская Песня', 'file': '../../../../../../../../F:/MUSIK/Крыс и Шмындра/Дорога на Калланмор - 1999/Женская Песня.mp3'},
  {'icon': iconImage, 'title': 'Ирландцы', 'file': '../../../../../../../../F:/MUSIK/Крыс и Шмындра/Концерт в ДК Маяк - 2000/Ирландцы.mp3'},
  {'icon': iconImage, 'title': 'Коронах', 'file': '../../../../../../../../F:/MUSIK/Крыс и Шмындра/Дорога на Калланмор - 1999/Коронах.mp3'},
  {'icon': iconImage, 'title': 'Недаром С Гор Спустились', 'file': '../../../../../../../../F:/MUSIK/Крыс и Шмындра/Дорога на Калланмор - 1999/Недаром с Гор Спустились.mp3'},
  {'icon': iconImage, 'title': 'Романс', 'file': '../../../../../../../../F:/MUSIK/Крыс и Шмындра/Дорога на Калланмор - 1999/Романс.mp3'},
  {'icon': iconImage, 'title': 'Странники', 'file': '../../../../../../../../F:/MUSIK/Крыс и Шмындра/Дорога на Калланмор - 1999/Странники.mp3'},
  {'icon': iconImage, 'title': 'Трасса', 'file': '../../../../../../../../F:/MUSIK/Крыс и Шмындра/Дорога на Калланмор - 1999/Трасса.mp3'},
  {'icon': iconImage, 'title': 'Тростник', 'file': '../../../../../../../../F:/MUSIK/Крыс и Шмындра/Дорога на Калланмор - 1999/Тростник.mp3'},
]);
})

document.getElementById('кукрыниксы').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Движение', 'file': '../../../../../../../../F:/MUSIK/Кукрыниксы/2003 - Столкновение/Движение.mp3'},
  {'icon': iconImage, 'title': 'Дорога', 'file': '../../../../../../../../F:/MUSIK/Кукрыниксы/2002 - Раскрашенная Душа/Дорога.mp3'},
  {'icon': iconImage, 'title': 'Звезда', 'file': '../../../../../../../../F:/MUSIK/Кукрыниксы/2006 - Шаман/Звезда.mp3'},
  {'icon': iconImage, 'title': 'Кино', 'file': '../../../../../../../../F:/MUSIK/Кукрыниксы/2004 - Фаворит Солнца/Кино.mp3'},
  {'icon': iconImage, 'title': 'Кошмары', 'file': '../../../../../../../../F:/MUSIK/Кукрыниксы/2004 - Фаворит Солнца/Кошмары.mp3'},
  {'icon': iconImage, 'title': 'Серебряный Сентябрь', 'file': '../../../../../../../../F:/MUSIK/Кукрыниксы/2003 - Столкновение/Серебряный сентябрь.mp3'},
  {'icon': iconImage, 'title': 'Смех', 'file': '../../../../../../../../F:/MUSIK/Кукрыниксы/2001 - Кукрыниксы/Смех.mp3'},
  {'icon': iconImage, 'title': 'Уходящая В Ночь', 'file': '../../../../../../../../F:/MUSIK/Кукрыниксы/Уходящая в ночь.mp3'},
  {'icon': iconImage, 'title': 'Черная Невеста', 'file': '../../../../../../../../F:/MUSIK/Кукрыниксы/2003 - Столкновение/Черная невеста.mp3'},
  {'icon': iconImage, 'title': 'Это Не Беда', 'file': '../../../../../../../../F:/MUSIK/Кукрыниксы/2001 - Кукрыниксы/Это не беда.mp3'},
  {'icon': iconImage, 'title': 'Ясные Дни', 'file': '../../../../../../../../F:/MUSIK/Кукрыниксы/2003 - Столкновение/Ясные Дни.mp3'},
]);
})

document.getElementById('любэ').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Атас', 'file': '../../../../../../../../F:/MUSIK/Любэ/1991 - Атас/Атас.mp3'},
  {'icon': iconImage, 'title': 'Ветер Ветерок', 'file': '../../../../../../../../F:/MUSIK/Любэ/2000 - Полустаночки/Ветер-Ветерок.mp3'},
  {'icon': iconImage, 'title': 'Главное Что Есть Ты У Меня', 'file': '../../../../../../../../F:/MUSIK/Любэ/1996 - Комбат/Главное, что есть ты у меня.mp3'},
  {'icon': iconImage, 'title': 'Главное Что Есть Ты У Меня', 'file': '../../../../../../../../F:/MUSIK/Любэ/Главное, что есть ты у меня.mp4'},
  {'icon': iconImage, 'title': 'Давай Давай', 'file': '../../../../../../../../F:/MUSIK/Любэ/1992 - Кто сказал, что мы плохо жили/Давай давай.mp3'},
  {'icon': iconImage, 'title': 'Давай За ', 'file': '../../../../../../../../F:/MUSIK/Любэ/2002 - Давай за/Давай за....mp3'},
  {'icon': iconImage, 'title': 'Дед', 'file': '../../../../../../../../F:/MUSIK/Любэ/2000 - Полустаночки/Дед.mp3'},
  {'icon': iconImage, 'title': 'Дорога', 'file': '../../../../../../../../F:/MUSIK/Любэ/1994 - Зона Любэ/Дорога.mp3'},
  {'icon': iconImage, 'title': 'Дорога', 'file': '../../../../../../../../F:/MUSIK/Любэ/Дорога.mp4'},
  {'icon': iconImage, 'title': 'Комбат', 'file': '../../../../../../../../F:/MUSIK/Любэ/1996 - Комбат/Комбат.mp3'},
  {'icon': iconImage, 'title': 'Конь', 'file': '../../../../../../../../F:/MUSIK/Любэ/Конь.mp3'},
  {'icon': iconImage, 'title': 'Мент', 'file': '../../../../../../../../F:/MUSIK/Любэ/1997 - Песни о людях/Мент.mp3'},
  {'icon': iconImage, 'title': 'Опера', 'file': '../../../../../../../../F:/MUSIK/Любэ/2004 - Ребята нашего полка/Опера.mp3'},
  {'icon': iconImage, 'title': 'Позови Меня', 'file': '../../../../../../../../F:/MUSIK/Любэ/2000 - Полустаночки/Позови меня.mp3'},
  {'icon': iconImage, 'title': 'Позови Меня Тихо По Имени', 'file': '../../../../../../../../F:/MUSIK/Любэ/Позови, меня, тихо по имени.mp4'},
  {'icon': iconImage, 'title': 'Ребята С Нашего Двора', 'file': '../../../../../../../../F:/MUSIK/Любэ/1997 - Песни о людях/Ребята с нашего двора.mp3'},
  {'icon': iconImage, 'title': 'Река', 'file': '../../../../../../../../F:/MUSIK/Любэ/2002 - Давай за/Река.mp3'},
  {'icon': iconImage, 'title': 'Солдат', 'file': '../../../../../../../../F:/MUSIK/Любэ/2000 - Полустаночки/Солдат.mp3'},
  {'icon': iconImage, 'title': 'Спят Курганы Тёмные', 'file': '../../../../../../../../F:/MUSIK/Любэ/1996 - Комбат/Спят курганы тёмные.mp3'},
  {'icon': iconImage, 'title': 'Старые Друзья', 'file': '../../../../../../../../F:/MUSIK/Любэ/2000 - Полустаночки/Старые друзья.mp3'},
  {'icon': iconImage, 'title': 'Там За Туманами', 'file': '../../../../../../../../F:/MUSIK/Любэ/1997 - Песни о людях/Там за туманами.mp3'},
  {'icon': iconImage, 'title': 'Там За Туманами', 'file': '../../../../../../../../F:/MUSIK/Любэ/Там за туманами.mp4'},
  {'icon': iconImage, 'title': 'Тетя Доктор', 'file': '../../../../../../../../F:/MUSIK/Любэ/1991 - Атас/Тетя доктор.mp3'},
  {'icon': iconImage, 'title': 'Течет Река Волга', 'file': '../../../../../../../../F:/MUSIK/Любэ/1997 - Песни о людях/Течет река Волга.mp3'},
  {'icon': iconImage, 'title': 'Ты Неси Меня Река', 'file': '../../../../../../../../F:/MUSIK/Любэ/Ты неси меня река.mp4'},
  {'icon': iconImage, 'title': 'Шагом Марш', 'file': '../../../../../../../../F:/MUSIK/Любэ/1996 - Комбат/Шагом марш.mp3'},
]);
})

document.getElementById('м.магомаев').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Королева Красоты', 'file': '../../../../../../../../F:/MUSIK/М. Магомаев/2001 - Любовь Моя, Песня/Королева красоты.mp3'},
  {'icon': iconImage, 'title': 'Куплеты Эскамилио', 'file': '../../../../../../../../F:/MUSIK/М. Магомаев/2002 - Арии из опер/Куплеты Эскамилио.mp3'},
  {'icon': iconImage, 'title': 'Луч Солнца Золотого', 'file': '../../../../../../../../F:/MUSIK/М. Магомаев/Луч солнца золотого.mp3'},
  {'icon': iconImage, 'title': 'Лучший Город Земли', 'file': '../../../../../../../../F:/MUSIK/М. Магомаев/1995 - Благодарю тебя/Лучший город Земли.mp3'},
  {'icon': iconImage, 'title': 'Мелодия', 'file': '../../../../../../../../F:/MUSIK/М. Магомаев/1995 - Благодарю тебя/Мелодия.mp3'},
  {'icon': iconImage, 'title': 'Мелодия', 'file': '../../../../../../../../F:/MUSIK/М. Магомаев/1995 - С любовью к женщине/Мелодия.mp3'},
  {'icon': iconImage, 'title': 'Свадьба', 'file': '../../../../../../../../F:/MUSIK/М. Магомаев/1995 - Благодарю тебя/Свадьба.mp3'},
  {'icon': iconImage, 'title': 'Свадьба', 'file': '../../../../../../../../F:/MUSIK/М. Магомаев/2001 - Любовь Моя, Песня/Свадьба.mp3'},
  {'icon': iconImage, 'title': 'Чертово Колесо', 'file': '../../../../../../../../F:/MUSIK/М. Магомаев/1995 - Благодарю тебя/Чертово колесо.mp3'},
]);
})

document.getElementById('м.задорнов').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '[zadornov] 1', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/[zadornov] 1.mp3'},
  {'icon': iconImage, 'title': '[zadornov] 2', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/[zadornov] 2.mp3'},
  {'icon': iconImage, 'title': '[zadornov] 3', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/[zadornov] 3.mp3'},
  {'icon': iconImage, 'title': '03', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/03.MP3'},
  {'icon': iconImage, 'title': '04', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/04.MP3'},
  {'icon': iconImage, 'title': '05', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/05.MP3'},
  {'icon': iconImage, 'title': '06', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/06.MP3'},
  {'icon': iconImage, 'title': '07', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/07.MP3'},
  {'icon': iconImage, 'title': '08', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/08.MP3'},
  {'icon': iconImage, 'title': '09', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/09.MP3'},
  {'icon': iconImage, 'title': '10', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/10.MP3'},
  {'icon': iconImage, 'title': '12', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/12.MP3'},
  {'icon': iconImage, 'title': '13', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/13.MP3'},
  {'icon': iconImage, 'title': '14', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/14.MP3'},
  {'icon': iconImage, 'title': '15', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/15.MP3'},
  {'icon': iconImage, 'title': '16', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/16.MP3'},
  {'icon': iconImage, 'title': '17', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/17.MP3'},
  {'icon': iconImage, 'title': '18', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/18.MP3'},
  {'icon': iconImage, 'title': '22', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/22.MP3'},
  {'icon': iconImage, 'title': '23', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/23.MP3'},
  {'icon': iconImage, 'title': '24', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/24.MP3'},
  {'icon': iconImage, 'title': '25', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/25.MP3'},
  {'icon': iconImage, 'title': '26', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/26.MP3'},
  {'icon': iconImage, 'title': 'Calve', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Анекдоты/Траханый Берг/calve.mp3'},
  {'icon': iconImage, 'title': 'Gangubazz Bobm Birthday Party Part 1', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Gangubazz_BobM_Birthday_party_part_1.mp3'},
  {'icon': iconImage, 'title': 'Gangubazz Bobm Birthday Party Part 2', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Gangubazz_BobM_Birthday_party_part_2.mp3'},
  {'icon': iconImage, 'title': 'Gangubazz Bobm Birthday Party Part 3', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Gangubazz_BobM_Birthday_party_part_3.mp3'},
  {'icon': iconImage, 'title': 'Gangubazz Bobm Birthday Party Part 4', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Gangubazz_BobM_Birthday_party_part_4.mp3'},
  {'icon': iconImage, 'title': 'Michurin', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/michurin.mp3'},
  {'icon': iconImage, 'title': 'Zadorn05', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN05.MP3'},
  {'icon': iconImage, 'title': 'Zadorn06', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN06.MP3'},
  {'icon': iconImage, 'title': 'Zadorn07', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN07.MP3'},
  {'icon': iconImage, 'title': 'Zadorn08', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN08.MP3'},
  {'icon': iconImage, 'title': 'Zadorn09', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN09.MP3'},
  {'icon': iconImage, 'title': 'Zadorn10', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN10.MP3'},
  {'icon': iconImage, 'title': 'Zadorn11', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN11.MP3'},
  {'icon': iconImage, 'title': 'Zadorn12', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN12.MP3'},
  {'icon': iconImage, 'title': 'Zadorn13', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN13.MP3'},
  {'icon': iconImage, 'title': 'Zadorn14', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN14.MP3'},
  {'icon': iconImage, 'title': 'Zadorn15', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN15.MP3'},
  {'icon': iconImage, 'title': 'Zadorn16', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN16.MP3'},
  {'icon': iconImage, 'title': 'Zadorn17', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN17.MP3'},
  {'icon': iconImage, 'title': 'Zadorn18', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN18.MP3'},
  {'icon': iconImage, 'title': 'Zadorn19', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN19.MP3'},
  {'icon': iconImage, 'title': 'Zadorn20', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN20.MP3'},
  {'icon': iconImage, 'title': 'Zadorn21', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN21.MP3'},
  {'icon': iconImage, 'title': 'Zadorn22', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN22.MP3'},
  {'icon': iconImage, 'title': 'Zadorn23', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN23.MP3'},
  {'icon': iconImage, 'title': 'Zadorn24', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN24.MP3'},
  {'icon': iconImage, 'title': 'Zadorn25', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN25.MP3'},
  {'icon': iconImage, 'title': 'Zadorn26', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN26.MP3'},
  {'icon': iconImage, 'title': 'Zadorn27', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN27.MP3'},
  {'icon': iconImage, 'title': 'Zadorn28', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN28.MP3'},
  {'icon': iconImage, 'title': 'Zadorn29', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN29.MP3'},
  {'icon': iconImage, 'title': 'Zadorn30', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/ZADORN30.MP3'},
  {'icon': iconImage, 'title': 'А Бог Всеже Есть', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/А бог всеже есть.mp3'},
  {'icon': iconImage, 'title': 'Анекдоты Котовский На Арбате', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Анекдоты/Анекдоты  %27Котовский на Арбате%27.mp3'},
  {'icon': iconImage, 'title': 'Боги И Демоны Шата', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Боги и демоны шата.mp3'},
  {'icon': iconImage, 'title': 'Бригада', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Анекдоты/Траханый Берг/Бригада.mp3'},
  {'icon': iconImage, 'title': 'Буду Сказать Без Бумажки', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Буду сказать без бумажки.mp3'},
  {'icon': iconImage, 'title': 'Винокур', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Винокур.mp3'},
  {'icon': iconImage, 'title': 'Винокур(на Д Р У Л Измайлова)', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Винокур(На д.р у Л.Измайлова).mp3'},
  {'icon': iconImage, 'title': 'Вот Почему', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/вот почему.mp4'},
  {'icon': iconImage, 'title': 'Говно', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Говно.mp3'},
  {'icon': iconImage, 'title': 'да Здравствует То Благодаря Чему Мы Несмотря Ни На Что!', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/%27Да здравствует то, благодаря чему мы, несмотря ни на что!%27.mp3'},
  {'icon': iconImage, 'title': 'Дед Мороз', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Дед Мороз.mp3'},
  {'icon': iconImage, 'title': 'Джатака О Карме', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Джатака о Карме.mp3'},
  {'icon': iconImage, 'title': 'Джатака О Крокодиле', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Джатака о Крокодиле.mp3'},
  {'icon': iconImage, 'title': 'Джатака О Кшатрии Харикеше', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Джатака о кшатрии Харикеше.mp3'},
  {'icon': iconImage, 'title': 'Джатака О Сундуке', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Джатака о сундуке.mp3'},
  {'icon': iconImage, 'title': 'Джатака О Царевиче', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Джатака о царевиче.mp3'},
  {'icon': iconImage, 'title': 'Джатака Про Мудреца И Волка', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Джатака про мудреца и волка.mp3'},
  {'icon': iconImage, 'title': 'Джатака Про Мудрецв И Волка', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Джатака Про Мудрецв и Волка.mp3'},
  {'icon': iconImage, 'title': 'Задорнов', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Задорнов .mp3'},
  {'icon': iconImage, 'title': 'Задорнов', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Задорнов.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 0', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 0.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 1', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 1.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 2', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 2.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 3', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 3.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 4', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 4.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 5', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 5.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 6', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 6.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 7', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 7.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Викрам Битал 9', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Индийский Покойник - Викрам Битал 9.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Как Викрам Вывел Битала Из Леса', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Индийский Покойник - Как Викрам Вывел Битала из Леса.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Рассказ Ганэши', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Индийский Покойник - Рассказ Ганэши.mp3'},
  {'icon': iconImage, 'title': 'Индийский Покойник Что Случилось С Биталом', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Индийский Покойник - Что Случилось с Биталом.mp3'},
  {'icon': iconImage, 'title': 'Как Виджай Вручал Викраму Истинное Сокровище', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Как Виджай Вручал Викраму Истинное Сокровище.mp3'},
  {'icon': iconImage, 'title': 'Как Жисть', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Как жисть.mp3'},
  {'icon': iconImage, 'title': 'Королевство Сиджа', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Королевство Сиджа.mp3'},
  {'icon': iconImage, 'title': 'Крутая Мантра', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Крутая Мантра.mp3'},
  {'icon': iconImage, 'title': 'М 3', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/М.3.mp3'},
  {'icon': iconImage, 'title': 'М Задорнoв', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/М.Задорнoв.mp3'},
  {'icon': iconImage, 'title': 'М Задорно Египетские Ночи', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/М.Задорно-Египетские ночи.mp3'},
  {'icon': iconImage, 'title': 'М Задорнов', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/М.Задорнов.mp3'},
  {'icon': iconImage, 'title': 'М Задорнов(9 Вагон)', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/М.Задорнов(9 Вагон).mp3'},
  {'icon': iconImage, 'title': 'М Задорнов(tv)', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/М.Задорнов(TV).mp3'},
  {'icon': iconImage, 'title': 'М Задорнов(версаче)', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/М.Задорнов(Версаче).mp3'},
  {'icon': iconImage, 'title': 'М Задорнов(древня Запись)', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/М.Задорнов(Древня запись).mp3'},
  {'icon': iconImage, 'title': 'М Задорнов(питер)', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/М.Задорнов(Питер).mp3'},
  {'icon': iconImage, 'title': 'М Задорнов(праздники)', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/М.Задорнов(Праздники).mp3'},
  {'icon': iconImage, 'title': 'М Задорнов(про Нового Русского)', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/М.Задорнов(Про нового русского).mp3'},
  {'icon': iconImage, 'title': 'М Задорнов(ударница)', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/М.Задорнов(Ударница).mp3'},
  {'icon': iconImage, 'title': 'М Задорнов1', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/М.Задорнов1.mp3'},
  {'icon': iconImage, 'title': 'М Задорнов2', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/М.Задорнов2.mp3'},
  {'icon': iconImage, 'title': 'М Задорнов3', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/М.Задорнов3.mp3'},
  {'icon': iconImage, 'title': 'Матушка Змея Гудж', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Матушка Змея Гудж.mp3'},
  {'icon': iconImage, 'title': 'Михаил Задорнов', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Михаил Задорнов.mp4'},
  {'icon': iconImage, 'title': 'Михаил Задорновв', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Михаил Задорновв.mp4'},
  {'icon': iconImage, 'title': 'Мндийский Гашиш', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Мндийский Гашиш.mp3'},
  {'icon': iconImage, 'title': 'Морда Красная', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Морда красная.mp3'},
  {'icon': iconImage, 'title': 'Не Дайте Себе Засохнуть', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Не дайте себе засохнуть.mp3'},
  {'icon': iconImage, 'title': 'Не Для Tv', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Не для TV.mp3'},
  {'icon': iconImage, 'title': 'Неприличное', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Анекдоты/Траханый Берг/Неприличное.mp3'},
  {'icon': iconImage, 'title': 'Принцесса Кaмаcандaге 1', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Принцесса Кaмаcандaге 1.mp3'},
  {'icon': iconImage, 'title': 'Принцесса Кaмаcандaге 2', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Принцесса Кaмаcандaге 2.mp3'},
  {'icon': iconImage, 'title': 'Принцесса Кaмаcандaге 3', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Принцесса Кaмаcандaге 3.mp3'},
  {'icon': iconImage, 'title': 'Принцесса Кaмаcандaге 4', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Принцесса Кaмаcандaге 4.mp3'},
  {'icon': iconImage, 'title': 'Принцесса Кaмаcандaге 5', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Принцесса Кaмаcандaге 5.mp3'},
  {'icon': iconImage, 'title': 'Принцесса Кaмаcандaге 6', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Принцесса Кaмаcандaге 6.mp3'},
  {'icon': iconImage, 'title': 'Про Английский Язык', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про Английский Язык.mp3'},
  {'icon': iconImage, 'title': 'Про Ахимсу', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про Ахимсу.mp3'},
  {'icon': iconImage, 'title': 'Про Барбоса', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про Барбоса.mp3'},
  {'icon': iconImage, 'title': 'Про Беззубого Мужика', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про Беззубого Мужика.mp3'},
  {'icon': iconImage, 'title': 'Про Бычка', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про Бычка.mp3'},
  {'icon': iconImage, 'title': 'Про Васю Пиздело', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про Васю Пиздело.mp3'},
  {'icon': iconImage, 'title': 'Про Войну', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про Войну.mp3'},
  {'icon': iconImage, 'title': 'Про День Победы', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про День Победы.mp3'},
  {'icon': iconImage, 'title': 'Про День Хаоса', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про День Хаоса.mp3'},
  {'icon': iconImage, 'title': 'Про Дятла', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про Дятла.mp3'},
  {'icon': iconImage, 'title': 'Про Илью Муромца', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про Илью Муромца.mp3'},
  {'icon': iconImage, 'title': 'Про Инвалида', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про инвалида.mp3'},
  {'icon': iconImage, 'title': 'Про Италию', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про Италию.mp3'},
  {'icon': iconImage, 'title': 'Про Кокоиновый Куст', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про Кокоиновый Куст.mp3'},
  {'icon': iconImage, 'title': 'Про Колбасу', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про колбасу.mp3'},
  {'icon': iconImage, 'title': 'Про Мудрого Китайца Джуан Дзы', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про Мудрого Китайца Джуан-Дзы.mp3'},
  {'icon': iconImage, 'title': 'Про Музыкантов', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про Музыкантов.mp3'},
  {'icon': iconImage, 'title': 'Про Мышу', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про Мышу.mp3'},
  {'icon': iconImage, 'title': 'Про Обезьян', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про Обезьян.mp3'},
  {'icon': iconImage, 'title': 'Про Одинаковых Людей', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про Одинаковых Людей.mp3'},
  {'icon': iconImage, 'title': 'Про Олдовых Людей', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про Олдовых Людей.mp3'},
  {'icon': iconImage, 'title': 'Про Призраков', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про Призраков.mp3'},
  {'icon': iconImage, 'title': 'Про Совсем Хороших Людей', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про Совсем Хороших Людей.mp3'},
  {'icon': iconImage, 'title': 'Про Сотворение Человека(непал)', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про Сотворение Человека(непал).mp3'},
  {'icon': iconImage, 'title': 'Про Тадж Махал', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про Тадж Махал.mp3'},
  {'icon': iconImage, 'title': 'Про Тигра И Кошку', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про тигра и кошку.mp3'},
  {'icon': iconImage, 'title': 'Про Трех Астрологов', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про Трех Астрологов.mp3'},
  {'icon': iconImage, 'title': 'Про Упрямого Царевича', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про Упрямого Царевича.mp3'},
  {'icon': iconImage, 'title': 'Про Шиву', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Про Шиву.mp3'},
  {'icon': iconImage, 'title': 'Снова За Калбасу', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Снова За Калбасу.mp3'},
  {'icon': iconImage, 'title': 'Снова Про Гавно', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Снова Про Гавно.mp3'},
  {'icon': iconImage, 'title': 'Траханый Берг1', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Анекдоты/Траханый Берг/Траханый Берг1.mp3'},
  {'icon': iconImage, 'title': 'Траханый Берг2', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Анекдоты/Траханый Берг/Траханый Берг2.mp3'},
  {'icon': iconImage, 'title': 'Траханый Берг3', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Анекдоты/Траханый Берг/Траханый Берг3.mp3'},
  {'icon': iconImage, 'title': 'Траханый Берг4', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Анекдоты/Траханый Берг/Траханый Берг4.mp3'},
  {'icon': iconImage, 'title': 'Хазанов', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Хазанов.mp3'},
  {'icon': iconImage, 'title': 'Хали Гали', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Анекдоты/Траханый Берг/Хали Гали.mp3'},
  {'icon': iconImage, 'title': 'Художник', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Художник.mp3'},
  {'icon': iconImage, 'title': 'Чего Хочет Бог', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Растаманские сказки/Чего хочет Бог.mp3'},
  {'icon': iconImage, 'title': 'Шуфрин', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Шуфрин.mp3'},
  {'icon': iconImage, 'title': 'Шуфрин(ало Люсь)', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Шуфрин(Ало Люсь).mp3'},
  {'icon': iconImage, 'title': 'Шуфрин1', 'file': '../../../../../../../../F:/MUSIK/М.Задорнов/Шуфрин1.mp3'},
]);
})

document.getElementById('машаимедведи').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Без Тебя', 'file': '../../../../../../../../F:/MUSIK/маша и медведи/Без тебя.mp3'},
  {'icon': iconImage, 'title': 'Земля', 'file': '../../../../../../../../F:/MUSIK/маша и медведи/Земля.mp3'},
  {'icon': iconImage, 'title': 'Любочка', 'file': '../../../../../../../../F:/MUSIK/маша и медведи/Любочка.mp3'},
]);
})

document.getElementById('машинавремени').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Ангел Пустых Бутылок', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/2001 - Место где свет/Ангел пустых бутылок.mp3'},
  {'icon': iconImage, 'title': 'Ах Какой Был Изысканный Бал', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1985 - Песни под гитару 1/Ах, какой был изысканный бал.mp3'},
  {'icon': iconImage, 'title': 'Аэрофлотская', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/Аэрофлотская.MP3'},
  {'icon': iconImage, 'title': 'Барьер', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/1979 - 85 Лучшие песни/Барьер.mp3'},
  {'icon': iconImage, 'title': 'Братский Вальсок', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1994 - Я рисую тебя/Братский вальсок.mp3'},
  {'icon': iconImage, 'title': 'В Добрый Час', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/В добрый час/В добрый час.WAV'},
  {'icon': iconImage, 'title': 'Варьете', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1998 - Женский альбом/Варьете.mp3'},
  {'icon': iconImage, 'title': 'Вверх', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/2001 - Место где свет/Вверх.mp3'},
  {'icon': iconImage, 'title': 'Ветер Надежды', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/В круге света/Ветер надежды.WAV'},
  {'icon': iconImage, 'title': 'Видео Магнитофон', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1985 - Песни под гитару 1/Видео магнитофон.mp3'},
  {'icon': iconImage, 'title': 'Время', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/1979 - 85 Лучшие песни/Время.mp3'},
  {'icon': iconImage, 'title': 'Дружба', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1996 - Песни, которые я люблю/Дружба.mp3'},
  {'icon': iconImage, 'title': 'Если Бы Мы Были Взрослей', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/Реки и мосты/Если бы мы были взрослей.WAV'},
  {'icon': iconImage, 'title': 'За Тех Кто В Море', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/В добрый час/За тех, кто в море.mp3'},
  {'icon': iconImage, 'title': 'Звезды Не Ездят В Метро', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/2001 - Место где свет/Звезды не ездят в метро.mp3'},
  {'icon': iconImage, 'title': 'Знаю Только Я', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/Внештатный командир земли/Знаю только я.WAV'},
  {'icon': iconImage, 'title': 'И Опять Мне Снится Одно И То Же', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1998 - Женский альбом/И опять мне снится одно и то же.mp3'},
  {'icon': iconImage, 'title': 'Идут На Север', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1996 - Песни, которые я люблю/Идут на север.mp3'},
  {'icon': iconImage, 'title': 'Из Гельминтов', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/1999 - Часы и знаки/Из Гельминтов.mp3'},
  {'icon': iconImage, 'title': 'Иногда Я Пою', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/2001 - Место где свет/Иногда я пою.mp3'},
  {'icon': iconImage, 'title': 'Когда Я Был Большим', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/Внештатный командир земли/Когда я был большим.WAV'},
  {'icon': iconImage, 'title': 'Когда Я Вернусь', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1996 - Песни, которые я люблю/Когда я вернусь.mp3'},
  {'icon': iconImage, 'title': 'Костер', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/1979 - 85 Лучшие песни/Костер.mp3'},
  {'icon': iconImage, 'title': 'Костер', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/Костер.mp3'},
  {'icon': iconImage, 'title': 'Кошка Которая Гуляет Сама По Себе', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/Реки и мосты/Кошка, которая гуляет сама по себе.mp3'},
  {'icon': iconImage, 'title': 'Лейся Песня', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1996 - Песни, которые я люблю/Лейся, песня.mp3'},
  {'icon': iconImage, 'title': 'Маленькие Герои', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1985 - Песни под гитару 1/Маленькие герои.mp3'},
  {'icon': iconImage, 'title': 'Марионетки', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/Десять лет спустя/Марионетки .mp3'},
  {'icon': iconImage, 'title': 'Марионетки', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/Десять лет спустя/Марионетки.mp3'},
  {'icon': iconImage, 'title': 'Меня Очень Не Любят Эстеты', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1998 - Женский альбом/Меня очень не любят эстеты.mp3'},
  {'icon': iconImage, 'title': 'Место Где Свет', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/2001 - Место где свет/Место где свет.mp3'},
  {'icon': iconImage, 'title': 'Монолог Бруклинского Таксиста', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1998 - Женский альбом/Монолог Бруклинского таксиста.mp3'},
  {'icon': iconImage, 'title': 'Монолог Гражданина', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/Монолог гражданина.MP3'},
  {'icon': iconImage, 'title': 'Морской Закон', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/1979 - 85 Лучшие песни/Морской закон.mp3'},
  {'icon': iconImage, 'title': 'Музыка Под Снегом', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/В добрый час/Музыка под снегом.mp3'},
  {'icon': iconImage, 'title': 'Мы Сойдем Сума', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/1999 - Часы и знаки/Мы сойдем сума.mp3'},
  {'icon': iconImage, 'title': 'На Абрикосовых Холмах', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/1999 - Часы и знаки/На абрикосовых холмах.mp3'},
  {'icon': iconImage, 'title': 'На Неглинке', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1998 - Женский альбом/На Неглинке.mp3'},
  {'icon': iconImage, 'title': 'На Семи Ветрах', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/Внештатный командир земли/На семи ветрах.WAV'},
  {'icon': iconImage, 'title': 'Нас Ещё Не Согнули Годы', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1985 - Песни под гитару 2/Нас ещё не согнули годы.mp3'},
  {'icon': iconImage, 'title': 'Наш Дом', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/Десять лет спустя/Наш дом.mp3'},
  {'icon': iconImage, 'title': 'Не Маячит Надежда Мне', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/Не маячит надежда мне.MP3'},
  {'icon': iconImage, 'title': 'Не Надо Так', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/2001 - Место где свет/Не надо так.mp3'},
  {'icon': iconImage, 'title': 'Небо', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/2001 - Место где свет/Небо.mp3'},
  {'icon': iconImage, 'title': 'Однажды Мир Прогнётся Под Нас', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/Однажды мир прогнётся под нас.mp3'},
  {'icon': iconImage, 'title': 'Он Был Старше Ее', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/2000 - Время напрокат/Он был старше ее.MP3'},
  {'icon': iconImage, 'title': 'Она Идет По Жизни Смеясь', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/Она идет по жизни, смеясь.mp3'},
  {'icon': iconImage, 'title': 'Она Идет По Жизни Смеясь', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/Реки и мосты/Она идет по жизни, смеясь.WAV'},
  {'icon': iconImage, 'title': 'Опустошение', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/1979 - 85 Лучшие песни/Опустошение.mp3'},
  {'icon': iconImage, 'title': 'Оставь Меня', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/2001 - Место где свет/Оставь меня.mp3'},
  {'icon': iconImage, 'title': 'Отчего Так Жесток Свет', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/Отчего так жесток свет .MP3'},
  {'icon': iconImage, 'title': 'Памяти Бродского', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1998 - Женский альбом/Памяти Бродского.mp3'},
  {'icon': iconImage, 'title': 'Памяти В Высотского', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1985 - Песни под гитару 1/Памяти В. Высотского.mp3'},
  {'icon': iconImage, 'title': 'Перекресток', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1999 - Перекресток/Перекресток.mp3'},
  {'icon': iconImage, 'title': 'Песня Про Надежду', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1998 - Женский альбом/Песня про надежду.mp3'},
  {'icon': iconImage, 'title': 'Песня Про Первых', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1985 - Песни под гитару 2/Песня про первых.mp3'},
  {'icon': iconImage, 'title': 'По Домам', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/2001 - Место где свет/По домам.mp3'},
  {'icon': iconImage, 'title': 'Поворот', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/Десять лет спустя/Поворот.WAV'},
  {'icon': iconImage, 'title': 'Подражание Вертинскому', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1998 - Женский альбом/Подражание Вертинскому.mp3'},
  {'icon': iconImage, 'title': 'Пока Горит Cвeча', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/В добрый час/Пока горит cвeча.mp3'},
  {'icon': iconImage, 'title': 'Пока Горит Свеча', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/В добрый час/Пока горит свеча.WAV'},
  {'icon': iconImage, 'title': 'Посвящение Архитектурному Институту', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1998 - Женский альбом/Посвящение Архитектурному институту.mp3'},
  {'icon': iconImage, 'title': 'Путь', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/Путь.mp3'},
  {'icon': iconImage, 'title': 'Пятнадцать К Тридцати', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1985 - Песни под гитару 1/Пятнадцать к тридцати.mp3'},
  {'icon': iconImage, 'title': 'Разговор В Поезде', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/1979 - 85 Лучшие песни/Разговор в поезде.mp3'},
  {'icon': iconImage, 'title': 'Рождественская Песня', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/Внештатный командир земли/Рождественская песня.WAV'},
  {'icon': iconImage, 'title': 'Романс', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1996 - Песни, которые я люблю/Романс.mp3'},
  {'icon': iconImage, 'title': 'Самая Тихая Песня', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/Десять лет спустя/Самая тихая песня.WAV'},
  {'icon': iconImage, 'title': 'Синяя Птица', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/1979 - 85 Лучшие песни/Синяя птица.mp3'},
  {'icon': iconImage, 'title': 'Снег', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/2000 - Время напрокат/Снег.mp3'},
  {'icon': iconImage, 'title': 'Снег', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/В добрый час/Снег.WAV'},
  {'icon': iconImage, 'title': 'Спецназ', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/1979 - 85 Лучшие песни/Спецназ.mp3'},
  {'icon': iconImage, 'title': 'Старый Рок Н Ролл', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/В добрый час/Старый рок-н-ролл.WAV'},
  {'icon': iconImage, 'title': 'Странные Дни', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/1999 - Часы и знаки/Странные дни.mp3'},
  {'icon': iconImage, 'title': 'Темная Ночь', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1996 - Песни, которые я люблю/Темная ночь.mp3'},
  {'icon': iconImage, 'title': 'Тихие Песни', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/Картонные крылья любви/Тихие песни.WAV'},
  {'icon': iconImage, 'title': 'Три Сестры', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/А.Макаревич и Б.Гребенщиков/1996 - Двадцать лет спустя/Три сестры.mp3'},
  {'icon': iconImage, 'title': 'Ты Или Я', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/Десять лет спустя/Ты или я.mp3'},
  {'icon': iconImage, 'title': 'У Ломбарда', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/А.Макаревич и Б.Гребенщиков/1996 - Двадцать лет спустя/У ломбарда.mp3'},
  {'icon': iconImage, 'title': 'Уходящее Лето', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1985 - Песни под гитару 2/Уходящее лето.mp3'},
  {'icon': iconImage, 'title': 'Флаг', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/2000 - Время напрокат/Флаг.MP3'},
  {'icon': iconImage, 'title': 'Флюгер', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/Реки и мосты/Флюгер.mp3'},
  {'icon': iconImage, 'title': 'Я Не Видел Войны', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1985 - Песни под гитару 2/Я не видел войны.mp3'},
  {'icon': iconImage, 'title': 'Я Смысл Этой Жизни Вижу В Том', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/Я смысл этой жизни вижу в том .MP3'},
  {'icon': iconImage, 'title': 'Я Сюда Еще Вернусь', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/1979 - 85 Лучшие песни/Я сюда еще вернусь.mp3'},
  {'icon': iconImage, 'title': 'Я Хотел Бы Пройти Сто Дорог', 'file': '../../../../../../../../F:/MUSIK/Машина  Времени/А. Макаревич/1985 - Песни под гитару 1/Я хотел бы пройти сто дорог.mp3'},
]);
})

document.getElementById('мумийтроль').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Владивосток 2000', 'file': '../../../../../../../../F:/MUSIK/мумий троль/Владивосток 2000.mp3'},
  {'icon': iconImage, 'title': 'Дельфины', 'file': '../../../../../../../../F:/MUSIK/мумий троль/Дельфины.mp3'},
  {'icon': iconImage, 'title': 'Невеста', 'file': '../../../../../../../../F:/MUSIK/мумий троль/Невеста.mp3'},
  {'icon': iconImage, 'title': 'Это По Любви', 'file': '../../../../../../../../F:/MUSIK/мумий троль/Это по любви .mp3'},
]);
})

document.getElementById('о.газманов').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'А Я Девушек Люблю!', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1996 - Бродяга/А я девушек люблю!.mp3'},
  {'icon': iconImage, 'title': 'Бродяга', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1996 - Бродяга/Бродяга.mp3'},
  {'icon': iconImage, 'title': 'Бродяга', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1996 - Бродяга/Бродяга.mp4'},
  {'icon': iconImage, 'title': 'Ветер', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1991 - Эскадрон/Ветер.mp3'},
  {'icon': iconImage, 'title': 'Вороны', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1993 - Морячка/Вороны.mp3'},
  {'icon': iconImage, 'title': 'Вот И Лето Прошло', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/2003 - Мои Ясные Дни/Вот И Лето Прошло.mp3'},
  {'icon': iconImage, 'title': 'Детство Моё', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/2003 - Мои Ясные Дни/Детство Моё.mp3'},
  {'icon': iconImage, 'title': 'Дождись', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/2006 - Лучшие песни. Новая коллекция/Дождись.mp3'},
  {'icon': iconImage, 'title': 'Дороги', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1994 - Загулял/Дороги.mp3'},
  {'icon': iconImage, 'title': 'Друг', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1994 - Загулял/Друг.mp3'},
  {'icon': iconImage, 'title': 'Единственная', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1996 - Бродяга/Единственная.mp3'},
  {'icon': iconImage, 'title': 'Есаул', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1991 - Эскадрон/Есаул.mp3'},
  {'icon': iconImage, 'title': 'Загулял', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1994 - Загулял/Загулял.mp3'},
  {'icon': iconImage, 'title': 'Красная Книга', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1998 - Красная книга/Красная книга.mp3'},
  {'icon': iconImage, 'title': 'Люси', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1991 - Эскадрон/Люси.mp3'},
  {'icon': iconImage, 'title': 'Марш Высотников', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1998 - Красная книга/Марш высотников.mp3'},
  {'icon': iconImage, 'title': 'Милые Алые Зори', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1996 - Бродяга/Милые, алые зори.mp3'},
  {'icon': iconImage, 'title': 'Мне Не Нравится Дождь', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1998 - Красная книга/Мне не нравится дождь.mp3'},
  {'icon': iconImage, 'title': 'Мои Ясные Дни', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/2003 - Мои Ясные Дни/Мои Ясные Дни.mp3'},
  {'icon': iconImage, 'title': 'Морячка', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1993 - Морячка/Морячка.mp3'},
  {'icon': iconImage, 'title': 'Москва', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1993 - Морячка/Москва.mp3'},
  {'icon': iconImage, 'title': 'Мотылек', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1998 - Красная книга/Мотылек.mp3'},
  {'icon': iconImage, 'title': 'На Заре', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/2000 - Из века в век/На заре.mp3'},
  {'icon': iconImage, 'title': 'Остров Затонувших Кораблей', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1998 - Красная книга/Остров затонувших кораблей.mp3'},
  {'icon': iconImage, 'title': 'Офицеры', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1993 - Морячка/Офицеры.mp3'},
  {'icon': iconImage, 'title': 'Питер', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1993 - Морячка/Питер.mp3'},
  {'icon': iconImage, 'title': 'Путана', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1991 - Эскадрон/Путана.mp3'},
  {'icon': iconImage, 'title': 'Танцуй Пока Молодой', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1993 - Морячка/Танцуй, пока молодой.mp3'},
  {'icon': iconImage, 'title': 'Хвастать Милая Не Стану', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1998 - Красная книга/Хвастать, милая, не стану.mp3'},
  {'icon': iconImage, 'title': 'Эскадрон', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1991 - Эскадрон/Эскадрон.mp3'},
  {'icon': iconImage, 'title': 'Эскадрон', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1991 - Эскадрон/Эскадрон.mp4'},
  {'icon': iconImage, 'title': 'Этот День', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1998 - Красная книга/Этот день.mp3'},
  {'icon': iconImage, 'title': 'Этот День', 'file': '../../../../../../../../F:/MUSIK/О.Газманов/1998 - Красная книга/Этот день.mp4'},
]);
})

document.getElementById('песниизкинофильмов').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '045 И Кобзон И Оркестр Кинематографии Мнгновения', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Михаил Таривердиев/045 И.КОБЗОН И ОРКЕСТР КИНЕМАТОГРАФИИ-МНГНОВЕНИЯ.MP3'},
  {'icon': iconImage, 'title': '12 Cтульев', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/12 cтульев.mp3'},
  {'icon': iconImage, 'title': '12 Стульев', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/12 стульев.mp3'},
  {'icon': iconImage, 'title': '33 Коровы', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/33 коровы.mp3'},
  {'icon': iconImage, 'title': '5 Минут', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/5 Минут.mp3'},
  {'icon': iconImage, 'title': 'A Stroll Through Town', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/1992 - Beethoven/a_stroll_through_town.mp3'},
  {'icon': iconImage, 'title': 'A Weekend In The Country', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/1993 - The World of Jeeves and Wooster/A Weekend In The Country.mp3'},
  {'icon': iconImage, 'title': 'Addio A Cheyene', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Ennio Morricone/1968 - Once Upon a Time in the West/Addio A Cheyene.mp3'},
  {'icon': iconImage, 'title': 'After Dark', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Pulp Fiction/After dark.mp3'},
  {'icon': iconImage, 'title': 'Alicia Discovers Nashs Dark World', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/Alicia Discovers Nash%27s Dark World.mp3'},
  {'icon': iconImage, 'title': 'All Love Can Be', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/All Love Can Be.mp3'},
  {'icon': iconImage, 'title': 'Angel', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Massive Attack/1998 - Mezzanine/Angel.mp3'},
  {'icon': iconImage, 'title': 'Angel', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Snatch/Angel.mp3'},
  {'icon': iconImage, 'title': 'Beautiful Lie', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/Beautiful Lie.mp3'},
  {'icon': iconImage, 'title': 'Begine', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/Brave Heart/Begine.mp3'},
  {'icon': iconImage, 'title': 'Bemidji Mn', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Bemidji, MN.mp3'},
  {'icon': iconImage, 'title': 'Bethoven', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Bethoven.mp3'},
  {'icon': iconImage, 'title': 'Brave Heart', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/Brave Heart/Brave Heart.mp3'},
  {'icon': iconImage, 'title': 'Bullwinkle', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Pulp Fiction/Bullwinkle.mp3'},
  {'icon': iconImage, 'title': 'Chi Mai', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Ennio Morricone/1981 - Профессионал/Chi Mai.mp3'},
  {'icon': iconImage, 'title': 'Closing Credits', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/Closing Credits.mp3'},
  {'icon': iconImage, 'title': 'Cornfield Chase', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/2014 - Interstellar/Cornfield Chase.mp3'},
  {'icon': iconImage, 'title': 'Cracking The Russian Codes', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/Cracking the Russian Codes.mp3'},
  {'icon': iconImage, 'title': 'Creating Governing Dynamics', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/Creating Governing Dynamics%27.mp3'},
  {'icon': iconImage, 'title': 'Cross The Tracks', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Snatch/Cross The Tracks.mp3'},
  {'icon': iconImage, 'title': 'Day One', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/2014 - Interstellar/Day One.mp3'},
  {'icon': iconImage, 'title': 'Day One Dark', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/2014 - Interstellar/Day One Dark.mp3'},
  {'icon': iconImage, 'title': 'Detach', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/2014 - Interstellar/Detach.mp3'},
  {'icon': iconImage, 'title': 'Diamond', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Snatch/Diamond.mp3'},
  {'icon': iconImage, 'title': 'Disco Science', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Snatch/Disco Science.mp3'},
  {'icon': iconImage, 'title': 'Dreaming Of The Crash', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/2014 - Interstellar/Dreaming of the Crash.mp3'},
  {'icon': iconImage, 'title': 'Dust', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/2014 - Interstellar/Dust.mp3'},
  {'icon': iconImage, 'title': 'Ecstasy Of Gold', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Ennio Morricone/1966 - The Good, The Bad And The Ugly/Ecstasy of Gold.mp3'},
  {'icon': iconImage, 'title': 'Ecstasy Of Gold', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Ennio Morricone/1966 - The Good, The Bad And The Ugly/Ecstasy of Gold.mp4'},
  {'icon': iconImage, 'title': 'Edge Of Tomorrow', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/2014 - Edge of Tomorrow/Edge of Tomorrow.mp3'},
  {'icon': iconImage, 'title': 'Elysium', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/2000 - Гладиатор/Elysium.mp3'},
  {'icon': iconImage, 'title': 'End Titles', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/1996 - Independence Day/end_titles.mp3'},
  {'icon': iconImage, 'title': 'Fiat Вальс', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Артемьев/Fiat-Вальс.mp3'},
  {'icon': iconImage, 'title': 'Fin', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/Brave Heart/Fin.mp3'},
  {'icon': iconImage, 'title': 'Find Me When You Wake Up', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/2014 - Edge of Tomorrow/Find-Me-When-You-Wake-Up.mp3'},
  {'icon': iconImage, 'title': 'First Drop Off First Kiss', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/First Drop-Off First Kiss.mp3'},
  {'icon': iconImage, 'title': 'Flight Of The Dragon', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Jackie Chan/1986 - Armour of God/Flight Of The Dragon.mp3'},
  {'icon': iconImage, 'title': 'Flight Of The Dragon', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Jackie Chan/1986 - Armour of God/Flight Of The Dragon.mp4'},
  {'icon': iconImage, 'title': 'For The Love Of A Princess', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/Brave Heart/For The Love Of A Princess.mp3'},
  {'icon': iconImage, 'title': 'Fort Walton Kansas', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/1996 - The rock/Fort walton kansas.mp3'},
  {'icon': iconImage, 'title': 'France', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/France.mp3'},
  {'icon': iconImage, 'title': 'Ghost Town', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Snatch/Ghost Town.mp3'},
  {'icon': iconImage, 'title': 'History Of Artemisia', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/2014 - 300 спартанцев/History Of Artemisia.mp3'},
  {'icon': iconImage, 'title': 'History Of Artemisia', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/2014 - 300 спартанцев/History of Artemisia.mp4'},
  {'icon': iconImage, 'title': 'Honor Him', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/2000 - Гладиатор/Honor Him.MP3'},
  {'icon': iconImage, 'title': 'Hope Overture', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Requiem of a dream/Hope Overture.mp3'},
  {'icon': iconImage, 'title': 'Htb', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/HTB.mp3'},
  {'icon': iconImage, 'title': 'Hummell Gets The Rockets', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/1996 - The rock/Hummell gets the rockets.mp3'},
  {'icon': iconImage, 'title': 'Hungry Eyes', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/1987 - Dirty Dancing/Hungry eyes.mp3'},
  {'icon': iconImage, 'title': 'I Will Always Love You', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/I Will Always Love You.MP3'},
  {'icon': iconImage, 'title': 'In The Beginning', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Emir Kusturica/Emir Kusturica & The No Smoking Orchestra La Vie Est Un Miracle x Pelotin x Robertorom/In The Beginning.mp3'},
  {'icon': iconImage, 'title': 'In The Death Car', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/In the death car.mp3'},
  {'icon': iconImage, 'title': 'In The Tunnels', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/1996 - The rock/In the tunnels.mp3'},
  {'icon': iconImage, 'title': 'Independence Day', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/1996 - Independence Day/Independence day.mp3'},
  {'icon': iconImage, 'title': 'Inertia Creeps', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Massive Attack/2006 - Collected/Inertia Creeps.mp3'},
  {'icon': iconImage, 'title': 'Jade', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/1996 - The rock/Jade.mp3'},
  {'icon': iconImage, 'title': 'Jakes First Flight (end Credit Edit)', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/2009 - Avatar/Jake%27s First Flight (End Credit Edit).mp3'},
  {'icon': iconImage, 'title': 'James Bond Theme', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Bond Theme.mp3'},
  {'icon': iconImage, 'title': 'Jeeves And Wooster', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/1993 - The World of Jeeves and Wooster/Jeeves and Wooster.mp3'},
  {'icon': iconImage, 'title': 'Kaleidoscope Of Mathematics', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/Kaleidoscope of Mathematics.mp3'},
  {'icon': iconImage, 'title': 'Kaleidoscope Of Mathematics', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/Kaleidoscope of Mathematics.mp4'},
  {'icon': iconImage, 'title': 'Kiss The Mother', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Emir Kusturica/Emir Kusturica & The No Smoking Orchestra La Vie Est Un Miracle x Pelotin x Robertorom/Kiss The Mother.mp3'},
  {'icon': iconImage, 'title': 'Kraken', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Пираты Карибского Моря/Kraken.mp4'},
  {'icon': iconImage, 'title': 'Kustu Ba05 16 Evergreen', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Emir Kusturica/Kustu-BA05-16.Evergreen.mp3'},
  {'icon': iconImage, 'title': 'Le Vent Le Cri', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Ennio Morricone/1981 - Профессионал/Le Vent, Le Cri.mp3'},
  {'icon': iconImage, 'title': 'Looking For Luka', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Emir Kusturica/Emir Kusturica & The No Smoking Orchestra La Vie Est Un Miracle x Pelotin x Robertorom/Looking For Luka.mp3'},
  {'icon': iconImage, 'title': 'Looking For Sabaha', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Emir Kusturica/Emir Kusturica & The No Smoking Orchestra La Vie Est Un Miracle x Pelotin x Robertorom/Looking For Sabaha.mp3'},
  {'icon': iconImage, 'title': 'Luomo Dellarmonica', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Ennio Morricone/1968 - Once Upon a Time in the West/L%27uomo Dell%27armonica.mp3'},
  {'icon': iconImage, 'title': 'Luomo Dellarmonica', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Ennio Morricone/1968 - Once Upon a Time in the West/L%27uomo Dell%27armonica.mp4'},
  {'icon': iconImage, 'title': 'Main Theme', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/1999 - Д.Д.Д/Main Theme.mp3'},
  {'icon': iconImage, 'title': 'Main Title', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Main title.mp3'},
  {'icon': iconImage, 'title': 'Misirlou', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Pulp Fiction/Misirlou.mp3'},
  {'icon': iconImage, 'title': 'Modern Time', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Modern time.mp3'},
  {'icon': iconImage, 'title': 'Mountains', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/2014 - Interstellar/Mountains.mp3'},
  {'icon': iconImage, 'title': 'My Heart Will Go On', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/My Heart Will Go On.mp3'},
  {'icon': iconImage, 'title': 'Nash Descends Into Parchers World', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/Nash Descends into Parcher%27s World.mp3'},
  {'icon': iconImage, 'title': 'Now We Are Free', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/2000 - Гладиатор/Now we are free.mp3'},
  {'icon': iconImage, 'title': 'Now We Are Free', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/2000 - Гладиатор/Now We Are Free.mp4'},
  {'icon': iconImage, 'title': 'Of One Heart Of One Mind', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/Of One Heart Of One Mind.mp3'},
  {'icon': iconImage, 'title': 'Once Upon A Time In America', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Ennio Morricone/1984 - Once Upon A Time In America/Once Upon A Time In America.mp3'},
  {'icon': iconImage, 'title': 'Operation Condor', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Jackie Chan/1991 - Armour of God II/Operation Condor.mp3'},
  {'icon': iconImage, 'title': 'Outlawed Tunes On Outlawed Pip', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/Brave Heart/Outlawed Tunes On Outlawed Pip.mp3'},
  {'icon': iconImage, 'title': 'Patricide', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/2000 - Гладиатор/Patricide.mp3'},
  {'icon': iconImage, 'title': 'Police Story', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Jackie Chan/1985 - Police Story/Police Story.mp3'},
  {'icon': iconImage, 'title': 'Police Story Ii', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Jackie Chan/1988 - Police Story II/Police Story II.mp3'},
  {'icon': iconImage, 'title': 'Por Una Cabeza', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Por una cabeza.mp3'},
  {'icon': iconImage, 'title': 'Project A Ii', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Jackie Chan/1987 - Project A II/Project A II.mp3'},
  {'icon': iconImage, 'title': 'Prologue', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/1996 - Independence Day/Prologue.mp3'},
  {'icon': iconImage, 'title': 'Prologue Film Version', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/1996 - Independence Day/Prologue film version.mp3'},
  {'icon': iconImage, 'title': 'Rain Man', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/Rain man.mp3'},
  {'icon': iconImage, 'title': 'Rain Mаn', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/Rain mаn.mp3'},
  {'icon': iconImage, 'title': 'Real Or Imagines', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/Real or Imagines.mp3'},
  {'icon': iconImage, 'title': 'Rose', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/Titanic/Rose.mp3'},
  {'icon': iconImage, 'title': 'Saying Goodbye To Those You So Love', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/Saying Goodbye to Those You So Love.mp3'},
  {'icon': iconImage, 'title': 'Shape Of My Heart', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Shape of My Heart.mp3'},
  {'icon': iconImage, 'title': 'Snatch', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Snatch/Snatch.mp3'},
  {'icon': iconImage, 'title': 'Star Wars', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Star  Wars.MP3'},
  {'icon': iconImage, 'title': 'Stay', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/2014 - Interstellar/Stay.mp3'},
  {'icon': iconImage, 'title': 'Summer Overture', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Requiem of a dream/Summer Overture.mp3'},
  {'icon': iconImage, 'title': 'Supermoves', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Snatch/Supermoves.mp3'},
  {'icon': iconImage, 'title': 'Teaching Mathematics Again', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/Teaching Mathematics Again.mp3'},
  {'icon': iconImage, 'title': 'Teardrop', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Massive Attack/1998 - Mezzanine/Teardrop.mp3'},
  {'icon': iconImage, 'title': 'The Battle', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/2000 - Гладиатор/The battle.mp3'},
  {'icon': iconImage, 'title': 'The Car Chase', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/The Car Chase.mp3'},
  {'icon': iconImage, 'title': 'The Chase', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/1996 - The rock/The chase.mp3'},
  {'icon': iconImage, 'title': 'The Darkest Day', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/1996 - Independence Day/the_darkest_day.mp3'},
  {'icon': iconImage, 'title': 'The Dog Has To Go', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/1992 - Beethoven/the_dog_has_to_go.mp3'},
  {'icon': iconImage, 'title': 'The Dogs Let Loose', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/1992 - Beethoven/the_dogs_let_loose.mp3'},
  {'icon': iconImage, 'title': 'The Kraken', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/2006 - Пираты Карибского моря/The kraken.mp3'},
  {'icon': iconImage, 'title': 'The Lively Ones', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Pulp Fiction/The lively ones.mp3'},
  {'icon': iconImage, 'title': 'The Lonely Shepherd', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/The Lonely Shepherd.mp3'},
  {'icon': iconImage, 'title': 'The Prize Of Ones Life', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/Beautiful Mind/The Prize of One%27s Life.mp3'},
  {'icon': iconImage, 'title': 'The Sinking', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/Titanic/The Sinking.mp3'},
  {'icon': iconImage, 'title': 'The Slave', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/2000 - Гладиатор/The Slave.mp3'},
  {'icon': iconImage, 'title': 'The Twins Effect', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Jackie Chan/2003 - The Twins/The Twins Effect.mp3'},
  {'icon': iconImage, 'title': 'The Waterfall', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Emir Kusturica/Emir Kusturica & The No Smoking Orchestra La Vie Est Un Miracle x Pelotin x Robertorom/The Waterfall.mp3'},
  {'icon': iconImage, 'title': 'Time', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Hans Zimmer/Time.mp3'},
  {'icon': iconImage, 'title': 'Tomorrow', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Tomorrow.mp3'},
  {'icon': iconImage, 'title': 'Tuyo', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Tuyo.mp3'},
  {'icon': iconImage, 'title': 'Tuyo', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Tuyo.mp4'},
  {'icon': iconImage, 'title': 'Unable To Stay Unwilling To Leave', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/Titanic/Unable to Stay, Unwilling to Leave.mp3'},
  {'icon': iconImage, 'title': 'Vision Of Murron', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/Brave Heart/Vision Of Murron.mp3'},
  {'icon': iconImage, 'title': 'Who Am', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Jackie Chan/1998 - Who Am/Who Am.mp3'},
  {'icon': iconImage, 'title': 'X Files', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/X-FILES.MP3'},
  {'icon': iconImage, 'title': 'You Dont Dream In Cryo', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/James Horner/2009 - Avatar/You Don%27t Dream in Cryo.mp3'},
  {'icon': iconImage, 'title': 'You Never Can Tell', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Pulp Fiction/You never can tell.mp3'},
  {'icon': iconImage, 'title': 'А На Последок', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/А на последок.mp3'},
  {'icon': iconImage, 'title': 'Атака', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Артемьев/Атака.mp3'},
  {'icon': iconImage, 'title': 'Брадобрей', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Брадобрей.mp3'},
  {'icon': iconImage, 'title': 'Была Не Была', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Андрей Миронов/Была не была.mp3'},
  {'icon': iconImage, 'title': 'В Городском Парке', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Артемьев/В городском парке.mp3'},
  {'icon': iconImage, 'title': 'Вальс', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/Вальс.mp3'},
  {'icon': iconImage, 'title': 'Вальс (петров)', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/Вальс (Петров).mp3'},
  {'icon': iconImage, 'title': 'Вальс Из Кф Мой Ласк Нежн Зверь', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Вальс из кф Мой ласк нежн зверь.mp3'},
  {'icon': iconImage, 'title': 'Вдруг Как В Сказке', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Вдруг как в сказке.mp3'},
  {'icon': iconImage, 'title': 'Ветер', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Артемьев/Ветер.mp3'},
  {'icon': iconImage, 'title': 'Визиты', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Артемьев/Визиты.mp3'},
  {'icon': iconImage, 'title': 'Возвращение', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/Возвращение.mp3'},
  {'icon': iconImage, 'title': 'Вокзал Прощания', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Михаил Таривердиев/Вокзал прощания.mp3'},
  {'icon': iconImage, 'title': 'Волшебная Страна', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/Волшебная страна.mp3'},
  {'icon': iconImage, 'title': 'Все Пройдет', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Все пройдет.mp3'},
  {'icon': iconImage, 'title': 'Вступление', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/Вступление.mp3'},
  {'icon': iconImage, 'title': 'Гардемарины', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Гардемарины.mp3'},
  {'icon': iconImage, 'title': 'Где То Далеко', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Михаил Таривердиев/Где-то далеко.mp3'},
  {'icon': iconImage, 'title': 'Гимн Квн', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Гимн КВН.mp3'},
  {'icon': iconImage, 'title': 'Город Которого Нет', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Город которого нет.mp3'},
  {'icon': iconImage, 'title': 'Гусарская Балада', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/Гусарская балада.mp3'},
  {'icon': iconImage, 'title': 'Далека Дорога Твоя', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Далека дорога твоя.mp3'},
  {'icon': iconImage, 'title': 'Даным Давно', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/Даным-давно.mp3'},
  {'icon': iconImage, 'title': 'Два Сердца', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Н. Караченцев/Два сердца.mp3'},
  {'icon': iconImage, 'title': 'Двое В Кафе', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Михаил Таривердиев/Двое в кафе.mp3'},
  {'icon': iconImage, 'title': 'Деревенский Танец', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Артемьев/Деревенский танец.mp3'},
  {'icon': iconImage, 'title': 'Дождь', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/Дождь.mp3'},
  {'icon': iconImage, 'title': 'Дорога', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Артемьев/Дорога.mp3'},
  {'icon': iconImage, 'title': 'Дороги', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Михаил Таривердиев/Дороги.mp3'},
  {'icon': iconImage, 'title': 'Друг', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Друг.mp3'},
  {'icon': iconImage, 'title': 'Дым Отечества', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Артемьев/Дым Отечества.mp3'},
  {'icon': iconImage, 'title': 'Если У Вас', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/Если у вас.mp3'},
  {'icon': iconImage, 'title': 'Если Я Был Султан', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Если я был султан.mp3'},
  {'icon': iconImage, 'title': 'Есть Только Миг', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Есть только миг.mp3'},
  {'icon': iconImage, 'title': 'Женюсь', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Андрей Миронов/Женюсь.mp3'},
  {'icon': iconImage, 'title': 'Жестокое Танго', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Андрей Миронов/Жестокое танго.mp3'},
  {'icon': iconImage, 'title': 'Живем Мы Что То Без Азарта', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/Живем мы что-то без азарта.mp3'},
  {'icon': iconImage, 'title': 'Жмурки', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Жмурки.mp3'},
  {'icon': iconImage, 'title': 'Загнанный', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/1999 - Д.Д.Д/Загнанный.mp3'},
  {'icon': iconImage, 'title': 'И Над Степью', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/1966 - Неуловимые/И над степью.mp3'},
  {'icon': iconImage, 'title': 'Из К Ф Крестный Отец', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Из к.ф Крестный Отец.mp3'},
  {'icon': iconImage, 'title': 'Из К Ф Шерлок Холмс', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Из к.ф Шерлок  Холмс.mp3'},
  {'icon': iconImage, 'title': 'Из К Ф Шерлок Холмс', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Из к.ф Шерлок Холмс.mp3'},
  {'icon': iconImage, 'title': 'Кддс', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/КДДС.mp3'},
  {'icon': iconImage, 'title': 'Кленовый Лист', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Кленовый лист.mp3'},
  {'icon': iconImage, 'title': 'Кленовый Лист', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Н. Караченцев/Кленовый лист.mp3'},
  {'icon': iconImage, 'title': 'Куплеты Шансонетки', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/1966 - Неуловимые/Куплеты шансонетки.mp3'},
  {'icon': iconImage, 'title': 'Ланфрен', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Ланфрен.mp3'},
  {'icon': iconImage, 'title': 'Маленькая Данелиада', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Маленькая Данелиада.mp3'},
  {'icon': iconImage, 'title': 'Маруся', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Маруся.mp3'},
  {'icon': iconImage, 'title': 'Марш', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/Марш.mp3'},
  {'icon': iconImage, 'title': 'Механическое Пианино', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Артемьев/Механическое пианино.mp3'},
  {'icon': iconImage, 'title': 'Мне Нравиться', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/Мне нравиться.mp3'},
  {'icon': iconImage, 'title': 'Мобила', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Мобила.mp3'},
  {'icon': iconImage, 'title': 'Моей Душе Покоя Нет', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/Моей душе покоя нет.mp3'},
  {'icon': iconImage, 'title': 'Мотоциклисты', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Артемьев/Мотоциклисты.mp3'},
  {'icon': iconImage, 'title': 'Мохнатый Шмель', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/Мохнатый шмель.mp3'},
  {'icon': iconImage, 'title': 'На Волоске', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/1999 - Д.Д.Д/На волоске.mp3'},
  {'icon': iconImage, 'title': 'На Городской Площади', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Артемьев/На городской площади.mp3'},
  {'icon': iconImage, 'title': 'На Станции', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Артемьев/На станции.mp3'},
  {'icon': iconImage, 'title': 'На Тихорецкую', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/На Тихорецкую.mp3'},
  {'icon': iconImage, 'title': 'Не Думай О Секундах С Высока', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Михаил Таривердиев/Не думай о секундах с высока.mp3'},
  {'icon': iconImage, 'title': 'Неаполитанская Песня', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Неаполитанская песня.mp3'},
  {'icon': iconImage, 'title': 'Некогда', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Некогда.mp3'},
  {'icon': iconImage, 'title': 'Никого Не Будет В Доме', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/Никого не будет в доме.mp3'},
  {'icon': iconImage, 'title': 'Ночной Город', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/1999 - Д.Д.Д/Ночной город.mp3'},
  {'icon': iconImage, 'title': 'О Москве', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/О Москве.mp3'},
  {'icon': iconImage, 'title': 'Облетают Последние Маки', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/Облетают последние маки.mp3'},
  {'icon': iconImage, 'title': 'Один День Из Детсва', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Артемьев/Один день из детсва.mp3'},
  {'icon': iconImage, 'title': 'Остров Невезения', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Андрей Миронов/Остров невезения.mp3'},
  {'icon': iconImage, 'title': 'Память Сердца', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Артемьев/Память сердца.mp3'},
  {'icon': iconImage, 'title': 'Парус', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Андрей Миронов/Парус.WAV'},
  {'icon': iconImage, 'title': 'Песенка О Несостоявшихся Надеждах', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Песенка о несостоявшихся надеждах.mp3'},
  {'icon': iconImage, 'title': 'Песня Мушкетеров', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Песня мушкетеров.mp3'},
  {'icon': iconImage, 'title': 'Песня На Пароходе', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Андрей Миронов/Песня на пароходе.mp3'},
  {'icon': iconImage, 'title': 'Песня О Хорошем Настрении', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/Песня о хорошем настрении.mp3'},
  {'icon': iconImage, 'title': 'Песня О Шпаге', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Андрей Миронов/Песня о шпаге.mp3'},
  {'icon': iconImage, 'title': 'Пикник', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Артемьев/Пикник.mp3'},
  {'icon': iconImage, 'title': 'Письмо', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Артемьев/Письмо.mp3'},
  {'icon': iconImage, 'title': 'По Улице Моей', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/По улице моей.mp3'},
  {'icon': iconImage, 'title': 'Погоня', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/1966 - Неуловимые/Погоня .mp3'},
  {'icon': iconImage, 'title': 'Погоня', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/1966 - Неуловимые/Погоня.mp3'},
  {'icon': iconImage, 'title': 'Под Лаской Плюшевого Пледа', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/Под лаской плюшевого пледа.mp3'},
  {'icon': iconImage, 'title': 'Позвони', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Позвони.mp3'},
  {'icon': iconImage, 'title': 'Поклонники', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Артемьев/Поклонники.mp3'},
  {'icon': iconImage, 'title': 'Помоги Мне (а Ведищева)', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Помоги мне (А.Ведищева).WAV'},
  {'icon': iconImage, 'title': 'Последняя Поэма', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Последняя поэма.mp3'},
  {'icon': iconImage, 'title': 'Постой Паровоз', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Постой паровоз.mp3'},
  {'icon': iconImage, 'title': 'Прелестница Младая', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/Прелестница младая.mp3'},
  {'icon': iconImage, 'title': 'Приятно Вспомнить', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Приятно вспомнить.mp3'},
  {'icon': iconImage, 'title': 'Про Бюрократов', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/Про бюрократов.mp3'},
  {'icon': iconImage, 'title': 'Про Зайцев', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Про зайцев.mp3'},
  {'icon': iconImage, 'title': 'Про Медведей', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Про медведей.mp3'},
  {'icon': iconImage, 'title': 'Про Попинс Мэри', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/ПРО ПоПинс Мэри.mp3'},
  {'icon': iconImage, 'title': 'Прощальная Песня', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Андрей Миронов/Прощальная песня.mp3'},
  {'icon': iconImage, 'title': 'Прощание С Россией', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Артемьев/Прощание с Россией.mp3'},
  {'icon': iconImage, 'title': 'Разговор Со Счастьем (в Золотухин)', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Разговор со счастьем (В.Золотухин).WAV'},
  {'icon': iconImage, 'title': 'С Любимыми Не Расставайтесь', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/С любимыми не расставайтесь.mp3'},
  {'icon': iconImage, 'title': 'С Любовью Встретится (н Бродская)', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/С любовью встретится (Н.Бродская).WAV'},
  {'icon': iconImage, 'title': 'Сеанс Немого Кино', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Артемьев/Сеанс немого кино.mp3'},
  {'icon': iconImage, 'title': 'Синема', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Андрей Миронов/Синема.mp3'},
  {'icon': iconImage, 'title': 'Со Мною Вот Что Происходит', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/Со мною вот что происходит.mp3'},
  {'icon': iconImage, 'title': 'Страдание', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Андрей Миронов/Страдание.mp3'},
  {'icon': iconImage, 'title': 'Там Лилии Цветут', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Там лилии цветут.mp3'},
  {'icon': iconImage, 'title': 'Теряют Люди Др Др', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Теряют люди др-др.mp3'},
  {'icon': iconImage, 'title': 'Трубачи', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Андрей Миронов/Трубачи.mp3'},
  {'icon': iconImage, 'title': 'Ты Меня На Рассвете Разбудишь )', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Н. Караченцев/Ты меня на рассвете разбудишь...).mp3'},
  {'icon': iconImage, 'title': 'У Зеркала', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/У зеркала.mp3'},
  {'icon': iconImage, 'title': 'Усатый Нянь', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Усатый нянь.mp3'},
  {'icon': iconImage, 'title': 'Утро', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/Утро.mp3'},
  {'icon': iconImage, 'title': 'Цыганская Таборная', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/1966 - Неуловимые/Цыганская таборная.mp3'},
  {'icon': iconImage, 'title': 'Чарли Чаплин', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Чарли Чаплин.mp3'},
  {'icon': iconImage, 'title': 'Что Тебе Подарить', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Н. Караченцев/Что тебе подарить.mp3'},
  {'icon': iconImage, 'title': 'Эпилог', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Артемьев/Эпилог.mp3'},
  {'icon': iconImage, 'title': 'Я Спросил У Ясеня', 'file': '../../../../../../../../F:/MUSIK/Песни из кинофильмов/Э. Рязанов/Я спросил у ясеня.mp3'},
]);
})

document.getElementById('песниизмультфильмов').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '02 Main Titles', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1989 - The Little Mermaid/02 Main Titles.mp3'},
  {'icon': iconImage, 'title': '05 Part Of Your World', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1989 - The Little Mermaid/05 Part Of Your World.mp3'},
  {'icon': iconImage, 'title': '06 Under The Sea', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1989 - The Little Mermaid/06 Under The Sea.mp3'},
  {'icon': iconImage, 'title': '07 Part Of Your World (reprise)', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1989 - The Little Mermaid/07 Part Of Your World (Reprise).mp3'},
  {'icon': iconImage, 'title': '08 Poor Unfortunate Souls', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1989 - The Little Mermaid/08 Poor Unfortunate Souls.mp3'},
  {'icon': iconImage, 'title': '09 Les Poissons', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1989 - The Little Mermaid/09 Les Poissons.mp3'},
  {'icon': iconImage, 'title': '10 Kiss The Girl', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1989 - The Little Mermaid/10 Kiss The Girl.mp3'},
  {'icon': iconImage, 'title': '13 The Storm', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1989 - The Little Mermaid/13 The Storm.mp3'},
  {'icon': iconImage, 'title': '15 Flotsam And Jetsam', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1989 - The Little Mermaid/15 Flotsam And Jetsam.mp3'},
  {'icon': iconImage, 'title': '17 Bedtime', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1989 - The Little Mermaid/17 Bedtime.mp3'},
  {'icon': iconImage, 'title': '18 Wedding Announcement', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1989 - The Little Mermaid/18 Wedding Announcement.mp3'},
  {'icon': iconImage, 'title': 'A Whole New World', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1994 - Aladdin/A Whole New World.mp3'},
  {'icon': iconImage, 'title': 'Albert', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Albert.mp3'},
  {'icon': iconImage, 'title': 'Arabian Nights', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1994 - Aladdin/Arabian Nights.mp3'},
  {'icon': iconImage, 'title': 'At The Beginning', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/At The Beginning.mp3'},
  {'icon': iconImage, 'title': 'At The Beginning', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/At The Beginning.mp4'},
  {'icon': iconImage, 'title': 'Be Prepared', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1994 - The Lion King/Be Prepared.mp3'},
  {'icon': iconImage, 'title': 'Be Prepared', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1994 - The Lion King/Be Prepared.mp4'},
  {'icon': iconImage, 'title': 'Beauty And The Beast', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1991- Beauty And The Beast/Beauty And The Beast.mp3'},
  {'icon': iconImage, 'title': 'Beauty And The Beast Duet', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1991- Beauty And The Beast/Beauty And The Beast duet.mp3'},
  {'icon': iconImage, 'title': 'Can You Feel The Love Tonight', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1994 - The Lion King/Can you feel the love tonight.mp3'},
  {'icon': iconImage, 'title': 'Can You Feel The Love Tonight End Title', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1994 - The Lion King/Can you feel the love tonight end title.mp3'},
  {'icon': iconImage, 'title': 'Circle Of Life', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1994 - The Lion King/Circle of life.mp3'},
  {'icon': iconImage, 'title': 'Ducks', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Ducks.mp3'},
  {'icon': iconImage, 'title': 'Friend Like Me', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1994 - Aladdin/Friend Like Me.mp3'},
  {'icon': iconImage, 'title': 'Hey Mr Taliban', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Hey Mr Taliban.mp3'},
  {'icon': iconImage, 'title': 'I Just Cant Wait To Be King', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1994 - The Lion King/I just cant wait to be king.mp3'},
  {'icon': iconImage, 'title': 'Ice Age', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Ice Age.mp3'},
  {'icon': iconImage, 'title': 'Ivan Dobsky Theme', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Monkey Dust/Ivan Dobsky theme.mp3'},
  {'icon': iconImage, 'title': 'King Of Pride Rock', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1994 - The Lion King/King of pride rock.mp3'},
  {'icon': iconImage, 'title': 'Kyles Moms A Bech', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Kyle%27s Mom%27s A Bech.mp3'},
  {'icon': iconImage, 'title': 'Menuet', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Menuet.mp3'},
  {'icon': iconImage, 'title': 'Ode Of Joy', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Ode of joy.mp3'},
  {'icon': iconImage, 'title': 'Once Upon A December', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Once Upon a December.mp3'},
  {'icon': iconImage, 'title': 'Paperman', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Paperman.mp3'},
  {'icon': iconImage, 'title': 'Prince Ali', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1994 - Aladdin/Prince Ali.mp3'},
  {'icon': iconImage, 'title': 'Prologue', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1991- Beauty And The Beast/Prologue.mp3'},
  {'icon': iconImage, 'title': 'Send Me On My Way', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Send Me On My Way.mp3'},
  {'icon': iconImage, 'title': 'Send Me On My Way', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Send Me On My Way.mp4'},
  {'icon': iconImage, 'title': 'South Park', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/South park.mp3'},
  {'icon': iconImage, 'title': 'Tanec Malenkih Utyat', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Tanec malenkih utyat.mp3'},
  {'icon': iconImage, 'title': 'This Land', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1994 - The Lion King/This land.mp3'},
  {'icon': iconImage, 'title': 'To Die For', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1994 - The Lion King/To Die For.mp3'},
  {'icon': iconImage, 'title': 'Transformation', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1991- Beauty And The Beast/Transformation.mp3'},
  {'icon': iconImage, 'title': 'Under The Stars', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1994 - The Lion King/Under The Stars.mp3'},
  {'icon': iconImage, 'title': 'West Wing', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/1991- Beauty And The Beast/West wing.mp3'},
  {'icon': iconImage, 'title': 'А Как Известно Мы Народ Горячий!', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/А, Как Известно, Мы Народ Горячий!.mp3'},
  {'icon': iconImage, 'title': 'А Мoжет Быть Ворона', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/А мoжет быть, ворона.mp3'},
  {'icon': iconImage, 'title': 'А Я Все Чаще Замечаю', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/А я все чаще замечаю.wav'},
  {'icon': iconImage, 'title': 'Антошка', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Антошка.mp3'},
  {'icon': iconImage, 'title': 'Бабки Ежки', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Бабки-ежки.mp3'},
  {'icon': iconImage, 'title': 'Бандитто Сеньеритто', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Бандитто - Сеньеритто.mp3'},
  {'icon': iconImage, 'title': 'Белочка', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Белочка.mp3'},
  {'icon': iconImage, 'title': 'Белый Город', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Белый город.mp3'},
  {'icon': iconImage, 'title': 'Бемби', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Бемби.mp3'},
  {'icon': iconImage, 'title': 'Бременские Музыканты', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Бременские музыканты.mp3'},
  {'icon': iconImage, 'title': 'Буратино', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Буратино.mp3'},
  {'icon': iconImage, 'title': 'Вместе Весело Шагать', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Вместе весело шагать.mp3'},
  {'icon': iconImage, 'title': 'Голубой Вагон', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Голубой вагон.mp3'},
  {'icon': iconImage, 'title': 'Горец', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Горец.mp3'},
  {'icon': iconImage, 'title': 'Дорожная', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Дорожная.mp3'},
  {'icon': iconImage, 'title': 'Друг', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Друг.wav'},
  {'icon': iconImage, 'title': 'Кoшки Мышки', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Кoшки мышки.mp3'},
  {'icon': iconImage, 'title': 'Кабы Не Было Зимы', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Кабы не было зимы.mp3'},
  {'icon': iconImage, 'title': 'Колыбельная Медведицы', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Колыбельная медведицы.mp3'},
  {'icon': iconImage, 'title': 'Конь', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Конь.mp3'},
  {'icon': iconImage, 'title': 'Лесной Олень', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Лесной олень.mp3'},
  {'icon': iconImage, 'title': 'Летучий Корабль', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Летучий корабль.mp3'},
  {'icon': iconImage, 'title': 'Мамонтенок', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Мамонтенок.mp3'},
  {'icon': iconImage, 'title': 'Мечта', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Мечта.mp3'},
  {'icon': iconImage, 'title': 'Молодецмолодец', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Молодец,молодец.mp3'},
  {'icon': iconImage, 'title': 'Морскя Песня', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Морскя песня.mp3'},
  {'icon': iconImage, 'title': 'Нeсси', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Нeсси.mp3'},
  {'icon': iconImage, 'title': 'Настоящий Друг', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Настоящий друг.mp3'},
  {'icon': iconImage, 'title': 'Неприятность Эту Мы Переживем', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Неприятность эту мы переживем.mp3'},
  {'icon': iconImage, 'title': 'Обжоры', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Обжоры.mp3'},
  {'icon': iconImage, 'title': 'Облака', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Облака.mp3'},
  {'icon': iconImage, 'title': 'Остров Сокровищ', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Остров сокровищ.mp3'},
  {'icon': iconImage, 'title': 'Пoдарки', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Пoдарки.mp3'},
  {'icon': iconImage, 'title': 'Парад Заграничных Певцов', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Парад заграничных певцов.mp3'},
  {'icon': iconImage, 'title': 'Песенка Мамонтёнка', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Песенка мамонтёнка.mp3'},
  {'icon': iconImage, 'title': 'Песня Атаманши', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Песня Атаманши.mp3'},
  {'icon': iconImage, 'title': 'Песня Крокодила', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Песня крокодила.mp3'},
  {'icon': iconImage, 'title': 'Песня Охранников', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Песня охранников.mp3'},
  {'icon': iconImage, 'title': 'Песня Про Мальчика Бобби', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Песня про мальчика Бобби.mp4'},
  {'icon': iconImage, 'title': 'Песня Пуха', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Песня Пуха.mp3'},
  {'icon': iconImage, 'title': 'Прекрасное Далеко', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Прекрасное далеко.mp3'},
  {'icon': iconImage, 'title': 'Про Папу', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Про папу.mp3'},
  {'icon': iconImage, 'title': 'Про Сыщика', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Про сыщика.mp3'},
  {'icon': iconImage, 'title': 'Рoждественская', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Рoждественская.mp3'},
  {'icon': iconImage, 'title': 'Романтики С Большой Дороги', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Романтики с большой дороги.mp3'},
  {'icon': iconImage, 'title': 'Снегурочка', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Снегурочка.mp3'},
  {'icon': iconImage, 'title': 'Солнце Взошло', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Солнце взошло.mp3'},
  {'icon': iconImage, 'title': 'Спокойной Ночи', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Спокойной ночи.mp3'},
  {'icon': iconImage, 'title': 'Супер Сучная Сучара', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Супер сучная сучара.mp3'},
  {'icon': iconImage, 'title': 'Считайте Меня Гадом', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Считайте меня гадом.mp3'},
  {'icon': iconImage, 'title': 'Три Белых Коня', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Три белых коня.mp3'},
  {'icon': iconImage, 'title': 'Улыбка', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Улыбка.mp3'},
  {'icon': iconImage, 'title': 'Частушки', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Частушки.wav'},
  {'icon': iconImage, 'title': 'Чебурашка', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Чебурашка.mp3'},
  {'icon': iconImage, 'title': 'Чунга Чанга', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Чунга-чанга.mp3'},
  {'icon': iconImage, 'title': 'Шапокляк', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Шапокляк.mp3'},
  {'icon': iconImage, 'title': 'Шкoла', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Шкoла.mp3'},
  {'icon': iconImage, 'title': 'Ясный День', 'file': '../../../../../../../../F:/MUSIK/Песни из Мультфильмов/Ясный день.mp3'},
]);
})

document.getElementById('секрет').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Алиса', 'file': '../../../../../../../../F:/MUSIK/Секрет/Алиса.mp3'},
  {'icon': iconImage, 'title': 'В Жарких Странах', 'file': '../../../../../../../../F:/MUSIK/Секрет/В Жарких Странах.mp3'},
  {'icon': iconImage, 'title': 'Любовь На Пятом Этаже', 'file': '../../../../../../../../F:/MUSIK/Секрет/Любовь на пятом этаже.mp3'},
  {'icon': iconImage, 'title': 'Привет', 'file': '../../../../../../../../F:/MUSIK/Секрет/Привет.mp3'},
]);
})

document.getElementById('старыепесни').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '002 09 Splyashem Peggi!', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1971 - 1975 - Квинтет под управлением С.Никитина/002-09-Splyashem, Peggi!.mp3'},
  {'icon': iconImage, 'title': '002 16 Babushka Pirata', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1971 - 1975 - Квинтет под управлением С.Никитина/002-16-Babushka pirata.mp3'},
  {'icon': iconImage, 'title': '002 22 Na Dalyokoy Amazonke', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1971 - 1975 - Квинтет под управлением С.Никитина/002-22-Na dalyokoy Amazonke.mp3'},
  {'icon': iconImage, 'title': '004 10 Aleksandra', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1997 - Брич-Мулла/004-10-Aleksandra.mp3'},
  {'icon': iconImage, 'title': '005 01 Pole Chudes', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1998 - Девочка и пластилин/005-01-Pole chudes.mp3'},
  {'icon': iconImage, 'title': '005 02 Kakoe Nebo Goluboe', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1998 - Девочка и пластилин/005-02-Kakoe nebo goluboe.mp3'},
  {'icon': iconImage, 'title': '005 03 Pesenka Tortili', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1998 - Девочка и пластилин/005-03-Pesenka Tortili.mp3'},
  {'icon': iconImage, 'title': '005 09 Samaya Pervaya Pesnya', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1998 - Девочка и пластилин/005-09-Samaya pervaya pesnya.mp3'},
  {'icon': iconImage, 'title': '005 22 Konchayte Vashi Preniya', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1998 - Девочка и пластилин/005-22-Konchayte vashi preniya.mp3'},
  {'icon': iconImage, 'title': '007 01 Pod Muziku Vivaldi', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1971 - 1975 - Квинтет под управлением С.Никитина/007-01-Pod muziku Vivaldi.mp3'},
  {'icon': iconImage, 'title': '007 02 Kajdiy Vibiraet Dlya Sebya', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1998 - Is serii Rossiyskie Bardy/007-02-Kajdiy vibiraet dlya sebya.mp3'},
  {'icon': iconImage, 'title': '007 07 Sneg Idyot', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1998 - Is serii Rossiyskie Bardy/007-07-Sneg idyot.mp3'},
  {'icon': iconImage, 'title': '007 22 Samaya Pervaya Pesnya', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1998 - Девочка и пластилин/007-22-Samaya pervaya pesnya.mp3'},
  {'icon': iconImage, 'title': '007 23 Grustniy Marsh Byurokratov', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1998 - Is serii Rossiyskie Bardy/007-23-Grustniy marsh byurokratov.mp3'},
  {'icon': iconImage, 'title': '013 А Фрейндлих У Природы Нет Плохой Погоды', 'file': '../../../../../../../../F:/MUSIK/Старые песни/70-Х/013 А.ФРЕЙНДЛИХ-У ПРИРОДЫ НЕТ ПЛОХОЙ ПОГОДЫ.MP3'},
  {'icon': iconImage, 'title': '040 Gilla Jonny', 'file': '../../../../../../../../F:/MUSIK/Старые песни/70-Х/040 GILLA-JONNY.MP3'},
  {'icon': iconImage, 'title': '067 Лейся Песня Кто Тебе Сказал', 'file': '../../../../../../../../F:/MUSIK/Старые песни/70-Х/067 ЛЕЙСЯ ПЕСНЯ-КТО ТЕБЕ СКАЗАЛ.MP3'},
  {'icon': iconImage, 'title': '07', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Избранное/07.mp3'},
  {'icon': iconImage, 'title': '070 Chilly Tic Tic Tac ', 'file': '../../../../../../../../F:/MUSIK/Старые песни/70-Х/070 CHILLY-TIC, TIC, TAC-.MP3'},
  {'icon': iconImage, 'title': '084 Gloria Gaynor I Will Survive', 'file': '../../../../../../../../F:/MUSIK/Старые песни/70-Х/084 GLORIA GAYNOR-I WILL SURVIVE.MP3'},
  {'icon': iconImage, 'title': '18 Лет Спустя', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1986 - 1988 - Былое/18 лет спустя.mp3'},
  {'icon': iconImage, 'title': '38 Узлов', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/38 узлов.mp3'},
  {'icon': iconImage, 'title': '38 Узлов', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1983 - Новые песни/38 узлов .mp3'},
  {'icon': iconImage, 'title': '9 Вал', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Иваси/Альма-Матерь/9 вал.mp3'},
  {'icon': iconImage, 'title': 'Ak16', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/AK16.MP3'},
  {'icon': iconImage, 'title': 'Armonie', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Bethoven & others/Armonie.mp3'},
  {'icon': iconImage, 'title': 'Go Down Moses', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Go Down Moses.mp3'},
  {'icon': iconImage, 'title': 'Leisya Pesnya Sinii Inii', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Синяя птица/Leisya Pesnya - Sinii Inii.mp3'},
  {'icon': iconImage, 'title': 'Madonna', 'file': '../../../../../../../../F:/MUSIK/Старые песни/80-Х/Madonna.mp3'},
  {'icon': iconImage, 'title': 'Ne Cip Mne Coli', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Вячеслав Добрынин/Ne Cip Mne Coli.mp3'},
  {'icon': iconImage, 'title': 'One Way Ticket', 'file': '../../../../../../../../F:/MUSIK/Старые песни/One way ticket.mp4'},
  {'icon': iconImage, 'title': 'Sixteen Tons', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Sixteen Tons.mp3'},
  {'icon': iconImage, 'title': 'Strangers In The Night', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Strangers In The Night.mp3'},
  {'icon': iconImage, 'title': 'The Phantom Of The Opera', 'file': '../../../../../../../../F:/MUSIK/Старые песни/The Phantom Of The Opera.mp3'},
  {'icon': iconImage, 'title': 'Zimnii Sad', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Zimnii sad.mp3'},
  {'icon': iconImage, 'title': 'А Может Не Было Войныi', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1986 - 1988 - Былое/А, может, не было войныi.mp3'},
  {'icon': iconImage, 'title': 'А Снег Идет', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А снег идет.mp3'},
  {'icon': iconImage, 'title': 'Агент 007', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Агент 007.WAV'},
  {'icon': iconImage, 'title': 'Аист На Крыше', 'file': '../../../../../../../../F:/MUSIK/Старые песни/София Ротару/Аист на крыше.MP3'},
  {'icon': iconImage, 'title': 'Александра', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1997 - Брич-Мулла/Александра.WAV'},
  {'icon': iconImage, 'title': 'Александра1', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1997 - Брич-Мулла/Александра1.mp3'},
  {'icon': iconImage, 'title': 'Аленушка', 'file': '../../../../../../../../F:/MUSIK/Старые песни/DOLSKI/Старинные часы/Аленушка.MP3'},
  {'icon': iconImage, 'title': 'Альма Матерь', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Иваси/Альма-Матерь/Альма-матерь.mp3'},
  {'icon': iconImage, 'title': 'Альмаматерь', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Городницкий/Альмаматерь.mp3'},
  {'icon': iconImage, 'title': 'Амазонка', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Берковский/Амазонка.WAV'},
  {'icon': iconImage, 'title': 'Антисемиты', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Антисемиты.mp3'},
  {'icon': iconImage, 'title': 'Апрель', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Суханов/Апрель.mp3'},
  {'icon': iconImage, 'title': 'Арбат', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/FIRST_LV/Арбат.MP3'},
  {'icon': iconImage, 'title': 'Архиолог', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Архиолог.mp3'},
  {'icon': iconImage, 'title': 'Атланты', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Городницкий/Атланты.WAV'},
  {'icon': iconImage, 'title': 'Ах Какая Женщина', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Ах, какая женщина.mp3'},
  {'icon': iconImage, 'title': 'Ахвремявремя', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Иваси/Альма-Матерь/Ах,время,время.mp3'},
  {'icon': iconImage, 'title': 'Ахсамара Городок (в Готовцева)', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Огней так много золотых/Ах,Самара-городок (В.Готовцева).WAV'},
  {'icon': iconImage, 'title': 'Бал Маскарад', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Бал-маскарад.mp3'},
  {'icon': iconImage, 'title': 'Баловалась Вечером Гитарой Тишина ', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1983 - Новые песни/Баловалась вечером гитарой тишина....mp3'},
  {'icon': iconImage, 'title': 'Бежит Река', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1999 - Со мною вот что происходит/Бежит река.mp3'},
  {'icon': iconImage, 'title': 'Белые Розы', 'file': '../../../../../../../../F:/MUSIK/Старые песни/80-Х/Белые розы.mp3'},
  {'icon': iconImage, 'title': 'Белый Теплоход', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Синяя птица/Белый теплоход .WAV'},
  {'icon': iconImage, 'title': 'Бережкарики', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Иваси/Бережкарики/Бережкарики.mp3'},
  {'icon': iconImage, 'title': 'Бери Шинель', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/DISK1/Бери шинель.MP3'},
  {'icon': iconImage, 'title': 'Боксер', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Париж/Боксер.mp3'},
  {'icon': iconImage, 'title': 'Большой Секрет', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/2002 - Резиновий ежик/Большой секрет.mp3'},
  {'icon': iconImage, 'title': 'Большой Секрет Для Маленькой Компании', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/2002 - Резиновий ежик/Большой секрет для маленькой компании.mp3'},
  {'icon': iconImage, 'title': 'Большой Собачий Секрет', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/2002 - Резиновий ежик/Большой собачий секрет.mp3'},
  {'icon': iconImage, 'title': 'Боцман', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Иваси/Альма-Матерь/Боцман.mp3'},
  {'icon': iconImage, 'title': 'Братские Могилы', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Братские могилы.mp3'},
  {'icon': iconImage, 'title': 'Брич Мула', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1997 - Брич-Мулла/Брич-Мула.WAV'},
  {'icon': iconImage, 'title': 'Брич Мулла', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1997 - Брич-Мулла/Брич-Мулла.mp3'},
  {'icon': iconImage, 'title': 'В Высоцкий', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/В. Высоцкий.mp4'},
  {'icon': iconImage, 'title': 'В Далеком Созвездии Тау Кита', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/В далеком созвездии Тау Кита.mp3'},
  {'icon': iconImage, 'title': 'В Землянке', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Песни военных лет/В землянке.mp3'},
  {'icon': iconImage, 'title': 'В Куски Разлетелася Корона', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/В куски разлетелася корона.mp3'},
  {'icon': iconImage, 'title': 'В Ночном Лесу', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Юрий Лорес/В ночном лесу.MP3'},
  {'icon': iconImage, 'title': 'В Полях Под Снегом И Дождем', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Александр Градский/В полях под снегом и дождем.WAV'},
  {'icon': iconImage, 'title': 'В Путь', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Советская патриотическая/В путь.mp3'},
  {'icon': iconImage, 'title': 'В Салуне Севен Муне', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/В салуне Севен Муне .MP3'},
  {'icon': iconImage, 'title': 'В Суету Городов', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/В суету городов.WAV'},
  {'icon': iconImage, 'title': 'Вальс 37 Го Года', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1984 - Концерт в Воркуте/Вальс 37-го года.mp3'},
  {'icon': iconImage, 'title': 'Вальс Бостон', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1984 - Концерт в Воркуте/Вальс-бостон .mp3'},
  {'icon': iconImage, 'title': 'Вальс На Плоскости', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1986 - 1988 - Былое/Вальс на плоскости.mp3'},
  {'icon': iconImage, 'title': 'Вальс Расставания', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Вальс расставания.mp3'},
  {'icon': iconImage, 'title': 'Варяг', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Советская патриотическая/Варяг.mp3'},
  {'icon': iconImage, 'title': 'Ваше Благородие', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/DISK2/Ваше благородие.MP3'},
  {'icon': iconImage, 'title': 'Вечер Бродит', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Вечер бродит.mp3'},
  {'icon': iconImage, 'title': 'Вещая Судьба', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/Вещая судьба.mp3'},
  {'icon': iconImage, 'title': 'Вещая Судьба', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1986 - 1988 - Былое/Вещая судьба.mp3'},
  {'icon': iconImage, 'title': 'Виват Король!', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Виват король!.mp3'},
  {'icon': iconImage, 'title': 'Владимир Высоцкий Последний Концерт (монолог 1980)', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Владимир Высоцкий.Последний концерт (Монолог 1980).mp4'},
  {'icon': iconImage, 'title': 'Воздушный Бой', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Воздушный Бой.WAV'},
  {'icon': iconImage, 'title': 'Возьмемся Заруки', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/Земля/Возьмемся заруки.mp3'},
  {'icon': iconImage, 'title': 'Вологда', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Вологда.mp3'},
  {'icon': iconImage, 'title': 'Вологда', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Песняры/Вологда.WAV'},
  {'icon': iconImage, 'title': 'Воспоминание О Будущем', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1984 - Концерт в Воркуте/Воспоминание о будущем.mp3'},
  {'icon': iconImage, 'title': 'Вот Идет По Свету Человек Чудак', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Вот идет по свету человек-чудак.mp3'},
  {'icon': iconImage, 'title': 'Все Относительно', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Все относительно.mp3'},
  {'icon': iconImage, 'title': 'Все Пройдет', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Михаил Боярский/Все пройдет.WAV'},
  {'icon': iconImage, 'title': 'Всечто В Жизни Есть У Меня', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Самоцветы/Все,что в жизни есть у меня.mp3'},
  {'icon': iconImage, 'title': 'Встреча', 'file': '../../../../../../../../F:/MUSIK/Старые песни/DOLSKI/Концерт в Москве/Встреча.MP3'},
  {'icon': iconImage, 'title': 'Вся Жизнь Впереди', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Самоцветы/Вся жизнь впереди.mp3'},
  {'icon': iconImage, 'title': 'Высота', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Высота.mp3'},
  {'icon': iconImage, 'title': 'Гадалка', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Гадалка.mp3'},
  {'icon': iconImage, 'title': 'Гимн Российской Федерации', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Гимн Российской Федерации.mp3'},
  {'icon': iconImage, 'title': 'Гимн Ссср', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Гимн СССР.Mp3'},
  {'icon': iconImage, 'title': 'Гимнастика', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Избранное/Гимнастика.mp3'},
  {'icon': iconImage, 'title': 'Глафира', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Иваси/Альма-Матерь/Глафира.mp3'},
  {'icon': iconImage, 'title': 'Глухари', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1983 - Новые песни/Глухари .mp3'},
  {'icon': iconImage, 'title': 'Говорите Я Молчу', 'file': '../../../../../../../../F:/MUSIK/Старые песни/DOLSKI/Концерт в г.Самаре/Говорите, я молчу.MP3'},
  {'icon': iconImage, 'title': 'Голубые В Полоску Штаны', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/Голубые в полоску штаны.MP3'},
  {'icon': iconImage, 'title': 'Горизонт', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Париж/Горизонт.mp3'},
  {'icon': iconImage, 'title': 'Горная Лерическая', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Париж/Горная лерическая.mp3'},
  {'icon': iconImage, 'title': 'Госпиталь', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Париж/Госпиталь.mp3'},
  {'icon': iconImage, 'title': 'Господа Юнкер', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/DISK1/Господа юнкер.MP3'},
  {'icon': iconImage, 'title': 'Грузинская Песня', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/В США/Грузинская песня.mp3'},
  {'icon': iconImage, 'title': 'Давайте Восклицать', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/DISK2/Давайте восклицать.MP3'},
  {'icon': iconImage, 'title': 'Две Судьбы', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Две судьбы .WAV'},
  {'icon': iconImage, 'title': 'Две Судьбы', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Две судьбы.WAV'},
  {'icon': iconImage, 'title': 'Дворник Степанов', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Иваси/Бережкарики/Дворник Степанов.mp3'},
  {'icon': iconImage, 'title': 'Дела', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Дела.mp3'},
  {'icon': iconImage, 'title': 'Дело Было В Ресторане', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1983 - Новые песни/Дело было в ресторане.mp3'},
  {'icon': iconImage, 'title': 'День Победы', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Лев Лещенко/День Победы.mp3'},
  {'icon': iconImage, 'title': 'День Победы', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Песни военных лет/День Победы.mp3'},
  {'icon': iconImage, 'title': 'Детектива', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Детектива.mp3'},
  {'icon': iconImage, 'title': 'Джим Койот', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/Джим Койот.MP3'},
  {'icon': iconImage, 'title': 'Джин', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Джин.mp3'},
  {'icon': iconImage, 'title': 'Джон', 'file': '../../../../../../../../F:/MUSIK/Старые песни/DOLSKI/Ленинградские акварели/Джон.MP3'},
  {'icon': iconImage, 'title': 'До Свиданья Дорогие', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Берковский/До свиданья, дорогие.WAV'},
  {'icon': iconImage, 'title': 'Дожди', 'file': '../../../../../../../../F:/MUSIK/Старые песни/DOLSKI/Старинные часы/Дожди.mp3'},
  {'icon': iconImage, 'title': 'Дом', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Париж/Дом.mp3'},
  {'icon': iconImage, 'title': 'Дом Хрустальный', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Избранное/Дом хрустальный.mp3'},
  {'icon': iconImage, 'title': 'Дорога', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Суханов/Дорога.mp3'},
  {'icon': iconImage, 'title': 'Друг', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Друг.mp3'},
  {'icon': iconImage, 'title': 'Дурь', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Иваси/Бережкарики/Дурь.mp3'},
  {'icon': iconImage, 'title': 'Ежик С Дыркой В', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/2002 - Резиновий ежик/Ежик с дыркой в.mp3'},
  {'icon': iconImage, 'title': 'Есаул Молоденький', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1987 - Концерт в Нью-Йорке/Есаул молоденький.mp3'},
  {'icon': iconImage, 'title': 'Есть Только Миг', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Олег Даль/Есть только миг.mp3'},
  {'icon': iconImage, 'title': 'Еще Не Вечер', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Избранное/Еще не вечер.mp3'},
  {'icon': iconImage, 'title': 'Жираф', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Избранное/Жираф.mp3'},
  {'icon': iconImage, 'title': 'Журавли', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Журавли.WAV'},
  {'icon': iconImage, 'title': 'Журавль', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Ким/Журавль.WAV'},
  {'icon': iconImage, 'title': 'За Туманом', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Кукин/За туманом.WAV'},
  {'icon': iconImage, 'title': 'Зарисовка О Париже', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Зарисовка о Париже.WAV'},
  {'icon': iconImage, 'title': 'Заходите К Нам На Огонек', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1987 - Концерт в Нью-Йорке/Заходите к нам на огонек.mp3'},
  {'icon': iconImage, 'title': 'Звезда', 'file': '../../../../../../../../F:/MUSIK/Старые песни/DOLSKI/Старинные часы/Звезда.MP3'},
  {'icon': iconImage, 'title': 'Зеленая Карета', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Суханов/Зеленая карета.mp3'},
  {'icon': iconImage, 'title': 'Зимняя Сказка', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1967 - Квинтет под управлением С.Никитина/Зимняя сказка.mp3'},
  {'icon': iconImage, 'title': 'Зойка', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1983 - Новые песни/Зойка.mp3'},
  {'icon': iconImage, 'title': 'Золотое Сердце', 'file': '../../../../../../../../F:/MUSIK/Старые песни/София Ротару/Золотое сердце.MP3'},
  {'icon': iconImage, 'title': 'Извозчик', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1982 - Концерт, посвященный памяти А. Северного/Извозчик .mp3'},
  {'icon': iconImage, 'title': 'Инопланетяне', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Инопланетяне.mp3'},
  {'icon': iconImage, 'title': 'Исторический Роман', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/Париж/Исторический роман.mp3'},
  {'icon': iconImage, 'title': 'К Вершине', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/К вершине.mp3'},
  {'icon': iconImage, 'title': 'К Чему Нам Быть На Ты', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/DISK3/К чему нам быть на %27ты%27.mp3'},
  {'icon': iconImage, 'title': 'Кабачок Одноглазого Гарри', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/Кабачок одноглазого Гарри.MP3'},
  {'icon': iconImage, 'title': 'Кавалергарды', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/DISK3/Кавалергарды.mp3'},
  {'icon': iconImage, 'title': 'Каждый Выбирает По Себе', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1998 - Is serii Rossiyskie Bardy/Каждый выбирает по себе.mp3'},
  {'icon': iconImage, 'title': 'Казачья', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/Казачья.mp3'},
  {'icon': iconImage, 'title': 'Казачья', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1983 - Новые песни/Казачья.mp3'},
  {'icon': iconImage, 'title': 'Как Здорово', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Митяев/Как здорово.WAV'},
  {'icon': iconImage, 'title': 'Как На Гриф Резной ', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1983 - Новые песни/Как на гриф резной....mp3'},
  {'icon': iconImage, 'title': 'Как То Раз Пришел Домой', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/Как-то раз пришел домой.MP3'},
  {'icon': iconImage, 'title': 'Какое Небо Голубое', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1998 - Девочка и пластилин/Какое небо голубое.mp3'},
  {'icon': iconImage, 'title': 'Какой То Бред', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Какой то бред.WAV'},
  {'icon': iconImage, 'title': 'Камикадзе', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1996 - Концерт в день рождения/Камикадзе.WAV'},
  {'icon': iconImage, 'title': 'Капитан', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Ким/Капитан.mp3'},
  {'icon': iconImage, 'title': 'Капли Датского Короля', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/DISK1/Капли датского короля.MP3'},
  {'icon': iconImage, 'title': 'Касандра', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Париж/Касандра.mp3'},
  {'icon': iconImage, 'title': 'Катюша', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Песни военных лет/Катюша.MP3'},
  {'icon': iconImage, 'title': 'Клен', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Синяя птица/Клен.mp3'},
  {'icon': iconImage, 'title': 'Когда Лампа Разбита', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Суханов/Когда лампа разбита.mp3'},
  {'icon': iconImage, 'title': 'Козел Отпущения', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Париж/Козел отпущения.mp3'},
  {'icon': iconImage, 'title': 'Колея', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Париж/Колея.mp3'},
  {'icon': iconImage, 'title': 'Колодец', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Колодец.mp3'},
  {'icon': iconImage, 'title': 'Колокльчик', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Суханов/Колокльчик.mp3'},
  {'icon': iconImage, 'title': 'Комарово', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Комарово.mp3'},
  {'icon': iconImage, 'title': 'Комарово', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Игорь Скляр/Комарово.mp3'},
  {'icon': iconImage, 'title': 'Кони', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Избранное/Кони.mp3'},
  {'icon': iconImage, 'title': 'Корабли', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Избранное/Корабли.mp3'},
  {'icon': iconImage, 'title': 'Корнет', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/DISK3/Корнет.mp3'},
  {'icon': iconImage, 'title': 'Королева Красоты', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Муслим Магомаев/Королева красоты.WAV'},
  {'icon': iconImage, 'title': 'Король', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Дулов/Король.WAV'},
  {'icon': iconImage, 'title': 'Косил Ясь Конюшину', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Песняры/Косил Ясь конюшину.WAV'},
  {'icon': iconImage, 'title': 'Красная Стена', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1986 - 1988 - Былое/Красная стена .mp3'},
  {'icon': iconImage, 'title': 'Кругом 500', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Париж/Кругом 500.mp3'},
  {'icon': iconImage, 'title': 'Кто Сказал Все Сгорело Дотла', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Кто сказал все сгорело дотла.WAV'},
  {'icon': iconImage, 'title': 'Кубанская Казачья', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1986 - 1988 - Былое/Кубанская казачья.mp3'},
  {'icon': iconImage, 'title': 'Куплеты Курочкина (в Доронин)', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Огней так много золотых/Куплеты Курочкина (В.Доронин).WAV'},
  {'icon': iconImage, 'title': 'Ладони На Глазах', 'file': '../../../../../../../../F:/MUSIK/Старые песни/DOLSKI/Ленинградские акварели/Ладони на глазах.MP3'},
  {'icon': iconImage, 'title': 'Ландыши', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Ландыши.MP3'},
  {'icon': iconImage, 'title': 'Лейся Песня На Просторе', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Лейся песня на просторе.mp3'},
  {'icon': iconImage, 'title': 'Ленинградские Акварели', 'file': '../../../../../../../../F:/MUSIK/Старые песни/DOLSKI/Ленинградские акварели/Ленинградские акварели.MP3'},
  {'icon': iconImage, 'title': 'Лесосплав', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1983 - Новые песни/Лесосплав.mp3'},
  {'icon': iconImage, 'title': 'Лето Это Маленькая Жизнь', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Митяев/Лето это маленькая жизнь.WAV'},
  {'icon': iconImage, 'title': 'Летчик', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1961 - 1968 Охота на волков/Летчик.mp3'},
  {'icon': iconImage, 'title': 'Лирическая', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Избранное/Лирическая.mp3'},
  {'icon': iconImage, 'title': 'Лукоморье', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1967 - 1968 Лукоморье больше нет/Лукоморье.mp3'},
  {'icon': iconImage, 'title': 'Лучший Город Земли', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Муслим Магомаев/Лучший город земли.mp3'},
  {'icon': iconImage, 'title': 'Люси', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/Люси.MP3'},
  {'icon': iconImage, 'title': 'Магадан', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Париж/Магадан.mp3'},
  {'icon': iconImage, 'title': 'Майдан', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/Майдан.WAV'},
  {'icon': iconImage, 'title': 'Майский Вальс', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Песни военных лет/Майский вальс.mp3'},
  {'icon': iconImage, 'title': 'Майский Вальс', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Майский вальс.mp4'},
  {'icon': iconImage, 'title': 'Маленький Принц', 'file': '../../../../../../../../F:/MUSIK/Старые песни/DOLSKI/Старинные часы/Маленький Принц.MP3'},
  {'icon': iconImage, 'title': 'Малиновки Пели', 'file': '../../../../../../../../F:/MUSIK/Старые песни/DOLSKI/Ленинградские акварели/Малиновки пели.MP3'},
  {'icon': iconImage, 'title': 'Маменька', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Поперечный/Маменька.MP3'},
  {'icon': iconImage, 'title': 'Март Сумерки', 'file': '../../../../../../../../F:/MUSIK/Старые песни/DOLSKI/Старинные часы/Март. Сумерки.MP3'},
  {'icon': iconImage, 'title': 'Менуэт Старинном Стиле', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Юрий Лорес/Менуэт старинном стиле.MP3'},
  {'icon': iconImage, 'title': 'Метатель Молота', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1961 - 1968 Охота на волков/Метатель молота.mp3'},
  {'icon': iconImage, 'title': 'Метрополитен', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Иваси/Альма-Матерь/Метрополитен.mp3'},
  {'icon': iconImage, 'title': 'Микрофон', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Париж/Микрофон.mp3'},
  {'icon': iconImage, 'title': 'Мимино', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Вахтанг Кикабидзе/Мимино.WAV'},
  {'icon': iconImage, 'title': 'Мимо Текла Текла Река', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Мимо текла текла река.mp3'},
  {'icon': iconImage, 'title': 'Мне Ребята Сказали', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Мне ребята сказали.mp3'},
  {'icon': iconImage, 'title': 'Мне Твердят', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Г.Хомчик/Мне твердят.mp3'},
  {'icon': iconImage, 'title': 'Мне Этот Бой Не Забыть Ни Почем', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Мне этот бой не забыть ни почем.WAV'},
  {'icon': iconImage, 'title': 'Можжевеловый Куст', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Суханов/Можжевеловый куст.mp3'},
  {'icon': iconImage, 'title': 'Мои Года Мое Богатство', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Вахтанг Кикабидзе/Мои года-мое богатство.WAV'},
  {'icon': iconImage, 'title': 'Мой Милый', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Иваси/Альма-Матерь/Мой милый.mp3'},
  {'icon': iconImage, 'title': 'Москва Одесса', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Избранное/Москва - Одесса.mp3'},
  {'icon': iconImage, 'title': 'Моцарт', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/В США/Моцарт.mp3'},
  {'icon': iconImage, 'title': 'Моя Звезда', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Суханов/Моя звезда.mp3'},
  {'icon': iconImage, 'title': 'Музыка Нас Связала', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Мираж/Музыка нас связала.mp3'},
  {'icon': iconImage, 'title': 'Муравей', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/FIRST_LV/Муравей.MP3'},
  {'icon': iconImage, 'title': 'Мы Вращаем Землю', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Избранное/Мы вращаем землю.mp3'},
  {'icon': iconImage, 'title': 'Мы Вращаем Землю', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Мы вращаем Землю.mp4'},
  {'icon': iconImage, 'title': 'Мы Говорим Не Штормы', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Мы говорим не штормы.WAV'},
  {'icon': iconImage, 'title': 'Мы Желаем Счастья Вам', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Цветы/Мы желаем счастья вам.MP3'},
  {'icon': iconImage, 'title': 'Мы С Тобой Давно Уже Не Те', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Мы с тобой давно уже не те.mp3'},
  {'icon': iconImage, 'title': 'На Большом Каретном', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/На большом каретном.WAV'},
  {'icon': iconImage, 'title': 'На Нейтральной Полосе', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/На  нейтральной полосе.mp3'},
  {'icon': iconImage, 'title': 'На Перовском На Базаре', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/На Перовском на базаре.mp3'},
  {'icon': iconImage, 'title': 'На Теплоходе Музыка Играет', 'file': '../../../../../../../../F:/MUSIK/Старые песни/На теплоходе музыка играет.mp3'},
  {'icon': iconImage, 'title': 'На Улице Марата', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1983 - Новые песни/На улице Марата.mp3'},
  {'icon': iconImage, 'title': 'Надежда', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Анна Герман/Надежда.mp3'},
  {'icon': iconImage, 'title': 'Надежда', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Избранное/Надежда.mp3'},
  {'icon': iconImage, 'title': 'Надежды Маенький Оркестрик', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/FIRST_LV/Надежды маенький оркестрик.MP3'},
  {'icon': iconImage, 'title': 'Надоело', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/Надоело.mp3'},
  {'icon': iconImage, 'title': 'Налетела Грусть', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1986 - 1988 - Былое/Налетела грусть.mp3'},
  {'icon': iconImage, 'title': 'Наш Сосед', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Наш сосед .mp3'},
  {'icon': iconImage, 'title': 'Наши Предки', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1961 - 1968 Охота на волков/Наши предки.mp3'},
  {'icon': iconImage, 'title': 'Не Волнуйтесь Тетя', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Веселые ребята/Не волнуйтесь тетя.mp3'},
  {'icon': iconImage, 'title': 'Не Все То Золото', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/DISK2/Не все то золото.MP3'},
  {'icon': iconImage, 'title': 'Не Надо Печалиться', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Пламя/Не надо печалиться.mp3'},
  {'icon': iconImage, 'title': 'Не Понимаем', 'file': '../../../../../../../../F:/MUSIK/Старые песни/DOLSKI/Ленинградские акварели/Не понимаем.MP3'},
  {'icon': iconImage, 'title': 'Непутевка', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Иваси/Бережкарики/Непутевка.mp3'},
  {'icon': iconImage, 'title': 'Нету Времени', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1983 - Посвящение посвящающим/Нету времени .mp3'},
  {'icon': iconImage, 'title': 'Неуловимый Джо', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/Неуловимый Джо .MP3'},
  {'icon': iconImage, 'title': 'Нечисть', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Нечисть.mp3'},
  {'icon': iconImage, 'title': 'О Славный Миг', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Городницкий/О славный миг.mp3'},
  {'icon': iconImage, 'title': 'Огонь', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/Земля/Огонь.mp3'},
  {'icon': iconImage, 'title': 'Одесса', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1961 - 1968 Охота на волков/Одесса.mp3'},
  {'icon': iconImage, 'title': 'Один Раз В Год Сады Цветут', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Анна Герман/Один раз в год сады цветут.mp3'},
  {'icon': iconImage, 'title': 'Одиночество', 'file': '../../../../../../../../F:/MUSIK/Старые песни/DOLSKI/Концерт в г.Самаре/Одиночество.MP3'},
  {'icon': iconImage, 'title': 'Одна Научная Загадка', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Одна научная загадка.WAV'},
  {'icon': iconImage, 'title': 'Оклахома', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/Оклахома.MP3'},
  {'icon': iconImage, 'title': 'Октябрь', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Октябрь.mp3'},
  {'icon': iconImage, 'title': 'Оловяный Солдатик', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/Париж2/Оловяный солдатик.mp3'},
  {'icon': iconImage, 'title': 'Он Не Вернулся Из Боя', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Он не вернулся из боя.WAV'},
  {'icon': iconImage, 'title': 'Она Была В Париже', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Избранное/Она была в Париже.mp3'},
  {'icon': iconImage, 'title': 'Орден', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Орден.mp3'},
  {'icon': iconImage, 'title': 'От Прощанья До Прощанья', 'file': '../../../../../../../../F:/MUSIK/Старые песни/DOLSKI/Концерт в г.Самаре/От прощанья до прощанья.MP3'},
  {'icon': iconImage, 'title': 'Откровения', 'file': '../../../../../../../../F:/MUSIK/Старые песни/DOLSKI/Концерт в г.Минске ч.2/Откровения.MP3'},
  {'icon': iconImage, 'title': 'Отслужи По Мне Отслужи', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1986 - 1988 - Былое/Отслужи по мне, отслужи.mp3'},
  {'icon': iconImage, 'title': 'Отслужи По Мнеотслужи', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/Отслужи по мне,отслужи.mp3'},
  {'icon': iconImage, 'title': 'Охота На Волков', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Париж/Охота на волков.mp3'},
  {'icon': iconImage, 'title': 'Охота На Волков Франция 1977', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Охота на волков. Франция. 1977.mp4'},
  {'icon': iconImage, 'title': 'Охота С Вертолета', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Охота с вертолета.WAV'},
  {'icon': iconImage, 'title': 'Парус', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Париж/Парус.mp3'},
  {'icon': iconImage, 'title': 'Перед Выездом В Загранку', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Перед выездом в загранку.mp3'},
  {'icon': iconImage, 'title': 'Перекаты', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Городницкий/Перекаты.WAV'},
  {'icon': iconImage, 'title': 'Переселение Душ', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Избранное/Переселение душ.mp3'},
  {'icon': iconImage, 'title': 'Песня Завистника', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Песня завистника.mp3'},
  {'icon': iconImage, 'title': 'Песня Застенчивого Гусара', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Александр Быканов/Песня застенчивого гусара.mp3'},
  {'icon': iconImage, 'title': 'Песня Извозчика', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Песня извозчика.mp3'},
  {'icon': iconImage, 'title': 'Песня Коня Цыганских Кровей', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1983 - Новые песни/Песня коня цыганских кровей.mp3'},
  {'icon': iconImage, 'title': 'Песня О Вещем Олеге', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Песня о вещем Олеге.mp3'},
  {'icon': iconImage, 'title': 'Пианист', 'file': '../../../../../../../../F:/MUSIK/Старые песни/DOLSKI/Старинные часы/Пианист.MP3'},
  {'icon': iconImage, 'title': 'Пингвины (виа Аккорд)', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Королева красоты/Пингвины (ВИА Аккорд).WAV'},
  {'icon': iconImage, 'title': 'Плач По Брату', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1999 - Со мною вот что происходит/Плач по брату.mp3'},
  {'icon': iconImage, 'title': 'Плод Что Неспел', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Париж/Плод, что неспел.mp3'},
  {'icon': iconImage, 'title': 'По Диким Степям Аризоны', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/По диким степям Аризоны.MP3'},
  {'icon': iconImage, 'title': 'По Новому', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Митяев/По новому.mp3'},
  {'icon': iconImage, 'title': 'По Прерии Вдоль Железной Дороги', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/По прерии вдоль железной дороги.MP3'},
  {'icon': iconImage, 'title': 'По Снегу Летящему С Неба', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1983 - Новые песни/По снегу, летящему с неба.mp3'},
  {'icon': iconImage, 'title': 'По Цареву Повелению', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1961 - 1968 Охота на волков/По цареву повелению.mp3'},
  {'icon': iconImage, 'title': 'Победа', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/DISK1/Победа.mp3'},
  {'icon': iconImage, 'title': 'Погоня', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Париж/Погоня.mp3'},
  {'icon': iconImage, 'title': 'Под Музыку Вивальди', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1971 - 1975 - Квинтет под управлением С.Никитина/Под музыку вивальди.WAV'},
  {'icon': iconImage, 'title': 'Пожелание', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Пожелание.mp3'},
  {'icon': iconImage, 'title': 'Пожелание', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Вахтанг Кикабидзе/Пожелание.WAV'},
  {'icon': iconImage, 'title': 'Пока Живешь На Свете', 'file': '../../../../../../../../F:/MUSIK/Старые песни/DOLSKI/Старинные часы/Пока живешь на свете.MP3'},
  {'icon': iconImage, 'title': 'Пока Земля Еще Вертится', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/FIRST_LV/Пока земля еще вертится.MP3'},
  {'icon': iconImage, 'title': 'Покойник', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Париж/Покойник.mp3'},
  {'icon': iconImage, 'title': 'Поле Чудес', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1998 - Девочка и пластилин/Поле чудес.mp3'},
  {'icon': iconImage, 'title': 'Пора По Пиву', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Иваси/Ума Палата/Пора по пиву.mp3'},
  {'icon': iconImage, 'title': 'Портлэнд', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/DISK2/Портлэнд.MP3'},
  {'icon': iconImage, 'title': 'Посвящение Посвящающим', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1983 - Посвящение посвящающим/Посвящение посвящающим.mp3'},
  {'icon': iconImage, 'title': 'Последний Нонешний Денечек', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Бичевская/Последний нонешний денечек.WAV'},
  {'icon': iconImage, 'title': 'Последняя Электричка', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Владимир Макаров/Последняя электричка.WAV'},
  {'icon': iconImage, 'title': 'Послепобедный Вальс', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1986 - 1988 - Былое/Послепобедный вальс.mp3'},
  {'icon': iconImage, 'title': 'Послушайте Все', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Послушайте все.WAV'},
  {'icon': iconImage, 'title': 'Поспел Маис На Ранчо Дяди Билла', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/Поспел маис на ранчо дяди Билла.MP3'},
  {'icon': iconImage, 'title': 'Правда И Лож', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Правда и лож.WAV'},
  {'icon': iconImage, 'title': 'Прекрасное Далеко', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Прекрасное далеко.WAV'},
  {'icon': iconImage, 'title': 'Прерия Кругом Путь Далек Лежит', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/Прерия кругом, путь далек лежит.MP3'},
  {'icon': iconImage, 'title': 'Приходит Время', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Миляев/Приходит время.WAV'},
  {'icon': iconImage, 'title': 'Про Дикого Вепря', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Про дикого вепря.mp3'},
  {'icon': iconImage, 'title': 'Про Индюка', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Суханов/Про индюка.mp3'},
  {'icon': iconImage, 'title': 'Про Йогов', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Про йогов.mp3'},
  {'icon': iconImage, 'title': 'Про Лесных Жителей', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1967 - 1968 Лукоморье больше нет/Про лесных жителей.mp3'},
  {'icon': iconImage, 'title': 'Про Черта', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Про черта.mp3'},
  {'icon': iconImage, 'title': 'Проводи Ка Меня Батя На Войну', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1987 - Концерт на ЛОМО/Проводи-ка меня, батя, на войну.mp3'},
  {'icon': iconImage, 'title': 'Проводы', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1986 - 1988 - Былое/Проводы .mp3'},
  {'icon': iconImage, 'title': 'Провожала Мене Ридна Маты', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/Провожала мене ридна маты.MP3'},
  {'icon': iconImage, 'title': 'Проложите Проложите', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Париж/Проложите проложите.mp3'},
  {'icon': iconImage, 'title': 'Прости Прощай', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/Прости-прощай.MP3'},
  {'icon': iconImage, 'title': 'Прости Прощай', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1983 - Посвящение посвящающим/Прости-прощай.mp3'},
  {'icon': iconImage, 'title': 'Прошла Пора', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Прошла пора.WAV'},
  {'icon': iconImage, 'title': 'Прощай', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Лев Лещенко/Прощай.mp3'},
  {'icon': iconImage, 'title': 'Прощай Хх Век', 'file': '../../../../../../../../F:/MUSIK/Старые песни/DOLSKI/Прощай, ХХ век/Прощай, ХХ век.MP3'},
  {'icon': iconImage, 'title': 'Прощальная', 'file': '../../../../../../../../F:/MUSIK/Старые песни/DOLSKI/Старинные часы/Прощальная.MP3'},
  {'icon': iconImage, 'title': 'Прощанье', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Ланцберг/Прощанье.mp3'},
  {'icon': iconImage, 'title': 'Прощяние С Горами', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Прощяние с горами.mp3'},
  {'icon': iconImage, 'title': 'Прыгун В Высоту', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Париж/Прыгун в высоту.mp3'},
  {'icon': iconImage, 'title': 'Птеродактель', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1998 - Девочка и пластилин/Птеродактель.mp3'},
  {'icon': iconImage, 'title': 'Разговор Подслушанный В Электричке Ленинград Мга', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1983 - Новые песни/Разговор, подслушанный в электричке Ленинград-МГА.mp3'},
  {'icon': iconImage, 'title': 'Разлука', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Егоров/Разлука.WAV'},
  {'icon': iconImage, 'title': 'Резиновий Ежик', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/2002 - Резиновий ежик/Резиновий ежик.mp3'},
  {'icon': iconImage, 'title': 'Реквием', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1983 - Новые песни/Реквием.mp3'},
  {'icon': iconImage, 'title': 'Рождение Стихов', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1987 - Концерт на ЛОМО/Рождение стихов.mp3'},
  {'icon': iconImage, 'title': 'Рождественская', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/DISK2/Рождественская.MP3'},
  {'icon': iconImage, 'title': 'Романс Генерала Чарноты', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/Романс Генерала Чарноты.MP3'},
  {'icon': iconImage, 'title': 'Романс Генерала Чарноты', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1983 - Новые песни/Романс генерала Чарноты.mp3'},
  {'icon': iconImage, 'title': 'Русская Женщина', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Митяев/Русская женщина.mp3'},
  {'icon': iconImage, 'title': 'Рэквием', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/Рэквием.mp3'},
  {'icon': iconImage, 'title': 'С Добрым Утром Любимая', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Митяев/С добрым утром любимая.mp3'},
  {'icon': iconImage, 'title': 'Свадьба', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/Свадьба.mp3'},
  {'icon': iconImage, 'title': 'Свадьба', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1983 - Новые песни/Свадьба.mp3'},
  {'icon': iconImage, 'title': 'Свадьба', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Муслим Магомаев/Свадьба.mp3'},
  {'icon': iconImage, 'title': 'Священная Война', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Песни военных лет/Священная Война.MP3'},
  {'icon': iconImage, 'title': 'Священный Бой', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Песни военных лет/Священный Бой.MP3'},
  {'icon': iconImage, 'title': 'Сегодня Не Слышно Биенья Сердец', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Сегодня не слышно биенья сердец.mp3'},
  {'icon': iconImage, 'title': 'Сегодня Не Слышно Биенья Сердец', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Сегодня не слышно биенья сердец.mp4'},
  {'icon': iconImage, 'title': 'Серебрянные Струны', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1961 - 1964 Серебрянные струны/Серебрянные струны.mp3'},
  {'icon': iconImage, 'title': 'Синий Туман', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Вячеслав Добрынин/Синий туман.WAV'},
  {'icon': iconImage, 'title': 'Сказать По Нашему Мы Выпили Немного', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Сказать по нашему мы выпили немного.WAV'},
  {'icon': iconImage, 'title': 'Скалолазка', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Избранное/Скалолазка.mp3'},
  {'icon': iconImage, 'title': 'Скачи Скачи', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/Скачи, скачи.mp3'},
  {'icon': iconImage, 'title': 'Случай На Таможне', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Случай на таможне.WAV'},
  {'icon': iconImage, 'title': 'Смуглянка Молдованка', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Песни военных лет/Смуглянка молдованка.mp3'},
  {'icon': iconImage, 'title': 'Снег', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Городницкий/Снег.WAV'},
  {'icon': iconImage, 'title': 'Сны', 'file': '../../../../../../../../F:/MUSIK/Старые песни/DOLSKI/Ленинградские акварели/Сны.MP3'},
  {'icon': iconImage, 'title': 'Со Мною Вот Что Происходит', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/1999 - Со мною вот что происходит/Со мною вот что происходит.mp3'},
  {'icon': iconImage, 'title': 'Собачий Секрет', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Никитины/2002 - Резиновий ежик/Собачий секрет.mp3'},
  {'icon': iconImage, 'title': 'Солдат', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/FIRST_LV/Солдат.MP3'},
  {'icon': iconImage, 'title': 'Солдаты Группы Центр', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Солдаты группы центр.WAV'},
  {'icon': iconImage, 'title': 'Соловьиная Роща', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Лайма Вайкуле/Соловьиная роща .MP3'},
  {'icon': iconImage, 'title': 'Соловьиная Роща', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Лев Лещенко/Соловьиная роща.mp3'},
  {'icon': iconImage, 'title': 'Спасите Наши Души', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1967 - 1968 Лукоморье больше нет/Спасите наши души.mp3'},
  {'icon': iconImage, 'title': 'Среди Берез Среднй Полосы', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/Среди берез среднй полосы.mp3'},
  {'icon': iconImage, 'title': 'Стали Женщины Нынче Крутые', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Тимур Шаов/Стали женщины нынче крутые.mp3'},
  {'icon': iconImage, 'title': 'Старая Пластинка', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Ариель/Старая пластинка.WAV'},
  {'icon': iconImage, 'title': 'Старинная Солдатская Песня', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/DISK1/Старинная солдатская песня.mp3'},
  {'icon': iconImage, 'title': 'Старые Слова', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Фельцман/Старые слова.MP3'},
  {'icon': iconImage, 'title': 'Старый Дом', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1964 - 1967 Гололед на земле, гололед/Старый дом.mp3'},
  {'icon': iconImage, 'title': 'Струны Песнями', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/Струны песнями.mp3'},
  {'icon': iconImage, 'title': 'Сюрприз Для Тети Бэкки', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Неуловимый Арчи Или Квасная Америка/Сюрприз для тети Бэкки.MP3'},
  {'icon': iconImage, 'title': 'Так Вот Какая Ты', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Синяя птица/Так вот какая ты.mp3'},
  {'icon': iconImage, 'title': 'Так Оно И Есть', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/Так оно и есть.mp3'},
  {'icon': iconImage, 'title': 'Тёмная Ночь', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Песни военных лет/Тёмная ночь.mp3'},
  {'icon': iconImage, 'title': 'Темная Ночь (м Бернес)', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Песни военных лет/Темная ночь (М.Бернес).WAV'},
  {'icon': iconImage, 'title': 'То Была Не Интрижка', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1963 - 1966 Штрафные батальоны/То была не интрижка.mp3'},
  {'icon': iconImage, 'title': 'То Была Не Интрижка', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/То была не интрижка.WAV'},
  {'icon': iconImage, 'title': 'Товарищи Ученые', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Товарищи ученые.WAV'},
  {'icon': iconImage, 'title': 'Только Так', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Иваси/Альма-Матерь/Только так.mp3'},
  {'icon': iconImage, 'title': 'Только Этого Мало', 'file': '../../../../../../../../F:/MUSIK/Старые песни/София Ротару/Только этого мало.mp3'},
  {'icon': iconImage, 'title': 'Тоткоторый Не Стрелял', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/TOPIC5/Тот,который не стрелял.WAV'},
  {'icon': iconImage, 'title': 'Три Белих Коня', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Три белих коня.WAV'},
  {'icon': iconImage, 'title': 'Тролейбус', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/FIRST_LV/Тролейбус.mp3'},
  {'icon': iconImage, 'title': 'Трубят Рога', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Трубят рога.WAV'},
  {'icon': iconImage, 'title': 'Туман', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1967 - 1968 Лукоморье больше нет/Туман.mp3'},
  {'icon': iconImage, 'title': 'Ты Мне Не Снишься', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Синяя птица/Ты мне не снишься.mp3'},
  {'icon': iconImage, 'title': 'У Меня Было 40 Фамилий', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1961 - 1968 Охота на волков/У меня было 40 фамилий.mp3'},
  {'icon': iconImage, 'title': 'Увезу Тебя Я В Тундру', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Самоцветы/Увезу тебя я в тундру.mp3'},
  {'icon': iconImage, 'title': 'Удивительный Вальс', 'file': '../../../../../../../../F:/MUSIK/Старые песни/DOLSKI/Старинные часы/Удивительный вальс.MP3'},
  {'icon': iconImage, 'title': 'Ума Палата', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Иваси/Бережкарики/Ума палата.mp3'},
  {'icon': iconImage, 'title': 'Утиная Охота', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/1983 - Новые песни/Утиная охота.mp3'},
  {'icon': iconImage, 'title': 'Утиная Охота', 'file': '../../../../../../../../F:/MUSIK/Старые песни/А.Розенбаум/Утиная охота.WAV'},
  {'icon': iconImage, 'title': 'Фламинго', 'file': '../../../../../../../../F:/MUSIK/Старые песни/DOLSKI/Ленинградские акварели/Фламинго.MP3'},
  {'icon': iconImage, 'title': 'Холода Холода', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Избранное/Холода , холода.mp3'},
  {'icon': iconImage, 'title': 'Хуторянка', 'file': '../../../../../../../../F:/MUSIK/Старые песни/София Ротару/Хуторянка.mp3'},
  {'icon': iconImage, 'title': 'Целуя Знамя Пропыленный Шелк', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Целуя знамя, пропыленный шелк.WAV'},
  {'icon': iconImage, 'title': 'Черное Золото', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Избранное/Черное золото.mp3'},
  {'icon': iconImage, 'title': 'Черные Бушлаты', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Париж/Черные бушлаты.mp3'},
  {'icon': iconImage, 'title': 'Черный Кот', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Булат.Окуджава/FIRST_LV/Черный кот.MP3'},
  {'icon': iconImage, 'title': 'Чертово Колесо', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Муслим Магомаев/Чертово колесо.mp3'},
  {'icon': iconImage, 'title': 'Честно Говоря', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Цветы/Честно говоря.MP3'},
  {'icon': iconImage, 'title': 'Честь Шахматной Короны', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Честь шахматной короны.wav'},
  {'icon': iconImage, 'title': 'Чудестная Страна', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Чудестная страна.WAV'},
  {'icon': iconImage, 'title': 'Школьный Вальс', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Школьный вальс.mp3'},
  {'icon': iconImage, 'title': 'Шулера', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/1967 - 1968 Лукоморье больше нет/Шулера.mp3'},
  {'icon': iconImage, 'title': 'Экзамен По Химии', 'file': '../../../../../../../../F:/MUSIK/Старые песни/DOLSKI/Концерт в г.Минске ч.2/Экзамен по химии.MP3'},
  {'icon': iconImage, 'title': 'Экспедиция', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Александр Градский/Экспедиция.MP3'},
  {'icon': iconImage, 'title': 'Электричка', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Электричка.mp3'},
  {'icon': iconImage, 'title': 'Эта Ночь', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Мираж/Эта ночь.mp3'},
  {'icon': iconImage, 'title': 'Эти Глаза Напротив', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Валерий Ободзинский/Эти глаза напротив.mp3'},
  {'icon': iconImage, 'title': 'Эх Раз', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Избранное/Эх раз.mp3'},
  {'icon': iconImage, 'title': 'Эхо', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Париж/Эхо.mp3'},
  {'icon': iconImage, 'title': 'Я Баба Яга', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Я баба-яга.WAV'},
  {'icon': iconImage, 'title': 'Я Буду Долго Гнать Велосипед', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Я буду долго гнать велосипед.mp3'},
  {'icon': iconImage, 'title': 'Я Люблю Этот Мир', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Самоцветы/Я люблю этот мир.WAV'},
  {'icon': iconImage, 'title': 'Я Не Могу Иначе', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Валентина Толкунова/Я не могу иначе.mp3'},
  {'icon': iconImage, 'title': 'Я Помню Райвоенкомат', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Я помню райвоенкомат.WAV'},
  {'icon': iconImage, 'title': 'Ягода Малина', 'file': '../../../../../../../../F:/MUSIK/Старые песни/Ягода малина.mp3'},
  {'icon': iconImage, 'title': 'Як Истебитель', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/Избранное/Як истебитель.mp3'},
  {'icon': iconImage, 'title': 'Ярмарка', 'file': '../../../../../../../../F:/MUSIK/Старые песни/В.Высоцкий/СD/Ярмарка.WAV'},
]);
})

document.getElementById('тату').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '30 Минут', 'file': '../../../../../../../../F:/MUSIK/Тату/30 минут.mp3'},
  {'icon': iconImage, 'title': 'All About Us', 'file': '../../../../../../../../F:/MUSIK/Тату/All about Us.mp3'},
  {'icon': iconImage, 'title': 'All The Things She Said', 'file': '../../../../../../../../F:/MUSIK/Тату/All The Things She Said.mp3'},
  {'icon': iconImage, 'title': 'How Soon Is Now', 'file': '../../../../../../../../F:/MUSIK/Тату/How Soon Is Now.mp3'},
  {'icon': iconImage, 'title': 'Not Gonna Get Us', 'file': '../../../../../../../../F:/MUSIK/Тату/Not Gonna Get Us.mp3'},
  {'icon': iconImage, 'title': 'Not Gonna Get Usнас Не Догнят (engl)', 'file': '../../../../../../../../F:/MUSIK/Тату/Not Gonna Get UsНас не догнят (Engl).mp3'},
  {'icon': iconImage, 'title': 'Show Me Love', 'file': '../../../../../../../../F:/MUSIK/Тату/Show me love.mp3'},
  {'icon': iconImage, 'title': 'Stars', 'file': '../../../../../../../../F:/MUSIK/Тату/Stars.mp3'},
  {'icon': iconImage, 'title': 'Досчитай До Ста', 'file': '../../../../../../../../F:/MUSIK/Тату/Досчитай до ста.mp3'},
  {'icon': iconImage, 'title': 'Мальчик Гей', 'file': '../../../../../../../../F:/MUSIK/Тату/Мальчик Гей.mp3'},
  {'icon': iconImage, 'title': 'Нас Не Догонят', 'file': '../../../../../../../../F:/MUSIK/Тату/Нас не догонят .mp3'},
  {'icon': iconImage, 'title': 'Нас Не Догонят', 'file': '../../../../../../../../F:/MUSIK/Тату/Нас не догонят.mp3'},
  {'icon': iconImage, 'title': 'Не Верь Не Бойся Не Проси', 'file': '../../../../../../../../F:/MUSIK/Тату/Не верь, не бойся, не проси.mp3'},
  {'icon': iconImage, 'title': 'Облока', 'file': '../../../../../../../../F:/MUSIK/Тату/Облока.mp3'},
  {'icon': iconImage, 'title': 'Покажи Мне Любовь', 'file': '../../../../../../../../F:/MUSIK/Тату/Покажи мне любовь.mp3'},
  {'icon': iconImage, 'title': 'Пол Часа', 'file': '../../../../../../../../F:/MUSIK/Тату/Пол часа.mp3'},
  {'icon': iconImage, 'title': 'Простые Движения', 'file': '../../../../../../../../F:/MUSIK/Тату/Простые движения.mp3'},
  {'icon': iconImage, 'title': 'Робот', 'file': '../../../../../../../../F:/MUSIK/Тату/Робот.mp3'},
  {'icon': iconImage, 'title': 'Твой Враг', 'file': '../../../../../../../../F:/MUSIK/Тату/Твой враг.mp3'},
  {'icon': iconImage, 'title': 'Я Сошла С Ума', 'file': '../../../../../../../../F:/MUSIK/Тату/Я сошла с ума.MP3'},
]);
})

document.getElementById('чайф').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': '17 Лет', 'file': '../../../../../../../../F:/MUSIK/Чайф/1995 - Пусть все будет так, как ты захочешь/17 лет.mp3'},
  {'icon': iconImage, 'title': 'Rocknroll Этой Ночи', 'file': '../../../../../../../../F:/MUSIK/Чайф/1987 - Дерьмонтин/Rock%27n%27roll этой ночи.mp3'},
  {'icon': iconImage, 'title': 'Ангел', 'file': '../../../../../../../../F:/MUSIK/Чайф/2006 - От себя/Ангел.mp3'},
  {'icon': iconImage, 'title': 'Аргентина Ямайка 5 0', 'file': '../../../../../../../../F:/MUSIK/Чайф/2000 - Шекогали/Аргентина-Ямайка 5-0.mp3'},
  {'icon': iconImage, 'title': 'В Ее Глазах', 'file': '../../../../../../../../F:/MUSIK/Чайф/2000 - Шекогали/В ее глазах.mp3'},
  {'icon': iconImage, 'title': 'Давай Вернемся', 'file': '../../../../../../../../F:/MUSIK/Чайф/1990 - Давай вернемся/Давай вернемся.mp3'},
  {'icon': iconImage, 'title': 'Зинаида', 'file': '../../../../../../../../F:/MUSIK/Чайф/1994 - Оранжевое настроение/Зинаида.mp3'},
  {'icon': iconImage, 'title': 'Кончается Век', 'file': '../../../../../../../../F:/MUSIK/Чайф/2000 - Шекогали/Кончается век.mp3'},
  {'icon': iconImage, 'title': 'Мимо', 'file': '../../../../../../../../F:/MUSIK/Чайф/2001 - Время не ждет/Мимо.mp3'},
  {'icon': iconImage, 'title': 'Не Со Мной', 'file': '../../../../../../../../F:/MUSIK/Чайф/1996 - Реальный мир/Не со мной.mp3'},
  {'icon': iconImage, 'title': 'Не Спеши', 'file': '../../../../../../../../F:/MUSIK/Чайф/1993 - Дети гор/Не спеши.mp3'},
  {'icon': iconImage, 'title': 'Никто Не Услышит', 'file': '../../../../../../../../F:/MUSIK/Чайф/1990 - Давай вернемся/Никто не услышит.mp3'},
  {'icon': iconImage, 'title': 'Поплачь О Нем', 'file': '../../../../../../../../F:/MUSIK/Чайф/1989 - Не беда/Поплачь о нем.mp3'},
  {'icon': iconImage, 'title': 'С Войны', 'file': '../../../../../../../../F:/MUSIK/Чайф/1990 - Давай вернемся/С войны.mp3'},
  {'icon': iconImage, 'title': 'Я Рисую На Окне', 'file': '../../../../../../../../F:/MUSIK/Чайф/1999 - Шекогали/Я рисую на окне.mp3'},
]);
})

document.getElementById('эльфийскаярукопись').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Всадник Из Льда', 'file': '../../../../../../../../F:/MUSIK/Эльфийская рукопись/Всадник из льда.mp3'},
  {'icon': iconImage, 'title': 'Золотые Драконы', 'file': '../../../../../../../../F:/MUSIK/Эльфийская рукопись/Золотые драконы.mp3'},
  {'icon': iconImage, 'title': 'Магия И Меч', 'file': '../../../../../../../../F:/MUSIK/Эльфийская рукопись/Магия И Меч.mp3'},
  {'icon': iconImage, 'title': 'Пройди Свой Путь', 'file': '../../../../../../../../F:/MUSIK/Эльфийская рукопись/Пройди Свой Путь.mp3'},
  {'icon': iconImage, 'title': 'Романс О Слезе', 'file': '../../../../../../../../F:/MUSIK/Эльфийская рукопись/Романс О Слезе.mp3'},
  {'icon': iconImage, 'title': 'Час Испытания', 'file': '../../../../../../../../F:/MUSIK/Эльфийская рукопись/Час испытания.mp3'},
  {'icon': iconImage, 'title': 'Эпилог', 'file': '../../../../../../../../F:/MUSIK/Эльфийская рукопись/Эпилог.mp3'},
]);
})

document.getElementById('ю.антонов').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Белый Теплоход', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1987 - От печали до радости 1/Белый теплоход.mp3'},
  {'icon': iconImage, 'title': 'Берегите Женщин', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1987 - От печали до радости 1/Берегите женщин.mp3'},
  {'icon': iconImage, 'title': 'Вот Как Бывает', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1983 - Крыша дома твоего/Вот как бывает.mp3'},
  {'icon': iconImage, 'title': 'Давай Не Будем Спешить', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1987 - От печали до радости 2/Давай не будем спешить.mp3'},
  {'icon': iconImage, 'title': 'Дай Мне Руку', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1987 - От печали до радости 2/Дай мне руку.mp3'},
  {'icon': iconImage, 'title': 'Двадцать Лет Спустя', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1983 - Крыша дома твоего/Двадцать лет спустя.mp3'},
  {'icon': iconImage, 'title': 'Дорога К Морю', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1983 - Крыша дома твоего/Дорога к морю.mp3'},
  {'icon': iconImage, 'title': 'Если Пойдем Вдвоем', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1985 - Поверь в мечту/Если пойдем вдвоем.mp3'},
  {'icon': iconImage, 'title': 'Живет Повсюду Красота', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1987 - От печали до радости 2/Живет повсюду красота.mp3'},
  {'icon': iconImage, 'title': 'Жизнь', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1987 - От печали до радости 2/Жизнь.mp3'},
  {'icon': iconImage, 'title': 'Зеркало', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1983 - Золотая лестница (Группа Аракс)/Зеркало.mp3'},
  {'icon': iconImage, 'title': 'Крыша Дома Твоего', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1983 - Крыша дома твоего/Крыша дома твоего.mp3'},
  {'icon': iconImage, 'title': 'Лунная Дорожка', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1987 - От печали до радости 1/Лунная дорожка.mp3'},
  {'icon': iconImage, 'title': 'Мой Путь Прост', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1987 - От печали до радости 1/Мой путь прост.mp3'},
  {'icon': iconImage, 'title': 'Море', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1983 - Крыша дома твоего/Море.mp3'},
  {'icon': iconImage, 'title': 'На Улице Каштановой', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1985 - Поверь в мечту/На улице Каштановой.mp3'},
  {'icon': iconImage, 'title': 'Не Говорите Мне Прощай', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1987 - От печали до радости 1/Не говорите мне прощай.mp3'},
  {'icon': iconImage, 'title': 'Не До Смеха', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1985 - Поверь в мечту/Не до смеха.mp3'},
  {'icon': iconImage, 'title': 'Не Забывай', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1983 - Золотая лестница (Группа Аракс)/Не забывай.mp3'},
  {'icon': iconImage, 'title': 'Не Рвите Цветы', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1987 - От печали до радости 1/Не рвите цветы.mp3'},
  {'icon': iconImage, 'title': 'От Печали До Радости', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1983 - Золотая лестница (Группа Аракс)/От печали до радости.mp3'},
  {'icon': iconImage, 'title': 'Поверь В Мечту', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1985 - Поверь в мечту/Поверь в мечту.mp3'},
  {'icon': iconImage, 'title': 'Пусть Вечным Будет Мир', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1996 - Песни для детей/Пусть вечным будет мир.mp3'},
  {'icon': iconImage, 'title': 'Родные Места', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1987 - От печали до радости 2/Родные места.mp3'},
  {'icon': iconImage, 'title': 'Снегири', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1985 - Поверь в мечту/Снегири.mp3'},
  {'icon': iconImage, 'title': 'Трава У Дома', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/Трава у дома.mp3'},
  {'icon': iconImage, 'title': 'Туами', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1996 - Песни для детей/Туами.mp3'},
  {'icon': iconImage, 'title': 'У Берез И Сосен', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1973 - Юрий Антонов и оркестр Современник/У берез и сосен.mp3'},
  {'icon': iconImage, 'title': 'Хмельная Сирень', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1987 - От печали до радости 2/Хмельная сирень.mp3'},
  {'icon': iconImage, 'title': 'Я Не Жалею Ни О Чем', 'file': '../../../../../../../../F:/MUSIK/Ю.Антонов/1985 - Поверь в мечту/Я не жалею ни о чем.mp3'},
]);
})

document.getElementById('юрийвизбор').addEventListener('click', function(e) {
e.preventDefault();
AP.delall();
AP.update([
  {'icon': iconImage, 'title': 'Vi09 13', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/VI09_13.mp3'},
  {'icon': iconImage, 'title': 'Английский Язык', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/ВСТАВАЙТЕ ГРАФ/Английский язык.mp3'},
  {'icon': iconImage, 'title': 'Базука', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/ЕСЛИ Я ЗАБОЛЕЮ/Базука.mp3'},
  {'icon': iconImage, 'title': 'Бригантина', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/БРИГАНТИНА/Бригантина.mp3'},
  {'icon': iconImage, 'title': 'Велосипед', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/СОЛНЫШКО ЛЕСНОЕ/Велосипед.mp3'},
  {'icon': iconImage, 'title': 'Волейбол На Сретенке', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/ВОЛЕЙБОЛ НА СРЕТЕНКЕ/Волейбол на Сретенке.mp3'},
  {'icon': iconImage, 'title': 'Вставайте Граф', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/ВСТАВАЙТЕ ГРАФ/Вставайте граф.mp3'},
  {'icon': iconImage, 'title': 'Давным Давно', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/ДОМБАИССКИЙ ВАЛЬС/Давным давно.mp3'},
  {'icon': iconImage, 'title': 'Доклад', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/НОЧНАЯ ДОРОГА/Доклад.mp3'},
  {'icon': iconImage, 'title': 'Домбайсский Вальс', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/ДОМБАИССКИЙ ВАЛЬС/Домбайсский вальс.mp3'},
  {'icon': iconImage, 'title': 'Если Я Заболею', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/ЕСЛИ Я ЗАБОЛЕЮ/Если я заболею.mp3'},
  {'icon': iconImage, 'title': 'Жак Ландрэй', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/Жак Ландрэй.mp3'},
  {'icon': iconImage, 'title': 'Здравствуйздравствуй', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/ДОМБАИССКИЙ ВАЛЬС/Здравствуй,здравствуй.mp3'},
  {'icon': iconImage, 'title': 'Излишний Вес', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/ЗЕЛЕНОЕ ПЕРО/Излишний вес.mp3'},
  {'icon': iconImage, 'title': 'Ищи Меня Сегодня', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/Ищи меня сегодня.WAV'},
  {'icon': iconImage, 'title': 'Люси', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/ВСТАВАЙТЕ ГРАФ/Люси.mp3'},
  {'icon': iconImage, 'title': 'Мне Твердят', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/ВОЛЕЙБОЛ НА СРЕТЕНКЕ/Мне твердят.mp3'},
  {'icon': iconImage, 'title': 'Нам Бы Выпить Перед Стартом', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/ВСТАВАЙТЕ ГРАФ/Нам бы выпить перед стартом.mp3'},
  {'icon': iconImage, 'title': 'Наполним Музыкой Сердца', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/ДОМБАИССКИЙ ВАЛЬС/Наполним музыкой сердца.mp3'},
  {'icon': iconImage, 'title': 'Ночная Дорога', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/НОЧНАЯ ДОРОГА/Ночная дорога.mp3'},
  {'icon': iconImage, 'title': 'Памирская Песня', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/РАСПАХНУТЫЕ ВЕТРА/Памирская песня.mp3'},
  {'icon': iconImage, 'title': 'Песня Альпинистов', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/РАСПАХНУТЫЕ ВЕТРА/Песня альпинистов.mp3'},
  {'icon': iconImage, 'title': 'Песня О Москве', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/НОЧНАЯ ДОРОГА/Песня о Москве.mp3'},
  {'icon': iconImage, 'title': 'Подмосковная', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/БРИГАНТИНА/Подмосковная.mp3'},
  {'icon': iconImage, 'title': 'Рассказ Ветерана', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/ЗИМНИЙ ВЕЧЕР/Рассказ ветерана.mp3'},
  {'icon': iconImage, 'title': 'Серега Санин', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/ДОМБАИССКИЙ ВАЛЬС/Серега Санин.mp3'},
  {'icon': iconImage, 'title': 'Солнышко Лесное', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/СОЛНЫШКО ЛЕСНОЕ/Солнышко лесное.mp3'},
  {'icon': iconImage, 'title': 'Солнышко Лесное', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/Солнышко лесное.WAV'},
  {'icon': iconImage, 'title': 'Сорокалетие', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/ВСТАВАЙТЕ ГРАФ/Сорокалетие.mp3'},
  {'icon': iconImage, 'title': 'Спартак На Памире', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/ДОМБАИССКИЙ ВАЛЬС/Спартак на Памире.mp3'},
  {'icon': iconImage, 'title': 'Сретенский Двор', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/ВОЛЕЙБОЛ НА СРЕТЕНКЕ/Сретенский двор.mp3'},
  {'icon': iconImage, 'title': 'Старые Ели', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/БРИГАНТИНА/Старые Ели.mp3'},
  {'icon': iconImage, 'title': 'Телефон', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/ВСТАВАЙТЕ ГРАФ/Телефон.mp3'},
  {'icon': iconImage, 'title': 'Три Минуты Тишины', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/НОЧНАЯ ДОРОГА/Три минуты тишины.mp3'},
  {'icon': iconImage, 'title': 'Три Сосны', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/Три сосны.mp3'},
  {'icon': iconImage, 'title': 'Ты У Меня Одна', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/Ты у меня одна.mp3'},
  {'icon': iconImage, 'title': 'Ты У Меня Одна', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/ДОМБАИССКИЙ ВАЛЬС/Ты у меня одна.mp3'},
  {'icon': iconImage, 'title': 'Укушенный', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/ВОЛЕЙБОЛ НА СРЕТЕНКЕ/Укушенный.mp3'},
  {'icon': iconImage, 'title': 'Фанские Горы', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/РАСПАХНУТЫЕ ВЕТРА/Фанские горы.mp3'},
  {'icon': iconImage, 'title': 'Ходики', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/ВОЛЕЙБОЛ НА СРЕТЕНКЕ/Ходики.mp3'},
  {'icon': iconImage, 'title': 'Я Думаю О Вас', 'file': '../../../../../../../../F:/MUSIK/Юрий Визбор/ЗЕЛЕНОЕ ПЕРО/Я думаю о вас.mp3'},
]);
})

