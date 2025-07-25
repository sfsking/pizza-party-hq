import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface FileUploadResult {
  path: string;
  url: string;
}

export function useFileManager() {
  const [uploading, setUploading] = useState(false);
  const { toast } = useToast();

  const uploadFile = async (
    file: File,
    bucket: string,
    path: string
  ): Promise<FileUploadResult | null> => {
    setUploading(true);
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from(bucket)
        .getPublicUrl(data.path);

      return {
        path: data.path,
        url: publicUrl
      };
    } catch (error: any) {
      toast({
        title: "Upload Error",
        description: error.message,
        variant: "destructive",
      });
      return null;
    } finally {
      setUploading(false);
    }
  };

  const downloadFile = async (bucket: string, path: string): Promise<Blob | null> => {
    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .download(path);

      if (error) throw error;
      return data;
    } catch (error: any) {
      toast({
        title: "Download Error",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const deleteFile = async (bucket: string, path: string): Promise<boolean> => {
    try {
      const { error } = await supabase.storage
        .from(bucket)
        .remove([path]);

      if (error) throw error;
      return true;
    } catch (error: any) {
      toast({
        title: "Delete Error",
        description: error.message,
        variant: "destructive",
      });
      return false;
    }
  };

  const generateSalesReport = async (date: Date) => {
    try {
      const dateStr = date.toISOString().split('T')[0];
      
      // Get orders for the specific date
      const { data: orders, error } = await supabase
        .from('orders')
        .select(`
          *,
          order_items (
            quantity,
            unit_price,
            subtotal,
            products (name)
          )
        `)
        .gte('created_at', `${dateStr}T00:00:00`)
        .lt('created_at', `${dateStr}T23:59:59`);

      if (error) throw error;

      const totalOrders = orders?.length || 0;
      const totalRevenue = orders?.reduce((sum, order) => sum + Number(order.total_amount), 0) || 0;

      const reportData = {
        date: dateStr,
        totalOrders,
        totalRevenue,
        orders: orders?.map(order => ({
          id: order.id,
          type: order.order_type,
          amount: order.total_amount,
          items: order.order_items?.map((item: any) => ({
            product: item.products.name,
            quantity: item.quantity,
            price: item.unit_price
          }))
        }))
      };

      // Save to database
      const { error: saveError } = await supabase
        .from('sales_reports')
        .upsert({
          report_date: dateStr,
          total_orders: totalOrders,
          total_revenue: totalRevenue,
          report_data: reportData
        });

      if (saveError) throw saveError;

      // Generate file content
      const fileContent = JSON.stringify(reportData, null, 2);
      const fileName = `sales-${dateStr}.json`;
      const file = new Blob([fileContent], { type: 'application/json' });

      // Upload to storage
      const uploadResult = await uploadFile(
        new File([file], fileName),
        'sales',
        `${date.getFullYear()}/${date.getMonth() + 1}/${fileName}`
      );

      return uploadResult;
    } catch (error: any) {
      toast({
        title: "Report Generation Error",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  const exportProductListing = async (products: any[]) => {
    try {
      const listingData = {
        exportDate: new Date().toISOString(),
        products: products.map(product => ({
          id: product.id,
          name: product.name,
          price: product.price,
          description: product.description,
          image_url: product.image_url,
          is_active: product.is_active
        }))
      };

      const fileName = `product-listing-${new Date().toISOString().split('T')[0]}.json`;
      const fileContent = JSON.stringify(listingData, null, 2);
      const file = new File([fileContent], fileName, { type: 'application/json' });

      const uploadResult = await uploadFile(file, 'listings', fileName);

      // Save to database
      if (uploadResult) {
        await supabase
          .from('product_listings')
          .insert({
            listing_name: fileName,
            file_path: uploadResult.path,
            listing_data: listingData
          });
      }

      return uploadResult;
    } catch (error: any) {
      toast({
        title: "Export Error",
        description: error.message,
        variant: "destructive",
      });
      return null;
    }
  };

  return {
    uploading,
    uploadFile,
    downloadFile,
    deleteFile,
    generateSalesReport,
    exportProductListing
  };
}