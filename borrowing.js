// =====================================================
// Borrowing, Return, and History
// Needs app.js to be loaded first (uses db, $, escapeHtml, currentProfile)
// =====================================================

// ---------- Date helpers (local time, so Philippine dates stay correct) ----------

function toDateStr(d) {
  return d.getFullYear() + '-' +
    String(d.getMonth() + 1).padStart(2, '0') + '-' +
    String(d.getDate()).padStart(2, '0');
}

function todayStr() {
  return toDateStr(new Date());
}

function addDays(dateStr, days) {
  const d = new Date(dateStr + 'T00:00:00');
  d.setDate(d.getDate() + days);
  return toDateStr(d);
}

// 2026-11-05 -> 11/05/2026 (same style as your design)
function fmtDate(dateStr) {
  if (!dateStr) return '--';
  const [y, m, d] = dateStr.split('-');
  return m + '/' + d + '/' + y;
}

function displayStatus(record) {
  if (record.status === 'Borrowed' && record.due_date < todayStr()) return 'Overdue';
  return record.status;
}

function setBorrowMessage(text, isError = true) {
  const el = $('borrow-message');
  el.textContent = text;
  el.style.color = isError ? 'crimson' : 'green';
}

function isStaff() {
  return currentProfile && ['librarian', 'admin'].includes(currentProfile.role);
}

// ---------- Tables ----------

async function loadBorrowings() {
  const { data, error } = await db
    .from('borrowings')
    .select('*, books(book_code, title), profiles(full_name)')
    .order('id', { ascending: false })
    .limit(50);

  const body = $('borrow-table-body');
  if (error) {
    body.innerHTML = '<tr><td colspan="6">Could not load borrowing records.</td></tr>';
    return;
  }
  if (!data.length) {
    body.innerHTML = '<tr><td colspan="6">No borrowing records yet.</td></tr>';
    return;
  }

  body.innerHTML = data.map((r) => `
    <tr>
      <td>${escapeHtml(r.books ? r.books.book_code : '')}</td>
      <td>${escapeHtml(r.books ? r.books.title : '')}</td>
      <td>${escapeHtml(r.profiles ? r.profiles.full_name : '')}</td>
      <td>${fmtDate(r.borrow_date)}</td>
      <td>${fmtDate(r.due_date)}</td>
      <td>${displayStatus(r)}</td>
    </tr>
  `).join('');
}

async function loadHistory() {
  if (!currentProfile) return;

  $('hist-name').textContent = currentProfile.full_name;
  $('hist-studentid').textContent = currentProfile.student_id || '--';

  const { data, error } = await db
    .from('borrowings')
    .select('*, books(book_code, title)')
    .eq('user_id', currentProfile.id)
    .order('id', { ascending: false });

  const body = $('hist-table-body');
  if (error) {
    body.innerHTML = '<tr><td colspan="5">Could not load your history.</td></tr>';
    return;
  }

  $('hist-total').textContent = data.length + (data.length === 1 ? ' Book' : ' Books');

  if (!data.length) {
    body.innerHTML = '<tr><td colspan="5">You have not borrowed any books yet.</td></tr>';
    return;
  }

  body.innerHTML = data.map((r) => `
    <tr>
      <td>${escapeHtml(r.books ? r.books.book_code : '')}</td>
      <td>${escapeHtml(r.books ? r.books.title : '')}</td>
      <td>${fmtDate(r.borrow_date)}</td>
      <td>${fmtDate(r.return_date)}</td>
      <td>${displayStatus(r)}</td>
    </tr>
  `).join('');
}

// Called by app.js after login and on start-up
async function refreshBorrowingViews() {
  if (!currentProfile) return;
  // Only staff see the Borrow/Return form
  $('borrow-form').style.display = isStaff() ? 'block' : 'none';
  await Promise.all([loadBorrowings(), loadHistory()]);
}

// ---------- Borrow / Return actions (staff only) ----------

