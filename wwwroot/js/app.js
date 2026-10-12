const $ = (id) => document.getElementById(id);

let currentPatient = null;
let currentTab = "overview";
let patientCache = {};

const esc = (v) =>
    String(v ?? "").replace(/[&<>"']/g, (c) => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[c]));

async function api(url, options = {}) {
    const r = await fetch(url, {
        credentials: "same-origin",
        headers: {
            "Content-Type": "application/json",
            ...(options.headers || {})
        },
        ...options
    });

    if (r.status === 401) {
        showLogin();
        throw new Error("Your session expired. Please sign in again.");
    }

    if (!r.ok) {
        throw new Error(
            r.status === 404 ? "Record not found." : `Request failed(${ r.status }).`
        );
    }

    if (r.status === 204) return null;

    return r.json();
}

function showLogin() {
    $("appScreen").classList.add("hidden");
    $("loginScreen").classList.remove("hidden");
}

function showApp(user) {
    $("loginScreen").classList.add("hidden");
    $("appScreen").classList.remove("hidden");
    $("signedInAs").textContent = user || "Demo user";
}

function message(s) {
    $("notice").textContent = s;
    $("notice").classList.remove("hidden");
}

function clearMessage() {
    $("notice").classList.add("hidden");
}

$("loginForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    $("loginError").textContent = "";

    try {
        const x = await api("/api/auth/login", {
            method: "POST",
            body: JSON.stringify({
                username: $("username").value.trim(),
                password: $("password").value
            })
        });

        showApp(x.user);
        await searchPatients({});
    } catch (err) {
        $("loginError").textContent =
            "Sign-in failed. Check the demo credentials and try again.";
    }
});

$("logoutBtn").addEventListener("click", async () => {
    try {
        await api("/api/auth/logout", { method: "POST" });
    } catch {
        // Continue logging out locally.
    }

    currentPatient = null;
    showLogin();
});

async function checkSession() {
    try {
        const x = await api("/api/auth/me");
        showApp(x.user);
        await searchPatients({});
    } catch {
        showLogin();
    }
}

$("searchForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const params = {
        mrn: $("mrn").value.trim(),
        firstName: $("firstName").value.trim(),
        lastName: $("lastName").value.trim(),
        dob: $("dob").value
    };

    if (!Object.values(params).some(Boolean)) {
        message("Enter at least one search criterion.");
        return;
    }

    clearMessage();
    await searchPatients(params);
});

$("clearBtn").addEventListener("click", () => {
    setTimeout(() => {
        clearMessage();
        $("resultCount").textContent = "0 results";
        $("resultsArea").innerHTML = `
    <div class="empty-state">
                <div class="empty-icon">⌕</div>
                <strong>Search the patient directory</strong>
                <p>Enter an MRN, name, or date of birth to find a record.</p>
            </div > `;
    }, 0);
});

async function searchPatients(filters) {
    try {
        const p = new URLSearchParams(
            Object.entries(filters).filter(([, v]) => v)
        );

        const data = await api("/api/patients/search?" + p.toString());

        data.forEach((x) => {
            patientCache[x.patientId] = x;
        });

        $("resultCount").textContent =
            `${ data.length } result${ data.length === 1 ? "" : "s" } `;

        if (!data.length) {
            $("resultsArea").innerHTML = `
    <div class="empty-state">
                    <div class="empty-icon">⌕</div>
                    <strong>No matching patients</strong>
                    <p>Check the spelling or try a different identifier.</p>
                </div > `;
            return;
        }

        $("resultsArea").innerHTML = `
    <div class="patient-row header">
                <span>Patient</span>
                <span>MRN</span>
                <span>Date of birth</span>
                <span>Gender</span>
                <span></span>
            </div >
    ${
        data.map((p) => `
                <div class="patient-row">
                    <div class="patient-person">
                        <div class="mini-avatar">
                            ${esc((p.firstName[0] || "") + (p.lastName[0] || ""))}
                        </div>
                        <div>
                            <strong>${esc(p.firstName)} ${esc(p.lastName)}</strong>
                            <small>Patient ID ${p.patientId}</small>
                        </div>
                    </div>
                    <div class="cell">${esc(p.mrn)}</div>
                    <div class="cell">${esc(formatDate(p.dob))}</div>
                    <div class="cell">${esc(p.gender)}</div>
                    <button class="view-btn" data-open="${p.patientId}">
                        View record →
                    </button>
                </div>
            `).join("")
} `;

        document.querySelectorAll("[data-open]").forEach((b) => {
            b.addEventListener("click", () => {
                openPatient(Number(b.dataset.open));
            });
        });
    } catch (err) {
        message(err.message);
    }
}

function formatDate(v) {
    if (!v) return "—";

    const day = String(v).slice(0, 10);
    const d = new Date(day + "T00:00:00");

    return Number.isNaN(d.getTime())
        ? v
        : d.toLocaleDateString(undefined, {
            year: "numeric",
            month: "short",
            day: "numeric"
        });
}

$("backBtn").addEventListener("click", () => {
    $("detailPanel").classList.add("hidden");
    $("searchPanel").classList.remove("hidden");
    clearMessage();
});

