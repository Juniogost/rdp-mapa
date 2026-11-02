/* Disponibilidade dos lotes — fonte unica: status.json (editado a cada repasse datado do Junio).
   Regra unificada 2D/3D (30/10): disponibilidade (vendido|reservado|livre|consultar) e INDEPENDENTE
   de tabela/preco (status tabela_out2026). Overrides mexem SO na disponibilidade (campo disp). */
window.RDPStatus = (function(){
  // disp (legado 2D + overrides) tem prioridade; depois status vendido/reservado; tabela => livre.
  function avail(l){
    if (!l) return null;
    const d = l.disp, s = l.status;
    if (d === 'vendido' || d === 'reservado' || d === 'livre') return d;
    if (s === 'vendido' || s === 'reservado') return s;
    if (s === 'tabela_out2026') return 'livre';
    if (s === 'consultar' || (s && s.indexOf('divergente') === 0)) return 'consultar';
    return null;
  }
  function temTabela(l){ return !!l && l.status === 'tabela_out2026'; }
  async function aplicar(url, data){
    let st = null;
    try { st = await (await fetch(url + (url.includes('?')?'&':'?') + 'v=2')).json(); } catch(e){ return null; }
    const ov = (st && st.overrides) || {};
    for (const f of Object.keys(ov)){
      if (!data[f] || !data[f].quadras) continue;
      for (const q of Object.keys(ov[f])){
        const qq = data[f].quadras[q]; if (!qq) continue;
        for (const l of Object.keys(ov[f][q])){
          if (!qq[l]) continue;
          const v = ov[f][q][l];
          if (v === 'livre' || v === 'reservado' || v === 'vendido') qq[l].disp = v;
        }
      }
    }
    return st;
  }
  function linha(st){
    if (!st || !st.atualizado_em) return '';
    return 'Disponibilidade atualizada em ' + st.atualizado_em + (st.fonte ? ' — ' + st.fonte : '') + '.';
  }
  return {aplicar, linha, avail, temTabela};
})();
