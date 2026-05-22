export interface ConsultationTemplate {
  label: string;
  body: string;
}

const GENERIC: ConsultationTemplate = {
  label: 'Médecine générale',
  body:
`Motif :
Antécédents pertinents :
Examen clinique :
  - Tension artérielle : ___ mmHg
  - Pouls : ___ bpm
  - Température : ___ °C
Diagnostic :
Conduite à tenir :`
};

export const CONSULTATION_TEMPLATES: Record<string, ConsultationTemplate> = {
  généraliste: GENERIC,
  'médecine générale': GENERIC,
  cardiologie: {
    label: 'Cardiologie',
    body:
`Motif :
Antécédents cardiovasculaires :
Examen clinique :
  - Tension artérielle (bras D/G) : ___ / ___
  - Fréquence cardiaque : ___ bpm
  - Auscultation cardiaque :
  - Auscultation pulmonaire :
  - Œdèmes des membres inférieurs : oui / non
ECG :
Diagnostic :
Traitement :`
  },
  pédiatrie: {
    label: 'Pédiatrie',
    body:
`Motif de consultation :
Carnet de santé / vaccinations à jour : oui / non
Mensurations :
  - Poids : ___ kg (___ percentile)
  - Taille : ___ cm
  - Périmètre crânien : ___ cm
Examen clinique :
  - Température : ___ °C
  - Auscultation cardio-pulmonaire :
  - Examen ORL :
  - Examen abdominal :
Diagnostic :
Traitement / Conseils aux parents :`
  },
  dermatologie: {
    label: 'Dermatologie',
    body:
`Motif :
Antécédents dermatologiques / allergies :
Description des lésions :
  - Localisation :
  - Type (érythème, papule, vésicule, etc.) :
  - Évolution :
  - Prurit : oui / non
Examen :
Diagnostic :
Traitement (topique / systémique) :`
  },
  gynécologie: {
    label: 'Gynécologie',
    body:
`Motif :
Antécédents gynéco-obstétricaux :
  - Gestité / Parité : G__ P__
  - Date des dernières règles :
  - Contraception :
Examen :
  - Examen au spéculum :
  - Toucher vaginal :
Diagnostic :
Conduite à tenir :`
  },
  ophtalmologie: {
    label: 'Ophtalmologie',
    body:
`Motif :
Acuité visuelle :
  - OD : ___ / OG : ___
Tonus oculaire :
  - OD : ___ mmHg / OG : ___ mmHg
Examen :
  - Segment antérieur :
  - Fond d'œil :
Diagnostic :
Traitement :`
  }
};

export function getTemplateForSpecialty(specialty?: string): ConsultationTemplate {
  if (!specialty) return GENERIC;
  const key = specialty.toLowerCase().trim();
  return CONSULTATION_TEMPLATES[key] || GENERIC;
}

export function listTemplates(): { key: string; label: string }[] {
  const seen = new Set<string>();
  const result: { key: string; label: string }[] = [];
  for (const [key, tpl] of Object.entries(CONSULTATION_TEMPLATES)) {
    if (seen.has(tpl.label)) continue;
    seen.add(tpl.label);
    result.push({ key, label: tpl.label });
  }
  return result;
}
