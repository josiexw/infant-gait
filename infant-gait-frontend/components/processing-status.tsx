import { getProcessingStatus } from "@/lib/actions"
import { Loader2 } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export default async function ProcessingStatus() {
  const status = await getProcessingStatus()

  if (!status || status === "idle") {
    return null
  }

  return (
    <section className="bg-card rounded-lg p-6 shadow-md">
      <h2 className="text-2xl font-semibold mb-4">Processing Status</h2>

      {status === "processing" && (
        <div className="flex items-center space-x-4">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <div>
            <p className="font-medium">Processing your video</p>
            <p className="text-sm text-muted-foreground">This may take a few minutes depending on the video size</p>
          </div>
        </div>
      )}

      {status === "completed" && (
        <Alert variant="default" className="bg-success/10 border-success text-success">
          <AlertTitle>Processing Complete</AlertTitle>
          <AlertDescription>Your video has been processed successfully. View the results below.</AlertDescription>
        </Alert>
      )}

      {status === "failed" && (
        <Alert variant="destructive">
          <AlertTitle>Processing Failed</AlertTitle>
          <AlertDescription>There was an error processing your video. Please try uploading again.</AlertDescription>
        </Alert>
      )}
    </section>
  )
}

