/*
IMPORTANT NOTICE: DO NOT REMOVE
This is a custom client for the OpenAI API. You may update this service, but you should not need to.

valid model names:
gpt-4.1-2025-04-14
o4-mini-2025-04-16
gpt-4o-2024-11-20
*/
import OpenAI from "openai";

export const getOpenAIClient = () => {
  // In Vibecode environment, use the proxy URL which handles authentication
  const baseURL = process.env.OPENAI_BASE_URL || 'https://api.openai.com.proxy.vibecodeapp.com/v1';
  const proxyUsername = process.env.VIBECODE_PROXY_USERNAME;

  // Use proxy username as the API key for Vibecode proxy authentication
  const apiKey = proxyUsername || process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY || 'vibecode-proxy-key';

  if (!process.env.EXPO_PUBLIC_VIBECODE_OPENAI_API_KEY && proxyUsername) {
    console.log("Using Vibecode proxy for OpenAI API with project authentication");
  }

  return new OpenAI({
    apiKey: apiKey,
    baseURL: baseURL,
  });
};
