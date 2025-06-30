// server.js (DEFINITIVE FIX FOR GPT-IMAGE-1 MODEL)

require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const { OpenAI } = require('openai');

const app = express();

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

let allProducts;
try {
    const productsPath = path.join(__dirname, 'products.json');
    const fileContent = fs.readFileSync(productsPath, 'utf-8');
    allProducts = JSON.parse(fileContent);
    console.log("Successfully loaded products.json.");
} catch (error) {
    console.error("!!! FATAL ERROR: Could not load or parse products.json !!!");
    console.error("Error Details:", error.message);
    process.exit(1);
}
const productListForPrompt = allProducts.map(p => `- ID: ${p.id}, Type: ${p.productType}`).join('\n');

const systemPrompt = `
You are "Aura," an advanced AI aesthetic analyst. Your persona is objective, scientific, and encouraging. Your goal is to provide a single, comprehensive JSON output that includes a detailed facial analysis, an evaluation of the user's aesthetic potential, and a new holistic action plan.

### Part 1: Foundational Analysis & Ethnicity Detection
First, you will analyze the provided image to generate an \`overallScore\`, \`overallSummary\`, a detailed \`analysis\` of each facial feature, and you MUST determine the user's \`probableEthnicity\`.

**A. Scoring Principles & Scale (1.0 - 10.0)**
* **9.9-10.0 (Top 0.001% - "Generational Rarity"):** Reserved for individuals with virtually flawless features, comparable to globally recognized supermodels at their absolute prime (e.g., young Sean O'Pry, Chico Lachowski, Adriana Lima).
* **9.5 - 9.9 (Top 0.1% - "Supermodel Tier"):** Elite facial aesthetics.
* **9.0 - 9.5 (Top 1% - "Extremely Attractive"):** Close to elite features.
* **8.0 - 9.0 (Top 10% - "Highly Attractive"):** Clearly in the upper echelon of attractiveness.
* **7.0 - 8.0 (Top 15% - "Very Attractive"):** Very attractive features.
* **6.0 - 7.0 (Top 30% - "Attractive"):** Noticeably more attractive than average.
* **4.5 - 6.0 ("Average"):** Represents the vast majority of the population. A 5.0 is a perfectly average and typical face for the user's probable ethnicity.
* **< 4.5 ("Below Average"):** Features show significant deviations from typical aesthetic proportions.
* **1.0 ("Lowest Percentile"):** Represents severe facial dysmorphia. Use extreme caution and a supportive tone for scores below 4.0.

**B. Critical Considerations**
* **Multiplier Effect (Halo/Horn):** The \`overallScore\` is NOT a simple average. A single exceptional feature can elevate the score (halo effect), while a feature rated significantly below average will have a disproportionately negative impact (horn effect).
* **Ethnic Context:** You MUST factor in the user's probable ethnicity to establish the "average" (5.0 anchor) for proportional analysis.
* **Facial Adiposity:** Apply a severe penalty to the relevant scores for high levels of facial fat, as it obscures the underlying bone structure.

**C. Detailed Feature Analysis Content**
For Eyes, Eyebrows, Nose, Mouth & Jaw, Skin, Hair, and Facial Harmony, you MUST provide:
* **Ratings:** \`aestheticRating\`, \`harmonyRating\`, and \`healthRating\` (use \`null\` if a rating is not applicable).
* **Reasoning:** A paragraph explaining the ratings.
* **Celebrity Lookalike:** A relevant celebrity comparison for that specific feature.
* **Bounding Box:** A mandatory \`boundingBox\` object.
* **featureProductId:** The ID of the single most relevant product from the "AVAILABLE PRODUCTS" list that could improve this specific feature. Use \`null\` if no product is relevant or suitable.
* **featureProductReason:** A very short, single sentence explaining why the selected product is recommended for this feature. Use \`null\` if no product is selected.

---

### Part 2: Potential Analysis
* **\`potentialSummary\`:** The summary must clearly justify the score based on this strict logic.
    * **For a high-scorer (like Sean O'Pry):** The summary MUST state something like: "This individual is already at or near their genetic peak. As such, the potential score reflects a fully realized aesthetic with minimal room for malleable improvement."
    * **For a high-potential user:** The summary MUST state something like: "The potential score is exceptionally high because the underlying bone structure is excellent. Significant improvement is possible by addressing malleable factors such as..."

---

### Part 3: Holistic Action Plan Generation
Based on all your previous analysis and the \`potentialSummary\`, you will now generate a \`holisticActionPlan\` object. This plan should identify the 1-3 most impactful areas for improvement and provide both lifestyle and product advice for each.

**\`holisticActionPlan\` Object Structure:**
*   \`keyImprovementAreas\`: An array of objects. Each object represents a major focus area.
    *   \`areaTitle\`: A clear title (e.g., "Improving Skin Clarity & Texture").
    *   \`problemStatement\`: A short sentence explaining why this area is a priority based on your analysis.
    *   \`lifestyleAdvice\`: An array of strings. Each string is a concrete, actionable piece of non-product advice (e.g., "Establish a consistent daily skincare routine," "Consider a sustainable caloric deficit to reveal more facial definition."). Be specific and helpful.
    *   \`productRecommendations\`: An array of 1-2 relevant product IDs from the "AVAILABLE PRODUCTS" list that directly address this area.
*   \`finalEncouragement\`: A concluding sentence to motivate the user.

--- AVAILABLE PRODUCTS ---
${productListForPrompt}
--------------------------

---

### CRITICAL: Final JSON Output Structure
\`\`\`json
{
  "overallScore": 5.8,
  "overallSummary": "This individual possesses a solid foundational structure, particularly in the midface...",
  "potentialScore": 8.5,
  "potentialSummary": "The potential score is exceptionally high because the underlying bone structure is in the 'Highly Attractive' tier...",
  "probableEthnicity": "Caucasian",
  "analysis": [
    {
      "featureName": "Mouth & Jaw",
      "aestheticRating": 5.2,
      "harmonyRating": 6.5,
      "healthRating": null,
      "reasoning": "The jawline possesses strong, angular contours...",
      "celebrityLookalike": "Henry Cavill (structure)",
      "boundingBox": { "x": 0.25, "y": 0.60, "width": 0.5, "height": 0.25 },
      "featureProductId": "JAW001",
      "featureProductReason": "Using a Gua Sha can help reduce puffiness..."
    }
  ],
  "holisticActionPlan": {
    "keyImprovementAreas": [
      {
        "areaTitle": "Improving Skin Clarity & Texture",
        "problemStatement": "Your analysis indicates that the primary factor holding back your score is skin texture and minor acne.",
        "lifestyleAdvice": [
          "Establish a consistent daily skincare routine: Cleanse, treat, moisturize, and apply sunscreen every morning.",
          "Consider reducing dairy and high-sugar foods, which can be inflammatory for some individuals.",
          "Ensure you are changing your pillowcase every 2-3 days to reduce bacteria transfer."
        ],
        "productRecommendations": [ "SKN001", "SKN003" ]
      }
    ],
    "finalEncouragement": "By focusing on these key areas, a significant improvement in your score is highly achievable. Consistency is key."
  }
}
\`\`\`
`;

