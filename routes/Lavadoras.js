const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

const db = admin.firestore();

// OBTENER TODAS LAS LAVADORAS DE UN USUARIO
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const lavadorasSnapshot = await db.collection('lavadoras')
      .where('userId', '==', userId)
      .orderBy('numero', 'asc')
      .get();
    
    const lavadoras = [];
    lavadorasSnapshot.forEach(doc => {
      lavadoras.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json(lavadoras);

  } catch (error) {
    console.error('Error al obtener lavadoras:', error);
    res.status(500).json({ 
      error: 'Error al obtener lavadoras',
      detalle: error.message 
    });
  }
});

// CREAR LAVADORA
router.post('/', async (req, res) => {
  try {
    const { userId, numero, modelo, capacidad, estado } = req.body;
    
    if (!userId || !modelo || !capacidad) {
      return res.status(400).json({ 
        error: 'Faltan datos requeridos' 
      });
    }
    
    const nuevaLavadora = {
      userId: userId,
      numero: numero || 1,
      modelo: modelo,
      capacidad: capacidad,
      estado: estado || 'disponible',
      fechaCreacion: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('lavadoras').add(nuevaLavadora);
    
    res.status(201).json({
      mensaje: 'Lavadora creada exitosamente',
      lavadoraId: docRef.id,
      ...nuevaLavadora
    });

  } catch (error) {
    console.error('Error al crear lavadora:', error);
    res.status(500).json({ 
      error: 'Error al crear lavadora',
      detalle: error.message 
    });
  }
});

// ACTUALIZAR LAVADORA
router.put('/:lavadoraId', async (req, res) => {
  try {
    const { lavadoraId } = req.params;
    const { modelo, capacidad, estado } = req.body;
    
    const updateData = {};
    if (modelo) updateData.modelo = modelo;
    if (capacidad) updateData.capacidad = capacidad;
    if (estado) updateData.estado = estado;
    
    await db.collection('lavadoras').doc(lavadoraId).update(updateData);
    
    res.json({
      mensaje: 'Lavadora actualizada exitosamente'
    });

  } catch (error) {
    console.error('Error al actualizar lavadora:', error);
    res.status(500).json({ 
      error: 'Error al actualizar lavadora',
      detalle: error.message 
    });
  }
});

// ELIMINAR LAVADORA
router.delete('/:lavadoraId', async (req, res) => {
  try {
    const { lavadoraId } = req.params;
    
    await db.collection('lavadoras').doc(lavadoraId).delete();
    
    res.json({
      mensaje: 'Lavadora eliminada exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar lavadora:', error);
    res.status(500).json({ 
      error: 'Error al eliminar lavadora',
      detalle: error.message 
    });
  }
});

module.exports = router;