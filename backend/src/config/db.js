/**
 * Connexion à la base de données MongoDB via Mongoose.
 *
 * - Lit l'URI MongoDB depuis la variable d'environnement MONGO_URI (.env).
 * - Affiche l'hôte connecté ou l'erreur de connexion.
 * - En cas d'échec, arrête entièrement le processus serveur (process.exit(1))
 *   car l'application ne peut pas fonctionner sans la base de données.
 */
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    // Tente de se connecter avec le lien caché dans le .env
    const conn = await mongoose.connect(process.env.MONGO_URI, {
    });
    console.log(`MongoDB connecté avec succès : ${conn.connection.host}`);
  } catch (error) {
    console.error(`Erreur de connexion MongoDB : ${error.message}`);
    // Si la base de données plante, on arrête tout le serveur
    process.exit(1); 
  }
};

module.exports = connectDB;