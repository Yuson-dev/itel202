const BORROW_KEY = "libraryBorrowedBooks";

const borrowTableBody = document.getElementById("borrow-table-body");
const borrowForm      = document.getElementById("borrow-form");
const borrowMessage   = document.getElementById("borrow-message");
const bookIdInput     = document.getElementById("borrow-bookid");
const titleInput      = document.getElementById("borrow-title");
const studentIdInput  = document.getElementById("borrow-studentid");
const dateInput       = document.getElementById("borrow-date");
const btnBorrow       = document.getElementById("btn-borrow");
const btnReturn       = document.getElementById("btn-return");

function getRecords() {
    let records = null;
    try {
        records = JSON.parse(localStorage.getItem(BORROW_KEY));
    } catch (err) {
        records = null;
    }

    if (!Array.isArray(records)) {
        records = [
            {
                bookId: "B003", title: "World History", studentId: "2026-0001",
                studentName: "Mark Yuson", borrowDate: "2026-11-05",
                dueDate: "2026-11-12", returnDate: null, status: "Borrowed"
            },
            {
                bookId: "B006", title: "Chemistry Basics", studentId: "2026-0002",
                studentName: "Althea De Roma", borrowDate: "2026-11-06",
                dueDate: "2026-11-13", returnDate: null, status: "Borrowed"
            }
        ];
        localStorage.setItem(BORROW_KEY, JSON.stringify(records));
    }
    return records;
}

function saveRecords(records) {
    localStorage.setItem(BORROW_KEY, JSON.stringify(records));
}

function renderBorrowTable() {
    const records = getRecords();
    borrowTableBody.innerHTML = "";

    if (records.length === 0) {
        borrowTableBody.innerHTML = '<tr><td colspan="6" class="muted">No borrowing records yet.</td></tr>';
        return;
    }

    records.forEach(function (rec) {
        const row = document.createElement("tr");
        row.innerHTML =
            "<td>" + escapeHtml(rec.bookId) + "</td>" +
            "<td>" + escapeHtml(rec.title) + "</td>" +
            "<td>" + escapeHtml(rec.studentName || rec.studentId) + "</td>" +
            "<td>" + formatDate(rec.borrowDate) + "</td>" +
            "<td>" + formatDate(rec.dueDate) + "</td>" +
            '<td><span class="status">' + escapeHtml(rec.status) + "</span></td>";
        borrowTableBody.appendChild(row);
    });
}

function lookupBook() {
    const id = bookIdInput.value.trim().toUpperCase();
    const book = BOOKS.find(function (b) { return b.id === id; });

    if (book) {
        titleInput.value = book.title;
        showMessage(borrowMessage, "Book found: " + book.title, "success");
    } else {
        titleInput.value = "";
        if (id) showMessage(borrowMessage, "No book found with ID " + id + ".", "error");
    }
}

function borrowBook() {
    const bookId    = bookIdInput.value.trim().toUpperCase();
    const studentId = studentIdInput.value.trim();
    const date      = dateInput.value || todayISO();

    if (!bookId || !studentId) {
        showMessage(borrowMessage, "Book ID and Student ID are required.", "error");
        return;
    }

    const book = BOOKS.find(function (b) { return b.id === bookId; });
    if (!book) {
        showMessage(borrowMessage, "Book ID not found in the catalog.", "error");
        return;
    }

    const records = getRecords();
    const alreadyOut = records.some(function (r) {
        return r.bookId === bookId && r.status === "Borrowed";
    });

    if (alreadyOut) {
        showMessage(borrowMessage, "That book is already borrowed.", "error");
        return;
    }

    const user = getCurrentUser();

    records.push({
        bookId: bookId,
        title: book.title,
        studentId: studentId,
        studentName: user && user.student_id === studentId ? user.full_name : studentId,
        borrowDate: date,
        dueDate: addDays(date, 7),
        returnDate: null,
        status: "Borrowed"
    });

    saveRecords(records);
    renderBorrowTable();
    showMessage(borrowMessage, "Book borrowed successfully. Due on " + formatDate(addDays(date, 7)) + ".", "success");
    bookIdInput.value = "";
    titleInput.value = "";
}

function returnBook() {
    const bookId    = bookIdInput.value.trim().toUpperCase();
    const studentId = studentIdInput.value.trim();

    if (!bookId || !studentId) {
        showMessage(borrowMessage, "Book ID and Student ID are required to return.", "error");
        return;
    }

    const records = getRecords();
    const record = records.find(function (r) {
        return r.bookId === bookId && r.studentId === studentId && r.status === "Borrowed";
    });

    if (!record) {
        showMessage(borrowMessage, "No active borrowing record found for that book and student.", "error");
        return;
    }

    record.returnDate = todayISO();
    record.status = "Returned";

    saveRecords(records);
    renderBorrowTable();
    showMessage(borrowMessage, "Book returned successfully.", "success");
    bookIdInput.value = "";
    titleInput.value = "";
}

document.addEventListener("DOMContentLoaded", function () {
    if (!borrowTableBody) return;

    borrowForm.style.display = "block";
    dateInput.value = todayISO();

    const user = getCurrentUser();
    if (user && user.student_id) studentIdInput.value = user.student_id;

    renderBorrowTable();

    bookIdInput.addEventListener("input", lookupBook);
    btnBorrow.addEventListener("click", borrowBook);
    btnReturn.addEventListener("click", returnBook);
});