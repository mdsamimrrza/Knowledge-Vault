import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { BookOpen, ArrowLeft } from "lucide-react";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-background">
      <div className="text-center space-y-6 max-w-md mx-4">
        <div className="w-16 h-16 rounded-2xl bg-secondary flex items-center justify-center mx-auto">
          <BookOpen className="w-8 h-8 text-muted-foreground" />
        </div>
        <div>
          <h1 className="text-4xl font-display font-bold text-foreground mb-2">404</h1>
          <p className="text-lg text-muted-foreground">
            The page you're looking for doesn't exist or has been moved.
          </p>
        </div>
        <Link href="/">
          <Button className="gap-2">
            <ArrowLeft className="w-4 h-4" />
            Back to Library
          </Button>
        </Link>
      </div>
    </div>
  );
}
