import express from 'express';
import { initializeApp } from 'firebase/app';
import { getDatabase, ref, get } from 'firebase/database';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3001;

const firebaseConfig = {
  databaseURL: "https://convite-catarine-default-rtdb.firebaseio.com/" // Seu URL confirmado
};
initializeApp(firebaseConfig);
const database = getDatabase();

app.use(express.json());

// Configuração de CORS definitiva
app.use(cors({
  origin: [
    'http://localhost:5173', // Ambiente local
    'https://convite-catarine-nm3f45v71-gabriels-projects-fca19e5c.vercel.app' // Produção
  ],
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  optionsSuccessStatus: 200
}));
app.options('*', cors());

app.get('/api/estoque', async (req, res) => {
  try {
    const estoqueRef = ref(database, 'estoque');
    const snapshot = await get(estoqueRef);
    const data = snapshot.exists() ? snapshot.val() : { "Fralda RN": 10, "Fralda P": 20, "Fralda M": 30, "Fralda G": 30 };
    res.json(data);
  } catch (error) {
    console.error('Erro Firebase:', error);
    res.status(500).json({ error: 'Falha no servidor' });
  }
});

export default app;

if (process.env.NODE_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Servidor em http://localhost:${PORT}`));
}