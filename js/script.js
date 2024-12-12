const API_BASE_URL = "http://informatica.iesalbarregas.com:7008";
const songTableBody = document.querySelector('#list table tbody');
let songs = [];

//////////////////////////////// FILTERS SECTION /////////////////////////////////////////////
const filterHeader = document.querySelector('.filter-header');
const filterContent = document.querySelector('.filter-content');
const toggleIcon = document.querySelector('.toggle-icon');

filterHeader.addEventListener('click', () => {
  filterContent.style.display = filterContent.style.display === 'none' ? 'flex' : 'none';
  toggleIcon.textContent = filterContent.style.display === 'none' ? '▲' : '▼';
});

//////////////////////////////// ADD SONG /////////////////////////////////////////////

const addSongButton = document.querySelector("#add-btn");
const closeWindow = document.querySelector("#addSong-close");
const addSongWindow = document.querySelector("#addSong");
const contentElement = document.querySelector("#content");
const musicPlayerElement = document.querySelector("footer");

const uploadForm = addSongWindow.querySelector('form');
const songFileInput = document.getElementById('song-file');
const titleInput = document.getElementById('title');
const authorInput = document.getElementById('author');
const coverImageInput = document.getElementById('cover-image');
let isModalDisplayed = false;

// Validations
function validateTitle(title) {
  const titleRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
  return titleRegex.test(title) && title.length <= 20;
}

function validateAuthor(author) {
  const authorRegex = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/;
  return authorRegex.test(author) && author.length <= 20;
}

// Show and hide: form window
addSongButton.addEventListener('click', function () {
  addSongWindow.style.display = "block";
  contentElement.style.filter = "brightness(0.6)"
  musicPlayerElement.style.filter = "brightness(0.6)"
  isModalDisplayed = true;
});

closeWindow.addEventListener('click', closeModal);
document.addEventListener('click', function(event) {

  if (!addSongWindow.contains(event.target) && isModalDisplayed && !addSongButton.contains(event.target)) {
      closeModal();
  }
});

function closeModal() {
  addSongWindow.style.display = "none";
  contentElement.style.filter = "brightness(1)"
  musicPlayerElement.style.filter = "brightness(1)"
}

uploadForm.addEventListener('submit', async (event) => {
  event.preventDefault();


  clearErrors();

// Validations
let isValid = true;

// title
if (!validateTitle(titleInput.value)) {
  showError(titleInput, 'Invalid title. Only letters and spaces, maximum 20 characters.');
  isValid = false;
}

// author
if (!validateAuthor(authorInput.value)) {
  showError(authorInput, 'Invalid author. Only letters and spaces, maximum 20 characters.');
  isValid = false;
}

// song
if (!songFileInput.files.length || songFileInput.files[0].type !== 'audio/mpeg') {
  showError(songFileInput, 'Please select an MP3 file.');
  isValid = false;
}

// canvas
if (!coverImageInput.files.length ||
  !['image/png', 'image/jpeg', 'image/jpg'].includes(coverImageInput.files[0].type)) {
  showError(coverImageInput, 'Please select a PNG or JPG image.');
  isValid = false;
}

  if (!isValid) return;

  const formData = new FormData();
  formData.append('music', songFileInput.files[0]);
  formData.append('title', titleInput.value);
  formData.append('artist', authorInput.value);
  formData.append('cover', coverImageInput.files[0]);

  try {
    const response = await fetch(`${API_BASE_URL}/upload`, {
      method: 'POST',
      body: formData
    });

    if (response.ok) {
      const newSong = await response.json();

      await fetchSongs();

      uploadForm.reset();

      alert('Song uploaded');
      closeModal();
    } else {
      alert('Error, try again');
    }
  } catch (error) {
    console.error('Upload error:', error);
    alert('Connection error, please try again.');
  }
});

function showError(inputElement, message) {

  let errorElement = inputElement.nextElementSibling;
  if (!errorElement || !errorElement.classList.contains('error-message')) {
    errorElement = document.createElement('div');
    errorElement.classList.add('error-message');
    inputElement.parentNode.insertBefore(errorElement, inputElement.nextSibling);
  }

  errorElement.textContent = message;
  errorElement.style.color = 'red';
  errorElement.style.fontSize = '0.8em';
  inputElement.style.borderColor = 'red';
}


function clearErrors() {

  const errorMessages = document.querySelectorAll('.error-message');
  errorMessages.forEach(el => el.remove());

  [titleInput, authorInput, songFileInput, coverImageInput].forEach(input => {
    input.style.borderColor = '';
  });
}


//////////////////////////////// FETCH SONGS /////////////////////////////////////////////

