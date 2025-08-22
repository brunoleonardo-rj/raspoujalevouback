// server.js
require('dotenv').config?.();

// importa o app completo, com todas as rotas (inclui "/")
const app = require('./src/app');

const PORT = process.env.PORT || 7778;
const HOST = process.env.HOST || '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`API up on http://${HOST}:${PORT}`);
});

// logs básicos de erros não fatais
process.on('unhandledRejection', e => console.error('unhandledRejection', e));
process.on('uncaughtException', e => console.error('uncaughtException', e));
