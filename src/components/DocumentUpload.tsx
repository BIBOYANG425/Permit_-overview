"use client";

import { useState, useRef } from "react";
import type { UploadedDocument } from "@/lib/types";

export type { UploadedDocument };

export default function DocumentUpload({
  onDocumentsProcessed,
  isLoading,
}: {
  onDocumentsProcessed: (docs: UploadedDocument[]) => void;
  isLoading: boolean;
}) {
  const [documents, setDocuments] = useState<UploadedDocument[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      for (let i = 0; i < files.length; i++) {
        formData.append("files", files[i]);
      }

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status}`);
      }

      const data = await response.json();
      const newDocs: UploadedDocument[] = data.documents || [];
      const allDocs = [...documents, ...newDocs];
      setDocuments(allDocs);
      onDocumentsProcessed(allDocs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeDocument = (index: number) => {
    const updated = documents.filter((_, i) => i !== index);
    setDocuments(updated);
    onDocumentsProcessed(updated);
  };

  return (
    <div className="bg-[#0F1117] border border-slate-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-blue-400 text-sm">&#128196;</span>
        <span className="text-sm font-semibold text-slate-300">Upload Documents</span>
      </div>

      <p className="text-xs text-slate-500">
        Upload permits, environmental reports, site plans, or any project documents.
        The AI will extract relevant details to improve its analysis.
      </p>

      {/* Drop zone / upload button */}
      <label
        className={`flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg cursor-pointer transition-colors ${
          uploading || isLoading
            ? "border-slate-700 bg-slate-900/30 cursor-not-allowed"
            : "border-slate-700 hover:border-slate-500 hover:bg-slate-800/20"
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.txt,.md,.csv,.json,.doc,.docx"
          onChange={handleUpload}
          disabled={uploading || isLoading}
          className="hidden"
        />
        {uploading ? (
          <div className="flex items-center gap-2 text-slate-400 text-sm">
            <div className="w-4 h-4 border-2 border-slate-600 border-t-slate-400 rounded-full animate-spin" />
            Processing documents...
          </div>
        ) : (
          <div className="text-center">
            <div className="text-slate-500 text-lg mb-1">+</div>
            <p className="text-xs text-slate-500">
              Click to upload PDF, TXT, DOC, or other documents
            </p>
            <p className="text-xs text-slate-600 mt-0.5">Multiple files supported</p>
          </div>
        )}
      </label>

      {/* Error */}
      {error && (
        <div className="bg-red-950/30 border border-red-900/50 rounded-md px-3 py-2 text-xs text-red-400">
          {error}
        </div>
      )}

      {/* Uploaded files list */}
      {documents.length > 0 && (
        <div className="space-y-2">
          <span className="text-xs text-slate-500 font-semibold">
            {documents.length} document{documents.length > 1 ? "s" : ""} loaded
          </span>
          {documents.map((doc, i) => (
            <div
              key={i}
              className="flex items-center justify-between bg-[#080A0F] border border-slate-800 rounded-md px-3 py-2"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-emerald-400 text-xs flex-shrink-0">
                  {doc.text.startsWith("[") ? "\u2717" : "\u2713"}
                </span>
                <div className="min-w-0">
                  <span className="text-xs text-slate-300 font-mono truncate block">
                    {doc.name}
                  </span>
                  <span className="text-xs text-slate-600">
                    {doc.pages ? `${doc.pages} pages` : ""}{" "}
                    {doc.text.startsWith("[") ? doc.text : `${doc.text.length.toLocaleString()} chars extracted`}
                  </span>
                </div>
              </div>
              <button
                onClick={() => removeDocument(i)}
                disabled={isLoading}
                className="text-slate-600 hover:text-red-400 transition-colors text-xs ml-2 flex-shrink-0 disabled:opacity-50"
              >
                remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
