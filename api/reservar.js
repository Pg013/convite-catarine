@'
// api/reservar.js
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
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

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

    // Processar cada presente
    for (const [tipoFralda, selecionado] of Object.entries(gifts)) {
      if (selecionado) {
        console.log(`🔄 Processando ${tipoFralda} para ${convidado}`);
        
        const estoqueRef = db.ref(`estoque/${tipoFralda}`);
        const snapshot = await estoqueRef.once('value');
        const currentStock = snapshot.val();
        
        if (currentStock === null || currentStock <= 0) {
          throw new Error(`Estoque insuficiente para ${tipoFralda}`);
        }
        
        // Atualizar estoque
        await estoqueRef.set(currentStock - 1);
        
        // Registrar reserva
        updates[`reservas/${convidado}/${tipoFralda}`] = {
          reservado: true,
          quantidade: 1,
          data: timestamp
        };
        
        console.log(`🎉 ${tipoFralda} reservado. Novo estoque:`, currentStock - 1);
      }
    }

    // Aplicar reservas
    if (Object.keys(updates).length > 0) {
      await db.ref().update(updates);
    }

    res.status(200).json({ 
      success: true, 
      message: 'Reservas registradas com sucesso.',
      convidado: convidado
    });
    
  } catch (error) {
    console.error('💥 Erro na reserva:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}
'@ | Out-File -FilePath "reservar.js" -Encoding utf8