# ImgSnap

> Herramienta web local, rápida y moderna para comprimir, redimensionar y optimizar imágenes por lotes sin perder calidad visual.

![Node.js](https://img.shields.io/badge/Node.js-20+-68A063?style=for-the-badge&logo=node.js&logoColor=white)
![Express](https://img.shields.io/badge/Express.js-5.x-000000?style=for-the-badge&logo=express&logoColor=white)
![Sharp](https://img.shields.io/badge/Sharp-High--Speed_Image_Processing-99CC00?style=for-the-badge)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![License](https://img.shields.io/badge/License-MIT-blue?style=for-the-badge)

---

## Características

- **Drag & Drop interactivo:** Arrastra archivos directamente o elígelos mediante el explorador de archivos.
- **Miniaturas en tiempo real:** Visualiza las imágenes seleccionadas, su peso en MB y su formato antes de procesar.
- **Compresión personalizable:**
  - **Alta (90%):** Ideal para fotografía y detalles finos.
  - **Equilibrada (80% - Recomendada):** Óptima para desarrollo web y redes sociales.
  - **Máxima compresión (50%):** Mayor ahorro de espacio posible.
- **Conversión a WebP:** Convierte cualquier imagen (JPG, PNG) al formato moderno WebP de Google con un solo clic.
- **Empaquetado en ZIP automático:** Descarga todas tus imágenes procesadas juntas en un archivo `.zip`.
- **Gestión limpia de almacenamiento:** Limpieza automática de archivos temporales tanto al finalizar la descarga como al arrancar el servidor.
- **Validación y seguridad:** Filtro estricto que solo admite formatos válidos (JPG, PNG, WebP) con soporte de hasta 50 MB por archivo.

---

## Stack Tecnológico

- **Entorno:** Node.js
- **Servidor:** Express 5
- **Procesamiento de imágenes:** [Sharp](https://sharp.pixelplumbing.com/) (motor libvips ultrarrápido en C)
- **Carga de archivos:** Multer
- **Empaquetado ZIP:** Archiver 8
- **Frontend:** Vanilla JavaScript + HTML5 Drag & Drop API + Tailwind CSS

---

## Instalación y Uso Rápido

Sigue estos pasos para correr el proyecto en tu máquina local:

### 1. Clonar el repositorio

```bash
git clone https://github.com/SaulAGD/imgSnap.git
cd imgSnap
```

### 2. Instalar dependencias y ejecutar

```bash
npm install
npm start
```

Abre http://localhost:3000 (el puerto se puede cambiar con la variable `PORT` en `.env`).

> Límites: hasta 20 imágenes por vez y 50 MB por archivo.

---

## Licencia

MIT. Ver [LICENSE](LICENSE).
