import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useVenue } from '../../context/VenueContext';
import api from '../../lib/api';
import PageContainer from '../../layouts/PageContainer';
import FilterBar from '../../components/shared/FilterBar';
import DataList from '../../components/shared/DataList';
import DetailDrawer, { InfoRow, InfoSection } from '../../components/shared/DetailDrawer';
import { Card, CardContent } from '../../components/ui/card';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { 
  Package, 
  Plus, 
  Download, 
  Upload,
  TrendingUp,
  DollarSign,
  Box,
  Scale,
  Trash2,
  ChefHat,
  Activity,
  History,
  Eye
} from 'lucide-react';
import { toast } from 'sonner';

const FILTERS = [
  {
    key: 'category',
    label: 'Category',
    type: 'select',
    options: [
      { value: 'all', label: 'All Categories' },
      { value: 'produce', label: 'Produce' },
      { value: 'protein', label: 'Protein' },
      { value: 'dairy', label: 'Dairy' },
      { value: 'dry_goods', label: 'Dry Goods' },
      { value: 'beverages', label: 'Beverages' }
    ]
  },
  {
    key: 'status',
    label: 'Status',
    type: 'multiselect',
    options: [
      { value: 'in_stock', label: 'In Stock' },
      { value: 'low_stock', label: 'Low Stock' },
      { value: 'out_of_stock', label: 'Out of Stock' },
      { value: 'discontinued', label: 'Discontinued' }
    ]
  },
  {
    key: 'supplier',
    label: 'Supplier',
    type: 'select',
    advanced: true,
    options: [] // Will be loaded dynamically
  }
];

const COLUMNS = [
  {
    key: 'name',
    label: 'Item Name',
    sortable: true,
    render: (value, item) => (
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
          <Package className="h-5 w-5 text-muted-foreground" />
        </div>
        <div>
          <div className="font-medium">{value}</div>
          <div className="text-sm text-muted-foreground">{item.sku || 'No SKU'}</div>
        </div>
      </div>
    )
  },
  {
    key: 'category',
    label: 'Category',
    sortable: true,
    render: (value) => (
      <Badge variant="outline" className="capitalize">
        {value?.replace('_', ' ')}
      </Badge>
    )
  },
  {
    key: 'quantity',
    label: 'Stock',
    sortable: true,
    render: (value, item) => {
      const isLow = value < item.par_level;
      return (
        <div className="flex items-center gap-2">
          <span className={isLow ? 'text-destructive font-medium' : ''}>
            {value} {item.unit}
          </span>
          {isLow && (
            <Badge variant="destructive" className="text-xs">Low</Badge>
          )}
        </div>
      );
    }
  },
  {
    key: 'cost',
    label: 'Unit Cost',
    sortable: true,
    render: (value) => `€${(value || 0).toFixed(2)}`
  },
  {
    key: 'suppliers_count',
    label: 'Suppliers',
    render: (value) => (
      <Badge variant="secondary">{value || 0}</Badge>
    )
  }
];

