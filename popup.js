document.addEventListener("DOMContentLoaded", async () => {
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
    const groupAVolume = (100 - crossfader.value) / 100;
    const groupBVolume = crossfader.value / 100;

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
});
