import React from 'react';
import { Link } from 'wouter';
import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { apiRequest, queryClient } from '@/lib/queryClient';
import { UserInfo } from '@shared/types';

interface TeacherHeaderProps {
  user: UserInfo;
  onLogout: () => void;
}

export const TeacherHeader: React.FC<TeacherHeaderProps> = ({ user, onLogout }) => {
  const { toast } = useToast();

  return (
    <header className="flex flex-col md:flex-row justify-between items-center py-4 mb-6 border-b">
      <div className="flex flex-col md:flex-row items-center mb-4 md:mb-0">
        <div 
          className="text-2xl font-bold text-primary flex items-center cursor-pointer" 
          onClick={() => {
            // Gunakan reload halaman untuk memastikan data dimuat ulang dengan benar
            window.location.href="/guru";
          }}
        >
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
        </div>
        <span className="bg-primary/10 text-primary px-3 py-1 rounded-full text-sm ml-0 md:ml-4 mt-2 md:mt-0">
          Guru
        </span>
      </div>

      <div className="flex items-center gap-2 sm:gap-4">
        <nav className="flex items-center gap-1">
          <Button 
            variant="ghost" 
            className="text-sm"
            onClick={() => window.location.href = "/guru"}
          >
            Dashboard
          </Button>
          <Button 
            variant="ghost" 
            className="text-sm"
            onClick={() => window.location.href = "/grades"}
          >
            Nilai
          </Button>
          <Button 
            variant="ghost" 
            className="text-sm"
            onClick={() => window.location.href = "/subjects"}
          >
            Mata Pelajaran
          </Button>
        </nav>
        
        <div className="text-sm text-right hidden sm:block">
          <div className="font-medium">{user?.fullName || 'Guru'}</div>
          <div className="text-gray-500 dark:text-gray-400">{user?.username || ''}</div>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={onLogout}
          className="ml-2"
          title="Keluar"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </header>
  );
};

export default TeacherHeader;