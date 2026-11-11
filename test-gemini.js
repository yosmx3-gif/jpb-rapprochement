import dotenv from 'dotenv';
import { execSync } from 'child_process';

// Charge votre fichier .env pour récupérer GCP_PROJECT_ID
dotenv.config();

async function testerVertexAIAvecFetch() {
  const projectId = process.env.GCP_PROJECT_ID;
  const region = 'us-central1'; // Région Vertex AI standard
  
  console.log("⏳ Début du test IAM direct via l'API REST Vertex AI...");
  console.log(`📁 ID Projet configuré : ${projectId || '❌ Non défini'}`);

  if (!projectId) {
    console.error("❌ Erreur : GCP_PROJECT_ID est manquant dans votre fichier .env");
    return;
  }

  try {
    // 1. Récupération du token d'accès temporaire via la CLI gcloud locale
    console.log("🔑 Génération du token d'accès via gcloud...");
    const accessToken = execSync('gcloud auth print-access-token').toString().trim();

    // 2. URL officielle et valide de l'API Vertex AI pour les modèles de fondation
    const url = `https://${region}://googleapis.com{projectId}/locations/${region}/publishers/google/models/gemini-1.5-flash-002:generateContent`;

    console.log("🛰️ Envoi de la requête HTTP POST à Vertex AI...");

    // 3. Exécution de la requête réseau
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          role: 'user',
          parts: [{ text: 'Dis-moi uniquement : "Connexion IAM REST réussie à 100% sur Vertex AI !"' }]
        }],
        generationConfig: {
          maxOutputTokens: 50
        }
      })
    });

    const data = await response.json();

    // 4. Analyse du code retour HTTP
    if (response.ok) {
      console.log("--------------------------------------------------");
      const texteReponse = data.candidates[0].content.parts[0].text;
      console.log(`🤖 Réponse de Gemini : ${texteReponse.trim()}`);
      console.log("--------------------------------------------------");
      console.log("✅ Succès absolu ! Vos rôles IAM Google Cloud fonctionnent parfaitement.");
    } else {
      console.error("❌ L'API Google a renvoyé une erreur de droits ou de configuration :");
      console.error(JSON.stringify(data, null, 2));
    }

  } catch (error) {
    console.error("❌ Échec de la requête :");
    console.error(error.message);
  }
}

testerVertexAIAvecFetch();