/**
 * PHASE 1: HR Documents & Compliance
 */
import { useState, useEffect } from "react";
import { logger } from '@/lib/logger';

import { useAuth } from "@/context/AuthContext";

import api from "@/lib/api";

import { toast } from "sonner";

import { Button } from "@/components/ui/button";

import { Badge } from "@/components/ui/badge";

import { Loader2, FileText, Upload, AlertTriangle } from "lucide-react";

import { useHRFeatureFlags } from "@/hooks/useHRFeatureFlags";

import HRAccessPanel from "@/components/hr/HRAccessPanel";

export default function Documents() {
  const { user } = useAuth();
  const { getAccess, loading: flagsLoading } = useHRFeatureFlags();
  const [loading, setLoading] = useState(true);
  const [documents, setDocuments] = useState([]);

  const venueId = user?.venueId ;
  const access = getAccess('documents');

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/hr/documents?venue_id=${venueId}`);
      setDocuments(response.data);
    } catch (error: any) {
      logger.error("Failed to load documents:", error);
      if (error.response?.status !== 403) {
        toast.error("Failed to load documents");
      }
    } finally {
      setLoading(false);
    }
  };

  if (!flagsLoading && !access.enabled) {
    return (
      <div className="min-h-screen bg-background p-6">
        <div className="max-w-7xl mx-auto">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-foreground">Documents</h1>
            <p className="text-muted-foreground">HR document management</p>
          </div>
          <HRAccessPanel message="Documents module is disabled for your role." />
        </div>
      </div>
    );
  }

  const isExpiringSoon = (expiryDate) => {
    if (!expiryDate) return false;
    const expiry = new Date(expiryDate);
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    return expiry <= thirtyDays;
  };

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground dark:text-slate-50 mb-2">Documents & Compliance</h1>
            <p className="text-muted-foreground">Employee documents and certifications</p>
          </div>
          <Button className="bg-indigo-500 hover:bg-indigo-600">
            <Upload className="w-4 h-4 mr-2" />
            Upload Document
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-12 h-12 text-indigo-400 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {documents.map((doc) => (
              <div key={doc.id} className="bg-background rounded-lg p-6 border border-border shadow-sm">
                <div className="flex items-start justify-between mb-4">
                  <FileText className="w-8 h-8 text-blue-500" />
                  {doc.expiry_date && isExpiringSoon(doc.expiry_date) && (
                    <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  )}
                </div>

                <h3 className="text-lg font-bold text-foreground mb-2">{doc.title}</h3>
                <p className="text-sm text-muted-foreground mb-1">{doc.display_id}</p>
                <p className="text-xs text-muted-foreground capitalize mb-3">{doc.type} • {doc.visibility}</p>

                {doc.expiry_date && (
                  <div className="text-sm">
                    <p className="text-muted-foreground">Expires:</p>
                    <p className={isExpiringSoon(doc.expiry_date) ? "text-yellow-400" : "text-foreground"}>
                      {new Date(doc.expiry_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {documents.length === 0 && !loading && (
          <div className="text-center py-12 text-muted-foreground">
            <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No documents uploaded</p>
          </div>
        )}
      </div>
    </div>
  );
}