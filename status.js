document.addEventListener("DOMContentLoaded", () => {
    const API_BASE = "https://mihub-community.onrender.com/api";

    const statusForm = document.getElementById("statusForm");
    const applicationIdInput = document.getElementById("applicationId");
    const emailInput = document.getElementById("email");

    const formMessage = document.getElementById("formMessage");

    const checkStatusBtn = document.getElementById("checkStatusBtn");
    const buttonText = document.getElementById("buttonText");
    const buttonLoader = document.getElementById("buttonLoader");

    const statusResult = document.getElementById("statusResult");

    const statusIcon = document.getElementById("statusIcon");
    const statusTitle = document.getElementById("statusTitle");
    const statusDescription = document.getElementById("statusDescription");

    const resultApplicationId =
        document.getElementById("resultApplicationId");

    const resultName =
        document.getElementById("resultName");

    const resultEmail =
        document.getElementById("resultEmail");

    const resultSubmittedAt =
        document.getElementById("resultSubmittedAt");

    const resultDecisionDate =
        document.getElementById("resultDecisionDate");

    const decisionDateRow =
        document.getElementById("decisionDateRow");

    const timelineSubmitted =
        document.getElementById("timelineSubmitted");

    const timelineReview =
        document.getElementById("timelineReview");

    const timelineDecision =
        document.getElementById("timelineDecision");

    const timelineDecisionTitle =
        document.getElementById("timelineDecisionTitle");

    const timelineDecisionText =
        document.getElementById("timelineDecisionText");

    const rejectionBox =
        document.getElementById("rejectionBox");

    const rejectionReason =
        document.getElementById("rejectionReason");

    const offerBox =
        document.getElementById("offerBox");

    const offerMessage =
        document.getElementById("offerMessage");

    const checkAgainBtn =
        document.getElementById("checkAgainBtn");

    function formatDate(value) {
        if (!value) {
            return "-";
        }

        const date = new Date(value);

        if (Number.isNaN(date.getTime())) {
            return String(value);
        }

        return date.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit"
        });
    }

    function normalizeStatus(status) {
        return String(status || "pending")
            .trim()
            .toLowerCase();
    }

    function setLoading(loading) {
        if (checkStatusBtn) {
            checkStatusBtn.disabled = loading;
        }

        if (buttonText) {
            buttonText.classList.toggle("hidden", loading);
        }

        if (buttonLoader) {
            buttonLoader.classList.toggle("hidden", !loading);
        }
    }

    function showMessage(message, type = "") {
        if (!formMessage) {
            return;
        }

        formMessage.textContent = message || "";
        formMessage.classList.remove(
            "success",
            "error",
            "warning"
        );

        if (type) {
            formMessage.classList.add(type);
        }
    }

    function resetStatusResult() {
        if (!statusResult) {
            return;
        }

        statusResult.classList.add("hidden");

        statusResult.classList.remove(
            "status-pending",
            "status-approved",
            "status-rejected"
        );

        if (rejectionBox) {
            rejectionBox.classList.add("hidden");
        }

        if (offerBox) {
            offerBox.classList.add("hidden");
        }

        if (timelineReview) {
            timelineReview.classList.remove(
                "active",
                "completed"
            );
        }

        if (timelineDecision) {
            timelineDecision.classList.remove(
                "active",
                "completed"
            );
        }

        if (decisionDateRow) {
            decisionDateRow.classList.add("hidden");
        }
    }

    function showStatusResult(responseData) {
        const application =
            responseData?.data ||
            responseData?.application ||
            responseData;

        if (!application) {
            throw new Error(
                "Application information was not returned by the server."
            );
        }

        const status = normalizeStatus(
            application.status
        );

        const applicationId =
            application.applicationId ||
            application.applicantId ||
            application.id ||
            "-";

        const fullName =
            application.fullName ||
            application.name ||
            application.candidateName ||
            "-";

        const email =
            application.email ||
            application.candidateEmail ||
            "-";

        const submittedAt =
            application.submittedAt ||
            application.createdAt ||
            null;

        if (resultApplicationId) {
            resultApplicationId.textContent =
                applicationId;
        }

        if (resultName) {
            resultName.textContent =
                fullName;
        }

        if (resultEmail) {
            resultEmail.textContent =
                email;
        }

        if (resultSubmittedAt) {
            resultSubmittedAt.textContent =
                formatDate(submittedAt);
        }

        if (timelineSubmitted) {
            timelineSubmitted.textContent =
                submittedAt
                    ? `Submitted on ${formatDate(submittedAt)}`
                    : "Application received";
        }

        resetStatusResult();

        if (
            status === "approved" ||
            status === "offer-issued"
        ) {
            if (statusResult) {
                statusResult.classList.add(
                    "status-approved"
                );
            }

            if (statusIcon) {
                statusIcon.textContent = "✓";
            }

            if (statusTitle) {
                statusTitle.textContent =
                    status === "offer-issued"
                        ? "Offer Issued"
                        : "Approved";
            }

            if (statusDescription) {
                statusDescription.textContent =
                    status === "offer-issued"
                        ? "Your application has been approved and an offer letter has been issued."
                        : "Your application has been approved by Mewar Innovators Hub.";
            }

            if (timelineReview) {
                timelineReview.classList.add(
                    "completed"
                );
            }

            if (timelineDecision) {
                timelineDecision.classList.add(
                    "active"
                );
            }

            if (timelineDecisionTitle) {
                timelineDecisionTitle.textContent =
                    status === "offer-issued"
                        ? "Offer Letter Issued"
                        : "Application Approved";
            }

            if (timelineDecisionText) {
                if (status === "offer-issued") {
                    timelineDecisionText.textContent =
                        application.offerIssuedAt
                            ? `Offer letter issued on ${formatDate(application.offerIssuedAt)}`
                            : "Your offer letter has been issued.";
                } else {
                    timelineDecisionText.textContent =
                        application.approvedAt
                            ? `Approved on ${formatDate(application.approvedAt)}`
                            : "Your application has been approved.";
                }
            }

            if (resultDecisionDate) {
                resultDecisionDate.textContent =
                    status === "offer-issued"
                        ? formatDate(
                            application.offerIssuedAt ||
                            application.approvedAt
                        )
                        : formatDate(
                            application.approvedAt
                        );
            }

            if (decisionDateRow) {
                decisionDateRow.classList.remove(
                    "hidden"
                );
            }

            if (offerBox) {
                offerBox.classList.remove(
                    "hidden"
                );
            }

            if (offerMessage) {
                offerMessage.textContent =
                    status === "offer-issued"
                        ? "Your offer letter has been issued. Please contact Mewar Innovators Hub for the next steps."
                        : "Your application has been approved. Please wait for further communication regarding your offer.";
            }

            if (statusResult) {
                statusResult.classList.remove(
                    "hidden"
                );
            }

            return;
        }

        if (status === "rejected") {
            if (statusResult) {
                statusResult.classList.add(
                    "status-rejected"
                );
            }

            if (statusIcon) {
                statusIcon.textContent = "×";
            }

            if (statusTitle) {
                statusTitle.textContent =
                    "Rejected";
            }

            if (statusDescription) {
                statusDescription.textContent =
                    "Your application was not selected for this opportunity.";
            }

            if (timelineReview) {
                timelineReview.classList.add(
                    "completed"
                );
            }

            if (timelineDecision) {
                timelineDecision.classList.add(
                    "active"
                );
            }

            if (timelineDecisionTitle) {
                timelineDecisionTitle.textContent =
                    "Application Rejected";
            }

            if (timelineDecisionText) {
                timelineDecisionText.textContent =
                    application.rejectedAt
                        ? `Rejected on ${formatDate(application.rejectedAt)}`
                        : "Your application has been rejected.";
            }

            if (resultDecisionDate) {
                resultDecisionDate.textContent =
                    formatDate(
                        application.rejectedAt
                    );
            }

            if (decisionDateRow) {
                decisionDateRow.classList.remove(
                    "hidden"
                );
            }

            if (
                rejectionReason &&
                application.rejectionReason
            ) {
                rejectionReason.textContent =
                    application.rejectionReason;

                if (rejectionBox) {
                    rejectionBox.classList.remove(
                        "hidden"
                    );
                }
            }

            if (statusResult) {
                statusResult.classList.remove(
                    "hidden"
                );
            }

            return;
        }

        if (statusResult) {
            statusResult.classList.add(
                "status-pending"
            );
        }

        if (statusIcon) {
            statusIcon.textContent = "…";
        }

        if (statusTitle) {
            statusTitle.textContent =
                "Pending";
        }

        if (statusDescription) {
            statusDescription.textContent =
                "Your application has been received and is currently under review.";
        }

        if (timelineReview) {
            timelineReview.classList.add(
                "active"
            );
        }

        if (timelineDecisionTitle) {
            timelineDecisionTitle.textContent =
                "Final Decision";
        }

        if (timelineDecisionText) {
            timelineDecisionText.textContent =
                "The final decision will appear here after the review is completed.";
        }

        if (resultDecisionDate) {
            resultDecisionDate.textContent =
                "Pending";
        }

        if (statusResult) {
            statusResult.classList.remove(
                "hidden"
            );
        }
    }

    async function checkApplicationStatus(
        applicationId,
        email
    ) {
        const cleanApplicationId =
            String(applicationId || "").trim();

        const cleanEmail =
            String(email || "")
                .trim()
                .toLowerCase();

        if (!cleanApplicationId) {
            throw new Error(
                "Application ID is required."
            );
        }

        if (!cleanEmail) {
            throw new Error(
                "Email address is required."
            );
        }

        const url =
            `${API_BASE}/jobs/status?applicationId=${encodeURIComponent(
                cleanApplicationId
            )}&email=${encodeURIComponent(
                cleanEmail
            )}`;

        const response =
            await fetch(url, {
                method: "GET",
                headers: {
                    Accept:
                        "application/json"
                },
                cache: "no-store"
            });

        let data = {};

        try {
            data =
                await response.json();
        } catch {
            data = {};
        }

        if (!response.ok) {
            throw new Error(
                data.message ||
                `Unable to check application status. Server returned ${response.status}.`
            );
        }

        if (!data.success) {
            throw new Error(
                data.message ||
                "Unable to find your application."
            );
        }

        return data;
    }

    function saveLastApplication(
        applicationId,
        email
    ) {
        try {
            localStorage.setItem(
                "mihub_last_application_id",
                applicationId
            );

            localStorage.setItem(
                "mihub_last_application_email",
                email
            );
        } catch {}
    }

    function loadLastApplication() {
        try {
            const savedApplicationId =
                localStorage.getItem(
                    "mihub_last_application_id"
                );

            const savedEmail =
                localStorage.getItem(
                    "mihub_last_application_email"
                );

            if (
                applicationIdInput &&
                !applicationIdInput.value &&
                savedApplicationId
            ) {
                applicationIdInput.value =
                    savedApplicationId;
            }

            if (
                emailInput &&
                !emailInput.value &&
                savedEmail
            ) {
                emailInput.value =
                    savedEmail;
            }
        } catch {}
    }

    if (statusForm) {
        statusForm.addEventListener(
            "submit",
            async event => {
                event.preventDefault();

                showMessage("");
                resetStatusResult();

                const applicationId =
                    applicationIdInput
                        ?.value
                        .trim() || "";

                const email =
                    emailInput
                        ?.value
                        .trim()
                        .toLowerCase() || "";

                if (!applicationId) {
                    showMessage(
                        "Please enter your Application ID.",
                        "error"
                    );

                    applicationIdInput?.focus();

                    return;
                }

                if (!email) {
                    showMessage(
                        "Please enter your email address.",
                        "error"
                    );

                    emailInput?.focus();

                    return;
                }

                setLoading(true);

                try {
                    const data =
                        await checkApplicationStatus(
                            applicationId,
                            email
                        );

                    saveLastApplication(
                        applicationId,
                        email
                    );

                    showStatusResult(
                        data
                    );

                    statusResult?.scrollIntoView(
                        {
                            behavior:
                                "smooth",
                            block:
                                "start"
                        }
                    );
                } catch (error) {
                    console.error(
                        "Status check error:",
                        error
                    );

                    showMessage(
                        error.message ||
                        "Unable to check application status.",
                        "error"
                    );
                } finally {
                    setLoading(false);
                }
            }
        );
    }

    if (checkAgainBtn) {
        checkAgainBtn.addEventListener(
            "click",
            () => {
                resetStatusResult();

                if (applicationIdInput) {
                    applicationIdInput.value =
                        "";
                }

                if (emailInput) {
                    emailInput.value =
                        "";
                }

                showMessage("");

                applicationIdInput?.focus();

                window.scrollTo({
                    top: 0,
                    behavior: "smooth"
                });
            }
        );
    }

    loadLastApplication();
});