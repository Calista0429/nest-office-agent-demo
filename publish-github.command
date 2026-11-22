#!/bin/zsh
# Run from a normal terminal with an authenticated GitHub CLI.
# Captures the real UI before creating/pushing the private repository.
set -euo pipefail
cd "$(dirname "$0")"
repo='Calista0429/nest-office-agent-demo'
for tool in node npm git gh; do
  command -v "$tool" >/dev/null || { print -u2 "Required tool not found: $tool"; exit 1; }
done
login=$(gh api user --jq .login)
if [[ "$login" != 'Calista0429' ]]; then
  print -u2 "Expected Calista0429. Current GitHub account: $login"
  exit 1
fi
npm install
npm run build
npm test
npx playwright-core install chromium
npm run screenshots
# Use an existing private repository only if its remote is already the intended one.
if gh repo view "$repo" --json isPrivate >/dev/null 2>&1; then
  [[ "$(gh repo view "$repo" --json isPrivate --jq .isPrivate)" == 'true' ]] || { print -u2 'The existing repository is public; stopping without changing it.'; exit 1; }
else
  gh repo create "$repo" --private --description 'Japanese / English office seat booking agent demo with an interactive floor plan' --disable-wiki
fi
expected="https://github.com/$repo.git"
if git remote get-url origin >/dev/null 2>&1; then
  [[ "$(git remote get-url origin)" == "$expected" ]] || { print -u2 'Origin points elsewhere; stopping without changing it.'; exit 1; }
else
  git remote add origin "$expected"
fi
git add .gitignore .github README.md README.en.md app docs drizzle index.html lib local-db.mjs package.json public scripts server.mjs start-demo.command publish-github.command tsconfig.json tests
[[ ! -f package-lock.json ]] || git add package-lock.json
if ! git diff --cached --quiet; then
  git commit -m 'Add Japanese and English office booking demo, architecture and use-case screenshots'
fi
# A normal push rejects unexpected remote history; never force-push.
git push -u origin HEAD:main
print "Published: https://github.com/$repo"
