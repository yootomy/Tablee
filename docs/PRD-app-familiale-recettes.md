# PRD - Application familiale de recettes, planning repas et courses

Version: V1.2 brouillon  
Date: 9 avril 2026  
Statut: A raffiner

## 1. Resume executif

L'objectif est de creer une application web familiale qui centralise la planification des repas, les recettes, la liste de courses et l'organisation entre plusieurs membres d'une meme famille, potentiellement repartis sur plusieurs lieux de vie.

L'application doit permettre a une famille de:

- partager des recettes
- planifier qui cuisine quoi et quand
- gerer des listes de courses organisees par lieu
- choisir sur quel lieu un repas ou un achat est prevu
- coordonner plusieurs membres de la famille au sein d'un meme espace
- permettre a un utilisateur de basculer entre plusieurs espaces familiaux distincts

## 2. Recommendation produit

Recommendation: commencer par une application web responsive.

Pourquoi:

- le besoin principal est collaboratif et multi-appareils
- une web app est plus rapide a concevoir, tester et iterer
- une base web bien pensee peut ensuite devenir une PWA
- plus tard, un emballage mobile via une solution type Capacitor ou une app mobile dediee pourra etre envisage

Conclusion:

- Phase 1: web app responsive
- Phase 2: PWA avec notifications et raccourci ecran d'accueil
- Phase 3: eventuelle application mobile native ou hybride si les usages le justifient

## 3. Vision produit

Creer un "hub familial de cuisine" simple, convivial et pratique, qui aide une famille a savoir:

- quoi manger
- qui cuisine
- quoi acheter
- pour quel lieu
- a quel moment

## 4. Probleme a resoudre

Aujourd'hui, dans beaucoup de familles:

- les idees de repas sont eparpillees
- les recettes ne sont pas centralisees
- la liste de courses vit dans plusieurs endroits
- on ne sait pas toujours qui cuisine ni quand
- lorsqu'il existe plusieurs lieux de vie, la coordination devient confuse

Resultat: oublis, doublons, charge mentale et mauvaise coordination.

## 5. Utilisateurs cibles

### Utilisateurs principaux

- familles vivant ensemble
- familles reparties sur plusieurs lieux
- couples avec enfants
- colocations familiales ou groupes proches ayant une logique commune de repas

### Profils types

- Parent organisateur: cree la famille, gere les lieux, valide l'organisation
- Enfant ou ado: ajoute des envies, ingredients ou idees de repas
- Membre contributeur: propose des recettes, s'inscrit pour cuisiner, complete la liste de courses

## 6. Hypotheses de depart

Ces hypotheses servent a cadrer la V1:

- une "famille" est un espace partage
- un utilisateur peut appartenir a plusieurs familles
- l'application fonctionne toujours dans le contexte d'une famille active
- une famille peut avoir plusieurs "lieux" (ex: Maison 1, Maison 2)
- les membres rejoignent une famille via un code d'invitation
- chaque evenement du calendrier peut etre associe a un lieu
- chaque repas planifie possede un moment de repas: midi ou soir
- la liste de courses est organisee par lieu des le MVP
- l'utilisateur choisit un lieu en entrant sur la page courses, puis consulte et ajoute des articles pour ce lieu
- les recettes sont partagees entre tous les membres de la famille
- chaque repas planifie peut etre relie a une recette existante ou a un repas libre saisi a la main
- les ingredients d'une recette peuvent etre envoyes vers la liste de courses du lieu concerne
- le produit est d'abord pense pour un usage personnel et familial, pas comme produit public des le debut

## 7. Objectifs produit

### Objectifs business / produit

- offrir une experience simple a comprendre pour toute la famille
- augmenter la coordination autour des repas
- reduire les oublis dans les courses
- rendre visible qui fait quoi
- gerer naturellement plusieurs lieux

### Objectifs utilisateur

- ajouter rapidement une idee ou un ingredient
- voir le planning repas de la semaine
- savoir qui cuisine un repas
- preparer des courses sans doublon
- retrouver facilement les recettes familiales

## 7.1 Principes produit

Pour garder une experience forte et simple, la V1 doit suivre ces principes:

- lieu d'abord: les courses et l'organisation doivent toujours etre comprenables par lieu
- mobile d'abord dans les usages: la plupart des actions doivent pouvoir se faire rapidement depuis un telephone
- collaboration simple: chaque membre peut contribuer sans apprentissage complexe
- saisie rapide: ajouter un repas ou un article doit prendre tres peu d'etapes
- automatisation progressive: on commence par une automatisation simple et utile, puis on ajoute les automatismes plus avances ensuite

## 8. Hors perimetre de la V1

