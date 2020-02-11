define([
  'libs/Cesium/Cesium'
], function(Cesium) {
  function Util() {
  }

  Util.event = {
    RIGHT_CLICK: 'rightClick',
    LEFT_CLICK: 'leftClick',
    LEFT_UP: 'leftUp',
    LEFT_DOWN: 'leftDown',
    LEFT_DOUBLE_CLICK: 'leftDoubleClick',
    MOUSE_MOVE: 'mouseMove',
    MOUSE_OUT: 'mouseOut'
  }

  Util.isMobile = function() {
    var isAndroid = navigator.userAgent.match(/Android/i);
    var isBlackBerry = navigator.userAgent.match(/BlackBerry/i);
    var isIos = navigator.userAgent.match(/iPhone|iPad|iPod/i);
    var isOpera = navigator.userAgent.match(/Opera Mini/i);
    var isWindows = navigator.userAgent.match(/IEMobile/i);
    return (isAndroid || isBlackBerry || isIos || isOpera || isWindows);
  };

  Util.fillOptions = function(options, defaultOptions) {
    options = options || {};
    var option;
    for (option in defaultOptions) {
      if (options[option] === undefined) {
        options[option] = Cesium.clone(defaultOptions[option]);
      }
    }
  }

  // shallow copy
  Util.copyOptions = function(options, defaultOptions) {
    var newOptions = Cesium.clone(options), option;
    for (option in defaultOptions) {
      if (newOptions[option] === undefined) {
        newOptions[option] = Cesium.clone(defaultOptions[option]);
      }
    }
    return newOptions;
  }
  return Util;
});
