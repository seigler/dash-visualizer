/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};
/******/
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/
/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId]) {
/******/ 			return installedModules[moduleId].exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			i: moduleId,
/******/ 			l: false,
/******/ 			exports: {}
/******/ 		};
/******/
/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);
/******/
/******/ 		// Flag the module as loaded
/******/ 		module.l = true;
/******/
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/
/******/
/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;
/******/
/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;
/******/
/******/ 	// define getter function for harmony exports
/******/ 	__webpack_require__.d = function(exports, name, getter) {
/******/ 		if(!__webpack_require__.o(exports, name)) {
/******/ 			Object.defineProperty(exports, name, {
/******/ 				configurable: false,
/******/ 				enumerable: true,
/******/ 				get: getter
/******/ 			});
/******/ 		}
/******/ 	};
/******/
/******/ 	// getDefaultExport function for compatibility with non-harmony modules
/******/ 	__webpack_require__.n = function(module) {
/******/ 		var getter = module && module.__esModule ?
/******/ 			function getDefault() { return module['default']; } :
/******/ 			function getModuleExports() { return module; };
/******/ 		__webpack_require__.d(getter, 'a', getter);
/******/ 		return getter;
/******/ 	};
/******/
/******/ 	// Object.prototype.hasOwnProperty.call
/******/ 	__webpack_require__.o = function(object, property) { return Object.prototype.hasOwnProperty.call(object, property); };
/******/
/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";
/******/
/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(__webpack_require__.s = 0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ (function(module, __webpack_exports__, __webpack_require__) {

"use strict";
Object.defineProperty(__webpack_exports__, "__esModule", { value: true });
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_js_run_js__ = __webpack_require__(1);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_0_js_run_js___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_0_js_run_js__);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_main_less__ = __webpack_require__(2);
/* harmony import */ var __WEBPACK_IMPORTED_MODULE_1_main_less___default = __webpack_require__.n(__WEBPACK_IMPORTED_MODULE_1_main_less__);




/***/ }),
/* 1 */
/***/ (function(module, exports, __webpack_require__) {

"use strict";


var socket = io("https://insight.dash.org:443/");
var transactionList = document.getElementById('transactionList');
var muteButton = document.getElementById('muteToggle');
var muted = false;
var audioContext;
var audioGainNode;
var backgroundSound;
var soundBuffers = {
  'tx': null,
  'block': null
};
var domRefList = [];
window.addEventListener('load', init, false);

function init() {
  if (localStorage) {
    muted = localStorage.getItem('muted');
    if (muted === null) {
      muted = false;
      localStorage.setItem('muted', muted);
    } else {
      muted = (muted == 'true'); // localStorage stores strings not objects?
    }
    muteButton.className = (muted === true ? 'is-muted' : '');
  }

  muteButton.onclick = toggleMute;

  try {
    window.AudioContext = window.AudioContext||window.webkitAudioContext;
    audioContext = new AudioContext();
    audioGainNode = audioContext.createGain();
    audioGainNode.connect(audioContext.destination);
    audioGainNode.gain.value = 0.6;
  }
  catch(e) {
    console.error('Unable to use Web Audio API');
    document.getElementById('muteToggle').remove();
  }
  try {
    loadSound('assets/whoosh.mp3', 'block');
    loadSound('assets/bell.mp3', 'tx-sm');
    loadSound('assets/wood-hit-glass.mp3', 'tx-md');
    loadSound('assets/metallophone.mp3', 'tx-lg');
    loadSound('assets/creek.mp3', 'background', function() {
      backgroundSound = audioContext.createBufferSource();
      backgroundSound.buffer = soundBuffers['background'];
      backgroundSound.connect(audioGainNode);
      backgroundSound.loop = true;
      if (!muted) {
        backgroundSound.start();
      }
    });
  }
  catch(e) {
    console.error('Couldn\'t load sounds.');
  }

  socket.on('connect', function() {
    document.getElementById('connectionStatus').className = 'is-connected';
    // Join the room.
    socket.emit('subscribe', 'inv');
  })
  socket.on('tx', onTransaction);
  socket.on('block', onBlock);
  socket.on('disconnect', function() {
    document.getElementById('connectionStatus').className = 'is-disconnected';
  });
  socket.on('reconnecting', function() {
    document.getElementById('connectionStatus').className = 'is-connecting';
  });
}

function loadSound(url, bufferName, callback) {
  var request = new XMLHttpRequest();
  request.open('GET', url, true);
  request.responseType = 'arraybuffer';

  // Decode asynchronously
  request.onload = function() {
    audioContext.decodeAudioData(request.response, function(buffer) {
      soundBuffers[bufferName] = buffer;
      if (callback) {
        callback();
      }
    });
    console.log('Loaded ' + url + ' as "' + bufferName + '"');
  }
  request.send();
}

function playSound(bufferName, playbackRate) {
  if (muted === true) {
    return;
  }
  var source = audioContext.createBufferSource();
  source.buffer = soundBuffers[bufferName];
  source.connect(audioGainNode);
  source.playbackRate.value = playbackRate;
  source.start();
}

function playbackRate(value, vMin, vMax, oMin, oMax) {
  return Math.min(Math.max(oMin,
    (Math.log(value) - Math.log(vMin)) / (Math.log(vMax) - Math.log(vMin)) * (oMin - oMax) + oMax
  ), oMax);
}

var toggleMute = function() {
  muted = !muted;
  if (localStorage) {
    localStorage.setItem('muted', muted);
  }
  muteButton.className = (muted === true ? 'is-muted' : '');
  if (muted) {
    backgroundSound.stop();
  } else {
    backgroundSound = audioContext.createBufferSource();
    backgroundSound.buffer = soundBuffers['background'];
    backgroundSound.connect(audioGainNode);
    backgroundSound.loop = true;
    backgroundSound.start();
  }
}

var onTransaction = function(data) {
  console.log(data);
  if (!muted) {
    if (data.valueOut < 10) {
      playSound('tx-sm', playbackRate(data.valueOut, 0.00001, 10, 1, 1.5));
    } else if (data.valueOut < 1000) {
      playSound('tx-md', playbackRate(data.valueOut, 10, 1000, 0.5, 1));
    } else if (data.valueOut >= 1000) {
      playSound('tx-lg', playbackRate(data.valueOut, 6000, 1000, 0.25, 1));
    }
  }
  var tx = document.createElement('div');
  tx.className = 'tx';
  var txValue = document.createElement('a');
  txValue.className = 'txValue';
  txValue.href = 'https://blockchain.masternode.io/tx/' + data.txid;
  txValue.target = '_blank';
  txValue.setAttribute('rel', 'noopener');
  var txOutputs = document.createElement('div');
  txOutputs.className = 'txOutputs';
  txOutputs.style.height = (data.valueOut / 10 + 0.1) + 'em'
  txValue.appendChild(document.createTextNode(data.valueOut));
  tx.appendChild(txValue);
  tx.appendChild(txOutputs);
  var transactions = data.vout;
//    var transactions = data.vout.sort(function(a, b) { // sort descending by tx value
//      return b[Object.keys(b)[0]] - a[Object.keys(a)[0]];
//    });
  transactions.forEach(function(value, index, array) {
    var txOut = document.createElement('div');
    var outputSatoshis = value[Object.keys(value)[0]];
    txOut.className = 'txOut';
    txOut.style.width = (outputSatoshis * 0.00001).toFixed(4) + 'px';
    txOut.title = (value[Object.keys(value)[0]] * 0.00000001);
    txOutputs.appendChild(txOut);
  });
  if (domRefList.unshift(tx) > 300) {
    var toDelete = domRefList.pop();
    toDelete.remove();
  }
  transactionList.insertBefore(tx, transactionList.firstChild);
};

var onBlock = function(data) {
  console.log(data);
  playSound('block', 1);
  var newBlock = document.createElement('a');
  newBlock.className = 'blockDivider';
  newBlock.href = 'https://blockchain.masternode.io/block/' + data;
  newBlock.target = '_blank';
  newBlock.setAttribute('rel', 'noopener');
  newBlock.appendChild(document.createTextNode(data));
  if (domRefList.unshift(newBlock) > 300) {
    var toDelete = domRefList.pop();
    toDelete.remove();
  }
  transactionList.insertBefore(newBlock, transactionList.firstChild);
};



/***/ }),
/* 2 */
/***/ (function(module, exports) {

// removed by extract-text-webpack-plugin

/***/ })
/******/ ]);