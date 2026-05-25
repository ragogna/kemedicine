"use client";

import Image from "next/image";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { APP_VERSION, BUILD_DATE, AUTHOR, CHANGELOG, ChangeType } from "@/lib/version";
import { CheckCircle, Info, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function InfoPage() {
  return (
    <div className="max-w-lg mx-auto">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 pt-4 pb-3 flex items-center gap-3">
        <Link href="/impostazioni">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-5 h-5" />
          </Button>
        </Link>
        <h1 className="text-lg font-bold">Informazioni</h1>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Identità app */}
        <Card>
          <CardContent className="pt-6 flex flex-col items-center text-center gap-3">
            <div className="relative w-24 h-24">
              <Image
                src="/icon-192.png"
                alt="KeMedicine"
                fill
                className="object-contain rounded-2xl"
              />
            </div>
            <div>
              <h2 className="text-xl font-bold">KeMedicine</h2>
              <p className="text-sm text-muted-foreground">Inventario medicinali di famiglia</p>
            </div>
            <div className="flex gap-2">
              <Badge variant="secondary">v{APP_VERSION}</Badge>
              <Badge variant="outline">{BUILD_DATE}</Badge>
            </div>
            <Separator />
            <div className="text-sm text-muted-foreground flex flex-col items-center gap-1">
              <div className="flex items-center gap-2">
                <Image src="/tux_k3kk0.png" alt="K3kk0" width={24} height={24} className="rounded" />
                <span>Creato da <span className="font-semibold text-foreground">{AUTHOR}</span></span>
              </div>
              <p className="text-xs">Powered by Claude AI · Firebase · Vercel</p>
            </div>
          </CardContent>
        </Card>

        {/* Manuale utente */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <Info className="w-4 h-4" /> Come si usa
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm space-y-3 text-muted-foreground">
            <div>
              <p className="font-medium text-foreground mb-1">📦 Aggiungere un medicinale</p>
              <p>Vai su <em>Aggiungi</em> → scatta una foto della scatola o scegli dalla galleria → premi <em>Analizza con AI</em>: le informazioni vengono compilate automaticamente. Puoi anche inserire tutto manualmente o scansionare il codice a barre.</p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-foreground mb-1">🔍 Inventario</p>
              <p>Visualizza tutti i medicinali. Usa i filtri per categoria o box (colorati e rinominabili) o la barra di ricerca. Ordina per <strong>scadenza</strong>, <strong>alfabetico</strong> o <strong>categoria</strong> tramite i radio button. I medicinali in scadenza appaiono evidenziati.</p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-foreground mb-1">🗃️ Gestione Box</p>
              <p>Tocca l&apos;icona <strong>📦</strong> in alto nell&apos;inventario per attivare la selezione massiva. In modalità selezione appaiono i pulsanti rapidi: <strong>Senza box</strong> (seleziona tutti i medicinali non assegnati) e <strong>Per sessione</strong> (seleziona in un tocco tutti i medicinali aggiunti con la stessa foto o sessione di import). Assegna il box scelto con un tocco. Personalizza nome e colore di ogni box in <strong>Impostazioni → Gestione Box</strong>.</p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-foreground mb-1">🩺 Consulta Sintomi</p>
              <p>Descrivi come ti senti (o usa il microfono) e l&apos;AI suggerisce i medicinali disponibili nell&apos;inventario ordinati per efficacia, con eventuali avvertenze sulle interazioni.</p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-foreground mb-1">🔔 Notifiche Telegram</p>
              <p>In Impostazioni aggiungi il tuo Chat ID Telegram (cerca <strong>@userinfobot</strong> su Telegram per trovarlo). Riceverai avvisi automatici ogni mattina. Usa il tasto <em>Invia notifica di test</em> per verificare subito che tutto funzioni.</p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-foreground mb-1">💡 Tips vitamine</p>
              <p>L&apos;AI analizza le vitamine nell&apos;inventario e ti suggerisce il periodo migliore per consumarle prima della scadenza, in base alla stagionalità.</p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-foreground mb-1">🗂️ Aree di lavoro</p>
              <p>Il proprietario può creare più aree di lavoro (es. <em>Casa mia</em>, <em>Casa sorella</em>), ognuna con il proprio inventario indipendente. In <strong>Impostazioni → Aree di lavoro</strong> puoi aggiungere/rimuovere membri per ogni area. Nell&apos;inventario appare un selettore rapido per passare da un&apos;area all&apos;altra.</p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-foreground mb-1">💊 Scheda farmaco AI</p>
              <p>Ogni medicinale aggiunto riceve automaticamente una scheda con <strong>indicazioni</strong>, <strong>effetti collaterali</strong> e <strong>modalità d&apos;uso</strong> generata dall&apos;AI. Tocca <em>Scheda farmaco</em> nella card per espanderla. Se alcuni medicinali non hanno ancora la scheda, usa il pulsante <strong>🔄</strong> in alto nell&apos;inventario per aggiornarli tutti.</p>
            </div>
            <Separator />
            <div>
              <p className="font-medium text-foreground mb-1">🔒 Controllo accessi</p>
              <p>Solo gli utenti aggiunti dall&apos;owner possono accedere all&apos;app. Chi tenta l&apos;accesso senza autorizzazione viene bloccato e riceve la pagina <em>Accesso Negato</em>. L&apos;owner riceve immediatamente una notifica Telegram con l&apos;email del tentativo e l&apos;indirizzo IP.</p>
            </div>
          </CardContent>
        </Card>

        {/* Changelog */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <CheckCircle className="w-4 h-4" /> Novità e versioni
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {CHANGELOG.map((release) => (
              <div key={release.version}>
                <div className="flex items-center gap-2 mb-2">
                  <Badge>v{release.version}</Badge>
                  <span className="text-xs text-muted-foreground">{release.date}</span>
                </div>
                <ul className="space-y-1.5">
                  {release.changes.map((change, i) => {
                    const meta: Record<ChangeType, { icon: string; color: string }> = {
                      feature: { icon: "✦", color: "text-blue-500" },
                      bug: { icon: "✗", color: "text-red-500" },
                      optimization: { icon: "⚡", color: "text-amber-500" },
                    };
                    const { icon, color } = meta[change.type];
                    return (
                      <li key={i} className="text-sm text-muted-foreground flex gap-2 items-start">
                        <span className={`${color} flex-shrink-0 text-xs mt-0.5 font-bold`}>{icon}</span>
                        <span>{change.text}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            ))}
            <div className="flex gap-3 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1"><span className="text-blue-500 font-bold">✦</span> Novità</span>
              <span className="flex items-center gap-1"><span className="text-red-500 font-bold">✗</span> Bug fix</span>
              <span className="flex items-center gap-1"><span className="text-amber-500 font-bold">⚡</span> Ottimizzazione</span>
            </div>
          </CardContent>
        </Card>

        <p className="text-xs text-center text-muted-foreground pb-4">
          KeMedicine v{APP_VERSION} — made with ❤️ by {AUTHOR}
        </p>
      </div>
    </div>
  );
}
