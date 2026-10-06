const loginScreen = document.getElementById("loginScreen");
const otpScreen = document.getElementById("otpScreen");
const dashboard = document.getElementById("dashboard");

const loginForm = document.getElementById("loginForm");
const adminEmail = document.getElementById("adminEmail");
const adminPassword = document.getElementById("adminPassword");
const togglePassword = document.getElementById("togglePassword");
const loginMessage = document.getElementById("loginMessage");

const verifyOtp = document.getElementById("verifyOtp");
const otpMessage = document.getElementById("otpMessage");
const backLogin = document.getElementById("backLogin");
const otpInputs = [...document.querySelectorAll(".otp-inputs input")];

const navItems = [...document.querySelectorAll(".nav-item")];
const pages = [...document.querySelectorAll(".page")];

const pageTitle = document.getElementById("pageTitle");
const sidebar = document.getElementById("sidebar");
const mobileSidebarBtn = document.getElementById("mobileSidebarBtn");
const logoutBtn = document.getElementById("logoutBtn");
const refreshBtn = document.getElementById("refreshBtn");

const communityTable = document.getElementById("communityTable");
const jobTable = document.getElementById("jobTable");
const approvedGrid = document.getElementById("approvedGrid");
const offerGrid = document.getElementById("offerGrid");
const recentApplications = document.getElementById("recentApplications");

const communitySearch = document.getElementById("communitySearch");
const jobSearch = document.getElementById("jobSearch");
const jobFilter = document.getElementById("jobFilter");

const detailsDrawer = document.getElementById("detailsDrawer");
const drawerContent = document.getElementById("drawerContent");
const drawerClose = document.getElementById("drawerClose");

const offerModal = document.getElementById("offerModal");
const offerModalClose = document.getElementById("offerModalClose");
const offerForm = document.getElementById("offerForm");

const toast = document.getElementById("toast");

let currentJobs = [];
let currentCommunity = [];
let currentOffers = [];
let otpRequestId = null;

const API_BASE_URL = "https://mihub-community.onrender.com/api";

function getSession() {
  try {
    const session = sessionStorage.getItem("miHubAdminSession");
    return session ? JSON.parse(session) : null;
  } catch {
    return null;
  }
}

function saveSession(admin, token) {
  sessionStorage.setItem(
    "miHubAdminSession",
    JSON.stringify({
      authenticated: true,
      name: admin?.name || "Administrator",
      email: admin?.email || adminEmail.value.trim(),
      token: token || "",
      createdAt: Date.now()
    })
  );
}

function clearSession() {
  sessionStorage.removeItem("miHubAdminSession");
  otpRequestId = null;
}

function getAuthToken() {
  const session = getSession();
  return session?.token || "";
}

function showToast(message, type = "success") {
  if (!toast) return;

  toast.textContent = message;
  toast.classList.remove("hidden");

  if (type === "error") {
    toast.style.borderColor = "rgba(255,105,105,.25)";
    toast.style.color = "#ffb1b1";
    toast.style.background = "#2a1010";
  } else {
    toast.style.borderColor = "rgba(69,212,131,.2)";
    toast.style.color = "#bdf3d1";
    toast.style.background = "#09271d";
  }

  clearTimeout(window.toastTimer);

  window.toastTimer = setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

async function apiRequest(path, options = {}) {
  const token = getAuthToken();

  const headers = {
    ...(options.body
      ? {
          "Content-Type": "application/json"
        }
      : {}),
    ...(options.headers || {})
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    credentials: "include",
    headers
  });

  const contentType =
    response.headers.get("content-type") || "";

  let data = {};

  if (contentType.includes("application/json")) {
    data = await response.json();
  } else {
    const text = await response.text();
    data = text ? { message: text } : {};
  }

  if (response.status === 401) {
    clearSession();

    if (dashboard) {
      dashboard.classList.add("hidden");
    }

    if (otpScreen) {
      otpScreen.classList.add("hidden");
    }

    if (loginScreen) {
      loginScreen.classList.remove("hidden");
    }

    throw new Error(
      data.message || "Your admin session has expired."
    );
  }

  if (!response.ok) {
    throw new Error(
      data.message ||
        data.error ||
        "Server request failed."
    );
  }

  return data;
}

if (togglePassword) {
  togglePassword.addEventListener("click", () => {
    const icon = togglePassword.querySelector("i");

    if (adminPassword.type === "password") {
      adminPassword.type = "text";

      if (icon) {
        icon.classList.remove("fa-eye");
        icon.classList.add("fa-eye-slash");
      }
    } else {
      adminPassword.type = "password";

      if (icon) {
        icon.classList.remove("fa-eye-slash");
        icon.classList.add("fa-eye");
      }
    }
  });
}

if (loginForm) {
  loginForm.addEventListener("submit", async event => {
    event.preventDefault();

    loginMessage.textContent = "";

    const email = adminEmail.value.trim();
    const password = adminPassword.value;

    if (!email || !password) {
      loginMessage.textContent =
        "Enter your admin email and password.";
      return;
    }

    const button =
      loginForm.querySelector(
        'button[type="submit"]'
      );

    const originalText = button
      ? button.textContent
      : "";

    if (button) {
      button.disabled = true;
      button.textContent = "Verifying...";
    }

    try {
      const data = await fetch(
        `${API_BASE_URL}/admin/login`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            email,
            password
          })
        }
      );

      const result = await data.json();

      if (!data.ok) {
        throw new Error(
          result.message ||
            "Invalid admin credentials."
        );
      }

      if (result.requiresOtp) {
        otpRequestId =
          result.otpRequestId || null;

        if (!otpRequestId) {
          throw new Error(
            "OTP request ID was not received from the server."
          );
        }

        openOtpScreen();

        otpMessage.textContent =
          result.message ||
          "A verification OTP has been sent to your email.";

        showToast(
          "OTP sent successfully."
        );

        return;
      }

      if (result.authenticated && result.token) {
        enterDashboard(
          result.admin || {
            email
          },
          result.token
        );

        return;
      }

      loginMessage.textContent =
        "Administrator authentication failed.";
    } catch (error) {
      loginMessage.textContent =
        error.message ||
        "Unable to connect to the admin server.";
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = originalText;
      }
    }
  });
}

