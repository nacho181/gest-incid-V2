import dotenv from 'dotenv';

dotenv.config();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error('Falta la variable JWT_SECRET en el archivo .env. El servidor no puede iniciar sin ella.');
}

export default JWT_SECRET;