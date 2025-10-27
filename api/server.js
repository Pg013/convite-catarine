// Usa require() para melhor compatibilidade com Vercel/Node.js padrão
const express = require('express');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, get, update } = require('firebase/database'); // Adicione 'update' se for usar na rota de reserva
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3001; // Mantido apenas para teste local

// Configurações do Firebase
const firebaseConfig = {
  databaseURL: "https://convite-catarine-default-rtdb.firebaseio.com/" // Seu URL confirmado
};
initializeApp(firebaseConfig);
const database = getDatabase();

app.use(express.json());

// ==========================================================
// CONFIGURAÇÃO DE CORS
// Permite requisições do localhost e do domínio de produção
// ==========================================================
app.use(cors({
  origin: [
    'http://localhost:5173', // Ambiente de desenvolvimento (Vite)
    'https://convite-catarine-nm3f45v71-gabriels-projects-fca19e5c.vercel.app', // URL de produção (exemplo)
    // Se seu frontend estiver em um domínio diferente, adicione-o aqui.
  ],
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
    // Fallback se não houver dados no Firebase
    const data = snapshot.exists() ? snapshot.val() : { "Fralda RN": 10, "Fralda P": 20, "Fralda M": 30, "Fralda G": 30 };
    res.json(data);
  } catch (error) {
    console.error('Erro Firebase na rota estoque:', error);
    res.status(500).json({ error: 'Falha no servidor ao buscar estoque' });
  }
});

// ==========================================================
// ROTA 2: RESERVA (POST) - (Você precisará desta rota)
// Esta rota deve atualizar a contagem de estoque no Firebase.
// ==========================================================
app.post('/api/reservar', async (req, res) => {
  const { gifts, convidado } = req.body;

  if (!gifts) {
    return res.status(400).json({ error: 'Faltando dados de presentes.' });
  }

  try {
    const estoqueRef = ref(database, 'estoque');
    const snapshot = await get(estoqueRef);
    const currentEstoque = snapshot.exists() ? snapshot.val() : {};

    const updates = {};
    let isUpdated = false;

    // Itera sobre os presentes que o convidado escolheu (true)
    for (const [tamanho, selecionado] of Object.entries(gifts)) {
      if (selecionado) {
        // Atualiza a contagem no Firebase (por exemplo, reduzindo o valor no nó do Firebase)
        // OBS: O Firebase deve armazenar o total DISPONÍVEL, e não o USADO.
        // Se o Firebase armazena o TOTAL NECESSÁRIO e você só está rastreando os USADOS,
        // a lógica de atualização deve ser diferente (por exemplo, criando um nó para o convidado).

        // ASSUMINDO QUE O SEU FIREBASE ARMAZENA O TOTAL USADO (OU NECESSÁRIO)
        // Para a sua lógica do frontend funcionar, esta rota provavelmente deve apenas
        // registrar o presente e a contagem total deve ser atualizada pelo frontend na próxima busca,
        // ou você deve ter um nó separado para rastrear os presentes.

        // Se você usa o total USADO no frontend:
        // Crie um nó separado para registrar os presentes dados por convidado.
        const presenteKey = tamanho.replace(' ', '_'); // Ex: Fralda_P
        updates[`reservas/${convidado}/${presenteKey}`] = true;
        isUpdated = true;
      }
    }

    // Aplica as reservas no Firebase
    if (isUpdated) {
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
// O Vercel usa este objeto como o manipulador principal da função.
// ==========================================================
module.exports = app;

// Bloco para execução local (não é usado no Vercel)
if (process.env.NODE_ENV !== 'production' && process.env.VERCEL_ENV !== 'production') {
  app.listen(PORT, () => console.log(`Servidor de API rodando em http://localhost:${PORT}`));
}