import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { 
  Pill, 
  User, 
  Calendar, 
  Printer, 
  FileText, 
  AlertCircle, 
  CheckCircle2, 
  ChevronRight, 
  Clock, 
  Building2, 
  Download,
  X
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePortalBranding, HospitalBrandLogo } from '../../context/PortalBrandingContext';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import prescriptionService from '../../services/prescriptionService';

export const PrescriptionsPage = () => {
  const { hospitalSlug } = useParams();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();
  const { hospital } = usePortalBranding();

  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedRx, setSelectedRx] = useState(null);

  useEffect(() => {
    const fetchPrescriptions = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await prescriptionService.getMyPrescriptions();
        const list = Array.isArray(data) ? data : [];
        setPrescriptions(list);

        // Auto-select by query param ?id=... if present
        const queryId = searchParams.get('id');
        if (queryId) {
          const matched = list.find(r => r._id === queryId);
          if (matched) setSelectedRx(matched);
        }
      } catch (err) {
        console.error('Failed to load prescriptions:', err);
        setError('Unable to load prescriptions. Please check your connection and refresh.');
      } finally {
        setLoading(false);
      }
    };

    fetchPrescriptions();
  }, [searchParams]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6 animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Digital Prescriptions
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Access verified doctor prescriptions, dosage instructions, and print-ready clinical documents.
          </p>
        </div>
      </div>

      {error && (
        <div className="flex items-center gap-2 bg-red-50 text-red-700 text-xs p-3.5 rounded-2xl border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Main Grid: List on Left, Document Viewer on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Prescription List */}
        <div className={`${selectedRx ? 'lg:col-span-5' : 'lg:col-span-12'} space-y-3`}>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardContent className="p-4 h-24 bg-slate-100 rounded-2xl"></CardContent>
                </Card>
              ))}
            </div>
          ) : prescriptions.length === 0 ? (
            <Card className="border-dashed border-slate-200">
              <CardContent className="p-10 text-center">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                  <Pill className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-slate-800 text-sm">No Prescriptions Issued</h3>
                <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                  Your prescribed medications and clinical directives will appear here following doctor consultations.
                </p>
              </CardContent>
            </Card>
          ) : (
            prescriptions.map((rx) => {
              const isSelected = selectedRx?._id === rx._id;
              const doctorName = rx.doctorId?.name ? `Dr. ${rx.doctorId.name.replace(/^Dr\.\s*/i, '')}` : 'Consulting Doctor';
              const dateStr = rx.createdAt
                ? new Date(rx.createdAt).toLocaleDateString('en-IN', {
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric'
                  })
                : 'Date pending';
              const itemsCount = Array.isArray(rx.items) ? rx.items.length : 0;

              return (
                <Card
                  key={rx._id}
                  onClick={() => setSelectedRx(rx)}
                  className={`cursor-pointer transition border ${
                    isSelected
                      ? 'border-blue-600 bg-blue-50/30 shadow-xs'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'
                  }`}
                >
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center font-bold text-sm shrink-0 border border-purple-100">
                          <Pill className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-slate-900 text-sm">
                              {doctorName}
                            </h3>
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800">
                              {rx.status || 'Active'}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 font-medium">
                            {rx.doctorId?.specialty || 'General Medicine'}
                          </p>
                          <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              <span>{dateStr}</span>
                            </span>
                            <span>•</span>
                            <span className="font-semibold text-purple-700">
                              {itemsCount} {itemsCount === 1 ? 'medicine' : 'medicines'}
                            </span>
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

        {/* Right Column: Detailed Printable Document */}
        {selectedRx && (
          <div className="lg:col-span-7">
            <Card className="shadow-float border-slate-200 sticky top-20">
              <CardContent className="p-6 sm:p-8">
                {/* Document Actions Bar */}
                <div className="flex items-center justify-between pb-4 border-b border-slate-200 mb-6 print:hidden">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                      Prescription Document
                    </span>
                    <span className="text-xs font-mono font-bold text-slate-800 bg-slate-100 px-2 py-0.5 rounded-md">
                      #{selectedRx._id.slice(-6).toUpperCase()}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={handlePrint} className="shadow-2xs">
                      <Printer className="w-3.5 h-3.5 mr-1.5" />
                      <span>Print Document</span>
                    </Button>
                    <button
                      onClick={() => setSelectedRx(null)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition lg:hidden"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Printable Prescription Leaflet */}
                <div className="prescription-print-surface space-y-6">
                  {/* Letterhead Header */}
                  {selectedRx.hospitalLetterheadUrl ? (
                    <div className="mb-6 border-b border-slate-200 pb-4">
                      <img
                        src={selectedRx.hospitalLetterheadUrl}
                        alt="Hospital Letterhead"
                        className="w-full max-h-24 object-contain mx-auto"
                      />
                    </div>
                  ) : (
                    <div className="flex items-start justify-between border-b-2 border-slate-900 pb-5">
                      <div className="flex items-center gap-3">
                        {hospital && (
                          <HospitalBrandLogo hospital={hospital} size={48} borderRadius={12} />
                        )}
                        <div>
                          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tight">
                            {hospital?.name || 'Hospital Clinical Services'}
                          </h2>
                          <p className="text-xs text-slate-500 font-medium max-w-sm">
                            {hospital?.address || 'Healthcare Clinical Facility'}
                          </p>
                          {hospital?.phone && (
                            <p className="text-[11px] text-slate-500">Phone: {hospital.phone}</p>
                          )}
                        </div>
                      </div>

                      {hospital?.gst && (
                        <div className="text-right text-[11px] font-mono text-slate-500">
                          <span>GSTIN: {hospital.gst}</span>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Patient & Doctor Banner */}
                  <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                        Patient Details
                      </span>
                      <p className="font-bold text-slate-900 text-sm">
                        {selectedRx.patientId?.name || user?.name || 'Patient'}
                      </p>
                      <p className="text-slate-600 mt-0.5">
                        {selectedRx.patientId?.gender ? `${selectedRx.patientId.gender}` : ''}
                        {selectedRx.patientId?.age ? ` • ${selectedRx.patientId.age} yrs` : ''}
                      </p>
                      <p className="font-mono text-[11px] text-slate-500 mt-0.5">
                        UHID: {selectedRx.patientId?.uhId || user?.uhId || '—'}
                      </p>
                    </div>

                    <div className="text-right">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-0.5">
                        Prescribing Consultant
                      </span>
                      <p className="font-bold text-slate-900 text-sm">
                        Dr. {selectedRx.doctorId?.name?.replace(/^Dr\.\s*/i, '') || 'Consultant'}
                      </p>
                      <p className="text-slate-600 mt-0.5">
                        {selectedRx.doctorId?.specialty || 'General OPD'}
                      </p>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Date: {new Date(selectedRx.createdAt).toLocaleDateString('en-IN', {
                          day: 'numeric',
                          month: 'short',
                          year: 'numeric'
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Diagnosis & Notes (if any) */}
                  {(selectedRx.diagnosis || selectedRx.notes) && (
                    <div className="space-y-2 text-xs">
                      {selectedRx.diagnosis && (
                        <div>
                          <strong className="text-slate-800 uppercase tracking-wider text-[10px]">Diagnosis:</strong>
                          <p className="text-slate-700 mt-0.5 font-medium">{selectedRx.diagnosis}</p>
                        </div>
                      )}
                      {selectedRx.notes && (
                        <div>
                          <strong className="text-slate-800 uppercase tracking-wider text-[10px]">Clinical Notes:</strong>
                          <p className="text-slate-700 mt-0.5">{selectedRx.notes}</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Medications Table (Rx Symbol) */}
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="font-serif italic font-bold text-2xl text-blue-800">℞</span>
                      <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
                        Prescribed Medications
                      </h4>
                    </div>

                    <div className="border border-slate-200 rounded-xl overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100/70 border-b border-slate-200 text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="py-2.5 px-3">#</th>
                            <th className="py-2.5 px-3">Medicine Name</th>
                            <th className="py-2.5 px-3">Dosage / Frequency</th>
                            <th className="py-2.5 px-3">Duration</th>
                            <th className="py-2.5 px-3">Instructions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {Array.isArray(selectedRx.items) && selectedRx.items.length > 0 ? (
                            selectedRx.items.map((item, idx) => (
                              <tr key={idx} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-3 font-mono text-slate-400 text-[11px]">{idx + 1}</td>
                                <td className="py-2.5 px-3 font-bold text-slate-900">
                                  {item.medicine || item.name || 'Prescribed Drug'}
                                </td>
                                <td className="py-2.5 px-3 text-slate-700">
                                  {item.dosage || item.frequency || 'As directed'}
                                </td>
                                <td className="py-2.5 px-3 text-slate-700">
                                  {item.duration || '—'}
                                </td>
                                <td className="py-2.5 px-3 text-slate-500 italic text-[11px]">
                                  {item.instructions || item.timing || 'After food'}
                                </td>
                              </tr>
                            ))
                          ) : (
                            <tr>
                              <td colSpan={5} className="py-4 text-center text-slate-400">
                                No medication details found.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Diagnostic Tests Recommended (if any) */}
                  {Array.isArray(selectedRx.tests) && selectedRx.tests.length > 0 && (
                    <div className="text-xs">
                      <h4 className="font-bold text-slate-800 uppercase tracking-wider text-[10px] mb-2">
                        Recommended Diagnostic Tests
                      </h4>
                      <div className="flex flex-wrap gap-2">
                        {selectedRx.tests.map((test, idx) => (
                          <span key={idx} className="px-2.5 py-1 rounded-lg bg-orange-50 border border-orange-200 text-orange-800 font-medium text-[11px]">
                            {typeof test === 'string' ? test : test.name}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Doctor Signature Block */}
                  <div className="pt-6 border-t border-slate-200 flex items-end justify-between text-xs">
                    <p className="text-[10px] text-slate-400">
                      Digitally generated through Quroxa Patient Portal &bull; Validated Electronic Prescription
                    </p>

                    <div className="text-right">
                      {selectedRx.doctorSignatureUrl && (
                        <img
                          src={selectedRx.doctorSignatureUrl}
                          alt="Doctor Signature"
                          className="h-10 max-w-[120px] object-contain ml-auto mb-1"
                        />
                      )}
                      <div className="w-36 border-t border-slate-300 mt-2 pt-1 font-bold text-slate-800">
                        Dr. {selectedRx.doctorId?.name?.replace(/^Dr\.\s*/i, '') || 'Consultant'}
                      </div>
                      <span className="text-[10px] text-slate-400">Authorized Medical Signature</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default PrescriptionsPage;
