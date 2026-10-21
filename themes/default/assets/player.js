// Chapter buttons seek the episode player. Works without this script too:
// the player and the chapter list are plain HTML.
document.addEventListener("click", (event) => {
  const button = event.target.closest("[data-seek]");
  if (!button) return;
  const player = document.querySelector("[data-showsite-player]");
  if (!player) return;
  player.currentTime = Number(button.dataset.seek) || 0;
  player.play().catch(() => {});
});
