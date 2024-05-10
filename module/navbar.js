
document.querySelector("#settings").addEventListener("click", () => {
    ipc.send("settingsChoose");
});
document.querySelector("#minimize").addEventListener("click", () => {
    ipc.send("manualMinimize");
});
document.querySelector("#close").addEventListener("click", () => {
    ipc.send("manualClose");
});