"use client";

import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useMedicines } from "@/hooks/useMedicines";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Stethoscope, Send, Loader2, Mic, MicOff, Lightbulb } from "lucide-react";
import { toast } from "sonner";
import { expiryStatus } from "@/lib/utils";
import { apiPost } from "@/lib/api-client";
import { useFamilyId } from "@/hooks/useFamilyId";

interface AIResponse {
  text: string;
  tips?: string[];
}

export default function SintomiPage() {
  const { user } = useAuth();
  const { familyId } = useFamilyId();
  const { medicines } = useMedicines(familyId);
  const [query, setQuery] = useState("");
  const [response, setResponse] = useState<AIResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);

  const availableMedicines = medicines.filter(
    (m) => expiryStatus(m.expiryDate) !== "expired"
  );

  const startListening = () => {
    if (!("webkitSpeechRecognition" in window) && !("SpeechRecognition" in window)) {
      toast.error("Il tuo browser non supporta il riconoscimento vocale");
      return;
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const SpeechRecognitionAPI = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionAPI) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const recognition = new SpeechRecognitionAPI() as any;
    recognition.lang = "it-IT";
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);
    recognition.onend = () => setListening(false);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    recognition.onresult = (e: any) => {
      const transcript = e.results[0][0].transcript;
      setQuery((prev: string) => prev ? `${prev} ${transcript}` : transcript);
    };
    recognition.start();
  };

  const handleSubmit = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setResponse(null);
    try {
      const data = await apiPost<AIResponse>("/api/sintomi", {
        symptoms: query,
        medicines: availableMedicines,
      });
      setResponse(data);
    } catch {
      toast.error("Errore nella consulenza AI");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <div className="sticky top-0 z-10 bg-background border-b border-border px-4 pt-4 pb-3">
        <h1 className="text-xl font-bold">Consulta Sintomi</h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Descrivi come ti senti, suggerisco cosa usare dall&apos;inventario
        </p>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Input sintomi */}
        <Card>
          <CardContent className="pt-4 space-y-3">
            <textarea
              className="w-full min-h-[100px] resize-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
              placeholder="Descrivi i tuoi sintomi... es. 'Ho mal di testa da stamattina e un po' di febbre'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={startListening}
                className={listening ? "text-red-500 border-red-300" : ""}
              >
                {listening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </Button>
              <Button
                className="flex-1 gap-2"
                onClick={handleSubmit}
                disabled={loading || !query.trim()}
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-4 h-4" />
                )}
                {loading ? "Consulto in corso..." : "Chiedi consiglio"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Inventario disponibile */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">
            {availableMedicines.length} medicinali disponibili nell&apos;inventario
          </p>
          <div className="flex flex-wrap gap-1">
            {availableMedicines.slice(0, 8).map((m) => (
              <Badge key={m.id} variant="secondary" className="text-xs">
                {m.name}
              </Badge>
            ))}
            {availableMedicines.length > 8 && (
              <Badge variant="outline" className="text-xs">
                +{availableMedicines.length - 8}
              </Badge>
            )}
          </div>
        </div>

        {/* Risposta AI */}
        {response && (
          <Card className="border-blue-200 bg-blue-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2 text-blue-700">
                <Stethoscope className="w-4 h-4" />
                Consiglio medico AI
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-foreground whitespace-pre-wrap">
              {response.text}
              {response.tips && response.tips.length > 0 && (
                <div className="mt-3 pt-3 border-t border-blue-200">
                  <div className="flex items-center gap-1 text-amber-700 font-medium mb-2">
                    <Lightbulb className="w-4 h-4" />
                    Tips dall&apos;inventario
                  </div>
                  <ul className="space-y-1">
                    {response.tips.map((tip, i) => (
                      <li key={i} className="text-amber-800 text-xs">• {tip}</li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Disclaimer */}
        <p className="text-xs text-muted-foreground text-center pb-2">
          ⚠️ Informazioni a scopo orientativo. Consulta un medico per diagnosi e terapie.
        </p>
      </div>
    </div>
  );
}
