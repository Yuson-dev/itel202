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

async function checkNotifications() {
    const user = getCurrentUser();
    if (!user || typeof SUPABASE_READY === 'undefined' || !SUPABASE_READY) return;

    const { count } = await supabaseClient
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('student_id', user.student_id)
        .eq('is_read', false);

    const badge = document.getElementById("nav-notif-badge");
    if (badge && count > 0) {
        badge.textContent = count;
        badge.style.display = "block";
    }
}

function renderNav() {
    const nav = document.getElementById("main-nav");
    if (!nav) return;

    const user = getCurrentUser();
    const userRole = user ? (user.role || "student") : "student";
    const current = window.location.pathname.split("/").pop() || "dashboard.html";
    
    nav.innerHTML = "";

    const icons = {
        home: `<svg viewBox="0 0 24 24"><path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/></svg>`,
        calendar: `<svg viewBox="0 0 24 24"><path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11zM7 10h5v5H7z"/></svg>`,
        queue: `<svg viewBox="0 0 24 24"><path d="M4 6h16v2H4zm0 5h16v2H4zm0 5h16v2H4z"/></svg>`,
        book: `<svg viewBox="0 0 24 24"><path d="M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z"/></svg>`,
        history: `<svg viewBox="0 0 24 24"><path d="M13 3c-4.97 0-9 4.03-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42C8.27 19.99 10.51 21 13 21c4.97 0 9-4.03 9-9s-4.03-9-9-9zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z"/></svg>`,
        notification: `<svg viewBox="0 0 24 24"><path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.89 2 2 2zm6-6v-5c0-3.07-1.64-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.63 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/></svg>`,
        borrow: `<svg viewBox="0 0 24 24"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>`,
        report: `<svg viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM9 17H7v-7h2v7zm4 0h-2V7h2v10zm4 0h-2v-4h2v4z"/></svg>`,
        librarian: `<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`,
        admin: `<svg viewBox="0 0 24 24"><path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 10.99h7c-.53 4.12-3.28 7.79-7 8.94V12H5V6.3l7-3.11v8.8z"/></svg>`,
        person: `<svg viewBox="0 0 24 24"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>`
    };

    const createIconLink = (href, label, iconName) => {
        const a = document.createElement("a");
        a.href = href;
        a.className = "nav-icon " + (href === current ? "active" : "");
        a.title = label; 
        
        // Wrap the label in a span so it can slide out
        a.innerHTML = `${icons[iconName]}<span class="nav-text">${label}</span>`;
        return a;
    };

    NAV_ITEMS.forEach(function (item) {
        if (item.roles && !item.roles.includes(userRole)) return; 
        if (item.href === "notifications.html" || item.href === "history.html") return;

        let iconName = 'home';
        if (item.href.includes('appointments')) iconName = 'calendar';
        if (item.href.includes('queue')) iconName = 'queue';
        if (item.href.includes('books')) iconName = 'book';
        if (item.href.includes('borrowing')) iconName = 'borrow';
        if (item.href.includes('reports')) iconName = 'report';
        if (item.href.includes('librarian')) iconName = 'librarian';
        if (item.href.includes('admin')) iconName = 'admin';

        nav.appendChild(createIconLink(item.href, item.label, iconName));
    });

    nav.appendChild(createIconLink("history.html", "History", "history"));

    const notifLink = createIconLink("notifications.html", "Notifications", "notification");
    notifLink.innerHTML += `<span class="nav-badge" id="nav-notif-badge" style="display:none;">0</span>`;
    nav.appendChild(notifLink);

    // Profile Dropdown
    const profileDiv = document.createElement("div");
    profileDiv.className = "profile-dropdown";
    profileDiv.innerHTML = `
        <a href="#" class="nav-icon" id="profile-btn" title="Profile Menu">${icons.person}</a>
        <div class="dropdown-content" id="profile-menu">
            <a href="profile.html">My Profile</a>
            <a href="#" onclick="logoutAndRedirect(event)" class="logout-link">Logout</a>
        </div>
    `;
    nav.appendChild(profileDiv);

    document.getElementById("profile-btn").addEventListener("click", function(e) {
        e.preventDefault();
        document.getElementById("profile-menu").classList.toggle("show-dropdown");
    });

    window.addEventListener("click", function(e) {
        if (!e.target.closest('.profile-dropdown')) {
            const menu = document.getElementById("profile-menu");
            if (menu && menu.classList.contains('show-dropdown')) {
                menu.classList.remove('show-dropdown');
            }
        }
    });

    checkNotifications();
}

document.addEventListener("DOMContentLoaded", function () {
    const isProtected = document.body.hasAttribute("data-protected");

    if (isProtected) {
        const user = requireAuth();
        if (!user) return; 

        const role = user.role || "student";
        const path = window.location.pathname;

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