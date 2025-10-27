// api/server.js
const express = require('express');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, update, runTransaction } = require('firebase/database');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001;

// Configurações do Firebase
const firebaseConfig = {
  databaseURL: "https://convite-catarine-default-rtdb.firebaseio.com/"
};

// Inicializar Firebase
const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

app.use(express.json());

// CORS configuration
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  optionsSuccessStatus: 200
}));

app.options('*', cors());

// ==========================================================
// ROTA 1: ESTOQUE (GET)
// ==========================================================
app.get('/api/estoque', async (req, res) => {
  console.log('📦 Recebida requisição GET para /api/estoque');
  
  try {
    const estoqueRef = ref(database, 'estoque');
    const snapshot = await get(estoqueRef);
    
    // Valores padrão caso o Firebase não tenha dados
    const defaultData = { 
      "Fralda RN": 10, 
      "Fralda P": 20, 
      "Fralda M": 30, 
      "Fralda G": 30 
    };
    
    let data;
    if (snapshot.exists()) {
      data = snapshot.val();
      console.log('✅ Estoque encontrado no Firebase:', data);
    } else {
      data = defaultData;
      console.log('⚠️  Usando estoque padrão:', data);
      
      // Se não existe, cria com valores padrão
      await update(ref(database, 'estoque'), defaultData);
    }
    
    res.json(data);
  } catch (error) {
    console.error('❌ Erro Firebase na rota estoque:', error);
    res.status(500).json({ 
      error: 'Falha no servidor ao buscar estoque',
      details: error.message 
    });
  }
});

// ==========================================================
// ROTA 2: RESERVA (POST) - ATUALIZADA COM CONTROLE DE ESTOQUE
// ==========================================================
app.post('/api/reservar', async (req, res) => {
  console.log('🎯 Recebida requisição POST para /api/reservar:', req.body);
  
  const { gifts, convidado } = req.body;

  if (!gifts || !convidado) {
    return res.status(400).json({ 
      success: false,
      error: 'Faltando dados de presentes ou nome do convidado.' 
    });
  }

  try {
    const updates = {};
    const timestamp = new Date().toISOString();
    const reservasUpdates = {};

    // Processar cada presente selecionado
    for (const [tipoFralda, selecionado] of Object.entries(gifts)) {
      if (selecionado) {
        console.log(`🔄 Processando ${tipoFralda} para ${convidado}`);
        
        const estoqueRef = ref(database, `estoque/${tipoFralda}`);
        
        try {
          // Usar transaction para garantir atomicidade
          await runTransaction(estoqueRef, (currentStock) => {
            console.log(`📊 Estoque atual de ${tipoFralda}:`, currentStock);
            
            // Se não existe no Firebase, usar valor padrão
            if (currentStock === null) {
              const defaultStock = {
                "Fralda RN": 10,
                "Fralda P": 20, 
                "Fralda M": 30,
                "Fralda G": 30
              }[tipoFralda];
              
              console.log(`⚠️  ${tipoFralda} não encontrado, usando padrão:`, defaultStock - 1);
              return defaultStock - 1;
            }
            
            const stockNumber = parseInt(currentStock);
            if (isNaN(stockNumber) || stockNumber <= 0) {
              throw new Error(`Estoque insuficiente para ${tipoFralda}`);
            }
            
            console.log(`✅ Reservando ${tipoFralda}. Novo estoque:`, stockNumber - 1);
            return stockNumber - 1;
          });
          
          // Registrar a reserva
          reservasUpdates[`reservas/${convidado}/${tipoFralda}`] = {
            reservado: true,
            quantidade: 1,
            data: timestamp
          };
          
          console.log(`🎉 ${tipoFralda} reservado com sucesso para ${convidado}`);
          
        } catch (transactionError) {
          console.error(`❌ Erro na transação para ${tipoFralda}:`, transactionError);
          throw new Error(`Falha ao reservar ${tipoFralda}: ${transactionError.message}`);
        }
      }
    }

    // Aplicar todas as reservas no Firebase
    if (Object.keys(reservasUpdates).length > 0) {
      await update(ref(database), reservasUpdates);
      console.log('📝 Reservas registradas no Firebase');
    }

    res.status(200).json({ 
      success: true, 
      message: 'Reservas registradas com sucesso e estoque atualizado.',
      convidado: convidado,
      gifts: gifts
    });
    
  } catch (error) {
    console.error('💥 Erro geral na rota reservar:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Falha ao registrar a reserva.',
      details: 'Erro interno do servidor'
    });
  }
});

// ==========================================================
// ROTA 3: HEALTH CHECK
// ==========================================================
app.get('/api/health', async (req, res) => {
  try {
    const estoqueRef = ref(database, 'estoque');
    const snapshot = await get(estoqueRef);
    
    res.json({
      status: 'healthy',
      firebase: 'connected',
      estoque: snapshot.exists() ? snapshot.val() : 'not_initialized',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      firebase: 'disconnected',
      error: error.message
    });
  }
});

// ==========================================================
// EXPORTAÇÃO (Vercel Serverless Function)
// ==========================================================
module.exports = app;

// Bloco para execução local (não é usado no Vercel)
if (process.env.NODE_ENV !== 'production' && process.env.VERCEL_ENV !== 'production') {
  app.listen(PORT, () => {
    console.log(`🚀 Servidor de API rodando em http://localhost:${PORT}`);
    console.log(`📊 Health check: http://localhost:${PORT}/api/health`);
    console.log(`📦 Estoque: http://localhost:${PORT}/api/estoque`);
  });
}