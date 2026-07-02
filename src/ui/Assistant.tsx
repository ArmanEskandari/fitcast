import { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { usePrefs } from '@/store/usePrefs';
import { type ChatMessage, sendChat } from '@/ai/chat';

const GREETING =
  "Hi, I'm Sprout! Ask me what to wear — e.g. “what should I wear for a run tonight?”";

/**
 * Floating "Ask Sprout" chat assistant. Talks to the tool-use chat proxy; if
 * the assistant isn't deployed/configured, it says so instead of appearing broken.
 */
export const Assistant = () => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const location = useAppStore((s) => s.location);
  const language = usePrefs((s) => s.language);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, busy]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    const next: ChatMessage[] = [...messages, { role: 'user', content: text }];
    setMessages(next);
    setInput('');
    setBusy(true);
    // Don't pass the non-geocodable placeholder as a default location.
    const defaultLocation =
      location?.name && location.name !== 'My location' ? location.name : undefined;
    const result = await sendChat(next, { defaultLocation, language });
    setBusy(false);
    if (result.unavailable) {
      setUnavailable(true);
      return;
    }
    if (result.reply) {
      setMessages([...next, { role: 'assistant', content: result.reply }]);
    } else {
      setMessages([
        ...next,
        { role: 'assistant', content: 'Hmm, I had trouble reaching the forecast. Try again?' },
      ]);
    }
  }

  if (!open) {
    return (
      <button
        className="assistant-fab glass"
        onClick={() => setOpen(true)}
        aria-label="Ask Sprout"
      >
        <svg className="fab-icon" viewBox="0 0 24 24" width="22" height="22" aria-hidden>
          <path
            d="M6 3h12a3 3 0 0 1 3 3v8a3 3 0 0 1-3 3h-7l-4 3.5V17H6a3 3 0 0 1-3-3V6a3 3 0 0 1 3-3z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
          <path
            d="M12 6.8l1.03 2.17L15.2 10l-2.17 1.03L12 13.2l-1.03-2.17L8.8 10l2.17-1.03z"
            fill="currentColor"
          />
        </svg>
        <span className="fab-label">Ask Sprout</span>
      </button>
    );
  }

  return (
    <div className="assistant glass">
      <div className="assistant-head">
        <strong>Ask Sprout</strong>
        <button className="icon-btn" aria-label="Close" onClick={() => setOpen(false)}>
          ✕
        </button>
      </div>

      <div className="assistant-log" ref={scrollRef}>
        <div className="msg bot" dir="auto">
          {GREETING}
        </div>
        {messages.map((m, i) => (
          <div key={i} className={`msg ${m.role === 'user' ? 'me' : 'bot'}`} dir="auto">
            {m.content}
          </div>
        ))}
        {busy && <div className="msg bot typing">Sprout is checking the sky…</div>}
        {unavailable && (
          <div className="msg note">
            The assistant needs the app deployed with an API key. It's off in this environment — the
            weather scene and advice card still work.
          </div>
        )}
      </div>

      <form
        className="assistant-input"
        onSubmit={(e) => {
          e.preventDefault();
          void send();
        }}
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="What should I wear for…"
          aria-label="Ask the assistant"
          disabled={unavailable}
        />
        <button className="icon-btn" type="submit" disabled={busy || unavailable} aria-label="Send">
          ➤
        </button>
      </form>
    </div>
  );
};
