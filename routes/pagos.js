const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

const db = admin.firestore();

// NOTA: Esto lo completamos cuando tengas tu cuenta de Mercado Pago
// Por ahora dejo la estructura básica

router.post('/crear-preferencia', async (req, res) => {
  try {
    // Aquí irá la integración con Mercado Pago
    res.json({
      mensaje: 'Integración de Mercado Pago pendiente'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

router.post('/webhook', async (req, res) => {
  try {
    // Aquí recibiremos las notificaciones de Mercado Pago
    res.sendStatus(200);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;