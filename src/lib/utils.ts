export const createSlug = (text: string) => {
  return text
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, '') // Ta bort specialtecken
    .replace(/[\s_-]+/g, '-') // Mellanslag/understreck blir bindestreck
    .replace(/^-+|-+$/g, '') // Ta bort bindestreck i början/slutet
}
