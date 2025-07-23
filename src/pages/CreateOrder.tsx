import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Plus, Minus, ShoppingCart } from "lucide-react";

interface Product {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  description: string | null;
}

interface OrderItem {
  product: Product;
  quantity: number;
}

export default function CreateOrder() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
  const [orderType, setOrderType] = useState<"dine_in" | "delivery">("dine_in");
  const [tableNumber, setTableNumber] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [customerAddress, setCustomerAddress] = useState("");
  const [customerLocation, setCustomerLocation] = useState("");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  const { user, profile } = useAuth();
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

  const addToOrder = (product: Product) => {
    const existingItem = orderItems.find(item => item.product.id === product.id);
    if (existingItem) {
      setOrderItems(orderItems.map(item =>
        item.product.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      setOrderItems([...orderItems, { product, quantity: 1 }]);
    }
    setSelectedProduct(product);
  };

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity === 0) {
      setOrderItems(orderItems.filter(item => item.product.id !== productId));
    } else {
      setOrderItems(orderItems.map(item =>
        item.product.id === productId
          ? { ...item, quantity: newQuantity }
          : item
      ));
    }
  };

  const getTotalAmount = () => {
    return orderItems.reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const handleSubmitOrder = async () => {
    if (orderItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add items to your order",
        variant: "destructive",
      });
      return;
    }

    if (orderType === "dine_in" && !tableNumber) {
      toast({
        title: "Error",
        description: "Please enter a table number for dine-in orders",
        variant: "destructive",
      });
      return;
    }

    if (orderType === "delivery" && (!customerName || !customerAddress || !customerLocation)) {
      toast({
        title: "Error",
        description: "Please fill in all delivery information",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      // Create the order
      const orderData = {
        employee_id: profile?.id,
        order_type: orderType,
        table_number: orderType === "dine_in" ? parseInt(tableNumber) : null,
        customer_name: orderType === "delivery" ? customerName : null,
        customer_address: orderType === "delivery" ? customerAddress : null,
        customer_location: orderType === "delivery" ? customerLocation : null,
        total_amount: getTotalAmount(),
        status: "pending"
      };

      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert(orderData)
        .select()
        .single();

      if (orderError) throw orderError;

      // Create order items
      const orderItemsData = orderItems.map(item => ({
        order_id: order.id,
        product_id: item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price,
        subtotal: item.product.price * item.quantity
      }));

      const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);

      if (itemsError) throw itemsError;

      toast({
        title: "Success",
        description: "Order created successfully!",
      });

      navigate(`/order-summary/${order.id}`);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to create order",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

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
        <header className="flex items-center gap-4 mb-8">
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create New Order</h1>
            <p className="text-muted-foreground">Select items and configure order details</p>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Product Selection */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Select Items</CardTitle>
                <CardDescription>Click on items to add them to your order</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {products.map((product) => (
                    <div
                      key={product.id}
                      className={`border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                        selectedProduct?.id === product.id ? 'ring-2 ring-primary' : ''
                      }`}
                      onClick={() => addToOrder(product)}
                    >
                      <div className="flex gap-4">
                        {product.image_url && (
                          <img
                            src={product.image_url}
                            alt={product.name}
                            className="w-20 h-20 object-cover rounded-md"
                          />
                        )}
                        <div className="flex-1">
                          <h3 className="font-semibold">{product.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">{product.description}</p>
                          <p className="font-bold text-primary">${product.price.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Order Summary */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <ShoppingCart className="h-5 w-5" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Order Type Selection */}
                <div>
                  <Label className="text-base font-medium">Order Type</Label>
                  <RadioGroup
                    value={orderType}
                    onValueChange={(value: "dine_in" | "delivery") => setOrderType(value)}
                    className="mt-2"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="dine_in" id="dine_in" />
                      <Label htmlFor="dine_in">Dine In</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="delivery" id="delivery" />
                      <Label htmlFor="delivery">Delivery</Label>
                    </div>
                  </RadioGroup>
                </div>

                {/* Order Details */}
                {orderType === "dine_in" && (
                  <div>
                    <Label htmlFor="table-number">Table Number</Label>
                    <Input
                      id="table-number"
                      type="number"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="Enter table number"
                    />
                  </div>
                )}

                {orderType === "delivery" && (
                  <div className="space-y-3">
                    <div>
                      <Label htmlFor="customer-name">Customer Name</Label>
                      <Input
                        id="customer-name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Enter customer name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customer-address">Address</Label>
                      <Textarea
                        id="customer-address"
                        value={customerAddress}
                        onChange={(e) => setCustomerAddress(e.target.value)}
                        placeholder="Enter delivery address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customer-location">Location</Label>
                      <Input
                        id="customer-location"
                        value={customerLocation}
                        onChange={(e) => setCustomerLocation(e.target.value)}
                        placeholder="Enter location details"
                      />
                    </div>
                  </div>
                )}

                {/* Order Items */}
                <div>
                  <Label className="text-base font-medium">Order Items</Label>
                  <div className="mt-2 space-y-2">
                    {orderItems.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No items added yet</p>
                    ) : (
                      orderItems.map((item) => (
                        <div key={item.product.id} className="flex items-center gap-2 p-2 border rounded">
                          <div className="flex-1">
                            <p className="font-medium text-sm">{item.product.name}</p>
                            <p className="text-xs text-muted-foreground">
                              ${item.product.price.toFixed(2)} each
                            </p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                            >
                              <Minus className="h-3 w-3" />
                            </Button>
                            <Badge variant="secondary">{item.quantity}</Badge>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => updateQuantity(item.product.id, item.quantity + 1)}
                            >
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                {/* Total */}
                {orderItems.length > 0 && (
                  <div className="border-t pt-4">
                    <div className="flex justify-between items-center text-lg font-bold">
                      <span>Total:</span>
                      <span>${getTotalAmount().toFixed(2)}</span>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <Button
                  onClick={handleSubmitOrder}
                  disabled={submitting || orderItems.length === 0}
                  className="w-full"
                >
                  {submitting ? "Creating Order..." : "Create Order"}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}