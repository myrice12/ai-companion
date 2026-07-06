interface Props {
  state: "checking" | "online" | "offline";
}

export function BackendStatus({ state }: Props) {
  if (state === "checking") {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-rose-300">
        <span className="w-1.5 h-1.5 rounded-full bg-rose-300 animate-pulse" />
        连接中
      </div>
    );
  }
  if (state === "online") {
    return (
      <div className="flex items-center gap-1.5 text-[10px] text-emerald-500">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        已同步
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1.5 text-[10px] text-red-400">
      <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
      离线
    </div>
  );
}