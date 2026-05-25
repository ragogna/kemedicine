export interface BodyArea {
  emoji: string;
  label: string;
  bg: string;
  textColor: string;
}

export function getBodyArea(name: string, category: string, activeIngredient?: string): BodyArea {
  const kw = `${name} ${activeIngredient ?? ""}`.toLowerCase();

  switch (category) {
    case "cardiovascolare":
      return { emoji: "🫀", label: "CUORE", bg: "bg-red-100", textColor: "text-red-700" };
    case "dermologico":
      return { emoji: "🩹", label: "PELLE", bg: "bg-amber-100", textColor: "text-amber-700" };
    case "gastroprotettore":
      return { emoji: "🍽️", label: "STOMACO", bg: "bg-orange-100", textColor: "text-orange-700" };
    case "antiistaminico":
      return { emoji: "👃", label: "ALLERGIE", bg: "bg-yellow-100", textColor: "text-yellow-700" };
    case "vitamina":
      return { emoji: "💪", label: "ENERGIA", bg: "bg-green-100", textColor: "text-green-700" };
    case "antibiotico":
      return { emoji: "🦠", label: "INFEZIONE", bg: "bg-red-100", textColor: "text-red-700" };
    case "antinfiammatorio":
      return { emoji: "🔥", label: "MUSCOLI", bg: "bg-blue-100", textColor: "text-blue-700" };
    case "analgesico":
      return { emoji: "🤕", label: "DOLORE", bg: "bg-rose-100", textColor: "text-rose-700" };
  }

  // Keyword fallback for "altro"
  if (/collirio|ocul|oft\w/i.test(kw))
    return { emoji: "👁️", label: "OCCHI", bg: "bg-indigo-100", textColor: "text-indigo-700" };
  if (/orecch|otic|auric/i.test(kw))
    return { emoji: "👂", label: "ORECCHIO", bg: "bg-pink-100", textColor: "text-pink-700" };
  if (/cardio|cuore|pressione|colester|trombo/i.test(kw))
    return { emoji: "🫀", label: "CUORE", bg: "bg-red-100", textColor: "text-red-700" };
  if (/stomac|gastro|antiacid|reflusso|intestin|digestiv|omeprazol|pantoprazol/i.test(kw))
    return { emoji: "🍽️", label: "STOMACO", bg: "bg-orange-100", textColor: "text-orange-700" };
  if (/allergi|rinit|pollin|nazal/i.test(kw))
    return { emoji: "👃", label: "ALLERGIE", bg: "bg-yellow-100", textColor: "text-yellow-700" };
  if (/vitamin|integrat|omega|magnesio|calcio|ferro|zinco|probio/i.test(kw))
    return { emoji: "💪", label: "ENERGIA", bg: "bg-green-100", textColor: "text-green-700" };
  if (/antibio|amoxicill|azitromic|ciproflox/i.test(kw))
    return { emoji: "🦠", label: "INFEZIONE", bg: "bg-red-100", textColor: "text-red-700" };
  if (/gola|tosse|bronch|polmon|ambroxol|acetilcistein/i.test(kw))
    return { emoji: "🫁", label: "RESPIRO", bg: "bg-cyan-100", textColor: "text-cyan-700" };
  if (/ibupro|diclofen|muscol|articol|tendin|artros/i.test(kw))
    return { emoji: "🔥", label: "MUSCOLI", bg: "bg-blue-100", textColor: "text-blue-700" };
  if (/paracetam|tachipirina|aspirina|febbre|antidolori|migren/i.test(kw))
    return { emoji: "🤕", label: "DOLORE", bg: "bg-rose-100", textColor: "text-rose-700" };

  return { emoji: "💊", label: "GENERICO", bg: "bg-slate-100", textColor: "text-slate-500" };
}

export function requiresPrescription(category: string): boolean {
  return category === "antibiotico" || category === "cardiovascolare";
}
