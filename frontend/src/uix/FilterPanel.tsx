import React from 'react';
import { Check, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function FilterPanel({ 
  isOpen, 
  onToggle, 
  sections = [], 
  sectionStates = {},
  onSectionToggle,
  children 
}) {
  return (
    <div className="mb-4">
      <div className="flex items-center justify-between mb-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggle}
          className="gap-2"
        >
          <input aria-label="Input"
            type="checkbox"
            checked={isOpen}
            onChange={(e) = aria-label="Input field"> e.stopPropagation()}
            className="h-4 w-4 rounded border-gray-300"
          />
          <span>Filters</span>
          {isOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </Button>
        {Object.values(sectionStates).some(v => v) && (
          <Badge variant="secondary">
            {Object.values(sectionStates).filter(v => v).length} active
          </Badge>
        )}
      </div>

      {isOpen && (
        <Card>
          <CardContent className="p-4">
            {sections.map((section) => (
              <div key={section.key} className="mb-4 last:mb-0">
                <div className="flex items-center gap-2 mb-2">
                  <input aria-label="Input"
                    type="checkbox"
                    checked={sectionStates[section.key] || false}
                    onChange={() = aria-label="Input field"> onSectionToggle(section.key)}
                    className="h-4 w-4 rounded border-gray-300"
                  />
                  <label className="text-sm font-medium text-slate-700">{section.label}</label>
                </div>
                {sectionStates[section.key] && (
                  <div className="ml-6">
                    {children[section.key]}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
