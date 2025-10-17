"use client";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import type { InitialConfigType } from "@lexical/react/LexicalComposer";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import type {
  EditorState,
  SerializedEditorState,
  LexicalEditor,
} from "lexical";
import { $generateHtmlFromNodes } from "@lexical/html";
import { editorTheme } from "./themes/editor-theme";
import { nodes } from "./nodes";
import { Plugins } from "./plugins";

const editorConfig: InitialConfigType = {
  namespace: "OutlookMailerEditor",
  theme: editorTheme,
  nodes: nodes,
  onError: (error: Error) => {
    console.error("Lexical Editor Error:", error);
  },
};

export function Editor({
  editorSerializedState,
  onSerializedChange,
  onHtmlChange,
}: {
  editorSerializedState?: SerializedEditorState;
  onSerializedChange?: (value: SerializedEditorState) => void;
  onHtmlChange?: (html: string) => void;
}) {
  return (
    <LexicalComposer
      initialConfig={{
        ...editorConfig,
        ...(editorSerializedState
          ? { editorState: JSON.stringify(editorSerializedState) }
          : {}),
      }}
    >
      <Plugins />
      <OnChangePlugin
        ignoreSelectionChange={true}
        onChange={(state: EditorState, editor: LexicalEditor) => {
          onSerializedChange?.(state.toJSON());

          editor.update(() => {
            const htmlString = $generateHtmlFromNodes(editor);
            onHtmlChange?.(htmlString.trim());
          });
        }}
      />
    </LexicalComposer>
  );
}
