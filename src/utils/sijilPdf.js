import { jsPDF } from 'jspdf';

export function janaSijilPdf({ namaPenuh, noIc, noAhli, tajukKursus, tarikhMula, tarikhTamat, lokasi, noSiri }) {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const lebar = doc.internal.pageSize.getWidth();
  const tinggi = doc.internal.pageSize.getHeight();

  // Bingkai Rasmi Biru Tua & Emas
  doc.setDrawColor(30, 58, 138);
  doc.setLineWidth(3);
  doc.rect(10, 10, lebar - 20, tinggi - 20);

  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.8);
  doc.rect(14, 14, lebar - 28, tinggi - 28);

  // Tajuk Kesatuan
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.setTextColor(30, 58, 138);
  doc.text('KESATUAN KAKITANGAN PERKHIDMATAN PEMBANTU FARMASI', lebar / 2, 34, { align: 'center' });
  doc.text('KEMENTERIAN KESIHATAN MALAYSIA (KKPPFKSM)', lebar / 2, 42, { align: 'center' });

  // Garis Pemisah Emas
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.6);
  doc.line(60, 48, lebar - 60, 48);

  // Tajuk Sijil
  doc.setFontSize(26);
  doc.setTextColor(15, 23, 42);
  doc.text('SIJIL PENYERTAAN', lebar / 2, 65, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(71, 85, 105);
  doc.text('Dengan ini diperakui bahawa', lebar / 2, 78, { align: 'center' });

  // Nama Peserta
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(30, 58, 138);
  doc.text((namaPenuh || '').toUpperCase(), lebar / 2, 92, { align: 'center' });

  // No IC & No Ahli
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(51, 65, 85);
  doc.text(`No. Kad Pengenalan: ${noIc}   |   No. Keahlian: ${noAhli || '-'}`, lebar / 2, 101, { align: 'center' });

  // Teks Pengiktirafan
  doc.setFontSize(12);
  doc.setTextColor(71, 85, 105);
  doc.text('telah menyertai dan menamatkan dengan jayanya program', lebar / 2, 114, { align: 'center' });

  // Tajuk Kursus
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(15, 23, 42);
  const barisKursus = doc.splitTextToSize((tajukKursus || '').toUpperCase(), lebar - 60);
  doc.text(barisKursus, lebar / 2, 126, { align: 'center' });

  // Tarikh & Lokasi
  const paparanTarikh = tarikhTamat && tarikhTamat !== tarikhMula
    ? `${tarikhMula} hingga ${tarikhTamat}`
    : tarikhMula;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(51, 65, 85);
  doc.text(`Pada: ${paparanTarikh}`, lebar / 2, 146, { align: 'center' });
  doc.text(`Bertempat di: ${lokasi}`, lebar / 2, 154, { align: 'center' });

  // Pengesahan Digital & No Siri
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.4);
  doc.line(30, 172, lebar - 30, 172);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.setTextColor(30, 58, 138);
  doc.text(`No. Siri Pengesahan Digital: ${noSiri}`, lebar / 2, 180, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(9);
  doc.setTextColor(100, 116, 139);
  doc.text(
    'Sijil ini dijana secara automatik melalui Portal Rasmi KKPPFKSM dan sah tanpa memerlukan tandatangan fizikal.',
    lebar / 2,
    187,
    { align: 'center' }
  );

  const namaFail = `Sijil_KKPPFKSM_${(namaPenuh || 'Ahli').replace(/\s+/g, '_')}.pdf`;
  doc.save(namaFail);
}