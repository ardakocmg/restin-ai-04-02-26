/**
 * Shared Document Uploader Component
 * Reusable across all modules
 */
import { FileText,Loader2,Upload,X } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { logger } from "../lib/logger";
import DocumentService,{ type DocumentModule } from "../services/DocumentService";
import { Button } from "./ui/button";

interface DocumentUploaderProps {
  venueId: string;
  module: DocumentModule;
  onUploadComplete?: (document: unknown) => void;
  className?: string;
}

export default function DocumentUploader({
  venueId,
  module,
  onUploadComplete,
  className = ""
}: DocumentUploaderProps) {
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = [
      "application/pdf",
      "image/jpeg",
      "image/png",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    ];

    if (!allowedTypes.includes(file.type)) {
      toast.error("Unsupported file type. Please upload PDF, Image, or Office document.");
      return;
    }

    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;

    setLoading(true);
    try {
      const result = await DocumentService.upload({
        venue_id: venueId,
        module,
        file: selectedFile
      });

      toast.success("Document uploaded successfully");
      setSelectedFile(null);

      if (onUploadComplete) {
        onUploadComplete(result.document);
      }
    } catch (err: unknown) {
      const error = err as /**/any;
      logger.error("Upload failed:", error);
      const response = error.response as /**/any | undefined;
      const data = response?.data as /**/any | undefined;
      const detail = data?.detail as /**/any | undefined;
      toast.error((detail?.message as string) || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-card rounded-lg p-6 border border-border ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Upload className="w-5 h-5 text-red-500" />
        <h3 className="text-lg font-bold text-foreground">Upload Document</h3>
      </div>

      {selectedFile ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-secondary rounded">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-muted-foreground" />
              <span className="text-sm text-foreground">{selectedFile.name}</span>
              <span className="text-xs text-muted-foreground">({(selectedFile.size / 1024).toFixed(2)} KB)</span>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              aria-label="Remove file"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <Button
            onClick={handleUpload}
            disabled={loading}
            className="w-full bg-red-500 hover:bg-red-600"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Uploading & Processing OCR...
              </>
            ) : (
              <>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </>
            )}
          </Button>
        </div>
      ) : (
        <div>
          <label className="block">
            <input
              aria-label="Upload document"
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
              className="hidden"
            />
            <div className="border-2 border-dashed border-border rounded-lg p-8 text-center cursor-pointer hover:border-red-500 transition-colors">
              <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-foreground mb-2">Click to select document</p>
              <p className="text-sm text-muted-foreground">PDF, Image, Word, Excel supported</p>
              <p className="text-xs text-muted-foreground mt-2">OCR will extract text automatically</p>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
