# Pushing this project to GitHub (flybylow/kvasir)

The repo [https://github.com/flybylow/kvasir](https://github.com/flybylow/kvasir) is intended to hold this documentation and any case-related material.

## Option A: Push only the `docs` folder

From your machine, with the `kvasir` workspace (that contains this `docs` folder):

```bash
cd /Users/warddem/dev/kvasir

# If the folder is not yet a git repo:
git init
git add docs/
git commit -m "docs: Kvasir onboarding, quick reference, knowledge base"
git remote add origin https://github.com/flybylow/kvasir.git
git branch -M main
git push -u origin main
```

If the folder is already a git repo but has no remote, add the remote and push:

```bash
cd /Users/warddem/dev/kvasir
git remote add origin https://github.com/flybylow/kvasir.git
git add docs/
git commit -m "docs: Kvasir onboarding and quick reference"   # if there are new/changed files
git push -u origin main
```

## Option B: Push the whole workspace (docs + any other files)

Same as above, but add and commit the files you want (e.g. the whole project, or only `docs` and a top-level README):

```bash
cd /Users/warddem/dev/kvasir
git init
git add docs/ README.md   # add whatever you want to publish
git commit -m "docs: Kvasir onboarding and knowledge base"
git remote add origin https://github.com/flybylow/kvasir.git
git branch -M main
git push -u origin main
```

## Notes

- **Do not** push the full `kvasir-server` clone (that’s from GitLab and may be large); push only what you need for the case (e.g. `docs/` and maybe a short README at repo root).
- If the GitHub repo already has content (e.g. a README created on the web), do a `git pull origin main --rebase` before pushing, or use `git push -u origin main --force` only if you intend to overwrite the remote (use with care).
- To avoid committing secrets or local paths, use a `.gitignore` (e.g. ignore `kvasir-server/` if you only want to publish `docs/`).
