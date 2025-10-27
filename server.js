const express = require('express');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, onValue, update } = require('firebase/database');

// Configuração do Firebase (substitua a URL abaixo)
const firebaseConfig = {
  databaseURL: "https://convite-catarine-default-rtdb.firebaseio.com", // Substitua pela URL do seu Firebase
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);
const appExpress = express();

appExpress.use(express.json());

// Constantes globais
const MAX_GIFTS = { "Fralda RN": 10, "Fralda P": 20, "Fralda M": 30, "Fralda G": 30 };
const TOTAL_GIFTS = Object.values(MAX_GIFTS).reduce((a, b) => a + b, 0); // 90

// Inicializar totais no Firebase
const totalsRef = ref(database, 'totals');
onValue(totalsRef, (snapshot) => {
  const data = snapshot.val() || {};
  if (Object.keys(data).length === 0) {
    set(totalsRef, MAX_GIFTS);
  }
});

// API para adicionar/atualizar convidados
appExpress.post('/api/guests', (req, res) => {
  const { name, age, gifts, mimo } = req.body;
  const guestRef = ref(database, `guests/${Date.now()}`); // ID único com timestamp
  const updates = {};
  updates[`guests/${Date.now()}`] = { name, age, gifts, mimo };

  // Atualizar totais
  if (gifts) {
    const newTotals = { ...MAX_GIFTS };
    Object.keys(gifts).forEach(type => {
      if (gifts[type]) newTotals[type] -= 1;
    });
    update(totalsRef, newTotals);
  }

  set(guestRef, { name, age, gifts, mimo })
    .then(() => res.status(200).send("Convidado adicionado"))
    .catch(error => res.status(500).send(error.message));
});

// API para pegar todos os convidados e totais
appExpress.get('/api/data', (req, res) => {
  const guestsRef = ref(database, 'guests');
  const totalsRef = ref(database, 'totals');
  const data = {};

  onValue(guestsRef, (snapshot) => {
    data.guests = snapshot.val() || {};
  });
  onValue(totalsRef, (snapshot) => {
    data.totals = snapshot.val() || MAX_GIFTS;
    res.json(data);
  });
});

// Iniciar servidor
const PORT = process.env.PORT || 3000;
appExpress.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});