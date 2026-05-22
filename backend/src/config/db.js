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