function openOtpScreen() {
  loginScreen.classList.add("hidden");
  otpScreen.classList.remove("hidden");

  otpInputs.forEach(input => {
    input.value = "";
  });

  otpInputs[0]?.focus();
}

otpInputs.forEach((input, index) => {
  input.addEventListener("input", () => {
    input.value =
      input.value.replace(/\D/g, "").slice(0, 1);

    if (
      input.value &&
      index < otpInputs.length - 1
    ) {
      otpInputs[index + 1].focus();
    }
  });

  input.addEventListener("keydown", event => {
    if (
      event.key === "Backspace" &&
      !input.value &&
      index > 0
    ) {
      otpInputs[index - 1].focus();
    }
  });

  input.addEventListener("paste", event => {
    const pasted =
      event.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, 6);

    if (!pasted) return;

    event.preventDefault();

    pasted.split("").forEach((digit, i) => {
      if (otpInputs[i]) {
        otpInputs[i].value = digit;
      }
    });

    otpInputs[
      Math.min(
        pasted.length - 1,
        otpInputs.length - 1
      )
    ].focus();
  });
});

if (verifyOtp) {
  verifyOtp.addEventListener(
    "click",
    async () => {
      const otp = otpInputs
        .map(input => input.value)
        .join("");

      otpMessage.textContent = "";

      if (!otpRequestId) {
        otpMessage.textContent =
          "OTP session expired. Please login again.";
        return;
      }

      if (otp.length !== 6) {
        otpMessage.textContent =
          "Enter the complete 6-digit OTP.";
        return;
      }

      verifyOtp.disabled = true;

      try {
        const response = await fetch(
          `${API_BASE_URL}/admin/verify-otp`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({
              otpRequestId,
              otp
            })
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message ||
              "Invalid verification code."
          );
        }

        if (
          data.success &&
          data.token
        ) {
          saveSession(
            data.admin || {
              email: adminEmail.value.trim()
            },
            data.token
          );

          otpRequestId = null;

          enterDashboard(
            data.admin || {
              email: adminEmail.value.trim()
            },
            data.token
          );

          return;
        }

        throw new Error(
          data.message ||
            "Verification failed."
        );
      } catch (error) {
        otpMessage.textContent =
          error.message ||
          "Invalid verification code.";
      } finally {
        verifyOtp.disabled = false;
      }
    }
  );
}

if (backLogin) {
  backLogin.addEventListener("click", () => {
    otpScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");

    otpRequestId = null;

    otpInputs.forEach(input => {
      input.value = "";
    });

    otpMessage.textContent = "";
  });
}

async function enterDashboard(admin = {}, token = "") {
  if (token) {
    saveSession(admin, token);
  }

  const adminName =
    document.getElementById("adminName");

  if (adminName) {
    adminName.textContent =
      admin.name || "Administrator";
  }

  loginScreen.classList.add("hidden");
  otpScreen.classList.add("hidden");
  dashboard.classList.remove("hidden");

  try {
    await loadServerData();
    renderAll();
  } catch (error) {
    showToast(
      error.message ||
        "Unable to load dashboard data.",
      "error"
    );
  }
}

async function checkSession() {
  const session = getSession();

  if (
    !session ||
    !session.authenticated ||
    !session.token
  ) {
    loginScreen.classList.remove("hidden");
    otpScreen.classList.add("hidden");
    dashboard.classList.add("hidden");
    return;
  }

  try {
    const data =
      await apiRequest("/admin/me");

    const admin =
      data.admin || session;

    const adminName =
      document.getElementById("adminName");

    if (adminName) {
      adminName.textContent =
        admin.name || "Administrator";
    }

    loginScreen.classList.add("hidden");
    otpScreen.classList.add("hidden");
    dashboard.classList.remove("hidden");

    await loadServerData();
    renderAll();
  } catch {
    clearSession();

    dashboard.classList.add("hidden");
    otpScreen.classList.add("hidden");
    loginScreen.classList.remove("hidden");
  }
}

navItems.forEach(item => {
  item.addEventListener("click", () => {
    const page = item.dataset.page;

    openPage(page);

    sidebar.classList.remove("open");
  });
});

document
  .querySelectorAll("[data-page-link]")
  .forEach(button => {
    button.addEventListener("click", () => {
      openPage(button.dataset.pageLink);
    });
  });

function openPage(page) {
  navItems.forEach(item => {
    item.classList.toggle(
      "active",
      item.dataset.page === page
    );
  });

  pages.forEach(section => {
    section.classList.toggle(
      "active",
      section.id === `${page}Page`
    );
  });

  const titles = {
    overview: "Dashboard Overview",
    community: "Community Joining",
    jobs: "Job Applications",
    approved: "Approved Candidates",
    offers: "Offer Letters"
  };

  pageTitle.textContent =
    titles[page] || "Dashboard";
}

if (mobileSidebarBtn) {
  mobileSidebarBtn.addEventListener(
    "click",
    () => {
      sidebar.classList.toggle("open");
    }
  );
}

if (logoutBtn) {
  logoutBtn.addEventListener(
    "click",
    async () => {
      try {
        await apiRequest(
          "/admin/logout",
          {
            method: "POST"
          }
        );
      } catch {}

      clearSession();

      currentJobs = [];
      currentCommunity = [];
      currentOffers = [];

      dashboard.classList.add("hidden");
      otpScreen.classList.add("hidden");
      loginScreen.classList.remove("hidden");

      adminPassword.value = "";

      otpInputs.forEach(input => {
        input.value = "";
      });

      loginMessage.textContent = "";
      otpMessage.textContent = "";
    }
  );
}

