import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import QRCode from 'qrcode';
import { janaSijilPdf } from '../utils/sijilPdf';
import {
  Calendar, MapPin, PlusCircle, QrCode, Upload, FileText,
  CheckCircle2, Award, Star, Users, Download, ExternalLink
} from 'lucide-react';

export default function ModulKursus({ profil }) {
  const isAdmin = profil?.peranan === 'admin';
  const [senaraiKursus, setSenaraiKursus] = useState([]);
  const [pendaftaranSaya, setPendaftaranSaya] = useState({});
  const [bahanKursus, setBahanKursus] = useState({});
  const [loading, setLoading] = useState(true);

  const [kodInput, setKodInput] = useState('');
  const [mesejHadir, setMesejHadir] = useState({ jenis: '', teks: '' });

  const [bukaBorangKursus, setBukaBorangKursus] = useState(false);
  const [tajuk, setTajuk] = useState('');
  const [tarikhMula, setTarikhMula] = useState('');
  const [tarikhTamat, setTarikhTamat] = useState('');
  const [lokasi, setLokasi] = useState('');
  const [jenisPendaftaran, setJenisPendaftaran] = useState('terbuka');
  const [kodKehadiran, setKodKehadiran] = useState('');

  const [kursusAktifAdmin, setKursusAktifAdmin] = useState(null);
  const [qrDataUrl, setQrDataUrl] = useState('');
  const [senaraiPesertaAdmin, setSenaraiPesertaAdmin] = useState([]);
  const [icPukal, setIcPukal] = useState('');
  const [kategoriBahan, setKategoriBahan] = useState('tentatif');
  const [tajukBahan, setTajukBahan] = useState('');
  const [failBahan, setFailBahan] = useState(null);
  const [sedangMuatNaik, setSedangMuatNaik] = useState(false);

  const [kursusNilai, setKursusNilai] = useState(null);
  const [skorPenceramah, setSkorPenceramah] = useState(5);
  const [skorKandungan, setSkorKandungan] = useState(5);
  const [skorUrusetia, setSkorUrusetia] = useState(5);
  const [ulasan, setUlasan] = useState('');

  useEffect(() => {
    muatSemuaData();
    janaKodRawak();

    const params = new URLSearchParams(window.location.search);
    const kodQr = params.get('hadir');
    if (kodQr && profil?.no_ic) {
      sahkanKehadiran(kodQr);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [profil]);

  function janaKodRawak() {
    const rawak = 'KKP' + Math.floor(100 + Math.random() * 900);
    setKodKehadiran(rawak);
  }

  async function muatSemuaData() {
    setLoading(true);
    const { data: kursusData } = await supabase
      .from('kursus')
      .select('*')
      .order('tarikh_mula', { ascending: false });

    if (kursusData) setSenaraiKursus(kursusData);

    const { data: daftarData } = await supabase
      .from('pendaftaran_kursus')
      .select('*')
      .eq('no_ic', profil.no_ic);

    if (daftarData) {
      const peta = {};
      daftarData.forEach((d) => { peta[d.kursus_id] = d; });
      setPendaftaranSaya(peta);
    }

    const { data: bahanData } = await supabase
      .from('bahan_kursus')
      .select('*')
      .order('created_at', { ascending: true });

    if (bahanData) {
      const petaBahan = {};
      bahanData.forEach((b) => {
        if (!petaBahan[b.kursus_id]) petaBahan[b.kursus_id] = [];
        petaBahan[b.kursus_id].push(b);
      });
      setBahanKursus(petaBahan);
    }
    setLoading(false);
  }

  async function ciptaKursus(e) {
    e.preventDefault();
    const { error } = await supabase.from('kursus').insert([{
      tajuk,
      tarikh_mula: tarikhMula,
      tarikh_tamat: tarikhTamat || tarikhMula,
      lokasi,
      jenis_pendaftaran: jenisPendaftaran,
      kod_kehadiran: kodKehadiran.toUpperCase().trim(),
    }]);

    if (!error) {
      setTajuk('');
      setTarikhMula('');
      setTarikhTamat('');
      setLokasi('');
      janaKodRawak();
      setBukaBorangKursus(false);
      muatSemuaData();
    } else {
      alert('Ralat mencipta kursus: ' + error.message);
    }
  }

  async function bukaPanelAdminKursus(kursus) {
    setKursusAktifAdmin(kursus);
    const pautanQr = `${window.location.origin}?hadir=${kursus.kod_kehadiran}`;
    const url = await QRCode.toDataURL(pautanQr, { width: 260, margin: 2 });
    setQrDataUrl(url);
    muatPesertaKursusAdmin(kursus.id);
  }

  async function muatPesertaKursusAdmin(kursusId) {
    const { data } = await supabase
      .from('pendaftaran_kursus')
      .select('*')
      .eq('kursus_id', kursusId)
      .order('created_at', { ascending: false });
    if (data) setSenaraiPesertaAdmin(data);
  }

  async function simpanPesertaPraMuatNaik(e) {
    e.preventDefault();
    if (!kursusAktifAdmin) return;
    const senaraiIc = icPukal
      .split(/[\n,;]+/)
      .map((s) => s.replace(/[^0-9]/g, ''))
      .filter((s) => s.length === 12);

    if (senaraiIc.length === 0) {
      alert('Tiada No. IC 12 digit yang sah dikesan.');
      return;
    }

    const rekod = senaraiIc.map((ic) => ({
      kursus_id: kursusAktifAdmin.id,
      no_ic: ic,
      sumber_daftar: 'pra_muat_naik',
    }));

    const { error } = await supabase
      .from('pendaftaran_kursus')
      .upsert(rekod, { onConflict: 'kursus_id,no_ic' });

    if (!error) {
      setIcPukal('');
      muatPesertaKursusAdmin(kursusAktifAdmin.id);
      muatSemuaData();
      alert(`${senaraiIc.length} peserta berjaya dimasukkan ke senarai kursus.`);
    } else {
      alert('Ralat: ' + error.message);
    }
  }

  async function muatNaikBahan(e) {
    e.preventDefault();
    if (!failBahan || !kursusAktifAdmin) return;
    setSedangMuatNaik(true);

    const namaFailBersih = `${Date.now()}_${failBahan.name.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
    const laluan = `kursus_${kursusAktifAdmin.id}/${namaFailBersih}`;

    const { error: uploadError } = await supabase.storage
      .from('dokumen-kursus')
      .upload(laluan, failBahan);

    if (uploadError) {
      alert('Gagal memuat naik fail: ' + uploadError.message);
      setSedangMuatNaik(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('dokumen-kursus')
      .getPublicUrl(laluan);

    await supabase.from('bahan_kursus').insert([{
      kursus_id: kursusAktifAdmin.id,
      kategori: kategoriBahan,
      tajuk_bahan: tajukBahan,
      url_fail: urlData.publicUrl,
    }]);

    setTajukBahan('');
    setFailBahan(null);
    setSedangMuatNaik(false);
    muatSemuaData();
    alert('Bahan kursus berjaya dimuat naik!');
  }

  async function daftarKursusTerbuka(kursusId) {
    const { error } = await supabase.from('pendaftaran_kursus').insert([{
      kursus_id: kursusId,
      no_ic: profil.no_ic,
      user_id: profil.id,
      sumber_daftar: 'sendiri',
    }]);

    if (!error) muatSemuaData();
    else alert('Gagal mendaftar: ' + error.message);
  }

  async function sahkanKehadiran(kodDiberi) {
    const kodBersih = kodDiberi.toUpperCase().trim();
    if (!kodBersih) return;

    const { data: kursusJumpa } = await supabase
      .from('kursus')
      .select('*')
      .eq('kod_kehadiran', kodBersih)
      .single();

    if (!kursusJumpa) {
      setMesejHadir({ jenis: 'ralat', teks: `Kod kehadiran "${kodBersih}" tidak sah atau tidak ditemui.` });
      return;
    }

    if (kursusJumpa.jenis_pendaftaran === 'terbuka') {
      await supabase.from('pendaftaran_kursus').upsert([{
        kursus_id: kursusJumpa.id,
        no_ic: profil.no_ic,
        user_id: profil.id,
        sumber_daftar: 'sendiri',
      }], { onConflict: 'kursus_id,no_ic' });
    }

    const { data: kemaskini, error } = await supabase
      .from('pendaftaran_kursus')
      .update({
        status_hadir: true,
        user_id: profil.id,
        masa_hadir: new Date().toISOString(),
      })
      .eq('kursus_id', kursusJumpa.id)
      .eq('no_ic', profil.no_ic)
      .select();

    if (error || !kemaskini || kemaskini.length === 0) {
      setMesejHadir({
        jenis: 'ralat',
        teks: 'Nama anda tiada dalam senarai pra-muat naik bagi kursus jemputan khas ini.'
      });
    } else {
      setKodInput('');
      setMesejHadir({
        jenis: 'berjaya',
        teks: `Kehadiran berjaya disahkan bagi: ${kursusJumpa.tajuk}!`
      });
      muatSemuaData();
    }
  }

  async function hantarPenilaian(e) {
    e.preventDefault();
    if (!kursusNilai) return;

    const { error: errNilai } = await supabase.from('penilaian_kursus').insert([{
      kursus_id: kursusNilai.id,
      no_ic: profil.no_ic,
      skor_penceramah: skorPenceramah,
      skor_kandungan: skorKandungan,
      skor_urusetia: skorUrusetia,
      ulasan,
    }]);

    if (errNilai && !errNilai.message.includes('duplicate')) {
      alert('Ralat menghantar penilaian: ' + errNilai.message);
      return;
    }

    const noSiri = `KKPPFKSM/${new Date().getFullYear()}/${kursusNilai.kod_kehadiran}-${profil.no_ic.slice(-4)}`;

    await supabase
      .from('pendaftaran_kursus')
      .update({ sudah_nilai: true, no_siri_sijil: noSiri })
      .eq('kursus_id', kursusNilai.id)
      .eq('no_ic', profil.no_ic);

    setKursusNilai(null);
    setUlasan('');
    muatSemuaData();
  }

  return (
    <div className="space-y-6">
      {/* BAR PENGESAHAN KEHADIRAN PANTAS (KOD / QR) */}
      <div className="bg-white rounded-2xl p-5 shadow-sm border border-blue-100">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <QrCode className="w-5 h-5 text-blue-900" /> Pengesahan Kehadiran Kursus
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Imbas Kod QR yang dipaparkan oleh Urus Setia di dewan atau masukkan kod kehadiran 6 aksara.
            </p>
          </div>
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Contoh: KKP123"
              value={kodInput}
              onChange={(e) => setKodInput(e.target.value.toUpperCase())}
              className="px-3 py-2 border border-slate-300 rounded-lg text-sm uppercase font-mono w-36 focus:outline-none focus:border-blue-700"
            />
            <button
              onClick={() => sahkanKehadiran(kodInput)}
              className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg"
            >
              Sahkan Hadir
            </button>
          </div>
        </div>

        {mesejHadir.teks && (
          <div className={`mt-3 p-3 rounded-lg text-xs font-medium ${
            mesejHadir.jenis === 'berjaya'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-red-50 text-red-700 border border-red-200'
          }`}>
            {mesejHadir.teks}
          </div>
        )}
      </div>

      {/* KAWALAN ADMIN: CIPTA KURSUS BAHARU */}
      {isAdmin && (
        <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-bold text-slate-800">Pengurusan Kursus & Latihan (Admin)</h3>
            <button
              onClick={() => setBukaBorangKursus(!bukaBorangKursus)}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg"
            >
              <PlusCircle className="w-4 h-4" />
              {bukaBorangKursus ? 'Tutup Borang' : 'Cipta Kursus Baharu'}
            </button>
          </div>

          {bukaBorangKursus && (
            <form onSubmit={ciptaKursus} className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tajuk Kursus / Bengkel</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Bengkel Pemantapan Kepimpinan Kesatuan 2026"
                  value={tajuk}
                  onChange={(e) => setTajuk(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tarikh Mula</label>
                <input
                  type="date"
                  required
                  value={tarikhMula}
                  onChange={(e) => setTarikhMula(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Tarikh Tamat</label>
                <input
                  type="date"
                  value={tarikhTamat}
                  onChange={(e) => setTarikhTamat(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Lokasi / Tempat</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Dewan Utama, Putrajaya"
                  value={lokasi}
                  onChange={(e) => setLokasi(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Mod Pendaftaran</label>
                <select
                  value={jenisPendaftaran}
                  onChange={(e) => setJenisPendaftaran(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm bg-white"
                >
                  <option value="terbuka">Terbuka (Semua Ahli Boleh Daftar)</option>
                  <option value="pra_muat_naik">Pra-Muat Naik (Senarai Peserta Khas Sahaja)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 mb-1">Kod Kehadiran Unik</label>
                <input
                  type="text"
                  required
                  value={kodKehadiran}
                  onChange={(e) => setKodKehadiran(e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono uppercase"
                />
              </div>
              <div className="flex items-end">
                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-lg"
                >
                  Simpan & Terbitkan Kursus
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* PANEL TERPERINCI ADMIN UNTUK KURSUS DIPILIH */}
      {isAdmin && kursusAktifAdmin && (
        <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md space-y-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs uppercase tracking-wider text-amber-400 font-bold">Panel Urus Setia Kursus</span>
              <h4 className="text-lg font-bold mt-1">{kursusAktifAdmin.tajuk}</h4>
            </div>
            <button
              onClick={() => setKursusAktifAdmin(null)}
              className="px-3 py-1 bg-slate-800 hover:bg-slate-700 rounded-lg text-xs"
            >
              Tutup Panel
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-slate-800 p-4 rounded-xl text-center space-y-3">
              <p className="text-xs font-semibold text-slate-300 uppercase">Kod QR Kehadiran Dewan</p>
              {qrDataUrl && <img src={qrDataUrl} alt="QR Kehadiran" className="mx-auto rounded-lg bg-white p-2 w-44 h-44" />}
              <p className="text-lg font-mono font-bold text-amber-400 tracking-widest">
                {kursusAktifAdmin.kod_kehadiran}
              </p>
              <a
                href={qrDataUrl}
                download={`QR_Kehadiran_${kursusAktifAdmin.kod_kehadiran}.png`}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold rounded-lg"
              >
                <Download className="w-3.5 h-3.5" /> Muat Turun QR
              </a>
            </div>

            <form onSubmit={muatNaikBahan} className="bg-slate-800 p-4 rounded-xl space-y-3">
              <p className="text-xs font-semibold text-slate-300 uppercase flex items-center gap-1.5">
                <Upload className="w-4 h-4 text-amber-400" /> Muat Naik Tentatif / Slaid
              </p>
              <select
                value={kategoriBahan}
                onChange={(e) => setKategoriBahan(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-xs text-white"
              >
                <option value="tentatif">Tentatif Program</option>
                <option value="slaid">Slaid Ceramah / Nota</option>
              </select>
              <input
                type="text"
                required
                placeholder="Tajuk dokumen (cth: Slaid Slot 1)"
                value={tajukBahan}
                onChange={(e) => setTajukBahan(e.target.value)}
                className="w-full px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-xs text-white"
              />
              <input
                type="file"
                required
                accept=".pdf,.ppt,.pptx,.doc,.docx"
                onChange={(e) => setFailBahan(e.target.files[0])}
                className="w-full text-xs text-slate-300"
              />
              <button
                type="submit"
                disabled={sedangMuatNaik}
                className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 font-bold text-xs rounded-lg disabled:opacity-50"
              >
                {sedangMuatNaik ? 'Memuat Naik...' : 'Muat Naik Dokumen'}
              </button>
            </form>

            <div className="bg-slate-800 p-4 rounded-xl space-y-3">
              <p className="text-xs font-semibold text-slate-300 uppercase flex items-center gap-1.5">
                <Users className="w-4 h-4 text-emerald-400" /> Peserta ({senaraiPesertaAdmin.length} Rekod)
              </p>
              <form onSubmit={simpanPesertaPraMuatNaik} className="space-y-2">
                <textarea
                  rows={3}
                  placeholder="Tampal senarai No. IC 12 digit (satu setiap baris) untuk pra-muat naik..."
                  value={icPukal}
                  onChange={(e) => setIcPukal(e.target.value)}
                  className="w-full p-2 bg-slate-700 border border-slate-600 rounded-lg text-xs text-white"
                />
                <button
                  type="submit"
                  className="w-full py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold rounded-lg"
                >
                  Tambah Senarai No. IC
                </button>
              </form>
              <div className="max-h-28 overflow-y-auto text-[11px] space-y-1 border-t border-slate-700 pt-2">
                {senaraiPesertaAdmin.map((p) => (
                  <div key={p.id} className="flex justify-between text-slate-300">
                    <span>{p.no_ic}</span>
                    <span className={p.status_hadir ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                      {p.status_hadir ? 'HADIR' : 'Berdaftar'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL BORANG PENILAIAN KURSUS */}
      {kursusNilai && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <form onSubmit={hantarPenilaian} className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl">
            <h3 className="text-lg font-bold text-slate-800">Penilaian Kursus</h3>
            <p className="text-xs text-slate-500">{kursusNilai.tajuk}</p>

            {[
              { label: 'Penyampaian Penceramah (1 - 5)', val: skorPenceramah, set: setSkorPenceramah },
              { label: 'Kandungan & Modul Kursus (1 - 5)', val: skorKandungan, set: setSkorKandungan },
              { label: 'Pengurusan Urus Setia (1 - 5)', val: skorUrusetia, set: setSkorUrusetia },
            ].map((item, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-700">{item.label}</span>
                <select
                  value={item.val}
                  onChange={(e) => item.set(Number(e.target.value))}
                  className="px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-bold"
                >
                  {[5, 4, 3, 2, 1].map((n) => (
                    <option key={n} value={n}>{n} Bintang</option>
                  ))}
                </select>
              </div>
            ))}

            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">Cadangan / Ulasan Penambahbaikan</label>
              <textarea
                rows={3}
                placeholder="Tulis maklum balas anda..."
                value={ulasan}
                onChange={(e) => setUlasan(e.target.value)}
                className="w-full p-2.5 border border-slate-300 rounded-lg text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setKursusNilai(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg"
              >
                Hantar & Buka Sijil PDF
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SENARAI KURSUS AKTIF & HAB BAHAN */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-slate-800">Senarai Kursus & Program KKPPFKSM</h3>

        {loading ? (
          <p className="text-sm text-slate-500">Memuatkan senarai kursus...</p>
        ) : senaraiKursus.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 text-center border border-slate-200 text-sm text-slate-500">
            Belum ada kursus diterbitkan buat masa ini.
          </div>
        ) : (
          senaraiKursus.map((kursus) => {
            const rekod = pendaftaranSaya[kursus.id];
            const senaraiDokumen = bahanKursus[kursus.id] || [];

            return (
              <div key={kursus.id} className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200 space-y-4">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
                  <div className="space-y-1.5">
                    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold ${
                      kursus.jenis_pendaftaran === 'terbuka'
                        ? 'bg-blue-100 text-blue-800'
                        : 'bg-amber-100 text-amber-800'
                    }`}>
                      {kursus.jenis_pendaftaran === 'terbuka' ? 'Pendaftaran Terbuka' : 'Peserta Pra-Muat Naik'}
                    </span>
                    <h4 className="text-lg font-bold text-slate-900">{kursus.tajuk}</h4>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-600">
                      <span className="inline-flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-blue-800" /> {kursus.tarikh_mula}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <MapPin className="w-3.5 h-3.5 text-blue-800" /> {kursus.lokasi}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {isAdmin && (
                      <button
                        onClick={() => bukaPanelAdminKursus(kursus)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-lg"
                      >
                        <QrCode className="w-4 h-4" /> Urus QR, Peserta & Slaid
                      </button>
                    )}

                    {!rekod && kursus.jenis_pendaftaran === 'terbuka' && (
                      <button
                        onClick={() => daftarKursusTerbuka(kursus.id)}
                        className="px-4 py-2 bg-blue-900 hover:bg-blue-800 text-white text-xs font-semibold rounded-lg"
                      >
                        Daftar Kursus Ini
                      </button>
                    )}

                    {rekod && !rekod.status_hadir && (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold rounded-lg">
                        <CheckCircle2 className="w-4 h-4" /> Berdaftar (Sila Sahkan Kehadiran)
                      </span>
                    )}

                    {rekod && rekod.status_hadir && !rekod.sudah_nilai && (
                      <button
                        onClick={() => setKursusNilai(kursus)}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-900 text-xs font-bold rounded-lg"
                      >
                        <Star className="w-4 h-4" /> Isi Penilaian untuk Sijil
                      </button>
                    )}

                    {rekod && rekod.status_hadir && rekod.sudah_nilai && (
                      <button
                        onClick={() => janaSijilPdf({
                          namaPenuh: profil?.senarai_induk_ahli?.nama_penuh,
                          noIc: profil?.no_ic,
                          noAhli: profil?.senarai_induk_ahli?.no_ahli,
                          tajukKursus: kursus.tajuk,
                          tarikhMula: kursus.tarikh_mula,
                          tarikhTamat: kursus.tarikh_tamat,
                          lokasi: kursus.lokasi,
                          noSiri: rekod.no_siri_sijil,
                        })}
                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-sm"
                      >
                        <Award className="w-4 h-4" /> Muat Turun Sijil PDF
                      </button>
                    )}
                  </div>
                </div>

                {senaraiDokumen.length > 0 && (
                  <div className="pt-3 border-t border-slate-100">
                    <p className="text-xs font-bold text-slate-500 uppercase mb-2">Tentatif & Bahan Ceramah</p>
                    <div className="flex flex-wrap gap-2">
                      {senaraiDokumen.map((dok) => (
                        <a
                          key={dok.id}
                          href={dok.url_fail}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-blue-50 text-slate-800 hover:text-blue-900 border border-slate-200 rounded-lg text-xs font-medium transition"
                        >
                          <FileText className="w-3.5 h-3.5 text-blue-700" />
                          <span className="uppercase text-[10px] font-bold text-slate-500">[{dok.kategori}]</span>
                          {dok.tajuk_bahan}
                          <ExternalLink className="w-3 h-3 text-slate-400" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}