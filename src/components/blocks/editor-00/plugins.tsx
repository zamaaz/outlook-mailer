"use client";

import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { LinkPlugin } from "@lexical/react/LexicalLinkPlugin";
import { ToolbarPlugin } from "../../editor/toolbar-plugin";

export function Plugins() {
  return (
    // ✅ FIX: The main border and rounded corners are applied here, to the single outer container.
    <div className="relative border rounded-lg overflow-hidden">
      <ToolbarPlugin />
      <div className="relative bg-background">
        <RichTextPlugin
          placeholder={
            <div className="absolute left-4 top-4 select-none text-muted-foreground pointer-events-none z-0">
              Start typing your email body here...
            </div>
          }
          contentEditable={
            <div className="relative z-10 min-h-[200px] max-h-[600px] overflow-y-auto p-4 focus:outline-none">
              <ContentEditable />
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
      </div>
    </div>
  );
}
