#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SRC_DIR="$ROOT_DIR/src"
OUT_DIR="$ROOT_DIR/dist"
ZIP_NAME="computed-css-inspector.zip"

mkdir -p "$OUT_DIR"
rm -f "$OUT_DIR/$ZIP_NAME"
( cd "$SRC_DIR" && zip -r "$OUT_DIR/$ZIP_NAME" . >/dev/null )
echo "Built: $OUT_DIR/$ZIP_NAME"
