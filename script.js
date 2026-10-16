
const audio = document.querySelector("#audio");
const fileInput = document.querySelector("#fileInput");
const songList = document.querySelector("#songList");
const search = document.querySelector("#search");
const progress = document.querySelector("#progress");

let songs = [];
let currentIndex = -1;
let view = "all";
let playlists = {};
let selectedPlaylist = null;

const $ = selector => document.querySelector(selector);

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);

  return `${minutes}:${String(secs).padStart(2, "0")}`;
}

fileInput.addEventListener("change", event => {
  const files = [...event.target.files];

  for (const file of files) {
    if (!file.type.startsWith("audio/")) continue;

    songs.push({
      id: crypto.randomUUID(),
      title: file.name.replace(/\.[^.]+$/, ""),
      artist: "Local audio",
      url: URL.createObjectURL(file),
      favourite: false,
      file
    });
  }

  renderSongs();
  fileInput.value = "";
});

function renderSongs() {
  const query = search.value.toLowerCase().trim();

  let visible = songs.filter(song =>
    song.title.toLowerCase().includes(query) ||
    song.artist.toLowerCase().includes(query)
  );

  if (view === "favourites") {
    visible = visible.filter(song => song.favourite);
  }

  if (view === "playlists") {
    visible = selectedPlaylist
      ? visible.filter(song =>
          playlists[selectedPlaylist]?.includes(song.id)
        )
      : [];
  }

  $("#sectionTitle").textContent = {
    all: "Your library",
    favourites: "Your favourites",
    playlists: selectedPlaylist || "Your playlists"
  }[view];

  $("#songCount").textContent = `${visible.length} songs`;
  $("#playlistTools").hidden = view !== "playlists";

  songList.replaceChildren();

  if (!visible.length) {
    const message = document.createElement("p");
    message.className = "empty";
    message.textContent = songs.length
      ? "No songs to show here."
      : "Add music from your device to get started.";

    songList.append(message);
    return;
  }

  visible.forEach(song => {
    const index = songs.indexOf(song);
    const row = document.createElement("div");
    row.className = "song";

    const cover = document.createElement("div");
    cover.className = "song-cover";
    cover.textContent = "♫";

    const details = document.createElement("div");
    details.className = "song-details";

    const title = document.createElement("strong");
    title.textContent = song.title;

    const artist = document.createElement("small");
    artist.textContent = song.artist;

    details.append(title, artist);

    const playButton = document.createElement("button");
    playButton.textContent =
      index === currentIndex && !audio.paused ? "Ⅱ" : "▶";
    playButton.setAttribute("aria-label", `Play ${song.title}`);
    playButton.addEventListener("click", () => playSong(index));

    const favButton = document.createElement("button");
    favButton.textContent = song.favourite ? "♥" : "♡";
    favButton.className = song.favourite ? "favourited" : "";
    favButton.setAttribute("aria-label", "Toggle favourite");

    favButton.addEventListener("click", () => {
      song.favourite = !song.favourite;
      updateFavouriteButton();
      renderSongs();
    });

    row.append(cover, details, playButton, favButton);
    songList.append(row);
  });
}

function playSong(index) {
  if (index < 0 || index >= songs.length) return;

  currentIndex = index;
  const song = songs[index];

  audio.src = song.url;
  $("#trackTitle").textContent = song.title;
  $("#trackArtist").textContent = song.artist;

  audio.play()
    .then(() => {
      $("#play").textContent = "Ⅱ";
      $("#play").setAttribute("aria-label", "Pause");
      renderSongs();
    })
    .catch(error => {
      console.error("Playback failed:", error);
      $("#trackArtist").textContent =
        "Tap play again to start the song";
    });

  updateFavouriteButton();
}

function updateFavouriteButton() {
  const song = songs[currentIndex];

  $("#favCurrent").textContent =
    song?.favourite ? "♥" : "♡";

  $("#favCurrent").classList.toggle(
    "favourited",
    Boolean(song?.favourite)
  );
}

