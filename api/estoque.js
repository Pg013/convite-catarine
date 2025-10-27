import admin from "firebase-admin";

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: "convite-catarine",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
    databaseURL: "https://convite-catarine-default-rtdb.firebaseio.com/"
  });
}

const db = admin.database();

export default async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method === "GET") {
    try {
      const snapshot = await db.ref("estoque").once("value");
      const defaultData = { 
        "Fralda RN": 10, 
        "Fralda P": 20, 
        "Fralda M": 30, 
        "Fralda G": 30 
      };
      
      const data = snapshot.exists() ? snapshot.val() : defaultData;
      res.status(200).json(data);
    } catch (error) {
      console.error("Erro:", error);
      res.status(500).json({ error: error.message });
    }
  }

  if (req.method === "POST") {
    try {
      const { gifts, convidado } = req.body;

      if (!gifts || !convidado) {
        return res.status(400).json({ error: "Dados incompletos" });
      }

      const updates = {};
      const timestamp = new Date().toISOString();

      for (const [tipoFralda, selecionado] of Object.entries(gifts)) {
        if (selecionado) {
          const estoqueRef = db.ref(`estoque/${tipoFralda}`);
          const snapshot = await estoqueRef.once("value");
          const currentStock = snapshot.val();
          
          if (currentStock === null || currentStock <= 0) {
            return res.status(400).json({ error: `Estoque insuficiente para ${tipoFralda}` });
          }
          
          await estoqueRef.set(currentStock - 1);
          
          updates[`reservas/${convidado}/${tipoFralda}`] = {
            reservado: true,
            data: timestamp
          };
        }
      }

      if (Object.keys(updates).length > 0) {
        await db.ref().update(updates);
      }

      res.status(200).json({ 
        success: true, 
        message: "Reserva realizada com sucesso" 
      });

    } catch (error) {
      console.error("Erro:", error);
      res.status(500).json({ error: error.message });
    }
  }
}