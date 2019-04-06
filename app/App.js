'use strict';

require('babel-polyfill');

import io from 'socket.io-client';
import ColorScheme from 'color-scheme';
import { PSDENOMINATIONS, COLORS, PAINT } from './constants';

export default class App {
  constructor() {
    this.socket = io.connect("https://insight.dash.org:443/");
    this.domRefList = [];
    this.blockList = document.getElementById('blockList');
    this.currentBlock = document.createElement('div');
    this.currentBlock.className = 'block';
    this.blockList.appendChild(this.currentBlock);
    this.blockColors = ['000000'];
    this.prevBlockHash = null;

    fetch('https://insight.dash.org/api/status?q=getLastBlockHash')
    .then(resp => resp.json())
    .then(data => {
      this.prevBlockHash = data.lastblockhash;
      this.blockColors = App.generateColors(data.lastblockhash);
    });

    this.socket.on('connect', () => {
      document.getElementById('connectionStatus').className = 'is-connected';
      // Join the room.
      this.socket.emit('subscribe', 'inv');
    })
    this.socket.on('tx', this.onTransaction.bind(this));
    this.socket.on('block', this.onBlock.bind(this));
    this.socket.on('disconnect', () => {
      document.getElementById('connectionStatus').className = 'is-disconnected';
    });
    this.socket.on('reconnecting', () => {
      document.getElementById('connectionStatus').className = 'is-connecting';
    });
  }

  static generateColors(blockHash) {
    // https://github.com/c0bra/color-scheme-js
    const schemeTypes = [
      'contrast',
      'triade',
      'triade',
      'tetrade',
      'tetrade',
      'analogic',
      'analogic',
      'analogic',
      'analogic',
    ];
    const hue = Math.floor(
      parseInt(blockHash.slice(-3), 16) / 4096 * 360
    );
    const schemeFraction = parseInt(blockHash.slice(-5, -3), 16) / 256;
    const scheme = schemeTypes[Math.floor(schemeFraction * schemeTypes.length)];
    var blockColorScheme = new ColorScheme();
    blockColorScheme.from_hue(hue).scheme(scheme).add_complement(true);
    const colors = blockColorScheme.colors();
    console.log('New color scheme: ' + scheme + ' based on %chue ' + hue, 'background-color:#'+colors[0]);
    return colors;
  }

  onBlock(data) {
    this.prevBlockHash = data;
    this.blockColors = App.generateColors(this.prevBlockHash);
    var blockLink = document.createElement('a');
    blockLink.className = 'explorer-link';
    blockLink.href = 'https://insight.dash.org/insight/block/' + data;
    blockLink.target = '_blank';
    blockLink.setAttribute('rel', 'noopener');
    blockLink.appendChild(document.createTextNode(data));
    this.currentBlock.appendChild(blockLink);

    this.currentBlock = document.createElement('div');
    this.currentBlock.className = 'block';
    this.currentBlock.style.setProperty('--private-color', COLORS.private);
    this.currentBlock.style.setProperty('--instant-color', COLORS.instant);

    if (this.domRefList.unshift(this.currentBlock) > 16) {
      var toDelete = this.domRefList.pop();
      toDelete.remove();
    }
    this.blockList.insertBefore(this.currentBlock, this.blockList.firstChild);
  }

  static isPrivateSend(components) {
    return components.every(i => PSDENOMINATIONS.includes(Object.values(i)[0]));
  }

  onTransaction(data) {
    const isMixing = App.isPrivateSend(data.vout);
    const tx = {
      mixing: isMixing,
      instant: data.txlock,
      value: data.valueOut,
      x: parseInt(data.txid.slice(0, 4), 16) / 65536,
      y: parseInt(data.txid.slice(4, 8), 16) / 65536,
      rotation: parseInt(data.txid.slice(16, 17), 16) / 16,
      paintIndex: parseInt(data.txid.slice(17, 21), 16) / 65536,
      color: isMixing ? COLORS.private : data.txlock ? COLORS.instant : this.blockColors[
        Math.floor(parseInt(data.txid.slice(21, 23), 16) / 256 * this.blockColors.length)
      ]
    };

    console.log('tx: '+tx.value+(tx.private?' private':'')+(tx.instant?' instant':''));

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
    this.currentBlock.appendChild(paint, this.currentBlock.firstChild);
  }
};
