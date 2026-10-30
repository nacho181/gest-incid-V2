import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurar dónde y con qué nombre se guardan los archivos
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../../public/uploads/avatars'));
  },
  filename: function (req, file, cb) {
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
export const uploadAvatar = multer({
  storage: storage, 
  fileFilter: fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } 
});

export default { uploadAvatar };
