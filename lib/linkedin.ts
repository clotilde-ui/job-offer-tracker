/**
 * Normalise une URL LinkedIn pour comparer deux profils.
 *
 * Objectif : deux URL qui pointent vers le même profil doivent produire la
 * même clé, même si elles diffèrent par le `www.`, le protocole, des
 * paramètres de tracking, la casse, ou un pourcent-encodage simple/double
 * (ex. `st%C3%A9phane` vs `st%25C3%25A9phane`).
 *
 * Renvoie une clé canonique de la forme `linkedin.com/in/<slug>` quand
 * l'URL contient un segment `/in/…`, sinon une version décodée et nettoyée
 * de la chaîne d'entrée (compatible avec l'ancien comportement).
 */
export function normalizeLinkedinUrl(raw: string): string {
  // Décodage répété du pourcent-encodage jusqu'à stabilité (gère le double encodage).
  const fullyDecode = (value: string): string => {
    let prev: string;
    let current = value;
    do {
      prev = current;
      try {
        current = decodeURIComponent(current);
      } catch {
        break; // séquence d'échappement invalide — on s'arrête
      }
    } while (current !== prev);
    return current;
  };

  // Tente d'extraire le slug du profil (/in/<slug>) depuis une URL bien formée.
  try {
    const url = new URL(raw.trim());
    const match = url.pathname.match(/\/in\/([^/?#]+)/i);
    if (match?.[1]) {
      return `linkedin.com/in/${fullyDecode(match[1]).toLowerCase()}`;
    }
  } catch {
    // pas une URL analysable — on retombe sur la normalisation générique
  }

  // Repli : décode puis nettoie la chaîne brute (ancien comportement renforcé).
  return fullyDecode(raw)
    .toLowerCase()
    .replace(/\/+$/, "")
    .trim();
}
