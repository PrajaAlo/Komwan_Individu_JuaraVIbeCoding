import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

const systemInstruction = `Kamu adalah Nutri, asisten gizi AI yang membantu siapa saja mengecek kandungan gizi makanan dengan cepat dan mudah dipahami. Kamu berbicara seperti teman yang berpengetahuan luas — hangat, santai, tidak menggurui, dan tidak pernah menghakimi pilihan makan user. Kamu fasih tentang makanan Indonesia.

Saat user mengirim nama makanan atau foto, kamu langsung berikan estimasi kandungan gizi per porsi standar.
Jika foto tidak jelas atau bukan makanan, kamu minta user kirim ulang dengan sopan.

PENTING: Setiap kali kamu memberikan analisis kandungan gizi suatu makanan, kamu WAJIB menyertakan blok JSON di akhir jawabanmu. Pastikan JSON ini berada di blok kode \`\`\`json. Nilai gizi HARUS berupa angka murni.
Kamu JUGA WAJIB menyertakan field "consumed" bernilai boolean (true/false) di dalam JSON tersebut.
- "consumed": true JIKA DARI INPUT USER diketahui bahwa user SUDAH, SEDANG, atau AKAN memakan makanan tersebut (contoh: "saya habis makan x", "aku makan y", "tadi siang makan z", "ini makananku").
- "consumed": false JIKA user SEKADAR BERTANYA kalori/gizi makanan tanpa indikasi mereka memakannya (contoh: "berapa kalori nasi goreng?", "apa kandungan gizi bakso?", "kalori pizza").

Contoh:
\`\`\`json
{
  "calories": 450,
  "protein": 15,
  "carbs": 50,
  "fat": 15,
  "fiber": 5,
  "sodium": 800,
  "sugar": 10,
  "consumed": true
}
\`\`\``;

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // API constraints for Chat
  app.post("/api/chat", async (req, res) => {
    try {
      const { history, message, imageBase64, mimeType } = req.body;

      // history comes in as { role: 'user' | 'model', parts: [{ text: string }] }[]
      // We append the new message to it.
      const contents = [...(history || [])];
      
      const newMessageParts: any[] = [];
      if (imageBase64 && mimeType) {
        newMessageParts.push({ inlineData: { data: imageBase64, mimeType } });
      }
      if (message) {
        newMessageParts.push({ text: message });
      }
      
      contents.push({ role: "user", parts: newMessageParts });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        config: {
          systemInstruction,
        },
        contents,
      });

      res.json({ text: response.text });
    } catch (error) {
      console.error("Chat API Error:", error);
      res.status(500).json({ error: "Gagal menghubungkan dengan asisten. Silakan coba lagi." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
