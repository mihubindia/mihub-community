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
const verificationForm = document.getElementById("verificationForm");
const verificationDocument = document.getElementById("verificationDocument");
const verificationFilePreview = document.getElementById("verificationFilePreview");
const verificationMessage = document.getElementById("verificationMessage");
const verificationGrid = document.getElementById("verificationGrid");
const verificationRefresh = document.getElementById("verificationRefresh");

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
let currentVerifications = [];
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

  const response = await fetch(`${API_BASE}${path}`, {
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
        `${API_BASE}/admin/login`,
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
          `${API_BASE}/admin/verify-otp`,
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
    offers: "Offer Letters",
    verification: "Document Verification"
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
      currentVerifications = [];

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
  const [communityResult, jobsResult, offersResult, verificationResult] = await Promise.allSettled([
    apiRequest("/admin/community"),
    apiRequest("/admin/jobs"),
    apiRequest("/admin/offers"),
    apiRequest("/admin/verification")
  ]);

  if (communityResult.status === "rejected") throw communityResult.reason;
  if (jobsResult.status === "rejected") throw jobsResult.reason;
  if (offersResult.status === "rejected") throw offersResult.reason;

  const communityData = communityResult.value;
  const jobsData = jobsResult.value;
  const offersData = offersResult.value;

  currentCommunity = Array.isArray(communityData)
    ? communityData
    : communityData.items || communityData.data || [];

  currentJobs = Array.isArray(jobsData)
    ? jobsData
    : jobsData.items || jobsData.data || [];

  currentOffers = Array.isArray(offersData)
    ? offersData
    : offersData.items || offersData.data || [];

  if (verificationResult.status === "fulfilled") {
    const verificationData = verificationResult.value;
    currentVerifications = Array.isArray(verificationData)
      ? verificationData
      : verificationData.items || verificationData.data || [];
  } else {
    currentVerifications = [];
  }

  return {
    community: currentCommunity,
    jobs: currentJobs,
    offers: currentOffers,
    verifications: currentVerifications
  };
}

function renderAll() {
  renderStats();
  renderRecentApplications();
  renderCommunity();
  renderJobs();
  renderApproved();
  renderOffers();
  renderVerifications();
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
          ${member.graduationInstitute || ""}
          ${domains}
          ${member.skills || ""}
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
                  member.graduationInstitute ||
                  "-"
              )}
            </td>

            <td>
              ${escapeHtml(
                Array.isArray(member.domains)
                  ? member.domains.join(", ")
                  : member.domains || member.domain || "-"
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

function getEmploymentTypes(job) {
  const labels = [];
  if (job.internship === true || job.internship === "true") labels.push("Internship");
  if (job.fullTime === true || job.fullTime === "true") labels.push("Full Time");
  if (job.partTime === true || job.partTime === "true") labels.push("Part Time");
  if (!labels.length && Array.isArray(job.employmentTypes)) return job.employmentTypes.filter(Boolean);
  if (!labels.length && typeof job.employmentTypes === "string") return [job.employmentTypes];
  return labels;
}

function getWorkModes(job) {
  const labels = [];
  if (job.remote === true || job.remote === "true") labels.push("Remote");
  if (job.hybrid === true || job.hybrid === "true") labels.push("Hybrid");
  if (job.onsite === true || job.onsite === "true") labels.push("Onsite");
  if (!labels.length && Array.isArray(job.workModes)) return job.workModes.filter(Boolean);
  if (!labels.length && typeof job.workModes === "string") return [job.workModes];
  return labels;
}

function getAvailabilityText(job) {
  const employment = getEmploymentTypes(job);
  const modes = getWorkModes(job);
  const parts = [];
  if (employment.length) parts.push(employment.join(", "));
  if (modes.length) parts.push(modes.join(", "));
  if (job.availableFrom) parts.push(`From ${formatDate(job.availableFrom)}`);
  if (job.duration) parts.push(job.duration);
  return parts.join(" • ") || "Not provided";
}

function renderJobs() {
  const search = jobSearch.value.trim().toLowerCase();
  const filter = jobFilter.value;

  const filtered = currentJobs.filter(job => {
    const employment = getEmploymentTypes(job).join(" ");
    const modes = getWorkModes(job).join(" ");
    const text = `
      ${job.applicationId || job.applicantId || job.id || ""}
      ${job.fullName || ""}
      ${job.email || ""}
      ${job.phone || ""}
      ${job.degree || ""}
      ${job.specialization || ""}
      ${job.university || ""}
      ${employment}
      ${modes}
      ${job.duration || ""}
    `.toLowerCase();

    const matchesSearch = text.includes(search);
    const matchesFilter = filter === "all" || (job.status || "pending") === filter;
    return matchesSearch && matchesFilter;
  });

  if (!filtered.length) {
    jobTable.innerHTML = '<tr><td colspan="6">No job applications found.</td></tr>';
    return;
  }

  jobTable.innerHTML = filtered.map(job => `
    <tr>
      <td>
        <div class="user-cell">
          <div class="user-avatar">${initials(job.fullName)}</div>
          <div>
            <strong>${escapeHtml(job.fullName || "-")}</strong>
            <span>${escapeHtml(job.email || "-")}</span>
          </div>
        </div>
      </td>
      <td>
        ${escapeHtml(job.degree || "-")}<br>
        ${escapeHtml(job.specialization || job.university || "")}
      </td>
      <td>${escapeHtml(getAvailabilityText(job))}</td>
      <td>${formatDate(job.createdAt || job.submittedAt)}</td>
      <td>
        <span class="status ${escapeHtml(job.status || "pending")}">
          ${escapeHtml(job.status || "pending")}
        </span>
      </td>
      <td>
        <div class="action-group">
          <button class="action-btn" onclick="viewJob('${escapeAttribute(job.id)}')">
            <i class="fa-solid fa-eye"></i>
          </button>
          ${job.status !== "approved" ? `
            <button class="action-btn approve" onclick="approveJob('${escapeAttribute(job.id)}')">
              <i class="fa-solid fa-check"></i>
            </button>
          ` : ""}
          ${job.status !== "rejected" ? `
            <button class="action-btn" onclick="rejectJob('${escapeAttribute(job.id)}')">
              <i class="fa-solid fa-xmark"></i>
            </button>
          ` : ""}
          <button class="action-btn delete" onclick="deleteJob('${escapeAttribute(job.id)}')">
            <i class="fa-solid fa-trash"></i>
          </button>
        </div>
      </td>
    </tr>
  `).join("");
}

function renderApproved() {
  const approved = currentJobs.filter(job => job.status === "approved");

  if (!approved.length) {
    approvedGrid.innerHTML = '<div class="empty-state">No approved candidates yet.</div>';
    return;
  }

  approvedGrid.innerHTML = approved.map(job => `
    <div class="approved-card">
      <div class="card-user">
        <div class="card-user-avatar">${initials(job.fullName)}</div>
        <div>
          <strong>${escapeHtml(job.fullName || "-")}</strong>
          <span>${escapeHtml(job.email || "-")}</span>
        </div>
      </div>
      <div class="card-details">
        <div>
          <span>Application ID</span>
          <b>${escapeHtml(job.applicationId || job.applicantId || job.id || "-")}</b>
        </div>
        <div>
          <span>Education</span>
          <b>${escapeHtml(job.degree || "-")}</b>
        </div>
        <div>
          <span>Availability</span>
          <b>${escapeHtml(getAvailabilityText(job))}</b>
        </div>
      </div>
      <div class="card-actions">
        <button class="btn primary" onclick="openOfferModal('${escapeAttribute(job.id)}')">
          <i class="fa-solid fa-file-signature"></i>
          Offer Letter
        </button>
        <button class="btn" onclick="viewJob('${escapeAttribute(job.id)}')">View</button>
      </div>
    </div>
  `).join("");
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
  const member = currentCommunity.find(
    item => String(item.id) === String(id)
  );

  if (!member) return;

  const value = (item, fallback = "Not provided") => {
    if (item === null || item === undefined || item === "") return fallback;
    if (Array.isArray(item)) return item.length ? item.join(", ") : fallback;
    if (typeof item === "object") return Object.values(item).filter(Boolean).join(", ") || fallback;
    return String(item);
  };

  const section = (title, content) => `
    <div style="margin-top:24px;padding-top:18px;border-top:1px solid rgba(255,255,255,.08);">
      <h3 style="margin:0 0 12px;font-size:15px;">${escapeHtml(title)}</h3>
      ${content}
    </div>
  `;

  drawerContent.innerHTML = `
    <div class="detail-head">
      <span class="eyebrow">COMMUNITY MEMBER</span>
      <h2>${escapeHtml(value(member.fullName, "Unnamed Member"))}</h2>
      <div style="margin-top:8px;display:flex;gap:8px;flex-wrap:wrap;">
        <span class="status ${escapeHtml(member.status || "pending")}">${escapeHtml(member.status || "pending")}</span>
      </div>
    </div>

    ${section("Personal Information", `
      ${detailRow("Application ID", value(member.applicationId || member.applicantId || member.id))}
      ${detailRow("Full Name", value(member.fullName))}
      ${detailRow("Email", value(member.email))}
      ${detailRow("Mobile", value(member.phone))}
      ${detailRow("City", value(member.city))}
      ${detailRow("State", value(member.state))}
    `)}

    ${section("Secondary Education (10th)", `
      ${detailRow("Board", value(member.tenthBoard))}
      ${detailRow("Passing Year", value(member.tenthYear))}
      ${detailRow("Percentage", value(member.tenthPercentage))}
    `)}

    ${section("Senior Secondary Education (12th)", `
      ${detailRow("Board", value(member.twelfthBoard))}
      ${detailRow("Passing Year", value(member.twelfthYear))}
      ${detailRow("Percentage", value(member.twelfthPercentage))}
    `)}

    ${section("Graduation", `
      ${detailRow("University / College", value(member.university || member.college || member.graduationInstitute))}
      ${detailRow("Degree", value(member.degree))}
      ${detailRow("Branch", value(member.branch || member.specialization))}
      ${detailRow("Current Year", value(member.currentYear))}
      ${detailRow("Current Semester", value(member.semester))}
      ${detailRow("Expected Graduation Year", value(member.graduationYear || member.expectedGraduationYear))}
    `)}

    ${section("Career Interests & Skills", `
      ${detailRow("Domain", value(member.domains || member.domain))}
      ${detailRow("Skills", value(member.skillsList || member.skills))}
      ${detailRow("Why Join MI Hub", value(member.reason))}
      ${detailRow("Additional Description", value(member.description))}
    `)}

    ${section("Submission", `
      ${detailRow("Status", value(member.status, "pending"))}
      ${detailRow("Submitted", formatDate(member.submittedAt || member.createdAt))}
    `)}

    <div style="margin-top:25px;display:flex;gap:8px;flex-wrap:wrap;">
      <button class="btn delete" onclick="deleteCommunity('${escapeAttribute(member.id)}');closeDrawer();">Delete</button>
    </div>
  `;

  detailsDrawer.classList.remove("hidden");
}

function viewJob(id) {
  const job = currentJobs.find(item => String(item.id) === String(id));
  if (!job) return;

  const value = (item, fallback = "Not provided") => {
    if (item === null || item === undefined || item === "") return fallback;
    if (Array.isArray(item)) return item.length ? item.join(", ") : fallback;
    if (typeof item === "object") return Object.values(item).filter(Boolean).join(", ") || fallback;
    if (typeof item === "boolean") return item ? "Yes" : "No";
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

  const employmentTypes = getEmploymentTypes(job);
  const workModes = getWorkModes(job);
  const resume = job.resume || {};
  const profilePhoto = job.profilePhoto || {};

  const documentButton = (label, document, icon) => {
    if (!document || !document.data) return detailRow(label, "Not provided");
    const href = escapeAttribute(document.data);
    return `
      <div class="detail-row">
        <span>${escapeHtml(label)}</span>
        <strong>
          <a href="${href}" target="_blank" rel="noopener noreferrer" download="${escapeAttribute(document.name || label)}">
            <i class="fa-solid ${icon}"></i> Open Document
          </a>
        </strong>
      </div>
    `;
  };

  const profilePreview = profilePhoto.data
    ? `<div style="margin:12px 0;text-align:center;"><img src="${escapeAttribute(profilePhoto.data)}" alt="Profile Photo" style="max-width:180px;max-height:180px;border-radius:14px;object-fit:cover;border:1px solid rgba(255,255,255,.12);"></div>`
    : "";

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
      ${detailRow("Employment Types", employmentTypes.length ? employmentTypes.join(", ") : "Not provided")}
      ${detailRow("Work Modes", workModes.length ? workModes.join(", ") : "Not provided")}
      ${detailRow("Available From", job.availableFrom ? formatDate(job.availableFrom) : "Not provided")}
      ${detailRow("Preferred Duration", value(job.duration))}
    `)}

    ${section("Documents", `
      ${detailRow("Resume Name", value(resume.name))}
      ${detailRow("Resume Type", value(resume.type))}
      ${detailRow("Resume Size", resume.size ? `${Math.round(Number(resume.size) / 1024)} KB` : "Not provided")}
      ${documentButton("Resume", resume, "fa-file-arrow-down")}
      ${profilePreview}
      ${detailRow("Profile Photo", value(profilePhoto.name))}
      ${detailRow("Profile Photo Type", value(profilePhoto.type))}
    `)}

    ${section("Application Metadata", `
      ${detailRow("Declaration", value(job.declaration))}
      ${detailRow("Status", value(job.status, "pending"))}
      ${detailRow("Submitted", formatDate(job.submittedAt || job.createdAt))}
      ${detailRow("Approved At", job.approvedAt ? formatDate(job.approvedAt) : "-")}
      ${detailRow("Approved By", value(job.approvedBy))}
      ${detailRow("Rejected At", job.rejectedAt ? formatDate(job.rejectedAt) : "-")}
      ${detailRow("Rejected By", value(job.rejectedBy))}
      ${detailRow("Rejection Reason", value(job.rejectionReason))}
    `)}

    <div style="margin-top:25px;display:flex;gap:8px;flex-wrap:wrap;">
      ${job.status !== "approved" ? `
        <button class="btn primary" onclick="approveJob('${escapeAttribute(job.id)}');closeDrawer();">
          Approve
        </button>
      ` : `
        <button class="btn primary" onclick="openOfferModal('${escapeAttribute(job.id)}');closeDrawer();">
          Offer Letter
        </button>
      `}
      ${job.status !== "rejected" ? `
        <button class="btn" onclick="rejectJob('${escapeAttribute(job.id)}');closeDrawer();">
          Reject
        </button>
      ` : ""}
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
  const printWindow = window.open("", "_blank", "width=900,height=1100");

  if (!printWindow) {
    showToast("Please allow pop-ups to print the offer letter.", "error");
    return;
  }

  const candidateName = offer.candidateName || "-";
  const jobTitle = offer.jobTitle || offer.role || "-";
  const department = offer.department || "-";
  const joiningDate = formatDate(offer.joiningDate);
  const issueDate = formatDate(offer.issueDate || offer.createdAt);
  const location = offer.location || offer.workType || "-";
  const employmentType = offer.employmentType || "-";
  const salary = offer.salary || "-";
  const reference = offer.referenceNo || offer.offerId || offer.id || "MIH/HR/OFFER/001";
  const additionalMessage = offer.additionalMessage || "";

  const html = `
<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(reference)} | Offer Letter | Mewar Innovators Hub</title>
<style>
@page{size:A4 portrait;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:#fff;color:#064da8;font-family:Arial,Helvetica,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}
body{font-size:9.3pt;line-height:1.28}
.sheet{width:210mm;height:297mm;padding:8mm 9mm 7mm;margin:0 auto;position:relative;overflow:hidden;background:#fff}
.top-accent{position:absolute;top:0;left:0;width:31mm;height:3mm;background:#f47a20;transform:skewX(-38deg);transform-origin:left top}
.top-accent2{position:absolute;top:0;left:0;width:43mm;height:1.5mm;background:#0b4da2;transform:skewX(-38deg);transform-origin:left top}
.header{height:27mm;display:grid;grid-template-columns:58% 42%;align-items:center;border-bottom:1.1px solid #0b5fc7;padding-bottom:3mm}
.logo-wrap{display:flex;align-items:center;height:100%}
.logo{width:66mm;height:auto;max-height:23mm;object-fit:contain;object-position:left center}
.contact{border-left:1.2px solid #0b5fc7;padding-left:7mm;display:grid;gap:1.25mm;font-size:8.3pt;font-weight:700;line-height:1.15}
.contact div{display:flex;align-items:center;gap:2.5mm;white-space:nowrap}
.contact .icon{width:4mm;text-align:center;font-size:10pt}
.rule-row{display:grid;grid-template-columns:1fr auto 1fr;gap:4mm;align-items:center;margin:4mm 0 3mm}
.rule{height:1px;background:#0b5fc7}
.title{margin:0;padding:2mm 10mm;background:#1158a8;color:#fff;font-size:18pt;line-height:1;font-weight:800;letter-spacing:1px;text-align:center;white-space:nowrap}
.meta{display:flex;justify-content:space-between;font-size:8.6pt;font-weight:700;margin-bottom:3.2mm}
.recipient{margin-bottom:3mm;font-size:9.3pt;line-height:1.32}
.recipient strong{font-size:10.5pt}
.salutation{margin:2.5mm 0 1.5mm}
.intro{margin:0 0 2.5mm;text-align:justify}
.section-title{display:flex;align-items:center;gap:2.5mm;font-size:11.3pt;font-weight:800;margin:2.4mm 0 1.4mm}
.section-no{font-size:11.5pt;min-width:6mm}
.details{width:100%;border-collapse:collapse;font-size:8.7pt;margin-bottom:2.2mm}
.details th,.details td{border:1px solid #3b91e8;padding:1.35mm 2.2mm;text-align:left;vertical-align:middle}
.details th{background:#d9efff;font-weight:800}
.terms{margin:0;padding-left:7mm;font-size:8.6pt}
.terms li{padding-left:1mm;margin-bottom:1.15mm;text-align:justify}
.closing{margin:2.5mm 0 1.8mm;text-align:justify}
.sign-area{display:grid;grid-template-columns:1fr 1fr 1fr 32mm;gap:4mm;align-items:end;margin-top:2.2mm}
.sign{height:24mm;text-align:center;font-size:7.8pt}
.sign-name{font-family:"Brush Script MT","Segoe Script",cursive;font-size:17pt;color:#0b4fd0;line-height:1.05;margin-bottom:1mm}
.sign-line{border-top:1px solid #0b5fc7;margin-bottom:1mm}
.sign strong{font-size:8pt}
.seal{width:30mm;height:30mm;object-fit:contain;align-self:end;justify-self:end}
.acceptance{border-top:1px solid #0b5fc7;margin-top:2.5mm;padding-top:1.7mm}
.acceptance-title{text-align:center;font-weight:800;font-size:10.8pt;margin-bottom:1.5mm}
.acceptance p{margin:0 0 2mm;font-size:8.5pt}
.accept-grid{display:grid;grid-template-columns:28mm 1fr 14mm 32mm;gap:2mm;align-items:end;font-size:8.2pt}
.accept-line{border-bottom:1px solid #333;height:4.5mm}
.footer{position:absolute;left:9mm;right:9mm;bottom:5mm;border-top:1px solid #0b5fc7;padding-top:1.8mm;text-align:center;font-weight:800;font-size:8.8pt;color:#fff;background:#0750a7;min-height:8mm;display:flex;align-items:center;justify-content:center}
.footer:before{content:"";position:absolute;left:-9mm;bottom:-5mm;width:22mm;height:10mm;background:#f47a20;transform:skewX(38deg)}
.footer:after{content:"";position:absolute;right:-9mm;bottom:-5mm;width:22mm;height:10mm;background:#f47a20;transform:skewX(-38deg)}
.sign {
    height: 24mm !important;
    text-align: center !important;
    font-size: 7.8pt !important;
    position: relative !important;
    line-height: 1 !important;
}

.signature-img {
    width: 105px !important;
    height: 42px !important;
    object-fit: contain !important;
    display: block !important;
    margin: 0 auto 0 !important;
}

.sign-line {
    width: 105px !important;
    border-top: 1px solid #0b5fc7 !important;
    margin: 0 auto 0.8mm !important;
}

.sign strong {
    display: block !important;
    font-size: 8pt !important;
    line-height: 1 !important;
    margin: 0 !important;
}

.sign br {
    display: none !important;
}

.sign strong::after {
    content: "";
    display: block;
    height: 0.8mm;
}

.sign {
    line-height: 1 !important;
}
@media screen{body{background:#e9eef5}.sheet{box-shadow:0 0 18px rgba(0,0,0,.18)}}
@media print{body{background:#fff}.sheet{box-shadow:none}}
</style>
</head>
<body>
<div class="sheet">
  <div class="top-accent"></div>
  <div class="top-accent2"></div>

 

  <div class="meta">
    <span>Ref. No.: ${escapeHtml(reference)}</span>
    <span>Date: ${escapeHtml(issueDate)}</span>
  </div>

  <div class="rule-row">
    <div class="rule"></div>
    <h1 class="title">OFFER LETTER</h1>
    <div class="rule"></div>
  </div>

  <div class="recipient">
    <div>To,</div>
    <strong>Mr./Ms. ${escapeHtml(candidateName)}</strong>
  </div>

  <div class="salutation">Dear <strong>${escapeHtml(candidateName)}</strong>,</div>

  <p class="intro">We are pleased to offer you employment with <strong>MI HUB</strong> for the position of <strong>${escapeHtml(jobTitle)}</strong>, subject to the terms and conditions mentioned in this letter.</p>

  <div class="section-title"><span class="section-no">1.</span><span>Employment Details</span></div>
  <table class="details">
    <thead><tr><th style="width:39%">Particulars</th><th>Details</th></tr></thead>
    <tbody>
      <tr><td>Designation</td><td>${escapeHtml(jobTitle)}</td></tr>
      <tr><td>Department</td><td>${escapeHtml(department)}</td></tr>
      <tr><td>Joining Date</td><td>${escapeHtml(joiningDate)}</td></tr>
      <tr><td>Work Type</td><td>${escapeHtml(location)}</td></tr>
      <tr><td>Duration</td><td>${escapeHtml(employmentType)}</td></tr>
      <tr><td>Compensation</td><td>${escapeHtml(salary)}</td></tr>
    </tbody>
  </table>

  <div class="section-title"><span class="section-no">2.</span><span>Terms and Conditions</span></div>
  <ol class="terms">
    <li>Your employment will be subject to the applicable probation period and company policies.</li>
    <li>You will be entitled to applicable benefits as per the company's policy and the nature of your engagement.</li>
    <li>The notice period for resignation will be as specified in the applicable company policy or agreement.</li>
    <li>Your employment is subject to satisfactory verification of the information and documents provided by you.</li>
    <li>You are expected to abide by the company's rules, policies and code of conduct, as amended from time to time.</li>
  </ol>

  ${additionalMessage ? `<p class="closing"><strong>Additional Terms:</strong> ${escapeHtml(additionalMessage)}</p>` : ""}
  <p class="closing">Please sign and return a copy of this letter as confirmation of your acceptance of this offer. We look forward to having you as a part of our team and wish you a successful career with us.</p>

  <div style="font-weight:800;margin-top:1mm">For MI HUB</div>

  <div class="sign-area">
    <div class="sign">
        <img class="signature-img" src="${new URL("assets/md-salman-signature.png", window.location.href).href}" alt="Md Salman Signature">
        <div class="sign-line"></div>
        <strong>(MD SALMAN)</strong>
        <br>
        CEO
    </div>

    <div class="sign">
        <img class="signature-img" src="${new URL("assets/sujit-kumar-signature.png", window.location.href).href}" alt="Sujit Kumar Signature">
        <div class="sign-line"></div>
        <strong>(SUJIT KUMAR)</strong>
        <br>
        Founder
    </div>

    <div class="sign">
        <img class="signature-img" src="${new URL("assets/md-shahil-raja-signature.png", window.location.href).href}" alt="Md Shahil Raja Signature">
        <div class="sign-line"></div>
        <strong>(MD SHAHIL RAJA)</strong>
        <br>
        Co-Founder
    </div>

    <img class="seal" src="${new URL("assets/mi-hub-seal.png", window.location.href).href}" alt="MI Hub Seal">
</div>

  <div class="acceptance">
    <div class="acceptance-title">ACCEPTANCE OF OFFER</div>
    <p>I, <strong>${escapeHtml(candidateName)}</strong>, hereby accept the offer of employment with <strong>MI HUB</strong> on the terms and conditions stated above.</p>
    <div class="accept-grid">
      <span>Signature:</span><span class="accept-line"></span><span>Name:</span><span>${escapeHtml(candidateName)}</span>
      <span>Date:</span><span class="accept-line"></span><span>Offer ID:</span><span>${escapeHtml(reference)}</span>
    </div>
  </div>

  <div class="footer">Together We Build a Better Tomorrow</div>
</div>
<script>
window.onload=function(){setTimeout(function(){window.print()},250)};
</script>
</body>
</html>`;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}

function setVerificationMessage(message, type = "") {
  if (!verificationMessage) return;
  verificationMessage.textContent = message || "";
  verificationMessage.className = `form-message ${type}`.trim();
}

function renderVerificationFilePreview() {
  if (!verificationFilePreview) return;
  const file = verificationDocument?.files?.[0];

  if (!file) {
    verificationFilePreview.innerHTML = "";
    return;
  }

  const sizeMb = file.size / (1024 * 1024);
  if (sizeMb > 10) {
    verificationFilePreview.innerHTML = `<span>File is larger than 10 MB.</span>`;
    return;
  }

  const type = file.type || "";
  if (type === "application/pdf") {
    verificationFilePreview.innerHTML = `
      <div style="display:flex;align-items:center;gap:10px;padding:12px;border:1px solid rgba(255,255,255,.1);border-radius:10px;">
        <i class="fa-solid fa-file-pdf"></i>
        <span>${escapeHtml(file.name)} · ${Math.round(file.size / 1024)} KB</span>
      </div>
    `;
    return;
  }

  if (type.startsWith("image/")) {
    const reader = new FileReader();
    reader.onload = () => {
      verificationFilePreview.innerHTML = `
        <div style="padding:12px;border:1px solid rgba(255,255,255,.1);border-radius:10px;">
          <img src="${escapeAttribute(reader.result)}" alt="Verification Preview" style="max-width:100%;max-height:300px;display:block;margin:0 auto;border-radius:8px;object-fit:contain;">
          <div style="margin-top:8px;text-align:center;">${escapeHtml(file.name)} · ${Math.round(file.size / 1024)} KB</div>
        </div>
      `;
    };
    reader.readAsDataURL(file);
  }
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error("Unable to read the selected file."));
    reader.readAsDataURL(file);
  });
}

function renderVerifications() {
  if (!verificationGrid) return;

  if (!currentVerifications.length) {
    verificationGrid.innerHTML = '<div class="empty-state">No verification documents found.</div>';
    return;
  }

  verificationGrid.innerHTML = currentVerifications.map(record => {
    const document = record.document || {};
    const documentUrl = document.data || record.documentUrl || "";
    const documentName = document.name || record.documentName || "Official Document";
    const isImage = String(document.type || "").startsWith("image/") || /\.(png|jpe?g)$/i.test(documentName);

    return `
      <div class="offer-card verification-card">
        <div class="card-user">
          <div class="card-user-avatar">
            <i class="fa-solid ${isImage ? "fa-image" : "fa-file-pdf"}"></i>
          </div>
          <div>
            <strong>${escapeHtml(record.offerId || "-")}</strong>
            <span>${escapeHtml(record.applicationId || "-")}</span>
          </div>
        </div>

        <div class="card-details">
          <div>
            <span>Verification ID</span>
            <b>${escapeHtml(record.verificationId || record.id || "-")}</b>
          </div>
          <div>
            <span>Document</span>
            <b>${escapeHtml(documentName)}</b>
          </div>
          <div>
            <span>Created</span>
            <b>${formatDate(record.createdAt || record.submittedAt)}</b>
          </div>
        </div>

        <div class="card-actions">
          ${documentUrl ? `<a class="btn primary" href="${escapeAttribute(documentUrl)}" target="_blank" rel="noopener noreferrer">Open</a>` : ""}
          <button class="btn" onclick="deleteVerification('${escapeAttribute(record.id || record.verificationId || "")}')">Delete</button>
        </div>
      </div>
    `;
  }).join("");
}

async function saveVerification(event) {
  event.preventDefault();
  setVerificationMessage("");

  const offerId = document.getElementById("verificationOfferId")?.value.trim();
  const applicationId = document.getElementById("verificationApplicationId")?.value.trim();
  const file = verificationDocument?.files?.[0];

  if (!offerId || !applicationId || !file) {
    setVerificationMessage("Offer ID, Application ID and document are required.", "error");
    return;
  }

  const allowedTypes = ["application/pdf", "image/png", "image/jpeg"];
  const allowedExtensions = /\.(pdf|png|jpe?g)$/i;

  if (!allowedTypes.includes(file.type) && !allowedExtensions.test(file.name)) {
    setVerificationMessage("Only PDF, PNG, JPG or JPEG files are allowed.", "error");
    return;
  }

  if (file.size > 10 * 1024 * 1024) {
    setVerificationMessage("Maximum document size is 10 MB.", "error");
    return;
  }

  const button = document.getElementById("saveVerificationBtn");
  const originalText = button?.innerHTML || "";

  if (button) {
    button.disabled = true;
    button.innerHTML = "Saving...";
  }

  try {
    const dataUrl = await fileToDataUrl(file);
    const extension = file.name.split(".").pop().toLowerCase();

    const payload = {
      offerId,
      applicationId,
      document: {
        name: file.name,
        originalName: file.name,
        type: file.type || (extension === "pdf" ? "application/pdf" : `image/${extension === "jpg" || extension === "jpeg" ? "jpeg" : "png"}`),
        extension,
        size: file.size,
        data: dataUrl
      }
    };

    const result = await apiRequest("/admin/verification", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    const saved = result.data || result.verification || result;
    if (saved && (saved.id || saved.verificationId)) {
      currentVerifications.unshift(saved);
    } else {
      const refreshed = await apiRequest("/admin/verification");
      currentVerifications = Array.isArray(refreshed) ? refreshed : refreshed.items || refreshed.data || [];
    }

    verificationForm?.reset();
    if (verificationFilePreview) verificationFilePreview.innerHTML = "";
    setVerificationMessage("Verification document saved successfully.", "success");
    renderVerifications();
    showToast("Verification document saved successfully.");
  } catch (error) {
    setVerificationMessage(error.message || "Unable to save verification document.", "error");
    showToast(error.message || "Unable to save verification document.", "error");
  } finally {
    if (button) {
      button.disabled = false;
      button.innerHTML = originalText;
    }
  }
}

async function deleteVerification(id) {
  if (!id) return;
  const record = currentVerifications.find(item => String(item.id || item.verificationId) === String(id));
  if (!record) return;

  if (!confirm(`Delete verification record for ${record.applicationId || "this application"}?`)) return;

  try {
    await apiRequest(`/admin/verification/${encodeURIComponent(id)}`, { method: "DELETE" });
    currentVerifications = currentVerifications.filter(item => String(item.id || item.verificationId) !== String(id));
    renderVerifications();
    showToast("Verification record deleted successfully.");
  } catch (error) {
    showToast(error.message || "Unable to delete verification record.", "error");
  }
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

if (verificationDocument) {
  verificationDocument.addEventListener("change", renderVerificationFilePreview);
}

if (verificationForm) {
  verificationForm.addEventListener("submit", saveVerification);
}

if (verificationRefresh) {
  verificationRefresh.addEventListener("click", async () => {
    verificationRefresh.disabled = true;
    try {
      const data = await apiRequest("/admin/verification");
      currentVerifications = Array.isArray(data) ? data : data.items || data.data || [];
      renderVerifications();
      showToast("Verification records refreshed.");
    } catch (error) {
      showToast(error.message || "Unable to refresh verification records.", "error");
    } finally {
      verificationRefresh.disabled = false;
    }
  });
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

window.deleteVerification =
  deleteVerification;

window.closeDrawer =
  closeDrawer;

checkSession();