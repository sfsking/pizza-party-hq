import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Printer, CheckCircle } from "lucide-react";

interface OrderDetails {
  id: string;
  order_type: "dine_in" | "delivery";
  table_number: number | null;
  customer_name: string | null;
  customer_address: string | null;
  customer_location: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  order_items: {
    id: string;
    quantity: number;
    unit_price: number;
    subtotal: number;
    products: {
      id: string;
      name: string;
      image_url: string | null;
    };
  }[];
}

export default function OrderSummary() {
  const { orderId } = useParams<{ orderId: string }>();
  const [order, setOrder] = useState<OrderDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    if (orderId) {
      fetchOrder();
    }
  }, [user, orderId, navigate]);

  const fetchOrder = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            id,
            quantity,
            unit_price,
            subtotal,
            products (
              id,
              name,
              image_url
            )
          )
        `)
        .eq('id', orderId)
        .single();

      if (error) throw error;
      setOrder(data as OrderDetails);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load order details",
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleCompleteOrder = async () => {
    if (!order) return;
    
    setCompleting(true);
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: 'completed' })
        .eq('id', order.id);

      if (error) throw error;

      setOrder({ ...order, status: 'completed' });
      toast({
        title: "Success",
        description: "Order marked as completed!",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to complete order",
        variant: "destructive",
      });
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading order details...</div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Order not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4">
      <div className="max-w-2xl mx-auto">
        <header className="flex items-center gap-4 mb-8 print:hidden">
          <Button variant="outline" onClick={() => navigate("/")}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Order Summary</h1>
            <p className="text-muted-foreground">Order #{order.id.slice(0, 8)}</p>
          </div>
        </header>

        <Card className="print:shadow-none print:border-none">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Pizza Counter</CardTitle>
            <CardDescription>Order Receipt</CardDescription>
            <div className="flex justify-center">
              <Badge variant={order.status === 'completed' ? 'default' : 'secondary'}>
                {order.status.toUpperCase()}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Order Information */}
            <div>
              <h3 className="font-semibold mb-2">Order Details</h3>
              <div className="space-y-1 text-sm">
                <p><strong>Order ID:</strong> {order.id.slice(0, 8)}</p>
                <p><strong>Date:</strong> {new Date(order.created_at).toLocaleString()}</p>
                <p><strong>Type:</strong> {order.order_type === 'dine_in' ? 'Dine In' : 'Delivery'}</p>
                
                {order.order_type === 'dine_in' && order.table_number && (
                  <p><strong>Table Number:</strong> {order.table_number}</p>
                )}
                
                {order.order_type === 'delivery' && (
                  <>
                    <p><strong>Customer:</strong> {order.customer_name}</p>
                    <p><strong>Address:</strong> {order.customer_address}</p>
                    <p><strong>Location:</strong> {order.customer_location}</p>
                  </>
                )}
              </div>
            </div>

            {/* Order Items */}
            <div>
              <h3 className="font-semibold mb-4">Items Ordered</h3>
              <div className="space-y-3">
                {order.order_items.map((item) => (
                  <div key={item.id} className="flex items-center gap-4 p-3 border rounded">
                    {item.products.image_url && (
                      <img
                        src={item.products.image_url}
                        alt={item.products.name}
                        className="w-16 h-16 object-cover rounded print:hidden"
                      />
                    )}
                    <div className="flex-1">
                      <h4 className="font-medium">{item.products.name}</h4>
                      <p className="text-sm text-muted-foreground">
                        Quantity: {item.quantity} × ${item.unit_price.toFixed(2)}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">${item.subtotal.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Total */}
            <div className="border-t pt-4">
              <div className="flex justify-between items-center text-xl font-bold">
                <span>Total Amount:</span>
                <span>${order.total_amount.toFixed(2)}</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-4 print:hidden">
              <Button onClick={handlePrint} className="flex-1">
                <Printer className="h-4 w-4 mr-2" />
                Print Receipt
              </Button>
              {order.status === 'pending' && (
                <Button
                  onClick={handleCompleteOrder}
                  disabled={completing}
                  variant="outline"
                  className="flex-1"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {completing ? "Completing..." : "Mark Complete"}
                </Button>
              )}
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>Thank you for your order!</p>
              <p>Pizza Counter Management System</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}