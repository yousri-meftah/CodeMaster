import { useEffect, useState } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { java } from "@codemirror/lang-java";
import { cpp } from "@codemirror/lang-cpp";
import { dracula } from "@uiw/codemirror-theme-dracula";
import { githubLight } from "@uiw/codemirror-theme-github";
import { useTheme } from "@/context/ThemeProvider";

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  height?: string;
  language?: "javascript" | "python" | "java" | "cpp" | "algo";
  showHeader?: boolean;
  fileName?: string;
}

const CodeEditor = ({
  value,
  onChange,
  height = "400px",
  language = "javascript",
  showHeader = true,
  fileName,
}: CodeEditorProps) => {
  const { theme } = useTheme();
  const [editorTheme, setEditorTheme] = useState(theme === "dark" ? dracula : githubLight);

  useEffect(() => {
    setEditorTheme(theme === "dark" ? dracula : githubLight);
  }, [theme]);

  const getLanguageExtension = () => {
    switch (language) {
      case "python":
        return python();
      case "java":
        return java();
      case "cpp":
        return cpp();
      case "algo":
        return javascript();
      default:
        return javascript();
    }
  };

  return (
    <div className="h-full overflow-hidden rounded-none border-0 bg-transparent shadow-none">
      {showHeader && (
        <div className="flex items-center justify-between border-b border-border/60 bg-muted/30 px-4 py-2">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              {fileName ?? "main.ts"}
            </span>
            <span className="hidden sm:inline">Auto-save</span>
          </div>
        </div>
      )}
      <div
        className="h-full"
        style={{
          backgroundColor: theme === "dark" ? "#0d1117" : "hsl(var(--background))",
          backgroundImage:
            theme === "dark"
              ? "linear-gradient(rgba(255,255,255,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.035) 1px, transparent 1px)"
              : "linear-gradient(rgba(15,23,42,0.045) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,0.045) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          backgroundPosition: "0 0",
        }}
      >
        <CodeMirror
          value={value}
          onChange={onChange}
          theme={editorTheme}
          extensions={[getLanguageExtension()]}
          height={height}
          basicSetup={{
            lineNumbers: true,
            highlightActiveLineGutter: true,
            highlightSpecialChars: true,
            foldGutter: true,
            drawSelection: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            syntaxHighlighting: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            rectangularSelection: true,
            crosshairCursor: true,
            highlightActiveLine: true,
            highlightSelectionMatches: true,
            closeBracketsKeymap: true,
            searchKeymap: true,
            foldKeymap: true,
            completionKeymap: true,
            lintKeymap: true,
          }}
          className="h-full text-sm"
        />
      </div>
    </div>
  );
};

export default CodeEditor;
