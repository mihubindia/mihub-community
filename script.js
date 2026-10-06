const form = document.getElementById("communityForm");

const steps = [...document.querySelectorAll(".form-step")];
const nextBtn = document.getElementById("nextBtn");
const prevBtn = document.getElementById("prevBtn");
const submitBtn = document.getElementById("submitBtn");

const progressBar = document.getElementById("progressBar");
const progressLabel = document.getElementById("progressLabel");
const progressPercent = document.getElementById("progressPercent");
const stepDots = [...document.querySelectorAll(".step-dot")];

const successCard = document.getElementById("successCard");
const editBtn = document.getElementById("editBtn");
const toast = document.getElementById("toast");

const menuToggle = document.getElementById("menuToggle");
const navLinks = document.getElementById("navLinks");

const API_BASE_URL = "https://mihub-community.onrender.com/api";

let currentStep = 0;

const titles = steps.map(step => step.dataset.title);

const COMMUNITY_FIELDS = [
  "id",
  "fullName",
  "email",
  "phone",
  "city",
  "state",
  "institute",
  "tenthBoard",
  "tenthYear",
  "tenthPercentage",
  "twelfthBoard",
  "twelfthYear",
  "twelfthPercentage",
  "graduationInstitute",
  "degree",
  "branch",
  "currentYear",
  "semester",
  "graduationYear",
  "domain",
  "skills",
  "reason",
  "submittedAt"
];

const EXCEL_COLUMNS = [
  {
    key: "id",
    label: "ID"
  },
  {
    key: "fullName",
    label: "Full Name"
  },
  {
    key: "email",
    label: "Email"
  },
  {
    key: "phone",
    label: "Phone"
  },
  {
    key: "graduationInstitute",
    label: "University / College Name"
  },
  {
    key: "degree",
    label: "Degree"
  },
  {
    key: "branch",
    label: "Branch"
  },
  {
    key: "currentYear",
    label: "Current Year"
  },
  {
    key: "domain",
    label: "Domain"
  },
  {
    key: "skills",
    label: "Skills"
  },
  {
    key: "reason",
    label: "Why do you want to join MI Hub?"
  }
];

function generateApplicationId() {
  const timestamp = Date.now();

  const randomPart = Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase();

  return `COM_${timestamp}_${randomPart}`;
}

function cleanApplicationData(source = {}) {
  const cleanData = {};

  COMMUNITY_FIELDS.forEach(field => {
    if (
      Object.prototype.hasOwnProperty.call(
        source,
        field
      )
    ) {
      cleanData[field] = source[field];
    }
  });

  return cleanData;
}

function createApplicationData() {
  const formData = new FormData(form);

  const rawData = Object.fromEntries(
    formData.entries()
  );

  const applicationData = {
    id: generateApplicationId(),

    fullName: String(
      rawData.fullName || ""
    ).trim(),

    email: String(
      rawData.email || ""
    ).trim(),

    phone: String(
      rawData.phone || ""
    ).trim(),

    city: String(
      rawData.city || ""
    ).trim(),

    state: String(
      rawData.state || ""
    ).trim(),

    institute: String(
      rawData.institute || ""
    ).trim(),

    tenthBoard: String(
      rawData.tenthBoard || ""
    ).trim(),

    tenthYear: String(
      rawData.tenthYear || ""
    ).trim(),

    tenthPercentage: String(
      rawData.tenthPercentage || ""
    ).trim(),

    twelfthBoard: String(
      rawData.twelfthBoard || ""
    ).trim(),

    twelfthYear: String(
      rawData.twelfthYear || ""
    ).trim(),

    twelfthPercentage: String(
      rawData.twelfthPercentage || ""
    ).trim(),

    graduationInstitute: String(
      rawData.graduationInstitute || ""
    ).trim(),

    degree: String(
      rawData.degree || ""
    ).trim(),

    branch: String(
      rawData.branch || ""
    ).trim(),

    currentYear: String(
      rawData.currentYear || ""
    ).trim(),

    semester: String(
      rawData.semester || ""
    ).trim(),

    graduationYear: String(
      rawData.graduationYear || ""
    ).trim(),

    domain: String(
      rawData.domain || ""
    ).trim(),

    skills: String(
      rawData.skills || ""
    ).trim(),

    reason: String(
      rawData.reason || ""
    ).trim(),

    submittedAt: new Date().toISOString()
  };

  return cleanApplicationData(
    applicationData
  );
}

