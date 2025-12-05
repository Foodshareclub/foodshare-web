import React from "react";
import light from "@/assets/noto-v1_light-bulb.svg";

const TopTips = () => {
  return (
    <div className="glass-accent-primary rounded-xl p-4 mt-1 mb-2">
      <div className="py-2 mx-auto w-[90%]">
        <div className="flex items-center gap-2 mb-3">
          <img className="w-5" src={light} alt="light" />
          <h3 className="font-medium text-xl">Top tips</h3>
        </div>
        <ul className="list-inside pl-2 space-y-1">
          <li>Have safe pick ups during COVID</li>
          <li>Say when you can pick up this listings</li>
          <li>Be polite by saying please and thank you</li>
          <li>Never set off without the pickup confirmed, and an address</li>
        </ul>
        <p className="mt-3 font-medium">Read our safe sharing guidelines</p>
      </div>
    </div>
  );
};

export default TopTips;
