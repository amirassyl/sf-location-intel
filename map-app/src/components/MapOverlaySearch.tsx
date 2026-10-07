import { useState } from "react";
import { Search, MapPin } from "lucide-react";
import { Input } from "./ui/input";
import { Card } from "./ui/card";
import { supabase } from "@/integrations/supabase/client";

interface MapOverlaySearchProps {
  onSearch: (address: string, lat?: number, lng?: number) => void;
}

export const MapOverlaySearch = ({ onSearch }: MapOverlaySearchProps) => {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isSearching, setIsSearching] = useState(false);

  const handleInputChange = async (value: string) => {
    setQuery(value);
    if (value.length > 2) {
      setIsSearching(true);
      try {
        const { data, error } = await supabase.functions.invoke(
          "search-addresses",
          { body: { query: value } }
        );
        if (!error && data?.results) {
          setSuggestions(data.results);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (e) {
        setSuggestions([]);
        setShowSuggestions(false);
      }
      setIsSearching(false);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSearch = (address?: string, lat?: number, lng?: number) => {
    const searchQuery = address || query;
    if (searchQuery.trim()) {
      onSearch(searchQuery, lat, lng);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion: any) => {
    setQuery(suggestion.address);
    handleSearch(suggestion.address, suggestion.latitude, suggestion.longitude);
  };

  return (
    <div className="relative w-full max-w-xl">
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
        <Input
          type="text"
          placeholder="Search address, business, or entity..."
          value={query}
          onChange={(e) => handleInputChange(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          className="pl-12 pr-4 h-14 text-base bg-card shadow-lg border-0 rounded-full"
        />
        {isSearching && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
          </div>
        )}
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute top-16 left-0 right-0 z-50 max-h-96 overflow-y-auto shadow-xl">
          <div className="p-2">
            {suggestions.map((suggestion, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(suggestion)}
                className="w-full text-left px-4 py-3 hover:bg-muted rounded-lg transition-colors"
              >
                <div className="flex items-center gap-3">
                  <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">{suggestion.address}</div>
                    {suggestion.neighborhood && (
                      <div className="text-xs text-muted-foreground">{suggestion.neighborhood}</div>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
