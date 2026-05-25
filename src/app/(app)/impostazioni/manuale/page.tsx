"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const SECTIONS = [
  {
    icon: "📦",
    title: "Aggiungere un medicinale",
    body: "Vai su Aggiungi → scatta una foto della scatola o scegli dalla galleria → premi Analizza con AI: le informazioni vengono compilate automaticamente. Puoi anche inserire tutto manualmente o scansionare il codice a barre.",
  },
  {
    icon: "🔍",
    title: "Inventario",
    body: "Visualizza tutti i medicinali. Usa i filtri per categoria o box (colorati e rinominabili) o la barra di ricerca. Ordina per scadenza, alfabetico o categoria tramite i radio button. I medicinali in scadenza appaiono evidenziati.",
  },
  {
    icon: "🗃️",
    title: "Gestione Box",
    body: "Tocca l'icona 📦 in alto nell'inventario per attivare la selezione massiva. Usa i pulsanti rapidi Senza box (seleziona tutti i medicinali non assegnati) e Per sessione (seleziona tutti quelli aggiunti con la stessa foto). Personalizza nome e colore di ogni box in Impostazioni → Gestione Box.",
  },
  {
    icon: "💊",
    title: "Scheda farmaco AI",
    body: "Ogni medicinale aggiunto riceve automaticamente una scheda con indicazioni, effetti collaterali e modalità d'uso generata dall'AI. Tocca Scheda farmaco nella card per espanderla. Usa il pulsante 🔄 in alto nell'inventario per aggiornare i medicinali che non hanno ancora la scheda.",
  },
  {
    icon: "🩺",
    title: "Consulta Sintomi",
    body: "Descrivi come ti senti (o usa il microfono) e l'AI suggerisce i medicinali disponibili nell'inventario ordinati per efficacia, con eventuali avvertenze sulle interazioni.",
  },
  {
    icon: "🔔",
    title: "Notifiche Telegram",
    body: "In Impostazioni aggiungi il tuo Chat ID Telegram (cerca @userinfobot su Telegram per trovarlo). Riceverai avvisi automatici ogni mattina. Usa il tasto Invia notifica di test per verificare subito che tutto funzioni.",
  },
  {
    icon: "💡",
    title: "Tips vitamine",
    body: "L'AI analizza le vitamine nell'inventario e ti suggerisce il periodo migliore per consumarle prima della scadenza, in base alla stagionalità.",
  },
  {
    icon: "🗂️",
    title: "Aree di lavoro",
    body: "Il proprietario può creare più aree di lavoro (es. Casa mia, Casa sorella), ognuna con il proprio inventario indipendente. In Impostazioni → Aree di lavoro puoi aggiungere/rimuovere membri per ogni area. Nell'inventario appare un selettore rapido per passare da un'area all'altra.",
  },
  {
    icon: "🔒",
    title: "Controllo accessi",
    body: "Solo gli utenti aggiunti dall'owner possono accedere all'app. Chi tenta l'accesso senza autorizzazione viene bloccato e vede la pagina Accesso Negato. L'owner riceve immediatamente una notifica Telegram con l'email del tentativo e l'indirizzo IP.",
  },
];

export default function ManualePage() {
  return (
    <div className="max-w-lg mx-auto">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 pt-4 pb-3 flex items-center gap-3">
        <Link href="/impostazioni">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <BookOpen className="w-5 h-5 text-muted-foreground" />
        <h1 className="text-lg font-bold">Manuale utente</h1>
      </div>

      <div className="px-4 py-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground">Come si usa KeMedicine</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-muted-foreground">
            {SECTIONS.map((s, i) => (
              <div key={i}>
                {i > 0 && <Separator className="mb-4" />}
                <p className="font-semibold text-foreground mb-1">{s.icon} {s.title}</p>
                <p>{s.body}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