if (refreshBtn) {
  refreshBtn.addEventListener(
    "click",
    async () => {
      refreshBtn.disabled = true;

      try {
        await loadServerData();
        renderAll();

        showToast(
          "Dashboard refreshed."
        );
      } catch (error) {
        showToast(
          error.message ||
            "Unable to refresh dashboard.",
          "error"
        );
      } finally {
        refreshBtn.disabled = false;
      }
    }
  );
}

async function loadServerData() {
  const [
    communityData,
    jobsData,
    offersData
  ] = await Promise.all([
    apiRequest("/admin/community"),
    apiRequest("/admin/jobs"),
    apiRequest("/admin/offers")
  ]);

  currentCommunity =
    Array.isArray(communityData)
      ? communityData
      : communityData.items ||
        communityData.data ||
        [];

  currentJobs =
    Array.isArray(jobsData)
      ? jobsData
      : jobsData.items ||
        jobsData.data ||
        [];

  currentOffers =
    Array.isArray(offersData)
      ? offersData
      : offersData.items ||
        offersData.data ||
        [];

  return {
    community: currentCommunity,
    jobs: currentJobs,
    offers: currentOffers
  };
}

function renderAll() {
  renderStats();
  renderRecentApplications();
  renderCommunity();
  renderJobs();
  renderApproved();
  renderOffers();
}

function renderStats() {
  const totalCommunity =
    document.getElementById(
      "totalCommunity"
    );

  const totalJobs =
    document.getElementById(
      "totalJobs"
    );

  const totalApproved =
    document.getElementById(
      "totalApproved"
    );

  const totalOffers =
    document.getElementById(
      "totalOffers"
    );

  const communityCount =
    document.getElementById(
      "communityCount"
    );

  const jobCount =
    document.getElementById(
      "jobCount"
    );

  const approved =
    currentJobs.filter(
      job => job.status === "approved"
    );

  if (totalCommunity) {
    totalCommunity.textContent =
      currentCommunity.length;
  }

  if (totalJobs) {
    totalJobs.textContent =
      currentJobs.length;
  }

  if (totalApproved) {
    totalApproved.textContent =
      approved.length;
  }

  if (totalOffers) {
    totalOffers.textContent =
      currentOffers.length;
  }

  if (communityCount) {
    communityCount.textContent =
      currentCommunity.length;
  }

  if (jobCount) {
    jobCount.textContent =
      currentJobs.filter(
        job => job.status === "pending"
      ).length;
  }
}

function initials(name = "") {
  return (
    name
      .split(" ")
      .filter(Boolean)
      .map(word => word[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "MI"
  );
}

function formatDate(date) {
  if (!date) return "-";

  const parsed = new Date(date);

  if (Number.isNaN(parsed.getTime())) {
    return String(date);
  }

  return parsed.toLocaleDateString(
    "en-IN",
    {
      day: "2-digit",
      month: "short",
      year: "numeric"
    }
  );
}

function renderRecentApplications() {
  const jobs = [...currentJobs]
    .sort(
      (a, b) =>
        new Date(
          b.createdAt ||
            b.submittedAt ||
            0
        ) -
        new Date(
          a.createdAt ||
            a.submittedAt ||
            0
        )
    )
    .slice(0, 5);

  if (!jobs.length) {
    recentApplications.innerHTML =
      '<div class="empty-state">No applications available.</div>';
    return;
  }

  recentApplications.innerHTML =
    jobs
      .map(
        job => `
          <div class="recent-item">
            <div class="recent-avatar">
              ${initials(job.fullName)}
            </div>

            <div class="recent-info">
              <strong>
                ${escapeHtml(
                  job.fullName
                )}
              </strong>

              <span>
                ${escapeHtml(
                  job.email
                )}
              </span>
            </div>

            <span class="status ${escapeHtml(
              job.status || "pending"
            )}">
              ${escapeHtml(
                job.status || "pending"
              )}
            </span>
          </div>
        `
      )
      .join("");
}

function renderCommunity() {
  const search =
    communitySearch.value
      .trim()
      .toLowerCase();

  const filtered =
    currentCommunity.filter(
      member => {
        const domains =
          Array.isArray(member.domains)
            ? member.domains.join(" ")
            : member.domains || member.domain || "";

        const text = `
          ${member.fullName || ""}
          ${member.email || ""}
          ${member.university || ""}
          ${member.college || ""}
          ${domains}
        `.toLowerCase();

        return text.includes(search);
      }
    );

  if (!filtered.length) {
    communityTable.innerHTML =
      '<tr><td colspan="7">No community members found.</td></tr>';
    return;
  }

  communityTable.innerHTML =
    filtered
      .map(
        member => `
          <tr>
            <td>
              <div class="user-cell">
                <div class="user-avatar">
                  ${initials(
                    member.fullName
                  )}
                </div>

                <div>
                  <strong>
                    ${escapeHtml(
                      member.fullName ||
                        "-"
                    )}
                  </strong>

                  <span>
                    ${escapeHtml(
                      member.phone || ""
                    )}
                  </span>
                </div>
              </div>
            </td>

            <td>
              ${escapeHtml(
                member.email || "-"
              )}
            </td>

            <td>
              ${escapeHtml(
                member.degree || "-"
              )}
              <br>
              ${escapeHtml(
                member.university ||
                  member.college ||
                  "-"
              )}
            </td>

            <td>
              ${escapeHtml(
                Array.isArray(
                  member.domains
                )
                  ? member.domains.join(", ")
                  : member.domains ||
                    member.domain ||
                    "-"
              )}
            </td>

            <td>
              ${formatDate(
                member.createdAt ||
                  member.submittedAt
              )}
            </td>

            <td>
              <span class="status approved">
                Active
              </span>
            </td>

            <td>
              <div class="action-group">
                <button
                  class="action-btn"
                  onclick="viewCommunity('${escapeAttribute(
                    member.id
                  )}')"
                >
                  <i class="fa-solid fa-eye"></i>
                </button>

                <button
                  class="action-btn delete"
                  onclick="deleteCommunity('${escapeAttribute(
                    member.id
                  )}')"
                >
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `
      )
      .join("");
}

function renderJobs() {
  const search =
    jobSearch.value
      .trim()
      .toLowerCase();

  const filter =
    jobFilter.value;

  const filtered =
    currentJobs.filter(job => {
      const domains =
        Array.isArray(job.domains)
          ? job.domains.join(" ")
          : job.domains || job.domain || "";

      const skills =
        Array.isArray(job.skills)
          ? job.skills.join(" ")
          : job.skills || "";

      const text = `
        ${job.fullName || ""}
        ${job.email || ""}
        ${job.degree || ""}
        ${job.specialization || ""}
        ${domains}
        ${skills}
      `.toLowerCase();

      const matchesSearch =
        text.includes(search);

      const matchesFilter =
        filter === "all" ||
        (job.status || "pending") ===
          filter;

      return (
        matchesSearch &&
        matchesFilter
      );
    });

  if (!filtered.length) {
    jobTable.innerHTML =
      '<tr><td colspan="7">No job applications found.</td></tr>';
    return;
  }

  jobTable.innerHTML =
    filtered
      .map(
        job => `
          <tr>
            <td>
              <div class="user-cell">
                <div class="user-avatar">
                  ${initials(
                    job.fullName
                  )}
                </div>

                <div>
                  <strong>
                    ${escapeHtml(
                      job.fullName || "-"
                    )}
                  </strong>

                  <span>
                    ${escapeHtml(
                      job.email || "-"
                    )}
                  </span>
                </div>
              </div>
            </td>

            <td>
              ${escapeHtml(
                job.degree || "-"
              )}
              <br>
              ${escapeHtml(
                job.specialization ||
                  ""
              )}
            </td>

            <td>
              ${escapeHtml(
                Array.isArray(
                  job.domains
                )
                  ? job.domains.join(", ")
                  : job.domains ||
                    job.domain ||
                    "-"
              )}
            </td>

            <td>
              ${escapeHtml(
                [
                  ...(Array.isArray(job.availability) ? job.availability : job.availability ? [job.availability] : []),
                  job.internship,
                  job.workMode || job.mode || job.workType,
                  job.availableFrom,
                  job.duration
                ]
                  .filter(Boolean)
                  .join(", ") || "-"
              )}
            </td>

            <td>
              ${formatDate(
                job.createdAt ||
                  job.submittedAt
              )}
            </td>

            <td>
              <span class="status ${escapeHtml(
                job.status ||
                  "pending"
              )}">
                ${escapeHtml(
                  job.status ||
                    "pending"
                )}
              </span>
            </td>

            <td>
              <div class="action-group">
                <button
                  class="action-btn"
                  onclick="viewJob('${escapeAttribute(
                    job.id
                  )}')"
                >
                  <i class="fa-solid fa-eye"></i>
                </button>

                ${
                  job.status !==
                  "approved"
                    ? `
                      <button
                        class="action-btn approve"
                        onclick="approveJob('${escapeAttribute(
                          job.id
                        )}')"
                      >
                        <i class="fa-solid fa-check"></i>
                      </button>
                    `
                    : ""
                }

                ${
                  job.status !==
                  "rejected"
                    ? `
                      <button
                        class="action-btn"
                        onclick="rejectJob('${escapeAttribute(
                          job.id
                        )}')"
                      >
                        <i class="fa-solid fa-xmark"></i>
                      </button>
                    `
                    : ""
                }

                <button
                  class="action-btn delete"
                  onclick="deleteJob('${escapeAttribute(
                    job.id
                  )}')"
                >
                  <i class="fa-solid fa-trash"></i>
                </button>
              </div>
            </td>
          </tr>
        `
      )
      .join("");
}

