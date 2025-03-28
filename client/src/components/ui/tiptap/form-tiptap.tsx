import React from 'react';
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { useFormContext, Controller } from 'react-hook-form';
import TiptapEditor from './TiptapEditor';

interface FormTiptapProps {
  name: string;
  label?: string;
  description?: React.ReactNode;
  placeholder?: string;
  className?: string;
}

export function FormTiptap({
  name,
  label,
  description,
  placeholder,
  className,
}: FormTiptapProps) {
  const form = useFormContext();

  return (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem className={className}>
          {label && <FormLabel>{label}</FormLabel>}
          <FormControl>
            <Controller
              name={name}
              control={form.control}
              render={({ field: { value, onChange } }) => (
                <TiptapEditor
                  content={value || ''}
                  onChange={onChange}
                />
              )}
            />
          </FormControl>
          {description && <FormDescription>{description}</FormDescription>}
          <FormMessage />
        </FormItem>
      )}
    />
  );
}