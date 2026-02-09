import { useState, useEffect } from 'react';
import { logger } from '@/lib/logger';

import PageContainer from '../../layouts/PageContainer';

import { Card, CardContent } from '../../components/ui/card';

import { Save, Eye } from 'lucide-react';

import api from '../../lib/api';

import { toast } from 'sonner';

export default function VisualContentEditor() {
  const [content, setContent] = useState({ title: '', markdown_content: '', html_content: '' });
  const [preview, setPreview] = useState(false);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      const venueId = localStorage.getItem('currentVenueId');
      await api.post(`/venues/${venueId}/content-editor/save`, {
        ...content,
        content_type: 'page'
      });
      toast.success('Content saved successfully!');
    } catch (error) {
      logger.error('Failed to save content:', error);
      toast.error('Failed to save content');
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageContainer
      title="Visual Content Editor"
      description="Create and edit content with markdown support"
      actions={
        <div className="flex gap-2">
          <button onClick={() => setPreview(!preview)} className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600">
            <Eye className="h-4 w-4" />
            {preview ? 'Edit' : 'Preview'}
          </button>
          <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50">
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      }
    >
      <Card className="border-slate-700">
        <CardContent className="p-6">
          {!preview ? (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Title</label>
                <input
                  type="text"
                  value={content.title}
                  onChange={(e) => setContent({ ...content, title: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded focus:outline-none focus:border-blue-500"
                  placeholder="Enter title..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2">Content (Markdown)</label>
                <textarea
                  value={content.markdown_content}
                  onChange={(e) => setContent({ ...content, markdown_content: e.target.value })}
                  rows={20}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded focus:outline-none focus:border-blue-500 font-mono text-sm"
                  placeholder="Write your content in markdown..."
                />
              </div>
              <div className="text-sm text-slate-400">
                <p>Markdown support: **bold**, *italic*, # headings, [links](url), etc.</p>
              </div>
            </div>
          ) : (
            <div className="prose prose-invert max-w-none">
              <h1 className="text-3xl font-bold mb-4">{content.title}</h1>
              <div className="whitespace-pre-wrap">{content.markdown_content}</div>
            </div>
          )}
        </CardContent>
      </Card>
    </PageContainer>
  );
}