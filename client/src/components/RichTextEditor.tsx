import { useRef, useEffect, useCallback, useState } from "react";
import {
  Bold, Italic, Heading2, Heading3, List, ListOrdered, Quote, Link2, Undo2, Redo2, Code,
} from "lucide-react";

type Props = {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
};

/**
 * Lightweight WYSIWYG editor built on contentEditable + document.execCommand.
 * No external dependencies. Emits clean semantic HTML (h2/h3/p/ul/ol/blockquote/
 * strong/em/a) that matches what the public blog renders.
 */
export default function RichTextEditor({ value, onChange, placeholder }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [showHtml, setShowHtml] = useState(false);

  // Sync incoming value only when it differs (avoids cursor jumps while typing)
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  const emit = useCallback(() => {
    if (ref.current) onChange(ref.current.innerHTML);
  }, [onChange]);

  const exec = (command: string, arg?: string) => {
    document.execCommand(command, false, arg);
    ref.current?.focus();
    emit();
  };

  const format = (tag: string) => exec("formatBlock", tag);

  const addLink = () => {
    const url = window.prompt("URL del enlace:");
    if (url) exec("createLink", url);
  };

  const ToolbarButton = ({
    onClick, icon: Icon, title,
  }: { onClick: () => void; icon: React.ComponentType<{ className?: string }>; title: string }) => (
    <button
      type="button"
      title={title}
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      className="h-8 w-8 flex items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
    >
      <Icon className="w-4 h-4" />
    </button>
  );

  const Divider = () => <div className="w-px h-5 bg-border/60 mx-1 self-center" />;

  return (
    <div className="border border-input rounded-lg overflow-hidden bg-background">
      {/* Toolbar */}
      <div className="flex items-center gap-0.5 flex-wrap px-2 py-1.5 border-b border-border/40 bg-muted/20">
        <ToolbarButton onClick={() => exec("bold")} icon={Bold} title="Negrita" />
        <ToolbarButton onClick={() => exec("italic")} icon={Italic} title="Cursiva" />
        <Divider />
        <ToolbarButton onClick={() => format("h2")} icon={Heading2} title="Heading" />
        <ToolbarButton onClick={() => format("h3")} icon={Heading3} title="Subheading" />
        <Divider />
        <ToolbarButton onClick={() => exec("insertUnorderedList")} icon={List} title="Bulleted list" />
        <ToolbarButton onClick={() => exec("insertOrderedList")} icon={ListOrdered} title="Lista numerada" />
        <ToolbarButton onClick={() => format("blockquote")} icon={Quote} title="Cita" />
        <ToolbarButton onClick={addLink} icon={Link2} title="Enlace" />
        <Divider />
        <ToolbarButton onClick={() => exec("undo")} icon={Undo2} title="Deshacer" />
        <ToolbarButton onClick={() => exec("redo")} icon={Redo2} title="Rehacer" />
        <div className="ml-auto">
          <button
            type="button"
            title="Ver HTML"
            onMouseDown={(e) => { e.preventDefault(); setShowHtml((v) => !v); }}
            className={`h-8 px-2 flex items-center gap-1 rounded-md text-xs transition-colors ${
              showHtml ? "bg-accent text-foreground" : "text-muted-foreground hover:text-foreground hover:bg-accent"
            }`}
          >
            <Code className="w-3.5 h-3.5" /> HTML
          </button>
        </div>
      </div>

      {/* Editor / HTML source */}
      {showHtml ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full min-h-[420px] p-4 font-mono text-xs bg-background resize-y outline-none"
          spellCheck={false}
        />
      ) : (
        <div
          ref={ref}
          contentEditable
          onInput={emit}
          onBlur={emit}
          data-placeholder={placeholder}
          className="prose-editor min-h-[420px] max-h-[600px] overflow-y-auto p-4 text-sm outline-none leading-relaxed
                     [&_h2]:text-xl [&_h2]:font-bold [&_h2]:mt-4 [&_h2]:mb-2
                     [&_h3]:text-lg [&_h3]:font-semibold [&_h3]:mt-3 [&_h3]:mb-1.5
                     [&_p]:mb-3 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:mb-3
                     [&_ol]:list-decimal [&_ol]:pl-6 [&_ol]:mb-3
                     [&_blockquote]:border-l-4 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground
                     [&_a]:text-primary [&_a]:underline [&_strong]:font-semibold empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground/50"
          suppressContentEditableWarning
        />
      )}
    </div>
  );
}
