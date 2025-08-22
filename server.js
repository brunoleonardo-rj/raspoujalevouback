require('dotenv').config();

const app = require('./src/app');
const { testConnection, disconnect } = require('./src/config/database');

// Configurações do servidor
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';
const NODE_ENV = process.env.NODE_ENV || 'development';

// Variável para armazenar a instância do servidor
let server;

/**
 * Função para inicializar o servidor
 */
async function startServer() {
  try {
    console.log('🚀 Iniciando servidor...');
    console.log(`📦 Ambiente: ${NODE_ENV}`);
    
    // Testar conexão com o banco de dados
    console.log('🔌 Testando conexão com o banco de dados...');
    const isConnected = await testConnection();
    if (!isConnected) {
      throw new Error('Falha na conexão com o banco de dados');
    }
    console.log('✅ Banco de dados conectado com sucesso!');
    
    // Iniciar servidor HTTP
    server = app.listen(PORT, HOST, () => {
      console.log('🎉 Servidor iniciado com sucesso!');
      console.log(`🌐 URL: ${process.env.BACKEND_URL}`);
      console.log(`📋 Health Check: ${process.env.BACKEND_URL}/health`);
      console.log('⏰ Timestamp:', new Date().toISOString());
      
      if (NODE_ENV === 'development') {
        console.log('\n🛠️  Modo de desenvolvimento ativo');
        console.log('📝 Logs detalhados habilitados');
        console.log('🔄 Hot reload disponível');
      }
      
      console.log('\n' + '='.repeat(50));
      console.log('🎮 License by Hero iGaming | Version 1.0.0');
      console.log('='.repeat(50) + '\n');
    });
    
    // Configurar timeout do servidor
    server.timeout = 30000; // 30 segundos
    
    // Event listeners do servidor
    server.on('error', (error) => {
      if (error.code === 'EADDRINUSE') {
        console.error(`❌ Porta ${PORT} já está em uso`);
        console.log('💡 Tente usar uma porta diferente ou pare o processo que está usando esta porta');
      } else {
        console.error('❌ Erro no servidor:', error);
      }
      process.exit(1);
    });
    
    server.on('close', () => {
      console.log('🔴 Servidor HTTP fechado');
    });
    
  } catch (error) {
    console.error('❌ Erro ao inicializar servidor:', error);
    process.exit(1);
  }
}

/**
 * Função para parar o servidor graciosamente
 */
async function stopServer() {
  console.log('\n🛑 Iniciando shutdown gracioso...');
  
  try {
    // Fechar servidor HTTP
    if (server) {
      console.log('🔌 Fechando servidor HTTP...');
      await new Promise((resolve) => {
        server.close(resolve);
      });
      console.log('✅ Servidor HTTP fechado');
    }
    
    // Desconectar do banco de dados
    console.log('🔌 Desconectando do banco de dados...');
    await disconnect();
    console.log('✅ Banco de dados desconectado');
    
    console.log('✅ Shutdown concluído com sucesso');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Erro durante shutdown:', error);
    process.exit(1);
  }
}

// Handlers para sinais de sistema
process.on('SIGTERM', () => {
  console.log('\n📡 Sinal SIGTERM recebido');
  stopServer();
});

process.on('SIGINT', () => {
  console.log('\n📡 Sinal SIGINT recebido (Ctrl+C)');
  stopServer();
});

// Handler para erros não capturados
process.on('uncaughtException', (error) => {
  console.error('💥 Erro não capturado:', error);
  console.error('Stack trace:', error.stack);
  stopServer();
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('💥 Promise rejeitada não tratada:', reason);
  console.error('Promise:', promise);
  stopServer();
});

// Verificar variáveis de ambiente essenciais
function checkEnvironmentVariables() {
  const requiredVars = ['DATABASE_URL', 'JWT_SECRET'];
  const missingVars = [];
  
  for (const varName of requiredVars) {
    if (!process.env[varName]) {
      missingVars.push(varName);
    }
  }
  
  if (missingVars.length > 0) {
    console.error('❌ Variáveis de ambiente obrigatórias não encontradas:');
    missingVars.forEach(varName => {
      console.error(`   - ${varName}`);
    });
    console.error('\n💡 Verifique seu arquivo .env');
    process.exit(1);
  }
}

// Função principal
async function main() {
  try {
    console.log('🔍 Verificando variáveis de ambiente...');
    checkEnvironmentVariables();
    console.log('✅ Variáveis de ambiente verificadas');
    
    await startServer();
  } catch (error) {
    console.error('❌ Erro na inicialização:', error);
    process.exit(1);
  }
}

// Inicializar aplicação apenas se este arquivo for executado diretamente
if (require.main === module) {
  main();
}

// Exportar para testes
module.exports = {
  app,
  startServer,
  stopServer
};