function updateProgress() {
  const pct =
    ((currentStep + 1) / steps.length) * 100;

  if (progressBar) {
    progressBar.style.width = `${pct}%`;
  }

  if (progressLabel) {
    progressLabel.textContent =
      `Step ${currentStep + 1} of ${steps.length} · ${titles[currentStep]}`;
  }

  if (progressPercent) {
    progressPercent.textContent =
      `${pct}%`;
  }

  stepDots.forEach((dot, index) => {
    dot.classList.toggle(
      "active",
      index === currentStep
    );

    dot.classList.toggle(
      "done",
      index < currentStep
    );
  });

  if (prevBtn) {
    prevBtn.disabled = currentStep === 0;
  }

  if (currentStep === steps.length - 1) {
    if (nextBtn) {
      nextBtn.style.display = "none";
    }

    if (submitBtn) {
      submitBtn.style.display = "inline-flex";
    }
  } else {
    if (nextBtn) {
      nextBtn.style.display = "inline-flex";
    }

    if (submitBtn) {
      submitBtn.style.display = "none";
    }
  }
}

function showStep(index) {
  if (
    index < 0 ||
    index >= steps.length
  ) {
    return;
  }

  steps.forEach((step, stepIndex) => {
    step.classList.toggle(
      "active",
      stepIndex === index
    );
  });

  currentStep = index;

  updateProgress();

  const formSection =
    document.querySelector(".form-section");

  if (formSection) {
    window.scrollTo({
      top: formSection.offsetTop - 95,
      behavior: "smooth"
    });
  }
}

function validateStep(index) {
  let valid = true;

  const fields = [
    ...steps[index].querySelectorAll(
      "input[required], select[required], textarea[required]"
    )
  ];

  fields.forEach(field => {
    const wrapper =
      field.closest(".field");

    if (!wrapper) {
      return;
    }

    const error =
      wrapper.querySelector(".error");

    wrapper.classList.remove(
      "invalid"
    );

    if (error) {
      error.textContent = "";
    }

    const value = String(
      field.value || ""
    ).trim();

    if (!value) {
      valid = false;

      wrapper.classList.add(
        "invalid"
      );

      if (error) {
        error.textContent =
          "This field is required.";
      }

      return;
    }

    if (
      field.type === "email" &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
        value
      )
    ) {
      valid = false;

      wrapper.classList.add(
        "invalid"
      );

      if (error) {
        error.textContent =
          "Enter a valid email address.";
      }

      return;
    }

    if (field.type === "number") {
      const numberValue =
        Number(value);

      const min =
        field.min !== ""
          ? Number(field.min)
          : null;

      const max =
        field.max !== ""
          ? Number(field.max)
          : null;

      if (
        (min !== null &&
          numberValue < min) ||
        (max !== null &&
          numberValue > max)
      ) {
        valid = false;

        wrapper.classList.add(
          "invalid"
        );

        if (error) {
          error.textContent =
            `Enter a value between ${field.min} and ${field.max}.`;
        }
      }
    }
  });

  if (!valid) {
    const firstInvalid =
      steps[index].querySelector(
        ".invalid input, .invalid select, .invalid textarea"
      );

    if (firstInvalid) {
      firstInvalid.focus();
    }

    showToast(
      "Please complete the required fields."
    );
  }

  return valid;
}

if (nextBtn) {
  nextBtn.addEventListener(
    "click",
    () => {
      if (
        validateStep(currentStep) &&
        currentStep <
          steps.length - 1
      ) {
        showStep(
          currentStep + 1
        );
      }
    }
  );
}

if (prevBtn) {
  prevBtn.addEventListener(
    "click",
    () => {
      if (currentStep > 0) {
        showStep(
          currentStep - 1
        );
      }
    }
  );
}

