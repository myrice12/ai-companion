import { useEffect, useState } from "react";
import { api } from "../api/client";
import { isSettingsConfigured, LLM_PRESETS } from "../constants/llmPresets";
import type { ChatSession, ContextPreview, LLMSettings } from "../types";

interface Props {
  session: ChatSession | null;
  onSessionUpdate: () => void;
  onSettingsChange: (configured: boolean) => void;
  onOpenApiConfig: () => void;
}

export function SettingsPanel({
  session,
  onSessionUpdate,
  onSettingsChange,
  onOpenApiConfig,
}: Props) {
  const [open, setOpen] = useState(true);
  const [tab, setTab] = useState<"llm" | "persona" | "context">("llm");
  const [settings, setSettings] = useState<LLMSettings | null>(null);
  const [apiKeyInput, setApiKeyInput] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("openai");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [systemPrompt, setSystemPrompt] = useState("");
  const [contextPreview, setContextPreview] = useState<ContextPreview | null>(null);

  useEffect(() => {
    api.getSettings().then((s) => {
      setSettings(s);
      onSettingsChange(isSettingsConfigured(s));
    });
  }, [onSettingsChange]);

  useEffect(() => {
    if (session) setSystemPrompt(session.system_prompt);
  }, [session?.id, session?.system_prompt]);

  useEffect(() => {
    if (tab === "context" && session) {
      api.getContextPreview(session.id).then(setContextPreview).catch(() => setContextPreview(null));
    }
  }, [tab, session?.id]);

  const applyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = LLM_PRESETS.find((p) => p.id === presetId);
    if (!preset || !settings || presetId === "custom") return;
    setSettings({ ...settings, base_url: preset.base_url, model: preset.model });
  };

  const handleSaveSettings = async () => {
    if (!settings) return;
    setSaving(true);
    setTestResult(null);
    try {
      const payload: Record<string, unknown> = {
        base_url: settings.base_url,
        model: settings.model,
        temperature: settings.temperature,
        max_tokens: settings.max_tokens,
        max_context_tokens: settings.max_context_tokens,
        enable_summary: settings.enable_summary,
      };
      if (apiKeyInput.trim()) payload.api_key = apiKeyInput.trim();
      const updated = await api.updateSettings(payload);
      setSettings(updated);
      setApiKeyInput("");
      onSettingsChange(isSettingsConfigured(updated));
      setTestResult("✨ 配置已保存");
    } catch (e) {
      setTestResult(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      await handleSaveSettings();
      const result = await api.testSettings();
      setTestResult(result.success ? "🎉 " + result.message : "😿 " + result.message);
    } catch (e) {
      setTestResult(String(e));
    } finally {
      setTesting(false);
    }
  };

  const handleSavePersona = async () => {
    if (!session) return;
    setSaving(true);
    try {
      await api.updateSession(session.id, { system_prompt: systemPrompt });
      onSessionUpdate();
      setTestResult("💕 人设已保存");
    } catch (e) {
      setTestResult(String(e));
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="w-10 shrink-0 border-l border-rose-100/80 bg-white/40 hover:bg-rose-50 text-rose-400 text-xs font-bold"
        title="打开设置"
      >
        ⚙️
      </button>
    );
  }

  const tabs = [
    { id: "llm" as const, label: "API", emoji: "🔑" },
    { id: "persona" as const, label: "人设", emoji: "💕" },
    { id: "context" as const, label: "上下文", emoji: "📋" },
  ];

  return (
    <aside className="w-80 shrink-0 border-l border-rose-100/80 bg-white/40 backdrop-blur-sm flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b border-rose-100/80">
        <span className="font-bold text-sm text-rose-700">🎀 设置</span>
        <button onClick={() => setOpen(false)} className="text-rose-300 hover:text-rose-500 text-sm">
          收起
        </button>
      </div>

      <div className="flex border-b border-rose-100/80">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex-1 py-2.5 text-xs font-semibold transition-all ${
              tab === t.id
                ? "text-rose-600 border-b-2 border-rose-400 bg-rose-50/50"
                : "text-rose-300 hover:text-rose-500"
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {tab === "llm" && settings && (
          <>
            <button onClick={onOpenApiConfig} className="btn-secondary w-full text-xs">
              🪄 打开完整配置弹窗
            </button>

            <div className="grid grid-cols-2 gap-1.5">
              {LLM_PRESETS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => applyPreset(p.id)}
                  className={`preset-btn text-xs ${selectedPreset === p.id ? "preset-btn-active" : ""}`}
                >
                  {p.emoji} {p.name}
                </button>
              ))}
            </div>

            <Field label="API Key">
              <input
                type="password"
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder={settings.api_key_set ? settings.api_key : "sk-..."}
                className="input-field"
              />
            </Field>
            <Field label="Base URL">
              <input
                value={settings.base_url}
                onChange={(e) => setSettings({ ...settings, base_url: e.target.value })}
                className="input-field"
              />
            </Field>
            <Field label="Model">
              <input
                value={settings.model}
                onChange={(e) => setSettings({ ...settings, model: e.target.value })}
                className="input-field"
              />
            </Field>
            <Field label={`Temperature (${settings.temperature})`}>
              <input
                type="range"
                min="0"
                max="2"
                step="0.1"
                value={settings.temperature}
                onChange={(e) =>
                  setSettings({ ...settings, temperature: parseFloat(e.target.value) })
                }
                className="w-full accent-rose-400"
              />
            </Field>
            <Field label="Max Tokens">
              <input
                type="number"
                value={settings.max_tokens}
                onChange={(e) =>
                  setSettings({ ...settings, max_tokens: parseInt(e.target.value) || 2048 })
                }
                className="input-field"
              />
            </Field>
            <Field label="上下文 Token 上限">
              <input
                type="number"
                value={settings.max_context_tokens}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    max_context_tokens: parseInt(e.target.value) || 8000,
                  })
                }
                className="input-field"
              />
            </Field>
            <label className="flex items-center gap-2 text-sm text-rose-500">
              <input
                type="checkbox"
                checked={settings.enable_summary}
                onChange={(e) =>
                  setSettings({ ...settings, enable_summary: e.target.checked })
                }
                className="accent-rose-400"
              />
              启用历史摘要压缩
            </label>
          </>
        )}

        {tab === "persona" && (
          <>
            {!session ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">🌷</div>
                <p className="text-rose-300 text-sm">请先选择一个会话</p>
              </div>
            ) : (
              <>
                <Field label="陪伴人设 (System Prompt)">
                  <textarea
                    value={systemPrompt}
                    onChange={(e) => setSystemPrompt(e.target.value)}
                    rows={10}
                    className="input-field resize-none"
                  />
                </Field>
                <button onClick={handleSavePersona} disabled={saving} className="btn-primary w-full">
                  保存人设 💕
                </button>
              </>
            )}
          </>
        )}

        {tab === "context" && (
          <>
            {!session ? (
              <div className="text-center py-8">
                <div className="text-3xl mb-2">📋</div>
                <p className="text-rose-300 text-sm">请先选择一个会话</p>
              </div>
            ) : contextPreview ? (
              <div className="space-y-3 text-xs">
                <div className="cute-card p-3">
                  <p className="text-rose-600 font-semibold">
                    Token: {contextPreview.total_tokens} / {contextPreview.max_context_tokens}
                  </p>
                  {contextPreview.truncated_count > 0 && (
                    <p className="text-amber-500 mt-1">
                      ✂️ 已裁剪 {contextPreview.truncated_count} 条历史
                    </p>
                  )}
                </div>
                {contextPreview.messages.map((m, i) => (
                  <div key={i} className="cute-card p-3">
                    <p className="text-rose-500 mb-1 font-semibold">
                      [{m.role}] {m.token_count} tokens
                    </p>
                    <p className="text-rose-400 line-clamp-4 whitespace-pre-wrap">{m.content}</p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-rose-300 text-sm text-center">加载中...</p>
            )}
          </>
        )}

        {testResult && (
          <p className="text-xs text-rose-600 bg-rose-50 rounded-2xl p-3 text-center">{testResult}</p>
        )}
      </div>

      {tab === "llm" && (
        <div className="p-4 border-t border-rose-100/80 flex gap-2">
          <button onClick={handleSaveSettings} disabled={saving} className="btn-primary flex-1">
            保存
          </button>
          <button onClick={handleTest} disabled={testing} className="btn-secondary flex-1">
            测试
          </button>
        </div>
      )}
    </aside>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-rose-400 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
