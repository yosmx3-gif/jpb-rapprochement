import { execSync } from 'child_process';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

const projectId = "project-d3cc2a84-3208-4d01-bb6";
const region = "europe-west9"; 

console.log(`⏳ Interrogation du catalogue de modèles Vertex AI pour le projet ${projectId} (${region})...`);

try {
  const accessToken = execSync('gcloud auth print-access-token').toString().trim();

  // Configuration de la requête avec l'adresse d'API exacte de Google
  const options = {
    hostname: `${region}-aiplatform.googleapis.com`, // Correction stricte de l'hôte ici
    port: 443,
    path: `/v1/projects/${projectId}/locations/${region}/models`,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  };

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      console.log("--------------------------------------------------");
      console.log(`Statut HTTP reçu : ${res.statusCode}`);
      console.log("--------------------------------------------------");
      
      try {
        const responseJson = JSON.parse(body);
        console.log("=== Liste des modèles disponibles dans votre écosystème ===");
        console.log(JSON.stringify(responseJson, null, 2));
      } catch (err) {
        console.error("❌ Impossible de décoder la structure JSON de la réponse Google.");
        console.log("Réponse brute du serveur :", body);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Échec de la communication réseau : ${e.message}`);
  });

  req.end();

} catch (error) {
  console.error("❌ Impossible de générer le token d'accès gcloud :", error.message);
}
