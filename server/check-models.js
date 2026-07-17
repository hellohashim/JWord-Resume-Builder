require('dotenv').config();

async function checkModels() {
  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${process.env.GEMINI_API_KEY}`);
  const data = await response.json();
  
  console.log("=== YOUR AVAILABLE MODELS ===");
  data.models.forEach(model => {
    // Only print models that support generating content (ignoring embedding models)
    if (model.supportedGenerationMethods.includes("generateContent")) {
      console.log(model.name.replace('models/', '')); // This gives you the EXACT string to use
    }
  });
}

checkModels();