export function resetAppData() {
  localStorage.clear();
  window.location.reload();
}

window.resetBTownPulseApp = resetAppData;
window.resetYahnehApp = resetAppData;
