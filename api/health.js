@'
// api/health.js
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
  
  try {
    const snapshot = await db.ref('estoque').once('value');
    
    res.status(200).json({
      status: 'healthy',
      firebase: 'connected',
      estoque: snapshot.exists() ? snapshot.val() : 'not_initialized',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Erro no health check:', error);
    res.status(500).json({
      status: 'error',
      firebase: 'disconnected',
      error: error.message
    });
  }
}
'@ | Out-File -FilePath "health.js" -Encoding utf8