function renderApproved() {
  const approved =
    currentJobs.filter(
      job => job.status === "approved"
    );

  if (!approved.length) {
    approvedGrid.innerHTML =
      '<div class="empty-state">No approved candidates yet.</div>';
    return;
  }

  approvedGrid.innerHTML =
    approved
      .map(
        job => `
          <div class="approved-card">
            <div class="card-user">
              <div class="card-user-avatar">
                ${initials(
                  job.fullName
                )}
              </div>

              <div>
                <strong>
                  ${escapeHtml(
                    job.fullName || "-"
                  )}
                </strong>

                <span>
                  ${escapeHtml(
                    job.email || "-"
                  )}
                </span>
              </div>
            </div>

            <div class="card-details">
              <div>
                <span>Domain</span>
                <b>
                  ${escapeHtml(
                    Array.isArray(
                      job.domains
                    )
                      ? job.domains.join(", ")
                      : job.domains ||
                        job.domain ||
                        "-"
                  )}
                </b>
              </div>

              <div>
                <span>Education</span>
                <b>
                  ${escapeHtml(
                    job.degree || "-"
                  )}
                </b>
              </div>

              <div>
                <span>Approved</span>
                <b>
                  ${formatDate(
                    job.approvedAt ||
                      job.createdAt ||
                      job.submittedAt
                  )}
                </b>
              </div>
            </div>

            <div class="card-actions">
              <button
                class="btn primary"
                onclick="openOfferModal('${escapeAttribute(
                  job.id
                )}')"
              >
                <i class="fa-solid fa-file-signature"></i>
                Offer Letter
              </button>

              <button
                class="btn"
                onclick="viewJob('${escapeAttribute(
                  job.id
                )}')"
              >
                View
              </button>
            </div>
          </div>
        `
      )
      .join("");
}

