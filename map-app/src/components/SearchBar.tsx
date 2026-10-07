import { useState } from "react";
import { Search, MapPin } from "lucide-react";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Card } from "./ui/card";

interface SearchBarProps {
  onSearch: (query: string) => void;
}

export const SearchBar = ({ onSearch }: SearchBarProps) => {
  const [query, setQuery] = useState("");
  // Live suggestions from backend function
  type Suggestion = { address: string; latitude?: number; longitude?: number };
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const handleInputChange = async (value: string) => {
    setQuery(value);
    if (value.length > 2) {
      try {
        const { data, error } = await (await import("@/integrations/supabase/client")).supabase.functions.invoke(
          "search-addresses",
          { body: { query: value } }
        );
        if (!error && data?.results) {
          setSuggestions(data.results as Suggestion[]);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } catch (e) {
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSearch = (address?: string) => {
    const searchQuery = address || query;
    if (searchQuery.trim()) {
      onSearch(searchQuery);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (s: Suggestion) => {
    setQuery(s.address);
    handleSearch(s.address);
  };

  return (
    <div className="relative w-full max-w-2xl">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search address in San Francisco..."
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
            className="pl-10 pr-4 h-12 text-base"
          />
        </div>
        <Button onClick={() => handleSearch()} size="lg" className="px-6">
          <MapPin className="mr-2 h-4 w-4" />
          Search
        </Button>
      </div>

      {showSuggestions && suggestions.length > 0 && (
        <Card className="absolute top-14 left-0 right-0 z-50 p-2 shadow-lg">
          <div className="space-y-1">
            {suggestions.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSuggestionClick(s)}
                className="w-full text-left px-3 py-2 hover:bg-muted rounded-md transition-colors text-sm"
              >
                <MapPin className="inline h-3 w-3 mr-2 text-muted-foreground" />
                {s.address}
              </button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};
