// ============================================================
//  BotGenZ - WhatsApp Bot (Baileys)
//  Game  : .quiz (timer 30 detik, poin, leaderboard) .hint .skip .lb .skor
//  AI    : .ai / .curhat (ingat percakapan, ada jeda anti-spam)
//  Stiker: .s  .smeme atas|bawah  .toimg   (kirim atau reply gambar)
//  Seru  : .dadu .koin .rate .pilih .quote .fakta .calc
//  Grup  : .tagall .hidetag .welcome on/off   (admin)
//  Lain  : .afk (benar-benar bekerja) .ping .sibuk on/off (owner)
// ============================================================
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  downloadMediaMessage,
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const axios = require('axios');
const fs = require('fs');
const sharp = require('sharp');
require('dotenv').config();

// ==================== KONFIGURASI ====================
const config = {
  botName: process.env.BOT_NAME || 'BotGenZ',
  prefix: '.',
  botNumber: process.env.BOT_NUMBER || '',
  // nomor owner (tanpa +), pisahkan dengan koma. Pesan dari nomor bot sendiri juga dianggap owner.
  owner: (process.env.OWNER_NUMBER || '').split(',').map((s) => s.replace(/\D/g, '')).filter(Boolean),
  ai: {
    apiKey: process.env.AI_API_KEY || '',
    apiUrl: process.env.AI_API_URL || 'https://api.openai.com/v1/chat/completions',
    model: process.env.AI_MODEL || 'gpt-4o-mini',
  },
  quiz: { waktu: Number(process.env.QUIZ_WAKTU) || 30, poin: 15 },
  tampilkanNomorJuara: true, // juara 1-3 di .lb tampil dengan nomor WA
};

// ==================== DATA ====================
const QUIZ_DATA = [
  { soal: 'Ibukota Indonesia?', jawab: ['jakarta'] },
  { soal: '1 + 1 = ?', jawab: ['2', 'dua'] },
  { soal: 'Siapa presiden pertama RI?', jawab: ['soekarno', 'sukarno'] },
  { soal: 'Aplikasi chatting yang kita pakai sekarang?', jawab: ['whatsapp', 'wa'] },
  { soal: 'Hewan yang suka makan wortel?', jawab: ['kelinci'] },
  { soal: 'Apa bahasa Thailand-nya yatim piatu?', jawab: ['tha lheng khap'] },
  { soal: 'Jika orang demam lalu dikompres, maka jadi?', jawab: ['rar'] },
  { soal: 'Ibukota Jepang?', jawab: ['tokyo'] },
  { soal: 'Planet terbesar di tata surya?', jawab: ['jupiter'] },
  { soal: '12 x 12 = ?', jawab: ['144'] },
  { soal: 'Lambang kimia emas?', jawab: ['au'] },
  { soal: 'Mata uang Jepang?', jawab: ['yen'] },
  { soal: 'Gunung tertinggi di Indonesia?', jawab: ['puncak jaya', 'carstensz'] },
  { soal: 'Penemu bola lampu yang paling terkenal?', jawab: ['edison', 'thomas alva edison'] },
  { soal: 'Proklamasi kemerdekaan Indonesia dibacakan tanggal berapa? (tanggal dan bulan)', jawab: ['17 agustus'] },
  { soal: 'Alat musik bambu khas Jawa Barat?', jawab: ['angklung'] },
  { soal: 'Ibukota Prancis?', jawab: ['paris'] },
  { soal: 'Benua terluas di dunia?', jawab: ['asia'] },
  { soal: 'Hewan tercepat di darat?', jawab: ['cheetah', 'citah'] },
  { soal: 'Organ tubuh yang memompa darah?', jawab: ['jantung'] },
  { soal: 'Singkatan WWW adalah World Wide ...?', jawab: ['web'] },
  { soal: 'Bahasa pemrograman yang membuat web interaktif (nama depannya Java...)?', jawab: ['javascript'] },
  { soal: 'Mobile Legends dibuat oleh perusahaan apa?', jawab: ['moonton'] },
  { soal: 'Hero ML terinspirasi wayang Indonesia, namanya diawali G?', jawab: ['gatotkaca'] },
  { soal: 'Battle spell ML untuk teleport jarak pendek?', jawab: ['flicker'] },
  { soal: 'Monster besar di tengah peta ML yang membantu dorong lane?', jawab: ['lord'] },
  { soal: 'Role ML yang menyerang jarak jauh dengan damage fisik?', jawab: ['marksman'] },
  { soal: 'Rank tertinggi di Mobile Legends?', jawab: ['mythical immortal', 'immortal'] },
  { soal: 'Hero ML ninja Jepang berawalan H (assassin)?', jawab: ['hayabusa'] },
];

