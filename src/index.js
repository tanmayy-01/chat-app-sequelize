const express = require('express');
const http = require('http');
const path = require('path');
const cookieParser = require('cookie-parser');
const { Server } = require('socket.io');

const serverConfig = require('./config/server-config');
const apiRoutes = require('./routes');
const viewRoutes = require('./routes/view-routes');
const setupSockets = require('./sockets');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE']
    }
});

// Configure EJS view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// Middlewares
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Serve static assets (CSS, JS, uploads, icons)
app.use(express.static(path.join(__dirname, '../public')));

// Attach io to req for controllers if needed
app.use((req, res, next) => {
    req.io = io;
    next();
});

// Mount routes
app.use('/', viewRoutes);
app.use('/api', apiRoutes);

// Socket.io handlers
setupSockets(io);

server.listen(serverConfig.PORT || 5000, () => {
    console.log(`Server successfully started on port: ${serverConfig.PORT || 5000}`);
});

module.exports = { app, server, io };
