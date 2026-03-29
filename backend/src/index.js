const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { seedDefaultUsers } = require('./db');
const { initSocket } = require('./socket');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.set('io', io);

app.use('/api/auth',    require('./routes/auth'));
app.use('/api/tickets', require('./routes/tickets'));
app.use('/api/users',   require('./routes/users'));
app.use('/api/reports', require('./routes/reports'));

initSocket(io);

const PORT = process.env.PORT || 3000;

async function start() {
  await seedDefaultUsers();
  server.listen(PORT, () => {
    console.log(`🚀 COSPEC Backend corriendo en puerto ${PORT}`);
  });
}

start().catch(console.error);
