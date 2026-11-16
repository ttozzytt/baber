/* pwa.js: app principal. Vistas y lógica conservadas en el mismo orden de ejecución del proyecto original. */

/* ===== Contenido original de script.js ===== */
(() => {
  'use strict';
  const STORAGE_KEY = 'navaja27_reservas_v1';
  const $ = window.jQuery;
  if (!$) {
    const status = document.getElementById('catalogStatus');
    if (status) status.textContent = 'No se pudo iniciar la interfaz: falta cargar jQuery. Conéctate a Internet y vuelve a abrir la página.';
    return;
  }
  let catalog = [];
  let selectedFilter = 'todos';
  let filteredServices = [];
  let servicePage = 1;
  const pageSize = () => window.innerWidth <= 620 ? 4 : 6;
  let pendingReservation = null;
  let countdownTimer = null;
  let toastTimer = null;
  let secondsLeft = 30;
  const $grid = $('#serviceGrid');
  const $trendGrid = $('#trendGrid');
  const $modal = $('#bookingModal');

  function money(amount) { return `Bs ${Number(amount || 0).toLocaleString('es-BO')}`; }
  function safeText(value) { return String(value ?? ''); }
  function localDateString(date = new Date()) {
    const y = date.getFullYear(); const m = String(date.getMonth()+1).padStart(2,'0'); const d = String(date.getDate()).padStart(2,'0');
    return `${y}-${m}-${d}`;
  }
  function readReservations() {
    try { const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); return Array.isArray(parsed) ? parsed : []; }
    catch (error) { console.warn('No se pudo leer el historial local:', error); return []; }
  }
  function saveReservations(items) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(items)); return true; }
    catch (error) { showToast('El navegador no permitió guardar la reserva. Revisa el almacenamiento disponible.', true); return false; }
  }
  function showToast(message, error = false) {
    const $toast = $('#toast');
    $toast.stop(true,true).text(message).toggleClass('error', Boolean(error)).slideDown(180);
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => $toast.fadeOut(220), 3000);
  }
  function renderCards(items, keepPage = false) {
    filteredServices = items;
    const totalPages = Math.max(1, Math.ceil(items.length / pageSize()));
    if (!keepPage) servicePage = 1;
    servicePage = Math.min(Math.max(1, servicePage), totalPages);
    $grid.empty();
    if (!items.length) {
      $('<p>').addClass('empty-catalog').text('No encontramos servicios con ese filtro. Prueba otra búsqueda.').appendTo($grid);
    } else {
      items.slice((servicePage - 1) * pageSize(), servicePage * pageSize()).forEach(service => {
        const $card = $('<article>').addClass('service-card').attr('data-service-card', service.id);
        const $art = $('<div>').addClass('service-art');
        const $image = $('<img>').attr({src:service.image,alt:service.imageAlt || `Fotografía de referencia: ${service.name}`,loading:'lazy',decoding:'async',width:320,height:220});
        $image.on('error',function(){if(this.dataset.fallbackApplied==='true')return;this.dataset.fallbackApplied='true';this.src='./imagenes/corte.svg';this.classList.add('service-image-fallback');});
        $image.appendTo($art);
        $('<span>').addClass('service-tag').text(service.tag).appendTo($art);
        const $body = $('<div>').addClass('service-body');
        const $meta = $('<div>').addClass('service-meta');
        $('<span>').text(service.category.toUpperCase()).appendTo($meta);
        $('<span>').text(`${service.duration} MIN`).appendTo($meta);
        $body.append($meta);
        $('<h3>').text(service.name).appendTo($body);
        $('<p>').text(service.description).appendTo($body);
        if (service.photoUrl && service.photoCredit) $('<a>').addClass('service-photo-credit').attr({href:service.photoUrl,target:'_blank',rel:'noopener noreferrer'}).text(`Foto: ${service.photoCredit} · Pexels ↗`).appendTo($body);
        const $bottom = $('<div>').addClass('service-bottom');
        $('<strong>').addClass('service-price').text(money(service.price)).append($('<small>').text(' / servicio')).appendTo($bottom);
        $('<button>').addClass('service-select').attr({'type':'button','data-book-service':service.id}).text('Elegir ↗').appendTo($bottom);
        $body.append($bottom); $card.append($art,$body); $grid.append($card);
      });
    }
    const $pager=$('#servicePager').empty();
    if(items.length>pageSize()){
      $('<button type="button" class="pager-button">').text('← Anterior').prop('disabled',servicePage===1).attr('data-page','prev').appendTo($pager);
      $('<span>').text(`Página ${servicePage} de ${totalPages}`).appendTo($pager);
      $('<button type="button" class="pager-button">').text('Siguiente →').prop('disabled',servicePage===totalPages).attr('data-page','next').appendTo($pager);
      $pager.prop('hidden',false);
    } else $pager.prop('hidden',true);
  }
  function applyFilters() {
    const query = $('#serviceSearch').val().trim().toLocaleLowerCase('es-BO');
    servicePage = 1;
    const filtered = catalog.filter(service => {
      const categoryOK = selectedFilter === 'todos' || service.category === selectedFilter;
      const text = `${service.name} ${service.description} ${service.category}`.toLocaleLowerCase('es-BO');
      return categoryOK && text.includes(query);
    });
    renderCards(filtered);
    $('#catalogStatus').text(`${filtered.length} de ${catalog.length} servicios · ${filtered.length > pageSize() ? `página ${servicePage}/${Math.ceil(filtered.length/pageSize())}` : 'vista completa'}.`);
  }
  function renderTrends(items) {
    $trendGrid.empty();
    if (!items.length) {
      $('<p>').addClass('empty-catalog').text('No hay referencias de tendencias disponibles en este momento.').appendTo($trendGrid);
      return;
    }
    items.forEach(trend => {
      const $card = $('<article>').addClass('trend-card');
      const $art = $('<div>').addClass('trend-art');
      const $img = $('<img>').attr({src:trend.image,alt:trend.imageAlt || `Referencia visual de ${trend.name}`,loading:'lazy',decoding:'async',width:420,height:520});
      $img.on('error', function () {
        if (this.dataset.fallbackApplied === 'true') return;
        this.dataset.fallbackApplied = 'true';
        this.src = './imagenes/corte.svg';
        this.classList.add('trend-image-fallback');
      });
      $img.appendTo($art);
      $('<span>').addClass('trend-tag').text(trend.tag).appendTo($art);
      const $body = $('<div>').addClass('trend-body');
      $('<h3>').text(trend.name).appendTo($body);
      $('<p>').addClass('trend-description').text(trend.description).appendTo($body);
      const $facts = $('<div>').addClass('trend-facts');
      $('<span>').text(`Cabello: ${trend.hairType}`).appendTo($facts);
      $('<span>').text(`Mantenimiento: ${trend.maintenance}`).appendTo($facts);
      $facts.appendTo($body);
      const $credits = $('<div>').addClass('trend-credits');
      $('<a>').attr({href:trend.photoUrl,target:'_blank',rel:'noopener noreferrer'}).text(`Foto: ${trend.photoCredit} · Pexels`).appendTo($credits);
      $('<a>').attr({href:trend.trendSourceUrl,target:'_blank',rel:'noopener noreferrer'}).text(`Tendencia: ${trend.trendSource}`).appendTo($credits);
      $credits.appendTo($body);
      const $action = $('<button>').addClass('button button-dark trend-action').attr({'type':'button','data-trend-service':trend.bookingServiceId}).text(`Consultar como ${trend.bookingServiceName} ↗`);
      $action.appendTo($body);
      $card.append($art,$body);
      $trendGrid.append($card);
    });
  }
  function loadTrends() {
    fetch('./data/tendencias-2026.json').then(response => {
      if (!response.ok) throw new Error(`tendencias-2026.json respondió ${response.status}`);
      return response.json();
    }).then(items => {
      if (!Array.isArray(items)) throw new Error('La lista de tendencias no es válida.');
      renderTrends(items.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string' && typeof item.image === 'string'));
    }).catch(error => {
      console.error('No se pudieron cargar las tendencias:', error);
      $trendGrid.empty().append($('<p>').addClass('empty-catalog').text('No se pudieron cargar las referencias. Los servicios y las reservas siguen disponibles.'));
    });
  }

  window.addEventListener('resize', () => { if (catalog.length) applyFilters(); }, { passive:true });
  function loadCatalog() {
    fetch('./data/servicios.json').then(response => {
      if (!response.ok) throw new Error(`servicios.json respondió ${response.status}`);
      return response.json();
    }).then(items => {
      if (!Array.isArray(items)) throw new Error('El catálogo no contiene una lista válida.');
      catalog = items.filter(item => item && typeof item.id === 'string' && typeof item.name === 'string' && Number.isFinite(Number(item.price)));
      const select = document.getElementById('serviceSelect');
      select.replaceChildren(new Option('Selecciona un servicio',''));
      catalog.forEach(item => select.add(new Option(`${item.name} · ${money(item.price)}`, item.id)));
      applyFilters(); updateSummary();
      $('#catalogStatus').text(`Catálogo listo: ${catalog.length} servicios cargados desde JSON.`);
    }).catch(error => {
      console.error('Fallo al cargar el catálogo:', error);
      $grid.empty().append($('<p>').addClass('empty-catalog').text('No se pudo cargar el catálogo. Comprueba tu conexión y vuelve a intentar.'));
      $('#catalogStatus').text(`Error de catálogo: ${error.message}`);
    });
  }
  function selectedService() { return catalog.find(item => item.id === $('#serviceSelect').val()) || null; }
  function updateSummary() {
    const service = selectedService();
    $('#summaryName').text(service ? service.name : 'Elige un servicio');
    $('#summaryDuration').text(service ? `Duración estimada · ${service.duration} min` : 'Duración estimada · —');
    $('#summaryPrice').text(service ? money(service.price) : 'Bs 0');
    $('#summaryBarber').text($('#barberSelect').val() || 'Alex');
    const date = $('#bookingDate').val(); const time = $('#bookingTime').val();
    $('#summaryDate').text(date && time ? `${date.split('-').reverse().join('/')} · ${time}` : 'Por definir');
  }
  function showFieldError(id, message) { $(`#${id}`).text(message); }
  function validateForm() {
    const name = $('#clientName').val().trim();
    const phone = $('#clientPhone').val().replace(/\D/g,'');
    const service = selectedService();
    const date = $('#bookingDate').val();
    const time = $('#bookingTime').val();
    const validName = name.length >= 2 && name.length <= 60;
    const validPhone = /^\d{8}$/.test(phone);
    const validDate = Boolean(date && date >= localDateString());
    const validTime = Boolean(time);
    showFieldError('nameError', validName ? '' : 'Escribe un nombre de al menos 2 caracteres.');
    showFieldError('phoneError', validPhone ? '' : 'Ingresa un celular boliviano de 8 dígitos.');
    showFieldError('serviceError', service ? '' : 'Selecciona un servicio.');
    showFieldError('dateError', validDate ? '' : 'Selecciona hoy o una fecha futura.');
    showFieldError('timeError', validTime ? '' : 'Selecciona una hora disponible.');
    return validName && validPhone && validDate && validTime && Boolean(service);
  }
  function dateTimeToMs(date,time) { return new Date(`${date}T${time}:00`).getTime(); }
  function hasOverlap(candidate, existing) {
    if (candidate.barber !== existing.barber || candidate.date !== existing.date || existing.status === 'cancelada') return false;
    const aStart=dateTimeToMs(candidate.date,candidate.time), aEnd=aStart+candidate.duration*60000;
    const bStart=dateTimeToMs(existing.date,existing.time), bEnd=bStart+existing.duration*60000;
    return Number.isFinite(aStart) && Number.isFinite(bStart) && aStart < bEnd && aEnd > bStart;
  }
  function openModal(reservation) {
    pendingReservation = reservation; secondsLeft = 30; $('#countdown').text('00:30'); $('#modalExpiry').text('');
    $('#modalSummary').empty();
    const lines = [
      ['Cliente', reservation.name], ['Servicio', reservation.serviceName], ['Profesional', reservation.barber],
      ['Fecha', `${reservation.date.split('-').reverse().join('/')} · ${reservation.time}`],
      ['Duración', `${reservation.duration} minutos`], ['Total', money(reservation.price)]
    ];
    lines.forEach(([label,value]) => {
      const $line=$('<div>').addClass('modal-line');
      $('<span>').text(label).appendTo($line); $('<strong>').text(value).appendTo($line); $('#modalSummary').append($line);
    });
    $modal.addClass('open').attr('aria-hidden','false'); $('#confirmBooking').prop('disabled',false).text('Confirmar turno ✓');
    window.clearInterval(countdownTimer);
    countdownTimer = window.setInterval(() => {
      secondsLeft -= 1; $('#countdown').text(`00:${String(Math.max(0,secondsLeft)).padStart(2,'0')}`);
      if (secondsLeft <= 0) {
        closeModal(); $('#modalExpiry').text(''); showToast('El tiempo para confirmar terminó. Vuelve a revisar tu turno.',true);
      }
    },1000);
  }
  function closeModal() { window.clearInterval(countdownTimer); countdownTimer=null; pendingReservation=null; $modal.removeClass('open').attr('aria-hidden','true'); }
  function renderAppointments() {
    const items = readReservations(); const $list=$('#appointmentList').empty();
    const active=items.filter(item => item.status !== 'cancelada');
    $('#appointmentCount').text(`${active.length} ${active.length===1?'RESERVA':'RESERVAS'}`);
    if (!items.length) { $('<p>').addClass('empty-appointments').text('Todavía no tienes reservas. Cuando confirmes una, aparecerá aquí.').appendTo($list); return; }
    items.slice().reverse().forEach(item => {
      const $row=$('<article>').addClass('appointment-item'); const $info=$('<div>').addClass('appointment-info');
      $('<strong>').text(item.serviceName).appendTo($info);
      $('<p>').text(`${item.name} · ${item.barber} · ${item.date.split('-').reverse().join('/')} a las ${item.time} · ${item.duration} min · ${money(item.price)}`).appendTo($info);
      const $actions=$('<div>').addClass('appointment-actions');
      $('<span>').addClass('appointment-state').text(item.status === 'cancelada' ? 'CANCELADA' : 'SOLICITADA').appendTo($actions);
      if(item.status !== 'cancelada') $('<button>').addClass('cancel-appointment').attr({'type':'button','data-cancel-id':item.id}).text('Cancelar').appendTo($actions);
      $row.append($info,$actions); $list.append($row);
    });
  }
  function confirmPending() {
    if (!pendingReservation) return;
    const items=readReservations();
    if (items.some(item => hasOverlap(pendingReservation,item))) {
      closeModal(); showToast('Ese profesional ya tiene una reserva que se cruza con ese horario.',true); return;
    }
    pendingReservation.id=`N27-${Date.now()}`; pendingReservation.status='solicitada'; pendingReservation.createdAt=new Date().toISOString();
    items.push(pendingReservation);
    if (!saveReservations(items)) return;
    closeModal(); renderAppointments(); showToast('Reserva guardada en este dispositivo. Contacta al local para confirmar la atención.');
    $('#bookingForm')[0].reset(); updateSummary(); if(window.appShowView)window.appShowView('turnos');else location.hash='turnos';
  }
  function initEvents() {
    // Nombres de eventos por namespace y .off() previo: evita listeners duplicados.
    $(document).off('.navaja27');
    $(document).on('click.navaja27','#servicePager [data-page]',function(){
      servicePage += this.dataset.page==='next' ? 1 : -1;
      renderCards(filteredServices,true);
      $('#serviceGrid').closest('.app-view').scrollTop(0);
    });
    $(document).on('click.navaja27','.filter-tab',function(){
      $('.filter-tab').removeClass('active'); $(this).addClass('active'); selectedFilter=this.dataset.filter; applyFilters();
    });
    $(document).on('keyup.navaja27 input.navaja27','#serviceSearch',applyFilters);
    $(document).on('click.navaja27','[data-book-service]',function(){
      $('#serviceSelect').val(this.dataset.bookService).trigger('change'); window.appShowView ? window.appShowView('reservar') : document.getElementById('reservar').scrollIntoView({behavior:'smooth'});
    });
    $(document).on('click.navaja27','[data-trend-service]',function(){
      const serviceId=this.dataset.trendService;
      if (!catalog.some(item => item.id === serviceId)) { showToast('Ese servicio no está disponible en el catálogo.',true); return; }
      $('#serviceSelect').val(serviceId).trigger('change');
      window.appShowView ? window.appShowView('reservar') : document.getElementById('reservar').scrollIntoView({behavior:'smooth'});
    });
    $(document).on('change.navaja27','#serviceSelect, #barberSelect, #bookingDate, #bookingTime',updateSummary);
    $(document).on('input.navaja27','#clientPhone',function(){ this.value=this.value.replace(/\D/g,'').slice(0,8); });
    $(document).on('submit.navaja27','#bookingForm',function(event){
      event.preventDefault(); if(!validateForm()) return;
      const service=selectedService();
      const candidate={name:$('#clientName').val().trim(),phone:$('#clientPhone').val(),serviceId:service.id,serviceName:service.name,barber:$('#barberSelect').val(),date:$('#bookingDate').val(),time:$('#bookingTime').val(),duration:Number(service.duration),price:Number(service.price)};
      const existing=readReservations();
      if(existing.some(item=>hasOverlap(candidate,item))){ showToast('Horario no disponible: selecciona otro turno para este profesional.',true); return; }
      if(dateTimeToMs(candidate.date,candidate.time) < Date.now()){ showToast('La hora elegida ya pasó. Selecciona otro horario.',true); return; }
      openModal(candidate);
    });
    $(document).on('click.navaja27','#confirmBooking',confirmPending);
    $(document).on('click.navaja27','#cancelModal, #modalClose',closeModal);
    $(document).on('click.navaja27','#bookingModal',function(event){if(event.target===this)closeModal();});
    $(document).on('click.navaja27','[data-cancel-id]',function(){
      const id=this.dataset.cancelId; const items=readReservations(); const item=items.find(entry=>entry.id===id);
      if(!item || !window.confirm('¿Cancelar esta solicitud de reserva?')) return;
      item.status='cancelada'; if(saveReservations(items)){renderAppointments();showToast('La solicitud quedó cancelada.');}
    });
    $(document).on('click.navaja27','#detailsToggle',function(){
      const expanded=$(this).attr('aria-expanded')==='true'; $(this).attr('aria-expanded',String(!expanded)); $(this).find('b').text(expanded?'＋':'−'); $('#serviceDetails').stop(true,true).slideToggle(220);
    });
    $(document).on('click.navaja27','#themeToggle',function(){
      $('body').toggleClass('dark-theme'); const dark=$('body').hasClass('dark-theme'); localStorage.setItem('navaja27_theme',dark?'dark':'light'); $(this).text(dark?'☀':'◐');
    });
    $(document).on('click.navaja27','#mobileMenuToggle',function(){const open=$('#mobileNav').toggleClass('open').hasClass('open');$(this).attr({'aria-expanded':String(open),'aria-label':open?'Cerrar menú':'Abrir menú'}).text(open?'×':'☰');});
    $(document).on('click.navaja27','#mobileNav a',function(){$('#mobileNav').removeClass('open');$('#mobileMenuToggle').attr('aria-expanded','false').text('☰');});
    $(document).on('keydown.navaja27',function(event){if(event.key==='Escape' && $modal.hasClass('open'))closeModal();});
  }
  function bindPhotoFallbacks() {
    const pairs = [['.hero-art-frame img','./imagenes/hero-chair.svg'],['.brow-feature-grid article:nth-child(1) img','./imagenes/barba.svg'],['.brow-feature-grid article:nth-child(2) img','./imagenes/corte.svg']];
    pairs.forEach(([selector,fallback]) => { const img=document.querySelector(selector); if(img){ const useFallback=()=>{ if(img.dataset.fallbackApplied==='true')return; img.dataset.fallbackApplied='true'; img.src=fallback; img.classList.add('service-image-fallback'); }; img.addEventListener('error',useFallback,{once:true}); if(img.complete&&img.naturalWidth===0)useFallback(); } });
  }
  function init() {
    bindPhotoFallbacks();
    $('#bookingDate').attr('min',localDateString());
    if($('#bookingDate').val()==='') $('#bookingDate').val(localDateString());
    try { if(localStorage.getItem('navaja27_theme')==='dark'){$('body').addClass('dark-theme');$('#themeToggle').text('☀');} } catch(_){/* almacenamiento opcional */}
    initEvents(); renderAppointments(); loadCatalog(); loadTrends();
    updateSummary();
    if('serviceWorker' in navigator && location.protocol==='https:') navigator.serviceWorker.register('./sw.js').catch(error=>console.error('Registro del Service Worker:',error));
    checkNetwork(); window.addEventListener('online',checkNetwork); window.addEventListener('offline',checkNetwork);
    setupKeyboardViewport();
  }
  function setupKeyboardViewport() {
    const viewport = window.visualViewport;
    if (!viewport) return;
    const editingSelector = 'input, textarea, select';
    const update = () => {
      const editing = document.activeElement && document.activeElement.matches(editingSelector);
      const reducedHeight = window.innerHeight - viewport.height;
      document.body.classList.toggle('keyboard-open', Boolean(editing && reducedHeight > 110));
    };
    const cleanup = () => {
      viewport.removeEventListener('resize', update);
      viewport.removeEventListener('scroll', update);
      document.removeEventListener('focusin', update);
      document.removeEventListener('focusout', update);
    };
    viewport.addEventListener('resize', update);
    viewport.addEventListener('scroll', update);
    document.addEventListener('focusin', update);
    document.addEventListener('focusout', update);
    window.addEventListener('pagehide', cleanup, { once:true });
    update();
  }
  let networkRevision = 0;
  async function checkNetwork() {
    const revision = ++networkRevision;
    const $status = $('#networkStatus');
    $status.attr('data-state','checking'); $status.find('b').text('Comprobando...');
    if (!navigator.onLine) {
      if (revision === networkRevision) { $status.attr('data-state','offline'); $status.find('b').text('Offline'); }
      return;
    }
    try {
      const response = await fetch(`./manifest.json?__n27_health=${Date.now()}`, { cache:'no-store', credentials:'same-origin' });
      const online = response.ok;
      if (revision === networkRevision) { $status.attr('data-state',online?'online':'offline'); $status.find('b').text(online?'Online':'Offline'); }
    } catch (_) {
      if (revision === networkRevision) { $status.attr('data-state','offline'); $status.find('b').text('Offline'); }
    }
  }
  $(init);
})();