if (form) {
  form.addEventListener(
    "submit",
    async event => {
      event.preventDefault();

      if (
        !validateStep(
          currentStep
        )
      ) {
        return;
      }

      const data =
        createApplicationData();

      console.log(
        "DATA SENT TO SERVER:",
        data
      );

      const originalButtonText =
        submitBtn
          ? submitBtn.innerHTML
          : "Submit";

      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent =
          "Submitting...";
      }

      try {
        const response =
          await fetch(
            `${API_BASE_URL}/community`,
            {
              method: "POST",

              headers: {
                "Content-Type":
                  "application/json"
              },

              body: JSON.stringify(
                data
              )
            }
          );

        const result =
          await response
            .json()
            .catch(
              () => ({})
            );

        if (!response.ok) {
          throw new Error(
            result.message ||
              "Unable to submit your application."
          );
        }

        let savedData =
          cleanApplicationData(
            data
          );

        if (
          result.data &&
          typeof result.data ===
            "object"
        ) {
          const serverData =
            cleanApplicationData(
              result.data
            );

          savedData = {
            ...savedData,
            ...serverData
          };
        }

        if (!savedData.id) {
          savedData.id =
            data.id;
        }

        if (!savedData.submittedAt) {
          savedData.submittedAt =
            data.submittedAt;
        }

        savedData =
          cleanApplicationData(
            savedData
          );

        localStorage.setItem(
          "miHubCommunityApplication",
          JSON.stringify(
            savedData
          )
        );

        localStorage.setItem(
          "miHubCommunitySubmitted",
          "true"
        );

        form.hidden = true;

        if (successCard) {
          successCard.hidden =
            false;

          successCard.scrollIntoView(
            {
              behavior: "smooth",
              block: "center"
            }
          );
        }

        showToast(
          "Community registration submitted successfully."
        );
      } catch (error) {
        console.error(
          "Community submission error:",
          error
        );

        showToast(
          error.message ||
            "Unable to connect with the server. Please try again."
        );
      } finally {
        if (submitBtn) {
          submitBtn.disabled =
            false;

          submitBtn.innerHTML =
            originalButtonText;
        }
      }
    }
  );
}

if (editBtn) {
  editBtn.addEventListener(
    "click",
    event => {
      const clickedLink =
        event.target.closest(
          "a"
        );

      if (clickedLink) {
        return;
      }

      localStorage.removeItem(
        "miHubCommunitySubmitted"
      );

      if (successCard) {
        successCard.hidden =
          true;
      }

      if (form) {
        form.hidden = false;
      }

      showStep(0);
    }
  );
}

function showToast(message) {
  if (!toast) {
    return;
  }

  toast.textContent =
    message;

  toast.classList.add(
    "show"
  );
}

if (
  menuToggle &&
  navLinks
) {
  menuToggle.addEventListener(
    "click",
    () => {
      const open =
        navLinks.classList.toggle(
          "open"
        );

      menuToggle.setAttribute(
        "aria-expanded",
        String(open)
      );
    }
  );

  navLinks
    .querySelectorAll("a")
    .forEach(link => {
      link.addEventListener(
        "click",
        () => {
          navLinks.classList.remove(
            "open"
          );

          menuToggle.setAttribute(
            "aria-expanded",
            "false"
          );
        }
      );
    });
}

let revealObserver = null;

if (
  "IntersectionObserver" in
  window
) {
  revealObserver =
    new IntersectionObserver(
      entries => {
        entries.forEach(
          entry => {
            if (
              entry.isIntersecting
            ) {
              entry.target.classList.add(
                "visible"
              );

              revealObserver.unobserve(
                entry.target
              );
            }
          }
        );
      },
      {
        threshold: 0.12
      }
    );
}

document
  .querySelectorAll(
    ".reveal"
  )
  .forEach(element => {
    if (revealObserver) {
      revealObserver.observe(
        element
      );
    } else {
      element.classList.add(
        "visible"
      );
    }
  });

const particleLayer =
  document.querySelector(
    ".particles"
  );

if (particleLayer) {
  for (
    let i = 0;
    i < 22;
    i++
  ) {
    const particle =
      document.createElement(
        "span"
      );

    particle.className =
      "particle";

    particle.style.left =
      `${Math.random() * 100}%`;

    particle.style.animationDuration =
      `${8 + Math.random() * 13}s`;

    particle.style.animationDelay =
      `${-Math.random() * 15}s`;

    const size =
      3 + Math.random() * 4;

    particle.style.width =
      `${size}px`;

    particle.style.height =
      `${size}px`;

    particleLayer.appendChild(
      particle
    );
  }
}

