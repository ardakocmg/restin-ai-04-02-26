import { Badge } from '@/components/ui/badge';
import { Card,CardContent,CardDescription,CardHeader,CardTitle } from '@/components/ui/card';
import { Building2,Euro,Star } from 'lucide-react';

export default function SuppliersPricingTab({ data = [], sku }) {
  const preferred = data.find(s => s.is_preferred);
  const others = data.filter(s => !s.is_preferred);

  const SupplierCard = ({ supplierData, isPreferred }) => {
    const { supplier, catalog_item } = supplierData;
    const basePrice = catalog_item.unit_price / catalog_item.pack_size;

    return (
      <Card className={isPreferred ? 'border-blue-500 border-2' : ''}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              <CardTitle className="text-lg">{supplier.name}</CardTitle>
            </div>
            {isPreferred && (
              <Badge className="bg-blue-100 text-blue-700">
                <Star className="h-3 w-3 mr-1" />
                Preferred
              </Badge>
            )}
          </div>
          <CardDescription>{supplier.email || 'No email'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-sm text-slate-600">Pack Size</p>
              <p className="font-medium">{catalog_item.pack_size} {catalog_item.pack_uom}</p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Pack Price</p>
              <p className="font-medium flex items-center gap-1">
                <Euro className="h-4 w-4" />
                {catalog_item.unit_price.toFixed(2)}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Base Price</p>
              <p className="font-medium text-green-600">
                €{basePrice.toFixed(4)}/{sku?.unit || 'EA'}
              </p>
            </div>
            <div>
              <p className="text-sm text-slate-600">Lead Time</p>
              <p className="font-medium">{supplier.lead_time_days || 3} days</p>
            </div>
          </div>
          <div className="pt-2 border-t">
            <p className="text-xs text-slate-500">
              Payment Terms: {supplier.payment_terms_days || 30} days
            </p>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-4">
      {data.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-slate-500">
            No suppliers configured for this item
          </CardContent>
        </Card>
      ) : (
        <>
          {preferred && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">Preferred Supplier</h3>
              <SupplierCard supplierData={preferred} isPreferred={true} />
            </div>
          )}
          {others.length > 0 && (
            <div>
              <h3 className="text-sm font-medium text-foreground mb-2">Alternative Suppliers</h3>
              <div className="space-y-3">
                {others.map((s, idx) => (
                  <SupplierCard key={idx} supplierData={s} isPreferred={false} />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
