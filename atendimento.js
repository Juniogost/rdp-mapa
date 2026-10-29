/* Atendimento guiado Reserva do Parque — sem IA, sem custo. Botões levam ao WhatsApp com texto pronto. */
(function(){
  const ZAP = '5562982165619';
  const css = `
  #atdBtn{position:fixed;right:12px;bottom:12px;z-index:2100;background:#25d366;color:#fff;border:0;border-radius:999px;padding:12px 16px;font:700 14px system-ui;box-shadow:0 3px 10px rgba(0,0,0,.3);cursor:pointer}
  #atdPanel{position:fixed;right:12px;bottom:64px;z-index:2100;width:300px;max-width:calc(100vw - 24px);background:#fff;border-radius:12px;box-shadow:0 6px 24px rgba(0,0,0,.35);font:14px system-ui;overflow:hidden;display:none}
  #atdPanel.ab{display:block}
  #atdPanel .hd{background:#075e54;color:#fff;padding:10px 12px;font-weight:700;display:flex;justify-content:space-between;align-items:center}
  #atdPanel .hd button{background:none;border:0;color:#fff;font-size:16px;cursor:pointer}
  #atdPanel .bd{padding:10px 12px;max-height:55vh;overflow:auto}
  #atdPanel .msg{background:#f1f5f9;border-radius:8px;padding:8px 10px;margin-bottom:8px;font-size:13px}
  #atdPanel .opt{display:block;width:100%;text-align:left;background:#fff;border:1px solid #0a6b3d;color:#0a6b3d;border-radius:8px;padding:9px 10px;margin:5px 0;font:600 13px system-ui;cursor:pointer}
  #atdPanel .opt:hover{background:#f0fdf4}
  #atdPanel .zap{display:block;text-align:center;background:#25d366;color:#fff;text-decoration:none;border-radius:8px;padding:11px;font:700 14px system-ui;margin:8px 0}
  @media (max-width:640px){
    #atdBtn{bottom:calc(52px + env(safe-area-inset-bottom,0px))}
    #atdPanel{bottom:calc(104px + env(safe-area-inset-bottom,0px))}
  }`;
  const st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);
  const FASES = ['Jardim dos Jacarandás','Jardim dos Angicos','Jardim das Aroeiras','Ainda não sei / qualquer uma'];
  function wa(txt){ return 'https://wa.me/' + ZAP + '?text=' + encodeURIComponent(txt); }
  function el(html){ const d = document.createElement('div'); d.innerHTML = html; return d.firstElementChild; }
  const btn = el('<button id="atdBtn" aria-label="Atendimento">💬 Atendimento</button>');
  const panel = el('<div id="atdPanel" role="dialog" aria-label="Atendimento Reserva do Parque"><div class="hd">Atendimento — Reserva do Parque <button id="atdX" aria-label="Fechar">✕</button></div><div class="bd" id="atdBd"></div></div>');
  document.body.appendChild(btn); document.body.appendChild(panel);
  const bd = panel.querySelector('#atdBd');
  function home(){
    bd.innerHTML = '';
    bd.appendChild(el('<div class="msg">Olá! Sou o atendimento automático do mapa. Escolha uma opção que eu te levo direto para o assunto certo no WhatsApp:</div>'));
    const ops = [
      ['🏡 Quero comprar um lote', () => fase()],
      ['💰 Valores e formas de pagamento', () => final('Olá! Quero saber os valores e as formas de pagamento dos lotes do Reserva do Parque (tabela outubro/2026).')],
      ['📍 Agendar uma visita ao bairro', () => final('Olá! Quero agendar uma visita ao Reserva do Parque em Senador Canedo.')],
      ['👤 Falar com um corretor', () => final('Olá! Quero falar com um corretor sobre o Reserva do Parque.')]
    ];
    ops.forEach(function(o){ const b = el('<button class="opt">' + o[0] + '</button>'); b.onclick = o[1]; bd.appendChild(b); });
  }
  function fase(){
    bd.innerHTML = '';
    bd.appendChild(el('<div class="msg">Ótimo! Tem preferência de fase?</div>'));
    FASES.forEach(function(f){
      const b = el('<button class="opt">' + f + '</button>');
      b.onclick = function(){ final('Olá! Quero comprar um lote no Reserva do Parque — fase: ' + f + '. Pode me passar as opções disponíveis?'); };
      bd.appendChild(b);
    });
    const v = el('<button class="opt">⬅ Voltar</button>'); v.onclick = home; bd.appendChild(v);
  }
  function final(txt){
    bd.innerHTML = '';
    bd.appendChild(el('<div class="msg">Pronto! Toque no botão abaixo: o WhatsApp abre com a mensagem pronta para a equipe. É só enviar.</div>'));
    bd.appendChild(el('<div class="msg" style="background:#fef9c3;border:1px solid #eab308">"' + txt + '"</div>'));
    const a = el('<a class="zap" target="_blank" rel="noopener" href="' + wa(txt) + '">Abrir WhatsApp</a>');
    bd.appendChild(a);
    const v = el('<button class="opt">⬅ Voltar ao início</button>'); v.onclick = home; bd.appendChild(v);
  }
  btn.onclick = function(){ panel.classList.toggle('ab'); if (panel.classList.contains('ab')) home(); };
  panel.querySelector('#atdX').onclick = function(){ panel.classList.remove('ab'); };
})();
