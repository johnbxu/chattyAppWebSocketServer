// server.js

const express = require('express');
const SocketServer = require('ws').Server;
const uuid = require('uuid');

// Set the port to 3001
const PORT = 3001;

// Create a new express server
const server = express()
   // Make the express server serve static assets (html, javascript, css) from the /public folder
  .use(express.static('public'))
  .listen(PORT, '0.0.0.0', 'localhost', () => console.log(`Listening on ${ PORT }`));

// Create the WebSockets server
const wss = new SocketServer({ server });

// Initializing the broadcast function
wss.broadcast = function broadcast(data) {
  wss.clients.forEach(function each(client) {
    client.send(data);
  });
};

// Assigns a random color contained in the colors object to a client
const pickColor = (ws) => {
  if (!ws.color) {
    ws.color = '#' + Math.floor(Math.random()*16777215).toString(16);
  }
};

// Function that checks if a message contains any of the image extensions, and if
//   yes, return all the image urls inside an array
const imgFormats = ['.jpeg', '.png', '.bmp', '.gif', '.jpg']
const checkForImages = (message) => {
  let imgURLs = [];
  imgFormats.forEach((format) => {
    if (message.toLowerCase().indexOf(format) > -1) {
      const split = message.split(' ');
      imgURLs = (split.filter(ele => ele.indexOf(format) > -1));
    }
  });
  return (imgURLs) ? imgURLs : null;
};

// Returns a list of currently connected users
const getUsers = () => {
  const users = [];
  wss.clients.forEach(client => {
    users.push(client.username);
  });
  return users;
};

// Set up a callback that will run when a client connects to the server
// When a client connects they are assigned a socket, represented by
// the ws parameter in the callback.
wss.on('connection', (ws) => {
  console.log('Client connected');
  pickColor(ws); // Assigns a color to a client on connection

  // Processes messages received and responds with a JSON object with additional information
  ws.on('message', function incoming(data) {
    const reply = JSON.parse(data);
    ws.username = reply.username;   // Updates client object with current user name

    reply.id = uuid();
    reply.color = ws.color;
    reply.imgs = checkForImages(reply.content);
    reply.userCount = wss.clients.size;   // Total connected clients
    reply.connectedUsers = getUsers();    // Array of connected usernames
    reply.date = new Date();

    wss.broadcast(JSON.stringify(reply));
  });

  // Set up a callback for when a client closes the socket. This usually means they closed their browser.
  ws.on('close', () => {
    console.log('Client disconnected');
    const reply = {
      type: 'postNotification',
      id: uuid(),
      username: ws.username,
      content: `${ws.username} has disconnected`,
      userCount: wss.clients.size,
      connectedUsers: getUsers(),
      imgs: [],
      color: null,
      date: null,
    };
    wss.broadcast(JSON.stringify(reply));
  });
});
