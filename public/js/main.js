const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');
const uploadBtn = document.getElementById('upload-btn');

let selectedFiles = [];

// Abrir selector al hacer clic en la caja
dropZone.addEventListener('click', () => fileInput.click());


// Efectos visuales al arrastrar archivos encima
dropZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropZone.classList.add('border-indigo-500', 'bg-indigo-50');
});

dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('border-indigo-500', 'bg-indigo-50');
});

dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('border-indigo-500', 'bg-indigo-50');
    if (e.dataTransfer.files.length > 0) {
        handleFiles(e.dataTransfer.files);
    }
});


// Detectar archivos seleccionados por el explorador
fileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFiles(e.target.files);
    }
});

function handleFiles(files) {
    selectedFiles = Array.from(files);
    renderFileList();
}


function renderFileList() {
    fileList.innerHTML = '';
    if (selectedFiles.length > 0) {
        uploadBtn.classList.remove('hidden');
        selectedFiles.forEach((file) => {
            const div = document.createElement('div');
            div.className = 'flex justify-between items-center text-sm bg-gray-50 border border-gray-200 p-2 rounded';
            div.innerHTML = `
                <span class="truncate max-w-xs text-gray-700">${file.name}</span> 
                <span class="text-gray-400">${(file.size / 1024).toFixed(1)} KB</span>
            `;
            fileList.appendChild(div);
        });
    } else {
        uploadBtn.classList.add('hidden');
    }
}


uploadBtn.addEventListener('click', async () => {
    if (selectedFiles.length === 0) return;

    const formData = new FormData();
    selectedFiles.forEach(file => {
        formData.append('images', file);
    });

    uploadBtn.textContent = 'Procesando imágenes... ⏳';
    uploadBtn.disabled = true;

    try {
        const response = await fetch('/upload', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Error en el servidor');

        // Convertir la respuesta del servidor en un archivo Blob descargable
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'imgsnap-optimized.zip';
        document.body.appendChild(a);
        a.click();
        a.remove();

        uploadBtn.textContent = '¡Listo! Descargado con éxito';
        setTimeout(() => {
            uploadBtn.textContent = 'Comprimir y Descargar ZIP';
            uploadBtn.disabled = false;
        }, 3000);

    } catch (error) {
        console.error(error);
        alert('Hubo un error al comprimir las imágenes.');
        uploadBtn.textContent = 'Comprimir y Descargar ZIP';
        uploadBtn.disabled = false;
    }
});