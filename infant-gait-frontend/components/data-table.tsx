"use client"

import { useState } from "react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import {
  Pagination,
  PaginationContent,
  PaginationItem,
  PaginationLink,
  PaginationNext,
  PaginationPrevious,
} from "@/components/ui/pagination"

interface DataTableProps {
  data: any[]
}

export default function DataTable({ data }: DataTableProps) {
  const [page, setPage] = useState(1)
  const rowsPerPage = 10

  if (!data || data.length === 0) {
    return <div className="text-center py-8 text-muted-foreground">No data available</div>
  }

  const columns = Object.keys(data[0])
  const totalPages = Math.ceil(data.length / rowsPerPage)
  const paginatedData = data.slice((page - 1) * rowsPerPage, page * rowsPerPage)

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column} className="font-medium">
                  {column.charAt(0).toUpperCase() + column.slice(1)}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((row, rowIndex) => (
              <TableRow key={rowIndex}>
                {columns.map((column) => (
                  <TableCell key={`${rowIndex}-${column}`}>{row[column]}</TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <Pagination>
          <PaginationContent>
            <PaginationItem>
              <PaginationPrevious
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className={page === 1 ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>

            {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
              <PaginationItem key={pageNum}>
                <PaginationLink onClick={() => setPage(pageNum)} isActive={page === pageNum} className="cursor-pointer">
                  {pageNum}
                </PaginationLink>
              </PaginationItem>
            ))}

            <PaginationItem>
              <PaginationNext
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className={page === totalPages ? "pointer-events-none opacity-50" : "cursor-pointer"}
              />
            </PaginationItem>
          </PaginationContent>
        </Pagination>
      )}
    </div>
  )
}

