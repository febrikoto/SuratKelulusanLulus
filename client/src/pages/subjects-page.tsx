import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Pencil, Trash2, PlusCircle, FileUp, RefreshCw } from 'lucide-react';
import { Subject } from '@shared/schema';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";

// Import header components based on user role
import { AdminHeader } from "@/components/AdminHeader";
import { TeacherHeader } from "@/components/TeacherHeader";
import { StudentHeader } from "@/components/StudentHeader";

// Form schema for subjects
const subjectFormSchema = z.object({
  code: z.string().min(1, "Kode mata pelajaran harus diisi"),
  name: z.string().min(1, "Nama mata pelajaran harus diisi"),
  group: z.string().min(1, "Kelompok harus diisi"),
  credits: z.number().min(1, "Urutan harus diisi"),
  major: z.string().default("semua"),
  status: z.string().default("aktif"),
});

type SubjectFormValues = z.infer<typeof subjectFormSchema>;

// File import schema
const fileImportSchema = z.object({
  file: z.instanceof(File),
});

type FileImportValues = z.infer<typeof fileImportSchema>;

export default function SubjectsPage() {
  const { user, logoutMutation } = useAuth();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedGroup, setSelectedGroup] = useState<string | null>(null);
  const [selectedMajor, setSelectedMajor] = useState<string | null>(null);
  const [openSubjectModal, setOpenSubjectModal] = useState(false);
  const [openImportModal, setOpenImportModal] = useState(false);
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [editSubjectId, setEditSubjectId] = useState<number | null>(null);
  const [deleteSubjectId, setDeleteSubjectId] = useState<number | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [entriesPerPage, setEntriesPerPage] = useState(10);
  const [currentPage, setCurrentPage] = useState(1);

  // Form setup
  const form = useForm<SubjectFormValues>({
    resolver: zodResolver(subjectFormSchema),
    defaultValues: {
      code: "",
      name: "",
      group: "A",
      credits: 1,
      major: "semua",
      status: "aktif",
    },
  });

  // Reset form when modal is closed
  useEffect(() => {
    if (!openSubjectModal) {
      setEditSubjectId(null);
      form.reset();
    }
  }, [openSubjectModal, form]);

  // Fetch subjects
  const { data: subjects, isLoading, refetch } = useQuery<Subject[]>({
    queryKey: ['/api/subjects'],
    enabled: !!user,
  });

  // Initialize mutation for creating/updating subjects
  const subjectMutation = useMutation({
    mutationFn: async (data: SubjectFormValues) => {
      if (editSubjectId) {
        const response = await apiRequest('PUT', `/api/subjects/${editSubjectId}`, data);
        return response.json();
      } else {
        const response = await apiRequest('POST', '/api/subjects', data);
        return response.json();
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subjects'] });
      setOpenSubjectModal(false);
      toast({
        title: editSubjectId ? "Mata pelajaran diperbarui" : "Mata pelajaran ditambahkan",
        description: editSubjectId 
          ? "Mata pelajaran berhasil diperbarui" 
          : "Mata pelajaran baru berhasil ditambahkan",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal",
        description: error.message || "Terjadi kesalahan, silakan coba lagi",
        variant: "destructive",
      });
    },
  });

  // Initialize mutation for deleting subjects
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest('DELETE', `/api/subjects/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/subjects'] });
      setOpenDeleteModal(false);
      toast({
        title: "Berhasil dihapus",
        description: "Mata pelajaran berhasil dihapus",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal menghapus",
        description: error.message || "Terjadi kesalahan saat menghapus mata pelajaran",
        variant: "destructive",
      });
    },
  });

  // Initialize mutation for importing subjects from CSV
  const importMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch('/api/subjects/import', {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Terjadi kesalahan saat mengimpor mata pelajaran');
      }
      
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['/api/subjects'] });
      setOpenImportModal(false);
      setCsvFile(null);
      toast({
        title: "Import berhasil",
        description: `${data.imported} mata pelajaran berhasil diimpor`,
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Gagal mengimpor",
        description: error.message || "Terjadi kesalahan saat mengimpor mata pelajaran",
        variant: "destructive",
      });
    },
  });

  // Handle form submission
  const onSubmit = (data: SubjectFormValues) => {
    subjectMutation.mutate(data);
  };

  // Handle edit subject
  const handleEditSubject = (subject: Subject) => {
    setEditSubjectId(subject.id);
    form.reset({
      code: subject.code,
      name: subject.name,
      group: subject.group,
      credits: subject.credits,
      major: subject.major || "semua",
      status: subject.status,
    });
    setOpenSubjectModal(true);
  };

  // Handle delete subject
  const handleDeleteSubject = (id: number) => {
    setDeleteSubjectId(id);
    setOpenDeleteModal(true);
  };

  // Handle delete confirmation
  const confirmDelete = () => {
    if (deleteSubjectId) {
      deleteMutation.mutate(deleteSubjectId);
    }
  };

  // Handle file selection for import
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setCsvFile(e.target.files[0]);
    }
  };

  // Handle import submission
  const handleImport = () => {
    if (csvFile) {
      importMutation.mutate(csvFile);
    }
  };

  // Filter and paginate subjects
  const filteredSubjects = subjects
    ? subjects.filter(subject => {
        const matchesSearch = 
          subject.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          subject.code.toLowerCase().includes(searchTerm.toLowerCase());
        
        const matchesGroup = selectedGroup 
          ? subject.group === selectedGroup 
          : true;
        
        const matchesMajor = selectedMajor 
          ? subject.major === selectedMajor 
          : true;
        
        return matchesSearch && matchesGroup && matchesMajor;
      })
    : [];

  const totalPages = Math.ceil(filteredSubjects.length / entriesPerPage);
  const startIndex = (currentPage - 1) * entriesPerPage;
  const endIndex = startIndex + entriesPerPage;
  const currentSubjects = filteredSubjects.slice(startIndex, endIndex);

  // Generate options for pagination
  const entriesOptions = [10, 25, 50, 100];

  // Get unique groups for filter
  const uniqueGroups = subjects 
    ? Array.from(new Set(subjects.map(subject => subject.group)))
    : [];

  // Get unique majors for filter
  const uniqueMajors = subjects 
    ? Array.from(new Set(subjects.map(subject => subject.major)))
    : [];

  // Render the appropriate header based on user role
  const renderHeader = () => {
    if (!user) return null;
    
    if (user.role === 'admin') {
      return <AdminHeader user={user} onLogout={() => logoutMutation.mutate()} />;
    } else if (user.role === 'guru') {
      return <TeacherHeader user={user} onLogout={() => logoutMutation.mutate()} />;
    } else {
      return <StudentHeader user={user} onLogout={() => logoutMutation.mutate()} />;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {renderHeader()}
      
      <div className="container mx-auto py-6">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-2xl">Daftar Mata Pelajaran</CardTitle>
                <CardDescription>
                  Kelola mata pelajaran untuk sertifikat kelulusan
                </CardDescription>
              </div>
              {user?.role === 'admin' && (
                <div className="flex gap-2">
                  <Button onClick={() => setOpenImportModal(true)}>
                    <FileUp className="mr-2 h-4 w-4" />
                    Import
                  </Button>
                  <Button onClick={() => setOpenSubjectModal(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Tambah
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col md:flex-row justify-between items-center mb-4 gap-2">
              <div className="flex gap-2 w-full md:w-auto">
                <Button
                  variant="outline"
                  onClick={() => refetch()}
                  className="h-10"
                >
                  <RefreshCw className="h-4 w-4 mr-1" />
                  Refresh
                </Button>
                <div className="flex items-center gap-2">
                  <span>Show</span>
                  <Select
                    value={entriesPerPage.toString()}
                    onValueChange={(val) => {
                      setEntriesPerPage(parseInt(val));
                      setCurrentPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[70px] h-10">
                      <SelectValue placeholder="10" />
                    </SelectTrigger>
                    <SelectContent>
                      {entriesOptions.map((option) => (
                        <SelectItem key={option} value={option.toString()}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <span>entries</span>
                </div>
              </div>
              
              <div className="flex flex-wrap gap-2 w-full md:w-auto">
                <div>
                  <Select
                    value={selectedGroup || "all"}
                    onValueChange={(val) => setSelectedGroup(val === "all" ? null : val)}
                  >
                    <SelectTrigger className="w-[120px] h-10">
                      <SelectValue placeholder="Kelompok" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua</SelectItem>
                      {uniqueGroups.map((group) => (
                        <SelectItem key={group} value={group}>
                          Kelompok {group}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Select
                    value={selectedMajor || "all"}
                    onValueChange={(val) => setSelectedMajor(val === "all" ? null : val)}
                  >
                    <SelectTrigger className="w-[120px] h-10">
                      <SelectValue placeholder="Jurusan" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua</SelectItem>
                      {uniqueMajors.map((major) => (
                        <SelectItem key={major} value={major === null ? "no-value" : major}>
                          {major === 'semua' ? 'Semua Jurusan' : major}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Input
                    placeholder="Search..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="h-10 w-full md:w-[200px]"
                  />
                </div>
              </div>
            </div>
            
            <div className="border rounded-md overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-[50px]"># </TableHead>
                    <TableHead>Kode</TableHead>
                    <TableHead>Mata Pelajaran</TableHead>
                    <TableHead>Kelompok</TableHead>
                    <TableHead>No Urut</TableHead>
                    <TableHead>Jurusan</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[120px]">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10">
                        <div className="flex justify-center">
                          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                        </div>
                        <div className="mt-2 text-muted-foreground">
                          Memuat data...
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : currentSubjects.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-10">
                        <div className="text-muted-foreground">
                          Tidak ada data mata pelajaran
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    currentSubjects.map((subject, idx) => (
                      <TableRow key={subject.id}>
                        <TableCell>{startIndex + idx + 1}</TableCell>
                        <TableCell>{subject.code}</TableCell>
                        <TableCell>{subject.name}</TableCell>
                        <TableCell>{subject.group}</TableCell>
                        <TableCell>{subject.credits}</TableCell>
                        <TableCell>
                          {subject.major === 'semua' 
                            ? 'Semua Jurusan' 
                            : subject.major}
                        </TableCell>
                        <TableCell>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            subject.status === 'aktif' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {subject.status}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleEditSubject(subject)}
                              className="h-8 w-8"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              onClick={() => handleDeleteSubject(subject.id)}
                              className="h-8 w-8 text-red-500 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            
            {/* Pagination */}
            <div className="flex justify-between items-center mt-4">
              <div className="text-sm text-muted-foreground">
                Showing {filteredSubjects.length > 0 ? startIndex + 1 : 0} to {Math.min(endIndex, filteredSubjects.length)} of {filteredSubjects.length} entries
              </div>
              <div className="flex gap-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </Button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                  <Button
                    key={page}
                    variant={page === currentPage ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCurrentPage(page)}
                  >
                    {page}
                  </Button>
                ))}
                
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      {/* Add/Edit Subject Modal */}
      <Dialog open={openSubjectModal} onOpenChange={setOpenSubjectModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>
              {editSubjectId ? 'Edit Mata Pelajaran' : 'Tambah Mata Pelajaran'}
            </DialogTitle>
            <DialogDescription>
              {editSubjectId 
                ? 'Perbarui data mata pelajaran yang sudah ada' 
                : 'Tambahkan mata pelajaran baru ke dalam sistem'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kode</FormLabel>
                      <FormControl>
                        <Input placeholder="contoh: MTK" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="credits"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>No Urut</FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          {...field}
                          onChange={e => field.onChange(parseInt(e.target.value) || 1)}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nama Mata Pelajaran</FormLabel>
                    <FormControl>
                      <Input placeholder="contoh: Matematika" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="group"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Kelompok</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih kelompok" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="A">A</SelectItem>
                          <SelectItem value="B">B</SelectItem>
                          <SelectItem value="C">C</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="major"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Jurusan</FormLabel>
                      <Select
                        value={field.value}
                        onValueChange={field.onChange}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Pilih jurusan" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="semua">Semua Jurusan</SelectItem>
                          <SelectItem value="MIPA">MIPA</SelectItem>
                          <SelectItem value="IPS">IPS</SelectItem>
                          <SelectItem value="BAHASA">BAHASA</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="aktif">Aktif</SelectItem>
                        <SelectItem value="nonaktif">Nonaktif</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <DialogClose asChild>
                  <Button variant="outline" type="button">Batal</Button>
                </DialogClose>
                <Button 
                  type="submit"
                  disabled={subjectMutation.isPending}
                >
                  {subjectMutation.isPending && (
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editSubjectId ? 'Update' : 'Simpan'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      
      {/* Import CSV Modal */}
      <Dialog open={openImportModal} onOpenChange={setOpenImportModal}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Import Mata Pelajaran</DialogTitle>
            <DialogDescription>
              Upload file CSV untuk mengimpor mata pelajaran secara massal
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="border rounded-md p-4">
              <div className="text-sm font-medium mb-2">Format CSV:</div>
              <div className="text-xs text-muted-foreground mb-2">
                Pastikan file CSV Anda memiliki header dan kolom berikut:
              </div>
              <code className="text-xs block bg-muted p-2 rounded-md">
                code,name,group,credits,major,status
              </code>
              <div className="text-xs text-muted-foreground mt-2">
                Contoh isi: MTK,Matematika,A,1,semua,aktif
              </div>
            </div>
            
            <div className="grid gap-2">
              <label htmlFor="file-upload" className="text-sm font-medium">
                Pilih File CSV
              </label>
              <Input
                id="file-upload"
                type="file"
                accept=".csv"
                onChange={handleFileChange}
              />
              {csvFile && (
                <div className="text-sm text-muted-foreground">
                  File terpilih: {csvFile.name}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Batal</Button>
            </DialogClose>
            <Button 
              onClick={handleImport}
              disabled={!csvFile || importMutation.isPending}
            >
              {importMutation.isPending && (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              )}
              Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Modal */}
      <Dialog open={openDeleteModal} onOpenChange={setOpenDeleteModal}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Hapus Mata Pelajaran</DialogTitle>
            <DialogDescription>
              Apakah Anda yakin ingin menghapus mata pelajaran ini? Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline">Batal</Button>
            </DialogClose>
            <Button 
              variant="destructive" 
              onClick={confirmDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              )}
              Hapus
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}