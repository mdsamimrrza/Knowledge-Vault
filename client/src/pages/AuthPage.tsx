import { useState } from "react";
import { useLocation } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { registerSchema, loginSchema, type RegisterInput, type LoginInput } from "@shared/schema";
import { useLogin, useRegister, useUser } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { BookOpen, Loader2, ArrowLeft, Mail, KeyRound, ShieldAlert, CheckCircle2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";

export default function AuthPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [, setLocation] = useLocation();
  const { data: user, isLoading: authLoading } = useUser();

  // Redirect home if already logged in
  if (!authLoading && user) {
    setLocation("/");
    return null;
  }
  const loginMutation = useLogin();
  const registerMutation = useRegister();
  const { toast } = useToast();

  const loginForm = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const registerForm = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: { username: "", email: "", password: "" },
  });

  const handleLogin = async (data: LoginInput) => {
    try {
      await loginMutation.mutateAsync(data);
      toast({
        title: "Access Granted",
        description: "Welcome back to your Knowledge Vault.",
      });
      setLocation("/");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Login failed", description: err.message });
    }
  };

  const handleRegister = async (data: RegisterInput) => {
    try {
      await registerMutation.mutateAsync(data);
      toast({ title: "Account created!", description: "You're now logged in." });
      setLocation("/");
    } catch (err: any) {
      toast({ variant: "destructive", title: "Registration failed", description: err.message });
    }
  };

  const isPending = loginMutation.isPending || registerMutation.isPending;

  const [forgotPasswordStep, setForgotPasswordStep] = useState<"none" | "email" | "key" | "otp" | "reset">("none");
  const [resetEmail, setResetEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [resetMasterKey, setResetMasterKey] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Fully reset all fields and close the dialog
  const closeResetDialog = () => {
    setForgotPasswordStep("none");
    setResetEmail("");
    setResetOtp("");
    setResetMasterKey("");
    setNewPassword("");
    setResetLoading(false);
    setResetError(null);
  };

  const handleForgotPassword = async () => {
    setResetLoading(true);
    try {
      await apiRequest("POST", "/api/auth/forgot-password", { 
        email: resetEmail,
        masterKey: resetMasterKey || undefined
      });
      setResetError(null);
      toast({ title: "OTP Sent", description: "Please check your email for the verification code." });
      setResetOtp(""); // clear any stale OTP from previous attempt
      setForgotPasswordStep("otp");
    } catch (err: any) {
      if (err.message === "SECRET_KEY_REQUIRED") {
        setForgotPasswordStep("key");
        setResetError(null);
        toast({ title: "Super Admin Identity", description: "Master Key required for this account." });
      } else {
        setResetError(err.message);
      }
    } finally {
      setResetLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setResetLoading(true);
    setResetError(null);
    try {
      await apiRequest("POST", "/api/auth/verify-otp", { 
        email: resetEmail, 
        otp: resetOtp 
      });
      toast({ title: "Verified", description: "You can now set a new password." });
      setForgotPasswordStep("reset");
    } catch (err: any) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetPassword = async () => {
    setResetLoading(true);
    setResetError(null);
    try {
      await apiRequest("POST", "/api/auth/reset-password", { 
        email: resetEmail, 
        otp: resetOtp, 
        newPassword 
      });
      toast({ 
        title: "Success", 
        description: "Password reset successfully. You can now log in." 
      });
      closeResetDialog();
      setMode("login");
    } catch (err: any) {
      setResetError(err.message);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col lg:flex-row bg-background">
      {/* Left panel - Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">
          {/* Logo & Home link */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground">
                <BookOpen className="w-6 h-6" />
              </div>
              <h1 className="font-display font-bold text-2xl tracking-tight text-primary">Knowledge Vault</h1>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="gap-1.5 text-muted-foreground hover:text-primary"
              onClick={() => setLocation("/")}
            >
              <ArrowLeft className="w-4 h-4" />
              Home
            </Button>
          </div>

          <div>
            <h1 className="text-3xl md:text-5xl font-display font-bold text-foreground mb-6 leading-tight">
              {mode === "login" ? "Welcome back" : "Create account"}
            </h1>
            <p className="text-muted-foreground mt-2">
              {mode === "login"
                ? "Sign in to create, edit, and manage your articles."
                : "Join to start building your personal knowledge base."}
            </p>
          </div>

          {mode === "login" ? (
            <Form key="login" {...loginForm}>
              <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4" autoComplete="off">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field: { ref, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="email" placeholder="you@example.com" ref={ref} {...fieldProps} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field: { ref, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="current-password" placeholder="••••••" ref={ref} {...fieldProps} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Sign In
                </Button>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setForgotPasswordStep("email")}
                    className="text-xs text-muted-foreground hover:text-primary transition-colors"
                  >
                    Forgot your password?
                  </button>
                </div>
              </form>
            </Form>
          ) : (
            <Form key="register" {...registerForm}>
              <form onSubmit={registerForm.handleSubmit(handleRegister)} className="space-y-4" autoComplete="off">
                <FormField
                  control={registerForm.control}
                  name="username"
                  render={({ field: { ref, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormControl>
                        <Input autoComplete="username" placeholder="johndoe" ref={ref} {...fieldProps} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="email"
                  render={({ field: { ref, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input type="email" autoComplete="email" placeholder="you@example.com" ref={ref} {...fieldProps} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field: { ref, ...fieldProps } }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input type="password" autoComplete="new-password" placeholder="••••••" ref={ref} {...fieldProps} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isPending}>
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Create Account
                </Button>
              </form>
            </Form>
          )}

          <p className="text-center text-sm text-muted-foreground">
            {mode === "login" ? (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("register")}
                  className="text-primary font-medium hover:underline"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  onClick={() => setMode("login")}
                  className="text-primary font-medium hover:underline"
                >
                  Sign in
                </button>
              </>
            )}
          </p>
        </div>
      </div>

      {/* Right panel - Decorative */}
      <div className="hidden lg:flex flex-1 bg-gradient-to-br from-primary/10 via-primary/5 to-background items-center justify-center p-12">
        <div className="max-w-lg text-center space-y-6">
          <div className="w-20 h-20 mx-auto rounded-2xl bg-primary/10 flex items-center justify-center">
            <BookOpen className="w-10 h-10 text-primary" />
          </div>
          <h3 className="text-2xl font-display font-bold text-foreground">Your Personal Knowledge Hub</h3>
          <p className="text-muted-foreground leading-relaxed">
            Anyone can browse and read articles. Sign in to create, edit, favorite, and
            track changes — building your knowledge base your way.
          </p>
        </div>
      </div>

      {/* Forgot Password Flow */}
      <Dialog open={forgotPasswordStep !== "none"} onOpenChange={(open) => !open && closeResetDialog()}>
        <DialogContent className="sm:max-w-md glass-card border-primary/20 shadow-2xl">
          <DialogHeader>
            <DialogTitle className="text-2xl font-display font-bold text-center">
              {forgotPasswordStep === "email" && "Reset Password"}
              {forgotPasswordStep === "key" && "Super Admin Verify"}
              {forgotPasswordStep === "otp" && "Check Your Email"}
              {forgotPasswordStep === "reset" && "Create New Password"}
            </DialogTitle>
            <DialogDescription className="text-center">
              {forgotPasswordStep === "email" && "Enter your email address and we'll send you a 6-digit verification code."}
              {forgotPasswordStep === "key" && "Master Key required to authorize password reset for Super Admin."}
              {forgotPasswordStep === "otp" && `We've sent a code to ${resetEmail}. Enter it below to verify.`}
              {forgotPasswordStep === "reset" && "Enter your new secure password below."}
            </DialogDescription>
          </DialogHeader>

          {resetError && (
            <div className="mx-6 mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20 flex gap-3 items-center text-destructive animate-in fade-in slide-in-from-top-2 duration-300">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <p className="text-sm font-medium">{resetError}</p>
            </div>
          )}

          <div className="py-6 space-y-4">
            {/* STEP 1: Email */}
            {forgotPasswordStep === "email" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Email Address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="you@example.com"
                      className="pl-10 glass-card"
                      value={resetEmail}
                      onChange={(e) => setResetEmail(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !resetLoading && resetEmail && handleForgotPassword()}
                    />
                  </div>
                </div>
                <Button className="w-full h-11 font-bold" onClick={handleForgotPassword} disabled={resetLoading || !resetEmail}>
                  {resetLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Send Verification Code
                </Button>
              </div>
            )}

            {/* STEP 1.5: Master Key */}
            {forgotPasswordStep === "key" && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Master Key</Label>
                  <div className="relative">
                    <ShieldAlert className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input 
                      type="password"
                      placeholder="Enter Secret Master Key" 
                      className="pl-10 glass-card"
                      autoFocus
                      value={resetMasterKey}
                      onChange={(e) => setResetMasterKey(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && !resetLoading && resetMasterKey && handleForgotPassword()}
                    />
                  </div>
                </div>
                <Button className="w-full h-11 font-bold" onClick={handleForgotPassword} disabled={resetLoading || !resetMasterKey}>
                  {resetLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Verify Master Key
                </Button>
                <button type="button" className="w-full text-xs text-muted-foreground hover:underline" onClick={() => {
                  setResetMasterKey("");
                  setForgotPasswordStep("email");
                }}>← Back to email</button>
              </div>
            )}

            {/* STEP 2: OTP */}

            {forgotPasswordStep === "otp" && (
              <div className="space-y-6">
                <div className="space-y-2">
                  <div className="flex items-center justify-center gap-2 mb-4">
                    <Input
                      className="text-center text-2xl font-mono h-14 tracking-widest glass-card"
                      placeholder="000000"
                      maxLength={6}
                      value={resetOtp}
                      autoFocus
                      onChange={(e) => setResetOtp(e.target.value.replace(/\D/g, ""))}
                      onKeyDown={(e) => e.key === "Enter" && resetOtp.length === 6 && handleVerifyOtp()}
                    />
                  </div>
                  <p className="text-xs text-center text-muted-foreground">
                    Didn't get the code?{" "}
                    <button type="button" className="text-primary hover:underline" onClick={() => {
                      setResetOtp("");
                      handleForgotPassword();
                    }}>Resend</button>
                    {" · "}
                    <button type="button" className="text-muted-foreground hover:underline" onClick={() => {
                      setResetOtp("");
                      setForgotPasswordStep("email");
                    }}>← Change email</button>
                  </p>
                </div>
                <Button className="w-full h-11 font-bold" onClick={handleVerifyOtp} disabled={resetOtp.length !== 6 || resetLoading}>
                  {resetLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Verify Security Code
                </Button>
              </div>
            )}

            {/* STEP 3: New Password */}
            {forgotPasswordStep === "reset" && (
              <div className="space-y-6">
                <div className="bg-destructive/10 border border-destructive/20 rounded-xl p-4 flex gap-3">
                  <ShieldAlert className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                  <p className="text-xs text-destructive font-medium leading-relaxed">
                    <strong>Important:</strong> For security reasons, if this account has Administrator privileges, they will be <strong>revoked</strong> after password reset.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label>New Password</Label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      type="password"
                      placeholder="Minimum 6 characters"
                      className="pl-10 glass-card"
                      value={newPassword}
                      autoFocus
                      onChange={(e) => setNewPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && newPassword.length >= 6 && handleResetPassword()}
                    />
                  </div>
                </div>
                <Button className="w-full h-11 font-bold bg-primary hover:bg-primary/90" onClick={handleResetPassword} disabled={resetLoading || newPassword.length < 6}>
                  {resetLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                  Complete Reset
                </Button>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
