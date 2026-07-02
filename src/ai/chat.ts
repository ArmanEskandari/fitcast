export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatResult {
  reply?: string;
  /** True when the assistant isn't deployed/configured (no proxy or key). */
  unavailable?: boolean;
}

/**
 * Send the conversation to the chat proxy and get the mascot's reply. Signals
 * `unavailable` when there's no functions host / API key (e.g. local dev or a
 * static deploy), so the UI can explain rather than appear broken.
 */
export async function sendChat(
  messages: ChatMessage[],
  options: { defaultLocation?: string; language?: string } = {},
  signal?: AbortSignal,
): Promise<ChatResult> {
  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages, ...options }),
      signal,
    });
    if (res.status === 501) return { unavailable: true };
    // No proxy (local dev / static host) → HTML or a 404, not JSON.
    if (!res.headers.get('content-type')?.includes('application/json')) {
      return { unavailable: true };
    }
    if (!res.ok) return {}; // real proxy returned a JSON error
    const data = (await res.json()) as { reply?: string };
    return { reply: data.reply };
  } catch {
    return {};
  }
}
