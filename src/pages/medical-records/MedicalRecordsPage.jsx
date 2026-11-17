import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { 
  FileText, 
  Activity, 
  Calendar, 
  Stethoscope, 
  ShieldCheck, 
  AlertCircle, 
  Loader2, 
  Download, 
  User, 
  Clock,
  HeartPulse,
  FolderOpen
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { usePortalBranding } from '../../context/PortalBrandingContext';
import { Card, CardContent } from '../../components/ui/Card';
import { Button } from '../../components/ui/Button';
import clinicalService from '../../services/clinicalService';

export const MedicalRecordsPage = () => {
  const { hospitalSlug } = useParams();
  const { user } = useAuth();
  const { hospital } = usePortalBranding();

  const [activeTab, setActiveTab] = useState('visits'); // 'visits' | 'vitals' | 'notes' | 'procedures' | 'documents'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [visits, setVisits] = useState([]);
  const [vitals, setVitals] = useState([]);
  const [notes, setNotes] = useState([]);
  const [procedures, setProcedures] = useState([]);
  const [documents, setDocuments] = useState([]);

  const patientId = user?.id || user?._id;

  useEffect(() => {
    if (!patientId) return;

    const loadRecords = async () => {
      setLoading(true);
      setError(null);

      try {
        const [visitsRes, vitalsRes, notesRes, procsRes, docsRes] = await Promise.allSettled([
          clinicalService.getVisits(patientId),
          clinicalService.getVitals(patientId),
          clinicalService.getClinicalNotes(patientId),
          clinicalService.getProcedures(patientId),
          clinicalService.getDocuments(patientId)
        ]);

        if (visitsRes.status === 'fulfilled') setVisits(Array.isArray(visitsRes.value) ? visitsRes.value : []);
        if (vitalsRes.status === 'fulfilled') setVitals(Array.isArray(vitalsRes.value) ? vitalsRes.value : []);
        if (notesRes.status === 'fulfilled') setNotes(Array.isArray(notesRes.value) ? notesRes.value : []);
        if (procsRes.status === 'fulfilled') setProcedures(Array.isArray(procsRes.value) ? procsRes.value : []);
        if (docsRes.status === 'fulfilled') setDocuments(Array.isArray(docsRes.value) ? docsRes.value : []);

        // Check if any endpoint failed due to consent withdrawal
        const consentError = [visitsRes, vitalsRes, notesRes, procsRes, docsRes].find(
          r => r.status === 'rejected' && r.reason?.response?.status === 403
        );
        if (consentError) {
          setError(consentError.reason?.response?.data?.error || 'Access to some medical records requires active treatment consent under DPDP guidelines.');
        }
      } catch (err) {
        console.error('Failed to load clinical records:', err);
        setError('Failed to load clinical timeline records.');
      } finally {
        setLoading(false);
      }
    };

    loadRecords();
  }, [patientId]);

  return (
    <div className="space-y-6 animate-fadeIn pb-12">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Electronic Medical Records (EMR)
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Comprehensive clinical history, vital parameters, doctor notes, and medical documents at {hospital?.name || hospitalSlug}.
        </p>
      </div>

      {error && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-amber-50 text-amber-800 text-xs p-4 rounded-2xl border border-amber-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Link to={`/${hospitalSlug}/privacy`}>
            <Button variant="outline" size="sm" className="whitespace-nowrap bg-white text-amber-800 border-amber-300">
              Manage Consent
            </Button>
          </Link>
        </div>
      )}

      {/* Tabs - Mobile scrollable with touch target >= 44px */}
      <div className="flex items-center gap-2 border-b border-slate-200 overflow-x-auto pb-1 -mx-4 px-4 sm:mx-0 sm:px-0">
        {[
          { key: 'visits', label: `Visits (${visits.length})` },
          { key: 'vitals', label: `Vitals (${vitals.length})` },
          { key: 'notes', label: `Clinical Notes (${notes.length})` },
          { key: 'procedures', label: `Procedures (${procedures.length})` },
          { key: 'documents', label: `Documents (${documents.length})` }
        ].map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`min-h-[44px] pb-3 px-3.5 text-xs font-bold border-b-2 whitespace-nowrap transition flex items-center ${
              activeTab === tab.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Contents */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4 h-24 bg-slate-100 rounded-2xl"></CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          {/* TAB 1: VISITS */}
          {activeTab === 'visits' && (
            visits.length === 0 ? (
              <EmptyState title="No Consultation Visits Recorded" desc="Historical doctor consultations and clinical admissions will appear here." />
            ) : (
              visits.map(visit => (
                <Card key={visit._id} className="border-slate-200 shadow-2xs">
                  <CardContent className="p-4 sm:p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        <div className="w-11 h-11 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold shrink-0 border border-blue-100/80">
                          <Stethoscope className="w-5 h-5" />
                        </div>
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">
                            {visit.visitType || 'OPD Consultation'}
                          </h4>
                          <p className="text-xs text-slate-500 font-medium">
                            Attending Doctor: Dr. {visit.doctorId?.name?.replace(/^Dr\.\s*/i, '') || 'Consultant'}
                          </p>
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5 text-xs text-slate-400">
                            <span>Date: {new Date(visit.createdAt || visit.date).toLocaleDateString('en-IN')}</span>
                            {visit.department && <span>&bull; Dept: {visit.department}</span>}
                          </div>
                          {visit.chiefComplaint && (
                            <p className="text-xs text-slate-700 mt-2 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                              <strong className="text-slate-900">Chief Complaint:</strong> {visit.chiefComplaint}
                            </p>
                          )}
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 shrink-0">
                        {visit.status || 'Completed'}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )
          )}

          {/* TAB 2: VITALS */}
          {activeTab === 'vitals' && (
            vitals.length === 0 ? (
              <EmptyState title="No Vital Signs Recorded" desc="Blood pressure, pulse, temperature, and SpO2 trends will be charted here." />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {vitals.map(v => (
                  <Card key={v._id} className="border-slate-200 shadow-2xs">
                    <CardContent className="p-4 sm:p-5 space-y-3">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <HeartPulse className="w-4 h-4 text-rose-500" />
                          <span>Recorded on {new Date(v.createdAt).toLocaleDateString('en-IN')}</span>
                        </span>
                        <span className="text-[11px] font-mono text-slate-400">
                          {new Date(v.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Blood Pressure</span>
                          <span className="text-base font-black text-slate-900 font-mono">{v.bloodPressure || '—'}</span>
                          <span className="text-[10px] text-slate-400 ml-1">mmHg</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Heart Rate</span>
                          <span className="text-base font-black text-slate-900 font-mono">{v.heartRate || '—'}</span>
                          <span className="text-[10px] text-slate-400 ml-1">bpm</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">Temperature</span>
                          <span className="text-base font-black text-slate-900 font-mono">{v.temperature || '—'}</span>
                          <span className="text-[10px] text-slate-400 ml-1">°F</span>
                        </div>
                        <div className="p-3 rounded-xl bg-slate-50 border border-slate-100">
                          <span className="text-slate-400 text-[10px] uppercase font-bold block">SpO2 Oxygen</span>
                          <span className="text-base font-black text-slate-900 font-mono">{v.spO2 || '—'}</span>
                          <span className="text-[10px] text-slate-400 ml-1">%</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          )}

          {/* TAB 3: NOTES */}
          {activeTab === 'notes' && (
            notes.length === 0 ? (
              <EmptyState title="No Doctor Notes Available" desc="Doctor examination findings and clinical impressions will be listed here." />
            ) : (
              notes.map(note => (
                <Card key={note._id} className="border-slate-200 shadow-2xs">
                  <CardContent className="p-4 sm:p-5 space-y-2 text-xs">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                      <span className="font-bold text-slate-800">Dr. {note.doctorId?.name?.replace(/^Dr\.\s*/i, '') || 'Consultant'}</span>
                      <span className="text-slate-400 text-[11px]">{new Date(note.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    {note.subjective && <p><strong className="text-slate-700">Subjective:</strong> {note.subjective}</p>}
                    {note.objective && <p><strong className="text-slate-700">Objective:</strong> {note.objective}</p>}
                    {note.assessment && <p><strong className="text-slate-700">Assessment:</strong> {note.assessment}</p>}
                    {note.plan && <p><strong className="text-slate-700">Plan:</strong> {note.plan}</p>}
                  </CardContent>
                </Card>
              ))
            )
          )}

          {/* TAB 4: PROCEDURES */}
          {activeTab === 'procedures' && (
            procedures.length === 0 ? (
              <EmptyState title="No Recorded Procedures" desc="Medical treatments, minor operations, and therapeutic procedures will appear here." />
            ) : (
              procedures.map(p => (
                <Card key={p._id} className="border-slate-200 shadow-2xs">
                  <CardContent className="p-4 sm:p-5 text-xs">
                    <div className="flex items-center justify-between">
                      <h4 className="font-bold text-slate-900 text-sm">{p.procedureName || 'Medical Procedure'}</h4>
                      <span className="text-slate-400">{new Date(p.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    {p.notes && <p className="text-slate-600 mt-2">{p.notes}</p>}
                  </CardContent>
                </Card>
              ))
            )
          )}

          {/* TAB 5: DOCUMENTS */}
          {activeTab === 'documents' && (
            documents.length === 0 ? (
              <EmptyState title="No Clinical Documents" desc="Scanned reports, discharge summaries, and radiology files will appear here." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {documents.map(doc => (
                  <Card key={doc._id} className="border-slate-200 shadow-2xs">
                    <CardContent className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-xl bg-cyan-50 text-cyan-600 flex items-center justify-center font-bold shrink-0 border border-cyan-100/80">
                          <FileText className="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <h4 className="font-bold text-slate-900 text-xs truncate">{doc.documentName || doc.title || 'Clinical Document'}</h4>
                          <p className="text-[11px] text-slate-400 truncate">{doc.category || 'Diagnostic'} &bull; {new Date(doc.createdAt).toLocaleDateString('en-IN')}</p>
                        </div>
                      </div>
                      {doc.fileUrl && (
                        <a
                          href={doc.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-600 transition shrink-0"
                          aria-label="Download Document"
                        >
                          <Download className="w-4 h-4" />
                        </a>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )
          )}
        </div>
      )}
    </div>
  );
};

const EmptyState = ({ title, desc }) => (
  <Card className="border-dashed border-slate-200">
    <CardContent className="p-10 text-center">
      <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
        <FolderOpen className="w-6 h-6" />
      </div>
      <h3 className="font-bold text-slate-800 text-sm">{title}</h3>
      <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">{desc}</p>
    </CardContent>
  </Card>
);

export default MedicalRecordsPage;