async function findBookByCode(code) {
  const { data } = await db.from('books').select('*').eq('book_code', code).maybeSingle();
  return data;
}

async function fillBookTitle() {
  const code = $('borrow-bookid').value.trim().toUpperCase();
  if (!code) { $('borrow-title').value = ''; return; }
  const book = await findBookByCode(code);
  $('borrow-title').value = book ? book.title : '';
}

async function borrowBook() {
  setBorrowMessage('');
  const code = $('borrow-bookid').value.trim().toUpperCase();
  const studentId = $('borrow-studentid').value.trim();
  const date = $('borrow-date').value || todayStr();

  if (!code || !studentId) { setBorrowMessage('Enter both the Book ID and the Student ID.'); return; }

  const book = await findBookByCode(code);
  if (!book) { setBorrowMessage('No book found with ID ' + code + '.'); return; }
  if (!book.available) { setBorrowMessage('That book is already borrowed.'); return; }

  const { data: students } = await db
    .from('profiles').select('id, full_name').eq('student_id', studentId).limit(1);
  if (!students || !students.length) { setBorrowMessage('No student found with ID ' + studentId + '.'); return; }
  const student = students[0];

  const dueDate = addDays(date, 14);

  const { error: insertError } = await db.from('borrowings').insert({
    book_id: book.id,
    user_id: student.id,
    borrow_date: date,
    due_date: dueDate
  });
  if (insertError) { setBorrowMessage('Could not save the borrowing: ' + insertError.message); return; }

  const { error: updateError } = await db.from('books').update({ available: false }).eq('id', book.id);
  if (updateError) { setBorrowMessage('Saved, but could not update book availability.'); return; }

  // Tell the student (errors here are not critical)
  await db.from('notifications').insert({
    user_id: student.id,
    title: 'Book Borrowed',
    message: 'You borrowed "' + book.title + '". Please return it by ' + fmtDate(dueDate) + '.'
  });

  setBorrowMessage(book.title + ' was borrowed by ' + student.full_name + '. Due ' + fmtDate(dueDate) + '.', false);
  clearBorrowForm();
  await Promise.all([loadBorrowings(), loadBooks(), loadHistory()]);
}

async function returnBook() {
  setBorrowMessage('');
  const code = $('borrow-bookid').value.trim().toUpperCase();
  const date = $('borrow-date').value || todayStr();

  if (!code) { setBorrowMessage('Enter the Book ID to return.'); return; }

  const book = await findBookByCode(code);
  if (!book) { setBorrowMessage('No book found with ID ' + code + '.'); return; }

  const { data: open } = await db
    .from('borrowings').select('*')
    .eq('book_id', book.id).eq('status', 'Borrowed').limit(1);
  if (!open || !open.length) { setBorrowMessage('There is no active borrowing record for that book.'); return; }
  const record = open[0];

  const { error: returnError } = await db
    .from('borrowings')
    .update({ return_date: date, status: 'Returned' })
    .eq('id', record.id);
  if (returnError) { setBorrowMessage('Could not save the return: ' + returnError.message); return; }

  const { error: updateError } = await db.from('books').update({ available: true }).eq('id', book.id);
  if (updateError) { setBorrowMessage('Saved, but could not update book availability.'); return; }

  await db.from('notifications').insert({
    user_id: record.user_id,
    title: 'Book Returned',
    message: 'Thank you for returning "' + book.title + '".'
  });

  setBorrowMessage(book.title + ' was returned.', false);
  clearBorrowForm();
  await Promise.all([loadBorrowings(), loadBooks(), loadHistory()]);
}

function clearBorrowForm() {
  $('borrow-bookid').value = '';
  $('borrow-title').value = '';
  $('borrow-studentid').value = '';
  $('borrow-date').value = '';
}

// ---------- Start-up ----------

document.addEventListener('DOMContentLoaded', () => {
  $('btn-borrow').addEventListener('click', borrowBook);
  $('btn-return').addEventListener('click', returnBook);
  $('borrow-bookid').addEventListener('blur', fillBookTitle);
});