$("#play").addEventListener("click", () => {
  if (currentIndex === -1) {
    if (songs.length) playSong(0);
    return;
  }

  if (audio.paused) {
    audio.play().then(() => {
      $("#play").textContent = "Ⅱ";
    }).catch(console.error);
  } else {
    audio.pause();
  }
});

audio.addEventListener("play", () => {
  $("#play").textContent = "Ⅱ";
  renderSongs();
});

audio.addEventListener("pause", () => {
  $("#play").textContent = "▶";
  renderSongs();
});

$("#next").addEventListener("click", () => {
  if (songs.length) {
    playSong((currentIndex + 1) % songs.length);
  }
});

$("#previous").addEventListener("click", () => {
  if (audio.currentTime > 3) {
    audio.currentTime = 0;
  } else if (songs.length) {
    playSong((currentIndex - 1 + songs.length) % songs.length);
  }
});

audio.addEventListener("ended", () => {
  if (songs.length) {
    playSong((currentIndex + 1) % songs.length);
  }
});

audio.addEventListener("timeupdate", () => {
  progress.value = audio.duration
    ? (audio.currentTime / audio.duration) * 100
    : 0;

  $("#currentTime").textContent = formatTime(audio.currentTime);
  $("#duration").textContent = formatTime(audio.duration);
});

progress.addEventListener("input", () => {
  if (Number.isFinite(audio.duration)) {
    audio.currentTime = (Number(progress.value) / 100) * audio.duration;
  }
});

search.addEventListener("input", renderSongs);

document.querySelectorAll(".tab").forEach(button => {
  button.addEventListener("click", () => {
    view = button.dataset.view;

    if (view !== "playlists") selectedPlaylist = null;

    document.querySelectorAll(".tab").forEach(tab =>
      tab.classList.toggle("active", tab === button)
    );

    renderSongs();
    renderPlaylists();
  });
});

$("#favCurrent").addEventListener("click", () => {
  if (currentIndex < 0) return;

  songs[currentIndex].favourite =
    !songs[currentIndex].favourite;

  updateFavouriteButton();
  renderSongs();
});

$("#createPlaylist").addEventListener("click", () => {
  const name = prompt("Enter a playlist name:");
  if (!name?.trim()) return;

  if (playlists[name.trim()]) {
    alert("That playlist already exists.");
    return;
  }

  playlists[name.trim()] = [];
  selectedPlaylist = name.trim();

  renderPlaylists();
  renderSongs();
});

function renderPlaylists() {
  const container = $("#playlistList");
  container.replaceChildren();

  Object.keys(playlists).forEach(name => {
    const item = document.createElement("div");
    item.className = "playlist-item";

    const open = document.createElement("button");
    open.textContent = `${name} (${playlists[name].length})`;

    open.addEventListener("click", () => {
      selectedPlaylist = name;
      renderSongs();
    });

    const add = document.createElement("button");
    add.textContent = "+ Add current song";

    add.addEventListener("click", () => {
      if (currentIndex < 0) {
        alert("Play a song first.");
        return;
      }

      const id = songs[currentIndex].id;

      if (!playlists[name].includes(id)) {
        playlists[name].push(id);
      }

      renderPlaylists();
      renderSongs();
    });

    const remove = document.createElement("button");
    remove.textContent = "Delete";

    remove.addEventListener("click", () => {
      delete playlists[name];

      if (selectedPlaylist === name) {
        selectedPlaylist = null;
      }

      renderPlaylists();
      renderSongs();
    });

    item.append(open, add, remove);
    container.append(item);
  });
}

renderSongs();
renderPlaylists();



if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./sw.js")
      .then(() => {
        console.log("Som Music is ready for offline caching.");
      })
      .catch((error) => {
        console.error("Service worker registration failed:", error);
      });
  });
}