function renderOffers() {
  if (!currentOffers.length) {
    offerGrid.innerHTML =
      '<div class="empty-state">No offer letters created yet.</div>';
    return;
  }

  offerGrid.innerHTML =
    currentOffers
      .map(
        offer => `
          <div class="offer-card">
            <div class="card-user">
              <div class="card-user-avatar">
                <i class="fa-solid fa-file-signature"></i>
              </div>

              <div>
                <strong>
                  ${escapeHtml(
                    offer.candidateName ||
                      "-"
                  )}
                </strong>

                <span>
                  ${escapeHtml(
                    offer.jobTitle ||
                      offer.role ||
                      "-"
                  )}
                </span>
              </div>
            </div>

            <div class="card-details">
              <div>
                <span>Offer ID</span>
                <b>
                  ${escapeHtml(
                    offer.id || "-"
                  )}
                </b>
              </div>

              <div>
                <span>Joining</span>
                <b>
                  ${formatDate(
                    offer.joiningDate
                  )}
                </b>
              </div>

              <div>
                <span>Work Type</span>
                <b>
                  ${escapeHtml(
                    offer.employmentType ||
                      offer.workType ||
                      "-"
                  )}
                </b>
              </div>
            </div>

            <div class="card-actions">
              <button
                class="btn primary"
                onclick="printOffer('${escapeAttribute(
                  offer.id
                )}')"
              >
                <i class="fa-solid fa-print"></i>
                Print
              </button>

              <button
                class="btn"
                onclick="deleteOffer('${escapeAttribute(
                  offer.id
                )}')"
              >
                Delete
              </button>
            </div>
          </div>
        `
      )
      .join("");
}

function viewCommunity(id) {
  const member =
    currentCommunity.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!member) return;

  drawerContent.innerHTML = `
    <div class="detail-head">
      <span class="eyebrow">
        COMMUNITY MEMBER
      </span>

      <h2>
        ${escapeHtml(
          member.fullName || "-"
        )}
      </h2>
    </div>

    ${detailRow(
      "Application ID",
      member.id
    )}

    ${detailRow(
      "Email",
      member.email
    )}

    ${detailRow(
      "Phone",
      member.phone
    )}

    ${detailRow(
      "College / University",
      member.university ||
        member.college
    )}

    ${detailRow(
      "Degree",
      member.degree
    )}

    ${detailRow(
      "Branch",
      member.specialization ||
        member.branch
    )}

    ${detailRow(
      "Current Year",
      member.currentYear
    )}

    ${detailRow(
      "Semester",
      member.semester
    )}

    ${detailRow(
      "Domain",
      Array.isArray(
        member.domains
      )
        ? member.domains.join(", ")
        : member.domains
    )}

    ${detailRow(
      "Joined",
      formatDate(
        member.createdAt ||
          member.submittedAt
      )
    )}
  `;

  detailsDrawer.classList.remove(
    "hidden"
  );
}

function viewJob(id) {
  const job = currentJobs.find(
    item => String(item.id) === String(id)
  );

  if (!job) return;

  const value = (item, fallback = "Not provided") => {
    if (item === null || item === undefined || item === "") return fallback;
    if (Array.isArray(item)) return item.length ? item.join(", ") : fallback;
    if (typeof item === "object") return Object.values(item).filter(Boolean).join(", ") || fallback;
    return String(item);
  };

  const linkValue = (label, url) => {
    if (!url) return detailRow(label, "Not provided");
    const safeUrl = escapeAttribute(url);
    return `
      <div class="detail-row">
        <span>${escapeHtml(label)}</span>
        <strong><a href="${safeUrl}" target="_blank" rel="noopener noreferrer">${escapeHtml(url)}</a></strong>
      </div>
    `;
  };

  const section = (title, content) => `
    <div style="margin-top:24px;padding-top:18px;border-top:1px solid rgba(255,255,255,.08);">
      <h3 style="margin:0 0 12px;font-size:15px;">${escapeHtml(title)}</h3>
      ${content}
    </div>
  `;

  const booleanLabel = (value, yes = "Yes", no = "No") => {
    if (value === true || String(value).toLowerCase() === "true") return yes;
    if (value === false || String(value).toLowerCase() === "false") return no;
    return "Not provided";
  };

  const selectedEmployment = [
    job.internship ? "Internship" : "",
    job.fullTime ? "Full Time" : "",
    job.partTime ? "Part Time" : ""
  ].filter(Boolean);

  const selectedWorkModes = [
    job.remote ? "Remote" : "",
    job.hybrid ? "Hybrid" : "",
    job.onsite ? "On-site" : ""
  ].filter(Boolean);

  const resume = job.resume || {};
  const profilePhoto = job.profilePhoto || {};

  drawerContent.innerHTML = `
    <div class="detail-head">
      <span class="eyebrow">JOB APPLICATION</span>
      <h2>${escapeHtml(value(job.fullName, "Unnamed Applicant"))}</h2>
      <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
        <span class="status ${escapeHtml(job.status || "pending")}">${escapeHtml(job.status || "pending")}</span>
      </div>
    </div>

    ${section("Personal Information", `
      ${detailRow("Application ID", value(job.applicationId || job.applicantId || job.id))}
      ${detailRow("Full Name", value(job.fullName))}
      ${detailRow("Email", value(job.email))}
      ${detailRow("Mobile", value(job.phone || job.mobile))}
      ${detailRow("Date of Birth", value(job.dateOfBirth || job.DOB || job.dob))}
      ${detailRow("Gender", value(job.gender))}
      ${detailRow("City", value(job.city))}
      ${detailRow("State", value(job.state))}
      ${detailRow("Country", value(job.country))}
      ${detailRow("Address", value(job.address))}
    `)}

    ${section("Social Profiles", `
      ${linkValue("LinkedIn", job.linkedin)}
      ${linkValue("GitHub", job.github)}
      ${linkValue("Portfolio", job.portfolio)}
    `)}

    ${section("10th Education", `
      ${detailRow("Board", value(job.tenBoard))}
      ${detailRow("Passing Year", value(job.tenYear))}
      ${detailRow("Percentage / CGPA", value(job.tenScore))}
    `)}

    ${section("12th Education", `
      ${detailRow("Board", value(job.twelveBoard))}
      ${detailRow("Stream", value(job.twelveStream))}
      ${detailRow("Passing Year", value(job.twelveYear))}
      ${detailRow("Percentage / CGPA", value(job.twelveScore))}
    `)}

    ${section("Graduation", `
      ${detailRow("College / University", value(job.university || job.college))}
      ${detailRow("Degree", value(job.degree))}
      ${detailRow("Branch / Specialization", value(job.specialization || job.branch))}
      ${detailRow("Current Semester & Year", value(job.currentYear))}
      ${detailRow("Expected Graduation Year", value(job.expectedGraduationYear))}
      ${detailRow("Current / Final CGPA", value(job.cgpa))}
    `)}

    ${section("Availability", `
      ${detailRow("Employment Types", selectedEmployment.length ? selectedEmployment.join(", ") : "Not provided")}
      ${detailRow("Work Modes", selectedWorkModes.length ? selectedWorkModes.join(", ") : "Not provided")}
      ${detailRow("Available From", value(job.availableFrom))}
      ${detailRow("Preferred Duration", value(job.duration))}
    `)}

    ${section("Documents", `
      ${detailRow("Resume Name", value(resume.name || resume.originalName))}
      ${detailRow("Resume Type", value(resume.type))}
      ${detailRow("Resume Size", resume.size ? `${Math.round(Number(resume.size) / 1024)} KB` : "Not provided")}
      ${detailRow("Profile Photo", value(profilePhoto.name || profilePhoto.originalName))}
      ${detailRow("Profile Photo Type", value(profilePhoto.type))}
    `)}

    ${section("Application Metadata", `
      ${detailRow("Declaration", value(job.declaration))}
      ${detailRow("Status", value(job.status, "pending"))}
      ${detailRow("Submitted", formatDate(job.submittedAt || job.createdAt))}
      ${detailRow("Approved At", formatDate(job.approvedAt))}
      ${detailRow("Approved By", value(job.approvedBy))}
      ${detailRow("Rejected At", formatDate(job.rejectedAt))}
      ${detailRow("Rejected By", value(job.rejectedBy))}
      ${detailRow("Rejection Reason", value(job.rejectionReason))}
    `)}

    <div style="margin-top:25px;display:flex;gap:8px;flex-wrap:wrap;">
      ${job.status !== "approved"
        ? `
          <button class="btn primary" onclick="approveJob('${escapeAttribute(job.id)}');closeDrawer();">
            Approve
          </button>
        `
        : `
          <button class="btn primary" onclick="openOfferModal('${escapeAttribute(job.id)}');closeDrawer();">
            Offer Letter
          </button>
        `}
      ${job.status !== "rejected"
        ? `
          <button class="btn" onclick="rejectJob('${escapeAttribute(job.id)}');closeDrawer();">
            Reject
          </button>
        `
        : ""}
    </div>
  `;

  detailsDrawer.classList.remove("hidden");
}

