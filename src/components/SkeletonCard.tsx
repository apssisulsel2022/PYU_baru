export function SkeletonCard() {
  return (
    <div className="shuttle-card animate-pulse-soft space-y-3">
      <div className="h-4 bg-muted rounded-lg w-2/3" />
      <div className="h-3 bg-muted rounded-lg w-1/2" />
      <div className="flex justify-between items-center mt-3">
        <div className="h-5 bg-muted rounded-lg w-1/4" />
        <div className="h-9 bg-muted rounded-xl w-20" />
      </div>
    </div>
  );
}
