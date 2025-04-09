import VideoUploader from "@/components/video-uploader"

export default function Home() {
  return (
    <main className="container mx-auto py-10 px-4 max-w-5xl">
      <h1 className="text-4xl font-bold mb-8 text-center">Video Processing Pipeline</h1>

      <div className="space-y-10">
        <section className="bg-card rounded-lg p-6 shadow-md">
          <h2 className="text-2xl font-semibold mb-4">Upload Video</h2>
          <VideoUploader />
        </section>
      </div>
    </main>
  )
}

