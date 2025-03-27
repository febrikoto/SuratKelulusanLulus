import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { LogIn } from 'lucide-react';

export const PublicHeader: React.FC = () => {
  return (
    <header className="flex justify-between items-center py-4 mb-6 border-b">
      <Link href="/">
        <a className="text-2xl font-bold text-primary flex items-center">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-8 h-8 mr-2"
          >
            <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20" />
          </svg>
          SKL Digital
        </a>
      </Link>

      <Link href="/auth">
        <a>
          <Button variant="outline" size="sm" className="flex items-center gap-1">
            <LogIn className="h-4 w-4" />
            <span>Masuk</span>
          </Button>
        </a>
      </Link>
    </header>
  );
};

export default PublicHeader;