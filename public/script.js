const backgroundImageUrl = "https://m.media-amazon.com/images/I/81qPeYw8TSL.jpg"; // URL or local file

if(backgroundImageUrl) {
    const background = document.createElement("img");
    background.classList.add("background");
    background.alt = "Background image";
    background.src = backgroundImageUrl;

    background.onload = function() {
        background.style.animation = "fadeIn 0.3s ease-in forwards";
    }

    document.getElementsByTagName("body")[0].appendChild(background);
}