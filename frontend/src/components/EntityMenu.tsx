import {
BookOpen,
Copy,
Edit,
MoreVertical,
Trash2,
} from 'lucide-react';
import React,{ useState } from 'react';
import GuideDrawer from './GuideDrawer';
import { Button } from './ui/button';
import {
DropdownMenu,
DropdownMenuContent,
DropdownMenuItem,
DropdownMenuTrigger,
} from './ui/dropdown-menu';

interface EntityMenuProps {
  entityType: 'menu_item' | 'inventory_item' | 'recipe' | 'receiving' | 'task_template';
  entityId: string;
  entityName: string;
  guideKind?: 'service' | 'prep' | 'storage' | 'receiving' | 'recipe';
  onEdit?: () => void;
  onDelete?: () => void;
  onDuplicate?: () => void;
  showGuideOption?: boolean;
  readOnly?: boolean;
}

/**
 * Universal 3-dot menu for entities with guide support
 */
const EntityMenu: React.FC<EntityMenuProps> = ({
  entityType,
  entityId,
  entityName,
  guideKind = 'service',
  onEdit,
  onDelete,
  onDuplicate,
  showGuideOption = true,
  readOnly = false,
}) => {
  const [showGuide, setShowGuide] = useState(false);

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 p-0" aria-label="Action">
            <span className="sr-only">Open menu</span>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {showGuideOption && (
            <DropdownMenuItem onClick={() => setShowGuide(true)}>
              <BookOpen className="mr-2 h-4 w-4" />
              View Guide
            </DropdownMenuItem>
          )}
          {onEdit && (
            <DropdownMenuItem onClick={onEdit}>
              <Edit className="mr-2 h-4 w-4" />
              Edit
            </DropdownMenuItem>
          )}
          {onDuplicate && (
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="mr-2 h-4 w-4" />
              Duplicate
            </DropdownMenuItem>
          )}
          {onDelete && (
            <DropdownMenuItem onClick={onDelete} className="text-red-600">
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Guide Drawer */}
      <GuideDrawer
        open={showGuide}
        onClose={() => setShowGuide(false)}
        entityType={entityType}
        entityId={entityId}
        entityName={entityName}
        guideKind={guideKind}
        readOnly={readOnly}
      />
    </>
  );
};

export default EntityMenu;

