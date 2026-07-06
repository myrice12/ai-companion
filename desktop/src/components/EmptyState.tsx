interface Props {
  onCreate: () => void;
}

export function EmptyState({ onCreate }: Props) {
  return (
    <div className="flex-1 flex items-center justify-center px-6">
      <div className="text-center">
        <div className="text-4xl mb-3 animate-bounce-soft inline-block">🌷</div>
        <p className="text-sm font-bold text-rose-600 mb-1">还没有对话</p>
        <p className="text-xs text-rose-300 mb-4">点下面开第一个吧</p>
        <button onClick={onCreate} className="send-button px-5 py-2">
          ✨ 新对话
        </button>
      </div>
    </div>
  );
}