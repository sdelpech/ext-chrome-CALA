document.addEventListener("DOMContentLoaded", async () => {
  // Gestion du bouton de vue fractionnée
  const splitViewBtn = document.getElementById("split-view-btn");
  if (splitViewBtn) {
    splitViewBtn.addEventListener("click", async () => {
      try {
        // Obtenir la résolution native de l'écran
        const displays = await chrome.system.display.getInfo();
        
        if (displays.length === 0) {
          console.error("Aucun écran détecté");
          return;
        }
        
        // Utiliser le premier écran (écran principal)
        const primaryDisplay = displays[0];
        const screenWidth = primaryDisplay.workArea.width;
        const screenHeight = primaryDisplay.workArea.height;
        const screenLeft = primaryDisplay.workArea.left;
        const screenTop = primaryDisplay.workArea.top;
        
        // Calculer 50% de la largeur
        const halfWidth = Math.floor(screenWidth / 2);
        
        console.log(`Résolution détectée: ${screenWidth}x${screenHeight}`);
        console.log(`Chaque fenêtre: ${halfWidth}x${screenHeight}`);
        
        // Créer la première fenêtre YouTube à gauche
        chrome.windows.create({
          url: 'https://www.youtube.com',
          type: 'normal',
          width: halfWidth,
          height: screenHeight,
          left: screenLeft,
          top: screenTop,
          state: 'normal'
        });

        // Créer la deuxième fenêtre YouTube à droite avec un délai
        setTimeout(() => {
          chrome.windows.create({
            url: 'https://www.youtube.com',
            type: 'normal',
            width: halfWidth,
            height: screenHeight,
            left: screenLeft + halfWidth,
            top: screenTop,
            state: 'normal'
          });
        }, 500);

      } catch (error) {
        console.error("Erreur lors de la création de la vue fractionnée:", error);
      }
    });
  }

  const containerA = document.getElementById("group-a-label");
  const containerB = document.getElementById("group-b-label");

  if (!containerA || !containerB) {
    console.error("Les conteneurs des groupes sont introuvables.");
    return;
  }

  const container = document.getElementById("faders-container");

  if (!container) {
    console.error("L'élément avec l'ID 'faders-container' est introuvable.");
    return;
  }

  // Récupérer les onglets avec de l'audio
  const tabs = await chrome.tabs.query({ audible: true });

  if (tabs.length === 0) {
    container.textContent = "Aucun onglet avec de l'audio trouvé.";
    return;
  }

  // Diviser les onglets en deux groupes
  const midIndex = Math.ceil(tabs.length / 2);
  const groupA = tabs.slice(0, midIndex);
  const groupB = tabs.slice(midIndex);

  // Obtenir les titres des premiers onglets de chaque groupe
  const groupATitle = groupA.length > 0 ? groupA[0].title : "Groupe A";
  const groupBTitle = groupB.length > 0 ? groupB[0].title : "Groupe B";

  // Mettre à jour les labels des groupes
  containerA.textContent = groupATitle;
  containerB.textContent = groupBTitle;

  // Créer un crossfader pour équilibrer le volume entre les deux groupes
  const crossfader = document.createElement("input");
  crossfader.type = "range";
  crossfader.min = 0;
  crossfader.max = 100;
  crossfader.value = 50; // Position centrale par défaut
  crossfader.className = "volume-fader";

  const crossfaderLabel = document.createElement("label");
  crossfaderLabel.textContent = '';
  crossfaderLabel.appendChild(crossfader);

  container.appendChild(crossfaderLabel);

  crossfader.addEventListener("input", () => {
    // Calculer les volumes avec un minimum de 1% pour maintenir la détection audio
    const fadeValue = crossfader.value / 100;
    const groupAVolume = Math.max(0.01, 1 - fadeValue); // Minimum 1%
    const groupBVolume = Math.max(0.01, fadeValue);     // Minimum 1%

    groupA.forEach(tab => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (volume) => {
          const mediaElements = document.querySelectorAll("video, audio");
          mediaElements.forEach(media => {
            media.volume = volume;
          });
        },
        args: [groupAVolume]
      });
    });

    groupB.forEach(tab => {
      chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: (volume) => {
          const mediaElements = document.querySelectorAll("video, audio");
          mediaElements.forEach(media => {
            media.volume = volume;
          });
        },
        args: [groupBVolume]
      });
    });
  });

  const generalVolumeFader = document.getElementById("general-volume-fader");

  if (generalVolumeFader) {
    generalVolumeFader.addEventListener("input", async () => {
      const generalVolume = generalVolumeFader.value / 100;

      const tabs = await chrome.tabs.query({ audible: true });
      tabs.forEach(tab => {
        chrome.scripting.executeScript({
          target: { tabId: tab.id },
          func: (volume) => {
            const mediaElements = document.querySelectorAll("video, audio");
            mediaElements.forEach(media => {
              media.volume = volume;
            });
          },
          args: [generalVolume]
        });
      });
    });
  }

  // Écouter les changements d'URL des onglets
  chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.url) {
      const generalVolumeFader = document.getElementById("general-volume-fader");
      if (generalVolumeFader) {
        let newValue = parseFloat(generalVolumeFader.value) - 0.01;
        newValue = Math.max(0, newValue); // S'assurer que le volume ne descend pas en dessous de 0
        generalVolumeFader.value = newValue;

        // Appliquer le nouveau volume à tous les onglets
        const generalVolume = newValue / 100;
        chrome.tabs.query({ audible: true }).then(tabs => {
          tabs.forEach(tab => {
            chrome.scripting.executeScript({
              target: { tabId: tab.id },
              func: (volume) => {
                const mediaElements = document.querySelectorAll("video, audio");
                mediaElements.forEach(media => {
                  media.volume = volume;
                });
              },
              args: [generalVolume]
            });
          });
        });
      }
    }
  });

  // Configuration des sons
  const sounds = [
    { id: 'sound-1', file: 'sounds/sound1.mp3' },
    { id: 'sound-2', file: 'sounds/sound2.wav' },
    { id: 'sound-3', file: 'sounds/sound3.wav' },
    { id: 'sound-4', file: 'sounds/sound4.mp3' },
    { id: 'sound-5', file: 'sounds/sound5.mp3' }
  ];

  // Création des instances Audio
  const audioPlayers = sounds.map(sound => {
    const audio = new Audio(sound.file);
    const button = document.getElementById(sound.id);
    
    button.addEventListener('click', () => {
      // Arrêter le son s'il est en cours de lecture
      if (!audio.paused) {
        audio.pause();
        audio.currentTime = 0;
        button.classList.remove('btn-primary');
        button.classList.add('btn-outline-primary');
        return;
      }

      // Jouer le son
      audio.play();
      button.classList.remove('btn-outline-primary');
      button.classList.add('btn-primary');

      // Remettre le bouton dans son état initial à la fin de la lecture
      audio.onended = () => {
        button.classList.remove('btn-primary');
        button.classList.add('btn-outline-primary');
      };
    });

    return audio;
  });
});
