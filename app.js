require('dotenv').config();
const express = require('express');
const multer = require('multer');
const imageRoutes = require('./src/routes/image.routes');
const { initDirectories } = require('./src/controllers/image.controller');

const app = express();
const port = process.env.PORT || 3000;

initDirectories();

app.use(express.static('public'));
app.use(express.json());

// Rutas principales
app.use('/', imageRoutes);

// Middleware para capturar errores de Multer (archivos inválidos o muy pesados)
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Una de las imágenes supera el límite de 50 MB.' });
        }
        if (err.code === 'LIMIT_UNEXPECTED_FILE') {
            return res.status(400).json({ error: 'Máximo 20 imágenes por vez.' });
        }
        return res.status(400).json({ error: err.message });
    } else if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
});

app.listen(port, () => {
    console.log(`Servidor ImgSnap listo en http://localhost:${port}`);
});
