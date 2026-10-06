document.addEventListener("DOMContentLoaded", () => {
    const API_BASE_URL = "https://mihub-community.onrender.com/api";

    const form = document.getElementById("applicationForm");
    const resumeInput = document.getElementById("resume");
    const resumeText = document.getElementById("resumeText");
    const resumePreview = document.getElementById("resumePreview");
    const profilePhotoInput = document.getElementById("profilePhoto");

    const successModal = document.getElementById("successModal");
    const successId = document.getElementById("successId");
    const successDate = document.getElementById("successDate");
    const successInfo = document.querySelector(".success-info");
    const closeSuccess = document.getElementById("closeSuccess");
    const formMessage = document.getElementById("formMessage");

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }

    function generateApplicationId() {
        const year = new Date().getFullYear();
        const array = new Uint32Array(1);

        if (window.crypto?.getRandomValues) {
            window.crypto.getRandomValues(array);

            return `MIH-${year}-${String(
                array[0] % 900000 + 100000
            )}`;
        }

        return `MIH-${year}-${Math.floor(
            100000 + Math.random() * 900000
        )}`;
    }

    function fileToDataURL(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = () => resolve(reader.result);

            reader.onerror = () => {
                reject(
                    new Error("Unable to read file.")
                );
            };

            reader.readAsDataURL(file);
        });
    }

    function convertImageToPNG(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();

            reader.onload = event => {
                const image = new Image();

                image.onload = () => {
                    const canvas =
                        document.createElement("canvas");

                    canvas.width = image.naturalWidth;
                    canvas.height = image.naturalHeight;

                    const context =
                        canvas.getContext("2d");

                    if (!context) {
                        reject(
                            new Error(
                                "Unable to process profile photo."
                            )
                        );
                        return;
                    }

                    context.drawImage(
                        image,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );

                    canvas.toBlob(
                        blob => {
                            if (!blob) {
                                reject(
                                    new Error(
                                        "Unable to convert profile photo to PNG."
                                    )
                                );
                                return;
                            }

                            const pngFile = new File(
                                [blob],
                                "profile-photo.png",
                                {
                                    type: "image/png"
                                }
                            );

                            fileToDataURL(pngFile)
                                .then(data => {
                                    resolve({
                                        name: "profile-photo.png",
                                        originalName: file.name,
                                        type: "image/png",
                                        extension: "png",
                                        size: blob.size,
                                        data
                                    });
                                })
                                .catch(reject);
                        },
                        "image/png"
                    );
                };

                image.onerror = () => {
                    reject(
                        new Error(
                            "Invalid profile photo."
                        )
                    );
                };

                image.src = event.target.result;
            };

            reader.onerror = () => {
                reject(
                    new Error(
                        "Unable to read profile photo."
                    )
                );
            };

            reader.readAsDataURL(file);
        });
    }

    async function prepareProfilePhoto() {
        if (!profilePhotoInput) return null;

        const file = profilePhotoInput.files[0];

        if (!file) return null;

        if (!file.type.startsWith("image/")) {
            throw new Error(
                "Please upload a valid profile photo."
            );
        }

        if (file.size > 2 * 1024 * 1024) {
            throw new Error(
                "Profile photo must be less than 2 MB."
            );
        }

        return await convertImageToPNG(file);
    }

    async function prepareResume() {
        if (!resumeInput) return null;

        const file = resumeInput.files[0];

        if (!file) return null;

        if (file.size > 5 * 1024 * 1024) {
            throw new Error(
                "Resume size must be less than 5 MB."
            );
        }

        const extension = file.name
            .split(".")
            .pop()
            .toLowerCase();

        const allowedExtensions = [
            "pdf",
            "doc",
            "docx"
        ];

        if (!allowedExtensions.includes(extension)) {
            throw new Error(
                "Please upload a PDF, DOC, or DOCX resume."
            );
        }

        const data = await fileToDataURL(file);

        return {
            name: file.name,
            type: file.type,
            extension,
            size: file.size,
            isPDF: extension === "pdf",
            data
        };
    }

    function validateResume() {
        if (!resumeInput) return true;

        const file = resumeInput.files[0];

        if (!file) return true;

        if (file.size > 5 * 1024 * 1024) {
            alert(
                "Resume size must be less than 5 MB."
            );

            resumeInput.value = "";

            if (resumeText) {
                resumeText.textContent = "Choose resume";
            }

            if (resumePreview) {
                resumePreview.classList.add("hidden");
                resumePreview.innerHTML = "";
            }

            return false;
        }

        const extension = file.name
            .split(".")
            .pop()
            .toLowerCase();

        if (
            !["pdf", "doc", "docx"].includes(
                extension
            )
        ) {
            alert(
                "Please upload a PDF, DOC, or DOCX resume."
            );

            resumeInput.value = "";

            if (resumeText) {
                resumeText.textContent = "Choose resume";
            }

            return false;
        }

        return true;
    }

    function validateProfilePhoto() {
        if (!profilePhotoInput) return true;

        const file = profilePhotoInput.files[0];

        if (!file) return true;

        if (file.size > 2 * 1024 * 1024) {
            alert(
                "Profile photo must be less than 2 MB."
            );

            profilePhotoInput.value = "";

            return false;
        }

        if (!file.type.startsWith("image/")) {
            alert(
                "Please upload a valid image."
            );

            profilePhotoInput.value = "";

            return false;
        }

        return true;
    }

    function getFormDataObject() {
        const formData = new FormData(form);
        const application = {};

        formData.forEach((value, key) => {
            if (value instanceof File) return;

            application[key] = String(value).trim();
        });

        application.internship =
            form.querySelector(
                '[name="internship"]'
            )?.checked === true;

        application.fullTime =
            form.querySelector(
                '[name="fullTime"]'
            )?.checked === true;

        application.partTime =
            form.querySelector(
                '[name="partTime"]'
            )?.checked === true;

        application.remote =
            form.querySelector(
                '[name="remote"]'
            )?.checked === true;

        application.hybrid =
            form.querySelector(
                '[name="hybrid"]'
            )?.checked === true;

        application.onsite =
            form.querySelector(
                '[name="onsite"]'
            )?.checked === true;

        application.declaration =
            form.querySelector(
                '[name="declaration"]'
            )?.checked === true;

        return application;
    }

    function showMessage(message, type = "error") {
        if (!formMessage) return;

        formMessage.textContent = message;

        formMessage.className =
            `form-message ${type}`;

        formMessage.style.display = "block";
    }

    function clearMessage() {
        if (!formMessage) return;

        formMessage.textContent = "";
        formMessage.className = "form-message";
        formMessage.style.display = "none";
    }

    function showSuccessModal(
        application,
        emailSent
    ) {
        if (successId) {
            successId.textContent =
                application.applicationId ||
                "N/A";
        }

        if (successDate) {
            successDate.textContent =
                `Submitted on ${new Date().toLocaleString(
                    "en-IN",
                    {
                        dateStyle: "medium",
                        timeStyle: "short"
                    }
                )}`;
        }

        if (successInfo) {
            successInfo.innerHTML = `
                <div>
                    <i class="fa-solid fa-envelope"></i>
                    <span>
                        ${
                            emailSent
                                ? "Confirmation email sent successfully to your registered email address."
                                : "Application saved successfully. Confirmation email could not be sent right now."
                        }
                    </span>
                </div>

                <div>
                    <i class="fa-solid fa-clock"></i>
                    <span>
                        You can use your Application ID to check your application status anytime.
                    </span>
                </div>
            `;
        }

        if (successModal) {
            successModal.classList.remove("hidden");
            successModal.style.display = "flex";

            document.body.classList.add(
                "modal-open"
            );
        }
    }

    function closeSuccessModal() {
        if (successModal) {
            successModal.classList.add("hidden");
            successModal.style.display = "none";
        }

        document.body.classList.remove(
            "modal-open"
        );

        if (form) {
            form.reset();
        }

        if (resumeText) {
            resumeText.textContent =
                "Choose resume";
        }

        if (resumePreview) {
            resumePreview.innerHTML = "";
            resumePreview.classList.add(
                "hidden"
            );
        }

        clearMessage();
    }

    if (resumeInput) {
        resumeInput.addEventListener(
            "change",
            () => {
                if (!validateResume()) return;

                const file =
                    resumeInput.files[0];

                if (!file) {
                    if (resumeText) {
                        resumeText.textContent =
                            "Choose resume";
                    }

                    if (resumePreview) {
                        resumePreview.innerHTML =
                            "";

                        resumePreview.classList.add(
                            "hidden"
                        );
                    }

                    return;
                }

                if (resumeText) {
                    resumeText.textContent =
                        file.name;
                }

                if (resumePreview) {
                    const extension =
                        file.name
                            .split(".")
                            .pop()
                            .toLowerCase();

                    resumePreview.classList.remove(
                        "hidden"
                    );

                    resumePreview.innerHTML = `
                        <i class="fa-solid ${
                            extension === "pdf"
                                ? "fa-file-pdf"
                                : "fa-file-lines"
                        }"></i>
                        <span>
                            ${escapeHtml(
                                file.name
                            )}
                        </span>
                        <small>
                            ${(
                                file.size /
                                1024 /
                                1024
                            ).toFixed(2)} MB
                        </small>
                    `;
                }
            }
        );
    }

    if (profilePhotoInput) {
        profilePhotoInput.addEventListener(
            "change",
            () => {
                validateProfilePhoto();
            }
        );
    }

    async function submitApplication(event) {
        event.preventDefault();

        if (!form) return;

        clearMessage();

        if (!form.checkValidity()) {
            form.reportValidity();
            return;
        }

        if (!validateResume()) return;

        if (!validateProfilePhoto()) return;

        const submitButton =
            document.getElementById(
                "submitApplication"
            );

        const originalButtonHTML =
            submitButton
                ? submitButton.innerHTML
                : "";

        try {
            if (submitButton) {
                submitButton.disabled = true;

                submitButton.innerHTML = `
                    <i class="fa-solid fa-spinner fa-spin"></i>
                    Submitting Application...
                `;
            }

            const application =
                getFormDataObject();

            const applicationId =
                generateApplicationId();

            const resume =
                await prepareResume();

            const profilePhoto =
                await prepareProfilePhoto();

            application.id =
                applicationId;

            application.applicationId =
                applicationId;

            application.applicantId =
                applicationId;

            application.status =
                "pending";

            application.submittedAt =
                new Date().toISOString();

            application.resume =
                resume;

            application.profilePhoto =
                profilePhoto;

            application.resumeFormat =
                resume
                    ? resume.extension
                    : null;

            application.profilePhotoFormat =
                profilePhoto
                    ? "png"
                    : null;

            const response =
                await fetch(
                    `${API_BASE_URL}/jobs`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type":
                                "application/json"
                        },
                        body: JSON.stringify(
                            application
                        )
                    }
                );

            let result = {};

            try {
                result =
                    await response.json();
            } catch {
                result = {};
            }

            if (
                !response.ok ||
                !result.success
            ) {
                throw new Error(
                    result.message ||
                    "Application submission failed."
                );
            }

            const savedApplication =
                result.data ||
                result.application ||
                {};

            const finalApplicationId =
                savedApplication.applicationId ||
                result.applicationId ||
                applicationId;

            const finalApplication = {
                ...application,
                ...savedApplication,
                applicationId:
                    finalApplicationId,
                applicantId:
                    finalApplicationId
            };

            try {
                localStorage.setItem(
                    "mihub_last_job_application",
                    JSON.stringify(
                        finalApplication
                    )
                );
            } catch {}

            showSuccessModal(
                finalApplication,
                result.emailSent === true
            );
        } catch (error) {
            console.error(
                "Job application submission error:",
                error
            );

            showMessage(
                error.message ||
                "Unable to submit your application. Please try again.",
                "error"
            );

            alert(
                error.message ||
                "Unable to submit your application. Please try again."
            );
        } finally {
            if (submitButton) {
                submitButton.disabled = false;

                submitButton.innerHTML =
                    originalButtonHTML;
            }
        }
    }

    if (form) {
        form.removeAttribute("action");
        form.removeAttribute("method");

        form.addEventListener(
            "submit",
            submitApplication
        );
    }

    if (closeSuccess) {
        closeSuccess.addEventListener(
            "click",
            closeSuccessModal
        );
    }

    if (successModal) {
        successModal.addEventListener(
            "click",
            event => {
                if (
                    event.target ===
                    successModal
                ) {
                    closeSuccessModal();
                }
            }
        );
    }

    document.addEventListener(
        "keydown",
        event => {
            if (
                event.key === "Escape" &&
                successModal &&
                !successModal.classList.contains(
                    "hidden"
                )
            ) {
                closeSuccessModal();
            }
        }
    );
});