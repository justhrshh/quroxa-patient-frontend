import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
  Activity, 
  User, 
  Calendar, 
  FileText, 
  Download, 
  CheckCircle2, 
  Clock, 
  AlertCircle, 
  ChevronRight, 
  Printer, 
  X,
  FileCheck2
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePortalBranding } from '../../context/PortalBrandingContext';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import laboratoryService from '../../services/laboratoryService';

export const LabResultsPage = () => {
  const { hospitalSlug } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { hospital } = usePortalBranding();

  const [labRequests, setLabRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedLab, setSelectedLab] = useState(null);

  useEffect(() => {
    const fetchLabRequests = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await laboratoryService.getMyLabRequests();
        const list = Array.isArray(data) ? data : [];
        setLabRequests(list);

        const queryId = searchParams.get('id');
        if (queryId) {
          const matched = list.find(l => l._id === queryId);
          if (matched) setSelectedLab(matched);
        }
      } catch (err) {
        console.error('Failed to load lab requests:', err);
        setError('Unable to load laboratory reports. Please check your network and refresh.');
      } finally {
        setLoading(false);
      }
    };

    fetchLabRequests();
  }, [searchParams]);

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Diagnostic Pathology & Lab Reports
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Access verified blood investigations, pathology findings, and diagnostic reports at {hospital?.name || hospitalSlug}.
        </p>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-xs p-3.5 rounded-2xl border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: List on Left, Report Detail View on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className={`${selectedLab ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-3`}>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 h-24 bg-slate-100 rounded-2xl"></CardContent>
                </Card>
              ))}
            </div>
          ) : labRequests.length === 0 ? (
            <Card className="border-dashed border-slate-200">
              <CardContent className="p-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Activity className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">No Laboratory Reports</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Ordered pathology investigations and validated test values will be published here.
                </p>
              </CardContent>
            </Card>
          ) : (
            labRequests.map((lab) => {
              const isSelected = selectedLab?._id === lab._id;
              const isReady = lab.status === 'Completed' || lab.status === 'Report Ready';
              const dateStr = lab.createdAt
                ? new Date(lab.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })
                : 'Date pending';

              const testTitle = lab.testName || (Array.isArray(lab.tests) && lab.tests.length > 0 ? lab.tests.map(t => t.name || t).join(', ') : 'Diagnostic Panel');

              return (
                <Card
                  key={lab._id}
                  onClick={() => setSelectedLab(lab)}
                  className={`cursor-pointer transition border ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/30 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 border ${
                          isReady
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-100'
                            : 'bg-amber-50 text-amber-700 border-amber-100'
                        }`}>
                          <Activity className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-sm max-w-[200px] truncate">
                              {testTitle}
                            </h3>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              isReady ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {lab.status || 'Processing'}
                            </span>
                          </div>

                          <p className="text-xs text-slate-500 font-medium mt-0.5">
                            {lab.category || 'Pathology & Biochemistry'}
                          </p>

                          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{dateStr}</span>
                            </span>
                            {lab.doctorId?.name && (
                              <>
                                <span>•</span>
                                <span>Ref: Dr. {lab.doctorId.name.replace(/^Dr\.\s*/i, '')}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>

                      <ChevronRight className={`w-5 h-5 transition ${
                        isSelected ? 'text-blue-600 translate-x-1' : 'text-slate-300'
                      }`} />
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Right Column: Report Document Viewer */}
        {selectedLab && (
          <div className="lg:col-span-7">
            <Card className="shadow-float border-slate-200 sticky top-20">
              <CardContent className="p-6 sm:p-8 space-y-6">
                {/* Header */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200">
                  <div>
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                      Validated Diagnostic Report
                    </span>
                    <h3 className="text-base font-extrabold text-slate-900">
                      {selectedLab.testName || 'Diagnostic Investigation'}
                    </h3>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.print()}>
                      <Printer className="w-3.5 h-3.5 mr-1.5" />
                      <span>Print</span>
                    </Button>
                    <button
                      onClick={() => setSelectedLab(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 lg:hidden"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Metadata Pill Banner */}
                <div className="grid grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Ordered By</span>
                    <strong className="text-slate-800">
                      Dr. {selectedLab.doctorId?.name?.replace(/^Dr\.\s*/i, '') || 'Consultant'}
                    </strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Report Status</span>
                    <strong className="text-emerald-700 font-bold">{selectedLab.status || 'Completed'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Sample Date</span>
                    <span className="text-slate-700 font-medium">
                      {selectedLab.createdAt ? new Date(selectedLab.createdAt).toLocaleDateString('en-IN') : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-400 block text-[10px] font-bold uppercase">Specimen / Category</span>
                    <span className="text-slate-700 font-medium">{selectedLab.category || 'Clinical Pathology'}</span>
                  </div>
                </div>

                {/* Test Results / Findings Table */}
                <div>
                  <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-3">
                    Observed Diagnostic Parameters
                  </h4>

                  <div className="border border-slate-200 rounded-xl overflow-hidden">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                        <tr>
                          <th className="py-2.5 px-3">Test Parameter</th>
                          <th className="py-2.5 px-3">Observed Value</th>
                          <th className="py-2.5 px-3">Reference Range</th>
                          <th className="py-2.5 px-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {Array.isArray(selectedLab.results) && selectedLab.results.length > 0 ? (
                          selectedLab.results.map((res, idx) => (
                            <tr key={idx} className="hover:bg-slate-50/50">
                              <td className="py-2.5 px-3 font-bold text-slate-900">{res.parameter || res.testName}</td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-800">{res.value} {res.unit || ''}</td>
                              <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px]">{res.referenceRange || 'Normal'}</td>
                              <td className="py-2.5 px-3">
                                <span className="inline-flex items-center gap-1 text-emerald-700 text-[11px] font-semibold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                                  <span>Normal</span>
                                </span>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={4} className="py-4 text-center text-slate-400">
                              Detailed parameter breakdown available in clinical attachment or pending lab entry.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Report Attachment / PDF link if available */}
                {selectedLab.reportUrl && (
                  <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-100 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <FileCheck2 className="w-5 h-5 text-blue-600" />
                      <div>
                        <h5 className="font-bold text-slate-900 text-xs">Official Signed Laboratory Document</h5>
                        <p className="text-[11px] text-slate-500">PDF document validated by pathologist</p>
                      </div>
                    </div>
                    <a
                      href={selectedLab.reportUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-blue-600 text-white font-semibold text-xs hover:bg-blue-700 flex items-center gap-1.5 transition"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </a>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default LabResultsPage;
