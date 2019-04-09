'use strict';

require('babel-polyfill');

import io from 'socket.io-client';
import ColorScheme from 'color-scheme';
import { PSDENOMINATIONS, COLORS, PAINT } from './constants';

export default class App {
  constructor() {
    this.blockRefs = [];
    this.blockList = document.getElementById('blockList');
    this.connectionStatus = document.getElementById('connectionStatus');
    this.hero = document.getElementById('hero');
    this.blockColors = ['000000'];
  }

  async init() {
    const block = (new URL(window.location)).searchParams.get('block');

    if (block != null) { // display one block
      this.hero.classList.add('solo');
      this.connectionStatus.className = 'is-loading';
      var txs = [];
      var pages = 1;
      var prevHash = null;
      const txListener = this.onTransactionBuilder(this.hero, false);
      for (let i = 0; i < pages; ++i) {
        await fetch(`https://insight.dash.org/insight-api/txs?block=${block}&pageNum=${i}`)
        .then(resp => resp.json())
        .then(thisBlockData => {
          if (!prevHash && thisBlockData.txs.length > 0) {
            return fetch('https://insight.dash.org/insight-api/block-index/'+(thisBlockData.txs[0].blockheight - 1))
            .then(resp => resp.json())
            .then(prevBlockData => {
              prevHash = prevBlockData.blockHash;
              this.blockColors = App.generateColors(prevHash);
              this.applyColors(this.hero);
              pages = thisBlockData.pagesTotal;
              for (let j = 0; j < thisBlockData.txs.length; ++j) {
                txListener(thisBlockData.txs[j]);
              }
            });
          } else {
              for (let j = 0; j < thisBlockData.txs.length; ++j) {
                txListener(thisBlockData.txs[j]);
              }
          }
        });
      }
      this.connectionStatus.className = 'is-loaded';
    } else { // live display
      await fetch('https://insight.dash.org/api/status?q=getLastBlockHash')
      .then(resp => resp.json())
      .then(data => {
        this.blockColors = App.generateColors(data.lastblockhash);
        this.applyColors(this.hero);
      });

      this.socket = io.connect("https://insight.dash.org:443/");
      this.socket.on('connect', () => {
        this.connectionStatus.className = 'is-connected';
        // Join the room.
        this.socket.emit('subscribe', 'inv');
      })
      this.socket.on('tx', this.onTransactionBuilder(this.hero, true).bind(this));
      this.socket.on('block', this.onBlock.bind(this));
      this.socket.on('disconnect', () => {
        this.connectionStatus.className = 'is-disconnected';
      });
      this.socket.on('reconnecting', () => {
        this.connectionStatus.className = 'is-connecting';
      });
    }
  }

  static generateColors(blockHash) {
    const hue = Math.floor(
      parseInt(blockHash.slice(-3), 16) / 4096 * 360
    );
    var blockColorScheme = new ColorScheme();
    blockColorScheme.from_hue(hue).scheme('analogic').add_complement(true);
    const colors = blockColorScheme.colors();
    return colors;
  }

  applyColors(target) {
    for (var i in this.blockColors) {
      const color = this.blockColors[i];
      target.style.setProperty(`--color-${i}`, '#'+color);
    }
  }

  onBlock(data) {
    var completedBlock = document.createElement('div');
    completedBlock.className = 'block';
    completedBlock.id = data;
    this.applyColors(completedBlock);
    this.blockColors = App.generateColors(data);
    this.applyColors(this.hero);
    var blockLink = document.createElement('a');
    blockLink.className = 'explorer-link';
    blockLink.href = document.location + '?block=' + data;
    blockLink.target = '_blank';
    blockLink.setAttribute('rel', 'noopener');
    blockLink.appendChild(document.createTextNode('🗗'));

    fetch('https://insight.dash.org/insight-api/block/' + data)
    .then(resp => resp.json())
    .then(data => {
      let leftovers = [];
      for (var i in data.tx) {
        const txid = data.tx[i];
        let paint = document.getElementById(txid);
        if (paint) {
          completedBlock.insertBefore(paint, completedBlock.firstChild);
        }
      }
      Array.from(this.hero.children).forEach(item => {
        if (item.data_ignored > 3) {
          item.remove();
        } else {
          if (item.data_ignored) {
            item.data_ignored++;
          } else {
            item.classList.add('stale');
            item.data_ignored = 1;
          }
        }
      });
      completedBlock.appendChild(blockLink);
      if (this.blockRefs.unshift(this.completedBlock) > 8) {
        var toDelete = this.blockRefs.pop();
        if (toDelete) {
          toDelete.remove();
        }
      }
      this.blockList.insertBefore(completedBlock, this.blockList.firstChild);
    });
  }

  static isPrivateSend(components) {
    return components.every(i => {
      let value = Object.values(i)[0];
      if (typeof value == 'string') {
        value = 100000000 * value;
      }
      return PSDENOMINATIONS.includes(value);
    });
  }

  onTransactionBuilder(target, addToMempool = false) {
    return (data) => {
      const isMixing = App.isPrivateSend(data.vout);
      const isInstant = data.txlock || (data.vin && data.vin.length <= 4);
      const isSimple = data.txlock || (data.vin && data.vin.length <= 1);
      const tx = {
        id: data.txid,
        mixing: isMixing,
        instant: isInstant,
        simple: isSimple,
        value: data.valueOut,
        x: parseInt(data.txid.slice(0, 4), 16) / 65536,
        y: parseInt(data.txid.slice(4, 8), 16) / 65536,
        rotation: parseInt(data.txid.slice(16, 17), 16) / 16,
        paintIndex: parseInt(data.txid.slice(17, 21), 16) / 65536,
        color: isMixing ? COLORS.black : !isSimple ? COLORS.white : 
          'var(--color-'+
          Math.floor(parseInt(data.txid.slice(21, 23), 16) / 256 * this.blockColors.length)+
          ')'
      };

      var paint = document.createElement('div');
      paint.id = tx.id;
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
      paint.style.setProperty('--color', tx.color);
      target.appendChild(paint);
    }
  }
};
