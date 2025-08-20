# Computed CSS Inspector (Chrome Extension)

Golden baseline (starter branch):
- Hover **OFF** by default
- Popup selector + Enter
- Cyan/magenta placeholder JSON
- Synthwave theme + icons

## Load in Chrome
1. `git clone <your-repo> && cd computed-css-inspector`
2. Chrome → `chrome://extensions` → Enable **Developer mode** → **Load unpacked** → select `src/`

## Build a zip locally
```bash
./scripts/package-zip.sh
```

## Branching
```bash
git checkout -b playground
# edit files in src/
git commit -am "playground: change"
git push -u origin playground
```

## Releases
- Bump `version` in `src/manifest.json`
- Tag and push:
```bash
git commit -am "vX.Y.Z"
git tag vX.Y.Z
git push && git push --tags
```
GitHub Actions will create a Release with the zip attached.
