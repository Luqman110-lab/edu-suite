
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Users, Search, UserPlus, CheckCircle, XCircle, Key, RefreshCw, Copy, Check } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";

interface Guardian {
    id: number;
    name: string;
    relationship: string;
    phoneNumber: string;
    email: string;
    userId: number | null;
    studentCount: number;
    username?: string;
}

export function ParentManagement() {
    const [search, setSearch] = useState("");
    const [inviteGuardian, setInviteGuardian] = useState<Guardian | null>(null);
    const [credentials, setCredentials] = useState<{ username: string; password: string } | null>(null);
    const [copied, setCopied] = useState(false);
    const { toast } = useToast();
    const queryClient = useQueryClient();

    const { data: guardians, isLoading } = useQuery<Guardian[]>({
        queryKey: ['admin-guardians', search],
        queryFn: async () => {
            const res = await fetch(`/api/guardians?search=${search}`);
            if (!res.ok) throw new Error("Failed to fetch guardians");
            return res.json();
        }
    });

    const inviteMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/guardians/${id}/invite`, { method: "POST" });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || "Failed to invite");
            }
            return res.json();
        },
        onSuccess: (data) => {
            setCredentials(data.credentials);
            queryClient.invalidateQueries({ queryKey: ['admin-guardians'] });
            toast({ title: "Account Created", description: "Parent account has been created successfully." });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const resetPasswordMutation = useMutation({
        mutationFn: async (id: number) => {
            const res = await fetch(`/api/guardians/${id}/reset-password`, { method: "POST" });
            if (!res.ok) throw new Error("Failed to reset password");
            return res.json();
        },
        onSuccess: (data) => {
            setCredentials(data.credentials);
            toast({ title: "Password Reset", description: "New password generated." });
        },
        onError: (err: Error) => {
            toast({ title: "Error", description: err.message, variant: "destructive" });
        }
    });

    const handleInvite = () => {
        if (inviteGuardian) {
            inviteMutation.mutate(inviteGuardian.id);
        }
    };

    const copyCredentials = () => {
        if (credentials) {
            const text = `Username: ${credentials.username}\nPassword: ${credentials.password}\nLogin at: ${window.location.origin}/login`;
            navigator.clipboard.writeText(text);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
            toast({ title: "Copied", description: "Credentials copied to clipboard" });
        }
    };

    const closeDialog = () => {
        setInviteGuardian(null);
        setCredentials(null);
    };

    const filteredGuardians = guardians?.filter(g =>
        g.name.toLowerCase().includes(search.toLowerCase()) ||
        (g.phoneNumber && g.phoneNumber.includes(search))
    );

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Parent Access Management</h1>
                    <p className="text-muted-foreground">Manage parent accounts and portal access.</p>
                </div>
            </div>

            <Card>
                <CardHeader>
                    <div className="flex items-center justify-between">
                        <CardTitle>Guardians</CardTitle>
                        <div className="relative w-64">
                            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder="Search by name or phone..."
                                className="pl-8"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Guardian Name</TableHead>
                                <TableHead>Contact</TableHead>
                                <TableHead>Children</TableHead>
                                <TableHead>Account Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4">Loading...</TableCell>
                                </TableRow>
                            ) : filteredGuardians?.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">No guardians found.</TableCell>
                                </TableRow>
                            ) : (
                                filteredGuardians?.map((guardian) => (
                                    <TableRow key={guardian.id}>
                                        <TableCell className="font-medium">
                                            {guardian.name}
                                            <div className="text-xs text-muted-foreground">{guardian.relationship}</div>
                                        </TableCell>
                                        <TableCell>{guardian.phoneNumber || guardian.email || '-'}</TableCell>
                                        <TableCell>{guardian.studentCount} Student(s)</TableCell>
                                        <TableCell>
                                            {guardian.userId ? (
                                                <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200 gap-1">
                                                    <CheckCircle className="w-3 h-3" /> Active
                                                    <span className="text-xs text-muted-foreground ml-1">({guardian.username})</span>
                                                </Badge>
                                            ) : (
                                                <Badge variant="outline" className="bg-gray-50 text-gray-500 gap-1">
                                                    <XCircle className="w-3 h-3" /> Not Invited
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {guardian.userId ? (
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => {
                                                        setInviteGuardian(guardian);
                                                        resetPasswordMutation.mutate(guardian.id);
                                                    }}
                                                    title="Reset Password"
                                                >
                                                    <RefreshCw className="w-4 h-4 text-orange-600" />
                                                </Button>
                                            ) : (
                                                <Button
                                                    size="sm"
                                                    className="gap-2"
                                                    onClick={() => {
                                                        setInviteGuardian(guardian);
                                                        inviteMutation.mutate(guardian.id);
                                                    }}
                                                >
                                                    <UserPlus className="w-4 h-4" /> Enable Access
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>

            <Dialog open={!!inviteGuardian && !!credentials} onOpenChange={closeDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Parent Account Details</DialogTitle>
                        <DialogDescription>
                            Share these credentials with <strong>{inviteGuardian?.name}</strong>.
                            They can use them to log in to the Parent Portal.
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-4 py-4">
                        <div className="bg-slate-950 text-slate-50 p-4 rounded-lg font-mono text-sm space-y-2 relative">
                            <div className="flex justify-between items-center">
                                <span>Username: <span className="text-green-400">{credentials?.username}</span></span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span>Password: <span className="text-green-400">{credentials?.password}</span></span>
                            </div>
                            <Button
                                size="icon"
                                variant="ghost"
                                className="absolute top-2 right-2 text-white hover:bg-white/20"
                                onClick={copyCredentials}
                            >
                                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            Note: This password is temporary. The parent should change it after logging in (feature pending).
                        </p>
                    </div>

                    <DialogFooter>
                        <Button onClick={closeDialog}>Done</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
