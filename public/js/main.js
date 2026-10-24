const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const optionsPanel = document.getElementById('options-panel');
const qualitySelect = document.getElementById('quality-select');
const formatSelect = document.getElementById('format-select');
const uploadBtn = document.getElementById('upload-btn');
const alertBox = document.getElementById('alert-box');

let selectedFiles = [];
const MAX_FILES = 20; // Debe coincidir con el límite del servidor

// Funciones para mostrar u ocultar alertas
function showAlert(message) {
    alertBox.textContent = message;
    alertBox.classList.remove('hidden');
}

function hideAlert() {
    alertBox.textContent = '';
    alertBox.classList.add('hidden');
}

// Abrir explorador de archivos al hacer clic en la zona
dropZone.addEventListener('click', () => fileInput.click());

// Efectos visuales de Drag & Drop
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-indigo-500', 'bg-indigo-50/50');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-indigo-500', 'bg-indigo-50/50');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-indigo-500', 'bg-indigo-50/50');
    if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
    }
});

// Selección por clic tradicional
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFiles(e.target.files);
        fileInput.value = '';
    }
});

// Filtrar y procesar archivos seleccionados
function handleFiles(files) {
    hideAlert();
    const validMimes = ['image/jpeg', 'image/png', 'image/webp'];
    const newFiles = Array.from(files);

    // Validar en el cliente que sean imágenes válidas
    const invalidFiles = newFiles.filter(file => !validMimes.includes(file.type));
    if (invalidFiles.length > 0) {
        showAlert(`Se ignoraron ${invalidFiles.length} archivo(s) no soportados. Solo se admiten JPG, PNG y WebP.`);
    }

    const validIncoming = newFiles.filter(file => validMimes.includes(file.type));
    let limitExceeded = false;
    validIncoming.forEach(newFile => {
        const alreadyExists = selectedFiles.some(f => f.name === newFile.name && f.size === newFile.size);
        if (alreadyExists) return;
        if (selectedFiles.length >= MAX_FILES) {
            limitExceeded = true;
            return;
        }
        selectedFiles.push(newFile);
    });
    if (limitExceeded) {
        showAlert(`Máximo ${MAX_FILES} imágenes por vez. Se ignoraron las que sobraban.`);
    }
    renderFileList();
}

// Renderizar la lista de imágenes con previsualización (miniatura)
function renderFileList() {
    fileList.innerHTML = '';

    if (selectedFiles.length > 0) {
        optionsPanel.classList.remove('hidden');
        uploadBtn.classList.remove('hidden');

        selectedFiles.forEach((file, index) => {
            // Creamos una URL temporal para la miniatura
            const previewUrl = URL.createObjectURL(file);

            const div = document.createElement('div');
            div.className = 'flex justify-between items-center text-sm bg-gray-50 border border-gray-200 p-2.5 rounded-xl hover:bg-gray-100/70 transition-colors';
            div.innerHTML = `
                <div class="flex items-center space-x-3 truncate">
                    <!-- Miniatura de la imagen -->
                    <img src="${previewUrl}" alt="" class="thumb w-11 h-11 object-cover rounded-lg border border-gray-200 flex-shrink-0 shadow-sm" />
                    
                    <div class="truncate">
                        <p class="file-name truncate max-w-xs text-gray-800 font-medium text-xs sm:text-sm"></p>
                        <div class="flex items-center space-x-2 mt-0.5">
                            <span class="file-ext text-[10px] bg-indigo-100 text-indigo-700 font-semibold px-1.5 py-0.5 rounded">
                            </span>
                            <span class="text-xs text-gray-400">
                                ${(file.size / (1024 * 1024)).toFixed(2)} MB
                            </span>
                        </div>
                    </div>
                </div>

                <!-- Botón eliminar -->
                <button type="button" 
                        class="text-gray-400 hover:text-red-500 hover:bg-red-50 p-1.5 rounded-lg text-sm font-bold transition-colors ml-2" 
                        title="Quitar imagen">
                    ✕
                </button>
            `;
            // Liberar la URL temporal de la miniatura cuando ya cargó (evita fuga de memoria)
            const thumb = div.querySelector('.thumb');
            thumb.addEventListener('load', () => URL.revokeObjectURL(previewUrl));
            // textContent evita XSS con nombres de archivo maliciosos
            div.querySelector('.file-name').textContent = file.name;
            div.querySelector('.file-ext').textContent = file.name.split('.').pop().toUpperCase();
            div.querySelector('button').addEventListener('click', () => removeFile(index));
            fileList.appendChild(div);
        });
    } else {
        optionsPanel.classList.add('hidden');
        uploadBtn.classList.add('hidden');
    }
}

// Función global para quitar una imagen individual de la lista
window.removeFile = function (index) {
    selectedFiles.splice(index, 1);
    renderFileList();
};

// Enviar imágenes al servidor junto con las opciones elegidas
uploadBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    hideAlert();
    const formData = new FormData();

    // 1. Adjuntar imágenes
    selectedFiles.forEach(file => {
        formData.append('images', file);
    });

    // 2. Adjuntar configuración de calidad y formato
    formData.append('quality', qualitySelect.value);
    formData.append('format', formatSelect.value);

    // Estado visual de carga
    uploadBtn.textContent = 'Optimizando imágenes... ';
    uploadBtn.disabled = true;

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Error al procesar las imágenes.');
        }

        // Descargar el ZIP resultante
        const blob = await response.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `imgsnap-optimized-${formatSelect.value === 'webp' ? 'webp' : 'compressed'}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        window.URL.revokeObjectURL(downloadUrl);

        uploadBtn.textContent = '¡Listo! Descargado con éxito.';
        setTimeout(() => {
            uploadBtn.textContent = 'Comprimir y Descargar ZIP';
            uploadBtn.disabled = false;
        }, 3000);

    } catch (error) {
        console.error(error);
        showAlert(error.message || 'Ocurrió un error al procesar las imágenes.');
        uploadBtn.textContent = 'Comprimir y Descargar ZIP';
        uploadBtn.disabled = false;
    }
});