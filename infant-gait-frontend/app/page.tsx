import { Suspense } from "react"
import VideoUploader from "@/components/video-uploader"
import ProcessingStatus from "@/components/processing-status"
import ResultsDisplay from "@/components/results-display"

export default function Home() {
  return (
    <main className="container mx-auto py-10 px-4 max-w-5xl">
      <h1 className="text-4xl font-bold mb-8 text-center">Video Processing Pipeline</h1>

      <div className="space-y-10">
        <section className="bg-card rounded-lg p-6 shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Upload Video</h2>
          <VideoUploader />
        </section>

        <Suspense fallback={<div className="h-20 flex items-center justify-center">Loading status...</div>}>
          <ProcessingStatus />
        </Suspense>

        <Suspense fallback={<div className="h-60 flex items-center justify-center">Loading results...</div>}>
          <ResultsDisplay />
        </Suspense>
      </div>
    </main>
  )
}

