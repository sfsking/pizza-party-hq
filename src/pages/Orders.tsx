import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeft, Eye, CheckCircle, Clock, Package } from "lucide-react";

interface Order {
  id: string;
  order_type: "dine_in" | "delivery";
  table_number: number | null;
  customer_name: string | null;
  customer_address: string | null;
  customer_location: string | null;
  total_amount: number;
  status: string;
  created_at: string;
  employee_id: string;
  profiles: {
    full_name: string | null;
    email: string;
  };
  order_items: {
    id: string;
    quantity: number;
    products: {
      name: string;
    };
  }[];
}

export default function Orders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");

  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!user) {
      navigate("/auth");
      return;
    }
    fetchOrders();
  }, [user, navigate]);

  const fetchOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          profiles!orders_employee_id_fkey (
            full_name,
            email
          ),
          order_items (
            id,
            quantity,
            products (
              name
            )
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setOrders(data as Order[]);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load orders",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('orders')
        .update({ status: newStatus })
        .eq('id', orderId);

      if (error) throw error;

      setOrders(orders.map(order => 
        order.id === orderId ? { ...order, status: newStatus } : order
      ));

      toast({
        title: "Success",
        description: `Order status updated to ${newStatus}`,
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to update order status",
        variant: "destructive",
      });
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'in_progress':
        return <Package className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'pending':
        return 'secondary';
      case 'in_progress':
        return 'default';
      case 'completed':
        return 'outline';
      default:
        return 'secondary';
    }
  };

  const filteredOrders = orders.filter(order => {
    if (statusFilter !== "all" && order.status !== statusFilter) return false;
    if (typeFilter !== "all" && order.order_type !== typeFilter) return false;
    return true;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">Loading orders...</div>
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
            <h1 className="text-3xl font-bold">Orders Management</h1>
            <p className="text-muted-foreground">View and manage all orders</p>
          </div>
        </header>

        {/* Filters */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="dine_in">Dine In</SelectItem>
                  <SelectItem value="delivery">Delivery</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Orders List */}
        <div className="space-y-4">
          {filteredOrders.length === 0 ? (
            <Card>
              <CardContent className="flex items-center justify-center py-8">
                <p className="text-muted-foreground">No orders found</p>
              </CardContent>
            </Card>
          ) : (
            filteredOrders.map((order) => (
              <Card key={order.id}>
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-lg">
                        Order #{order.id.slice(0, 8)}
                      </CardTitle>
                      <CardDescription>
                        {new Date(order.created_at).toLocaleString()} • 
                        Employee: {order.profiles.full_name || order.profiles.email}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={getStatusVariant(order.status)}>
                        {getStatusIcon(order.status)}
                        <span className="ml-1">{order.status.replace('_', ' ').toUpperCase()}</span>
                      </Badge>
                      <Badge variant="outline">
                        {order.order_type === 'dine_in' ? 'Dine In' : 'Delivery'}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* Order Details */}
                    <div>
                      <h4 className="font-semibold mb-2">Order Details</h4>
                      {order.order_type === 'dine_in' && order.table_number && (
                        <p className="text-sm text-muted-foreground">
                          Table: {order.table_number}
                        </p>
                      )}
                      {order.order_type === 'delivery' && (
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>Customer: {order.customer_name}</p>
                          <p>Address: {order.customer_address}</p>
                          <p>Location: {order.customer_location}</p>
                        </div>
                      )}
                      <p className="font-bold mt-2">Total: ${order.total_amount.toFixed(2)}</p>
                    </div>

                    {/* Order Items */}
                    <div>
                      <h4 className="font-semibold mb-2">Items ({order.order_items.length})</h4>
                      <div className="text-sm text-muted-foreground space-y-1">
                        {order.order_items.slice(0, 3).map((item) => (
                          <p key={item.id}>
                            {item.quantity}x {item.products.name}
                          </p>
                        ))}
                        {order.order_items.length > 3 && (
                          <p>... and {order.order_items.length - 3} more items</p>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate(`/order-summary/${order.id}`)}
                        className="flex items-center gap-2"
                      >
                        <Eye className="h-4 w-4" />
                        View Details
                      </Button>
                      {order.status === 'pending' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, 'in_progress')}
                        >
                          Start Preparation
                        </Button>
                      )}
                      {order.status === 'in_progress' && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => updateOrderStatus(order.id, 'completed')}
                        >
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}