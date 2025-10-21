"use client";

import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  SELECTION_CHANGE_COMMAND,
  $isElementNode,
  FORMAT_ELEMENT_COMMAND,
  createCommand,
  type LexicalCommand,
} from "lexical";
import {
  $patchStyleText,
  $getSelectionStyleValueForProperty,
} from "@lexical/selection";
import type { ElementFormatType } from "lexical";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useEffect, useState, useCallback } from "react";

export const APPLY_TEXT_STYLE_COMMAND: LexicalCommand<Record<string, string>> =
  createCommand();

const FONT_SIZE_OPTIONS = ["12px", "14px", "16px", "18px", "20px", "24px"];

export function ToolbarPlugin() {
  const [editor] = useLexicalComposerContext();
  const [activeEditor, setActiveEditor] = useState(editor);

  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [fontSize, setFontSize] = useState<string>("16px");
  const [elementFormat, setElementFormat] = useState<ElementFormatType>("left");

  const applyStyleText = useCallback(
    (styles: Record<string, string>) => {
      activeEditor.focus();
      activeEditor.dispatchCommand(APPLY_TEXT_STYLE_COMMAND, styles);
    },
    [activeEditor]
  );

  const updateToolbar = useCallback(() => {
    activeEditor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        // Update text format states
        setIsBold(selection.hasFormat("bold"));
        setIsItalic(selection.hasFormat("italic"));
        setIsUnderline(selection.hasFormat("underline"));
        setIsStrikethrough(selection.hasFormat("strikethrough"));

        const newSize = $getSelectionStyleValueForProperty(
          selection,
          "font-size",
          "16px"
        );
        setFontSize(newSize);

        // Update alignment state
        const anchorNode = selection.anchor.getNode();
        const element =
          anchorNode.getKey() === "root"
            ? anchorNode
            : anchorNode.getTopLevelElementOrThrow();
        if ($isElementNode(element)) {
          setElementFormat(element.getFormatType());
        }
      }
    });
  }, [activeEditor]);

  useEffect(() => {
    return editor.registerCommand(
      SELECTION_CHANGE_COMMAND,
      (_payload, newEditor) => {
        setActiveEditor(newEditor);
        return false;
      },
      1
    );
  }, [editor]);

  useEffect(() => {
    return activeEditor.registerCommand(
      APPLY_TEXT_STYLE_COMMAND,
      (styles: Record<string, string>) => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          $patchStyleText(selection, styles);
        }
        return true;
      },
      0
    );
  }, [activeEditor]);

  useEffect(() => {
    updateToolbar();
  }, [activeEditor, updateToolbar]);

  return (
    <div className="flex flex-wrap items-center gap-1 bg-muted/40 p-2 rounded-t-md">
      <Select
        value={fontSize}
        onValueChange={(newSize) => {
          activeEditor.focus();
          activeEditor.update(() => {
            const selection = $getSelection();
            if ($isRangeSelection(selection)) {
              $patchStyleText(selection, { "font-size": newSize });
            }
          });
          setFontSize(newSize);
          setTimeout(() => {
            updateToolbar();
          }, 0);
        }}
      >
        <SelectTrigger className="w-[100px] h-9">
          <SelectValue placeholder="Font size" />
        </SelectTrigger>
        <SelectContent>
          {FONT_SIZE_OPTIONS.map((option) => (
            <SelectItem key={option} value={option}>
              {option}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="mx-2 h-6 w-px bg-border" />

      <Button
        variant={isBold ? "secondary" : "ghost"}
        size="icon"
        onClick={() =>
          activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, "bold")
        }
      >
        <Bold className="w-4 h-4" />
      </Button>
      <Button
        variant={isItalic ? "secondary" : "ghost"}
        size="icon"
        onClick={() =>
          activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, "italic")
        }
      >
        <Italic className="w-4 h-4" />
      </Button>
      <Button
        variant={isUnderline ? "secondary" : "ghost"}
        size="icon"
        onClick={() =>
          activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, "underline")
        }
      >
        <Underline className="w-4 h-4" />
      </Button>
      <Button
        variant={isStrikethrough ? "secondary" : "ghost"}
        size="icon"
        onClick={() =>
          activeEditor.dispatchCommand(FORMAT_TEXT_COMMAND, "strikethrough")
        }
      >
        <Strikethrough className="w-4 h-4" />
      </Button>
      <div className="mx-2 h-6 w-px bg-border" />

      <Button
        variant={elementFormat === "left" ? "secondary" : "ghost"}
        size="icon"
        title="Align Left"
        onClick={() =>
          activeEditor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "left")
        }
      >
        <AlignLeft className="w-4 h-4" />
      </Button>
      <Button
        variant={elementFormat === "center" ? "secondary" : "ghost"}
        size="icon"
        title="Align Center"
        onClick={() =>
          activeEditor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "center")
        }
      >
        <AlignCenter className="w-4 h-4" />
      </Button>
      <Button
        variant={elementFormat === "right" ? "secondary" : "ghost"}
        size="icon"
        title="Align Right"
        onClick={() =>
          activeEditor.dispatchCommand(FORMAT_ELEMENT_COMMAND, "right")
        }
      >
        <AlignRight className="w-4 h-4" />
      </Button>
      <div className="mx-2 h-6 w-px bg-border" />

      <input
        type="color"
        onChange={(e) => applyStyleText({ color: e.target.value })}
        title="Text Color"
        className="w-8 h-8 p-0 border-none bg-transparent cursor-pointer"
      />
    </div>
  );
}