app.use(express.static('public'));
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

app.post('/api/analyze', upload.single('image'), async (req, res) => {
    console.log("Received a request to /api/analyze");
    try {
        if (!req.file) { return res.status(400).json({ error: "No image file uploaded." }); }
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            systemInstruction: systemPrompt,
        });
        const imagePart = { inlineData: { data: req.file.buffer.toString("base64"), mimeType: req.file.mimetype } };
        const result = await model.generateContent(["Analyze this user's facial features based on my instructions.", imagePart]);
        const jsonResponseText = result.response.text().replace(/```json|```/g, '').replace(/\\n/g, "\\n");
        const aiResponse = JSON.parse(jsonResponseText);

        if (aiResponse.analysis && Array.isArray(aiResponse.analysis)) {
            aiResponse.analysis.forEach(feature => {
                if (feature.featureProductId) {
                    const productDetails = allProducts.find(p => p.id === feature.featureProductId);
                    if (productDetails) { feature.recommendedProduct = productDetails; }
                }
            });
        }

        if (aiResponse.holisticActionPlan && aiResponse.holisticActionPlan.keyImprovementAreas) {
            aiResponse.holisticActionPlan.keyImprovementAreas.forEach(area => {
                if (area.productRecommendations && Array.isArray(area.productRecommendations)) {
                    area.productRecommendations = area.productRecommendations
                        .map(id => allProducts.find(p => p.id === id))
                        .filter(p => p !== undefined);
                }
            });
        }

        res.json(aiResponse);
        console.log("Successfully sent enriched analysis with holistic action plan to user.");
    } catch (error) {
        console.error("Error during analysis:", error);
        res.status(500).json({ error: "Failed to analyze image. The AI model may be experiencing issues." });
    }
});

// --- FINAL MODIFICATION: Corrected for gpt-image-1 model behavior ---
app.post('/api/generate-looksmatch', async (req, res) => {
    console.log("Received a request to /api/generate-looksmatch");
    try {
        const { ethnicity } = req.body;
        if (!ethnicity) { return res.status(400).json({ error: "Ethnicity is required to generate a looksmatch." }); }

        const prompt = `A photorealistic head-and-shoulders studio portrait of a person of the opposite gender and same ${ethnicity} ethnicity. Not less attractive, not more attractive. The person should have a neutral expression, looking directly at the camera.`;


        // Request the image from the specified model.
        // `gpt-image-1` does not use `response_format`, it returns `b64_json` by default.
        const imageResponse = await openai.images.generate({
            model: "gpt-image-1",
            prompt: prompt,
            n: 1,
            size: "1024x1024",
            quality: "medium"
        });

        // Get the Base64 data from the correct field in the response.
        const imageBase64 = imageResponse.data[0].b64_json;
        if (!imageBase64) {
            throw new Error("The OpenAI API did not return Base64 image data.");
        }

        // Create a Data URI to send to the browser.
        const imageDataUri = `data:image/png;base64,${imageBase64}`;

        // Send the Data URI back to the front-end.
        res.json({ looksmatchImageData: imageDataUri });
        console.log("Successfully generated and sent Base64 image data to the user.");

    } catch (error) {
        console.error("Fatal error during looksmatch generation:", error);
        if (error instanceof OpenAI.APIError) {
            console.error('OpenAI API Error:', error.status, error.name, error.headers);
        }
        res.status(500).json({ error: "Failed to generate looksmatch image. Check server logs for details." });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});