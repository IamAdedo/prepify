import React from "react";

interface TopHeaderProps {
  candidateName: string;
  registrationNumber: string;
  formattedTime: string;
  infractions: number;
  isFullscreen: boolean;
  onRequestFullscreen: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  candidateName,
  registrationNumber,
  formattedTime,
  infractions,
  isFullscreen,
  onRequestFullscreen,
}) => {
  return (
    <header className="bg-jamb-blue text-white p-3 md:p-4 shadow-md flex flex-wrap items-center justify-between select-none border-b-4 border-jamb-gold">
      <div className="flex items-center space-x-3">
        <div className="w-10 h-10 bg-white text-jamb-blue font-bold rounded-full flex items-center justify-center border-2 border-jamb-gold overflow-hidden">
          <img src="/logo.png" alt="Prepify" className="w-full h-full object-contain p-0.5" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }} />
        </div>
        <div>
          <h1 className="font-bold text-sm md:text-base leading-tight uppercase tracking-wide">
            Prepify <span className="text-jamb-gold">UTME Practice</span>
          </h1>
          <p className="text-xs text-jamb-blue-light font-mono">
            Candidate: <span className="text-yellow-300">{candidateName}</span> ({registrationNumber})
          </p>
        </div>
      </div>

      <div className="flex items-center space-x-4 mt-2 sm:mt-0">
        {!isFullscreen && (
          <button
            onClick={onRequestFullscreen}
            className="bg-jamb-red text-white text-xs px-2 py-1 rounded font-bold hover:bg-red-700 animate-pulse"
          >
            Enter Fullscreen
          </button>
        )}

        <div className="bg-black/30 px-3 py-1.5 rounded border border-white/20 text-center">
          <span className="text-[10px] block uppercase tracking-widest text-gray-300">Violations</span>
          <span className={`font-mono text-xs font-bold ${infractions > 0 ? "text-jamb-red" : "text-green-400"}`}>
            {infractions} / 3
          </span>
        </div>

        <div className="bg-black/50 px-4 py-1.5 rounded border border-jamb-gold text-center">
          <span className="text-[10px] block uppercase tracking-widest text-jamb-blue-light">Time Remaining</span>
          <span className="font-mono text-lg md:text-xl font-bold text-jamb-gold tracking-wider">
            {formattedTime}
          </span>
        </div>
      </div>
    </header>
  );
};
