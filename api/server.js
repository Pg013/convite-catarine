// Use require() para melhor compatibilidade com Vercel/Node.js padrão
const express = require('express'); 
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, update } = require('firebase/database'); 
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001; // Mantido apenas para teste local

// Configurações do Firebase
const firebaseConfig = {
  databaseURL: "https://convite-catarine-default-rtdb.firebaseio.com/" // Seu URL do Firebase
};
initializeApp(firebaseConfig);
const database = getDatabase();

app.use(express.json());

// ==========================================================
// CONFIGURAÇÃO DE CORS UNIVERSAL
// Permite que *qualquer* domínio (local, preview, produção) acesse a API.
// Isso resolve o erro de conexão que persiste.
// ==========================================================
app.use(cors({
  origin: '*', // <--- A MUDANÇA CRUCIAL
  methods: ['GET', 'POST', 'OPTIONS'], // GET para estoque, POST para reserva, OPTIONS para CORS preflight
  allowedHeaders: ['Content-Type'],
  optionsSuccessStatus: 200 // Resposta de sucesso para OPTIONS
}));

// ROTA DE PRÉ-FLIGHT (Necessário para requisições POST)
app.options('*', cors());

// ==========================================================
// ROTA 1: ESTOQUE (GET)
// ==========================================================
app.get('/api/estoque', async (req, res) => {
  try {
    const estoqueRef = ref(database, 'estoque');
    const snapshot = await get(estoqueRef);
    // Valores padrão caso o Firebase não tenha dados (o que seu frontend espera)
    const defaultData = { "Fralda RN": 10, "Fralda P": 20, "Fralda M": 30, "Fralda G": 30 };
    
    // Retorna os dados do Firebase ou os valores padrão
    const data = snapshot.exists() ? snapshot.val() : defaultData;
    res.json(data);
  } catch (error) {
    console.error('Erro Firebase na rota estoque:', error);
    res.status(500).json({ error: 'Falha no servidor ao buscar estoque' });
  }
});

// ==========================================================
// ROTA 2: RESERVA (POST) - (Rota que seu frontend chama para confirmar)
// IMPORTANTE: Se o seu backend não tem essa rota, o frontend receberá 404.
// ==========================================================
app.post('/api/reservar', async (req, res) => {
  const { gifts, convidado } = req.body;

  if (!gifts || !convidado) {
    return res.status(400).json({ error: 'Faltando dados de presentes ou nome do convidado.' });
  }

  try {
    const updates = {};
    const timestamp = new Date().toISOString();

    // Itera sobre os presentes escolhidos
    for (const [tamanho, selecionado] of Object.entries(gifts)) {
      if (selecionado) {
        // Registra a reserva no Firebase sob um nó de 'reservas'
        // Isso é mais seguro do que tentar decrementar estoque aqui.
        updates[`reservas/${convidado}/${tamanho}`] = {
            reservado: true,
            data: timestamp
        };
      }
    }

    // Aplica as reservas no Firebase
    if (Object.keys(updates).length > 0) {
        await update(ref(database), updates);
    }
    
    res.status(200).json({ message: 'Reservas registradas com sucesso.' });
  } catch (error) {
    console.error('Erro Firebase na rota reservar:', error);
    res.status(500).json({ error: 'Falha ao registrar a reserva.' });
  }
});


// ==========================================================
// EXPORTAÇÃO (Vercel Serverless Function)
// ==========================================================
module.exports = app;

// Bloco para execução local (não é usado no Vercel)
if (process.env.NODE_ENV !== 'production' && process.env.VERCEL_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Servidor de API rodando em http://localhost:${PORT}`));
}