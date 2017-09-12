'use strict';

const io = require('socket.io-client');

var App = {
  init: function init() {
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
}

module.exports = App;
