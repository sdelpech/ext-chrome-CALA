// Récupérer les URLs depuis les paramètres de l'URL
const urlParams = new URLSearchParams(window.location.search);
const url1 = urlParams.get('url1');
const url2 = urlParams.get('url2');
const title1 = urlParams.get('title1') || 'Vidéo 1';
const title2 = urlParams.get('title2') || 'Vidéo 2';

const content = document.getElementById('content');

if (!url1 || !url2) {
  content.innerHTML = '<div class="no-videos">Aucune vidéo YouTube trouvée. Veuillez ouvrir au moins 2 onglets YouTube.</div>';
} else {
  // Convertir les URLs YouTube en format embed
  const embedUrl1 = convertToEmbedUrl(url1);
  const embedUrl2 = convertToEmbedUrl(url2);

  content.innerHTML = `
    <div class="video-container">
      <div class="video-header">${escapeHtml(title1)}</div>
      <iframe src="${embedUrl1}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    </div>
    <div class="video-container">
      <div class="video-header">${escapeHtml(title2)}</div>
      <iframe src="${embedUrl2}" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen></iframe>
    </div>
  `;
}

function convertToEmbedUrl(url) {
  try {
    const urlObj = new URL(url);
    
    // Format standard: youtube.com/watch?v=VIDEO_ID
    if (urlObj.hostname.includes('youtube.com') && urlObj.searchParams.has('v')) {
      const videoId = urlObj.searchParams.get('v');
      return `https://www.youtube.com/embed/${videoId}?autoplay=0`;
    }
    
    // Format court: youtu.be/VIDEO_ID
    if (urlObj.hostname === 'youtu.be') {
      const videoId = urlObj.pathname.slice(1);
      return `https://www.youtube.com/embed/${videoId}?autoplay=0`;
    }
    
    // Si déjà en format embed
    if (urlObj.pathname.includes('/embed/')) {
      return url;
    }
    
    return url;
  } catch (e) {
    return url;
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
