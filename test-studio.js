import https from 'https';

// Utilisation du modèle de génération courante pérenne
const MODEL = "gemini-3.5-flash-lite"; 
// Récupérez une clé API gratuite sur https://aistudio.google.com/
const API_KEY = process.env.GEMINI_API_KEY || "VOTRE_CLE_API_AI_STUDIO"; 

console.log("⏳ Test de l'écosystème via Google AI Studio...");

const postData = JSON.stringify({
  contents: [{ parts: [{ text: "Dis: Connexion AI Studio OK" }] }]
});

const options = {
  hostname: 'generativelanguage.googleapis.com',
  port: 443,
  path: `/v1beta/models/${MODEL}:generateContent?key=${API_KEY}`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = https.request(options, (res) => {
  let body = '';
  res.on('data', (chunk) => body += chunk);
  res.on('end', () => {
    console.log(`Statut HTTP Studio : ${res.statusCode}`);
    console.log(body);
  });
});

req.write(postData);
req.end();
