import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function SetupAdmin() {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const createAdminAccount = async () => {
    setLoading(true);
    try {
      const response = await fetch('https://ntzcpsdackxlvqmkifyp.supabase.co/functions/v1/create-admin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create admin account');
      }

      toast({
        title: "Success",
        description: "Admin account created successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Setup Admin Account</CardTitle>
          <CardDescription>
            Create the preset admin account with email: sifee1200@gmail.com
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button 
            onClick={createAdminAccount}
            disabled={loading}
            className="w-full"
          >
            {loading ? "Creating..." : "Create Admin Account"}
          </Button>
          <p className="text-xs text-muted-foreground mt-4">
            This will create an admin account with email: sifee1200@gmail.com and password: qwertyu123
          </p>
        </CardContent>
      </Card>
    </div>
  );
}