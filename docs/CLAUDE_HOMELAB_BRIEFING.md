# Claude Homelab Briefing

Ce document sert de mémo de passation pour une autre IA qui doit travailler sur le homelab actuel, depuis le PC Windows de l'utilisateur.

## Contexte rapide

- Hôte Proxmox : `pve`
- IP Proxmox : `192.168.1.106`
- UI Proxmox : `https://192.168.1.106:8006/`
- Domaine public actuel : `tomy111.duckdns.org`
- Reverse proxy public : `CT109` sur `192.168.1.147`
- Tous les CT `100` à `110` sont actuellement `running` et `onboot=1`
- Le poste Windows courant sait déjà faire `ssh root@192.168.1.106` sans demander de mot de passe, donc il y a déjà une clé SSH utilisable sur cette machine

## Méthode d'accès recommandée

Depuis ce PC Windows, la méthode la plus fiable est :

```powershell
ssh root@192.168.1.106
```

Puis, une fois sur l'hôte Proxmox :

```bash
pct list
pct enter 108
```

Remplace `108` par l'ID du conteneur à inspecter.

Cette méthode est préférable au SSH direct vers les CT.

## Règles de prudence

- Ne pas changer les mots de passe sans demande explicite.
- Ne pas casser les URL publiques déjà en production.
- Ne pas toucher au DNS Pi-hole ou aux redirections NAT sans raison.
- Préférer ajouter un nouveau CT pour une nouvelle brique importante plutôt que de mélanger trop de services dans un CT existant.
- Éviter d'exposer de nouveaux services directement sur Internet si un accès local ou via proxy suffit.

## État actuel du nœud Proxmox

- Proxmox : `pve-manager/9.1.6`
- RAM hôte au moment du relevé : `15 GiB total`, `8.8 GiB available`
- Stockage hôte :
  - `/` : `94G`, `56G` libres
  - `/mnt/media` : `1.8T`, `778G` libres
  - `/mnt/storage` : `916G`, `717G` libres

## Inventaire des conteneurs

### CT100 `jellyfin`

- IP : `192.168.1.136`
- Ressources : `2 vCPU`, `2G RAM`, disque `26G`
- Montages :
  - `/mnt/media -> /media`
  - `/mnt/storage -> /storage`
- Usage : serveur média Jellyfin

### CT101 `minecraft`

- IP : `192.168.1.138`
- Ressources : `2 vCPU`, `10G RAM`, disque `16G`
- Usage : Crafty + serveurs Minecraft
- Note :
  - `Crafty` UI locale sur `https://192.168.1.138:8443`
  - Le conteneur a été augmenté pour permettre des serveurs en `-Xmx8G`

### CT102 `fileserver`

- IP : `192.168.1.140`
- Ressources : `1 vCPU`, `512M RAM`, disque `10G`
- Montages :
  - `/mnt/storage -> /storage`
  - `/mnt/media -> /media`
- Usage : File Browser + Samba

### CT103 `jellyseerr`

- IP : `192.168.1.141`
- Ressources : `2 vCPU`, `1G RAM`, disque `8G`
- Usage : Jellyseerr

### CT104 `arrs`

- IP : `192.168.1.142`
- Ressources : `2 vCPU`, `2G RAM`, disque `10G`
- Montages :
  - `/mnt/media -> /media`
  - `/mnt/storage -> /storage`
- Usage : qBittorrent, Radarr, Sonarr, Prowlarr
- Note : CT privilégié (`unprivileged: 0`)

### CT105 `monitoring`

- IP : `192.168.1.143`
- Ressources : `2 vCPU`, `2G RAM`, disque `16G`
- Usage : Grafana / monitoring

### CT106 `dashboard`

- IP : `192.168.1.144`
- Ressources : `512M RAM`, disque `4G`
- Montages lecture seule :
  - `/mnt/media -> /mnt/media`
  - `/mnt/storage -> /mnt/storage`
- Usage : Homepage
- URL locale : `http://192.168.1.144/`
- Important : Homepage est volontairement resté interne seulement, pas publié publiquement

### CT107 `pihole`

- IP : `192.168.1.145`
- Ressources : `512M RAM`, disque `4G`
- Usage : Pi-hole / DNS local
- Important :
  - C'est le DNS principal recommandé du LAN
  - `tomy111.duckdns.org` est surchargé localement vers `192.168.1.147`

### CT108 `webhost`

- IP : `192.168.1.146`
- Ressources : `1 vCPU`, `1G RAM`, disque `8G`
- Usage : hébergement du site web / portfolio
- URL locale : `http://192.168.1.146/`
- Publié via proxy sur `https://tomy111.duckdns.org/`

### CT109 `proxy`

