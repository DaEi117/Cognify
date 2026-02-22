"use strict";

console.log("Cognify – V9.0 app.js (Statistik-Modul + V8.4 Features)");

// ==========================
// DOM Helpers
// ==========================
function $(id) {
    const el = document.getElementById(id);
    if (!el) throw new Error(`Element mit id="${id}" nicht gefunden.`);
    return el;
}

// ==========================
// DOM Elemente
// ==========================
const btnListen = $("btnListen");
const btnAbfrage = $("btnAbfrage");
const btnStatistik = $("btnStatistik");

const btnInfo = $("btnInfo");
const infoModal = $("infoModal");
const infoBackdrop = $("infoBackdrop");
const btnInfoClose = $("btnInfoClose");

const modulListen = $("modulListen");
const modulAbfrage = $("modulAbfrage");
const modulStatistik = $("modulStatistik");

const listenName = $("listenName");
const feldA = $("feldA");
const feldB = $("feldB");
const listeAnlegen = $("listeAnlegen");

const btnImportXlsx = $("btnImportXlsx");
const fileImportXlsx = $("fileImportXlsx");

const btnExportAllJson = $("btnExportAllJson");
const btnSortListenAz = $("btnSortListenAz");

const listenUebersicht = $("listenUebersicht");
const eintragsBereich = $("eintragsBereich");
const aktiveListeTitel = $("aktiveListeTitel");
const wertA = $("wertA");
const wertB = $("wertB");
const eintragHinzufuegen = $("eintragHinzufuegen");
const eintragsListe = $("eintragsListe");

const abfrageListe = $("abfrageListe");
const karteikastenOption = $("karteikastenOption");
const fachAuswahl = $("fachAuswahl");
const abfrageFolge = $("abfrageFolge");
const richtung = $("richtung");
const runden = $("runden");
const startAbfrage = $("startAbfrage");
const restAnzeige = $("restAnzeige");

const abfrageBox = $("abfrageBox");
const frage = $("frage");
const loesung = $("loesung");
const btnPruefen = $("btnPruefen");
const bewertung = $("bewertung");
const btnRichtig = $("btnRichtig");
const btnFalsch = $("btnFalsch");

// Bilder in Abfrage
const frageBildWrap = $("frageBildWrap");
const frageBild = $("frageBild");
const antwortBildWrap = $("antwortBildWrap");
const antwortBild = $("antwortBild");

// Bildimport (pro Liste)
const fileImportImages = $("fileImportImages");

// Statistik DOM
const statTotalLists = $("statTotalLists");
const statTotalEntries = $("statTotalEntries");
const statTotalAnswers = $("statTotalAnswers");
const statTotalQuote = $("statTotalQuote");

const listenVergleichTable = $("listenVergleichTable");
const listenVergleichBody = $("listenVergleichBody");

const statListSelect = $("statListSelect");
const fachBar1 = $("fachBar1");
const fachBar2 = $("fachBar2");
const fachBar3 = $("fachBar3");
const fachBar4 = $("fachBar4");
const fachBar5 = $("fachBar5");
const fachCount1 = $("fachCount1");
const fachCount2 = $("fachCount2");
const fachCount3 = $("fachCount3");
const fachCount4 = $("fachCount4");
const fachCount5 = $("fachCount5");

const topErrorRateBody = $("topErrorRateBody");
const lowQuoteBody = $("lowQuoteBody");

// ==========================
// V10 – KI Generierung Modal Elemente
// ==========================
const btnGenerateXlsx = $("btnGenerateXlsx");
const genModal = $("genModal");
const genBackdrop = $("genBackdrop");
const btnGenClose = $("btnGenClose");

const genListName = $("genListName");
const genCount = $("genCount");
const genColA = $("genColA");
const genColB = $("genColB");
const genLevel = $("genLevel");
const genInstructions = $("genInstructions");

const btnGenStart = $("btnGenStart");
const genStatus = $("genStatus");

// ==========================
// Speicher
// ==========================
let listen = JSON.parse(localStorage.getItem("listen") || "[]");

function speichern() {
    localStorage.setItem("listen", JSON.stringify(listen));
}

// ==========================
// Utilities
// ==========================

// V10: Backend Endpoint (Vercel) – HIER anpassen nach Deployment
const GENERATE_API_URL = "https://cognify-backend-psi.vercel.app/api/generate-list";

function normText(v) {
    return (v ?? "").toString().trim();
}

function ensureListShape(l) {
    if (!l) return;
    if (!Array.isArray(l.eintraege)) l.eintraege = [];
    l.feldA = l.feldA || "Spalte 1";
    l.feldB = l.feldB || "Spalte 2";

    l.eintraege.forEach(e => {
        if (!e.fach) e.fach = 1;
        if (typeof e.richtig !== "number") e.richtig = 0;
        if (typeof e.falsch !== "number") e.falsch = 0;
        e.a = e.a ?? "";
        e.b = e.b ?? "";
    });
}

function refreshEverywhere() {
    speichern();
    anzeigenListen();
    if (aktiveListe) anzeigenEintraege();
    if (modulAbfrage.style.display !== "none") ladeAbfrageListen();
    if (modulStatistik.style.display !== "none") renderStatistik();
}

// ==========================
// Scroll Helper (mit Offset)
// ==========================
function scrollToElementWithOffset(el, offsetPx = 24) {
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const y = window.scrollY + rect.top - offsetPx;
    window.scrollTo({ top: y, behavior: "smooth" });
}

function ensureButtonsVisible() {
    scrollToElementWithOffset(bewertung, 24);
}

function ensurePruefenVisible() {
    scrollToElementWithOffset(btnPruefen, 24);
}

// ==========================
// Bild-Key Normalisierung (Umlaut/Unicode robust)
// ==========================
function normalizeUnicodeNFC(s) {
    return (s ?? "").toString().normalize("NFC");
}

function normalizeKeyUmlautToE(input) {
    let s = normalizeUnicodeNFC(input).toLowerCase();
    s = s.replace(/\s+/g, " ").trim();
    s = s.normalize("NFD");

    s = s
        .replace(/a\u0308/g, "ae")
        .replace(/o\u0308/g, "oe")
        .replace(/u\u0308/g, "ue")
        .replace(/ß/g, "ss");

    s = s.replace(/[\u0300-\u036f]/g, "");
    s = s.replace(/[^a-z0-9]+/g, " ").trim();
    s = s.replace(/\s+/g, "_");
    return s;
}

function normalizeKeyStripDiacritics(input) {
    let s = normalizeUnicodeNFC(input).toLowerCase();
    s = s.replace(/\s+/g, " ").trim();

    s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    s = s.replace(/ß/g, "ss");

    s = s.replace(/[^a-z0-9]+/g, " ").trim();
    s = s.replace(/\s+/g, "_");
    return s;
}

