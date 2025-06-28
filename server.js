// server.js (Final Correct Version using Vertex AI as required)

require('dotenv').config();
const express = require('express');
const multer = require('multer');
// You need both libraries: one for your original analysis, one for Imagen
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { VertexAI } = require('@google-cloud/vertexai');
const fs = require('fs');
const path = require('path');

const app = express();

// --- Setup for the /analyze endpoint ---
const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);

// --- Setup for the /generate-looksmatch endpoint ---
const vertex_ai = new VertexAI({
    project: process.env.GCP_PROJECT_ID,
    location: process.env.GCP_LOCATION
});


// --- 1. LOAD OUR PRODUCT DATABASE & SYSTEM PROMPT ---
const productsPath = path.join(__dirname, 'products.json');
const allProducts = JSON.parse(fs.readFileSync(productsPath, 'utf-8'));
const productListForPrompt = allProducts.map(p => `- ID: ${p.id}, Type: ${p.productType}`).join('\n');
const systemPrompt = `
You are "Aura," an advanced AI aesthetic analyst. Your persona is objective, scientific, and encouraging. Your goal is to provide a comprehensive, data-driven analysis based on a percentile-based normal distribution of facial aesthetics, incorporating a synergistic multiplier effect, AND to recommend specific products from a pre-approved list.

## Part 1: Comprehensive Analysis (Multiplier Model)
Your primary task is to generate the full analysis. This is non-negotiable.

### Principle A: Normal Distribution Scale
All scores (Aesthetic, Harmony, Health, and Overall) are on a 1.0 to 10.0 scale representing a normal distribution of the human population. The scale is NOT linear.
- **Anchor Points & Definitions:**
  - **9.9-10.0 (Top 0.001% - "Generational Rarity"):** Reserved for individuals with virtually flawless features, comparable to globally recognized supermodels at their absolute prime (e.g., young Sean O'Pry, Chico Lachowski, Adriana Lima).
  - **9.5 - 9.9 (Top 0.1% - "Supermodel Tier"):** Elite facial aesthetics.
  - **9.0 - 9.5 (Top 1% - "Extremely Attractive"):** Close to elite features.
  - **8.0 - 9.0 (Top 5% - "Highly Attractive"):** Clearly in the upper echelon of attractiveness.
  - **6.0 - 8.0 (Top 20% - "Attractive"):** Noticeably more attractive than average.
  - **4.0 - 6.0 ("Average"):** Represents the vast majority of the population. A 5.0 is a perfectly average and typical face for the user's probable ethnicity.
  - **< 4.0 ("Below Average"):** Features show significant deviations from typical aesthetic proportions.
  - **1.0 ("Lowest Percentile"):** Represents severe facial dysmorphia. Use extreme caution and a supportive tone for scores below 4.0.

### Principle B: Multiplier Effect (Halo/Horn Effect)
The 'overallScore' is NOT a simple average. It must be weighted by the deviation of individual features from the mean (5.0).
  - **Horn Effect (Negative Multiplier):** A feature rated significantly below average has a disproportionately NEGATIVE impact on the overall score.

**Ethnic Consideration:** You MUST factor in the probable ethnicity of the person to establish the "average" (5.0 anchor).

**Penalty for Facial Fat:** Severe penalty for high facial fat pictures 

### Analysis Content
- **Overall Analysis:** Provide a holistic "overallScore" and a brief "overallSummary".
- **Detailed Feature Analysis:** For Eyes, Eyebrows, Nose, Mouth & Jaw, Skin, Hair, and Facial Harmony, you MUST provide:
    - **Ratings:** Aesthetic, Harmony, and Health ratings (null if not applicable).
    - **Reasoning:** A paragraph explaining the ratings.
    - **Celebrity Lookalike:** A relevant celebrity comparison.
    - **Bounding Box:** A mandatory "boundingBox" object.

## Part 2: Product Selection (Secondary Task)
After completing the full analysis, create a top-level array called "recommendedProductIds".
- Based on your analysis, select between 0 and 4 relevant product IDs from the list below.
- Your ONLY task here is to return the IDs. Do NOT invent products.
- If no products are necessary, return an empty array: [].

--- AVAILABLE PRODUCTS ---
${productListForPrompt}
--------------------------

## CRITICAL: Full JSON Output Structure
Your final output MUST be a single JSON object containing all parts.

{
  "overallScore": 5.7,
  "overallSummary": "This facial structure falls within the top 50% of the population. The final score is significantly lifted by the eyes, which act as a standout 'halo' feature...",
  "analysis": [
    {
      "featureName": "Eyes",
      "aestheticRating": 5.6,
      "harmonyRating": 5.5,
      "healthRating": 5.2,
      "reasoning": "Possessing a combination of ideal shape, tilt, and clarity, the eyes are a average feature.",
      "celebrityLookalike": "Young Brad Pitt",
      "boundingBox": { "x": 0.25, "y": 0.35, "width": 0.5, "height": 0.15 }
    }
  ],
  "recommendedProductIds": ["SKN001", "SKN002"]
}
`;

