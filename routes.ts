import type { Express } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import OpenAI from "openai";

// Initialize OpenAI client
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {

  app.get(api.chat.history.path, async (req, res) => {
    const sessionId = req.params.sessionId;
    const chats = await storage.getChats(sessionId);
    res.json(chats);
  });

  app.post(api.chat.send.path, async (req, res) => {
    try {
      const input = api.chat.send.input.parse(req.body);
      const { sessionId, text, image } = input;

      // 1. Save User Message
      await storage.createChat({
        sessionId,
        role: 'user',
        type: 'text',
        content: text || '',
        imageUrl: image,
        metadata: {},
      });

      // 2. Build Context for OpenAI
      const history = await storage.getChats(sessionId);
      const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
        {
          role: "system",
          content: `You are a helpful and enthusiastic assistant for kids who want to build things (Maker Helper).
Your goal is to help them clarify what they want to make, and then provide a YouTube video tutorial.

Protocol:
1. If the user's goal is unclear, ask a clarifying question with 3 simple choices.
2. If the user's goal is clear, provide a relevant YouTube video ID and 1-2 alternates.
3. Keep language simple, encouraging, and safe for kids.

Output JSON format:
{
  "type": "clarify" | "video" | "text",
  "say": "Message to speak/show to the user",
  "question": "Clarifying question (only for 'clarify')",
  "choices": ["Choice 1", "Choice 2", "Choice 3"] (only for 'clarify'),
  "video": { "videoId": "...", "title": "...", "startSeconds": 0, "why": "..." } (only for 'video'),
  "alternates": [{ "videoId": "...", "title": "..." }] (only for 'video')
}

For videos, try to find REAL YouTube video IDs that would be relevant. 
If you can't find a real one, use a placeholder or describe what to search for.
Common IDs: 'dQw4w9WgXcQ' (Rick Roll - avoid this), 'J---aiyznGQ' (Keyboard Cat).
Try to predict a valid ID or use a known educational channel's video ID if you know one.
For 'robot', you might use 'h1J-w3-U63g' (Simple cardboard robot) or similar.
`
        }
      ];

      // Add history
      for (const msg of history) {
        if (msg.role === 'user') {
          const content: OpenAI.Chat.Completions.ChatCompletionContentPart[] = [];
          if (msg.content) content.push({ type: "text", text: msg.content });
          if (msg.imageUrl) content.push({ type: "image_url", image_url: { url: msg.imageUrl } });
          messages.push({ role: "user", content: content as any });
        } else {
          // Assistant messages are stored as structured content in DB, but we feed them back as text JSON or simplified text
           messages.push({ role: "assistant", content: JSON.stringify(msg.metadata) }); 
        }
      }

      // 3. Call OpenAI
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        response_format: { type: "json_object" },
      });

      const aiContent = response.choices[0].message.content || "{}";
      let aiData;
      try {
        aiData = JSON.parse(aiContent);
      } catch (e) {
        aiData = { type: 'text', say: "I'm not sure, but that sounds cool!" };
      }

      // 4. Save Assistant Message
      const assistantChat = await storage.createChat({
        sessionId,
        role: 'assistant',
        type: aiData.type || 'text',
        content: aiData.say || '',
        metadata: aiData,
      });

      res.json(assistantChat);

    } catch (err) {
      console.error(err);
      if (err instanceof z.ZodError) {
        res.status(400).json({ message: "Invalid input" });
      } else {
        res.status(500).json({ message: "Internal server error" });
      }
    }
  });

  return httpServer;
}
