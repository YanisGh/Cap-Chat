const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');

const app = express();

// Middleware pour parser les requêtes JSON
app.use(bodyParser.json());

// Configuration de la connexion à la base de données
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'capchat',
};

// Créer une connexion à la base de données
const connection = mysql.createConnection(dbConfig);

// Connecter à la base de données
connection.connect((err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données:', err);
  } else {
    console.log('Connexion à la base de données réussie');
  }
});

app.post('/test', (req, res) => {
  res.json({ message: 'ok' });
});

// Route d'inscription
app.post('/signup', (req, res) => {
  // Récupérer les informations d'inscription depuis le corps de la requête
  const { username, password } = req.body;
  
  // Vérifier si l'utilisateur existe déjà dans la base de données
  const checkUserQuery = 'SELECT * FROM Utilisateurs WHERE username = ?';
  connection.query(checkUserQuery, [username], (err, results) => {
    if (err) {
      console.error('Erreur lors de la vérification de l\'utilisateur:', err);
      res.status(500).json({ message: 'Une erreur s\'est produite' });
    } else if (results.length > 0) {
      res.status(409).json({ message: 'Cet utilisateur existe déjà' });
    } else {
      // Insérer le nouvel utilisateur dans la base de données
      const insertUserQuery = 'INSERT INTO Utilisateurs (username, password) VALUES (?, ?)';
      connection.query(insertUserQuery, [username, password], (err, results) => {
        if (err) {
          console.error('Erreur lors de l\'inscription de l\'utilisateur:', err);
          res.status(500).json({ message: 'Une erreur s\'est produite' });
        } else {
          res.json({ message: 'Inscription réussie' });
        }
      });
    }
  });
});

// Route d'authentification
app.post('/login', (req, res) => {
  // Récupérer les informations d'identification depuis le corps de la requête
  const { username, password } = req.body;
  
  // Vérifier les informations d'identification dans la base de données
  const checkCredentialsQuery = 'SELECT * FROM Utilisateurs WHERE username = ? AND password = ?';
  connection.query(checkCredentialsQuery, [username, password], (err, results) => {
    if (err) {
      console.error('Erreur lors de la vérification des informations d\'identification:', err);
      res.status(500).json({ message: 'Une erreur s\'est produite' });
    } else if (results.length === 0) {
      res.status(401).json({ message: 'Identifiants invalides' });
    } else {
      // Générer un token d'authentification
      const token = jwt.sign({ username }, secretKey);
      
      // Répondre avec le token
      res.json({ token });
    }
  });
});

// Routes pour les fonctionnalités protégées par l'authentification

// Exemple de route pour créer un artiste-créateur de Captchat
app.post('/artistes', authenticateToken, (req, res) => {
  // Récupérer les informations de l'artiste depuis le corps de la requête
  const { nom } = req.body;
  
  // Créer l'artiste dans la base de données (code à ajouter)
  // Utilisez la connexion à la base de données "connection" pour exécuter les requêtes
  
  // Répondre avec un message de succès
  res.json({ message: 'Artiste créé avec succès' });
});

// Exemple de route pour lister les artistes-créateurs de Captchat
app.get('/artistes', (req, res) => {
  // Récupérer les artistes depuis la base de données (code à ajouter)
  // Utilisez la connexion à la base de données "connection" pour exécuter les requêtes
  
  // Répondre avec la liste des artistes
  // res.json({ artistes: [...] });
});

// Middleware pour vérifier le token d'authentification
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (token == null) {
    return res.sendStatus(401);
  }
  
  jwt.verify(token, secretKey, (err, user) => {
    if (err) {
      return res.sendStatus(403);
    }
    
    req.user = user;
    next();
  });
}

// Démarrer le serveur
app.listen(3000, () => {
  console.log('Serveur démarré');
});
