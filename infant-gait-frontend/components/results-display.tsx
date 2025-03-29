import { getProcessingResults } from "@/lib/actions"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, BarChart, TableIcon } from "lucide-react"
import DataTable from "./data-table"
import DataChart from "./data-chart"

export default async function ResultsDisplay() {
  const results = await getProcessingResults()

  if (!results) {
    return null
  }

  return (
    <section className="bg-card rounded-lg p-6 shadow-md">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold">Results</h2>
        <div className="flex space-x-2">
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download CSV
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download PNG
          </Button>
          <Button variant="outline" size="sm" className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            Download TIFF
          </Button>
        </div>
      </div>

      <Tabs defaultValue="charts">
        <TabsList className="mb-4">
          <TabsTrigger value="charts" className="flex items-center gap-2">
            <BarChart className="h-4 w-4" />
            Charts
          </TabsTrigger>
          <TabsTrigger value="data" className="flex items-center gap-2">
            <TableIcon className="h-4 w-4" />
            Data
          </TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Temporal Analysis</CardTitle>
                <CardDescription>Time-based metrics from video processing</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <DataChart type="line" data={results.temporalData} xKey="timestamp" yKey="value" />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Feature Distribution</CardTitle>
                <CardDescription>Distribution of detected features</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <DataChart type="bar" data={results.featureData} xKey="feature" yKey="count" />
              </CardContent>
            </Card>

            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Comprehensive Analysis</CardTitle>
                <CardDescription>Combined metrics from the video processing pipeline</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <DataChart type="area" data={results.comprehensiveData} xKey="category" yKey="value" />
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="data">
          <Card>
            <CardHeader>
              <CardTitle>Processing Results Data</CardTitle>
              <CardDescription>Raw data from video analysis</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable data={results.tableData} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </section>
  )
}

