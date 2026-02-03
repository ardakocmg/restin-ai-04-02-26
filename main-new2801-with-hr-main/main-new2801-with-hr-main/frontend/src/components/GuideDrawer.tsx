import React, { useState, useEffect } from 'react';
import {
  Drawer,
  Box,
  Typography,
  IconButton,
  Tabs,
  Tab,
  Chip,
  Card,
  CardMedia,
  List,
  ListItem,
  ListItemText,
  Divider,
  Button,
  CircularProgress,
} from '@mui/material';
import {
  Close as CloseIcon,
  Image as ImageIcon,
  ListAlt as StepsIcon,
  Scale as MeasuresIcon,
  Edit as EditIcon,
  Add as AddIcon,
} from '@mui/icons-material';
import GuideService, { GuideDocument } from '../services/GuideService';

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
  const [activeTab, setActiveTab] = useState(0);

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

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
  };

  const renderPhotos = () => {
    if (!guide?.photos || guide.photos.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          <ImageIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
          <Typography>No photos available</Typography>
        </Box>
      );
    }

    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 2, p: 2 }}>
        {guide.photos.map((photo, index) => (
          <Card key={index} sx={{ position: 'relative' }}>
            <CardMedia
              component="img"
              height="200"
              image={photo.url}
              alt={photo.label}
              sx={{ objectFit: 'cover' }}
            />
            <Box sx={{ p: 1 }}>
              <Chip label={photo.label} size="small" color="primary" />
            </Box>
          </Card>
        ))}
      </Box>
    );
  };

  const renderSteps = () => {
    if (!guide?.steps || guide.steps.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          <StepsIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
          <Typography>No steps available</Typography>
        </Box>
      );
    }

    return (
      <List sx={{ p: 2 }}>
        {guide.steps.map((step, index) => (
          <React.Fragment key={index}>
            <ListItem
              sx={{
                flexDirection: 'column',
                alignItems: 'flex-start',
                bgcolor: step.critical ? 'error.light' : 'transparent',
                borderRadius: 1,
                mb: 1,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 1 }}>
                <Chip
                  label={`Step ${step.step_no}`}
                  size="small"
                  color={step.critical ? 'error' : 'primary'}
                  sx={{ mr: 1 }}
                />
                <Typography variant="subtitle1" fontWeight="bold">
                  {step.title}
                </Typography>
                {step.duration_seconds && (
                  <Chip
                    label={`${Math.floor(step.duration_seconds / 60)}m`}
                    size="small"
                    sx={{ ml: 'auto' }}
                  />
                )}
              </Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {step.description}
              </Typography>
              {step.required_tools.length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {step.required_tools.map((tool, i) => (
                    <Chip key={i} label={tool} size="small" variant="outlined" />
                  ))}
                </Box>
              )}
              {step.station && (
                <Chip label={step.station} size="small" color="secondary" sx={{ mt: 1 }} />
              )}
            </ListItem>
            {index < guide.steps.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    );
  };

  const renderMeasures = () => {
    if (!guide?.measures || guide.measures.length === 0) {
      return (
        <Box sx={{ textAlign: 'center', py: 4, color: 'text.secondary' }}>
          <MeasuresIcon sx={{ fontSize: 48, mb: 1, opacity: 0.3 }} />
          <Typography>No measures available</Typography>
        </Box>
      );
    }

    return (
      <List sx={{ p: 2 }}>
        {guide.measures.map((measure, index) => (
          <React.Fragment key={index}>
            <ListItem sx={{ flexDirection: 'column', alignItems: 'flex-start' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 1 }}>
                <Chip label={measure.line_type} size="small" color="primary" sx={{ mr: 1 }} />
                <Typography variant="subtitle1" fontWeight="bold">
                  {measure.name}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 2, width: '100%' }}>
                <Typography variant="body2">
                  <strong>Qty:</strong> {measure.qty_value} {measure.qty_unit_input}
                </Typography>
                <Typography variant="body2">
                  <strong>Canonical:</strong> {measure.qty_value_canonical} {measure.qty_unit_canonical}
                </Typography>
              </Box>
              {measure.yield_pct && (
                <Typography variant="body2" color="success.main">
                  Yield: {measure.yield_pct}%
                </Typography>
              )}
              {measure.waste_pct && (
                <Typography variant="body2" color="error.main">
                  Waste: {measure.waste_pct}%
                </Typography>
              )}
              {measure.notes && (
                <Typography variant="body2" color="text.secondary" sx={{ mt: 1, fontStyle: 'italic' }}>
                  {measure.notes}
                </Typography>
              )}
            </ListItem>
            {index < guide.measures.length - 1 && <Divider />}
          </React.Fragment>
        ))}
      </List>
    );
  };

  const renderNoGuide = () => (
    <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
      <Typography variant="h6" gutterBottom>
        No Guide Available
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        This {entityType.replace('_', ' ')} doesn't have a guide yet.
      </Typography>
      {!readOnly && onEdit && (
        <Button variant="contained" startIcon={<AddIcon />} onClick={onEdit}>
          Create Guide
        </Button>
      )}
    </Box>
  );

  return (
    <Drawer anchor="right" open={open} onClose={onClose} PaperProps={{ sx: { width: { xs: '100%', sm: 600 } } }}>
      <Box sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Header */}
        <Box
          sx={{
            p: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
          }}
        >
          <Box>
            <Typography variant="h6">{entityName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {guideKind.toUpperCase()} Guide
            </Typography>
          </Box>
          <Box>
            {!readOnly && onEdit && guide && (
              <IconButton onClick={onEdit} sx={{ mr: 1 }}>
                <EditIcon />
              </IconButton>
            )}
            <IconButton onClick={onClose}>
              <CloseIcon />
            </IconButton>
          </Box>
        </Box>

        {/* Content */}
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', flex: 1 }}>
            <CircularProgress />
          </Box>
        ) : !guide ? (
          renderNoGuide()
        ) : (
          <>
            {/* Tabs */}
            <Tabs value={activeTab} onChange={handleTabChange} sx={{ borderBottom: 1, borderColor: 'divider' }}>
              <Tab icon={<ImageIcon />} label="Photos" />
              <Tab icon={<StepsIcon />} label="Steps" />
              <Tab icon={<MeasuresIcon />} label="Measures" />
            </Tabs>

            {/* Tab Content */}
            <Box sx={{ flex: 1, overflow: 'auto' }}>
              {activeTab === 0 && renderPhotos()}
              {activeTab === 1 && renderSteps()}
              {activeTab === 2 && renderMeasures()}
            </Box>

            {/* Footer */}
            {guide.tags && guide.tags.length > 0 && (
              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Typography variant="caption" color="text.secondary" sx={{ mb: 1, display: 'block' }}>
                  Tags:
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {guide.tags.map((tag, i) => (
                    <Chip key={i} label={tag} size="small" />
                  ))}
                </Box>
              </Box>
            )}
          </>
        )}
      </Box>
    </Drawer>
  );
};

export default GuideDrawer;
