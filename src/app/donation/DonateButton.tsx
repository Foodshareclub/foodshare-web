"use client";

import { FaCoffee, FaExternalLinkAlt } from "react-icons/fa";

interface DonateButtonProps {
  kofiUrl: string;
  variant: "hero" | "cta";
}

export function DonateButton({ kofiUrl, variant }: DonateButtonProps) {
  const handleDonateClick = () => {
    window.open(kofiUrl, "_blank", "noopener,noreferrer");
  };

  if (variant === "hero") {
    return (
      <button
        onClick={handleDonateClick}
        className="bg-white text-pink-600 hover:bg-white hover:scale-110 hover:shadow-[0_25px_50px_rgba(0,0,0,0.4)] active:scale-105 transition-all duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] shadow-[0_15px_35px_rgba(0,0,0,0.3)] px-12 md:px-20 py-7 md:py-10 text-xl md:text-2xl font-black rounded-full h-auto mx-auto flex items-center gap-3"
      >
        <FaCoffee className="w-7 h-7" />
        Support on Ko-fi
        <FaExternalLinkAlt className="w-5 h-5" />
      </button>
    );
  }

  return (
    <button
      onClick={handleDonateClick}
      className="bg-gradient-to-r from-[#FF2D55] to-[#FF6B9D] text-white hover:from-[#E61F47] hover:to-[#FF5A8E] hover:-translate-y-1 hover:shadow-[0_15px_30px_rgba(255,45,85,0.4)] active:scale-[0.98] transition-all duration-300 shadow-[0_10px_25px_rgba(255,45,85,0.3)] px-14 py-9 rounded-full font-black text-xl h-auto flex items-center gap-3"
    >
      <FaCoffee className="w-6 h-6" />
      Donate Now
      <FaExternalLinkAlt className="w-5 h-5" />
    </button>
  );
}
