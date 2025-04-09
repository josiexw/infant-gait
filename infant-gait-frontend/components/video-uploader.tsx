"use client";

import type React from "react";
import { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Upload, X } from "lucide-react";
import axios from "@/lib/axiosConfig";

export default function VideoUploader() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [framesWithOnePerson, setFramesWithOnePerson] = useState<number[] | null>(null);
  const [splicedVideoUrl, setSplicedVideoUrl] = useState<string | null>(null);
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

      // Upload the file
      const formData = new FormData();
      formData.append("file", file);

      const result = await uploadVideo(formData);
      const framesWithOnePerson = result.frames_with_one_person;
      const splicedVideoUrl = `http://127.0.0.1:5000${result.spliced_video_url}`;
      console.log("SPLICE URL", splicedVideoUrl)

      setFramesWithOnePerson(framesWithOnePerson);
      setSplicedVideoUrl(splicedVideoUrl);

      // Reset after successful upload
      setTimeout(() => {
        setUploading(false);
      }, 1500);
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

      {framesWithOnePerson && (
        <>
          <div className="mt-4">
            <h3 className="text-lg font-medium">Frames with Exactly One Person:</h3>
            <ul className="list-disc list-inside">
              {framesWithOnePerson.map((frame) => (
                <li key={frame}>Frame {frame}</li>
              ))}
            </ul>
          </div>

          {/* Update your video preview usage */}
          <video className="w-10 h-10 object-cover rounded">
            <source src={previewUrl || ''} type={file?.type} />
          </video>

          {/* Modify the download button */}
          <Button 
            onClick={() => {
              if (splicedVideoUrl) {
                window.open(new URL(splicedVideoUrl).href, '_blank');
              }
            }}
            variant="link"
            className="text-blue-600 underline"
          >
            Download Spliced Video
          </Button>
        </>
      )}
    </div>
  );
}
