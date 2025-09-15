import { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { FaPlay, FaPause } from 'react-icons/fa';
import './Songs.css';

function Songs({ albums, setSelectedTrack, selectedTrack, isPlaying, setIsPlaying }) {
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const albumId = queryParams.get('id');
  const audioRef = useRef(null);
  const [favorites, setFavorites] = useState({
    liked: [],
    added: []
  });

  const [currentSong, setCurrentSong] = useState(null);

  const album = albums.find((album) => album.id === albumId);

  // Add fallback for isPlaying and setIsPlaying if not provided as props
  const [localIsPlaying, localSetIsPlaying] = useState(false);
  const actualIsPlaying = typeof isPlaying === 'boolean' ? isPlaying : localIsPlaying;
  const actualSetIsPlaying = typeof setIsPlaying === 'function' ? setIsPlaying : localSetIsPlaying;

  useEffect(() => {
    // Load favorites from localStorage
    const username = localStorage.getItem('username');
    if (username) {
      const storedFavorites = localStorage.getItem(`favorites_${username}`);
      if (storedFavorites) {
        setFavorites(JSON.parse(storedFavorites));
      }
    }

    // Listen for favorites updates
    const handleFavoritesUpdate = (event) => {
      setFavorites(event.detail.favorites);
    };

    window.addEventListener('favoritesUpdated', handleFavoritesUpdate);

    return () => {
      window.removeEventListener('favoritesUpdated', handleFavoritesUpdate);
    };
  }, []);

  if (!album) {
    return <h2 className="not-found">Album not found</h2>;
  }

  useEffect(() => {
    console.log('Songs component rendered');
  });

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.addEventListener('ended', () => {
        actualSetIsPlaying(false);
      });
    }
    return () => {
      if (audioRef.current) {
        audioRef.current.removeEventListener('ended', () => {
          actualSetIsPlaying(false);
        });
      }
    };
  }, []);

  // Listen for global song state changes
  useEffect(() => {
    const handleSongStateChange = (event) => {
      const { song, isPlaying: newIsPlaying } = event.detail;
      if (song) {
        setCurrentSong(song);
        actualSetIsPlaying(newIsPlaying);
      }
    };

    window.addEventListener('songStateChanged', handleSongStateChange);

    return () => {
      window.removeEventListener('songStateChanged', handleSongStateChange);
    };
  }, [actualSetIsPlaying]);

  // Separate effect for handling play/pause toggles
  useEffect(() => {
    const handleTogglePlayPause = (event) => {
      const { song } = event.detail;
      if (song && currentSong && currentSong.title === song.title) {
        actualSetIsPlaying(prev => !prev);
      }
    };

    window.addEventListener('togglePlayPause', handleTogglePlayPause);

    return () => {
      window.removeEventListener('togglePlayPause', handleTogglePlayPause);
    };
  }, [currentSong, actualSetIsPlaying]);

  // Play/pause logic
  const handlePlay = (song) => {
    const songSrc = song.src || song.url;
    if (currentSong && currentSong.src === songSrc) {
      // Toggle play/pause for current song
      const event = new CustomEvent('togglePlayPause', {
        detail: { song: { ...song, src: songSrc } }
      });
      window.dispatchEvent(event);
      // Also dispatch songStateChanged to ensure MusicPlayer is in sync
      const stateEvent = new CustomEvent('songStateChanged', {
        detail: {
          song: { ...song, src: songSrc },
          isPlaying: !actualIsPlaying
        }
      });
      window.dispatchEvent(stateEvent);
      actualSetIsPlaying(!actualIsPlaying);
    } else {
      // Play new song
      setSelectedTrack({ ...song, src: songSrc });
      setCurrentSong({ ...song, src: songSrc });
      actualSetIsPlaying(true);
      // Dispatch songStateChanged for new song
      const stateEvent = new CustomEvent('songStateChanged', {
        detail: {
          song: { ...song, src: songSrc },
          isPlaying: true
        }
      });
      window.dispatchEvent(stateEvent);
    }
  };

  const handleDownload = async (song) => {
    try {
      const response = await fetch(song.src);
      if (!response.ok) throw new Error('Network response was not ok');
  
      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);
  
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = `${song.title}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
  
      window.URL.revokeObjectURL(blobUrl);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  const handleLike = (song) => {
    const username = localStorage.getItem('username');
    if (!username) return;

    const songData = {
      ...song,
      albumId,
      albumCover: album.img,
      artist: album.artist,
      addedAt: new Date().toISOString(),
      src: song.src || song.url
    };

    const isLiked = favorites.liked.some(s => s.title === song.title);
    let newFavorites;

    if (isLiked) {
      newFavorites = {
        ...favorites,
        liked: favorites.liked.filter(s => s.title !== song.title)
      };
    } else {
      newFavorites = {
        ...favorites,
        liked: [...favorites.liked, songData]
      };
    }

    setFavorites(newFavorites);
    localStorage.setItem(`favorites_${username}`, JSON.stringify(newFavorites));

    // Dispatch event to notify other components
    const event = new CustomEvent('favoritesUpdated', {
      detail: { favorites: newFavorites }
    });
    window.dispatchEvent(event);
  };

  const handleAddToLibrary = (song) => {
    const username = localStorage.getItem('username');
    if (!username) return;

    const songData = {
      ...song,
      albumId,
      albumCover: album.img,
      artist: album.artist,
      addedAt: new Date().toISOString(),
      src: song.src || song.url
    };

    const isAdded = favorites.added.some(s => s.title === song.title);
    let newFavorites;

    if (isAdded) {
      newFavorites = {
        ...favorites,
        added: favorites.added.filter(s => s.title !== song.title)
      };
    } else {
      newFavorites = {
        ...favorites,
        added: [...favorites.added, songData]
      };
    }

    setFavorites(newFavorites);
    localStorage.setItem(`favorites_${username}`, JSON.stringify(newFavorites));

    // Dispatch event to notify other components
    const event = new CustomEvent('favoritesUpdated', {
      detail: { favorites: newFavorites }
    });
    window.dispatchEvent(event);
  };

  const isLiked = (song) => favorites.liked.some(s => s.title === song.title);
  const isAdded = (song) => favorites.added.some(s => s.title === song.title);

  return (
    <div className="songs-page-animated-pro">
      <div className="album-header-animated-pro">
        <div className="album-cover-container-pro">
          <img src={album.img} alt={album.title} className="album-cover-animated-pro" />
        </div>
        <div className="album-info-animated-pro">
          <h1 className="album-title-animated-pro">{album.title}</h1>
          <p className="album-artist-animated-pro">{album.artist}</p>
        </div>
      </div>
      <ul className="song-list-animated-pro">
        {album.songs.map((song, index) => (
          <li
            className="song-item-animated-pro"
            key={index}
            onClick={() => handlePlay(song)}
          >
            <span className="song-number-animated-pro">{index + 1}.</span>
            <p className="song-title-animated-pro">{song.title}</p>
            <div className="song-actions-pro">
            <motion.button 
              className={`play-pause-btn ${currentSong && currentSong.src === (song.src || song.url) && actualIsPlaying ? 'playing' : ''}`}
              onClick={() => handlePlay(song)}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {currentSong && currentSong.src === (song.src || song.url) && actualIsPlaying ? <FaPause /> : <FaPlay />}
            </motion.button>
              <button
                className={`like-btn-animated-pro ${isLiked(song) ? 'liked' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleLike(song);
                }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
                </svg>
              </button>
              <button
                className={`add-btn-animated-pro ${isAdded(song) ? 'added' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleAddToLibrary(song);
                }}
              >
                <svg viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z" />
                </svg>
              </button>
              <button
                className="download-btn-animated-pro"
                onClick={(e) => {
                  e.stopPropagation();
                  handleDownload(song);
                }}
              >
                <svg className="download-icon-animated-pro" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z" />
                </svg>
                <div className="download-effect-animated-pro"></div>
              </button>
            </div>
          </li>
        ))}
      </ul>
      <audio ref={audioRef} />
    </div>
  );
}

export default Songs;