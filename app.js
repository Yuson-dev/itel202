/* =========================================================
   app.js — shared logic loaded on EVERY page
   ========================================================= */

/* ---------- 1. SUPABASE CONFIG ---------- */
// REPLACE THESE WITH YOUR ACTUAL SUPABASE URL AND ANON KEY
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
    { href: "librarian.html",     label: "Librarian", roles: ["librarian", "admin"] }, // Restricted
    { href: "admin.html",         label: "Admin", roles: ["admin"] }, // Restricted
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

    const user = getCurrentUser();
    const userRole = user ? (user.role || "student") : "student";
    const current = window.location.pathname.split("/").pop() || "dashboard.html";
    
    nav.innerHTML = "";

    NAV_ITEMS.forEach(function (item) {
        // If the menu item has role restrictions, check if the user has permission
        if (item.roles && !item.roles.includes(userRole)) {
            return; // Skip rendering this link
        }

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

        const role = user.role || "student";
        const path = window.location.pathname;

        // --- ADMIN GUARD ---
        if (path.includes("admin.html") && role !== "admin") {
            alert("Access Denied. You do not have administrator privileges.");
            window.location.replace("dashboard.html");
            return;
        }

        // --- LIBRARIAN GUARD ---
        if (path.includes("librarian.html") && role !== "librarian" && role !== "admin") {
            alert("Access Denied. You do not have librarian privileges.");
            window.location.replace("dashboard.html");
            return;
        }
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

    // --- LOAD ADMIN DATA ---
    if (window.location.pathname.includes("admin.html") && SUPABASE_READY && supabaseClient) {
        loadAdminUsers();
    }
});

/* ---------- 8. ADMIN SPECIFIC FUNCTIONS ---------- */
async function loadAdminUsers() {
    const tbody = document.getElementById("admin-user-table-body");
    if (!tbody) return; 

    const { data: users, error } = await supabaseClient
        .from('users')
        .select('*')
        .order('role', { ascending: true }); // Show admins first

    if (error) {
        console.error("Error loading users:", error);
        tbody.innerHTML = `<tr><td colspan="5" style="color:red;">Error loading users: ${error.message}</td></tr>`;
        return;
    }

    tbody.innerHTML = ""; 

    users.forEach(user => {
        const tr = document.createElement("tr");
        
        // Color code the roles
        let roleColor = "black";
        if (user.role === "admin") roleColor = "#d9534f"; // Red
        if (user.role === "librarian") roleColor = "#f0ad4e"; // Orange

        tr.innerHTML = `
            <td>${user.student_id || 'N/A'}</td>
            <td>${escapeHtml(user.full_name || 'N/A')}</td>
            <td>${escapeHtml(user.username)}</td>
            <td style="text-transform: capitalize; color: ${roleColor}; font-weight: bold;">${user.role || 'student'}</td>
            <td><span style="color: green; font-weight: bold;">Active</span></td>
        `;
        tbody.appendChild(tr);
    });
}