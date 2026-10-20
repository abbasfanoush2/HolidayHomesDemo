import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowUpRight, Send, Sparkles, X, CheckCircle2 } from "lucide-react";
import { useStore } from "../store";
import { demoAssistant, suggestions } from "../domain/assistant";
import type { Command } from "../domain/types";
import { Button } from "./ui";
export function Assistant() {
  const { state, filters, assistant, setAssistant, send, open, t } = useStore(),
    [text, setText] = useState(""),
    end = useRef<HTMLDivElement>(null),
    input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (assistant) input.current?.focus();
  }, [assistant]);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "instant", block: "nearest" });
  }, [state.chat.length, assistant]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setAssistant(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  if (!assistant) return null;
  const ask = (message: string) => {
    if (!message.trim()) return;
    send({
      type: "chat",
      message: {
        id: `chat-u-${state.revision}`,
        role: "user",
        text: message,
        sources: [],
      },
    });
    const reply = demoAssistant.respond(state, filters, message);
    send({ type: "chat", message: reply });
    setText("");
  };
  return (
    <aside
      className="assistant-panel"
      aria-label="StayPilot simulated assistant"
    >
      <div className="assistant-header">
        <span className="icon-tile lilac">
          <Sparkles size={20} />
        </span>
        <div>
          <h2>StayPilot copilot</h2>
          <small>{t("demo")}</small>
        </div>
        <button
          className="icon-button"
          aria-label="Close assistant"
          onClick={() => setAssistant(false)}
        >
          <X size={19} />
        </button>
      </div>
      <div className="assistant-context">
        <span className="dot green" />
        {filters.country === "All" ? t("allCountries") : filters.country} ·{" "}
        {filters.propertyId
          ? state.properties.find((p) => p.id === filters.propertyId)?.name
          : t("allProperties")}{" "}
        · {filters.currency}
      </div>
      <div className="assistant-messages">
        {!state.chat.length && (
          <div className="assistant-welcome">
            <Sparkles size={30} />
            <h3>
              {state.language === "es"
                ? "Un poco de claridad, justo cuando la necesitas."
                : state.language === "it"
                  ? "Un po’ di chiarezza, proprio quando serve."
                  : "A little clarity, right when you need it."}
            </h3>
            <p>
              {state.language === "en"
                ? "Ask about your portfolio. Every answer comes from the current demo records, and every action follows the same rules as your team."
                : t("prepared")}
            </p>
          </div>
        )}
        {state.chat.map((m) => (
          <div className={`chat-bubble ${m.role}`} key={m.id}>
            {m.role === "assistant" && (
              <strong>
                <Sparkles size={13} />
                StayPilot · Simulated AI
              </strong>
            )}
            <p>{m.text}</p>
            {m.sources.length > 0 && (
              <div className="chat-sources">
                {m.sources.map((id) => (
                  <button key={id} onClick={() => open(id)}>
                    {state.properties.find((p) => p.id === id)?.name || id}
                    <ArrowUpRight size={11} />
                  </button>
                ))}
              </div>
            )}
            {m.action && (
              <Button
                variant="primary"
                onClick={() => {
                  try {
                    const command = JSON.parse(m.action!) as Command;
                    if (
                      send(
                        command,
                        "Demo command executed or safely deduplicated. Open its source to inspect the result.",
                      )
                    )
                      send({
                        type: "chat",
                        message: {
                          id: `chat-result-${state.revision}`,
                          role: "assistant",
                          text:
                            state.language === "es"
                              ? "Comando ejecutado en la demo. Consulte el registro vinculado para verificar el resultado."
                              : state.language === "it"
                                ? "Comando eseguito nella demo. Apri il record collegato per verificare il risultato."
                                : "The local command was evaluated successfully. Open the linked records to verify the result; required approvals still apply.",
                          sources: m.sources,
                        },
                      });
                  } catch {
                    /* command parsing errors are not expected for stored internal commands */
                  }
                }}
              >
                <CheckCircle2 size={14} />
                {state.language === "es"
                  ? "Ejecutar acción local"
                  : state.language === "it"
                    ? "Esegui azione locale"
                    : "Run local action"}
              </Button>
            )}
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="assistant-suggestions">
        {suggestions[state.language].map((q) => (
          <button key={q} onClick={() => ask(q)}>
            {q}
            <ArrowUpRight size={12} />
          </button>
        ))}
      </div>
      <form
        onSubmit={(e: FormEvent) => {
          e.preventDefault();
          ask(text);
        }}
      >
        <input
          ref={input}
          aria-label="Message the simulated copilot"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t("ask") + "…"}
        />
        <Button
          type="submit"
          variant="primary"
          aria-label="Send assistant message"
          disabled={!text.trim()}
        >
          <Send size={16} />
        </Button>
      </form>
      <p className="assistant-disclaimer">
        Deterministic demo · no live LLM · {t("prepared")}
      </p>
    </aside>
  );
}
