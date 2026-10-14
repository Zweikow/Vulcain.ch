# Règle de développement : Branches Feature dédiées

- **Une branche dédiée par feature ou correctif** : Pour toute nouvelle fonctionnalité, amélioration, refactorisation ou correction de bug, créer systématiquement une branche dédiée (ex: `feature/<nom-court>` ou `fix/<nom-court>`).
- **Isolation stricte** : La branche doit concerner UNIQUEMENT le périmètre de la fonctionnalité ou du correctif demandé. Ne pas mélanger plusieurs sujets dans la même branche.
- **Interdiction de commiter directement sur les branches principales** : Ne jamais développer ni commiter directement sur `main` ou `develop`.
- **Merge Requests** : Une fois la branche testée et validée, proposer à l'utilisateur de la pousser sur le dépôt pour créer une Merge Request vers la branche cible.