function normalizeKeyEncodedRaw(input) {
    let s = normalizeUnicodeNFC(input).toLowerCase();
    s = s.replace(/\s+/g, " ").trim();
    s = s.replace(/\s+/g, "_");
    return encodeURIComponent(s);
}

function candidateKeysForText(text) {
    const raw = (text ?? "").toString().trim();
    const keys = [
        normalizeKeyEncodedRaw(raw),
        normalizeKeyUmlautToE(raw),
        normalizeKeyStripDiacritics(raw)
    ];
    return Array.from(new Set(keys.filter(k => k && k.length > 0)));
}

function filenameBase(name) {
    return (name ?? "").toString().replace(/\.[^.]+$/, "");
}

// ==========================
// IndexedDB: Bilder speichern
// ==========================
const DB_NAME = "cognify_db";
const DB_VERSION = 1;
const STORE_IMAGES = "images";
let dbPromise = null;

function openDB() {
    if (dbPromise) return dbPromise;

    dbPromise = new Promise((resolve, reject) => {
        const req = indexedDB.open(DB_NAME, DB_VERSION);

        req.onupgradeneeded = () => {
            const db = req.result;
            if (!db.objectStoreNames.contains(STORE_IMAGES)) {
                const store = db.createObjectStore(STORE_IMAGES, { keyPath: ["listName", "key"] });
                store.createIndex("by_list", "listName", { unique: false });
            }
        };

        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });

    return dbPromise;
}

async function putImage(listName, key, blob, mime, originalName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_IMAGES, "readwrite");
        const store = tx.objectStore(STORE_IMAGES);

        const getReq = store.get([listName, key]);
        getReq.onsuccess = () => {
            if (getReq.result) {
                resolve(false);
                return;
            }
            const item = { listName, key, blob, mime, originalName, savedAt: Date.now() };
            const putReq = store.put(item);
            putReq.onsuccess = () => resolve(true);
            putReq.onerror = () => reject(putReq.error);
        };
        getReq.onerror = () => reject(getReq.error);
    });
}

async function getImage(listName, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_IMAGES, "readonly");
        const store = tx.objectStore(STORE_IMAGES);
        const req = store.get([listName, key]);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
    });
}

async function deleteImagesForList(listName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_IMAGES, "readwrite");
        const store = tx.objectStore(STORE_IMAGES);
        const idx = store.index("by_list");
        const cursorReq = idx.openCursor(listName);
        let deleted = 0;

        cursorReq.onsuccess = () => {
            const cursor = cursorReq.result;
            if (!cursor) {
                resolve(deleted);
                return;
            }
            store.delete(cursor.primaryKey);
            deleted++;
            cursor.continue();
        };
        cursorReq.onerror = () => reject(cursorReq.error);
    });
}

// ==========================
// Bild-Komprimierung (max 1024px)
// ==========================
async function fileToImageBitmap(file) {
    if ("createImageBitmap" in window) {
        return await createImageBitmap(file);
    }
    const dataUrl = await new Promise((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result);
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
    });

    const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.onload = () => resolve(i);
        i.onerror = () => reject(new Error("Bild konnte nicht geladen werden."));
        i.src = dataUrl;
    });

    return img;
}

async function compressImageFile(file, maxSize = 1024) {
    const mimeIn = (file.type || "").toLowerCase();
    const bitmap = await fileToImageBitmap(file);

    const w = bitmap.width;
    const h = bitmap.height;
    const scale = Math.min(1, maxSize / Math.max(w, h));
    const nw = Math.max(1, Math.round(w * scale));
    const nh = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = nw;
    canvas.height = nh;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(bitmap, 0, 0, nw, nh);

    const outMime = (mimeIn === "image/png") ? "image/png" : "image/jpeg";
    const quality = 0.82;

    const blob = await new Promise((resolve) => {
        if (outMime === "image/png") {
            canvas.toBlob(b => resolve(b), outMime);
        } else {
            canvas.toBlob(b => resolve(b), outMime, quality);
        }
    });

    return { blob, mime: outMime };
}

// ==========================
// Download Helper / Export
// ==========================
function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function safeFilename(name, fallback = "export") {
    return (name || fallback).replace(/[\\/:*?"<>|]/g, "_");
}

function exportListAsJSON(listObj) {
    const payload = {
        schemaVersion: 1,
        name: listObj.name,
        feldA: listObj.feldA,
        feldB: listObj.feldB,
        eintraege: (listObj.eintraege || []).map(e => ({
            a: e.a,
            b: e.b,
            richtig: e.richtig || 0,
            falsch: e.falsch || 0,
            fach: e.fach || 1
        }))
    };

    const file = `${safeFilename(listObj.name, "liste")}.json`;
    downloadFile(file, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
}

function csvEscape(value, delimiter) {
    const s = (value ?? "").toString();
    const mustQuote = s.includes('"') || s.includes("\n") || s.includes("\r") || s.includes(delimiter);
    const escaped = s.replace(/"/g, '""');
    return mustQuote ? `"${escaped}"` : escaped;
}

function exportListAsCSV(listObj) {
    const delimiter = ";";
    const header = `${csvEscape(listObj.feldA, delimiter)}${delimiter}${csvEscape(listObj.feldB, delimiter)}`;
    const rows = (listObj.eintraege || []).map(e =>
        `${csvEscape(e.a, delimiter)}${delimiter}${csvEscape(e.b, delimiter)}`
    );
    const content = [header, ...rows].join("\n");
    const file = `${safeFilename(listObj.name, "liste")}.csv`;
    downloadFile(file, content, "text/csv;charset=utf-8");
}

function exportListAsXLSX(listObj) {
    if (typeof XLSX === "undefined") {
        alert("XLSX-Bibliothek ist nicht verfügbar. Bitte Internetverbindung prüfen (SheetJS CDN).");
        return;
    }
    ensureListShape(listObj);

    const aoa = [];
    aoa.push([listObj.feldA || "Spalte 1", listObj.feldB || "Spalte 2"]);
    (listObj.eintraege || []).forEach(e => aoa.push([e.a ?? "", e.b ?? ""]));

    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Liste");

    const file = `${safeFilename(listObj.name, "liste")}.xlsx`;
    XLSX.writeFile(wb, file);
}

btnExportAllJson.onclick = () => {
    const payload = {
        schemaVersion: 1,
        exportedAt: new Date().toISOString(),
        listen: listen.map(l => {
            ensureListShape(l);
            return {
                name: l.name,
                feldA: l.feldA,
                feldB: l.feldB,
                eintraege: (l.eintraege || []).map(e => ({
                    a: e.a, b: e.b,
                    richtig: e.richtig || 0,
                    falsch: e.falsch || 0,
                    fach: e.fach || 1
                }))
            };
        })
    };
    downloadFile("cognify_export_all.json", JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
};

// ==========================
// Navigation
// ==========================
function setActiveNav(active) {
    const map = {
        listen: btnListen,
        abfrage: btnAbfrage,
        statistik: btnStatistik
    };

    Object.values(map).forEach(b => {
        b.classList.remove("btn-primary");
        b.classList.add("btn-ghost");
    });

    map[active].classList.add("btn-primary");
    map[active].classList.remove("btn-ghost");
}

function showModule(which) {
    modulListen.style.display = (which === "listen") ? "block" : "none";
    modulAbfrage.style.display = (which === "abfrage") ? "block" : "none";
    modulStatistik.style.display = (which === "statistik") ? "block" : "none";
    setActiveNav(which);

    if (which === "abfrage") ladeAbfrageListen();
    if (which === "statistik") renderStatistik();
}

btnListen.onclick = () => showModule("listen");
btnAbfrage.onclick = () => showModule("abfrage");
btnStatistik.onclick = () => showModule("statistik");

// ==========================
// V9.1: Info Modal (Öffnen/Schließen)
// ==========================
function openInfoModal() {
    infoModal.classList.add("isOpen");
    infoModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modalOpen");
    // Fokus auf Close (besser für Mobile + Accessibility)
    requestAnimationFrame(() => btnInfoClose.focus());
}

function closeInfoModal() {
    infoModal.classList.remove("isOpen");
    infoModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modalOpen");
    // Fokus zurück auf i-Button
    requestAnimationFrame(() => btnInfo.focus());
}

btnInfo.onclick = () => openInfoModal();
btnInfoClose.onclick = () => closeInfoModal();
infoBackdrop.onclick = () => closeInfoModal();

window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && infoModal.classList.contains("isOpen")) {
        closeInfoModal();
    }
});

// ==========================
// V10: Generate Modal (Open/Close)
// ==========================
function openGenModal() {
    genModal.classList.add("isOpen");
    genModal.setAttribute("aria-hidden", "false");
    document.body.classList.add("modalOpen");
    genStatus.textContent = "";
    requestAnimationFrame(() => genListName.focus());
}

function closeGenModal() {
    genModal.classList.remove("isOpen");
    genModal.setAttribute("aria-hidden", "true");
    document.body.classList.remove("modalOpen");
    requestAnimationFrame(() => btnGenerateXlsx.focus());
}

btnGenerateXlsx.onclick = () => openGenModal();
btnGenClose.onclick = () => closeGenModal();
genBackdrop.onclick = () => closeGenModal();

window.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && genModal.classList.contains("isOpen")) {
        closeGenModal();
    }
});

