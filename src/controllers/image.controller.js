const sharp = require('sharp');
const { ZipArchive } = require('archiver');
const path = require('path');
const fs = require('fs');
const { UPLOADS_DIR, OUTPUTS_DIR } = require('../config/paths');

// Limpieza de arranque: asegura que las carpetas existan y borra residuos anteriores
function initDirectories() {
    [UPLOADS_DIR, OUTPUTS_DIR].forEach(dir => {
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        } else {
            // Vaciar archivos residuales si el servidor se apagÃ³ de golpe
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

// Borra de forma segura una lista de archivos temporales
function removeFiles(files) {
    files.forEach(file => {
        try {
            if (file && fs.existsSync(file)) fs.unlinkSync(file);
        } catch (e) {
            console.error("Error limpiando temporales:", e.message);
        }
    });
}

// Evita nombres repetidos dentro del ZIP: foto.jpg, foto (1).jpg, ...
function uniqueName(name, usedNames) {
    const { name: base, ext } = path.parse(name);
    let candidate = name;
    let n = 1;
    while (usedNames.has(candidate.toLowerCase())) {
        candidate = `${base} (${n++})${ext}`;
    }
    usedNames.add(candidate.toLowerCase());
    return candidate;
}

// Recibe, comprime y empaqueta en ZIP
async function compressImages(req, res) {
    const createdFiles = [];
    const uploadedFiles = (req.files || []).map(file => file.path);
    let zipPath = null;

    try {
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ error: 'No se subió ninguna imagen válida.' });
        }

        // Parámetros dinámicos enviados desde el frontend
        const quality = Math.min(Math.max(parseInt(req.body.quality) || 80, 10), 100);
        const targetFormat = req.body.format || 'original'; // 'original' o 'webp'

        zipPath = path.join(OUTPUTS_DIR, `compressed-${Date.now()}.zip`);

        const output = fs.createWriteStream(zipPath);
        const archive = new ZipArchive({ zlib: { level: 9 } });

        // Promesa que se resuelve al cerrar el ZIP o se rechaza ante cualquier error
        const zipFinished = new Promise((resolve, reject) => {
            output.on('close', resolve);
            output.on('error', reject);
            archive.on('error', reject);
        });
        zipFinished.catch(() => { }); // evita "unhandled rejection" si falla antes de esperarla

        archive.pipe(output);

        const usedNames = new Set();

        // Procesar cada imagen con Sharp según las opciones elegidas
        for (const [index, file] of req.files.entries()) {
            // path.basename evita rutas maliciosas tipo ../../x.jpg
            const safeOriginal = path.basename(file.originalname);
            const parsedName = path.parse(safeOriginal);
            let finalName = safeOriginal;
            // Detectar el formato REAL por contenido (no por extensión ni mimetype del cliente)
            let realFormat;
            try {
                realFormat = (await sharp(file.path).metadata()).format; // 'jpeg' | 'png' | 'webp' ...
            } catch (e) {
                realFormat = null;
            }
            if (!['jpeg', 'png', 'webp'].includes(realFormat)) {
                const err = new Error(`El archivo "${safeOriginal}" no es una imagen JPG, PNG o WebP válida.`);
                err.status = 400;
                throw err;
            }

            // rotate() aplica la orientación EXIF (fotos de móvil)
            let pipeline = sharp(file.path).rotate().resize({ width: 1920, withoutEnlargement: true });

            if (targetFormat === 'webp') {
                // Convertir todo a WebP
                finalName = `${parsedName.name}.webp`;
                pipeline = pipeline.webp({ quality });
            } else {
                // Mantener formato original con compresión
                // Si la extensión miente (ej. JPG renombrado a .png), se corrige al formato real
                const realExt = { jpeg: '.jpg', png: '.png', webp: '.webp' }[realFormat];
                const currentExt = parsedName.ext.toLowerCase();
                const extOk = realFormat === 'jpeg' ? ['.jpg', '.jpeg'].includes(currentExt) : currentExt === realExt;
                if (!extOk) finalName = `${parsedName.name}${realExt}`;

                if (realFormat === 'png') {
                    // palette: true es lo que hace que "quality" reduzca el peso en PNG
                    pipeline = pipeline.png({ quality, palette: true });
                } else if (realFormat === 'webp') {
                    pipeline = pipeline.webp({ quality });
                } else {
                    pipeline = pipeline.jpeg({ quality });
                }
            }

            finalName = uniqueName(finalName, usedNames);

            // Nombre temporal propio (índice) para no depender del nombre del usuario
            const compressedFilePath = path.join(UPLOADS_DIR, `optimized-${Date.now()}-${index}${path.extname(finalName)}`);
            createdFiles.push(compressedFilePath);

            await pipeline.toFile(compressedFilePath);
            archive.file(compressedFilePath, { name: finalName });
        }

        await archive.finalize();
        await zipFinished;

        res.download(zipPath, 'imgsnap-optimized.zip', (err) => {
            if (err && !res.headersSent) {
                console.error("Error al descargar:", err);
            }
            // Limpieza de archivos temporales
            removeFiles([...uploadedFiles, ...createdFiles, zipPath]);
        });

    } catch (error) {
        console.error(error);
        // Limpieza también en caso de error
        removeFiles([...uploadedFiles, ...createdFiles, zipPath]);
        if (!res.headersSent) {
            // Errores de validación propios (400) muestran su mensaje; el resto es un 500 genérico
            if (error.status === 400) {
                res.status(400).json({ error: error.message });
            } else {
                res.status(500).json({ error: 'Hubo un error al procesar las imágenes.' });
            }
        }
    }
}

module.exports = { initDirectories, compressImages };
