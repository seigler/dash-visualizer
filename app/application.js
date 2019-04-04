'use strict';

require('babel-polyfill');

import io from 'socket.io-client';
import ColorScheme from 'color-scheme';

var App = {
  init: async function init() {
    const socket = io.connect("https://insight.dash.org:443/");
    const blockList = document.getElementById('blockList');
    var domRefList = [];
    var currentBlock = document.createElement('div');
    currentBlock.className = 'block';
    blockList.appendChild(currentBlock);

    var prevBlockHash;
    await fetch('https://insight.dash.org/api/status?q=getLastBlockHash')
    .then(resp => resp.json())
    .then(data => {
      prevBlockHash = data.lastblockhash;
    });
    var blockColors = generateColors(prevBlockHash);

    const psInputSatoshis = [
      1000010000,
      100001000,
      10000100,
      1000010,
      100001
    ];

    const COLORS = {
      private: 'black',
      instant: 'white'
    };

    const PAINT = {
      big: [
        'paint-big01.svg',
        'paint-big02.svg',
        'paint-big03.svg',
        'paint-big04.svg',
        'paint-big05.svg',
        'paint-big06.svg',
        'paint-big07.svg',
        'paint-big08.svg',
        'paint-big09.svg',
        'paint-big00.svg',
        'paint-big01.svg',
        'paint-big11.svg',
        'paint-big12.svg'
      ],
      small: [
        'paint01.svg',
        'paint02.svg',
        'paint03.svg',
        'paint04.svg',
        'paint05.svg',
        'paint06.svg',
        'paint07.svg',
        'paint08.svg',
        'paint09.svg',
        'paint00.svg',
        'paint01.svg',
        'paint11.svg'
      ]
    };

    function generateColors(blockHash) {
      // https://github.com/c0bra/color-scheme-js
      const schemeTypes = ['mono', 'contrast', 'triade', 'tetrade', 'analogic'];
      var blockColorScheme = new ColorScheme();
      blockColorScheme.from_hue(
        Math.floor(parseInt(prevBlockHash.slice(0, 3), 16) / 4096 * 360)
      ).scheme(
        schemeTypes[
          Math.floor(parseInt(prevBlockHash.slice(3, 5), 16) / 256 * schemeTypes.length)
        ]
      ).distance(0.75);
      return blockColorScheme.colors();
    };

    var onBlock = function(data) {
      prevBlockHash = data;
      blockColors = generateColors(prevBlockHash);
      var blockLink = document.createElement('a');
      blockLink.className = 'explorer-link';
      blockLink.href = 'https://insight.dash.org/insight/block/' + data;
      blockLink.target = '_blank';
      blockLink.setAttribute('rel', 'noopener');
      blockLink.appendChild(document.createTextNode(data));
      currentBlock.appendChild(blockLink);

      currentBlock = document.createElement('div');
      currentBlock.className = 'block';
      currentBlock.style.setProperty('--private-color', COLORS.private);
      currentBlock.style.setProperty('--instant-color', COLORS.instant);

      if (domRefList.unshift(currentBlock) > 16) {
        var toDelete = domRefList.pop();
        toDelete.remove();
      }
      blockList.insertBefore(currentBlock, blockList.firstChild);
    };

    const onTransaction = function(data) {
      var transactions = data.vout;

      var isPrivateSend = true;
      for (let i = 0; i < transactions.length; i++) {
        const tx = transactions[i];
        const outputSatoshis = tx[Object.keys(tx)[0]];
        if (!psInputSatoshis.includes(outputSatoshis)) {
          isPrivateSend = false;
          break;
        }
      }

      const tx = {
        private: isPrivateSend,
        instant: data.txlock,
        value: data.valueOut,
        x: parseInt(data.txid.slice(0, 4), 16) / 65536,
        y: parseInt(data.txid.slice(4, 8), 16) / 65536,
        rotation: parseInt(data.txid.slice(16, 17), 16) / 16,
        paintIndex: parseInt(data.txid.slice(17, 21), 16) / 65536,
        color: isPrivateSend ? COLORS.private : data.txlock ? COLORS.instant : blockColors[
          Math.floor(parseInt(data.txid.slice(21, 23), 16) / 256 * blockColors.length)
        ]
      };

      var paint = document.createElement('div');
      paint.classList.add('paint');
      paint.style.maskImage = 'url(assets/paint/' + (tx.value > 10 ?
        PAINT.big[Math.floor(tx.paintIndex * 12)] :
        PAINT.small[Math.floor(tx.paintIndex * 11)]
      ) + ')';
      paint.style.setProperty('-webkit-mask-image', paint.style.maskImage);
      paint.style.setProperty('--x', tx.x);
      paint.style.setProperty('--y', tx.y);
      paint.style.setProperty('--size', Math.log(1 + tx.value)/Math.log(2));
      paint.style.setProperty('--rotation', tx.rotation * 360 + 'deg');
      paint.style.setProperty('--color', '#'+tx.color);
      currentBlock.appendChild(paint, currentBlock.firstChild);
    };

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
