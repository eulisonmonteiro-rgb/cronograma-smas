// =====================================================================
// Cronograma das Unidades – lógica do site
// Os dados ficam no Supabase. As regras de bloqueio estão no banco
// (supabase/schema.sql), então esta tela só mostra a mensagem de erro.
// =====================================================================
const C = window.CONFIG;
const sb = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);

const $ = id => document.getElementById(id);
const esc = s => String(s ?? "").replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
const key = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const fmtData = d => { const [y, m, dd] = d.split("-"); return `${dd}/${m}/${y}`; };
const hora = t => String(t).slice(0, 5);
const msgErro = e => e?.message || "Erro inesperado.";
const aviso = t => { $("aviso").textContent = t; };
const emailDa = nome => C.UNIDADES.find(u => u.nome === nome)?.email;

let ME = null;                       // { unidade, admin }
let S = { acts: [], logos: {} };     // dados em memória
let cur = new Date(), sel = key(new Date()), canal = null;

const podeAlterar = a => ME && (ME.admin || a.unidade === ME.unidade);

// ---------- Sessão ----------
async function iniciar() {
  const { data } = await sb.auth.getUser();
  const user = data?.user;
  if (!user) {
    ME = null; S = { acts: [], logos: {} }; render();
    $("dlgLogin").showModal();
    return;
  }
  const { data: perfil, error } = await sb.from("perfis").select("unidade, admin").eq("id", user.id).single();
  if (error || !perfil) {
    await sb.auth.signOut();
    aviso("Este usuário não está vinculado a nenhuma unidade. Fale com a SMAS.");
    $("dlgLogin").showModal();
    return;
  }
  ME = { unidade: perfil.unidade, admin: perfil.admin };
  aviso("");
  await carregar();
  assinar();
  render();
}

async function entrar() {
  $("lmsg").textContent = "";
  const { error } = await sb.auth.signInWithPassword({ email: emailDa($("lu").value), password: $("lp").value });
  if (error) { $("lmsg").textContent = "Senha incorreta."; return; }
  $("lp").value = "";
  $("dlgLogin").close();
  await iniciar();
}

async function sair() {
  await sb.auth.signOut();
  if (canal) sb.removeChannel(canal);
  canal = null;
  await iniciar();
}

// ---------- Dados ----------
async function carregar() {
  const [a, l] = await Promise.all([
    sb.from("atividades").select("*").order("data").order("ini"),
    sb.from("logos").select("*")
  ]);
  if (a.error || l.error) { aviso("Erro ao carregar: " + msgErro(a.error || l.error)); return; }
  S.acts = a.data.map(x => ({
    id: x.id, data: x.data, ini: hora(x.ini), fim: hora(x.fim),
    unidade: x.unidade, responsavel: x.responsavel, titulo: x.titulo, tipo: x.tipo
  }));
  S.logos = Object.fromEntries(l.data.map(x => [x.unidade, x.data_url]));
  render();
}

// Tempo real: quando outra unidade muda algo, recarrega
function assinar() {
  if (canal) sb.removeChannel(canal);
  canal = sb.channel("cronograma")
    .on("postgres_changes", { event: "*", schema: "public", table: "atividades" }, () => carregar())
    .on("postgres_changes", { event: "*", schema: "public", table: "logos" }, () => carregar())
    .subscribe();
}

// ---------- Tela ----------
function mudar(n) { cur.setMonth(cur.getMonth() + n); render(); }

function card(a) {
  const logo = S.logos[a.unidade] ? `<img src="${S.logos[a.unidade]}" alt="">` : "";
  return `<div class="item ${a.unidade === C.ADMIN ? "smas" : ""}" onclick="editar('${a.id}')">${logo}
    <div><b>${esc(a.ini)}–${esc(a.fim)} · ${esc(a.titulo)}</b>
    <div class="mut">${esc(a.unidade)} · ${esc(a.tipo)}<br>Resp.: ${esc(a.responsavel)} · ${fmtData(a.data)}</div></div></div>`;
}

