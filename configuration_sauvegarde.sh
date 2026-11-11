#!/bin/bash
# 1. Se placer impérativement dans votre répertoire utilisateur principal
cd /home/yosmx3

# 2. Initialiser un espace de suivi Git entièrement neuf
git init

# 3. Configurer l'identité officielle de l'auteur pour signer les versions
git config --global user.email "yosmx3@gmail.com"
git config --global user.name "yosmx3-gif"

# 4. Poser le bouclier anti-plantage (.gitignore)
# Cela interdit formellement à Git de scanner les 5 000 fichiers système cachés de Google
echo -e ".*\n.config/\n.local/\n.cache/\n.npm/\n.node/\nnode_modules/\n" > .gitignore

# 5. Connecter proprement votre dossier local à la boîte aux lettres sécurisée de GitHub
git remote add origin https://github.com/yosmx3-gif/jpb-rapprochement.git

echo "=== Configuration terminée ! Votre espace est sain et protégé ==="
