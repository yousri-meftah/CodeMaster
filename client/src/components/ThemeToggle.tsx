import { useTheme } from "@/context/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Moon, Sun, Palette } from "lucide-react";

const ThemeToggle = () => {
  const { theme, setTheme, palette, setPalette } = useTheme();

  const toggleTheme = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <div className="flex items-center gap-2">
      <Select value={palette} onValueChange={(value) => setPalette(value as any)}>
        <SelectTrigger className="h-8 w-[140px]">
          <SelectValue placeholder="Theme" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="energetic">Energetic</SelectItem>
          <SelectItem value="techno">Techno</SelectItem>
          <SelectItem value="academic">Academic</SelectItem>
          <SelectItem value="logo">Logo</SelectItem>
          <SelectItem value="bootstrap">Bootstrap</SelectItem>
        </SelectContent>
      </Select>
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        aria-label="Toggle theme"
      >
        {theme === "dark" ? (
          <Sun className="h-[1.2rem] w-[1.2rem]" />
        ) : (
          <Moon className="h-[1.2rem] w-[1.2rem]" />
        )}
      </Button>
      <Palette className="h-4 w-4 text-muted-foreground hidden sm:inline" />
    </div>
  );
};

export default ThemeToggle;
