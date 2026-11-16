const SUPABASE_URL = "https://qkdlgxeapgnbqjtmrypw.supabase.co";
const SUPABASE_ANON_KEY = "sb_publishable_MlmH0bwg65-StlMCE37Eow_1TZswdr_";
const SUPABASE_READY = !SUPABASE_URL.includes("YOUR-PROJECT") && !SUPABASE_ANON_KEY.includes("YOUR-ANON-KEY");

let supabaseClient = null;
if (SUPABASE_READY && window.supabase) {
    supabaseClient = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

const NAV_ITEMS = [
    { href: "dashboard.html",     label: "Home" },
    { href: "appointments.html",  label: "Appointments" },
    { href: "queue.html",         label: "Queue Status" },
    { href: "books.html",         label: "Books" },
    { href: "history.html",       label: "History" },
    { href: "notifications.html", label: "Notifications" },
    { href: "borrowing.html",     label: "Borrowing", roles: ["librarian", "admin"] },
    { href: "reports.html",       label: "Reports", roles: ["librarian", "admin"] },
    { href: "librarian.html",     label: "Librarian", roles: ["librarian", "admin"] },
    { href: "admin.html",         label: "Admin", roles: ["admin"] }
];

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
        window.location.replace("index.html"); 
        return null;
    }
    return user;
}

function logoutAndRedirect(event) {
    if (event) event.preventDefault();
    clearCurrentUser();
    window.location.href = "index.html"; 
}

// Sanitize inputs to prevent basic XSS
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

function renderNav() {
    const nav = document.getElementById("main-nav");
    if (!nav) return;

    const user = getCurrentUser();
    const userRole = user ? (user.role || "student") : "student";
    const current = window.location.pathname.split("/").pop() || "dashboard.html";
    
    nav.innerHTML = "";

    NAV_ITEMS.forEach(function (item) {
        // Skip rendering if the user's role doesn't have permission
        if (item.roles && !item.roles.includes(userRole)) {
            return; 
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

document.addEventListener("DOMContentLoaded", function () {
    const isProtected = document.body.hasAttribute("data-protected");

    if (isProtected) {
        const user = requireAuth();
        if (!user) return; 

        const role = user.role || "student";
        const path = window.location.pathname;

        // Route guards
        if (path.includes("admin.html") && role !== "admin") {
            alert("Access Denied. You do not have administrator privileges.");
            window.location.replace("dashboard.html");
            return;
        }

        if (path.includes("librarian.html") && role !== "librarian" && role !== "admin") {
            alert("Access Denied. You do not have librarian privileges.");
            window.location.replace("dashboard.html");
            return;
        }

        if (path.includes("borrowing.html") && role !== "librarian" && role !== "admin") {
            alert("Access Denied. Only librarians and admins can manage borrowings.");
            window.location.replace("dashboard.html");
            return;
        }

        if (path.includes("reports.html") && role !== "librarian" && role !== "admin") {
            alert("Access Denied. Only librarians and admins can view reports.");
            window.location.replace("dashboard.html");
            return;
        }
    }

    renderNav();

    const user = getCurrentUser();

    // Populate user info spans across all pages
    document.querySelectorAll("[data-user-name]").forEach(function (el) {
        el.textContent = user ? (user.full_name || user.username) : "--";
    });

    document.querySelectorAll("[data-user-id]").forEach(function (el) {
        el.textContent = user ? (user.student_id || "--") : "--";
    });

    document.querySelectorAll("[data-user-role]").forEach(function (el) {
        el.textContent = user ? (user.role || "student") : "--";
    });

    if (window.location.pathname.includes("admin.html") && SUPABASE_READY && supabaseClient) {
        loadAdminUsers();
    }
});

async function loadAdminUsers() {
    const tbody = document.getElementById("admin-user-table-body");
    if (!tbody) return; 

    const { data: users, error } = await supabaseClient
        .from('users')
        .select('*')
        .order('role', { ascending: true });

    if (error) {
        console.error("Error loading users:", error);
        tbody.innerHTML = `<tr><td colspan="5" style="color:red;">Error loading users: ${error.message}</td></tr>`;
        return;
    }

    tbody.innerHTML = ""; 

    users.forEach(user => {
        const tr = document.createElement("tr");
        
        let roleColor = "black";
        if (user.role === "admin") roleColor = "#d9534f";
        if (user.role === "librarian") roleColor = "#f0ad4e";

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

// Fetch the system name from settings and update the header dynamically
async function loadGlobalSettings() {
    if (typeof SUPABASE_READY === 'undefined' || !SUPABASE_READY || !supabaseClient) return;

    const { data } = await supabaseClient
        .from('settings')
        .select('value')
        .eq('key', 'system_name')
        .single();

    if (data && data.value) {
        const headerTitle = document.querySelector("header h2");
        if (headerTitle) headerTitle.textContent = data.value;
        document.title = document.title.replace("Library Management System", data.value);
    }
}

document.addEventListener("DOMContentLoaded", loadGlobalSettings);