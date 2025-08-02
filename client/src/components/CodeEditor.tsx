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
}

const CodeEditor = ({ value, onChange, height = "400px" }: CodeEditorProps) => {
  const { theme } = useTheme();
  const [editorTheme, setEditorTheme] = useState(theme === "dark" ? dracula : githubLight);

  useEffect(() => {
    setEditorTheme(theme === "dark" ? dracula : githubLight);
  }, [theme]);

  

  const getLanguageStarter = () => {
    return "";
  };

  return (
    <div className="border rounded-md overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2 bg-muted">
        
        <div className="flex space-x-2">
          <button className="text-muted-foreground hover:text-foreground">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>
          <button className="text-muted-foreground hover:text-foreground">
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
