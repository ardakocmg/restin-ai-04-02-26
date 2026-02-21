import { Badge } from '@/components/ui/badge';
import { Card,CardContent,CardHeader,CardTitle } from '@/components/ui/card';
import { GitBranch,Package } from 'lucide-react';

function RecipeNode({ component, depth = 0 }) {
  const indent = depth * 24;

  return (
    <div style={{ marginLeft: `${indent}px`  /* keep-inline */ }} className="mb-2">
      {component.type === 'SKU' ? (
        <div className="flex items-center gap-2 p-2 bg-background rounded border">
          <Package className="h-4 w-4 text-slate-600" />
          <span className="font-medium text-foreground">{component.sku_name}</span>
          <Badge variant="outline" className="text-xs ml-auto">
            {component.qty_base} {component.sku_unit}
          </Badge>
          {component.waste_factor !== 1.0 && (
            <Badge variant="outline" className="text-xs bg-orange-50">
              Waste: {((1 - component.waste_factor) * 100).toFixed(1)}%
            </Badge>
          )}
        </div>
      ) : (
        <div>
          <div className="flex items-center gap-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded border border-blue-200">
            <GitBranch className="h-4 w-4 text-blue-600" />
            <span className="font-medium text-blue-900">Sub-Recipe</span>
            <Badge variant="outline" className="text-xs">
              {component.qty_base}
            </Badge>
          </div>
          {component.sub_recipe?.components?.map((subComp, idx) => (
            <RecipeNode key={idx} component={subComp} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function RecipeTab({ recipeTree, sku }) {
  if (!recipeTree) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-slate-500">
          No active recipe for this item
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Recipe Tree</CardTitle>
            <Badge>Version {recipeTree.version}</Badge>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200">
              <span className="font-medium text-green-900">Output: {sku?.name}</span>
              <Badge className="bg-green-100 text-green-700">
                Yield: {recipeTree.yield_qty} {recipeTree.yield_uom}
              </Badge>
            </div>

            <div className="mt-4">
              <p className="text-sm font-medium text-foreground mb-3">Components:</p>
              {recipeTree.components?.map((comp, idx) => (
                <RecipeNode key={idx} component={comp} depth={0} />
              ))}
            </div>

            {recipeTree.notes && (
              <div className="mt-4 p-3 bg-background rounded text-sm text-slate-700">
                <strong>Notes:</strong> {recipeTree.notes}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
