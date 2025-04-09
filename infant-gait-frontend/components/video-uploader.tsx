"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X, Download } from "lucide-react";
import axios from "@/lib/axiosConfig";

export default function VideoUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [segments, setSegments] = useState<Array<{
    video_url: string;
    overlay_url: string;
    duration: number;
    start_frame: number;
    end_frame: number;
  }> | null>(null);
  const [poseDataUrl, setPoseDataUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type.startsWith("video/")) {
        setPreviewUrl(URL.createObjectURL(selectedFile));
        setFile(selectedFile);
        setError(null);
      } else {
        setError("Please select a valid video file");
        setFile(null);
      }
    }
  };

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);
  

  const handleUpload = async () => {
    if (!file) return;
  
    try {
      setUploading(true);
  
      const formData = new FormData();
      formData.append("file", file);
  
      const result = await uploadVideo(formData);
      
      // Update these lines
      setSegments(result.segments);
      setPoseDataUrl(result.pose_data_url);
  
      setUploading(false);
    } catch (err) {
      setError("Failed to upload video. Please try again.");
      setUploading(false);
    }
  };  

  const clearFile = () => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  async function uploadVideo(formData: FormData): Promise<any> {
    try {
      const response = await axios.post("/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total!);
        },
      });
      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("Error uploading video:", error.response?.data || error.message);
        throw new Error(error.response?.data?.error || "Failed to upload video");
      } else {
        console.error("Unexpected error:", error);
        throw new Error("An unexpected error occurred");
      }
    }
  }

  return (
    <div className="space-y-4">
      <div
        className={`border-2 border-dashed rounded-lg p-8 text-center ${
          file ? "border-primary" : "border-border"
        } transition-colors`}
      >
        {!file ? (
          <div className="space-y-4">
            <div className="flex justify-center">
              <Upload className="h-12 w-12 text-muted-foreground" />
            </div>
            <div>
              <p className="text-lg font-medium">Drag and drop your video here</p>
              <p className="text-sm text-muted-foreground mt-1">Or click to browse your files</p>
            </div>
            <input
              type="file"
              accept="video/*"
              onChange={handleFileChange}
              className="hidden"
              ref={fileInputRef}
              disabled={uploading}
            />
            <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
              Select Video
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-primary/10 rounded-md flex items-center justify-center">
                  <video className="w-10 h-10 object-cover rounded">
                    <source src={URL.createObjectURL(file)} type={file.type} />
                  </video>
                </div>
                <div className="text-left">
                  <p className="font-medium truncate max-w-[200px]">{file.name}</p>
                  <p className="text-sm text-muted-foreground">{(file.size / (1024 * 1024)).toFixed(2)} MB</p>
                </div>
              </div>
              {!uploading && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={clearFile}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </Button>
              )}
            </div>

            {uploading && (
              <div className="space-y-2">
                <p className="text-sm text-muted-foreground">Processing...</p>
              </div>
            )}

            {!uploading && (
              <Button onClick={handleUpload} className="w-full">
                Upload and Process Video
              </Button>
            )}
          </div>
        )}
      </div>

      {error && <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm">{error}</div>}

      {segments && (
        <div className="space-y-6">
          <div className="border-t pt-4">
            <h2 className="text-xl font-semibold mb-4">Processed Segments</h2>
            <div className="space-y-4">
              {segments.map((segment, index) => (
                <div key={index} className="border rounded-lg p-4">
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <h3 className="font-medium mb-2">
                        Segment {index + 1} ({formatDuration(segment.duration)})
                      </h3>
                      <div className="flex gap-2">
                        <Button
                          onClick={() => window.open(
                            `http://127.0.0.1:5000${segment.video_url}`,
                            '_blank'
                          )}
                          variant="outline"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Original Video
                        </Button>
                        <Button
                          onClick={() => window.open(
                            `http://127.0.0.1:5000${segment.overlay_url}`,
                            '_blank'
                          )}
                          variant="outline"
                        >
                          <Download className="mr-2 h-4 w-4" />
                          Pose Overlay Video
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {poseDataUrl && (
            <div className="border-t pt-4">
              <h3 className="text-lg font-medium mb-2">Pose Data</h3>
              <Button
                onClick={() => window.open(
                  `http://127.0.0.1:5000${poseDataUrl}`,
                  '_blank'
                )}
                variant="outline"
              >
                <Download className="mr-2 h-4 w-4" />
                Download Pose Data (JSON)
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Helper function to format duration
function formatDuration(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60);
  return `${minutes}m ${remainingSeconds}s`;
}