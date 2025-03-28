import React from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import { Button } from '@/components/ui/button';
import { cn } from '../../../lib/utils';
import {
  Bold as BoldIcon,
  Italic as ItalicIcon,
  Underline as UnderlineIcon,
  List as BulletListIcon,
  ListOrdered as OrderedListIcon,
  Code as CodeIcon,
  AlignLeft,
  AlignCenter,
  AlignRight
} from 'lucide-react';

interface TiptapEditorProps {
  content: string;
  onChange: (content: string) => void;
  className?: string;
}

const TiptapEditor: React.FC<TiptapEditorProps> = ({ content, onChange, className }) => {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: false,
        horizontalRule: false,
        bulletList: {
          HTMLAttributes: {
            class: 'list-disc pl-5 mb-3',
            style: 'font-family: Arial, sans-serif; color: #000;'
          }
        },
        orderedList: {
          HTMLAttributes: {
            class: 'list-decimal pl-5 mb-3',
            style: 'font-family: Arial, sans-serif; color: #000;'
          }
        },
      }),
      Underline,
    ],
    content,
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('border rounded-md overflow-hidden', className)}>
      <div className="bg-muted p-1 border-b flex flex-wrap gap-1">
        <Button
          variant={editor.isActive('bold') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBold().run()}
          className="h-8 w-8 p-0"
          title="Bold"
        >
          <BoldIcon className="h-4 w-4" />
        </Button>
        
        <Button
          variant={editor.isActive('italic') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className="h-8 w-8 p-0"
          title="Italic"
        >
          <ItalicIcon className="h-4 w-4" />
        </Button>
        
        <Button
          variant={editor.isActive('underline') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          className="h-8 w-8 p-0"
          title="Underline"
        >
          <UnderlineIcon className="h-4 w-4" />
        </Button>
        
        <Button
          variant={editor.isActive('code') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleCode().run()}
          className="h-8 w-8 p-0"
          title="Code"
        >
          <CodeIcon className="h-4 w-4" />
        </Button>
        
        <div className="w-px h-8 bg-border mx-1" /> {/* divider */}
        
        <Button
          variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className="h-8 w-8 p-0"
          title="Bullet List"
        >
          <BulletListIcon className="h-4 w-4" />
        </Button>
        
        <Button
          variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
          size="sm"
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          className="h-8 w-8 p-0"
          title="Ordered List"
        >
          <OrderedListIcon className="h-4 w-4" />
        </Button>

        <div className="w-px h-8 bg-border mx-1" /> {/* divider */}
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Wrap selected text with left-aligned div
            const selectedText = editor.state.selection.content().content;
            if (selectedText && selectedText.size > 0) {
              const html = `<div style="text-align: left; font-family: Arial, sans-serif; color: #000;">${editor.state.selection.content().content.toJSON().map((node: any) => node.text).join('')}</div>`;
              editor.chain().focus().insertContent(html).run();
            }
          }}
          className="h-8 w-8 p-0"
          title="Align Left"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Wrap selected text with center-aligned div
            const selectedText = editor.state.selection.content().content;
            if (selectedText && selectedText.size > 0) {
              const html = `<div style="text-align: center; font-family: Arial, sans-serif; color: #000;">${editor.state.selection.content().content.toJSON().map((node: any) => node.text).join('')}</div>`;
              editor.chain().focus().insertContent(html).run();
            }
          }}
          className="h-8 w-8 p-0"
          title="Align Center"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>
        
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            // Wrap selected text with right-aligned div
            const selectedText = editor.state.selection.content().content;
            if (selectedText && selectedText.size > 0) {
              const html = `<div style="text-align: right; font-family: Arial, sans-serif; color: #000;">${editor.state.selection.content().content.toJSON().map((node: any) => node.text).join('')}</div>`;
              editor.chain().focus().insertContent(html).run();
            }
          }}
          className="h-8 w-8 p-0"
          title="Align Right"
        >
          <AlignRight className="h-4 w-4" />
        </Button>
      </div>
      
      <EditorContent 
        editor={editor} 
        className="prose dark:prose-invert max-w-none p-4 min-h-[120px] focus:outline-none prose-p:my-2 prose-ol:pl-5 prose-ol:list-decimal prose-ul:pl-5 prose-ul:list-disc prose-li:my-1" 
        style={{
          fontSize: '14px',
          lineHeight: '1.5',
          fontFamily: 'Arial, sans-serif',
          color: '#000'
        }}
      />
    </div>
  );
};

export default TiptapEditor;