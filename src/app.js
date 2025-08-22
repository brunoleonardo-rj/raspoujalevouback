const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const path = require('path');

// Middlewares customizados
const authMiddleware = require('./middleware/auth.middleware');
const uploadMiddleware = require('./middleware/upload.middleware');

// Rotas
const authRoutes = require('./routes/auth.routes');
const userRoutes = require('./routes/user.routes');
const scratchCardRoutes = require('./routes/scratchcard.routes');
const depositRoutes = require('./routes/deposit.routes');
const adminRoutes = require('./routes/admin.routes');
const licenseRoutes = require('./routes/license.routes');
const settingRoutes = require('./routes/setting.routes');
const webhookRoutes = require('./routes/webhook.routes');

// App
const app = express();
app.set('trust proxy', 1);

// Segurança
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:"],
    },
  },
  crossOriginEmbedderPolicy: false
}));

// CORS
app.use(cors({
  origin: '*',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Rate limit global
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 1000,
  message: {
    success: false,
    message: 'Muitas requisições deste IP, tente novamente mais tarde'
  },
  standardHeaders: true,
  legacyHeaders: false
});
app.use(globalLimiter);

// Compressão + logs
app.use(compression());
app.use(process.env.NODE_ENV === 'development' ? morgan('dev') : morgan('combined'));

// Body parsers
app.use(express.json({
  limit: '10mb',
  verify: (req, res, buf) => {
    try { JSON.parse(buf); }
    catch (e) {
      const error = new Error('JSON inválido');
      error.status = 400;
      error.type = 'entity.parse.failed';
      throw error;
    }
  }
}));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Estáticos
app.use('/uploads', express.static(path.join(__dirname, '../public/uploads')));

// Log de request
app.use(authMiddleware.logRequest);

// Healthcheck
app.get('/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Servidor funcionando corretamente',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Raiz
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Olá amigo, o que perdeu aqui?',
    version: '1.0.0',
  });
});

// v1
const v1Router = '/v1';
app.use(v1Router + '/api/auth', authRoutes);
app.use(v1Router + '/api/users', userRoutes);
app.use(v1Router + '/api/scratchcards', scratchCardRoutes);
app.use(v1Router + '/api/deposits', depositRoutes);
app.use(v1Router + '/api/admin', adminRoutes);
app.use(v1Router + '/api/license', licenseRoutes);
app.use(v1Router + '/api/setting', settingRoutes);
app.use(v1Router + '/api/payments', webhookRoutes);

// 404
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Rota não encontrada',
    path: req.originalUrl,
    method: req.method
  });
});

// Erros de upload
app.use(uploadMiddleware.handleError);

// Erros globais
app.use(authMiddleware.errorHandler);

// Falhas não capturadas
process.on('uncaughtException', (error) => {
  console.error('Erro não capturado:', error);
  process.exit(1);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('Promise rejeitada não tratada:', reason);
  console.error('Promise:', promise);
  process.exit(1);
});

module.exports = app;
