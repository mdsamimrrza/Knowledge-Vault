# Commit Message Convention

This project uses Conventional Commits: https://www.conventionalcommits.org

Format: <type>(<scope>): <short description>

Types:
  feat     — new feature
  fix      — bug fix
  refactor — code change that neither fixes a bug nor adds a feature
  test     — adding or updating tests
  docs     — documentation only changes
  chore    — build process, dependency updates, tooling
  security — security-related changes

Examples:
  feat(articles): add wiki-link backlink tracking
  fix(auth): prevent session fixation on login
  security(admin): add entropy check for SESSION_SECRET
  test(auth): add middleware role guard unit tests
  docs(readme): add screenshots and test instructions
  chore(deps): remove react-icons, consolidate to lucide-react
