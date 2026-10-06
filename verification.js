const API_BASE_URL = "https://mihub-community.onrender.com/api";

const form = document.getElementById("verificationForm");
const applicationIdInput = document.getElementById("applicationId");
const offerIdInput = document.getElementById("offerId");
const verifyBtn = document.getElementById("verifyBtn");
const message = document.getElementById("message");
const resultCard = document.getElementById("resultCard");
const resultApplicationId = document.getElementById("resultApplicationId");
const resultOfferId = document.getElementById("resultOfferId");
const resultDocumentName = document.getElementById("resultDocumentName");
const resultUploadedAt = document.getElementById("resultUploadedAt");
const documentTitle = document.getElementById("documentTitle");
const documentViewer = document.getElementById("documentViewer");
const openDocument = document.getElementById("openDocument");
const verifyAnother = document.getElementById("verifyAnother");
const year = document.getElementById("year");

if (year) {
    year.textContent = new Date().getFullYear();
}

function showMessage(text, type = "info") {
    if (!message) return;

    message.textContent = text;
    message.className = `message show ${type}`;
}

function hideMessage() {
    if (!message) return;

    message.textContent = "";
    message.className = "message";
}

function setLoading(loading) {
    if (!verifyBtn) return;

    verifyBtn.disabled = loading;

    if (loading) {
        verifyBtn.innerHTML =
            '<span>Verifying...</span><i class="fa-solid fa-spinner fa-spin"></i>';
    } else {
        verifyBtn.innerHTML =
            '<span>Verify Document</span><i class="fa-solid fa-arrow-right"></i>';
    }
}

function formatDate(value) {
    if (!value) {
        return "Not available";
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short"
    });
}

function clearViewer() {
    if (!documentViewer) return;

    documentViewer.innerHTML = "";

    if (openDocument) {
        openDocument.href = "#";
        openDocument.classList.add("hidden");
    }
}

function renderDocument(record) {
    clearViewer();

    const documentData = record?.document;

    if (!documentData?.data) {
        documentViewer.innerHTML =
            '<div class="document-fallback"><i class="fa-solid fa-file-circle-xmark"></i><div>Document data is unavailable.</div></div>';

        return;
    }

    const dataUrl = documentData.data;
    const type = String(documentData.type || "").toLowerCase();
    const extension = String(documentData.extension || "").toLowerCase();

    if (openDocument) {
        openDocument.href = dataUrl;
        openDocument.classList.remove("hidden");
    }

    if (
        type === "application/pdf" ||
        extension === "pdf"
    ) {
        const iframe = document.createElement("iframe");

        iframe.src = dataUrl;
        iframe.title = documentData.name || "Verified PDF document";
        iframe.loading = "lazy";

        documentViewer.appendChild(iframe);

        return;
    }

    if (
        type === "image/png" ||
        type === "image/jpeg" ||
        type === "image/jpg" ||
        ["png", "jpg", "jpeg"].includes(extension)
    ) {
        const img = document.createElement("img");

        img.src = dataUrl;
        img.alt = documentData.name || "Verified document";
        img.loading = "lazy";

        documentViewer.appendChild(img);

        return;
    }

    documentViewer.innerHTML =
        '<div class="document-fallback"><i class="fa-solid fa-file"></i><div>This document type cannot be previewed here.</div></div>';
}

function showResult(record) {
    resultApplicationId.textContent =
        record.applicationId || "-";

    resultOfferId.textContent =
        record.offerId || "-";

    resultDocumentName.textContent =
        record.document?.name ||
        record.document?.originalName ||
        "-";

    resultUploadedAt.textContent =
        formatDate(record.uploadedAt);

    documentTitle.textContent =
        record.document?.name ||
        "Verified Document";

    renderDocument(record);

    resultCard.classList.remove("hidden");

    requestAnimationFrame(() => {
        resultCard.scrollIntoView({
            behavior: "smooth",
            block: "start"
        });
    });
}

async function verifyDocument(applicationId, offerId) {
    const params = new URLSearchParams({
        applicationId,
        offerId
    });

    const response = await fetch(
        `${API_BASE_URL}/verification?${params.toString()}`,
        {
            method: "GET",
            headers: {
                Accept: "application/json"
            }
        }
    );

    let data;

    try {
        data = await response.json();
    } catch {
        throw new Error("Server returned an invalid response.");
    }

    if (!response.ok || !data.success) {
        throw new Error(
            data.message || "Verification failed."
        );
    }

    return data.data;
}

if (form) {
    form.addEventListener("submit", async event => {
        event.preventDefault();

        hideMessage();

        const applicationId =
            String(applicationIdInput?.value || "").trim();

        const offerId =
            String(offerIdInput?.value || "").trim();

        if (!applicationId || !offerId) {
            showMessage(
                "Please enter both Application ID and Offer ID.",
                "error"
            );

            return;
        }

        resultCard.classList.add("hidden");

        clearViewer();

        setLoading(true);

        try {
            const record = await verifyDocument(
                applicationId,
                offerId
            );

            showResult(record);
        } catch (error) {
            showMessage(
                error.message ||
                "Document verification failed.",
                "error"
            );
        } finally {
            setLoading(false);
        }
    });
}

if (verifyAnother) {
    verifyAnother.addEventListener("click", () => {
        resultCard.classList.add("hidden");

        clearViewer();

        hideMessage();

        if (applicationIdInput) {
            applicationIdInput.focus();
        }

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });
    });
}

const params =
    new URLSearchParams(window.location.search);

const initialApplicationId =
    params.get("applicationId");

const initialOfferId =
    params.get("offerId");

if (initialApplicationId && applicationIdInput) {
    applicationIdInput.value =
        initialApplicationId;
}

if (initialOfferId && offerIdInput) {
    offerIdInput.value =
        initialOfferId;
}

if (
    initialApplicationId &&
    initialOfferId &&
    form
) {
    form.requestSubmit();
}