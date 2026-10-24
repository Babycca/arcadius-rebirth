// iOS Safari refuse ou échoue silencieusement sur navigator.clipboard.writeText
// dans certains contextes (notamment en PWA standalone, ou sur de longs
// textes) — on retombe alors sur l'ancienne méthode document.execCommand,
// qui marche de façon beaucoup plus fiable partout.
function fallbackCopy(text: string): boolean {
  const textarea = document.createElement("textarea");
  textarea.value = text;
  // Hors écran mais PAS opacity:0 — certains navigateurs refusent de
  // sélectionner/copier un élément invisible via opacity, ce qui fait
  // échouer execCommand("copy") silencieusement (ou copier la sélection
  // précédente de la page, pas le texte voulu).
  textarea.style.position = "fixed";
  textarea.style.top = "0";
  textarea.style.left = "-9999px";
  textarea.readOnly = true;
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  textarea.setSelectionRange(0, text.length);
  let ok = false;
  try {
    ok = document.execCommand("copy");
  } catch {
    ok = false;
  }
  document.body.removeChild(textarea);
  return ok;
}

export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return fallbackCopy(text);
  }
}
