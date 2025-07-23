import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { LogOut, ShoppingCart, Settings, Plus } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  description: string | null;
}

export default function Dashboard() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, profile, signOut } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchProducts();
  }, [user, navigate]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('is_active', true)
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate("/auth");
  };

  const isAdmin = profile?.role === 'admin';

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Pizza Counter</h1>
            <p className="text-muted-foreground">
              Welcome back, {profile?.full_name || user?.email}
              {isAdmin && <Badge className="ml-2">Admin</Badge>}
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => navigate("/create-order")}
              className="flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              New Order
            </Button>
            {isAdmin && (
              <Button
                variant="outline"
                onClick={() => navigate("/admin")}
                className="flex items-center gap-2"
              >
                <Settings className="h-4 w-4" />
                Admin Panel
              </Button>
            )}
            <Button variant="outline" onClick={handleSignOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks for pizza counter operations</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button
                onClick={() => navigate("/create-order")}
                className="flex items-center gap-2 h-20"
              >
                <ShoppingCart className="h-6 w-6" />
                <div className="text-left">
                  <div className="font-semibold">Create Order</div>
                  <div className="text-sm opacity-80">Start a new order</div>
                </div>
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate("/orders")}
                className="flex items-center gap-2 h-20"
              >
                <div className="text-left">
                  <div className="font-semibold">View Orders</div>
                  <div className="text-sm opacity-80">See all orders</div>
                </div>
              </Button>
              {isAdmin && (
                <Button
                  variant="outline"
                  onClick={() => navigate("/admin")}
                  className="flex items-center gap-2 h-20"
                >
                  <Settings className="h-6 w-6" />
                  <div className="text-left">
                    <div className="font-semibold">Admin Panel</div>
                    <div className="text-sm opacity-80">Manage system</div>
                  </div>
                </Button>
              )}
            </CardContent>
          </Card>

          <Card className="lg:col-span-3">
            <CardHeader>
              <CardTitle>Menu Items</CardTitle>
              <CardDescription>Available products for orders</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {products.map((product) => (
                  <div key={product.id} className="border rounded-lg p-4">
                    {product.image_url && (
                      <img
                        src={product.image_url}
                        alt={product.name}
                        className="w-full h-32 object-cover rounded-md mb-2"
                      />
                    )}
                    <h3 className="font-semibold">{product.name}</h3>
                    <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
                    <p className="font-bold">${product.price.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}