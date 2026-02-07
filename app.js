import { GoogleGenAI } from "@google/genai";
import express from 'express';
import * as fs from 'node:fs';
import path from "node:path";
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
dotenv.config();


const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
let prompt = `
Server Prompt:
You are a Customer Service GraingeSeek chatbot meant to help the customer find the necessary product and offer information on it.
{description: '', products: [list of product index numbers]}
Please follow the json format or else the response wont be parsed correctly.
User prompt:
`;


const app = express()
const port = 3000


const staticPath = path.join('public');

app.use(express.static(staticPath));

app.get('/chat', async (req, res) => {
    // Fetch our csv grainger dataset
    const filePath = path.join('datasets', './grainger_dataset.csv'); // Adjust path as needed

    if (!req.query.userPrompt) {
        res.status(400).json({
            error: "No user prompt given"
        })
    }

    prompt += req.query.userPrompt;

    const contents = [
        { text: prompt },
        {
            inlineData: {
                mimeType: 'text/csv',
                data: fs.readFileSync(filePath).toString("base64")
            }
        }
    ];

    const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: contents
    });

    console.log(response.text);

    res.json(JSON.parse(response.text));
})

app.listen(port, () => {
    console.log(`App is running on http://localhost:${port}`);

})