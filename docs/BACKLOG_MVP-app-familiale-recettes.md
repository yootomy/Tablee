# Backlog MVP detaille - Application familiale de recettes, planning repas et courses

Version: V1 brouillon  
Date: 9 avril 2026  
Source: PRD V1.2

## 1. Objectif

Ce document transforme le PRD en backlog MVP actionnable.

Il sert a:

- decouper le produit en epics et user stories
- identifier ce qui est indispensable au MVP
- donner un ordre de livraison realiste
- preparer le futur decoupage en tickets de dev

## 2. Hypotheses retenues pour ce backlog

Les hypotheses suivantes sont considerees comme decidees:

- un utilisateur peut appartenir a plusieurs familles
- l'application fonctionne toujours avec une famille active
- les invitations se font via un code d'invitation suffisamment robuste
- les roles MVP sont uniquement admin et membre
- les repas sont planifies avec un moment obligatoire: midi ou soir
- le responsable d'un repas est optionnel
- la liste de courses est strictement organisee par lieu
- les ingredients d'une recette peuvent etre ajoutes a la liste de courses des le MVP avec confirmation et choix du lieu
- les recettes peuvent etre archivees ou supprimees
- le produit vise d'abord un usage personnel et familial

Les points suivants restent hors MVP:

- import IA depuis lien Instagram ou TikTok
- notifications
- vue calendrier mensuelle
- photos de recettes
- dedoublonnage intelligent avance des articles de courses

## 3. Conventions

### Priorites

- P0: indispensable au MVP
- P1: utile mais peut etre livre juste apres le coeur du MVP
- P2: post-MVP

### Effort

- S: petit
- M: moyen
- L: gros

## 4. Strategie de livraison recommandee

Ordre recommande:

1. socle applicatif, auth et contexte famille active
2. familles, membres, invitations et lieux
3. recettes
4. calendrier repas
5. liste de courses par lieu
6. tableau de bord et finitions MVP

## 5. Definition de done MVP

Une story MVP est consideree terminee si:

- les criteres d'acceptation fonctionnels sont couverts
- le comportement est correct sur mobile et desktop
- les donnees sont bien isolees par famille active
- les cas d'etat vide et d'erreur minimum sont geres
- la story ne casse pas les parcours deja livres

## 6. Epics et stories

## Epic A - Socle applicatif et authentification

### MVP-001 - Initialiser l'application web responsive

- Priorite: P0
- Effort: M
- Dependance: aucune
- Description: mettre en place le shell de l'application, la navigation principale et la structure des pages.

Criteres d'acceptation:

- l'application demarre avec une navigation claire
- les pages principales sont prevues dans le routing
- l'interface est utilisable sur mobile et desktop
- un utilisateur non connecte est redirige vers l'authentification pour les pages protegees

### MVP-002 - Creer un compte utilisateur

- Priorite: P0
- Effort: M
- Dependance: MVP-001
- Description: permettre l'inscription via email et mot de passe.

Criteres d'acceptation:

- un utilisateur peut creer un compte avec email et mot de passe
- les erreurs de saisie minimum sont affichees
- le compte est persiste en base
- l'utilisateur connecte arrive sur l'onboarding initial

### MVP-003 - Se connecter et se deconnecter

- Priorite: P0
- Effort: S
- Dependance: MVP-002
- Description: permettre la connexion et la deconnexion avec session persistante.

Criteres d'acceptation:

- un utilisateur existant peut se connecter
- la session reste active entre deux rafraichissements de page
- l'utilisateur peut se deconnecter
- les routes protegees ne sont plus accessibles apres deconnexion

### MVP-004 - Gerer les etats standards de l'application

- Priorite: P0
- Effort: M
- Dependance: MVP-001
- Description: definir un comportement commun pour chargement, erreur et etat vide.

Criteres d'acceptation:

- chaque page principale a un etat de chargement minimum
- chaque page principale a un etat vide comprehensible
- les erreurs principales sont affichees de maniere lisible

## Epic B - Familles, contexte actif et membres

### MVP-005 - Creer une premiere famille

- Priorite: P0
- Effort: M
- Dependance: MVP-002
- Description: permettre a l'utilisateur de creer sa premiere famille lors de l'onboarding.

Criteres d'acceptation:

- un utilisateur sans famille peut creer une famille
- la famille a un nom
- l'utilisateur createur devient admin de cette famille
- la famille creee devient la famille active

### MVP-006 - Rejoindre une famille existante via code ou lien

