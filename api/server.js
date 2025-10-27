// api/server.js
const express = require('express');
const cors = require('cors');

// Firebase Admin SDK (para servidor)
const admin = require('firebase-admin');

// Inicializar Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "convite-catarine",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
    databaseURL: "https://convite-catarine-default-rtdb.firebaseio.com/"
  });
}

const db = admin.database();
const app = express();

app.use(express.json());
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'OPTIONS'] }));
app.options('*', cors());

// ==========================================================
// ROTA 1: ESTOQUE (GET)
// ==========================================================
app.get('/api/estoque', async (req, res) => {
  console.log('📦 Recebida requisição GET para /api/estoque');
  
  try {
    const snapshot = await db.ref('estoque').once('value');
    
    // Valores padrão
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
      console.log('⚠️ Usando estoque padrão');
      // Cria com valores padrão se não existir
      await db.ref('estoque').set(defaultData);
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
// ROTA 2: RESERVA (POST)
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
    const timestamp = new Date().toISOString();
    const updates = {};

    // Processar cada presente selecionado
    for (const [tipoFralda, selecionado] of Object.entries(gifts)) {
      if (selecionado) {
        console.log(`🔄 Processando ${tipoFralda} para ${convidado}`);
        
        const estoqueRef = db.ref(`estoque/${tipoFralda}`);
        
        // Usar transaction do Admin SDK
        await db.ref().transaction((currentData) => {
          if (!currentData) {
            currentData = {};
          }
          
          if (!currentData.estoque) {
            currentData.estoque = {
              "Fralda RN": 10,
              "Fralda P": 20, 
              "Fralda M": 30,
              "Fralda G": 30
            };
          }
          
          const currentStock = currentData.estoque[tipoFralda] || 0;
          if (currentStock <= 0) {
            throw new Error(`Estoque insuficiente para ${tipoFralda}`);
          }
          
          // Decrementa estoque
          currentData.estoque[tipoFralda] = currentStock - 1;
          
          // Adiciona reserva
          if (!currentData.reservas) {
            currentData.reservas = {};
          }
          if (!currentData.reservas[convidado]) {
            currentData.reservas[convidado] = {};
          }
          currentData.reservas[convidado][tipoFralda] = {
            reservado: true,
            quantidade: 1,
            data: timestamp
          };
          
          return currentData;
        });
        
        console.log(`🎉 ${tipoFralda} reservado com sucesso para ${convidado}`);
      }
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
      error: error.message || 'Falha ao registrar a reserva.'
    });
  }
});

// ==========================================================
// ROTA 3: HEALTH CHECK
// ==========================================================
app.get('/api/health', async (req, res) => {
  try {
    const snapshot = await db.ref('estoque').once('value');
    
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

module.exports = app;