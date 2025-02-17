document.getElementById("logoutBtn").addEventListener("click", function () {
    localStorage.removeItem("loggedInUser");
    window.location.href = "index.html";
});
