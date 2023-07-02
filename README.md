# Site-web-generateur-de-Captchas
## Le site : 
Site web où l'on peut s'inscrire, se connecter et déposer son jeu d'images qui sera utilisé dans un captcha :
![image](https://github.com/YanisGh/Site-web-generateur-de-Captchas/assets/69716716/dd4af178-f0a2-478d-8784-5a5c896c1998)
![image](https://github.com/YanisGh/Site-web-generateur-de-Captchas/assets/69716716/fc481af9-6a6c-4266-8ce0-de01aacc33cd)

On peut aussi consulter, créer et modifier un thème que l'on pourra sélectionner lors de la création du captcha :

![image](https://github.com/YanisGh/Site-web-generateur-de-Captchas/assets/69716716/a0766329-da41-40de-bdfa-1fd8ad123760)
On peut aussi modifier ou supprimer un jeu d'image ou un utilisateur depuis la page d'accueil :
![image](https://github.com/YanisGh/Site-web-generateur-de-Captchas/assets/69716716/e49a72be-d604-4cca-b246-2fe660643100)
![image](https://github.com/YanisGh/Site-web-generateur-de-Captchas/assets/69716716/148d3d35-12c9-4940-bfb2-706b33f3fdb1)

# Fonctionnement du CRUD : 

Tout le CRUD est géré par des requêtes AJAX dans des fonctions qui sont appelé lors d'un clic sur un bouton, qui font appel à des routes, qui renvoient les données (ou un code d'erreur) /executent l'action (créé, modifié, supprimer...).
À titre d'exemple, voici ma fonction "deleteAll", qui comme son nom l'indique, s'occupe de la partie suppression :
![image](https://github.com/YanisGh/Site-web-generateur-de-Captchas/assets/69716716/9df12cd7-5656-41e4-a21a-6ebcd747a031)
La fonction récupère la catégorie (un thème, un utilisateur ou un jeu d'images) que l'on veut supprimer, avec son identifiant dans la base de données, puis l'envoie dans l'URL qui fera appel à la route.
Ma route "deleteAll" :
![image](https://github.com/YanisGh/Site-web-generateur-de-Captchas/assets/69716716/afb1f2e5-0eba-446d-a486-c9bb1e56a4e6)
On récupère la catégorie de l'élément à supprimer, et son identifiant depuis la requête en les stockant dans des variables, que l'on pourra utiliser.
Puis, en fonction de la catégorie, on change la variable "DeleteQuery" (et on en crée d'autres.), que l'on utilisera ensuite à la fin, avant d'envoyer un message de succès ou d'erreur avec un code.

# Le captcha en lui même :
Un captcha dispose d'un nom, d'un thème (BD, Art, Automobile, Sport...), d'un jeu d'image comportant une image singulière (l'image sur laquelle il faut cliquer pour valider le captcha), des images neutres ainsi qu'une "Question Associée", qui est un indice
permettant de reconnaître la bonne image (du style "Séléctionnez les images qui comportent un vélo" par exemple). Chaque image singulière dispose de sa propre Question Associé qui permet de la reconnaître.
Le captcha fonctionne de la manière suivante :
Une série d'images est affichée, et seulement 1 image permet de valider le captcha.
On dispose d'un compte a rebours de 30 secondes, qui diminue de 5 secondes a chaque mauvaise image sélectionnée. Lors de la fin de ce compte à rebours, on est redirigé vers la page d'accueil, sinon on est redirigé vers le lien donné dans l'URL.
Après que le captcha soit ajouté, on peut le tester en saisissant son URL, avec le lien auquel je veux accéder lorsque le captcha est validé.
Si par exemple, si je veux essayer le captcha N°2 qui me redirigera vers github s'il est validé, mon URL sera le suivant : "http://localhost:3000/captcha/2?link=https://github.com/".

Voici un exemple : 
![image](https://github.com/YanisGh/Site-web-generateur-de-Captchas/assets/69716716/600dfc2b-21a1-46dc-8dca-0a52f0ab45b8)




