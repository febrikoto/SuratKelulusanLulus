import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle
} from '@/components/ui/card';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';
import { Loader2, MoreHorizontal, Pencil } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { EditTeacherModal } from '@/components/modals/EditTeacherModal';

export interface Teacher {
  id: number;
  username: string;
  fullName: string;
  role: 'guru';
  assignedMajor: string | null;
  createdAt: Date;
}

interface TeacherManagementTableProps {
  settings: any;
}

export const TeacherManagementTable: React.FC<TeacherManagementTableProps> = ({ settings }) => {
  // States for modals
  const [selectedTeacher, setSelectedTeacher] = useState<Teacher | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  
  // Fetch teachers
  const { data: teachers, isLoading } = useQuery<Teacher[]>({
    queryKey: ['/api/teachers'],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/teachers');
      if (!res.ok) throw new Error('Failed to fetch teachers');
      return res.json();
    }
  });
  
  // Handler for edit button click
  const handleEditClick = (teacher: Teacher) => {
    setSelectedTeacher(teacher);
    setIsEditModalOpen(true);
  };
  
  // Get major list from settings
  const majorList = settings?.majorList 
    ? settings.majorList.split(',').map((major: string) => major.trim()) 
    : [];
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Daftar Guru</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>No</TableHead>
                  <TableHead>Nama Lengkap</TableHead>
                  <TableHead>Username</TableHead>
                  <TableHead>Jurusan yang Diampu</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {teachers && teachers.length > 0 ? (
                  teachers.map((teacher, index) => (
                    <TableRow key={teacher.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell className="font-medium">{teacher.fullName}</TableCell>
                      <TableCell>{teacher.username}</TableCell>
                      <TableCell>
                        {teacher.assignedMajor ? (
                          <Badge className="bg-primary">{teacher.assignedMajor}</Badge>
                        ) : (
                          <span className="text-muted-foreground">Semua Jurusan</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                              <span className="sr-only">Menu</span>
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleEditClick(teacher)}>
                              <Pencil className="mr-2 h-4 w-4" />
                              <span>Edit</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      {teachers?.length === 0 
                        ? "Belum ada data guru" 
                        : "Gagal memuat data guru"}
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      
      {/* Edit Teacher Modal */}
      {selectedTeacher && (
        <EditTeacherModal
          isOpen={isEditModalOpen}
          teacher={selectedTeacher}
          onClose={() => {
            setIsEditModalOpen(false);
            setSelectedTeacher(null);
          }}
        />
      )}
    </Card>
  );
};