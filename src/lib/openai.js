import OpenAI from 'openai';
import { config } from '../config.js';

// Shared client for OpenAI's decisions API, used by the recorder and the live route. Created on first
// use, so a machine without OPENAI_API_KEY can still run everything that only replays recordings.

let client = null;

export function openai() {
  if (!config.openai.apiKey) {
    throw new Error('OPENAI_API_KEY is not set. Add it to .env to record or run demos against OpenAI.');
  }
  client ??= new OpenAI({ apiKey: config.openai.apiKey, maxRetries: 3 });
  return client;
}

export const openaiModel = () => config.openai.model;
