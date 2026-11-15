/* =========================================================
   app.js — shared logic loaded on EVERY page
   ========================================================= */

/* ---------- 1. SUPABASE CONFIG ---------- */
const SUPABASE_URL = "https://YOUR-PROJECT.supabase.co";
const SUPABASE_ANON_KEY = "YOUR-ANON-KEY";

const SUPABASE_READY = !SUPABASE_URL.includes("YOUR-PROJECT") && !SUPABASE_ANON_KEY.includes("YOUR-ANON-KEY");

let supabaseClient = null;
if (SUPABASE_READY && window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

/* ---------- 2. NAVIGATION ---------- */
const NAV_ITEMS = [
    { href: "dashboard.html",     label: "Home" },
    { href: "appointments.html",  label: "Appointments" },
    { href: "queue.html",         label: "Queue Status" },
    { href: "books.html",         label: "Books" },
    { href: "borrowing.html",     label: "Borrowing" },
    { href: "history.html",       label: "History" },
    { href: "notifications.html", label: "Notifications" },
    { href: "librarian.html",     label: "Librarian" },
    { href: "admin.html",         label: "Admin" },
    { href: "reports.html",       label: "Reports" }
];

/* ---------- 3. SESSION HELPERS ---------- */
function getCurrentUser() {
    try {
        return JSON.parse(localStorage.getItem("libraryUser"));
    } catch (err) {
        return null;
    }
}

function setCurrentUser(user) {
    localStorage.setItem("libraryUser", JSON.stringify(user));
}

function clearCurrentUser() {
    localStorage.removeItem("libraryUser");
}

function requireAuth() {
    const user = getCurrentUser();
    if (!user) {
        window.location.replace("index.html"); // Redirect to login page
        return null;
    }
    return user;
}

function logoutAndRedirect(event) {
    if (event) event.preventDefault();
    clearCurrentUser();
    window.location.href = "index.html"; // Redirect to login page
}

/* ---------- 4. BOOK CATALOG (demo data) ---------- */
const BOOKS = [
    { id: "B001", title: "Introduction to Programming", author: "J. Smith",       category: "Technology", available: true  },
    { id: "B002", title: "Basic Mathematics",           author: "R. Cruz",        category: "Mathematics", available: true  },
    { id: "B003", title: "World History",               author: "A. Reyes",       category: "History",     available: false },
    { id: "B004", title: "Data Structures",             author: "M. Santos",      category: "Technology",  available: true  },
    { id: "B005", title: "Physics Fundamentals",        author: "L. Garcia",      category: "Science",     available: true  },
    { id: "B006", title: "Chemistry Basics",            author: "P. Mendoza",     category: "Science",     available: false },
    { id: "B007", title: "Algebra Made Easy",           author: "R. Cruz",        category: "Mathematics", available: true  },
    { id: "B008", title: "Philippine Literature",       author: "N. Bautista",    category: "Literature",  available: true  },
    { id: "B009", title: "Web Development Essentials",  author: "K. Lim",         category: "Technology",  available: true  },
    { id: "B010", title: "Modern Short Stories",        author: "E. Villanueva",  category: "Literature",  available: false }
];

/* ---------- 5. SHARED HELPERS ---------- */
function escapeHtml(value) {
    return String(value == null ? "" : value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function todayISO() {
    return new Date().toISOString().split("T")[0];
}

function formatDate(iso) {
    if (!iso) return "--";
    const d = new Date(iso + "T00:00:00");
    if (isNaN(d)) return iso;
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function addDays(iso, days) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + days);
    return d.toISOString().split("T")[0];
}

function showMessage(element, text, type) {
    if (!element) return;
    element.textContent = text;
    element.className = "message " + (type || "success");
    element.classList.remove("hidden");
}

/* ---------- 6. NAV RENDERING ---------- */
function renderNav() {
    const nav = document.getElementById("main-nav");
    if (!nav) return;

    const current = window.location.pathname.split("/").pop() || "dashboard.html";
    nav.innerHTML = "";

    NAV_ITEMS.forEach(function (item) {
        const link = document.createElement("a");
        link.href = item.href;
        link.textContent = item.label;
        if (item.href === current) link.classList.add("active");
        nav.appendChild(link);
    });

    const logout = document.createElement("a");
    logout.href = "#";
    logout.textContent = "Logout";
    logout.className = "logout-link";
    logout.addEventListener("click", logoutAndRedirect);
    nav.appendChild(logout);
}

/* ---------- 7. PAGE BOOT ---------- */
document.addEventListener("DOMContentLoaded", function () {
    const isProtected = document.body.hasAttribute("data-protected");

    if (isProtected) {
        const user = requireAuth();
        if (!user) return; 
    }

    renderNav();

    const user = getCurrentUser();

    document.querySelectorAll("[data-user-name]").forEach(function (el) {
        el.textContent = user ? (user.full_name || user.username) : "--";
    });

    document.querySelectorAll("[data-user-id]").forEach(function (el) {
        el.textContent = user ? (user.student_id || "--") : "--";
    });

    document.querySelectorAll("[data-user-role]").forEach(function (el) {
        el.textContent = user ? (user.role || "student") : "--";
    });
});