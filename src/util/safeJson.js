export const safeJson = async (response, fallback = {}) => {
  try {
    return await response.json()
  } catch {
    return fallback
  }
}