Pour garder un MVP realiste, les elements suivants sont exclus de la premiere version:

- livraison de courses integree
- paiement ou budget familial
- chat temps reel complexe
- suggestions nutritionnelles avancees
- intelligence artificielle de recommandation
- mode hors ligne complet
- synchronisation avec Google Calendar ou Apple Calendar
- import automatique de recette depuis un lien Instagram ou TikTok via IA

## 9. MVP propose

Le MVP doit couvrir 6 piliers.

### 9.1 Comptes et espace famille

- creation de compte
- connexion
- creation d'une famille
- possibilite de rejoindre ou creer plusieurs familles
- selecteur de famille active
- invitation d'autres membres via code
- choix du role minimal par membre

### 9.2 Gestion des lieux

- creation de un ou plusieurs lieux dans une famille
- exemple: "Maison principale", "Appartement", "Chez maman", "Chez papa"
- possibilite d'associer un repas, une course ou une recette favorite a un lieu

### 9.3 Recettes

- creer une recette
- renseigner titre, description, ingredients, etapes, temps, portions
- option pour associer une recette a un ou plusieurs lieux si pertinent
- consultation et recherche simple des recettes

### 9.4 Calendrier repas

- vue semaine au minimum
- ajout d'un repas a une date
- choix obligatoire du moment de repas: midi ou soir
- assignation d'un membre responsable
- liaison optionnelle avec une recette
- choix du lieu
- statut optionnel: planifie, a faire, fait

### 9.5 Liste de courses par lieu

- acces a la liste de courses via un choix de lieu ou un onglet de lieu
- affichage des articles uniquement pour le lieu selectionne
- ajout manuel d'ingredients ou de produits dans le lieu actif
- ajout semi-automatique des ingredients d'une recette vers la liste du lieu actif ou du lieu du repas planifie
- ajout rapide par tous les membres
- possibilite d'indiquer une quantite
- case a cocher pour marquer comme achete
- trace minimale de collaboration: qui a ajoute ou coche un article

### 9.6 Tableau de bord familial simple

- affichage de la famille active
- vue d'ensemble des prochains repas
- acces rapide a la liste de courses du lieu actif
- acces rapide aux recettes recentes ou favorites

## 10. Fonctionnalites detaillees

### 10.1 Authentification et onboarding

#### Besoin

Permettre a un utilisateur de creer son compte, creer ou rejoindre une famille, puis commencer a utiliser l'application sans friction.

#### Exigences

- inscription par email et mot de passe
- connexion securisee
- creation d'une famille a la premiere connexion si aucune famille n'existe
- saisie d'un code pour rejoindre une famille existante
- possibilite de rejoindre ou creer une autre famille apres onboarding
- premier ecran de configuration avec nom de la famille et premier lieu

### 10.2 Gestion de la famille

#### Besoin

Structurer l'espace collaboratif.

#### Exigences

- une famille possede un nom
- une famille possede plusieurs membres
- une famille possede plusieurs lieux
- un utilisateur peut appartenir a plusieurs familles
- l'utilisateur peut changer de famille active depuis l'interface
- les donnees d'une famille sont strictement isolees des autres familles
- un proprietaire ou admin peut inviter ou retirer un membre
- un admin peut definir un lieu par defaut pour simplifier l'usage au quotidien
- les roles minimaux proposes:
  - admin
  - membre

### 10.3 Gestion des lieux

#### Besoin

Differencier les usages selon les lieux de vie.

#### Exigences

- creer, modifier, archiver un lieu
- associer un repas planifie a un lieu
- filtrer le calendrier par lieu
- ouvrir la liste de courses par lieu
- memoriser si possible le dernier lieu utilise par un membre

### 10.4 Gestion des recettes

#### Besoin

Conserver un repertoire familial de recettes reutilisables.

#### Exigences

- ajouter une recette
- modifier une recette
- supprimer ou archiver une recette
- stocker ingredients et etapes
- indiquer temps de preparation et nombre de portions
- rechercher une recette par nom
- stocker les ingredients dans un format structure exploitable pour la liste de courses

#### Champs minimums

- titre
- description courte
- ingredients
- etapes
- temps de preparation
- temps de cuisson
- portions
- url source optionnelle

#### Structure minimale d'un ingredient

- nom
- quantite
- unite
- note optionnelle

### 10.5 Calendrier repas

#### Besoin

Visualiser les repas et l'organisation de la famille.

#### Exigences

- afficher une vue hebdomadaire
- creer un evenement repas
- choisir un moment de repas obligatoire: midi ou soir
- associer optionnellement un membre responsable
- associer un lieu
- associer une recette ou un titre libre
- modifier ou supprimer un evenement repas