- Priorite: P0
- Effort: M
- Dependance: MVP-005
- Description: permettre de rejoindre une famille existante via un code d'invitation suffisamment robuste.

Criteres d'acceptation:

- un utilisateur peut saisir un code d'invitation valide
- l'utilisateur rejoint la famille cible
- la famille rejointe apparait dans ses familles disponibles
- un code invalide affiche une erreur claire
- le code n'est pas trivialement devinable

### MVP-007 - Creer une famille supplementaire

- Priorite: P0
- Effort: S
- Dependance: MVP-005
- Description: permettre a un utilisateur deja actif de creer un autre espace familial.

Criteres d'acceptation:

- un utilisateur peut creer une seconde famille depuis l'application
- la nouvelle famille apparait dans son selecteur de familles
- les donnees ne sont pas melangees avec les autres familles

### MVP-008 - Changer de famille active

- Priorite: P0
- Effort: M
- Dependance: MVP-006
- Description: permettre de basculer entre plusieurs familles.

Criteres d'acceptation:

- un selecteur de famille est visible dans l'application
- l'utilisateur peut choisir une famille active
- le tableau de bord, les recettes, le calendrier et les courses changent de contexte
- aucune donnee d'une autre famille n'apparait apres changement

### MVP-009 - Lister les membres d'une famille

- Priorite: P0
- Effort: S
- Dependance: MVP-005
- Description: afficher les membres de la famille active.

Criteres d'acceptation:

- la page membres affiche les membres de la famille active
- chaque membre a au minimum un nom visible et un role
- les membres d'autres familles ne sont jamais affiches

### MVP-010 - Inviter un membre a une famille

- Priorite: P0
- Effort: M
- Dependance: MVP-009
- Description: un admin doit pouvoir generer un code d'invitation pour la famille active.

Criteres d'acceptation:

- un admin peut generer un code d'invitation
- l'invitation est rattachee a la bonne famille
- un membre non admin ne peut pas creer d'invitation si cette regle est retenue
- le code a une longueur et une alea suffisants pour eviter les essais faciles

### MVP-011 - Retirer un membre d'une famille

- Priorite: P1
- Effort: M
- Dependance: MVP-009
- Description: un admin peut retirer un membre de la famille active.

Criteres d'acceptation:

- un admin peut retirer un membre
- le membre retire perd l'acces a cette famille
- le retrait n'affecte pas ses autres familles eventuelles

## Epic C - Lieux

### MVP-012 - Creer un lieu

- Priorite: P0
- Effort: S
- Dependance: MVP-005
- Description: permettre de creer un lieu dans la famille active.

Criteres d'acceptation:

- un admin ou membre autorise peut creer un lieu
- le lieu a au minimum un nom
- le lieu apparait dans les selecteurs de recettes, repas et courses

### MVP-013 - Modifier un lieu

- Priorite: P0
- Effort: S
- Dependance: MVP-012
- Description: permettre de renommer ou ajuster un lieu.

Criteres d'acceptation:

- un lieu existant peut etre modifie
- le nouveau nom se propage dans les vues concernees
- la modification reste limitee a la famille active

### MVP-014 - Archiver un lieu

- Priorite: P1
- Effort: M
- Dependance: MVP-012
- Description: permettre de retirer un lieu de l'usage courant sans perdre l'historique.

Criteres d'acceptation:

- un lieu peut etre archive
- un lieu archive n'apparait plus par defaut dans les selecteurs
- les anciens repas et articles lies a ce lieu restent lisibles

### MVP-015 - Definir un lieu par defaut

- Priorite: P1
- Effort: S
- Dependance: MVP-012
- Description: permettre de preselectionner un lieu frequent pour simplifier l'usage.

Criteres d'acceptation:

- un lieu par defaut peut etre defini pour une famille ou un membre selon le choix technique
- ce lieu est preselectionne lors des actions frequentes

## Epic D - Recettes

### MVP-016 - Creer une recette

- Priorite: P0
- Effort: M
- Dependance: MVP-012
- Description: permettre de creer une recette structuree.

Criteres d'acceptation:

- une recette peut etre creee avec titre, ingredients, etapes et portions
- la recette est rattachee a la famille active
- les ingredients sont stockes dans un format structure

### MVP-017 - Modifier une recette

- Priorite: P0
- Effort: M
- Dependance: MVP-016
- Description: permettre d'editer une recette existante.

Criteres d'acceptation:

- une recette existante peut etre modifiee
- les modifications sont visibles dans le detail de recette
- les changements restent confines a la famille active

### MVP-018 - Archiver ou supprimer une recette