const QUOTES = [
  'Pelan-pelan juga sampai, yang penting jangan berhenti. 🐢',
  'Hari ini capek, besok mulai lagi. Istirahat itu bagian dari progres. ☕',
  'Jangan bandingin bab 1 kamu sama bab 20 orang lain. 📖',
  'Gagal itu data, bukan vonis. 📊',
  'Kerjain yang kecil dulu, yang penting mulai. 🚀',
  'Kamu nggak telat, kamu lagi di jalur kamu sendiri. 🛤️',
  'Overthinking nggak bikin masalah selesai, aksi kecil yang bikin. 💪',
  'Tidur cukup itu produktif juga loh. 😴',
  'Satu langkah kecil tiap hari lebih kuat daripada niat besar sekali. 🔥',
  'Kalau lagi capek, ganti gaya, bukan menyerah. 🎯',
];
const FAKTA = [
  'Madu hampir tidak pernah basi karena kadar airnya rendah dan bersifat antibakteri. 🍯',
  'Gurita punya tiga jantung. 🐙',
  'Secara botani, pisang termasuk buah beri, sedangkan stroberi bukan. 🍌',
  'Cahaya Matahari butuh sekitar 8 menit untuk sampai ke Bumi. ☀️',
  'Jerapah dan manusia sama-sama punya 7 ruas tulang leher. 🦒',
  'Venus berputar berlawanan arah dengan kebanyakan planet lainnya. 🪐',
  'Kotoran wombat berbentuk kubus. 🟫',
  'Lidah setiap orang punya pola unik, seperti sidik jari. 👅',
  'Hati manusia bisa tumbuh kembali sebagian setelah rusak. 🫀',
  'Indonesia punya lebih dari 17 ribu pulau. 🏝️',
];
const TEMPLATE_AI = ['Santai aja 😎', 'Jangan dipikirin banget ☕', 'Pelan-pelan, kamu pasti bisa 💪', 'Cerita lagi dong, aku dengerin 👂'];
const SYSTEM_AI = 'Kamu teman ngobrol yang asik, pakai bahasa gaul gen z yang sopan. Jawab singkat (maksimal sekitar 100 kata).';

// ==================== FUNGSI BANTU ====================
function readJson(file, fallback = {}) {
  try { return JSON.parse(fs.readFileSync(file, 'utf-8')); } catch { return fallback; }
}
function writeJson(file, data) {
  fs.writeFileSync(file, JSON.stringify(data, null, 2));
}
const pickRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
const num = (jid) => String(jid || '').split('@')[0].split(':')[0];

