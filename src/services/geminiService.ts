import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

export async function generateSummary(text: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Summarize the following lecture notes concisely, focusing on key concepts and takeaways. IMPORTANT: Use LaTeX for any mathematical formulas (e.g., use $E=mc^2$ for inline or $$E=mc^2$$ for block formulas).\n\n${text.substring(0, 15000)}`,
  });
  return response.text;
}

export async function extractTopics(text: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Extract the top 10 most important topics or keywords from these lecture notes. Return them as a comma-separated list:\n\n${text.substring(0, 10000)}`,
  });
  return response.text?.split(',').map(t => t.trim()) || [];
}

function safeJsonParse(text: string, fallback: any) {
  if (!text) return fallback;
  try {
    return JSON.parse(text);
  } catch (e) {
    console.warn("Initial JSON parse failed, attempting to fix truncated JSON", e);
    try {
      // Attempt to fix truncated JSON
      let fixed = text.trim();
      
      // If it ends with a comma, remove it
      if (fixed.endsWith(',')) {
        fixed = fixed.slice(0, -1);
      }

      const stack: string[] = [];
      let inString = false;
      let escaped = false;

      for (let i = 0; i < fixed.length; i++) {
        const char = fixed[i];
        if (escaped) {
          escaped = false;
          continue;
        }
        if (char === '\\') {
          escaped = true;
          continue;
        }
        if (char === '"') {
          inString = !inString;
          continue;
        }
        if (inString) continue;

        if (char === '{' || char === '[') {
          stack.push(char);
        } else if (char === '}') {
          if (stack[stack.length - 1] === '{') stack.pop();
        } else if (char === ']') {
          if (stack[stack.length - 1] === '[') stack.pop();
        }
      }

      if (inString) {
        fixed += '"';
      }

      while (stack.length > 0) {
        const last = stack.pop();
        if (last === '{') fixed += '}';
        else if (last === '[') fixed += ']';
      }

      return JSON.parse(fixed);
    } catch (e2) {
      console.error("Failed to parse JSON even after fix attempt", e2);
      return fallback;
    }
  }
}

export async function generateFlashcards(text: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Create 10 concise flashcards from these notes. Each flashcard should have a "question" and an "answer". Return as a JSON array of objects. IMPORTANT: Use LaTeX for any mathematical formulas (e.g., $E=mc^2$). Keep answers brief.\n\nNotes:\n${text.substring(0, 10000)}`,
    config: {
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            answer: { type: Type.STRING },
          },
          required: ["question", "answer"],
        },
      },
    },
  });
  return safeJsonParse(response.text, []);
}

function shuffle<T>(array: T[]): T[] {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
}

export async function generateQuiz(text: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Generate 5 multiple-choice quiz questions based on these notes. Each question should have 4 options and 1 correct answer. Return as a JSON array. IMPORTANT: Use LaTeX for any mathematical formulas (e.g., $E=mc^2$). Keep questions and options concise.\n\nNotes:\n${text.substring(0, 10000)}`,
    config: {
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            question: { type: Type.STRING },
            options: { type: Type.ARRAY, items: { type: Type.STRING } },
            correctAnswer: { type: Type.STRING },
          },
          required: ["question", "options", "correctAnswer"],
        },
      },
    },
  });
  
  const quiz = safeJsonParse(response.text, []);
  
  // Validate and filter quiz questions
  const validQuiz = quiz.filter((q: any) => {
    // Basic structure check
    if (!q.question || !Array.isArray(q.options) || !q.correctAnswer) return false;
    
    // Ensure exactly 4 options
    if (q.options.length !== 4) return false;
    
    // Ensure correct answer is one of the options
    if (!q.options.includes(q.correctAnswer)) return false;
    
    return true;
  });

  // Shuffle questions and options
  const shuffledQuiz = shuffle(validQuiz).map((q: any) => ({
    ...q,
    options: shuffle(q.options)
  }));

  return shuffledQuiz;
}

export async function generateSlideContent(text: string) {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: `Create content for a 5-slide PowerPoint presentation based on these notes. Each slide should have a "title" and a list of "bulletPoints". Return as a JSON array. Keep bullet points concise.\n\nNotes:\n${text.substring(0, 10000)}`,
    config: {
      maxOutputTokens: 2048,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            title: { type: Type.STRING },
            bulletPoints: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["title", "bulletPoints"],
        },
      },
    },
  });
  return safeJsonParse(response.text, []);
}
