/* Orbit Global Script */
document.addEventListener("DOMContentLoaded", () => {
  // Update Clock
  function updateClock() {
    const clockElement = document.getElementById("tbClock");
    const dateElement = document.getElementById("tbDate");
    if (!clockElement || !dateElement) return;

    const now = new Date();
    clockElement.textContent = now.toLocaleTimeString("en-US", {
      hour12: false,
    });
    dateElement.textContent = now.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  }

  // Create Taskbar if it doesn't exist or is different
  function initializeTaskbar() {
    const taskbar = document.getElementById("taskbar");
    if (!taskbar) return;

    const currentPage = window.location.pathname;
    const isProxy =
      currentPage.includes("proxy") || document.querySelector("iframe");

    let taskbarHTML = `
      <div class="tb-section">
        <a href="/" class="tb-btn ${currentPage === "/" || currentPage === "/index.html" ? "active" : ""}">
          <span class="tb-icon">&#9737;</span> Home
        </a>
        <a href="/games.html" class="tb-btn ${currentPage.includes("games") ? "active" : ""}">
          <span class="tb-icon">&#9679;</span> Games
        </a>
        <a href="/movies.html" class="tb-btn ${currentPage.includes("movies") ? "active" : ""}">
          <span class="tb-icon">&#9654;</span> Movies
        </a>
        <a href="/proxy.html" class="tb-btn ${currentPage.includes("proxy") && !isProxy ? "active" : ""}">
          <span class="tb-icon">&#9728;</span> Proxy
        </a>
        <a href="/settings.html" class="tb-btn ${currentPage.includes("settings") ? "active" : ""}">
          <span class="tb-icon">&#9881;</span> Settings
        </a>
      </div>
      <div class="tb-divider"></div>
      <div class="tb-section">
        <div class="tb-info">
          <div class="tb-clock" id="tbClock">00:00:00</div>
          <div class="tb-date" id="tbDate">...</div>
        </div>
      </div>
    `;

    taskbar.innerHTML = taskbarHTML;
    updateClock();
    setInterval(updateClock, 1000);
  }

  initializeTaskbar();

  // Smooth transitions on link click
  document.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (
        href &&
        href.startsWith("/") &&
        !href.startsWith("//") &&
        !link.target
      ) {
        e.preventDefault();
        document.body.style.opacity = "0";
        document.body.style.transform = "translateY(-10px)";
        setTimeout(() => {
          window.location.href = href;
        }, 300);
      }
    });
  });
});
