"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { createClient } from "@/lib/supabase/server";
import { createTask } from "./actions";

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || "");

export async function generateAISubtasks(taskId: string, projectId: string) {
  const supabase = await createClient();
  
  // 1. Fetch task details
  const { data: task, error: taskError } = await supabase
    .from("tasks")
    .select("title, description")
    .eq("id", taskId)
    .single();

  if (taskError || !task) throw new Error("Task not found");

  // 2. Call Gemini
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
  
  const prompt = `
    You are an expert operational project manager. 
    Analyze this task and break it down into 5-8 actionable, distinct subtasks.
    Each subtask should be a concise, one-sentence action item.
    
    Task Title: ${task.title}
    Task Description: ${task.description || "No description provided."}
    
    Return the subtasks as a JSON array of strings only.
    Format: ["Subtask 1", "Subtask 2", ...]
  `;

  try {
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();
    
    // Clean JSON from response if needed
    const cleanText = text.replace(/```json|```/g, "").trim();
    const subtaskTitles = JSON.parse(cleanText);

    if (!Array.isArray(subtaskTitles)) throw new Error("Invalid AI response");

    // 3. Create subtasks in the database
    const createdSubtasks = [];
    for (const title of subtaskTitles) {
      const subtask = await createTask(projectId, {
        title,
        parent_task_id: taskId,
        status: "TODO",
        priority: "LOW"
      });
      createdSubtasks.push(subtask);
    }

    return { success: true, count: createdSubtasks.length };
  } catch (error: any) {
    console.error("AI Generation Error:", error);
    throw new Error("Failed to generate subtasks: " + error.message);
  }
}
