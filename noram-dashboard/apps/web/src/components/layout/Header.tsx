export default function Header() {
  return (
    <header className="h-14 bg-gray-900 border-b border-gray-800 flex items-center justify-between px-6 shrink-0">
      <h2 className="text-sm font-medium text-gray-400">
        FY2026 · North America
      </h2>
      <div className="flex items-center gap-3 text-xs text-gray-500">
        <span>Last updated: {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
      </div>
    </header>
  );
}
