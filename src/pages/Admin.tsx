import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Edit, Trash2, Users, Package } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  description: string | null;
  is_active: boolean;
}

interface Employee {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: 'employee' | 'admin';
  created_at: string;
}

export default function Admin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: "",
    price: "",
    image_url: "",
    description: ""
  });
  const [newEmployee, setNewEmployee] = useState({
    email: "",
    password: "",
    fullName: "",
    role: "employee" as "employee" | "admin"
  });

  const { user, profile } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (profile?.role !== 'admin') {
      toast({
        title: "Access Denied",
        description: "You need admin privileges to access this page",
        variant: "destructive",
      });
      navigate("/");
      return;
    }
    fetchProducts();
    fetchEmployees();
  }, [user, profile, navigate]);

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive",
      });
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setEmployees((data || []) as Employee[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load employees",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
      toast({
        title: "Error",
        description: "Name and price are required",
        variant: "destructive",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('products')
        .insert({
          name: newProduct.name,
          price: parseFloat(newProduct.price),
          image_url: newProduct.image_url || null,
          description: newProduct.description || null,
          is_active: true
        });

      if (error) throw error;

      setNewProduct({ name: "", price: "", image_url: "", description: "" });
      fetchProducts();
      toast({
        title: "Success",
        description: "Product added successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to add product",
        variant: "destructive",
      });
    }
  };

  const handleUpdateProduct = async () => {
    if (!editingProduct) return;

    try {
      const { error } = await supabase
        .from('products')
        .update({
          name: editingProduct.name,
          price: editingProduct.price,
          image_url: editingProduct.image_url,
          description: editingProduct.description,
          is_active: editingProduct.is_active
        })
        .eq('id', editingProduct.id);

      if (error) throw error;

      setEditingProduct(null);
      fetchProducts();
      toast({
        title: "Success",
        description: "Product updated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update product",
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ is_active: false })
        .eq('id', productId);

      if (error) throw error;

      fetchProducts();
      toast({
        title: "Success",
        description: "Product deactivated successfully",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to deactivate product",
        variant: "destructive",
      });
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.email || !newEmployee.password || !newEmployee.fullName) {
      toast({
        title: "Error",
        description: "All fields are required",
        variant: "destructive",
      });
      return;
    }

    try {
      // Note: In a real implementation, you'd need to handle user creation through admin API
      // For now, this is a placeholder for the admin interface
      toast({
        title: "Info",
        description: "Employee management requires backend admin functions. Please use Supabase admin panel for now.",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to add employee",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading admin panel...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-6xl mx-auto">
        <header className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Manage employees and products</p>
          </div>
        </header>

        <Tabs defaultValue="products" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employees
            </TabsTrigger>
          </TabsList>

          <TabsContent value="products" className="space-y-6">
            {/* Add New Product */}
            <Card>
              <CardHeader>
                <CardTitle>Add New Product</CardTitle>
                <CardDescription>Add a new item to the menu</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="product-name">Product Name</Label>
                    <Input
                      id="product-name"
                      value={newProduct.name}
                      onChange={(e) => setNewProduct({ ...newProduct, name: e.target.value })}
                      placeholder="Enter product name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="product-price">Price</Label>
                    <Input
                      id="product-price"
                      type="number"
                      step="0.01"
                      value={newProduct.price}
                      onChange={(e) => setNewProduct({ ...newProduct, price: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="product-image">Image URL</Label>
                  <Input
                    id="product-image"
                    value={newProduct.image_url}
                    onChange={(e) => setNewProduct({ ...newProduct, image_url: e.target.value })}
                    placeholder="https://example.com/image.jpg"
                  />
                </div>
                <div>
                  <Label htmlFor="product-description">Description</Label>
                  <Textarea
                    id="product-description"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({ ...newProduct, description: e.target.value })}
                    placeholder="Enter product description"
                  />
                </div>
                <Button onClick={handleAddProduct}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Product
                </Button>
              </CardContent>
            </Card>

            {/* Existing Products */}
            <Card>
              <CardHeader>
                <CardTitle>Existing Products</CardTitle>
                <CardDescription>Manage your menu items</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {products.map((product) => (
                    <div key={product.id} className="flex items-center gap-4 p-4 border rounded">
                      {product.image_url && (
                        <img
                          src={product.image_url}
                          alt={product.name}
                          className="w-16 h-16 object-cover rounded"
                        />
                      )}
                      <div className="flex-1">
                        <h3 className="font-semibold">{product.name}</h3>
                        <p className="text-sm text-muted-foreground">{product.description}</p>
                        <p className="font-bold">${product.price.toFixed(2)}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={product.is_active ? "default" : "secondary"}>
                          {product.is_active ? "Active" : "Inactive"}
                        </Badge>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingProduct(product)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        {product.is_active && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDeleteProduct(product.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="employees" className="space-y-6">
            {/* Add New Employee */}
            <Card>
              <CardHeader>
                <CardTitle>Add New Employee</CardTitle>
                <CardDescription>Create a new employee account</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="employee-name">Full Name</Label>
                    <Input
                      id="employee-name"
                      value={newEmployee.fullName}
                      onChange={(e) => setNewEmployee({ ...newEmployee, fullName: e.target.value })}
                      placeholder="Enter full name"
                    />
                  </div>
                  <div>
                    <Label htmlFor="employee-email">Email</Label>
                    <Input
                      id="employee-email"
                      type="email"
                      value={newEmployee.email}
                      onChange={(e) => setNewEmployee({ ...newEmployee, email: e.target.value })}
                      placeholder="employee@example.com"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="employee-password">Password</Label>
                  <Input
                    id="employee-password"
                    type="password"
                    value={newEmployee.password}
                    onChange={(e) => setNewEmployee({ ...newEmployee, password: e.target.value })}
                    placeholder="Enter password"
                  />
                </div>
                <Button onClick={handleAddEmployee}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Employee
                </Button>
              </CardContent>
            </Card>

            {/* Existing Employees */}
            <Card>
              <CardHeader>
                <CardTitle>Existing Employees</CardTitle>
                <CardDescription>Manage employee accounts</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {employees.map((employee) => (
                    <div key={employee.id} className="flex items-center gap-4 p-4 border rounded">
                      <div className="flex-1">
                        <h3 className="font-semibold">{employee.full_name || employee.email}</h3>
                        <p className="text-sm text-muted-foreground">{employee.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined: {new Date(employee.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant={employee.role === 'admin' ? "default" : "secondary"}>
                        {employee.role}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Edit Product Modal */}
        {editingProduct && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Edit Product</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Product Name</Label>
                  <Input
                    value={editingProduct.name}
                    onChange={(e) => setEditingProduct({ ...editingProduct, name: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Price</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={editingProduct.price}
                    onChange={(e) => setEditingProduct({ ...editingProduct, price: parseFloat(e.target.value) })}
                  />
                </div>
                <div>
                  <Label>Image URL</Label>
                  <Input
                    value={editingProduct.image_url || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, image_url: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={editingProduct.description || ""}
                    onChange={(e) => setEditingProduct({ ...editingProduct, description: e.target.value })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleUpdateProduct}>Update</Button>
                  <Button variant="outline" onClick={() => setEditingProduct(null)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
