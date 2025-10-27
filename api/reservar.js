import admin from 'firebase-admin';

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

export default async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const { gifts, convidado } = req.body;

    if (!gifts || !convidado) {
      return res.status(400).json({ 
        success: false,
        error: 'Faltando dados de presentes ou nome do convidado.' 
      });
    }

    const timestamp = new Date().toISOString();
    const updates = {};

    // Processar cada presente selecionado
    for (const [tipoFralda, selecionado] of Object.entries(gifts)) {
      if (selecionado) {
        console.log(`🔄 Processando ${tipoFralda} para ${convidado}`);
        
        const estoqueRef = db.ref(`estoque/${tipoFralda}`);
        const snapshot = await estoqueRef.once('value');
        const currentStock = snapshot.val();
        
        // Se não existe, usar valor padrão
        const stockAtual = currentStock === null ? 
          { "Fralda RN": 10, "Fralda P": 20, "Fralda M": 30, "Fralda G": 30 }[tipoFralda] : 
          currentStock;
        
        if (stockAtual <= 0) {
          return res.status(400).json({ 
            success: false,
            error: `Estoque insuficiente para ${tipoFralda}. Disponível: ${stockAtual}` 
          });
        }
        
        // Atualizar estoque
        await estoqueRef.set(stockAtual - 1);
        
        // Registrar reserva
        updates[`reservas/${convidado}/${tipoFralda}`] = {
          reservado: true,
          quantidade: 1,
          data: timestamp
        };
        
        console.log(`✅ ${tipoFralda} reservado. Novo estoque: ${stockAtual - 1}`);
      }
    }

    // Aplicar todas as reservas
    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
      console.log(`📝 Reservas registradas para ${convidado}`);
    }

    res.status(200).json({ 
      success: true, 
      message: 'Reservas registradas com sucesso e estoque atualizado.',
      convidado: convidado
    });
    
  } catch (error) {
    console.error('💥 Erro na reserva:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message || 'Falha ao registrar a reserva.'
    });
  }
}