function clampInt(n, min, max) {
    const x = parseInt(n, 10);
    if (Number.isNaN(x)) return min;
    return Math.max(min, Math.min(max, x));
}

function setGenBusy(isBusy, msg = "") {
    btnGenStart.disabled = isBusy;
    btnGenClose.disabled = isBusy;
    genListName.disabled = isBusy;
    genCount.disabled = isBusy;
    genColA.disabled = isBusy;
    genColB.disabled = isBusy;
    genLevel.disabled = isBusy;
    genInstructions.disabled = isBusy;
    genStatus.textContent = msg;
}

btnGenStart.onclick = async () => {
    const name = normText(genListName.value);
    const a = normText(genColA.value);
    const b = normText(genColB.value);
    const count = clampInt(genCount.value, 1, 200);
    const level = (genLevel.value || "medium");
    const instructions = normText(genInstructions.value);

    if (!name || !a || !b) {
        alert("Bitte Listenname sowie Spalten A und B ausfüllen.");
        return;
    }
    if (instructions.length > 300) {
        alert("Anweisungen dürfen maximal 300 Zeichen haben.");
        return;
    }

    setGenBusy(true, "Generiere…");

    try {
        const res = await fetch(GENERATE_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                listName: name,
                colA: a,
                colB: b,
                count,
                level,
                instructions
            })
        });

        if (!res.ok) {
            const text = await res.text();
            throw new Error(`Backend Fehler (${res.status}): ${text}`);
        }

        const data = await res.json();
        // Erwartet: { name, feldA, feldB, eintraege:[{a,b}...] }

        const baseName = normText(data.name || name);
        const finalName = makeUniqueListName(baseName);

        const eintraege = Array.isArray(data.eintraege) ? data.eintraege : [];
        if (eintraege.length === 0) throw new Error("Keine Einträge vom Backend erhalten.");

        // In Cognify-Format übernehmen
        const newList = {
            name: finalName,
            feldA: normText(data.feldA || a),
            feldB: normText(data.feldB || b),
            eintraege: eintraege.map(e => ({
                a: normText(e.a),
                b: normText(e.b),
                richtig: 0,
                falsch: 0,
                fach: 1
            })).filter(e => e.a && e.b)
        };

        if (newList.eintraege.length === 0) throw new Error("Einträge waren leer/ungültig.");

        listen.push(newList);
        refreshEverywhere();

        setGenBusy(false, `Fertig ✅ (${newList.eintraege.length} Einträge)`);
        closeGenModal();

        // Optional: direkt öffnen + scrollen
        aktiveListe = newList;
        aktiveListeTitel.textContent = newList.name;
        wertA.placeholder = newList.feldA;
        wertB.placeholder = newList.feldB;
        eintragsBereich.style.display = "block";
        anzeigenEintraege();
        requestAnimationFrame(() => scrollToElementWithOffset(eintragsBereich, 24));

        alert(`Liste erstellt ✅\n${newList.name}\nEinträge: ${newList.eintraege.length}`);

    } catch (err) {
        console.error(err);
        alert(`Generierung fehlgeschlagen.\n\n${err.message}`);
        setGenBusy(false, "");
    }
};

// ==========================
// Statistik – Berechnung
// ==========================
function calcEntryStats(e) {
    const r = e.richtig || 0;
    const f = e.falsch || 0;
    const total = r + f;
    const quote = total === 0 ? 0 : Math.round((r / total) * 100);
    const errorRate = total === 0 ? 0 : Math.round((f / total) * 100);
    return { r, f, total, quote, errorRate };
}

function calcListStats(l) {
    ensureListShape(l);

    let r = 0, f = 0;
    const fachCounts = [0, 0, 0, 0, 0]; // index 0 => Fach 1

    for (const e of (l.eintraege || [])) {
        r += (e.richtig || 0);
        f += (e.falsch || 0);
        const fach = Math.min(5, Math.max(1, e.fach || 1));
        fachCounts[fach - 1]++;
    }

    const total = r + f;
    const quote = total === 0 ? 0 : Math.round((r / total) * 100);

    return {
        name: l.name,
        entries: (l.eintraege || []).length,
        correct: r,
        wrong: f,
        answers: total,
        quote,
        fachCounts
    };
}

