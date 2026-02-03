import React, { useState } from 'react';
import { IconButton, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material';
import {
  MoreVert as MoreVertIcon,
  MenuBook as GuideIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  ContentCopy as CopyIcon,
} from '@mui/icons-material';
import GuideDrawer from './GuideDrawer';

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
 * 
 * Usage:
 * <EntityMenu
 *   entityType="menu_item"
 *   entityId={item.id}
 *   entityName={item.name}
 *   guideKind="service"
 *   onEdit={() => handleEdit(item)}
 *   onDelete={() => handleDelete(item)}
 *   showGuideOption={true}
 * />
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
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showGuide, setShowGuide] = useState(false);
  const open = Boolean(anchorEl);

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    event.stopPropagation();
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleGuideClick = () => {
    setShowGuide(true);
    handleClose();
  };

  const handleEditClick = () => {
    onEdit?.();
    handleClose();
  };

  const handleDeleteClick = () => {
    onDelete?.();
    handleClose();
  };

  const handleDuplicateClick = () => {
    onDuplicate?.();
    handleClose();
  };

  return (
    <>
      <IconButton
        aria-label="more"
        aria-controls={open ? 'entity-menu' : undefined}
        aria-haspopup="true"
        aria-expanded={open ? 'true' : undefined}
        onClick={handleClick}
        size="small"
      >
        <MoreVertIcon />
      </IconButton>

      <Menu
        id="entity-menu"
        anchorEl={anchorEl}
        open={open}
        onClose={handleClose}
        MenuListProps={{
          'aria-labelledby': 'entity-menu-button',
        }}
      >
        {showGuideOption && (
          <MenuItem onClick={handleGuideClick}>
            <ListItemIcon>
              <GuideIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>View Guide</ListItemText>
          </MenuItem>
        )}

        {onEdit && (
          <MenuItem onClick={handleEditClick}>
            <ListItemIcon>
              <EditIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit</ListItemText>
          </MenuItem>
        )}

        {onDuplicate && (
          <MenuItem onClick={handleDuplicateClick}>
            <ListItemIcon>
              <CopyIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText>Duplicate</ListItemText>
          </MenuItem>
        )}

        {onDelete && (
          <MenuItem onClick={handleDeleteClick}>
            <ListItemIcon>
              <DeleteIcon fontSize="small" color="error" />
            </ListItemIcon>
            <ListItemText>Delete</ListItemText>
          </MenuItem>
        )}
      </Menu>

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