function extractText(msg) {
  const m = msg.message;
  if (!m) return '';
  return (
    m.conversation ||
    m.extendedTextMessage?.text ||
    m.imageMessage?.caption ||
    m.videoMessage?.caption ||
    ''
  );
}
function getContext(msg) {
  const m = msg.message || {};
  return (m.extendedTextMessage || m.imageMessage || m.videoMessage || {}).contextInfo;
}
// ambil pesan yang berisi media: pesan itu sendiri, atau pesan yang di-reply
function ambilMedia(msg, tipe) {
  const m = msg.message || {};
  if (m[tipe]) return msg;
  const ctx = getContext(msg);
  if (ctx?.quotedMessage?.[tipe]) {
    return {
      key: { remoteJid: msg.key.remoteJid, id: ctx.stanzaId, participant: ctx.participant },
      message: ctx.quotedMessage,
    };
  }
  return null;
}
function formatDurasi(ms) {
  const d = Math.floor(ms / 1000);
  return `${Math.floor(d / 3600)}j ${Math.floor((d % 3600) / 60)}m ${d % 60}d`;
}
const norm = (t) => String(t).toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();
function lev(a, b) {
  let prev = Array.from({ length: b.length + 1 }, (_, j) => j);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}
// cocok jika sama persis, atau typo kecil (untuk jawaban yang cukup panjang)
function cocok(tebakan, daftar) {
  const g = norm(tebakan);
  if (!g) return false;
  return daftar.some((j) => {
    const a = norm(j);
    return g === a || (a.length >= 5 && lev(g, a) <= (a.length >= 9 ? 2 : 1));
  });
}

// ==================== STATE (disimpan ke state.json) ====================
const STATE_FILE = process.env.STATE_FILE || 'state.json';
const state = readJson(STATE_FILE, {});
state.globalBusy = !!state.globalBusy;
state.afk = state.afk || {};        // nomor -> { alasan, sejak }
state.lb = state.lb || {};          // chatId -> nomor -> { nama, poin, benar }
state.welcome = state.welcome || {}; // chatId -> true
delete state.quiz;                  // format lama

let saveTimer;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => writeJson(STATE_FILE, state), 800);
}

const mulaiJalan = Date.now();
const games = {};      // chatId -> kuis yang sedang berjalan
const recentQuiz = {}; // chatId -> soal yang baru dipakai
const aiRiwayat = {};  // nomor -> riwayat percakapan
const aiCooldown = {}; // nomor -> waktu tanya terakhir
const lastCmd = {};    // nomor -> waktu perintah terakhir

function tambahPoin(chatId, sender, nama) {
  const lb = (state.lb[chatId] ||= {});
  const p = (lb[num(sender)] ||= { nama, poin: 0, benar: 0 });
  p.nama = nama;
  p.poin += config.quiz.poin;
  p.benar++;
  save();
}
function pilihSoal(chatId) {
  const dipakai = (recentQuiz[chatId] ||= []);
  let kandidat = QUIZ_DATA.filter((q) => !dipakai.includes(q.soal));
  if (!kandidat.length) { dipakai.length = 0; kandidat = QUIZ_DATA; }
  const q = pickRandom(kandidat);
  dipakai.push(q.soal);
  if (dipakai.length > 10) dipakai.shift();
  return q;
}

// ==================== AI ====================
async function tanyaAI(kunci, pesan) {
  const r = (aiRiwayat[kunci] ||= []);
  r.push({ role: 'user', content: pesan });
  try {
    const res = await axios.post(
      config.ai.apiUrl,
      { model: config.ai.model, messages: [{ role: 'system', content: SYSTEM_AI }, ...r] },
      { headers: { Authorization: `Bearer ${config.ai.apiKey}` }, timeout: 30000 }
    );
    const teks = res.data?.choices?.[0]?.message?.content?.trim() || '...';
    r.push({ role: 'assistant', content: teks });
    while (r.length > 12) r.splice(0, 2); // ingat 6 giliran terakhir
    return teks;
  } catch (e) {
    r.pop();
    throw e;
  }
}

