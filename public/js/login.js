function showAlert(type, msg) {
  const el = $("#alert");
  el.removeClass("d-none alert-success alert-danger").addClass(`alert-${type}`).text(msg);
}

$("#loginForm").on("submit", async function (e) {
  e.preventDefault();

  const payload = {
    username: $("#username").val().trim(),
    password: $("#password").val()
  };

  try {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!data.ok) {
      showAlert("danger", data.error || "Login failed");
      return;
    }

    localStorage.setItem("chat_user", JSON.stringify(data.user));
    window.location.href = "/view/chat.html";
  } catch (err) {
    showAlert("danger", "Login failed");
  }
});