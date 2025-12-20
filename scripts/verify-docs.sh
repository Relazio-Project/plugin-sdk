#!/bin/bash

# Script di verifica link interni nella documentazione
# Verifica che tutti i file referenziati esistano

echo "🔍 Verifica link interni documentazione..."
echo ""

ERRORS=0

# Files da verificare
FILES_TO_CHECK=(
  "README.md"
  "QUICKSTART.md"
  "CHANGELOG.md"
  "docs/EXTERNAL_PLUGINS_FLOW.md"
  "docs/MULTI_TENANT.md"
  "examples/README.md"
)

# Link che dovrebbero esistere
EXPECTED_FILES=(
  "README.md"
  "QUICKSTART.md"
  "CHANGELOG.md"
  "docs/SDK.md"
  "docs/MULTI_TENANT.md"
  "docs/CONFIGURATION.md"
  "docs/EXTERNAL_PLUGINS.md"
  "docs/EXTERNAL_PLUGINS_FLOW.md"
  "docs/EXTERNAL_PLUGINS_COMPLETE.md"
  "docs/EXTERNAL_PLUGINS_README.md"
  "examples/README.md"
  "examples/multi-tenant-plugin/index.ts"
)

echo "📋 Verifica esistenza file..."
for file in "${EXPECTED_FILES[@]}"; do
  if [ -f "$file" ]; then
    echo "  ✅ $file"
  else
    echo "  ❌ $file - FILE MANCANTE!"
    ERRORS=$((ERRORS + 1))
  fi
done

echo ""
echo "📝 Verifica link interni nei markdown..."

# Funzione per estrarre link markdown [text](path)
check_markdown_links() {
  local file=$1
  echo "  Checking $file..."
  
  # Estrai tutti i link relativi (non http/https)
  grep -oE '\[([^\]]+)\]\(([^)]+)\)' "$file" | grep -v "http" | while read -r link; do
    # Estrai il path dal link
    path=$(echo "$link" | sed -E 's/.*\(([^)]+)\).*/\1/' | sed 's/#.*//')
    
    # Se è un path relativo
    if [[ ! "$path" =~ ^http && -n "$path" ]]; then
      # Risolvi path relativo
      dir=$(dirname "$file")
      if [ "$dir" = "." ]; then
        full_path="$path"
      else
        full_path="$dir/$path"
      fi
      
      # Normalizza path
      full_path=$(echo "$full_path" | sed 's|/\./|/|g')
      
      # Verifica esistenza
      if [ -f "$full_path" ]; then
        echo "    ✅ $path"
      else
        echo "    ⚠️  $path → $full_path potrebbe non esistere"
      fi
    fi
  done
}

for file in "${FILES_TO_CHECK[@]}"; do
  if [ -f "$file" ]; then
    check_markdown_links "$file"
  fi
done

echo ""
echo "🎯 Verifica parole chiave..."

# Verifica che concetti chiave siano presenti
check_keyword() {
  local file=$1
  local keyword=$2
  local description=$3
  
  if grep -q "$keyword" "$file" 2>/dev/null; then
    echo "  ✅ '$description' in $file"
  else
    echo "  ⚠️  '$description' NON trovato in $file"
  fi
}

# Verifica README
check_keyword "README.md" "multiTenant: true" "multiTenant flag"

# Verifica QUICKSTART
check_keyword "QUICKSTART.md" "multiTenant: true" "multiTenant flag"
check_keyword "QUICKSTART.md" "automatico" "Flow automatico"

# Verifica EXTERNAL_PLUGINS_FLOW
check_keyword "docs/EXTERNAL_PLUGINS_FLOW.md" "POST /register" "Endpoint register"
check_keyword "docs/EXTERNAL_PLUGINS_FLOW.md" "100% Automatico" "Flow automatico"

echo ""
if [ $ERRORS -eq 0 ]; then
  echo "✅ Tutti i controlli passati!"
  exit 0
else
  echo "❌ Trovati $ERRORS errori"
  exit 1
fi

