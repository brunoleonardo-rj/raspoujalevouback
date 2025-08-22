// src/middleware/auth.middleware.js
const authService = require('../services/auth.service');

class AuthMiddleware {
  /**
   * Verifica se o usuário está autenticado
   */
  async authenticate(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader) {
        return res.status(401).json({
          success: false,
          message: 'Token de acesso não fornecido'
        });
      }

      const token = authHeader.replace('Bearer ', '');
      if (!token) {
        return res.status(401).json({
          success: false,
          message: 'Formato de token inválido'
        });
      }

      const user = await authService.verifyToken(token);
      req.user = user;
      req.token = token;
      next();
    } catch (error) {
      console.error('Erro na autenticação:', error);
      return res.status(401).json({
        success: false,
        message: error.message || 'Token inválido ou expirado'
      });
    }
  }

  /**
   * Exige privilégios de administrador
   */
  async requireAdmin(req, res, next) {
    try {
      if (!req.user) {
        return res.status(401).json({
          success: false,
          message: 'Usuário não autenticado'
        });
      }

      if (!req.user.is_admin) {
        return res.status(403).json({
          success: false,
          message: 'Acesso negado. Privilégios de administrador necessários'
        });
      }

      next();
    } catch (error) {
      console.error('Erro na verificação de admin:', error);
      return res.status(500).json({
        success: false,
        message: 'Erro interno do servidor'
      });
    }
  }

  /**
   * Autenticação opcional (não bloqueia se falhar)
   */
  async optionalAuth(req, res, next) {
    try {
      const authHeader = req.headers.authorization;
      if (authHeader) {
        const token = authHeader.replace('Bearer ', '');
        if (token) {
          try {
            const user = await authService.verifyToken(token);
            req.user = user;
            req.token = token;
          } catch (error) {
            console.log('Token opcional inválido:', error.message);
          }
        }
      }
      next();
    } catch (error) {
      console.error('Erro na autenticação opcional:', error);
      next();
    }
  }

  /**
   * Exige ser dono do recurso OU admin
   */
  requireOwnershipOrAdmin(paramName = 'userId') {
    return async (req, res, next) => {
      try {
        if (!req.user) {
          return res.status(401).json({
            success: false,
            message: 'Usuário não autenticado'
          });
        }

        const targetUserId = req.params[paramName] || req.body[paramName];
        if (!targetUserId) {
          return res.status(400).json({
            success: false,
            message: `Parâmetro ${paramName} é obrigatório`
          });
        }

        if (req.user.is_admin || req.user.id === targetUserId) {
          return next();
        }

        return res.status(403).json({
          success: false,
          message: 'Acesso negado. Você só pode acessar seus próprios dados'
        });
      } catch (error) {
        console.error('Erro na verificação de propriedade:', error);
        return res.status(500).json({
          success: false,
          message: 'Erro interno do servidor'
        });
      }
    };
  }

  /**
   * Rate limit simples em memória (por IP)
   */
  rateLimit(maxRequests = 15000, windowMs = 15 * 60 * 1000) {
    const requests = new Map();

    return (req, res, next) => {
      const clientId = req.ip || req.connection?.remoteAddress;
      const now = Date.now();

      // limpa janelas antigas
      for (const [key, data] of requests.entries()) {
        if (now - data.firstRequest > windowMs) requests.delete(key);
      }

      const entry = requests.get(clientId);
      if (!entry) {
        requests.set(clientId, { count: 1, firstRequest: now });
        return next();
      }

      if (now - entry.firstRequest > windowMs) {
        requests.set(clientId, { count: 1, firstRequest: now });
        return next();
      }

      if (entry.count >= maxRequests) {
        return res.status(429).json({
          success: false,
          message: 'Muitas requisições. Tente novamente mais tarde',
          retryAfter: Math.ceil((windowMs - (now - entry.firstRequest)) / 1000)
        });
      }

      entry.count++;
      next();
    };
  }

  /**
   * Valida campos obrigatórios do body
   */
  validateRequiredFields(requiredFields = []) {
    return (req, res, next) => {
      const missing = [];
      for (const f of requiredFields) {
        if (!Object.prototype.hasOwnProperty.call(req.body, f) || req.body[f] === '' || req.body[f] === null || req.body[f] === undefined) {
          missing.push(f);
        }
      }
      if (missing.length) {
        return res.status(400).json({
          success: false,
          message: 'Campos obrigatórios não fornecidos',
          missing_fields: missing
        });
      }
      next();
    };
  }

  /**
   * Sanitiza strings do body
   */
  sanitizeInput(req, res, next) {
    try {
      if (req.body && typeof req.body === 'object') {
        for (const key in req.body) {
          if (typeof req.body[key] === 'string') {
            req.body[key] = req.body[key].trim().replace(/[<>"']/g, '');
          }
        }
      }
      next();
    } catch (error) {
      console.error('Erro na sanitização:', error);
      next();
    }
  }

  /**
   * Log básico de request
   */
  logRequest(req, res, next) {
    const ts = new Date().toISOString();
    const method = req.method;
    const url = req.originalUrl;
    const ip = req.ip || req.connection?.remoteAddress;
    const ua = req.get('User-Agent');
    const userId = req.user?.id || 'anonymous';
    console.log(`[${ts}] ${method} ${url} - IP: ${ip} - User: ${userId} - UA: ${ua}`);
    next();
    // (se quiser logar também a resposta, dá pra usar res.on('finish', ...))
  }

  /**
   * Tratador global de erros
   */
  errorHandler(error, req, res, next) {
    console.error('Erro global capturado:', error);
    if (res.headersSent) return next(error);

    // JSON inválido
    if (error.type === 'entity.parse.failed' || error.message === 'JSON inválido') {
      return res.status(400).json({ success: false, message: 'JSON inválido' });
    }

    // Body inválido
    if (error.type === 'entity.verify.failed') {
      return res.status(400).json({ success: false, message: 'Dados inválidos na requisição' });
    }

    // Prisma
    if (error.code === 'P2002') {
      return res.status(400).json({ success: false, message: 'Dados duplicados. Verifique os campos únicos' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ success: false, message: 'Registro não encontrado' });
    }

    const status = error.status || error.statusCode || 500;
    res.status(status).json({
      success: false,
      message: process.env.NODE_ENV === 'production' ? 'Erro interno do servidor' : (error.message || 'Erro interno do servidor')
    });
  }
}

module.exports = new AuthMiddleware();
