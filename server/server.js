const express = require('express');
const bodyParser = require('body-parser');
const jwt = require('jsonwebtoken');
const mysql = require('mysql');
const crypto = require('crypto');
const cors = require('cors'); // Added
const fs = require('fs');
const app = express();
const path = require('path');
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
const multer = require('multer');
const AdmZip = require('adm-zip');
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    if (file.fieldname === 'neutralPics') {
      cb(null, 'C:/Users/yanis/CAPchat/Cap-Chat/public/captchaIMG/neutres/');
    } else if (file.fieldname === 'singularPic') {
      cb(null, 'C:/Users/yanis/CAPchat/Cap-Chat/public/captchaIMG/singuliers/');
    } else {
      cb(new Error('Invalid file fieldname'));
    }
  },
  filename: function (req, file, cb) {
    cb(null, file.originalname);
  }
});

const upload = multer({ storage });
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
  const hashedPassword = MD5(req.query.password);

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
      const userId = results[0].idUtilisateur;
      
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
      query = 'SELECT idTheme, Nom FROM themes ORDER BY Nom';
      break;
    case 'artistes':
      query = 'SELECT idUtilisateur, Identifiant FROM Utilisateurs ORDER BY Identifiant';
      break;
    case 'jeux d\'image':
      query = 'SELECT idJeu, Nom FROM jeux ORDER BY Nom';
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

app.post('/postTheme', (req, res) => {
});