// ==================== STIKER ====================
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
async function buatMeme(buffer, atas, bawah) {
  const ukuran = (t) => (t.length > 28 ? 26 : t.length > 20 ? 34 : 44);
  const baris = (t, y) => (t ? `<text x="256" y="${y}" font-size="${ukuran(t)}">${esc(t.slice(0, 40))}</text>` : '');
  const svg =
    `<svg width="512" height="512" xmlns="http://www.w3.org/2000/svg">` +
    `<style>text{font-family:Impact,'Arial Black',sans-serif;font-weight:900;fill:#fff;stroke:#000;` +
    `stroke-width:6px;paint-order:stroke;text-anchor:middle;text-transform:uppercase}</style>` +
    `${baris(atas, 56)}${baris(bawah, 486)}</svg>`;
  return sharp(buffer).resize(512, 512, { fit: 'cover' }).composite([{ input: Buffer.from(svg) }]).webp().toBuffer();
}
const unduh = (sock, target) =>
  downloadMediaMessage(target, 'buffer', {}, { logger: pino({ level: 'silent' }), reuploadRequest: sock.updateMediaMessage });

// ==================== PERINTAH ====================
const perintah = {};

perintah.menu = async ({ reply }) => {
  const p = config.prefix;
  await reply(
    `╭─「 *${config.botName.toUpperCase()}* 」\n` +
    `│ Status : ${state.globalBusy ? '🔴 Sibuk' : '🟢 Online'}\n` +
    `│ AI     : ${config.ai.apiKey ? '🟢 Aktif' : '🟡 Template'}\n` +
    `│ Uptime : ${formatDurasi(Date.now() - mulaiJalan)}\n` +
    `╰──────────────\n\n` +
    `*🎮 GAME*\n${p}quiz • ${p}hint • ${p}skip • ${p}lb • ${p}skor\n\n` +
    `*🤖 AI*\n${p}ai <pesan> (juga ${p}curhat)\n\n` +
    `*🖼️ STIKER* (kirim / reply gambar)\n${p}s • ${p}smeme atas|bawah • ${p}toimg (reply stiker)\n\n` +
    `*🎲 SERU-SERUAN*\n${p}dadu • ${p}koin • ${p}rate <apa> • ${p}pilih a|b|c\n${p}quote • ${p}fakta • ${p}calc 12*3+4\n\n` +
    `*👥 GRUP (admin)*\n${p}tagall • ${p}hidetag <teks> • ${p}welcome on/off\n\n` +
    `*⚙️ LAINNYA*\n${p}afk <alasan> • ${p}ping • ${p}sibuk on/off (owner)`
  );
};

perintah.ping = async ({ reply }) => {
  const ram = Math.round(process.memoryUsage().rss / 1024 / 1024);
  await reply(`🏓 Pong!\n⚡ Uptime: ${formatDurasi(Date.now() - mulaiJalan)}\n💾 RAM: ${ram} MB`);
};

// ---------- QUIZ ----------
perintah.quiz = async ({ sock, chatId, reply }) => {
  if (games[chatId]) return reply('Masih ada kuis yang belum terjawab! Ketik jawabanmu, atau *.hint* / *.skip*');
  const q = pilihSoal(chatId);
  const g = { soal: q.soal, jawab: q.jawab, timer: null };
  games[chatId] = g;
  g.timer = setTimeout(async () => {
    if (games[chatId] !== g) return;
    delete games[chatId];
    await sock.sendMessage(chatId, { text: `⏰ Waktu habis!\nJawaban: *${g.jawab[0]}*\nKetik *.quiz* untuk main lagi.` }).catch(() => {});
  }, config.quiz.waktu * 1000);
  await reply(
    `🎮 *KUIS RANDOM*\n\n❓ ${q.soal}\n\n` +
    `⏱️ Waktu ${config.quiz.waktu} detik • jawaban benar pertama dapat +${config.quiz.poin} poin\n` +
    `💡 *.hint* petunjuk • *.skip* menyerah\n_Ketik jawabanmu langsung, tanpa titik._`
  );
};

perintah.hint = async ({ chatId, reply }) => {
  const g = games[chatId];
  if (!g) return reply('Tidak ada kuis. Ketik *.quiz* dulu.');
  const pola = [...g.jawab[0]].map((c, i) => (/[a-z0-9]/i.test(c) ? (i === 0 || i % 3 === 0 ? c : '_') : c)).join(' ');
  await reply(`💡 Petunjuk: ${pola}`);
};

