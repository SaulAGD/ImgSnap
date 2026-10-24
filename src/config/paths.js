const path = require('path');

// Directorios de trabajo (raíz del proyecto)
const ROOT_DIR = path.join(__dirname, '..', '..');

module.exports = {
    UPLOADS_DIR: path.join(ROOT_DIR, 'uploads'),
    OUTPUTS_DIR: path.join(ROOT_DIR, 'outputs')
};
