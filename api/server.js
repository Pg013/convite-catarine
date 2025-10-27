import express from 'express';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get, set, update } from 'firebase/database';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

const firebaseConfig = {
  databaseURL: "https://convite-catarine-default-rtdb.firebaseio.com" // Certifique-se de que tá correto
};
const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

app.use(cors());
app.use(express.json());

const MAX_GIFTS = { "Fralda RN": 10, "Fralda P": 20, "Fralda M": 30, "Fralda G": 30 };

const estoqueRef = ref(database, 'estoque');
get(estoqueRef).then(snapshot => {
  if (!snapshot.exists()) set(estoqueRef, MAX_GIFTS);
}).catch(console.error);

app.get('/', (req, res) => {
  res.status(200).send('Servidor do convite funcionando! 🎉');
});

app.get('/api/estoque', async (req, res) => {
  try {
    const snapshot = await get(estoqueRef);
    res.json(snapshot.exists() ? snapshot.val() : MAX_GIFTS);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar estoque' });
  }
});

app.post('/api/reservar', async (req, res) => {
  const { gifts, convidado } = req.body;
  if (!convidado || !gifts) return res.status(400).json({ error: 'Convidado e gifts são obrigatórios' });

  const tipos = Object.keys(gifts).filter(k => gifts[k] && MAX_GIFTS[k]);
  if (!tipos.length) return res.status(400).json({ error: 'Nenhum presente válido' });

  try {
    const snapshot = await get(estoqueRef);
    const estoque = snapshot.exists() ? snapshot.val() : MAX_GIFTS;
    const updates = {};

    for (const tipo of tipos) {
      if (estoque[tipo] <= 0) return res.status(400).json({ error: `${tipo} esgotou` });
      updates[tipo] = estoque[tipo] - 1;
    }

    await update(estoqueRef, updates);
    res.json({ message: `Reserva por ${convidado}`, estoque: { ...estoque, ...updates } });
  } catch (error) {
    res.status(400).json({ error: 'Erro ao reservar' });
  }
});

export default app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Servidor em http://localhost:${PORT}`));
}