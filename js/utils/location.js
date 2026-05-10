export function normalizeLocation(location = {}) {
  const area =
    typeof location.area === "string" && location.area.trim()
      ? location.area
      : location.extension || "";

  return {
    province: typeof location.province === "string" ? location.province : "",
    municipality: typeof location.municipality === "string" ? location.municipality : "",
    township: typeof location.township === "string" ? location.township : "",
    extension: typeof location.extension === "string" ? location.extension : area,
    area,
    streetName: typeof location.streetName === "string" ? location.streetName : ""
  };
}

export function formatLocation(location = {}, { includeProvince = false } = {}) {
  const normalized = normalizeLocation(location);
  const parts = [
    normalized.township,
    normalized.area || normalized.extension,
    normalized.municipality,
    includeProvince ? normalized.province : ""
  ].filter((part) => typeof part === "string" && part.trim());

  return parts.join(", ");
}
