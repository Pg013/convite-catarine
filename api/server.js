const app = require('../app');

// Função serverless compatível com Vercel
module.exports = (req, res) => app(req, res);
