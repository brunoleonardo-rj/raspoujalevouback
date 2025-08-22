require('dotenv').config?.();

const app = require('./src/app'); // usa o app que tem as rotas

// (opcional) teste rápido do DB sem derrubar o processo
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
prisma.$queryRaw`SELECT 1`
  .then(() => console.log('DB pronto.'))
  .catch(e => console.error('DB indisponível no boot:', e.message));

const PORT = process.env.PORT || 7778;
const HOST = '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`API up on http://${HOST}:${PORT}`);
});

process.on('unhandledRejection', e => console.error('unhandledRejection', e));
process.on('uncaughtException', e => console.error('uncaughtException', e));