function loadSavedApplication() {
  const saved =
    localStorage.getItem(
      "miHubCommunityApplication"
    );

  if (!saved) {
    return;
  }

  try {
    const parsedData =
      JSON.parse(saved);

    const data =
      cleanApplicationData(
        parsedData
      );

    COMMUNITY_FIELDS.forEach(
      key => {
        if (
          key === "id" ||
          key === "submittedAt"
        ) {
          return;
        }

        const field =
          form.elements[key];

        if (!field) {
          return;
        }

        if (
          typeof data[key] ===
            "string" ||
          typeof data[key] ===
            "number"
        ) {
          field.value =
            data[key];
        }
      }
    );
  } catch (error) {
    console.error(
      "Unable to load saved application:",
      error
    );
  }
}

function restoreSubmittedState() {
  const submitted =
    localStorage.getItem(
      "miHubCommunitySubmitted"
    );

  const savedApplication =
    localStorage.getItem(
      "miHubCommunityApplication"
    );

  if (
    submitted === "true" &&
    savedApplication
  ) {
    if (form) {
      form.hidden = true;
    }

    if (successCard) {
      successCard.hidden =
        false;
    }
  }
}

function escapeExcelValue(value) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value)
    .replace(
      /"/g,
      '""'
    )
    .replace(
      /\r?\n|\r/g,
      " "
    );
}

function createExcelCompatibleCSV(
  data
) {
  const rows = [];

  const headerRow =
    EXCEL_COLUMNS
      .map(
        column =>
          `"${escapeExcelValue(
            column.label
          )}"`
      )
      .join(",");

  rows.push(
    headerRow
  );

  data.forEach(
    record => {
      const row =
        EXCEL_COLUMNS
          .map(
            column =>
              `"${escapeExcelValue(
                record[
                  column.key
                ]
              )}"`
          )
          .join(",");

      rows.push(row);
    }
  );

  return (
    "\uFEFF" +
    rows.join("\r\n")
  );
}

function downloadExcel(
  data = null
) {
  let records = [];

  if (
    Array.isArray(data)
  ) {
    records =
      data.map(
        item =>
          cleanApplicationData(
            item
          )
      );
  } else {
    const saved =
      localStorage.getItem(
        "miHubCommunityApplication"
      );

    if (saved) {
      try {
        records = [
          cleanApplicationData(
            JSON.parse(
              saved
            )
          )
        ];
      } catch (error) {
        console.error(
          "Unable to read saved application:",
          error
        );
      }
    }
  }

  if (!records.length) {
    showToast(
      "No community application data available."
    );

    return;
  }

  const csvContent =
    createExcelCompatibleCSV(
      records
    );

  const blob =
    new Blob(
      [csvContent],
      {
        type:
          "text/csv;charset=utf-8;"
      }
    );

  const url =
    URL.createObjectURL(
      blob
    );

  const link =
    document.createElement(
      "a"
    );

  const date =
    new Date()
      .toISOString()
      .slice(0, 10);

  link.href =
    url;

  link.download =
    `MI_Hub_Community_${date}.csv`;

  document.body.appendChild(
    link
  );

  link.click();

  document.body.removeChild(
    link
  );

  URL.revokeObjectURL(
    url
  );

  showToast(
    "Community data exported successfully."
  );
}

window.downloadCommunityExcel =
  downloadExcel;

window.downloadCommunityData =
  function(data) {
    downloadExcel(data);
  };

window.getCommunityApplication =
  function() {
    const saved =
      localStorage.getItem(
        "miHubCommunityApplication"
      );

    if (!saved) {
      return null;
    }

    try {
      return cleanApplicationData(
        JSON.parse(
          saved
        )
      );
    } catch (error) {
      return null;
    }
  };

window.clearCommunityApplication =
  function() {
    localStorage.removeItem(
      "miHubCommunityApplication"
    );

    localStorage.removeItem(
      "miHubCommunitySubmitted"
    );

    showToast(
      "Saved community application removed from this device."
    );
  };

loadSavedApplication();

restoreSubmittedState();

updateProgress();
