const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(cors());
app.use(express.json());

// Rutas
const authRoutes = require('./routes/auth');
const lavadorasRoutes = require('./routes/lavadoras');
const alquileresRoutes = require('./routes/alquileres');
const pagosRoutes = require('./routes/pagos');

app.use('/api/auth', authRoutes);
app.use('/api/lavadoras', lavadorasRoutes);
app.use('/api/alquileres', alquileresRoutes);
app.use('/api/pendientes', alquileresRoutes);
app.use('/api/pagos', pagosRoutes);

// Ruta de prueba
app.get('/', (req, res) => {
  res.json({ mensaje: '¡API de Limpio funcionando! 🚀' });
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en puerto ${PORT}`);
});