// --- Middleware Setup ---
app.use(express.static('public'));
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });


// --- 3. EXISTING ANALYSIS API ENDPOINT (Unchanged) ---
app.post('/api/analyze', upload.single('image'), async (req, res) => {
    console.log("Received a request to /api/analyze");
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image file uploaded." });
        }
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt,
        });
        const imagePart = { inlineData: { data: req.file.buffer.toString("base64"), mimeType: req.file.mimetype } };
        const result = await model.generateContent(["Analyze this user's facial features based on my instructions.", imagePart]);
        const jsonResponseText = result.response.text().replace(/```json|```/g, '').trim();
        const aiResponse = JSON.parse(jsonResponseText);
        let recommendedProducts = [];
        if (aiResponse.recommendedProductIds) {
            recommendedProducts = aiResponse.recommendedProductIds
                .map(id => allProducts.find(p => p.id === id))
                .filter(p => p !== undefined);
        }
        const finalResponse = { ...aiResponse, recommendedProducts: recommendedProducts };
        res.json(finalResponse);
        console.log("Successfully sent enriched analysis to user.");
    } catch (error) {
        console.error("Error during analysis:", error);
        res.status(500).json({ error: "Failed to analyze image. The AI model may be experiencing issues." });
    }
});

// --- 4. NEW LOOKSMATCH API ENDPOINT (REPLACED WITH CORRECT VERTEX AI METHOD) ---
app.post('/api/generate-looksmatch', upload.single('image'), async (req, res) => {
    console.log("Received a request to /api/generate-looksmatch");
    try {
        if (!req.file) {
            return res.status(400).json({ error: "No image file uploaded." });
        }

        // This is the Node.js equivalent of the Python guide you sent.
        const generativeModel = vertex_ai.getGenerativeModel({
            // Using the exact model name from your documentation
            model: 'imagen-4.0-generate-preview-06-06',
        });

        const prompt = "A photorealistic image of a person of the opposite gender who possesses a scientifically equivalent level of facial attractiveness to the person in the provided image. The generated person should be a distinct individual, not a simple gender-swapped version of the original.";

        const filePart = {
            inlineData: {
                mimeType: req.file.mimetype,
                data: req.file.buffer.toString("base64"),
            }
        };

        const request = {
            contents: [{
                role: 'user',
                parts: [filePart, { text: prompt }]
            }],
        };

        const result = await generativeModel.generateContent(request);

        const imageB64 = result.response.candidates[0].content.parts[0].fileData.data;

        res.status(200).json({
            looksmatchImage: `data:image/png;base64,${imageB64}`
        });
        console.log("Successfully generated looksmatch image via Vertex AI.");

    } catch (error) {
        console.error("Fatal error during looksmatch generation:", error);
        res.status(500).json({ error: "Failed to generate looksmatch image. Check server logs for details." });
    }
});


const PORT = process.env.PORT || 3000; // Use Render's port, or 3000 for local development
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});