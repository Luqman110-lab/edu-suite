import React, { useEffect, useState, useRef } from 'react';
import QRCode from 'qrcode';
import { toPng } from 'html-to-image';
import { Student, SchoolSettings } from '../types';

interface StudentIDCardProps {
  student: Student;
  settings: SchoolSettings | null;
  onClose?: () => void;
}

export const StudentIDCard: React.FC<StudentIDCardProps> = ({
  student,
  settings,
  onClose
}) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [showBack, setShowBack] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const cardRef = useRef<HTMLDivElement>(null);

  const primaryColor = settings?.primaryColor || '#0052CC';
  const secondaryColor = settings?.secondaryColor || '#003D99';
  const accentColor = '#FFD700';

  const config = settings?.idCardConfig || {
    showBloodGroup: true,
    showDob: true,
    showEmergencyContact: true,
    customTerms: [
      `This card is the property of ${settings?.schoolName || 'the school'}`,
      "Must be carried at all times while on school premises",
      "Report loss immediately to the school office",
      "Non-transferable - for student use only"
    ]
  };

  useEffect(() => {
    const qrData = `${window.location.origin}/verify-student/${student.id}`;

    QRCode.toDataURL(qrData, {
      width: 100,
      margin: 1,
      color: { dark: '#000000', light: '#ffffff' },
      errorCorrectionLevel: 'M'
    }).then(setQrDataUrl).catch(console.error);
  }, [student, settings]);

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const schoolName = settings?.schoolName || 'EduSuite School';
    const schoolAddress = settings?.addressBox || '';
    const schoolPhone = settings?.contactPhones || '';
    const schoolMotto = settings?.motto || '';
    const schoolLogo = settings?.logoBase64 || '';
    const validYear = settings?.currentYear || new Date().getFullYear();

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student ID Card - ${student.name}</title>
          <style>
            @page { size: 85.6mm 108mm; margin: 0; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #f0f0f0; padding: 10mm; }
            .card-container { display: flex; flex-direction: column; gap: 5mm; }
            .id-card { 
              width: 85.6mm; 
              height: 54mm; 
              border-radius: 3mm;
              overflow: hidden;
              box-shadow: 0 2px 8px rgba(0,0,0,0.2);
              page-break-inside: avoid;
            }
            .card-front {
              background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
              color: white;
              height: 100%;
              position: relative;
            }
            .card-back {
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              color: #333;
              height: 100%;
              padding: 4mm;
            }
            .header-stripe {
              background: linear-gradient(90deg, ${accentColor} 0%, rgba(255,215,0,0.6) 100%);
              padding: 2mm 4mm;
              display: flex;
              align-items: center;
              gap: 3mm;
            }
            .school-logo {
              width: 10mm;
              height: 10mm;
              background: white;
              border-radius: 50%;
              display: flex;
              align-items: center;
              justify-content: center;
              overflow: hidden;
              flex-shrink: 0;
            }
            .school-logo img { width: 100%; height: 100%; object-fit: cover; }
            .school-info { flex: 1; }
            .school-name { font-size: 9pt; font-weight: bold; color: ${secondaryColor}; text-transform: uppercase; }
            .school-motto { font-size: 6pt; color: ${primaryColor}; font-style: italic; }
            .card-body { padding: 3mm 4mm; display: flex; gap: 3mm; }
            .photo-container {
              width: 22mm;
              height: 28mm;
              background: white;
              border-radius: 2mm;
              border: 2px solid ${accentColor};
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
              flex-shrink: 0;
            }
            .photo-container img { width: 100%; height: 100%; object-fit: cover; }
            .photo-placeholder { color: #ccc; font-size: 8pt; text-align: center; }
            .info-section { flex: 1; display: flex; flex-direction: column; gap: 1mm; }
            .student-name { 
              font-size: 11pt; 
              font-weight: bold; 
              color: ${accentColor}; 
              text-transform: uppercase;
              border-bottom: 1px solid rgba(255,215,0,0.3);
              padding-bottom: 1mm;
              margin-bottom: 1mm;
            }
            .info-row { display: flex; font-size: 7pt; gap: 1mm; }
            .info-label { font-weight: bold; min-width: 14mm; opacity: 0.9; }
            .info-value { flex: 1; }
            .qr-section {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 1mm;
            }
            .qr-code {
              width: 18mm;
              height: 18mm;
              background: white;
              border-radius: 2mm;
              padding: 1mm;
            }
            .qr-code img { width: 100%; height: 100%; }
            .card-footer {
              position: absolute;
              bottom: 0;
              left: 0;
              right: 0;
              background: rgba(0,0,0,0.2);
              padding: 1.5mm 4mm;
              display: flex;
              justify-content: space-between;
              font-size: 6pt;
            }
            .validity { color: ${accentColor}; font-weight: bold; }
            .card-id { opacity: 0.8; }
            .back-header {
              text-align: center;
              border-bottom: 1px solid #ddd;
              padding-bottom: 2mm;
              margin-bottom: 2mm;
            }
            .back-title { font-size: 8pt; font-weight: bold; color: ${primaryColor}; text-transform: uppercase; }
            .back-section { margin-bottom: 2mm; }
            .back-section-title { font-size: 7pt; font-weight: bold; color: ${primaryColor}; margin-bottom: 1mm; }
            .back-text { font-size: 6pt; line-height: 1.4; }
            .terms-list { padding-left: 3mm; }
            .terms-list li { margin-bottom: 0.5mm; }
            .return-box {
              background: ${primaryColor};
              color: white;
              padding: 2mm;
              border-radius: 1mm;
              text-align: center;
              margin-top: auto;
            }
            .return-title { font-size: 6pt; font-weight: bold; margin-bottom: 1mm; }
            .return-address { font-size: 6pt; }
            .emergency-section {
              background: #fff3cd;
              border: 1px solid #ffc107;
              border-radius: 1mm;
              padding: 1.5mm;
              margin-bottom: 2mm;
            }
            .emergency-title { font-size: 6pt; font-weight: bold; color: #856404; }
            .emergency-value { font-size: 7pt; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="card-container">
            <!-- FRONT -->
            <div class="id-card">
              <div class="card-front">
                <div class="header-stripe">
                  <div class="school-logo">
                    ${schoolLogo ? `<img src="${schoolLogo}" alt="Logo" />` : '<span style="font-size:14pt;">🏫</span>'}
                  </div>
                  <div class="school-info">
                    <div class="school-name">${schoolName}</div>
                    ${schoolMotto ? `<div class="school-motto">"${schoolMotto}"</div>` : ''}
                  </div>
                </div>
                <div class="card-body">
                  <div class="photo-container">
                    ${student.photoBase64
        ? `<img src="${student.photoBase64}" alt="${student.name}" />`
        : `<div class="photo-placeholder">📷<br/>Photo</div>`
      }
                  </div>
                  <div class="info-section">
                    <div class="student-name">${student.name}</div>
                    <div class="info-row">
                      <span class="info-label">ID No:</span>
                      <span class="info-value">${student.indexNumber}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Class:</span>
                      <span class="info-value">${student.classLevel} - ${student.stream}</span>
                    </div>
                    <div class="info-row">
                      <span class="info-label">Gender:</span>
                      <span class="info-value">${student.gender === 'M' ? 'Male' : 'Female'}</span>
                    </div>
                    ${config.showDob && student.dateOfBirth ? `
                    <div class="info-row">
                      <span class="info-label">D.O.B:</span>
                      <span class="info-value">${student.dateOfBirth}</span>
                    </div>` : ''}
                    ${config.showBloodGroup && student.medicalInfo?.bloodGroup ? `
                    <div class="info-row">
                      <span class="info-label">Blood:</span>
                      <span class="info-value" style="color:${accentColor};font-weight:bold;">${student.medicalInfo.bloodGroup}</span>
                    </div>` : ''}
                  </div>
                  <div class="qr-section">
                    <div class="qr-code">
                      ${qrDataUrl ? `<img src="${qrDataUrl}" alt="QR Code" />` : ''}
                    </div>
                    <span style="font-size:5pt;opacity:0.7;">SCAN TO VERIFY</span>
                  </div>
                </div>
                <div class="card-footer">
                  <span class="validity">Valid: ${validYear}</span>
                  <span class="card-id">${student.paycode || student.indexNumber}</span>
                </div>
              </div>
            </div>
            
            <!-- BACK -->
            <div class="id-card">
              <div class="card-back">
                <div class="back-header">
                  <div class="back-title">Student Identity Card</div>
                </div>
                
                ${config.showEmergencyContact && (student.parentContact || (student.emergencyContacts && student.emergencyContacts.length > 0)) ? `
                <div class="emergency-section">
                  <div class="emergency-title">EMERGENCY CONTACT</div>
                  <div class="emergency-value">
                    ${student.parentName || 'Guardian'}: ${student.parentContact || (student.emergencyContacts?.[0]?.phone || 'N/A')}
                  </div>
                </div>` : ''}
                
                <div class="back-section">
                  <div class="back-section-title">Terms & Conditions</div>
                  <ul class="terms-list back-text">
                    ${config.customTerms.map(term => `<li>${term}</li>`).join('')}
                  </ul>
                </div>
                
                <div class="return-box">
                  <div class="return-title">IF FOUND, PLEASE RETURN TO:</div>
                  <div class="return-address">
                    ${schoolName}<br/>
                    ${schoolAddress ? schoolAddress + '<br/>' : ''}
                    ${schoolPhone ? 'Tel: ' + schoolPhone : ''}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 300);
    setTimeout(() => printWindow.print(), 300);
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    try {
      const dataUrl = await toPng(cardRef.current, { quality: 0.95, pixelRatio: 3 });
      const link = document.createElement('a');
      link.download = `ID_${student.name.replace(/\s+/g, '_')}_${showBack ? 'Back' : 'Front'}.png`;
      link.href = dataUrl;
      link.click();
    } catch (err) {
      console.error('Failed to download ID card image', err);
    }
  };

  const displaySchoolName = settings?.schoolName || 'EduSuite School';
  const schoolMotto = settings?.motto || '';

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4 backdrop-blur-sm overflow-y-auto">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden my-auto">
        <div className="bg-gradient-to-r from-[#0052CC] to-[#003D99] p-3 sm:p-4 text-white">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-bold text-lg">Student ID Card</h3>
              <p className="text-sm opacity-80">Preview & Print</p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 flex items-center justify-center transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        <div className="p-4 sm:p-6">
          <div className="flex gap-2 mb-4 justify-center">
            <button
              onClick={() => setShowBack(false)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!showBack
                ? 'bg-[#0052CC] text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
            >
              Front
            </button>
            <button
              onClick={() => setShowBack(true)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${showBack
                ? 'bg-[#0052CC] text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
            >
              Back
            </button>
          </div>

          <div ref={cardRef} className="mx-auto w-full max-w-[340px]" style={{ perspective: '1000px' }}>
            {!showBack ? (
              <div
                className="rounded-xl overflow-hidden shadow-xl mx-auto w-full aspect-[340/215]"
                style={{
                  background: `linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%)`,
                }}
              >
                <div
                  className="flex items-center gap-3 px-4 py-2"
                  style={{ background: `linear-gradient(90deg, ${accentColor} 0%, rgba(255,215,0,0.6) 100%)` }}
                >
                  <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center overflow-hidden flex-shrink-0">
                    {settings?.logoBase64 ? (
                      <img src={settings.logoBase64} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span className="text-xl">🏫</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-[#003D99] uppercase">{displaySchoolName}</div>
                    {schoolMotto && <div className="text-[10px] text-[#0052CC] italic">"{schoolMotto}"</div>}
                  </div>
                </div>

                <div className="flex gap-3 p-3 text-white">
                  <div
                    className="w-[85px] h-[105px] bg-white rounded-lg overflow-hidden flex items-center justify-center flex-shrink-0"
                    style={{ border: `2px solid ${accentColor}` }}
                  >
                    {student.photoBase64 ? (
                      <img src={student.photoBase64} alt={student.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="text-gray-400 text-center">
                        <div className="text-3xl mb-1">📷</div>
                        <div className="text-xs">Photo</div>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 flex flex-col gap-1">
                    <div
                      className="font-bold text-sm uppercase pb-1 mb-1"
                      style={{ color: accentColor, borderBottom: '1px solid rgba(255,215,0,0.3)' }}
                    >
                      {student.name}
                    </div>
                    <div className="text-[11px] flex gap-1">
                      <span className="font-semibold opacity-90 w-[52px]">ID No:</span>
                      <span>{student.indexNumber}</span>
                    </div>
                    <div className="text-[11px] flex gap-1">
                      <span className="font-semibold opacity-90 w-[52px]">Class:</span>
                      <span>{student.classLevel} - {student.stream}</span>
                    </div>
                    <div className="text-[11px] flex gap-1">
                      <span className="font-semibold opacity-90 w-[52px]">Gender:</span>
                      <span>{student.gender === 'M' ? 'Male' : 'Female'}</span>
                    </div>
                    {config.showDob && student.dateOfBirth && (
                      <div className="text-[11px] flex gap-1">
                        <span className="font-semibold opacity-90 w-[52px]">D.O.B:</span>
                        <span>{student.dateOfBirth}</span>
                      </div>
                    )}
                    {config.showBloodGroup && student.medicalInfo?.bloodGroup && (
                      <div className="text-[11px] flex gap-1">
                        <span className="font-semibold opacity-90 w-[52px]">Blood:</span>
                        <span style={{ color: accentColor, fontWeight: 'bold' }}>{student.medicalInfo.bloodGroup}</span>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col items-center gap-1">
                    <div className="w-[70px] h-[70px] bg-white rounded-lg p-1">
                      {qrDataUrl && <img src={qrDataUrl} alt="QR Code" className="w-full h-full" />}
                    </div>
                    <span className="text-[8px] opacity-70">SCAN TO VERIFY</span>
                  </div>
                </div>

                <div
                  className="absolute bottom-0 left-0 right-0 px-4 py-1.5 flex justify-between text-[10px]"
                  style={{ background: 'rgba(0,0,0,0.2)' }}
                >
                  <span style={{ color: accentColor, fontWeight: 'bold' }}>Valid: {settings?.currentYear || new Date().getFullYear()}</span>
                  <span className="opacity-80">{student.paycode || student.indexNumber}</span>
                </div>
              </div>
            ) : (
              <div
                className="rounded-xl overflow-hidden shadow-xl mx-auto p-3 sm:p-4 w-full aspect-[340/215]"
                style={{
                  background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                }}
              >
                <div className="text-center border-b border-gray-300 pb-2 mb-2">
                  <div className="text-sm font-bold text-[#0052CC] uppercase">Student Identity Card</div>
                </div>

                {(config.showEmergencyContact && (student.parentContact || (student.emergencyContacts && student.emergencyContacts.length > 0))) && (
                  <div className="bg-amber-50 border border-amber-400 rounded p-2 mb-2">
                    <div className="text-[10px] font-bold text-amber-800">EMERGENCY CONTACT</div>
                    <div className="text-xs font-bold">
                      {student.parentName || 'Guardian'}: {student.parentContact || student.emergencyContacts?.[0]?.phone || 'N/A'}
                    </div>
                  </div>
                )}

                <div className="mb-2">
                  <div className="text-[10px] font-bold text-[#0052CC] mb-1">Terms & Conditions</div>
                  <ul className="text-[9px] text-gray-600 list-disc pl-3 space-y-0.5">
                    {config.customTerms.map((term, i) => (
                      <li key={i}>{term}</li>
                    ))}
                  </ul>
                </div>

                <div className="bg-[#0052CC] text-white rounded p-2 text-center mt-auto">
                  <div className="text-[9px] font-bold mb-1">IF FOUND, PLEASE RETURN TO:</div>
                  <div className="text-[9px]">
                    {displaySchoolName}
                    {settings?.addressBox && <><br />{settings.addressBox}</>}
                    {settings?.contactPhones && <><br />Tel: {settings.contactPhones}</>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Close
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-gradient-to-r from-[#0052CC] to-[#003D99] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print ID Card
          </button>
          <button
            onClick={handleDownload}
            className="px-5 py-2 bg-white border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 font-medium"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
            Download
          </button>
        </div>
      </div>
    </div>
  );
};

interface BulkIDCardPrintProps {
  students: Student[];
  settings: SchoolSettings | null;
  onClose: () => void;
}

export const BulkIDCardPrint: React.FC<BulkIDCardPrintProps> = ({
  students,
  settings,
  onClose
}) => {
  const [qrCodes, setQrCodes] = useState<{ [key: number]: string }>({});
  const [loading, setLoading] = useState(true);

  const primaryColor = '#0052CC';
  const secondaryColor = '#003D99';
  const accentColor = '#FFD700';

  useEffect(() => {
    const generateQRCodes = async () => {
      const codes: { [key: number]: string } = {};
      for (const student of students) {
        if (student.id) {
          const qrData = JSON.stringify({
            id: student.id,
            idx: student.indexNumber,
            name: student.name,
            class: `${student.classLevel} ${student.stream}`,
            school: settings?.schoolName || 'EduSuite School'
          });
          try {
            codes[student.id] = await QRCode.toDataURL(qrData, {
              width: 80,
              margin: 1,
              errorCorrectionLevel: 'M'
            });
          } catch (e) {
            console.error('QR generation error', e);
          }
        }
      }
      setQrCodes(codes);
      setLoading(false);
    };
    generateQRCodes();
  }, [students, settings]);

  const handlePrintAll = () => {
    const schoolName = settings?.schoolName || 'EduSuite School';
    const schoolAddress = settings?.addressBox || '';
    const schoolPhone = settings?.contactPhones || '';
    const schoolMotto = settings?.motto || '';
    const schoolLogo = settings?.logoBase64 || '';
    const validYear = settings?.currentYear || new Date().getFullYear();

    const generateCardHTML = (student: Student, isFront: boolean) => {
      if (isFront) {
        return `
          <div class="id-card">
            <div class="card-front">
              <div class="header-stripe">
                <div class="school-logo">
                  ${schoolLogo ? `<img src="${schoolLogo}" alt="Logo" />` : '<span style="font-size:12pt;">🏫</span>'}
                </div>
                <div class="school-info">
                  <div class="school-name">${schoolName}</div>
                  ${schoolMotto ? `<div class="school-motto">"${schoolMotto}"</div>` : ''}
                </div>
              </div>
              <div class="card-body">
                <div class="photo-container">
                  ${student.photoBase64
            ? `<img src="${student.photoBase64}" alt="${student.name}" />`
            : `<div class="photo-placeholder">📷<br/>Photo</div>`
          }
                </div>
                <div class="info-section">
                  <div class="student-name">${student.name}</div>
                  <div class="info-row"><span class="info-label">ID No:</span><span class="info-value">${student.indexNumber}</span></div>
                  <div class="info-row"><span class="info-label">Class:</span><span class="info-value">${student.classLevel} - ${student.stream}</span></div>
                  <div class="info-row"><span class="info-label">Gender:</span><span class="info-value">${student.gender === 'M' ? 'Male' : 'Female'}</span></div>
                  ${student.dateOfBirth ? `<div class="info-row"><span class="info-label">D.O.B:</span><span class="info-value">${student.dateOfBirth}</span></div>` : ''}
                  ${student.medicalInfo?.bloodGroup ? `<div class="info-row"><span class="info-label">Blood:</span><span class="info-value blood">${student.medicalInfo.bloodGroup}</span></div>` : ''}
                </div>
                <div class="qr-section">
                  <div class="qr-code">${student.id && qrCodes[student.id] ? `<img src="${qrCodes[student.id]}" />` : ''}</div>
                  <span class="qr-label">SCAN</span>
                </div>
              </div>
              <div class="card-footer">
                <span class="validity">Valid: ${validYear}</span>
                <span class="card-id">${student.paycode || student.indexNumber}</span>
              </div>
            </div>
          </div>
        `;
      } else {
        return `
          <div class="id-card">
            <div class="card-back">
              <div class="back-header">
                <div class="back-title">Student Identity Card</div>
              </div>
              ${(student.parentContact || (student.emergencyContacts && student.emergencyContacts.length > 0)) ? `
              <div class="emergency-section">
                <div class="emergency-title">EMERGENCY CONTACT</div>
                <div class="emergency-value">${student.parentName || student.emergencyContacts?.[0]?.name || 'Guardian'}: ${student.parentContact || student.emergencyContacts?.[0]?.phone || 'N/A'}</div>
              </div>` : ''}
              <div class="back-section">
                <div class="back-section-title">Terms & Conditions</div>
                <ul class="terms-list">
                  <li>Property of ${schoolName}</li>
                  <li>Carry at all times on premises</li>
                  <li>Report loss immediately</li>
                  <li>Non-transferable</li>
                </ul>
              </div>
              <div class="return-box">
                <div class="return-title">IF FOUND, RETURN TO:</div>
                <div class="return-address">${schoolName}${schoolAddress ? '<br/>' + schoolAddress : ''}${schoolPhone ? '<br/>Tel: ' + schoolPhone : ''}</div>
              </div>
            </div>
          </div>
        `;
      }
    };

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Student ID Cards - Bulk Print</title>
          <style>
            @page { size: A4; margin: 8mm; }
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Segoe UI', Arial, sans-serif; }
            .page { display: grid; grid-template-columns: repeat(2, 1fr); gap: 6mm; margin-bottom: 6mm; }
            .id-card { 
              width: 85.6mm; 
              height: 54mm; 
              border-radius: 2.5mm;
              overflow: hidden;
              page-break-inside: avoid;
            }
            .card-front {
              background: linear-gradient(135deg, ${primaryColor} 0%, ${secondaryColor} 100%);
              color: white;
              height: 100%;
              position: relative;
            }
            .card-back {
              background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
              color: #333;
              height: 100%;
              padding: 3mm;
              display: flex;
              flex-direction: column;
            }
            .header-stripe {
              background: linear-gradient(90deg, ${accentColor} 0%, rgba(255,215,0,0.6) 100%);
              padding: 1.5mm 3mm;
              display: flex;
              align-items: center;
              gap: 2mm;
            }
            .school-logo { width: 8mm; height: 8mm; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; overflow: hidden; }
            .school-logo img { width: 100%; height: 100%; object-fit: cover; }
            .school-name { font-size: 8pt; font-weight: bold; color: ${secondaryColor}; text-transform: uppercase; }
            .school-motto { font-size: 5pt; color: ${primaryColor}; font-style: italic; }
            .card-body { padding: 2mm 3mm; display: flex; gap: 2mm; }
            .photo-container { width: 18mm; height: 23mm; background: white; border-radius: 1.5mm; border: 1.5px solid ${accentColor}; overflow: hidden; display: flex; align-items: center; justify-content: center; }
            .photo-container img { width: 100%; height: 100%; object-fit: cover; }
            .photo-placeholder { color: #ccc; font-size: 6pt; text-align: center; }
            .info-section { flex: 1; display: flex; flex-direction: column; gap: 0.5mm; }
            .student-name { font-size: 8pt; font-weight: bold; color: ${accentColor}; text-transform: uppercase; border-bottom: 0.5px solid rgba(255,215,0,0.3); padding-bottom: 0.5mm; margin-bottom: 0.5mm; }
            .info-row { display: flex; font-size: 6pt; gap: 0.5mm; }
            .info-label { font-weight: bold; min-width: 11mm; opacity: 0.9; }
            .info-value.blood { color: ${accentColor}; font-weight: bold; }
            .qr-section { display: flex; flex-direction: column; align-items: center; gap: 0.5mm; }
            .qr-code { width: 14mm; height: 14mm; background: white; border-radius: 1mm; padding: 0.5mm; }
            .qr-code img { width: 100%; height: 100%; }
            .qr-label { font-size: 4pt; opacity: 0.7; }
            .card-footer { position: absolute; bottom: 0; left: 0; right: 0; background: rgba(0,0,0,0.2); padding: 1mm 3mm; display: flex; justify-content: space-between; font-size: 5pt; }
            .validity { color: ${accentColor}; font-weight: bold; }
            .card-id { opacity: 0.8; }
            .back-header { text-align: center; border-bottom: 0.5px solid #ddd; padding-bottom: 1mm; margin-bottom: 1mm; }
            .back-title { font-size: 7pt; font-weight: bold; color: ${primaryColor}; text-transform: uppercase; }
            .emergency-section { background: #fff3cd; border: 0.5px solid #ffc107; border-radius: 1mm; padding: 1mm; margin-bottom: 1mm; }
            .emergency-title { font-size: 5pt; font-weight: bold; color: #856404; }
            .emergency-value { font-size: 6pt; font-weight: bold; }
            .back-section { margin-bottom: 1mm; }
            .back-section-title { font-size: 6pt; font-weight: bold; color: ${primaryColor}; margin-bottom: 0.5mm; }
            .terms-list { font-size: 5pt; padding-left: 2.5mm; line-height: 1.3; }
            .terms-list li { margin-bottom: 0.3mm; }
            .return-box { background: ${primaryColor}; color: white; padding: 1.5mm; border-radius: 1mm; text-align: center; margin-top: auto; }
            .return-title { font-size: 5pt; font-weight: bold; margin-bottom: 0.5mm; }
            .return-address { font-size: 5pt; }
          </style>
        </head>
        <body>
          <div class="page">
            ${students.map(s => generateCardHTML(s, true)).join('')}
          </div>
          <div style="page-break-before: always;"></div>
          <div class="page">
            ${students.map(s => generateCardHTML(s, false)).join('')}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => printWindow.print(), 500);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden">
        <div className="bg-gradient-to-r from-[#0052CC] to-[#003D99] p-4 text-white">
          <h3 className="font-bold text-lg">Bulk Print ID Cards</h3>
          <p className="text-sm opacity-80">{students.length} student(s) selected</p>
        </div>

        <div className="p-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0052CC] mb-4"></div>
              <span className="text-gray-600 dark:text-gray-400">Generating QR codes...</span>
            </div>
          ) : (
            <div className="text-center py-6">
              <div className="w-20 h-20 bg-gradient-to-r from-[#0052CC] to-[#003D99] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <span className="text-4xl">🪪</span>
              </div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                Ready to Print
              </h4>
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {students.length} professional ID card(s) with QR codes
              </p>
              <p className="text-sm text-gray-500 dark:text-gray-500">
                Front and back sides will be printed on separate pages
              </p>
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3 bg-gray-50 dark:bg-gray-900">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handlePrintAll}
            disabled={loading}
            className="px-5 py-2 bg-gradient-to-r from-[#0052CC] to-[#003D99] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 font-medium disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            Print All Cards
          </button>
        </div>
      </div>
    </div>
  );
};
