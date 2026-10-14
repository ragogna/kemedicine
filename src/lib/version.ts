export const APP_VERSION = "1.4.4";
export const BUILD_DATE = "2026-10-14";
export const AUTHOR = "K3kk0";

export type ChangeType = "feature" | "bug" | "optimization";

export interface ChangeEntry {
  type: ChangeType;
  text: string;
}

export const CHANGELOG: Array<{ version: string; date: string; changes: ChangeEntry[] }> = [
  {
    version: "1.4.4",
    date: "2026-10-14",
    changes: [
      { type: "bug", text: "Aggiunta manuale medicinale — il salvataggio non va più in errore quando non c'è il codice a barre" },
      { type: "optimization", text: "I messaggi di errore nel salvataggio ora mostrano la causa reale invece di un generico \"Errore nel salvataggio\"" },
    ],
  },
  {
    version: "1.4.3",
    date: "2026-05-31",
    changes: [
      { type: "feature", text: "Cartellino PDF — i biglietti della dimensione scelta vengono tassellati sul foglio A4: quanti più cartellini possibile per pagina, pronti da ritagliare (un solo biglietto per box, tutte le medicine dentro)" },
    ],
  },
  {
    version: "1.4.2",
    date: "2026-05-31",
    changes: [
      { type: "bug", text: "Cartellino PDF — un solo biglietto per box: i box con medicine in formato misto (vecchio \"Box 1\" + nuovo) non vengono più divisi in più cartellini" },
    ],
  },
  {
    version: "1.4.1",
    date: "2026-05-31",
    changes: [
      { type: "bug", text: "Cartellino PDF — tutte le medicine di un box ora stanno su un unico biglietto della dimensione scelta (una pagina per box, font e colonne automatici, niente più troncamenti o pagine multiple)" },
      { type: "optimization", text: "Pulizia codice e revisione generale" },
    ],
  },
  {
    version: "1.4.0",
    date: "2026-05-29",
    changes: [
      { type: "feature", text: "Esportazione PDF in tre formati: ordine alfabetico, per box (A4), cartellino dimensione personalizzata (mm)" },
    ],
  },
  {
    version: "1.3.0",
    date: "2026-05-25",
    changes: [
      { type: "feature", text: "Box colorati e rinominabili — personalizza nome e colore di ogni box in Impostazioni" },
      { type: "feature", text: "Selezione per sessione import — seleziona in un tocco tutti i medicinali aggiunti con la stessa foto" },
      { type: "feature", text: "Selezione senza box — seleziona rapidamente tutti i medicinali non ancora assegnati a un box" },
      { type: "feature", text: "Scheda farmaco AI — indicazioni, effetti collaterali e modalità d'uso generati automaticamente per ogni medicinale" },
      { type: "feature", text: "Aggiornamento schede farmaco — pulsante per caricare le informazioni AI sui medicinali che le mancano" },
      { type: "feature", text: "Ordinamento inventario — ordina per scadenza, alfabetico o categoria con radio button" },
      { type: "feature", text: "Allerta accesso non autorizzato — notifica Telegram in tempo reale al tentativo di accesso di utenti non autorizzati" },
    ],
  },
  {
    version: "1.2.0",
    date: "2026-05-25",
    changes: [
      { type: "feature", text: "Controllo accessi — solo utenti autorizzati dall'owner possono entrare" },
      { type: "feature", text: "Aree di lavoro — crea inventari separati (es. Casa mia / Casa sorella) con accessi distinti" },
      { type: "feature", text: "Selettore area di lavoro — switcher rapido nell'inventario per l'owner" },
      { type: "feature", text: "Notifica aggiornamento — Tux appare quando viene rilasciata una nuova versione" },
      { type: "feature", text: "Barcode scanner — ricerca farmaco tramite AI (conosce i farmaci italiani)" },
      { type: "optimization", text: "Changelog con distinzione tra novità, bug fix e ottimizzazioni" },
      { type: "optimization", text: "Revoca accesso immediata — rimuovere un membro lo disconnette istantaneamente" },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-05-24",
    changes: [
      { type: "feature", text: "Barcode scanner — scansiona il codice a barre per aggiungere medicinali" },
      { type: "feature", text: "Lookup automatico in database Open Food Facts" },
      { type: "feature", text: "Tips vitamini stagionali — consigli AI dedicati alle vitamine dell'inventario" },
      { type: "feature", text: "Esportazione PDF inventario con stato scadenze" },
      { type: "bug", text: "Fix modifica medicinale — i campi ora si pre-valorizzano correttamente" },
    ],
  },
  {
    version: "1.0.0",
    date: "2026-05-24",
    changes: [
      { type: "feature", text: "Prima versione pubblica" },
      { type: "feature", text: "Inventario medicinali di famiglia con condivisione familiare" },
      { type: "feature", text: "Aggiunta medicinali via foto (AI), galleria o inserimento manuale" },
      { type: "feature", text: "Analisi scatola con Claude AI — estrae nome, scadenza, principio attivo" },
      { type: "feature", text: "Rilevamento multiplo: più medicinali da una singola foto" },
      { type: "feature", text: "Consulenza sintomi AI — suggerisce medicinali dall'inventario" },
      { type: "feature", text: "Avvisi scadenza via Telegram (configurabile)" },
      { type: "feature", text: "Login Google, PWA installabile su mobile" },
    ],
  },
];
