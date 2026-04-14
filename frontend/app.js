const API = "http://127.0.0.1:8000";

// Check if already logged in on page load
document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem("token")) {
        document.getElementById("auth").style.display = "none";
        document.getElementById("dashboard").style.display = "block";
        loadNotes();
    }
});

function register() {
    const btn = document.querySelector('button.secondary');
    btn.textContent = "Registering...";
    
    fetch(`${API}/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: username.value,
            password: password.value
        })
    })
    .then(async res => {
        const data = await res.json();
        if (res.ok) {
            alert("Registration successful! Please login.");
            password.value = "";
        } else {
            alert("Error: " + (data.detail || "Registration failed"));
        }
    })
    .catch(err => alert("Connection error"))
    .finally(() => {
        btn.textContent = "Register";
    });
}

function login() {
    const btn = document.querySelector('button.primary');
    btn.textContent = "Logging in...";

    fetch(`${API}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            username: username.value,
            password: password.value
        })
    })
    .then(async res => {
        const data = await res.json();
        if (res.ok) {
            localStorage.setItem("token", data.access_token);
            document.getElementById("auth").style.display = "none";
            
            // Animate dashboard in
            const dash = document.getElementById("dashboard");
            dash.style.display = "block";
            dash.style.animation = "none";
            setTimeout(() => dash.style.animation = "fadeIn 0.5s ease-out forwards", 10);
            
            loadNotes();
        } else {
            alert("Error: " + (data.detail || "Login failed"));
        }
    })
    .catch(err => alert("Connection error"))
    .finally(() => {
        btn.textContent = "Login";
    });
}

function logout() {
    localStorage.removeItem("token");
    username.value = "";
    password.value = "";
    document.getElementById("dashboard").style.display = "none";
    
    const auth = document.getElementById("auth");
    auth.style.display = "block";
    auth.style.animation = "none";
    setTimeout(() => auth.style.animation = "fadeIn 0.5s ease-out forwards", 10);
}

function createNote() {
    if (!title.value.trim() && !content.value.trim()) return;

    const btn = document.querySelector('.note-creator button');
    btn.textContent = "Saving...";

    fetch(`${API}/notes`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + localStorage.getItem("token")
        },
        body: JSON.stringify({
            title: title.value,
            content: content.value
        })
    })
    .then(res => {
        if (res.ok) {
            title.value = "";
            content.value = "";
            loadNotes();
        } else {
            alert("Failed to create note. Please login again.");
            logout();
        }
    })
    .finally(() => {
        btn.textContent = "Save Note";
    });
}

function loadNotes() {
    fetch(`${API}/notes`, {
        headers: {
            "Authorization": "Bearer " + localStorage.getItem("token")
        }
    })
    .then(async res => {
        if (res.status === 401 || res.status === 403) {
            logout();
            return;
        }
        const data = await res.json();
        const notesDiv = document.getElementById("notes");
        notesDiv.innerHTML = "";

        // Reverse to show latest first
        data.reverse().forEach((note, index) => {
            // Apply staggered animation inline 
            notesDiv.innerHTML += `
            <div class="note" style="animation-delay: ${index * 0.05}s">
              <h3>${note.title}</h3>
              <p>${note.content}</p>
            </div>
          `;
        });
    });
}