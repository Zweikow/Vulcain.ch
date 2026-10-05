# Règle CI/CD et Git Push

- Chaque `git push` sur `develop` ou `sandbox` déclenche automatiquement un pipeline CI/CD GitLab complet avec déploiement SST sur AWS (environ 2 à 3 minutes).
- **INTERDICTION STRICTE DE PUSH SANS ACCORD** : Ne jamais exécuter de `git push` de manière autonome.
- L'agent peut faire des commits locaux si nécessaire, mais doit **toujours demander et attendre la validation explicite d'Hugo** avant d'exécuter `git push origin ...`.