function detailRow(label, value) {
  return `
    <div class="detail-row">
      <span>
        ${escapeHtml(label)}
      </span>

      <strong>
        ${escapeHtml(
          value || "-"
        )}
      </strong>
    </div>
  `;
}

if (drawerClose) {
  drawerClose.addEventListener(
    "click",
    closeDrawer
  );
}

if (detailsDrawer) {
  detailsDrawer.addEventListener(
    "click",
    event => {
      if (
        event.target ===
        detailsDrawer
      ) {
        closeDrawer();
      }
    }
  );
}

function closeDrawer() {
  detailsDrawer.classList.add(
    "hidden"
  );
}

async function approveJob(id) {
  const job =
    currentJobs.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!job) return;

  const confirmed = confirm(
    `Approve ${job.fullName}'s application?`
  );

  if (!confirmed) return;

  try {
    const data =
      await apiRequest(
        `/admin/jobs/${encodeURIComponent(
          id
        )}/approve`,
        {
          method: "PATCH"
        }
      );

    const updated =
      data.job ||
      data.data ||
      data;

    const index =
      currentJobs.findIndex(
        item =>
          String(item.id) ===
          String(id)
      );

    if (index !== -1) {
      currentJobs[index] =
        updated;
    }

    renderAll();

    showToast(
      "Application approved successfully."
    );
  } catch (error) {
    showToast(
      error.message ||
        "Unable to approve application.",
      "error"
    );
  }
}

async function rejectJob(id) {
  const job =
    currentJobs.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!job) return;

  const confirmed = confirm(
    `Reject ${job.fullName}'s application?`
  );

  if (!confirmed) return;

  try {
    const data =
      await apiRequest(
        `/admin/jobs/${encodeURIComponent(
          id
        )}/reject`,
        {
          method: "PATCH",
          body: JSON.stringify({
            reason:
              "Application rejected by admin"
          })
        }
      );

    const updated =
      data.job ||
      data.data ||
      data;

    const index =
      currentJobs.findIndex(
        item =>
          String(item.id) ===
          String(id)
      );

    if (index !== -1) {
      currentJobs[index] =
        updated;
    }

    renderAll();

    showToast(
      "Application rejected."
    );
  } catch (error) {
    showToast(
      error.message ||
        "Unable to reject application.",
      "error"
    );
  }
}

async function deleteJob(id) {
  const job =
    currentJobs.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!job) return;

  const confirmed = confirm(
    `Permanently delete ${job.fullName}'s application?`
  );

  if (!confirmed) return;

  try {
    await apiRequest(
      `/admin/jobs/${encodeURIComponent(
        id
      )}`,
      {
        method: "DELETE"
      }
    );

    currentJobs =
      currentJobs.filter(
        item =>
          String(item.id) !==
          String(id)
      );

    renderAll();

    showToast(
      "Application deleted successfully."
    );
  } catch (error) {
    showToast(
      error.message ||
        "Unable to delete application.",
      "error"
    );
  }
}

async function deleteCommunity(id) {
  const member =
    currentCommunity.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!member) return;

  const confirmed = confirm(
    `Delete ${member.fullName} from community records?`
  );

  if (!confirmed) return;

  try {
    await apiRequest(
      `/admin/community/${encodeURIComponent(
        id
      )}`,
      {
        method: "DELETE"
      }
    );

    currentCommunity =
      currentCommunity.filter(
        item =>
          String(item.id) !==
          String(id)
      );

    renderAll();

    showToast(
      "Community member deleted successfully."
    );
  } catch (error) {
    showToast(
      error.message ||
        "Unable to delete community member.",
      "error"
    );
  }
}

