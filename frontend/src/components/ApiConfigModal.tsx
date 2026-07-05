import { useEffect, useState } from "react";
import { api } from "../api/client";
import { isSettingsConfigured, LLM_PRESETS } from "../constants/llmPresets";
import type { LLMSettings } from "../types";

interface Props {
  open: boolean;
  onClose: () => void;
  onConfigured: (configured: boolean) => void;
}

export function ApiConfigModal({ open, onClose, onConfigured }: Props) {
  const [settings, setSettings] = useState<LLMSettings | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [selectedPreset, setSelectedPreset] = useState("openai");
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      api.getSettings().then(setSettings);
      setMessage(null);
      setApiKey("");
    }
  }, [open]);

  const applyPreset = (presetId: string) => {
    setSelectedPreset(presetId);
    const preset = LLM_PRESETS.find((p) => p.id === presetId);
    if (!preset || !settings || presetId === "custom") return;
    setSettings({
      ...settings,
      base_url: preset.base_url,
      model: preset.model,
    });
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = {
        base_url: settings.base_url,
        model: settings.model,
        temperature: settings.temperature,
        max_tokens: settings.max_tokens,
        max_context_tokens: settings.max_context_tokens,
        enable_summary: settings.enable_summary,
      };
      if (apiKey.trim()) payload.api_key = apiKey.trim();
      const updated = await api.updateSettings(payload);
      setSettings(updated);
      setApiKey("");
      onConfigured(isSettingsConfigured(updated));
      setMessage("✨ 配置已保存！");
    } catch (e) {
      setMessage(String(e));
    } finally {
      setSaving(false);
    }
  };

  const handleTestAndSave = async () => {
    setTesting(true);
    setMessage(null);
    try {
      await handleSave();
      const result = await api.testSettings();
      if (result.success) {
        setMessage("🎉 " + result.message);
        onConfigured(true);
        setTimeout(onClose, 800);
      } else {
        setMessage("😿 " + result.message);
      }
    } catch (e) {
      setMessage(String(e));
    } finally {
      setTesting(false);
    }
  };

  if (!open || !settings) return null;

  const preset = LLM_PRESETS.find((p) => p.id === selectedPreset);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-rose-900/20 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg cute-card p-6 animate-pop-in">
        <div className="text-center mb-5">
          <div className="text-4xl mb-2 animate-bounce-soft">🌸</div>
          <h2 className="text-xl font-bold text-rose-800">配置 AI 小伙伴</h2>
          <p className="text-sm text-rose-400 mt-1">填写 LLM API，开始温暖陪伴之旅</p>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {LLM_PRESETS.map((p) => (
            <button
              key={p.id}
              onClick={() => applyPreset(p.id)}
              className={`preset-btn ${selectedPreset === p.id ? "preset-btn-active" : ""}`}
            >
              <span className="text-lg">{p.emoji}</span>
              <span>{p.name}</span>
            </button>
          ))}
        </div>

        <div className="space-y-3">
          {preset?.needsKey !== false && (
            <Field label="API Key 🔑">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder={settings.api_key_set ? settings.api_key : "sk-..."}
                className="input-field"
              />
            </Field>
          )}
          <Field label="Base URL 🌐">
            <input
              value={settings.base_url}
              onChange={(e) => setSettings({ ...settings, base_url: e.target.value })}
              className="input-field"
              placeholder="https://api.openai.com/v1"
            />
          </Field>
          <Field label="Model 🧠">
            <input
              value={settings.model}
              onChange={(e) => setSettings({ ...settings, model: e.target.value })}
              className="input-field"
              placeholder="gpt-4o-mini"
            />
          </Field>
          <Field label={`温度 (${settings.temperature}) 🌡️`}>
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
        </div>

        {message && (
          <p className="mt-4 text-sm text-center text-rose-600 bg-rose-50 rounded-xl py-2 px-3">
            {message}
          </p>
        )}

        <div className="flex gap-3 mt-5">
          <button onClick={onClose} className="btn-secondary flex-1">
            稍后再说
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-secondary flex-1">
            保存
          </button>
          <button onClick={handleTestAndSave} disabled={testing} className="btn-primary flex-1">
            {testing ? "测试中..." : "测试并启用 ✨"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-rose-400 mb-1 block">{label}</span>
      {children}
    </label>
  );
}
