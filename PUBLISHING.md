# Test e Pubblicazione SDK

## 🧪 Test Offline (Prima di Pubblicare)

### Opzione 1: npm link (Consigliata)

```bash
# 1. Build dell'SDK
cd relazio-plugin-sdk
npm run build

# 2. Crea link globale
npm link

# 3. Nel plugin example, usa il link
cd ../relazio-plugin-example
npm link @relazio/plugin-sdk

# Ora puoi usare l'SDK come se fosse installato da npm!
npm run dev
```

**Vantaggi**:
- Riflette le modifiche in tempo reale
- Testa l'SDK esattamente come sarà su npm
- Facile da rimuovere: `npm unlink @relazio/plugin-sdk`

### Opzione 2: Installazione Locale (file:)

Già fatto nel package.json:

```json
{
  "dependencies": {
    "@relazio/plugin-sdk": "file:../relazio-plugin-sdk"
  }
}
```

```bash
cd relazio-plugin-example
npm install
npm run dev
```

**Vantaggi**:
- Non serve npm link
- Funziona anche senza build (se usi TypeScript paths)

### Opzione 3: workspace npm (Per sviluppo a lungo termine)

Crea `package.json` nella root del progetto:

```json
{
  "private": true,
  "workspaces": [
    "relazio-plugin-sdk",
    "relazio-plugin-example"
  ]
}
```

```bash
cd /Users/ross/Projects/relazio-project
npm install
cd relazio-plugin-example
npm run dev
```

---

## 📦 Pubblicazione su npm

### 1. Prepara l'SDK

```bash
cd relazio-plugin-sdk

# Verifica che package.json sia corretto
cat package.json
```

Controlla questi campi:

```json
{
  "name": "@relazio/plugin-sdk",
  "version": "1.0.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": [
    "dist",
    "README.md",
    "LICENSE"
  ],
  "publishConfig": {
    "access": "public"
  }
}
```

### 2. Build e Test

```bash
# Build
npm run build

# Verifica che dist/ sia popolato
ls -la dist/

# Test (se hai test)
npm test

# Controlla cosa verrà pubblicato
npm pack --dry-run
```

### 3. Login su npm

```bash
# Prima volta
npm login

# Inserisci:
# - Username
# - Password
# - Email
# - OTP (se hai 2FA)
```

### 4. Pubblica

```bash
# Prima pubblicazione
npm publish --access public

# Oppure per scoped package
npm publish
```

### 5. Verifica

```bash
# Controlla su npm
npm view @relazio/plugin-sdk

# Prova installazione
cd /tmp
mkdir test-install
cd test-install
npm init -y
npm install @relazio/plugin-sdk
```

---

## 🔄 Workflow Consigliato

### Durante Sviluppo (ADESSO)

```bash
# Terminal 1: SDK
cd relazio-plugin-sdk
npm run build -- --watch  # rebuild automatico

# Terminal 2: Plugin Example  
cd relazio-plugin-example
npm link @relazio/plugin-sdk
npm run dev
```

### Prima di Pubblicare

```bash
cd relazio-plugin-sdk

# 1. Update version
npm version patch  # 1.0.0 -> 1.0.1
# oppure
npm version minor  # 1.0.0 -> 1.1.0
# oppure  
npm version major  # 1.0.0 -> 2.0.0

# 2. Build
npm run build

# 3. Test l'esempio
cd ../relazio-plugin-example
npm run build
npm start  # Verifica che funzioni

# 4. Pubblica SDK
cd ../relazio-plugin-sdk
npm publish

# 5. Update esempio per usare versione npm
cd ../relazio-plugin-example
npm unlink @relazio/plugin-sdk
npm install @relazio/plugin-sdk@latest
```

---

## 📋 Checklist Pre-Pubblicazione

### SDK

- [ ] README.md completo
- [ ] LICENSE presente
- [ ] CHANGELOG.md aggiornato
- [ ] Tests passano (se presenti)
- [ ] Build pulito senza errori
- [ ] Types (.d.ts) generati correttamente
- [ ] package.json ha tutti i campi (keywords, repository, etc.)
- [ ] .npmignore configurato (o usa "files" in package.json)

### Test Locali

- [ ] `npm link` funziona
- [ ] Plugin example si avvia senza errori
- [ ] Endpoint /manifest.json risponde
- [ ] Endpoint /register funziona
- [ ] Transform sincrone funzionano
- [ ] Transform asincrone funzionano con webhook
- [ ] Multi-tenant con 2+ org funziona

---

## 🚨 Note Importanti

### Nome Package

Se `@relazio` è un'organizzazione npm, devi:

1. **Creare l'org su npm**:
   ```bash
   npm login
   # Su npmjs.com, vai su: Add Organization
   ```

2. **Oppure usa nome senza scope**:
   ```json
   {
     "name": "relazio-plugin-sdk"
   }
   ```

### Versioning

Segui [Semantic Versioning](https://semver.org/):

- **PATCH** (1.0.x): Bug fixes
- **MINOR** (1.x.0): Nuove features (backward compatible)
- **MAJOR** (x.0.0): Breaking changes

### .npmignore

Crea `.npmignore` per escludere file non necessari:

```
src/
test/
*.test.ts
.env
.env.*
node_modules/
tsconfig.json
vitest.config.ts
```

---

## 🎯 Quick Start (Test Offline ADESSO)

```bash
# 1. Build SDK
cd /Users/ross/Projects/relazio-project/relazio-plugin-sdk
npm run build

# 2. Link SDK
npm link

# 3. Usa SDK nell'esempio
cd /Users/ross/Projects/relazio-project/relazio-plugin-example

# 4. Rinomina file per usare versione SDK
mv src/index.ts src/index-old.ts
mv src/index-new.ts src/index.ts

# 5. Link e installa
npm link @relazio/plugin-sdk
npm install

# 6. Avvia!
npm run dev

# Dovresti vedere:
# ✅ Plugin "IP Lookup Plugin" running on port 3000
#    - Mode: Multi-tenant
#    - Transforms: 2
```

Vuoi che ti aiuti a configurare npm link adesso per testare?