/* ===== Contenido original de views.js ===== */
(() => {
  'use strict';
  const main=document.querySelector('main.app-views');
  if(!main)return;
  const views=Array.from(main.querySelectorAll(':scope > .app-view'));
  function findView(hash){const id=String(hash||'').replace(/^#/,'');if(!id)return views[0];const target=document.getElementById(id);return target?.closest('.app-view')||views.find(v=>v.id===`view-${id}`)||null;}
  function showView(target){const view=typeof target==='string'?findView(target):target;if(!view||!views.includes(view))return;
    views.forEach(v=>{const active=v===view;v.classList.toggle('active',active);v.setAttribute('aria-hidden',String(!active));});
    const label=view.dataset.viewName||view.id.replace('view-','');
    document.querySelectorAll('.main-nav a,.mobile-nav a').forEach(a=>{const targetView=findView(a.getAttribute('href'));a.classList.toggle('active',targetView===view);if(targetView===view)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    view.scrollTop=0;
    const anchor=label==='inicio'?'inicio':(view.querySelector('[id]')?.id||label);
    if(location.hash!==`#${anchor}`)history.replaceState(null,'',`#${anchor}`);
    document.dispatchEvent(new CustomEvent('appviewchange',{detail:{name:label}}));
  }
  document.addEventListener('click',event=>{const link=event.target.closest('a[href^="#"]');if(!link)return;const view=findView(link.getAttribute('href'));if(!view)return;event.preventDefault();showView(view);},{capture:true});
  window.addEventListener('hashchange',()=>{const view=findView(location.hash);if(view)showView(view)});
  window.appShowView=(name)=>showView(name);
  const initial=findView(location.hash);showView(initial||views[0]);
})();

