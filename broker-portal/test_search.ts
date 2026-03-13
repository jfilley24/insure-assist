import { VertexAI } from '@google-cloud/vertexai';

async function testSearchContent() {
    const vertexAI = new VertexAI({ project: 'insure-assist-dev', location: 'us-central1' });
    const model = 'gemini-2.5-flash';
    const searchModel = vertexAI.preview.getGenerativeModel({
        model: model,
        tools: [{ googleSearch: {} } as any]
    });

    const searchPrompt = `Use Google Search to find the primary Property and Casualty 5-digit NAIC code for the insurance carrier: "GEICO" (or "GEICO General Insurance Company"). 
    If they have multiple subsidiaries, provide the main or most common NAIC code for Property and Casualty insurance, avoiding niche subsidiaries like Marine.
    
    You MAY write out your reasoning, thought process, and search results. But you MUST wrap your final 5-digit NAIC code in XML tags like this: <naic>12345</naic>. If you cannot find a 5-digit NAIC code, output <naic>null</naic>.`;

    try {
        const result = await searchModel.generateContent(searchPrompt);
        const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text || "";
        console.log("Raw Response:", text);
        
        const match = text.match(/<naic>(\d{5}|null)<\/naic>/i);
        console.log("Extracted NAIC:", match ? match[1] : "No match found");
    } catch (e) {
        console.error("Error:", e);
    }
}

testSearchContent();