- IP : `192.168.1.147`
- Ressources : `1 vCPU`, `1G RAM`, disque `8G`
- Usage : reverse proxy Caddy + TLS public
- Sert actuellement :
  - `/` -> portfolio
  - `/jellyfin` -> Jellyfin
  - `/files` -> File Browser
  - `/nextcloud` -> Nextcloud

### CT110 `nextcloud`

- IP : `192.168.1.148`
- Ressources : `2 vCPU`, `2G RAM`, disque `16G`
- Montages :
  - `/mnt/storage/nextcloud-data -> /srv/nextcloud-data`
  - `/mnt/media -> /mnt/media` en lecture seule
  - `/mnt/storage/data -> /mnt/data`
- Usage : Nextcloud
- URL publique : `https://tomy111.duckdns.org/nextcloud/`

## Services utiles et URLs

### Accès locaux

- Proxmox : `https://192.168.1.106:8006/`
- Homepage : `http://192.168.1.144/`
- Pi-hole : `http://192.168.1.145/admin`
- Jellyfin : `http://192.168.1.136:8096/`
- File Browser : `http://192.168.1.140:8080/`
- Nextcloud : `http://192.168.1.148/nextcloud/`
- Crafty : `https://192.168.1.138:8443`

### Accès publics actuels

- Portfolio : `https://tomy111.duckdns.org/`
- Jellyfin : `https://tomy111.duckdns.org/jellyfin`
- Files : `https://tomy111.duckdns.org/files/`
- Nextcloud : `https://tomy111.duckdns.org/nextcloud/`

## Particularités réseau importantes

- En local, `tomy111.duckdns.org` résout via Pi-hole vers `192.168.1.147`, c'est-à-dire le proxy web.
- Du coup, ce nom n'est pas fiable pour Minecraft depuis le LAN.
- Pour Minecraft :
  - en local : `192.168.1.138:25565`
  - depuis l'extérieur : `tomy111.duckdns.org:25565`

## Où placer une nouvelle base de données

### Recommandation

Le choix le plus propre pour une nouvelle application web est :

- créer un nouveau CT dédié à l'application, ou un CT dédié à la base de données si l'application est déjà ailleurs
- ne pas installer la base de données dans `CT109 proxy`
- éviter de la coller dans `CT108 webhost` si l'application va grossir

### Option recommandée pour ce homelab

Créer un nouveau CT dédié, par exemple :

- `CT111`
- nom : `appdb` ou le nom du projet
- IP suggérée : `192.168.1.149`
- OS : Debian
- ressources de départ :
  - `2 vCPU`
  - `2G à 4G RAM`
  - disque `8G à 20G` selon le projet

Puis :

- PostgreSQL si l'application est moderne et nouvelle
- MariaDB/MySQL seulement si le projet en a explicitement besoin

### Où stocker les données

Deux stratégies raisonnables :

- simple : garder le volume DB dans le disque du CT sur `local-lvm`
- plus durable : monter un chemin dédié depuis `/mnt/storage`, par exemple :
  - hôte : `/mnt/storage/databases/<nom-projet>`
  - dans le CT : `/var/lib/postgresql` ou un autre chemin de data

Pour un nouveau projet, je recommande plutôt :

- d'abord un CT DB dédié avec disque local-lvm
- puis migration vers `/mnt/storage` seulement si la taille devient un vrai sujet

## Commandes de base utiles

### Voir les CT

```bash
pct list
```

### Entrer dans un CT

```bash
pct enter 110
```

### Voir la config d'un CT

```bash
pct config 110
```

### Redémarrer un CT

```bash
pct restart 110
```

### Vérifier l'IP réelle d'un CT

```bash
pct exec 110 -- hostname -I
```

## Fichiers de contexte déjà présents sur le PC

- [HOMELAB_INITIALISATION_PLAN.md](C:/Users/jtoma/Downloads/HOMELAB_INITIALISATION_PLAN.md)
- [HOMELAB_MASTERPLAN_PROXY_SSO.md](C:/Users/jtoma/Downloads/HOMELAB_MASTERPLAN_PROXY_SSO.md)
- [MANUAL_ACCESS_GUIDE.md](C:/Users/jtoma/Downloads/MANUAL_ACCESS_GUIDE.md)
- [NEXTCLOUD_ACCESS.md](C:/Users/jtoma/Downloads/NEXTCLOUD_ACCESS.md)

## Consigne finale pour l'autre IA

Si l'objectif est de déployer une nouvelle application web avec base de données sur ce homelab :

1. se connecter d'abord à `root@192.168.1.106`
2. ne pas modifier les CT existants sans nécessité
3. préférer créer un nouveau CT dédié pour l'application et/ou la base de données
4. publier publiquement seulement via `CT109` si un accès externe est nécessaire
5. garder `Homepage`, `Pi-hole` et l'administration sensibles en local uniquement