function render() {
  const logado = !!ME;
  $("quem").textContent = logado ? `${ME.unidade}${ME.admin ? " (admin)" : ""}` : "Não autenticado";
  $("bAuth").textContent = logado ? "Sair" : "Entrar";
  ["bNova", "bMassa", "bLogo"].forEach(id => $(id).disabled = !logado);
  $("bBkp").hidden = !(logado && ME.admin);

  const f = $("filtro").value;
  const vis = S.acts.filter(a => !f || a.unidade === f);
  const y = cur.getFullYear(), m = cur.getMonth();
  $("mes").textContent = cur.toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  const cal = $("cal");
  cal.innerHTML = "";
  ["D", "S", "T", "Q", "Q", "S", "S"].forEach(x => cal.insertAdjacentHTML("beforeend", `<div class="h">${x}</div>`));
  const first = new Date(y, m, 1).getDay(), total = new Date(y, m + 1, 0).getDate();
  for (let i = 0; i < first; i++) cal.insertAdjacentHTML("beforeend", "<div></div>");
  for (let d = 1; d <= total; d++) {
    const k = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const lst = vis.filter(a => a.data === k);
    const el = document.createElement("div");
    el.className = "day" + (lst.length ? " s" : "") + (k === sel ? " t" : "");
    el.innerHTML = `<b>${d}</b>` +
      lst.slice(0, 3).map(a => `<span class="dot ${a.unidade === C.ADMIN ? "smas" : ""}"></span>`).join("") +
      (lst.length > 3 ? `<span class="mut">+${lst.length - 3}</span>` : "");
    el.onclick = () => { sel = k; render(); };
    cal.appendChild(el);
  }

  $("tituloDia").textContent = sel ? fmtData(sel) : "Selecione um dia";
  const dia = vis.filter(a => a.data === sel).sort((a, b) => a.ini.localeCompare(b.ini));
  $("lista").innerHTML = !logado
    ? `<p class="mut">Entre com a senha da sua unidade para ver e lançar atividades.</p>`
    : (dia.map(card).join("") || `<p class="mut">Nenhuma atividade neste dia.</p>`);
}

// ---------- Atividades ----------
function abrirForm(a) {
  if (!ME) return $("dlgLogin").showModal();
  if (a && !podeAlterar(a)) return alert("Somente a unidade responsável (ou a SMAS) pode alterar esta atividade.");
  $("tDlg").textContent = a ? "Editar atividade" : "Nova atividade";
  $("fmsg").textContent = "";
  $("fid").value = a ? a.id : "";
  $("fdata").value = a ? a.data : (sel || key(new Date()));
  $("fini").value = a ? a.ini : "09:00";
  $("ffim").value = a ? a.fim : "10:00";
  $("fund").value = a ? a.unidade : (ME.admin ? (($("filtro").value) || C.UNIDADES[0].nome) : ME.unidade);
  $("fund").disabled = !ME.admin;
  $("ftit").value = a ? a.titulo : "";
  $("ftipo").value = a ? a.tipo : "Outro";
  $("fresp").value = a ? a.responsavel : "";
  $("fdel").hidden = !a;
  $("dlg").showModal();
}
function editar(id) { abrirForm(S.acts.find(x => x.id === id)); }

async function salvarForm(e) {
  e.preventDefault();
  $("fmsg").textContent = "";
  const linha = {
    id: $("fid").value || crypto.randomUUID(),
    data: $("fdata").value,
    ini: $("fini").value,
    fim: $("ffim").value,
    unidade: ME.admin ? $("fund").value : ME.unidade,
    responsavel: $("fresp").value.trim(),
    titulo: $("ftit").value.trim(),
    tipo: $("ftipo").value
  };
  if (linha.fim <= linha.ini) return $("fmsg").textContent = "A hora final deve ser posterior à inicial.";
  const { error } = await sb.from("atividades").upsert(linha);
  if (error) return $("fmsg").textContent = msgErro(error);
  $("dlg").close();
  sel = linha.data;
  cur = new Date(linha.data + "T12:00:00");
  await carregar();
}

async function excluir() {
  const id = $("fid").value;
  if (!confirm("Excluir esta atividade?")) return;
  const { error } = await sb.from("atividades").delete().eq("id", id);
  if (error) return $("fmsg").textContent = msgErro(error);
  $("dlg").close();
  await carregar();
}

