const express = require( 'express' );
const app = express();
const fs = require("fs/promises");
const http = require( 'http' ) ;
const PORT = process.env.PORT || 3000;

const server = http.createServer( app );
const { Server } = require( "socket.io" );
//const io = new Server( server );
const LOG_FILE = "./eventLog.jsonl"

//Buffer updates. 
const buffer = []

// Attention to this. CHANGE THE ORIGIN for production
const io = require( 'socket.io' )( server, {
  cors: {
    origin: "*",
  }
});

app.get('/', ( req, res ) => {
  res.send( '<h1>Hello world</h1>' );
});

/* async function updateJson( user, eventType, value ) {
  try {
    
    const event = {
      user: user,
      event: eventType,
      value: value,
      timeStamp: Date.now()
    };

    await fs.appendFile(
      LOG_FILE,
      JSON.stringify( event ) + "\n"
    )

  } catch (err) {
      if (err.code === "ENOENT") {
        // File doesn't exist → just ignore and leave
        return;
      }

      // Any OTHER error should still be thrown
      throw err;
  } 
} */

// Function to flush camera events every 2 seconds. 
// This is to avoid writing to the file system too often, which can be a performance bottleneck.
setInterval( async () => {

  if ( buffer.length === 0 ) return

  const eventsToWrite = buffer.splice(0)

  const lines = eventsToWrite
    .map(e => JSON.stringify(e))
    .join("\n") + "\n"

  await fs.appendFile("eventLog.jsonl", lines)

  //console.log(`Flushed ${eventsToWrite.length} camera events`)

}, 2000)

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
    buffer.push({
      user: msg.userName,
      event: "cameraMove",
      value: [ msg.x, msg.y, msg.z, msg.lx, msg.ly, msg.lz ],
      timeStamp: Date.now()
    })
    socket.broadcast.emit( 'updateCamera', msg )
  });

  // Update XRcamera for all session users but the sender
  socket.on( 'updateXRCamera', ( msg ) => {
    buffer.push({
      user: msg.userName,
      event: "cameraMoveXR",
      value: [ msg.pos.x, msg.pos.y, msg.pos.z, msg.rot[0], msg.rot[1], msg.rot[2] ],
      timeStamp: Date.now()
    })
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
    //updateJson( user, "clipChanges", value );
    buffer.push({
      user: user,
      event: "clipChanges",
      value: value,
      timeStamp: Date.now()
    })
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
    //updateJson( user, "playPause", clip );
    buffer.push({
      user: user,
      event: "playPause",
      value: clip,
      timeStamp: Date.now()
    })   
    socket.broadcast.emit( 'play', clip, time, loop, user );
  });

  // Emit Play - Just for getting stats
  socket.on( 'AsyncPlay', ( user ) => {
    //updateJson( user, "playPause", "async" );
    buffer.push({
      user: user,
      event: "playPause",
      value: "async",
      timeStamp: Date.now()
    })   
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
    //updateJson( user, "restart", clip );
    buffer.push({
      user: user,
      event: "restart",
      value: clip,
      timeStamp: Date.now()
    })   
    socket.broadcast.emit( 'restart', clip, loop );
  });

  // Emit Restart - Just for gettiong stats
  socket.on( 'AsyncRestart', ( user ) => {
    //updateJson( user, "restart", "async" );
    buffer.push({
      user: user,
      event: "restart",
      value: "async",
      timeStamp: Date.now()
    })   
  });

  // Emit Grabbing Timeline
  socket.on( 'grabbing', ( value, progress, sync, user, clip ) => {
    //updateJson( user, "grabFrames", value );
    buffer.push({
      user: user,
      event: "grabFrames",
      value: value,
      timeStamp: Date.now()
    })   
    socket.broadcast.emit( 'grabbing', value, progress, sync, user, clip );
  });

  // Emit Stop
  socket.on( 'stop', (user, sync) => {
    //updateJson( user, "stop", "sync" );
    buffer.push({
      user: user,
      event: "stop",
      value: "sync",
      timeStamp: Date.now()
    })
    socket.broadcast.emit( 'stop', sync );
  });

    // Emit Stop - Just for getting stats
  socket.on( 'AsyncStop', (user) => {
    //updateJson( user, "stop", "async" );
    buffer.push({
      user: user,
      event: "stop",
      value: "async",
      timeStamp: Date.now()
    })
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