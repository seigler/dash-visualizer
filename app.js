'use strict';

//(function() {
  var socket = io("https://blockchain.masternode.io/");
  var transactionList = document.getElementById('transactionList');
  var muteButton = document.getElementById('muteToggle');
  var muted = false;

  function playSound(url) {
    if (muted === true) {
      return;
    }
    var audio = document.createElement('audio');
    audio.style.display = "none";
    audio.src = url;
    audio.autoplay = true;
    audio.loop = false;
    audio.onended = function(){
      audio.remove() //Remove when played.
    };
    document.body.appendChild(audio);
  }

  var toggleMute = function() {
    muted = !muted;
    if (localStorage) {
      localStorage.setItem('muted', muted);
    }
    muteButton.className = (muted === true ? 'is-muted' : '');
  }

  var onTransaction = function(data) {
    console.log(data);
    playSound('assets/bell.mp3');
    var tx = document.createElement('div');
    tx.className = 'tx';
    var txValue = document.createElement('a');
    txValue.className = 'txValue';
    txValue.href = 'https://blockchain.masternode.io/tx/' + data.txid;
    txValue.target = '_blank';
    txValue.setAttribute('rel', 'noopener');
    var txOutputs = document.createElement('div');
    txOutputs.className = 'txOutputs';
    txValue.appendChild(document.createTextNode(data.valueOut));
    tx.appendChild(txValue);
    tx.appendChild(txOutputs);
    var transactions = data.vout.sort(function(a, b) { // sort descending by tx value
      return b[Object.keys(b)[0]] - a[Object.keys(a)[0]];
    });
    transactions.forEach(function(value, index, array) {
      var txOut = document.createElement('div');
      var outputSatoshis = value[Object.keys(value)[0]];
      txOut.className = 'txOut';
      txOut.style.width = (outputSatoshis * 0.00001).toFixed(4) + 'px';
      txOut.title = (value[Object.keys(value)[0]] * 0.00000001);
      txOutputs.appendChild(txOut);
    });
    transactionList.insertBefore(tx, transactionList.firstChild);
  };

  var onBlock = function(data) {
    console.log(data);
    playSound('assets/whoosh.mp3');
    var newBlock = document.createElement('a');
    newBlock.className = 'blockDivider';
    newBlock.href = 'https://blockchain.masternode.io/block/' + data;
    newBlock.target = '_blank';
    newBlock.setAttribute('rel', 'noopener');
    newBlock.appendChild(document.createTextNode(data));
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
//})();
