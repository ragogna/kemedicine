export const APP_VERSION = "1.0.0";
export const BUILD_DATE = "2026-05-24";
export const AUTHOR = "K3kk0";

export const CHANGELOG: Array<{ version: string; date: string; changes: string[] }> = [
  {
    version: "1.0.0",
    date: "2026-05-24",
    changes: [
      "Prima versione pubblica",
      "Inventario medicinali di famiglia",
      "Aggiunta medicinali via foto (AI), galleria o inserimento manuale",
      "Analisi scatola con Claude AI — estrae nome, scadenza, principio attivo",
      "Consulenza sintomi AI — suggerisce medicinali dall'inventario",
      "Avvisi scadenza via Telegram (configurabile)",
      "Tips vitamime stagionali",
      "Filtro per categoria e ricerca",
      "Login Google",
      "PWA installabile su mobile",
    ],
  },
];
