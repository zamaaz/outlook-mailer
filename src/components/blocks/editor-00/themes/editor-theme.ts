import type { EditorThemeClasses } from "lexical";

export const editorTheme: EditorThemeClasses = {
  ltr: "text-left",
  rtl: "text-right",
  paragraph: "m-0 mb-2",
  quote: "m-0 ml-5 border-l-4 border-muted pl-4",
  heading: {
    h1: "text-4xl font-bold",
    h2: "text-3xl font-bold",
    h3: "text-2xl font-bold",
  },
  list: {
    nested: {
      listitem: "ml-5",
    },
    ol: "list-decimal list-inside",
    ul: "list-disc list-inside",
    listitem: "mb-1",
  },
  link: "text-primary underline",
  text: {
    bold: "font-bold",
    italic: "italic",
    underline: "underline",
    strikethrough: "line-through",
    code: "font-mono bg-muted p-1 rounded-sm text-sm",
  },
};