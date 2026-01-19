const express = require( 'express' );
const app = express();
const fs = require("fs/promises");
const http = require( 'http' ) ;
const PORT = process.env.PORT || 3000;

const server = http.createServer( app );
const { Server } = require( "socket.io" );
//const io = new Server( server );

// Attention to this. CHANGE THE ORIGIN for production
const io = require( 'socket.io' )( server, {
  cors: {
    origin: "*",
  }
});

app.get('/', ( req, res ) => {
  res.send( '<h1>Hello world</h1>' );
});

async function updateJson( user, prop ) {
  try {
    const file = await fs.readFile(user + ".json", "utf8");

    if (!file || file.trim() === "") {
      return;
    }
    
    const data = JSON.parse(file);

    data[prop] = (data[prop] || 0) + 1;

    await fs.writeFile(
      user + ".json",
      JSON.stringify(data, null, 2)
    );

  } catch (err) {
      if (err.code === "ENOENT") {
        // File doesn't exist → just ignore and leave
        return;
      }

      // Any OTHER error should still be thrown
      throw err;
  } 
}

io.sockets.on('connection', async ( socket ) => {

  // Grab user name from socket
  var userName = socket.handshake.query.userName;
  console.log( userName + ' has connected' )

  // Create JSON file
  const initialData = {
    user: userName,
    grabFrames: 0,
    playPause: 0,
    restart: 0,
    stop: 0,
    clipChanges: 0
  };

  await fs.writeFile(
    userName + ".json",
    JSON.stringify(initialData, null, 2)
  );

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

  // Update XRcamera for all session users but the sender
  socket.on( 'updateXRCamera', ( msg ) => {
    socket.broadcast.emit( 'updateXRCamera', msg )
  });

  // Create camera for all session users but the sender
  socket.on( 'createCamera', ( msg ) => {
    socket.broadcast.emit( 'createCamera', msg );
  });

  // Hide
  socket.on( 'hide', ( user, followUser ) => {
    socket.broadcast.emit( 'hide', user, followUser );
  });

  // Unhide
  socket.on( 'unhide', ( user, followUser ) => {
    socket.broadcast.emit( 'unhide', user, followUser );
  });

  // getAll Users Camera
  socket.on( 'getAllCamera', ( user ) => {
    socket.broadcast.emit( 'getAllCamera', user );
  });
 
  // Follow user
  socket.on( 'follow', ( user, followUser ) => {
    socket.broadcast.emit( 'follow', user, followUser );
  });
  
  // Emit Morph Values
  socket.on( 'onSliderMorphChange', ( user, object, morphTarget, value ) => {
    socket.broadcast.emit( 'onSliderMorphChange', user, object, morphTarget, value );
  });

  // Emit Object Morph Change
  socket.on( 'onObjectMorphChange', ( user, value ) => {
    socket.broadcast.emit( 'onObjectMorphChange', user, value );
  });

  // Emit On Loop Change
  socket.on( 'onLoopChange', ( value, sync ) => {
    socket.broadcast.emit( 'onLoopChange', value, sync );
  });

  // Emit Clip Change
  socket.on( 'onClipChange', ( value, sync, user ) => {
    updateJson( user, "clipChanges" );
    socket.broadcast.emit( 'onClipChange', value, sync, user );
  });

  // Emit Ask Sync
  socket.on( 'askSync', ( user, sync, progress ) => {
    socket.broadcast.emit( 'askSync', user, sync, progress );
  });

  // Add Sync User
  socket.on( 'addSyncUser', ( user, clip ) => {
    socket.broadcast.emit( 'addSyncUser', user, clip );
  });

  // Remove Sync User
  socket.on( 'removeSyncUser', ( user, clip ) => {
    socket.broadcast.emit( 'removeSyncUser', user, clip );
  });

  // Emit Ask Clip
  socket.on( 'askClip', ( clip, user, sync ) => {
    socket.broadcast.emit( 'askClip', clip, user, sync );
  });
  
  // Emit Play
  socket.on( 'play', ( clip, time, loop, user ) => {
    updateJson( user, "playPause" );
    socket.broadcast.emit( 'play', clip, time, loop, user );
  });

  // Emit Play - Just for getting stats
  socket.on( 'AsyncPlay', ( user ) => {
    updateJson( user, "playPause" );
  });

  // Emit Play Followed user
  socket.on( 'timelineUserFollow', ( user, currentFrame, clip, sync ) => {
    socket.broadcast.emit( 'timelineUserFollow', user, currentFrame, clip, sync );
  });

  // Emit line points
  socket.on( 'lineUpdate', ( user, pointA, pointB ) => {
    socket.broadcast.emit( 'lineUpdate', user, pointA, pointB );
  });

  // Remove line
  socket.on( 'lineRemove', ( user ) => {
    socket.broadcast.emit( 'lineRemove', user );
  });

  // Emit Restart
  socket.on( 'restart', ( clip, loop, user ) => {
    updateJson( user, "restart" );
    socket.broadcast.emit( 'restart', clip, loop );
  });

  // Emit Restart - Just for gettiong stats
  socket.on( 'AsyncRestart', ( user ) => {
    updateJson( user, "restart" );
  });

  // Emit Grabbing Timeline
  socket.on( 'grabbing', ( value, progress, sync, user, clip ) => {
    updateJson( user, "grabFrames" );
    socket.broadcast.emit( 'grabbing', value, progress, sync, user, clip );
  });

  // Emit Stop
  socket.on( 'stop', (user, sync) => {
    updateJson( user, "stop" );
    socket.broadcast.emit( 'stop', sync );
  });

    // Emit Stop - Just for getting stats
  socket.on( 'AsyncStop', (user) => {
    updateJson( user, "stop" );
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
  
server.listen( PORT, '0.0.0.0', () => {
console.log( 'listening on *:3000' );
});