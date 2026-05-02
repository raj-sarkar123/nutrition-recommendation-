export default function ScanLineLoader({ visible = true }) {
  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 w-full h-[2px] z-[100] opacity-30">
      <div className="h-full bg-gradient-to-r from-transparent via-primary to-transparent w-1/4 animate-scan-line" />
    </div>
  );
}