function calcGlobalStats() {
    const listCount = listen.length;
    let entries = 0, correct = 0, wrong = 0;
    const fachCounts = [0, 0, 0, 0, 0];

    for (const l of listen) {
        const s = calcListStats(l);
        entries += s.entries;
        correct += s.correct;
        wrong += s.wrong;
        for (let i = 0; i < 5; i++) fachCounts[i] += s.fachCounts[i];
    }

    const answers = correct + wrong;
    const quote = answers === 0 ? 0 : Math.round((correct / answers) * 100);

    return { listCount, entries, answers, quote, fachCounts };
}

// ==========================
// Statistik – UI / Render
// ==========================
let listenTableSort = { col: "name", dir: "asc" }; // Default wie vereinbart

function compareValues(a, b, dir) {
    const mul = (dir === "asc") ? 1 : -1;
    if (typeof a === "string" && typeof b === "string") {
        return mul * a.localeCompare(b, "de", { sensitivity: "base", numeric: true });
    }
    return mul * ((a ?? 0) - (b ?? 0));
}

function renderListenVergleich(statsArr) {
    // Sort
    const { col, dir } = listenTableSort;

    const get = (s) => {
        if (col === "name") return s.name;
        if (col === "entries") return s.entries;
        if (col === "answers") return s.answers;
        if (col === "correct") return s.correct;
        if (col === "wrong") return s.wrong;
        if (col === "quote") return s.quote;
        if (col === "fach1") return s.fachCounts[0];
        if (col === "fach2") return s.fachCounts[1];
        if (col === "fach3") return s.fachCounts[2];
        if (col === "fach4") return s.fachCounts[3];
        if (col === "fach5") return s.fachCounts[4];
        return s.name;
    };

    const sorted = [...statsArr].sort((x, y) => compareValues(get(x), get(y), dir));

    listenVergleichBody.innerHTML = "";
    for (const s of sorted) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${escapeHtml(s.name)}</td>
            <td class="num">${s.entries}</td>
            <td class="num">${s.answers}</td>
            <td class="num">${s.correct}</td>
            <td class="num">${s.wrong}</td>
            <td class="num">${s.quote}%</td>
            <td class="num">${s.fachCounts[0]}</td>
            <td class="num">${s.fachCounts[1]}</td>
            <td class="num">${s.fachCounts[2]}</td>
            <td class="num">${s.fachCounts[3]}</td>
            <td class="num">${s.fachCounts[4]}</td>
        `;
        listenVergleichBody.appendChild(tr);
    }
}

function renderFachVerteilung(fachCounts) {
    const total = fachCounts.reduce((a, b) => a + b, 0) || 0;
    const pct = (n) => total === 0 ? 0 : Math.round((n / total) * 100);

    const p1 = pct(fachCounts[0]);
    const p2 = pct(fachCounts[1]);
    const p3 = pct(fachCounts[2]);
    const p4 = pct(fachCounts[3]);
    const p5 = pct(fachCounts[4]);

    fachBar1.style.width = `${p1}%`;
    fachBar2.style.width = `${p2}%`;
    fachBar3.style.width = `${p3}%`;
    fachBar4.style.width = `${p4}%`;
    fachBar5.style.width = `${p5}%`;

    fachCount1.textContent = `${fachCounts[0]} (${p1}%)`;
    fachCount2.textContent = `${fachCounts[1]} (${p2}%)`;
    fachCount3.textContent = `${fachCounts[2]} (${p3}%)`;
    fachCount4.textContent = `${fachCounts[3]} (${p4}%)`;
    fachCount5.textContent = `${fachCounts[4]} (${p5}%)`;
}

function renderSchwachstellen() {
    // Vorgaben
    const LOW_QUOTE_MIN_TRIES = 5;
    const LOW_QUOTE_THRESHOLD = 60; // Quote < 60%
    const LIMIT = 20;

    const all = [];

    for (const l of listen) {
        ensureListShape(l);
        for (const e of (l.eintraege || [])) {
            const s = calcEntryStats(e);
            if (s.total === 0) continue;

            all.push({
                listName: l.name,
                a: e.a ?? "",
                b: e.b ?? "",
                tries: s.total,
                correct: s.r,
                wrong: s.f,
                quote: s.quote,
                errorRate: s.errorRate
            });
        }
    }

    // Top Fehler-Rate: nach errorRate desc, bei Gleichstand mehr Versuche zuerst
    const topError = all
        .slice()
        .sort((x, y) => {
            if (y.errorRate !== x.errorRate) return y.errorRate - x.errorRate;
            return y.tries - x.tries;
        })
        .slice(0, LIMIT);

    topErrorRateBody.innerHTML = "";
    for (const it of topError) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${escapeHtml(it.listName)}</td>
            <td>${escapeHtml(`${it.a} ↔ ${it.b}`)}</td>
            <td class="num">${it.tries}</td>
            <td class="num">${it.wrong}</td>
            <td class="num">${it.errorRate}%</td>
        `;
        topErrorRateBody.appendChild(tr);
    }

    // Low Quote: min tries + quote < threshold
    const lowQuote = all
        .filter(x => x.tries >= LOW_QUOTE_MIN_TRIES && x.quote < LOW_QUOTE_THRESHOLD)
        .sort((x, y) => {
            // schlechteste Quote zuerst, bei Gleichstand mehr Versuche
            if (x.quote !== y.quote) return x.quote - y.quote;
            return y.tries - x.tries;
        })
        .slice(0, LIMIT);

    lowQuoteBody.innerHTML = "";
    for (const it of lowQuote) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${escapeHtml(it.listName)}</td>
            <td>${escapeHtml(`${it.a} ↔ ${it.b}`)}</td>
            <td class="num">${it.tries}</td>
            <td class="num">${it.correct}</td>
            <td class="num">${it.quote}%</td>
        `;
        lowQuoteBody.appendChild(tr);
    }
}

function renderStatistik() {
    // Sicherstellen, dass Listen-Objekte sauber sind
    listen.forEach(ensureListShape);

    // Gesamtübersicht
    const g = calcGlobalStats();
    statTotalLists.textContent = String(g.listCount);
    statTotalEntries.textContent = String(g.entries);
    statTotalAnswers.textContent = String(g.answers);
    statTotalQuote.textContent = `${g.quote}%`;

    // Listenvergleich
    const listStats = listen.map(calcListStats);
    renderListenVergleich(listStats);

    // Select für Fachverteilung
    const prev = statListSelect.value;
    statListSelect.innerHTML = "";

    const optAll = document.createElement("option");
    optAll.value = "__all__";
    optAll.textContent = "Alle Listen (global)";
    statListSelect.appendChild(optAll);

    listen.forEach((l, idx) => {
        const opt = document.createElement("option");
        opt.value = String(idx);
        opt.textContent = l.name;
        statListSelect.appendChild(opt);
    });

    // Auswahl beibehalten, falls möglich
    if (prev && Array.from(statListSelect.options).some(o => o.value === prev)) {
        statListSelect.value = prev;
    } else {
        statListSelect.value = "__all__";
    }

    // Fachverteilung initial rendern
    const sel = statListSelect.value;
    if (sel === "__all__") {
        renderFachVerteilung(g.fachCounts);
    } else {
        const idx = parseInt(sel, 10);
        const l = listen[idx];
        const s = l ? calcListStats(l) : null;
        renderFachVerteilung(s ? s.fachCounts : [0, 0, 0, 0, 0]);
    }

    // Schwachstellen
    renderSchwachstellen();
}

statListSelect.onchange = () => {
    const sel = statListSelect.value;
    if (sel === "__all__") {
        const g = calcGlobalStats();
        renderFachVerteilung(g.fachCounts);
    } else {
        const idx = parseInt(sel, 10);
        const l = listen[idx];
        const s = l ? calcListStats(l) : null;
        renderFachVerteilung(s ? s.fachCounts : [0, 0, 0, 0, 0]);
    }
};

// Sortier-Klicks (Listenvergleich)
listenVergleichTable.addEventListener("click", (ev) => {
    const th = ev.target && ev.target.closest && ev.target.closest("th");
    if (!th) return;
    const col = th.getAttribute("data-col");
    if (!col) return;

    if (listenTableSort.col === col) {
        listenTableSort.dir = (listenTableSort.dir === "asc") ? "desc" : "asc";
    } else {
        listenTableSort.col = col;
        listenTableSort.dir = "asc";
    }

    renderStatistik();
});

function escapeHtml(s) {
    return (s ?? "").toString()
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}

// ==========================
// Listen UI (inkl. V8.4 Einklappen + Scroll beim Öffnen)
// ==========================
let aktiveListe = null;

function styleBtn(btn, variant, small = false) {
    btn.classList.add("btn");
    if (small) btn.classList.add("btn-small");
    if (variant) btn.classList.add(variant);
    return btn;
}
function makeListItemContainer() {
    const li = document.createElement("li");
    li.className = "listItem";
    return li;
}
function makeItemRow() {
    const row = document.createElement("div");
    row.className = "itemRow";
    return row;
}
function makeMeta(text) {
    const div = document.createElement("div");
    div.className = "itemMeta";
    div.textContent = text;
    return div;
}

let pendingImageImportList = null;

async function anzeigenListen() {
    listenUebersicht.innerHTML = "";

    for (const l of listen) {
        ensureListShape(l);

        const li = makeListItemContainer();
        li.classList.remove("expanded");

        const row = makeItemRow();

        const toggle = styleBtn(document.createElement("button"), "btn-ghost", true);
        toggle.classList.add("listToggleBtn");
        toggle.type = "button";
        toggle.textContent = "›";
        toggle.setAttribute("aria-label", "Listenaktionen ein-/ausklappen");
        toggle.setAttribute("aria-expanded", "false");
        toggle.onclick = () => {
            const expanded = li.classList.toggle("expanded");
            toggle.setAttribute("aria-expanded", expanded ? "true" : "false");
        };

        const titel = document.createElement("div");
        titel.className = "itemTitle";
        titel.textContent = l.name;

        const open = styleBtn(document.createElement("button"), "btn-primary", true);
        open.textContent = "Öffnen";
        open.onclick = () => {
            aktiveListe = l;
            aktiveListeTitel.textContent = l.name;
            wertA.placeholder = l.feldA || "Spalte 1";
            wertB.placeholder = l.feldB || "Spalte 2";
            eintragsBereich.style.display = "block";
            anzeigenEintraege();

            requestAnimationFrame(() => scrollToElementWithOffset(eintragsBereich, 24));
        };

        const actions = document.createElement("div");
        actions.className = "listActions";

        const edit = styleBtn(document.createElement("button"), "btn-ghost", true);
        edit.textContent = "Bearbeiten";
        edit.onclick = () => {
            const newName = prompt("Listenname bearbeiten:", l.name);
            if (newName === null) return;
            const nameTrim = normText(newName);
            if (!nameTrim) return alert("Listenname darf nicht leer sein.");

            const newFeldA = prompt("Spaltenname A bearbeiten:", l.feldA);
            if (newFeldA === null) return;
            const feldATrim = normText(newFeldA);
            if (!feldATrim) return alert("Spaltenname A darf nicht leer sein.");

            const newFeldB = prompt("Spaltenname B bearbeiten:", l.feldB);
            if (newFeldB === null) return;
            const feldBTrim = normText(newFeldB);
            if (!feldBTrim) return alert("Spaltenname B darf nicht leer sein.");

            l.name = nameTrim;
            l.feldA = feldATrim;
            l.feldB = feldBTrim;

            if (aktiveListe === l) {
                aktiveListeTitel.textContent = l.name;
                wertA.placeholder = l.feldA;
                wertB.placeholder = l.feldB;
            }

            refreshEverywhere();
        };

        const exportJson = styleBtn(document.createElement("button"), "btn-ghost", true);
        exportJson.textContent = "JSON";
        exportJson.onclick = () => exportListAsJSON(l);

        const exportCsv = styleBtn(document.createElement("button"), "btn-ghost", true);
        exportCsv.textContent = "CSV";
        exportCsv.onclick = () => exportListAsCSV(l);

        const exportXlsx = styleBtn(document.createElement("button"), "btn-ghost", true);
        exportXlsx.textContent = "XLSX";
        exportXlsx.onclick = () => exportListAsXLSX(l);

        const imgAdd = styleBtn(document.createElement("button"), "btn-ghost", true);
        imgAdd.textContent = "Bilder";
        imgAdd.onclick = () => {
            pendingImageImportList = l;
            alert(
                `Bilder hinzufügen für "${l.name}"\n\n` +
                `iPhone: Öffne im Datei-Picker den Ordner der Liste und wähle die Bilder (Mehrfachauswahl).`
            );
            fileImportImages.setAttribute("webkitdirectory", "");
            fileImportImages.setAttribute("directory", "");
            fileImportImages.click();
        };

        const imgDel = styleBtn(document.createElement("button"), "btn-danger", true);
        imgDel.textContent = "Bilder löschen";
        imgDel.onclick = async () => {
            if (!confirm(`Alle Bilder für "${l.name}" wirklich löschen?`)) return;
            const n = await deleteImagesForList(l.name);
            alert(`Gelöscht: ${n} Bilder`);
            await anzeigenListen();
            if (modulStatistik.style.display !== "none") renderStatistik();
        };

        const fachReset = styleBtn(document.createElement("button"), "btn-ghost", true);
        fachReset.textContent = "Fach Reset";
        fachReset.onclick = () => {
            l.eintraege.forEach(e => e.fach = 1);
            refreshEverywhere();
        };

        const statReset = styleBtn(document.createElement("button"), "btn-ghost", true);
        statReset.textContent = "Stat Reset";
        statReset.onclick = () => {
            l.eintraege.forEach(e => { e.richtig = 0; e.falsch = 0; });
            refreshEverywhere();
        };

        const del = styleBtn(document.createElement("button"), "btn-danger", true);
        del.textContent = "Löschen";
        del.onclick = () => {
            if (!confirm("Liste wirklich löschen?")) return;
            const warAktiv = (aktiveListe === l);
            listen = listen.filter(x => x !== l);
            if (warAktiv) {
                aktiveListe = null;
                eintragsBereich.style.display = "none";
                eintragsListe.innerHTML = "";
            }
            refreshEverywhere();
        };

        actions.append(
            edit,
            exportJson, exportCsv, exportXlsx,
            imgAdd, imgDel,
            fachReset, statReset, del
        );

        row.append(toggle, titel, open, actions);

        // Meta pro Liste (ohne Bilder, wie vereinbart)
        const s = calcListStats(l);
        const stat = makeMeta(
            `Einträge: ${s.entries} | Antworten: ${s.answers} | ✔ ${s.correct} | ✘ ${s.wrong} | ${s.quote}% | Fächer: ${s.fachCounts.join("/")}`
        );

        li.append(row, stat);
        listenUebersicht.appendChild(li);
    }
}

function anzeigenEintraege() {
    if (!aktiveListe) {
        eintragsListe.innerHTML = "";
        return;
    }

    ensureListShape(aktiveListe);
    eintragsListe.innerHTML = "";

    aktiveListe.eintraege.forEach((e, i) => {
        const li = makeListItemContainer();
        const row = makeItemRow();

        const titel = document.createElement("div");
        titel.className = "itemTitle";
        titel.textContent = `${e.a} ↔ ${e.b}`;

        const edit = styleBtn(document.createElement("button"), "btn-ghost", true);
        edit.textContent = "Bearbeiten";
        edit.onclick = () => {
            const newA = prompt(`Wert für "${aktiveListe.feldA}" bearbeiten:`, e.a);
            if (newA === null) return;
            const aTrim = normText(newA);
            if (!aTrim) return alert("Wert A darf nicht leer sein.");

            const newB = prompt(`Wert für "${aktiveListe.feldB}" bearbeiten:`, e.b);
            if (newB === null) return;
            const bTrim = normText(newB);
            if (!bTrim) return alert("Wert B darf nicht leer sein.");

            e.a = aTrim;
            e.b = bTrim;

            refreshEverywhere();
        };

        const del = styleBtn(document.createElement("button"), "btn-danger", true);
        del.textContent = "X";
        del.onclick = () => {
            aktiveListe.eintraege.splice(i, 1);
            refreshEverywhere();
        };

        row.append(titel, edit, del);

        const s = calcEntryStats(e);
        const meta = makeMeta(`Antworten: ${s.total} | ✔ ${s.r} | ✘ ${s.f} | ${s.quote}% | Fach ${e.fach}`);

        li.append(row, meta);
        eintragsListe.appendChild(li);
    });
}

listeAnlegen.onclick = () => {
    const name = normText(listenName.value);
    const a = normText(feldA.value);
    const b = normText(feldB.value);
    if (!name || !a || !b) return alert("Bitte Name der Liste sowie beide Spaltennamen ausfüllen.");

    listen.push({ name, feldA: a, feldB: b, eintraege: [] });
    refreshEverywhere();

    listenName.value = "";
    feldA.value = "";
    feldB.value = "";
};

eintragHinzufuegen.onclick = () => {
    if (!aktiveListe) return alert("Bitte zuerst eine Liste öffnen.");

    const a = normText(wertA.value);
    const b = normText(wertB.value);
    if (!a || !b) return alert("Bitte beide Werte für den Eintrag ausfüllen.");

    aktiveListe.eintraege.push({ a, b, richtig: 0, falsch: 0, fach: 1 });
    refreshEverywhere();

    wertA.value = "";
    wertB.value = "";
};

// ==========================
// Listen alphabetisch sortieren (A–Z)
// ==========================
btnSortListenAz.onclick = () => {
    if (!Array.isArray(listen) || listen.length < 2) return;

    listen.sort((x, y) => {
        const a = normText(x?.name).toLocaleLowerCase("de");
        const b = normText(y?.name).toLocaleLowerCase("de");
        return a.localeCompare(b, "de", { sensitivity: "base", numeric: true });
    });

    if (aktiveListe) {
        const name = aktiveListe.name;
        aktiveListe = listen.find(l => l.name === name) || aktiveListe;
    }

    refreshEverywhere();
};

// ==========================
// XLSX Import (Listen)
// ==========================
function makeUniqueListName(base) {
    const trimmed = normText(base || "Import") || "Import";
    let name = trimmed;
    let counter = 2;
    const exists = (n) => listen.some(l => normText(l.name).toLowerCase() === n.toLowerCase());
    while (exists(name)) {
        name = `${trimmed} (${counter})`;
        counter++;
    }
    return name;
}

btnImportXlsx.onclick = () => {
    alert("Bitte sicherstellen, dass die zu importierende Tabelle einen Header besitzt.");
    fileImportXlsx.click();
};

fileImportXlsx.onchange = () => {
    const file = fileImportXlsx.files && fileImportXlsx.files[0];
    if (!file) return;

    if (typeof XLSX === "undefined") {
        alert("XLSX-Bibliothek konnte nicht geladen werden (SheetJS). Bitte Internetverbindung prüfen oder Bibliothek lokal einbinden.");
        fileImportXlsx.value = "";
        return;
    }

    const reader = new FileReader();
    reader.onerror = () => {
        alert("Datei konnte nicht gelesen werden.");
        fileImportXlsx.value = "";
    };

    reader.onload = (evt) => {
        try {
            const workbook = XLSX.read(evt.target.result, { type: "array" });
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) return alert("Keine Tabelle in der Datei gefunden.");

            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });
            if (!rows || rows.length === 0) return alert("Die Tabelle ist leer.");

            const headerA = normText((rows[0] || [])[0]);
            const headerB = normText((rows[0] || [])[1]);
            if (!headerA || !headerB) return alert("Header ungültig. Bitte sicherstellen, dass Spalte A und B in der ersten Zeile benannt sind.");

            const baseName = normText(file.name || "Import").replace(/\.(xlsx|xls)$/i, "");
            const newListName = makeUniqueListName(baseName);

            const eintraege = [];
            for (let i = 1; i < rows.length; i++) {
                const a = (rows[i] || [])[0];
                const b = (rows[i] || [])[1];
                const aStr = (a ?? "").toString();
                const bStr = (b ?? "").toString();
                if (!aStr.trim() || !bStr.trim()) continue;

                eintraege.push({ a: aStr, b: bStr, richtig: 0, falsch: 0, fach: 1 });
            }

            if (eintraege.length === 0) return alert("Keine gültigen Einträge gefunden.");

            listen.push({ name: newListName, feldA: headerA, feldB: headerB, eintraege });
            refreshEverywhere();
            alert(`Import erfolgreich ✅\nListe: ${newListName}\nEinträge: ${eintraege.length}`);
        } catch (err) {
            console.error(err);
            alert("Import fehlgeschlagen. Bitte prüfen, ob es eine gültige XLSX-Datei ist.");
        } finally {
            fileImportXlsx.value = "";
        }
    };

    reader.readAsArrayBuffer(file);
};

// ==========================
// Bilder importieren (pro Liste)
// ==========================
fileImportImages.onchange = async () => {
    const files = fileImportImages.files ? Array.from(fileImportImages.files) : [];
    fileImportImages.value = "";

    if (!pendingImageImportList) return;
    const listName = pendingImageImportList.name;

    if (files.length === 0) return;

    const allowed = files.filter(f => {
        const t = (f.type || "").toLowerCase();
        const n = (f.name || "").toLowerCase();
        return t === "image/jpeg" || t === "image/png" || n.endsWith(".jpg") || n.endsWith(".jpeg") || n.endsWith(".png");
    });

    if (allowed.length === 0) {
        alert("Keine gültigen Bilder gefunden. Erlaubt: jpg/jpeg/png.");
        return;
    }

    let imported = 0;
    let skipped = 0;

    try {
        for (const file of allowed) {
            const base = filenameBase(file.name);
            const keys = candidateKeysForText(base);
            if (keys.length === 0) { skipped++; continue; }

            const { blob, mime } = await compressImageFile(file, 1024);

            let wroteAny = false;
            for (const k of keys) {
                const ok = await putImage(listName, k, blob, mime, file.name);
                if (ok) wroteAny = true;
            }

            if (wroteAny) imported++; else skipped++;
        }

        alert(`Bilder-Import fertig ✅\nNeu gespeichert: ${imported}\nÜbersprungen (alles existierte): ${skipped}`);
        await anzeigenListen();
    } catch (e) {
        console.error(e);
        alert("Bilder-Import fehlgeschlagen. Bitte erneut versuchen.");
    } finally {
        pendingImageImportList = null;
    }
};

// ==========================
// Abfrage / UI State
// ==========================
let abfrageDaten = [];
let index = 0;
let aktuelleListe = null;
let fromAtoB = true;
let aktuellerEintrag = null;

function updateRestAnzeige() {
    if (!abfrageDaten || abfrageDaten.length === 0 || index >= abfrageDaten.length) {
        restAnzeige.textContent = "";
        return;
    }
    const rest = abfrageDaten.length - index;
    restAnzeige.textContent = `Noch ${rest} ${rest === 1 ? "Eintrag" : "Einträge"}`;
}

function setAbfrageUIState(state) {
    if (state === "preCheck") {
        loesung.style.display = "none";
        bewertung.style.display = "none";
        btnPruefen.style.display = "inline-block";
        hideAnswerImage();
    } else if (state === "postCheck") {
        loesung.style.display = "block";
        bewertung.style.display = "grid";
        btnPruefen.style.display = "none";
    } else if (state === "finished") {
        loesung.style.display = "none";
        bewertung.style.display = "none";
        btnPruefen.style.display = "none";
        hideQuestionImage();
        hideAnswerImage();
    }
}

// ==========================
// Fix: Doppelte Abfragelisten verhindern (Render-Lock + Token + Dedupe)
// ==========================
let abfrageListenRenderLock = false;
let abfrageListenRenderToken = 0;

function ladeAbfrageListen() {
    if (abfrageListenRenderLock) return;
    abfrageListenRenderLock = true;

    const myToken = ++abfrageListenRenderToken;

    try {
        abfrageListe.innerHTML = "";

        if (listen.length === 0) {
            aktuelleListe = null;
            richtung.innerHTML = "";
            fachAuswahl.innerHTML = "";
            abfrageBox.style.display = "block";
            frage.textContent = "Keine Listen vorhanden. Lege zuerst eine Liste an.";
            setAbfrageUIState("finished");
            restAnzeige.textContent = "";
            return;
        }

        const seen = new Set();
        const frag = document.createDocumentFragment();

        listen.forEach((l, i) => {
            ensureListShape(l);
            const nameKey = normText(l.name).toLocaleLowerCase("de");
            if (seen.has(nameKey)) return;
            seen.add(nameKey);

            const opt = document.createElement("option");
            opt.value = String(i);
            opt.textContent = l.name;
            frag.appendChild(opt);
        });

        if (myToken !== abfrageListenRenderToken) return;

        abfrageListe.appendChild(frag);

        let idxToSelect = 0;
        if (aktuelleListe) {
            const idx = listen.indexOf(aktuelleListe);
            if (idx >= 0) idxToSelect = idx;
        }

        abfrageListe.value = String(idxToSelect);
        aktuelleListe = listen[idxToSelect];
        ensureListShape(aktuelleListe);

        richtung.innerHTML = `
            <option value="ab">${aktuelleListe.feldA} → ${aktuelleListe.feldB}</option>
            <option value="ba">${aktuelleListe.feldB} → ${aktuelleListe.feldA}</option>
        `;
        aktualisiereFachDropdown();

        restAnzeige.textContent = "";
    } finally {
        abfrageListenRenderLock = false;
    }
}

function aktualisiereFachDropdown() {
    fachAuswahl.innerHTML = "";
    if (!aktuelleListe) return;
    ensureListShape(aktuelleListe);

    for (let i = 1; i <= 5; i++) {
        const anzahl = aktuelleListe.eintraege.filter(e => e.fach === i).length;
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = `Fach ${i} – ${anzahl} Einträge`;
        fachAuswahl.appendChild(opt);
    }
}

karteikastenOption.onchange = () => {
    if (karteikastenOption.value === "ja") {
        fachAuswahl.disabled = false;
        runden.disabled = true;
    } else {
        fachAuswahl.disabled = true;
        runden.disabled = false;
    }
};

abfrageListe.onchange = () => {
    aktuelleListe = listen[parseInt(abfrageListe.value, 10)];
    if (!aktuelleListe) return;
    ensureListShape(aktuelleListe);

    richtung.innerHTML = `
        <option value="ab">${aktuelleListe.feldA} → ${aktuelleListe.feldB}</option>
        <option value="ba">${aktuelleListe.feldB} → ${aktuelleListe.feldA}</option>
    `;
    aktualisiereFachDropdown();
    restAnzeige.textContent = "";
};

function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
}

startAbfrage.onclick = () => {
    if (listen.length === 0) {
        abfrageBox.style.display = "block";
        frage.textContent = "Keine Listen vorhanden. Lege zuerst eine Liste an.";
        setAbfrageUIState("finished");
        restAnzeige.textContent = "";
        return;
    }

    aktuelleListe = listen[parseInt(abfrageListe.value, 10)];
    if (!aktuelleListe) {
        abfrageBox.style.display = "block";
        frage.textContent = "Bitte eine Liste auswählen.";
        setAbfrageUIState("finished");
        restAnzeige.textContent = "";
        return;
    }

    ensureListShape(aktuelleListe);

    if (karteikastenOption.value === "ja") {
        const fachNum = parseInt(fachAuswahl.value, 10);
        abfrageDaten = aktuelleListe.eintraege.filter(e => e.fach === fachNum);

        if (abfrageDaten.length === 0) {
            abfrageBox.style.display = "block";
            frage.textContent = "Keine Einträge vorhanden 🎯";
            setAbfrageUIState("finished");
            restAnzeige.textContent = "";
            return;
        }

        if (abfrageFolge.value === "random") shuffle(abfrageDaten);
    } else {
        abfrageDaten = [...aktuelleListe.eintraege];

        if (abfrageDaten.length === 0) {
            abfrageBox.style.display = "block";
            frage.textContent = "Keine Einträge vorhanden 🎯";
            setAbfrageUIState("finished");
            restAnzeige.textContent = "";
            return;
        }

        if (abfrageFolge.value === "random") shuffle(abfrageDaten);

        if (runden.value !== "all") {
            const n = parseInt(runden.value, 10);
            if (!Number.isNaN(n)) abfrageDaten = abfrageDaten.slice(0, n);
        }
    }

    index = 0;
    abfrageBox.style.display = "block";
    updateRestAnzeige();
    neueFrage();
};

// ==========================
// Bilder anzeigen in Abfrage
// ==========================
let currentQuestionObjectUrl = null;
let currentAnswerObjectUrl = null;
let imageRequestToken = 0;

function revokeUrl(url) {
    if (url) URL.revokeObjectURL(url);
}

function hideQuestionImage() {
    if (currentQuestionObjectUrl) {
        revokeUrl(currentQuestionObjectUrl);
        currentQuestionObjectUrl = null;
    }
    frageBildWrap.style.display = "none";
    frageBild.removeAttribute("src");
}

function hideAnswerImage() {
    if (currentAnswerObjectUrl) {
        revokeUrl(currentAnswerObjectUrl);
        currentAnswerObjectUrl = null;
    }
    antwortBildWrap.style.display = "none";
    antwortBild.removeAttribute("src");
}

async function showQuestionImageFor(text) {
    const token = ++imageRequestToken;
    const listName = aktuelleListe?.name;
    if (!listName) { hideQuestionImage(); return; }

    const keys = candidateKeysForText(text);
    if (keys.length === 0) { hideQuestionImage(); return; }

    let item = null;
    for (const k of keys) {
        item = await getImage(listName, k);
        if (token !== imageRequestToken) return;
        if (item && item.blob) break;
    }

    if (!item || !item.blob) {
        hideQuestionImage();
        return;
    }

    hideQuestionImage();
    const url = URL.createObjectURL(item.blob);
    currentQuestionObjectUrl = url;
    frageBild.src = url;
    frageBildWrap.style.display = "block";
}

async function showAnswerImageFor(text) {
    const token = ++imageRequestToken;
    const listName = aktuelleListe?.name;
    if (!listName) { hideAnswerImage(); return; }

    const keys = candidateKeysForText(text);
    if (keys.length === 0) { hideAnswerImage(); return; }

    let item = null;
    for (const k of keys) {
        item = await getImage(listName, k);
        if (token !== imageRequestToken) return;
        if (item && item.blob) break;
    }

    if (!item || !item.blob) {
        hideAnswerImage();
        return;
    }

    hideAnswerImage();
    const url = URL.createObjectURL(item.blob);
    currentAnswerObjectUrl = url;
    antwortBild.src = url;
    antwortBildWrap.style.display = "block";
}

// ==========================
// Abfrage Logik
// ==========================
function neueFrage() {
    if (index >= abfrageDaten.length) {
        frage.textContent = "Abfrage beendet 🎉";
        abfrageBox.style.display = "block";
        setAbfrageUIState("finished");
        updateRestAnzeige();
        refreshEverywhere();
        return;
    }

    aktuellerEintrag = abfrageDaten[index];
    fromAtoB = (richtung.value === "ab");

    const questionText = fromAtoB ? (aktuellerEintrag.a ?? "") : (aktuellerEintrag.b ?? "");
    frage.textContent = questionText;

    showQuestionImageFor(questionText).then(() => {
        requestAnimationFrame(() => ensurePruefenVisible());
    });

    setAbfrageUIState("preCheck");
    updateRestAnzeige();
}

btnPruefen.onclick = async () => {
    if (!aktuellerEintrag) return;

    const korrekt = fromAtoB ? (aktuellerEintrag.b ?? "") : (aktuellerEintrag.a ?? "");
    loesung.textContent = `Lösung: ${korrekt}`;

    await showAnswerImageFor(korrekt);

    setAbfrageUIState("postCheck");

    requestAnimationFrame(() => {
        requestAnimationFrame(() => ensureButtonsVisible());
    });
};

btnRichtig.onclick = () => {
    if (!aktuellerEintrag) return;

    if (karteikastenOption.value === "ja") {
        aktuellerEintrag.fach = Math.min((aktuellerEintrag.fach || 1) + 1, 5);
    }
    aktuellerEintrag.richtig = (aktuellerEintrag.richtig || 0) + 1;

    index++;
    speichern();
    neueFrage();
    aktualisiereFachDropdown();
    anzeigenListen();
    if (aktiveListe) anzeigenEintraege();
    if (modulStatistik.style.display !== "none") renderStatistik();
};

btnFalsch.onclick = () => {
    if (!aktuellerEintrag) return;

    if (karteikastenOption.value === "ja") {
        aktuellerEintrag.fach = 1;
    }
    aktuellerEintrag.falsch = (aktuellerEintrag.falsch || 0) + 1;

    index++;
    speichern();
    neueFrage();
    aktualisiereFachDropdown();
    anzeigenListen();
    if (aktiveListe) anzeigenEintraege();
    if (modulStatistik.style.display !== "none") renderStatistik();
};

// ==========================
// Start
// ==========================
async function init() {
    try { await openDB(); } catch (e) { console.warn("IndexedDB nicht verfügbar?", e); }
    await anzeigenListen();
    restAnzeige.textContent = "";
}
init();

// ==========================
// Service Worker Registrierung (falls vorhanden)
// ==========================
if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
        navigator.serviceWorker.register("./service-worker.js").catch(err => {
            console.warn("Service Worker registration failed:", err);
        });
    });
}