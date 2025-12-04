'use client';

import { OpenStreetMapProvider } from "leaflet-geosearch";
import { useState } from "react";

/** Search result from OpenStreetMap geocoding */
interface GeoSearchResult {
  x: number;
  y: number;
  label: string;
  bounds: [[number, number], [number, number]] | null;
  raw: { place_id: string; osm_id: number };
}

const SearchBox = () => {
  const provider = new OpenStreetMapProvider();
  const [results, setResults] = useState<GeoSearchResult[]>([]);
  const [text, setText] = useState<string>("enter something");

  const handleSubmit = async (e: { preventDefault: () => void }) => {
    e.preventDefault();
    const searchResults = await provider.search({ query: text });
    setResults(searchResults as GeoSearchResult[]);
  };
  return (
    <div className="z-[1000]">
      <form onSubmit={handleSubmit}>
        <input type="text" value={text} onChange={(e) => setText(e.target.value)} />
      </form>
      <div>
        {results.map((item) => (
          <p>{item.label}</p>
        ))}
      </div>
    </div>
  );
};

export default SearchBox;
