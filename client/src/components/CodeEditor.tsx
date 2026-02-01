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
  language?: "javascript" | "python" | "java" | "cpp";
}

const CodeEditor = ({ value, onChange, height = "400px", language = "javascript" }: CodeEditorProps) => {
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
      default:
        return javascript();
    }
  };

  return (
    <div className="border rounded-lg overflow-hidden shadow-sm bg-background h-full">
      <div className="flex items-center justify-between px-4 py-2 border-b bg-muted/40">
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <span className="inline-flex items-center gap-2 rounded-full bg-slate-800 px-3 py-1">
            <span className="h-2 w-2 rounded-full bg-emerald-400" />
            main.ts
          </span>
          <span className="hidden sm:inline">Auto-save</span>
        </div>
        <div className="flex space-x-2">
          <button className="text-slate-300 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button className="text-slate-300 hover:text-white">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      </div>
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
      />
    </div>
  );
};

export default CodeEditor;