async function openPatient(id) {
    try {
        clearMessage();

        const p = await api("/api/patients/" + id);
        currentPatient = p;

        const initials =
            (p.firstName[0] || "") + (p.lastName[0] || "");

        $("patientInitials").textContent = initials;
        $("patientName").textContent = p.firstName + " " + p.lastName;
        $("patientMeta").textContent =
            `MRN ${ p.mrn } · DOB ${ formatDate(p.dob) } · ${ p.gender } `;

        $("searchPanel").classList.add("hidden");
        $("detailPanel").classList.remove("hidden");

        currentTab = "overview";
        setActiveTab();

        await renderTab();

        window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
        message(err.message);
    }
}

document.querySelectorAll("[data-tab]").forEach((b) => {
    b.addEventListener("click", async () => {
        currentTab = b.dataset.tab;
        setActiveTab();
        await renderTab();
    });
});

function setActiveTab() {
    document.querySelectorAll("[data-tab]").forEach((b) => {
        b.classList.toggle("active", b.dataset.tab === currentTab);
    });
}

function card(title, body, wide = false, count = null) {
    return `
    <section class="data-card ${wide ? "wide" : ""}">
        <h3>
            ${esc(title)}
            ${count !== null ? `<span class="count">${count}</span>` : ""}
        </h3>
            ${ body || '<div class="empty-small">No information recorded.</div>' }
        </section > `;
}

function field(label, value) {
    return `
    <div class="field">
            <span>${esc(label)}</span>
            <strong>${esc(value || "—")}</strong>
        </div > `;
}

function listItem(icon, title, desc, tag = "", cls = "") {
    return `
    <div class="list-item">
            <div class="list-symbol">${icon}</div>
            <div class="list-main">
                <strong>${esc(title)}</strong>
                <p>${esc(desc || "")}</p>
            </div>
            ${ tag ? `<span class="tag ${cls}">${esc(tag)}</span>` : "" }
        </div > `;
}

async function renderTab() {
    const p = currentPatient;

    if (!p) return;

    const host = $("tabContent");

    host.innerHTML = `
    <div class="data-card wide">
        Loading patient information…
        </div >`;

    try {
        if (currentTab === "overview") {
            const [a, alerts, m] = await Promise.all([
                api(`/api/patients/ ${ p.patientId } /allergies`),
api(`/api/patients/${p.patientId}/alerts`),
    api(`/api/patients/${p.patientId}/medications`)
            ]);

host.innerHTML =
    card(
        "Demographics",
        `<div class="field-grid">
                        ${field("Medical record number", p.mrn)}
                        ${field("Date of birth", formatDate(p.dob))}
                        ${field("Gender", p.gender)}
                        ${field("Phone", p.phoneNumber)}
                        ${field("Address", p.addressLine1)}
                        ${field("City / State / ZIP",
            `${p.city}, ${p.state} ${p.zipCode}`)}
                    </div>`,
        true
    ) +
    card(
        "Allergies",
        a.map((x) =>
            listItem(
                "⚠",
                x.allergyName,
                `Recorded ${formatDate(x.recordedDate)}`,
                x.severity,
                x.severity.toLowerCase()
            )
        ).join(""),
        false,
        a.length
    ) +
    card(
        "Active alerts",
        alerts.map((x) =>
            listItem(
                "!",
                x.title,
                x.message,
                x.severity,
                x.severity.toLowerCase() === "high" ? "high" : ""
            )
        ).join(""),
        false,
        alerts.length
    ) +
    card(
        "Medications",
        m.map((x) =>
            listItem(
                "✚",
                `${x.medicationName} ${x.strength}`,
                `${x.dosageInstructions} · ${x.frequency} · ${x.route}`,
                x.status
            )
        ).join(""),
        true,
        m.length
    );

        } else if (currentTab === "allergies") {
    const [a, alerts] = await Promise.all([
        api(`/api/patients/${p.patientId}/allergies`),
        api(`/api/patients/${p.patientId}/alerts`)
    ]);

    host.innerHTML =
        card(
            "Allergies",
            a.map((x) =>
                listItem(
                    "⚠",
                    x.allergyName,
                    `Recorded ${formatDate(x.recordedDate)}`,
                    x.severity,
                    x.severity.toLowerCase()
                )
            ).join(""),
            true,
            a.length
        ) +
        card(
            "Alerts",
            alerts.map((x) =>
                listItem(
                    "!",
                    x.title,
                    x.message,
                    x.severity,
                    x.severity.toLowerCase() === "high" ? "high" : ""
                )
            ).join(""),
            true,
            alerts.length
        );

} else if (currentTab === "medications") {
    const m = await api(
        `/api/patients/${p.patientId}/medications`
    );

    host.innerHTML = card(
        "Medication list",
        m.map((x) =>
            listItem(
                "✚",
                `${x.medicationName} ${x.strength}`,
                `${x.dosageInstructions} · ${x.frequency} · ${x.route} · Start ${formatDate(x.startDate)} · Prescriber: ${x.prescribingProvider}`,
                x.status
            )
        ).join(""),
        true,
        m.length
    );

} else {
    const docs = await api(
        `/api/patients/${p.patientId}/documents`
    );

    host.innerHTML = card(
        "Patient documents",
        docs.map((x) => `
                    <div class="list-item">
                        <div class="list-symbol">▤</div>
                        <div class="list-main">
                            <strong>${esc(x.documentName)}</strong>
                            <p>
                                ${esc(x.documentType)} ·
                                Document date ${formatDate(x.documentDate)} ·
                                Uploaded ${formatDate(x.uploadedDate)}
                            </p>
                            <a class="doc-link"
                               href="${esc(x.filePath)}"
                               target="_blank"
                               rel="noopener">
                                Open document ↗
                            </a>
                        </div>
                        <span class="doc-type">${esc(x.documentType)}</span>
                    </div>
                `).join(""),
        true,
        docs.length
    );
}
    } catch (err) {
    host.innerHTML = card(
        "Unable to load information",
        `<p class="error">${esc(err.message)}</p>`,
        true
    );
}
}