perintah.skip = async ({ chatId, reply }) => {
  const g = games[chatId];
  if (!g) return reply('Tidak ada kuis yang berjalan.');
  clearTimeout(g.timer);
  delete games[chatId];
  await reply(`🏳️ Yah menyerah. Jawabannya: *${g.jawab[0]}*\nKetik *.quiz* untuk soal baru.`);
};

perintah.lb = async ({ sock, chatId, msg, reply }) => {
  const daftar = Object.entries(state.lb[chatId] || {}).map(([nomor, p]) => ({ nomor, ...p }));
  if (!daftar.length) return reply('Leaderboard masih kosong. Ketik *.quiz* buat mulai!');
  daftar.sort((a, b) => b.benar - a.benar || b.poin - a.poin);
  const medali = ['🥇', '🥈', '🥉'];
  const baris = daftar.slice(0, 10).map((p, k) => {
    const judul = k < 3
      ? `${medali[k]} *${p.nama}*${config.tampilkanNomorJuara ? ` (+${p.nomor})` : ''}`
      : `▫️ ${p.nama}`;
    return `${judul}\n     ${p.benar} benar • ${p.poin} poin`;
  });
  await reply(`🏆 *LEADERBOARD*\n(paling sering jawab benar)\n\n${baris.join('\n')}`);
};

perintah.skor = async ({ chatId, sender, pushName, reply }) => {
  const daftar = Object.entries(state.lb[chatId] || {}).map(([nomor, p]) => ({ nomor, ...p }));
  daftar.sort((a, b) => b.benar - a.benar || b.poin - a.poin);
  const idx = daftar.findIndex((p) => p.nomor === num(sender));
  if (idx < 0) return reply('Kamu belum punya poin di chat ini. Ketik *.quiz* dulu!');
  const p = daftar[idx];
  await reply(`📊 *${pushName}*\nPeringkat: ${idx + 1} dari ${daftar.length}\nBenar: ${p.benar}\nPoin: ${p.poin}`);
};

// ---------- AI ----------
perintah.ai = async ({ args, sender, reply }) => {
  if (!args) return reply('Mau ngobrol apa? Contoh: *.ai aku lagi galau*');
  const kunci = num(sender);
  if (Date.now() - (aiCooldown[kunci] || 0) < 5000) return reply('Sabar bentar ya, 5 detik sekali 🙏');
  aiCooldown[kunci] = Date.now();
  let jawab = pickRandom(TEMPLATE_AI);
  if (config.ai.apiKey) {
    try { jawab = await tanyaAI(kunci, args); }
    catch (e) { console.error('AI error:', e.message); jawab = 'AI lagi error, coba lagi nanti 🙏'; }
  }
  await reply(jawab);
};
perintah.curhat = perintah.ai;

// ---------- STIKER ----------
perintah.s = async ({ sock, msg, chatId, reply }) => {
  const target = ambilMedia(msg, 'imageMessage');
  if (!target) return reply('Kirim gambar dengan caption *.s* atau reply gambar dengan *.s*');
  const buf = await unduh(sock, target);
  const sticker = await sharp(buf).resize(512, 512, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } }).webp().toBuffer();
  await sock.sendMessage(chatId, { sticker }, { quoted: msg });
};

perintah.smeme = async ({ sock, msg, chatId, args, reply }) => {
  const target = ambilMedia(msg, 'imageMessage');
  if (!target || !args) return reply('Kirim/reply gambar dengan *.smeme teks atas|teks bawah*');
  const [atas = '', bawah = ''] = args.split('|').map((s) => s.trim());
  const buf = await unduh(sock, target);
  const sticker = await buatMeme(buf, atas, bawah);
  await sock.sendMessage(chatId, { sticker }, { quoted: msg });
};