- Priorite: P1
- Effort: S
- Dependance: MVP-016
- Description: permettre d'archiver ou de supprimer une recette selon le besoin.

Criteres d'acceptation:

- une recette peut etre archivee
- une recette peut etre supprimee definitivement
- une recette retiree n'apparait plus dans la recherche active
- les repas historiques associes restent lisibles

### MVP-019 - Consulter le detail d'une recette

- Priorite: P0
- Effort: S
- Dependance: MVP-016
- Description: afficher une recette complete.

Criteres d'acceptation:

- le detail affiche titre, ingredients, etapes, temps et portions
- un lien source peut etre visible si renseigne
- l'ecran est lisible sur mobile

### MVP-020 - Rechercher une recette

- Priorite: P1
- Effort: S
- Dependance: MVP-016
- Description: permettre une recherche simple par nom.

Criteres d'acceptation:

- un champ de recherche filtre la liste des recettes
- seuls les resultats de la famille active apparaissent

### MVP-021 - Ajouter les ingredients d'une recette a la liste de courses

- Priorite: P0
- Effort: M
- Dependance: MVP-016, MVP-027
- Description: depuis une recette, ajouter ses ingredients a la liste de courses d'un lieu.

Criteres d'acceptation:

- un bouton permet d'ajouter les ingredients a une liste de courses
- une fenetre de confirmation s'ouvre avant ajout
- l'utilisateur choisit explicitement le lieu cible
- les ingredients sont crees comme articles de courses
- aucun dedoublonnage intelligent complexe n'est requis au MVP

## Epic E - Calendrier repas

### MVP-022 - Afficher le calendrier hebdomadaire

- Priorite: P0
- Effort: M
- Dependance: MVP-005
- Description: fournir une vue semaine des repas planifies.

Criteres d'acceptation:

- la vue semaine affiche les jours de la semaine
- chaque jour permet de distinguer midi et soir
- seuls les repas de la famille active sont visibles

### MVP-023 - Creer un repas planifie

- Priorite: P0
- Effort: M
- Dependance: MVP-022, MVP-012, MVP-016
- Description: ajouter un repas a une date avec moment, lieu et responsable.

Criteres d'acceptation:

- un repas peut etre cree avec date, midi ou soir, lieu et responsable
- le responsable peut etre laisse vide
- le repas peut etre lie a une recette ou a un titre libre
- le repas apparait au bon endroit dans le calendrier

### MVP-024 - Modifier un repas planifie

- Priorite: P0
- Effort: S
- Dependance: MVP-023
- Description: mettre a jour les informations d'un repas.

Criteres d'acceptation:

- un repas planifie peut etre modifie
- les changements de lieu, moment ou responsable sont visibles immediatement

### MVP-025 - Supprimer un repas planifie

- Priorite: P0
- Effort: S
- Dependance: MVP-023
- Description: retirer un repas du calendrier.

Criteres d'acceptation:

- un repas peut etre supprime
- il disparait de la vue semaine

### MVP-026 - Filtrer le calendrier par lieu

- Priorite: P1
- Effort: S
- Dependance: MVP-022
- Description: faciliter la lecture du planning sur plusieurs lieux.

Criteres d'acceptation:

- l'utilisateur peut filtrer la vue calendrier par lieu
- le filtre s'applique uniquement dans la famille active

## Epic F - Liste de courses par lieu

### MVP-027 - Ouvrir la liste de courses d'un lieu

- Priorite: P0
- Effort: M
- Dependance: MVP-012
- Description: la page courses doit fonctionner dans le contexte d'un lieu selectionne.

Criteres d'acceptation:

- un selecteur de lieu est visible sur la page courses
- seuls les articles du lieu actif sont affiches
- il n'y a pas de vue globale melangeant tous les lieux par defaut

### MVP-028 - Ajouter un article de course manuellement

- Priorite: P0
- Effort: S
- Dependance: MVP-027
- Description: ajouter rapidement un article dans le lieu actif.

Criteres d'acceptation:

- un article peut etre cree avec nom, quantite et commentaire optionnel
- l'article est rattache au lieu actif et a la famille active
- l'auteur de creation est conserve

### MVP-029 - Modifier un article de course

- Priorite: P1
- Effort: S
- Dependance: MVP-028
- Description: corriger un article mal saisi.

Criteres d'acceptation:

- un article existant peut etre modifie
- le lieu ne change pas sans action explicite

### MVP-030 - Cocher ou decocher un article achete

- Priorite: P0
- Effort: S
- Dependance: MVP-028
- Description: gerer le statut d'achat.

