import OpenAI from "openai";
import "dotenv/config";

const client = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

export const PROMPTS = {
  title:
    "Rewrite this dropshipping product title to be clean, benefit-led and SEO friendly. " +
    "Keep under 75 characters. No quotes. Output only the title.",
  description:
    "Rewrite this product description for a Shopify/WooCommerce store. Use short scannable " +
    "paragraphs and a 4-6 bullet feature list. Strip supplier slang. Output plain HTML " +
    "(use <p>, <ul>, <li>, <strong>). No script/style tags.",
  seo_title: "Write an SEO title (max 60 chars). No quotes, no emojis.",
  seo_meta_description: "Write an SEO meta description (max 155 chars), single line, no quotes.",
  tags: "Suggest 6-10 high-intent SEO tags as a JSON array of strings only.",
  category: "Suggest the single best WooCommerce category path. Output only the path.",
  attributes: "Clean and normalise these attributes. Output a JSON array of {name, values:[]} objects only.",
  specs: "Clean and normalise these specifications. Output a JSON array of {name, value} objects only.",
};

export async function runLlm({ field, content, model, language }) {
  if (!client) throw new Error("OPENAI_API_KEY not set");
  let system = PROMPTS[field];
  if (field === "translate") {
    system = `Translate this content into ${language || "en"}. Preserve meaning, brand names and units. Output only the translated text.`;
  } else if (!system) {
    throw new Error(`Unsupported AI field: ${field}`);
  }
  const completion = await client.chat.completions.create({
    model: model || process.env.OPENAI_MODEL || "gpt-5.2",
    messages: [
      { role: "system", content: system },
      { role: "user", content },
    ],
  });
  return completion.choices?.[0]?.message?.content || "";
}