export default function InventoryItemsNew() {
  const navigate = useNavigate();
  const { activeVenue } = useVenue();
  const [searchParams] = useSearchParams();

  // State
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, pageSize: 25, total: 0 });
  const [filters, setFilters] = useState({});
  const [quickSearch, setQuickSearch] = useState('');
  const [sortBy, setSortBy] = useState({ key: null, direction: null });
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [savedViews, setSavedViews] = useState([]);
  const [currentView, setCurrentView] = useState(null);

  // Detail Drawer
  const [selectedItem, setSelectedItem] = useState(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [itemDetails, setItemDetails] = useState(null);
  const [detailsLoading, setDetailsLoading] = useState(false);

  // Load items
  useEffect(() => {
    if (activeVenue?.id) {
      loadItems();
    }
  }, [activeVenue?.id, pagination.page, pagination.pageSize, filters, quickSearch, sortBy]);

  // Check for ID in URL (from GlobalSearch)
  useEffect(() => {
    const itemId = searchParams.get('id');
    if (itemId && items.length > 0) {
      const item = items.find(i => i.id === itemId);
      if (item) {
        handleRowClick(item);
      }
    }
  }, [searchParams, items]);

  const loadItems = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        venue_id: activeVenue.id,
        page: pagination.page,
        page_size: pagination.pageSize,
        ...(quickSearch && { search: quickSearch }),
        ...(sortBy.key && { sort_by: sortBy.key, sort_dir: sortBy.direction }),
        ...filters
      });

      const response = await api.get(`/inventory/items?${params}`);
      setItems(response.data?.items || []);
      setPagination(prev => ({
        ...prev,
        total: response.data?.total || 0
      }));
    } catch (error) {
      console.error('Failed to load items:', error);
      toast.error('Failed to load inventory items');
    } finally {
      setLoading(false);
    }
  };

  const handleRowClick = async (item) => {
    setSelectedItem(item);
    setDrawerOpen(true);
    loadItemDetails(item.id);
  };

  const loadItemDetails = async (itemId) => {
    setDetailsLoading(true);
    try {
      const response = await api.get(`/inventory/items/${itemId}/details?venue_id=${activeVenue.id}`);
      setItemDetails(response.data);
    } catch (error) {
      console.error('Failed to load item details:', error);
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to page 1
  };

  const handleReset = () => {
    setFilters({});
    setQuickSearch('');
    setSortBy({ key: null, direction: null });
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSaveView = () => {
    // TODO: Implement saved views
    toast.success('View saved!');
  };

  // Drawer tabs
  const drawerTabs = [
    {
      key: 'overview',
      label: 'Overview',
      icon: Eye,
      content: (
        <div className="space-y-6">
          <InfoSection title="Basic Information">
            <InfoRow label="SKU" value={selectedItem?.sku} copyable />
            <InfoRow label="Category" value={selectedItem?.category} />
            <InfoRow label="Unit" value={selectedItem?.unit} />
            <InfoRow label="Par Level" value={selectedItem?.par_level} />
          </InfoSection>

          <InfoSection title="Stock Status">
            <InfoRow label="Current Stock" value={`${selectedItem?.quantity || 0} ${selectedItem?.unit}`} />
            <InfoRow label="Reserved" value={`${itemDetails?.reserved || 0} ${selectedItem?.unit}`} />
            <InfoRow label="Available" value={`${(selectedItem?.quantity || 0) - (itemDetails?.reserved || 0)} ${selectedItem?.unit}`} />
          </InfoSection>
        </div>
      )
    },
    {
      key: 'suppliers',
      label: 'Suppliers',
      icon: TrendingUp,
      content: (
        <div className="space-y-4">
          {detailsLoading ? (
            <p>Loading suppliers...</p>
          ) : itemDetails?.suppliers?.length > 0 ? (
            itemDetails.suppliers.map((supplier) => (
              <Card key={supplier.id}>
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-semibold">{supplier.name}</h4>
                    {supplier.is_primary && (
                      <Badge>Primary</Badge>
                    )}
                  </div>
                  <div className="space-y-1 text-sm">
                    <InfoRow label="Unit Cost" value={`€${supplier.unit_cost}`} />
                    <InfoRow label="MOQ" value={supplier.moq} />
                    <InfoRow label="Lead Time" value={`${supplier.lead_time_days} days`} />
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            <p className="text-muted-foreground">No suppliers configured</p>
          )}
        </div>
      )
    },
    {
      key: 'pricing',
      label: 'Pricing',
      icon: DollarSign,
      content: (
        <InfoSection title="Cost Information">
          <InfoRow label="Average Cost" value={`€${itemDetails?.avg_cost || 0}`} />
          <InfoRow label="Last Cost" value={`€${itemDetails?.last_cost || 0}`} />
          <InfoRow label="Lowest Cost" value={`€${itemDetails?.min_cost || 0}`} />
          <InfoRow label="Highest Cost" value={`€${itemDetails?.max_cost || 0}`} />
        </InfoSection>
      )
    },
    {
      key: 'pack',
      label: 'Pack & Unit',
      icon: Box,
      content: (
        <InfoSection title="Pack Configuration">
          <InfoRow label="Base Unit" value={selectedItem?.unit} />
          <InfoRow label="Pack Size" value={itemDetails?.pack_size} />
          <InfoRow label="Pack Unit" value={itemDetails?.pack_unit} />
        </InfoSection>
      )
    },
    {
      key: 'waste',
      label: 'Waste & Yield',
      icon: Trash2,
      content: (
        <InfoSection title="Waste Tracking">
          <InfoRow label="Waste (7d)" value={`${itemDetails?.waste_7d || 0} ${selectedItem?.unit}`} />
          <InfoRow label="Waste (30d)" value={`${itemDetails?.waste_30d || 0} ${selectedItem?.unit}`} />
          <InfoRow label="Yield %" value={`${itemDetails?.yield_percent || 100}%`} />
        </InfoSection>
      )
    },
    {
      key: 'recipes',
      label: 'Recipes',
      icon: ChefHat,
      content: (
        <div className="space-y-2">
          {itemDetails?.recipes?.map((recipe) => (
            <Card key={recipe.id}>
              <CardContent className="pt-4">
                <h4 className="font-medium">{recipe.name}</h4>
                <p className="text-sm text-muted-foreground">
                  Uses {recipe.quantity} {selectedItem?.unit}
                </p>
              </CardContent>
            </Card>
          )) || <p>No recipes use this item</p>}
        </div>
      )
    },
    {
      key: 'movements',
      label: 'Stock Movements',
      icon: Activity,
      content: (
        <div className="space-y-2">
          {itemDetails?.movements?.map((movement, idx) => (
            <div key={idx} className="flex items-center justify-between py-2 border-b">
              <div>
                <p className="text-sm font-medium">{movement.type}</p>
                <p className="text-xs text-muted-foreground">{movement.date}</p>
              </div>
              <span className={movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}>
                {movement.quantity > 0 ? '+' : ''}{movement.quantity}
              </span>
            </div>
          )) || <p>No recent movements</p>}
        </div>
      )
    },
    {
      key: 'audit',
      label: 'Audit',
      icon: History,
      content: (
        <InfoSection title="Audit Trail">
          <InfoRow label="Created" value={selectedItem?.created_at} />
          <InfoRow label="Last Updated" value={selectedItem?.updated_at} />
          <InfoRow label="Updated By" value={itemDetails?.updated_by} />
        </InfoSection>
      )
    }
  ];

  return (
    <PageContainer
      title="Inventory Items"
      description="Manage your inventory items with detailed tracking"
      actions={
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
          <Button variant="outline" size="sm">
            <Upload className="h-4 w-4 mr-2" />
            Import
          </Button>
          <Button size="sm">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
        </div>
      }
    >
      <div className="space-y-4">
        {/* FilterBar */}
        <FilterBar
          filters={FILTERS}
          activeFilters={filters}
          onFilterChange={handleFilterChange}
          onReset={handleReset}
          onSaveView={handleSaveView}
          quickSearch={quickSearch}
          onQuickSearchChange={setQuickSearch}
          savedViews={savedViews}
          currentView={currentView}
          onSelectView={setCurrentView}
          showAdvanced={showAdvanced}
          onToggleAdvanced={() => setShowAdvanced(!showAdvanced)}
        />

        {/* DataList */}
        <DataList
          columns={COLUMNS}
          data={items}
          loading={loading}
          pagination={pagination}
          onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
          onPageSizeChange={(pageSize) => setPagination(prev => ({ ...prev, page: 1, pageSize }))}
          onSort={(key, direction) => setSortBy({ key, direction })}
          onRowClick={handleRowClick}
          emptyMessage="No inventory items found"
          density="comfortable"
        />

        {/* DetailDrawer */}
        <DetailDrawer
          open={drawerOpen}
          onOpenChange={setDrawerOpen}
          title={selectedItem?.name}
          subtitle={`SKU: ${selectedItem?.sku || 'N/A'}`}
          badge={{
            text: selectedItem?.quantity < selectedItem?.par_level ? 'Low Stock' : 'In Stock',
            variant: selectedItem?.quantity < selectedItem?.par_level ? 'destructive' : 'default'
          }}
          tabs={drawerTabs}
          actions={[
            { label: 'Edit', onClick: () => {}, icon: Package },
            { label: 'Adjust Stock', onClick: () => {}, variant: 'outline' },
            { label: 'Order', onClick: () => {}, variant: 'outline', icon: Plus }
          ]}
          width="xl"
        />
      </div>
    </PageContainer>
  );
}
