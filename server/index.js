const express = require('express');
const app = express();
const http = require('http');
const PORT = process.env.PORT || 3000;
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

app.get('/', ( req, res ) => {
  res.send('<h1>Hello world</h1>');
});

io.sockets.on('connection', async ( socket ) => {

  // Grab user name from socket
  var userName = socket.handshake.query.userName;
  console.log( userName + ' has connected' )

  // Function to grab existing users - returns array
  let sockets =  await io.fetchSockets();
  let listUsers = [];
  for( let i=0; i<sockets.length; i++ ){
    if( sockets[i].handshake.query.userName !== userName ){
      listUsers.push( sockets[i].handshake.query.userName );
    }
  }
  // Emit the final list of users
  io.emit( 'checkWhosOnline', listUsers )

  // Emit message to all saying that an user has connected
  io.emit( 'userConnected', userName );

  // Update camera for all session users but the sender
  socket.on( 'updateCamera', ( msg ) => {
    socket.broadcast.emit( 'updateCamera', msg )
  });

  // Create camera for all session users but the sender
  socket.on( 'createCamera', ( msg ) => {
    socket.broadcast.emit( 'createCamera', msg );
  });
  
  // Emit Morph Values
  socket.on( 'onSliderMorphChange', ( morphTarget, value ) => {
    socket.broadcast.emit( 'onSliderMorphChange', morphTarget, value );
  });

  // Emit Object Morph Change
  socket.on( 'onObjectMorphChange', ( value ) => {
    socket.broadcast.emit( 'onObjectMorphChange', value );
  });

  // Emit On Loop Change
  socket.on( 'onLoopChange', ( value ) => {
    socket.broadcast.emit( 'onLoopChange', value );
  });

  // Emit Loop Change
  socket.on( 'onClipChange', ( value ) => {
    socket.broadcast.emit( 'onClipChange', value );
  });

  // Emit Play
  socket.on( 'play', () => {
    socket.broadcast.emit( 'play' );
  });

  // Emit Play
  socket.on( 'restart', () => {
    socket.broadcast.emit( 'restart' );
  });

  // Emit Stop
  socket.on( 'stop', () => {
    socket.broadcast.emit( 'stop' );
  });

  // Disconnect 
  socket.on( 'disconnect', async () => {
    console.log( userName + ' has disconnected' );
    // Emit msg when user disconnects
    socket.broadcast.emit( 'userDisconnected', userName );
    // Function to grab existing sockets - returns array
    let sockets =  await io.fetchSockets();
    console.log( 'The session has ' + sockets.length + ' user(s) online' ); 
  });
});
  
server.listen( PORT, () => {
console.log( 'listening on *:3000' );
});