async function importarMassa() {
  const linhas = $("bulk").value.split("\n").map(l => l.trim()).filter(Boolean);
  if (!linhas.length) return;
  $("bImp").disabled = true;
  const log = [];
  let ok = 0;
  for (let i = 0; i < linhas.length; i++) {
    const p = linhas[i].split(/[;\t]/).map(s => s.trim());
    if (p.length < 6) { log.push(`<div class="err">Linha ${i + 1}: campos insuficientes.</div>`); continue; }
    let [d, ini, fim, un, resp, tit, tipo = "Outro"] = p;
    const m = d.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m) d = `${m[3]}-${m[2]}-${m[1]}`;
    if (!C.TIPOS.includes(tipo)) tipo = "Outro";
    if (!ME.admin && un !== ME.unidade) {
      log.push(`<div class="err">Linha ${i + 1}: só é possível lançar atividades de ${esc(ME.unidade)}.</div>`);
      continue;
    }
    const { error } = await sb.from("atividades").insert({
      id: crypto.randomUUID(), data: d, ini, fim, unidade: un, responsavel: resp, titulo: tit, tipo
    });
    if (error) log.push(`<div class="err">Linha ${i + 1}: ${esc(msgErro(error))}</div>`);
    else { ok++; log.push(`<div class="ok">Linha ${i + 1}: adicionada (${esc(tit)})</div>`); }
  }
  $("blog").innerHTML = `<b>${ok} de ${linhas.length} atividades adicionadas</b>` + log.join("");
  $("bImp").disabled = false;
  await carregar();
}

// ---------- Logos ----------
function lerArquivo(f) {
  return new Promise((ok, err) => {
    const r = new FileReader();
    r.onload = () => ok(r.result);
    r.onerror = err;
    r.readAsDataURL(f);
  });
}

$("lfile").onchange = async e => {
  const file = e.target.files[0];
  if (!file) return;
  const un = $("lund").value;
  if (!ME.admin && un !== ME.unidade) { alert("Só é possível enviar a logo da própria unidade."); return; }
  if (file.size > 150e3) { alert("Imagem acima de 150 KB."); return; }
  const dataUrl = await lerArquivo(file);
  const { error } = await sb.from("logos").upsert({ unidade: un, data_url: dataUrl });
  if (error) alert(msgErro(error));
  else { alert("Logo salva."); await carregar(); }
  $("lfile").value = "";
};

async function removerLogo() {
  const un = $("lund").value;
  if (!ME.admin && un !== ME.unidade) return alert("Só é possível remover a logo da própria unidade.");
  const { error } = await sb.from("logos").delete().eq("unidade", un);
  if (error) alert(msgErro(error)); else await carregar();
}

// ---------- Backup (SMAS) ----------
function baixar(blob, nome) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = nome;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function abrirBackup() {
  if (!ME?.admin) return;
  $("rmsg").textContent = "";
  $("dlgBkp").showModal();
}

async function baixarBackup() {
  const { data: logos, error } = await sb.from("logos").select("*");
  if (error) return alert(msgErro(error));
  const conteudo = { versao: 4, geradoEm: new Date().toISOString(), atividades: S.acts, logos };
  baixar(new Blob([JSON.stringify(conteudo, null, 1)], { type: "application/json" }),
    `cronograma-backup-${key(new Date())}.json`);
}

async function restaurar() {
  if (!ME?.admin) return;
  const file = $("rfile").files[0];
  if (!file) return ($("rmsg").textContent = "Escolha um arquivo de backup.");
  let d;
  try { d = JSON.parse(await file.text()); }
  catch { return ($("rmsg").textContent = "Arquivo inválido."); }
  if (!Array.isArray(d.atividades)) return ($("rmsg").textContent = "Arquivo inválido.");
  if (!confirm("Substituir TODO o cronograma pelo backup? Esta ação não pode ser desfeita.")) return;

  const { error: e1 } = await sb.from("atividades").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  if (e1) return ($("rmsg").textContent = msgErro(e1));
  for (const a of d.atividades) {
    const { error } = await sb.from("atividades").insert({
      id: a.id || crypto.randomUUID(), data: a.data, ini: a.ini, fim: a.fim,
      unidade: a.unidade, responsavel: a.responsavel, titulo: a.titulo, tipo: a.tipo
    });
    if (error) return ($("rmsg").textContent = `Parou na atividade "${a.titulo}": ${msgErro(error)}`);
  }
  for (const [un, dataUrl] of Object.entries(d.logos || {})) {
    if (typeof dataUrl === "string") await sb.from("logos").upsert({ unidade: un, data_url: dataUrl });
  }
  $("dlgBkp").close();
  alert("Backup restaurado.");
  await carregar();
}

