const authMessage   = document.getElementById("auth-message");
const usernameInput = document.getElementById("auth-username");
const passwordInput = document.getElementById("auth-password");
const btnLogin      = document.getElementById("btn-login");

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

    if (typeof SUPABASE_READY === 'undefined' || !SUPABASE_READY || !supabaseClient) {
        authMessage.textContent = "Error: Database not connected. Check app.js";
        authMessage.className = "message error";
        return;
    }

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

    if (!data) {
        authMessage.textContent = "Invalid username or password.";
        authMessage.className = "message error";
        return;
    }

        // NEW: Check if the user is inactive or archived
    if (data.status === 'Inactive' || data.status === 'Archived') {
        authMessage.textContent = "Your account has been deactivated. Please contact the administrator.";
        authMessage.className = "message error";
        return;
    }

    setCurrentUser({
        username: data.username,
        full_name: data.full_name,
        student_id: data.student_id,
        role: data.role || "student"
    });

    window.location.href = "dashboard.html";
}

btnLogin.addEventListener("click", function (e) {
    e.preventDefault(); 
    handleLogin();
});

passwordInput.addEventListener("keydown", function (e) {
    if (e.key === "Enter") handleLogin();
});

if (getCurrentUser()) {
    window.location.replace("dashboard.html");
}