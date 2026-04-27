import { cn } from "@/lib/utils";
import { useQuery, useMutation } from "@tanstack/react-query";

import { Sidebar } from "@/components/Sidebar";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { User, Article } from "@shared/schema";
import {
  Users,
  FileText,
  ShieldAlert,
  ShieldCheck,
  Ban,
  UserPlus,
  Search,
  Activity,
  History as HistoryIcon,
  Trash2,
  Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { format } from "date-fns";
import { useLocation } from "wouter";
import { useUser } from "@/hooks/use-auth";
import { useEffect } from "react";


export default function AdminPage() {
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const { data: user, isLoading: authLoading } = useUser();
  const [searchTerm, setSearchTerm] = useState("");

  const { data: users, isLoading: usersLoading } = useQuery<User[]>({
    queryKey: ["/api/admin/users"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/users");
      return res.json();
    }
  });

  const { data: stats, isLoading: statsLoading } = useQuery<any>({
    queryKey: ["/api/admin/stats"],
    queryFn: async () => {
      const res = await apiRequest("GET", "/api/admin/stats");
      return res.json();
    }
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: any }) => {
      const res = await apiRequest("PATCH", `/api/admin/users/${id}`, updates);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      toast({ title: "User updated successfully" });
    },
    onError: async (error: Error, variables) => {
      if (error.message === "EMAIL_OTP_REQUIRED") {
        const isPromoting = variables.updates.isAdmin === true;
        const isBanning = variables.updates.isBanned === true;
        const actionType = isPromoting ? "PROMOTE" : isBanning ? "BAN" : "DEMOTE";
        
        setPendingDemoteId(variables.id);
        setPendingActionType(actionType);
        setSelfDemoteStep("WAIT_OTP"); // Require manual OTP send
        setShowEmailOtp(true);
      } else if (error.message === "SECRET_KEY_REQUIRED") {
        setPendingDemoteId(variables.id);
        const actionType = (error as any).actionType || "SELF_DEMOTE";
        setPendingActionType(actionType);
        setSelfDemoteStep("KEY"); // Force start at key step
        setMasterKey("");
        setShowEmailOtp(true);
        toast({ title: "Super Admin Identity", description: "Master Key required for this action." });
      } else {
        toast({ variant: "destructive", title: "Error", description: error.message });
      }
    }
  });

  const [showEmailOtp, setShowEmailOtp] = useState(false);
  const [emailCode, setEmailCode] = useState("");
  const [pendingDemoteId, setPendingDemoteId] = useState<string | null>(null);
  const [pendingActionType, setPendingActionType] = useState<"DEMOTE" | "BAN" | "PROMOTE" | "DELETE" | "SELF_DEMOTE">("DEMOTE");
  const [selfDemoteStep, setSelfDemoteStep] = useState<"KEY" | "WAIT_OTP" | "OTP">("KEY");
  const [masterKey, setMasterKey] = useState("");
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    description: string;
    onConfirm: () => void;
    variant?: "default" | "destructive";
  }>({
    isOpen: false,
    title: "",
    description: "",
    onConfirm: () => {},
  });

  const verifyKeyMutation = useMutation({
    mutationFn: async ({ id, key }: { id: string; key: string }) => {
      await apiRequest("POST", `/api/admin/users/${id}/verify-master-key`, { key });
    },
    onSuccess: () => {
      setSelfDemoteStep("WAIT_OTP");
      toast({ title: "Key Verified", description: "Master Key accepted. You can now request the security OTP." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Verification Failed", description: error.message });
    }
  });

  const requestOtpMutation = useMutation({
    mutationFn: async ({ id, actionType }: { id: string; actionType: string }) => {
      await apiRequest("POST", `/api/admin/users/${id}/request-otp`, { actionType });
    },
    onSuccess: () => {
      setSelfDemoteStep("OTP");
      toast({ title: "OTP Sent", description: "A security code has been sent to your email." });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Failed to Send", description: error.message });
    }
  });

  const confirmDemoteMutation = useMutation({
    mutationFn: async ({ id, code }: { id: string; code?: string }) => {
      let endpoint = "confirm-demote";
      let payload: any = { code };
      
      if (pendingActionType === "BAN") endpoint = "confirm-ban";
      if (pendingActionType === "PROMOTE") endpoint = "confirm-promote";
      if (pendingActionType === "DELETE") endpoint = "confirm-delete";
      if (pendingActionType === "SELF_DEMOTE") endpoint = "confirm-self-demote";
      
      await apiRequest("POST", `/api/admin/users/${id}/${endpoint}`, payload);
    },
    onSuccess: (_, variables) => {
      setShowEmailOtp(false);
      setEmailCode("");
      setPendingDemoteId(null);
      setMasterKey("");
      setSelfDemoteStep("KEY");
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
      
      let title = "Action Completed";
      let desc = "The administrative action was successful.";
      
      if (pendingActionType === "BAN") {
        title = "User Banned";
        desc = "The user has been successfully suspended.";
      } else if (pendingActionType === "PROMOTE") {
        title = "Admin Promoted";
        desc = "The user now has administrative privileges.";
      } else if (pendingActionType === "DELETE") {
        title = "User Deleted";
        desc = "The user account has been permanently removed.";
      } else if (pendingActionType === "DEMOTE" || pendingActionType === "SELF_DEMOTE") {
        title = "Admin Demoted";
        desc = "The administrative rights have been successfully revoked.";
      }

      toast({ title, description: desc });
    },
    onError: (error: Error) => {
      toast({ variant: "destructive", title: "Verification Failed", description: error.message });
    }
  });

  const deleteUserMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      toast({ title: "Success", description: "User deleted successfully." });
    },
    onError: async (error: Error, variables) => {
      if (error.message === "EMAIL_OTP_REQUIRED") {
        setPendingDemoteId(variables);
        setPendingActionType("DELETE");
        setSelfDemoteStep("OTP"); // Skip to OTP input since we send it automatically below
        setShowEmailOtp(true);
        await apiRequest("POST", `/api/admin/users/${variables}/request-otp`, { actionType: "DELETE" });
        toast({ title: "Verification Required", description: "A security code has been sent to your email to authorize deletion." });
      } else {
        toast({ variant: "destructive", title: "Error", description: error.message });
      }
    }
  });

  // Redirect if not admin
  useEffect(() => {
    if (!authLoading && (!user || !user.isAdmin)) {
      setLocation("/");
      toast({
        variant: "destructive",
        title: "Access Denied",
        description: "You do not have permission to view this page."
      });
    }
  }, [user, authLoading, setLocation, toast]);

  if (authLoading || !user?.isAdmin) {
    return (
      <div className="h-screen w-screen flex items-center justify-center">
        <Activity className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }


  const filteredUsers = users?.filter(u =>
    u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    u.email.toLowerCase().includes(searchTerm.toLowerCase())
  );


  return (
    <div className="flex min-h-screen bg-background text-foreground">
      <Sidebar />

      <main className="flex-1 px-4 pt-16 pb-4 md:p-8 overflow-y-auto max-h-screen">
        <div className="max-w-6xl mx-auto space-y-8">

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-3xl font-display font-bold text-foreground">Admin Control Center</h2>
              <p className="text-muted-foreground mt-1">Global system management and user oversight</p>
            </div>
            <div className="bg-primary/5 px-4 py-2 rounded-xl border border-primary/10 flex items-center gap-2">
              <Activity className="w-4 h-4 text-primary animate-pulse" />
              <span className="text-sm font-bold text-primary uppercase tracking-wider">System Live</span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <Card className="glass-card border-white/10 hover:border-primary/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-1 px-3 md:px-6 pt-3 md:pt-6">
                <CardTitle className="text-[10px] md:text-sm font-bold text-muted-foreground uppercase tracking-wider">Total Users</CardTitle>
                <Users className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
              </CardHeader>
              <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
                <div className="text-xl md:text-2xl font-bold tracking-tight">{stats?.totalUsers || 0}</div>
              </CardContent>
            </Card>

            <Card className="glass-card border-white/10 hover:border-primary/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-1 px-3 md:px-6 pt-3 md:pt-6">
                <CardTitle className="text-[10px] md:text-sm font-bold text-muted-foreground uppercase tracking-wider">Articles</CardTitle>
                <FileText className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary" />
              </CardHeader>
              <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
                <div className="text-xl md:text-2xl font-bold tracking-tight">{stats?.totalArticles || 0}</div>
              </CardContent>
            </Card>

            <Card className="glass-card border-white/10 hover:border-green-500/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-1 px-3 md:px-6 pt-3 md:pt-6">
                <CardTitle className="text-[10px] md:text-sm font-bold text-muted-foreground uppercase tracking-wider">Admins</CardTitle>
                <ShieldCheck className="w-3.5 h-3.5 md:w-4 md:h-4 text-green-500" />
              </CardHeader>
              <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
                <div className="text-xl md:text-2xl font-bold tracking-tight">{stats?.adminUsers || 0}</div>
              </CardContent>
            </Card>

            <Card className="glass-card border-white/10 hover:border-destructive/30 transition-colors">
              <CardHeader className="flex flex-row items-center justify-between pb-1 px-3 md:px-6 pt-3 md:pt-6">
                <CardTitle className="text-[10px] md:text-sm font-bold text-muted-foreground uppercase tracking-wider">Suspended</CardTitle>
                <ShieldAlert className="w-3.5 h-3.5 md:w-4 md:h-4 text-destructive" />
              </CardHeader>
              <CardContent className="px-3 md:px-6 pb-3 md:pb-6">
                <div className="text-xl md:text-2xl font-bold tracking-tight">{stats?.bannedUsers || 0}</div>
              </CardContent>
            </Card>
          </div>

          {/* User Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <h3 className="text-xl font-display font-bold">User Management</h3>
              <div className="relative w-full md:w-72">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Filter by name or email..."
                  className="pl-10 glass-card"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            <div className="md:glass-card md:rounded-2xl md:overflow-hidden md:border md:border-white/10">
              {/* Desktop Table View */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent border-white/10">
                      <TableHead>User</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers?.map((u) => (
                      <TableRow key={u.id} className="border-white/5 hover:bg-white/5 transition-colors">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                              {u.username.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-sm leading-none">{u.username}</p>
                              <p className="text-xs text-muted-foreground mt-1">{u.email}</p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {format(new Date(u.createdAt), 'MMM d, yyyy')}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            {u.isAdmin && (
                              <span className="bg-green-500/10 text-green-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-green-500/20">
                                Admin
                              </span>
                            )}
                            {u.isBanned && (
                              <span className="bg-destructive/10 text-destructive text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-destructive/20">
                                Banned
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className={u.isAdmin ? "text-amber-500 hover:text-amber-600 hover:bg-amber-500/10" : "text-green-500 hover:text-green-600 hover:bg-green-500/10"}
                              onClick={() => updateUserMutation.mutate({ id: u.id, updates: { isAdmin: !u.isAdmin } })}
                              disabled={updateUserMutation.isPending || deleteUserMutation.isPending || (u.isBanned && !u.isAdmin)}
                              title={u.isBanned && !u.isAdmin ? "Unban user first to promote" : ""}
                            >
                              {updateUserMutation.isPending && pendingDemoteId === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : u.isAdmin ? <HistoryIcon className="w-3.5 h-3.5 mr-1" /> : <ShieldCheck className="w-3.5 h-3.5 mr-1" />}
                              {u.isAdmin ? "Demote" : "Promote"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setConfirmDialog({
                                  isOpen: true,
                                  title: u.isBanned ? 'Unban User' : 'Ban User',
                                  description: `Are you sure you want to ${u.isBanned ? 'unban' : 'ban'} ${u.username}? This will change their system access immediately.`,
                                  onConfirm: () => updateUserMutation.mutate({ id: u.id, updates: { isBanned: !u.isBanned } }),
                                  variant: "destructive"
                                });
                              }}
                              disabled={updateUserMutation.isPending || deleteUserMutation.isPending || u.id === user?.id}
                            >
                              {updateUserMutation.isPending && pendingDemoteId === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Ban className="w-3.5 h-3.5 mr-1" />}
                              {u.isBanned ? "Unban" : "Ban User"}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setConfirmDialog({
                                  isOpen: true,
                                  title: 'Permanently Delete User',
                                  description: `ARE YOU SURE? This will permanently delete ${u.username}'s account. This action cannot be undone.`,
                                  onConfirm: () => deleteUserMutation.mutate(u.id),
                                  variant: "destructive"
                                });
                              }}
                              disabled={updateUserMutation.isPending || deleteUserMutation.isPending || u.id === user?.id}
                            >
                              {deleteUserMutation.isPending && pendingDemoteId === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" /> : <Trash2 className="w-3.5 h-3.5 mr-1" />}
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Mobile Card View */}
              <div className="grid grid-cols-1 gap-4 md:hidden">
                {filteredUsers?.map((u) => (
                  <div key={u.id} className="glass-card rounded-2xl p-4 border border-white/10 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold">
                          {u.username.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-bold text-sm">{u.username}</p>
                          <p className="text-xs text-muted-foreground">{u.email}</p>
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        {u.isAdmin && (
                          <span className="bg-green-500/10 text-green-500 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-green-500/20">
                            Admin
                          </span>
                        )}
                        {u.isBanned && (
                          <span className="bg-destructive/10 text-destructive text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider border border-destructive/20">
                            Banned
                          </span>
                        )}
                      </div>
                    </div>
                    
                    <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                      <div className="flex gap-1">
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`w-10 h-10 rounded-xl ${u.isAdmin ? "text-amber-500 bg-amber-500/5" : "text-green-500 bg-green-500/5"}`}
                          onClick={() => updateUserMutation.mutate({ id: u.id, updates: { isAdmin: !u.isAdmin } })}
                          disabled={updateUserMutation.isPending || deleteUserMutation.isPending || (u.isBanned && !u.isAdmin)}
                          title={u.isAdmin ? "Demote" : u.isBanned ? "Unban to promote" : "Promote"}
                        >
                          {updateUserMutation.isPending && pendingDemoteId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : u.isAdmin ? <HistoryIcon className="w-4 h-4" /> : <ShieldCheck className="w-4 h-4" />}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-10 h-10 rounded-xl text-destructive bg-destructive/5"
                          onClick={() => {
                            setConfirmDialog({
                              isOpen: true,
                              title: u.isBanned ? 'Unban User' : 'Ban User',
                              description: `Are you sure you want to ${u.isBanned ? 'unban' : 'ban'} ${u.username}?`,
                              onConfirm: () => updateUserMutation.mutate({ id: u.id, updates: { isBanned: !u.isBanned } }),
                              variant: "destructive"
                            });
                          }}
                          disabled={updateUserMutation.isPending || deleteUserMutation.isPending || u.id === user?.id}
                          title={u.isBanned ? "Unban" : "Ban User"}
                        >
                          {updateUserMutation.isPending && pendingDemoteId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ban className="w-4 h-4" />}
                        </Button>
                      </div>
                      
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-10 h-10 rounded-xl text-destructive bg-destructive/5"
                        onClick={() => {
                          setConfirmDialog({
                            isOpen: true,
                            title: 'Permanently Delete User',
                            description: `Delete ${u.username}? This action cannot be undone.`,
                            onConfirm: () => deleteUserMutation.mutate(u.id),
                            variant: "destructive"
                          });
                        }}
                        disabled={updateUserMutation.isPending || deleteUserMutation.isPending || u.id === user?.id}
                        title="Delete User"
                      >
                        {deleteUserMutation.isPending && pendingDemoteId === u.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Email OTP Verification for High-Risk Actions */}
      {showEmailOtp && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-background/80 backdrop-blur-md animate-in fade-in duration-300">
          <Card className="w-full max-w-md shadow-2xl border-destructive/20 overflow-hidden">
            <div className="bg-destructive/10 p-4 flex items-center gap-3 border-b border-destructive/10">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              <span className="font-bold text-destructive text-sm uppercase tracking-wider">High Risk Action</span>
            </div>
            <CardHeader className="text-center">
              <CardTitle className="text-2xl font-display font-bold">
                {pendingActionType === "DEMOTE" && (selfDemoteStep === "KEY" ? "Super Admin: Verify Master Key" : "Confirm Admin Demotion")}
                {pendingActionType === "BAN" && "Confirm User Ban"}
                {pendingActionType === "PROMOTE" && (selfDemoteStep === "KEY" ? "Super Admin: Verify Master Key" : "Confirm Admin Promotion")}
                {pendingActionType === "DELETE" && "Confirm Permanent Deletion"}
                {pendingActionType === "SELF_DEMOTE" && (selfDemoteStep === "KEY" ? "Super Admin: Verify Master Key" : "Super Admin: Final Email OTP")}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                {selfDemoteStep === "KEY" 
                  ? "Step 1/2: Please enter your Secret Master Key to proceed." 
                  : selfDemoteStep === "WAIT_OTP"
                    ? "Click 'Send OTP' to receive the security code to your email."
                    : "Please enter the 6-digit verification code sent to your email to authorize this change."}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                {selfDemoteStep === "KEY" ? (
                  <Input
                    type="password"
                    placeholder="Enter Secret Master Key"
                    className="text-center glass-card h-14"
                    value={masterKey}
                    onChange={(e) => setMasterKey(e.target.value)}
                  />
                ) : selfDemoteStep === "WAIT_OTP" ? (
                  <div className="flex items-center justify-center p-4">
                    <p className="text-sm font-medium text-emerald-500">Ready to send security OTP.</p>
                  </div>
                ) : (
                  <Input
                    placeholder="Enter Email Code"
                    className="text-center text-2xl font-mono glass-card h-14 tracking-widest"
                    maxLength={6}
                    value={emailCode}
                    onChange={(e) => setEmailCode(e.target.value)}
                  />
                )}
              </div>
              <div className="flex gap-3">
                <Button variant="ghost" className="flex-1 rounded-xl h-11" onClick={() => {
                  setShowEmailOtp(false);
                  setPendingDemoteId(null);
                  setEmailCode("");
                  setMasterKey("");
                  setSelfDemoteStep("KEY");
                }}>Cancel</Button>
                
                {selfDemoteStep === "KEY" && (
                  <Button 
                    className="flex-1 rounded-xl h-11 font-bold bg-destructive hover:bg-destructive/90" 
                    onClick={() => verifyKeyMutation.mutate({ id: pendingDemoteId!, key: masterKey })} 
                    disabled={!masterKey || verifyKeyMutation.isPending}
                  >
                    {verifyKeyMutation.isPending ? "Verifying..." : "Verify Key"}
                  </Button>
                )}

                {selfDemoteStep === "WAIT_OTP" && (
                  <Button 
                    className="flex-1 rounded-xl h-11 font-bold bg-primary hover:bg-primary/90 text-primary-foreground" 
                    onClick={() => requestOtpMutation.mutate({ id: pendingDemoteId!, actionType: pendingActionType })} 
                    disabled={requestOtpMutation.isPending}
                  >
                    {requestOtpMutation.isPending ? "Sending..." : "Send OTP"}
                  </Button>
                )}

                {selfDemoteStep === "OTP" && (
                  <Button 
                    className="flex-1 rounded-xl h-11 font-bold bg-destructive hover:bg-destructive/90" 
                    onClick={() => confirmDemoteMutation.mutate({ id: pendingDemoteId!, code: emailCode })} 
                    disabled={emailCode.length !== 6 || confirmDemoteMutation.isPending}
                  >
                    {confirmDemoteMutation.isPending ? "Processing..." : "Confirm Action"}
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Proper Confirmation Dialog */}
      <AlertDialog 
        open={confirmDialog.isOpen} 
        onOpenChange={(open) => setConfirmDialog(prev => ({ ...prev, isOpen: open }))}
      >
        <AlertDialogContent className="glass-card border-white/10 shadow-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-2xl font-display font-bold flex items-center gap-2">
              <ShieldAlert className={cn("w-6 h-6", confirmDialog.variant === "destructive" ? "text-destructive" : "text-primary")} />
              {confirmDialog.title}
            </AlertDialogTitle>
            <AlertDialogDescription className="text-base text-muted-foreground pt-2">
              {confirmDialog.description}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-3 sm:gap-0">
            <AlertDialogCancel className="rounded-xl h-11 bg-white/5 border-white/10 hover:bg-white/10">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDialog.onConfirm}
              className={cn(
                "rounded-xl h-11 font-bold",
                confirmDialog.variant === "destructive" 
                  ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" 
                  : "bg-primary text-primary-foreground hover:bg-primary/90"
              )}
            >
              Confirm Action
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