perintah.toimg = async ({ sock, msg, chatId, reply }) => {
  const target = ambilMedia(msg, 'stickerMessage');
  if (!target) return reply('Reply stiker dengan *.toimg*');
  const buf = await unduh(sock, target);
  const image = await sharp(buf).png().toBuffer();
  await sock.sendMessage(chatId, { image, caption: '✅ Selesai!' }, { quoted: msg });
};

// ---------- SERU-SERUAN ----------
perintah.dadu = async ({ reply }) => {
  const n = 1 + Math.floor(Math.random() * 6);
  await reply(`🎲 Dadu: *${n}* ${'⚀⚁⚂⚃⚄⚅'[n - 1]}`);
};
perintah.koin = async ({ reply }) => reply(`🪙 Hasilnya: *${pickRandom(['Kepala', 'Ekor'])}*`);
perintah.rate = async ({ args, reply }) => {
  if (!args) return reply('Contoh: *.rate gantengku*');
  let h = 0;
  for (const c of norm(args)) h = (h * 31 + c.charCodeAt(0)) % 1009; // sama teks = sama skor
  const skor = h % 101;
  const bar = '█'.repeat(Math.round(skor / 10)) + '░'.repeat(10 - Math.round(skor / 10));
  await reply(`📊 Rating *${args}*\n${bar} ${skor}/100`);
};
perintah.pilih = async ({ args, reply }) => {
  const opsi = args.split('|').map((s) => s.trim()).filter(Boolean);
  if (opsi.length < 2) return reply('Contoh: *.pilih makan nasi|makan mie|puasa*');
  await reply(`🤔 Aku pilih: *${pickRandom(opsi)}*`);
};
perintah.quote = async ({ reply }) => reply(`💬 ${pickRandom(QUOTES)}`);
perintah.fakta = async ({ reply }) => reply(`🧠 *Tahukah kamu?*\n${pickRandom(FAKTA)}`);
perintah.calc = async ({ args, reply }) => {
  const ekspresi = args.replace(/,/g, '.').replace(/x/gi, '*').replace(/\^/g, '**');
  if (!ekspresi || ekspresi.length > 100 || !/^[0-9+\-*/().%\s]+$/.test(ekspresi)) {
    return reply('Contoh: *.calc 12*3+4* (hanya angka dan + - * / % ^ ( ))');
  }
  let hasil;
  try { hasil = Function(`"use strict"; return (${ekspresi})`)(); } catch { hasil = NaN; }
  if (typeof hasil !== 'number' || !Number.isFinite(hasil)) return reply('Hmm, hitungannya nggak valid 🤔');
  await reply(`🧮 ${args} = *${+hasil.toFixed(8)}*`);
};

// ---------- AFK & SIBUK ----------
perintah.afk = async ({ args, sender, pushName, reply }) => {
  const alasan = args || 'lagi pergi';
  state.afk[num(sender)] = { alasan, sejak: Date.now() };
  save();
  await reply(`💤 Oke *${pushName}*, kamu AFK: *${alasan}*.\nAku kasih tahu yang nyariin kamu.`);
};
perintah.sibuk = async ({ args, isOwner, reply }) => {
  if (!isOwner) return reply('Cuma owner yang bisa pakai ini 🙅');
  state.globalBusy = args.toLowerCase() !== 'off';
  save();
  await reply(state.globalBusy ? '🔴 Mode Sibuk *AKTIF*. Bot diam sampai *.sibuk off*.' : '🟢 Mode Sibuk *NONAKTIF*.');
};