async function fetchSongs() {
  try {
    const response = await fetch(`${API_BASE_URL}/songs`);
    songs = await response.json();
    renderSongList();
  } catch (error) {
    console.error('Load songs error:', error);
  }
}

async function renderSongList(canciones = songs) {
  songTableBody.innerHTML = '';
  for (const song of canciones) {
    const row = document.createElement('tr');

    const duration = await getAudioDuration(song.filepath);

    row.innerHTML = `
      <td>
        <button class="play-pause-btn" data-id="${song.id}">
          <img src="./images/play.png" alt="Play/Pause">
        </button>
      </td>
      <td>${song.title}</td>
      <td>${song.artist}</td>
      <td>${duration || 'N/A'}</td>
      <td>
        <button class="favorite-btn" data-id="${song.id}"><img src="${favorites.some(f => f.id === song.id) ? './images/heart-filled.png' : './images/heart.png'}" alt="add to favorites"></button>
      </td>
    `;
    songTableBody.appendChild(row);
  }
}


function getAudioDuration(audioFile) {
  return new Promise((resolve) => {
    const audio = new Audio(audioFile);
    audio.onloadedmetadata = () => {
      const minutes = Math.floor(audio.duration / 60);
      const seconds = Math.floor(audio.duration % 60);
      resolve(`${minutes}:${seconds.toString().padStart(2, '0')}`);
    };
  });
}

fetchSongs();


////////////////////////////////////////////// PLAY SONGS //////////////////////////////////////////////

// Global variables for music playback
let currentAudioPlayer = null;
let currentSongIndex = 0;
let isPlaying = false;
let isLoopMode = false;
let isShuffleMode = false;

// Get necessary DOM elements
const playButton = document.querySelector('#play');
const musicOptionsPlayButton = document.querySelector('#music-options button:nth-child(3)');
const progressBar = document.querySelector('.progress');
const currentTimeDisplay = document.querySelector('.current-time');
const totalTimeDisplay = document.querySelector('.total-time');
const volumeRange = document.getElementById('volumen-range');
const volumeIcon = document.getElementById('volume-icon');



const loopButton = document.querySelector('#music-options button:first-child');
const prevButton = document.querySelector('#music-options button:nth-child(2)');
const nextButton = document.querySelector('#music-options button:nth-child(4)');
const shuffleButton = document.querySelector('#music-options button:last-child');


// Function to play a song by its filepath
function playSong(songFilePath) {
  // If there's an existing audio player, pause and remove it
  if (currentAudioPlayer) {
    currentAudioPlayer.pause();
  }

  // Create a new Audio object
  currentAudioPlayer = new Audio(songFilePath);

  currentAudioPlayer.volume = volumeRange.value / 100;

  // Set up event listeners for the audio
  currentAudioPlayer.addEventListener('timeupdate', updateProgressBar);
  currentAudioPlayer.addEventListener('loadedmetadata', updateTotalTime);
  currentAudioPlayer.addEventListener('ended', handleSongEnd);

  // Play the song
  currentAudioPlayer.play();
  isPlaying = true;

  // Update play/pause buttons
  musicOptionsPlayButton.innerHTML = '<img src="./images/pause.png" alt="Pause">';
  playButton.innerHTML = "<p>PAUSE</p>";

}

function handleSongEnd() {
  let songsToPlay = currentFilter === 'Favoritos' ? favorites : songs;
  if (isLoopMode) {
    currentAudioPlayer.currentTime = 0;
    currentAudioPlayer.play();
  } else if (isShuffleMode) {
    playRandomSong(songsToPlay);
  } else {
    playNextSong(songsToPlay);
  }
}