$("printBtn").addEventListener("click", async () => {
    if (!currentPatient) return;

    try {
        const p = currentPatient;

        const [a, alerts, m] = await Promise.all([
            api(`/api/patients/${p.patientId}/allergies`),
            api(`/api/patients/${p.patientId}/alerts`),
            api(`/api/patients/${p.patientId}/medications`)
        ]);

        const rows = (arr, cols) =>
            arr.length
                ? arr.map((x) => `
                    <tr>
                        ${cols.map((k) => `
                            <td>${esc(
                    x[k] instanceof Date
                        ? x[k].toLocaleDateString()
                        : typeof x[k] === "string" &&
                            k.toLowerCase().includes("date")
                            ? formatDate(x[k])
                            : x[k]
                )}</td>
                        `).join("")}
                    </tr>
                `).join("")
                : '<tr><td colspan="4">No information recorded</td></tr>';

        const w = window.open("", "_blank", "width=900,height=700");

        if (!w) {
            message("Allow pop-ups to print the summary.");
            return;
        }

        w.document.write(`
            <!doctype html>
            <html>
            <head>
                <title>Patient Summary - ${esc(p.mrn)}</title>
                <style>
                    body {
                        font: 12px Arial, sans-serif;
                        color: #1e293b;
                        margin: 32px;
                    }
                    h1 { font-size: 22px; }
                    h2 {
                        font-size: 15px;
                        margin-top: 24px;
                        color: #174d5b;
                    }
                    p { line-height: 1.6; }
                    .grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 8px 24px;
                    }
                    .field {
                        padding: 7px 0;
                        border-bottom: 1px solid #ddd;
                    }
                    table {
                        border-collapse: collapse;
                        width: 100%;
                    }
                    td, th {
                        text-align: left;
                        padding: 8px;
                        border: 1px solid #ddd;
                    }
                    th { background: #eef5f6; }
                    .disclaimer {
                        margin-top: 28px;
                        color: #666;
                        font-size: 10px;
                    }
                    @media print {
                        button { display: none; }
                    }
                </style>
            </head>
            <body>
                <h1>Patient Summary</h1>
                <p>Generated ${new Date().toLocaleString()} · Demo data only</p>

                <h2>Demographics</h2>
                <div class="grid">
                    ${[
                ["Name", p.firstName + " " + p.lastName],
                ["MRN", p.mrn],
                ["Date of birth", formatDate(p.dob)],
                ["Gender", p.gender],
                ["Phone", p.phoneNumber],
                [
                    "Address",
                    [p.addressLine1, p.city, p.state, p.zipCode]
                        .filter(Boolean)
                        .join(", ")
                ]
            ].map(([k, v]) => `
                        <div class="field">
                            <b>${esc(k)}:</b> ${esc(v)}
                        </div>
                    `).join("")}
                </div>

                <h2>Allergies</h2>
                <table>
                    <tr>
                        <th>Allergy</th>
                        <th>Severity</th>
                        <th>Status</th>
                        <th>Recorded</th>
                    </tr>
                    ${rows(a, [
                "allergyName",
                "severity",
                "status",
                "recordedDate"
            ])}
                </table>

                <h2>Alerts</h2>
                <table>
                    <tr>
                        <th>Alert</th>
                        <th>Severity</th>
                        <th>Status</th>
                        <th>Message</th>
                    </tr>
                    ${rows(alerts, [
                "title",
                "severity",
                "status",
                "message"
            ])}
                </table>

                <h2>Medications</h2>
                <table>
                    <tr>
                        <th>Medication</th>
                        <th>Strength</th>
                        <th>Instructions</th>
                        <th>Status</th>
                    </tr>
                    ${rows(m, [
                "medicationName",
                "strength",
                "dosageInstructions",
                "status"
            ])}
                </table>

                <p class="disclaimer">
                    CareView assessment prototype. Fictional records only.
                    Not for clinical decision-making.
                </p>

                <script>
                    window.onload = () => window.print();
                <\/script>
            </body>
            </html>
        `);

        w.document.close();
    } catch (err) {
        message(err.message);
    }
});

checkSession();