#### Exemple d'usage

Le samedi soir, la famille planifie "Lasagnes" au "Lieu 1", cuisinees par "Membre A".

### 10.6 Liste de courses

#### Besoin

Centraliser ce qu'il faut acheter, de maniere distincte selon chaque lieu.

#### Exigences

- l'utilisateur choisit d'abord un lieu actif sur la page courses
- la liste affiche uniquement les articles du lieu actif
- chaque membre peut ajouter un article
- les ingredients d'une recette peuvent etre ajoutes automatiquement a la liste de courses
- chaque article peut avoir:
  - un nom
  - une quantite
  - un commentaire
  - un lieu obligatoire
  - un statut achete / non achete
  - un auteur de creation
  - un auteur de validation facultatif
- ajout d'article en restant dans le lieu actuellement selectionne
- affichage simple et rapide a cocher
- changement de lieu simple depuis la meme page
- prevention minimale des doublons a etudier plus tard
- ajout automatique simple sans dedoublonnage intelligent obligatoire au MVP

#### Comportement recommande pour le MVP

- la page de courses affiche un selecteur ou des onglets de lieux en haut
- lorsqu'un lieu est selectionne, toutes les actions d'ajout concernent ce lieu
- il n'existe pas de vue "tous lieux melanges" par defaut, afin d'eviter la confusion

### 10.7 Tableau de bord familial

#### Besoin

Donner un point d'entree simple apres connexion.

#### Exigences

- afficher la famille active
- permettre de changer rapidement de famille active
- afficher les prochains repas a venir
- afficher un acces rapide a la liste de courses du lieu actif
- afficher un acces rapide a l'ajout de recette, repas ou article
- servir de page d'accueil principale apres connexion

### 10.8 Import intelligent de recette depuis lien social

#### Besoin

Permettre a terme de creer un brouillon de recette a partir d'un lien public Instagram ou TikTok.

#### Positionnement

Cette fonctionnalite est prioritaire apres le MVP, mais ne fait pas partie du MVP strict.

#### Approche recommandee

- l'utilisateur colle un lien public Instagram ou TikTok
- l'application tente de recuperer les metadonnees autorisees et les contenus exploitables
- une IA genere un brouillon de recette structuree
- l'utilisateur verifie puis corrige avant sauvegarde finale

#### Contraintes importantes

- tous les liens ne seront pas forcement exploitables
- le support dependra des restrictions des plateformes et des contenus disponibles
- une validation humaine restera obligatoire
- la fonctionnalite doit creer un brouillon, pas une recette consideree comme fiable sans verification

## 11. User stories cles

### Authentification / famille

- En tant que nouvel utilisateur, je veux creer une famille afin d'avoir un espace partage.
- En tant que membre, je veux rejoindre une famille via un code afin de collaborer avec les autres.
- En tant que membre, je veux pouvoir appartenir a plusieurs familles afin de separer mes differents espaces familiaux.
- En tant que membre, je veux changer de famille active facilement afin de passer d'un contexte a l'autre.

### Lieux

- En tant qu'admin, je veux creer plusieurs lieux afin d'organiser les repas et courses selon l'endroit.

### Recettes

- En tant que membre, je veux enregistrer une recette afin que toute la famille puisse la reutiliser.
- En tant que membre, je veux retrouver rapidement une recette afin de la planifier.

### Calendrier

- En tant que membre, je veux programmer un repas a une date afin que tout le monde sache ce qui est prevu.
- En tant que membre, je veux definir si un repas est prevu pour le midi ou le soir afin que le planning soit clair.
- En tant que membre, je veux indiquer qui cuisine afin d'eviter les ambiguities.
- En tant que membre, je veux choisir le lieu d'un repas afin de coordonner plusieurs foyers.

### Courses

- En tant que membre, je veux ouvrir la liste de courses d'un lieu precis afin de ne voir que ce qui concerne cet endroit.
- En tant que membre, je veux ajouter un ingredient a acheter dans le lieu actif afin de contribuer a la bonne liste.
- En tant que membre, je veux envoyer automatiquement les ingredients d'une recette dans la liste de courses afin de gagner du temps.
- En tant que membre, je veux cocher un article achete afin d'eviter les doublons.
- En tant que membre, je veux voir qui a ajoute ou coche un article afin d'avoir un minimum de contexte.

### Import intelligent - post-MVP prioritaire

- En tant que membre, je veux coller un lien Instagram ou TikTok pour obtenir un brouillon de recette afin d'eviter la saisie manuelle complete.

## 12. Parcours utilisateur cles

### Parcours 1: creer un espace familial

