(function () {
  'use strict';

  var A = INBLUE.api;
  var U = INBLUE.util;
  var rows = [];
  var filter = 'all';
  var query = '';
  var current = null;
  var lastCount = -1;
  var loading = false;
  var authenticated = false;
  var PASSWORD_KEY = 'inblue_admin_password';
  var $ = function (id) { return document.getElementById(id); };

  document.body.classList.add('is-locked');

  function tick() {
    var d = new Date();
    var p = function (n) { return String(n).padStart(2, '0'); };
    var wd = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
    $('clock').textContent = d.getFullYear() + '. ' + p(d.getMonth() + 1) + '. ' + p(d.getDate()) + ' (' + wd + ') ' + p(d.getHours()) + ':' + p(d.getMinutes());
  }

  function matches(row) {
    if (filter === 'new' && row.status !== 'new') return false;
    if (filter === 'done' && row.status !== 'done') return false;
    if (filter === 'jangan' && row.branch !== '장안점') return false;
    if (filter === 'seongnae' && row.branch !== '성내점') return false;
    if (query) {
      var needle = query.replace(/\s/g, '').toLowerCase();
      var haystack = (row.name + row.phone + (row.phoneTail || '')).replace(/[\s-]/g, '').toLowerCase();
      if (haystack.indexOf(needle) === -1) return false;
    }
    return true;
  }

  function render() {
    var today = rows.filter(function (row) { return U.isToday(row.createdAt); });
    var news = rows.filter(function (row) { return row.status === 'new'; });
    var dones = rows.filter(function (row) { return row.status === 'done'; });

    $('stToday').textContent = today.length;
    $('stNew').textContent = news.length;
    $('stDone').textContent = dones.length;
    $('stAll').textContent = rows.length;
    $('cAll').textContent = rows.length;
    $('cNew').textContent = news.length;
    $('cDone').textContent = dones.length;
    $('cJ').textContent = rows.filter(function (row) { return row.branch === '장안점'; }).length;
    $('cS').textContent = rows.filter(function (row) { return row.branch === '성내점'; }).length;

    $('badge').textContent = U.badge(today.length);
    $('badge').classList.toggle('is-on', today.length > 0);

    if (!today.length) {
      $('dropList').innerHTML = '<div class="drop__empty">오늘 접수된 문의가 없습니다.</div>';
    } else {
      $('dropList').innerHTML = today.map(function (row) {
        return '<div class="drop__i ' + (row.read ? '' : 'is-new') + '" data-go="' + row.id + '">' +
          '<span class="drop__dot"></span><div><b>' + U.esc(row.name) + ' · ' + row.age + '세</b>' +
          '<span>' + U.esc(row.branch) + ' · ' + U.esc(row.phone) + '</span></div>' +
          '<time>' + U.dt(row.createdAt).slice(-5) + '</time></div>';
      }).join('');
    }

    var visible = rows.filter(matches);
    $('empty').style.display = visible.length ? 'none' : 'block';
    $('tbody').innerHTML = visible.map(function (row) {
      return '<tr class="' + (row.status === 'new' ? 'is-new' : '') + '" data-id="' + row.id + '">' +
        '<td class="td-time">' + U.dt(row.createdAt) + '</td>' +
        '<td class="td-name">' + (row.status === 'new' ? '<i></i>' : '') + U.esc(row.name) + '</td>' +
        '<td><a class="td-tel" href="tel:' + row.phone.replace(/-/g, '') + '" onclick="event.stopPropagation()">' + U.esc(row.phone) + '</a></td>' +
        '<td>' + row.age + '세</td>' +
        '<td><span class="pill ' + (row.branch === '장안점' ? 'pill--j' : 'pill--s') + '">' + U.esc(row.branch) + '</span></td>' +
        '<td>' + (U.esc(row.interest) || '<span style="color:var(--gray-light)">—</span>') + '</td>' +
        '<td class="td-time">' + U.esc(row.time || '아무 때나') + '</td>' +
        '<td><span class="pill ' + (row.status === 'new' ? 'pill--new' : 'pill--done') + '">' + (row.status === 'new' ? '신규' : '완료') + '</span></td>' +
        '<td><div class="rowacts"><button class="iconbtn" data-act="toggle" data-id="' + row.id + '" title="상태 변경">' +
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M20 6 9 17l-5-5"/></svg></button>' +
        '<button class="iconbtn is-del" data-act="del" data-id="' + row.id + '" title="삭제">' +
        '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6"><path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14"/></svg></button></div></td></tr>';
    }).join('');

    if (lastCount !== -1 && rows.length > lastCount) {
      $('bell').classList.add('is-ring');
      setTimeout(function () { $('bell').classList.remove('is-ring'); }, 2100);
      toast('새로운 상담 문의가 접수되었습니다');
    }
    lastCount = rows.length;
  }

  var toastTimer;
  function toast(message) {
    $('toastMsg').textContent = message;
    $('toast').classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $('toast').classList.remove('is-on'); }, 3200);
  }

  function showError(error) {
    if (error && error.status === 401) {
      logout('세션이 만료되었습니다. 다시 로그인해 주세요.');
      return;
    }
    toast((error && error.message) || '요청을 처리하지 못했습니다.');
  }

  function rowById(id) {
    return rows.filter(function (row) { return row.id === id; })[0];
  }

  async function refresh(silent) {
    if (!authenticated || loading) return;
    loading = true;
    try {
      rows = await A.all();
      render();
    } catch (error) {
      if (!silent) showError(error);
    } finally {
      loading = false;
    }
  }

  async function updateRow(id, patch) {
    var updated = await A.update(id, patch);
    rows = rows.map(function (row) { return row.id === id ? updated : row; });
    if (current && current.id === id) current = updated;
    render();
    return updated;
  }

  async function openDetail(id) {
    var row = rowById(id);
    if (!row) return;
    current = row;
    if (!row.read) {
      try { row = await updateRow(id, { read: true }); } catch (error) { showError(error); }
    }

    $('dName').textContent = row.name + ' (' + row.age + '세)';
    $('dId').textContent = row.id;
    $('dTime').textContent = U.dt(row.createdAt);
    $('dTel').textContent = row.phone;
    $('dTel').href = 'tel:' + row.phone.replace(/-/g, '');
    $('dAge').textContent = row.age + '세';
    $('dBranch').textContent = row.branch;
    $('dInterest').textContent = row.interest || '선택 안 함';
    $('dCall').textContent = row.time || '아무 때나';
    $('dMemo').textContent = row.memo || '남긴 내용이 없습니다.';
    $('dCallBtn').href = 'tel:' + row.phone.replace(/-/g, '');
    $('dToggle').querySelector('span').textContent = row.status === 'new' ? '상담 완료로 표시' : '신규로 되돌리기';
    $('det').classList.add('is-on');
    $('mask').classList.add('is-on');
  }

  function closeDetail() {
    $('det').classList.remove('is-on');
    $('mask').classList.remove('is-on');
    current = null;
  }

  async function login(password) {
    A.setPassword(password);
    $('authError').textContent = '';
    var button = $('authForm').querySelector('button[type="submit"]');
    button.disabled = true;
    button.querySelector('span').textContent = '확인 중입니다';
    try {
      rows = await A.all();
      authenticated = true;
      sessionStorage.setItem(PASSWORD_KEY, password);
      document.body.classList.remove('is-locked');
      $('adminPassword').value = '';
      lastCount = rows.length;
      render();
    } catch (error) {
      A.setPassword('');
      sessionStorage.removeItem(PASSWORD_KEY);
      $('authError').textContent = error.status === 401 ? '비밀번호가 올바르지 않습니다.' : error.message;
      $('adminPassword').focus();
    } finally {
      button.disabled = false;
      button.querySelector('span').textContent = '상담 관리 열기';
    }
  }

  function logout(message) {
    authenticated = false;
    rows = [];
    current = null;
    lastCount = -1;
    A.setPassword('');
    sessionStorage.removeItem(PASSWORD_KEY);
    closeDetail();
    document.body.classList.add('is-locked');
    $('authError').textContent = message || '';
    setTimeout(function () { $('adminPassword').focus(); }, 50);
  }

  $('authForm').addEventListener('submit', function (event) {
    event.preventDefault();
    login($('adminPassword').value);
  });
  $('logoutBtn').addEventListener('click', function () { logout('안전하게 로그아웃되었습니다.'); });

  function openPasswordModal() {
    $('pwForm').reset();
    $('pwError').textContent = '';
    $('pwModal').classList.add('is-on');
    setTimeout(function () { $('pwCurrent').focus(); }, 50);
  }
  function closePasswordModal() {
    $('pwModal').classList.remove('is-on');
    $('pwForm').reset();
  }
  $('pwBtn').addEventListener('click', openPasswordModal);
  $('pwCancel').addEventListener('click', closePasswordModal);
  $('pwModal').addEventListener('click', function (event) { if (event.target === $('pwModal')) closePasswordModal(); });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && $('pwModal').classList.contains('is-on')) closePasswordModal();
  });
  $('pwForm').addEventListener('submit', async function (event) {
    event.preventDefault();
    var current = $('pwCurrent').value;
    var next = $('pwNext').value;
    var confirmNext = $('pwConfirm').value;
    if (next !== confirmNext) {
      $('pwError').textContent = '새 비밀번호 확인이 일치하지 않습니다.';
      $('pwConfirm').focus();
      return;
    }
    var button = $('pwForm').querySelector('button[type="submit"]');
    button.disabled = true;
    button.querySelector('span').textContent = '변경 중입니다';
    $('pwError').textContent = '';
    try {
      var response = await fetch('/api/admin-password', {
        method: 'POST',
        headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
        body: JSON.stringify({ current: current, next: next, confirm: confirmNext }),
        credentials: 'same-origin'
      });
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok) throw new Error(data.error || '비밀번호를 바꾸지 못했습니다.');
      A.setPassword(next);
      sessionStorage.setItem(PASSWORD_KEY, next);
      closePasswordModal();
      toast('관리자 비밀번호를 변경했습니다');
    } catch (error) {
      $('pwError').textContent = error.message;
    } finally {
      button.disabled = false;
      button.querySelector('span').textContent = '변경하기';
    }
  });
  $('bell').addEventListener('click', function (event) { event.stopPropagation(); $('drop').classList.toggle('is-on'); });
  document.addEventListener('click', function (event) { if (!$('drop').contains(event.target)) $('drop').classList.remove('is-on'); });
  $('drop').addEventListener('click', function (event) {
    var item = event.target.closest('[data-go]');
    if (!item) return;
    $('drop').classList.remove('is-on');
    openDetail(item.getAttribute('data-go'));
  });

  $('markAll').addEventListener('click', async function (event) {
    event.stopPropagation();
    try {
      await Promise.all(rows.filter(function (row) { return !row.read; }).map(function (row) { return A.update(row.id, { read: true }); }));
      await refresh(true);
      toast('오늘 문의를 모두 읽음 처리했습니다');
    } catch (error) { showError(error); }
  });

  $('tbody').addEventListener('click', async function (event) {
    var action = event.target.closest('[data-act]');
    if (action) {
      event.stopPropagation();
      var id = action.getAttribute('data-id');
      var row = rowById(id);
      if (!row) return;
      try {
        if (action.getAttribute('data-act') === 'toggle') {
          var next = row.status === 'new' ? 'done' : 'new';
          await updateRow(id, { status: next, read: true });
          toast(next === 'done' ? '상담 완료로 변경했습니다' : '신규로 되돌렸습니다');
        } else {
          if (!confirm('이 문의를 삭제할까요? 되돌릴 수 없습니다.')) return;
          await A.remove(id);
          rows = rows.filter(function (item) { return item.id !== id; });
          if (current && current.id === id) closeDetail();
          render();
          toast('문의를 삭제했습니다');
        }
      } catch (error) { showError(error); }
      return;
    }
    var tableRow = event.target.closest('tr[data-id]');
    if (tableRow) openDetail(tableRow.getAttribute('data-id'));
  });

  $('chips').addEventListener('click', function (event) {
    var chip = event.target.closest('.chip');
    if (!chip) return;
    filter = chip.getAttribute('data-f');
    document.querySelectorAll('.chip').forEach(function (item) { item.classList.toggle('is-on', item === chip); });
    render();
  });
  $('q').addEventListener('input', function () { query = this.value.trim(); render(); });
  $('dClose').addEventListener('click', closeDetail);
  $('mask').addEventListener('click', closeDetail);
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape') closeDetail(); });

  $('dToggle').addEventListener('click', async function () {
    if (!current) return;
    try {
      var next = current.status === 'new' ? 'done' : 'new';
      await updateRow(current.id, { status: next, read: true });
      toast(next === 'done' ? '상담 완료로 변경했습니다' : '신규로 되돌렸습니다');
      openDetail(current.id);
    } catch (error) { showError(error); }
  });
  $('dDel').addEventListener('click', async function () {
    if (!current || !confirm('이 문의를 삭제할까요? 되돌릴 수 없습니다.')) return;
    try {
      var id = current.id;
      await A.remove(id);
      rows = rows.filter(function (row) { return row.id !== id; });
      closeDetail();
      render();
      toast('문의를 삭제했습니다');
    } catch (error) { showError(error); }
  });

  $('csvBtn').addEventListener('click', function () {
    if (!rows.length) { toast('내려받을 문의가 없습니다'); return; }
    var head = ['접수번호', '접수일시', '이름', '전화번호', '나이', '지점', '관심프로그램', '통화가능', '문의내용', '상태'];
    var body = rows.map(function (row) {
      return [row.id, U.dt(row.createdAt), row.name, row.phone, row.age, row.branch, row.interest || '', row.time || '', (row.memo || '').replace(/\n/g, ' '), row.status === 'new' ? '신규' : '완료'];
    });
    var csv = [head].concat(body).map(function (line) {
      return line.map(function (cell) { return '"' + String(cell).replace(/"/g, '""') + '"'; }).join(',');
    }).join('\r\n');
    var blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
    var link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'inblue-inquiries-' + new Date().toISOString().slice(0, 10) + '.csv';
    link.click();
    URL.revokeObjectURL(link.href);
    toast('CSV 파일을 내려받았습니다');
  });

  tick();
  setInterval(tick, 20000);
  setInterval(function () { refresh(true); }, 5000);
  var savedPassword = sessionStorage.getItem(PASSWORD_KEY);
  if (savedPassword) login(savedPassword); else setTimeout(function () { $('adminPassword').focus(); }, 50);
})();
