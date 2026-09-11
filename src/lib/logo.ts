/** True si l'URL de logo peut être affichée (data-URL ou https). */
export function isUsableLogoUrl(url: string | null | undefined): url is string {
  return (
    !!url &&
    (url.startsWith("data:") ||
      url.startsWith("http://") ||
      url.startsWith("https://"))
  );
}
