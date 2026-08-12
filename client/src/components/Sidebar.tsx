import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { BookOpen, Star, Tag, Plus, Library, Menu, X, LogIn, LogOut, User, Mail, CalendarDays, Sun, Moon, Shield, ChevronLeft, ChevronRight } from "lucide-react";
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "./ui/tooltip";

function SidebarContent({ onNavigate, isCollapsed }: { onNavigate?: () => void; isCollapsed?: boolean }) {
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
    window.location.href = "/";
    await logoutMutation.mutateAsync();
    onNavigate?.();
  };

  return (
    <>
      <div className="flex items-center justify-between gap-2 px-2">
        <Link href="/" className={cn("flex items-center gap-3 transition-all duration-300 hover:opacity-80 cursor-pointer", isCollapsed && "justify-center")}>
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center text-primary-foreground shrink-0">
            <BookOpen className="w-5 h-5" />
          </div>
          {!isCollapsed && <h1 className="font-display font-bold text-xl tracking-tight text-primary flex-1 truncate">Knowledge Vault</h1>}
        </Link>
        {!isCollapsed && (
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-xl hover:bg-primary/5 text-primary shrink-0"
          >
            {theme === "light" ? <Moon className="w-5 h-5" /> : <Sun className="w-5 h-5" />}
          </Button>
        )}
      </div>

      {user && (
        <div className={cn("px-2 mb-2 transition-all duration-300", isCollapsed && "px-0")}>
          <Link href="/new" onClick={onNavigate}>
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button className={cn(
                    "w-full justify-start gap-2 h-10 bg-primary hover:bg-primary/90 border-none shadow-md shadow-primary/10 transition-all duration-300 font-semibold group rounded-xl",
                    isCollapsed && "px-0 justify-center"
                  )}>
                    <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                    {!isCollapsed && <span>New Article</span>}
                  </Button>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="right">New Article</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
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
            const content = (
              <div className={cn(
                "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-300 nav-btn group w-full",
                isActive 
                  ? "nav-btn-active" 
                  : "text-muted-foreground hover:text-primary hover:bg-primary/10",
                isCollapsed && "px-0 justify-center"
              )}>
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <div className="flex items-center gap-3">
                        <item.icon className={cn("w-4 h-4 transition-transform duration-300 group-hover:scale-110 shrink-0", isActive ? "text-white" : "text-primary/70")} />
                        {!isCollapsed && <span className="truncate">{item.label}</span>}
                      </div>
                    </TooltipTrigger>
                    {isCollapsed && <TooltipContent side="right">{item.label}</TooltipContent>}
                  </Tooltip>
                </TooltipProvider>
              </div>
            );


            return (
              <Link key={item.href} href={item.href} onClick={() => onNavigate?.()} className="block w-full">
                {content}
              </Link>
            );
          })}
      </nav>


      {/* User section */}
      <div className="space-y-3">
        {user ? (
          <div className={cn(
            "p-4 rounded-2xl bg-gradient-to-b from-card to-card/50 border border-border/50 shadow-premium transition-all duration-300",
            isCollapsed && "p-2"
          )}>
            <div className={cn("flex items-center gap-3", isCollapsed && "justify-center")}>
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-bold text-base shrink-0 border border-primary/20">
                {user.username.charAt(0).toUpperCase()}
              </div>
              {!isCollapsed && (
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-foreground truncate">{user.username}</p>
                  <p className="text-[10px] text-muted-foreground uppercase tracking-wider font-semibold">Verified Member</p>
                </div>
              )}
            </div>
            
            {!isCollapsed && (
              <>
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
                  Sign Out
                </Button>
              </>
            )}
            
            {isCollapsed && (
              <div className="pt-2 border-t border-border/30 flex justify-center">
                <TooltipProvider>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-8 h-8 rounded-lg text-primary hover:bg-primary/10"
                        onClick={handleLogout}
                      >
                        <LogOut className="w-4 h-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent side="right">Sign Out</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}
          </div>
        ) : (
          <Link href="/auth" onClick={onNavigate}>
            <TooltipProvider>
              <Tooltip delayDuration={0}>
                <TooltipTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start gap-2", isCollapsed && "px-0 justify-center")}>
                    <LogIn className="w-4 h-4" />
                    {!isCollapsed && <span>Sign In</span>}
                  </Button>
                </TooltipTrigger>
                {isCollapsed && <TooltipContent side="right">Sign In</TooltipContent>}
              </Tooltip>
            </TooltipProvider>
          </Link>
        )}
      </div>
    </>
  );
}

export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("sidebar_collapsed") === "true";
    }
    return false;
  });
  
  const { data: user } = useUser();
  const logoutMutation = useLogout();
  const { theme, toggleTheme } = useTheme();

  useEffect(() => {
    localStorage.setItem("sidebar_collapsed", String(isCollapsed));
  }, [isCollapsed]);

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
            <SidebarContent onNavigate={() => setMobileOpen(false)} isCollapsed={false} />
          </aside>
        </div>
      )}

      {/* Desktop sidebar */}
      <aside className={cn(
        "border-r border-border/40 h-screen sticky top-0 glass-sidebar hidden md:flex flex-col p-6 gap-8 transition-all duration-300 ease-in-out relative group/sidebar",
        isCollapsed ? "w-[88px]" : "w-72"
      )}>
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(
            "absolute -right-3 top-12 w-6 h-6 rounded-full bg-primary flex items-center justify-center text-white shadow-lg border border-primary/20 opacity-0 group-hover/sidebar:opacity-100 transition-all duration-200 z-50 scale-90 hover:scale-110",
            "hover:bg-primary/90"
          )}
        >
          {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
        <SidebarContent isCollapsed={isCollapsed} />
      </aside>
    </>
  );
}
