# Wiki App - Base de Connaissances Contextuelle

🧠 **Wiki intelligent qui suggère automatiquement la documentation pertinente basée sur vos activités DevOps**

## 🌟 Fonctionnalités

- **🔍 Détection Contextuelle Automatique** : Surveille vos commandes, fichiers, processus et logs
- **🤖 Moteur de Suggestions IA** : Propose la documentation pertinente en temps réel
- **📊 Interface Web Intuitive** : Dashboard centralisé pour gérer votre base de connaissances
- **🔄 Synchronisation Multi-Sources** : Intégration avec Confluence, Notion, GitBook
- **📈 Analytics & Feedback** : Amélioration continue basée sur vos retours

## 🏗️ Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Agent de      │───▶│   API Server     │───▶│   Frontend      │
│   Surveillance  │    │   (Node.js)      │    │   (React)       │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Système de    │    │   Base de        │    │   Elasticsearch │
│   Fichiers      │    │   Données        │    │   (Recherche)   │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🚀 Installation Rapide

### Avec Docker (Recommandé)

```bash
# Cloner le repository
git clone https://github.com/BadrBouzakri/wiki_app.git
cd wiki_app

# Copier la configuration d'environnement
cp .env.example .env

# Ajuster les variables d'environnement dans .env
vim .env

# Lancer l'application complète
docker-compose up -d

# Vérifier que tous les services sont en cours d'exécution
docker-compose ps
```

## 🎯 Cas d'Usage

### Scénario 1 : Debugging Kubernetes
- **Détection** : `kubectl get pods --all-namespaces` + logs d'erreur
- **Suggestion** : Runbook "Troubleshooting Pod CrashLoopBackOff"

### Scénario 2 : Déploiement Terraform
- **Détection** : `terraform plan` dans un répertoire spécifique
- **Suggestion** : Checklist pré-déploiement, documentation des modules

### Scénario 3 : Incident Production
- **Détection** : Erreurs 5xx dans les logs + commandes de monitoring
- **Suggestion** : Procédure d'incident, contacts on-call, dashboard monitoring

---

⭐ **N'oubliez pas de donner une étoile au projet si il vous aide !**

🚀 **Développé avec ❤️ pour la communauté DevOps**