// ---------- GRUP ----------
async function infoGrup(sock, chatId, sender) {
  const meta = await sock.groupMetadata(chatId);
  const aku = meta.participants.find((p) => num(p.id) === num(sender));
  return { meta, isAdmin: !!aku?.admin };
}
async function khususAdmin(ctx) {
  if (!ctx.isGroup) { await ctx.reply('Perintah ini cuma untuk grup 👥'); return null; }
  const info = await infoGrup(ctx.sock, ctx.chatId, ctx.sender);
  if (!info.isAdmin && !ctx.isOwner) { await ctx.reply('Cuma admin grup yang bisa pakai ini 🙅'); return null; }
  return info;
}
perintah.tagall = async (ctx) => {
  const info = await khususAdmin(ctx);
  if (!info) return;
  const anggota = info.meta.participants.map((p) => p.id);
  await ctx.sock.sendMessage(
    ctx.chatId,
    { text: `📢 *TAG ALL*${ctx.args ? `\n${ctx.args}` : ''}\n\n${anggota.map((j) => `• @${num(j)}`).join('\n')}`, mentions: anggota },
    { quoted: ctx.msg }
  );
};
perintah.hidetag = async (ctx) => {
  const info = await khususAdmin(ctx);
  if (!info) return;
  await ctx.sock.sendMessage(ctx.chatId, { text: ctx.args || '📢', mentions: info.meta.participants.map((p) => p.id) });
};
perintah.welcome = async (ctx) => {
  const info = await khususAdmin(ctx);
  if (!info) return;
  state.welcome[ctx.chatId] = ctx.args.toLowerCase() !== 'off';
  save();
  await ctx.reply(state.welcome[ctx.chatId] ? '👋 Pesan sambutan *AKTIF* di grup ini.' : '🔕 Pesan sambutan *NONAKTIF*.');
};

// ==================== PENANGAN PESAN ====================
async function handleMessage(sock, msg) {
  if (!msg.message) return;
  const chatId = msg.key.remoteJid;
  if (!chatId || chatId === 'status@broadcast') return;

  const text = extractText(msg).trim();
  const isCmd = text.startsWith(config.prefix);
  if (msg.key.fromMe && !isCmd) return; // abaikan pesan bot sendiri, kecuali perintah dari owner

  const isGroup = chatId.endsWith('@g.us');
  const sender = msg.key.fromMe ? sock.user?.id || '' : isGroup ? msg.key.participant : chatId;
  const pushName = msg.pushName || num(sender);
  const isOwner = !!msg.key.fromMe || config.owner.includes(num(sender));
  const reply = (teks, extra = {}) => sock.sendMessage(chatId, { text: teks, ...extra }, { quoted: msg });

  const kata = text.split(/\s+/);
  const cmd = isCmd ? kata[0].slice(config.prefix.length).toLowerCase() : '';
  const args = kata.slice(1).join(' ').trim();

  // Mode sibuk: semua orang diabaikan kecuali owner
  if (state.globalBusy && !(isOwner && isCmd && cmd === 'sibuk')) return;

  // AFK: pengguna kembali & ada yang menyebut pengguna AFK
  const nomorPengirim = num(sender);
  if (state.afk[nomorPengirim] && cmd !== 'afk') {
    const a = state.afk[nomorPengirim];
    delete state.afk[nomorPengirim];
    save();
    await reply(`👋 Welcome back *${pushName}*! Kamu AFK ${formatDurasi(Date.now() - a.sejak)} (${a.alasan}).`);
  }
  const ctx = getContext(msg);
  const disebut = new Set([...(ctx?.mentionedJid || []), ctx?.participant].filter(Boolean).map(num));
  for (const nomor of disebut) {
    const a = state.afk[nomor];
    if (a && nomor !== nomorPengirim) {
      await reply(`💤 @${nomor} sedang AFK: *${a.alasan}* (${formatDurasi(Date.now() - a.sejak)} lalu)`, { mentions: [`${nomor}@s.whatsapp.net`] });
    }
  }

  // Jawaban kuis (pesan biasa tanpa prefix)
  const g = games[chatId];
  if (g && text && !isCmd) {
    if (cocok(text, g.jawab)) {
      delete games[chatId];
      clearTimeout(g.timer);
      tambahPoin(chatId, sender, pushName);
      await reply(`🎉 *BENAR!* ${pushName} +${config.quiz.poin} poin\nJawaban: *${g.jawab[0]}*\nKetik *.quiz* buat lanjut • *.lb* leaderboard`);
    } else if (text.length <= 40) {
      await sock.sendMessage(chatId, { react: { text: '❌', key: msg.key } }).catch(() => {});
    }
    return;
  }

  if (!isCmd || !Object.prototype.hasOwnProperty.call(perintah, cmd)) return;

  // jeda antar perintah biar tidak di-spam
  const now = Date.now();
  if (now - (lastCmd[nomorPengirim] || 0) < 1000) return;
  lastCmd[nomorPengirim] = now;

  try {
    await perintah[cmd]({ sock, msg, chatId, sender, pushName, isGroup, isOwner, text, args, cmd, reply });
  } catch (err) {
    console.error(`💥 Error .${cmd}:`, err);
    await reply('Ups, ada error. Coba lagi ya 🙏').catch(() => {});
  }
}

