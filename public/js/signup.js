function showAlert(type, msg) {
  const el = $("#alert");
  el.removeClass("d-none alert-success alert-danger").addClass(`alert-${type}`).text(msg);
}

$("#signupForm").on("submit", async function (e) {
  e.preventDefault();

  const payload = {
    username: $("#username").val().trim(),
    firstname: $("#firstname").val().trim(),
    lastname: $("#lastname").val().trim(),
    password: $("#password").val()
  };

  try {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!data.ok) {
      showAlert("danger", data.error || "Signup failed");
      return;
    }

    showAlert("success", "Account created! Redirecting to login...");
    setTimeout(() => (window.location.href = "/view/login.html"), 800);
  } catch (err) {
    showAlert("danger", "Signup failed");
  }
});
