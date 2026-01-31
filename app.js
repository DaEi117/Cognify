"use strict";

console.log("Cognify – Fix: Scroll nach Start/Prüfen + Buttons immer sichtbar + Bilder pro Liste (IndexedDB)");

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
const modulListen = $("modulListen");
const modulAbfrage = $("modulAbfrage");

const listenName = $("listenName");
const feldA = $("feldA");
const feldB = $("feldB");
const listeAnlegen = $("listeAnlegen");

const btnImportXlsx = $("btnImportXlsx");
const fileImportXlsx = $("fileImportXlsx");

const btnExportAllJson = $("btnExportAllJson");

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

// ==========================
// Speicher
// ==========================
let listen = JSON.parse(localStorage.getItem("listen") || "[]");

function speichern() {
    localStorage.setItem("listen", JSON.stringify(listen));
}

// ==========================
// Kleine Utilities
// ==========================
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
    // etwas weiter runter, damit Buttons wirklich im Viewport sind
    scrollToElementWithOffset(bewertung, 24);
}

function ensurePruefenVisible() {
    // bei Start / preCheck soll der Prüfen-Button gut sichtbar sein
    scrollToElementWithOffset(btnPruefen, 24);
}

// ==========================
// Normalisierung für Bild-Matching (Option B)
// ==========================
function normalizeKey(input) {
    let s = (input ?? "").toString();
    s = s.replace(/\s+/g, " ").trim().toLowerCase();

    s = s
        .replace(/ä/g, "ae")
        .replace(/ö/g, "oe")
        .replace(/ü/g, "ue")
        .replace(/ß/g, "ss");

    s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    s = s.replace(/[^a-z0-9]+/g, " ").trim();
    s = s.replace(/\s+/g, "_");
    return s;
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

async function imageExists(listName, key) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_IMAGES, "readonly");
        const store = tx.objectStore(STORE_IMAGES);
        const req = store.get([listName, key]);
        req.onsuccess = () => resolve(!!req.result);
        req.onerror = () => reject(req.error);
    });
}

async function putImage(listName, key, blob, mime, originalName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_IMAGES, "readwrite");
        const store = tx.objectStore(STORE_IMAGES);

        const getReq = store.get([listName, key]);
        getReq.onsuccess = () => {
            if (getReq.result) {
                resolve(false); // Option A: nicht überschreiben
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

async function countImagesForList(listName) {
    const db = await openDB();
    return new Promise((resolve, reject) => {
        const tx = db.transaction(STORE_IMAGES, "readonly");
        const store = tx.objectStore(STORE_IMAGES);
        const idx = store.index("by_list");
        const req = idx.count(listName);
        req.onsuccess = () => resolve(req.result || 0);
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
// Bild-Komprimierung (max 1024px, JPEG q=0.82; PNG bleibt PNG)
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
btnListen.onclick = () => {
    modulListen.style.display = "block";
    modulAbfrage.style.display = "none";
    btnListen.classList.add("btn-primary");
    btnListen.classList.remove("btn-ghost");
    btnAbfrage.classList.add("btn-ghost");
    btnAbfrage.classList.remove("btn-primary");
};

btnAbfrage.onclick = () => {
    modulListen.style.display = "none";
    modulAbfrage.style.display = "block";
    btnAbfrage.classList.add("btn-primary");
    btnAbfrage.classList.remove("btn-ghost");
    btnListen.classList.add("btn-ghost");
    btnListen.classList.remove("btn-primary");
    ladeAbfrageListen();
};

// ==========================
// Statistik
// ==========================
function berechneStatistik(richtig, falsch) {
    const gesamt = richtig + falsch;
    const quote = gesamt === 0 ? 0 : Math.round((richtig / gesamt) * 100);
    return { gesamt, quote };
}

function berechneListenStatistik(liste) {
    let richtig = 0;
    let falsch = 0;

    (liste.eintraege || []).forEach(e => {
        richtig += (e.richtig || 0);
        falsch += (e.falsch || 0);
    });

    const s = berechneStatistik(richtig, falsch);
    return {
        eintraege: (liste.eintraege || []).length,
        richtig,
        falsch,
        gesamt: s.gesamt,
        quote: s.quote
    };
}

// ==========================
// Listen UI
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
        const row = makeItemRow();

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
        };

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

        row.append(
            titel,
            open, edit,
            exportJson, exportCsv, exportXlsx,
            imgAdd, imgDel,
            fachReset, statReset, del
        );

        const s = berechneListenStatistik(l);
        const imgCount = await countImagesForList(l.name);
        const stat = makeMeta(
            `Einträge: ${s.eintraege} | Antworten: ${s.gesamt} | ✔ ${s.richtig} | ✘ ${s.falsch} | ${s.quote}% | Bilder: ${imgCount}`
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

        const s = berechneStatistik(e.richtig, e.falsch);
        const meta = makeMeta(`Antworten: ${s.gesamt} | ✔ ${e.richtig} | ✘ ${e.falsch} | ${s.quote}% | Fach ${e.fach}`);

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
            const key = normalizeKey(base);
            if (!key) { skipped++; continue; }

            if (await imageExists(listName, key)) { skipped++; continue; } // Option A

            const { blob, mime } = await compressImageFile(file, 1024);
            const ok = await putImage(listName, key, blob, mime, file.name);
            if (ok) imported++; else skipped++;
        }

        alert(`Bilder-Import fertig ✅\nImportiert: ${imported}\nÜbersprungen: ${skipped}`);
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

function ladeAbfrageListen() {
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

    listen.forEach((l, i) => {
        ensureListShape(l);
        const opt = document.createElement("option");
        opt.value = String(i);
        opt.textContent = l.name;
        abfrageListe.appendChild(opt);
    });

    abfrageListe.value = "0";
    aktuelleListe = listen[0];
    ensureListShape(aktuelleListe);

    richtung.innerHTML = `
        <option value="ab">${aktuelleListe.feldA} → ${aktuelleListe.feldB}</option>
        <option value="ba">${aktuelleListe.feldB} → ${aktuelleListe.feldA}</option>
    `;
    aktualisiereFachDropdown();
    restAnzeige.textContent = "";
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

    const key = normalizeKey(text);
    if (!key) { hideQuestionImage(); return; }

    const item = await getImage(listName, key);
    if (token !== imageRequestToken) return;

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

    const key = normalizeKey(text);
    if (!key) { hideAnswerImage(); return; }

    const item = await getImage(listName, key);
    if (token !== imageRequestToken) return;

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

    // Frage-Bild laden und danach zu "Prüfen" scrollen (wenn Bild vorhanden / Layout ändert)
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

    // Nach finalem Layout sicher zu den Buttons scrollen (2 Frames für iOS/Safari)
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
    neueFrage();
    aktualisiereFachDropdown();
    speichern();
    anzeigenListen();
    if (aktiveListe) anzeigenEintraege();
};

btnFalsch.onclick = () => {
    if (!aktuellerEintrag) return;
    if (karteikastenOption.value === "ja") {
        aktuellerEintrag.fach = 1;
    }
    aktuellerEintrag.falsch = (aktuellerEintrag.falsch || 0) + 1;
    index++;
    neueFrage();
    aktualisiereFachDropdown();
    speichern();
    anzeigenListen();
    if (aktiveListe) anzeigenEintraege();
};

// ==========================
// Init
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
