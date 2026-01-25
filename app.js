"use strict";

console.log("Cognify – Phase 16 (Bearbeiten + Export + XLSX Import + Prüfen-Flow)");

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

const abfrageBox = $("abfrageBox");
const frage = $("frage");
const loesung = $("loesung");
const btnPruefen = $("btnPruefen");
const bewertung = $("bewertung");
const btnRichtig = $("btnRichtig");
const btnFalsch = $("btnFalsch");

// ==========================
// UI Flow Helpers (Prüfen / Richtig / Falsch)
// ==========================
function setAbfrageUIState(state) {
    // state: "preCheck" | "postCheck" | "finished"
    if (state === "preCheck") {
        loesung.style.display = "none";
        bewertung.style.display = "none";
        btnPruefen.style.display = "inline-block";
    } else if (state === "postCheck") {
        loesung.style.display = "block";
        bewertung.style.display = "block";
        btnPruefen.style.display = "none";
    } else if (state === "finished") {
        loesung.style.display = "none";
        bewertung.style.display = "none";
        btnPruefen.style.display = "none";
    }
}

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
// Export Helpers (Phase 16)
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

    const safeName = (listObj.name || "liste").replace(/[\\/:*?"<>|]/g, "_");
    downloadFile(`${safeName}.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
}

function csvEscape(value, delimiter) {
    const s = (value ?? "").toString();
    const mustQuote = s.includes('"') || s.includes("\n") || s.includes("\r") || s.includes(delimiter);
    const escaped = s.replace(/"/g, '""');
    return mustQuote ? `"${escaped}"` : escaped;
}

function exportListAsCSV(listObj) {
    // CSV = nur 2 Spalten: Header aus feldA/feldB, danach a/b
    const delimiter = ";";
    const header = `${csvEscape(listObj.feldA, delimiter)}${delimiter}${csvEscape(listObj.feldB, delimiter)}`;
    const rows = (listObj.eintraege || []).map(e =>
        `${csvEscape(e.a, delimiter)}${delimiter}${csvEscape(e.b, delimiter)}`
    );
    const content = [header, ...rows].join("\n");
    const safeName = (listObj.name || "liste").replace(/[\\/:*?"<>|]/g, "_");
    downloadFile(`${safeName}.csv`, content, "text/csv;charset=utf-8");
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
    downloadFile(`cognify_export_all.json`, JSON.stringify(payload, null, 2), "application/json;charset=utf-8");
};

// ==========================
// Navigation
// ==========================
btnListen.onclick = () => {
    modulListen.style.display = "block";
    modulAbfrage.style.display = "none";
};

btnAbfrage.onclick = () => {
    modulListen.style.display = "none";
    modulAbfrage.style.display = "block";
    ladeAbfrageListen();
};

// ==========================
// Statistik Helfer
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
// Listen & Einträge
// ==========================
let aktiveListe = null;

// ==========================
// Listen anzeigen (mit Bearbeiten + Export pro Liste)
// ==========================
function anzeigenListen() {
    listenUebersicht.innerHTML = "";

    listen.forEach(l => {
        ensureListShape(l);

        const li = document.createElement("li");

        const titel = document.createElement("strong");
        titel.textContent = l.name;

        const s = berechneListenStatistik(l);
        const stat = document.createElement("div");
        stat.className = "statistik";
        stat.textContent =
            `Einträge: ${s.eintraege} | Antworten: ${s.gesamt} | ✔ ${s.richtig} | ✘ ${s.falsch} | ${s.quote}%`;

        const open = document.createElement("button");
        open.textContent = "Öffnen";
        open.onclick = () => {
            aktiveListe = l;
            aktiveListeTitel.textContent = l.name;
            wertA.placeholder = l.feldA || "Spalte 1";
            wertB.placeholder = l.feldB || "Spalte 2";
            eintragsBereich.style.display = "block";
            anzeigenEintraege();
        };

        const edit = document.createElement("button");
        edit.textContent = "Bearbeiten";
        edit.onclick = () => {
            const newName = prompt("Listenname bearbeiten:", l.name);
            if (newName === null) return;

            const nameTrim = normText(newName);
            if (!nameTrim) {
                alert("Listenname darf nicht leer sein.");
                return;
            }

            const newFeldA = prompt("Spaltenname A bearbeiten:", l.feldA);
            if (newFeldA === null) return;
            const feldATrim = normText(newFeldA);
            if (!feldATrim) {
                alert("Spaltenname A darf nicht leer sein.");
                return;
            }

            const newFeldB = prompt("Spaltenname B bearbeiten:", l.feldB);
            if (newFeldB === null) return;
            const feldBTrim = normText(newFeldB);
            if (!feldBTrim) {
                alert("Spaltenname B darf nicht leer sein.");
                return;
            }

            l.name = nameTrim;
            l.feldA = feldATrim;
            l.feldB = feldBTrim;

            // UI synchron halten
            if (aktiveListe === l) {
                aktiveListeTitel.textContent = l.name;
                wertA.placeholder = l.feldA;
                wertB.placeholder = l.feldB;
            }

            refreshEverywhere();
        };

        const exportJson = document.createElement("button");
        exportJson.textContent = "Export JSON";
        exportJson.onclick = () => exportListAsJSON(l);

        const exportCsv = document.createElement("button");
        exportCsv.textContent = "Export CSV";
        exportCsv.onclick = () => exportListAsCSV(l);

        const fachReset = document.createElement("button");
        fachReset.textContent = "Fach Reset";
        fachReset.onclick = () => {
            l.eintraege.forEach(e => e.fach = 1);
            refreshEverywhere();
        };

        const statReset = document.createElement("button");
        statReset.textContent = "Statistik Reset";
        statReset.onclick = () => {
            l.eintraege.forEach(e => {
                e.richtig = 0;
                e.falsch = 0;
            });
            refreshEverywhere();
        };

        const del = document.createElement("button");
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

        li.append(titel, stat, open, edit, exportJson, exportCsv, fachReset, statReset, del);
        listenUebersicht.appendChild(li);
    });
}

// ==========================
// Einträge anzeigen (mit Bearbeiten)
// ==========================
function anzeigenEintraege() {
    if (!aktiveListe) {
        eintragsListe.innerHTML = "";
        return;
    }

    ensureListShape(aktiveListe);
    eintragsListe.innerHTML = "";

    aktiveListe.eintraege.forEach((e, i) => {
        const li = document.createElement("li");

        const titel = document.createElement("div");
        titel.textContent = `${e.a} ↔ ${e.b}`;

        const s = berechneStatistik(e.richtig, e.falsch);
        const stat = document.createElement("div");
        stat.className = "statistik";
        stat.textContent =
            `Antworten: ${s.gesamt} | ✔ ${e.richtig} | ✘ ${e.falsch} | ${s.quote}% | Fach ${e.fach}`;

        const edit = document.createElement("button");
        edit.textContent = "Bearbeiten";
        edit.onclick = () => {
            const newA = prompt(`Wert für "${aktiveListe.feldA}" bearbeiten:`, e.a);
            if (newA === null) return;
            const aTrim = normText(newA);
            if (!aTrim) {
                alert("Wert A darf nicht leer sein.");
                return;
            }

            const newB = prompt(`Wert für "${aktiveListe.feldB}" bearbeiten:`, e.b);
            if (newB === null) return;
            const bTrim = normText(newB);
            if (!bTrim) {
                alert("Wert B darf nicht leer sein.");
                return;
            }

            e.a = aTrim;
            e.b = bTrim;

            refreshEverywhere();
        };

        const del = document.createElement("button");
        del.textContent = "X";
        del.onclick = () => {
            aktiveListe.eintraege.splice(i, 1);
            refreshEverywhere();
        };

        li.append(titel, stat, edit, del);
        eintragsListe.appendChild(li);
    });
}

// ==========================
// Liste anlegen (Validierung)
// ==========================
listeAnlegen.onclick = () => {
    const name = normText(listenName.value);
    const a = normText(feldA.value);
    const b = normText(feldB.value);

    if (!name || !a || !b) {
        alert("Bitte Name der Liste sowie beide Spaltennamen ausfüllen.");
        return;
    }

    listen.push({
        name,
        feldA: a,
        feldB: b,
        eintraege: []
    });

    refreshEverywhere();

    listenName.value = "";
    feldA.value = "";
    feldB.value = "";
};

// ==========================
// Eintrag hinzufügen (Validierung)
// ==========================
eintragHinzufuegen.onclick = () => {
    if (!aktiveListe) {
        alert("Bitte zuerst eine Liste öffnen.");
        return;
    }

    const a = normText(wertA.value);
    const b = normText(wertB.value);

    if (!a || !b) {
        alert("Bitte beide Werte für den Eintrag ausfüllen.");
        return;
    }

    aktiveListe.eintraege.push({
        a,
        b,
        richtig: 0,
        falsch: 0,
        fach: 1
    });

    refreshEverywhere();

    wertA.value = "";
    wertB.value = "";
};

// ==========================
// Phase 15/16: XLSX Import (2 Spalten, Header = erste Zeile)
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
            const data = evt.target.result;
            const workbook = XLSX.read(data, { type: "array" });

            const sheetName = workbook.SheetNames[0];
            if (!sheetName) {
                alert("Keine Tabelle in der Datei gefunden.");
                fileImportXlsx.value = "";
                return;
            }

            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: true });

            if (!rows || rows.length === 0) {
                alert("Die Tabelle ist leer.");
                fileImportXlsx.value = "";
                return;
            }

            const header = rows[0] || [];
            const headerA = normText(header[0]);
            const headerB = normText(header[1]);

            if (!headerA || !headerB) {
                alert("Header ungültig. Bitte sicherstellen, dass Spalte A und B in der ersten Zeile benannt sind.");
                fileImportXlsx.value = "";
                return;
            }

            const baseName = normText(file.name || "Import").replace(/\.(xlsx|xls)$/i, "");
            const newListName = makeUniqueListName(baseName);

            const eintraege = [];
            for (let i = 1; i < rows.length; i++) {
                const row = rows[i] || [];
                const a = normText(row[0]);
                const b = normText(row[1]);
                if (!a && !b) continue;
                if (!a || !b) continue;

                eintraege.push({
                    a,
                    b,
                    richtig: 0,
                    falsch: 0,
                    fach: 1
                });
            }

            if (eintraege.length === 0) {
                alert("Keine gültigen Einträge gefunden. Bitte sicherstellen: Ab Zeile 2 stehen in Spalte A und B Werte.");
                fileImportXlsx.value = "";
                return;
            }

            listen.push({
                name: newListName,
                feldA: headerA,
                feldB: headerB,
                eintraege
            });

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
// Abfrage – Selbstbewertung mit Leitner
// ==========================
let abfrageDaten = [];
let index = 0;
let aktuelleListe = null;
let fromAtoB = true;
let aktuellerEintrag = null;

// --------------------------
// Dropdown Liste auswählen
// --------------------------
function ladeAbfrageListen() {
    abfrageListe.innerHTML = "";

    if (listen.length === 0) {
        aktuelleListe = null;
        richtung.innerHTML = "";
        fachAuswahl.innerHTML = "";
        abfrageBox.style.display = "block";
        frage.textContent = "Keine Listen vorhanden. Lege zuerst eine Liste an.";
        setAbfrageUIState("finished");
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
}

// --------------------------
// Dynamische Fachanzeige
// --------------------------
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

// Karteikasten Dropdown aktiviert/deaktiviert Fachauswahl und Runden
karteikastenOption.onchange = () => {
    if (karteikastenOption.value === "ja") {
        fachAuswahl.disabled = false;
        runden.disabled = true;
    } else {
        fachAuswahl.disabled = true;
        runden.disabled = false;
    }
};

// Auswahl Liste ändern
abfrageListe.onchange = () => {
    aktuelleListe = listen[parseInt(abfrageListe.value, 10)];
    if (!aktuelleListe) return;

    ensureListShape(aktuelleListe);

    richtung.innerHTML = `
        <option value="ab">${aktuelleListe.feldA} → ${aktuelleListe.feldB}</option>
        <option value="ba">${aktuelleListe.feldB} → ${aktuelleListe.feldA}</option>
    `;
    aktualisiereFachDropdown();
};

// --------------------------
// Abfrage starten
// --------------------------
startAbfrage.onclick = () => {
    if (listen.length === 0) {
        abfrageBox.style.display = "block";
        frage.textContent = "Keine Listen vorhanden. Lege zuerst eine Liste an.";
        setAbfrageUIState("finished");
        return;
    }

    aktuelleListe = listen[parseInt(abfrageListe.value, 10)];
    if (!aktuelleListe) {
        abfrageBox.style.display = "block";
        frage.textContent = "Bitte eine Liste auswählen.";
        setAbfrageUIState("finished");
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
            return;
        }
    } else {
        abfrageDaten = [...aktuelleListe.eintraege];

        if (abfrageDaten.length === 0) {
            abfrageBox.style.display = "block";
            frage.textContent = "Keine Einträge vorhanden 🎯";
            setAbfrageUIState("finished");
            return;
        }

        if (abfrageFolge.value === "random") {
            for (let i = abfrageDaten.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [abfrageDaten[i], abfrageDaten[j]] = [abfrageDaten[j], abfrageDaten[i]];
            }
        }

        if (runden.value !== "all") {
            const n = parseInt(runden.value, 10);
            if (!Number.isNaN(n)) abfrageDaten = abfrageDaten.slice(0, n);
        }
    }

    index = 0;
    abfrageBox.style.display = "block";
    neueFrage();
};

function neueFrage() {
    if (index >= abfrageDaten.length) {
        frage.textContent = "Abfrage beendet 🎉";
        abfrageBox.style.display = "block";
        setAbfrageUIState("finished");

        refreshEverywhere();
        return;
    }

    aktuellerEintrag = abfrageDaten[index];
    fromAtoB = (richtung.value === "ab");

    frage.textContent = fromAtoB ? aktuellerEintrag.a : aktuellerEintrag.b;

    setAbfrageUIState("preCheck");
}

btnPruefen.onclick = () => {
    if (!aktuellerEintrag) return;

    const korrekt = fromAtoB ? aktuellerEintrag.b : aktuellerEintrag.a;
    loesung.textContent = `Lösung: ${korrekt}`;

    setAbfrageUIState("postCheck");
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
// Start
// ==========================
anzeigenListen();
