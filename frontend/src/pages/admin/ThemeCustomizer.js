import React, { useState } from 'react';
import { useTheme, PRESET_THEMES } from '../../context/ThemeContext';
import { toast } from 'sonner';
import PageContainer from '../../layouts/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs';
import { Palette, Check, Paintbrush } from 'lucide-react';
import { cn } from '../../lib/utils';

export default function ThemeCustomizer() {
  const { currentTheme, presetThemes, saveTheme, setTheme } = useTheme();
  const [customTheme, setCustomTheme] = useState({
    id: 'custom',
    name: 'Custom Theme',
    primary: '#2563eb',
    primaryHover: '#1d4ed8',
    primaryLight: '#dbeafe',
    accent: '#3b82f6',
    success: '#10b981',
    warning: '#f59e0b',
    danger: '#ef4444',
    sidebar: '#ffffff',
    sidebarText: '#1f2937',
    sidebarActive: '#dbeafe',
    sidebarActiveText: '#2563eb'
  });

  const handlePresetSelect = async (themeId) => {
    const theme = presetThemes[themeId];
    setTheme(theme);
    const success = await saveTheme(themeId);
    if (success) {
      toast.success(`Theme changed to ${theme.name}`);
    } else {
      toast.error('Failed to save theme');
    }
  };

  const handleCustomSave = async () => {
    setTheme(customTheme);
    const success = await saveTheme(null, customTheme);
    if (success) {
      toast.success('Custom theme saved');
    } else {
      toast.error('Failed to save theme');
    }
  };

  const previewTheme = (theme) => {
    setTheme(theme);
  };

  return (
    <PageContainer
      title="Theme Customizer"
      description="Customize your brand colors and appearance"
    >
      <Tabs defaultValue="presets" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="presets">
            <Palette className="w-4 h-4 mr-2" />
            Preset Themes
          </TabsTrigger>
          <TabsTrigger value="custom">
            <Paintbrush className="w-4 h-4 mr-2" />
            Custom Colors
          </TabsTrigger>
        </TabsList>

        {/* Preset Themes */}
        <TabsContent value="presets">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.values(presetThemes).map((theme) => (
              <Card 
                key={theme.id}
                className={cn(
                  'cursor-pointer transition-all hover:shadow-md',
                  currentTheme?.id === theme.id && 'ring-2 ring-offset-2',
                )}
                style={{ 
                  borderColor: theme.primary,
                  ringColor: theme.primary 
                }}
                onClick={() => handlePresetSelect(theme.id)}
              >
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="font-semibold text-lg">{theme.name}</h3>
                    {currentTheme?.id === theme.id && (
                      <Badge className="bg-green-100 text-green-700">
                        <Check className="w-3 h-3 mr-1" />
                        Active
                      </Badge>
                    )}
                  </div>
                  
                  {/* Color Preview */}
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <div 
                        className="h-10 flex-1 rounded" 
                        style={{ backgroundColor: theme.primary }}
                        title="Primary"
                      />
                      <div 
                        className="h-10 flex-1 rounded" 
                        style={{ backgroundColor: theme.accent }}
                        title="Accent"
                      />
                    </div>
                    <div className="flex gap-2">
                      <div 
                        className="h-8 flex-1 rounded" 
                        style={{ backgroundColor: theme.success }}
                        title="Success"
                      />
                      <div 
                        className="h-8 flex-1 rounded" 
                        style={{ backgroundColor: theme.warning }}
                        title="Warning"
                      />
                      <div 
                        className="h-8 flex-1 rounded" 
                        style={{ backgroundColor: theme.danger }}
                        title="Danger"
                      />
                    </div>
                  </div>

                  <Button
                    className="w-full mt-4"
                    size="sm"
                    style={{ 
                      backgroundColor: theme.primary,
                      color: '#ffffff'
                    }}
                    onMouseEnter={(e) => e.target.style.backgroundColor = theme.primaryHover}
                    onMouseLeave={(e) => e.target.style.backgroundColor = theme.primary}
                  >
                    Preview Theme
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        {/* Custom Theme */}
        <TabsContent value="custom">
          <Card>
            <CardHeader>
              <CardTitle>Create Custom Theme</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Theme Name</Label>
                    <Input
                      value={customTheme.name}
                      onChange={(e) => setCustomTheme({...customTheme, name: e.target.value})}
                      placeholder="My Brand Theme"
                    />
                  </div>
                  
                  <div>
                    <Label>Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={customTheme.primary}
                        onChange={(e) => setCustomTheme({...customTheme, primary: e.target.value})}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <Input
                        value={customTheme.primary}
                        onChange={(e) => setCustomTheme({...customTheme, primary: e.target.value})}
                        placeholder="#2563eb"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Accent Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={customTheme.accent}
                        onChange={(e) => setCustomTheme({...customTheme, accent: e.target.value})}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <Input
                        value={customTheme.accent}
                        onChange={(e) => setCustomTheme({...customTheme, accent: e.target.value})}
                        placeholder="#3b82f6"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Success Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={customTheme.success}
                        onChange={(e) => setCustomTheme({...customTheme, success: e.target.value})}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <Input
                        value={customTheme.success}
                        onChange={(e) => setCustomTheme({...customTheme, success: e.target.value})}
                        placeholder="#10b981"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Warning Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={customTheme.warning}
                        onChange={(e) => setCustomTheme({...customTheme, warning: e.target.value})}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <Input
                        value={customTheme.warning}
                        onChange={(e) => setCustomTheme({...customTheme, warning: e.target.value})}
                        placeholder="#f59e0b"
                      />
                    </div>
                  </div>

                  <div>
                    <Label>Danger Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        value={customTheme.danger}
                        onChange={(e) => setCustomTheme({...customTheme, danger: e.target.value})}
                        className="w-20 h-10 cursor-pointer"
                      />
                      <Input
                        value={customTheme.danger}
                        onChange={(e) => setCustomTheme({...customTheme, danger: e.target.value})}
                        placeholder="#ef4444"
                      />
                    </div>
                  </div>
                </div>

                {/* Live Preview */}
                <div>
                  <Label className="mb-3 block">Live Preview</Label>
                  <Card className="border-2" style={{ borderColor: customTheme.primary }}>
                    <CardHeader style={{ backgroundColor: customTheme.primaryLight }}>
                      <CardTitle style={{ color: customTheme.primary }}>Preview Card</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-4">
                      <Button 
                        className="w-full"
                        style={{ 
                          backgroundColor: customTheme.primary,
                          color: '#ffffff'
                        }}
                      >
                        Primary Button
                      </Button>
                      <div className="flex gap-2">
                        <Badge style={{ backgroundColor: customTheme.success, color: '#ffffff' }}>
                          Success
                        </Badge>
                        <Badge style={{ backgroundColor: customTheme.warning, color: '#ffffff' }}>
                          Warning
                        </Badge>
                        <Badge style={{ backgroundColor: customTheme.danger, color: '#ffffff' }}>
                          Danger
                        </Badge>
                      </div>
                      <div 
                        className="p-3 rounded-lg"
                        style={{ backgroundColor: customTheme.sidebarActive, color: customTheme.sidebarActiveText }}
                      >
                        Active Navigation Item
                      </div>
                    </CardContent>
                  </Card>

                  <div className="mt-4 space-y-2">
                    <Button
                      onClick={() => previewTheme(customTheme)}
                      variant="outline"
                      className="w-full"
                    >
                      Preview on Site
                    </Button>
                    <Button
                      onClick={handleCustomSave}
                      className="w-full"
                      style={{ 
                        backgroundColor: customTheme.primary,
                        color: '#ffffff'
                      }}
                    >
                      Save Custom Theme
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}
