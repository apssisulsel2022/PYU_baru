import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ScreenHeaderProps {
  title: string;
  onBack?: () => void;
}

export function ScreenHeader({ title, onBack }: ScreenHeaderProps) {
  const navigate = useNavigate();
  const handleBack = onBack || (() => navigate(-1));

  return (
    <div className="sticky top-0 z-40 bg-card/80 backdrop-blur-xl border-b border-border/50 safe-top">
      <div className="max-w-[480px] mx-auto flex items-center gap-3 px-4 h-14">
        <button onClick={handleBack} className="tap-highlight p-2 -ml-2 rounded-xl hover:bg-muted touch-target flex items-center justify-center">
          <ArrowLeft className="w-5 h-5 text-foreground" />
        </button>
        <h1 className="text-lg font-bold text-foreground">{title}</h1>
      </div>
    </div>
  );
}
