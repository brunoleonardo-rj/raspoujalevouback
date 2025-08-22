require('dotenv').config?.();
const express = require('express');
const compression = require('compression');
const helmet = require('helmet');
const morgan = require('morgan');

const app = express();
app.use(helmet());
app.use(compression());
app.use(express.json());
app.use(morgan('dev'));

// healthcheck simples (não toca em DB)
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'ok', ts: new Date().toISOString() });
});

// EXEMPLO: inicialização “preguiçosa” do Prisma
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// não faça process.exit se falhar
(async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    console.log('DB pronto.');
  } catch (e) {
    console.error('DB indisponível no boot:', e.message);
  }
})();

const PORT = process.env.PORT || 7778;
const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log(`API up on http://${HOST}:${PORT}`);
});

process.on('unhandledRejection', e => console.error('unhandledRejection', e));
process.on('uncaughtException', e => console.error('uncaughtException', e));
