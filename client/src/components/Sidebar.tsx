import { useState } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, Star, Tag, Plus, Library, Menu, X, LogIn, LogOut, User, Mail, CalendarDays, Sun, Moon, Shield } from "lucide-react";
import { Button } from "./ui/button";
import { cn } from "@/lib/utils";
import { useUser, useLogout } from "@/hooks/use-auth";
import { useTheme } from "@/hooks/use-theme";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { format } from "date-fns";

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const [location] = useLocation();
  const { data: user } = useUser();
  const logoutMutation = useLogout();
  const { theme, toggleTheme } = useTheme();

  const navItems = [
    { icon: Library, label: "All Articles", href: "/", requiresAuth: false },
    { icon: Star, label: "Favorites", href: "/favorites", requiresAuth: true },
    { icon: Tag, label: "Tags", href: "/tags", requiresAuth: false },
    { icon: Shield, label: "Admin Panel", href: "/admin", requiresAuth: true, adminOnly: true },
  ];

  const handleLogout = async () => {
    // Redirect first to avoid protected page checks during logout
    window.location.href = "/";
    await logoutMutation.mutateAsync();
    onNavigate?.();
  };

  return (
    <>
      <div className="flex items-center gap-3 px-2">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
          <BookOpen className="w-5 h-5" />
        </div>
        <h1 className="font-display font-bold text-xl tracking-tight text-primary flex-1">Knowledge Vault</h1>
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="rounded-xl hover:bg-primary/5 text-primary"
        >
          {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
        </Button>
      </div>

      {user && (
        <div className="px-2 mb-2">
          <Link href="/new" onClick={onNavigate}>
            <Button className="w-full justify-start gap-2 h-10 bg-primary hover:bg-primary/90 border-none shadow-md shadow-primary/10 transition-all duration-300 font-semibold group rounded-xl">
              <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
              <span>New Article</span>
            </Button>
          </Link>
        </div>
      )}
      <nav className="flex-1 space-y-1">
        {navItems
          .filter(item => {
            if (item.requiresAuth && !user) return false;
            if (item.adminOnly && !user?.isAdmin) return false;
            return true;
          })
          .map((item) => {
            const isActive = location === item.href;
            return (
              <Link key={item.href} href={item.href} onClick={onNavigate} className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 nav-btn group",
                isActive 
                  ? "nav-btn-active" 
                  : "text-muted-foreground hover:text-primary hover:bg-primary/10"
              )}>
                <item.icon className={cn("w-4 h-4 transition-transform duration-300 group-hover:scale-110", isActive ? "text-white" : "text-primary/70")} />
                {item.label}
              </Link>
            );
          })}
      </nav>

      {/* User section */}
      <div className="space-y-3">
        {user ? (
          <div className="p-4 rounded-2xl bg-gradient-to-b from-card to-card/50 border border-border/50 shadow-premium space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-base shrink-0 border border-primary/20">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-foreground truncate">{user.username}</p>
                <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Verified Member</p>
              </div>
            </div>
            
            <div className="space-y-2 pt-2 border-t border-border/30">
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground/80 hover:text-foreground transition-colors group">
                <Mail className="w-3.5 h-3.5 shrink-0 group-hover:text-primary" />
                <span className="truncate">{user.email}</span>
              </div>
              <div className="flex items-center gap-2.5 text-xs text-muted-foreground/80 hover:text-foreground transition-colors group">
                <CalendarDays className="w-3.5 h-3.5 shrink-0 group-hover:text-primary" />
                <span>Since {new Date(user.createdAt).toLocaleDateString("en-US", { month: 'short', year: 'numeric' })}</span>
              </div>
            </div>

            <Button
              variant="secondary"
              size="sm"
              className="w-full justify-start gap-2 h-9 text-xs font-bold bg-primary/5 text-primary hover:bg-primary/10 border border-primary/10 rounded-xl transition-all duration-200"
              onClick={handleLogout}
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out Securely
            </Button>
          </div>
        ) : (
          <Link href="/auth" onClick={onNavigate}>
            <Button variant="outline" className="w-full justify-start gap-2">
              <LogIn className="w-4 h-4" />
              Sign In
            </Button>
          </Link>
        )}
      </div>
    </>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: user } = useUser();
  const logoutMutation = useLogout();
  const { theme, toggleTheme } = useTheme();

  return (
    <>
      {/* Mobile top bar */}
      <div className="md:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-card/95 backdrop-blur-sm border-b border-border flex items-center justify-between px-4">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 -ml-2 rounded-lg hover:bg-secondary transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-foreground" />
        </button>

        <Link href="/" className="flex items-center gap-2 flex-1 justify-center mr-8">
          <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center text-primary-foreground">
            <BookOpen className="w-4 h-4" />
          </div>
          <span className="font-display font-bold text-lg text-primary">Knowledge Vault</span>
        </Link>

        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="rounded-xl hover:bg-primary/5 text-primary mr-2"
        >
          {theme === "light" ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
        </Button>

        {user ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-bold text-sm shadow-md hover:scale-105 transition-transform">
                {user.username.charAt(0).toUpperCase()}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-64 glass-card p-3 rounded-2xl shadow-premium border-white/60">
              <DropdownMenuLabel className="p-0 font-normal">
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-semibold leading-none text-foreground">{user.username}</p>
                  <p className="text-xs leading-none text-muted-foreground">{user.email}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator className="my-3 opacity-50" />
              <div className="space-y-2 mb-3 px-1">
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground uppercase tracking-widest font-bold">
                  <CalendarDays className="w-3 h-3" />
                  Account Details
                </div>
                <div className="text-xs text-foreground/80 bg-secondary/50 p-2 rounded-lg border border-border/30">
                  <p>Member since:</p>
                  <p className="font-semibold">{format(new Date(user.createdAt), 'MMMM d, yyyy')}</p>
                </div>
              </div>
              <DropdownMenuItem
                className="rounded-xl focus:bg-primary/10 focus:text-primary gap-2 cursor-pointer font-bold py-2.5 text-xs text-primary bg-primary/5 hover:bg-primary/10 transition-colors"
                onClick={() => {
                  window.location.href = "/";
                  logoutMutation.mutate();
                }}
              >
                <LogOut className="w-4 h-4" />
                Sign Out Securely
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Link href="/auth">
            <Button size="sm" variant="outline" className="gap-1.5 h-8 text-xs rounded-xl">
              <LogIn className="w-3.5 h-3.5" />
              Sign In
            </Button>
          </Link>
        )}
      </div>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMobileOpen(false)} />
          <aside className="relative w-[280px] h-full bg-secondary/95 backdrop-blur-xl flex flex-col p-6 gap-8 shadow-2xl animate-in slide-in-from-left duration-300">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-4 p-1 rounded-md hover:bg-black/10 transition-colors"
              aria-label="Close menu"
            >
              <X className="w-5 h-5 text-muted-foreground" />
            </button>
            <SidebarContent onNavigate={() => setMobileOpen(false)} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className="w-72 border-r border-border/40 h-screen sticky top-0 glass-sidebar hidden md:flex flex-col p-6 gap-8">
        <SidebarContent />
      </aside>
    </>
  );
}
