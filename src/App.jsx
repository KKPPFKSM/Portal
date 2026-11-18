import React, { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import ModulKursus from './components/ModulKursus';
import {
  Clock, UserCheck, UserX, LogOut,
  Lock, Mail, CreditCard, CheckCircle2, ExternalLink
} from 'lucide-react';

export default function App() {
  const [session, setSession] = useState(null);
  const [profil, setProfil] = useState(null);
  const [loading, setLoading] = useState(true);

  const [modDaftar, setModDaftar] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [noIc, setNoIc] = useState('');
  const [mesejRalat, setMesejRalat] = useState('');
  const [mesejBerjaya, setMesejBerjaya] = useState('');
  const [prosesAuth, setProsesAuth] = useState(false);

  const [senaraiMenunggu, setSenaraiMenunggu] = useState([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) muatProfil(session.user.id);
      else setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session) muatProfil(session.user.id);
      else {
        setProfil(null);
        setLoading(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function muatProfil(userId) {
    setLoading(true);
    const { data, error } = await supabase
      .from('profil_pengguna')
      .select('*, senarai_induk_ahli(*)')
      .eq('id', userId)
      .single();

    if (!error && data) {
      setProfil(data);
      if (data.peranan === 'admin' && data.status_akaun === 'lulus') {
        muatPermohonanMenunggu();
      }
    }
    setLoading(false);
  }

  async function muatPermohonanMenunggu() {
    const { data } = await supabase
      .from('profil_pengguna')
      .select('*, senarai_induk_ahli(nama_penuh, no_ahli, cawangan)')
      .eq('status_akaun', 'menunggu')
      .order('created_at', { ascending: false });

    if (data) setSenaraiMenunggu(data);
  }

  async function handleAuth(e) {
    e.preventDefault();
    setMesejRalat('');
    setMesejBerjaya('');
    setProsesAuth(true);

    if (modDaftar) {
      const icBersih = noIc.replace(/[^0-9]/g, '');
      if (icBersih.length !== 12) {
        setMesejRalat('Sila masukkan 12 digit No. Kad Pengenalan tanpa sengkang (-).');
        setProsesAuth(false);
        return;
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { no_ic: icBersih } }
      });

      if (error) {
        setMesejRalat(error.message);
      } else {
        setMesejBerjaya('Pendaftaran berjaya! Akaun anda sedang menunggu kelulusan Admin KKPPFKSM.');
        setModDaftar(false);
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setMesejRalat('E-mel atau kata laluan tidak sah.');
    }
    setProsesAuth(false);
  }

  async function tindakanAdmin(idPengguna, statusBaharu) {
    const { error } = await supabase
      .from('profil_pengguna')
      .update({ status_akaun: statusBaharu })
      .eq('id', idPengguna);

    if (!error) muatPermohonanMenunggu();
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-600 font-medium p-4 text-center">
        <img
          src="/logo.png"
          alt="Logo KKPPFKSM"
          onError={(e) => { e.currentTarget.style.display = 'none'; }}
          className="w-16 h-16 rounded-full object-cover bg-white shadow mb-3 animate-pulse"
        />
        <span>Memuatkan Portal KKPPFKSM...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center px-3 py-6 sm:p-4">
        <div className="w-full max-w-md bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="bg-blue-900 px-5 py-6 sm:p-6 text-white text-center">
            <img
              src="/logo.png"
              alt="Logo Rasmi KKPPFKSM"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              className="w-20 h-20 sm:w-24 sm:h-24 mx-auto mb-3 rounded-full object-cover bg-white shadow-md ring-2 ring-amber-400"
            />
            <h1 className="text-lg sm:text-xl font-bold tracking-wide">PORTAL RASMI KKPPFKSM</h1>
            <p className="text-blue-200 text-xs mt-1">Sistem Keahlian, Kursus & Pensijilan Digital</p>
          </div>

          <form onSubmit={handleAuth} className="p-5 sm:p-6 space-y-4">
            <h2 className="text-base sm:text-lg font-bold text-slate-800 text-center">
              {modDaftar ? 'Pendaftaran Akaun Ahli Baharu' : 'Log Masuk Portal'}
            </h2>

            {mesejRalat && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg">
                {mesejRalat}
              </div>
            )}
            {mesejBerjaya && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm rounded-lg">
                {mesejBerjaya}
              </div>
            )}

            {modDaftar && (
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                  No. Kad Pengenalan (Tanpa Sengkang)
                </label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 sm:top-3" />
                  <input
                    type="text"
                    inputMode="numeric"
                    required
                    maxLength={12}
                    placeholder="Contoh: 900505106666"
                    value={noIc}
                    onChange={(e) => setNoIc(e.target.value)}
                    className="w-full pl-10 pr-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg text-base sm:text-sm focus:outline-none focus:border-blue-600"
                  />
                </div>
                <p className="text-[11px] text-slate-500 mt-1">
                  *Sistem akan menyemak No. IC anda dengan rekod induk kesatuan secara automatik.
                </p>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                E-mel Peribadi
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 sm:top-3" />
                <input
                  type="email"
                  required
                  placeholder="nama@gmail.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg text-base sm:text-sm focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-600 uppercase mb-1">
                Kata Laluan
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 sm:top-3" />
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Minimum 6 aksara"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-3 py-2.5 sm:py-2 border border-slate-300 rounded-lg text-base sm:text-sm focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={prosesAuth}
              className="w-full bg-blue-900 hover:bg-blue-800 active:bg-blue-950 text-white font-semibold py-3 sm:py-2.5 rounded-lg text-sm transition disabled:opacity-50"
            >
              {prosesAuth ? 'Memproses...' : modDaftar ? 'Hantar Permohonan Akaun' : 'Log Masuk'}
            </button>

            <div className="text-center pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => {
                  setModDaftar(!modDaftar);
                  setMesejRalat('');
                  setMesejBerjaya('');
                }}
                className="text-sm text-blue-700 hover:underline font-medium py-1"
              >
                {modDaftar ? 'Sudah mempunyai akaun? Log Masuk' : 'Belum mendaftar akaun portal? Daftar di sini'}
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  }

  if (profil?.status_akaun === 'menunggu' || profil?.status_akaun === 'ditolak') {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-md p-6 text-center border border-slate-200">
          <Clock className="w-14 h-14 text-amber-500 mx-auto mb-3" />
          <h2 className="text-lg font-bold text-slate-800">
            {profil.status_akaun === 'menunggu'
              ? 'Akaun Menunggu Kelulusan Admin'
              : 'Permohonan Akaun Ditolak'}
          </h2>
          <p className="text-sm text-slate-600 mt-2 leading-relaxed">
            {profil.status_akaun === 'menunggu'
              ? `No. IC (${profil.no_ic}) telah disahkan dalam rekod kesatuan. Sila tunggu pengesahan daripada Urus Setia KKPPFKSM sebelum mengakses modul kursus.`
              : 'Sila hubungi ibu pejabat KKPPFKSM untuk semakan lanjut status keahlian anda.'}
          </p>
          <button
            onClick={() => supabase.auth.signOut()}
            className="mt-6 w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-slate-800 text-white text-sm rounded-lg hover:bg-slate-700"
          >
            <LogOut className="w-4 h-4" /> Log Keluar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <header className="bg-blue-900 text-white shadow sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-3 sm:px-4 py-3 sm:py-4 flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src="/logo.png"
              alt="Logo KKPPFKSM"
              onError={(e) => { e.currentTarget.style.display = 'none'; }}
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-full object-cover bg-white ring-2 ring-amber-400 shrink-0"
            />
            <div className="min-w-0">
              <h1 className="font-bold text-base sm:text-lg leading-tight truncate">PORTAL KKPPFKSM</h1>
              <p className="text-xs text-blue-200 truncate">{profil?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:flex items-center gap-2 w-full sm:w-auto">
            <a
              href="https://www.facebook.com/share/1A1vyuGe30/"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center gap-1.5 bg-blue-700 hover:bg-blue-600 active:bg-blue-800 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-medium transition"
            >
              Facebook Rasmi <ExternalLink className="w-3.5 h-3.5 shrink-0" />
            </a>
            <button
              onClick={() => supabase.auth.signOut()}
              className="inline-flex items-center justify-center gap-1.5 bg-slate-900/50 hover:bg-slate-900 active:bg-slate-950 px-3 py-2 sm:py-1.5 rounded-lg text-xs font-medium transition"
            >
              <LogOut className="w-4 h-4 shrink-0" /> Log Keluar
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-3 sm:px-4 py-4 space-y-4 sm:space-y-6 mt-1">
        <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              {profil?.gelaran_status || 'AHLI BERDAFTAR KKPPFKSM'}
            </span>
            <h2 className="text-lg sm:text-xl font-bold text-slate-900 mt-3 break-words">
              {profil?.senarai_induk_ahli?.nama_penuh}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 mt-1">
              No. Ahli: <span className="font-semibold">{profil?.senarai_induk_ahli?.no_ahli}</span> • Cawangan: <span className="font-semibold">{profil?.senarai_induk_ahli?.cawangan}</span>
            </p>
          </div>
          <div className="pt-3 border-t border-slate-100 md:pt-0 md:border-t-0 text-left md:text-right shrink-0">
            <span className="text-[11px] uppercase font-semibold text-slate-400 block">Peranan Sistem</span>
            <p className="text-sm font-bold text-blue-900 uppercase">{profil?.peranan}</p>
          </div>
        </div>

        {profil?.peranan === 'admin' && senaraiMenunggu.length > 0 && (
          <div className="bg-white rounded-2xl p-4 sm:p-6 shadow-sm border border-amber-300">
            <h3 className="text-base font-bold text-slate-800 mb-3 sm:mb-4">
              Kelulusan Akaun Baharu ({senaraiMenunggu.length} Menunggu)
            </h3>
            <div className="divide-y divide-slate-100">
              {senaraiMenunggu.map((item) => (
                <div key={item.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-bold text-sm text-slate-800">{item.senarai_induk_ahli?.nama_penuh}</p>
                    <p className="text-xs text-slate-500 break-all">
                      IC: {item.no_ic} | No. Ahli: {item.senarai_induk_ahli?.no_ahli} | E-mel: {item.email}
                    </p>
                  </div>
                  <div className="flex gap-2 w-full sm:w-auto">
                    <button
                      onClick={() => tindakanAdmin(item.id, 'lulus')}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-2 sm:py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg"
                    >
                      <UserCheck className="w-4 h-4" /> Luluskan
                    </button>
                    <button
                      onClick={() => tindakanAdmin(item.id, 'ditolak')}
                      className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-1 px-3 py-2 sm:py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-lg"
                    >
                      <UserX className="w-4 h-4" /> Tolak
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {profil && <ModulKursus profil={profil} />}
      </main>
    </div>
  );
}
