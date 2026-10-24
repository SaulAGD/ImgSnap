require('dotenv').config();
const express = require('express');
const multer = require('multer');
const sharp = require('sharp');
const { ZipArchive } = require('archiver');
const path = require('path');
const fs = require('fs');

const app = express();
const port = process.env.PORT || 3000;

// Asegurar que existan las carpetas temporales
if (!fs.existsSync('./uploads')) fs.mkdirSync('./uploads');
if (!fs.existsSync('./outputs')) fs.mkdirSync('./outputs');


// Configuración de Multer para guardar temporalmente las imágenes
const upload = multer({ dest: 'uploads/' });


app.use(express.static('public'));
app.use(express.json());


// Ruta para recibir, comprimir y empaquetar en ZIP
app.post('/upload', upload.array('images'), async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No se subió ninguna imagen.' });
        }

        const outputDir = path.join(__dirname, 'outputs');
        const zipName = `compressed-${Date.now()}.zip`;
        const zipPath = path.join(outputDir, zipName);

        // Crear flujo para escribir el archivo ZIP
        const output = fs.createWriteStream(zipPath);
        const archive = new ZipArchive({ zlib: { level: 9 } });
        const createdFiles = [];
        
        output.on('close', () => {
            // Enviar el ZIP al cliente para su descarga y luego limpiar archivos
            res.download(zipPath, 'imgsnap-optimized.zip', (err) => {
                if (err) console.error("Error al descargar:", err);
                
                // Limpieza de archivos temporales (opcional pero recomendado)
                try {
                    req.files.forEach(file => fs.unlinkSync(file.path));
                    createdFiles.forEach(filePath => fs.unlinkSync(filePath));
                    fs.unlinkSync(zipPath);
                } catch (e) {
                    console.error("Error limpiando temporales:", e);
                }
            });
        });

        archive.on('error', (err) => {
            throw err;
        });

        archive.pipe(output);

        // Procesar cada imagen con Sharp
        for (const file of req.files) {
            const compressedFileName = `optimized-${file.originalname}`;
            const compressedFilePath = path.join('./uploads', compressedFileName);
            createdFiles.push(compressedFilePath);

            // Redimensionar (máx 1200px de ancho) y bajar calidad a 80% con Sharp
            let pipeline = sharp(file.path).resize({ width: 1200, withoutEnlargement: true });
            
            if (file.mimetype === 'image/png') {
                pipeline = pipeline.png({ quality: 80 });
            } else if (file.mimetype === 'image/webp') {
                pipeline = pipeline.webp({ quality: 80 });
            } else {
                pipeline = pipeline.jpeg({ quality: 80 });
            }

            await pipeline.toFile(compressedFilePath);

            // Añadir la imagen procesada al archivo ZIP
            archive.file(compressedFilePath, { name: file.originalname });
        }

        await archive.finalize();

    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Hubo un error al procesar las imágenes.' });
    }
});


app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
});