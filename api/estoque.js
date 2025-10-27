@'
// api/estoque.js
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
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('🔍 Buscando estoque...');
    const snapshot = await db.ref('estoque').once('value');
    
    const defaultData = { 
      "Fralda RN": 10, 
      "Fralda P": 20, 
      "Fralda M": 30, 
      "Fralda G": 30 
    };
    
    let data;
    if (snapshot.exists()) {
      data = snapshot.val();
      console.log('✅ Estoque encontrado:', data);
    } else {
      data = defaultData;
      console.log('⚠️ Usando estoque padrão');
      await db.ref('estoque').set(defaultData);
    }
    
    res.status(200).json(data);
  } catch (error) {
    console.error('❌ Erro no estoque:', error);
    res.status(500).json({ 
      error: 'Falha ao buscar estoque',
      details: error.message 
    });
  }
}
'@ | Out-File -FilePath "estoque.js" -Encoding utf8