const express = require('express');
const router = express.Router();
const admin = require('firebase-admin');

// Inicializar Firebase Admin (solo una vez)
if (!admin.apps.length) {
  if (process.env.FIREBASE_PRIVATE_KEY) {
    // En producción (Render)
    admin.initializeApp({
      credential: admin.credential.cert({
        type: process.env.FIREBASE_TYPE,
        project_id: process.env.FIREBASE_PROJECT_ID,
        private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
        private_key: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        client_email: process.env.FIREBASE_CLIENT_EMAIL,
        client_id: process.env.FIREBASE_CLIENT_ID,
        auth_uri: process.env.FIREBASE_AUTH_URI,
        token_uri: process.env.FIREBASE_TOKEN_URI,
        auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER,
        client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT_URL
      })
    });
  } else {
    // En desarrollo (local)
    const serviceAccount = require('../serviceAccountKey.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
  }
}

const db = admin.firestore();

// REGISTRO DE USUARIO
router.post('/register', async (req, res) => {
  try {
    const { email, password, nombre, telefono } = req.body;

    // Validar datos
    if (!email || !password || !nombre) {
      return res.status(400).json({ 
        error: 'Faltan datos requeridos' 
      });
    }

    // Crear usuario en Firebase Auth
    const userRecord = await admin.auth().createUser({
      email: email,
      password: password,
      displayName: nombre
    });

    // Calcular fecha de vencimiento (7 días gratis)
    const fechaRegistro = new Date();
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 7);

    // Guardar datos adicionales en Firestore
    await db.collection('users').doc(userRecord.uid).set({
      nombre: nombre,
      email: email,
      telefono: telefono || '',
      fechaRegistro: admin.firestore.FieldValue.serverTimestamp(),
      membresia: {
        tipo: 'gratis',
        fechaInicio: fechaRegistro,
        fechaVencimiento: fechaVencimiento,
        estado: 'activa'
      }
    });

    res.status(201).json({
      mensaje: '¡Cuenta creada exitosamente! Tienes 7 días gratis.',
      userId: userRecord.uid,
      email: userRecord.email,
      diasGratis: 7
    });

  } catch (error) {
    console.error('Error al registrar usuario:', error);
    
    if (error.code === 'auth/email-already-exists') {
      return res.status(400).json({ 
        error: 'Este correo ya está registrado' 
      });
    }
    
    res.status(500).json({ 
      error: 'Error al crear la cuenta',
      detalle: error.message 
    });
  }
});

// LOGIN DE USUARIO
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ 
        error: 'Email y contraseña son requeridos' 
      });
    }

    // Verificar usuario en Firebase Auth
    const user = await admin.auth().getUserByEmail(email);
    
    // Obtener datos del usuario de Firestore
    const userDoc = await db.collection('users').doc(user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado' 
      });
    }

    const userData = userDoc.data();
    
    // Verificar estado de membresía
    const ahora = new Date();
    const fechaVencimiento = userData.membresia.fechaVencimiento.toDate();
    
    if (ahora > fechaVencimiento) {
      // Membresía vencida
      await db.collection('users').doc(user.uid).update({
        'membresia.estado': 'vencida'
      });
      
      return res.status(403).json({
        error: 'Tu membresía ha vencido',
        mensaje: 'Por favor renueva tu suscripción para continuar',
        userId: user.uid,
        estado: 'vencida'
      });
    }

    // Crear token personalizado
    const customToken = await admin.auth().createCustomToken(user.uid);

    res.json({
      mensaje: 'Login exitoso',
      token: customToken,
      userId: user.uid,
      email: user.email,
      nombre: userData.nombre,
      membresia: {
        tipo: userData.membresia.tipo,
        estado: userData.membresia.estado,
        fechaVencimiento: fechaVencimiento
      }
    });

  } catch (error) {
    console.error('Error en login:', error);
    
    if (error.code === 'auth/user-not-found') {
      return res.status(404).json({ 
        error: 'Usuario no encontrado' 
      });
    }
    
    res.status(500).json({ 
      error: 'Error al iniciar sesión',
      detalle: error.message 
    });
  }
});

// OBTENER PERFIL DE USUARIO
router.get('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const userDoc = await db.collection('users').doc(userId).get();
    
    if (!userDoc.exists) {
      return res.status(404).json({ 
        error: 'Usuario no encontrado' 
      });
    }

    const userData = userDoc.data();
    
    res.json({
      userId: userId,
      nombre: userData.nombre,
      email: userData.email,
      telefono: userData.telefono,
      membresia: userData.membresia
    });

  } catch (error) {
    console.error('Error al obtener perfil:', error);
    res.status(500).json({ 
      error: 'Error al obtener perfil',
      detalle: error.message 
    });
  }
});

// ACTUALIZAR PERFIL
router.put('/profile/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { nombre, telefono } = req.body;
    
    const updateData = {};
    if (nombre) updateData.nombre = nombre;
    if (telefono) updateData.telefono = telefono;
    
    await db.collection('users').doc(userId).update(updateData);
    
    res.json({
      mensaje: 'Perfil actualizado exitosamente'
    });

  } catch (error) {
    console.error('Error al actualizar perfil:', error);
    res.status(500).json({ 
      error: 'Error al actualizar perfil',
      detalle: error.message 
    });
  }
});

module.exports = router;