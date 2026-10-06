import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import crypto from "crypto";
import nodemailer from "nodemailer";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 5000;

const DATA_DIR = path.join(__dirname, "data");
const COMMUNITY_FILE = path.join(DATA_DIR, "community.json");
const JOBS_FILE = path.join(DATA_DIR, "jobs.json");
const VERIFICATION_FILE = path.join(DATA_DIR, "verification.json");
const LOGO_PATH = path.join(__dirname, "..", "assets", "mi-hub-logo.png");

const ADMIN_EMAIL = process.env.ADMIN_EMAIL || "mewarinnovatorshub@gmail.com";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "";
const SMTP_HOST = process.env.SMTP_HOST || "smtp.gmail.com";
const SMTP_PORT = Number(process.env.SMTP_PORT) || 465;
const SMTP_SECURE = String(process.env.SMTP_SECURE || "true").toLowerCase() === "true";
const SMTP_USER = process.env.SMTP_USER || ADMIN_EMAIL;
const SMTP_PASS = process.env.SMTP_PASS || "";
const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || "https://mihub-community.onrender.com";
const PUBLIC_STATUS_URL = process.env.PUBLIC_STATUS_URL || `${PUBLIC_SITE_URL}/status.html`;

const OTP_EXPIRY_MS = 5 * 60 * 1000;
const SESSION_EXPIRY_MS = 8 * 60 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 5;
const MAX_PROFILE_PHOTO_BYTES = 5 * 1024 * 1024;
const MAX_RESUME_BYTES = 10 * 1024 * 1024;
const MAX_VERIFICATION_DOCUMENT_BYTES = 10 * 1024 * 1024;

const sessions = new Map();
const pendingOtps = new Map();

const mailer = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    auth: {
        user: SMTP_USER,
        pass: SMTP_PASS
    }
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

function ensureJsonFile(file) {
    if (!fs.existsSync(file)) fs.writeFileSync(file, "[]", "utf8");
}

ensureJsonFile(COMMUNITY_FILE);
ensureJsonFile(JOBS_FILE);
ensureJsonFile(VERIFICATION_FILE);

function readJson(file) {
    try {
        const content = fs.readFileSync(file, "utf8");
        if (!content.trim()) return [];
        const data = JSON.parse(content);
        return Array.isArray(data) ? data : [];
    } catch (error) {
        console.error(`Failed to read ${file}:`, error.message);
        return [];
    }
}

