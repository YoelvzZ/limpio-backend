const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

const db = admin.firestore();

// OBTENER TODOS LOS ALQUILERES DE UN USUARIO
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { estado } = req.query;
    
    let query = db.collection('alquileres').where('userId', '==', userId);
    
    if (estado) {
      query = query.where('estado', '==', estado);
    }
    
    const alquileresSnapshot = await query.orderBy('fechaInicio', 'desc').get();
    
    const alquileres = [];
    alquileresSnapshot.forEach(doc => {
      alquileres.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    res.json(alquileres);

  } catch (error) {
    console.error('Error al obtener alquileres:', error);
    res.status(500).json({ 
      error: 'Error al obtener alquileres',
      detalle: error.message 
    });
  }
});

// CREAR ALQUILER
router.post('/', async (req, res) => {
  try {
    const { 
      userId, 
      lavadoraId, 
      socioId,
      tipoVia, 
      direccion, 
      fechaInicio, 
      fechaFin, 
      precio 
    } = req.body;
    
    if (!userId || !lavadoraId || !direccion || !fechaInicio || !fechaFin || !precio) {
      return res.status(400).json({ 
        error: 'Faltan datos requeridos' 
      });
    }
    
    const nuevoAlquiler = {
      userId: userId,
      lavadoraId: lavadoraId,
      socioId: socioId || null,
      tipoVia: tipoVia || 'calle',
      direccion: direccion,
      fechaInicio: new Date(fechaInicio),
      fechaFin: new Date(fechaFin),
      precio: parseFloat(precio),
      pagado: false,
      estado: 'activo',
      fechaCreacion: admin.firestore.FieldValue.serverTimestamp()
    };
    
    const docRef = await db.collection('alquileres').add(nuevoAlquiler);
    
    await db.collection('lavadoras').doc(lavadoraId).update({
      estado: 'alquilada'
    });
    
    res.status(201).json({
      mensaje: 'Alquiler creado exitosamente',
      alquilerId: docRef.id,
      ...nuevoAlquiler
    });

  } catch (error) {
    console.error('Error al crear alquiler:', error);
    res.status(500).json({ 
      error: 'Error al crear alquiler',
      detalle: error.message 
    });
  }
});

// FINALIZAR ALQUILER
router.put('/:alquilerId/finalizar', async (req, res) => {
  try {
    const { alquilerId } = req.params;
    const { pagado } = req.body;
    
    const alquilerDoc = await db.collection('alquileres').doc(alquilerId).get();
    
    if (!alquilerDoc.exists) {
      return res.status(404).json({ error: 'Alquiler no encontrado' });
    }
    
    const alquilerData = alquilerDoc.data();
    
    await db.collection('alquileres').doc(alquilerId).update({
      estado: 'finalizado',
      pagado: pagado || false,
      fechaFinalizacion: admin.firestore.FieldValue.serverTimestamp()
    });
    
    await db.collection('lavadoras').doc(alquilerData.lavadoraId).update({
      estado: 'disponible'
    });
    
    if (!pagado) {
      await db.collection('pendientesCobro').add({
        userId: alquilerData.userId,
        alquilerId: alquilerId,
        ...alquilerData,
        fechaRetiro: admin.firestore.FieldValue.serverTimestamp()
      });
    } else {
      await db.collection('historial').add({
        userId: alquilerData.userId,
        alquilerId: alquilerId,
        ...alquilerData,
        fechaFinalizacion: admin.firestore.FieldValue.serverTimestamp()
      });
    }
    
    res.json({
      mensaje: 'Alquiler finalizado exitosamente'
    });

  } catch (error) {
    console.error('Error al finalizar alquiler:', error);
    res.status(500).json({ 
      error: 'Error al finalizar alquiler',
      detalle: error.message 
    });
  }
});

// ELIMINAR ALQUILER
router.delete('/:alquilerId', async (req, res) => {
  try {
    const { alquilerId } = req.params;
    
    const alquilerDoc = await db.collection('alquileres').doc(alquilerId).get();
    
    if (alquilerDoc.exists) {
      const alquilerData = alquilerDoc.data();
      
      await db.collection('lavadoras').doc(alquilerData.lavadoraId).update({
        estado: 'disponible'
      });
    }
    
    await db.collection('alquileres').doc(alquilerId).delete();
    
    res.json({
      mensaje: 'Alquiler eliminado exitosamente'
    });

  } catch (error) {
    console.error('Error al eliminar alquiler:', error);
    res.status(500).json({ 
      error: 'Error al eliminar alquiler',
      detalle: error.message 
    });
  }
});

module.exports = router;