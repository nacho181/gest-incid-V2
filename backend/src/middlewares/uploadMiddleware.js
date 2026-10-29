const multer = require('multer');
const path = require('path');

// Configurar dónde y con qué nombre se guardan los archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // La ruta relativa apunta a la carpeta que creaste en el paso 1
    cb(null, path.join(__dirname, '../../public/uploads/avatars'));
  },
  filename: function (req, file, cb) {
    // Generar un nombre único: avatar-163456789.jpg
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, 'avatar-' + uniqueSuffix + ext);
  }
});

// Filtro de seguridad: aceptar únicamente imágenes
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Formato no válido. Solo se permiten imágenes.'), false);
  }
};

// Límite de 2MB por archivo
const uploadAvatar = multer({ 
  storage: storage, 
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } 
});

module.exports = { uploadAvatar };