function writeJson(file, data) {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

function generateId(prefix) {
    return `${prefix}_${Date.now()}_${crypto.randomBytes(4).toString("hex")}`;
}

function generateApplicationId() {
    return `MIH-${new Date().getFullYear()}-${crypto.randomBytes(3).toString("hex").toUpperCase()}`;
}

function createToken() {
    return crypto.randomBytes(32).toString("hex");
}

function generateOtp() {
    return crypto.randomInt(100000, 1000000).toString();
}

function hashOtp(value) {
    return crypto.createHash("sha256").update(String(value)).digest("hex");
}

function safeCompare(a, b) {
    const x = Buffer.from(String(a));
    const y = Buffer.from(String(b));
    return x.length === y.length && crypto.timingSafeEqual(x, y);
}

function getToken(req) {
    const authorization = req.headers.authorization || "";
    if (authorization.startsWith("Bearer ")) return authorization.substring(7);
    return req.headers["x-admin-token"] || null;
}

function authenticateAdmin(req, res, next) {
    const token = getToken(req);
    if (!token || !sessions.has(token)) {
        return res.status(401).json({ success: false, message: "Unauthorized" });
    }

    const session = sessions.get(token);
    if (Date.now() > session.expiresAt) {
        sessions.delete(token);
        return res.status(401).json({ success: false, message: "Session expired" });
    }

    req.admin = session;
    req.adminToken = token;
    next();
}

function cleanValue(value) {
    return typeof value === "string" ? value.trim() : value;
}

function normalizeObject(obj) {
    const result = {};
    Object.entries(obj || {}).forEach(([key, value]) => {
        if (Array.isArray(value)) result[key] = value.map(cleanValue);
        else if (value && typeof value === "object") result[key] = normalizeObject(value);
        else result[key] = cleanValue(value);
    });
    return result;
}

function escapeHtml(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

function createOfferId() {
    return `OFF-${new Date().getFullYear()}-${crypto.randomBytes(4).toString("hex").toUpperCase()}`;
}

function getDataUrlInfo(value) {
    if (typeof value !== "string") return null;
    const match = value.match(/^data:([^;,]+)(?:;[^,]*)?,(.*)$/s);
    if (!match) return null;
    const mime = match[1].toLowerCase();
    const data = match[2];
    const isBase64 = /^data:[^;]+;base64,/i.test(value);
    if (!isBase64) return null;
    let bytes;
    try {
        bytes = Buffer.from(data, "base64");
    } catch {
        return null;
    }
    return { mime, data, bytes };
}

function validateAndNormalizeProfilePhoto(photo) {
    if (!photo) return null;
    if (typeof photo !== "object") throw new Error("Invalid profile photo data");

    const dataUrl = getDataUrlInfo(photo.data);
    if (!dataUrl) throw new Error("Profile photo must be a valid Base64 data URL");
    if (dataUrl.mime !== "image/png") throw new Error("Profile photo must be PNG");
    if (dataUrl.bytes.length > MAX_PROFILE_PHOTO_BYTES) throw new Error("Profile photo is too large");

    return {
        name: "profile-photo.png",
        originalName: String(photo.originalName || photo.name || "profile-photo.png"),
        type: "image/png",
        extension: "png",
        size: dataUrl.bytes.length,
        data: `data:image/png;base64,${dataUrl.bytes.toString("base64")}`
    };
}

function validateAndNormalizeResume(resume) {
    if (!resume) throw new Error("Resume is required");
    if (typeof resume !== "object") throw new Error("Invalid resume data");

    const dataUrl = getDataUrlInfo(resume.data);
    if (!dataUrl) throw new Error("Resume must be a valid Base64 data URL");
    if (dataUrl.mime !== "application/pdf") {
        throw new Error("Resume must be uploaded as PDF. DOC/DOCX cannot be converted to PDF by this server.");
    }
    if (dataUrl.bytes.length > MAX_RESUME_BYTES) throw new Error("Resume is too large");

    return {
        name: String(resume.name || "resume.pdf"),
        type: "application/pdf",
        extension: "pdf",
        size: dataUrl.bytes.length,
        isPDF: true,
        data: `data:application/pdf;base64,${dataUrl.bytes.toString("base64")}`
    };
}

function validateAndNormalizeVerificationDocument(document) {
    if (!document) throw new Error("Verification document is required");
    if (typeof document !== "object") throw new Error("Invalid verification document data");

    const dataUrl = getDataUrlInfo(document.data);
    if (!dataUrl) throw new Error("Verification document must be a valid Base64 data URL");

    const allowed = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "application/pdf": "pdf"
    };

    if (!allowed[dataUrl.mime]) {
        throw new Error("Verification document must be PNG, JPG, JPEG or PDF");
    }

    if (dataUrl.bytes.length > MAX_VERIFICATION_DOCUMENT_BYTES) {
        throw new Error("Verification document is too large. Maximum size is 10 MB");
    }

    const extension = allowed[dataUrl.mime];
    const originalName = String(document.originalName || document.name || `verification.${extension}`);

    return {
        name: String(document.name || originalName),
        originalName,
        type: dataUrl.mime,
        extension,
        size: dataUrl.bytes.length,
        data: `data:${dataUrl.mime};base64,${dataUrl.bytes.toString("base64")}`
    };
}

async function sendAdminOtpEmail(email, otp) {
    await mailer.sendMail({
        from: `"Mewar Innovators Hub" <${SMTP_USER}>`,
        to: email,
        subject: "Mewar Innovators Hub Admin Login OTP",
        text: `Your Mewar Innovators Hub admin login OTP is ${otp}. This OTP will expire in 5 minutes.`,
        html: `<!DOCTYPE html><html><body style="margin:0;padding:30px;background:#020B1C;font-family:Arial,sans-serif;"><table width="100%"><tr><td align="center"><table width="600" style="max-width:600px;background:#fff;border-radius:14px;overflow:hidden;"><tr><td style="background:#020B1C;padding:25px;text-align:center"><h1 style="color:#FFD45A;margin:0">Mewar Innovators Hub</h1><p style="color:#DCE8F5">Admin Security Verification</p></td></tr><tr><td style="padding:30px;text-align:center"><h2>Your Login OTP</h2><div style="font-size:36px;font-weight:700;letter-spacing:10px;color:#F47A20;margin:25px 0">${escapeHtml(otp)}</div><p>This OTP is valid for 5 minutes.</p><p style="color:#777;font-size:13px">If you did not request this OTP, please ignore this email.</p></td></tr></table></td></tr></table></body></html>`
    });
}

async function sendJobApplicationConfirmationEmail(application) {
    const email = String(application.email || "").trim();
    if (!email) throw new Error("Applicant email address is missing");

    const applicationId = application.applicationId || application.applicantId || application.id;
    const fullName = application.fullName || "Applicant";
    const phone = application.phone || "";
    const submittedDate = new Date(application.submittedAt || Date.now()).toLocaleString("en-IN", {
        dateStyle: "long",
        timeStyle: "short"
    });

    const safeName = escapeHtml(fullName);
    const safeEmail = escapeHtml(email);
    const safePhone = escapeHtml(phone);
    const safeId = escapeHtml(applicationId);
    const safeDate = escapeHtml(submittedDate);
    const safeStatusUrl = escapeHtml(PUBLIC_STATUS_URL);

    const attachments = [];
    let logoHtml = `<div style="font-size:30px;font-weight:800;color:#DCE8F5">MI HUB</div>`;

    if (fs.existsSync(LOGO_PATH)) {
        attachments.push({ filename: "mi-hub-logo.png", path: LOGO_PATH, cid: "mihublogo" });
        logoHtml = `<img src="cid:mihublogo" alt="Mewar Innovators Hub" width="180" style="display:block;width:180px;max-width:70%;height:auto;margin:0 auto 12px">`;
    }

    await mailer.sendMail({
        from: `"Mewar Innovators Hub" <${SMTP_USER}>`,
        to: email,
        subject: `MI Hub Application Success | ${applicationId}`,
        text: `Dear ${fullName},\n\nYour job application has been submitted successfully at Mewar Innovators Hub.\n\nApplication ID: ${applicationId}\nName: ${fullName}\nEmail: ${email}\nMobile: ${phone}\nStatus: Pending\nApplied On: ${submittedDate}\n\nPlease keep your Application ID safe.\n\nCheck your application status:\n${PUBLIC_STATUS_URL}\n\nMewar Innovators Hub Pvt. Ltd.`,
        html: `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>MI Hub Application Success</title></head><body style="margin:0;padding:0;background:#edf3fa;font-family:Arial,Helvetica,sans-serif;color:#020B1C"><table width="100%" cellpadding="0" cellspacing="0" style="background:#edf3fa;padding:25px 10px"><tr><td align="center"><table width="680" cellpadding="0" cellspacing="0" style="width:100%;max-width:680px;background:#fff;border-radius:20px;overflow:hidden"><tr><td style="background:#020B1C;padding:25px 20px;text-align:center">${logoHtml}<div style="font-size:22px;font-weight:800;color:#fff">Mewar Innovators Hub</div><div style="font-size:12px;color:#FFD45A;margin-top:7px;letter-spacing:1px">IDEAS • INNOVATE • GROW</div></td></tr><tr><td style="padding:35px 28px 25px"><div style="text-align:center"><div style="width:76px;height:76px;line-height:76px;margin:0 auto 20px;background:#16a34a;color:#fff;border-radius:50%;font-size:43px;font-weight:700">✓</div><h1 style="font-size:28px;margin:0;color:#020B1C">Application Submitted</h1><h2 style="font-size:25px;margin:5px 0 18px;color:#16a34a">Successfully!</h2><p style="font-size:15px;line-height:1.7;color:#52627a;margin:0 auto;max-width:520px">Dear <strong>${safeName}</strong>, your job application has been successfully submitted to Mewar Innovators Hub. We have received your details and will review your application soon.</p></div><div style="margin-top:28px;background:#effcf7;border:1px solid #b7eed9;border-radius:14px;padding:22px;text-align:center"><div style="font-size:13px;color:#35715c;font-weight:600">APPLICATION ID</div><div style="font-size:25px;font-weight:800;color:#087f52;word-break:break-word">${safeId}</div><div style="font-size:12px;color:#5f766c;margin-top:9px">Please keep this Application ID safe for future reference.</div></div><table width="100%" cellpadding="0" cellspacing="0" style="margin-top:20px"><tr><td width="50%" valign="top" style="padding:7px"><div style="border:1px solid #dce8f5;border-radius:12px;padding:16px"><div style="font-size:12px;color:#6b7c93;margin-bottom:7px">Applicant Name</div><div style="font-size:14px;font-weight:700;word-break:break-word">${safeName}</div></div></td><td width="50%" valign="top" style="padding:7px"><div style="border:1px solid #dce8f5;border-radius:12px;padding:16px"><div style="font-size:12px;color:#6b7c93;margin-bottom:7px">Email</div><div style="font-size:14px;font-weight:700;word-break:break-word">${safeEmail}</div></div></td></tr><tr><td width="50%" valign="top" style="padding:7px"><div style="border:1px solid #dce8f5;border-radius:12px;padding:16px"><div style="font-size:12px;color:#6b7c93;margin-bottom:7px">Mobile Number</div><div style="font-size:14px;font-weight:700">${safePhone || "Not provided"}</div></div></td><td width="50%" valign="top" style="padding:7px"><div style="border:1px solid #dce8f5;border-radius:12px;padding:16px"><div style="font-size:12px;color:#6b7c93;margin-bottom:7px">Applied On</div><div style="font-size:14px;font-weight:700">${safeDate}</div></div></td></tr></table><div style="text-align:center;margin:30px 0 20px"><a href="${safeStatusUrl}" style="display:inline-block;background:#020B1C;color:#fff;text-decoration:none;padding:15px 30px;border-radius:10px;font-size:14px;font-weight:700">Check Application Status</a></div><div style="background:#fff9e9;border-left:4px solid #FFD45A;border-radius:8px;padding:16px 18px"><div style="font-size:13px;line-height:1.7;color:#5e5a4c"><strong>Important:</strong> Keep your Application ID <strong>${safeId}</strong> safe. You will need your Application ID and registered email address to check your application status.</div></div><div style="margin-top:28px;text-align:center"><div style="font-size:14px;font-weight:700">Thank you for your interest in Mewar Innovators Hub!</div><div style="font-size:13px;line-height:1.6;color:#65758b;margin-top:6px">We will review your application and update your application status through the MI Hub system.</div></div></td></tr><tr><td style="background:#020B1C;padding:28px 20px;text-align:center"><div style="font-size:15px;color:#DCE8F5;font-weight:700;margin-bottom:18px">Follow Us On</div><div><a href="https://www.instagram.com/mewarinnovatorshub/" style="display:inline-block;margin:4px;padding:9px 12px;background:#E4405F;color:#fff;text-decoration:none;border-radius:7px;font-size:11px;font-weight:700">Instagram</a><a href="https://www.linkedin.com/company/mewar-innovators-hub/" style="display:inline-block;margin:4px;padding:9px 12px;background:#0A66C2;color:#fff;text-decoration:none;border-radius:7px;font-size:11px;font-weight:700">LinkedIn</a><a href="https://github.com/mihubindia" style="display:inline-block;margin:4px;padding:9px 12px;background:#333;color:#fff;text-decoration:none;border-radius:7px;font-size:11px;font-weight:700">GitHub</a><a href="https://x.com/mdshahilraja301" style="display:inline-block;margin:4px;padding:9px 12px;background:#000;color:#fff;text-decoration:none;border-radius:7px;font-size:11px;font-weight:700">X</a></div><div style="height:1px;background:#29415f;margin:15px 0 18px"></div><p style="color:#AFC4D9;font-size:11px;margin:0">© ${new Date().getFullYear()} Mewar Innovators Hub. All Rights Reserved.</p></td></tr></table></td></tr></table></body></html>`,
        attachments
    });
}

app.get("/", (req, res) => res.json({ success: true, message: "Mewar Innovators Hub API is running", version: "3.0.0" }));
app.get("/api/health", (req, res) => res.json({ success: true, status: "OK", time: new Date().toISOString() }));

app.post("/api/community", (req, res) => {
    try {
        const body = req.body || {};
        const now = new Date().toISOString();
        const application = {
            id: generateId("COM"),
            fullName: String(body.fullName || "").trim(),
            email: String(body.email || "").trim(),
            phone: String(body.phone || "").trim(),
            city: String(body.city || "").trim(),
            state: String(body.state || "").trim(),
            institute: String(body.institute || "").trim(),
            tenthBoard: String(body.tenthBoard || "").trim(),
            tenthYear: String(body.tenthYear || "").trim(),
            tenthPercentage: String(body.tenthPercentage || "").trim(),
            twelfthBoard: String(body.twelfthBoard || "").trim(),
            twelfthYear: String(body.twelfthYear || "").trim(),
            twelfthPercentage: String(body.twelfthPercentage || "").trim(),
            graduationInstitute: String(body.graduationInstitute || "").trim(),
            degree: String(body.degree || "").trim(),
            branch: String(body.branch || "").trim(),
            currentYear: String(body.currentYear || "").trim(),
            semester: String(body.semester || "").trim(),
            graduationYear: String(body.graduationYear || "").trim(),
            domain: String(body.domain || "").trim(),
            skills: String(body.skills || "").trim(),
            reason: String(body.reason || "").trim(),
            submittedAt: now
        };
        const community = readJson(COMMUNITY_FILE);
        community.push(application);
        writeJson(COMMUNITY_FILE, community);
        return res.status(201).json({ success: true, message: "Community application submitted successfully", data: application });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to save community application", error: error.message });
    }
});

app.post("/api/jobs", async (req, res) => {
    try {
        const body = normalizeObject(req.body || {});
        const applicationId = body.applicationId || body.applicantId || generateApplicationId();
        const now = new Date().toISOString();

        if (!body.fullName || !body.email || !body.phone) {
            return res.status(400).json({ success: false, message: "Full name, email and phone are required" });
        }

        const resume = validateAndNormalizeResume(body.resume);
        const profilePhoto = body.profilePhoto ? validateAndNormalizeProfilePhoto(body.profilePhoto) : null;

        const application = {
            id: generateId("JOB"),
            applicationId,
            applicantId: applicationId,
            fullName: body.fullName,
            email: body.email,
            phone: body.phone,
            dateOfBirth: body.dateOfBirth || "",
            gender: body.gender || "",
            city: body.city || "",
            state: body.state || "",
            country: body.country || "",
            address: body.address || "",
            linkedin: body.linkedin || "",
            github: body.github || "",
            portfolio: body.portfolio || "",
            tenBoard: body.tenBoard || "",
            tenYear: body.tenYear || "",
            tenScore: body.tenScore || "",
            twelveBoard: body.twelveBoard || "",
            twelveStream: body.twelveStream || "",
            twelveYear: body.twelveYear || "",
            twelveScore: body.twelveScore || "",
            university: body.university || "",
            degree: body.degree || "",
            specialization: body.specialization || "",
            currentYear: body.currentYear || "",
            expectedGraduationYear: body.expectedGraduationYear || "",
            cgpa: body.cgpa || "",
            internship: Boolean(body.internship),
            fullTime: Boolean(body.fullTime),
            partTime: Boolean(body.partTime),
            remote: Boolean(body.remote),
            hybrid: Boolean(body.hybrid),
            onsite: Boolean(body.onsite),
            availableFrom: body.availableFrom || "",
            duration: body.duration || "",
            declaration: Boolean(body.declaration),
            resume,
            resumeFormat: "pdf",
            profilePhoto,
            profilePhotoFormat: profilePhoto ? "png" : null,
            status: "pending",
            offerLetter: null,
            submittedAt: now,
            createdAt: now
        };

        const jobs = readJson(JOBS_FILE);
        jobs.push(application);
        writeJson(JOBS_FILE, jobs);

        let emailSent = false;
        let emailErrorMessage = null;

        try {
            await sendJobApplicationConfirmationEmail(application);
            emailSent = true;
            console.log(`Application confirmation email sent to ${application.email}`);
        } catch (error) {
            emailErrorMessage = error.message;
            console.error("Applicant confirmation email failed:", error.message);
        }

        return res.status(201).json({
            success: true,
            message: emailSent ? "Job application submitted successfully. Confirmation email sent." : "Job application submitted successfully, but confirmation email could not be sent.",
            emailSent,
            emailError: emailErrorMessage,
            applicationId,
            data: application
        });
    } catch (error) {
        console.error("Job application error:", error);
        return res.status(400).json({ success: false, message: error.message || "Failed to save job application" });
    }
});

app.get("/api/jobs/status", (req, res) => {
    try {
        const applicationId = String(req.query.applicationId || "").trim();
        const email = String(req.query.email || "").trim().toLowerCase();
        if (!applicationId || !email) return res.status(400).json({ success: false, message: "Application ID and email are required" });

        const application = readJson(JOBS_FILE).find(job =>
            String(job.applicationId || job.applicantId || "").trim().toLowerCase() === applicationId.toLowerCase() &&
            String(job.email || "").trim().toLowerCase() === email
        );

        if (!application) return res.status(404).json({ success: false, message: "No application found with the provided Application ID and email address." });

        const status = String(application.status || "pending").trim().toLowerCase();
        return res.json({
            success: true,
            data: {
                applicationId: application.applicationId || application.applicantId || "",
                fullName: application.fullName || "",
                email: application.email || "",
                phone: application.phone || "",
                status,
                submittedAt: application.submittedAt || application.createdAt || null,
                approvedAt: application.approvedAt || null,
                rejectedAt: application.rejectedAt || null,
                offerIssuedAt: application.offerIssuedAt || null,
                rejectionReason: status === "rejected" ? application.rejectionReason || "Application rejected by admin" : null,
                offerAvailable: status === "approved" || status === "offer-issued"
            }
        });
    } catch {
        return res.status(500).json({ success: false, message: "Failed to check application status" });
    }
});

app.post("/api/admin/login", async (req, res) => {
    try {
        const email = String(req.body?.email || "").trim();
        const password = String(req.body?.password || "");
        if (!email || !password) return res.status(400).json({ success: false, message: "Email and password are required" });
        if (!ADMIN_PASSWORD) return res.status(500).json({ success: false, message: "Admin password is not configured on the server" });

        const validEmail = email.toLowerCase() === String(ADMIN_EMAIL).toLowerCase();
        const validPassword = safeCompare(password, ADMIN_PASSWORD);
        if (!validEmail || !validPassword) return res.status(401).json({ success: false, message: "Invalid admin credentials" });
        if (!SMTP_PASS) return res.status(500).json({ success: false, message: "Email service is not configured" });

        for (const [requestId, pending] of pendingOtps.entries()) {
            if (pending.email.toLowerCase() === email.toLowerCase()) pendingOtps.delete(requestId);
        }

        const otpRequestId = createToken();
        const otp = generateOtp();
        pendingOtps.set(otpRequestId, { email: ADMIN_EMAIL, otpHash: hashOtp(otp), expiresAt: Date.now() + OTP_EXPIRY_MS, attempts: 0 });

        try {
            await sendAdminOtpEmail(ADMIN_EMAIL, otp);
        } catch (emailError) {
            pendingOtps.delete(otpRequestId);
            console.error("Admin OTP email failed:", emailError.message);
            return res.status(500).json({ success: false, message: "Failed to send OTP email" });
        }

        return res.json({ success: true, requiresOtp: true, otpRequestId, requestId: otpRequestId, message: `OTP has been sent to ${ADMIN_EMAIL}` });
    } catch {
        return res.status(500).json({ success: false, message: "Admin login failed" });
    }
});

app.post("/api/admin/verify-otp", (req, res) => {
    try {
        const otpRequestId = req.body?.otpRequestId || req.body?.requestId || req.body?.verificationId;
        const otp = req.body?.otp || req.body?.code;
        if (!otpRequestId || !otp) return res.status(400).json({ success: false, message: "OTP request ID and OTP are required" });

        const pending = pendingOtps.get(otpRequestId);
        if (!pending) return res.status(401).json({ success: false, message: "Invalid or expired OTP request" });
        if (Date.now() > pending.expiresAt) {
            pendingOtps.delete(otpRequestId);
            return res.status(401).json({ success: false, message: "OTP expired" });
        }
        if (pending.attempts >= MAX_OTP_ATTEMPTS) {
            pendingOtps.delete(otpRequestId);
            return res.status(429).json({ success: false, message: "Too many incorrect OTP attempts. Please request a new OTP." });
        }

        pending.attempts += 1;
        if (!safeCompare(hashOtp(String(otp)), pending.otpHash)) {
            return res.status(401).json({ success: false, message: `Invalid OTP. ${MAX_OTP_ATTEMPTS - pending.attempts} attempts remaining.` });
        }

        pendingOtps.delete(otpRequestId);
        const token = createToken();
        sessions.set(token, { email: pending.email, createdAt: Date.now(), expiresAt: Date.now() + SESSION_EXPIRY_MS });
        return res.json({ success: true, message: "Admin login successful", token, admin: { email: pending.email } });
    } catch {
        return res.status(500).json({ success: false, message: "OTP verification failed" });
    }
});

app.post("/api/admin/logout", authenticateAdmin, (req, res) => {
    sessions.delete(req.adminToken);
    return res.json({ success: true, message: "Logged out successfully" });
});

app.get("/api/admin/session", authenticateAdmin, (req, res) => res.json({ success: true, authenticated: true, admin: { email: req.admin.email } }));
app.get("/api/admin/me", authenticateAdmin, (req, res) => res.json({ success: true, admin: { email: req.admin.email } }));
app.get("/api/admin/community", authenticateAdmin, (req, res) => { const data = readJson(COMMUNITY_FILE); return res.json({ success: true, data, count: data.length }); });
app.get("/api/admin/jobs", authenticateAdmin, (req, res) => { const data = readJson(JOBS_FILE); return res.json({ success: true, data, count: data.length }); });

app.get("/api/admin/verification", authenticateAdmin, (req, res) => {
    try {
        const data = readJson(VERIFICATION_FILE);
        return res.json({ success: true, data, count: data.length });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to load verification documents" });
    }
});

app.post("/api/admin/verification", authenticateAdmin, (req, res) => {
    try {
        const offerId = String(req.body?.offerId || "").trim();
        const applicationId = String(req.body?.applicationId || "").trim();
        const document = req.body?.document || req.body?.file || req.body?.verificationDocument;

        if (!offerId || !applicationId) {
            return res.status(400).json({ success: false, message: "Offer ID and Application ID are required" });
        }

        const normalizedDocument = validateAndNormalizeVerificationDocument(document);
        const records = readJson(VERIFICATION_FILE);
        const now = new Date().toISOString();
        const existingIndex = records.findIndex(record =>
            String(record.offerId || "").trim().toLowerCase() === offerId.toLowerCase() &&
            String(record.applicationId || "").trim().toLowerCase() === applicationId.toLowerCase()
        );

        const record = {
            id: existingIndex >= 0 ? records[existingIndex].id : generateId("VER"),
            offerId,
            applicationId,
            document: normalizedDocument,
            uploadedAt: now,
            uploadedBy: req.admin.email
        };

        if (existingIndex >= 0) records[existingIndex] = record;
        else records.push(record);

        writeJson(VERIFICATION_FILE, records);

        return res.status(existingIndex >= 0 ? 200 : 201).json({
            success: true,
            message: existingIndex >= 0 ? "Verification document updated successfully" : "Verification document saved successfully",
            data: record
        });
    } catch (error) {
        return res.status(400).json({ success: false, message: error.message || "Failed to save verification document" });
    }
});

app.delete("/api/admin/verification/:id", authenticateAdmin, (req, res) => {
    try {
        const records = readJson(VERIFICATION_FILE);
        const index = records.findIndex(record => record.id === req.params.id);

        if (index === -1) {
            return res.status(404).json({ success: false, message: "Verification document not found" });
        }

        const deleted = records.splice(index, 1)[0];
        writeJson(VERIFICATION_FILE, records);

        return res.json({ success: true, message: "Verification document deleted", data: deleted });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete verification document" });
    }
});

app.get("/api/verification", (req, res) => {
    try {
        const offerId = String(req.query?.offerId || "").trim();
        const applicationId = String(req.query?.applicationId || "").trim();

        if (!offerId || !applicationId) {
            return res.status(400).json({ success: false, message: "Offer ID and Application ID are required" });
        }

        const record = readJson(VERIFICATION_FILE).find(item =>
            String(item.offerId || "").trim().toLowerCase() === offerId.toLowerCase() &&
            String(item.applicationId || "").trim().toLowerCase() === applicationId.toLowerCase()
        );

        if (!record) {
            return res.status(404).json({ success: false, message: "Verification document not found" });
        }

        return res.json({
            success: true,
            data: record
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to verify document" });
    }
});

app.get("/api/admin/offers", authenticateAdmin, (req, res) => {
    const offers = readJson(JOBS_FILE).filter(job => job.offerLetter).map(job => ({
        ...job.offerLetter,
        candidateId: job.id,
        applicationId: job.applicationId || job.applicantId || "",
        candidateName: job.fullName || "",
        candidateEmail: job.email || ""
    }));
    return res.json({ success: true, data: offers, count: offers.length });
});

app.patch("/api/admin/jobs/:id/approve", authenticateAdmin, (req, res) => {
    try {
        const jobs = readJson(JOBS_FILE);
        const index = jobs.findIndex(job => job.id === req.params.id);
        if (index === -1) return res.status(404).json({ success: false, message: "Job application not found" });
        jobs[index].status = "approved";
        jobs[index].approvedAt = new Date().toISOString();
        jobs[index].approvedBy = req.admin.email;
        jobs[index].rejectedAt = null;
        jobs[index].rejectedBy = null;
        jobs[index].rejectionReason = null;
        writeJson(JOBS_FILE, jobs);
        return res.json({ success: true, message: "Job application approved", data: jobs[index] });
    } catch {
        return res.status(500).json({ success: false, message: "Failed to approve job application" });
    }
});

app.patch("/api/admin/jobs/:id/reject", authenticateAdmin, (req, res) => {
    try {
        const jobs = readJson(JOBS_FILE);
        const index = jobs.findIndex(job => job.id === req.params.id);
        if (index === -1) return res.status(404).json({ success: false, message: "Job application not found" });
        jobs[index].status = "rejected";
        jobs[index].rejectedAt = new Date().toISOString();
        jobs[index].rejectedBy = req.admin.email;
        jobs[index].rejectionReason = String(req.body?.reason || "Application rejected by admin").trim();
        writeJson(JOBS_FILE, jobs);
        return res.json({ success: true, message: "Job application rejected", data: jobs[index] });
    } catch {
        return res.status(500).json({ success: false, message: "Failed to reject job application" });
    }
});

app.delete("/api/admin/jobs/:id", authenticateAdmin, (req, res) => {
    try {
        const jobs = readJson(JOBS_FILE);
        const index = jobs.findIndex(job => job.id === req.params.id);
        if (index === -1) return res.status(404).json({ success: false, message: "Job application not found" });
        const deleted = jobs.splice(index, 1)[0];
        writeJson(JOBS_FILE, jobs);
        return res.json({ success: true, message: "Job application deleted", data: deleted });
    } catch {
        return res.status(500).json({ success: false, message: "Failed to delete job application" });
    }
});

app.delete("/api/admin/community/:id", authenticateAdmin, (req, res) => {
    try {
        const community = readJson(COMMUNITY_FILE);
        const index = community.findIndex(member => member.id === req.params.id);
        if (index === -1) return res.status(404).json({ success: false, message: "Community member not found" });
        const deleted = community.splice(index, 1)[0];
        writeJson(COMMUNITY_FILE, community);
        return res.json({ success: true, message: "Community member deleted", data: deleted });
    } catch {
        return res.status(500).json({ success: false, message: "Failed to delete community member" });
    }
});

app.post("/api/admin/jobs/:id/offer-letter", authenticateAdmin, (req, res) => {
    try {
        const jobs = readJson(JOBS_FILE);
        const index = jobs.findIndex(job => job.id === req.params.id);
        if (index === -1) return res.status(404).json({ success: false, message: "Job application not found" });
        if (jobs[index].status !== "approved") return res.status(400).json({ success: false, message: "Only approved candidates can receive an offer letter" });

        const { jobTitle, department, joiningDate, salary, location, employmentType, issueDate, additionalMessage } = req.body;
        const offerLetter = {
            id: createOfferId(),
            jobTitle: jobTitle || "",
            department: department || "",
            joiningDate: joiningDate || "",
            salary: salary || "",
            location: location || "",
            employmentType: employmentType || "Full Time",
            issueDate: issueDate || new Date().toISOString().split("T")[0],
            additionalMessage: additionalMessage || "",
            createdAt: new Date().toISOString(),
            createdBy: req.admin.email
        };

        jobs[index].offerLetter = offerLetter;
        jobs[index].status = "offer-issued";
        jobs[index].offerIssuedAt = new Date().toISOString();
        writeJson(JOBS_FILE, jobs);
        return res.status(201).json({ success: true, message: "Offer letter created successfully", data: jobs[index], offerLetter });
    } catch {
        return res.status(500).json({ success: false, message: "Failed to create offer letter" });
    }
});

app.delete("/api/admin/jobs/:id/offer-letter", authenticateAdmin, (req, res) => {
    try {
        const jobs = readJson(JOBS_FILE);
        const index = jobs.findIndex(job => job.id === req.params.id);
        if (index === -1) return res.status(404).json({ success: false, message: "Job application not found" });
        if (!jobs[index].offerLetter) return res.status(404).json({ success: false, message: "Offer letter not found" });
        jobs[index].offerLetter = null;
        jobs[index].offerIssuedAt = null;
        if (jobs[index].status === "offer-issued") jobs[index].status = "approved";
        writeJson(JOBS_FILE, jobs);
        return res.json({ success: true, message: "Offer letter deleted", data: jobs[index] });
    } catch {
        return res.status(500).json({ success: false, message: "Failed to delete offer letter" });
    }
});

app.use((req, res) => res.status(404).json({ success: false, message: "API endpoint not found" }));
app.use((error, req, res, next) => {
    console.error("Server error:", error);
    res.status(500).json({ success: false, message: "Internal server error", error: error.message });
});

app.listen(PORT, async () => {
    console.log(`Mewar Innovators Hub backend running on port ${PORT}`);
    console.log(`http://localhost:${PORT}`);
    console.log(`Application status API: http://localhost:${PORT}/api/jobs/status`);
    console.log(`SMTP Host: ${SMTP_HOST}`);
    console.log(`SMTP Port: ${SMTP_PORT}`);
    console.log(`SMTP Secure: ${SMTP_SECURE}`);
    console.log(`SMTP User: ${SMTP_USER}`);
    console.log(`Admin Email: ${ADMIN_EMAIL}`);

    if (!SMTP_PASS) {
        console.error("SMTP ERROR: SMTP_PASS is missing in .env");
        return;
    }

    try {
        await mailer.verify();
        console.log("SMTP connection successful");
    } catch (error) {
        console.error("SMTP CONNECTION FAILED");
        console.error("Message:", error.message);
        console.error("Code:", error.code || "unknown");
    }
});