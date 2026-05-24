/**
 * Utilitaires de formatage de dates.
 *
 * - toLocalDateString : convertit un Date JS en chaîne YYYY-MM-DD dans le fuseau local
 *   (évite le décalage UTC produit par Date.toISOString() pour la soumission de formulaires).
 */
export function toLocalDateString(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}
