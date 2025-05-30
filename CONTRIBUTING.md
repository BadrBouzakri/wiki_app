# Contributing to Wiki App

Nous sommes ravis que vous souhaitiez contribuer à Wiki App ! Ce document vous guidera à travers le processus de contribution.

## 🚀 Comment contribuer

### Rapporter des bugs

1. Vérifiez que le bug n'a pas déjà été rapporté dans les [Issues](https://github.com/BadrBouzakri/wiki_app/issues)
2. Créez une nouvelle issue en utilisant le template de bug report
3. Incluez autant de détails que possible :
   - Version de l'application
   - Étapes pour reproduire le bug
   - Comportement attendu vs comportement actuel
   - Screenshots si applicable
   - Logs d'erreur

### Proposer des nouvelles fonctionnalités

1. Créez une issue avec le label "enhancement"
2. Décrivez clairement la fonctionnalité proposée
3. Expliquez pourquoi cette fonctionnalité serait utile
4. Proposez une implémentation si possible

### Soumettre du code

1. **Fork** le repository
2. Créez une **branche** pour votre fonctionnalité : `git checkout -b feature/awesome-feature`
3. **Commitez** vos changements : `git commit -m 'Add awesome feature'`
4. **Push** vers votre branche : `git push origin feature/awesome-feature`
5. Ouvrez une **Pull Request**

## 📋 Prérequis de développement

- Node.js 18+
- PostgreSQL 15+
- Redis 7+
- Elasticsearch 8+
- Docker & Docker Compose (optionnel)

## 🛠️ Configuration de l'environnement de développement

```bash
# Cloner votre fork
git clone https://github.com/VOTRE_USERNAME/wiki_app.git
cd wiki_app

# Installer les dépendances
./scripts/setup.sh

# Démarrer en mode développement
npm run dev
```

## 📝 Standards de code

### Backend (Node.js)

- Utilisez ES6+ avec CommonJS
- Suivez les conventions ESLint
- Documentez les fonctions complexes
- Écrivez des tests pour les nouvelles fonctionnalités

### Frontend (React)

- Utilisez des composants fonctionnels avec hooks
- Suivez les conventions de nommage React
- Utilisez TypeScript pour les nouveaux composants (optionnel)
- Assurez-vous que l'interface est responsive

### Base de données

- Utilisez des migrations pour les changements de schéma
- Documentez les nouvelles tables/colonnes
- Indexez appropriément les requêtes

## 🧪 Tests

```bash
# Tests backend
npm test

# Tests frontend
cd frontend && npm test

# Tests d'intégration
npm run test:integration
```

## 📊 Pull Request Guidelines

### Titre

- Utilisez un titre descriptif
- Préfixez avec le type : `feat:`, `fix:`, `docs:`, `refactor:`
- Exemple : `feat: Add real-time suggestion notifications`

### Description

- Décrivez clairement les changements
- Référencez les issues liées
- Incluez des screenshots pour les changements UI
- Listez les breaking changes s'il y en a

### Checklist

- [ ] Les tests passent
- [ ] Le code suit les standards établis
- [ ] La documentation est mise à jour
- [ ] Les changements sont testés manuellement
- [ ] Les migrations de base de données sont incluses

## 🏗️ Architecture du projet

```
wiki_app/
├── src/
│   ├── server/          # API Backend (Node.js)
│   │   ├── routes/      # Routes API
│   │   ├── services/    # Logique métier
│   │   ├── config/      # Configuration DB/Redis/ES
│   │   └── utils/       # Utilitaires
│   └── agent/           # Agent de surveillance système
├── frontend/            # Application React
│   ├── src/
│   │   ├── components/  # Composants réutilisables
│   │   ├── pages/       # Pages de l'application
│   │   ├── contexts/    # Context API (Auth, Socket, Theme)
│   │   └── hooks/       # Hooks personnalisés
├── scripts/             # Scripts de setup et déploiement
└── docker-compose.yml   # Configuration Docker
```

## 💡 Idées de contributions

### Fonctionnalités prioritaires

- [ ] Intégration Confluence/Notion
- [ ] Application desktop (Electron)
- [ ] Extensions VS Code/Terminal
- [ ] Support mobile (React Native)
- [ ] IA avancée avec GPT
- [ ] Intégration ChatOps (Slack/Teams)

### Améliorations techniques

- [ ] Migration vers TypeScript
- [ ] Tests E2E avec Playwright
- [ ] Performance optimizations
- [ ] Security hardening
- [ ] Monitoring avec Prometheus

## 📞 Support

- 💬 [GitHub Discussions](https://github.com/BadrBouzakri/wiki_app/discussions) pour les questions
- 🐛 [GitHub Issues](https://github.com/BadrBouzakri/wiki_app/issues) pour les bugs
- 📧 Email : contribute@wikiapp.dev

## 🎉 Reconnaissance

Tous les contributeurs seront ajoutés au fichier CONTRIBUTORS.md et mentionnés dans les release notes.

Merci de contribuer à Wiki App ! 🚀