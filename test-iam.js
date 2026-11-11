import { execSync } from 'child_process';
import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

const projectId = "project-d3cc2a84-3208-4d01-bb6";
const region = "europe-west9"; // Région Europe (Paris)
const MODEL = "gemini-3.8-flash"; // OU "gemini-3.5-flash"

console.log(`⏳ Exécution de l'appel Vertex AI Gemini sur la région ${region}...`);

try {
  // 1. Récupération du jeton d'accès IAM
  const accessToken = execSync('gcloud auth print-access-token').toString().trim();

  // 2. Configuration du payload JSON requis par Google
  const postData = JSON.stringify({
    contents: [{
      role: 'user',
      parts: [{ text: 'Dis-moi uniquement : Connexion IAM OK' }]
    }]
  });

  // 3. Paramétrage exact et strict de la requête HTTPS (Correction de l'hôte ici)
  const options = {
    hostname: `${region}-aiplatform.googleapis.com`,
    port: 443,
    path: `/v1/projects/${projectId}/locations/${region}/publishers/google/models/${MODEL}:generateContent`,
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json; charset=utf-8',
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  // 4. Exécution de l'appel vers Vertex AI
  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      console.log("--------------------------------------------------");
      try {
        const responseJson = JSON.parse(body);
        
        if (res.statusCode === 200) {
          // Structure exacte du tableau de réponse Vertex AI
          const text = responseJson.candidates[0].content.parts[0].text;
          console.log(`🤖 Réponse de Gemini : ${text.trim()}`);
          console.log("--------------------------------------------------");
          console.log("✅ Succès absolu ! Vos privilèges IAM et vos API sont 100% validés en Europe.");
        } else {
          console.log(`❌ Erreur retournée par Google (Statut ${res.statusCode}) :`);
          console.log(JSON.stringify(responseJson, null, 2));
        }
      } catch (err) {
        console.error("❌ Impossible de décoder la structure JSON de la réponse.");
        console.log(body);
      }
    });
  });

  req.on('error', (e) => {
    console.error(`❌ Échec de la communication réseau : ${e.message}`);
  });

  req.write(postData);
  req.end();

} catch (error) {
  console.error("❌ Impossible de générer le token d'accès :", error.message);
}

