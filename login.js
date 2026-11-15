const USERS_KEY = "libraryUsers";

const authTitle    = document.getElementById("auth-title");
const authMessage  = document.getElementById("auth-message");
const registerBox  = document.getElementById("register-fields");
const usernameInput = document.getElementById("auth-username");
const passwordInput = document.getElementById("auth-password");
const fullNameInput = document.getElementById("reg-fullname");
const studentIdInput = document.getElementById("reg-studentid");

const btnLogin    = document.getElementById("btn-login");
const btnRegister = document.getElementById("btn-register");

let mode = "login";

function getLocalUsers() {
    let users = null;
    try {
        users = JSON.parse(localStorage.getItem(USERS_KEY));
    } catch (err) {
        users = null;
    }

    if (!Array.isArray(users) || users.length === 0) {
        users = [
            { username: "admin", password: "admin123", full_name: "Administrator", student_id: "ADMIN-001", role: "admin" },
            { username: "librarian", password: "lib123", full_name: "Althea De Roma", student_id: "LIB-001", role: "librarian" },
            { username: "mark123", password: "mark123", full_name: "Mark Yuson", student_id: "2026-0001", role: "student" }
        ];
        localStorage.setItem(USERS_KEY, JSON.stringify(users));
    }
    return users;
}

function saveLocalUser(user) {
    const users = getLocalUsers();
    users.push(user);
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function setMode(nextMode) {
    mode = nextMode;
    authMessage.textContent = "";
    authMessage.className = "";

    if (mode === "register") {
        authTitle.textContent = "Create an Account";
        registerBox.style.display = "block";
        btnLogin.textContent = "Already have an account? Login";
        btnRegister.textContent = "Create Account";
    } else {
        authTitle.textContent = "Library System Login";
        registerBox.style.display = "none";
        btnLogin.textContent = "Login";
        btnRegister.textContent = "Register";
    }
}

async function handleLogin() {
    const username = usernameInput.value.trim();
    const password = passwordInput.value;

    if (!username || !password) {
        authMessage.textContent = "Please enter your username and password.";
        authMessage.className = "message error";
        return;
    }

    authMessage.textContent = "Checking credentials...";
    authMessage.className = "message";

    let user = null;

    if (SUPABASE_READY && supabaseClient) {
        const { data, error } = await supabaseClient
            .from("users")
            .select("*")
            .eq("username", username)
            .eq("password", password)
            .maybeSingle();

        if (error) {
            authMessage.textContent = "Login error: " + error.message;
            authMessage.className = "message error";
            return;
        }
        user = data;
    } else {
        user = getLocalUsers().find(function (u) {
            return u.username === username && u.password === password;
        });
    }

    if (!user) {
        authMessage.textContent = "Invalid username or password.";
        authMessage.className = "message error";
        return;
    }

    setCurrentUser({
        username: user.username,
        full_name: user.full_name,
        student_id: user.student_id,
        role: user.role || "student"
    });

    window.location.href = "dashboard.html";
}

async function handleRegister() {
    const fullName  = fullNameInput.value.trim();
    const studentId = studentIdInput.value.trim();
    const username  = usernameInput.value.trim();
    const password  = passwordInput.value;

    if (!fullName || !studentId || !username || !password) {
        authMessage.textContent = "Please fill in all fields.";
        authMessage.className = "message error";
        return;
    }

    if (password.length < 6) {
        authMessage.textContent = "Password must be at least 6 characters.";
        authMessage.className = "message error";
        return;
    }

    const newUser = {
        full_name: fullName,
        student_id: studentId,
        username: username,
        password: password,
        role: "student"
    };

    if (SUPABASE_READY && supabaseClient) {
        const { error } = await supabaseClient.from("users").insert([newUser]);
        if (error) {
            authMessage.textContent = "Registration failed: " + error.message;
            authMessage.className = "message error";
            return;
        }
    } else {
        const exists = getLocalUsers().some(function (u) {
            return u.username === username;
        });
        if (exists) {
            authMessage.textContent = "That username is already taken.";
            authMessage.className = "message error";
            return;
        }
        saveLocalUser(newUser);
    }

    authMessage.textContent = "Account created! You can now log in.";
    authMessage.className = "message success";
    setMode("login");
    passwordInput.value = "";
}

btnLogin.addEventListener("click", function (e) {
    e.preventDefault(); // Stops the page from refreshing
    if (mode === "register") {
        setMode("login");
    } else {
        handleLogin();
    }
});

btnRegister.addEventListener("click", function (e) {
    e.preventDefault(); // Stops the page from refreshing
    if (mode === "login") {
        setMode("register");
    } else {
        handleRegister();
    }
});

passwordInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter" && mode === "login") handleLogin();
});

if (getCurrentUser()) {
    window.location.replace("dashboard.html");
}