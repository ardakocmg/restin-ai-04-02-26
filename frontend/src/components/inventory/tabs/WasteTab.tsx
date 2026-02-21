import { Card,CardContent,CardHeader,CardTitle } from '@/components/ui/card';

export default function WasteTab({ wasteProfile, sku }) {
  if (!wasteProfile) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500">
          No waste profile configured
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Waste Profile</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-slate-600">Trim Loss</p>
            <p className="text-xl font-bold text-orange-600">{wasteProfile.trim_loss}%</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Cook Loss</p>
            <p className="text-xl font-bold text-orange-600">{wasteProfile.cook_loss}%</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Spoilage</p>
            <p className="text-xl font-bold text-red-600">{wasteProfile.spoilage}%</p>
          </div>
          <div>
            <p className="text-sm text-slate-600">Trash</p>
            <p className="text-xl font-bold text-red-600">{wasteProfile.trash}%</p>
          </div>
        </div>
        {wasteProfile.notes && (
          <div className="pt-3 border-t">
            <p className="text-sm text-slate-700">{wasteProfile.notes}</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
