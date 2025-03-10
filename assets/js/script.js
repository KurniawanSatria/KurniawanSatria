window.addEventListener('load', async() => {
document.getElementById('preloader').style.display = "none";
})
var typed = new Typed('#typing', {
strings: ['SatzzDev'],
typeSpeed: 100,
backSpeed:100,
loop: true
});




setInterval(() => {
const now=new Date(),s=now.getSeconds(),m=now.getMinutes(),h=now.getHours();
document.getElementById("second").style=`--value:${s};`
document.getElementById("minute").style=`--value:${m};`
document.getElementById("hour").style=`--value:${h%12||12};`
document.getElementById("ampm").textContent=h>=12?"PM":"AM";
}, 100);


let audio = new Audio("../output.mp3");
audio.load();
let isPlaying = false;
audio.addEventListener("ended", () => isPlaying = false); 
async function playBackSounds() {
if (!isPlaying) {
audio.play();
document.documentElement.requestFullscreen()
isPlaying = true;
if ("mediaSession" in navigator) {
navigator.mediaSession.metadata = new MediaMetadata({
title: "AURA",
artist: "Ogryzek",
artwork: [
{
src: "https://i1.sndcdn.com/artworks-8QaW8oJBjUPJ-0-t500x500.jpg",
type: "image/jpeg",
sizes: "500x500", 
}
],
});
navigator.mediaSession.setActionHandler('play', () => audio.play());
navigator.mediaSession.setActionHandler('pause', () => audio.pause());
navigator.mediaSession.setActionHandler('stop', () => audio.pause());
}
} else {
//audio.pause();
//isPlaying = false;
}
}