// ---------- PDF do mês ----------
function pdf() {
  if (!window.jspdf) return alert("Biblioteca de PDF não carregou. Recarregue a página.");
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const fil = $("filtro").value, y = cur.getFullYear(), m = cur.getMonth();
  const W = 297, M = 10, cw = (W - 2 * M) / 7, top = 24, ch = (210 - top - 12) / 6;

  doc.setFont("helvetica", "bold"); doc.setFontSize(14);
  doc.text(`Cronograma das Unidades – ${cur.toLocaleDateString("pt-BR", { month: "long", year: "numeric" })}`, M, 14);
  doc.setFont("helvetica", "normal"); doc.setFontSize(8);
  doc.text(fil ? `Unidade: ${fil}` : "Todas as unidades", M, 19);
  ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].forEach((n, i) => {
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.text(n, M + i * cw + 1.5, top - 2);
  });

  const first = new Date(y, m, 1).getDay(), total = new Date(y, m + 1, 0).getDate();
  for (let d = 1; d <= total; d++) {
    const idx = first + d - 1, r = Math.floor(idx / 7), c = idx % 7;
    const x = M + c * cw, yy = top + r * ch;
    doc.setDrawColor(180); doc.rect(x, yy, cw, ch);
    doc.setFont("helvetica", "bold"); doc.setFontSize(8); doc.setTextColor(0);
    doc.text(String(d), x + 1.5, yy + 4);
    const k = `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const lst = S.acts.filter(a => a.data === k && (!fil || a.unidade === fil)).sort((a, b) => a.ini.localeCompare(b.ini));
    doc.setFont("helvetica", "normal"); doc.setFontSize(6.2);
    let ly = yy + 8;
    lst.slice(0, 4).forEach(a => {
      doc.splitTextToSize(`${a.ini} ${a.titulo} (${a.unidade}) – ${a.responsavel}`, cw - 3).slice(0, 2).forEach(l => {
        if (ly < yy + ch - 1) { doc.text(l, x + 1.5, ly); ly += 2.6; }
      });
    });
    if (lst.length > 4 && ly < yy + ch - 1) doc.text(`+${lst.length - 4} atividade(s)`, x + 1.5, ly);
  }
  doc.setFontSize(6); doc.setTextColor(100);
  doc.text(`Gerado em ${new Date().toLocaleString("pt-BR")}${ME ? " por " + ME.unidade : ""}`, M, 206);
  doc.save(`cronograma-${y}-${String(m + 1).padStart(2, "0")}${fil ? "-" + fil.toLowerCase().replace(/[^a-z0-9]+/g, "-") : ""}.pdf`);
}

// ---------- Inicialização ----------
(() => {
  const opts = (el, arr, todas) => {
    el.innerHTML = (todas ? '<option value="">Todas as unidades</option>' : "") +
      arr.map(x => `<option>${esc(x)}</option>`).join("");
  };
  opts($("lu"), C.UNIDADES.map(u => u.nome));
  opts($("fund"), C.UNIDADES.map(u => u.nome));
  opts($("lund"), C.UNIDADES.map(u => u.nome));
  opts($("filtro"), C.UNIDADES.map(u => u.nome), true);
  opts($("ftipo"), C.TIPOS);

  if (C.SUPABASE_URL.includes("SEU-PROJETO")) {
    aviso("Configuração pendente: preencha config.js com os dados do Supabase.");
    render();
    return;
  }
  iniciar().catch(e => aviso("Não foi possível conectar: " + msgErro(e)));
})();
