const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const crypto = require('crypto');
const cors = require('cors'); // Added

const app = express();
app.use(express.static('public'));
app.use(cors()); // Added

function MD5(string) {
  return crypto.createHash('md5').update(string).digest('hex');
}

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

// Route d'inscription
app.post('/register', (req, res) => {
  // Récupérer les informations d'inscription depuis le corps de la requête
  const username = req.query.username; 
  const password = req.query.password;
  const hashedPassword = MD5(password);

  // Vérifier si l'utilisateur existe déjà dans la base de données
  const checkUserQuery = 'SELECT * FROM utilisateurs WHERE identifiant = ?';
  connection.query(checkUserQuery, [username], (err, results) => {
    if (err) {
      console.error('Erreur lors de la vérification de l\'utilisateur:', err);
      res.status(500).json({ message: 'Une erreur s\'est produite' });
    } else if (results.length > 0) {
      res.status(409).json({ message: 'Cet utilisateur existe déjà' });
    } else {
      // Insérer le nouvel utilisateur dans la base de données
      const insertUserQuery = 'INSERT INTO utilisateurs (identifiant, MotDePasse, Rang) VALUES (?, ?, 1)';
      connection.query(insertUserQuery, [username, hashedPassword], (err, results) => {
        if (err) {
          console.error('Erreur lors de l\'inscription de l\'utilisateur:', err);
          res.status(500).json({ message: 'Une erreur s\'est produite' });
        } else {
          res.status(200).json('Inscription réussie, vous pouvez maintenant utilisez vos identifiants pour vous connecter'); // Return 200 for success
        }
      });
    }
  });
});

// Route d'authentification
app.get('/login', (req, res) => {
  const username = req.query.username;
  const password = req.query.password;
  const hashedPassword = MD5(password);

  const query = `SELECT * FROM utilisateurs WHERE identifiant = ? AND MotDePasse = ?`;
  connection.query(query, [username, hashedPassword], (err, results) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      res.status(500).send('Internal Server Error');
      return;
    }

    // Check if the login credentials are valid
    if (results.length > 0) {
      const token = jwt.sign({ username }, 'audir8');
      const userId = results[0].idUtilisateur; // Assuming the user ID field is named 'id'
      
      // Update the token field in the database for the logged-in user
      const updateQuery = 'UPDATE utilisateurs SET token = ? WHERE idUtilisateur = ?';
      connection.query(updateQuery, [token, userId], (updateErr, updateResult) => {
        if (updateErr) {
          console.error('Error updating token:', updateErr);
          res.status(500).send('Internal Server Error');
          return;
        }
        
        res.json({ token }); // Send the token as JSON response
      });
    } else {
      console.log("login mauvais");
      res.send('Invalid login credentials!');
    }
  });
});


// Routes pour les fonctionnalités protégées par l'authentification

//Route pour voir les themes, artistes, jeux d'images.
app.get('/getAll', (req, res) => {
  const categorie = req.query.categorie;

  let query = '';

  switch (categorie) {
    case 'theme':
      query = 'SELECT idTheme, Nom FROM themes';
      break;
    case 'artistes':
      query = 'SELECT idUtilisateur, Identifiant FROM Utilisateurs';
      break;
    case 'jeux d\'image':
      query = 'SELECT idJeu, Nom FROM jeux';
      break;
    default:
      res.status(400).send('Invalid categorie');
      return;
  }

  connection.query(query, (err, results) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      return res.status(500).send('Internal Server Error');
    }

    res.send(results);
  });
});


//Route pour crée les themes, artistes, jeux d'images.
app.post('/postAll', (req, res) => {

});

app.patch('/modifyAll', (req, res) => {
  const { categorie, id, newName } = req.body;

  let updateQuery = '';

  switch (categorie) {
    case 'artistes':
      updateQuery = 'UPDATE Utilisateurs SET Identifiant = ? WHERE idUtilisateur = ?';
      successMsg = 'Artiste mis à jour avec succès !'
      break;
      case 'theme':
      updateQuery = 'UPDATE themes SET Nom = ? WHERE idTheme = ?';
      successMsg = 'Theme mis à jour avec succès !'
      break;
      case 'jeux d\'image':
      updateQuery = 'UPDATE jeux SET Nom = ? WHERE idJeu = ?';
      successMsg = 'Jeux d\'image mis à jour avec succès !'
      break;

    default:
      return res.status(400).send('Categorie Invalide');
  }

  connection.query(updateQuery, [newName, id], (err, result) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      return res.status(500).send('Internal Server Error');
    }

    console.log(successMsg);
    res.send(successMsg);
  });
});



app.delete('/deleteAll', (req, res) => {
  const { categorie, id } = req.query;
  let deleteQuery = '';

  switch (categorie) {
    case 'artistes':
      deleteQuery = 'DELETE FROM Utilisateurs WHERE idUtilisateur = ?';
      break;
    case 'theme':
      deleteQuery = 'DELETE FROM themes WHERE idTheme = ?';
      break;
    case 'jeux d\'image':
      deleteQuery = 'DELETE FROM jeux WHERE idJeu = ?';
      break;
    default:
      return res.status(400).send('Invalid categorie');
  }

  connection.query(deleteQuery, [id], (err, result) => {
    if (err) {
      console.error('Error executing SQL query:', err);
      return res.status(500).send('Internal Server Error');
    }

    res.send(categorie + 'deleted successfully');
  });
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

