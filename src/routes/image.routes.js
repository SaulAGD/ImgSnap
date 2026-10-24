const express = require('express');
const multer = require('multer');
const { UPLOADS_DIR } = require('../config/paths');
const imageController = require('../controllers/image.controller');

const router = express.Router();

// Máximo de imágenes por petición
const MAX_FILES = 20;

// Configuración de Multer con filtro de tipo y límite generoso (50 MB)
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, UPLOADS_DIR),
    filename: (req, file, cb) => cb(null, `${Date.now()}-${file.originalname}`)
});

const fileFilter = (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/png', 'image/webp'];
    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`Formato no soportado (${file.originalname}). Solo se aceptan JPG, PNG y WebP.`));
    }
};

const upload = multer({
    storage,
    fileFilter,
    limits: { fileSize: 50 * 1024 * 1024 } // Límite de 50 MB por archivo
});

// Ruta para recibir, comprimir y empaquetar en ZIP
router.post('/upload', upload.array('images', MAX_FILES), imageController.compressImages);

module.exports = router;