//Route pour crée les jeux.
app.post('/postForm', upload.fields([
  { name: 'neutralPics', maxCount: 7 },
  { name: 'singularPic', maxCount: 1 }
]), (req, res) => {

  const username = req.body.username;
  const captchatName = req.body.captchatName;
  const themeId = req.body.themeId;
  const themeName = req.body.themeName;
  const singularPicHint = req.body.singularPicHint;

  console.log('Username:', username);
  console.log('CaptChat Name:', captchatName);
  console.log('Theme ID:', themeId);
  console.log('Theme Name:', themeName);
  console.log('Singular Pic Hint:', singularPicHint);

  const neutralPic = req.files['neutralPics'][0];
  const singularPic = req.files['singularPic'][0];

  const insertCaptchatQuery = `INSERT INTO jeux (Nom, idTheme, idUtilisateur) VALUES ('${captchatName}', ${themeId}, '25')`;
  connection.query(insertCaptchatQuery, (error, captchatResult) => {
    if (error) {
      console.error('Error inserting captchat:', error);
      // Handle the error
      res.sendStatus(500); // Send an error response
    } else {
      // Captchat inserted successfully
      console.log('Captchat inserted successfully');
      const captchaId = captchatResult.insertId;

      const neutralZip = new AdmZip(neutralPic.path);
      const neutralEntries = neutralZip.getEntries();

      neutralEntries.forEach((entry) => {
        if (!entry.isDirectory) {
          const extractedPath = path.join('C:/Users/yanis/CAPchat/Cap-Chat/public/captchaIMG/neutres', entry.entryName);
          const entryData = entry.getData();
          fs.writeFileSync(extractedPath, entryData);
          console.log('Neutral Picture:', entry.entryName);

          const insertNeutralImageQuery = `INSERT INTO images (NomIMG, typeIMG, idJeu) VALUES ('${entry.entryName}', 0, ${captchaId})`;
          connection.query(insertNeutralImageQuery, (error, imageResult) => {
            if (error) {
              console.error('Error inserting neutral image:', error);
              // Handle the error
            } else {
              // Neutral image inserted successfully
              console.log('Neutral image inserted successfully');
            }
          });
        }
      });

      const singularZip = new AdmZip(singularPic.path);
      const singularEntries = singularZip.getEntries();

      singularEntries.forEach((entry) => {
        if (!entry.isDirectory) {
          const extractedPath = path.join('C:/Users/yanis/CAPchat/Cap-Chat/public/captchaIMG/singuliers', entry.entryName);
          const entryData = entry.getData();
          fs.writeFileSync(extractedPath, entryData);
          console.log('Singular Picture:', entry.entryName);
      
          const insertSingularImageQuery = `INSERT INTO images (NomIMG, QuestionAssociee, typeIMG, idJeu) VALUES ('${entry.entryName}', '${singularPicHint}', 1, ${captchaId})`;
          connection.query(insertSingularImageQuery, (error, imageResult) => {
            if (error) {
              console.error('Error inserting singular image:', error);
              // Handle the error
            } else {
              // Singular image inserted successfully
              console.log('Singular image inserted successfully');
            }
          });
        }
      });

      res.sendStatus(200); // Send a success response
    }
  });
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


app.get('/captcha/:idJeu', (req, res) => {
  const idJeu = req.params.idJeu;
  const linkParam = req.query.link;

  // Query to retrieve the singular image with the associated question
  const singularQuery = `SELECT NomIMG, QuestionAssociee FROM images WHERE idJeu = ${idJeu} AND typeIMG = 1 LIMIT 1`;

  // Query to retrieve the neutral images
  const neutralQuery = `SELECT NomIMG FROM images WHERE idJeu = ${idJeu} AND typeIMG = 0`;

  // Execute the queries to retrieve the images with the given idJeu
  connection.query(singularQuery, (err, singularResults) => {
    if (err) {
      console.error('Error executing the singular image query:', err);
      res.status(500).json({ error: 'Internal Server Error' });
      return;
    }

    connection.query(neutralQuery, (err, neutralResults) => {
      if (err) {
        console.error('Error executing the neutral images query:', err);
        res.status(500).json({ error: 'Internal Server Error' });
        return;
      }

      // Extract the image names and questions from the query results
      const neutralImages = neutralResults.map((row) => row.NomIMG);
      const singularImage = singularResults[0] || null;
      const singularImageName = singularImage ? singularImage.NomIMG : null;
      const singularImageQuestion = singularImage ? singularImage.QuestionAssociee : null;

      // Build the image URLs for the HTML content
      const neutralImagesURLs = neutralImages.map((imageName) => `/captchaIMG/neutres/${imageName}`);
      const singularImageURL = singularImageName ? `/captchaIMG/singuliers/${singularImageName}` : null;

      // Fisher-Yates shuffle algorithm to shuffle the array in place
      function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [array[i], array[j]] = [array[j], array[i]];
        }
      }

      // Shuffle the array of image URLs
      const imageUrls = [singularImageURL, ...neutralImagesURLs].filter(Boolean); // Combine singular and neutral images
      shuffleArray(imageUrls);

      // Basic HTML content with dynamic data and image display
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Captcha Page</title>
            <style>
              .imageContainer {
                display: grid;
                grid-template-columns: repeat(4, 100px);
                grid-template-rows: repeat(4, 100px);
                grid-gap: 10px;
              }

              .imageContainer img {
                width: 100%;
                height: 100%;
                object-fit: cover;
              }

              .thermometerContainer {
                width: 200px;
                height: 20px;
                background-color: #eee;
                position: relative;
                margin-top: 20px;
              }

              .thermometerFill {
                width: 0%;
                height: 100%;
                background-color: #00ff00;
                transition: width 0.3s ease;
              }
            </style>
          </head>
          <body>
            <div class="imageContainer">
            ${imageUrls
              .map((imageURL) => {
                const altText = imageURL.includes('/captchaIMG/singuliers') ? 'Singular' : 'Neutral';
                return `<img src="${imageURL}" alt="${altText}">`;
              })
              .join('')}
            </div>
            <p>Question: ${singularImageQuestion}</p>

            <div class="thermometerContainer">
              <div id="thermometerFill" class="thermometerFill"></div>
            </div>
            <script>
              // Your existing code for handling the images and timer
              var timer = 30; // Initial timer value in seconds

              // Update the timer display every second
              var timerDisplay = document.createElement('p');
              timerDisplay.id = 'timer';
              document.body.appendChild(timerDisplay);

              var timerInterval = setInterval(function () {
                timer--;
                timerDisplay.textContent = 'Time left: ' + timer + 's';

                if (timer <= 0) {
                  clearInterval(timerInterval);
                  alert('You ran out of time');
                  imageContainer.innerHTML = '';
                  timerDisplay.textContent = '';
                  thermometerContainer.style.display = 'none';
                }

                // Calculate the percentage of remaining time
                var percentage = (timer / 30) * 100; // Adjust based on your timer range

                // Update the thermometer fill based on the percentage
                updateThermometerFill(percentage);
              }, 1000);

              // Function to update the thermometer fill based on the percentage
              function updateThermometerFill(percentage) {
                var fillElement = document.getElementById('thermometerFill');
                fillElement.style.width = percentage + '%';
              }
              
              // Attach click event listener to the images
              var images = document.querySelectorAll('.imageContainer img');
              images.forEach(function (image) {
                image.addEventListener('click', function () {
                  if (image.alt === 'Singular') {
                    clearInterval(timerInterval);
                    alert('Captcha validé');
                    console.log("${linkParam}");
                    window.location.href = decodeURIComponent("${linkParam}");
                  } else {
                    timer -= 5;
                  }
                });
              });
            </script>
          </body>
        </html>
      `;

      res.send(htmlContent);
    });
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

