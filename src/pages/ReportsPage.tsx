import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabaseClient'
import { FileText, Download, Loader } from 'lucide-react'
import type { User } from '@supabase/supabase-js'
import type { Report } from '../types'

interface ReportsPageProps {
  user: User
}

export default function ReportsPage({ user }: ReportsPageProps) {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedReport, setSelectedReport] = useState<Report | null>(null)

  useEffect(() => {
    const loadReports = async () => {
      try {
        const { data, error } = await supabase
          .from('reports')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setReports(data || [])
      } catch (err) {
        console.error('Error loading reports:', err)
      } finally {
        setLoading(false)
      }
    }

    loadReports()
  }, [])

  const handleDownload = (report: Report) => {
    const content = JSON.stringify(report, null, 2)
    const element = document.createElement('a')
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content))
    element.setAttribute('download', `report-${report.id}.json`)
    element.style.display = 'none'
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <div className="min-h-screen pt-8 pb-16 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Security Reports</h1>
          <p className="text-slate-400">View and download your security analysis reports</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader className="w-6 h-6 text-blue-400 animate-spin" />
              </div>
            ) : reports.length === 0 ? (
              <div className="card text-center py-8">
                <FileText className="w-8 h-8 text-slate-400 mx-auto mb-3" />
                <p className="text-slate-400">No reports yet</p>
              </div>
            ) : (
              <div className="space-y-2">
                {reports.map((report) => (
                  <button
                    key={report.id}
                    onClick={() => setSelectedReport(report)}
                    className={`w-full text-left p-4 rounded-lg transition-all ${
                      selectedReport?.id === report.id
                        ? 'bg-blue-500/20 border border-blue-500'
                        : 'bg-slate-800/50 border border-slate-700 hover:border-slate-600'
                    }`}
                  >
                    <div className="flex items-center space-x-2 mb-1">
                      <FileText className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-semibold text-white capitalize">
                        {report.report_type} Report
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">
                      {new Date(report.created_at).toLocaleDateString()}
                    </p>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="lg:col-span-2">
            {selectedReport ? (
              <div className="card">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className="text-2xl font-bold text-white capitalize">
                      {selectedReport.report_type} Report
                    </h2>
                    <p className="text-slate-400 text-sm mt-1">
                      Generated on {new Date(selectedReport.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={() => handleDownload(selectedReport)}
                    className="flex items-center space-x-2 px-4 py-2 bg-blue-500/10 text-blue-400 rounded-lg hover:bg-blue-500/20 transition-colors"
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </button>
                </div>

                <div className="bg-slate-900/50 rounded-lg p-6 max-h-96 overflow-auto">
                  <pre className="text-slate-300 text-sm whitespace-pre-wrap break-words">
                    {JSON.stringify(selectedReport.data, null, 2)}
                  </pre>
                </div>
              </div>
            ) : (
              <div className="card flex items-center justify-center py-16 text-center">
                <div>
                  <FileText className="w-12 h-12 text-slate-500 mx-auto mb-4" />
                  <p className="text-slate-400">
                    Select a report to view details
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
