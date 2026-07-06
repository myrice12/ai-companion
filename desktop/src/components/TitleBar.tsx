import { useEffect, useState } from "react";

interface Props {
  title: string;
  alwaysOnTop: boolean;
  onToggleAlwaysOnTop: () => void;
  onHide: () => void;
  onQuit: () => void;
  onOpenWeb: () => void;
}

export function TitleBar({ title, alwaysOnTop, onToggleAlwaysOnTop, onHide, onQuit, onOpenWeb }: Props) {
  const [platform, setPlatform] = useState<string>("");
  useEffect(() => {
    setPlatform(window.desktopBridge.platform);
  }, []);

  return (
    <div className="titlebar">
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-base">🌸</span>
        <span className="text-xs font-bold text-rose-700 truncate max-w-[140px]">{title}</span>
      </div>

      <div className="flex items-center gap-1">
        <button
          className="titlebar-button"
          title={alwaysOnTop ? "取消置顶" : "置顶"}
          onClick={onToggleAlwaysOnTop}
        >
          {alwaysOnTop ? "📌" : "📍"}
        </button>
        <button className="titlebar-button" title="在浏览器中打开网页版" onClick={onOpenWeb}>
          🌐
        </button>
        {platform === "darwin" ? (
          <>
            <button className="titlebar-button" title="隐藏窗口" onClick={onHide}>
              ◯
            </button>
            <button className="titlebar-button" title="退出小伴" onClick={onQuit}>
              ✕
            </button>
          </>
        ) : (
          <>
            <button className="titlebar-button" title="最小化" onClick={() => window.desktopBridge.minimize()}>
              —
            </button>
            <button className="titlebar-button" title="隐藏窗口" onClick={onHide}>
              ✕
            </button>
          </>
        )}
      </div>
    </div>
  );
}