/**
 * Shared Document Uploader Component
 * Reusable across all modules
 */
import { useState } from "react";
import DocumentService from "../services/DocumentService";
import { Button } from "./ui/button";
import { toast } from "sonner";
import { Upload, Loader2, FileText, X } from "lucide-react";

export default function DocumentUploader({ 
  venueId, 
  module, 
  onUploadComplete,
  className = "" 
}) {
  const [loading, setLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
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
    } catch (error) {
      console.error("Upload failed:", error);
      toast.error(error.response?.data?.detail?.message || "Upload failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={`bg-zinc-900 rounded-lg p-6 border border-zinc-800 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Upload className="w-5 h-5 text-red-500" />
        <h3 className="text-lg font-bold text-white">Upload Document</h3>
      </div>

      {selectedFile ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-zinc-800 rounded">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-zinc-400" />
              <span className="text-sm text-white">{selectedFile.name}</span>
              <span className="text-xs text-zinc-500">({(selectedFile.size / 1024).toFixed(2)} KB)</span>
            </div>
            <button
              onClick={() => setSelectedFile(null)}
              className="text-zinc-500 hover:text-white"
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
              type="file"
              onChange={handleFileSelect}
              accept=".pdf,.jpg,.jpeg,.png,.docx,.xlsx"
              className="hidden"
            />
            <div className="border-2 border-dashed border-zinc-700 rounded-lg p-8 text-center cursor-pointer hover:border-red-500 transition-colors">
              <Upload className="w-12 h-12 mx-auto text-zinc-600 mb-4" />
              <p className="text-white mb-2">Click to select document</p>
              <p className="text-sm text-zinc-500">PDF, Image, Word, Excel supported</p>
              <p className="text-xs text-zinc-600 mt-2">OCR will extract text automatically</p>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