1. L'utilisateur cree un compte.
2. Il cree une famille.
3. Il ajoute un premier lieu.
4. Il partage un code d'invitation.
5. Les autres membres rejoignent la famille.

### Parcours 1 bis: changer de famille active

1. L'utilisateur ouvre l'application.
2. Il utilise le selecteur de famille.
3. Il choisit une autre famille.
4. Le tableau de bord, le calendrier, les recettes et les courses changent de contexte.

### Parcours 2: planifier un repas

1. Un membre ouvre le calendrier.
2. Il choisit une date.
3. Il ajoute un repas.
4. Il choisit si le repas est prevu pour le midi ou le soir.
5. Il selectionne une recette ou saisit un nom libre.
6. Il choisit le membre responsable.
7. Il choisit le lieu.
8. Le repas apparait dans le planning.

### Parcours 3: preparer les courses

1. Un membre ouvre la liste de courses.
2. Il choisit le lieu A ou le lieu B.
3. Il ajoute un ingredient manuellement dans le lieu actif.
4. Un autre membre ouvre ce meme lieu et coche l'article une fois achete.

### Parcours 4: ajouter automatiquement une recette a la liste de courses

1. Un membre ouvre une recette ou un repas planifie.
2. Il choisit d'ajouter les ingredients a la liste de courses.
3. L'application propose le lieu cible, par defaut le lieu du repas ou le lieu actif.
4. Les ingredients sont ajoutes comme articles de courses.

## 13. Priorisation

### Must have

- comptes utilisateurs
- creation / rejoindre une famille
- appartenance a plusieurs familles
- changement de famille active
- gestion des lieux
- recettes simples
- calendrier repas hebdomadaire
- notion de midi / soir
- liste de courses par lieu
- ajout d'ingredients a la liste depuis une recette
- page d'accueil / tableau de bord simple

### Should have

- filtres par membre
- statuts des repas
- recherche de recettes
- memorisation du dernier lieu actif

### Could have

- notifications de rappel
- commentaires sur un repas
- favoris de recettes
- import intelligent de recette depuis lien Instagram ou TikTok

## 14. Regles metier

- un utilisateur peut appartenir a une ou plusieurs familles
- l'application fonctionne toujours avec une famille active
- une famille possede un ou plusieurs lieux
- un repas planifie appartient a une famille
- un repas planifie peut etre associe a zero ou une recette
- un repas planifie doit etre associe a un lieu
- un repas planifie doit avoir un moment de repas: midi ou soir
- un article de courses appartient a une famille
- un article de courses doit etre associe a un lieu
- un article de courses est cree dans le contexte d'un lieu actif
- un article de courses peut provenir d'une recette ou d'un repas planifie
- seuls les membres de la famille peuvent voir ses donnees
- les donnees d'une famille ne sont jamais visibles depuis une autre famille

## 15. Donnees principales

### Entites

- User
- Family
- FamilyMember
- UserPreference
- Location
- Recipe
- RecipeIngredient
- MealPlan
- ShoppingItem
- Invite
- ActivityLog (optionnel, phase 2)

### Relations simplifiees

- User <-> Family via FamilyMember
- User -> optional active Family preference
- Family -> many Locations
- Family -> many Recipes
- Family -> many MealPlans
- Family -> many ShoppingItems
- MealPlan -> optional Recipe
- MealPlan -> one Location
- MealPlan -> one responsible User
- MealPlan -> one meal moment (midi ou soir)
- ShoppingItem -> one Location
- ShoppingItem -> one creator User
- ShoppingItem -> optional completedBy User
- ShoppingItem -> optional source Recipe

## 16. Ecrans principaux

- page d'accueil / landing
- inscription / connexion
- creation ou jonction a une famille
- selecteur de famille active
- tableau de bord famille
- calendrier des repas
- detail d'une recette
- creation / edition de recette
- liste de courses
- gestion des lieux
- gestion des membres / invitations
- import de recette par lien social (phase 2)

## 17. Exigences non fonctionnelles

- application mobile-friendly des le debut
- interface tres simple pour tous les ages
- temps de chargement rapide
- securisation des donnees familiales
- architecture permettant d'ajouter une app mobile plus tard
- navigation optimisee pour usage a une main sur mobile
- actions frequentes realisables en peu d'etapes
- isolation stricte des donnees entre familles

## 18. Proposition technique de depart

### Stack suggeree

- Frontend: application web responsive
- Backend: API simple avec base relationnelle
- Base de donnees: PostgreSQL ou equivalent
- Auth: email/password avec gestion de session securisee

### Orientation pratique

Pour aller vite, un framework full-stack web moderne est bien adapte, par exemple:

- Next.js
- Supabase pour auth + base de donnees

Alternative:

- frontend React / backend Node.js separes si tu veux une architecture plus decouplee

### Point d'architecture important

- le modele doit etre pense multi-familles des le debut
- toutes les donnees metier doivent etre rattachees a une famille
- si tu pars sur Supabase, les regles de securite par famille seront importantes

### Piste technique pour l'import IA de recettes

Approche recommandee a terme:

- l'utilisateur colle une URL publique Instagram ou TikTok
- un service backend tente de recuperer les donnees accessibles de maniere autorisee
- un pipeline IA transforme les informations disponibles en brouillon de recette structuree
- l'utilisateur valide et corrige avant enregistrement

Note importante:

- cette fonctionnalite ne doit pas etre concue comme une extraction garantie pour tous les liens
- elle doit etre pensee comme un import assiste, avec verification humaine obligatoire

## 19. Mesures de succes

### Mesures MVP

- nombre de familles creees
- nombre moyen de membres par famille
- nombre moyen de familles par utilisateur
- nombre de repas planifies par semaine
- nombre d'articles ajoutes a la liste de courses
- taux d'utilisation hebdomadaire

### Signes qualitatifs de succes

- les membres comprennent l'application sans tutoriel lourd
- la famille remplace ses notes eparses par l'app
- le lieu et le responsable d'un repas sont clairs

## 20. Risques produit

- trop de complexite des la V1
- friction a l'inscription familiale
- confusion entre recettes, repas planifies et liste de courses
- mauvaise ergonomie mobile
- surcharge fonctionnelle si on ajoute trop tot l'automatisation
- confusion si la logique par lieu n'est pas visible immediatement dans l'interface
- confusion si le changement de famille active n'est pas tres visible
- fragilite technique ou legale de l'import de recette depuis des plateformes sociales

## 21. Decisions recommandees

Pour garder un produit simple et fort, je recommande:

- plusieurs familles des le debut, mais avec un selecteur de famille tres explicite
- deux roles seulement au MVP: admin et membre
- une vue semaine uniquement au debut
- deux moments de repas seulement au debut: midi et soir
- une liste de courses strictement organisee par lieu avant toute automatisation
- un systeme de lieux au coeur du modele, pas ajoute apres coup
- un tableau de bord tres simple plutot qu'un accueil vide
- une trace minimale de collaboration sur les articles de courses
- un import IA de recettes traite comme une phase suivant le MVP, avec brouillon et validation

## 22. Questions ouvertes a trancher

Voici les questions les plus importantes pour la V2 du PRD:

1. Faut-il des notifications au MVP ?
2. Souhaites-tu que certaines recettes soient privees, ou tout doit-il etre partage dans la famille ?
3. Veux-tu gerer seulement la semaine, ou aussi une vue mois ?
4. Veux-tu deja integrer des photos pour les recettes dans le MVP ?
5. Veux-tu memoriser un lieu favori / dernier lieu utilise pour ouvrir directement la bonne liste de courses ?
6. Veux-tu une categorie simple pour les articles de courses plus tard (fruits, produits laitiers, epicerie, etc.) ?
7. Pour l'import IA, veux-tu viser d'abord Instagram, TikTok, ou les deux en meme temps ?
8. Pour l'import IA, veux-tu un brouillon uniquement, ou une recette presque pre-remplie avec ingredients et etapes ?
9. En cas d'echec sur un lien social, veux-tu un plan B ou l'utilisateur colle aussi la description ou le texte de la recette ?

## 23. Roadmap suggeree

### Phase 1 - MVP web

- comptes
- familles
- multi-familles
- lieux
- recettes
- calendrier semaine
- midi / soir
- liste de courses par lieu
- ajout d'ingredients depuis une recette
- tableau de bord simple

### Phase 2 - confort d'usage

- PWA
- notifications
- filtres plus riches
- photos de recettes
- import intelligent de recette depuis lien Instagram ou TikTok

### Phase 3 - extension mobile

- emballage mobile hybride ou app dediee
- optimisations notifications
- experience offline partielle

## 24. Conclusion

L'idee est bonne, tres concrete, et elle a un angle interessant: la coordination familiale multi-lieux. C'est un bon differenciateur par rapport a une simple app de recettes ou une simple liste de courses.

Le meilleur chemin est de commencer par une web app responsive, avec un MVP tres centre sur:

- famille
- lieux
- recettes
- planning des repas
- courses

Ce document sert de base de cadrage. La prochaine etape consiste a trancher les questions ouvertes, puis transformer ce PRD en backlog produit et en schema de base de donnees.