function openOfferModal(id) {
  const job =
    currentJobs.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!job) return;

  if (job.status !== "approved") {
    showToast(
      "Only approved candidates can receive an offer letter.",
      "error"
    );
    return;
  }

  const candidateId =
    document.getElementById(
      "offerCandidateId"
    );

  const candidateName =
    document.getElementById(
      "offerCandidateName"
    );

  const candidateEmail =
    document.getElementById(
      "offerCandidateEmail"
    );

  const role =
    document.getElementById(
      "offerRole"
    );

  const department =
    document.getElementById(
      "offerDepartment"
    );

  const joiningDate =
    document.getElementById(
      "offerJoiningDate"
    );

  const workType =
    document.getElementById(
      "offerWorkType"
    );

  const duration =
    document.getElementById(
      "offerDuration"
    );

  const compensation =
    document.getElementById(
      "offerCompensation"
    );

  const terms =
    document.getElementById(
      "offerTerms"
    );

  if (candidateId) {
    candidateId.value =
      job.id || "";
  }

  if (candidateName) {
    candidateName.value =
      job.fullName || "";
  }

  if (candidateEmail) {
    candidateEmail.value =
      job.email || "";
  }

  if (role) {
    role.value = "";
  }

  if (department) {
    department.value =
      "Technology";
  }

  if (joiningDate) {
    joiningDate.value = "";
  }

  if (workType) {
    workType.value =
      Array.isArray(
        job.availability
      )
        ? job.availability.find(
            item =>
              [
                "Remote",
                "Hybrid",
                "On-site",
                "Onsite"
              ].includes(item)
          ) || "Remote"
        : "Remote";
  }

  if (duration) {
    duration.value = "";
  }

  if (compensation) {
    compensation.value = "";
  }

  if (terms) {
    terms.value = "";
  }

  offerModal.classList.remove(
    "hidden"
  );
}

if (offerModalClose) {
  offerModalClose.addEventListener(
    "click",
    () => {
      offerModal.classList.add(
        "hidden"
      );
    }
  );
}

if (offerModal) {
  offerModal.addEventListener(
    "click",
    event => {
      if (
        event.target ===
        offerModal
      ) {
        offerModal.classList.add(
          "hidden"
        );
      }
    }
  );
}

if (offerForm) {
  offerForm.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      const candidateId =
        document.getElementById(
          "offerCandidateId"
        ).value;

      const job =
        currentJobs.find(
          item =>
            String(item.id) ===
            String(candidateId)
        );

      if (!job) {
        showToast(
          "Candidate not found.",
          "error"
        );
        return;
      }

      const offerPayload = {
        jobTitle:
          document
            .getElementById(
              "offerRole"
            )
            .value.trim(),

        department:
          document
            .getElementById(
              "offerDepartment"
            )
            .value.trim(),

        joiningDate:
          document.getElementById(
            "offerJoiningDate"
          ).value,

        salary:
          document
            .getElementById(
              "offerCompensation"
            )
            .value.trim(),

        location:
          document
            .getElementById(
              "offerWorkType"
            )
            .value.trim(),

        employmentType:
          document
            .getElementById(
              "offerDuration"
            )
            .value.trim() ||
          "Full Time",

        additionalMessage:
          document
            .getElementById(
              "offerTerms"
            )
            .value.trim()
      };

      const submitButton =
        offerForm.querySelector(
          'button[type="submit"]'
        );

      const originalText =
        submitButton
          ? submitButton.textContent
          : "";

      if (submitButton) {
        submitButton.disabled =
          true;
        submitButton.textContent =
          "Creating...";
      }

      try {
        const data =
          await apiRequest(
            `/admin/jobs/${encodeURIComponent(
              candidateId
            )}/offer-letter`,
            {
              method: "POST",
              body: JSON.stringify(
                offerPayload
              )
            }
          );

        const updatedJob =
          data.data ||
          data.job;

        if (updatedJob) {
          const index =
            currentJobs.findIndex(
              item =>
                String(item.id) ===
                String(candidateId)
            );

          if (index !== -1) {
            currentJobs[index] =
              updatedJob;
          }
        }

        await loadServerData();

        offerModal.classList.add(
          "hidden"
        );

        renderAll();

        showToast(
          "Offer letter created successfully."
        );
      } catch (error) {
        showToast(
          error.message ||
            "Unable to create offer letter.",
          "error"
        );
      } finally {
        if (submitButton) {
          submitButton.disabled =
            false;
          submitButton.textContent =
            originalText;
        }
      }
    }
  );
}

function printOffer(id) {
  const offer =
    currentOffers.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!offer) return;

  printOfferObject(offer);
}

