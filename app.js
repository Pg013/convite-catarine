const express = require('express');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, set, onValue, update } = require('firebase/database');

const app = express();
app.use(express.json());

// Configuração do Firebase
const firebaseConfig = {
    databaseURL: "https://convite-catarine-default-rtdb.firebaseio.com"
};
const firebaseApp = initializeApp(firebaseConfig);
const database = getDatabase(firebaseApp);

// Totais de presentes
const MAX_GIFTS = { "Fralda RN": 10, "Fralda P": 20, "Fralda M": 30, "Fralda G": 30 };
const totalsRef = ref(database, 'totals');

// Inicializa totais se não existirem
onValue(totalsRef, snapshot => {
    if (!snapshot.exists()) {
        set(totalsRef, MAX_GIFTS);
    }
}, { onlyOnce: true });

// Rota de teste da raiz (essencial para o deploy na Vercel)
app.get('/', (req, res) => {
    res.status(200).send('Servidor do convite funcionando! 🎉');
});

// Rota GET /api/data - Retorna convidados e totais
app.get('/api/data', (req, res) => {
    const guestsRef = ref(database, 'guests');
    const data = {};

    onValue(guestsRef, snapshot => {
        data.guests = snapshot.val() || {};
        onValue(totalsRef, snapTotals => {
            data.totals = snapTotals.val() || MAX_GIFTS;
            res.json(data);
        }, { onlyOnce: true });
    }, { onlyOnce: true });
});

// Rota POST /api/guests - Adiciona convidado e atualiza presentes
app.post('/api/guests', (req, res) => {
    const { name, age, gifts, mimo } = req.body;
    const id = Date.now();
    const guestRef = ref(database, `guests/${id}`);

    set(guestRef, { name, age, gifts, mimo })
        .then(() => {
            if (gifts && Object.keys(gifts).length > 0) {
                // Lógica de atualização simplificada (melhor usar Transactions em produção real)
                const updates = {};
                
                // Lendo os totais atuais para subtrair
                onValue(totalsRef, snapTotals => {
                    const currentTotals = snapTotals.val() || MAX_GIFTS;
                    
                    let hasUpdate = false;
                    Object.keys(gifts).forEach(type => {
                        if (gifts[type] && currentTotals[type] > 0) {
                            updates[type] = currentTotals[type] - 1;
                            hasUpdate = true;
                        }
                    });
                    
                    if (hasUpdate) {
                        update(totalsRef, updates)
                            .then(() => res.status(200).send("Convidado e presente registrados"))
                            .catch(err => res.status(500).send("Erro ao atualizar presentes: " + err.message));
                    } else {
                        res.status(200).send("Convidado adicionado (sem presentes para atualizar ou sem estoque)");
                    }
                    
                }, { onlyOnce: true });
                
            } else {
                res.status(200).send("Convidado adicionado");
            }
        })
        .catch(err => res.status(500).send("Erro ao adicionar convidado: " + err.message));
});

module.exports = app;
