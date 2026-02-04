import React, { useState, useEffect } from 'react';
import {
  X,
  Image as ImageIcon,
  List as StepsIcon,
  Scale as MeasuresIcon,
  Edit2 as EditIcon,
  Plus as AddIcon,
  Loader2,
} from 'lucide-react';
import GuideService, { GuideDocument } from '../services/GuideService';
import { Button } from './ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from './ui/sheet';
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from './ui/tabs';
import {
  Card,
  CardContent,
} from './ui/card';

interface GuideDrawerProps {
  open: boolean;
  onClose: () => void;
  entityType: 'menu_item' | 'inventory_item' | 'recipe' | 'receiving' | 'task_template';
  entityId: string;
  entityName: string;
  guideKind?: 'service' | 'prep' | 'storage' | 'receiving' | 'recipe';
  onEdit?: () => void;
  readOnly?: boolean;
}

const GuideDrawer: React.FC<GuideDrawerProps> = ({
  open,
  onClose,
  entityType,
  entityId,
  entityName,
  guideKind = 'service',
  onEdit,
  readOnly = false,
}) => {
  const [guide, setGuide] = useState<GuideDocument | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && entityId) {
      loadGuide();
    }
  }, [open, entityId, entityType, guideKind]);

  const loadGuide = async () => {
    setLoading(true);
    try {
      const data = await GuideService.getGuideByEntity(entityType, entityId, guideKind);
      setGuide(data);
    } catch (error) {
      console.error('Failed to load guide:', error);
      setGuide(null);
    } finally {
      setLoading(false);
    }
  };

  const renderPhotos = () => {
    if (!guide?.photos || guide.photos.length === 0) {
      return (
        <div className="text-center py-8 text-zinc-500">
          <ImageIcon className="mx-auto h-12 w-12 mb-2 opacity-30" />
          <p>No photos available</p>
        </div>
      );
    }

    return (
      <div className="grid grid-cols-2 gap-4 p-2">
        {guide.photos.map((photo, index) => (
          <Card key={index} className="overflow-hidden bg-zinc-900 border-zinc-800">
            <div className="relative aspect-video">
              <img
                src={photo.url}
                alt={photo.label}
                className="object-cover w-full h-full"
              />
            </div>
            <div className="p-2">
              <span className="inline-flex items-center rounded-full bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20">
                {photo.label}
              </span>
            </div>
          </Card>
        ))}
      </div>
    );
  };

  const renderSteps = () => {
    if (!guide?.steps || guide.steps.length === 0) {
      return (
        <div className="text-center py-8 text-zinc-500">
          <StepsIcon className="mx-auto h-12 w-12 mb-2 opacity-30" />
          <p>No steps available</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 p-2">
        {guide.steps.map((step, index) => (
          <div
            key={index}
            className={`rounded-lg border p-4 ${step.critical
                ? 'bg-red-950/20 border-red-900/50'
                : 'bg-zinc-900/50 border-zinc-800'
              }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${step.critical
                    ? 'bg-red-400/10 text-red-400 ring-red-400/20'
                    : 'bg-zinc-400/10 text-zinc-400 ring-zinc-400/20'
                  }`}>
                  Step {step.step_no}
                </span>
                <h4 className="font-medium text-zinc-100">{step.title}</h4>
              </div>
              {step.duration_seconds && (
                <span className="text-xs text-zinc-500">
                  {Math.floor(step.duration_seconds / 60)}m
                </span>
              )}
            </div>

            <p className="text-sm text-zinc-400 mb-3">{step.description}</p>

            {step.required_tools.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {step.required_tools.map((tool, i) => (
                  <span key={i} className="inline-flex items-center rounded-md bg-zinc-800 px-2 py-1 text-xs font-medium text-zinc-400 border border-zinc-700">
                    {tool}
                  </span>
                ))}
              </div>
            )}

            {step.station && (
              <div className="mt-2">
                <span className="inline-flex items-center rounded-md bg-purple-400/10 px-2 py-1 text-xs font-medium text-purple-400 ring-1 ring-inset ring-purple-400/20">
                  {step.station}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderMeasures = () => {
    if (!guide?.measures || guide.measures.length === 0) {
      return (
        <div className="text-center py-8 text-zinc-500">
          <MeasuresIcon className="mx-auto h-12 w-12 mb-2 opacity-30" />
          <p>No measures available</p>
        </div>
      );
    }

    return (
      <div className="space-y-4 p-2">
        {guide.measures.map((measure, index) => (
          <div key={index} className="rounded-lg bg-zinc-900/50 border border-zinc-800 p-4">
            <div className="flex items-center mb-2">
              <span className="inline-flex items-center rounded-md bg-blue-500/10 px-2 py-1 text-xs font-medium text-blue-400 ring-1 ring-inset ring-blue-500/20 mr-2">
                {measure.line_type}
              </span>
              <h4 className="font-medium text-zinc-100">{measure.name}</h4>
            </div>

            <div className="grid grid-cols-2 gap-4 my-2 text-sm">
              <div className="text-zinc-400">
                <strong className="text-zinc-300">Qty:</strong> {measure.qty_value} {measure.qty_unit_input}
              </div>
              <div className="text-zinc-400">
                <strong className="text-zinc-300">Canonical:</strong> {measure.qty_value_canonical} {measure.qty_unit_canonical}
              </div>
            </div>

            <div className="flex gap-4 text-sm">
              {measure.yield_pct && (
                <span className="text-green-400">Yield: {measure.yield_pct}%</span>
              )}
              {measure.waste_pct && (
                <span className="text-red-400">Waste: {measure.waste_pct}%</span>
              )}
            </div>

            {measure.notes && (
              <p className="mt-2 text-sm text-zinc-500 italic border-l-2 border-zinc-700 pl-2">
                {measure.notes}
              </p>
            )}
          </div>
        ))}
      </div>
    );
  };

  const renderNoGuide = () => (
    <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
      <h3 className="text-lg font-medium text-zinc-100 mb-2">No Guide Available</h3>
      <p className="text-sm text-zinc-400 mb-6">
        This {entityType.replace('_', ' ')} doesn't have a guide yet.
      </p>
      {!readOnly && onEdit && (
        <Button onClick={onEdit}>
          <AddIcon className="mr-2 h-4 w-4" />
          Create Guide
        </Button>
      )}
    </div>
  );

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col bg-zinc-950 border-l-zinc-800">
        {/* Header */}
        <div className="p-4 border-b border-zinc-800 flex items-center justify-between">
          <div>
            <SheetTitle className="text-zinc-100">{entityName}</SheetTitle>
            <SheetDescription className="text-zinc-400">
              {guideKind.toUpperCase()} Guide
            </SheetDescription>
          </div>
          <div className="flex items-center gap-2">
            {!readOnly && onEdit && guide && (
              <Button variant="ghost" size="icon" onClick={onEdit}>
                <EditIcon className="h-4 w-4" />
              </Button>
            )}
            {/* Close button is handled by SheetPrimitive.Close in SheetContent but we can add custom if needed */}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-zinc-400" />
            </div>
          ) : !guide ? (
            renderNoGuide()
          ) : (
            <Tabs defaultValue="photos" className="flex-1 flex flex-col">
              <div className="px-4 pt-2">
                <TabsList className="w-full grid grid-cols-3">
                  <TabsTrigger value="photos">Photos</TabsTrigger>
                  <TabsTrigger value="steps">Steps</TabsTrigger>
                  <TabsTrigger value="measures">Measures</TabsTrigger>
                </TabsList>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                <TabsContent value="photos" className="mt-0 h-full">
                  {renderPhotos()}
                </TabsContent>
                <TabsContent value="steps" className="mt-0 h-full">
                  {renderSteps()}
                </TabsContent>
                <TabsContent value="measures" className="mt-0 h-full">
                  {renderMeasures()}
                </TabsContent>
              </div>

              {/* Footer Tags */}
              {guide.tags && guide.tags.length > 0 && (
                <div className="p-4 border-t border-zinc-800 bg-zinc-900/30">
                  <span className="text-xs text-zinc-500 block mb-2">Tags:</span>
                  <div className="flex flex-wrap gap-2">
                    {guide.tags.map((tag, i) => (
                      <span
                        key={i}
                        className="inline-flex items-center rounded-full bg-zinc-800 px-2.5 py-0.5 text-xs font-medium text-zinc-400"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default GuideDrawer;