function printOfferObject(offer) {
  const printWindow =
    window.open(
      "",
      "_blank",
      "width=900,height=900"
    );

  if (!printWindow) {
    showToast(
      "Please allow pop-ups to print the offer letter.",
      "error"
    );
    return;
  }

  const html = `
    <!doctype html>
    <html>
    <head>
      <title>
        ${escapeHtml(
          offer.id ||
            "Offer Letter"
        )}
        | Mewar Innovators Hub
      </title>

      <style>
        body {
          margin: 0;
          padding: 50px;
          font-family: Arial, sans-serif;
          color: #111;
          line-height: 1.6;
        }

        .letter {
          max-width: 800px;
          margin: auto;
          border: 1px solid #ddd;
          padding: 55px;
        }

        .header {
          display: flex;
          justify-content: flex-end;
          align-items: center;
          padding-bottom: 25px;
          border-bottom: 2px solid #111;
        }

        .company {
          text-align: right;
        }

        .company strong {
          display: block;
          font-size: 20px;
        }

        .company span {
          color: #e67b1e;
          font-size: 12px;
        }

        h1 {
          text-align: center;
          margin: 45px 0 35px;
          font-size: 25px;
          letter-spacing: 2px;
        }

        .date {
          text-align: right;
          margin-bottom: 30px;
        }

        .content {
          font-size: 14px;
        }

        .details {
          margin: 25px 0;
          padding: 20px;
          background: #f5f5f5;
        }

        .details p {
          margin: 7px 0;
        }

        .signature {
          margin-top: 70px;
        }

        .footer {
          margin-top: 60px;
          padding-top: 15px;
          border-top: 1px solid #ddd;
          text-align: center;
          color: #777;
          font-size: 11px;
        }

        @media print {
          body {
            padding: 0;
          }

          .letter {
            border: 0;
          }
        }
      </style>
    </head>

    <body>
      <div class="letter">
        <div class="header">
          <div class="company">
            <strong>
              Mewar Innovators Hub
            </strong>

            <span>
              Ideas. Innovate. Grow.
            </span>
          </div>
        </div>

        <h1>
          OFFER LETTER
        </h1>

        <div class="date">
          Date:
          ${escapeHtml(
            formatDate(
              offer.issueDate ||
                offer.createdAt
            )
          )}
        </div>

        <div class="content">
          <p>
            Dear
            <strong>
              ${escapeHtml(
                offer.candidateName ||
                  "-"
              )}
            </strong>,
          </p>

          <p>
            We are pleased to offer you
            the position of
            <strong>
              ${escapeHtml(
                offer.jobTitle ||
                  offer.role ||
                  "-"
              )}
            </strong>
            at Mewar Innovators Hub.
          </p>

          <div class="details">
            <p>
              <strong>Candidate:</strong>
              ${escapeHtml(
                offer.candidateName ||
                  "-"
              )}
            </p>

            <p>
              <strong>Position:</strong>
              ${escapeHtml(
                offer.jobTitle ||
                  offer.role ||
                  "-"
              )}
            </p>

            <p>
              <strong>Department:</strong>
              ${escapeHtml(
                offer.department ||
                  "-"
              )}
            </p>

            <p>
              <strong>Joining Date:</strong>
              ${escapeHtml(
                formatDate(
                  offer.joiningDate
                )
              )}
            </p>

            <p>
              <strong>Work Type:</strong>
              ${escapeHtml(
                offer.location ||
                  offer.workType ||
                  "-"
              )}
            </p>

            <p>
              <strong>Employment Type:</strong>
              ${escapeHtml(
                offer.employmentType ||
                  "-"
              )}
            </p>

            <p>
              <strong>Compensation:</strong>
              ${escapeHtml(
                offer.salary ||
                  "-"
              )}
            </p>
          </div>

          <p>
            We look forward to having you
            contribute to our team and
            community.
          </p>

          ${
            offer.additionalMessage
              ? `
                <p>
                  <strong>
                    Additional Terms:
                  </strong>
                  <br>
                  ${escapeHtml(
                    offer.additionalMessage
                  )}
                </p>
              `
              : ""
          }

          <div class="signature">
            <p>
              Regards,
            </p>

            <strong>
              Mewar Innovators Hub
            </strong>

            <br>

            Authorized Administration
          </div>
        </div>

        <div class="footer">
          ${escapeHtml(
            offer.id || ""
          )}
          · Mewar Innovators Hub
        </div>
      </div>

      <script>
        window.onload = function() {
          window.print();
        };
      <\/script>
    </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(
    html
  );
  printWindow.document.close();
}

async function deleteOffer(id) {
  const offer =
    currentOffers.find(
      item =>
        String(item.id) ===
        String(id)
    );

  if (!offer) return;

  const confirmed = confirm(
    `Delete offer letter ${offer.id}?`
  );

  if (!confirmed) return;

  try {
    const candidateId =
      offer.candidateId;

    if (!candidateId) {
      throw new Error(
        "Candidate ID not found for this offer."
      );
    }

    await apiRequest(
      `/admin/jobs/${encodeURIComponent(
        candidateId
      )}/offer-letter`,
      {
        method: "DELETE"
      }
    );

    currentOffers =
      currentOffers.filter(
        item =>
          String(item.id) !==
          String(id)
      );

    const jobIndex =
      currentJobs.findIndex(
        item =>
          String(item.id) ===
          String(candidateId)
      );

    if (jobIndex !== -1) {
      currentJobs[
        jobIndex
      ].offerLetter = null;

      if (
        currentJobs[jobIndex]
          .status ===
        "offer-issued"
      ) {
        currentJobs[jobIndex].status =
          "approved";
      }
    }

    renderAll();

    showToast(
      "Offer letter deleted successfully."
    );
  } catch (error) {
    showToast(
      error.message ||
        "Unable to delete offer letter.",
      "error"
    );
  }
}

if (communitySearch) {
  communitySearch.addEventListener(
    "input",
    renderCommunity
  );
}

if (jobSearch) {
  jobSearch.addEventListener(
    "input",
    renderJobs
  );
}

if (jobFilter) {
  jobFilter.addEventListener(
    "change",
    renderJobs
  );
}

const communityRefresh =
  document.getElementById(
    "communityRefresh"
  );

if (communityRefresh) {
  communityRefresh.addEventListener(
    "click",
    async () => {
      communityRefresh.disabled =
        true;

      try {
        const data =
          await apiRequest(
            "/admin/community"
          );

        currentCommunity =
          Array.isArray(data)
            ? data
            : data.items ||
              data.data ||
              [];

        renderCommunity();
        renderStats();

        showToast(
          "Community data refreshed."
        );
      } catch (error) {
        showToast(
          error.message ||
            "Unable to refresh community data.",
          "error"
        );
      } finally {
        communityRefresh.disabled =
          false;
      }
    }
  );
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll(
      "'",
      "&#039;"
    );
}

function escapeAttribute(value) {
  return String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("'", "\\'");
}

window.viewCommunity =
  viewCommunity;

window.viewJob =
  viewJob;

window.approveJob =
  approveJob;

window.rejectJob =
  rejectJob;

window.deleteJob =
  deleteJob;

window.deleteCommunity =
  deleteCommunity;

window.openOfferModal =
  openOfferModal;

window.printOffer =
  printOffer;

window.deleteOffer =
  deleteOffer;

window.closeDrawer =
  closeDrawer;

checkSession();