// ==================== KONEKSI ====================
async function startBot() {
  const { state: auth, saveCreds } = await useMultiFileAuthState('auth_info_baileys');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger: pino({ level: 'silent' }),
    auth,
    printQRInTerminal: false,
    browser: ['Ubuntu', 'Chrome', '20.0.04'],
  });

  sock.ev.on('creds.update', saveCreds);
  sock.ev.on('connection.update', async ({ connection, lastDisconnect }) => {
    if (connection === 'open') console.log('\x1b[32m✅ Bot berhasil terhubung ke WhatsApp!\x1b[0m');
    if (connection === 'close') {
      const reconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log(reconnect ? '⚠️ Koneksi terputus, nyambung lagi...' : '❌ Sesi logout. Hapus folder auth_info_baileys lalu jalankan ulang.');
      if (reconnect) startBot();
    }
  });

  // Pairing code (login pakai nomor, tanpa QR)
  if (!sock.authState.creds.registered && config.botNumber) {
    setTimeout(async () => {
      try {
        const code = await sock.requestPairingCode(config.botNumber);
        const formatted = code?.match(/.{1,4}/g)?.join('-') || code;
        console.log('\n\x1b[36m═══════════════════════════════════════\x1b[0m');
        console.log(`\x1b[33m📲 PAIRING CODE:  ${formatted}\x1b[0m`);
        console.log('\x1b[36m═══════════════════════════════════════\x1b[0m');
        console.log('Buka WA > Perangkat Tertaut > Tautkan dengan nomor telepon.');
      } catch (err) {
        console.error('❌ Gagal minta pairing code:', err.message);
      }
    }, 3000);
  }

  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) handleMessage(sock, msg).catch((e) => console.error('💥 handleMessage:', e));
  });

  // Sambutan member baru / keluar (aktifkan dengan .welcome on)
  sock.ev.on('group-participants.update', async ({ id, participants, action }) => {
    if (!state.welcome[id]) return;
    try {
      const meta = await sock.groupMetadata(id);
      for (const p of participants) {
        const jid = typeof p === 'string' ? p : p.id;
        if (action === 'add') {
          await sock.sendMessage(id, { text: `👋 Selamat datang @${num(jid)} di *${meta.subject}*!\nKetik *.menu* buat lihat fitur bot.`, mentions: [jid] });
        } else if (action === 'remove') {
          await sock.sendMessage(id, { text: `😢 Sampai jumpa @${num(jid)}.`, mentions: [jid] });
        }
      }
    } catch (e) {
      console.error('welcome error:', e.message);
    }
  });
}

module.exports = { handleMessage, config, state, perintah, games };

if (require.main === module) {
  process.on('uncaughtException', (err) => console.error('💥 Uncaught:', err));
  process.on('unhandledRejection', (err) => console.error('💥 Unhandled:', err));
  console.log('🚀 Nyalain bot...');
  startBot();
}