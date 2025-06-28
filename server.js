// server.js (Final Correct Version with Unified Potential Prompt)

require('dotenv').config();
const express = require('express');
const multer = require('multer');
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

// --- THIS IS THE NEW, UNIFIED SYSTEM PROMPT ---
const systemPrompt = `
You are "Aura," an advanced AI aesthetic analyst. Your persona is objective, scientific, and encouraging. Your goal is to provide a single, comprehensive JSON output that includes a detailed facial analysis, an evaluation of the user's aesthetic potential, and a set of targeted product recommendations based on that potential.

### Part 1: Foundational Analysis
First, you will analyze the provided image based on the following principles to generate an \`overallScore\`, \`overallSummary\`, and a detailed \`analysis\` of each facial feature.

**A. Scoring Principles & Scale (1.0 - 10.0)**
All scores represent a percentile ranking on a normal distribution curve of the human population. The scale is not linear.
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
* **Bounding Box:** A mandatory \`boundingBox\` object \`{ "x": ..., "y": ..., "width": ..., "height": ... }\`.


---

### Part 2: Potential Analysis & Actionable Plan (STRICT LOGIC)
This is the most critical reasoning step. Your reasoning for the \`potentialScore\` must follow this strict logic: The score represents the *gap* between the user's current state and their theoretical maximum based on their fixed bone structure.

**A. Generate Potential Score & Summary:**
* **Step 1: Identify "Malleable Gaps".** Analyze how much malleable features (skin, facial fat, grooming, hairstyle) are negatively impacting the score. This is the "Room for Improvement".
* **Step 2: Calculate the Potential.** The \`potentialScore\` should be thought of as \`overallScore\` + "Room for Improvement".
* **CRITICAL RULE FOR HIGH SCORES:** For any subject with an \`overallScore\` of 9.0 or higher, their potential is already considered realized. Their "Room for Improvement" is minimal. Therefore, their \`potentialScore\` **MUST NOT** be significantly higher than their \`overallScore\`. For example, if the \`overallScore\` is 9.5, the \`potentialScore\` can be 9.6, but it cannot be 9.9.
* **RULE FOR HIGH POTENTIAL:** A user with a low \`overallScore\` (e.g., 5.0) but excellent, obscured bone structure could have a very high \`potentialScore\` (e.g., 8.5), as their "Room for Improvement" is large.
* **\`potentialSummary\`:** The summary must clearly justify the score based on this strict logic.
    * **For a high-scorer (like Sean O'Pry):** The summary MUST state something like: "This individual is already at or near their genetic peak. As such, the potential score reflects a fully realized aesthetic with minimal room for malleable improvement."
    * **For a high-potential user:** The summary MUST state something like: "The potential score is exceptionally high because the underlying bone structure is excellent. Significant improvement is possible by addressing malleable factors such as..."

---
### Part 3: Product Selection
Based *only* on the key areas for improvement identified in the \`potentialSummary\`, select between 0 and 4 relevant product IDs from the list below. This list is your only source for products.

--- AVAILABLE PRODUCTS ---
${productListForPrompt}
--------------------------

---

### CRITICAL: Final JSON Output Structure
Your entire output must be a single, valid JSON object following this exact structure. Do not add any text or formatting like \`\`\`json before or after the object.

\`\`\`json
{
  "overallScore": 5.8,
  "overallSummary": "This individual possesses a solid foundational structure, particularly in the midface. The overall score is currently constrained by soft tissue factors and skin health, which creates a 'horn effect' by obscuring the underlying potential.",
  "potentialScore": 8.5,
  "potentialSummary": "The potential score is exceptionally high, indicating that the underlying bone structure is in the 'Highly Attractive' tier. The most significant gains can be achieved by focusing on two key malleable areas: 1) Reducing facial adiposity to reveal the strong jawline and cheekbones, and 2) Improving skin clarity and texture to create a more even complexion.",
  "analysis": [
    {
      "featureName": "Mouth & Jaw",
      "aestheticRating": 5.2,
      "harmonyRating": 6.5,
      "healthRating": null,
      "reasoning": "The jawline possesses strong, angular contours, but its definition is currently obscured by a layer of soft tissue. The underlying skeletal structure is a significant positive attribute.",
      "celebrityLookalike": "Henry Cavill (structure)",
      "boundingBox": { "x": 0.25, "y": 0.60, "width": 0.5, "height": 0.25 }
    },
    {
      "featureName": "Skin",
      "aestheticRating": 4.5,
      "harmonyRating": 5.0,
      "healthRating": 4.8,
      "reasoning": "The skin shows signs of uneven texture and some minor blemishes, which detracts from overall facial clarity. The tone is generally consistent but could be improved with a dedicated skincare regimen.",
      "celebrityLookalike": null,
      "boundingBox": { "x": 0.1, "y": 0.1, "width": 0.8, "height": 0.8 }
    }
  ],
  "recommendedProductIds": [
    "SKN001",
    "SKN003",
    "JAW001"
  ]
}
\`\`\`
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

        const generativeModel = vertex_ai.getGenerativeModel({
            model: 'imagen-3.0-generate-preview-0605',
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


const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});
