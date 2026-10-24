require('dotenv').config();
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { ZipArchive } = require('archiver');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Directorios de trabajo
const UPLOADS_DIR = path.join(__dirname, 'uploads');
const OUTPUTS_DIR = path.join(__dirname, 'outputs');

// 1. Limpieza de arranque: asegura que las carpetas existan y borra residuos anteriores
function initDirectories() {
    [UPLOADS_DIR, OUTPUTS_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        } else {
            // Vaciar archivos residuales si el servidor se apagó de golpe
            const files = fs.readdirSync(dir);
            for (const file of files) {
                try {
                    fs.unlinkSync(path.join(dir, file));
                } catch (e) {
                    console.error(`No se pudo eliminar ${file}:`, e.message);
                }
            }
        }
    });
}
initDirectories();

// 2. Configuración de Multer con filtro de tipo y límite generoso (50 MB)
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

app.use(express.static('public'));
app.use(express.json());

// 3. Ruta para recibir, comprimir y empaquetar en ZIP
app.post('/upload', upload.array('images'), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No se subió ninguna imagen válida.' });
        }

        // Parámetros dinámicos enviados desde el frontend
        const quality = Math.min(Math.max(parseInt(req.body.quality) || 80, 10), 100);
        const targetFormat = req.body.format || 'original'; // 'original' o 'webp'

        const zipName = `compressed-${Date.now()}.zip`;
        const zipPath = path.join(OUTPUTS_DIR, zipName);

        const output = fs.createWriteStream(zipPath);
        const archive = new ZipArchive({ zlib: { level: 9 } });
        const createdFiles = [];

        output.on('close', () => {
            res.download(zipPath, 'imgsnap-optimized.zip', (err) => {
                if (err && !res.headersSent) {
                    console.error("Error al descargar:", err);
                }
                // Limpieza de archivos temporales
                try {
                    req.files.forEach(file => fs.existsSync(file.path) && fs.unlinkSync(file.path));
                    createdFiles.forEach(file => fs.existsSync(file) && fs.unlinkSync(file));
                    if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
                } catch (e) {
                    console.error("Error limpiando temporales:", e.message);
                }
            });
        });

        archive.on('error', (err) => {
            throw err;
        });

        archive.pipe(output);

        // Procesar cada imagen con Sharp según las opciones elegidas
        for (const file of req.files) {
            const parsedName = path.parse(file.originalname);
            let finalName = file.originalname;
            let pipeline = sharp(file.path).resize({ width: 1920, withoutEnlargement: true });

            if (targetFormat === 'webp') {
                // Convertir todo a WebP
                finalName = `${parsedName.name}.webp`;
                pipeline = pipeline.webp({ quality });
            } else {
                // Mantener formato original con compresión
                if (file.mimetype === 'image/png') {
                    pipeline = pipeline.png({ quality });
                } else if (file.mimetype === 'image/webp') {
                    pipeline = pipeline.webp({ quality });
                } else {
                    pipeline = pipeline.jpeg({ quality });
                }
            }

            const compressedFilePath = path.join(UPLOADS_DIR, `optimized-${finalName}`);
            createdFiles.push(compressedFilePath);

            await pipeline.toFile(compressedFilePath);
            archive.file(compressedFilePath, { name: finalName });
        }

        await archive.finalize();

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Hubo un error al procesar las imágenes.' });
    }
});

// Middleware para capturar errores de Multer (archivos inválidos o muy pesados)
app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'Una de las imágenes supera el límite de 50 MB.' });
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