async function renderSessionManager(){
  const box=document.getElementById('sessionList');
  if(!box||document.getElementById('adminView').classList.contains('hidden'))return;

  const{data,error}=await db.from('winners').select('draw_session');
  if(error){
    box.innerHTML='<span class="muted">Gagal memuatkan sesi.</span>';
    return;
  }

  const counts={};
  (data||[]).forEach(x=>{
    const s=Number(x.draw_session)||1;
    counts[s]=(counts[s]||0)+1;
  });

  const sessions=Object.keys(counts).map(Number).sort((a,b)=>a-b);

  box.innerHTML=sessions.length
    ?sessions.map(s=>`
      <div class="session-chip">
        <span>Sesi ${s} • ${counts[s]} pemenang</span>
        <div class="session-actions">
          <button class="generate-session" data-session="${s}">Generate Senarai</button>
          <button class="delete-session" data-session="${s}">Padam Sesi</button>
        </div>
      </div>`).join('')
    :'<span class="muted">Belum ada sesi cabutan.</span>';

  box.querySelectorAll('.generate-session').forEach(btn=>btn.onclick=async()=>{
    const s=Number(btn.dataset.session);
    btn.disabled=true;
    const old=btn.textContent;
    btn.textContent='Menjana...';

    const{data:rows,error}=await db
      .from('winners')
      .select('position,draw_session,drawn_at,participants(full_name,contingent,phone)')
      .eq('draw_session',s)
      .order('position',{ascending:true});

    btn.disabled=false;
    btn.textContent=old;

    if(error){
      alert('Gagal menjana senarai: '+error.message);
      return;
    }

    const list=(rows||[]).map((x,i)=>({
      no:i+1,
      name:x.participants?.full_name||'-',
      contingent:x.participants?.contingent||'-',
      phone:x.participants?.phone||'-',
      drawn_at:x.drawn_at
    }));

    if(!list.length){
      alert(`Tiada pemenang untuk Sesi ${s}.`);
      return;
    }

    const escHtml=v=>String(v??'')
      .replaceAll('&','&amp;')
      .replaceAll('<','&lt;')
      .replaceAll('>','&gt;')
      .replaceAll('"','&quot;')
      .replaceAll("'","&#039;");

    const dt=list[0].drawn_at
      ?new Date(list[0].drawn_at).toLocaleString('ms-MY',{dateStyle:'long',timeStyle:'short'})
      :'-';

    const html=`<!doctype html>
<html lang="ms">
<head>
<meta charset="utf-8">
<title>Senarai Pemenang Sesi ${s} - SUKNA Selangor 2026</title>
<style>
  *{box-sizing:border-box}
  body{font-family:Arial,Helvetica,sans-serif;margin:0;background:#f5f5f5;color:#111}
  .page{width:min(980px,94vw);margin:24px auto;background:#fff;padding:34px 40px;border-radius:16px;box-shadow:0 10px 35px #0001}
  .head{text-align:center;border-bottom:3px solid #d5a900;padding-bottom:18px;margin-bottom:22px}
  .head h1{margin:0;font-size:28px}
  .head h2{margin:8px 0 0;color:#9a7500;font-size:20px}
  .meta{display:flex;justify-content:space-between;gap:16px;margin-bottom:18px;font-size:13px;color:#555}
  table{width:100%;border-collapse:collapse}
  th,td{border:1px solid #ddd;padding:11px;text-align:left}
  th{background:#161616;color:#ffd75a;font-size:12px;text-transform:uppercase}
  td:first-child,th:first-child{width:58px;text-align:center}
  td:nth-child(4),th:nth-child(4){white-space:nowrap}
  .foot{margin-top:22px;font-size:12px;color:#777;text-align:center}
  .printbar{text-align:center;margin:18px 0}
  button{padding:11px 18px;border:0;border-radius:10px;background:#111;color:#ffd75a;font-weight:800;cursor:pointer}
  @media print{body{background:#fff}.page{box-shadow:none;width:100%;margin:0;padding:10mm}.printbar{display:none}}
</style>
</head>
<body>
<div class="printbar"><button onclick="window.print()">Cetak / Save PDF</button></div>
<section class="page">
  <div class="head">
    <h1>SENARAI PEMENANG CABUTAN BERTUAH</h1>
    <h2>SUKNA SELANGOR 2026 • SESI ${s}</h2>
  </div>
  <div class="meta">
    <div><b>Jumlah Pemenang:</b> ${list.length}</div>
    <div><b>Masa Cabutan:</b> ${escHtml(dt)}</div>
  </div>
  <table>
    <thead><tr><th>No.</th><th>Nama Pemenang</th><th>Kontinjen</th><th>No. Telefon</th></tr></thead>
    <tbody>
      ${list.map(x=>`<tr><td>${x.no}</td><td>${escHtml(x.name)}</td><td>${escHtml(x.contingent)}</td><td>${escHtml(x.phone)}</td></tr>`).join('')}
    </tbody>
  </table>
  <div class="foot">Dijana daripada Sistem Cabutan Bertuah SUKNA Selangor 2026</div>
</section>
<script>setTimeout(()=>window.print(),350);</script>
</body>
</html>`;

    const w=window.open('','_blank');
    if(!w){
      alert('Popup disekat oleh browser. Benarkan popup untuk halaman Admin.');
      return;
    }
    w.document.open();
    w.document.write(html);
    w.document.close();
  });

  box.querySelectorAll('.delete-session').forEach(btn=>btn.onclick=async()=>{
    const s=Number(btn.dataset.session);
    if(!confirm(`Padam semua keputusan Sesi ${s}? Pemenang dalam sesi ini akan kembali layak untuk cabutan seterusnya.`))return;
    btn.disabled=true;
    btn.textContent='Memadam...';
    const{error}=await db.from('winners').delete().eq('draw_session',s);
    if(error){
      alert(error.message);
      btn.disabled=false;
      btn.textContent='Padam Sesi';
      return;
    }
    await loadAll();
    await renderSessionManager();
    alert(`Sesi ${s} telah dipadam.`);
  });
}
setTimeout(renderSessionManager,700);
setInterval(renderSessionManager,4000);
