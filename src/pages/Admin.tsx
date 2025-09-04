import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useAuth } from "@/hooks/useAuth";
import { useFileManager } from "@/hooks/useFileManager";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { toast } from "sonner";
import { ArrowLeft, Plus, Edit, Trash2, Users, Package, Download, Upload, BarChart3, FileText } from "lucide-react";

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
  is_active: boolean;
  created_at: string;
}

interface SalesReport {
  id: string;
  report_date: string;
  total_orders: number;
  total_revenue: number;
  file_path: string | null;
  created_at: string;
}

interface ProductListing {
  id: string;
  listing_name: string;
  file_path: string;
  created_at: string;
}

export default function Admin() {
  const [products, setProducts] = useState<Product[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [salesReports, setSalesReports] = useState<SalesReport[]>([]);
  const [productListings, setProductListings] = useState<ProductListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [autoReportTime, setAutoReportTime] = useState("00:00");
  const [savingSettings, setSavingSettings] = useState(false);
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
  const fileManager = useFileManager();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    
    // Only redirect if profile is loaded and user is not admin
    if (profile && profile.role !== 'admin') {
      toast.error("You need admin privileges to access this page");
      navigate("/");
      return;
    }
    
    // Only fetch data if user has admin role
    if (profile?.role === 'admin') {
      fetchData();
    }
  }, [user, profile, navigate]);

  const fetchData = async () => {
    await Promise.all([
      fetchProducts(),
      fetchEmployees(),
      fetchSalesReports(),
      fetchProductListings(),
      fetchAutoReportSettings()
    ]);
    setLoading(false);
  };

  const fetchProducts = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setProducts(data || []);
    } catch (error: any) {
      toast.error("Failed to load products");
    }
  };

  const fetchEmployees = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setEmployees((data || []).map(emp => ({
        ...emp,
        is_active: emp.is_active ?? true
      })) as Employee[]);
    } catch (error: any) {
      console.error('Employee fetch error:', error);
      toast.error("Failed to load employees");
      setEmployees([]);
    }
  };

  const fetchSalesReports = async () => {
    try {
      const { data, error } = await supabase
        .from('sales_reports')
        .select('*')
        .order('report_date', { ascending: false });

      if (error) throw error;
      setSalesReports(data || []);
    } catch (error) {
      console.error('Error fetching sales reports:', error);
      toast.error('Failed to fetch sales reports');
    }
  };

  const fetchProductListings = async () => {
    try {
      const { data, error } = await supabase
        .from('product_listings')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProductListings(data || []);
    } catch (error) {
      console.error('Error fetching product listings:', error);
      toast.error('Failed to fetch product listings');
    }
  };

  const fetchAutoReportSettings = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('auto_report_settings')
        .select('*')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      if (data) {
        setAutoReportTime(data.report_time.substring(0, 5));
      }
    } catch (error) {
      console.error('Error fetching auto report settings:', error);
    }
  };

  const saveAutoReportSettings = async () => {
    if (!user) return;
    
    setSavingSettings(true);
    try {
      const { error } = await supabase
        .from('auto_report_settings')
        .upsert({
          user_id: user.id,
          report_time: autoReportTime + ':00',
          is_active: true
        }, {
          onConflict: 'user_id'
        });

      if (error) throw error;
      
      toast.success(`Auto-report time set to ${autoReportTime}`);
    } catch (error) {
      console.error('Error saving auto report settings:', error);
      toast.error("Failed to save settings");
    } finally {
      setSavingSettings(false);
    }
  };

  const handleAddProduct = async () => {
    if (!newProduct.name || !newProduct.price) {
      toast.error("Name and price are required");
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
      toast.success("Product added successfully");
    } catch (error: any) {
      toast.error("Failed to add product");
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
      toast.success("Product updated successfully");
    } catch (error: any) {
      toast.error("Failed to update product");
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
      toast.success("Product deactivated successfully");
    } catch (error: any) {
      toast.error("Failed to deactivate product");
    }
  };

  const handleAddEmployee = async () => {
    if (!newEmployee.email || !newEmployee.password || !newEmployee.fullName) {
      toast.error("All fields are required");
      return;
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No authentication session');
      }

      const response = await fetch(`https://ntzcpsdackxlvqmkifyp.supabase.co/functions/v1/create-employee`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          email: newEmployee.email,
          password: newEmployee.password,
          fullName: newEmployee.fullName,
          role: newEmployee.role
        })
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to create employee');
      }

      setNewEmployee({ email: "", password: "", fullName: "", role: "employee" });
      fetchEmployees();
      toast.success("Employee created successfully");
    } catch (error: any) {
      toast.error(error.message || "Failed to add employee");
    }
  };

  const handleRemoveEmployee = async (employee: Employee) => {
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ is_active: false })
        .eq('id', employee.id);

      if (error) throw error;

      fetchEmployees();
      toast.success("Employee removed successfully");
    } catch (error: any) {
      toast.error("Failed to remove employee");
    }
  };

  const handleGenerateSalesReport = async () => {
    try {
      setUploading(true);
      const report = await fileManager.generateSalesReport(new Date());
      if (report) {
        toast.success("Sales report generated successfully!");
        await fetchSalesReports();
      }
    } catch (error) {
      console.error('Error generating sales report:', error);
      toast.error('Failed to generate sales report');
    } finally {
      setUploading(false);
    }
  };

  const handleExportProducts = async () => {
    try {
      setUploading(true);
      const report = await fileManager.exportProductListing(products);
      if (report) {
        toast.success("Product listing exported successfully!");
        await fetchProductListings();
      }
    } catch (error) {
      console.error('Error exporting products:', error);
      toast.error('Failed to export product listing');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSalesReport = async (reportId: string, filePath: string | null) => {
    try {
      // Delete from database
      const { error } = await supabase
        .from('sales_reports')
        .delete()
        .eq('id', reportId);

      if (error) throw error;

      // Delete file from storage if it exists
      if (filePath) {
        await fileManager.deleteFile('sales', filePath);
      }

      await fetchSalesReports();
      toast.success("Sales report deleted successfully!");
    } catch (error) {
      console.error('Error deleting sales report:', error);
      toast.error('Failed to delete sales report');
    }
  };

  const handleDeleteProductListing = async (listingId: string, filePath: string) => {
    try {
      // Delete from database
      const { error } = await supabase
        .from('product_listings')
        .delete()
        .eq('id', listingId);

      if (error) throw error;

      // Delete file from storage
      await fileManager.deleteFile('listings', filePath);

      await fetchProductListings();
      toast.success("Product listing deleted successfully!");
    } catch (error) {
      console.error('Error deleting product listing:', error);
      toast.error('Failed to delete product listing');
    }
  };

  if (loading || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <div>Loading admin panel...</div>
        </div>
      </div>
    );
  }

  if (profile.role !== 'admin') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-500 mb-4">Access Denied</div>
          <div>You need admin privileges to access this page.</div>
        </div>
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
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="products" className="flex items-center gap-2">
              <Package className="h-4 w-4" />
              Products
            </TabsTrigger>
            <TabsTrigger value="employees" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Employees
            </TabsTrigger>
            <TabsTrigger value="sales" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Sales
            </TabsTrigger>
            <TabsTrigger value="files" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Files
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
                <CardTitle className="flex items-center justify-between">
                  Existing Products
                  <Button onClick={handleExportProducts} disabled={uploading} variant="outline" size="sm">
                    <Download className="h-4 w-4 mr-2" />
                    Export Products
                  </Button>
                </CardTitle>
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
                <div>
                  <Label htmlFor="employee-role">Role</Label>
                  <Select
                    value={newEmployee.role}
                    onValueChange={(value: "employee" | "admin") => setNewEmployee({ ...newEmployee, role: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="employee">Employee</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                    </SelectContent>
                  </Select>
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
                  {employees.filter(emp => emp.is_active !== false).map((employee) => (
                    <div key={employee.id} className="flex items-center gap-4 p-4 border rounded">
                      <div className="flex-1">
                        <h3 className="font-semibold">{employee.full_name || employee.email}</h3>
                        <p className="text-sm text-muted-foreground">{employee.email}</p>
                        <p className="text-xs text-muted-foreground">
                          Joined: {new Date(employee.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={employee.role === 'admin' ? "default" : "secondary"}>
                          {employee.role}
                        </Badge>
                        {employee.email !== 'sifee1200@gmail.com' && (
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="outline">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Remove Employee</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to remove {employee.full_name || employee.email}? 
                                  This action will deactivate their account.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleRemoveEmployee(employee)}>
                                  Remove Employee
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
           </TabsContent>

          <TabsContent value="sales" className="space-y-6">
            {/* Auto Report Settings */}
            <Card>
              <CardHeader>
                <CardTitle>Auto Report Settings</CardTitle>
                <CardDescription>Configure automatic daily report generation</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-4">
                  <div className="flex-1">
                    <Label htmlFor="report-time">Daily Report Time</Label>
                    <Input
                      id="report-time"
                      type="time"
                      value={autoReportTime}
                      onChange={(e) => setAutoReportTime(e.target.value)}
                      className="w-40"
                    />
                    <p className="text-sm text-muted-foreground mt-1">
                      Reports will be generated automatically at this time daily
                    </p>
                  </div>
                  <Button 
                    onClick={saveAutoReportSettings} 
                    disabled={savingSettings}
                    className="mt-6"
                  >
                    {savingSettings ? 'Saving...' : 'Save Settings'}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Sales Analytics */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  Sales Reports
                  <Button onClick={handleGenerateSalesReport} disabled={uploading}>
                    <BarChart3 className="h-4 w-4 mr-2" />
                    Generate Today's Report
                  </Button>
                </CardTitle>
                <CardDescription>View and generate sales reports</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {salesReports.length === 0 ? (
                    <p className="text-muted-foreground text-center py-8">
                      No sales reports generated yet
                    </p>
                  ) : (
                    salesReports.map((report) => (
                      <div key={report.id} className="flex items-center justify-between p-4 border rounded">
                        <div>
                          <h3 className="font-semibold">
                            Report for {new Date(report.report_date).toLocaleDateString()}
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            {report.total_orders} orders • ${report.total_revenue.toFixed(2)} revenue
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Generated: {new Date(report.created_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Badge variant="outline">
                            {report.total_orders} Orders
                          </Badge>
                          <Badge variant="default">
                            ${report.total_revenue.toFixed(2)}
                          </Badge>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="files" className="space-y-6">
            {/* File Management */}
            <Card>
              <CardHeader>
                <CardTitle>File Management</CardTitle>
                <CardDescription>Manage sales reports and product listings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Sales Data</CardTitle>
                      <CardDescription>Browse and download sales reports by date</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button onClick={handleGenerateSalesReport} disabled={uploading} className="w-full">
                        <BarChart3 className="h-4 w-4 mr-2" />
                        Generate Today's Report
                      </Button>
                      
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">Existing Sales Reports</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {salesReports.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No sales reports available
                            </p>
                          ) : (
                            salesReports.map((report) => (
                              <div key={report.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">
                                    {new Date(report.report_date).toLocaleDateString()}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {report.total_orders} orders • ${report.total_revenue.toFixed(2)}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      if (report.file_path) {
                                        const blob = await fileManager.downloadFile('sales', report.file_path);
                                        if (blob) {
                                          const url = URL.createObjectURL(blob);
                                          const a = document.createElement('a');
                                          a.href = url;
                                          a.download = `sales-report-${report.report_date}.json`;
                                          document.body.appendChild(a);
                                          a.click();
                                          document.body.removeChild(a);
                                          URL.revokeObjectURL(url);
                                          toast.success("Report downloaded successfully!");
                                        } else {
                                          toast.error("Failed to download report");
                                        }
                                      }
                                    }}
                                    disabled={!report.file_path}
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm" variant="outline">
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Sales Report</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete the sales report for {new Date(report.report_date).toLocaleDateString()}? 
                                          This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteSalesReport(report.id, report.file_path)}>
                                          Delete Report
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Product Listings</CardTitle>
                      <CardDescription>Browse and download product listings</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button onClick={handleExportProducts} disabled={uploading} className="w-full">
                        <Upload className="h-4 w-4 mr-2" />
                        Generate Product Listing
                      </Button>
                      
                      <div className="border-t pt-4">
                        <h4 className="font-medium mb-3">Existing Product Listings</h4>
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {productListings.length === 0 ? (
                            <p className="text-sm text-muted-foreground text-center py-4">
                              No product listings available
                            </p>
                          ) : (
                            productListings.map((listing) => (
                              <div key={listing.id} className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex-1">
                                  <p className="font-medium text-sm">{listing.listing_name}</p>
                                  <p className="text-xs text-muted-foreground">
                                    Generated: {new Date(listing.created_at).toLocaleDateString()}
                                  </p>
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={async () => {
                                      if (listing.file_path) {
                                        const blob = await fileManager.downloadFile('listings', listing.file_path);
                                        if (blob) {
                                          const url = URL.createObjectURL(blob);
                                          const a = document.createElement('a');
                                          a.href = url;
                                          a.download = `${listing.listing_name}.json`;
                                          document.body.appendChild(a);
                                          a.click();
                                          document.body.removeChild(a);
                                          URL.revokeObjectURL(url);
                                          toast.success("Listing downloaded successfully!");
                                        } else {
                                          toast.error("Failed to download listing");
                                        }
                                      }
                                    }}
                                  >
                                    <Download className="h-3 w-3" />
                                  </Button>
                                  <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                      <Button size="sm" variant="outline">
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                      <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Product Listing</AlertDialogTitle>
                                        <AlertDialogDescription>
                                          Are you sure you want to delete "{listing.listing_name}"? 
                                          This action cannot be undone.
                                        </AlertDialogDescription>
                                      </AlertDialogHeader>
                                      <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={() => handleDeleteProductListing(listing.id, listing.file_path)}>
                                          Delete Listing
                                        </AlertDialogAction>
                                      </AlertDialogFooter>
                                    </AlertDialogContent>
                                  </AlertDialog>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
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
