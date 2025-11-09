/**
 * Firebase Cloud Functions for Precast QC Tools
 *
 * Provides server-side proxy for OpenAI API calls to avoid CORS and SSL issues
 */

const {onRequest} = require("firebase-functions/v2/https");
const {initializeApp} = require("firebase-admin/app");

initializeApp();

/**
 * OpenAI Vision Proxy
 * Proxies OpenAI vision API requests from the web app
 * This avoids SSL certificate issues with the client-side proxy
 */
exports.openaiVisionProxy = onRequest({
  cors: true,
  maxInstances: 10,
  timeoutSeconds: 60,
}, async (req, res) => {
  // Only allow POST requests
  if (req.method !== "POST") {
    return res.status(405).json({error: "Method not allowed"});
  }

  try {
    const {messages, model = "gpt-4o", temperature = 0.1, max_tokens = 1000} = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({error: "Missing or invalid messages"});
    }

    // Use the Vibecode proxy URL from the server side where SSL works properly
    const OPENAI_API_URL = process.env.OPENAI_BASE_URL ||
      "https://api.openai.com.proxy.vibecodeapp.com/v1/chat/completions";

    const OPENAI_API_KEY = process.env.VIBECODE_PROXY_USERNAME || "vibecode-proxy-key";

    console.log("[OpenAI Vision Proxy] Making request to:", OPENAI_API_URL);

    // Make request to OpenAI API
    const response = await fetch(OPENAI_API_URL, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature,
        max_tokens,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("[OpenAI Vision Proxy] API Error:", response.status, errorText);
      return res.status(response.status).json({
        error: `OpenAI API error: ${response.status}`,
        details: errorText,
      });
    }

    const result = await response.json();
    console.log("[OpenAI Vision Proxy] Success");

    return res.status(200).json(result);
  } catch (error) {
    console.error("[OpenAI Vision Proxy] Error:", error);
    return res.status(500).json({
      error: "Internal server error",
      message: error.message,
    });
  }
});
