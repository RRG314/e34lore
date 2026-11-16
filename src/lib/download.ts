/** Browser downloads keep identifiers as strings in JSON and release object URLs. */
export function downloadText(
  text: string,
  name: string,
  type = "text/plain;charset=utf-8",
) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function downloadJSON(data: unknown, name: string) {
  downloadText(JSON.stringify(data, null, 2), name, "application/json");
}