Criteres d'acceptation:

- un article peut etre marque comme achete
- un article achete peut etre repasse en non achete
- l'auteur de validation peut etre stocke

### MVP-031 - Afficher le contexte minimal de collaboration

- Priorite: P1
- Effort: S
- Dependance: MVP-028, MVP-030
- Description: montrer qui a ajoute ou valide un article.

Criteres d'acceptation:

- la liste peut afficher qui a cree un article
- la liste peut afficher qui l'a coche si disponible

### MVP-032 - Ajouter automatiquement les ingredients d'un repas planifie

- Priorite: P1
- Effort: M
- Dependance: MVP-023, MVP-027, MVP-021
- Description: depuis un repas planifie lie a une recette, envoyer les ingredients dans la liste de courses.

Criteres d'acceptation:

- depuis un repas planifie, une action permet d'ajouter les ingredients associes
- le lieu du repas est propose comme lieu cible par defaut
- les articles ajoutes apparaissent dans la bonne liste de courses

## Epic G - Tableau de bord et navigation metier

### MVP-033 - Afficher le tableau de bord de la famille active

- Priorite: P0
- Effort: M
- Dependance: MVP-022, MVP-027, MVP-016
- Description: fournir une page d'accueil utile apres connexion.

Criteres d'acceptation:

- le tableau de bord affiche la famille active
- il affiche les prochains repas
- il donne acces rapidement aux recettes et aux courses

### MVP-034 - Ajouter des raccourcis d'action rapide

- Priorite: P1
- Effort: S
- Dependance: MVP-033
- Description: accelerer les actions frequentes.

Criteres d'acceptation:

- des boutons d'action rapide existent pour ajouter une recette, un repas ou un article
- ces actions respectent la famille active

## Epic H - Securite, qualite et finition MVP

### MVP-035 - Isoler strictement les donnees par famille

- Priorite: P0
- Effort: L
- Dependance: transversale
- Description: toutes les requetes et vues doivent etre bornees par la famille active et les droits d'acces.

Criteres d'acceptation:

- un utilisateur ne peut lire que les familles dont il est membre
- toutes les entites metier sont rattachees a une famille
- changer de famille active ne fuit aucune donnee entre contextes

### MVP-036 - Rendre les parcours principaux utilisables sur mobile

- Priorite: P0
- Effort: M
- Dependance: transversale
- Description: garantir un usage quotidien confortable sur telephone.

Criteres d'acceptation:

- les parcours auth, calendrier, recettes et courses sont utilisables sur mobile
- aucune action frequente n'est bloquante sur petit ecran

### MVP-037 - Gerer les etats vides des pages metier

- Priorite: P0
- Effort: S
- Dependance: MVP-016, MVP-022, MVP-027, MVP-033
- Description: eviter les pages confuses quand il n'y a encore aucune donnee.

Criteres d'acceptation:

- la page recettes explique comment ajouter une premiere recette
- la page calendrier explique comment planifier un premier repas
- la page courses explique comment choisir un lieu et ajouter un premier article

## 7. Ordre de build recommande

### Vague 1 - Fondations

- MVP-001
- MVP-002
- MVP-003
- MVP-004
- MVP-005
- MVP-008
- MVP-035

### Vague 2 - Familles et lieux

- MVP-006
- MVP-007
- MVP-009
- MVP-010
- MVP-012
- MVP-013

### Vague 3 - Recettes

- MVP-016
- MVP-017
- MVP-019
- MVP-020

### Vague 4 - Planning repas

- MVP-022
- MVP-023
- MVP-024
- MVP-025
- MVP-026

### Vague 5 - Courses

- MVP-027
- MVP-028
- MVP-021
- MVP-030
- MVP-031
- MVP-032

### Vague 6 - Dashboard et finition

- MVP-033
- MVP-034
- MVP-036
- MVP-037

## 8. MVP strict recommande

Si on veut sortir une premiere version rapidement, le noyau minimum a livrer est:

- MVP-001 a MVP-010
- MVP-012 a MVP-013
- MVP-016 a MVP-017
- MVP-019
- MVP-021 a MVP-025
- MVP-027
- MVP-028
- MVP-030
- MVP-033
- MVP-035
- MVP-036
- MVP-037

## 9. Questions restantes pour affiner le backlog
## 9. Suite recommandee

La suite la plus utile apres validation de ce backlog est:

1. transformer ce backlog en schema de base de donnees
2. definir les pages et composants principaux
3. decouper la Vague 1 en tickets techniques