// Function to update progress bar
function updateProgressBar() {
  if (currentAudioPlayer) {
    const progressPercent = (currentAudioPlayer.currentTime / currentAudioPlayer.duration) * 100;
    progressBar.style.width = `${progressPercent}%`;

    // Update current time display
    const minutes = Math.floor(currentAudioPlayer.currentTime / 60);
    const seconds = Math.floor(currentAudioPlayer.currentTime % 60);
    currentTimeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Function to update total time display
function updateTotalTime() {
  if (currentAudioPlayer) {
    const minutes = Math.floor(currentAudioPlayer.duration / 60);
    const seconds = Math.floor(currentAudioPlayer.duration % 60);
    totalTimeDisplay.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }
}

// Function to play the next song in the list
function playNextSong(songsToPlay = currentFilter === 'Favoritos' ? favorites : songs) {
  currentSongIndex++;
  if (currentSongIndex >= songsToPlay.length) {
    currentSongIndex = 0;
  }
  const nextSong = songsToPlay[currentSongIndex];
  playSong(nextSong.filepath);
  updateSongDescription(nextSong);
}

function playPreviousSong(songsToPlay = currentFilter === 'Favoritos' ? favorites : songs) {
  currentSongIndex--;
  if (currentSongIndex < 0) {
    currentSongIndex = songsToPlay.length - 1;
  }
  const prevSong = songsToPlay[currentSongIndex];
  playSong(prevSong.filepath);
  updateSongDescription(prevSong);
}

function toggleLoopMode() {
  if (isLoopMode) {
    loopButton.innerHTML = `<img src="./images/loop.png" alt="loop" style="filter: invert(0.9);">`
    isLoopMode = false;
  } else {
    loopButton.innerHTML = `<img src="./images/loop.png" alt="loop" style="filter: invert(0);">`
    isLoopMode = true;
    isShuffleMode = false;
    shuffleButton.innerHTML = `<img src="./images/shuffle.png" alt="shuffle" style="filter: invert(0.9);">`
  }
}

// Function to toggle shuffle mode
function toggleShuffleMode() {
  if (isShuffleMode) {
    shuffleButton.innerHTML = `<img src="./images/shuffle.png" alt="shuffle" style="filter: invert(0.9);">`
    isShuffleMode = false;
  } else {
    shuffleButton.innerHTML = `<img src="./images/shuffle.png" alt="shuffle" style="filter: invert(0);">`
    isShuffleMode = true;
    isLoopMode = false;
    loopButton.innerHTML = `<img src="./images/loop.png" alt="loop" style="filter: invert(0.9);">`
  }
}

function playRandomSong(songsToPlay = currentFilter === 'Favoritos' ? favorites : songs) {
  currentSongIndex = Math.floor(Math.random() * songsToPlay.length);
  const randomSong = songsToPlay[currentSongIndex];
  playSong(randomSong.filepath);
  updateSongDescription(randomSong);
}

// Function to update song description
function updateSongDescription(song) {
  const songDescriptionElement = document.querySelector('#song-description');
  const canvasElement = document.createElement("img");

  songDescriptionElement.innerHTML = `
        <p>${song.title}</p>
        <p>${song.artist}</p>
    `;

  document.querySelector("#canvas").innerHTML = '';
  document.querySelector("#canvas").appendChild(canvasElement);
  canvasElement.src = `${song.cover}`;
}


playButton.addEventListener('click', playPause);
musicOptionsPlayButton.addEventListener('click', playPause);

function playPause() {
  if (currentAudioPlayer == null) {
    let songsToPlay = currentFilter === 'Favoritos' ? favorites : songs;
    currentSongIndex = 0;
    const firstSong = songsToPlay[currentSongIndex];
    if (firstSong) {
      playSong(firstSong.filepath);
      updateSongDescription(firstSong);
    }
    return;
  };

  if (isPlaying) {
    currentAudioPlayer.pause();
    isPlaying = false;
    playButton.innerHTML = "<p>PLAY</p>";
    musicOptionsPlayButton.innerHTML = '<img src="./images/play.png" alt="Play">';
  } else {
    currentAudioPlayer.play();
    isPlaying = true;
    playButton.innerHTML = "<p>PAUSE</p>";
    musicOptionsPlayButton.innerHTML = '<img src="./images/pause.png" alt="Pause">';
  }
};

// Volume control
volumeRange.addEventListener('input', (e) => {
  if (currentAudioPlayer) {
    currentAudioPlayer.volume = e.target.value / 100;
  }

  let volumeValue = parseInt(e.target.value);

  if (volumeValue <= 33) {
    volumeIcon.src = './images/volume-low.png';
  } else if (volumeValue <= 66) {
    volumeIcon.src = './images/volume-medium.png';
  } else {
    volumeIcon.src = './images/volume-high.png';
  }
});

// Loop button event listener
loopButton.addEventListener('click', toggleLoopMode);

// Previous button event listener
prevButton.addEventListener('click', () => {
  if (songs.length === 0) return;
  playPreviousSong();
});

// Next button event listener
nextButton.addEventListener('click', () => {
  if (songs.length === 0) return;
  playNextSong();
});

// Shuffle button event listener
shuffleButton.addEventListener('click', toggleShuffleMode);


document.querySelector('.music-table tbody').addEventListener('click', function(event) {
  if (event.target.closest('.favorite-btn')) {
    return;
  }

  let songsToPlay = currentFilter === 'Favoritos' ? favorites : songs;
  const row = event.target.closest('tr');

  if (row) {
    const songIndex = Array.from(row.parentElement.children).indexOf(row);
    currentSongIndex = songIndex;
    const selectedSong = songsToPlay[songIndex];

    if (selectedSong) {
      playSong(selectedSong.filepath);
      updateSongDescription(selectedSong);
    }
  }
});


// Initialize volume range
volumeRange.value = 20; // Default to 20%

//////////////////////////////////////////////////////// TIME BAR //////////////////////////////////////////////////////

const timeBar = document.querySelector('.time-bar');

timeBar.addEventListener('click', (e) => {
  if (!currentAudioPlayer) return; // If there is no songs, do nothing

  const rect = timeBar.getBoundingClientRect(); // Obtains dimensions and positions of the bar
  const clickX = e.clientX - rect.left;
  const barWidth = rect.width; // Bar width
  const clickPercentage = clickX / barWidth;

  // Ajustar el tiempo de la canción al porcentaje clickeado
  const newTime = clickPercentage * currentAudioPlayer.duration;
  currentAudioPlayer.currentTime = newTime;

  // Update bar progress
  progressBar.style.width = `${clickPercentage * 100}%`;
});


//////////////////////////////////////////////////////// FAVORITES FUNCIONALITY /////////////////////////////////////////

let favorites = [];
const filterItems = document.querySelectorAll('.filter-item');

// Function to add or remove a song from favorites
function toggleFavorito(songId) {
  const songIndex = songs.findIndex(song => song.id == songId);
  console.log(songIndex)
  if (songIndex !== -1) {
    const song = songs[songIndex];
    const favIndex = favorites.findIndex(fav => fav.id == songId);
    if (favIndex === -1) {
      favorites.push(song);
      // Update heart image (favorite)
      document.querySelector(`.favorite-btn[data-id="${songId}"]`).innerHTML = '<img src="./images/heart-filled.png" alt="Remove from favorites">';
    } else {
      favorites.splice(favIndex, 1);
      // Update heart image (non-favorite)
      document.querySelector(`.favorite-btn[data-id="${songId}"]`).innerHTML = '<img src="./images/heart.png" alt="Add to favorites">';
    }
    localStorage.setItem('favoritos', JSON.stringify(favorites));
  }
}

// Load favorites from localStorage
function loadFavorites() {
  const storedFavorites = localStorage.getItem('favoritos');
  if (storedFavorites) {
    favorites = JSON.parse(storedFavorites);
    favorites.forEach(fav => {
      const btn = document.querySelector(`.favorite-btn[data-id="${fav.id}"]`);
      if (btn) {
        btn.innerHTML = '<img src="./images/heart-filled.png" alt="Remove from favorites">';
      }
    });
  }
}


document.addEventListener('click', function(event) {

  if (event.target.closest('.favorite-btn')) {
    const songId = event.target.closest('.favorite-btn').getAttribute('data-id');
    console.log(songId)
    toggleFavorito(songId);
  } else console.log("NOPE");
});

function filterSongs(filtro) {
  const filteredSongs = filtro === 'Favoritos' ? favorites : songs;
  renderSongList(filteredSongs);
}



let currentFilter = 'All';

filterItems.forEach(item => {
  item.addEventListener('click', function() {
    currentFilter = this.textContent;
    filterSongs(this.textContent);

    filterItems.forEach(f => f.classList.remove('active'));
    this.classList.add('active');
  });
});

loadFavorites();



//////////////////////////////////////////////////////// SEARCH BAR /////////////////////////////////////////

document.querySelector('#search-bar input').addEventListener('input', function() {
  const query = this.value.toLowerCase();
  searchFilter(query);
});

function searchFilter(query) {

  const filteredSongs = query === '' ? songs : songs.filter(song =>
    song.title.toLowerCase().includes(query)
  );


  renderSearchResults(filteredSongs);
}

async function renderSearchResults(songs) {
  songTableBody.innerHTML = '';
  for (const song of songs) {
    const row = document.createElement('tr');
    const duration = await getAudioDuration(song.filepath);

    row.innerHTML = `
      <td>
        <button class="play-pause-btn" data-id="${song.id}">
          <img src="./images/play.png" alt="Play/Pause">
        </button>
      </td>
      <td>${song.title}</td>
      <td>${song.artist}</td>
      <td>${duration || 'N/A'}</td>
      <td>
        <button class="favorite-btn" data-id="${song.id}">
          <img src="${favorites.some(f => f.id === song.id) ? './images/heart-filled.png' : './images/heart.png'}" alt="add to favourites">
        </button>
      </td>
    `;
    songTableBody.appendChild(row);
  }
}